/**
 * The badges' way in from You (mobile 1.51, Field Guide §21): one row
 * with the three newest pressed specimens, "Badges", "Your badges and field
 * notes · Last pressed: Know What You Know, 28 Oct", a small "new" dot (shape,
 * and said) and the count earned (never "of N"). One button to the badges screen.
 * Settings → Show badges off hides it (You keeps a Field notes row instead).
 * Grove You C2: the row says and shows "Badges", never "Herbarium" (labels decision 8);
 * the code names (HerbariumEntry, HERBARIUM, herbarium-entry) stay.
 */
import { memo } from 'react';
import { View } from 'react-native';
import type { LastPressed } from '../engine/fieldGuide';
import { shortDate, spokenShortDate } from '../lib/format';
import { fieldInk, LARGE_TEXT, space } from '../theme/tokens';
import { groveRadius, specimenTape } from '../theme/grove';
import { useTheme } from '../theme/useTheme';
import { ChevronRight, ICON_STROKE } from './icons';
import { EmblemArt } from './medallion';
import { AnimatedPressable, usePressScale } from './motion';
import { Row, T, Trail, useFontScale } from './ui';

/** The row's title, shown and said. The code name stays; the words are "Badges" (labels decision 8). */
export const HERBARIUM = 'Badges';

/** "Your badges and field notes · Last pressed: Know What You Know, 28 Oct". */
export function herbariumLine(last?: LastPressed): string {
  return last ? `Your badges and field notes · Last pressed: ${last.name}, ${shortDate(last.at)}` : 'Your badges and field notes · none pressed yet';
}

export function herbariumSpoken(count: number, newBadge: boolean, last?: LastPressed): string {
  return `${HERBARIUM}: your badges and field notes${newBadge ? ', new badge' : ''}, ${count ? `${count} earned` : 'none yet'}.${last ? ` Last pressed: ${last.name}, ${spokenShortDate(last.at)}.` : ''}`;
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

/** How many tiles the You shelf shows (the kit's 4-up row: the newest pressed first, then empty slots). */
export const SHELF_SLOTS = 4;

/**
 * The line under the shelf (the kit: "1 pressed · Fresh Start, 26 Oct"), led by the row's
 * kept words "Your badges and field notes" (DECISIONS 8 carry item, PHASE4 7.14 item 7).
 */
export function shelfLine(count: number, last?: LastPressed): string {
  return last && count ? `Your badges and field notes. ${count} pressed · ${last.name}, ${shortDate(last.at)}` : 'Your badges and field notes. None pressed yet';
}

/**
 * Grove Phase 4 (PHASE4.md 7.14 item 7, board 04-phone-you): You's badge shelf. Four square tiles,
 * the newest pressed badges first (each its own pressed art on a quiet tile with its paper tape),
 * then dashed empty slots in `leafEmpty`; under them one line. The shelf and its line are ONE
 * button to the badges screen, spoken as before (count, "new badge", the last one pressed); the
 * tiles inside are hidden from screen readers. At text scale 1.3 and up the tiles wrap 2 by 2.
 */
export const BadgeShelf = memo(function BadgeShelf({
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
  const { c, g } = useTheme();
  const press = usePressScale({ scale: 1, tint: c.soft });
  const large = useFontScale() >= LARGE_TEXT;
  // One entry per slot: a pressed badge (newest first), or null for an empty slot.
  const slots: (LastPressed | null)[] = Array.from({ length: SHELF_SLOTS }, (_, i) => pressed[i] ?? null);
  // 4 across, or 2 rows of 2 when the text is large (each tile stays square and at least 48pt).
  const perRow = large ? 2 : SHELF_SLOTS;
  const rows: (LastPressed | null)[][] = [];
  for (let i = 0; i < slots.length; i += perRow) rows.push(slots.slice(i, i + perRow));
  return (
    <AnimatedPressable
      testID="badge-shelf"
      accessibilityRole="button"
      accessibilityLabel={herbariumSpoken(count, newBadge, pressed[0])}
      accessibilityHint="Opens your badges"
      onPress={() => {
        press.settle();
        onPress();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ gap: space.md, paddingVertical: space.xs }, press.style]}
    >
      {press.layer}
      {/* The tiles are pictures only: the button's label says what they show. */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ gap: space.sm }}>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: space.sm }}>
            {row.map((p, i) =>
              p ? (
                <View
                  key={p.key}
                  testID="shelf-tile"
                  // The kit's light paper sheet (04 `.spec`), light in both themes: in dark, the old soft
                  // fill was about 1.03:1 on the card and the tile shape was lost.
                  style={{ flex: 1, aspectRatio: 1, minWidth: 48, borderRadius: groveRadius.tile, backgroundColor: g.specimen, alignItems: 'center', justifyContent: 'center' }}
                >
                  {/* The pale paper tape that holds a pressed specimen (the kit's strip across the top). */}
                  <View style={{ position: 'absolute', top: -4, width: 30, height: 10, borderRadius: 2, backgroundColor: specimenTape, transform: [{ rotate: '-4deg' }] }} />
                  {/* The art sits on a light sheet in both themes, so it keeps the light-sheet inks. */}
                  <EmblemArt badge={p.badge} tier={p.tier} emblem={p.emblem} palette={fieldInk.light.pressed} size={large ? 64 : 44} />
                </View>
              ) : (
                <View
                  key={`empty-${ri}-${i}`}
                  testID="shelf-empty"
                  style={{ flex: 1, aspectRatio: 1, minWidth: 48, borderRadius: groveRadius.tile, borderWidth: 1.5, borderStyle: 'dashed', borderColor: g.leafEmpty }}
                />
              ),
            )}
          </View>
        ))}
      </View>
      <Row gap={space.sm}>
        <T v="meta" style={{ flex: 1, minWidth: 0 }}>{shelfLine(count, pressed[0])}</T>
        {/* The "new" dot: shape here, and said in the button's label. */}
        {newBadge && <View testID="new-badge-dot" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} />}
      </Row>
    </AnimatedPressable>
  );
});
