/**
 * Mobile 2.2: the practice countdown in the session factory and the session store (no screen).
 * Plain English for the founder, what these prove:
 * - a set started with a countdown gets a time budget from its REAL length, and still no deadline;
 * - a pool smaller than asked gives a shorter set and a shorter time; an empty pool starts nothing;
 * - everything that existed before starts exactly as before (untimed, the old "Timed" switch = count
 *   up, the first set, the 10-question focus set);
 * - the time used is saved and comes back after the app is killed; the stop at zero happens once;
 * - "Finish now" never marks an unanswered question wrong and records each answer once;
 * - a damaged saved countdown changes nothing and crashes nothing;
 * - MOCK EXAMS are untouched: same fields, same deadline rules, and the countdown's store actions
 *   refuse to touch a mock.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllQuestions } from '../content/loader';
import { readCountdown, remainingMs, stageOf, timerKindOf } from '../engine/practiceCountdown';
import { finishSession, minutesUsed, msUsed, scoreSession } from '../lib/finishSession';
import { startFirstSet } from '../lib/firstSet';
import { FOCUS_SET_SIZE, guardedStart, practiceSetLength, startFocusPractice, startFromIds, startMock, startPractice, startReview } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession, type ActiveSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const S = 1000;
const MIN = 60 * S;
const KEY = 'aurivan.session.v1';
const flush = () => new Promise((r) => setTimeout(r, 20));
const active = () => useSession.getState().active!;
const all = getAllQuestions('cisa');

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ activeCertId: 'cisa', practiceTimer: false, shuffleOptions: true });
});

describe('starting a practice set with a countdown', () => {
  it('one domain, 10 questions at 90 s each: a 15 minute budget beside `timed`, and no deadline', () => {
    const s = startPractice('cisa', { count: 10, domainId: '4', title: 'IS Operations', countdownSec: 90 })!;
    expect(s.questionIds).toHaveLength(10);
    expect(s.questionIds.every((id) => all.find((q) => q.id === id)?.domainId === '4')).toBe(true);
    expect(s.countdown).toEqual({ budgetMs: 15 * MIN, usedMs: 0 });
    expect(s.timed).toBe(true);
    expect(s.deadline).toBeUndefined();
    expect(timerKindOf(s)).toBe('countdown');
  });

  it('the countdown wins over the Timed switch being off for that one set, and changes no setting', () => {
    const s = startPractice('cisa', { count: 20, timed: false, countdownSec: 60 })!;
    expect(s.countdown).toEqual({ budgetMs: 20 * MIN, usedMs: 0 });
    expect(s.timed).toBe(true);
    expect(useSettings.getState().practiceTimer).toBe(false);
  });

  it('a pool smaller than asked: the set and its time follow the real length', () => {
    const ids = all.filter((q) => q.domainId === '2').slice(0, 7).map((q) => q.id);
    expect(practiceSetLength('cisa', { count: 10, domainId: '2', ids })).toBe(7);
    const s = startPractice('cisa', { count: 10, domainId: '2', ids, countdownSec: 90 })!;
    expect(s.questionIds).toHaveLength(7);
    expect(s.countdown).toEqual({ budgetMs: 11 * MIN, usedMs: 0 }); // 7 × 90 s = 10.5 → 11 min
  });

  it('the real length is never more than asked, and is whole', () => {
    expect(practiceSetLength('cisa', { count: 10 })).toBe(10);
    expect(practiceSetLength('cisa', { count: 10, domainId: '1' })).toBe(10);
    expect(practiceSetLength('cisa', { count: 0 })).toBe(0);
    expect(practiceSetLength('cisa', { count: -4 })).toBe(0);
    expect(practiceSetLength('cisa', { count: NaN })).toBe(0);
    expect(practiceSetLength('cisa', { count: 10.9, ids: all.slice(0, 3).map((q) => q.id) })).toBe(3);
  });

  it('an empty pool starts nothing and lands on the usual empty state', () => {
    expect(practiceSetLength('cisa', { count: 10, domainId: 'no-such-domain' })).toBe(0);
    expect(startPractice('cisa', { count: 10, domainId: 'no-such-domain', countdownSec: 90 })).toBeNull();
    expect(useSession.getState().active).toBeNull();
    const started = jest.fn();
    const empty = jest.fn();
    guardedStart(() => startPractice('cisa', { count: 10, ids: [], countdownSec: 90 }), started, empty);
    expect(started).not.toHaveBeenCalled();
    expect(empty).toHaveBeenCalledTimes(1);
  });

  it('a pace that makes no sensible budget gives a count-up set, never a broken countdown', () => {
    for (const bad of [0, -90, NaN, Infinity, 100_000]) {
      const s = startPractice('cisa', { count: 10, countdownSec: bad })!;
      expect(s.countdown).toBeUndefined();
      expect(s.timed).toBe(true);
      expect(timerKindOf(s)).toBe('countUp');
      expect(s.deadline).toBeUndefined();
    }
  });

  it('"Hide the clock" is kept only with a countdown (there is nothing else to hide)', () => {
    expect(startPractice('cisa', { count: 10, countdownSec: 90, hideClock: true })!.hideClock).toBe(true);
    expect('hideClock' in startPractice('cisa', { count: 10, countdownSec: 90 })!).toBe(false);
    expect('hideClock' in startPractice('cisa', { count: 10, timed: true, hideClock: true })!).toBe(false);
    expect('hideClock' in startPractice('cisa', { count: 10, hideClock: true })!).toBe(false);
    // A countdown that could not be made counts up, with its clock showing.
    expect('hideClock' in startPractice('cisa', { count: 10, countdownSec: NaN, hideClock: true })!).toBe(false);
  });
});

describe('everything that existed before starts exactly as before', () => {
  it('untimed practice has no timer fields at all', () => {
    const s = startPractice('cisa', { count: 10 })!;
    expect('timed' in s).toBe(false);
    expect('countdown' in s).toBe(false);
    expect('deadline' in s).toBe(false);
    expect(timerKindOf(s)).toBe('untimed');
  });

  it('the old "Timed practice" setting (only `practiceTimer: true`) still means COUNT UP, everywhere', () => {
    useSettings.setState({ practiceTimer: true });
    const sets = [
      startPractice('cisa', { count: 10 })!,
      startPractice('cisa', { count: 10, domainId: '3', title: 'IS Acquisition' })!,
      startFromIds('cisa', all.slice(0, 4).map((q) => q.id), 'Saved questions')!,
    ];
    for (const s of sets) {
      expect(s.timed).toBe(true);
      expect(s.countdown).toBeUndefined();
      expect(timerKindOf(s)).toBe('countUp');
    }
    // `timed: true` asked for outright (Practice's switch) is count up too.
    expect(timerKindOf(startPractice('cisa', { count: 10, timed: true }))).toBe('countUp');
    // ... and the switch off for one set stays off.
    expect(timerKindOf(startPractice('cisa', { count: 10, timed: false }))).toBe('untimed');
  });

  it('the first set never has a timer, even with Timed practice on', () => {
    useSettings.setState({ practiceTimer: true });
    const s = startFirstSet('cisa')!;
    expect(s.timed).toBeUndefined();
    expect(s.countdown).toBeUndefined();
    expect(timerKindOf(s)).toBe('untimed');
  });

  it('the one-tap focus set is still 10 questions in that domain, with no countdown', () => {
    expect(FOCUS_SET_SIZE).toBe(10);
    const s = startFocusPractice('cisa', { id: '5', short: 'Info Protection' })!;
    expect(s.questionIds).toHaveLength(10);
    expect(s.title).toBe('Info Protection');
    expect(s.countdown).toBeUndefined();
    expect(timerKindOf(s)).toBe('untimed');
  });

  it('a review never gets a countdown', () => {
    useProgress.getState().queueForReview('cisa', all.slice(0, 3).map((q) => q.id));
    const s = startReview('cisa');
    if (s) expect(s.countdown).toBeUndefined();
  });

  it('a session saved by an older app (only `timed: true`) loads as count up and is never given a countdown', async () => {
    const ids = all.slice(0, 3).map((q) => q.id);
    startFromIds('cisa', ids, 'Practice', { timed: true });
    await flush();
    const disk = JSON.parse((await AsyncStorage.getItem(KEY))!);
    expect(disk.state.active.timed).toBe(true);
    expect('countdown' in disk.state.active).toBe(false);
    useSession.setState({ active: null });
    await flush();
    await AsyncStorage.setItem(KEY, JSON.stringify(disk));
    await useSession.persist.rehydrate();
    const before = active();
    expect(timerKindOf(before)).toBe('countUp');
    // The countdown's actions leave it alone.
    useSession.getState().bankCountdown(5 * MIN);
    useSession.getState().answerCountdown('untimed');
    expect(active()).toBe(before);
  });
});

describe('the time used is saved, and the stop at zero happens once', () => {
  it('banks answering time and keeps the rest', () => {
    startPractice('cisa', { count: 10, countdownSec: 90 });
    useSession.getState().bankCountdown(45 * S);
    useSession.getState().bankCountdown(15 * S);
    expect(active().countdown).toEqual({ budgetMs: 15 * MIN, usedMs: 60 * S });
    // Nonsense adds nothing.
    for (const bad of [0, -5 * S, NaN, Infinity]) useSession.getState().bankCountdown(bad);
    expect(active().countdown).toEqual({ budgetMs: 15 * MIN, usedMs: 60 * S });
  });

  it('killed and reopened: the same time is left, however long the app was closed', async () => {
    startPractice('cisa', { count: 10, countdownSec: 90 });
    useSession.getState().bankCountdown(4 * MIN);
    await flush();
    const disk = (await AsyncStorage.getItem(KEY))!;
    // No clock time for the countdown on disk: only the budget and the time used.
    expect(JSON.parse(disk).state.active.countdown).toEqual({ budgetMs: 15 * MIN, usedMs: 4 * MIN });
    expect(JSON.parse(disk).state.active.deadline).toBeUndefined();
    // "Kill": wipe memory, put the disk copy back, cold-start load, a week later.
    useSession.setState({ active: null });
    await flush();
    await AsyncStorage.setItem(KEY, disk);
    const realNow = Date.now;
    Date.now = () => realNow() + 7 * 24 * 60 * MIN;
    try {
      await useSession.persist.rehydrate();
      const back = readCountdown(active().countdown)!;
      expect(remainingMs(back)).toBe(11 * MIN);
      expect(stageOf(back)).toBe('running');
      expect(active().finishedAt).toBeUndefined();
    } finally {
      Date.now = realNow;
    }
  });

  it('at zero it stops once, notes how many were answered, and submits nothing', () => {
    const s = startPractice('cisa', { count: 10, countdownSec: 60 })!;
    useSession.getState().answer(s.questionIds[0], { display: 'A', correct: true });
    useSession.getState().answer(s.questionIds[1], { display: 'B', correct: false });
    useSession.getState().bankCountdown(9 * MIN + 58 * S);
    useSession.getState().bankCountdown(5 * S); // crosses zero
    const atZero = active();
    expect(atZero.countdown).toEqual({ budgetMs: 10 * MIN, usedMs: 10 * MIN, expiredAfter: 2 });
    expect(atZero.finishedAt).toBeUndefined();
    expect(atZero.index).toBe(0);
    // Late ticks, repeated ticks, an answer in the same second: the expiry never moves.
    useSession.getState().bankCountdown(5 * S);
    useSession.getState().bankCountdown(0);
    expect(active()).toBe(atZero);
    useSession.getState().answer(s.questionIds[2], { display: 'C', correct: true });
    useSession.getState().bankCountdown(60 * MIN);
    expect(active().countdown).toEqual(atZero.countdown);
  });

  it('the state at zero survives a kill; "Keep going untimed" is taken once and nothing else changes', async () => {
    const s = startPractice('cisa', { count: 10, countdownSec: 60 })!;
    useSession.getState().answer(s.questionIds[0], { display: 'A', correct: true });
    useSession.getState().goTo(1);
    useSession.getState().bankCountdown(10 * MIN);
    await flush();
    const disk = (await AsyncStorage.getItem(KEY))!;
    useSession.setState({ active: null });
    await flush();
    await AsyncStorage.setItem(KEY, disk);
    await useSession.persist.rehydrate();
    expect(stageOf(readCountdown(active().countdown)!)).toBe('expired'); // the sheet is due again
    const responses = active().responses;
    useSession.getState().answerCountdown('untimed');
    const kept = active();
    expect(kept.countdown).toEqual({ budgetMs: 10 * MIN, usedMs: 10 * MIN, expiredAfter: 1, after: 'untimed' });
    // The same set, the same place, the same answers.
    expect(kept.questionIds).toEqual(s.questionIds);
    expect(kept.index).toBe(1);
    expect(kept.responses).toBe(responses);
    expect(kept.finishedAt).toBeUndefined();
    // Tapped again, or the other button after it: nothing.
    useSession.getState().answerCountdown('untimed');
    useSession.getState().answerCountdown('finished');
    expect(active()).toBe(kept);
  });

  it('there is nothing to answer before zero', () => {
    startPractice('cisa', { count: 10, countdownSec: 60 });
    const running = active();
    useSession.getState().answerCountdown('finished');
    useSession.getState().answerCountdown('untimed');
    expect(active()).toBe(running);
  });
});

describe('"Finish now": what was answered counts once, and nothing else is touched', () => {
  it('unanswered questions are never marked wrong, missed or queued', () => {
    const s = startPractice('cisa', { count: 10, countdownSec: 60 })!;
    const [a, b, ...rest] = s.questionIds;
    // The screen records each checked answer as it is given (progress, then the session).
    useProgress.getState().recordAnswer('cisa', a, true);
    useSession.getState().answer(a, { display: 'A', correct: true });
    useProgress.getState().recordAnswer('cisa', b, false);
    useSession.getState().answer(b, { display: 'B', correct: false });
    useProgress.getState().recordMistake('cisa', b, 'B');
    useSession.getState().bankCountdown(10 * MIN);
    const before = selectCert(useProgress.getState(), 'cisa');

    useSession.getState().answerCountdown('finished');
    finishSession();
    // Tapped twice, or finished again by something else: one result.
    const finishedAt = active().finishedAt;
    finishSession();
    useSession.getState().answerCountdown('untimed');
    expect(active().finishedAt).toBe(finishedAt);
    expect(active().countdown).toEqual({ budgetMs: 10 * MIN, usedMs: 10 * MIN, expiredAfter: 2, after: 'finished' });

    const score = scoreSession(active());
    expect(score).toMatchObject({ total: 10, answered: 2, correct: 1 });
    expect(Object.values(score.byDomain).reduce((n, d) => n + d.total, 0)).toBe(2);
    const cp = selectCert(useProgress.getState(), 'cisa');
    // Finishing recorded nothing new: the two answers, once each.
    expect(Object.keys(cp.answers).sort()).toEqual([a, b].sort());
    expect(cp.answers).toEqual(before.answers);
    expect(Object.keys(cp.mistakes)).toEqual([b]);
    for (const id of rest) {
      expect(cp.answers[id]).toBeUndefined();
      expect(cp.mistakes[id]).toBeUndefined();
      expect(cp.review[id]).toBeUndefined();
    }
    expect(cp.mocks).toHaveLength(0);
  });

  it('the time a countdown set used is still its answer times (never the budget or the wall clock)', () => {
    const s = startPractice('cisa', { count: 10, countdownSec: 60 })!;
    useSession.getState().answer(s.questionIds[0], { display: 'A', correct: true, ms: 40 * S });
    useSession.getState().bankCountdown(10 * MIN);
    expect(msUsed(active())).toBe(40 * S);
  });
});

describe('a damaged saved countdown changes nothing and crashes nothing', () => {
  const damaged: unknown[] = [null, 'x', 7, [], {}, { budgetMs: 0, usedMs: 0 }, { budgetMs: -1, usedMs: 0 }, { budgetMs: NaN, usedMs: 0 }, { budgetMs: 15 * MIN, usedMs: -9 }, { budgetMs: 1e15, usedMs: 0 }];

  it('the set is count up, and the countdown actions leave it alone', () => {
    for (const countdown of damaged) {
      const s = startFromIds('cisa', all.slice(0, 3).map((q) => q.id), 'Practice', { timed: true })!;
      useSession.setState({ active: { ...s, countdown } as ActiveSession });
      const before = active();
      expect(timerKindOf(before)).toBe('countUp');
      expect(() => {
        useSession.getState().bankCountdown(5 * S);
        useSession.getState().answerCountdown('finished');
        useSession.getState().answerCountdown('untimed');
      }).not.toThrow();
      expect(active()).toBe(before);
      expect(() => finishSession()).not.toThrow();
      useSession.getState().clear();
    }
  });
});

describe('mock exams are untouched (regression)', () => {
  it('a mock has exactly the fields it had: a deadline, and no countdown or `timed`', () => {
    useSettings.setState({ practiceTimer: true }); // the practice default never reaches a mock
    const t0 = Date.now();
    const s = startMock('cisa', 50)!;
    expect(Object.keys(s).sort()).toEqual(['before', 'certId', 'deadline', 'flagged', 'id', 'index', 'mode', 'perms', 'questionIds', 'responses', 'startedAt', 'timing', 'title'].sort());
    expect(s.timing).toBe('standard');
    // 50 of 150 questions in 240 minutes: 80 minutes, a wall-clock deadline as before.
    expect(s.deadline! - t0).toBeGreaterThanOrEqual(80 * MIN);
    expect(s.deadline! - t0).toBeLessThan(80 * MIN + 2 * S);
    expect(timerKindOf(s)).toBe('untimed'); // none of the practice timers
    const untimed = startMock('cisa', 50, { timing: 'untimed' })!;
    expect(untimed.deadline).toBeUndefined();
    expect('countdown' in untimed).toBe(false);
  });

  it('the countdown actions refuse a mock, even one with a stray countdown field', () => {
    const s = startMock('cisa', 5)!;
    useSession.setState({ active: { ...s, timed: true, countdown: { budgetMs: 10 * MIN, usedMs: 0 } } });
    const before = active();
    useSession.getState().bankCountdown(60 * MIN);
    useSession.getState().answerCountdown('untimed');
    useSession.getState().answerCountdown('finished');
    expect(active()).toBe(before);
    expect(timerKindOf(before)).toBe('untimed');
  });

  it('a mock submitted late is still recorded AT its deadline, and unanswered still count as not correct', () => {
    startMock('cisa', 5);
    const a = active();
    useSession.setState({ active: { ...a, startedAt: Date.now() - 3 * 60 * MIN, deadline: Date.now() - 2 * 60 * MIN } });
    const late = active();
    expect(minutesUsed(late)).toBe(60);
    finishSession();
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.mocks[0]).toMatchObject({ total: 5, correct: 0, minutesUsed: 60, unanswered: 5, timing: 'standard' });
    expect(active().finishedAt).toBe(late.deadline);
    // Skipped mock questions come back for review, exactly as before.
    expect(Object.keys(cp.review)).toHaveLength(5);
    expect(scoreSession(active())).toMatchObject({ total: 5, answered: 0, correct: 0 });
  });

  it('starting something new over a mock whose time ran out still records that mock first', () => {
    startMock('cisa', 5);
    const a = active();
    useSession.setState({ active: { ...a, startedAt: Date.now() - 3 * 60 * MIN, deadline: Date.now() - 2 * 60 * MIN } });
    const started = jest.fn();
    guardedStart(() => startPractice('cisa', { count: 10, countdownSec: 90 }), started);
    expect(selectCert(useProgress.getState(), 'cisa').mocks).toHaveLength(1);
    expect(started).toHaveBeenCalledTimes(1);
    expect(active().mode).toBe('practice');
    expect(active().countdown).toEqual({ budgetMs: 15 * MIN, usedMs: 0 });
  });
});
