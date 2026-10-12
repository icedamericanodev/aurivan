/**
 * Performance (1.15.x): readinessFor shares one computation per answers
 * object, so an answer no longer recomputes readiness for every mounted tab.
 */
import { getCertification } from '../content/certifications';
import { computeReadiness, readinessFor, type AnswerRecord } from '../engine/readiness';

const cert = getCertification('cisa')!;
const rec = (correct: boolean): AnswerRecord => ({ attempts: 1, correctCount: correct ? 1 : 0, lastCorrect: correct, lastAt: 1 });

describe('readinessFor', () => {
  it('gives exactly what computeReadiness gives', () => {
    const answers = { d1_001: rec(true), d2_001: rec(false), d3_001: rec(true) };
    expect(readinessFor(cert, answers)).toEqual(computeReadiness(cert, answers));
  });

  it('the same answers object is computed once; a new one (a change) is computed again', () => {
    const answers = { d1_001: rec(true) };
    const first = readinessFor(cert, answers);
    expect(readinessFor(cert, answers)).toBe(first);
    const changed = { ...answers, d1_002: rec(false) };
    const second = readinessFor(cert, changed);
    expect(second).not.toBe(first);
    expect(second.domains[0].answered).toBe(2);
  });

  it('is per certification object (another blueprint is never served the cached result)', () => {
    const answers = { d1_001: rec(true), d2_001: rec(true) };
    const other = { ...cert, domains: cert.domains.map((d, i) => ({ ...d, weight: i === 0 ? 0.9 : 0.025 })) };
    expect(readinessFor(other, answers)).not.toBe(readinessFor(cert, answers));
  });
});
