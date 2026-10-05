/**
 * Regression: in Expo Go on Android, merely importing expo-notifications
 * throws and crashed the app at launch. Simulate that environment and prove
 * the reminders module never loads the library and degrades gracefully.
 */
jest.mock('expo', () => ({ isRunningInExpoGo: () => true }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => {
  throw new Error('expo-notifications must not be loaded in Expo Go on Android');
});

import {
  cancelReminders,
  ensurePermission,
  initNotifications,
  remindersSupported,
  scheduleDailyReminder,
} from '../lib/reminders';

describe('reminders in Expo Go on Android', () => {
  it('reports reminders as unsupported', () => {
    expect(remindersSupported).toBe(false);
  });

  it('never loads expo-notifications, so nothing throws', async () => {
    expect(() => initNotifications()).not.toThrow();
    await expect(ensurePermission()).resolves.toBe(false);
    await expect(scheduleDailyReminder(19, 0, 'CISA')).resolves.toBeUndefined();
    await expect(cancelReminders()).resolves.toBeUndefined();
  });
});
