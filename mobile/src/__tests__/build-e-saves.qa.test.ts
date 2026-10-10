/**
 * QA Build E (PR #34): saves and backups from mobile 1.4 in 1.5.
 *
 * - A 1.4 save (the exact store shapes 1.4.0 wrote: practice timer, pace
 *   offer, answer times, mastery, Build D mock pacing; no study mode, no
 *   study path, no note cards) loads, and every study mode and Root or
 *   Rumor work on it from the start.
 * - After studying in 1.5 (In order place, Guided topic, note cards, study
 *   defaults), a backup saves and restores on a new phone unchanged.
 * - A backup FILE made by 1.4.0 restores on a 1.5 phone that already has
 *   Build E data: the phone takes the backup's state (no stale place left).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNotes } from '../content/notes';
import { buildRumorRound, rumorStatements } from '../engine/games/rootOrRumor';
import { createRng } from '../engine/random';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { checkBackupText, currentBackup, restoreBackup, undoRestore } from '../lib/backup';
import { scopeTopics } from '../lib/outline';
import { advancePath, startGuidedStep, startStudy } from '../lib/sessions';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.5.0' } } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  scheduleNotificationAsync: async (req: { identifier: string }) => req.identifier,
}));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

const T = 1_791_000_000_000; // early Oct 2026

// ── The shapes mobile 1.4.0 wrote (store files at e89ca39) ───────────────
const SETTINGS_1_4 = {
  state: {
    onboarded: true,
    activeCertId: 'cisa',
    examDates: { cisa: '2026-11-20' },
    theme: 'light',
    shuffleOptions: true,
    dailyGoal: 20,
    reminder: { enabled: false, hour: 7, minute: 15, days: [1, 3, 5] },
    haptics: true,
    gameRulesSeen: ['sprint', 'daylight'],
    practiceTimer: true,
    paceOffer: 'accepted',
  },
  version: SETTINGS_VERSION,
};
const PROGRESS_1_4 = {
  state: {
    byCert: {
      cisa: {
        answers: {
          d1_001: { attempts: 2, correctCount: 2, lastCorrect: true, lastAt: T, ms: 41_000, lastConfidence: 'sure' },
          d2_010: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: T + 1000, ms: 75_000, lastConfidence: 'unsure' },
          d4_100: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T - 20 * 86_400_000, lastAssisted: true },
        },
        review: { d2_010: { box: 1, dueAt: T + 1000, lastSeen: T + 1000, reps: 1 } },
        bookmarks: ['d3_005'],
        mocks: [
          {
            id: 'm1',
            finishedAt: T,
            total: 50,
            correct: 31,
            minutesUsed: 74,
            byDomain: { '1': { total: 10, correct: 7 } },
            timing: 'plus25',
            minutesAllowed: 75,
            medianSec: 80,
            unanswered: 0,
            checkpoints: [0.05, -0.02, 0.1],
          },
        ],
        lessonsDone: ['cisa-l-d1-charter'],
        mistakes: { d2_010: { picked: 'B', at: T + 1000, confidence: 'unsure' } },
        gameBest: { trap: 9, daylight: 7 },
        gameRecent: { trap: [5, 9], daylight: [7] },
        notesRead: ['1A1.1'],
        moments: { readiness: [{ day: '2026-10-09', min: 41.5, last: 44 }] },
        mastery: { '1A1.1': { firstDay: '2026-10-01', firstAt: T - 9 * 86_400_000 } },
      },
    },
    streak: { current: 4, best: 6, lastDay: '2026-10-09', recentDays: ['2026-10-08', '2026-10-09'] },
    today: { day: '2026-10-09', answered: 12 },
    days: {},
  },
  version: PROGRESS_VERSION,
};

async function loadSave(settings: unknown, progress: unknown) {
  useSettings.setState(useSettings.getInitialState());
  useProgress.setState(useProgress.getInitialState());
  useSession.getState().clear();
  await new Promise((done) => setTimeout(done, 0));
  await AsyncStorage.clear();
  await AsyncStorage.setItem('aurivan.settings.v1', JSON.stringify(settings));
  await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(progress));
  await useSettings.persist.rehydrate();
  await useProgress.persist.rehydrate();
}
const cp = () => selectCert(useProgress.getState(), 'cisa');
const plain = () => ({
  s: JSON.parse(JSON.stringify(useSettings.getState())),
  p: JSON.parse(JSON.stringify({ ...useProgress.getState(), days: {} })),
});

describe('a 1.4 save in 1.5', () => {
  it('loads unchanged; the study fields start empty and the suggestion picks the mode', async () => {
    await loadSave(SETTINGS_1_4, PROGRESS_1_4);
    expect(useSettings.getState()).toMatchObject(SETTINGS_1_4.state);
    expect(useSettings.getState().studyMode).toBeUndefined();
    expect(cp()).toMatchObject(PROGRESS_1_4.state.byCert.cisa);
    expect(cp().studyPath).toBeUndefined();
    expect(cp().cards).toBeUndefined();
  });

  it('every study mode, Guided and Root or Rumor work on it (timed, as its default says)', async () => {
    await loadSave(SETTINGS_1_4, PROGRESS_1_4);
    for (const mode of ['smart', 'inOrder', 'random'] as const) {
      const s = startStudy('cisa', { mode, count: 10 })!;
      expect(s.questionIds).toHaveLength(10);
      expect(s.timed).toBe(true);
      useSession.getState().clear();
    }
    // Smart sees the due review from 1.4.
    expect(Object.values(startStudy('cisa', { mode: 'smart', count: 10 })!.reasons!)).toContain('due');
    useSession.getState().clear();
    expect(startGuidedStep('cisa', scopeTopics('cisa')[0].id)!.questionIds).toHaveLength(5);
    const round = buildRumorRound(rumorStatements(getNotes('cisa')), cp().cards, 'seedling', createRng(1), Date.now());
    expect(round).toHaveLength(12);
  });

  it('after studying in 1.5, a backup restores on a new phone with every new field', async () => {
    await loadSave(SETTINGS_1_4, PROGRESS_1_4);
    const st = useSettings.getState();
    st.setStudyMode('inOrder');
    st.setStudyDomain('4');
    st.setStudySize(20);
    const s = startStudy('cisa', { mode: 'inOrder', domainId: '4', count: 20 })!;
    s.questionIds.slice(0, 3).forEach((id) => advancePath(s, id));
    useProgress.getState().setPathCursor('cisa', 'guided', 'all', scopeTopics('cisa')[2].id);
    const r = buildRumorRound(rumorStatements(getNotes('cisa')), undefined, 'sapling', createRng(5), Date.now());
    r.forEach((x, k) => useProgress.getState().recordCard('cisa', x.id, k % 3 !== 0));
    useSession.getState().clear();
    const before = plain();
    expect(before.p.byCert.cisa.studyPath).toEqual({ inOrder: { '4': s.questionIds[2] }, guided: { all: scopeTopics('cisa')[2].id } });
    expect(Object.keys(before.p.byCert.cisa.cards).length).toBeGreaterThan(0);

    const text = JSON.stringify(currentBackup());
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: true });
    useProgress.setState(useProgress.getInitialState());
    useBackup.setState({ lastBackupAt: null, undo: null });
    const read = checkBackupText(text);
    if (read.kind !== 'ok') throw new Error(`backup refused: ${read.code}`);
    await restoreBackup(read.data);
    const after = plain();
    expect(after.s).toEqual(before.s);
    expect(after.p.byCert).toEqual(before.p.byCert);
    // And In order carries on where it stopped.
    const next = startStudy('cisa', { mode: 'inOrder', domainId: '4', count: 20 })!;
    expect(next.questionIds.slice(0, 3)).toEqual(s.questionIds.slice(3, 6));
  });

  /** A 1.4.0 backup file, and a phone that has since studied in 1.5. */
  async function oldFileOnNewPhone() {
    await loadSave(SETTINGS_1_4, PROGRESS_1_4);
    const file = { ...currentBackup(), appVersion: '1.4.0' };
    for (const k of ['studyMode', 'studyDomain', 'studySize']) delete (file.stores.settings.state as Record<string, unknown>)[k];
    const old = JSON.stringify(file);
    expect(old).not.toMatch(/studyPath|"cards"|studyMode|studyDomain|studySize/);
    useSettings.getState().setStudyMode('smart');
    useSettings.getState().setStudyDomain('3');
    useSettings.getState().setStudySize(50);
    useProgress.getState().setPathCursor('cisa', 'inOrder', 'all', 'd1_010');
    useProgress.getState().recordCard('cisa', 'rumor:1A1.1:abc', false);
    const read = checkBackupText(old);
    if (read.kind !== 'ok') throw new Error(`backup refused: ${read.code}`);
    return read.data;
  }

  it('a backup file made by 1.4.0 restores over Build E progress: place and cards come from the backup', async () => {
    await restoreBackup(await oldFileOnNewPhone());
    expect(useSettings.getState().practiceTimer).toBe(true);
    expect(cp().studyPath).toBeUndefined();
    expect(cp().cards).toBeUndefined();
    expect(cp().answers).toEqual(PROGRESS_1_4.state.byCert.cisa.answers);
    // In order starts from the top again.
    expect(startStudy('cisa', { mode: 'inOrder', count: 10 })!.questionIds[0]).not.toBe('d1_010');
  });

  // FIXED (was Minor): restoring a backup that has no study defaults (any 1.4
  // file, or a 1.5 learner who never picked a mode) keeps THIS phone's
  // studyMode / studyDomain / studySize. writeAll (lib/backup.ts) spreads
  // the initial settings, where these keys are undefined; JSON drops
  // undefined keys, and persist's rehydrate MERGES the saved row into the
  // live state, so the old values survive. The same makes "Undo restore"
  // keep the restored backup's mode. (paceOffer has had the same gap since 1.4.)
  it('restoring a backup without study defaults clears them (the phone takes the backup’s state)', async () => {
    await restoreBackup(await oldFileOnNewPhone());
    expect(useSettings.getState()).toMatchObject({ studyMode: undefined, studyDomain: undefined, studySize: undefined });
  });

  it('"Undo restore" puts the study defaults back as they were (none)', async () => {
    await loadSave(SETTINGS_1_4, PROGRESS_1_4);
    useBackup.setState({ lastBackupAt: null, undo: null });
    // A backup that has a mode, restored onto a phone that never chose one.
    useSettings.getState().setStudyMode('inOrder');
    const withMode = checkBackupText(JSON.stringify(currentBackup()));
    useSettings.getState().setStudyMode(undefined);
    if (withMode.kind !== 'ok') throw new Error(withMode.code);
    await restoreBackup(withMode.data);
    expect(useSettings.getState().studyMode).toBe('inOrder');
    expect((await undoRestore()).kind).toBe('ok');
    expect(useSettings.getState().studyMode).toBeUndefined();
  });

  it('a session paused in 1.4 (no path / reasons) still records answers without moving any place', async () => {
    await loadSave(SETTINGS_1_4, PROGRESS_1_4);
    const s = startStudy('cisa', { mode: 'random', count: 10 })!;
    const legacy = { ...s, path: undefined, reasons: undefined };
    advancePath(legacy, s.questionIds[0]);
    expect(cp().studyPath).toBeUndefined();
  });
});
