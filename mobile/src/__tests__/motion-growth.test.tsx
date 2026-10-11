/**
 * Mobile 1.9 motion, M3 "numbers and growth" and M6 "celebrations"
 * (components/motion.tsx, DESIGN_SYSTEM.md §8).
 *
 * What these pin, in plain words:
 * - a rolling number always lands on the final value, and a screen reader
 *   only ever hears that final value;
 * - growth shows what went UP since the learner last looked, never a fall,
 *   and never replays on a later visit;
 * - a celebration plays in full at most once per session and its first three
 *   times, then shortened; Reduce Motion gives the same words with no motion;
 *   any touch ends it;
 * - the leaves, the theme fade, the plan leaf fill and the bars behave the
 *   same way, and every one has a static end state.
 * The shared jest mock (jest/reanimated-mock.ts) finishes every animation at
 * once, so after effects run a re-render shows each animation's END state.
 */
import { cloneElement, useState } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions, StyleSheet, Text } from 'react-native';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import {
  Celebrate,
  claimDecor,
  columnRows,
  FadeIn,
  LeafFall,
  pickCelebration,
  ProgressFill,
  resetCelebrationsForTest,
  resetOncePerDayForTest,
  ROLL,
  RollingText,
  rollSlots,
  setSystemReducedMotionForTest,
  ThemeFade,
  useCelebration,
  useGrowth,
  type Celebration,
  type Growth,
} from '../components/motion';
import { Path } from 'react-native-svg';
import { GrowthRings } from '../components/glyphs';
import { PlanLeaves } from '../components/journey';
import { BigNum, Stepper } from '../components/ui';
import { flushSayLaterForTest } from '../lib/a11y';
import * as haptics from '../lib/haptics';
import { SEEN_MAX_KEYS, useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import { motion, serifNumeral, type as typeScale } from '../theme/tokens';

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
}));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const settle = (el: React.ReactElement) => {
  act(() => {
    r!.update(cloneElement(el));
  });
};
const style = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
const yOf = (s: { transform?: Record<string, number>[] }) => s.transform?.find((t) => 'translateY' in t)?.translateY;
const texts = () => r!.root.findAllByType(Text).map((t) => [t.props.children].flat().join(''));

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  useSettings.setState({ motion: 'system', theme: 'light', activeCertId: 'cisa', haptics: true });
  useSeen.setState({ values: {}, moments: {} });
  resetCelebrationsForTest();
  resetOncePerDayForTest();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── The odometer's maths ───────────────────────────────────────────────
describe('rollSlots and columnRows', () => {
  it('lines the old value up under the new one, digit run by digit run, from the right', () => {
    expect(rollSlots('62–70', '58–66')).toEqual([
      { digit: true, to: 6, from: 5 },
      { digit: true, to: 2, from: 8 },
      { digit: false, ch: '–' },
      { digit: true, to: 7, from: 6 },
      { digit: true, to: 0, from: 6 },
    ]);
    // A count-up: missing places roll in from blank; the "/20" never moves.
    expect(rollSlots('12/20', '0/20')).toEqual([
      { digit: true, to: 1, from: null },
      { digit: true, to: 2, from: 0 },
      { digit: false, ch: '/' },
      { digit: true, to: 2, from: 2 },
      { digit: true, to: 0, from: 0 },
    ]);
    // A different shape ("–" for no data) rolls everything in from blank.
    expect(rollSlots('31', '–').every((s) => !s.digit || s.from === null)).toBe(true);
  });

  it('always rolls up for a rise (wrapping through 9), down for a step back', () => {
    expect(columnRows(2, 7, 1)).toEqual([3, 8]); // 2 → 7, upward
    expect(columnRows(9, 1, 1)).toEqual([10, 12]); // 9 → 1 wraps (second cycle), still upward
    expect(columnRows(null, 4, 1)).toEqual([0, 5]); // from blank
    expect(columnRows(5, 3, -1)).toEqual([16, 14]); // 5 → 3, downward
    expect(columnRows(0, 9, -1)).toEqual([11, 10]); // 0 → 9 back one, downward
    expect(columnRows(4, 4, 1)).toEqual([5, 5]); // nothing moves
  });
});

// ── RollingText / BigNum roll ──────────────────────────────────────────
describe('rolling numbers', () => {
  const LH = serifNumeral(52).lineHeight!;
  /** Row to row in a column: the line plus the odometer's blank gap. */
  const PITCH = Math.round(LH + 52 * ROLL.gap);

  it('reduced: plain text with the final value (exactly as before), and nothing moves', () => {
    const el = <BigNum value="62–70" pct size={52} roll={{ play: true, from: '58–66', run: 1 }} />;
    mount(el);
    settle(el);
    expect(texts()).toEqual(['62–70', '%']);
  });

  it('full motion: each digit column lands on its final digit; screen readers hear only the final value, once', () => {
    setMockReducedMotion(false);
    const el = <BigNum value="62–70" pct size={52} accessibilityLabel="Readiness 62 to 70 percent" roll={{ play: true, from: '58–66', run: 1 }} />;
    mount(el);
    settle(el);
    // ONE stop (no second one for the moving digits inside it).
    const labelled = r!.root.findAll((n) => n.props.accessible === true && typeof n.type === 'string');
    expect(labelled.map((n) => n.props.accessibilityLabel)).toEqual(['Readiness 62 to 70 percent']);
    // The moving columns are hidden from screen readers.
    const hidden = r!.root.findAll((n) => n.props.importantForAccessibility === 'no-hide-descendants' && typeof n.type === 'string');
    expect(hidden).toHaveLength(4);
    const columns = hidden.map((h) => h.findAll((n) => typeof n.type === 'string' && style(n).transform !== undefined)[0]);
    const ys = columns.map((c) => yOf(style(c)));
    // 5→6 and 8→2 (wraps) on the left, 6→7 and 6→0 (wraps) on the right: all at their final digit.
    expect(ys).toEqual([-columnRows(5, 6, 1)[1] * PITCH, -columnRows(8, 2, 1)[1] * PITCH, -columnRows(6, 7, 1)[1] * PITCH, -columnRows(6, 0, 1)[1] * PITCH]);
  });

  it('not playing: the same plain text, so a screen that has nothing new shows it still', () => {
    setMockReducedMotion(false);
    const el = <BigNum value="31" size={30} roll={{ play: false, from: null, run: 0 }} />;
    mount(el);
    settle(el);
    expect(texts()).toEqual(['31']);
  });

  it('a new value without a new roll jumps straight to it (no column left behind)', () => {
    setMockReducedMotion(false);
    const lh = 22;
    const el = (v: string) => <RollingText value={v} from="4" play run={1} style={{ fontSize: 16, lineHeight: lh }} maxScale={2} color="#000" />;
    mount(el('5'));
    settle(el('5'));
    settle(el('9'));
    settle(el('9')); // the effect moved it; one more render shows where
    const col = r!.root.findAll((n) => typeof n.type === 'string' && yOf(style(n)) !== undefined)[0];
    expect(yOf(style(col))).toBe(-(9 + 1) * Math.round(lh + 16 * ROLL.gap));
  });
});

// ── useGrowth: what went up since the learner last looked ──────────────
describe('useGrowth', () => {
  let seen: Growth | null = null;
  function Probe({ k, v, active = true, firstOfDay = false }: { k: string; v: number[]; active?: boolean; firstOfDay?: boolean }) {
    seen = useGrowth(k, v, { active, firstOfDay });
    return null;
  }

  it('grows from the last seen values when they went up, and remembers what is on view', () => {
    useSeen.setState({ values: { 'you:rings:cisa': [40, 50] }, moments: {} });
    mount(<Probe k="you:rings:cisa" v={[44, 50]} />);
    expect(seen).toMatchObject({ play: true, from: [40, 50] });
    expect(useSeen.getState().values['you:rings:cisa']).toEqual([44, 50]);
  });

  it('never animates a fall: a value that went down is simply shown', () => {
    useSeen.setState({ values: { k: [60] }, moments: {} });
    mount(<Probe k="k" v={[55]} firstOfDay />);
    expect(seen).toMatchObject({ play: false, from: [55] });
  });

  it('one value down and one up: only the risen one moves (the fallen one starts where it is)', () => {
    useSeen.setState({ values: { k: [60, 30] }, moments: {} });
    mount(<Probe k="k" v={[55, 36]} />);
    expect(seen).toMatchObject({ play: true, from: [55, 30] });
  });

  it('the first view of the day grows from 0; a second look with nothing new shows it still', () => {
    mount(<Probe k="today:rings:cisa" v={[30, 40]} firstOfDay />);
    expect(seen).toMatchObject({ play: true, from: [0, 0] });
    act(() => r!.unmount());
    mount(<Probe k="today:rings:cisa" v={[30, 40]} firstOfDay />);
    expect(seen).toMatchObject({ play: false });
  });

  it('waits while the screen is out of view, then plays when it comes back (a tab)', () => {
    useSeen.setState({ values: { k: [10] }, moments: {} });
    mount(<Probe k="k" v={[10]} />);
    expect(seen?.play).toBe(false);
    // The value changes while another screen is on top: nothing plays, nothing is written.
    act(() => r!.update(<Probe k="k" v={[14]} active={false} />));
    expect(seen?.play).toBe(false);
    expect(useSeen.getState().values.k).toEqual([10]);
    act(() => r!.update(<Probe k="k" v={[14]} active />));
    expect(seen).toMatchObject({ play: true, from: [10] });
  });

  it('the seen store keeps at most SEEN_MAX_KEYS surfaces, dropping the oldest', () => {
    for (let i = 0; i < SEEN_MAX_KEYS + 5; i++) useSeen.getState().see(`k${i}`, [i]);
    const keys = Object.keys(useSeen.getState().values);
    expect(keys).toHaveLength(SEEN_MAX_KEYS);
    expect(keys[0]).toBe('k5');
  });
});

// ── Celebrations: budget, fatigue, skip ────────────────────────────────
describe('celebrations', () => {
  it('Reduce Motion: static, with no motion (and it is still counted)', () => {
    expect(pickCelebration('clearing', true)).toEqual({ mode: 'static', first: true });
    expect(useSeen.getState().moments.clearing).toBe(1);
  });

  it('at most ONE plays in full per app session; the next is shortened', () => {
    expect(pickCelebration('clearing', false).mode).toBe('full');
    expect(pickCelebration('milestone', false).mode).toBe('short');
    resetCelebrationsForTest(); // a new launch
    expect(pickCelebration('milestone', false).mode).toBe('full');
  });

  it('a kind plays in full its first three times, then shortened (it does not wear out its welcome)', () => {
    const modes = [];
    for (let i = 0; i < 5; i++) {
      resetCelebrationsForTest();
      modes.push(pickCelebration('clearing', false).mode);
    }
    expect(modes).toEqual(['full', 'full', 'full', 'short', 'short']);
  });

  it('decorative motion stays inside the session budget (≤ 3 s)', () => {
    expect(claimDecor(motion.celebrate.sessionMs - 1000)).toBe(true);
    expect(claimDecor(motion.dur.celebrate)).toBe(false);
    expect(pickCelebration('milestone', false).mode).toBe('short');
  });

  it('announces its words once, and any touch inside ends it: the parts jump to their end state', () => {
    setMockReducedMotion(false);
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    let cel: Celebration | null = null;
    function Moment() {
      cel = useCelebration('clearing', true, 'Today’s clearing. Two of two, done.');
      return (
        <Celebrate celebration={cel}>
          <FadeIn delay={900}>
            <Text>Readiness grew to 67–77%</Text>
          </FadeIn>
          <LeafFall run={cel.mode === 'full'} colors={['#2B6E4A']} width={40} height={100} />
        </Celebrate>
      );
    }
    mount(<Moment />);
    expect(cel!.mode).toBe('full');
    expect(cel!.settled).toBe(false);
    // After a short pause (a screen change must not cut it off).
    expect(say).not.toHaveBeenCalled();
    flushSayLaterForTest();
    expect(say).toHaveBeenCalledTimes(1);
    // Six to eight leaves at most, while it runs.
    const leaves = () => r!.root.findAll((n) => n.props.accessibilityElementsHidden === true && typeof n.type === 'string' && n.props.style && StyleSheet.flatten(n.props.style).overflow === 'hidden');
    expect(leaves()).toHaveLength(1);
    // A touch anywhere inside: settled, the leaves are gone, the words are fully there.
    const frame = r!.root.find((n) => typeof n.props.onTouchStart === 'function');
    act(() => frame.props.onTouchStart());
    expect(cel!.settled).toBe(true);
    expect(leaves()).toHaveLength(0);
    const words = r!.root.findByType(FadeIn).findAll((n) => typeof n.type === 'string')[0];
    expect(style(words).opacity).toBe(1);
    expect(say).toHaveBeenCalledTimes(1);
  });

  it('without a touch it simply ends after 1.2 s (a later tap is not a skip)', () => {
    jest.useFakeTimers();
    setMockReducedMotion(false);
    let cel: Celebration | null = null;
    function Moment() {
      cel = useCelebration('milestone', true);
      return <Celebrate celebration={cel}><Text>x</Text></Celebrate>;
    }
    mount(<Moment />);
    expect(cel!.settled).toBe(false);
    act(() => {
      jest.advanceTimersByTime(motion.dur.celebrate);
    });
    expect(cel!.settled).toBe(true);
  });

  it('LeafFall: nothing under Reduce Motion', () => {
    mount(<LeafFall run colors={['#000']} width={40} height={100} />);
    expect(r!.toJSON()).toBeNull();
  });
});

// ── Growth rings from the previous value ───────────────────────────────
describe('GrowthRings grow', () => {
  const ring = (el: React.ReactElement) => {
    mount(el);
    settle(el);
    return r!.root.findAll((n) => n.type === Path && n.props.animatedProps !== undefined);
  };
  it('full motion: every arc ends drawn in full, with no stray cap dot hidden', () => {
    setMockReducedMotion(false);
    const arcs = ring(<GrowthRings preset="you" mastery={[0.5, 0.8]} weights={[20, 30]} colors="#000" track="#eee" grow={{ play: true, from: [0.3, 0.9], run: 1 }} />);
    expect(arcs).toHaveLength(2);
    for (const a of arcs) {
      expect(a.props.animatedProps.strokeDashoffset).toBeCloseTo(0);
      expect(a.props.animatedProps.strokeOpacity).toBe(1);
    }
  });
});

// ── ProgressFill from the last seen value ──────────────────────────────
describe('ProgressFill from', () => {
  it('starts at the old value before layout, then ends at the new one', () => {
    setMockReducedMotion(false);
    const el = <ProgressFill value={0.6} from={0.2} color="#000" />;
    mount(el);
    const pre = r!.root.findAll((n) => typeof n.type === 'string' && style(n).width === '20%');
    expect(pre).toHaveLength(1);
    const track = r!.root.find((n) => typeof n.props.onLayout === 'function');
    act(() => track.props.onLayout({ nativeEvent: { layout: { width: 200, height: 6 } } }));
    settle(el);
    const bar = r!.root.findAll((n) => typeof n.type === 'string' && style(n).transform !== undefined)[0];
    expect(style(bar).transform[0].translateX).toBeCloseTo((0.6 - 1) * 200);
  });

  it('reduced: the value at once (it never grows)', () => {
    const el = <ProgressFill value={0.6} from={0.2} color="#000" />;
    mount(el);
    expect(r!.root.findAll((n) => typeof n.type === 'string' && style(n).width === '60%')).toHaveLength(1);
  });
});

// ── The plan leaf fills on return to Today ─────────────────────────────
describe('PlanLeaves', () => {
  it('a leaf done while Today was out of view fills when Today comes back, with one light haptic', () => {
    const light = jest.spyOn(haptics.haptic, 'light').mockImplementation(() => false);
    mount(<PlanLeaves done={[true, false]} focused />);
    act(() => r!.update(<PlanLeaves done={[true, true]} focused={false} />));
    expect(light).not.toHaveBeenCalled();
    act(() => r!.update(<PlanLeaves done={[true, true]} focused />));
    expect(light).toHaveBeenCalledTimes(1);
    // The panel swaps to the clearing (a new tree) while Today is out of view: the
    // last leaf still fills when Today comes back.
    light.mockClear();
    act(() => r!.update(<PlanLeaves key="start" done={[true, false]} focused seenKey="cisa:2026-10-11" />));
    act(() => r!.update(<PlanLeaves key="clearing" done={[true, true]} focused={false} seenKey="cisa:2026-10-11" />));
    expect(light).not.toHaveBeenCalled();
    act(() => r!.update(<PlanLeaves key="clearing" done={[true, true]} focused seenKey="cisa:2026-10-11" />));
    expect(light).toHaveBeenCalledTimes(1);
    // Still spoken as a count, never as motion.
    expect(r!.root.findAll((n) => n.props.accessibilityLabel === '2 of 2 done' && typeof n.type === 'string')).toHaveLength(1);
  });
});

// ── Theme fade ─────────────────────────────────────────────────────────
describe('ThemeFade', () => {
  it('draws a veil in the OLD paper in the very commit the theme flips, then lets it fade out', () => {
    jest.useFakeTimers();
    mount(<ThemeFade isDark={false} bg="#F3F1EA" />);
    expect(r!.root.findAll((n) => n.props.testID === 'theme-fade')).toHaveLength(0);
    act(() => r!.update(<ThemeFade isDark bg="#111613" />));
    const veil = r!.root.findAll((n) => n.props.testID === 'theme-fade' && typeof n.type === 'string');
    expect(veil).toHaveLength(1);
    expect(style(veil[0]).backgroundColor).toBe('#F3F1EA');
    expect(veil[0].props.importantForAccessibility).toBe('no-hide-descendants');
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(r!.root.findAll((n) => n.props.testID === 'theme-fade')).toHaveLength(0);
  });
});

// ── Stepper rolls the way you pressed ──────────────────────────────────
describe('Stepper', () => {
  it('rolls one step the way it was pressed, and still speaks one adjustable value', () => {
    setMockReducedMotion(false);
    function Hour() {
      const [h, setH] = useState(7);
      return <Stepper label="Hour" spokenLabel="Reminder hour" value={String(h)} spoken={`${h} PM`} onInc={() => setH(h + 1)} onDec={() => setH(h - 1)} />;
    }
    mount(<Hour />);
    const adj = () => r!.root.find((n) => n.props.accessibilityRole === 'adjustable' && typeof n.type === 'string');
    act(() => adj().props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }));
    expect(adj().props.accessibilityValue).toEqual({ text: '6 PM' });
    act(() => r!.update(<Hour />));
    const col = r!.root.findAll((n) => typeof n.type === 'string' && yOf(style(n)) !== undefined)[0];
    // 7 → 6, rolled down: it rests on the second cycle's 6.
    const pitch = Math.round(typeScale.label.lineHeight! + typeScale.label.fontSize! * ROLL.gap);
    expect(yOf(style(col))! / -pitch).toBe(columnRows(7, 6, -1)[1]);
  });
});
