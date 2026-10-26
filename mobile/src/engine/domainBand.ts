/**
 * Domain bands — "Building / Steady / Strong" instead of a number that has
 * not earned its precision yet (mobile 1.24).
 *
 * Why: a domain with 10 answers can show 90 and, ten answers later, 65. That
 * swing is noise, not learning, and a number invites the learner to read it
 * as a score. So below BAND_MIN_ANSWERS answers in a domain we show a word,
 * using the app's own bars (the 70% per-domain target and the 80% ready bar).
 * From BAND_MIN_ANSWERS answers the number is steady enough to show, with a
 * "%" and the words "latest tries" (it counts the latest try at each question).
 *
 * Also the yardstick line for the readiness report: what the app's own bars
 * are, in plain words. Range only: no claim about passing the exam.
 *
 * Pure TypeScript: no React, no storage.
 */
import { READY_LOW } from './examReady';
import { DOMAIN_TARGET } from './journey';

/** From this many answers in a domain the number is shown (with "%" and "latest tries"). */
export const BAND_MIN_ANSWERS = 30;
/** The per-domain target, whole percent (the app's 70% bar). */
export const STEADY_FROM = Math.round(DOMAIN_TARGET * 100);
/** The "ready" bar, whole percent (the app's 80% bar). */
export const STRONG_FROM = READY_LOW;

export type Band = 'Building' | 'Steady' | 'Strong';

/** Building below 70, Steady 70 to 79, Strong 80 and up. */
export function bandOf(pct: number): Band {
  if (pct >= STRONG_FROM) return 'Strong';
  if (pct >= STEADY_FROM) return 'Steady';
  return 'Building';
}

export interface DomainFigure {
  /** What the legend shows: "–" (not started), a band word, or "72%". */
  text: string;
  /** What a screen reader says for this domain's value. */
  spoken: string;
  /** True when the figure is a band word rather than a number. */
  banded: boolean;
}

/**
 * The one figure to show for a domain. `pct` is the ring's whole percent
 * (0..100); `answered` is the number of questions answered in the domain.
 */
export function domainFigure(answered: number, pct: number): DomainFigure {
  if (answered <= 0) return { text: '–', spoken: 'not started', banded: false };
  if (answered < BAND_MIN_ANSWERS) {
    const band = bandOf(pct);
    return { text: band, spoken: band, banded: true };
  }
  return { text: `${pct}%`, spoken: `${pct} percent, latest tries`, banded: false };
}

/** The small label under the legend once any domain shows a number ("%" = latest tries). */
export const LATEST_TRIES_LABEL = 'Percentages count your latest try at each question.';
/** The line under the legend while a domain shows a band word. */
export const BANDS_LINE = `Building is under ${STEADY_FROM}, Steady ${STEADY_FROM} to ${STRONG_FROM - 1}, Strong ${STRONG_FROM} and up. A number shows from ${BAND_MIN_ANSWERS} answers in a domain.`;

/**
 * You's readiness (mobile 1.43, board 3): one ring with a notch at the study bar,
 * then one row per area. The two lines are labelled apart (80 is the overall
 * study bar, 70 each area's line), and never called a pass mark.
 */
export const STUDY_BAR_LINE = `The notch marks ${READY_LOW}%, this app’s study bar for your low end. Each area has its own ${STEADY_FROM}% line. A study bar, not an exam score.`;
/** The caption over the area rows, and its partner on the right. */
export const AREAS_CAPTION = 'Right on your latest tries';
export const AREA_LINE_LABEL = `Area line ${STEADY_FROM}%`;

export interface AreaFigure {
  /** Always a word: "Not started", "Building", "Steady", "Strong". */
  word: string;
  /** The whole percent, shown only from BAND_MIN_ANSWERS answers; null below that. */
  pct: number | null;
  /** Under BAND_MIN_ANSWERS answers (but some): the bar is drawn lighter and "N answered" shows. */
  thin: boolean;
  /** Below the area's 70% line (with any answers): the row stands out, by its word as well as its colour. */
  below: boolean;
  /** What a screen reader says after the area's name. */
  spoken: string;
}

/**
 * One area's row on You (mobile 1.43; owner decision: a word AND a number for
 * every area, with thin data shown as thin). `pct` = the area's whole percent
 * on latest tries, `answered` = answers in it.
 */
export function areaFigure(answered: number, pct: number): AreaFigure {
  if (answered <= 0) return { word: 'Not started', pct: null, thin: false, below: false, spoken: 'not started' };
  const word = bandOf(pct);
  const below = pct < STEADY_FROM;
  const line = below ? `below the ${STEADY_FROM} line` : `at or above the ${STEADY_FROM} line`;
  if (answered < BAND_MIN_ANSWERS) {
    return { word, pct: null, thin: true, below, spoken: `${word}, from ${answered} ${answered === 1 ? 'answer' : 'answers'}, ${line}` };
  }
  return { word, pct, thin: false, below, spoken: `${word}, ${pct} percent on latest tries, ${line}` };
}

/**
 * The readiness report's yardstick (mobile 1.24): the bars this app steers by,
 * said once and plainly. It is the app's own bar, never a claim about passing,
 * and the range stays a range. (Worded without the word "pass": the report's
 * copy scan bans it.)
 */
export const YARDSTICK_LINE = `This app’s own yardstick: a low end of ${READY_LOW}% or more, with every domain at ${STEADY_FROM}% or more. It is a study bar for this app, not a promise or a prediction of your exam result.`;
