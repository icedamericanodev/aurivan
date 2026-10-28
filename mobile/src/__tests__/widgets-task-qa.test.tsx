/**
 * QA (widgets, Today's rule taps): the background task (widgets/task.android.ts).
 *
 * "Show the rule" is the first pill of the action row; once revealed, the
 * first pill of the same row is "Had it". A slow first redraw (the task starts
 * the app's JavaScript in the background, often a second or more) invites a
 * second tap, which then lands on "Had it" and silently records a self-check
 * that spaces the rule out by 7 days. Written as the behaviour we want
 * (it.failing until the 1.47.1 fix: taps within REVEAL_TAP_GUARD_MS are ignored).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { readReveal, REVEAL_KEY, WIDGET_KEY, widgetFace, parseSnapshot } from '../engine/widgets';
import { collectSnapshot } from '../lib/widgetData';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useWidgetStore } from '../store/widgets';
import { widgetTask } from '../widgets/task.android';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

const NOW = new Date(2026, 9, 29, 9, 0).getTime();
const TODAY = dayKey(NOW);
const info = { widgetName: 'TodaysRule', widgetId: 7, width: 376, height: 184, screenInfo: { fontScale: 1 } };

function click(clickAction: string) {
  return widgetTask({ widgetInfo: info, widgetAction: 'WIDGET_CLICK', clickAction, renderWidget: jest.fn() } as never);
}

beforeEach(async () => {
  jest.useFakeTimers({ now: NOW });
  await AsyncStorage.clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useProgress.setState(useProgress.getInitialState(), true);
  useWidgetStore.setState(useWidgetStore.getInitialState(), true);
  useSession.setState({ active: null });
  useSettings.getState().completeOnboarding('cisa', addDays(TODAY, 40), { familiarity: 'some', dailyMinutes: 20 });
  await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify(collectSnapshot(NOW)));
});
afterEach(() => jest.useRealTimers());

it('the reveal pill and the "Had it" pill are the same first pill of the action row', async () => {
  const snap = parseSnapshot(await AsyncStorage.getItem(WIDGET_KEY));
  expect(widgetFace('think', snap, { now: NOW, revealed: false }).action?.widgetAction).toBe('REVEAL');
  expect(widgetFace('think', snap, { now: NOW, revealed: true }).action?.widgetAction).toBe('HAD');
});

it('a quick second tap after "Show the rule" is not recorded as "Had it"', async () => {
  await click('REVEAL');
  jest.setSystemTime(NOW + 600); // the learner taps again 0.6 s later, on the same spot
  await click('HAD');
  const reveal = readReveal(await AsyncStorage.getItem(REVEAL_KEY), TODAY);
  // Was a bug: the self-check was saved (had: 1), and the rule spaced out by 7 days.
  expect(Object.keys(reveal.self)).toHaveLength(0);
});
