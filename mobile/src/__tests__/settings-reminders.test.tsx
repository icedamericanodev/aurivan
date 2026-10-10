/**
 * Settings → Study reminder: time stepper and day chips.
 * Permission is asked ONLY when the learner turns reminders on; changing
 * the time or days just saves (and re-schedules if reminders are on).
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { Alert } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { useSettings } from '../store/settings';
import Settings from '../app/settings';
import { localTime } from '../engine/reminders';

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
    expect(allText()).toContain(`Every day at ${localTime(19, 0)}`);
    // Off by default: the time and day choices wait for the switch.
    expect(allText()).toContain('Applies when reminders are on.');
  });

  it('changing time and days while off saves, and asks nothing', () => {
    press('Hour later');
    press('Minutes later');
    press('Remind on Saturday');
    press('Remind on Sunday');
    expect(useSettings.getState().reminder).toMatchObject({ hour: 20, minute: 15, days: [1, 2, 3, 4, 5] });
    expect(allText()).toContain(`Weekdays at ${localTime(20, 15)}`);
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
    const hour = root().findAll((n) => n.props.accessibilityRole === 'adjustable' && n.props.accessibilityLabel === 'Reminder hour')[0];
    // Spoken in the phone's own time format ("7:00 PM" in the US).
    expect(hour.props.accessibilityValue).toEqual({ text: localTime(19, 0) });
    // Only increment and decrement are handled; other actions do nothing.
    act(() => {
      hour.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } });
    });
    expect(useSettings.getState().reminder.hour).toBe(19);
    // The +/− buttons are hidden from screen readers: the adjustable is the one stop.
    let p = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Hour later')[0].parent;
    while (p && p.props.importantForAccessibility !== 'no-hide-descendants') p = p.parent;
    expect(p).toBeTruthy();
    act(() => {
      hour.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    });
    expect(useSettings.getState().reminder.hour).toBe(20);
  });
  // QA Build 1: the denied path, turning off, and turning back on.
  const reminderSwitch = () => root().findAll((n) => typeof n.props.onValueChange === 'function' && n.props.title === 'Study reminder')[0];
  const flip = async (on: boolean) => {
    await act(async () => {
      await reminderSwitch().props.onValueChange(on);
    });
  };

  it('permission denied: explains where to allow it, stays off, schedules nothing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockEnsure.mockResolvedValueOnce(false);
    await flip(true);
    expect(alert).toHaveBeenCalledWith('Notifications are off', expect.stringContaining('phone settings'));
    expect(useSettings.getState().reminder.enabled).toBe(false);
    expect(reminderSwitch().props.value).toBe(false);
    expect(mockSchedule).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('turning off cancels ours and keeps the chosen time and days; turning back on restores them', async () => {
    press('Hour later');
    press('Remind on Sunday');
    await flip(true);
    await flip(false);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(useSettings.getState().reminder).toMatchObject({ enabled: false, hour: 20, days: [1, 2, 3, 4, 5, 6] });
    expect(allText()).toContain(`Mon, Tue, Wed, Thu, Fri, Sat at ${localTime(20, 0)}`);
    mockSchedule.mockClear();
    await flip(true);
    expect(mockEnsure).toHaveBeenCalledTimes(2);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true, hour: 20, minute: 0, days: [1, 2, 3, 4, 5, 6] }), 'CISA');
    expect(useSettings.getState().reminder.enabled).toBe(true);
  });

  it('turning on reads the LATEST time and days after the permission prompt, not the ones from the tap', async () => {
    let allow: (v: boolean) => void = () => {};
    mockEnsure.mockImplementationOnce(() => new Promise<boolean>((res) => (allow = res)));
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = reminderSwitch().props.onValueChange(true);
    });
    // While the prompt is open, the learner's earlier change lands in the store.
    act(() => {
      useSettings.getState().setReminder({ ...useSettings.getState().reminder, hour: 6, days: [1, 2, 3, 4, 5] });
    });
    await act(async () => {
      allow(true);
      await pending;
    });
    expect(mockSchedule).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true, hour: 6, days: [1, 2, 3, 4, 5] }), 'CISA');
    expect(useSettings.getState().reminder).toMatchObject({ enabled: true, hour: 6, days: [1, 2, 3, 4, 5] });
  });

  it('time and day controls are disabled while the switch is being saved', async () => {
    let allow: (v: boolean) => void = () => {};
    mockEnsure.mockImplementationOnce(() => new Promise<boolean>((res) => (allow = res)));
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = reminderSwitch().props.onValueChange(true);
    });
    const disabled = root().findAll((n) => typeof n.props.onPress === 'function' && n.props.disabled === true && /later|earlier|Remind on Monday/.test(String(n.props.accessibilityLabel)));
    expect(disabled.length).toBeGreaterThan(0);
    await act(async () => {
      allow(true);
      await pending;
    });
  });

  it('day chips are checkboxes named "Remind on …", under a "Days" caption; the last day explains itself', () => {
    expect(allText()).toContain('Days');
    const chip = (day: string) => root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === `Remind on ${day}`)[0];
    expect(chip('Monday').props.accessibilityRole).toBe('checkbox');
    expect(chip('Monday').props.accessibilityState).toMatchObject({ checked: true });
    expect(chip('Monday').props.accessibilityHint).toBeUndefined();
    act(() => {
      useSettings.getState().setReminder({ ...useSettings.getState().reminder, days: [1] });
    });
    expect(chip('Monday').props.accessibilityHint).toBe('At least one day stays on. Use the switch to stop reminders.');
    expect(chip('Tuesday').props.accessibilityState).toMatchObject({ checked: false });
  });

  it('says "At most one reminder a day" once reminders are on', async () => {
    await flip(true);
    expect(allText()).toContain('At most one reminder a day.');
    expect(allText()).not.toContain('Applies when reminders are on.');
  });
});
