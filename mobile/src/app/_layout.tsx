/**
 * Root layout — runs once when the app opens.
 * 1. Keeps the splash screen up while fonts and saved progress load.
 *    Grove v2 uses two families (docs/mobile/DESIGN_SYSTEM.md §1):
 *    Fraunces 400 / 400 italic / 500 for reading moments and numbers,
 *    Figtree 400 / 500 / 600 for everything you tap or scan.
 * 2. Wraps every screen in a navigation "stack" (screens slide in/out).
 * 3. Mounts MotionRoot: Reduce Motion (the phone's, live, or Settings →
 *    Motion → Reduced) reaches every animation, Reanimated's included.
 * 4. Mounts ThemeFade: switching Light ⇄ Dark dissolves instead of flashing.
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
import { getCertification } from '../content/certifications';
import { pruneUndo } from '../lib/backup';
import { initCaseSeen } from '../lib/badges';
import { ensureBackfill, ensureCatalog, syncPlanters } from '../lib/milestones';
import { useProgress } from '../store/progress';
import { cancelReminders, initNotifications, scheduleReminders } from '../lib/reminders';
import { useSettings } from '../store/settings';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MotionRoot, ThemeFade, useMotion } from '../components/motion';
import { Grain } from '../components/ui';
import { motion } from '../theme/tokens';
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
  // Reduce Motion (the phone's setting, live, or Settings → Motion → Reduced):
  // screens dissolve instead of sliding or rising. Never a hard cut (Apple's
  // criteria ask for a dissolve for a change of place).
  const { reduced } = useMotion();
  const rise = reduced ? 'fade' : 'fade_from_bottom';
  // If a font fails to load we still start (system font fallback) rather than hang.
  const ready = (fontsLoaded || Boolean(fontError)) && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Once saved settings have loaded: if reminders are on, re-apply them;
  // if they are off, clear any of ours left behind (e.g. an older
  // version's untagged reminder). Never asks for permission.
  useEffect(() => {
    if (!hydrated) return;
    const { reminder, activeCertId } = useSettings.getState();
    if (reminder.enabled) scheduleReminders(reminder, getCertification(activeCertId)?.name ?? 'your exam').catch(() => {});
    else cancelReminders().catch(() => {});
    // An "Undo restore" snapshot older than 7 days is dropped once, at launch.
    pruneUndo();
  }, [hydrated]);

  // Build F: once per certification (an older save, a new cert, or a restore
  // from an older backup), find the milestones the saved data already shows.
  // They are saved quietly with ONE summary line, never a burst of moments.
  const activeCertId = useSettings((s) => s.activeCertId);
  const needsBackfill = useProgress((s) => !s.byCert[activeCertId]?.milestones?.backfill);
  useEffect(() => {
    if (hydrated && needsBackfill) ensureBackfill(activeCertId);
  }, [hydrated, needsBackfill, activeCertId]);
  // Mobile 1.10, after the back-fill: badges already held never show the
  // "new" dot; only ones earned from now on can. And a set completed before
  // planters existed saves its planter now (idempotent: nothing new, no write).
  // Mobile 1.11 first: badges filled in under the older catalogue earn what
  // their study already shows under this one (new tiers, Took Root), quietly, once.
  useEffect(() => {
    if (!hydrated) return;
    ensureCatalog(activeCertId);
    initCaseSeen(activeCertId);
    syncPlanters(activeCertId);
  }, [hydrated, activeCertId]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          // Undefined = the platform's default push animation.
          animation: reduced ? 'fade' : undefined,
          // iOS honours this for the dissolve; the platform pushes keep their own timing.
          animationDuration: motion.dur.screen,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        {/* No swipe-back inside a quiz: an accidental swipe must not lose an exam. */}
        <Stack.Screen name="session" options={{ gestureEnabled: false }} />
        {/* The quiz dissolves into its outcome: not a push to a new place. */}
        <Stack.Screen name="results" options={{ gestureEnabled: false, animation: 'fade' }} />
        {/* Mock start sheet: timing and "hide the clock", before every mock. */}
        <Stack.Screen name="mock-start" options={{ animation: rise }} />
        <Stack.Screen name="lesson/[id]" options={{ animation: rise }} />
        <Stack.Screen name="game/trap" options={{ animation: rise }} />
        <Stack.Screen name="game/sprint" options={{ animation: rise }} />
        <Stack.Screen name="game/priority" options={{ animation: rise }} />
        <Stack.Screen name="game/daylight" options={{ animation: rise }} />
        {/* Build E: two note- and principle-based games, and the Guided step. */}
        <Stack.Screen name="game/rumor" options={{ animation: rise }} />
        <Stack.Screen name="game/callit" options={{ animation: rise }} />
        {/* Build F: three content games. */}
        <Stack.Screen name="game/field" options={{ animation: rise }} />
        <Stack.Screen name="game/canopy" options={{ animation: rise }} />
        <Stack.Screen name="game/stones" options={{ animation: rise }} />
        <Stack.Screen name="guided" />
        {/* Build F: You → Milestones (mobile 1.10: Badges) and You → Field notes. */}
        <Stack.Screen name="milestones" />
        <Stack.Screen name="field-notes" />
        <Stack.Screen name="mistakes" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="caught-up" />
        <Stack.Screen name="bank/index" />
        <Stack.Screen name="bank/[domain]" />
        {/* Study notes: home (domains + search) → domain → subtopic. */}
        <Stack.Screen name="notes/index" />
        <Stack.Screen name="notes/[domain]" />
        <Stack.Screen name="notes/subtopic/[id]" />
        {/* Mobile 1.7: Help and feedback (You), common questions, Your reports, What's new and What's next. */}
        <Stack.Screen name="help" />
        <Stack.Screen name="faq" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="whats-new" />
        <Stack.Screen name="whats-next" />
      </Stack>
      <MotionRoot />
      {/* Light ⇄ Dark dissolves (mobile 1.9): a veil in the old paper fades out over the new theme. */}
      <ThemeFade isDark={isDark} bg={c.bg} />
      {/* Paper grain over every screen (touch-through, hidden from screen readers). */}
      <Grain />
    </SafeAreaProvider>
  );
}
