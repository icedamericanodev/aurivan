/**
 * Mobile 1.43, Settings (board 5 and the owner's feedback, 26 Oct 2026):
 *  - group titles never look like rows: a letter-spaced caption in accentText, still a header,
 *    and each group's rows sit between two hairlines (a clear start and end);
 *  - the theme is one tap, near the top (Appearance right after You);
 *  - no Settings gear on Settings itself, and the gear that opens it settles its pressed circle
 *    before navigating (the owner saw a gear floating over "Your name" on 1.42.1);
 *  - one-line hints for Starting point and Default mode; "In N days" on the exam date;
 *  - "Mocks and weak spots lead Today", with "Lessons stay in Learn." still spoken;
 *  - no icon circles on the rows.
 */
import { StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Settings from '../app/settings';
import { IconButton, ScreenTitle } from '../components/ui';
import { SettingsGroup } from '../components/settings';
import { useSettings } from '../store/settings';
import { light } from '../theme/tokens';

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
/** The Theme radio group's one spoken name: its title and line (the visible words are hidden from screen readers). */
const THEME_GROUP = 'Theme. System follows your phone’s light or dark setting.';
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const hosts = (pred: (n: ReactTestInstance) => boolean) => root().findAll((n) => typeof n.type === 'string' && pred(n));

beforeEach(() => {
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, examDates: { cisa: '2099-01-08' } });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('Settings, mobile 1.43', () => {
  it('group titles: letter-spaced captions in accentText, headers, with a hairline above and below the rows', () => {
    act(() => {
      r = create(<Settings />);
    });
    const groups = root().findAllByType(SettingsGroup);
    expect(groups.map((g) => g.props.title).slice(0, 3)).toEqual(['You', 'Appearance', 'Exam']);
    for (const g of groups) {
      const title = g.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header')[0];
      const st = StyleSheet.flatten(title.props.style);
      expect(st.color).toBe(light.accentText);
      expect(st.fontSize).toBe(13);
      expect(st.letterSpacing).toBeGreaterThan(0.5);
      expect(textOf(title)).toBe(g.props.title);
    }
    const ruled = hosts((n) => {
      const st = StyleSheet.flatten(n.props.style ?? {});
      return st.borderTopWidth === 1 && st.borderBottomWidth === 1 && st.borderColor === light.line;
    });
    expect(ruled.length).toBe(groups.length);
  });

  it('the theme is one tap near the top, before the Exam group', () => {
    act(() => {
      r = create(<Settings />);
    });
    const theme = hosts((n) => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === THEME_GROUP);
    expect(theme).toHaveLength(1);
    const t = textOf(root());
    expect(t.indexOf('System follows your phone')).toBeLessThan(t.indexOf('Certification'));
    expect(t.indexOf('Your name')).toBeLessThan(t.indexOf('System follows your phone'));
  });

  it('the theme is said once: the visible title and line are hidden, the group carries both (UX P9)', () => {
    act(() => {
      r = create(<Settings />);
    });
    const hidden = hosts((n) => n.props.importantForAccessibility === 'no-hide-descendants' && n.props.accessibilityElementsHidden === true && /^Theme System follows/.test(textOf(n).trim()));
    expect(hidden).toHaveLength(1);
    expect(hosts((n) => n.props.accessibilityLabel === THEME_GROUP)).toHaveLength(1);
  });

  it('no Settings gear on Settings itself', () => {
    act(() => {
      r = create(<Settings />);
    });
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Settings' && typeof n.props.onPress === 'function')).toHaveLength(0);
    expect(root().findAllByType(ScreenTitle)).toHaveLength(0);
  });

  it('the gear that opens Settings settles its pressed circle before it navigates', () => {
    const go = jest.fn();
    act(() => {
      r = create(<ScreenTitle title="You" settings={go} />);
    });
    const gear = root().findByType(IconButton);
    expect(gear.props.leaves).toBe(true);
    const pressable = root().findAll((n) => n.props.accessibilityLabel === 'Settings' && typeof n.props.onPress === 'function')[0];
    act(() => pressable.props.onPressIn?.({}));
    act(() => pressable.props.onPress());
    expect(go).toHaveBeenCalledTimes(1);
  });

  it('hints, the exam date’s distance, the short exam-focused line (spoken in full), and no icon circles', () => {
    act(() => {
      r = create(<Settings />);
    });
    const t = textOf(root());
    expect(t).toContain('How much audit you know; it shapes your first weeks');
    expect(t).toContain('How Practice picks your questions');
    expect(t).toMatch(/In \d+ days/);
    expect(t).toContain('Mocks and weak spots lead Today');
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Mocks and weak spots lead Today. Lessons stay in Learn.').length).toBeGreaterThan(0);
    // No icon circles on the rows (iOS-settings boilerplate, spec §0): every row's first child is its words.
    expect(hosts((n) => StyleSheet.flatten(n.props.style ?? {}).backgroundColor === light.soft && StyleSheet.flatten(n.props.style ?? {}).borderRadius === 999)).toHaveLength(0);
  });
});
