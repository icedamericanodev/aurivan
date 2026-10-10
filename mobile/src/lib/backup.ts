/**
 * Backup and restore — the phone-side glue for engine/backup.ts.
 *
 * Save a backup: build the file from the progress and settings stores,
 * write it to the app's cache folder (expo-file-system), and open the system
 * share sheet (expo-sharing) so the learner keeps it in Files, Drive, email
 * or AirDrop. Nothing is uploaded by the app: no account, no server.
 *
 * Restore: the learner picks a file (expo-document-picker); engine/backup.ts
 * checks it and drops ids the app doesn't have; the screen shows what will
 * change and asks first. Then, in ONE storage write (AsyncStorage.multiSet):
 * the undo snapshot, the new settings and progress, and the end of any
 * paused session. Only after that write succeeds are the stores reloaded
 * from storage and success reported. Reminders are then put back the way
 * the backup has them.
 *
 * Works fully offline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import { lessonsFor } from '../content/lessons';
import { getAllQuestions } from '../content/loader';
import { noteSubtopics } from '../content/notes';
import {
  BackupError,
  backupFileName,
  buildBackup,
  isBehind,
  isFresh,
  MAX_BACKUP_BYTES,
  readBackup,
  summarize,
  undoAvailable,
  type BackupData,
  type BackupErrorCode,
  type BackupFile,
  type BackupProgress,
  type BackupSettings,
  type BackupSummary,
  type KnownIds,
  type UndoSnapshot,
} from '../engine/backup';
import { useBackup } from '../store/backup';
import { completeCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { cancelReminders, ensurePermission, remindersSupported, scheduleReminders } from './reminders';

// ── The data in each store (no actions) ──────────────────────────────────
const SETTINGS_KEYS = ['onboarded', 'activeCertId', 'examDates', 'theme', 'shuffleOptions', 'dailyGoal', 'reminder', 'haptics', 'gameRulesSeen', 'practiceTimer', 'paceOffer', 'studyMode', 'studyDomain', 'studySize'] as const;
const PROGRESS_KEYS = ['byCert', 'streak', 'today', 'days'] as const;

type SettingsData = Pick<ReturnType<typeof useSettings.getState>, (typeof SETTINGS_KEYS)[number]>;
type ProgressData = Pick<ReturnType<typeof useProgress.getState>, (typeof PROGRESS_KEYS)[number]>;
type CertData = ProgressData['byCert'][string];

function pick<S, K extends keyof S>(state: S, keys: readonly K[]): Pick<S, K> {
  const out = {} as Pick<S, K>;
  for (const k of keys) out[k] = state[k];
  return out;
}

const settingsData = (): SettingsData => pick(useSettings.getState(), SETTINGS_KEYS);
const progressData = (): ProgressData => pick(useProgress.getState(), PROGRESS_KEYS);

// Compile-time guards, both directions. If a store field changes type,
// `npm run typecheck` fails here until engine/backup.ts is updated to match.
// Store → backup: everything the stores hold is something the checker accepts.
const _settingsFits = (s: SettingsData): BackupSettings => s;
const _progressFits = (p: ProgressData): BackupProgress => p;
// Backup → store: everything the checker lets through has the store's types
// (fields may be missing; applyData fills them from the store defaults).
const _settingsBack = (s: BackupSettings): Partial<SettingsData> => s;
const _certBack = (c: BackupProgress['byCert'][string]): Partial<CertData> => c;
const _progressBack = (p: Omit<BackupProgress, 'byCert'>): Partial<Omit<ProgressData, 'byCert'>> => p;
void [_settingsFits, _progressFits, _settingsBack, _certBack, _progressBack];

const certName = (id: string) => getCertification(id)?.name ?? id;
/**
 * This app's version, or undefined when the build doesn't say (the web build
 * has no expoConfig version). Unknown means "don't compare": the "made by a
 * newer version" check must never refuse every file because of a missing value.
 */
const knownAppVersion = (): string | undefined => Constants.expoConfig?.version || undefined;
const appVersion = () => knownAppVersion() ?? 'unknown';

/**
 * The ids that exist in this app for a cert: questions, lessons and study
 * notes. Built once per cert (Sets), then reused for every check.
 */
const knownCache = new Map<string, KnownIds>();
export function knownIds(certId: string): KnownIds {
  let k = knownCache.get(certId);
  if (!k) {
    k = {
      questions: new Set(getAllQuestions(certId).map((q) => q.id)),
      lessons: new Set(lessonsFor(certId).map((l) => l.id)),
      notes: new Set(noteSubtopics(certId).map((n) => n.id)),
      domains: new Set((getCertification(certId)?.domains ?? []).map((d) => d.id)),
    };
    knownCache.set(certId, k);
  }
  return k;
}

/** The file for the learner's data right now. */
export function currentBackup(now = Date.now()): BackupFile {
  return buildBackup({ settings: settingsData(), progress: progressData() }, { now, appVersion: appVersion() });
}

/** The preview facts for the data on this phone now. */
export function currentSummary(): BackupSummary {
  return summarize({ settings: settingsData(), progress: progressData() }, certName);
}

/** The preview facts for a backup that was read. */
export function backupSummary(data: BackupData): BackupSummary {
  return summarize(data, certName);
}

// ── Old backup files in the cache ────────────────────────────────────────
const BACKUP_NAME = /^aurivan-backup-.*\.json$/;
/**
 * Delete backup files we wrote to the app's cache more than an hour ago.
 * (Not right after sharing: some share targets read the file a little later.)
 * Called when Your data opens and after a reset. Native only; never throws.
 */
export function sweepBackupFiles(now = Date.now()) {
  if (Platform.OS === 'web') return;
  try {
    for (const item of new Directory(Paths.cache).list()) {
      if (item instanceof File && BACKUP_NAME.test(item.name) && (item.lastModified ?? 0) < now - 3_600_000) item.delete();
    }
  } catch {
    // A cache we can't list is not the learner's problem.
  }
}

// ── Save a backup ────────────────────────────────────────────────────────
export type SaveOutcome = 'shared' | 'unavailable';

/**
 * Write the backup file and open the share sheet. Resolves once the sheet
 * closes. We can't see where the learner saved it (or whether they
 * cancelled), so the screen says "Backup file made", not "saved".
 */
export async function saveBackup(now = Date.now()): Promise<SaveOutcome> {
  const text = JSON.stringify(currentBackup(now));
  const name = backupFileName(now);
  if (Platform.OS === 'web') {
    // Web (the screenshot build, a browser): a normal file download.
    const doc = (globalThis as { document?: Document }).document;
    if (!doc) return 'unavailable';
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = doc.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    // The app's cache folder: private to the app; the share sheet makes the copy the learner keeps.
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true });
    file.write(text);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your Aurivan backup' });
  }
  useBackup.getState().setLastBackup(now);
  return 'shared';
}

// ── Restore: pick and read a file (changes nothing) ──────────────────────
export interface ReadyToRestore {
  kind: 'ok';
  data: BackupData;
  now: BackupSummary;
  backup: BackupSummary;
  /** The phone has no study history (the welcome screen then shows the "fresh" preview, without undo). */
  fresh: boolean;
  /** The backup looks older than the phone (fewer answers or an earlier last study day). */
  behind: boolean;
  /** A quiz is paused on this phone; restoring ends it. */
  pausedSession: boolean;
}
export type PickOutcome = { kind: 'cancel' } | { kind: 'error'; code: BackupErrorCode } | ReadyToRestore;

const hasPausedSession = () => {
  const a = useSession.getState().active;
  return Boolean(a && !a.finishedAt);
};

/** Read and check a backup's text. Never changes anything. Exported for tests. */
export function checkBackupText(text: string): { kind: 'error'; code: BackupErrorCode } | ReadyToRestore {
  try {
    const data = readBackup(
      text,
      CERTIFICATIONS.map((c) => c.id),
      knownIds,
      knownAppVersion(),
    );
    const phone = { settings: settingsData(), progress: progressData() };
    return {
      kind: 'ok',
      data,
      now: currentSummary(),
      backup: backupSummary(data),
      fresh: isFresh(phone),
      behind: isBehind(phone, data),
      pausedSession: hasPausedSession(),
    };
  } catch (e) {
    return { kind: 'error', code: e instanceof BackupError ? e.code : 'bad-data' };
  }
}

/** Let the learner pick a backup file, then read and check it. */
export async function pickBackup(): Promise<PickOutcome> {
  let result: DocumentPicker.DocumentPickerResult;
  try {
    // copyToCacheDirectory: the picked file is copied where we can read it.
    result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false });
  } catch {
    return { kind: 'error', code: 'unreadable' };
  }
  if (result.canceled || !result.assets?.length) return { kind: 'cancel' };
  const asset = result.assets[0];
  try {
    // Size first: never read a huge file into memory.
    if (typeof asset.size === 'number' && asset.size > MAX_BACKUP_BYTES) return { kind: 'error', code: 'too-big' };
    let text: string;
    try {
      if (asset.file) {
        // Web: the browser's File object.
        if (asset.file.size > MAX_BACKUP_BYTES) return { kind: 'error', code: 'too-big' };
        text = await asset.file.text();
      } else {
        const file = new File(asset.uri);
        if (file.size > MAX_BACKUP_BYTES) return { kind: 'error', code: 'too-big' };
        text = await file.text();
      }
    } catch {
      return { kind: 'error', code: 'unreadable' };
    }
    return checkBackupText(text);
  } finally {
    // The picker copied the file into our cache: delete that copy (never
    // the learner's own file, which lives outside our cache).
    if (!asset.file && Platform.OS !== 'web') {
      try {
        if (asset.uri.startsWith(Paths.cache.uri)) {
          const copy = new File(asset.uri);
          if (copy.exists) copy.delete();
        }
      } catch {
        // Best effort; the hourly sweep and the OS clear the cache too.
      }
    }
  }
}

// ── Restore: replace the stores, in one write ────────────────────────────
type PersistedStore = { persist: { getOptions: () => { name?: string; version?: number }; rehydrate: () => Promise<void> | void; hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } };
const STORES: PersistedStore[] = [useSettings, useProgress, useSession, useBackup];

/** Resolves once every store has loaded from the phone (a restore must not race the first load). */
export async function whenHydrated(): Promise<void> {
  await Promise.all(
    STORES.map((s) =>
      s.persist.hasHydrated()
        ? undefined
        : new Promise<void>((resolve) => {
            const off = s.persist.onFinishHydration(() => {
              off();
              resolve();
            });
          }),
    ),
  );
}

/** One storage row, in the exact shape zustand's persist saves: `{ state, version }`. */
function row(store: PersistedStore, state: unknown): [string, string] {
  const { name, version } = store.persist.getOptions();
  return [name!, JSON.stringify({ state, version: version ?? 0 })];
}

/** The four rows as they are on the phone now (to put back if a write fails). */
function currentRows(): [string, string][] {
  const backup = useBackup.getState();
  return [
    row(useSettings, settingsData()),
    row(useProgress, progressData()),
    row(useSession, { active: useSession.getState().active }),
    row(useBackup, { lastBackupAt: backup.lastBackupAt, undo: backup.undo, restoredSavedAt: backup.restoredSavedAt ?? null }),
  ];
}

/**
 * Write settings, progress, an ended session and the undo snapshot in ONE
 * AsyncStorage.multiSet, then reload the stores from storage.
 * - Fields the backup leaves out go back to the store defaults: a restore
 *   REPLACES, it never mixes.
 * - `onboarded` is the phone's (a file can't skip or redo onboarding);
 *   the welcome screen passes true.
 * - Today's plans are not restored: the planner rebuilds today's plan.
 * If the write fails, the old rows are written back and it throws.
 */
async function writeAll(
  data: { settings: BackupSettings; progress: BackupProgress },
  opts: { onboarded: boolean; undo: UndoSnapshot | null; restoredSavedAt: number | null },
) {
  const settings = { ...pick(useSettings.getInitialState(), SETTINGS_KEYS), ...data.settings, onboarded: opts.onboarded };
  const byCert: ProgressData['byCert'] = {};
  for (const [id, cp] of Object.entries(data.progress.byCert)) byCert[id] = completeCert(cp);
  const progress = { ...pick(useProgress.getInitialState(), PROGRESS_KEYS), ...data.progress, byCert, days: {} };
  const before = currentRows();
  try {
    await AsyncStorage.multiSet([
      row(useSettings, settings),
      row(useProgress, progress),
      row(useSession, { active: null }), // a paused quiz belongs to the old data
      row(useBackup, { lastBackupAt: useBackup.getState().lastBackupAt, undo: opts.undo, restoredSavedAt: opts.restoredSavedAt }),
    ]);
  } catch (e) {
    await AsyncStorage.multiSet(before).catch(() => {});
    throw e;
  }
  // Rehydrating MERGES each saved row into the live state, and JSON drops
  // undefined keys, so a value the backup doesn't have (e.g. no study mode)
  // would survive from this phone. Set the full state first, every key
  // included, so the phone takes the backup's state exactly (QA Build E).
  useSettings.setState(settings);
  useProgress.setState(progress);
  for (const s of STORES) await s.persist.rehydrate();
}

/** How reminders ended up after a restore or undo. */
export type ReminderOutcome = 'on' | 'off' | 'blocked' | 'unsupported';

/**
 * Put reminders back the way the (restored) settings have them. Permission is
 * asked only if reminders are on and the phone hasn't allowed them yet. If the
 * learner says no, the switch is turned off, so Settings never claims a
 * reminder that can't arrive.
 */
export async function reapplyReminders(): Promise<ReminderOutcome> {
  if (!remindersSupported) return 'unsupported';
  const { reminder, activeCertId } = useSettings.getState();
  if (!reminder.enabled) {
    await cancelReminders();
    return 'off';
  }
  if (!(await ensurePermission())) {
    useSettings.getState().setReminder({ ...reminder, enabled: false });
    await cancelReminders();
    return 'blocked';
  }
  await scheduleReminders(reminder, certName(activeCertId));
  return 'on';
}

export type RestoreOutcome =
  | { kind: 'ok'; reminders: ReminderOutcome }
  /** The phone's own data couldn't be copied for Undo, so nothing was replaced. */
  | { kind: 'no-snapshot' }
  /** The write failed; the old data was put back. */
  | { kind: 'failed' };

/**
 * Replace the learner's data with a checked backup.
 * - Settings: first keeps ONE snapshot of what is there now (for "Undo
 *   restore"), after checking that snapshot could itself be restored.
 * - `fresh` (the phone has no progress yet): nothing to keep, so no snapshot.
 * - `onboard` (from the welcome screen): `onboarded` becomes true, so the
 *   learner lands on Today. Otherwise the phone's own `onboarded` is kept.
 */
export async function restoreBackup(
  data: BackupData,
  options: number | { now?: number; fresh?: boolean; onboard?: boolean } = {},
): Promise<RestoreOutcome> {
  // A bare number is "now" (the first version's signature, still used by tests).
  const opts = typeof options === 'number' ? { now: options } : options;
  const now = opts.now ?? Date.now();
  await whenHydrated();
  let undo: UndoSnapshot | null = useBackup.getState().undo;
  if (!opts.fresh) {
    const file = currentBackup(now);
    if (checkBackupText(JSON.stringify(file)).kind !== 'ok') return { kind: 'no-snapshot' };
    undo = { takenAt: now, file };
  }
  try {
    const saved = Date.parse(data.exportedAt);
    await writeAll(data, {
      onboarded: opts.onboard ? true : useSettings.getState().onboarded,
      undo,
      restoredSavedAt: Number.isFinite(saved) ? saved : now,
    });
  } catch {
    return { kind: 'failed' };
  }
  return { kind: 'ok', reminders: await reapplyReminders().catch((): ReminderOutcome => 'off') };
}

/** True while "Undo restore" should be offered. */
export function canUndo(now = Date.now()): boolean {
  return undoAvailable(useBackup.getState().undo, now);
}

export type UndoOutcome =
  | { kind: 'ok'; reminders: ReminderOutcome }
  /** No snapshot, or it is more than 7 days old. */
  | { kind: 'none' }
  /** The snapshot didn't pass the checks (it is dropped). */
  | { kind: 'invalid' }
  | { kind: 'failed' };

/** Bring back the data from just before the last restore (within 7 days), then forget the snapshot. */
export async function undoRestore(now = Date.now()): Promise<UndoOutcome> {
  await whenHydrated();
  const snap = useBackup.getState().undo;
  if (!undoAvailable(snap, now)) {
    if (snap) useBackup.getState().setUndo(null); // expired: tidy it away
    return { kind: 'none' };
  }
  // The snapshot is our own file, but it is read through the same checks.
  const checked = checkBackupText(JSON.stringify(snap.file));
  if (checked.kind !== 'ok') {
    useBackup.getState().setUndo(null);
    return { kind: 'invalid' };
  }
  try {
    await writeAll(checked.data, { onboarded: useSettings.getState().onboarded, undo: null, restoredSavedAt: null });
  } catch {
    return { kind: 'failed' };
  }
  return { kind: 'ok', reminders: await reapplyReminders().catch((): ReminderOutcome => 'off') };
}

/** Drop an expired snapshot (once the stores have loaded at launch), so it never lingers. */
export function pruneUndo(now = Date.now()) {
  const snap = useBackup.getState().undo;
  if (snap && !undoAvailable(snap, now)) useBackup.getState().setUndo(null);
}
