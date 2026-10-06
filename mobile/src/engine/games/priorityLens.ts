/**
 * Priority Lens — "Every option is true. Which one answers FIRST?"
 *
 * Many exam questions turn on a single priority word. The game first asks
 * the learner to name the word that decides the question, then to answer
 * it. Naming the word before answering builds the habit of reading the
 * stem like an examiner.
 */
import type { PackQuestion } from '../../content/types';
import { shuffled, type Rng } from '../random';

export const PRIORITY_WORDS = ['FIRST', 'BEST', 'MOST', 'PRIMARY', 'GREATEST', 'LEAST', 'MAIN'] as const;
export type PriorityWord = (typeof PRIORITY_WORDS)[number];

/** The decisive priority word, written in capitals in the stem. */
export function priorityWord(stem: string): PriorityWord | null {
  // Capitalised on purpose by item writers; "most" in normal prose is ignored.
  // Prefer the word nearest the end: the question sentence comes last.
  let found: PriorityWord | null = null;
  for (const m of stem.matchAll(/\b(FIRST|BEST|MOST|PRIMARY|GREATEST|LEAST|MAIN)\b/g)) {
    found = m[1] as PriorityWord;
  }
  return found;
}

export function priorityPool(pool: PackQuestion[]): PackQuestion[] {
  return pool.filter((q) => priorityWord(q.stem) !== null);
}

export function buildPriorityRound(pool: PackQuestion[], rng: Rng, size = 5): string[] {
  return shuffled(priorityPool(pool), rng)
    .slice(0, size)
    .map((q) => q.id);
}

/** Four word choices for step 1: the real word plus three decoys. */
export function wordChoices(word: PriorityWord, rng: Rng): PriorityWord[] {
  const decoys = shuffled(
    PRIORITY_WORDS.filter((w) => w !== word),
    rng,
  ).slice(0, 3);
  return shuffled([word, ...decoys], rng);
}

/** One-line coaching for each word — what the examiner wants. */
export const PRIORITY_MEANING: Record<PriorityWord, string> = {
  FIRST: 'Sequence matters: pick the step that must happen before all the others.',
  BEST: 'Several options work: pick the one that fully addresses the risk at the right level.',
  MOST: 'Compare degree: pick the option with the strongest effect on what is asked.',
  PRIMARY: 'Pick the main purpose or main reason, not a side benefit.',
  GREATEST: 'Pick the option with the largest impact or exposure.',
  LEAST: 'Reverse it: find the option that matters least or is weakest.',
  MAIN: 'Pick the central objective, not a supporting detail.',
};
