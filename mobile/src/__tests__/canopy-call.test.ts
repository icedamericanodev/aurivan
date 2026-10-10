/**
 * Canopy Call (games review §3.7): the reviewed roles deck, exclude_chips
 * honoured on every card at every level, levels by card tier, scoring,
 * confusion pairs, and the slip coach's "wrong role" pattern drilling here.
 */
import { getRoleDeck } from '../content/games';
import {
  allowedRoles,
  buildCanopyRound,
  CANOPY_SIZE,
  canopyCardId,
  canopyPool,
  canopyScore,
  chipsFor,
  confusionPairs,
  ROLE_LAYER,
  type CanopyTier,
} from '../engine/games/canopyCall';
import { GAMES, isPlayable } from '../engine/games/registry';
import { createRng } from '../engine/random';
import { PATTERN_COPY } from '../engine/slipCoach';

const deck = getRoleDeck('cisa')!;
const TIERS: CanopyTier[] = ['seedling', 'sapling', 'heartwood'];
const T0 = Date.UTC(2026, 9, 12);

describe('chips', () => {
  it('never offer a card’s exclude_chips, at any level, on any shuffle', () => {
    const withX = deck.cards.filter((c) => c.excludeChips.length);
    expect(withX.length).toBe(4);
    for (const card of withX) {
      for (const tier of TIERS) {
        for (let seed = 1; seed <= 60; seed++) {
          const chips = chipsFor(card, deck, tier, createRng(seed));
          for (const x of card.excludeChips) expect(chips).not.toContain(x);
        }
      }
    }
    expect(allowedRoles(deck.cards.find((c) => c.id === 'r001')!, deck)).not.toContain('board');
  });

  it('always include the key, with no repeats: 4 chips, 5 at Heartwood', () => {
    for (const card of deck.cards) {
      for (const tier of TIERS) {
        const chips = chipsFor(card, deck, tier, createRng(card.id.length + tier.length));
        expect(chips).toContain(card.role);
        expect(new Set(chips).size).toBe(chips.length);
        expect(chips).toHaveLength(tier === 'heartwood' ? 5 : 4);
      }
    }
  });

  it('Seedling spreads the chips across layers of authority', () => {
    const card = deck.cards.find((c) => c.role === 'audit_committee' && !c.excludeChips.length)!;
    const chips = chipsFor(card, deck, 'seedling', createRng(5));
    expect(new Set(chips.map((id) => ROLE_LAYER[id])).size).toBe(4);
  });

  it('Sapling and Heartwood always offer the IS auditor as a near neighbour', () => {
    for (const card of deck.cards.filter((c) => c.role !== 'is_auditor' && !c.excludeChips.includes('is_auditor'))) {
      expect(chipsFor(card, deck, 'sapling', createRng(3))).toContain('is_auditor');
      expect(chipsFor(card, deck, 'heartwood', createRng(4))).toContain('is_auditor');
    }
  });
});

describe('rounds', () => {
  it('levels follow the deck’s card tiers', () => {
    for (const tier of TIERS) {
      const pool = canopyPool(deck, tier);
      expect(pool.every((c) => c.tier === tier)).toBe(true);
      const round = buildCanopyRound(deck, undefined, tier, createRng(7), T0);
      expect(round).toHaveLength(CANOPY_SIZE);
      expect(round.every((i) => i.card.tier === tier)).toBe(true);
      expect(new Set(round.map((i) => i.card.id)).size).toBe(CANOPY_SIZE);
    }
  });

  it('a short level is topped up from its neighbours, never short', () => {
    const small = { ...deck, cards: deck.cards.filter((c) => c.tier !== 'heartwood').concat(deck.cards.filter((c) => c.tier === 'heartwood').slice(0, 3)) };
    expect(buildCanopyRound(small, undefined, 'heartwood', createRng(2), T0)).toHaveLength(CANOPY_SIZE);
  });

  it('interleaves domains: at most 3 cards from one domain', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const round = buildCanopyRound(deck, undefined, 'sapling', createRng(seed), T0);
      const per = new Map<string, number>();
      for (const i of round) per.set(i.card.subtopicId[0], (per.get(i.card.subtopicId[0]) ?? 0) + 1);
      expect(Math.max(...per.values())).toBeLessThanOrEqual(3);
    }
  });

  it('a missed card that is due comes back first', () => {
    const missed = deck.cards.find((c) => c.tier === 'sapling')!;
    const cards = { [canopyCardId(missed)]: { box: 1, dueAt: T0 - 1, lastSeen: T0 - 1, reps: 1 } };
    for (let seed = 1; seed <= 10; seed++) {
      expect(buildCanopyRound(deck, cards, 'sapling', createRng(seed), T0).map((i) => i.card.id)).toContain(missed.id);
    }
    expect(canopyCardId(missed)).toBe(`role:${missed.subtopicId}:${missed.id}`);
  });
});

describe('scoring and the end screen', () => {
  const card = (role: string, id = role) => ({ ...deck.cards[0], id, role });

  it('+1 per right call', () => {
    expect(canopyScore([{ card: card('data_owner'), picked: 'data_owner' }, { card: card('custodian'), picked: 'data_owner' }])).toBe(1);
  });

  it('shows confusion pairs, most frequent first, in plain words', () => {
    const pairs = confusionPairs(
      [
        { card: card('data_owner', 'a'), picked: 'custodian' },
        { card: card('data_owner', 'b'), picked: 'custodian' },
        { card: card('board', 'c'), picked: 'senior_management' },
        { card: card('is_auditor', 'd'), picked: 'is_auditor' },
      ],
      deck,
    );
    expect(pairs.map((p) => p.line)).toEqual(['You gave 2 Data owner decisions to Custodian.', 'You gave one Board of directors decision to Senior management.']);
  });
});

describe('wiring', () => {
  it('is in the registry with its name and tagline, and needs the deck', () => {
    expect(GAMES.canopy.name).toBe('Canopy Call');
    expect(GAMES.canopy.tagline).toBe('Choose who has the authority to decide.');
    expect(isPlayable('canopy', [], null, { roles: deck })).toBe(true);
    expect(isPlayable('canopy', [], null, {})).toBe(false);
    expect(isPlayable('canopy', [], null, { roles: { ...deck, cards: deck.cards.slice(0, 19) } })).toBe(false);
  });

  it('the slip coach’s "wrong role" pattern drills in Canopy Call', () => {
    expect(PATTERN_COPY.role.game).toBe('canopy');
  });
});
