/**
 * Game registry — the ONE place a game's name, tagline, skill, round size
 * and length live. Play, the game screens, Today's plan and the Mistake
 * journal all read from here, so a rename never drifts between screens.
 *
 * IDs are forever. Saved progress (best scores, history, plan items) is
 * keyed on `trap`, `sprint`, `priority` and `daylight` (Build D), so a rename is a display change
 * only: never change an id.
 *
 * Plain English for the founder:
 * - `size`     how many questions one round asks.
 * - `minutes`  an HONEST length, worked out from `size` at the app's normal
 *              study pace (engine/pace.ts), never a hand-typed guess.
 * - `minPool`  the fewest playable questions a certification needs before
 *              the game is shown at all (future certs with small banks).
 *              It is never shown to learners as a number.
 */
import type { PackQuestion } from '../../content/types';
import { MINUTES_PER_QUESTION } from '../pace';
import { DAYLIGHT_MINUTES, DAYLIGHT_SIZE, daylightPool } from './daylight';
import { priorityPool } from './priorityLens';
import { trapPool } from './trapSpotter';

export type GameId = 'trap' | 'sprint' | 'priority' | 'daylight';

export interface GameInfo {
  id: GameId;
  name: string;
  /** One line under the name: what you do and why it helps. */
  tagline: string;
  /** The exam skill it trains (the hero caption). */
  skill: string;
  /** Questions per round. */
  size: number;
  /** About how long a round takes, from `size` (see `roundMinutes`). */
  minutes: number;
  /** Fewest playable questions before the game is offered. */
  minPool: number;
  /** The questions this game can use. */
  pool: (questions: PackQuestion[]) => PackQuestion[];
}

/** An honest round length: questions × the normal study pace, at least 1 minute. */
export function roundMinutes(size: number): number {
  return Math.max(1, Math.round(size * MINUTES_PER_QUESTION));
}

const make = (g: Omit<GameInfo, 'minutes' | 'minPool'> & { minPool?: number; minutes?: number }): GameInfo => ({
  ...g,
  // A timed game (Daylight) passes its time budget instead of the study-pace estimate.
  minutes: g.minutes ?? roundMinutes(g.size),
  // Two full rounds' worth by default, so rounds don't repeat straight away.
  minPool: g.minPool ?? g.size * 2,
});

export const GAMES: Record<GameId, GameInfo> = {
  trap: make({
    id: 'trap',
    name: 'Snare Spotter',
    tagline: 'Find the answer built to fool you, then the best one.',
    skill: 'Beating distractors',
    size: 5,
    pool: trapPool,
  }),
  sprint: make({
    id: 'sprint',
    name: 'Sure Footing',
    tagline: 'How sure are you, really? Honest confidence scores best.',
    skill: 'Knowing what you know',
    size: 8,
    pool: (qs) => qs,
  }),
  priority: make({
    id: 'priority',
    name: 'Signpost',
    tagline: 'Read the word that decides which true answer wins.',
    skill: 'Reading like the examiner',
    size: 5,
    pool: priorityPool,
  }),
  // Build D: the round has ONE time budget, so its length is that budget.
  daylight: make({
    id: 'daylight',
    name: 'Daylight',
    tagline: 'Answer at exam pace.',
    skill: 'Pacing',
    size: DAYLIGHT_SIZE,
    minutes: DAYLIGHT_MINUTES,
    pool: daylightPool,
  }),
};

/** Display order on Play (the first is the featured hero). */
export const GAME_ORDER: GameId[] = ['trap', 'sprint', 'priority', 'daylight'];

/** A game's info by id, or undefined for an unknown id (e.g. from a newer save). */
export function gameInfo(id: string): GameInfo | undefined {
  return (GAMES as Record<string, GameInfo | undefined>)[id];
}

/** A round's length in minutes for any saved game id (unknown ids fall back to the shortest game). */
export function gameMinutes(id: string): number {
  return gameInfo(id)?.minutes ?? Math.min(...GAME_ORDER.map((g) => GAMES[g].minutes));
}

/**
 * The title for a saved plan item. The name comes from the registry by id,
 * so a plan saved before a rename (label "Trap Spotter · 2 min") shows
 * today's name; an unknown id falls back to the label's first part.
 */
export function gameTitle(id: string, savedLabel: string): string {
  return gameInfo(id)?.name ?? savedLabel.split(' · ')[0];
}

/** True when this certification has enough questions for the game. */
export function isPlayable(id: GameId, questions: PackQuestion[]): boolean {
  return GAMES[id].pool(questions).length >= GAMES[id].minPool;
}
