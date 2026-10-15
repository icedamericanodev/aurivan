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
 * The readiness report's yardstick (mobile 1.24): the bars this app steers by,
 * said once and plainly. It is the app's own bar, never a claim about passing,
 * and the range stays a range. (Worded without the word "pass": the report's
 * copy scan bans it.)
 */
export const YARDSTICK_LINE = `This app’s own yardstick: a low end of ${READY_LOW}% or more, with every domain at ${STEADY_FROM}% or more. It is a study bar for this app, not a promise or a prediction of your exam result.`;
