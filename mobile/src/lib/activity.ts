/**
 * logActivity — tell today's plan that something was finished (a session,
 * a lesson, a game). If it ticked off a plan item, give a light tap so the
 * learner feels the step land (spec §10.6 "Plan item done").
 */
import { getCertification } from '../content/certifications';
import { findLesson } from '../content/lessons';
import { LESSON_MINUTES, newDayPlan, planComplete, replanDay, type Activity, type DayPlan } from '../engine/dayPlan';
import { gameMinutes } from '../engine/games/registry';
import { computeReadiness } from '../engine/readiness';
import { dueIds } from '../engine/srs';
import { dayKey } from '../engine/streak';
import { selectCert, useProgress } from '../store/progress';
import { dailyMinutesOf, useSettings } from '../store/settings';
import { haptic } from './haptics';
import { questionExists } from './outline';
import { refreshReminders } from './reminderSync';
import { daysUntil } from './useActiveCert';
import { buildJourney } from './useJourney';

/**
 * Make sure this cert has a plan for TODAY. Normally the Today screen stores
 * it on first view; but if the app stayed open past midnight (or the learner
 * went straight to a lesson), the stored plan is yesterday's and would ignore
 * the activity. In that case build today's plan now, the same way Today does.
 */
export function ensureTodayPlan(certId: string) {
  const stored = useProgress.getState().days[certId];
  if (stored && stored.day === dayKey(Date.now())) return;
  buildTodayPlan(certId, false);
}

/**
 * Build today's plan from current progress and settings and store it.
 * `keepToday`: a plan already stored for today is REPLACED, keeping today's
 * numbers (engine/dayPlan.ts replanDay). Used when the exam date or the fit changes.
 */
export function buildTodayPlan(certId: string, keepToday: boolean) {
  const cert = getCertification(certId);
  if (!cert) return;
  const now = Date.now();
  const today = dayKey(now);
  const state = useProgress.getState();
  const settings = useSettings.getState();
  const progress = selectCert(state, certId);
  const readiness = computeReadiness(cert, progress.answers);
  const { plan } = buildJourney({
    cert,
    progress,
    readiness,
    dueCount: dueIds(progress.review, now, questionExists(certId)).length,
    daysLeft: daysUntil(settings.examDates[certId]),
    dailyMinutes: dailyMinutesOf(settings),
    familiarity: settings.familiarity,
    examFocused: settings.examFocused,
    streak: state.streak,
    now,
  });
  const fresh = newDayPlan(today, certId, plan, readiness, dailyMinutesOf(settings));
  state.startDay(keepToday ? replanDay(state.days[certId], fresh) : fresh);
}

/**
 * Settings → Exam date. Saves the new date (undefined = "Not sure yet") and
 * rebuilds today's frozen plan for that cert, so the eve / exam-day plan (or
 * the normal one, if the date moved away) shows straight away.
 */
export function changeExamDate(certId: string, date: string | undefined) {
  useSettings.getState().setExamDate(certId, date);
  buildTodayPlan(certId, true);
}

/**
 * Nothing done yet on today's plan (or no plan for today): a change of fit
 * can rebuild it now. Answers banked on an item that isn't ticked yet count
 * as started (code review M2): that plan stays, so they still move it.
 */
export function planUntouched(plan: DayPlan | undefined, today = dayKey(Date.now())): boolean {
  return !plan || plan.day !== today || (!plan.done.some(Boolean) && !(plan.credit ?? []).some((n) => n > 0));
}

/**
 * Settings → Your study and the fit screen (mobile 1.15, PHASE5.md §2.3):
 * save the fit, then rebuild today's plan for the active cert IF nothing in
 * it is ticked yet. Otherwise today's plan stays as it is and tomorrow's
 * fits. Returns whether today's plan was kept (the screen says so in one line).
 */
export function changeFit(certId: string, fit: Parameters<ReturnType<typeof useSettings.getState>['setFit']>[0]): { keptToday: boolean } {
  useSettings.getState().setFit(fit);
  if (planUntouched(useProgress.getState().days[certId])) {
    buildTodayPlan(certId, true);
    return { keptToday: false };
  }
  return { keptToday: true };
}

export function logActivity(certId: string, a: Activity) {
  ensureTodayPlan(certId);
  if (useProgress.getState().logActivity(certId, a)) {
    haptic.light();
    // The plan was just cleared: re-plan the reminders now, so today's is skipped even if the learner
    // closes the app on Results without seeing Today (refreshReminders does nothing when they are off).
    const plan = useProgress.getState().days[certId];
    if (plan && certId === useSettings.getState().activeCertId && planComplete(plan)) refreshReminders().catch(() => {});
  }
}

// The lesson's own length (mobile 1.15: the same minutes the plan and Learn show).
export const logLesson = (certId: string, lessonId: string) =>
  logActivity(certId, { kind: 'lesson', lessonId, minutes: findLesson(lessonId)?.minutes ?? LESSON_MINUTES });

export const logGame = (certId: string, gameId: string) =>
  logActivity(certId, { kind: 'game', gameId, minutes: gameMinutes(gameId) });
