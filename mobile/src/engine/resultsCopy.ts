/**
 * Results copy that tells the truth about small samples (mobile 1.24).
 *
 * Plain English for the founder:
 * - "Strong work." after 3 of 4 right, or "Every miss is a lesson." after 2
 *   of 5, reads like a pat on the head: four questions say very little. So
 *   under SMALL_SAMPLE answers the headline is just the count ("3 of 4
 *   right") and one fact (the topic most missed), not a verdict.
 * - The calibration line ("How sure you felt: Sure 7 of 9 right · Unsure 2 of 4 right") shows how
 *   well "how sure I felt" matched what happened. Optional: only when the
 *   learner rated enough answers.
 *
 * Pure TypeScript: no React, no storage.
 */
import type { Confidence } from './srs';

/** A timed mock that ended because the clock reached zero: shown on Results and said aloud (mobile 1.24). */
export const TIMES_UP_LINE = 'Time’s up. Your exam was submitted.';
export const TIMES_UP_DETAIL = 'Questions you did not answer count as not correct.';

/** Under this many answered, Results states the count instead of judging it. */
export const SMALL_SAMPLE = 8;
/** At least this many rated answers before the calibration line appears. */
export const CALIBRATION_MIN = 5;

/** The count as words: "3 of 4 right" ("All 4 right" when every one was). */
export function countHeadline(correct: number, answered: number): string {
  if (answered > 0 && correct === answered) return answered === 1 ? 'Right' : `All ${answered} right`;
  return `${correct} of ${answered} right`;
}

/**
 * The big line on Results. Small samples: the count. A bigger sample:
 * the encouraging bands (75+, 60+), and "Every miss is a lesson." below.
 */
export function resultsHeadline(correct: number, answered: number, pct: number): string {
  if (answered < SMALL_SAMPLE) return countHeadline(correct, answered);
  return pct >= 75 ? 'Strong work.' : pct >= 60 ? 'Getting there.' : 'Every miss is a lesson.';
}

/**
 * One calm fact under a small-sample headline: the topic most missed ("Missed:" after a single miss,
 * where "most" would overstate). Null when there is nothing to say.
 */
export function smallSampleFact(missedTopic: string | undefined, missed: number): string | null {
  if (missed === 0 || !missedTopic) return null;
  return missed === 1 ? `Missed: ${missedTopic}.` : `Most missed: ${missedTopic}.`;
}

export interface CalibrationTally {
  right: number;
  total: number;
}

/** Right-of-total per confidence level, over the answers that were rated. */
export function calibrationTally(rows: readonly { confidence?: Confidence; correct: boolean }[]): Record<Confidence, CalibrationTally> {
  const out: Record<Confidence, CalibrationTally> = {
    sure: { right: 0, total: 0 },
    unsure: { right: 0, total: 0 },
    guessing: { right: 0, total: 0 },
  };
  for (const r of rows) {
    if (!r.confidence) continue;
    out[r.confidence].total += 1;
    if (r.correct) out[r.confidence].right += 1;
  }
  return out;
}

const LEVEL_NAME: Record<Confidence, string> = { sure: 'Sure', unsure: 'Unsure', guessing: 'Guessing' };

/**
 * "How sure you felt: Sure 7 of 9 right · Unsure 2 of 4 right" — only the
 * levels the learner used, and only when at least CALIBRATION_MIN answers were
 * rated. Otherwise null. The lead-in says what "Sure" refers to (UX review S8).
 */
export function calibrationLine(rows: readonly { confidence?: Confidence; correct: boolean }[]): string | null {
  const t = calibrationTally(rows);
  const rated = t.sure.total + t.unsure.total + t.guessing.total;
  if (rated < CALIBRATION_MIN) return null;
  const parts = (['sure', 'unsure', 'guessing'] as const)
    .filter((k) => t[k].total > 0)
    .map((k) => `${LEVEL_NAME[k]} ${t[k].right} of ${t[k].total} right`);
  return `How sure you felt: ${parts.join(' · ')}`;
}
