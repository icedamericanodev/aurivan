/** Grove progress primitives for You. Stat tiles adapt to large text; the readiness ring is decorative and explained by its visible caption. */
import { type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { FieldText } from './fieldguide';
import { BigNum, groveTile, T, useFontScale, type Roll } from './ui';

/**
 * One stat tile: a tracked key, then a serif number (or a value in words), then an optional line. One stop,
 * said "{label}: {spoken}" (`spoken` carries the line too when it should be heard).
 */
export function StatTile({
  label,
  value,
  pct,
  unit,
  word,
  note,
  spoken,
  color,
  roll,
}: {
  label: string;
  value?: string;
  pct?: boolean;
  unit?: string;
  word?: string;
  note?: string;
  spoken: string;
  color?: string;
  roll?: Roll;
}) {
  const { c } = useTheme();
  return (
    <View accessible accessibilityLabel={`${label}: ${spoken}`} style={[groveTile(c), { flex: 1, minWidth: 0, padding: 14, gap: 4 }]}>
      <FieldText v="head">{label}</FieldText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6 }}>
        {word !== undefined ? <T v="title" color={color}>{word}</T> : <BigNum value={value ?? ''} pct={pct} size={30} color={color} roll={roll} />}
        {unit ? <T v="meta">{unit}</T> : null}
      </View>
      {note ? <T v="meta">{note}</T> : null}
    </View>
  );
}

/** The tiles two by two (rows share a height), or one column from text scale 1.3. */
export function StatGrid({ children, testID }: { children: ReactNode[]; testID?: string }) {
  const large = useFontScale() >= LARGE_TEXT;
  const tiles = children.filter(Boolean);
  const rows: ReactNode[][] = [];
  if (large) tiles.forEach((t) => rows.push([t]));
  else for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));
  return (
    <View testID={testID} style={{ gap: space.sm, marginTop: space.lg }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'stretch' }}>
          {row}
        </View>
      ))}
    </View>
  );
}

/** How many marks the small ring has: 20, each worth 2 of the 40 answers before the first range. */
export const MINI_RING_MARKS = 20;

/**
 * The small readiness ring (PHASE4.md 7.14 item 5, the kit's G31). `answered`: answers toward the first
 * range (dots: one solid per 2 answers, outlines for the rest, so shape tells them apart). With a range,
 * ticks lit to the low end and gold through the range. Decorative: the card's words say it.
 */
export function MiniReadyRing({ answered, range, size = 56 }: { answered: number; range: { low: number; high: number } | null; size?: number }) {
  const { c } = useTheme();
  const r = 40;
  const at = (i: number, rad: number) => {
    const a = (i / MINI_RING_MARKS) * Math.PI * 2;
    return { x: 50 + rad * Math.sin(a), y: 50 - rad * Math.cos(a) };
  };
  // The range in the tip gold (the kit's range ticks), the low end in accent, the rest the quiet track.
  const gold = c.tip;
  return (
    <View testID="mini-ready-ring" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {range
          ? Array.from({ length: MINI_RING_MARKS }, (_, i) => {
              const pct = ((i + 1) / MINI_RING_MARKS) * 100;
              const lit = pct <= range.low ? c.accent : pct <= range.high + 100 / MINI_RING_MARKS / 2 && pct > range.low ? gold : c.track;
              const p0 = at(i, r - 8);
              const p1 = at(i, r + 4);
              return <Line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={lit} strokeWidth={4} strokeLinecap="round" />;
            })
          : Array.from({ length: MINI_RING_MARKS }, (_, i) => {
              const p = at(i, r);
              return i < Math.floor(answered / 2) ? (
                <Circle key={i} cx={p.x} cy={p.y} r={4.6} fill={c.accent} />
              ) : (
                <Circle key={i} cx={p.x} cy={p.y} r={3.8} fill="none" stroke={c.control} strokeWidth={1.5} />
              );
            })}
      </Svg>
    </View>
  );
}
