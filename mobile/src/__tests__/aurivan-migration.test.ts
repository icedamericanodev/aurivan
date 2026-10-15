/**
 * Mobile 1.23: Aurivan became KaiSip, and the new package id installs as a
 * NEW app on the phone. Progress moves by a backup file: the old app saves
 * one (Settings → Your data → Save a backup), the new app restores it.
 *
 * So a backup made by Aurivan 1.19 to 1.22 must still restore here: its
 * `app` marker is 'aurivan' (new files say 'kaisip'), its file name starts
 * with "aurivan-backup", and it has no name (that arrived in 1.23).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKUP_APP, BACKUP_APPS, BACKUP_ERROR_COPY, backupFileName } from '../engine/backup';
import { checkBackupText, currentBackup, restoreBackup, sweepBackupFiles } from '../lib/backup';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { MOVING_LINE } from '../content/brand';
import { FAQ, WHATS_NEW } from '../content/support';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.23.0' } } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  scheduleNotificationAsync: async () => 'id',
}));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

const NOW = new Date(2026, 9, 15, 9, 0, 0).getTime();
const T = 1_791_000_000_000;

/** A backup file as Aurivan 1.19 wrote it: the old marker, no name, the 1.15 to 1.19 settings. */
const aurivan119 = () => ({
  app: 'aurivan',
  schema: 1,
  exportedAt: new Date(NOW - 86_400_000).toISOString(),
  appVersion: '1.19.0',
  stores: {
    settings: {
      version: 1,
      state: {
        onboarded: true,
        activeCertId: 'cisa',
        examDates: { cisa: '2027-01-08' },
        theme: 'dark',
        motion: 'system',
        shuffleOptions: true,
        dailyGoal: 20,
        reminder: { enabled: false, hour: 19, minute: 0, days: [1, 2, 3, 4, 5] },
        haptics: true,
        gameRulesSeen: ['sprint'],
        practiceTimer: false,
        badgesHidden: false,
        familiarity: 'some',
        dailyMinutes: 30,
        examFocused: false,
        fitPrompt: 'answered',
        fitChanges: 1,
      },
    },
    progress: {
      version: 2,
      state: {
        byCert: {
          cisa: {
            answers: {
              d1_001: { attempts: 3, correctCount: 2, lastCorrect: true, lastAt: T, lastAssisted: true },
              d2_010: { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: T + 1000 },
            },
            review: { d1_001: { box: 3, dueAt: T + 5 * 86_400_000, lastSeen: T, reps: 3 } },
            bookmarks: ['d3_005'],
            mocks: [],
            lessonsDone: ['cisa-l-d1-engagement'],
            mistakes: { d2_010: { picked: 'B', at: T + 1000, resolved: false, slip: 'priority' } },
            gameBest: { trap: 9 },
            notesRead: ['1A1.1'],
          },
        },
        streak: { current: 4, best: 9, lastDay: '2026-10-14', recentDays: ['2026-10-13', '2026-10-14'] },
        today: { day: '2026-10-14', answered: 6 },
      },
    },
  },
});

beforeEach(async () => {
  jest.useRealTimers();
  await AsyncStorage.clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useProgress.setState(useProgress.getInitialState());
  useBackup.setState({ lastBackupAt: null, undo: null });
});

describe('a backup from Aurivan 1.19 to 1.22 restores in KaiSip', () => {
  it('writes "kaisip" now, and reads both markers', () => {
    expect(BACKUP_APP).toBe('kaisip');
    expect([...BACKUP_APPS].sort()).toEqual(['aurivan', 'kaisip']);
  });

  it('restores on a fresh KaiSip install: answers, review, plan settings and streak all arrive; no name', async () => {
    const read = checkBackupText(JSON.stringify(aurivan119()));
    if (read.kind !== 'ok') throw new Error(`refused: ${read.code}`);
    expect(read.fresh).toBe(true);
    // The welcome screen's Restore skips onboarding: the file's own choices apply.
    expect(await restoreBackup(read.data, { now: NOW, fresh: true, onboard: true })).toMatchObject({ kind: 'ok' });
    const s = useSettings.getState();
    expect(s).toMatchObject({ onboarded: true, theme: 'dark', familiarity: 'some', dailyMinutes: 30, fitPrompt: 'answered', examDates: { cisa: '2027-01-08' } });
    expect(s.displayName).toBeUndefined();
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(Object.keys(cp.answers).sort()).toEqual(['d1_001', 'd2_010']);
    expect(cp.review.d1_001.box).toBe(3);
    expect(cp.bookmarks).toEqual(['d3_005']);
    expect(cp.notesRead).toEqual(['1A1.1']);
    expect(useProgress.getState().streak).toMatchObject({ current: 4, best: 9 });
  });

  it('the same file with the "kaisip" marker restores too', () => {
    const read = checkBackupText(JSON.stringify({ ...aurivan119(), app: 'kaisip' }));
    expect(read.kind).toBe('ok');
  });

  it('a file from Aurivan that was cut off is "damaged", not "not a backup"', () => {
    const text = JSON.stringify(aurivan119());
    const cut = checkBackupText(text.slice(0, 200));
    expect(cut).toEqual({ kind: 'error', code: 'bad-data' });
  });

  it('a backup KaiSip makes now is named kaisip-backup and says "kaisip" inside', () => {
    expect(backupFileName(NOW)).toBe('kaisip-backup-2026-10-15.json');
    expect(currentBackup(NOW).app).toBe('kaisip');
  });

  it('the pick-a-file message names both starts, so a learner moving from Aurivan finds the right file', () => {
    expect(BACKUP_ERROR_COPY['not-kaisip']).toMatch(/“kaisip-backup”/);
    expect(BACKUP_ERROR_COPY['not-kaisip']).toMatch(/“aurivan-backup”/);
    expect(BACKUP_ERROR_COPY['not-kaisip']).toMatch(/Nothing was changed\.$/);
  });

  it('cleans up old cache files of both names (never throws where there is no file system)', () => {
    expect(() => sweepBackupFiles(NOW)).not.toThrow();
  });
});

describe('the move is explained in plain words', () => {
  it('one line says how, in the old app and here', () => {
    expect(MOVING_LINE).toBe('Moving from Aurivan? In the old app: Settings → Your data → Save a backup. Then restore that file here.');
  });

  it('What’s new says it, the Help questions say it, and 1.23.0 is the newest entry', () => {
    const top = WHATS_NEW[0];
    expect(top.version).toBe('1.23.0');
    const all = [...(top.new ?? []), ...(top.improved ?? [])].join(' ');
    expect(all).toMatch(/Aurivan is now KaiSip/);
    expect(all).toMatch(/call you/);
    expect(all).toMatch(/Moving from Aurivan\?/);
    expect(all).toMatch(/Save a backup/);
    const faq = FAQ.find((f) => f.id === 'moving-from-aurivan')!;
    expect(faq.topic).toBe('backup');
    expect(faq.answer.join(' ')).toMatch(/Restore from a backup/);
  });
});
