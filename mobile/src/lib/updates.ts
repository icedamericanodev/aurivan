/**
 * Check for updates (mobile 1.19): the glue between expo-updates and the
 * Settings row. engine/updates.ts decides what each result means; this file
 * calls the phone.
 *
 * How updates reach a phone today (app.json → updates): `checkAutomatically:
 * ON_LOAD` makes expo-updates look for a new update ONCE, when the app
 * process starts (a cold start: after a force-stop, a reboot, or Android
 * killing the app in the background). Coming back from the recent-apps list
 * is a warm start and checks nothing. `fallbackToCacheTimeout: 0` means the
 * app never waits for that check: it opens the code it already has, and a
 * downloaded update is used on the NEXT cold start. So a phone opened from
 * recents for days can stay one or two versions behind. This row is the
 * manual way: check now, download, and restart to apply at once.
 *
 * Where it works: only where expo-updates is enabled (an installed APK or
 * store build). It is hidden in Expo Go and development builds
 * (`Updates.isEnabled` is false, and the calls would reject) and on the web
 * (no native app to update). One tap is one check: nothing runs on its own,
 * nothing polls, and a second tap while busy does nothing.
 *
 * Tests stub `UpdatesClient`; the web screenshot build can run a demo client
 * (never a phone: see `demoClient`).
 */
import * as Updates from 'expo-updates';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { phaseAfterCheck, phaseAfterFetch, spokenUpdate, updateBusy, updateDownloaded, updateStamp, type CheckOutcome, type FetchOutcome, type UpdatePhase } from '../engine/updates';
import { sayLater } from './a11y';

/** The three expo-updates calls this feature uses, so tests and the screenshot build can stand them in. */
export interface UpdatesClient {
  check(): Promise<CheckOutcome>;
  fetch(): Promise<FetchOutcome>;
  reload(): Promise<void>;
}

/** The real phone. */
export const phoneClient: UpdatesClient = {
  check: () => Updates.checkForUpdateAsync(),
  fetch: () => Updates.fetchUpdateAsync(),
  reload: () => Updates.reloadAsync(),
};

// ── Web screenshots only ──────────────────────────────────────────────
/**
 * SHOTS=settings (scripts/screenshots/run.sh) exports the web build with
 * EXPO_PUBLIC_AURIVAN_SHOTS=1, and the Playwright script sets
 * `window.__AURIVAN_UPDATE_DEMO__` to the outcome it wants to photograph.
 * Both conditions are build-time or web-only, so a phone never runs this:
 * on a store build the env value is a literal and this branch is removed,
 * and Platform.OS is never 'web' on a phone.
 */
type DemoMode = 'available' | 'current' | 'offline' | 'restart-fails';
const DEMO_STEP_MS = 1500;
const demoMode = (): DemoMode | null => {
  if (!(process.env.EXPO_PUBLIC_AURIVAN_SHOTS === '1' && Platform.OS === 'web')) return null;
  return (globalThis as { __AURIVAN_UPDATE_DEMO__?: DemoMode }).__AURIVAN_UPDATE_DEMO__ ?? null;
};
function demoClient(mode: DemoMode): UpdatesClient {
  const pause = () => new Promise<void>((r) => setTimeout(r, DEMO_STEP_MS));
  return {
    check: async () => {
      await pause();
      if (mode === 'offline') throw new Error('demo: offline');
      return { isAvailable: mode !== 'current', isRollBackToEmbedded: false };
    },
    fetch: async () => {
      await pause();
      return { isNew: true, isRollBackToEmbedded: false };
    },
    reload: async () => {
      await pause();
      if (mode === 'restart-fails') throw new Error('demo: restart failed');
    },
  };
}

/** True where the row and the "Update … · …" line make sense: an installed app with updates enabled, never the web. */
export function updatesAvailable(): boolean {
  if (demoMode()) return true;
  return Platform.OS !== 'web' && Updates.isEnabled;
}

/** "Update 1a2b3c4d · 5e26d4b" for the running app (engine/updates.ts updateStamp). */
export function runningUpdateLine(): string {
  if (demoMode()) return updateStamp('1a2b3c4d-demo', '5e26d4b961113941199b725cff5ff30a66bf0ac1', false);
  return updateStamp(Updates.updateId, Updates.runtimeVersion, Updates.isEmbeddedLaunch);
}

/**
 * One check: ask the server, and if something is waiting, download it.
 * Reports each phase as it happens, and resolves with the final one. Any
 * error ends in a "-failed" phase; the error itself is never shown.
 */
export async function checkAndDownload(client: UpdatesClient, onPhase: (p: UpdatePhase) => void): Promise<UpdatePhase> {
  const step = (p: UpdatePhase) => {
    onPhase(p);
    return p;
  };
  step('checking');
  let after: 'downloading' | 'current';
  try {
    after = phaseAfterCheck(await client.check());
  } catch {
    return step('check-failed');
  }
  if (after === 'current') return step('current');
  step('downloading');
  try {
    return step(phaseAfterFetch(await client.fetch()));
  } catch {
    return step('download-failed');
  }
}

/** "Restart to update": reload into the downloaded update. Resolving means the reload is on its way; a rejection is reported. */
export async function restartToUpdate(client: UpdatesClient, onPhase: (p: UpdatePhase) => void): Promise<void> {
  try {
    await client.reload();
  } catch {
    onPhase('restart-failed');
  }
}

/**
 * The row's state for one Settings visit. `check` and `restart` ignore a
 * tap while something is already running (one tap = one check), and do
 * nothing at all where updates are unavailable. Each new phase is said to
 * screen readers once, a moment after it shows.
 */
export function useUpdateCheck(client?: UpdatesClient) {
  const [phase, setPhase] = useState<UpdatePhase>('idle');
  // A ref, not state: a second tap in the same frame must see the first one.
  const running = useRef(false);
  const available = updatesAvailable();
  const show = (p: UpdatePhase) => {
    setPhase(p);
    const words = spokenUpdate(p);
    if (words) sayLater(words, 600, { queue: true });
  };
  const resolveClient = (): UpdatesClient => {
    if (client) return client;
    const demo = demoMode();
    return demo ? demoClient(demo) : phoneClient;
  };
  /** Run one step (a check, or a restart) unless one is already running or updates are unavailable. */
  const once = async (run: (c: UpdatesClient) => Promise<unknown>) => {
    if (!available || running.current) return;
    running.current = true;
    try {
      await run(resolveClient());
    } finally {
      running.current = false;
    }
  };

  const check = () => once((c) => checkAndDownload(c, show));
  const restart = () => once((c) => restartToUpdate(c, show));

  return {
    /** Whether to show the row and the stamp at all. */
    available,
    phase,
    /** The row is disabled while busy, and once the update is downloaded (only Restart helps then). */
    rowDisabled: updateBusy(phase) || updateDownloaded(phase),
    /** Show "Restart to update". */
    canRestart: updateDownloaded(phase),
    check,
    restart,
  };
}
