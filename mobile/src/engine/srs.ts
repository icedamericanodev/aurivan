/**
 * Spaced repetition (Leitner boxes) — a direct port of the web app's
 * review queue so learners get the same behaviour on mobile.
 *
 * Idea in plain English: every question you miss goes into Box 1 and is
 * due again immediately. Each time you answer it correctly (and you were
 * not just guessing), it moves up a box and comes back later:
 *   Box 1 → now, Box 2 → 1 day, Box 3 → 3 days, Box 4 → 7 days, Box 5 → 16 days.
 * Answer it correctly from Box 5 and it "graduates" out of the queue.
 *
 * A correct first answer marked "guessing" or "unsure" also enters the queue
 * (Box 1 or Box 2, due tomorrow), so lucky guesses are re-tested.
 *
 * Coach me (assisted answers): a right answer after a hint is real progress,
 * but it is weaker evidence, so it does NOT move the question up a box. It
 * stays in its box and comes back after that box's (shorter) interval.
 */
export type Confidence = 'sure' | 'unsure' | 'guessing';

export interface ReviewEntry {
  box: number; // 1..MAX_BOX
  dueAt: number; // epoch ms
  lastSeen: number; // epoch ms
  reps: number; // how many times it was reviewed
}

export const INTERVAL_DAYS: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 };
export const MAX_BOX = 5;
export const DAY_MS = 86_400_000;

/**
 * Work out the new review entry after an answer.
 * Returns `null` when the question should NOT be in the queue
 * (never missed and answered with confidence, or just graduated).
 * `assisted` = answered after Coach me: a correct answer is re-spaced at the
 * same box instead of promoted, so it comes back sooner.
 */
export function nextReview(
  current: ReviewEntry | undefined,
  correct: boolean,
  confidence: Confidence | undefined,
  now: number,
  assisted = false,
): ReviewEntry | null {
  if (!correct) {
    // Wrong → back to Box 1, due right away.
    return { box: 1, dueAt: now, lastSeen: now, reps: (current?.reps ?? 0) + 1 };
  }
  if (!current) {
    // First time in the queue. A confident correct answer needs no review.
    // But a lucky guess, or a shaky "unsure" hit, is weak evidence: bring it
    // back so it is re-tested (re-testing low-confidence correct answers
    // improves retention). Guess → Box 1, unsure → Box 2; both due
    // tomorrow, never right now (the learner has just seen the answer).
    if (confidence === 'guessing') return { box: 1, dueAt: now + DAY_MS, lastSeen: now, reps: 1 };
    if (confidence === 'unsure') return { box: 2, dueAt: now + INTERVAL_DAYS[2] * DAY_MS, lastSeen: now, reps: 1 };
    return null;
  }

  if (confidence === 'guessing' || assisted) {
    // A lucky guess, or a right answer after a hint, does not earn a
    // promotion — re-space at the same box (a shorter wait than promoting).
    return {
      ...current,
      dueAt: now + INTERVAL_DAYS[current.box] * DAY_MS,
      lastSeen: now,
      reps: current.reps + 1,
    };
  }
  if (current.box >= MAX_BOX) return null; // graduated 🎓

  const box = current.box + 1;
  return { box, dueAt: now + INTERVAL_DAYS[box] * DAY_MS, lastSeen: now, reps: current.reps + 1 };
}

/** Question ids due now — most overdue first, then lowest box. */
export function dueIds(review: Record<string, ReviewEntry>, now: number): string[] {
  return Object.keys(review)
    .filter((id) => review[id].dueAt <= now)
    .sort((a, b) => review[a].dueAt - review[b].dueAt || review[a].box - review[b].box);
}
