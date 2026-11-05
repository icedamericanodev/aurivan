/**
 * Grove Phase 4b, the phone plant (design-notes/grove/phase4b/PHASE4B.md section 4):
 * - the stem ("How it has grown"): order, saved dates only, the facts word for word, keepsakes, the fold;
 * - the art's size steps; the phone's copy fixes (no "field guide", no "passed", no "Herbarium", no "you're ready");
 * - Your plant on paper: the name block, the state tags, the quiet grew line (one saved mark with Today),
 *   the What grows it next panel and when it hides;
 * - motion end states under Reduce Motion (and with a screen reader on): the stem leaf fill, the Turning's
 *   label and leaf, no Elder drift (nor after a skip); the resting art has a moon and no disc;
 *   and in full motion the Turning's leaf waits for the name (never fills during the swaps);
 * - Look (the ribbon waits for the exam date), Pick (each mode's title), the widget's soil line.
 */
import * as Haptics from 'expo-haptics';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions, StyleSheet } from 'react-native';
import { flushSayLaterForTest, setScreenReaderForTest } from '../lib/a11y';
import { setMockHoldAnimations, setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import YourPlant from '../app/plant';
import PlantLook from '../app/plant-look';
import PlantPick from '../app/plant-pick';
import { LeafFall, resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { plantArtSize } from '../components/plant/PlantPage';
import { buildPlant, type GNode } from '../components/plant/art';
import { withoutDisc } from '../components/plant/LivePlant';
import { CROWN_MOCK, FORM_FACTS, GROWTH_IDS, plantNew, SPROUT_ANSWERS, type CertPlant, type GrowthLevel } from '../engine/plant';
import { RECALL_FORM_III, RECALL_FORM_IV } from '../engine/plantForms';
import { lookItem } from '../engine/plantLooks';
import { dayKey } from '../engine/streak';
import { shortDate } from '../lib/format';
import { GREW_FACTS, lookCaption, lookHowToOpen, phoneRestLine } from '../lib/plantCopy';
import { foldStem, STEM_FOLD_AFTER, stemRows, type StemGrowthRow } from '../lib/plantStem';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { soilLine } from '../widgets/art';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
const mockParams: { mode?: string; from?: string; planted?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

// ── Harness ─────────────────────────────────────────────────────────────
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
const byTestID = (id: string) => (r ? r.root.findAll((n) => n.props.testID === id && typeof n.type === 'string') : []);
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(r!.root);
const labels = () => r!.root.findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
const flat = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) as { opacity?: number; transform?: Record<string, number>[] };
const motionOn = () => {
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(false);
};
const setPlant = (p: CertPlant | undefined) => {
  act(() => {
    useProgress.getState().updatePlant('cisa', () => p);
  });
};
const DAY = 86_400_000;
const T0 = Date.now() - 20 * DAY;
/** A plant at `growth`, each growth reached on its own saved day, nothing pending. */
const grown = (growth: GrowthLevel, opts: { name?: string; style?: 'botanical' | 'storybook' } = {}): CertPlant => {
  const p = plantNew('oak', opts.name ?? 'Kai', T0, 1);
  const reached: CertPlant['reached'] = {};
  for (let g = 2; g <= growth; g++) reached[GROWTH_IDS[g - 1]] = T0 + g * DAY;
  return { ...p, growth, reached, look: { style: opts.style ?? 'botanical' } };
};

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, height: 852, fontScale: 1 }, screen: { ...w, width: 393, height: 852, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setMockHoldAnimations(false);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  for (const f of [Haptics.notificationAsync, Haptics.impactAsync, Haptics.selectionAsync]) (f as jest.Mock).mockClear();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, plantForms: {}, plantFinal: {}, quietGrowth: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: undefined });
    useProgress.getState().updatePlant('cisa', () => undefined);
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, badgesHidden: false, examDates: { cisa: '2027-06-01' } });
  delete mockParams.mode;
  delete mockParams.from;
  delete mockParams.planted;
});
afterEach(() => {
  unmount();
  setMockHoldAnimations(false);
  jest.restoreAllMocks();
});

// ── The stem (pure) ─────────────────────────────────────────────────────
describe('the stem: How it has grown (PHASE4B 4.1 item 6)', () => {
  it('Seed at the top, Elder at the bottom; reached, now and later; dates only from saved fields', () => {
    const p = grown(4);
    const rows = stemRows({ plant: p, forms: true });
    expect(rows.map((x) => (x.kind === 'growth' ? `${x.name}:${x.state}` : x.kind))).toEqual(['Seed:reached', 'Sprout:reached', 'Shoot:reached', 'Bough:now', 'Crown:later', 'Elder:later']);
    const [seed, sprout, shoot, bough, crown, elder] = rows;
    // Seed: the head says "Planted"; the row names the form it was planted as, with no date and no fact.
    expect(seed.meta).toBe('the Acorn-cup Oak');
    expect((seed as StemGrowthRow).fact).toBeUndefined();
    expect(sprout.meta).toBe(`reached ${shortDate(T0 + 2 * DAY)}`);
    expect(shoot.meta).toBe(`reached ${shortDate(T0 + 3 * DAY)} · grew into the Whip Oak`);
    expect(bough.meta).toBe(`Now · reached ${shortDate(T0 + 4 * DAY)} · grew into the Standard Oak`);
    expect(bough.spoken.startsWith('Now, Bough, reached ')).toBe(true);
    expect(crown.meta).toBe('');
    expect(elder.meta).toBe('Grows into the Broadcrown Oak at Elder.');
    // Never a duration or a "days since".
    expect(rows.map((x) => x.meta).join(' ')).not.toMatch(/days?|since|ago/);
  });

  it('the facts word for word: FORM_FACTS where a form starts, the website lines for Sprout and Crown, none for Seed', () => {
    const rows = stemRows({ plant: grown(6), forms: true, recalled: RECALL_FORM_IV });
    const row = (g: number) => rows.find((x) => x.kind === 'growth' && x.growth === g) as StemGrowthRow;
    expect(row(2).fact).toBe(`It grew from your first ${SPROUT_ANSWERS} answers.`);
    expect(row(3).fact).toBe(FORM_FACTS[3]);
    expect(row(4).fact).toBe(FORM_FACTS[4]);
    expect(row(5).fact).toBe(`You finished a mock of ${CROWN_MOCK} questions or more.`);
    expect(row(6).fact).toBe(FORM_FACTS[6]);
    expect(GREW_FACTS[2]).toBe('It grew from your first 20 answers.');
    // Spoken as one stop: name, date, form, fact.
    expect(row(3).spoken).toBe(`Shoot, reached ${new Date(T0 + 3 * DAY).getDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][new Date(T0 + 3 * DAY).getMonth()]}, grew into the Whip Oak. ${FORM_FACTS[3]}`);
  });

  it('release bug hunt round 1: Bough and Elder claim the recalls only when this learner has them', () => {
    const fact = (recalled: number | undefined, plant: ReturnType<typeof grown>, g: number) =>
      (stemRows({ plant, forms: true, ...(recalled === undefined ? {} : { recalled }) }).find((x) => x.kind === 'growth' && x.growth === g) as StemGrowthRow);
    // A plant that grew before 1.50 (no recall gate then): Bough reached, Crown now.
    for (const r of [undefined, 0, RECALL_FORM_III - 1]) {
      const bough = fact(r, grown(5), 4);
      expect(bough.fact).toBeUndefined();
      expect(bough.spoken).not.toMatch(/questions right .*later/);
      // The row keeps its date and form.
      expect(bough.meta).toBe(`reached ${shortDate(T0 + 4 * DAY)} · grew into the Standard Oak`);
    }
    expect(fact(RECALL_FORM_III, grown(5), 4).fact).toBe(FORM_FACTS[4]);
    // Elder: the 30-recall line only with 30.
    for (const r of [undefined, 0, RECALL_FORM_III, RECALL_FORM_IV - 1]) expect(fact(r, grown(6), 6).fact).toBeUndefined();
    expect(fact(RECALL_FORM_IV, grown(6), 6).fact).toBe(FORM_FACTS[6]);
    // Shoot names no recall: always shown.
    expect(fact(0, grown(5), 3).fact).toBe(FORM_FACTS[3]);
  });

  it('with forms off: no form names, and no FORM_FACTS on Shoot, Bough or Elder', () => {
    const rows = stemRows({ plant: grown(6, { style: 'storybook' }), forms: false });
    expect(rows.some((x) => x.kind === 'growth' && x.form)).toBe(false);
    for (const g of [3, 4, 6]) expect((rows.find((x) => x.kind === 'growth' && x.growth === g) as StemGrowthRow).fact).toBeUndefined();
  });

  it('a reached growth with no saved date shows none (never a guess)', () => {
    const p = { ...grown(3), reached: { shoot: T0 + 3 * DAY } };
    const sprout = stemRows({ plant: p, forms: true })[1];
    expect(sprout.meta).toBe('');
  });

  it('keepsakes sit between the growths by their badge date; more than 8 leaves fold the ones before the current form', () => {
    const p = grown(5);
    const k = (id: string, at: number) => ({ id, name: id, badgeName: `${id} badge`, line: `${id} line.`, at });
    const rows = stemRows({ plant: p, forms: true, keepsakes: [k('jay', T0 + 2.5 * DAY), k('fox', T0 + 4.5 * DAY), k('lantern', T0 + 10 * DAY)] });
    expect(rows.map((x) => x.key)).toEqual(['g1', 'g2', 'k-jay', 'g3', 'g4', 'k-fox', 'g5', 'k-lantern', 'g6']);
    expect(rows[2].meta).toBe(`Pressed ${shortDate(T0 + 2.5 * DAY)} · jay badge`);
    expect(rows.length).toBeGreaterThan(STEM_FOLD_AFTER);
    // Crown is in Form III, which starts at Bough: Seed to the fox's... no, to Bough fold away.
    const { earlier, open } = foldStem(rows, 5);
    expect(earlier.map((x) => x.key)).toEqual(['g1', 'g2', 'k-jay', 'g3']);
    expect(open[0].key).toBe('g4');
    // 8 leaves or fewer: nothing folds.
    expect(foldStem(stemRows({ plant: p, forms: true }), 5).earlier).toEqual([]);
  });
});

// ── Sizes and copy ──────────────────────────────────────────────────────
describe('the art size and the phone copy fixes', () => {
  it('180 / 240 / 300 by growth, one step down from 1.3 text, capped by width and 40% of the screen', () => {
    expect(plantArtSize(1, 1, 361, 852)).toBe(180);
    expect(plantArtSize(2, 1, 361, 852)).toBe(180);
    expect(plantArtSize(3, 1, 361, 852)).toBe(240);
    expect(plantArtSize(4, 1, 361, 852)).toBe(300);
    expect(plantArtSize(6, 1.3, 361, 852)).toBe(240);
    expect(plantArtSize(3, 2, 361, 852)).toBe(180);
    expect(plantArtSize(6, 1, 288, 852)).toBe(288);
    expect(plantArtSize(6, 1, 361, 600)).toBe(240);
  });

  it('no "field guide", "passed", "Herbarium" or "you\'re ready" in the phone\'s plant words (PHASE4B 3.1, 3.3, 3.4)', () => {
    expect(lookCaption(lookItem('botanical')!)).toBe('A fine line drawing, like a botanist’s sketch.');
    expect(lookCaption(lookItem('ribbon')!)).toBe('The ribbon: you got the score you needed.');
    expect(lookHowToOpen(lookItem('ribbon')!)).toBe('Opens when you tell us you got the score you needed.');
    expect(lookHowToOpen(lookItem('fieldstone')!)).toBe('Opens when you finish the Groundwork set in Badges.');
    expect(phoneRestLine("Kai is resting. Pick up whenever you're ready.")).toBe('Kai is resting. Pick up whenever you like.');
    // Lines that never had the words pass through untouched (the bundle release can change the engine safely).
    expect(phoneRestLine('Kai kept your place. Pick up where you left off.')).toBe('Kai kept your place. Pick up where you left off.');
  });
});

// ── Your plant on paper ─────────────────────────────────────────────────
describe('Your plant on paper (PHASE4B 4.1, 4.7)', () => {
  it('the back row says where it goes; "YOUR OAK" over the name; with no name, "Your oak" once', () => {
    setPlant(grown(4));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    expect(labels()).toContain('Back to You');
    expect(textOf(byTestID('plant-name-block')[0])).toMatch(/^Your oak Kai The Standard Oak /);
    expect(byTestID('plant-bed-soil')).toHaveLength(1);
    unmount();
    setPlant({ ...grown(4), name: '' });
    mount(<YourPlant />);
    const block = textOf(byTestID('plant-name-block')[0]);
    expect(block.match(/Your oak/g)).toHaveLength(1);
  });

  it('the stem is one list, each row one stop; the next growth is the one forest panel, with its gates', () => {
    setPlant(grown(4));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    expect(byTestID('plant-grown')[0].props.accessibilityRole).toBe('list');
    expect(labels().some((l) => /^Now, Bough, reached /.test(l))).toBe(true);
    expect(byTestID('plant-next')).toHaveLength(1);
    expect(labels()).toContain('What grows it next: Crown');
    expect(allText()).toContain('Know the outline: topics right without a hint, on two separate days.');
    expect(allText()).toContain('Only real progress grows it, never taps, time, streaks or games. It never shrinks.');
    expect(allText()).toMatch(/Your study estimate/);
    expect(allText()).toContain('A look is just for you: it never changes your growth.');
    expect(allText()).not.toMatch(/\bstage\b|you're ready|you’re ready|field guide|Herbarium|\bpass/i);
  });

  it('at Elder: no forest panel; "Fully grown. It keeps all of its growth."', () => {
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 4 } } });
    mount(<YourPlant />);
    expect(byTestID('plant-next')).toHaveLength(0);
    expect(allText()).toContain('Fully grown. It keeps all of its growth.');
  });

  it('states: Resting (tag and line), exam eve (no tag, "Rest day."), exam day (tag), the panel hidden on both exam days', () => {
    setPlant(grown(3));
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    useSettings.setState({ examDates: { cisa: dayKey(Date.now() + DAY) } });
    mount(<YourPlant />);
    expect(byTestID('plant-state-tag')).toHaveLength(0);
    expect(allText()).toContain('Rest day. Sleep and time off help memory settle.');
    expect(byTestID('plant-next')).toHaveLength(0);
    unmount();
    useSettings.setState({ examDates: { cisa: dayKey(Date.now()) } });
    mount(<YourPlant />);
    expect(textOf(byTestID('plant-state-tag')[0])).toBe('Exam day');
    expect(allText()).toMatch(/Good luck\. You.ve done the work\./);
    expect(byTestID('plant-next')).toHaveLength(0);
  });

  it('resting: the small moon on the art and never the dusk disc; exam day never draws the resting look (review round 1)', () => {
    setPlant(grown(3));
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    // Five days without study: the resting look.
    act(() => {
      useProgress.getState().updateMilestones('cisa', (prev) => ({ milestones: { earned: {}, ...prev, lastDay: dayKey(Date.now() - 5 * DAY) } }));
    });
    mount(<YourPlant />);
    expect(textOf(byTestID('plant-state-tag')[0])).toBe('Resting');
    const hero = () => r!.root.find((n) => n.props.testID === 'plant-hero' && typeof n.type !== 'string');
    // The resting look (its moon and settle), drawn with no disc behind it.
    expect(hero().props.resting).toBe(true);
    expect(hero().props.disc).toBe(false);
    unmount();
    useSettings.setState({ examDates: { cisa: dayKey(Date.now()) } });
    mount(<YourPlant />);
    expect(textOf(byTestID('plant-state-tag')[0])).toBe('Exam day');
    expect(hero().props.resting).toBe(false);
    expect(hero().props.mood).not.toBe('resting');
  });

  it('no disc: the resting drawing loses only its dusk disc and keeps its moon, in both styles', () => {
    const find = (n: GNode, id: string): GNode | undefined =>
      n.id === id ? n : n.children.map((c) => (c.t === 'g' ? find(c, id) : undefined)).find(Boolean);
    for (const style of ['botanical', 'storybook'] as const) {
      for (const theme of ['light', 'dark'] as const) {
        const b = buildPlant({ species: 'oak', stage: 4, lod: 'full', theme, px: 300, fit: false, look: { style }, resting: true });
        expect(find(b.root, 'dusk')).toBeDefined();
        const paper = withoutDisc(b.root);
        expect(find(paper, 'dusk')).toBeUndefined();
        expect(find(paper, 'fx')).toBeDefined();
        // The shared build is never changed (the website draws it too), and the result is cached.
        expect(find(b.root, 'dusk')).toBeDefined();
        expect(withoutDisc(b.root)).toBe(paper);
      }
    }
  });

  it('hidden and nothing planted: the short lines', () => {
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    setPlant(grown(3));
    mount(<YourPlant />);
    expect(allText()).toContain('Its growth is kept. Turn on Show my plant in Settings.');
    unmount();
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: true });
    });
    setPlant(undefined);
    mount(<YourPlant />);
    expect(allText()).toContain('It grows only from real progress, and never wilts.');
  });
});

// ── The quiet grew line and the leaf fill ───────────────────────────────
describe('a growth with no new form: one line and the leaf fills once (PHASE4B 4.1 item 5, 4.6)', () => {
  const pendingCrown = (): CertPlant => ({ ...grown(5), pending: 5 });

  it('Reduce Motion: "Kai grew to Crown." once, the leaf filled at once, one light haptic; the saved mark is used up', () => {
    setPlant(pendingCrown());
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    expect(textOf(byTestID('plant-grew')[0])).toBe('Kai grew to Crown.');
    const fill = byTestID('plant-grown-leaf-g5-fill')[0];
    expect(flat(fill).opacity).toBe(1);
    expect((Haptics.impactAsync as jest.Mock).mock.calls.length).toBe(1);
    expect(useProgress.getState().byCert.cisa?.plant?.pending).toBeUndefined();
    unmount();
    mount(<YourPlant />);
    expect(byTestID('plant-grew')).toHaveLength(0);
  });

  it('whichever screen shows it first uses it up: after Today, Your plant shows the leaf filled with no line and no haptic', () => {
    setPlant(pendingCrown());
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<Today />);
    unmount();
    expect(useProgress.getState().byCert.cisa?.plant?.pending).toBeUndefined();
    (Haptics.impactAsync as jest.Mock).mockClear();
    mount(<YourPlant />);
    expect(byTestID('plant-grew')).toHaveLength(0);
    expect(flat(byTestID('plant-grown-leaf-g5-fill')[0]).opacity).toBe(1);
    expect((Haptics.impactAsync as jest.Mock).mock.calls.length).toBe(0);
  });

  it('full motion: the leaf fills (its end state is filled, at full size)', () => {
    motionOn();
    setPlant(pendingCrown());
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    const s = flat(byTestID('plant-grown-leaf-g5-fill')[0]);
    expect(s.opacity).toBe(1);
    expect(s.transform).toEqual([{ scale: 1 }]);
  });
});

// ── The Turning on paper ────────────────────────────────────────────────
describe('the Turning on paper (PHASE4B 4.4, 4.5)', () => {
  it('Reduce Motion: the fact above the art, the label rule and name at their end, the new leaf filled at once, no drift', () => {
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    expect(byTestID('plant-form-reveal-reduced')).toHaveLength(1);
    expect(textOf(byTestID('plant-form-reveal-fact')[0])).toBe(FORM_FACTS[6]);
    const rule = flat(byTestID('plant-form-reveal-rule')[0]);
    expect(rule.opacity).toBe(1);
    expect(rule.transform).toEqual([{ scaleX: 1 }]);
    expect(flat(byTestID('plant-form-reveal-name')[0]).opacity).toBe(1);
    expect(textOf(byTestID('plant-form-reveal-name')[0])).toBe('New form The Broadcrown Oak');
    expect(flat(byTestID('plant-grown-leaf-g6-fill')[0]).opacity).toBe(1);
    expect(r!.root.findAllByType(LeafFall)).toHaveLength(0);
    expect(byTestID('plant-form-reveal-soil')).toHaveLength(1);
  });

  it('full motion: the new leaf never fills during the swaps; it fills when the name lands (here, on a skip)', () => {
    motionOn();
    setMockHoldAnimations(true);
    setPlant(grown(4));
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    mount(<YourPlant />);
    expect(byTestID('plant-form-reveal-full')).toHaveLength(1);
    expect(flat(byTestID('plant-grown-leaf-g4-fill')[0]).opacity).toBe(0);
    setMockHoldAnimations(false);
    act(() => byTestID('plant-form-reveal')[0].props.onTouchStart());
    // The mock runs the fill to its end at once; a render reads the landed value.
    act(() => r!.update(<YourPlant />));
    expect(flat(byTestID('plant-grown-leaf-g4-fill')[0]).opacity).toBe(1);
  });

  it('at Elder in full motion, a few leaves drift once down the art (inside the stage) after it ends', async () => {
    motionOn();
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    // Full motion starts its clock on the next frame; the mock clock then runs to the end at once.
    await act(async () => {
      await new Promise((res) => setTimeout(res, 0));
    });
    const drift = r!.root.findAllByType(LeafFall);
    expect(drift).toHaveLength(1);
    expect(drift[0].props.count ?? 8).toBeLessThanOrEqual(8);
    expect(byTestID('plant-form-reveal-full')[0].findAllByType(LeafFall)).toHaveLength(1);
  });

  it('at Elder in full motion, a skip followed by the end means no drift (review round 1)', () => {
    motionOn();
    setMockHoldAnimations(true);
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    expect(byTestID('plant-form-reveal-full')).toHaveLength(1);
    // A tap skips; the dissolve then runs to its end.
    setMockHoldAnimations(false);
    act(() => byTestID('plant-form-reveal')[0].props.onTouchStart());
    act(() => r!.update(<YourPlant />));
    expect(byTestID('plant-form-reveal-label')).toHaveLength(1);
    expect(r!.root.findAllByType(LeafFall)).toHaveLength(0);
  });

  it('a screen reader on counts like Reduce Motion: no waiting button, the end state at once, one announcement (review round 1)', () => {
    motionOn();
    setScreenReaderForTest(true);
    // Even with the session's moment already spent, nothing waits for a tap.
    const { claimMoment } = jest.requireActual('../components/motion') as typeof import('../components/motion');
    claimMoment();
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    expect(byTestID('plant-form-reveal-reduced')).toHaveLength(1);
    expect(byTestID('plant-form-reveal-play')).toHaveLength(0);
    expect(flat(byTestID('plant-form-reveal-name')[0]).opacity).toBe(1);
    expect(flat(byTestID('plant-form-reveal-rule')[0]).opacity).toBe(1);
    // The words are never hidden from the screen reader.
    expect(byTestID('plant-form-reveal-words')[0].props.accessibilityElementsHidden).toBe(false);
    expect(r!.root.findAllByType(LeafFall)).toHaveLength(0);
    flushSayLaterForTest();
    const said = announce.mock.calls.map((c) => c[0]).filter((t) => /new form/.test(t));
    expect(said).toHaveLength(1);
  });

  it('a screen reader on never claims the session’s moment', () => {
    motionOn();
    setScreenReaderForTest(true);
    setPlant(grown(3));
    useSeen.setState({ plantForms: { cisa: { seen: 1 } } });
    mount(<YourPlant />);
    expect(byTestID('plant-form-reveal-reduced')).toHaveLength(1);
    const { claimMoment } = jest.requireActual('../components/motion') as typeof import('../components/motion');
    expect(claimMoment()).toBe(true);
  });

  it('waiting (the session’s moment spent): the solid button and "It plays when you tap."', () => {
    motionOn();
    const { claimMoment } = jest.requireActual('../components/motion') as typeof import('../components/motion');
    claimMoment();
    setPlant(grown(3));
    useSeen.setState({ plantForms: { cisa: { seen: 1 } } });
    mount(<YourPlant />);
    const words = textOf(byTestID('plant-form-reveal-words')[0]);
    expect(words).toContain('See Kai’s new form');
    expect(words).toContain('It plays when you tap.');
  });
});

// ── Look and Pick ───────────────────────────────────────────────────────
describe('Look and Pick (PHASE4B 4.2, 4.3)', () => {
  const option = (id: string) => r!.root.findAll((n) => n.props.testID === `look-${id}` && typeof n.props.accessibilityRole === 'string')[0];
  const openMore = () => {
    const more = r!.root.findAll((n) => n.props.testID === 'look-more' && typeof n.props.onPress === 'function')[0];
    act(() => more.props.onPress());
  };

  it('the back row goes to Your plant; the title is "Look"; the order is Style, Colour, Ground, Planter, Visitor, then Keepsakes', () => {
    setPlant(grown(3));
    mount(<PlantLook />);
    expect(labels()).toContain('Back to Your plant');
    const t = allText();
    const at = (w: string) => t.indexOf(w);
    expect(at('Look')).toBeLessThan(at('Style'));
    for (const [a, b] of [['Style', 'Colour'], ['Colour', 'Ground'], ['Ground', 'Planter'], ['Planter', 'Visitor'], ['Visitor', 'Keepsakes']]) expect(at(a)).toBeLessThan(at(b));
    expect(option('botanical').props.accessibilityRole).toBe('radio');
  });

  it('the ribbon stays out of More to find until the exam date has passed', () => {
    setPlant(grown(3));
    mount(<PlantLook />);
    openMore();
    expect(option('ribbon')).toBeUndefined();
    unmount();
    useSettings.setState({ examDates: { cisa: dayKey(Date.now() - 2 * DAY) } });
    mount(<PlantLook />);
    openMore();
    expect(option('ribbon')).toBeDefined();
    expect(option('ribbon').props.accessibilityLabel).toBe('Ribbon. Not open yet. Opens when you tell us you got the score you needed.');
  });

  it('"Plant it" opens Your plant with the planting moment; Your plant plays plantIn only then', () => {
    const { router } = jest.requireMock('expo-router') as { router: { replace: jest.Mock } };
    mount(<PlantPick />);
    const plantIt = r!.root.findAll((n) => n.props.accessibilityLabel === 'Plant it' && typeof n.props.onPress === 'function')[0];
    act(() => plantIt.props.onPress());
    expect(router.replace).toHaveBeenLastCalledWith({ pathname: '/plant', params: { planted: '1' } });
    unmount();
    mockParams.from = undefined;
    (mockParams as { planted?: string }).planted = '1';
    mount(<YourPlant />);
    expect(r!.root.findAll((n) => n.props.testID === 'plant-hero' && n.props.plantIn === true).length).toBeGreaterThan(0);
    unmount();
    delete (mockParams as { planted?: string }).planted;
    mount(<YourPlant />);
    expect(r!.root.findAll((n) => n.props.testID === 'plant-hero' && n.props.plantIn === true)).toHaveLength(0);
  });

  it('each picker mode has its own title and line', () => {
    mount(<PlantPick />);
    expect(allText()).toMatch(/^Choose what you’ll grow Grows from real progress, never from taps or time\./);
    unmount();
    setPlant(grown(3));
    mockParams.mode = 'species';
    mount(<PlantPick />);
    expect(allText()).toMatch(/^Change plant Same growth, new look\. Each is shown at Crown\./);
    expect(allText()).toContain('Use this plant');
    unmount();
    mockParams.mode = 'name';
    mount(<PlantPick />);
    expect(allText()).toMatch(/^Rename Oak /);
    expect(allText()).toContain('Save name');
    expect(r!.root.findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('species-'))).toHaveLength(0);
  });
});

// ── The widget ──────────────────────────────────────────────────────────
describe('the widget on paper (PHASE4B 4.10)', () => {
  it('draws a soil line across the whole frame at the plant base, in the Grove soil colour', () => {
    expect(soilLine('10 20 100 100', 150, 'light')).toBe('<path d="M10 150H110" fill="none" stroke="#A89B83" stroke-width="1.00" stroke-linecap="round"/>');
    expect(soilLine('10 20 100 100', 150, 'dark')).toContain('stroke="#6B5844"');
    expect(soilLine('bad', 150, 'light')).toBe('');
  });
});
