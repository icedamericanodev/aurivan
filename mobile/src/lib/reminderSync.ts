/**
 * Keeping the rolling reminders fresh (mobile 1.24).
 *
 * Plain English for the founder: only the next 7 reminders are ever
 * scheduled (lib/reminders.ts), so the app re-plans them whenever it is
 * opened and whenever today's plan is cleared. That is what makes them fade
 * after a week away, and what skips today's reminder once you have studied.
 *
 * `refreshReminders` reads what it needs from the saved settings and
 * progress, so any screen can call it with no arguments. It never asks for
 * permission and never throws (a failed schedule is simply tried again at the
 * next open).
 *
 * Mobile 1.41: it also counts the reviews waiting at the next reminder's
 * time, so that reminder can say "The 2 you missed are back". It runs after
 * every finished session too (lib/activity.ts), so the count stays true.
 */
import { getCertification } from '../content/certifications';
import { planComplete } from '../engine/dayPlan';
import { daysToExam } from '../engine/examDay';
import { capWaiting, examDayEnd } from '../engine/reminderLimits';
import { waitingAt } from '../engine/reminders';
import { dayKey } from '../engine/streak';
import { ownOf, useProgress } from '../store/progress';
import { dailyMinutesOf, examDateOf, useSettings } from '../store/settings';
import { effectiveCertId } from './activeCert';
import { questionExists } from './outline';
import { cancelReminders, notificationsAllowed, scheduleReminders } from './reminders';

export function refreshReminders(now = Date.now()): Promise<void> {
  const settings = useSettings.getState();
  const { reminder } = settings;
  // The exam being studied: a stored choice whose content isn't on this phone reads as the default exam (MEDIUM-1).
  const activeCertId = effectiveCertId(settings.activeCertId);
  // Off stays off: turning reminders off in Settings already cancelled them, and the app's start-up
  // pass clears any leftovers. Nothing to refresh here.
  if (!reminder.enabled) return Promise.resolve();
  // Release bug hunt round 2: the exam date has passed, so Today has no plan ("Exam done"). Clear our
  // reminders and schedule none. The saved choice stays ON, so setting a new date brings them back.
  const examDate = examDateOf(settings.examDates, activeCertId);
  const daysLeft = daysToExam(examDate, dayKey(now));
  if (daysLeft !== null && daysLeft < 0) {
    return Promise.resolve()
      .then(() => cancelReminders())
      .then(
        () => undefined,
        () => undefined,
      );
  }
  const progress = useProgress.getState();
  const plan = ownOf(progress.days, activeCertId);
  // Mobile 1.41: the next reminder names what is waiting then (reviews due by its time).
  // Release bug hunt round 2: capped to the set one tap starts (at most 20), never the queue total.
  const cp = ownOf(progress.byCert, activeCertId);
  const waitingFor = cp ? (at: number) => capWaiting(waitingAt(cp.review, cp.answers, at, questionExists(activeCertId))) : undefined;
  const cleared = Boolean(plan && plan.day === dayKey(now) && planComplete(plan));
  const certName = getCertification(activeCertId)?.name ?? 'your exam';
  // Release bug hunt round 1 (onlyIfAllowed): notifications blocked in the phone's settings schedule
  // nothing (ours are cleared instead), and the saved choice stays on, so the next refresh (at launch,
  // or back in the app, app/_layout.tsx) schedules again once they are allowed. Never asks.
  return Promise.resolve(scheduleReminders(reminder, certName, { now, skipToday: cleared, minutes: dailyMinutesOf(settings), waitingFor, onlyIfAllowed: true, until: examDayEnd(examDate) })).then(
    () => undefined,
    () => undefined,
  );
}

/**
 * Release bug hunt round 1: true only when the phone says notifications are blocked for KaiSip
 * (Settings shows it). Read only (never asks), and it never throws: if the check can't run, it
 * answers false and the screen stays as it was.
 */
export function notificationsBlocked(): Promise<boolean> {
  try {
    return Promise.resolve(notificationsAllowed()).then(
      (allowed) => allowed === false,
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
}
