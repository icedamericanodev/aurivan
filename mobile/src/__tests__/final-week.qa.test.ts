/**
 * QA gaps for the final review week (mobile-qa-tester, commit f026c0a):
 * - an OLD save (moments.examWeek with ticks + Hide, no `days`) rehydrated
 *   from storage keeps its ticks and Hide, and marking a day keeps both;
 * - "Mark this day done" survives an app kill (persist → rehydrate);
 * - a retake (new, later exam date) never shows the old date's day marks,
 *   on this phone or after a sync with a phone still on the old date;
 * - a pulled sync snapshot with tampered day ids is cleaned, not refused;
 * - the Today window edges with and without a plan, Hide included.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CERTIFICATIONS } from '../content/certifications';
import { getFinalWeek } from '../content/exam';
import { examWeekCardDue, examWeekOf, FINAL_WEEK_WINDOW, weekDaysOf } from '../engine/examWeek';
import { mergeSides, readSnapshot, type SyncedProgress } from '../engine/syncMerge';
import { PROGRESS_VERSION } from '../engine/saveMigrations';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const A = '2026-10-26';
const B = '2026-12-14';
const KEY = 'aurivan.progress.v1';
const flush = () => new Promise((r) => setTimeout(r, 20));

describe('upgrade and app kill', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('an old exam-week save keeps its ticks and Hide; marking a day keeps both', async () => {
    const old = { state: { byCert: { cisa: { answers: {}, mistakes: {}, moments: { examWeek: { for: A, done: ['booking', 'sleep'], hidden: true } } } }, days: {} }, version: PROGRESS_VERSION };
    await AsyncStorage.setItem(KEY, JSON.stringify(old));
    await useProgress.persist.rehydrate();
    const saved = selectCert(useProgress.getState(), 'cisa').moments?.examWeek;
    expect(examWeekOf(saved, A)).toEqual({ done: ['booking', 'sleep'], hidden: true });
    expect(weekDaysOf(saved, A)).toEqual([]);
    // Hidden before the upgrade: still hidden in the new, wider window (8 and the eve included).
    expect([8, 5, 1].map((d) => examWeekCardDue(d, saved, A, FINAL_WEEK_WINDOW))).toEqual([false, false, false]);
    useProgress.getState().toggleWeekDay('cisa', A, 'day-5');
    expect(selectCert(useProgress.getState(), 'cisa').moments?.examWeek).toEqual({ for: A, done: ['booking', 'sleep'], hidden: true, days: ['day-5'] });
  });

  it('a day marked done survives an app kill (written to storage, read back)', async () => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, moments: undefined } } }));
    useProgress.getState().toggleWeekDay('cisa', A, 'day-7');
    useProgress.getState().toggleWeekDay('cisa', A, 'day-6');
    await flush();
    // What is on disk at the moment of the kill.
    const disk = (await AsyncStorage.getItem(KEY))!;
    expect(JSON.parse(disk).state.byCert.cisa.moments.examWeek.days).toEqual(['day-7', 'day-6']);
    // "Kill": wipe memory (persist writes that too), put the disk copy back, cold-start load.
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, moments: undefined } } }));
    await flush();
    await AsyncStorage.setItem(KEY, disk);
    await useProgress.persist.rehydrate();
    expect(weekDaysOf(selectCert(useProgress.getState(), 'cisa').moments?.examWeek, A)).toEqual(['day-7', 'day-6']);
  });
});

describe('retake: a new exam date', () => {
  it('this phone: the old date’s marks never show for the new date, and the first mark starts fresh', () => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, moments: undefined } } }));
    for (const d of ['day-7', 'day-6', 'day-1']) useProgress.getState().toggleWeekDay('cisa', A, d);
    useProgress.getState().hideExamWeek('cisa', A);
    const saved = () => selectCert(useProgress.getState(), 'cisa').moments?.examWeek;
    expect(weekDaysOf(saved(), B)).toEqual([]);
    expect(examWeekCardDue(8, saved(), B, FINAL_WEEK_WINDOW)).toBe(true);
    useProgress.getState().toggleWeekDay('cisa', B, 'day-7');
    expect(saved()).toEqual({ for: B, done: [], days: ['day-7'] });
  });

  it('sync with a phone still on the old date: the later date wins, without the old marks', () => {
    const ctx = { now: new Date(2026, 9, 19, 9).getTime(), knownCertIds: CERTIFICATIONS.map((c) => c.id) };
    const side = (examWeek: object) => ({
      state: { byCert: { cisa: { answers: {}, moments: { examWeek } } }, streak: { current: 0, best: 0, lastDay: null } } as unknown as SyncedProgress,
      stamps: {},
    });
    const oldPhone = side({ for: A, done: ['booking'], days: ['day-7', 'day-6'] });
    const newPhone = side({ for: B, done: [] });
    const m = mergeSides('progress', oldPhone, newPhone, ctx).state.byCert.cisa.moments?.examWeek;
    expect(m?.for).toBe(B);
    expect(weekDaysOf(m, B)).toEqual([]);
  });

  it('a pulled snapshot with tampered day ids is cleaned, not refused', () => {
    const ctx = { now: Date.now(), knownCertIds: CERTIFICATIONS.map((c) => c.id) };
    const state = { byCert: { cisa: { answers: {}, moments: { examWeek: { for: A, done: ['pace'], days: ['day-3', 'day-42', 'day-3', 7, '__proto__x'] } } } }, streak: { current: 0, best: 0, lastDay: null } };
    const side = readSnapshot<SyncedProgress>('progress', { state, storeVersion: PROGRESS_VERSION, appVersion: '1.0.0' }, ctx);
    expect(side.state.byCert.cisa.moments?.examWeek).toEqual({ for: A, done: ['pace'], days: ['day-3'] });
  });
});

describe('Today window edges', () => {
  it('the plan’s first day is 7 days out, so 8 is the "starts tomorrow" day', () => {
    expect(getFinalWeek('cisa')!.days[0].daysBefore).toBe(FINAL_WEEK_WINDOW.from - 1);
  });
});
