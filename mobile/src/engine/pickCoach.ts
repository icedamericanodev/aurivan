/**
 * The pick-aware coach line (premium round 2, phone parity with web v12.47).
 *
 * After a miss, the line under "Not quite" can say something true about the
 * learner's OWN pick, read straight from the question's exam-style v2 tips:
 *
 *   - "Your pick, B, is one of the two to rule out first."
 *       when the Eliminate tip names exactly two options, the pick is one of
 *       them and the best answer is neither;
 *   - "You reached the final two: B against D."
 *       when the Final two tip names exactly the pick and the best answer.
 *
 * Anything else returns null and the screen keeps its usual line
 * (engine/slipCoach.ts missCoachLine). Never a guess.
 *
 * Letters: the content pack already marks every option reference in a tip as
 * a {{X}} token holding the ORIGINAL letter (scripts/build-content.mjs
 * tokenizeLetters, the same letter rule as the website's isOptionLetterRef,
 * so "C-level" or "A SOC 2 report" are never taken for options). All the
 * comparing happens on those ORIGINAL letters; only the words the learner
 * reads are turned into DISPLAY letters, through the shuffle
 * (engine/shuffle.ts originalToDisplay). Learner text never says "runner-up".
 *
 * Pure TypeScript: no React, no storage.
 */
import type { Letter } from '../content/types';
import { originalToDisplay, type Permutation } from './shuffle';

export type PickCoachKind = 'rule-out' | 'final-two';

/** "Your pick, B, is one of the two to rule out first." (B = the DISPLAY letter). */
export const ruleOutLine = (pick: string) => `Your pick, ${pick}, is one of the two to rule out first.`;
/** "You reached the final two: B against D." (DISPLAY letters: the pick, then the best answer). */
export const finalTwoLine = (pick: string, best: string) => `You reached the final two: ${pick} against ${best}.`;

/** The v2 tip that starts with this label ("Eliminate", "Final two"), or undefined. */
export function tipByLabel(tips: readonly string[], label: 'Eliminate' | 'Final two'): string | undefined {
  return tips.find((t) => typeof t === 'string' && t.startsWith(`${label}:`));
}

/**
 * The option letters a tip names: ORIGINAL letters from its {{X}} tokens, in
 * the order they first appear, each once. A tip with no tokens names none.
 */
export function tipLetters(tip: string | undefined): Letter[] {
  const out: Letter[] = [];
  if (!tip) return out;
  for (const m of tip.matchAll(/\{\{([A-D])\}\}/g)) {
    const l = m[1] as Letter;
    if (!out.includes(l)) out.push(l);
  }
  return out;
}

/**
 * Which pick-aware line a WRONG pick gets, or null for the usual line.
 * `correct` and `picked` are ORIGINAL letters (grade and compare on originals).
 */
export function pickCoachKind(tips: readonly string[], correct: Letter, picked: Letter | undefined): PickCoachKind | null {
  if (!picked || picked === correct) return null;
  const eliminate = tipLetters(tipByLabel(tips, 'Eliminate'));
  if (eliminate.length === 2 && eliminate.includes(picked) && !eliminate.includes(correct)) return 'rule-out';
  const finalTwo = tipLetters(tipByLabel(tips, 'Final two'));
  if (finalTwo.length === 2 && finalTwo.includes(picked) && finalTwo.includes(correct)) return 'final-two';
  return null;
}

/**
 * The line itself, in DISPLAY letters for this shuffle, or null when the tips
 * don't name the pick exactly (the caller keeps its usual line then).
 */
export function pickCoachLine(tips: readonly string[], correct: Letter, picked: Letter | undefined, perm: Permutation): string | null {
  const kind = pickCoachKind(tips, correct, picked);
  if (!kind || !picked) return null;
  const pick = originalToDisplay(picked, perm);
  return kind === 'rule-out' ? ruleOutLine(pick) : finalTwoLine(pick, originalToDisplay(correct, perm));
}
