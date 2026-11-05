/**
 * Grove Phase 4: the small parts the Learn and Practice tabs share (design-notes/grove/PHASE4.md
 * section 6, the kit's screens/02-phone-learn.png and 03-phone-practice.png).
 *
 * Plain English:
 * - GlyphTile: the rounded square at the top right of a forest hero (the dandelion on Learn, the
 *   leaf on Practice). Pure decoration: hidden from screen readers, and not drawn at large text
 *   (from 1.3), so a picture never pushes words down.
 * - HeroKicker: the small tracked line at the top of a hero ("UP NEXT · IS OPERATIONS"), with the
 *   area's colour dot when there is one.
 * - HubCard and CardHead: the kit's card with its head inside it (a kicker, or the serif "Lessons").
 * - HubTile: one tile of Learn's grid (an icon badge, a title, one line), the whole tile one button.
 * - MintPill: the small mint "Next" word on a Lessons row.
 * - AreaDot: an area's colour square, the kit's 8pt dot.
 *
 * Nothing here reads or writes saved data, and none of it is compiled into the website bundles.
 */
import type { ReactNode, Ref } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fieldMaxScale, fieldType, LARGE_TEXT, space } from '../theme/tokens';
import { glyphTile, groveRadius, grovePlate, mintInk } from '../theme/grove';
import { useTheme } from '../theme/useTheme';
import { ChevronRight, ICON_STROKE } from './icons';
import { AnimatedPressable, usePressScale } from './motion';
import { FieldText } from './fieldguide';
import { groveCard, groveTile, IconCircle, T, useFontScale } from './ui';

/** The glyph tile in a hero's top right corner. Returns nothing from text scale 1.3 (PHASE4.md section 6). */
export function GlyphTile({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  if (large) return null;
  return (
    <View
      testID="glyph-tile"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: glyphTile.size, height: glyphTile.size, borderRadius: glyphTile.radius, backgroundColor: c.forestTrack, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      {children}
    </View>
  );
}

/** An area's colour square (the kit's 8pt dot with 2pt corners). Decorative: the name beside it says the area. */
export function AreaDot({ color, size = 8 }: { color: string; size?: number }) {
  return <View accessible={false} importantForAccessibility="no" style={{ width: size, height: size, borderRadius: 2, backgroundColor: color }} />;
}

/**
 * The kicker at the top of a forest hero: tracked caps in `onForest2`, the area dot before it when
 * there is one. A screen-reader header, spoken in sentence case ("Up next, IS Operations").
 */
export function HeroKicker({ label, spoken, dot, ref }: { label: string; spoken?: string; dot?: string; ref?: Ref<View> }) {
  const { c } = useTheme();
  return (
    <View
      ref={ref}
      accessible
      accessibilityRole="header"
      accessibilityLabel={spoken ?? label.replace(/ · /g, ', ')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      {dot ? <AreaDot color={dot} /> : null}
      <FieldText v="head" color={c.onForest2} style={{ flexShrink: 1 }}>
        {label}
      </FieldText>
    </View>
  );
}

/** The kit's card: `raised`, a 1pt `line` edge, 24 corners, 16 padding. Never a button by itself. */
export function HubCard({ children, testID, style }: { children: ReactNode; testID?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View testID={testID} style={[groveCard(c), { paddingHorizontal: grovePlate.pad, paddingTop: space.md, paddingBottom: space.xs }, style]}>
      {children}
    </View>
  );
}

/**
 * A card's head, inside the card. `kicker` (the default, TYPE_SCALE R4 for a card on a tab home):
 * tracked caps in ink. `serif`: the title role (Learn's "Lessons"). The meta sits at the right, and
 * goes under the head from text scale 1.2 so neither is squeezed. Always a screen-reader header.
 */
export function CardHead({
  title,
  meta,
  metaLabel,
  serif,
  headRef,
}: {
  title: string;
  meta?: string;
  metaLabel?: string;
  serif?: boolean;
  headRef?: Ref<View>;
}) {
  const { c } = useTheme();
  const stacked = useFontScale() >= 1.2;
  return (
    <View
      style={{
        flexDirection: stacked ? 'column' : 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: stacked ? 'flex-start' : 'baseline',
        columnGap: space.md,
        rowGap: 2,
        paddingBottom: space.sm,
      }}
    >
      <View ref={headRef} accessible accessibilityRole="header" accessibilityLabel={title} style={{ flexShrink: 1 }}>
        {serif ? (
          <T v="title">{title}</T>
        ) : (
          <Text maxFontSizeMultiplier={fieldMaxScale.head} style={[fieldType.head, { color: c.ink }]}>
            {title}
          </Text>
        )}
      </View>
      {meta ? (
        <T v="meta" accessibilityLabel={metaLabel} style={{ flexShrink: 1 }}>
          {meta}
        </T>
      ) : null}
    </View>
  );
}

/** A 1pt divider between rows inside a card, inset to where the row's words start. */
export function CardDivider({ inset = 0 }: { inset?: number }) {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.line, marginLeft: inset }} />;
}

/**
 * One of Learn's tiles: an icon badge, a title (`label`) and one line (`meta`). The whole tile is ONE
 * button with one spoken name. `row`: the full-width shape (badge, words, chevron), used for Final
 * review week, an odd last tile and every tile from text scale 1.3. Grows with its text (minHeight).
 */
export function HubTile({
  icon,
  title,
  line,
  spoken,
  hint,
  onPress,
  row,
  testID,
  style,
}: {
  icon: (color: string) => ReactNode;
  title: string;
  line: string;
  spoken: string;
  hint?: string;
  onPress: () => void;
  row?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const press = usePressScale({ scale: 0.98, tint: c.soft, tintRadius: groveRadius.tile });
  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={hint}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        groveTile(c),
        { minHeight: 56, padding: 14, gap: row ? space.md : space.sm },
        row ? { flexDirection: 'row', alignItems: 'center' } : { alignItems: 'flex-start' },
        style,
        press.style,
      ]}
    >
      {press.layer}
      <IconCircle>{icon(c.accentText)}</IconCircle>
      <View style={{ flex: row ? 1 : undefined, minWidth: 0, gap: 2, alignSelf: row ? undefined : 'stretch' }}>
        <T v="label">{title}</T>
        <T v="meta">{line}</T>
      </View>
      {row ? <ChevronRight size={18} color={c.muted} strokeWidth={ICON_STROKE} /> : null}
    </AnimatedPressable>
  );
}

/**
 * The mint "Next" word on a Lessons row: mint fill with the dark mint ink in both themes (10.3:1).
 * The word carries the meaning; the row's spoken name says it too ("next lesson here").
 */
export function MintPill({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View testID="mint-pill" accessible={false} importantForAccessibility="no-hide-descendants" style={{ backgroundColor: c.sap, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 1, alignSelf: 'center' }}>
      <T v="caption" color={mintInk}>
        {label}
      </T>
    </View>
  );
}

/**
 * A count in a small rounded chip at a row's end (Practice's "Questions to revisit 8"): the soft fill
 * with the accent words. Part of its row's spoken name, so hidden on its own.
 */
export function CountChip({ value }: { value: string }) {
  const { c } = useTheme();
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ backgroundColor: c.soft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2 }}>
      <T v="label" num color={c.accentText}>
        {value}
      </T>
    </View>
  );
}
