/**
 * Grove Today (engine/groveToday.ts): the words and marks of Today's hero and its week twig.
 *
 * Plain English for the founder: before the first readiness range the ring counts answers with
 * 40 seed dots that never go backwards; after it, 50 ticks light up to the range's low end, the
 * range is gold, and the caption says "63 to 73 estimated range" with "A study estimate, not a
 * prediction." word for word. Accuracy says "Too few yet" until 30 answers. The twig fills a leaf
 * per study day this week, and shows a streak only from 2 days and never from the 14th study day.
 */
import {
  accuracyTile,
  ESTIMATE_LINE,
  rangeTicks,
  RING_STUDY_BAR,
  RING_TICKS,
  ringCaption,
  ringMode,
  seedDotsOn,
  studyDaysWords,
  twigSpoken,
  twigStreak,
  twigWeek,
  TWIG_STREAK_UNTIL,
} from '../engine/groveToday';
import type { ReadinessRange } from '../engine/readinessRange';

const before = (needed: number, answered = 40 - needed): ReadinessRange => ({ enough: false, answered, needed });
const after = (low: number, high: number): ReadinessRange => ({ enough: true, answered: 120, low, high, centre: (low + high) / 2 });
const DASHES = /[\u2013\u2014]/;

describe('the ring before the first range: seed dots', () => {
  it('one dot per answer that counts, never below 0 or above 40', () => {
    expect(seedDotsOn(before(40))).toBe(0);
    expect(seedDotsOn(before(30))).toBe(10);
    expect(seedDotsOn(before(0))).toBe(40);
    expect(seedDotsOn(before(55))).toBe(0);
    expect(seedDotsOn(after(60, 70))).toBe(40);
  });

  it('dots never go backwards as the countdown runs (needed only falls)', () => {
    const counts = [40, 39, 35, 20, 1].map((n) => seedDotsOn(before(n)));
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  });

  it('the caption carries the count, so the dots are never the only signal', () => {
    const c = ringCaption(before(30), false);
    expect([c.big, c.rest, c.line2]).toEqual(['10', 'of 40 answers', 'until your first readiness range']);
    expect(c.spoken).toBe('10 of 40 answers toward your first readiness range.');
    const zero = ringCaption(before(40), false);
    expect([zero.big, zero.rest, zero.line2]).toEqual([null, 'Answer 40 questions', 'to see your first readiness range']);
    expect(ringMode(before(30), false)).toBe('dots');
  });
});

describe('the ring after the first range: 50 ticks', () => {
  it('lit to the low end, gold inside the range, unlit above it', () => {
    const t = rangeTicks(63, 73);
    expect(t).toHaveLength(RING_TICKS);
    // A tick covers 2 points: ticks 0 to 30 end at or under 62, tick 31 ends at 64 (over the low end of 63).
    expect(t.slice(0, 31).every((x) => x === 'on')).toBe(true);
    expect(t[31]).toBe('range');
    expect(t[36]).toBe('range'); // 72 to 74 starts under 73
    expect(t[37]).toBe('off');
    expect(t.filter((x) => x === 'off')).toHaveLength(13);
  });

  it('the clay mark is the 80 study bar, and the caption is the range written "X to Y"', () => {
    expect(RING_STUDY_BAR).toBe(80);
    const c = ringCaption(after(63, 73), false);
    expect([c.big, c.rest, c.line2]).toEqual(['63 to 73', 'estimated range', 'A study estimate, not a prediction.']);
    expect(ESTIMATE_LINE).toBe('A study estimate, not a prediction.');
    expect(c.spoken).toBe('Estimated readiness range 63 to 73 out of 100. The study bar is 80. A study estimate, not a prediction.');
    expect(ringMode(after(63, 73), false)).toBe('ticks');
  });

  it('never a single number, never "pass" or "ready", never a dash', () => {
    for (const r of [after(63, 73), after(0, 4), after(96, 100), before(12), before(40)]) {
      for (const week of [false, true]) {
        const c = ringCaption(r, week);
        const all = [c.big, c.rest, c.line2, c.spoken].filter(Boolean).join(' ');
        expect(all).not.toMatch(/\bpass\b|\bready\b/i);
        expect(all).not.toMatch(DASHES);
      }
    }
  });

  it('exam week: readiness in words, no ring marks', () => {
    expect(ringMode(after(63, 73), true)).toBe('bare');
    const c = ringCaption(after(63, 73), true);
    expect(c.big).toBeNull();
    expect(c.rest).toBe('Your estimated readiness is 63 to 73.');
    expect(c.line2).toBe(ESTIMATE_LINE);
  });
});

describe('the Accuracy tile', () => {
  it('"Not started", then "Too few yet" with when it shows, then the whole percentage from 30', () => {
    expect(accuracyTile(0, 0)).toMatchObject({ shown: 'Not started', hint: null, num: false });
    expect(accuracyTile(12, 9)).toMatchObject({ shown: 'Too few yet', hint: 'Shows at 30 answers', num: false });
    expect(accuracyTile(12, 9).spoken).toBe('Accuracy, too few yet, 12 answered. Shows at 30 answers.');
    expect(accuracyTile(29, 29).shown).toBe('Too few yet');
    expect(accuracyTile(30, 21)).toMatchObject({ shown: '70%', num: true, spoken: 'Accuracy, 70 percent, latest tries' });
  });
});

describe("this week's twig", () => {
  // Wednesday 28 October 2026, noon (local).
  const WED = new Date(2026, 9, 28, 12).getTime();

  it('Monday to Sunday, filled on the days studied, today marked; a later day is never filled', () => {
    const w = twigWeek(['2026-10-20', '2026-10-26', '2026-10-28', '2026-10-30'], WED);
    expect(w.map((d) => d.on)).toEqual([true, false, true, false, false, false, false]);
    expect(w.map((d) => d.today)).toEqual([false, false, true, false, false, false, false]);
    expect(twigSpoken(w)).toBe('Studied on Monday and Wednesday. One leaf per day studied. Today is Wednesday.');
    expect(twigSpoken(twigWeek([], WED))).toBe('No study days yet this week. Today is Wednesday.');
  });

  it('a Sunday is the end of the week, not its start', () => {
    const SUN = new Date(2026, 10, 1, 12).getTime();
    const w = twigWeek(['2026-10-26', '2026-11-01'], SUN);
    expect(w.map((d) => d.on)).toEqual([true, false, false, false, false, false, true]);
    expect(w[6].today).toBe(true);
  });

  it('"1 study day this week", "3 study days this week"', () => {
    expect(studyDaysWords(1)).toBe('1 study day this week');
    expect(studyDaysWords(3)).toBe('3 study days this week');
  });

  it('the streak: "Streak starts today" for a new learner, from 2 days "N day streak", never 0 or 1, gone from day 14', () => {
    expect(twigStreak(0, 0)).toBe('Streak starts today');
    expect(twigStreak(1, 1)).toBe('Streak starts today');
    expect(twigStreak(2, 2)).toBe('2 day streak');
    expect(twigStreak(5, 4)).toBe('4 day streak');
    // A streak under 2 after the first days: nothing (no reset line, no broken chain).
    expect(twigStreak(5, 1)).toBe('');
    expect(twigStreak(5, 0)).toBe('');
    expect(TWIG_STREAK_UNTIL).toBe(14);
    expect(twigStreak(13, 9)).toBe('9 day streak');
    expect(twigStreak(14, 12)).toBe('');
    expect(twigStreak(40, 30)).toBe('');
    for (const days of [0, 1, 2, 5, 13, 14]) for (const s of [0, 1, 2, 9]) expect(twigStreak(days, s)).not.toMatch(/broke|lost|reset|0 day/i);
  });
});
