/**
 * Brand ("True North" + the Set A vision):
 * - the store icons have NO alpha channel (App Store Connect rejects them);
 * - the welcome screen shows the lockup, tagline, line and all four pillars,
 *   and "Start my plan" still leads into the existing onboarding steps;
 * - Settings → About carries the same vision.
 */
import fs from 'fs';
import path from 'path';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { PILLARS, TAGLINE, VISION_LINE } from '../content/brand';
import Onboarding from '../app/onboarding';
import Settings from '../app/settings';
import { BrandLockup } from '../components/brand';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const builder: object = new Proxy({}, { get: () => () => builder });
  const id = (v: unknown) => v;
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => true,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: id,
    withDelay: (_d: number, v: unknown) => v,
    withRepeat: id,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    cancelAnimation: () => {},
    Easing: new Proxy({}, { get: () => () => id }),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeIn: builder,
    FadeInDown: builder,
  };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

// ── Store icons: opaque RGB only ─────────────────────────────────────
/** PNG colour type lives at byte 25 (inside IHDR). 2 = RGB; 4 and 6 carry alpha. */
function pngColorType(file: string): number {
  const buf = fs.readFileSync(path.join(__dirname, '../../assets', file));
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return buf[25];
}

describe('store icons', () => {
  it.each(['icon.png', 'icon-dark.png', 'icon-tinted.png'])('%s has no alpha channel', (f) => {
    expect(pngColorType(f)).toBe(2);
  });
});

// ── Screens ───────────────────────────────────────────────────────────
let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
/** Every string rendered by <Text>, joined: enough to check what a learner reads. */
const allText = () =>
  r!.root
    .findAll((n) => (n.type as unknown) === 'Text')
    .map((n) => [n.props.children].flat().join(''))
    .join(' | ');
const labels = () => r!.root.findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
const press = (label: string) =>
  act(() => {
    r!.root.findAll((n) => n.props.label === label && typeof n.props.onPress === 'function')[0].props.onPress();
  });

afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('welcome screen', () => {
  it('shows the lockup, tagline, line and the four pillars', () => {
    mount(<Onboarding />);
    expect(r!.root.findAllByType(BrandLockup)).toHaveLength(1);
    const text = allText();
    expect(text).toContain(TAGLINE);
    expect(text).toContain(VISION_LINE);
    expect(PILLARS).toHaveLength(4);
    for (const p of PILLARS) {
      expect(text).toContain(p.title);
      expect(text).toContain(p.body);
      // Each pillar is spoken as one sentence.
      expect(labels()).toContain(`${p.title}. ${p.body}`);
    }
  });

  it('"Start my plan" leads into the certification step, and Back returns', () => {
    mount(<Onboarding />);
    press('Start my plan');
    expect(allText()).toContain('Which exam are you preparing for?');
    expect(allText()).not.toContain(TAGLINE);
    press('Back');
    expect(allText()).toContain(TAGLINE);
  });
});

describe('Settings → About', () => {
  it('carries the same vision and pillars', () => {
    mount(<Settings />);
    const text = allText();
    expect(text).toContain('Our vision');
    expect(text).toContain(TAGLINE);
    for (const p of PILLARS) expect(text).toContain(p.title);
  });
});
