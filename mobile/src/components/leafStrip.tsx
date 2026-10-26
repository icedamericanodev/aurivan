/**
 * Results' leaf strip (mobile 1.43, design spec §10.1): which questions went
 * right, at a glance. One leaf per question in the order shown: filled for
 * right, open with an ✗ for missed (shape and colour), a bare outline for one
 * not answered. Rows of 10 (two rows for up to 20); rows of 5 on a phone
 * narrower than 380 dp and at ×1.3 text. A number sits only under a missed
 * leaf, so the eye lands on the misses. It is a picture with ONE spoken
 * label ("Right: 1, 2 and 4. Missed: 3."), never ten small targets, and it
 * does not animate (the rings are Results' one growth).
 */
import { useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { stripSpoken, type LeafState } from '../engine/resultsCopy';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { RINGS_SIDE_BY_SIDE_MIN } from './journey';
import { T, useFontScale } from './ui';

/**
 * One 14×22 leaf (the house lens shape): right = filled with a paper midrib;
 * missed = an open leaf with an ✗ (by SHAPE as well as colour); not answered =
 * a bare outline. Colours come from the caller (`correct`, `wrong`, `muted`).
 */
export function ResultLeaf({ state, color, rib }: { state: LeafState; color: string; rib: string }) {
  const lens = 'M7 21C1.6 16.2 1 7.6 7 1c6 6.6 5.4 15.2 0 20z';
  return (
    <Svg width={14} height={22} viewBox="0 0 14 22">
      {state === 'right' ? (
        <>
          <Path d={lens} fill={color} />
          <Path d="M7 5.5v11" stroke={rib} strokeWidth={1.3} strokeLinecap="round" />
        </>
      ) : state === 'missed' ? (
        <>
          <Path d={lens} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={1.4} />
          <Path d="M4.6 8.6l4.8 4.8M9.4 8.6l-4.8 4.8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </>
      ) : (
        <Path d={lens} fill="none" stroke={color} strokeWidth={1.2} />
      )}
    </Svg>
  );
}

export function LeafStrip({ states }: { states: readonly LeafState[] }) {
  const { c } = useTheme();
  const narrow = useWindowDimensions().width < RINGS_SIDE_BY_SIDE_MIN;
  const large = useFontScale() >= LARGE_TEXT;
  const perRow = narrow || large ? 5 : 10;
  const rows: LeafState[][] = [];
  for (let i = 0; i < states.length; i += perRow) rows.push(states.slice(i, i + perRow));
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={stripSpoken(states)} style={{ gap: space.sm }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((state, k) => {
            const n = r * perRow + k + 1;
            const tone = state === 'right' ? c.correct : state === 'missed' ? c.wrong : c.muted;
            return (
              <View key={n} style={{ width: `${100 / perRow}%`, alignItems: 'center', gap: space.xs }}>
                <ResultLeaf state={state} color={tone} rib={c.bg} />
                {/* Only a miss is numbered; the empty slot keeps every row the same height. */}
                <T v="caption" num color={c.wrong} maxFontSizeMultiplier={1.3} style={{ minHeight: 18 }}>
                  {state === 'missed' ? String(n) : ''}
                </T>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
