/**
 * Uplift Phase 6 (accounts, built OFF): the cloud plumbing that has no
 * screen. Spec PHASE6_8.md §2.7 "Security tests (PR 6)":
 * - the chunked session store (#2),
 * - the device id,
 * - the build-time config guard (G9, and #5: Google without Apple on iOS),
 * - the flag and the backend holder with the flag off,
 * - the memory backend playing the server's rules (codes, re-auth, export).
 */
import { getBackend, setBackendForTests } from '../cloud/backend';
import { getDeviceId, isDeviceId, uuidV4 } from '../cloud/deviceId';
import { assertCloudConfig, looksSecret } from '../cloud/configGuard';
import { CLOUD, PROVIDERS } from '../cloud/flag';
import { createMemoryBackend } from '../cloud/memory/backend';
import { createMemoryKV } from '../cloud/memory/kv';
import { chunkText, CHUNK_BYTES, createChunkedSession } from '../cloud/secureSession';
import { CloudError } from '../cloud/types';
import { TERMS_VERSION } from '../engine/account';
import { utf8 } from '../engine/sha256';

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof CloudError ? `${e.code}${e.detail ? `:${e.detail}` : ''}` : 'other';
  }
};

// CI also runs the whole suite with the flag ON and the memory backend (spec A1: "the existing suites run with
// the flag on and signed out"); this block checks whichever mode the run is in.
const onRun = process.env.EXPO_PUBLIC_AURIVAN_CLOUD === '1';
describe('the flag', () => {
  (onRun ? it.skip : it)('is off by default (every build today): CLOUD is false and no backend loads', () => {
    expect(process.env.EXPO_PUBLIC_AURIVAN_CLOUD).toBeUndefined();
    expect(CLOUD).toBe(false);
    expect(PROVIDERS).toEqual([]);
    setBackendForTests(undefined);
    expect(getBackend()).toBeNull();
  });

  (onRun ? it : it.skip)('when on (the flag-on CI run), loads the memory backend in a dev build', () => {
    expect(CLOUD).toBe(true);
    setBackendForTests(undefined);
    expect(getBackend()).not.toBeNull();
  });
});

describe('runtime.on: the memory backend never reaches a phone (SEC S9)', () => {
  const KEYS = ['EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND', 'EXPO_PUBLIC_AURIVAN_SHOTS'] as const;
  const g = globalThis as { __DEV__?: boolean };
  /** runtime.on's backend for these env values, __DEV__ and platform (a fresh module each time). */
  const backendFor = (env: Partial<Record<(typeof KEYS)[number], string>>, dev: boolean, os: string) => {
    const saved = KEYS.map((k) => process.env[k]);
    const savedDev = g.__DEV__;
    try {
      for (const k of KEYS) {
        if (env[k] === undefined) delete process.env[k];
        else process.env[k] = env[k];
      }
      g.__DEV__ = dev;
      let out: unknown;
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({ Platform: { OS: os } }));
        jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.17.1' } } }));
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        out = (require('../cloud/runtime.on') as typeof import('../cloud/runtime.on')).backend;
      });
      return out;
    } finally {
      KEYS.forEach((k, i) => (saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i])));
      g.__DEV__ = savedDev;
      jest.dontMock('react-native');
      jest.dontMock('expo-constants');
    }
  };
  const memory = { EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND: 'memory', EXPO_PUBLIC_AURIVAN_SHOTS: '1' };

  it('a release build on a phone never builds it, even with every variable set (an EAS environment)', () => {
    expect(backendFor(memory, false, 'android')).toBeNull();
    expect(backendFor(memory, false, 'ios')).toBeNull();
  });

  it('only a dev build, or the web screenshot export, does', () => {
    expect(backendFor(memory, false, 'web')).not.toBeNull();
    expect(backendFor({ EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND: 'memory' }, true, 'android')).not.toBeNull();
    expect(backendFor({ EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND: 'memory' }, false, 'web')).toBeNull();
    expect(backendFor({}, true, 'web')).toBeNull();
  });
});

describe('chunked secure session (spec #2)', () => {
  // A 6 KB session: four chunks of at most 1,800 bytes.
  const session = JSON.stringify({ access_token: 'a'.repeat(3000), refresh_token: 'r'.repeat(2500), user: { id: 'u1' } });

  it('round-trips a 6 KB session over 4 chunks, every write "this device only"', async () => {
    const kv = createMemoryKV();
    const s = createChunkedSession(kv);
    expect(session.length).toBeGreaterThan(5500);
    await s.setItem('sb-x-auth-token', session);
    const keys = Object.keys(kv.dump());
    expect(keys.filter((k) => /\.\d+$/.test(k))).toHaveLength(4);
    for (const v of Object.values(kv.dump())) expect(utf8(v).length).toBeLessThanOrEqual(CHUNK_BYTES);
    expect(await s.getItem('sb-x-auth-token')).toBe(session);
    expect(kv.writes.length).toBeGreaterThan(0);
    for (const w of kv.writes) expect(w.opts).toEqual({ thisDeviceOnly: true });
    // The manifest is written LAST.
    expect(kv.writes[kv.writes.length - 1].key).toMatch(/\.m$/);
  });

  it('keys are safe for a secure store (letters, digits, . - _)', async () => {
    const kv = createMemoryKV();
    await createChunkedSession(kv).setItem('sb:weird/key name', 'x');
    for (const k of Object.keys(kv.dump())) expect(k).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it('a missing chunk reads as signed out and wipes the keys', async () => {
    const kv = createMemoryKV();
    const s = createChunkedSession(kv);
    await s.setItem('k', session);
    const chunk = Object.keys(kv.dump()).find((k) => k.endsWith('.2'))!;
    await kv.deleteItem(chunk);
    expect(await s.getItem('k')).toBeNull();
    expect(kv.dump()).toEqual({});
  });

  it('a changed chunk (a write cut off half-way) reads as signed out', async () => {
    const kv = createMemoryKV();
    const s = createChunkedSession(kv);
    await s.setItem('k', session);
    const chunk = Object.keys(kv.dump()).find((k) => k.endsWith('.1'))!;
    await kv.setItem(chunk, 'z'.repeat(1800), { thisDeviceOnly: true });
    expect(await s.getItem('k')).toBeNull();
    expect(kv.dump()).toEqual({});
  });

  it('a shorter session removes the old extra chunks; remove wipes all', async () => {
    const kv = createMemoryKV();
    const s = createChunkedSession(kv);
    await s.setItem('k', session);
    await s.setItem('k', 'short');
    expect(await s.getItem('k')).toBe('short');
    expect(Object.keys(kv.dump())).toHaveLength(2);
    await s.removeItem('k');
    expect(kv.dump()).toEqual({});
    expect(await s.getItem('k')).toBeNull();
  });

  // Code review R3 / R4 (Phase 6 fix round): a write cut off half-way, and sign-out after one.
  const crashingAfter = (kv: ReturnType<typeof createMemoryKV>, writes: number) => {
    let n = 0;
    return {
      ...kv,
      async setItem(k: string, v: string, o: { thisDeviceOnly: true }) {
        if (n++ === writes) throw new Error('crash');
        return kv.setItem(k, v, o);
      },
    };
  };

  it('R3: a write cut off half-way leaves the OLD session readable, never a mix', async () => {
    const kv = createMemoryKV();
    const s = createChunkedSession(kv);
    const old = 'o'.repeat(4000);
    await s.setItem('k', old);
    await expect(createChunkedSession(crashingAfter(kv, 1)).setItem('k', 'n'.repeat(4000))).rejects.toThrow('crash');
    expect(await s.getItem('k')).toBe(old);
    // The next write succeeds and clears what the cut-off one left.
    await s.setItem('k', 'new');
    expect(await s.getItem('k')).toBe('new');
    expect(Object.keys(kv.dump())).toHaveLength(2);
  });

  it('a read in the middle of a write sees the old session (the manifest switches last)', async () => {
    const kv = createMemoryKV();
    const s = createChunkedSession(kv);
    await s.setItem('k', session);
    const seen: (string | null)[] = [];
    const spying = {
      ...kv,
      async setItem(k: string, v: string, o: { thisDeviceOnly: true }) {
        if (!k.endsWith('.m')) seen.push(await s.getItem('k'));
        return kv.setItem(k, v, o);
      },
    };
    await createChunkedSession(spying).setItem('k', 'x'.repeat(5000));
    expect(seen.length).toBeGreaterThan(1);
    for (const v of seen) expect(v).toBe(session);
    expect(await s.getItem('k')).toBe('x'.repeat(5000));
  });

  it('R4: sign-out after a cut-off write leaves no piece of the session behind', async () => {
    const kv = createMemoryKV();
    const s = createChunkedSession(kv);
    await s.setItem('k', 'o'.repeat(100)); // one chunk
    // Writes 3 of the new value's chunks, then stops: no new manifest.
    await expect(createChunkedSession(crashingAfter(kv, 3)).setItem('k', 'r'.repeat(5000))).rejects.toThrow('crash');
    await s.removeItem('k');
    expect(kv.dump()).toEqual({});
  });

  it('sign-out with no session costs a handful of key-store calls, not one per possible chunk', async () => {
    const kv = createMemoryKV();
    let calls = 0;
    const counting = {
      getItem: (k: string) => (calls++, kv.getItem(k)),
      setItem: (k: string, v: string, o: { thisDeviceOnly: true }) => (calls++, kv.setItem(k, v, o)),
      deleteItem: (k: string) => (calls++, kv.deleteItem(k)),
    };
    await createChunkedSession(counting).removeItem('k');
    expect(calls).toBeLessThanOrEqual(4);
  });

  it('never splits a character between chunks', () => {
    const text = '😀'.repeat(1000);
    const parts = chunkText(text);
    expect(parts.join('')).toBe(text);
    for (const p of parts) expect(utf8(p).length).toBeLessThanOrEqual(CHUNK_BYTES);
  });
});

describe('device id', () => {
  it('a random v4 UUID, kept "this device only" and reused', async () => {
    const kv = createMemoryKV();
    let n = 0;
    const random = { bytes: (len: number) => Uint8Array.from({ length: len }, () => (n++ * 37) & 255) };
    const id = await getDeviceId(kv, random);
    expect(isDeviceId(id)).toBe(true);
    expect(await getDeviceId(kv, random)).toBe(id);
    expect(kv.writes).toEqual([{ key: 'aurivan.device', opts: { thisDeviceOnly: true } }]);
    expect(uuidV4(new Uint8Array(16))).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('a phone restored from a backup (no secure store) gets a new id', async () => {
    const random = { bytes: (len: number) => Uint8Array.from({ length: len }, (_, i) => i + 1) };
    const a = await getDeviceId(createMemoryKV(), random);
    const b = await getDeviceId(createMemoryKV({ 'aurivan.device': 'not-a-uuid' }), random);
    expect(isDeviceId(a) && isDeviceId(b)).toBe(true);
  });
});

describe('build-time config guard (G9 and friends)', () => {
  const on = {
    EXPO_PUBLIC_AURIVAN_CLOUD: '1',
    EXPO_PUBLIC_SUPABASE_URL: 'https://abc.example.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_x',
    EXPO_PUBLIC_PRIVACY_URL: 'https://example.com/privacy.html',
    EXPO_PUBLIC_TERMS_URL: 'https://example.com/terms.html',
  };

  it('flag unset: off, nothing else needed', () => {
    expect(assertCloudConfig({})).toEqual({ enabled: false, providers: [], backend: null });
    expect(assertCloudConfig({ EAS_BUILD_PROFILE: 'production' }).enabled).toBe(false);
  });

  it('G9: the memory backend in the production profile fails the build (flag on or off)', () => {
    expect(() => assertCloudConfig({ EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND: 'memory' })).toThrow(/memory backend/);
    expect(() => assertCloudConfig({ ...on, EAS_BUILD_PROFILE: 'production', AURIVAN_CLOUD_GO_LIVE_ACK: 'yes', EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND: 'memory' })).toThrow(/memory backend/);
    expect(() => assertCloudConfig({ ...on, EAS_BUILD_PROFILE: 'preview', EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND: 'memory' })).toThrow(/memory backend/);
    // Local dev and the screenshot build (no EAS profile) may use it.
    expect(assertCloudConfig({ EXPO_PUBLIC_AURIVAN_CLOUD: '1', EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND: 'memory' }).backend).toBe('memory');
    expect(assertCloudConfig({ EXPO_PUBLIC_AURIVAN_CLOUD: '1', EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND: 'memory', EAS_BUILD_PROFILE: 'development' }).backend).toBe('memory');
  });

  it('production with the flag on needs the owner’s go-live acknowledgement', () => {
    expect(() => assertCloudConfig({ ...on, EAS_BUILD_PROFILE: 'production' })).toThrow(/GO_LIVE_ACK/);
    expect(assertCloudConfig({ ...on, EAS_BUILD_PROFILE: 'production', AURIVAN_CLOUD_GO_LIVE_ACK: 'yes' }).enabled).toBe(true);
  });

  it('the backend URL must be https and a publishable key present', () => {
    expect(() => assertCloudConfig({ ...on, EXPO_PUBLIC_SUPABASE_URL: 'http://abc.example.co' })).toThrow(/https/);
    expect(() => assertCloudConfig({ ...on, EXPO_PUBLIC_SUPABASE_URL: undefined })).toThrow(/https/);
    expect(() => assertCloudConfig({ ...on, EXPO_PUBLIC_SUPABASE_ANON_KEY: ' ' })).toThrow(/publishable/);
  });

  it('UX H1: with the real backend, the Privacy policy and Terms links must be https', () => {
    for (const k of ['EXPO_PUBLIC_PRIVACY_URL', 'EXPO_PUBLIC_TERMS_URL'] as const) {
      expect(() => assertCloudConfig({ ...on, [k]: undefined })).toThrow(new RegExp(k));
      expect(() => assertCloudConfig({ ...on, [k]: '' })).toThrow(new RegExp(k));
      expect(() => assertCloudConfig({ ...on, [k]: 'http://example.com/x' })).toThrow(new RegExp(k));
    }
    // The memory backend (dev, the web screenshot build) may run without them.
    expect(assertCloudConfig({ EXPO_PUBLIC_AURIVAN_CLOUD: '1', EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND: 'memory' }).backend).toBe('memory');
  });

  it('a secret-looking EXPO_PUBLIC value fails the build', () => {
    const secretKey = ['sb', 'secret', 'abc'].join('_');
    const role = ['service', 'role'].join('_');
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const serviceJwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ role })}.sig`;
    const anonJwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ role: 'anon' })}.sig`;
    expect(looksSecret(secretKey)).toBe(true);
    expect(looksSecret(serviceJwt)).toBe(true);
    expect(looksSecret(anonJwt)).toBe(false);
    expect(() => assertCloudConfig({ ...on, EXPO_PUBLIC_SUPABASE_ANON_KEY: serviceJwt })).toThrow(/looks like a secret/);
    expect(() => assertCloudConfig({ EXPO_PUBLIC_SOMETHING: secretKey })).toThrow(/looks like a secret/);
  });

  it('spec #5: Google without Apple on iOS fails the build (App Store 4.8); Android may', () => {
    expect(() => assertCloudConfig({ ...on, EAS_BUILD_PLATFORM: 'ios', EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS: 'email,google' })).toThrow(/4\.8/);
    expect(() => assertCloudConfig({ ...on, EAS_BUILD_PLATFORM: 'ios', EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS: 'google' })).toThrow(/4\.8/);
    // No EAS platform (a local `expo run:android`): not treated as iOS. Every store build is an EAS build.
    expect(assertCloudConfig({ ...on, EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS: 'email,google' }).providers).toEqual(['email', 'google']);
    expect(assertCloudConfig({ ...on, EAS_BUILD_PLATFORM: 'android', EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS: 'email,google' }).providers).toEqual(['email', 'google']);
    expect(assertCloudConfig({ ...on, EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS: 'email' }).providers).toEqual(['email']);
  });

  it('refuses a flag value that would silently mean off, and an unknown backend', () => {
    expect(() => assertCloudConfig({ EXPO_PUBLIC_AURIVAN_CLOUD: 'true' })).toThrow(/must be "1"/);
    expect(() => assertCloudConfig({ ...on, EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND: 'firebase' })).toThrow(/unknown/);
  });
});

describe('the memory backend plays the server’s rules', () => {
  let t = Date.UTC(2026, 9, 12, 10);
  const now = () => t;
  const make = () => createMemoryBackend({ now, appVersion: '1.17.0' });

  it('email codes: 6 digits, 60 s between sends, 10 minutes, 5 wrong tries', async () => {
    const b = make();
    expect(await codeOf(b.auth.sendEmailCode('not an email'))).toBe('invalid:email');
    await b.auth.sendEmailCode('Maya@Example.com');
    const code = b.control.lastCode('maya@example.com')!;
    expect(code).toMatch(/^\d{6}$/);
    expect(await codeOf(b.auth.sendEmailCode('maya@example.com'))).toBe('rate_limited');
    const wrong = code === '000000' ? '111111' : '000000';
    expect(await codeOf(b.auth.verifyEmailCode('maya@example.com', wrong))).toBe('invalid:code_wrong');
    const a = await b.auth.verifyEmailCode('maya@example.com', code);
    expect(a.emailMasked).toBe('m•••@example.com');
    expect(a.termsVersion).toBeNull();
    // A used code is gone.
    expect(await codeOf(b.auth.verifyEmailCode('maya@example.com', code))).toBe('invalid:code_expired');

    t += 61_000;
    await b.auth.sendEmailCode('maya@example.com');
    for (let i = 0; i < 4; i++) expect(await codeOf(b.auth.verifyEmailCode('maya@example.com', wrong))).toBe('invalid:code_wrong');
    expect(await codeOf(b.auth.verifyEmailCode('maya@example.com', wrong))).toBe('invalid:code_toomany');
    expect(await codeOf(b.auth.verifyEmailCode('maya@example.com', b.control.lastCode('maya@example.com')!))).toBe('invalid:code_toomany');

    t += 61_000;
    await b.auth.sendEmailCode('maya@example.com');
    t += 10 * 60_000 + 1;
    expect(await codeOf(b.auth.verifyEmailCode('maya@example.com', b.control.lastCode('maya@example.com')!))).toBe('invalid:code_expired');
  });

  it('the session lives in the secure store (chunked), never in the clear elsewhere', async () => {
    const b = make();
    await b.auth.sendEmailCode('maya@example.com');
    await b.auth.verifyEmailCode('maya@example.com', b.control.lastCode('maya@example.com')!);
    const s = b.control.session()!;
    expect(JSON.stringify(b.control.kv.dump())).toContain(s.accessToken);
    for (const w of b.control.kv.writes) expect(w.opts).toEqual({ thisDeviceOnly: true });
  });

  it('deleting: the server’s order (who, recent sign-in, body); Apple’s code is optional but must look right', async () => {
    const b = make();
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'DELETE' }))).toBe('unauthorized');
    await b.auth.signInWithApple();
    await b.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    t += 11 * 60_000;
    // A stale sign-in is refused before the body is looked at, like the server.
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'nope' as 'DELETE' }))).toBe('reauth_required');
    const { appleAuthorizationCode } = await b.auth.reauthenticate('apple');
    expect(appleAuthorizationCode).toMatch(/^[A-Za-z0-9._~+/=-]{8,}$/);
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'nope' as 'DELETE' }))).toBe('invalid:confirm_required');
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'DELETE', appleAuthorizationCode: 'has spaces' }))).toBe('invalid:apple_code_invalid');
    expect(b.control.users()).toHaveLength(1);
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'DELETE', appleAuthorizationCode }))).toBe('ok');
    expect(b.control.users()).toEqual([]);
    // The phone still holds its session until the app signs out; the server says the account is gone.
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'DELETE' }))).toBe('gone');
    expect(await codeOf(b.auth.exportMyData())).toBe('gone');
    await b.auth.signOut('local');
    expect(await b.auth.current()).toBeNull();
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'DELETE' }))).toBe('unauthorized');
  });

  it('an Apple account without a code (Android, the web) is deleted too: the Apple revoke is best-effort', async () => {
    const b = make();
    await b.auth.signInWithApple();
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'DELETE' }))).toBe('ok');
    expect(b.control.users()).toEqual([]);
  });

  it('dropNextReply: the server does the work, the app hears "offline"', async () => {
    const b = make();
    await b.auth.signInWithGoogle();
    b.control.dropNextReply('auth.deleteAccount');
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'DELETE' }))).toBe('offline');
    expect(b.control.users()).toEqual([]);
  });

  it('signing out on this phone always forgets the session: offline, or when the call then reports a failure', async () => {
    const b = make();
    await b.auth.signInWithGoogle();
    b.control.setOffline(true);
    expect(await codeOf(b.auth.signOut('local'))).toBe('ok');
    expect(await b.auth.current()).toBeNull();
    expect(b.control.kv.dump()).toEqual({});
    b.control.setOffline(false);
    await b.auth.signInWithGoogle();
    b.control.failNext('auth.signOut', 'server');
    expect(await codeOf(b.auth.signOut('local'))).toBe('server');
    expect(await b.auth.current()).toBeNull();
    expect(b.control.kv.dump()).toEqual({});
  });

  it('re-auth by email: send a code to the account’s address, then check it', async () => {
    const b = make();
    await b.auth.sendEmailCode('maya@example.com');
    await b.auth.verifyEmailCode('maya@example.com', b.control.lastCode('maya@example.com')!);
    t += 30 * 60_000;
    await b.auth.reauthenticate('email');
    await b.auth.reauthenticate('email', b.control.lastCode('maya@example.com')!);
    expect((await b.auth.current())!.authAt).toBe(t);
  });

  it('offline: every call fails with offline, and nothing changes', async () => {
    const b = make();
    b.control.setOffline(true);
    expect(await codeOf(b.auth.sendEmailCode('maya@example.com'))).toBe('offline');
    expect(await codeOf(b.auth.signInWithGoogle())).toBe('offline');
    // Signing out on this phone works offline; everywhere needs the server.
    expect(await codeOf(b.auth.signOut('local'))).toBe('ok');
    expect(await codeOf(b.auth.signOut('global'))).toBe('offline');
  });

  it('Download my data: the backup envelope plus the account, once an hour', async () => {
    const b = make();
    await b.auth.signInWithGoogle();
    const file = JSON.parse(await b.auth.exportMyData());
    expect(file).toMatchObject({ app: 'aurivan', schema: 1, appVersion: '1.17.0', account: { email: 'maya@example.com', providers: ['google'] } });
    // The server's export takes { appVersion } for the envelope.
    t += 60 * 60_000;
    expect(JSON.parse(await b.auth.exportMyData({ appVersion: '1.18.0' })).appVersion).toBe('1.18.0');
    // Like the server: Retry-After is always the full hour.
    await b.auth.exportMyData().catch((e: CloudError) => expect(e).toMatchObject({ code: 'rate_limited', retryAfterSec: 3600 }));
    t += 60 * 60_000;
    // Like the server: a missing or odd app version is null, never made up.
    expect(JSON.parse(await b.auth.exportMyData({ appVersion: '1.17.0<script>' })).appVersion).toBeNull();
    // No recent sign-in needed (a day-old one exports).
    t += 24 * 60 * 60_000;
    expect(await codeOf(b.auth.exportMyData())).toBe('ok');
  });

  it('a failed export does not use up the hour', async () => {
    const b = make();
    await b.auth.signInWithGoogle();
    b.control.failNext('auth.exportMyData', 'server');
    expect(await codeOf(b.auth.exportMyData())).toBe('server');
    expect(await codeOf(b.auth.exportMyData())).toBe('ok');
  });

  it('sync (for PR 7): Terms first, rev concurrency and the size cap', async () => {
    const b = make();
    await b.auth.signInWithGoogle();
    const push = (expectedRev: number | null, state: unknown = { a: 1 }) =>
      b.sync.push({ store: 'progress', expectedRev, storeVersion: 1, appVersion: '1.17.0', deviceId: '6f1c2b9e-4d3a-4c1b-9a7e-2f5d8c0b1a3e', state });
    // No writes until the Terms are accepted (the server's profile policy, Phase 6 review N10).
    expect(await codeOf(push(null))).toBe('invalid:terms');
    await b.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    expect((await push(null)).rev).toBe(1);
    expect(await codeOf(push(null))).toBe('conflict');
    expect((await push(1)).rev).toBe(2);
    expect(await codeOf(push(2, { big: 'x'.repeat(1_500_001) }))).toBe('too_big');
    expect((await b.sync.head('progress'))!.rev).toBe(2);
    await b.sync.deleteAll();
    expect(await b.sync.head('progress')).toBeNull();
  });

  it('the board (PR 8) answers: signed out, the default scope shows nothing to read', async () => {
    const b = make();
    expect(await b.board.settings()).toEqual({ postingOpen: true, guidelinesVersion: '2026-11', readScope: 'signed_in' });
    expect((await b.board.feed({ cert: 'cisa', tab: 'top' })).items).toEqual([]);
    expect(await codeOf(b.board.me())).toBe('unauthorized');
  });
});
