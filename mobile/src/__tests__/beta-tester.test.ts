/**
 * Mobile 1.41: the opt-in Tester question (engine/betaTester.ts).
 * - off unless the switch is on; test days count from the day it was turned on;
 * - one question on days 1–2, 3, 5, 7, 9, 12 and 14, nothing on other days or after day 14;
 * - "What got in the way?" after 3 or more whole days with no study, once per absence;
 * - "Not today" hides it until tomorrow; an answered question never comes back;
 * - the week check-ins show the study-day count on screen, and the email never carries it;
 * - the email has the subject tag and the question, and nothing personal.
 */
import {
  AWAY_QUESTION,
  daysAway,
  LAST_QUESTION_LINE,
  markAnswered,
  questionForDay,
  skipToday,
  studiedOfLast7,
  switchTester,
  TESTER_QUESTIONS,
  testerCard,
  testerDay,
  testerEmail,
  testerSubject,
  weekLine,
  type TesterState,
} from '../engine/betaTester';
import { daysBeforeKey, dayKey, type Streak } from '../engine/streak';

const at = (d: number, h = 9) => new Date(2026, 9, d, h, 0, 0).getTime();
const key = (d: number) => dayKey(at(d));
/** A streak with study on these October days. */
const studied = (...days: number[]): Streak => {
  const recentDays = days.map(key);
  return { current: 1, best: 1, lastDay: recentDays[recentDays.length - 1] ?? null, recentDays };
};
const ON: TesterState = { since: key(1) };
const card = (state: TesterState | undefined, day: number, streak: Streak = studied(day - 1, day)) => testerCard(state, streak, at(day), key(day));
const APP = { version: '1.41.0', os: 'Android 16' };

describe('the switch', () => {
  it('is off by default: no state, no card', () => {
    expect(testerDay(undefined, key(3))).toBeNull();
    expect(testerCard(undefined, studied(3), at(3), key(3))).toBeNull();
    expect(testerCard({}, studied(3), at(3), key(3))).toBeNull();
  });

  it('on starts the test today (day 1); off forgets everything', () => {
    expect(switchTester(true, key(5))).toEqual({ since: key(5) });
    expect(testerDay(switchTester(true, key(5)), key(5))).toBe(1);
    expect(switchTester(false, key(5))).toEqual({});
  });

  it('counts calendar days, month ends included', () => {
    expect(testerDay({ since: '2026-10-30' }, '2026-11-02')).toBe(4);
    expect(testerDay({ since: '2026-10-30' }, '2026-10-29')).toBeNull();
    expect(testerDay({ since: 'not a day' }, '2026-10-29')).toBeNull();
  });
});

describe('the schedule: days 1–2, 3, 5, 7, 9, 12, 14', () => {
  it('maps each test day to its question, and other days to none', () => {
    const map = Array.from({ length: 16 }, (_, i) => questionForDay(i + 1)?.id ?? null);
    expect(map).toEqual(['expect', 'expect', 'size', null, 'doubt', null, 'week1', null, 'skip', null, null, 'change', null, 'week2', null, null]);
  });

  it('shows the day’s question, and nothing after day 14', () => {
    expect(card(ON, 1, studied(1))?.id).toBe('expect');
    expect(card(ON, 3)?.body).toMatch(/too long, about right, or too short/);
    expect(card(ON, 4)).toBeNull();
    expect(card(ON, 9)?.id).toBe('skip');
    expect(card(ON, 15)).toBeNull();
    expect(card(ON, 30)).toBeNull();
  });

  it('a question answered on day 1 does not come back on day 2', () => {
    const answered = markAnswered(ON, 'expect');
    expect(card(answered, 2)).toBeNull();
    expect(card(ON, 2)?.id).toBe('expect');
    // Marking twice changes nothing.
    expect(markAnswered(answered, 'expect')).toBe(answered);
  });

  it('"Not today" hides it until tomorrow, and a skipped day is gone (nothing piles up)', () => {
    const skipped = skipToday(ON, key(3));
    expect(card(skipped, 3)).toBeNull();
    // Day 4 has no question of its own: day 3's is not carried over.
    expect(card(skipped, 4)).toBeNull();
    expect(card(skipped, 5)?.id).toBe('doubt');
  });

  it('never says "Day N of 14" and never counts down', () => {
    for (const q of TESTER_QUESTIONS) {
      expect(`${q.caption} ${q.body}`).not.toMatch(/day \d+ of|\bof 14\b|days? left|countdown/i);
    }
  });
});

describe('the week check-ins (day 7 and day 14)', () => {
  it('show how many of the last 7 days had study, from the streak the phone keeps', () => {
    const c = card(ON, 7, studied(1, 2, 4, 6, 7));
    expect(c?.caption).toBe('Week 1 check-in');
    expect(c?.studiedOfLast7).toBe(5);
    expect(weekLine(5)).toBe('You studied on 5 of the last 7 days.');
    expect(studiedOfLast7(studied(1, 2, 4, 6, 7), at(7))).toBe(5);
  });

  it('day 14 closes with a thank-you line, no celebration words', () => {
    const c = card(ON, 14, studied(13, 14));
    expect(c?.caption).toBe('Week 2 check-in');
    expect(c?.closing).toBe(LAST_QUESTION_LINE);
    expect(LAST_QUESTION_LINE).not.toMatch(/!/);
  });

  it('other days carry no count', () => {
    expect(card(ON, 3)?.studiedOfLast7).toBeUndefined();
  });
});

describe('after 3 or more days away', () => {
  it('counts whole days with no study before today', () => {
    expect(daysAway(studied(1, 2), key(1), key(3)).days).toBe(0);
    expect(daysAway(studied(1), key(1), key(5)).days).toBe(3);
    // Studied today: the absence before today still counts (they just came back).
    expect(daysAway(studied(1, 5), key(1), key(5)).days).toBe(3);
    // Days before the switch was turned on don't count.
    expect(daysAway(studied(), key(4), key(5)).days).toBe(0);
  });

  it('asks "What got in the way?" instead of the day’s question, once per absence', () => {
    const c = card(ON, 5, studied(1, 5));
    expect(c?.away).toBe(true);
    expect(c?.body).toBe(AWAY_QUESTION);
    expect(c?.id).toBe(`away:${key(1)}`);
    // Answered: nothing else that day (one question a day, review 1.41 C5), and the same absence is
    // never asked again; the schedule comes back after the next study day.
    const after = markAnswered(ON, c!.id);
    expect(card(after, 5, studied(1, 5))).toBeNull();
    expect(card(after, 6, studied(1, 5))).toBeNull();
    expect(card(after, 7, studied(1, 5, 6, 7))?.id).toBe('week1');
  });

  it('has no "we missed you", no plant, no count of missed days', () => {
    expect(AWAY_QUESTION).not.toMatch(/miss(ed)? you|plant|streak|\d/i);
  });

  it('2 days away is not an absence yet', () => {
    expect(card(ON, 5, studied(1, 2))?.id).toBe('doubt');
  });
});

describe('the email', () => {
  it('has the subject tag and the question, and leaves the choice to send with the learner', () => {
    const c = card(ON, 3)!;
    const e = testerEmail(c, APP);
    expect(e.subject).toBe('[KaiSip beta D3]');
    expect(e.body).toContain(`Tester question: ${c.body}`);
    expect(e.body).toContain('App: KaiSip 1.41.0 (Android 16)');
  });

  it('tags the absence question so replies can be counted apart', () => {
    expect(testerSubject({ day: 5, away: true })).toBe('[KaiSip beta D5 away]');
  });

  it('never carries the study-day count, a streak or progress', () => {
    const c = card(ON, 7, studied(1, 2, 3, 4, 5, 6, 7))!;
    const e = testerEmail(c, APP);
    expect(c.studiedOfLast7).toBe(7);
    expect(e.body).not.toMatch(/studied|of the last 7|streak|score|readiness|exam date/i);
  });
});

it('the week strip helper agrees with the streak days (DST-safe keys)', () => {
  expect(daysBeforeKey(at(7), 6)).toBe(key(1));
});
