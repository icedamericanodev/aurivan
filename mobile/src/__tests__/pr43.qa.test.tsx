/**
 * QA for PR #43, mobile 1.13.0 "Your plant" (Phase 4a). Journey tests on the
 * real stores, screens and backup code, written by the QA pass.
 *
 * Journeys:
 *  J1  new learner onboarding: pick, name, plant; and the same with Skip
 *  J2  a 1.12 save upgrading: no plant, Today's prompt, "No thanks" for good, You's "Plant yours"
 *  J3  growth up from real mastery or readiness; never down after wrong answers; never from games or minutes
 *  J4  change species keeps growth; rename validation
 *  J5  Show my plant OFF: Today, You, and the Your plant routes
 *  J6  Quiet look: no face
 *  J7  resting
 *  J8  Reset: a seed again, name and look kept
 *  J9  backup export and restore (with a plant, old file, tampered plant)
 *  J10 switching certification keeps a separate plant per cert
 *  J11 never on question, mock, lesson or game screens
 *
 * A test marked `// QA-BUG:` pinned wrong behaviour found by the QA pass.
 * All eight are fixed in the PR #43 review fixes; each test now asserts the
 * fixed behaviour and says `// QA-BUG (fixed):` with what changed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import Onboarding from '../app/onboarding';
import YourPlant from '../app/plant';
import PlantPick from '../app/plant-pick';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { buildPlant, type PNode } from '../components/plant/art';
import { getCertification } from '../content/certifications';
import { getDomainQuestions } from '../content/loader';
import { BACKUP_APP, BACKUP_SCHEMA, keepSupportedPlants, type BackupProgress } from '../engine/backup';
import {
  advance,
  cleanPlantName,
  growthFor,
  isValidPlantState,
  maxSupportedGrowth,
  plantCallName,
  plantFacts,
  plantLabel,
  plantNew,
  restLine,
  supportEvidence,
  type CertPlant,
  type PlantFacts,
} from '../engine/plant';
import type { AnswerRecord } from '../engine/readiness';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { dayKey } from '../engine/streak';
import { checkBackupText, currentBackup, knownIds, restoreBackup, undoRestore } from '../lib/backup';
import { checkPlant, plantFactsFor, plantFor, plantSubtopics, plantView } from '../lib/plant';
import { useBackup } from '../store/backup';
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
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  scheduleNotificationAsync: async (req: { identifier: string }) => req.identifier,
}));

// ── Helpers ──────────────────────────────────────────────────────────────
const DAY = 86_400_000;
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
const labels = () => root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const pressable = (label: RegExp) =>
  root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel));
const press = (label: RegExp) => {
  const n = pressable(label)[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};

/** Mobile 1.21: Today's plant row hides with a long press or the screen-reader action "Hide from Today". */
const hidePlantRow = () => {
  const row = root().findAll((n) => Array.isArray(n.props.accessibilityActions) && n.props.accessibilityActions.some((a: { name: string }) => a.name === 'hide') && typeof n.props.onAccessibilityAction === 'function')[0];
  act(() => {
    row.props.onAccessibilityAction({ nativeEvent: { actionName: 'hide' } });
  });
};
/** Every <Plant> drawn on screen (the composite, found by its props). */
const plants = () => root().findAll((n) => typeof n.type !== 'string' && typeof n.props.species === 'string' && typeof n.props.stage === 'number' && typeof n.props.size === 'number');
/** Is a growth-ring drawing on screen? (GrowthRings takes `preset`.) */
// Mobile 1.21: Today's condensed readiness row draws the small `row` rings (the exam-ready panel keeps `today`).
const ringsShown = () => root().findAll((n) => typeof n.type !== 'string' && (n.props.preset === 'today' || n.props.preset === 'row')).length > 0;
const layoutGrid = () => {
  const grid = root().findAll((n) => n.props.accessibilityRole === 'radiogroup')[0];
  act(() => {
    grid.props.onLayout({ nativeEvent: { layout: { width: 353, height: 0 } } });
  });
};
const nameInput = () => root().findAll((n) => n.props.accessibilityLabel === 'Your plant’s name' && typeof n.props.onChangeText === 'function')[0];
const cp = (cert = 'cisa') => selectCert(useProgress.getState(), cert);
const setPlant = (p: CertPlant | undefined, cert = 'cisa') => {
  act(() => {
    useProgress.getState().updatePlant(cert, () => p);
  });
};
/** `perDomain` questions in each CISA domain, answered at `at`. */
function answer(perDomain: number, opts: { correct?: boolean; at?: number; game?: boolean; assisted?: boolean; offset?: number } = {}) {
  act(() => {
    for (let d = 1; d <= 5; d++)
      for (const q of getDomainQuestions('cisa', String(d)).slice(opts.offset ?? 0, (opts.offset ?? 0) + perDomain))
        useProgress.getState().recordAnswer('cisa', q.id, opts.correct ?? true, undefined, {
          ...(opts.at !== undefined ? { at: opts.at } : {}),
          ...(opts.game ? { mastery: false } : {}),
          ...(opts.assisted ? { assisted: true } : {}),
        });
  });
}
/** Find every named group id in a built plant. */
const groupIds = (n: PNode, out: string[] = []): string[] => {
  if (n.t === 'g') {
    if (n.id) out.push(n.id);
    n.children.forEach((c) => groupIds(c, out));
  }
  return out;
};
/** No guilt, no needs, no "stage", no days counted, no trademark echo. */
const BANNED = /\bstage\b|(?<!never )wilt(ed|ing|s)?\b|thirsty|hungry|misses you|miss(ed)? you|neglect|dying|died|\bsad\b|lonely|water (it|me)|feed|\d+ days?\b|Pokémon|Pokemon/i;
/** The words the plant itself adds to a screen: its spoken label and its notes. */
const plantWords = () => [...plants().map((x) => String(x.props.accessibilityLabel ?? '')), ...labels().filter((l) => /plant|resting|grew|kept your place/i.test(l))].join(' ');

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
    useProgress.setState({ byCert: {}, plantSettings: undefined, reports: undefined, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  });
  useSession.getState().clear();
  useBackup.getState().setUndo(null);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' } });
  mockParams = {};
  jest.mocked(router.push).mockClear();
  jest.mocked(router.replace).mockClear();
  jest.mocked(router.back).mockClear();
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
});

// ── J1 Onboarding ────────────────────────────────────────────────────────
describe('J1 a new learner’s onboarding', () => {
  // Mobile 1.15: the plant step is step 4 of 4, after "Where are you starting from?" (skipped here) and the date.
  const toStep3 = () => {
    press(/^Start my plan$/);
    press(/^Continue$/);
    press(/^Skip this question$/);
    press(/^Continue$/);
  };

  it('pick a plant, name it, plant it: Today shows it under the facts (no prompt; the rings stay on the readiness row), You names it', () => {
    useSettings.setState({ onboarded: false });
    mount(<Onboarding />);
    toStep3();
    expect(allText()).toMatch(/Step 4 of 4/);
    expect(allText()).not.toMatch(BANNED);
    layoutGrid();
    // Every species is previewed at Crown (growth 5), with the face by default.
    expect(plants().filter((p) => p.props.stage === 5).length).toBeGreaterThanOrEqual(13);
    press(/^Pine\./);
    act(() => {
      nameInput().props.onChangeText('Summit Lee');
    });
    // A typed name is the learner's: changing species again must not replace it.
    press(/^Bamboo\./);
    expect(nameInput().props.value).toBe('Summit Lee');
    press(/^Pine\./);
    press(/^Plant it$/);
    expect(useSettings.getState().onboarded).toBe(true);
    expect(cp().plant).toMatchObject({ species: 'pine', name: 'Summit Lee', growth: 1 });
    expect(cp().plant!.pending).toBeUndefined();
    // Mobile 1.14: the planting moment, then Today.
    press(/^Start studying$/);
    expect(router.replace).toHaveBeenCalledWith('/home');
    unmount();

    mount(<Today />);
    expect(byTestID('today-plant')).toHaveLength(1);
    expect(byTestID('today-plant')[0].props.accessibilityLabel).toBe('Summit Lee, your pine. Growth: Seed, 1 of 6.');
    expect(byTestID('plant-prompt')).toHaveLength(0);
    expect(byTestID('plant-grew')).toHaveLength(0); // planting is not a "grew" moment
    // Mobile 1.23 (mockup A): the rings are always the readiness row's picture; the plant has its own row under the tiles.
    expect(ringsShown()).toBe(true);
    unmount();

    mount(<You />);
    expect(allText()).toMatch(/Summit Lee/);
    expect(allText()).toMatch(/Seed · growth 1 of 6/);
    expect(allText()).not.toMatch(/Plant yours/);
  });

  it('the name starts empty with an idea as its placeholder; "Another idea" fills one in, and it follows the species until the learner types one', () => {
    // UX review P1: nothing is chosen for the learner; an empty name is "Your oak".
    useSettings.setState({ onboarded: false });
    mount(<Onboarding />);
    toStep3();
    layoutGrid();
    expect(nameInput().props.value).toBe('');
    expect(['Ledger', 'Atlas', 'Bracken', 'North']).toContain(nameInput().props.placeholder);
    press(/^Lotus\./);
    expect(nameInput().props.value).toBe('');
    expect(['Padma', 'Lumi', 'Nila', 'Still']).toContain(nameInput().props.placeholder);
    press(/^Suggest another name$/);
    expect(['Padma', 'Lumi', 'Nila', 'Still']).toContain(nameInput().props.value);
    press(/^Cactus\./);
    expect(['Pico', 'Nopal', 'Rio', 'Sable']).toContain(nameInput().props.value);
  });

  it('a cleared name plants a nameless plant, called "Your oak"', () => {
    useSettings.setState({ onboarded: false });
    mount(<Onboarding />);
    toStep3();
    layoutGrid();
    act(() => {
      nameInput().props.onChangeText('   ');
    });
    press(/^Plant it$/);
    expect(cp().plant).toMatchObject({ species: 'oak', name: '' });
    expect(plantCallName(cp().plant!)).toBe('Your oak');
  });

  it('Skip for now: no plant; Today has no prompt and keeps the rings; You offers "Plant yours"', () => {
    useSettings.setState({ onboarded: false });
    mount(<Onboarding />);
    toStep3();
    press(/^Skip for now$/);
    expect(useSettings.getState().onboarded).toBe(true);
    expect(cp().plant).toBeUndefined();
    expect(router.replace).toHaveBeenCalledWith('/home');
    unmount();

    mount(<Today />);
    expect(byTestID('today-plant')).toHaveLength(0);
    expect(byTestID('plant-prompt')).toHaveLength(0);
    expect(ringsShown()).toBe(true);
    unmount();

    mount(<You />);
    press(/^Plant yours/);
    expect(router.push).toHaveBeenCalledWith('/plant-pick');
  });

  it('Back from "Plant it" returns to the exam date without planting', () => {
    useSettings.setState({ onboarded: false });
    mount(<Onboarding />);
    toStep3();
    press(/^Back$/);
    expect(allText()).toMatch(/Step 3 of 4/);
    expect(cp().plant).toBeUndefined();
    expect(useSettings.getState().onboarded).toBe(false);
  });
});

// ── J2 A 1.12 save upgrading ─────────────────────────────────────────────
describe('J2 an existing 1.12 save upgrading', () => {
  const KEY = 'aurivan.progress.v1';
  async function loadOldSave() {
    const now = Date.now();
    const answers: Record<string, AnswerRecord> = {};
    for (let d = 1; d <= 5; d++) for (const q of getDomainQuestions('cisa', String(d)).slice(0, 5)) answers[q.id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: now - DAY };
    const old = {
      state: {
        byCert: { cisa: { answers, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {} } },
        streak: { current: 1, best: 1, lastDay: dayKey(now - DAY) },
        today: { day: dayKey(now - DAY), answered: 25 },
        days: {},
      },
      version: PROGRESS_VERSION,
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(old));
    await act(async () => {
      await useProgress.persist.rehydrate();
    });
  }

  it('loads with no plant and default plant settings (never one made up)', async () => {
    await loadOldSave();
    expect(Object.keys(cp().answers)).toHaveLength(25);
    expect(cp().plant).toBeUndefined();
    expect(useProgress.getState().plantSettings).toBeUndefined();
  });

  it('Today shows the one quiet prompt; "No thanks" hides it for good (saved); You still offers "Plant yours"', async () => {
    await loadOldSave();
    mount(<Today />);
    expect(byTestID('plant-prompt')).toHaveLength(1);
    expect(allText()).toMatch(/A companion that grows with your study/);
    hidePlantRow();
    expect(byTestID('plant-prompt')).toHaveLength(0);
    unmount();
    // It is saved: a cold start (rehydrate from storage) keeps it hidden.
    await act(async () => {
      await new Promise((res) => setImmediate(res));
    });
    const saved = JSON.parse((await AsyncStorage.getItem(KEY))!);
    expect(saved.state.plantSettings).toEqual({ promptHidden: true });
    await act(async () => {
      await useProgress.persist.rehydrate();
    });
    expect(useProgress.getState().plantSettings).toEqual({ promptHidden: true });
    mount(<Today />);
    expect(byTestID('plant-prompt')).toHaveLength(0);
    unmount();
    mount(<You />);
    expect(allText()).toMatch(/Plant yours/);
    expect(allText()).toMatch(/Grows only with your study/);
  });

  it('"Plant yours" from the prompt: the study so far sets growth quietly (no Today moment), one back-fill line', async () => {
    await loadOldSave();
    mount(<Today />);
    // Mobile 1.21: the prompt is one row (no inline ghost pair); it opens the picker.
    press(/^Your plant\. /);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/plant-pick', params: { from: 'today' } });
    unmount();
    mount(<PlantPick />);
    expect(allText()).toMatch(/Plant yours/);
    layoutGrid();
    press(/^Mango\./);
    press(/^Plant it$/);
    expect(router.replace).toHaveBeenCalledWith('/plant');
    // 25 clean answers: past the diagnostic, so Sprout, quietly.
    expect(cp().plant).toMatchObject({ species: 'mango', growth: 2 });
    expect(cp().plant!.pending).toBeUndefined();
    expect(cp().plant!.backfill).toMatchObject({ growth: 2 });
    expect(useProgress.getState().plantSettings?.promptHidden).toBe(true);
    unmount();
    mount(<Today />);
    expect(byTestID('plant-grew')).toHaveLength(0);
    expect(byTestID('plant-prompt')).toHaveLength(0);
    expect(byTestID('today-plant')).toHaveLength(1);
    unmount();
    mount(<YourPlant />);
    expect(allText()).toMatch(/Your study so far grew .+ to Sprout\./);
  });
});

// ── J3 Growth rules ──────────────────────────────────────────────────────
describe('J3 growth: up from real learning, never down, never from games or minutes', () => {
  it('real mastery on two days opens Sprout then Shoot (one moment for the highest)', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    const day1 = Date.now() - 2 * DAY;
    answer(12, { at: day1 });
    answer(12, { at: day1 + DAY }); // the same questions, a day later: subtopics mastered
    const facts = plantFactsFor('cisa', cp(), Date.now())!;
    expect(facts.cleanByDomain.every((n) => n >= 10)).toBe(true);
    expect(facts.spread).toBeGreaterThanOrEqual(0.05);
    expect(checkPlant('cisa')).toBe(3);
    expect(cp().plant).toMatchObject({ growth: 3, pending: 3 });
    expect(Object.keys(cp().plant!.reached!)).toEqual(['sprout', 'shoot']);
  });

  it('readiness reaching the Bough line grows it (engine: low and outline)', () => {
    const base: PlantFacts = { cleanAnswered: 60, cleanByDomain: [12, 12, 12, 12, 12], cleanMastery: [0.6, 0.6, 0.6, 0.6, 0.6], low: 54, spread: 0.3, mock50: false, dress: false, readyHeld: false };
    expect(growthFor(base)).toBe(3);
    expect(growthFor({ ...base, low: 55 })).toBe(4);
    const p = plantNew('oak', 'Kai', 0, 3);
    expect(advance(p, { ...base, low: 55 }, 1).grew).toBe(4);
  });

  it('wrong answers never lower it, and a later dip in the data never does', () => {
    setPlant(plantNew('maple', 'Ember', Date.now()));
    answer(5);
    expect(checkPlant('cisa')).toBe(2);
    // Every one of those answered wrong, many times, plus new wrong ones.
    for (let k = 0; k < 4; k++) answer(5, { correct: false });
    answer(20, { correct: false, offset: 5 });
    expect(checkPlant('cisa')).toBeNull();
    expect(cp().plant!.growth).toBe(2);
    // Engine: facts that support only a seed leave a Bough a Bough.
    const bough = plantNew('oak', '', 0, 4);
    const none: PlantFacts = { cleanAnswered: 0, cleanByDomain: [0, 0, 0, 0, 0], cleanMastery: [0, 0, 0, 0, 0], low: null, spread: 0, mock50: false, dress: false, readyHeld: false };
    expect(advance(bough, none, 1).plant).toBe(bough);
  });

  it('wrong but clean answers still count toward Sprout (the diagnostic is "answered", by design)', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    answer(4, { correct: false });
    expect(checkPlant('cisa')).toBe(2);
  });

  it('game rounds never grow it, however many', () => {
    setPlant(plantNew('lotus', 'Padma', Date.now()));
    const day1 = Date.now() - 3 * DAY;
    for (let k = 0; k < 3; k++) answer(30, { game: true, at: day1 + k * DAY });
    expect(checkPlant('cisa')).toBeNull();
    expect(cp().plant!.growth).toBe(1);
    const f = plantFactsFor('cisa', cp(), Date.now())!;
    expect(f.cleanAnswered).toBe(0);
    expect(f.low).toBeNull();
    expect(f.spread).toBe(0);
  });

  it('Coach me (assisted) answers never grow it', () => {
    setPlant(plantNew('lotus', 'Padma', Date.now()));
    answer(10, { assisted: true });
    expect(checkPlant('cisa')).toBeNull();
  });

  it('minutes, streaks and goals never grow it', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    act(() => {
      useProgress.setState({ streak: { current: 400, best: 400, lastDay: dayKey(Date.now()) }, today: { day: dayKey(Date.now()), answered: 999 } });
    });
    expect(checkPlant('cisa')).toBeNull();
    expect(cp().plant!.growth).toBe(1);
  });

  it('observation: a game round on questions already answered cleanly lowers the "What grows it next" progress', () => {
    // Documented design (PlantFacts.cleanAnswered = "whose LAST answer was clean"),
    // but a learner sees the progress bar go backwards after a game. Growth itself stays.
    answer(3);
    const before = plantFactsFor('cisa', cp(), Date.now())!.cleanAnswered;
    answer(3, { game: true });
    expect(before).toBe(15);
    expect(plantFactsFor('cisa', cp(), Date.now())!.cleanAnswered).toBe(0);
  });

  it('game answers feed the readiness log, but never tick the Elder gate’s exam-ready hold', () => {
    // QA-BUG (fixed): `readyHeld` read moments.readiness and readySeenAt,
    // which the store logs from ALL answers, game answers included. It now
    // also needs the CLEAN low end at the exam-ready line (code review B2).
    answer(10, { game: true });
    const log = cp().moments?.readiness ?? [];
    expect(log.some((d) => d.last !== null)).toBe(true); // logged from game answers alone
    expect(plantFactsFor('cisa', cp(), Date.now())!.low).toBeNull(); // clean range: not enough data
    const today = dayKey(Date.now());
    const held = Array.from({ length: 8 }, (_, k) => ({ day: dayKey(Date.now() - k * DAY), min: 85, last: 85 }));
    const f = plantFacts({ cert: getCertification('cisa')!, answers: cp().answers, subtopicsByDomain: plantSubtopics('cisa'), mocks: [], readinessLog: held, today });
    expect(f.readyHeld).toBe(false); // the clean low end isn't there: games can't hold it
  });
});

// ── J4 Change species and rename ─────────────────────────────────────────
describe('J4 change species keeps growth; rename validation', () => {
  it('change species through the picker keeps growth, reached, name, look (except the colourway)', () => {
    const p: CertPlant = { ...plantNew('oak', 'Kai', Date.now() - DAY, 4), backfill: undefined, look: { colourway: 'autumn', ground: 'meadow', keepsakes: ['fox'] }, kept: ['robin'] };
    setPlant(p);
    mockParams = { mode: 'species' };
    mount(<PlantPick />);
    expect(allText()).toMatch(/Same growth, new look\./);
    layoutGrid();
    press(/^Sunflower\./);
    press(/^Use this plant$/);
    expect(router.back).toHaveBeenCalled();
    expect(cp().plant).toEqual({ ...p, species: 'sunflower', look: { ground: 'meadow', keepsakes: ['fox'] } });
    expect(isValidPlantState(cp().plant)).toBe(true);
  });

  it('Cancel changes nothing', () => {
    const p = plantNew('oak', 'Kai', Date.now(), 2);
    setPlant(p);
    mockParams = { mode: 'species' };
    mount(<PlantPick />);
    layoutGrid();
    press(/^Bonsai\./);
    press(/^Cancel$/);
    expect(cp().plant).toBe(p);
  });

  it.each([
    ['empty', '', ''],
    ['spaces only', '   \t ', ''],
    ['very long', 'A'.repeat(60), 'A'.repeat(20)],
    ['very long with a space at the cut', `${'B'.repeat(19)} C`, 'B'.repeat(19)],
    ['emoji', 'Hana 🌸', 'Hana 🌸'],
    ['many emoji (cut by code point, no broken surrogate)', '🌳'.repeat(25), '🌳'.repeat(20)],
    ['a right-to-left override', '‮evil‬', 'evil'],
    ['bidi isolates', '⁦Kai⁩', 'Kai'],
    ['LRM / RLM marks', '‎Kai‏', 'Kai'],
    ['zero-width space', 'Ku​mo', 'Kumo'],
    ['a BOM', '﻿Kai', 'Kai'],
    ['controls', 'K\u0000a\u0007i', 'Kai'],
    ['decomposed accents (NFC)', 'José', 'José'],
    ['non-Latin', 'ナラ', 'ナラ'],
  ])('rename: %s', (_why, raw, want) => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    mockParams = { mode: 'name' };
    mount(<PlantPick />);
    act(() => {
      nameInput().props.onChangeText(raw);
    });
    press(/^Save name$/);
    const p = cp().plant!;
    expect(p.name).toBe(want);
    expect(isValidPlantState(p)).toBe(true);
    // The name a screen shows and speaks is never blank.
    expect(plantCallName(p).trim().length).toBeGreaterThan(0);
    expect(plantLabel({ name: p.name, species: p.species, growth: p.growth })).toMatch(/your oak|Your oak/);
  });

  it('a newline or tab between words becomes one space', () => {
    // QA-BUG (fixed): whitespace controls (newline, tab) now become a space
    // BEFORE the other controls are stripped, so "Kai<newline>Lee" saves as "Kai Lee".
    expect(cleanPlantName('Kai\n\tLee')).toBe('Kai Lee');
    expect(cleanPlantName('Kai\u2028Lee')).toBe('Kai Lee'); // a line separator is already a space
  });

  it('the name field caps typing and says the limit', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    mockParams = { mode: 'name' };
    mount(<PlantPick />);
    expect(nameInput().props.maxLength).toBeGreaterThanOrEqual(20);
    expect(nameInput().props.accessibilityHint).toMatch(/Up to 20 characters/);
  });

  it('an emoji ZWJ sequence stays whole', () => {
    // QA-BUG (fixed): the cleaner stripped U+200D with the other zero-widths,
    // splitting emoji sequences. It now keeps the joiners (U+200D, U+200C)
    // between two visible characters, so emoji and Persian or Malayalam spelling survive.
    expect(cleanPlantName('👩‍💻')).toBe('👩‍💻');
    expect(cleanPlantName('🏳️‍🌈')).toBe('🏳️‍🌈');
  });

  it('a name of invisible characters cleans to no name ("Your oak")', () => {
    // QA-BUG (fixed): U+2060, U+180E, U+3164 and U+061C are now stripped (every
    // control and format character, plus the blank-looking fillers), so a
    // name can't look blank: it is '' and reads "Your oak".
    for (const raw of ['⁠', 'ㅤ', '؜']) {
      const name = cleanPlantName(raw);
      expect(name).toBe('');
      expect(plantCallName({ name, species: 'oak' })).toBe('Your oak');
    }
  });

  it('a zero-width between a letter and its accent saves a clean NFC name the plant’s own check accepts', () => {
    // QA-BUG (fixed): the cleaner now strips BEFORE normalising to NFC, so
    // "e" + ZWSP + U+0301 becomes "é" and cleaning is idempotent.
    act(() => {
      useProgress.getState().updatePlant('cisa', () => plantNew('oak', 'Kai', Date.now()));
      useProgress.getState().renamePlant('cisa', 'Rene​́');
    });
    const p = cp().plant!;
    expect(p.name).toBe('Ren\u00E9'); // NFC: one precomposed \u00E9
    expect(cleanPlantName(p.name)).toBe(p.name);
    expect(isValidPlantState(p)).toBe(true);
    const read = checkBackupText(JSON.stringify(currentBackup()));
    expect(read.kind).toBe('ok'); // export repairs it
  });
});

// ── J5 Show my plant OFF ─────────────────────────────────────────────────
describe('J5 Show my plant OFF', () => {
  const hide = () =>
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });

  it('Today: no plant, no prompt, no grow-up line; the rings are back; growth is still worked out', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    hide();
    answer(5);
    mount(<Today />);
    expect(byTestID('today-plant')).toHaveLength(0);
    expect(byTestID('plant-prompt')).toHaveLength(0);
    expect(byTestID('plant-grew')).toHaveLength(0);
    expect(plants()).toHaveLength(0);
    expect(ringsShown()).toBe(true);
    // Growth was checked quietly, and its one moment waits for when it shows again.
    expect(cp().plant).toMatchObject({ growth: 2, pending: 2 });
    unmount();
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: true });
    });
    mount(<Today />);
    expect(byTestID('plant-grew')).toHaveLength(1);
  });

  it('Today with no plant: no prompt either', () => {
    hide();
    mount(<Today />);
    expect(byTestID('plant-prompt')).toHaveLength(0);
  });

  it('You: no plant row and no "Plant yours"', () => {
    setPlant(plantNew('cactus', 'Pico', Date.now()));
    hide();
    mount(<You />);
    expect(plants()).toHaveLength(0);
    expect(allText()).not.toMatch(/Pico|Plant yours|growth \d of 6/);
  });

  it('the Your plant route says it is hidden and opens Settings; the plant is kept', () => {
    const p = plantNew('cactus', 'Pico', Date.now(), 2);
    setPlant(p);
    hide();
    mount(<YourPlant />);
    expect(allText()).toMatch(/Your plant is hidden/);
    expect(allText()).toMatch(/Its growth is kept/);
    expect(plants()).toHaveLength(0);
    expect(allText()).not.toMatch(/Pico/);
    press(/^Open Settings$/);
    // Mobile 1.17: Settings opens at Badges and your plant, where Show my plant is.
    expect(router.push).toHaveBeenCalledWith({ pathname: '/settings', params: { section: 'plant' } });
    expect(cp().plant).toBe(p);
  });

  it('the picker route while hidden says the plant is hidden and opens Settings, like Your plant', () => {
    // QA-BUG (fixed): /plant-pick with the plant hidden offered a new plant
    // whose pick was silently ignored. It now shows the same "hidden" screen
    // as /plant, with Open Settings, and the plant is kept.
    const p = plantNew('cactus', 'Pico', Date.now(), 2);
    setPlant(p);
    hide();
    mockParams = { mode: 'species' };
    mount(<PlantPick />);
    expect(allText()).toMatch(/Your plant is hidden/);
    expect(allText()).not.toMatch(/Choose what you’ll grow|Plant it/);
    expect(plants()).toHaveLength(0);
    press(/^Open Settings$/);
    // Mobile 1.17: Settings opens at Badges and your plant, where Show my plant is.
    expect(router.push).toHaveBeenCalledWith({ pathname: '/settings', params: { section: 'plant' } });
    expect(cp().plant).toBe(p);
  });
});

// ── J6 Quiet look ────────────────────────────────────────────────────────
describe('J6 Quiet look: no face', () => {
  it('the art has a face by default and none with Quiet look (every species, every growth, every size)', () => {
    for (const species of ['oak', 'sunflower', 'cactus', 'lotus', 'bamboo'] as const)
      for (const stage of [1, 3, 6]) {
        for (const lod of ['small', 'full'] as const) {
          expect(groupIds(buildPlant({ species, stage, lod }).root)).toContain('face');
          expect(groupIds(buildPlant({ species, stage, lod, quietLook: true }).root)).not.toContain('face');
        }
        // 24pt: never a face.
        expect(groupIds(buildPlant({ species, stage, lod: 'icon' }).root)).not.toContain('face');
      }
  });

  it('Today, You and Your plant all draw it without a face; the picker previews without one too', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    act(() => {
      useProgress.getState().setPlantSettings({ quietLook: true });
    });
    for (const Screen of [Today, You, YourPlant]) {
      mount(<Screen />);
      expect(plants().length).toBeGreaterThan(0);
      expect(plants().every((x) => x.props.quietLook === true)).toBe(true);
      unmount();
    }
    mockParams = { mode: 'species' };
    mount(<PlantPick />);
    layoutGrid();
    expect(plants().length).toBeGreaterThanOrEqual(13);
    expect(plants().every((x) => x.props.quietLook === true)).toBe(true);
  });

  it('the face is back when Quiet look is off', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    mount(<You />);
    expect(plants().every((x) => !x.props.quietLook)).toBe(true);
  });
});

// ── J7 Resting ───────────────────────────────────────────────────────────
describe('J7 resting', () => {
  const lastStudied = (daysAgo: number) =>
    act(() => {
      useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { earned: {}, ...m, lastDay: dayKey(Date.now() - daysAgo * DAY) } }));
    });

  it('2 days away: not resting', () => {
    setPlant(plantNew('bamboo', 'Reed', Date.now()));
    lastStudied(2);
    mount(<YourPlant />);
    expect(byTestID('plant-rest')).toHaveLength(0);
    expect(plants().every((x) => !x.props.resting)).toBe(true);
  });

  it('3+ days away: the calm look on Today, You and Your plant, a kind line, growth unchanged', () => {
    const p = plantNew('bamboo', 'Reed', Date.now(), 3);
    setPlant({ ...p, backfill: undefined });
    lastStudied(4);
    for (const Screen of [Today, You]) {
      mount(<Screen />);
      expect(plants().length).toBeGreaterThan(0);
      expect(plants().every((x) => x.props.resting === true && x.props.stage === 3)).toBe(true);
      // Today keeps its own countdown ("N days to exam") and journey stage line: only the plant's words are checked.
      expect(plantWords()).not.toMatch(BANNED);
      unmount();
    }
    mount(<YourPlant />);
    expect(allText()).toMatch(/Reed is resting\. Pick up whenever you're ready\./);
    expect(labels().join(' ')).toMatch(/Resting\./);
    expect(allText()).not.toMatch(BANNED);
    expect(labels().join(' ')).not.toMatch(BANNED);
    expect(cp().plant!.growth).toBe(3);
  });

  it('a week or more away: "kept your place", never the number of days', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    lastStudied(40);
    mount(<YourPlant />);
    expect(allText()).toMatch(/Kai kept your place\. Pick up where you left off\./);
    expect(allText()).not.toMatch(/40|weeks?|months?/);
  });

  it('the exam eve is planned rest (calm look), with no study gap at all', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    lastStudied(0);
    useSettings.setState({ examDates: { cisa: dayKey(Date.now() + DAY) } });
    const v = plantView(getCertification('cisa')!, cp(), undefined, dayKey(Date.now()), true);
    expect(v.resting).toBe(true);
  });

  it('resting changes the scene, never the plant: same parts, plus a dusk and a moon', () => {
    const calm = groupIds(buildPlant({ species: 'oak', stage: 5, lod: 'full' }).root);
    const rest = groupIds(buildPlant({ species: 'oak', stage: 5, lod: 'full', resting: true }).root);
    for (const id of calm) expect(rest).toContain(id);
    expect(rest).toContain('dusk');
    expect(restLine({ name: '', species: 'oak' }, '2026-01-01', '2026-01-04')).toBe("Your oak is resting. Pick up whenever you're ready.");
  });

  it('a plant with no study day yet is new, not resting', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    mount(<YourPlant />);
    expect(byTestID('plant-rest')).toHaveLength(0);
  });
});

// ── J8 Reset ─────────────────────────────────────────────────────────────
describe('J8 Reset', () => {
  it('back to a seed; species, name, look, planted date, unlocks and the pass date kept; no moment after', () => {
    const plantedAt = Date.now() - 30 * DAY;
    act(() => {
      useProgress.getState().updatePlant('cisa', () => ({
        ...plantNew('narra', 'Tala', plantedAt, 4),
        pending: 4,
        look: { ground: 'meadow', keepsakes: ['fox'] },
        kept: ['robin'],
        passedOn: '2026-09-30',
      }));
    });
    answer(15);
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    const p = cp().plant!;
    expect(p).toMatchObject({ species: 'narra', name: 'Tala', plantedAt, growth: 1, look: { ground: 'meadow', keepsakes: ['fox'] }, passedOn: '2026-09-30' });
    // Mobile 1.14: every unlock open at the Reset is kept too (here growth's), the old ones first.
    expect(p.kept?.[0]).toBe('robin');
    expect(p.kept).toEqual(expect.arrayContaining(['robin', 'narra-silver']));
    // PR #44 code review M4: the ribbon is never kept (passedOn survives a Reset and opens it).
    expect(p.kept).not.toContain('ribbon');
    expect(p.kept).not.toContain('stone-ring'); // Crown's ground: never reached
    expect(p.pending).toBeUndefined();
    expect(p.reached).toBeUndefined();
    expect(p.replantedAt).toBeGreaterThan(plantedAt);
    expect(isValidPlantState(p)).toBe(true);
    expect(Object.keys(cp().answers)).toHaveLength(0);
    mount(<Today />);
    expect(byTestID('plant-grew')).toHaveLength(0);
    expect(cp().plant!.growth).toBe(1);
    unmount();
    mount(<YourPlant />);
    expect(allText()).not.toMatch(/Your study so far/); // a reset plant never back-fills
    expect(allText()).toMatch(/Seed · growth 1 of 6/);
  });

  it('an exam-ready moment seen before the Reset cannot help the replanted plant bloom', () => {
    act(() => {
      useProgress.getState().updatePlant('cisa', () => plantNew('oak', 'Kai', Date.now() - DAY, 6));
      useProgress.getState().dismissReady('cisa');
    });
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    const f = plantFactsFor('cisa', cp(), Date.now())!;
    expect(cp().moments?.readySeenAt).toBeDefined();
    expect(f.readyHeld).toBe(false);
  });

  it('Reset of one exam leaves another exam’s plant alone', () => {
    const cism = plantNew('lotus', 'Nila', Date.now(), 2);
    setPlant(plantNew('oak', 'Kai', Date.now(), 3));
    setPlant(cism, 'cism');
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    expect(cp('cism').plant).toBe(cism);
  });
});

// ── J9 Backup ────────────────────────────────────────────────────────────
describe('J9 backup export and restore', () => {
  const fileWith = (byCert: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      app: BACKUP_APP,
      schema: BACKUP_SCHEMA,
      exportedAt: new Date().toISOString(),
      appVersion: '1.12.0',
      stores: {
        settings: { version: SETTINGS_VERSION, state: { onboarded: true, activeCertId: 'cisa' } },
        progress: { version: PROGRESS_VERSION, state: { byCert, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, ...extra } },
      },
    });
  const okRead = (text: string) => {
    const read = checkBackupText(text);
    if (read.kind !== 'ok') throw new Error(read.code);
    return read;
  };

  it('export with a plant, wipe, restore: the plant and its settings come back exactly', async () => {
    setPlant(plantNew('sampaguita', 'Perla 🌼', Date.now()));
    answer(5);
    checkPlant('cisa');
    act(() => {
      useProgress.getState().setPlantSettings({ quietLook: true });
    });
    const before = cp().plant!;
    const text = JSON.stringify(currentBackup());
    act(() => {
      useProgress.setState({ byCert: {}, plantSettings: undefined });
    });
    await act(async () => {
      expect((await restoreBackup(okRead(text).data, { fresh: true })).kind).toBe('ok');
    });
    expect(cp().plant).toEqual(before);
    expect(useProgress.getState().plantSettings).toEqual({ quietLook: true });
  });

  it('restoring an old (1.12) backup with no plant, on a phone with none: no plant, the prompt still offered', async () => {
    const read = okRead(fileWith({ cisa: { answers: {} } }));
    await act(async () => {
      await restoreBackup(read.data, { fresh: true });
    });
    expect(cp().plant).toBeUndefined();
    mount(<Today />);
    expect(byTestID('plant-prompt')).toHaveLength(1);
  });

  it('restoring an old backup keeps the phone’s plant; growth is recomputed quietly from the restored data', async () => {
    const plantedAt = Date.now() - 10 * DAY;
    setPlant({ ...plantNew('pine', 'Summit', plantedAt, 3), backfill: undefined });
    const answers: Record<string, AnswerRecord> = {};
    for (let d = 1; d <= 5; d++) for (const q of getDomainQuestions('cisa', String(d)).slice(0, 5)) answers[q.id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: Date.now() - DAY };
    const read = okRead(fileWith({ cisa: { answers } }));
    await act(async () => {
      expect((await restoreBackup(read.data, { fresh: true })).kind).toBe('ok');
    });
    const p = cp().plant!;
    expect(p).toMatchObject({ species: 'pine', name: 'Summit', plantedAt, growth: 2 });
    expect(p.pending).toBeUndefined();
    expect(p.backfill).toMatchObject({ growth: 2 });
    expect(p.backfill!.seen).toBeFalsy();
  });

  it('restoring a backup with no entry at all for the exam keeps the phone’s plant', async () => {
    // QA-BUG (fixed): writeAll now also carries the phone's plant identity
    // for an exam the file has no entry for, so a restore never makes a
    // learner re-plant (its growth is worked out from the restored data: a seed here).
    setPlant(plantNew('pine', 'Summit', Date.now(), 2));
    const read = okRead(fileWith({}));
    await act(async () => {
      expect((await restoreBackup(read.data, { fresh: true })).kind).toBe('ok');
    });
    expect(cp().plant).toMatchObject({ species: 'pine', name: 'Summit', growth: 1 });
    expect(cp().plant!.pending).toBeUndefined();
  });

  it('a restore can be undone, plant included', async () => {
    const mine = plantNew('oak', 'Kai', Date.now(), 2);
    setPlant(mine);
    answer(5);
    const read = okRead(fileWith({ cisa: { answers: {}, plant: { species: 'lotus', name: 'Nila', plantedAt: Date.now() - DAY, growth: 1 } } }));
    await act(async () => {
      expect((await restoreBackup(read.data)).kind).toBe('ok');
    });
    expect(cp().plant).toMatchObject({ species: 'lotus', name: 'Nila' });
    await act(async () => {
      expect((await undoRestore()).kind).toBe('ok');
    });
    expect(cp().plant).toMatchObject({ species: 'oak', name: 'Kai', growth: 2 });
  });

  it.each([
    ['an unknown species', { species: 'rose', name: 'R', growth: 1 }],
    ['a species with different case', { species: 'Oak', name: 'R', growth: 1 }],
    ['growth as text', { species: 'oak', name: 'Kai', growth: '6' }],
    ['growth 0', { species: 'oak', name: 'Kai', growth: 0 }],
    ['growth 2.5', { species: 'oak', name: 'Kai', growth: 2.5 }],
    ['a name with an RLO', { species: 'oak', name: '‮iak', growth: 1 }],
    ['a name with a zero-width space', { species: 'oak', name: 'K​ai', growth: 1 }],
    ['a name longer than 20', { species: 'oak', name: 'A'.repeat(21), growth: 1 }],
    ['a huge name', { species: 'oak', name: 'A'.repeat(5000), growth: 1 }],
    ['a name that is not text', { species: 'oak', name: 42, growth: 1 }],
    ['plantedAt before 2000', { species: 'oak', name: 'Kai', growth: 1, plantedAt: 0 }],
    ['plantedAt as text', { species: 'oak', name: 'Kai', growth: 1, plantedAt: 'yesterday' }],
    ['pending above growth', { species: 'oak', name: 'Kai', growth: 2, pending: 6 }],
    ['a back-fill above growth', { species: 'oak', name: 'Kai', growth: 1, backfill: { at: 1.7e12, growth: 4 } }],
    ['reached with a bad time', { species: 'oak', name: 'Kai', growth: 2, reached: { sprout: -5 } }],
    ['four keepsakes', { species: 'oak', name: 'Kai', growth: 1, look: { keepsakes: ['a', 'b', 'c', 'd'] } }],
    ['a look id with markup', { species: 'oak', name: 'Kai', growth: 1, look: { ground: '<script>' } }],
    ['a passedOn that is not a real day', { species: 'oak', name: 'Kai', growth: 1, passedOn: '2026-02-31' }],
    ['a plant that is a list', ['oak']],
    ['a plant that is null-ish text', 'null'],
  ])('a tampered plant (%s) is refused, and nothing on the phone changes', (_why, plant) => {
    const mine = plantNew('oak', 'Kai', Date.now(), 2);
    setPlant(mine);
    const p = Array.isArray(plant) || typeof plant !== 'object' ? plant : { plantedAt: Date.now() - DAY, ...plant };
    expect(checkBackupText(fileWith({ cisa: { answers: {}, plant: p } }))).toEqual({ kind: 'error', code: 'bad-data' });
    expect(cp().plant).toBe(mine);
  });

  it('a tampered growth with no study behind it is repaired down to what the data supports', () => {
    const elder = { species: 'oak', name: 'Kai', plantedAt: Date.now() - DAY, growth: 6, reached: { sprout: 1.7e12, shoot: 1.7e12, bough: 1.7e12, crown: 1.7e12, elder: 1.7e12 }, pending: 6 };
    const read = okRead(fileWith({ cisa: { answers: {}, plant: elder } }));
    const p = read.data.progress.byCert.cisa.plant!;
    expect(p.growth).toBe(1);
    expect(p.pending).toBeUndefined();
    expect(p.reached).toEqual({});
    expect(isValidPlantState(p)).toBe(true);
  });

  it('unknown keys in a plant are dropped (never copied into the app); a __proto__ key is harmless', () => {
    const read = okRead(fileWith({ cisa: { answers: {}, plant: JSON.parse(`{"species":"oak","name":"Kai","plantedAt":${Date.now() - DAY},"growth":1,"water":5,"__proto__":{"growth":6}}`) } }));
    const p = read.data.progress.byCert.cisa.plant!;
    expect(p).toEqual({ species: 'oak', name: 'Kai', plantedAt: expect.any(Number), growth: 1 });
    expect(Object.prototype.hasOwnProperty.call(p, 'water')).toBe(false);
    expect(({} as Record<string, unknown>).growth).toBeUndefined();
  });

  it('a "reached" growth the app doesn’t know (e.g. "sapling") is dropped, not refused', () => {
    const read = okRead(fileWith({ cisa: { answers: {}, plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - DAY, growth: 1, reached: { sapling: 1.7e12 } } } }));
    expect(read.data.progress.byCert.cisa.plant!.reached).toEqual({});
  });

  it('plant settings in a file must be switches', () => {
    expect(checkBackupText(fileWith({ cisa: { answers: {} } }, { plantSettings: { showPlant: 'yes' } }))).toEqual({ kind: 'error', code: 'bad-data' });
    expect(checkBackupText(fileWith({ cisa: { answers: {} } }, { plantSettings: [] }))).toEqual({ kind: 'error', code: 'bad-data' });
    expect(okRead(fileWith({ cisa: { answers: {} } }, { plantSettings: { showPlant: false, quietLook: true } })).data.progress.plantSettings).toEqual({ showPlant: false, quietLook: true });
  });

  it('a genuinely grown Elder keeps Elder on restore when one domain has fewer than 20 answers', () => {
    // QA-BUG (fixed): maxSupportedGrowth asked for 20 answers in every domain,
    // which the real Elder gate does not need. The clamp is now the live gates
    // on the best-case facts (code review B1), so an honest Elder survives
    // its own backup and no second "grew to Elder" moment can follow.
    const cert = getCertification('cisa')!;
    const now = Date.now();
    const subs = plantSubtopics('cisa');
    const answers: Record<string, AnswerRecord> = {};
    const per = [40, 40, 18, 40, 40];
    per.forEach((n, i) => {
      for (const q of getDomainQuestions('cisa', String(i + 1)).slice(0, n)) answers[q.id] = { attempts: 2, correctCount: 2, lastCorrect: true, lastAt: now - DAY };
    });
    // Every subtopic known in D1, D2, D4, D5 (88% of the outline by weight); none in D3.
    const mastery: Record<string, { firstDay: string; masteredAt: string }> = {};
    [0, 1, 3, 4].forEach((i) => subs[i].forEach((s) => (mastery[s] = { firstDay: '2026-09-01', masteredAt: '2026-09-02' })));
    const mock = { total: 150, correct: 135, finishedAt: now - DAY, timing: 'standard', unanswered: 0 };
    const facts = plantFacts({ cert, answers, mastery, subtopicsByDomain: subs, mocks: [{ total: 150, correct: 135, day: dayKey(now - DAY), timing: 'standard', unanswered: 0 }], readySeenAt: now - DAY, today: dayKey(now) });
    expect(growthFor(facts)).toBe(6); // a real Elder
    const ev = supportEvidence({ cert, answers, mastery, subtopicsByDomain: subs, mocks: [{ total: 150, correct: 135, day: dayKey(now - DAY), timing: 'standard', unanswered: 0 }], readySeenAt: now - DAY });
    expect(maxSupportedGrowth(ev)).toBe(6);
    const progress = { byCert: { cisa: { answers, mastery, mocks: [mock], moments: { readySeenAt: now - DAY }, plant: plantNew('mango', 'Amber', now - 9 * DAY, 6) } } } as unknown as BackupProgress;
    expect(keepSupportedPlants(progress, knownIds).byCert.cisa.plant!.growth).toBe(6);
  });
});

// ── J10 Switching certification ──────────────────────────────────────────
describe('J10 a separate plant per certification', () => {
  it('each exam keeps its own plant; growth on one never touches the other', () => {
    act(() => {
      plantFor('cisa', 'oak', 'Kai');
    });
    expect(cp('cism').plant).toBeUndefined();
    act(() => {
      plantFor('cism', 'lotus', 'Nila');
    });
    answer(5);
    checkPlant('cisa');
    checkPlant('cism');
    expect(cp().plant).toMatchObject({ species: 'oak', name: 'Kai', growth: 2 });
    expect(cp('cism').plant).toMatchObject({ species: 'lotus', name: 'Nila', growth: 1 });
  });

  it('You follows the active exam: its plant, or "Plant yours" for an exam without one', () => {
    setPlant(plantNew('oak', 'Kai', Date.now()));
    mount(<You />);
    expect(allText()).toMatch(/Kai/);
    unmount();
    useSettings.setState({ activeCertId: 'cism' });
    mount(<You />);
    expect(allText()).not.toMatch(/Kai/);
    expect(allText()).toMatch(/Plant yours/);
    unmount();
    setPlant(plantNew('lotus', 'Nila', Date.now()), 'cism');
    mount(<You />);
    expect(allText()).toMatch(/Nila/);
    unmount();
    useSettings.setState({ activeCertId: 'cisa' });
    mount(<You />);
    expect(allText()).toMatch(/Kai/);
  });

  it('planting from the picker plants for the ACTIVE exam only', () => {
    useSettings.setState({ activeCertId: 'cism' });
    mount(<PlantPick />);
    layoutGrid();
    press(/^Cactus\./);
    press(/^Plant it$/);
    expect(cp('cism').plant).toMatchObject({ species: 'cactus' });
    expect(cp().plant).toBeUndefined();
  });

  it('a cert with 4 domains still draws exactly five organ slots, and lists its own 4 domains', () => {
    const cism = getCertification('cism')!;
    const v = plantView(cism, { ...cp('cism'), plant: plantNew('oak', '', Date.now()) }, undefined, dayKey(Date.now()));
    expect(v.scales).toHaveLength(5);
    expect(v.organs).toHaveLength(cism.domains.length);
    expect(v.scales.every((s) => s > 0)).toBe(true);
  });
});

// ── J11 Never on question, mock, lesson or game screens ──────────────────
describe('J11 never on question, mock, lesson or game screens (transitive imports)', () => {
  const SRC = join(__dirname, '..');
  const resolveImport = (from: string, spec: string): string | null => {
    const base = resolve(dirname(from), spec);
    for (const c of [base, `${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts')]) if (existsSync(c) && !c.endsWith('/')) {
      try {
        readFileSync(c, 'utf8');
        return c;
      } catch {
        // a directory
      }
    }
    return null;
  };
  /** Every local file a screen pulls in, however deep. */
  const reach = (entry: string): Set<string> => {
    const seen = new Set<string>();
    const todo = [entry];
    while (todo.length) {
      const f = todo.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const to = resolveImport(f, m[1]);
        if (to && to.startsWith(SRC) && !to.includes('/content/generated/')) todo.push(to);
      }
    }
    return seen;
  };
  const screens = [
    'app/session.tsx',
    'app/results.tsx',
    'app/mock-start.tsx',
    'app/guided.tsx',
    ...readdirSync(join(SRC, 'app/game')).map((f) => `app/game/${f}`),
    ...readdirSync(join(SRC, 'app/lesson')).map((f) => `app/lesson/${f}`),
  ];
  it.each(screens)('%s never reaches the plant drawing or its UI', (f) => {
    const files = [...reach(join(SRC, f))].map((x) => x.slice(SRC.length + 1));
    expect(files.length).toBeGreaterThan(3); // the walk really follows imports
    expect(files.filter((x) => x.startsWith('components/plant/'))).toEqual([]);
    // lib/plant.ts is reached for its non-visual checkPlant (finishSession): fine. No screen part may draw.
    for (const x of files.filter((y) => y !== 'lib/plant.ts')) expect(readFileSync(join(SRC, x), 'utf8')).not.toMatch(/usePlantView\(|<Plant\b|<PlantButton|<PlantNote/);
  });
});
