/**
 * HerbariumSheet and CollectRow (Field Guide §21.2).
 *
 * - HerbariumSheet: one badge set as a sheet: "Sheet I · Groundwork ·
 *   2 of 3 pressed", its purpose in italics, then its specimens on a plate.
 *   Every sheet counts on its own (there is no grand total, ever). Moments,
 *   which are never counted, have no count. The heading is one
 *   screen-reader header, said as before ("Groundwork, 2 of 3").
 * - CollectRow: a "Still to collect" row: a pencilled mount with the
 *   emblem's outline, the badge's name and why it helps the exam now, and a
 *   chevron. One button that opens its details.
 */
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ChevronRight, ICON_STROKE } from '../icons';
import { EmblemArt } from '../medallion';
import { AnimatedPressable, usePressScale } from '../motion';
import { T, useFontScale } from '../ui';
import { FieldText } from './FieldText';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
/** Sheet numbers are roman, as plates in an old guide are. */
export const sheetNo = (i: number) => ROMAN[i] ?? String(i + 1);

export function HerbariumSheet({
  no,
  name,
  earned,
  total,
  complete,
  purpose,
  spoken,
  note,
  children,
  style,
  testID,
}: {
  /** "I", "II"… */
  no: string;
  name: string;
  /** Counted sets only: how many of the core are pressed. */
  earned?: number;
  total?: number;
  /** "3 Oct" once every core badge is pressed. */
  complete?: string;
  purpose: string;
  /** The header's spoken label (the set's own words). */
  spoken: string;
  /** One line under the purpose ("New in Evergreen…"). */
  note?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const counted = earned !== undefined && total !== undefined && total > 0;
  return (
    <View testID={testID} style={[{ marginTop: space.xxl }, style]}>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={spoken}
        style={{ flexDirection: 'row', flexWrap: large ? 'wrap' : 'nowrap', alignItems: 'baseline', columnGap: 10, rowGap: 2 }}
      >
        <FieldText v="keyNo" color={c.clay}>{`Sheet ${no}`}</FieldText>
        <FieldText v="value" style={{ flex: large ? undefined : 1, flexShrink: 1 }} maxScale={2}>{name}</FieldText>
        {counted && (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <FieldText v="value">{String(earned)}</FieldText>
            <FieldText v="small">{complete ? `of ${total} · complete ${complete}` : `of ${total} pressed`}</FieldText>
          </View>
        )}
      </View>
      <FieldText v="fig" style={{ marginTop: 2, marginBottom: space.sm }}>{purpose}</FieldText>
      {note ? <T v="meta" color={c.accentText} style={{ marginBottom: space.sm }}>{note}</T> : null}
      {children}
    </View>
  );
}

export function CollectRow({
  badge,
  tier,
  emblem,
  name,
  why,
  spoken,
  onPress,
  hint = 'Opens its details',
  children,
  last,
}: {
  badge: string;
  tier?: number;
  emblem?: string;
  name: string;
  why: string;
  spoken: string;
  onPress: () => void;
  hint?: string;
  /** Under the words (a progress bar). */
  children?: ReactNode;
  last?: boolean;
}) {
  const { c } = useTheme();
  const touch = usePressScale({ scale: 1, tint: c.soft });
  const mono = { E1: c.control, E2: c.control, E3: c.control, D2: c.control, D3: c.control, L3: c.control, K: c.bg };
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={hint}
      onPress={onPress}
      onPressIn={touch.onPressIn}
      onPressOut={touch.onPressOut}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line, borderBottomWidth: last ? 1 : 0, borderBottomColor: c.line }, touch.style]}
    >
      {touch.layer}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: 42, height: 42, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.control, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}
      >
        <EmblemArt badge={badge} tier={tier} emblem={emblem} palette={mono} size={32} opacity={0.6} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="label">{name}</T>
        <T v="meta" style={{ marginTop: 2 }}>{why}</T>
        {children}
      </View>
      <ChevronRight size={18} color={c.muted} strokeWidth={ICON_STROKE} />
    </AnimatedPressable>
  );
}
