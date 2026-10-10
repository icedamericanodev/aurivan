import { DAY_MS, dueIds, INTERVAL_DAYS, MAX_BOX, nextReview } from '../engine/srs';

const NOW = 1_700_000_000_000;

describe('Leitner spaced repetition', () => {
  it('a wrong answer enters box 1, due now', () => {
    expect(nextReview(undefined, false, 'sure', NOW)).toEqual({ box: 1, dueAt: NOW, lastSeen: NOW, reps: 1 });
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
