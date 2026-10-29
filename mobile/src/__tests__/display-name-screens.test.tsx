/**
 * Mobile 1.23, "What should we call you?", on screen:
 * - onboarding (mobile 1.41): no name step any more. Today asks once, from
 *   the day after the first study day. Mobile 1.44: the field is in the card
 *   ("Name or nickname", Save, Not now) and "Saved on this device" stays for
 *   the visit; learners from before 1.41 with no name are asked once too;
 * - Settings: a "Your name" row (the name, or "Not set") opening a small
 *   sheet to edit, save and clear it; Cancel changes nothing;
 * - Today: "Good morning, Maya" (afternoon, evening) with a name and plain
 *   "Good morning" without; read in full by screen readers, and a long name
 *   at 200% text wraps and stops at three lines instead of overflowing.
 * The privacy side (no emails, share cards, sync) is in display-name.test.ts.
 */
import { Dimensions } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import Onboarding from '../app/onboarding';
import Settings from '../app/settings';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { NAME_HELPER } from '../components/displayName';
import { MAX_DISPLAY_NAME } from '../engine/displayName';
import { completeCert, selectCert, useProgress } from '../store/progress';
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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useNavigation: () => ({ addListener: () => () => {} }),
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(root());
const hosts = (pred: (n: ReactTestInstance) => boolean) => root().findAll((n) => typeof n.props.onPress === 'function' && pred(n));
const press = (label: string | RegExp) => {
  const n = hosts((x) => (typeof label === 'string' ? x.props.accessibilityLabel === label : label.test(String(x.props.accessibilityLabel))))[0];
  if (!n) throw new Error(`nothing to press: ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const hasButton = (label: string | RegExp) => hosts((x) => (typeof label === 'string' ? x.props.accessibilityLabel === label : label.test(String(x.props.accessibilityLabel)))).length > 0;
const field = () => root().findAll((n) => n.props.accessibilityLabel === 'Your name' && typeof n.props.onChangeText === 'function')[0];
const type = (text: string) => {
  act(() => {
    field().props.onChangeText(text);
  });
};
const setScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale }, screen: { ...w, width: 393, fontScale } });
  });
};
const heading = () => root().findAll((n) => n.props.accessibilityRole === 'header' && /^Good (morning|afternoon|evening)|days? to go$/.test(String(n.props.accessibilityLabel ?? textOf(n))))[0];

const at = (h: number) => new Date(2026, 9, 15, h, 0, 0);

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(at(9));
  setScale(1);
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
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 30, examDates: { cisa: '2026-11-22' } });
  jest.mocked(router.push).mockClear();
  jest.mocked(router.replace).mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Mobile 1.51 (Field Guide, the owner's option A): the countdown is Today's title ("Maya, 38 days to go");
// with no exam date the title is still the greeting by the hour.
describe('Today greets by name', () => {
  it.each([
    [9, 'Good morning'],
    [13, 'Good afternoon'],
    [20, 'Good evening'],
  ])('with no exam date, at %i:00 it says "%s, Maya" with a name and "%s" without', (hour, words) => {
    jest.setSystemTime(at(hour));
    useSettings.setState({ displayName: 'Maya', examDates: {} });
    mount(<Today />);
    expect(allText()).toContain(`${words}, Maya`);
    act(() => {
      useSettings.getState().setDisplayName(undefined);
    });
    expect(allText()).toContain(words);
    expect(allText()).not.toContain(`${words},`);
  });

  it('the heading is one stop that reads the whole title: "Maya, 38 days to go"', () => {
    useSettings.setState({ displayName: 'Maya' });
    mount(<Today />);
    const h = heading();
    expect(h.props.accessibilityLabel).toBe('Maya, 38 days to go');
    expect(textOf(h)).toBe('Maya, 38 days to go');
  });

  it('a name changed in Settings shows on Today at once', () => {
    mount(<Today />);
    expect(allText()).not.toContain('Maya');
    act(() => {
      useSettings.getState().setDisplayName('  Maya  ');
    });
    expect(allText()).toContain('Maya, 38 days to go');
  });

  it('a long name at 200% text wraps and stops at three lines, and screen readers still hear all of it', () => {
    setScale(2);
    const name = 'Wolfeschlegelstein Hausen';
    useSettings.setState({ displayName: name });
    mount(<Today />);
    const h = heading();
    expect(h.props.numberOfLines).toBe(3);
    expect(h.props.accessibilityLabel).toBe(`${name.slice(0, MAX_DISPLAY_NAME)}, 38 days to go`);
  });

  it('a bad value in the save (a link) never shows', () => {
    useSettings.setState({ displayName: 'https://example.com' });
    mount(<Today />);
    expect(allText()).toContain('38 days to go');
    expect(allText()).not.toContain('example.com');
  });
});

describe('mobile 1.41: the name is asked later, on Today, once', () => {
  beforeEach(() => {
    useSettings.setState({ onboarded: false, displayName: undefined });
    useSeen.setState({ nameAsk: undefined, tester: undefined, plantOffer: undefined });
  });

  const onboard = () => {
    mount(<Onboarding />);
    press('Get started');
    press('Skip this question'); // starting point → date and minutes
    press('Start my first questions');
    act(() => {
      r?.unmount();
    });
  };
  /** The learner has studied on `days` days, the last one `lastDay` days ago (0 = today). */
  const studied = (days: number, lastDay: number) =>
    act(() => {
      const last = new Date(2026, 9, 15 - lastDay, 12);
      const key = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
      useProgress.setState((st) => ({ byCert: { ...st.byCert, cisa: completeCert({ ...selectCert(st, 'cisa'), milestones: { earned: {}, days, lastDay: key } }) } }));
    });
  const card = () => root().findAll((n) => n.props.testID === 'name-ask' && typeof n.type === 'string');
  /** Mobile 1.44: the field inside Today's card. */
  const cardField = () => root().findAll((n) => n.props.accessibilityLabel === 'Name or nickname' && typeof n.props.onChangeText === 'function')[0];
  const typeIn = (f: () => ReactTestInstance, text: string) =>
    act(() => {
      f().props.onChangeText(text);
    });
  const saveButton = () => root().findAll((n) => n.props.accessibilityLabel === 'Save my name' && n.props.accessibilityRole === 'button')[0];

  it('onboarding has no name step, and CISA is still chosen; Today will ask later', () => {
    mount(<Onboarding />);
    press('Get started');
    expect(allText()).not.toContain('What should we call you?');
    expect(field()).toBeUndefined();
    press('Skip this question');
    press('Start my first questions');
    expect(useSettings.getState()).toMatchObject({ onboarded: true, activeCertId: 'cisa' });
    expect(useSettings.getState().displayName).toBeUndefined();
    expect(useSeen.getState().nameAsk).toBe('due');
    // Straight into the first five questions.
    expect(router.replace).toHaveBeenCalledWith('/session');
  });

  it('a name already saved (a restore) is kept, and is never asked for', () => {
    useSettings.setState({ displayName: 'Maya' });
    onboard();
    expect(useSettings.getState().displayName).toBe('Maya');
    expect(useSeen.getState().nameAsk).toBeUndefined();
  });

  it('not on the first study day; the next day, one quiet card that saves a tidied name', () => {
    onboard();
    studied(1, 0);
    mount(<Today />);
    expect(card()).toHaveLength(0);
    act(() => {
      r?.unmount();
    });
    studied(1, 1);
    mount(<Today />);
    expect(card()).toHaveLength(1);
    expect(allText()).toContain('What should we call you?');
    // Mobile 1.44: the field is in the card ("Name or nickname"), with Save and Not now.
    expect(allText()).toContain('Optional. A first name or a nickname, kept on this device only.');
    // Showing it counts as asked (once ever).
    expect(useSeen.getState().nameAsk).toBe('shown');
    const box = cardField();
    expect(box.props.maxLength).toBe(MAX_DISPLAY_NAME);
    expect(box.props.placeholder).toBe('Name or nickname');
    // Save with nothing typed saves nothing, and says what to do.
    expect(saveButton()).toBeTruthy();
    press('Save my name');
    expect(useSettings.getState().displayName).toBeUndefined();
    expect(allText()).toContain('Type a name or nickname first, or choose Not now.');
    expect(card()).toHaveLength(1);
    typeIn(cardField, '  Maya   Jane ');
    // Typing takes the hint away.
    expect(allText()).not.toContain('Type a name or nickname first');
    act(() => {
      cardField().props.onEndEditing?.({});
    });
    press('Save my name');
    expect(useSettings.getState().displayName).toBe('Maya Jane');
    expect(allText()).toContain('Good morning, Maya Jane');
    // For the rest of this visit, one line takes the card's place.
    expect(card()).toHaveLength(0);
    expect(allText()).toContain('Saved on this device');
    expect(allText()).toContain('Change or clear it any time in Settings.');
    // The next visit: nothing.
    act(() => {
      r?.unmount();
    });
    mount(<Today />);
    expect(allText()).not.toContain('Saved on this device');
    expect(card()).toHaveLength(0);
  });

  it('a link or an email is not saved: the card stays and says why', () => {
    onboard();
    studied(2, 1);
    mount(<Today />);
    typeIn(cardField, 'maya@example.com');
    press('Save my name');
    expect(useSettings.getState().displayName).toBeUndefined();
    expect(cardField()).toBeTruthy();
    expect(allText()).toContain('looks like a web address or an email');
  });

  it('"Not now" puts it away for good; Settings keeps the name row', () => {
    onboard();
    studied(2, 1);
    mount(<Today />);
    press('Not now, no name');
    expect(card()).toHaveLength(0);
    expect(useSettings.getState().displayName).toBeUndefined();
    act(() => {
      r?.unmount();
    });
    mount(<Today />);
    expect(card()).toHaveLength(0);
  });

  it('mobile 1.44: learners who onboarded before 1.23 (no name step, so never asked) are asked once, with no new onboarding', () => {
    useSettings.setState({ onboarded: true });
    // No `newLearner` flag: onboarded before 1.24.
    useSeen.setState({ reminderAsk: {} });
    studied(5, 1);
    mount(<Today />);
    expect(card()).toHaveLength(1);
    expect(useSeen.getState().nameAsk).toBe('shown');
    expect(useSettings.getState().onboarded).toBe(true);
    act(() => {
      r?.unmount();
    });
    mount(<Today />);
    expect(card()).toHaveLength(0);
  });

  it('mobile 1.44: learners who onboarded on 1.23–1.40 (they saw the name step and skipped it) are not asked again', () => {
    useSettings.setState({ onboarded: true });
    // Their onboarding set the `newLearner` flag (1.24+) but never `nameAsk`.
    useSeen.setState({ reminderAsk: { newLearner: true, first: 'later' } });
    studied(5, 1);
    mount(<Today />);
    expect(card()).toHaveLength(0);
    expect(useSeen.getState().nameAsk).toBeUndefined();
  });

  it('mobile 1.44: learners who onboarded on 1.41+ are asked once, as before', () => {
    useSettings.setState({ onboarded: true });
    useSeen.setState({ reminderAsk: { newLearner: true }, nameAsk: 'due' });
    studied(5, 1);
    mount(<Today />);
    expect(card()).toHaveLength(1);
    expect(useSeen.getState().nameAsk).toBe('shown');
  });

  it('mobile 1.44: a learner from before 1.23 with a name is never asked, and nothing is set up for them', () => {
    useSettings.setState({ onboarded: true, displayName: 'Maya' });
    useSeen.setState({ reminderAsk: {} });
    studied(5, 1);
    mount(<Today />);
    expect(card()).toHaveLength(0);
    expect(useSeen.getState().nameAsk).toBeUndefined();
  });
});

describe('Settings → Your name', () => {
  const row = () => hosts((n) => n.props.accessibilityRole === 'button' && /^Your name, /.test(String(n.props.accessibilityLabel)))[0];
  const openRow = () => {
    act(() => {
      row().props.onPress();
    });
  };

  it('is a row that says the name, or "Not set"', () => {
    mount(<Settings />);
    expect(row().props.accessibilityLabel).toBe('Your name, not set');
    expect(allText()).toContain('Not set');
    act(() => {
      useSettings.getState().setDisplayName('Maya');
    });
    expect(row().props.accessibilityLabel).toBe('Your name, Maya');
  });

  it('opens a sheet that starts from the saved name; Save tidies and saves it', () => {
    useSettings.setState({ displayName: 'Maya' });
    mount(<Settings />);
    openRow();
    expect(field().props.value).toBe('Maya');
    expect(allText()).toContain(NAME_HELPER);
    type('  Maya   Jane ');
    press('Save');
    expect(useSettings.getState().displayName).toBe('Maya Jane');
    expect(field()).toBeUndefined(); // the sheet closed
    expect(row().props.accessibilityLabel).toBe('Your name, Maya Jane');
  });

  it('adds a name when there is none; "Clear my name" is only offered when one is saved', () => {
    mount(<Settings />);
    openRow();
    expect(field().props.value).toBe('');
    expect(hasButton('Clear my name')).toBe(false);
    type('Maya');
    press('Save');
    expect(useSettings.getState().displayName).toBe('Maya');
    openRow();
    expect(hasButton('Clear my name')).toBe(true);
  });

  it('Clear my name removes it, and Today stops using it', () => {
    useSettings.setState({ displayName: 'Maya' });
    mount(<Settings />);
    openRow();
    press('Clear my name');
    expect(useSettings.getState().displayName).toBeUndefined();
    expect(row().props.accessibilityLabel).toBe('Your name, not set');
  });

  it('saving an empty box clears it too; Cancel changes nothing', () => {
    useSettings.setState({ displayName: 'Maya' });
    mount(<Settings />);
    openRow();
    type('Sam');
    press(/^Cancel, Your name$/);
    expect(useSettings.getState().displayName).toBe('Maya');
    openRow();
    expect(field().props.value).toBe('Maya'); // the draft starts again from what is saved
    type('   ');
    press('Save');
    expect(useSettings.getState().displayName).toBeUndefined();
  });

  it('a link or an email is not saved, and the old name stays', () => {
    useSettings.setState({ displayName: 'Maya' });
    mount(<Settings />);
    openRow();
    type('maya@example.com');
    press('Save');
    expect(useSettings.getState().displayName).toBe('Maya');
  });
});
