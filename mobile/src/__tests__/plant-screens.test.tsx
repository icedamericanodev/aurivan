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
import { Alert, Dimensions, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import Onboarding from '../app/onboarding';
import YourPlant from '../app/plant';
import PlantPick from '../app/plant-pick';
import Settings from '../app/settings';
import { pickCelebration, resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { pickColumns } from '../components/plant/PlantUI';
import { getDomainQuestions } from '../content/loader';
import { MAX_NAME, PLANT_SPECIES, plantNew, SPECIES_INFO, type CertPlant } from '../engine/plant';
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

  it('no plant: one quiet line until "No thanks"; then never again', () => {
    mount(<Today />);
    expect(byTestID('plant-prompt')).toHaveLength(1);
    expect(allText()).toMatch(/Plant a companion that grows with your study\./);
    press(/^No thanks/);
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

// ── PR #43 review fixes on the screens ───────────────────────────────────
describe('PR #43 review fixes', () => {
  const setWindow = (width: number, fontScale: number) =>
    act(() => {
      const w = Dimensions.get('window');
      Dimensions.set({ window: { ...w, width, fontScale }, screen: { ...w, width, fontScale } });
    });
  const layoutGrid = (width: number) => {
    const grid = root().findAll((n) => n.props.accessibilityRole === 'radiogroup')[0];
    act(() => {
      grid.props.onLayout({ nativeEvent: { layout: { width, height: 0 } } });
    });
  };
  const tileWidth = () => root().findAll((n) => typeof n.type === 'string' && n.props.testID === 'species-oak')[0];

  it('UX H1: the picker takes three, two or one column from the measured width and text size', () => {
    expect(pickColumns(353, 1)).toBe(3); // a 393 dp phone
    expect(pickColumns(320, 1)).toBe(2); // a 360 dp phone: names never clip
    expect(pickColumns(353, 1.15)).toBe(2);
    expect(pickColumns(353, 1.3)).toBe(2);
    expect(pickColumns(353, 1.6)).toBe(1);
    expect(pickColumns(320, 2)).toBe(1);
    expect(pickColumns(200, 1)).toBe(1);
  });

  it('UX H1: at 360 dp and 200% text each species is a row: the plant beside its name and line', () => {
    setWindow(360, 2);
    mount(<PlantPick />);
    layoutGrid(320);
    const oak = tileWidth();
    const style = [oak.props.style].flat(3).reduce((a: Record<string, unknown>, x: unknown) => ({ ...a, ...(x as object) }), {});
    expect(style.width).toBe(320);
    expect(style.flexDirection).toBe('row');
    expect(allText()).toMatch(/A round, steady crown\. Acorns when it is ready\./);
  });

  it('UX H1: in the grid a name wraps to two lines at most, never mid-word', () => {
    setWindow(393, 1);
    mount(<PlantPick />);
    layoutGrid(353);
    const names = root().findAll((n) => n.props.numberOfLines === 2 && n.props.children === 'Cherry blossom');
    expect(names.length).toBeGreaterThan(0);
  });

  it('UX H2: the sticky footer hides while the keyboard is up, and the scroll keeps the field in view', () => {
    const keyboard: Record<string, () => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: () => void) => {
      keyboard[event] = cb;
      return { remove: () => {} };
    }) as never);
    const fire = (...events: string[]) => act(() => events.forEach((e) => keyboard[e]?.()));
    setPlant(plantNew('oak', 'Kai', Date.now()));
    mockParams = { mode: 'name' };
    mount(<PlantPick />);
    const scroll = root().findAll((n) => n.props.automaticallyAdjustKeyboardInsets === true);
    expect(scroll.length).toBeGreaterThan(0);
    expect(scroll[0].props.keyboardShouldPersistTaps).toBe('handled');
    expect(allText()).toMatch(/Save name/);
    expect(Object.keys(keyboard).length).toBeGreaterThanOrEqual(2);
    fire('keyboardWillShow', 'keyboardDidShow');
    expect(allText()).not.toMatch(/Save name/);
    fire('keyboardWillHide', 'keyboardDidHide');
    expect(allText()).toMatch(/Save name/);
    const field = root().findAll((n) => n.props.accessibilityLabel === 'Your plant’s name' && typeof n.props.onChangeText === 'function')[0];
    expect(field.props.returnKeyType).toBe('done');
    expect(field.props.maxLength).toBe(MAX_NAME);
  });

  it('UX P1: a new plant’s name starts empty, with an idea as its placeholder', () => {
    mount(<PlantPick />);
    const field = root().findAll((n) => n.props.accessibilityLabel === 'Your plant’s name' && typeof n.props.onChangeText === 'function')[0];
    expect(field.props.value).toBe('');
    expect(SPECIES_INFO.oak.suggestions).toContain(field.props.placeholder);
    expect(allText()).toMatch(/Left empty, it is “Your oak”/);
  });

  it('Today: the plant’s name sits under it, inside the same tap target; the prompt sits below the day’s study', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    mount(<Today />);
    const button = byTestID('today-plant')[0];
    const words: string[] = [];
    const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? words.push(n) : n.children.forEach(walk));
    walk(button);
    expect(words).toContain('Kai');
    act(() => {
      r?.unmount();
    });
    setPlant(undefined);
    mount(<Today />);
    const text = allText();
    expect(text.indexOf('Plant a companion')).toBeGreaterThan(text.indexOf('Also today'));
    expect(labels()).toContain('No thanks, hide this note. You can plant one from You.');
  });

  it('code review M2: the grow line never spends the session’s one full celebration', () => {
    setMockReducedMotion(false);
    setSystemReducedMotionForTest(false);
    setPlant({ ...plantNew('oak', 'Kai', Date.now(), 2), pending: 2 });
    mount(<Today />);
    expect(byTestID('plant-grew')).toHaveLength(1);
    // A Results milestone later in the same session still plays in full.
    expect(pickCelebration('milestone-after-plant', false).mode).toBe('full');
  });

  it('UX P2: the exam eve and exam day have their own calm line on Your plant', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    useSettings.setState({ examDates: { cisa: dayKey(Date.now() + 86_400_000) } });
    mount(<YourPlant />);
    expect(allText()).toMatch(/Rest day\. Sleep and time off help memory settle\./);
    act(() => {
      r?.unmount();
    });
    useSettings.setState({ examDates: { cisa: dayKey(Date.now()) } });
    mount(<YourPlant />);
    expect(allText()).toMatch(/Good luck\. You've done the work\./);
  });

  it('UX P7 + copy: at large text "Next to grow" joins the subtitle; "Change plant"; organs read "full", never "thick"', () => {
    setWindow(393, 2);
    setPlant(plantNew('oak', 'Kai', Date.now(), 4));
    mount(<YourPlant />);
    expect(allText()).toMatch(/· Next to grow/);
    expect(allText()).toMatch(/Change plant/);
    expect(allText()).not.toMatch(/Change species|\bthick\b/);
  });

  it('code review M5: with the plant hidden, the Reset alert never names it', () => {
    setPlant(plantNew('oak', 'Kai', Date.now(), 3));
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mount(<Settings />);
    press(/^Reset CISA progress/);
    expect(alert).toHaveBeenCalled();
    expect(String(alert.mock.calls[0][1])).not.toMatch(/plant/i);
  });
});
