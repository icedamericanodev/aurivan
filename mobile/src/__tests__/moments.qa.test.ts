/**
 * QA probes for Phase 5b signature moments (mobile-qa-tester).
 * Passing tests lock in behaviour that was verified. The four bugs QA first
 * recorded here as `it.failing` (planner on eve/exam day, mindset-growth
 * false positives) are fixed, so they are normal tests now.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { daysToExam, examMoment } from '../engine/examDay';
import { examReadyDue, logReadinessDay, readyHoldDays, shiftDay, type ReadinessDay } from '../engine/examReady';
import { journeyStage } from '../engine/journey';
import { mindsetGrowth, type FirstTry } from '../engine/mindsetGrowth';
import { todaysPlan } from '../engine/planner';
import { createRng } from '../engine/random';
import { daysUntil } from '../lib/useActiveCert';
import { dayKey } from '../engine/streak';
import { selectCert, useProgress } from '../store/progress';

const today = '2026-10-07';

describe('exam-ready: dismissal is sticky', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useProgress.setState({ byCert: {} });
  });

  it('survives an app kill (persist round-trip)', async () => {
    useProgress.getState().dismissReady('cisa');
    const seen = selectCert(useProgress.getState(), 'cisa').moments?.readySeenAt;
    // Simulate a cold start: rehydrate from what was written to storage.
    await new Promise((r) => setTimeout(r, 0));
    const saved = JSON.parse((await AsyncStorage.getItem('aurivan.progress.v1'))!);
    expect(saved.state.byCert.cisa.moments.readySeenAt).toBe(seen);
    await useProgress.persist.rehydrate();
    expect(selectCert(useProgress.getState(), 'cisa').moments?.readySeenAt).toBe(seen);
  });

  it('is per cert: dismissing CISA does not dismiss another cert, and vice versa', () => {
    useProgress.getState().dismissReady('cisa');
    expect(selectCert(useProgress.getState(), 'crisc').moments?.readySeenAt).toBeUndefined();
    useProgress.getState().noteReadiness('crisc', today, 90);
    expect(selectCert(useProgress.getState(), 'cisa').moments?.readySeenAt).toEqual(expect.any(Number));
  });

  it('answering after dismissal keeps the flag (recordAnswer merges moments)', () => {
    useProgress.getState().dismissReady('cisa');
    const seen = selectCert(useProgress.getState(), 'cisa').moments?.readySeenAt;
    useProgress.getState().recordAnswer('cisa', 'd1_001', true);
    useProgress.getState().noteReadiness('cisa', today, 85);
    expect(selectCert(useProgress.getState(), 'cisa').moments?.readySeenAt).toBe(seen);
  });

  it('a pre-v2 (version 1) save without moments still loads', async () => {
    await AsyncStorage.setItem(
      'aurivan.progress.v1',
      JSON.stringify({
        state: {
          byCert: { cisa: { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {} } },
          streak: { current: 0, best: 0, lastDay: null },
          today: { day: '', answered: 0 },
          day: null,
        },
        version: 1,
      }),
    );
    await useProgress.persist.rehydrate();
    expect(selectCert(useProgress.getState(), 'cisa').moments).toBeUndefined();
    expect(examReadyDue(selectCert(useProgress.getState(), 'cisa').moments?.readiness, today, false)).toBe(false);
  });
});

describe('exam-ready: dips and missing days', () => {
  const at = (n: number) => shiftDay(today, n);

  it('a dip on the last logged day before a gap breaks the hold across the gap', () => {
    // 10 days ago: 85; 4 days ago: dipped to 70 then recovered to 85; then no entries until today.
    const log: ReadinessDay[] = [
      { day: at(10), min: 85, last: 85 },
      { day: at(4), min: 70, last: 85 },
      { day: today, min: 85, last: 85 },
    ];
    // today, 1, 2, 3 (carried from day 4's `last` = 85) count; day 4 itself dipped.
    expect(readyHoldDays(log, today)).toBe(4);
  });

  it('a gap carried forward from a low `last` does not count', () => {
    const log: ReadinessDay[] = [
      { day: at(8), min: 70, last: 70 },
      { day: today, min: 90, last: 90 },
    ];
    expect(readyHoldDays(log, today)).toBe(1);
  });

  it('only today logged (new install or after reset): no evidence before it, no panel', () => {
    expect(readyHoldDays([{ day: today, min: 95, last: 95 }], today)).toBe(1);
  });

  it('a backward-travel day (same key logged twice) keeps the lowest', () => {
    let log = logReadinessDay([], today, 85);
    log = logReadinessDay(log, today, 79);
    log = logReadinessDay(log, today, 88);
    expect(log).toEqual([{ day: today, min: 79, last: 88 }]);
  });
});

describe('days to exam (Today header, journey stage, planner)', () => {
  const key = (offset: number) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return dayKey(d.getTime());
  };

  it.each([
    [undefined, null],
    ['not-a-date', null],
    [key(-1), -1],
    [key(0), 0],
    [key(1), 1],
    [key(8), 8],
  ])('daysUntil(%s) = %s', (date, expected) => {
    expect(daysUntil(date)).toBe(expected);
  });

  it('maps to the right stage: past → afterExam, 0..7 → examDay, 8 → normal', () => {
    const base = { readiness: { score: 0, domains: [] } as never, answeredTotal: 0, lessonsDone: 0, lessonsAvailable: 0, mocksTaken: 0 };
    expect(journeyStage({ ...base, daysLeft: -1 })).toBe('afterExam');
    expect(journeyStage({ ...base, daysLeft: 0 })).toBe('examDay');
    expect(journeyStage({ ...base, daysLeft: 7 })).toBe('examDay');
    expect(journeyStage({ ...base, daysLeft: 8 })).toBe('diagnose');
    expect(journeyStage({ ...base, daysLeft: null })).toBe('diagnose');
  });

  it('eve and day agree with daysToExam', () => {
    expect(daysToExam('2026-10-08', today)).toBe(1);
    expect(examMoment('2026-10-08', new Date(`${today}T12:00:00`).getTime())).toBe('eve');
    expect(examMoment('2026-10-06', new Date(`${today}T12:00:00`).getTime())).toBeNull();
  });
});

describe('planner on exam eve / exam day (fixed: rest, not cram)', () => {
  const input = { stage: 'examDay' as const, dueReviews: 45, dailyGoal: 20, daysLeft: 1, examQuestions: 150 };

  it('eve: at most a light 10-question review, no mock', () => {
    const plan = todaysPlan(input);
    const qs = plan.reduce((n, p) => n + ('count' in p ? p.count : 'questions' in p ? p.questions : 0), 0);
    expect(plan.some((p) => p.kind === 'mock')).toBe(false);
    expect(qs).toBeLessThanOrEqual(10);
  });

  it('exam day: no plan items beyond an optional 5-question warm-up', () => {
    const plan = todaysPlan({ ...input, daysLeft: 0 });
    expect(plan.every((p) => p.kind === 'practice' && p.count <= 5)).toBe(true);
  });
});

describe('mindset growth: false improvement (fixed)', () => {
  const DAY = 86_400_000;
  // The app's own seeded generator (engine/random.ts), so runs are repeatable.
  const rnd = createRng(42);

  it('with NO real change (constant 20% runner-up rate), fewer than 5% of learners see "growth"', () => {
    let shows = 0;
    const N = 2000;
    for (let t = 0; t < N; t++) {
      // Spread over 60 days, so the windows ARE far enough apart and the
      // z-test (not the time-gap rule) is what keeps chance dips hidden.
      const tries: FirstTry[] = Array.from({ length: 100 }, (_, i) => ({ at: i * DAY * 0.6, runnerUp: rnd() < 0.2 }));
      if (mindsetGrowth(tries, 60 * DAY).show) shows++;
    }
    expect(shows / N).toBeLessThan(0.05); // was ~13% before the z-test
  });

  it('"first weeks" vs "lately" needs the two windows to be apart in time, not just the first answer 14 days ago', () => {
    // All 100 first tries in ONE sitting on day 0; card shows on day 14 as "first weeks → lately".
    const tries: FirstTry[] = Array.from({ length: 100 }, (_, i) => ({ at: i * 1000, runnerUp: i < 50 ? i % 10 < 4 : i % 10 < 2 }));
    expect(mindsetGrowth(tries, 14 * DAY).show).toBe(false);
  });
});
