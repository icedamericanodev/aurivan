/**
 * QA Build 1: "At most one reminder a day" must hold even when the learner
 * changes the days or time quickly (two taps before the first re-schedule
 * finishes). Settings fires scheduleReminders on every tap without waiting,
 * so two calls can overlap: each lists, cancels and schedules on its own.
 *
 * The notifications module below keeps a real list of what is scheduled and
 * answers each call a moment later, the way the native bridge does.
 */
import { DAILY_ID, weeklyId } from '../engine/reminders';
import { cancelReminders, scheduleReminders } from '../lib/reminders';

jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const tick = () => new Promise<void>((res) => setTimeout(res, 0));
const mockScheduled = new Map<string, { identifier: string; content: { title: string } }>();
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getAllScheduledNotificationsAsync: async () => {
    await tick();
    return [...mockScheduled.values()];
  },
  cancelScheduledNotificationAsync: async (id: string) => {
    await tick();
    mockScheduled.delete(id);
  },
  scheduleNotificationAsync: async (req: { identifier: string; content: { title: string } }) => {
    await tick();
    mockScheduled.set(req.identifier, { identifier: req.identifier, content: req.content });
    return req.identifier;
  },
}));

beforeEach(() => mockScheduled.clear());

const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

describe('reminders: one at a time', () => {
  it('a single change leaves exactly the chosen reminders', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: EVERY_DAY }, 'CISA');
    expect([...mockScheduled.keys()]).toEqual([DAILY_ID]);
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: WEEKDAYS }, 'CISA');
    expect([...mockScheduled.keys()].sort()).toEqual(WEEKDAYS.map((d) => weeklyId(d as 1)).sort());
  });

  // KNOWN BUG (QA Build 1): reminders on Mon–Sat. The learner taps Sun
  // (now every day: ONE daily reminder) and then Sat (now Sun–Fri: six
  // weekly ones) before the first re-schedule finishes. Both calls list the
  // old reminders, both cancel, then BOTH schedule: the daily one survives
  // next to the six weekly ones, so Sun–Fri get two notifications. Flip
  // `it.failing` to `it` once scheduleReminders runs one call at a time
  // and the last choice wins (lib/reminders.ts).
  it.failing('two quick changes end with only the LAST choice scheduled', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: [1, 2, 3, 4, 5, 6] }, 'CISA');
    const first = scheduleReminders({ enabled: true, hour: 19, minute: 0, days: EVERY_DAY }, 'CISA');
    const second = scheduleReminders({ enabled: true, hour: 19, minute: 0, days: [0, 1, 2, 3, 4, 5] }, 'CISA');
    await Promise.all([first, second]);
    expect([...mockScheduled.keys()].sort()).toEqual([0, 1, 2, 3, 4, 5].map((d) => weeklyId(d as 1)).sort());
  });

  // KNOWN BUG (QA Build 1): the learner moves the time, then turns reminders
  // off straight away. The off switch's cancel lists what is scheduled
  // BEFORE the time change has scheduled its reminder, so that reminder
  // survives: the switch says off, yet a notification still arrives.
  it.failing('turning reminders off right after a change leaves nothing scheduled', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: EVERY_DAY }, 'CISA');
    const change = scheduleReminders({ enabled: true, hour: 20, minute: 0, days: EVERY_DAY }, 'CISA');
    const off = cancelReminders();
    await Promise.all([change, off]);
    expect([...mockScheduled.keys()]).toEqual([]);
  });
});
