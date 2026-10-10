/**
 * Call It First (id `callit`) — "Name the principle before you see the
 * options." (games review §3.3)
 *
 * Plain English for the founder:
 * - Step 1: the stem shows with the options HIDDEN. The learner picks which
 *   principle the question tests, from 3 cards: the question's own
 *   `keyConcept` and 2 decoys.
 * - Step 2: the options appear and the learner answers.
 * - The question's `preRead` line is an optional hint. Using it makes the
 *   answer "assisted" (half credit in readiness, like Coach me).
 * - Score: +1 for the principle, +1 for the answer, over 5 questions.
 * - Tiers: Seedling = decoys from OTHER topics (easier to tell apart);
 *   Sapling = near-topic decoys, from `related`; Heartwood = no cards at all:
 *   a 10-second think pause with the options hidden, then answer.
 *
 * `related` holds concept NAMES ("Organizational independence"), not
 * question ids. So a near-topic decoy is the keyConcept of another question
 * whose subtopic label or keyConcept names one of those concepts, topped up
 * with keyConcepts from the same study-notes topic.
 *
 * The leak check (run when the pool is built, and on CI by the tests): if
 * more than 60% of the key option's words already appear in the
 * keyConcept, step 1 would hand over the answer, so the question is left
 * out of this game. Decoys that say nearly the same thing as the real
 * principle are never used.
 *
 * A wrong principle pick adds no mistake tag: the answer is what counts.
 * Pure TypeScript: no React, no storage.
 */
import type { PackQuestion } from '../../content/types';
import { shuffled, type Rng } from '../random';

export const CALL_SIZE = 5;
/** Heartwood: think this long, options hidden, before they appear. */
export const THINK_MS = 10_000;
/** More than this share of the key option's words in the keyConcept = a leak. */
export const LEAK_LIMIT = 0.6;
/** A decoy this close to the real principle is too similar to be fair. */
export const DECOY_SIMILAR = 0.5;

export type CallTier = 'seedling' | 'sapling' | 'heartwood';
export const CALL_TIERS: CallTier[] = ['seedling', 'sapling', 'heartwood'];
export const CALL_TIER_NAME: Record<CallTier, string> = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
export const CALL_TIER_LINE: Record<CallTier, string> = {
  seedling: 'Decoys from other topics.',
  sapling: 'Decoys from nearby ideas.',
  heartwood: 'No cards: think for 10 seconds, then answer.',
};

const STOP = new Set(
  'a an the of to and or in on for by with is are be as at from that this it its their than not no rather which who what when how into over under more most less least can must should may will only own each any all every per via'.split(' '),
);

/** Lower-case content words, with a light plural trim ("controls" → "control"). */
export function contentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\{\{[A-D]\}\}/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => w.replace(/ies$/, 'y').replace(/s$/, ''));
}

/** Share of `a`'s distinct content words that also appear in `b` (0..1). */
export function overlapShare(a: string, b: string): number {
  const A = [...new Set(contentTokens(a))];
  if (!A.length) return 0;
  const B = new Set(contentTokens(b));
  return A.filter((w) => B.has(w)).length / A.length;
}

/** The leak check: the keyConcept already says the key option. */
export function leaks(q: PackQuestion): boolean {
  if (!q.keyConcept) return true;
  return overlapShare(q.options[q.correct] ?? '', q.keyConcept) > LEAK_LIMIT;
}

/** Questions this game can use: a keyConcept that doesn't give the answer away. */
export function callPool(questions: PackQuestion[]): PackQuestion[] {
  return questions.filter((q) => q.keyConcept && !leaks(q));
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Fair decoy: different from the real principle (not a near-duplicate either way). */
function fair(own: string, decoy: string): boolean {
  if (norm(own) === norm(decoy)) return false;
  return overlapShare(decoy, own) <= DECOY_SIMILAR && overlapShare(own, decoy) <= DECOY_SIMILAR;
}

export interface CallContext {
  /** Every question with a keyConcept (decoys may come from leaky questions too). */
  all: PackQuestion[];
  /** Study-notes topic of a question ("4B1"), for near-topic decoys. */
  topicOf: (questionId: string) => string | undefined;
}

/**
 * Two decoy principles for a question.
 * - Seedling: keyConcepts from a DIFFERENT notes topic (another domain first).
 * - Sapling (and the default): near-topic: `related` names in the same
 *   topic or domain first, then the same notes topic, then the rest.
 */
export function decoysFor(q: PackQuestion, ctx: CallContext, tier: CallTier, rng: Rng): string[] {
  const own = q.keyConcept ?? '';
  const others = ctx.all.filter((o) => o.id !== q.id && o.keyConcept);
  const myTopic = ctx.topicOf(q.id);
  let tiers: PackQuestion[][];
  if (tier === 'seedling') {
    tiers = [
      others.filter((o) => o.domainId !== q.domainId),
      others.filter((o) => o.domainId === q.domainId && ctx.topicOf(o.id) !== myTopic),
    ];
  } else {
    const names = (q.related ?? []).map(norm).filter((n) => n.length > 3);
    const named = others.filter((o) => names.some((n) => norm(o.subtopic).includes(n) || norm(o.keyConcept!).includes(n)));
    const sameTopic = (o: PackQuestion) => Boolean(myTopic) && ctx.topicOf(o.id) === myTopic;
    const sameDomain = (o: PackQuestion) => o.domainId === q.domainId;
    // Nearest first: a related idea in the same topic, then the same
    // domain, then the same topic, then a related idea anywhere.
    tiers = [
      named.filter(sameTopic),
      named.filter(sameDomain),
      others.filter(sameTopic),
      named,
      others.filter(sameDomain),
      others,
    ];
  }
  const out: string[] = [];
  for (const t of tiers) {
    for (const o of shuffled(t, rng)) {
      if (out.length >= 2) return out;
      const k = o.keyConcept!;
      if (fair(own, k) && out.every((d) => fair(d, k))) out.push(k);
    }
  }
  return out;
}

export interface CallItem {
  id: string;
  /** Step 1's three principle cards (empty in Heartwood). */
  cards: string[];
  /** Index of the real principle in `cards` (-1 in Heartwood). */
  correct: number;
}

/** A round: `size` playable questions, mixed domains, each with its cards. */
export function buildCallRound(questions: PackQuestion[], ctx: CallContext, tier: CallTier, rng: Rng, size = CALL_SIZE): CallItem[] {
  const pool = shuffled(callPool(questions), rng);
  // Interleave domains: at most 2 per domain while others remain.
  const perDomain = new Map<string, number>();
  const picked: PackQuestion[] = [];
  for (const q of pool) {
    if (picked.length >= size) break;
    if ((perDomain.get(q.domainId) ?? 0) >= 2) continue;
    perDomain.set(q.domainId, (perDomain.get(q.domainId) ?? 0) + 1);
    picked.push(q);
  }
  for (const q of pool) {
    if (picked.length >= size) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return picked.map((q) => {
    if (tier === 'heartwood') return { id: q.id, cards: [], correct: -1 };
    const cards = shuffled([q.keyConcept!, ...decoysFor(q, ctx, tier, rng)], rng);
    return { id: q.id, cards, correct: cards.indexOf(q.keyConcept!) };
  });
}

/** Points for one question: the principle (not in Heartwood) and the answer. */
export function callPoints(tier: CallTier, principleRight: boolean, answerRight: boolean): number {
  return (tier !== 'heartwood' && principleRight ? 1 : 0) + (answerRight ? 1 : 0);
}

/** The most a round can score. */
export function callMax(tier: CallTier, size: number): number {
  return tier === 'heartwood' ? size : size * 2;
}

/**
 * How the answer is recorded: a hint (preRead) makes it assisted. Game
 * answers never count toward the subtopic mastery date.
 */
export function answerOptions(usedHint: boolean, ms?: number): { assisted: boolean; mastery: false; ms?: number } {
  return { assisted: usedHint, mastery: false, ...(ms !== undefined ? { ms } : {}) };
}
