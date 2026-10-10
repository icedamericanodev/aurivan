/**
 * QA Build 1: a learner updating from mobile 1.1 keeps everything.
 *
 * The saved blobs below have the exact 1.1 shapes: settings with a
 * reminder that has no `days` and no `gameRulesSeen`; progress with no
 * `gameRecent`, and a frozen Today plan whose game labels use the old names
 * ("Trap Spotter · 2 min", "Calibrated Sprint", "Priority Lens").
 *
 * After loading: nothing is lost, the new fields get safe defaults, old
 * plan items show today's game names and honest lengths, and the 19:00
 * reminder from 1.1 (old copy, no id) is replaced by one calm daily
 * reminder at the same time when the app re-applies it on launch.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { itemMinutes } from '../engine/dayPlan';
import { GAMES, gameTitle } from '../engine/games/registry';
import { DAILY_ID, LEGACY_TITLE, reminderPlan, reminderSummary } from '../engine/reminders';
import { scheduleReminders } from '../lib/reminders';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
const mockScheduled = new Map<string, { identifier: string; content: { title: string; body?: string }; trigger?: unknown }>();
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getAllScheduledNotificationsAsync: async () => [...mockScheduled.values()],
  cancelScheduledNotificationAsync: async (id: string) => {
    mockScheduled.delete(id);
  },
  scheduleNotificationAsync: async (req: { identifier: string; content: { title: string }; trigger: unknown }) => {
    mockScheduled.set(req.identifier, req);
    return req.identifier;
  },
}));

const OLD_SETTINGS = {
  state: {
    onboarded: true,
    activeCertId: 'cisa',
    examDates: { cisa: '2026-12-01' },
    theme: 'dark',
    shuffleOptions: false,
    dailyGoal: 30,
    reminder: { enabled: true, hour: 19, minute: 0 },
    haptics: false,
  },
  version: 1,
};

const oldItems = [
  { kind: 'review', count: 7 },
  { kind: 'practice', count: 20, label: '20 mixed questions' },
  { kind: 'game', gameId: 'trap', label: 'Trap Spotter · 2 min' },
  { kind: 'game', gameId: 'sprint', label: 'Calibrated Sprint · check your confidence' },
  { kind: 'game', gameId: 'priority', label: 'Priority Lens · read like the examiner' },
];
const OLD_CISA = {
  answers: { d1_001: { attempts: 2, correct: 1, lastCorrect: true, lastAt: 1_780_000_000_000 } },
  review: { d1_002: { box: 2, dueAt: 1_780_100_000_000, lastSeen: 1_780_000_000_000, reps: 2 } },
  bookmarks: ['d2_010'],
  mocks: [{ id: 'mock-1', at: 1_780_000_000_000, total: 150, correct: 101 }],
  lessonsDone: ['cisa-l-d1-engagement'],
  mistakes: { d1_002: { picked: 'B', at: 1_780_000_000_000, resolved: false, confidence: 'sure' } },
  gameBest: { trap: 8, sprint: 11, priority: 9 },
  notesRead: ['1A1.1'],
  moments: { readySeenAt: 1_780_000_000_000 },
};
const OLD_PROGRESS = {
  state: {
    byCert: { cisa: OLD_CISA },
    streak: { current: 4, best: 9, lastDay: '2026-10-09' },
    today: { day: '2026-10-09', answered: 12 },
    days: {
      cisa: {
        day: '2026-10-09',
        certId: 'cisa',
        items: oldItems,
        done: [true, false, false, false, false],
        start: { score: 0.4, domains: {} },
        answered: 12,
        correct: 9,
        minutes: 15,
      },
    },
  },
  version: 2,
};

beforeAll(async () => {
  await AsyncStorage.setItem('aurivan.settings.v1', JSON.stringify(OLD_SETTINGS));
  await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(OLD_PROGRESS));
  await useSettings.persist.rehydrate();
  await useProgress.persist.rehydrate();
});

describe('updating from 1.1', () => {
  it('keeps every setting, and the new fields get safe defaults', () => {
    const s = useSettings.getState();
    expect(s).toMatchObject({ onboarded: true, activeCertId: 'cisa', theme: 'dark', shuffleOptions: false, dailyGoal: 30, haptics: false });
    expect(s.examDates).toEqual({ cisa: '2026-12-01' });
    expect(s.reminder).toEqual({ enabled: true, hour: 19, minute: 0 });
    // Rules not seen yet: Sure Footing shows them once.
    expect(s.gameRulesSeen).toEqual([]);
    expect(reminderSummary(s.reminder)).toBe('Every day at 19:00');
  });

  it('keeps every bit of progress, and adds an empty score history', () => {
    const cp = selectCert(useProgress.getState(), 'cisa');
    for (const [k, v] of Object.entries(OLD_CISA)) expect(cp[k as keyof typeof cp]).toEqual(v);
    expect(cp.gameRecent).toEqual({});
    const st = useProgress.getState();
    expect(st.streak).toEqual(OLD_PROGRESS.state.streak);
    expect(st.today).toEqual(OLD_PROGRESS.state.today);
    expect(st.days.cisa.done).toEqual([true, false, false, false, false]);
  });

  it("an old Today plan shows today's game names and lengths from the registry", () => {
    const items = useProgress.getState().days.cisa.items;
    const games = items.filter((i) => i.kind === 'game');
    expect(games.map((g) => (g.kind === 'game' ? gameTitle(g.gameId, g.label) : ''))).toEqual(['Snare Spotter', 'Sure Footing', 'Signpost']);
    expect(games.map(itemMinutes)).toEqual([GAMES.trap.minutes, GAMES.sprint.minutes, GAMES.priority.minutes]);
  });

  it('a new round adds to the history and keeps the old best', () => {
    useProgress.getState().recordGame('cisa', 'sprint', 6);
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.gameBest).toEqual({ trap: 8, sprint: 11, priority: 9 });
    expect(cp.gameRecent).toEqual({ sprint: [6] });
  });

  it("relaunch: the 1.1 reminder (no id, old copy) becomes one calm daily reminder at 19:00", async () => {
    // What 1.1 left on the phone: its own reminder (random id) and someone else's.
    mockScheduled.set('a1b2-random', { identifier: 'a1b2-random', content: { title: LEGACY_TITLE, body: '10 CISA questions keep your streak alive.' } });
    mockScheduled.set('other-app-thing', { identifier: 'other-app-thing', content: { title: 'Not ours' } });
    // What app/_layout.tsx does once settings have loaded.
    const { reminder } = useSettings.getState();
    expect(reminderPlan(reminder)).toEqual([{ id: DAILY_ID, kind: 'daily', hour: 19, minute: 0 }]);
    await scheduleReminders(reminder, 'CISA');
    expect([...mockScheduled.keys()].sort()).toEqual([DAILY_ID, 'other-app-thing'].sort());
    const ours = mockScheduled.get(DAILY_ID)!;
    expect(ours.content.title).not.toBe(LEGACY_TITLE);
    expect(ours.content.body).not.toMatch(/streak/i);
    expect(ours.trigger).toMatchObject({ type: 'daily', hour: 19, minute: 0 });
  });
});
