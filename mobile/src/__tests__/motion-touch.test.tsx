/**
 * Touch and selection (mobile 1.8, DESIGN_SYSTEM.md §8): the components that
 * moved onto the motion primitives. What they must keep:
 * - selecting never reflows a row (the ink ring and fills are layers);
 * - the spoken role and state never change;
 * - Segmented has ONE sliding thumb only when it can slide (measured, side by
 *   side, motion on); stacked at 200% text or under Reduce Motion each
 *   segment cross-fades its own look in place;
 * - quiz segments end filled and the current one marked.
 * See motion.test.tsx for how the shared mock shows end states.
 */
import { cloneElement } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, StyleSheet, View } from 'react-native';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { StateLayer } from '../components/motion';
import { OptionCard } from '../components/quiz';
import { Chip, SegmentBar, Segmented } from '../components/ui';
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

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
/** Re-render with a fresh element, so animated styles show where their animations ended. */
const settle = (el: React.ReactElement) => {
  act(() => {
    r!.update(cloneElement(el));
  });
};
const style = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
const scaleOf = (s: { transform?: Record<string, number>[] }) => s.transform?.find((t) => 'scaleX' in t)?.scaleX;
const xOf = (s: { transform?: Record<string, number>[] }) => s.transform?.find((t) => 'translateX' in t)?.translateX;
const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } });
  });
};

beforeEach(() => {
  setFontScale(1);
  setMockReducedMotion(true);
  useSettings.setState({ motion: 'system', theme: 'light' });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('quiz progress segments', () => {
  it('SegmentBar: done segments filled to full, the current one marked', () => {
    const el = (done: number, current: number) => <SegmentBar total={4} done={done} current={current} />;
    mount(el(1, 1));
    settle(el(2, 2));
    settle(el(2, 2));
    const segs = r!.root.findByProps({ accessibilityRole: 'progressbar' }).findAllByType(View).filter((n) => style(n).flex === 1 && style(n).height === 4);
    expect(segs).toHaveLength(4);
    const fillOf = (seg: ReactTestInstance) => style(seg.findAllByType(View).at(-1)!);
    expect(fillOf(segs[1]).opacity).toBe(1);
    expect(scaleOf(fillOf(segs[1]))).toBe(1);
    expect(fillOf(segs[2]).opacity).toBe(0);
    expect(r!.root.findByProps({ accessibilityRole: 'progressbar' }).props.accessibilityLabel).toBe('Question 3 of 4');
  });
});

describe('Segmented with motion on', () => {
  beforeEach(() => setMockReducedMotion(false));

  it('Segmented: one thumb slides once the track is measured; it sits under the chosen segment', () => {
    const opts = [10, 20, 50].map((n) => ({ value: n, numeral: String(n), label: 'questions' }));
    const el = (v: number) => <Segmented accessibilityLabel="Length" value={v} onChange={() => {}} options={opts} />;
    mount(el(10));
    const group = r!.root.findByProps({ accessibilityRole: 'radiogroup' });
    act(() => {
      group.props.onLayout({ nativeEvent: { layout: { width: 306, height: 50 } } });
    });
    settle(el(50));
    settle(el(50));
    // (306 − 2 × 3 inset − 2 × 3 gap) / 3 = 98 wide; the third segment starts 2 × (98 + 3) in.
    const thumb = r!.root.findAll((n) => typeof n.type !== 'string' && style(n).position === 'absolute' && style(n).width === 98);
    expect(thumb).toHaveLength(1);
    expect(xOf(style(thumb[0]))).toBe(202);
    expect(r!.root.findAll((n) => n.props.accessibilityRole === 'radio' && n.props.accessibilityState?.checked && typeof n.props.onPress === 'function')).toHaveLength(1);
  });

  it('Segmented at 200% text stacks, so there is no thumb to slide: each segment cross-fades', () => {
    setFontScale(2);
    const opts = [10, 20].map((n) => ({ value: n, numeral: String(n), label: 'questions' }));
    const el = <Segmented accessibilityLabel="Length" value={10} onChange={() => {}} options={opts} />;
    mount(el);
    const group = r!.root.findByProps({ accessibilityRole: 'radiogroup' });
    act(() => {
      group.props.onLayout({ nativeEvent: { layout: { width: 306, height: 100 } } });
    });
    settle(el);
    expect(r!.root.findAllByType(StateLayer).map((l) => l.props.on)).toEqual([true, false]);
  });
});

describe('Segmented under Reduce Motion', () => {
  it('has no sliding thumb: the chosen segment cross-fades its own look in place', () => {
    const opts = [10, 20].map((n) => ({ value: n, numeral: String(n), label: 'questions' }));
    const el = <Segmented accessibilityLabel="Length" value={20} onChange={() => {}} options={opts} />;
    mount(el);
    const group = r!.root.findByProps({ accessibilityRole: 'radiogroup' });
    act(() => {
      group.props.onLayout({ nativeEvent: { layout: { width: 306, height: 50 } } });
    });
    settle(el);
    expect(r!.root.findAll((n) => typeof n.type !== 'string' && style(n).position === 'absolute' && typeof style(n).width === 'number')).toHaveLength(0);
    const layers = r!.root.findAllByType(StateLayer);
    expect(layers.map((l) => l.props.on)).toEqual([false, true]);
  });
});

describe('selection layers keep the row still', () => {
  it('OptionCard: selecting adds an ink ring layer; the row’s own border and padding never change', () => {
    const el = (state: 'idle' | 'selected') => <OptionCard letter="B" text="Option text" state={state} onPress={() => {}} />;
    mount(el('idle'));
    const row = () => r!.root.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function')[0];
    const before = style(row());
    settle(el('selected'));
    const after = style(row());
    expect([after.borderWidth, after.paddingVertical, after.paddingHorizontal]).toEqual([before.borderWidth, before.paddingVertical, before.paddingHorizontal]);
    expect(r!.root.findAllByType(StateLayer).map((l) => l.props.on)).toEqual([true, true, true]); // ring, badge fill, badge letter
    expect(row().props.accessibilityState.checked).toBe(true);
  });

  it('Chip: the ink fill is a layer; the spoken state is unchanged', () => {
    mount(<Chip label="All domains" selected onPress={() => {}} />);
    expect(r!.root.findAllByType(StateLayer).map((l) => l.props.on)).toEqual([true]);
    expect(r!.root.findAll((n) => n.props.accessibilityState?.selected === true && typeof n.props.onPress === 'function')).toHaveLength(1);
  });
});
