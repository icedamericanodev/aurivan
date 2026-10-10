/**
 * Build F: per-game levels (Seedling → Sapling → Heartwood), games review §5.
 * Promote after 2 rounds in a row at 80%+ on the skill step; step back one
 * level after 2 rounds in a row under 50%, worded as practice, never a loss.
 */
import { readBackup } from '../engine/backup';
import { growthTier, HITS_CAP, noteRound, share, tierChangeLine, type GameGrowth } from '../engine/games/growth';
import { checkBackupText, currentBackup } from '../lib/backup';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const play = (g: GameGrowth | undefined, rates: number[], tier?: GameGrowth['tier']) => {
  let cur = g;
  const changes: (string | null)[] = [];
  for (const rate of rates) {
    const r = noteRound(cur, { rate, tier: tier ?? cur?.tier ?? 'seedling' });
    cur = r.growth;
    changes.push(r.change);
  }
  return { g: cur!, changes };
};

describe('promote', () => {
  it('starts at Seedling', () => {
    expect(growthTier(undefined)).toBe('seedling');
  });

  it('two rounds in a row at 80% or more move up one level', () => {
    const { g, changes } = play(undefined, [0.8, 0.9]);
    expect(g.tier).toBe('sapling');
    expect(changes).toEqual([null, 'up']);
    expect(g.up).toBe(0);
  });

  it('one good round is not enough, and a middling round resets the run', () => {
    expect(play(undefined, [0.9]).g.tier).toBe('seedling');
    expect(play(undefined, [0.9, 0.7, 0.9]).g.tier).toBe('seedling');
    expect(play(undefined, [0.79, 0.95]).g.tier).toBe('seedling');
  });

  it('climbs to Heartwood and stays there', () => {
    const { g } = play(undefined, [1, 1, 1, 1, 1, 1, 1, 1]);
    expect(g.tier).toBe('heartwood');
    expect(g.up).toBeLessThanOrEqual(2);
  });
});

describe('step back', () => {
  it('two rounds in a row under 50% move back one level', () => {
    const { g, changes } = play({ tier: 'heartwood', up: 0, down: 0 }, [0.4, 0.3]);
    expect(g.tier).toBe('sapling');
    expect(changes).toEqual([null, 'down']);
  });

  it('exactly 50% is not a step back; one low round is not either', () => {
    expect(play({ tier: 'sapling', up: 0, down: 0 }, [0.5, 0.5]).g.tier).toBe('sapling');
    expect(play({ tier: 'sapling', up: 0, down: 0 }, [0.2, 0.6, 0.2]).g.tier).toBe('sapling');
  });

  it('never goes below Seedling', () => {
    const { g, changes } = play(undefined, [0, 0, 0, 0]);
    expect(g.tier).toBe('seedling');
    expect(changes.every((c) => c === null)).toBe(true);
  });

  it('is worded as practice, never as a loss', () => {
    const line = tierChangeLine('down', 'sapling')!;
    expect(line).toBe('Back to Sapling for a few rounds.');
    expect(line).not.toMatch(/lose|lost|demot|fail/i);
    expect(tierChangeLine('up', 'heartwood')).toMatch(/grown to Heartwood/);
    expect(tierChangeLine(null, 'sapling')).toBeNull();
  });
});

describe('rounds away from the learner’s level', () => {
  it('never move the level (a harder try never knocks you back)', () => {
    const start: GameGrowth = { tier: 'seedling', up: 0, down: 0 };
    const { g } = play(start, [0, 0, 0], 'heartwood');
    expect(g.tier).toBe('seedling');
    const easy = play({ tier: 'sapling', up: 0, down: 0 }, [1, 1], 'seedling').g;
    expect(easy.tier).toBe('sapling');
  });

  it('still record their skill-step hits', () => {
    const r = noteRound(undefined, { rate: 0.5, tier: 'heartwood', hits: [true, false] });
    expect(r.growth.hits).toEqual([true, false]);
  });
});

describe('hits and the verdict run', () => {
  it('keeps the last 30 hits, oldest first', () => {
    let g: GameGrowth | undefined;
    for (let i = 0; i < 20; i++) g = noteRound(g, { rate: 1, tier: g?.tier ?? 'seedling', hits: [i % 2 === 0, true] }).growth;
    expect(g!.hits).toHaveLength(HITS_CAP);
    expect(g!.hits!.slice(-2)).toEqual([false, true]);
  });

  it('counts rounds in a row with a good verdict, and resets on a miss', () => {
    let g = noteRound(undefined, { rate: 1, tier: 'seedling', good: true }).growth;
    g = noteRound(g, { rate: 1, tier: g.tier, good: true }).growth;
    expect(g.run).toBe(2);
    g = noteRound(g, { rate: 1, tier: g.tier, good: false }).growth;
    expect(g.run).toBe(0);
    // A round with no verdict leaves the run alone.
    g = noteRound({ ...g, run: 2 }, { rate: 1, tier: g.tier }).growth;
    expect(g.run).toBe(2);
  });

  it('share() is the right-share of a list', () => {
    expect(share([true, false, true, true])).toBe(0.75);
    expect(share([])).toBe(0);
  });

  it('a non-number rate counts as 0, never NaN', () => {
    const r = noteRound({ tier: 'sapling', up: 0, down: 1 }, { rate: NaN, tier: 'sapling' });
    expect(r.change).toBe('down');
  });
});

describe('saved and backed up', () => {
  beforeEach(() => useProgress.getState().resetCert('cisa'));

  it('the store keeps each game’s growth and returns the change', () => {
    const p = useProgress.getState();
    expect(p.noteGameRound('cisa', 'rumor', { rate: 0.9, tier: 'seedling' })).toBeNull();
    expect(p.noteGameRound('cisa', 'rumor', { rate: 0.85, tier: 'seedling' })).toBe('up');
    expect(selectCert(useProgress.getState(), 'cisa').gameGrowth?.rumor?.tier).toBe('sapling');
    expect(selectCert(useProgress.getState(), 'cisa').gameGrowth?.trap).toBeUndefined();
  });

  it('a backup carries game levels and restores them', () => {
    useProgress.getState().noteGameRound('cisa', 'trap', { rate: 1, tier: 'seedling', hits: [true, true, false], good: true });
    const read = checkBackupText(JSON.stringify(currentBackup(Date.now())));
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.gameGrowth?.trap).toEqual({ tier: 'seedling', up: 1, down: 0, hits: [true, true, false], run: 1 });
  });

  it('a damaged level in a file is refused, not guessed', () => {
    const file = currentBackup(Date.now());
    (file.stores.progress.state.byCert as Record<string, unknown>).cisa = { gameGrowth: { trap: { tier: 'oak', up: 0, down: 0 } } };
    expect(() => readBackup(JSON.stringify(file), ['cisa'])).toThrow();
  });
});
