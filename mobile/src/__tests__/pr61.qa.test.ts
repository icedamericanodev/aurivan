/**
 * PR #61 QA (mobile 1.23): gaps left by display-name.test.ts, display-name-screens.test.tsx
 * and aurivan-migration.test.ts. Covers what happens to the learner's name
 * (and an old Aurivan backup) around Reset, "remove my progress from this
 * phone", Undo restore, and a restore onto a phone that already has a name.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkBackupText, currentBackup, restoreBackup, undoRestore, wipeLocalStudy } from '../lib/backup';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

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

/** An Aurivan 1.22 file: the old marker, no name. */
const oldAurivanFile = () => {
  const f = JSON.parse(JSON.stringify(currentBackup(NOW - 86_400_000)));
  f.app = 'aurivan';
  f.appVersion = '1.22.0';
  delete f.stores.settings.state.displayName;
  return f;
};

beforeEach(async () => {
  await AsyncStorage.clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ onboarded: true, activeCertId: 'cisa' });
  useProgress.setState(useProgress.getInitialState());
  useBackup.setState({ lastBackupAt: null, undo: null, restoredSavedAt: null });
});

describe('Settings → Reset (per exam)', () => {
  it('keeps the learner’s name: a reset clears study progress, not who they are', () => {
    useSettings.getState().setDisplayName('Maya');
    useProgress.getState().recordAnswer('cisa', 'd1_001', true);
    expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toEqual(['d1_001']);
    useProgress.getState().resetCert('cisa');
    expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toEqual([]);
    expect(useSettings.getState().displayName).toBe('Maya');
  });
});

describe('"Remove my progress from this phone" (wipeLocalStudy)', () => {
  it('forgets the name in memory AND in the saved row (a shared phone must not greet the last learner)', async () => {
    useSettings.getState().setDisplayName('Maya');
    await wipeLocalStudy();
    expect(useSettings.getState().displayName).toBeUndefined();
    const raw = await AsyncStorage.getItem('aurivan.settings.v1');
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('Maya');
    expect(JSON.parse(raw!).state).not.toHaveProperty('displayName');
    // The device's own choices stay: still onboarded.
    expect(useSettings.getState().onboarded).toBe(true);
  });
});

describe('restoring a file onto a phone that already has a name', () => {
  it('an old Aurivan-marked file (no name) keeps the phone’s name, and the name is saved to storage', async () => {
    useSettings.getState().setDisplayName('Maya');
    const checked = checkBackupText(JSON.stringify(oldAurivanFile()));
    expect(checked.kind).toBe('ok');
    if (checked.kind !== 'ok') return;
    expect(await restoreBackup(checked.data, { now: NOW })).toMatchObject({ kind: 'ok' });
    expect(useSettings.getState().displayName).toBe('Maya');
    expect(await AsyncStorage.getItem('aurivan.settings.v1')).toContain('Maya');
  });

  it('a new KaiSip file with another name replaces it, and Undo restore brings the old name back', async () => {
    useSettings.getState().setDisplayName('Sam');
    const file = JSON.parse(JSON.stringify(currentBackup(NOW - 1000)));
    file.stores.settings.state.displayName = 'Priya';
    useSettings.getState().setDisplayName('Maya');
    const checked = checkBackupText(JSON.stringify(file));
    expect(checked.kind).toBe('ok');
    if (checked.kind !== 'ok') return;
    expect(await restoreBackup(checked.data, { now: NOW })).toMatchObject({ kind: 'ok' });
    expect(useSettings.getState().displayName).toBe('Priya');
    expect(await undoRestore(NOW + 1000)).toMatchObject({ kind: 'ok' });
    expect(useSettings.getState().displayName).toBe('Maya');
  });

  it('a KaiSip file whose name was cleared on purpose (no key) does not erase the name the phone has', async () => {
    // A file made before the learner set a name looks exactly like a file made by a learner who has none.
    // Restore keeps the phone’s name in both cases; this pins that behaviour.
    const file = JSON.parse(JSON.stringify(currentBackup(NOW - 1000)));
    useSettings.getState().setDisplayName('Maya');
    const checked = checkBackupText(JSON.stringify(file));
    if (checked.kind !== 'ok') throw new Error('refused');
    await restoreBackup(checked.data, { now: NOW });
    expect(useSettings.getState().displayName).toBe('Maya');
  });

  it('answers from the old file still arrive when the phone has a name (progress is replaced, the name is not)', async () => {
    useProgress.getState().resetCert('cisa');
    const checked = checkBackupText(JSON.stringify(oldAurivanFile()));
    if (checked.kind !== 'ok') throw new Error('refused');
    useSettings.getState().setDisplayName('Maya');
    await restoreBackup(checked.data, { now: NOW });
    expect(selectCert(useProgress.getState(), 'cisa')).toBeDefined();
    expect(useSettings.getState().displayName).toBe('Maya');
  });
});
