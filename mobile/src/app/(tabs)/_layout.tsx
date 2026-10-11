/**
 * Bottom tabs: Today · Learn · Practice · Play · You.
 * (docs/mobile/PRODUCT_VISION.md §3, Grove v2 tab bar in DESIGN_SYSTEM.md §6).
 * Lessons, sessions and games open full-screen on top, which hides the tab
 * bar so learners stay focused.
 *
 * Active tab = green icon + ink label + a small dot under the label, so the
 * state isn't shown by colour alone. Switching tabs is a short fade-through
 * (240 ms, mobile 1.8): the old tab fades out in the first half and the new
 * one fades in during the second, so two screens never show at once. Tabs
 * are peers, so nothing slides; under Reduce Motion the switch is instant.
 * The dot pops in under the new tab. Today and You use custom glyphs
 * (sprout, growth rings); the others stay Lucide. Practice is a checklist,
 * not a target: a target's concentric circles looked like the You rings.
 */
import { Tabs } from 'expo-router';
import { PlatformPressable } from 'expo-router/react-navigation';
import { Easing, type Animated, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Gamepad2, ICON_STROKE, ListChecks, Rings, Sprout } from '../../components/icons';
import { useMotion } from '../../components/motion';
import { ICON_SIZE, TAB_BAR_HEIGHT, TabLabel } from '../../components/ui';
import { motion } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type IconProps = { color: ColorValue; size: number };
type Glyph = (p: { size?: number; color: string; strokeWidth?: number }) => React.ReactNode;
const icon = (G: Glyph) =>
  function TabIcon({ color }: IconProps) {
    return <G size={ICON_SIZE.bar} color={color as string} strokeWidth={ICON_STROKE} />;
  };
const label = (text: string) =>
  function Label({ focused }: { focused: boolean }) {
    return <TabLabel label={text} focused={focused} />;
  };

/**
 * The tab button itself carries the iOS Large Content Viewer: with very
 * large text, long-pressing a tab shows its name enlarged. It has to be on
 * the pressable (the element that gets the touch), not the inner label.
 */
type TabButtonProps = React.ComponentProps<typeof PlatformPressable>;
const tabButton = (text: string) =>
  function TabButton(props: TabButtonProps) {
    return <PlatformPressable {...props} accessibilityShowsLargeContentViewer accessibilityLargeContentTitle={text} />;
  };

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
  const { c } = useTheme();
  const { reduced } = useMotion();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: reduced ? 'none' : 'fade',
        sceneStyleInterpolator: reduced ? undefined : fadeThrough,
        transitionSpec: { animation: 'timing', config: { duration: motion.dur.enter, easing: TAB_EASE } },
        // The tint colours the ICON; TabLabel colours its own text (ink / muted).
        tabBarActiveTintColor: c.accentText,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.bg,
          borderTopColor: c.line,
          borderTopWidth: 1,
          height: TAB_BAR_HEIGHT + insets.bottom,
        },
        // Icon (28) + label (14) + dot (5) fit the 56pt bar with 3pt padding.
        tabBarItemStyle: { paddingVertical: 3 },
      }}
    >
      {/* Route stays "home" so existing links keep working; the tab reads "Today". */}
      <Tabs.Screen name="home" options={{ title: 'Today', tabBarLabel: label('Today'), tabBarButton: tabButton('Today'), tabBarIcon: icon(Sprout) }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarLabel: label('Learn'), tabBarButton: tabButton('Learn'), tabBarIcon: icon(BookOpen as Glyph) }} />
      <Tabs.Screen name="practice" options={{ title: 'Practice', tabBarLabel: label('Practice'), tabBarButton: tabButton('Practice'), tabBarIcon: icon(ListChecks as Glyph) }} />
      <Tabs.Screen name="play" options={{ title: 'Play', tabBarLabel: label('Play'), tabBarButton: tabButton('Play'), tabBarIcon: icon(Gamepad2 as Glyph) }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarLabel: label('You'), tabBarButton: tabButton('You'), tabBarIcon: icon(Rings) }} />
    </Tabs>
  );
}
