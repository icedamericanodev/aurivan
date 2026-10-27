/**
 * Mobile 1.19 "Check for updates" in Settings → Help and about: the row and
 * the "Update … · …" stamp show only where over-the-air updates work (never
 * on the web, in Expo Go or a dev build); one tap is one check; every state
 * reads right and is announced once; "Restart to update" reloads; a second
 * tap while busy does nothing; errors never show their text.
 */
import { AccessibilityInfo, Dimensions, Platform } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Settings from '../app/settings';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { flushSayLaterForTest } from '../lib/a11y';
import { useUpdateCheck } from '../lib/updates';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
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
jest.mock('../components/brand', () => ({ KaisipLockup: () => null, KaisipMark: () => null, PillarList: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useNavigation: () => ({ addListener: () => () => {} }),
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  // Mobile 1.46: Check for updates lives on Help and about's own screen.
  useLocalSearchParams: () => ({ category: 'help' }),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

/** A promise the test settles by hand, so each state can be looked at while it lasts. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// The phone, as expo-updates reports it. Read lazily (getters), so a test can change it before mounting.
const mockUpdates = {
  isEnabled: true,
  isEmbeddedLaunch: false,
  updateId: '1a2b3c4d-9999-4000-8000-000000000000',
  runtimeVersion: '5e26d4b961113941199b725cff5ff30a66bf0ac1',
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
};
jest.mock('expo-updates', () => ({
  get isEnabled() {
    return mockUpdates.isEnabled;
  },
  get isEmbeddedLaunch() {
    return mockUpdates.isEmbeddedLaunch;
  },
  get updateId() {
    return mockUpdates.updateId;
  },
  get runtimeVersion() {
    return mockUpdates.runtimeVersion;
  },
  checkForUpdateAsync: () => mockUpdates.checkForUpdateAsync(),
  fetchUpdateAsync: () => mockUpdates.fetchUpdateAsync(),
  reloadAsync: () => mockUpdates.reloadAsync(),
}));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const hosts = (pred: (n: ReactTestInstance) => boolean) => root().findAll((n) => typeof n.props.onPress === 'function' && pred(n));
const row = (title: string) => hosts((n) => n.props.accessibilityRole === 'button' && String(n.props.accessibilityLabel).startsWith(`${title}, `))[0];
const button = (label: string) => hosts((n) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === label)[0];
const flatStyle = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(3).filter(Boolean));
/** Tap, and let the promise chain settle as far as it can. */
const tap = async (n: ReactTestInstance) => {
  await act(async () => {
    n.props.onPress();
  });
};
const settle = () => act(async () => {});
const said = (): string[] => {
  flushSayLaterForTest();
  return [
    ...jest.mocked(AccessibilityInfo.announceForAccessibility).mock.calls.map((c) => String(c[0])),
    ...jest.mocked(AccessibilityInfo.announceForAccessibilityWithOptions).mock.calls.map((c) => String(c[0])),
  ];
};

const UPDATE_ROW = 'Check for updates';
const RESTART = 'Restart to update';
const STAMP = 'Update 1a2b3c4d · 5e26d4b';

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 13, 10, 0) });
  Platform.OS = 'ios';
  mockUpdates.isEnabled = true;
  mockUpdates.isEmbeddedLaunch = false;
  mockUpdates.checkForUpdateAsync.mockReset();
  mockUpdates.fetchUpdateAsync.mockReset();
  mockUpdates.reloadAsync.mockReset();
  // React Native's Jest setup already makes these jest.fn()s, so their calls outlive a test: clear them.
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {}).mockClear();
  jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => {}).mockClear();
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', examDates: { cisa: '2027-01-08' } });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('where the row shows', () => {
  it('an installed app: the row (last in Help and about, no chevron) and the stamp under the version line', () => {
    mount(<Settings />);
    const n = row(UPDATE_ROW);
    expect(n).toBeDefined();
    // Idle: the note says updates usually arrive on their own; the state is empty.
    expect(n.props.accessibilityLabel).toBe('Check for updates, Small updates usually arrive on their own when the app opens. Tap to look now.');
    expect(n.props.accessibilityState).toBeUndefined();
    expect(flatStyle(n.props.style).minHeight).toBeGreaterThanOrEqual(48);
    // An action row: no chevron (the icon mock renders nothing; the ChevronRight child is absent).
    expect(n.findAll((x) => typeof x.type === 'function' && (x.type as { name?: string }).name === 'ChevronRight')).toHaveLength(0);
    const t = allText();
    expect(t).toContain(STAMP);
    // The version line still comes from the running app's config (Jest has none, so the fallback
    // shows), and the stamp sits right after it.
    expect(t).toMatch(/KaiSip v\s*1\.0\.0/);
    expect(t.indexOf('KaiSip v')).toBeLessThan(t.indexOf(STAMP));
    // The row comes after About, Privacy policy and Terms of use (their built-in links, mobile 1.40.1).
    expect(t.indexOf('About KaiSip')).toBeLessThan(t.indexOf(UPDATE_ROW));
    expect(t.indexOf('Terms of use')).toBeLessThan(t.indexOf(UPDATE_ROW));
    expect(button(RESTART)).toBeUndefined();
  });

  it('the stamp says built-in when the app runs the code shipped inside the APK', () => {
    mockUpdates.isEmbeddedLaunch = true;
    mount(<Settings />);
    expect(allText()).toContain('Update built-in · 5e26d4b');
  });

  it('hidden on the web, with no stamp', () => {
    Platform.OS = 'web';
    mount(<Settings />);
    expect(row(UPDATE_ROW)).toBeUndefined();
    expect(allText()).not.toMatch(/Update (built-in|1a2b3c4d)/);
    // About is the last row again (its hairline is off), and the version line stays.
    expect(allText()).toMatch(/KaiSip v\s*1\.0\.0/);
  });

  it('hidden in Expo Go and dev builds (expo-updates disabled), and nothing is called', async () => {
    mockUpdates.isEnabled = false;
    mount(<Settings />);
    expect(row(UPDATE_ROW)).toBeUndefined();
    expect(allText()).not.toMatch(/Update (built-in|1a2b3c4d)/);
    expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();
    // Even a direct call to the hook's check does nothing when updates are unavailable.
    act(() => {
      r?.unmount();
    });
    let api!: ReturnType<typeof useUpdateCheck>;
    function Probe() {
      api = useUpdateCheck();
      return null;
    }
    mount(<Probe />);
    expect(api.available).toBe(false);
    await act(async () => {
      await api.check();
      await api.restart();
    });
    expect(api.phase).toBe('idle');
    expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(mockUpdates.reloadAsync).not.toHaveBeenCalled();
  });

  it('a Google Play build (updates switched off, mobile 1.40.1): no row and no stamp, but Privacy policy and Terms of use stay', () => {
    // app.config.js builds the "production" profile with updates.enabled false, so on the phone
    // expo-updates reports isEnabled false (the same as Expo Go).
    Platform.OS = 'android';
    mockUpdates.isEnabled = false;
    mount(<Settings />);
    expect(row(UPDATE_ROW)).toBeUndefined();
    expect(allText()).not.toMatch(/Update (built-in|1a2b3c4d)/);
    const privacy = hosts((n) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === 'Privacy policy')[0];
    const terms = hosts((n) => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === 'Terms of use')[0];
    expect(privacy).toBeDefined();
    expect(terms).toBeDefined();
    expect(privacy.props.accessibilityHint).toBe('Opens in your browser');
    expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('opening Settings calls nothing: a check starts only from a tap', () => {
    mount(<Settings />);
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(mockUpdates.fetchUpdateAsync).not.toHaveBeenCalled();
  });
});

describe('one tap, every state', () => {
  it('an update: Checking… → Downloading… → Ready to restart, then Restart reloads once', async () => {
    const check = deferred<{ isAvailable: boolean; isRollBackToEmbedded: boolean }>();
    const fetch = deferred<{ isNew: boolean; isRollBackToEmbedded: boolean }>();
    mockUpdates.checkForUpdateAsync.mockReturnValue(check.promise);
    mockUpdates.fetchUpdateAsync.mockReturnValue(fetch.promise);
    mockUpdates.reloadAsync.mockResolvedValue(undefined);
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    // Checking: the state is the row's value, and the row is disabled.
    expect(row(UPDATE_ROW).props.accessibilityLabel).toBe('Check for updates, Checking…');
    expect(row(UPDATE_ROW).props.accessibilityState).toEqual({ disabled: true });
    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(mockUpdates.fetchUpdateAsync).not.toHaveBeenCalled();
    // A second tap while busy does nothing (the row is disabled; the hook guards too).
    await tap(row(UPDATE_ROW));
    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);

    check.resolve({ isAvailable: true, isRollBackToEmbedded: false });
    await settle();
    expect(row(UPDATE_ROW).props.accessibilityLabel).toBe('Check for updates, Downloading…');
    expect(row(UPDATE_ROW).props.accessibilityState).toEqual({ disabled: true });
    expect(mockUpdates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(button(RESTART)).toBeUndefined();

    fetch.resolve({ isNew: true, isRollBackToEmbedded: false });
    await settle();
    expect(row(UPDATE_ROW).props.accessibilityLabel).toBe('Check for updates, Ready to restart, The update is downloaded. Tap Restart to update below; your progress stays as it is.');
    // Nothing more to check: the row stays disabled and the primary action takes over.
    expect(row(UPDATE_ROW).props.accessibilityState).toEqual({ disabled: true });
    const restart = button(RESTART);
    expect(restart).toBeDefined();
    expect(restart.props.accessibilityHint).toBe('Closes and reopens the app with the update.');
    // Each state was said once, in order, queued behind other speech.
    expect(said()).toEqual(['Checking…', 'Downloading…', 'Ready to restart. The update is downloaded. Tap Restart to update below; your progress stays as it is.']);

    await tap(restart);
    expect(mockUpdates.reloadAsync).toHaveBeenCalledTimes(1);
    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it('a roll back to the built-in version is downloaded too', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false, isRollBackToEmbedded: true });
    mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: false, isRollBackToEmbedded: true });
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    expect(row(UPDATE_ROW).props.accessibilityLabel).toMatch(/^Check for updates, Ready to restart/);
    expect(button(RESTART)).toBeDefined();
  });

  it('up to date: says so, re-enables the row, and a second tap is a second (single) check', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false, isRollBackToEmbedded: false, reason: 'noUpdateAvailableOnServer' });
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    expect(row(UPDATE_ROW).props.accessibilityLabel).toBe('Check for updates, Up to date, This is the latest version.');
    expect(row(UPDATE_ROW).props.accessibilityState).toBeUndefined();
    expect(mockUpdates.fetchUpdateAsync).not.toHaveBeenCalled();
    expect(button(RESTART)).toBeUndefined();
    expect(said()).toEqual(['Checking…', 'Up to date. This is the latest version.']);
    await tap(row(UPDATE_ROW));
    await settle();
    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(2);
    // Not a loop: nothing more happens on its own.
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(2);
  });

  it('offline or any error while checking: plain words, never the error text', async () => {
    mockUpdates.checkForUpdateAsync.mockRejectedValue(new Error('java.net.UnknownHostException: Unable to resolve host "u.expo.dev"'));
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    expect(row(UPDATE_ROW).props.accessibilityLabel).toBe('Check for updates, Couldn’t check, You may be offline. Try again later.');
    expect(allText()).not.toMatch(/UnknownHost|u\.expo\.dev|Error/);
    // The learner can try again.
    expect(row(UPDATE_ROW).props.accessibilityState).toBeUndefined();
    expect(button(RESTART)).toBeUndefined();
    expect(said()).toEqual(['Checking…', 'Couldn’t check. You may be offline. Try again later.']);
  });

  it('the download fails: Couldn’t download, and no Restart', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true, isRollBackToEmbedded: false });
    mockUpdates.fetchUpdateAsync.mockRejectedValue(new Error('timeout'));
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    expect(row(UPDATE_ROW).props.accessibilityLabel).toBe('Check for updates, Couldn’t download, You may be offline. Try again later.');
    expect(allText()).not.toMatch(/timeout/);
    expect(button(RESTART)).toBeUndefined();
  });

  it('the restart fails: says to close the app fully and reopen; Restart stays for another try', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true, isRollBackToEmbedded: false });
    mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: true, isRollBackToEmbedded: false });
    mockUpdates.reloadAsync.mockRejectedValue(new Error('Could not reload: no RCTBridge'));
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    await tap(button(RESTART));
    await settle();
    expect(row(UPDATE_ROW).props.accessibilityLabel).toBe('Check for updates, Couldn’t restart, Close the app fully and open it again to finish the update.');
    expect(allText()).not.toMatch(/RCTBridge/);
    expect(row(UPDATE_ROW).props.accessibilityState).toEqual({ disabled: true });
    expect(button(RESTART)).toBeDefined();
    expect(said().at(-1)).toBe('Couldn’t restart. Close the app fully and open it again to finish the update.');
  });
});

describe('large text and reduced motion', () => {
  it('at about 200% text the state reads under the title and nothing is lost', async () => {
    const w = Dimensions.get('window');
    act(() => {
      Dimensions.set({ window: { ...w, fontScale: 2 }, screen: { ...w, fontScale: 2 } });
    });
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false, isRollBackToEmbedded: false });
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    const t = allText();
    expect(t).toContain('Up to date');
    expect(t).toContain(STAMP);
    // The value is inside the title's column at large text (no right-aligned style).
    const value = root().findAll((n) => typeof n.type === 'function' && n.props.children === 'Up to date' && n.props.v === 'body')[0];
    expect(flatStyle(value.props.style).textAlign).toBeUndefined();
    act(() => {
      Dimensions.set({ window: w, screen: w });
    });
  });

  it('with motion off the states change the same way (no animation is involved)', async () => {
    setMockReducedMotion(true);
    useSettings.setState({ motion: 'reduced' });
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true, isRollBackToEmbedded: false });
    mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: true, isRollBackToEmbedded: false });
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    expect(button(RESTART)).toBeDefined();
  });
});
