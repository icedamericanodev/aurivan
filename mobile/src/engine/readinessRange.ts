/**
 * Readiness as an honest RANGE ("62–70%"), never a single point.
 *
 * Why a range: a readiness score built from 60 answers is much less certain
 * than one built from 600. Showing "70%" for both would overstate what we
 * know, and a single number reads like a prediction of the exam result. A
 * range says "your blueprint-weighted mastery is most likely in here", and it
 * visibly narrows as you answer more questions.
 *
 * The method, in plain English:
 *   1. Start from the existing readiness score (readiness.ts): per-domain
 *      mastery, weighted by the official blueprint. That is the centre.
 *   2. For each domain, work out how much its mastery could wobble by chance.
 *      Mastery is "questions whose last answer was right" divided by
 *      max(answered, MIN_SAMPLE), so its standard error is
 *          se_d = sqrt(n · p̃ · (1 − p̃)) / max(n, MIN_SAMPLE)
 *      where n = questions answered in the domain and p̃ = (right + 1) / (n + 2)
 *      (a "plus-one" smoothed accuracy, so 10/10 right still has some doubt).
 *      A domain you have never practised has n = 0 → se 0: it counts as 0 by
 *      the honesty rule in readiness.ts, it is not a guess.
 *   3. Domains are independent samples, so the score's standard error is
 *          SE = sqrt( Σ (w_d · se_d)² )     with w_d = weight_d / Σ weights
 *   4. The range is the centre ± 1.28 · SE (an 80% interval: honest without
 *      being so wide it is useless), never narrower than ±2 points, rounded
 *      outwards to whole percent and clamped to 0–100.
 *   Assisted answers (Coach me) carry HALF the evidence of a clean answer:
 *      the domain's sample size becomes n_eff = n − assisted × (1 − ASSISTED_WEIGHT),
 *      and p̃ uses the half-weighted credit. Fewer effective answers = a wider,
 *      more honest range. The centre is already half-weighted (readiness.ts).
 *   5. Below RANGE_MIN_ANSWERS answers in total (assisted first answers count half) we show "Not enough data yet"
 *      instead of a range.
 *
 * Example: 200 answers spread over the five CISA domains at ~70% gives
 * SE ≈ 3.3 points → about "66–75%". At 800 answers it tightens to ~±2.
 *
 * Pure TypeScript: no React, no storage.
 */
import type { Certification } from '../content/types';
import { ASSISTED_WEIGHT, MIN_SAMPLE, type DomainMastery, type Readiness } from './readiness';

/** Below this many answers in total, readiness says "Not enough data yet". */
export const RANGE_MIN_ANSWERS = 40;
/** z for a two-sided 80% interval. */
export const RANGE_Z = 1.2816;
/** The range is never narrower than ±2 points, so it never reads as a point. */
export const RANGE_MIN_HALF_WIDTH = 2;

export type ReadinessRange =
  | { enough: false; answered: number; needed: number }
  | { enough: true; answered: number; low: number; high: number; centre: number };

/** A domain's effective sample size: each assisted answer counts as half an answer. */
export function effectiveAnswers(dm: DomainMastery): number {
  return dm.answered - dm.assisted * (1 - ASSISTED_WEIGHT);
}

export function readinessRange(cert: Certification, readiness: Readiness): ReadinessRange {
  const answered = readiness.domains.reduce((s, d) => s + d.answered, 0);
  // The "enough data" gate counts assisted answers at half (unlockWeight in
  // readiness.ts). It only ever grows, so `needed` is a countdown that never
  // goes back up after an answer.
  const unlocked = readiness.domains.reduce((s, d) => s + d.unlockAnswers, 0);
  if (unlocked < RANGE_MIN_ANSWERS) {
    return { enough: false, answered, needed: Math.ceil(RANGE_MIN_ANSWERS - unlocked) };
  }
  const totalWeight = cert.domains.reduce((s, d) => s + d.weight, 0) || 1;
  let variance = 0;
  for (const dm of readiness.domains) {
    const w = (cert.domains.find((d) => d.id === dm.domainId)?.weight ?? 0) / totalWeight;
    const n = effectiveAnswers(dm);
    if (n <= 0) continue;
    const p = (dm.credit + 1) / (dm.answered + 2);
    const se = Math.sqrt(n * p * (1 - p)) / Math.max(n, MIN_SAMPLE);
    variance += (w * se) ** 2;
  }
  const half = Math.max(RANGE_Z * Math.sqrt(variance) * 100, RANGE_MIN_HALF_WIDTH);
  const centre = readiness.score;
  return {
    enough: true,
    answered,
    centre,
    low: Math.max(0, Math.floor(centre - half)),
    high: Math.min(100, Math.ceil(centre + half)),
  };
}

/** "62–70" (en dash, no spaces). The % sign is drawn separately as a superscript. */
export function rangeLabel(r: Extract<ReadinessRange, { enough: true }>): string {
  return `${r.low}–${r.high}`;
}

/** Screen-reader wording: "between 62 and 70 percent". */
export function rangeSpoken(r: ReadinessRange): string {
  return r.enough ? `between ${r.low} and ${r.high} percent` : 'not enough data yet';
}
