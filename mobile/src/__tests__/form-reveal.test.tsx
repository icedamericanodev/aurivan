/**
 * Mobile 1.50 "The Turning" on screen (components/plant/FormReveal.tsx,
 * DESIGN_SYSTEM §8.9 / §8.10), on the suite's Reanimated mock (animations
 * land at once; setMockHoldAnimations holds them mid-way):
 * - timing: the tier's clock runs its whole length; Reduce Motion runs 120 ms;
 * - Reduce Motion: every word at once, announced once, one haptic;
 * - full: the words hidden from screen readers until it ends, then one
 *   announcement, one haptic and one onDone;
 * - skip: a tap, the screen reader's "activate", the screen's scroll drag,
 *   leaving the app; a double skip still ends once;
 * - an unmount mid-way announces nothing;
 * - the once-ever class: it claims the session's moment; with the moment
 *   spent, the calm "See Kai's new form" button, which plays it in full;
 * - the haptics setting: silent when it is off;
 * - the layers are built once per reveal (never per frame or re-render).
 */
import * as Haptics from 'expo-haptics';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, AppState, Dimensions, type AppStateStatus } from 'react-native';
import { setMockHoldAnimations, setMockReducedMotion } from '../../jest/reanimated-mock';
import YourPlant from '../app/plant';
import { claimDecor, claimMoment, pickCelebration, resetCelebrationsForTest, setSystemReducedMotionForTest } from '../components/motion';
import * as art from '../components/plant/art';
import { FormReveal, type FormRevealHandle } from '../components/plant/FormReveal';
import { FORM_FACTS, plantNew, type CertPlant } from '../engine/plant';
import { flushSayLaterForTest } from '../lib/a11y';
import { motion } from '../theme/tokens';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import * as reanimated from '../../jest/reanimated-mock';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

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
const byTestID = (id: string) => r!.root.findAll((n) => n.props.testID === id && typeof n.type === 'string');
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const success = () => (Haptics.notificationAsync as jest.Mock).mock.calls.filter((c) => c[0] === 'success').length;
let say: jest.SpyInstance;
const said = () => {
  act(() => flushSayLaterForTest());
  return say.mock.calls.map((c) => c[0]);
};
const motionOn = () => {
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(false);
};

const ANNOUNCE = 'Kai grows into a new form: the Whip Oak.';
const props = {
  species: 'oak' as const,
  from: 2 as const,
  to: 3 as const,
  theme: 'light' as const,
  size: 200,
  accessibilityLabel: 'Kai, your oak. Whip Oak form. Growth: Shoot.',
  fact: FORM_FACTS[3],
  name: 'Whip Oak',
  lookLine: 'One straight leader with lobed leaves at each node.',
  announce: ANNOUNCE,
  playLabel: 'See Kai’s new form',
  look: { style: 'botanical' as const },
  testID: 'rv',
};

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, plantForms: {}, plantFinal: {} });
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' } });
  (Haptics.notificationAsync as jest.Mock).mockClear();
  (Haptics.selectionAsync as jest.Mock).mockClear();
  say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  say.mockClear();
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});

describe('timing', () => {
  it('full motion runs the tier’s whole clock, linear: 2.4 s small, 3.0 s medium, 3.6 s grand', () => {
    motionOn();
    const timing = jest.spyOn(reanimated, 'withTiming');
    for (const [to, total] of [
      [3, 2400],
      [5, 3000],
      [6, 3600],
    ] as const) {
      resetCelebrationsForTest();
      timing.mockClear();
      mount(<FormReveal {...props} from={to === 3 ? 2 : to === 5 ? 3 : 5} to={to} />);
      expect(byTestID('rv-full')).toHaveLength(1);
      expect(timing.mock.calls.some((c) => c[0] === total && (c[1] as { duration: number }).duration === total)).toBe(true);
      unmount();
    }
  });

  it('Reduce Motion runs one 120 ms cross-fade', () => {
    const timing = jest.spyOn(reanimated, 'withTiming');
    mount(<FormReveal {...props} />);
    expect(byTestID('rv-reduced')).toHaveLength(1);
    expect(timing.mock.calls.some((c) => c[0] === motion.plant.turnReduced && (c[1] as { duration: number }).duration === 120)).toBe(true);
  });
});

describe('Reduce Motion', () => {
  it('every word at once and readable, announced once, one haptic, one onDone; no light and no motes', () => {
    const onDone = jest.fn();
    mount(<FormReveal {...props} onDone={onDone} />);
    const words = byTestID('rv-words')[0];
    expect(words.props.accessibilityElementsHidden).toBe(false);
    expect(textOf(words)).toContain('The Whip Oak');
    expect(textOf(words).indexOf(FORM_FACTS[3])).toBeLessThan(textOf(words).indexOf('The Whip Oak'));
    expect(said()).toEqual([ANNOUNCE]);
    expect(success()).toBe(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(byTestID('rv-halo')).toHaveLength(0);
  });
});

describe('full motion', () => {
  it('words hidden from screen readers while it plays; at the end one announcement, one haptic, one onDone', () => {
    motionOn();
    setMockHoldAnimations(true);
    const onDone = jest.fn();
    mount(<FormReveal {...props} onDone={onDone} />);
    expect(byTestID('rv-full')).toHaveLength(1);
    expect(byTestID('rv-words')[0].props.accessibilityElementsHidden).toBe(true);
    // The plant is one image with the NEW form's label from the first frame.
    expect(byTestID('rv-full')[0].props.accessibilityLabel).toBe(props.accessibilityLabel);
    expect(said()).toEqual([]);
    expect(success()).toBe(0);
    expect(onDone).not.toHaveBeenCalled();
    unmount();
    setMockHoldAnimations(false);
    resetCelebrationsForTest();
    mount(<FormReveal {...props} onDone={onDone} />);
    expect(byTestID('rv-words')[0].props.accessibilityElementsHidden).toBe(false);
    expect(said()).toEqual([ANNOUNCE]);
    expect(success()).toBe(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('it is the session’s one moment: a celebration after it plays short, and the budget is spent', () => {
    motionOn();
    mount(<FormReveal {...props} />);
    expect(byTestID('rv-full')).toHaveLength(1);
    expect(pickCelebration('clearing', false).mode).not.toBe('full');
    expect(claimDecor(motion.dur.short)).toBe(false);
  });

  it('a grand change draws Form IV’s ring (the halo) and ends with it whole', () => {
    motionOn();
    mount(<FormReveal {...props} from={5} to={6} />);
    const halo = byTestID('rv-halo');
    expect(halo).toHaveLength(1);
    const circle = halo[0].findAll((n) => n.props.animatedProps !== undefined)[0];
    expect(circle.props.animatedProps.strokeDashoffset).toBeCloseTo(0, 5);
  });
});

describe('skip', () => {
  const holdThenMount = (extra: Partial<typeof props> & { onDone?: () => void; controlRef?: React.RefObject<FormRevealHandle | null> } = {}) => {
    motionOn();
    setMockHoldAnimations(true);
    mount(<FormReveal {...props} {...extra} />);
    expect(said()).toEqual([]);
    // Let the skip's own 120 ms dissolve land (the clock stays held where it was).
    setMockHoldAnimations(false);
  };

  it('a tap anywhere on it dissolves to the end: one announcement, one haptic, one onDone, even tapped twice', () => {
    const onDone = jest.fn();
    const timing = jest.spyOn(reanimated, 'withTiming');
    holdThenMount({ onDone });
    timing.mockClear();
    const root = byTestID('rv')[0];
    act(() => root.props.onTouchStart());
    // The dissolve is 120 ms, never a hard cut.
    expect(timing.mock.calls.some((c) => c[0] === 1 && (c[1] as { duration: number }).duration === motion.turn.skip)).toBe(true);
    expect(byTestID('rv')[0].props.onTouchStart).toBeUndefined();
    expect(said()).toEqual([ANNOUNCE]);
    expect(success()).toBe(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(byTestID('rv-words')[0].props.accessibilityElementsHidden).toBe(false);
  });

  it('the screen reader’s "activate" skips it, and the screen’s scroll drag (controlRef) too; twice is still once', () => {
    const onDone = jest.fn();
    holdThenMount({ onDone });
    const stage = byTestID('rv-full')[0];
    expect(stage.props.accessibilityActions).toEqual([{ name: 'activate', label: 'Show the new form now' }]);
    act(() => stage.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } }));
    expect(byTestID('rv-full')[0].props.accessibilityActions).toBeUndefined();
    expect(said()).toEqual([ANNOUNCE]);
    unmount();
    say.mockClear();
    resetCelebrationsForTest();
    const ref = { current: null as FormRevealHandle | null };
    holdThenMount({ onDone, controlRef: ref });
    act(() => {
      ref.current!.skip();
      ref.current!.skip();
    });
    expect(said()).toEqual([ANNOUNCE]);
    expect(success()).toBe(2); // one per reveal
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it('leaving the app skips to the end (it is never left half-turned)', () => {
    let listener: ((s: AppStateStatus) => void) | null = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, fn) => {
      listener = fn as (s: AppStateStatus) => void;
      return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
    });
    holdThenMount();
    expect(listener).not.toBeNull();
    act(() => listener!('background'));
    expect(said()).toEqual([ANNOUNCE]);
  });

  it('an unmount mid-way announces nothing, buzzes nothing and never throws', () => {
    motionOn();
    setMockHoldAnimations(true);
    const onDone = jest.fn();
    mount(<FormReveal {...props} onDone={onDone} />);
    expect(() => unmount()).not.toThrow();
    expect(said()).toEqual([]);
    expect(success()).toBe(0);
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('the session’s moment already spent', () => {
  it('waits with the fact and one calm button; nothing is announced or buzzed until it is tapped, then it plays in full', () => {
    motionOn();
    expect(claimMoment()).toBe(true); // the session's one moment, spent elsewhere
    expect(claimMoment()).toBe(false);
    const onDone = jest.fn();
    mount(<FormReveal {...props} onDone={onDone} />);
    expect(byTestID('rv-wait')).toHaveLength(1);
    const words = textOf(byTestID('rv-words')[0]);
    expect(words).toContain(FORM_FACTS[3]);
    expect(words).toContain('See Kai’s new form');
    expect(words).not.toContain('The Whip Oak');
    expect(byTestID('rv-words')[0].props.accessibilityElementsHidden).toBe(false);
    expect(said()).toEqual([]);
    expect(success()).toBe(0);
    expect(onDone).not.toHaveBeenCalled();
    // The tap is the learner's own: it plays in full (not charged, not refused).
    const press = byTestID('rv-play')[0].findAll((n) => typeof n.props.onPress === 'function')[0];
    act(() => press.props.onPress());
    expect(byTestID('rv-full')).toHaveLength(1);
    expect(byTestID('rv-play')).toHaveLength(0);
    expect(textOf(byTestID('rv-words')[0])).toContain('The Whip Oak');
    expect(said()).toEqual([ANNOUNCE]);
    expect(success()).toBe(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('Reduce Motion never waits: the cross-fade, at once', () => {
    claimMoment();
    mount(<FormReveal {...props} />);
    expect(byTestID('rv-reduced')).toHaveLength(1);
    expect(byTestID('rv-play')).toHaveLength(0);
  });

  it('on Your plant, after the session’s moment: "See Kai’s new form", and the screen still scrolls', () => {
    motionOn();
    const T0 = Date.now() - 10 * 86_400_000;
    const p: CertPlant = { ...plantNew('oak', 'Kai', T0, 3), backfill: { at: T0, growth: 3, seen: true } };
    act(() => {
      useProgress.getState().resetCert('cisa');
      useProgress.getState().updatePlant('cisa', () => p);
    });
    useSeen.setState({ plantForms: { cisa: { seen: 1 } } });
    claimMoment();
    mount(<YourPlant />);
    expect(byTestID('plant-form-reveal-wait')).toHaveLength(1);
    expect(textOf(byTestID('plant-form-reveal-play')[0])).toContain('See Kai’s new form');
    // Written down as shown at once (leaving without tapping still counts).
    expect(useSeen.getState().plantForms?.cisa).toEqual({ seen: 2 });
  });
});

describe('the haptics setting', () => {
  it('Settings → Haptics off: the reveal is silent; on: exactly one success, never a selection tick', () => {
    motionOn();
    useSettings.setState({ haptics: false });
    mount(<FormReveal {...props} from={5} to={6} />);
    expect(said()).toEqual([ANNOUNCE]);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    unmount();
    useSettings.setState({ haptics: true });
    resetCelebrationsForTest();
    mount(<FormReveal {...props} from={5} to={6} />);
    expect(success()).toBe(1);
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});

describe('performance', () => {
  it('the two drawings are built once per reveal, never again while it plays, skips or ends', () => {
    motionOn();
    setMockHoldAnimations(true);
    const build = jest.spyOn(art, 'buildPlant');
    mount(<FormReveal {...props} />);
    const n = build.mock.calls.length;
    expect(n).toBe(2);
    setMockHoldAnimations(false);
    act(() => byTestID('rv')[0].props.onTouchStart());
    act(() => r!.update(<FormReveal {...props} />));
    expect(build.mock.calls.length).toBe(n);
  });

  it('at most 8 motes, and none under Reduce Motion', () => {
    motionOn();
    setMockHoldAnimations(true);
    mount(<FormReveal {...props} from={5} to={6} />);
    const motes = r!.root.findAll((n) => typeof n.type === 'string' && n.props.style && JSON.stringify(n.props.style).includes('"position":"absolute","left":0,"top":0'));
    expect(motes.length).toBeGreaterThan(0);
    expect(motes.length).toBeLessThanOrEqual(motion.celebrate.leaves);
  });
});
