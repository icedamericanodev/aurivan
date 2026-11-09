/**
 * Release prep for 2.0.0 (the KaiSip launch), fixes from the final screenshot review:
 * a. Welcome: the whole page, down to the trademark line, fits above Get started on a 390x844 phone
 *    (measured on the web export: the line now ends about 50pt higher than before), and it can still be
 *    scrolled into view at 200% text (the scroll keeps room for the footer).
 * b. Mock exam: the Flag button keeps the same visible word and size when flagged, so the button row
 *    never reflows and Next keeps its width; the spoken name still changes.
 * d. A disabled ghost button ("Copy or share instead") is muted words with no fill, never a beige block.
 * f. A drill intro's level line is two short lines (one sentence each), so no word sits alone.
 * (c, the drill's "Half right", is in drills-p4b.test.tsx; e, the share card's "68 to 78%", in share-card.test.ts.)
 * The launch entry in What's new (2.0.0, "The KaiSip launch") is checked at the end.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, ScrollView, Text } from 'react-native';
import Onboarding from '../app/onboarding';
import SessionScreen from '../app/session';
import { LevelNote } from '../components/game';
import { StickyFooter } from '../components/quiz';
import { Button } from '../components/ui';
import appJson from '../../app.json';
import { EXAM_TRADEMARK_LINE } from '../content/brand';
import { WHATS_NEW } from '../content/support';
import { startMock } from '../lib/sessions';
import { useSession } from '../store/session';
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

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});
const flat = (style: unknown) => Object.assign({}, ...[style].flat(4).filter(Boolean)) as Record<string, number | string | undefined>;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
/** Every vertical gap set in a style under `n` (margins and paddings above and below). */
const verticalSpace = (n: ReactTestInstance) =>
  n
    .findAll((x) => typeof x.type === 'string' && x.props.style)
    .reduce((sum, x) => {
      const s = flat(x.props.style);
      const num = (k: string) => (typeof s[k] === 'number' ? (s[k] as number) : 0);
      return sum + num('marginTop') + num('marginBottom') + num('paddingTop') + num('paddingBottom') + 2 * num('paddingVertical') + 2 * num('marginVertical');
    }, 0);

describe('a. the welcome fits above Get started', () => {
  beforeEach(() => {
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: false, activeCertId: 'cisa', theme: 'light' });
  });

  it('the trademark line is on the page (never under the footer), and the page uses the tighter gaps', () => {
    mount(<Onboarding />);
    const page = r!.root.findAll((n) => n.props.testID === 'welcome-page' && typeof n.type === 'string')[0];
    expect(page).toBeDefined();
    const scroll = r!.root.findAllByType(ScrollView)[0];
    expect(textOf(scroll)).toContain(EXAM_TRADEMARK_LINE);
    expect(textOf(r!.root.findByType(StickyFooter))).not.toContain('trademark');
    // The page's own vertical gaps (above the scroll's footer room). Measured on the web export at
    // 390x844, 52pt less than before is what lifts the trademark line clear of the footer's fade.
    // If this budget grows, re-check the welcome at 390x844 before raising it.
    expect(flat(page.props.style).paddingTop).toBe(16);
    expect(verticalSpace(scroll)).toBeLessThanOrEqual(WELCOME_GAP_BUDGET);
  });

  it('at any text size every line can still be scrolled clear of the footer', () => {
    mount(<Onboarding />);
    const footer = r!.root.findByType(StickyFooter);
    act(() => footer.props.onHeight(230)); // the footer's height at 200% text
    const scroll = r!.root.findAllByType(ScrollView)[0];
    expect(Number(flat(scroll.props.contentContainerStyle).paddingBottom)).toBeGreaterThanOrEqual(230);
  });
});
/** The welcome scroll content's vertical gaps after the 2.0.0 fix: 160 (212 before). */
const WELCOME_GAP_BUDGET = 160;

describe('b. the mock exam Flag button keeps its size', () => {
  beforeEach(() => {
    // A 390pt phone at 100% text, where the review saw the row reflow.
    const w = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...w, width: 390, height: 844, fontScale: 1 }, screen: { ...w, width: 390, height: 844, fontScale: 1 } }));
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa', theme: 'light' });
    act(() => {
      startMock('cisa', 3);
    });
  });
  afterEach(() => {
    act(() => {
      useSession.getState().clear();
    });
  });

  const flagButton = () => r!.root.findAllByType(Button).find((b) => /^(Un)?[Ff]lag question$/.test(String(b.props.accessibilityLabel)))!;
  const sizeOf = (b: ReactTestInstance) => {
    const s = flat(b.props.style);
    return { label: b.props.label, paddingHorizontal: s.paddingHorizontal, minWidth: s.minWidth, flex: s.flex, flexBasis: s.flexBasis };
  };

  it('the visible word stays "Flag"; the spoken name and selected state change', () => {
    mount(<SessionScreen />);
    const before = flagButton();
    expect(before.props.label).toBe('Flag');
    expect(before.props.accessibilityLabel).toBe('Flag question');
    expect(before.props.selected).toBe(false);
    const sizeBefore = sizeOf(before);
    const nextStyle = () => flat(r!.root.findAllByType(Button).find((b) => b.props.label === 'Next')!.props.style);
    const nextBefore = nextStyle();
    act(() => {
      before.props.onPress();
    });
    const after = flagButton();
    expect(after.props.label).toBe('Flag');
    expect(after.props.accessibilityLabel).toBe('Unflag question');
    expect(after.props.selected).toBe(true);
    // The same word, padding and width rules: the row cannot reflow.
    expect(sizeOf(after)).toEqual(sizeBefore);
    // Nothing on screen says "Unflag" any more.
    expect(r!.root.findAllByType(Text).some((t) => t.props.children === 'Unflag')).toBe(false);
    // Next keeps its share of the row (at 100% text it shares the row: flex 1, at least 96 wide).
    expect(nextStyle()).toEqual(nextBefore);
    expect(nextBefore).toMatchObject({ flex: 1, minWidth: 96 });
  });
});

describe('d. a disabled ghost button has no fill', () => {
  it('ghost: transparent, muted words; a solid button keeps its soft disabled fill', () => {
    useSettings.setState({ theme: 'light' });
    mount(
      <>
        <Button kind="ghost" label="Copy or share instead" disabled onPress={() => {}} />
        <Button label="Write the email" disabled onPress={() => {}} />
      </>,
    );
    const hosts = r!.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button');
    const ghost = flat(hosts.find((h) => h.props.accessibilityLabel === 'Copy or share instead')!.props.style);
    const solid = flat(hosts.find((h) => h.props.accessibilityLabel === 'Write the email')!.props.style);
    expect(ghost.backgroundColor).toBe('transparent');
    expect(ghost.borderColor).toBe('transparent');
    expect(solid.backgroundColor).toBe(light.soft);
    const words = r!.root.findAllByType(Text).find((t) => t.props.children === 'Copy or share instead')!;
    expect(flat(words.props.style).color).toBe(light.muted);
  });
});

describe('f. the drill intro level line', () => {
  it('is two lines, one sentence each, said as one stop', () => {
    mount(<LevelNote level="seedling" />);
    const note = r!.root.findAll((n) => n.props.testID === 'level-note' && typeof n.type === 'string')[0];
    expect(note.props.accessibilityLabel).toBe('Your level: Seedling. Two strong rounds in a row grow it.');
    const lines = note.findAllByType(Text).map((t) => textOf(t));
    expect(lines).toEqual(['Your level: Seedling.', 'Two strong rounds in a row grow it.']);
  });
});

describe('the launch entry in What’s new', () => {
  it('is 2.0.0, named "The KaiSip launch", in plain words with no dashes or banned words', () => {
    const launch = WHATS_NEW.find((entry) => entry.version === '2.0.0')!;
    expect(WHATS_NEW[0].version).toBe(appJson.expo.version);
    expect(launch.version).toBe('2.0.0');
    expect(launch.title).toBe('The KaiSip launch');
    expect(launch.needsUpdates).toBeUndefined();
    const lines = [...(launch.new ?? []), ...(launch.improved ?? []), ...(launch.fixed ?? [])];
    expect(lines).toContain('Many fixes for a smoother study session.');
    for (const l of lines) {
      expect(l).not.toMatch(/[—–]/);
      expect(l).not.toMatch(/\b(pass|passed|passing|guarantee\w*|official|evolve\w*|runner-up)\b|you[’']re ready/i);
    }
    // Only the launch has a name; every other entry keeps its "Version" heading.
    expect(WHATS_NEW.filter((e) => e.version !== '2.0.0').every((e) => e.title === undefined)).toBe(true);
  });
});
