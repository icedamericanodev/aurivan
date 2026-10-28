/**
 * Mobile 1.47, home-screen widgets: the app's own widget screens (rendered as
 * on an Android phone).
 *
 * - Settings → Home-screen widgets: the Details switch says exactly what it
 *   hides; exam timing is its own switch (off); Readiness lists Rings only
 *   first; "Add a widget" is a list of buttons, recommended widgets first.
 * - The one suggestion card, the one readiness re-ask, the tester card and
 *   the numbers row.
 * - The "choose" screen Android opens when Readiness or Exam countdown is
 *   added: choosing sets the switch and finishes the add; "Not now" cancels it.
 */
import type { JSX } from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { Text } from 'react-native';
import { ReadinessAskCard, TIMING_SUBTITLE, DETAILS_SUBTITLE, WidgetNumbersRow, WidgetOfferCard, WidgetSettingsGroup, WidgetTesterCard } from '../components/widgetSettings';
import { WIDGET_KINDS, WIDGET_TITLES } from '../engine/widgets';
import { W14_QUESTIONS } from '../engine/widgetTester';
import { useWidgetStore } from '../store/widgets';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockPin = jest.fn(async (_kind: string) => true);
const mockRefresh = jest.fn(async () => {});
jest.mock('../lib/widgets', () => ({ widgetsSupported: true, pinWidget: (k: string) => mockPin(k), refreshWidgets: () => mockRefresh() }));
const mockOpenEmail = jest.fn(async () => 'opened');
jest.mock('../lib/support', () => ({ ...jest.requireActual('../lib/support'), openEmail: () => mockOpenEmail() }));

const textOf = (root: ReactTestInstance) => root.findAllByType(Text).map((t) => [t.props.children].flat().join('')).join(' | ');
const byLabel = (root: ReactTestInstance, label: string) => root.find((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
async function render(el: JSX.Element) {
  let r!: ReturnType<typeof create>;
  await act(async () => {
    r = create(el);
  });
  return r;
}

beforeEach(() => {
  useWidgetStore.setState(useWidgetStore.getInitialState(), true);
  mockPin.mockClear();
  mockRefresh.mockClear();
});

describe('Settings → Home-screen widgets', () => {
  it('the privacy line, Details (exactly what it hides), exam timing (off) and Readiness (off)', async () => {
    const r = await render(<WidgetSettingsGroup />);
    const all = textOf(r.root);
    expect(all).toContain('Widgets never show your name, and nothing leaves this phone.');
    expect(all).toContain(DETAILS_SUBTITLE);
    expect(DETAILS_SUBTITLE).toMatch(/Topics, counts, questions, rules and exam timing/);
    expect(all).toContain('Exam timing on widgets');
    expect(all).toContain(TIMING_SUBTITLE);
    expect(all).toContain('Readiness widget');
    expect(useWidgetStore.getState().prefs).toEqual({ details: 'show', readiness: 'off', timing: false });
    const toggle = (title: string) => r.root.find((n) => n.props.title === title && typeof n.props.onValueChange === 'function');
    await act(async () => toggle('Details on widgets').props.onValueChange(false));
    await act(async () => toggle('Exam timing on widgets').props.onValueChange(true));
    expect(useWidgetStore.getState().prefs).toEqual({ details: 'hide', readiness: 'off', timing: true });
  });

  it('Readiness: Rings only first and recommended', async () => {
    const r = await render(<WidgetSettingsGroup openOnMount="readiness" />);
    const all = textOf(r.root);
    expect(all.indexOf('Rings only')).toBeLessThan(all.indexOf('Rings and your range'));
    expect(all).toContain('Recommended');
  });

  it('Add a widget: one button per widget, recommended first (buttons, not radio buttons)', async () => {
    const r = await render(<WidgetSettingsGroup />);
    await act(async () => byLabel(r.root, 'Add a widget, Choose one for your home screen').props.onPress());
    const rows = r.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Add ') && n.props.accessibilityRole === 'button');
    const order = [...new Set(rows.map((n) => n.props.accessibilityLabel as string))].map((l) => WIDGET_KINDS.find((k) => l.startsWith(`Add ${WIDGET_TITLES[k]}.`)))
      .filter(Boolean);
    expect(order).toHaveLength(8);
    expect(order.slice(0, 4)).toEqual(['plan', 'plant', 'think', 'week']);
    expect(r.root.findAll((n) => n.props.accessibilityRole === 'radio')).toHaveLength(0);
    await act(async () => rows.find((n) => n.props.accessibilityLabel.startsWith('Add Your plant.'))!.props.onPress());
    expect(mockPin).toHaveBeenCalledWith('plant');
  });
});

describe('the one suggestion card', () => {
  it('Not now ends it for good', async () => {
    useWidgetStore.getState().showOffer('2026-10-29');
    const r = await render(<WidgetOfferCard />);
    expect(textOf(r.root)).toContain('It never shows your name.');
    await act(async () => byLabel(r.root, 'Not now. This won’t be suggested again.').props.onPress());
    expect(useWidgetStore.getState().offer).toEqual({ shownOn: '2026-10-29', answer: 'not-now' });
    expect(mockPin).not.toHaveBeenCalled();
  });

  it('Add widget asks the launcher for Today’s plan', async () => {
    const r = await render(<WidgetOfferCard />);
    await act(async () => byLabel(r.root, 'Add widget').props.onPress());
    expect(mockPin).toHaveBeenCalledWith('plan');
    expect(useWidgetStore.getState().offer?.answer).toBe('added');
  });
});

describe('the one readiness re-ask', () => {
  it('"Rings only" takes the number off the home screen; either answer ends it', async () => {
    useWidgetStore.getState().setReadiness('show', '2026-09-01');
    const r = await render(<ReadinessAskCard />);
    expect(textOf(r.root)).toContain('Keep your readiness number on your home screen?');
    await act(async () => byLabel(r.root, 'Rings only').props.onPress());
    expect(useWidgetStore.getState().prefs.readiness).toBe('private');
    expect(useWidgetStore.getState().readinessAsked).toBe(true);
  });
});

describe('beta tester widget card and numbers', () => {
  it('the 14-day card: three questions, the count line "Not put in the email", and email answers', async () => {
    const card = { id: 'w14' as const, caption: 'Widgets: two-week check-in', questions: W14_QUESTIONS, countLine: 'Since you added a KaiSip widget, you studied on 9 of 14 days.' };
    const r = await render(<WidgetTesterCard card={card} today="2026-10-29" />);
    const all = textOf(r.root);
    for (const q of W14_QUESTIONS) expect(all).toContain(q);
    expect(all).toContain('Not put in the email.');
    await act(async () => byLabel(r.root, 'Answer by email').props.onPress());
    expect(useWidgetStore.getState().tester.answered).toEqual(['w14']);
  });

  it('the numbers row opens read-only lines', async () => {
    useWidgetStore.getState().noteOpen('plan', '2026-10-29');
    const r = await render(<WidgetNumbersRow />);
    await act(async () => byLabel(r.root, 'Widget numbers on this phone, For your tester emails. Never sent by the app.').props.onPress());
    expect(textOf(r.root)).toMatch(/Today’s plan: not seen on your home screen\. Opened 1 times/);
  });
});

describe('the "choose" screen when Readiness or Exam countdown is added', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WidgetConfigScreen, READY_TIMEOUT_MS } = require('../components/widgetConfigScreen.android') as typeof import('../components/widgetConfigScreen.android');
  const info = (widgetName: string) => ({ widgetId: 7, widgetName, width: 182, height: 184, screenInfo: { fontScale: 1, density: 2, densityDpi: 320, screenHeightDp: 800, screenWidthDp: 412 } });

  it('Readiness: "Rings only" sets the switch, draws the widget and finishes the add', async () => {
    const setResult = jest.fn();
    const renderWidget = jest.fn();
    const r = await render(<WidgetConfigScreen widgetInfo={info('Readiness')} setResult={setResult} renderWidget={renderWidget} />);
    const all = textOf(r.root);
    expect(all).toContain('How should Readiness show?');
    expect(all.indexOf('Rings only')).toBeLessThan(all.indexOf('Rings and your range'));
    await act(async () => byLabel(r.root, 'Rings only (recommended)').props.onPress());
    expect(useWidgetStore.getState().prefs.readiness).toBe('private');
    expect(mockRefresh).toHaveBeenCalled();
    expect(renderWidget).toHaveBeenCalled();
    expect(setResult).toHaveBeenCalledWith('ok');
  });

  it('Exam countdown: "Show weeks to my exam" turns on exam timing; "Not now" cancels the add', async () => {
    const ok = jest.fn();
    const r = await render(<WidgetConfigScreen widgetInfo={info('ExamCountdown')} setResult={ok} renderWidget={jest.fn()} />);
    await act(async () => byLabel(r.root, 'Show weeks to my exam').props.onPress());
    expect(useWidgetStore.getState().prefs.timing).toBe(true);
    expect(ok).toHaveBeenCalledWith('ok');

    useWidgetStore.setState(useWidgetStore.getInitialState(), true);
    const cancel = jest.fn();
    const r2 = await render(<WidgetConfigScreen widgetInfo={info('ExamCountdown')} setResult={cancel} renderWidget={jest.fn()} />);
    await act(async () => byLabel(r2.root, 'Not now').props.onPress());
    expect(cancel).toHaveBeenCalledWith('cancel');
    expect(useWidgetStore.getState().prefs.timing).toBe(false);
  });

  it('1.47.1: if saved data never loads, the add still finishes after a few seconds (buttons never stuck), writing nothing', async () => {
    jest.useFakeTimers();
    const hydrated = jest.spyOn(useWidgetStore.persist, 'hasHydrated').mockReturnValue(false);
    const onFinish = jest.spyOn(useWidgetStore.persist, 'onFinishHydration').mockReturnValue(() => {});
    try {
      const setResult = jest.fn();
      const renderWidget = jest.fn();
      const r = await render(<WidgetConfigScreen widgetInfo={info('Readiness')} setResult={setResult} renderWidget={renderWidget} />);
      await act(async () => byLabel(r.root, 'Rings only (recommended)').props.onPress());
      await act(async () => {
        await jest.advanceTimersByTimeAsync(READY_TIMEOUT_MS - 100);
      });
      expect(setResult).not.toHaveBeenCalled();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(200);
      });
      expect(setResult).toHaveBeenCalledWith('ok');
      expect(useWidgetStore.getState().prefs.readiness).toBe('off');
      expect(mockRefresh).not.toHaveBeenCalled();
      expect(renderWidget).not.toHaveBeenCalled();
    } finally {
      hydrated.mockRestore();
      onFinish.mockRestore();
      jest.useRealTimers();
    }
  });

  it('any other widget closes at once', async () => {
    const setResult = jest.fn();
    await render(<WidgetConfigScreen widgetInfo={info('TodayPlan')} setResult={setResult} renderWidget={jest.fn()} />);
    expect(setResult).toHaveBeenCalledWith('cancel');
  });
});
