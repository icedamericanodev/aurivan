/**
 * Which games this certification can play — the registry's minPool guard
 * (engine/games/registry.ts) fed with ALL the cert's content: its questions,
 * its study notes and (Build F) its game decks. Every screen that lists or
 * links a game asks here, so a game is hidden the same way everywhere.
 */
import { getCertification } from '../content/certifications';
import { getRoleDeck, getStepSequences } from '../content/games';
import { getAllQuestions } from '../content/loader';
import { getNotes } from '../content/notes';
import { GAME_ORDER, isPlayable, type GameId } from '../engine/games/registry';

/** True when this cert has enough content for the game. */
export function canPlay(certId: string, id: GameId): boolean {
  // The course's qualifier style: a lowercase course's "first" makes a Signpost question too.
  const qc = getCertification(certId)?.qualifierCase;
  return isPlayable(id, getAllQuestions(certId), getNotes(certId), { roles: getRoleDeck(certId), steps: getStepSequences(certId) }, qc);
}

/** The games this cert can play, in Play's order. */
export function playableGames(certId: string): GameId[] {
  return GAME_ORDER.filter((id) => canPlay(certId, id));
}
