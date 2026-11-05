/**
 * The answer screen's tips, in Grove Phase 4's one order (design-notes/grove/PHASE4.md section 4).
 *
 * Plain English: under "How to think about it" the tips show as rows in the order they were written
 * (Eliminate two, Final two, Exam cue). Sky answered O1 YES (5 Nov 2026): every row is open in every
 * state, right, miss or Time's up, and only a long Why folds. The answer screen (app/session.tsx) now
 * opens every tip and no longer calls `answerTipRows` or `coachedTip`.
 *
 * Kept, not used by the screen: the 1.43 split (the fallback in PHASE4.md 4.6), where after a miss
 * the Exam cue and the row the coach line talked about were open and the others waited under the
 * Why's "Read more". It stays tested so the fold can come back without a rewrite if Sky reverses O1.
 *
 * Pure: no React, no storage. Labels come from engine/tips.ts `tipParts` (never changed here, because
 * that file is compiled into the website bundle). Letters are never compared here: the caller passes
 * which row the coach named, worked out on ORIGINAL letters (engine/pickCoach.ts).
 */
import { tipParts } from './tips';

/** The tip rows the coach line can name. */
export type CoachedTip = 'Eliminate two' | 'Final two';

/** Labels that always stay open after a miss: the reusable cue (v2), or its older equivalent. */
const ALWAYS_OPEN = new Set(['Exam cue', 'Exam-day shortcut']);

/**
 * Which tip the coach line named. `kind` is pickCoachKind's answer and `fromPickLine` says whether the
 * coach line shown IS that pick-aware line (a slip the learner tagged can win over it). A pick that was
 * the "closest wrong choice" (the runner-up named in Final two) is about the final two as well.
 */
export function coachedTip(kind: 'rule-out' | 'final-two' | null, fromPickLine: boolean, pickedRunnerUp: boolean): CoachedTip | null {
  if (fromPickLine && kind === 'final-two') return 'Final two';
  if (fromPickLine && kind === 'rule-out') return 'Eliminate two';
  if (pickedRunnerUp) return 'Final two';
  return null;
}

/**
 * The tips' indexes, split into the rows shown open and the rows folded under "Read more". Each
 * list keeps the written order. Every tip is in exactly one list; nothing is dropped or repeated.
 */
export function answerTipRows(tips: readonly string[], opts: { correct: boolean; coached: CoachedTip | null }): { open: number[]; folded: number[] } {
  const open: number[] = [];
  const folded: number[] = [];
  tips.forEach((tip, i) => {
    const label = tipParts(tip, i).label;
    const show = opts.correct || ALWAYS_OPEN.has(label) || label === opts.coached;
    (show ? open : folded).push(i);
  });
  return { open, folded };
}
