/**
 * Release bug hunt round 2: study reminders and the exam date, and the review count in the next reminder.
 *
 * Bug 1: after the exam date, Today shows "Exam done" and no plan, yet every app open scheduled 7
 * "Your study plan is ready" reminders. Now no reminders are scheduled once the exam has passed (the
 * saved choice stays on), a new date brings them back, and no reminder falls after exam day.
 * Bug 2: the next reminder named the whole review queue ("The 60 you missed are back"), a number the
 * app never shows anywhere else. It now names the set one tap starts (at most 20).
 */
import { beforeCutoff, capWaiting, examDayEnd } from '../engine/reminderLimits';
import { rollingPlan, slotCopy } from '../engine/reminders';
import { dayKey } from '../engine/streak';
import { getAllQuestions } from '../content/loader';
import { changeExamDate } from '../lib/activity';
import { refreshReminders } from '../lib/reminderSync';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockN = {
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted', canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async (req: { identifier: string }) => req.identifier),
};
jest.mock('expo-notifications', () => mockN);

type Scheduled = { identifier: string; content: { title: string; body: string }; trigger: { date: Date } };
const scheduled = () => (mockN.scheduleNotificationAsync.mock.calls as unknown as [Scheduled][]).map(([req]) => req);
const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
/** A calendar day `n` days from today ("2026-11-09"). */
const dayFromToday = (n: number) => {
  const d = new Date();
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12).getTime());
};
const ON = { enabled: true, hour: 19, minute: 30 };

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa', reminder: ON });
  useProgress.getState().resetCert('cisa');
});

describe('bug 1: no study reminders after the exam date', () => {
  it('a past exam date schedules nothing and keeps the saved choice on; a new date brings them back', async () => {
    useSettings.getState().setExamDate('cisa', dayFromToday(-36));
    await refreshReminders();
    await flush();
    expect(mockN.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(useSettings.getState().reminder.enabled).toBe(true);

    // A new date far ahead: changing it refreshes the reminders straight away (7 again).
    changeExamDate('cisa', dayFromToday(60));
    await flush();
    expect(mockN.scheduleNotificationAsync).toHaveBeenCalledTimes(7);
  });

  it('an exam in 3 days: no reminder falls after exam day', async () => {
    const exam = dayFromToday(3);
    useSettings.getState().setExamDate('cisa', exam);
    await refreshReminders();
    await flush();
    const reqs = scheduled();
    expect(reqs.length).toBeGreaterThan(0);
    expect(reqs.length).toBeLessThanOrEqual(4);
    for (const req of reqs) expect(req.trigger.date.getTime()).toBeLessThanOrEqual(examDayEnd(exam)!);
  });
});

describe('bug 1: the planned reminders stop at the exam (engine)', () => {
  const NOW = new Date(2026, 10, 6, 9, 0).getTime();
  it('examDayEnd is the last moment of exam day, local time; a bad date has no cut-off', () => {
    expect(examDayEnd('2026-11-09')).toBe(new Date(2026, 10, 9, 23, 59, 59, 999).getTime());
    expect(examDayEnd(undefined)).toBeUndefined();
    expect(examDayEnd('soon')).toBeUndefined();
  });
  it('reminders up to and on exam day, none after it, ids still in order', () => {
    const plan = beforeCutoff(rollingPlan(ON, NOW), examDayEnd('2026-11-09'));
    expect(plan.map((r) => dayKey(r.at))).toEqual(['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09']);
    expect(plan.map((r) => r.id)).toEqual(['aurivan.study.r1', 'aurivan.study.r2', 'aurivan.study.r3', 'aurivan.study.r4']);
  });
  it('a cut-off already gone plans none; no cut-off keeps all 7', () => {
    expect(beforeCutoff(rollingPlan(ON, NOW), examDayEnd('2026-11-01'))).toEqual([]);
    expect(beforeCutoff(rollingPlan(ON, NOW), undefined)).toHaveLength(7);
  });
});

describe('bug 2: the next reminder names at most the set one tap starts', () => {
  const base = { slot: 1, count: 7, certName: 'CISA' };
  it('60 due, all misses: "The 20 you missed are back"', () => {
    expect(slotCopy({ ...base, waiting: capWaiting({ due: 60, missed: 60 }) }).title).toBe('The 20 you missed are back');
  });
  it('60 due, 30 or 59 misses: "20 questions are back for review"', () => {
    expect(slotCopy({ ...base, waiting: capWaiting({ due: 60, missed: 30 }) }).title).toBe('20 questions are back for review');
    expect(slotCopy({ ...base, waiting: capWaiting({ due: 60, missed: 59 }) }).title).toBe('20 questions are back for review');
  });
  it('small numbers are unchanged', () => {
    expect(capWaiting({ due: 2, missed: 2 })).toEqual({ due: 2, missed: 2 });
    expect(capWaiting({ due: 3, missed: 1 })).toEqual({ due: 3, missed: 1 });
    expect(capWaiting({ due: 0, missed: 0 })).toEqual({ due: 0, missed: 0 });
  });
  it('through the real refresh: 60 missed reviews due give "The 20 you missed are back"', async () => {
    useSettings.getState().setExamDate('cisa', dayFromToday(60));
    const ids = getAllQuestions('cisa').slice(0, 60).map((q) => q.id);
    const past = Date.now() - 86_400_000;
    useProgress.setState((s) => ({
      byCert: {
        ...s.byCert,
        cisa: {
          ...s.byCert.cisa,
          answers: Object.fromEntries(ids.map((id) => [id, { attempts: 1, correctCount: 0, lastCorrect: false, lastAt: past }])),
          review: Object.fromEntries(ids.map((id) => [id, { box: 1, dueAt: past, lastSeen: past, reps: 1 }])),
        },
      },
    }));
    await refreshReminders();
    await flush();
    expect(scheduled()[0].content.title).toBe('The 20 you missed are back');
  });
});
