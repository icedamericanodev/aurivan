/**
 * Exam eve and exam day — the two calm cards on Today.
 *
 *   - The day BEFORE the exam date: "Tomorrow. You've done the work." with the
 *     learner's top slips as gentle reminders, one pacing line, and a nudge to
 *     rest rather than cram.
 *   - ON the exam date: a short "Good luck today".
 *   - No exam date set: neither card.
 *
 * Date maths uses local CALENDAR days ("YYYY-MM-DD"), never "24 hours from
 * now": the exam date is a calendar date in the learner's own time zone, and
 * days around daylight-saving changes are 23 or 25 hours long.
 *
 * Pure TypeScript: no React, no storage.
 */
import { PATTERN_ORDER, patternsOf, type SlipInput, type SlipPattern } from './slipCoach';
import { dayKey, daysBetween } from './streak';

export type ExamMoment = 'eve' | 'day';

// ── Choosing the exam date (onboarding and Settings share these) ───────
/** Quick presets; they avoid a native date-picker dependency. */
export const EXAM_DATE_PRESETS: { label: string; months?: number }[] = [
  { label: 'In 1 month', months: 1 },
  { label: 'In 2 months', months: 2 },
  { label: 'In 3 months', months: 3 },
  { label: 'Not sure yet' },
];

/** The local calendar date `months` from `now`, as "YYYY-MM-DD". */
export function dateInMonths(months: number, now: number): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() + months);
  return dayKey(d.getTime()); // local calendar date, not UTC
}

/** Move a "YYYY-MM-DD" date by `days` (negative = earlier). Calendar maths, no time zone. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Which preset matches a saved date (so its chip shows as selected):
 * no date → "Not sure yet"; a date no preset gives (after stepping by a day) → -1.
 */
export function presetIndexFor(date: string | undefined, now: number): number {
  if (!date) return EXAM_DATE_PRESETS.findIndex((p) => p.months === undefined);
  return EXAM_DATE_PRESETS.findIndex((p) => p.months !== undefined && dateInMonths(p.months, now) === date);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "12 Jan 2027" for a "YYYY-MM-DD" date (same short style as the rest of the app). */
export function examDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Whole calendar days from `today` to the exam date (null = no date set). */
export function daysToExam(examDate: string | undefined, today: string): number | null {
  if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return null;
  return daysBetween(today, examDate);
}

/**
 * "eve" the day before, "day" on the day, otherwise null. `now` is a
 * timestamp (ms); `toDay` turns it into the learner's local calendar day
 * (the phone's time zone by default; tests pass a fixed zone).
 */
export function examMoment(
  examDate: string | undefined,
  now: number,
  toDay: (ms: number) => string = dayKey,
): ExamMoment | null {
  const left = daysToExam(examDate, toDay(now));
  if (left === 1) return 'eve';
  if (left === 0) return 'day';
  return null;
}

/**
 * The pacing line, from the certification's exam facts (never hard-coded):
 * CISA 150 questions / 240 minutes → "150 questions in 4 hours: about 1.5
 * minutes each." Minutes per question round to the nearest half minute.
 */
export function paceLine(exam: { questions: number; minutes: number }): string {
  const per = Math.max(0.5, Math.round((exam.minutes / exam.questions) * 2) / 2);
  const h = Math.floor(exam.minutes / 60);
  const m = exam.minutes % 60;
  const hours = h === 0 ? `${m} minutes` : m === 0 ? `${h} hour${h === 1 ? '' : 's'}` : `${h} h ${m} min`;
  const perText = per === 1 ? '1 minute' : `${per} minutes`;
  return `${exam.questions} questions in ${hours}: about ${perText} each.`;
}

/** Gentle exam-eve wording for each slip ("knowledge" is left out: no cramming tonight). */
export const EVE_REMINDER: Record<Exclude<SlipPattern, 'knowledge'>, string> = {
  'runner-up': 'When two options look right, say why the best one wins.',
  priority: 'Find the FIRST or BEST word before you read the options.',
  overconfident: 'Give a sure answer one more read of the stem.',
  role: 'Ask who you are in the question before you answer.',
  'tech-first': 'Policy, ownership and approval come before tools.',
  symptom: 'Prefer the option that fixes the root cause.',
  misread: 'Slow down on the last line of each stem.',
};

/** Shown when the learner has no slips on record yet (calm, general advice). */
export const EVE_DEFAULTS: (keyof typeof EVE_REMINDER)[] = ['priority', 'runner-up', 'role'];

/**
 * The learner's most frequent slips (up to `n`), most frequent first; ties
 * follow the slip coach's order. Reads EVERY logged mistake, tagged or not:
 * the runner-up and "felt sure" patterns need no tag. Letters are ORIGINAL
 * letters (patternsOf compares them to the "Final two" tip directly).
 */
export function topSlips(mistakes: SlipInput[], n = 3): (keyof typeof EVE_REMINDER)[] {
  const counts = new Map<SlipPattern, number>();
  for (const m of mistakes) for (const p of patternsOf(m)) counts.set(p, (counts.get(p) ?? 0) + 1);
  return PATTERN_ORDER.filter((p): p is keyof typeof EVE_REMINDER => p !== 'knowledge' && (counts.get(p) ?? 0) > 0)
    .map((p, i) => ({ p, i, n: counts.get(p) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, n)
    .map((x) => x.p);
}

/** The reminder lines for the eve card, and whether they are the learner's own. */
export function eveReminders(mistakes: SlipInput[]): { own: boolean; lines: string[] } {
  const top = topSlips(mistakes, 3);
  const own = top.length > 0;
  return { own, lines: (own ? top : EVE_DEFAULTS).map((p) => EVE_REMINDER[p]) };
}
