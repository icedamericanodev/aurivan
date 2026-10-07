/** Readiness range: honest, narrows with more answers, never a single point. */
import { getCertification } from '../content/certifications';
import { computeReadiness, type AnswerRecord } from '../engine/readiness';
import { RANGE_MIN_ANSWERS, rangeLabel, rangeSpoken, readinessRange } from '../engine/readinessRange';

const cisa = getCertification('cisa')!;

/** `perDomain` answers in every domain, the first `rate` share answered correctly. */
function answers(perDomain: number, rate: number): Record<string, AnswerRecord> {
  const out: Record<string, AnswerRecord> = {};
  for (const d of cisa.domains) {
    for (let i = 0; i < perDomain; i++) {
      const ok = i < Math.round(perDomain * rate);
      out[`d${d.id}_${i}`] = { attempts: 1, correctCount: ok ? 1 : 0, lastCorrect: ok, lastAt: 0 };
    }
  }
  return out;
}
const rangeFor = (perDomain: number, rate: number) =>
  readinessRange(cisa, computeReadiness(cisa, answers(perDomain, rate)));

describe('readinessRange', () => {
  it('says "not enough data" below the threshold', () => {
    const r = rangeFor(7, 0.7); // 35 answers
    expect(r.enough).toBe(false);
    if (!r.enough) expect(r.needed).toBe(RANGE_MIN_ANSWERS - 35);
    expect(rangeSpoken(r)).toBe('not enough data yet');
  });

  it('brackets the readiness score with a sensible width at ~200 answers', () => {
    const r = rangeFor(40, 0.7);
    expect(r.enough).toBe(true);
    if (!r.enough) return;
    expect(r.low).toBeLessThanOrEqual(r.centre);
    expect(r.high).toBeGreaterThanOrEqual(r.centre);
    expect(r.high - r.low).toBeGreaterThanOrEqual(6);
    expect(r.high - r.low).toBeLessThanOrEqual(12);
    expect(rangeLabel(r)).toMatch(/^\d+–\d+$/);
  });

  it('narrows as more answers come in', () => {
    const widths = [10, 40, 160].map((n) => {
      const r = rangeFor(n, 0.7);
      return r.enough ? r.high - r.low : Infinity;
    });
    expect(widths[1]).toBeLessThan(widths[0]);
    expect(widths[2]).toBeLessThan(widths[1]);
  });

  it('is never a single point, even with huge samples', () => {
    const r = rangeFor(5000, 0.7);
    expect(r.enough && r.high - r.low).toBeGreaterThanOrEqual(4);
  });

  it('stays inside 0–100', () => {
    const top = rangeFor(60, 1);
    const bottom = rangeFor(60, 0);
    expect(top.enough && top.high).toBe(100);
    expect(top.enough && top.low).toBeLessThan(100);
    expect(bottom.enough && bottom.low).toBe(0);
    expect(bottom.enough && bottom.high).toBeGreaterThan(0);
  });

  it('treats unpractised domains as zero, not as uncertainty', () => {
    // 60 answers, all in Domain 1: readiness is low and the range stays tight around it.
    const a: Record<string, AnswerRecord> = {};
    for (let i = 0; i < 60; i++) a[`d1_${i}`] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 0 };
    const r = readinessRange(cisa, computeReadiness(cisa, a));
    expect(r.enough && r.high).toBeLessThanOrEqual(22);
  });
});
