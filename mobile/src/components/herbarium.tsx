/**
 * The herbarium's way in from You (mobile 1.51, Field Guide §21): one row
 * with the three newest pressed specimens, "Herbarium", "Badges and field
 * notes · Last pressed: Know What You Know, 28 Oct", a small "new" dot (shape,
 * and said) and the count earned (never "of N"). One button to the herbarium.
 * Settings → Show badges off hides it (You keeps a Field notes row instead).
 */
import { memo } from 'react';
import { View } from 'react-native';
import type { LastPressed } from '../engine/fieldGuide';
import { shortDate, spokenShortDate } from '../lib/format';
import { fieldInk, LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ChevronRight, ICON_STROKE } from './icons';
import { EmblemArt } from './medallion';
import { AnimatedPressable, usePressScale } from './motion';
import { Row, T, Trail, useFontScale } from './ui';

export const HERBARIUM = 'Herbarium';

/** "Badges and field notes · Last pressed: Know What You Know, 28 Oct". */
export function herbariumLine(last?: LastPressed): string {
  return last ? `Badges and field notes · Last pressed: ${last.name}, ${shortDate(last.at)}` : 'Badges and field notes · none pressed yet';
}

export function herbariumSpoken(count: number, newBadge: boolean, last?: LastPressed): string {
  return `${HERBARIUM}: badges and field notes${newBadge ? ', new badge' : ''}, ${count ? `${count} earned` : 'none yet'}.${last ? ` Last pressed: ${last.name}, ${spokenShortDate(last.at)}.` : ''}`;
}

export const HerbariumEntry = memo(function HerbariumEntry({
  pressed,
  count,
  newBadge,
  onPress,
}: {
  pressed: readonly LastPressed[];
  count: number;
  newBadge: boolean;
  onPress: () => void;
}) {
  const { c, isDark } = useTheme();
  const ink = fieldInk[isDark ? 'dark' : 'light'];
  const press = usePressScale({ scale: 1, tint: c.soft });
  // ×1.3 and up (the KeyList rule): emblems above, the words full width, the count under them.
  const large = useFontScale() >= LARGE_TEXT;
  return (
    <AnimatedPressable
      testID="herbarium-entry"
      accessibilityRole="button"
      accessibilityLabel={herbariumSpoken(count, newBadge, pressed[0])}
      accessibilityHint="Opens your badges"
      onPress={() => {
        press.settle();
        onPress();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ flexDirection: large ? 'column' : 'row', alignItems: large ? 'flex-start' : 'center', gap: large ? space.sm : space.md, minHeight: 64, paddingVertical: space.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line }, press.style]}
    >
      {press.layer}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', minWidth: 40 }}>
        {pressed.length ? (
          pressed.map((p, i) => (
            <View key={p.key} style={{ marginLeft: i ? -12 : 0 }}>
              <EmblemArt badge={p.badge} tier={p.tier} emblem={p.emblem} palette={ink.pressed} size={30} />
            </View>
          ))
        ) : (
          <View style={{ width: 30, height: 30, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.control, borderRadius: 3 }} />
        )}
      </View>
      <View style={large ? { alignSelf: 'stretch' } : { flex: 1, minWidth: 0 }}>
        <T v="label">{HERBARIUM}</T>
        <T v="meta" style={{ marginTop: 2 }}>{herbariumLine(pressed[0])}</T>
      </View>
      <Row gap={space.sm}>
        {newBadge && <View testID="new-badge-dot" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} />}
        {count ? <Trail value={String(count)} unit="earned" /> : null}
        <ChevronRight size={18} color={c.muted} strokeWidth={ICON_STROKE} />
      </Row>
    </AnimatedPressable>
  );
});
