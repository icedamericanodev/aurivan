/** The frozen daily plan: ticking items off and the clearing card numbers. */
import { GAMES } from '../engine/games/registry';
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
    // A short session does not finish a bigger item on its own: the target is
    // 80% of the PLANNED count, not of the session size.
    expect(activityMatches(review, { kind: 'session', mode: 'review', answered: 4, total: 5, minutes: 3 })).toBe(false);
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
    // A game's length comes from its round size (engine/games/registry.ts).
    expect(itemMinutes(items[2])).toBe(GAMES.trap.minutes);
  });

  it('adds up answers across sessions the same day', () => {
    let p = newDayPlan('2026-10-07', 'cisa', items, empty);
    let r = logActivity(p, { kind: 'session', mode: 'review', answered: 10, total: 10, minutes: 6 });
    expect(r.ticked).toBe(false);
    expect(r.plan.credit?.[0]).toBe(10);
    p = r.plan;
    r = logActivity(p, { kind: 'session', mode: 'review', answered: 6, total: 6, minutes: 4 });
    expect(r.ticked).toBe(true); // 16 of 20 = 80%
    expect(r.plan.done).toEqual([true, false, false]);
  });

  it('a plan saved before credit existed still accumulates', () => {
    const { credit: _drop, ...old } = newDayPlan('d', 'cisa', items, empty);
    const r = logActivity(old, { kind: 'session', mode: 'review', answered: 16, total: 16, minutes: 9 });
    expect(r.ticked).toBe(true);
  });

  it('a domain-focused item only counts answers from that domain', () => {
    const focus: PlanItem[] = [{ kind: 'practice', domainId: '4', count: 10, label: '10 questions · D4' }];
    const p = newDayPlan('d', 'cisa', focus, empty);
    const other = logActivity(p, {
      kind: 'session', mode: 'practice', answered: 10, total: 10, minutes: 6, byDomain: { '1': 10 },
    });
    expect(other.ticked).toBe(false);
    expect(other.plan.credit?.[0]).toBe(0);
    const mixed = logActivity(other.plan, {
      kind: 'session', mode: 'practice', answered: 10, total: 10, minutes: 6, byDomain: { '4': 8, '2': 2 },
    });
    expect(mixed.ticked).toBe(true);
    // No per-domain breakdown: a domain item gets no credit.
    expect(activityMatches(focus[0], { kind: 'session', mode: 'practice', answered: 10, total: 10, minutes: 6 })).toBe(false);
  });
});
