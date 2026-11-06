/**
 * Outside links before onboarding, on a cold start (release bug hunt round 3).
 *
 * Plain English for the founder: a link from outside the app (kaisip://settings, kaisip://home…) must
 * never skip onboarding. app/+native-intent.tsx sends such a link to "/" when it can see the learner
 * has not finished onboarding. On a cold start it can't see yet (saved settings are still loading), so
 * it notes the link here, and once the settings and the router are ready this gate sends a learner who
 * has not onboarded to "/" (app/index.tsx then opens onboarding). Only outside links set the note, so
 * moving around inside onboarding is never touched.
 */
import { router, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { useSettings } from '../store/settings';
import { outsideLinkPending, takeOutsideLink } from './outsideLinkNote';

/** Send to "/" once the router takes it (in Expo SDK 58 it may not be ready in the first frames). */
function toStart(triesLeft = 20): void {
  try {
    router.replace('/');
  } catch {
    if (triesLeft > 0) setTimeout(() => toStart(triesLeft - 1), 100);
  }
}

/**
 * Drawn once in the root layout, after saved data has loaded (`ready`). Draws nothing. A small
 * component of its own: the root navigation state it reads changes on every move, and only this
 * re-renders for it.
 */
export function OutsideLinkGate({ ready }: { ready: boolean }) {
  const navReady = Boolean(useRootNavigationState()?.key);
  useEffect(() => {
    if (!ready || !navReady || !outsideLinkPending()) return;
    takeOutsideLink();
    if (useSettings.getState().onboarded) return;
    // After this draw, like LandOnToday: the router acts on the next turn.
    setTimeout(() => toStart(), 0);
  }, [ready, navReady]);
  return null;
}
