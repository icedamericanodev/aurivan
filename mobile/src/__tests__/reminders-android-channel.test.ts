/**
 * Study reminders on a real Android build:
 * - the "Study reminders" channel is created BEFORE the permission prompt
 *   and before scheduling, and every reminder is filed under it;
 * - reminders are the next 7 one-off DATE notifications (mobile 1.24), each
 *   with its own id, and replaced by cancelling OUR ids only (old repeating
 *   ones too), never "cancel everything";
 * - the first version's untagged reminder (old guilt copy) is replaced too.
 */
import { DAILY_ID, LEGACY_TITLE, rollingId, weeklyId } from '../engine/reminders';
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
  SchedulableTriggerInputTypes: { DATE: 'date' },
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

  // Thursday 15 October 2026, 14:00 local time.
  const NOW = new Date(2026, 9, 15, 14, 0).getTime();

  it('every day: seven one-off DATE reminders with their own ids, on the channel', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 30 }, 'CISA', { now: NOW });
    expect(calls).toEqual(['channel', 'list', ...[1, 2, 3, 4, 5, 6, 7].map((n) => `schedule:${rollingId(n)}`)]);
    expect(requests()[0].trigger).toEqual({ type: 'date', date: new Date(2026, 9, 15, 19, 30), channelId: REMINDER_CHANNEL_ID });
    expect(requests()[6].trigger).toMatchObject({ date: new Date(2026, 9, 21, 19, 30) });
  });

  it('chosen days: one reminder per chosen day within the week ahead', async () => {
    await scheduleReminders({ enabled: true, hour: 7, minute: 15, days: [1, 3, 5] }, 'CISA', { now: NOW });
    const reqs = requests();
    expect(reqs.map((r) => r.identifier)).toEqual([1, 2, 3].map(rollingId));
    expect(reqs.map((r) => (r.trigger.date as Date).getDay())).toEqual([5, 1, 3]);
    for (const r of reqs) expect(r.trigger).toMatchObject({ type: 'date', channelId: REMINDER_CHANNEL_ID });
  });

  it('today’s plan is cleared: no reminder today', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 0 }, 'CISA', { now: NOW, skipToday: true });
    expect((requests()[0].trigger.date as Date).getDate()).toBe(16);
    expect(requests()).toHaveLength(7);
  });

  it('replaces only OUR reminders (including the old untagged one), never cancelAll', async () => {
    scheduled = [
      { identifier: DAILY_ID, content: { title: 'A short study session?' } },
      { identifier: weeklyId(3), content: { title: 'A short study session?' } },
      { identifier: rollingId(2), content: { title: 'Your 20-minute plan is ready' } },
      { identifier: 'legacy-random-id', content: { title: LEGACY_TITLE } },
      { identifier: 'someone-else', content: { title: 'Not ours' } },
    ];
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: [2] }, 'CISA');
    expect(calls).toContain(`cancel:${DAILY_ID}`);
    expect(calls).toContain(`cancel:${weeklyId(3)}`);
    expect(calls).toContain(`cancel:${rollingId(2)}`);
    expect(calls).toContain('cancel:legacy-random-id');
    expect(calls).not.toContain('cancel:someone-else');
    expect(mockN.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    await cancelReminders();
    expect(mockN.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it('uses calm copy: the plan is ready; no streak, no guilt, no pass promise', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 0 }, 'CISA', { now: NOW, minutes: 15 });
    const { title, body } = requests()[0].content;
    expect(title).toBe('Your 15-minute plan is ready');
    expect(`${title} ${body}`).not.toMatch(/streak|alive|got this|don.t|lose|miss|behind|pass/i);
    expect(body).toContain('CISA');
  });

  it('turned off: schedules nothing (but still clears ours)', async () => {
    scheduled = [{ identifier: weeklyId(4), content: { title: 'x' } }];
    await scheduleReminders({ enabled: false, hour: 19, minute: 0 }, 'CISA', { now: NOW });
    expect(mockN.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(calls).toContain(`cancel:${weeklyId(4)}`);
  });
});
