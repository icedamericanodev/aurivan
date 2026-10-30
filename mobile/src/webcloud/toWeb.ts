/**
 * The account ↔ website mapping (accounts beta §1.3).
 *
 * Plain English for the founder:
 * - The website keeps its progress in its own saved record (one profile in
 *   `cisa_profiles_v1`). Since web v12.3 most of it uses the app's own
 *   shapes ("parity fields"), so the mapping is mostly one to one:
 *
 *     account (byCert.cisa)      website
 *     answers                    answerLog
 *     review                     review
 *     bookmarks (ids)            bookmarks (question copies from the loaded bank)
 *     mistakes                   mistakeLog
 *     mocks                      mockHistory
 *     notesRead / notesViewed    topicReviewed / topicViewed (schema 2)
 *     qNotes                     qNotes
 *     streak.recentDays          studyDays
 *
 * - `fromWeb` reads the website's record into the account's shapes (the
 *   tested reader engine/webImport.ts readWebState: untrusted input, ids
 *   checked, future dates dropped).
 * - `toWeb` writes the account's data back into the website's record. It
 *   REPLACES those fields (the account copy already holds the website's own
 *   study, merged) and leaves every other website field as it is (theme,
 *   plant, the mock in progress, the name, readinessLog …). Ids the website's
 *   loaded bank doesn't have are skipped there; the account keeps them.
 * - Mock ids round-trip: a mock made on the website is "web-…" in the
 *   account and loses that prefix on the way back; a mock made in the app
 *   keeps its id on the website, marked `origin: 'app'`, so reading it back
 *   never makes a second copy.
 * - `rebuildDerived` recomputes the website's older counters (score, ds,
 *   answeredIds, missedQuestions) from answerLog and mistakeLog, so its home
 *   screen agrees with what was synced. Counts made before web v12.3 (before
 *   answerLog existed) are kept on top, never lost.
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import type { SyncedProgress } from '../engine/syncMerge';
import { stableStringify } from '../engine/syncMerge';
import { APP_MOCK_ORIGIN, readWebState, WEB_MOCK_PREFIX, type WebKnown } from '../engine/webImport';

export type WebState = Record<string, unknown>;
type Cert = SyncedProgress['byCert'][string];
type Mock = NonNullable<Cert['mocks']>[number];

/** What the website's loaded banks can say about an id. */
export interface WebBank extends WebKnown {
  /** A copy of the loaded question, as the website keeps saved ones; null when not loaded. */
  copy(id: string): Record<string, unknown> | null;
  /** The domain key ("1"–"5") of a question id, or null. */
  domainOf(id: string): string | null;
  /** Every domain key ("1"–"5"). */
  domains: readonly string[];
}

/** The account's side of the mapping: the CISA progress and the study days. */
export interface AccountView {
  cert: Cert;
  studyDays: string[];
}

/** The website's limits (index.html PARITY_MAX_MOCKS, PARITY_MAX_STUDY_DAYS). */
export const WEB_MAX_MOCKS = 50;
export const WEB_MAX_STUDY_DAYS = 730;
/** The mapped fields toWeb replaces (everything else on the website is kept). */
export const MAPPED_WEB_FIELDS = ['answerLog', 'review', 'bookmarks', 'mistakeLog', 'mockHistory', 'topicReviewed', 'topicViewed', 'qNotes', 'studyDays'] as const;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const objOf = (x: unknown): Record<string, unknown> => (isObj(x) ? x : {});
const listOf = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const copyOf = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

// ── Reading the website ──────────────────────────────────────────────────
/**
 * The website's record → the account's shapes (only ids the bank knows).
 * `appMockIds`: mock ids this browser knows came from the app (the account
 * copy it holds), kept as they are even if the page dropped `origin`.
 */
export function fromWeb(web: WebState, known: WebKnown, now: number, appMockIds?: ReadonlySet<string>): AccountView {
  const read = readWebState(web, known, now, { appMockIds });
  return { cert: read.cert, studyDays: read.studyDays };
}

// ── Writing the website ──────────────────────────────────────────────────
/** An account mock → the website's mock: "web-" ids lose the prefix; app ids are marked. */
export function mockToWeb(m: Mock, before?: Record<string, unknown>): Record<string, unknown> {
  const fromWebsite = m.id.startsWith(WEB_MOCK_PREFIX);
  const out: Record<string, unknown> = {
    id: fromWebsite ? m.id.slice(WEB_MOCK_PREFIX.length) : m.id,
    finishedAt: m.finishedAt,
    total: m.total,
    correct: m.correct,
    minutesUsed: m.minutesUsed,
    byDomain: copyOf(m.byDomain),
  };
  if (m.timing !== undefined) out.timing = m.timing;
  if (m.minutesAllowed !== undefined) out.minutesAllowed = m.minutesAllowed;
  if (m.medianSec !== undefined) out.medianSec = m.medianSec;
  if (m.unanswered !== undefined) out.unanswered = m.unanswered;
  // The website's own "full" / "mini" label (the app tells them apart by length) stays.
  if (before && (before.type === 'full' || before.type === 'mini')) out.type = before.type;
  if (!fromWebsite) out.origin = APP_MOCK_ORIGIN;
  return out;
}

/** Note ticks: the account's ids, keeping the website's own value (true or a time) where it had one. */
function ticks(ids: readonly string[] | undefined, before: Record<string, unknown>, known: (id: string) => boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const id of ids ?? []) {
    if (!known(id)) continue;
    const v = before[id];
    out[id] = v === true || (typeof v === 'number' && Number.isFinite(v) && v > 0) ? v : true;
  }
  return out;
}

/**
 * The website's record with the account's data in the mapped fields
 * (§1.3). Every other field of `web` is kept. Then the older counters are
 * rebuilt (rebuildDerived). Returns a NEW object; `web` is untouched.
 */
export function toWeb(acct: AccountView, web: WebState, bank: WebBank): WebState {
  const cert = acct.cert;
  const q = (id: string) => bank.question(id);
  const keep = <V>(m: Record<string, V> | undefined, ok: (id: string, v: V) => boolean = (id) => q(id)) => {
    const out: Record<string, V> = {};
    for (const [id, v] of Object.entries(m ?? {})) if (ok(id, v)) out[id] = copyOf(v);
    return out;
  };

  // Saved questions: copies from the loaded bank, the website's own order first, its bookmark tags kept.
  const oldMarks = listOf(web.bookmarks).filter(isObj);
  const tagOf = new Map(oldMarks.filter((b) => typeof b.id === 'string').map((b) => [b.id as string, b.tag]));
  const wanted = new Set((cert.bookmarks ?? []).filter(q));
  const order = [...oldMarks.map((b) => b.id).filter((id): id is string => typeof id === 'string' && wanted.has(id)), ...[...wanted].filter((id) => !tagOf.has(id))];
  const bookmarks: Record<string, unknown>[] = [];
  for (const id of [...new Set(order)]) {
    const c = bank.copy(id);
    if (!c) continue;
    const tag = tagOf.get(id);
    bookmarks.push(tag === 'need-review' || tag === 'tricky-wording' || tag === 'standard-ref' ? { ...c, tag } : c);
  }

  // The mistake journal, in the website's shape (resolved always present).
  const mistakeLog: Record<string, unknown> = {};
  for (const [id, m] of Object.entries(cert.mistakes ?? {})) {
    if (!q(id)) continue;
    mistakeLog[id] = { ...copyOf(m), resolved: m.resolved === true };
  }

  // Mocks, newest first, the website's cap.
  const oldMocks = new Map(listOf(web.mockHistory).filter(isObj).filter((m) => typeof m.id === 'string').map((m) => [m.id as string, m]));
  const mockHistory = (cert.mocks ?? [])
    .map((m) => mockToWeb(m, oldMocks.get(m.id.startsWith(WEB_MOCK_PREFIX) ? m.id.slice(WEB_MOCK_PREFIX.length) : m.id)))
    .sort((a, b) => (b.finishedAt as number) - (a.finishedAt as number) || String(a.id).localeCompare(String(b.id)))
    .slice(0, WEB_MAX_MOCKS);

  // Your notes: live ones only (a deleted note is a tombstone in the account; the website just has none).
  const qNotes = keep(cert.qNotes, (id, n) => Boolean(q(id) && n.text.trim()));

  // Study days: the account's, plus older days the website kept (it keeps more of them).
  const studyDays = [...new Set([...listOf(web.studyDays).filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)), ...acct.studyDays])]
    .sort()
    .slice(-WEB_MAX_STUDY_DAYS);

  const next: WebState = {
    ...web,
    answerLog: keep(cert.answers),
    review: keep(cert.review),
    bookmarks,
    mistakeLog,
    mockHistory,
    topicReviewed: ticks(cert.notesRead, objOf(web.topicReviewed), bank.note),
    topicViewed: ticks(cert.notesViewed, objOf(web.topicViewed), bank.note),
    // The account's note ids are the website's current numbering.
    topicTicksSchema: 2,
    qNotes,
    studyDays,
  };
  return rebuildDerived(web, next, bank);
}

// ── The older counters ───────────────────────────────────────────────────
interface Tally {
  t: number;
  c: number;
}
const count = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);
function tallyOf(log: Record<string, unknown>, bank: WebBank): { all: Tally; byDomain: Record<string, Tally> } {
  const all = { t: 0, c: 0 };
  const byDomain: Record<string, Tally> = {};
  for (const [id, e] of Object.entries(log)) {
    if (!isObj(e)) continue;
    const t = count(e.attempts);
    const c = Math.min(t, count(e.correctCount));
    all.t += t;
    all.c += c;
    const d = bank.domainOf(id);
    if (!d) continue;
    const x = byDomain[d] ?? (byDomain[d] = { t: 0, c: 0 });
    x.t += t;
    x.c += c;
  }
  return { all, byDomain };
}

/**
 * The website's derived counters for `after`, from its answerLog and
 * mistakeLog, keeping what `before` counted outside answerLog (answers given
 * before web v12.3, which have no record): that part is carried over as it
 * was, and the answerLog part is recounted.
 * - score / ds: { t: answers, c: right ones }, overall and per domain;
 * - answeredIds[domain][id] = true for every answered question;
 * - missedQuestions: the open mistakes (oldest first), as bank copies, plus
 *   older misses that have no mistake entry at all.
 */
export function rebuildDerived(before: WebState, after: WebState, bank: WebBank): WebState {
  const oldTally = tallyOf(objOf(before.answerLog), bank);
  const newTally = tallyOf(objOf(after.answerLog), bank);
  const extra = (have: unknown, counted: Tally): Tally => {
    const h = objOf(have);
    const t = Math.max(0, count(h.t) - counted.t);
    return { t, c: Math.min(t, Math.max(0, count(h.c) - counted.c)) };
  };
  const plus = (a: Tally, b: Tally): Tally => ({ t: a.t + b.t, c: Math.min(a.t + b.t, a.c + b.c) });

  const score = plus(extra(before.score, oldTally.all), newTally.all);
  const oldDs = objOf(before.ds);
  const ds: Record<string, Tally> = {};
  for (const d of bank.domains) ds[d] = plus(extra(oldDs[d], oldTally.byDomain[d] ?? { t: 0, c: 0 }), newTally.byDomain[d] ?? { t: 0, c: 0 });

  const oldIds = objOf(before.answeredIds);
  const answeredIds: Record<string, Record<string, true>> = {};
  for (const k of Object.keys(oldIds)) {
    const m: Record<string, true> = {};
    for (const [id, v] of Object.entries(objOf(oldIds[k]))) if (v === true) m[id] = true;
    answeredIds[k] = m;
  }
  for (const d of bank.domains) answeredIds[d] = answeredIds[d] ?? {};
  for (const id of Object.keys(objOf(after.answerLog))) {
    const d = bank.domainOf(id);
    if (d) (answeredIds[d] ?? (answeredIds[d] = {}))[id] = true;
  }

  const mistakes = objOf(after.mistakeLog);
  const legacy = listOf(before.missedQuestions).filter((m): m is Record<string, unknown> => isObj(m) && typeof m.id === 'string' && !(m.id in mistakes) && bank.question(m.id as string));
  const open = Object.entries(mistakes)
    .filter(([, m]) => isObj(m) && m.resolved !== true)
    .sort(([a, x], [b, y]) => count(objOf(x).at) - count(objOf(y).at) || a.localeCompare(b))
    .map(([id]) => id);
  const missedQuestions: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const id of [...legacy.map((m) => m.id as string), ...open]) {
    if (seen.has(id)) continue;
    const c = bank.copy(id);
    if (!c) continue;
    seen.add(id);
    missedQuestions.push(c);
  }
  return { ...after, score, ds, answeredIds, missedQuestions };
}

// ── What the website changed since the last sync ─────────────────────────
/** A mock compared without the website-only fields. */
const mockKey = (m: Record<string, unknown>) => stableStringify({ ...m, origin: undefined, type: undefined });

/**
 * Only the mapped entries of `web` that differ from `projected` (=
 * toWeb(the account copy this browser holds)): the study done on the
 * website since then. Reading only these back means a field the website
 * can't hold (an app-only field of a mock, an id its bank doesn't have)
 * never looks like a change, so nothing is pushed for nothing.
 */
export function webChanges(web: WebState, projected: WebState): WebState {
  const diffMap = (k: string) => {
    const a = objOf(web[k]);
    const b = objOf(projected[k]);
    const out: Record<string, unknown> = {};
    for (const [id, v] of Object.entries(a)) if (!(id in b) || stableStringify(v) !== stableStringify(b[id])) out[id] = v;
    return out;
  };
  const tickDiff = (k: string) => {
    const a = objOf(web[k]);
    const b = objOf(projected[k]);
    const out: Record<string, unknown> = {};
    for (const [id, v] of Object.entries(a)) if (!(id in b)) out[id] = v;
    return out;
  };
  const projMarks = new Set(listOf(projected.bookmarks).filter(isObj).map((b) => b.id));
  const projMocks = new Map(listOf(projected.mockHistory).filter(isObj).map((m) => [m.id, mockKey(m)]));
  const projDays = new Set(listOf(projected.studyDays));
  return {
    answerLog: diffMap('answerLog'),
    review: diffMap('review'),
    mistakeLog: diffMap('mistakeLog'),
    qNotes: diffMap('qNotes'),
    topicReviewed: tickDiff('topicReviewed'),
    topicViewed: tickDiff('topicViewed'),
    topicTicksSchema: web.topicTicksSchema,
    bookmarks: listOf(web.bookmarks).filter((b) => isObj(b) && !projMarks.has(b.id)),
    mockHistory: listOf(web.mockHistory).filter((m) => isObj(m) && projMocks.get(m.id) !== mockKey(m)),
    studyDays: listOf(web.studyDays).filter((d) => !projDays.has(d)),
  };
}

/** True when webChanges found nothing. */
export function noChanges(c: WebState): boolean {
  return (
    ['answerLog', 'review', 'mistakeLog', 'qNotes', 'topicReviewed', 'topicViewed'].every((k) => Object.keys(objOf(c[k])).length === 0) &&
    ['bookmarks', 'mockHistory', 'studyDays'].every((k) => listOf(c[k]).length === 0)
  );
}
