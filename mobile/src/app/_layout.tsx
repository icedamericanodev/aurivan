/**
 * Root layout — runs once when the app opens.
 * 1. Keeps the splash screen up while fonts and saved progress load.
 *    One family (Plus Jakarta Sans) in three weights: 400, 600, 700.
 * 2. Wraps every screen in a navigation "stack" (screens slide in/out).
 */
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initNotifications } from '../lib/reminders';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useHydrated } from '../store/useHydrated';
import { useTheme } from '../theme/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Show study reminders even if the app is open (no-op where unsupported).
initNotifications();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const hydrated = useHydrated();
  const { c, isDark } = useTheme();
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
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        {/* No swipe-back inside a quiz: an accidental swipe must not lose an exam. */}
        <Stack.Screen name="session" options={{ gestureEnabled: false }} />
        <Stack.Screen name="results" options={{ gestureEnabled: false }} />
        <Stack.Screen name="lesson/[id]" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="game/trap" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="game/sprint" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="game/priority" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="mistakes" />
        <Stack.Screen name="settings" />
      </Stack>
    </SafeAreaProvider>
  );
}
