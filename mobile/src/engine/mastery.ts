/**
 * Subtopic mastery date — a quiet, permanent record of WHEN a learner first
 * showed they know a subtopic.
 *
 * The rule (Build C, for the mastery badges planned later):
 * - Only an UNASSISTED correct answer counts (no Coach me hint first, and
 *   not inside a game: game answers never count toward mastery).
 * - The learner needs such answers on TWO OR MORE DIFFERENT DAYS for
 *   questions from the same subtopic. One good day can be luck or short-term
 *   memory; a second day shows it stuck (spacing).
 * - The first time that happens, `masteredAt` is set to that day.
 * - It is never unset: a later wrong answer does not take it away.
 *
 * Pure TypeScript: no React, no storage. The progress store keeps one
 * entry per subtopic.
 */

export interface SubtopicMastery {
  /** The first day ("YYYY-MM-DD", local) with an unassisted correct answer in this subtopic. */
  firstDay: string;
  /** The day the subtopic was mastered (ISO date "YYYY-MM-DD"). Never unset once written. */
  masteredAt?: string;
}

/**
 * Note one unassisted correct answer in a subtopic on `day`.
 * Returns the SAME object when nothing changed, so the store can skip a save.
 */
export function noteCleanCorrect(entry: SubtopicMastery | undefined, day: string): SubtopicMastery {
  if (!entry) return { firstDay: day };
  if (entry.masteredAt) return entry; // permanent: nothing more to record
  // A second, different day: mastered on this day. (`day < firstDay` can only
  // happen if the phone's clock moved back; it still counts as another day.)
  if (day !== entry.firstDay) return { ...entry, masteredAt: day };
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
): Record<string, SubtopicMastery> | undefined {
  if (!subtopic || !answer.correct || answer.assisted) return map;
  const prev = map?.[subtopic];
  const next = noteCleanCorrect(prev, day);
  if (next === prev) return map;
  return { ...map, [subtopic]: next };
}
