/**
 * Premium motion, round 2 (DESIGN_SYSTEM.md §8 and §21):
 *  - 3a: after an answer, the vine's words arrive in reading order (after the rows above them),
 *    never at the tap before them;
 *  - #5: the splash dissolves into the app (tokens, never a raw duration);
 *  - the tab dot pops from .6, never from nothing;
 *  - #1: the readiness ruler never moves; the estimate slides from the range last seen, opens from
 *    its centre on the day's first view, and never moves on a fall;
 *  - #2: in a growth, only the stems that grew move, from where they stood; spoken labels are the
 *    same in every mode.
 * The Reanimated mock lands every animation at once, so the start values are pinned through the
 * pure helpers and the screens through their end states.
 */
import fs from 'fs';
import path from 'path';
import { Dimensions } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { estimateMotion, growingStems, growthDrop, ScaleBar, scaleSpoken, StemChart, type Stem } from '../components/fieldguide';
import { SPLASH_FADE, type Growth } from '../components/motion';
import { FEEDBACK_DELAY } from '../components/quiz';
import { TAB_DOT_FROM, TabLabel } from '../components/ui';
import { getAllQuestions } from '../content/loader';
import { startFromIds } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { motion } from '../theme/tokens';
import SessionScreen from '../app/session';

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
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const byTestId = (id: string) => root().findAll((n) => typeof n.type === 'string' && n.props.testID === id);
const labels = () =>
  root()
    .findAll((n) => typeof n.type === 'string' && n.props.accessible === true && typeof n.props.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel as string);
const atScale = (fontScale: number, run: () => void) => {
  const w = Dimensions.get('window');
  act(() => Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } }));
  try {
    run();
  } finally {
    act(() => Dimensions.set({ window: { ...w, fontScale: w.fontScale }, screen: { ...w, fontScale: w.fontScale } }));
  }
};
const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean).map((s) => flat(s))) : ((style as Record<string, unknown>) ?? {});
const transformOf = (n: ReactTestInstance) => (flat(n.props.style).transform as Record<string, number>[] | undefined) ?? [];
/** Lay out every view that measures itself at this width. */
const layout = (width: number) =>
  act(() => {
    for (const n of root().findAll((x) => typeof x.type === 'string' && typeof x.props.onLayout === 'function')) n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 52 } } });
  });

afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  setMockReducedMotion(true);
});

// ── #1 the scale bar ───────────────────────────────────────────────────
const X = (p: number) => 8 + (318 * p) / 100;
const RANGE = { enough: true as const, answered: 120, low: 68, high: 78, centre: 73 };
const grow = (from: number[], since: boolean): Growth => ({ play: true, from, run: 1, since });

describe('estimateMotion (#1)', () => {
  it('a rise since the last look slides from the range last seen (offsets and widths from it)', () => {
    const m = estimateMotion(RANGE, grow([60, 72], true), false, X);
    expect(m.mode).toBe('since');
    if (m.mode !== 'since') return;
    expect(m.dxLow).toBeCloseTo(X(60) - X(68));
    expect(m.dxHigh).toBeCloseTo(X(72) - X(78));
    expect(m.band).toBeCloseTo((X(72) - X(60)) / (X(78) - X(68)));
    expect(m.line).toBeCloseTo((X(72) - X(60) + 2) / (X(78) - X(68) + 2));
  });

  it('the day\'s first view opens in place; Reduce Motion, nothing new or a fall: still', () => {
    expect(estimateMotion(RANGE, grow([0, 0], false), false, X).mode).toBe('open');
    expect(estimateMotion(RANGE, grow([0, 0], false), true, X).mode).toBe('still');
    expect(estimateMotion(RANGE, { play: false, from: [68, 78], run: 0 }, false, X).mode).toBe('still');
    expect(estimateMotion(RANGE, undefined, false, X).mode).toBe('still');
    // A start above now is a loss: it never animates.
    expect(estimateMotion(RANGE, grow([70, 80], true), false, X).mode).toBe('still');
    expect(estimateMotion(RANGE, grow([68, 78], true), false, X).mode).toBe('still');
  });
});

describe('ScaleBar motion (#1)', () => {
  it.each([
    ['reduced', true, grow([60, 72], true)],
    ['a rise, motion on', false, grow([60, 72], true)],
    ['the day\'s first view, motion on', false, grow([0, 0], false)],
  ])('%s: the ruler never moves, the estimate ends in place, the words are the same', (_name, reduced, growth) => {
    setMockReducedMotion(reduced);
    act(() => {
      r = create(<ScaleBar range={RANGE} growth={growth} />);
    });
    layout(340);
    const ruler = byTestId('scale-ruler');
    expect(ruler).toHaveLength(1);
    expect(transformOf(ruler[0])).toEqual([]);
    for (const id of ['scale-band', 'scale-bracket']) {
      const n = byTestId(id)[0];
      for (const t of transformOf(n)) {
        if ('translateX' in t) expect(t.translateX).toBeCloseTo(0);
        if ('scaleX' in t) expect(t.scaleX).toBeCloseTo(1);
      }
      expect(flat(n.props.style).opacity ?? 1).toBe(1);
    }
    expect(labels()).toContain(scaleSpoken(RANGE));
  });
});

// ── #2 the stem chart ──────────────────────────────────────────────────
const STEMS: Stem[] = [
  { key: '1', name: 'IS Audit', pct: 84, answered: 60, word: 'Strong', below: false, thin: false, spoken: 'IS Audit: Strong, 84 percent' },
  { key: '2', name: 'IT Governance', pct: 74, answered: 44, word: 'Steady', below: false, thin: false, down: 2, spoken: 'IT Governance: Steady, 74 percent' },
  { key: '3', name: 'IS Acquisition', pct: null, answered: 18, word: 'Building', below: true, thin: true, spoken: 'IS Acquisition: too few yet' },
  { key: '4', name: 'IS Operations', pct: 61, answered: 70, word: 'Building', below: true, thin: false, up: 3, spoken: 'IS Operations: Building, 61 percent' },
];

describe('growingStems and growthDrop (#2)', () => {
  it('only a measured stem that rose grows; the drop is the height it grew', () => {
    expect(growingStems(STEMS)).toEqual(['4']);
    const y = (p: number) => 190 - (p / 100) * 150;
    expect(growthDrop(STEMS[3], y)).toBeCloseTo(y(58) - y(61));
    expect(growthDrop(STEMS[0], y)).toBe(0);
    expect(growthDrop(STEMS[2], y)).toBe(0);
  });
});

describe('StemChart growth (#2)', () => {
  const render = (play: Parameters<typeof StemChart>[0]['play']) => {
    act(() => {
      r = create(<StemChart stems={STEMS} play={play} />);
    });
    layout(340);
  };

  it('motion on: only the stem that grew moves, and it ends at its tip with "↑3"', () => atScale(1, () => {
    setMockReducedMotion(false);
    render('growth');
    expect(byTestId('area-growth-4')).toHaveLength(1);
    expect(byTestId('area-growth-1')).toHaveLength(0);
    expect(byTestId('area-growth-2')).toHaveLength(0); // a drop never animates
    const num = byTestId('area-number-4')[0];
    for (const t of transformOf(num)) if ('translateY' in t) expect(t.translateY).toBeCloseTo(0);
    const text = JSON.stringify(r!.toJSON());
    expect(text).toContain('↑3');
    expect(text).toContain('↓2');
  }));

  it('every mode says the same thing, one stop per area', () => atScale(1, () => {
    const want = STEMS.map((s) => s.spoken);
    for (const [reduced, play] of [[true, 'growth'], [false, 'growth'], [false, 'trace'], [false, false]] as const) {
      setMockReducedMotion(reduced);
      render(play);
      expect(labels()).toEqual(want);
      act(() => r?.unmount());
      r = undefined;
    }
  }));

  it('Reduce Motion: the finished plate, no growing parts', () => atScale(1, () => {
    render('growth');
    expect(byTestId('stem-list')).toHaveLength(0);
    expect(byTestId('area-growth-4')).toHaveLength(0);
    expect(JSON.stringify(r!.toJSON())).toContain('↑3');
  }));
});

// ── the tab dot ────────────────────────────────────────────────────────
describe('tab dot', () => {
  it('pops from .6, never from nothing', () => {
    setMockReducedMotion(false);
    act(() => {
      r = create(<TabLabel label="Learn" focused={false} />);
    });
    const dot = root().findAll((n) => typeof n.type === 'string' && transformOf(n).some((t) => 'scale' in t))[0];
    expect(TAB_DOT_FROM).toBe(0.6);
    expect(transformOf(dot).find((t) => 'scale' in t)!.scale).toBeCloseTo(TAB_DOT_FROM);
  });
});

// ── #5 the launch ──────────────────────────────────────────────────────
describe('launch dissolve (#5)', () => {
  it('the splash fades over a token, set at the root before it hides', () => {
    expect(SPLASH_FADE).toEqual({ fade: true, duration: motion.dur.enter });
    const src = fs.readFileSync(path.join(__dirname, '../app/_layout.tsx'), 'utf8');
    expect(src).toContain('SplashScreen.setOptions(SPLASH_FADE)');
    expect(src.indexOf('SplashScreen.setOptions(SPLASH_FADE)')).toBeLessThan(src.indexOf('SplashScreen.hideAsync'));
  });
});

// ── 3a the vine in reading order ───────────────────────────────────────
describe('after an answer, the vine arrives in reading order (3a)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useProgress.getState().resetCert('cisa');
    useSession.getState().clear();
  });
  afterEach(() => {
    act(() => r?.unmount());
    r = undefined;
    jest.useRealTimers();
  });

  /** The entrance delay that brings a node in (the nearest Rise/FadeIn above it). */
  const entranceDelay = (n: ReactTestInstance): number => {
    for (let p: ReactTestInstance | null = n.parent; p; p = p.parent) {
      const name = typeof p.type === 'function' ? p.type.name : '';
      if (name === 'Rise' || name === 'FadeIn') return (p.props.delay as number) ?? 0;
    }
    return -1;
  };

  it.each([['a miss', false], ['a right answer', true]])('%s: the vine comes in after the rows above it', (_name, right) => {
    const qs = getAllQuestions('cisa').filter((q) => q.keyConcept).slice(0, 2);
    startFromIds('cisa', qs.map((q) => q.id), 'T');
    act(() => {
      r = create(<SessionScreen />);
    });
    const q = qs[0];
    const cards = root().findAll((n) => n.props.letter && typeof n.props.onPress === 'function' && typeof n.props.text === 'string');
    const target = cards.find((c) => (c.props.text === q.options[q.correct]) === right)!;
    act(() => { target.props.onPress(); });
    const check = root().findAll((n) => n.props.label === 'Check answer' && typeof n.props.onPress === 'function')[0];
    act(() => { check.props.onPress(); });
    const vine = byTestId('feedback-vine');
    expect(vine).toHaveLength(1);
    // Never at the tap: at least the rows' delay, and after the Why on a right answer.
    expect(entranceDelay(vine[0])).toBeGreaterThanOrEqual(right ? FEEDBACK_DELAY.why + motion.stagger.group : FEEDBACK_DELAY.why);
    expect(entranceDelay(vine[0])).toBeGreaterThan(FEEDBACK_DELAY.rows);
  });
});
