/**
 * Build F: every game ends through lib/gameRounds.ts finishGameRound — the
 * score, the game's level, the skill-badge counters, today's plan and at
 * most ONE milestone moment. Skill badges from games.md §5 end to end.
 */
import { wellJudged } from '../engine/games/calibration';
import { finishGameRound, startingTier } from '../lib/gameRounds';
import { ensureBackfill } from '../lib/milestones';
import { takeNextOf } from '../engine/milestones';
import { isRoundBadge } from '../engine/badgeCatalog';
import { playableGames } from '../lib/games';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const cp = () => selectCert(useProgress.getState(), 'cisa');
/** `n` different items "<prefix>0".."<prefix>n-1", the first `right` of them right. */
const hitsOf = (prefix: string, n: number, right: number) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, ok: i < right }));

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  // App launch: app/_layout.tsx runs the one-time back-fill (a new learner: nothing found).
  ensureBackfill('cisa', T0);
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
    // Two badges arrive in one round: Signpost Reader (window already full)
    // and Myth Clearer (25 different rumors, all cleared, this round).
    useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { ...m!, signposts: hitsOf('f', 10, 10) } }));
    const r = finishGameRound('cisa', 'rumor', { score: 12, rate: 0.6, tier: 'seedling', windows: { myths: hitsOf('m', 25, 25) } });
    // Mobile 1.40 (code review #2): the Root or Rumor recap shows ITS badge, Myth Clearer;
    // Signpost Reader (Signpost's badge) is not this game's news and stays queued for You.
    expect(r.moment?.key).toBe('myth-clearer');
    const earned = Object.keys(cp().milestones!.earned);
    expect(earned).toEqual(expect.arrayContaining(['signpost-reader', 'myth-clearer']));
    expect(cp().milestones!.queue).toEqual(['signpost-reader']);
  });

  it('isRoundBadge: a game’s own skill badge, or Whole Grove; never another game’s badge or a milestone', () => {
    expect(isRoundBadge('trap', 'snare-wise')).toBe(true);
    expect(isRoundBadge('priority', 'signpost-reader')).toBe(true);
    expect(isRoundBadge('rumor', 'signpost-reader')).toBe(false);
    expect(isRoundBadge('field', 'whole-grove')).toBe(true);
    expect(isRoundBadge('trap', 'back-on-path')).toBe(false);
    expect(isRoundBadge('trap', 'rooted:10')).toBe(false);
    expect(isRoundBadge('trap', 'first-foothold')).toBe(false);
  });

  it('a round that tips over a milestone (not a game badge) shows no badge; the milestone waits for You', () => {
    // Signpost Reader's window is full, so ANY round's milestone check earns it; a Snare Spotter round must not show it.
    useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { ...m!, signposts: hitsOf('f', 10, 10) } }));
    const r = finishGameRound('cisa', 'trap', { score: 3, rate: 0.6, tier: 'seedling' });
    expect(cp().milestones!.earned['signpost-reader']).toBe(T0);
    expect(r.moment).toBeNull();
    expect(cp().milestones!.queue).toContain('signpost-reader');
  });
});

describe('one celebration at a time', () => {
  it('a level-up line and a milestone never stack: the milestone waits in the queue', () => {
    finishGameRound('cisa', 'trap', { score: 9, rate: 0.9, tier: 'seedling', hits: [true, true, true, true, false] });
    // Round 2: the level grows AND Snare-wise (8 of 10) is earned.
    const r = finishGameRound('cisa', 'trap', { score: 9, rate: 0.9, tier: 'seedling', hits: [true, true, true, true, false] });
    expect(r.change).toBe('up');
    expect(r.moment).toBeNull();
    expect(cp().milestones!.earned['snare-wise']).toBe(T0);
    expect(cp().milestones!.queue).toEqual(['snare-wise']);
    // Mobile 1.40: the next round did not earn it, so its recap never shows it as new;
    // it stays queued (You's badge dot shows it quietly; a later Results may celebrate it).
    const next = finishGameRound('cisa', 'trap', { score: 5, rate: 0.6, tier: 'sapling' });
    expect(next.change).toBeNull();
    expect(next.moment).toBeNull();
    expect(cp().milestones!.queue).toEqual(['snare-wise']);
  });

  it('a step back with a badge waiting from before: the recap shows nothing new, the badge stays queued', () => {
    useProgress.setState({ byCert: { cisa: { ...cp(), gameGrowth: { trap: { tier: 'sapling', up: 0, down: 1 } } } } });
    useProgress.getState().updateMilestones('cisa', () => ({ milestones: { earned: { 'rooted:10': T0 }, queue: ['rooted:10'] } }));
    const r = finishGameRound('cisa', 'trap', { score: 1, rate: 0.2, tier: 'sapling' });
    expect(r.change).toBe('down');
    expect(r.moment).toBeNull();
    expect(cp().milestones!.queue).toEqual(['rooted:10']);
  });
});

// ── Mobile 1.40: the recap's "new badge" is this round's own ─────────────────
describe('the recap shows a new badge only when this round earned it', () => {
  it('an older queued badge ahead of it is skipped (and kept); the round’s own badge is the one shown', () => {
    useProgress.getState().updateMilestones('cisa', () => ({ milestones: { earned: { 'rooted:10': T0 - 1000 }, queue: ['rooted:10'] } }));
    // Snare-wise needs 8 of the last 10 snares; rate under 80% so the level holds (no level-up line).
    finishGameRound('cisa', 'trap', { score: 8, rate: 0.7, tier: 'seedling', hits: [true, true, true, true, false] });
    const r = finishGameRound('cisa', 'trap', { score: 9, rate: 0.7, tier: 'seedling', hits: [true, true, true, true, false] });
    expect(r.moment?.key).toBe('snare-wise');
    expect(cp().milestones!.queue).toEqual(['rooted:10']);
  });

  it('a round that earns nothing shows no badge, even with badges waiting', () => {
    useProgress.getState().updateMilestones('cisa', () => ({ milestones: { earned: { 'rooted:10': T0 - 1000 }, queue: ['rooted:10'] } }));
    const r = finishGameRound('cisa', 'trap', { score: 3, rate: 0.6, tier: 'seedling' });
    expect(r.moment).toBeNull();
    expect(cp().milestones!.queue).toEqual(['rooted:10']);
  });

  it('takeNextOf: the first queued key the round earned, the rest of the queue untouched', () => {
    const m = { earned: { a: 1, b: 2, c: 3 }, queue: ['a', 'b', 'c'] };
    expect(takeNextOf(m, ['c', 'b'])).toEqual({ key: 'b', milestones: { earned: m.earned, queue: ['a', 'c'] } });
    expect(takeNextOf(m, ['z'])).toEqual({ milestones: m });
    expect(takeNextOf(undefined, ['a'])).toEqual({ milestones: undefined });
  });
});

describe('skill badges through real rounds', () => {
  it('Snare-wise: 8 of the last 10 snares', () => {
    finishGameRound('cisa', 'trap', { score: 8, rate: 0.8, tier: 'seedling', hits: [true, true, true, true, false] });
    expect(cp().milestones?.earned?.['snare-wise']).toBeUndefined();
    // Rate under 80%, so the level doesn't grow this round (a level-up would hold the moment back).
    const r = finishGameRound('cisa', 'trap', { score: 9, rate: 0.7, tier: 'seedling', hits: [true, true, true, true, false] });
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

  it('Signpost Reader and Myth Clearer: rolling windows of DIFFERENT items', () => {
    // 5 FIRST questions, all read right, twice: the same 5 never fill the window.
    for (let k = 0; k < 2; k++) finishGameRound('cisa', 'priority', { score: 10, rate: 0.6, tier: 'seedling', windows: { signposts: hitsOf('f', 5, 5) } });
    expect(cp().milestones?.signposts).toHaveLength(5);
    expect(cp().milestones?.earned?.['signpost-reader']).toBeUndefined();
    // 5 new ones, 3 read right: 8 of the last 10 different.
    finishGameRound('cisa', 'priority', { score: 10, rate: 0.6, tier: 'seedling', windows: { signposts: hitsOf('g', 5, 3) } });
    expect(cp().milestones!.earned['signpost-reader']).toBeDefined();
    // Myth Clearer: 24 different rumors cleared is not yet 25 played.
    finishGameRound('cisa', 'rumor', { score: 10, rate: 0.6, tier: 'seedling', windows: { myths: hitsOf('m', 24, 24) } });
    expect(cp().milestones?.earned?.['myth-clearer']).toBeUndefined();
    // Replaying a rumor already in the window doesn't fill it either.
    finishGameRound('cisa', 'rumor', { score: 10, rate: 0.6, tier: 'seedling', windows: { myths: hitsOf('m', 1, 1) } });
    expect(cp().milestones?.earned?.['myth-clearer']).toBeUndefined();
    // A 25th different rumor, missed: 24 of 25 right is enough (20 needed).
    finishGameRound('cisa', 'rumor', { score: 10, rate: 0.6, tier: 'seedling', windows: { myths: hitsOf('n', 1, 0) } });
    expect(cp().milestones!.earned['myth-clearer']).toBeDefined();
  });

  it('Myth Clearer needs 20 right of the last 25, not 25 cleared over time', () => {
    finishGameRound('cisa', 'rumor', { score: 10, rate: 0.6, tier: 'seedling', windows: { myths: hitsOf('m', 25, 19) } });
    expect(cp().milestones?.earned?.['myth-clearer']).toBeUndefined();
  });

  it('Sure-Footed Pace adds up across rounds', () => {
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
