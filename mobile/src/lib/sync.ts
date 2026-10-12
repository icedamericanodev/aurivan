/**
 * Sync: the phone-side glue (Uplift Phase 7, built OFF; spec §3.1, §3.5).
 * lib/syncCore.ts does one sync cycle against ports; this file decides WHEN,
 * wires it to the real stores, and offers the screens their actions.
 *
 * When a sync runs (one at a time; triggers that arrive meanwhile are
 * coalesced into one more run, and a failed run leaves the retry to its
 * backoff):
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
 * Safety rules (Phase 7 review):
 * - every cycle first checks that the account signed in now is the one this
 *   phone's sync record belongs to (`accountHash`); a different one never
 *   syncs, even after a relaunch: the account-switch sheet asks first, and
 *   its "Not now" turns sync off here (CR B2, SEC B1, QA B1);
 * - turning sync off, signing out, removing this phone's progress, Undo
 *   sync, Delete synced progress and the first sync itself stop a running
 *   cycle and wait for it first, and no cycle starts while they act
 *   (`exclusive`; CR B3, N2);
 * - the store write merges in whatever the learner did while a sync was on
 *   the network, and a quiz opened meanwhile still makes the pull wait
 *   (lib/backup.ts writeSynced; CR B1).
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
import { summarize, undoAvailable, type BackupSummary, type SummaryInput, type UndoSnapshot } from '../engine/backup';
import { sha256Hex } from '../engine/sha256';
import { stableStringify, SYNCED_SETTINGS, type Stamps } from '../engine/syncMerge';
import { dayKey } from '../engine/streak';
import { useAccount } from '../store/account';
import { useBackup } from '../store/backup';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { SYNC_OFF, useSyncMeta, useSyncStatus, type SyncMeta } from '../store/sync';
import { cloudReady, deleteAccount, noteSessionEnded, onAccountEvent, removeAllLocal, signOut, type Result } from './account';
import { phoneStores, syncUndoSnapshot, undoRestore, whenHydrated, writeSynced, type UndoOutcome } from './backup';
import { shortDate } from './format';
import { confirmFirstSync, hashOf as sideHash, phoneSides, prepareFirstSync, syncCycle, type CycleCtx, type CycleResult, type Device, type FirstSyncPrep, type PhoneData } from './syncCore';

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
  return {
    enabled: s.enabled,
    accountHash: s.accountHash ?? null,
    lastRev: s.lastRev,
    lastAt: s.lastAt ?? { settings: null, progress: null },
    lastPushedHash: s.lastPushedHash,
    pausedRev: s.pausedRev ?? { settings: null, progress: null },
    lastSyncAt: s.lastSyncAt,
    pausedReason: s.pausedReason,
    deferredPull: s.deferredPull,
    stamps: s.stamps,
  };
};
const setMeta = (m: Partial<SyncMeta>) => useSyncMeta.getState().setMeta(m);

/** The route on screen now (root layout's SyncRouteWatch tells us). */
let route = '/';
/** > 0 only while sync itself sets the stores (synchronously): those changes are not the learner's (no stamps, no sync scheduled). */
let applying = 0;
const quiet = (apply: () => void) => {
  applying++;
  try {
    apply();
  } finally {
    applying--;
  }
};

const device: Device = {
  read: () => phoneStores() as unknown as PhoneData,
  write: (next, opts) => writeSynced(next as { settings: Record<string, unknown>; progress: Record<string, unknown> }, { ...(opts as Parameters<typeof writeSynced>[1]), quiet }),
  meta,
  setMeta,
  busy: () => BUSY_ROUTE.test(route),
};

const appVersion = (): string | null => Constants.expoConfig?.version || null;

// ── One at a time ────────────────────────────────────────────────────────
let running: Promise<void> | null = null;
let again = false;
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let changeTimer: ReturnType<typeof setTimeout> | null = null;
/** The longest an action waits for a stopped cycle (its in-flight request) before going ahead. */
const EXCLUSIVE_WAIT_MS = 15_000;
/** Bumped to stop a running cycle (it checks before its next write or push). */
let epoch = 0;
/** > 0 while an action has the phone (exclusive): no cycle starts. */
let held = 0;
/** A different account signed in and the learner hasn't chosen yet (account/switch). */
let switchPending: { info: AccountInfo } | null = null;

function clearTimers() {
  if (retryTimer) clearTimeout(retryTimer);
  if (changeTimer) clearTimeout(changeTimer);
  retryTimer = null;
  changeTimer = null;
}

/** Stop the running cycle (if any) before its next write or push, and any waiting retry. */
function stopRunning() {
  epoch++;
  clearTimers();
}

/**
 * Run an action with no sync running or starting meanwhile: the running
 * cycle is stopped, then waited for (it finishes a storage write already in
 * flight, records nothing, and returns). Then `fn` runs alone.
 */
async function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  held++;
  stopRunning();
  try {
    // Wait for the running cycle, but never for ever: a request that never answers must not block
    // sign-out, removal or account deletion. A stopped cycle writes and records nothing afterwards.
    // `running` changes while we wait, so read it fresh on every turn (a function call is never narrowed).
    const runningNow = () => running;
    if (runningNow()) {
      let late = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<void>((res) => { timer = setTimeout(() => { late = true; res(); }, EXCLUSIVE_WAIT_MS); });
      try {
        for (let r = runningNow(); r && !late; r = runningNow()) await Promise.race([r, deadline]);
      } finally {
        clearTimeout(timer);
      }
    }
    return await fn();
  } finally {
    held--;
  }
}

function ctxOrNull(): CycleCtx | null {
  const b = getBackend();
  const thisApp = appVersion();
  if (!CLOUD_ON() || !b || !thisApp) return null;
  const at = epoch;
  return {
    port: b.sync,
    device,
    deviceId: () => b.device.id(),
    thisApp,
    now: () => Date.now(),
    knownCertIds: CERTIFICATIONS.map((c) => c.id),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    // Stopped (off, sign-out, remove, undo, delete, another account) or signed out since it started.
    alive: () => at === epoch && useAccount.getState().signedIn,
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
  /** The last try failed for another reason than the connection (UX review P1). */
  retrying?: boolean;
  pausedReason: SyncMeta['pausedReason'];
  lastSyncAt: number | null;
  now: number;
}

/** What the status line says, as one word (a screen reader hears it again only when this changes: UX review H3). */
export type StatusKind = 'signin' | 'off' | 'busy' | 'paused' | 'offline' | 'retry' | 'synced';
export function statusKind(s: StatusInput): StatusKind {
  if (!s.signedIn) return s.expired ? 'signin' : 'off';
  if (!s.enabled) return s.busy ? 'busy' : 'off';
  if (s.pausedReason) return 'paused';
  if (s.offline) return 'offline';
  if (s.retrying) return 'retry';
  if (s.busy || s.lastSyncAt === null) return 'busy';
  return 'synced';
}

/** The Sync section's one status line (spec §3.3). Pure. */
export function statusLine(s: StatusInput): string {
  if (!s.signedIn) return copy(s.expired ? 'sync.status.signin' : 'sync.status.off');
  // Reading the account for the first-sync preview counts as syncing too.
  if (!s.enabled) return copy(s.busy ? 'sync.status.busy' : 'sync.status.off');
  if (s.pausedReason) return copy(s.pausedReason === 'newer' ? 'sync.paused.newer' : s.pausedReason === 'unreadable' ? 'sync.paused.unreadable' : 'sync.paused.toobig');
  if (s.offline) return copy('sync.status.offline');
  // Not the connection: a server problem, too many conflicts or writes (UX review P1).
  if (s.retrying) return copy('sync.status.retry');
  // On, and the first sync hasn't finished yet: it is on its way.
  if (s.busy || s.lastSyncAt === null) return copy('sync.status.busy');
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
/** Run a sync now (or once more after the one running). Never rejects. Nothing starts while an action has the phone. */
export function trigger(): Promise<void> {
  if (held) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    let ok = true;
    do {
      again = false;
      ok = await runOnce();
      // A failed run never runs again at once: its backoff timer owns the retry (CR N5).
    } while (again && ok && !held);
  })()
    .catch(() => {})
    .finally(() => {
      running = null;
    });
  return running;
}

const hashOf = (userId: string) => sha256Hex(userId);

/** One cycle. False when it failed (the retry is scheduled); true otherwise. */
async function runOnce(): Promise<boolean> {
  const ctx = ctxOrNull();
  if (!ctx || !useSyncMeta.getState().enabled || !useAccount.getState().signedIn || switchPending) return true;
  // The account signed in NOW must be the one this record syncs with, checked before every
  // cycle (a relaunch never sends a sign-in event). A local session read, no network.
  const cur = await getBackend()!.auth.current().catch(() => null);
  if (!cur || !ctx.alive!()) return true; // no session: the session check says "Sign in again"
  const h = hashOf(cur.userId);
  const m = meta();
  if (m.accountHash !== h) {
    // A record from before the account was kept in it, for this very account: adopt it.
    if (m.accountHash === null && useAccount.getState().syncedAccountHash === h) setMeta({ accountHash: h });
    else {
      // Never sync into (or from) another learner's account: ask first.
      switchPending = { info: cur };
      useSyncStatus.setState({ offer: 'switch', busy: false });
      return true;
    }
  }
  useSyncStatus.setState({ busy: true });
  let r: CycleResult;
  try {
    r = await syncCycle(ctx);
  } catch {
    r = { kind: 'failed', code: 'server' };
  }
  const failedCode = r.kind === 'failed' ? r.code : null;
  useSyncStatus.setState({ busy: false, offline: failedCode === 'offline', retrying: failedCode !== null && failedCode !== 'offline' });
  if (r.kind === 'failed') {
    if (r.code === 'unauthorized' || r.code === 'gone') {
      useSyncStatus.setState({ retrying: false });
      await noteSessionEnded();
      return false;
    }
    if (!ctx.alive!()) return false;
    // A conflict that kept losing, offline, a server problem, too many writes: try again later.
    const wait = Math.max(BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)], (r.retryAfterSec ?? 0) * 1000);
    failures++;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void trigger();
    }, wait);
    return false;
  }
  failures = 0;
  return true;
}

/** "Sync now" (also "Try again" after a pause: the pause is forgotten first, so an unreadable copy is read once more). */
export function syncNow(): Promise<void> {
  if (useSyncMeta.getState().pausedReason) setMeta({ pausedReason: null, pausedRev: { settings: null, progress: null } });
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
    stopRunning();
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
/** After a sign-in: the same account resumes; a different one on this phone asks first (account/switch). */
async function afterSignIn(info: AccountInfo) {
  // Whatever was running belonged to the session before this one.
  stopRunning();
  const synced = useAccount.getState().syncedAccountHash;
  if (synced && synced !== hashOf(info.userId)) {
    switchPending = { info };
    useSyncStatus.setState({ offer: 'switch' });
    return;
  }
  // runOnce checks the record's own account too, so a mismatch there still asks first.
  if (useSyncMeta.getState().enabled) void trigger();
  // Never synced on this phone: the Account screen offers the preview once it is in front.
  else if (!synced) useSyncStatus.setState({ offer: 'first' });
}

/** The account was deleted: forget the sync record, this phone's link to it, and this install's id (N6). */
async function afterAccountDeleted() {
  stopRunning();
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
  /** The phone holds something, so a 7-day undo copy is kept and the undo line shows. */
  undo: boolean;
  /** An "Undo restore" is waiting and this replaces it. */
  replacesUndo: boolean;
}

let pending: { prep: FirstSyncPrep; at: number; mode: 'first' | 'switch'; forAccount: string } | null = null;
/** A preview older than this is stale: the screen sends the learner back to Account. */
const PREP_TTL_MS = 10 * 60_000;

const certName = (id: string) => getCertification(id)?.name ?? id;

/** A valid "Undo sync" copy is already waiting (from this phone's earlier first sync, within 7 days). */
const syncUndoWaiting = (now = Date.now()) => {
  const slot = useBackup.getState().undo;
  return Boolean(slot && slot.kind === 'sync' && undoAvailable(slot, now));
};

function previewOf(prep: FirstSyncPrep): FirstPreview {
  const sum = (d: PhoneData | null): BackupSummary | null => (d ? summarize(d as unknown as SummaryInput, certName) : null);
  const phone = sum(prep.phone)!;
  const account = sum(prep.account);
  const after = sum(prep.after)!;
  const row = (label: string, k: keyof BackupSummary) => ({ label, phone: phone[k], account: account ? account[k] : '—', after: after[k] });
  return {
    case: prep.case,
    rows: [row(copy('first.row.answered'), 'answered'), row(copy('first.row.last'), 'lastStudied'), row(copy('first.row.streak'), 'bestStreak'), row(copy('first.row.exam'), 'examDate')],
    // An earlier "Undo sync" copy is kept as it is (QA B3); the line still shows, it still applies.
    undo: prep.keepUndo || syncUndoWaiting(),
    replacesUndo: prep.keepUndo && undoAvailable(useBackup.getState().undo, Date.now()) && useBackup.getState().undo?.kind !== 'sync',
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
  // The account read must still be the one signed in now (a sign-out + sign-in meanwhile: drop it).
  const forAccount = hashOf(current.userId);
  const still = await b.auth.current().catch(() => null);
  if (!still || hashOf(still.userId) !== forAccount) return { ok: false, code: 'unauthorized' };
  if (r.prep.case === 'none') {
    const done = await exclusive(() => confirm(r.prep, 'merge', forAccount));
    if (done.ok) await trigger();
    return done.ok ? { ok: true, next: 'done' } : done;
  }
  pending = { prep: r.prep, at: Date.now(), mode: 'first', forAccount };
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

/** The first sync's write (always inside `exclusive`). Sync is then on for the account signed in now. */
async function confirm(prep: FirstSyncPrep, mode: 'merge' | 'replace', forAccount: string): Promise<Result> {
  const ctx = ctxOrNull();
  if (!ctx) return { ok: false, code: 'server' };
  const current = await getBackend()!.auth.current().catch(() => null);
  if (!current) {
    await noteSessionEnded();
    return { ok: false, code: 'unauthorized' };
  }
  // The prep was read from THIS account: never confirm another learner's copy into the one signed in now.
  if (hashOf(current.userId) !== forAccount) return { ok: false, code: 'unauthorized' };
  // The 7-day undo copy, written in the same storage write as the merged stores, unless the phone holds
  // nothing (CR N8: anything at all counts). A merge keeps an earlier "Undo sync" copy as it is: it
  // still puts back the phone from before it FIRST synced (QA B3). "Start fresh" always takes a new
  // one: this phone's progress now may hold more than that copy, and it is about to be replaced.
  let undo: UndoSnapshot | undefined;
  if (prep.keepUndo && !(mode === 'merge' && syncUndoWaiting())) {
    const snap = syncUndoSnapshot();
    if (!snap) return { ok: false, code: 'server' };
    undo = snap;
  }
  useSyncStatus.setState({ busy: true });
  const accountHash = hashOf(current.userId);
  // A different account than the one this phone last synced with (or none since a wipe): a new install
  // id first, so two learners' snapshots never share one, whatever path led here (security review S4).
  if (useAccount.getState().syncedAccountHash !== accountHash) await getBackend()!.device.renew().catch(() => {});
  const r = await confirmFirstSync(ctx, prep, mode, undo, { accountHash, cycle: false });
  useSyncStatus.setState({ busy: false, offline: false, retrying: false });
  // Not on: the write failed or this phone's progress is too large (nothing changed).
  if (!useSyncMeta.getState().enabled) return { ok: false, code: r.kind === 'paused' ? 'too_big' : 'server' };
  // From here this phone syncs with this account (even if the first push waits for the network).
  useAccount.getState().setFacts({ syncedAccountHash: accountHash });
  pending = null;
  switchPending = null;
  return { ok: true };
}

/** The preview's main button (Sync this phone / Bring it here / Combine). Then the first push, in the queue. */
export async function confirmPreview(): Promise<Result> {
  if (!pending || pending.mode !== 'first') return { ok: false, code: 'invalid' };
  const { prep, forAccount } = pending;
  const r = await exclusive(() => confirm(prep, 'merge', forAccount));
  if (r.ok) await trigger();
  return r;
}

/** True when "Start fresh" on the switch sheet would replace an undo copy waiting on this phone (the sheet says so). */
export function switchReplacesUndo(now = Date.now()): boolean {
  return undoAvailable(useBackup.getState().undo, now);
}

/** The account-switch sheet: "Start fresh" (the default) or "Keep this phone's progress". */
export async function chooseSwitch(choice: 'fresh' | 'keep'): Promise<Result> {
  const b = getBackend();
  const thisApp = appVersion();
  if (!switchPending || !CLOUD_ON() || !b || !thisApp) return { ok: false, code: 'invalid' };
  const forAccount = hashOf(switchPending.info.userId);
  const r = await exclusive(async (): Promise<Result> => {
    // A different learner on this phone: confirm() gives this install a new id before anything is sent (N6).
    setMeta({ ...SYNC_OFF });
    const prep = await prepareFirstSync({ port: b.sync, thisApp, now: () => Date.now(), knownCertIds: CERTIFICATIONS.map((c) => c.id), read: device.read, stamps: { settings: {}, progress: {} } });
    if (!prep.ok) {
      if (prep.code === 'unauthorized' || prep.code === 'gone') await noteSessionEnded();
      return { ok: false, code: prep.code === 'newer' ? 'newer_app' : prep.code === 'unreadable' ? 'unreadable' : prep.code === 'toobig' ? 'too_big' : prep.code };
    }
    return confirm(prep.prep, choice === 'fresh' ? 'replace' : 'merge', forAccount);
  });
  if (r.ok) await trigger();
  return r;
}

/** "Not now" (or close) on the switch sheet: sync turns off on this phone, and nothing else changes (lead decision, CR B2). */
export function declineSwitch() {
  switchPending = null;
  turnSyncOff();
  useSyncStatus.setState({ offer: null });
}

// ── Off, delete, undo, sign out ──────────────────────────────────────────
/** "Sync this phone" off: forget the record (turning it on again shows the preview again). A running cycle stops before its next write or push. */
export function turnSyncOff() {
  stopRunning();
  setMeta({ ...SYNC_OFF });
  useSyncStatus.setState({ busy: false, offline: false, retrying: false });
}

/** "Delete synced progress": the account's copy goes; the account and this phone's progress stay; sync turns off. */
export async function deleteSyncedProgress(): Promise<Result> {
  const b = getBackend();
  if (!CLOUD_ON() || !b) return { ok: false, code: 'server' };
  return exclusive(async (): Promise<Result> => {
    try {
      await b.sync.deleteAll();
    } catch (e) {
      const code = errorCode(e);
      if (code === 'unauthorized' || code === 'gone') await noteSessionEnded();
      return { ok: false, code };
    }
    turnSyncOff();
    return { ok: true };
  });
}

/**
 * "Undo sync": the phone goes back to before its first sync, then sync
 * turns off. The account's copy stays. Only a successful undo turns sync
 * off: if it fails, nothing changed and sync stays as it was (QA B5).
 */
export async function undoSync(now = Date.now()): Promise<UndoOutcome> {
  return exclusive(async () => {
    const r = await undoRestore(now);
    if (r.kind === 'ok') turnSyncOff();
    return r;
  });
}

/**
 * True when everything on this phone is already in the account: sync is on,
 * not paused, and the phone's data is exactly what was last pushed or pulled.
 * The sign-out sheet warns before removing progress when it isn't (UX H1).
 */
export function phoneInAccount(): boolean {
  if (!CLOUD_ON() || !useSyncMeta.getState().enabled || !useAccount.getState().signedIn) return false;
  const m = meta();
  if (m.pausedReason) return false;
  try {
    const sides = phoneSides(device.read(), m.stamps, { now: Date.now(), knownCertIds: CERTIFICATIONS.map((c) => c.id) });
    return sideHash(sides.settings) === m.lastPushedHash.settings && sideHash(sides.progress) === m.lastPushedHash.progress;
  } catch {
    return false;
  }
}

/**
 * Before "Remove my progress from this phone": while this phone syncs, send
 * what it has to the account first (UX H1). Then says whether anything is
 * still only on this phone (the sheet's warning). Never rejects.
 */
export async function prepareRemove(): Promise<{ unsynced: boolean }> {
  if (CLOUD_ON() && useSyncMeta.getState().enabled && useAccount.getState().signedIn && !switchPending) {
    failures = 0;
    await trigger();
  }
  return { unsynced: !phoneInAccount() };
}

/**
 * Sign out on this phone, from the sign-out sheet. Progress stays unless
 * the learner ticked "Remove my progress from this phone": then the phone
 * goes back to a fresh install's study state (lib/account.ts
 * removeAllLocal), with this phone's link to the account and the sync
 * record, and gets a new install id (the next account starts with the
 * preview, never a merge into someone else's progress). A running sync is
 * stopped and waited for first, so nothing it pulled lands afterwards.
 */
export async function signOutHere(opts: { removeLocal: boolean }): Promise<Result> {
  return exclusive(async (): Promise<Result> => {
    const r = await signOut('local');
    if (!r.ok) return r;
    switchPending = null;
    pending = null;
    if (opts.removeLocal) await removeAllLocal();
    return { ok: true };
  });
}

/** Delete the account (account/delete), with no sync running while it does: nothing pulled lands after "also remove from this phone". */
export function deleteAccountHere(i: Parameters<typeof deleteAccount>[0]): Promise<Result> {
  return exclusive(() => deleteAccount(i));
}

/** Tests: forget everything this module holds in memory. */
export function resetSyncForTests() {
  stopRunning();
  running = null;
  again = false;
  failures = 0;
  held = 0;
  switchPending = null;
  pending = null;
  route = '/';
  applying = 0;
  useSyncStatus.setState({ busy: false, offline: false, retrying: false, offer: null });
}
