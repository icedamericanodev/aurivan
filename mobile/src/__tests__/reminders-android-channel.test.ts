/**
 * Study reminders on a real Android build:
 * - the "Study reminders" channel is created BEFORE the permission prompt
 *   and before scheduling, and every reminder is filed under it;
 * - reminders are scheduled per id (one daily, or one weekly per chosen day)
 *   and replaced by cancelling OUR ids only, never "cancel everything";
 * - the first version's untagged reminder (old guilt copy) is replaced too.
 */
import { DAILY_ID, LEGACY_TITLE, weeklyId } from '../engine/reminders';
import { REMINDER_CHANNEL_ID, cancelReminders, ensurePermission, scheduleReminders } from '../lib/reminders';

// A real (non-Expo Go) Android build. babel-jest hoists these mocks.
jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

// Every call is recorded in `calls` so we can check the ORDER.
const calls: string[] = [];
// What the phone already has scheduled: ours (new and legacy) and someone else's.
let scheduled: { identifier: string; content: { title: string } }[] = [];
const mockN = {
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: jest.fn(async () => { calls.push('channel'); return null; }),
  getPermissionsAsync: jest.fn(async () => { calls.push('getPermissions'); return { granted: false }; }),
  requestPermissionsAsync: jest.fn(async () => { calls.push('requestPermissions'); return { granted: true }; }),
  getAllScheduledNotificationsAsync: jest.fn(async () => { calls.push('list'); return scheduled; }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => { calls.push(`cancel:${id}`); }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => { calls.push('cancelAll'); }),
  scheduleNotificationAsync: jest.fn(async (req: { identifier: string }) => { calls.push(`schedule:${req.identifier}`); return req.identifier; }),
};
jest.mock('expo-notifications', () => mockN);

type Req = { identifier: string; content: { title: string; body: string }; trigger: Record<string, unknown> };
const requests = () => (mockN.scheduleNotificationAsync.mock.calls as unknown as [Req][]).map(([r]) => r);

beforeEach(() => {
  calls.length = 0;
  scheduled = [];
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

  it('every day: one DAILY reminder with its own id, on the channel', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 30 }, 'CISA');
    expect(calls).toEqual(['channel', 'list', `schedule:${DAILY_ID}`]);
    expect(requests()[0].trigger).toEqual({ type: 'daily', hour: 19, minute: 30, channelId: REMINDER_CHANNEL_ID });
  });

  it('chosen days: one WEEKLY reminder per day (Expo weekdays, 1 = Sunday)', async () => {
    await scheduleReminders({ enabled: true, hour: 7, minute: 15, days: [1, 3, 5] }, 'CISA');
    const reqs = requests();
    expect(reqs.map((r) => r.identifier)).toEqual([weeklyId(1), weeklyId(3), weeklyId(5)]);
    expect(reqs.map((r) => r.trigger.weekday)).toEqual([2, 4, 6]);
    for (const r of reqs) expect(r.trigger).toMatchObject({ type: 'weekly', hour: 7, minute: 15, channelId: REMINDER_CHANNEL_ID });
  });

  it('replaces only OUR reminders (including the old untagged one), never cancelAll', async () => {
    scheduled = [
      { identifier: DAILY_ID, content: { title: 'A short study session?' } },
      { identifier: 'legacy-random-id', content: { title: LEGACY_TITLE } },
      { identifier: 'someone-else', content: { title: 'Not ours' } },
    ];
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: [2] }, 'CISA');
    expect(calls).toContain(`cancel:${DAILY_ID}`);
    expect(calls).toContain('cancel:legacy-random-id');
    expect(calls).not.toContain('cancel:someone-else');
    expect(mockN.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    await cancelReminders();
    expect(mockN.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it('uses calm copy: no streak, no guilt, no pass promise', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 0 }, 'CISA');
    const { title, body } = requests()[0].content;
    expect(`${title} ${body}`).not.toMatch(/streak|alive|got this|don.t|lose|miss|behind|pass/i);
    expect(body).toContain('CISA');
  });

  it('turned off: schedules nothing (but still clears ours)', async () => {
    scheduled = [{ identifier: weeklyId(4), content: { title: 'x' } }];
    await scheduleReminders({ enabled: false, hour: 19, minute: 0 }, 'CISA');
    expect(mockN.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(calls).toContain(`cancel:${weeklyId(4)}`);
  });
});
