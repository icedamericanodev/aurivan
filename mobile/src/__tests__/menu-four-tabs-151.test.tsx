/**
 * Mobile 1.51, the owner's menu pick A: four tabs (Today · Learn · Practice ·
 * You). The Play tab is gone; its games are Drills, a section of Practice.
 *
 * Plain English for the founder: the bottom bar has four tabs in this order
 * with these names; every old way to Play (an in-app link, a web /play URL, a
 * kaisip://play link, a badge's "Study for this") lands on Practice at
 * Drills, never on a blank "not found" screen; and Practice opened that way
 * shows Drills, then forgets the jump so the next tap opens at the top.
 * Nothing saved changes: game scores and levels are keyed by game, not tab.
 */
import { existsSync } from 'fs';
import { join } from 'path';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import TabsLayout from '../app/(tabs)/_layout';
import PlayMoved from '../app/play';
import Practice from '../app/(tabs)/practice';
import { redirectSystemPath } from '../app/+native-intent';
import { DRILLS_HREF, DRILLS_PATH } from '../lib/actions';
import { redirectLegacyPath } from '../lib/legacyLinks';
import { AccessibilityInfo, Platform } from 'react-native';
import { DRILLS_MOVED } from '../components/drills';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import { setMockReducedMotion } from '../../jest/reanimated-mock';

setMockReducedMotion(true);

const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockSetParams = jest.fn();
const mockCanDismiss = { current: true };

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
// The tab bar, drawn flat: each tab's name, title and spoken label (the real Tabs needs a navigator).
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const Tabs = ({ children }: { children: unknown }) => React.createElement(React.Fragment, null, children);
  Tabs.Screen = function TabScreen({ name, options }: { name: string; options: { title?: string; tabBarAccessibilityLabel?: string; tabBarButton?: unknown } }) {
    return React.createElement('TabScreen', { name, title: options.title, spoken: options.tabBarAccessibilityLabel ?? options.title, button: options.tabBarButton });
  };
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      navigate: jest.fn(),
      dismissTo: jest.fn(),
      canGoBack: () => true,
      canDismiss: () => mockCanDismiss.current,
      setParams: jest.fn(),
    },
    // A screen mounted here is in front: its focus effect runs once, as the real router's would
    // (app/play.tsx waits for focus since Expo SDK 58: lib/useOnceOnFocus.ts).
    useFocusEffect: (cb: () => void | (() => void)) => React.useEffect(cb, [cb]),
    useLocalSearchParams: () => mockParams.current,
    useNavigation: () => ({ setParams: mockSetParams }),
    Tabs,
  };
});
// The pressable as a host element, so the props each tab button passes are visible.
jest.mock('expo-router/react-navigation', () => {
  const React = jest.requireActual('react');
  return { PlatformPressable: (p: object) => React.createElement('PlatformPressable', p) };
});
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

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa' });
  mockParams.current = {};
  mockSetParams.mockClear();
  mockCanDismiss.current = true;
  for (const f of Object.values(router)) if (jest.isMockFunction(f)) f.mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

describe('the tab bar', () => {
  it('four tabs, in order: Today, Learn, Practice, You (no Play)', () => {
    mount(<TabsLayout />);
    const tabs = root().findAll((n) => (n.type as unknown) === 'TabScreen');
    expect(tabs.map((t) => t.props.name)).toEqual(['home', 'learn', 'practice', 'you']);
    expect(tabs.map((t) => t.props.title)).toEqual(['Today', 'Learn', 'Practice', 'You']);
    expect(tabs.map((t) => t.props.spoken)).toEqual(['Today', 'Learn', 'Practice', 'You']);
  });

  // UX review H2: the navigator's item asks for role "button" on iOS (VoiceOver said "Practice, button").
  it('every tab button is a tab to screen readers, with its selected state kept', () => {
    mount(<TabsLayout />);
    const made = root()
      .findAll((n) => (n.type as unknown) === 'TabScreen')
      .map((t) => t.props.button as React.ComponentType<Record<string, unknown>>);
    const buttons = made.map((Button, i) => {
      act(() => {
        r!.update(<Button aria-selected={i === 2} role="button" onPress={() => {}} />);
      });
      return root().find((n) => (n.type as unknown) === 'PlatformPressable').props;
    });
    expect(buttons).toHaveLength(4);
    for (const [i, b] of buttons.entries()) {
      expect([i, b.role, b.accessibilityRole]).toEqual([i, 'tab', 'tab']);
      expect([i, b.accessibilityState?.selected]).toEqual([i, i === 2]);
      expect(b['aria-selected']).toBe(i === 2);
      // The position ("3 of 4") is the navigator's own label: never written into ours.
      expect(String(b.accessibilityLabel ?? '')).not.toMatch(/\d of \d/);
    }
  });

  it('the Play tab’s screen is gone; its route is a redirect outside the tabs', () => {
    const app = join(__dirname, '..', 'app');
    expect(existsSync(join(app, '(tabs)', 'play.tsx'))).toBe(false);
    expect(existsSync(join(app, 'play.tsx'))).toBe(true);
  });
});

describe('every old way to Play lands on Practice at Drills', () => {
  it('the route the links name', () => {
    expect(DRILLS_HREF).toEqual({ pathname: '/practice', params: { section: 'drills' } });
    expect(DRILLS_PATH).toBe('/practice?section=drills');
  });

  it('system links (kaisip://play, the Expo Go form, with a query or a slash) are rewritten before routing', () => {
    for (const link of ['kaisip://play', 'kaisip://play/', 'kaisip://play?from=email', '/play', 'exp://192.168.1.2:8081/--/play', 'KAISIP://PLAY']) {
      expect([link, redirectLegacyPath(link)]).toEqual([link, DRILLS_PATH]);
      expect([link, redirectSystemPath({ path: link, initial: true })]).toEqual([link, DRILLS_PATH]);
    }
    // Current links pass through untouched.
    for (const link of ['kaisip://practice', 'kaisip://game/trap', 'kaisip://widget?kind=plan&go=start&from=widget', '/home']) {
      expect(redirectLegacyPath(link)).toBe(link);
    }
  });

  it('an in-app /play (router.push, a web URL): back to the tabs already there, at Drills; never a second tab bar', () => {
    mount(<PlayMoved />);
    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenCalledWith(DRILLS_HREF);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('a cold /play with nothing under it: replaced by Practice at Drills', () => {
    mockCanDismiss.current = false;
    mount(<PlayMoved />);
    expect(router.replace).toHaveBeenCalledWith(DRILLS_HREF);
    expect(router.dismissTo).not.toHaveBeenCalled();
  });
});

describe('Practice opened at Drills', () => {
  it('shows Drills after its own sections, and clears ?section once it has jumped (the next tab tap opens at the top)', () => {
    jest.useFakeTimers();
    mockParams.current = { section: 'drills' };
    mount(<Practice />);
    const drills = root().findAll((n) => n.props.testID === 'drills' && typeof n.type === 'string');
    expect(drills).toHaveLength(1);
    expect(textOf(drills[0])).toContain('Drills');
    // Today's drill is the first row, said first.
    const first = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /^Today’s drill: /.test(n.props.accessibilityLabel) && typeof n.props.onPress === 'function');
    expect(first.length).toBeGreaterThan(0);
    // After "More ways to practice" (the hero stays the one primary action).
    const t = textOf(root());
    expect(t.indexOf('More ways to practice')).toBeLessThan(t.indexOf('Drills'));
    expect(mockSetParams).not.toHaveBeenCalled();
    // The jump runs from Drills' own layout (no fixed delay), then the param is cleared.
    layDrills();
    expect(mockSetParams).toHaveBeenCalledWith({ section: undefined });
  });

  it('a plain Practice tap never jumps and never touches the params', () => {
    jest.useFakeTimers();
    mount(<Practice />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockSetParams).not.toHaveBeenCalled();
    expect(root().findAll((n) => n.props.testID === 'drills' && typeof n.type === 'string')).toHaveLength(1);
  });

  it('every drill row is a 48pt button that opens its game', () => {
    mount(<Practice />);
    const rows = root().findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && / About \d+ minutes\./.test(String(n.props.accessibilityLabel ?? '')));
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const style = [rows[0].props.style].flat(3).reduce((a: Record<string, unknown>, s) => ({ ...a, ...(s as object) }), {});
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    act(() => {
      rows[0].props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/game\//));
  });
});

/** Host refs that can be measured and focused (react-test-renderer gives none by default). */
const nodeMock = () => ({ measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => cb(0, 300, 360, 400), measureLayout: () => {} });
const mountMeasured = (el: React.ReactElement) => {
  act(() => {
    r = create(el, { createNodeMock: nodeMock });
  });
};
/** Drills' own outer view, laid out (the jump and the on-screen check run from it). */
const layDrills = () =>
  act(() => {
    // The mocked View's own measureInWindow never answers: on screen, 300pt down.
    const view = root().find((n) => n.props.testID === 'drills' && typeof n.type !== 'string' && n.instance);
    view.instance.measureInWindow = (cb: (x: number, y: number, w: number, h: number) => void) => cb(0, 300, 360, 400);
    root()
      .find((n) => n.props.testID === 'drills' && typeof n.type === 'string')
      .props.onLayout({ nativeEvent: { layout: { x: 0, y: 900, width: 360, height: 400 } } });
  });

describe('the jump moves screen-reader focus to Drills (UX review P2)', () => {
  it('once, after Drills is laid out (not on a fixed timer)', () => {
    jest.useFakeTimers();
    expect(Platform.OS).not.toBe('web');
    const RN = jest.requireActual('react-native');
    const handle = jest.spyOn(RN, 'findNodeHandle').mockReturnValue(7);
    const focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {});
    mockParams.current = { section: 'drills' };
    mountMeasured(<Practice />);
    act(() => {
      jest.advanceTimersByTime(700);
    });
    // Nothing until Drills has its layout.
    expect(focus).not.toHaveBeenCalled();
    layDrills();
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(focus).toHaveBeenCalledTimes(1);
    expect(mockSetParams).toHaveBeenCalledWith({ section: undefined });
    // A later layout (the sections above grew) scrolls again but never moves focus twice.
    layDrills();
    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(focus).toHaveBeenCalledTimes(1);
    focus.mockRestore();
    handle.mockRestore();
  });
});

describe('the one-time "games moved" line (UX review P4)', () => {
  const moved = () => root().findAll((n) => n.props.testID === 'drills-moved' && typeof n.type === 'string');
  const played = () =>
    act(() => {
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, gameBest: { trap: 5 } } } }));
    });
  beforeEach(() => {
    act(() => {
      useSeen.setState((s) => ({ moments: Object.fromEntries(Object.entries(s.moments).filter(([k]) => k !== DRILLS_MOVED)) }));
    });
  });

  it('a learner who never played a game: no line', () => {
    mount(<Practice />);
    expect(moved()).toHaveLength(0);
  });

  it('one who played: a meta line and a ghost "Go to Drills" (no second solid button); the tap jumps and it never shows again', () => {
    played();
    mountMeasured(<Practice />);
    expect(moved()).toHaveLength(1);
    expect(textOf(moved()[0])).toContain('The games are here now, as Drills.');
    const go = moved()[0].findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function')[0];
    expect(go.props.accessibilityLabel ?? textOf(go)).toContain('Go to Drills');
    expect(go.props.accessibilityHint).toBe('Scrolls to Drills on this page');
    act(() => {
      go.props.onPress();
    });
    expect(useSeen.getState().moments[DRILLS_MOVED]).toBe(1);
    expect(moved()).toHaveLength(0);
    act(() => r?.unmount());
    mount(<Practice />);
    expect(moved()).toHaveLength(0);
  });

  it('or the first time Drills is on screen', () => {
    played();
    mountMeasured(<Practice />);
    expect(moved()).toHaveLength(1);
    layDrills();
    expect(useSeen.getState().moments[DRILLS_MOVED]).toBe(1);
    expect(moved()).toHaveLength(0);
  });
});
