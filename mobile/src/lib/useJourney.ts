/**
 * useJourney() — the learner's place on the Exam Journey and today's plan,
 * computed from their real progress. Every screen that shows "what next"
 * reads from here, so the advice is consistent everywhere.
 */
import { useMemo } from 'react';
import { getDomain } from '../content/certifications';
import { lessonsFor, nextLesson } from '../content/lessons';
import { journeyStage, STAGE_LABEL, stageProgress } from '../engine/journey';
import { todaysPlan } from '../engine/planner';
import { weekStrip } from '../engine/streak';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { useActiveCert } from './useActiveCert';

export function useJourney() {
  const active = useActiveCert();
  const { cert, progress, readiness, dueCount, daysLeft } = active;
  const dailyGoal = useSettings((s) => s.dailyGoal);
  const streakState = useProgress((s) => s.streak);

  const derived = useMemo(() => {
    const lessons = lessonsFor(cert.id);
    const answeredTotal = readiness.domains.reduce((n, d) => n + d.answered, 0);
    const stage = journeyStage({
      readiness,
      answeredTotal,
      lessonsDone: progress.lessonsDone.length,
      lessonsAvailable: lessons.length,
      mocksTaken: progress.mocks.length,
      daysLeft,
    });
    const focus = readiness.focusDomainId ? getDomain(cert, readiness.focusDomainId) : undefined;
    const upNext = nextLesson(cert.id, progress.lessonsDone, focus?.id);
    const plan = todaysPlan({
      stage,
      dueReviews: dueCount,
      dailyGoal,
      focusDomain: focus ? { id: focus.id, short: focus.short } : undefined,
      nextLesson: upNext ? { id: upNext.id, title: upNext.title } : undefined,
      daysLeft,
      examQuestions: cert.exam.questions,
    });
    return {
      stage,
      stageLabel: STAGE_LABEL[stage],
      stageProgress: stageProgress(stage),
      plan,
      focus,
      upNext,
      answeredTotal,
      week: weekStrip(streakState, Date.now()),
    };
  }, [cert, progress, readiness, dueCount, daysLeft, dailyGoal, streakState]);
  return { ...active, ...derived };
}
