/**
 * SpecimenLabel (Field Guide §21.2): ruled label rows, a tracked key on the
 * left and a serif value on the right ("DAYS TO EXAM ··· 38"), pasted onto
 * the paper: `raised`, a 1pt `line` edge, 3pt corners, no shadow. It
 * replaces the 3-up stat tiles. Each row is one screen-reader stop, "Days to
 * exam: 38", as Stat was. At 200% text the value drops under its key.
 */
import { Children, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LARGE_TEXT, plate, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { BigNum, useFontScale, type Roll } from '../ui';
import { FieldText } from './FieldText';

export function SpecimenLabel({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { c } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View testID={testID} style={[{ backgroundColor: c.raised, borderWidth: 1, borderColor: c.line, borderRadius: plate.labelRadius }, style]}>
      {rows.map((row, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.line } : undefined}>
          {row}
        </View>
      ))}
    </View>
  );
}

export function SpecimenRow({
  label,
  value,
  unit,
  word,
  note,
  spoken,
  color,
  pct,
  roll,
  children,
}: {
  /** The key, said as written ("Days to exam"); shown in tracked caps. */
  label: string;
  /** A number (Fraunces 500), or… */
  value?: string;
  /** …words after it ("days", "a study estimate"). */
  unit?: string;
  /** …a value in words instead ("Not yet", "Starts today"). */
  word?: string;
  /** One line under the row ("Exam pace: about 96 s"). */
  note?: string;
  /** A raised % after the number. */
  pct?: boolean;
  /** The number rolls like the stats always did (the day's first view, or what changed). */
  roll?: Roll;
  /** What a screen reader says after the label (default: the value and unit as shown). */
  spoken?: string;
  color?: string;
  /** Anything drawn under the row (the readiness scale bar). */
  children?: ReactNode;
}) {
  const large = useFontScale() >= LARGE_TEXT;
  const said = spoken ?? (word ?? `${value ?? ''}${pct ? ' percent' : ''}${unit ? ` ${unit}` : ''}`);
  return (
    <View accessible accessibilityLabel={`${label}: ${said}${note ? `. ${note}` : ''}`} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
      <View style={{ flexDirection: large ? 'column' : 'row', justifyContent: 'space-between', alignItems: large ? 'flex-start' : 'baseline', columnGap: space.md, rowGap: 2 }}>
        <FieldText v="head" style={{ flexShrink: 1 }}>{label}</FieldText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', justifyContent: large ? 'flex-start' : 'flex-end', columnGap: 6, flexShrink: 1 }}>
          {word !== undefined ? (
            <FieldText v="value" color={color} maxScale={2}>{word}</FieldText>
          ) : (
            <BigNum value={value ?? ''} pct={pct} size={22} color={color} roll={roll} />
          )}
          {unit ? <FieldText v="small">{unit}</FieldText> : null}
        </View>
      </View>
      {note ? <FieldText v="small" style={{ marginTop: 2, textAlign: large ? 'left' : 'right' }}>{note}</FieldText> : null}
      {children}
    </View>
  );
}
