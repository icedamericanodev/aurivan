/**
 * Android reminders need a notification channel. Prove the "Study reminders"
 * channel is created BEFORE the permission prompt and before scheduling, and
 * that the daily reminder is filed under that channel.
 */
import { REMINDER_CHANNEL_ID, ensurePermission, scheduleDailyReminder } from '../lib/reminders';

// A real (non-Expo Go) Android build. babel-jest hoists these mocks.
jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

// Every call is recorded in `calls` so we can check the ORDER.
const calls: string[] = [];
const mockN = {
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  setNotificationChannelAsync: jest.fn(async () => { calls.push('channel'); return null; }),
  getPermissionsAsync: jest.fn(async () => { calls.push('getPermissions'); return { granted: false }; }),
  requestPermissionsAsync: jest.fn(async () => { calls.push('requestPermissions'); return { granted: true }; }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => { calls.push('cancel'); }),
  scheduleNotificationAsync: jest.fn(async () => { calls.push('schedule'); return 'id'; }),
};
jest.mock('expo-notifications', () => mockN);

beforeEach(() => {
  calls.length = 0;
  jest.clearAllMocks();
});

describe('reminders on Android', () => {
  it('creates the Study reminders channel before asking permission', async () => {
    await expect(ensurePermission()).resolves.toBe(true);
    expect(calls[0]).toBe('channel');
    expect(calls).toContain('requestPermissions');
    expect(mockN.setNotificationChannelAsync).toHaveBeenCalledWith('reminders', {
      name: 'Study reminders',
      importance: 5,
    });
  });

  it('creates the channel before scheduling, and schedules on that channel', async () => {
    await scheduleDailyReminder(19, 30, 'CISA');
    expect(calls).toEqual(['channel', 'cancel', 'schedule']);
    const [[request]] = mockN.scheduleNotificationAsync.mock.calls as unknown as [[{ trigger: object }]];
    expect(request.trigger).toEqual({ type: 'daily', hour: 19, minute: 30, channelId: REMINDER_CHANNEL_ID });
  });
});
