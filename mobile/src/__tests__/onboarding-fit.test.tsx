/**
 * Onboarding after mobile 1.24 ("first five minutes"): a literal welcome, an
 * optional name, then 2 numbered steps ("Where are you starting from?" is 1 of 2,
 * the date and minutes are 2 of 2, with a line saying what they add up to).
 * There is no exam step (CISA is chosen) and no plant step. Nothing saves
 * until the last button, which saves the date and the fit together, makes
 * Day 1's plan, and starts the first five questions. Android back walks
 * 3 → 2 → 1 → 0; Restore skips it all.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { BackHandler, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Onboarding from '../app/onboarding';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { firstSetIds } from '../content/firstSet';
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
/** Welcome → "Where are you starting from?" (mobile 1.41: no name step any more). */
const toStartingPoint = () => {
  press(/^Get started$/);
};

describe('the welcome screen: literal, names the exam, no metaphors', () => {
  beforeEach(() => useSettings.setState({ onboarded: false }));

  it('says what it is, in four plain lines, and keeps the not-affiliated line', () => {
    mount(<Onboarding />);
    const t = allText();
    expect(t).toContain('Think like an IS auditor.');
    expect(t).toContain('CISA exam prep, taught the way the exam thinks.');
    // Mobile 1.41: the best feature first, in the web welcome's words.
    expect(t).toContain('Questions that explain every option, the trap included.');
    expect(t).toContain('Your daily plan, built around your exam date.');
    expect(t).not.toContain('About 20 min a day.');
    expect(t).toContain('Progress shown as a range, never a promise.');
    expect(t).toContain('No account. Everything stays on your phone.');
    expect(t).toMatch(/Not affiliated with or endorsed by ISACA/);
    // The four metaphor rows and the old-app line are gone.
    expect(t).not.toMatch(/Grow with the seasons|Grow deep roots|Stand tall|See the path|Moving from|Aurivan/);
    expect(t).not.toContain('Master Modern Risk.');
  });

  it('mobile 1.41: "Get started" leads straight to the starting point (no name step), and Restore from a backup is still there', () => {
    mount(<Onboarding />);
    expect(pressable(/^Restore from a backup$/)).toHaveLength(1);
    // Its hint no longer speaks of the old app.
    expect(pressable(/^Restore from a backup$/)[0].props.accessibilityHint).toBe('Studied on another phone or on the KaiSip website? Pick your backup or progress file to bring your progress here.');
    press(/^Get started$/);
    expect(allText()).toContain('Where are you starting from?');
    expect(allText()).not.toContain('What should we call you?');
  });
});

describe('onboarding: where you start and how long you have', () => {
  beforeEach(() => useSettings.setState({ onboarded: false }));

  it('step captions run 1 to 2 of 2, with no exam step and no plant step', () => {
    mount(<Onboarding />);
    toStartingPoint();
    expect(caption()).toBe('Step 1 of 2');
    expect(allText()).toContain('Where are you starting from?');
    expect(allText()).toContain('This shapes your first week. You can change it any time in Settings.');
    // CISA is chosen for the learner: there are no "coming soon" exams to look at.
    expect(allText()).not.toMatch(/Which exam|coming soon/i);
    press(/^Skip this question$/);
    expect(caption()).toBe('Step 2 of 2');
    expect(allText()).toContain('How long can you study most days?');
    expect(allText()).not.toMatch(/Plant|Planted|Step \d of 4/);
    expect(pressable(/^Start my first questions$/)).toHaveLength(1);
  });

  it('no row is chosen at first, and Continue waits for one (its hint says how to move on)', () => {
    mount(<Onboarding />);
    toStartingPoint();
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
    toStartingPoint();
    press(/^Skip this question$/);
    expect(checkedRadio('Daily time')).toEqual(['20 minutes a day']);
    press(/^45 minutes a day$/);
    expect(checkedRadio('Daily time')).toEqual(['45 minutes a day']);
    expect(allText()).toContain('A rough guess is fine. Short days still count, and days don’t need to be in a row.');
    expect(allText()).toContain('For your countdown. A rough date is fine.');
    expect(useSettings.getState().onboarded).toBe(false);
    expect(useSettings.getState().dailyMinutes).toBeUndefined();
  });

  it('a plain line says what the date and the minutes add up to, and follows both choices', () => {
    mount(<Onboarding />);
    toStartingPoint();
    press(/^Skip this question$/);
    // No date yet: says what the plan does instead.
    expect(allText()).toMatch(/No date yet: your plan starts at about 20 min a day\./);
    press(/^In 3 months$/);
    expect(allText()).toMatch(/\d+ (weeks|months): 20 min a day adds up to about \d+ hours of study\./);
    press(/^45 minutes a day$/);
    expect(allText()).toMatch(/: 45 min a day adds up to about/);
  });

  it('the last button saves the date and the fit together, makes Day 1, and starts the first five', () => {
    mount(<Onboarding />);
    toStartingPoint();
    press(/^Experienced practitioner/);
    press(/^Continue$/);
    press(/^In 3 months$/);
    press(/^30 minutes a day$/);
    press(/^Start my first questions$/);
    expect(useSettings.getState()).toMatchObject({ onboarded: true, activeCertId: 'cisa', familiarity: 'experienced', dailyMinutes: 30, dailyGoal: 20, fitPrompt: 'answered' });
    expect(useSettings.getState().examDates.cisa).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Straight into the first set: the same five questions, no timer.
    const s = useSession.getState().active!;
    expect(s.firstSet).toBe(true);
    expect(s.questionIds).toEqual([...firstSetIds('cisa')]);
    expect(s.timed).toBeFalsy();
    expect(router.replace).toHaveBeenCalledWith('/session');
    // Day 1's plan was made before any answer, so the five answers tick it off.
    const plan = useProgress.getState().days.cisa;
    expect(plan.items).toEqual([{ kind: 'practice', count: 5, label: 'Your first five', why: 'first' }]);
    expect(plan.done).toEqual([false]);
    // No plant question: a seed comes after the first set.
    expect(selectCert(useProgress.getState(), 'cisa').plant).toBeUndefined();
    expect(useProgress.getState().plantSettings?.promptHidden).toBe(true);
  });

  it('"Skip this question" leaves familiarity unset (it plans like "some"); the same tap saves the rest', () => {
    mount(<Onboarding />);
    toStartingPoint();
    press(/^New to audit/);
    // Skipping after choosing clears the choice: skip means "not said".
    press(/^Skip this question$/);
    press(/^Start my first questions$/);
    expect(useSettings.getState()).toMatchObject({ onboarded: true, dailyMinutes: 20, fitPrompt: 'answered' });
    expect(useSettings.getState().familiarity).toBeUndefined();
  });

  it('Android back walks 2 → 1 → 0 (mobile 1.41: no name step), keeping the answers', () => {
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
    toStartingPoint();
    press(/^Some IT audit experience/);
    press(/^Continue$/);
    expect(caption()).toBe('Step 2 of 2');
    expect(back()).toBe(true);
    expect(caption()).toBe('Step 1 of 2');
    expect(checkedRadio('Where are you starting from?')).toEqual(['Some IT audit experience, I work in IT, risk or audit, or I’ve studied some of it.']);
    // Mobile 1.41: no name step between step 1 and the welcome.
    expect(back()).toBe(true);
    expect(caption()).toBeUndefined();
    expect(allText()).not.toContain('What should we call you?');
    expect(allText()).toContain('Get started');
    // On the welcome step, back is the phone's own (the app closes).
    expect(back()).toBe(false);
  });

  it('Restore from a backup skips every step (a pre-1.15 file has no fit, so Today may ask later)', () => {
    mount(<Onboarding />);
    expect(pressable(/^Restore from a backup$/)).toHaveLength(1);
    expect(allText()).not.toMatch(/Step \d of \d/);
  });
});

describe('200% text and dark mode', () => {
  beforeEach(() => useSettings.setState({ onboarded: false }));
  const setScale = (fontScale: number) => {
    const w = Dimensions.get('window');
    act(() => {
      Dimensions.set({ window: { ...w, width: 393, fontScale }, screen: { ...w, width: 393, fontScale } });
    });
  };
  afterEach(() => setScale(1));

  it.each(['light', 'dark'] as const)('%s at 200%%: the welcome keeps its four lines and both buttons; the last step keeps its consequence line', (theme) => {
    useSettings.setState({ theme });
    setScale(2);
    mount(<Onboarding />);
    for (const line of ['Think like an IS auditor.', 'Questions that explain every option, the trap included.', 'Your daily plan, built around your exam date.', 'Progress shown as a range, never a promise.', 'No account. Everything stays on your phone.']) {
      expect(allText()).toContain(line);
    }
    expect(pressable(/^Get started$/)).toHaveLength(1);
    expect(pressable(/^Restore from a backup$/)).toHaveLength(1);
    toStartingPoint();
    press(/^Skip this question$/);
    expect(allText()).toMatch(/No date yet: your plan starts at about 20 min a day\./);
    expect(pressable(/^Start my first questions$/)).toHaveLength(1);
    // The numbered steps are headers a screen reader can jump to.
    expect(root().findAll((n) => n.props.accessibilityRole === 'header' && n.props.accessibilityLabel === 'When is your exam?').length).toBeGreaterThan(0);
  });
});
