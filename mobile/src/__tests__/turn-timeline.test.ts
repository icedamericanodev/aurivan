/**
 * Mobile 1.50 "The Turning" (DESIGN_SYSTEM §8.10): the pure timeline
 * (engine/turnTimeline.ts) and the static layers it moves
 * (components/plant/turnLayers.ts).
 * - totals by tier, an odd number of half-swaps (it ends on the NEW form);
 * - the flashing limit: every half-swap ≥ 180 ms, ≤ 2.5 flashes a second;
 * - cover then uncover: the light's area never dips mid-swap;
 * - the end state is exact (no NaN), and ≤ 8 motes, none after the bloom;
 * - one success haptic at the bloom, `done` at the end; Reduce Motion is 120 ms;
 * - the layers: Form IV's ring split out for the halo, a one-colour silhouette,
 *   and the element budget.
 */
import { buildPlant, type PNode } from '../components/plant/art';
import { elementCount, lightOf, sameLayer, silhouette, turnLayers } from '../components/plant/turnLayers';
import { moteShape } from '../components/plant/turnSignatures';
import { PLANT_SPECIES } from '../engine/plant';
import { events, frame, frameReduced, maxFlashesPerSecond, newSilOp, oldSilOp, phases, tierOf, type TurnTier } from '../engine/turnTimeline';
import { motion } from '../theme/tokens';

const TIERS: TurnTier[] = ['small', 'medium', 'grand'];

describe('the timeline', () => {
  it('runs 2.4 / 3.0 / 3.6 s by tier, with an odd number of half-swaps so it ends on the new form', () => {
    expect(TIERS.map((t) => phases(t).total)).toEqual([2400, 3000, 3600]);
    for (const tier of TIERS) {
      const P = phases(tier);
      expect(P.swaps.length % 2).toBe(1);
      // Just before the bloom: the new shape's light is up, the old one's gone.
      expect(newSilOp(P.b0 - 1, P)).toBeCloseTo(1, 3);
      expect(oldSilOp(P.b0 - 1, P)).toBeCloseTo(0, 3);
      // The beats in order: gather, the swaps, the bloom, then the name, all inside the total.
      expect(P.g0).toBeLessThan(P.g1);
      expect(P.b0).toBeLessThan(P.nameAt);
      expect(P.nameAt + 80 + motion.dur.enter).toBeLessThanOrEqual(P.total);
    }
  });

  it('the tier follows the NEW form (a plant that skipped a form plays the higher tier once)', () => {
    expect(tierOf(3)).toBe('small');
    expect(tierOf(4)).toBe('medium');
    expect(tierOf(5)).toBe('medium');
    expect(tierOf(6)).toBe('grand');
  });

  it('never flashes more than 2.5 times a second (WCAG 2.3.1 allows 3): every half-swap is ≥ 180 ms', () => {
    for (const tier of TIERS) {
      const P = phases(tier);
      for (const d of P.swaps) expect(d).toBeGreaterThanOrEqual(motion.turn.swapFloor);
      expect(maxFlashesPerSecond(P)).toBeLessThanOrEqual(2.5);
    }
    expect(TIERS.map((t) => maxFlashesPerSecond(phases(t)))).toEqual([2, 2.5, 2.5]);
  });

  it('cover, then uncover: one of the two shapes is always fully lit during the alternation (no dip, no extra flash)', () => {
    for (const tier of TIERS) {
      const P = phases(tier);
      for (let t = P.g1; t < P.b0; t += 5) expect(Math.max(oldSilOp(t, P), newSilOp(t, P))).toBeGreaterThan(0.999);
    }
  });

  it('ends exactly on the new form, with no NaN on any frame', () => {
    for (const tier of TIERS) {
      const P = phases(tier);
      const end = frame(P.total, P);
      expect(end).toMatchObject({ beat: 'rest', done: true, factOp: 1, oldTreeOp: 0, oldSilOp: 0, newTreeOp: 1, propsMix: 1, artGlowOp: 1, haloDraw: 1, glowOp: 0 });
      expect(end.nameOp).toBeCloseTo(1, 3);
      expect(end.lookOp).toBeCloseTo(1, 3);
      expect(end.newSilOp).toBeCloseTo(0, 6);
      expect(end.newScale).toBeCloseTo(1, 2);
      expect(end.motes).toHaveLength(0);
      for (let t = 0; t <= P.total; t += 10) {
        const f = frame(t, P);
        for (const [k, v] of Object.entries(f)) if (typeof v === 'number') expect([k, Number.isFinite(v)]).toEqual([k, true]);
        for (const m of f.motes) for (const v of Object.values(m)) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('the learning fact comes first; the name only at the end', () => {
    const P = phases('medium');
    expect(frame(240, P).factOp).toBeCloseTo(1, 3);
    expect(frame(P.b0, P).nameOp).toBe(0);
  });

  it('at most 8 motes at once (4 / 6 / 8 by tier), all gone 200 ms after the bloom', () => {
    expect(TIERS.map((t) => phases(t).motes)).toEqual([4, 6, 8]);
    for (const tier of TIERS) {
      const P = phases(tier);
      let most = 0;
      for (let t = 0; t <= P.total; t += 10) most = Math.max(most, frame(t, P).motes.length);
      expect(most).toBeLessThanOrEqual(motion.celebrate.leaves);
      expect(most).toBeGreaterThan(0);
      expect(frame(P.b1 + 201, P).motes).toHaveLength(0);
    }
  });

  it('one success haptic at the bloom, then done; the optional ticks are off unless asked (grand only)', () => {
    for (const tier of TIERS) {
      const P = phases(tier);
      expect(events(P)).toEqual([
        { at: P.b0, kind: 'haptic', haptic: 'success' },
        { at: P.total, kind: 'done' },
      ]);
    }
    expect(events(phases('small'), { ticks: true })).toHaveLength(2);
    const grand = events(phases('grand'), { ticks: true });
    expect(grand.filter((e) => e.kind === 'haptic').map((e) => (e.kind === 'haptic' ? e.haptic : ''))).toEqual(['selection', 'selection', 'success']);
  });

  it('Reduce Motion: a 120 ms cross-fade, every word at once, no light and no motes', () => {
    const a = frameReduced(0);
    expect(a).toMatchObject({ factOp: 1, nameOp: 1, lookOp: 1, oldTreeOp: 1, newTreeOp: 0, glowOp: 0, oldSilOp: 0, newSilOp: 0, motes: [] });
    expect(frameReduced(60).newTreeOp).toBeCloseTo(0.5, 5);
    expect(frameReduced(motion.plant.turnReduced)).toMatchObject({ done: true, oldTreeOp: 0, newTreeOp: 1, haloDraw: 1 });
  });
});

describe('the layers', () => {
  const opts = { species: 'oak' as const, quietLook: true, lod: 'full' as const, theme: 'light' as const, look: { style: 'botanical' as const }, px: 200, fit: false };

  it('Form IV: its own glow without the ring, and the ring kept for the halo to draw', () => {
    const L = turnLayers(buildPlant({ ...opts, stage: 6 }).root);
    expect(L.glow).not.toBeNull();
    expect(L.ring).not.toBeNull();
    expect(JSON.stringify(L.glow)).not.toContain('"fill":"none"');
    expect(JSON.stringify(L.back)).not.toContain('"id":"glow"');
    expect(L.tree.id).toBe('tree');
    // Earlier forms have no light of their own.
    const III = turnLayers(buildPlant({ ...opts, stage: 5 }).root);
    expect(III.glow).toBeNull();
    expect(III.ring).toBeNull();
  });

  it('the silhouette is one flat colour with no opacity, and the shared art is never changed', () => {
    const built = buildPlant({ ...opts, stage: 3 });
    const before = JSON.stringify(built.root);
    const sil = silhouette(turnLayers(built.root).tree, '#FFFCF2');
    const colours = new Set<string>();
    const walk = (n: PNode) => {
      expect(n.opacity).toBeUndefined();
      if (n.t === 'g') n.children.forEach(walk);
      else {
        if (n.fill && n.fill !== 'none') colours.add(n.fill);
        if (n.stroke) colours.add(n.stroke);
      }
    };
    walk(sil);
    expect([...colours]).toEqual(['#FFFCF2']);
    expect(JSON.stringify(built.root)).toBe(before);
  });

  it('stays inside the element budget (≤ 90 per tree), and an unchanged ground is drawn once', () => {
    for (const species of PLANT_SPECIES)
      for (const stage of [2, 3, 5, 6] as const) {
        const L = turnLayers(buildPlant({ ...opts, species, stage }).root);
        expect([species, stage, elementCount(L.tree) <= 90]).toEqual([species, stage, true]);
      }
    const a = turnLayers(buildPlant({ ...opts, stage: 5 }).root);
    const b = turnLayers(buildPlant({ ...opts, stage: 6 }).root);
    expect(sameLayer(a.front, a.front)).toBe(true);
    expect(typeof sameLayer(a.back, b.back)).toBe('boolean');
  });

  it('the gathered light covers both forms, centred no lower than y 120, radius ≤ 72', () => {
    const s = lightOf({ minX: 90, minY: 150, maxX: 110, maxY: 172 }, { minX: 80, minY: 120, maxX: 120, maxY: 172 }, 0.72);
    expect(s.cx).toBe(100);
    expect(s.cy).toBeLessThanOrEqual(120);
    expect(s.r).toBeLessThanOrEqual(72);
    expect(lightOf({ minX: 0, minY: 10, maxX: 200, maxY: 172 }, { minX: 0, minY: 10, maxX: 200, maxY: 172 }, 1).r).toBe(72);
  });

  it('every species has its own signature, each mote ≤ 3 SVG elements', () => {
    const seen = new Set<string>();
    for (const species of PLANT_SPECIES) {
      const shapes = Array.from({ length: 8 }, (_, k) => moteShape(species, k, 8));
      for (const s of shapes) expect(s.disc ? 1 : s.parts!.length).toBeLessThanOrEqual(3);
      seen.add(JSON.stringify(shapes));
    }
    expect(seen.size).toBe(PLANT_SPECIES.length);
  });
});
