/**
 * Today's drill — which game Play should lead with, and which others sit
 * beside it. Pure TypeScript: no React, no storage.
 *
 * Plain English for the founder:
 * - The Mistake journal already works out "your pattern" (engine/slipCoach.ts)
 *   and names the mini-game that drills it. Play now leads with THAT game,
 *   called "Today's drill".
 * - Beside it Play shows two related games, so three games are in sight.
 *   The other six wait under "More games". (Nine games in all: frozen, no
 *   new ones. Paid plans may later unlock games beyond the first three.)
 * - Mobile 1.40: a new learner sees only the three core games (CORE_GAMES)
 *   until about 50 practice answers; then "More games" opens. A game the
 *   learner already played always stays (availableGames).
 * - With no pattern yet (a new learner), it leads with Snare Spotter, the
 *   game that trains the most common exam skill: beating the tempting wrong
 *   answer.
 * - A game this exam cannot play (too few questions) is never chosen.
 */
import { GAME_ORDER, type GameId } from './registry';

/** The game Play leads with when there is no pattern to drill yet. */
export const DEFAULT_DRILL: GameId = 'trap';

/**
 * Games that train a skill close to each game's: the two shown beside the
 * drill. Listed best-first; a game that cannot be played is skipped.
 */
export const RELATED: Record<GameId, GameId[]> = {
  trap: ['priority', 'callit'],
  priority: ['trap', 'callit'],
  sprint: ['daylight', 'trap'],
  daylight: ['sprint', 'priority'],
  rumor: ['field', 'trap'],
  callit: ['trap', 'priority'],
  field: ['rumor', 'stones'],
  canopy: ['rumor', 'trap'],
  stones: ['canopy', 'field'],
};

/** How many games are in sight on Play before "More games". */
export const SHOWN_GAMES = 3;

/**
 * Mobile 1.40: the three core games, the ones Play shows first. They train
 * the three habits the exam rewards most: beating the tempting wrong answer
 * (Snare Spotter), reading the word that decides (Signpost) and answering
 * before the options (Call It First). They are also a new learner's default
 * drill and its two related games, so a new learner sees exactly these.
 */
export const CORE_GAMES: readonly GameId[] = ['trap', 'priority', 'callit'];

/** Mobile 1.40: practice answers before the other games open under "More games". */
export const MORE_GAMES_AT = 50;

/** What decides which games a learner sees (saved data only). */
export interface GameAccess {
  /** Practice questions answered on this exam (distinct questions). */
  answered: number;
  /** Games this learner has already played (any exam): never taken away. */
  played: readonly GameId[];
}

/** True once "More games" is open for everyone: about 50 practice answers. */
export const moreGamesOpen = (answered: number): boolean => answered >= MORE_GAMES_AT;

/**
 * The games Play offers now, in Play's order (a filter of `playable`):
 * - the core three, always;
 * - every game, once the learner has answered MORE_GAMES_AT questions;
 * - and any game the learner already played, so an update never takes a
 *   game away from someone who used it.
 */
export function availableGames(playable: readonly GameId[], a: GameAccess): GameId[] {
  if (moreGamesOpen(a.answered)) return [...playable];
  return playable.filter((g) => CORE_GAMES.includes(g) || a.played.includes(g));
}

/** Games this exam can play that are still waiting for the learner's 50 answers (none once open). */
export function waitingGames(playable: readonly GameId[], a: GameAccess): GameId[] {
  const open = availableGames(playable, a);
  return playable.filter((g) => !open.includes(g));
}

export interface DrillPlan {
  /** Today's drill: the lead game (null only when no game can be played). */
  drill: GameId | null;
  /** True when the drill was picked from the learner's own mistake pattern. */
  fromPattern: boolean;
  /** Related games shown beside it (SHOWN_GAMES - 1 of them when enough exist). */
  also: GameId[];
  /** Every other game, in Play's usual order (under "More games"). */
  more: GameId[];
}

/**
 * @param patternGame the game the slip coach names (null when there is no pattern or none fits)
 * @param playable    the games this exam can play, in Play's order (lib/games.ts playableGames)
 */
export function drillPlan(patternGame: GameId | null, playable: GameId[]): DrillPlan {
  if (playable.length === 0) return { drill: null, fromPattern: false, also: [], more: [] };
  const fromPattern = patternGame !== null && playable.includes(patternGame);
  const drill = fromPattern ? (patternGame as GameId) : playable.includes(DEFAULT_DRILL) ? DEFAULT_DRILL : playable[0];
  // Related games first, then (if the exam cannot play enough of them) the rest in the usual order.
  const candidates = [...RELATED[drill], ...GAME_ORDER].filter((g) => g !== drill && playable.includes(g));
  const also = [...new Set(candidates)].slice(0, SHOWN_GAMES - 1);
  const more = playable.filter((g) => g !== drill && !also.includes(g));
  return { drill, fromPattern, also, more };
}
