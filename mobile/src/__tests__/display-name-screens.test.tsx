/**
 * Mobile 1.23, "What should we call you?", on screen:
 * - onboarding: one optional step after the welcome. A name is saved with
 *   the rest in the last tap; Skip and an empty field both mean no name;
 *   the helper line says it stays on the phone;
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
import { selectCert, useProgress } from '../store/progress';
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
const endEditing = () => {
  act(() => {
    field().props.onEndEditing?.({});
  });
};
const setScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale }, screen: { ...w, width: 393, fontScale } });
  });
};
const heading = () => root().findAll((n) => n.props.accessibilityRole === 'header' && /^Good (morning|afternoon|evening)/.test(String(n.props.accessibilityLabel ?? textOf(n))))[0];

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

describe('Today greets by name', () => {
  it.each([
    [9, 'Good morning'],
    [13, 'Good afternoon'],
    [20, 'Good evening'],
  ])('at %i:00 it says "%s, Maya" with a name and "%s" without', (hour, words) => {
    jest.setSystemTime(at(hour));
    useSettings.setState({ displayName: 'Maya' });
    mount(<Today />);
    expect(allText()).toContain(`${words}, Maya`);
    act(() => {
      useSettings.getState().setDisplayName(undefined);
    });
    expect(allText()).toContain(words);
    expect(allText()).not.toContain(`${words},`);
  });

  it('the heading is one stop that reads the whole greeting', () => {
    useSettings.setState({ displayName: 'Maya' });
    mount(<Today />);
    const h = heading();
    expect(h.props.accessibilityLabel).toBe('Good morning, Maya');
    expect(textOf(h)).toBe('Good morning, Maya');
  });

  it('a name changed in Settings shows on Today at once', () => {
    mount(<Today />);
    expect(allText()).not.toContain('Maya');
    act(() => {
      useSettings.getState().setDisplayName('  Maya  ');
    });
    expect(allText()).toContain('Good morning, Maya');
  });

  it('a long name at 200% text wraps and stops at three lines, and screen readers still hear all of it', () => {
    setScale(2);
    const name = 'Wolfeschlegelstein Hausen';
    useSettings.setState({ displayName: name });
    mount(<Today />);
    const h = heading();
    expect(h.props.numberOfLines).toBe(3);
    expect(h.props.accessibilityLabel).toBe(`Good morning, ${name.slice(0, MAX_DISPLAY_NAME)}`);
  });

  it('a bad value in the save (a link) never shows', () => {
    useSettings.setState({ displayName: 'https://example.com' });
    mount(<Today />);
    expect(allText()).toContain('Good morning');
    expect(allText()).not.toContain('example.com');
  });
});

describe('onboarding: "What should we call you?"', () => {
  beforeEach(() => useSettings.setState({ onboarded: false, displayName: undefined }));

  const toNameStep = () => {
    mount(<Onboarding />);
    press('Start my plan');
  };
  /** From the exam step to the end: Continue, skip the starting point, Continue, skip the plant. */
  const finishFromExam = () => {
    press('Continue'); // exam → starting point
    press('Skip this question');
    press('Continue'); // date → plant
    press('Skip for now');
  };
  const finish = () => {
    press('Continue'); // name → exam
    finishFromExam();
  };

  it('comes right after the welcome, is optional, and says it stays on the phone', () => {
    toNameStep();
    expect(allText()).toContain('What should we call you?');
    expect(allText()).toContain('Optional');
    expect(allText()).toContain(NAME_HELPER);
    expect(NAME_HELPER).toBe('Only on this phone. It just helps us say hello.');
    // Not one of the numbered steps: those are still "of 4".
    expect(allText()).not.toMatch(/Step \d of/);
    expect(field().props.maxLength).toBe(MAX_DISPLAY_NAME);
    expect(field().props.value).toBe('');
    expect(field().props.accessibilityHint).toContain('Optional');
    // A clear way past it, and a way back.
    expect(hasButton('Skip')).toBe(true);
    expect(hasButton('Continue')).toBe(true);
    expect(hasButton('Back')).toBe(true);
  });

  it('a typed name is saved with the rest, tidied, and Today greets by it', () => {
    toNameStep();
    type('  Maya   Jane ');
    endEditing();
    expect(field().props.value).toBe('Maya Jane');
    // Nothing is saved before the last step.
    expect(useSettings.getState().displayName).toBeUndefined();
    finish();
    expect(useSettings.getState()).toMatchObject({ onboarded: true, displayName: 'Maya Jane' });
    act(() => {
      r?.unmount();
    });
    mount(<Today />);
    expect(allText()).toContain('Good morning, Maya Jane');
  });

  it('Skip leaves no name, even when something was typed (and the exam step follows)', () => {
    toNameStep();
    type('Maya');
    press('Skip');
    expect(allText()).toContain('Which exam are you preparing for?');
    // Back from the exam step returns to the name step, empty.
    press('Back');
    expect(field().props.value).toBe('');
    press('Skip');
    finishFromExam();
    expect(useSettings.getState().displayName).toBeUndefined();
  });

  it('Continue with the field empty is just as fine as Skip', () => {
    toNameStep();
    press('Continue');
    expect(allText()).toContain('Which exam are you preparing for?');
    press('Continue');
    press('Skip this question');
    press('Continue');
    press('Skip for now');
    expect(useSettings.getState().onboarded).toBe(true);
    expect(useSettings.getState().displayName).toBeUndefined();
  });

  it('something that is not a name (an email) is quietly dropped', () => {
    toNameStep();
    type('maya@example.com');
    press('Continue');
    expect(field()).toBeUndefined();
    expect(allText()).toContain('Which exam are you preparing for?');
    press('Back');
    expect(field().props.value).toBe('');
  });

  it('the keyboard’s Done moves on, like Continue', () => {
    toNameStep();
    type('Maya');
    act(() => {
      field().props.onSubmitEditing();
    });
    expect(allText()).toContain('Which exam are you preparing for?');
    finishFromExam();
    expect(useSettings.getState().displayName).toBe('Maya');
  });

  it('the exam is still saved when the name is skipped (onboarding is otherwise unchanged)', () => {
    toNameStep();
    press('Skip');
    press('Continue');
    press('Skip this question');
    press('Continue');
    press('Skip for now');
    expect(useSettings.getState().activeCertId).toBe('cisa');
    expect(selectCert(useProgress.getState(), 'cisa')).toBeTruthy();
    expect(router.replace).toHaveBeenCalledWith('/home');
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

  it('a link or an email is not saved', () => {
    useSettings.setState({ displayName: 'Maya' });
    mount(<Settings />);
    openRow();
    type('maya@example.com');
    press('Save');
    expect(useSettings.getState().displayName).toBeUndefined();
  });
});
