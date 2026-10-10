/**
 * Field Guide (id `field`) — "Match each term to what it means."
 * (games review §3.4, Build F)
 *
 * Plain English for the founder:
 * - Terms come from the study notes: each subtopic's key terms, plus each
 *   domain's own key terms. A term that appears twice is kept once.
 * - LEAK FILTER: a definition that repeats the term's head word ("Immutable
 *   backup: a backup copy that…") gives the answer away, so it is left out.
 *   The head word is the term's last word, without any bracketed acronym;
 *   the acronym itself counts too ("RPO").
 * - A round is 3 boards. A board shows 4 terms and their 4 definitions:
 *   tap a term, then tap what it means (no dragging).
 *   - Seedling: the 4 terms come from 4 different topics (easy to tell apart).
 *   - Sapling: all 4 from the SAME topic, so the others are near neighbours.
 *   - Heartwood: recall. Each definition is shown alone; pick its term from
 *     6 (the board's 4 plus 2 neighbours), with no definition list.
 * - Score: one point per pair matched on the FIRST try (12 a round).
 * - Spaced review: each term is a card ("kt:4B1.2:<hash>"; a domain term
 *   "kt:D4:<hash>"). A term missed on the first try comes back in a later
 *   round. Cards never feed readiness or mastery.
 *
 * Pure TypeScript: no React, no storage. The notes pack is passed in.
 */
import type { NotesPack } from '../../content/notes/types';
import { shuffled, type Rng } from '../random';
import type { ReviewEntry } from '../srs';
import { textHash } from './rootOrRumor';

export const FIELD_BOARDS = 3;
export const BOARD_SIZE = 4;
/** Heartwood: choices per definition. */
export const RECALL_CHOICES = 6;
export const FIELD_SIZE = FIELD_BOARDS * BOARD_SIZE;
/** Two rounds' worth of clean terms before the game is offered. */
export const FIELD_MIN_POOL = FIELD_SIZE * 2;

export type FieldTier = 'seedling' | 'sapling' | 'heartwood';
export const FIELD_TIERS: FieldTier[] = ['seedling', 'sapling', 'heartwood'];
export const FIELD_TIER_NAME: Record<FieldTier, string> = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
export const FIELD_TIER_LINE: Record<FieldTier, string> = {
  seedling: 'Four terms from four different topics.',
  sapling: 'Four terms from the same topic: near neighbours.',
  heartwood: 'Recall: one meaning at a time, pick its term from six.',
};

export interface FieldTerm {
  /** Stable card id: "kt:4B1.2:<hash>" or, for a domain term, "kt:D4:<hash>". */
  id: string;
  term: string;
  definition: string;
  /** The group "same topic" means: an outline topic ("4B1"), or "D4" for domain terms. */
  topicId: string;
  /** The topic's name ("Business impact analysis"), or "Domain 4 key terms". */
  topicName: string;
  domainId: string;
  /** The note to read again (subtopic terms only). */
  subtopicId?: string;
  subtopicName?: string;
}

/** The term without a bracketed part: "Recovery point objective (RPO)" → "Recovery point objective". */
const bare = (term: string) => term.replace(/\s*\([^)]*\)/g, '').trim();

/** The term's head word: its last word with letters, lower-case ("objective"). */
export function headWord(term: string): string {
  const words = bare(term)
    .split(/[\s/–—-]+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ''))
    .filter((w) => w.length > 0);
  return (words[words.length - 1] ?? '').toLowerCase();
}

/** The bracketed acronym, if any: "Recovery point objective (RPO)" → "RPO". */
export function acronymOf(term: string): string | null {
  const m = /\(([A-Z][A-Za-z0-9&-]{1,9})\)/.exec(term);
  return m ? m[1] : null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * True when the definition gives the term away: it repeats the head word
 * (or a form of it: "audit" → "auditor", "auditing", "backups"), or the
 * term's acronym. Head words under 3 letters are not checked.
 */
export function leaks(term: string, definition: string): boolean {
  const head = headWord(term);
  if (head.length >= 3) {
    const stem = head.length > 4 && head.endsWith('s') ? head.slice(0, -1) : head;
    if (new RegExp(`\\b${escape(stem)}[a-z]{0,4}\\b`, 'i').test(definition)) return true;
  }
  const acr = acronymOf(term);
  return Boolean(acr && new RegExp(`\\b${escape(acr)}s?\\b`).test(definition));
}

/** Every playable term in a notes pack, in note order, leak-filtered and deduped. */
export function termsFromNotes(pack: NotesPack | null | undefined): FieldTerm[] {
  const out: FieldTerm[] = [];
  const seenTerm = new Set<string>();
  const seenDef = new Set<string>();
  const add = (t: { term: string; definition: string }, base: Omit<FieldTerm, 'id' | 'term' | 'definition'>, owner: string) => {
    const term = t.term.trim().replace(/\s+/g, ' ');
    const definition = t.definition.trim().replace(/\s+/g, ' ');
    if (!term || !definition || leaks(term, definition)) return;
    const key = term.toLowerCase();
    // A term repeated across subtopics is kept once (its first note), and two
    // terms never share one definition (the match would be ambiguous). The
    // repeat check ignores a bracketed abbreviation, so "Segregation of
    // duties (SoD)" and "Segregation of duties" are one term (code review).
    // The card id still hashes the full term, so saved cards keep their ids.
    const same = bare(term).toLowerCase();
    if (seenTerm.has(same) || seenDef.has(definition.toLowerCase())) return;
    seenTerm.add(same);
    seenDef.add(definition.toLowerCase());
    out.push({ id: `kt:${owner}:${textHash(key)}`, term, definition, ...base });
  };
  for (const d of pack?.domains ?? []) {
    for (const t of d.topics) {
      for (const s of t.subtopics) {
        for (const k of s.keyTerms) add(k, { topicId: t.id, topicName: t.name, domainId: d.id, subtopicId: s.id, subtopicName: s.name }, s.id);
      }
    }
    for (const k of d.keyTerms) add(k, { topicId: `D${d.id}`, topicName: `Domain ${d.id} key terms`, domainId: d.id }, `D${d.id}`);
  }
  return out;
}

const cache = new WeakMap<NotesPack, FieldTerm[]>();
/** Terms per notes pack, filtered once (the pack never changes while the app runs). */
export function fieldTerms(pack: NotesPack | null | undefined): FieldTerm[] {
  if (!pack) return [];
  let hit = cache.get(pack);
  if (!hit) {
    hit = termsFromNotes(pack);
    cache.set(pack, hit);
  }
  return hit;
}

export interface FieldBoard {
  terms: FieldTerm[];
  /** The definitions in the order shown (indexes into `terms`). */
  defOrder: number[];
  /** Heartwood: for each term (same order as `terms`), the 6 choices to recall it from. */
  choices?: FieldTerm[][];
}

const groupBy = (xs: FieldTerm[], key: (t: FieldTerm) => string) => {
  const m = new Map<string, FieldTerm[]>();
  for (const x of xs) {
    const l = m.get(key(x));
    if (l) l.push(x);
    else m.set(key(x), [x]);
  }
  return m;
};

/** Heartwood: the term plus the board's others plus near neighbours, 6 in all, shuffled. */
export function recallChoices(term: FieldTerm, board: FieldTerm[], all: FieldTerm[], rng: Rng, n = RECALL_CHOICES): FieldTerm[] {
  const out = [term, ...board.filter((t) => t.id !== term.id)];
  const near = [
    ...shuffled(all.filter((t) => t.topicId === term.topicId), rng),
    ...shuffled(all.filter((t) => t.topicId !== term.topicId && t.domainId === term.domainId), rng),
    ...shuffled(all, rng),
  ];
  for (const t of near) {
    if (out.length >= n) break;
    if (!out.some((o) => o.id === t.id)) out.push(t);
  }
  return shuffled(out.slice(0, n), rng);
}

/**
 * A round of 3 boards. Missed terms that are due come first (each pulls in
 * its own topic at Sapling and Heartwood); boards come from different
 * domains where possible.
 */
export function buildFieldRound(
  all: FieldTerm[],
  cards: Record<string, ReviewEntry> | undefined,
  tier: FieldTier,
  rng: Rng,
  now: number,
  boards = FIELD_BOARDS,
): FieldBoard[] {
  const due = shuffled(all.filter((t) => cards?.[t.id] && cards[t.id].dueAt <= now), rng);
  const used = new Set<string>();
  const out: FieldTerm[][] = [];
  if (tier === 'seedling') {
    // 4 terms from 4 different topics per board, due terms first.
    const pool = [...due, ...shuffled(all, rng)];
    for (let b = 0; b < boards; b++) {
      const board: FieldTerm[] = [];
      for (const t of pool) {
        if (board.length >= BOARD_SIZE) break;
        if (used.has(t.id) || board.some((x) => x.topicId === t.topicId)) continue;
        board.push(t);
        used.add(t.id);
      }
      if (board.length === BOARD_SIZE) out.push(board);
    }
  } else {
    // Same-topic boards: topics with a due term first, then topics from
    // domains not used yet (interleaving), then any topic with 4+ terms.
    const byTopic = groupBy(all, (t) => t.topicId);
    const big = [...byTopic.keys()].filter((k) => byTopic.get(k)!.length >= BOARD_SIZE);
    const dueTopics = [...new Set(due.map((t) => t.topicId))].filter((k) => big.includes(k));
    const rest = shuffled(big.filter((k) => !dueTopics.includes(k)), rng);
    const domains = new Set<string>();
    const picked = new Set<string>();
    const take = (topic: string) => {
      const list = byTopic.get(topic)!;
      const dueHere = list.filter((t) => due.some((d) => d.id === t.id));
      const board = [...dueHere, ...shuffled(list.filter((t) => !dueHere.includes(t)), rng)].slice(0, BOARD_SIZE);
      picked.add(topic);
      domains.add(list[0].domainId);
      out.push(board);
    };
    for (const t of dueTopics) if (out.length < boards) take(t);
    for (const t of rest) if (out.length < boards && !domains.has(byTopic.get(t)![0].domainId)) take(t);
    for (const t of rest) if (out.length < boards && !picked.has(t)) take(t);
  }
  return out.map((terms) => {
    const mixed = shuffled(terms, rng);
    return {
      terms: mixed,
      defOrder: shuffled(mixed.map((_, k) => k), rng),
      ...(tier === 'heartwood' ? { choices: mixed.map((t) => recallChoices(t, mixed, all, rng)) } : {}),
    };
  });
}

/** Score: one point per pair matched on the first try. */
export function fieldScore(firstTries: readonly boolean[]): number {
  return firstTries.filter(Boolean).length;
}

/**
 * The spoken name of a board item: "Term 2 of 4: Snapshot, matched". No
 * "selected" here: the tile's accessibilityState already says it, and
 * saying it twice reads "selected, selected" (UX review P2).
 */
export function itemSpoken(kind: 'Term' | 'Meaning', k: number, n: number, text: string, state: { matched?: boolean }): string {
  return `${kind} ${k + 1} of ${n}: ${text}${state.matched ? ', matched' : ''}`;
}
