import { Platform } from 'react-native';
import { saveBackupOnDevice } from '../lib/backupDevice';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { useBackup } from '../store/backup';
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockPick = jest.fn(), mockWrite = jest.fn(), mockRead = jest.fn(), mockDelete = jest.fn(), mockCreate = jest.fn();
jest.mock('expo-file-system', () => ({
  Directory: class { static pickDirectoryAsync: (...args: unknown[]) => Promise<unknown> = (...args) => mockPick(...args); list() { return []; } },
  File: class {}, Paths: { cache: { uri: 'file:///cache' } },
}));
jest.mock('../lib/reminders', () => ({ remindersSupported: false, cancelReminders: async () => {}, ensurePermission: async () => false, scheduleReminders: async () => {} }));
const originalOS = Platform.OS;
let written = '';
const now = new Date('2026-11-09T09:00:00Z').getTime();
beforeEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  jest.clearAllMocks(); written = '';
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, displayName: 'Local learner' });
  useProgress.setState(useProgress.getInitialState());
  useProgress.getState().recordAnswer('cisa', 'd1_002', false);
  useBackup.setState({ lastBackupAt: null, undo: null });
  mockPick.mockReset().mockResolvedValue({ createFile: mockCreate });
  mockWrite.mockReset().mockImplementation(async (text: string) => { written = text; });
  mockRead.mockReset().mockImplementation(async () => written); mockDelete.mockReset();
  mockCreate.mockReset().mockReturnValue({ write: mockWrite, text: mockRead, delete: mockDelete });
});
afterEach(() => Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS }));
it('saves the existing backup format, verifies it, and restores its progress', async () => {
  const expected = JSON.stringify(currentBackup(now));
  expect(await saveBackupOnDevice(now)).toBe('saved');
  expect(mockCreate).toHaveBeenCalledWith(expect.stringMatching(/^kaisip-backup-.*\.json$/), 'application/json');
  expect(written).toBe(expected); expect(mockDelete).not.toHaveBeenCalled();
  expect(useBackup.getState().lastBackupAt).toBe(now);
  const picked = checkBackupText(written);
  if (picked.kind !== 'ok') throw new Error('saved backup must restore');
  useProgress.getState().resetCert('cisa');
  expect((await restoreBackup(picked.data, { fresh: true })).kind).toBe('ok');
  expect(useProgress.getState().byCert.cisa.answers.d1_002.attempts).toBe(1);
  expect(useSettings.getState().displayName).toBe('Local learner');
});
it('cancel creates no file or backup timestamp and changes no study data', async () => {
  const before = useProgress.getState(); mockPick.mockRejectedValue({ code: 'ERR_PICKER_CANCELLED' });
  expect(await saveBackupOnDevice(now)).toBe('cancelled');
  expect(mockCreate).not.toHaveBeenCalled(); expect(useBackup.getState().lastBackupAt).toBeNull(); expect(useProgress.getState()).toBe(before);
});
it('picker errors are not cancellation', async () => {
  mockPick.mockRejectedValue(new Error('No provider'));
  await expect(saveBackupOnDevice(now)).rejects.toThrow('No provider'); expect(mockCreate).not.toHaveBeenCalled();
});
it.each(['write', 'read', 'mismatch'])('handles %s failure without success and removes only its new file', async (failure) => {
  if (failure === 'write') mockWrite.mockRejectedValue(new Error('Disk full'));
  else if (failure === 'read') mockRead.mockRejectedValue(new Error('Read failed'));
  else mockRead.mockResolvedValue('partial');
  await expect(saveBackupOnDevice(now)).rejects.toThrow(); expect(mockDelete).toHaveBeenCalledTimes(1); expect(useBackup.getState().lastBackupAt).toBeNull();
});
it('other platforms do not open the Android picker', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  expect(await saveBackupOnDevice(now)).toBe('unavailable'); expect(mockPick).not.toHaveBeenCalled();
});
it('create failure does not write or update backup history', async () => {
  mockCreate.mockImplementation(() => { throw new Error('Permission denied'); });
  await expect(saveBackupOnDevice(now)).rejects.toThrow('Permission denied'); expect(mockWrite).not.toHaveBeenCalled(); expect(mockDelete).not.toHaveBeenCalled(); expect(useBackup.getState().lastBackupAt).toBeNull();
});
