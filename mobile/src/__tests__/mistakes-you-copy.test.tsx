/**
 * Mobile 1.15 consistency and plain words on the Mistake journal and You
 * (PHASE5.md C6, C8, C10, J9–J13): plain tags with an example each, "Practice
 * 20 of 55", the ring legend 1 → 5 with its note, and what Accuracy counts.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import You from '../app/(tabs)/you';
import Mistakes from '../app/mistakes';
import { RINGS_NOTE } from '../components/journey';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getAllQuestions } from '../content/loader';
import { useProgress } from '../store/progress';
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


describe('Mistake journal: tags in plain words, with an example each', () => {
  const qs = getAllQuestions('cisa').slice(0, 55);
  const miss = (n: number) =>
    act(() => {
      for (const q of qs.slice(0, n)) {
        const wrong = (['A', 'B', 'C', 'D'] as const).find((l) => l !== q.correct)!;
        useProgress.getState().recordMistake('cisa', q.id, wrong);
      }
    });

  it('the new chip labels, each with its example as the spoken hint (the chips open on tap, mobile 1.24)', () => {
    miss(1);
    mount(<Mistakes />);
    press(/^Tag why you slipped$/);
    for (const t of ['Acted as the wrong person', 'Missed FIRST or BEST', 'Tool before policy', 'Fixed the symptom, not the cause', 'Misread', 'Didn’t know it']) expect(allText()).toContain(t);
    expect(allText()).not.toMatch(/Wrong role|FIRST\/BEST|Tech before governance/);
    const chip = root().findAll((x) => x.props.accessibilityLabel === 'Tag: Tool before policy' && typeof x.props.onPress === 'function')[0];
    expect(chip.props.accessibilityHint).toBe('For example: You picked a new tool before anyone agreed who owns the risk.');
  });

  it('each mistake says "Your pick" over "Best answer" (premium round 2, the answer screen’s words)', () => {
    miss(1);
    mount(<Mistakes />);
    expect(allText()).toContain('Your pick');
    expect(allText()).toContain('Best answer');
    expect(allText()).not.toContain('Your answer');
  });

  it('"What do these mean?" opens one example for each tag', () => {
    miss(1);
    mount(<Mistakes />);
    press(/^Tag why you slipped$/);
    const sheet = () => root().findAll((x) => x.props.presentationStyle === 'pageSheet')[0];
    expect(sheet().props.visible).toBe(false);
    press(/^What do these mean\?$/);
    expect(sheet().props.visible).toBe(true);
    expect(allText()).toContain('You fixed it yourself, when the auditor’s job is to report it.');
    expect(allText()).toContain('You restored the lost file but not the reason it was lost.');
    press(/^Close what the tags mean$/);
    expect(sheet().props.visible).toBe(false);
  });

  it('the button says how many of the open mistakes one set takes: "Practice 20 of 55", or "Practice all 12"', () => {
    miss(55);
    mount(<Mistakes />);
    expect(allText()).toContain('55 open');
    expect(pressable(/^Practice 20 of your 55 open mistakes, 20 at a time$/).length).toBeGreaterThan(0);
    expect(allText()).toContain('Practice 20 of 55');
    unmount();
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    miss(12);
    mount(<Mistakes />);
    expect(allText()).toContain('Practice all 12');
  });
});

describe('You: the legend 1 → 5, and what Accuracy counts', () => {
  it('lists domains 1 to 5 under the one ring (mobile 1.43: no ring legend to decode, the caption says what the figures count)', () => {
    act(() => {
      for (const q of getAllQuestions('cisa').slice(0, 3)) useProgress.getState().recordAnswer('cisa', q.id, true);
    });
    mount(<You />);
    // The chart may break a name over two lines ("IS" / "Audit"): read it as words.
    const t = allText().replace(/\s+/g, ' ');
    const at = ['IS Audit', 'IT Governance', 'IS Acquisition', 'IS Operations', 'Info Protection'].map((n) => t.indexOf(n));
    expect(at.every((i) => i > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(t).not.toContain(RINGS_NOTE);
    expect(t).toContain('Right on your latest tries');
  });
});
