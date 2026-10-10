import { getAllQuestions } from '../content/loader';
import type { PackQuestion } from '../content/types';
import {
  bestFooting,
  calibration,
  calibrationVerdict,
  expectedPoints,
  FOOTING_CONFIDENCE,
  footingChip,
  footingSpoken,
  FOOTINGS,
  maxScore,
  PAYOFF,
  signed,
  sprintScore,
  VERDICT_COPY,
  type Footing,
} from '../engine/games/calibration';
import { acceptedAsks, ASK_FOR, ASK_LABEL, ASK_MEANING, askChoices, ASKS, meaningFor, PRIORITY_WORDS, priorityPool, priorityWord } from '../engine/games/priorityLens';
import { signpostMiss } from '../engine/games/recap';
import { buildTrapRound, closedInStep2, scoreTrapPick, snareStep, snareWhy, trapLetter, trapPool, trapTip } from '../engine/games/trapSpotter';
import { createRng } from '../engine/random';

const bank = getAllQuestions('cisa');

describe('Snare Spotter', () => {
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
  it('reads the runner-up from exam-style v2 "Final two" tips', () => {
    const q = {
      tips: ['Eliminate: {{A}} and {{C}} miss the point.', 'Final two: {{D}} beats {{B}} because …', 'Exam cue: …'],
      correct: 'D',
      options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    } as unknown as PackQuestion;
    expect(trapLetter(q)).toBe('B');
    expect(trapTip(q)).toMatch(/^Final two:/);
    // Every rewritten Domain 1 question yields a trap for the game.
    const v2 = bank.filter((x) => x.tips.some((t) => t.startsWith('Final two:')));
    expect(v2.length).toBeGreaterThan(150);
    for (const x of v2) expect(trapLetter(x)).not.toBeNull();
  });
  it('picking the BEST answer as the snare is never a dead end', () => {
    const q = {
      tips: ['Final two: {{D}} beats {{B}} because …'],
      correct: 'D',
      options: { A: 'a', B: 'b', C: 'c', D: 'd' },
      wrongExplanations: { B: 'B misses the owner.' },
    } as unknown as PackQuestion;
    expect(snareStep(q, 'D')).toBe('key');
    expect(snareStep(q, 'B')).toBe('spotted');
    expect(snareStep(q, 'A')).toBe('missed');
    // The best answer stays open in step 2, so it can still be chosen…
    expect(closedInStep2(q, 'D')).toEqual([]);
    // …and choosing it scores the answer point (the snare point is lost).
    expect(scoreTrapPick(q, 'D', 'D')).toEqual({ spotted: false, correct: true, points: 1 });
    // A wrong snare pick is still closed: you named it as a trap.
    expect(closedInStep2(q, 'A')).toEqual(['A']);
  });
  it('explains the snare with its own wrong-answer note first', () => {
    const q = { tips: ['Final two: {{D}} beats {{B}} because …'], correct: 'D', options: { B: 'b', D: 'd' }, wrongExplanations: { B: 'B misses the owner.' } } as unknown as PackQuestion;
    expect(snareWhy(q)).toBe('B misses the owner.');
    expect(snareWhy({ ...q, wrongExplanations: {} })).toBe(trapTip(q));
  });
  it('builds a round of unique questions', () => {
    const ids = buildTrapRound(bank, createRng(3), 5);
    expect(new Set(ids).size).toBe(5);
  });
});

describe('Signpost (priority words)', () => {
  it('detects capitalised priority words, preferring the last one', () => {
    expect(priorityWord('What should the auditor do FIRST?')).toBe('FIRST');
    expect(priorityWord('Which is the most common issue?')).toBeNull();
    expect(priorityWord('The BEST reason ... which control is MOST effective?')).toBe('MOST');
  });
  it('has a real pool to play from', () => {
    expect(priorityPool(bank).length).toBeGreaterThan(200);
  });
  it('step 1 offers four meanings, never the capital word itself', () => {
    const c = askChoices(createRng(9));
    expect([...c].sort()).toEqual([...ASKS].sort());
    for (const a of c) for (const w of PRIORITY_WORDS) expect(ASK_LABEL[a].toUpperCase()).not.toMatch(new RegExp(`\\b${w}\\b`));
  });
  it('every priority word asks for exactly one of the offered meanings', () => {
    for (const w of PRIORITY_WORDS) expect(ASKS).toContain(ASK_FOR[w]);
    expect(ASK_FOR.FIRST).toBe('sequence');
    expect(ASK_FOR.MOST).toBe(ASK_FOR.GREATEST);
  });
  it('drops LEAST and MAIN, which never occur in the bank', () => {
    expect(PRIORITY_WORDS).not.toContain('LEAST' as never);
    expect(PRIORITY_WORDS).not.toContain('MAIN' as never);
    expect(bank.some((q) => /\b(LEAST|MAIN)\b/.test(q.stem))).toBe(false);
    // Every question in the game's pool has a word the game understands.
    for (const q of priorityPool(bank)) expect(ASK_FOR[priorityWord(q.stem)!]).toBeDefined();
  });
});

describe('Sure Footing scoring', () => {
  const r = (footing: Footing, correct: boolean) => ({ questionId: 'x', footing, correct });
  it('pays Guess +1/0, Lean +2/−1, Sure +3/−5', () => {
    expect(PAYOFF.guess).toMatchObject({ right: 1, wrong: 0 });
    expect(PAYOFF.lean).toMatchObject({ right: 2, wrong: -1 });
    expect(PAYOFF.sure).toMatchObject({ right: 3, wrong: -5 });
    expect(sprintScore([r('sure', true), r('lean', false), r('guess', true), r('sure', false), r('guess', false)])).toBe(3 - 1 + 1 - 5 + 0);
    expect(maxScore(8)).toBe(24);
  });
  it('makes the honest choice the best-scoring one (crossovers at 50% and 80%)', () => {
    expect(bestFooting(0.3)).toBe('guess');
    expect(bestFooting(0.49)).toBe('guess');
    expect(bestFooting(0.5)).toBe('guess'); // a tie goes to the humbler level
    expect(bestFooting(0.51)).toBe('lean');
    expect(bestFooting(0.79)).toBe('lean');
    expect(bestFooting(0.8)).toBe('lean');
    expect(bestFooting(0.81)).toBe('sure');
    expect(expectedPoints('guess', 0.5)).toBeCloseTo(expectedPoints('lean', 0.5));
    expect(expectedPoints('lean', 0.8)).toBeCloseTo(expectedPoints('sure', 0.8));
  });
  it('no longer rewards always choosing the top level', () => {
    // Under the old ±stake rule, "always 3" won for anyone right over 50%.
    expect(expectedPoints('sure', 0.6)).toBeLessThan(expectedPoints('lean', 0.6));
    expect(expectedPoints('sure', 0.7)).toBeLessThan(expectedPoints('lean', 0.7));
  });
  it('maps levels to the practice confidence, so a lucky Guess is re-tested', () => {
    expect(FOOTING_CONFIDENCE).toEqual({ guess: 'guessing', lean: 'unsure', sure: 'sure' });
  });
  it('labels chips with their points and says them in words', () => {
    expect(footingChip('sure')).toBe('Sure · +3 / −5');
    expect(footingChip('guess')).toBe('Guess · +1 / 0');
    expect(footingSpoken('lean')).toBe('Lean: plus 2 if right, minus 1 if wrong');
    expect(signed(-5)).toBe('−5');
  });
  it('flags over-confidence when Sure answers miss', () => {
    const res = [r('sure', false), r('sure', false), r('sure', true), r('guess', true)];
    expect(calibrationVerdict(res)).toBe('overconfident');
    expect(calibration(res)[2].accuracy).toBeCloseTo(1 / 3);
  });
  it('needs enough data before judging', () => {
    expect(calibrationVerdict([r('lean', true)])).toBe('not-enough-data');
  });
  it('never uses betting words in its copy or on its screen', () => {
    const fs = jest.requireActual('fs') as typeof import('fs');
    const path = jest.requireActual('path') as typeof import('path');
    const copy = [
      ...Object.values(VERDICT_COPY),
      ...Object.values(PAYOFF).map((p) => p.label),
      ...FOOTINGS.map(footingChip),
      ...FOOTINGS.map(footingSpoken),
      fs.readFileSync(path.join(__dirname, '../app/game/sprint.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''),
    ].join(' ');
    expect(copy).not.toMatch(/\b(bet|bets|betting|stake|stakes|wager)\b/i);
  });
});

describe('Signpost choice positions', () => {
  it('the right meaning does not sit in a fixed place across rounds', () => {
    const positions = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) positions.add(askChoices(createRng(seed * 31)).indexOf('sequence'));
    expect(positions.size).toBeGreaterThan(1);
  });
});

describe('Signpost: "MOST appropriate" asks for the best fit', () => {
  const real = bank.find((q) => /\bMOST appropriate\b/.test(q.stem) && priorityWord(q.stem) === 'MOST')!;
  it('accepts best fit first (and degree), on a real bank stem', () => {
    expect(real).toBeDefined();
    expect(acceptedAsks(real.stem)).toEqual(['best-fit', 'degree']);
    expect(meaningFor(real.stem)).toBe(`MOST appropriate works like BEST. ${ASK_MEANING['best-fit']}`);
  });
  it('handles appropriately and suitable, and leaves plain MOST alone', () => {
    expect(acceptedAsks('Which control is MOST appropriately placed?')).toEqual(['best-fit', 'degree']);
    expect(acceptedAsks('Which option is MOST suitable here?')).toEqual(['best-fit', 'degree']);
    expect(acceptedAsks('Which risk is MOST significant?')).toEqual(['degree']);
    expect(acceptedAsks('What should the auditor do FIRST?')).toEqual(['sequence']);
    expect(acceptedAsks('no priority word')).toEqual([]);
  });
  it('the recap coaches "MOST appropriate" like BEST', () => {
    expect(signpostMiss(real, false, true)!.why).toBe(meaningFor(real.stem));
  });
});
