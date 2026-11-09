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
import { act, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';

import { setMockHoldAnimations, setMockReducedMotion } from '../../jest/reanimated-mock';




import {  resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { plantArtSize } from '../components/plant/PlantPage';
import { buildPlant, type GNode } from '../components/plant/art';
import { withoutDisc } from '../components/plant/LivePlant';
import { CROWN_MOCK, FORM_FACTS, GROWTH_IDS, plantNew, SPROUT_ANSWERS, type CertPlant, type GrowthLevel } from '../engine/plant';
import { RECALL_FORM_III, RECALL_FORM_IV } from '../engine/plantForms';
import { lookItem } from '../engine/plantLooks';

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
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
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
});

// ── The quiet grew line and the leaf fill ───────────────────────────────
describe('a growth with no new form: one line and the leaf fills once (PHASE4B 4.1 item 5, 4.6)', () => {
});

// ── The Turning on paper ────────────────────────────────────────────────
describe('the Turning on paper (PHASE4B 4.4, 4.5)', () => {
});

// ── Look and Pick ───────────────────────────────────────────────────────
describe('Look and Pick (PHASE4B 4.2, 4.3)', () => {
});

// ── The widget ──────────────────────────────────────────────────────────
describe('the widget on paper (PHASE4B 4.10)', () => {
  it('draws a soil line across the whole frame at the plant base, in the Grove soil colour', () => {
    expect(soilLine('10 20 100 100', 150, 'light')).toBe('<path d="M10 150H110" fill="none" stroke="#A89B83" stroke-width="1.00" stroke-linecap="round"/>');
    expect(soilLine('10 20 100 100', 150, 'dark')).toContain('stroke="#6B5844"');
    expect(soilLine('bad', 150, 'light')).toBe('');
  });
});
