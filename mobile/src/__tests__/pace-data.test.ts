/**
 * Build D: the pace data in the stores and the backup file.
 * - startMock: Standard / +25% / +50% / Untimed set the right deadline (none when untimed);
 * - finishing a mock keeps its pacing on the result; untimed mocks are
 *   labelled and still count for readiness (their answers are recorded);
 * - timed practice never gets a deadline;
 * - the "Practice at exam pace?" answer persists;
 * - old saves (1.3 settings, mock results and sessions with no pacing) load;
 * - backups carry the new fields and still accept 1.3 files.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllQuestions } from '../content/loader';
import { buildBackup, readBackup } from '../engine/backup';
import { originalToDisplay } from '../engine/shuffle';
import { pacingStats, timingOf } from '../engine/pace';
import { finishSession, sessionPacing } from '../lib/finishSession';
import { Alert } from 'react-native';
import { guardedStart, startMock, startPractice } from '../lib/sessions';
import { selectCert, useProgress, type MockResult } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
const MIN = 60_000;

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});
afterEach(() => jest.useRealTimers());

const active = () => useSession.getState().active!;
/** Answer question `i` of the active mock the way the session screen does. */
function answerMock(i: number, right: boolean, ms: number) {
  const s = active();
  const id = s.questionIds[i];
  const q = getAllQuestions('cisa').find((x) => x.id === id)!;
  const original = right ? q.correct : (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct && q.options[l])!;
  useSession.getState().answer(id, { display: originalToDisplay(original, s.perms[id]), correct: right, ms, at: Date.now() });
}

describe('starting a mock', () => {
  it.each([
    [undefined, 150, 240],
    ['standard', 150, 240],
    ['plus25', 150, 300],
    ['plus50', 150, 360],
    ['standard', 50, 80],
    ['plus25', 50, 100],
    ['plus50', 50, 120],
  ] as const)('%s, %i questions: deadline after %i minutes', (timing, n, minutes) => {
    startMock('cisa', n, timing ? { timing } : {});
    expect(active().deadline).toBe(T0 + minutes * MIN);
    expect(active().timing).toBe(timing ?? 'standard');
  });

  it('untimed: no deadline, and "hide the clock" has nothing to hide', () => {
    startMock('cisa', 50, { timing: 'untimed', hideClock: true });
    expect(active().deadline).toBeUndefined();
    expect(active().hideClock).toBeUndefined();
    expect(active().timing).toBe('untimed');
  });

  it('hide the clock keeps the deadline', () => {
    startMock('cisa', 50, { hideClock: true });
    expect(active()).toMatchObject({ hideClock: true, deadline: T0 + 80 * MIN });
  });
});

describe('finishing a mock keeps its pacing', () => {
  it('timed: allowed minutes, median, unanswered and checkpoint deviations', () => {
    startMock('cisa', 50);
    jest.setSystemTime(T0 + 10 * MIN);
    answerMock(0, true, 60_000);
    answerMock(1, false, 100_000);
    answerMock(2, true, 80_000);
    useSession.getState().setCheckpoints([{ at: 0.25, done: 3, deviation: 0.66, minutes: 13 }]);
    jest.setSystemTime(T0 + 30 * MIN);
    finishSession();
    const [m] = selectCert(useProgress.getState(), 'cisa').mocks;
    expect(m).toMatchObject({ timing: 'standard', minutesAllowed: 80, medianSec: 80, unanswered: 47, checkpoints: [0.66], minutesUsed: 30 });
  });

  it('untimed: labelled, left out of pacing stats, but its answers count for readiness', () => {
    startMock('cisa', 50, { timing: 'untimed' });
    jest.setSystemTime(T0 + 5 * MIN);
    answerMock(0, true, 40_000);
    answerMock(1, true, 50_000);
    const ids = active().questionIds.slice(0, 2);
    jest.setSystemTime(T0 + 200 * MIN); // no deadline: it never ends on its own
    finishSession();
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.mocks[0].timing).toBe('untimed');
    expect(cp.mocks[0].minutesAllowed).toBeUndefined();
    // Untimed: the answer time (40 s + 50 s), not 200 minutes of wall time (C1).
    expect(cp.mocks[0].minutesUsed).toBe(2);
    // Readiness reads the answer records: the untimed answers are there.
    for (const id of ids) expect(cp.answers[id]).toMatchObject({ attempts: 1, lastCorrect: true });
    expect(pacingStats(cp.mocks).mocks).toBe(0);
  });

  it('a mock reopened after its deadline: pacing ends AT the deadline (timed out)', () => {
    startMock('cisa', 50);
    answerMock(0, true, 30_000);
    jest.setSystemTime(T0 + 500 * MIN);
    const p = sessionPacing(active());
    expect(p).toMatchObject({ usedMinutes: 80, allowedMinutes: 80, timedOut: true, unanswered: 49 });
  });
});

describe('starting something new over an expired mock', () => {
  it('records the mock at its deadline instead of asking to discard it', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    startMock('cisa', 50);
    answerMock(0, true, 60_000);
    jest.setSystemTime(T0 + 3 * 60 * MIN); // the 80 minutes ran out while the app was closed
    const started = jest.fn();
    guardedStart(() => startPractice('cisa', { count: 10 }), started);
    expect(alert).not.toHaveBeenCalled();
    expect(started).toHaveBeenCalled();
    const [m] = selectCert(useProgress.getState(), 'cisa').mocks;
    expect(m).toMatchObject({ finishedAt: T0 + 80 * MIN, minutesUsed: 80, unanswered: 49 });
    expect(active().mode).toBe('practice');
    alert.mockRestore();
  });

  it('a mock still inside its time is still protected by the question', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    startMock('cisa', 50);
    guardedStart(() => startPractice('cisa', { count: 10 }), jest.fn());
    expect(alert).toHaveBeenCalledWith('Replace your unfinished session?', expect.any(String), expect.any(Array));
    expect(active().mode).toBe('mock');
    alert.mockRestore();
  });
});

describe('timed practice', () => {
  it('counts up only: no deadline, never submitted for the learner', () => {
    startPractice('cisa', { count: 10, timed: true });
    expect(active()).toMatchObject({ mode: 'practice', timed: true });
    expect(active().deadline).toBeUndefined();
    startPractice('cisa', { count: 10 });
    expect(active().timed).toBeUndefined();
  });
});

describe('the "Practice at exam pace?" answer', () => {
  it('accepting turns the timer default on; dismissing keeps it off; both are remembered', () => {
    useSettings.setState({ practiceTimer: false, paceOffer: undefined });
    useSettings.getState().answerPaceOffer('dismissed');
    expect(useSettings.getState()).toMatchObject({ paceOffer: 'dismissed', practiceTimer: false });
    useSettings.setState({ paceOffer: undefined });
    useSettings.getState().answerPaceOffer('accepted');
    expect(useSettings.getState()).toMatchObject({ paceOffer: 'accepted', practiceTimer: true });
  });
});

describe('choosing in Settings answers the offer too (C5)', () => {
  it('switching the timer on or off in Settings means the card never asks', () => {
    useSettings.setState({ practiceTimer: false, paceOffer: undefined });
    useSettings.getState().setPracticeTimer(true);
    expect(useSettings.getState()).toMatchObject({ practiceTimer: true, paceOffer: 'accepted' });
    useSettings.setState({ practiceTimer: false, paceOffer: undefined });
    useSettings.getState().setPracticeTimer(false);
    expect(useSettings.getState().paceOffer).toBe('dismissed');
    // An earlier answer is kept.
    useSettings.getState().setPracticeTimer(true);
    expect(useSettings.getState().paceOffer).toBe('dismissed');
  });
});

describe('old saves load', () => {
  it('1.3 settings (no study defaults) load with the timer off and the card unanswered', async () => {
    jest.useRealTimers(); // the storage mock resolves on real timers
    // Reset first: a store change writes to storage, which would overwrite the old blob.
    useSettings.setState({ practiceTimer: false, paceOffer: undefined });
    await AsyncStorage.setItem(
      'aurivan.settings.v1',
      JSON.stringify({
        state: { onboarded: true, activeCertId: 'cisa', examDates: {}, theme: 'light', shuffleOptions: true, dailyGoal: 20, reminder: { enabled: false, hour: 19, minute: 0 }, haptics: true, gameRulesSeen: [] },
        version: 1,
      }),
    );
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().practiceTimer).toBe(false);
    expect(useSettings.getState().paceOffer).toBeUndefined();
    expect(useSettings.getState().onboarded).toBe(true);
  });

  it('mock results from before Build D count as standard and stay out of pacing stats', () => {
    const old: MockResult = { id: 'm1', finishedAt: T0, total: 150, correct: 100, minutesUsed: 220, byDomain: {} };
    expect(timingOf(old.timing)).toBe('standard');
    expect(pacingStats([old])).toMatchObject({ mocks: 0, medianSec: null });
  });

  it('a mock session saved before Build D (no timing, no answer times) still scores and finishes', () => {
    startMock('cisa', 50);
    const s = active();
    // Strip the Build D fields, as a 1.3 session would have none.
    const { timing: _t, ...old } = s;
    useSession.getState().start({ ...old, responses: { [s.questionIds[0]]: { display: 'A', correct: false } } });
    jest.setSystemTime(T0 + 10 * MIN);
    finishSession();
    const [m] = selectCert(useProgress.getState(), 'cisa').mocks;
    expect(m.timing).toBe('standard');
    expect(m.medianSec).toBeUndefined();
    expect(m.unanswered).toBe(49);
  });
});

describe('backups carry the pace data', () => {
  const settings = {
    onboarded: true,
    activeCertId: 'cisa',
    examDates: {},
    theme: 'system',
    shuffleOptions: true,
    dailyGoal: 20,
    reminder: { enabled: false, hour: 19, minute: 0 },
    haptics: true,
    gameRulesSeen: [],
  };
  const mock = { id: 'm1', finishedAt: T0, total: 50, correct: 30, minutesUsed: 70, byDomain: {} };
  const progress = (mocks: unknown[]) => ({ byCert: { cisa: { mocks } }, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 } });
  const read = (s: unknown, p: unknown) => readBackup(JSON.stringify(buildBackup({ settings: s, progress: p }, { now: T0, appVersion: '1.4.0' })), ['cisa']);
  /** A file written by hand (not by this app, so nothing is fitted): what a damaged or hostile file looks like. */
  const readRaw = (s: unknown, p: unknown) =>
    readBackup(JSON.stringify({ app: 'aurivan', schema: 1, exportedAt: '', appVersion: '1.4.0', stores: { settings: { version: 1, state: s }, progress: { version: 2, state: p } } }), ['cisa']);

  it('round trip: study defaults and mock pacing survive', () => {
    const paced = { ...mock, timing: 'plus25', minutesAllowed: 100, medianSec: 84, unanswered: 2, checkpoints: [0.05, -0.3, 0.12] };
    const data = read({ ...settings, practiceTimer: true, paceOffer: 'accepted' }, progress([paced]));
    expect(data.settings).toMatchObject({ practiceTimer: true, paceOffer: 'accepted' });
    expect(data.progress.byCert.cisa.mocks![0]).toEqual(paced);
  });

  it('a 1.3 backup (no pace fields) still restores', () => {
    const data = read(settings, progress([mock]));
    expect(data.settings.practiceTimer).toBeUndefined();
    expect(data.progress.byCert.cisa.mocks![0]).toEqual(mock);
  });

  it('bad pace values are refused', () => {
    expect(() => readRaw(settings, progress([{ ...mock, timing: 'turbo' }]))).toThrow('bad-data');
    expect(() => readRaw(settings, progress([{ ...mock, unanswered: 51 }]))).toThrow('bad-data');
    expect(() => readRaw({ ...settings, paceOffer: 'maybe' }, progress([]))).toThrow('bad-data');
  });
});
