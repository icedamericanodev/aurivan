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
import { lessonsIncludingRetired } from '../content/lessons';
import { getAllQuestionsIncludingRetired, hasContent } from '../content/loader';
import { noteSubtopics } from '../content/notes';
import { onClearContentCaches } from '../content/packs';
import { cleanDisplayName } from '../engine/displayName';
import {
  BackupError,
  backupFileName,
  backupTooBig,
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
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { ensureCatalog, syncPlanters } from './milestones';
import { carryPlantIdentity, plantSubtopics } from './plant';
import { cancelReminders, ensurePermission, remindersSupported } from './reminders';
import { refreshReminders } from './reminderSync';
import { refreshWidgets } from './widgets';
import { REVEAL_KEY, WIDGET_KEY } from '../engine/widgets';
import { useWidgetStore } from '../store/widgets';

// ── The data in each store (no actions) ──────────────────────────────────
const SETTINGS_KEYS = ['onboarded', 'activeCertId', 'examDates', 'theme', 'motion', 'shuffleOptions', 'dailyGoal', 'reminder', 'haptics', 'gameRulesSeen', 'practiceTimer', 'paceOffer', 'studyMode', 'studyDomain', 'studySize', 'badgesHidden', 'familiarity', 'dailyMinutes', 'examFocused', 'fitPrompt', 'fitChanges', 'fitAskDays', 'displayName'] as const;
const PROGRESS_KEYS = ['byCert', 'streak', 'today', 'days', 'reports', 'plantSettings'] as const;

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
 *
 * Retired questions and lessons COUNT as known (content packs): progress on
 * them is kept. `installed` is false for an exam with no content on this
 * phone (a pack not downloaded here): its progress is then kept untouched,
 * never trimmed to nothing (engine/backup.ts keepKnownIds).
 */
const knownCache = new Map<string, KnownIds>();
// A new content pack (clearContentCaches) changes which ids exist.
onClearContentCaches(() => knownCache.clear());
export function knownIds(certId: string): KnownIds {
  let k = knownCache.get(certId);
  if (!k) {
    const questions = new Set(getAllQuestionsIncludingRetired(certId).map((q) => q.id));
    k = {
      // Installed = this phone has the exam's content AND its question ids (MEDIUM-2): an empty
      // pack never counts, so it can never trim a restored exam's progress to nothing.
      installed: hasContent(certId) && questions.size > 0,
      questions,
      lessons: new Set(lessonsIncludingRetired(certId).map((l) => l.id)),
      notes: new Set(noteSubtopics(certId).map((n) => n.id)),
      domains: new Set((getCertification(certId)?.domains ?? []).map((d) => d.id)),
      // Mobile 1.13: what "know X% of the outline" counts (the restored plant's clamp).
      plantOutline: plantSubtopics(certId),
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
const BACKUP_NAME = /^(?:kaisip|aurivan)-backup-.*\.json$/;
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
/** 'too-big': the file would be over the 1 MB a restore accepts, so none was made (it could never be restored). */
export type SaveOutcome = 'shared' | 'unavailable' | 'too-big';

/**
 * Write the backup file and open the share sheet. Resolves once the sheet
 * closes. We can't see where the learner saved it (or whether they
 * cancelled), so the screen says "Backup file made", not "saved".
 */
export async function saveBackup(now = Date.now()): Promise<SaveOutcome> {
  const text = JSON.stringify(currentBackup(now));
  // Never hand the learner a file this app would refuse to restore (security review).
  if (backupTooBig(text)) return 'too-big';
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
    // Expo SDK 58: write() is async now. Wait for it, or the share sheet could
    // open on a file that is still empty or half-written. If it fails, remove
    // the partial copy at once rather than leave it for the cache sweep.
    try {
      await file.write(text);
    } catch (e) {
      try {
        file.delete();
      } catch {
        // Already gone, or never created: nothing to clean up.
      }
      throw e;
    }
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your KaiSip backup' });
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
  const picked = await pickFileText(MAX_BACKUP_BYTES);
  return picked.kind === 'text' ? checkBackupText(picked.text) : picked;
}

/** What reading a picked file gave: its text, nothing (cancelled), or why it couldn't be read. */
export type PickedText = { kind: 'cancel' } | { kind: 'error'; code: BackupErrorCode } | { kind: 'text'; text: string };

/**
 * Let the learner pick a file and read its text, never more than `maxBytes`
 * (mobile 1.42: a website export may be bigger than an app backup, so the
 * cap is the caller's). Changes nothing. The picker's own copy in our cache
 * is deleted afterwards (never the learner's file).
 */
export async function pickFileText(maxBytes: number): Promise<PickedText> {
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
    if (typeof asset.size === 'number' && asset.size > maxBytes) return { kind: 'error', code: 'too-big' };
    let text: string;
    try {
      if (asset.file) {
        // Web: the browser's File object.
        if (asset.file.size > maxBytes) return { kind: 'error', code: 'too-big' };
        text = await asset.file.text();
      } else {
        const file = new File(asset.uri);
        if (file.size > maxBytes) return { kind: 'error', code: 'too-big' };
        text = await file.text();
      }
    } catch {
      return { kind: 'error', code: 'unreadable' };
    }
    return { kind: 'text', text };
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
export type PersistedStore = { persist: { getOptions: () => { name?: string; version?: number }; rehydrate: () => Promise<void> | void; hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } };
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
 *   REPLACES, it never mixes. Four exceptions keep this phone's value when an
 *   older file has no such field: the reports list, the Motion choice, Show
 *   badges and the plant settings. A cert with no plant in the file keeps the
 *   phone's plant identity (its growth recomputed from the restored data).
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
  // A file from before 1.8 has no Motion choice. Reduced is an accessibility
  // setting, so keep this phone's choice instead of silently undoing it.
  if (data.settings.motion === undefined) settings.motion = useSettings.getState().motion;
  // Likewise "Show badges" (1.10): a learner who hid badges keeps them hidden
  // when restoring a file from before the switch existed.
  if (data.settings.badgesHidden === undefined) settings.badgesHidden = useSettings.getState().badgesHidden;
  // And the name (1.23): a file from before it existed has none, so keep the one this phone already has.
  if (data.settings.displayName === undefined) settings.displayName = useSettings.getState().displayName;
  // A file's name that wasn't clean arrives as '': that is "no name", saved as no key.
  if (settings.displayName === '') settings.displayName = undefined;
  const byCert: ProgressData['byCert'] = {};
  const phoneCerts = useProgress.getState().byCert;
  const at = Date.now();
  for (const [id, cp] of Object.entries(data.progress.byCert)) {
    const full = completeCert(cp);
    // Mobile 1.13: an older backup with no plant for this exam keeps the
    // phone's plant (its species, name and look), with its growth worked out
    // quietly from the restored data. A restore never makes a learner re-plant.
    const plant = carryPlantIdentity(id, full, phoneCerts[id]?.plant, at);
    byCert[id] = plant ? { ...full, plant } : full;
  }
  // The same for an exam the file has no entry for at all (QA 7: a file
  // exported before any answer, or from a phone used for another exam): the
  // phone's plant comes along as its identity, grown quietly from the
  // (empty) restored data, so a restore never makes a learner re-plant.
  for (const [id, phone] of Object.entries(phoneCerts)) {
    if (!phone?.plant || byCert[id] || !getCertification(id)) continue;
    const full = completeCert({});
    const plant = carryPlantIdentity(id, full, phone.plant, at);
    if (plant) byCert[id] = { ...full, plant };
  }
  const progress = { ...pick(useProgress.getInitialState(), PROGRESS_KEYS), ...data.progress, byCert, days: {} };
  // A file from before 1.7 has no "Your reports" list at all. Those are the
  // learner's messages to us, not study progress, so keep this phone's list
  // instead of emptying it (a file WITH a list, even an empty one, wins).
  if (data.progress.reports === undefined) progress.reports = useProgress.getState().reports;
  // Likewise the plant settings (1.13): a learner who hid the plant, or chose
  // the Quiet look, keeps that choice when restoring an older file.
  if (data.progress.plantSettings === undefined) progress.plantSettings = useProgress.getState().plantSettings;
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
  // First, forget the numbers each screen last showed: restored progress is
  // not growth earned since the last look, so nothing shows "+N" for it.
  useSeen.getState().forgetValues();
  // Mobile 1.50: a restored plant's forms count as history (one quiet note, never a replayed reveal).
  useSeen.getState().forgetForms();
  // The file decides the Form IV final: its look.final, else the own final (§8.10, QA-150-4).
  useSeen.getState().forgetFinals();
  useSettings.setState(settings);
  useProgress.setState(progress);
  for (const s of STORES) await s.persist.rehydrate();
  // Mobile 1.50 (QA-TURN-1): each restored plant's form counts as shown, its grow-up still
  // `pending` included, so a file taken after a Turning never plays it again (forms in a file are history).
  for (const [id, c] of Object.entries(useProgress.getState().byCert)) if (c?.plant) useSeen.getState().baselineForms(id, c.plant.growth);
  // A backup from 1.9 already ran its back-fill, so the launch effect never
  // revisits it: a set it holds complete gets its planter here. A backup from
  // 1.10 has the older badge catalogue: its new tiers fill in quietly first.
  // Only exams whose content is on this phone (MEDIUM-1): another exam's data is kept, never recomputed here.
  for (const id of Object.keys(useProgress.getState().byCert)) {
    if (!hasContent(id)) continue;
    ensureCatalog(id);
    syncPlanters(id);
  }
}

/** The settings and progress the phone holds now, as plain data (sync reads these). */
export function phoneStores(): { settings: SettingsData; progress: ProgressData } {
  return { settings: settingsData(), progress: progressData() };
}

/**
 * Sync (Uplift Phase 7, cloud builds only): put MERGED settings and progress
 * on the phone through the restore write path. Unlike a restore it:
 * - keeps today's plans (`days`) and a paused quiz (the merged data only
 *   adds to them);
 * - writes the undo snapshot (`opts.undo`, the first sync's "Undo sync") in
 *   the SAME AsyncStorage.multiSet as the stores, or leaves the slot alone;
 * - never loses what the learner did while the sync was on the network or
 *   the write was in flight (Phase 7 review, CR B1): `next` was worked out
 *   from the phone as it was when the sync STARTED, so `opts.rebase` merges
 *   the live stores into it before writing, and once more after the write
 *   lands if they changed again meanwhile (merging is safe to repeat). A
 *   setting changed meanwhile keeps its newer value AND its stamp;
 * - never reloads the stores from storage: persist saves the final state as
 *   usual.
 * `opts.quiet` wraps ONLY the synchronous store updates (lib/sync.ts uses it
 * so its own write isn't stamped as the learner's: CR N4); a change the
 * learner makes during the awaits is stamped as usual.
 * If the write fails, or the live data can't be merged in (CR N1), the rows
 * are put back as the phone holds them, nothing in memory changes, and it
 * throws: the sync records nothing and tries again later.
 */
export async function writeSynced(
  next: { settings: Record<string, unknown>; progress: Record<string, unknown> },
  opts: {
    undo?: UndoSnapshot | null;
    rebase?: (live: { settings: SettingsData; progress: ProgressData }) => { settings: Record<string, unknown>; progress: Record<string, unknown> } | null;
    quiet?: (apply: () => void) => void;
  } = {},
): Promise<void> {
  await whenHydrated();
  const full = (n: { settings: Record<string, unknown>; progress: Record<string, unknown> }, days: ProgressData['days']) => {
    const settings = { ...pick(useSettings.getInitialState(), SETTINGS_KEYS), ...n.settings } as SettingsData;
    const byCert: ProgressData['byCert'] = {};
    for (const [id, cp] of Object.entries((n.progress.byCert ?? {}) as Record<string, Partial<CertData>>)) byCert[id] = completeCert(cp);
    const progress = { ...pick(useProgress.getInitialState(), PROGRESS_KEYS), ...n.progress, byCert, days } as ProgressData;
    return { settings, progress };
  };
  // The phone now, with everything done since the sync started merged in (a failure throws: nothing written).
  const live = { settings: settingsData(), progress: progressData() };
  const written = full((opts.rebase && opts.rebase(live)) || next, live.progress.days);
  const before = currentRows();
  const rows = [row(useSettings, written.settings), row(useProgress, written.progress)];
  if (opts.undo !== undefined) {
    const b = useBackup.getState();
    rows.push(row(useBackup, { lastBackupAt: b.lastBackupAt, undo: opts.undo, restoredSavedAt: b.restoredSavedAt ?? null }));
  }
  try {
    await AsyncStorage.multiSet(rows);
  } catch (e) {
    await AsyncStorage.multiSet(before).catch(() => {});
    throw e;
  }
  // The learner kept studying while the write was in flight: merge that in, never drop it.
  const now = { settings: settingsData(), progress: progressData() };
  const moved =
    SETTINGS_KEYS.some((k) => !Object.is(now.settings[k], live.settings[k])) || PROGRESS_KEYS.some((k) => !Object.is(now.progress[k], live.progress[k]));
  let final = written;
  if (moved && opts.rebase) {
    let r: ReturnType<NonNullable<typeof opts.rebase>>;
    try {
      r = opts.rebase(now);
    } catch (e) {
      // Can't merge right now: storage goes back to what the phone holds, memory is untouched, and the sync
      // records nothing (so it never pushes a phone that lacks what it pulled). Everything is still on the phone.
      await AsyncStorage.multiSet(currentRows()).catch(() => {});
      throw e;
    }
    if (r) final = full(r, now.progress.days);
  }
  const apply = () => {
    useSeen.getState().forgetValues();
    useSettings.setState(final.settings);
    useProgress.setState(final.progress);
    if (opts.undo !== undefined) useBackup.setState({ undo: opts.undo });
    // Only exams whose content is on this phone (MEDIUM-1): another exam's data is kept, never recomputed here.
    for (const id of Object.keys(useProgress.getState().byCert)) {
      if (!hasContent(id)) continue;
      ensureCatalog(id);
      syncPlanters(id);
    }
  };
  if (opts.quiet) opts.quiet(apply);
  else apply();
}

/** Settings that stay as they are when a phone is wiped for the next learner: the device's own (theme, motion, reminders, haptics, onboarding done). */
const WIPE_KEEPS = ['onboarded', 'theme', 'motion', 'reminder', 'haptics'] as const;
/** A store's saved data: its state without the actions (what persist writes). */
const dataOf = (state: object): Record<string, unknown> => Object.fromEntries(Object.entries(state).filter(([, v]) => typeof v !== 'function'));

/**
 * "Remove my progress from this phone (for shared devices)" and account
 * deletion's "also remove from this phone" (Phase 7 review, CR B5 / SEC S3 /
 * QA B2): this phone back to a fresh install's study state, so nothing of
 * this learner is left for the next account to see or merge. In ONE storage
 * write:
 * - progress: the initial state (every exam, the streak and study days, the
 *   plant with its name and look, your reports, plant display choices);
 * - settings: back to their defaults (exam, exam dates, study choices, the
 *   fit card's counters), except the device's own: theme, motion,
 *   reminders, haptics, and onboarding done;
 * - no paused quiz, no undo copy, no backup dates, no "seen" memory;
 * - plus `also`: other stores to reset in the same write (lib/account.ts
 *   adds the sync record and the account link in a cloud build).
 * If the write fails nothing changes and it throws. Not Settings → Reset
 * (that is per exam and keeps the plant, the exam-week list and reports).
 */
export type WipeAlso = { store: PersistedStore & { getState: () => object; setState: (s: object) => void }; state: object };
export async function wipeLocalStudy(also: WipeAlso[] = []): Promise<void> {
  await whenHydrated();
  const kept = pick(useSettings.getState(), WIPE_KEEPS);
  const settings = { ...pick(useSettings.getInitialState(), SETTINGS_KEYS), ...kept } as SettingsData;
  const progress = pick(useProgress.getInitialState(), PROGRESS_KEYS) as ProgressData;
  const backup = { lastBackupAt: null, undo: null, restoredSavedAt: null };
  const seen = dataOf(useSeen.getInitialState());
  // Mobile 1.47 (security review M2): the widget choices and counters go back to their start in the
  // same write, so the next learner never inherits a readiness opt-in, exam timing or counts.
  const widgets = dataOf(useWidgetStore.getInitialState());
  // What the phone holds now, to put back if the write fails.
  const before = [
    ...currentRows(),
    row(useSeen, dataOf(useSeen.getState())),
    row(useWidgetStore, dataOf(useWidgetStore.getState())),
    ...also.map((a) => row(a.store, dataOf(a.store.getState()))),
  ];
  try {
    await AsyncStorage.multiSet([
      row(useSettings, settings),
      row(useProgress, progress),
      row(useSession, { active: null }),
      row(useBackup, backup),
      row(useSeen, seen),
      row(useWidgetStore, widgets),
      ...also.map((a) => row(a.store, a.state)),
    ]);
  } catch (e) {
    await AsyncStorage.multiSet(before).catch(() => {});
    throw e;
  }
  // The widget snapshot and Today's rule marks hold the previous learner's words: gone at once.
  await AsyncStorage.multiRemove([WIDGET_KEY, REVEAL_KEY]).catch(() => {});
  // Replace, not merge: a field the start state doesn't have (the readiness date, the one suggestion) must go too.
  useWidgetStore.setState(useWidgetStore.getInitialState(), true);
  useSeen.setState(seen);
  useSettings.setState(settings);
  useProgress.setState(progress);
  useSession.getState().clear();
  useBackup.setState(backup);
  for (const a of also) a.store.setState(a.state);
  sweepBackupFiles();
  // Redraw the widgets now (not after the usual short delay): a phone put down right after
  // "Remove my progress" must not keep showing the previous learner's widgets.
  await refreshWidgets({ force: true });
}

/** The undo copy for a first sync ("Undo sync"), or null when this phone's own data couldn't be checked. */
export function syncUndoSnapshot(now = Date.now()): UndoSnapshot | null {
  const file = currentBackup(now);
  return checkBackupText(JSON.stringify(file)).kind === 'ok' ? { takenAt: now, file, kind: 'sync' } : null;
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
  const { reminder } = useSettings.getState();
  if (!reminder.enabled) {
    await cancelReminders();
    return 'off';
  }
  if (!(await ensurePermission())) {
    useSettings.getState().setReminder({ ...reminder, enabled: false });
    await cancelReminders();
    return 'blocked';
  }
  // The one way to schedule (lib/reminderSync.ts): today is skipped once today's plan is cleared,
  // and the title carries the learner's minutes. It reads the restored settings and progress.
  await refreshReminders();
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
  // Mobile 1.44: a name a website import set goes too, but only while it is still exactly that name
  // (one the learner changed since is theirs). The copy itself had no name ('' is "no name" in writeAll;
  // left undefined, writeAll would keep the phone's).
  let data = checked.data;
  const imported = cleanDisplayName(snap.importedName);
  if (imported && !cleanDisplayName(data.settings.displayName) && cleanDisplayName(useSettings.getState().displayName) === imported) {
    data = { ...data, settings: { ...data.settings, displayName: '' } };
  }
  try {
    await writeAll(data, { onboarded: useSettings.getState().onboarded, undo: null, restoredSavedAt: null });
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
