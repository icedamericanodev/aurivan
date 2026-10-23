/**
 * One keepsake drawn alone (mobile 1.14): the Look screen's rows and the
 * contact sheet. Its own file with no theme hooks, so the sheet renderer can
 * use it. Decorative: the keepsake's name is always in words beside it.
 */
import { memo, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { PlantSpecies } from '../../engine/plant';
import { keepsakeIcon, planterIcon, type PNode } from './art';

function node(n: PNode, key: string): ReactNode {
  const p: Record<string, unknown> = {};
  if (n.fill !== undefined) p.fill = n.fill;
  if (n.opacity !== undefined) p.opacity = n.opacity;
  if (n.transform) p.transform = n.transform;
  if (n.stroke) Object.assign(p, { stroke: n.stroke, strokeWidth: n.sw, strokeLinecap: 'round', strokeLinejoin: 'round' });
  switch (n.t) {
    case 'g':
      return (
        <G key={key} {...p}>
          {n.children.map((c, i) => node(c, `${key}.${i}`))}
        </G>
      );
    case 'path':
      return <Path key={key} d={n.d} {...p} />;
    case 'circle':
      return <Circle key={key} cx={n.cx} cy={n.cy} r={n.r} {...p} />;
    case 'ellipse':
      return <Ellipse key={key} cx={n.cx} cy={n.cy} rx={n.rx} ry={n.ry} {...p} />;
  }
}

function Icon({ root, viewBox, size, dim }: { root: PNode; viewBox: string; size: number; dim: boolean }) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: size, height: size, opacity: dim ? 0.45 : 1 }}>
      <Svg width={size} height={size} viewBox={viewBox}>
        {node(root, 'k')}
      </Svg>
    </View>
  );
}

/** One keepsake alone, decorative (its name is always in words beside it). Dark: a soft cream rim (UX review P12). */
export const KeepsakeIcon = memo(function KeepsakeIcon({
  id,
  size,
  dim = false,
  theme = 'light',
  style,
}: {
  id: string;
  size: number;
  dim?: boolean;
  theme?: 'light' | 'dark';
  /** Mobile 1.40 (UX review P5): a botanical plant's keepsakes are drawn in line, like the plant. */
  style?: 'botanical' | 'storybook';
}) {
  const { root, viewBox } = keepsakeIcon(id, theme, style, size);
  return <Icon root={root} viewBox={viewBox} size={size} dim={dim} />;
});

/** One planter alone, as this species wears it (UX review P8), decorative. */
export const PlanterIcon = memo(function PlanterIcon({
  id,
  species,
  size,
  dim = false,
  theme = 'light',
  style,
}: {
  id: string;
  species: PlantSpecies;
  size: number;
  dim?: boolean;
  theme?: 'light' | 'dark';
  /** Mobile 1.40: a botanical plant's planters are drawn in line, like the plant. */
  style?: 'botanical' | 'storybook';
}) {
  const { root, viewBox } = planterIcon(id, species, theme, style);
  return <Icon root={root} viewBox={viewBox} size={size} dim={dim} />;
});

