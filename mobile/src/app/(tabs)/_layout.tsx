/**
 * Bottom tabs: Today · Learn · Practice · Play · You.
 * (docs/mobile/PRODUCT_VISION.md §3, Grove v2 tab bar in DESIGN_SYSTEM.md §6).
 * Lessons, sessions and games open full-screen on top, which hides the tab
 * bar so learners stay focused.
 *
 * Active tab = green icon + ink label + a small dot under the label, so the
 * state isn't shown by colour alone. Today and You use custom glyphs
 * (sprout, growth rings); the others stay Lucide. Practice is a checklist,
 * not a target: a target's concentric circles looked like the You rings.
 */
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Gamepad2, ICON_STROKE, ListChecks, Rings, Sprout } from '../../components/icons';
import { ICON_SIZE, TAB_BAR_HEIGHT, TabLabel } from '../../components/ui';
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

export default function TabsLayout() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
      <Tabs.Screen name="home" options={{ title: 'Today', tabBarLabel: label('Today'), tabBarIcon: icon(Sprout) }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarLabel: label('Learn'), tabBarIcon: icon(BookOpen as Glyph) }} />
      <Tabs.Screen name="practice" options={{ title: 'Practice', tabBarLabel: label('Practice'), tabBarIcon: icon(ListChecks as Glyph) }} />
      <Tabs.Screen name="play" options={{ title: 'Play', tabBarLabel: label('Play'), tabBarIcon: icon(Gamepad2 as Glyph) }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarLabel: label('You'), tabBarIcon: icon(Rings) }} />
    </Tabs>
  );
}
