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
 */
import { getCertification } from '../content/certifications';
import { planComplete } from '../engine/dayPlan';
import { dayKey } from '../engine/streak';
import { useProgress } from '../store/progress';
import { dailyMinutesOf, useSettings } from '../store/settings';
import { scheduleReminders } from './reminders';

export function refreshReminders(now = Date.now()): Promise<void> {
  const settings = useSettings.getState();
  const { reminder, activeCertId } = settings;
  // Off stays off: turning reminders off in Settings already cancelled them, and the app's start-up
  // pass clears any leftovers. Nothing to refresh here.
  if (!reminder.enabled) return Promise.resolve();
  const plan = useProgress.getState().days[activeCertId];
  const cleared = Boolean(plan && plan.day === dayKey(now) && planComplete(plan));
  const certName = getCertification(activeCertId)?.name ?? 'your exam';
  return Promise.resolve(scheduleReminders(reminder, certName, { now, skipToday: cleared, minutes: dailyMinutesOf(settings) })).then(
    () => undefined,
    () => undefined,
  );
}
