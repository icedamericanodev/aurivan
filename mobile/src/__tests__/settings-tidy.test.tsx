/**
 * Mobile 1.17 "a tidy Settings": grouped rows that show their value and open
 * a sheet, the exam-date calendar (Settings and onboarding), the deep links
 * into Settings, and the theme living only in Settings.
 */
import { AccessibilityInfo, Dimensions } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Settings from '../app/settings';
import Onboarding from '../app/onboarding';
import { cellSize } from '../components/calendar';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { flushSayLaterForTest } from '../lib/a11y';
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
jest.mock('../components/brand', () => ({ BrandLockup: () => null, PillarList: () => null }));
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => mockParams,
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
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
/** Pressables, outermost first (a wrapper and its pressable can carry the same props). */
const hosts = (pred: (n: ReactTestInstance) => boolean) => root().findAll((n) => typeof n.props.onPress === 'function' && pred(n));
const byLabel = (label: string | RegExp) => hosts((n) => (typeof label === 'string' ? n.props.accessibilityLabel === label : label.test(String(n.props.accessibilityLabel))));
const press = (label: string | RegExp) => {
  const n = byLabel(label)[0];
  if (!n) throw new Error(`nothing to press: ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const row = (title: string) => hosts((n) => n.props.accessibilityRole === 'button' && String(n.props.accessibilityLabel).startsWith(`${title}, `))[0];
const openRow = (title: string) => {
  const n = row(title);
  if (!n) throw new Error(`no row ${title}`);
  act(() => {
    n.props.onPress();
  });
};
const day = (spoken: string) => hosts((n) => String(n.props.accessibilityLabel).startsWith(spoken))[0];
const flatStyle = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(3).filter(Boolean));
/** The calendar's cells (days and blanks): host views sized like a day cell at this width. */
const gridCells = () => {
  const { w, h } = cellSize(Dimensions.get('window').width);
  return root().findAll((n) => {
    if (typeof n.type !== 'string') return false;
    const st = flatStyle(n.props.style);
    return st.width === w && st.height === h;
  }).length;
};
const setWindow = (width: number, fontScale = 1) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width, fontScale }, screen: { ...w, width, fontScale } });
  });
};

beforeEach(() => {
  // Monday 12 October 2026, 10:00 local.
  jest.useFakeTimers({ now: new Date(2026, 9, 12, 10, 0) });
  setWindow(393);
  mockParams = {};
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', examDates: { cisa: '2027-01-08' } });
  jest.mocked(router.push).mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Settings is grouped, and each row says its value', () => {
  it('groups in order, values on the rows, nothing lost', () => {
    useSettings.setState({ familiarity: 'some', dailyMinutes: 30, studyMode: 'guided', theme: 'dark', motion: 'reduced' });
    mount(<Settings />);
    const t = allText();
    const at = ['Exam', 'Your study', 'Practice', 'Reminders', 'Appearance', 'Badges and your plant', 'Your data', 'Help and about'].map((g) => t.indexOf(g));
    expect(at.every((n) => n > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(row('Certification').props.accessibilityLabel).toBe('Certification, CISA');
    // The date reads in full for screen readers.
    expect(row('Exam date').props.accessibilityLabel).toBe('Exam date, Friday 8 January 2027');
    expect(t).toContain('8 Jan 2027');
    expect(row('Daily time').props.accessibilityLabel).toBe('Daily time, 30 minutes a day');
    expect(row('Starting point').props.accessibilityLabel).toBe('Starting point, Some IT audit experience');
    expect(row('Default mode').props.accessibilityLabel).toBe('Default mode, Guided');
    expect(row('Theme').props.accessibilityLabel).toBe('Theme, Dark');
    expect(row('Motion').props.accessibilityLabel).toBe('Motion, Reduced');
    // The on/off settings stay switches on the screen.
    for (const name of ['Exam-focused plan', 'Timed practice', 'Shuffle answer options', 'Study reminder', 'Haptics', 'Show badges', 'Show my plant', 'Quiet look']) {
      expect(root().findAll((n) => typeof n.props.onValueChange === 'function' && n.props.accessibilityLabel === name).length).toBeGreaterThan(0);
    }
    // The old ±day/week buttons are gone (the calendar replaces them).
    expect(t).not.toMatch(/week earlier|day later/);
  });

  it('every row is at least 48pt tall (56) and spoken as a button', () => {
    mount(<Settings />);
    const r1 = row('Exam date');
    const flat = Object.assign({}, ...[r1.props.style].flat(3).filter(Boolean));
    expect(flat.minHeight).toBeGreaterThanOrEqual(48);
    expect(r1.props.accessibilityRole).toBe('button');
    expect(r1.props.accessibilityHint).toBe('Opens a calendar');
  });

  it('at 200% text the value drops under the title instead of squeezing beside it', () => {
    setWindow(360, 2);
    mount(<Settings />);
    const texts = row('Daily time').findAll((n) => typeof n.type === 'string' && n.children.includes('20 min'));
    expect(texts.length).toBeGreaterThan(0);
    const flat = Object.assign({}, ...[texts[0].props.style].flat(3).filter(Boolean));
    expect(flat.textAlign).not.toBe('right');
  });
});

describe('Choice sheets work like a dropdown', () => {
  it('Theme: choosing Dark saves it and closes the sheet', () => {
    mount(<Settings />);
    openRow('Theme');
    const group = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === 'Appearance');
    expect(group).toHaveLength(1);
    press('Dark');
    expect(useSettings.getState().theme).toBe('dark');
    expect(root().findAll((n) => n.props.accessibilityRole === 'radiogroup')).toHaveLength(0);
    expect(row('Theme').props.accessibilityLabel).toBe('Theme, Dark');
  });

  it('Exam: coming-soon exams are shown but cannot be chosen', () => {
    mount(<Settings />);
    openRow('Certification');
    const soon = hosts((n) => n.props.accessibilityRole === 'radio' && /Coming soon/.test(String(n.props.accessibilityLabel)));
    expect(soon.length).toBeGreaterThan(0);
    for (const n of soon) expect(n.props.accessibilityState).toMatchObject({ disabled: true, checked: false });
    const cisa = hosts((n) => n.props.accessibilityRole === 'radio' && String(n.props.accessibilityLabel).startsWith('CISA.'))[0];
    expect(cisa.props.accessibilityState.checked).toBe(true);
    expect(allText()).toContain('More exams are on the way.');
  });

  it('a sheet closes from its header button, and the dim is hidden from screen readers', () => {
    mount(<Settings />);
    openRow('Daily time');
    expect(root().findAll((n) => n.props.accessibilityRole === 'radiogroup').length).toBeGreaterThan(0);
    const dim = root().findAll((n) => n.props.importantForAccessibility === 'no' && typeof n.props.onPress === 'function');
    expect(dim.length).toBeGreaterThan(0);
    expect(dim[0].props.accessible).toBe(false);
    press('Close, Daily time');
    expect(root().findAll((n) => n.props.accessibilityRole === 'radiogroup')).toHaveLength(0);
  });
});

describe('Exam date: the calendar', () => {
  it('opens on the saved month; today is marked; days before today and past two years cannot be picked', () => {
    useSettings.setState({ examDates: {} });
    mount(<Settings />);
    expect(row('Exam date').props.accessibilityLabel).toBe('Exam date, not set');
    openRow('Exam date');
    expect(allText()).toContain('October 2026');
    expect(day('Monday 12 October 2026').props.accessibilityLabel).toBe('Monday 12 October 2026, today');
    expect(day('Monday 12 October 2026').props.accessibilityState).toMatchObject({ disabled: false, selected: false });
    expect(day('Sunday 11 October 2026').props.accessibilityState).toMatchObject({ disabled: true });
    // No earlier month than this one.
    expect(byLabel('Previous month')[0].props.accessibilityState).toMatchObject({ disabled: true });
    // "Not sure yet" is the selected quick choice when there is no date.
    expect(byLabel('Not sure yet')[0].props.accessibilityState).toMatchObject({ selected: true });
    expect(allText()).toContain('No date yet. Your plan works without one.');
    // Two years ahead, then no further.
    for (let i = 0; i < 24; i++) press('Next month');
    expect(allText()).toContain('October 2028');
    expect(byLabel('Next month')[0].props.accessibilityState).toMatchObject({ disabled: true });
    expect(day('Thursday 12 October 2028').props.accessibilityState).toMatchObject({ disabled: false });
    expect(day('Friday 13 October 2028').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('a new month is announced', () => {
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    mount(<Settings />);
    openRow('Exam date');
    expect(allText()).toContain('January 2027');
    press('Next month');
    act(() => flushSayLaterForTest());
    expect(say).toHaveBeenCalledWith('February 2027');
  });

  it('pick a day, then Save: the date is saved and today’s plan follows it', () => {
    mount(<Settings />);
    openRow('Exam date');
    // The saved date is selected.
    expect(day('Friday 8 January 2027').props.accessibilityState).toMatchObject({ selected: true });
    press('Friday 22 January 2027');
    expect(day('Friday 22 January 2027').props.accessibilityState).toMatchObject({ selected: true });
    expect(allText()).toContain('Fri 22 Jan 2027 · In 102 days');
    // Nothing is saved until Save.
    expect(useSettings.getState().examDates.cisa).toBe('2027-01-08');
    press('Save');
    expect(useSettings.getState().examDates.cisa).toBe('2027-01-22');
    expect(useProgress.getState().days.cisa).toBeDefined();
    expect(row('Exam date').props.accessibilityLabel).toBe('Exam date, Friday 22 January 2027');
  });

  it('a quick choice moves the calendar to its month; "Not sure yet" clears the date on Save', () => {
    mount(<Settings />);
    openRow('Exam date');
    press('In 3 months');
    expect(allText()).toContain('January 2027');
    expect(day('Tuesday 12 January 2027').props.accessibilityState).toMatchObject({ selected: true });
    press('Not sure yet');
    press('Save');
    expect(useSettings.getState().examDates.cisa).toBeUndefined();
    expect(row('Exam date').props.accessibilityLabel).toBe('Exam date, not set');
  });

  it('Cancel changes nothing, and the next open starts from what is saved', () => {
    mount(<Settings />);
    openRow('Exam date');
    press('Friday 22 January 2027');
    press('Cancel, Exam date');
    expect(useSettings.getState().examDates.cisa).toBe('2027-01-08');
    openRow('Exam date');
    expect(day('Friday 8 January 2027').props.accessibilityState).toMatchObject({ selected: true });
    expect(day('Friday 22 January 2027').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('at 360 dp and 200% text every day is a 48pt+ target and its number cannot clip', () => {
    setWindow(360, 2);
    mount(<Settings />);
    openRow('Exam date');
    const d = day('Friday 8 January 2027');
    const flat = flatStyle(d.props.style);
    // Fix round (code review 3, UX P2): the house 48pt, not 44 (this test used to accept 44).
    expect(flat.width).toBeGreaterThanOrEqual(48);
    expect(flat.height).toBeGreaterThanOrEqual(48);
    const nums = d.findAll((n) => typeof n.type === 'string' && n.children.includes('8'));
    expect(nums.length).toBeGreaterThan(0);
    for (const n of nums) expect(n.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
  });

  // ── PR #49 fix round ──────────────────────────────────────────────
  it('every month is six rows, so the month arrows never move under the thumb', () => {
    mount(<Settings />);
    openRow('Exam date');
    // January 2027 needs 5 rows, February 2027 only 4, August 2027 all 6.
    for (const month of ['January 2027', 'February 2027', 'March 2027', 'April 2027', 'May 2027', 'June 2027', 'July 2027', 'August 2027']) {
      expect(allText()).toContain(month);
      expect(gridCells()).toBe(42);
      press('Next month');
    }
  });

  it('at 320 dp no column leaves the screen, and each day is still 48pt tall', () => {
    setWindow(320, 2);
    mount(<Settings />);
    openRow('Exam date');
    const flat = flatStyle(day('Friday 8 January 2027').props.style);
    expect(flat.height).toBeGreaterThanOrEqual(48);
    // The grid reaches into the sheet's 20pt gutters, keeping 8pt at each edge.
    const bleed = root().findAll((n) => typeof n.type === 'string' && flatStyle(n.props.style).marginHorizontal === -12);
    expect(bleed.length).toBeGreaterThan(0);
    expect(7 * Number(flat.width)).toBeLessThanOrEqual(320 - 2 * 8);
    // Sunday (the right-hand column) is there and can be picked.
    expect(day('Sunday 10 January 2027').props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('cell sizes: inside the gutters on wider phones, into them on narrow ones', () => {
    expect(cellSize(393)).toEqual({ w: 50, h: 50, bleed: 0 });
    expect(cellSize(360)).toEqual({ w: 49, h: 49, bleed: 12 });
    expect(cellSize(320)).toEqual({ w: 43, h: 48, bleed: 12 });
    for (const width of [300, 320, 340, 360, 375, 393, 430]) {
      const c = cellSize(width);
      expect(c.h).toBeGreaterThanOrEqual(48);
      // Seven columns plus the gutters left over fit the screen.
      expect(7 * c.w + 2 * (20 - c.bleed)).toBeLessThanOrEqual(width);
    }
  });

  it('at large text the grid comes before the quick choices; at normal text after', () => {
    mount(<Settings />);
    openRow('Exam date');
    let t = allText();
    expect(t.indexOf('Quick choice')).toBeLessThan(t.indexOf('January 2027'));
    act(() => {
      r?.unmount();
    });
    setWindow(360, 1.3);
    mount(<Settings />);
    openRow('Exam date');
    t = allText();
    expect(t.indexOf('January 2027')).toBeLessThan(t.indexOf('Quick choice'));
    // The quick choices still work from below the grid.
    press('In 3 months');
    expect(day('Tuesday 12 January 2027').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('the chosen-date line wraps at large text instead of stopping at ×1.5; day numbers stay capped', () => {
    mount(<Settings />);
    openRow('Exam date');
    const line = root().findAll((n) => typeof n.type === 'string' && n.children.includes('Fri 8 Jan 2027 · In 88 days'));
    expect(line.length).toBeGreaterThan(0);
    for (const n of line) expect(n.props.maxFontSizeMultiplier ?? 99).toBeGreaterThan(1.5);
    for (const n of day('Friday 8 January 2027').findAll((x) => typeof x.type === 'string' && x.children.includes('8'))) {
      expect(n.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.5);
    }
  });
});

describe('Deep links into Settings', () => {
  it('?open=exam-date opens the calendar straight away', () => {
    mockParams = { open: 'exam-date' };
    mount(<Settings />);
    expect(byLabel('Next month').length).toBe(1);
    expect(allText()).toContain('A rough date is fine. You can change it any time.');
  });
});

describe('Onboarding: the same calendar on the date step', () => {
  it('"Pick the exact date" opens it, and finishing saves the picked day', () => {
    useSettings.setState({ onboarded: false, examDates: {} });
    mount(<Onboarding />);
    press('Start my plan');
    press('Continue');
    press('Skip this question');
    expect(allText()).toContain('When is your exam?');
    press('Pick the exact date');
    press('Next month');
    press('Monday 16 November 2026');
    press('Save');
    // A date no quick choice gives is said on the step.
    expect(allText()).toContain('Mon 16 Nov 2026 · In 35 days');
    expect(byLabel('In 1 month')[0].props.accessibilityState).toMatchObject({ selected: false });
    press('Continue');
    press('Skip for now');
    expect(useSettings.getState().examDates.cisa).toBe('2026-11-16');
  });

  it('the quick choices still work, and "Not sure yet" stays the default', () => {
    useSettings.setState({ onboarded: false, examDates: {} });
    mount(<Onboarding />);
    press('Start my plan');
    press('Continue');
    press('Skip this question');
    expect(byLabel('Not sure yet')[0].props.accessibilityState).toMatchObject({ selected: true });
    press('Continue');
    press('Skip for now');
    expect(useSettings.getState().examDates.cisa).toBeUndefined();
  });
});

/**
 * The web screenshots can't catch native-only style parsing (the 1.15 plant
 * crash). Every style in Settings and in each sheet, at 360 dp and 200% text,
 * goes through React Native's own parsers for colours, transforms and
 * transform origins.
 */
describe('Settings and its sheets parse on native', () => {
  const processColor = jest.requireActual('react-native/Libraries/StyleSheet/processColor').default as (c: unknown) => unknown;
  const processTransform = jest.requireActual('react-native/Libraries/StyleSheet/processTransform').default as (t: unknown) => unknown;
  const processTransformOrigin = jest.requireActual('react-native/Libraries/StyleSheet/processTransformOrigin').default as (o: string) => unknown[];
  const flatten = (style: unknown): Record<string, unknown> =>
    Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
  const checkTree = () => {
    let n = 0;
    for (const node of root().findAll((x) => typeof x.type === 'string' && x.props.style !== undefined)) {
      const st = flatten(node.props.style);
      for (const [k, v] of Object.entries(st)) {
        if (/color$/i.test(k) && v !== undefined) {
          expect({ k, v, ok: processColor(v) !== null && processColor(v) !== undefined }).toEqual({ k, v, ok: true });
          n++;
        }
        if (k === 'transform' && Array.isArray(v)) expect(() => processTransform(v)).not.toThrow();
        if (k === 'transformOrigin' && typeof v === 'string') expect(processTransformOrigin(v)).toHaveLength(3);
        if (typeof v === 'string' && /%$/.test(v)) expect(v).toMatch(/^\d+(\.\d+)?%$/);
      }
    }
    return n;
  };

  it('every sheet, light and dark', () => {
    setWindow(360, 2);
    for (const theme of ['light', 'dark'] as const) {
      useSettings.setState({ theme });
      mount(<Settings />);
      expect(checkTree()).toBeGreaterThan(20);
      for (const title of ['Certification', 'Exam date', 'Daily time', 'Starting point', 'Default mode', 'Theme', 'Motion', 'About Aurivan']) {
        openRow(title);
        checkTree();
        press(new RegExp(`^(Close|Cancel|Done), `));
      }
      act(() => {
        r?.unmount();
      });
      r = undefined;
    }
  });
});
