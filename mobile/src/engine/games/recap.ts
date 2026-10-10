/**
 * The end-of-round recap shared by every game, plus the small score history
 * behind the "last 5 rounds" trend.
 *
 * Plain English:
 * - Each miss in a round gets a TAG (the snare that caught you, or the
 *   priority word that decided the question) and ONE line on why.
 * - Wrong answers already go into spaced review (the progress store puts
 *   them in Box 1), so the recap says so: "Missed questions are in your review."
 * - We keep the last few round scores per game (capped, so the save stays
 *   small) and show the last 5 next to the best score.
 *
 * Pure TypeScript: no React, no storage. Option text and explanations are
 * passed in already rendered for the round's shuffle (engine/shuffle.ts).
 */
import type { Letter, PackQuestion } from '../../content/types';
import { meaningFor, priorityWord } from './priorityLens';
import { trapLetter } from './trapSpotter';

/** How many round scores we keep per game (the save stays tiny). */
export const HISTORY_CAP = 10;
/** How many of them the round-end screen shows. */
export const TREND_SHOWN = 5;

/** The history with this round's score added, oldest first, capped. Old saves pass undefined. */
export function pushScore(history: readonly number[] | undefined, score: number, cap = HISTORY_CAP): number[] {
  return [...(history ?? []), score].slice(-cap);
}

/** The most recent scores to show, oldest first. */
export function lastScores(history: readonly number[] | undefined, n = TREND_SHOWN): number[] {
  return (history ?? []).slice(-n);
}

/**
 * A score as shown: a REAL minus sign for a negative score ("−5", the same
 * sign signed() uses), plain digits otherwise (no "+" on a score).
 */
export function scoreText(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : String(n);
}

/** A score as read aloud: "minus 5" (some screen readers skip a lone "−"). */
export function scoreSpoken(n: number): string {
  return n < 0 ? `minus ${Math.abs(n)}` : String(n);
}

/**
 * The running score shown DURING a round never drops below 0 (Sure Footing
 * can go negative). Display only: the real total is kept and shown on the recap.
 */
export function runningScore(n: number): number {
  return Math.max(0, n);
}

/** How the trend is read aloud: "Your last 3 rounds: 4, 6, 7. Best 8." */
export function trendSpoken(scores: readonly number[], best: number | undefined): string {
  if (scores.length === 0) return best === undefined ? '' : `Best ${scoreSpoken(best)}.`;
  const rounds = scores.length === 1 ? 'Your last round' : `Your last ${scores.length} rounds`;
  return `${rounds}: ${scores.map(scoreSpoken).join(', ')}.${best === undefined ? '' : ` Best ${scoreSpoken(best)}.`}`;
}

/** The first sentence of a text (or the text cut at a word, with "…"), for one-line reasons. */
export function firstSentence(text: string, max = 180): string {
  const t = text.trim().replace(/\s+/g, ' ');
  const m = /^(.+?[.!?])(\s|$)/.exec(t);
  return clip(m ? m[1] : t, max);
}

/** One missed question in the recap. */
export interface RecapMiss {
  questionId: string;
  /** The start of the stem, so the learner knows which question it was. */
  stem: string;
  /** "Snare: …" or "Signpost word: FIRST". */
  tag: string;
  /** One line on why. */
  why: string;
  /** The answer itself was wrong (so the question is now in review). */
  answerWrong: boolean;
}

/** Shortens text to about `max` characters at a word boundary. */
export function clip(text: string, max = 90): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).trimEnd()}…`;
}

/** `render` turns {{A}}-style tokens into the round's display letters (shuffle.renderText). */
type Render = (text: string) => string;

/**
 * Snare Spotter: a miss is a snare not spotted OR a wrong answer.
 * Tag = the real snare's option text; why = why the snare loses.
 */
export function snareMiss(q: PackQuestion, spotted: boolean, answerCorrect: boolean, render: Render): RecapMiss | null {
  if (spotted && answerCorrect) return null;
  const trap = trapLetter(q);
  const snareText = trap ? q.options[trap] ?? '' : '';
  const why = (trap && q.wrongExplanations[trap]) || q.explanation;
  return {
    questionId: q.id,
    stem: clip(q.stem),
    tag: snareText ? `Snare: ${clip(render(snareText), 70)}` : 'Snare',
    why: firstSentence(render(why)),
    answerWrong: !answerCorrect,
  };
}

/**
 * Signpost: a miss is a wrong reading of the deciding word OR a wrong answer.
 * Tag = the deciding word; why = what that word asks for.
 */
export function signpostMiss(q: PackQuestion, readRight: boolean, answerCorrect: boolean): RecapMiss | null {
  if (readRight && answerCorrect) return null;
  const word = priorityWord(q.stem);
  return {
    questionId: q.id,
    stem: clip(q.stem),
    tag: word ? `Signpost word: ${word}` : 'Signpost word',
    // From the first accepted meaning: "MOST appropriate" coaches like BEST.
    why: word ? meaningFor(q.stem) : firstSentence(q.explanation),
    answerWrong: !answerCorrect,
  };
}

/**
 * Sure Footing: a miss is a wrong answer. If the pick was the question's
 * snare, name it; otherwise name the deciding word when the stem has one.
 * Why = the note on the option the learner picked.
 */
export function pickMiss(q: PackQuestion, picked: Letter, answerCorrect: boolean, render: Render): RecapMiss | null {
  if (answerCorrect) return null;
  const word = priorityWord(q.stem);
  const pickedText = q.options[picked] ?? '';
  const tag =
    trapLetter(q) === picked
      ? `Snare: ${clip(render(pickedText), 70)}`
      : word
        ? `Signpost word: ${word}`
        : `Your pick: ${clip(render(pickedText), 70)}`;
  return {
    questionId: q.id,
    stem: clip(q.stem),
    tag,
    why: firstSentence(render(q.wrongExplanations[picked] || q.explanation)),
    answerWrong: true,
  };
}

/** The line under the recap, shown when any answer was wrong. */
export const REVIEW_LINE = 'Missed questions are in your review.';

export function reviewLine(misses: readonly RecapMiss[]): string | null {
  return misses.some((m) => m.answerWrong) ? REVIEW_LINE : null;
}
