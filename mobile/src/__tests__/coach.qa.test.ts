/**
 * QA probes for Phase 5a (slip coach + Coach me): edge cases the feature
 * tests do not cover — ties, unparseable runner-ups, shuffled letters,
 * readiness maths at the edges, mock exams across a reload, and the
 * priority-word highlight against the real bank.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import type { Letter } from '../content/types';
import { priorityWord } from '../engine/games/priorityLens';
import { computeReadiness, type AnswerRecord } from '../engine/readiness';
import { readinessRange, RANGE_MIN_ANSWERS } from '../engine/readinessRange';
import { displayToOriginal, isCorrect, originalToDisplay, renderText, type Permutation } from '../engine/shuffle';
import { patternsOf, slipCoach, type SlipInput } from '../engine/slipCoach';
import { eliminateTip, runnerUp } from '../engine/tips';
import { useSession, type ActiveSession } from '../store/session';

const cisa = getCertification('cisa')!;
const TIPS = ['Eliminate: {{A}} and {{D}}.', 'Final two: {{B}} beats {{C}}.'];
const mk = (o: Partial<SlipInput>): SlipInput => ({ correct: 'B', tips: TIPS, stem: 'What should the auditor do?', ...o });

describe('slip coach edges', () => {
  it('ties go to PATTERN_ORDER (runner-up beats an equal tag count)', () => {
    const r = slipCoach([
      mk({ slip: 'role', picked: 'C' }),
      mk({ slip: 'role', picked: 'C' }),
      mk({ slip: 'symptom', picked: 'A' }),
      mk({ slip: 'symptom', picked: 'A' }),
      mk({ slip: 'knowledge', picked: 'D' }),
    ]);
    // runner-up 2, role 2, symptom 2 → runner-up wins the tie.
    expect(r.ready && r.pattern).toBe('runner-up');
    expect(r.ready && r.count).toBe(2);
  });

  it('an unparseable "Final two" never yields runner-up and never throws', () => {
    for (const tips of [[], ['Final two: B beats C.'], ['Final two: {{B}} is best.'], ['Final two: {{E}} vs {{B}}']]) {
      expect(runnerUp(tips, 'B')).toBeUndefined();
      expect(patternsOf(mk({ tips, picked: 'C', slip: 'role' }))).toEqual(['role']);
    }
    // Picked undefined (skipped mock item) is never a runner-up.
    expect(patternsOf(mk({ picked: undefined, slip: 'misread' }))).toEqual(['misread']);
  });

  it('runner-up works when the key is listed second in "Final two"', () => {
    expect(patternsOf(mk({ tips: ['Final two: {{C}} loses to {{B}}.'], picked: 'C' }))).toContain('runner-up');
  });

  it('untagged mistakes never count, even with derivable patterns', () => {
    const r = slipCoach([...Array(10)].map(() => mk({ picked: 'C', confidence: 'sure' })));
    expect(r).toEqual({ ready: false, tagged: 0, needed: 5 });
  });

  it('runner-up is compared on ORIGINAL letters after a shuffle', () => {
    // Display A shows original C (the runner-up); display C shows original A.
    const perm = ['C', 'B', 'A', 'D'] as Permutation;
    const q = getAllQuestions('cisa').find((x) => runnerUp(x.tips, x.correct));
    expect(q).toBeDefined();
    const ru = runnerUp(q!.tips, q!.correct)! as Letter;
    const display = originalToDisplay(ru, perm);
    expect(isCorrect(q!, display, perm)).toBe(false);
    const picked = displayToOriginal(display, perm);
    expect(patternsOf({ slip: 'role', picked, correct: q!.correct, tips: q!.tips, stem: q!.stem })).toContain('runner-up');
    // The Coach me hint is rendered with display letters for this shuffle.
    const tip = eliminateTip(q!.tips);
    if (tip) expect(renderText(tip, perm)).not.toMatch(/\{\{/);
  });
});

describe('readiness edges', () => {
  const rec = (o: Partial<AnswerRecord>): AnswerRecord => ({ attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 1, ...o });
  const many = (n: number, o: Partial<AnswerRecord>) => {
    const out: Record<string, AnswerRecord> = {};
    cisa.domains.forEach((d) => {
      for (let i = 0; i < n; i++) out[`d${d.id}_${String(i).padStart(3, '0')}`] = rec(o);
    });
    return out;
  };

  it('zero answers: no NaN anywhere', () => {
    const r = computeReadiness(cisa, {});
    expect(Number.isFinite(r.score)).toBe(true);
    r.domains.forEach((d) => expect(Number.isFinite(d.mastery)).toBe(true));
    expect(readinessRange(cisa, r)).toEqual({ enough: false, answered: 0, needed: RANGE_MIN_ANSWERS });
  });

  it('all assisted (correct and wrong): range is finite, 0–100, never negative', () => {
    for (const lastCorrect of [true, false]) {
      const r = computeReadiness(cisa, many(40, { lastCorrect, lastAssisted: true }));
      r.domains.forEach((d) => {
        expect(d.credit).toBeGreaterThanOrEqual(0);
        expect(d.mastery).toBeLessThanOrEqual(0.5);
      });
      const range = readinessRange(cisa, r);
      expect(range.enough).toBe(true);
      if (range.enough) {
        expect(Number.isFinite(range.low) && Number.isFinite(range.high)).toBe(true);
        expect(range.low).toBeGreaterThanOrEqual(0);
        expect(range.high).toBeLessThanOrEqual(100);
        expect(range.low).toBeLessThanOrEqual(range.centre);
        expect(range.high).toBeGreaterThanOrEqual(range.centre);
      }
    }
  });

  it('assisted correct never double-counts: credit <= mastered, mastery <= 1', () => {
    const r = computeReadiness(cisa, { ...many(3, { lastAssisted: true }), ...many(0, {}) });
    r.domains.forEach((d) => {
      expect(d.credit).toBeLessThanOrEqual(d.mastered);
      expect(d.mastery).toBeLessThanOrEqual(1);
    });
  });

  it('gate: 40 answers all assisted still need 20 clean-equivalent answers', () => {
    const answers: Record<string, AnswerRecord> = {};
    for (let i = 0; i < 40; i++) answers[`d1_${String(i).padStart(3, '0')}`] = rec({ lastAssisted: true });
    const range = readinessRange(cisa, computeReadiness(cisa, answers));
    expect(range).toEqual({ enough: false, answered: 40, needed: 20 });
  });
});

describe('mock exams can never be coached, even across a reload', () => {
  const base = (mode: ActiveSession['mode']): ActiveSession => ({
    id: 'm', mode, certId: 'cisa', title: 't', questionIds: ['d1_001', 'd1_002'],
    perms: { d1_001: ['B', 'A', 'D', 'C'], d1_002: ['A', 'B', 'C', 'D'] },
    index: 0, responses: {}, flagged: [], startedAt: 0, deadline: Date.now() + 3_600_000,
  });

  // Simulate an app kill: keep what was saved, wipe memory, rehydrate.
  const killAndReopen = async () => {
    await new Promise((r) => setTimeout(r, 0));
    const saved = await AsyncStorage.getItem('aurivan.session.v1');
    useSession.setState({ active: null });
    await new Promise((r) => setTimeout(r, 0));
    await AsyncStorage.setItem('aurivan.session.v1', saved!);
    await useSession.persist.rehydrate();
  };

  it('markCoached is a no-op in mock before and after rehydrate', async () => {
    useSession.getState().start(base('mock'));
    useSession.getState().markCoached('d1_001');
    await killAndReopen();
    expect(useSession.getState().active?.mode).toBe('mock');
    useSession.getState().markCoached('d1_002');
    expect(useSession.getState().active?.coached).toBeUndefined();
  });

  it('practice coached ids survive a reload and do not leak into a new mock', async () => {
    useSession.getState().start(base('practice'));
    useSession.getState().markCoached('d1_001');
    useSession.getState().markCoached('d1_001');
    await killAndReopen();
    expect(useSession.getState().active?.coached).toEqual(['d1_001']);
    useSession.getState().start(base('mock'));
    expect(useSession.getState().active?.coached).toBeUndefined();
    await AsyncStorage.clear();
  });
});

describe('Coach me priority-word highlight against the real bank', () => {
  it('Stem highlight (lastIndexOf) lands on the same word priorityWord found', () => {
    const bad: string[] = [];
    for (const q of getAllQuestions('cisa')) {
      const w = priorityWord(q.stem);
      if (!w) continue;
      const matches = [...q.stem.matchAll(/\b(FIRST|BEST|MOST|PRIMARY|GREATEST|LEAST|MAIN)\b/g)];
      const lastBoundaryIdx = matches[matches.length - 1].index;
      if (q.stem.lastIndexOf(w) !== lastBoundaryIdx) bad.push(q.id);
    }
    expect(bad).toEqual([]);
  });
});
