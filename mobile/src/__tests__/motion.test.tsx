/**
 * Motion primitives (components/motion.tsx, mobile 1.8).
 *
 * Under Reduce Motion every primitive must land on the same final, static
 * picture as full motion: nothing important is carried by movement alone.
 * The shared jest mock (jest/reanimated-mock.ts) finishes animations at once
 * and really runs useAnimatedStyle, so after effects run, a re-render shows
 * the END state, which is what these tests read.
 *
 * Also: the live Reduce Motion hook (follows the phone mid-session, and the
 * Settings choice), its listener clean-up, PageTurn's direction and swap,
 * once-a-day growth, the Settings → Motion choice and its backup.
 */
import { cloneElement } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions, StyleSheet, Text, View } from 'react-native';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import {
  AnimatedPressable,
  FadeIn,
  MotionRoot,
  motionSubscriberCount,
  PageTurn,
  Pop,
  ProgressFill,
  resetOncePerDayForTest,
  setSystemReducedMotionForTest,
  Shake,
  StateLayer,
  turnDirection,
  useMotion,
  useOncePerDay,
  usePressScale,
} from '../components/motion';
import * as Reanimated from 'react-native-reanimated';
import Settings from '../app/settings';
import { Chip, Segmented } from '../components/ui';
import { useSettings } from '../store/settings';
import { motion } from '../theme/tokens';
import { readBackup } from '../engine/backup';
import { currentBackup } from '../lib/backup';

const CERTS = ['cisa', 'cism', 'crisc', 'aaia', 'cissp'];

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View: V } = jest.requireActual('react-native');
  return { SafeAreaView: V, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

// Spied before anything mounts: the hook must listen to the phone ONCE for the whole app.
const addListener = jest.spyOn(AccessibilityInfo, 'addEventListener');

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
/** Re-render the same tree, so animated styles show where their animations ended. */
const settle = (el: React.ReactElement) => {
  act(() => {
    // A fresh element, so React really renders again (the same one would bail out).
    r!.update(cloneElement(el));
  });
};
const style = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
const byTestId = (id: string) => r!.root.find((n) => n.props.testID === id && typeof n.type !== 'string');
const scaleOf = (s: { transform?: Record<string, number>[] }) => s.transform?.find((t) => 'scale' in t)?.scale;
const xOf = (s: { transform?: Record<string, number>[] }) => s.transform?.find((t) => 'translateX' in t)?.translateX;

/** React Native's jest Dimensions start at 200% text; most tests here want 100%. */
const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } });
  });
};

beforeEach(() => {
  setFontScale(1);
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  useSettings.setState({ motion: 'system', theme: 'light', activeCertId: 'cisa' });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

// ── useMotion: live, plus the in-app choice ────────────────────────────
function MotionProbe() {
  const { reduced } = useMotion();
  return <Text testID="probe">{reduced ? 'reduced' : 'full'}</Text>;
}
const probe = () => (r!.root.findByProps({ testID: 'probe' }).props.children as string);

describe('useMotion', () => {
  it('follows the phone’s Reduce Motion, LIVE, without a restart', () => {
    setMockReducedMotion(false);
    mount(<MotionProbe />);
    expect(probe()).toBe('full');
    // The learner turns Reduce Motion on mid-session.
    act(() => {
      setSystemReducedMotionForTest(true);
    });
    expect(probe()).toBe('reduced');
    act(() => {
      setSystemReducedMotionForTest(false);
    });
    expect(probe()).toBe('full');
  });

  it('Settings → Motion → Reduced wins over a phone with motion on', () => {
    setMockReducedMotion(false);
    mount(<MotionProbe />);
    expect(probe()).toBe('full');
    act(() => {
      useSettings.getState().setMotion('reduced');
    });
    expect(probe()).toBe('reduced');
    act(() => {
      useSettings.getState().setMotion('system');
    });
    expect(probe()).toBe('full');
  });

  it('listens to the phone once for the whole app, and every component unsubscribes on unmount', () => {
    const many = (
      <View>
        <MotionProbe />
        <MotionProbe />
        <MotionProbe />
      </View>
    );
    mount(many);
    expect(motionSubscriberCount()).toBeGreaterThanOrEqual(3);
    act(() => {
      r!.unmount();
    });
    r = undefined;
    expect(motionSubscriberCount()).toBe(0);
    expect(addListener.mock.calls.filter(([type]) => (type as string) === 'reduceMotionChanged')).toHaveLength(1);
  });

  it('MotionRoot tells Reanimated only when the app’s choice differs from the startup setting', () => {
    setMockReducedMotion(false);
    mount(<MotionRoot />);
    expect(r!.toJSON()).toBeNull();
    act(() => {
      useSettings.getState().setMotion('reduced');
    });
    // ReducedMotionConfig is mounted (the mock renders it as nothing, so look for the element).
    expect(r!.root.findAll((n) => typeof n.type === 'function' && n.type.name === 'ReducedMotionConfig')).toHaveLength(1);
    expect(r!.root.findAll((n) => n.props.mode === 'always')).toHaveLength(1);
  });
});

// ── Each primitive under Reduce Motion: the final static state ─────────
describe('reduced: every primitive lands on its final, static state', () => {
  it('FadeIn: fully visible, no offset', () => {
    const el = (
      <FadeIn i={3} delay={200}>
        <Text>Hello</Text>
      </FadeIn>
    );
    mount(el);
    settle(el);
    const s = style(r!.root.findAllByType(View)[0]);
    expect(s.opacity).toBe(1);
    expect(s.transform).toEqual([{ translateY: 0 }]);
  });

  it('FadeIn waits for `when`', () => {
    const el = (when: boolean) => (
      <FadeIn when={when}>
        <Text>Vine</Text>
      </FadeIn>
    );
    mount(el(false));
    settle(el(false));
    expect(style(r!.root.findAllByType(View)[0]).opacity).toBe(0);
    settle(el(true));
    settle(el(true));
    expect(style(r!.root.findAllByType(View)[0]).opacity).toBe(1);
  });

  it('usePressScale: no squeeze under Reduce Motion, a short dim instead; full motion squeezes to .98', () => {
    function Probe() {
      const press = usePressScale();
      return (
        <AnimatedPressable testID="btn" accessibilityRole="button" onPress={() => {}} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={press.style}>
          <Text>Go</Text>
        </AnimatedPressable>
      );
    }
    mount(<Probe />);
    act(() => {
      byTestId('btn').props.onPressIn({});
    });
    settle(<Probe />);
    expect(scaleOf(style(byTestId('btn')))).toBe(1);
    expect(style(byTestId('btn')).opacity).toBeCloseTo(motion.pressOpacity);
    act(() => {
      byTestId('btn').props.onPressOut({});
    });
    settle(<Probe />);
    expect(style(byTestId('btn')).opacity).toBe(1);

    setMockReducedMotion(false);
    settle(<Probe />);
    act(() => {
      byTestId('btn').props.onPressIn({});
    });
    settle(<Probe />);
    expect(scaleOf(style(byTestId('btn')))).toBeCloseTo(motion.pressScale);
    act(() => {
      byTestId('btn').props.onPressOut({});
    });
    settle(<Probe />);
    expect(scaleOf(style(byTestId('btn')))).toBe(1);
  });

  it('StateLayer: fully on, then fully off; hidden from screen readers', () => {
    const el = (on: boolean) => <StateLayer on={on} />;
    mount(el(true));
    const layer = () => r!.root.findAllByType(View)[0];
    expect(style(layer()).opacity).toBe(1);
    expect(layer().props.importantForAccessibility).toBe('no-hide-descendants');
    settle(el(false));
    settle(el(false));
    expect(style(layer()).opacity).toBe(0);
  });

  it('ProgressFill: the new value at once, fill at full strength', () => {
    const el = (v: number) => (
      <View style={{ overflow: 'hidden' }}>
        <ProgressFill value={v} color="green" />
      </View>
    );
    mount(el(0.2));
    // Before layout it draws by width (the same picture).
    expect(style(r!.root.findAllByType(View)[2]).width).toBe('20%');
    const wrapper = r!.root.findAll((n) => typeof n.props.onLayout === 'function')[0];
    act(() => {
      wrapper.props.onLayout({ nativeEvent: { layout: { width: 200, height: 8 } } });
    });
    settle(el(0.6));
    settle(el(0.6));
    const fill = style(r!.root.findAllByType(View)[2]);
    expect(fill.width).toBe('100%');
    expect(xOf(fill)).toBeCloseTo(-80); // (0.6 − 1) × 200
    expect(fill.opacity).toBe(1);
  });

  it('Pop: full size and fully visible after a new trigger', () => {
    const el = (t: number) => (
      <Pop trigger={t}>
        <Text>★</Text>
      </Pop>
    );
    mount(el(0));
    settle(el(1));
    settle(el(1));
    const s = style(r!.root.findAllByType(View)[0]);
    expect(scaleOf(s)).toBe(1);
    expect(s.opacity).toBe(1);
  });

  it('Shake: nothing moves', () => {
    const el = (t: number) => (
      <Shake trigger={t}>
        <Text>Tile</Text>
      </Shake>
    );
    mount(el(0));
    settle(el(1));
    settle(el(1));
    expect(xOf(style(r!.root.findAllByType(View)[0]))).toBe(0);
  });

  it('PageTurn: the new page at once, in place, and the scroll reset runs once', () => {
    const swap = jest.fn();
    const el = (id: number) => (
      <PageTurn id={id} onSwap={swap}>
        <Text>{`Question ${id + 1}`}</Text>
      </PageTurn>
    );
    mount(el(0));
    expect(swap).not.toHaveBeenCalled(); // nothing turns on the first page
    settle(el(1));
    settle(el(1));
    expect(r!.root.findByType(Text).props.children).toBe('Question 2');
    expect(swap).toHaveBeenCalledTimes(1);
    settle(el(1));
    const s = style(r!.root.findAllByType(View)[0]);
    expect(s.opacity).toBe(1);
    expect(xOf(s)).toBe(0);
  });
});

// ── Full motion: the same end states ───────────────────────────────────
describe('full motion lands on the same end states', () => {
  beforeEach(() => setMockReducedMotion(false));

  it('PageTurn: the old page fades out untouchable but still readable, then the new one arrives', () => {
    jest.useFakeTimers();
    const swap = jest.fn();
    const turning = jest.fn();
    const el = (id: number) => (
      <PageTurn id={id} onSwap={swap} onTurning={turning}>
        <Text>{`Question ${id + 1}`}</Text>
      </PageTurn>
    );
    mount(el(0));
    expect(turning).not.toHaveBeenCalled();
    settle(el(1));
    // Leaving: still the old page, which can't be tapped...
    expect(r!.root.findByType(Text).props.children).toBe('Question 1');
    const wrapper = r!.root.findAllByType(View)[0];
    expect(style(wrapper).pointerEvents).toBe('none');
    // ...but is never hidden from screen readers (that would push focus off the button just used).
    expect(r!.root.findAll((n) => n.props.importantForAccessibility === 'no-hide-descendants' || n.props.accessibilityElementsHidden === true)).toHaveLength(0);
    // The parent hears which page is still on screen, before paint.
    expect(turning.mock.calls).toEqual([[0]]);
    expect(swap).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(motion.dur.select);
    });
    expect(r!.root.findByType(Text).props.children).toBe('Question 2');
    expect(swap).toHaveBeenCalledTimes(1);
    expect(turning.mock.calls).toEqual([[0], [null]]);
    settle(el(1));
    const s = style(r!.root.findAllByType(View)[0]);
    expect(s.opacity).toBe(1);
    expect(xOf(s)).toBe(0);
    expect(style(r!.root.findAllByType(View)[0]).pointerEvents).toBeUndefined();
  });

  it('PageTurn calm (mocks): no leaving phase, the new page fades in at once, and the parent never sees a turn', () => {
    jest.useFakeTimers();
    const swap = jest.fn();
    const turning = jest.fn();
    const el = (id: number) => (
      <PageTurn id={id} calm onSwap={swap} onTurning={turning}>
        <Text>{`Question ${id + 1}`}</Text>
      </PageTurn>
    );
    mount(el(0));
    settle(el(1));
    expect(r!.root.findByType(Text).props.children).toBe('Question 2');
    expect(swap).toHaveBeenCalledTimes(1);
    expect(turning).not.toHaveBeenCalled();
    const [frame, page] = r!.root.findAllByType(View);
    expect(style(frame).pointerEvents).toBeUndefined();
    expect(xOf(style(frame))).toBe(0);
    // The page itself carries the short fade (a Reanimated entering animation: no first-frame flash).
    expect(page.props.entering).toBeDefined();
  });

  it('PageTurn: every page is a fresh subtree, so the old page’s state never shows on the new one', () => {
    jest.useFakeTimers();
    // Like a mock: the same structure on every page; option 1 is picked on Q1 only.
    const Page = ({ q, sel }: { q: number; sel: number | null }) => (
      <View>
        {[0, 1, 2, 3].map((k) => (
          <View key={k}>
            <Text>{`Q${q} option ${k}`}</Text>
            <StateLayer on={sel === k} />
          </View>
        ))}
      </View>
    );
    const el = (q: number, sel: number | null) => (
      <PageTurn id={q}>
        <Page q={q} sel={sel} />
      </PageTurn>
    );
    mount(el(0, 1));
    settle(el(1, null));
    act(() => {
      jest.advanceTimersByTime(motion.dur.select);
    });
    // The new page's first frame: every layer was born off (nothing fading out from the old pick).
    const drawn = r!.root.findAllByType(StateLayer).map((l) => style(l.findAllByType(View)[0]).opacity);
    expect(drawn).toEqual([0, 0, 0, 0]);
  });

  it('PageTurn: groups that arrive WITH a page do not stagger again; a group added later still plays', () => {
    jest.useFakeTimers();
    const el = (id: number, extra = false) => (
      <PageTurn id={id}>
        <FadeIn i={2}>
          <Text>{`Topic ${id}`}</Text>
        </FadeIn>
        {extra && (
          <FadeIn>
            <Text>Reveal</Text>
          </FadeIn>
        )}
      </PageTurn>
    );
    mount(el(0));
    // The screen's first page plays its entrance as usual (starts hidden, 8pt low).
    expect(style(r!.root.findAllByType(FadeIn)[0].findAllByType(View)[0]).opacity).toBe(0);
    settle(el(1));
    act(() => {
      jest.advanceTimersByTime(motion.dur.select);
    });
    // The arriving page's group is drawn in place on its first frame: the page's own arrival is its entrance.
    const arrived = style(r!.root.findAllByType(FadeIn)[0].findAllByType(View)[0]);
    expect(arrived.opacity).toBe(1);
    expect(arrived.transform).toEqual([{ translateY: 0 }]);
    // Later (say, the answer reveal), a new group on that page animates in.
    act(() => {
      r!.update(el(1, true));
    });
    expect(style(r!.root.findAllByType(FadeIn)[1].findAllByType(View)[0]).opacity).toBe(0);
  });
});

describe('Segmented thumb', () => {
  const opts = [10, 20, 50].map((n) => ({ value: n, numeral: String(n), label: 'questions' }));
  const layout = () =>
    act(() => {
      r!.root.findByProps({ accessibilityRole: 'radiogroup' }).props.onLayout({ nativeEvent: { layout: { width: 306, height: 50 } } });
    });
  const thumb = () => r!.root.findAll((n) => n.type === View && style(n).position === 'absolute' && style(n).width !== undefined && style(n).borderColor !== undefined)[0];

  beforeEach(() => setMockReducedMotion(false));

  it('is drawn in place when a screen opens on a later option: nothing springs until the learner chooses', () => {
    const spring = jest.spyOn(Reanimated, 'withSpring');
    const el = (v: number) => <Segmented accessibilityLabel="Length" value={v} onChange={() => {}} options={opts} />;
    mount(el(50));
    layout();
    expect(spring).not.toHaveBeenCalled();
    // The third segment's place, from the very first frame with a width.
    const s = style(thumb());
    const step = (s.width as number) + 3;
    expect(xOf(s)).toBeCloseTo(2 * step);
    // A rotation (a new width) moves it in place too.
    act(() => {
      r!.root.findByProps({ accessibilityRole: 'radiogroup' }).props.onLayout({ nativeEvent: { layout: { width: 500, height: 50 } } });
    });
    expect(spring).not.toHaveBeenCalled();
    // A real choice slides.
    act(() => {
      r!.update(el(20));
    });
    expect(spring).toHaveBeenCalledTimes(1);
    expect(spring.mock.calls[0][0]).toBe(1);
    spring.mockRestore();
  });

  it('the thumb and the per-segment layers never take Android elevation (it would cover the label)', () => {
    const el = <Segmented accessibilityLabel="Length" value={20} onChange={() => {}} options={opts} />;
    mount(el);
    // Before layout: the per-segment layer.
    const layer = r!.root.findAllByType(StateLayer).map((l) => style(l.findAllByType(View)[0]));
    expect(layer.length).toBeGreaterThan(0);
    for (const s of layer) expect(s.elevation).toBeUndefined();
    layout();
    expect(style(thumb()).elevation).toBeUndefined();
    expect(style(thumb()).shadowOpacity).toBeGreaterThan(0); // iOS keeps its soft shadow
  });
});

describe('Chip', () => {
  it('the label keeps its contrast mid-fade: it swaps colour with the fill at half-way, not at the tap', () => {
    setMockReducedMotion(false);
    const el = (on: boolean) => <Chip label="Domain 1" selected={on} onPress={() => {}} />;
    mount(el(false));
    const label = () => style(r!.root.find((n) => n.props.children === 'Domain 1' && typeof n.type !== 'string'));
    const ink = label().color;
    // The tap's own render: the fill has not started, so the label is still ink.
    act(() => {
      r!.update(el(true));
    });
    expect(label().color).toBe(ink);
    // Once the fill is past half-way, the label is paper on ink.
    settle(el(true));
    expect(label().color).not.toBe(ink);
  });
});

// ── Pure helpers ───────────────────────────────────────────────────────
describe('turnDirection', () => {
  it('goes forward by default, back when a numeric id goes down, and an explicit direction wins', () => {
    expect(turnDirection(0, 1)).toBe(1);
    expect(turnDirection(4, 3)).toBe(-1);
    expect(turnDirection('1A1', '1A2')).toBe(1);
    expect(turnDirection(4, 3, 1)).toBe(1);
  });
});

describe('useOncePerDay', () => {
  function Once({ k }: { k: string }) {
    return <Text testID="once">{useOncePerDay(k) ? 'first' : 'again'}</Text>;
  }
  const said = () => r!.root.findByProps({ testID: 'once' }).props.children;

  it('is true on the first view of the day only, per key', () => {
    jest.useFakeTimers({ now: new Date('2026-10-11T09:00:00') });
    resetOncePerDayForTest();
    mount(<Once k="rings:today" />);
    expect(said()).toBe('first');
    act(() => {
      r!.unmount();
    });
    mount(<Once k="rings:today" />);
    expect(said()).toBe('again');
    act(() => {
      r!.unmount();
    });
    mount(<Once k="rings:you" />);
    expect(said()).toBe('first');
    act(() => {
      r!.unmount();
    });
    jest.setSystemTime(new Date('2026-10-12T08:00:00'));
    mount(<Once k="rings:today" />);
    expect(said()).toBe('first');
  });
});

// ── Settings → Motion ───────────────────────────────────────────────────

/** Mobile 1.17: Settings → Appearance → Motion is a row that opens the choices in a sheet. */
const openMotionRow = (at: ReactTestInstance) =>
  act(() => {
    at.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel).startsWith('Motion, '))[0].props.onPress();
  });
describe('Settings → Motion', () => {
  it('offers "Match my phone" and "Reduced" as one radio group, and says when the phone already reduces motion', () => {
    mount(<Settings />);
    openMotionRow(r!.root);
    const group = r!.root.findByProps({ accessibilityRole: 'radiogroup', accessibilityLabel: 'Motion' });
    const radios = group.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    expect(radios.map((n) => n.props.accessibilityLabel.split('.')[0])).toEqual(['Match my phone', 'Reduced']);
    expect(radios[0].props.accessibilityState.checked).toBe(true);
    // The mock phone has Reduce Motion on.
    expect(radios[0].props.accessibilityLabel).toMatch(/Reduce Motion is on/);
    act(() => {
      radios[1].props.onPress();
    });
    expect(useSettings.getState().motion).toBe('reduced');
  });

  it('the choice travels in a backup, and a wrong value is refused', () => {
    act(() => {
      useSettings.getState().setMotion('reduced');
    });
    const file = JSON.parse(JSON.stringify(currentBackup(Date.now())));
    expect(readBackup(JSON.stringify(file), CERTS).settings.motion).toBe('reduced');
    file.stores.settings.state.motion = 'bouncy';
    expect(() => readBackup(JSON.stringify(file), CERTS)).toThrow();
  });
});
