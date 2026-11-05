/**
 * Release bug hunt round 1: notifications turned off for KaiSip in the phone's settings.
 *
 * Before the fix the app never checked again after the switch was flipped: every launch quietly
 * scheduled 7 reminders the phone would never show, and Settings still said On. Now:
 * - the launch / back-in-the-app refresh schedules nothing while notifications are blocked (and
 *   clears ours), keeping the saved choice ON;
 * - once they are allowed again, the next refresh schedules the 7 again, with no tap;
 * - Settings shows the switch off, says "Notifications are off for KaiSip on this phone." and offers
 *   "Open phone settings". It never asks for permission on its own.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Linking } from 'react-native';
import { refreshReminders } from '../lib/reminderSync';
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false, setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({ category: 'reminders' }),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const mockPermission = { granted: false };
const mockN = {
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockPermission.granted, status: mockPermission.granted ? 'granted' : 'denied', canAskAgain: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockPermission.granted })),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async (req: { identifier: string }) => req.identifier),
};
jest.mock('expo-notifications', () => mockN);

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPermission.granted = false;
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa', reminder: { enabled: true, hour: 19, minute: 30 } });
});

describe('the reminder refresh while notifications are blocked', () => {
  it('schedules nothing, never asks, and keeps the choice on; allowed again, the next refresh schedules 7', async () => {
    await refreshReminders();
    expect(mockN.getPermissionsAsync).toHaveBeenCalled();
    expect(mockN.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockN.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(useSettings.getState().reminder.enabled).toBe(true);

    mockPermission.granted = true;
    await refreshReminders();
    expect(mockN.scheduleNotificationAsync).toHaveBeenCalledTimes(7);
  });
});

describe('Settings > Reminders while notifications are blocked', () => {
  // Loaded here, after the mocks above (Settings imports the reminders module).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Settings = require('../app/settings').default as () => React.ReactElement;
  let r: ReactTestRenderer | undefined;
  afterEach(() => {
    act(() => r?.unmount());
    r = undefined;
  });
  const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
  const reminderSwitch = () => r!.root.findAll((n) => n.props.accessibilityRole === 'switch' && /Study reminder/.test(String(n.props.accessibilityLabel ?? '')))[0];

  it('shows the switch off, says why, and offers the phone settings; the saved choice is untouched', async () => {
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await act(async () => {
      r = create(<Settings />);
      await flush();
    });
    expect(textOf(r!.root)).toContain('Notifications are off for KaiSip on this phone.');
    const sw = reminderSwitch();
    if (sw) expect(sw.props.accessibilityState?.checked ?? sw.props.value).toBe(false);
    const row = r!.root.findAll((n) => typeof n.props.onPress === 'function' && /Open phone settings/.test(String(n.props.accessibilityLabel ?? n.props.title ?? '')))[0];
    expect(row).toBeDefined();
    act(() => {
      row.props.onPress();
    });
    expect(open).toHaveBeenCalled();
    expect(useSettings.getState().reminder.enabled).toBe(true);
    expect(mockN.requestPermissionsAsync).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('allowed: the usual line, no phone-settings row', async () => {
    mockPermission.granted = true;
    await act(async () => {
      r = create(<Settings />);
      await flush();
    });
    expect(textOf(r!.root)).not.toContain('Notifications are off for KaiSip on this phone.');
    expect(textOf(r!.root)).toContain('At most one a day. Turn it off any time.');
  });
});
