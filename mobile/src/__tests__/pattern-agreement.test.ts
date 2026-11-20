/**
 * One mistake pattern everywhere (phone 2.2, behavioral-scientist 20 Nov 2026).
 *
 * The Play tab's Drills card (topSlipPattern) and the final review week's
 * "top slip" task (lib/finalWeek.ts topSlip) must name exactly the pattern the
 * Mistake journal names ("Your mistake patterns", engine/mistakeDNA.ts), or
 * none when the journal has none. Before, they used every tag ever made, so a
 * learner could see a pattern on Play while the journal said "Not enough
 * evidence yet".
 */
import { getAllQuestions } from '../content/loader';
import { principleForSlip } from '../content/principles';
import { DAY_MS } from '../engine/srs';
import { runnerUp } from '../engine/tips';
import type { ThinkingSlip } from '../engine/slipCoach';
import { topSlip } from '../lib/finalWeek';
import { mistakePatternsFor, topPatternOf, topSlipPattern } from '../lib/slipPattern';
import type { MistakeEntry } from '../store/progress';
import type { Letter } from '../content/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = Date.UTC(2026, 10, 20, 12);
// Questions whose "Final two" tip names a runner-up, so a pick can be "the closest wrong choice" or not.
const QS = getAllQuestions('cisa').filter((q) => !!runnerUp(q.tips, q.correct)).slice(0, 40);

type Kind = 'runner-up' | 'other' | 'sure';
/** A saved miss: the runner-up pick, another wrong pick, or another wrong pick marked Sure. */
function miss(i: number, kind: Kind, extra: Partial<MistakeEntry> = {}): [string, MistakeEntry] {
  const q = QS[i];
  const ru = runnerUp(q.tips, q.correct) as Letter;
  const other = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && l !== ru)!;
  return [q.id, { at: NOW - DAY_MS, picked: kind === 'runner-up' ? ru : other, confidence: kind === 'sure' ? 'sure' : undefined, ...extra }];
}
const book = (...rows: [string, MistakeEntry][]) => Object.fromEntries(rows) as Record<string, MistakeEntry>;
const tagged = (from: number, n: number, slip: ThinkingSlip, extra: Partial<MistakeEntry> = {}) =>
  Array.from({ length: n }, (_, k) => miss(from + k, 'other', { slip, ...extra }));

/** Play, the final week and the journal, side by side. */
function views(mistakes: Record<string, MistakeEntry>) {
  const journal = topPatternOf(mistakePatternsFor('cisa', mistakes, NOW));
  return { journal, play: topSlipPattern('cisa', mistakes, NOW), week: topSlip('cisa', mistakes, NOW) };
}
const weekFor = (pattern: string) => {
  const p = principleForSlip('cisa', pattern);
  return p ? { principleId: p.id } : expect.anything();
};

describe('Play and the final week name the journal’s pattern', () => {
  const cases: [string, Record<string, MistakeEntry>][] = [
    ['no mistakes', book()],
    ['five recent role tags', book(...tagged(0, 5, 'role'))],
    ['untagged closest-wrong-choice picks', book(...Array.from({ length: 5 }, (_, i) => miss(i, 'runner-up')))],
    ['untagged sure-but-wrong answers', book(...Array.from({ length: 5 }, (_, i) => miss(i, 'sure')))],
    ['old tags only (outside 28 days)', book(...tagged(0, 6, 'role', { at: NOW - 40 * DAY_MS }))],
    ['five with a pattern, none shared by 3', book(...tagged(0, 2, 'role'), ...tagged(2, 2, 'symptom'), ...tagged(4, 1, 'tech-first'))],
    ['a tie', book(...tagged(0, 3, 'role'), ...tagged(3, 3, 'symptom'))],
    ['mixed tags and answers', book(...tagged(0, 3, 'symptom'), ...Array.from({ length: 4 }, (_, i) => miss(10 + i, 'runner-up')))],
  ];
  it.each(cases)('%s', (_name, mistakes) => {
    const v = views(mistakes);
    expect(v.play).toEqual(v.journal);
    if (v.journal) expect(v.week).toEqual(weekFor(v.journal.pattern));
    else expect(v.week).toBeNull();
  });

  it('untagged answer evidence now steers Play (it needed 5 tags before)', () => {
    expect(views(book(...Array.from({ length: 5 }, (_, i) => miss(i, 'runner-up')))).play).toEqual({ pattern: 'runner-up', tied: false });
  });

  it('old tags no longer name a pattern the journal does not show', () => {
    const v = views(book(...tagged(0, 6, 'role', { at: NOW - 40 * DAY_MS })));
    expect(v.journal).toBeNull();
    expect(v.play).toBeNull();
    // The final week falls back to the principles library, quietly.
    expect(v.week).toBeNull();
  });

  it('a tie is reported, so Play can say "One of your recent patterns"', () => {
    expect(views(book(...tagged(0, 3, 'role'), ...tagged(3, 3, 'symptom'))).play).toEqual({ pattern: 'role', tied: true });
  });

  it('"Didn’t know it" opens a note from the same 28 days', () => {
    const v = views(book(...tagged(0, 5, 'knowledge')));
    expect(v.journal?.pattern).toBe('knowledge');
    expect(v.week).toEqual({ noteId: expect.any(String) });
  });
});

describe('Play keeps its pattern for the day', () => {
  it('the window does not slide under Play within a day; the next day it does', () => {
    // Five role tags, the oldest about to leave the 28-day window.
    const mistakes = book(...tagged(0, 4, 'role'), ...tagged(4, 1, 'role', { at: NOW - 28 * DAY_MS + 60_000 }));
    const morning = Math.floor(NOW / DAY_MS) * DAY_MS + 60_000;
    // Computed early in the day, before the oldest tag ages out: 5 with a pattern.
    expect(topSlipPattern('cisa', mistakes, morning)?.pattern).toBe('role');
    // Later the same day the oldest is out (only 4 left), but Play keeps the morning's answer.
    expect(topSlipPattern('cisa', mistakes, NOW + 3 * 3_600_000)?.pattern).toBe('role');
    expect(mistakePatternsFor('cisa', mistakes, NOW + 3 * 3_600_000).top).toBeNull();
    // The next day it follows the journal.
    expect(topSlipPattern('cisa', mistakes, morning + DAY_MS)).toBeNull();
  });

  it('returns the same object while the pattern is unchanged, so Play does not redraw', () => {
    const mistakes = book(...tagged(0, 5, 'role'));
    const a = topSlipPattern('cisa', mistakes, NOW);
    expect(topSlipPattern('cisa', mistakes, NOW)).toBe(a);
    expect(topSlipPattern('cisa', mistakes, NOW + DAY_MS)).toBe(a);
  });
});

describe('Play stays still when the pattern does not change', () => {
  it('a new saved-mistakes object with the same pattern gives the very same value', () => {
    const before = book(...tagged(0, 5, 'role'));
    // A save always makes a new object (here: one more role miss).
    const after = { ...before, ...book(...tagged(5, 1, 'role')) };
    expect(topSlipPattern('cisa', after, NOW)).toBe(topSlipPattern('cisa', before, NOW));
  });
});
