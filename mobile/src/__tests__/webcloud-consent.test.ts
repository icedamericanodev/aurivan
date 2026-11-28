/**
 * The consent record and the optional emails switch, as the clients send
 * them (src/webcloud/auth.ts) against the fake server, which models the
 * database's rules (supabase migration 20261128020000_consent_record.sql) and
 * the newsletter-sync function's answers:
 * - sign-up sends terms_version, age_confirmed, privacy_version and source,
 *   and the marketing fields ONLY when the optional box is ticked;
 * - no time column, and never the server-only source label 'email_service';
 * - an account still on an older version re-accepts with a PATCH of the two
 *   version labels only;
 * - the news switch: on and off, the 21st change in a day is refused, a
 *   switch-off never is;
 * - newsletter-sync: not_configured, unconfirmed, none, pending, subscribed,
 *   unsubscribed (the learner's own switch-off), blocked (the email service
 *   holds the address as stopped), 429 and 503;
 * - the words and version labels the screens use are the ones in the consent
 *   registry (docs/legal/consent_wording.md).
 */
import fs from 'fs';
import path from 'path';
import { CloudError } from '../cloud/types';
import { ACCOUNT_COPY as COPY } from '../content/cloud/copy';
import { NEWS_WORDING_VERSION, PRIVACY_VERSION, TERMS_VERSION } from '../engine/account';
import { pageLocks } from '../webcloud/browser';
import { createWebAuth, type WebAuth } from '../webcloud/auth';
import { CONSENT } from '../webcloud/config';
import { FAKE_KEY, FAKE_URL, FakeSupabase, memoryStorage, passwordSignIn, seqRandom, testPasswordWords } from '../../jest/webcloud-fakes';

let now = Date.UTC(2026, 10, 28, 9, 0, 0);
let server: FakeSupabase;
let a: WebAuth;
const EMAIL = 'maya@example.com';
const WEB = { wording: NEWS_WORDING_VERSION, source: 'web' as const };

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof CloudError ? `${e.code}${e.detail ? `:${e.detail}` : ''}` : `other:${String(e)}`;
  }
};
const profileCalls = (method: string) => server.calls.filter((c) => c.method === method && c.path.startsWith('/rest/v1/profiles'));
const agree = (news = false) => a.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true, privacyVersion: PRIVACY_VERSION, source: 'web', ...(news ? { news: { wording: NEWS_WORDING_VERSION } } : {}) });

beforeEach(async () => {
  now = Date.UTC(2026, 10, 28, 9, 0, 0);
  server = new FakeSupabase(() => now);
  a = createWebAuth({ fetch: server.fetch, stores: { local: memoryStorage(), session: memoryStorage() }, random: seqRandom(), lock: pageLocks(), clock: { now: () => now }, url: FAKE_URL, apiKey: FAKE_KEY, passwordWords: testPasswordWords });
  await passwordSignIn(server, a, EMAIL);
  server.calls.length = 0;
});

describe('agreeing at sign-up', () => {
  it('sends the two version labels, the age confirmation and the source; nothing about emails when the box is not ticked', async () => {
    expect(await a.consent()).toBeNull();
    await agree();
    expect(profileCalls('POST')[0].body).toEqual({ terms_version: '2026-12', privacy_version: '2026-12', age_confirmed: true, source: 'web' });
    expect(await a.consent()).toEqual({ termsVersion: '2026-12', privacyVersion: '2026-12', newsOptIn: false, source: 'web' });
    expect(await a.termsVersion()).toBe('2026-12');
  });

  it('with the optional box ticked: the opt-in and the wording the learner saw go in the same record', async () => {
    await agree(true);
    expect(profileCalls('POST')[0].body).toEqual({ terms_version: '2026-12', privacy_version: '2026-12', age_confirmed: true, source: 'web', marketing_opt_in: true, marketing_wording: '2026-12' });
    expect((await a.consent())!.newsOptIn).toBe(true);
  });

  it('never sends a time, and an opt-in without its source is refused before anything is sent', async () => {
    await agree(true);
    const sent = JSON.stringify(server.calls.map((c) => c.body));
    expect(sent).not.toMatch(/_at"|email_service/);
    server.calls.length = 0;
    expect(await codeOf(a.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true, news: { wording: NEWS_WORDING_VERSION } }))).toBe('invalid');
    expect(await codeOf(a.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true, source: 'email_service' as never }))).toBe('invalid');
    expect(await codeOf(a.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true, privacyVersion: 'latest' }))).toBe('invalid');
    expect(server.calls).toHaveLength(0);
  });

  it('an account still on 2026-11 re-accepts: a PATCH of the two labels only, then the news box as its own change', async () => {
    await a.acceptTerms({ termsVersion: '2026-11', ageConfirmed: true });
    server.calls.length = 0;
    await agree(true);
    const patches = profileCalls('PATCH').map((c) => c.body);
    expect(patches).toEqual([{ terms_version: '2026-12', privacy_version: '2026-12' }, { marketing_opt_in: true, marketing_wording: '2026-12', source: 'web' }]);
    expect(await a.consent()).toEqual({ termsVersion: '2026-12', privacyVersion: '2026-12', newsOptIn: true, source: 'web' });
  });
});

describe('what the database refuses (the fake models its rules)', () => {
  const raw = (method: string, p: string, body: unknown) => a.authedFetch(p, { method, body: JSON.stringify(body) }, 'rest').then((r) => r.status);
  it('a time column is 403; an unknown source and an opt-in without wording or source are 400; the server-only label is dropped', async () => {
    expect(await raw('POST', '/rest/v1/profiles', { terms_version: '2026-12', age_confirmed: true, terms_accepted_at: '2020-01-01T00:00:00Z' })).toBe(403);
    expect(await raw('POST', '/rest/v1/profiles', { terms_version: '2026-12', age_confirmed: true, source: 'email' })).toBe(400);
    // An opt-in that names only the server's label has no source of its own: refused.
    expect(await raw('POST', '/rest/v1/profiles', { terms_version: '2026-12', age_confirmed: true, marketing_opt_in: true, marketing_wording: '2026-12', source: 'email_service' })).toBe(400);
    expect(await raw('POST', '/rest/v1/profiles', { terms_version: '2026-12', age_confirmed: true, marketing_opt_in: true, source: 'web' })).toBe(400);
    expect(await raw('POST', '/rest/v1/profiles', { terms_version: '2026-12', age_confirmed: true, marketing_opt_in: true, marketing_wording: '2026-12' })).toBe(400);
    await agree();
    const id = a.current()!.userId;
    expect(await raw('PATCH', `/rest/v1/profiles?id=eq.${id}`, { marketing_set_at: '2020-01-01T00:00:00Z' })).toBe(403);
    // Sent raw by a client, 'email_service' is dropped and the label on record stays.
    expect(await raw('PATCH', `/rest/v1/profiles?id=eq.${id}`, { marketing_opt_in: false, source: 'email_service' })).toBe(204);
    expect((await a.consent())!.source).toBe('web');
  });
});

describe('the news switch', () => {
  it('on, then off: each is one PATCH with the wording and the source', async () => {
    await agree();
    server.calls.length = 0;
    await a.setNews(true, WEB);
    expect((await a.consent())!.newsOptIn).toBe(true);
    await a.setNews(false, WEB);
    expect(await a.consent()).toEqual({ termsVersion: '2026-12', privacyVersion: '2026-12', newsOptIn: false, source: 'web' });
    expect(profileCalls('PATCH').map((c) => c.body)).toEqual([
      { marketing_opt_in: true, marketing_wording: '2026-12', source: 'web' },
      { marketing_opt_in: false, marketing_wording: '2026-12', source: 'web' },
    ]);
    expect(await codeOf(a.setNews(true, { wording: 'new', source: 'web' }))).toBe('invalid');
    expect(await codeOf(a.setNews(true, { wording: '2026-12', source: 'email_service' as never }))).toBe('invalid');
  });

  it('the 21st change in a day is refused in words the screen can use; switching off never is', async () => {
    await agree(); // change 1
    for (let i = 0; i < 19; i++) await a.setNews(i % 2 === 0, WEB); // changes 2 to 20, ending switched ON
    expect((await a.consent())!.newsOptIn).toBe(true);
    // Off always goes through, even past the limit.
    await a.setNews(false, WEB);
    expect((await a.consent())!.newsOptIn).toBe(false);
    expect(await codeOf(a.setNews(true, WEB))).toBe('rate_limited');
    expect((await a.consent())!.newsOptIn).toBe(false);
    // A day later it works again.
    now += 24 * 3_600_000 + 1000;
    await a.refresh().catch(() => undefined);
    await a.setNews(true, WEB);
    expect((await a.consent())!.newsOptIn).toBe(true);
  });
});

describe('newsletter-sync', () => {
  it('not connected yet: synced false, not_configured, and the choice is still on record', async () => {
    await agree(true);
    expect(await a.syncNews()).toEqual({ synced: false, optIn: null, state: 'not_configured' });
    expect(server.calls.filter((c) => c.path === '/functions/v1/newsletter-sync').map((c) => c.body)).toEqual([{}]);
    expect((await a.consent())!.newsOptIn).toBe(true);
  });

  it('opted in: pending until the learner confirms the email, then subscribed', async () => {
    server.kit = new Map();
    server.newsWaitMs = 0;
    await agree(true);
    expect(await a.syncNews()).toEqual({ synced: true, optIn: true, state: 'pending' });
    server.kit.set(EMAIL, 'active');
    expect(await a.syncNews()).toEqual({ synced: true, optIn: true, state: 'subscribed' });
  });

  it('not opted in and never added by the app: none (a waitlist address is left alone)', async () => {
    server.kit = new Map([[EMAIL, 'active' as const]]);
    await agree();
    expect(await a.syncNews()).toEqual({ synced: true, optIn: false, state: 'none' });
    expect(server.kit.get(EMAIL)).toBe('active');
  });

  it('the email service holds the address as stopped: blocked, the record is switched off with the server-only label, and switching on again does not stick', async () => {
    server.kit = new Map([[EMAIL, 'cancelled' as const]]);
    server.newsWaitMs = 0;
    await agree(true);
    expect(await a.syncNews()).toEqual({ synced: true, optIn: false, state: 'blocked' });
    expect(await a.consent()).toEqual({ termsVersion: '2026-12', privacyVersion: '2026-12', newsOptIn: false, source: 'email_service' });
    await a.setNews(true, WEB);
    expect((await a.consent())!.source).toBe('web');
    expect(await a.syncNews()).toEqual({ synced: true, optIn: false, state: 'blocked' });
    expect((await a.consent())!.source).toBe('email_service');
  });

  it('switched off in the app after the app added the address: unsubscribed (the learner\'s own switch-off reached the service), and switching on later is blocked', async () => {
    server.kit = new Map();
    server.newsWaitMs = 0;
    await agree(true);
    await a.syncNews();
    await a.setNews(false, WEB);
    expect(await a.syncNews()).toEqual({ synced: true, optIn: false, state: 'unsubscribed' });
    expect((await a.consent())!.source).toBe('web');
    // Nothing left to do at the service.
    expect(await a.syncNews()).toEqual({ synced: true, optIn: false, state: 'none' });
    await a.setNews(true, WEB);
    expect(await a.syncNews()).toEqual({ synced: true, optIn: false, state: 'blocked' });
  });

  it('the account\'s email is not confirmed: unconfirmed, nothing is sent to the email service, and the choice stays on record', async () => {
    server.kit = new Map();
    await agree(true);
    server.unconfirmed.add(a.current()!.userId);
    expect(await a.syncNews()).toEqual({ synced: false, optIn: null, state: 'unconfirmed' });
    expect(server.kit.size).toBe(0);
    expect((await a.consent())!.newsOptIn).toBe(true);
  });

  it('the email service is away after a switch-off: "server", the choice is on record, and the next call finishes it', async () => {
    server.kit = new Map();
    server.newsWaitMs = 0;
    await agree(true);
    await a.syncNews();
    server.kitDown = true;
    await a.setNews(false, WEB);
    expect(await codeOf(a.syncNews())).toBe('server');
    expect((await a.consent())!.newsOptIn).toBe(false);
    server.kitDown = false;
    expect((await a.syncNews()).state).toBe('unsubscribed');
    // With nothing to tell the service, it being away does not matter.
    server.kitDown = true;
    expect((await a.syncNews()).state).toBe('none');
  });

  it('the data download says whether the app added the address to the email service', async () => {
    await agree(true);
    expect(JSON.parse(await a.callFunction('export-my-data', {})).newsletter).toEqual({ addedToEmailService: null });
    server.kit = new Map();
    expect(JSON.parse(await a.callFunction('export-my-data', {})).newsletter).toEqual({ addedToEmailService: false });
    await a.syncNews();
    expect(JSON.parse(await a.callFunction('export-my-data', {})).newsletter).toEqual({ addedToEmailService: true });
  });

  it('asked again within 10 seconds: rate_limited with the seconds to wait; the email service down: server', async () => {
    server.kit = new Map();
    await agree(true);
    await a.syncNews();
    let e: unknown;
    try {
      await a.syncNews();
    } catch (x) {
      e = x;
    }
    expect(e).toBeInstanceOf(CloudError);
    expect((e as CloudError).code).toBe('rate_limited');
    expect((e as CloudError).retryAfterSec).toBe(10);
    now += 10_001;
    server.kitDown = true;
    expect(await codeOf(a.syncNews())).toBe('server');
    server.kitDown = false;
    now += 10_001;
    expect((await a.syncNews()).state).toBe('pending');
  });

  it('an answer it does not know is an error, never a guess', async () => {
    await agree();
    server.force('/functions/v1/newsletter-sync', 200, { synced: true, optIn: true, state: 'maybe' });
    expect(await codeOf(a.syncNews())).toBe('server');
  });
});

describe('a code-only session (the email is confirmed, no password is saved yet) is not a sign-in', () => {
  const codeSession = async () => {
    const b = createWebAuth({ fetch: server.fetch, stores: { local: memoryStorage(), session: memoryStorage() }, random: seqRandom(), lock: pageLocks(), clock: { now: () => now }, url: FAKE_URL, apiKey: FAKE_KEY, passwordWords: testPasswordWords });
    // The address already has an account with a password and an agreement: the worst case.
    await agree(true);
    now += 61_000;
    await b.sendSignUpCode(EMAIL);
    await b.confirmSignUpCode(EMAIL, server.codes.get(EMAIL)!);
    expect(b.passwordNeeded()).toBe(true);
    server.calls.length = 0;
    return b;
  };

  it('every account call refuses it before anything is sent: no export, no delete, no consent read or write, no newsletter call', async () => {
    const b = await codeSession();
    expect(await codeOf(b.callFunction('export-my-data', {}))).toBe('invalid:password_needed');
    expect(await codeOf(b.callFunction('delete-account', { confirm: 'DELETE' }))).toBe('invalid:password_needed');
    expect(await codeOf(b.termsVersion())).toBe('invalid:password_needed');
    expect(await codeOf(b.consent())).toBe('invalid:password_needed');
    expect(await codeOf(b.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true, privacyVersion: PRIVACY_VERSION, source: 'web' }))).toBe('invalid:password_needed');
    expect(await codeOf(b.setNews(false, WEB))).toBe('invalid:password_needed');
    expect(await codeOf(b.syncNews())).toBe('invalid:password_needed');
    expect(server.calls.filter((c) => c.path.startsWith('/functions/v1/') || c.path.startsWith('/rest/v1/'))).toEqual([]);
    expect(server.userByEmail(EMAIL)).toBeDefined();
    expect((await a.consent())!.newsOptIn).toBe(true);
  });

  it('once the password is saved the same session works', async () => {
    const b = await codeSession();
    await b.setPassword('Copper falcon wobbly harbor 9#');
    expect(b.passwordNeeded()).toBe(false);
    expect(await b.termsVersion()).toBe('2026-12');
    expect(JSON.parse(await b.callFunction('export-my-data', {})).app).toBe('kaisip');
  });

  it('this page asks for a sign-up code at most once a minute, whatever the address', async () => {
    const b = createWebAuth({ fetch: server.fetch, stores: { local: memoryStorage(), session: memoryStorage() }, random: seqRandom(), lock: pageLocks(), clock: { now: () => now }, url: FAKE_URL, apiKey: FAKE_KEY, passwordWords: testPasswordWords });
    await b.sendSignUpCode('one@example.com');
    server.calls.length = 0;
    let e: unknown;
    try {
      await b.sendSignUpCode('two@example.com');
    } catch (x) {
      e = x;
    }
    expect((e as CloudError).code).toBe('rate_limited');
    expect((e as CloudError).retryAfterSec).toBe(60);
    expect(server.calls).toHaveLength(0);
    now += 60_000;
    await b.sendSignUpCode('two@example.com');
    expect(server.calls.map((c) => c.path)).toEqual(['/auth/v1/otp']);
    // An address that is not one sends nothing and does not start the minute.
    now += 60_000;
    expect(await codeOf(b.sendSignUpCode('not an address'))).toBe('invalid:email');
    await b.sendSignUpCode('three@example.com');
  });
});

describe('a consent write is only "saved" when the learner\'s one row comes back holding it', () => {
  it('the news switch with no agreement on record (no row): refused, not "On"', async () => {
    expect(await codeOf(a.setNews(true, WEB))).toBe('invalid:terms');
    const call = profileCalls('PATCH')[0];
    expect(call.headers.prefer).toBe('return=representation');
    expect(call.path).toContain('select=marketing_opt_in');
  });

  it('a row that comes back with another value, or no row for the re-accept: refused', async () => {
    await agree();
    server.force('/rest/v1/profiles?id=eq', 200, [{ marketing_opt_in: false }]);
    expect(await codeOf(a.setNews(true, WEB))).toBe('invalid:terms');
    server.force('/rest/v1/profiles?id=eq', 200, []);
    expect(await codeOf(agree())).toBe('invalid:terms');
    server.force('/rest/v1/profiles?id=eq', 200, [{ terms_version: '2026-11', privacy_version: '2026-12' }]);
    expect(await codeOf(agree())).toBe('invalid:terms');
    // The plain case still works, and says what it recorded.
    await a.setNews(true, WEB);
    expect((await a.consent())!.newsOptIn).toBe(true);
  });
});

describe('the consent registry (docs/legal/consent_wording.md)', () => {
  // The registry is added by the database branch (claude/db-sessions-consent). Until the two
  // branches meet, this copy of its 2026-12 section stands in.
  // TODO(consent-registry): once docs/legal/consent_wording.md is on this branch, delete REGISTRY_COPY;
  // the test below already reads the file when it exists.
  const REGISTRY_COPY = [
    '## Version `2026-12` (current)',
    "- **Labels sent:** `terms_version = '2026-12'`, `privacy_version = '2026-12'`,",
    "  and, only if the optional box is ticked, `marketing_wording = '2026-12'`.",
    '   > I agree to the Terms of Use and Privacy Policy.',
    '   > Accounts are for learners 18 and older.',
    '   > Email me KaiSip study tips and news (optional). Unsubscribe anytime.',
  ].join('\n');
  const ROOT = path.join(__dirname, '..', '..', '..');
  const file = path.join(ROOT, 'docs', 'legal', 'consent_wording.md');
  const registry = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : REGISTRY_COPY;
  const current = registry.slice(registry.indexOf('## Version `2026-12`')).split(/\n## Version /)[0];
  const AGREE = 'I agree to the Terms of Use and Privacy Policy.';
  const AGE = 'Accounts are for learners 18 and older.';
  const NEWS = 'Email me KaiSip study tips and news (optional). Unsubscribe anytime.';

  it('lists every version label the clients send, as the current version', () => {
    expect(current).toContain('(current)');
    expect(current).toContain(`\`terms_version = '${TERMS_VERSION}'\``);
    expect(current).toContain(`\`privacy_version = '${PRIVACY_VERSION}'\``);
    expect(current).toContain(`\`marketing_wording = '${NEWS_WORDING_VERSION}'\``);
    expect(CONSENT).toEqual({ terms: TERMS_VERSION, privacy: PRIVACY_VERSION, news: NEWS_WORDING_VERSION, source: 'web' });
  });

  it('holds the words of each box and the age line exactly as the phone shows them', () => {
    for (const words of [AGREE, AGE, NEWS]) expect(current).toContain(`> ${words}`);
    expect(COPY['signin.age']).toBe(AGREE);
    expect(COPY['signin.age.line']).toBe(AGE);
  });

  it('and exactly as the website shows them, which reads its version labels from the shared client only', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    expect(html).toContain(`var KA_AGE_WORDS = '${AGE}';`);
    expect(html).toContain(`var KA_NEWS_WORDS = '${NEWS}';`);
    // The agree box is the sentence with its two links.
    expect(html).toMatch(/I agree to the ' \+ kaNewTab\('terms\.html', 'Terms of Use'\) \+ ' and ' \+ kaNewTab\('privacy\.html', 'Privacy Policy'\) \+ '\.'/);
    // No version label is written on the page: it comes from KaiSipCloud.config.CONSENT.
    const start = html.indexOf('// ── ACCOUNTS (web sign-in');
    const end = html.indexOf('// ── ACCOUNTS END ──');
    expect(start).toBeGreaterThan(0);
    expect(html.slice(start, end)).not.toMatch(/'20\d\d-\d\d'/);
    expect(html.slice(start, end)).toContain('KaiSipCloud.config.CONSENT');
  });

  it('keeps the website\'s sign-up screen for this version as evidence (docs/legal/consent_screens/<version>-web.png)', () => {
    const shot = path.join(ROOT, 'docs', 'legal', 'consent_screens', `${TERMS_VERSION}-web.png`);
    expect(fs.existsSync(shot)).toBe(true);
    // A real PNG of a phone-width page, not a placeholder.
    const png = fs.readFileSync(shot);
    expect(png.subarray(1, 4).toString('latin1')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(390);
    expect(png.readUInt32BE(20)).toBeGreaterThan(png.readUInt32BE(16));
  });
});
