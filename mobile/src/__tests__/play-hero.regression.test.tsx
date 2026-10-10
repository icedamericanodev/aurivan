/**
 * Regression: on Android the Play tab's featured hero showed as an empty
 * green block (title, text and button missing). See HeroPanel in
 * components/ui.tsx for the fix:
 *  - the botanical art sits in its OWN absolutely-filled layer that does the
 *    rounded clipping, inside a box of explicit size;
 *  - the panel itself no longer clips (`overflow: hidden`), so the text never
 *    shares a clipping parent with the rotating (swaying) SVG;
 *  - the text/button layer has zIndex 1, so it is always drawn above the art;
 *  - the sway pivot is in points, not percentages, so it never depends on a
 *    measured size.
 * react-test-renderer cannot draw pixels, so this test pins the structure
 * that keeps the content visible, plus the content itself, in light, dark
 * and at 200% text.
 *
 * Also here (same tab-screen setup): the Settings gear in the Today and You
 * headers (S1).
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, StyleSheet } from 'react-native';
import { swayOrigin, botanySize } from '../components/glyphs';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import Play from '../app/(tabs)/play';
import Practice from '../app/(tabs)/practice';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import { router } from 'expo-router';
import * as registry from '../engine/games/registry';
import { planText } from '../components/journey';

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
    // Motion ON, so the swaying frond (the Android suspect) is rendered.
    useReducedMotion: () => false,
    useSharedValue: (v: unknown) => ({ value: v, set: () => {} }),
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
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
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const byTestId = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const flat = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
/** The nearest host (native) ancestor of `n` that passes `ok`. */
const hostAncestor = (n: ReactTestInstance, ok: (x: ReactTestInstance) => boolean): ReactTestInstance => {
  let p = n.parent;
  while (p && !(typeof p.type === 'string' && ok(p))) p = p.parent;
  if (!p) throw new Error('no matching ancestor');
  return p;
};
const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } });
  });
};

beforeEach(() => {
  setFontScale(1);
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa' });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('Play hero renders its content (Android blank-hero regression)', () => {
  const cases: [string, 'light' | 'dark', number][] = [
    ['light', 'light', 1],
    ['dark', 'dark', 1],
    ['light at 200% text', 'light', 2],
  ];
  it.each(cases)('%s: caption, title, text and the Play button are inside the hero', (_name, theme, scale) => {
    useSettings.setState({ theme });
    setFontScale(scale);
    mount(<Play />);
    const [content] = byTestId('hero-content');
    expect(content).toBeDefined();
    const text = textOf(content);
    // The featured game's title, its one-line text and the button label.
    const header = content.findAll((n) => n.props.accessibilityRole === 'header' && typeof n.type === 'string');
    expect(header.length).toBe(1);
    expect(textOf(header[0]).length).toBeGreaterThan(3);
    expect(text).toMatch(/min/); // the caption carries the honest length
    const button = content.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
    expect(button.length).toBe(1);
    expect(textOf(button[0])).toBe('Play');
  });

  it('draws the art in its own clipped layer BELOW the content, with explicit sizes', () => {
    mount(<Play />);
    const [art] = byTestId('hero-art');
    const [content] = byTestId('hero-content');
    // Art layer: absolute fill, does its own rounded clipping, never takes touches.
    const a = flat(art);
    expect(a.position).toBe('absolute');
    expect(a.overflow).toBe('hidden');
    expect(a.borderRadius).toBeGreaterThan(0);
    expect(a.pointerEvents).toBe('none');
    // Content layer is drawn above it.
    expect(Number(flat(content).zIndex)).toBeGreaterThan(Number(a.zIndex ?? 0));
    // Same panel, art first: content wins the draw order on every platform.
    // (Compare booleans/numbers, never tree nodes: a failing node diff is huge.)
    const panel = hostAncestor(art, (n) => n.findAll((x) => x === content).length > 0);
    const kids = panel.findAll((n) => n === art || n === content);
    expect(kids.length === 2 && kids[0] === art).toBe(true);
    // The panel itself no longer clips its children.
    expect(flat(panel).overflow === 'hidden').toBe(false);
    // The drawing's slot has an explicit size (no "size from children").
    const slot = art.children[0] as ReactTestInstance;
    expect(flat(slot)).toMatchObject(botanySize('frond'));
  });

  it('the swaying frond has an explicit size and a pivot in points, not percentages', () => {
    mount(<Play />);
    const [art] = byTestId('hero-art');
    const sway = art.findAll((n) => typeof n.type === 'string' && typeof flat(n).transformOrigin === 'string');
    expect(sway.length).toBe(1);
    const s = flat(sway[0]);
    expect(s.transformOrigin).toBe(swayOrigin('frond'));
    expect(String(s.transformOrigin)).not.toContain('%');
    expect(s).toMatchObject(botanySize('frond'));
  });

  it('Practice (frond2, the hero that always worked) uses the same layering', () => {
    mount(<Practice />);
    expect(byTestId('hero-art')).toHaveLength(1);
    const [content] = byTestId('hero-content');
    expect(textOf(content)).toContain('Ten mixed questions');
  });
});

describe('Settings gear in the Today and You headers', () => {
  it.each([
    ['Today', Today],
    ['You', You],
  ] as const)('%s: a 48pt button spoken as "Settings" opens Settings', (_name, Screen) => {
    (router.push as jest.Mock).mockClear();
    mount(<Screen />);
    const gear = root().findAll((n) => n.props.accessibilityLabel === 'Settings' && n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
    expect(gear.length).toBe(1);
    const style = StyleSheet.flatten(typeof gear[0].props.style === 'function' ? gear[0].props.style({ pressed: false }) : gear[0].props.style);
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
    act(() => {
      gear[0].props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('You shows the review queue with the same word as Today and Practice', () => {
    mount(<You />);
    const row = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Spaced review'));
    expect(row.length).toBeGreaterThan(0);
  });

  it('You keeps its Settings row too', () => {
    mount(<You />);
    expect(root().findAll((n) => n.props.title === 'Settings').length).toBeGreaterThan(0);
  });
});

describe('Play when no game is playable for this exam', () => {
  it('shows a calm empty state with a way to Practice, and no game or numbers', () => {
    const spy = jest.spyOn(registry, 'isPlayable').mockReturnValue(false);
    (router.push as jest.Mock).mockClear();
    mount(<Play />);
    expect(textOf(root())).toContain('Games are on the way');
    expect(byTestId('hero-content')).toHaveLength(0);
    expect(textOf(root())).not.toMatch(/\d+ (questions|more)/);
    const go = root().findAll((n) => n.props.accessibilityLabel === 'Go to Practice' && typeof n.props.onPress === 'function')[0];
    act(() => {
      go.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/practice');
    spy.mockRestore();
  });
});

describe("Today's review card: the cap line only when more than 20 are due", () => {
  it('exactly 20 (fits one session) says "questions to revisit"; capped says reviews come 20 at a time', () => {
    expect(planText({ kind: 'review', count: 20 }).meta).toBe('About 24 minutes · questions to revisit');
    expect(planText({ kind: 'review', count: 20, capped: true }).meta).toBe('About 24 minutes · reviews come 20 at a time');
    expect(planText({ kind: 'review', count: 20 }).title).toBe('Review 20 due');
  });
});

describe('hero meta line keeps clear of the art', () => {
  const metaOf = () => {
    const [content] = byTestId('hero-content');
    // The second text under the title: the meta line (onForest2), not the caption or title.
    const texts = content.findAll((n) => typeof n.type === 'string' && typeof n.children[0] === 'string' && /Find the answer built to fool you/.test(n.children.join('')));
    return StyleSheet.flatten(texts[0].props.style);
  };
  it('at normal text it wraps inside 250pt, like the title', () => {
    setFontScale(1);
    mount(<Play />);
    expect(metaOf().maxWidth).toBe(250);
  });
  it('at large text it runs full width', () => {
    setFontScale(2);
    mount(<Play />);
    expect(metaOf().maxWidth).toBeUndefined();
  });
});
