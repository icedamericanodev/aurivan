/**
 * Mobile 1.41 (behavioural review change 4): words per reminder.
 * - the NEXT reminder names what is waiting ("The 2 you missed are back. … Even 5 questions counts.");
 * - nothing due: the plain plan words with the short path;
 * - the LAST scheduled reminder says reminders pause until the app is opened again;
 * - never a streak, a plant, guilt or an exclamation mark; still one reminder a day, same ids.
 */
import { rollingCopy, rollingPlan, ROLLING_COUNT, SHORT_SET_MINUTES, slotCopy, waitingAt } from '../engine/reminders';
import { MINUTES_PER_QUESTION } from '../engine/pace';

const at = (d: number, h: number) => new Date(2026, 9, d, h, 0, 0).getTime();
const ON = { enabled: true, hour: 19, minute: 0 };

describe('what is waiting at a moment', () => {
  const review = { a: { dueAt: at(15, 8) }, b: { dueAt: at(15, 20) }, c: { dueAt: at(17, 8) }, gone: { dueAt: at(14, 8) } };
  const answers = { a: { lastCorrect: false }, b: { lastCorrect: true }, c: { lastCorrect: false }, gone: { lastCorrect: false } };
  it('counts reviews due by then, and how many were misses', () => {
    expect(waitingAt(review, answers, at(15, 19))).toEqual({ due: 2, missed: 2 });
    expect(waitingAt(review, answers, at(16, 19))).toEqual({ due: 3, missed: 2 });
    expect(waitingAt(review, answers, at(18, 19))).toEqual({ due: 4, missed: 3 });
  });
  it('skips questions the bank no longer has', () => {
    expect(waitingAt(review, answers, at(15, 19), (id) => id !== 'gone')).toEqual({ due: 1, missed: 1 });
  });
  it('an empty queue waits for nothing', () => {
    expect(waitingAt({}, {}, at(15, 19))).toEqual({ due: 0, missed: 0 });
  });
});

describe('the words for each reminder', () => {
  it('the next one names the misses that are back', () => {
    expect(slotCopy({ slot: 1, count: 7, certName: 'CISA', waiting: { due: 2, missed: 2 } })).toEqual({
      title: 'The 2 you missed are back',
      body: 'CISA: a quick review, then today’s plan. Even 5 questions counts.',
    });
    expect(slotCopy({ slot: 1, count: 7, certName: 'CISA', waiting: { due: 1, missed: 1 } }).title).toBe('The one you missed is back');
  });

  it('a right guess is not called a miss', () => {
    expect(slotCopy({ slot: 1, count: 7, certName: 'CISA', waiting: { due: 3, missed: 1 } }).title).toBe('3 questions are back for review');
    expect(slotCopy({ slot: 1, count: 7, certName: 'CISA', waiting: { due: 1, missed: 0 } }).title).toBe('One question is back for review');
  });

  it('nothing due: the plan is ready, with the short path', () => {
    const plain = slotCopy({ slot: 1, count: 7, certName: 'CISA', waiting: { due: 0, missed: 0 } });
    expect(plain).toEqual({ title: 'Your study plan is ready', body: 'CISA: about 6 min for 5 questions, or the full plan if you have time.' });
    expect(slotCopy({ slot: 1, count: 7, certName: 'CISA' })).toEqual(plain);
    expect(SHORT_SET_MINUTES).toBe(Math.round(5 * MINUTES_PER_QUESTION));
  });

  it('the middle ones keep the short path, even with reviews waiting', () => {
    expect(slotCopy({ slot: 3, count: 7, certName: 'CISA', waiting: { due: 4, missed: 4 } }).title).toBe('Your study plan is ready');
  });

  it('the last one says plainly that they pause until the app is opened', () => {
    expect(slotCopy({ slot: 7, count: 7, certName: 'CISA' })).toEqual({
      title: 'Your study plan is ready',
      body: 'This is the last reminder for now. They start again when you next open KaiSip.',
    });
    // A plan of one reminder is the next one, so it says what is waiting.
    expect(slotCopy({ slot: 1, count: 1, certName: 'CISA', waiting: { due: 2, missed: 2 } }).title).toBe('The 2 you missed are back');
    expect(slotCopy({ slot: 2, count: 2, certName: 'CISA' }).body).toMatch(/last reminder for now/);
  });

  it('never a streak, a plant, guilt or an exclamation mark', () => {
    const all = [1, 2, 7].flatMap((slot) => [
      slotCopy({ slot, count: 7, certName: 'CISA', waiting: { due: 9, missed: 9 } }),
      slotCopy({ slot, count: 7, certName: 'CISA', waiting: { due: 9, missed: 3 } }),
      slotCopy({ slot, count: 7, certName: 'CISA' }),
    ]);
    for (const w of all) {
      expect(`${w.title} ${w.body}`).not.toMatch(/streak|plant|don.t lose|miss you|lose your|sorry|!/i);
    }
  });
});

describe('a whole rolling plan', () => {
  it('same reminders and ids as before; the first names what is due by ITS time, the last says they pause', () => {
    const now = at(15, 9);
    const plan = rollingPlan(ON, now);
    expect(plan).toHaveLength(ROLLING_COUNT);
    const seen: number[] = [];
    const words = rollingCopy(plan, 'CISA', (when) => {
      seen.push(when);
      return { due: 2, missed: 2 };
    });
    expect(words).toHaveLength(plan.length);
    // Only the first reminder's moment is asked about.
    expect(seen).toEqual([plan[0].at]);
    expect(words[0].title).toBe('The 2 you missed are back');
    expect(words.slice(1, 6).every((w) => w.title === 'Your study plan is ready' && /about 6 min for 5/.test(w.body))).toBe(true);
    expect(words[6].body).toMatch(/last reminder for now/);
  });

  it('reminders off: nothing to word', () => {
    expect(rollingCopy(rollingPlan({ ...ON, enabled: false }, at(15, 9)), 'CISA')).toEqual([]);
  });
});
