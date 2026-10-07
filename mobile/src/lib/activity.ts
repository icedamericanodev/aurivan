/**
 * logActivity — tell today's plan that something was finished (a session,
 * a lesson, a game). If it ticked off a plan item, give a light tap so the
 * learner feels the step land (spec §10.6 "Plan item done").
 */
import type { Activity } from '../engine/dayPlan';
import { GAME_MINUTES, LESSON_MINUTES } from '../engine/dayPlan';
import { useProgress } from '../store/progress';
import { haptic } from './haptics';

export function logActivity(certId: string, a: Activity) {
  if (useProgress.getState().logActivity(certId, a)) haptic.light();
}

export const logLesson = (certId: string, lessonId: string) =>
  logActivity(certId, { kind: 'lesson', lessonId, minutes: LESSON_MINUTES });

export const logGame = (certId: string, gameId: string) =>
  logActivity(certId, { kind: 'game', gameId, minutes: GAME_MINUTES });
