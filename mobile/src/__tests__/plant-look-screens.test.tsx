/**
 * Mobile 1.14 (Phase 4b "Dress and Alive") on the real screens:
 * - Look: a live preview and five sections (Colour, Ground, Planter,
 *   Visitor, Keepsakes); a tap changes the look at once; a locked choice
 *   says how to open it and can't be picked; keepsakes up to three; one
 *   column at large text; hidden and no-plant states; no counters;
 * - Your plant: "Change its look", and the visitor's line on a cleared day;
 * - Today: the growth sequence is a real moment (one success haptic), and
 *   the plant's mood is in its spoken label;
 * - Milestones' badge sheet: one quiet "On your plant: the lantern." line;
 * - data: a look survives Reset and switching exams; a badge on one exam
 *   dresses the other exam's plant.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import PlantLook from '../app/plant-look';
import YourPlant from '../app/plant';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { resetPlantReactionsForTest } from '../components/plant/LivePlant';
import { BadgeSheet } from '../components/badges';
import { plantNew as plantNewToday, type CertPlant } from '../engine/plant';
import { onYourPlantLine, unlockedLooks, resolveLook } from '../engine/plantLooks';
import { allCertMarks } from '../lib/plant';
import { haptic } from '../lib/haptics';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { dayKey } from '../engine/streak';
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));

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
/** The option's Pressable (it carries the role, state, label and onPress). */
const option = (id: string) => root().findAll((n) => n.props.testID === `look-${id}` && n.props.accessibilityRole !== undefined)[0];
const tap = (id: string) => {
  const n = option(id);
  act(() => {
    n.props.onPress?.();
  });
};
const cp = () => selectCert(useProgress.getState(), 'cisa');
const setPlant = (p: CertPlant | undefined) =>
  act(() => {
    useProgress.getState().updatePlant('cisa', () => p);
  });
const setWindow = (width: number, fontScale: number) =>
  act(() => {
    const w = Dimensions.get('window');
    Dimensions.set({ window: { ...w, width, fontScale }, screen: { ...w, width, fontScale } });
  });
const layout = (width: number) => {
  const sv = root().findAll((n) => typeof n.props.onLayout === 'function' && n.props.contentContainerStyle)[0];
  act(() => {
    sv.props.onLayout({ nativeEvent: { layout: { width, height: 800 } } });
  });
};
/** Opens the closed "More to find" group (the planters and keepsakes still to earn). */
const openMore = () => {
  const b = root().findAll((n) => n.props.testID === 'look-more' && typeof n.props.onPress === 'function')[0];
  act(() => {
    b.props.onPress();
  });
};
const earn = (key: string, certId = 'cisa') =>
  act(() => {
    useProgress.setState((s) => {
      const c = selectCert(s, certId);
      const m = { ...(c.milestones ?? { earned: {} }), earned: { ...(c.milestones?.earned ?? {}), [key]: Date.now() } };
      return { byCert: { ...s.byCert, [certId]: { ...c, milestones: m } } };
    });
  });

beforeEach(() => {
  setWindow(393, 1);
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  resetPlantReactionsForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.getState().resetCert('cism');
    useProgress.setState({ plantSettings: undefined });
    useProgress.getState().updatePlant('cisa', () => undefined);
    useProgress.getState().updatePlant('cism', () => undefined);
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' } });
  jest.mocked(router.push).mockClear();
  jest.mocked(haptic.success).mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('Look', () => {
  it('a live preview and five sections; a tap changes the look at once', () => {
    setPlant(plantNew('oak', 'Kai', Date.now(), 4));
    mount(<PlantLook />);
    layout(353);
    for (const s of ['Colour', 'Ground', 'Planter', 'Visitor', 'Keepsakes']) expect(allText()).toContain(s);
    expect(root().findAll((n) => n.props.testID === 'look-preview' && typeof n.type === 'string')).toHaveLength(1);
    tap('oak-autumn');
    expect(cp().plant!.look?.colourway).toBe('oak-autumn');
    tap('terracotta');
    tap('no-visitor');
    expect(cp().plant!.look).toMatchObject({ colourway: 'oak-autumn', planter: 'terracotta', visitor: 'no-visitor' });
    // Cosmetics only: growth never changes.
    expect(cp().plant!.growth).toBe(4);
    expect(allText()).toMatch(/never changes your growth or your readiness/);
  });

  it('a locked choice says how to open it, and can’t be picked', () => {
    setPlant(plantNew('oak', 'Kai', Date.now(), 2));
    mount(<PlantLook />);
    const robin = option('robin');
    expect(robin.props.accessibilityState).toMatchObject({ checked: false, disabled: true });
    expect(robin.props.accessibilityLabel).toMatch(/Not open yet\. Opens when your plant reaches Shoot\./);
    expect(robin.props.onPress).toBeUndefined();
    // UX review P1: planters and keepsakes still to earn wait in one closed "More to find" group (no count).
    expect(option('lantern')).toBeUndefined();
    expect(allText()).toMatch(/More to find/);
    expect(allText()).not.toMatch(/More to find \(?\d/);
    openMore();
    expect(allText()).toMatch(/Badges and finished badge sets add more\. Each one says how\./);
    expect(option('lantern').props.accessibilityState).toMatchObject({ disabled: true });
    expect(allText()).toMatch(/Sit a full, timed mock \(the Dress Rehearsal badge\)\./);
    expect(allText()).toMatch(/Opens when you finish the Groundwork set in Badges\./);
    // No collection counters (only the plant's own "growth n of 6"), no "unlocked!", never "Pokémon".
    expect(allText().replace(/growth \d of 6/, '')).not.toMatch(/\b\d+ of \d+\b|collected|unlocked!|Pokémon|Pokemon/i);
  });

  it('keepsakes: earned ones can be shown, up to three; the fourth waits until one is put away', () => {
    setPlant(plantNew('oak', 'Kai', Date.now(), 3));
    // All four at the SAME moment (the clock frozen), so catalogue order decides: without
    // this, a millisecond tick between two earns reordered them and the test flaked.
    const at = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(at);
    for (const k of ['dress-rehearsal', 'on-pace', 'long-memory:25', 'snare-wise']) earn(k);
    clock.mockRestore();
    mount(<PlantLook />);
    // Never chosen: the first three earned show (UX review H1; same time here, so catalogue order).
    expect(cp().plant!.look?.keepsakes).toBeUndefined();
    for (const id of ['jay', 'lantern', 'sundial']) expect(option(id).props.accessibilityState).toMatchObject({ checked: true });
    const fox = option('fox');
    expect(fox.props.accessibilityState).toMatchObject({ disabled: true });
    expect(fox.props.accessibilityLabel).toMatch(/Put one away to show this\./);
    // The first tap starts from what shows, and stores the learner's own list.
    tap('sundial');
    expect(cp().plant!.look?.keepsakes).toEqual(['jay', 'lantern']);
    tap('fox');
    expect(cp().plant!.look?.keepsakes).toEqual(['jay', 'lantern', 'fox']);
    expect(option('lantern').props.accessibilityRole).toBe('checkbox');
    expect(option('oak-summer').props.accessibilityRole).toBe('radio');
  });

  it('the ribbon only appears once a pass is reported', () => {
    setPlant(plantNew('oak', 'Kai', Date.now(), 3));
    mount(<PlantLook />);
    expect(option('ribbon')).toBeUndefined();
  });

  it('two across at normal text; one column of rows at large text and on a 360 dp phone at 200%', () => {
    setPlant(plantNew('oak', 'Kai', Date.now(), 3));
    mount(<PlantLook />);
    layout(393);
    expect(option('meadow').props.style).toBeDefined();
    const w = (id: string) => JSON.stringify(option(id).props.style ?? '');
    expect(w('meadow')).toMatch(/"width":172/);
    act(() => {
      r!.unmount();
    });
    setWindow(360, 2);
    mount(<PlantLook />);
    layout(360);
    expect(w('meadow')).not.toMatch(/^\[\{"width"/);
  });

  it('hidden: says so; no plant: offers to plant one', () => {
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    setPlant(plantNew('oak', 'Kai', Date.now(), 3));
    mount(<PlantLook />);
    expect(allText()).toMatch(/Your plant is hidden/);
    act(() => {
      r!.unmount();
    });
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: true });
    });
    setPlant(undefined);
    mount(<PlantLook />);
    expect(allText()).toMatch(/Nothing planted yet/);
  });
});

describe('Your plant', () => {
  it('"Change its look" opens Look; a cleared day brings the visitor (in words too)', () => {
    // Grown some days ago (a growth today would make it proud, which comes first).
    setPlant({ ...plantNew('oak', 'Kai', Date.now() - 5 * 86_400_000, 3), look: { visitor: 'robin' } });
    const today = dayKey(Date.now());
    act(() => {
      useProgress.setState((s) => ({
        days: { ...s.days, cisa: { day: today, certId: 'cisa', items: [{ kind: 'review', count: 5 } as never], done: [true], start: { score: 0, domains: {} }, answered: 5, correct: 4, minutes: 5 } },
      }));
    });
    mount(<YourPlant />);
    expect(allText()).toMatch(/A robin came by: you cleared today’s plan\./);
    const hero = root().findAll((n) => n.props.testID === 'plant-hero' && typeof n.type === 'string')[0];
    expect(hero.props.accessibilityLabel).toMatch(/A robin is visiting\./);
    expect(hero.props.accessibilityLabel).toMatch(/Looking happy\./);
    const row = root().findAll((n) => n.props.accessibilityLabel?.toString().startsWith?.('Change its look') && typeof n.props.onPress === 'function')[0];
    act(() => {
      row.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/plant-look');
  });
});

describe('Today', () => {
  it('a grow-up plays the growth sequence as a real moment, with one success haptic', () => {
    setMockReducedMotion(false);
    setSystemReducedMotionForTest(false);
    const p = plantNew('oak', 'Kai', Date.now() - 86_400_000 * 3, 3);
    setPlant({ ...p, growth: 4, reached: { ...p.reached, bough: Date.now() }, pending: 4 });
    mount(<Today />);
    expect(root().findAll((n) => n.props.testID === 'plant-grew' && typeof n.type === 'string')).toHaveLength(1);
    expect(haptic.success).toHaveBeenCalledTimes(1);
    // The plant is proud today (it grew), in its spoken label.
    const plant = root().findAll((n) => n.props.testID === 'today-plant' && typeof n.type === 'string')[0];
    expect(plant.props.accessibilityLabel).toMatch(/Looking proud\./);
  });

  it('Quiet look: no mood in words or on the face', () => {
    act(() => {
      useProgress.getState().setPlantSettings({ quietLook: true });
    });
    const p = plantNew('oak', 'Kai', Date.now(), 3);
    setPlant({ ...p, reached: { ...p.reached, shoot: Date.now() } });
    mount(<Today />);
    const plant = root().findAll((n) => n.props.testID === 'today-plant' && typeof n.type === 'string')[0];
    expect(plant.props.accessibilityLabel).not.toMatch(/Looking/);
  });
});

describe('the badge sheet', () => {
  it('one quiet line names the keepsake on your plant', () => {
    expect(onYourPlantLine('dress-rehearsal', ['lantern'])).toBe('On your plant: the lantern.');
    const mark = { key: 'dress-rehearsal', badge: 'dress-rehearsal', set: 'examDay', name: 'Dress Rehearsal', caption: 'Dress Rehearsal', status: 'earned', earnedAt: Date.now(), progress: 1, detail: '', rule: 'r', howTo: '', unlock: 'u', effort: 'e', skill: 's', minDays: 1, counted: true, order: 1 } as never;
    const set = { info: { id: 'examDay', name: 'Exam Day', counted: true }, marks: [], completeAt: undefined } as never;
    mount(<BadgeSheet mark={mark} set={set} domains={[]} stage={'learn' as never} daysLeft={null} dueCount={0} showProgress onClose={() => {}} onStudy={() => {}} plantLine={onYourPlantLine('dress-rehearsal', ['lantern'])} />);
    expect(allText()).toMatch(/On your plant: the lantern\./);
    expect(allText()).not.toMatch(/Unlocked|\d+ of \d+ collected/i);
  });
});

describe('data safety', () => {
  it('a badge on one exam dresses the other exam’s plant; Reset keeps the look and its unlocks', () => {
    earn('dress-rehearsal', 'cisa');
    act(() => {
      useProgress.getState().updatePlant('cism', () => ({ ...plantNew('lotus', 'Lumi', Date.now(), 2), look: { keepsakes: ['lantern'] } }));
    });
    const cism = selectCert(useProgress.getState(), 'cism').plant!;
    const open = unlockedLooks(cism, allCertMarks(useProgress.getState().byCert));
    expect(resolveLook('lotus', cism.look, open).keepsakes).toEqual(['lantern']);
    // Reset CISA: its badges go, the CISA plant keeps its look and every unlock it had.
    setPlant({ ...plantNew('oak', 'Kai', Date.now(), 5), look: { ground: 'stone-ring', keepsakes: ['lantern'] } });
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    const after = cp().plant!;
    expect(after.growth).toBe(1);
    expect(after.look).toEqual({ ground: 'stone-ring', keepsakes: ['lantern'] });
    expect(after.kept).toEqual(expect.arrayContaining(['stone-ring', 'lantern', 'robin', 'oak-autumn']));
    const r2 = resolveLook('oak', after.look, unlockedLooks(after, allCertMarks(useProgress.getState().byCert)));
    expect(r2).toMatchObject({ ground: 'stone-ring', keepsakes: ['lantern'] });
  });
});

// ── Mobile 1.40: Style (it replaced Settings' Quiet look) ───────────────────
describe('Look › Style', () => {
  const preview = () => root().findAll((n) => n.props.testID === 'look-preview' && typeof n.type !== 'string')[0];
  const previewLabel = (): string => root().findAll((n) => n.props.testID === 'look-preview' && typeof n.type === 'string')[0].props.accessibilityLabel;

  it('comes first, as three free radio cards, each drawing this plant that way', () => {
    setPlant(plantNewToday('oak', 'Kai', Date.now(), 4));
    mount(<PlantLook />);
    const t = allText();
    expect(t.indexOf('Style')).toBeGreaterThan(-1);
    expect(t.indexOf('Style')).toBeLessThan(t.indexOf('Colour'));
    for (const id of ['botanical', 'storybook', 'storybook-face']) {
      expect(option(id).props.accessibilityRole).toBe('radio');
      expect(option(id).props.accessibilityState).toMatchObject({ disabled: false });
    }
    expect(option('botanical').props.accessibilityLabel).toMatch(/^Botanical\. A fine line drawing, like a field guide\./);
    expect(option('storybook-face').props.accessibilityLabel).toMatch(/^Storybook with a face\. A friendly face that shows its mood\./);
    // A new plant is botanical: on its own (no visitor) until the learner picks one.
    expect(option('botanical').props.accessibilityState).toMatchObject({ checked: true });
    expect(option('no-visitor').props.accessibilityState).toMatchObject({ checked: true });
    expect(previewLabel()).toMatch(/^Preview: Kai, your oak, botanical style\. Standard Oak form\. Growth: Bough, 4 of 6\./);
  });

  it('the label names the style after the whole name, even a name with a full stop in it (UX review P2)', () => {
    setPlant(plantNewToday('oak', 'J. Kai', Date.now(), 4));
    mount(<PlantLook />);
    expect(previewLabel()).toMatch(/^Preview: J\. Kai, your oak, botanical style\. Standard Oak form\. Growth: Bough, 4 of 6\./);
  });

  it('a tap saves the style for this plant, and the preview and its label follow', () => {
    setPlant(plantNewToday('oak', 'Kai', Date.now(), 4));
    mount(<PlantLook />);
    tap('storybook-face');
    expect(cp().plant!.look?.style).toBe('storybook-face');
    expect(preview().props.quietLook).toBe(false);
    expect(preview().props.look.style).toBe('storybook-face');
    expect(previewLabel()).toMatch(/^Preview: Kai, your oak, storybook style with a face\./);
    tap('storybook');
    expect(cp().plant!.look?.style).toBe('storybook');
    expect(preview().props.quietLook).toBe(true);
    tap('botanical');
    expect(cp().plant!.look?.style).toBe('botanical');
  });

  it('a plant from before 1.40 shows the style it already has: Quiet look on is "Storybook", off is "with a face"', () => {
    setPlant(plantNew('oak', 'Kai', Date.now(), 4));
    act(() => {
      useProgress.getState().setPlantSettings({ quietLook: true });
    });
    mount(<PlantLook />);
    expect(option('storybook').props.accessibilityState).toMatchObject({ checked: true });
    // Its storybook defaults are unchanged (the wren).
    expect(option('wren').props.accessibilityState).toMatchObject({ checked: true });
    act(() => {
      r!.unmount();
    });
    act(() => {
      useProgress.getState().setPlantSettings({ quietLook: false });
    });
    mount(<PlantLook />);
    expect(option('storybook-face').props.accessibilityState).toMatchObject({ checked: true });
    // Nothing was written until the learner picks one.
    expect(cp().plant!.look?.style).toBeUndefined();
  });
});
