/**
 * Root or Rumor (id `rumor`) — "Tell a sound principle from an exam myth."
 * (games review §3.1)
 *
 * Plain English for the founder:
 * - The learner sees 12 one-line statements, one at a time, and taps
 *   Root (a sound principle) or Rumor (an exam myth).
 * - Rumors are the study notes' exam traps (`examTraps.trap`): the false
 *   beliefs that make wrong options feel right. Roots are true lines from the
 *   same notes: the first sentence of "How ISACA thinks" (`isacaRule`) and
 *   "How it works" lines of 30 words or fewer.
 * - The content filter (`cleanStatement`) runs on the bundled notes when the
 *   game first loads, and the content-pack tests run it at build time on CI:
 *   no questions, 8–30 words, a whole sentence (capital letter, full stop),
 *   no "e.g." / "i.e." fragments, and no line that leans on the one before
 *   ("It…", "These…"), because a statement must stand alone.
 * - A round pairs a Rumor and a Root from the SAME subtopic wherever it
 *   can, so the topic alone gives nothing away. About half are each.
 * - Tiers: Seedling = one domain per round; Sapling = mixed domains;
 *   Heartwood = mixed, plus a "Why?" follow-up on each Rumor (pick the real
 *   reason from 3; the other 2 are the reasons for sibling traps).
 * - Score: +1 per right tap (out of 12); the longest run of right taps is
 *   shown quietly. Heartwood's "Why?" picks are reported, not scored.
 * - Spaced review: each statement is a CARD with a stable id; a missed card
 *   comes back in a later round (srs rules, progress `cards`). Two or more
 *   missed cards in one subtopic → a "Read again" nudge to its note.
 * - Games never count toward mastery or readiness: cards are not questions.
 *
 * Pure TypeScript: no React, no storage. The notes pack is passed in.
 */
import type { NotesPack } from '../../content/notes/types';
import { shuffled, type Rng } from '../random';
import type { ReviewEntry } from '../srs';

export const RUMOR_SIZE = 12;
/** Fewest statements before the game is offered (two rounds' worth). */
export const RUMOR_MIN_POOL = RUMOR_SIZE * 2;
export const MIN_WORDS = 8;
export const MAX_WORDS = 30;

export type StatementKind = 'root' | 'rumor';
export type RumorTier = 'seedling' | 'sapling' | 'heartwood';
export const RUMOR_TIERS: RumorTier[] = ['seedling', 'sapling', 'heartwood'];
export const RUMOR_TIER_NAME: Record<RumorTier, string> = { seedling: 'Seedling', sapling: 'Sapling', heartwood: 'Heartwood' };
export const RUMOR_TIER_LINE: Record<RumorTier, string> = {
  seedling: 'One domain per round.',
  sapling: 'All domains, mixed.',
  heartwood: 'All domains, plus “Why?” on each myth.',
};

export interface Statement {
  /** Stable card id: "rumor:4B1.2:k1x9" (kind : subtopic : hash of the text). */
  id: string;
  kind: StatementKind;
  text: string;
  subtopicId: string;
  subtopicName: string;
  topicId: string;
  domainId: string;
  /** Rumors only: why it is a myth (the note's `why`). */
  why?: string;
}

/** Words in a line. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** The first sentence: up to a full stop followed by a new sentence (or the end). */
export function firstSentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  const m = /^(.+?[.!?])(?=\s+[A-Z"“(]|$)/.exec(t);
  return m ? m[1] : t;
}

/** Openers that lean on an earlier line, so the statement isn't standalone. */
const LEANS_ON = /^(It|Its|This|These|That|Those|They|Their|Such|And|But|Or|So|Because|Also|Here|Then)\b/;

/**
 * Back-references inside a line, found by the 40-statement content checks:
 * "also" ("…also works online"), a trailing "too" ("…are tested too."), an
 * outline code ("…are in 3B2.3"), an instruction whose object is "it"
 * ("Mitigate (reduce) it by…"), "this / these / those + noun" mid-line
 * ("…repeats this improvement loop"; "those who / whose / that" is fine),
 * "to that risk", "both" with no "and" ("When both are low"), "below" /
 * "above" pointing at the page, and a "them" with no plural noun before it ("Rely on legal counsel to
 * interpret them"). Any of these means the line needs the one before it.
 */
export function leansBack(text: string): boolean {
  if (/\balso\b/i.test(text)) return true;
  if (/\btoo[.,;]/i.test(text)) return true;
  if (/\b\d[AB]\d+(\.\d+)?\b/.test(text)) return true;
  if (/^\W*[A-Za-z]+(\s+\([^)]*\))?\s+it\b/.test(text)) return true;
  if (/\b(this|these|those)\b(?!\s+(who|whose|that|which)\b)/i.test(text)) return true;
  // "…traceable to that risk": a preposition + "that" + noun points back.
  if (/\b(to|of|for|in|on|at|with|from|by|against) that\s+(?!is|are|was|were|has|have|can|will|would|could|may|must|might)[a-z]+/i.test(text)) return true;
  // "When both are low": "both" without "X and Y" right after it names something earlier.
  if (/\bboth\b(?!(\s+[\w-]+){1,4}\s+and\b)/i.test(text)) return true;
  // "…the six types below)" / "…listed above.": a pointer to the page.
  if (/\b(below|above)\s*[).,;:]/i.test(text)) return true;
  const them = text.search(/\bthem\b/i);
  if (them >= 0) {
    const before = text.slice(0, them).split(/\s+/).map((w) => w.replace(/[^A-Za-z]/g, ''));
    if (!before.some((w) => w.length > 3 && /s$/i.test(w) && !/ss$/i.test(w))) return true;
  }
  return false;
}

/**
 * The build filter: a whole, standalone sentence of 8–30 words, with no
 * question, no "e.g." / "i.e." fragment and nothing that leans on an
 * earlier line.
 */
export function cleanStatement(text: string): boolean {
  const t = text.trim();
  const n = wordCount(t);
  if (n < MIN_WORDS || n > MAX_WORDS) return false;
  if (t.includes('?')) return false;
  if (!/^[A-Z]/.test(t)) return false;
  if (!/\.$/.test(t)) return false;
  if (/\b(e\.g|i\.e)\./i.test(t)) return false;
  if (LEANS_ON.test(t) || leansBack(t)) return false;
  // Unbalanced brackets or quotes mean a cut-off line.
  if ((t.match(/\(/g) ?? []).length !== (t.match(/\)/g) ?? []).length) return false;
  if ((t.match(/"/g) ?? []).length % 2 !== 0) return false;
  return true;
}

/** A short, stable hash (FNV-1a, base 36) so a card keeps its id across launches. */
export function textHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** Every playable statement from a notes pack (filtered), in note order. */
export function statementsFromNotes(pack: NotesPack | null | undefined): Statement[] {
  const out: Statement[] = [];
  const seen = new Set<string>();
  for (const d of pack?.domains ?? []) {
    for (const t of d.topics) {
      for (const s of t.subtopics) {
        const base = { subtopicId: s.id, subtopicName: s.name, topicId: t.id, domainId: d.id };
        const add = (kind: StatementKind, text: string, why?: string) => {
          const clean = text.trim().replace(/\s+/g, ' ');
          if (!cleanStatement(clean)) return;
          const id = `${kind}:${s.id}:${textHash(clean)}`;
          if (seen.has(id)) return;
          seen.add(id);
          out.push({ id, kind, text: clean, ...base, ...(why ? { why: why.trim() } : {}) });
        };
        add('root', firstSentence(s.isacaRule));
        for (const line of s.howItWorks) add('root', line);
        for (const trap of s.examTraps) add('rumor', trap.trap, trap.why);
      }
    }
  }
  return out;
}

/** Statements per notes pack, filtered once (the pack never changes while the app runs). */
const statementCache = new WeakMap<NotesPack, Statement[]>();
export function rumorStatements(pack: NotesPack | null | undefined): Statement[] {
  if (!pack) return [];
  let hit = statementCache.get(pack);
  if (!hit) {
    hit = statementsFromNotes(pack);
    statementCache.set(pack, hit);
  }
  return hit;
}

/**
 * Build a round of `size` statements.
 * 1. Missed cards that are due come first (they are the review).
 * 2. Then pairs: one Rumor and one Root from the same subtopic, from as many
 *    different subtopics as the round needs (Seedling: all in one domain,
 *    the domain of a due card if there is one).
 * 3. Any gap is filled with single statements, keeping about half of each.
 * The order is shuffled, so a pair is never side by side on purpose.
 */
export function buildRumorRound(
  all: Statement[],
  cards: Record<string, ReviewEntry> | undefined,
  tier: RumorTier,
  rng: Rng,
  now: number,
  size = RUMOR_SIZE,
): Statement[] {
  const due = shuffled(all.filter((s) => cards?.[s.id] && cards[s.id].dueAt <= now), rng);
  let pool = all;
  if (tier === 'seedling') {
    // One domain: a due card's, else a random domain with enough pairs.
    const domains = [...new Set(all.map((s) => s.domainId))];
    const pairable = (d: string) => new Set(all.filter((s) => s.domainId === d && s.kind === 'rumor').map((s) => s.subtopicId)).size;
    const dueDomain = due[0]?.domainId;
    const choices = shuffled(domains, rng).filter((d) => pairable(d) >= size / 2);
    const domain = dueDomain ?? choices[0] ?? domains[0];
    pool = all.filter((s) => s.domainId === domain);
  }
  const picked: Statement[] = [];
  const has = (s: Statement) => picked.some((p) => p.id === s.id);
  const half = Math.floor(size / 2);
  const count = (k: StatementKind) => picked.filter((p) => p.kind === k).length;
  // 1. Due cards (from the round's pool), at most half the round.
  for (const s of due) {
    if (picked.length >= half) break;
    if (pool.includes(s)) picked.push(s);
  }
  // 2. Pairs from the same subtopic: a due card's partner first.
  const bySub = new Map<string, Statement[]>();
  for (const s of shuffled(pool, rng)) {
    const l = bySub.get(s.subtopicId);
    if (l) l.push(s);
    else bySub.set(s.subtopicId, [s]);
  }
  const subOrder = [
    ...new Set([...picked.map((p) => p.subtopicId), ...shuffled([...bySub.keys()], rng)]),
  ];
  for (const sub of subOrder) {
    if (picked.length >= size) break;
    const list = bySub.get(sub) ?? [];
    for (const kind of ['rumor', 'root'] as StatementKind[]) {
      if (picked.length >= size) break;
      if (picked.some((p) => p.subtopicId === sub && p.kind === kind)) continue;
      if (count(kind) >= half + (size % 2)) continue;
      const s = list.find((x) => x.kind === kind && !has(x));
      if (s) picked.push(s);
    }
  }
  // 3. Top up from anything left in the pool.
  for (const s of shuffled(pool, rng)) {
    if (picked.length >= size) break;
    if (!has(s)) picked.push(s);
  }
  return shuffled(picked, rng);
}

/** True when the tap was right. */
export function isRightTap(s: Statement, tap: StatementKind): boolean {
  return s.kind === tap;
}

/** Score: one point per right tap. */
export function rumorScore(taps: readonly boolean[]): number {
  return taps.filter(Boolean).length;
}

/** The longest run of right taps (the quiet "streak line"). */
export function longestRun(taps: readonly boolean[]): number {
  let best = 0;
  let run = 0;
  for (const t of taps) {
    run = t ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * Heartwood "Why?": the Rumor's real reason plus 2 reasons from sibling
 * traps (same subtopic, then same topic, then same domain, then anywhere),
 * shuffled. Returns the choices and which one is right.
 */
export function whyChoices(rumor: Statement, all: Statement[], rng: Rng): { choices: string[]; correct: number } {
  const real = rumor.why ?? '';
  const others = all.filter((s) => s.kind === 'rumor' && s.id !== rumor.id && s.why && s.why !== real);
  const tiers = [
    others.filter((s) => s.subtopicId === rumor.subtopicId),
    others.filter((s) => s.subtopicId !== rumor.subtopicId && s.topicId === rumor.topicId),
    others.filter((s) => s.topicId !== rumor.topicId && s.domainId === rumor.domainId),
    others.filter((s) => s.domainId !== rumor.domainId),
  ];
  const decoys: string[] = [];
  for (const t of tiers) {
    for (const s of shuffled(t, rng)) {
      if (decoys.length >= 2) break;
      if (!decoys.includes(s.why!)) decoys.push(s.why!);
    }
  }
  const choices = shuffled([real, ...decoys], rng);
  return { choices, correct: choices.indexOf(real) };
}

/** The feedback title after a tap (games review §3.1 copy). */
export function tapTitle(s: Statement, right: boolean): string {
  if (s.kind === 'rumor') return right ? 'Rumor: myth spotted' : 'That is the myth the exam counts on.';
  return right ? 'Root: a sound principle' : 'This one is a Root: a sound principle';
}

/** The number of missed cards that triggers "Read again" for a subtopic. */
export const READ_AGAIN_AT = 2;

/**
 * Subtopics to read again: those with 2 or more cards whose last answer was
 * wrong (box 1). Card ids carry their subtopic ("rumor:4B1.2:…").
 */
export function readAgain(cards: Record<string, ReviewEntry> | undefined, at = READ_AGAIN_AT): string[] {
  const missed = new Map<string, number>();
  for (const [id, e] of Object.entries(cards ?? {})) {
    if (e.box !== 1) continue;
    const sub = id.split(':')[1];
    if (sub) missed.set(sub, (missed.get(sub) ?? 0) + 1);
  }
  return [...missed].filter(([, n]) => n >= at).map(([sub]) => sub);
}
