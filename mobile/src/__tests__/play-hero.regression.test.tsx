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
import { Drills } from '../components/drills';
import Practice from '../app/(tabs)/practice';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import { router } from 'expo-router';
import * as registry from '../engine/games/registry';
import { planText } from '../components/journey';
import { HeroPanel } from '../components/ui';
import { setMockReducedMotion } from '../../jest/reanimated-mock';

// Motion ON (the shared mock defaults to Reduce Motion), so the swaying frond
// (the Android suspect) is rendered.
setMockReducedMotion(false);

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

// Mobile 1.51: the Play tab is gone (its games are Drills, a list inside Practice), so the tab hero checked
// here is Practice's. Premium round 2 (Field Guide foundation): its white seal card became a plate (Fig. 4),
// with the plate button under it; no art shares the plate with the words.
describe('the tab hero renders its content (Android blank-hero regression)', () => {
  const cases: [string, 'light' | 'dark', number][] = [
    ['light', 'light', 1],
    ['dark', 'dark', 1],
    ['light at 200% text', 'light', 2],
  ];
  it.each(cases)('%s: the plate holds its caption, title and text; the Start button follows it', (_name, theme, scale) => {
    useSettings.setState({ theme });
    setFontScale(scale);
    mount(<Practice />);
    const [content] = byTestId('practice-plate');
    expect(content).toBeDefined();
    const text = textOf(content);
    // The figure caption and the path's title are the plate's two headers.
    const header = content.findAll((n) => n.props.accessibilityRole === 'header' && typeof n.type === 'string');
    expect(header.map((h) => h.props.accessibilityLabel ?? textOf(h))).toContain('Your next set');
    expect(header.length).toBe(2);
    expect(text).toMatch(/min/); // the meta carries the honest length
    // The plate is never a button: the Start button sits under it.
    expect(content.findAll((n) => n.props.accessibilityRole === 'button')).toHaveLength(0);
    const start = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === 'Start');
    expect(start).toHaveLength(1);
    expect(byTestId('hero-seal')).toHaveLength(0);
  });

  // Mobile 1.43 (tab header C): Play, Learn and Practice lead with a white seal card. Mobile 1.51 (Field
  // Guide): Today's plan is a plate too; the forest panel with its swaying frond is now only Today's moments
  // (the clearing, "Your readiness is holding"), so the layering checks run on the panel itself.
  it('the forest panel: draws the art in its own clipped layer BELOW the content, with explicit sizes', () => {
    mount(<HeroPanel caption="Today’s clearing" title="Two done" art="frond" />);
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
    // The drawing's slot has an explicit size (no "size from children"). Since mobile 1.21 the
    // panel's top light (one gradient Svg) is drawn first in BOTH themes, so the slot is the last child.
    const slot = art.children[art.children.length - 1] as ReactTestInstance;
    expect(flat(slot)).toMatchObject(botanySize('frond'));
  });

  it('the forest panel: the swaying frond has an explicit size and a pivot in points, not percentages', () => {
    mount(<HeroPanel caption="Today’s clearing" title="Two done" art="frond" />);
    const [art] = byTestId('hero-art');
    const sway = art.findAll((n) => typeof n.type === 'string' && typeof flat(n).transformOrigin === 'string');
    expect(sway.length).toBe(1);
    const s = flat(sway[0]);
    expect(s.transformOrigin).toBe(swayOrigin('frond'));
    expect(String(s.transformOrigin)).not.toContain('%');
    expect(s).toMatchObject(botanySize('frond'));
  });

  it('Practice: a plate, no seal and no forest art layer (premium round 2, Field Guide foundation); Drills adds no second hero', () => {
    mount(<Practice />);
    expect(byTestId('hero-art')).toHaveLength(0);
    expect(byTestId('hero-seal')).toHaveLength(0);
    expect(byTestId('practice-plate')).toHaveLength(1);
    const [content] = byTestId('practice-plate');
    // Build E: the plate shows the learner's study path (a new learner: Random, 10 questions).
    // Mobile 1.21: the title names the path ("A mixed set"); the count is the meta.
    expect(textOf(content)).toContain('A mixed set');
    expect(textOf(content)).toContain('10 questions · ');
  });

  it('the plate has no shadow; Grove: one rounded card with a 1pt edge (the white shadowed card is retired)', () => {
    mount(<Practice />);
    const [plateEl] = byTestId('practice-plate');
    expect(flat(plateEl).boxShadow).toBeUndefined();
    expect(flat(plateEl).borderRadius).toBe(24);
    expect(flat(plateEl).borderWidth).toBe(1);
  });
});

describe('Settings in the headers (Grove: on You only)', () => {
  it('Today has no Settings gear (Settings is on You; the exam date is the hero tile)', () => {
    mount(<Today />);
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Settings' && typeof n.props.onPress === 'function')).toHaveLength(0);
  });

  it('You: one 44pt rounded-square button spoken "Settings", 48pt to the finger, opens Settings', () => {
    (router.push as jest.Mock).mockClear();
    mount(<You />);
    const host = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Settings' && n.props.accessibilityRole === 'button');
    expect(host).toHaveLength(1);
    const style = flat(host[0]);
    expect(style).toMatchObject({ width: 44, height: 44, borderRadius: 14, borderWidth: 1 });
    expect(host[0].props.accessibilityHint).toBe('Exam date, reminders and more');
    const gear = root().findAll((n) => n.props.accessibilityLabel === 'Settings' && typeof n.props.onPress === 'function');
    expect(gear[0].props.hitSlop).toBe(2);
    act(() => {
      gear[0].props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('You shows the review queue with the same word as Today and Practice', () => {
    mount(<You />);
    const row = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Questions to revisit'));
    expect(row.length).toBeGreaterThan(0);
  });

  it('You reaches Settings through the gear only (no duplicate Study tools row)', () => {
    mount(<You />);
    expect(root().findAll((n) => n.props.title === 'Settings').length).toBe(0);
  });
});

describe('Drills when no game is playable for this exam', () => {
  it('one calm line, no game, no numbers (Practice is right there: Drills is a section of it, mobile 1.51)', () => {
    const spy = jest.spyOn(registry, 'isPlayable').mockReturnValue(false);
    (router.push as jest.Mock).mockClear();
    mount(<Drills />);
    expect(textOf(root())).toContain('Drills arrive once this exam has enough practice questions for them.');
    expect(byTestId('drills-list')).toHaveLength(0);
    expect(textOf(root())).not.toMatch(/\d+ (questions|more)/);
    expect(router.push).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("Today's review card: the 'N today' line only when more are due than today takes", () => {
  it('all of them today says "questions to revisit"; part of the queue says "N today, oldest first" (mobile 1.15 C7; 1.49 wording)', () => {
    expect(planText({ kind: 'review', count: 20 }).meta).toBe('About 24 min · questions to revisit');
    expect(planText({ kind: 'review', count: 20, capped: true, due: 55 }).meta).toBe('About 24 min · 20 today, oldest first');
    expect(planText({ kind: 'review', count: 8 }, 55).meta).toBe('About 10 min · 8 today, oldest first');
    expect(planText({ kind: 'review', count: 20 }).title).toBe('Questions to revisit');
  });

  it('capped: the title never shows the queue total (premium pass 1.4, mobile 1.49)', () => {
    expect(planText({ kind: 'review', count: 20, capped: true, due: 55 }).title).toBe('Questions to revisit'); // 1.49: never the queue total
    // A plan saved before 1.8 has no `due`: the same plain title.
    expect(planText({ kind: 'review', count: 20, capped: true }).title).toBe('Questions to revisit');
  });
});

// A forest hero with art and a meta line, as the Play tab's featured game was (mobile 1.51: that tab is gone;
// premium round 2: the white seal variant is retired, the HeroPanel rule stays for the forest panel).
const SEAL_HERO = <HeroPanel caption="Beating distractors · 6 min" title="Snare Spotter" meta="Find the answer built to fool you." art="frond" />;

describe('hero meta line keeps clear of the art', () => {
  const metaOf = () => {
    const [content] = byTestId('hero-content');
    // The second text under the title: the meta line (onForest2), not the caption or title.
    const texts = content.findAll((n) => typeof n.type === 'string' && typeof n.children[0] === 'string' && /Find the answer built to fool you/.test(n.children.join('')));
    return StyleSheet.flatten(texts[0].props.style);
  };
  it('at normal text it wraps inside 250pt, like the title', () => {
    setFontScale(1);
    mount(SEAL_HERO);
    expect(metaOf().maxWidth).toBe(250);
  });
  it('at large text it runs full width', () => {
    setFontScale(2);
    mount(SEAL_HERO);
    expect(metaOf().maxWidth).toBeUndefined();
  });
});
