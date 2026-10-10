/**
 * Build F: every game ends through lib/gameRounds.ts finishGameRound — the
 * score, the game's level, the skill-badge counters, today's plan and at
 * most ONE milestone moment. Skill badges from games.md §5 end to end.
 */
import { wellJudged } from '../engine/games/calibration';
import { finishGameRound, startingTier } from '../lib/gameRounds';
import { playableGames } from '../lib/games';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const cp = () => selectCert(useProgress.getState(), 'cisa');

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
});
afterEach(() => jest.useRealTimers());

describe('the round end', () => {
  it('saves the score and the level, and promotes after two strong rounds', () => {
    const a = finishGameRound('cisa', 'rumor', { score: 11, rate: 11 / 12, tier: 'seedling' });
    expect(a.change).toBeNull();
    expect(a.tier).toBe('seedling');
    expect(a.best).toBe(false); // a first round is never "a new best"
    const b = finishGameRound('cisa', 'rumor', { score: 12, rate: 1, tier: 'seedling' });
    expect(b.change).toBe('up');
    expect(b.tier).toBe('sapling');
    expect(b.best).toBe(true);
    expect(cp().gameBest.rumor).toBe(12);
    expect(startingTier('cisa', 'rumor')).toBe('sapling');
  });

  it('steps back after two weak rounds, at the learner’s level only', () => {
    useProgress.setState({ byCert: { cisa: { ...cp(), gameGrowth: { trap: { tier: 'sapling', up: 0, down: 0 } } } } });
    finishGameRound('cisa', 'trap', { score: 1, rate: 0.2, tier: 'sapling' });
    const r = finishGameRound('cisa', 'trap', { score: 1, rate: 0.2, tier: 'sapling' });
    expect(r.change).toBe('down');
    expect(r.tier).toBe('seedling');
  });

  it('shows at most one milestone per round; others wait', () => {
    // Myth Clearer (25 rumors) and Whole Grove can't both arrive here, so use
    // two counters: 25 myths and 10 FIRST words in two rounds.
    useProgress.getState().updateMilestones('cisa', () => ({ milestones: { earned: {}, counts: { signpostFirst: 10 } } }));
    const r = finishGameRound('cisa', 'rumor', { score: 12, rate: 1, tier: 'seedling', counts: { mythsCleared: 25 } });
    expect(r.moment).not.toBeNull();
    const earned = Object.keys(cp().milestones!.earned);
    expect(earned).toEqual(expect.arrayContaining(['signpost-reader', 'myth-clearer']));
    expect(cp().milestones!.queue).toHaveLength(1);
  });
});

describe('skill badges through real rounds', () => {
  it('Snare-wise: 8 of the last 10 snares', () => {
    finishGameRound('cisa', 'trap', { score: 8, rate: 0.8, tier: 'seedling', hits: [true, true, true, true, false] });
    expect(cp().milestones?.earned?.['snare-wise']).toBeUndefined();
    const r = finishGameRound('cisa', 'trap', { score: 9, rate: 0.8, tier: 'seedling', hits: [true, true, true, true, false] });
    expect(cp().milestones!.earned['snare-wise']).toBe(T0);
    expect(r.moment?.label).toBe('Snare-wise');
    expect(r.moment?.kind).toBe('skill');
  });

  it('Even Keel: three "well calibrated" rounds in a row', () => {
    finishGameRound('cisa', 'sprint', { score: 10, rate: 1, tier: 'seedling', good: true });
    finishGameRound('cisa', 'sprint', { score: 10, rate: 1, tier: 'seedling', good: false });
    finishGameRound('cisa', 'sprint', { score: 10, rate: 1, tier: 'seedling', good: true });
    finishGameRound('cisa', 'sprint', { score: 10, rate: 1, tier: 'sapling', good: true });
    expect(cp().milestones?.earned?.['even-keel']).toBeUndefined();
    finishGameRound('cisa', 'sprint', { score: 10, rate: 1, tier: 'sapling', good: true });
    expect(cp().milestones!.earned['even-keel']).toBeDefined();
  });

  it('Sure Footing’s skill step: a miss marked Sure or a hit marked Guess is not well judged', () => {
    expect(wellJudged({ footing: 'sure', correct: true })).toBe(true);
    expect(wellJudged({ footing: 'sure', correct: false })).toBe(false);
    expect(wellJudged({ footing: 'guess', correct: true })).toBe(false);
    expect(wellJudged({ footing: 'guess', correct: false })).toBe(true);
    expect(wellJudged({ footing: 'lean', correct: false })).toBe(true);
  });

  it('Signpost Reader, Myth Clearer and Sure-Footed Pace add up across rounds', () => {
    for (let k = 0; k < 2; k++) finishGameRound('cisa', 'priority', { score: 10, rate: 1, tier: 'seedling', counts: { signpostFirst: 5 } });
    expect(cp().milestones!.earned['signpost-reader']).toBeDefined();
    for (let k = 0; k < 3; k++) finishGameRound('cisa', 'rumor', { score: 10, rate: 1, tier: 'seedling', counts: { mythsCleared: 8 } });
    expect(cp().milestones?.earned?.['myth-clearer']).toBeUndefined();
    finishGameRound('cisa', 'rumor', { score: 10, rate: 1, tier: 'seedling', counts: { mythsCleared: 1 } });
    expect(cp().milestones!.earned['myth-clearer']).toBeDefined();
    for (let k = 0; k < 3; k++) finishGameRound('cisa', 'daylight', { score: 6, rate: 1, tier: 'sapling', counts: { paceRounds: k < 2 ? 1 : 0 } });
    expect(cp().milestones?.earned?.['sure-footed-pace']).toBeUndefined();
    finishGameRound('cisa', 'daylight', { score: 6, rate: 1, tier: 'heartwood', counts: { paceRounds: 1 } });
    expect(cp().milestones!.earned['sure-footed-pace']).toBeDefined();
  });

  it('Whole Grove: every game this exam can play, played once', () => {
    const games = playableGames('cisa');
    games.slice(0, -1).forEach((g) => finishGameRound('cisa', g, { score: 1, rate: 0.5, tier: 'seedling' }));
    expect(cp().milestones?.earned?.['whole-grove']).toBeUndefined();
    finishGameRound('cisa', games[games.length - 1], { score: 1, rate: 0.5, tier: 'seedling' });
    expect(cp().milestones!.earned['whole-grove']).toBeDefined();
  });

  it('Back on the Path: game misses fixed later', () => {
    useProgress.getState().updateMilestones('cisa', () => ({ milestones: { earned: {}, counts: { gameFixes: 10 } } }));
    finishGameRound('cisa', 'trap', { score: 1, rate: 0.5, tier: 'seedling' });
    expect(cp().milestones!.earned['back-on-path']).toBeDefined();
  });
});
