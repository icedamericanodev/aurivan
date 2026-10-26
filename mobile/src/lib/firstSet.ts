/**
 * The first set — glue between the fixed five questions (content/firstSet.ts)
 * and the app (mobile 1.24).
 *
 * Plain English for the founder:
 * - `startFirstSet` builds the session: the same five questions, in the same
 *   order, with no timer (after a set ended early: only the ones still unanswered). (Confidence chips are hidden by the session screen
 *   because the session carries the `firstSet` mark.)
 * - A question missed in the set comes back at the start of tomorrow, as the
 *   closing screen promises ("The N you missed come back then."). Since mobile
 *   1.43 every miss does (engine/srs.ts nextReview), so the set needs no step
 *   of its own for it.
 */
import { FIRST_SET_SIZE, FIRST_SET_TITLE, firstSetIds } from '../content/firstSet';
import { startOfNextDay } from '../engine/srs';
import { selectCert, useProgress } from '../store/progress';
import type { ActiveSession } from '../store/session';
import { startFromIds, startPractice } from './sessions';

/**
 * The first-set questions this learner has not answered yet, in set order
 * (all five for a new learner). `answers`: the cert's saved answers. Pure, so
 * Today can ask it while rendering.
 */
export function firstSetLeftOf(certId: string, answers: Readonly<Record<string, unknown>>): string[] {
  return firstSetIds(certId).filter((id) => !answers[id]);
}

/** The same, read from the saved progress now. */
export function firstSetLeft(certId: string): string[] {
  return firstSetLeftOf(certId, selectCert(useProgress.getState(), certId).answers);
}

/**
 * Start the learner's first set. A certification with no fixed set yet gets a
 * short ordinary set instead, so onboarding never dead-ends. Returns the
 * session (null only if no question could be built).
 *
 * A first set that was ended early (X → End after 2 answers) starts again
 * with ONLY the questions not answered yet: never a repeat, which would also
 * turn a quick re-answer of a miss into a retest (engine/srs.ts). If all five
 * were already answered, the full set would only repeat them, so an ordinary
 * short set is started instead.
 */
export function startFirstSet(certId: string): ActiveSession | null {
  if (firstSetIds(certId).length === 0) return startPractice(certId, { count: FIRST_SET_SIZE, title: FIRST_SET_TITLE, timed: false });
  const left = firstSetLeft(certId);
  if (left.length === 0) return startPractice(certId, { count: FIRST_SET_SIZE, title: FIRST_SET_TITLE, timed: false });
  return startFromIds(certId, left, FIRST_SET_TITLE, { firstSet: true, timed: false });
}

/** The start of the next local day, as epoch ms (one rule, kept in the engine: srs.ts). */
export const startOfTomorrow = startOfNextDay;
