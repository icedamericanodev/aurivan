/**
 * Grove Today: the words and marks of Today's hero and its week twig, worked out from values
 * the app already has. Presentation only: no readiness, streak or scoring maths changes here.
 * (design-notes/grove/GROVE_HANDOFF.md 6.4 and 6.6; design-notes/grove/DECISIONS.md 1 to 3;
 * the ring decision "Option B": the plant full size, seed dots, then ticks.)
 *
 * Plain English:
 * - Before the first readiness range, the ring shows 40 seed dots, one per answer that counts
 *   (assisted first answers count half, as the engine already does). Answered dots are solid,
 *   the rest are outlines, so they differ by shape too. They never go backwards.
 * - Once a range exists, the ring shows 50 ticks of 2 points each: lit up to the range's low
 *   end, gold inside the range, and a clay mark at the 80 study bar. The range is written
 *   under the ring as "63 to 73 estimated range", with "A study estimate, not a prediction."
 * - Exam week (and exam day) keep the earlier rule: readiness in words, no dots or ticks.
 * - Accuracy reads "Too few yet" until 30 answers, like every other area figure.
 * - The twig: seven leaves, Monday to Sunday, filled on a day studied. Its right side says
 *   "Streak starts today" for a new learner, "4 day streak" from a streak of 2, nothing for a
 *   streak under 2 after that, and nothing at all from the 14th study day. Never a reset line.
 *
 * Pure TypeScript: no React, no storage. Tested in __tests__/grove-today.test.ts.
 */
import { BAND_MIN_ANSWERS } from './domainBand';
import { READY_LOW } from './examReady';
import { RANGE_MIN_ANSWERS, type ReadinessRange } from './readinessRange';
import { dayKey } from './streak';

/** After the first range: 50 ticks, each worth 2 points. */
export const RING_TICKS = 50;
/** The clay mark on the ring: this app's study bar for the low end (the same 80 as You and the report). */
export const RING_STUDY_BAR = READY_LOW;
/** The line under the range, word for word (owner decision; G18). */
export const ESTIMATE_LINE = 'A study estimate, not a prediction.';
/** From this study day on, the twig shows no streak (owner decision, 31 Oct 2026). */
export const TWIG_STREAK_UNTIL = 14;
/** A streak shows from this many days; below it there is only the week (no 0, no 1). */
export const STREAK_SHOW_MIN = 2;
/** Today's stage count, in words beside the stage name ("Stage 1 of 6"). */
export const HERO_STAGES = 6;

/** Answers that count toward the first range so far (0 to 40). Never more than 40, never below 0. */
export function seedDotsOn(range: ReadinessRange): number {
  if (range.enough) return RANGE_MIN_ANSWERS;
  return Math.max(0, Math.min(RANGE_MIN_ANSWERS, RANGE_MIN_ANSWERS - range.needed));
}

export type TickState = 'on' | 'range' | 'off';
/**
 * The 50 ticks after the first range, from 12 o'clock clockwise. A tick covers 2 points: it is
 * lit when its top end is at or under the range's low end, gold when it starts under the high end.
 */
export function rangeTicks(low: number, high: number): TickState[] {
  return Array.from({ length: RING_TICKS }, (_, i) => {
    const top = ((i + 1) * 100) / RING_TICKS;
    const bottom = (i * 100) / RING_TICKS;
    return top <= low ? 'on' : bottom < high ? 'range' : 'off';
  });
}

/** What the ring shows: seed dots, ticks, or nothing around the plant (exam week). */
export type RingMode = 'dots' | 'ticks' | 'bare';
export function ringMode(range: ReadinessRange, examWeek: boolean): RingMode {
  if (examWeek) return 'bare';
  return range.enough ? 'ticks' : 'dots';
}

/**
 * The caption under the ring, in parts so the big number can be drawn in the serif:
 * `big` then `rest` on the first line, `line2` under it. `spoken` is the ring's one label.
 */
export interface RingCaption {
  big: string | null;
  rest: string;
  line2: string | null;
  spoken: string;
}
export function ringCaption(range: ReadinessRange, examWeek: boolean): RingCaption {
  if (range.enough) {
    const words = `${range.low} to ${range.high}`;
    if (examWeek) {
      // Exam week: readiness in words, no ring marks.
      return { big: null, rest: `Your estimated readiness is ${words}.`, line2: ESTIMATE_LINE, spoken: `Your estimated readiness is ${words} out of 100. ${ESTIMATE_LINE}` };
    }
    return {
      big: words,
      rest: 'estimated range',
      line2: ESTIMATE_LINE,
      spoken: `Estimated readiness range ${words} out of 100. The study bar is ${RING_STUDY_BAR}. ${ESTIMATE_LINE}`,
    };
  }
  const so = seedDotsOn(range);
  if (so <= 0) {
    return { big: null, rest: `Answer ${RANGE_MIN_ANSWERS} questions`, line2: 'to see your first readiness range', spoken: `0 of ${RANGE_MIN_ANSWERS} answers toward your first readiness range.` };
  }
  return { big: String(so), rest: `of ${RANGE_MIN_ANSWERS} answers`, line2: 'until your first readiness range', spoken: `${so} of ${RANGE_MIN_ANSWERS} answers toward your first readiness range.` };
}

/** The Accuracy tile: "Not started", "Too few yet" (with when it shows) under 30 answers, then the whole percentage. */
export interface AccuracyTile {
  shown: string;
  hint: string | null;
  spoken: string;
  /** True when the value is a number (drawn in the serif). */
  num: boolean;
}
export function accuracyTile(answered: number, mastered: number): AccuracyTile {
  if (answered <= 0) return { shown: 'Not started', hint: null, spoken: 'Accuracy, not started', num: false };
  if (answered < BAND_MIN_ANSWERS) {
    const hint = `Shows at ${BAND_MIN_ANSWERS} answers`;
    return { shown: 'Too few yet', hint, spoken: `Accuracy, too few yet, ${answered} answered. ${hint}.`, num: false };
  }
  const pct = Math.round((mastered / answered) * 100);
  return { shown: `${pct}%`, hint: null, spoken: `Accuracy, ${pct} percent, latest tries`, num: true };
}

/** One leaf of the twig: a day of this week, Monday first. */
export interface TwigDay {
  /** 0 = Monday … 6 = Sunday. */
  i: number;
  on: boolean;
  today: boolean;
}
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const TWIG_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * This week, Monday to Sunday, from the saved study days (the streak's last 14 days, which
 * always cover the current week). A day after today is never filled. Missed and later days
 * look the same, so a gap is never marked.
 */
export function twigWeek(studyDays: readonly string[], now: number): TwigDay[] {
  const on = new Set(studyDays);
  const d = new Date(now);
  const dow = (d.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const key = dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow + i, 12).getTime());
    return { i, today: i === dow, on: i <= dow && on.has(key) };
  });
}

/** "1 study day this week", "3 study days this week". */
export const studyDaysWords = (n: number) => `${n} ${n === 1 ? 'study day' : 'study days'} this week`;

/**
 * The twig's right side, in clay: "Streak starts today" while there are fewer than 2 study days
 * in all, then "4 day streak" from a streak of 2; '' for a streak under 2 after that, and '' from
 * the 14th study day (the habit is the point by then, not the count). Never a reset line.
 */
export function twigStreak(studyDaysInAll: number, streak: number): string {
  if (studyDaysInAll >= TWIG_STREAK_UNTIL) return '';
  if (streak >= STREAK_SHOW_MIN) return `${streak} day streak`;
  return studyDaysInAll < STREAK_SHOW_MIN ? 'Streak starts today' : '';
}

/** The twig's one spoken label: the days studied, by name, and today. */
export function twigSpoken(week: readonly TwigDay[]): string {
  const names = week.filter((d) => d.on).map((d) => WEEKDAYS[d.i]);
  const list = names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const today = week.find((d) => d.today);
  return `${names.length ? `Studied on ${list}. One leaf per day studied.` : 'No study days yet this week.'} Today is ${WEEKDAYS[today ? today.i : 0]}.`;
}
