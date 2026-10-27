/**
 * Mobile 1.47, home-screen widgets: "Remove my progress from this phone"
 * (security review M2).
 *
 * On a shared phone the next learner must not inherit the last one's widget
 * choices or see their words on the home screen. The wipe:
 * - puts the widget choices and counters back to their start (readiness and
 *   exam timing off) in the SAME storage write as the study stores;
 * - removes the widget snapshot and Today's rule's marks;
 * - redraws every widget before it resolves (no waiting for the usual delay).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { REVEAL_KEY, WIDGET_KEY } from '../engine/widgets';
import { wipeLocalStudy } from '../lib/backup';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { useWidgetStore } from '../store/widgets';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
// This test is about the Android build: the wipe's redraw goes through the real Android widget code.
jest.mock('../lib/widgets', () => jest.requireActual('../lib/widgets.android'));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  scheduleNotificationAsync: async () => 'id',
}));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

const NOW = new Date(2026, 9, 29, 9, 0).getTime();
const TODAY = dayKey(NOW);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  useSettings.setState(useSettings.getInitialState(), true);
  useProgress.setState(useProgress.getInitialState(), true);
  useWidgetStore.setState(useWidgetStore.getInitialState(), true);
  useSettings.getState().completeOnboarding('cisa', addDays(TODAY, 21), { familiarity: 'some', dailyMinutes: 20 });
  ['d1_001', 'd1_002', 'd4_010'].forEach((id, i) => useProgress.getState().recordAnswer('cisa', id, i % 2 === 0, 'sure'));
});

it('resets the widget choices in the same write, removes the snapshot and marks, and redraws before it resolves', async () => {
  const ws = useWidgetStore.getState();
  ws.setReadiness('show', TODAY);
  ws.setTiming(true);
  ws.setDetails('hide');
  ws.noteOpen('plan', TODAY);
  await AsyncStorage.setItem(WIDGET_KEY, '{"v":1,"plan":{"title":"Operations"}}');
  await AsyncStorage.setItem(REVEAL_KEY, '{"day":"2026-10-29","ids":[3]}');
  const multiSet = jest.spyOn(AsyncStorage, 'multiSet');

  await wipeLocalStudy();

  // One write holds the study stores AND the widget store.
  const write = multiSet.mock.calls.map((c) => c[0].map(([k]) => k)).find((k) => k.includes('aurivan.widgetPrefs.v1') && k.includes('aurivan.progress.v1'));
  const keys = write ?? [];
  expect(keys).toEqual(expect.arrayContaining(['aurivan.settings.v1', 'aurivan.progress.v1', 'aurivan.widgetPrefs.v1']));
  const saved = JSON.parse((await AsyncStorage.getItem('aurivan.widgetPrefs.v1'))!).state;
  expect(saved.prefs).toEqual({ details: 'show', readiness: 'off', timing: false });
  expect(saved.stats.opens).toEqual({});
  expect(useWidgetStore.getState().prefs).toEqual({ details: 'show', readiness: 'off', timing: false });
  expect(useWidgetStore.getState().readinessShownSince).toBeUndefined();
  // The marks are gone; the snapshot was rewritten from the empty stores (no previous plan, no readiness).
  expect(await AsyncStorage.getItem(REVEAL_KEY)).toBeNull();
  const snap = JSON.parse((await AsyncStorage.getItem(WIDGET_KEY)) ?? 'null');
  expect(snap?.ready ?? null).toBeNull();
  expect(snap.plan.title).not.toBe('Operations');
  expect(snap.answered).toBe(false);
  // Every widget was asked to redraw before the wipe finished.
  expect((requestWidgetUpdate as jest.Mock).mock.calls.length).toBe(8);
  multiSet.mockRestore();
});
