/**
 * QA Build 1: "At most one reminder a day" must hold even when the learner
 * changes the days or time quickly (two taps before the first re-schedule
 * finishes). Settings fires scheduleReminders on every tap without waiting,
 * so two calls can overlap: each lists, cancels and schedules on its own.
 *
 * The notifications module below keeps a real list of what is scheduled and
 * answers each call a moment later, the way the native bridge does.
 */
import { rollingId } from '../engine/reminders';
import { cancelReminders, scheduleReminders } from '../lib/reminders';

jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const tick = () => new Promise<void>((res) => setTimeout(res, 0));
const mockScheduled = new Map<string, { identifier: string; content: { title: string }; trigger?: unknown }>();
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: async () => null,
  getAllScheduledNotificationsAsync: async () => {
    await tick();
    return [...mockScheduled.values()];
  },
  cancelScheduledNotificationAsync: async (id: string) => {
    await tick();
    mockScheduled.delete(id);
  },
  scheduleNotificationAsync: async (req: { identifier: string; content: { title: string }; trigger?: unknown }) => {
    await tick();
    mockScheduled.set(req.identifier, { identifier: req.identifier, content: req.content, trigger: req.trigger });
    return req.identifier;
  },
}));

beforeEach(() => mockScheduled.clear());

const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

// Thursday 15 October 2026, 14:00 local time: the plan is the same on any machine.
const NOW = new Date(2026, 9, 15, 14, 0).getTime();
const RUN = { now: NOW };
const slots = (n: number) => Array.from({ length: n }, (_, i) => rollingId(i + 1)).sort();

describe('reminders: one at a time', () => {
  it('a single change leaves exactly the chosen reminders', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: EVERY_DAY }, 'CISA', RUN);
    expect([...mockScheduled.keys()].sort()).toEqual(slots(7));
    // Weekdays only, from Thursday: Thu, Fri, Mon, Tue, Wed, Thu (the eighth calendar day, 22 Oct).
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: WEEKDAYS }, 'CISA', RUN);
    expect([...mockScheduled.keys()].sort()).toEqual(slots(6));
  });

  // Was a known bug (QA Build 1): reminders on Mon–Sat. The learner taps
  // Sun (now every day) and then Sat (now Sun–Fri) before the first
  // re-schedule finishes. Both calls listed the old reminders, both
  // cancelled, then BOTH scheduled. Fixed: changes run one at a time and the
  // last choice wins (lib/reminders.ts).
  it('two quick changes end with only the LAST choice scheduled', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: [1, 2, 3, 4, 5, 6] }, 'CISA', RUN);
    const first = scheduleReminders({ enabled: true, hour: 19, minute: 0, days: EVERY_DAY }, 'CISA', RUN);
    const second = scheduleReminders({ enabled: true, hour: 19, minute: 0, days: [0, 1, 2, 3, 4, 5] }, 'CISA', RUN);
    await Promise.all([first, second]);
    // Sun–Fri from Thursday 15: Thu, Fri, Sun, Mon, Tue, Wed, Thu 22 (the eighth day) = 7.
    expect([...mockScheduled.keys()].sort()).toEqual(slots(7));
    const days = [...mockScheduled.values()].map((r) => (r as unknown as { trigger: { date: Date } }).trigger.date.getDay());
    expect(days).not.toContain(6); // Saturday was unticked by the LAST choice
  });

  // Was a known bug (QA Build 1): the learner moves the time, then turns
  // reminders off straight away; the off switch's cancel ran before the
  // change had scheduled, so a reminder survived. Fixed by the same queue.
  it('turning reminders off right after a change leaves nothing scheduled', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: EVERY_DAY }, 'CISA', RUN);
    const change = scheduleReminders({ enabled: true, hour: 20, minute: 0, days: EVERY_DAY }, 'CISA', RUN);
    const off = cancelReminders();
    await Promise.all([change, off]);
    expect([...mockScheduled.keys()]).toEqual([]);
  });

  it('a day chip tapped off and on quickly, many times, never gives two reminders on one day', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: [1, 2, 3, 4, 5, 6] }, 'CISA', RUN);
    const taps: Promise<void>[] = [];
    for (let k = 0; k < 6; k++) {
      taps.push(scheduleReminders({ enabled: true, hour: 19, minute: 0, days: k % 2 ? [1, 2, 3, 4, 5, 6] : EVERY_DAY }, 'CISA', RUN));
    }
    await Promise.all(taps);
    const reqs = [...mockScheduled.values()] as unknown as { trigger: { date: Date } }[];
    const dates = reqs.map((r) => r.trigger.date.toDateString());
    expect(new Set(dates).size).toBe(dates.length); // one reminder a day, ever
    // The last tap (k = 5) was Mon–Sat: no Sunday.
    expect(reqs.map((r) => r.trigger.date.getDay())).not.toContain(0);
  });

  it('a chip change then the off switch, back to back, leaves nothing scheduled', async () => {
    await scheduleReminders({ enabled: true, hour: 19, minute: 0, days: EVERY_DAY }, 'CISA', RUN);
    const chip = scheduleReminders({ enabled: true, hour: 19, minute: 0, days: WEEKDAYS }, 'CISA', RUN);
    const off = cancelReminders();
    await Promise.all([chip, off]);
    expect(mockScheduled.size).toBe(0);
  });
});
