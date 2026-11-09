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

function click(clickAction: string, widgetInfo: Record<string, unknown> = info, renderWidget = jest.fn()) {
  return widgetTask({ widgetInfo, widgetAction: 'WIDGET_CLICK', clickAction, renderWidget } as never);
}
/** The words a render call drew (light tree). */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildWidgetTree } = require('react-native-android-widget/lib/commonjs/api/build-widget-tree') as { buildWidgetTree: (el: unknown) => Tree };
interface Tree {
  type: string;
  props: { text?: string };
  children?: Tree[];
}
const words = (t: Tree, out: string[] = []): string[] => {
  if (t.type === 'TextWidget' && t.props.text) out.push(t.props.text);
  (t.children ?? []).forEach((c) => words(c, out));
  return out;
};
const drawn = (render: jest.Mock) => words(buildWidgetTree(render.mock.calls[render.mock.calls.length - 1][0].light)).join(' | ');

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

it('the face: "Show the rule", then "Had it" (since 1.48 the layouts draw them in different places: widgets-layout.test.tsx)', async () => {
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

describe('1.48: the Recall card and the Key term reveal on the widget too', () => {
  const recallInfo = { widgetName: 'QuickQuestion', widgetId: 11, width: 376, height: 184, screenInfo: { fontScale: 1 } };
  const termInfo = { widgetName: 'Revisit', widgetId: 12, width: 182, height: 184, screenInfo: { fontScale: 1 } };
  /** A snapshot with one Recall card for today (the real bank question d1_001). */
  async function withRecall() {
    const snap = parseSnapshot(await AsyncStorage.getItem(WIDGET_KEY))!;
    snap.recall = [{ day: TODAY, id: 'd1_001', stem: 'Which basis is BEST?', answer: 'The business impact analysis', cue: 'impact first.', weeks: 3, topic: 'Audit process' }];
    await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify(snap));
  }

  it('Show the answer, then Had it: the check is kept by question, beside the rule’s, and nothing is written to progress', async () => {
    await withRecall();
    const before = JSON.stringify(useProgress.getState());
    const r1 = jest.fn();
    await click('REVEAL', recallInfo, r1);
    expect(drawn(r1)).toContain('The business impact analysis');
    expect(drawn(r1)).toContain('Exam cue: impact first.');
    jest.setSystemTime(NOW + 600); // a quick second tap is not an answer
    await click('HAD', recallInfo);
    expect(readReveal(await AsyncStorage.getItem(REVEAL_KEY), TODAY).recall).toEqual({});
    jest.setSystemTime(NOW + 5000);
    const r2 = jest.fn();
    await click('HAD', recallInfo, r2);
    const reveal = readReveal(await AsyncStorage.getItem(REVEAL_KEY), TODAY);
    expect(reveal.recall).toEqual({ d1_001: { had: 1, notYet: 0, last: 'had', on: TODAY } });
    expect(reveal.self).toEqual({});
    expect(drawn(r2)).toContain('A new card tomorrow.');
    expect(JSON.stringify(useProgress.getState())).toBe(before);
  });

  it('the Key term reveals its meaning; it has no self-check', async () => {
    const snap = parseSnapshot(await AsyncStorage.getItem(WIDGET_KEY))!;
    const t = snap.terms.find((x) => x.day === TODAY)!;
    const r = jest.fn();
    await click('REVEAL', termInfo, r);
    expect(drawn(r)).toContain(t.meaning);
    await click('HAD', termInfo);
    const reveal = readReveal(await AsyncStorage.getItem(REVEAL_KEY), TODAY);
    expect(reveal.ids).toContain(12);
    expect(reveal.self).toEqual({});
    expect(reveal.recall).toEqual({});
  });
});

/**
 * react-native-android-widget 0.26 (Expo SDK 58) measures a widget's real size
 * from the first tap on it. When that size differs from what the launcher
 * reported, the library swallows that tap and asks for a redraw with
 * WIDGET_RESIZED (so the drawing and its tap areas line up again). Our task
 * must simply redraw at the new size: keep today's reveal, write nothing.
 */
describe('0.26 size calibration: WIDGET_RESIZED redraws at the corrected size', () => {
  it('a revealed card stays revealed, drawn at the new size, and nothing is saved', async () => {
    await click('REVEAL');
    const revealBefore = await AsyncStorage.getItem(REVEAL_KEY);
    const progressBefore = JSON.stringify(useProgress.getState());
    const render = jest.fn();
    jest.setSystemTime(NOW + 5000);
    await widgetTask({ widgetInfo: { ...info, width: 320, height: 160 }, widgetAction: 'WIDGET_RESIZED', renderWidget: render } as never);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render.mock.calls[0][0].light.props).toMatchObject({ width: 320, height: 160 });
    expect(drawn(render)).toContain('Had it');
    expect(await AsyncStorage.getItem(REVEAL_KEY)).toBe(revealBefore);
    expect(JSON.stringify(useProgress.getState())).toBe(progressBefore);
  });
});
