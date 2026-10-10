/**
 * Regression: in Expo Go on Android, merely importing expo-notifications
 * throws and crashed the app at launch. Simulate that environment and prove
 * the reminders module never loads the library and degrades gracefully.
 */
import {
  cancelReminders,
  ensurePermission,
  initNotifications,
  remindersSupported,
  scheduleReminders,
} from '../lib/reminders';

// babel-jest hoists these jest.mock() calls above the import, so the
// reminders module sees the fake Expo Go / Android environment.
jest.mock('expo', () => ({ isRunningInExpoGo: () => true }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => {
  throw new Error('expo-notifications must not be loaded in Expo Go on Android');
});

describe('reminders in Expo Go on Android', () => {
  it('reports reminders as unsupported', () => {
    expect(remindersSupported).toBe(false);
  });

  it('never loads expo-notifications, so nothing throws', async () => {
    expect(() => initNotifications()).not.toThrow();
    await expect(ensurePermission()).resolves.toBe(false);
    await expect(scheduleReminders({ enabled: true, hour: 19, minute: 0 }, 'CISA')).resolves.toBeUndefined();
    await expect(cancelReminders()).resolves.toBeUndefined();
  });
});
