/**
 * Study reminders: the pure rules (no notifications library here).
 * lib/reminders.ts turns this plan into scheduled local notifications.
 *
 * Plain English:
 * - The learner picks a time and the days (default: every day at 19:00).
 * - At most ONE study notification a day: one daily trigger when every
 *   day is chosen, otherwise one weekly trigger per chosen weekday.
 * - Every reminder has its own fixed id, so we can replace or cancel OUR
 *   reminders without touching anything else (no "cancel everything").
 * - Calm copy: one small action and its time cost. No streak pressure,
 *   no guilt, no promise about passing.
 */
import { MINUTES_PER_QUESTION } from './pace';

/** 0 = Sunday … 6 = Saturday (JavaScript's Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
/** Chip order on screen: Monday first. */
export const DAY_CHIPS: { day: Weekday; short: string; long: string }[] = [
  { day: 1, short: 'Mon', long: 'Monday' },
  { day: 2, short: 'Tue', long: 'Tuesday' },
  { day: 3, short: 'Wed', long: 'Wednesday' },
  { day: 4, short: 'Thu', long: 'Thursday' },
  { day: 5, short: 'Fri', long: 'Friday' },
  { day: 6, short: 'Sat', long: 'Saturday' },
  { day: 0, short: 'Sun', long: 'Sunday' },
];

export interface ReminderPrefs {
  enabled: boolean;
  hour: number;
  minute: number;
  /** Chosen weekdays. Optional: saves from before day chips have none (= every day). */
  days?: number[];
}

export const DEFAULT_REMINDER: Required<ReminderPrefs> = { enabled: false, hour: 19, minute: 0, days: [...ALL_DAYS] };

/** The chosen days, cleaned: valid, unique, sorted; missing or empty = every day. */
export function reminderDays(days: readonly number[] | undefined): Weekday[] {
  const ok = [...new Set((days ?? []).filter((d): d is Weekday => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  return ok.length ? ok : [...ALL_DAYS];
}

/** Turn one day on or off. The last chosen day can't be turned off (use the switch to stop reminders). */
export function toggleDay(days: readonly number[] | undefined, day: Weekday): Weekday[] {
  const cur = reminderDays(days);
  if (!cur.includes(day)) return reminderDays([...cur, day]);
  return cur.length === 1 ? cur : cur.filter((d) => d !== day);
}

/** "19:00": 24-hour time, as the reminder has always shown it. */
export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Move a time by whole hours or minutes, wrapping around midnight. */
export function stepTime(hour: number, minute: number, deltaMinutes: number): { hour: number; minute: number } {
  const total = (((hour * 60 + minute + deltaMinutes) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** Minute steps for the time picker. */
export const MINUTE_STEP = 15;

/** "Every day", "Weekdays", "Weekends" or "Mon, Wed, Fri". */
export function daysSummary(days: readonly number[] | undefined): string {
  const d = reminderDays(days);
  if (d.length === 7) return 'Every day';
  const key = d.join(',');
  if (key === '1,2,3,4,5') return 'Weekdays';
  if (key === '0,6') return 'Weekends';
  return DAY_CHIPS.filter((c) => d.includes(c.day)).map((c) => c.short).join(', ');
}

/** One line for Settings: "Every day at 19:00". */
export function reminderSummary(r: ReminderPrefs): string {
  return `${daysSummary(r.days)} at ${formatTime(r.hour, r.minute)}`;
}

// ── What to schedule ─────────────────────────────────────────────────────
export const DAILY_ID = 'aurivan.study.daily';
/** One id per weekday (Expo numbers weekdays 1 = Sunday … 7 = Saturday). */
export const weeklyId = (day: Weekday) => `aurivan.study.w${day + 1}`;
/** Every id this app ever uses for study reminders. */
export const REMINDER_IDS: string[] = [DAILY_ID, ...ALL_DAYS.map(weeklyId)];
/** The title the first reminder used (scheduled without an id). Recognised so it can be replaced. */
export const LEGACY_TITLE = 'Time for a quick session';

export type ReminderRequest =
  | { id: string; kind: 'daily'; hour: number; minute: number }
  | { id: string; kind: 'weekly'; weekday: number; hour: number; minute: number };

/** The notifications to schedule: at most one per day, each with its own id. */
export function reminderPlan(r: ReminderPrefs): ReminderRequest[] {
  if (!r.enabled) return [];
  const days = reminderDays(r.days);
  if (days.length === 7) return [{ id: DAILY_ID, kind: 'daily', hour: r.hour, minute: r.minute }];
  return days.map((d) => ({ id: weeklyId(d), kind: 'weekly', weekday: d + 1, hour: r.hour, minute: r.minute }));
}

/** True for a scheduled notification that is one of our study reminders (new ids, or the old untagged one). */
export function isStudyReminder(req: { identifier: string; content?: { title?: string | null } }): boolean {
  return REMINDER_IDS.includes(req.identifier) || req.content?.title === LEGACY_TITLE;
}

/** The reminder's words: one small action and its time cost. No streak, no guilt, no pass promise. */
export function reminderCopy(certName: string, questions = 10): { title: string; body: string } {
  const minutes = Math.round(questions * MINUTES_PER_QUESTION);
  return {
    title: 'A short study session?',
    body: `${questions} ${certName} questions, about ${minutes} minutes. Pick up where you left off.`,
  };
}
