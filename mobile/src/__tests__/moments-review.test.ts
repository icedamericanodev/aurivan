/**
 * Phase 5b review fixes:
 *   1. the planner rests on exam eve and exam day (and the ready panel waits);
 *   2. Settings can change the exam date, which rebuilds today's plan;
 *   3. a submitted mock logs readiness once, after the whole batch.
 * (Mindset-growth statistics are tested in moments.test.ts and moments.qa.test.ts.)
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { getAllQuestions } from '../content/loader';
import { newDayPlan, replanDay } from '../engine/dayPlan';
import { addDays, dateInMonths, EXAM_DATE_PRESETS, examDateLabel, presetIndexFor } from '../engine/examDay';
import { examReadyDue, READY_DAYS, shiftDay, type ReadinessDay } from '../engine/examReady';
import { EVE_MAX, todaysPlan, WARM_UP } from '../engine/planner';
import { dayKey } from '../engine/streak';
import { changeExamDate } from '../lib/activity';
import { finishSession } from '../lib/finishSession';
import { selectCert, useProgress } from '../store/progress';
import { useSession, type ActiveSession } from '../store/session';
import { useSettings } from '../store/settings';

const readiness = { score: 0.5, domains: [], focusDomainId: undefined } as never;

describe('planner: exam eve and exam day are for rest', () => {
  const base = { stage: 'examDay' as const, dailyGoal: 40, daysLeft: 1, examQuestions: 150 };

  it('eve with reviews due: ONE light review, capped at 10', () => {
    expect(todaysPlan({ ...base, dueReviews: 45 })).toEqual([{ kind: 'review', count: EVE_MAX, label: 'Light review · up to 10' }]);
    expect(todaysPlan({ ...base, dueReviews: 3 })).toEqual([{ kind: 'review', count: 3, label: 'Light review · up to 10' }]);
  });

  it('eve with nothing due: ONE light practice set of 10, no game, no mock', () => {
    expect(todaysPlan({ ...base, dueReviews: 0 })).toEqual([{ kind: 'practice', count: EVE_MAX, label: 'Light review · up to 10' }]);
  });

  it('exam day: only an optional five-question warm-up, even with reviews due', () => {
    expect(todaysPlan({ ...base, daysLeft: 0, dueReviews: 45 })).toEqual([
      { kind: 'practice', count: WARM_UP, label: 'Optional warm-up · 5 questions' },
    ]);
  });

  it('the eve rule wins over any stage (e.g. a learner still in "mock")', () => {
    const plan = todaysPlan({ ...base, stage: 'mock', dueReviews: 0 });
    expect(plan.some((p) => p.kind === 'mock' || p.kind === 'game')).toBe(false);
  });

  it('two days out, the normal exam-week plan is unchanged', () => {
    const plan = todaysPlan({ ...base, daysLeft: 2, dueReviews: 0 });
    expect(plan.map((p) => p.kind)).toEqual(['practice', 'game']);
  });
});

describe('exam-ready panel waits on exam eve and exam day', () => {
  const today = '2026-10-07';
  const log: ReadinessDay[] = Array.from({ length: READY_DAYS }, (_, k) => ({ day: shiftDay(today, k), min: 90, last: 90 }));

  it('is due on a normal day, hidden when the exam is tomorrow or today', () => {
    expect(examReadyDue(log, today, false)).toBe(true);
    expect(examReadyDue(log, today, false, true)).toBe(false);
  });
});

describe('exam date helpers (onboarding + Settings)', () => {
  const now = new Date(2026, 9, 7, 12).getTime(); // 7 Oct 2026, local noon

  it('presets give calendar months, and the matching chip is found again', () => {
    expect(dateInMonths(1, now)).toBe('2026-11-07');
    expect(presetIndexFor('2026-12-07', now)).toBe(1);
    expect(presetIndexFor(undefined, now)).toBe(EXAM_DATE_PRESETS.length - 1); // "Not sure yet"
    expect(presetIndexFor('2026-12-08', now)).toBe(-1); // stepped by a day: no preset chip
  });

  it('steps by days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-07', -7)).toBe('2026-09-30');
  });

  it('labels the date the short app way', () => {
    expect(examDateLabel('2027-01-12')).toBe('12 Jan 2027');
  });
});

describe('replanDay keeps today’s numbers, not old ticks', () => {
  it('same day and cert: new items, old answers/minutes/start', () => {
    const old = { ...newDayPlan('2026-10-07', 'cisa', [{ kind: 'practice', count: 20, label: 'x' }], readiness), answered: 7, correct: 5, minutes: 9, done: [true] };
    const fresh = newDayPlan('2026-10-07', 'cisa', [{ kind: 'practice', count: 5, label: 'warm-up' }], readiness);
    const next = replanDay(old, fresh);
    expect(next.items).toEqual(fresh.items);
    expect(next.done).toEqual([false]);
    expect([next.answered, next.correct, next.minutes]).toEqual([7, 5, 9]);
    expect(next.start).toBe(old.start);
  });

  it('another day (or no plan): the fresh plan as is', () => {
    const fresh = newDayPlan('2026-10-07', 'cisa', [], readiness);
    expect(replanDay(undefined, fresh)).toBe(fresh);
    expect(replanDay({ ...fresh, day: '2026-10-06', answered: 3 }, fresh)).toBe(fresh);
  });
});

describe('Settings → exam date rebuilds today’s plan', () => {
  const today = dayKey(Date.now());

  beforeEach(() => {
    useProgress.getState().resetCert('cisa');
    useSettings.setState({ examDates: { cisa: addDays(today, 60) } });
  });

  it('moving the date to tomorrow swaps a stored plan for the eve plan; today, the warm-up', () => {
    useProgress.getState().startDay({ ...newDayPlan(today, 'cisa', [{ kind: 'practice', count: 20, label: 'Diagnostic' }], readiness), answered: 4 });

    changeExamDate('cisa', addDays(today, 1));
    expect(useSettings.getState().examDates.cisa).toBe(addDays(today, 1));
    let day = useProgress.getState().days.cisa;
    expect(day.items).toEqual([{ kind: 'practice', count: 10, label: 'Light review · up to 10' }]);
    expect(day.answered).toBe(4); // today's numbers survive

    changeExamDate('cisa', today);
    day = useProgress.getState().days.cisa;
    expect(day.items).toEqual([{ kind: 'practice', count: 5, label: 'Optional warm-up · 5 questions' }]);
  });

  it('"Not sure yet" clears the date and the normal plan returns', () => {
    changeExamDate('cisa', addDays(today, 1));
    changeExamDate('cisa', undefined);
    expect(useSettings.getState().examDates.cisa).toBeUndefined();
    expect(useProgress.getState().days.cisa.items[0]).toMatchObject({ kind: 'practice', count: 20 });
  });
});

describe('a submitted mock logs readiness once, after the batch', () => {
  const today = dayKey(Date.now());

  beforeEach(() => {
    useProgress.getState().resetCert('cisa');
    useSession.getState().clear();
  });

  it('a mid-batch low (the first answers are "not enough data") cannot reset the 7-day hold', () => {
    // Six earlier days held at 86; today is the mock.
    const log: ReadinessDay[] = Array.from({ length: READY_DAYS - 1 }, (_, k) => ({ day: shiftDay(today, k + 1), min: 86, last: 86 }));
    const cp = selectCert(useProgress.getState(), 'cisa');
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...cp, moments: { readiness: log } } } }));

    // A 150-question mock, 30 per domain, all right.
    const byDomain = new Map<string, string[]>();
    for (const q of getAllQuestions('cisa')) byDomain.set(q.domainId, [...(byDomain.get(q.domainId) ?? []), q.id]);
    const ids = [...byDomain.values()].flatMap((xs) => xs.slice(0, 30));
    const session: ActiveSession = {
      id: 'm1',
      mode: 'mock',
      certId: 'cisa',
      title: 'Mock',
      questionIds: ids,
      perms: {},
      index: 0,
      responses: Object.fromEntries(ids.map((id) => [id, { display: 'A' as const, correct: true }])),
      flagged: [],
      startedAt: Date.now() - 60_000,
    };
    useSession.setState({ active: session });
    finishSession();

    const moments = selectCert(useProgress.getState(), 'cisa').moments!;
    const entry = moments.readiness!.find((e) => e.day === today)!;
    // One reading: the day's minimum IS the final value (not null from answer 1).
    expect(entry.min).not.toBeNull();
    expect(entry.min).toBe(entry.last);
    expect(entry.min!).toBeGreaterThanOrEqual(80);
    expect(examReadyDue(moments.readiness, today, false)).toBe(true);
  });
});
