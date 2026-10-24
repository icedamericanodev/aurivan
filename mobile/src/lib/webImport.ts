/**
 * Bring your website progress into the app (mobile 1.42): the phone-side glue
 * for engine/webImport.ts.
 *
 * Plain English for the founder:
 * - Settings → Your data → "Restore from a backup" (and the welcome screen)
 *   now also accept the file the KaiSip website exports ("kaisip-web-progress.json").
 * - `checkWebParsed` reads it (changes nothing) and works out, per profile in
 *   the file, what would truly be ADDED to this phone, by merging on a copy
 *   and comparing. The screen shows that and asks.
 * - `importWebProgress` merges it in: never replacing or deleting the phone's
 *   own progress. It keeps a 7-day "Undo" copy first (or keeps the earlier
 *   one when a restore or import already left one), and writes in ONE storage
 *   write (lib/backup.ts writeSynced, the path sync uses), so a failed write
 *   changes nothing. Anything the learner does meanwhile is merged too.
 * - From the welcome screen it does NOT finish onboarding: the learner still
 *   sets a starting point, exam date and daily time afterwards.
 */
import { CERTIFICATIONS, DEFAULT_CERT_ID } from '../content/certifications';
import { BackupError, fitForBackup, MAX_BACKUP_BYTES, undoAvailable, utf8Bytes, type BackupProgress, type UndoSnapshot } from '../engine/backup';
import {
  isWebExport,
  mergeWebProgress,
  parseWebText,
  profileIsEmpty,
  readWebExport,
  tooBigSummary,
  WEB_MARKER,
  WEB_MAX_BYTES,
  webAddSummary,
  WebImportError,
  type WebAddSummary,
  type WebImportErrorCode,
  type WebProfile,
} from '../engine/webImport';
import { useBackup } from '../store/backup';
import { useSession } from '../store/session';
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

const mergeCtx = (now: number) => ({ now, knownCertIds: CERTIFICATIONS.map((c) => c.id) });

/** Read a parsed website export (parsed ONCE, by checkAnyText). Never changes anything. */
export function checkWebParsed(raw: unknown, now = Date.now()): WebReady | { kind: 'web-error'; code: WebImportErrorCode } {
  try {
    const profiles = readWebExport(raw, known(), now);
    if (profiles.every(profileIsEmpty)) return { kind: 'web-error', code: 'empty' };
    const phone = phoneStores();
    const fitted = fittedPhone(phone.progress, phone.settings);
    const active = useSession.getState().active;
    // What each profile truly adds: merged on a copy and compared (nothing is written).
    const summaries = profiles.map((p) => {
      try {
        return webAddSummary(fitted, mergeWebProgress(fitted, p, WEB_CERT_ID, mergeCtx(now)), p, WEB_CERT_ID, now);
      } catch (e) {
        if (e instanceof BackupError && e.code === 'too-big') return tooBigSummary(p);
        throw e;
      }
    });
    return { kind: 'web', profiles, summaries, pausedSession: Boolean(active && !active.finishedAt) };
  } catch (e) {
    return { kind: 'web-error', code: e instanceof WebImportError ? e.code : 'bad-data' };
  }
}

/** Anything "Restore from a backup" can pick: an app backup, a website export, or why it can't be used. */
export type AnyPick = PickOutcome | WebReady | { kind: 'web-error'; code: WebImportErrorCode };

/**
 * Read any picked file's text: a website export goes to checkWebParsed,
 * anything else is an app backup (checkBackupText, with its own 1 MB cap).
 * The size is checked before any parse, and a website file is parsed once.
 * Never changes anything.
 */
export function checkAnyText(text: string, now = Date.now()): AnyPick {
  // Only a file that mentions the website's marker is parsed here (an app backup is read by its own reader).
  if (text.includes(`"${WEB_MARKER}"`)) {
    let raw: unknown;
    try {
      raw = parseWebText(text);
    } catch (e) {
      if (e instanceof WebImportError && e.code === 'too-big') return { kind: 'web-error', code: 'too-big' };
      raw = undefined;
    }
    if (isWebExport(raw)) return checkWebParsed(raw, now);
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
  /** `undoFrom`: the moment Undo goes back to (this import's copy, or an earlier one still kept). */
  | { kind: 'ok'; undoFrom: number; earlierUndo: boolean }
  /** The phone's own data couldn't be copied for Undo, so nothing was changed. */
  | { kind: 'no-snapshot' }
  /** The merged progress would be too large to save on this phone. Nothing was changed. */
  | { kind: 'too-big' }
  /** The write failed; the old data was put back. */
  | { kind: 'failed' };

/** Merge one profile into the phone's progress. */
export async function importWebProgress(profile: WebProfile, opts: { now?: number } = {}): Promise<WebImportOutcome> {
  const now = opts.now ?? Date.now();
  const ctx = mergeCtx(now);
  // Undo (review 1.42 L3): an earlier copy still inside its 7 days (a restore, or an earlier import)
  // is KEPT, so Undo still goes back to before the first change. Otherwise this import takes its own.
  const existing = useBackup.getState().undo;
  const keepEarlier = undoAvailable(existing, now);
  let undo: UndoSnapshot | undefined;
  if (!keepEarlier) {
    const file = currentBackup(now);
    if (checkBackupText(JSON.stringify(file)).kind !== 'ok') return { kind: 'no-snapshot' };
    undo = { takenAt: now, file, kind: 'import' };
  }
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
    // write (or leaves the slot alone), and merges in anything the learner did meanwhile.
    await writeSynced(first, { ...(undo ? { undo } : {}), rebase: merge });
  } catch (e) {
    return e instanceof BackupError && e.code === 'too-big' ? { kind: 'too-big' } : { kind: 'failed' };
  }
  // The review queue may have grown: the next reminder names what is waiting.
  await refreshReminders().catch(() => {});
  return { kind: 'ok', undoFrom: keepEarlier && existing ? existing.takenAt : now, earlierUndo: keepEarlier };
}
