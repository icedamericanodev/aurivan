/**
 * Subtopic mastery date — a quiet, permanent record of WHEN a learner first
 * showed they know a subtopic.
 *
 * The rule (Build C, for the mastery badges planned later):
 * - Only an UNASSISTED correct answer counts (no Coach me hint first, and
 *   not inside a game: game answers never count toward mastery).
 * - The learner needs such answers on TWO OR MORE DIFFERENT DAYS for
 *   questions from the same subtopic, AND at least 12 hours apart (so 23:50
 *   then 00:10 is not "two days"). One good day can be luck or short-term
 *   memory; a second day shows it stuck (spacing).
 * - The first time that happens, `masteredAt` is set to that day.
 * - It is never unset: a later wrong answer does not take it away.
 *
 * Pure TypeScript: no React, no storage. The progress store keeps one
 * entry per subtopic.
 */

/** The least time between the first and the mastering answer. */
export const MIN_SPACING_MS = 12 * 3_600_000;

export interface SubtopicMastery {
  /** The first day ("YYYY-MM-DD", local) with an unassisted correct answer in this subtopic. */
  firstDay: string;
  /**
   * When that first answer was given (epoch ms). Optional: entries saved
   * before this field use the day comparison alone.
   */
  firstAt?: number;
  /** The day the subtopic was mastered (ISO date "YYYY-MM-DD"). Never unset once written. */
  masteredAt?: string;
}

/**
 * Note one unassisted correct answer in a subtopic on `day`, at time `at`.
 * Returns the SAME object when nothing changed, so the store can skip a save.
 */
export function noteCleanCorrect(entry: SubtopicMastery | undefined, day: string, at: number): SubtopicMastery {
  if (!entry) return { firstDay: day, firstAt: at };
  if (entry.masteredAt) return entry; // permanent: nothing more to record
  // A second, different day, 12+ hours after the first: mastered on this day.
  // (`day < firstDay` can only happen if the phone's clock moved back; it
  // still counts as another day.) Old entries have no firstAt: day rule only.
  const spaced = entry.firstAt === undefined || Math.abs(at - entry.firstAt) >= MIN_SPACING_MS;
  if (day !== entry.firstDay && spaced) return { ...entry, masteredAt: day };
  return entry;
}

/**
 * Apply one answer to the whole per-subtopic map. Only unassisted correct
 * answers count; anything else returns the same map (no change, no save).
 */
export function recordMastery(
  map: Record<string, SubtopicMastery> | undefined,
  subtopic: string | undefined,
  day: string,
  answer: { correct: boolean; assisted: boolean },
  at: number,
): Record<string, SubtopicMastery> | undefined {
  if (!subtopic || !answer.correct || answer.assisted) return map;
  const prev = map?.[subtopic];
  const next = noteCleanCorrect(prev, day, at);
  if (next === prev) return map;
  return { ...map, [subtopic]: next };
}
