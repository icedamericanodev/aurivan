/**
 * Mobile 1.13 (Phase 4a) "Your plant" on the real screens:
 * - Today: the plant replaces the small rings beside the readiness range and
 *   opens Your plant; a grow-up gets ONE calm line (then it is gone); a
 *   learner with no plant gets one quiet line until they plant or dismiss it;
 * - You: the plant in the header, or "Plant yours";
 * - Your plant: name, growth, what grows it next, the domains as text, the
 *   back-fill line once, the resting line, change species and rename;
 * - Settings: Show my plant (off = no plant and no prompts anywhere) and
 *   Quiet look; the Reset alert says what happens to the plant;
 * - onboarding: a skippable "Plant it" step with all 13 species;
 * - never on question, mock, lesson or game screens; never "stage"; never
 *   a guilt or needs word.
 */
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
import Settings from '../app/settings';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getDomainQuestions } from '../content/loader';
import { PLANT_SPECIES, plantNew, type CertPlant } from '../engine/plant';
import { dayKey } from '../engine/streak';
import { plantFor } from '../lib/plant';
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
const labels = () => root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
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
function answerClean(n: number) {
  let k = 0;
  for (let d = 1; d <= 5; d++)
    for (const q of getDomainQuestions('cisa', String(d)).slice(0, Math.ceil(n / 5))) {
      if (k++ >= n) break;
      useProgress.getState().recordAnswer('cisa', q.id, true);
    }
}
/** No guilt, no needs, no "stage", no trademark echo. */
const BANNED = /\bstage\b|wilt(ed|ing|s)?\b(?! never)|thirsty|hungry|misses you|neglect|dying|died|sad\b|Pokémon|Pokemon/i;

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
    ...readdirSync(join(SRC, 'app/game')).map((f) => `app/game/${f}`),
    ...readdirSync(join(SRC, 'app/lesson')).map((f) => `app/lesson/${f}`),
  ];
  it.each(files)('%s draws no plant', (f) => {
    const src = readFileSync(join(SRC, f), 'utf8');
    expect(src).not.toMatch(/components\/plant|lib\/plant|engine\/plant/);
  });
});

describe('Today', () => {
  it('the plant replaces the small rings and opens Your plant', () => {
    setPlant(plantNew('sunflower', 'Sunny', Date.now()));
    mount(<Today />);
    const plant = byTestID('today-plant');
    expect(plant).toHaveLength(1);
    expect(plant[0].props.accessibilityLabel).toBe('Sunny, your sunflower. Growth: Seed, 1 of 6.');
    // The readiness words keep their own stop beside it.
    expect(labels().some((l) => l.startsWith('Estimated readiness'))).toBe(true);
    press(/^Sunny, your sunflower/);
    expect(router.push).toHaveBeenCalledWith('/plant');
  });

  it('no plant: one quiet line until "Not now"; then never again', () => {
    mount(<Today />);
    expect(byTestID('plant-prompt')).toHaveLength(1);
    expect(allText()).toMatch(/Plant a companion that grows with your study\./);
    press(/^Not now/);
    expect(byTestID('plant-prompt')).toHaveLength(0);
    expect(useProgress.getState().plantSettings?.promptHidden).toBe(true);
  });

  it('Show my plant off: no plant and no prompt (the rings are back)', () => {
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    mount(<Today />);
    expect(byTestID('plant-prompt')).toHaveLength(0);
    act(() => {
      r!.unmount();
    });
    setPlant(plantNew('oak', 'Kai', Date.now()));
    mount(<Today />);
    expect(byTestID('today-plant')).toHaveLength(0);
  });

  it('a grow-up: one calm line, announced once, then cleared for good', () => {
    setPlant({ ...plantNew('oak', 'Kai', Date.now(), 2), pending: 2, backfill: undefined });
    mount(<Today />);
    expect(byTestID('plant-grew')).toHaveLength(1);
    expect(allText()).toMatch(/Kai grew to Sprout\./);
    expect(cp().plant!.pending).toBeUndefined();
    act(() => {
      r!.unmount();
    });
    mount(<Today />);
    expect(byTestID('plant-grew')).toHaveLength(0);
  });

  it('real study grows it on Today’s next view', () => {
    setPlant(plantNew('lotus', 'Padma', Date.now()));
    act(() => {
      answerClean(20);
    });
    mount(<Today />);
    expect(cp().plant!.growth).toBe(2);
    expect(allText()).toMatch(/Padma grew to Sprout\./);
  });
});

describe('You', () => {
  it('the plant in the header, with its growth in words', () => {
    setPlant(plantNew('cactus', 'Pico', Date.now()));
    mount(<You />);
    expect(allText()).toMatch(/Pico/);
    expect(allText()).toMatch(/Seed · growth 1 of 6/);
    press(/^Pico, your cactus/);
    expect(router.push).toHaveBeenCalledWith('/plant');
  });

  it('no plant: "Plant yours"; hidden: nothing', () => {
    mount(<You />);
    press(/^Plant yours/);
    expect(router.push).toHaveBeenCalledWith('/plant-pick');
    act(() => {
      r!.unmount();
    });
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    mount(<You />);
    expect(allText()).not.toMatch(/Plant yours/);
  });
});

describe('Your plant', () => {
  it('name, growth, what grows it next and every domain as text; never "stage"', () => {
    setPlant(plantNew('maple', 'Ember', Date.now()));
    mount(<YourPlant />);
    const text = allText();
    expect(text).toMatch(/Ember/);
    expect(text).toMatch(/Seed · growth 1 of 6/);
    expect(text).toMatch(/What grows it next/);
    expect(text).toMatch(/Answer 20 questions without a hint/);
    expect(new Set(labels().filter((l) => /^Domain \d, /.test(l))).size).toBe(5);
    expect(text).not.toMatch(BANNED);
    expect(labels().join(' ')).not.toMatch(BANNED);
  });

  it('the back-fill line shows once', () => {
    act(() => {
      answerClean(25);
    });
    act(() => {
      plantFor('cisa', 'oak', 'Kai');
    });
    mount(<YourPlant />);
    expect(allText()).toMatch(/Your study so far grew Kai to Sprout\./);
    expect(cp().plant!.backfill!.seen).toBe(true);
    act(() => {
      r!.unmount();
    });
    mount(<YourPlant />);
    expect(allText()).not.toMatch(/Your study so far/);
  });

  it('resting: a kind line that never counts the days away', () => {
    setPlant(plantNew('bamboo', 'Reed', Date.now()));
    act(() => {
      useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { earned: {}, ...m, lastDay: dayKey(Date.now() - 4 * 86_400_000) } }));
    });
    mount(<YourPlant />);
    expect(byTestID('plant-rest')).toHaveLength(1);
    expect(allText()).toMatch(/Reed is resting\. Pick up whenever you're ready\./);
    expect(allText()).not.toMatch(/\d+ days/);
    expect(labels().join(' ')).toMatch(/Resting\./);
  });

  it('hidden: says so, and how to show it', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    mount(<YourPlant />);
    expect(allText()).toMatch(/Your plant is hidden/);
  });
});

describe('the picker', () => {
  it('plants a seed with the chosen species and name; 13 species, one checked', () => {
    mount(<PlantPick />);
    // The grid lays out once it knows its width.
    const grid = root().findAll((n) => n.props.accessibilityRole === 'radiogroup')[0];
    act(() => {
    grid.props.onLayout({ nativeEvent: { layout: { width: 353, height: 0 } } });
  });
    const radios = root().findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    expect(radios).toHaveLength(PLANT_SPECIES.length);
    expect(PLANT_SPECIES).toHaveLength(13);
    expect(radios.filter((x) => x.props.accessibilityState?.checked)).toHaveLength(1);
    press(/^Sunflower\./);
    const input = root().findAll((n) => n.props.accessibilityLabel === 'Your plant’s name' && typeof n.props.onChangeText === 'function')[0];
    act(() => {
    input.props.onChangeText('Helio');
  });
    press(/^Plant it$/);
    expect(cp().plant).toMatchObject({ species: 'sunflower', name: 'Helio', growth: 1 });
    expect(router.replace).toHaveBeenCalledWith('/plant');
  });

  it('change species keeps every bit of growth; rename cleans the name', () => {
    setPlant({ ...plantNew('oak', 'Kai', Date.now(), 3), backfill: undefined });
    mockParams = { mode: 'species' };
    mount(<PlantPick />);
    const grid = root().findAll((n) => n.props.accessibilityRole === 'radiogroup')[0];
    act(() => {
    grid.props.onLayout({ nativeEvent: { layout: { width: 353, height: 0 } } });
  });
    press(/^Bonsai\./);
    press(/^Use this plant$/);
    expect(cp().plant).toMatchObject({ species: 'bonsai', name: 'Kai', growth: 3 });
    act(() => {
      r!.unmount();
    });
    mockParams = { mode: 'name' };
    mount(<PlantPick />);
    const input = root().findAll((n) => n.props.accessibilityLabel === 'Your plant’s name' && typeof n.props.onChangeText === 'function')[0];
    act(() => {
    input.props.onChangeText('  Kumo​  ');
  });
    press(/^Save name$/);
    expect(cp().plant!.name).toBe('Kumo');
  });
});

describe('Settings', () => {
  it('Show my plant and Quiet look; Quiet look only while the plant shows', () => {
    mount(<Settings />);
    const toggle = (title: string) => root().findAll((n) => n.props.accessibilityLabel === title && typeof n.props.onValueChange === 'function')[0];
    expect(toggle('Show my plant').props.value).toBe(true);
    act(() => {
    toggle('Quiet look').props.onValueChange(true);
  });
    expect(useProgress.getState().plantSettings?.quietLook).toBe(true);
    act(() => {
    toggle('Show my plant').props.onValueChange(false);
  });
    expect(useProgress.getState().plantSettings?.showPlant).toBe(false);
    expect(toggle('Quiet look')).toBeUndefined();
  });

  it('the Reset alert says the plant goes back to a seed and keeps its name and look', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mount(<Settings />);
    press(/^Reset CISA progress$/);
    expect(alert.mock.calls[0][1]).toMatch(/Your plant goes back to a seed\. It keeps its name and look\./);
  });
});

describe('onboarding', () => {
  const toStep3 = () => {
    press(/^Start my plan$/);
    press(/^Continue$/);
    press(/^Continue$/);
  };

  it('a skippable "Plant it" step after the exam date', () => {
    useSettings.setState({ onboarded: false });
    mount(<Onboarding />);
    toStep3();
    expect(allText()).toMatch(/Step 3 of 3/);
    expect(allText()).toMatch(/never wilts/);
    const grid = root().findAll((n) => n.props.accessibilityRole === 'radiogroup')[0];
    act(() => {
    grid.props.onLayout({ nativeEvent: { layout: { width: 353, height: 0 } } });
  });
    expect(root().findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function')).toHaveLength(13);
    press(/^Lotus\./);
    press(/^Plant it$/);
    expect(useSettings.getState().onboarded).toBe(true);
    expect(cp().plant).toMatchObject({ species: 'lotus', growth: 1 });
    expect(router.replace).toHaveBeenCalledWith('/home');
  });

  it('Skip for now: no plant, and no nudge on Today later', () => {
    useSettings.setState({ onboarded: false });
    mount(<Onboarding />);
    toStep3();
    press(/^Skip for now$/);
    expect(useSettings.getState().onboarded).toBe(true);
    expect(cp().plant).toBeUndefined();
    expect(useProgress.getState().plantSettings?.promptHidden).toBe(true);
  });
});
