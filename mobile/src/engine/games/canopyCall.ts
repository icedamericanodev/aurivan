/**
 * Canopy Call (id `canopy`) — "Choose who has the authority to decide."
 * (games review §3.7, Build F)
 *
 * Plain English for the founder:
 * - A round is 10 one-line decision cards from the reviewed deck
 *   (content/games/cisa/roles.json): "Approve the IS audit charter",
 *   "Accept a residual risk"… The learner taps the role that decides.
 * - Chips: 4 roles (5 at Heartwood), always including the right one. A
 *   card's `exclude_chips` are NEVER offered on that card: the reviewers
 *   found the notes make those roles partly defensible there, so offering
 *   them would mark a reasonable answer wrong.
 * - Levels follow the deck's own card tiers: Seedling cards (governance vs
 *   management), Sapling (owner vs custodian vs auditor), Heartwood ("who
 *   acts FIRST?" cards). Seedling chips come from different layers of
 *   authority; Sapling and Heartwood chips are near neighbours, and the IS
 *   auditor (who assesses and recommends, and never owns) is always among them.
 * - Feedback: one line on why, plus "the auditor's move" where the deck has one.
 * - Score: +1 per card. The end screen shows CONFUSION PAIRS, e.g. "You gave
 *   2 Data owner decisions to Custodian", which is exactly what the slip
 *   coach's "wrong role" pattern drills.
 * - Each card is a review card ("role:1A1.3:r001"); a missed one returns in
 *   a later round. Cards never feed readiness or mastery.
 *
 * Pure TypeScript: no React, no storage. The deck is passed in.
 */
import type { RoleCard, RoleDeck } from '../../content/games';
import { shuffled, type Rng } from '../random';
import type { ReviewEntry } from '../srs';

export const CANOPY_SIZE = 10;
export const CANOPY_MIN_POOL = CANOPY_SIZE * 2;

export type CanopyTier = 'seedling' | 'sapling' | 'heartwood';
export const CANOPY_TIERS: CanopyTier[] = ['seedling', 'sapling', 'heartwood'];
export const CANOPY_TIER_NAME: Record<CanopyTier, string> = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
export const CANOPY_TIER_LINE: Record<CanopyTier, string> = {
  seedling: 'Governance or management? Four roles to choose from.',
  sapling: 'Owner, custodian or auditor? Near neighbours.',
  heartwood: 'Who acts FIRST? Five roles to choose from.',
};

/** Layers of authority (the canopy): board-level governance down to the floor, and assurance beside it. */
export type RoleLayer = 'governance' | 'management' | 'operations' | 'assurance';
export const ROLE_LAYER: Record<string, RoleLayer> = {
  board: 'governance',
  audit_committee: 'governance',
  steering_committee: 'governance',
  senior_management: 'management',
  risk_owner: 'management',
  data_owner: 'management',
  change_authority: 'management',
  custodian: 'operations',
  information_security: 'operations',
  is_auditor: 'assurance',
};
const layerOf = (role: string): RoleLayer => ROLE_LAYER[role] ?? 'management';

/** The review card id: "role:1A1.3:r001". */
export function canopyCardId(card: RoleCard): string {
  return `role:${card.subtopicId}:${card.id}`;
}

/** The roles a card may offer: everything except its excluded chips (never the key itself). */
export function allowedRoles(card: RoleCard, deck: RoleDeck): string[] {
  return deck.roles.map((r) => r.id).filter((id) => id === card.role || !card.excludeChips.includes(id));
}

/**
 * The chips for a card: the key plus decoys, shuffled. Never an excluded
 * chip, never a repeat.
 * - Seedling (4): one decoy from each OTHER layer first, so the call is
 *   about the level of authority.
 * - Sapling (4) and Heartwood (5): the IS auditor (unless it is the key),
 *   then roles from the key's own layer, then the neighbouring layers.
 */
export function chipsFor(card: RoleCard, deck: RoleDeck, tier: CanopyTier, rng: Rng): string[] {
  const n = tier === 'heartwood' ? 5 : 4;
  const pool = shuffled(allowedRoles(card, deck).filter((id) => id !== card.role), rng);
  const out = [card.role];
  const add = (id: string | undefined) => {
    if (id && out.length < n && !out.includes(id)) out.push(id);
  };
  if (tier === 'seedling') {
    for (const layer of shuffled(['governance', 'management', 'operations', 'assurance'] as RoleLayer[], rng)) {
      if (layer !== layerOf(card.role)) add(pool.find((id) => layerOf(id) === layer));
    }
  } else {
    if (card.role !== 'is_auditor') add(pool.find((id) => id === 'is_auditor'));
    for (const id of pool.filter((x) => layerOf(x) === layerOf(card.role))) add(id);
  }
  for (const id of pool) add(id);
  return shuffled(out, rng);
}

/** Cards a level plays: its own tier first; topped up from the next tier down (then up) if short. */
export function canopyPool(deck: RoleDeck, tier: CanopyTier, size = CANOPY_SIZE): RoleCard[] {
  const own = deck.cards.filter((c) => c.tier === tier);
  if (own.length >= size) return own;
  const order: CanopyTier[] = tier === 'heartwood' ? ['sapling', 'seedling'] : tier === 'sapling' ? ['seedling', 'heartwood'] : ['sapling', 'heartwood'];
  return [...own, ...order.flatMap((t) => deck.cards.filter((c) => c.tier === t))];
}

export interface CanopyItem {
  card: RoleCard;
  chips: string[];
}

/** A card's domain, from its note ("1A1.3" → "1"). */
const domainOf = (card: RoleCard) => card.subtopicId.charAt(0);

/**
 * A round: due cards from this level's pool first, then the rest, with at
 * most 3 cards from one domain while others remain (interleaving).
 */
export function buildCanopyRound(
  deck: RoleDeck,
  cards: Record<string, ReviewEntry> | undefined,
  tier: CanopyTier,
  rng: Rng,
  now: number,
  size = CANOPY_SIZE,
): CanopyItem[] {
  const pool = canopyPool(deck, tier, size);
  const due = shuffled(pool.filter((c) => (cards?.[canopyCardId(c)]?.dueAt ?? Infinity) <= now), rng);
  const order = [...due, ...shuffled(pool.filter((c) => !due.includes(c)), rng)];
  const picked: RoleCard[] = [];
  const perDomain = new Map<string, number>();
  for (const c of order) {
    if (picked.length >= size) break;
    if ((perDomain.get(domainOf(c)) ?? 0) >= 3) continue;
    perDomain.set(domainOf(c), (perDomain.get(domainOf(c)) ?? 0) + 1);
    picked.push(c);
  }
  for (const c of order) {
    if (picked.length >= size) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return shuffled(picked, rng).map((card) => ({ card, chips: chipsFor(card, deck, tier, rng) }));
}

export interface CanopyAnswer {
  card: RoleCard;
  picked: string;
}

export const isRightRole = (a: CanopyAnswer) => a.picked === a.card.role;

/** Score: one point per right call. */
export function canopyScore(answers: readonly CanopyAnswer[]): number {
  return answers.filter(isRightRole).length;
}

export interface ConfusionPair {
  role: string;
  picked: string;
  count: number;
  line: string;
}

/**
 * The end screen's confusion pairs: wrong calls grouped by (right role,
 * picked role), most frequent first: "You gave 2 Data owner decisions to
 * Custodian." At most `max` lines.
 */
export function confusionPairs(answers: readonly CanopyAnswer[], deck: RoleDeck, max = 3): ConfusionPair[] {
  const short = (id: string) => deck.roles.find((r) => r.id === id)?.short ?? id;
  const counts = new Map<string, ConfusionPair>();
  for (const a of answers) {
    if (isRightRole(a)) continue;
    const k = `${a.card.role}>${a.picked}`;
    const cur = counts.get(k) ?? { role: a.card.role, picked: a.picked, count: 0, line: '' };
    cur.count += 1;
    counts.set(k, cur);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((p) => ({
      ...p,
      line: `You gave ${p.count === 1 ? 'one' : p.count} ${short(p.role)} ${p.count === 1 ? 'decision' : 'decisions'} to ${short(p.picked)}.`,
    }));
}
