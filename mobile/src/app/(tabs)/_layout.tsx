/**
 * Bottom tabs: Today · Learn · Practice · You.
 * (docs/mobile/PRODUCT_VISION.md §3, DESIGN_SYSTEM.md §6 "Tab bar").
 * Mobile 1.51 (the owner's menu pick A): four tabs. The Play tab is gone; its
 * games are Drills, a section of Practice (components/drills.tsx), and every
 * old Play link lands there (app/play.tsx, lib/legacyLinks.ts).
 * Lessons, sessions and games open full-screen on top, which hides the tab
 * bar so learners stay focused.
 *
 * Grove Phase 1: the bar is the kit's floating bar (components/tabBar.tsx), drawn
 * through the navigator's `tabBar` prop. Every tab shows its word under its icon
 * (owner decision, 31 Oct 2026); the current one has a pill behind its icon, with an
 * outline in dark mode and with the phone's high contrast setting. Each tab screen pads
 * its end by the bar's footprint (TabSpaceContext), so nothing hides behind the bar.
 *
 * Switching tabs is a short fade-through (240 ms, mobile 1.8): the old tab fades out in
 * the first half and the new one fades in during the second, so two screens never show
 * at once. Tabs are peers, so nothing slides; under Reduce Motion the switch is instant.
 * Today and You use custom glyphs (sprout, specimen tag); the others stay Lucide.
 * Practice is a checklist, not a target: a target's concentric circles looked like rings.
 * Mobile 1.10: a small "new" mark on the You icon while a newly earned badge waits to be
 * seen (spoken "You, new badge"). Never a number. It is a RING (an accent outline), so it
 * never reads as the current tab's pill.
 */
import { useState } from 'react';
import { Tabs } from 'expo-router';
import { Easing, View, type Animated, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, ICON_STROKE, ListChecks, SpecimenTag, Sprout } from '../../components/icons';
import { useMotion } from '../../components/motion';
import { FloatingTabBar, TAB_BAR, TabHeightContext, TabSpaceContext, tabBarSpace } from '../../components/tabBar';
import { ICON_SIZE } from '../../components/ui';
import { useNewBadge } from '../../lib/badges';
import { motion } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type IconProps = { color: ColorValue; size: number; focused?: boolean };
type Glyph = (p: { size?: number; color: string; strokeWidth?: number }) => React.ReactNode;
const icon = (G: Glyph) =>
  function TabIcon({ color, size }: IconProps) {
    return <G size={size || ICON_SIZE.bar} color={color as string} strokeWidth={ICON_STROKE} />;
  };
/**
 * The You icon, with the "new badge" mark at its top right: a 10pt ring
 * (2pt accent outline, the bar's own colour inside, or the pill's when You is
 * the current tab), a shape distinct from the current tab's pill. A component
 * (its parent passes `dot`), so it never runs hooks inside a render function.
 */
export function YouIcon({ color, size, dot, focused }: IconProps & { dot: boolean }) {
  const { c, g } = useTheme();
  return (
    <View>
      {/* Premium round 2 (expert ruling B): a plain specimen tag (was the growth rings). */}
      <SpecimenTag size={size || ICON_SIZE.bar} color={color as string} strokeWidth={ICON_STROKE} />
      {dot && (
        <View
          testID="you-new-dot"
          style={{ position: 'absolute', top: -3, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: focused ? c.forestTrack : g.navFloat, borderWidth: 2, borderColor: c.accent }}
        />
      )}
    </View>
  );
}

/** The tab fade's curve: Material's standard easing, in React Native's Animated (the tab navigator's engine). */
const TAB_EASE = Easing.bezier(motion.curve.standard[0], motion.curve.standard[1], motion.curve.standard[2], motion.curve.standard[3]);

/**
 * Fade-through. `progress` runs 1 → 0 for the tab arriving and 0 → ±1 for
 * the one leaving, so the same curve makes the leaving tab gone by half-way
 * and the arriving one start at half-way: no cross-fade muddle.
 */
const fadeThrough = ({ current }: { current: { progress: Animated.AnimatedInterpolation<number> } }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({ inputRange: [-1, -0.5, 0, 0.5, 1], outputRange: [0, 0, 1, 0, 0] }),
  },
});

export default function TabsLayout() {
  const { reduced } = useMotion();
  const insets = useSafeAreaInsets();
  const newBadge = useNewBadge();
  // The bar's measured height (64, taller with larger text): every tab screen pads its end by it.
  const [barH, setBarH] = useState<number>(TAB_BAR.height);
  return (
    <TabHeightContext.Provider value={setBarH}>
      <TabSpaceContext.Provider value={tabBarSpace(insets.bottom, barH)}>
        <Tabs
          tabBar={(props) => <FloatingTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            animation: reduced ? 'none' : 'fade',
            sceneStyleInterpolator: reduced ? undefined : fadeThrough,
            transitionSpec: { animation: 'timing', config: { duration: motion.dur.enter, easing: TAB_EASE } },
          }}
        >
          {/* Route stays "home" so existing links keep working; the tab reads "Today". */}
          <Tabs.Screen name="home" options={{ title: 'Today', tabBarIcon: icon(Sprout) }} />
          <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarIcon: icon(BookOpen as Glyph) }} />
          <Tabs.Screen name="practice" options={{ title: 'Practice', tabBarIcon: icon(ListChecks as Glyph) }} />
          <Tabs.Screen
            name="you"
            options={{
              title: 'You',
              tabBarIcon: ({ color, size, focused }) => <YouIcon color={color} size={size} focused={focused} dot={newBadge} />,
              tabBarAccessibilityLabel: newBadge ? 'You, new badge' : 'You',
            }}
          />
        </Tabs>
      </TabSpaceContext.Provider>
    </TabHeightContext.Provider>
  );
}
