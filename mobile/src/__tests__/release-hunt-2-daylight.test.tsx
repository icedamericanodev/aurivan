/**
 * Release bug hunt round 2: Daylight.
 * Bug 5: the light strip's once-a-second tick redrew the whole round screen, all four option cards
 * included (40 card draws in 10 seconds). The tick now lives in the strip (DaylightStrip).
 * Bug 10: fast answers read "Average 0 seconds" / "Slowest: 1 seconds", and a light used under 1:30
 * was spoken as "0 minutes" or "1 minute". Now "under 1 second", "1 second", and the spoken time in
 * minutes and seconds ("25 seconds of 10 minutes").
 *
 * Counts components that rendered (jest/perf/renderCounter.ts), never milliseconds.
 */
// MUST load before react-test-renderer (React reads the devtools hook once).
import { renderNames, resetRenders } from '../../jest/perf/renderCounter';
import { Profiler } from 'react';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import DaylightScreen from '../app/game/daylight';
import { PaceStrip } from '../components/pace';
import { OptionCard } from '../components/quiz';
import { spokenClock } from '../engine/pace';
import { secondsWords } from '../engine/resultsCopy';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const S = 1000;
let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const press = (label: string) =>
  act(() => {
    root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0].props.onPress();
  });
const tick = (ms: number) => {
  for (let t = 0; t < ms; t += S) act(() => { jest.advanceTimersByTime(S); });
};
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 12, 9, 0, 0) });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: () => {} }) as ReturnType<typeof AppState.addEventListener>);
  Object.defineProperty(AppState, 'currentState', { value: 'active' as AppStateStatus, configurable: true });
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa' });
  act(() => {
    r = create(
      <Profiler id="screen" onRender={() => {}}>
        <DaylightScreen />
      </Profiler>,
    );
  });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('bug 5: a round redraws only the light strip each second', () => {
  it('no option card or question redraw across 10 ticks; the strip still moves', () => {
    press('Skilled, 80 seconds a question');
    press('Start');
    expect(root().findByType(PaceStrip).props.clock.text).toBe('06:40');
    resetRenders({ names: true });
    tick(10 * S);
    const names = renderNames().screen ?? {};
    expect(names.OptionCard ?? 0).toBe(0);
    expect(names.QuestionHead ?? 0).toBe(0);
    expect(names.DaylightStrip ?? 0).toBeGreaterThan(0);
    expect(root().findByType(PaceStrip).props.clock.text).toBe('06:30');
  });
});

describe('bug 10: fast answers in words', () => {
  it('secondsWords: under 1, 1 and 2 seconds; spokenClock says 25 seconds', () => {
    expect(secondsWords(0)).toBe('under 1 second');
    expect(secondsWords(1)).toBe('1 second');
    expect(secondsWords(2)).toBe('2 seconds');
    expect(spokenClock(25_000)).toBe('25 seconds');
  });

  it('five quick answers: the recap shows "under 1 second" and speaks the light used in seconds', () => {
    press('Start');
    for (let i = 0; i < 5; i++) {
      act(() => { root().findAllByType(OptionCard)[0].props.onPress(); });
      press(i < 4 ? 'Next question' : 'See results');
    }
    const text = allText();
    expect(text).toContain('Average under 1 second a question');
    expect(text).not.toMatch(/\b[01] seconds\b/);
    const used = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Light used:'))[0];
    expect(used.props.accessibilityLabel).toMatch(/^Light used: 0 seconds of 10 minutes/);
  });
});
