/** The frozen daily plan: ticking items off and the clearing card numbers. */
import { getCertification } from '../content/certifications';
import {
  activityMatches,
  biggestGrowth,
  clearingTitle,
  currentIndex,
  dayAccuracy,
  itemMinutes,
  logActivity,
  logAnswer,
  newDayPlan,
  planComplete,
} from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import { computeReadiness } from '../engine/readiness';

const cisa = getCertification('cisa')!;
const empty = computeReadiness(cisa, {});
const items: PlanItem[] = [
  { kind: 'review', count: 20 },
  { kind: 'lesson', lessonId: 'cisa-l-d5-mfa', title: 'MFA' },
  { kind: 'game', gameId: 'trap', label: 'Trap Spotter' },
];

describe('day plan', () => {
  it('starts with nothing done', () => {
    const p = newDayPlan('2026-10-07', 'cisa', items, empty);
    expect(p.done).toEqual([false, false, false]);
    expect(currentIndex(p)).toBe(0);
    expect(planComplete(p)).toBe(false);
  });

  it('a session counts once 80% of the planned questions are answered', () => {
    const review = items[0];
    expect(activityMatches(review, { kind: 'session', mode: 'review', answered: 15, total: 20, minutes: 9 })).toBe(false);
    expect(activityMatches(review, { kind: 'session', mode: 'review', answered: 16, total: 20, minutes: 9 })).toBe(true);
    // Fewer questions in the session than planned: 80% of what was there.
    expect(activityMatches(review, { kind: 'session', mode: 'review', answered: 4, total: 5, minutes: 3 })).toBe(true);
    // Wrong mode never counts.
    expect(activityMatches(review, { kind: 'session', mode: 'practice', answered: 20, total: 20, minutes: 9 })).toBe(false);
  });

  it('ticks items, adds minutes and completes', () => {
    let p = newDayPlan('2026-10-07', 'cisa', items, empty);
    let r = logActivity(p, { kind: 'game', gameId: 'sprint', minutes: 2 });
    expect(r.ticked).toBe(false);
    expect(r.plan.minutes).toBe(2);
    p = logActivity(r.plan, { kind: 'session', mode: 'review', answered: 20, total: 20, minutes: 11 }).plan;
    p = logActivity(p, { kind: 'lesson', lessonId: 'cisa-l-d5-mfa', minutes: 3 }).plan;
    expect(currentIndex(p)).toBe(2);
    r = logActivity(p, { kind: 'game', gameId: 'trap', minutes: 2 });
    expect(r.ticked).toBe(true);
    expect(planComplete(r.plan)).toBe(true);
    expect(r.plan.minutes).toBe(18);
    expect(clearingTitle(r.plan)).toBe('Three of three, done.');
  });

  it('an empty plan is never "complete"', () => {
    expect(planComplete(newDayPlan('d', 'cisa', [], empty))).toBe(false);
  });

  it('counts answers and accuracy', () => {
    let p = newDayPlan('d', 'cisa', items.slice(0, 2), empty);
    expect(dayAccuracy(p)).toBeNull();
    p = logAnswer(logAnswer(logAnswer(p, true), true), false);
    expect(dayAccuracy(p)).toBe(67);
    expect(clearingTitle(p)).toBe('Two of two, done.');
  });

  it('finds the domain that grew most, and nothing when none grew', () => {
    const p = newDayPlan('d', 'cisa', items, empty);
    const later = computeReadiness(cisa, {
      d4_1: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 0 },
      d4_2: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 0 },
      d1_1: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 0 },
    });
    expect(biggestGrowth(p, later)).toEqual({ domainId: '4', points: 20 });
    expect(biggestGrowth(p, empty)).toBeNull();
  });

  it('estimates minutes per item', () => {
    expect(itemMinutes({ kind: 'practice', count: 10, label: '' })).toBe(12);
    expect(itemMinutes(items[1])).toBe(3);
    expect(itemMinutes(items[2])).toBe(2);
  });
});
