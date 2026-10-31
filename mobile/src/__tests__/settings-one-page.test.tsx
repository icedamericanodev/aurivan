/**
 * Settings, mobile 1.46 "one page, clear groups" (the owner's pick, 27 Oct 2026, after 1.43's rows on
 * paper: "I can't distinguish clearly the categories to its sub categories"):
 *  - each category is its own flat card (no shadow), its mark and title INSIDE the top of the card,
 *    the title a screen-reader header; the order is the order learners change things;
 *  - the theme is one tap, first on the page; said once (the group carries its title and line);
 *  - one-colour marks on the card titles and the doors only, never on rows;
 *  - Your data and Help and about are doors with live summaries; a door's screen names itself in
 *    the bar and takes screen-reader focus there; other categories never open a screen of their own;
 *  - the deep links still work (?section=plant stays on the page, ?open=name opens the sheet);
 *  - no Settings gear on Settings itself, and the gear that opens it settles its pressed circle
 *    before navigating (1.43);
 *  - one-line hints for Starting point and Default mode; "In N days" on the exam date; "Mocks and
 *    weak spots lead Today", with "Lessons stay in Learn." still spoken (1.43).
 */
import { StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Settings from '../app/settings';
import { CLOUD } from '../cloud/flag';
import { SettingsCategoryRow, SettingsGroup } from '../components/settings';
import { IconButton, ScreenTitle } from '../components/ui';
import { copy as cloudCopy } from '../content/cloud/copy';
import { moveFocus } from '../lib/a11y';
import { useBackup } from '../store/backup';
import { useSettings } from '../store/settings';
import { dark, light } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: jest.fn() }));
const mockParams: { current: Record<string, string> } = { current: {} };
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
/** The Theme radio group's one spoken name: its title and line (the visible words are hidden from screen readers). */
const THEME_GROUP = 'Theme. System follows your phone’s light or dark setting.';
const GROUPS = ['Appearance', 'Exam', 'Your study', 'Reminders', 'Practice', 'Badges and your plant', 'You'];
/** The doors, with the cloud build's two before Your data. */
const DOORS = [...(CLOUD ? [cloudCopy('settings.group'), cloudCopy('board.settings.group')] : []), 'Your data', 'Help and about'];
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const hosts = (pred: (n: ReactTestInstance) => boolean) => root().findAll((n) => typeof n.type === 'string' && pred(n));
const render = () =>
  act(() => {
    r = create(<Settings />);
  });

beforeEach(() => {
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, examDates: { cisa: '2099-01-08' } });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  mockParams.current = {};
  mockPush.mockReset();
  jest.mocked(moveFocus).mockClear();
  useBackup.setState({ lastBackupAt: null, undo: null });
});

describe('Settings, mobile 1.46: one page, clear groups', () => {
  it('each category is a flat card with its title inside, a header, in the order learners change things', () => {
    render();
    const groups = root().findAllByType(SettingsGroup);
    expect(groups.map((g) => g.props.title)).toEqual(GROUPS);
    for (const g of groups) {
      const head = g.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header')[0];
      expect(head.props.accessibilityLabel).toBe(g.props.title);
      expect(StyleSheet.flatten(head.props.style).minHeight).toBeGreaterThanOrEqual(44);
      // The card: raised paper, radius 24, no shadow (never a button).
      const card = g.findAll((n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style ?? {}).borderRadius === 24)[0];
      const st = StyleSheet.flatten(card.props.style);
      expect(st.backgroundColor).toBe(light.raised);
      expect(st.boxShadow).toBeUndefined();
      expect(st.elevation).toBeUndefined();
      expect(card.props.onPress).toBeUndefined();
    }
  });

  it('dark: each card has the Grove 1pt line edge, so it stands off the night background (1.5 before Grove)', () => {
    useSettings.setState({ theme: 'dark' });
    render();
    const cards = hosts((n) => StyleSheet.flatten(n.props.style ?? {}).borderRadius === 24);
    expect(cards.length).toBe(GROUPS.length + 1);
    for (const card of cards) {
      const st = StyleSheet.flatten(card.props.style);
      expect(st.backgroundColor).toBe(dark.raised);
      expect(st.borderColor).toBe(dark.line);
      expect(st.borderWidth).toBe(1);
    }
  });

  it('the theme is one tap, first on the page', () => {
    render();
    const theme = hosts((n) => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === THEME_GROUP);
    expect(theme).toHaveLength(1);
    const t = textOf(root());
    expect(t.indexOf('System follows your phone')).toBeLessThan(t.indexOf('Certification'));
    expect(t.indexOf('System follows your phone')).toBeLessThan(t.indexOf('Your name'));
  });

  it('the theme is said once: the visible title and line are hidden, the group carries both (UX P9)', () => {
    render();
    const hidden = hosts((n) => n.props.importantForAccessibility === 'no-hide-descendants' && n.props.accessibilityElementsHidden === true && /^Theme System follows/.test(textOf(n).trim()));
    expect(hidden).toHaveLength(1);
    expect(hosts((n) => n.props.accessibilityLabel === THEME_GROUP)).toHaveLength(1);
  });

  it('one-colour marks on the card titles and the doors only (soft circle, accentText), never on rows', () => {
    render();
    const marks = hosts((n) => {
      const st = StyleSheet.flatten(n.props.style ?? {});
      return st.backgroundColor === light.soft && st.borderRadius === 999;
    });
    expect(marks).toHaveLength(GROUPS.length + DOORS.length);
    for (const m of marks) expect(m.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('Your data and Help and about are doors with live summaries, each opening its own screen', () => {
    useBackup.setState({ lastBackupAt: new Date(2026, 9, 6, 12).getTime(), undo: null });
    render();
    const doors = root().findAllByType(SettingsCategoryRow);
    expect(doors.map((d) => d.props.title)).toEqual(DOORS);
    const data = doors.find((d) => d.props.title === 'Your data')!;
    expect(data.props.summary).toBe('Last backup 6 Oct · back up or move to a new phone');
    const help = doors.find((d) => d.props.title === 'Help and about')!;
    expect(help.props.summary).toBe('Get help, report a problem, privacy and terms');
    const button = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Your data, Last backup 6 Oct, back up or move to a new phone')[0];
    expect(button.props.accessibilityHint).toBe('Opens Your data');
    act(() => data.props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-section', params: { category: 'data' } });
    // Their rows are not on the page itself.
    expect(textOf(root())).not.toContain('Save a backup');
  });

  it('an Undo restore waiting shows on the Your data door', () => {
    useBackup.setState({ undo: { takenAt: Date.now(), file: {} } as never });
    render();
    const data = root().findAllByType(SettingsCategoryRow).find((d) => d.props.title === 'Your data')!;
    expect(data.props.summary).toMatch(/^Undo restore until \d{1,2} \w{3} · back up or move to a new phone$/);
  });

  it('a door’s screen shows only its category, named in the bar, and takes screen-reader focus there', () => {
    mockParams.current = { category: 'data' };
    render();
    const t = textOf(root());
    expect(t).toContain('Save a backup');
    expect(t).toContain('Reset CISA progress');
    expect(t).not.toContain('Daily time');
    expect(hosts((n) => n.props.accessibilityRole === 'header' && n.props.accessibilityLabel === 'Your data')).toHaveLength(1);
    expect(jest.mocked(moveFocus)).toHaveBeenCalledWith(expect.anything(), 350);
  });

  it('Help and about’s screen carries the version line', () => {
    mockParams.current = { category: 'help' };
    render();
    const t = textOf(root());
    expect(t).toContain('Get help or send feedback');
    expect(t).toMatch(/KaiSip v\s*1\.0\.0/);
    expect(t).not.toContain('Daily time');
  });

  it('other categories never open a screen of their own (a stray link shows the page)', () => {
    mockParams.current = { category: 'exam' };
    render();
    const t = textOf(root());
    expect(t).toContain('Daily time');
    expect(t).toContain('Certification');
  });

  it('?section=plant stays on the page (it scrolls to the plant’s card); ?open=name opens the name sheet', () => {
    mockParams.current = { section: 'plant' };
    render();
    expect(textOf(root())).toContain('Show my plant');
    expect(textOf(root())).toContain('Daily time');
    act(() => r!.unmount());
    mockParams.current = { open: 'name' };
    jest.useFakeTimers();
    render();
    // iOS waits for the push to end (LINK_OPEN_FALLBACK_MS) before showing a deep-linked sheet.
    act(() => {
      jest.advanceTimersByTime(800);
    });
    jest.useRealTimers();
    expect(root().findAll((n) => n.props.title === 'Your name' && n.props.visible === true).length).toBeGreaterThan(0);
  });

  it('Reset says what goes and what stays', () => {
    mockParams.current = { category: 'data' };
    render();
    expect(textOf(root())).toContain('Erases your CISA answers, scores, saved questions, mock history and badges on this phone. Your settings stay.');
  });

  it('no Settings gear on Settings itself', () => {
    render();
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

  it('hints, the exam date’s distance, and the short exam-focused line (spoken in full)', () => {
    render();
    const t = textOf(root());
    expect(t).toContain('How much audit you know; it shapes your first weeks');
    expect(t).toContain('How Practice picks your questions');
    expect(t).toMatch(/In \d+ days/);
    expect(t).toContain('Mocks and weak spots lead Today');
    expect(root().findAll((n) => n.props.accessibilityLabel === 'Mocks and weak spots lead Today. Lessons stay in Learn.').length).toBeGreaterThan(0);
  });
});
