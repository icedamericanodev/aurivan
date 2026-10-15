/**
 * Study reminders: the pure rules (no notifications library here).
 * lib/reminders.ts turns this plan into scheduled local notifications.
 *
 * Plain English:
 * - The learner picks a time and the days (default: every day at 19:00).
 * - Mobile 1.24: no endless daily repeat. We schedule only the NEXT 7 reminders,
 *   each a one-off notification, and the app re-plans them every time it
 *   opens. A learner who stays away for a week gets 7 reminders and then
 *   silence, so the channel is never muted out of annoyance (and the OS-level
 *   mute, which is permanent, is never earned).
 * - If today's plan is already cleared, today's reminder is skipped.
 * - Every reminder has its own fixed id, so we can replace or cancel OUR
 *   reminders without touching anything else (no "cancel everything").
 * - Calm copy: the plan is ready, and how long it takes. No streak pressure,
 *   no guilt, no promise about passing.
 */

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

/** "19:00": fixed 24-hour time (stable ids, logs and tests; not shown to learners). */
export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * The time in the phone's own format: "7:00 PM" in the US, "19:00" in
 * most of Europe. This is what Settings shows and speaks. `locale` is only
 * for tests; the app passes nothing (the device locale).
 */
export function localTime(hour: number, minute: number, locale?: string): string {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

/** Just the hour in the phone's format: "7 PM" or "19" (the hour stepper's value). */
export function localHour(hour: number, locale?: string): string {
  return new Date(2000, 0, 1, hour, 0).toLocaleTimeString(locale, { hour: 'numeric' });
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

/** One line for Settings: "Every day at 7:00 PM" (in the phone's time format). */
export function reminderSummary(r: ReminderPrefs, locale?: string): string {
  return `${daysSummary(r.days)} at ${localTime(r.hour, r.minute, locale)}`;
}

// ── What to schedule ─────────────────────────────────────────────────────
/** Before mobile 1.24 the app scheduled one repeating daily trigger; kept so it is still found and replaced. */
export const DAILY_ID = 'aurivan.study.daily';
/** Before mobile 1.24: one repeating weekly trigger per chosen weekday. Kept for the same reason. */
export const weeklyId = (day: Weekday) => `aurivan.study.w${day + 1}`;
/** How many one-off reminders are scheduled ahead (a week), refreshed on every app open. */
export const ROLLING_COUNT = 7;
/** One id per rolling slot (1 = the next reminder, 7 = the last). */
export const rollingId = (n: number) => `aurivan.study.r${n}`;
/** Every id this app ever uses for study reminders (old repeating ones too, so an upgrade replaces them). */
export const REMINDER_IDS: string[] = [
  DAILY_ID,
  ...ALL_DAYS.map(weeklyId),
  ...Array.from({ length: ROLLING_COUNT }, (_, i) => rollingId(i + 1)),
];
/** The title the first reminder used (scheduled without an id). Recognised so it can be replaced. */
export const LEGACY_TITLE = 'Time for a quick session';

/** One reminder to schedule: its id and the moment (epoch ms) it should appear. */
export interface ReminderRequest {
  id: string;
  at: number;
}

/**
 * The next reminders, at most ROLLING_COUNT: one per chosen day, at the chosen
 * time, counting from now. A time that has already passed today starts
 * tomorrow. `skipToday`: today's plan is cleared, so no reminder today.
 * Disabled = none. Local time, DST-safe (each day is built from its calendar date).
 */
export function rollingPlan(r: ReminderPrefs, now: number, opts: { skipToday?: boolean } = {}): ReminderRequest[] {
  if (!r.enabled) return [];
  const days = reminderDays(r.days);
  const start = new Date(now);
  const out: ReminderRequest[] = [];
  // 8 calendar days reach every chosen weekday at least once (even one weekday a week); every day chosen fills all 7 slots.
  for (let offset = 0; offset < ROLLING_COUNT + 1 && out.length < ROLLING_COUNT; offset += 1) {
    const at = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset, r.hour, r.minute, 0, 0);
    if (!days.includes(at.getDay() as Weekday)) continue;
    if (at.getTime() <= now) continue;
    if (offset === 0 && opts.skipToday) continue;
    out.push({ id: rollingId(out.length + 1), at: at.getTime() });
  }
  return out;
}

/** True for a scheduled notification that is one of our study reminders (new ids, old repeating ids, or the old untagged one). */
export function isStudyReminder(req: { identifier: string; content?: { title?: string | null } }): boolean {
  return REMINDER_IDS.includes(req.identifier) || req.content?.title === LEGACY_TITLE;
}

/**
 * The reminder's words: the plan is ready, and how long it takes. No streak,
 * no guilt, no pass promise. `minutes` is the learner's daily minutes; when it
 * is not known the title just says the plan is ready.
 */
export function reminderCopy(certName: string, minutes?: number): { title: string; body: string } {
  return {
    title: minutes && minutes > 0 ? `Your ${minutes}-minute plan is ready` : 'Your study plan is ready',
    body: `${certName}: a short session whenever you have a moment.`,
  };
}
