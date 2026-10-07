/**
 * QA regressions for the Grove redesign: saved-progress compatibility for
 * the new `day` / `haptics` keys, the frozen day plan across midnight,
 * readiness-range edge cases, and the "runner-up" line on the real bank.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCertification } from '../content/certifications';
import type { Letter } from '../content/types';
import { getAllQuestions } from '../content/loader';
import { newDayPlan, activityMatches } from '../engine/dayPlan';
import type { PlanItem } from '../engine/planner';
import { computeReadiness, type AnswerRecord } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { makePermutation, originalToDisplay, renderText } from '../engine/shuffle';
import { dayKey } from '../engine/streak';
import { runnerUp } from '../engine/tips';
import { createRng } from '../engine/random';
import { logActivity } from '../lib/activity';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

// Use the library's in-memory mock. babel-jest hoists jest.mock() above the
// imports, so it still takes effect before any module loads AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const cisa = getCertification('cisa')!;
const empty = computeReadiness(cisa, {});

describe('saved progress from before Grove still loads', () => {
  it('a v1 progress save without `day` hydrates with no day plans and keeps answers', async () => {
    const old = {
      state: {
        byCert: {
          cisa: {
            answers: { d1_001: { attempts: 2, correctCount: 1, lastCorrect: true, lastAt: 1 } },
            review: {},
            mistakes: {},
            bookmarks: ['d2_010'],
            mocks: [],
            lessonsDone: [],
            games: {},
          },
        },
        streak: { current: 3, best: 5, lastDay: '2026-10-06' },
        today: { day: '2026-10-06', answered: 4 },
      },
      version: 1,
    };
    await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(old));
    await useProgress.persist.rehydrate();
    const p = useProgress.getState();
    expect(p.days).toEqual({});
    expect(selectCert(p, 'cisa').answers.d1_001.lastCorrect).toBe(true);
    expect(selectCert(p, 'cisa').bookmarks).toEqual(['d2_010']);
    expect(p.streak.best).toBe(5);
    // No plan yet: logging an activity is a harmless no-op.
    expect(p.logActivity('cisa', { kind: 'lesson', lessonId: 'x', minutes: 3 })).toBe(false);
  });

  it('a v1 save with the old single `day` plan migrates it under its cert', async () => {
    const plan = newDayPlan('2026-10-06', 'cisa', [{ kind: 'lesson', lessonId: 'L1', title: 'L1' }], empty);
    await AsyncStorage.setItem(
      'aurivan.progress.v1',
      JSON.stringify({ state: { byCert: {}, streak: { current: 0, best: 0, lastDay: null }, day: plan }, version: 1 }),
    );
    await useProgress.persist.rehydrate();
    const p = useProgress.getState();
    expect(p.days.cisa).toEqual(plan);
    expect('day' in p).toBe(false);
  });

  it('switching certs keeps each cert’s ticks', () => {
    const items: PlanItem[] = [{ kind: 'lesson', lessonId: 'L1', title: 'L1' }];
    const today = dayKey(Date.now());
    useProgress.getState().startDay(newDayPlan(today, 'cisa', items, empty));
    expect(useProgress.getState().logActivity('cisa', { kind: 'lesson', lessonId: 'L1', minutes: 3 })).toBe(true);
    useProgress.getState().startDay(newDayPlan(today, 'cism', items, empty));
    expect(useProgress.getState().days.cisa!.done).toEqual([true]);
    expect(useProgress.getState().days.cism!.done).toEqual([false]);
  });

  it('a v1 settings save without `haptics` keeps haptics on', async () => {
    await AsyncStorage.setItem(
      'aurivan.settings.v1',
      JSON.stringify({ state: { theme: 'dark', onboarded: true, activeCertId: 'cisa' }, version: 1 }),
    );
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().haptics).toBe(true);
    expect(useSettings.getState().theme).toBe('dark');
  });
});

describe('frozen day plan across midnight', () => {
  const items: PlanItem[] = [{ kind: 'lesson', lessonId: 'L1', title: 'L1' }];
  afterEach(() => jest.useRealTimers());

  it("does not tick or count answers into yesterday's plan after midnight", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 7, 23, 59, 0));
    useProgress.getState().resetCert('cisa');
    useProgress.getState().startDay(newDayPlan(dayKey(Date.now()), 'cisa', items, empty));
    useProgress.getState().recordAnswer('cisa', 'd1_001', true);
    expect(useProgress.getState().days.cisa!.answered).toBe(1);

    jest.setSystemTime(new Date(2026, 9, 8, 0, 1, 0));
    useProgress.getState().recordAnswer('cisa', 'd1_002', false);
    const ticked = useProgress.getState().logActivity('cisa', { kind: 'lesson', lessonId: 'L1', minutes: 3 });
    const day = useProgress.getState().days.cisa!;
    expect(ticked).toBe(false);
    expect(day.day).toBe('2026-10-07');
    expect(day.answered).toBe(1);
    expect(day.done).toEqual([false]);
  });

  it('activity after midnight starts and ticks the new day’s plan', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 7, 23, 59, 0));
    useProgress.getState().resetCert('cisa');
    useProgress.getState().startDay(newDayPlan(dayKey(Date.now()), 'cisa', items, empty));
    jest.setSystemTime(new Date(2026, 9, 8, 0, 1, 0));
    // A fresh learner's plan is the 20-question diagnostic: 16 answers finish it.
    logActivity('cisa', { kind: 'session', mode: 'practice', answered: 16, total: 20, minutes: 15 });
    const day = useProgress.getState().days.cisa!;
    expect(day.day).toBe('2026-10-08');
    expect(day.done[0]).toBe(true);
  });

  it('resetting a cert drops its day plan but not another cert’s', () => {
    useProgress.getState().startDay(newDayPlan(dayKey(Date.now()), 'cisa', items, empty));
    useProgress.getState().resetCert('cism');
    expect(useProgress.getState().days.cisa).toBeDefined();
    useProgress.getState().resetCert('cisa');
    expect(useProgress.getState().days.cisa).toBeUndefined();
  });
});

describe('readinessRange edge cases', () => {
  const rec = (ok: boolean): AnswerRecord => ({ attempts: 1, correctCount: ok ? 1 : 0, lastCorrect: ok, lastAt: 0 });
  const build = (spec: Record<string, [number, number]>) => {
    const a: Record<string, AnswerRecord> = {};
    for (const [d, [n, right]] of Object.entries(spec)) for (let i = 0; i < n; i++) a[`d${d}_${i}`] = rec(i < right);
    return readinessRange(cisa, computeReadiness(cisa, a));
  };

  it('zero answers → not enough data', () => {
    const r = build({});
    expect(r).toEqual({ enough: false, answered: 0, needed: 40 });
  });

  it('one domain only: centre is that domain’s weight share, range stays valid', () => {
    const r = build({ '1': [60, 60] });
    expect(r.enough).toBe(true);
    if (!r.enough) return;
    expect(r.low).toBeGreaterThanOrEqual(0);
    expect(r.low).toBeLessThanOrEqual(r.centre);
    expect(r.high).toBeGreaterThanOrEqual(r.centre);
    expect(r.high - r.low).toBeGreaterThanOrEqual(4);
    expect(r.high).toBeLessThan(40); // one domain cannot read as exam-ready
  });

  it('100% everywhere clamps at 100 and still shows a range', () => {
    const r = build({ '1': [60, 60], '2': [60, 60], '3': [60, 60], '4': [60, 60], '5': [60, 60] });
    expect(r.enough).toBe(true);
    if (!r.enough) return;
    expect(r.centre).toBe(100);
    expect(r.high).toBe(100);
    expect(r.low).toBeLessThan(100);
  });

  it('0% everywhere clamps at 0', () => {
    const r = build({ '1': [20, 0], '2': [20, 0] });
    if (!r.enough) throw new Error('expected a range');
    expect(r.low).toBe(0);
    expect(r.high).toBeGreaterThan(0);
  });

  it('exactly 40 answers is enough; 39 is not', () => {
    expect(build({ '1': [39, 20] }).enough).toBe(false);
    expect(build({ '1': [40, 20] }).enough).toBe(true);
  });
});

describe('runner-up and display letters on the real bank', () => {
  const qs = getAllQuestions('cisa');

  it('every "Final two" tip names a real, non-key option', () => {
    const bad: string[] = [];
    for (const q of qs) {
      const r = runnerUp(q.tips, q.correct);
      if (!q.tips.some((t) => /^Final two:/.test(t))) continue;
      if (!r || r === q.correct || q.options[r as Letter] === undefined) bad.push(q.id);
    }
    expect(bad).toEqual([]);
  });

  it('after a shuffle, "Best answer · X" and "Why X" letter shows the key text', () => {
    const rng = createRng(7);
    for (const q of qs.slice(0, 300)) {
      const perm = makePermutation(q, rng);
      const shown = originalToDisplay(q.correct, perm);
      expect(perm['ABCD'.indexOf(shown)]).toBe(q.correct);
      // Rendered tips never leak an unreplaced {{X}} token.
      for (const t of q.tips) expect(renderText(t, perm)).not.toMatch(/\{\{[A-D]\}\}/);
    }
  });
});

describe('day-plan ticking', () => {
  const diag: PlanItem = { kind: 'practice', count: 20, label: 'Diagnostic: 20 mixed questions' };
  // Fixed: the target is 80% of item.count, so a one-question "Saved" session
  // (mode practice, total 1) no longer completes a 20-question item.
  it('a 1-question session should not complete a 20-question practice item', () => {
    expect(activityMatches(diag, { kind: 'session', mode: 'practice', answered: 1, total: 1, minutes: 1 })).toBe(false);
  });
});
