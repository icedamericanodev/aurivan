/**
 * Answer-option shuffling with letter mapping.
 *
 * Why this matters: if option A is always the right answer for a question,
 * learners memorise "it's A" instead of the reasoning. So we shuffle the
 * options each time. But tips say things like "Trap is B" — after a
 * shuffle, the trap might be shown as D. This module keeps both views in
 * sync:
 *
 *   ORIGINAL letter = the letter in the content file (used for grading)
 *   DISPLAY letter  = the letter the learner sees on screen
 *
 * Grading ALWAYS happens on original letters (same rule as the web app,
 * CLAUDE.md hard rule 4).
 */
import { LETTERS, type Letter, type PackQuestion } from '../content/types';
import { shuffled, type Rng } from './random';

/**
 * A permutation: perm[i] is the ORIGINAL letter shown in display slot i.
 * e.g. ['C','A','D','B'] means display "A" shows original option C.
 */
export type Permutation = Letter[];

export function optionLetters(q: PackQuestion): Letter[] {
  return LETTERS.filter((l) => q.options[l] !== undefined);
}

export function makePermutation(q: PackQuestion, rng: Rng): Permutation {
  return shuffled(optionLetters(q), rng);
}

/** Identity permutation — used when shuffling is turned off. */
export function identityPermutation(q: PackQuestion): Permutation {
  return optionLetters(q);
}

export function displayToOriginal(display: Letter, perm: Permutation): Letter {
  const i = LETTERS.indexOf(display);
  return perm[i] ?? display;
}

export function originalToDisplay(original: Letter, perm: Permutation): Letter {
  const i = perm.indexOf(original);
  return i >= 0 ? LETTERS[i] : original;
}

/**
 * Turn content text into learner-facing text: every {{X}} token (an
 * option reference marked by scripts/build-content.mjs) becomes the
 * DISPLAY letter for this shuffle. Ordinary words are never touched.
 */
export function renderText(text: string | undefined, perm: Permutation): string {
  if (!text) return '';
  return text.replace(/\{\{([A-D])\}\}/g, (_, l: Letter) => originalToDisplay(l, perm));
}

/** True when the learner's DISPLAY choice is the correct answer. */
export function isCorrect(q: PackQuestion, displayChoice: Letter, perm: Permutation): boolean {
  return displayToOriginal(displayChoice, perm) === q.correct;
}
