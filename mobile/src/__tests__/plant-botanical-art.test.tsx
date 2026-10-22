/**
 * Mobile 1.40: the botanical plant (components/plant/botanical.ts), the
 * faceless default. The same part-tree contract as the storybook art
 * (plant-art.test.tsx): named groups, the five domain organs from Bough, the
 * motion layers, the onboarding sprout, determinism and the shared 200 × 200
 * stage. Plus what is new: a true line weight at every size, colours only
 * from tokens, props drawn in line, and the build-time budget.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Plant } from '../components/plant/Plant';
import { bounds, buildPlant, countShapes, groupNames, liftGroup, lodFor, mix, pathTokens, planterIcon, plantLayers, type GNode, type Lod, type PNode } from '../components/plant/art';
import { ink } from '../components/plant/botanical';
import { PLANT_SPECIES, type GrowthLevel, type PlantSpecies } from '../engine/plant';
import { plantArt, plantLeaf, plantLine } from '../theme/tokens';

const LODS: Lod[] = ['icon', 'small', 'full'];
const GROWTHS: GrowthLevel[] = [1, 2, 3, 4, 5, 6];
const THEMES = ['light', 'dark'] as const;
const all = PLANT_SPECIES.flatMap((species) => GROWTHS.map((stage) => ({ species, stage })));
const bot = (species: PlantSpecies, stage: number, extra: Parameters<typeof buildPlant>[0] extends infer O ? Partial<O> : never = {}) => buildPlant({ species, stage, style: 'botanical', ...extra });

const find = (n: PNode, id: string): GNode | null => (n.t === 'g' ? (n.id === id ? n : (n.children.map((c) => find(c, id)).find(Boolean) ?? null)) : null);
/** Every stroked node, with the scale its groups apply. */
function strokes(n: PNode, k = 1, out: { sw: number; stroke: string; k: number }[] = []) {
  const kk = n.transform ? k * [...n.transform.matchAll(/scale\(([-\d.e]+)/g)].reduce((a, m) => a * Math.abs(Number(m[1])), 1) : k;
  if (n.t === 'g') n.children.forEach((c) => strokes(c, kk, out));
  else if (n.stroke) out.push({ sw: n.sw ?? 1, stroke: n.stroke, k: kk });
  return out;
}

describe('the botanical part tree (same contract as the storybook art)', () => {
  it('every species × growth × detail × theme: the motion groups, and never a face', () => {
    for (const { species, stage } of all)
      for (const lod of LODS)
        for (const theme of THEMES) {
          const names = groupNames(bot(species, stage, { lod, theme }).root);
          for (const n of ['mascot', 'ground', 'tree', 'body', 'ground-front', 'keepsakes', 'keepsakes-back']) expect([species, stage, lod, names.includes(n)]).toEqual([species, stage, lod, true]);
          expect(names).not.toContain('face');
          expect(names.some((n) => ['trunk', 'stem', 'canopy', 'leaves', 'flower', 'sprout'].includes(n))).toBe(true);
        }
  });

  it('exactly five domain organs from Bough on, and none before', () => {
    for (const { species, stage } of all)
      for (const lod of LODS) {
        const organs = groupNames(bot(species, stage, { lod }).root)
          .filter((n) => n.startsWith('domain-'))
          .sort();
        expect([species, stage, organs]).toEqual([species, stage, stage >= 4 ? ['domain-1', 'domain-2', 'domain-3', 'domain-4', 'domain-5'] : []]);
      }
  });

  it('splits into the three motion layers, and onboarding can lift the Seed’s sprout', () => {
    for (const species of PLANT_SPECIES) {
      const b = bot(species, 1);
      const layers = plantLayers(b.root);
      expect(groupNames(layers.plant)).toContain('tree');
      expect(groupNames(layers.back)).toContain('ground');
      expect(groupNames(layers.front)).toContain('ground-front');
      const lifted = liftGroup(layers.plant, 'sprout');
      expect([species, !!lifted]).toEqual([species, true]);
      expect(groupNames(lifted!.rest)).not.toContain('sprout');
    }
  });

  it('is deterministic: the same options give the same tree', () => {
    for (const species of PLANT_SPECIES)
      for (const stage of [2, 4, 6]) {
        const o = { species, stage, lod: 'full' as const, organs: [0.7, 1.1, 0.9, 1.2, 0.6], look: { keepsakes: ['lantern'], visitor: 'robin' }, px: 140, fit: true };
        expect(JSON.stringify(buildPlant({ ...o, style: 'botanical', drift: false }))).toBe(JSON.stringify(buildPlant({ ...o, style: 'botanical', drift: false, theme: 'light' })));
      }
  });

  it('stays on the shared 200 × 200 stage, even with full organs, keepsakes and a visitor', () => {
    for (const { species, stage } of all) {
      const b = bot(species, stage, { organs: [1.25, 1.25, 1.25, 1.25, 1.25], look: { keepsakes: ['lantern', 'still-pond', 'fox'], visitor: 'wren' }, resting: true });
      const box = bounds(b.root);
      expect([species, stage, box.minX >= -0.5, box.minY >= -0.5, box.maxX <= 200.5, box.maxY <= 200.5]).toEqual([species, stage, true, true, true, true]);
    }
  });

  it('organs: a domain’s part grows with its organ scale (a weak domain is young, never bare)', () => {
    for (const species of PLANT_SPECIES) {
      const area = (k: number) => {
        const g = find(bot(species, 5, { organs: [k, k, k, k, k] }).root, 'domain-1')!;
        const b = bounds(g);
        return (b.maxX - b.minX) * (b.maxY - b.minY);
      };
      expect([species, area(1.08) > area(0.62)]).toEqual([species, true]);
    }
  });

  it('the Look screen’s style cards: <Plant> draws it, with the look’s style', () => {
    let r: ReactTestRenderer;
    act(() => {
      r = create(<Plant species="oak" stage={4} size={56} theme="light" look={{ style: 'botanical' }} quietLook accessibilityLabel="Botanical" />);
    });
    expect(r!.root.findAll((n) => (n.type as unknown) === 'Path' || (n.props.d !== undefined && typeof n.type !== 'string')).length).toBeGreaterThan(5);
  });
});

describe('the line', () => {
  /** How the app renders each size: tight frame at 96pt and below, the whole stage for the 200pt hero; the Look preview is tight. */
  const SIZES: [number, boolean][] = [
    [24, true],
    [56, true],
    [64, true],
    [72, true],
    [88, true],
    [104, true],
    [140, true],
    [200, false],
  ];
  it('every stroke is a true 0.6–1.6pt line at every size the app draws', () => {
    for (const species of PLANT_SPECIES)
      for (const stage of [1, 3, 6])
        for (const [px, fit] of SIZES) {
          const b = bot(species, stage, { px, fit, lod: lodFor(px), look: { keepsakes: ['lantern'], visitor: 'robin', planter: 'celadon' } });
          const side = fit ? Number(b.frame.split(' ')[2]) : 200;
          for (const s of strokes(b.root)) {
            const pt = (s.sw * s.k * px) / side;
            expect([species, stage, px, pt >= 0.59 && pt <= 1.61]).toEqual([species, stage, px, true]);
          }
        }
  });

  it('the main line is 1.5pt on the 200pt Your plant screen', () => {
    const b = bot('oak', 5, { px: 200, fit: false, lod: 'full' });
    const trunk = find(b.root, 'trunk')!;
    const line = trunk.children.find((c) => c.stroke)!;
    expect(line.sw).toBeCloseTo(1.5, 2);
  });

  it('no absolute black or white line; the ink follows the theme', () => {
    for (const { species, stage } of all)
      for (const theme of THEMES)
        for (const s of strokes(bot(species, stage, { theme, look: { visitor: 'wren', keepsakes: ['jay', 'cairn'] } }).root)) {
          expect(['#000000', '#FFFFFF']).not.toContain(s.stroke.toUpperCase());
        }
  });

  it('every colour in botanical.ts comes from theme/tokens.ts (no hex in the source)', () => {
    const src = readFileSync(join(__dirname, '..', 'components', 'plant', 'botanical.ts'), 'utf8');
    expect(src.match(/#[0-9A-Fa-f]{6}\b/g)).toBeNull();
  });

  it('plantLine: both themes define the same fields; soil lines use `control`; the leaf line is a palette tone', () => {
    expect(Object.keys(plantLine.dark).sort()).toEqual(Object.keys(plantLine.light).sort());
    expect(plantLine.light.soil).toBe('#7D897F');
    expect(plantLine.dark.soil).toBe('#66736A');
    for (const t of [plantLine.light, plantLine.dark]) {
      for (const k of [t.leaf, t.washLeaf, t.washMass]) expect(Object.keys(plantLeaf.grove)).toContain(k);
      for (const op of [t.washLeafOp, t.washMassOp, t.washWoodOp, t.propWashOp, t.moonWashOp]) expect(op > 0 && op < 1).toBe(true);
    }
  });
});

describe('props on a botanical plant (opt-in, drawn in line)', () => {
  it('nothing extra by default: no visitor, no keepsakes', () => {
    const b = bot('oak', 5);
    expect(find(b.root, 'visitor')).toBeNull();
    expect(find(b.root, 'keepsakes')!.children).toHaveLength(0);
    expect(find(b.root, 'keepsakes-back')!.children).toHaveLength(0);
  });

  it('a picked visitor and keepsakes are drawn, inked: a wash under a theme line, no shadows', () => {
    const b = bot('oak', 5, { look: { visitor: 'robin', keepsakes: ['lantern', 'fox'] } });
    const v = find(b.root, 'visitor')!;
    expect(v).not.toBeNull();
    expect(strokes(v).length).toBeGreaterThan(3);
    const k = find(b.root, 'keepsakes')!;
    expect(k.children.length).toBe(2);
    const fillsOf = (n: PNode, out: PNode[] = []): PNode[] => (n.t === 'g' ? (n.children.forEach((c) => fillsOf(c, out)), out) : (out.push(n), out));
    for (const leaf of fillsOf(k)) {
      expect(leaf.fill).not.toBe(plantArt.black);
      if (leaf.fill && leaf.fill !== 'none') expect(leaf.opacity).toBe(plantLine.light.propWashOp);
    }
  });

  it('ink(): drops shadows and highlights, turns a solid shape into a wash and a line', () => {
    const shadow: PNode = { t: 'ellipse', cx: 0, cy: 0, rx: 4, ry: 1, fill: plantArt.black, opacity: 0.12 };
    const lit: PNode = { t: 'ellipse', cx: 0, cy: 0, rx: 2, ry: 1, fill: plantArt.white, opacity: 0.55 };
    const body: PNode = { t: 'path', d: 'M0 0L4 0L4 4Z', fill: plantArt.keepsake.clay };
    const out = ink({ t: 'g', id: 'x', children: [shadow, lit, body] }, 'dark', 1.4, mix);
    expect(out.children).toHaveLength(2);
    expect(out.children[0]).toMatchObject({ fill: plantArt.keepsake.clay, opacity: plantLine.dark.propWashOp });
    expect(out.children[1]).toMatchObject({ fill: 'none', sw: 1.4 });
    expect(out.children[1].stroke).toBe(mix(plantArt.keepsake.clay, plantLine.dark.propInk, plantLine.dark.propMix));
  });

  it('pots and planters are inked; the meadow becomes soil lines (with a chosen stone ring kept)', () => {
    const meadow = find(bot('oak', 5).root, 'ground')!;
    expect(meadow.children.every((c) => c.fill === 'none' && c.stroke === plantLine.light.soil)).toBe(true);
    const ring = find(bot('oak', 5, { look: { ground: 'stone-ring' } }).root, 'stone-ring');
    expect(ring).not.toBeNull();
    const pot = find(bot('cactus', 4).root, 'ground')!;
    expect(strokes(pot).length).toBeGreaterThan(2);
    expect(groupNames(planterIcon('celadon', 'oak', 'light', 'botanical').root)).not.toContain('face');
  });

  it('resting: a dusk disc and a line moon; a small settle, never a droop', () => {
    const b = bot('maple', 5, { resting: true });
    expect(find(b.root, 'dusk')).not.toBeNull();
    expect(find(b.root, 'fx')).not.toBeNull();
    expect(find(b.root, 'body')!.transform).toMatch(/^rotate\(1\.5 /);
  });
});

describe('performance', () => {
  it('fewer shapes than the storybook plant at every species and growth', () => {
    for (const { species, stage } of all) {
      const b = countShapes(bot(species, stage).root);
      const s = countShapes(buildPlant({ species, stage }).root);
      expect([species, stage, b <= s]).toEqual([species, stage, true]);
    }
  });

  /**
   * The build-time budget. Plain Node (the app's engine without Babel) builds a
   * botanical Elder oak in about 2.5 ms (scripts in the 1.40 PR; the storybook
   * one about 3 ms). Under Jest everything runs ~3x slower (Babel-transformed
   * code), so an absolute "< 5 ms" would fail even for the storybook art.
   * The budget is therefore pinned against the storybook build, timed in the
   * same run, interleaved: the botanical plant may be at most 1.5x its cost.
   * The prototype (a regex per leaf) was about 5x, so a regression like it fails.
   * PERF_REPORT=1 prints both medians.
   */
  it('an Elder oak at full detail builds within 1.5x the storybook build (about 2.5 ms in Node)', () => {
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    // process.hrtime: the React Native preset's performance.now is coarse in Jest.
    const time = (f: () => void) => {
      const t = process.hrtime.bigint();
      f();
      return Number(process.hrtime.bigint() - t) / 1e6;
    };
    const organs = (i: number) => [1, 1, 1, 1, 1 + i / 10000]; // a fresh build each time (no cache hit)
    // Warm up both (the JIT, and the leaf shapes parsed once).
    for (let i = 0; i < 30; i++) {
      bot('oak', 6, { lod: 'full', px: 200, organs: organs(5000 + i) });
      buildPlant({ species: 'oak', stage: 6, lod: 'full', organs: organs(5000 + i) });
    }
    const b: number[] = [];
    const s: number[] = [];
    for (let i = 0; i < 41; i++) {
      b.push(time(() => bot('oak', 6, { lod: 'full', px: 200, organs: organs(i) })));
      s.push(time(() => buildPlant({ species: 'oak', stage: 6, lod: 'full', organs: organs(i) })));
    }
    if (process.env.PERF_REPORT === '1') console.log(`Elder oak, full detail: botanical ${median(b).toFixed(2)} ms, storybook ${median(s).toFixed(2)} ms (medians of 41, Jest)`);
    expect(median(b)).toBeLessThan(median(s) * 1.5);
  });

  it('the hand-written path reader gives exactly the regex’s tokens (bounds() uses it for every build)', () => {
    const re = /[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g;
    const ref = (d: string) => (d.match(re) ?? []).map((t) => (/^[a-zA-Z]$/.test(t) ? t : Number(t)));
    const samples = ['M0 0L-1.5 2.25Q.5 -.6 3e-5 1e2Z', 'M1.2.3-4-.5h0.01v-2 1,2 3.', 'm-.6-6.2c4.6-6.4 6.2-1.2 5.2 3', '--5 .-3 1e 2e-x 7'];
    for (const { species, stage } of all.filter((_, i) => i % 5 === 0))
      for (const style of ['botanical', 'storybook'] as const) {
        const walk = (n: PNode) => (n.t === 'g' ? n.children.forEach(walk) : n.t === 'path' && samples.push(n.d));
        walk(buildPlant({ species, stage, style, look: { keepsakes: ['lantern', 'dew-web'] } }).root);
      }
    for (const d of samples) expect(pathTokens(d)).toEqual(ref(d));
  });
});
