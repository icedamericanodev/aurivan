/**
 * useJourney() — the learner's place on the Exam Journey and today's plan,
 * computed from their real progress. Every screen that shows "what next"
 * reads from here, so the advice is consistent everywhere.
 *
 * `buildJourney()` is the same maths without React, so lib/activity.ts can
 * start a new day's plan after midnight without a screen being open.
 */
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { getDomain } from '../content/certifications';
import type { Certification } from '../content/types';
import { lessonsFor, nextLesson } from '../content/lessons';
import { getAllQuestions } from '../content/loader';
import { newDayPlan } from '../engine/dayPlan';
import { isPlayable } from '../engine/games/registry';
import { journeyStage, STAGE_LABEL, STAGE_ORDER, stageProgress } from '../engine/journey';
import type { Readiness } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { todaysPlan } from '../engine/planner';
import { dayKey, weekStrip, type Streak } from '../engine/streak';
import { useProgress, type CertProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { useActiveCert } from './useActiveCert';

export interface JourneyInput {
  cert: Certification;
  progress: CertProgress;
  readiness: Readiness;
  dueCount: number;
  daysLeft: number | null;
  dailyGoal: number;
  streak: Streak;
  /** A moment inside "today", used for the week strip. */
  now: number;
}

/** Stage, plan and coach lines from progress. Pure: same input, same output. */
export function buildJourney(i: JourneyInput) {
  const { cert, progress, readiness, dueCount, daysLeft, dailyGoal } = i;
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
    // Today never plans a game this certification can't play (registry minPool).
    playable: (id) => isPlayable(id, getAllQuestions(cert.id)),
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
    week: weekStrip(i.streak, i.now),
  };
}

/** Milliseconds from `ms` until the next local midnight (plus a small margin). */
function msToMidnight(ms: number): number {
  const next = new Date(ms);
  next.setHours(24, 0, 0, 0); // local time, DST-safe
  return Math.max(1_000, next.getTime() - ms + 500);
}

/**
 * The current local day, kept in state so render stays pure. It refreshes
 * when the app comes back to the foreground and at local midnight, so a
 * Today screen left open overnight rolls over to the new day's plan.
 */
function useToday(): { key: string; at: number } {
  const [today, setToday] = useState(() => {
    const at = Date.now();
    return { key: dayKey(at), at };
  });
  useEffect(() => {
    const refresh = () => {
      const at = Date.now();
      const key = dayKey(at);
      // Keep the same object when the day hasn't changed (no re-render).
      setToday((t) => (t.key === key ? t : { key, at }));
    };
    const timer = setTimeout(refresh, msToMidnight(today.at));
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [today.at]);
  return today;
}

export function useJourney() {
  const active = useActiveCert();
  const { cert, progress, readiness, dueCount, daysLeft } = active;
  const dailyGoal = useSettings((s) => s.dailyGoal);
  const streakState = useProgress((s) => s.streak);
  const storedDay = useProgress((s) => s.days[cert.id]);
  const startDay = useProgress((s) => s.startDay);
  const today = useToday();

  const derived = useMemo(
    () =>
      buildJourney({
        cert,
        progress,
        readiness,
        dueCount,
        daysLeft,
        dailyGoal,
        streak: streakState,
        now: today.at,
      }),
    [cert, progress, readiness, dueCount, daysLeft, dailyGoal, streakState, today.at],
  );

  // Today's plan is frozen the first time Today is shown each day, so items
  // can be ticked off (engine/dayPlan.ts). Until it is stored, show the live one.
  // Plans are kept per cert, so switching certs never wipes the other's ticks.
  const dayValid = !!storedDay && storedDay.day === today.key;
  const fresh = useMemo(
    () => (dayValid ? null : newDayPlan(today.key, cert.id, derived.plan, readiness)),
    [dayValid, today.key, cert.id, derived.plan, readiness],
  );
  useEffect(() => {
    if (fresh) startDay(fresh);
  }, [fresh, startDay]);
  const dayPlan = dayValid ? storedDay : fresh!;

  return { ...active, ...derived, dayPlan };
}
