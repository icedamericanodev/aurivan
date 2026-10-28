/**
 * QA (widgets, refresh): when the app actually redraws the placed widgets.
 *
 * Each test is a bug found in the 1.47 widget QA pass, written as the
 * behaviour we want (they were it.failing until the 1.47.1 fixes landed).
 *
 * Background on the first one: React Native on Android stops firing JS timers
 * when the app goes to the background (JavaTimerManager.onHostPause), unless
 * a headless task is running. So a refresh still waiting in scheduleRefresh's
 * 1.2 s setTimeout when the learner presses Home does not run until the app
 * is opened again (or the next 3-hourly widget update starts a headless task).
 * Here "the app went to the background" = the AppState event, with no timer
 * advanced afterwards.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useWidgetStore } from '../store/widgets';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const android = require('../lib/widgets.android') as typeof import('../lib/widgets.android');

const NOW = new Date(2026, 9, 29, 9, 0).getTime();
const TODAY = dayKey(NOW);
let appState: ((s: AppStateStatus) => void) | null = null;

function setUp() {
  useSettings.setState(useSettings.getInitialState(), true);
  useProgress.setState(useProgress.getInitialState(), true);
  useWidgetStore.setState(useWidgetStore.getInitialState(), true);
  useSession.setState({ active: null });
  useSettings.getState().completeOnboarding('cisa', addDays(TODAY, 40), { familiarity: 'some', dailyMinutes: 20 });
  useProgress.getState().recordAnswer('cisa', 'd1_001', true, 'sure');
}
const quiz = (n = 2) =>
  ({ id: 's', mode: 'practice', certId: 'cisa', title: 'x', questionIds: ['d1_003', 'd1_004', 'd1_005'].slice(0, n), perms: {}, index: 0, responses: {}, flagged: [], startedAt: NOW }) as never;
/** Let promises (AsyncStorage, the redraw calls) settle WITHOUT firing any timer. */
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
const redraws = () => (requestWidgetUpdate as jest.Mock).mock.calls.length;

beforeEach(async () => {
  jest.useFakeTimers({ now: NOW });
  await AsyncStorage.clear();
  android.resetWidgetsForTest();
  appState = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_t, fn) => {
    appState = fn as (s: AppStateStatus) => void;
    return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function started() {
  setUp();
  const stop = android.startWidgetSync();
  await jest.advanceTimersByTimeAsync(3000);
  (requestWidgetUpdate as jest.Mock).mockClear();
  return stop;
}

it('a quiz ends and the learner presses Home within 1.2 s: the widgets still redraw (flush on background)', async () => {
  const stop = await started();
  useSession.setState({ active: quiz() });
  useSession.setState({ active: null }); // finished and closed
  appState?.('background'); // Home pressed: from here on, no JS timer fires
  await settle();
  // Was a bug: the refresh sat in a paused setTimeout; nothing was redrawn until the app opened again.
  expect(redraws()).toBe(8);
  stop();
});

it('Quick question answered, then Home (no "Done"): the widget stops saying "Answer"', async () => {
  const stop = await started();
  useSession.setState({ active: quiz(1) }); // the one-question session the widget opened
  useProgress.getState().recordAnswer('cisa', 'd1_003', true, 'sure');
  appState?.('background');
  await settle();
  await jest.advanceTimersByTimeAsync(5000);
  // Was a bug: the session is still "open" (exitSingle only runs on Done/Back), and nothing refreshed on background.
  expect(redraws()).toBeGreaterThan(0);
  stop();
});

it('a paused quiz or mock does not freeze the widgets: a new exam date still redraws them', async () => {
  const stop = await started();
  useSession.setState({ active: quiz() }); // e.g. a mock paused with "Pause": it can stay open for days
  useSettings.getState().setExamDate('cisa', addDays(TODAY, 10));
  await jest.advanceTimersByTimeAsync(5000);
  // Was a bug: startWidgetSync dropped every settings/progress change while any session was unfinished.
  expect(redraws()).toBe(8);
  stop();
});

it('control: with no quiz open, a settings change redraws all 8 kinds about a second later', async () => {
  const stop = await started();
  useSettings.getState().setExamDate('cisa', addDays(TODAY, 10));
  await jest.advanceTimersByTimeAsync(5000);
  expect(redraws()).toBe(8);
  stop();
});

describe('1.47.1: the redraw just after midnight, while the app is open', () => {
  it('redraws every kind just after local midnight, then again the next night', async () => {
    const stop = await started();
    await jest.advanceTimersByTimeAsync(14 * 3600_000); // 23:00: nothing yet
    expect(redraws()).toBe(0);
    await jest.advanceTimersByTimeAsync(3600_000 + 10_000); // just past midnight
    expect(redraws()).toBe(8);
    (requestWidgetUpdate as jest.Mock).mockClear();
    await jest.advanceTimersByTimeAsync(24 * 3600_000);
    expect(redraws()).toBe(8);
    stop();
  });

  it('stops when the app leaves the front (Android pauses timers then) and starts again when it comes back', async () => {
    const stop = await started();
    appState?.('background');
    await settle();
    await jest.advanceTimersByTimeAsync(16 * 3600_000); // past midnight, app in the background
    expect(redraws()).toBe(0);
    appState?.('active'); // back: one redraw now, and the next midnight is set again
    await jest.advanceTimersByTimeAsync(1000);
    expect(redraws()).toBe(8);
    (requestWidgetUpdate as jest.Mock).mockClear();
    await jest.advanceTimersByTimeAsync(24 * 3600_000);
    expect(redraws()).toBe(8);
    stop();
  });

  it('the stop function clears it', async () => {
    const stop = await started();
    stop();
    await jest.advanceTimersByTimeAsync(48 * 3600_000);
    expect(redraws()).toBe(0);
  });
});

describe('1.47.1: answers during a quiz are pending, never lost', () => {
  it('leaving the app with nothing waiting draws nothing extra', async () => {
    const stop = await started();
    appState?.('background');
    await settle();
    expect(redraws()).toBe(0);
    stop();
  });

  it('a mid-quiz answer waits (no redraw), then draws when the quiz ends', async () => {
    const stop = await started();
    useSession.setState({ active: quiz() });
    useProgress.getState().recordAnswer('cisa', 'd1_003', true, 'sure');
    await jest.advanceTimersByTimeAsync(5000);
    expect(redraws()).toBe(0);
    useSession.setState({ active: null });
    await jest.advanceTimersByTimeAsync(5000);
    expect(redraws()).toBe(8);
    // Drawn once: leaving the app afterwards has nothing left to draw.
    (requestWidgetUpdate as jest.Mock).mockClear();
    appState?.('background');
    await settle();
    expect(redraws()).toBe(0);
    stop();
  });
});
