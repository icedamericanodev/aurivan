/**
 * Finishing a game round — ONE place every game calls when its last answer
 * is in, so they all save the same things the same way:
 * 1. the score (best + the last-rounds trend: recordGame);
 * 2. the game's level (engine/games/growth.ts): the round's skill-step
 *    share, played at which level, and each skill-step result;
 * 3. the skill-badge counters this round adds (rumors cleared, FIRST words
 *    read, Daylight rounds at pace);
 * 4. today's plan (logGame);
 * 5. milestones: anything now earned is saved, and the round end shows at
 *    most ONE (the rest wait in the queue, like Results).
 * The round end reads what changed from the returned RoundNews.
 */
import { growthTier, type GameTier, type TierChange } from '../engine/games/growth';
import type { GameId } from '../engine/games/registry';
import { addCount, type CounterId } from '../engine/milestones';
import { selectCert, useProgress } from '../store/progress';
import { logGame } from './activity';
import { celebrateNext, checkMilestones, type MilestoneMoment } from './milestones';

export interface GameRoundResult {
  score: number;
  /** Share of the skill step done right this round, 0..1. */
  rate: number;
  /** The level the round was played at (games without levels: the learner's level). */
  tier: GameTier;
  /** Each skill-step result, in order. */
  hits?: boolean[];
  /** The game's own "well done" verdict, when it has one (Sure Footing: well calibrated). */
  good?: boolean;
  /** Skill-badge counters this round adds. */
  counts?: Partial<Record<CounterId, number>>;
}

/** What the round end shows besides the score. */
export interface RoundNews {
  change: TierChange;
  /** The learner's level after this round. */
  tier: GameTier;
  /** A new personal best (a text line, never a badge). Not on a first round. */
  best: boolean;
  moment: MilestoneMoment | null;
}

export function finishGameRound(certId: string, game: GameId, r: GameRoundResult): RoundNews {
  const p = useProgress.getState();
  const before = selectCert(p, certId).gameBest[game];
  p.recordGame(certId, game, r.score);
  const change = p.noteGameRound(certId, game, { rate: r.rate, tier: r.tier, ...(r.hits ? { hits: r.hits } : {}), ...(r.good !== undefined ? { good: r.good } : {}) });
  for (const [id, by] of Object.entries(r.counts ?? {}) as [CounterId, number][]) {
    if (by > 0) p.updateMilestones(certId, (m) => ({ milestones: addCount(m, id, by)! }));
  }
  logGame(certId, game);
  checkMilestones(certId, { finished: true });
  const moment = celebrateNext(certId);
  const tier = growthTier(selectCert(useProgress.getState(), certId).gameGrowth?.[game]);
  return { change, tier, best: before !== undefined && r.score > before, moment };
}

/** The level a game's first screen starts on: the learner's own. */
export function startingTier(certId: string, game: GameId): GameTier {
  return growthTier(selectCert(useProgress.getState(), certId).gameGrowth?.[game]);
}
