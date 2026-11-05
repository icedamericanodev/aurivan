/**
 * Grove Phase 4b (design-notes/grove/phase4b/PHASE4B.md 3.4 and section 6): the drills' names on the phone.
 *
 * Plain English for the founder:
 * - Sky approved showing the game "Field Guide" as **Term Match**. Only the name a learner reads changes:
 *   its id (`field`), its saved rounds, best scores and levels stay exactly as they are.
 * - The registry (engine/games/registry.ts) also feeds the website's plant bundle, so its name changes in
 *   the bundle release (PHASE4B section 11, build step 1). Until then the phone's drill screens read the
 *   name from here. Once the registry already says "Term Match", this simply returns the same words.
 */
import { gameTitle, GAMES, type GameId } from '../engine/games/registry';

/** The visible name of the renamed game (PHASE4B 3.4). */
export const TERM_MATCH = 'Term Match';

/** A drill's name as the phone shows it. */
export function drillName(id: GameId): string {
  return id === 'field' ? TERM_MATCH : GAMES[id].name;
}

/** A saved plan item's title (engine gameTitle), with the renamed game's new name. */
export function drillTitle(id: string, savedLabel: string): string {
  return id === 'field' ? TERM_MATCH : gameTitle(id, savedLabel);
}
