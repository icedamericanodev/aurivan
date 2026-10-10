/**
 * Build D: pace maths (engine/pace.ts). Everything here is pure.
 * - exam pace and target pace come from the cert's exam facts;
 * - full and mini mocks at Standard, +25%, +50% and Untimed;
 * - the checkpoint state machine;
 * - the practice timer (counts up, pauses while the explanation shows);
 * - coaching tags, the results line, the timer offer;
 * - the mock pacing panel, and pacing stats that leave untimed mocks out.
 */
import { getCertification } from '../content/certifications';
import {
  CHECKPOINTS,
  coachingTag,
  COACHING,
  checkpointText,
  dueCheckpoints,
  durationText,
  examPaceSeconds,
  formatClock,
  median,
  medianSeconds,
  MINUTES_PER_QUESTION,
  mockPace,
  mockPacing,
  paceMessage,
  paceShort,
  paceVerdict,
  spokenClockCoarse,
  durationSpoken,
  pacingStats,
  pacingStatsLine,
  practiceElapsedMs,
  practicePaceLine,
  shouldOfferTimer,
  SOFT_CUE_LINE,
  softCue,
  spokenClock,
  statusOf,
  targetPaceSeconds,
  timingOf,
  type Checkpoint,
} from '../engine/pace';

const CISA = getCertification('cisa')!.exam;
const MIN = 60_000;
const S = 1000;

describe('paces from exam facts', () => {
  it('CISA: exam pace 96 s, target pace 90 s (15 minutes kept to revisit flags)', () => {
    expect(examPaceSeconds(CISA)).toBe(96);
    expect(targetPaceSeconds(CISA)).toBe(90);
  });

  it('plan estimates keep their own study pace', () => {
    expect(MINUTES_PER_QUESTION).toBe(1.2);
  });

  it('a short exam never gets a negative target', () => {
    expect(targetPaceSeconds({ questions: 10, minutes: 20 })).toBe(60);
  });
});

describe('mock timing: full and mini mocks', () => {
  const cases: [number, Parameters<typeof mockPace>[2], number | null, number, number][] = [
    // questions, timing, minutes allowed, exam s, target s
    [150, 'standard', 240, 96, 90],
    [150, 'plus25', 300, 120, 112.5],
    [150, 'plus50', 360, 144, 135],
    [150, 'untimed', null, 96, 90],
    [50, 'standard', 80, 96, 90],
    [50, 'plus25', 100, 120, 112.5],
    [50, 'plus50', 120, 144, 135],
    [50, 'untimed', null, 96, 90],
  ];
  it.each(cases)('%i questions at %s', (q, timing, minutes, examSec, targetSec) => {
    expect(mockPace(CISA, q, timing)).toEqual({ minutesAllowed: minutes, examSec, targetSec });
  });

  it('older mock results (no timing saved) were standard', () => {
    expect(timingOf(undefined)).toBe('standard');
    expect(timingOf('untimed')).toBe('untimed');
  });
});

describe('pace verdict', () => {
  it('within ±10% of target is on pace', () => {
    // 40 done in 60 min at 90 s = exactly on target.
    expect(paceVerdict(60 * 60, 40, 90)).toEqual({ status: 'onPace', deviation: 0, minutes: 0 });
    // 37 done: 55.5 min of target work in 60 min = 7.5% slow: still on pace.
    expect(paceVerdict(60 * 60, 37, 90).status).toBe('onPace');
  });

  it('behind: more than 10% slower, with whole minutes', () => {
    // 34 done in 60 min: a target learner needed 51 min → 9 min behind (15%).
    const v = paceVerdict(60 * 60, 34, 90);
    expect(v.status).toBe('behind');
    expect(v.minutes).toBe(9);
    expect(v.deviation).toBeCloseTo(0.15);
    expect(paceMessage(v)).toBe('About 9 min behind. Flag anything past 2 minutes and move on.');
  });

  it('ahead: more than 10% faster', () => {
    const v = paceVerdict(60 * 60, 46, 90); // 69 min of work in 60
    expect(v.status).toBe('ahead');
    expect(paceMessage(v)).toBe('Ahead. Use the time to re-read the stems.');
    expect(paceMessage(paceVerdict(3600, 40, 90))).toBe('On pace');
  });

  it('nothing done yet is behind; no time used yet is on pace', () => {
    expect(paceVerdict(600, 0, 90).status).toBe('behind');
    expect(paceVerdict(0, 0, 90).status).toBe('onPace');
  });

  it('the edges of the tolerance', () => {
    expect(statusOf(0.1)).toBe('onPace');
    expect(statusOf(0.1001)).toBe('behind');
    expect(statusOf(-0.1)).toBe('onPace');
    expect(statusOf(-0.1001)).toBe('ahead');
  });
});

describe('checkpoint state machine', () => {
  const allowed = 240 * MIN;
  it('nothing before 25%, then one check per mark, each recorded once', () => {
    let cps: Checkpoint[] = [];
    cps = dueCheckpoints(cps, allowed, 59 * MIN, 30, 90);
    expect(cps).toEqual([]);
    cps = dueCheckpoints(cps, allowed, 60 * MIN, 34, 90);
    expect(cps).toHaveLength(1);
    expect(cps[0]).toMatchObject({ at: 0.25, done: 34, minutes: 9 });
    // Later ticks before 50% change nothing, and return the same array (no save).
    const same = dueCheckpoints(cps, allowed, 100 * MIN, 70, 90);
    expect(same).toBe(cps);
    cps = dueCheckpoints(cps, allowed, 120 * MIN, 80, 90);
    expect(cps.map((c) => c.at)).toEqual([0.25, 0.5]);
    // The 25% check is never re-judged.
    expect(cps[0].done).toBe(34);
  });

  it('a check is judged at its own moment, not when it is noticed', () => {
    const [c] = dueCheckpoints([], allowed, 61 * MIN, 40, 90);
    expect(c.deviation).toBeCloseTo(0); // 40 × 90 s = 60 min exactly
  });

  it('reopening a paused mock after several marks records them all, in order', () => {
    const cps = dueCheckpoints([], allowed, 200 * MIN, 50, 90);
    expect(cps.map((c) => c.at)).toEqual([...CHECKPOINTS]);
    expect(cps.every((c) => c.done === 50)).toBe(true);
  });

  it('untimed mocks have no checks', () => {
    expect(dueCheckpoints([], null, 500 * MIN, 10, 90)).toEqual([]);
  });

  it('extra time: checks move with the time allowed and the stretched target', () => {
    const plus50 = mockPace(CISA, 150, 'plus50');
    // 25% of 360 min = 90 min; 40 done at 135 s = 90 min → on pace.
    const [c] = dueCheckpoints([], plus50.minutesAllowed! * MIN, 90 * MIN, 40, plus50.targetSec);
    expect(statusOf(c.deviation)).toBe('onPace');
    // Standard pace judged under +50%: well ahead.
    const [d] = dueCheckpoints([], plus50.minutesAllowed! * MIN, 90 * MIN, 60, plus50.targetSec);
    expect(statusOf(d.deviation)).toBe('ahead');
  });

  it('mini mock: checks at 20, 40 and 60 minutes', () => {
    const mini = mockPace(CISA, 50, 'standard');
    const ms = mini.minutesAllowed! * MIN;
    expect(dueCheckpoints([], ms, 19 * MIN, 13, mini.targetSec)).toEqual([]);
    expect(dueCheckpoints([], ms, 20 * MIN, 13, mini.targetSec)).toHaveLength(1);
    expect(dueCheckpoints([], ms, 60 * MIN, 38, mini.targetSec)).toHaveLength(3);
  });

  it('check words for the results panel', () => {
    expect(checkpointText({ deviation: 0.02, minutes: 0 })).toBe('on pace');
    expect(checkpointText({ deviation: 0.2, minutes: 6 })).toBe('6 min behind');
    expect(checkpointText({ deviation: -0.3, minutes: 4 })).toBe('4 min ahead');
  });
});

describe('practice timer', () => {
  it('counts up: recorded answer times plus the running question', () => {
    expect(practiceElapsedMs([40 * S, 70 * S], 15 * S)).toBe(125 * S);
  });

  it('pauses while the explanation shows (no running question)', () => {
    const answered = [40 * S, 70 * S];
    expect(practiceElapsedMs(answered, null)).toBe(110 * S);
    // However long the explanation stays open, the number does not move.
    expect(practiceElapsedMs(answered, null)).toBe(practiceElapsedMs(answered, null));
  });

  it('ignores answers with no time (older sessions)', () => {
    expect(practiceElapsedMs([undefined, 30 * S], 0)).toBe(30 * S);
  });

  it('the soft cue appears at 2:00 on one question', () => {
    expect(softCue(119 * S)).toBe(false);
    expect(softCue(120 * S)).toBe(true);
  });
});

describe('practice results line and coaching tags', () => {
  it('median seconds vs exam pace', () => {
    expect(practicePaceLine([70 * S, 74 * S, 90 * S], CISA)).toBe('Median 74 s per question · exam pace 96 s');
    expect(practicePaceLine([60 * S, 80 * S], CISA)).toBe('Median 70 s per question · exam pace 96 s');
    expect(practicePaceLine([undefined], CISA)).toBeNull();
  });

  it('fast and wrong: under 30 s and wrong', () => {
    expect(coachingTag(false, 29 * S)).toBe('fast-wrong');
    expect(coachingTag(false, 30 * S)).toBeNull();
    expect(coachingTag(true, 10 * S)).toBeNull(); // fast and RIGHT is fine
    expect(COACHING['fast-wrong']).toEqual({ tag: 'Quick pick', line: 'Slow down on the stem.' });
  });

  it('slow and right: over 3 minutes and right', () => {
    expect(coachingTag(true, 181 * S)).toBe('slow-right');
    expect(coachingTag(true, 180 * S)).toBeNull();
    expect(coachingTag(false, 400 * S)).toBeNull(); // slow and wrong: no tag
    expect(COACHING['slow-right'].line).toBe('You knew it; trust the first pass.');
  });

  it('no time, no tag', () => {
    expect(coachingTag(false, undefined)).toBeNull();
  });
});

describe('offer the practice timer', () => {
  const base = { daysLeft: 60, stage: 'practice', answered: false, timerOn: false };
  it('only near the exam or at the mock / ready stage', () => {
    expect(shouldOfferTimer(base)).toBe(false);
    expect(shouldOfferTimer({ ...base, daysLeft: 21 })).toBe(true);
    expect(shouldOfferTimer({ ...base, daysLeft: 22 })).toBe(false);
    expect(shouldOfferTimer({ ...base, daysLeft: null, stage: 'mock' })).toBe(true);
    expect(shouldOfferTimer({ ...base, stage: 'ready' })).toBe(true);
    expect(shouldOfferTimer({ ...base, daysLeft: -2 })).toBe(false); // exam already done
  });

  it('never again once answered, and never when the timer is already on', () => {
    expect(shouldOfferTimer({ ...base, daysLeft: 10, answered: true })).toBe(false);
    expect(shouldOfferTimer({ ...base, daysLeft: 10, timerOn: true })).toBe(false);
  });
});

describe('mock pacing panel', () => {
  const T0 = 1_800_000_000_000;
  const ans = (domainId: string, correct: boolean, sec: number, atMin: number) => ({ domainId, correct, ms: sec * S, at: T0 + atMin * MIN });

  it('time used vs allowed, median, unanswered, last 10% vs the rest, slowest domain', () => {
    const p = mockPacing({
      startedAt: T0,
      endedAt: T0 + 80 * MIN,
      allowedMs: 80 * MIN,
      total: 6,
      answers: [
        ans('1', true, 60, 10),
        ans('1', true, 80, 20),
        ans('4', true, 120, 40),
        ans('4', false, 140, 60),
        // The last 10% of 80 min = from minute 72.
        ans('5', false, 20, 75),
      ],
      checkpoints: [{ at: 0.25, done: 10, deviation: 0.02, minutes: 0 }],
    });
    expect(p.usedMinutes).toBe(80);
    expect(p.allowedMinutes).toBe(80);
    expect(p.medianSec).toBe(80);
    expect(p.unanswered).toBe(1);
    expect(p.timedOut).toBe(true);
    expect(p.lastTenth).toEqual({ correct: 0, total: 1 });
    expect(p.rest).toEqual({ correct: 3, total: 4 });
    expect(p.slowestDomain).toEqual({ domainId: '4', medianSec: 130 });
    expect(p.checkpoints).toHaveLength(1);
  });

  it('submitted early: not timed out; the last 10% is of the time USED', () => {
    const p = mockPacing({
      startedAt: T0,
      endedAt: T0 + 40 * MIN,
      allowedMs: 80 * MIN,
      total: 2,
      answers: [ans('1', true, 60, 10), ans('2', true, 60, 37)],
    });
    expect(p.timedOut).toBe(false);
    expect(p.lastTenth).toEqual({ correct: 1, total: 1 });
    expect(p.slowestDomain).toBeNull(); // no domain has 2 timed answers
  });

  it('answers without times or dates (older sessions) still load', () => {
    const p = mockPacing({ startedAt: T0, endedAt: T0 + MIN, allowedMs: null, total: 1, answers: [{ domainId: '1', correct: true }] });
    expect(p).toMatchObject({ medianSec: null, lastTenth: null, rest: null, allowedMinutes: null, timedOut: false, unanswered: 0 });
  });
});

describe('pacing stats leave untimed mocks out', () => {
  it('untimed and pre-Build D mocks are excluded', () => {
    const s = pacingStats([
      { timing: 'standard', medianSec: 80, unanswered: 0, checkpoints: [0.05, -0.15] },
      { timing: 'plus25', medianSec: 100, unanswered: 3, checkpoints: [0.2] },
      { timing: 'untimed', medianSec: 300, unanswered: 0, checkpoints: [] },
      {}, // a mock from before Build D: no pacing data
    ]);
    expect(s.mocks).toBe(2);
    expect(s.medianSec).toBe(90);
    expect(s.allAnswered).toBe(1);
    expect(s.meanDeviation).toBeCloseTo((0.05 + 0.15 + 0.2) / 3);
    expect(pacingStatsLine(s)).toBe('Pace over 2 timed mocks: median 90 s per question. Finished with every question answered: 1 of 2.');
  });

  it('only untimed mocks: no stats line', () => {
    const s = pacingStats([{ timing: 'untimed', medianSec: 60, unanswered: 0 }]);
    expect(s.mocks).toBe(0);
    expect(pacingStatsLine(s)).toBeNull();
  });
});

describe('numbers on screen', () => {
  it('clock and spoken clock', () => {
    expect(formatClock(249 * S)).toBe('04:09');
    expect(formatClock(3849 * S)).toBe('1:04:09');
    expect(formatClock(-5)).toBe('00:00');
    expect(spokenClock(249 * S)).toBe('4 minutes 9 seconds');
    expect(spokenClock(3849 * S)).toBe('1 hour 4 minutes');
    expect(spokenClock(60 * S)).toBe('1 minute');
    expect(spokenClock(0)).toBe('0 seconds');
  });

  it('durations, medians', () => {
    expect(durationText(211)).toBe('3 h 31 min');
    expect(durationText(240)).toBe('4 h');
    expect(durationText(45)).toBe('45 min');
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(medianSeconds([1500, undefined, 2500])).toBe(2);
  });
});

describe('review fixes: spoken and short forms', () => {
  it('the strip speaks whole minutes, then 10-second steps (U-H2)', () => {
    expect(spokenClockCoarse(80 * 60 * S + 59 * S)).toBe('1 hour 20 minutes');
    expect(spokenClockCoarse(4 * 60 * S + 59 * S)).toBe('4 minutes');
    expect(spokenClockCoarse(60 * S)).toBe('1 minute');
    expect(spokenClockCoarse(59 * S)).toBe('60 seconds or less');
    expect(spokenClockCoarse(21 * S)).toBe('30 seconds or less');
    expect(spokenClockCoarse(0)).toBe('0 seconds');
    // Every second inside a step reads the same.
    expect(new Set([121, 135, 179].map((x) => spokenClockCoarse(x * S))).size).toBe(1);
  });

  it('durations in words (P7)', () => {
    expect(durationSpoken(80)).toBe('1 hour 20 minutes');
    expect(durationSpoken(240)).toBe('4 hours');
    expect(durationSpoken(61)).toBe('1 hour 1 minute');
    expect(durationSpoken(1)).toBe('1 minute');
  });

  it('short pace lines for very large text (P6)', () => {
    expect(paceShort({ status: 'behind', minutes: 6 })).toBe('About 6 min behind');
    expect(paceShort({ status: 'ahead', minutes: 3 })).toBe('Ahead of pace');
    expect(paceShort({ status: 'onPace', minutes: 0 })).toBe('On pace');
  });

  it('the practice cue speaks about the exam, not a Flag button practice lacks (U-H1)', () => {
    expect(SOFT_CUE_LINE).toBe('Over 2 minutes on this one. On the exam, flag it and move on.');
  });
});

