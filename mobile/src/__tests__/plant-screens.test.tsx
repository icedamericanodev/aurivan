/** Retired plant routes preserve stored data; study screens offer no companion UI. */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import Onboarding from '../app/onboarding';
import YourPlant from '../app/plant';
import PlantPick from '../app/plant-pick';
import PlantLook from '../app/plant-look';
import Settings from '../app/settings';
import {  resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { pickColumns } from '../components/plant/PlantUI';

import {   type CertPlant } from '../engine/plant';


import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
// Mobile 1.40: these tests check the storybook plant, so they plant as an app from before 1.40 did (no style).
import { legacyPlantNew as plantNew } from '../../jest/legacyPlant';

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
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => mockParams,
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
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const press = (label: RegExp) => {
  const n = root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel))[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const cp = () => selectCert(useProgress.getState(), 'cisa');
const setPlant = (p: CertPlant | undefined) => {
  act(() => {
    useProgress.getState().updatePlant('cisa', () => p);
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
    useProgress.setState({ plantSettings: undefined });
    useProgress.getState().updatePlant('cisa', () => undefined);
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' } });
  mockParams = {};
  jest.mocked(router.push).mockClear();
  jest.mocked(router.replace).mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.restoreAllMocks();
});

describe('never on question, mock, lesson or game screens', () => {
  const SRC = join(__dirname, '..');
  const files = [
    'app/session.tsx',
    'app/results.tsx',
    'app/mock-start.tsx',
    'components/quiz.tsx',
    'components/lesson.tsx',
    'components/game.tsx',
    // Code review M7: every study screen, and the parts Results uses.
    'app/guided.tsx',
    'app/caught-up.tsx',
    'app/mistakes.tsx',
    'components/moments.tsx',
    'components/journey.tsx',
    ...readdirSync(join(SRC, 'app/game')).map((f) => `app/game/${f}`),
    ...readdirSync(join(SRC, 'app/lesson')).map((f) => `app/lesson/${f}`),
    ...readdirSync(join(SRC, 'app/bank')).map((f) => `app/bank/${f}`),
    ...readdirSync(join(SRC, 'app/notes'))
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => `app/notes/${f}`),
    ...readdirSync(join(SRC, 'app/notes/subtopic')).map((f) => `app/notes/subtopic/${f}`),
  ];
  it.each(files)('%s draws no plant', (f) => {
    const src = readFileSync(join(SRC, f), 'utf8');
    expect(src).not.toMatch(/components\/plant|lib\/plant|engine\/plant/);
  });
  it('the readiness row (journey.tsx) only ever gets the plant through its `lead` prop', () => {
    const src = readFileSync(join(SRC, 'components/journey.tsx'), 'utf8');
    expect(src).not.toMatch(/from '\.\/plant|components\/plant/);
  });
});





describe('Settings', () => {

  it('the Reset alert explains learning progress without a retired plant promise', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // Mobile 1.46: Reset is on Your data's own screen.
    mockParams = { category: 'data' };
    mount(<Settings />);
    press(/^Reset CISA progress$/);
    expect(alert.mock.calls[0][1]).not.toMatch(/plant/i);
  });
});

describe('onboarding', () => {
  it('has no plant step any more: nothing is planted, and Today does not nudge', () => {
    useSettings.setState({ onboarded: false });
    mount(<Onboarding />);
    press(/^Get started$/);
    press(/^Skip starting point$/);
    expect(allText()).not.toMatch(/Plant it|Planted|never wilts/);
    press(/^Start my first questions$/);
    expect(useSettings.getState().onboarded).toBe(true);
    expect(cp().plant).toBeUndefined();
    expect(useProgress.getState().plantSettings).toBeUndefined();
  });
});

// ── PR #43 review fixes on the screens ───────────────────────────────────
describe('PR #43 review fixes', () => {

  it('UX H1: the picker takes three, two or one column from the measured width and text size', () => {
    // Grove Phase 4b (PHASE4B 4.3): three across; two from text scale 1.3 or under a 360pt phone; one from 2.
    expect(pickColumns(361, 1)).toBe(3); // a 393pt phone
    expect(pickColumns(343, 1)).toBe(3); // a 375pt phone
    expect(pickColumns(328, 1)).toBe(3); // a 360pt phone
    expect(pickColumns(288, 1)).toBe(2); // a 320pt phone: names never clip
    expect(pickColumns(353, 1.15)).toBe(3);
    expect(pickColumns(353, 1.3)).toBe(2);
    expect(pickColumns(353, 1.6)).toBe(2);
    expect(pickColumns(320, 2)).toBe(1);
    expect(pickColumns(200, 1)).toBe(1);
  });

  it('code review M5: with the plant hidden, the Reset alert never names it', () => {
    setPlant(plantNew('oak', 'Kai', Date.now(), 3));
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // Mobile 1.46: Reset is on Your data's own screen.
    mockParams = { category: 'data' };
    mount(<Settings />);
    press(/^Reset CISA progress/);
    expect(alert).toHaveBeenCalled();
    expect(String(alert.mock.calls[0][1])).not.toMatch(/plant/i);
  });
});


describe('retired plant experience', () => {
  it.each([YourPlant, PlantPick, PlantLook])('old plant route %p opens You and preserves saved plant data', (Route) => {
    const saved = plantNew('oak', 'Kai', Date.now() - 86400000, 4);
    act(() => { useProgress.getState().updatePlant('cisa', () => saved); });
    const before = selectCert(useProgress.getState(), 'cisa').plant;
    mount(<Route />);
    expect(router.replace).toHaveBeenCalledWith('/you');
    expect(byTestID('plant-moved')).toHaveLength(1);
    expect(selectCert(useProgress.getState(), 'cisa').plant).toBe(before);
  });

  it.each([Today, You, Settings])('screen %p has no plant entry for a returning learner', (Screen) => {
    const saved = plantNew('oak', 'Kai', Date.now() - 86400000, 4);
    act(() => { useProgress.getState().updatePlant('cisa', () => saved); });
    const before = selectCert(useProgress.getState(), 'cisa').plant;
    mount(<Screen />);
    expect(allText()).not.toMatch(/Your plant|Pick your plant|Show my plant|Change its look|Kai grew/);
    expect(byTestID('today-hero')).toHaveLength(0);
    expect(byTestID('areas-plate')).toHaveLength(0);
    expect(selectCert(useProgress.getState(), 'cisa').plant).toBe(before);
  });
});
