/**
 * The in-memory cloud backend (spec §1.3): what tests, dev builds and the
 * screenshot build talk to until Phase 9. It plays the server's rules, so
 * the screens meet the same answers they will meet for real:
 * - email codes: 6 digits, 10 minutes, 60 s between sends, 5 wrong tries;
 * - own-rows-only accounts, Terms acceptance, sign out (this phone / all);
 * - deletion needs a sign-in from the last 10 minutes, and an Apple account
 *   needs Apple's fresh authorisation code;
 * - "Download my data" once an hour;
 * - sync snapshots with `rev` concurrency and the 1.5 MB cap (PR 7 uses it);
 * - "offline" on demand, and a log of every port call for tests.
 * The session is written through the same chunked session store a real
 * build uses (cloud/secureSession.ts), into an in-memory key store.
 *
 * Never in a store build: cloud/runtime.on.ts only creates it in a dev or
 * screenshot build, and cloud/configGuard.ts refuses it in EAS profiles.
 */
import { CODE_TTL_MS, EXPORT_EVERY_MS, maskEmail, MAX_CODE_TRIES, normalizeEmail, recentAuth, RESEND_WAIT_MS, validCode, validEmail, type Provider } from '../../engine/account';
import { utf8 } from '../../engine/sha256';
import { createChunkedSession } from '../secureSession';
import { CloudError, type AccountInfo, type BoardPort, type CloudBackend, type CloudErrorCode, type SnapshotHead, type SyncStore } from '../types';
import { createMemoryKV, type MemoryKV } from './kv';

/** The session key (Supabase names its own like this). */
const SESSION_KEY = 'sb-memory-auth-token';
/** The sync cap: a snapshot over 1.5 MB (UTF-8) is refused. */
const MAX_SNAPSHOT_BYTES = 1_500_000;

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
  /** The next call to this method fails with this code. */
  failNext(method: string, code: CloudErrorCode): void;
  kv: MemoryKV;
  /** The raw session (tokens) a test greps the app's storage and logs for. */
  session(): { userId: string; accessToken: string; refreshToken: string; authAt: number } | null;
  users(): MemoryUser[];
  /** What the AppState hook last told the backend (true = the app is in front). */
  foreground(): boolean;
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
  const codes = new Map<string, { code: string; sentAt: number; tries: number }>();
  const snapshots = new Map<string, Partial<Record<SyncStore, SnapshotHead & { state: unknown }>>>(Object.entries(opts.snapshots ?? {}));
  const lastExport = new Map<string, number>();
  const listeners = new Set<(a: AccountInfo | null) => void>();
  const calls: string[] = [];
  const failures = new Map<string, CloudErrorCode>();
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

  const info = (s: Session): AccountInfo | null => {
    const u = users.get(s.userId);
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
      throw new CloudError(forced);
    }
    if (offline) throw new CloudError('offline');
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
    // A deleted account's session is no session.
    if (session && !users.has(session.userId)) session = null;
    return session;
  };
  const needUser = async (): Promise<{ s: Session; u: MemoryUser }> => {
    const s = await current();
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
        if (scope === 'global') {
          const forced = failures.get('auth.signOut');
          if (forced) {
            failures.delete('auth.signOut');
            throw new CloudError(forced);
          }
          if (offline) throw new CloudError('offline');
        }
        await saveSession(null);
        emit();
      },
      async deleteAccount(i) {
        await enter('auth.deleteAccount');
        const { s, u } = await needUser();
        if (i.confirm !== 'DELETE') throw new CloudError('invalid', undefined, 'confirm_required');
        if (!recentAuth(s.authAt, now())) throw new CloudError('reauth_required');
        if (u.providers.includes('apple') && !i.appleAuthorizationCode) throw new CloudError('invalid', undefined, 'apple_code_required');
        users.delete(u.userId);
        snapshots.delete(u.userId);
        lastExport.delete(u.userId);
        await saveSession(null);
        emit();
      },
      async exportMyData(o) {
        await enter('auth.exportMyData');
        const { u } = await needUser();
        const last = lastExport.get(u.userId);
        if (last !== undefined && now() - last < EXPORT_EVERY_MS) {
          throw new CloudError('rate_limited', Math.ceil((last + EXPORT_EVERY_MS - now()) / 1000));
        }
        lastExport.set(u.userId, now());
        const mine = snapshots.get(u.userId) ?? {};
        const stores: Record<string, { version: number; state: unknown }> = {};
        for (const k of ['settings', 'progress'] as const) {
          const snap = mine[k];
          if (snap) stores[k] = { version: snap.storeVersion, state: snap.state };
        }
        return JSON.stringify(
          {
            app: 'aurivan',
            schema: 1,
            exportedAt: new Date(now()).toISOString(),
            appVersion: o?.appVersion ?? opts.appVersion ?? '0.0.0',
            stores,
            account: { email: u.email, providers: u.providers, createdAt: new Date(u.createdAt).toISOString(), termsVersion: u.termsVersion },
          },
          null,
          2,
        );
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
        return head;
      },
      async pull(storeName) {
        await enter('sync.pull');
        const { u } = await needUser();
        return snapshots.get(u.userId)?.[storeName] ?? null;
      },
      async push(i) {
        await enter('sync.push');
        const { u } = await needUser();
        const mine = snapshots.get(u.userId) ?? {};
        const prev = mine[i.store];
        if ((prev?.rev ?? null) !== i.expectedRev) throw new CloudError('conflict');
        const bytes = utf8(JSON.stringify(i.state)).length;
        if (bytes > MAX_SNAPSHOT_BYTES) throw new CloudError('too_big');
        const head: SnapshotHead = { store: i.store, rev: (prev?.rev ?? 0) + 1, appVersion: i.appVersion, storeVersion: i.storeVersion, updatedAt: now(), deviceId: i.deviceId };
        mine[i.store] = { ...head, state: i.state };
        snapshots.set(u.userId, mine);
        return head;
      },
      async deleteAll() {
        await enter('sync.deleteAll');
        const { u } = await needUser();
        snapshots.delete(u.userId);
      },
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
      failNext(method, code) {
        failures.set(method, code);
      },
      kv,
      session: () => (session ? { ...session } : null),
      users: () => [...users.values()].map((u) => ({ ...u, providers: [...u.providers] })),
      foreground: () => foreground,
    },
  };
  return backend;
}
