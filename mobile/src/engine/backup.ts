/**
 * Backup file: save the learner's progress and settings to ONE file they
 * keep (Files, Drive, email), and read such a file back.
 *
 * Plain English:
 * - The file is plain JSON: `{ app: 'aurivan', schema: 1, exportedAt,
 *   appVersion, stores: { settings, progress } }`. Each store is saved as
 *   `{ version, state }`, exactly as the app keeps it on the phone. No device
 *   ids, no personal data beyond what the stores already hold.
 * - A file we read back is UNTRUSTED: someone could pick any file, a broken
 *   one, or one made to cause trouble. So we never run anything from it, we
 *   cap its size and every list in it, we check every field's type with the
 *   small hand-written checker below, and we drop keys we don't know.
 * - If anything is wrong, reading stops with one clear reason and nothing
 *   on the phone changes (lib/backup.ts only writes after a clean read).
 *
 * Pure TypeScript: no React, no storage, no files. lib/backup.ts does the
 * file picking, sharing and writing to the stores.
 */
import { getCertification } from '../content/certifications';
import { MAX_ANSWER_MS } from './answerClock';
import { GAME_TIERS, HITS_CAP, type GameTier } from './games/growth';
import { keepSupported, LONG_IDS_CAP, MYTH_WINDOW, SIGNPOST_WINDOW, SURE_WINDOW, type CounterId } from './milestones';
import type { Confidence } from './srs';
import type { MockTiming } from './pace';
import {
  clampToSupported,
  cleanPlantName,
  GROWTH_IDS,
  isGrowthLevel,
  isLookId,
  isValidPlantState,
  MAX_GROWTH,
  MAX_KEEPSAKES,
  MAX_KEPT,
  maxSupportedGrowth,
  PLANT_SPECIES,
  repairPlant,
  supportEvidence,
  type CertPlant,
  type GrowthId,
  type GrowthLevel,
  type PlantSpecies,
} from './plant';
import { isLookOfSlot, type LookSlot } from './plantLooks';
import { examDateLabel } from './examDay';
import { snapMinutes, type DailyMinutes, type Familiarity } from './fit';
import { cleanDone, type ExamWeekItem } from './examWeek';
import { reminderSummary } from './reminders';
import { migrateProgress, PROGRESS_VERSION, SETTINGS_VERSION } from './saveMigrations';
import { dayKey } from './streak';
import { SESSION_SIZES, type StudyMode } from './studyModes';
import { MAX_REPORTS, parseVersion, REF_RE } from './support';

export const BACKUP_APP = 'aurivan';
/** The file format version. Bump it (and add a step to FILE_MIGRATIONS) if the envelope changes. */
export const BACKUP_SCHEMA = 1;
/** Biggest file we will read: 1 MB. A real backup is far smaller (a whole CISA bank answered is ~200 KB). */
export const MAX_BACKUP_BYTES = 1024 * 1024;
/**
 * Biggest progress store we will write, in characters of JSON. Android keeps
 * each saved store in one database row, and a row over 2 MB can't be read
 * back, so a restore must never write one near that size.
 */
export const MAX_PROGRESS_CHARS = 1_500_000;
/** How long "Undo restore" stays available after a restore. */
export const UNDO_DAYS = 7;
const DAY_MS = 24 * 3_600_000;

// ── Caps: no list or map in a backup may be longer than these ────────────
// Generous next to real use (the store itself keeps at most 50 mocks), but
// small enough that a hostile file can't make the phone churn.
const MAX_IDS = 5_000; // answers, reviews, mistakes, bookmarks (per cert)
const MAX_SMALL = 5_000; // lessons done, notes read, mastery
const MAX_LIST = 200; // mocks, recent days, readiness log
const MAX_KEY = 120; // any id or map key
const MAX_TEXT = 500; // any label

// ── Errors ───────────────────────────────────────────────────────────────
export type BackupErrorCode =
  | 'too-big'
  | 'not-json'
  | 'not-aurivan'
  | 'newer'
  | 'unknown-schema'
  | 'unknown-cert'
  | 'bad-data'
  | 'unreadable';

/** What the learner reads for each problem. Calm, plain, and always says nothing changed. */
export const BACKUP_ERROR_COPY: Record<BackupErrorCode, string> = {
  'too-big': 'This file is too big to be an Aurivan backup. Pick the file that starts with “aurivan-backup”. Nothing was changed.',
  'not-json': 'This file isn’t an Aurivan backup. Pick the file that starts with “aurivan-backup”. Nothing was changed.',
  'not-aurivan': 'This file isn’t an Aurivan backup. Pick the file that starts with “aurivan-backup”. Nothing was changed.',
  newer: 'This backup was made by a newer version of Aurivan. Update the app, then try again. Nothing was changed.',
  'unknown-schema': 'This backup’s format isn’t one Aurivan knows. Update the app, then try again. Nothing was changed.',
  'unknown-cert': 'This backup has progress for an exam this version of Aurivan doesn’t know. Update the app, then try again. Nothing was changed.',
  'bad-data': 'Part of this backup is damaged, so it can’t be restored. Try an older backup if you have one. Nothing was changed.',
  unreadable: 'Aurivan couldn’t open that file. Try again, or move the file to Files or Downloads first. Nothing was changed.',
};

export class BackupError extends Error {
  constructor(
    public code: BackupErrorCode,
    /** Where it failed, for developers (e.g. "progress.byCert.cisa.answers.d1_001.attempts"). */
    public where = '',
  ) {
    super(where ? `${code} at ${where}` : code);
  }
}

// ── A tiny type checker (no library) ─────────────────────────────────────
// Each checker takes an unknown value and returns it typed, or throws.
//
// Two modes, ONE set of rules:
// - reading a file (the default): anything out of range is refused;
// - fitting the phone's own data for export (`fitForBackup`): numbers out of
//   range are clamped into it, over-long lists and maps are cut to the cap,
//   and broken totals ("correct > total") are repaired. Wrong TYPES still
//   throw in both modes. So the app can never write a backup it would refuse
//   to restore (a long untimed mock once did: minutesUsed > 1440).
type Check<T> = (x: unknown, at: string) => T;
/** True only while fitForBackup runs (synchronously). */
let fitting = false;
const clampTo = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const bad = (at: string): never => {
  throw new BackupError('bad-data', at);
};
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

const bool: Check<boolean> = (x, at) => (typeof x === 'boolean' ? x : bad(at));
/** A finite number (JSON's 1e999 parses as Infinity, so this matters). */
const num: Check<number> = (x, at) => (typeof x === 'number' && Number.isFinite(x) ? x : bad(at));
const int = (min: number, max: number): Check<number> => (x, at) => {
  if (fitting && typeof x === 'number' && Number.isFinite(x)) return clampTo(Math.round(x), min, max);
  return typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : bad(at);
};
const count = int(0, 10_000_000);
const str = (max = MAX_TEXT): Check<string> => (x, at) => (typeof x === 'string' && x.length <= max ? x : bad(at));
/** A number in [min, max] (scores, minutes, readiness). */
const range = (min: number, max: number): Check<number> => (x, at) => {
  if (fitting && typeof x === 'number' && Number.isFinite(x)) return clampTo(x, min, max);
  return typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max ? x : bad(at);
};
/**
 * Add a rule across fields ("correct ≤ total") to a checker. `repair` fixes
 * a broken value when fitting the phone's own data for export.
 */
function rule<T>(check: Check<T>, ok: (v: T) => boolean, repair?: (v: T) => T): Check<T> {
  return (x, at) => {
    const v = check(x, at);
    if (ok(v)) return v;
    if (fitting && repair) {
      const fixed = repair(v);
      if (ok(fixed)) return fixed;
    }
    return bad(at);
  };
}
// Dates and times must fall between 2000 and 2100: a real study history
// can't be outside that, and it keeps arithmetic on them sane.
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;
/** A moment (epoch ms) between 2000 and 2100. */
const ts = range(Date.UTC(YEAR_MIN, 0, 1), Date.UTC(YEAR_MAX, 11, 31));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** A REAL calendar day "YYYY-MM-DD" (no 31 Feb), years 2000–2100. */
const date: Check<string> = (x, at) => {
  if (typeof x !== 'string' || !DATE_RE.test(x)) return bad(at);
  const [y, m, d] = x.split('-').map(Number);
  const back = new Date(Date.UTC(y, m - 1, d));
  const real = back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d;
  return real && y >= YEAR_MIN && y <= YEAR_MAX ? x : bad(at);
};
/** The daily goal choices in Settings; any other number is moved to the nearest one. */
export const DAILY_GOALS = [10, 20, 40] as const;
const dailyGoal: Check<number> = (x, at) => {
  const n = num(x, at);
  return DAILY_GOALS.reduce((best, g) => (Math.abs(g - n) < Math.abs(best - n) ? g : best), DAILY_GOALS[0] as number);
};
/** Mobile 1.15: minutes most days; any other number is moved to the nearest choice (like the daily goal). */
const dailyMinutes: Check<DailyMinutes> = (x, at) => snapMinutes(num(x, at));
/** Build E session sizes: any other number is moved to the nearest one (like the daily goal). */
const studySize: Check<number> = (x, at) => {
  const n = num(x, at);
  return SESSION_SIZES.reduce((best, g) => (Math.abs(g - n) < Math.abs(best - n) ? g : best), SESSION_SIZES[0] as number);
};
function oneOf<V extends string>(...values: V[]): Check<V> {
  return (x, at) => (values.includes(x as V) ? (x as V) : bad(at));
}
function nullable<T>(check: Check<T>): Check<T | null> {
  return (x, at) => (x === null ? null : check(x, at));
}
/**
 * A list of at most `max` items. When fitting the phone's own data for
 * export, an over-long list is cut to `max`: by default the FIRST items
 * (stores that keep newest-first), or with `keep: 'newest'` the LAST items
 * (rolling windows kept oldest-first, like game hits and "sure" answers).
 */
function list<T>(check: Check<T>, max: number, keep: 'first' | 'newest' = 'first'): Check<T[]> {
  return (x, at) => {
    if (fitting && Array.isArray(x) && x.length > max) x = keep === 'newest' ? x.slice(-max) : x.slice(0, max);
    if (!Array.isArray(x) || x.length > max) return bad(at);
    return x.map((v, i) => check(v, `${at}[${i}]`));
  };
}
/** A map with string keys. `key` can reject keys (unknown cert ids). Prototype keys are refused. */
function map<T>(check: Check<T>, max: number, key: Check<string> = str(MAX_KEY)): Check<Record<string, T>> {
  return (x, at) => {
    if (!isObj(x)) return bad(at);
    let keys = Object.keys(x);
    if (fitting && keys.length > max) keys = keys.slice(0, max);
    if (keys.length > max) return bad(at);
    const out: Record<string, T> = {};
    for (const k of keys) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') return bad(`${at}.${k}`);
      out[key(k, `${at}.${k}`)] = check(x[k], `${at}.${k}`);
    }
    return out;
  };
}

type Shape = Record<string, Check<unknown>>;
type Out<S extends Shape> = { [K in keyof S]: S[K] extends Check<infer T> ? T : never };
/**
 * An object with known keys. `req` must be present; `opt` may be missing.
 * An optional `null` is kept where the field allows null (a streak's
 * `restDay`), and otherwise read as "not set". Every other key is DROPPED:
 * unknown keys are ignored, never copied into the app.
 */
function obj<R extends Shape, O extends Shape = Record<never, Check<unknown>>>(req: R, opt?: O): Check<Out<R> & Partial<Out<O>>> {
  return (x, at) => {
    if (!isObj(x)) return bad(at);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(req)) out[k] = req[k](x[k], `${at}.${k}`);
    for (const k of Object.keys(opt ?? {})) {
      const v = x[k];
      if (v === undefined) continue;
      const check = (opt as O)[k];
      if (v === null) {
        try {
          out[k] = check(null, `${at}.${k}`);
        } catch {
          // This field can't be null: treat it as not set.
        }
        continue;
      }
      out[k] = check(v, `${at}.${k}`);
    }
    return out as Out<R> & Partial<Out<O>>;
  };
}

// ── The saved shapes, as checkers ────────────────────────────────────────
// These mirror store/settings.ts and store/progress.ts. lib/backup.ts checks
// at compile time that the two agree in both directions.
const CONFIDENCE = oneOf<Confidence>('sure', 'unsure', 'guessing');
const LETTER = oneOf('A', 'B', 'C', 'D');
const SLIP = oneOf('role', 'priority', 'tech-first', 'symptom', 'misread', 'knowledge');
const id = str(MAX_KEY);

const answerRecord = rule(
  obj(
    { attempts: count, correctCount: count, lastCorrect: bool, lastAt: ts },
    { lastAssisted: bool, lastGame: bool, ms: int(0, MAX_ANSWER_MS), lastConfidence: CONFIDENCE },
  ),
  (a) => a.correctCount <= a.attempts,
  (a) => ({ ...a, correctCount: Math.min(a.correctCount, a.attempts) }),
);
const reviewEntry = obj({ box: int(0, 100), dueAt: ts, lastSeen: ts, reps: count });
const tally = rule(obj({ total: count, correct: count }), (t) => t.correct <= t.total, (t) => ({ ...t, correct: Math.min(t.correct, t.total) }));
const mockResult = rule(
  obj(
    {
      id,
      finishedAt: ts,
      total: count,
      correct: count,
      minutesUsed: range(0, 1440),
      byDomain: map(tally, 50),
    },
    // Build D pacing (optional: older results have none).
    {
      timing: oneOf<MockTiming>('standard', 'plus25', 'plus50', 'untimed'),
      minutesAllowed: range(0, 1440),
      medianSec: range(0, MAX_ANSWER_MS / 1000),
      unanswered: count,
      // Signed share of the time off target; "ahead" can be well below −1.
      checkpoints: list(range(-1000, 1), 10),
    },
  ),
  (m) => m.correct <= m.total && (m.unanswered ?? 0) <= m.total,
  (m) => ({ ...m, correct: Math.min(m.correct, m.total), ...(m.unanswered !== undefined ? { unanswered: Math.min(m.unanswered, m.total) } : {}) }),
);
const mistakeEntry = obj({ at: ts }, { picked: LETTER, slip: SLIP, resolved: bool, confidence: CONFIDENCE, fixedLater: bool });
const percent = range(0, 100);
const readinessDay = obj({ day: date, min: nullable(percent), last: nullable(percent) });
/**
 * Mobile 1.16: the exam-week checklist's ticks. An id this app doesn't know
 * (a newer app's, or a tampered file's) is dropped, never a reason to refuse
 * the file; each id counts once.
 */
const examWeekDone: Check<ExamWeekItem[]> = (x, at) => cleanDone(list(str(40), 20)(x, at));
const examWeek = obj({ for: date, done: examWeekDone }, { hidden: bool });
const moments = obj({}, { readiness: list(readinessDay, MAX_LIST * 2), readySeenAt: ts, examWeek });
const subtopicMastery = obj({ firstDay: date }, { firstAt: ts, masteredAt: date });
/** A game score: Forecast can go below zero (a wrong "Sure" is −5). */
const gameScore = range(-1000, 100_000);

/** Build F: a game's level and its last skill-step results (engine/games/growth.ts). */
const gameGrowth = obj(
  { tier: oneOf<GameTier>(...GAME_TIERS), up: int(0, 100), down: int(0, 100) },
  { hits: list(bool, HITS_CAP, 'newest'), run: count },
);

/**
 * Build F milestones (engine/milestones.ts). Earned marks are checked again
 * after reading: a mark the restored data can't support is dropped
 * (keepSupported), and the celebration queue keeps earned marks only.
 */
const COUNTERS: Record<CounterId, Check<number>> = {
  longRecall: count,
  graduated: count,
  loopFixed: count,
  gameFixes: count,
  paceRounds: count,
};
/** One item in a rolling window (Myth Clearer, Signpost Reader). */
const windowHit = obj({ id, ok: bool });
const milestones = obj(
  { earned: map(ts, 200) },
  {
    queue: list(id, 50),
    backfill: obj({ at: ts, count }, { seen: bool }),
    counts: obj({}, COUNTERS),
    sure: list(bool, SURE_WINDOW, 'newest'),
    // Mobile 1.11: Long Memory's tiers go to 150 (it stopped at 25 before).
    longIds: list(id, LONG_IDS_CAP),
    myths: list(windowHit, MYTH_WINDOW, 'newest'),
    signposts: list(windowHit, SIGNPOST_WINDOW, 'newest'),
    gameMisses: map(date, MAX_IDS),
    cardMisses: map(date, MAX_IDS),
    days: count,
    lastDay: date,
    returnedOn: date,
    // Mobile 1.10: completed badge sets (their planters). Kept only when the
    // restored badges complete the set (engine/milestones.ts keepSupported).
    planters: map(ts, 20),
    // Mobile 1.11: the catalogue version filled in, and its one summary line.
    catalog: int(0, 100),
    catalogFill: obj({ at: ts, count }, { seen: bool }),
  },
);

/**
 * Mobile 1.13: "Your plant" (engine/plant.ts CertPlant). The shape is checked
 * field by field like everything else, then the plant's own rules
 * (isValidPlantState: nothing reached or pending above the growth,
 * keepsakes distinct). Export repairs a broken plant (repairPlant); a file
 * with one is refused. Unknown species are bad data: species ids are never
 * renamed, and a file from a newer app is already told to update first.
 */
const GROWTH: Check<GrowthLevel> = (x, at) => {
  if (fitting && typeof x === 'number' && Number.isFinite(x)) return clampTo(Math.round(x), 1, MAX_GROWTH) as GrowthLevel;
  return isGrowthLevel(x) ? x : bad(at);
};
/** Mobile 1.14: a look id must be in the catalogue (engine/plantLooks.ts), and in the right slot. */
const lookId: Check<string> = (x, at) => (isLookId(x) ? x : bad(at));
const slotLook =
  (slot: LookSlot): Check<string> =>
  (x, at) =>
    isLookOfSlot(x, slot) ? x : bad(at);
/** The learner's own text: a read refuses a name that isn't clean; export cleans it. */
const plantName: Check<string> = (x, at) => {
  if (typeof x !== 'string' || x.length > 80) return bad(at);
  const c = cleanPlantName(x);
  return c === x ? x : fitting ? c : bad(at);
};
const plantReached = obj({}, Object.fromEntries(GROWTH_IDS.map((g) => [g, ts])) as Record<GrowthId, Check<number>>);
const plantShape = rule(
  obj(
    { species: oneOf<PlantSpecies>(...PLANT_SPECIES), name: plantName, plantedAt: ts, growth: GROWTH },
    {
      replantedAt: ts,
      reached: plantReached,
      pending: GROWTH,
      backfill: obj({ at: ts, growth: GROWTH }, { seen: bool }),
      look: obj(
        {},
        {
          colourway: slotLook('colourway'),
          ground: slotLook('ground'),
          planter: slotLook('planter'),
          visitor: slotLook('visitor'),
          keepsakes: list(slotLook('keepsake'), MAX_KEEPSAKES),
        },
      ),
      kept: list(lookId, MAX_KEPT),
      passedOn: date,
    },
  ),
  (p) => isValidPlantState(p),
  (p) => repairPlant(p),
);
const plant: Check<CertPlant> = (x, at) => {
  // Export: repair first, so a look id an older build kept (never a type
  // error in the store) can't make the whole backup unrestorable.
  if (fitting && isObj(x)) {
    try {
      x = repairPlant(x as unknown as CertPlant);
    } catch {
      // Not plant-shaped at all: the shape check below reports it.
    }
  }
  return plantShape(x, at);
};
/** The plant settings (all optional switches). */
const plantSettings = obj({}, { showPlant: bool, quietLook: bool, promptHidden: bool });

const certProgress = obj(
  {},
  {
    answers: map(answerRecord, MAX_IDS),
    review: map(reviewEntry, MAX_IDS),
    bookmarks: list(id, MAX_IDS),
    mocks: list(mockResult, MAX_LIST),
    lessonsDone: list(id, MAX_SMALL),
    mistakes: map(mistakeEntry, MAX_IDS),
    gameBest: map(gameScore, 50),
    gameRecent: map(list(gameScore, 50), 50),
    notesRead: list(id, MAX_SMALL),
    moments,
    mastery: map(subtopicMastery, MAX_SMALL),
    // Build E: where In order / Guided stopped (per scope), and the Root or Rumor note cards.
    studyPath: obj({}, { inOrder: map(id, 50), guided: map(id, 50) }),
    cards: map(reviewEntry, MAX_IDS),
    // Build F: game levels and milestones.
    gameGrowth: map(gameGrowth, 50),
    milestones,
    // Mobile 1.13: the plant (optional: older files have none).
    plant,
  },
);

/**
 * Mobile 1.7: one entry in "Your reports" (engine/support.ts ReportEntry).
 * The item and reason are short codes, never free text; the ref must look
 * like one we make ("R-7K2Q"). A report about something no longer in the
 * app is KEPT (Your reports can say it was removed), so ids aren't trimmed.
 */
const reportRef: Check<string> = (x, at) => (typeof x === 'string' && REF_RE.test(x) ? x : bad(at));
// The app version the report was made on ("1.7.0"): digits and dots only.
const appVersion: Check<string> = (x, at) => (typeof x === 'string' && parseVersion(x) ? x : bad(at));
const reportEntry = obj(
  { ref: reportRef, item: id, reason: str(20), at: ts, cert: str(40) },
  { version: appVersion, creditSeen: bool },
);

const streak = obj(
  { current: count, best: count, lastDay: nullable(date) },
  { restDay: nullable(date), recentDays: list(date, MAX_LIST) },
);

// ── The two stores ───────────────────────────────────────────────────────
function settingsCheck(certKey: Check<string>) {
  return obj(
    { onboarded: bool, activeCertId: certKey },
    {
      // A cert with no exam date is simply left out of the map (JSON drops
      // undefined), so the type allows undefined like the store's does.
      examDates: map<string | undefined>(date, 50, certKey),
      theme: oneOf('system', 'dark', 'light'),
      // Mobile 1.8 (optional: older files have none).
      motion: oneOf('system', 'reduced'),
      shuffleOptions: bool,
      dailyGoal,
      reminder: obj({ enabled: bool, hour: int(0, 23), minute: int(0, 59) }, { days: list(int(0, 6), 7) }),
      haptics: bool,
      gameRulesSeen: list(str(40), 50),
      practiceTimer: bool,
      paceOffer: oneOf('accepted', 'dismissed'),
      // Build E study defaults (optional).
      studyMode: oneOf<StudyMode>('smart', 'guided', 'inOrder', 'random'),
      studyDomain: str(10),
      studySize,
      // Mobile 1.10: Settings → Show badges switched off (optional: older files have none).
      badgesHidden: bool,
      // Mobile 1.15, "Fit the plan" (all optional: older files have none).
      // An older app refuses a 1.15 file as "newer", so these never reach it
      // by backup; dailyGoal is still written beside them for an app
      // DOWNGRADE reading the saved store (code review M9b).
      familiarity: oneOf<Familiarity>('new', 'some', 'experienced'),
      dailyMinutes,
      examFocused: bool,
      fitPrompt: oneOf('answered', 'dismissed'),
      fitChanges: int(0, 9999),
      // The days the "Fit your plan" card showed (at most 3; PR #45 review M4).
      fitAskDays: list(date, 3),
    },
  );
}

/**
 * Today's frozen plans (`days`) are NOT part of a restore: the planner builds
 * today's plan again from the restored progress. So they are not read at
 * all (an unknown key, dropped), and nothing in a file can steer navigation.
 */
function progressCheck(certKey: Check<string>) {
  return obj(
    {
      byCert: map(certProgress, 50, certKey),
      streak,
      // "" before the first answer ever, otherwise a calendar day.
      today: obj({ day: (x, at) => (x === '' ? '' : date(x, at)), answered: count }),
    },
    // Mobile 1.7 (optional: older files have none). Newest first, so fitting cuts the oldest.
    // Mobile 1.13: the plant settings (optional: older files have none).
    { reports: list(reportEntry, MAX_REPORTS), plantSettings },
  );
}

export type BackupSettings = ReturnType<ReturnType<typeof settingsCheck>>;
export type BackupProgress = ReturnType<ReturnType<typeof progressCheck>>;

export interface StoreBlob<S> {
  version: number;
  state: S;
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  schema: number;
  /** ISO timestamp of when the file was made. */
  exportedAt: string;
  /** The app version that made it (Settings → About shows the same). */
  appVersion: string;
  stores: {
    settings: StoreBlob<BackupSettings>;
    progress: StoreBlob<BackupProgress>;
  };
}

/** What a clean read gives back: the two stores at the CURRENT versions. */
export interface BackupData {
  settings: BackupSettings;
  progress: BackupProgress;
  /** From the file, for the preview ("Saved on 6 Oct 2026"). */
  exportedAt: string;
}

// ── Writing ──────────────────────────────────────────────────────────────
/**
 * A plain copy of store data: functions (store actions) and `undefined`
 * values dropped, nothing shared with the live store.
 */
export function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * The phone's own stores, made to fit the very rules a restore checks
 * (see "Two modes" above): numbers clamped into range, lists cut to their
 * caps, broken totals repaired. Top-level keys a restore never reads (today's
 * frozen plans) ride along unchanged. A store whose shape is wrong (a TYPE error, which our own stores
 * never have) is passed through as it is, and the restore check reports it.
 */
export function fitForBackup(stores: { settings: unknown; progress: unknown }): { settings: unknown; progress: unknown } {
  const anyKey = str(MAX_KEY);
  const fit = (value: unknown, check: Check<unknown>, at: string) => {
    const plain = toPlain(value);
    fitting = true;
    try {
      // Top-level keys the restore never reads (today's plans) ride along unchanged.
      return { ...(plain as object), ...(check(plain, at) as object) };
    } catch {
      return plain;
    } finally {
      fitting = false;
    }
  };
  return {
    settings: fit(stores.settings, settingsCheck(anyKey), 'settings'),
    progress: fit(stores.progress, progressCheck(anyKey), 'progress'),
  };
}

export function buildBackup(
  rawStores: { settings: unknown; progress: unknown },
  meta: { now: number; appVersion: string },
): BackupFile {
  // Never write a file this app would refuse to restore.
  const stores = fitForBackup(rawStores);
  return {
    app: BACKUP_APP,
    schema: BACKUP_SCHEMA,
    exportedAt: new Date(meta.now).toISOString(),
    appVersion: meta.appVersion,
    stores: {
      settings: { version: SETTINGS_VERSION, state: toPlain(stores.settings) as BackupSettings },
      progress: { version: PROGRESS_VERSION, state: toPlain(stores.progress) as BackupProgress },
    },
  };
}

/** "aurivan-backup-2026-10-10.json", using the phone's local date. */
export function backupFileName(now: number): string {
  return `aurivan-backup-${dayKey(now)}.json`;
}

/** Size of a text in bytes when saved as UTF-8 (what the 5 MB cap measures). */
export function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      bytes += 4; // a surrogate pair: one 4-byte character
      i++;
    } else bytes += 3;
  }
  return bytes;
}

// ── Reading ──────────────────────────────────────────────────────────────
/**
 * Upgrades for older FILE formats, keyed by the schema they upgrade FROM.
 * Schema 1 is the first and current one, so the list is empty today; a
 * future schema 2 adds `1: (file) => …` here and old backups keep working.
 */
export const FILE_MIGRATIONS: Record<number, (file: Record<string, unknown>) => Record<string, unknown>> = {};

/** Run any file-format upgrades, from the file's schema up to BACKUP_SCHEMA. */
export function migrateFile(file: Record<string, unknown>, migrations = FILE_MIGRATIONS, target = BACKUP_SCHEMA): Record<string, unknown> {
  let cur = file;
  for (let v = cur.schema as number; v < target; v++) {
    const step = migrations[v];
    if (!step) throw new BackupError('unknown-schema', `schema ${v}`);
    cur = { ...step(cur), schema: v + 1 };
  }
  return cur;
}

/** A store's saved `{ version, state }`, upgraded to the current version. */
function readStore(blob: unknown, current: number, upgrade: ((state: unknown) => unknown) | null, at: string): unknown {
  if (!isObj(blob)) return bad(at);
  const version = blob.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) return bad(`${at}.version`);
  if (version > current) throw new BackupError('newer', `${at}.version`);
  if (!isObj(blob.state)) return bad(`${at}.state`);
  return version < current && upgrade ? upgrade(blob.state) : blob.state;
}

/** The ids that exist in this app's content for one cert (built once by the caller). */
export interface KnownIds {
  questions: ReadonlySet<string>;
  lessons: ReadonlySet<string>;
  /** Study-notes subtopic ids ("4B1.2"): notes read and mastery dates. */
  notes: ReadonlySet<string>;
  /** Domain ids ("4"): Field Guide cards for a domain's key terms ("kt:D4:…"). Optional. */
  domains?: ReadonlySet<string>;
  /**
   * Mobile 1.13: the outline subtopics with practice questions, per domain in
   * the cert's order (what "know X% of the outline" counts), so a restored
   * plant is clamped to what the restored data supports. Optional: without
   * it the outline can't be compared, so mastered subtopics never refute a
   * plant (engine/plant.ts supportSpread: a restore never lowers honest growth).
   */
  plantOutline?: readonly (readonly string[])[];
}

function keepKeys<T>(m: Record<string, T> | undefined, keep: ReadonlySet<string>): Record<string, T> | undefined {
  if (!m) return m;
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(m)) if (keep.has(k)) out[k] = v;
  return out;
}
const keepIds = (l: string[] | undefined, keep: ReadonlySet<string>) => l?.filter((x) => keep.has(x));
function keepValues(m: Record<string, string>, keep: ReadonlySet<string>): Record<string, string> {
  return Object.fromEntries(Object.entries(m).filter(([, v]) => keep.has(v)));
}
/** The study-note subtopic inside a card id ("rumor:4B1.2:k3f9" → "4B1.2"). */
export function cardSubtopic(cardId: string): string {
  return cardId.split(':')[1] ?? '';
}

/**
 * True when a note card still has something in the app to belong to:
 * - "flow:<lessonId>" (Stepping Stones, a lesson's flow) → the lesson;
 * - "kt:D4:<hash>" (Field Guide, a domain key term) → the domain;
 * - anything else ("rumor:4B1.2:…", "role:1A1.3:r001", "seq:1A3.1:s001",
 *   "kt:4B1.2:…") → its study-notes subtopic.
 */
export function cardKnown(cardId: string, k: KnownIds): boolean {
  const [kind, owner = ''] = cardId.split(':');
  if (kind === 'flow') return k.lessons.has(owner);
  if (/^D\d+$/.test(owner)) return k.domains?.has(owner.slice(1)) ?? false;
  return k.notes.has(owner);
}

/**
 * Keep only ids that exist in the app's content: answers, reviews, mistakes
 * and bookmarks by question id; lessons done by lesson id; notes read and
 * mastery dates by note id. Anything else in a file (a removed question, or
 * made-up ids) is dropped, so it can never pile up on the phone.
 */
export function keepKnownIds(progress: BackupProgress, known: (certId: string) => KnownIds): BackupProgress {
  const byCert: BackupProgress['byCert'] = {};
  for (const [certId, cp] of Object.entries(progress.byCert)) {
    const k = known(certId);
    const next = { ...cp };
    if (cp.answers) next.answers = keepKeys(cp.answers, k.questions);
    if (cp.review) next.review = keepKeys(cp.review, k.questions);
    if (cp.mistakes) next.mistakes = keepKeys(cp.mistakes, k.questions);
    if (cp.bookmarks) next.bookmarks = keepIds(cp.bookmarks, k.questions);
    if (cp.lessonsDone) next.lessonsDone = keepIds(cp.lessonsDone, k.lessons);
    if (cp.notesRead) next.notesRead = keepIds(cp.notesRead, k.notes);
    if (cp.mastery) next.mastery = keepKeys(cp.mastery, k.notes);
    // In order's place is a question id: a removed question just starts that scope over.
    if (cp.studyPath?.inOrder) next.studyPath = { ...cp.studyPath, inOrder: keepValues(cp.studyPath.inOrder, k.questions) };
    // Note cards ("rumor:4B1.2:…") keep only cards whose note, lesson or domain still exists.
    if (cp.cards) next.cards = Object.fromEntries(Object.entries(cp.cards).filter(([key]) => cardKnown(key, k)));
    // Game misses waiting to be fixed are question ids.
    if (cp.milestones?.gameMisses) next.milestones = { ...cp.milestones, gameMisses: keepKeys(cp.milestones.gameMisses, k.questions) };
    byCert[certId] = next;
  }
  return { ...progress, byCert };
}

/**
 * Build F: each cert keeps only the milestone marks its restored data could
 * have earned (engine/milestones.ts markSupported). A restored badge never
 * claims more than the data shows.
 */
export function keepSupportedMarks(progress: BackupProgress): BackupProgress {
  const byCert: BackupProgress['byCert'] = {};
  for (const [certId, cp] of Object.entries(progress.byCert)) {
    // The exam's own domains and full mock size (Whole Map, the Five Domains planter, Dress Rehearsal's tiers).
    const cert = getCertification(certId);
    const exam = cert ? { domains: cert.domains.map((d) => d.id), fullMockSize: cert.exam.questions } : undefined;
    byCert[certId] = cp.milestones ? { ...cp, milestones: keepSupported(cp.milestones, { ...cp, ...(exam ? { exam } : {}) }) } : cp;
  }
  return { ...progress, byCert };
}

/**
 * Mobile 1.13: each cert's plant keeps only the growth its restored data can
 * support (engine/plant.ts maxSupportedGrowth: the live gates on the most
 * generous facts the file allows). An honest file never loses growth: only a
 * claim beyond its evidence is lowered, with `reached`, `pending` and the
 * back-fill above it; never raised. A plant for an exam this app doesn't
 * know can't happen (the cert key is checked first). It runs after
 * keepSupportedMarks, so a Dress Rehearsal mark it reads was checked first.
 */
export function keepSupportedPlants(progress: BackupProgress, known?: (certId: string) => KnownIds): BackupProgress {
  let changed = false;
  const byCert: BackupProgress['byCert'] = {};
  for (const [certId, cp] of Object.entries(progress.byCert)) {
    const cert = getCertification(certId);
    if (!cp.plant || !cert) {
      byCert[certId] = cp;
      continue;
    }
    const e = supportEvidence({
      cert,
      answers: cp.answers ?? {},
      mastery: cp.mastery,
      subtopicsByDomain: known?.(certId).plantOutline ?? [],
      mocks: (cp.mocks ?? []).map((m) => ({ total: m.total, correct: m.correct, day: dayKey(m.finishedAt), ...(m.timing ? { timing: m.timing } : {}), ...(m.unanswered !== undefined ? { unanswered: m.unanswered } : {}) })),
      readinessLog: cp.moments?.readiness,
      readySeenAt: cp.moments?.readySeenAt,
      earned: cp.milestones?.earned,
    });
    const clamped = clampToSupported(cp.plant, maxSupportedGrowth(e));
    if (clamped !== cp.plant) changed = true;
    byCert[certId] = clamped === cp.plant ? cp : { ...cp, plant: clamped };
  }
  return changed ? { ...progress, byCert } : progress;
}

/**
 * Read a backup file's text. Returns the two stores, checked and upgraded,
 * or throws a BackupError. Never changes anything.
 *
 * `knownCertIds`: the certifications this app knows; any other id in the
 * file (a cert key, the active cert, an exam date) rejects the whole file.
 * `known`: when given, ids that don't exist in the content are dropped
 * (keepKnownIds).
 */
export function readBackup(
  text: string,
  knownCertIds: readonly string[],
  known?: (certId: string) => KnownIds,
  /** This app's version ("1.3.0"): a file from a newer app is told to update. */
  thisApp?: string,
): BackupData {
  if (utf8Bytes(text) > MAX_BACKUP_BYTES) throw new BackupError('too-big');
  // Some editors and cloud drives add an invisible byte-order mark at the start.
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    // Cut off half-way (a failed download or sync) but clearly ours: say it
    // is damaged, not "not an Aurivan backup" (the learner DID pick ours).
    const ours = body.trimStart().startsWith('{') && /"app"\s*:\s*"aurivan"/.test(body);
    throw new BackupError(ours ? 'bad-data' : 'not-json');
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) throw new BackupError('not-aurivan');
  const fileApp = typeof raw.appVersion === 'string' ? raw.appVersion : '';
  // Made by a newer MINOR or major version: it may hold data this app would
  // silently drop, so ask the learner to update first.
  if (thisApp && compareVersions(fileApp, thisApp, 2) > 0) throw new BackupError('newer', 'appVersion');
  try {
    return readChecked(raw, knownCertIds, known);
  } catch (e) {
    // Anything this app can't read in a file from a newer app (even a patch
    // release) is most likely new data, not damage: say "update the app".
    if (e instanceof BackupError && e.code === 'bad-data' && thisApp && compareVersions(fileApp, thisApp) > 0) {
      throw new BackupError('newer', e.where);
    }
    throw e;
  }
}

/**
 * Compare "1.4.0" with "1.3.2": positive when `a` is newer. `parts` = how many
 * levels count (2 = major.minor). Anything unreadable counts as 0.
 */
export function compareVersions(a: string, b: string, parts = 3): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < parts; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function readChecked(raw: Record<string, unknown>, knownCertIds: readonly string[], known?: (certId: string) => KnownIds): BackupData {
  const schema = raw.schema;
  if (typeof schema !== 'number' || !Number.isInteger(schema) || schema < 1) throw new BackupError('unknown-schema');
  if (schema > BACKUP_SCHEMA) throw new BackupError('newer', 'schema');
  const file = migrateFile(raw);
  if (!isObj(file.stores)) throw new BackupError('bad-data', 'stores');

  const certKey: Check<string> = (x, at) => {
    if (typeof x !== 'string') return bad(at);
    if (!knownCertIds.includes(x)) throw new BackupError('unknown-cert', at);
    return x;
  };
  const settings = settingsCheck(certKey)(readStore(file.stores.settings, SETTINGS_VERSION, null, 'settings'), 'settings');
  const checked = progressCheck(certKey)(readStore(file.stores.progress, PROGRESS_VERSION, migrateProgress, 'progress'), 'progress');
  // Badges are checked against the data AS BACKED UP, before ids the bank
  // no longer has are trimmed: a genuine badge earned on a question that
  // was later retired must not be dropped (code review, Build F).
  // The plant is clamped at the same point, for the same reason.
  const supported = keepSupportedPlants(keepSupportedMarks(checked), known);
  const progress = known ? keepKnownIds(supported, known) : supported;
  // Never write a store row Android can't read back (see MAX_PROGRESS_CHARS).
  if (JSON.stringify(progress).length > MAX_PROGRESS_CHARS) throw new BackupError('too-big', 'progress');
  const exportedAt = typeof file.exportedAt === 'string' && file.exportedAt.length <= 40 ? file.exportedAt : '';
  return { settings, progress, exportedAt };
}

// ── The preview ──────────────────────────────────────────────────────────
export interface BackupSummary {
  exam: string;
  examDate: string;
  answered: string;
  lastStudied: string;
  bestStreak: string;
  /** "Weekdays at 7:30 AM", or "Off". */
  reminder: string;
}

/** The parts of the two stores the preview reads (a backup's, or the phone's). */
export interface SummaryInput {
  settings: {
    activeCertId: string;
    examDates?: Record<string, string | undefined>;
    reminder?: { enabled: boolean; hour: number; minute: number; days?: number[] };
  };
  progress: {
    byCert: Record<string, { answers?: Record<string, unknown>; lessonsDone?: string[] }>;
    streak: { best: number; lastDay: string | null };
  };
}

const answeredIn = (d: SummaryInput) => Object.keys(d.progress.byCert[d.settings.activeCertId]?.answers ?? {}).length;

/**
 * What a learner needs to decide: which exam, its date, how much they've
 * answered, when they last studied, their best streak and their reminder.
 * Never the bank size ("of 1,000"). `certName` turns a cert id into its name.
 * `locale` is only for tests (the reminder time is in the phone's format).
 */
export function summarize(data: SummaryInput, certName: (id: string) => string, locale?: string): BackupSummary {
  const certId = data.settings.activeCertId;
  const examDate = data.settings.examDates?.[certId];
  const answered = answeredIn(data);
  const best = data.progress.streak.best;
  const lastDay = data.progress.streak.lastDay;
  const reminder = data.settings.reminder;
  return {
    exam: certName(certId),
    examDate: examDate && DATE_RE.test(examDate) ? examDateLabel(examDate) : 'Not set',
    answered: answered === 1 ? '1 question' : `${answered} questions`,
    lastStudied: lastDay && DATE_RE.test(lastDay) ? examDateLabel(lastDay) : 'Not yet',
    bestStreak: best === 1 ? '1 day' : `${best} days`,
    reminder: reminder?.enabled ? reminderSummary(reminder, locale) : 'Off',
  };
}

/** True when the phone has no study history yet (a new install): nothing to lose, nothing to undo. */
export function isFresh(phone: SummaryInput): boolean {
  const certs = Object.values(phone.progress.byCert);
  const any = certs.some((cp) => Object.keys(cp.answers ?? {}).length > 0 || (cp.lessonsDone ?? []).length > 0);
  return !any && !phone.progress.streak.lastDay;
}

/**
 * True when the backup looks OLDER than the phone: fewer answers, or a
 * last study day before the phone's. The preview then warns before replacing.
 */
export function isBehind(phone: SummaryInput, backup: SummaryInput): boolean {
  if (answeredIn(backup) < answeredIn(phone)) return true;
  const a = backup.progress.streak.lastDay;
  const b = phone.progress.streak.lastDay;
  return Boolean(b && (!a || a < b));
}

export interface PreviewRow {
  label: string;
  now: string;
  backup: string;
  /** True when restoring changes this value (the screen marks it). */
  changes: boolean;
}

/** One row per fact: what the phone has now, and what the backup would put back. */
export function previewRows(now: BackupSummary, backup: BackupSummary): PreviewRow[] {
  const rows: [string, keyof BackupSummary][] = [
    ['Exam', 'exam'],
    ['Exam date', 'examDate'],
    ['Questions answered', 'answered'],
    ['Last studied', 'lastStudied'],
    ['Best streak', 'bestStreak'],
    ['Study reminder', 'reminder'],
  ];
  return rows.map(([label, k]) => ({ label, now: now[k], backup: backup[k], changes: now[k] !== backup[k] }));
}

// ── Undo restore ─────────────────────────────────────────────────────────
/** The ONE automatic copy of the learner's data, taken just before a restore. */
export interface UndoSnapshot {
  takenAt: number;
  file: BackupFile;
}

/** When "Undo restore" stops being offered. */
export function undoExpiresAt(snap: UndoSnapshot): number {
  return snap.takenAt + UNDO_DAYS * DAY_MS;
}

/**
 * Undo is offered until 7 days after the restore. A snapshot that looks
 * "from the future" (the phone's clock moved back) is still offered: it is
 * only dropped once `now` reaches its expiry.
 */
export function undoAvailable(snap: UndoSnapshot | null | undefined, now: number): snap is UndoSnapshot {
  return Boolean(snap) && now < undoExpiresAt(snap!);
}
