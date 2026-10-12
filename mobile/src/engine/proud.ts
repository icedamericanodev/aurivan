/**
 * When the plant may look proud (mobile 1.18; expert panel, owner delegated).
 *
 * Plain English for the founder:
 * - The plant looks proud only for something the learner truly EARNED today:
 *   1. a growth step reached today (never one filled in quietly, like a
 *      first planting that reads past study), or
 *   2. a NEW keepsake today: the first tier of a LEARNING badge (one of the
 *      six counted sets: Groundwork, Domains, Evergreen, Judgement, Exam Day,
 *      Rooted). Badges from games alone (Field notes, e.g. Whole Grove) and
 *      Fresh Start (a moment for coming back) never make it proud. Nor does
 *      a visit, a tap or a streak. There are no random rewards.
 * - Each such event is one "occasion" with an id. The occasions are written
 *   down (store/seen.ts, this phone only), so a proud moment is never
 *   replayed after the app is closed and opened again.
 * - Keepsake occasions are capped: at most 3 in any rolling 7 days make the
 *   plant proud. A 4th is noted as capped and the plant stays as it was.
 *   Growth is never capped: it always counts.
 * - The proud face lasts until local midnight (the occasion's day), then
 *   the plant goes back to its idle face.
 *
 * Pure TypeScript: no React, no storage. The clock is passed in.
 */
import { BADGE_SET, COUNTED_SETS } from './badgeCatalog';
import { keepsakeForBadge } from './plantLooks';
import { DAY_MS } from './srs';
import { dayKey } from './streak';

/** At most this many keepsake occasions make the plant proud in any rolling window. */
export const PROUD_KEEPSAKE_CAP = 3;
/** The rolling window for that cap, in days. */
export const PROUD_WINDOW_DAYS = 7;
/** Log entries older than this are dropped (an occasion only counts on its own day, and the cap looks back 7). */
export const PROUD_KEEP_DAYS = 14;

export type ProudKind = 'growth' | 'keepsake';

/** One earned event that may make the plant proud. `at` is when it happened (epoch ms). */
export interface ProudOccasion {
  id: string;
  kind: ProudKind;
  at: number;
}

/** What the phone remembers about one occasion: when it happened, and whether the cap held it back. */
export interface ProudEntry {
  kind: ProudKind;
  at: number;
  /** Over the keepsake cap: noted, so it never counts later, but it made no proud face. */
  capped?: true;
}
export type ProudLog = Record<string, ProudEntry>;

/** A learning badge: in one of the six counted sets, and it gives a keepsake. Never a game-only badge or a Moment. */
export function isLearningKeepsakeBadge(badge: string): boolean {
  const set = (BADGE_SET as Record<string, string | undefined>)[badge];
  return set !== undefined && (COUNTED_SETS as readonly string[]).includes(set) && keepsakeForBadge(badge) !== undefined;
}

/** The plant fields the growth occasions read. */
export interface ProudPlant {
  growth: number;
  /** When each growth above Seed was reached (epoch ms), keyed by growth id. */
  reached?: Partial<Record<string, number>>;
  /** A quiet back-fill (planting, a restore with no plant): its time is never an occasion. */
  backfill?: { at: number };
}

/** Growth occasions: a growth step reached today that was not back-filled. */
export function growthOccasions(certId: string, plant: ProudPlant | null | undefined, today: string): ProudOccasion[] {
  if (!plant) return [];
  const out: ProudOccasion[] = [];
  for (const [g, at] of Object.entries(plant.reached ?? {})) {
    if (typeof at !== 'number' || at === plant.backfill?.at || dayKey(at) !== today) continue;
    out.push({ id: `growth:${certId}:${g}:${at}`, kind: 'growth', at });
  }
  return out.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

/** One cert's saved marks, as the keepsake occasions read them. */
export interface ProudMarks {
  earned?: Record<string, number>;
  /** Marks saved quietly by the back-fill or the catalogue fill carry these times: never an occasion. */
  backfill?: { at: number };
  catalogFill?: { at: number };
}

/**
 * Keepsake occasions: a learning badge whose FIRST tier, on any exam, was
 * earned today, live (not by a quiet fill). A higher tier of a badge already
 * held brings no new keepsake (QA BUG-2), so it is no occasion.
 *
 * `kept` is the plant's unlocks carried across a Reset (CertPlant.kept). A
 * Reset wipes the badges but the plant keeps their keepsakes, so earning that
 * badge's first tier again brings nothing new: it is no occasion (PR #51
 * review). Everything in `kept` was unlocked before the Reset that kept it.
 */
export function keepsakeOccasions(certs: readonly ProudMarks[], today: string, kept: readonly string[] = []): ProudOccasion[] {
  const first = new Map<string, { at: number; quiet: boolean }>();
  for (const c of certs) {
    const quiet = new Set([c.backfill?.at, c.catalogFill?.at].filter((x): x is number => typeof x === 'number'));
    for (const [key, at] of Object.entries(c.earned ?? {})) {
      if (typeof at !== 'number') continue;
      const badge = key.split(':')[0];
      const was = first.get(badge);
      if (!was || at < was.at) first.set(badge, { at, quiet: quiet.has(at) });
    }
  }
  const out: ProudOccasion[] = [];
  for (const [badge, { at, quiet }] of first) {
    if (quiet || dayKey(at) !== today || !isLearningKeepsakeBadge(badge)) continue;
    // Its keepsake was already on the plant before a Reset: not new.
    const k = keepsakeForBadge(badge);
    if (k && kept.includes(k.id)) continue;
    out.push({ id: `keepsake:${badge}:${at}`, kind: 'keepsake', at });
  }
  return out.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

/** Keepsake occasions that counted (not capped) within the rolling window ending at `now`. */
function keepsakesInWindow(log: ProudLog, now: number): number {
  let n = 0;
  for (const e of Object.values(log)) if (e.kind === 'keepsake' && !e.capped && now - e.at < PROUD_WINDOW_DAYS * DAY_MS && e.at <= now) n++;
  return n;
}

/**
 * Write down any occasion not seen before (oldest first), applying the
 * keepsake cap, and drop entries older than PROUD_KEEP_DAYS. Returns the SAME
 * log object when nothing changed, so callers can skip a save.
 */
export function admitProud(log: ProudLog, occasions: readonly ProudOccasion[], now: number): ProudLog {
  let next: ProudLog | null = null;
  for (const o of [...occasions].sort((a, b) => a.at - b.at)) {
    const cur: ProudLog = next ?? log;
    if (cur[o.id]) continue;
    const capped = o.kind === 'keepsake' && keepsakesInWindow(cur, o.at) >= PROUD_KEEPSAKE_CAP;
    next = { ...cur, [o.id]: { kind: o.kind, at: o.at, ...(capped ? { capped: true as const } : {}) } };
  }
  const base = next ?? log;
  const old = Object.keys(base).filter((k) => now - base[k].at > PROUD_KEEP_DAYS * DAY_MS);
  if (!old.length) return base;
  const pruned = { ...base };
  for (const k of old) delete pruned[k];
  return pruned;
}

/** Today's proud state, from the (admitted) log and today's occasions. */
export interface ProudToday {
  /** A growth step today (always proud). */
  grew: boolean;
  /** A new learning keepsake today that the cap let through. */
  keepsake: boolean;
  /** The occasions that make the plant proud today, oldest first. */
  ids: string[];
}

/**
 * Which of today's occasions make the plant proud. An occasion not in the log
 * yet is judged as `admitProud` would write it, so the face is right on the
 * very first frame (before the log is saved).
 */
export function proudToday(log: ProudLog, occasions: readonly ProudOccasion[], now: number): ProudToday {
  const admitted = admitProud(log, occasions, now);
  const live = occasions.filter((o) => {
    const e = admitted[o.id];
    return o.kind === 'growth' || (e !== undefined && !e.capped);
  });
  return { grew: live.some((o) => o.kind === 'growth'), keepsake: live.some((o) => o.kind === 'keepsake'), ids: live.map((o) => o.id) };
}

/**
 * The id of the proud reaction for today's occasions. The same occasions
 * always give the same id (so a relaunch never replays it); a NEW occasion
 * later the same day gives a new id (a new reason to stand tall).
 */
export function proudReactionId(ids: readonly string[]): string | null {
  return ids.length ? `proud:${[...ids].sort().join('+')}` : null;
}
