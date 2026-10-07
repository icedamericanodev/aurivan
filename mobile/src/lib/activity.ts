/**
 * logActivity — tell today's plan that something was finished (a session,
 * a lesson, a game). If it ticked off a plan item, give a light tap so the
 * learner feels the step land (spec §10.6 "Plan item done").
 */
import { getCertification } from '../content/certifications';
import type { Activity } from '../engine/dayPlan';
import { GAME_MINUTES, LESSON_MINUTES, newDayPlan } from '../engine/dayPlan';
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
  const cert = getCertification(certId);
  if (!cert) return;
  const now = Date.now();
  const today = dayKey(now);
  const state = useProgress.getState();
  const stored = state.days[certId];
  if (stored && stored.day === today) return;
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
  state.startDay(newDayPlan(today, certId, plan, readiness));
}

export function logActivity(certId: string, a: Activity) {
  ensureTodayPlan(certId);
  if (useProgress.getState().logActivity(certId, a)) haptic.light();
}

export const logLesson = (certId: string, lessonId: string) =>
  logActivity(certId, { kind: 'lesson', lessonId, minutes: LESSON_MINUTES });

export const logGame = (certId: string, gameId: string) =>
  logActivity(certId, { kind: 'game', gameId, minutes: GAME_MINUTES });
