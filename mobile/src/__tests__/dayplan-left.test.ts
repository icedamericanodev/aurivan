/**
 * Release bug hunt round 4: "Short on time? 5 questions" counts toward today's plan.
 * The 5 answers were banked as credit on the step, but the step still showed and started its
 * full count. planLeft sizes each open review/practice step to what is left (count less credit,
 * at least 1) for showing and starting, without changing the saved plan.
 */
import { todayMinutes } from '../components/journey';
import { logActivity, newDayPlan, planLeft, remainingCount, type DayPlan } from '../engine/dayPlan';
import { MINUTES_PER_QUESTION } from '../engine/pace';
import type { PlanItem } from '../engine/planner';
import type { Readiness } from '../engine/readiness';

jest.mock('../components/icons', () => new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : () => null) }));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const READINESS = { score: 0.5, domains: [] } as unknown as Readiness;
const LESSON: PlanItem = { kind: 'lesson', lessonId: 'l1', title: 'Business impact analysis', minutes: 5 };
const PRACTICE: PlanItem = { kind: 'practice', domainId: '4', count: 8, label: 'IS Operations · 8 questions', why: 'weak' };
const REVIEW: PlanItem = { kind: 'review', count: 8, due: 8 };
const short = { kind: 'session' as const, answered: 5, total: 5, minutes: 6 };

const afterShortSet = (items: PlanItem[], mode: 'practice' | 'review'): DayPlan =>
  logActivity(newDayPlan('2026-11-06', 'cisa', items, READINESS, 15), { ...short, mode, byDomain: { '4': 5 } }).plan;

describe('the short set counts toward its step', () => {
  it('5 answers on an 8-question practice step leave 3 to start and about 4 min; the card total drops', () => {
    const plan = afterShortSet([LESSON, PRACTICE], 'practice');
    expect(plan.credit).toEqual([0, 5]); // saved as before
    expect(plan.done).toEqual([false, false]);
    expect(remainingCount(plan, 1)).toBe(3);
    const left = planLeft(plan);
    const step = left.items[1];
    expect(step.kind === 'practice' && step.count).toBe(3);
    expect(step.kind === 'practice' && step.label).toBe('IS Operations · 3 questions');
    // The saved plan is not changed.
    expect(plan.items[1]).toBe(PRACTICE);
    expect(Math.round(todayMinutes(left.items, left.done))).toBe(Math.round(5 + 3 * MINUTES_PER_QUESTION)); // about 9
    expect(todayMinutes(left.items, left.done)).toBeLessThan(todayMinutes(plan.items, plan.done));
    expect(Math.round(3 * MINUTES_PER_QUESTION)).toBe(4);
  });

  it('a review step: 8 due less 5 answered leaves 3, with its minutes', () => {
    const plan = afterShortSet([REVIEW, LESSON], 'review');
    const left = planLeft(plan);
    expect(left.items[0].kind === 'review' && left.items[0].count).toBe(3);
    expect(todayMinutes(left.items, left.done, 3)).toBe(9); // about 4 min for the step, 5 for the lesson
  });

  it('nothing banked: the same plan object; never less than 1; done steps and other kinds untouched', () => {
    const fresh = newDayPlan('2026-11-06', 'cisa', [LESSON, PRACTICE], READINESS, 15);
    expect(planLeft(fresh)).toBe(fresh);
    const over: DayPlan = { ...fresh, credit: [0, 6] };
    expect(remainingCount(over, 1)).toBe(2);
    expect(remainingCount({ ...fresh, credit: [0, 50] }, 1)).toBe(1);
    expect(remainingCount(fresh, 0)).toBe(0);
    const doneStep: DayPlan = { ...fresh, credit: [0, 7], done: [false, true] };
    expect(planLeft(doneStep).items[1]).toBe(PRACTICE);
  });
});
