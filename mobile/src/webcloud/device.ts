/**
 * The website as a sync "device" (accounts beta §1.3): the `Device` port of
 * lib/syncCore.ts, so the website runs the SAME sync cycle, merge rules and
 * checker as the phone, into the same two rows (progress, settings).
 *
 * Plain English for the founder:
 * - The website holds a copy of the account's synced data as it last saw it
 *   (the "mirror", `kaisip_sync_mirror_v1`), app-only study included
 *   (lessons, games, badges, the plant, cards…). The website can't show
 *   those, but keeping them here means a push from the website can never
 *   drop them.
 * - What the sync cycle "reads" from this device is that mirror plus the
 *   study done on the website since (only the entries that differ from the
 *   mirror's own picture on the website, toWeb.ts webChanges), merged with
 *   the app's own merge rules. Merging only adds (union, max, newest), so
 *   nothing the phone holds can be lost.
 * - What the cycle "writes" here becomes the new mirror, and the website's
 *   own record is rewritten from it (toWeb.ts), with its older counters
 *   rebuilt. The website's other fields (theme, plant, the mock in progress,
 *   the name …) are left alone.
 * - Settings: the website takes part in the CISA exam date only (last writer
 *   wins by its stamp; a change on the website is stamped the next time the
 *   cycle looks). Every other synced setting is kept as pulled.
 * - The sync record (`kaisip_sync_v1`) has the phone's fields. None of these
 *   keys holds the session, the email or the account id (only its hash).
 *
 * Pure TypeScript: no React, no network. Storage, the page and the clock are ports.
 */
import { SYNC_OFF, type SyncMeta } from '../engine/syncMeta';
import { localSide, mergeSides, type MergeContext, type SyncedProgress } from '../engine/syncMerge';
import { streakFromDays } from '../engine/webImport';
import { dayKey } from '../engine/streak';
import type { Device, PhoneData } from '../lib/syncCore';
import { SYNC_META_KEY, SYNC_MIRROR_KEY, SYNC_UNDO_KEY, WEB_CERT } from './config';
import type { ClockPort, StoragePort } from './ports';
import { fromWeb, noChanges, toWeb, webChanges, type AccountView, type WebBank, type WebState } from './toWeb';

/** What index.html gives the device: its saved record and a few switches. */
export interface WebHost {
  /** The active profile's saved progress (its `state` in cisa_profiles_v1), as plain data. */
  readWeb(): WebState;
  /** Save this as the active profile's progress and refresh the screens. Throws if the browser refused. */
  writeWeb(next: WebState): void;
  /** The website's CISA exam date ("YYYY-MM-DD", `aurivan_exam_date`), or null. */
  examDate(): string | null;
  setExamDate(day: string | null): void;
  /** A practice set, mock or game is open: the cycle waits (deferredPull). */
  busy(): boolean;
}

export interface WebDeviceDeps {
  host: WebHost;
  /** localStorage. */
  storage: StoragePort;
  bank: WebBank;
  clock: ClockPort;
  /** The certifications the engine knows (default: CISA only). */
  knownCertIds?: readonly string[];
}

/** The mirror: the account's two stores as this browser last saw them. */
interface Mirror {
  v: 1;
  settings: Record<string, unknown>;
  progress: Record<string, unknown>;
  /** The website's exam date when last written or stamped (a different one now = changed here). */
  examDateSeen: string | null;
}

/** The undo copy for "Use the account's progress here" (§1.3): this browser's record before. */
export interface WebUndo {
  takenAt: number;
  state: WebState;
}
export const WEB_UNDO_DAYS = 7;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDER_TODAY = { day: '', answered: 0 };
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

export const BLANK_SETTINGS = (): Record<string, unknown> => ({ onboarded: true, activeCertId: WEB_CERT });
export const BLANK_PROGRESS = (): Record<string, unknown> => ({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { ...PLACEHOLDER_TODAY } });
const blankMeta = (): SyncMeta => ({ ...SYNC_OFF, lastRev: { ...SYNC_OFF.lastRev }, lastAt: { ...SYNC_OFF.lastAt }, lastPushedHash: { ...SYNC_OFF.lastPushedHash }, pausedRev: { ...SYNC_OFF.pausedRev }, stamps: { settings: {}, progress: {} } });

function parse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** The saved sync record, or a blank one when it is missing or damaged (sync is then simply off). */
export function readMeta(raw: string | null): SyncMeta {
  const v = parse(raw);
  const base = blankMeta();
  if (!isObj(v)) return base;
  const per = <T>(x: unknown, ok: (y: unknown) => y is T, fallback: { settings: T; progress: T }) =>
    isObj(x) ? { settings: ok(x.settings) ? x.settings : fallback.settings, progress: ok(x.progress) ? x.progress : fallback.progress } : fallback;
  const numOrNull = (y: unknown): y is number | null => y === null || (typeof y === 'number' && Number.isFinite(y));
  const strOrNull = (y: unknown): y is string | null => y === null || (typeof y === 'string' && y.length <= 64);
  const stampMap = (y: unknown): y is Record<string, number> => isObj(y) && Object.values(y).every((n) => typeof n === 'number' && Number.isFinite(n));
  return {
    enabled: v.enabled === true,
    accountHash: typeof v.accountHash === 'string' && /^[0-9a-f]{64}$/.test(v.accountHash) ? v.accountHash : null,
    lastRev: per(v.lastRev, numOrNull, base.lastRev),
    lastAt: per(v.lastAt, numOrNull, base.lastAt),
    lastPushedHash: per(v.lastPushedHash, strOrNull, base.lastPushedHash),
    pausedRev: per(v.pausedRev, numOrNull, base.pausedRev),
    lastSyncAt: typeof v.lastSyncAt === 'number' && Number.isFinite(v.lastSyncAt) ? v.lastSyncAt : null,
    pausedReason: v.pausedReason === 'newer' || v.pausedReason === 'unreadable' || v.pausedReason === 'toobig' ? v.pausedReason : null,
    deferredPull: v.deferredPull === true,
    stamps: per(v.stamps, stampMap, base.stamps),
  };
}

/** The account side's CISA data in the shape toWeb takes. */
export function viewOf(progress: Record<string, unknown>): AccountView {
  const byCert = isObj(progress.byCert) ? progress.byCert : {};
  const cert = (isObj(byCert[WEB_CERT]) ? byCert[WEB_CERT] : {}) as AccountView['cert'];
  const streak = isObj(progress.streak) ? progress.streak : {};
  const days = Array.isArray(streak.recentDays) ? streak.recentDays : typeof streak.lastDay === 'string' ? [streak.lastDay] : [];
  return { cert, studyDays: days.filter((d): d is string => typeof d === 'string' && DAY_RE.test(d)) };
}

export interface WebDevice extends Device {
  /** The account copy this browser holds (tests, "Download my data" offline never uses it). */
  mirror(): PhoneData;
  /** Sign out / turn sync off / another account: forget the sync record and the mirror (the website's own progress stays). */
  forget(): void;
  /** The undo copy, while it is less than 7 days old. */
  undo(): WebUndo | null;
  /** Put the website's record back from the undo copy and drop it. False when there is none. */
  restoreUndo(): boolean;
  dropUndo(): void;
}

export function createWebDevice(deps: WebDeviceDeps): WebDevice {
  const { host, storage, bank, clock } = deps;
  const knownCertIds = deps.knownCertIds ?? [WEB_CERT];
  const mctx = (): MergeContext => ({ now: clock.now(), knownCertIds });

  const loadMirror = (): Mirror => {
    const v = parse(storage.getItem(SYNC_MIRROR_KEY));
    if (isObj(v) && v.v === 1 && isObj(v.settings) && isObj(v.progress)) {
      return { v: 1, settings: v.settings, progress: v.progress, examDateSeen: typeof v.examDateSeen === 'string' && DAY_RE.test(v.examDateSeen) ? v.examDateSeen : null };
    }
    return { v: 1, settings: BLANK_SETTINGS(), progress: BLANK_PROGRESS(), examDateSeen: null };
  };
  const saveMirror = (m: Mirror) => storage.setItem(SYNC_MIRROR_KEY, JSON.stringify(m));
  const meta = (): SyncMeta => readMeta(storage.getItem(SYNC_META_KEY));
  const setMeta = (m: Partial<SyncMeta>) => storage.setItem(SYNC_META_KEY, JSON.stringify({ ...meta(), ...m }));

  const webDate = (): string | null => {
    const d = host.examDate();
    return typeof d === 'string' && DAY_RE.test(d) ? d : null;
  };

  const read = (): PhoneData => {
    const mirror = loadMirror();
    const now = clock.now();

    // Settings: the mirror, with the website's exam date. A date changed on the website is stamped now.
    const date = webDate();
    // Never stamped before the first sync (no mirror yet): a date of unknown age must not beat the account's.
    if (date !== mirror.examDateSeen && storage.getItem(SYNC_MIRROR_KEY) !== null) {
      const m = meta();
      setMeta({ stamps: { ...m.stamps, settings: { ...m.stamps.settings, [`examDates.${WEB_CERT}`]: now } } });
      saveMirror({ ...mirror, examDateSeen: date });
    }
    const examDates = { ...(isObj(mirror.settings.examDates) ? mirror.settings.examDates : {}) } as Record<string, unknown>;
    if (date) examDates[WEB_CERT] = date;
    else delete examDates[WEB_CERT];
    const settings: Record<string, unknown> = { ...BLANK_SETTINGS(), ...mirror.settings, onboarded: true };
    if (Object.keys(examDates).length) settings.examDates = examDates;
    else delete settings.examDates;

    // Progress: the mirror, plus what the website studied since (merged by the app's rules).
    const web = host.readWeb();
    const view = viewOf(mirror.progress);
    const changes = webChanges(web, toWeb(view, web, bank));
    if (noChanges(changes)) return { settings, progress: { ...mirror.progress, today: { ...PLACEHOLDER_TODAY } } };
    const appMockIds = new Set((view.cert.mocks ?? []).map((m) => m.id));
    const added = fromWeb(changes, bank, now, appMockIds);
    const streak = isObj(mirror.progress.streak) ? mirror.progress.streak : {};
    const webState = {
      byCert: { [WEB_CERT]: added.cert },
      streak: streakFromDays(added.studyDays, dayKey(now), (streak.restDay as string | null | undefined) ?? null),
    };
    const ctx = mctx();
    const mine = localSide<SyncedProgress>('progress', { ...mirror.progress, today: { ...PLACEHOLDER_TODAY } }, {}, ctx);
    const theirs = localSide<SyncedProgress>('progress', { ...webState, today: { ...PLACEHOLDER_TODAY } }, {}, ctx);
    const merged = mergeSides<SyncedProgress>('progress', mine, theirs, ctx);
    return { settings, progress: { ...(merged.state as object), today: { ...PLACEHOLDER_TODAY } } };
  };

  const undo = (): WebUndo | null => {
    const v = parse(storage.getItem(SYNC_UNDO_KEY));
    if (!isObj(v) || typeof v.takenAt !== 'number' || !isObj(v.state)) return null;
    if (clock.now() - v.takenAt > WEB_UNDO_DAYS * 86_400_000) {
      storage.removeItem(SYNC_UNDO_KEY);
      return null;
    }
    return { takenAt: v.takenAt, state: v.state };
  };

  return {
    read,

    async write(next, opts) {
      // The undo copy first (first sync): if the browser can't hold it, nothing changes.
      if (opts.undo) storage.setItem(SYNC_UNDO_KEY, JSON.stringify({ takenAt: clock.now(), state: host.readWeb() } satisfies WebUndo));
      // Whatever the learner did since `next` was worked out is merged in (writes here are immediate).
      const target = opts.rebase ? opts.rebase(read()) : next;
      if (!target) throw new Error('rebase failed');
      const settings = target.settings as Record<string, unknown>;
      const progress = target.progress as Record<string, unknown>;
      const dates = isObj(settings.examDates) ? settings.examDates : {};
      const date = typeof dates[WEB_CERT] === 'string' && DAY_RE.test(dates[WEB_CERT] as string) ? (dates[WEB_CERT] as string) : null;
      saveMirror({ v: 1, settings: { ...settings }, progress: { ...progress }, examDateSeen: date });
      host.writeWeb(toWeb(viewOf(progress), host.readWeb(), bank));
      if (date !== webDate()) host.setExamDate(date);
    },

    meta,
    setMeta,
    busy: () => host.busy(),

    mirror() {
      const m = loadMirror();
      return { settings: m.settings, progress: m.progress };
    },

    forget() {
      storage.removeItem(SYNC_META_KEY);
      storage.removeItem(SYNC_MIRROR_KEY);
    },

    undo,

    restoreUndo() {
      const u = undo();
      if (!u) return false;
      host.writeWeb(u.state);
      storage.removeItem(SYNC_UNDO_KEY);
      return true;
    },

    dropUndo() {
      storage.removeItem(SYNC_UNDO_KEY);
    },
  };
}
