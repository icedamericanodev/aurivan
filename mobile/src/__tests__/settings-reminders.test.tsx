/**
 * Settings → Study reminder: time stepper and day chips.
 * Permission is asked ONLY when the learner turns reminders on; changing
 * the time or days just saves (and re-schedules if reminders are on).
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { useSettings } from '../store/settings';
import Settings from '../app/settings';

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
    useSharedValue: (v: unknown) => ({ value: v }),
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
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockEnsure = jest.fn(async () => true);
const mockSchedule = jest.fn(async () => {});
const mockCancel = jest.fn(async () => {});
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: () => mockEnsure(),
  scheduleReminders: (...a: unknown[]) => (mockSchedule as (...x: unknown[]) => Promise<void>)(...a),
  cancelReminders: () => mockCancel(),
}));

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const press = (label: string) =>
  act(() => {
    root().findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0].props.onPress();
  });

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', reminder: { enabled: false, hour: 19, minute: 0 } });
  act(() => {
    r = create(<Settings />);
  });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('Settings → Study reminder', () => {
  it('shows every day at 19:00 by default (an old save without days)', () => {
    expect(allText()).toContain('Every day at 19:00');
    expect(allText()).toContain('At most one reminder a day.');
  });

  it('changing time and days while off saves, and asks nothing', () => {
    press('Hour later');
    press('Minutes later');
    press('Saturday');
    press('Sunday');
    expect(useSettings.getState().reminder).toMatchObject({ hour: 20, minute: 15, days: [1, 2, 3, 4, 5] });
    expect(allText()).toContain('Weekdays at 20:15');
    expect(mockEnsure).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('asks permission only when turned on, then re-schedules on changes without asking again', async () => {
    const toggle = root().findAll((n) => typeof n.props.onValueChange === 'function' && n.props.value === false)[0];
    await act(async () => {
      await toggle.props.onValueChange(true);
    });
    expect(mockEnsure).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true, hour: 19, minute: 0 }), 'CISA');
    press('Hour earlier');
    expect(mockSchedule).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true, hour: 18 }), 'CISA');
    expect(mockEnsure).toHaveBeenCalledTimes(1);
  });

  it('the time is one adjustable control for screen readers', () => {
    const hour = root().findAll((n) => n.props.accessibilityRole === 'adjustable' && n.props.accessibilityLabel === 'Hour')[0];
    expect(hour.props.accessibilityValue).toEqual({ text: '19:00' });
    act(() => {
      hour.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    });
    expect(useSettings.getState().reminder.hour).toBe(20);
  });
});
