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
import { waitingAt } from '../engine/reminders';
import { dayKey } from '../engine/streak';
import { ownOf, useProgress } from '../store/progress';
import { dailyMinutesOf, useSettings } from '../store/settings';
import { effectiveCertId } from './activeCert';
import { questionExists } from './outline';
import { scheduleReminders } from './reminders';

export function refreshReminders(now = Date.now()): Promise<void> {
  const settings = useSettings.getState();
  const { reminder } = settings;
  // The exam being studied: a stored choice whose content isn't on this phone reads as the default exam (MEDIUM-1).
  const activeCertId = effectiveCertId(settings.activeCertId);
  // Off stays off: turning reminders off in Settings already cancelled them, and the app's start-up
  // pass clears any leftovers. Nothing to refresh here.
  if (!reminder.enabled) return Promise.resolve();
  const progress = useProgress.getState();
  const plan = ownOf(progress.days, activeCertId);
  // Mobile 1.41: the next reminder names what is waiting then (reviews due by its time).
  const cp = ownOf(progress.byCert, activeCertId);
  const waitingFor = cp ? (at: number) => waitingAt(cp.review, cp.answers, at, questionExists(activeCertId)) : undefined;
  const cleared = Boolean(plan && plan.day === dayKey(now) && planComplete(plan));
  const certName = getCertification(activeCertId)?.name ?? 'your exam';
  return Promise.resolve(scheduleReminders(reminder, certName, { now, skipToday: cleared, minutes: dailyMinutesOf(settings), waitingFor })).then(
    () => undefined,
    () => undefined,
  );
}
