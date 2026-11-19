/**
 * Mobile 2.2: the practice countdown's rules (engine/practiceCountdown.ts), with no screen and no
 * storage. Plain English for the founder, what these prove:
 * - only sensible budgets are accepted (never zero, negative, NaN, Infinity, text or days long), and a
 *   damaged saved countdown reads as "no countdown" (the set counts up) instead of crashing;
 * - the lengths offered come from the set's real length, in whole minutes;
 * - time is only counted while the meter runs: a pause, the background or a week with the app closed
 *   adds nothing, and changing the phone's clock (forward or backward) cannot add or remove time;
 * - the countdown stops ONCE at zero, and the learner's choice is taken once;
 * - an old "Timed" setting or session still means COUNT UP, never a countdown;
 * - screen readers are told the time twice only (5 minutes, 1 minute), never every second.
 */
import {
  bankMs,
  choiceFor,
  chooseAfter,
  COUNTDOWN_CUE_LINE,
  countdownChoices,
  countdownCue,
  countdownFor,
  countdownLabel,
  countdownMinutes,
  countdownResult,
  DEFAULT_COUNTDOWN_PACE,
  MAX_COUNTDOWN_MS,
  MAX_STEP_MS,
  MIN_COUNTDOWN_MS,
  newCountdown,
  readCountdown,
  remainingMs,
  stageOf,
  startMeter,
  stepMeter,
  STOPPED_METER,
  timerKindFromSetting,
  timerKindOf,
  timesUpBody,
  validBudgetMs,
  type CountdownMeter,
  type PracticeCountdown,
} from '../engine/practiceCountdown';

const S = 1000;
const MIN = 60 * S;

/** Run the meter for `seconds`, one tick a second, and bank every tick (what the screen does). */
function run(c: PracticeCountdown, meter: CountdownMeter, from: number, seconds: number, answered = 0) {
  let now = from;
  for (let i = 0; i < seconds; i += 1) {
    now += S;
    const step = stepMeter(meter, now);
    meter = step.meter;
    c = bankMs(c, step.addMs, answered);
  }
  return { c, meter, now };
}

describe('validation and clamping', () => {
  it('accepts a budget from 1 minute to 4 hours and nothing else', () => {
    expect(validBudgetMs(MIN_COUNTDOWN_MS)).toBe(true);
    expect(validBudgetMs(15 * MIN)).toBe(true);
    expect(validBudgetMs(MAX_COUNTDOWN_MS)).toBe(true);
    for (const bad of [0, -1, -15 * MIN, 59 * S, MAX_COUNTDOWN_MS + 1, 7 * 24 * 60 * MIN, NaN, Infinity, -Infinity, '900000', null, undefined, {}, [], true]) {
      expect(validBudgetMs(bad)).toBe(false);
      expect(newCountdown(bad)).toBeNull();
    }
  });

  it('whole minutes from the set length and the pace, rounded up', () => {
    expect(countdownMinutes(10, 60)).toBe(10);
    expect(countdownMinutes(10, 90)).toBe(15);
    expect(countdownMinutes(10, 120)).toBe(20);
    expect(countdownMinutes(5, 90)).toBe(8); // 7.5 → 8, never 7.5
    expect(countdownMinutes(7, 90)).toBe(11);
    expect(countdownMinutes(50, 120)).toBe(100);
  });

  it('refuses a set length or pace that is not sensible', () => {
    for (const bad of [0, -3, 1.5, NaN, Infinity, 501, '10', null, undefined]) expect(countdownMinutes(bad, 90)).toBeNull();
    for (const bad of [0, -90, NaN, Infinity, 601, '90', null, undefined]) expect(countdownMinutes(10, bad)).toBeNull();
    // 500 questions at 10 minutes each is days long: refused, not clamped into something misleading.
    expect(countdownMinutes(500, 600)).toBeNull();
    expect(countdownFor(0, 90)).toBeNull();
    expect(countdownFor(10, NaN)).toBeNull();
    expect(countdownFor(10, -90)).toBeNull();
  });

  it('offers three lengths for a set ("10 questions · 15 min"), fewer when two would be the same', () => {
    expect(countdownChoices(10)).toEqual([
      { secPerQuestion: 60, minutes: 10 },
      { secPerQuestion: 90, minutes: 15 },
      { secPerQuestion: 120, minutes: 20 },
    ]);
    expect(countdownChoices(20).map((c) => c.minutes)).toEqual([20, 30, 40]);
    expect(countdownChoices(50).map((c) => c.minutes)).toEqual([50, 75, 100]);
    // A pool smaller than asked: the lengths follow the real 7 questions.
    expect(countdownChoices(7).map((c) => c.minutes)).toEqual([7, 11, 14]);
    // One question: 90 s and 120 s both round up to 2 min, offered once.
    expect(countdownChoices(1)).toEqual([
      { secPerQuestion: 60, minutes: 1 },
      { secPerQuestion: 90, minutes: 2 },
    ]);
    // Nothing to practice: nothing to offer (the screen shows its usual empty state).
    expect(countdownChoices(0)).toEqual([]);
    expect(countdownChoices(-5)).toEqual([]);
    expect(countdownChoices(NaN)).toEqual([]);
    expect(countdownLabel(10, 15)).toBe('10 questions · 15 min');
    expect(countdownLabel(1, 2)).toBe('1 question · 2 min');
  });

  it('keeps the chosen pace when the length changes, or takes the nearest one offered', () => {
    expect(choiceFor(countdownChoices(10), DEFAULT_COUNTDOWN_PACE)).toEqual({ secPerQuestion: 90, minutes: 15 });
    expect(choiceFor(countdownChoices(20), 120)).toEqual({ secPerQuestion: 120, minutes: 40 });
    // A 1-question set has no separate 120 s choice: the 90 s one (2 min) stands in.
    expect(choiceFor(countdownChoices(1), 120)).toEqual({ secPerQuestion: 90, minutes: 2 });
    expect(choiceFor([], 90)).toBeUndefined();
  });

  it('a new countdown has nothing used and the whole budget left', () => {
    const c = countdownFor(10, 90)!;
    expect(c).toEqual({ budgetMs: 15 * MIN, usedMs: 0 });
    expect(remainingMs(c)).toBe(15 * MIN);
    expect(stageOf(c)).toBe('running');
  });
});

describe('a damaged saved countdown never crashes and never invents time', () => {
  it('reads as no countdown when the budget or the time used cannot be trusted', () => {
    const bad: unknown[] = [
      null,
      undefined,
      'countdown',
      42,
      [],
      {},
      { usedMs: 0 },
      { budgetMs: 0, usedMs: 0 },
      { budgetMs: -15 * MIN, usedMs: 0 },
      { budgetMs: NaN, usedMs: 0 },
      { budgetMs: Infinity, usedMs: 0 },
      { budgetMs: '900000', usedMs: 0 },
      { budgetMs: 99 * 60 * MIN, usedMs: 0 },
      { budgetMs: 15 * MIN },
      { budgetMs: 15 * MIN, usedMs: -1 },
      { budgetMs: 15 * MIN, usedMs: NaN },
      { budgetMs: 15 * MIN, usedMs: Infinity },
      { budgetMs: 15 * MIN, usedMs: '0' },
      { budgetMs: 15 * MIN, usedMs: null },
    ];
    for (const raw of bad) expect(readCountdown(raw)).toBeNull();
  });

  it('keeps a good one, and tidies the parts that are off', () => {
    expect(readCountdown({ budgetMs: 15 * MIN, usedMs: 4 * MIN })).toEqual({ budgetMs: 15 * MIN, usedMs: 4 * MIN });
    // More used than the budget reads as "all used" (never negative time left).
    const over = readCountdown({ budgetMs: 15 * MIN, usedMs: 99 * MIN })!;
    expect(over.usedMs).toBe(15 * MIN);
    expect(remainingMs(over)).toBe(0);
    // An expiry is kept; a choice without an expiry, or a made-up choice, is dropped.
    expect(readCountdown({ budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 7, after: 'untimed' })).toEqual({ budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 7, after: 'untimed' });
    expect(readCountdown({ budgetMs: 15 * MIN, usedMs: 3 * MIN, after: 'untimed' })).toEqual({ budgetMs: 15 * MIN, usedMs: 3 * MIN });
    expect(readCountdown({ budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 7, after: 'submitted' })).toEqual({ budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 7 });
    expect(readCountdown({ budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: -2 })).toEqual({ budgetMs: 15 * MIN, usedMs: 15 * MIN });
    expect(readCountdown({ budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 2.5 })).toEqual({ budgetMs: 15 * MIN, usedMs: 15 * MIN });
    // Expired with time "left": an expired countdown has none.
    expect(remainingMs(readCountdown({ budgetMs: 15 * MIN, usedMs: 2 * MIN, expiredAfter: 3 })!)).toBe(0);
    // Extra keys (a deadline someone pasted in) are not carried along.
    expect(readCountdown({ budgetMs: 15 * MIN, usedMs: 0, deadline: 123, __proto__: { after: 'finished' } })).toEqual({ budgetMs: 15 * MIN, usedMs: 0 });
  });

  it('a damaged countdown on a timed session falls back to count up', () => {
    expect(timerKindOf({ mode: 'practice', timed: true, countdown: { budgetMs: NaN, usedMs: 0 } })).toBe('countUp');
    expect(timerKindOf({ mode: 'practice', timed: true, countdown: 'soon' })).toBe('countUp');
  });
});

describe('old settings and sessions keep their meaning', () => {
  it('a session that only has `timed: true` counts UP, and one without it is untimed', () => {
    expect(timerKindOf({ mode: 'practice', timed: true })).toBe('countUp');
    expect(timerKindOf({ mode: 'review', timed: true })).toBe('countUp');
    expect(timerKindOf({ mode: 'practice' })).toBe('untimed');
    expect(timerKindOf({ mode: 'practice', timed: false })).toBe('untimed');
    expect(timerKindOf(null)).toBe('untimed');
    expect(timerKindOf(undefined)).toBe('untimed');
  });

  it('a countdown needs both `timed: true` and a clean countdown; a mock is never one', () => {
    const countdown = countdownFor(10, 90);
    expect(timerKindOf({ mode: 'practice', timed: true, countdown })).toBe('countdown');
    // Without `timed` the countdown is not used: nobody is moved to a countdown by a stray field.
    expect(timerKindOf({ mode: 'practice', countdown })).toBe('untimed');
    expect(timerKindOf({ mode: 'practice', timed: 'yes', countdown })).toBe('untimed');
    expect(timerKindOf({ mode: 'mock', timed: true, countdown })).toBe('untimed');
  });

  it('the saved "Timed practice" switch is count up or untimed, never a countdown', () => {
    expect(timerKindFromSetting(true)).toBe('countUp');
    for (const off of [false, undefined, null, 'true', 1, 'countdown', {}]) expect(timerKindFromSetting(off)).toBe('untimed');
  });
});

describe('only answering time is counted', () => {
  it('counts while the meter runs, one second a tick', () => {
    const start = run(countdownFor(10, 90)!, startMeter(0), 0, 45);
    expect(start.c.usedMs).toBe(45 * S);
    expect(remainingMs(start.c)).toBe(15 * MIN - 45 * S);
  });

  it('a pause, the background and a resume: the time away is never counted', () => {
    let { c, meter, now } = run(countdownFor(10, 90)!, startMeter(0), 0, 60);
    // Paused (the explanation is open, or the app went to the background): the meter stops.
    meter = STOPPED_METER;
    // Ten minutes of ticks while stopped add nothing.
    ({ c, meter, now } = run(c, meter, now, 600));
    expect(c.usedMs).toBe(60 * S);
    // Back: the meter starts again from NOW, so the ten minutes are not billed on the first tick.
    meter = startMeter(now);
    ({ c, meter, now } = run(c, meter, now, 30));
    expect(c.usedMs).toBe(90 * S);
    // Stopping twice, or stepping a stopped meter, changes nothing.
    expect(stepMeter(STOPPED_METER, now + 5 * MIN)).toEqual({ meter: STOPPED_METER, addMs: 0 });
  });

  it('the app killed and reopened a week later: the time left is what was saved', () => {
    const before = run(countdownFor(10, 90)!, startMeter(1_000_000), 1_000_000, 4 * 60);
    // What is on disk at the kill (plain JSON, no clock time in it).
    const disk = JSON.stringify(before.c);
    expect(disk).toBe('{"budgetMs":900000,"usedMs":240000}');
    // A week later, a new launch: read it back, start a NEW meter.
    const WEEK = 7 * 24 * 60 * MIN;
    const restored = readCountdown(JSON.parse(disk))!;
    expect(remainingMs(restored)).toBe(11 * MIN);
    const after = run(restored, startMeter(before.now + WEEK), before.now + WEEK, 10);
    expect(remainingMs(after.c)).toBe(11 * MIN - 10 * S);
  });
});

describe('a changed phone clock cannot add or remove time', () => {
  it('a jump FORWARD (a day) adds at most one capped tick', () => {
    const { c, meter, now } = run(countdownFor(10, 90)!, startMeter(0), 0, 10);
    const jumped = stepMeter(meter, now + 24 * 60 * MIN);
    expect(jumped.addMs).toBe(MAX_STEP_MS);
    const next = bankMs(c, jumped.addMs, 0);
    expect(next.usedMs).toBe(10 * S + MAX_STEP_MS);
    expect(stageOf(next)).toBe('running'); // a day's jump did not end the set
    // The meter carries on from the new clock: the next second is one second.
    expect(stepMeter(jumped.meter, now + 24 * 60 * MIN + S).addMs).toBe(S);
  });

  it('a jump BACKWARD adds nothing and gives nothing back', () => {
    const { c, meter, now } = run(countdownFor(10, 90)!, startMeter(10 * MIN), 10 * MIN, 30);
    const back = stepMeter(meter, now - 3 * 60 * MIN);
    expect(back.addMs).toBe(0);
    expect(bankMs(c, back.addMs, 0)).toBe(c);
    // It then counts normally from the earlier clock.
    expect(stepMeter(back.meter, now - 3 * 60 * MIN + S).addMs).toBe(S);
  });

  it('a clock that answers nonsense adds nothing', () => {
    const meter = startMeter(1000);
    expect(stepMeter(meter, NaN)).toEqual({ meter, addMs: 0 });
    expect(stepMeter(meter, Infinity).addMs).toBe(0);
    expect(stepMeter(startMeter(NaN), 5000).addMs).toBe(0);
  });

  it('banking ignores anything that is not a positive number of ms', () => {
    const c = countdownFor(10, 90)!;
    for (const bad of [0, -5000, NaN, Infinity, -Infinity, '5000', null, undefined]) expect(bankMs(c, bad, 0)).toBe(c);
  });
});

describe('zero: the countdown stops once, and the learner chooses once', () => {
  const nearlyOut = (): PracticeCountdown => ({ budgetMs: 15 * MIN, usedMs: 15 * MIN - 2 * S });

  it('expires exactly once and remembers how many were answered at that moment', () => {
    const out = bankMs(nearlyOut(), 5 * S, 7);
    expect(out).toEqual({ budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 7 });
    expect(remainingMs(out)).toBe(0);
    expect(stageOf(out)).toBe('expired');
    // More ticks, a late tick, an answer checked in the same second: nothing changes any more.
    expect(bankMs(out, S, 8)).toBe(out);
    expect(bankMs(out, 60 * MIN, 10)).toBe(out);
    expect(bankMs(out, 0, 0)).toBe(out);
  });

  it('a countdown saved with nothing left (but not yet stopped) stops on the next look', () => {
    const full = readCountdown({ budgetMs: 15 * MIN, usedMs: 15 * MIN })!;
    expect(stageOf(full)).toBe('running');
    expect(bankMs(full, 0, 3)).toEqual({ budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 3 });
  });

  it('"Keep going untimed": the same set carries on, with no timer and no more counting', () => {
    const out = bankMs(nearlyOut(), 5 * S, 7);
    const kept = chooseAfter(out, 'untimed');
    expect(kept).toEqual({ budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 7, after: 'untimed' });
    expect(stageOf(kept)).toBe('untimed');
    // No more time is counted, and it cannot expire again.
    expect(bankMs(kept, 10 * MIN, 9)).toBe(kept);
    // A second tap, or the other button after it, changes nothing.
    expect(chooseAfter(kept, 'untimed')).toBe(kept);
    expect(chooseAfter(kept, 'finished')).toBe(kept);
  });

  it('"Finish now": the choice is kept, once', () => {
    const out = bankMs(nearlyOut(), 5 * S, 7);
    const done = chooseAfter(out, 'finished');
    expect(stageOf(done)).toBe('finished');
    expect(done.expiredAfter).toBe(7);
    expect(chooseAfter(done, 'untimed')).toBe(done);
    expect(bankMs(done, S, 7)).toBe(done);
  });

  it('there is nothing to choose before zero', () => {
    const running = countdownFor(10, 90)!;
    expect(chooseAfter(running, 'untimed')).toBe(running);
    expect(chooseAfter(running, 'finished')).toBe(running);
  });

  it('the state at zero survives the app being closed (the sheet is due again until answered)', () => {
    const out = bankMs(nearlyOut(), 5 * S, 7);
    const back = readCountdown(JSON.parse(JSON.stringify(out)))!;
    expect(stageOf(back)).toBe('expired');
    const kept = readCountdown(JSON.parse(JSON.stringify(chooseAfter(back, 'untimed'))))!;
    expect(stageOf(kept)).toBe('untimed'); // answered: not due again
  });

  it('the sheet says what happened and that nothing was marked wrong', () => {
    expect(timesUpBody(7, 10)).toBe('You answered 7 of 10. Those answers are saved. The rest are not marked wrong.');
  });
});

describe('what a screen reader is told, and when', () => {
  it('"5 minutes left" and "1 minute left", each at the moment it is passed', () => {
    expect(countdownCue(5 * MIN + S, 5 * MIN)).toBe('five');
    expect(countdownCue(5 * MIN + 400, 5 * MIN - 600)).toBe('five');
    expect(countdownCue(MIN + S, MIN)).toBe('one');
    expect(COUNTDOWN_CUE_LINE).toEqual({ five: '5 minutes left.', one: '1 minute left.' });
  });

  it('never every second: a whole 15-minute countdown gives exactly two cues', () => {
    const said: string[] = [];
    let left = 15 * MIN;
    while (left > 0) {
      const next = left - S;
      const cue = countdownCue(left, next);
      if (cue) said.push(cue);
      left = next;
    }
    expect(said).toEqual(['five', 'one']);
  });

  it('nothing at the start, on reopening under a mark, or at zero (the sheet speaks for itself)', () => {
    expect(countdownCue(5 * MIN, 5 * MIN - S)).toBeNull(); // a set that STARTS at 5 minutes
    expect(countdownCue(4 * MIN, 4 * MIN - S)).toBeNull(); // reopened with 4 left
    expect(countdownCue(MIN, MIN - S)).toBeNull(); // a 1-minute set
    expect(countdownCue(S, 0)).toBeNull();
    expect(countdownCue(MIN + S, 0)).toBeNull(); // straight to zero: the sheet, not "1 minute left"
    expect(countdownCue(3 * MIN, 3 * MIN)).toBeNull(); // nothing moved
  });
});

describe('Results says truthfully how the time went', () => {
  it('ran out, then kept going untimed', () => {
    const c: PracticeCountdown = { budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 7, after: 'untimed' };
    expect(countdownResult(c, 10, 10)?.text).toBe('Time ran out after 7 of 10. You kept going untimed.');
  });

  it('ran out, then finished there', () => {
    const c: PracticeCountdown = { budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 7, after: 'finished' };
    expect(countdownResult(c, 10, 7)?.text).toBe('Time ran out after 7 of 10. You finished there.');
  });

  it('never ran out and every question answered, and no countdown at all', () => {
    expect(countdownResult({ budgetMs: 15 * MIN, usedMs: 9 * MIN }, 10, 10)).toEqual({
      text: 'Finished inside your 15 min countdown.',
      spoken: 'Finished inside your 15 minute countdown.',
    });
    expect(countdownResult({ budgetMs: MIN, usedMs: 0 }, 1, 1)?.spoken).toBe('Finished inside your 1 minute countdown.');
    expect(countdownResult(null, 10, 10)).toBeNull();
    expect(countdownResult(null, 10, 3)).toBeNull();
  });

  it('never ran out but ended early ("End session?"): it does not say "Finished"', () => {
    expect(countdownResult({ budgetMs: 15 * MIN, usedMs: 4 * MIN }, 10, 3)).toEqual({
      text: 'Ended with time left on your 15 min countdown.',
      spoken: 'Ended with time left on your 15 minute countdown.',
    });
    // One short of the whole set is still "ended"; the whole set (or a count above it) is "finished".
    expect(countdownResult({ budgetMs: 15 * MIN, usedMs: 4 * MIN }, 10, 9)?.text).toBe('Ended with time left on your 15 min countdown.');
    expect(countdownResult({ budgetMs: 15 * MIN, usedMs: 4 * MIN }, 10, 11)?.text).toBe('Finished inside your 15 min countdown.');
    expect(countdownResult({ budgetMs: MIN, usedMs: 0 }, 2, 1)?.spoken).toBe('Ended with time left on your 1 minute countdown.');
    // A count that is not a real number never claims "Finished".
    for (const bad of [NaN, Infinity, undefined, '10']) {
      expect(countdownResult({ budgetMs: 15 * MIN, usedMs: 4 * MIN }, 10, bad as number)?.text).toBe('Ended with time left on your 15 min countdown.');
    }
  });

  it('a set that ran out says so, however many were answered by the end', () => {
    const c: PracticeCountdown = { budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 7, after: 'untimed' };
    expect(countdownResult(c, 10, 8)?.text).toBe('Time ran out after 7 of 10. You kept going untimed.');
  });

  it('never claims more answers than the set has', () => {
    expect(countdownResult({ budgetMs: 15 * MIN, usedMs: 15 * MIN, expiredAfter: 99 }, 10, 10)?.text).toBe('Time ran out after 10 of 10.');
  });
});
