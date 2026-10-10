/**
 * Reminder rules (engine/reminders.ts): days and time, at most one study
 * notification a day, one id per reminder, calm copy, and old saves.
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
  reminderPlan,
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
    expect(reminderPlan(old)).toEqual([{ id: DAILY_ID, kind: 'daily', hour: 8, minute: 30 }]);
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

describe('what gets scheduled', () => {
  it('at most one study notification a day, each with its own id', () => {
    for (let mask = 1; mask < 128; mask++) {
      const days = ALL_DAYS.filter((d) => mask & (1 << d));
      const plan = reminderPlan({ enabled: true, hour: 19, minute: 0, days });
      const ids = plan.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(REMINDER_IDS).toContain(id);
      if (days.length === 7) expect(plan).toHaveLength(1);
      else {
        // One weekly reminder per chosen day, no day twice.
        const weekdays = plan.map((p) => (p.kind === 'weekly' ? p.weekday : -1));
        expect(weekdays.sort()).toEqual(days.map((d) => d + 1).sort());
      }
    }
  });

  it('schedules nothing when off', () => {
    expect(reminderPlan({ ...DEFAULT_REMINDER, enabled: false })).toEqual([]);
  });

  it('maps JavaScript weekdays (0 = Sunday) to Expo weekdays (1 = Sunday)', () => {
    expect(reminderPlan({ enabled: true, hour: 9, minute: 0, days: [0] })).toEqual([{ id: weeklyId(0), kind: 'weekly', weekday: 1, hour: 9, minute: 0 }]);
  });

  it('recognises our reminders, including the first version’s untagged one', () => {
    expect(isStudyReminder({ identifier: DAILY_ID })).toBe(true);
    expect(isStudyReminder({ identifier: 'x', content: { title: LEGACY_TITLE } })).toBe(true);
    expect(isStudyReminder({ identifier: 'x', content: { title: 'Other app thing' } })).toBe(false);
  });

  it('copy names one small action and its time, with no guilt or promises', () => {
    const { title, body } = reminderCopy('CISA');
    expect(body).toBe('10 CISA questions, about 12 minutes. Pick up where you left off.');
    expect(`${title} ${body}`).not.toMatch(/streak|alive|got this|don.t|lose|behind|pass|!/i);
  });
});
