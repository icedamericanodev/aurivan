/**
 * Reminder rules (engine/reminders.ts): days and time, the NEXT 7 one-off
 * reminders (mobile 1.24: no endless repeat, they stop on their own after a
 * week away), at most one study notification a day, one id per reminder,
 * calm copy, and old saves.
 */
import {
  ALL_DAYS,
  DAILY_ID,
  daysSummary,
  DEFAULT_REMINDER,
  formatTime,
  localHour,
  localTime,
  isStudyReminder,
  LEGACY_TITLE,
  REMINDER_IDS,
  reminderCopy,
  reminderDays,
  ROLLING_COUNT,
  rollingId,
  rollingPlan,
  reminderSummary,
  stepTime,
  toggleDay,
  weeklyId,
} from '../engine/reminders';

describe('reminder days and time', () => {
  it('defaults to every day at 19:00, off', () => {
    expect(DEFAULT_REMINDER).toEqual({ enabled: false, hour: 19, minute: 0, days: ALL_DAYS });
    expect(reminderSummary(DEFAULT_REMINDER, 'en-US')).toBe('Every day at 7:00 PM');
    expect(reminderSummary(DEFAULT_REMINDER, 'en-GB')).toBe('Every day at 19:00');
  });

  it('an old save without days means every day', () => {
    const old = { enabled: true, hour: 8, minute: 30 };
    expect(reminderDays(undefined)).toEqual(ALL_DAYS);
    expect(reminderSummary(old, 'en-US')).toBe('Every day at 8:30 AM');
    // Every day: seven reminders, one a day, all at 8:30.
    const plan = rollingPlan(old, at(2026, 9, 15, 7, 0));
    expect(plan).toHaveLength(7);
    expect(plan.every((r) => new Date(r.at).getHours() === 8 && new Date(r.at).getMinutes() === 30)).toBe(true);
  });

  it('cleans bad day lists and never ends up with no days', () => {
    expect(reminderDays([3, 3, 9, -1, 1])).toEqual([1, 3]);
    expect(reminderDays([])).toEqual(ALL_DAYS);
    expect(toggleDay([2], 2)).toEqual([2]); // the last day can't be turned off
    expect(toggleDay(undefined, 0)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(toggleDay([1], 5)).toEqual([1, 5]);
  });

  it('names common day sets in words', () => {
    expect(daysSummary([1, 2, 3, 4, 5])).toBe('Weekdays');
    expect(daysSummary([0, 6])).toBe('Weekends');
    expect(daysSummary([5, 1, 3])).toBe('Mon, Wed, Fri');
    expect(daysSummary([0, 1])).toBe('Mon, Sun');
  });

  it('steps the time and wraps around midnight', () => {
    expect(stepTime(19, 0, 60)).toEqual({ hour: 20, minute: 0 });
    expect(stepTime(23, 45, 15)).toEqual({ hour: 0, minute: 0 });
    expect(stepTime(0, 0, -15)).toEqual({ hour: 23, minute: 45 });
    expect(formatTime(7, 5)).toBe('07:05');
    expect(localTime(19, 0, 'en-US')).toBe('7:00 PM');
    expect(localHour(19, 'en-US')).toBe('7 PM');
    expect(localHour(19, 'en-GB')).toBe('19');
  });
});

/** A local date and time as epoch ms (the tests do not depend on the machine's time zone). */
const at = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m, d, h, mi).getTime();
/** Thursday 15 October 2026, 14:00 local time. */
const NOW = at(2026, 9, 15, 14, 0);
const dayOf = (ms: number) => new Date(ms).getDate();

describe('what gets scheduled: the next 7, one-off', () => {
  it('every day: seven reminders, one per day, starting today when the time is still ahead', () => {
    const plan = rollingPlan({ enabled: true, hour: 19, minute: 0 }, NOW);
    expect(plan).toHaveLength(ROLLING_COUNT);
    expect(plan.map((r) => dayOf(r.at))).toEqual([15, 16, 17, 18, 19, 20, 21]);
    expect(plan.map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6, 7].map(rollingId));
    expect(plan[0].at).toBe(at(2026, 9, 15, 19, 0));
  });

  it('a time that has already passed today starts tomorrow', () => {
    const plan = rollingPlan({ enabled: true, hour: 8, minute: 30 }, NOW);
    expect(plan.map((r) => dayOf(r.at))).toEqual([16, 17, 18, 19, 20, 21, 22]);
  });

  it('today’s plan is cleared: today’s reminder is skipped, and the week still has seven', () => {
    const plan = rollingPlan({ enabled: true, hour: 19, minute: 0 }, NOW, { skipToday: true });
    expect(plan.map((r) => dayOf(r.at))).toEqual([16, 17, 18, 19, 20, 21, 22]);
  });

  it('chosen days only (Mon, Wed, Fri): never more than one on a day, none after eight days', () => {
    const plan = rollingPlan({ enabled: true, hour: 19, minute: 0, days: [1, 3, 5] }, NOW);
    // From Thursday 15: Fri 16, Mon 19, Wed 21 (the eighth calendar day is Thu 22, not chosen).
    expect(plan.map((r) => dayOf(r.at))).toEqual([16, 19, 21]);
    expect(plan.map((r) => new Date(r.at).getDay())).toEqual([5, 1, 3]);
  });

  it('one weekday still gets its next reminder (eight calendar days reach every weekday)', () => {
    const thursdayEvening = at(2026, 9, 15, 20, 0);
    const plan = rollingPlan({ enabled: true, hour: 19, minute: 0, days: [4] }, thursdayEvening);
    // Today’s Thursday slot has passed; next Thursday is the eighth day and is still planned.
    expect(plan.map((r) => dayOf(r.at))).toEqual([22]);
  });

  it('they stop on their own: nothing is planned past the eighth day', () => {
    const plan = rollingPlan({ enabled: true, hour: 19, minute: 0 }, NOW);
    const last = plan[plan.length - 1].at;
    expect(last).toBeLessThan(at(2026, 9, 24, 0, 0));
  });

  it('every id is one of ours, none repeats, and seven or fewer are scheduled for any choice of days', () => {
    for (let mask = 1; mask < 128; mask++) {
      const days = ALL_DAYS.filter((d) => mask & (1 << d));
      const plan = rollingPlan({ enabled: true, hour: 19, minute: 0, days }, NOW);
      const ids = plan.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.length).toBeLessThanOrEqual(ROLLING_COUNT);
      for (const id of ids) expect(REMINDER_IDS).toContain(id);
      // At most one a day, and only on the chosen weekdays.
      const dates = plan.map((p) => new Date(p.at).toDateString());
      expect(new Set(dates).size).toBe(dates.length);
      for (const p of plan) expect(days).toContain(new Date(p.at).getDay());
    }
  });

  it('schedules nothing when off', () => {
    expect(rollingPlan({ ...DEFAULT_REMINDER, enabled: false }, NOW)).toEqual([]);
  });

  it('recognises our reminders: the new ones, the old repeating ones, and the first version’s untagged one', () => {
    expect(isStudyReminder({ identifier: rollingId(3) })).toBe(true);
    expect(isStudyReminder({ identifier: DAILY_ID })).toBe(true);
    expect(isStudyReminder({ identifier: weeklyId(2) })).toBe(true);
    expect(isStudyReminder({ identifier: 'x', content: { title: LEGACY_TITLE } })).toBe(true);
    expect(isStudyReminder({ identifier: 'x', content: { title: 'Other app thing' } })).toBe(false);
  });

  it('copy says the plan is ready and how long it is, with no guilt or promises', () => {
    const { title, body } = reminderCopy('CISA', 15);
    expect(title).toBe('Your 15-minute plan is ready');
    expect(body).toContain('CISA');
    expect(`${title} ${body}`).not.toMatch(/streak|alive|got this|don.t|lose|behind|pass|!/i);
    // Without minutes it still reads fine.
    expect(reminderCopy('CISA').title).toBe('Your study plan is ready');
  });
});
