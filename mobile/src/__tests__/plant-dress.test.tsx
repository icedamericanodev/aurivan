/**
 * Mobile 1.14 (Phase 4b "Dress and Alive"): the plant's look on the art,
 * and its motion. Pins:
 * - every colourway, ground, planter, visitor and keepsake builds for every
 *   species at every growth and detail level, and stays on the 200 × 200
 *   hero stage (nothing clipped);
 * - keepsakes: up to three beside the plant (two base slots, one behind;
 *   the clear dawn is the backdrop), never at icon size;
 * - moods are on the face only: no posture or marks (resting keeps its moon);
 * - 24pt chips: lotus and sampaguita simplified; the round crowns differ by shape;
 * - the three motion layers, the lifted sprout, the bounded build cache;
 * - <LivePlant>: one image stop from the first frame; under Reduce Motion
 *   nothing moves (end state); a reaction plays once per occasion and spends
 *   the session budget; the growth sequence draws the old growth only in
 *   its full form.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { buildPlant, builtCacheSize, bounds, groupNames, liftGroup, plantLayers, type GNode, type PNode } from '../components/plant/art';
import { claimReaction, LivePlant, resetPlantReactionsForTest } from '../components/plant/LivePlant';
import { resetCelebrationsForTest, setSystemReducedMotionForTest, type Celebration } from '../components/motion';
import { GROWTH_IDS, growthBefore, PLANT_SPECIES, type GrowthLevel } from '../engine/plant';
import { colourwaysFor, GROUNDS, KEEPSAKE_ITEMS, plantersFor, VISITORS } from '../engine/plantLooks';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]) }));

const GROWTHS: GrowthLevel[] = [1, 2, 3, 4, 5, 6];
const fills = (n: PNode, out: string[] = []): string[] => {
  if (n.fill) out.push(n.fill);
  if (n.stroke) out.push(n.stroke);
  if (n.t === 'g') n.children.forEach((c) => fills(c, out));
  return out;
};
const onStage = (root: GNode) => {
  const b = bounds(root);
  return b.minX >= -0.5 && b.maxX <= 200.5 && b.minY >= -0.5 && b.maxY <= 200.5;
};

describe('the look on the art', () => {
  it('every colourway, ground, planter and visitor builds for every species and growth, on the stage', () => {
    for (const species of PLANT_SPECIES)
      for (const stage of GROWTHS) {
        for (const cw of colourwaysFor(species)) expect(onStage(buildPlant({ species, stage, look: { palette: cw.palette } }).root)).toBe(true);
        if (stage === 1 || stage === 3 || stage === 6) for (const g of GROUNDS) for (const pl of plantersFor(species)) {
          const b = buildPlant({ species, stage, look: { ground: g.id, planter: pl.id, visitor: 'robin' } });
          expect(onStage(b.root)).toBe(true);
          for (const c of fills(b.root)) expect(c === 'none' || /^#[0-9A-F]{6}$/i.test(c)).toBe(true);
        }
        for (const v of VISITORS) buildPlant({ species, stage, lod: 'small', look: { visitor: v.id } });
      }
  });

  it('a colourway changes the leaves or blooms, never the bark or pot', () => {
    const a = buildPlant({ species: 'oak', stage: 5, look: { palette: 'grove' } });
    const b = buildPlant({ species: 'oak', stage: 5, look: { palette: 'gold' } });
    expect(fills(a.root)).not.toEqual(fills(b.root));
    const trunk = (x: typeof a) => JSON.stringify(x.root).match(/"id":"trunk".*?\]/)![0];
    expect(trunk(a)).toBe(trunk(b));
  });

  it('the visitor perches on the plant (it moves with it), and never at icon size', () => {
    const b = buildPlant({ species: 'oak', stage: 4, look: { visitor: 'wren' } });
    const body = (b.root.children.find((c) => c.t === 'g' && c.id === 'tree') as GNode).children.find((c) => c.t === 'g' && c.id === 'body')!;
    expect(groupNames(body)).toContain('visitor');
    expect(groupNames(buildPlant({ species: 'oak', stage: 4, lod: 'icon', look: { visitor: 'wren' } }).root)).not.toContain('visitor');
    expect(groupNames(buildPlant({ species: 'oak', stage: 4, look: { visitor: 'no-visitor' } }).root)).not.toContain('visitor');
  });

  it('keepsakes: up to three, beside and behind the plant, on the stage; the dawn is the backdrop; none at icon size', () => {
    for (const species of PLANT_SPECIES)
      for (const stage of [1, 3, 6] as GrowthLevel[])
        for (let i = 0; i < KEEPSAKE_ITEMS.length; i += 3) {
          const ks = KEEPSAKE_ITEMS.slice(i, i + 3).map((k) => k.id);
          const b = buildPlant({ species, stage, lod: 'small', look: { keepsakes: ks } });
          const names = groupNames(b.root);
          for (const k of ks) expect(names).toContain(`keepsake-${k}`);
          expect(onStage(b.root)).toBe(true);
          expect(groupNames(buildPlant({ species, stage, lod: 'icon', look: { keepsakes: ks } }).root).some((n) => n.startsWith('keepsake-'))).toBe(false);
        }
    const dawn = buildPlant({ species: 'oak', stage: 5, look: { keepsakes: ['clear-dawn', 'fox', 'jay'] } });
    // The dawn sits behind everything; the other two take the base slots.
    const ids = dawn.root.children.map((c) => (c as GNode).id);
    expect(ids.indexOf('keepsake-clear-dawn')).toBeLessThan(ids.indexOf('ground'));
    expect(groupNames(dawn.root.children.find((c) => c.t === 'g' && c.id === 'keepsakes')!)).toEqual(['keepsakes', 'keepsake-fox', 'keepsake-jay']);
  });

  it('every keepsake has its own drawing (an icon too)', () => {
    for (const k of KEEPSAKE_ITEMS) {
      const b = buildPlant({ species: 'bamboo', stage: 5, look: { keepsakes: [k.id] } });
      const g = (function find(n: PNode): GNode | null {
        if (n.t !== 'g') return null;
        if (n.id === `keepsake-${k.id}`) return n;
        for (const c of n.children) {
          const f = find(c);
          if (f) return f;
        }
        return null;
      })(b.root);
      expect(g!.children.length).toBeGreaterThan(1);
    }
  });

  it('moods are on the face only: no posture and no marks (resting keeps its calm moon)', () => {
    for (const mood of ['happy', 'curious', 'proud'] as const) {
      const b = buildPlant({ species: 'oak', stage: 5, mood });
      const names = groupNames(b.root);
      expect(names).not.toContain('fx');
      expect(names).not.toContain('fx-back');
      const body = (b.root.children.find((c) => c.t === 'g' && c.id === 'tree') as GNode).children.find((c) => c.t === 'g' && c.id === 'body')!;
      expect(body.transform).toBeUndefined();
      // The face differs from idle.
      expect(JSON.stringify(b.root)).not.toBe(JSON.stringify(buildPlant({ species: 'oak', stage: 5 }).root));
    }
    expect(groupNames(buildPlant({ species: 'oak', stage: 5, resting: true }).root)).toContain('fx');
    // Quiet look: no face, so every mood draws the same plant.
    expect(JSON.stringify(buildPlant({ species: 'oak', stage: 5, mood: 'happy', quietLook: true }).root)).toBe(JSON.stringify(buildPlant({ species: 'oak', stage: 5, quietLook: true }).root));
  });
});

describe('24pt chips', () => {
  const shape = (species: (typeof PLANT_SPECIES)[number], stage: GrowthLevel) => JSON.stringify((buildPlant({ species, stage, lod: 'icon' }).root.children.find((c) => c.t === 'g' && c.id === 'tree') as GNode).children);
  it('the round-crown trees differ by shape, not only colour (same palette, different silhouettes)', () => {
    for (const stage of [3, 4, 5, 6] as GrowthLevel[]) {
      const crowns = ['oak', 'maple', 'narra', 'cherry-blossom', 'mango'].map((sp) => {
        const b = buildPlant({ species: sp as 'oak', stage, lod: 'icon', look: { palette: 'grove' } });
        const canopy = JSON.stringify(b.root).match(/"id":"canopy".*?"id":/)?.[0] ?? '';
        return canopy.replace(/#[0-9A-F]{6}/gi, '#');
      });
      expect(new Set(crowns).size).toBe(5);
    }
  });
  it('lotus and sampaguita draw a simplified silhouette at 24pt (a bold bloom; big stars on a mound)', () => {
    for (const stage of [4, 5, 6] as GrowthLevel[]) {
      expect(shape('lotus', stage)).not.toContain('domain-');
      expect(shape('sampaguita', stage)).not.toContain('domain-');
      expect(shape('lotus', stage)).not.toBe(JSON.stringify((buildPlant({ species: 'lotus', stage, lod: 'small' }).root.children.find((c) => c.t === 'g' && c.id === 'tree') as GNode).children));
    }
  });
});

describe('motion layers and caches', () => {
  it('splits a plant into back · plant · front, in paint order, the plant layer holding only the tree', () => {
    const b = buildPlant({ species: 'cactus', stage: 5, look: { keepsakes: ['fox', 'jay', 'cairn'] } });
    const L = plantLayers(b.root);
    expect(L.plant.children).toHaveLength(1);
    expect((L.plant.children[0] as GNode).id).toBe('tree');
    expect(groupNames(L.back)).toContain('ground');
    expect(groupNames(L.front)).toContain('ground-front');
    expect(groupNames(L.front)).toContain('keepsakes');
    // Cached: the same split each time (never rebuilt per frame).
    expect(plantLayers(b.root)).toBe(L);
  });

  it('lifts the first sprout onto its own layer, in the same place', () => {
    const b = buildPlant({ species: 'oak', stage: 1 });
    const lifted = liftGroup(plantLayers(b.root).plant, 'sprout')!;
    expect(groupNames(lifted.rest)).not.toContain('sprout');
    expect(groupNames(lifted.part)).toContain('sprout');
    expect(liftGroup(plantLayers(buildPlant({ species: 'oak', stage: 5 }).root).plant, 'sprout')).toBeNull();
  });

  it('the build cache is shared and bounded (species, growth, look and theme)', () => {
    const a = buildPlant({ species: 'pine', stage: 4, look: { palette: 'silver', keepsakes: ['fox'] } });
    expect(buildPlant({ species: 'pine', stage: 4, look: { palette: 'silver', keepsakes: ['fox'] } })).toBe(a);
    for (let i = 0; i < 300; i++) buildPlant({ species: PLANT_SPECIES[i % 13], stage: 1 + (i % 6), theme: i % 2 ? 'dark' : 'light', look: { keepsakes: [KEEPSAKE_ITEMS[i % 22].id] } });
    expect(builtCacheSize()).toBeLessThanOrEqual(96);
  });

  it('growthBefore: the growth a grow-up started from (skipped growths share a time)', () => {
    const r = Object.fromEntries(GROWTH_IDS.slice(1).map((g, i) => [g, 1000 + i]));
    expect(growthBefore({ reached: r }, 5)).toBe(4);
    expect(growthBefore({ reached: { sprout: 1, shoot: 9, bough: 9 } }, 4)).toBe(2);
    expect(growthBefore({}, 2)).toBe(1);
  });
});

describe('<LivePlant>', () => {
  let r: ReactTestRenderer | undefined;
  const mount = (el: React.ReactElement) => {
    act(() => {
      r = create(el);
    });
  };
  beforeEach(() => {
    setMockReducedMotion(true);
    setSystemReducedMotionForTest(null);
    resetCelebrationsForTest();
    resetPlantReactionsForTest();
  });
  afterEach(() => {
    act(() => r?.unmount());
    r = undefined;
  });
  const host = () => r!.root.findAll((n) => n.props.testID === 'live' && typeof n.type === 'string')[0];
  const full: Celebration = { mode: 'full', first: true, settled: false, run: 1, skip: () => {} };

  it('is one image with the spoken label from its first frame, whatever moves', () => {
    setMockReducedMotion(false);
    setSystemReducedMotionForTest(false);
    mount(<LivePlant testID="live" species="oak" stage={5} size={200} theme="light" accessibilityLabel="Kai, your oak." breathe reaction={{ id: 'x', mood: 'happy' }} growth={{ from: 4, celebration: full }} />);
    expect(host().props.accessibilityRole).toBe('image');
    expect(host().props.accessibilityLabel).toBe('Kai, your oak.');
  });

  it('Reduce Motion: the end state only (no old growth drawn, nothing transformed)', () => {
    mount(<LivePlant testID="live" species="oak" stage={5} size={200} theme="light" breathe reaction={{ id: 'y', mood: 'proud' }} growth={{ from: 4, celebration: { ...full, mode: 'static', settled: true } }} />);
    // back, plant, front: one moving layer (the plant), no old growth.
    const animated = r!.root.findAll((n) => typeof n.type === 'string' && Array.isArray(n.props.style) && JSON.stringify(n.props.style).includes('transformOrigin'));
    expect(animated).toHaveLength(1);
    const st = JSON.stringify(animated[0].props.style);
    expect(st).toContain('"opacity":1');
    expect(st).toContain('"rotate":"0deg"');
  });

  it('the growth sequence draws the old growth only in its full form', () => {
    setMockReducedMotion(false);
    setSystemReducedMotionForTest(false);
    mount(<LivePlant testID="live" species="oak" stage={5} size={104} theme="light" growth={{ from: 4, celebration: full }} />);
    expect(r!.root.findAll((n) => typeof n.type === 'string' && JSON.stringify(n.props.style ?? '').includes('transformOrigin'))).toHaveLength(2);
    act(() => r!.update(<LivePlant testID="live" species="oak" stage={5} size={104} theme="light" growth={{ from: 4, celebration: { ...full, mode: 'short', settled: true } }} />));
    expect(r!.root.findAll((n) => typeof n.type === 'string' && JSON.stringify(n.props.style ?? '').includes('transformOrigin'))).toHaveLength(1);
  });

  it('a reaction plays once per occasion per app session, within the budget', () => {
    expect(claimReaction('cisa:happy:2026-10-11')).toBe(true);
    expect(claimReaction('cisa:happy:2026-10-11')).toBe(false);
    expect(claimReaction('cisa:proud:2026-10-11')).toBe(true);
    resetPlantReactionsForTest();
    expect(claimReaction('cisa:happy:2026-10-11')).toBe(true);
  });

  it('onboarding’s planting: the sprout on its own layer; under Reduce Motion it is simply there', () => {
    mount(<LivePlant testID="live" species="oak" stage={1} size={168} theme="light" fit plantIn />);
    const layers = r!.root.findAll((n) => typeof n.type === 'string' && JSON.stringify(n.props.style ?? '').includes('transformOrigin'));
    expect(layers).toHaveLength(2);
    for (const l of layers) expect(JSON.stringify(l.props.style)).toContain('"opacity":1');
  });
});
