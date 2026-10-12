/**
 * Mobile 1.15 onboarding (PHASE5.md §1, §2.1, §2.2): "Where are you starting
 * from?" is step 2 of 4 (no preselected row; Continue waits for a choice;
 * "Skip this question" leaves it unset), the date step asks for minutes too
 * (20 by default), and the plant step is 4 of 4. Nothing saves until the
 * last step, which saves the exam, the date and the fit together and
 * answers the Today card. Android back walks 4 → 0; Restore skips it all.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { BackHandler, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Onboarding from '../app/onboarding';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
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

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const pressable = (label: RegExp) =>
  root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel));
const press = (label: RegExp) => {
  const n = pressable(label)[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const checkedRadio = (group: string) => {
  const g = root().findAll((x) => x.props.accessibilityRole === 'radiogroup' && x.props.accessibilityLabel === group && typeof x.type !== 'string')[0];
  if (!g) throw new Error(`no radiogroup ${group}`);
  return g.findAll((x) => x.props.accessibilityRole === 'radio' && x.props.accessibilityState?.checked && typeof x.props.onPress === 'function').map((x) => x.props.accessibilityLabel as string);
};

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    // No plant prompt by default: these tests are about the fit.
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', examDates: { cisa: '2027-06-01' } });
  jest.mocked(router.push).mockClear();
  jest.mocked(router.replace).mockClear();
  jest.mocked(router.back).mockClear();
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});

const caption = () => allText().match(/Step \d of \d/)?.[0];
const continueBtn = () => root().findAll((x) => x.props.label === 'Continue' && x.props.onPress)[0];

describe('onboarding: where you start and how long you have', () => {
  beforeEach(() => useSettings.setState({ onboarded: false }));

  it('step captions run 1 to 4 of 4, and the plant step is last', () => {
    mount(<Onboarding />);
    press(/^Start my plan$/);
    expect(caption()).toBe('Step 1 of 4');
    press(/^Continue$/);
    expect(caption()).toBe('Step 2 of 4');
    expect(allText()).toContain('Where are you starting from?');
    expect(allText()).toContain('This shapes your first week. You can change it any time in Settings.');
    press(/^Skip this question$/);
    expect(caption()).toBe('Step 3 of 4');
    expect(allText()).toContain('How long can you study most days?');
    press(/^Continue$/);
    expect(caption()).toBe('Step 4 of 4');
    expect(allText()).toContain('Plant something that grows with you');
  });

  it('no row is chosen at first, and Continue waits for one (its hint says how to move on)', () => {
    mount(<Onboarding />);
    press(/^Start my plan$/);
    press(/^Continue$/);
    expect(checkedRadio('Where are you starting from?')).toEqual([]);
    expect(continueBtn().props.disabled).toBe(true);
    expect(continueBtn().props.accessibilityHint).toBe('Choose one, or skip this question.');
    press(/^New to audit/);
    expect(checkedRadio('Where are you starting from?')).toEqual(['New to audit, I’m new to IT audit, or I’ve just graduated.']);
    expect(continueBtn().props.disabled).toBe(false);
    expect(continueBtn().props.accessibilityHint).toBeUndefined();
  });

  it('the minutes default to 20, spoken "20 minutes a day"; nothing saves before the last step', () => {
    mount(<Onboarding />);
    press(/^Start my plan$/);
    press(/^Continue$/);
    press(/^Skip this question$/);
    expect(checkedRadio('Daily time')).toEqual(['20 minutes a day']);
    press(/^45 minutes a day$/);
    expect(checkedRadio('Daily time')).toEqual(['45 minutes a day']);
    expect(allText()).toContain('A rough guess is fine. Short days still count, and days don’t need to be in a row.');
    expect(allText()).toContain('For your countdown. A rough date is fine.');
    expect(useSettings.getState().onboarded).toBe(false);
    expect(useSettings.getState().dailyMinutes).toBeUndefined();
  });

  it('finishing saves the exam, the date and the fit together, and answers the Today card', () => {
    mount(<Onboarding />);
    press(/^Start my plan$/);
    press(/^Continue$/);
    press(/^Experienced practitioner/);
    press(/^Continue$/);
    press(/^In 3 months$/);
    press(/^30 minutes a day$/);
    press(/^Continue$/);
    press(/^Skip for now$/);
    expect(useSettings.getState()).toMatchObject({ onboarded: true, activeCertId: 'cisa', familiarity: 'experienced', dailyMinutes: 30, dailyGoal: 20, fitPrompt: 'answered' });
    expect(useSettings.getState().examDates.cisa).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(router.replace).toHaveBeenCalledWith('/home');
  });

  it('"Skip this question" leaves familiarity unset (it plans like "some"); Plant it saves the same tap', () => {
    mount(<Onboarding />);
    press(/^Start my plan$/);
    press(/^Continue$/);
    press(/^New to audit/);
    // Skipping after choosing clears the choice: skip means "not said".
    press(/^Skip this question$/);
    press(/^Continue$/);
    press(/^Plant it$/);
    expect(useSettings.getState()).toMatchObject({ onboarded: true, dailyMinutes: 20, fitPrompt: 'answered' });
    expect(useSettings.getState().familiarity).toBeUndefined();
    expect(selectCert(useProgress.getState(), 'cisa').plant).toBeDefined();
  });

  it('Android back walks 4 → 3 → 2 → 1 → 0, keeping the answers', () => {
    type Handler = () => boolean | null | undefined;
    const subs: Handler[] = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, h) => {
      const fn = h as unknown as Handler;
      subs.push(fn);
      return { remove: () => subs.splice(subs.indexOf(fn), 1) };
    });
    const back = () => {
      let handled: boolean | null | undefined;
      act(() => {
        handled = subs[subs.length - 1]();
      });
      return handled;
    };
    mount(<Onboarding />);
    press(/^Start my plan$/);
    press(/^Continue$/);
    press(/^Some IT audit experience/);
    press(/^Continue$/);
    press(/^Continue$/);
    expect(caption()).toBe('Step 4 of 4');
    expect(back()).toBe(true);
    expect(caption()).toBe('Step 3 of 4');
    expect(back()).toBe(true);
    expect(caption()).toBe('Step 2 of 4');
    expect(checkedRadio('Where are you starting from?')).toEqual(['Some IT audit experience, I work in IT, risk or audit, or I’ve studied some of it.']);
    expect(back()).toBe(true);
    expect(caption()).toBe('Step 1 of 4');
    expect(back()).toBe(true);
    expect(caption()).toBeUndefined();
    expect(allText()).toContain('Start my plan');
    // On the welcome step, back is the phone's own (the app closes).
    expect(back()).toBe(false);
  });

  it('Restore from a backup skips every step (a pre-1.15 file has no fit, so Today may ask later)', () => {
    mount(<Onboarding />);
    expect(pressable(/^Restore from a backup$/)).toHaveLength(1);
    expect(allText()).not.toMatch(/Step \d of 4/);
  });
});
