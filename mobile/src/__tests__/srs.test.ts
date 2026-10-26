import { DAY_MS, dueIds, INTERVAL_DAYS, MAX_BOX, nextReview, startOfNextDay, upcomingReview } from '../engine/srs';

const NOW = 1_700_000_000_000;

describe('Leitner spaced repetition', () => {
  it('a wrong answer enters box 1, due at the start of the next local day (mobile 1.43, as on the web)', () => {
    expect(nextReview(undefined, false, 'sure', NOW)).toEqual({ box: 1, dueAt: startOfNextDay(NOW), lastSeen: NOW, reps: 1 });
  });

  it('a fresh miss is not due again the same day, and is due from local midnight', () => {
    const e = nextReview(undefined, false, undefined, NOW)!;
    const midnight = startOfNextDay(NOW);
    expect(dueIds({ q: e }, NOW)).toEqual([]);
    expect(dueIds({ q: e }, midnight - 1)).toEqual([]);
    expect(dueIds({ q: e }, midnight)).toEqual(['q']);
    // A miss one minute before midnight still waits only until midnight (never a full day more).
    expect(nextReview(undefined, false, undefined, midnight - 60_000)!.dueAt).toBe(midnight);
  });

  it('a miss from a higher box falls back to box 1, due tomorrow, keeping its count', () => {
    expect(nextReview({ box: 4, dueAt: NOW - 1, lastSeen: NOW - 7 * DAY_MS, reps: 5 }, false, 'sure', NOW)).toEqual({ box: 1, dueAt: startOfNextDay(NOW), lastSeen: NOW, reps: 6 });
  });

  it('a correct answer on a never-missed question schedules nothing', () => {
    expect(nextReview(undefined, true, 'sure', NOW)).toBeNull();
  });

  it('a correct first answer with no confidence rating schedules nothing', () => {
    expect(nextReview(undefined, true, undefined, NOW)).toBeNull();
  });

  it('a correct first answer marked guessing goes to box 1, due tomorrow', () => {
    expect(nextReview(undefined, true, 'guessing', NOW)).toEqual({ box: 1, dueAt: NOW + DAY_MS, lastSeen: NOW, reps: 1 });
  });

  it('a correct first answer marked unsure goes to box 2, due after its interval', () => {
    expect(nextReview(undefined, true, 'unsure', NOW)).toEqual({ box: 2, dueAt: NOW + INTERVAL_DAYS[2] * DAY_MS, lastSeen: NOW, reps: 1 });
  });

  it('a guessed first answer is not due straight away', () => {
    const e = nextReview(undefined, true, 'guessing', NOW)!;
    expect(dueIds({ q: e }, NOW)).toEqual([]);
    expect(dueIds({ q: e }, NOW + DAY_MS)).toEqual(['q']);
  });

  it('then a sure answer from box 1 promotes as usual', () => {
    const first = nextReview(undefined, true, 'guessing', NOW)!;
    expect(nextReview(first, true, 'sure', NOW + DAY_MS)!.box).toBe(2);
  });

  it('a confident correct answer promotes one box with the right interval', () => {
    const e = nextReview({ box: 1, dueAt: NOW, lastSeen: NOW, reps: 1 }, true, 'sure', NOW)!;
    expect(e.box).toBe(2);
    expect(e.dueAt).toBe(NOW + 1 * DAY_MS);
  });

  it('a lucky guess does not promote', () => {
    const e = nextReview({ box: 3, dueAt: NOW, lastSeen: NOW, reps: 4 }, true, 'guessing', NOW)!;
    expect(e.box).toBe(3);
    expect(e.dueAt).toBe(NOW + 3 * DAY_MS);
  });

  it('graduates out of the final box', () => {
    expect(nextReview({ box: MAX_BOX, dueAt: NOW, lastSeen: NOW, reps: 9 }, true, 'sure', NOW)).toBeNull();
  });

  it('lists due items most-overdue first', () => {
    const review = {
      a: { box: 2, dueAt: NOW - 10, lastSeen: 0, reps: 1 },
      b: { box: 1, dueAt: NOW - 500, lastSeen: 0, reps: 1 },
      c: { box: 1, dueAt: NOW + DAY_MS, lastSeen: 0, reps: 1 },
    };
    expect(dueIds(review, NOW)).toEqual(['b', 'a']);
  });
});

describe('retired questions (a content update removed them)', () => {
  const NOW = new Date(2026, 9, 12, 10, 0, 0).getTime();
  const entry = (dueAt: number) => ({ box: 2, dueAt, lastSeen: NOW, reps: 1 });

  it('dueIds leaves out ids the bank no longer has', () => {
    const review = { d1_001: entry(NOW - 1000), d9_retired: entry(NOW - 2000) };
    expect(dueIds(review, NOW)).toEqual(['d9_retired', 'd1_001']);
    expect(dueIds(review, NOW, (id) => id !== 'd9_retired')).toEqual(['d1_001']);
  });

  it('upcomingReview counts only questions the bank still has', () => {
    const review = { d1_001: entry(NOW + 3_600_000), d9_retired: entry(NOW + 1_800_000) };
    expect(upcomingReview(review, NOW)).toEqual({ at: NOW + 1_800_000, count: 2 });
    expect(upcomingReview(review, NOW, (id) => id !== 'd9_retired')).toEqual({ at: NOW + 3_600_000, count: 1 });
    expect(upcomingReview({ d9_retired: entry(NOW + 1000) }, NOW, () => false)).toBeNull();
  });
});
