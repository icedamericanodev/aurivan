/**
 * Release bug hunt round 4: What's new on a store (Google Play) build.
 *
 * The Play build turns over-the-air updates off, so Settings has no "Check
 * for updates" row and no update stamp. What's new must not describe them
 * there. With updates on (the beta and dev builds) the 1.19 lines still show.
 */
import { Platform } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import WhatsNew from '../app/whats-new';
import { WHATS_NEW, whatsNewFor } from '../content/support';

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
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
// expo-updates as the build reports it; read lazily so each test can choose.
const mockUpdates = { isEnabled: false };
jest.mock('expo-updates', () => ({
  get isEnabled() {
    return mockUpdates.isEnabled;
  },
  isEmbeddedLaunch: true,
  updateId: null,
  runtimeVersion: null,
}));

let r: ReactTestRenderer | undefined;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(r!.root);
  return out.join(' ');
};
const mount = () => {
  act(() => {
    r = create(<WhatsNew />);
  });
};
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

const CHECK = 'check for the latest update';
const STAMP = 'which update your app is running';

describe('What’s new and over-the-air updates', () => {
  const os = Platform.OS;
  beforeAll(() => {
    Platform.OS = 'android';
  });
  afterAll(() => {
    Platform.OS = os;
  });

  it('a store build (updates off) never mentions the update row or the update stamp', () => {
    mockUpdates.isEnabled = false;
    mount();
    const t = allText();
    expect(t).not.toContain(CHECK);
    expect(t).not.toContain(STAMP);
    expect(t).toContain('Version 1.18'); // the other entries still show
  });

  it('a build with updates on still shows the 1.19 lines', () => {
    mockUpdates.isEnabled = true;
    mount();
    const t = allText();
    expect(t).toContain(CHECK);
    expect(t).toContain(STAMP);
  });

  it('the newest entry is never update-only (it is the app’s version line)', () => {
    expect(WHATS_NEW[0].needsUpdates).toBeUndefined();
    expect(whatsNewFor(false)[0]).toBe(WHATS_NEW[0]);
    expect(whatsNewFor(true)).toBe(WHATS_NEW);
  });
});
