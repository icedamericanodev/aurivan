/**
 * QA Build C — saves from mobile 1.1 and 1.2 still load in 1.3, and a
 * learner who updated from them can save a backup that restores.
 *
 * The blobs below use the exact shapes those versions wrote to the phone
 * (checked against the store files at the 1.1 and 1.2 commits):
 * - 1.1 (Forest, before Grove): progress store version 1 with no Today plan,
 *   no notesRead / gameRecent / moments; settings with a reminder that has
 *   no `days`, and no `haptics` / `gameRulesSeen`.
 * - 1.2: progress store version 2 (`days` per cert), study notes, game score
 *   history, exam-ready moments, a capped review item; settings with day chips.
 *
 * The risk tested here is the cross-feature one: old data loads through the
 * store's own migration, but the backup checker (engine/backup.ts) is a
 * separate, stricter reader. Any old value it refuses would make the
 * learner's backup impossible to restore.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.3.0' } } }));
const mockScheduled = new Map<string, { identifier: string; trigger?: unknown }>();
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => [...mockScheduled.values()],
  cancelScheduledNotificationAsync: async (id: string) => {
    mockScheduled.delete(id);
  },
  scheduleNotificationAsync: async (req: { identifier: string; trigger: unknown }) => {
    mockScheduled.set(req.identifier, req);
    return req.identifier;
  },
}));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

const NOW = new Date(2026, 9, 10, 9, 0, 0).getTime();
const T = 1_791_000_000_000; // early Oct 2026

// ── Mobile 1.1 ───────────────────────────────────────────────────────────
const SETTINGS_1_1 = {
  state: { onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2026-12-01' }, theme: 'dark', shuffleOptions: false, dailyGoal: 40, reminder: { enabled: true, hour: 19, minute: 0 } },
  version: 1,
};
const PROGRESS_1_1 = {
  state: {
    byCert: {
      cisa: {
        answers: {
          d1_001: { attempts: 2, correctCount: 1, lastCorrect: true, lastAt: T },
          d2_010: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: T + 1000 },
        },
        review: { d2_010: { box: 1, dueAt: T + 86_400_000, lastSeen: T + 1000, reps: 1 } },
        bookmarks: ['d3_005'],
        mocks: [{ id: 'm1', finishedAt: T, total: 50, correct: 31, minutesUsed: 74, byDomain: { '1': { total: 10, correct: 7 } } }],
        lessonsDone: ['cisa-l-d1-engagement'],
        // A skipped mock item: no `picked` (undefined is dropped by JSON).
        mistakes: { d2_010: { at: T + 1000, resolved: false }, d4_100: { picked: 'C', at: T, slip: 'role' } },
        gameBest: { trap: 6 },
      },
    },
    streak: { current: 3, best: 3, lastDay: '2026-10-05', recentDays: ['2026-10-03', '2026-10-04', '2026-10-05'] },
    today: { day: '2026-10-05', answered: 2 },
  },
  version: 1,
};

// ── Mobile 1.2 ───────────────────────────────────────────────────────────
const SETTINGS_1_2 = {
  state: {
    onboarded: true,
    activeCertId: 'cisa',
    examDates: { cisa: '2026-11-20' },
    theme: 'system',
    shuffleOptions: true,
    dailyGoal: 20,
    reminder: { enabled: true, hour: 7, minute: 15, days: [1, 3, 5] },
    haptics: false,
    gameRulesSeen: ['sprint', 'trap'],
  },
  version: 1,
};
const PROGRESS_1_2 = {
  state: {
    byCert: {
      cisa: {
        answers: { d1_001: { attempts: 3, correctCount: 2, lastCorrect: true, lastAt: T, lastAssisted: true } },
        review: { d1_001: { box: 3, dueAt: T + 5 * 86_400_000, lastSeen: T, reps: 3 } },
        bookmarks: [],
        mocks: [],
        lessonsDone: [],
        mistakes: { d1_001: { picked: 'A', at: T - 1000, resolved: true, confidence: 'sure', slip: 'priority' } },
        gameBest: { trap: 9, sprint: 14, priority: 8 },
        gameRecent: { trap: [5, 9], sprint: [14] },
        notesRead: ['1A1.1', '4B1.2'],
        moments: { readiness: [{ day: '2026-10-08', min: null, last: null }, { day: '2026-10-09', min: 41.5, last: 44 }], readySeenAt: T },
      },
    },
    streak: { current: 9, best: 12, lastDay: '2026-10-09', restDay: '2026-10-07', recentDays: ['2026-10-08', '2026-10-09'] },
    today: { day: '2026-10-09', answered: 14 },
    days: {
      cisa: {
        day: '2026-10-09',
        certId: 'cisa',
        items: [
          { kind: 'review', count: 31, label: 'Review 20 due', capped: true },
          { kind: 'lesson', lessonId: 'cisa-l-d1-engagement', title: 'Engagement letters' },
          { kind: 'practice', count: 10, label: '10 questions · IS Operations', domainId: '4' },
          { kind: 'game', gameId: 'sprint', label: 'Sure Footing' },
          { kind: 'mock', questions: 50, label: 'Mini mock' },
        ],
        done: [true, false, true, false, false],
        start: { score: 38, domains: { '1': 0.4, '4': 0.2 } },
        answered: 14,
        correct: 10,
        minutes: 21,
        celebrated: false,
        credit: [20, 0, 10, 0, 0],
      },
    },
  },
  version: 2,
};

async function loadSave(settings: unknown, progress: unknown) {
  // The storage mock settles on real timers.
  jest.useRealTimers();
  // Reset first: a store's setState also writes to the phone.
  useSettings.setState(useSettings.getInitialState());
  useProgress.setState(useProgress.getInitialState());
  await new Promise((done) => setTimeout(done, 0));
  await AsyncStorage.clear();
  await AsyncStorage.setItem('aurivan.settings.v1', JSON.stringify(settings));
  await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(progress));
  await useSettings.persist.rehydrate();
  await useProgress.persist.rehydrate();
  jest.useFakeTimers({ now: NOW });
}

/**
 * Both stores as plain data. A Today plan from an EARLIER day is left out:
 * no screen shows it (Today builds a new plan for the new day), so a
 * restore may keep or drop it.
 */
const data = () => {
  const p = JSON.parse(JSON.stringify({ ...useProgress.getState() }));
  for (const [id, plan] of Object.entries(p.days ?? {})) if ((plan as { day: string }).day !== '2026-10-10') delete p.days[id];
  return { s: JSON.parse(JSON.stringify({ ...useSettings.getState() })), p };
};

/** Save a backup from this phone, restore it on a fresh install, return both sides. */
async function backupAndRestore() {
  const before = data();
  const text = JSON.stringify(currentBackup(NOW));
  // The new phone: installed and onboarded (Settings → Your data needs both).
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true });
  useProgress.setState(useProgress.getInitialState());
  useBackup.setState({ lastBackupAt: null, undo: null });
  const read = checkBackupText(text);
  if (read.kind !== 'ok') throw new Error(`backup refused: ${read.code}`);
  await restoreBackup(read.data, NOW);
  return { before, after: data() };
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  mockScheduled.clear();
});
afterEach(() => jest.useRealTimers());

describe('a 1.1 save', () => {
  it('loads: every setting and answer kept, new fields get safe defaults', async () => {
    await loadSave(SETTINGS_1_1, PROGRESS_1_1);
    const s = useSettings.getState();
    expect(s).toMatchObject({ onboarded: true, theme: 'dark', dailyGoal: 40, haptics: true, gameRulesSeen: [], reminder: { enabled: true, hour: 19, minute: 0 } });
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.answers).toEqual(PROGRESS_1_1.state.byCert.cisa.answers);
    expect(cp.notesRead).toEqual([]);
    expect(cp.gameRecent).toEqual({});
    expect(useProgress.getState().days).toEqual({});
    expect(useProgress.getState().streak).toEqual(PROGRESS_1_1.state.streak);
  });

  it('after the update, a backup saves and restores on a new phone unchanged', async () => {
    await loadSave(SETTINGS_1_1, PROGRESS_1_1);
    // The learner keeps studying in 1.3 (adds Build C fields to one record).
    useProgress.getState().recordAnswer('cisa', 'd2_010', true, 'unsure', { ms: 33_000 });
    const { before, after } = await backupAndRestore();
    expect(after).toEqual(before);
  });
});

describe('a 1.2 save', () => {
  it('loads: plan, notes, game history, moments and reminder days kept', async () => {
    await loadSave(SETTINGS_1_2, PROGRESS_1_2);
    expect(useSettings.getState()).toMatchObject(SETTINGS_1_2.state);
    const p = useProgress.getState();
    expect(p.days).toEqual(PROGRESS_1_2.state.days);
    expect(p.byCert.cisa).toEqual(PROGRESS_1_2.state.byCert.cisa);
    expect(p.streak).toEqual(PROGRESS_1_2.state.streak);
  });

  it('after the update, a backup saves and restores on a new phone unchanged', async () => {
    await loadSave(SETTINGS_1_2, PROGRESS_1_2);
    const { before, after } = await backupAndRestore();
    expect(after).toEqual(before);
    // The reminder comes back on its days.
    expect([...mockScheduled.keys()].length).toBe(3);
  });
});
