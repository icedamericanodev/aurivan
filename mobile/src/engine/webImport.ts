/**
 * Bring your website progress into the app (mobile 1.42).
 *
 * Plain English for the founder:
 * - The KaiSip website (index.html) exports a file like
 *   `{ "cisaMindsetExport": true, "version": 1, "profile": { name, state } }`
 *   ("kaisip-web-progress.json"). The app's own Restore only knew app
 *   backups, so it said "This file isn't a KaiSip backup".
 * - This file READS a website export as untrusted input (size cap, JSON in
 *   try/catch, every field type- and range-checked, unknown keys dropped,
 *   lists capped) and turns the parts that map cleanly into the app's own
 *   shapes: answers, spaced review, saved questions, the mistake journal,
 *   mock results, study notes read or started, your notes on questions and
 *   study days. The website was built to keep these in the app's shapes
 *   ("parity fields"), so the mapping is one to one.
 * - Question ids are matched exactly. Anything the app doesn't have is left
 *   out and COUNTED, so the screen can say how many items couldn't be matched.
 * - It then MERGES into the phone's progress with the same rules two phones
 *   use when they sync (engine/syncMerge.ts): lists are unioned, counts take
 *   the max, the later answer wins its "last answer" fields. Nothing on the
 *   phone is deleted or replaced wholesale, and importing the same file twice
 *   changes nothing the second time.
 * - Not brought over: the website's plant (the phone keeps its own) and its
 *   settings.
 * - The exam date (mobile 1.42.1, website v12.34.1): a newer website file
 *   carries it as a top-level `examDate` ("YYYY-MM-DD"). It is checked (a
 *   real day, not more than a day in the past, at most about 3 years ahead)
 *   and used ONLY when this phone has no exam date yet: the phone's own date
 *   always wins. Older files have no date and read exactly as before.
 * - The learner's name (mobile 1.44, the owner's "Version 3"): a newer website
 *   file carries the name the website greets them by as a top-level
 *   `displayName` (24 characters at most). It is read as hostile text
 *   (`readWebDisplayName`: not text, too long or markup-looking means none;
 *   otherwise engine/displayName.ts cleans it) and used ONLY when this phone
 *   has no name yet: the phone's own name always wins. The website's
 *   profile LABEL ("My Progress") is never used as a name.
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import { BackupError, type BackupProgress } from './backup';
import { cleanDisplayName } from './displayName';
import { deviceLocalOf, localSide, mergeSides, type MergeContext, type SyncedProgress } from './syncMerge';
import { capNoteText, isLiveNote, NOTE_ID_RE, NOTES_TOTAL_MAX } from './questionNotes';
import { MAX_ANSWER_MS } from './answerClock';
import { MAX_MOCKS } from './journey';
import { DAY_MS, INTERVAL_DAYS, MAX_BOX } from './srs';
import { examDateLabel } from './examDay';
import { dayKey, daysBetween } from './streak';

// ── Limits ───────────────────────────────────────────────────────────────
/** The marker the website writes (its original name, kept so older exports still import). */
export const WEB_MARKER = 'cisaMindsetExport';
/** The website export versions this app reads. */
export const WEB_VERSIONS: readonly number[] = [1];
/**
 * The biggest website export read. The website keeps full copies of saved and
 * missed questions in its file, so it is larger than an app backup (1 MB);
 * browser storage holds about 5 MB, so 8 MB is generous and still safe to read.
 */
export const WEB_MAX_BYTES = 8 * 1024 * 1024;
/** At most this many profiles are offered from one file. */
export const WEB_MAX_PROFILES = 20;
/** At most this many entries are read from any one map or list (the bank is far smaller). */
const MAX_ENTRIES = 20_000;
/** The app's own caps (engine/backup.ts): per-exam maps and lists. */
const MAX_IDS = 5_000;
const MAX_DAYS = 200;
/** The oldest moment the app's checker accepts: an undated web entry gets it, so the phone's own entry always wins. */
const OLDEST = Date.UTC(2000, 0, 1);
const NEWEST = Date.UTC(2100, 11, 31);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const PROTO = new Set(['__proto__', 'constructor', 'prototype']);

// ── Errors ───────────────────────────────────────────────────────────────
export type WebImportErrorCode = 'too-big' | 'newer' | 'bad-data' | 'empty';
/** What the learner reads. Calm, plain, and always says nothing changed. */
export const WEB_IMPORT_ERROR_COPY: Record<WebImportErrorCode, string> = {
  'too-big': 'This website progress file is too big to read. Nothing was changed.',
  newer: 'This progress file was made by a newer version of the KaiSip website. Update the app, then try again. Nothing was changed.',
  'bad-data': 'This website progress file is damaged, so it can’t be added. Export it again from the website. Nothing was changed.',
  empty: 'This website progress file has no study in it yet. Nothing was changed.',
};
export class WebImportError extends Error {
  constructor(public code: WebImportErrorCode) {
    super(code);
  }
}

// ── Small checks ─────────────────────────────────────────────────────────
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
/** Own, safe keys only, at most `max` of them. */
const keysOf = (o: Record<string, unknown>, max = MAX_ENTRIES) => Object.keys(o).filter((k) => !PROTO.has(k)).slice(0, max);
const isTime = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= OLDEST && x <= NEWEST;
const whole = (x: unknown, max = 10_000_000): number => {
  const n = typeof x === 'number' ? Math.floor(x) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};
const LETTERS = ['A', 'B', 'C', 'D'] as const;
type Letter = (typeof LETTERS)[number];
const CONFIDENCE = ['sure', 'unsure', 'guessing'] as const;
type Confidence = (typeof CONFIDENCE)[number];
const SLIPS = ['role', 'priority', 'tech-first', 'symptom', 'misread', 'knowledge'] as const;
type Slip = (typeof SLIPS)[number];
const TIMINGS = ['standard', 'plus25', 'plus50', 'untimed'] as const;
type Timing = (typeof TIMINGS)[number];
const oneOf = <T extends string>(list: readonly T[], x: unknown): T | undefined => (list as readonly unknown[]).includes(x) ? (x as T) : undefined;

/** A real calendar day "YYYY-MM-DD", years 2000–2100. */
function isDay(x: unknown): x is string {
  if (typeof x !== 'string' || !DAY_RE.test(x)) return false;
  const [y, m, d] = x.split('-').map(Number);
  const back = new Date(Date.UTC(y, m - 1, d));
  return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d && y >= 2000 && y <= 2100;
}

// ── What the app knows ───────────────────────────────────────────────────
/** The ids this app has (questions, study notes, domains), passed in so the engine stays pure. */
export interface WebKnown {
  question: (id: string) => boolean;
  note: (id: string) => boolean;
  domain: (id: string) => boolean;
}

// ── One profile, in the app's shapes ─────────────────────────────────────
type Cert = BackupProgress['byCert'][string];
type Answer = NonNullable<Cert['answers']>[string];
type Review = NonNullable<Cert['review']>[string];
type Mistake = NonNullable<Cert['mistakes']>[string];
type Mock = NonNullable<Cert['mocks']>[number];
type Note = NonNullable<Cert['qNotes']>[string];

export interface WebProfile {
  /** Its key in the file (the website's profile id), or "profile" for a one-profile export. */
  key: string;
  /** The website's name for it ("My Progress"), cleaned; empty when it has none. */
  name: string;
  /** When it was last used on the website (epoch ms), when the file says. */
  lastActive?: number;
  /** Its study, in the app's shapes (only ids the app has). */
  cert: Cert;
  /** Days with study ("YYYY-MM-DD"), oldest first; never later than the reading day + 1. */
  studyDays: string[];
  /** Items that couldn't be matched to anything in the app (distinct ids). */
  unmatched: number;
  /** Older answers the website saved without their result (right or wrong), so they can't be added. */
  noDetail: number;
  /** Entries dated in the future (a wrong clock on the computer): left out, never clamped. */
  future: number;
  /** The file's exam date ("YYYY-MM-DD"), when it has a sensible one (readWebExamDate). The same for every profile in a file. */
  examDate?: string;
  /** Mobile 1.44: the name the website greets the learner by (readWebDisplayName), cleaned. The same for every profile in a file. */
  displayName?: string;
}

// ── The learner's name (mobile 1.44) ─────────────────────────────────────
/**
 * The longest `displayName` text read at all, in UTF-16 units. The website
 * keeps 24 characters at most (48 units even if every one is an emoji), so
 * anything longer did not come from the website and is left out entirely.
 */
export const WEB_NAME_MAX_UNITS = 64;
/**
 * The file's name for the learner (top-level `displayName`), or undefined.
 * Hostile input gives undefined: not text, longer than WEB_NAME_MAX_UNITS,
 * or anything that looks like markup ("<" or ">", which a name never has).
 * Otherwise the app's one rule cleans it (engine/displayName.ts: control and
 * direction-changing characters removed, no links or emails, 24 characters).
 */
export function readWebDisplayName(raw: unknown): string | undefined {
  if (!isObj(raw)) return undefined;
  const text = raw.displayName;
  if (typeof text !== 'string' || text.length > WEB_NAME_MAX_UNITS || /[<>]/.test(text)) return undefined;
  return cleanDisplayName(text) || undefined;
}

// ── The exam date ────────────────────────────────────────────────────────
/** The latest exam date accepted from a file, in days from today: about 3 years. */
export const WEB_EXAM_DATE_MAX_DAYS = 3 * 366;
/**
 * The file's exam date (top-level `examDate`), or undefined when there is
 * none or it isn't sensible: a real calendar day, no more than one day before
 * today (time zones), and at most WEB_EXAM_DATE_MAX_DAYS ahead. `now` is the
 * phone's clock; "today" is its local day.
 */
export function readWebExamDate(raw: unknown, now: number): string | undefined {
  if (!isObj(raw) || !isDay(raw.examDate)) return undefined;
  const ahead = daysBetween(dayKey(now), raw.examDate);
  return ahead >= -1 && ahead <= WEB_EXAM_DATE_MAX_DAYS ? raw.examDate : undefined;
}

/**
 * Review 1.42 L4: invisible characters that can reorder or hide text
 * (zero-width and bidirectional controls) are taken out of names and notes.
 */
const INVISIBLE = /[​-‏‪-‮⁦-⁩]/g;
export function stripInvisible(text: string): string {
  return text.replace(INVISIBLE, '');
}

/** A clean, short display name (the website allowed 32 characters of text). */
function cleanName(x: unknown): string {
  if (typeof x !== 'string') return '';
  // Control characters, invisible ones and markup-looking text are dropped; the screen shows plain text only.
  return stripInvisible(x).replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 32);
}

/** How far ahead of the phone's clock a date may be (time zones), before it counts as a wrong clock. */
export const FUTURE_SLACK_MS = DAY_MS;
/** The longest wait in spaced review (box 5): a review date further out than this after it was seen is not real. */
const LONGEST_REVIEW_MS = Math.max(...Object.values(INTERVAL_DAYS)) * DAY_MS;

/**
 * Read one profile's `state` (untrusted) into the app's shapes. `now` is the
 * phone's clock: anything dated later than now + FUTURE_SLACK_MS is DROPPED
 * (and counted), so a computer with a wrong clock can't plant answers,
 * notes or study days in the future.
 */
export function readWebState(state: Record<string, unknown>, known: WebKnown, now: number): Omit<WebProfile, 'key' | 'name' | 'lastActive'> {
  const limit = now + FUTURE_SLACK_MS;
  const lastDayAllowed = dayKey(limit);
  let future = 0;
  /** A real time, and not in the future (counted when it is). */
  const past = (x: unknown): x is number => {
    if (!isTime(x)) return false;
    if (x > limit) {
      future += 1;
      return false;
    }
    return true;
  };
  const unknownIds = new Set<string>();
  /** True when the id is one of the app's questions; any other well-formed id is counted as unmatched. */
  const keepQ = (id: string) => {
    if (!NOTE_ID_RE.test(id)) return false;
    if (known.question(id)) return true;
    unknownIds.add(`q:${id}`);
    return false;
  };

  // Answers (the website's answerLog: the app's AnswerRecord, one to one).
  const answers: Record<string, Answer> = {};
  const log = isObj(state.answerLog) ? state.answerLog : {};
  for (const id of keysOf(log)) {
    const e = log[id];
    if (!isObj(e) || !keepQ(id) || !past(e.lastAt)) continue;
    if (Object.keys(answers).length >= MAX_IDS) break;
    const attempts = Math.max(1, whole(e.attempts));
    const rec: Answer = { attempts, correctCount: Math.min(attempts, whole(e.correctCount)), lastCorrect: e.lastCorrect === true, lastAt: e.lastAt };
    if (e.lastAssisted === true) rec.lastAssisted = true;
    if (e.lastRetest === true) rec.lastRetest = true;
    if (e.lastGame === true) rec.lastGame = true;
    if (typeof e.ms === 'number' && Number.isFinite(e.ms)) rec.ms = Math.min(MAX_ANSWER_MS, Math.max(0, Math.round(e.ms)));
    const conf = oneOf(CONFIDENCE, e.lastConfidence);
    if (conf) rec.lastConfidence = conf as Confidence;
    answers[id] = rec;
  }
  // Older answers with no result saved (answeredIds only): they can't become answers. Counted once each.
  const noDetailIds = new Set<string>();
  if (isObj(state.answeredIds)) {
    for (const bucket of keysOf(state.answeredIds, 20)) {
      const ids = state.answeredIds[bucket];
      if (!isObj(ids)) continue;
      for (const id of keysOf(ids)) if (ids[id] === true && known.question(id) && !answers[id]) noDetailIds.add(id);
    }
  }

  // Spaced review (the same Leitner entries). An undated one is the oldest; a "seen" date in the future
  // is dropped; the next review is never more than the longest interval after it was seen.
  const review: Record<string, Review> = {};
  const rv = isObj(state.review) ? state.review : {};
  for (const id of keysOf(rv)) {
    const e = rv[id];
    if (!isObj(e) || !keepQ(id)) continue;
    if (isTime(e.lastSeen) && !past(e.lastSeen)) continue;
    if (Object.keys(review).length >= MAX_IDS) break;
    const box = Math.min(MAX_BOX, Math.max(1, Math.round(typeof e.box === 'number' && Number.isFinite(e.box) ? e.box : 1)));
    const lastSeen = isTime(e.lastSeen) ? e.lastSeen : OLDEST;
    const dueAt = Math.min(isTime(e.dueAt) ? e.dueAt : OLDEST, lastSeen + LONGEST_REVIEW_MS);
    review[id] = { box, dueAt: Math.max(OLDEST, dueAt), lastSeen, reps: whole(e.reps) };
  }

  // Saved questions: the website keeps copies; only the id is needed.
  const bookmarks: string[] = [];
  if (Array.isArray(state.bookmarks)) {
    for (const q of state.bookmarks.slice(0, MAX_ENTRIES)) {
      const id = isObj(q) && typeof q.id === 'string' ? q.id : undefined;
      if (id && keepQ(id) && !bookmarks.includes(id) && bookmarks.length < MAX_IDS) bookmarks.push(id);
    }
  }

  // The mistake journal (the app's MistakeEntry, one to one).
  const mistakes: Record<string, Mistake> = {};
  const ml = isObj(state.mistakeLog) ? state.mistakeLog : {};
  for (const id of keysOf(ml)) {
    const e = ml[id];
    if (!isObj(e) || !keepQ(id) || !past(e.at)) continue;
    if (Object.keys(mistakes).length >= MAX_IDS) break;
    const m: Mistake = { at: e.at };
    const picked = oneOf(LETTERS, e.picked);
    if (picked) m.picked = picked as Letter;
    if (e.resolved === true) m.resolved = true;
    const conf = oneOf(CONFIDENCE, e.confidence);
    if (conf) m.confidence = conf as Confidence;
    if (e.fixedLater === true) m.fixedLater = true;
    const slip = oneOf(SLIPS, e.slip);
    if (slip) m.slip = slip as Slip;
    mistakes[id] = m;
  }

  // Mock results (the app's MockResult). Ids get a "web-" prefix: never confused with the phone's own,
  // and the same every time, so a second import adds nothing.
  const mocks: Mock[] = [];
  if (Array.isArray(state.mockHistory)) {
    const seen = new Set<string>();
    for (const m of state.mockHistory.slice(0, MAX_ENTRIES)) {
      if (!isObj(m) || typeof m.id !== 'string' || !NOTE_ID_RE.test(m.id) || seen.has(m.id) || !past(m.finishedAt)) continue;
      seen.add(m.id);
      const total = whole(m.total, 1000);
      if (total === 0) continue;
      const byDomain: Record<string, { total: number; correct: number }> = {};
      if (isObj(m.byDomain)) {
        for (const d of keysOf(m.byDomain, 50)) {
          const t = m.byDomain[d];
          if (!known.domain(d) || !isObj(t)) continue;
          const dt = whole(t.total, 1000);
          byDomain[d] = { total: dt, correct: Math.min(dt, whole(t.correct, 1000)) };
        }
      }
      const r: Mock = {
        id: `web-${m.id}`,
        finishedAt: m.finishedAt,
        total,
        correct: Math.min(total, whole(m.correct, 1000)),
        minutesUsed: Math.min(1440, Math.max(0, typeof m.minutesUsed === 'number' && Number.isFinite(m.minutesUsed) ? m.minutesUsed : 0)),
        byDomain,
      };
      const timing = oneOf(TIMINGS, m.timing);
      if (timing) r.timing = timing as Timing;
      if (typeof m.minutesAllowed === 'number' && Number.isFinite(m.minutesAllowed)) r.minutesAllowed = Math.min(1440, Math.max(0, m.minutesAllowed));
      if (typeof m.medianSec === 'number' && Number.isFinite(m.medianSec)) r.medianSec = Math.min(MAX_ANSWER_MS / 1000, Math.max(0, m.medianSec));
      if (m.unanswered !== undefined) r.unanswered = Math.min(total, whole(m.unanswered, 1000));
      mocks.push(r);
    }
    mocks.sort((a, b) => b.finishedAt - a.finishedAt);
    mocks.splice(MAX_MOCKS);
  }

  // Study notes read and started. Only the website's current note ids (ticks schema 2) are the app's ids;
  // ticks saved under the older numbering can't be matched, and are counted as such.
  const ticks = (x: unknown): string[] => {
    if (!isObj(x)) return [];
    const out: string[] = [];
    for (const id of keysOf(x)) {
      const v = x[id];
      if (!(v === true || isTime(v)) || !NOTE_ID_RE.test(id)) continue;
      if (typeof v === 'number' && !past(v)) continue;
      if (state.topicTicksSchema === 2 && known.note(id)) {
        if (out.length < MAX_IDS) out.push(id);
      } else unknownIds.add(`note:${id}`);
    }
    return out.sort();
  };
  const notesRead = ticks(state.topicReviewed);
  const notesViewed = ticks(state.topicViewed);

  // Your notes on questions (the same { text, ts }). An undated one is the oldest; a future one is dropped.
  const qNotes: Record<string, Note> = {};
  const qn = isObj(state.qNotes) ? state.qNotes : {};
  let chars = 0;
  for (const id of keysOf(qn)) {
    const e = qn[id];
    if (!isObj(e) || typeof e.text !== 'string' || !keepQ(id)) continue;
    const text = capNoteText(stripInvisible(e.text));
    if (!text.trim()) continue;
    if (isTime(e.ts) && !past(e.ts)) continue;
    if (chars + text.length > NOTES_TOTAL_MAX || Object.keys(qNotes).length >= MAX_IDS) break;
    chars += text.length;
    qNotes[id] = { text, ts: isTime(e.ts) ? e.ts : OLDEST };
  }

  // Study days (the app's streak days). A day after tomorrow is a wrong clock: dropped and counted.
  const days: string[] = [];
  if (Array.isArray(state.studyDays)) {
    for (const d of state.studyDays.slice(0, MAX_ENTRIES)) {
      if (!isDay(d)) continue;
      if (d > lastDayAllowed) future += 1;
      else days.push(d);
    }
  }
  const studyDays = [...new Set(days)].sort().slice(-MAX_DAYS);

  const cert: Cert = {};
  if (Object.keys(answers).length) cert.answers = answers;
  if (Object.keys(review).length) cert.review = review;
  if (bookmarks.length) cert.bookmarks = [...bookmarks].sort();
  if (Object.keys(mistakes).length) cert.mistakes = mistakes;
  if (mocks.length) cert.mocks = mocks;
  if (notesRead.length) {
    cert.notesRead = notesRead;
    cert.notesEverRead = notesRead.length;
  }
  if (notesViewed.length) cert.notesViewed = notesViewed;
  if (Object.keys(qNotes).length) cert.qNotes = qNotes;
  return { cert, studyDays, unmatched: unknownIds.size, noDetail: noDetailIds.size, future };
}

/** One profile from the file, or null when it isn't one (no `state` object). */
function readProfile(key: string, p: unknown, known: WebKnown, now: number): WebProfile | null {
  if (!isObj(p) || !isObj(p.state)) return null;
  const read = readWebState(p.state, known, now);
  return { key, name: cleanName(p.name), ...(isTime(p.lastActive) && p.lastActive <= now + FUTURE_SLACK_MS ? { lastActive: p.lastActive } : {}), ...read };
}

/** True when the parsed JSON is a website export (the marker), whatever its version. */
export function isWebExport(raw: unknown): boolean {
  return isObj(raw) && raw[WEB_MARKER] === true;
}

/**
 * The file's text, size-checked BEFORE it is parsed, then parsed once.
 * Throws WebImportError ('too-big', or 'bad-data' when it isn't JSON).
 */
export function parseWebText(text: string): unknown {
  if (text.length > WEB_MAX_BYTES) throw new WebImportError('too-big');
  try {
    return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    throw new WebImportError('bad-data');
  }
}

/**
 * Read a parsed website export (parseWebText). Returns its profiles (one for
 * a normal export; a file holding several, as `profiles`, offers at most
 * WEB_MAX_PROFILES). `now` is the phone's clock (future dates are dropped).
 * Throws WebImportError.
 */
export function readWebExport(raw: unknown, known: WebKnown, now: number): WebProfile[] {
  if (!isObj(raw) || raw[WEB_MARKER] !== true) throw new WebImportError('bad-data');
  // The website's own versioning: a number. A newer one may hold data this app would drop.
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version)) throw new WebImportError('bad-data');
  if (!WEB_VERSIONS.includes(raw.version)) throw new WebImportError(raw.version > Math.max(...WEB_VERSIONS) ? 'newer' : 'bad-data');
  const out: WebProfile[] = [];
  if (raw.profile !== undefined) {
    const p = readProfile('profile', raw.profile, known, now);
    if (!p) throw new WebImportError('bad-data');
    out.push(p);
  }
  // Several profiles (the website's profile records, keyed by id, or a list). Cut to the cap FIRST,
  // so a file with a huge list is never walked in full.
  if (raw.profiles !== undefined) {
    const room = Math.max(0, WEB_MAX_PROFILES - out.length);
    const list: [string, unknown][] = Array.isArray(raw.profiles)
      ? raw.profiles.slice(0, room).map((p, i) => [isObj(p) && typeof p.id === 'string' ? p.id : `profile-${i + 1}`, p])
      : isObj(raw.profiles)
        ? keysOf(raw.profiles, room).map((k) => [k, (raw.profiles as Record<string, unknown>)[k]])
        : [];
    for (const [key, p] of list) {
      const read = readProfile(String(key).slice(0, 64), p, known, now);
      if (read) out.push(read);
    }
    if (!out.length) throw new WebImportError('bad-data');
  }
  if (!out.length) throw new WebImportError('bad-data');
  const examDate = readWebExamDate(raw, now);
  // Mobile 1.44: the top-level name (never a profile's label).
  const displayName = readWebDisplayName(raw);
  return examDate || displayName ? out.map((p) => ({ ...p, ...(examDate ? { examDate } : {}), ...(displayName ? { displayName } : {}) })) : out;
}

/** True when a profile holds nothing the app could add. */
export function profileIsEmpty(p: WebProfile): boolean {
  return Object.keys(p.cert).length === 0 && p.studyDays.length === 0;
}

// ── The streak from study days ───────────────────────────────────────────
/**
 * The run of consecutive days ending on the last day that is not after
 * `today` (later days are left out). `best` is that run only: the website
 * file never raises the phone's best streak on its own; the merge works the
 * current streak out from both sides' real days.
 */
export function streakFromDays(days: readonly string[], today: string, restDay?: string | null): SyncedProgress['streak'] {
  const upTo = days.filter((d) => d <= today);
  if (!upTo.length) return { current: 0, best: 0, lastDay: null, ...(restDay !== undefined ? { restDay } : {}) };
  let run = 1;
  for (let i = 1; i < upTo.length; i++) run = daysBetween(upTo[i - 1], upTo[i]) === 1 ? run + 1 : 1;
  return { current: run, best: run, lastDay: upTo[upTo.length - 1], recentDays: [...upTo], ...(restDay !== undefined ? { restDay } : {}) };
}

// ── The merge ────────────────────────────────────────────────────────────
/**
 * The web side with everything that would REPLACE something on the phone
 * taken out (review 1.42 S1), so the merge can only add:
 * - your notes on questions: only for questions with no note entry here
 *   (a phone note, or a note deleted here, always stays as it is);
 * - review entries: only for questions with no review entry here, and only
 *   when the website saw the question after the phone last answered it;
 * - mock results: only as many as fit beside the phone's own under the
 *   MAX_MOCKS cap (newest first), so the phone's mocks are never pushed out;
 * - the few fields the merge takes whole from the side that studied last
 *   (recent game scores, where study paths stopped) carry the phone's own.
 */
function webSideFor(mine: Cert, p: WebProfile): { cert: Cert; mocksSkipped: number } {
  const has = (m: Record<string, unknown> | undefined, id: string) => Boolean(m && Object.prototype.hasOwnProperty.call(m, id));
  const cert: Cert = { ...p.cert };
  delete cert.qNotes;
  delete cert.review;
  delete cert.mocks;
  const notes = Object.entries(p.cert.qNotes ?? {}).filter(([id]) => !has(mine.qNotes, id));
  if (notes.length) cert.qNotes = Object.fromEntries(notes);
  const review = Object.entries(p.cert.review ?? {}).filter(([id, r]) => !has(mine.review, id) && !(mine.answers?.[id] && mine.answers[id].lastAt >= r.lastSeen));
  if (review.length) cert.review = Object.fromEntries(review);
  const myMocks = new Set((mine.mocks ?? []).map((m) => m.id));
  const newMocks = (p.cert.mocks ?? []).filter((m) => !myMocks.has(m.id));
  const room = Math.max(0, MAX_MOCKS - myMocks.size);
  const kept = newMocks.slice(0, room);
  // The ids already on the phone come along too (the merge keeps one of each, the phone's own).
  const mocks = [...(p.cert.mocks ?? []).filter((m) => myMocks.has(m.id)), ...kept];
  if (mocks.length) cert.mocks = mocks;
  if (mine.gameRecent) cert.gameRecent = mine.gameRecent;
  if (mine.studyPath) cert.studyPath = mine.studyPath;
  return { cert, mocksSkipped: newMocks.length - kept.length };
}

/**
 * The phone's progress with `p` merged in, for `certId`. `phone` must be the
 * phone's own progress FITTED for backup (engine/backup.ts fitForBackup).
 * Uses the sync merge (engine/syncMerge.ts) on a web side that can only add
 * (webSideFor), then puts the phone's device-only fields back. Throws
 * BackupError when the result can't pass the checker (e.g. too big).
 *
 * Safe to repeat: merging the result with the same profile again gives the
 * same progress.
 */
export function mergeWebProgress(phone: BackupProgress, p: WebProfile, certId: string, ctx: Omit<MergeContext, 'firstSync'>): BackupProgress {
  if (!ctx.knownCertIds.includes(certId)) throw new BackupError('unknown-cert', certId);
  const mine: Cert = phone.byCert[certId] ?? {};
  const { cert } = webSideFor(mine, p);
  // The phone's rest day travels on the web side too, so it stays whichever side studied last.
  const webState = { byCert: { [certId]: cert }, streak: streakFromDays(p.studyDays, dayKey(ctx.now), phone.streak.restDay ?? null) };
  const local = localSide<SyncedProgress>('progress', phone, {}, ctx);
  const web = localSide<SyncedProgress>('progress', webState, {}, ctx);
  const merged = mergeSides<SyncedProgress>('progress', local, web, ctx);
  return { ...(merged.state as BackupProgress), ...(deviceLocalOf('progress', phone) as Partial<BackupProgress>) } as BackupProgress;
}

// ── What would be added ──────────────────────────────────────────────────
export interface WebAddSummary {
  /** Questions answered on the website and not yet on this phone. */
  answers: number;
  /** Questions answered on both: the later answer's result is kept, attempts are not double counted. */
  updated: number;
  saved: number;
  notesRead: number;
  qNotes: number;
  mocks: number;
  /** Mock results left out because the phone already keeps the most it can. */
  mocksSkipped: number;
  studyDays: number;
  unmatched: number;
  noDetail: number;
  future: number;
  /** Together with this phone's progress it would be too large to save (nothing can be added). */
  tooBig?: boolean;
  /** The exam date this import sets: the file has one and this phone has none. */
  examDate?: string;
  /** The file has an exam date, but this phone already has a different one, which stays. */
  examDateKept?: boolean;
  /** Mobile 1.44: the name this import sets: the file has one and this phone has none. */
  displayName?: string;
  /** Mobile 1.44: the file has a name, but this phone already has a different one, which stays. */
  displayNameKept?: boolean;
  /** True when the phone already has everything this profile could add. */
  nothingNew: boolean;
}

/** The summary when the merge can't be saved on this phone (too large together). */
export function tooBigSummary(p: WebProfile): WebAddSummary {
  return { answers: 0, updated: 0, saved: 0, notesRead: 0, qNotes: 0, mocks: 0, mocksSkipped: 0, studyDays: 0, unmatched: p.unmatched, noDetail: p.noDetail, future: p.future, tooBig: true, nothingNew: false };
}

/**
 * What importing `p` adds, worked out by comparing the phone (`phone`, fitted)
 * with the merge result (`merged`, mergeWebProgress): only what truly changes
 * is counted. Study days count only those the phone hasn't already kept or
 * gone past (a phone keeps its recent days only), so a re-import after more
 * study says there is nothing new.
 */
export function webAddSummary(
  phone: BackupProgress,
  merged: BackupProgress,
  p: WebProfile,
  certId: string,
  now: number,
  /** This phone's exam date for `certId` (settings), if it has one: the file's date is then never used. */
  phoneExamDate?: string,
  /** Mobile 1.44: this phone's own name (settings), if it has one: the file's name is then never used. */
  phoneName?: string,
): WebAddSummary {
  const cp: Cert = phone.byCert[certId] ?? {};
  const out: Cert = merged.byCert[certId] ?? {};
  const has = (m: Record<string, unknown> | undefined, id: string) => Boolean(m && Object.prototype.hasOwnProperty.call(m, id));
  const newIn = (x: readonly string[] | undefined, mine: readonly string[] | undefined) => {
    const set = new Set(mine ?? []);
    return (x ?? []).filter((v) => !set.has(v)).length;
  };
  const answers = Object.keys(out.answers ?? {}).filter((id) => !has(cp.answers, id)).length;
  const updated = Object.entries(out.answers ?? {}).filter(([id, a]) => has(cp.answers, id) && a.lastAt > cp.answers![id].lastAt).length;
  const qNotes = Object.entries(out.qNotes ?? {}).filter(([id, note]) => !has(cp.qNotes, id) && isLiveNote(note)).length;
  const mockIds = new Set((cp.mocks ?? []).map((m) => m.id));
  const mocks = (out.mocks ?? []).filter((m) => !mockIds.has(m.id)).length;
  const fileMocks = (p.cert.mocks ?? []).filter((m) => !mockIds.has(m.id)).length;
  const saved = newIn(out.bookmarks, cp.bookmarks);
  const notesRead = newIn(out.notesRead, cp.notesRead);
  // Study days: up to today, not already kept here, and not older than the oldest day this phone keeps.
  const myDays = phone.streak.recentDays ?? (phone.streak.lastDay ? [phone.streak.lastDay] : []);
  const oldestKept = myDays.length ? [...myDays].sort()[0] : '';
  const today = dayKey(now);
  const studyDays = p.studyDays.filter((d) => !myDays.includes(d) && d > oldestKept && d <= today).length;
  // Anything else the merge changed (the mistake journal, review, notes started).
  const sameMistake = (a: Mistake, b: Mistake) =>
    a.at === b.at && a.picked === b.picked && a.slip === b.slip && !!a.resolved === !!b.resolved && !!a.fixedLater === !!b.fixedLater && a.confidence === b.confidence;
  const mistakes = Object.entries(out.mistakes ?? {}).filter(([id, m]) => !cp.mistakes?.[id] || !sameMistake(cp.mistakes[id], m)).length;
  const review = Object.keys(out.review ?? {}).filter((id) => !has(cp.review, id)).length;
  const viewed = newIn(out.notesViewed, cp.notesViewed);
  // The exam date: add-only. The phone's own date always wins.
  const examDate = p.examDate && !phoneExamDate ? p.examDate : undefined;
  const examDateKept = Boolean(p.examDate && phoneExamDate && phoneExamDate !== p.examDate);
  // The name: add-only too. The phone's own name always wins (cleaned, so a bad saved value counts as none).
  const mine = cleanDisplayName(phoneName);
  const displayName = p.displayName && !mine ? p.displayName : undefined;
  const displayNameKept = Boolean(p.displayName && mine && mine !== p.displayName);
  const added = answers + updated + saved + notesRead + qNotes + mocks + studyDays + mistakes + review + viewed + (examDate ? 1 : 0) + (displayName ? 1 : 0);
  return {
    answers,
    updated,
    saved,
    notesRead,
    qNotes,
    mocks,
    mocksSkipped: Math.max(0, fileMocks - mocks),
    studyDays,
    unmatched: p.unmatched,
    noDetail: p.noDetail,
    future: p.future,
    ...(examDate ? { examDate } : {}),
    ...(examDateKept ? { examDateKept } : {}),
    ...(displayName ? { displayName } : {}),
    ...(displayNameKept ? { displayNameKept } : {}),
    nothingNew: added === 0,
  };
}

/** "1 question" / "12 questions". */
const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

/**
 * The confirm sheet's lines: what will be added, in plain words (zeros left
 * out). Only the learner's own counts, never the size of the question bank.
 */
export function webAddLines(s: WebAddSummary): string[] {
  const out: string[] = [];
  if (s.answers) out.push(`${n(s.answers, 'question', 'questions')} you answered on the website`);
  if (s.updated) out.push(`${n(s.updated, 'newer answer', 'newer answers')} to questions you also answered here`);
  if (s.saved) out.push(n(s.saved, 'saved question', 'saved questions'));
  if (s.notesRead) out.push(n(s.notesRead, 'study note read', 'study notes read'));
  if (s.qNotes) out.push(`${n(s.qNotes, 'note', 'notes')} you wrote on questions`);
  if (s.mocks) out.push(n(s.mocks, 'mock exam result', 'mock exam results'));
  if (s.studyDays) out.push(n(s.studyDays, 'study day', 'study days'));
  if (s.examDate) out.push(`Your exam date: ${examDateLabel(s.examDate)}`);
  if (s.displayName) out.push(`${WEB_NAME_PREFIX}${s.displayName}`);
  return out;
}

/** Mobile 1.44: the start of the name's line ("Your name: Maya"); the sheet shows the name itself in bold. */
export const WEB_NAME_PREFIX = 'Your name: ';
/** Mobile 1.44: the small note under the lines when the file's name will be used. */
export const WEB_NAME_NOTE = 'Your name stays on this device only.';

/** What is left out, in plain words (empty when nothing is). */
export function webSkipLines(s: WebAddSummary): string[] {
  const out: string[] = [];
  if (s.tooBig) out.push('Together with the progress on this phone, this would be too large to save, so it can’t be added.');
  if (s.unmatched) {
    out.push(
      s.unmatched === 1
        ? '1 item couldn’t be matched to a question or note in this app, so it’s left out.'
        : `${s.unmatched} items couldn’t be matched to questions or notes in this app, so they’re left out.`,
    );
  }
  if (s.noDetail) {
    out.push(
      s.noDetail === 1
        ? '1 older answer was saved without whether it was right, so it can’t be added.'
        : `${s.noDetail} older answers were saved without whether they were right, so they can’t be added.`,
    );
  }
  if (s.mocksSkipped) {
    out.push(
      s.mocksSkipped === 1
        ? `1 older mock exam result isn’t added: the app keeps ${MAX_MOCKS} at most, and yours stay.`
        : `${s.mocksSkipped} older mock exam results aren’t added: the app keeps ${MAX_MOCKS} at most, and yours stay.`,
    );
  }
  if (s.examDateKept) out.push('This phone already has an exam date, so it stays as it is.');
  if (s.displayNameKept) out.push('This device already has a name, so it stays as it is.');
  if (s.future) {
    out.push(
      s.future === 1
        ? '1 item is dated in the future (the computer’s clock may be wrong), so it’s left out.'
        : `${s.future} items are dated in the future (the computer’s clock may be wrong), so they’re left out.`,
    );
  }
  return out;
}

/** Said under the lines: what the website file never holds (true whether or not this phone has them). An older file has no exam date either. */
export const WEB_NOT_IN_FILE = 'This file doesn’t include your exam date, plant or settings, so adding it doesn’t change them.';
/** The same, for a file that carries an exam date (website v12.34.1 and later). */
export const WEB_NOT_IN_FILE_DATED = 'This file doesn’t include your plant or settings, so adding it doesn’t change them.';
/** Which of the two lines fits this profile's file. */
export function webNotInFile(p: Pick<WebProfile, 'examDate'>): string {
  return p.examDate ? WEB_NOT_IN_FILE_DATED : WEB_NOT_IN_FILE;
}
