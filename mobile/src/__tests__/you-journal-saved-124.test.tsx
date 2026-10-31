/**
 * Mobile 1.24 (stream S2), the screens around the answer screen:
 *  - You: bands below 30 answers in a domain, the number from 30; "+N" said
 *    once under the rings; names that never break mid-word; the Badges and
 *    Field notes rows are one row.
 *  - Readiness report: the plain yardstick line.
 *  - Mistake journal: whole stems, tags only on tap.
 *  - Saved: whole stems, a 48pt remove, undo.
 *  - Mock start: Start in a sticky footer.
 *  - Study notes: no "0 of N read" before the first read.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import You from '../app/(tabs)/you';
import Mistakes from '../app/mistakes';
import Saved, { REMOVED_LINE, UNDO_MS } from '../app/saved';
import MockStart from '../app/mock-start';
import ReadinessReport from '../app/readiness';
import NotesIndex from '../app/notes/index';
import { DomainRings, ringsChangeLine } from '../components/journey';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { StickyFooter } from '../components/quiz';
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { noteSubtopics } from '../content/notes';
import { YARDSTICK_LINE } from '../engine/domainBand';
import { FRAMING_LINE } from '../components/readinessReport';
import { selectCert, useProgress } from '../store/progress';
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

const cisa = getCertification('cisa')!;
const bank = getAllQuestions('cisa');
const inDomain = (d: string) => bank.filter((q) => q.domainId === d);

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
const pressable = (label: RegExp) =>
  root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel));
const press = (label: RegExp) => {
  const n = pressable(label)[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const setWidth = (width: number, fontScale = 1) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width, fontScale }, screen: { ...w, width, fontScale } });
  });
};
/** `n` answers in a domain, the first `right` of them correct. */
const seedDomain = (d: string, n: number, right: number) =>
  act(() => {
    inDomain(d)
      .slice(0, n)
      .forEach((q, i) => useProgress.getState().recordAnswer('cisa', q.id, i < right, undefined, { at: Date.now() - 3 * 86_400_000 }));
  });

beforeEach(() => {
  jest.useFakeTimers();
  setWidth(393);
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
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', examDates: { cisa: '2027-06-01' } });
  jest.mocked(router.push).mockClear();
  jest.mocked(router.back).mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('You: bands below 30 answers, numbers from 30', () => {
  it('10 answers in a domain show "too few yet" and "10 answered", never a number (mobile 1.51: thin data looks thin)', () => {
    seedDomain('1', 10, 9);
    mount(<You />);
    const t = allText();
    // 9 of 10 right: words under its line of growth, never "90" (the chart's own spoken stop is checked below).
    // (The chart sets it on two lines, like the names: "too few" / "yet".)
    expect(t.replace(/\n/g, ' ')).toContain('too few yet');
    expect(t).toContain('10 answered');
    expect(t.slice(t.indexOf('Five areas, one scale'), t.indexOf('KEY'))).not.toMatch(/\b90\b/);
    expect(t).toMatch(/Building is under 70, Steady 70 to 79, Strong 80 and up/);
  });

  it('the bands: Building under 70, Steady 70 to 79', () => {
    seedDomain('1', 10, 5); // 50
    seedDomain('2', 10, 7); // 70
    seedDomain('3', 10, 8); // 80
    mount(<You />);
    const t = allText();
    expect(t).toContain('Building');
    expect(t).toContain('Steady');
    expect(t).toContain('Strong');
  });

  it('from 30 answers: the word AND the number with %, under the "Right on your latest tries" caption', () => {
    seedDomain('4', 40, 30); // 30/40 -> mastery 75
    mount(<You />);
    const t = allText();
    expect(t).toMatch(/\b75\s+%/);
    expect(t).toContain('steady');
    // Mobile 1.43: the caption over the areas says what the percents count, once.
    expect(t.match(/latest tries/g)).toHaveLength(1);
    // Mobile 1.51 (UX review P3): the bands line stays while any area is under 30 answers (four here have none).
    expect(t).toMatch(/Building is under/);
  });

  it('each area is one spoken stop with its word, and its thin data said as thin', () => {
    seedDomain('1', 10, 9);
    mount(<You />);
    const row = root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('IS Audit: '))[0];
    // Mobile 1.51 (Field Guide): it says what it shows, "too few yet", never a band word for 10 answers.
    expect(row.props.accessibilityLabel).toBe('IS Audit: too few yet, 10 answered');
    expect(row.props.accessibilityLabel).not.toContain('90');
  });

  it('Badges and Field notes are one row: the Herbarium (mobile 1.51)', () => {
    mount(<You />);
    const labels = root()
      .findAll((n) => typeof n.props.accessibilityLabel === 'string')
      .map((n) => n.props.accessibilityLabel as string);
    expect(labels.some((l) => l.startsWith('Herbarium: badges and field notes'))).toBe(true);
    expect(labels.some((l) => l.startsWith('Field notes'))).toBe(false);
    expect(labels.some((l) => l.startsWith('Badges,'))).toBe(false);
    press(/^Herbarium: badges and field notes/);
    expect(router.push).toHaveBeenCalledWith('/milestones');
  });

  it('with badges hidden in Settings, only Field notes is left', () => {
    useSettings.setState({ badgesHidden: true });
    mount(<You />);
    const labels = root()
      .findAll((n) => typeof n.props.accessibilityLabel === 'string')
      .map((n) => n.props.accessibilityLabel as string);
    expect(labels.some((l) => l.startsWith('Field notes'))).toBe(true);
    expect(labels.some((l) => l.startsWith('Herbarium'))).toBe(false);
  });
});

describe('the rings legend', () => {
  const values = [0.5, 0.5, 0.5, 0.5, 0.5];
  // The legend's names: the `small` texts (the figures are serif numerals or a `label` word).
  const legendNames = () =>
    root()
      .findAll((n) => n.props.v === 'small' && typeof n.props.children === 'string')
      .map((n) => ({ text: n.props.children as string, lines: n.props.numberOfLines as number | undefined }));

  it('names stay on one line, and below 380 wide the exam’s short names are used ("Governan / ce" never breaks)', () => {
    setWidth(360);
    mount(<DomainRings cert={cisa} values={values} center={null} accessibilityLabel="rings" />);
    const names = legendNames();
    expect(names.map((n) => n.text)).toEqual(expect.arrayContaining(['Governance', 'Acquisition', 'Protection']));
    expect(names.map((n) => n.text)).not.toContain('IT Governance');
    expect(names.every((n) => n.lines === 1)).toBe(true);
  });

  it('on a wide phone the full short names show', () => {
    setWidth(412);
    mount(<DomainRings cert={cisa} values={values} center={null} accessibilityLabel="rings" />);
    expect(legendNames().map((n) => n.text)).toEqual(expect.arrayContaining(['IT Governance', 'Info Protection']));
    // Mobile 1.39: no line cap, so "Info Protection" wraps at its space instead of ending in "Info Protecti…".
    expect(legendNames().every((n) => n.lines === undefined)).toBe(true);
  });

  it('a band word on any row puts the legend under the rings, full width, even on a wide phone (UX review S1)', () => {
    setWidth(412);
    /** The legend's own box (hidden from screen readers: the rings' label says it all). */
    const legendBox = () =>
      root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityElementsHidden === true && n.props.importantForAccessibility === 'no-hide-descendants')[0];
    const flat = (n: ReactTestInstance) => Object.assign({}, ...[n.props.style].flat(Infinity).filter(Boolean));
    // Numbers only: beside the rings.
    mount(<DomainRings cert={cisa} values={values} center={null} accessibilityLabel="rings" />);
    expect(flat(legendBox()).alignSelf).toBeUndefined();
    act(() => {
      r!.unmount();
    });
    // "Building" on one row: under the rings, stretched, and the full short names, never cut.
    mount(<DomainRings cert={cisa} values={values} center={null} accessibilityLabel="rings" legendValue={(i) => (i === 1 ? 'Building' : '50')} />);
    expect(flat(legendBox()).alignSelf).toBe('stretch');
    expect(legendNames().map((n) => n.text)).toEqual(expect.arrayContaining(['IT Governance', 'IS Acquisition', 'IS Operations', 'Info Protection']));
  });

  it('at large text a name may wrap at a space but is never cut', () => {
    setWidth(393, 2);
    mount(<DomainRings cert={cisa} values={values} center={null} accessibilityLabel="rings" />);
    expect(legendNames().length).toBe(5);
    expect(legendNames().every((n) => n.lines === undefined)).toBe(true);
  });

  it('"+N" is said ONCE under the rings, not on every row, and never a minus', () => {
    expect(ringsChangeLine(cisa, [0, 0, 0, 4, 2])).toBe('Since you last looked: IS Operations +4 · Info Protection +2');
    expect(ringsChangeLine(cisa, [0, -3, 0, 0, 0])).toBeNull();
    expect(ringsChangeLine(cisa, [])).toBeNull();
  });
});

describe('readiness report: the yardstick', () => {
  it('mobile 1.39: the estimate line stays in view; the yardstick and the detail are one tap away, in "How it’s worked out"', () => {
    mount(<ReadinessReport />);
    expect(allText()).toContain('A study estimate, not a prediction.');
    expect(allText()).not.toContain(YARDSTICK_LINE);
    press(/^How it’s worked out/);
    expect(allText()).toContain(YARDSTICK_LINE);
    expect(allText()).toContain('not a promise or a prediction of your exam result');
    expect(allText()).toContain(FRAMING_LINE);
  });
});

describe('Mistake journal', () => {
  /** How many different tag chips are on screen (a pressable shows up twice in the test tree). */
  const tagChips = () => new Set(pressable(/^Tag: /).map((n) => n.props.accessibilityLabel)).size;
  const longStem = bank.find((q) => q.stem.length > 200)!;
  const open = (q = longStem) =>
    act(() => {
      useProgress.getState().recordMistake('cisa', q.id, (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct));
    });

  it('shows the whole stem and whole options (the ask is at the end)', () => {
    open();
    mount(<Mistakes />);
    expect(allText()).toContain(longStem.stem);
    const clamped = root().findAll((n) => n.props.numberOfLines === 2);
    expect(clamped).toHaveLength(0);
    expect(allText()).not.toMatch(/[✓✗]/);
  });

  it('the six tag chips are NOT shown until asked for', () => {
    open();
    mount(<Mistakes />);
    expect(tagChips()).toBe(0);
    expect(new Set(pressable(/^Tag why you slipped/).map((n) => n.props.accessibilityLabel)).size).toBe(1);
    press(/^Tag why you slipped/);
    expect(tagChips()).toBe(6);
    const group = root().findAll((n) => n.props.accessibilityRole === 'radiogroup' && /^Why you slipped on this question: /.test(n.props.accessibilityLabel ?? ''));
    expect(group.length).toBeGreaterThan(0); // the View (and its host node)
  });

  it('after tagging, the chips close and the tag is one line with Change', () => {
    open();
    mount(<Mistakes />);
    press(/^Tag why you slipped/);
    press(/^Tag: Misread$/);
    expect(selectCert(useProgress.getState(), 'cisa').mistakes[longStem.id].slip).toBe('misread');
    expect(tagChips()).toBe(0);
    expect(allText()).toContain('Why you slipped: Misread');
    press(/^Change$/);
    expect(tagChips()).toBe(6);
  });
});

describe('Saved questions', () => {
  const longStem = bank.find((q) => q.stem.length > 200)!;
  const save = (ids: string[]) =>
    act(() => {
      ids.forEach((id) => useProgress.getState().toggleBookmark('cisa', id));
    });
  const marked = () => selectCert(useProgress.getState(), 'cisa').bookmarks;

  it('shows the whole stem, not 120 characters', () => {
    save([longStem.id]);
    mount(<Saved />);
    expect(allText()).toContain(longStem.stem);
    expect(allText()).not.toContain('…');
  });

  it('remove has an undo: the row says so, the question is still saved until the time is up', () => {
    const ids = [bank[0].id, bank[1].id];
    save(ids);
    mount(<Saved />);
    const remove = pressable(/^Remove from saved$/);
    expect(remove).toHaveLength(2);
    // 48pt touch target.
    const style = remove[0].props.style({ pressed: false });
    expect(style.width).toBe(48);
    expect(style.height).toBe(48);
    act(() => {
      remove[0].props.onPress();
    });
    expect(allText()).toContain(REMOVED_LINE);
    expect(marked()).toEqual(ids); // still saved
    press(/^Undo/);
    expect(allText()).not.toContain(REMOVED_LINE);
    expect(marked()).toEqual(ids);
    // Again, and let the time run out.
    act(() => {
      pressable(/^Remove from saved$/)[0].props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(UNDO_MS + 50);
    });
    expect(marked()).toEqual([ids[1]]);
  });

  it('leaving the screen makes a pending removal final', () => {
    save([bank[0].id, bank[1].id]);
    mount(<Saved />);
    act(() => {
      pressable(/^Remove from saved$/)[0].props.onPress();
    });
    act(() => {
      r!.unmount();
    });
    r = undefined;
    expect(marked()).toEqual([bank[1].id]);
  });
});

describe('Mock start', () => {
  it('Start mock sits in the sticky footer', () => {
    mount(<MockStart />);
    const footers = root().findAllByType(StickyFooter);
    expect(footers).toHaveLength(1);
    expect(footers[0].findAll((n) => n.props.label === 'Start mock' && typeof n.props.onPress === 'function').length).toBeGreaterThan(0);
  });
});

describe('Study notes: the read count waits for the first read', () => {
  it('"0 of N read" is not shown; after one note is read the counts appear', () => {
    mount(<NotesIndex />);
    expect(allText()).not.toMatch(/\d+ of \d+ read/);
    expect(allText()).not.toContain('All read');
    act(() => {
      r!.unmount();
    });
    act(() => {
      // Read one note in domain 1.
      useProgress.getState().setNoteRead('cisa', noteSubtopics('cisa', '1')[0].id, true);
    });
    mount(<NotesIndex />);
    expect(allText()).toMatch(/1 of \d+ read/);
  });
});
