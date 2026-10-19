/**
 * The exam-week checklist (mobile 1.16, PHASE5.md §3.2): six practical
 * items for the last week, so nothing on the day is a surprise.
 *
 * - A card on Today from 7 to 2 days before the exam (the eve and the day
 *   have their own calm card). The learner can hide it; the checklist stays
 *   one tap away in the readiness report.
 * - Ticks belong to ONE exam date (`for`), and only one list is kept. Moving
 *   the date shows a fresh list; the old ticks stay saved (and come back if
 *   the date moves back) only until the first tick under the new date
 *   replaces them (code review M6b).
 * - Never a notification, never a red or "overdue" state.
 * - Generic, true wording: "the official candidate guide", never a claim
 *   about what any exam body says, and no links that imply affiliation.
 *
 * Final review week (exam guide work, Oct 2026): when the certification has
 * a final-week plan (content/exam), the same saved record also keeps which
 * of its seven days the learner marked done (`days`, beside `done`), for
 * the same exam date, and Today's card shows from 8 days out to the eve
 * (FINAL_WEEK_WINDOW) instead of 7 to 2. A cert without a plan keeps the
 * checklist exactly as before.
 *
 * Pure TypeScript: no React, no storage.
 */
import { examPaceSeconds, SOFT_CUE_MS, type ExamFacts } from './pace';

export type ExamWeekItem = 'booking' | 'guide' | 'online' | 'centre' | 'pace' | 'sleep';
export const EXAM_WEEK_ITEMS: readonly ExamWeekItem[] = ['booking', 'guide', 'online', 'centre', 'pace', 'sleep'];

/** Saved per certification (CertMoments.examWeek), optional: older saves have none. */
export interface ExamWeekSaved {
  /** The exam date these ticks belong to (YYYY-MM-DD). */
  for: string;
  done: ExamWeekItem[];
  /** The Today card was hidden for this exam date. */
  hidden?: boolean;
  /**
   * Final review week: the day cards marked done ("day-7" … "day-1"), for this
   * exam date. Optional: saves from before it have none (nothing marked).
   */
  days?: string[];
}

/** The card shows from this many days before the exam… */
export const EXAM_WEEK_FROM = 7;
/** …to this many (the eve and the day have their own card). */
export const EXAM_WEEK_TO = 2;

/** One line per item. The pace comes from the exam's own facts (CISA: 96 seconds). */
export function examWeekText(id: ExamWeekItem, exam: ExamFacts): string {
  switch (id) {
    case 'booking':
      return 'Confirm your exam date, time and place, or your online-exam setup.';
    case 'guide':
      return 'Read the official candidate guide for ID and test-day rules.';
    case 'online':
      return 'Taking it online? Run the system check, and plan a clear desk and a quiet room.';
    case 'centre':
      return 'At a test centre? Plan your route and aim to arrive early.';
    case 'pace':
      return `Know your pace: about ${Math.round(examPaceSeconds(exam))} seconds a question. Past ${SOFT_CUE_MS / 60_000} minutes, flag it and move on.`;
    case 'sleep':
      return 'Plan a normal night’s sleep before the exam.';
  }
}

/** Known ids only, once each, in the checklist's order (a tampered or future id is dropped). */
export function cleanDone(ids: readonly unknown[]): ExamWeekItem[] {
  const set = new Set(ids);
  return EXAM_WEEK_ITEMS.filter((id) => set.has(id));
}

/** The checklist for this exam date: fresh when the saved ticks belong to another date (or there is none). */
export function examWeekOf(saved: ExamWeekSaved | undefined, examDate: string | undefined): { done: ExamWeekItem[]; hidden: boolean } {
  if (!saved || !examDate || saved.for !== examDate) return { done: [], hidden: false };
  return { done: cleanDone(saved.done), hidden: saved.hidden === true };
}

/** Tick or untick one item for this exam date (a list from another date starts fresh). */
export function toggleExamWeek(saved: ExamWeekSaved | undefined, examDate: string, id: ExamWeekItem): ExamWeekSaved {
  const cur = examWeekOf(saved, examDate);
  const done = cur.done.includes(id) ? cur.done.filter((x) => x !== id) : cleanDone([...cur.done, id]);
  // The final week's days marked done (for this date) stay beside the ticks.
  const days = weekDaysOf(saved, examDate);
  return { for: examDate, done, ...(cur.hidden ? { hidden: true } : {}), ...(days.length ? { days } : {}) };
}

/** Hide the Today card for this exam date (the ticks stay). */
export function hideExamWeek(saved: ExamWeekSaved | undefined, examDate: string): ExamWeekSaved {
  const days = weekDaysOf(saved, examDate);
  return { for: examDate, done: examWeekOf(saved, examDate).done, hidden: true, ...(days.length ? { days } : {}) };
}

/** When Today's card shows, in days before the exam (inclusive). */
export interface CardWindow {
  from: number;
  to: number;
}
/** The checklist alone: 7 to 2 days out (the eve and the day have their own card). */
export const CHECKLIST_WINDOW: CardWindow = { from: EXAM_WEEK_FROM, to: EXAM_WEEK_TO };
/**
 * With a final review week: from 8 days out (the day before it starts, so
 * day 7's full mock can be planned) to the eve, which has a day card of its own.
 */
export const FINAL_WEEK_WINDOW: CardWindow = { from: 8, to: 1 };

/** True inside the window (7 to 2 days out by default), unless hidden for this date. No date: never. */
export function examWeekCardDue(
  daysLeft: number | null,
  saved: ExamWeekSaved | undefined,
  examDate: string | undefined,
  window: CardWindow = CHECKLIST_WINDOW,
): boolean {
  if (daysLeft === null || !examDate) return false;
  if (daysLeft > window.from || daysLeft < window.to) return false;
  return !examWeekOf(saved, examDate).hidden;
}

// ── Final review week: the day cards marked done ─────────────────────────

/** A day card's id: "day-1" … "day-7" (the schema's seven days). */
const DAY_ID = /^day-[1-7]$/;

/**
 * Known day ids only, once each, counting down ("day-7" first). A tampered
 * or future id is dropped, so a junk list can't grow the save.
 */
export function cleanDays(ids: readonly unknown[]): string[] {
  const set = new Set(ids.filter((x): x is string => typeof x === 'string' && DAY_ID.test(x)));
  return [...set].sort((a, b) => Number(b.slice(4)) - Number(a.slice(4)));
}

/** The days marked done for this exam date (none when the saved record is for another date). */
export function weekDaysOf(saved: ExamWeekSaved | undefined, examDate: string | undefined): string[] {
  if (!saved || !examDate || saved.for !== examDate) return [];
  return cleanDays(saved.days ?? []);
}

/**
 * Mark a day done, or not done, for this exam date. The checklist ticks and
 * Hide for this date stay; a record from another date starts fresh.
 */
export function toggleWeekDay(saved: ExamWeekSaved | undefined, examDate: string, dayId: string): ExamWeekSaved {
  const cur = examWeekOf(saved, examDate);
  const was = weekDaysOf(saved, examDate);
  const days = was.includes(dayId) ? was.filter((x) => x !== dayId) : cleanDays([...was, dayId]);
  return { for: examDate, done: cur.done, ...(cur.hidden ? { hidden: true } : {}), ...(days.length ? { days } : {}) };
}

/** "2 of 7 days done" (the final week's meta). Never a count of what is left. */
export const weekDaysCount = (done: number, total: number) => `${done} of ${total} ${total === 1 ? 'day' : 'days'} done`;

/**
 * The two "where you take it" items are one choice: a learner ticks the one
 * that fits (UX review P4). So the count has five slots, not six.
 */
export const EXAM_WEEK_EITHER: readonly ExamWeekItem[] = ['online', 'centre'];
export const EXAM_WEEK_SLOTS = EXAM_WEEK_ITEMS.length - EXAM_WEEK_EITHER.length + 1;

/** Slots done: online and centre count once between them. */
export function examWeekDoneSlots(done: readonly ExamWeekItem[]): number {
  const known = cleanDone(done);
  const either = known.some((id) => EXAM_WEEK_EITHER.includes(id));
  return known.filter((id) => !EXAM_WEEK_EITHER.includes(id)).length + (either ? 1 : 0);
}

/** "2 of 5 done" (the card's meta). Never a count of what is left. */
export const examWeekCount = (done: readonly ExamWeekItem[]) => `${examWeekDoneSlots(done)} of ${EXAM_WEEK_SLOTS} done`;
