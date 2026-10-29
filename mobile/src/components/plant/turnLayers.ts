/**
 * The Turning's layers (mobile 1.50, DESIGN_SYSTEM §8.10): one built plant
 * split into the static drawings FormReveal moves. Pure functions on the
 * part tree (components/plant/art.ts), run ONCE per reveal (useMemo): nothing
 * here runs per frame, and the built tree (shared, cached) is never mutated.
 *
 *   back   the ground, the props behind, a keepsake behind (never the glow)
 *   glow   Form IV's own light, without its ring (the ring is drawn by the halo)
 *   ring   that ring's geometry and ink, so the halo can draw it once
 *   tree   the plant itself
 *   front  the props in front, the pot's rim, the grass
 *   sil    the tree as ONE flat colour (the light it becomes while the forms take turns)
 */
import { bounds, plantLayers, type Box, type GNode, type PNode } from './art';

export interface TurnRing {
  cx: number;
  cy: number;
  r: number;
  stroke: string;
  sw: number;
  opacity: number;
}
export interface TurnLayers {
  back: GNode;
  glow: GNode | null;
  ring: TurnRing | null;
  tree: GNode;
  front: GNode;
  /** The tree's drawn bounds (viewBox units). */
  treeBox: Box;
}

const isRing = (n: PNode) => n.t === 'circle' && n.fill === 'none' && !!n.stroke;

/** Splits a built plant's root into the Turning's layers. */
export function turnLayers(root: GNode): TurnLayers {
  const { back, plant, front } = plantLayers(root);
  const glowNode = back.children.find((c) => c.t === 'g' && c.id === 'glow') as GNode | undefined;
  const ringNode = glowNode?.children.find(isRing);
  const tree = plant.children[0] as GNode;
  return {
    back: { ...back, children: back.children.filter((c) => c !== glowNode) },
    glow: glowNode ? { ...glowNode, children: glowNode.children.filter((c) => !isRing(c)) } : null,
    ring:
      ringNode && ringNode.t === 'circle'
        ? { cx: ringNode.cx, cy: ringNode.cy, r: ringNode.r, stroke: ringNode.stroke!, sw: ringNode.sw ?? 0.5, opacity: ringNode.opacity ?? 1 }
        : null,
    tree,
    front,
    treeBox: bounds(tree),
  };
}

/**
 * The tree as one flat colour: every fill and line in `colour`, every
 * opacity dropped (so the shape reads as one even light, the same area
 * whichever form it is). Lines keep their widths, so the silhouette covers
 * the drawing exactly. Transforms are kept.
 */
export function silhouette(n: PNode, colour: string): PNode {
  const paint = (x: PNode) => {
    const { opacity: _o, ...rest } = x;
    const out = { ...rest } as PNode;
    if (x.t !== 'g') {
      if (x.fill === undefined || x.fill !== 'none') out.fill = colour;
      if (x.stroke) out.stroke = colour;
    }
    return out;
  };
  if (n.t === 'g') return { ...(paint(n) as GNode), children: n.children.map((c) => silhouette(c, colour)) };
  return paint(n);
}

/** Two layers draw the same (so one of them can be dropped): compared once, by value. */
export function sameLayer(a: GNode | null, b: GNode | null): boolean {
  if (!a || !b) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Where the gathered light sits: on the union of both forms (a seed and a
 * sapling share one light), its centre no lower than y 120, its radius
 * covering both (capped at 72 units, the grand tier's), in viewBox units.
 */
export function lightOf(oldBox: Box, newBox: Box, glowR: number): { cx: number; cy: number; r: number } {
  const y0 = Math.min(oldBox.minY, newBox.minY);
  const y1 = Math.max(oldBox.maxY, newBox.maxY);
  return { cx: 100, cy: Math.min((y0 + y1) / 2, 120), r: Math.min(72, Math.max(72 * glowR, 0.62 * (y1 - y0))) };
}

/** Counts the drawable elements in a layer (the element budget, §8.6 / §8.10). */
export function elementCount(n: PNode | null): number {
  if (!n) return 0;
  return n.t === 'g' ? n.children.reduce((s, c) => s + elementCount(c), 0) : 1;
}
