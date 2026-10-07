/**
 * logActivity — tell today's plan that something was finished (a session,
 * a lesson, a game). If it ticked off a plan item, give a light tap so the
 * learner feels the step land (spec §10.6 "Plan item done").
 */
import { getCertification } from '../content/certifications';
import type { Activity } from '../engine/dayPlan';
import { GAME_MINUTES, LESSON_MINUTES, newDayPlan, replanDay } from '../engine/dayPlan';
import { computeReadiness } from '../engine/readiness';
import { dueIds } from '../engine/srs';
import { dayKey } from '../engine/streak';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { haptic } from './haptics';
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
 * numbers (engine/dayPlan.ts replanDay). Used when the exam date changes.
 */
function buildTodayPlan(certId: string, keepToday: boolean) {
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
    dueCount: dueIds(progress.review, now).length,
    daysLeft: daysUntil(settings.examDates[certId]),
    dailyGoal: settings.dailyGoal,
    streak: state.streak,
    now,
  });
  const fresh = newDayPlan(today, certId, plan, readiness);
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

export function logActivity(certId: string, a: Activity) {
  ensureTodayPlan(certId);
  if (useProgress.getState().logActivity(certId, a)) haptic.light();
}

export const logLesson = (certId: string, lessonId: string) =>
  logActivity(certId, { kind: 'lesson', lessonId, minutes: LESSON_MINUTES });

export const logGame = (certId: string, gameId: string) =>
  logActivity(certId, { kind: 'game', gameId, minutes: GAME_MINUTES });
