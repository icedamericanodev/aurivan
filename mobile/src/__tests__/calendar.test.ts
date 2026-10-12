/**
 * The exam-date calendar's date maths (engine/calendar.ts): calendar days and
 * months only, Monday-first weeks, today to two years ahead.
 */
import {
  addMonths,
  calendarBounds,
  compareMonths,
  daysInMonth,
  inBounds,
  keyOf,
  monthGrid,
  monthLabel,
  monthOf,
  openingMonth,
  shortDayLabel,
  spokenDate,
  untilLabel,
  weekdayIndex,
} from '../engine/calendar';

// 12 Oct 2026, mid-afternoon local time.
const NOW = new Date(2026, 9, 12, 15, 30).getTime();

describe('calendar maths', () => {
  it('builds Monday-first weeks with blanks before the 1st and after the last day', () => {
    // 1 Jan 2027 is a Friday: four blanks (Mon–Thu) before it.
    const weeks = monthGrid({ year: 2027, month: 0 });
    expect(weeks[0]).toEqual([null, null, null, null, '2027-01-01', '2027-01-02', '2027-01-03']);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    const days = weeks.flat().filter(Boolean);
    expect(days).toHaveLength(31);
    expect(days[30]).toBe('2027-01-31');
    // February 2027 starts on a Monday and has 28 days: exactly 4 weeks.
    expect(monthGrid({ year: 2027, month: 1 })).toHaveLength(4);
    // A month that needs 6 rows (Aug 2027 starts on a Sunday).
    expect(monthGrid({ year: 2027, month: 7 })).toHaveLength(6);
  });

  it('knows leap years and weekdays', () => {
    expect(daysInMonth({ year: 2028, month: 1 })).toBe(29);
    expect(daysInMonth({ year: 2027, month: 1 })).toBe(28);
    expect(weekdayIndex('2027-01-08')).toBe(4); // Friday
    expect(weekdayIndex('2026-10-12')).toBe(0); // Monday
    expect(weekdayIndex('2026-10-18')).toBe(6); // Sunday
  });

  it('steps months across years both ways', () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2027, month: 0 }, -1)).toEqual({ year: 2026, month: 11 });
    expect(addMonths({ year: 2026, month: 9 }, 24)).toEqual({ year: 2028, month: 9 });
    expect(compareMonths({ year: 2026, month: 9 }, { year: 2027, month: 0 })).toBe(-1);
    expect(compareMonths({ year: 2027, month: 0 }, monthOf('2027-01-31'))).toBe(0);
  });

  it('speaks a full date and shows a short one', () => {
    expect(spokenDate('2027-01-08')).toBe('Friday 8 January 2027');
    expect(shortDayLabel('2027-01-08')).toBe('Fri 8 Jan 2027');
    expect(monthLabel({ year: 2027, month: 0 })).toBe('January 2027');
    expect(keyOf(2027, 0, 8)).toBe('2027-01-08');
  });

  it('allows today up to two years ahead, never a day before today', () => {
    const b = calendarBounds(NOW);
    expect(b).toEqual({ min: '2026-10-12', max: '2028-10-12' });
    expect(inBounds('2026-10-11', b)).toBe(false);
    expect(inBounds('2026-10-12', b)).toBe(true);
    expect(inBounds('2028-10-12', b)).toBe(true);
    expect(inBounds('2028-10-13', b)).toBe(false);
  });

  it('opens on the chosen month, or this month for no date or a past one', () => {
    expect(openingMonth('2027-03-05', NOW)).toEqual({ year: 2027, month: 2 });
    expect(openingMonth(undefined, NOW)).toEqual({ year: 2026, month: 9 });
    expect(openingMonth('2026-01-05', NOW)).toEqual({ year: 2026, month: 9 });
    expect(openingMonth('2031-01-05', NOW)).toEqual({ year: 2026, month: 9 });
    expect(openingMonth('not a date', NOW)).toEqual({ year: 2026, month: 9 });
  });

  it('says how far away the date is, calmly', () => {
    expect(untilLabel('2026-10-12', '2026-10-12')).toBe('Today');
    expect(untilLabel('2026-10-13', '2026-10-12')).toBe('Tomorrow');
    expect(untilLabel('2027-01-08', '2026-10-12')).toBe('In 88 days');
    expect(untilLabel('2026-10-01', '2026-10-12')).toBeNull();
  });
});
