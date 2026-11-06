/**
 * Study reminders: where they stop, and how big a number they may name (release bug hunt round 2).
 * Pure rules, no notifications library (lib/reminders.ts and lib/reminderSync.ts use them).
 *
 * Plain English for the founder:
 * - Reminders never fall after exam day. Once the exam has passed, Today has no plan ("Exam done"),
 *   so a reminder promising one would be wrong. `examDayEnd` is the last moment of exam day, and
 *   `beforeCutoff` drops any planned reminder after it.
 * - The next reminder names the set one tap starts, never the whole review queue. A review session
 *   starts at most 20 (srs.ts REVIEW_SESSION_CAP), and every other screen says "20 ready today", so
 *   `capWaiting` caps the count the same way ("The 20 you missed are back", not "The 60 ...").
 *
 * Kept apart from engine/reminders.ts on purpose: that file is also compiled into the website's
 * cloud bundle (assets/kaisip-cloud.js), and these rules are phone-only.
 */
import type { ReminderRequest, WaitingReviews } from './reminders';
import { readyToday } from './srs';

/**
 * The last moment a study reminder may appear for an exam on `examDate` ("2027-06-01"):
 * 23:59:59.999 local time that day. A missing or malformed date = no cut-off (undefined).
 */
export function examDayEnd(examDate: string | undefined): number | undefined {
  if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return undefined;
  const [y, m, d] = examDate.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/**
 * The planned reminders up to the cut-off (all of them when there is none). The plan is in time
 * order with ids r1, r2, ..., so dropping its tail keeps the ids in order.
 */
export function beforeCutoff(plan: readonly ReminderRequest[], until: number | undefined): ReminderRequest[] {
  return until === undefined ? [...plan] : plan.filter((r) => r.at <= until);
}

/**
 * What is waiting, capped to the set one tap starts (at most 20). "The N you missed are back" stays
 * only when every due one was a miss (then every one in the capped set is a miss too); otherwise the
 * misses are kept below the count, so the words say "N questions are back for review".
 */
export function capWaiting(w: WaitingReviews): WaitingReviews {
  const due = readyToday(w.due);
  const missed = w.missed >= w.due ? due : Math.min(w.missed, Math.max(0, due - 1));
  return { due, missed };
}
