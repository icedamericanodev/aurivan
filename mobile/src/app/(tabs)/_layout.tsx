/**
 * Bottom tabs: Journey · Learn · Practice · Play · You.
 * (docs/mobile/PRODUCT_VISION.md §3). Lessons, sessions and games open
 * full-screen on top, which hides the tab bar so learners stay focused.
 */
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { BookOpen, Compass, Gamepad2, ICON_STROKE, Target, UserRound } from '../../components/icons';
import { font } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type IconProps = { color: ColorValue; size: number };
const icon = (Glyph: typeof Compass) =>
  function TabIcon({ color }: IconProps) {
    return <Glyph size={24} color={color as string} strokeWidth={ICON_STROKE} />;
  };

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accentText,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14 },
      }}
    >
      {/* route stays "home" so existing links keep working; the tab reads "Journey" */}
      <Tabs.Screen name="home" options={{ title: 'Journey', tabBarIcon: icon(Compass) }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarIcon: icon(BookOpen) }} />
      <Tabs.Screen name="practice" options={{ title: 'Practice', tabBarIcon: icon(Target) }} />
      <Tabs.Screen name="play" options={{ title: 'Play', tabBarIcon: icon(Gamepad2) }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: icon(UserRound) }} />
    </Tabs>
  );
}
