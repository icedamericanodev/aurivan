import { getCertification } from '../content/certifications';
import type { PackQuestion } from '../content/types';
import { allocate, buildMockExam } from '../engine/blueprint';
import { createRng } from '../engine/random';
import { computeReadiness, MIN_SAMPLE } from '../engine/readiness';
import { bumpStreak, visibleStreak, yesterdayKey } from '../engine/streak';

const cisa = getCertification('cisa')!;

describe('allocate (largest remainder)', () => {
  it('always sums to the total', () => {
    for (const total of [1, 7, 50, 150]) {
      expect(allocate(total, [18, 18, 12, 26, 26]).reduce((a, b) => a + b, 0)).toBe(total);
    }
  });
  it('matches the CISA blueprint for a 150-question mock', () => {
    expect(allocate(150, [18, 18, 12, 26, 26])).toEqual([27, 27, 18, 39, 39]);
  });
});

describe('mock exam builder', () => {
  const diffs = ['analysis', 'application', 'foundational'] as const;
  const pool: PackQuestion[] = [];
  for (const d of cisa.domains) {
    for (let i = 0; i < 60; i++) {
      pool.push({ id: `d${d.id}_${i}`, domainId: d.id, difficulty: diffs[i % 3] } as PackQuestion);
    }
  }
  it('returns the requested count, unique, weighted by domain', () => {
    const ids = buildMockExam(cisa, pool, createRng(7), 150);
    expect(ids).toHaveLength(150);
    expect(new Set(ids).size).toBe(150);
    const d4 = ids.filter((id) => id.startsWith('d4_')).length;
    expect(d4).toBe(39);
  });
  it('tops up when the pool is thin', () => {
    const thin = pool.filter((q) => q.domainId !== '3');
    expect(buildMockExam(cisa, thin, createRng(1), 150)).toHaveLength(150);
  });
});

describe('readiness', () => {
  it('is 0 with no answers and points at a domain to start', () => {
    const r = computeReadiness(cisa, {});
    expect(r.score).toBe(0);
    expect(r.reliable).toBe(false);
    expect(r.focusDomainId).toBe('1');
  });
  it('does not show 100% mastery from a tiny sample', () => {
    const answers = { d1_1: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 0 } };
    const d1 = computeReadiness(cisa, answers).domains[0];
    expect(d1.accuracy).toBe(1);
    expect(d1.mastery).toBeCloseTo(1 / MIN_SAMPLE);
  });
  it('reaches 100 only when every domain is mastered', () => {
    const answers: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }> = {};
    for (const d of cisa.domains) {
      for (let i = 0; i < MIN_SAMPLE; i++) answers[`d${d.id}_${i}`] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 0 };
    }
    const r = computeReadiness(cisa, answers);
    expect(r.score).toBe(100);
    expect(r.reliable).toBe(true);
  });
});

describe('streak', () => {
  const day = 86_400_000;
  const t0 = new Date(2026, 0, 10, 12).getTime();
  it('counts consecutive days and resets after a gap', () => {
    let s = bumpStreak({ current: 0, best: 0, lastDay: null }, t0);
    s = bumpStreak(s, t0 + 1000); // same day — no change
    expect(s.current).toBe(1);
    s = bumpStreak(s, t0 + day);
    expect(s.current).toBe(2);
    s = bumpStreak(s, t0 + 4 * day);
    expect(s).toMatchObject({ current: 1, best: 2 });
    expect(visibleStreak(s, t0 + 7 * day)).toBe(0);
  });
});

describe('yesterdayKey (DST-safe)', () => {
  it('steps back one calendar day across month and year boundaries', () => {
    expect(yesterdayKey(new Date(2026, 10, 1, 23, 30).getTime())).toBe('2026-10-31');
    expect(yesterdayKey(new Date(2026, 2, 9, 0, 30).getTime())).toBe('2026-03-08');
    expect(yesterdayKey(new Date(2027, 0, 1, 8).getTime())).toBe('2026-12-31');
  });
});
