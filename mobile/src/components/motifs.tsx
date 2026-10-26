/**
 * The tab seals (mobile 1.43, tab header option C "Forest seal", the owner's choice):
 * three botanical motifs in the frond's hand (one 1.5pt stroke, round caps and joins,
 * lens leaves with a midrib, no fills), one per tab, so Learn, Practice and Play no
 * longer repeat Today's forest panel:
 * - seedhead: a seed clock (Learn: ideas that spread),
 * - leafvein: one big leaf with its veins (Practice: the detail of each answer),
 * - sprig: a short sprig hanging from above (Play).
 * Each is shown as a crop in a small forest square (the seal) on the tab's white card.
 * Fixed maths, built once. Decorative: hidden from screen readers by the parent.
 */
import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { leafveinPath, seedheadPath, sprigPath } from './motifPaths';

export type MotifKind = 'seedhead' | 'leafvein' | 'sprig';

/** The square of each drawing its seal shows ([x, y, side] in the drawing's units). */
const SEAL_FOCUS: Record<MotifKind, [number, number, number]> = {
  seedhead: [28, 20, 150],
  leafvein: [56, 40, 180],
  sprig: [10, 16, 160], // 20 lower than 1.43's first cut: the end leaf's tip (40, 162) clears the seal's rounded corner (UX O6)
};

/** The motif cropped into a `size` square; the stroke stays 1.5pt at that size. */
export function Motif({ kind, color, size }: { kind: MotifKind; color: string; size: number }) {
  const d = useMemo(() => (kind === 'seedhead' ? seedheadPath() : kind === 'leafvein' ? leafveinPath() : sprigPath()), [kind]);
  const [x, y, side] = SEAL_FOCUS[kind];
  return (
    <Svg width={size} height={size} viewBox={`${x} ${y} ${side} ${side}`} fill="none" stroke={color} strokeWidth={(1.5 * side) / size} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}
