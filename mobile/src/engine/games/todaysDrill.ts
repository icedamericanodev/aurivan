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
