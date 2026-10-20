/**
 * Which questions belong to an exam-mindset principle (mobile 1.31).
 *
 * Plain English:
 * - Each question may carry a `principleId`: the ONE principle it most tests
 *   (docs/content/PRINCIPLE_TAGGING.md). About 730 of the bank are tagged.
 * - Each principle also lists a short, hand-picked `practiceIds` set.
 * - A principle's questions are BOTH, without repeats: every question tagged
 *   with it, plus any of its hand-picked ones that carry no tag yet. (A
 *   hand-picked id tagged with ANOTHER principle belongs to that one.)
 * - "Practice this principle" asks PRINCIPLE_SET_SIZE (10, as on the web),
 *   drawn from all of them: questions never seen first, then the ones missed
 *   last time, then the rest (engine/queue.ts).
 *
 * Pure TypeScript: no React, no storage. The screen's memo lives in
 * lib/principleQuestions.ts, so the bank is scanned once, not every render.
 */
import type { PackQuestion } from '../content/types';
import { buildPracticeQueue } from './queue';
import type { AnswerRecord } from './readiness';
import type { Rng } from './random';

/** principle id → the ids of the questions tagged with it, in bank order. */
export type PrincipleIndex = ReadonlyMap<string, readonly string[]>;

/** One pass over the bank: every tagged question filed under its principle. */
export function indexByPrinciple(questions: readonly PackQuestion[]): PrincipleIndex {
  const index = new Map<string, string[]>();
  for (const q of questions) {
    if (!q.principleId) continue;
    const list = index.get(q.principleId);
    if (list) list.push(q.id);
    else index.set(q.principleId, [q.id]);
  }
  return index;
}

/**
 * A principle's questions: the ones tagged with it, then its hand-picked
 * `practiceIds` that are untagged, no repeats. Ids no longer in the bank
 * (`find` says undefined) are left out.
 */
export function principleQuestionIds(
  principleId: string,
  practiceIds: readonly string[],
  index: PrincipleIndex,
  find: (id: string) => PackQuestion | undefined,
): string[] {
  const out = new Set<string>();
  for (const id of index.get(principleId) ?? []) if (find(id)) out.add(id);
  for (const id of practiceIds) {
    const q = find(id);
    // Untagged only: a tag elsewhere means the question tests another principle.
    if (q && !q.principleId) out.add(id);
  }
  return [...out];
}

/** How many questions one "Practice this principle" set asks (the web draws 10 too). */
export const PRINCIPLE_SET_SIZE = 10;

/** The set size: PRINCIPLE_SET_SIZE, or fewer when the principle has fewer questions. */
export function principleSetSize(available: number): number {
  return Math.min(PRINCIPLE_SET_SIZE, available);
}

/**
 * The practice set: `count` ids drawn ONLY from `ids` (a principle's
 * questions), unseen first, then missed last time, then the rest, each
 * group shuffled (the same queue every practice set uses).
 */
export function principlePracticeSet(
  ids: readonly string[],
  find: (id: string) => PackQuestion | undefined,
  answers: Record<string, AnswerRecord>,
  count: number,
  rng: Rng,
): string[] {
  const pool = ids.map(find).filter((q): q is PackQuestion => Boolean(q));
  return buildPracticeQueue(pool, answers, count, rng);
}
