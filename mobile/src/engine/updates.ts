/**
 * Check for updates (mobile 1.19): the states and words behind Settings →
 * Help and about → "Check for updates", and the "Update … · …" stamp under
 * the version line.
 *
 * Pure: no React, no expo-updates. lib/updates.ts talks to the phone and
 * feeds the results in here; this file only decides what each result MEANS
 * and what the row says. Tested in src/__tests__/updates-engine.test.ts.
 *
 * One tap is one check. The phases, in order:
 *
 *   idle ─► checking ─► downloading ─► ready ─(Restart to update)─► the app reloads
 *                    └► current                                  └► restart-failed
 *                    └► check-failed      └► download-failed
 *
 * Wording is honest: it says what happened, never what will happen. A
 * failure never shows the raw error; it says "You may be offline".
 */

export type UpdatePhase = 'idle' | 'checking' | 'downloading' | 'ready' | 'current' | 'check-failed' | 'download-failed' | 'restart-failed';

/** What the row shows: `state` on the right ("Checking…"), `note` under the title (why, or what to do). */
export interface UpdateWords {
  state?: string;
  note?: string;
}

export const UPDATE_WORDS: Record<UpdatePhase, UpdateWords> = {
  idle: { note: 'Small updates usually arrive on their own when the app opens. Tap to look now.' },
  checking: { state: 'Checking…' },
  downloading: { state: 'Downloading…' },
  ready: { state: 'Ready to restart', note: 'The update is downloaded. Tap Restart to update below; your progress stays as it is.' },
  current: { state: 'Up to date', note: 'This is the latest version.' },
  'check-failed': { state: 'Couldn’t check', note: 'You may be offline. Try again later.' },
  'download-failed': { state: 'Couldn’t download', note: 'You may be offline. Try again later.' },
  'restart-failed': { state: 'Couldn’t restart', note: 'Close the app fully and open it again to finish the update.' },
};

/** The one sentence a screen reader says when the phase changes ("" for idle: nothing happened yet). */
export function spokenUpdate(phase: UpdatePhase): string {
  const w = UPDATE_WORDS[phase];
  // No state (idle) = nothing has changed, so nothing to announce.
  if (!w.state) return '';
  return [w.state, w.note].filter(Boolean).join('. ');
}

/** True while a check or download is running: the row is disabled, nothing else may start. */
export const updateBusy = (phase: UpdatePhase): boolean => phase === 'checking' || phase === 'downloading';

/**
 * True when tapping the row again would not help: the update is downloaded
 * (ready, or the restart failed), so only "Restart to update" (or a cold
 * start) finishes it. A re-check now would say "Up to date" while the old
 * code is still running, which would be misleading.
 */
export const updateDownloaded = (phase: UpdatePhase): boolean => phase === 'ready' || phase === 'restart-failed';

/** The shape of expo-updates' check result that matters here. */
export interface CheckOutcome {
  isAvailable: boolean;
  /** The server asked for a roll back to the version built into the app: also something to download. */
  isRollBackToEmbedded: boolean;
}
/** The shape of expo-updates' download result that matters here. */
export interface FetchOutcome {
  isNew: boolean;
  isRollBackToEmbedded: boolean;
}

/** After a successful check: download (an update or a roll back is waiting) or stop (nothing new). */
export function phaseAfterCheck(r: CheckOutcome): 'downloading' | 'current' {
  return r.isAvailable || r.isRollBackToEmbedded ? 'downloading' : 'current';
}

/** After a successful download: ready to restart, or nothing new after all. */
export function phaseAfterFetch(r: FetchOutcome): 'ready' | 'current' {
  return r.isNew || r.isRollBackToEmbedded ? 'ready' : 'current';
}

/** How many characters of each id the stamp shows: enough to tell updates apart, short enough to read aloud. */
export const UPDATE_ID_CHARS = 8;
export const RUNTIME_CHARS = 7;

/**
 * "Update 1a2b3c4d · 5e26d4b": which update this phone runs (first 8 of
 * its id, or "built-in" when it runs the code shipped inside the APK) and
 * the first 7 of the runtime (the native fingerprint). No personal data:
 * both ids are the same on every phone with the same update.
 */
export function updateStamp(updateId: string | null | undefined, runtimeVersion: string | null | undefined, embedded: boolean): string {
  const id = embedded || !updateId ? 'built-in' : updateId.slice(0, UPDATE_ID_CHARS);
  const runtime = runtimeVersion ? ` · ${runtimeVersion.slice(0, RUNTIME_CHARS)}` : '';
  return `Update ${id}${runtime}`;
}
