/**
 * Root layout — runs once when the app opens.
 * 1. Keeps the splash screen up while fonts and saved progress load.
 *    Grove v2 uses two families (docs/mobile/DESIGN_SYSTEM.md §1):
 *    Fraunces 400 / 400 italic / 500 for reading moments and numbers,
 *    Figtree 400 / 500 / 600 for everything you tap or scan.
 * 2. Wraps every screen in a navigation "stack" (screens slide in/out).
 */
// Per-weight imports so only these six font files are bundled.
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces/400Regular';
import { Fraunces_400Regular_Italic } from '@expo-google-fonts/fraunces/400Regular_Italic';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initNotifications } from '../lib/reminders';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Grain } from '../components/ui';
import { useHydrated } from '../store/useHydrated';
import { useTheme } from '../theme/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Show study reminders even if the app is open (no-op where unsupported).
initNotifications();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
  });
  const hydrated = useHydrated();
  const { c, isDark } = useTheme();
  // Reduce Motion (system setting): screens appear without sliding or rising.
  const reduceMotion = useReducedMotion();
  const rise = reduceMotion ? 'none' : 'fade_from_bottom';
  // If a font fails to load we still start (system font fallback) rather than hang.
  const ready = (fontsLoaded || Boolean(fontError)) && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          // Undefined = the platform's default push animation.
          animation: reduceMotion ? 'none' : undefined,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        {/* No swipe-back inside a quiz: an accidental swipe must not lose an exam. */}
        <Stack.Screen name="session" options={{ gestureEnabled: false }} />
        <Stack.Screen name="results" options={{ gestureEnabled: false }} />
        <Stack.Screen name="lesson/[id]" options={{ animation: rise }} />
        <Stack.Screen name="game/trap" options={{ animation: rise }} />
        <Stack.Screen name="game/sprint" options={{ animation: rise }} />
        <Stack.Screen name="game/priority" options={{ animation: rise }} />
        <Stack.Screen name="mistakes" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="caught-up" />
        <Stack.Screen name="bank/index" />
        <Stack.Screen name="bank/[domain]" />
      </Stack>
      {/* Paper grain over every screen (touch-through, hidden from screen readers). */}
      <Grain />
    </SafeAreaProvider>
  );
}
