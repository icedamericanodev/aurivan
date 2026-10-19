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
import { hasFinalWeek } from '../content/exam';
import type { Certification } from '../content/types';
import { lessonsFor } from '../content/lessons';
import { examFocusedOf, planLesson, skippableDomains, type Familiarity } from '../engine/fit';
import { newDayPlan } from '../engine/dayPlan';
import { canPlay } from './games';
import { journeyStage, STAGE_LABEL, stageProgress } from '../engine/journey';
import type { Readiness } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { todaysPlan } from '../engine/planner';
import { dayKey, weekStrip, type Streak } from '../engine/streak';
import { useProgress, type CertProgress } from '../store/progress';
import { useDailyMinutes, useSettings } from '../store/settings';
import { useActiveCert } from './useActiveCert';

export interface JourneyInput {
  cert: Certification;
  progress: CertProgress;
  readiness: Readiness;
  dueCount: number;
  daysLeft: number | null;
  /** Minutes most days (store/settings.ts dailyMinutesOf). */
  dailyMinutes: number;
  /** Mobile 1.15: where the learner is starting from, and their Exam-focused choice (both optional). */
  familiarity?: Familiarity;
  examFocused?: boolean;
  streak: Streak;
  /** A moment inside "today", used for the week strip. */
  now: number;
}

/** Stage, plan and coach lines from progress. Pure: same input, same output. */
export function buildJourney(i: JourneyInput) {
  const { cert, progress, readiness, dueCount, daysLeft, dailyMinutes, familiarity } = i;
  const lessons = lessonsFor(cert.id);
  const answeredTotal = readiness.domains.reduce((n, d) => n + d.answered, 0);
  const focused = examFocusedOf(i);
  const stage = journeyStage({
    readiness,
    answeredTotal,
    lessonsDone: progress.lessonsDone.length,
    lessonsAvailable: lessons.length,
    mocksTaken: progress.mocks.length,
    daysLeft,
    examFocused: focused,
  });
  const focus = readiness.focusDomainId ? getDomain(cert, readiness.focusDomainId) : undefined;
  // The lesson Learn suggests next (the focus domain's first).
  const upNext = planLesson(lessons, progress.lessonsDone, { preferDomainId: focus?.id });
  // The lesson the PLAN offers: a new learner's starting check is replaced
  // by lessons in teaching order; others skip domains they already know
  // (≥ 5 answers at ≥ 80%, engine/fit.ts). Lessons stay open in Learn.
  const planned = planLesson(lessons, progress.lessonsDone, {
    preferDomainId: focus?.id,
    inOrder: familiarity === 'new' && stage === 'diagnose',
    skip: skippableDomains(familiarity, readiness.domains),
  });
  const plannedDomain = planned ? getDomain(cert, planned.domainId) : undefined;
  // The newest mock first (store/progress.ts recordMock keeps newest first).
  const lastMockAt = progress.mocks.reduce<number | null>((t, m) => (t === null || m.finishedAt > t ? m.finishedAt : t), null);
  const lastFullMockAt = progress.mocks
    .filter((m) => m.total === cert.exam.questions)
    .reduce<number | null>((t, m) => (t === null || m.finishedAt > t ? m.finishedAt : t), null);
  const plan = todaysPlan({
    stage,
    dueReviews: dueCount,
    dailyMinutes,
    familiarity,
    examFocused: i.examFocused,
    answered: answeredTotal,
    focusDomain: focus ? { id: focus.id, short: focus.short } : undefined,
    nextLesson: planned
      ? { id: planned.id, title: planned.title, minutes: planned.minutes, domainId: planned.domainId, domainShort: plannedDomain?.short }
      : undefined,
    lastMockAt,
    lastFullMockAt,
    now: i.now,
    daysLeft,
    // A final review week starts with a full mock: no mini mock the day before it.
    finalWeek: hasFinalWeek(cert.id),
    examQuestions: cert.exam.questions,
    examMinutes: cert.exam.minutes,
    // Today never plans a game this certification can't play (registry minPool).
    playable: (id) => canPlay(cert.id, id),
  });
  return {
    stage,
    stageLabel: STAGE_LABEL[stage],
    /** The Exam-focused plan is on (an explicit choice, or experienced by default). */
    examFocused: focused,
    /**
     * "Make it stick": the italic coach line under readiness. No number since
     * mobile 1.13: the plant beside it already counts "growth 4 of 6", and two
     * numbered ladders side by side read as one (PR #43 review).
     */
    stageLine: STAGE_LABEL[stage],
    range: readinessRange(cert, readiness),
    stageProgress: stageProgress(stage),
    plan,
    /** The minutes the plan was sized for (saved with the day's plan). */
    budget: dailyMinutes,
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
  const dailyMinutes = useDailyMinutes();
  const familiarity = useSettings((s) => s.familiarity);
  const examFocused = useSettings((s) => s.examFocused);
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
        dailyMinutes,
        familiarity,
        examFocused,
        streak: streakState,
        now: today.at,
      }),
    [cert, progress, readiness, dueCount, daysLeft, dailyMinutes, familiarity, examFocused, streakState, today.at],
  );

  // Today's plan is frozen the first time Today is shown each day, so items
  // can be ticked off (engine/dayPlan.ts). Until it is stored, show the live one.
  // Plans are kept per cert, so switching certs never wipes the other's ticks.
  const dayValid = !!storedDay && storedDay.day === today.key;
  const fresh = useMemo(
    () => (dayValid ? null : newDayPlan(today.key, cert.id, derived.plan, readiness, derived.budget)),
    [dayValid, today.key, cert.id, derived.plan, readiness, derived.budget],
  );
  useEffect(() => {
    if (fresh) startDay(fresh);
  }, [fresh, startDay]);
  const dayPlan = dayValid ? storedDay : fresh!;

  return { ...active, ...derived, dayPlan };
}
