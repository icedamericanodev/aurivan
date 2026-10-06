import { getAllQuestions } from '../content/loader';
import type { PackQuestion } from '../content/types';
import { calibration, calibrationVerdict, sprintScore } from '../engine/games/calibration';
import { priorityPool, priorityWord, wordChoices } from '../engine/games/priorityLens';
import { buildTrapRound, scoreTrapPick, trapLetter, trapPool } from '../engine/games/trapSpotter';
import { createRng } from '../engine/random';

const bank = getAllQuestions('cisa');

describe('Trap Spotter', () => {
  it('finds a trap letter in most of the real bank, never the correct answer', () => {
    const pool = trapPool(bank);
    expect(pool.length / bank.length).toBeGreaterThan(0.6);
    for (const q of pool) expect(trapLetter(q)).not.toBe(q.correct);
  });
  it('scores trap + answer picks', () => {
    const q = { tips: ['Trap is {{B}}: tempting.'], correct: 'A', options: { A: 'a', B: 'b', C: 'c', D: 'd' } } as unknown as PackQuestion;
    expect(scoreTrapPick(q, 'B', 'A')).toEqual({ spotted: true, correct: true, points: 2 });
    expect(scoreTrapPick(q, 'C', 'B').points).toBe(0);
  });
  it('builds a round of unique questions', () => {
    const ids = buildTrapRound(bank, createRng(3), 5);
    expect(new Set(ids).size).toBe(5);
  });
});

describe('Priority Lens', () => {
  it('detects capitalised priority words, preferring the last one', () => {
    expect(priorityWord('What should the auditor do FIRST?')).toBe('FIRST');
    expect(priorityWord('Which is the most common issue?')).toBeNull();
    expect(priorityWord('The BEST reason ... which control is MOST effective?')).toBe('MOST');
  });
  it('has a real pool to play from', () => {
    expect(priorityPool(bank).length).toBeGreaterThan(200);
  });
  it('offers 4 distinct choices including the answer', () => {
    const c = wordChoices('FIRST', createRng(9));
    expect(c).toHaveLength(4);
    expect(new Set(c).size).toBe(4);
    expect(c).toContain('FIRST');
  });
});

describe('Calibrated Sprint', () => {
  const r = (stake: 1 | 2 | 3, correct: boolean) => ({ questionId: 'x', stake, correct });
  it('wins and loses the stake', () => {
    expect(sprintScore([r(3, true), r(2, false), r(1, true)])).toBe(2);
  });
  it('flags over-confidence when 3-chip bets miss', () => {
    const res = [r(3, false), r(3, false), r(3, true), r(1, true)];
    expect(calibrationVerdict(res)).toBe('overconfident');
    expect(calibration(res)[2].accuracy).toBeCloseTo(1 / 3);
  });
  it('needs enough data before judging', () => {
    expect(calibrationVerdict([r(2, true)])).toBe('not-enough-data');
  });
});

describe('Priority Lens choice positions', () => {
  it('the right word does not sit in a fixed chip across rounds', () => {
    const positions = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) positions.add(wordChoices('FIRST', createRng(seed * 31)).indexOf('FIRST'));
    expect(positions.size).toBeGreaterThan(1);
  });
});
