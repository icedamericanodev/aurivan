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
 * - Not brought over: the website's plant (the phone keeps its own), its
 *   settings, and the exam date (the website keeps it outside the export file).
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import { BackupError, type BackupProgress } from './backup';
import { deviceLocalOf, localSide, mergeSides, type MergeContext, type SyncedProgress } from './syncMerge';
import { capNoteText, isLiveNote, NOTE_ID_RE, NOTES_TOTAL_MAX } from './questionNotes';
import { MAX_ANSWER_MS } from './answerClock';
import { MAX_MOCKS } from './journey';
import { daysBetween } from './streak';

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
  /** Days with study ("YYYY-MM-DD"), oldest first. */
  studyDays: string[];
  /** Items that couldn't be matched to anything in the app (distinct ids). */
  unmatched: number;
  /** Older answers the website saved without their result (right or wrong), so they can't be added. */
  noDetail: number;
}

/** A clean, short display name (the website allowed 32 characters of text). */
function cleanName(x: unknown): string {
  if (typeof x !== 'string') return '';
  // Control characters and markup-looking text are dropped; the screen shows plain text only.
  return x.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 32);
}

/** Read one profile's `state` (untrusted) into the app's shapes. */
export function readWebState(state: Record<string, unknown>, known: WebKnown): Omit<WebProfile, 'key' | 'name' | 'lastActive'> {
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
    if (!isObj(e) || !isTime(e.lastAt) || !keepQ(id)) continue;
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

  // Spaced review (the same Leitner entries; an undated one is the oldest, so the phone's own wins).
  const review: Record<string, Review> = {};
  const rv = isObj(state.review) ? state.review : {};
  for (const id of keysOf(rv)) {
    const e = rv[id];
    if (!isObj(e) || !keepQ(id)) continue;
    if (Object.keys(review).length >= MAX_IDS) break;
    const box = Math.min(5, Math.max(1, Math.round(typeof e.box === 'number' && Number.isFinite(e.box) ? e.box : 1)));
    review[id] = { box, dueAt: isTime(e.dueAt) ? e.dueAt : OLDEST, lastSeen: isTime(e.lastSeen) ? e.lastSeen : OLDEST, reps: whole(e.reps) };
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
    if (!isObj(e) || !isTime(e.at) || !keepQ(id)) continue;
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
      if (!isObj(m) || typeof m.id !== 'string' || !NOTE_ID_RE.test(m.id) || !isTime(m.finishedAt) || seen.has(m.id)) continue;
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
      if (state.topicTicksSchema === 2 && known.note(id)) {
        if (out.length < MAX_IDS) out.push(id);
      } else unknownIds.add(`note:${id}`);
    }
    return out.sort();
  };
  const notesRead = ticks(state.topicReviewed);
  const notesViewed = ticks(state.topicViewed);

  // Your notes on questions (the same { text, ts }). An undated one is the oldest, so the phone's own wins.
  const qNotes: Record<string, Note> = {};
  const qn = isObj(state.qNotes) ? state.qNotes : {};
  let chars = 0;
  for (const id of keysOf(qn)) {
    const e = qn[id];
    if (!isObj(e) || typeof e.text !== 'string' || !e.text.trim() || !keepQ(id)) continue;
    const text = capNoteText(e.text);
    if (chars + text.length > NOTES_TOTAL_MAX || Object.keys(qNotes).length >= MAX_IDS) break;
    chars += text.length;
    qNotes[id] = { text, ts: isTime(e.ts) ? e.ts : OLDEST };
  }

  // Study days (the app's streak days).
  const studyDays = Array.isArray(state.studyDays) ? [...new Set(state.studyDays.slice(0, MAX_ENTRIES).filter(isDay))].sort().slice(-MAX_DAYS) : [];

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
  return { cert, studyDays, unmatched: unknownIds.size, noDetail: noDetailIds.size };
}

/** One profile from the file, or null when it isn't one (no `state` object). */
function readProfile(key: string, p: unknown, known: WebKnown): WebProfile | null {
  if (!isObj(p) || !isObj(p.state)) return null;
  const read = readWebState(p.state, known);
  return { key, name: cleanName(p.name), ...(isTime(p.lastActive) ? { lastActive: p.lastActive } : {}), ...read };
}

/** True when the parsed JSON is a website export (the marker), whatever its version. */
export function isWebExport(raw: unknown): boolean {
  return isObj(raw) && raw[WEB_MARKER] === true;
}

/**
 * Read a website export. Returns its profiles (one for a normal export; a
 * file holding several, as `profiles`, offers each). Throws WebImportError.
 * `text` is the whole file; the caller has already capped its size.
 */
export function readWebExport(text: string, known: WebKnown): WebProfile[] {
  if (text.length > WEB_MAX_BYTES) throw new WebImportError('too-big');
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    throw new WebImportError('bad-data');
  }
  if (!isObj(raw) || raw[WEB_MARKER] !== true) throw new WebImportError('bad-data');
  // The website's own versioning: a number. A newer one may hold data this app would drop.
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version)) throw new WebImportError('bad-data');
  if (!WEB_VERSIONS.includes(raw.version)) throw new WebImportError(raw.version > Math.max(...WEB_VERSIONS) ? 'newer' : 'bad-data');
  const out: WebProfile[] = [];
  if (raw.profile !== undefined) {
    const p = readProfile('profile', raw.profile, known);
    if (!p) throw new WebImportError('bad-data');
    out.push(p);
  }
  // Several profiles (the website's profile records, keyed by id, or a list).
  if (raw.profiles !== undefined) {
    const list: [string, unknown][] = Array.isArray(raw.profiles)
      ? raw.profiles.map((p, i) => [isObj(p) && typeof p.id === 'string' ? p.id : `profile-${i + 1}`, p])
      : isObj(raw.profiles)
        ? keysOf(raw.profiles, 1000).map((k) => [k, (raw.profiles as Record<string, unknown>)[k]])
        : [];
    for (const [key, p] of list.slice(0, WEB_MAX_PROFILES)) {
      const read = readProfile(String(key).slice(0, 64), p, known);
      if (read) out.push(read);
    }
    if (!out.length) throw new WebImportError('bad-data');
  }
  if (!out.length) throw new WebImportError('bad-data');
  return out;
}

/** True when a profile holds nothing the app could add. */
export function profileIsEmpty(p: WebProfile): boolean {
  return Object.keys(p.cert).length === 0 && p.studyDays.length === 0;
}

// ── The streak from study days ───────────────────────────────────────────
/** Consecutive days ending on the last one, and the longest run (no rest days: the website has none). */
export function streakFromDays(days: readonly string[], restDay?: string | null): SyncedProgress['streak'] {
  if (!days.length) return { current: 0, best: 0, lastDay: null };
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = daysBetween(days[i - 1], days[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current: run, best, lastDay: days[days.length - 1], recentDays: [...days], ...(restDay !== undefined ? { restDay } : {}) };
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
  studyDays: number;
  unmatched: number;
  noDetail: number;
  /** True when the phone already has everything this profile could add. */
  nothingNew: boolean;
}

/** What importing `p` would add to the phone's progress for `certId`. Changes nothing. */
export function webAddSummary(phone: BackupProgress, p: WebProfile, certId: string): WebAddSummary {
  const cp: Cert = phone.byCert[certId] ?? {};
  const has = (m: Record<string, unknown> | undefined, id: string) => Boolean(m && Object.prototype.hasOwnProperty.call(m, id));
  const newIds = (x: Record<string, unknown> | undefined, mine: Record<string, unknown> | undefined) => Object.keys(x ?? {}).filter((id) => !has(mine, id)).length;
  const newIn = (x: readonly string[] | undefined, mine: readonly string[] | undefined) => {
    const set = new Set(mine ?? []);
    return (x ?? []).filter((v) => !set.has(v)).length;
  };
  const answers = newIds(p.cert.answers, cp.answers);
  const updated = Object.entries(p.cert.answers ?? {}).filter(([id, a]) => has(cp.answers, id) && a.lastAt > (cp.answers?.[id]?.lastAt ?? 0)).length;
  const myNotes = cp.qNotes ?? {};
  const qNotes = Object.keys(p.cert.qNotes ?? {}).filter((id) => !isLiveNote(myNotes[id])).length;
  const mocks = newIn((p.cert.mocks ?? []).map((m) => m.id), (cp.mocks ?? []).map((m) => m.id));
  const studyDays = newIn(p.studyDays, phone.streak.recentDays ?? (phone.streak.lastDay ? [phone.streak.lastDay] : []));
  const saved = newIn(p.cert.bookmarks, cp.bookmarks);
  const notesRead = newIn(p.cert.notesRead, cp.notesRead);
  const added = answers + updated + saved + notesRead + qNotes + mocks + studyDays + newIds(p.cert.mistakes, cp.mistakes) + newIds(p.cert.review, cp.review);
  return { answers, updated, saved, notesRead, qNotes, mocks, studyDays, unmatched: p.unmatched, noDetail: p.noDetail, nothingNew: added === 0 };
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
  return out;
}

/** What is left out, in plain words (empty when nothing is). */
export function webSkipLines(s: WebAddSummary): string[] {
  const out: string[] = [];
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
  return out;
}

/** Said under the lines: what the website file never holds. */
export const WEB_NOT_IN_FILE = 'Your exam date, plant and settings aren’t in this file, so they stay as they are on this phone.';

// ── The merge ────────────────────────────────────────────────────────────
/**
 * The phone's progress with `p` merged in, for `certId`. `phone` must be the
 * phone's own progress FITTED for backup (engine/backup.ts fitForBackup).
 * Uses the sync merge (engine/syncMerge.ts), then puts the phone's
 * device-only fields (today's count, plant display choices) back.
 * Throws BackupError when the result can't pass the checker (e.g. too big).
 *
 * Safe to repeat: merging the result with the same profile again gives the
 * same progress (the merge is a union / max / later-wins on every field).
 */
export function mergeWebProgress(phone: BackupProgress, p: WebProfile, certId: string, ctx: Omit<MergeContext, 'firstSync'>): BackupProgress {
  if (!ctx.knownCertIds.includes(certId)) throw new BackupError('unknown-cert', certId);
  const mine: Cert = phone.byCert[certId] ?? {};
  // The few per-exam fields the merge takes WHOLE from the side that studied last (recent game scores,
  // where the study paths stopped) and the streak's rest day: the website has none of them, so its side
  // carries the phone's own. Whichever side "wins", the phone's values stay.
  const webCert: Cert = { ...p.cert, ...(mine.gameRecent ? { gameRecent: mine.gameRecent } : {}), ...(mine.studyPath ? { studyPath: mine.studyPath } : {}) };
  const webState = { byCert: { [certId]: webCert }, streak: streakFromDays(p.studyDays, phone.streak.restDay ?? null) };
  const local = localSide<SyncedProgress>('progress', phone, {}, ctx);
  const web = localSide<SyncedProgress>('progress', webState, {}, ctx);
  const merged = mergeSides<SyncedProgress>('progress', local, web, ctx);
  return { ...(merged.state as BackupProgress), ...(deviceLocalOf('progress', phone) as Partial<BackupProgress>) } as BackupProgress;
}
