/**
 * The Weak spots drill (Grove Phase 4, PHASE4.md 7.8; Sky answered O8 YES on 5 Nov 2026): the same
 * rule as the website's `startWeakSpotsDrill` (index.html, `weakDrillRanked` and
 * `getTrainWeakSpotsPool`), so both builds build the drill from the same numbers.
 *
 * Plain English:
 *  1. Rank the domains. First the ones with a real read (30 answers or more) that are not Strong,
 *     lowest score first. Then the ones with too few answers to measure, least practised first.
 *     Strong domains come last, so they are picked only when nothing weaker is left.
 *  2. Take the top three domains and up to 7 random questions from each.
 *  3. Add up to 5 of the learner's open missed questions (never twice).
 *  4. Shuffle and keep at most 20.
 *
 * Pure TypeScript: no React, no storage. Not compiled into the website bundles (it is a new file and
 * no bundled file imports it). Every id here is a question id; letters are never touched.
 */
import { BAND_MIN_ANSWERS, bandOf } from './domainBand';
import { shuffled, type Rng } from './random';
import { andList } from './resultsCopy';

/** How many domains the drill draws from, questions per domain, missed questions added, and the set's cap (the website's numbers). */
export const WEAK_DRILL = { domains: 3, perDomain: 7, missed: 5, cap: 20 } as const;

/** One domain's standing for the drill. `tier`: 0 measured and not Strong, 1 too few to measure, 2 Strong. */
export interface WeakRank {
  domainId: string;
  tier: 0 | 1 | 2;
  pct: number;
  answered: number;
}

/** The domains in drill order (the website's `weakDrillRanked`). Ties keep the course's own order. */
export function weakDrillRanked(domains: readonly { domainId: string; answered: number; mastery: number }[]): WeakRank[] {
  return domains
    .map((d): WeakRank => {
      const pct = Math.round(d.mastery * 100);
      const tier = d.answered >= BAND_MIN_ANSWERS ? (bandOf(pct) === 'Strong' ? 2 : 0) : 1;
      return { domainId: d.domainId, tier, pct, answered: d.answered };
    })
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.tier - b.r.tier || (a.r.tier === 1 ? a.r.answered - b.r.answered : a.r.pct - b.r.pct) || a.i - b.i)
    .map(({ r }) => r);
}

/**
 * The drill's questions: up to 7 random from each of the top three domains, up to 5 open missed
 * questions put first (never twice), then all of it shuffled and cut to 20. `byDomain` holds every
 * question id per domain; `missed` the open missed ids (ones no longer in the bank are dropped later
 * by the session).
 */
export function weakDrillPool(ranked: readonly WeakRank[], byDomain: Readonly<Record<string, readonly string[]>>, missed: readonly string[], rng: Rng): string[] {
  const pool: string[] = [];
  for (const r of ranked.slice(0, WEAK_DRILL.domains)) pool.push(...shuffled(byDomain[r.domainId] ?? [], rng).slice(0, WEAK_DRILL.perDomain));
  for (const id of shuffled(missed, rng).slice(0, WEAK_DRILL.missed)) if (!pool.includes(id)) pool.unshift(id);
  return shuffled(pool, rng).slice(0, WEAK_DRILL.cap);
}

/**
 * The row's line under "Weak spots drill" (the website's `weakLine`): once anything is answered and
 * a top-three domain is not Strong, "From IS Audit and IS Operations"; otherwise
 * "From the domains you miss most".
 */
export function weakDrillLine(ranked: readonly WeakRank[], shortName: (domainId: string) => string, anyAnswered: boolean): string {
  const weak = ranked.slice(0, WEAK_DRILL.domains).filter((r) => r.tier < 2).map((r) => shortName(r.domainId));
  return anyAnswered && weak.length ? `From ${andList(weak)}` : 'From the domains you miss most';
}
