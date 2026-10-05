/**
 * Bottom tab bar: Home · Practice · Mock · Progress · Settings.
 * (The stack-panel UX review chose these five; quizzes open full-screen
 * on top, which hides the tab bar so learners stay focused.)
 */
import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { font } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

// Simple text glyphs keep us dependency-free; swap for an icon set later.
const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return (
      <Text style={{ color, fontSize: 20, lineHeight: 24 }} maxFontSizeMultiplier={1.3} accessibilityElementsHidden importantForAccessibility="no">
        {glyph}
      </Text>
    );
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
        tabBarAllowFontScaling: true,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('⌂') }} />
      <Tabs.Screen name="practice" options={{ title: 'Practice', tabBarIcon: icon('✎') }} />
      <Tabs.Screen name="mock" options={{ title: 'Mock', tabBarIcon: icon('⏱') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙') }} />
    </Tabs>
  );
}
