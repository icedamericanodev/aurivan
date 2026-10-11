/**
 * One keepsake drawn alone (mobile 1.14): the Look screen's rows and the
 * contact sheet. Its own file with no theme hooks, so the sheet renderer can
 * use it. Decorative: the keepsake's name is always in words beside it.
 */
import { memo, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { keepsakeIcon, type PNode } from './art';

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

/** One keepsake alone, decorative (its name is always in words beside it). */
export const KeepsakeIcon = memo(function KeepsakeIcon({ id, size, dim = false }: { id: string; size: number; dim?: boolean }) {
  const { root, viewBox } = keepsakeIcon(id);
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: size, height: size, opacity: dim ? 0.45 : 1 }}>
      <Svg width={size} height={size} viewBox={viewBox}>
        {node(root, 'k')}
      </Svg>
    </View>
  );
});

