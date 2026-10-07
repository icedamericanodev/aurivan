/**
 * Exam-ready moment — "your readiness has held steady and high for a week".
 *
 * The trigger, in plain English:
 *   The LOWER end of the honest readiness range (readinessRange.ts) has been
 *   at or above READY_LOW (80%) on each of the last READY_DAYS (7) calendar
 *   days, ending today. "Not enough data yet" never counts.
 *
 * Why the lower bound: it is the cautious end of the range. If even the
 * cautious end holds above 80% for a week, mastery is high and stable, not a
 * lucky afternoon. It is still NOT a promise of a pass; the copy never says so.
 *
 * The history (`ReadinessDay[]`) is tiny: one entry per day the learner
 * opened Today or answered a question, kept for the last LOG_KEEP_DAYS days.
 *   - `min`  = the lowest lower bound seen that day (null = not enough data).
 *              A dip during the day resets the hold, even if it recovered.
 *   - `last` = the lower bound at the end of that day.
 * Days with no entry (the app was not opened) carry `last` forward from the
 * day before: readiness only changes when you answer, so it truly held.
 *
 * Pure TypeScript: no React, no storage. Days are "YYYY-MM-DD" local keys
 * (streak.ts dayKey), so midnight means the learner's own midnight.
 */
import { daysBetween } from './streak';

/** The lower bound must be at least this (percent). */
export const READY_LOW = 80;
/** For this many consecutive calendar days, today included. */
export const READY_DAYS = 7;
/** How many days of history are kept (old days are dropped). */
export const LOG_KEEP_DAYS = 30;

export interface ReadinessDay {
  day: string; // "YYYY-MM-DD", local calendar day
  min: number | null; // lowest lower bound that day (null = not enough data)
  last: number | null; // lower bound at the latest update that day
}

/** The lower of two lower bounds, where "not enough data" (null) is lowest. */
function lower(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return Math.min(a, b);
}

/**
 * Add today's reading to the history. Returns the SAME array when nothing
 * changed, so the store can skip a needless save (and screens a re-render).
 */
export function logReadinessDay(log: ReadinessDay[], day: string, low: number | null): ReadinessDay[] {
  const i = log.findIndex((e) => e.day === day);
  if (i >= 0) {
    const e = log[i];
    const next = { day, min: lower(e.min, low), last: low };
    if (next.min === e.min && next.last === e.last) return log;
    const out = [...log];
    out[i] = next;
    return out;
  }
  const out = [...log, { day, min: low, last: low }].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  // Keep only the most recent days (by calendar, not by count of entries).
  const newest = out[out.length - 1].day;
  return out.filter((e) => daysBetween(e.day, newest) < LOG_KEEP_DAYS);
}

/** The calendar day `n` days before a "YYYY-MM-DD" key (pure date maths, no time zone). */
export function shiftDay(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - n));
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(t.getUTCDate()).padStart(2, '0');
  return `${t.getUTCFullYear()}-${mm}-${dd}`;
}

/**
 * How many consecutive days, ending `today`, the lower bound held at or
 * above READY_LOW (0..READY_DAYS). A day with an entry uses its `min`; a day
 * without one carries forward the `last` value of the nearest earlier entry.
 * Before the first entry there is no evidence, so the count stops there.
 */
export function readyHoldDays(log: ReadinessDay[], today: string): number {
  const sorted = [...log].sort((a, b) => (a.day < b.day ? -1 : 1));
  let held = 0;
  for (let k = 0; k < READY_DAYS; k++) {
    const day = shiftDay(today, k);
    const own = sorted.find((e) => e.day === day);
    let value: number | null;
    if (own) value = own.min;
    else {
      const before = sorted.filter((e) => e.day < day);
      if (before.length === 0) break; // no history this far back
      value = before[before.length - 1].last;
    }
    if (value === null || value < READY_LOW) break;
    held += 1;
  }
  return held;
}

/**
 * True when the one-time exam-ready panel should show on Today.
 * `examSoon` = it is the exam eve or exam day: the panel waits (those days
 * belong to the calm exam card), and since it was never dismissed it can
 * still show later.
 */
export function examReadyDue(log: ReadinessDay[] | undefined, today: string, seen: boolean, examSoon = false): boolean {
  return !seen && !examSoon && readyHoldDays(log ?? [], today) >= READY_DAYS;
}
