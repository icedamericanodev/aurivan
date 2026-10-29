/**
 * Mobile 1.50 plant forms on the real screens:
 * - Your plant names the form under the plant's name, with its look line and the next form;
 * - a form reached since the last visit plays its reveal ONCE (learning fact first, then the
 *   form), full motion (The Turning), or the Reduce Motion cross-fade;
 * - a plant already past Form I when forms arrived gets one quiet note, never a reveal;
 * - at Elder the learner chooses the final form on the Look screen (never before Elder);
 * - Today's grow-up line points to Your plant when a new form came; the widget says "growth".
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions } from 'react-native';
import { setMockHoldAnimations, setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import YourPlant from '../app/plant';
import PlantLook from '../app/plant-look';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { FORM_FACTS, plantNew, type CertPlant } from '../engine/plant';
import { SEE_NEW_FORM } from '../engine/plantForms';
import { widgetFace, type WidgetSnapshot } from '../engine/widgets';
import { FormReveal } from '../components/plant/FormReveal';
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
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));

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
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(r!.root);
  return out.join(' ');
};
const byTestID = (id: string) => r!.root.findAll((n) => n.props.testID === id && typeof n.type === 'string');
const setPlant = (p: CertPlant | undefined) => {
  act(() => {
    useProgress.getState().updatePlant('cisa', () => p);
  });
};
const T0 = Date.now() - 10 * 86_400_000;
/** A botanical plant at `growth` (planted from 1.40 on), with nothing pending. */
const grown = (growth: 1 | 2 | 3 | 4 | 5 | 6, species: CertPlant['species'] = 'oak'): CertPlant => ({ ...plantNew(species, 'Kai', T0, growth), backfill: { at: T0, growth, seen: true } });

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, plantForms: {}, plantFinal: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: undefined });
    useProgress.getState().updatePlant('cisa', () => undefined);
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' } });
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});

describe('Your plant', () => {
  it('names the form under the plant’s name, with its look and the next form (no second number)', () => {
    setPlant(grown(3));
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    mount(<YourPlant />);
    const text = allText();
    expect(text).toContain('The Whip Oak');
    expect(text).toContain('One straight leader with lobed leaves at each node.');
    expect(text).toContain('Grows into the Standard Oak at Bough.');
    expect(text).not.toMatch(/form \d|\d of 4|Form I/);
    expect(byTestID('plant-form-reveal')).toHaveLength(0);
  });

  it('a new form plays its reveal once: the learning fact first, then the form; never again', () => {
    setPlant(grown(3));
    useSeen.setState({ plantForms: { cisa: { seen: 1 } } });
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    mount(<YourPlant />);
    expect(byTestID('plant-form-reveal')).toHaveLength(1);
    const text = allText();
    expect(text.indexOf(FORM_FACTS[3])).toBeGreaterThan(-1);
    expect(text.indexOf(FORM_FACTS[3])).toBeLessThan(text.indexOf('The Whip Oak'));
    expect(text).toContain('A new form');
    // No readiness wording beside the form (the growth steps further down are their own section).
    const words = r!.root.findAll((n) => n.props.testID === 'plant-form-reveal-words')[0];
    const said: string[] = [];
    const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? said.push(n) : n.children.forEach(walk));
    walk(words);
    expect(said.join(' ')).toContain('The Whip Oak');
    expect(said.join(' ')).not.toMatch(/evol|ready|readiness|\bpass/i);
    // Written down at once: leaving mid-way still counts as shown.
    expect(useSeen.getState().plantForms?.cisa).toEqual({ seen: 2 });
    act(() => flushSayLaterForTest());
    expect(say).toHaveBeenCalledWith('Kai grows into a new form: the Whip Oak.');
    unmount();
    mount(<YourPlant />);
    expect(byTestID('plant-form-reveal')).toHaveLength(0);
  });

  it('Reduce Motion: a cross-fade with no light; full motion plays The Turning', () => {
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    setSystemReducedMotionForTest(true);
    mount(<YourPlant />);
    expect(byTestID('plant-form-reveal')).toHaveLength(1);
    expect(byTestID('plant-form-reveal-reduced')).toHaveLength(1);
    expect(allText()).toContain('The Broadcrown Oak');
    unmount();
    setSystemReducedMotionForTest(false);
    setMockReducedMotion(false);
    resetCelebrationsForTest();
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    expect(byTestID('plant-form-reveal-full')).toHaveLength(1);
  });

  it('a plant already past Form I when forms arrived: one quiet note, never a reveal for history', () => {
    setPlant(grown(5));
    mount(<YourPlant />);
    expect(byTestID('plant-form-reveal')).toHaveLength(0);
    expect(allText()).toContain('Your study so far brought Kai to the Standard Oak.');
    unmount();
    mount(<YourPlant />);
    expect(allText()).not.toContain('Your study so far brought');
    expect(byTestID('plant-form-reveal')).toHaveLength(0);
  });

  it('a storybook plant (saved before 1.40) keeps its six growths: no form names, no reveal', () => {
    const { look: _look, ...old } = grown(5);
    setPlant(old);
    useSeen.setState({ plantForms: { cisa: { seen: 1 } } });
    mount(<YourPlant />);
    expect(allText()).not.toContain('Standard Oak');
    expect(byTestID('plant-form-reveal')).toHaveLength(0);
  });
});

describe('UX review fixes (1.50 forms)', () => {
  it('H2: under the form, "Your oak · Shoot": the growth by name, no count anywhere on the screen', () => {
    setPlant(grown(3));
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    mount(<YourPlant />);
    const text = allText();
    expect(text).toContain('Your oak · Shoot');
    expect(text).not.toMatch(/growth \d|\d of 6/);
    // The spoken plant label: the form and the growth's name, no count either.
    expect(r!.root.findAll((n) => typeof n.props.accessibilityLabel === 'string' && /\d of 6/.test(n.props.accessibilityLabel))).toHaveLength(0);
  });

  it('H2: a storybook plant (no forms) keeps its "growth n of 6" line', () => {
    const { look: _look, ...old } = grown(5);
    setPlant(old);
    mount(<YourPlant />);
    expect(allText()).toContain('growth 5 of 6');
    expect(byTestID('plant-steps-rule')).toHaveLength(0);
  });

  it('P4: the steps sit under their own heading after a hairline, worded as a study estimate', () => {
    setPlant(grown(5));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    expect(byTestID('plant-steps-rule')).toHaveLength(1);
    const heading = r!.root.findAll((n) => n.props.accessibilityRole === 'header' && n.props.children === 'What grows it next');
    expect(heading.length).toBeGreaterThan(0);
    const text = allText();
    expect(text).toContain('Your study estimate holds steady for a week');
    expect(text).not.toMatch(/readiness|\bready\b|\bpass|guarantee/i);
  });

  it('P3, P6: Look at Elder drops "or your readiness", and each final says its idea once', () => {
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 4 } } });
    mount(<PlantLook />);
    const text = allText();
    expect(text).toContain('A look is just for you: it never changes your growth.');
    expect(text).not.toMatch(/readiness/i);
    expect(text).toContain('Your oak · Elder');
    expect(text).not.toMatch(/growth \d|\d of 6/);
    // The Moot row: its look line only (the flavour's idea is not said a second time).
    expect(text).toContain('Long level limbs roof a ring of five stones; the crown sits in tiers.');
    expect(text).not.toContain('Level limbs make a roof over a ring of meeting stones.');
    expect(text).not.toContain('Its own final form.');
  });

  const revealProps = {
    species: 'oak' as const,
    from: 2 as const,
    to: 3 as const,
    theme: 'light' as const,
    size: 200,
    accessibilityLabel: 'Kai, your oak. Whip Oak form. Growth: Shoot.',
    fact: FORM_FACTS[3],
    name: 'Whip Oak',
    lookLine: 'One straight leader with lobed leaves at each node.',
    announce: 'Kai grows into a new form: the Whip Oak.',
    testID: 'rv',
  };
  const words = () => byTestID('rv-words')[0];

  it('P5: mid-motion, the words are hidden from screen readers and nothing is announced yet', () => {
    setMockReducedMotion(false);
    setSystemReducedMotionForTest(false);
    // Hold every animation mid-way (the mock normally finishes them at once).
    setMockHoldAnimations(true);
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    say.mockClear(); // jest/setup.ts's mock keeps earlier tests' calls
    mount(<FormReveal {...revealProps} />);
    expect(byTestID('rv-full')).toHaveLength(1);
    expect(words().props.accessibilityElementsHidden).toBe(true);
    expect(words().props.importantForAccessibility).toBe('no-hide-descendants');
    act(() => flushSayLaterForTest());
    expect(say).not.toHaveBeenCalled();
  });

  it('P5: once the motion ends the words are readable, and the form is announced exactly once', async () => {
    setMockReducedMotion(false);
    setSystemReducedMotionForTest(false);
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    say.mockClear(); // jest/setup.ts's mock keeps earlier tests' calls
    mount(<FormReveal {...revealProps} />);
    // Full motion starts its clock on the frame after mount (review O6).
    await act(async () => {
      await new Promise((res) => setTimeout(res, 0));
    });
    expect(byTestID('rv-full')).toHaveLength(1);
    expect(words().props.accessibilityElementsHidden).toBe(false);
    expect(words().props.importantForAccessibility).toBe('auto');
    act(() => flushSayLaterForTest());
    expect(say).toHaveBeenCalledTimes(1);
    expect(say).toHaveBeenCalledWith('Kai grows into a new form: the Whip Oak.');
  });

  it('P5: Reduce Motion shows the words at once, never hidden', () => {
    setSystemReducedMotionForTest(true);
    mount(<FormReveal {...revealProps} />);
    expect(byTestID('rv-reduced')).toHaveLength(1);
    expect(words().props.accessibilityElementsHidden).toBe(false);
  });
});

describe('the Form IV choice (Look)', () => {
  it('at Elder the learner chooses among the own final and five flavours; it is kept on this phone only', () => {
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 4 } } });
    mount(<PlantLook />);
    for (const id of ['own', 'lookout', 'moot', 'espalier', 'coppice', 'holdfast']) expect(byTestID(`look-final-${id}`)).toHaveLength(1);
    act(() => {
      r!.root.findAll((n) => n.props.testID === 'look-final-moot' && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(useSeen.getState().plantFinal?.cisa).toBe('moot');
    // Not written into the plant (so not into a backup) in this release.
    expect(useProgress.getState().byCert.cisa?.plant?.look?.final).toBeUndefined();
    expect(allText()).toContain('Moot Oak');
  });

  it('before Elder there is nothing to choose (no wall of forms)', () => {
    setPlant(grown(5));
    mount(<PlantLook />);
    expect(byTestID('look-final-own')).toHaveLength(0);
  });
});

describe('Today and the widget', () => {
  it('a grow-up into a new form says where to see it; the reveal never plays on Today', () => {
    setPlant({ ...grown(3), reached: { sprout: T0, shoot: Date.now() }, pending: 3 });
    mount(<Today />);
    expect(allText()).toContain(SEE_NEW_FORM);
    expect(byTestID('plant-form-reveal')).toHaveLength(0);
  });

  it('the plant widget says "growth", never "stage", and names the form', () => {
    const face = widgetFace(
      'plant',
      { onboarded: true, plant: { species: 'oak', name: 'oak', growth: 4, grew: null, style: 'botanical' } } as unknown as WidgetSnapshot,
      { now: Date.now() },
    );
    expect(face.label).toMatch(/^Your oak, at growth 4, bough\. Standard Oak form\./);
    expect(face.label).not.toMatch(/stage/i);
  });
});
