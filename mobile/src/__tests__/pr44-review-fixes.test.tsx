/**
 * PR #44 review fixes (mobile 1.14.0 "Dress and Alive"): the code review
 * (CR_44: M2–M10), the UX review (UX_44: H1–H4, P1–P16) and the probes
 * that confirmed them (scratchpad probes14, P2–P7), as real tests.
 *
 * Data safety first: the Reset properties here run over thousands of random
 * plants, marks and looks, for the exam that is reset AND for every other
 * exam's plant (M6), with the default "first three earned" keepsakes (H1).
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import YourPlant from '../app/plant';
import { previewSizeFor } from '../app/plant-look';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest, type Celebration } from '../components/motion';
import { bandHalfWidth, buildPlant, bounds, builtCacheSize, groupNames, keepsakeIcon, keepsakeShape, planterIcon, type GNode, type PNode } from '../components/plant/art';
import { claimReaction, LivePlant, reactionMs, resetPlantReactionsForTest } from '../components/plant/LivePlant';
import { freezeKeepsakes, isValidPlantState, keepThroughOtherReset, plantNew, repairPlant, resetPlant, withLook, type CertPlant, type GrowthLevel } from '../engine/plant';
import { defaultKeepsakes, isKeepable, isUnlocked, keepOnReset, KEEPSAKE_ITEMS, lookItem, LOOK_ITEMS, resolveLook, unlockedLooks, type CertMarks } from '../engine/plantLooks';
import { createRng } from '../engine/random';
import { dayKey } from '../engine/streak';
import { allCertMarks, newKeepsakeOn, plantLookView } from '../lib/plant';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import { motion, LARGE_TEXT } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : Icon) });
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const NOW = Date.UTC(2026, 9, 12, 12);
const TODAY = dayKey(NOW);
const DAY = 86_400_000;
const looks = { marks: [], face: true, resting: false, planCleared: false, newTopicToday: false, newKeepsakeToday: false, today: TODAY };
const drawn = (p: CertPlant, marks: readonly CertMarks[]) => resolveLook(p.species, p.look, unlockedLooks(p, marks), defaultKeepsakes(p, marks));

let r: ReactTestRenderer | undefined;
beforeEach(() => {
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  resetPlantReactionsForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, quietGrowth: {} });
  act(() => {
    useProgress.setState({ byCert: {}, plantSettings: undefined, days: {} });
  });
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', badgesHidden: false });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

// ── M4: the ribbon, and what `kept` may hold ───────────────────────────
describe('kept holds only what a Reset can carry (code review M4)', () => {
  it('kept: ["ribbon"] never opens the ribbon without a reported pass, and a file with it is refused', () => {
    const p: CertPlant = { ...plantNew('oak', 'Kai', NOW), kept: ['ribbon'] };
    expect(isUnlocked(lookItem('ribbon')!, p, [])).toBe(false);
    expect(isValidPlantState(p)).toBe(false);
    expect(repairPlant(p).kept).toEqual([]);
    expect(isUnlocked(lookItem('ribbon')!, { ...p, passedOn: '2026-10-01' }, [])).toBe(true);
  });
  it('free items and the ribbon are never keepable; growth, badge and set unlocks are', () => {
    for (const x of LOOK_ITEMS) expect(isKeepable(x.id)).toBe(x.unlock.kind === 'growth' || x.unlock.kind === 'badge' || x.unlock.kind === 'set');
    expect(isKeepable('nope')).toBe(false);
    const passed = { ...plantNew('oak', 'Kai', NOW, 6), passedOn: '2026-10-01' };
    expect(keepOnReset(passed, [])).not.toContain('ribbon');
    // The pass date survives the Reset, so the ribbon stays open without `kept`.
    const reset = resetPlant(passed, NOW + 1, keepOnReset(passed, []));
    expect(reset.passedOn).toBe('2026-10-01');
    expect(isUnlocked(lookItem('ribbon')!, reset, [])).toBe(true);
    expect(isValidPlantState(reset)).toBe(true);
  });
});

// ── H1: the default keepsakes, and Reset keeping exactly what is drawn ─
describe('the default keepsakes (UX review H1, decided)', () => {
  it('never chosen: the first three EARNED (by time, on any exam); an explicit list, even empty, wins', () => {
    const p = plantNew('oak', 'Kai', NOW, 3);
    const marks: CertMarks[] = [{ earned: { 'snare-wise': NOW - 1 * DAY, 'on-pace:2': NOW - 2 * DAY } }, { earned: { 'on-pace': NOW - 9 * DAY, 'dress-rehearsal': NOW - 5 * DAY, 'long-memory': NOW } }];
    expect(defaultKeepsakes(p, marks)).toEqual(['sundial', 'lantern', 'fox']);
    expect(drawn(p, marks).keepsakes).toEqual(['sundial', 'lantern', 'fox']);
    expect(drawn(withLook(p, { keepsakes: [] }), marks).keepsakes).toEqual([]);
    expect(drawn(withLook(p, { keepsakes: ['jay'] }), marks).keepsakes).toEqual(['jay']);
    // null goes back to the default.
    expect(withLook(withLook(p, { keepsakes: [] }), { keepsakes: null }).look).toBeUndefined();
  });
  it('a newly earned badge shows by default while there is room, so the sheet line is true', () => {
    const p = plantNew('oak', 'Kai', NOW, 2);
    const v = plantLookView(p, { ...looks, marks: [{ earned: { 'dress-rehearsal': NOW } }] });
    expect(v.resolved.keepsakes).toEqual(['lantern']);
  });
});

describe('Reset draws exactly what it drew before (P6, extended for H1 and M6)', () => {
  const rng = createRng(44);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
  const badges = LOOK_ITEMS.flatMap((x) => (x.unlock.kind === 'badge' ? [x.unlock.badge] : []));
  const sets = ['groundwork', 'domains', 'evergreen', 'judgement', 'examDay', 'rooted'];
  const mk = (): CertMarks => ({
    earned: Object.fromEntries(badges.filter(() => rng() < 0.3).map((b) => [rng() < 0.5 ? b : `${b}:2`, NOW - Math.floor(rng() * 40) * DAY])),
    planters: Object.fromEntries(sets.filter(() => rng() < 0.3).map((s) => [s, NOW])),
  });
  const randomPlant = (marks: CertMarks[]): CertPlant => {
    const species = pick(['oak', 'lotus', 'cactus', 'sunflower', 'bonsai', 'cherry-blossom'] as const);
    const base = plantNew(species, 'Kai', NOW - 50 * DAY, (1 + Math.floor(rng() * 6)) as GrowthLevel);
    const p: CertPlant = { ...base, ...(rng() < 0.3 ? { passedOn: '2026-10-01' } : {}), ...(rng() < 0.3 ? { kept: ['robin', 'lantern'] } : {}) };
    const open = unlockedLooks(p, marks);
    const slot = (s: string) => LOOK_ITEMS.filter((x) => x.slot === s && open.includes(x.id) && (s !== 'colourway' || x.species === species));
    const look = {
      colourway: pick(slot('colourway')).id,
      ground: pick(slot('ground')).id,
      planter: pick(slot('planter')).id,
      visitor: pick(slot('visitor')).id,
      // Half never chose keepsakes (the default three), half chose some (maybe none).
      ...(rng() < 0.5 ? { keepsakes: slot('keepsake').filter(() => rng() < 0.2).slice(0, 3).map((x) => x.id) } : {}),
    };
    return { ...p, look };
  };

  it('engine: 2000 random plants; this exam’s plant and the other exam’s plant both draw the same after the Reset', () => {
    for (let i = 0; i < 2000; i++) {
      const marks = [mk(), mk()];
      const mine = randomPlant(marks);
      const other = randomPlant(marks);
      const before = [drawn(mine, marks), drawn(other, marks)];
      // resetCert: this exam's marks are cleared; its plant keeps every open unlock; the other plant keeps this exam's badges and sets.
      const resetMine = resetPlant(freezeKeepsakes(mine, marks), NOW + 1, keepOnReset(mine, marks));
      const after = [{ earned: {} }, marks[1]];
      const keptOther = keepThroughOtherReset(other, marks, marks[0]);
      expect(drawn(resetMine, after)).toEqual(before[0]);
      expect(drawn(keptOther, after)).toEqual(before[1]);
      for (const p of [resetMine, keptOther]) {
        expect(isValidPlantState(p)).toBe(true);
        expect((p.kept ?? []).every(isKeepable)).toBe(true);
      }
      // The other plant's growth and choices are untouched (only `kept`, and a frozen default, change).
      expect(keptOther.growth).toBe(other.growth);
      expect({ ...keptOther.look, keepsakes: undefined }).toEqual({ ...other.look, keepsakes: undefined });
    }
  });

  it('store: Reset CISA never takes a keepsake or a planter off the CISM plant (code review M6, probe P5)', () => {
    for (let i = 0; i < 150; i++) {
      const marks = [mk(), mk()];
      const cisa = randomPlant(marks);
      const cism = randomPlant(marks);
      act(() => {
        useProgress.setState({
          byCert: {
            cisa: { ...selectCert(useProgress.getState(), 'cisa'), plant: cisa, milestones: { earned: marks[0].earned ?? {}, planters: marks[0].planters } },
            cism: { ...selectCert(useProgress.getState(), 'cism'), plant: cism, milestones: { earned: marks[1].earned ?? {}, planters: marks[1].planters } },
          },
        });
      });
      const s0 = useProgress.getState().byCert;
      const before = { cisa: drawn(s0.cisa!.plant!, allCertMarks(s0)), cism: drawn(s0.cism!.plant!, allCertMarks(s0)) };
      act(() => {
        useProgress.getState().resetCert('cisa');
      });
      const s1 = useProgress.getState().byCert;
      expect(s1.cisa!.milestones!.earned).toEqual({});
      expect(drawn(s1.cisa!.plant!, allCertMarks(s1))).toEqual(before.cisa);
      expect(drawn(s1.cism!.plant!, allCertMarks(s1))).toEqual(before.cism);
      expect(s1.cism!.plant!.growth).toBe(cism.growth);
      expect(s1.cism!.milestones).toEqual(s0.cism!.milestones);
      for (const id of ['cisa', 'cism'] as const) expect(isValidPlantState(s1[id]!.plant)).toBe(true);
    }
  });

  it('the probe case: the CISM plant shows the lantern from a CISA badge; Reset CISA keeps it', () => {
    const cism: CertPlant = { ...plantNew('lotus', 'Lumi', NOW, 2), look: { keepsakes: ['lantern'] } };
    const marks: CertMarks[] = [{ earned: { 'dress-rehearsal': NOW } }, {}];
    expect(drawn(cism, marks).keepsakes).toEqual(['lantern']);
    const kept = keepThroughOtherReset(cism, marks, marks[0]);
    expect(kept.kept).toContain('lantern');
    expect(drawn(kept, [{ earned: {} }, {}]).keepsakes).toEqual(['lantern']);
    // Nothing to carry: the same object.
    expect(keepThroughOtherReset(kept, [{ earned: {} }, {}], { earned: {} })).toBe(kept);
  });
});

// ── M5 and QA BUG-2: what makes the plant proud ───────────────────────
describe('proud is earned today (code review M5, QA BUG-2/3)', () => {
  it('a back-filled planting (or a restore with no plant) is not proud on day one; a real growth today is', () => {
    const p = plantNew('oak', 'Kai', NOW, 4);
    expect(plantLookView(p, looks).mood).not.toBe('proud');
    expect(plantLookView({ ...p, growth: 5, reached: { ...p.reached, crown: NOW + 5 } }, looks).mood).toBe('proud');
  });
  it('a new keepsake today is the FIRST tier of its badge on any exam', () => {
    const at = (earned: Record<string, number>, other: Record<string, number> = {}) =>
      newKeepsakeOn({ cisa: { milestones: { earned } }, cism: { milestones: { earned: other } } } as never, TODAY);
    expect(at({ 'long-memory': NOW })).toBe(true);
    expect(at({ 'long-memory': NOW - 30 * DAY, 'long-memory:50': NOW })).toBe(false);
    expect(at({ 'long-memory:50': NOW }, { 'long-memory': NOW - 3 * DAY })).toBe(false);
    expect(at({ 'firm-footing': NOW })).toBe(false); // no keepsake
  });
});

// ── M3, M7a: reactions ─────────────────────────────────────────────────
describe('reactions (code review M3 and M7a; probe P2)', () => {
  const full: Celebration = { mode: 'full', first: true, settled: false, run: 1, skip: () => {} };
  it('with the growth sequence, the proud reaction is spent without playing (one move at a time)', () => {
    setMockReducedMotion(false);
    setSystemReducedMotionForTest(false);
    act(() => {
      r = create(<LivePlant testID="live" species="oak" stage={4} size={104} theme="light" reaction={{ id: 'cisa:proud:d', mood: 'proud' }} growth={{ from: 3, celebration: full }} />);
    });
    // Spent: it never plays later the same session (Your plant), and it charged nothing.
    expect(claimReaction('cisa:proud:d')).toBe(false);
  });
  it('curious is charged its whole lean (900 ms), the others their 600 ms', () => {
    expect(reactionMs('curious')).toBe(motion.plant.lean);
    expect(reactionMs('happy')).toBe(motion.plant.react);
    expect(reactionMs('proud')).toBe(motion.plant.react);
    // Five 600 ms reactions fit the 3 s budget; four leans do not.
    for (let i = 0; i < 3; i++) expect(claimReaction(`lean:${i}`, reactionMs('curious'))).toBe(true);
    expect(claimReaction('lean:3', reactionMs('curious'))).toBe(false);
  });
  it('no unused plant motion tokens (code review M7b, UX review P7)', () => {
    expect(Object.keys(motion.plant).sort()).toEqual(['breath', 'breathOut', 'breaths', 'grow', 'lean', 'plantIn', 'react']);
    expect((motion.plant.breath + motion.plant.breathOut) * motion.plant.breaths).toBeLessThanOrEqual(5000);
  });
});

// ── The art ────────────────────────────────────────────────────────────
const findGroup = (n: PNode, id: string): GNode | null => {
  if (n.t !== 'g') return null;
  if (n.id === id) return n;
  for (const c of n.children) {
    const hit = findGroup(c, id);
    if (hit) return hit;
  }
  return null;
};
const placed = (root: GNode, id: string) => {
  const g = findGroup(root, `keepsake-${id}`)!;
  const [, x, y, k] = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/.exec(g.transform!)!.map(Number);
  return { x, y, k };
};

describe('keepsake placement (UX review H2)', () => {
  it('flat keepsakes take the base slots first; a flat third lies in front, never behind the trunk', () => {
    const b = buildPlant({ species: 'oak', stage: 5, look: { keepsakes: ['trail-post', 'stepping-stone', 'still-pond'] } });
    const front = groupNames(findGroup(b.root, 'keepsakes')!);
    const back = groupNames(findGroup(b.root, 'keepsakes-back')!);
    expect(front).toEqual(expect.arrayContaining(['keepsake-stepping-stone', 'keepsake-still-pond']));
    // Two flat ones fill the base slots; the tall post stands behind.
    expect(back).toContain('keepsake-trail-post');
    const three = buildPlant({ species: 'oak', stage: 5, look: { keepsakes: ['stepping-stone', 'still-pond', 'empty-nest'] } });
    expect(groupNames(findGroup(three.root, 'keepsakes-back')!)).not.toContain('keepsake-empty-nest');
    expect(groupNames(findGroup(three.root, 'keepsakes')!)).toContain('keepsake-empty-nest');
  });
  it.each(['oak', 'narra', 'mango', 'pine', 'sunflower', 'bamboo'] as const)('%s: the keepsake behind stands clear of the trunk', (species) => {
    for (const stage of [3, 4, 5, 6]) {
      const b = buildPlant({ species, stage, look: { keepsakes: ['fox', 'jay', 'lantern'] } });
      const p = placed(b.root, 'lantern');
      expect(groupNames(findGroup(b.root, 'keepsakes-back')!)).toContain('keepsake-lantern');
      // The lantern's left edge (4.6 units × its scale) is right of the trunk's base, and it stays on the stage.
      const tree = findGroup(b.root, 'tree')!;
      const base = b.anchors.base.y;
      const trunkHalf = bandHalfWidth({ ...tree, children: [tree.children[0]] }, base - 16, base - 1);
      expect(p.x - 4.6 * p.k).toBeGreaterThanOrEqual(100 + trunkHalf);
      expect(p.x + 4.6 * p.k).toBeLessThanOrEqual(200);
    }
  });
});

describe('dark keepsakes and icons (UX review P12, P8)', () => {
  it('dark: a soft cream rim at 35% behind each keepsake, and no near-black wood', () => {
    const light = keepsakeShape('signpost', 'small', 'light');
    const dark = keepsakeShape('signpost', 'small', 'dark');
    expect(dark.length).toBe(light.length + 1);
    expect(dark[0]).toMatchObject({ t: 'g', opacity: 0.35 });
    expect(JSON.stringify(dark.slice(1))).not.toContain('#5F432C');
  });
  it('every keepsake icon is fitted: its height about 80% of a square frame, centred', () => {
    for (const k of KEEPSAKE_ITEMS) {
      const { root, viewBox } = keepsakeIcon(k.id);
      const [x, y, w, h] = viewBox.split(' ').map(Number);
      expect(w).toBeCloseTo(h, 5);
      const b = bounds(root);
      expect((b.maxY - b.minY) / h).toBeLessThanOrEqual(0.81);
      expect(Math.max((b.maxY - b.minY) / h, (b.maxX - b.minX) / w)).toBeGreaterThan(0.75);
      expect((b.minY + b.maxY) / 2).toBeCloseTo(y + h / 2, 0);
      expect((b.minX + b.maxX) / 2).toBeCloseTo(x + w / 2, 0);
    }
  });
  it('a planter icon draws that planter, as this species wears it', () => {
    expect(JSON.stringify(planterIcon('celadon', 'oak').root)).not.toBe(JSON.stringify(planterIcon('banded', 'oak').root));
    expect(JSON.stringify(planterIcon('native', 'lotus').root)).not.toBe(JSON.stringify(planterIcon('native', 'oak').root));
  });
});

describe('the proud face (UX review P3, option a) and the build cache (M8c)', () => {
  it('proud differs from happy: half-lids and a closed smile, a stronger blush', () => {
    const face = (mood: 'happy' | 'proud') => JSON.stringify(findGroup(buildPlant({ species: 'oak', stage: 5, mood }).root, 'face'));
    expect(face('proud')).not.toBe(face('happy'));
    expect(face('proud')).toContain('"opacity":0.7');
  });
  it('the build cache holds at most 32 builds', () => {
    for (let i = 0; i < 100; i++) buildPlant({ species: 'oak', stage: 1 + (i % 6), organs: [0.62 + i / 400], lod: 'small' });
    expect(builtCacheSize()).toBeLessThanOrEqual(32);
  });
});

describe('the Look preview size (UX review P9)', () => {
  it('140pt, 96pt at large text, 72pt at very large text or on a short phone', () => {
    expect(previewSizeFor(1, 852)).toBe(140);
    expect(previewSizeFor(LARGE_TEXT, 852)).toBe(96);
    expect(previewSizeFor(2, 852)).toBe(72);
    expect(previewSizeFor(1, 640)).toBe(72);
  });
});

// ── M1 (Your plant side): the quiet grow-up line ──────────────────────
describe('a growth applied quietly on Today is said on Your plant, once (code review M1)', () => {
  it('"Kai grew to Elder." once, then never again', () => {
    act(() => {
      useProgress.getState().updatePlant('cisa', () => ({ ...plantNew('oak', 'Kai', Date.now() - 30 * DAY, 6) }));
    });
    useSeen.setState({ quietGrowth: { cisa: 6 } });
    act(() => {
      r = create(<YourPlant />);
    });
    const line = () => r!.root.findAll((n) => n.props.testID === 'plant-grew-quietly' && typeof n.type === 'string');
    expect(line()).toHaveLength(1);
    const text: string[] = [];
    const walk = (n: unknown) => (typeof n === 'string' ? text.push(n) : (n as { children: unknown[] }).children.forEach(walk));
    walk(line()[0]);
    expect(text.join(' ')).toMatch(/Your plant grew Kai grew to Elder\./);
    expect(useSeen.getState().quietGrowth.cisa).toBeUndefined();
    act(() => r!.unmount());
    act(() => {
      r = create(<YourPlant />);
    });
    expect(line()).toHaveLength(0);
  });
});
