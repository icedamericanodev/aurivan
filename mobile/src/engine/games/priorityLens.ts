/**
 * Signpost (game id `priority`) — "Every option is true. Which one answers FIRST?"
 *
 * Many exam questions turn on a single priority word. The game first asks
 * what the question ASKS FOR (the step that comes first, the best fit, the
 * strongest effect, the main purpose), then the answer. Naming what the
 * word demands before answering builds the habit of reading the stem like
 * an examiner.
 *
 * Why step 1 asks for a meaning, not the word: the word is always printed
 * in CAPITALS, so "which word decides this?" was solved by spotting the
 * capitals. Choosing what the word asks for needs the learner to know it.
 */
import type { PackQuestion, QualifierCase } from '../../content/types';
import { shuffled, type Rng } from '../random';
import { takeApart, type GroupOf } from '../siblings';

// LEAST and MAIN were dropped: they never occur in the bank, so as decoys they taught learners to ignore them.
export const PRIORITY_WORDS = ['FIRST', 'BEST', 'MOST', 'PRIMARY', 'GREATEST'] as const;
export type PriorityWord = (typeof PRIORITY_WORDS)[number];

/** The decisive priority word, as a key (always capitals), or null. */
export function priorityWord(stem: string, qc?: QualifierCase): PriorityWord | null {
  return findPriority(stem, qc)?.word ?? null;
}

/** The decisive word as the stem WRITES it ("FIRST" in CISA, "first" in a lowercase course), for showing back. */
export function priorityWritten(stem: string, qc?: QualifierCase): string | null {
  return findPriority(stem, qc)?.written ?? null;
}

/** The found qualifier: its key, its text as written, and where it starts in the stem. */
export interface PriorityHit {
  word: PriorityWord;
  written: string;
  index: number;
  /**
   * Lowercase courses only: a qualifier passed over by a final "first"
   * ("Which approach would most likely be used first?" keeps "most" here).
   * acceptedAsks accepts its meaning as well as FIRST's. Never set in capitals.
   */
  earlier?: { word: PriorityWord; written: string; index: number };
}

/**
 * Finds the qualifier. Plain English:
 * - Capitals (CISA and every course today): the last FIRST/BEST/MOST/PRIMARY/
 *   GREATEST written in capitals, anywhere. Capitalised on purpose by item
 *   writers; "most" in normal prose is ignored. Exactly the rule from before.
 * - Lowercase (The IIA's style, `qualifierCase: 'lowercase'`): a capitalised
 *   word still wins (a bank mid-restyle keeps working), but only inside the
 *   question sentence, so "The BEST Corp board asked." before it never counts.
 *   Otherwise the EARLIEST word that is used as the ask (isAsk below), and
 *   only inside the question sentence (askSpan), so "most staff work
 *   remotely." before the question, "the first year" and "first-line" are
 *   never picked, and "best describes the first step" finds "best". When the
 *   ask has none, its lead-in is searched too ("To best protect the data,
 *   which control…" finds "best").
 *   A lowercase course also writes "main" and "least" (The IIA's "the main
 *   weakness", "recorded least soundly"): "main" reads as PRIMARY (the main
 *   purpose or reason) and "least" as MOST's far end (a degree word; see
 *   meaningFor and priorityPool).
 */
export function findPriority(stem: string, qc: QualifierCase = 'capitals'): PriorityHit | null {
  // Capitals: the whole stem, exactly as before.
  if (qc !== 'lowercase') return lastCapital(stem, 0, stem.length);
  const question = questionSpan(stem);
  const caps = lastCapital(stem, question.start, question.end);
  if (caps) return caps;
  const { start, end } = askSpan(stem);
  // The ask first; the lead-in cut off by askSpan only when the ask itself has no qualifier.
  return lowerIn(stem, start, end) ?? (start > question.start ? lowerIn(stem, question.start, start) : null);
}

/** The last capitalised qualifier between `start` and `end`; the word nearest the end, as the question comes last. */
function lastCapital(stem: string, start: number, end: number): PriorityHit | null {
  let found: PriorityHit | null = null;
  for (const m of stem.slice(start, end).matchAll(/\b(FIRST|BEST|MOST|PRIMARY|GREATEST)\b/g)) {
    found = { word: m[1] as PriorityWord, written: m[1], index: start + m.index };
  }
  return found;
}

/** The lowercase qualifier between `start` and `end` (see findPriority), or null. */
function lowerIn(stem: string, start: number, end: number): PriorityHit | null {
  const ask = stem.slice(start, end);
  let earliest: PriorityHit | null = null;
  for (const m of ask.matchAll(/\b(first|best|most|least|main|primary|greatest)\b/gi)) {
    const at = m.index;
    const after = ask.slice(at + m[1].length);
    if (!isAsk(m[1].toLowerCase(), ask.slice(0, at), after)) continue;
    const hit: PriorityHit = { word: LOWER_KEY[m[1].toLowerCase()], written: m[1], index: start + at };
    // "…most appropriate for management to take first?": a "first" that ends the question is the
    // action's order, the word it turns on (CISA's capitals pick the same FIRST, the last one).
    // An earlier qualifier is kept beside it, so its reading is accepted too ("most likely … first?").
    if (hit.word === 'FIRST' && /^\s*\?/.test(after)) {
      return earliest && !isLeast(earliest) ? { ...hit, earlier: { word: earliest.word, written: earliest.written, index: earliest.index } } : hit;
    }
    // Otherwise the earliest true qualifier wins: "best describes the first step" turns on "best".
    earliest ??= hit;
  }
  return earliest;
}

/** A lowercase word's key: the five keys as they are, "main" as PRIMARY, "least" as MOST (both degree words). */
const LOWER_KEY: Record<string, PriorityWord> = {
  first: 'FIRST',
  best: 'BEST',
  most: 'MOST',
  primary: 'PRIMARY',
  greatest: 'GREATEST',
  main: 'PRIMARY',
  least: 'MOST',
};

/** Words that make the next word part of a noun phrase: "the first year", "its main office". */
const DETERMINERS = new Set(['the', 'a', 'an', 'its', 'their', 'his', 'her', 'our', 'your', 'this', 'that', 'these', 'those', 'each', 'every', 'any', 'whose']);
/** Prepositions: "in first place", "for most staff" are ordinary prose, not the ask. */
const PREPOSITIONS = new Set(['in', 'during', 'of', 'for', 'on', 'at', 'by', 'from', 'since', 'until', 'over', 'after', 'before', 'within', 'throughout', 'into', 'across', 'per', 'with', 'without', 'among']);
/** Nouns after "first" that name a time or a thing, never the ask: "first year", "first quarter". */
const FIRST_THINGS = new Set(['year', 'years', 'quarter', 'quarters', 'month', 'months', 'week', 'weeks', 'day', 'days', 'time', 'times', 'half', 'line', 'round', 'phase', 'draft', 'place', 'stage', 'cycle', 'period', 'term', 'version', 'engagement', 'chief', 'person', 'one']);
/** "the first step" is the ask only with an ask noun: what is done first. */
const FIRST_ASKS = new Set(['step', 'steps', 'action', 'actions', 'priority', 'move', 'task', 'thing', 'concern', 'response']);
/** "main" and "primary" are ordinary adjectives ("the main office"); they ask only before one of these. */
const MAIN_ASKS = new Set([
  'purpose', 'reason', 'objective', 'aim', 'goal', 'intent', 'responsibility', 'duty', 'role', 'function', 'concern', 'risk',
  'weakness', 'gap', 'cause', 'driver', 'factor', 'consideration', 'benefit', 'advantage', 'focus', 'thing', 'issue', 'problem',
  'threat', 'limitation', 'task', 'priority', 'basis', 'deficiency', 'value', 'contribution', 'criterion', 'test',
  'obligation', 'indicator', 'recommendation', 'authority', 'safeguard', 'means', 'need', 'output', 'finding', 'follow',
]);
/** Ordinary compounds: "the main office", "a primary key". After a determiner, any other noun is the ask. */
const MAIN_THINGS = new Set(['office', 'offices', 'market', 'markets', 'street', 'road', 'building', 'site', 'entrance', 'account', 'accounts', 'school', 'care', 'key', 'keys', 'menu', 'contact', 'residence', 'language', 'election', 'line', 'lines']);
/** Words that cannot follow "most" as a determiner ("most staff"), so "rely on most to…" is the ask. */
const NOT_NOUNS = new Set(['to', 'in', 'for', 'when', 'if', 'because', 'during', 'after', 'before', 'while', 'and', 'or', 'than', 'within', 'under', 'at', 'on', 'by', 'about']);
/** Adjectives and adverbs after "most" that no ending rule below catches: "most likely", "most complete". */
const MOST_ADJ = new Set([
  'likely', 'complete', 'prompt', 'clear', 'strong', 'severe', 'secure', 'robust', 'sound', 'true', 'wise', 'apt', 'fair',
  'common', 'valid', 'weak', 'direct', 'exact', 'precise', 'concise', 'current', 'recent', 'complex', 'mature', 'safe',
  'strict', 'often', 'concerning', 'pressing', 'compelling', 'damaging', 'misleading', 'convincing', 'telling',
  'revealing', 'worrying', 'troubling', 'alarming', 'striking', 'limiting', 'demanding', 'challenging', 'promising', 'lacking',
]);
/** Verbs "most" asks about: "Which gap most needs action?", "What does it most lack?", "should most rely on". */
const MOST_VERBS = new Set([
  'need', 'needs', 'lack', 'lacks', 'determine', 'determines', 'undermine', 'undermines', 'warrant', 'warrants', 'stress',
  'raise', 'raises', 'prompt', 'prompts', 'rely', 'relies', 'require', 'requires', 'threaten', 'threatens', 'weaken',
  'weakens', 'strengthen', 'strengthens', 'improve', 'improves', 'reduce', 'reduces', 'increase', 'increases', 'affect',
  'affects', 'depend', 'depends', 'contribute', 'contributes', 'influence', 'influences', 'deserve', 'deserves', 'justify',
  'justifies', 'reflect', 'reflects', 'suggest', 'suggests', 'indicate', 'indicates', 'enhance', 'enhances', 'expose', 'exposes',
]);
/** An adjective's or adverb's ending: "effective", "important", "reliable", "clearly", "qualified"… */
const ADJ_ENDING = /(?:ly|ive|ent|ant|able|ible|ful|ous|ic|al|ary|ate|ile|less|ed)$/;
/** Nouns with one of those endings that can still follow a counting "most": "most capital", "most content". */
const MOST_NOUNS = new Set([
  'capital', 'material', 'materials', 'potential', 'collateral', 'approval', 'rental', 'proposal', 'removal', 'renewal', 'disposal',
  'content', 'talent', 'rent', 'client', 'agent', 'event', 'parent', 'student', 'patent', 'percent', 'plant', 'salary', 'summary',
  'executive', 'initiative', 'incentive', 'alternative', 'archive', 'directive', 'representative', 'narrative', 'estate',
  'state', 'date', 'rate', 'climate', 'update', 'file', 'profile', 'traffic', 'logic', 'supply', 'family', 'assembly', 'speed', 'feed',
]);

/**
 * True when the word after "most" makes "most" the ask: an adjective or adverb
 * ("most likely", "most effective", "most clearly", "most cost-effective") or
 * a verb ("most needs"). A noun after it ("most transactions", "most staff")
 * makes "most" a count, never the ask; an unknown word counts as a noun.
 */
function mostModifies(after: string): boolean {
  const compound = /^\s+([\p{L}]+(?:-[\p{L}]+)*)/u.exec(after)?.[1]?.toLowerCase() ?? '';
  // "cost-effective" reads by its last part ("effective"), "high-risk" by "risk" (a noun).
  const word = compound.split('-').pop() ?? '';
  if (MOST_ADJ.has(word) || MOST_VERBS.has(word)) return true;
  if (MOST_NOUNS.has(word) || /ment$/.test(word)) return false;
  return word.length >= 4 && ADJ_ENDING.test(word);
}

/**
 * True when a lowercase word sits where a qualifier does ("best describes",
 * "is best?", "most likely", "the main purpose", "do first?"), false for the
 * same word in ordinary prose ("the first year", "most staff", "at least").
 * `before` and `after` are the question text on either side of it.
 */
function isAsk(word: string, before: string, after: string): boolean {
  // Part of a hyphenated word: "first-line", "best-fitting", "most-used".
  if (/-$/.test(before) || /^-/.test(after)) return false;
  // The word before it, past a comma or a closing bracket: "approved by Tiago, best state?" has "Tiago"
  // before "best"; "the chief audit executive (CAE) most clearly do?" has "CAE" before "most".
  const prevRaw = /([\p{L}'’]+)\)?[,;:]?\s*$/u.exec(before)?.[1] ?? '';
  const prev = prevRaw.toLowerCase();
  const next = /^\s+([\p{L}]+)/u.exec(after)?.[1]?.toLowerCase() ?? '';
  // Nothing (or only a mark) follows: "take first?", "Which is best?", "greatest,".
  const atEnd = /^\s*(?:[?.!,;:)]|$)/.test(after);
  // A question never opens on its qualifier: "Most auditors…" is ordinary prose.
  if (!prev) return false;
  // Fixed phrases: "at first", "at best", "at most", "at least", "most of", "first of all", "best practice".
  if (prev === 'at') return false;
  if (next === 'of' && (word === 'most' || word === 'first')) return false;
  if (word === 'best' && /^practices?$/.test(next)) return false;
  const determined = DETERMINERS.has(prev) || /['’]s?$/.test(prevRaw);
  switch (word) {
    case 'first':
      if (atEnd) return true;
      if (PREPOSITIONS.has(prev) || FIRST_THINGS.has(next)) return false;
      // "the first step" asks; "the first chief audit executive" does not. Without a determiner it is
      // the action's order: "should first review", "would first arise", "do first with".
      return determined ? FIRST_ASKS.has(next) : true;
    case 'main':
    case 'primary':
      // "the primary reason", "Elif's primary responsibility", "What primary weakness…"; never "the main office".
      if (atEnd || MAIN_ASKS.has(next)) return true;
      return (determined || prev === 'as' || WH_WORDS.has(prev)) && !!next && !MAIN_THINGS.has(next);
    case 'most':
      // At the end of the ask, or before a word that is no noun ("matters most?", "rely on most to…"): the ask.
      if (atEnd || NOT_NOUNS.has(next)) return true;
      // "for most staff", "do most auditors": "most" counts people or things there.
      if (PREPOSITIONS.has(prev) || prev === 'do' || prev === 'did') return false;
      // "the most assurance": after "the" it is a superlative, the ask, even before a noun (a count never takes "the").
      if (prev === 'the') return true;
      // Otherwise only before an adjective, an adverb or a verb; never before a noun ("covers most transactions").
      return mostModifies(after);
    default:
      // best, least, greatest: "best describes", "is best", "recorded least soundly", "the greatest risk".
      return true;
  }
}

/**
 * Where the question itself sits in a stem: the clause that ends with the last
 * "?", or, with no "?", the last sentence. It starts after the sentence before
 * it, the same cut as the CIA linter's ask_of (data/cia/tools/style_cia.py): a
 * ".", "!" or "?", a space, then a capital letter. A dot after an abbreviation
 * ("e.g. ", "i.e. ", "U.S. ", "Mr. ") never ends a sentence.
 */
export function questionSpan(stem: string): { start: number; end: number } {
  const q = stem.lastIndexOf('?');
  const end = q >= 0 ? q + 1 : stem.trimEnd().length;
  const head = stem.slice(0, end).trimEnd();
  // Leave out the question's own closing mark, then find the last sentence break before it.
  const body = /[.?!]$/.test(head) ? head.slice(0, -1) : head;
  let start = 0;
  for (const m of body.matchAll(/[.?!]["”’)]*\s+(?=["“‘(]?\p{Lu})/gu)) {
    // The word the mark ends: "U.S." or "e.g." (dotted letters) or a short title is not a sentence end.
    const word = /\S+$/.exec(body.slice(0, m.index + 1))?.[0] ?? '';
    if (m[0][0] === '.' && (/^(?:\p{L}\.)+$/u.test(word) || ABBREVIATIONS.has(word.slice(0, -1).toLowerCase()))) continue;
    start = m.index + m[0].length;
  }
  return { start, end };
}

/** Short words written with a dot that never end a sentence. */
const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'no', 'vs', 'etc', 'inc', 'ltd', 'co', 'corp', 'jr', 'sr', 'approx', 'dept', 'fig']);

/**
 * The part of the question sentence a lowercase qualifier is looked for in.
 * Usually the whole question sentence (questionSpan). When the sentence opens
 * with a lead-in before its "which" or "what" ("During the first year of the
 * program, which control…"), the lead-in is left out: it sets the scene, it
 * is not the ask (findPriority still searches it when the ask has no qualifier).
 */
function askSpan(stem: string): { start: number; end: number } {
  const span = questionSpan(stem);
  const text = stem.slice(span.start, span.end);
  if (WH.test(text)) return span;
  const lead = /,\s+(?=(?:which|what|how|who|whom|whose|where|when|why)\b)/i.exec(text);
  return lead ? { start: span.start + lead.index + lead[0].length, end: span.end } : span;
}

/** The question words, for "What primary weakness…" and the lead-in cut (askSpan). */
const WH_WORDS = new Set(['which', 'what', 'how', 'who', 'whom', 'whose', 'where', 'when', 'why']);

/** A question that opens on its question word: "Which…", "What should…", "How is…". */
const WH = /^\s*["“(]?(?:which|what|how|who|whom|whose|where|when|why)\b/i;

/**
 * The found word for a line of copy. In capitals it stands out on its own, as
 * always ("FIRST: you read it right"); a lowercase word gets curly quotes so
 * it still reads as the word in question ("“first”: you read it right").
 */
export function shownWord(written: string): string {
  return written === written.toUpperCase() ? written : `“${written}”`;
}

/**
 * Fixed copy that names the qualifiers ("Look for FIRST, BEST or MOST"), in the
 * course's style: unchanged for capitals (CISA, byte for byte), the words in
 * lowercase for a lowercase course ("Look for first, best or most").
 */
export function qualifierCopy(text: string, qc?: QualifierCase, quote = false): string {
  if (qc !== 'lowercase') return text;
  // `quote`: "“first” questions", where a bare "first questions" would read as "the questions that come first".
  return text.replace(/\b(FIRST|BEST|MOST|PRIMARY|GREATEST|LEAST|MAIN)\b/g, (w) => (quote ? `“${w.toLowerCase()}”` : w.toLowerCase()));
}

/**
 * Where `word` last appears in `text` as a whole word, or -1.
 * "MOST" must not match inside "ALMOST" or "MOSTLY", so we check that the
 * characters on either side are not letters or digits (a word boundary).
 */
export function lastWholeWordIndex(text: string, word: string): number {
  if (!word) return -1;
  const isWordChar = (ch: string | undefined) => ch !== undefined && /[A-Za-z0-9_]/.test(ch);
  let at = text.lastIndexOf(word);
  while (at >= 0) {
    if (!isWordChar(text[at - 1]) && !isWordChar(text[at + word.length])) return at;
    at = at === 0 ? -1 : text.lastIndexOf(word, at - 1);
  }
  return -1;
}

/** `qc` (optional): the course's QualifierCase; left out = capitals, exactly as before. */
export function priorityPool(pool: PackQuestion[], qc?: QualifierCase): PackQuestion[] {
  // A "least" stem (lowercase courses only) is left out of Signpost: step 1's degree card says
  // "the strongest effect", the opposite of what "least" asks. The hint and the coach still find it.
  return pool.filter((q) => {
    const hit = findPriority(q.stem, qc);
    return hit !== null && !isLeast(hit);
  });
}

/** True for a lowercase course's "least" (keyed MOST, as a degree word, but asking for the weakest). */
const isLeast = (hit: PriorityHit) => hit.written.toLowerCase() === 'least';

/** The coaching line for "least": MOST's degree line, turned round. */
export const LEAST_MEANING = 'Compare degree: pick the option with the weakest effect on what is asked.';

/** `groupOf` (optional): keep sibling groups apart (engine/siblings.ts); left out = exactly as before. */
export function buildPriorityRound(pool: PackQuestion[], rng: Rng, size = 5, groupOf?: GroupOf, qc?: QualifierCase): string[] {
  return takeApart(shuffled(priorityPool(pool, qc), rng).map((q) => q.id), size, groupOf);
}

/** What a priority word asks the learner to find. */
export type Ask = 'sequence' | 'best-fit' | 'degree' | 'purpose';

/** Each word asks for exactly one thing (MOST and GREATEST both ask for degree). */
export const ASK_FOR: Record<PriorityWord, Ask> = {
  FIRST: 'sequence',
  BEST: 'best-fit',
  MOST: 'degree',
  GREATEST: 'degree',
  PRIMARY: 'purpose',
};

/** The step-1 choices, in plain words (never the priority word itself). */
export const ASK_LABEL: Record<Ask, string> = {
  sequence: 'The step that must come before the others',
  'best-fit': 'The option that fully handles it, at the right level',
  degree: 'The strongest effect or the largest impact',
  purpose: 'The main purpose or the main reason',
};

export const ASKS: Ask[] = ['sequence', 'best-fit', 'degree', 'purpose'];

/**
 * The meanings accepted as right for this stem, best first.
 * Usually one: the word's own (FIRST → sequence). But "MOST appropriate",
 * "MOST appropriately" and "MOST suitable" (common in the bank) ask for
 * the best FIT, like BEST, not the strongest effect. For those, best-fit
 * comes first and degree is accepted too, since the word is still MOST.
 */
export function acceptedAsks(stem: string, qc?: QualifierCase): Ask[] {
  const hit = findPriority(stem, qc);
  if (!hit) return [];
  const own: Ask[] = fitAt(stem, hit) ? ['best-fit', 'degree'] : [ASK_FOR[hit.word]];
  // Lowercase only: "Which approach would most likely be used first?" accepts the order AND the
  // earlier word's own meaning (best fit for "most appropriate", else its word's), since both are asked.
  if (!hit.earlier) return own;
  const also: Ask = fitAt(stem, hit.earlier) ? 'best-fit' : ASK_FOR[hit.earlier.word];
  return own.includes(also) ? own : [...own, also];
}

/** "appropriate" in "…is MOST appropriate?" (also appropriately / suitable; "most appropriate" in a lowercase course), else null. */
export function fitWord(stem: string, qc?: QualifierCase): string | null {
  const hit = findPriority(stem, qc);
  return hit ? fitAt(stem, hit) : null;
}

/** The fit word right after a found MOST ("appropriate", "appropriately", "suitable"), else null. */
function fitAt(stem: string, hit: { word: PriorityWord; written: string; index: number }): string | null {
  // "least appropriate" is not a best-fit ask: only MOST (or "most") is.
  if (hit.word !== 'MOST' || hit.written.toLowerCase() === 'least') return null;
  // The words right after the found MOST (for capitals, the same place lastWholeWordIndex found before).
  const m = /^\s+(appropriate|appropriately|suitable)\b/i.exec(stem.slice(hit.index + hit.written.length));
  return m ? m[1].toLowerCase() : null;
}

/** What each meaning wants from the learner (coaching copy for the reveal and the recap). */
export const ASK_MEANING: Record<Ask, string> = {
  sequence: 'Sequence matters: pick the step that must happen before all the others.',
  'best-fit': 'Several options work: pick the one that fully addresses the risk at the right level.',
  degree: 'Compare degree: pick the option with the strongest effect on what is asked.',
  purpose: 'Pick the main purpose or main reason, not a side benefit.',
};

/** The coaching line for this stem: the word's own line, or "MOST appropriate works like BEST…". */
export function meaningFor(stem: string, qc?: QualifierCase): string {
  const hit = findPriority(stem, qc);
  if (!hit) return '';
  if (isLeast(hit)) return LEAST_MEANING;
  const fit = fitWord(stem, qc);
  if (!fit) return PRIORITY_MEANING[hit.word];
  // Written in capitals (CISA, always): word for word as before. Lowercase: quoted, so the words read as words.
  return hit.written !== hit.word
    ? `“${hit.written} ${fit}” works like “best”. ${ASK_MEANING['best-fit']}`
    : `MOST ${fit} works like BEST. ${ASK_MEANING['best-fit']}`;
}

/** Step 1's four choices, shuffled so the right one moves around. */
export function askChoices(rng: Rng): Ask[] {
  return shuffled(ASKS, rng);
}

/** One-line coaching for each word — what the examiner wants. */
export const PRIORITY_MEANING: Record<PriorityWord, string> = {
  FIRST: 'Sequence matters: pick the step that must happen before all the others.',
  BEST: 'Several options work: pick the one that fully addresses the risk at the right level.',
  MOST: 'Compare degree: pick the option with the strongest effect on what is asked.',
  PRIMARY: 'Pick the main purpose or main reason, not a side benefit.',
  GREATEST: 'Pick the option with the largest impact or exposure.',
};
