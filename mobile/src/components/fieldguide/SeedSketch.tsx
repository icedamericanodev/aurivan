/**
 * SeedSketch (Field Guide, premium round 2): the seed before anything has
 * grown, for the welcome's title page ("Seed, before Day 1"). A line of soil,
 * a seed half in it with one root, and a pencilled (dashed) shoot that has not
 * happened yet. Decorative: the words around it carry the meaning, so it is
 * hidden from screen readers. Still (no motion), so Reduce Motion has nothing
 * to change.
 *
 * Inks: soil and the shoot in `control` (the "not yet" pencil), the seed in
 * `fieldInk.seed` edged in `fieldInk.stem`, its root in `fieldInk.stem`.
 * No new colours.
 */
import { View } from 'react-native';
import Svg, { Ellipse, Line, Path, Rect } from 'react-native-svg';
import { fieldInk } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** The drawing's own box (it scales to the width it is given, keeping this shape). */
const W = 240;
const H = 96;

export function SeedSketch({ width = W, testID }: { width?: number; testID?: string }) {
  const { c, isDark } = useTheme();
  const ink = fieldInk[isDark ? 'dark' : 'light'];
  const soil = 60;
  const cx = W / 2;
  const height = (width / W) * H;
  return (
    <View testID={testID} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`}>
        {/* The shoot to come: pencilled, dashed, with one leaf outline. */}
        <Path d={`M${cx} ${soil - 6} C ${cx - 2} ${soil - 22}, ${cx + 6} ${soil - 34}, ${cx + 4} ${soil - 46}`} fill="none" stroke={c.control} strokeWidth={1.4} strokeDasharray="3 3" strokeLinecap="round" />
        <Path d={`M${cx + 3} ${soil - 30} C ${cx + 14} ${soil - 38}, ${cx + 24} ${soil - 36}, ${cx + 28} ${soil - 30} C ${cx + 20} ${soil - 24}, ${cx + 10} ${soil - 24}, ${cx + 3} ${soil - 30} Z`} fill="none" stroke={c.control} strokeWidth={1.2} strokeDasharray="2.5 2.5" />
        {/* The seed, half in the soil. */}
        <Ellipse cx={cx} cy={soil + 1} rx={15} ry={9} fill={ink.seed} stroke={ink.stem} strokeWidth={1.3} />
        <Path d={`M${cx - 9} ${soil - 1} C ${cx - 3} ${soil - 5}, ${cx + 4} ${soil - 5}, ${cx + 10} ${soil - 1}`} fill="none" stroke={ink.stem} strokeWidth={0.9} strokeLinecap="round" />
        {/* Below the soil the seed fades under the plate's paper: half buried. */}
        <Rect x={0} y={soil} width={W} height={H - soil} fill={c.raised2} opacity={0.55} />
        {/* The soil: one rule, and a few short strokes under it. */}
        <Line x1={16} y1={soil} x2={W - 16} y2={soil} stroke={c.control} strokeWidth={1.2} strokeLinecap="round" />
        {[40, 72, 160, 196].map((x) => (
          <Line key={x} x1={x} y1={soil + 7} x2={x + 10} y2={soil + 7} stroke={c.control} strokeWidth={1} strokeLinecap="round" />
        ))}
        {/* One root, down and a little aside. */}
        <Path d={`M${cx - 2} ${soil + 8} C ${cx - 4} ${soil + 18}, ${cx + 6} ${soil + 24}, ${cx + 2} ${soil + 32}`} fill="none" stroke={ink.stem} strokeWidth={1.3} strokeLinecap="round" />
      </Svg>
    </View>
  );
}
