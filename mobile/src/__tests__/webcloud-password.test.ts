/**
 * Passwords in the shared sign-in client (src/webcloud/auth.ts; owner
 * decisions 28 Nov 2026, design PASSWORD_SIGN_IN_DESIGN.md §4) against the
 * fake Supabase (jest/webcloud-fakes.ts), which plays GoTrue v2.199.0's
 * password rules and the database's password guard (rule 4: a first
 * password needs a session under 10 minutes old, else a 500). Covers:
 * - sign-up: rules checked locally first (the word lists loaded first, fail
 *   closed), a code (the password NOT sent), then the password saved with
 *   the fresh session; partial success; "already your password";
 * - password sign-in: one answer for a wrong password and an unknown
 *   address, the human check, rate limits, offline, NFKC, the "please
 *   change it" hint;
 * - forgot password: no link, the same answer for every address and a
 *   one-a-minute limit for all of them (LOW-1); other sessions signed out;
 * - "set a password later" and change: the 9-minute check by the server's
 *   clock (LOW-3), the 500 mapping, the current password, the learner's
 *   name, reauth (old session ended, orphans ended);
 * - a code session without a password: no sync, signed out after 10 minutes;
 * - the 30-day cap and the 14-day idle rule (local progress untouched), the
 *   "why you were signed out" note across reloads, tampered saved fields;
 * - the error mapping for every new server answer;
 * - go-live gate 17: no password in any storage or log line, no password key
 *   outside the two endpoints, and codes and captcha tokens never stored or
 *   put in an address.
 */
import { createHash } from 'crypto';
import { CloudError } from '../cloud/types';
import { BREACH_TIMEOUT_MS, createBreachCheck } from '../webcloud/breach';
import { pageLocks } from '../webcloud/browser';
import { createWebAuth, type WebAuth } from '../webcloud/auth';
import { AUTH_ENDED_KEY, BREACH_CHECK_ON, BREACH_HOST, CODE_SESSION_MAX_MS, PASSWORD_FRESH_MS, SESSION_IDLE_MAX_MS, SESSION_KEY, SESSION_MAX_AGE_MS, SYNC_META_KEY } from '../webcloud/config';
import { toCloudError } from '../webcloud/errors';
import { createWebCloud } from '../webcloud/index';
import { readSession } from '../webcloud/session';
import { loadPasswordWords, passwordGuidance, unloadPasswordWordsForTest } from '../engine/passwordRules';
import type { LockPort } from '../webcloud/ports';
import { CompressionStream, DecompressionStream, ReadableStream } from 'stream/web';
import { FAKE_KEY, FAKE_URL, FakeSupabase, fakeJwt, memoryStorage, seqRandom, testPasswordWords } from '../../jest/webcloud-fakes';
import { BANK, fakeWeb } from '../../jest/webcloud-web';

const MIN = 60_000;
const DAY = 86_400_000;
const EMAIL = 'maya@example.com';
const PW = 'Ocean violet lamp 7!';
const PW2 = 'Copper falcon wobbly harbor 9#';
const PW3 = 'Amber frost north quilt 4%';

let now = Date.UTC(2026, 10, 28, 9, 0, 0);
const clock = { now: () => now };
let server: FakeSupabase;
let local: ReturnType<typeof memoryStorage>;
let session: ReturnType<typeof memoryStorage>;
let sharedLock: LockPort;
const tab = (): WebAuth => createWebAuth({ fetch: server.fetch, stores: { local, session }, random: seqRandom(), lock: sharedLock, clock, url: FAKE_URL, apiKey: FAKE_KEY, passwordWords: testPasswordWords });
/** Another computer: its own storage. */
const elsewhere = (): WebAuth => createWebAuth({ fetch: server.fetch, stores: { local: memoryStorage(), session: memoryStorage() }, random: seqRandom(), lock: pageLocks(), clock, url: FAKE_URL, apiKey: FAKE_KEY, passwordWords: testPasswordWords });

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof CloudError ? `${e.code}${e.detail ? `:${e.detail}` : ''}` : `other:${String(e)}`;
  }
};
/** An account the way learners make one: a code, then the password. */
async function signUp(a: WebAuth, email = EMAIL, pw = PW) {
  await a.startPasswordSignUp(email, pw);
  return a.finishPasswordSignUp(email, server.codes.get(email)!, pw);
}
/** A session that began with a code and saved no password (the server refused it). */
async function codeSessionWithoutPassword(a: WebAuth, email = EMAIL) {
  server.pwned.add(PW);
  const done = await signUp(a, email);
  server.pwned.delete(PW);
  expect(done.passwordSaved).toBe(false);
  return done;
}
async function google(a: WebAuth, email = 'maya@gmail.com', name?: string) {
  const url = new URL(a.googleSignInUrl());
  return a.finishGoogleSignIn(server.googleCode(url.searchParams.get('code_challenge')!, email, name));
}
const putCalls = () => server.calls.filter((c) => c.method === 'PUT' && c.path === '/auth/v1/user');
const stamp = () => ({ kaisip_password_set_at: new Date(now).toISOString() });
const ended = () => JSON.parse(local.getItem(AUTH_ENDED_KEY) ?? 'null');

beforeEach(() => {
  now = Date.UTC(2026, 10, 28, 9, 0, 0);
  server = new FakeSupabase(() => now);
  local = memoryStorage();
  session = memoryStorage();
  sharedLock = pageLocks();
});

describe('create an account with a password', () => {
  it('a code first (the password not sent), then the password saved with the fresh session and the time recorded', async () => {
    const a = tab();
    await a.startPasswordSignUp('  Maya@Example.com ', PW, { captchaToken: 'turnstile-token' });
    const otp = server.calls.find((c) => c.path === '/auth/v1/otp')!;
    expect(otp.body).toEqual({ email: EMAIL, create_user: true, gotrue_meta_security: { captcha_token: 'turnstile-token' } });
    expect(server.calls).toHaveLength(1);

    const done = await a.finishPasswordSignUp(EMAIL, server.codes.get(EMAIL)!, PW);
    expect(done).toEqual({ account: expect.objectContaining({ providers: ['email'] }), passwordSaved: true });
    expect(server.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /auth/v1/otp', 'POST /auth/v1/verify', 'PUT /auth/v1/user']);
    expect(server.calls[1].body).toEqual({ type: 'email', email: EMAIL, token: expect.any(String) });
    expect(putCalls()[0].body).toEqual({ password: PW, data: stamp() });
    expect(a.passwordNeeded()).toBe(false);
    // The "password changed on" record (a second channel beside the email notice).
    expect((await a.getUser()).passwordSetAt).toBe(Math.floor(now / 1000) * 1000 + (now % 1000));
    await a.signOut('local');
    expect((await tab().signInWithPassword(EMAIL, PW)).userId).toBe(done.account.userId);
  });

  it('refuses a weak password before anything is sent', async () => {
    const a = tab();
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'short words'))).toBe('invalid:password_too_short');
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'passwordpassword'))).toBe('invalid:password_common');
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'monkeymonkeymonkey'))).toBe('invalid:password_common');
    expect(await codeOf(a.startPasswordSignUp('xochitl.brennagh@example.com', 'xochitl brennagh 1990'))).toBe('invalid:password_contains_email');
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'Kaisip kaisip 2026!'))).toBe('invalid:password_contains_service_word');
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'zyxwvutsrqponmlkj'))).toBe('invalid:password_too_simple');
    expect(await codeOf(a.startPasswordSignUp(EMAIL, 'x'.repeat(73)))).toBe('invalid:password_too_long');
    expect(await codeOf(a.startPasswordSignUp(EMAIL, `${PW}\u0000`))).toBe('invalid:password_invalid_characters');
    expect(await codeOf(a.startPasswordSignUp('not-an-email', PW))).toBe('invalid:email');
    expect(server.calls).toHaveLength(0);
  });

  it('fails closed when the word lists can\'t be loaded: nothing is sent', async () => {
    unloadPasswordWordsForTest();
    try {
      const noLists = createWebAuth({ fetch: server.fetch, stores: { local, session }, random: seqRandom(), lock: sharedLock, clock, url: FAKE_URL, apiKey: FAKE_KEY });
      expect(await codeOf(noLists.startPasswordSignUp(EMAIL, PW))).toBe('offline:password_rules');
      const failing = createWebAuth({ fetch: server.fetch, stores: { local, session }, random: seqRandom(), lock: sharedLock, clock, url: FAKE_URL, apiKey: FAKE_KEY, passwordWords: async () => Promise.reject(new Error('net')) });
      expect(await codeOf(failing.startPasswordSignUp(EMAIL, PW))).toBe('offline:password_rules');
      expect(server.calls).toHaveLength(0);
      // The loader is asked once, then the lists stay loaded.
      let asked = 0;
      const once = createWebAuth({ fetch: server.fetch, stores: { local, session }, random: seqRandom(), lock: sharedLock, clock, url: FAKE_URL, apiKey: FAKE_KEY, passwordWords: async () => (asked++, testPasswordWords()) });
      await once.startPasswordSignUp(EMAIL, PW);
      now += MIN;
      await once.startPasswordSignUp(EMAIL, PW);
      expect(asked).toBe(1);
    } finally {
      loadPasswordWords(await testPasswordWords());
    }
  });

  it('checks the password again BEFORE using the code (the code is not used up)', async () => {
    const a = tab();
    await a.startPasswordSignUp(EMAIL, PW);
    const code = server.codes.get(EMAIL)!;
    expect(await codeOf(a.finishPasswordSignUp(EMAIL, code, 'too short'))).toBe('invalid:password_too_short');
    expect(server.calls.some((c) => c.path === '/auth/v1/verify')).toBe(false);
    expect(a.current()).toBeNull();
    expect((await a.finishPasswordSignUp(EMAIL, code, PW)).passwordSaved).toBe(true);
  });

  it('a wrong code: a calm code_wrong, no session, nothing saved', async () => {
    const a = tab();
    await a.startPasswordSignUp(EMAIL, PW);
    expect(await codeOf(a.finishPasswordSignUp(EMAIL, '00000000', PW))).toBe('invalid:code_wrong');
    expect(await codeOf(a.finishPasswordSignUp(EMAIL, 'abc', PW))).toBe('invalid:code_wrong');
    expect(a.current()).toBeNull();
    expect(putCalls()).toHaveLength(0);
  });

  it('the code works but the server refuses the password: signed in, not saved, "needs a password" across a reload', async () => {
    const a = tab();
    const done = await codeSessionWithoutPassword(a);
    expect(done).toEqual({ account: expect.objectContaining({ providers: ['email'] }), passwordSaved: false, problem: 'leaked' });
    expect(a.current()).not.toBeNull();
    expect(a.passwordNeeded()).toBe(true);
    expect(tab().passwordNeeded()).toBe(true); // a reload
    // The screen asks again, within the fresh session: saved.
    await a.setPassword(PW2);
    expect(a.passwordNeeded()).toBe(false);
    expect(tab().passwordNeeded()).toBe(false);
  });

  it('offline or rate limited while saving: reported as the problem, still signed in', async () => {
    const a = tab();
    await a.startPasswordSignUp(EMAIL, PW);
    server.force('/auth/v1/user', 429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' });
    const done = await a.finishPasswordSignUp(EMAIL, server.codes.get(EMAIL)!, PW);
    expect([done.passwordSaved, done.problem]).toEqual([false, 'rate_limited']);
    expect(a.passwordNeeded()).toBe(true);
  });

  it('the address already had an account: the code signs in to it and the new password replaces the old one', async () => {
    const first = await signUp(tab());
    await tab().signOut('local');
    const other = elsewhere();
    await other.signInWithPassword(EMAIL, PW);
    now += 5 * MIN;
    const again = await signUp(tab(), EMAIL, PW2);
    expect([again.account.userId, again.passwordSaved, again.unchanged]).toEqual([first.account.userId, true, undefined]);
    expect(await codeOf(tab().signInWithPassword(EMAIL, PW))).toBe('invalid:password_wrong');
    expect(await codeOf(other.getUser())).toBe('unauthorized'); // signed out by the change
  });

  it('"that is already your password" after a code: kept, reported unchanged, and every OTHER session is signed out', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const other = elsewhere();
    await other.signInWithPassword(EMAIL, PW);
    now += 2 * MIN;
    const a = tab();
    const same = await signUp(a, EMAIL, PW);
    expect([same.passwordSaved, same.unchanged, same.problem]).toEqual([true, true, undefined]);
    expect(server.calls.some((c) => c.path === '/auth/v1/logout?scope=others')).toBe(true);
    expect(await codeOf(other.getUser())).toBe('unauthorized');
    expect(await codeOf(a.getUser())).toBe('ok');
    expect(a.passwordNeeded()).toBe(false);
  });
});

describe('create an account in the screens\' order: email, then the code, then the password', () => {
  it('step 1 emails a code with no password anywhere; step 2 gives a session that only needs a password; step 3 saves it', async () => {
    const a = tab();
    await a.sendSignUpCode('  Maya@Example.com ', { captchaToken: 'turnstile-token' });
    expect(server.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /auth/v1/otp']);
    expect(server.calls[0].body).toEqual({ email: EMAIL, create_user: true, gotrue_meta_security: { captcha_token: 'turnstile-token' } });

    const who = await a.confirmSignUpCode(EMAIL, server.codes.get(EMAIL)!);
    expect(who.providers).toEqual(['email']);
    expect(server.calls[1].body).toEqual({ type: 'email', email: EMAIL, token: expect.any(String) });
    // Signed in, but only to set a password: no sync, and "needs a password" across a reload.
    expect(a.passwordNeeded()).toBe(true);
    expect(tab().passwordNeeded()).toBe(true);
    expect(putCalls()).toHaveLength(0);

    now += 2 * MIN;
    await a.setPassword(PW);
    expect(putCalls()[0].body).toEqual({ password: PW, data: stamp() });
    expect(a.passwordNeeded()).toBe(false);
    await a.signOut('local');
    expect((await tab().signInWithPassword(EMAIL, PW)).userId).toBe(who.userId);
  });

  it('a bad address or a wrong code is a calm code; nothing is saved', async () => {
    const a = tab();
    expect(await codeOf(a.sendSignUpCode('not-an-email'))).toBe('invalid:email');
    expect(server.calls).toHaveLength(0);
    await a.sendSignUpCode(EMAIL);
    expect(await codeOf(a.confirmSignUpCode(EMAIL, '00000000'))).toBe('invalid:code_wrong');
    expect(await codeOf(a.confirmSignUpCode(EMAIL, 'abc'))).toBe('invalid:code_wrong');
    expect(a.current()).toBeNull();
  });

  it('a refused password keeps the session waiting; with no password in 10 minutes it is signed out, and the page says why', async () => {
    const a = tab();
    await a.sendSignUpCode(EMAIL);
    await a.confirmSignUpCode(EMAIL, server.codes.get(EMAIL)!);
    expect(await codeOf(a.setPassword('too short'))).toBe('invalid:password_too_short');
    expect(await codeOf(a.setPassword('passwordpassword'))).toBe('invalid:password_common');
    expect(putCalls()).toHaveLength(0);
    expect(a.passwordNeeded()).toBe(true);
    now += CODE_SESSION_MAX_MS;
    expect(a.current()).toBeNull();
    expect(a.sessionEnded()).toBe('password_not_set');
  });

  it('the address already had an account: the code confirms the inbox and the new password replaces the old one', async () => {
    const first = await signUp(tab());
    await tab().signOut('local');
    now += 5 * MIN;
    const a = tab();
    await a.sendSignUpCode(EMAIL);
    const who = await a.confirmSignUpCode(EMAIL, server.codes.get(EMAIL)!);
    expect(who.userId).toBe(first.account.userId);
    expect(a.passwordNeeded()).toBe(true);
    await a.setPassword(PW2);
    expect(a.passwordNeeded()).toBe(false);
    expect(await codeOf(tab().signInWithPassword(EMAIL, PW))).toBe('invalid:password_wrong');
  });
});

describe('sign in with a password', () => {
  it('works, with the human-check token; a password session counts as "email"', async () => {
    await signUp(tab());
    await tab().signOut('local');
    server.captchaOn = true;
    const a = tab();
    expect(await codeOf(a.signInWithPassword(EMAIL, PW))).toBe('invalid:captcha');
    const info = await a.signInWithPassword(' MAYA@example.com', PW, { captchaToken: 'tok' });
    const call = server.calls.filter((c) => c.path === '/auth/v1/token?grant_type=password').pop()!;
    expect(call.body).toEqual({ email: EMAIL, password: PW, gotrue_meta_security: { captcha_token: 'tok' } });
    expect(call.headers.authorization).toBeUndefined();
    expect(info.providers).toEqual(['email']);
    expect(info.passwordChangeSuggested).toBeUndefined();
    expect(info.authAt).toBe(Math.floor(now / 1000) * 1000);
    expect(a.passwordNeeded()).toBe(false);
    expect(readSession(local.getItem(SESSION_KEY))?.userId).toBe(info.userId);
  });

  it('a wrong password and an unknown address get the same answer; a code-only account too', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const a = tab();
    expect(await codeOf(a.signInWithPassword(EMAIL, PW2))).toBe('invalid:password_wrong');
    expect(await codeOf(a.signInWithPassword('nobody@example.com', PW))).toBe('invalid:password_wrong');
    await codeSessionWithoutPassword(elsewhere(), 'codeonly@example.com');
    expect(await codeOf(a.signInWithPassword('codeonly@example.com', PW))).toBe('invalid:password_wrong');
    // email_not_confirmed (only a stranger's /signup makes one) reads the same.
    server.force('/auth/v1/token?grant_type=password', 400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
    expect(await codeOf(a.signInWithPassword(EMAIL, PW))).toBe('invalid:password_wrong');
  });

  it('an empty or impossibly long password is "wrong" without asking; a broken one is refused; the app\'s rules are not applied', async () => {
    const a = tab();
    expect(await codeOf(a.signInWithPassword(EMAIL, ''))).toBe('invalid:password_wrong');
    expect(await codeOf(a.signInWithPassword(EMAIL, 'x'.repeat(73)))).toBe('invalid:password_wrong');
    expect(await codeOf(a.signInWithPassword(EMAIL, `${PW}\ud800`))).toBe('invalid:password_invalid_characters');
    expect(server.calls).toHaveLength(0);
    // A short password is still sent (an account may hold one from before the rules): the server decides.
    expect(await codeOf(a.signInWithPassword(EMAIL, 'short'))).toBe('invalid:password_wrong');
    expect(server.calls).toHaveLength(1);
  });

  it('a password that no longer meets the rules signs in with a "please change it" hint', async () => {
    await signUp(tab());
    await tab().signOut('local');
    server.weakOnSignIn.add(PW);
    expect((await tab().signInWithPassword(EMAIL, PW)).passwordChangeSuggested).toBe(true);
    await tab().signOut('local');
    server.weakOnSignIn.clear();
    // One the app's own rules would refuse today (set before they existed).
    server.userByEmail(EMAIL)!.password = 'monkeymonkeymonkey';
    expect((await tab().signInWithPassword(EMAIL, 'monkeymonkeymonkey')).passwordChangeSuggested).toBe(true);
    await tab().signOut('local');
    // A passphrase set under the earlier rule (15+, no required types) signs in with no hint:
    // sign-in never applies the length or the four types.
    server.userByEmail(EMAIL)!.password = 'ocean violet lamp seven';
    const old = await tab().signInWithPassword(EMAIL, 'ocean violet lamp seven');
    expect(old.passwordChangeSuggested).toBeUndefined();
  });

  it('rate limits, captcha refusals and offline are calm codes', async () => {
    const a = tab();
    server.force('/auth/v1/token?grant_type=password', 429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' }, { 'Retry-After': '300' });
    try {
      await a.signInWithPassword(EMAIL, PW);
      throw new Error('expected a rate limit');
    } catch (e) {
      expect([(e as CloudError).code, (e as CloudError).retryAfterSec, (e as CloudError).message]).toEqual(['rate_limited', 300, 'rate_limited']);
    }
    server.force('/auth/v1/token?grant_type=password', 400, { code: 400, error_code: 'captcha_failed', msg: 'captcha protection: request disallowed' });
    expect(await codeOf(a.signInWithPassword(EMAIL, PW))).toBe('invalid:captcha');
    server.offline = true;
    expect(await codeOf(a.signInWithPassword(EMAIL, PW))).toBe('offline');
    expect(a.current()).toBeNull();
  });

  it('NFKC: combining accents and full-width letters sign in as the plain form, and are sent in it', async () => {
    const acute = String.fromCharCode(0x301);
    const composed = 'Café violet lamp 7!';
    const decomposed = `Cafe${acute} violet lamp 7!`;
    const wide = 'Ｃａｆé violet lamp 7!'; // a full-width capital is a plain capital after NFKC
    await signUp(tab(), EMAIL, decomposed);
    expect(putCalls()[0].body).toEqual({ password: composed, data: stamp() });
    for (const typed of [composed, decomposed, wide]) {
      await tab().signOut('local');
      expect([typed, await codeOf(tab().signInWithPassword(EMAIL, typed))]).toEqual([typed, 'ok']);
    }
    for (const c of server.calls.filter((x) => x.path.includes('grant_type=password'))) expect((c.body as { password: string }).password).toBe(composed);
  });
});

describe('forgot password (a code, never a link)', () => {
  it('asks for a reset code with no redirect and no PKCE challenge; the code and a new password sign in and sign out the rest', async () => {
    await signUp(tab());
    const other = elsewhere();
    await other.signInWithPassword(EMAIL, PW);
    await tab().signOut('local');

    const a = tab();
    await a.sendPasswordResetCode(EMAIL, { captchaToken: 'tok' });
    const ask = server.calls.find((c) => c.path === '/auth/v1/recover')!;
    expect(ask.body).toEqual({ email: EMAIL, gotrue_meta_security: { captcha_token: 'tok' } });

    const done = await a.finishPasswordReset(EMAIL, server.codes.get(EMAIL)!, PW2);
    expect(done.passwordSaved).toBe(true);
    expect(server.calls.filter((c) => c.path === '/auth/v1/verify').pop()!.body).toEqual({ type: 'recovery', email: EMAIL, token: expect.any(String) });
    expect(a.passwordNeeded()).toBe(false);
    expect(await codeOf(other.getUser())).toBe('unauthorized');
    await a.signOut('local');
    expect(await codeOf(tab().signInWithPassword(EMAIL, PW))).toBe('invalid:password_wrong');
    expect(await codeOf(tab().signInWithPassword(EMAIL, PW2))).toBe('ok');
  });

  it('the same answer for every address, and one ask a minute from this page whatever the address (audit LOW-1)', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const a = tab();
    expect(await codeOf(a.sendPasswordResetCode('nobody@example.com'))).toBe('ok');
    // Within the minute: refused HERE for any address, real or not, with the seconds left.
    now += 20_000;
    try {
      await a.sendPasswordResetCode(EMAIL);
      throw new Error('expected the cooldown');
    } catch (e) {
      expect([(e as CloudError).code, (e as CloudError).retryAfterSec]).toEqual(['rate_limited', 40]);
    }
    expect(server.calls.filter((c) => c.path === '/auth/v1/recover')).toHaveLength(1);
    now += 41_000;
    expect(await codeOf(a.sendPasswordResetCode(EMAIL))).toBe('ok');
    // The server's own "wait a minute" for a real address (another tab asked) reads as sent.
    now += 61_000;
    server.force('/auth/v1/recover', 429, { code: 429, error_code: 'over_email_send_rate_limit', msg: 'For security purposes, you can only request this after 60 seconds.' });
    expect(await codeOf(a.sendPasswordResetCode(EMAIL))).toBe('ok');
    // A per-IP limit is not about the address: a real "wait".
    now += 61_000;
    server.force('/auth/v1/recover', 429, { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' });
    expect(await codeOf(a.sendPasswordResetCode(EMAIL))).toBe('rate_limited');
    now += 61_000;
    server.captchaOn = true;
    expect(await codeOf(a.sendPasswordResetCode(EMAIL))).toBe('invalid:captcha');
    expect(await codeOf(a.sendPasswordResetCode('nope'))).toBe('invalid:email');
    now += 61_000;
    server.offline = true;
    expect(await codeOf(a.sendPasswordResetCode(EMAIL))).toBe('offline');
    // Offline asked nothing: no wait added.
    server.offline = false;
    server.captchaOn = false;
    expect(await codeOf(a.sendPasswordResetCode(EMAIL))).toBe('ok');
  });

  it('a wrong reset code is code_wrong; a weak new password is refused first; GoTrue takes a sign-up code as a reset code too', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const a = tab();
    await a.sendPasswordResetCode(EMAIL);
    expect(await codeOf(a.finishPasswordReset(EMAIL, '00000000', PW2))).toBe('invalid:code_wrong');
    expect(await codeOf(a.finishPasswordReset(EMAIL, server.codes.get(EMAIL)!, 'qwertyuiop12345'))).toBe('invalid:password_common');
    expect(a.current()).toBeNull();
    // One code pool: a sign-up code works with type "recovery".
    await a.startPasswordSignUp(EMAIL, PW2);
    expect((await a.finishPasswordReset(EMAIL, server.codes.get(EMAIL)!, PW2)).passwordSaved).toBe(true);
  });

  it('"set a password later" for a Google account goes through the same reset; its name is refused in the password', async () => {
    const g = tab();
    await google(g, 'maya@gmail.com', 'Xochitl Brennagh');
    await g.signOut('local');
    const a = tab();
    await a.sendPasswordResetCode('maya@gmail.com');
    const named = await a.finishPasswordReset('maya@gmail.com', server.codes.get('maya@gmail.com')!, 'Xochitl Brennagh 26!');
    expect([named.passwordSaved, named.problem]).toEqual([false, 'contains_email']);
    await a.setPassword(PW);
    await a.signOut('local');
    expect(await codeOf(tab().signInWithPassword('maya@gmail.com', PW))).toBe('ok');
  });
});

describe('add or change a password later (the 10-minute rule, checked first)', () => {
  it('within 9 minutes of signing in it is sent; after, it asks for a new sign-in without sending', async () => {
    const a = tab();
    await google(a);
    now += PASSWORD_FRESH_MS - 1000;
    await a.setPassword(PW);
    expect(putCalls()).toHaveLength(1);

    const b = tab();
    await b.signOut('local');
    await google(b);
    now += PASSWORD_FRESH_MS;
    expect(await codeOf(b.setPassword(PW2))).toBe('reauth_required:recent_sign_in');
    expect(putCalls()).toHaveLength(1);
  });

  it('checks the learner\'s Google name too (read from the account, never stored)', async () => {
    const a = tab();
    await google(a, 'maya@gmail.com', 'Xochitl Brennagh');
    expect(await codeOf(a.setPassword('Xochitl Brennagh 1990!!'))).toBe('invalid:password_contains_email');
    expect(putCalls()).toHaveLength(0);
    expect(JSON.stringify({ ...local.dump(), ...session.dump() })).not.toMatch(/brennagh/i);
  });

  it('a refresh is not a sign-in: an hour later, after refreshes, it still asks', async () => {
    const a = tab();
    await google(a);
    now += 59.5 * MIN;
    await a.accessToken();
    expect(server.refreshCalls()).toBe(1);
    expect(await codeOf(a.setPassword(PW))).toBe('reauth_required:recent_sign_in');
    expect(putCalls()).toHaveLength(0);
  });

  it('uses the server\'s clock (audit LOW-3): a computer whose clock is off still stops at the server\'s 9 minutes', async () => {
    server.skewMs = 2 * MIN; // the server is 2 minutes ahead of this computer
    const a = tab();
    await google(a);
    now += 8 * MIN;
    expect(await codeOf(a.setPassword(PW))).toBe('ok');
    const b = tab();
    await b.signOut('local');
    server.skewMs = 0;
    await google(b);
    // The server's clock jumps ahead 3 minutes after the sign-in: its age is 3 + 7 = 10 minutes.
    const s = readSession(local.getItem(SESSION_KEY))!;
    local.setItem(SESSION_KEY, JSON.stringify({ ...s, skewMs: 3 * MIN }));
    now += 7 * MIN;
    expect(await codeOf(b.setPassword(PW2))).toBe('reauth_required:recent_sign_in');
  });

  it('the database\'s refusal (a 500 from PUT /user) reads as "sign in again"; an outage does not', async () => {
    const a = tab();
    await google(a);
    // The server's clock jumps 11 minutes ahead after the sign-in (this page's saved skew is stale,
    // so it thinks the session is fresh): the fake's password guard answers 500.
    server.skewMs = 11 * MIN;
    expect(await codeOf(a.setPassword(PW))).toBe('reauth_required:recent_sign_in');
    expect(putCalls()).toHaveLength(1);
    // A gateway error is an outage, not the guard.
    server.skewMs = 0;
    const b = tab();
    await b.signOut('local');
    await google(b);
    const realFetch = server.fetch;
    const outage: typeof server.fetch = async (url, init) => (init.method === 'PUT' ? { status: 503, headers: { get: () => null }, text: async () => '{"message":"upstream unavailable"}' } : realFetch(url, init));
    const c = createWebAuth({ fetch: outage, stores: { local, session }, random: seqRandom(), lock: sharedLock, clock, url: FAKE_URL, apiKey: FAKE_KEY, passwordWords: testPasswordWords });
    expect(await codeOf(c.setPassword(PW))).toBe('server');
  });

  it('changing a password needs the current one (in a password session); wrong or same is a calm code', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const a = tab();
    await a.signInWithPassword(EMAIL, PW);
    expect(await codeOf(a.setPassword(PW2))).toBe('invalid:password_current_needed');
    expect(await codeOf(a.setPassword(PW2, { currentPassword: PW3 }))).toBe('invalid:password_current_wrong');
    expect(await codeOf(a.setPassword(PW, { currentPassword: PW }))).toBe('invalid:password_same');
    expect(await codeOf(a.setPassword('Kaisip kaisip 2026!', { currentPassword: PW }))).toBe('invalid:password_contains_service_word');
    // An hour later, with the current password, the server decides (it allows changes for 24 hours).
    now += 60 * MIN;
    expect(await codeOf(a.setPassword(PW2, { currentPassword: PW }))).toBe('ok');
    expect(putCalls().pop()!.body).toEqual({ password: PW2, current_password: PW, data: stamp() });
    // More than a day later the server wants a fresh sign-in.
    now += 25 * 60 * MIN;
    expect(await codeOf(a.setPassword(PW3, { currentPassword: PW2 }))).toBe('reauth_required:recent_sign_in');
  });

  it('signed out: unauthorized, nothing sent', async () => {
    expect(await codeOf(tab().setPassword(PW))).toBe('unauthorized');
    expect(server.calls).toHaveLength(0);
  });
});

describe('"confirm it\'s you" with the password', () => {
  it('a fresh session for the same account; the old one ends on the server', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const a = tab();
    const first = await a.signInWithPassword(EMAIL, PW);
    const oldToken = readSession(local.getItem(SESSION_KEY))!.accessToken;
    now += 30 * MIN;
    expect(await codeOf(a.reauthWithPassword(PW2))).toBe('invalid:password_wrong');
    expect(readSession(local.getItem(SESSION_KEY))!.accessToken).toBe(oldToken);
    const again = await a.reauthWithPassword(PW, { captchaToken: 'tok' });
    expect(again.userId).toBe(first.userId);
    expect(again.authAt).toBe(Math.floor(now / 1000) * 1000);
    expect(server.calls.some((c) => c.path === '/auth/v1/logout?scope=local' && c.headers.authorization === `Bearer ${oldToken}`)).toBe(true);
    expect(await codeOf(a.getUser())).toBe('ok');
    expect(await codeOf(a.setPassword(PW2, { currentPassword: PW }))).toBe('ok');
  });

  it('an old session whose token already ran out is not sent to the server', async () => {
    await signUp(tab());
    await tab().signOut('local');
    const a = tab();
    await a.signInWithPassword(EMAIL, PW);
    const oldToken = readSession(local.getItem(SESSION_KEY))!.accessToken;
    now += 61 * MIN; // the access token is past its hour (not refreshed)
    await a.reauthWithPassword(PW);
    expect(server.calls.some((c) => c.headers.authorization === `Bearer ${oldToken}` && c.path.startsWith('/auth/v1/logout'))).toBe(false);
  });

  it('an answer for another account is refused, nothing is saved, and that stray session is ended', async () => {
    await signUp(tab());
    await signUp(elsewhere(), 'raj@example.com', PW2);
    await tab().signOut('local');
    const a = tab();
    await a.signInWithPassword(EMAIL, PW);
    const mine = readSession(local.getItem(SESSION_KEY))!.accessToken;
    const res = await server.fetch(`${FAKE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: FAKE_KEY }, body: JSON.stringify({ email: 'raj@example.com', password: PW2 }) });
    const raj = JSON.parse(await res.text());
    server.force('/auth/v1/token?grant_type=password', 200, raj);
    expect(await codeOf(a.reauthWithPassword(PW))).toBe('invalid:password_wrong');
    expect(readSession(local.getItem(SESSION_KEY))!.accessToken).toBe(mine);
    expect(server.calls.some((c) => c.path === '/auth/v1/logout?scope=local' && c.headers.authorization === `Bearer ${raj.access_token}`)).toBe(true);
  });

  it('signed out: unauthorized', async () => {
    expect(await codeOf(tab().reauthWithPassword(PW))).toBe('unauthorized');
  });
});

describe('a code session without a password (codes only confirm or recover)', () => {
  it('needs a password: known from the token\'s sign-in method, not a flag that can be deleted', async () => {
    const a = tab();
    await codeSessionWithoutPassword(a);
    expect(a.passwordNeeded()).toBe(true);
    // An old-style flag (or none) changes nothing: only a saved password does.
    const s = readSession(local.getItem(SESSION_KEY))!;
    local.setItem(SESSION_KEY, JSON.stringify({ ...s, needsPassword: false }));
    expect(tab().passwordNeeded()).toBe(true);
    // Google and password sessions never need one.
    const g = elsewhere();
    await google(g);
    expect(g.passwordNeeded()).toBe(false);
  });

  it('may not sync, or take the first sync, until a password is saved', async () => {
    const web = fakeWeb();
    const cloud = createWebCloud({ fetch: server.fetch, stores: { local, session }, random: seqRandom(), lock: pageLocks(), clock, gzip: { CompressionStream, DecompressionStream, ReadableStream }, host: web.host, bank: BANK, appVersion: '1.48.0', origin: 'https://kaisip.com', url: FAKE_URL, apiKey: FAKE_KEY, passwordWords: testPasswordWords, wait: async () => {} });
    await codeSessionWithoutPassword(cloud.auth);
    expect(await cloud.prepareFirst()).toEqual({ ok: false, code: 'invalid', detail: 'password_needed' });
    local.setItem(SYNC_META_KEY, JSON.stringify({ v: 1, enabled: true }));
    expect(await cloud.syncNow()).toEqual({ kind: 'failed', code: 'invalid', detail: 'password_needed' });
    await cloud.auth.setPassword(PW2);
    expect((await cloud.prepareFirst()).ok).toBe(true);
  });

  it('is signed out after 10 minutes, on the server too, and the page says why after a reload', async () => {
    const a = tab();
    await codeSessionWithoutPassword(a);
    const token = readSession(local.getItem(SESSION_KEY))!.accessToken;
    now += CODE_SESSION_MAX_MS - 1000;
    expect(a.current()).not.toBeNull();
    now += 1000;
    expect(a.current()).toBeNull();
    await new Promise((r) => setTimeout(r, 5)); // the server logout is sent in the background
    expect(server.calls.some((c) => c.path === '/auth/v1/logout?scope=local' && c.headers.authorization === `Bearer ${token}`)).toBe(true);
    expect(tab().sessionEnded()).toBe('password_not_set');
    expect(await codeOf(tab().accessToken())).toBe('unauthorized:password_not_set');
  });
});

describe('this review\'s client fixes', () => {
  it('S13: "already your password" claims unchanged only when the server confirmed signing out the others', async () => {
    await signUp(tab());
    await tab().signOut('local');
    now += 2 * MIN;
    server.force('/auth/v1/logout?scope=others', 500, { code: 500, error_code: 'unexpected_failure', msg: 'boom' });
    const same = await signUp(tab(), EMAIL, PW);
    expect(same).toEqual({ account: expect.any(Object), passwordSaved: true, othersSignedOut: false });
  });

  it('a 403 session_not_found from the Auth server signs the page out, with the reason kept', async () => {
    await signUp(tab());
    const a = tab();
    server.force('/auth/v1/user', 403, { code: 403, error_code: 'session_not_found', msg: 'Session from session_id claim in JWT does not exist' });
    expect(await codeOf(a.getUser())).toBe('unauthorized');
    expect(a.current()).toBeNull();
    expect(tab().sessionEnded()).toBe('revoked');
  });

  it('a saved session with no renewal time known at all reads as too old (fail closed)', () => {
    const userId = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000003';
    const at = fakeJwt({ sub: userId, exp: Math.floor(now / 1000) + 3600, amr: [{ method: 'password', timestamp: Math.floor(now / 1000) }] }); // no iat
    local.setItem(SESSION_KEY, JSON.stringify({ v: 1, accessToken: at, refreshToken: 'rt-noiat-xyz', expiresAt: now + 3_600_000, userId, email: EMAIL, providers: ['email'], signedInAt: now }));
    expect(tab().current()).toBeNull();
    expect(tab().sessionEnded()).toBe('idle');
  });

});

describe('the leaked-password check (ON: Pwned Passwords range API, k-anonymity)', () => {
  const sha1 = (t: string) => createHash('sha1').update(t, 'utf8').digest('hex');
  const sha1Hex = async (t: string) => sha1(t);
  const GOOD_PW = 'Copper falcon wobbly harbor 9#';
  /** The fake range service beside the fake Supabase: knows `leaked`, pads when asked, records every call. */
  function withRange(leaked: string[], mode: 'ok' | 'hang' | 'down' = 'ok') {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const fetch: typeof server.fetch = async (url, init) => {
      if (!url.startsWith(BREACH_HOST)) return server.fetch(url, init);
      calls.push({ url, headers: init.headers });
      if (mode === 'hang') return new Promise(() => {});
      if (mode === 'down') throw new TypeError('Failed to fetch');
      const prefix = url.slice(url.lastIndexOf('/') + 1);
      const lines = leaked.map((p) => sha1(p).toUpperCase()).filter((h) => h.startsWith(prefix)).map((h) => `${h.slice(5)}:7`);
      if (init.headers['Add-Padding'] === 'true') lines.push('00000000000000000000000000000000000:0');
      return { status: 200, headers: { get: () => null }, text: async () => lines.join('\r\n') };
    };
    const a = createWebAuth({ fetch, stores: { local, session }, random: seqRandom(), lock: sharedLock, clock, url: FAKE_URL, apiKey: FAKE_KEY, passwordWords: testPasswordWords, sha1Hex });
    return { a, calls };
  }

  it('is switched on, and gives up after 3 seconds at most', () => {
    expect(BREACH_CHECK_ON).toBe(true);
    expect(BREACH_TIMEOUT_MS).toBe(3000);
  });

  it('refuses a leaked password on each of the two forms (typed, and one simplified: compared, or compared without its tail), before any code is emailed', async () => {
    const cases: [string, string][] = [
      ['Copper Falcon Wobbly Harbor 9#', 'Copper Falcon Wobbly Harbor 9#'], // as typed
      ['Copper Falcon 9# Wobbly Harbor', 'copperfalcon9#wobblyharbor'], // the compared form (no tail to take off)
      ['Copper falcon wobbly harbor 2026!', 'copperfalconwobblyharbor'], // without trailing numbers and symbols
    ];
    for (const [typed, leaked] of cases) {
      const { a, calls } = withRange([leaked]);
      expect([typed, leaked, await codeOf(a.startPasswordSignUp(EMAIL, typed))]).toEqual([typed, leaked, 'invalid:password_leaked']);
      expect(calls.length).toBeGreaterThan(0);
      expect(server.calls.some((c) => c.path === '/auth/v1/otp')).toBe(false);
      expect(passwordGuidance('password_leaked')!.text).toBe('This password, or a simple variation of it, has appeared in a data leak. Please choose a different one.');
    }
  });

  it('a refusal never leaves an earlier "clean" showing, and a long base with a short tail is still looked up', async () => {
    const { a } = withRange(['copperfalconwobblyharbor']);
    await signUp(a, EMAIL, 'Quiet lantern mossy orbit 3$');
    expect(a.breachState()).toBe('clean');
    expect(await codeOf(a.setPassword('Copper falcon wobbly harbor 7!'))).toBe('invalid:password_leaked');
    expect(a.breachState()).toBe('off');
  });

  it('a strong password made mostly of numbers is not refused because its first letters leaked (B1)', async () => {
    for (const pw of ['Zq #4829 1837 4401 9921', 'Box! 48 291 7730 5512 6644']) {
      server = new FakeSupabase(() => now);
      const { a, calls } = withRange(['zq', 'box']);
      expect(await codeOf(a.startPasswordSignUp(EMAIL, pw))).toBe('ok');
      expect(a.breachState()).toBe('clean');
      for (const short of ['zq', 'box']) expect(calls.some((c) => c.url.endsWith(sha1(short).toUpperCase().slice(0, 5)))).toBe(false);
    }
  });

  it('a password on no leak list is saved; every lookup sends only a 5-character prefix, with padding, to the one host', async () => {
    const { a, calls } = withRange(['something else entirely']);
    const done = await signUp(a, EMAIL, GOOD_PW);
    expect(done.passwordSaved).toBe(true);
    expect(a.breachState()).toBe('clean');
    expect(calls.length).toBeGreaterThan(0);
    const forms = [GOOD_PW, 'copperfalconwobblyharbor'];
    for (const c of calls) {
      expect(c.url).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[0-9A-F]{5}$/);
      expect(c.headers['Add-Padding']).toBe('true');
      expect(c.headers.authorization).toBeUndefined();
      expect(c.headers.apikey).toBeUndefined();
      expect(c.url.toLowerCase()).not.toContain('maya');
      for (const f of forms) expect(c.url.toUpperCase()).not.toContain(sha1(f).toUpperCase().slice(5, 12));
    }
    // Nothing else outside the project was contacted.
    expect(server.calls.every((c) => c.path.startsWith('/auth/v1/') || c.path.startsWith('/rest/v1/'))).toBe(true);
  });

  it('fails open: a timeout or a network error accepts the password (the rules passed) and says it could not check', async () => {
    for (const mode of ['hang', 'down'] as const) {
      server = new FakeSupabase(() => now);
      const { calls } = withRange([], mode);
      const fetch: typeof server.fetch = async (url, init) => (url.startsWith(BREACH_HOST) ? (calls.push({ url, headers: init.headers }), mode === 'hang' ? new Promise(() => {}) : Promise.reject(new TypeError('down'))) : server.fetch(url, init));
      const quick = createBreachCheck({ fetch, sha1Hex, timeoutMs: 30 });
      const a = createWebAuth({ fetch, stores: { local: memoryStorage(), session: memoryStorage() }, random: seqRandom(), lock: pageLocks(), clock, url: FAKE_URL, apiKey: FAKE_KEY, passwordWords: testPasswordWords, breachedPassword: quick });
      const done = await signUp(a, EMAIL, GOOD_PW);
      expect([mode, done.passwordSaved, a.breachState()]).toEqual([mode, true, 'unchecked']);
      expect(passwordGuidance('breach_unchecked')).not.toBeNull();
    }
  });

  it('no lookup at sign-in, and none when the app\'s own rules already refused the password', async () => {
    const { a, calls } = withRange([]);
    await signUp(a, EMAIL, GOOD_PW);
    const before = calls.length;
    await a.signOut('local');
    await a.signInWithPassword(EMAIL, GOOD_PW);
    expect(calls.length).toBe(before);
    expect(await codeOf(a.startPasswordSignUp('other@example.com', 'monkeymonkeymonkey'))).toBe('invalid:password_common');
    expect(calls.length).toBe(before);
  });

  it('reset and "set a password" are checked too; nothing is logged', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { a } = withRange(['copperfalconwobblyharbor']);
      await signUp(a, EMAIL, PW);
      await a.signOut('local');
      await a.sendPasswordResetCode(EMAIL);
      expect(await codeOf(a.finishPasswordReset(EMAIL, server.codes.get(EMAIL)!, GOOD_PW))).toBe('invalid:password_leaked');
      expect(a.current()).toBeNull(); // refused before the reset code was used
      await a.signInWithPassword(EMAIL, PW);
      expect(await codeOf(a.setPassword(GOOD_PW, { currentPassword: PW }))).toBe('invalid:password_leaked');
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      warn.mockRestore();
    }
  });
});

describe('the 30-day cap and the 14-day idle rule', () => {
  it('a session older than 30 days reads as signed out; progress and the sync record stay; a new sign-in clears the note', async () => {
    local.setItem('cisa_profiles_v1', '{"CISA-ABCDE":{}}');
    local.setItem(SYNC_META_KEY, '{"v":1,"enabled":true}');
    await signUp(tab());
    const a = tab();
    // Used every 10 days: never idle. A refresh does not restart the 30 days.
    for (const d of [10, 20, 29]) {
      now = Date.UTC(2026, 10, 28, 9, 0, 0) + d * DAY;
      expect(a.current()).not.toBeNull();
      await a.accessToken();
    }
    expect(server.refreshCalls()).toBe(3);
    now = Date.UTC(2026, 10, 28, 9, 0, 0) + 30 * DAY - MIN;
    expect(a.current()).not.toBeNull();
    now += MIN;
    expect(a.current()).toBeNull();
    expect(a.sessionEnded()).toBe('expired');
    expect(tab().sessionEnded()).toBe('expired'); // after a reload
    expect(ended()).toEqual({ reason: 'expired', at: now }); // a reason and a time: no email, no id
    expect(await codeOf(a.accessToken())).toBe('unauthorized:session_expired');
    expect(await codeOf(a.getUser())).toBe('unauthorized:session_expired');
    expect(await codeOf(a.acceptTerms({ termsVersion: '2026-11', ageConfirmed: true }))).toBe('unauthorized:session_expired');
    expect(local.getItem(SESSION_KEY)).toBeNull();
    expect(local.getItem('cisa_profiles_v1')).toBe('{"CISA-ABCDE":{}}');
    expect(local.getItem(SYNC_META_KEY)).toBe('{"v":1,"enabled":true}');
    await a.signInWithPassword(EMAIL, PW);
    expect(a.sessionEnded()).toBeNull();
    expect(local.getItem(AUTH_ENDED_KEY)).toBeNull();
  });

  it('a session unused for 14 days ends ("idle"); used within 14 days it carries on', async () => {
    await signUp(tab());
    const a = tab();
    now += SESSION_IDLE_MAX_MS - MIN;
    expect(a.current()).not.toBeNull();
    await a.accessToken(); // used: renewed
    now += SESSION_IDLE_MAX_MS - MIN;
    expect(a.current()).not.toBeNull();
    now += 2 * MIN;
    expect(a.current()).toBeNull();
    expect(a.sessionEnded()).toBe('idle');
    expect(await codeOf(a.accessToken())).toBe('unauthorized:session_expired');
  });

  it('signing out on purpose leaves no note; a refused refresh (signed out elsewhere) does', async () => {
    await signUp(tab());
    const a = tab();
    await a.signOut('local');
    expect(a.sessionEnded()).toBeNull();
    await a.signInWithPassword(EMAIL, PW);
    server.force('/auth/v1/token?grant_type=refresh_token', 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
    now += 59.5 * MIN;
    expect(await codeOf(a.accessToken())).toBe('unauthorized');
    expect(tab().sessionEnded()).toBe('revoked');
    await tab().signOut('local');
    expect(tab().sessionEnded()).toBeNull();
  });

  it('a session saved without a sign-in time uses the token\'s; with neither it is treated as too old', () => {
    const base = { v: 1, refreshToken: 'rt-old-session-xyz', expiresAt: now + 3_600_000, userId: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001', email: EMAIL, providers: ['email'] };
    const tok = (amrAt: number | null) => fakeJwt({ sub: base.userId, exp: Math.floor(now / 1000) + 3600, iat: Math.floor(now / 1000), ...(amrAt === null ? {} : { amr: [{ method: 'password', timestamp: Math.floor(amrAt / 1000) }] }) });
    local.setItem(SESSION_KEY, JSON.stringify({ ...base, accessToken: tok(now - 29 * DAY) }));
    expect(tab().current()).not.toBeNull();
    local.setItem(SESSION_KEY, JSON.stringify({ ...base, accessToken: tok(now - SESSION_MAX_AGE_MS - 1000) }));
    expect(tab().current()).toBeNull();
    expect(local.getItem(SESSION_KEY)).toBeNull();
    local.setItem(SESSION_KEY, JSON.stringify({ ...base, accessToken: tok(null) }));
    expect(tab().current()).toBeNull();
  });

  it('tampered saved fields can\'t stretch it: a later signedInAt, a big skewMs, a fresh lastActiveAt', () => {
    const userId = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000002';
    const at = fakeJwt({ sub: userId, exp: Math.floor(now / 1000) + 3600, iat: Math.floor(now / 1000), amr: [{ method: 'oauth', timestamp: Math.floor((now - 31 * DAY) / 1000) }] });
    const base = { v: 1, accessToken: at, refreshToken: 'rt-clock-xyz', expiresAt: now + 3_600_000, userId, email: EMAIL, providers: ['google'] };
    // signedInAt says "yesterday", the token says 31 days.
    local.setItem(SESSION_KEY, JSON.stringify({ ...base, signedInAt: now - DAY, lastActiveAt: now }));
    expect(tab().current()).toBeNull();
    // A skew of minus 30 days is out of range and dropped; the token's own times still count.
    local.setItem(SESSION_KEY, JSON.stringify({ ...base, signedInAt: now - DAY, skewMs: -30 * DAY }));
    expect(readSession(local.getItem(SESSION_KEY))!.skewMs).toBeUndefined();
    expect(tab().current()).toBeNull();
    // A skew of minus 6 days is kept, and still can't hide it: the token's iat minus its sign-in time is 31 days.
    local.setItem(SESSION_KEY, JSON.stringify({ ...base, signedInAt: now - DAY, skewMs: -6 * DAY, lastActiveAt: now }));
    expect(readSession(local.getItem(SESSION_KEY))!.skewMs).toBe(-6 * DAY);
    expect(tab().current()).toBeNull();
  });

  it('a computer clock turned back after sign-in shows at the next refresh (the server-signed term)', async () => {
    await signUp(tab());
    const a = tab();
    const t0 = now;
    for (const d of [10, 20, 29]) {
      now = t0 + d * DAY;
      await a.accessToken();
    }
    // The learner turns the computer's clock back 20 days; the server's clock keeps going.
    const back = 20 * DAY;
    now = t0 + 29.5 * DAY - back;
    server.skewMs = back;
    // This computer thinks 9.5 days have passed (and its old skew agrees), so it still looks signed in.
    expect(a.current()).not.toBeNull();
    // A day later (server: 30.5 days) the next call meets the server's "token expired" (403
    // bad_jwt), refreshes, and the new token's iat minus the sign-in time is 30.5 days, signed
    // by the server: the session ends here too.
    now += DAY;
    expect(await codeOf(a.getUser())).toBe('unauthorized:session_expired');
    expect(a.sessionEnded()).toBe('expired');
  });
});

describe('error mapping for the password calls', () => {
  it('every new server answer → one short code, never its text', () => {
    const h = { headers: { get: (n: string) => (n === 'retry-after' ? '60' : null) } };
    const cases: [Parameters<typeof toCloudError>[0], number, unknown, string][] = [
      ['password', 400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 'invalid:password_wrong'],
      ['password', 400, { code: 'invalid_credentials', msg: 'Invalid login credentials' }, 'invalid:password_wrong'],
      ['password', 400, { error_code: 'email_not_confirmed', msg: 'Email not confirmed' }, 'invalid:password_wrong'],
      ['password', 400, { error_code: 'captcha_failed' }, 'invalid:captcha'],
      ['password', 400, { code: 'captcha_failed' }, 'invalid:captcha'],
      ['password', 429, { error_code: 'over_request_rate_limit' }, 'rate_limited'],
      ['password', 400, { error_code: 'user_banned', msg: 'User is banned' }, 'invalid:password_wrong'],
      ['password', 0, '', 'offline'],
      ['password', 503, {}, 'server'],
      ['recover', 400, { error_code: 'captcha_failed' }, 'invalid:captcha'],
      ['recover', 429, { error_code: 'over_email_send_rate_limit' }, 'rate_limited'],
      ['recover', 400, { error_code: 'validation_failed' }, 'invalid:email'],
      ['recover', 400, { error_code: 'email_provider_disabled' }, 'invalid:signup_disabled'],
      ['verify', 403, { error_code: 'otp_expired' }, 'invalid:code_wrong'],
      ['user_update', 422, { error_code: 'weak_password', weak_password: { reasons: ['length'] } }, 'invalid:password_too_short'],
      ['user_update', 422, { error_code: 'weak_password', weak_password: { reasons: ['pwned'] } }, 'invalid:password_leaked'],
      ['user_update', 422, { error_code: 'weak_password', weak_password: { reasons: ['characters'] } }, 'invalid:password_missing_characters'],
      ['user_update', 422, { error_code: 'weak_password' }, 'invalid:password_weak'],
      ['user_update', 422, { error_code: 'same_password' }, 'invalid:password_same'],
      ['user_update', 400, { error_code: 'current_password_required' }, 'invalid:password_current_needed'],
      ['user_update', 400, { error_code: 'current_password_mismatch' }, 'invalid:password_current_wrong'],
      ['user_update', 400, { error_code: 'reauthentication_needed' }, 'reauth_required:recent_sign_in'],
      ['user_update', 400, { error_code: 'reauthentication_not_valid' }, 'reauth_required:recent_sign_in'],
      ['user_update', 403, { error_code: 'insufficient_aal' }, 'reauth_required:aal2'],
      ['user_update', 500, { error_code: 'unexpected_failure', msg: 'kaisip_password_needs_recent_sign_in' }, 'reauth_required:recent_sign_in'],
      ['user_update', 500, 'not json', 'reauth_required:recent_sign_in'],
      ['user_update', 502, {}, 'server'],
      ['user_update', 401, { error_code: 'bad_jwt' }, 'unauthorized'],
      ['user_update', 403, { error_code: 'session_not_found' }, 'unauthorized'],
      ['user_update', 429, {}, 'rate_limited'],
      ['user_update', 400, { error_code: 'validation_failed', msg: 'Password cannot be longer than 72 characters' }, 'invalid:password_too_long'],
      ['user_update', 400, { error_code: 'validation_failed', msg: 'something else' }, 'invalid:password_weak'],
      ['user', 403, { code: 'bad_jwt' }, 'unauthorized'],
    ];
    for (const [call, status, body, want] of cases) {
      const e = toCloudError(call, status, typeof body === 'string' ? body : JSON.stringify(body), h);
      expect(`${call} ${status} ${JSON.stringify(body)} → ${e.code}${e.detail ? `:${e.detail}` : ''}`).toBe(`${call} ${status} ${JSON.stringify(body)} → ${want}`);
      expect(e.message).toBe(e.code);
      if (e.detail) expect(e.detail).toMatch(/^[a-z0-9_]{1,40}$/);
    }
  });

  it('the 72-byte refusal from the server is the same "too long" (the fake answers 400, like GoTrue)', async () => {
    const a = tab();
    await google(a);
    // The app refuses first; sent anyway (a raw API call), the server says 400.
    const res = await a.authedFetch('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password: 'x'.repeat(73) }) }, 'user_update');
    expect(res.status).toBe(400);
    expect(toCloudError('user_update', res.status, await res.text()).detail).toBe('password_too_long');
  });
});

describe('go-live gate 17: the password is never stored or logged', () => {
  it('every flow, then: no storage value, log line, error or address holds a password, code or captcha token; only the two endpoints get a password', async () => {
    const PASSWORDS = [PW, PW2, PW3, 'Kaisip kaisip 2026!', 'too short'];
    const CAPTCHA = 'captcha-token-abcdef123';
    const logged: string[] = [];
    const spies = (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((m) =>
      jest.spyOn(console, m).mockImplementation((...args: unknown[]) => {
        logged.push(args.map((x) => (typeof x === 'string' ? x : JSON.stringify(x) ?? String(x))).join(' '));
      }),
    );
    const errors: string[] = [];
    const codes = new Set<string>();
    const attempt = async (p: Promise<unknown>) => {
      try {
        await p;
      } catch (e) {
        errors.push(`${String(e)} ${JSON.stringify(e)} ${(e as Error).stack ?? ''}`);
      }
    };
    const code = () => {
      const c = server.codes.get(EMAIL) ?? '';
      if (c) codes.add(c);
      return c;
    };
    try {
      const a = tab();
      await attempt(a.startPasswordSignUp(EMAIL, 'too short', { captchaToken: CAPTCHA }));
      await attempt(a.startPasswordSignUp(EMAIL, PW, { captchaToken: CAPTCHA }));
      await attempt(a.finishPasswordSignUp(EMAIL, code(), PW));
      await attempt(a.setPassword('Kaisip kaisip 2026!'));
      await a.signOut('local');
      await attempt(a.signInWithPassword(EMAIL, PW2, { captchaToken: CAPTCHA }));
      await attempt(a.signInWithPassword(EMAIL, PW, { captchaToken: CAPTCHA }));
      await attempt(a.setPassword(PW2, { currentPassword: PW3 }));
      await attempt(a.setPassword(PW2, { currentPassword: PW }));
      await attempt(a.reauthWithPassword(PW3, { captchaToken: CAPTCHA }));
      await attempt(a.reauthWithPassword(PW2, { captchaToken: CAPTCHA }));
      await a.signOut('local');
      await attempt(a.sendPasswordResetCode(EMAIL, { captchaToken: CAPTCHA }));
      await attempt(a.finishPasswordReset(EMAIL, code(), PW3));
      await a.signOut('local');
      await attempt(a.signInWithPassword(EMAIL, PW3, { shared: true, captchaToken: CAPTCHA }));
      server.offline = true;
      await attempt(a.signInWithPassword(EMAIL, PW3));
    } finally {
      for (const s of spies) s.mockRestore();
    }
    // The flows really ran: signed in on the shared computer with the last password.
    expect(readSession(session.getItem(SESSION_KEY))).not.toBeNull();
    expect(codes.size).toBe(2);
    const stored = JSON.stringify({ ...local.dump(), ...session.dump() });
    for (const secret of [...PASSWORDS, CAPTCHA, ...codes]) {
      expect(stored).not.toContain(secret);
      for (const l of logged) expect(l).not.toContain(secret);
      for (const e of errors) expect(e).not.toContain(secret);
      for (const c of server.calls) {
        expect(c.path).not.toContain(encodeURIComponent(secret));
        expect(c.path).not.toContain(secret);
        expect(JSON.stringify(c.headers)).not.toContain(secret);
      }
    }
    // A password (or a password KEY at all) only in the body of a password sign-in or PUT /user.
    for (const c of server.calls) {
      const body = (c.body ?? {}) as Record<string, unknown>;
      const hasKey = 'password' in body || 'current_password' in body;
      const holds = PASSWORDS.some((pw) => JSON.stringify(body).includes(pw));
      const allowed = (c.method === 'POST' && c.path === '/auth/v1/token?grant_type=password') || (c.method === 'PUT' && c.path === '/auth/v1/user');
      expect([`${c.method} ${c.path}`, (hasKey || holds) && !allowed]).toEqual([`${c.method} ${c.path}`, false]);
    }
  });
});
