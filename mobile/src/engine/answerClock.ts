/**
 * Answer clock: how long the learner spent on ONE question, from the moment
 * it was shown until the answer was committed.
 *
 * Plain English:
 * - The clock starts when a question appears.
 * - When the app goes to the background (phone locked, another app opened),
 *   the clock pauses; when the app comes back, it carries on. So a learner
 *   who answers a call mid-question is not recorded as "slow".
 * - The result is capped (MAX_ANSWER_MS), so a phone left on the table with
 *   the app open cannot record an hour for one question.
 *
 * Pure TypeScript: no React, no AppState. lib/useAnswerClock.ts wires it to
 * the app's foreground/background events. Nothing here is shown to learners
 * yet: it is quiet data for the pace features planned next.
 */

/** Longest time we record for one answer: 30 minutes. */
export const MAX_ANSWER_MS = 30 * 60_000;

export interface AnswerClock {
  /** When the question was shown (epoch ms). */
  startedAt: number;
  /** Set while the app is in the background; null while it is in the foreground. */
  pausedAt: number | null;
  /** Total background time so far, in ms. */
  pausedMs: number;
}

/** A new clock for a question shown at `now`. */
export function startClock(now: number): AnswerClock {
  return { startedAt: now, pausedAt: null, pausedMs: 0 };
}

/** The app went to the background. Pausing twice changes nothing. */
export function pauseClock(clock: AnswerClock, now: number): AnswerClock {
  if (clock.pausedAt !== null) return clock;
  return { ...clock, pausedAt: now };
}

/** The app came back to the foreground. Resuming a running clock changes nothing. */
export function resumeClock(clock: AnswerClock, now: number): AnswerClock {
  if (clock.pausedAt === null) return clock;
  // Math.max: a clock that jumped backwards (time zone change) never adds negative time.
  return { ...clock, pausedAt: null, pausedMs: clock.pausedMs + Math.max(0, now - clock.pausedAt) };
}

/**
 * Foreground time on this question so far, in whole ms, never negative and
 * never above MAX_ANSWER_MS. If the clock is paused right now, the time since
 * the pause is not counted.
 */
export function elapsedMs(clock: AnswerClock, now: number): number {
  const until = clock.pausedAt ?? now;
  const ms = until - clock.startedAt - clock.pausedMs;
  return Math.min(MAX_ANSWER_MS, Math.max(0, Math.round(ms)));
}

/**
 * Add a later visit's time to an earlier total (mock exams: a learner can
 * come back to a question and change the answer). Still capped.
 */
export function addMs(earlier: number | undefined, more: number): number {
  return Math.min(MAX_ANSWER_MS, Math.max(0, (earlier ?? 0) + more));
}
