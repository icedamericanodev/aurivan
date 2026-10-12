/**
 * Sync: the phone-side glue (Uplift Phase 7, built OFF; spec §3.1, §3.5).
 * lib/syncCore.ts does one sync cycle against ports; this file decides WHEN,
 * wires it to the real stores, and offers the screens their actions.
 *
 * When a sync runs (one at a time; triggers that arrive meanwhile are
 * coalesced into one more run):
 * 1. at launch, once saved data has loaded;
 * 2. when the app goes to the background;
 * 3. when a quiz, mock, lesson or game ends (the route leaves it): this is
 *    also when a pull that waited for it is applied;
 * 4. while the app is in front, at most every 10 minutes after a change;
 * 5. "Sync now".
 * A failure never shows a pop-up: it only changes the status line, and the
 * next try waits 30 s, then 2 min, 10 min, and at most 1 hour. Offline is
 * just a failure (no network-state dependency). The offline "queue" is the
 * phone's own data: snapshots are whole, so the newest is always what goes.
 *
 * With the flag OFF none of this runs: initSync() returns at once, nothing
 * subscribes, no timer is set, and the sync record (`aurivan.sync.v1`) is
 * never read or written.
 */
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { getBackend } from '../cloud/backend';
import { errorCode, type AccountInfo } from '../cloud/types';
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import { copy } from '../content/cloud/copy';
import { summarize, undoAvailable, type BackupSummary, type SummaryInput } from '../engine/backup';
import { sha256Hex } from '../engine/sha256';
import { stableStringify, SYNCED_SETTINGS, type Stamps } from '../engine/syncMerge';
import { dayKey } from '../engine/streak';
import { useAccount } from '../store/account';
import { useBackup } from '../store/backup';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { SYNC_OFF, useSyncMeta, useSyncStatus, type SyncMeta } from '../store/sync';
import { cloudReady, noteSessionEnded, onAccountEvent, removeLocalProgress, signOut, type Result } from './account';
import { phoneStores, syncUndoSnapshot, undoRestore, whenHydrated, writeSynced, type UndoOutcome } from './backup';
import { shortDate } from './format';
import { confirmFirstSync, prepareFirstSync, syncCycle, type CycleCtx, type CycleResult, type Device, type FirstSyncPrep, type PhoneData } from './syncCore';

/** At most this often while the app is in front, after a change. */
export const ACTIVE_EVERY_MS = 10 * 60_000;
/** The waits before trying again after a failure (then 1 hour each time). */
export const BACKOFF_MS = [30_000, 2 * 60_000, 10 * 60_000, 60 * 60_000] as const;
/** A burst of changes (answers in a session) goes in one sync, not one per answer. */
const SETTLE_MS = 5_000;
/** Routes where a pull must wait: a quiz or mock, a lesson, a game. */
const BUSY_ROUTE = /^\/(session|lesson\/|game\/)/;

// ── The record and the phone ─────────────────────────────────────────────
const meta = (): SyncMeta => {
  const s = useSyncMeta.getState();
  return { enabled: s.enabled, lastRev: s.lastRev, lastPushedHash: s.lastPushedHash, lastSyncAt: s.lastSyncAt, pausedReason: s.pausedReason, deferredPull: s.deferredPull, stamps: s.stamps };
};
const setMeta = (m: Partial<SyncMeta>) => useSyncMeta.getState().setMeta(m);

/** The route on screen now (root layout's SyncRouteWatch tells us). */
let route = '/';
/** > 0 while sync itself writes the stores: those changes are not the learner's (no stamps). */
let applying = 0;

const device: Device = {
  read: () => phoneStores() as unknown as PhoneData,
  write: async (next, opts) => {
    applying++;
    try {
      await writeSynced(next as { settings: Record<string, unknown>; progress: Record<string, unknown> }, opts as Parameters<typeof writeSynced>[1]);
    } finally {
      applying--;
    }
  },
  meta,
  setMeta,
  busy: () => BUSY_ROUTE.test(route),
};

const appVersion = (): string | null => Constants.expoConfig?.version || null;

function ctxOrNull(): CycleCtx | null {
  const b = getBackend();
  const thisApp = appVersion();
  if (!CLOUD_ON() || !b || !thisApp) return null;
  return {
    port: b.sync,
    device,
    deviceId: () => b.device.id(),
    thisApp,
    now: () => Date.now(),
    knownCertIds: CERTIFICATIONS.map((c) => c.id),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}
/** True in a cloud build with a backend (never with the flag off). */
const CLOUD_ON = () => cloudReady();

// ── Status line ──────────────────────────────────────────────────────────
export interface StatusInput {
  enabled: boolean;
  signedIn: boolean;
  expired: boolean;
  busy: boolean;
  offline: boolean;
  pausedReason: SyncMeta['pausedReason'];
  lastSyncAt: number | null;
  now: number;
}

/** The Sync section's one status line (spec §3.3). Pure. */
export function statusLine(s: StatusInput): string {
  if (!s.signedIn) return copy(s.expired ? 'sync.status.signin' : 'sync.status.off');
  if (!s.enabled) return copy('sync.status.off');
  if (s.pausedReason) return copy(s.pausedReason === 'newer' ? 'sync.paused.newer' : s.pausedReason === 'unreadable' ? 'sync.paused.unreadable' : 'sync.paused.toobig');
  if (s.busy) return copy('sync.status.busy');
  if (s.offline || s.lastSyncAt === null) return copy('sync.status.offline');
  const ago = s.now - s.lastSyncAt;
  if (ago < 60_000) return copy('sync.status.just');
  if (ago < 60 * 60_000) return copy('sync.status.min', { n: String(Math.floor(ago / 60_000)) });
  if (dayKey(s.lastSyncAt) === dayKey(s.now)) {
    const d = new Date(s.lastSyncAt);
    return copy('sync.status.today', { time: `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` });
  }
  return copy('sync.status.day', { 'd MMM': shortDate(s.lastSyncAt) });
}

/** True while this phone syncs (Settings → About and Your data say so). */
export function useSyncing(): boolean {
  const enabled = useSyncMeta((s) => s.enabled);
  const signedIn = useAccount((s) => s.signedIn);
  return CLOUD_ON() && enabled && signedIn;
}

// ── Running a cycle ──────────────────────────────────────────────────────
let running: Promise<void> | null = null;
let again = false;
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let changeTimer: ReturnType<typeof setTimeout> | null = null;
/** A different account signed in and the learner hasn't chosen yet (account/switch). */
let switchPending: { info: AccountInfo } | null = null;

function clearTimers() {
  if (retryTimer) clearTimeout(retryTimer);
  if (changeTimer) clearTimeout(changeTimer);
  retryTimer = null;
  changeTimer = null;
}

/** Run a sync now (or once more after the one running). Never rejects. */
export function trigger(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await runOnce();
    } while (again);
  })()
    .catch(() => {})
    .finally(() => {
      running = null;
    });
  return running;
}

async function runOnce(): Promise<void> {
  const ctx = ctxOrNull();
  if (!ctx || !useSyncMeta.getState().enabled || !useAccount.getState().signedIn || switchPending) return;
  useSyncStatus.setState({ busy: true });
  let r: CycleResult;
  try {
    r = await syncCycle(ctx);
  } catch {
    r = { kind: 'failed', code: 'server' };
  }
  useSyncStatus.setState({ busy: false, offline: r.kind === 'failed' });
  if (r.kind === 'failed') {
    if (r.code === 'unauthorized' || r.code === 'gone') {
      await noteSessionEnded();
      return;
    }
    // A conflict that kept losing, offline, a server problem, too many writes: try again later.
    const wait = Math.max(BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)], (r.retryAfterSec ?? 0) * 1000);
    failures++;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void trigger();
    }, wait);
    return;
  }
  failures = 0;
}

/** "Sync now" (also "Try again" after a pause: the pause is forgotten first). */
export function syncNow(): Promise<void> {
  if (useSyncMeta.getState().pausedReason) setMeta({ pausedReason: null });
  failures = 0;
  return trigger();
}

/** Root layout: the route on screen. Leaving a quiz, lesson or game runs a sync (and applies a waiting pull). */
export function setRoute(path: string) {
  const was = BUSY_ROUTE.test(route);
  route = path;
  if (was && !BUSY_ROUTE.test(path) && useSyncMeta.getState().enabled) void trigger();
}

// ── Launch ───────────────────────────────────────────────────────────────
/**
 * Cloud builds only, once saved data has loaded (root _layout, after
 * initAccount): load the sync record, start stamping the learner's choices
 * (for last-writer-wins), follow sign-ins, and sync. Returns a function that
 * stops everything. Never rejects.
 */
export async function initSync(): Promise<() => void> {
  if (!CLOUD_ON()) return () => {};
  try {
    await useSyncMeta.persist.rehydrate();
  } catch {
    // Unreadable record: sync stays off until the learner turns it on again.
  }
  await whenHydrated();
  const offStamps = watchChanges();
  const offAccount = onAccountEvent((e) => {
    if (e.kind === 'signedIn') void afterSignIn(e.info);
    else void afterAccountDeleted();
  });
  let lastActive = Date.now();
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'background') void trigger();
    if (s === 'active') {
      // Back after a while: see whether the other phone changed anything.
      if (Date.now() - lastActive > ACTIVE_EVERY_MS) void trigger();
      lastActive = Date.now();
    }
  });
  void trigger();
  return () => {
    offStamps();
    offAccount();
    sub.remove();
    clearTimers();
  };
}

/** Stamp each synced choice when the learner changes it, and schedule a sync after changes. */
function watchChanges(): () => void {
  const stamp = (store: 'settings' | 'progress', changed: Stamps) => {
    if (!Object.keys(changed).length) return;
    const cur = useSyncMeta.getState().stamps;
    setMeta({ stamps: { ...cur, [store]: { ...cur[store], ...changed } } });
  };
  const offS = useSettings.subscribe((s, prev) => {
    if (applying) return;
    const t = Date.now();
    const changed: Stamps = {};
    const S = s as unknown as Record<string, unknown>;
    const P = prev as unknown as Record<string, unknown>;
    for (const f of SYNCED_SETTINGS) {
      if (f === 'examDates') {
        for (const c of new Set([...Object.keys(s.examDates ?? {}), ...Object.keys(prev.examDates ?? {})])) {
          if (s.examDates?.[c] !== prev.examDates?.[c]) changed[`examDates.${c}`] = t;
        }
      } else if (!Object.is(S[f], P[f]) && stableStringify(S[f]) !== stableStringify(P[f])) changed[f] = t;
    }
    stamp('settings', changed);
    noteChange();
  });
  const offP = useProgress.subscribe((s, prev) => {
    if (applying) return;
    if (s.byCert !== prev.byCert) {
      const t = Date.now();
      const changed: Stamps = {};
      for (const c of Object.keys(s.byCert)) {
        const a = s.byCert[c]?.plant;
        const b = prev.byCert[c]?.plant;
        // Only an edit of the same plant (its name or look) is a choice; growth is merged by its own rules.
        if (a && b && a !== b && a.plantedAt === b.plantedAt && a.replantedAt === b.replantedAt && (a.name !== b.name || stableStringify(a.look) !== stableStringify(b.look))) {
          changed[`plant.${c}`] = t;
        }
      }
      stamp('progress', changed);
    }
    noteChange();
  });
  return () => {
    offS();
    offP();
  };
}

/** Something changed on the phone: sync it soon (at most every 10 minutes while in front). */
function noteChange() {
  if (applying || changeTimer || !useSyncMeta.getState().enabled) return;
  const last = useSyncMeta.getState().lastSyncAt ?? 0;
  const wait = Math.max(SETTLE_MS, last + ACTIVE_EVERY_MS - Date.now());
  changeTimer = setTimeout(() => {
    changeTimer = null;
    void trigger();
  }, wait);
}

// ── Sign-in, a different account, deletion ───────────────────────────────
const hashOf = (userId: string) => sha256Hex(userId);

/** After a sign-in: the same account resumes; a different one on this phone asks first (account/switch). */
async function afterSignIn(info: AccountInfo) {
  const synced = useAccount.getState().syncedAccountHash;
  if (synced && synced !== hashOf(info.userId)) {
    switchPending = { info };
    useSyncStatus.setState({ offer: 'switch' });
    return;
  }
  if (useSyncMeta.getState().enabled) void trigger();
  // Never synced on this phone: the Account screen offers the preview once it is in front.
  else if (!synced) useSyncStatus.setState({ offer: 'first' });
}

/** The account was deleted: forget the sync record, this phone's link to it, and this install's id (N6). */
async function afterAccountDeleted() {
  clearTimers();
  switchPending = null;
  setMeta({ ...SYNC_OFF });
  useAccount.getState().setFacts({ syncedAccountHash: null });
  await getBackend()?.device.renew().catch(() => {});
}

/** True while the account-switch sheet should be offered. */
export function switchOffered(): boolean {
  return switchPending !== null;
}

/** The Account screen took the offer (it navigates to the preview or the switch sheet). */
export function takeOffer() {
  useSyncStatus.setState({ offer: null });
}

// ── The first sync: preview, then confirm ────────────────────────────────
export interface FirstPreview {
  case: FirstSyncPrep['case'];
  rows: { label: string; phone: string; account: string; after: string }[];
  /** The phone has progress, so the undo line shows. */
  undo: boolean;
  /** An "Undo restore" is waiting and this replaces it. */
  replacesUndo: boolean;
}

let pending: { prep: FirstSyncPrep; at: number; mode: 'first' | 'switch' } | null = null;
/** A preview older than this is stale: the screen sends the learner back to Account. */
const PREP_TTL_MS = 10 * 60_000;

const certName = (id: string) => getCertification(id)?.name ?? id;

function previewOf(prep: FirstSyncPrep): FirstPreview {
  const sum = (d: PhoneData | null): BackupSummary | null => (d ? summarize(d as unknown as SummaryInput, certName) : null);
  const phone = sum(prep.phone)!;
  const account = sum(prep.account);
  const after = sum(prep.after)!;
  const row = (label: string, k: keyof BackupSummary) => ({ label, phone: phone[k], account: account ? account[k] : '—', after: after[k] });
  return {
    case: prep.case,
    rows: [row(copy('first.row.answered'), 'answered'), row(copy('first.row.last'), 'lastStudied'), row(copy('first.row.streak'), 'bestStreak'), row(copy('first.row.exam'), 'examDate')],
    undo: !prep.phoneEmpty,
    replacesUndo: !prep.phoneEmpty && undoAvailable(useBackup.getState().undo, Date.now()) && useBackup.getState().undo?.kind !== 'sync',
  };
}

/**
 * "Sync this phone" switched on (or just signed in): read the account and
 * work out the preview. Changes nothing. With nothing on either side there
 * is nothing to preview: sync simply turns on.
 */
export async function startFirstSync(): Promise<Result<{ next: 'preview' | 'done' | 'switch' }>> {
  const b = getBackend();
  const thisApp = appVersion();
  if (!CLOUD_ON() || !b || !thisApp) return { ok: false, code: 'server' };
  const current = await b.auth.current().catch(() => null);
  if (!current) {
    await noteSessionEnded();
    return { ok: false, code: 'unauthorized' };
  }
  // This phone synced with a different account: the learner chooses first (Start fresh is the default).
  const synced = useAccount.getState().syncedAccountHash;
  if (synced && synced !== hashOf(current.userId)) {
    switchPending = { info: current };
    return { ok: true, next: 'switch' };
  }
  useSyncStatus.setState({ busy: true });
  const r = await prepareFirstSync({ port: b.sync, thisApp, now: () => Date.now(), knownCertIds: CERTIFICATIONS.map((c) => c.id), read: device.read, stamps: meta().stamps });
  useSyncStatus.setState({ busy: false });
  if (!r.ok) {
    if (r.code === 'unauthorized' || r.code === 'gone') await noteSessionEnded();
    if (r.code === 'newer' || r.code === 'unreadable' || r.code === 'toobig') return { ok: false, code: r.code === 'toobig' ? 'too_big' : r.code === 'newer' ? 'newer_app' : 'unreadable' };
    return { ok: false, code: r.code };
  }
  if (r.prep.case === 'none') {
    const done = await confirm(r.prep, 'merge');
    return done.ok ? { ok: true, next: 'done' } : done;
  }
  pending = { prep: r.prep, at: Date.now(), mode: 'first' };
  return { ok: true, next: 'preview' };
}

/** The preview the first-sync screen shows, or null (none waiting, or stale: a deep link lands here). */
export function pendingPreview(now = Date.now()): FirstPreview | null {
  if (!pending || pending.mode !== 'first' || now - pending.at > PREP_TTL_MS) return null;
  return previewOf(pending.prep);
}

/** "Not now" on the preview: nothing changes, sync stays off. */
export function dismissFirstSync() {
  pending = null;
}

async function confirm(prep: FirstSyncPrep, mode: 'merge' | 'replace'): Promise<Result> {
  const ctx = ctxOrNull();
  if (!ctx) return { ok: false, code: 'server' };
  const current = await getBackend()!.auth.current().catch(() => null);
  if (!current) {
    await noteSessionEnded();
    return { ok: false, code: 'unauthorized' };
  }
  // The 7-day undo copy, written in the same storage write as the merged stores (nothing to keep on an empty phone).
  let undo = undefined as ReturnType<typeof syncUndoSnapshot> | undefined;
  if (!prep.phoneEmpty) {
    undo = syncUndoSnapshot();
    if (!undo) return { ok: false, code: 'server' };
  }
  useSyncStatus.setState({ busy: true });
  const r = await confirmFirstSync(ctx, prep, mode, undo);
  useSyncStatus.setState({ busy: false, offline: r.kind === 'failed' });
  // Not on: the write failed or this phone's progress is too large (nothing changed).
  if (!useSyncMeta.getState().enabled) return { ok: false, code: r.kind === 'paused' ? 'too_big' : 'server' };
  // From here this phone syncs with this account (even if the first push waits for the network).
  useAccount.getState().setFacts({ syncedAccountHash: hashOf(current.userId) });
  pending = null;
  switchPending = null;
  return { ok: true };
}

/** The preview's main button (Sync this phone / Bring it here / Combine). */
export async function confirmPreview(): Promise<Result> {
  if (!pending || pending.mode !== 'first') return { ok: false, code: 'invalid' };
  return confirm(pending.prep, 'merge');
}

/** The account-switch sheet: "Start fresh" (the default) or "Keep this phone's progress". */
export async function chooseSwitch(choice: 'fresh' | 'keep'): Promise<Result> {
  const b = getBackend();
  const thisApp = appVersion();
  if (!switchPending || !CLOUD_ON() || !b || !thisApp) return { ok: false, code: 'invalid' };
  // A different learner on this phone: a new install id, so their snapshots never share one (N6).
  await b.device.renew().catch(() => {});
  setMeta({ ...SYNC_OFF });
  const r = await prepareFirstSync({ port: b.sync, thisApp, now: () => Date.now(), knownCertIds: CERTIFICATIONS.map((c) => c.id), read: device.read, stamps: { settings: {}, progress: {} } });
  if (!r.ok) {
    if (r.code === 'unauthorized' || r.code === 'gone') await noteSessionEnded();
    return { ok: false, code: r.code === 'newer' ? 'newer_app' : r.code === 'unreadable' ? 'unreadable' : r.code === 'toobig' ? 'too_big' : r.code };
  }
  return confirm(r.prep, choice === 'fresh' ? 'replace' : 'merge');
}

// ── Off, delete, undo, sign out ──────────────────────────────────────────
/** "Sync this phone" off: forget the record (turning it on again shows the preview again). */
export function turnSyncOff() {
  clearTimers();
  setMeta({ ...SYNC_OFF });
  useSyncStatus.setState({ busy: false, offline: false });
}

/** "Delete synced progress": the account's copy goes; the account and this phone's progress stay; sync turns off. */
export async function deleteSyncedProgress(): Promise<Result> {
  const b = getBackend();
  if (!CLOUD_ON() || !b) return { ok: false, code: 'server' };
  try {
    await b.sync.deleteAll();
  } catch (e) {
    const code = errorCode(e);
    if (code === 'unauthorized' || code === 'gone') await noteSessionEnded();
    return { ok: false, code };
  }
  turnSyncOff();
  return { ok: true };
}

/** "Undo sync": the phone goes back to before its first sync, and sync turns off. The account's copy stays. */
export async function undoSync(now = Date.now()): Promise<UndoOutcome> {
  turnSyncOff();
  const r = await undoRestore(now);
  return r;
}

/**
 * Sign out on this phone, from the sign-out sheet. Progress stays unless
 * the learner ticked "Remove my progress from this phone": then it is
 * cleared, with this phone's link to the account (the next account starts
 * with the preview, never a merge into someone else's progress).
 */
export async function signOutHere(opts: { removeLocal: boolean }): Promise<Result> {
  const r = await signOut('local');
  if (!r.ok) return r;
  clearTimers();
  if (opts.removeLocal) {
    removeLocalProgress();
    setMeta({ ...SYNC_OFF, stamps: { settings: {}, progress: {} } });
    useAccount.getState().setFacts({ syncedAccountHash: null });
  }
  return { ok: true };
}

/** Tests: forget everything this module holds in memory. */
export function resetSyncForTests() {
  clearTimers();
  running = null;
  again = false;
  failures = 0;
  switchPending = null;
  pending = null;
  route = '/';
  applying = 0;
  useSyncStatus.setState({ busy: false, offline: false, offer: null });
}
