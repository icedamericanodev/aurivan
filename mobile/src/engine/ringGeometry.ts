/**
 * Growth-ring geometry: the wobbly "tree cross-section" arcs that draw
 * readiness (spec §10.1). Pure maths, shared by the app's rings
 * (components/glyphs.tsx GrowthRings) and the home-screen readiness widget
 * (widgets/art.ts), so both draw the very same wood.
 */

/** The shared gentle wobble, so every ring reads as wood. */
export const wobble = (rm: number, t: number) => rm * (1 + 0.022 * Math.sin(3 * t + 0.6) + 0.012 * Math.sin(5 * t + 1.9) + 0.008 * Math.sin(8 * t));

/** SVG path for a wobbly ring arc and its length (for the grow animation). */
export function ringArc(c: number, rm: number, a0: number, a1: number): { d: string; length: number } {
  const n = Math.max(12, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 120));
  let d = '';
  let length = 0;
  let prev: [number, number] | null = null;
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n;
    const r = wobble(rm, t);
    const p: [number, number] = [c + r * Math.cos(t), c + r * Math.sin(t)];
    d += `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    if (prev) length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    prev = p;
  }
  return { d, length };
}

/** Each ring's stroke width and mid radius, inner → outer, plus its full track path. */
export function ringGeometry(weights: readonly number[], k: number, r0: number, gap: number, c: number) {
  const out: { w: number; rm: number; track: string }[] = [];
  let r = r0;
  for (const wt of weights) {
    const w = wt * k;
    out.push({ w, rm: r + w / 2, track: ringArc(c, r + w / 2, 0, Math.PI * 2).d });
    r += w + gap;
  }
  return out;
}
