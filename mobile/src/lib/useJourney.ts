/**
 * useJourney() — the learner's place on the Exam Journey and today's plan,
 * computed from their real progress. Every screen that shows "what next"
 * reads from here, so the advice is consistent everywhere.
 */
import { useEffect, useMemo } from 'react';
import { getDomain } from '../content/certifications';
import { lessonsFor, nextLesson } from '../content/lessons';
import { newDayPlan } from '../engine/dayPlan';
import { journeyStage, STAGE_LABEL, STAGE_ORDER, stageProgress } from '../engine/journey';
import { readinessRange } from '../engine/readinessRange';
import { todaysPlan } from '../engine/planner';
import { dayKey, weekStrip } from '../engine/streak';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { useActiveCert } from './useActiveCert';

export function useJourney() {
  const active = useActiveCert();
  const { cert, progress, readiness, dueCount, daysLeft } = active;
  const dailyGoal = useSettings((s) => s.dailyGoal);
  const streakState = useProgress((s) => s.streak);
  const storedDay = useProgress((s) => s.day);
  const startDay = useProgress((s) => s.startDay);

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
      /** "Stage 3 · Make it stick" — the italic coach line under readiness. */
      stageLine: `Stage ${STAGE_ORDER.indexOf(stage) + 1} · ${STAGE_LABEL[stage]}`,
      range: readinessRange(cert, readiness),
      stageProgress: stageProgress(stage),
      plan,
      focus,
      upNext,
      answeredTotal,
      week: weekStrip(streakState, Date.now()),
    };
  }, [cert, progress, readiness, dueCount, daysLeft, dailyGoal, streakState]);

  // Today's plan is frozen the first time Today is shown each day, so items
  // can be ticked off (engine/dayPlan.ts). Until it is stored, show the live one.
  const today = dayKey(Date.now());
  const dayValid = storedDay && storedDay.day === today && storedDay.certId === cert.id;
  const fresh = useMemo(
    () => (dayValid ? null : newDayPlan(today, cert.id, derived.plan, readiness)),
    [dayValid, today, cert.id, derived.plan, readiness],
  );
  useEffect(() => {
    if (fresh) startDay(fresh);
  }, [fresh, startDay]);
  const dayPlan = dayValid ? storedDay : fresh!;

  return { ...active, ...derived, dayPlan };
}
