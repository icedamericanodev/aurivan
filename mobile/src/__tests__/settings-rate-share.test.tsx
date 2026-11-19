/**
 * Mobile 2.2: "Rate this app" and "Share this app" in Settings → Help and about (a tester's
 * suggestion; components/rateShare.tsx, lib/rateShare.ts).
 *  - where they sit (after "Get help or send feedback", before "About KaiSip"), what a screen reader
 *    says for each, and that they are full-size touch targets;
 *  - Rate is drawn on Android only (no App Store listing yet; the web build has no store page);
 *  - Rate opens Google Play, falls back to the browser, and says so in plain words when neither opens;
 *  - Share hands the share sheet the approved text and nothing else; cancel says nothing; a failure
 *    says so in plain words; nothing ever claims success;
 *  - nothing happens until the learner taps (no prompt on opening Settings).
 */
import { AccessibilityInfo, Alert, Linking, Platform, Share } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Settings from '../app/settings';
import { flushSayLaterForTest } from '../lib/a11y';
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
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const RATE = 'Rate this app';
const SHARE = 'Share this app';
const APP = 'market://details?id=com.kaisip.app';
const WEB = 'https://play.google.com/store/apps/details?id=com.kaisip.app';
const APPROVED_TEXT = 'KaiSip: CISA exam practice that explains why the best answer wins. https://kaisip.com';
const RATE_FAILED = 'Google Play could not be opened on this phone.';
const SHARE_FAILED = 'Sharing is not available on this phone. The link is kaisip.com.';

let r: ReactTestRenderer | undefined;
const mount = () => {
  act(() => {
    r = create(<Settings />);
  });
};
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
/** Everything pressable that is a button (a row shows up once per layer of its component: the first is used). */
const buttons = () => root().findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
/** The buttons' spoken names in screen order, each row once. */
const buttonLabels = () => buttons().map((n) => String(n.props.accessibilityLabel)).filter((l, i, all) => l !== all[i - 1]);
/** A row by the first words a screen reader says for it (its title). */
const row = (title: string) => buttons().find((n) => n.props.accessibilityLabel === title || String(n.props.accessibilityLabel).startsWith(`${title}, `));
const flatStyle = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(3).filter(Boolean));
/** Tap, and let the promise chain settle. */
const tap = async (n: ReactTestInstance) => {
  await act(async () => {
    n.props.onPress();
  });
};
const said = (): string[] => {
  flushSayLaterForTest();
  return [
    ...jest.mocked(AccessibilityInfo.announceForAccessibility).mock.calls.map((c) => String(c[0])),
    ...jest.mocked(AccessibilityInfo.announceForAccessibilityWithOptions).mock.calls.map((c) => String(c[0])),
  ];
};

const realOS = Platform.OS;
let openURL: jest.SpyInstance;
let share: jest.SpyInstance;
let alert: jest.SpyInstance;

beforeEach(() => {
  Platform.OS = 'android';
  // Both rows live on Help and about's own screen (settings-section?category=help).
  mockParams = { category: 'help' };
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {}).mockClear();
  jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => {}).mockClear();
  // React Native's Jest setup already makes some of these jest.fn()s, so their calls and queued answers
  // outlive a test: reset each one before giving it this test's answer.
  openURL = jest.spyOn(Linking, 'openURL').mockReset().mockResolvedValue(undefined);
  share = jest.spyOn(Share, 'share').mockReset().mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
  alert = jest.spyOn(Alert, 'alert').mockReset().mockImplementation(() => {});
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, examDates: { cisa: '2099-01-08' } });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  Platform.OS = realOS;
  jest.restoreAllMocks();
});

describe('where the rows sit and what they say', () => {
  it('Android: both rows, after "Get help or send feedback" and before "About KaiSip"', () => {
    mount();
    const labels = buttonLabels();
    const at = (start: string) => labels.findIndex((l) => l === start || l.startsWith(`${start}, `));
    expect(at('Get help or send feedback')).toBeGreaterThanOrEqual(0);
    expect(at(RATE)).toBe(at('Get help or send feedback') + 1);
    expect(at(SHARE)).toBe(at(RATE) + 1);
    expect(at('About KaiSip')).toBe(at(SHARE) + 1);
    expect(at('Privacy policy')).toBeGreaterThan(at('About KaiSip'));
  });

  it('each is a button with a short name, a hint that says where it goes, and a 48pt touch target', () => {
    mount();
    const rate = row(RATE)!;
    const shareRow = row(SHARE)!;
    expect(rate.props.accessibilityLabel).toBe('Rate this app');
    expect(rate.props.accessibilityHint).toBe('Opens Google Play');
    expect(shareRow.props.accessibilityLabel).toBe('Share this app');
    expect(shareRow.props.accessibilityHint).toBe('Opens your phone’s share options with a link to kaisip.com');
    for (const n of [rate, shareRow]) {
      expect(n.props.accessibilityRole).toBe('button');
      expect(n.props.accessibilityState).toBeUndefined();
      expect(flatStyle(n.props.style).minHeight).toBeGreaterThanOrEqual(48);
    }
  });

  it.each(['ios', 'web'] as const)('%s: no Rate row (there is nowhere to rate yet), Share stays', (os) => {
    Platform.OS = os;
    mount();
    expect(row(RATE)).toBeUndefined();
    expect(allText()).not.toContain(RATE);
    expect(row(SHARE)).toBeDefined();
    // Share takes Rate's place right after the Help row.
    const labels = buttonLabels();
    expect(labels.indexOf(SHARE)).toBe(labels.findIndex((l) => l.startsWith('Get help or send feedback')) + 1);
  });

  it('the rows are on Help and about only, not on the main Settings page', () => {
    mockParams = {};
    mount();
    expect(row(RATE)).toBeUndefined();
    expect(row(SHARE)).toBeUndefined();
  });

  it('opening the screen does nothing on its own: no store, no share sheet, no pop-up, nothing said', () => {
    mount();
    expect(openURL).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
    expect(said()).toEqual([]);
    // No screening question and no reward wording anywhere on the screen.
    expect(allText()).not.toMatch(/enjoy|do you like|love (the|this) app|stars?\b|reward|review us/i);
  });
});

describe('Rate this app', () => {
  it('a tap opens KaiSip in Google Play; nothing is shown or said afterwards', async () => {
    mount();
    await tap(row(RATE)!);
    expect(openURL.mock.calls).toEqual([[APP]]);
    expect(row(RATE)!.props.accessibilityLabel).toBe('Rate this app');
    expect(allText()).not.toContain(RATE_FAILED);
    expect(said()).toEqual([]);
    expect(alert).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
  });

  it('no store app on the phone: the same page opens in the browser, with no error shown', async () => {
    openURL.mockRejectedValueOnce(new Error('No Activity found to handle Intent'));
    mount();
    await tap(row(RATE)!);
    expect(openURL.mock.calls).toEqual([[APP], [WEB]]);
    expect(allText()).not.toContain(RATE_FAILED);
    expect(said()).toEqual([]);
  });

  it('nothing can open it: the row says so in plain words, once, with no crash and no pop-up', async () => {
    openURL.mockRejectedValue(new Error('nothing can open this'));
    mount();
    await tap(row(RATE)!);
    expect(row(RATE)!.props.accessibilityLabel).toBe(`Rate this app, ${RATE_FAILED}`);
    expect(allText()).toContain(RATE_FAILED);
    expect(said()).toEqual([RATE_FAILED]);
    expect(alert).not.toHaveBeenCalled();
    // The Share row is untouched by Rate's failure.
    expect(row(SHARE)!.props.accessibilityLabel).toBe('Share this app');
  });

  it('a later tap that works clears the message', async () => {
    openURL.mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('x'));
    mount();
    await tap(row(RATE)!);
    expect(allText()).toContain(RATE_FAILED);
    await tap(row(RATE)!);
    expect(allText()).not.toContain(RATE_FAILED);
    expect(row(RATE)!.props.accessibilityLabel).toBe('Rate this app');
  });

  it('a quick second tap does not open the store twice', async () => {
    let done!: () => void;
    openURL.mockImplementation(() => new Promise<void>((resolve) => (done = resolve)));
    mount();
    await act(async () => {
      row(RATE)!.props.onPress();
      row(RATE)!.props.onPress();
    });
    expect(openURL).toHaveBeenCalledTimes(1);
    await act(async () => done());
  });
});

describe('Share this app', () => {
  it('a tap opens the share sheet with the approved text and nothing else', async () => {
    mount();
    await tap(row(SHARE)!);
    expect(share.mock.calls).toEqual([[{ message: APPROVED_TEXT }]]);
    expect(share.mock.calls[0]).toHaveLength(1);
    expect(share.mock.calls[0][0]).toStrictEqual({ message: APPROVED_TEXT });
    expect(openURL).not.toHaveBeenCalled();
  });

  it('the text never changes with the learner: a name, an exam date and progress add nothing', async () => {
    useSettings.setState({ displayName: 'Tala', examDates: { cisa: '2027-01-08' } });
    mount();
    await tap(row(SHARE)!);
    expect(share.mock.calls[0][0]).toStrictEqual({ message: APPROVED_TEXT });
    expect(JSON.stringify(share.mock.calls)).not.toMatch(/Tala|2027/);
  });

  it('shared or cancelled: nothing is shown or said (we never claim it was sent)', async () => {
    mount();
    await tap(row(SHARE)!);
    share.mockResolvedValueOnce({ action: Share.dismissedAction, activityType: undefined });
    await tap(row(SHARE)!);
    expect(share).toHaveBeenCalledTimes(2);
    expect(row(SHARE)!.props.accessibilityLabel).toBe('Share this app');
    expect(allText()).not.toContain(SHARE_FAILED);
    expect(allText()).not.toMatch(/shared|sent|thank/i);
    expect(said()).toEqual([]);
    expect(alert).not.toHaveBeenCalled();
  });

  it('no share sheet: the row says so in plain words, once, with no crash and no pop-up', async () => {
    share.mockRejectedValue(new Error('Share is not supported in this browser'));
    mount();
    await tap(row(SHARE)!);
    expect(row(SHARE)!.props.accessibilityLabel).toBe(`Share this app, ${SHARE_FAILED}`);
    expect(allText()).toContain(SHARE_FAILED);
    expect(said()).toEqual([SHARE_FAILED]);
    expect(alert).not.toHaveBeenCalled();
    expect(row(RATE)!.props.accessibilityLabel).toBe('Rate this app');
  });

  it('works where Rate is hidden (iPhone)', async () => {
    Platform.OS = 'ios';
    mount();
    await tap(row(SHARE)!);
    expect(share.mock.calls).toEqual([[{ message: APPROVED_TEXT }]]);
  });
});
