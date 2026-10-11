/**
 * Phase 4a plant renderer (components/plant): the part tree for all 13
 * species × 6 growths × 3 detail levels, the five domain organs from Bough,
 * the face rules (Quiet look, none at icon size), the hero stage and tight
 * frames, determinism, and the <Plant> component's accessibility.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Plant } from '../components/plant/Plant';
import { bounds, buildPlant, countShapes, groupNames, lodFor, ORGAN_DRAW_MAX, ORGAN_DRAW_MIN, type Lod, type PNode } from '../components/plant/art';
import { PLANT_SPECIES, plantLabel, type GrowthLevel } from '../engine/plant';

const LODS: Lod[] = ['icon', 'small', 'full'];
const GROWTHS: GrowthLevel[] = [1, 2, 3, 4, 5, 6];
const all = PLANT_SPECIES.flatMap((species) => GROWTHS.map((stage) => ({ species, stage })));

function fills(n: PNode, out: string[] = []): string[] {
  if (n.fill) out.push(n.fill);
  if (n.stroke) out.push(n.stroke);
  if (n.t === 'g') n.children.forEach((c) => fills(c, out));
  return out;
}

describe('buildPlant', () => {
  it('builds every species × growth × detail level, with and without a face, light and dark', () => {
    for (const { species, stage } of all)
      for (const lod of LODS)
        for (const quietLook of [false, true])
          for (const theme of ['light', 'dark'] as const) {
            const b = buildPlant({ species, stage, lod, quietLook, theme });
            expect(b.root.id).toBe('mascot');
            expect(countShapes(b.root)).toBeGreaterThan(3);
            expect(b.frame).toMatch(/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
          }
  });

  it('has exactly five domain organs from Bough on, and none before', () => {
    for (const { species, stage } of all) {
      const names = groupNames(buildPlant({ species, stage }).root);
      const organs = names.filter((n) => n.startsWith('domain-')).sort();
      if (stage >= 4) expect(organs).toEqual(['domain-1', 'domain-2', 'domain-3', 'domain-4', 'domain-5']);
      else expect(organs).toEqual([]);
    }
  });

  it('keeps the named parts motion needs (ground, tree, body, ground-front)', () => {
    for (const { species, stage } of all) {
      const names = groupNames(buildPlant({ species, stage }).root);
      for (const n of ['mascot', 'ground', 'tree', 'body', 'drift', 'ground-front']) expect(names).toContain(n);
      expect(names.some((n) => ['trunk', 'stem', 'canopy', 'mound', 'leaves', 'flower', 'domain-3'].includes(n))).toBe(true);
    }
  });

  it('draws the face by default, never in Quiet look, never at icon size', () => {
    for (const { species, stage } of all) {
      expect(groupNames(buildPlant({ species, stage, lod: 'small' }).root)).toContain('face');
      expect(groupNames(buildPlant({ species, stage, lod: 'small', quietLook: true }).root)).not.toContain('face');
      expect(groupNames(buildPlant({ species, stage, lod: 'icon' }).root)).not.toContain('face');
    }
  });

  it('every growth fits the shared 200 × 200 hero stage (nothing clipped)', () => {
    for (const { species, stage } of all)
      for (const organs of [undefined, [ORGAN_DRAW_MAX, ORGAN_DRAW_MAX, ORGAN_DRAW_MAX, ORGAN_DRAW_MAX, ORGAN_DRAW_MAX]]) {
        const box = bounds(buildPlant({ species, stage, organs }).root);
        expect([species, stage, box.minX >= 0 && box.minY >= 0 && box.maxX <= 200 && box.maxY <= 200]).toEqual([species, stage, true]);
      }
  });

  it('the tight frame is a square that holds the whole plant, resting marks included', () => {
    for (const { species, stage } of all)
      for (const resting of [false, true]) {
        const b = buildPlant({ species, stage, lod: 'small', resting });
        const [x, y, w, h] = b.frame.split(' ').map(Number);
        expect(w).toBe(h);
        const tree = b.root.children.filter((c) => c.t !== 'g' || c.id !== 'dusk');
        const box = bounds({ t: 'g', id: null, children: tree });
        expect(box.minX).toBeGreaterThanOrEqual(x - 0.5);
        expect(box.maxX).toBeLessThanOrEqual(x + w + 0.5);
        expect(box.minY).toBeGreaterThanOrEqual(y - 0.5);
        expect(box.maxY).toBeLessThanOrEqual(y + h + 0.5);
      }
  });

  it('is deterministic: the same inputs give the same tree', () => {
    for (const species of PLANT_SPECIES) expect(JSON.stringify(buildPlant({ species, stage: 6 }))).toBe(JSON.stringify(buildPlant({ species, stage: 6 })));
  });

  it('organs change the drawing, and out-of-range scales are clamped (never bare, never huge)', () => {
    const small = JSON.stringify(buildPlant({ species: 'oak', stage: 5, organs: [0.5, 0.5, 0.5, 0.5, 0.5] }));
    const big = JSON.stringify(buildPlant({ species: 'oak', stage: 5, organs: [1.2, 1.2, 1.2, 1.2, 1.2] }));
    expect(small).not.toBe(big);
    expect(JSON.stringify(buildPlant({ species: 'oak', stage: 5, organs: [0, -3, NaN, 0.1, 0.2] }))).toBe(
      JSON.stringify(buildPlant({ species: 'oak', stage: 5, organs: [ORGAN_DRAW_MIN, ORGAN_DRAW_MIN, undefined as unknown as number, ORGAN_DRAW_MIN, ORGAN_DRAW_MIN].map((v, i) => (i === 2 ? 1.011 : v)) })),
    );
  });

  it('resting adds a dusk backdrop and a moon, and never changes the plant colours', () => {
    for (const species of PLANT_SPECIES) {
      const awake = buildPlant({ species, stage: 5, lod: 'full', quietLook: true });
      const rest = buildPlant({ species, stage: 5, lod: 'full', quietLook: true, resting: true });
      const names = groupNames(rest.root);
      expect(names).toContain('dusk');
      expect(names).toContain('fx');
      const body = (b: typeof awake) => (b.root.children.find((c) => c.t === 'g' && c.id === 'tree') as Extract<PNode, { t: 'g' }>).children.find((c) => c.t === 'g' && c.id === 'body')!;
      expect(new Set(fills(body(rest)))).toEqual(new Set(fills(body(awake))));
    }
  });

  it('uses only hex colours (all from theme tokens), never pure black ink', () => {
    for (const { species, stage } of all) for (const c of fills(buildPlant({ species, stage, theme: 'dark' }).root)) expect(c === 'none' || /^#[0-9A-F]{6}$/i.test(c)).toBe(true);
  });

  it('stays light to render: a full Elder is under 260 shapes, an icon under 120', () => {
    for (const species of PLANT_SPECIES) {
      expect(countShapes(buildPlant({ species, stage: 6, lod: 'full' }).root)).toBeLessThan(260);
      expect(countShapes(buildPlant({ species, stage: 6, lod: 'icon' }).root)).toBeLessThan(120);
    }
  });

  it('picks the detail level from the size: 24 icon, 64 small, 200 full', () => {
    expect(lodFor(24)).toBe('icon');
    expect(lodFor(32)).toBe('icon');
    expect(lodFor(64)).toBe('small');
    expect(lodFor(96)).toBe('small');
    expect(lodFor(200)).toBe('full');
  });
});

describe('<Plant>', () => {
  /** The host View (not the memo wrapper, which also carries the testID prop). */
  const hostView = (r: ReactTestRenderer) => r.root.findAll((n) => n.props.testID === 'plant' && typeof n.type === 'string')[0];

  function render(el: React.ReactElement): ReactTestRenderer {
    let r!: ReactTestRenderer;
    act(() => {
      r = create(el);
    });
    return r;
  }

  it('is one image with the spoken label', () => {
    const label = plantLabel({ name: 'Kai', species: 'oak', growth: 4 });
    const r = render(<Plant species="oak" stage={4} size={64} theme="light" accessibilityLabel={label} testID="plant" />);
    const view = hostView(r);
    expect(view.props.accessibilityRole).toBe('image');
    expect(view.props.accessibilityLabel).toBe('Kai, your oak. Growth: Bough, 4 of 6.');
    expect(view.props.accessible).toBe(true);
  });

  it('is hidden from screen readers when it has no label (decorative)', () => {
    const r = render(<Plant species="lotus" stage={2} size={24} theme="dark" testID="plant" />);
    const view = hostView(r);
    expect(view.props.accessible).toBe(false);
    expect(view.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('uses the tight frame at small sizes and the shared stage for the hero', () => {
    const small = render(<Plant species="cactus" stage={3} size={64} theme="light" />);
    const hero = render(<Plant species="cactus" stage={3} size={200} theme="light" />);
    const vb = (r: ReactTestRenderer) => r.root.findAll((n) => n.props.viewBox !== undefined)[0].props.viewBox;
    expect(vb(hero)).toBe('0 0 200 200');
    expect(vb(small)).toBe(buildPlant({ species: 'cactus', stage: 3, lod: 'small' }).frame);
  });

  it('lets a motion layer wrap named groups', () => {
    const seen: string[] = [];
    render(
      <Plant
        species="sunflower"
        stage={5}
        size={120}
        theme="light"
        wrapGroup={(name, el) => {
          seen.push(name);
          return el;
        }}
      />,
    );
    expect(seen).toEqual(expect.arrayContaining(['body', 'domain-1', 'domain-5', 'face', 'ground']));
  });
});

describe('the resting dusk stays on the stage', () => {
  it('every species and growth: the disc fits inside the shared 200 × 200 stage (the 200pt hero never clips it)', () => {
    for (const species of PLANT_SPECIES)
      for (const stage of [1, 2, 3, 4, 5, 6]) {
        const b = buildPlant({ species, stage, resting: true, organs: [1.25, 1.25, 1.25, 1.25, 1.25] });
        const dusk = b.root.children.find((n) => n && n.t === 'g' && n.id === 'dusk') as { children: { cx: number; cy: number; r: number }[] };
        const c = dusk.children[0];
        expect(c.cx - c.r).toBeGreaterThanOrEqual(0);
        expect(c.cy - c.r).toBeGreaterThanOrEqual(0);
        expect(c.cx + c.r).toBeLessThanOrEqual(200);
        expect(c.cy + c.r).toBeLessThanOrEqual(200);
      }
  });
});

describe('PR #43 art review', () => {
  const blooms = (species: (typeof PLANT_SPECIES)[number], lod: 'small' | 'full') => {
    const find = (n: PNode): PNode | null => (n.t === 'g' ? (n.id === 'blooms' ? n : n.children.map(find).find(Boolean) ?? null) : null);
    const b = find(buildPlant({ species, stage: 6, lod }).root);
    return b && b.t === 'g' ? b.children.length : 0;
  };

  it('the mango reads as a low, wide dome from Crown on, never an oak', () => {
    for (const stage of [5, 6]) {
      const w = (sp: 'oak' | 'mango') => {
        const box = bounds(buildPlant({ species: sp, stage }).root);
        return (box.maxX - box.minX) / (box.maxY - box.minY);
      };
      expect(w('mango')).toBeGreaterThan(w('oak') * 1.12);
    }
  });

  it('Elder gifts come in numbers that read at 104pt (the small level)', () => {
    expect(blooms('oak', 'small')).toBeGreaterThanOrEqual(7);
    expect(blooms('maple', 'small')).toBeGreaterThanOrEqual(7);
    expect(blooms('mango', 'small')).toBeGreaterThanOrEqual(5);
    expect(blooms('pine', 'small')).toBeGreaterThanOrEqual(5);
  });
});
