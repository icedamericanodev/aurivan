/**
 * The in-memory cloud backend (spec §1.3): what tests, dev builds and the
 * screenshot build talk to until Phase 9. It plays the server's rules, so
 * the screens meet the same answers they will meet for real:
 * - email codes: 6 digits, 10 minutes, 60 s between sends, 5 wrong tries;
 * - own-rows-only accounts, Terms acceptance, sign out (this phone / all);
 * - deletion needs a sign-in from the last 10 minutes; Apple's code is
 *   optional (the server's Apple revoke is best-effort), and a second call
 *   for a deleted account is `gone`, while no session is `unauthorized`;
 * - "Download my data" once an hour (no recent sign-in needed);
 * - signing out on this phone always forgets the session, even offline;
 * - sync snapshots like public.sync_snapshots (PR 7): own rows only, a
 *   server-set `rev` with optimistic concurrency (insert at null, update at
 *   the expected rev, else 'conflict'), the size cap, 60 writes per store per
 *   hour ('rate_limited' with Retry-After), writes only after the Terms, a
 *   uuid device id, a JSON round trip on the wire (no shared objects), and
 *   the export's stores; plus a reply lost after a write (dropNextReply);
 * - "offline" on demand, and a log of every port call for tests.
 * The session is written through the same chunked session store a real
 * build uses (cloud/secureSession.ts), into an in-memory key store.
 *
 * Never in a store build: cloud/runtime.on.ts only creates it in a dev build
 * or the WEB screenshot build, and cloud/configGuard.ts refuses it in EAS
 * profiles.
 */
import { CODE_TTL_MS, EXPORT_EVERY_MS, maskEmail, MAX_CODE_TRIES, normalizeEmail, recentAuth, RESEND_WAIT_MS, validCode, validEmail, type Provider } from '../../engine/account';
import { utf8 } from '../../engine/sha256';
import { getDeviceId, isDeviceId, renewDeviceId } from '../deviceId';
import { createChunkedSession } from '../secureSession';
import { CloudError, type AccountInfo, type BoardPort, type CloudBackend, type CloudErrorCode, type RandomPort, type SnapshotHead, type SyncStore } from '../types';
import { createMemoryKV, type MemoryKV } from './kv';

/** The session key (Supabase names its own like this). */
const SESSION_KEY = 'sb-memory-auth-token';
/** The sync cap: a snapshot over 1.5 MB (UTF-8) is refused. */
const MAX_SNAPSHOT_BYTES = 1_500_000;
/** The server's write limit per store (20261013000000_sync_snapshots.sql). */
const SYNC_WRITES_PER_HOUR = 60;
const HOUR_MS = 3_600_000;
/** The fields a backup file needs that a snapshot never holds (export-my-data's snapshotsToStores). */
const BACKUP_ONLY: Record<SyncStore, Record<string, unknown>> = { settings: { onboarded: true }, progress: { today: { day: '', answered: 0 } } };
type Snapshot = SnapshotHead & { state: unknown };
/** What crosses the network: JSON text, so the app and the "server" never share an object. */
const wire = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
/** The server's Retry-After for "Download my data": always the full hour. */
const EXPORT_RETRY_AFTER_SEC = 3600;
/** The server's checks on its inputs (export-my-data's SEMVER, apple.ts isAppleCode). */
const SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const APPLE_CODE = /^[A-Za-z0-9._~+/=-]{8,1024}$/;

export interface MemoryUser {
  userId: string;
  email: string;
  providers: Provider[];
  termsVersion: string | null;
  createdAt: number;
}

export interface MemorySeed {
  users?: MemoryUser[];
  /** Signed in on this phone as this user, last signed in at `authAt`. */
  signedIn?: { userId: string; authAt: number } | null;
  /** Synced snapshots, by user id (a second device's, for the screenshots). */
  snapshots?: Record<string, Partial<Record<SyncStore, SnapshotHead & { state: unknown }>>>;
  /** Every code sent is this one (screenshots); otherwise random. */
  fixedCode?: string;
  /** Start offline. */
  offline?: boolean;
}

export interface MemoryOptions extends MemorySeed {
  now?: () => number;
  random?: () => number;
  /** The app version written into "Download my data". */
  appVersion?: string;
  /** The secure key store the session lives in. */
  kv?: MemoryKV;
}

export interface MemoryControl {
  setOffline(on: boolean): void;
  /** The last code sent to this address (tests type it in). */
  lastCode(email: string): string | null;
  /** Every port call, in order ("auth.sendEmailCode", …). */
  calls: string[];
  /** The next call to this method fails with this code (and detail, e.g. 'apple_code_invalid'). */
  failNext(method: string, code: CloudErrorCode, detail?: string): void;
  /**
   * The next call to this method does its work on the "server", then its
   * reply is lost (the app sees 'offline'). Models a dropped connection
   * after the server already deleted the account.
   */
  dropNextReply(method: string): void;
  kv: MemoryKV;
  /** The raw session (tokens) a test greps the app's storage and logs for. */
  session(): { userId: string; accessToken: string; refreshToken: string; authAt: number } | null;
  users(): MemoryUser[];
  /** What the AppState hook last told the backend (true = the app is in front). */
  foreground(): boolean;
  /** The "server's" snapshots for a user (tests check what was pushed). */
  snapshots(userId: string): Partial<Record<SyncStore, Snapshot>>;
  /** Another device writes a snapshot directly on the "server" (tests, shots): rev +1, no checks. */
  writeSnapshot(userId: string, store: SyncStore, s: { state: unknown; appVersion?: string; storeVersion?: number; deviceId?: string }): Snapshot;
}

export type MemoryBackend = CloudBackend & { control: MemoryControl };

interface Session {
  userId: string;
  accessToken: string;
  refreshToken: string;
  authAt: number;
}

export function createMemoryBackend(opts: MemoryOptions = {}): MemoryBackend {
  const now = opts.now ?? (() => Date.now());
  const random = opts.random ?? Math.random;
  const kv = opts.kv ?? createMemoryKV();
  const store = createChunkedSession(kv);
  const users = new Map<string, MemoryUser>((opts.users ?? []).map((u) => [u.userId, { ...u }]));
  /** Deleted accounts: a session the phone still holds for one of these gets 'gone' from the server. */
  const deleted = new Map<string, MemoryUser>();
  const codes = new Map<string, { code: string; sentAt: number; tries: number }>();
  const snapshots = new Map<string, Partial<Record<SyncStore, Snapshot>>>(Object.entries(opts.snapshots ?? {}).map(([k, v]) => [k, wire(v)]));
  /** The server's rate window per user and store. */
  const writes = new Map<string, { start: number; n: number }>();
  const randomPort: RandomPort = { bytes: (n) => Uint8Array.from({ length: n }, () => Math.floor(random() * 256)) };
  const lastExport = new Map<string, number>();
  const listeners = new Set<(a: AccountInfo | null) => void>();
  const calls: string[] = [];
  const failures = new Map<string, { code: CloudErrorCode; detail?: string }>();
  const dropped = new Set<string>();
  let offline = opts.offline ?? false;
  let foreground = true;
  // The session as last read or written (the store is the truth; this saves re-reading it).
  let session: Session | null = null;
  let ready: Promise<void> = Promise.resolve();

  const token = (prefix: string) => `${prefix}-${Math.floor(random() * 1e12).toString(36)}${Math.floor(random() * 1e12).toString(36)}`;

  const saveSession = async (s: Session | null) => {
    session = s;
    if (s) await store.setItem(SESSION_KEY, JSON.stringify(s));
    else await store.removeItem(SESSION_KEY);
  };
  if (opts.signedIn && users.has(opts.signedIn.userId)) {
    ready = saveSession({ userId: opts.signedIn.userId, authAt: opts.signedIn.authAt, accessToken: token('mem-at'), refreshToken: token('mem-rt') });
  }

  // The phone's view: a session it holds for an account deleted on the server still reads (like a real
  // client's stored session); only server calls find out ('gone').
  const info = (s: Session): AccountInfo | null => {
    const u = users.get(s.userId) ?? deleted.get(s.userId);
    if (!u) return null;
    return { userId: u.userId, emailMasked: maskEmail(u.email), providers: [...u.providers], authAt: s.authAt, termsVersion: u.termsVersion };
  };
  const emit = () => {
    const a = session ? info(session) : null;
    listeners.forEach((cb) => cb(a));
  };

  /** Every port call: logged, then offline / forced failures, like a network round trip. */
  const enter = async (method: string) => {
    calls.push(method);
    await ready;
    const forced = failures.get(method);
    if (forced) {
      failures.delete(method);
      throw new CloudError(forced.code, undefined, forced.detail);
    }
    if (offline) throw new CloudError('offline');
  };
  /** After a call's work: its reply may be "lost" (dropNextReply). */
  const leave = (method: string) => {
    if (dropped.delete(method)) throw new CloudError('offline');
  };
  const current = async (): Promise<Session | null> => {
    const raw = await store.getItem(SESSION_KEY);
    if (!raw) {
      session = null;
      return null;
    }
    try {
      session = JSON.parse(raw) as Session;
    } catch {
      session = null;
    }
    // A session for an account that never existed here is no session.
    if (session && !users.has(session.userId) && !deleted.has(session.userId)) session = null;
    return session;
  };
  /** The server's requireUser: no session → unauthorized; a deleted account → gone. */
  const needUser = async (): Promise<{ s: Session; u: MemoryUser }> => {
    const s = await current();
    if (s && deleted.has(s.userId)) throw new CloudError('gone');
    const u = s ? users.get(s.userId) : undefined;
    if (!s || !u) throw new CloudError('unauthorized');
    return { s, u };
  };

  const makeCode = () =>
    opts.fixedCode ??
    String(Math.floor(random() * 1_000_000)).padStart(6, '0');

  const sendCode = (email: string) => {
    const e = normalizeEmail(email);
    if (!validEmail(e)) throw new CloudError('invalid', undefined, 'email');
    const prev = codes.get(e);
    const t = now();
    if (prev && t - prev.sentAt < RESEND_WAIT_MS) throw new CloudError('rate_limited', Math.ceil((prev.sentAt + RESEND_WAIT_MS - t) / 1000));
    codes.set(e, { code: makeCode(), sentAt: t, tries: 0 });
  };
  /** Check a code; the right one is used up. */
  const checkCode = (email: string, code: string) => {
    const e = normalizeEmail(email);
    const c = codes.get(e);
    if (!c || now() - c.sentAt > CODE_TTL_MS) throw new CloudError('invalid', undefined, 'code_expired');
    if (c.tries >= MAX_CODE_TRIES) throw new CloudError('invalid', undefined, 'code_toomany');
    if (!validCode(code) || code !== c.code) {
      c.tries += 1;
      throw new CloudError('invalid', undefined, c.tries >= MAX_CODE_TRIES ? 'code_toomany' : 'code_wrong');
    }
    codes.delete(e);
    return e;
  };
  const userByEmail = (email: string) => [...users.values()].find((u) => u.email === email);
  const signInAs = async (u: MemoryUser): Promise<AccountInfo> => {
    await saveSession({ userId: u.userId, authAt: now(), accessToken: token('mem-at'), refreshToken: token('mem-rt') });
    emit();
    return info(session!)!;
  };
  const newUser = (email: string, provider: Provider): MemoryUser => {
    const u: MemoryUser = { userId: token('mem-user'), email, providers: [provider], termsVersion: null, createdAt: now() };
    users.set(u.userId, u);
    return u;
  };
  /** A fake consent step for Apple or Google: the same demo account each time. */
  const providerSignIn = async (p: 'apple' | 'google') => {
    const email = p === 'apple' ? 'demo-learner@privaterelay.appleid.com' : 'maya@example.com';
    let u = userByEmail(email);
    if (!u) u = newUser(email, p);
    else if (!u.providers.includes(p)) u.providers.push(p);
    return signInAs(u);
  };

  const notBuilt = () => Promise.reject(new CloudError('server', undefined, 'not_built'));
  // The board arrives in PR 8: every call is a server error until then.
  const board = new Proxy({} as BoardPort, {
    get: (_t, name) => () => {
      calls.push(`board.${String(name)}`);
      return notBuilt();
    },
  });

  const backend: MemoryBackend = {
    auth: {
      async current() {
        calls.push('auth.current');
        await ready;
        const s = await current();
        return s ? info(s) : null;
      },
      onChange(cb) {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
      async sendEmailCode(email) {
        await enter('auth.sendEmailCode');
        sendCode(email);
      },
      async verifyEmailCode(email, code) {
        await enter('auth.verifyEmailCode');
        const e = checkCode(email, code);
        let u = userByEmail(e);
        if (!u) u = newUser(e, 'email');
        else if (!u.providers.includes('email')) u.providers.push('email');
        return signInAs(u);
      },
      async signInWithApple() {
        await enter('auth.signInWithApple');
        return providerSignIn('apple');
      },
      async signInWithGoogle() {
        await enter('auth.signInWithGoogle');
        return providerSignIn('google');
      },
      async reauthenticate(p, code) {
        await enter('auth.reauthenticate');
        const { s, u } = await needUser();
        if (!u.providers.includes(p)) throw new CloudError('invalid', undefined, 'provider');
        if (p === 'email') {
          // No code: send one. With a code: check it.
          if (code === undefined) {
            sendCode(u.email);
            return {};
          }
          checkCode(u.email, code);
        }
        await saveSession({ ...s, authAt: now() });
        emit();
        return p === 'apple' ? { appleAuthorizationCode: token('mem-apple-code') } : {};
      },
      async acceptTerms(v) {
        await enter('auth.acceptTerms');
        const { u } = await needUser();
        if (!/^\d{4}-\d{2}$/.test(v.termsVersion) || v.ageConfirmed !== true) throw new CloudError('invalid');
        u.termsVersion = v.termsVersion;
        emit();
      },
      async signOut(scope) {
        // Signing out on THIS phone works offline (it only forgets the session); everywhere needs the server.
        calls.push('auth.signOut');
        await ready;
        const forced = failures.get('auth.signOut');
        if (forced) failures.delete('auth.signOut');
        if (scope === 'global') {
          if (forced) throw new CloudError(forced.code, undefined, forced.detail);
          if (offline) throw new CloudError('offline');
        }
        await saveSession(null);
        emit();
        // This phone's session is gone even when a local sign-out then reports a failure (AuthPort.signOut).
        if (forced) throw new CloudError(forced.code, undefined, forced.detail);
      },
      async deleteAccount(i) {
        // The server's order: who (unauthorized / gone), a recent sign-in, the body, then the work.
        await enter('auth.deleteAccount');
        const { s, u } = await needUser();
        if (!recentAuth(s.authAt, now())) throw new CloudError('reauth_required');
        if (i.confirm !== 'DELETE') throw new CloudError('invalid', undefined, 'confirm_required');
        const code = i.appleAuthorizationCode;
        if (code !== undefined && !APPLE_CODE.test(code)) throw new CloudError('invalid', undefined, 'apple_code_invalid');
        // An Apple account without a code is deleted too: the server's Apple revoke is best-effort.
        users.delete(u.userId);
        deleted.set(u.userId, u);
        snapshots.delete(u.userId);
        lastExport.delete(u.userId);
        // The server can't touch the phone's storage: the app signs out locally after this.
        leave('auth.deleteAccount');
      },
      async exportMyData(o) {
        await enter('auth.exportMyData');
        const { u } = await needUser();
        const last = lastExport.get(u.userId);
        if (last !== undefined && now() - last < EXPORT_EVERY_MS) throw new CloudError('rate_limited', EXPORT_RETRY_AFTER_SEC);
        const mine = snapshots.get(u.userId) ?? {};
        const stores: Record<string, { version: number; state: unknown }> = {};
        for (const k of ['settings', 'progress'] as const) {
          const snap = mine[k];
          // As backup-file stores, with the two device-only fields a backup needs (the file restores).
          if (snap) stores[k] = { version: snap.storeVersion, state: { ...BACKUP_ONLY[k], ...(snap.state as object) } };
        }
        const version = o?.appVersion ?? opts.appVersion;
        const text = JSON.stringify(
          {
            app: 'aurivan',
            schema: 1,
            exportedAt: new Date(now()).toISOString(),
            appVersion: typeof version === 'string' && SEMVER.test(version) ? version : null,
            stores,
            account: { email: u.email, providers: u.providers, createdAt: new Date(u.createdAt).toISOString(), termsVersion: u.termsVersion },
          },
          null,
          2,
        );
        // The hour is used only once the file is ready (the server claims its slot last).
        lastExport.set(u.userId, now());
        leave('auth.exportMyData');
        return text;
      },
      setForeground(active) {
        calls.push('auth.setForeground');
        foreground = active;
      },
    },
    sync: {
      async head(storeName) {
        await enter('sync.head');
        const { u } = await needUser();
        const snap = snapshots.get(u.userId)?.[storeName];
        if (!snap) return null;
        const { state: _state, ...head } = snap;
        return wire(head);
      },
      async pull(storeName) {
        await enter('sync.pull');
        const { u } = await needUser();
        const snap = snapshots.get(u.userId)?.[storeName];
        return snap ? wire(snap) : null;
      },
      async push(i) {
        await enter('sync.push');
        const { u } = await needUser();
        // The table's checks and the profile policy (Terms accepted, Phase 6 review N10).
        if (!u.termsVersion) throw new CloudError('invalid', undefined, 'terms');
        if (i.store !== 'settings' && i.store !== 'progress') throw new CloudError('invalid', undefined, 'store');
        if (!SEMVER.test(i.appVersion) || !Number.isInteger(i.storeVersion) || i.storeVersion < 1 || i.storeVersion > 1000 || !isDeviceId(i.deviceId)) {
          throw new CloudError('invalid', undefined, 'row');
        }
        if (typeof i.state !== 'object' || i.state === null || Array.isArray(i.state)) throw new CloudError('invalid', undefined, 'state');
        const mine = snapshots.get(u.userId) ?? {};
        const prev = mine[i.store];
        // Optimistic concurrency: insert only when there is no row; update only at the expected rev.
        if ((prev?.rev ?? null) !== i.expectedRev) throw new CloudError('conflict');
        const bytes = utf8(JSON.stringify(i.state)).length;
        if (bytes > MAX_SNAPSHOT_BYTES) throw new CloudError('too_big');
        // 60 writes per store per hour, in the server's own window.
        const key = `${u.userId}:${i.store}`;
        const t = now();
        const w = writes.get(key);
        const win = !w || t - w.start > HOUR_MS ? { start: t, n: 1 } : { start: w.start, n: w.n + 1 };
        if (win.n > SYNC_WRITES_PER_HOUR) throw new CloudError('rate_limited', Math.max(1, Math.ceil((win.start + HOUR_MS - t) / 1000)));
        writes.set(key, win);
        const head: SnapshotHead = { store: i.store, rev: (prev?.rev ?? 0) + 1, appVersion: i.appVersion, storeVersion: i.storeVersion, updatedAt: t, deviceId: i.deviceId };
        mine[i.store] = { ...head, state: wire(i.state) };
        snapshots.set(u.userId, mine);
        leave('sync.push');
        return { ...head };
      },
      async deleteAll() {
        await enter('sync.deleteAll');
        const { u } = await needUser();
        snapshots.delete(u.userId);
        leave('sync.deleteAll');
      },
    },
    device: {
      // The secure key store's install id (a real build: expo-secure-store, Phase 9).
      id: () => getDeviceId(kv, randomPort),
      renew: () => renewDeviceId(kv, randomPort),
    },
    board,
    control: {
      setOffline(on) {
        offline = on;
      },
      lastCode(email) {
        return codes.get(normalizeEmail(email))?.code ?? null;
      },
      calls,
      failNext(method, code, detail) {
        failures.set(method, { code, detail });
      },
      dropNextReply(method) {
        dropped.add(method);
      },
      kv,
      session: () => (session ? { ...session } : null),
      users: () => [...users.values()].map((u) => ({ ...u, providers: [...u.providers] })),
      foreground: () => foreground,
      snapshots: (userId) => wire(snapshots.get(userId) ?? {}),
      writeSnapshot(userId, store, w) {
        const mine = snapshots.get(userId) ?? {};
        const prev = mine[store];
        const snap: Snapshot = {
          store,
          rev: (prev?.rev ?? 0) + 1,
          appVersion: w.appVersion ?? '1.18.0',
          storeVersion: w.storeVersion ?? 1,
          updatedAt: now(),
          deviceId: w.deviceId ?? '6f1c2b9e-4d3a-4c1b-9a7e-2f5d8c0b1a3e',
          state: wire(w.state),
        };
        mine[store] = snap;
        snapshots.set(userId, mine);
        return wire(snap);
      },
    },
  };
  return backend;
}
