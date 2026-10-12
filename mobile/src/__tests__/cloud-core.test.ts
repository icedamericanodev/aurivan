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

describe('the flag is off by default (every build today)', () => {
  it('CLOUD is false and no backend loads', () => {
    expect(process.env.EXPO_PUBLIC_AURIVAN_CLOUD).toBeUndefined();
    expect(CLOUD).toBe(false);
    expect(PROVIDERS).toEqual([]);
    setBackendForTests(undefined);
    expect(getBackend()).toBeNull();
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
  const on = { EXPO_PUBLIC_AURIVAN_CLOUD: '1', EXPO_PUBLIC_SUPABASE_URL: 'https://abc.example.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_x' };

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
    expect(() => assertCloudConfig({ ...on, EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS: 'email,google' })).toThrow(/4\.8/);
    expect(() => assertCloudConfig({ ...on, EAS_BUILD_PLATFORM: 'ios', EXPO_PUBLIC_AURIVAN_CLOUD_PROVIDERS: 'google' })).toThrow(/4\.8/);
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

  it('deleting needs a recent sign-in; Apple accounts need Apple’s fresh code', async () => {
    const b = make();
    await b.auth.signInWithApple();
    await b.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    t += 11 * 60_000;
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'DELETE' }))).toBe('reauth_required');
    const { appleAuthorizationCode } = await b.auth.reauthenticate('apple');
    expect(appleAuthorizationCode).toBeTruthy();
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'DELETE' }))).toBe('invalid:apple_code');
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'DELETE', appleAuthorizationCode }))).toBe('ok');
    expect(await b.auth.current()).toBeNull();
    // A second call for a deleted account: unauthorized (the app treats it as done).
    expect(await codeOf(b.auth.deleteAccount({ confirm: 'DELETE', appleAuthorizationCode }))).toBe('unauthorized');
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
    expect(await codeOf(b.auth.exportMyData())).toBe('rate_limited');
    t += 60 * 60_000;
    expect(await codeOf(b.auth.exportMyData())).toBe('ok');
  });

  it('sync (for PR 7): rev concurrency and the size cap', async () => {
    const b = make();
    await b.auth.signInWithGoogle();
    const push = (expectedRev: number | null, state: unknown = { a: 1 }) =>
      b.sync.push({ store: 'progress', expectedRev, storeVersion: 1, appVersion: '1.17.0', deviceId: 'd', state });
    expect((await push(null)).rev).toBe(1);
    expect(await codeOf(push(null))).toBe('conflict');
    expect((await push(1)).rev).toBe(2);
    expect(await codeOf(push(2, { big: 'x'.repeat(1_500_001) }))).toBe('too_big');
    expect((await b.sync.head('progress'))!.rev).toBe(2);
    await b.sync.deleteAll();
    expect(await b.sync.head('progress')).toBeNull();
  });

  it('the board is not built yet (PR 8): every call is a server error', async () => {
    const b = make();
    expect(await codeOf(b.board.settings())).toBe('server:not_built');
  });
});
