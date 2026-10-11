/**
 * Saved data loads from the phone asynchronously. This hook returns true
 * once ALL stores have finished loading, so the app never flashes the
 * onboarding screen at someone who already finished it.
 */
import { useEffect, useState } from 'react';
import { useBackup } from './backup';
import { useProgress } from './progress';
import { useSeen } from './seen';
import { useSession } from './session';
import { useSettings } from './settings';

// useBackup too: the undo snapshot must be loaded before anything can restore.
// useSeen (mobile 1.9): numbers grow from what was last shown, so it loads first too.
const stores = [useSettings, useProgress, useSession, useBackup, useSeen];

export function useHydrated(): boolean {
  const [ready, setReady] = useState(() => stores.every((s) => s.persist.hasHydrated()));
  useEffect(() => {
    if (ready) return;
    const check = () => {
      if (stores.every((s) => s.persist.hasHydrated())) setReady(true);
    };
    const unsubs = stores.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => unsubs.forEach((u) => u());
  }, [ready]);
  return ready;
}
