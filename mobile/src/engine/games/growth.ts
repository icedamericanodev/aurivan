/**
 * Game growth — each game's level: Seedling → Sapling → Heartwood
 * (games review §5, Build F).
 *
 * Plain English for the founder:
 * - Every game has a "skill step": the thing it trains (snares spotted,
 *   meanings right, honest confidence, stones placed…). Each round ends
 *   with the share of that step done right, 0 to 1 (the "rate").
 * - Two rounds IN A ROW at 80% or more, played at your level, move you up
 *   one level. Two rounds in a row under 50% move you back one, worded
 *   "Back to Sapling for a few rounds": never as a loss, never a warning.
 * - Only rounds played AT your level count toward moving. A learner may
 *   still pick any level on a game's first screen (it starts on theirs);
 *   trying a harder one never knocks them back.
 * - We also keep the last 30 skill-step results (hits) per game, for the
 *   skill badges ("spot the snare in 8 of your last 10"), and a run of
 *   rounds in a row with the game's own "well done" verdict (Sure Footing:
 *   "well calibrated"). Nothing here counts plays or minutes.
 *
 * Pure TypeScript: no React, no storage.
 */

export type GameTier = 'seedling' | 'sapling' | 'heartwood';
export const GAME_TIERS: GameTier[] = ['seedling', 'sapling', 'heartwood'];
export const GAME_TIER_NAME: Record<GameTier, string> = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };

/** A round at this share or more counts toward moving up. */
export const PROMOTE_AT = 0.8;
/** A round under this share counts toward stepping back. */
export const STEP_BACK_BELOW = 0.5;
/** Rounds in a row needed to move either way. */
export const ROUNDS_IN_A_ROW = 2;
/** How many skill-step results we keep per game. */
export const HITS_CAP = 30;

export interface GameGrowth {
  tier: GameTier;
  /** Rounds in a row, at this level, at PROMOTE_AT or more. */
  up: number;
  /** Rounds in a row, at this level, under STEP_BACK_BELOW. */
  down: number;
  /** The last HITS_CAP skill-step results, oldest first (true = right). Optional. */
  hits?: boolean[];
  /** Rounds in a row with the game's own "well done" verdict. Optional. */
  run?: number;
}

export type TierChange = 'up' | 'down' | null;

export interface RoundOutcome {
  /** Share of the skill step done right this round, 0..1. */
  rate: number;
  /** The level the round was played at. */
  tier: GameTier;
  /** Each skill-step result this round, in order (optional). */
  hits?: readonly boolean[];
  /** The game's own verdict for the round, when it has one (Sure Footing: well calibrated). */
  good?: boolean;
}

/** The learner's level for a game (Seedling until they have played it). */
export function growthTier(g: GameGrowth | undefined): GameTier {
  return g?.tier ?? 'seedling';
}

const step = (t: GameTier, by: 1 | -1): GameTier => GAME_TIERS[Math.min(GAME_TIERS.length - 1, Math.max(0, GAME_TIERS.indexOf(t) + by))];

/**
 * Apply one finished round. Returns the new growth and whether the level
 * changed. A round played away from the learner's level only adds its hits
 * (and the verdict run): it never moves the level.
 */
export function noteRound(prev: GameGrowth | undefined, r: RoundOutcome): { growth: GameGrowth; change: TierChange } {
  const g: GameGrowth = prev ?? { tier: 'seedling', up: 0, down: 0 };
  const rate = Number.isFinite(r.rate) ? Math.min(1, Math.max(0, r.rate)) : 0;
  const hits = r.hits?.length ? [...(g.hits ?? []), ...r.hits].slice(-HITS_CAP) : g.hits;
  const run = r.good === undefined ? g.run : r.good ? (g.run ?? 0) + 1 : 0;
  const extra = { ...(hits ? { hits } : {}), ...(run !== undefined ? { run } : {}) };
  if (r.tier !== g.tier) return { growth: { tier: g.tier, up: g.up, down: g.down, ...extra }, change: null };

  const up = rate >= PROMOTE_AT ? g.up + 1 : 0;
  const down = rate < STEP_BACK_BELOW ? g.down + 1 : 0;
  if (up >= ROUNDS_IN_A_ROW && g.tier !== 'heartwood') {
    return { growth: { tier: step(g.tier, 1), up: 0, down: 0, ...extra }, change: 'up' };
  }
  if (down >= ROUNDS_IN_A_ROW && g.tier !== 'seedling') {
    return { growth: { tier: step(g.tier, -1), up: 0, down: 0, ...extra }, change: 'down' };
  }
  // At the top or the bottom the count simply stays capped (nothing to move to).
  return { growth: { tier: g.tier, up: Math.min(up, ROUNDS_IN_A_ROW), down: Math.min(down, ROUNDS_IN_A_ROW), ...extra }, change: null };
}

/**
 * The quiet line on the round's end screen when the level moved. Growth is
 * news; stepping back is framed as practice, never as a loss.
 */
export function tierChangeLine(change: TierChange, tier: GameTier): string | null {
  if (change === 'up') return `You’ve grown to ${GAME_TIER_NAME[tier]}. Your next round starts there.`;
  if (change === 'down') return `Back to ${GAME_TIER_NAME[tier]} for a few rounds.`;
  return null;
}

/** Share of `true` in a list (0 for an empty list). */
export function share(hits: readonly boolean[]): number {
  return hits.length ? hits.filter(Boolean).length / hits.length : 0;
}
