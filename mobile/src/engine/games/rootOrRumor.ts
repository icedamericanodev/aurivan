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
 *   no "e.g." / "i.e." fragments, no line that leans on the one before
 *   ("It…", "These…"), and no line that needs its heading (a colon label
 *   like "Criteria: …", or a subject it never names like "the work" or
 *   "Reviewers"), because a statement must stand alone. Rumors written as
 *   instructions ("Run the PIA after go-live.") are left out: a myth should
 *   read as a belief. A short denylist (DENY_CARDS) drops the last few
 *   known-vague lines.
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
 * Verbs that open an instruction ("Collect inputs: …", "Run a separate
 * compliance audit for each regulation."). Used for colon labels and for
 * Rumors written as instructions (content review of Root or Rumor).
 */
export const IMPERATIVE_VERBS: ReadonlySet<string> = new Set(
  (
    'Absorb Accept Add Address Agree Apply Approve Ask Assess Avoid Base Begin Build Buy Capture Check Choose Classify Collect Combine ' +
    'Compare Confirm Consider Copy Count Decide Define Delay Delete Deploy Design Do Document Drop Encrypt Ensure Erase Escalate Evaluate ' +
    'Expand Factory-reset File Find Finish Fix Focus Follow Get Give Hand Harden Have Hire Hold Identify Increase Inspect Install Interview ' +
    'Keep Learn Leave Let Link Log Look Map Match Measure Monitor Name Obtain Observe Perform Pick Plan Prefer Proceed Pull Rank Read ' +
    'Re-image Recalculate Reconcile Record Recover Reissue Reject Release Rely Reperform Report Request Require Restore Retain Retrain Review Roll ' +
    'Rotate Run Sample Score Seek Send Set Shut Size Start State Store Switch Tell Test Tie Trace Track Train Treat Turn Use Validate ' +
    'Verify Wait Write'
  ).split(' '),
);

const firstWord = (text: string) => text.trim().split(/\s+/)[0].replace(/[^A-Za-z-]/g, '');

/** A second word that shows the first is a noun subject ("Design can start…"). */
const SUBJECT_NEXT = /^(can|cannot|is|are|was|were|will|must|should|may|might|could|would|has|does)$/;

/** "re-image" → "Re-image": the verb list is capitalised. */
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/**
 * The line is an instruction: it opens with an instruction verb ("Run the
 * PIA after go-live…"), not a noun ("Design can start…"), or a lead clause
 * is followed by one ("When a lawsuit looms, keep all company email…").
 */
export function startsImperative(text: string): boolean {
  const t = text.trim();
  const [, second = ''] = t.split(/\s+/);
  if (IMPERATIVE_VERBS.has(firstWord(t)) && !SUBJECT_NEXT.test(second)) return true;
  const lead = /^(When|If|Once|After|Before|During|Until|While)\b[^,;]*, ([a-z-]+) /.exec(t);
  return Boolean(lead && IMPERATIVE_VERBS.has(cap(lead[2])));
}

/**
 * A list item that needs its heading: the text before the first colon is 3
 * words or fewer AND is a single word ("Criteria: …", "Detection: …") or
 * starts with a verb ("Collect inputs: …", "Identify the gap: …").
 * Kept: "Erasure has limits: …", "Classification comes first: …".
 */
export function colonLabel(text: string): boolean {
  const i = text.indexOf(':');
  if (i < 0) return false;
  const words = text.slice(0, i).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return false;
  return words.length === 1 || IMPERATIVE_VERBS.has(words[0]);
}

/**
 * A subject the line never names, so it only makes sense under its note
 * heading: "If the work is inadequate…", "…evaluate the work…" (not "the
 * work of…"), "Give each life-cycle stage…" (not "each stage of…"),
 * "The facilitator asks…", "Reviewers sample…".
 */
export function unnamedSubject(text: string): boolean {
  const t = text.trim();
  if (/^(If|When|Once|After|Before) the \w+ (is|are|arrives?)\b/.test(t)) return true;
  if (/\bthe work\b(?! of)/i.test(t)) return true;
  if (/\beach (technique|stage|life-cycle stage|step|type|method)\b(?! of)/i.test(t)) return true;
  if (/^(The facilitator|Reviewers)\b/.test(t)) return true;
  return false;
}

/**
 * Known-vague lines the rules above don't catch, by card id (content review,
 * root_sample4): "Management sets targets…" (which targets?), "One
 * authoritative… source holds the current documents" (which documents?),
 * "Reviewers sample completed engagements…" (which reviewers?).
 */
export const DENY_CARDS: ReadonlySet<string> = new Set([
  'root:4B1.2:2kku2i', // "Management sets targets where combined outage and recovery costs are lowest…"
  'root:2A3.3:kz7n4r', // "One authoritative, version-controlled source holds the current documents…"
  'root:1B6.2:zp9vq9', // "Reviewers sample completed engagements…" (also caught by unnamedSubject)
]);

/**
 * The build filter: a whole, standalone sentence of 8–30 words, with no
 * question, no "e.g." / "i.e." fragment, nothing that leans on an earlier
 * line, and no heading it needs (a colon label or an unnamed subject).
 * A Rumor (`kind`) is also never an instruction: a myth reads as a belief.
 */
export function cleanStatement(text: string, kind?: StatementKind): boolean {
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
  // Lines that only make sense under their heading (content review).
  if (colonLabel(t) || unnamedSubject(t)) return false;
  if (kind === 'rumor' && startsImperative(t)) return false;
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
          if (!cleanStatement(clean, kind)) return;
          const id = `${kind}:${s.id}:${textHash(clean)}`;
          if (seen.has(id) || DENY_CARDS.has(id)) return;
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
