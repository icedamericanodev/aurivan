/**
 * Grove Phase 1 on the phone: the tokens, the shared shapes and the floating tab bar.
 *
 * Plain English for the founder:
 * - The Grove colours and corners exist in light and dark, with the kit's values, and the
 *   text on the forest hero and the tab bar passes WCAG AA.
 * - A plate is now one rounded card with a single hairline edge; buttons are 54 tall with
 *   16pt corners; small labels are 16pt tiles; row icons sit in 36pt rounded squares.
 * - The tab bar floats: four tabs, each with its word, the current one with a pill behind its
 *   icon that has a visible outline in dark mode and with the phone's high contrast setting.
 *   Every tab is a "tab" to a screen reader, at least 48pt tall, and the bar hides while
 *   the keyboard is up. Tab screens pad their end so nothing hides behind the bar.
 * - You has one 44pt Settings button (a cog in a rounded square), Today has none.
 */
import { AccessibilityInfo, Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { EmptyPlate, EMPTY_PLATE_TITLE, figLine, figSpoken, Plate, RunningHead, SpecimenLabel, SpecimenRow } from '../components/fieldguide';
import { FloatingTabBar, navLiftFor, pillEdge, TAB_BAR, tabBarBottom, tabBarSpace, TabSpaceContext } from '../components/tabBar';
import { Button, gradientLine, groveCard, groveTile, ICON_BADGE, IconCircle, Screen } from '../components/ui';
import { SettingsCard } from '../components/settings';
import { groveDark, groveLight, grovePlate, groveRadius, heroInk, heroInset, heroPanel, navShadow } from '../theme/grove';
import { dark, light } from '../theme/tokens';
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
jest.mock('react-native-safe-area-context', () => {
  const { View: V } = jest.requireActual('react-native');
  return { SafeAreaView: V, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const flat = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const byTestId = (id: string) => root().findAll((n) => typeof n.type === 'string' && n.props.testID === id);

afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  setMockReducedMotion(false);
  useSettings.setState({ theme: 'light' });
});

// ── Contrast (WCAG 2.x) ────────────────────────────────────────────────
const lum = (hex: string) => {
  const [r1, g1, b1] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
/** An rgba() over a hex, as one hex. */
const over = (rgba: string, bg: string) => {
  const [rr, gg, bb, al] = rgba.match(/[\d.]+/g)!.map(Number);
  const b = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
  return `#${[rr, gg, bb].map((v, i) => Math.round(al * v + (1 - al) * b[i]).toString(16).padStart(2, '0')).join('')}`;
};
const HEX = /^#[0-9A-F]{6}$/;

describe('Grove tokens (theme/grove.ts)', () => {
  it('the five new colours exist in both themes, as hex, with the kit values', () => {
    expect(groveLight).toEqual({ navFloat: '#FFFFFF', seed: '#8A6A48', seedEdge: '#5B4B3C', soil: '#A89B83', leafEmpty: '#CDC9BC' });
    expect(groveDark).toEqual({ navFloat: '#1A231D', seed: '#8A6A48', seedEdge: '#E9D9C4', soil: '#6B5844', leafEmpty: '#39443C' });
    for (const v of [...Object.values(groveLight), ...Object.values(groveDark)]) expect(v).toMatch(HEX);
  });

  it('the corners and measures: card 24, tile 16, badge 11, step 9, square 14, bar 22; buttons 54 by 16', () => {
    expect(groveRadius).toEqual({ card: 24, tile: 16, badge: 11, step: 9, square: 14, bar: 22 });
    expect(grovePlate).toEqual({ edge: 1, pad: 16, padTight: 4, labelRadius: 16, button: 54, buttonRadius: 16 });
  });

  it('the hero gradient: dark is the kit 165 degrees to 70%, light keeps the forest panel', () => {
    expect(heroPanel.dark).toEqual({ from: '#24452F', to: '#1A3324', toAt: 0.7, angle: 165 });
    expect(heroPanel.light).toEqual({ from: light.forestTop, to: light.forest, toAt: 1, angle: 180 });
    expect(gradientLine(180)).toEqual({ x1: 0.5, y1: 0, x2: 0.5, y2: 1 });
    const g = gradientLine(165);
    expect(g.x1).toBeCloseTo(0.371, 3);
    expect(g.y1).toBeCloseTo(0.017, 3);
    expect(g.x2).toBeCloseTo(0.629, 3);
    expect(g.y2).toBeCloseTo(0.983, 3);
  });

  it('text on the hero passes AA at both ends of the gradient, in both themes', () => {
    for (const [p, g] of [
      [light, heroPanel.light],
      [dark, heroPanel.dark],
    ] as const) {
      for (const stop of [g.from, g.to]) {
        expect(ratio(p.onForest, stop)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(p.onForest2, stop)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(p.sap, stop)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('the hero inset keeps its text at AA (light differs from the kit: white at 12% failed)', () => {
    for (const [p, g, inset] of [
      [light, heroPanel.light, heroInset.light],
      [dark, heroPanel.dark, heroInset.dark],
    ] as const) {
      const tile = over(inset, g.from);
      expect(ratio(p.onForest2, tile)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.sap, tile)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.onForest, tile)).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio(light.onForest2, over('rgba(255,255,255,0.12)', heroPanel.light.from))).toBeLessThan(4.5);
  });

  it('the tab bar: inactive icons 3:1, the current word AA, the dark pill gets an outline of 3:1 or more', () => {
    expect(ratio(light.muted, groveLight.navFloat)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(dark.muted, groveDark.navFloat)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(light.ink, groveLight.navFloat)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(dark.ink, groveDark.navFloat)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(light.sap, light.forestTrack)).toBeGreaterThanOrEqual(3);
    expect(ratio(dark.sap, dark.forestTrack)).toBeGreaterThanOrEqual(3);
    // The dark pill alone is under 3:1 on the bar: its sap outline is what marks it.
    expect(ratio(dark.forestTrack, groveDark.navFloat)).toBeLessThan(3);
    expect(ratio(dark.sap, groveDark.navFloat)).toBeGreaterThanOrEqual(3);
    expect(ratio(light.forestTrack, groveLight.navFloat)).toBeGreaterThanOrEqual(3);
  });

  it('seed dots on the hero: the unanswered outline is 3:1 or more on the panel in both themes', () => {
    for (const [ink, g] of [
      [heroInk.light, heroPanel.light],
      [heroInk.dark, heroPanel.dark],
    ] as const) {
      for (const stop of [g.from, g.to]) {
        expect(ratio(ink.dotEdge, stop)).toBeGreaterThanOrEqual(3);
        expect(ratio(ink.tickOn, stop)).toBeGreaterThanOrEqual(3);
        expect(ratio(ink.mark, stop)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('the bar lift: a boxShadow, or elevation on Android 7 and 8', () => {
    expect(navLiftFor('android', 27, true)).toEqual({ elevation: 8 });
    expect(navLiftFor('android', 34, true)).toEqual({ boxShadow: navShadow.dark });
    expect(navLiftFor('ios', '18.0', false)).toEqual({ boxShadow: navShadow.light });
  });
});

// ── The floating tab bar ───────────────────────────────────────────────
const ROUTES = ['home', 'learn', 'practice', 'you'];
const TITLES = ['Today', 'Learn', 'Practice', 'You'];
function barProps(index: number, opts: { youLabel?: string; prevent?: boolean } = {}) {
  const emit = jest.fn(() => ({ defaultPrevented: Boolean(opts.prevent) }));
  const navigateToTab = jest.fn();
  const routes = ROUTES.map((name) => ({ key: `${name}-k`, name }));
  const descriptors = Object.fromEntries(
    routes.map((rt, i) => [
      rt.key,
      {
        options: {
          title: TITLES[i],
          tabBarIcon: ({ color }: { color: string }) => <View testID={`icon-${rt.name}`} accessibilityLabel={color} />,
          ...(rt.name === 'you' && opts.youLabel ? { tabBarAccessibilityLabel: opts.youLabel } : {}),
        },
      },
    ]),
  );
  const props = { state: { index, routes }, descriptors, emitter: { emit }, navigateToTab, insets: { top: 0, bottom: 34, left: 0, right: 0 } };
  return { props: props as unknown as React.ComponentProps<typeof FloatingTabBar>, emit, navigateToTab };
}
const tabs = () => root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'tab');
/** Each tab's pressable (the outermost element with its press handler), in order. */
const pressables = () => {
  const seen = new Set<string>();
  return root()
    .findAll((n) => typeof n.props.onPress === 'function' && /^tab-/.test(String(n.props.testID)))
    .filter((n) => (seen.has(n.props.testID) ? false : (seen.add(n.props.testID), true)));
};

describe('the floating tab bar', () => {
  it('one tablist, four tabs in order, each with its word; only the current one is selected', () => {
    mount(<FloatingTabBar {...barProps(2).props} />);
    expect(root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'tablist')).toHaveLength(1);
    const t = tabs();
    expect(t.map((x) => x.props.accessibilityLabel)).toEqual(TITLES);
    expect(t.map((x) => x.props.accessibilityState?.selected)).toEqual([false, false, true, false]);
    // The web export's aria-selected (the smoke walk reads it), on each tab's pressable.
    const aria = root().findAll((n) => typeof n.props['aria-selected'] === 'boolean' && /^tab-/.test(String(n.props.testID)));
    const firstPer = [...new Map(aria.map((n) => [n.props.testID, n.props['aria-selected']])).values()];
    expect(firstPer).toEqual([false, false, true, false]);
    // Owner decision: a word under EVERY icon, not only the current one.
    expect(t.map((x) => textOf(x).trim())).toEqual(TITLES);
    // The position ("3 of 4") is never written into the spoken name.
    for (const x of t) expect(String(x.props.accessibilityLabel)).not.toMatch(/\d of \d/);
  });

  it('the You tab keeps its "new badge" name', () => {
    mount(<FloatingTabBar {...barProps(0, { youLabel: 'You, new badge' }).props} />);
    expect(tabs()[3].props.accessibilityLabel).toBe('You, new badge');
  });

  it('a press emits tabPress and moves; the current tab never moves; a prevented press stays; long press emits', () => {
    const a = barProps(0);
    mount(<FloatingTabBar {...a.props} />);
    act(() => pressables()[1].props.onPress());
    expect(a.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'learn-k', canPreventDefault: true });
    expect(a.navigateToTab).toHaveBeenCalledWith('learn-k');
    a.navigateToTab.mockClear();
    act(() => pressables()[0].props.onPress());
    expect(a.navigateToTab).not.toHaveBeenCalled();
    act(() => pressables()[3].props.onLongPress());
    expect(a.emit).toHaveBeenCalledWith({ type: 'tabLongPress', target: 'you-k' });
    act(() => r!.unmount());
    const b = barProps(0, { prevent: true });
    mount(<FloatingTabBar {...b.props} />);
    act(() => pressables()[2].props.onPress());
    expect(b.navigateToTab).not.toHaveBeenCalled();
  });

  it('every tab is 48pt or taller, shares the width, and carries the Large Content Viewer', () => {
    mount(<FloatingTabBar {...barProps(1).props} />);
    for (const t of tabs()) {
      const s = flat(t);
      expect(s.minHeight).toBeGreaterThanOrEqual(48);
      expect(s.flex).toBe(1);
      expect(t.props.accessibilityShowsLargeContentViewer).toBe(true);
    }
    expect(tabs()[1].props.accessibilityLargeContentTitle).toBe('Learn');
    // Words are capped at x1.2, like every tab label.
    const words = root().findAll((n) => n.type === Text && TITLES.includes(textOf(n).trim()));
    expect(words.length).toBe(4);
    for (const w of words) expect(w.props.maxFontSizeMultiplier).toBe(1.2);
  });

  it('floats: 16pt in from the sides, 8pt above a home indicator (16 with none), taps between tabs reach the page', () => {
    mount(<FloatingTabBar {...barProps(0).props} />);
    const wrap = root().findAll((n) => typeof n.type === 'string' && n.props.pointerEvents === 'box-none')[0];
    expect(flat(wrap)).toMatchObject({ position: 'absolute', left: 16, right: 16, bottom: 42 });
    expect([0, 24, 34, 48].map(tabBarBottom)).toEqual([16, 32, 42, 56]);
    expect([0, 24, 34, 48].map((i) => tabBarSpace(i))).toEqual([80, 96, 106, 120]);
    expect(tabBarSpace(34, 70)).toBe(112);
    const bar = byTestId('tab-bar')[0];
    expect(flat(bar)).toMatchObject({ minHeight: TAB_BAR.height, borderRadius: 22, borderWidth: 1, backgroundColor: groveLight.navFloat, borderColor: light.line });
  });

  it('the current pill: no outline in light, a sap outline in dark, an ink outline with high contrast in light', () => {
    expect(pillEdge(false, false, light)).toBe('transparent');
    expect(pillEdge(true, false, dark)).toBe(dark.sap);
    expect(pillEdge(true, true, dark)).toBe(dark.sap);
    expect(pillEdge(false, true, light)).toBe(light.ink);
    useSettings.setState({ theme: 'dark' });
    mount(<FloatingTabBar {...barProps(3).props} />);
    const pills = byTestId('tab-pill');
    expect(pills).toHaveLength(1);
    expect(flat(pills[0])).toMatchObject({ backgroundColor: dark.forestTrack, borderColor: dark.sap, borderWidth: 1.5 });
  });

  it('high contrast on (Android): the light pill gets its outline too', async () => {
    const was = Platform.OS;
    const read = AccessibilityInfo.isHighTextContrastEnabled;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    AccessibilityInfo.isHighTextContrastEnabled = () => Promise.resolve(true);
    try {
      mount(<FloatingTabBar {...barProps(0).props} />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(flat(byTestId('tab-pill')[0]).borderColor).toBe(light.ink);
    } finally {
      AccessibilityInfo.isHighTextContrastEnabled = read;
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => was });
    }
  });

  it('hides while the keyboard is up, and comes back after', () => {
    const was = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });
    const handlers: Record<string, () => void> = {};
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((ev: string, fn: () => void) => {
      handlers[ev] = fn;
      return { remove: () => {} };
    }) as unknown as typeof Keyboard.addListener);
    try {
      mount(<FloatingTabBar {...barProps(0).props} />);
      expect(tabs()).toHaveLength(4);
      act(() => handlers.keyboardDidShow());
      expect(tabs()).toHaveLength(0);
      act(() => handlers.keyboardDidHide());
      expect(tabs()).toHaveLength(4);
    } finally {
      spy.mockRestore();
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => was });
    }
  });

  it('Reduce Motion: the pill is there at once (no fade)', () => {
    setMockReducedMotion(true);
    mount(<FloatingTabBar {...barProps(1).props} />);
    expect(byTestId('tab-pill')).toHaveLength(1);
  });
});

// ── Shapes through the shared components ───────────────────────────────
describe('shapes', () => {
  it('a tab screen pads its end past the bar; a pushed screen keeps 96', () => {
    mount(
      <TabSpaceContext.Provider value={106}>
        <Screen>
          <Text>page</Text>
        </Screen>
      </TabSpaceContext.Provider>,
    );
    const sv = root().findAll((n) => n.props.contentContainerStyle)[0];
    expect(StyleSheet.flatten(sv.props.contentContainerStyle).paddingBottom).toBe(130);
    act(() => r!.unmount());
    mount(
      <Screen>
        <Text>page</Text>
      </Screen>,
    );
    expect(StyleSheet.flatten(root().findAll((n) => n.props.contentContainerStyle)[0].props.contentContainerStyle).paddingBottom).toBe(96);
  });

  it('a plate is ONE rounded card: 24 corners, a 1pt line edge, raised, 16 inside; tight is 4 across', () => {
    mount(<Plate testID="p" fig={{ n: 5, title: 'Five areas, one scale' }} />);
    const p = byTestId('p')[0];
    expect(flat(p)).toMatchObject({ borderRadius: 24, borderWidth: 1, borderColor: light.line, backgroundColor: light.raised, padding: 16, paddingHorizontal: 16 });
    expect(p.findAll((n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.borderWidth === 1)).toHaveLength(1);
    act(() => r!.unmount());
    mount(<Plate testID="p" tight />);
    expect(flat(byTestId('p')[0]).paddingHorizontal).toBe(4);
  });

  it('no book labels: a caption is its title, said as its title ("Five areas, one scale", never "Fig. 5")', () => {
    expect(figLine({ n: 5, title: 'Five areas, one scale' })).toBe('Five areas, one scale');
    expect(figSpoken({ n: 5, title: 'Five areas, one scale' })).toBe('Five areas, one scale');
    mount(<Plate fig={{ n: 4, title: 'Your answer' }} />);
    expect(textOf(root())).not.toMatch(/Fig\.|Figure|Plate/);
    expect(EMPTY_PLATE_TITLE).toBe('Nothing here yet');
    act(() => r!.unmount());
    mount(<EmptyPlate body="Answer a few questions to fill this in." />);
    expect(flat(byTestId('empty-plate')[0])).toMatchObject({ borderStyle: 'dashed', borderColor: light.control });
  });

  it('tiles: raised with an edge on the paper, the quiet soft fill inside a card; labels use the first', () => {
    expect(groveTile(light)).toEqual({ backgroundColor: light.raised, borderRadius: 16, borderWidth: 1, borderColor: light.line });
    expect(groveTile(light, true)).toEqual({ backgroundColor: light.soft, borderRadius: 16 });
    expect(groveCard(dark)).toEqual({ backgroundColor: dark.raised, borderRadius: 24, borderWidth: 1, borderColor: dark.line });
    mount(
      <SpecimenLabel testID="s">
        <SpecimenRow label="Answered" value="12" />
      </SpecimenLabel>,
    );
    expect(flat(byTestId('s')[0])).toMatchObject(groveTile(light));
  });

  it('buttons are 54 tall with 16 corners; row icons sit in a 36pt badge with 11 corners', () => {
    mount(<Button label="Start" onPress={() => {}} />);
    const b = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button')[0];
    expect(flat(b)).toMatchObject({ minHeight: 54, borderRadius: 16 });
    act(() => r!.unmount());
    mount(
      <IconCircle>
        <Text>i</Text>
      </IconCircle>,
    );
    const v = root().findAll((n) => typeof n.type === 'string' && flat(n).width === ICON_BADGE)[0];
    expect(flat(v)).toMatchObject({ width: 36, height: 36, borderRadius: 11 });
  });

  it('Settings cards have a 1pt line edge in light and in dark', () => {
    for (const theme of ['light', 'dark'] as const) {
      useSettings.setState({ theme });
      mount(
        <SettingsCard>
          <Text>row</Text>
        </SettingsCard>,
      );
      const card = root().findAll((n) => typeof n.type === 'string' && flat(n).borderRadius === 24)[0];
      expect(flat(card)).toMatchObject({ borderWidth: 1, borderColor: (theme === 'dark' ? dark : light).line });
      act(() => r!.unmount());
    }
  });

  it("You's Settings button: a 44pt rounded square, 48pt to the finger, spoken \"Settings\"; no rule under the head", () => {
    const onPress = jest.fn();
    mount(<RunningHead section="Sat 31 Oct" sectionLabel="Saturday 31 October" action={{ label: 'Settings', hint: 'Exam date, reminders and more', boxed: true, onPress }} />);
    const b = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button')[0];
    expect(flat(b)).toMatchObject({ width: 44, height: 44, borderRadius: 14, borderWidth: 1 });
    expect(b.props.hitSlop).toBe(2);
    expect(b.props.accessibilityLabel).toBe('Settings');
    expect(textOf(b)).not.toContain('Settings');
    const press = root().findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Settings')[0];
    act(() => press.props.onPress());
    expect(onPress).toHaveBeenCalled();
    expect(flat(byTestId('running-head')[0]).borderBottomWidth).toBe(0);
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Saturday 31 October').length).toBeGreaterThan(0);
  });
});
