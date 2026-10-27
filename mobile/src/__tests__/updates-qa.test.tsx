/**
 * QA probes for mobile 1.19 "Check for updates" (Settings → Help and about),
 * covering what settings-updates.test.tsx and updates-engine.test.ts leave
 * out: re-renders and theme changes start nothing and re-speak nothing; rapid
 * taps on Restart; a retry after a failed restart; a download that turns out
 * not new; unmounting mid-check; the demo client can never run on a phone;
 * the stamp when the update id is missing; and the copy never advertises the
 * bank size or implies ISACA affiliation.
 */
import { AccessibilityInfo, Platform } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Settings from '../app/settings';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { WHATS_NEW } from '../content/support';
import { UPDATE_WORDS } from '../engine/updates';
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

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const mockUpdates = {
  isEnabled: true,
  isEmbeddedLaunch: false,
  updateId: '1a2b3c4d-9999-4000-8000-000000000000' as string | null,
  runtimeVersion: '5e26d4b961113941199b725cff5ff30a66bf0ac1' as string | null,
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
/** Force a re-render of everything that reads settings (theme is read by every screen). */
const flipTheme = () => {
  act(() => {
    useSettings.setState({ theme: useSettings.getState().theme === 'light' ? 'dark' : 'light' });
  });
};

const UPDATE_ROW = 'Check for updates';
const RESTART = 'Restart to update';
const SHOTS_KEY = 'EXPO_PUBLIC_AURIVAN_SHOTS';
const DEMO_KEY = '__AURIVAN_UPDATE_DEMO__';
const demoGlobal = globalThis as unknown as Record<string, unknown>;

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 13, 10, 0) });
  Platform.OS = 'ios';
  mockUpdates.isEnabled = true;
  mockUpdates.isEmbeddedLaunch = false;
  mockUpdates.updateId = '1a2b3c4d-9999-4000-8000-000000000000';
  mockUpdates.runtimeVersion = '5e26d4b961113941199b725cff5ff30a66bf0ac1';
  mockUpdates.checkForUpdateAsync.mockReset();
  mockUpdates.fetchUpdateAsync.mockReset();
  mockUpdates.reloadAsync.mockReset();
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
  delete process.env[SHOTS_KEY];
  delete demoGlobal[DEMO_KEY];
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('probe 1 and 10: nothing runs, and nothing is re-spoken, without a tap', () => {
  it('re-renders (theme flips) before any tap call nothing', () => {
    mount(<Settings />);
    flipTheme();
    flipTheme();
    flipTheme();
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(mockUpdates.fetchUpdateAsync).not.toHaveBeenCalled();
    expect(mockUpdates.reloadAsync).not.toHaveBeenCalled();
    expect(said()).toEqual([]);
  });

  it('after a finished check, theme flips and time passing neither re-check nor re-announce', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false, isRollBackToEmbedded: false });
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    const before = said();
    expect(before).toEqual(['Checking…', 'Up to date. This is the latest version.']);
    flipTheme();
    flipTheme();
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(row(UPDATE_ROW).props.accessibilityLabel).toMatch(/^Check for updates, Up to date/);
    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(said()).toEqual(before);
  });

  it('a Ready state survives re-renders without speaking again or touching the phone', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true, isRollBackToEmbedded: false });
    mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: true, isRollBackToEmbedded: false });
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    const spoken = said();
    expect(spoken).toHaveLength(3);
    flipTheme();
    flipTheme();
    expect(button(RESTART)).toBeDefined();
    expect(said()).toEqual(spoken);
    expect(mockUpdates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(mockUpdates.reloadAsync).not.toHaveBeenCalled();
  });
});

describe('probe 2 and 5: rapid taps on Restart, and a retry after it fails', () => {
  it('two quick taps on Restart while the reload is in flight call reloadAsync once', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true, isRollBackToEmbedded: false });
    mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: true, isRollBackToEmbedded: false });
    const reload = deferred<void>();
    mockUpdates.reloadAsync.mockReturnValue(reload.promise);
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    const restart = button(RESTART);
    // Same frame, no await between: the ref guard must catch the second one.
    await act(async () => {
      restart.props.onPress();
      restart.props.onPress();
    });
    await tap(button(RESTART));
    expect(mockUpdates.reloadAsync).toHaveBeenCalledTimes(1);
    // While the reload is pending the row cannot start a check either.
    await tap(row(UPDATE_ROW));
    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    reload.resolve();
    await settle();
    // Resolving means the reload is on its way; the phase is unchanged (no "failed", no "up to date").
    expect(row(UPDATE_ROW).props.accessibilityLabel).toMatch(/^Check for updates, Ready to restart/);
  });

  it('after Couldn’t restart, Restart is still there and a second tap tries reloadAsync again', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true, isRollBackToEmbedded: false });
    mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: true, isRollBackToEmbedded: false });
    mockUpdates.reloadAsync.mockRejectedValueOnce(new Error('no runtime')).mockResolvedValueOnce(undefined);
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    await tap(button(RESTART));
    await settle();
    expect(row(UPDATE_ROW).props.accessibilityLabel).toMatch(/^Check for updates, Couldn’t restart, Close the app fully/);
    // The update is already on the phone, so the copy must not send the learner back to "check" or "download".
    expect(UPDATE_WORDS['restart-failed'].note).not.toMatch(/offline|download|check/i);
    // The row stays disabled: a re-check would say "Up to date" while the old code still runs.
    // NOTE (QA): this guard lives in the Pressable only. useUpdateCheck.check() itself does not look
    // at the phase, so calling onPress directly here would start a second checkForUpdateAsync.
    // On a device the disabled Pressable swallows the tap, so we assert that prop, not the hook.
    expect(row(UPDATE_ROW).props.accessibilityState).toEqual({ disabled: true });
    expect(row(UPDATE_ROW).props.disabled).toBe(true);
    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    await tap(button(RESTART));
    await settle();
    expect(mockUpdates.reloadAsync).toHaveBeenCalledTimes(2);
    // Only the failure was announced for the restart; a successful reload says nothing (the app is leaving).
    expect(said().filter((s) => s.startsWith('Couldn’t restart'))).toHaveLength(1);
  });
});

describe('probe 3 and 4: the two odd results from expo-updates', () => {
  it('a roll back (isAvailable false, isRollBackToEmbedded true) downloads, and Restart appears', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false, isRollBackToEmbedded: true });
    mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: false, isRollBackToEmbedded: true });
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    expect(row(UPDATE_ROW).props.accessibilityLabel).toMatch(/^Check for updates, (Checking…|Downloading…|Ready to restart)/);
    await settle();
    expect(mockUpdates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(button(RESTART)).toBeDefined();
  });

  it('a download that is not new (isNew false, no roll back) ends as Up to date, row enabled, no Restart', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true, isRollBackToEmbedded: false });
    mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: false, isRollBackToEmbedded: false, manifest: undefined });
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    await settle();
    expect(row(UPDATE_ROW).props.accessibilityLabel).toMatch(/^Check for updates, Up to date/);
    expect(row(UPDATE_ROW).props.accessibilityState).toBeUndefined();
    expect(button(RESTART)).toBeUndefined();
    expect(said()).toEqual(['Checking…', 'Downloading…', 'Up to date. This is the latest version.']);
  });
});

describe('probe 6: unmount while a check is in flight', () => {
  it('finishing after unmount throws nothing and logs no React warning', async () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const check = deferred<{ isAvailable: boolean; isRollBackToEmbedded: boolean }>();
    mockUpdates.checkForUpdateAsync.mockReturnValue(check.promise);
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    act(() => {
      r?.unmount();
    });
    r = undefined;
    check.resolve({ isAvailable: false, isRollBackToEmbedded: false });
    await settle();
    expect(errors.mock.calls.map((c) => c.map(String).join(' ')).filter((m) => /unmounted|memory leak|act\(/i.test(m))).toEqual([]);
    expect(mockUpdates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('a fresh Settings after leaving mid-check starts idle (state is per visit) and can start its own check', async () => {
    const first = deferred<{ isAvailable: boolean; isRollBackToEmbedded: boolean }>();
    mockUpdates.checkForUpdateAsync.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ isAvailable: false, isRollBackToEmbedded: false });
    mount(<Settings />);
    await tap(row(UPDATE_ROW));
    act(() => {
      r?.unmount();
    });
    mount(<Settings />);
    // The row is idle again: the old visit's check is not visible here.
    expect(row(UPDATE_ROW).props.accessibilityLabel).toMatch(/^Check for updates, Small updates usually arrive/);
    expect(row(UPDATE_ROW).props.accessibilityState).toBeUndefined();
    await tap(row(UPDATE_ROW));
    await settle();
    // Documented behaviour: the guard is per hook instance, so a second native check runs while the
    // first one is still pending. expo-updates serialises these natively; nothing here breaks.
    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(2);
    expect(row(UPDATE_ROW).props.accessibilityLabel).toMatch(/^Check for updates, Up to date/);
    first.resolve({ isAvailable: false, isRollBackToEmbedded: false });
    await settle();
    expect(row(UPDATE_ROW).props.accessibilityLabel).toMatch(/^Check for updates, Up to date/);
  });
});

describe('probe 7 and 8: where the row shows, and the demo client never reaches a phone', () => {
  it('on a phone with the screenshot env leaked in and the demo flag set, the real client is used', async () => {
    process.env[SHOTS_KEY] = '1';
    demoGlobal[DEMO_KEY] = 'available';
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false, isRollBackToEmbedded: false });
    mount(<Settings />);
    // The stamp is the phone's, not the demo's "1a2b3c4d-demo".
    expect(allText()).toContain('Update 1a2b3c4d · 5e26d4b');
    await tap(row(UPDATE_ROW));
    await settle();
    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(row(UPDATE_ROW).props.accessibilityLabel).toMatch(/^Check for updates, Up to date/);
    // Even with the env and flag set, a phone where updates are disabled still hides the row.
    act(() => {
      r?.unmount();
    });
    mockUpdates.isEnabled = false;
    mount(<Settings />);
    expect(row(UPDATE_ROW)).toBeUndefined();
    expect(allText()).not.toMatch(/Update (built-in|1a2b3c4d)/);
  });

  it('on the web the env alone (no window flag) keeps the row hidden', () => {
    Platform.OS = 'web';
    process.env[SHOTS_KEY] = '1';
    mount(<Settings />);
    expect(row(UPDATE_ROW)).toBeUndefined();
    expect(allText()).not.toMatch(/Update (built-in|1a2b3c4d)/);
  });

  it('on the web with the env and the window flag, the demo client answers (screenshot build only)', async () => {
    Platform.OS = 'web';
    process.env[SHOTS_KEY] = '1';
    demoGlobal[DEMO_KEY] = 'current';
    mount(<Settings />);
    expect(row(UPDATE_ROW)).toBeDefined();
    expect(allText()).toContain('Update 1a2b3c4d · 5e26d4b');
    await tap(row(UPDATE_ROW));
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    await settle();
    expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(row(UPDATE_ROW).props.accessibilityLabel).toMatch(/^Check for updates, Up to date/);
  });

  it('the hook alone (no Settings) is inert on the web even with updates enabled', async () => {
    Platform.OS = 'web';
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
});

describe('probe 9: the stamp when ids are missing', () => {
  it('no update id and not embedded (an emergency launch) reads built-in with the runtime', () => {
    mockUpdates.updateId = null;
    mount(<Settings />);
    expect(allText()).toContain('Update built-in · 5e26d4b');
  });

  it('no runtime version either: just "Update built-in"', () => {
    mockUpdates.updateId = null;
    mockUpdates.runtimeVersion = null;
    mount(<Settings />);
    expect(allText()).toMatch(/Update built-in(?! ·)/);
  });

  it('embedded launch with an id present still says built-in (the id would be the embedded one)', () => {
    mockUpdates.isEmbeddedLaunch = true;
    mount(<Settings />);
    expect(allText()).toContain('Update built-in · 5e26d4b');
    expect(allText()).not.toContain('Update 1a2b3c4d');
  });
});

describe('copy: nothing reveals the bank size or implies ISACA affiliation', () => {
  it('the row words, hints and the 1.19 What’s New entry', () => {
    const entry = WHATS_NEW.find((e) => e.version === '1.19.0');
    expect(entry).toBeDefined();
    const copy = [
      ...Object.values(UPDATE_WORDS).flatMap((w) => [w.state, w.note]),
      ...(entry?.new ?? []),
      ...(entry?.improved ?? []),
      ...(entry?.fixed ?? []),
    ]
      .filter(Boolean)
      .join(' ');
    expect(copy).not.toMatch(/ISACA|official|endorsed|certified by/i);
    expect(copy).not.toMatch(/\b\d{3,}\b\s*(questions|items)/i);
    expect(copy).not.toMatch(/\d+\s*questions/i);
  });

  it('the Settings screen with the row shown adds no such text beyond the standing trademark notice', () => {
    mount(<Settings />);
    const t = allText();
    // The trademark notice is the one allowed mention, and it says "not affiliated".
    const isaca = t.match(/ISACA/g) ?? [];
    expect(t).toMatch(/not affiliated|independent/i);
    expect(isaca.length).toBeGreaterThan(0);
    expect(t).not.toMatch(/\d{3,}\s*(practice )?questions/i);
  });
});
