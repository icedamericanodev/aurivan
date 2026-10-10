/**
 * Build D: mock pacing through the real screens.
 * - the start sheet: four timings, "hide the clock", untimed disables it;
 * - the pace line changes ONLY at the 25 / 50 / 75% checks, and each check
 *   is announced to screen readers once;
 * - a hidden clock still has its deadline; an untimed mock has none;
 * - Results: the pacing panel for a timed mock, a label for an untimed one.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MockStart from '../app/mock-start';
import Results from '../app/results';
import SessionScreen from '../app/session';
import { OptionCard } from '../components/quiz';
import { PaceStrip } from '../components/pace';
import { finishSession } from '../lib/finishSession';
import { startMock } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = jest.requireActual('react-native');
  const builder: object = new Proxy({}, { get: () => () => builder });
  const id = (v: unknown) => v;
  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c: unknown) => c },
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => true,
    useSharedValue: (v: unknown) => ({ value: v, set: () => {} }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: id,
    withDelay: (_d: number, v: unknown) => v,
    withSpring: id,
    withRepeat: id,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    cancelAnimation: () => {},
    Easing: new Proxy({}, { get: () => () => id }),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeIn: builder,
    FadeInDown: builder,
    FadeOut: builder,
  };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
const mockParams: { questions?: string } = {};
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
const MIN = 60_000;
let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const pressables = (label: string) =>
  root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label || n.props.title === label) && typeof n.props.onPress === 'function');
const press = (label: string) =>
  act(() => {
    pressables(label)[0].props.onPress();
  });
const strip = () => root().findByType(PaceStrip).props;
const tick = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });
const active = () => useSession.getState().active!;
let announce: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(
    () => ({ remove: () => {} }) as ReturnType<typeof AppState.addEventListener>,
  );
  Object.defineProperty(AppState, 'currentState', { value: 'active' as AppStateStatus, configurable: true });
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa' });
  delete mockParams.questions;
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  useSession.getState().clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('mock start sheet', () => {
  it('offers Standard, +25%, +50% and Untimed, with Standard chosen', () => {
    mockParams.questions = '50';
    mount(<MockStart />);
    const radios = root().findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    expect(radios.map((n) => n.props.accessibilityLabel.split(',')[0])).toEqual(['Standard time', '+25% time', '+50% time', 'Untimed']);
    expect(radios.map((n) => n.props.accessibilityState.checked)).toEqual([true, false, false, false]);
    expect(radios[1].props.accessibilityLabel).toContain('1 h 40 min');
  });

  it('+50% with the clock hidden starts a mock with 6 hours and checkpoints only', () => {
    mount(<MockStart />); // no param: the full mock
    act(() => {
      root().findAll((n) => n.props.accessibilityRole === 'radio' && n.props.accessibilityLabel.startsWith('+50%'))[0].props.onPress();
    });
    act(() => {
      root().findAll((n) => n.props.accessibilityLabel === 'Hide the clock (checkpoints only)' && n.props.onValueChange)[0].props.onValueChange(true);
    });
    press('Start mock');
    expect(active()).toMatchObject({ timing: 'plus50', hideClock: true, deadline: T0 + 360 * MIN });
    expect(active().questionIds).toHaveLength(150);
  });

  it('untimed: "hide the clock" is switched off and disabled; no deadline', () => {
    mockParams.questions = '50';
    mount(<MockStart />);
    act(() => {
      root().findAll((n) => n.props.accessibilityRole === 'radio' && n.props.accessibilityLabel.startsWith('Untimed'))[0].props.onPress();
    });
    const toggle = root().findAll((n) => n.props.accessibilityLabel === 'Hide the clock (checkpoints only)' && n.props.onValueChange)[0];
    expect(toggle.props.disabled).toBe(true);
    press('Start mock');
    expect(active().deadline).toBeUndefined();
    expect(active().timing).toBe('untimed');
  });
});

describe('mock pace line', () => {
  it('stays put between checks, changes at 25%, and each check is announced once', () => {
    startMock('cisa', 50); // 80 minutes
    mount(<SessionScreen />);
    expect(strip().line).toEqual({ text: 'Pace checks at 25, 50 and 75% of the time.', tone: 'note' });
    expect(strip().clock).toMatchObject({ text: '1:20:00' });
    // Answer 5 questions in the first 19 minutes: no check yet, no judgement.
    for (let i = 0; i < 5; i++) {
      act(() => {
        root().findAllByType(OptionCard)[0].props.onPress();
      });
      press('Next');
    }
    tick(19 * MIN);
    expect(strip().line.tone).toBe('note');
    expect(announce).not.toHaveBeenCalledWith(expect.stringContaining('Pace check'));
    // 20 minutes = 25%. 5 done; a target learner (90 s) needed 7.5 min → behind.
    tick(1 * MIN);
    expect(active().checkpoints).toHaveLength(1);
    expect(strip().line).toEqual({ text: 'About 13 min behind. Flag anything past 2 minutes and move on.', tone: 'behind' });
    expect(announce.mock.calls.filter(([t]) => String(t).startsWith('Pace check'))).toHaveLength(1);
    // More ticks before 50% change nothing and announce nothing new.
    tick(10 * MIN);
    expect(active().checkpoints).toHaveLength(1);
    expect(announce.mock.calls.filter(([t]) => String(t).startsWith('Pace check'))).toHaveLength(1);
  });

  it('the clock is never the error colour: the last 5 minutes are "low" (clay)', () => {
    startMock('cisa', 50);
    mount(<SessionScreen />);
    tick(76 * MIN);
    expect(strip().clock.low).toBe(true);
  });

  it('hidden clock: no numbers, the deadline still applies, the last 5 minutes are said once', () => {
    startMock('cisa', 50, { hideClock: true });
    mount(<SessionScreen />);
    expect(strip().clock).toBe('hidden');
    tick(76 * MIN);
    expect(strip().line).toEqual({ text: 'Less than 5 minutes left.', tone: 'cue' });
    expect(announce.mock.calls.filter(([t]) => t === 'Less than 5 minutes left.')).toHaveLength(1);
    tick(5 * MIN);
    expect(active().finishedAt).toBeDefined();
  });

  it('untimed: no clock, no checks, never submitted for the learner', () => {
    startMock('cisa', 50, { timing: 'untimed' });
    mount(<SessionScreen />);
    expect(strip().clock).toBe('untimed');
    tick(10 * 60 * MIN);
    expect(active().finishedAt).toBeUndefined();
    expect(active().checkpoints).toBeUndefined();
  });
});

describe('results', () => {
  it('a timed mock shows the pacing panel', () => {
    startMock('cisa', 50);
    const s = active();
    act(() => {
      useSession.getState().answer(s.questionIds[0], { display: 'A', correct: true, ms: 70_000 });
      useSession.getState().answer(s.questionIds[1], { display: 'A', correct: false, ms: 50_000 });
    });
    jest.setSystemTime(T0 + 30 * MIN);
    act(() => {
      finishSession();
    });
    mount(<Results />);
    const labels = root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
    expect(labels).toContain('Time used: 30 min of 1 h 20 min');
    expect(labels).toContain('Median per question: 60 s');
    expect(labels).toContain('Unanswered at submit: 48');
  });

  it('an untimed mock is labelled and has no pacing panel', () => {
    startMock('cisa', 50, { timing: 'untimed' });
    jest.setSystemTime(T0 + 30 * MIN);
    act(() => {
      finishSession();
    });
    mount(<Results />);
    const texts = root().findAll((n) => typeof n.props.children === 'string').map((n) => n.props.children as string);
    expect(texts).toContain('Mini mock · untimed');
    expect(texts.some((t) => t.startsWith('Untimed mock: your answers count toward readiness'))).toBe(true);
    expect(texts).not.toContain('Pacing');
  });
});
