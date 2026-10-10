/**
 * Build D: the practice timer through the real screens.
 * - it counts UP from the answer clocks, stands still while the
 *   explanation shows, and never submits anything on its own;
 * - past 2:00 on one question a soft cue appears, announced once;
 * - Practice: a "Timed" switch that starts from Settings → Study defaults;
 * - the "Practice at exam pace?" card is offered once and its answer
 *   persists (it never comes back, and dismissing never turns the timer on);
 * - Results: one median line, and coaching tags on fast misses and long right answers.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Practice from '../app/(tabs)/practice';
import Results from '../app/results';
import SessionScreen from '../app/session';
import Settings from '../app/settings';
import { PaceStrip } from '../components/pace';
import { OptionCard } from '../components/quiz';
import { getAllQuestions } from '../content/loader';
import { dayKey } from '../engine/streak';
import { finishSession } from '../lib/finishSession';
import { startFromIds, startPractice } from '../lib/sessions';
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
jest.mock('../components/brand', () => ({ BrandLockup: () => null, PillarList: () => null }));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: async () => true,
  scheduleReminders: async () => {},
  cancelReminders: async () => {},
}));

const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
const S = 1000;
const MIN = 60 * S;
const DAY = 24 * 60 * MIN;

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const unmount = () =>
  act(() => {
    r?.unmount();
    r = undefined;
  });
const find = (label: string) =>
  root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function');
const press = (label: string) =>
  act(() => {
    find(label)[0].props.onPress();
  });
const toggle = (title: string, value: boolean) =>
  act(() => {
    root().findAll((n) => n.props.accessibilityLabel === title && typeof n.props.onValueChange === 'function')[0].props.onValueChange(value);
  });
const toggleValue = (title: string) => root().findAll((n) => n.props.accessibilityLabel === title && typeof n.props.onValueChange === 'function')[0].props.value;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const strips = () => root().findAllByType(PaceStrip);
const strip = () => strips()[0].props;
const tick = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });
const active = () => useSession.getState().active!;
const answerFirst = () => {
  act(() => {
    root().findAllByType(OptionCard)[0].props.onPress();
  });
  press('Check answer');
};
let announce: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(
    () => ({ remove: () => {} }) as ReturnType<typeof AppState.addEventListener>,
  );
  Object.defineProperty(AppState, 'currentState', { value: 'active' as AppStateStatus, configurable: true });
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  announce.mockClear(); // a spy can outlive restoreAllMocks: start each test with no calls
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', practiceTimer: false, paceOffer: undefined, examDates: {}, onboarded: true });
});
afterEach(() => {
  unmount();
  useSession.getState().clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('timed practice session', () => {
  it('counts up while answering, pauses while the explanation shows, and never submits', () => {
    startPractice('cisa', { count: 3, timed: true });
    mount(<SessionScreen />);
    expect(strip().clock.text).toBe('00:00');
    tick(45 * S);
    expect(strip().clock.text).toBe('00:45');
    expect(strip().clockUnit).toBe('so far'); // P1
    answerFirst();
    // The explanation is open: the clock stands still, however long they read.
    const atSubmit = strip().clock.text;
    expect(strip().clockUnit).toBe('paused');
    // Spoken in whole minutes, not a new sentence every second (U-H2).
    expect(strip().clock.spoken).toBe('Session time 50 seconds or less, paused');
    tick(10 * MIN);
    expect(strip().clock.text).toBe(atSubmit);
    // Next question: it carries on from the total so far.
    press('Next question');
    tick(15 * S);
    expect(strip().clock.text).toBe('01:00');
    // No countdown, no deadline: an hour later nothing has been submitted.
    tick(60 * MIN);
    expect(active().finishedAt).toBeUndefined();
    expect(active().deadline).toBeUndefined();
  });

  it('a soft cue after 2:00 on one question, announced once', () => {
    startPractice('cisa', { count: 3, timed: true });
    mount(<SessionScreen />);
    tick(119 * S);
    expect(strip().line).toBeNull();
    tick(2 * S);
    // Practice has no Flag button: the cue talks about the exam (U-H1).
    expect(strip().line).toEqual({ text: 'Over 2 minutes on this one. On the exam, flag it and move on.', tone: 'soon' });
    tick(60 * S);
    expect(announce.mock.calls.filter(([t]) => t === 'Over 2 minutes on this one. On the exam, flag it and move on.')).toHaveLength(1);
    // Answered: the cue goes (the explanation is not timed).
    answerFirst();
    expect(strip().line).toBeNull();
  });

  it('untimed practice shows no timer at all', () => {
    startPractice('cisa', { count: 3 });
    mount(<SessionScreen />);
    expect(strips()).toHaveLength(0);
  });
});

describe('Practice: the Timed switch and the one-time offer', () => {
  it('the switch starts from the Study default and starts timed sessions', () => {
    useSettings.setState({ practiceTimer: true });
    mount(<Practice />);
    expect(toggleValue('Timed')).toBe(true);
    act(() => {
      find('Start')[0].props.onPress(); // Quick 10
    });
    expect(active()).toMatchObject({ title: 'Quick 10', timed: true });
    unmount();
    useSession.getState().clear();
    useSettings.setState({ practiceTimer: false });
    mount(<Practice />);
    expect(toggleValue('Timed')).toBe(false);
    toggle('Timed', true);
    press('Start 10 questions, timed');
    expect(active().timed).toBe(true);
    // The screen's switch never changes the saved default.
    expect(useSettings.getState().practiceTimer).toBe(false);
  });

  it('a new Study default wins over the screen\'s last flip (C6)', () => {
    useSettings.setState({ practiceTimer: true });
    mount(<Practice />);
    toggle('Timed', false); // off for this visit
    expect(toggleValue('Timed')).toBe(false);
    // The default changes in Settings (true → false → true): the switch follows each change.
    act(() => {
      useSettings.getState().setPracticeTimer(false);
    });
    act(() => {
      useSettings.getState().setPracticeTimer(true);
    });
    expect(toggleValue('Timed')).toBe(true);
  });

  it('"No thanks" leaves a switch the learner turned on alone (QA B3)', () => {
    useSettings.setState({ examDates: { cisa: dayKey(T0 + 10 * DAY) } });
    mount(<Practice />);
    expect(allText()).toContain('Practice at exam pace?');
    press('No thanks');
    toggle('Timed', true);
    expect(toggleValue('Timed')).toBe(true);
    expect(useSettings.getState().practiceTimer).toBe(false);
  });

  it('far from the exam: no offer', () => {
    useSettings.setState({ examDates: { cisa: dayKey(T0 + 60 * DAY) } });
    mount(<Practice />);
    expect(allText()).not.toContain('Practice at exam pace?');
  });

  it('21 days out: offered; "No thanks" hides it for good and keeps the timer off', () => {
    useSettings.setState({ examDates: { cisa: dayKey(T0 + 21 * DAY) } });
    mount(<Practice />);
    expect(allText()).toContain('Practice at exam pace?');
    press('No thanks');
    expect(allText()).not.toContain('Practice at exam pace?');
    expect(useSettings.getState()).toMatchObject({ paceOffer: 'dismissed', practiceTimer: false });
    // A later visit (or a later day, closer still): never again.
    unmount();
    useSettings.setState({ examDates: { cisa: dayKey(T0 + 5 * DAY) } });
    mount(<Practice />);
    expect(allText()).not.toContain('Practice at exam pace?');
  });

  it('"Turn on Timed" switches the default on, says so, and the card goes', () => {
    useSettings.setState({ examDates: { cisa: dayKey(T0 + 10 * DAY) } });
    mount(<Practice />);
    press('Turn on Timed');
    expect(useSettings.getState()).toMatchObject({ paceOffer: 'accepted', practiceTimer: true });
    expect(toggleValue('Timed')).toBe(true);
    expect(allText()).not.toContain('Practice at exam pace?');
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('Timed practice is on'));
  });
});

describe('Settings → Study defaults', () => {
  it('the practice timer default is off, and the switch saves it', () => {
    mount(<Settings />);
    expect(allText()).toContain('Study defaults');
    expect(toggleValue('Timed practice')).toBe(false);
    toggle('Timed practice', true);
    expect(useSettings.getState().practiceTimer).toBe(true);
  });
});

describe('Results: pace line and coaching tags', () => {
  it('one median line, and tags only on a fast miss or a long right answer', () => {
    const qs = getAllQuestions('cisa').slice(0, 3);
    startFromIds('cisa', qs.map((q) => q.id), 'Practice');
    act(() => {
      useSession.getState().answer(qs[0].id, { display: 'A', correct: false, ms: 12 * S }); // fast and wrong
      useSession.getState().answer(qs[1].id, { display: 'A', correct: true, ms: 200 * S }); // slow and right
      useSession.getState().answer(qs[2].id, { display: 'A', correct: true, ms: 74 * S }); // fine: no tag
      finishSession();
    });
    mount(<Results />);
    const text = allText();
    expect(text).toContain('Median 74 s per question · exam pace 96 s');
    expect(text).toContain('Quick pick');
    expect(text).toContain('Slow down on the stem.');
    expect(text).toContain('Took its time');
    expect(text).toContain('You knew it; trust the first pass.');
    const rows = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Question 3,'));
    expect(rows[0].props.accessibilityLabel).not.toMatch(/Quick pick|Took its time/);
    // One full stop between sentences, never two (O2).
    const q1 = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Question 1,'))[0];
    expect(q1.props.accessibilityLabel).toBe('Question 1, ✗ Missed. Quick pick: Slow down on the stem. Tap to expand');
  });
});
