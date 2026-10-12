/**
 * The exam-date calendar's date maths (Settings → Exam date, onboarding).
 *
 * Everything works on local CALENDAR days ("YYYY-MM-DD", the format the
 * exam date has always been saved in) and calendar months, never on hours,
 * so daylight-saving days and time zones can't move a date. Weeks start on
 * Monday, like the reminder day chips.
 *
 * Pure TypeScript: no React, no storage. English names on purpose (the app's
 * copy is English, and the phone's Intl data differs between devices).
 */
import { dateInMonths } from './examDay';
import { dayKey, daysBetween } from './streak';

/** A calendar month: `month` is 0–11 (January = 0). */
export interface YearMonth {
  year: number;
  month: number;
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Monday first (the reminder chips' order). */
export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** The grid's column headings: two letters, so "Tu" and "Th" differ. Screen readers hear each day's full date instead. */
export const WEEKDAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** How far ahead an exam date can be picked. */
export const CALENDAR_MONTHS_AHEAD = 24;

const pad = (n: number) => String(n).padStart(2, '0');

/** "2027-01-08" for a year, a 0-based month and a day. */
export function keyOf(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** The month a "YYYY-MM-DD" date falls in. */
export function monthOf(date: string): YearMonth {
  const [y, m] = date.split('-').map(Number);
  return { year: y, month: m - 1 };
}

/** `n` months after (or before, negative) a month. */
export function addMonths(ym: YearMonth, n: number): YearMonth {
  const total = ym.year * 12 + ym.month + n;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** -1, 0 or 1: is month `a` before, the same as, or after month `b`? */
export function compareMonths(a: YearMonth, b: YearMonth): number {
  return Math.sign(a.year * 12 + a.month - (b.year * 12 + b.month));
}

/** Days in a month (February knows about leap years). */
export function daysInMonth(ym: YearMonth): number {
  return new Date(Date.UTC(ym.year, ym.month + 1, 0)).getUTCDate();
}

/** 0 = Monday … 6 = Sunday, for a "YYYY-MM-DD" date. */
export function weekdayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/**
 * The month as weeks of 7 cells, Monday first: each cell is a date, or null
 * for the blanks before the 1st and after the last day. 4 to 6 weeks.
 */
export function monthGrid(ym: YearMonth): (string | null)[][] {
  const lead = weekdayIndex(keyOf(ym.year, ym.month, 1));
  const n = daysInMonth(ym);
  const cells: (string | null)[] = [...Array<null>(lead).fill(null)];
  for (let d = 1; d <= n; d++) cells.push(keyOf(ym.year, ym.month, d));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "January 2027". */
export function monthLabel(ym: YearMonth): string {
  return `${MONTH_NAMES[ym.month]} ${ym.year}`;
}

/** "Friday 8 January 2027": a day button's spoken name. */
export function spokenDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${WEEKDAY_NAMES[weekdayIndex(date)]} ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** "Fri 8 Jan 2027": the chosen date, short enough for one line at 360 dp. */
export function shortDayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${WEEKDAY_NAMES[weekdayIndex(date)].slice(0, 3)} ${d} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
}

/** The dates that can be picked: today (no earlier) to two years ahead. */
export function calendarBounds(now: number): { min: string; max: string } {
  return { min: dayKey(now), max: dateInMonths(CALENDAR_MONTHS_AHEAD, now) };
}

/** True when `date` can be picked (string order is date order for "YYYY-MM-DD"). */
export function inBounds(date: string, b: { min: string; max: string }): boolean {
  return date >= b.min && date <= b.max;
}

/**
 * The month the calendar opens on: the chosen date's month while it can be
 * shown, else this month (a date already past opens on today).
 */
export function openingMonth(date: string | undefined, now: number): YearMonth {
  const b = calendarBounds(now);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && compareMonths(monthOf(date), monthOf(b.min)) >= 0 && compareMonths(monthOf(date), monthOf(b.max)) <= 0) {
    return monthOf(date);
  }
  return monthOf(b.min);
}

/** "Today", "Tomorrow" or "In 88 days" for a date from today; null for a past date. */
export function untilLabel(date: string, today: string): string | null {
  const n = daysBetween(today, date);
  if (n < 0) return null;
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return `In ${n} days`;
}
