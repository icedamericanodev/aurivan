/**
 * Brand (the KaiSip Kasama mark + the Set A vision):
 * - the store icons have NO alpha channel (App Store Connect rejects them);
 * - the welcome screen shows the lockup, tagline, line and all four pillars,
 *   and "Start my plan" still leads into the existing onboarding steps;
 * - Settings → About carries the same vision.
 */
import fs from 'fs';
import path from 'path';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { BackHandler } from 'react-native';
import { CERT_SCOPE_LINE, PILLARS, PROVENANCE_LINE, WELCOME_FACTS, WELCOME_HEADLINE, WELCOME_LINE } from '../content/brand';
import Onboarding from '../app/onboarding';
import Settings from '../app/settings';
import { KaisipLockup } from '../components/brand';
import { FAQ } from '../content/support';

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

// ── Store icons: opaque RGB only ─────────────────────────────────────
/** PNG colour type lives at byte 25 (inside IHDR). 2 = RGB; 4 and 6 carry alpha. */
function pngColorType(file: string): number {
  const buf = fs.readFileSync(path.join(__dirname, '../../assets', file));
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return buf[25];
}

/** Width and height from the PNG header (IHDR: bytes 16 to 23). */
function pngSize(file: string): [number, number] {
  const buf = fs.readFileSync(path.join(__dirname, '../../assets', file));
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

describe('store icons', () => {
  // The KaiSip icons (mobile 1.23) keep the exact sizes app.json and the stores expect.
  it.each([
    ['icon.png', 1024],
    ['icon-dark.png', 1024],
    ['icon-tinted.png', 1024],
    ['splash-icon.png', 1024],
    ['splash-icon-dark.png', 1024],
    ['android-icon-foreground.png', 512],
    ['android-icon-background.png', 512],
    ['android-icon-monochrome.png', 432],
    ['favicon.png', 48],
  ])('%s is %i px square', (f, size) => {
    expect(pngSize(f)).toEqual([size, size]);
  });
  it('every icon app.json names exists', () => {
    const named = JSON.stringify(require('../../app.json')).match(/\.\/assets\/[\w.-]+\.png/g) ?? [];
    expect(named.length).toBeGreaterThanOrEqual(10);
    for (const f of named) expect(fs.existsSync(path.join(__dirname, '../..', f))).toBe(true);
  });
  // Apple rejects an app icon with an alpha channel; the light and tinted icons must be opaque RGB.
  it.each(['icon.png', 'icon-tinted.png'])('%s has no alpha channel', (f) => {
    expect(pngColorType(f)).toBe(2);
  });
  // The iOS 18 dark icon is the opposite: a transparent background lets iOS draw its own dark backdrop.
  it('icon-dark.png has a transparent background', () => {
    expect(pngColorType('icon-dark.png')).toBe(6);
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
  it('shows the lockup, the headline, the CISA line and four literal lines (not the brand pillars)', () => {
    mount(<Onboarding />);
    expect(r!.root.findAllByType(KaisipLockup)).toHaveLength(1);
    const text = allText();
    expect(text).toContain(WELCOME_HEADLINE);
    expect(text).toContain(WELCOME_LINE);
    expect(text).toContain('CISA');
    expect(WELCOME_FACTS).toHaveLength(4);
    for (const line of WELCOME_FACTS) {
      expect(text).toContain(line);
      expect(labels()).toContain(line);
    }
    // The pillars live in Settings → About; the welcome is literal.
    for (const p of PILLARS) expect(text).not.toContain(p.title);
    expect(text).not.toContain('Master Modern Risk');
  });

  it('"Get started" leads into the optional name, then the starting point, and Back returns', () => {
    mount(<Onboarding />);
    press('Get started');
    // The optional name step comes first; Skip moves on, Back from the starting point returns to it.
    expect(allText()).toContain('What should we call you?');
    press('Skip');
    expect(allText()).toContain('Where are you starting from?');
    expect(allText()).not.toContain(WELCOME_HEADLINE);
    press('Back');
    expect(allText()).toContain('What should we call you?');
    press('Back');
    expect(allText()).toContain(WELCOME_HEADLINE);
  });

  it("Android's back button steps back through onboarding instead of closing the app", () => {
    // Keep the most recently registered back handler (it is re-registered on every step).
    let handler: (() => boolean | null | undefined) | undefined;
    type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, h: BackListener) => {
      handler = () => h({} as Parameters<BackListener>[0]);
      return { remove: () => {} };
    });
    mount(<Onboarding />);
    expect(handler!()).toBe(false); // welcome: default behaviour
    press('Get started');
    press('Skip');
    let handled: boolean | null | undefined;
    act(() => {
      handled = handler!();
    });
    expect(handled).toBe(true);
    expect(allText()).toContain('What should we call you?'); // the name step sits between the welcome and step 1
    act(() => {
      handler!();
    });
    expect(allText()).toContain(WELCOME_HEADLINE);
    spy.mockRestore();
  });
});

describe('Settings → About', () => {
  it('leads with the welcome’s CISA line, then the pillars, the scope line and the provenance line (mobile 1.39)', () => {
    mount(<Settings />);
    // Mobile 1.17: behind the "About KaiSip" row (a sheet), so Settings stays short.
    expect(allText()).not.toContain(CERT_SCOPE_LINE);
    act(() => {
      r!.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel).startsWith('About KaiSip'))[0].props.onPress();
    });
    const text = allText();
    expect(text).toContain('Our vision');
    expect(text).toContain(WELCOME_HEADLINE);
    expect(text).toContain(WELCOME_LINE);
    for (const p of PILLARS) expect(text).toContain(p.title);
    expect(text).toContain('Starting with CISA. More certifications later.');
    expect(text).toContain(PROVENANCE_LINE);
    // Owner decision (22 Oct 2026): no platform tagline and no "coming soon" list of other exams.
    expect(text).not.toMatch(/Master Modern Risk|Coming soon|primary sources|CISM|CRISC|CISSP|AAIA|ISC2/);
  });

  it('the Certification picker lists only what the app teaches, with the scope line', () => {
    mount(<Settings />);
    act(() => {
      r!.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel).startsWith('Certification'))[0].props.onPress();
    });
    const text = allText();
    expect(text).toContain(CERT_SCOPE_LINE);
    expect(text).not.toMatch(/Coming soon|CISM|CRISC|CISSP|AAIA/);
  });

  it('the provenance line is the same words in About and in the ISACA answer', () => {
    expect(PROVENANCE_LINE).toBe('Original questions and notes, written with AI assistance and checked against ISACA’s published exam outline and standards.');
    expect(FAQ.find((f) => f.id === 'isaca')!.answer).toContain(PROVENANCE_LINE);
  });
});
