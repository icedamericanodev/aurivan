/**
 * Release bug hunt round 2: an outside link to kaisip://onboarding reopened the welcome flow for a
 * learner who had already finished it, and finishing it again erased their exam date, starting point,
 * daily time and today's plan ticks. Now:
 * - the onboarding screen sends an onboarded learner to Today (every saved setting kept);
 * - the outside-link hook sends kaisip://onboarding to Today for an onboarded learner, and still lets a
 *   new learner through.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { redirectSystemPath } from '../app/+native-intent';
import Onboarding from '../app/onboarding';
import { redirectOnboardedPath } from '../lib/legacyLinks';
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
jest.mock('expo-router', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
    Redirect: ({ href }: { href: string }) => createElement(RNText, { testID: 'redirect' }, href),
    useFocusEffect: jest.fn(),
    useLocalSearchParams: () => ({}),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const SAVED = { examDates: { cisa: '2027-06-01' }, familiarity: 'experienced' as const, dailyMinutes: 45 as const };

let r: ReactTestRenderer | undefined;
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

describe('the onboarding screen for a learner who already finished it', () => {
  it('goes to Today and keeps the exam date, starting point and daily time', () => {
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa', ...SAVED });
    act(() => {
      r = create(<Onboarding />);
    });
    const redirect = r!.root.findAll((n) => n.props.testID === 'redirect' && n.type === Text);
    expect(redirect).toHaveLength(1);
    expect(redirect[0].props.children).toBe('/home');
    expect(r!.root.findAll((n) => n.props.label === 'Get started' || n.props.accessibilityLabel === 'Get started')).toHaveLength(0);
    expect(useSettings.getState()).toMatchObject({ onboarded: true, ...SAVED });
  });

  it('a new learner still sees the welcome', () => {
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: false, activeCertId: 'cisa' });
    act(() => {
      r = create(<Onboarding />);
    });
    expect(r!.root.findAll((n) => n.props.testID === 'redirect')).toHaveLength(0);
    expect(r!.root.findAll((n) => typeof n.props.onPress === 'function' && (n.props.label === 'Get started' || n.props.accessibilityLabel === 'Get started')).length).toBeGreaterThan(0);
  });
});

describe('an outside link to onboarding', () => {
  it('lands on Today for an onboarded learner, and on onboarding for a new one', () => {
    useSettings.setState({ onboarded: true });
    expect(redirectSystemPath({ path: 'kaisip://onboarding', initial: true })).toBe('/home');
    expect(redirectSystemPath({ path: '/onboarding?x=1', initial: false })).toBe('/home');
    useSettings.setState({ onboarded: false });
    expect(redirectSystemPath({ path: 'kaisip://onboarding', initial: true })).toBe('kaisip://onboarding');
  });
  it('other links pass through unchanged, and the check is asked only for onboarding', () => {
    const ask = jest.fn(() => true);
    expect(redirectOnboardedPath('kaisip://practice', ask)).toBe('kaisip://practice');
    expect(ask).not.toHaveBeenCalled();
    expect(redirectOnboardedPath('kaisip://onboarding/', ask)).toBe('/home');
  });
});
