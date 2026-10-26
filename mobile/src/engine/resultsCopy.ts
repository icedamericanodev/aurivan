/**
 * Results copy that tells the truth about small samples (mobile 1.24).
 *
 * Plain English for the founder:
 * - The headline is the count ("3 of 4 right"; since mobile 1.43 at every
 *   size, owner decision), and under SMALL_SAMPLE answers one fact follows
 *   (the topic most missed), not a verdict.
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
 * The big line on Results: always the count (mobile 1.43, owner decision: lead with
 * the count). "8 of 10 right" says what happened; "Strong work." before the count
 * read like a pat on the head, and below 60% the old line judged instead of helping.
 */
export function resultsHeadline(correct: number, answered: number): string {
  return countHeadline(correct, answered);
}

/** One question's outcome on the Results leaf strip. */
export type LeafState = 'right' | 'missed' | 'blank';

/** The strip shows sessions up to this many questions (rows of 10); bigger ones and mocks get one line instead. */
export const STRIP_MAX = 20;

/** "3 and 7", "3, 7 and 9" (question numbers as words for a screen reader and the note kickers). */
export function andList(items: readonly (string | number)[]): string {
  const xs = items.map(String);
  return xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/**
 * The strip said once, as one image (mobile 1.43): "Right: 1, 2, 4, 5, 6, 8, 9 and 10. Missed: 3 and 7."
 * Question numbers are the order the learner saw them (1-based), never internal ids.
 */
export function stripSpoken(states: readonly LeafState[]): string {
  const at = (k: LeafState) => states.map((s, i) => (s === k ? i + 1 : 0)).filter(Boolean);
  const right = at('right');
  const missed = at('missed');
  const blank = at('blank');
  if (states.length > 0 && right.length === states.length) return `All ${states.length} right.`;
  return [
    right.length ? `Right: ${andList(right)}.` : 'None right.',
    missed.length ? `Missed: ${andList(missed)}.` : null,
    blank.length ? `Not answered: ${andList(blank)}.` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * What happens to the misses, under the stats (mobile 1.43). True since misses are
 * due at the start of the next local day (engine/srs.ts). Only for sets that
 * schedule them as they are answered (practice, review, Guided); a mock shows none.
 */
export function missedNotice(missed: number): { title: string; body: string } {
  return {
    title: missed === 1 ? 'The one you missed comes back tomorrow' : `The ${missed} you missed come back tomorrow`,
    body: 'In your review, spaced so they stick. Nothing to redo now.',
  };
}

/** A set with nothing missed: an encouraging line in place of the notice. */
export const CLEAN_SET_NOTICE = { title: 'A clean set', body: 'Nothing to redo. Your review brings questions back when they are due.' } as const;

/**
 * The one line that replaces the strip on a mock or a set of more than STRIP_MAX:
 * "12 missed. Each one is in Review answers below." On a mock, blanks are said too.
 */
export function missedLine(missed: number, blank: number): string {
  if (missed === 0) return 'None missed.';
  if (blank > 0) return `${missed} missed, ${blank} of them left blank: a blank counts as not correct.`;
  return `${missed} missed. Each one is in Review answers below.`;
}

/** The kicker over a note row: "Read the note · question 3" / "Read the note · questions 3 and 7". */
export function noteKicker(numbers: readonly number[]): string {
  return `Read the note · ${numbers.length === 1 ? 'question' : 'questions'} ${andList(numbers)}`;
}

/** After the note rows: the misses no row covers ("And 2 more in your review."; a mock has no review promise). */
export function moreMissedLine(n: number, mock: boolean): string | null {
  if (n <= 0) return null;
  return mock ? `And ${n} more in Review answers below.` : `And ${n} more in your review.`;
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
