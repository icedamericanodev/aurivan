/**
 * Mindset growth — "am I falling for the tempting runner-up less than I used to?"
 *
 * The signal: how often a FIRST-TRY answer picked the runner-up, the other
 * option named in the question's "Final two:" tip (tips.ts runnerUp). That
 * trap is the heart of the ISACA mindset: two options look right, and only
 * one is the best answer at the right level.
 *
 * Built from data the app already saves (no new history needed):
 *   - answers[id]   one record per question: attempts, lastCorrect, lastAt.
 *   - mistakes[id]  the ORIGINAL letter picked on the latest miss.
 * We only use questions answered exactly ONCE. For those, the single answer
 * is fully known: its time (lastAt), whether it was right, and, if wrong, the
 * letter picked. Questions answered again later (reviews) are left out,
 * because their first answer was overwritten. Missed questions come back for
 * review sooner than correct ones, so leaving re-answered questions out tends
 * to make the early weeks look BETTER than they were: the bias works against
 * showing growth, never for it.
 *
 * The comparison: the first GROWTH_WINDOW first-try answers against the last
 * GROWTH_WINDOW (no overlap), shown as "N in 10".
 *
 * When it shows (all must hold):
 *   - at least GROWTH_MIN_DAYS (14) days between the first answer and now;
 *   - at least 2 × GROWTH_WINDOW (100) first-try answers on Final-two questions;
 *   - the rate dropped by at least GROWTH_MIN_DROP (10 points, one in ten);
 *   - and the "in 10" numbers we would print actually differ (4 → 2, not 3 → 3).
 * Otherwise it stays hidden: no "you got worse" card, ever.
 *
 * Pure TypeScript: no React, no storage.
 */
import type { AnswerRecord } from './readiness';
import { runnerUp } from './tips';

export const GROWTH_WINDOW = 50;
export const GROWTH_MIN_DAYS = 14;
export const GROWTH_MIN_DROP = 0.1;
const DAY_MS = 86_400_000;

/** One first-try answer on a question that has a runner-up. */
export interface FirstTry {
  at: number; // when it was answered (ms)
  runnerUp: boolean; // true = picked the runner-up (a wrong answer)
}

/** What the builder needs to know about one question (ORIGINAL letters). */
export interface GrowthQuestion {
  correct: string;
  tips: string[];
}

/**
 * First-try answers, oldest first. `lookup` returns the question (or
 * undefined when it is no longer in the bank). `picked` in mistakes is an
 * ORIGINAL letter, compared with the ORIGINAL runner-up letter.
 */
export function firstTries(
  answers: Record<string, AnswerRecord>,
  mistakes: Record<string, { picked?: string }>,
  lookup: (id: string) => GrowthQuestion | undefined,
): FirstTry[] {
  const out: FirstTry[] = [];
  for (const [id, rec] of Object.entries(answers)) {
    if (rec.attempts !== 1) continue;
    const q = lookup(id);
    if (!q) continue;
    const ru = runnerUp(q.tips, q.correct);
    if (!ru) continue; // no "Final two" tip: this question can't show the trap
    const picked = rec.lastCorrect ? q.correct : mistakes[id]?.picked;
    out.push({ at: rec.lastAt, runnerUp: !rec.lastCorrect && picked === ru });
  }
  return out.sort((a, b) => a.at - b.at);
}

export type MindsetGrowth =
  | { show: false; reason: 'too-soon' | 'too-few' | 'no-improvement' }
  | { show: true; earlyIn10: number; lateIn10: number; earlyRate: number; lateRate: number; line: string; spoken: string };

/** "N in 10", rounded to the nearest whole number. */
const in10 = (rate: number) => Math.round(rate * 10);

export function mindsetGrowth(tries: FirstTry[], now: number): MindsetGrowth {
  if (tries.length === 0 || now - tries[0].at < GROWTH_MIN_DAYS * DAY_MS) return { show: false, reason: 'too-soon' };
  if (tries.length < GROWTH_WINDOW * 2) return { show: false, reason: 'too-few' };
  const rate = (xs: FirstTry[]) => xs.filter((x) => x.runnerUp).length / xs.length;
  const earlyRate = rate(tries.slice(0, GROWTH_WINDOW));
  const lateRate = rate(tries.slice(-GROWTH_WINDOW));
  const earlyIn10 = in10(earlyRate);
  const lateIn10 = in10(lateRate);
  if (earlyRate - lateRate < GROWTH_MIN_DROP - 1e-9 || earlyIn10 <= lateIn10) return { show: false, reason: 'no-improvement' };
  const lately = lateIn10 === 0 ? 'Lately it’s fewer than 1 in 10.' : `Lately it’s ${lateIn10} in 10.`;
  const line = `In your first weeks you picked the tempting runner-up ${earlyIn10} ${earlyIn10 === 1 ? 'time' : 'times'} in 10. ${lately}`;
  const spoken = line.replace(/’/g, "'");
  return { show: true, earlyIn10, lateIn10, earlyRate, lateRate, line, spoken };
}
