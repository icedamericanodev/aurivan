/**
 * Mobile 1.7: "Your reports" is kept in the progress store and travels in
 * the learner's own backup file, through the same checker and fit path as
 * everything else (engine/backup.ts):
 * - a backup with reports restores them exactly (and Undo brings back the
 *   phone's own list);
 * - an over-long list exports its newest 200, and still restores;
 * - a damaged entry refuses the file, an unknown field is dropped;
 * - backups and saves from before 1.7 (no list) load, and restoring one
 *   keeps the phone's own list (code review #5);
 * - a reset of one exam leaves the list alone.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readBackup } from '../engine/backup';
import { MAX_REPORTS, type ReportEntry } from '../engine/support';
import { checkBackupText, currentBackup, restoreBackup, undoRestore } from '../lib/backup';
import { useBackup } from '../store/backup';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.7.0' } } }));
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

const NOW = new Date(2026, 9, 11, 9, 0, 0).getTime();
const report = (i: number, over: Partial<ReportEntry> = {}): ReportEntry => ({
  ref: `R-${'ABCDEFGH'[i % 8]}${'23456789'[Math.floor(i / 8) % 8]}${'JKMN'[Math.floor(i / 64) % 4]}Q`,
  item: i % 3 === 0 ? 'note:4A2.3' : `q:d${1 + (i % 5)}_0${String(10 + (i % 80)).padStart(2, '0')}`,
  reason: i % 2 ? 'key' : 'typo',
  at: NOW - i * 3_600_000,
  cert: 'cisa',
  ...over,
});
const fileText = () => JSON.stringify(currentBackup(NOW));
const fileWith = (mutate: (progressState: Record<string, unknown>) => void) => {
  const f = JSON.parse(fileText());
  mutate(f.stores.progress.state);
  return JSON.stringify(f);
};

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa' });
  // `reports` is optional (not in the initial state) and setState merges: clear it by hand.
  useProgress.setState({ ...useProgress.getInitialState(), reports: undefined });
  useBackup.setState({ lastBackupAt: null, undo: null });
});
afterEach(() => jest.useRealTimers());

describe('backup round trip', () => {
  it('a backup with reports restores them exactly on another phone', async () => {
    useProgress.setState({ reports: [report(0, { creditSeen: true }), report(1), report(2)] });
    const text = fileText();
    // The other phone has its own list; a restore replaces it (like everything else).
    useProgress.setState({ ...useProgress.getInitialState(), reports: [report(9)] });
    const read = checkBackupText(text);
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.reports).toEqual([report(0, { creditSeen: true }), report(1), report(2)]);
    expect((await restoreBackup(read.data, NOW)).kind).toBe('ok');
    expect(useProgress.getState().reports).toEqual([report(0, { creditSeen: true }), report(1), report(2)]);
    // Undo brings back this phone's own list.
    expect((await undoRestore(NOW + 1000)).kind).toBe('ok');
    expect(useProgress.getState().reports).toEqual([report(9)]);
  });

  it('keeps a report about something no longer in the app (Your reports says so)', () => {
    const gone = report(0, { item: 'q:d9_999' });
    useProgress.setState({ reports: [gone] });
    const read = checkBackupText(fileText());
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.reports).toEqual([gone]);
  });
});

describe('fit: the app never writes a list it would refuse', () => {
  it('an over-long list exports its newest entries, capped, and still restores', () => {
    const many = Array.from({ length: MAX_REPORTS + 60 }, (_, i) => report(i));
    useProgress.setState({ reports: many });
    const file = currentBackup(NOW);
    expect(file.stores.progress.state.reports).toHaveLength(MAX_REPORTS);
    expect(file.stores.progress.state.reports![0]).toEqual(many[0]); // newest first is kept
    expect(checkBackupText(JSON.stringify(file)).kind).toBe('ok');
  });
});

describe('validation: a file is untrusted', () => {
  beforeEach(() => {
    useProgress.setState({ reports: [report(0)] });
  });

  it.each([
    ['a ref we never make', (r: Record<string, unknown>) => (r.ref = 'hello')],
    ['a long reason (free text)', (r: Record<string, unknown>) => (r.reason = 'x'.repeat(21))],
    ['a long item', (r: Record<string, unknown>) => (r.item = `q:${'x'.repeat(200)}`)],
    ['a date outside 2000–2100', (r: Record<string, unknown>) => (r.at = 1)],
    ['a missing field', (r: Record<string, unknown>) => delete r.cert],
  ])('refuses %s', (_name, mutate) => {
    const text = fileWith((p) => mutate((p.reports as Record<string, unknown>[])[0]));
    expect(() => readBackup(text, ['cisa'])).toThrow(/bad-data/);
  });

  it('refuses more than the cap', () => {
    const text = fileWith((p) => (p.reports = Array.from({ length: MAX_REPORTS + 1 }, (_, i) => report(i))));
    expect(() => readBackup(text, ['cisa'])).toThrow(/bad-data/);
  });

  it('keeps the app version a report was made on, and refuses one that isn’t a version', () => {
    useProgress.setState({ reports: [report(0, { version: '1.7.0' })] });
    expect(readBackup(fileText(), ['cisa']).progress.reports).toEqual([report(0, { version: '1.7.0' })]);
    const text = fileWith((p) => ((p.reports as Record<string, unknown>[])[0].version = '<script>'));
    expect(() => readBackup(text, ['cisa'])).toThrow(/bad-data/);
  });

  it('drops a field it doesn’t know', () => {
    const text = fileWith((p) => ((p.reports as Record<string, unknown>[])[0].note = 'my private note'));
    expect(readBackup(text, ['cisa']).progress.reports).toEqual([report(0)]);
  });
});

describe('before 1.7', () => {
  it('a backup with no list reads, and restoring it keeps the phone’s own list', async () => {
    const text = fileWith((p) => delete p.reports);
    useProgress.setState({ reports: [report(4)] });
    const read = checkBackupText(text);
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.reports).toBeUndefined();
    await restoreBackup(read.data, NOW);
    // The learner's messages to us are not study progress: a pre-1.7 file can't empty them.
    expect(useProgress.getState().reports).toEqual([report(4)]);
    // Saved too, so a restart keeps it.
    const saved = JSON.parse((await AsyncStorage.getItem('aurivan.progress.v1'))!);
    expect(saved.state.reports).toEqual([report(4)]);
  });

  it('a backup WITH a list (even an empty one) replaces the phone’s list', async () => {
    const text = fileWith((p) => (p.reports = []));
    useProgress.setState({ reports: [report(4)] });
    const read = checkBackupText(text);
    if (read.kind !== 'ok') throw new Error(read.code);
    await restoreBackup(read.data, NOW);
    expect(useProgress.getState().reports).toEqual([]);
  });

  it('a 1.6 save loads with no list, and the list then works', async () => {
    jest.useRealTimers();
    useProgress.setState({ ...useProgress.getInitialState(), reports: undefined });
    await new Promise((done) => setTimeout(done, 0));
    await AsyncStorage.clear();
    const save16 = {
      state: {
        byCert: { cisa: { answers: { d1_001: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: NOW } }, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {}, gameRecent: {}, notesRead: [] } },
        streak: { current: 1, best: 1, lastDay: '2026-10-10' },
        today: { day: '2026-10-10', answered: 1 },
        days: {},
      },
      version: 2,
    };
    await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(save16));
    await useProgress.persist.rehydrate();
    expect(useProgress.getState().reports).toBeUndefined();
    expect(useProgress.getState().byCert.cisa.answers.d1_001.attempts).toBe(1);
    jest.useFakeTimers({ now: NOW });

    useProgress.getState().logReport({ ref: 'R-7K2Q', item: 'q:d1_001', reason: 'key', cert: 'cisa' });
    expect(useProgress.getState().reports).toEqual([{ ref: 'R-7K2Q', item: 'q:d1_001', reason: 'key', cert: 'cisa', at: NOW }]);
    useProgress.getState().markCreditSeen(['R-7K2Q']);
    expect(useProgress.getState().reports![0].creditSeen).toBe(true);
    // Resetting an exam's progress keeps the learner's messages to us.
    useProgress.getState().resetCert('cisa');
    expect(useProgress.getState().reports).toHaveLength(1);
    useProgress.getState().clearReports();
    expect(useProgress.getState().reports).toEqual([]);
  });
});
