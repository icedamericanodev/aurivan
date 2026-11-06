/**
 * Release bug hunt round 2: two lines that promised what the app or website doesn't have.
 * - You > "Your progress" said "Charts and study days", but it opens the readiness report, which has
 *   no study days. It now names what opens.
 * - Help's "Can I bring my progress from the KaiSip website?" named an "Export progress" button the
 *   website never had (it is "Back up", in Settings under Your data), and the website's study app is
 *   not open during the beta.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import You from '../app/(tabs)/you';
import { FAQ } from '../content/support';
import { useProgress } from '../store/progress';
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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

describe('You > Your progress', () => {
  it('describes the readiness report it opens, never study days', () => {
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa' });
    act(() => {
      useProgress.getState().resetCert('cisa');
      useProgress.setState({ plantSettings: { promptHidden: true } });
    });
    let r: ReactTestRenderer | undefined;
    act(() => {
      r = create(<You />);
    });
    const row = r!.root.findAll(
      (n) => typeof n.props.onPress === 'function' && n.props.accessibilityHint === 'Opens your readiness report' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Your progress'),
    )[0];
    expect(row).toBeDefined();
    expect(row.props.accessibilityLabel).not.toMatch(/study days/i);
    expect(row.props.accessibilityLabel).toMatch(/charts/i);
    act(() => r!.unmount());
  });
});

describe("Help: bringing progress from the website", () => {
  it('names the website button that exists (Back up) and says the web app is closed during the beta', () => {
    const entry = FAQ.find((f) => f.id === 'from-website')!;
    const text = entry.answer.join(' ');
    expect(text).not.toMatch(/Export progress/);
    expect(text).toContain('under Your data, choose Back up');
    expect(text).toMatch(/During the beta/);
    expect(text).not.toMatch(/[–—]/);
  });
});
