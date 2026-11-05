/**
 * Grove You (version C2): the words at the top of You, worked out from values the app already
 * has. Presentation only: no readiness, streak or scoring maths changes here.
 * (Spec: scratchpad grove/you-c2/final/SPEC.md sections 2 and 4; design-notes/grove/DECISIONS.md 1 and 3.)
 *
 * Plain English:
 * - The summary sentence under the profile says where to focus next and the countdown (short
 *   text, 5 Nov 2026: the study days and the range are on the tiles and card under it). It was
 *   built by the same rules as the website's; the website takes the same cut in its copy pass.
 * - "Focus next" is the same domain Today and Practice pick (readiness.focusDomainId). Once there
 *   are answers it says why: "where you'll gain most".
 * - The countdown hangs off the last sentence with no-break spaces around its dot, so a line
 *   never starts with "·". No exam date, or a date that has passed: no countdown.
 * - The streak row follows Today's twig (DECISIONS 3): "Starts today" while there are fewer than
 *   2 study days in all, "N days in a row" from a streak of 2, and this week's study days instead
 *   when the streak is under 2 after that, or from the 14th study day on. Never a 0, never a reset.
 *
 * Pure TypeScript: no React, no storage. Tested in __tests__/grove-you.test.ts.
 */
import { seedDotsOn, studyDaysWords, STREAK_SHOW_MIN, TWIG_STREAK_UNTIL } from './groveToday';
import { RANGE_MIN_ANSWERS, type ReadinessRange } from './readinessRange';

/** The no-break space that holds the countdown's dot to the words before and after it. */
export const NBSP = ' ';
/** " · " with no-break spaces: a wrapped line never starts with the dot. */
export const KEEP_DOT = `${NBSP}·${NBSP}`;
/** Today's own words for why the focus area comes first. */
export const GAIN_MOST = 'where you’ll gain most';

/** "No study days yet this week", "1 study day this week", "4 study days this week". */
export function weekDaysWords(n: number): string {
  return n > 0 ? studyDaysWords(n) : 'No study days yet this week';
}

/** "Readiness 63 to 73, a study estimate", "34 of 40 answers toward…", or "Answer 40 questions to see…". */
export function readinessWords(range: ReadinessRange): string {
  if (range.enough) return `Readiness ${range.low} to ${range.high}, a study estimate`;
  // The same count Today's seed dots show (assisted first answers count half, as the engine does).
  const on = seedDotsOn(range);
  return on > 0
    ? `${on} of ${RANGE_MIN_ANSWERS} answers toward your first readiness range`
    : `Answer ${RANGE_MIN_ANSWERS} questions to see your first readiness range`;
}

/** "42 days to go", "1 day to go", "Exam day"; null with no date or a date that has passed. */
export function countdownWords(daysLeft: number | null): string | null {
  if (daysLeft === null || daysLeft < 0) return null;
  if (daysLeft === 0) return 'Exam day';
  return `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} to go`;
}

export interface YouSummaryInput {
  /** Days studied this week, Monday first (Today's twig count). */
  studyDaysThisWeek: number;
  range: ReadinessRange;
  /** The focus domain's short name (readiness.focusDomainId), or null when there is none. */
  focusShort: string | null;
  /** Answers in all (the "where you'll gain most" rule needs at least one). */
  answered: number;
  daysLeft: number | null;
}

/**
 * The summary, in parts so the focus name can be drawn heavier: `lead` + `focus` + `tail` is the
 * whole sentence as shown. `spoken` says it with a comma where the dot is.
 */
export interface YouSummary {
  lead: string;
  focus: string | null;
  tail: string;
  shown: string;
  spoken: string;
}

export function youSummary(i: YouSummaryInput): YouSummary {
  const countdown = countdownWords(i.daysLeft);
  const end = countdown ? `${KEEP_DOT}${countdown}.` : '.';
  // Short text (Sky, 5 Nov 2026: nothing repeated on a screen): the week's study days and the
  // readiness range left this sentence, because the streak tile and the Estimated readiness card
  // right under it say them. What is left is the one thing only this line says: where to go next.
  // With no focus area (a course with no domains) the week's study days stay, so the line is never empty.
  let lead: string;
  let focus: string | null = null;
  let tail: string;
  if (i.focusShort) {
    lead = 'Focus next: ';
    focus = i.focusShort;
    tail = `${i.answered > 0 ? `, ${GAIN_MOST}` : ''}${end}`;
  } else {
    lead = weekDaysWords(i.studyDaysThisWeek);
    tail = end;
  }
  const shown = `${lead}${focus ?? ''}${tail}`;
  return { lead, focus, tail, shown, spoken: shown.split(KEEP_DOT).join(', ') };
}

/** One row of You's stats for the streak: a number with words, or words alone. */
export interface StreakRow {
  label: 'Streak' | 'This week';
  value?: string;
  unit?: string;
  word?: string;
  /** What a screen reader says after the label. */
  spoken: string;
  /** True when the row shows the streak count (it rolls and is drawn in clay). */
  count: boolean;
}

/**
 * The streak row on You, by Today's twig rule (DECISIONS 3). `studyDaysInAll` is the saved count
 * of study days (milestones.days), `streak` the visible streak, `thisWeek` the days studied this week.
 */
export function youStreakRow(studyDaysInAll: number, streak: number, thisWeek: number): StreakRow {
  if (studyDaysInAll < TWIG_STREAK_UNTIL && streak >= STREAK_SHOW_MIN) {
    return { label: 'Streak', value: String(streak), unit: 'days in a row', spoken: `${streak} days in a row`, count: true };
  }
  if (studyDaysInAll < STREAK_SHOW_MIN && streak < STREAK_SHOW_MIN) {
    // No streak yet (or one study day): an invitation, never a "0" or "1" that reads as a failure.
    return { label: 'Streak', word: 'Starts today', spoken: studyDaysInAll === 0 ? 'starts today, with your first answer' : 'starts today', count: false };
  }
  // The count steps aside: this week's study days carry the habit, as on Today.
  if (thisWeek <= 0) return { label: 'This week', word: 'None yet', spoken: 'no study days yet', count: false };
  const unit = thisWeek === 1 ? 'study day' : 'study days';
  return { label: 'This week', value: String(thisWeek), unit, spoken: `${thisWeek} ${unit}`, count: false };
}
