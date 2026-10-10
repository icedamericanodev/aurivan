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
import type { PackQuestion } from '../../content/types';
import { shuffled, type Rng } from '../random';

// LEAST and MAIN were dropped: they never occur in the bank, so as decoys they taught learners to ignore them.
export const PRIORITY_WORDS = ['FIRST', 'BEST', 'MOST', 'PRIMARY', 'GREATEST'] as const;
export type PriorityWord = (typeof PRIORITY_WORDS)[number];

/** The decisive priority word, written in capitals in the stem. */
export function priorityWord(stem: string): PriorityWord | null {
  // Capitalised on purpose by item writers; "most" in normal prose is ignored.
  // Prefer the word nearest the end: the question sentence comes last.
  let found: PriorityWord | null = null;
  for (const m of stem.matchAll(/\b(FIRST|BEST|MOST|PRIMARY|GREATEST)\b/g)) {
    found = m[1] as PriorityWord;
  }
  return found;
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

export function priorityPool(pool: PackQuestion[]): PackQuestion[] {
  return pool.filter((q) => priorityWord(q.stem) !== null);
}

export function buildPriorityRound(pool: PackQuestion[], rng: Rng, size = 5): string[] {
  return shuffled(priorityPool(pool), rng)
    .slice(0, size)
    .map((q) => q.id);
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
export function acceptedAsks(stem: string): Ask[] {
  const word = priorityWord(stem);
  if (!word) return [];
  return fitWord(stem) ? ['best-fit', 'degree'] : [ASK_FOR[word]];
}

/** "appropriate" in "…is MOST appropriate?" (also appropriately / suitable), else null. */
export function fitWord(stem: string): string | null {
  if (priorityWord(stem) !== 'MOST') return null;
  const m = /^\s+(appropriate|appropriately|suitable)\b/i.exec(stem.slice(lastWholeWordIndex(stem, 'MOST') + 4));
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
export function meaningFor(stem: string): string {
  const word = priorityWord(stem);
  if (!word) return '';
  const fit = fitWord(stem);
  return fit ? `MOST ${fit} works like BEST. ${ASK_MEANING['best-fit']}` : PRIORITY_MEANING[word];
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
