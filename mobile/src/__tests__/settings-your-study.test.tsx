/**
 * Mobile 1.15 Settings → Your study (PHASE5.md §2.8): it replaces "Daily
 * goal" with daily time, where you're starting from (none selected is
 * allowed) and the Exam-focused switch. A change rebuilds an untouched plan,
 * or keeps a started one and says so in one line. Default mode says "Let the
 * app choose" (J5).
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Settings from '../app/settings';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { dayKey } from '../engine/streak';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const pressable = (label: RegExp) =>
  root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel));
const press = (label: RegExp) => {
  const n = pressable(label)[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const toggle = (name: string, value: boolean) => {
  const n = root().findAll((x) => typeof x.props.onValueChange === 'function' && x.props.accessibilityLabel === name)[0];
  if (!n) throw new Error(`no switch ${name}`);
  act(() => {
    n.props.onValueChange(value);
  });
};
/** Mobile 1.17: a Settings row (spoken "Daily time, 20 minutes a day") opens its sheet. */
const openRow = (title: string) => {
  const n = root().findAll(
    (x) => x.props.accessibilityRole === 'button' && typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && (x.props.accessibilityLabel === title || x.props.accessibilityLabel.startsWith(`${title}, `)),
  )[0];
  if (!n) throw new Error(`no row ${title}`);
  act(() => {
    n.props.onPress();
  });
};
const rowLabel = (title: string) =>
  root().findAll((x) => x.props.accessibilityRole === 'button' && typeof x.props.onPress === 'function' && String(x.props.accessibilityLabel).startsWith(`${title}, `))[0]?.props.accessibilityLabel;
const switchValue = (name: string) => root().findAll((x) => typeof x.props.onValueChange === 'function' && x.props.accessibilityLabel === name)[0]?.props.value;
const checkedRadio = (group: string) => {
  const g = root().findAll((x) => x.props.accessibilityRole === 'radiogroup' && x.props.accessibilityLabel === group && typeof x.type !== 'string')[0];
  if (!g) throw new Error(`no radiogroup ${group}`);
  return g.findAll((x) => x.props.accessibilityRole === 'radio' && x.props.accessibilityState?.checked && typeof x.props.onPress === 'function').map((x) => x.props.accessibilityLabel as string);
};

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    // No plant prompt by default: these tests are about the fit.
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', examDates: { cisa: '2027-06-01' } });
  jest.mocked(router.push).mockClear();
  jest.mocked(router.replace).mockClear();
  jest.mocked(router.back).mockClear();
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});

const today = () => dayKey(Date.now());
const storedPlan = () => useProgress.getState().days.cisa;
const sectionOrder = () => {
  const t = allText();
  return (names: string[]) => names.map((n) => t.indexOf(n));
};

describe('Settings → Your study', () => {
  it('replaces "Daily goal": daily time, the three rows (none selected), the Exam-focused switch', () => {
    useSettings.setState({ dailyGoal: 40 });
    mount(<Settings />);
    const t = allText();
    expect(t).not.toMatch(/Daily goal|Questions a day/);
    expect(t).toContain('Your study');
    expect(t).toContain('Starting point');
    expect(t).toContain('Exam-focused plan');
    expect(t).toContain('Leads with mocks and your weak spots, and leaves lessons out of Today. Lessons stay in Learn.');
    // Each row shows its current value: an old 40-a-day goal reads as 45 minutes; no start chosen yet.
    expect(rowLabel('Daily time')).toBe('Daily time, 45 minutes a day');
    expect(rowLabel('Starting point')).toBe('Starting point, not set');
    // The choices are in sheets.
    openRow('Daily time');
    expect(allText()).toContain('Most days. Your daily plan fits this.');
    expect(checkedRadio('Daily time')).toEqual(['45 minutes a day']);
    openRow('Starting point');
    expect(checkedRadio('Where are you starting from?')).toEqual([]);
    // Order (mobile 1.17 groups): Exam, Your study, Practice, Reminders, Appearance.
    const at = sectionOrder()(['Exam date', 'Your study', 'Practice', 'Reminders', 'Appearance']);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('with nothing ticked today, a change rebuilds the plan at once', () => {
    mount(<Settings />);
    openRow('Daily time');
    press(/^10 minutes a day$/);
    expect(useSettings.getState()).toMatchObject({ dailyMinutes: 10, dailyGoal: 10, fitPrompt: 'answered' });
    // A choice closes the sheet, like a dropdown, and the row shows the new value.
    expect(pressable(/^10 minutes a day$/)).toHaveLength(0);
    expect(rowLabel('Daily time')).toBe('Daily time, 10 minutes a day');
    expect(storedPlan().budget).toBe(10);
    expect(allText()).not.toContain('Today’s plan stays as it is.');
  });

  it('with something ticked, today’s plan stays and one line says tomorrow’s will fit', () => {
    act(() => {
      useProgress.getState().startDay({
        day: today(), certId: 'cisa', budget: 20,
        items: [{ kind: 'lesson', lessonId: 'x', title: 'X' }, { kind: 'practice', count: 16, label: '16 mixed questions' }],
        done: [true, false], start: { score: 0, domains: {} }, answered: 0, correct: 0, minutes: 0,
      });
    });
    mount(<Settings />);
    openRow('Starting point');
    press(/^Experienced practitioner/);
    expect(useSettings.getState().familiarity).toBe('experienced');
    expect(allText()).toContain('Today’s plan stays as it is. Tomorrow’s will fit.');
    expect(storedPlan().budget).toBe(20);
    expect(storedPlan().done).toEqual([true, false]);
  });

  it('Exam-focused follows the row until switched; an explicit "off" wins over Experienced', () => {
    mount(<Settings />);
    openRow('Starting point');
    press(/^Experienced practitioner/);
    expect(switchValue('Exam-focused plan')).toBe(true);
    toggle('Exam-focused plan', false);
    expect(useSettings.getState().examFocused).toBe(false);
    expect(switchValue('Exam-focused plan')).toBe(false);
  });

  it('Default mode: "Let the app choose", in plain words', () => {
    mount(<Settings />);
    expect(rowLabel('Default mode')).toBe('Default mode, Let the app choose');
    openRow('Default mode');
    expect(allText()).toContain('Let the app choose');
    expect(allText()).toContain('It changes as you go and fits where you’re starting from, ending with a smart mix of what you need.');
    expect(allText()).not.toContain('Follow my stage');
  });
});

