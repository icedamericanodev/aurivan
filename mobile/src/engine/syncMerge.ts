/**
 * Sync merge (Uplift Phase 7, built OFF; spec PHASE6_8.md §3.4).
 *
 * Two phones study on their own; when they sync, BOTH histories end up
 * together and nothing the learner earned is lost. This file is the rule
 * book for "together". It is pure: no React, no storage, no network.
 *
 * Plain English:
 * - Each store (settings, progress) syncs as one snapshot: the store's data
 *   WITHOUT the device-local fields (below), plus `changedAt`, a small map of
 *   "when was this choice last changed" stamps.
 * - Merging never picks a whole side. Lists of things done are UNIONED
 *   (answers, lessons, notes read, badges, bookmarks, mocks, reports), counts
 *   take the MAX, first times take the EARLIEST, and single choices (exam,
 *   exam date, study defaults, the plant's name and look) go to the side that
 *   changed them LAST.
 * - Ties are broken by VALUE (the larger JSON), never by which side is "this
 *   phone", so merge(a, b) and merge(b, a) are the same. That is what lets
 *   two phones agree without a server deciding anything.
 * - Any time more than a day in the future (a phone whose clock is wrong) is
 *   pulled back to now before merging, so a wrong clock can't win forever.
 * - The result goes through the backup checker (fit, then the strict
 *   readStores), and badges and the plant keep only what the merged data
 *   supports.
 *
 * Known limits (documented in "What syncs" and ARCHITECTURE):
 * - attempts take the max: two phones answering the same question offline
 *   under-count attempts, never inflate them;
 * - no deletions travel: a bookmark removed on one phone can come back from
 *   another, and progress reset on one phone comes back from another device
 *   that still has it (with only one phone syncing, the reset is simply sent
 *   to the account); tombstones are a later step. The one exception is
 *   "Your note" on a question: a deleted note is kept as `{ text: '', ts }`,
 *   so the newer deletion wins over an older copy (engine/questionNotes.ts);
 * - set-like lists are kept in a canonical (sorted) order, so two phones
 *   converge on the same bytes instead of swapping orders forever.
 */
import { BackupError, fitForBackup, hasProtoKey, readStores, utf8Bytes, type BackupProgress, type BackupSettings } from './backup';
import { LOG_KEEP_DAYS } from './examReady';
import { cleanDays, cleanDone } from './examWeek';
import { GAME_TIERS } from './games/growth';
import { MAX_MOCKS } from './journey';
import { LONG_IDS_CAP } from './milestones';
import { MAX_KEPT } from './plant';
import { isLiveNote, mergeNote } from './questionNotes';
import { PROGRESS_VERSION, SETTINGS_VERSION } from './saveMigrations';
import { dayKey, daysBetween } from './streak';
import { MAX_REPORTS } from './support';

export type SyncStoreName = 'settings' | 'progress';
/** "When was this last changed" (epoch ms) per field: `activeCertId`, `examDates.cisa`, `plant.cisa`. */
export type Stamps = Record<string, number>;

/** One store as it syncs: the shared data and its stamps. */
export interface Side<T> {
  state: T;
  stamps: Stamps;
}
export type SyncedSettings = Omit<BackupSettings, DeviceLocalSetting>;
export type SyncedProgress = Omit<BackupProgress, DeviceLocalProgress>;

// ── What syncs, and what stays on this phone ─────────────────────────────
/** Settings that sync. Each is last-writer-wins by its stamp, except the two noted. */
export const SYNCED_SETTINGS = [
  'activeCertId',
  'examDates', // per exam: `examDates.<cert>`
  'shuffleOptions',
  'dailyGoal',
  'gameRulesSeen', // union
  'practiceTimer',
  'paceOffer',
  'studyMode',
  'studyDomain',
  'studySize',
  'badgesHidden',
  'familiarity',
  'dailyMinutes',
  'examFocused',
  'fitPrompt',
] as const;
/**
 * Settings that never leave the phone: reminders, theme, motion and haptics
 * belong to the device; `onboarded` is this install's; the fit card's local
 * counters (`fitChanges`, `fitAskDays`) are "never sent anywhere" by design;
 * `displayName` (mobile 1.23, what the learner asked to be called) is "only on this phone".
 */
export const DEVICE_LOCAL_SETTINGS = ['onboarded', 'theme', 'motion', 'reminder', 'haptics', 'fitChanges', 'fitAskDays', 'displayName'] as const;
type DeviceLocalSetting = (typeof DEVICE_LOCAL_SETTINGS)[number];
/** Progress that never leaves the phone: today's count and plans, and the plant display choices. */
export const DEVICE_LOCAL_PROGRESS = ['today', 'days', 'plantSettings'] as const;
type DeviceLocalProgress = (typeof DEVICE_LOCAL_PROGRESS)[number];

/**
 * The biggest settings snapshot (UTF-8 bytes), on the server and here
 * (security review P7 S2): real settings are a few hundred bytes, so 64 KB
 * is generous, and it keeps a scripted account from parking 2 MB there.
 */
export const MAX_SETTINGS_BYTES = 65_536;
/** The stamp keys a snapshot may carry (and the most of them). */
export const MAX_STAMPS = 120;
/** A time further ahead than this is a wrong clock: pulled back to now before merging. */
export const FUTURE_SLACK_MS = 24 * 3_600_000;
/** The most recent study days kept in the merged streak. */
const MAX_RECENT_DAYS = 200;
/** The most game-rule cards remembered as seen (the checker's cap). */
const MAX_RULES_SEEN = 50;
/** Celebrations waiting (the checker's cap). */
const MAX_QUEUE = 50;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

// ── Canonical text, hashing ──────────────────────────────────────────────
/** JSON with object keys sorted at every level: equal data gives equal text. */
export function stableStringify(x: unknown): string {
  if (x === undefined) return '';
  if (x === null || typeof x !== 'object') return JSON.stringify(x);
  if (Array.isArray(x)) return `[${x.map((v) => (v === undefined ? 'null' : stableStringify(v))).join(',')}]`;
  const o = x as Record<string, unknown>;
  const keys = Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
}

/** FNV-1a (32-bit) of a text, as 8 hex digits, plus its length: a cheap "did this change". */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, '0')}:${text.length}`;
}

/** The value order every tie uses: larger canonical JSON wins (never "which side"). */
const cmpText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
/** Compare keys made of numbers and texts, left to right. */
function cmpKey(a: (number | string)[], b: (number | string)[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x < y ? -1 : 1;
    return cmpText(String(x ?? ''), String(y ?? ''));
  }
  return 0;
}
/** The side with the larger key (a total order, so the pick never depends on argument order). */
function pick<T>(a: T, b: T, key: (v: T) => (number | string)[]): T {
  return cmpKey(key(a), key(b)) >= 0 ? a : b;
}

const max = (a: number | undefined, b: number | undefined) => (a === undefined ? b : b === undefined ? a : Math.max(a, b));
const min = (a: number | undefined, b: number | undefined) => (a === undefined ? b : b === undefined ? a : Math.min(a, b));
const maxDay = (a: string | undefined | null, b: string | undefined | null) => (!a ? b ?? undefined : !b ? a : a > b ? a : b);
const minDay = (a: string | undefined | null, b: string | undefined | null) => (!a ? b ?? undefined : !b ? a : a < b ? a : b);
/** Union of two id lists, sorted (a canonical order both phones agree on). */
const unionSorted = (a: readonly string[] | undefined, b: readonly string[] | undefined) =>
  [...new Set([...(a ?? []), ...(b ?? [])])].sort(cmpText);
/** Drop undefined values (JSON does the same), so results compare cleanly. */
function clean<T extends object>(o: T): T {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as T;
}
/** Merge two maps key by key; a key on one side only is kept as it is. */
function mergeMap<V>(a: Record<string, V> | undefined, b: Record<string, V> | undefined, both: (x: V, y: V) => V): Record<string, V> | undefined {
  if (!a && !b) return undefined;
  const out: Record<string, V> = {};
  for (const k of unionSorted(Object.keys(a ?? {}), Object.keys(b ?? {}))) {
    const x = a?.[k];
    const y = b?.[k];
    out[k] = x !== undefined && y !== undefined ? both(x, y) : ((x ?? y) as V);
  }
  return out;
}

// ── Stamps ───────────────────────────────────────────────────────────────
/**
 * A snapshot's `changedAt`, checked: at most MAX_STAMPS keys, each a short
 * plain key with a time between 2000 and 2100. Anything else is dropped
 * (a missing stamp only means "older": the other side's choice wins).
 */
export function readStamps(raw: unknown): Stamps {
  if (!isObj(raw)) return {};
  const out: Stamps = {};
  const lo = Date.UTC(2000, 0, 1);
  const hi = Date.UTC(2100, 11, 31);
  for (const k of Object.keys(raw).slice(0, MAX_STAMPS)) {
    const v = raw[k];
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if (!/^[A-Za-z0-9_.:-]{1,120}$/.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi) out[k] = v;
  }
  return out;
}

/** Two stamp maps together: the later time per key. */
export const mergeStamps = (a: Stamps, b: Stamps): Stamps => {
  const out: Stamps = {};
  for (const k of unionSorted(Object.keys(a), Object.keys(b)).slice(0, MAX_STAMPS)) {
    const v = max(a[k], b[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
};

// ── Wrong clocks ─────────────────────────────────────────────────────────
/** Stamps more than a day ahead dropped: "changed at an unknown time", which loses to any real change. */
export function dropFutureStamps(stamps: Stamps, now: number): Stamps {
  const limit = now + FUTURE_SLACK_MS;
  return Object.fromEntries(Object.entries(stamps).filter(([, v]) => v <= limit));
}

/**
 * A copy of a store side with every time more than a day ahead (a phone
 * whose clock is wrong) pulled back to `now`, and every such STAMP dropped.
 * A stamp only decides who changed a choice last: pulled back to now it
 * would beat a real change made just before this sync, so it counts as 0
 * instead (like a missing stamp). The phone with the wrong clock still keeps
 * its own choice while its clock is wrong; once it is right, a later real
 * change wins everywhere.
 */
export function clampFuture<T>(store: SyncStoreName, side: Side<T>, now: number): Side<T> {
  const limit = now + FUTURE_SLACK_MS;
  const today = dayKey(now);
  const lastDay = dayKey(limit);
  const t = (v: unknown) => (typeof v === 'number' && v > limit ? now : v);
  const d = (v: unknown) => (typeof v === 'string' && v > lastDay ? today : v);
  const times = <V>(m: Record<string, V> | undefined) => (m ? Object.fromEntries(Object.entries(m).map(([k, v]) => [k, t(v)])) : m);
  const days = <V>(m: Record<string, V> | undefined) => (m ? Object.fromEntries(Object.entries(m).map(([k, v]) => [k, d(v)])) : m);
  const stamps = dropFutureStamps(side.stamps, now);
  if (store === 'settings') return { state: side.state, stamps };
  const p = JSON.parse(JSON.stringify(side.state)) as SyncedProgress;
  for (const cp of Object.values(p.byCert)) {
    for (const a of Object.values(cp.answers ?? {})) a.lastAt = t(a.lastAt) as number;
    for (const r of Object.values(cp.review ?? {})) r.lastSeen = t(r.lastSeen) as number;
    for (const r of Object.values(cp.cards ?? {})) r.lastSeen = t(r.lastSeen) as number;
    for (const m of Object.values(cp.mistakes ?? {})) m.at = t(m.at) as number;
    for (const m of cp.mocks ?? []) m.finishedAt = t(m.finishedAt) as number;
    // A note edited "in the future" would win every later edit: pulled back to now.
    for (const n of Object.values(cp.qNotes ?? {})) n.ts = t(n.ts) as number;
    for (const m of Object.values(cp.mastery ?? {})) {
      m.firstDay = d(m.firstDay) as string;
      if (m.firstAt !== undefined) m.firstAt = t(m.firstAt) as number;
      if (m.masteredAt !== undefined) m.masteredAt = d(m.masteredAt) as string;
    }
    const ms = cp.milestones;
    if (ms) {
      ms.earned = times(ms.earned) as Record<string, number>;
      if (ms.planters) ms.planters = times(ms.planters) as Record<string, number>;
      if (ms.backfill) ms.backfill.at = t(ms.backfill.at) as number;
      if (ms.catalogFill) ms.catalogFill.at = t(ms.catalogFill.at) as number;
      if (ms.lastDay) ms.lastDay = d(ms.lastDay) as string;
      if (ms.returnedOn) ms.returnedOn = d(ms.returnedOn) as string;
      if (ms.gameMisses) ms.gameMisses = days(ms.gameMisses) as Record<string, string>;
      if (ms.cardMisses) ms.cardMisses = days(ms.cardMisses) as Record<string, string>;
    }
    const mo = cp.moments;
    if (mo) {
      if (mo.readySeenAt !== undefined) mo.readySeenAt = t(mo.readySeenAt) as number;
      if (mo.readiness) mo.readiness = mo.readiness.map((r) => ({ ...r, day: d(r.day) as string }));
    }
    const pl = cp.plant;
    if (pl) {
      pl.plantedAt = t(pl.plantedAt) as number;
      if (pl.replantedAt !== undefined) pl.replantedAt = t(pl.replantedAt) as number;
      if (pl.reached) pl.reached = times(pl.reached) as typeof pl.reached;
      if (pl.backfill) pl.backfill.at = t(pl.backfill.at) as number;
      // A day key too (CR N10): a future "passed on" day would otherwise win maxDay forever.
      if (pl.passedOn) pl.passedOn = d(pl.passedOn) as string;
    }
  }
  const s = p.streak;
  s.lastDay = (d(s.lastDay) as string | null) ?? null;
  if (s.restDay) s.restDay = d(s.restDay) as string;
  if (s.recentDays) s.recentDays = s.recentDays.map((x) => d(x) as string);
  if (p.reports) p.reports = p.reports.map((r) => ({ ...r, at: t(r.at) as number }));
  return { state: p as unknown as T, stamps };
}

// ── Settings ─────────────────────────────────────────────────────────────
/** One last-writer-wins field: the value from the side with the later stamp (ties by value). */
function lww<V>(ka: string, av: V | undefined, as: Stamps, bv: V | undefined, bs: Stamps): V | undefined {
  const a = { v: av, at: as[ka] ?? 0 };
  const b = { v: bv, at: bs[ka] ?? 0 };
  return pick(a, b, (x) => [x.at, stableStringify(x.v)]).v;
}

function mergeSettingsRaw(a: Side<SyncedSettings>, b: Side<SyncedSettings>): Side<SyncedSettings> {
  const out: Record<string, unknown> = {};
  const A = a.state as Record<string, unknown>;
  const B = b.state as Record<string, unknown>;
  for (const f of SYNCED_SETTINGS) {
    if (f === 'examDates') {
      const certs = unionSorted(Object.keys(a.state.examDates ?? {}), Object.keys(b.state.examDates ?? {}));
      const dates: Record<string, string> = {};
      for (const c of certs) {
        const v = lww(`examDates.${c}`, a.state.examDates?.[c], a.stamps, b.state.examDates?.[c], b.stamps);
        if (v !== undefined) dates[c] = v;
      }
      if (a.state.examDates || b.state.examDates) out.examDates = dates;
    } else if (f === 'gameRulesSeen') {
      if (a.state.gameRulesSeen || b.state.gameRulesSeen) out.gameRulesSeen = unionSorted(a.state.gameRulesSeen, b.state.gameRulesSeen).slice(0, MAX_RULES_SEEN);
    } else {
      out[f] = lww(f, A[f], a.stamps, B[f], b.stamps);
    }
  }
  return { state: clean(out) as SyncedSettings, stamps: mergeStamps(a.stamps, b.stamps) };
}

// ── Progress ─────────────────────────────────────────────────────────────
type Cert = SyncedProgress['byCert'][string];
type Answer = NonNullable<Cert['answers']>[string];
type Mistake = NonNullable<Cert['mistakes']>[string];
type Milestones = NonNullable<Cert['milestones']>;
type Plant = NonNullable<Cert['plant']>;
type Mock = NonNullable<Cert['mocks']>[number];
type Report = NonNullable<SyncedProgress['reports']>[number];
type Streak = SyncedProgress['streak'];
type ReadinessDay = NonNullable<NonNullable<Cert['moments']>['readiness']>[number];

/** The latest moment anything happened in this exam's study (answers, mocks, reviews, cards). */
export function activityAt(cp: Cert): number {
  let at = 0;
  for (const a of Object.values(cp.answers ?? {})) at = Math.max(at, a.lastAt);
  for (const m of cp.mocks ?? []) at = Math.max(at, m.finishedAt);
  for (const r of Object.values(cp.review ?? {})) at = Math.max(at, r.lastSeen);
  for (const r of Object.values(cp.cards ?? {})) at = Math.max(at, r.lastSeen);
  return at;
}

/** attempts and correct take the max (never inflated); the "last answer" fields come from the later answer. */
function mergeAnswer(a: Answer, b: Answer): Answer {
  const lastOf = (x: Answer) => clean({ lastCorrect: x.lastCorrect, lastAt: x.lastAt, lastAssisted: x.lastAssisted, lastRetest: x.lastRetest, lastGame: x.lastGame, ms: x.ms, lastConfidence: x.lastConfidence });
  const last = pick(a, b, (x) => [x.lastAt, stableStringify(lastOf(x))]);
  const attempts = Math.max(a.attempts, b.attempts);
  return clean({ ...lastOf(last), attempts, correctCount: Math.min(attempts, Math.max(a.correctCount, b.correctCount)) }) as Answer;
}

/**
 * The later mistake wins; at the same moment, "fixed" from either side
 * counts. A slip tag the learner gave on either phone is kept (the larger
 * value when both tagged it), so a tagged slip never disappears (Slip
 * Spotter counts them).
 */
function mergeMistake(a: Mistake, b: Mistake): Mistake {
  const base = (x: Mistake) => clean({ ...x, slip: undefined, resolved: undefined, fixedLater: undefined });
  const w = pick(a, b, (x) => [x.at, stableStringify(base(x))]);
  const slip = a.slip && b.slip ? (a.slip > b.slip ? a.slip : b.slip) : (a.slip ?? b.slip);
  if (a.at !== b.at) return clean({ ...base(w), slip, resolved: w.resolved, fixedLater: w.fixedLater }) as Mistake;
  return clean({ ...base(w), slip, resolved: a.resolved || b.resolved || undefined, fixedLater: a.fixedLater || b.fixedLater || undefined }) as Mistake;
}

function mergeMocks(a: Mock[] | undefined, b: Mock[] | undefined): Mock[] | undefined {
  if (!a && !b) return undefined;
  const byId = new Map<string, Mock>();
  for (const m of [...(a ?? []), ...(b ?? [])]) {
    const had = byId.get(m.id);
    byId.set(m.id, had ? pick(had, m, (x) => [x.finishedAt, stableStringify(x)]) : m);
  }
  return [...byId.values()].sort((x, y) => y.finishedAt - x.finishedAt || cmpText(x.id, y.id)).slice(0, MAX_MOCKS);
}

/**
 * The readiness log, by day. The same day on two phones keeps the higher
 * reading of each (each phone worked it out from real answers, and the
 * plant's "ready" growth must never be taken away by a merge).
 */
function mergeReadiness(a: ReadinessDay[] | undefined, b: ReadinessDay[] | undefined): ReadinessDay[] | undefined {
  if (!a && !b) return undefined;
  const higher = (x: number | null, y: number | null) => (x === null ? y : y === null ? x : Math.max(x, y));
  const byDay = new Map<string, ReadinessDay>();
  for (const e of [...(a ?? []), ...(b ?? [])]) {
    const had = byDay.get(e.day);
    byDay.set(e.day, had ? { day: e.day, min: higher(had.min, e.min), last: higher(had.last, e.last) } : e);
  }
  const out = [...byDay.values()].sort((x, y) => cmpText(x.day, y.day));
  if (!out.length) return out;
  const newest = out[out.length - 1].day;
  return out.filter((e) => daysBetween(e.day, newest) < LOG_KEEP_DAYS);
}

function mergeMilestones(a: Milestones | undefined, b: Milestones | undefined): Milestones | undefined {
  if (!a || !b) return a ?? b;
  const earned = mergeMap(a.earned, b.earned, Math.min) ?? {};
  // A mark waiting on one phone but already celebrated on the other is not shown again.
  const seenOn = (m: Milestones, k: string) => m.earned[k] !== undefined && !(m.queue ?? []).includes(k);
  const queue = unionSorted(a.queue, b.queue)
    .filter((k) => earned[k] !== undefined && !seenOn(a, k) && !seenOn(b, k))
    .sort((x, y) => earned[x] - earned[y] || cmpText(x, y))
    .slice(0, MAX_QUEUE);
  // Rolling windows: the one with more history (each badge that reads a
  // window needs it to be long enough, so a merge never shortens one).
  const windowOf = <W>(x: W[] | undefined, y: W[] | undefined) => (!x || !y ? x ?? y : pick(x, y, (v) => [v.length, stableStringify(v)]));
  const working = clean({
    sure: windowOf(a.sure, b.sure),
    myths: windowOf(a.myths, b.myths),
    signposts: windowOf(a.signposts, b.signposts),
    // Long Memory's counted questions: a set, so both phones' (each counts once).
    longIds: a.longIds || b.longIds ? unionSorted(a.longIds, b.longIds).slice(0, LONG_IDS_CAP) : undefined,
    // Misses waiting to be fixed: both phones', the later day for one missed on both.
    gameMisses: mergeMap(a.gameMisses, b.gameMisses, (x, y) => maxDay(x, y)!),
    cardMisses: mergeMap(a.cardMisses, b.cardMisses, (x, y) => maxDay(x, y)!),
  });
  const flagged = <X extends { at: number; seen?: boolean }>(x: X | undefined, y: X | undefined) => {
    if (!x || !y) return x ?? y;
    const base = (v: X) => clean({ ...v, seen: undefined });
    const p = pick(x, y, (v) => [stableStringify(base(v))]);
    return clean({ ...base(p), seen: x.seen || y.seen || undefined }) as X;
  };
  const counts = mergeMap(a.counts as Record<string, number> | undefined, b.counts as Record<string, number> | undefined, Math.max);
  return clean({
    earned,
    queue: a.queue || b.queue ? queue : undefined,
    backfill: flagged(a.backfill, b.backfill),
    counts,
    ...working,
    days: max(a.days, b.days),
    lastDay: maxDay(a.lastDay, b.lastDay),
    returnedOn: maxDay(a.returnedOn, b.returnedOn),
    planters: mergeMap(a.planters, b.planters, Math.min),
    catalog: max(a.catalog, b.catalog),
    catalogFill: flagged(a.catalogFill, b.catalogFill),
  }) as Milestones;
}

/**
 * The plant (Phase 7 review, lead decision on CR N9: like a restore, a sync
 * never makes a learner re-plant or lose growth).
 *
 * Two DIFFERENT plants (each phone planted its own, or one was reset):
 * - on the FIRST sync's Combine (`firstSync`), the plant that has grown
 *   more is kept (then as below). That choice is stamped (`plantId.<cert>`)
 *   so every later sync keeps it, even with a phone that still holds the
 *   other plant;
 * - otherwise the plant with the later `plantId.<cert>` stamp is kept, and
 *   with none, the one planted EARLIER (for a reset one, its replant time
 *   counts): the learner's older plant stays;
 * - either way the kept plant takes the HIGHER growth of the two (and the
 *   earliest time each growth was reached): the merged progress supports
 *   it, so no growth is lost.
 * A reset plant can therefore come back from another device, like the reset
 * progress it grew from (removals don't sync).
 *
 * The same plant: the name and look come from the side that edited them
 * last (stamp `plant.<cert>`), growth is the highest, each growth time the
 * earliest. Unlocks carried across a Reset (`kept`) are unioned. The checker
 * then clamps growth to what the merged data supports.
 *
 * Outside the first sync the keys depend only on the plant's identity and
 * its own stamp (which travels with it), so the merge stays associative.
 */
function mergePlant(certId: string, a: Plant | undefined, as: Stamps, b: Plant | undefined, bs: Stamps, firstSync = false): Plant | undefined {
  if (!a || !b) return a ?? b;
  const identity = (p: Plant) => clean({ species: p.species, plantedAt: p.plantedAt, replantedAt: p.replantedAt });
  const chosen = `plantId.${certId}`;
  // Larger key wins: (more growth, first sync only), the later choice stamp, then the EARLIER planting.
  const idKey = (x: { p: Plant; st: Stamps }) => [...(firstSync ? [x.p.growth] : []), x.st[chosen] ?? 0, -(x.p.replantedAt ?? x.p.plantedAt), stableStringify(identity(x.p))];
  const kept = a.kept || b.kept ? unionSorted(a.kept, b.kept).slice(0, MAX_KEPT) : undefined;
  const reached = mergeMap(a.reached as Record<string, number> | undefined, b.reached as Record<string, number> | undefined, Math.min) as Plant['reached'];
  if (stableStringify(identity(a)) !== stableStringify(identity(b))) {
    const w = pick({ p: a, st: as }, { p: b, st: bs }, idKey).p;
    return clean({ ...w, growth: Math.max(a.growth, b.growth) as Plant['growth'], reached, kept });
  }
  const key = `plant.${certId}`;
  const face = (p: Plant) => clean({ name: p.name, look: p.look });
  const f = pick({ p: a, at: as[key] ?? 0 }, { p: b, at: bs[key] ?? 0 }, (x) => [x.at, stableStringify(face(x.p))]).p;
  const flaggedBackfill = (() => {
    if (!a.backfill || !b.backfill) return a.backfill ?? b.backfill;
    const base = (v: NonNullable<Plant['backfill']>) => clean({ ...v, seen: undefined });
    const p = pick(a.backfill, b.backfill, (v) => [stableStringify(base(v))]);
    return clean({ ...base(p), seen: a.backfill.seen || b.backfill.seen || undefined });
  })();
  return clean({
    ...identity(a),
    name: f.name,
    look: f.look,
    growth: Math.max(a.growth, b.growth) as Plant['growth'],
    reached,
    pending: max(a.pending, b.pending) as Plant['pending'],
    backfill: flaggedBackfill,
    kept,
    passedOn: maxDay(a.passedOn, b.passedOn),
  }) as Plant;
}

type Growth = NonNullable<NonNullable<Cert['gameGrowth']>[string]>;
/**
 * A game's level: the higher level reached (with its own step counts), the
 * longer skill-step history (Snare-wise reads it), and the longer "well
 * done" run. Never a level lower than either phone had.
 */
function mergeGrowth(a: Growth, b: Growth): Growth {
  const rank = (g: Growth) => GAME_TIERS.indexOf(g.tier);
  const lvl = pick(a, b, (g) => [rank(g), g.up, -g.down, stableStringify(g)]);
  const hits = !a.hits || !b.hits ? a.hits ?? b.hits : pick(a.hits, b.hits, (h) => [h.length, stableStringify(h)]);
  return clean({ tier: lvl.tier, up: lvl.up, down: lvl.down, hits, run: max(a.run, b.run) }) as Growth;
}

function mergeCert(certId: string, a: Cert, as: Stamps, b: Cert, bs: Stamps, firstSync: boolean): Cert {
  // Game recaps and where the study paths stopped: whole, from the side that studied last.
  const working = (cp: Cert) => clean({ gameRecent: cp.gameRecent, studyPath: cp.studyPath });
  const w = pick(a, b, (cp) => [activityAt(cp), stableStringify(working(cp))]);
  const later = <X>(x: X | undefined, y: X | undefined, at: (v: X) => number) => (x === undefined || y === undefined ? x ?? y : pick(x, y, (v) => [at(v), stableStringify(v)]));
  const moments = (() => {
    const x = a.moments;
    const y = b.moments;
    if (!x || !y) return x ?? y;
    const ew = (() => {
      const p = x.examWeek;
      const q = y.examWeek;
      if (!p || !q) return p ?? q;
      if (p.for !== q.for) return p.for > q.for ? p : q;
      // Final review week: a day marked done on either phone stays done (a union, like the ticks).
      const days = cleanDays([...(p.days ?? []), ...(q.days ?? [])]);
      return clean({ for: p.for, done: cleanDone([...p.done, ...q.done]), hidden: p.hidden || q.hidden || undefined, days: days.length ? days : undefined });
    })();
    return clean({ readiness: mergeReadiness(x.readiness, y.readiness), readySeenAt: max(x.readySeenAt, y.readySeenAt), examWeek: ew });
  })();
  const union = (x: string[] | undefined, y: string[] | undefined) => (x || y ? unionSorted(x, y) : undefined);
  return clean({
    answers: mergeMap(a.answers, b.answers, mergeAnswer),
    review: mergeMap(a.review, b.review, (x, y) => later(x, y, (v) => v.lastSeen)!),
    bookmarks: union(a.bookmarks, b.bookmarks),
    mocks: mergeMocks(a.mocks, b.mocks),
    lessonsDone: union(a.lessonsDone, b.lessonsDone),
    mistakes: mergeMap(a.mistakes, b.mistakes, mergeMistake),
    gameBest: mergeMap(a.gameBest as Record<string, number> | undefined, b.gameBest as Record<string, number> | undefined, Math.max),
    ...working(w),
    gameGrowth: mergeMap(a.gameGrowth as Record<string, Growth> | undefined, b.gameGrowth as Record<string, Growth> | undefined, mergeGrowth) as Cert['gameGrowth'],
    notesRead: union(a.notesRead, b.notesRead),
    // Mobile 1.25: a note started on either phone is started (never cleared, so a union).
    notesViewed: union(a.notesViewed, b.notesViewed),
    // Mobile 1.25: notes ever read only goes up, so the higher count wins.
    notesEverRead: max(a.notesEverRead, b.notesEverRead),
    moments,
    mastery: mergeMap(a.mastery, b.mastery, (x, y) =>
      clean({ firstDay: minDay(x.firstDay, y.firstDay)!, firstAt: min(x.firstAt, y.firstAt), masteredAt: minDay(x.masteredAt, y.masteredAt) }),
    ),
    cards: mergeMap(a.cards, b.cards, (x, y) => later(x, y, (v) => v.lastSeen)!),
    milestones: mergeMilestones(a.milestones, b.milestones),
    plant: mergePlant(certId, a.plant, as, b.plant, bs, firstSync),
    // "Your note": per question, the newer edit wins, a deletion (tombstone) included.
    qNotes: mergeMap(a.qNotes, b.qNotes, mergeNote),
  }) as Cert;
}

/** Consecutive study days in `days` ending on `last`. */
function runEndingOn(days: ReadonlySet<string>, last: string): number {
  let n = 0;
  let d = last;
  while (days.has(d)) {
    n++;
    const [y, m, dd] = d.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 1, dd - 1));
    d = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`;
  }
  return n;
}

/**
 * The streak: study days unioned; the best is the max; the current streak is
 * the longest of: each side's own (if it studied on the merged last day), and
 * the run of merged study days ending that day (two phones on alternate days
 * make one streak). The rest day comes from the side that studied last.
 */
function mergeStreak(a: Streak, b: Streak): Streak {
  const lastDay = maxDay(a.lastDay, b.lastDay) ?? null;
  const recent = unionSorted(a.recentDays ?? (a.lastDay ? [a.lastDay] : []), b.recentDays ?? (b.lastDay ? [b.lastDay] : [])).slice(-MAX_RECENT_DAYS);
  let current = 0;
  if (lastDay) {
    if (a.lastDay === lastDay) current = Math.max(current, a.current);
    if (b.lastDay === lastDay) current = Math.max(current, b.current);
    current = Math.max(current, runEndingOn(new Set(recent), lastDay));
  }
  const rest = pick(a, b, (s) => [s.lastDay ?? '', stableStringify(s.restDay ?? null)]).restDay;
  return clean({ current, best: Math.max(a.best, b.best, current), lastDay, restDay: rest, recentDays: a.recentDays || b.recentDays ? recent : undefined });
}

/** Your reports: one per ref, newest first; "your report helped" seen on either phone counts. */
function mergeReports(a: Report[] | undefined, b: Report[] | undefined): Report[] | undefined {
  if (!a && !b) return undefined;
  const byRef = new Map<string, Report>();
  for (const r of [...(a ?? []), ...(b ?? [])]) {
    const had = byRef.get(r.ref);
    if (!had) {
      byRef.set(r.ref, r);
      continue;
    }
    const base = (x: Report) => clean({ ...x, creditSeen: undefined });
    const p = pick(had, r, (x) => [stableStringify(base(x))]);
    byRef.set(r.ref, clean({ ...base(p), creditSeen: had.creditSeen || r.creditSeen || undefined }));
  }
  return [...byRef.values()].sort((x, y) => y.at - x.at || cmpText(x.ref, y.ref)).slice(0, MAX_REPORTS);
}

/** `firstSyncAt`: the first sync's Combine (its time): two different plants keep the more grown one, and that choice is stamped. */
function mergeProgressRaw(a: Side<SyncedProgress>, b: Side<SyncedProgress>, firstSyncAt?: number): Side<SyncedProgress> {
  const byCert = mergeMap(a.state.byCert, b.state.byCert, (x, y) => x) ?? {};
  const stamps = mergeStamps(a.stamps, b.stamps);
  for (const c of Object.keys(byCert)) {
    const x = a.state.byCert[c];
    const y = b.state.byCert[c];
    if (!x || !y) continue;
    byCert[c] = mergeCert(c, x, a.stamps, y, b.stamps, firstSyncAt !== undefined);
    // The first Combine chose between two plants: stamp the choice, so a phone still holding the other one never undoes it.
    const id = (p: Plant) => stableStringify(clean({ species: p.species, plantedAt: p.plantedAt, replantedAt: p.replantedAt }));
    if (firstSyncAt !== undefined && x.plant && y.plant && id(x.plant) !== id(y.plant)) stamps[`plantId.${c}`] = Math.max(stamps[`plantId.${c}`] ?? 0, firstSyncAt);
  }
  return {
    state: clean({ byCert, streak: mergeStreak(a.state.streak, b.state.streak), reports: mergeReports(a.state.reports, b.state.reports) }) as SyncedProgress,
    stamps,
  };
}

// ── The whole merge, through the checker ─────────────────────────────────
/** Placeholders for the device-local fields the checker requires, while a synced side is checked on its own. */
const PLACEHOLDER = {
  settings: { onboarded: true },
  progress: { today: { day: '', answered: 0 } },
} as const;

/** A store's data without the fields that never leave the phone. */
export function withoutDeviceLocal<T extends object>(store: SyncStoreName, state: T): T {
  const drop = new Set<string>(store === 'settings' ? DEVICE_LOCAL_SETTINGS : DEVICE_LOCAL_PROGRESS);
  return Object.fromEntries(Object.entries(state).filter(([k]) => !drop.has(k))) as T;
}
/** Only the fields that never leave the phone. */
export function deviceLocalOf(store: SyncStoreName, state: object): Record<string, unknown> {
  const keep = new Set<string>(store === 'settings' ? DEVICE_LOCAL_SETTINGS : DEVICE_LOCAL_PROGRESS);
  return Object.fromEntries(Object.entries(state).filter(([k]) => keep.has(k)));
}

export interface MergeContext {
  now: number;
  /** The certifications this app knows (a merge never adds one it doesn't). */
  knownCertIds: readonly string[];
  /** The first sync's Combine (preview and confirm): two different plants keep the more grown one (mergePlant). */
  firstSync?: boolean;
}

/**
 * A synced side through the backup rules: fitted (numbers clamped, lists
 * cut), then the STRICT checker (types, ranges, badge and plant support,
 * the size cap). Throws a BackupError when it can't pass (lib/sync.ts
 * pauses: "too large to sync").
 */
function finish<T>(store: SyncStoreName, side: Side<T>, ctx: MergeContext): Side<T> {
  const phoneShape = { ...(side.state as object), ...PLACEHOLDER[store] };
  const fitted = fitForBackup(store === 'settings' ? { settings: phoneShape, progress: {} } : { settings: {}, progress: phoneShape })[store];
  const checked = readStores({ [store]: { version: store === 'settings' ? SETTINGS_VERSION : PROGRESS_VERSION, state: fitted } }, { appVersion: '0.0.0' }, ctx.knownCertIds, undefined, undefined, {
    strict: true,
    only: store,
    mocksMayBeCut: true,
  })[store];
  return { state: withoutDeviceLocal(store, JSON.parse(JSON.stringify(checked)) as object) as T, stamps: side.stamps };
}

/**
 * Merge two synced sides of one store. `b` null: just `a`, in the canonical
 * form (what a phone pushes when the account has nothing newer). Both
 * inputs must already be checked (a pull: `readSnapshot`; the phone: fitted).
 */
export function mergeSides<T extends SyncedSettings | SyncedProgress>(store: SyncStoreName, a: Side<T>, b: Side<T> | null, ctx: MergeContext): Side<T> {
  const rawMerge = (p: Side<T>, q: Side<T>) =>
    (store === 'settings'
      ? mergeSettingsRaw(p as unknown as Side<SyncedSettings>, q as unknown as Side<SyncedSettings>)
      : mergeProgressRaw(p as unknown as Side<SyncedProgress>, q as unknown as Side<SyncedProgress>, ctx.firstSync ? ctx.now : undefined)) as unknown as Side<T>;
  // Each side in its canonical form first (sorted sets, one entry per day…), so a
  // value only one side has is in the same form as a merged one.
  const x = rawMerge(clampFuture(store, a, ctx.now), clampFuture(store, a, ctx.now));
  const y = b ? rawMerge(clampFuture(store, b, ctx.now), clampFuture(store, b, ctx.now)) : x;
  return finish(store, rawMerge(x, y), ctx);
}

// ── Snapshots on the wire ────────────────────────────────────────────────
/** What a phone pushes for one store: the shared data and its stamps (`changedAt`). */
export function toPayload<T extends object>(side: Side<T>): Record<string, unknown> {
  return { ...(side.state as Record<string, unknown>), changedAt: side.stamps };
}

/** The phone's own store as a synced side (fitted, device-local fields dropped). Throws if it can't be checked. */
export function localSide<T extends SyncedSettings | SyncedProgress>(store: SyncStoreName, fittedPhoneState: object, stamps: Stamps, ctx: MergeContext): Side<T> {
  return finish(store, { state: withoutDeviceLocal(store, fittedPhoneState) as T, stamps: readStamps(stamps) }, ctx);
}

/**
 * A pulled snapshot's state, checked like a backup file (readStores,
 * strict): a prototype key, an oversized state, an unknown exam, a field out
 * of range, or a store from a newer app all throw a BackupError, and the
 * phone changes nothing. Badges and the plant keep only what the snapshot's
 * own data supports.
 *
 * Unlike a backup file, ids this app's content doesn't have (a question a
 * newer app added, or one retired) are KEPT, bounded by the same caps: two
 * phones on different app versions then agree on the same data instead of
 * dropping and re-adding those ids on every sync, and a badge earned on a
 * retired question is never refuted later. They are never shown.
 */
export function readSnapshot<T extends SyncedSettings | SyncedProgress>(
  store: SyncStoreName,
  snap: { state: unknown; storeVersion: number; appVersion: string },
  ctx: MergeContext & { thisApp?: string },
): Side<T> {
  const raw = snap.state;
  // Checked on the RAW state, before any copy: a copy made with spread or
  // assignment would turn a "__proto__" key into a prototype and hide it.
  if (hasProtoKey(raw)) throw new BackupError('bad-data', store);
  // A settings copy over the server's 64 KB cap can't be genuine: unreadable, never applied.
  if (store === 'settings' && utf8Bytes(JSON.stringify(raw ?? null)) > MAX_SETTINGS_BYTES) throw new BackupError('too-big', store);
  const state = isObj(raw) ? { ...withoutDeviceLocal(store, raw), ...PLACEHOLDER[store] } : raw;
  const checked = readStores({ [store]: { version: snap.storeVersion, state } }, { appVersion: snap.appVersion }, ctx.knownCertIds, undefined, ctx.thisApp, {
    strict: true,
    only: store,
    mocksMayBeCut: true,
  })[store];
  return { state: withoutDeviceLocal(store, JSON.parse(JSON.stringify(checked)) as object) as T, stamps: readStamps(isObj(raw) ? raw.changedAt : undefined) };
}

/**
 * True when the phone holds anything a learner would miss (Phase 7 review,
 * CR N8): any study, a saved question, a note read, a mock, a badge, a game
 * level, a plant, a report, a study day, or an exam date. Stricter than
 * progressIsEmpty (which decides the first-sync preview's case): when this is
 * true, a first sync keeps the 7-day "Undo sync" copy before changing the
 * phone, so "Start fresh" never discards anything without a way back.
 */
export function holdsStudy(p: SyncedProgress, s: Partial<SyncedSettings>): boolean {
  if (!progressIsEmpty(p) || p.streak.best > 0 || (p.reports ?? []).length > 0) return true;
  const some = (x: object | readonly unknown[] | undefined) => (Array.isArray(x) ? x.length > 0 : Boolean(x && Object.keys(x).length > 0));
  const certHolds = Object.values(p.byCert).some(
    (cp) =>
      some(cp.bookmarks) || some(cp.notesRead) || some(cp.notesViewed) || some(cp.mocks) || some(cp.mistakes) || some(cp.review) || some(cp.cards) ||
      some(cp.gameBest) || some(cp.gameGrowth) || some(cp.mastery) || some(cp.milestones?.earned) || Boolean(cp.plant) ||
      // A note the learner wrote (a deleted one is not data to keep).
      Object.values(cp.qNotes ?? {}).some(isLiveNote),
  );
  return certHolds || Object.values(s.examDates ?? {}).some(Boolean);
}

/** True when a synced progress side holds no study at all (nothing to lose, nothing to keep). */
export function progressIsEmpty(p: SyncedProgress): boolean {
  const any = Object.values(p.byCert).some((cp) => Object.keys(cp.answers ?? {}).length > 0 || (cp.lessonsDone ?? []).length > 0);
  return !any && !p.streak.lastDay;
}
