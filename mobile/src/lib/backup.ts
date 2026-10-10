/**
 * Backup and restore — the phone-side glue for engine/backup.ts.
 *
 * Save a backup: build the file from the progress and settings stores,
 * write it to the app's cache folder (expo-file-system), and open the system
 * share sheet (expo-sharing) so the learner keeps it in Files, Drive, email
 * or AirDrop. Nothing is uploaded by the app: no account, no server.
 *
 * Restore: the learner picks a file (expo-document-picker); engine/backup.ts
 * checks it; the screen shows what will change and asks first. Only then do
 * we keep ONE snapshot of the current data (for "Undo restore", 7 days),
 * replace the two stores, and put reminders back the way the backup has them.
 *
 * Works fully offline.
 */
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import {
  BackupError,
  backupFileName,
  buildBackup,
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
} from '../engine/backup';
import { useBackup } from '../store/backup';
import { completeCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { cancelReminders, ensurePermission, remindersSupported, scheduleReminders } from './reminders';

// ── The data in each store (no actions) ──────────────────────────────────
const SETTINGS_KEYS = ['onboarded', 'activeCertId', 'examDates', 'theme', 'shuffleOptions', 'dailyGoal', 'reminder', 'haptics', 'gameRulesSeen'] as const;
const PROGRESS_KEYS = ['byCert', 'streak', 'today', 'days'] as const;

type SettingsData = Pick<ReturnType<typeof useSettings.getState>, (typeof SETTINGS_KEYS)[number]>;
type ProgressData = Pick<ReturnType<typeof useProgress.getState>, (typeof PROGRESS_KEYS)[number]>;

function pick<S, K extends keyof S>(state: S, keys: readonly K[]): Pick<S, K> {
  const out = {} as Pick<S, K>;
  for (const k of keys) out[k] = state[k];
  return out;
}

const settingsData = (): SettingsData => pick(useSettings.getState(), SETTINGS_KEYS);
const progressData = (): ProgressData => pick(useProgress.getState(), PROGRESS_KEYS);

// Compile-time guard: what the stores hold must fit what the backup checker
// accepts. If a store field changes type, `npm run typecheck` fails here
// until engine/backup.ts is updated to match.
const _settingsFits = (s: SettingsData): BackupSettings => s;
const _progressFits = (p: ProgressData): BackupProgress => p;
void _settingsFits;
void _progressFits;

const certName = (id: string) => getCertification(id)?.name ?? id;
const appVersion = () => Constants.expoConfig?.version ?? '0.0.0';

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

// ── Save a backup ────────────────────────────────────────────────────────
export type SaveOutcome = 'shared' | 'unavailable';

/**
 * Write the backup file and open the share sheet. Resolves once the sheet
 * closes. "Last backup" is set then (we can't see where the learner saved it,
 * or whether they cancelled, so closing the sheet counts).
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
export type PickOutcome =
  | { kind: 'cancel' }
  | { kind: 'error'; code: BackupErrorCode }
  | { kind: 'ok'; data: BackupData; now: BackupSummary; backup: BackupSummary };

/** Read and check a backup's text. Never changes anything. Exported for tests. */
export function checkBackupText(text: string): { kind: 'error'; code: BackupErrorCode } | { kind: 'ok'; data: BackupData; now: BackupSummary; backup: BackupSummary } {
  try {
    const data = readBackup(text, CERTIFICATIONS.map((c) => c.id));
    return { kind: 'ok', data, now: currentSummary(), backup: backupSummary(data) };
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
}

// ── Restore: replace the stores ──────────────────────────────────────────
/** Put backup data into the two stores (saved to the phone by the stores themselves). */
function applyData(data: { settings: BackupSettings; progress: BackupProgress }) {
  // Start from each store's defaults, so a field the backup leaves out is
  // reset (not kept from before): a restore REPLACES, it never mixes.
  const settingsDefaults = pick(useSettings.getInitialState(), SETTINGS_KEYS);
  useSettings.setState({ ...settingsDefaults, ...data.settings });
  const byCert: ProgressData['byCert'] = {};
  for (const [id, cp] of Object.entries(data.progress.byCert)) byCert[id] = completeCert(cp);
  useProgress.setState({ ...pick(useProgress.getInitialState(), PROGRESS_KEYS), ...data.progress, byCert, days: data.progress.days ?? {} });
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

/**
 * Replace the learner's data with a checked backup. First keeps ONE
 * snapshot of what is there now, so "Undo restore" can bring it back.
 */
export async function restoreBackup(data: BackupData, now = Date.now()): Promise<ReminderOutcome> {
  useBackup.getState().setUndo({ takenAt: now, file: currentBackup(now) });
  applyData(data);
  return reapplyReminders().catch((): ReminderOutcome => 'off');
}

/** True while "Undo restore" should be offered. */
export function canUndo(now = Date.now()): boolean {
  return undoAvailable(useBackup.getState().undo, now);
}

/**
 * Bring back the data from just before the last restore (within 7 days),
 * then forget the snapshot. Returns null when there is nothing to undo.
 */
export async function undoRestore(now = Date.now()): Promise<ReminderOutcome | null> {
  const snap = useBackup.getState().undo;
  if (!undoAvailable(snap, now)) {
    if (snap) useBackup.getState().setUndo(null); // expired: tidy it away
    return null;
  }
  // The snapshot is our own file, but it is read through the same checks.
  const checked = checkBackupText(JSON.stringify(snap.file));
  if (checked.kind !== 'ok') return null;
  applyData(checked.data);
  useBackup.getState().setUndo(null);
  return reapplyReminders().catch((): ReminderOutcome => 'off');
}

/** Drop an expired snapshot (called when Settings opens), so it never lingers. */
export function pruneUndo(now = Date.now()) {
  const snap = useBackup.getState().undo;
  if (snap && !undoAvailable(snap, now)) useBackup.getState().setUndo(null);
}
