/**
 * Today's own pieces (mobile 1.23, mockup A): the streak pill in the header.
 * Mobile 1.24 removed the three stat tiles under the readiness row (answered,
 * accuracy, weakest area): they showed "Not yet" on Day 0 and put a second
 * percentage next to the readiness range. Spec: DESIGN_SYSTEM.md §11 "Today".
 * Theme tokens only; Fraunces for numbers and names, Figtree for words.
 */
import { View } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ICON_STROKE, Sprig } from './icons';
import { Pop, type Growth } from './motion';
import { BigNum, CARD_LIFT, ICON_SIZE, T } from './ui';

// ── Streak pill: "<sprig> 6 day streak" ──────────────────────────────
/**
 * The streak, as an outlined pill (a raised surface in light, a 1.5 `line`
 * outline in dark: the same two looks as an L2 card). Spoken as one stop:
 * "6-day streak". The numeral rolls +1 on a new day's first study and the
 * sprig pops once (motion.tsx useGrowth; still under Reduce Motion).
 */
export function StreakPill({ streak, growth }: { streak: number; growth?: Growth }) {
  const { c, isDark } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${streak}-day streak`}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          minHeight: 40,
          paddingHorizontal: 14,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          backgroundColor: c.raised,
          borderColor: isDark ? c.line : 'transparent',
        },
        !isDark && CARD_LIFT,
      ]}
    >
      <Pop trigger={growth?.play ? growth.run : undefined} spring="leaf">
        <Sprig size={ICON_SIZE.row} color={c.clay} strokeWidth={ICON_STROKE} />
      </Pop>
      <BigNum
        value={String(streak)}
        size={20}
        color={c.clay}
        roll={growth ? { play: growth.play, from: String(growth.from[0] ?? ''), run: growth.run } : undefined}
      />
      <T v="meta" color={c.ink2}>day streak</T>
    </View>
  );
}
