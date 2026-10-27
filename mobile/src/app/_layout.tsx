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
 * 5. If saved data cannot be loaded (a read throws, or it takes over 8
 *    seconds), shows a branded recovery screen instead of waiting forever
 *    (store/useHydrated.ts, components/recovery.tsx); and exports an
 *    ErrorBoundary so a screen that crashes while drawing shows the same
 *    calm screen, not a blank one.
 * 6. Cloud builds only (Uplift Phases 6–7, built OFF): once saved data has
 *    loaded, lib/account.ts initAccount() checks the sign-in and follows it,
 *    then lib/sync.ts initSync() starts sync, and SyncRouteWatch tells sync
 *    when a quiz, lesson or game opens and ends. With the flag off (every
 *    build today) the effect returns at once and SyncRouteWatch isn't drawn.
 */
// Per-weight imports so only these six font files are bundled.
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces/400Regular';
import { Fraunces_400Regular_Italic } from '@expo-google-fonts/fraunces/400Regular_Italic';
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { CLOUD } from '../cloud/flag';
import { initAccount } from '../lib/account';
import { initSync, setRoute } from '../lib/sync';
import { pruneUndo } from '../lib/backup';
import { initCaseSeen } from '../lib/badges';
import { ensureBackfill, ensureCatalog, syncPlanters } from '../lib/milestones';
import { selectCert, useProgress } from '../store/progress';
import { cancelReminders, initNotifications } from '../lib/reminders';
import { refreshReminders } from '../lib/reminderSync';
import { useSettings } from '../store/settings';
import { hasContent } from '../content/loader';
import { useActiveCertId } from '../lib/activeCert';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MotionRoot, ThemeFade, useMotion } from '../components/motion';
import { Grain } from '../components/ui';
import { motion } from '../theme/tokens';
import { RecoveryScreen } from '../components/recovery';
import { sayLater } from '../lib/a11y';
import { useFontsSettled } from '../lib/fontGate';
import type { ErrorBoundaryProps } from 'expo-router';
import { useHydration } from '../store/useHydrated';
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
  // Fonts that never finish loading must not leave a blank screen: after a few seconds, use the system font.
  const fontsSettled = useFontsSettled(fontsLoaded, fontError);
  const { status, retry } = useHydration();
  const hydrated = status === 'ready';
  const { c, isDark } = useTheme();
  // Reduce Motion (the phone's setting, live, or Settings → Motion → Reduced):
  // screens dissolve instead of sliding or rising. Never a hard cut (Apple's
  // criteria ask for a dissolve for a change of place).
  const { reduced } = useMotion();
  const rise = reduced ? 'fade' : 'fade_from_bottom';
  // If a font fails to load we still start (system font fallback) rather than hang.
  const ready = fontsSettled && hydrated;

  // Saved data failed to load (or took too long): never sit on the splash. Wait only for the fonts
  // (they fall back to the system font if they fail) so the recovery screen is branded.
  const recovering = status === 'failed' && fontsSettled;
  // Set by the recovery screen's "Try again" (see below).
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (ready || recovering) SplashScreen.hideAsync().catch(() => {});
  }, [ready, recovering]);

  // Once saved settings have loaded: if reminders are on, re-apply them;
  // if they are off, clear any of ours left behind (e.g. an older
  // version's untagged reminder). Never asks for permission.
  useEffect(() => {
    if (!hydrated) return;
    // refreshReminders (lib/reminderSync.ts): the one way to schedule, so "skip today once the plan is
    // cleared" and the "Your 20-minute plan" title always apply. It never throws.
    if (useSettings.getState().reminder.enabled) refreshReminders().catch(() => {});
    else cancelReminders().catch(() => {});
    // An "Undo restore" snapshot older than 7 days is dropped once, at launch.
    pruneUndo();
  }, [hydrated]);

  // Cloud builds only: the account's sign-in state, and the session refresh
  // only while the app is in front. Nothing runs with the flag off.
  useEffect(() => {
    if (!CLOUD || !hydrated) return;
    let live = true;
    let stop = () => {};
    // Sync starts only once the account check has loaded who is signed in (it reads that first).
    // initAccount and initSync never reject; the catch is a second line of defence (nothing unhandled at launch).
    initAccount()
      .then(async (a) => {
        const s = await initSync();
        const both = () => {
          a();
          s();
        };
        if (live) stop = both;
        else both();
      })
      .catch(() => {});
    return () => {
      live = false;
      stop();
    };
  }, [hydrated]);

  // Build F: once per certification (an older save, a new cert, or a restore
  // from an older backup), find the milestones the saved data already shows.
  // They are saved quietly with ONE summary line, never a burst of moments.
  // The exam being studied (lib/activeCert.ts): never one whose content isn't on this phone, so
  // these launch effects never write milestones for an exam this phone can't measure (MEDIUM-1).
  const activeCertId = useActiveCertId();
  const installed = hasContent(activeCertId);
  const needsBackfill = useProgress((s) => !selectCert(s, activeCertId).milestones?.backfill);
  useEffect(() => {
    if (hydrated && installed && needsBackfill) ensureBackfill(activeCertId);
  }, [hydrated, installed, needsBackfill, activeCertId]);
  // Mobile 1.10, after the back-fill: badges already held never show the
  // "new" dot; only ones earned from now on can. And a set completed before
  // planters existed saves its planter now (idempotent: nothing new, no write).
  // Mobile 1.11 first: badges filled in under the older catalogue earn what
  // their study already shows under this one (new tiers, Took Root), quietly, once.
  useEffect(() => {
    if (!hydrated || !installed) return;
    ensureCatalog(activeCertId);
    initCaseSeen(activeCertId);
    syncPlanters(activeCertId);
  }, [hydrated, installed, activeCertId]);

  // "Try again" puts the status back to 'loading' (the splash is already hidden): keep the recovery screen
  // up in a "Trying again…" state until it loads or fails again, never a blank page (UX review S9).
  const retryingNow = retrying && status === 'loading';
  if (recovering || retryingNow) {
    return (
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RecoveryScreen
          kind="load"
          retrying={retryingNow}
          onTryAgain={() => {
            setRetrying(true);
            sayLater('Trying again');
            retry();
          }}
        />
      </SafeAreaProvider>
    );
  }

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {CLOUD && <SyncRouteWatch />}
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
        {/* Mobile 1.46: a Settings door's own screen (Your data, Help and about). */}
        <Stack.Screen name="settings-section" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="caught-up" />
        <Stack.Screen name="bank/index" />
        <Stack.Screen name="bank/[domain]" />
        {/* Study notes: home (domains + search) → domain → subtopic. */}
        <Stack.Screen name="notes/index" />
        <Stack.Screen name="notes/[domain]" />
        <Stack.Screen name="notes/subtopic/[id]" />
        {/* Exam-mindset principles: the list by family → one principle (Learn, Mistake journal). */}
        <Stack.Screen name="principles/index" />
        <Stack.Screen name="principles/[id]" />
        {/* Mobile 1.7: Help and feedback (You), common questions, Your reports and What's new.
            (What's next was removed in 1.17.1; +native-intent sends old links to Help.) */}
        <Stack.Screen name="help" />
        <Stack.Screen name="faq" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="whats-new" />
        {/* Mobile 1.15: Your study, from Today's one "Fit your plan" card. */}
        <Stack.Screen name="fit" />
        {/* Mobile 1.16: the readiness report and the exam-week checklist. */}
        <Stack.Screen name="readiness" />
        <Stack.Screen name="exam-week" />
        {/* The exam guide (Learn, Help) and the final review week's cheat sheet (data/exam/). */}
        <Stack.Screen name="exam-guide" />
        <Stack.Screen name="cheat-sheet" />
        {/* Mobile 1.13: Your plant, and its picker (plant, change species, rename). */}
        <Stack.Screen name="plant" />
        <Stack.Screen name="plant-pick" options={{ animation: rise }} />
        <Stack.Screen name="plant-look" />
      </Stack>
      <MotionRoot />
      {/* Light ⇄ Dark dissolves (mobile 1.9): a veil in the old paper fades out over the new theme. */}
      <ThemeFade isDark={isDark} bg={c.bg} />
      {/* Paper grain over every screen (touch-through, hidden from screen readers). */}
      <Grain />
    </SafeAreaProvider>
  );
}

/**
 * Expo Router uses this export as the safety net for every screen: if one
 * crashes while drawing, the learner sees the branded recovery screen and
 * "Try again" draws it again (instead of a blank or red screen).
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <RecoveryScreen kind="crash" onTryAgain={() => void retry()} />;
}

/**
 * Cloud builds only: tells lib/sync.ts which screen is open, so a pull never
 * lands under an open quiz, lesson or game, and leaving one syncs. Draws nothing.
 */
function SyncRouteWatch() {
  const path = usePathname();
  useEffect(() => {
    setRoute(path);
  }, [path]);
  return null;
}
