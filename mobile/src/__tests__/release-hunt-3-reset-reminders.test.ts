/**
 * Release bug hunt round 3: after Settings → Reset CISA progress, the next study reminder still said
 * "The 12 you missed are back" (it was planned from the review queue before the reset). The reset
 * (lib/backup.ts resetLocalProgress, used by Settings and the account's "remove from this phone")
 * now plans the reminders again straight away, so the next one reads "Your study plan is ready".
 */
import { dayKey } from '../engine/streak';
import { getAllQuestions } from '../content/loader';
import { resetLocalProgress } from '../lib/backup';
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

type Scheduled = { identifier: string; content: { title: string; body: string } };
const scheduled = () => (mockN.scheduleNotificationAsync.mock.calls as unknown as [Scheduled][]).map(([req]) => req);
const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
const dayFromToday = (n: number) => {
  const d = new Date();
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12).getTime());
};

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa', reminder: { enabled: true, hour: 19, minute: 30 } });
  useProgress.getState().resetCert('cisa');
});

it('a reset plans the reminders again: the next one no longer names the old misses', async () => {
  useSettings.getState().setExamDate('cisa', dayFromToday(60));
  const ids = getAllQuestions('cisa').slice(0, 12).map((q) => q.id);
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
  expect(scheduled()[0].content.title).toBe('The 12 you missed are back');

  mockN.scheduleNotificationAsync.mockClear();
  resetLocalProgress(['cisa']);
  await flush();
  expect(Object.keys(useProgress.getState().byCert.cisa?.review ?? {})).toHaveLength(0);
  expect(mockN.scheduleNotificationAsync).toHaveBeenCalled();
  expect(scheduled()[0].content.title).toBe('Your study plan is ready');
});
