/**
 * The top of You, version C2 (the owner's "C with the improvements", 31 Oct 2026):
 * the summary sentence, its "Practice {area}" button and the plant chip.
 *
 * Plain English for the founder:
 * - `YouSummaryLine`: one sentence in the reading serif, under the profile. Every word comes from
 *   engine/groveYou.ts (the same rules as the website), so it never invents a number. The focus
 *   area is drawn a little heavier; screen readers hear the sentence once, with a comma where the
 *   dot is.
 * - `PlantChip`: a forest pill, "YOUR PLANT" over "Bayani · Shoot · growth 3 of 6". It opens
 *   Your plant. With no plant yet it says "Pick your plant" and opens the plant picker. With
 *   Settings → Show my plant off, You does not draw it at all.
 * Both wrap at 200% text: nothing is cut, the chip just grows taller.
 */
import { memo, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { type YouSummary } from '../engine/groveYou';
import { groveEmphasis } from '../theme/grove';
import { LARGE_TEXT, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ChevronRight, ICON_STROKE } from './icons';
import { FieldText } from './fieldguide';
import { AnimatedPressable, usePressScale } from './motion';
import { T, useFontScale } from './ui';

/** The Settings row's line near the end of You (the owner's words, 31 Oct 2026): what Settings holds. */
export const SETTINGS_ROW_NOTE = 'Name, exam date, dark mode, your data, help and about';

/** The sentence:"4 study days this week. Readiness 63 to 73, a study estimate. Focus next: **Protection**, …". */
export const YouSummaryLine = memo(function YouSummaryLine({ summary }: { summary: YouSummary }) {
  return (
    <T v="stem" accessibilityLabel={summary.spoken} style={{ marginTop: space.lg }}>
      {summary.lead}
      {/* The focus area, a weight heavier (the web's bold). The words carry it too ("Focus next:"). */}
      {summary.focus ? <Text style={groveEmphasis}>{summary.focus}</Text> : null}
      {summary.tail}
    </T>
  );
});

/** The chip's circle: the plant (or a sprout glyph) on a lighter forest disc. */
const CHIP_DISC = 40;

export const PlantChip = memo(function PlantChip({
  title,
  art,
  spoken,
  hint,
  onPress,
}: {
  /** "Bayani · Shoot · growth 3 of 6", or "Pick your plant". */
  title: string;
  /** The small plant (or the sprout glyph), drawn in the disc. Decorative: the label says it all. */
  art: ReactNode;
  /** The chip's one spoken name; it starts with the visible "Your plant" (WCAG 2.5.3). */
  spoken: string;
  hint: string;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const press = usePressScale({ scale: 1, tint: c.forestTop, tintRadius: radius.pill });
  // From ×1.3 text the pill would squeeze its words: it becomes a rounded card the full width.
  const large = useFontScale() >= LARGE_TEXT;
  return (
    <AnimatedPressable
      testID="you-plant-chip"
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={hint}
      onPress={() => {
        // It opens another screen: the pressed tint rests at once (the 1.43 gear rule).
        press.settle();
        onPress();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          alignSelf: large ? 'stretch' : 'flex-start',
          maxWidth: '100%',
          minHeight: 56,
          marginTop: space.md,
          paddingVertical: space.sm,
          paddingLeft: space.sm,
          paddingRight: space.md,
          borderRadius: large ? radius.md : radius.pill,
          backgroundColor: c.forest,
        },
        press.style,
      ]}
    >
      {press.layer}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: CHIP_DISC, height: CHIP_DISC, borderRadius: CHIP_DISC / 2, backgroundColor: c.forestTop, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      >
        {art}
      </View>
      <View style={{ flexShrink: 1 }}>
        <FieldText v="head" color={c.onForest2}>Your plant</FieldText>
        <T v="label" color={c.onForest} style={{ marginTop: 2 }}>{title}</T>
      </View>
      <ChevronRight size={18} color={c.onForest2} strokeWidth={ICON_STROKE} />
    </AnimatedPressable>
  );
});
