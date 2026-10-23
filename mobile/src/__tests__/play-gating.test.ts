/**
 * Mobile 1.40 (owner decision, 22 Oct 2026): a simpler game list.
 *
 * Plain English: a new learner sees the three core games (Snare Spotter,
 * Signpost, Call It First). The other six open after about 50 practice
 * answers. Anyone who already played one of them keeps it, so the update
 * takes no game away. Pure rules (engine/games/todaysDrill.ts).
 */
import { GAMES, GAME_ORDER, type GameId } from '../engine/games/registry';
import { availableGames, CORE_GAMES, DEFAULT_DRILL, drillPlan, moreGamesOpen, MORE_GAMES_AT, RELATED, waitingGames } from '../engine/games/todaysDrill';

const ALL: GameId[] = [...GAME_ORDER];

describe('the core games', () => {
  it('are Snare Spotter, Signpost and Call It First: the new learner’s drill and its two related games', () => {
    expect(CORE_GAMES.map((g) => GAMES[g].name)).toEqual(['Snare Spotter', 'Signpost', 'Call It First']);
    expect([DEFAULT_DRILL, ...RELATED[DEFAULT_DRILL]].sort()).toEqual([...CORE_GAMES].sort());
  });
});

describe('availableGames', () => {
  it('before 50 answers: the core three, in Play’s order', () => {
    expect(availableGames(ALL, { answered: 0, played: [] })).toEqual(['trap', 'priority', 'callit']);
    expect(availableGames(ALL, { answered: MORE_GAMES_AT - 1, played: [] })).toEqual(['trap', 'priority', 'callit']);
    expect(waitingGames(ALL, { answered: 0, played: [] })).toEqual(['sprint', 'daylight', 'rumor', 'field', 'canopy', 'stones']);
  });
  it('from 50 answers: every game this exam can play', () => {
    expect(MORE_GAMES_AT).toBe(50);
    expect(moreGamesOpen(49)).toBe(false);
    expect(moreGamesOpen(50)).toBe(true);
    expect(availableGames(ALL, { answered: 50, played: [] })).toEqual(ALL);
    expect(waitingGames(ALL, { answered: 50, played: [] })).toEqual([]);
  });
  it('a game already played is never taken away', () => {
    expect(availableGames(ALL, { answered: 3, played: ['canopy', 'sprint'] })).toEqual(['trap', 'sprint', 'priority', 'callit', 'canopy']);
    expect(waitingGames(ALL, { answered: 3, played: ['canopy', 'sprint'] })).not.toContain('canopy');
  });
  it('never offers a game this exam can’t play (small banks)', () => {
    expect(availableGames(['trap', 'sprint'], { answered: 0, played: ['sprint', 'stones'] })).toEqual(['trap', 'sprint']);
  });
  it('the plan before 50: three in sight, nothing folded; a pattern on a waiting game falls back', () => {
    const open = availableGames(ALL, { answered: 0, played: [] });
    expect(drillPlan(null, open)).toEqual({ drill: 'trap', fromPattern: false, also: ['priority', 'callit'], more: [] });
    expect(drillPlan('canopy', open).drill).toBe('trap');
    expect(drillPlan('priority', open)).toMatchObject({ drill: 'priority', fromPattern: true, more: [] });
  });
});
