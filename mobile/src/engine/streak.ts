/**
 * Study streak — consecutive days of study, with ONE free rest day per week.
 *
 * Why a rest day: a streak that drops to zero after a single missed day
 * punishes exactly the learners who need a break (illness, work trips),
 * and guilt makes people quit. So missing one day keeps the streak alive,
 * as long as no other rest day was used in the previous 7 days.
 *
 * Uses the device's LOCAL calendar day, so midnight means midnight for
 * the learner, wherever they are.
 */
export interface Streak {
  current: number;
  best: number;
  lastDay: string | null; // "YYYY-MM-DD" of the last study day
  restDay?: string | null; // the most recent day covered by a rest day
  recentDays?: string[]; // last 14 distinct study days (oldest first)
}

export function dayKey(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** The calendar day `n` days before `ms` (DST-safe: date maths, not hours). */
export function daysBeforeKey(ms: number, n: number): string {
  const d = new Date(ms);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n, 12).getTime());
}

/** The calendar day before `ms`. */
export function yesterdayKey(ms: number): string {
  return daysBeforeKey(ms, 1);
}

/** Whole calendar days from key a to key b (b later → positive). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ua = Date.UTC(ay, am - 1, ad);
  const ub = Date.UTC(by, bm - 1, bd);
  return Math.round((ub - ua) / 86_400_000);
}

/** True when a rest day may be spent covering `missedDay`. */
function restAvailable(s: Streak, missedDay: string): boolean {
  return !s.restDay || daysBetween(s.restDay, missedDay) >= 7;
}

export function bumpStreak(s: Streak, now: number): Streak {
  const today = dayKey(now);
  if (s.lastDay === today) return s;

  const recentDays = [...(s.recentDays ?? []), today].slice(-14);
  let current = 1;
  let restDay = s.restDay ?? null;

  if (s.lastDay === yesterdayKey(now)) {
    current = s.current + 1;
  } else if (s.lastDay === daysBeforeKey(now, 2) && restAvailable(s, yesterdayKey(now))) {
    // Missed exactly one day: the weekly rest day covers it.
    current = s.current + 1;
    restDay = yesterdayKey(now);
  }
  return { current, best: Math.max(s.best, current), lastDay: today, restDay, recentDays };
}

/**
 * Streak to SHOW. Alive if you studied today or yesterday, or the day before
 * yesterday when a rest day is still available for yesterday.
 */
export function visibleStreak(s: Streak, now: number): number {
  if (!s.lastDay) return 0;
  if (s.lastDay === dayKey(now) || s.lastDay === yesterdayKey(now)) return s.current;
  if (s.lastDay === daysBeforeKey(now, 2) && restAvailable(s, yesterdayKey(now))) return s.current;
  return 0;
}

/** Which of the last 7 days (oldest → today) had study. For a calm week strip. */
export function weekStrip(s: Streak, now: number): boolean[] {
  const days = new Set(s.recentDays ?? (s.lastDay ? [s.lastDay] : []));
  return Array.from({ length: 7 }, (_, i) => days.has(daysBeforeKey(now, 6 - i)));
}
