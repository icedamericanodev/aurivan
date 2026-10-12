/**
 * The cloud route group (Uplift Phases 6–8, built OFF; spec §1.1 "Routes").
 * Every account (and later board) screen lives under `(cloud)`.
 *
 * With the flag off, or in a cloud build without a backend, this layout is
 * just a Redirect to Today: a deep link such as aurivan://account or
 * aurivan://account/delete lands on Today, and no cloud code runs (guard G5).
 *
 * Inside, a stack of its own, with the root stack's motion: a push, or a
 * dissolve under Reduce Motion (Settings → Motion or the phone's setting).
 */
import { Redirect, Stack } from 'expo-router';
import { useMotion } from '../../components/motion';
import { cloudReady } from '../../lib/account';
import { motion } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function CloudLayout() {
  const { c } = useTheme();
  const { reduced } = useMotion();
  if (!cloudReady()) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg },
        animation: reduced ? 'fade' : undefined,
        animationDuration: motion.dur.screen,
      }}
    >
      <Stack.Screen name="account/index" />
      {/* The sign-in sheet rises like the other sheets-as-screens (mock start, plant pick). */}
      <Stack.Screen name="account/sign-in" options={{ animation: reduced ? 'fade' : 'fade_from_bottom' }} />
      <Stack.Screen name="account/email" />
      <Stack.Screen name="account/delete" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
