/**
 * Release bug hunt round 1: the mock exam clock redrew the WHOLE question screen every second
 * (about 200 components), and with the navigator open all 150 grid cells too (about 1,000),
 * for the whole exam, even with "Hide the clock" on. Now the tick lives in the clock strip
 * (session.tsx MockClock): the question, its options and the navigator stay as they are.
 *
 * Counts components that rendered (jest/perf/renderCounter.ts), never milliseconds.
 */
// MUST load before react-test-renderer (React reads the devtools hook once).
import { renderNames, renders, resetRenders } from '../../jest/perf/renderCounter';
import { Profiler } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import SessionScreen from '../app/session';
import { startMock } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';

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
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = () => {
  act(() => {
    r = create(
      <Profiler id="screen" onRender={() => {}}>
        <SessionScreen />
      </Profiler>,
    );
  });
};
const tenTicks = () => {
  resetRenders({ names: true });
  for (let i = 0; i < 10; i++) act(() => { jest.advanceTimersByTime(1000); });
  return { total: renders().screen ?? 0, names: renderNames().screen ?? {} };
};
const openNavigator = () => {
  const n = r!.root.findAll((x) => typeof x.props.onPress === 'function' && x.props.accessibilityLabel === 'Questions, question navigator')[0];
  act(() => { n.props.onPress(); });
};

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 7, 9, 0, 0) });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
});

describe('a full 150-question mock: one second of the clock', () => {
  it.each([false, true])('hide the clock %s: the question and options never redraw on a tick; the navigator neither', (hideClock) => {
    startMock('cisa', 150, hideClock ? { hideClock: true } : {});
    mount();
    let t = tenTicks();
    expect(t.names.OptionCard ?? 0).toBe(0);
    expect(t.names.SessionScreen ?? 0).toBe(0);
    expect(t.total / 10).toBeLessThan(40);
    openNavigator();
    t = tenTicks();
    expect(t.names.OptionCard ?? 0).toBe(0);
    expect(t.names.SessionScreen ?? 0).toBe(0);
    expect(t.total / 10).toBeLessThan(40);
  });

  it('the clock still moves each second', () => {
    startMock('cisa', 150);
    mount();
    const label = () =>
      r!.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Time left'))[0].props.accessibilityLabel as string;
    const before = label();
    act(() => { jest.advanceTimersByTime(61_000); });
    expect(label()).not.toBe(before);
  });
});
