/**
 * Grove Phase 4b: what a drill's verdict says (design-notes/grove/phase4b/PHASE4B.md 6.4).
 *
 * Plain English for the founder:
 * - A two-step drill (Snare Spotter, Signpost, Call It First below Heartwood) scores two halves: the
 *   skill step (spot the snare, read the word, name the principle) and the best answer.
 * - Both halves: the verdict is the game's own good word ("Snare spotted"; "Correct" for the others).
 * - One half: "Half right" (release prep 2.0.0; it was a red "Not quite", which read as a contradiction
 *   above "Best answer picked, 1 point."), drawn in clay with a neutral mark, and ONE short line names
 *   only the half that was earned ("Snare spotted, 1 point."). Never "No point", never the verdict said twice.
 * - Neither half: "Not quite", no line.
 * - Snare Spotter, the best answer tapped as the snare: the answer was revealed, so it never earns the
 *   answer half (engine/games/trapSpotter.ts scoreTrapPick): "Not quite", no line.
 * - One-step drills (Forecast, Daylight, Call It First at Heartwood): "Correct" or "Not quite".
 * - What a screen reader hears when focus lands on the verdict is said once and matches the line.
 *
 * Every letter here is a DISPLAY letter (what the learner saw); grading was done on ORIGINAL letters
 * before these words are chosen. Nothing here scores or saves anything.
 */
import type { Letter, PackQuestion } from '../content/types';
import { pickCoachLine } from '../engine/pickCoach';
import type { Permutation } from '../engine/shuffle';
import { missCoachLine } from '../engine/slipCoach';
import { runnerUp } from '../engine/tips';

/** The two-half lines (PHASE4B 6.4 item 3): only the earned half is named, never "No point". */
export const HALF = {
  snare: 'Snare spotted, 1 point.',
  best: 'Best answer picked, 1 point.',
} as const;

/** The words of a drill's verdict. */
export interface DrillVerdictCopy {
  /** The drill's word: "Snare spotted", "Correct", "Half right" or "Not quite". */
  word: string;
  /** ✓ and the correct colour, or ✗ and the miss colour (colour is never alone: the mark and the word say it). */
  good: boolean;
  /** Exactly one half of a two-step drill was earned: "Half right", a neutral mark in clay (never red). */
  partial?: true;
  /** The coach line, in `aside`. */
  coach: string;
  /** What the verdict heading says when focus lands on it (said once). */
  spoken: string;
}

/** The coach line after a right answer, as on the main answer screen (session.tsx). */
export const CLEAN_READ = 'Clean read.';

/** The verdict word when exactly one half of a two-step drill was earned. */
export const HALF_RIGHT = 'Half right';

/** One half earned: the overall result is "Half right", and the half line names which half. */
const halfVerdict = (coach: string, half: string): DrillVerdictCopy => ({ word: HALF_RIGHT, good: false, partial: true, coach, spoken: `${HALF_RIGHT}. ${half}` });

/** Snare Spotter's verdict. `snare`, `best` and `tapped` (the step-1 pick) are DISPLAY letters. */
export function snareVerdict(o: { spotted: boolean; correct: boolean; revealed: boolean; snare: string; best: string; tapped: string; missCoach: string }): { verdict: DrillVerdictCopy; half: string | null } {
  if (o.spotted && o.correct) {
    const coach = `${o.snare} was built to fool you, and ${o.best} is the best. Two points.`;
    return { verdict: { word: 'Snare spotted', good: true, coach, spoken: `Snare spotted. ${coach}` }, half: null };
  }
  if (o.spotted) {
    return { verdict: halfVerdict(o.missCoach, HALF.snare), half: HALF.snare };
  }
  // The snare was missed. The words that said so before 4b ("The snare was D, not B") stay as the coach line.
  const coach = `The snare was ${o.snare}, not ${o.tapped}.`;
  if (o.correct && !o.revealed) {
    return { verdict: halfVerdict(coach, HALF.best), half: HALF.best };
  }
  return { verdict: { word: 'Not quite', good: false, coach, spoken: 'Not quite.' }, half: null };
}

/**
 * Signpost's and Call It First's verdict (two halves). `skillHalf`: the earned skill half's line
 * ("Principle named, 1 point."); `skillCoach`: the coach line when only the answer half was earned.
 */
export function twoHalfVerdict(o: { skill: boolean; correct: boolean; skillHalf: string; skillCoach: string; missCoach: string }): { verdict: DrillVerdictCopy; half: string | null } {
  if (o.skill && o.correct) return { verdict: { word: 'Correct', good: true, coach: CLEAN_READ, spoken: `Correct. ${CLEAN_READ}` }, half: null };
  if (o.skill) return { verdict: halfVerdict(o.missCoach, o.skillHalf), half: o.skillHalf };
  if (o.correct) return { verdict: halfVerdict(o.skillCoach, HALF.best), half: HALF.best };
  return { verdict: { word: 'Not quite', good: false, coach: o.missCoach, spoken: 'Not quite.' }, half: null };
}

/** A one-step drill's verdict: "Correct" or "Not quite", as on the main answer screen ("Not quite. Best answer D."). */
export function oneStepVerdict(o: { correct: boolean; best: string; missCoach: string; extra?: string | null }): DrillVerdictCopy {
  const coach = o.correct ? CLEAN_READ : o.missCoach;
  const head = o.correct ? 'Correct' : `Not quite. Best answer ${o.best}`;
  return { word: o.correct ? 'Correct' : 'Not quite', good: o.correct, coach, spoken: `${head}. ${o.extra ? `${o.extra}. ` : ''}${coach}` };
}

/** Signpost's skill half (its words from the screen's own "you read it right"). */
export const readHalf = (word: string) => `You read ${word} right, 1 point.`;
/** Call It First's skill half (its words from the screen's own "Principle named"). */
export const PRINCIPLE_HALF = 'Principle named, 1 point.';

/**
 * The coach line after a missed answer, as on the main answer screen (session.tsx): a line about the
 * learner's own pick when the tips name it, otherwise the closest-wrong-choice or the neutral line.
 * `picked` is the ORIGINAL letter of the learner's answer.
 */
export function missCoach(q: PackQuestion, picked: Letter, perm: Permutation): string {
  return pickCoachLine(q.tips, q.correct, picked, perm) ?? missCoachLine(picked === runnerUp(q.tips, q.correct));
}
