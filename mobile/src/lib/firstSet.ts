/**
 * The first set — glue between the fixed five questions (content/firstSet.ts)
 * and the app (mobile 1.24).
 *
 * Plain English for the founder:
 * - `startFirstSet` builds the session: the same five questions, in the same
 *   order, with no timer. (Confidence chips are hidden by the session screen
 *   because the session carries the `firstSet` mark.)
 * - `deferMissesToTomorrow` moves the review time of any question missed in
 *   that set to the start of tomorrow. A miss is normally due again at once,
 *   which would let a learner "fix" it from memory a minute later (that is not
 *   spaced review). The closing screen promises "N will come back tomorrow",
 *   and this is what makes that true.
 */
import { FIRST_SET_SIZE, FIRST_SET_TITLE, firstSetIds } from '../content/firstSet';
import { useProgress } from '../store/progress';
import type { ActiveSession } from '../store/session';
import { startFromIds, startPractice } from './sessions';

/**
 * Start the learner's first set. A certification with no fixed set yet gets a
 * short ordinary set instead, so onboarding never dead-ends. Returns the
 * session (null only if no question could be built).
 */
export function startFirstSet(certId: string): ActiveSession | null {
  const ids = [...firstSetIds(certId)];
  if (ids.length === 0) return startPractice(certId, { count: FIRST_SET_SIZE, title: FIRST_SET_TITLE, timed: false });
  return startFromIds(certId, ids, FIRST_SET_TITLE, { firstSet: true, timed: false });
}

/** The start of the next local day, as epoch ms. */
export function startOfTomorrow(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0); // local time, DST-safe
  return d.getTime();
}

/**
 * Questions missed in the first set come back tomorrow, not in a minute.
 * Only an entry that is due right now is moved (never one already pushed
 * further out). Returns how many questions were moved.
 */
export function deferMissesToTomorrow(certId: string, missedIds: readonly string[], now = Date.now()): number {
  const cp = useProgress.getState().byCert[certId];
  if (!cp || missedIds.length === 0) return 0;
  const due = startOfTomorrow(now);
  const review = { ...cp.review };
  let moved = 0;
  for (const id of missedIds) {
    const entry = review[id];
    if (entry && entry.dueAt < due) {
      review[id] = { ...entry, dueAt: due };
      moved += 1;
    }
  }
  if (moved > 0) useProgress.setState((s) => ({ byCert: { ...s.byCert, [certId]: { ...s.byCert[certId]!, review } } }));
  return moved;
}
