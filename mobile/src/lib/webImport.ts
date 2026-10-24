/**
 * Bring your website progress into the app (mobile 1.42): the phone-side glue
 * for engine/webImport.ts.
 *
 * Plain English for the founder:
 * - Settings → Your data → "Restore from a backup" (and the welcome screen)
 *   now also accept the file the KaiSip website exports ("kaisip-web-progress.json").
 * - `checkWebText` reads it (changes nothing) and works out, per profile in
 *   the file, what would be ADDED to this phone. The screen shows that and asks.
 * - `importWebProgress` merges it in: never replacing or deleting the phone's
 *   own progress. It keeps a 7-day "Undo restore" copy first, and writes in
 *   ONE storage write (lib/backup.ts writeSynced, the path sync uses), so a
 *   failed write changes nothing. Anything the learner does meanwhile is
 *   merged too, never dropped.
 */
import { CERTIFICATIONS, DEFAULT_CERT_ID } from '../content/certifications';
import { BackupError, fitForBackup, MAX_BACKUP_BYTES, utf8Bytes, type BackupProgress } from '../engine/backup';
import {
  isWebExport,
  mergeWebProgress,
  profileIsEmpty,
  readWebExport,
  WEB_MARKER,
  WEB_MAX_BYTES,
  webAddSummary,
  WebImportError,
  type WebAddSummary,
  type WebImportErrorCode,
  type WebProfile,
} from '../engine/webImport';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { checkBackupText, currentBackup, knownIds, phoneStores, pickFileText, writeSynced, type PickOutcome } from './backup';
import { refreshReminders } from './reminderSync';

/** The website teaches CISA only, so its progress goes to CISA. */
export const WEB_CERT_ID = DEFAULT_CERT_ID;

/** A website file, read and ready to ask about. */
export interface WebReady {
  kind: 'web';
  /** Its profiles (usually one). Profiles with nothing to add are still listed, so the learner sees why. */
  profiles: WebProfile[];
  /** What each profile would add to this phone, in the same order. */
  summaries: WebAddSummary[];
  /** A quiz is paused on this phone (an import keeps it). */
  pausedSession: boolean;
}

/** The ids this app has, for the engine (questions, study notes, domains). */
function known() {
  const k = knownIds(WEB_CERT_ID);
  return { question: (id: string) => k.questions.has(id), note: (id: string) => k.notes.has(id), domain: (id: string) => Boolean(k.domains?.has(id)) };
}

/** The phone's progress, fitted for backup (the shape the merge checks). */
function fittedPhone(progress: unknown, settings: unknown): BackupProgress {
  return fitForBackup({ settings, progress }).progress as BackupProgress;
}

/** Read a website export's text. Never changes anything. */
export function checkWebText(text: string): WebReady | { kind: 'web-error'; code: WebImportErrorCode } {
  try {
    const profiles = readWebExport(text, known());
    if (profiles.every(profileIsEmpty)) return { kind: 'web-error', code: 'empty' };
    const phone = phoneStores();
    const fitted = fittedPhone(phone.progress, phone.settings);
    const active = useSession.getState().active;
    return {
      kind: 'web',
      profiles,
      summaries: profiles.map((p) => webAddSummary(fitted, p, WEB_CERT_ID)),
      pausedSession: Boolean(active && !active.finishedAt),
    };
  } catch (e) {
    return { kind: 'web-error', code: e instanceof WebImportError ? e.code : 'bad-data' };
  }
}

/** Anything "Restore from a backup" can pick: an app backup, a website export, or why it can't be used. */
export type AnyPick = PickOutcome | WebReady | { kind: 'web-error'; code: WebImportErrorCode };

/**
 * Read any picked file's text: a website export goes to checkWebText, anything
 * else is an app backup (checkBackupText, with its own 1 MB cap). Never changes anything.
 */
export function checkAnyText(text: string): AnyPick {
  // Only a file that mentions the website's marker is parsed here (an app backup is parsed once, by its own reader).
  if (text.includes(`"${WEB_MARKER}"`)) {
    let raw: unknown;
    try {
      raw = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
    } catch {
      raw = undefined;
    }
    if (isWebExport(raw)) return checkWebText(text);
  }
  if (utf8Bytes(text) > MAX_BACKUP_BYTES) return { kind: 'error', code: 'too-big' };
  return checkBackupText(text);
}

/** "Restore from a backup": pick a file (an app backup or a website export) and read it. */
export async function pickAnyBackup(): Promise<AnyPick> {
  const picked = await pickFileText(WEB_MAX_BYTES);
  return picked.kind === 'text' ? checkAnyText(picked.text) : picked;
}

export type WebImportOutcome =
  | { kind: 'ok' }
  /** The phone's own data couldn't be copied for Undo, so nothing was changed. */
  | { kind: 'no-snapshot' }
  /** The merged progress would be too large to save on this phone. Nothing was changed. */
  | { kind: 'too-big' }
  /** The write failed; the old data was put back. */
  | { kind: 'failed' };

/**
 * Merge one profile into the phone's progress. `onboard` (the welcome
 * screen): onboarding is finished too, so the learner lands on Today.
 */
export async function importWebProgress(profile: WebProfile, opts: { onboard?: boolean; now?: number } = {}): Promise<WebImportOutcome> {
  const now = opts.now ?? Date.now();
  const ctx = { now, knownCertIds: CERTIFICATIONS.map((c) => c.id) };
  // Undo first (like a restore): the phone's data as a backup file, checked to be restorable.
  const file = currentBackup(now);
  if (checkBackupText(JSON.stringify(file)).kind !== 'ok') return { kind: 'no-snapshot' };
  const merge = (live: ReturnType<typeof phoneStores>) => ({
    settings: live.settings as unknown as Record<string, unknown>,
    progress: mergeWebProgress(fittedPhone(live.progress, live.settings), profile, WEB_CERT_ID, ctx) as unknown as Record<string, unknown>,
  });
  let first: ReturnType<typeof merge>;
  try {
    first = merge(phoneStores());
  } catch (e) {
    return e instanceof BackupError && e.code === 'too-big' ? { kind: 'too-big' } : { kind: 'failed' };
  }
  try {
    // The sync write path: keeps today's plan and a paused quiz, writes the undo copy in the same
    // write, and merges in anything the learner did meanwhile (merging the same file again is safe).
    await writeSynced(first, { undo: { takenAt: now, file }, rebase: merge });
  } catch (e) {
    return e instanceof BackupError && e.code === 'too-big' ? { kind: 'too-big' } : { kind: 'failed' };
  }
  if (opts.onboard) useSettings.setState({ onboarded: true, activeCertId: WEB_CERT_ID });
  // The review queue may have grown: the next reminder names what is waiting.
  await refreshReminders().catch(() => {});
  return { kind: 'ok' };
}
