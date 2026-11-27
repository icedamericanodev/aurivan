/**
 * Sibling groups (docs/content/CIA_BANK_PLAN.md section 11, item 5).
 *
 * Plain English for the founder: a "sibling group" is a small set of questions
 * that teach the same lesson in nearly the same way. Seeing one right after
 * the other gives the second answer away, so:
 *   - a mock (full, short or mini) takes AT MOST ONE question per group, always
 *     (oneOfEachGroup, used by engine/blueprint.ts buildMockExam);
 *   - practice, review, daily and game sets also keep siblings apart, but only
 *     as far as the set can still be its normal size: when keeping them apart
 *     would leave the set empty or short, a sibling comes back, placed AFTER
 *     its partner (spreadSiblings). Such a "relaxed" sibling is the only
 *     question in a set with an EARLIER question of its own group
 *     (isRelaxedSibling), so its answer can be marked and a later first-try
 *     readiness can leave it out.
 *
 * The group comes from the pack question's optional `siblingGroup` (written by
 * scripts/siblings-pack.cjs). No live course has one today, and every function
 * here gives back exactly what it was given when no question has a group, so
 * CISA's sets and mocks are drawn exactly as before (same ids, same order,
 * same random numbers used).
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import type { PackQuestion } from '../content/types';
import { shuffled, type Rng } from './random';

/** A question id's sibling group, or undefined when it has none (or is unknown). */
export type GroupOf = (id: string) => string | undefined;

/** True when at least one of these ids has a sibling group. */
function anyGrouped(ids: readonly string[], groupOf: GroupOf): boolean {
  return ids.some((id) => groupOf(id) !== undefined);
}

/**
 * Keep siblings apart in a non-mock set of `ids` (already in the order the set
 * should run), without making the set shorter.
 *
 * 1. Walk the ids in order; the first of each group stays, a later sibling is
 *    set aside.
 * 2. Fill the gap from `spares` (called only when something was set aside):
 *    other questions the set could have used, best first. A spare already in
 *    the set, or whose group is already in the set, is skipped.
 * 3. Still short of the original length: RELAX. The set-aside siblings come
 *    back, in their order, at the END of the set, so each sits after its
 *    partner (isRelaxedSibling then finds it).
 *
 * The very same array comes back when no id has a group, or none had to move.
 */
export function spreadSiblings(ids: readonly string[], groupOf: GroupOf, spares?: () => readonly string[]): readonly string[] {
  if (!anyGrouped(ids, groupOf)) return ids;
  const kept: string[] = [];
  const setAside: string[] = [];
  const used = new Set<string>();
  for (const id of ids) {
    const g = groupOf(id);
    if (g !== undefined && used.has(g)) {
      setAside.push(id);
      continue;
    }
    kept.push(id);
    if (g !== undefined) used.add(g);
  }
  if (setAside.length === 0) return ids;
  const target = ids.length;
  const inSet = new Set(ids);
  // Step 2: other questions, so the set stays its normal size with no sibling in it twice.
  for (const id of spares ? spares() : []) {
    if (kept.length >= target) break;
    if (inSet.has(id)) continue;
    const g = groupOf(id);
    if (g !== undefined && used.has(g)) continue;
    kept.push(id);
    inSet.add(id);
    if (g !== undefined) used.add(g);
  }
  // Step 3: relax only as far as the set's normal size needs.
  for (const id of setAside) {
    if (kept.length >= target) break;
    kept.push(id);
  }
  return kept;
}

/**
 * True when the question `id` in this set came back by the relaxed rule: an
 * EARLIER question of the same set is in its sibling group. False for a
 * question with no group, and for the first of each group.
 */
export function isRelaxedSibling(ids: readonly string[], id: string, groupOf: GroupOf): boolean {
  const g = groupOf(id);
  if (g === undefined) return false;
  for (const other of ids) {
    if (other === id) return false;
    if (groupOf(other) === g) return true;
  }
  return false;
}

/**
 * A mock's pool with at most one question per sibling group: a random one of
 * each group (so each sibling has its turn over many mocks), questions with no
 * group all kept, in the pool's order. The very same array, and no random
 * number used, when no question has a group (every live course), so a CISA
 * mock is drawn exactly as before.
 */
export function oneOfEachGroup(pool: PackQuestion[], rng: Rng): PackQuestion[] {
  if (!pool.some((q) => q.siblingGroup !== undefined)) return pool;
  const chosen = new Map<string, string>(); // group → the id that stays
  for (const q of shuffled(pool, rng)) {
    if (q.siblingGroup !== undefined && !chosen.has(q.siblingGroup)) chosen.set(q.siblingGroup, q.id);
  }
  return pool.filter((q) => q.siblingGroup === undefined || chosen.get(q.siblingGroup) === q.id);
}

/**
 * A game round of `size` from `ordered` (the round's candidates, best or
 * random first) with siblings kept apart by spreadSiblings, the rest of
 * `ordered` as the spares. Without `groupOf`, or with no group in the round,
 * it is exactly `ordered.slice(0, size)`.
 */
export function takeApart(ordered: readonly string[], size: number, groupOf?: GroupOf): string[] {
  const first = ordered.slice(0, size);
  return groupOf ? [...spreadSiblings(first, groupOf, () => ordered.slice(size))] : first;
}

/** The answer option that marks a relaxed sibling's answer (store/progress.ts recordAnswer), or nothing. */
export function relaxedMark(ids: readonly string[], id: string, groupOf: GroupOf): { sibling?: true } {
  return isRelaxedSibling(ids, id, groupOf) ? { sibling: true } : {};
}
