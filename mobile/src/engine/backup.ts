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
import type { Confidence } from './srs';
import { examDateLabel } from './examDay';
import { migrateProgress, PROGRESS_VERSION, SETTINGS_VERSION } from './saveMigrations';
import { dayKey } from './streak';

export const BACKUP_APP = 'aurivan';
/** The file format version. Bump it (and add a step to FILE_MIGRATIONS) if the envelope changes. */
export const BACKUP_SCHEMA = 1;
/** Biggest file we will read: 5 MB. A real backup is far smaller. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
/** How long "Undo restore" stays available after a restore. */
export const UNDO_DAYS = 7;
const DAY_MS = 24 * 3_600_000;

// ── Caps: no list or map in a backup may be longer than these ────────────
// Generous next to real use (the store itself keeps at most 50 mocks), but
// small enough that a hostile file can't make the phone churn.
const MAX_IDS = 50_000; // answers, reviews, mistakes, bookmarks
const MAX_SMALL = 5_000; // lessons done, notes read, mastery
const MAX_LIST = 200; // mocks, plan items, recent days, readiness log
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
  'too-big': 'This file is too big to be an Aurivan backup. Nothing was changed.',
  'not-json': 'This file isn’t an Aurivan backup. Pick the file that starts with “aurivan-backup”. Nothing was changed.',
  'not-aurivan': 'This file isn’t an Aurivan backup. Pick the file that starts with “aurivan-backup”. Nothing was changed.',
  newer: 'This backup was made by a newer version of Aurivan. Update the app, then try again. Nothing was changed.',
  'unknown-schema': 'This backup’s format isn’t one Aurivan knows. Nothing was changed.',
  'unknown-cert': 'This backup has progress for an exam this version of Aurivan doesn’t know. Update the app, then try again. Nothing was changed.',
  'bad-data': 'Part of this backup is damaged, so it can’t be restored. Nothing was changed.',
  unreadable: 'Aurivan couldn’t open that file. Nothing was changed.',
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
type Check<T> = (x: unknown, at: string) => T;
const bad = (at: string): never => {
  throw new BackupError('bad-data', at);
};
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

const bool: Check<boolean> = (x, at) => (typeof x === 'boolean' ? x : bad(at));
/** A finite number (JSON's 1e999 parses as Infinity, so this matters). */
const num: Check<number> = (x, at) => (typeof x === 'number' && Number.isFinite(x) ? x : bad(at));
const int = (min: number, max: number): Check<number> => (x, at) =>
  typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : bad(at);
const count = int(0, 10_000_000);
const str = (max = MAX_TEXT): Check<string> => (x, at) => (typeof x === 'string' && x.length <= max ? x : bad(at));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** A calendar day "YYYY-MM-DD". */
const date: Check<string> = (x, at) => (typeof x === 'string' && DATE_RE.test(x) ? x : bad(at));
function oneOf<V extends string>(...values: V[]): Check<V> {
  return (x, at) => (values.includes(x as V) ? (x as V) : bad(at));
}
function nullable<T>(check: Check<T>): Check<T | null> {
  return (x, at) => (x === null ? null : check(x, at));
}
function list<T>(check: Check<T>, max: number): Check<T[]> {
  return (x, at) => {
    if (!Array.isArray(x) || x.length > max) return bad(at);
    return x.map((v, i) => check(v, `${at}[${i}]`));
  };
}
/** A map with string keys. `key` can reject keys (unknown cert ids). Prototype keys are refused. */
function map<T>(check: Check<T>, max: number, key: Check<string> = str(MAX_KEY)): Check<Record<string, T>> {
  return (x, at) => {
    if (!isObj(x)) return bad(at);
    const keys = Object.keys(x);
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

const answerRecord = obj(
  { attempts: count, correctCount: count, lastCorrect: bool, lastAt: num },
  { lastAssisted: bool, ms: int(0, 24 * 3_600_000), lastConfidence: CONFIDENCE },
);
const reviewEntry = obj({ box: int(0, 100), dueAt: num, lastSeen: num, reps: count });
const tally = obj({ total: count, correct: count });
const mockResult = obj({
  id,
  finishedAt: num,
  total: count,
  correct: count,
  minutesUsed: num,
  byDomain: map(tally, 50),
});
const mistakeEntry = obj({ at: num }, { picked: LETTER, slip: SLIP, resolved: bool, confidence: CONFIDENCE });
const readinessDay = obj({ day: date, min: nullable(num), last: nullable(num) });
const moments = obj({}, { readiness: list(readinessDay, MAX_LIST * 2), readySeenAt: num });
const subtopicMastery = obj({ firstDay: date }, { masteredAt: date });

const certProgress = obj(
  {},
  {
    answers: map(answerRecord, MAX_IDS),
    review: map(reviewEntry, MAX_IDS),
    bookmarks: list(id, MAX_IDS),
    mocks: list(mockResult, MAX_LIST),
    lessonsDone: list(id, MAX_SMALL),
    mistakes: map(mistakeEntry, MAX_IDS),
    gameBest: map(num, 50),
    gameRecent: map(list(num, 50), 50),
    notesRead: list(id, MAX_SMALL),
    moments,
    mastery: map(subtopicMastery, MAX_SMALL),
  },
);

/** One of Today's plan items: the shape depends on `kind` (engine/planner.ts PlanItem). */
const PLAN_ITEMS = {
  review: obj({ kind: oneOf('review'), count }, { label: str(), capped: bool }),
  lesson: obj({ kind: oneOf('lesson'), lessonId: id, title: str() }),
  practice: obj({ kind: oneOf('practice'), count, label: str() }, { domainId: str(10) }),
  game: obj({ kind: oneOf('game'), gameId: oneOf('trap', 'sprint', 'priority'), label: str() }),
  mock: obj({ kind: oneOf('mock'), questions: count, label: str() }),
};
const planItem = (x: unknown, at: string) => {
  const kind = isObj(x) ? x.kind : undefined;
  const check = typeof kind === 'string' && Object.prototype.hasOwnProperty.call(PLAN_ITEMS, kind) ? PLAN_ITEMS[kind as keyof typeof PLAN_ITEMS] : null;
  return check ? check(x, at) : bad(`${at}.kind`);
};

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
      shuffleOptions: bool,
      dailyGoal: int(1, 1000),
      reminder: obj({ enabled: bool, hour: int(0, 23), minute: int(0, 59) }, { days: list(int(0, 6), 7) }),
      haptics: bool,
      gameRulesSeen: list(str(40), 50),
    },
  );
}

function progressCheck(certKey: Check<string>) {
  const dayPlan = obj(
    {
      day: date,
      certId: certKey,
      items: list(planItem, 30),
      done: list(bool, 30),
      start: obj({ score: num, domains: map(num, 50) }),
      answered: count,
      correct: count,
      minutes: num,
    },
    { celebrated: bool, credit: list(num, 30) },
  );
  return obj(
    {
      byCert: map(certProgress, 50, certKey),
      streak,
      // "" before the first answer ever, otherwise a calendar day.
      today: obj({ day: (x, at) => (x === '' ? '' : date(x, at)), answered: count }),
    },
    { days: map(dayPlan, 50, certKey) },
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

export function buildBackup(
  stores: { settings: unknown; progress: unknown },
  meta: { now: number; appVersion: string },
): BackupFile {
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

/**
 * Read a backup file's text. Returns the two stores, checked and upgraded,
 * or throws a BackupError. Never changes anything.
 *
 * `knownCertIds`: the certifications this app knows; any other id in the
 * file (a cert key, the active cert, a plan's cert) rejects the whole file.
 */
export function readBackup(text: string, knownCertIds: readonly string[]): BackupData {
  if (utf8Bytes(text) > MAX_BACKUP_BYTES) throw new BackupError('too-big');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('not-json');
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) throw new BackupError('not-aurivan');
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
  const progress = progressCheck(certKey)(readStore(file.stores.progress, PROGRESS_VERSION, migrateProgress, 'progress'), 'progress');
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
}

/**
 * What a learner needs to decide: which exam, its date, how much they've
 * answered, when they last studied, and their best streak. Never the bank
 * size ("of 1,000"). `certName` turns a cert id into its name ("CISA").
 */
export function summarize(
  data: { settings: { activeCertId: string; examDates?: Record<string, string | undefined> }; progress: { byCert: Record<string, { answers?: Record<string, unknown> }>; streak: { best: number; lastDay: string | null } } },
  certName: (id: string) => string,
): BackupSummary {
  const certId = data.settings.activeCertId;
  const examDate = data.settings.examDates?.[certId];
  const answered = Object.keys(data.progress.byCert[certId]?.answers ?? {}).length;
  const best = data.progress.streak.best;
  const lastDay = data.progress.streak.lastDay;
  return {
    exam: certName(certId),
    examDate: examDate && DATE_RE.test(examDate) ? examDateLabel(examDate) : 'Not set',
    answered: answered === 1 ? '1 question' : `${answered} questions`,
    lastStudied: lastDay && DATE_RE.test(lastDay) ? examDateLabel(lastDay) : 'Not yet',
    bestStreak: best === 1 ? '1 day' : `${best} days`,
  };
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

/** Undo is offered for 7 days after a restore (and never for a snapshot "from the future"). */
export function undoAvailable(snap: UndoSnapshot | null | undefined, now: number): snap is UndoSnapshot {
  return Boolean(snap) && now >= snap!.takenAt && now < undoExpiresAt(snap!);
}
