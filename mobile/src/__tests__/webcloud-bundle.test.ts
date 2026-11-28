/**
 * Accounts beta §1.1 and §1.3 "Critical: the version stamp": the website's
 * cloud bundle (../assets/kaisip-cloud.js, built by
 * scripts/build-web-plant.mjs from src/webcloud).
 * - The committed file is up to date with its sources and mobile/LIVE_VERSION.
 * - Loaded like a browser script, it exposes window.KaiSipCloud, stamps
 *   pushes with LIVE_VERSION (whatever the page asks for), and signs in and
 *   syncs against the fake Supabase.
 * - The version-stamp rule: LIVE_VERSION is one x.y.z line, never ahead of
 *   app.json, and a bundle stamped newer than it fails `--check`; the same
 *   for the store versions (mobile/LIVE_STORE_VERSIONS.json).
 * - Only KaiSipCloud.create is exposed, and it runs only on https://kaisip.com.
 * - The bundle holds no secret-shaped text, only the public URL and key.
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { CompressionStream, DecompressionStream, ReadableStream } from 'stream/web';
import { TERMS_VERSION } from '../engine/account';
import { PUBLISHABLE_KEY, SUPABASE_URL } from '../webcloud/config';
import { FAKE_KEY, FAKE_URL, FakeSupabase, memoryStorage, seqRandom } from '../../jest/webcloud-fakes';
import { BANK, fakeWeb, QUESTION_IDS, webAnswer } from '../../jest/webcloud-web';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bundle = require('../../scripts/web-plant-bundle.cjs');

const ROOT = path.join(__dirname, '..', '..', '..');
const ASSET = path.join(ROOT, 'assets', 'kaisip-cloud.js');
const LIVE = fs.readFileSync(path.join(__dirname, '..', '..', 'LIVE_VERSION'), 'utf8').trim();
const APP = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8')).expo.version as string;

const LIVE_STORES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'LIVE_STORE_VERSIONS.json'), 'utf8'));

const WORDS_ASSET = path.join(ROOT, 'assets', 'kaisip-password-words.js');
/** The committed word-list file, run like a browser script (window.KaiSipPasswordWords). */
function loadWords(): any {
  const sandbox: Record<string, unknown> = {};
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(WORDS_ASSET, 'utf8'), sandbox, { filename: 'kaisip-password-words.js' });
  return sandbox.KaiSipPasswordWords;
}

/** The committed bundle, run like a browser script. `origin`: the page's location.origin (none: like Node). */
function loadCloud(origin?: string, globals: Record<string, unknown> = {}): any {
  const sandbox: Record<string, unknown> = { ...globals };
  sandbox.window = sandbox;
  if (origin !== undefined) sandbox.location = { origin };
  vm.runInNewContext(fs.readFileSync(ASSET, 'utf8'), sandbox, { filename: 'kaisip-cloud.js' });
  return sandbox.KaiSipCloud;
}

describe('the cloud bundle', () => {
  it('is up to date with its sources and LIVE_VERSION (the --check)', () => {
    expect(bundle.checkBundle(undefined, 'cloud')).toEqual([]);
  }, 60_000);

  it('exposes only create (never the raw client), stamped with mobile/LIVE_VERSION and the live store versions', () => {
    const K = loadCloud();
    expect(K.liveVersion).toBe(LIVE);
    expect(K.liveStoreVersions).toEqual(LIVE_STORES);
    expect(typeof K.create).toBe('function');
    expect(K.cloud).toBeUndefined();
    expect(Object.keys(K).sort()).toEqual(['accountsAllowed', 'breach', 'browser', 'config', 'create', 'liveStoreVersions', 'liveVersion', 'passwordRules', 'passwordWordsIntegrity', 'passwordWordsRef', 'sourceHash']);
    // The ?v= the page loads the word lists with: the words file's own fingerprint; and its
    // full SHA-256 in Subresource Integrity form for <script integrity="...">.
    const wordsText = fs.readFileSync(WORDS_ASSET, 'utf8');
    expect(K.passwordWordsRef).toBe(bundle.refFor(wordsText));
    expect(K.passwordWordsIntegrity).toBe(`sha256-${createHash('sha256').update(wordsText).digest('base64')}`);
    // Test-only helpers are not public.
    for (const m of Object.values(K)) if (m && typeof m === 'object') for (const k of Object.keys(m)) expect(k).not.toMatch(/ForTest$/);
    expect(typeof K.passwordRules.loadPasswordWords).toBe('function');
    // The password rules are there for the forms (the client checks again before sending).
    expect(K.passwordRules.checkPassword('aaaaaaaaaaaaaaa')).toEqual(['common']);
    expect(K.passwordRules.checkPassword('ocean violet lamp seven')).toEqual([]);
    expect(K.passwordRules.PASSWORD_MIN_CHARS).toBe(15);
    // The leaked-password check is on, with its one host and the SHA-1 adapter for the page.
    expect(K.config.BREACH_CHECK_ON).toBe(true);
    expect(K.config.BREACH_HOST).toBe('https://api.pwnedpasswords.com');
    expect(typeof K.browser.browserSha1Hex).toBe('function');
    expect(typeof K.breach.createBreachCheck).toBe('function');
    expect(typeof K.browser.browserLocks).toBe('function');
    expect(K.config.SUPABASE_URL).toBe(SUPABASE_URL);
    expect(Object.isFrozen(K)).toBe(true);
  });

  it('create runs only on https://kaisip.com; the dev override adds only localhost and Node, never another site', () => {
    const opts = (extra = {}) => ({
      fetch: async () => ({ status: 200, headers: { get: () => null }, text: async () => '' }),
      stores: { local: memoryStorage(), session: memoryStorage() },
      random: seqRandom(),
      lock: { request: (_n: string, fn: () => Promise<unknown>) => fn() },
      clock: { now: () => 0 },
      gzip: { CompressionStream, DecompressionStream, ReadableStream },
      host: fakeWeb().host,
      bank: BANK,
      ...extra,
    });
    expect(() => loadCloud('https://kaisip.com').create(opts())).not.toThrow();
    for (const o of ['https://kaisip.pages.dev', 'https://evil.example', 'null', 'http://kaisip.com', 'https://www.kaisip.com']) {
      expect(() => loadCloud(o).create(opts())).toThrow(/only on https:\/\/kaisip\.com/);
      expect(() => loadCloud(o).create(opts({ devOrigin: true }))).toThrow(/only on/);
      // The page can't claim another address either: create fills origin in itself.
      expect(() => loadCloud(o).create(opts({ origin: 'https://kaisip.com' }))).toThrow(/only on/);
    }
    expect(() => loadCloud().create(opts())).toThrow(/only on/);
    expect(() => loadCloud().create(opts({ devOrigin: true }))).not.toThrow();
    expect(() => loadCloud('http://localhost:8000').create(opts({ devOrigin: true }))).not.toThrow();
  });

  it('create gives the leaked-password check the page\'s crypto.subtle SHA-1 when there is one, and the pure one when not', async () => {
    const lookups: string[] = [];
    const run = async (globals: Record<string, unknown>) => {
      const server = new FakeSupabase(() => Date.UTC(2026, 10, 28));
      const K = loadCloud(undefined, { setTimeout, clearTimeout, AbortController, ...globals });
      const c = K.create({
        fetch: async (url: string, init: { headers: Record<string, string> }) => {
          if (!url.startsWith('https://api.pwnedpasswords.com/')) return server.fetch(url, init as never);
          lookups.push(url.slice(-5));
          return { status: 200, headers: { get: () => null }, text: async () => '0018A45C4D1DEF81644B54AB7F969B88D65:0' };
        },
        stores: { local: memoryStorage(), session: memoryStorage() },
        random: seqRandom(),
        lock: K.browser.pageLocks(),
        clock: { now: () => Date.UTC(2026, 10, 28) },
        gzip: { CompressionStream, DecompressionStream, ReadableStream },
        host: fakeWeb().host,
        bank: BANK,
        devOrigin: true,
        url: FAKE_URL,
        apiKey: FAKE_KEY,
        passwordWords: async () => {
          const W = loadWords();
          return { short: W.words.PASSWORD_SHORT_LIST, dict: W.words.PASSWORD_DICT_LIST, local: W.words.PASSWORD_LOCAL_LIST, names: W.words.PASSWORD_NAMES_LIST };
        },
      });
      await c.auth.startPasswordSignUp('maya@example.com', 'ocean violet lamp seven');
      return c.auth.breachState();
    };
    const digests: string[] = [];
    const subtle = {
      digest: async (alg: string, data: Uint8Array) => {
        digests.push(alg);
        return new Uint8Array(createHash('sha1').update(data).digest()).buffer;
      },
    };
    expect(await run({ crypto: { subtle } })).toBe('clean');
    expect(digests).toEqual(['SHA-1', 'SHA-1']);
    const withSubtle = lookups.splice(0);
    expect(await run({})).toBe('clean'); // no crypto.subtle (Hermes, http): the pure SHA-1, same prefixes
    expect(lookups).toEqual(withSubtle);
    expect(withSubtle).toEqual(['ocean violet lamp seven', 'oceanvioletlampseven'].map((f) => createHash('sha1').update(f).digest('hex').toUpperCase().slice(0, 5)));
  });

  it('signs in and syncs from the bundle; every push says LIVE_VERSION, even if the page asks otherwise (W11)', async () => {
    let now = Date.UTC(2026, 9, 28, 9, 0, 0);
    const server = new FakeSupabase(() => now);
    const web = fakeWeb();
    const K = loadCloud();
    const c = K.create({
      fetch: server.fetch,
      stores: { local: memoryStorage(), session: memoryStorage() },
      random: seqRandom(),
      lock: K.browser.pageLocks(),
      clock: { now: () => now },
      gzip: { CompressionStream, DecompressionStream, ReadableStream },
      host: web.host,
      bank: BANK,
      appVersion: '99.0.0',
      storeVersions: { progress: 99, settings: 99 },
      devOrigin: true,
      url: FAKE_URL,
      apiKey: FAKE_KEY,
      // The page fetches the word lists only when a password form opens (a separate file).
      passwordWords: async () => {
        const W = loadWords();
        return { short: W.words.PASSWORD_SHORT_LIST, dict: W.words.PASSWORD_DICT_LIST, local: W.words.PASSWORD_LOCAL_LIST, names: W.words.PASSWORD_NAMES_LIST };
      },
      wait: async () => {},
    });
    // The sign-up loads the lists first (fail closed), so "monkeymonkeymonkey" is refused.
    expect(await c.auth.startPasswordSignUp('maya@example.com', 'monkeymonkeymonkey').then(() => 'ok', (e: { detail?: string }) => e.detail)).toBe('password_common');
    expect(K.passwordRules.passwordWordsLoaded()).toBe(true);
    await c.auth.startPasswordSignUp('maya@example.com', 'ocean violet lamp seven');
    const done = await c.auth.finishPasswordSignUp('maya@example.com', server.codes.get('maya@example.com')!, 'ocean violet lamp seven');
    expect(done.passwordSaved).toBe(true);
    const info = done.account;
    await c.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    webAnswer(web, QUESTION_IDS[0], true, now - 1000);
    const prep = await c.prepareFirst();
    expect(prep.ok).toBe(true);
    expect((await c.confirmFirst(prep.prep, 'merge')).kind).toBe('synced');
    expect(server.row(info.userId, 'progress')!.app_version).toBe(LIVE);
    expect(server.row(info.userId, 'progress')!.store_version).toBe(LIVE_STORES.progress);
    expect(server.row(info.userId, 'settings')!.store_version).toBe(LIVE_STORES.settings);
    now += 1000;
  });

  it('carries only the public project address and key, nothing secret-shaped', () => {
    const text = fs.readFileSync(ASSET, 'utf8');
    expect(text).toContain(SUPABASE_URL);
    expect(text).toContain(PUBLISHABLE_KEY);
    const patterns = fs
      .readFileSync(path.join(ROOT, 'scripts', 'secret_patterns.txt'), 'utf8')
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#'));
    for (const p of patterns) expect(new RegExp(p).test(text)).toBe(false);
  });
});

describe('the password word-list file (loaded only when a password form opens)', () => {
  it('is up to date with its source, holds only the four scrambled lists, and is not in the cloud bundle', () => {
    expect(bundle.checkBundle(undefined, 'passwordWords')).toEqual([]);
    const W = loadWords();
    expect(Object.keys(W).sort()).toEqual(['sourceHash', 'words']);
    expect(Object.keys(W.words).sort()).toEqual(['PASSWORD_DICT_LIST', 'PASSWORD_DICT_SIZE', 'PASSWORD_LOCAL_LIST', 'PASSWORD_LOCAL_SIZE', 'PASSWORD_NAMES_LIST', 'PASSWORD_NAMES_SIZE', 'PASSWORD_SHORT_LIST', 'PASSWORD_SHORT_SIZE']);
    expect(W.words.PASSWORD_SHORT_SIZE).toBe(100000);
    expect(W.words.PASSWORD_DICT_SIZE).toBeGreaterThan(15000);
    expect(W.words.PASSWORD_LOCAL_SIZE).toBeGreaterThan(500);
    // The cloud bundle accepts only these exact lists (sizes and SHA-256 recorded at build time).
    const K = loadCloud();
    expect(K.passwordRules.loadPasswordWords({ short: W.words.PASSWORD_SHORT_LIST.slice(0, 5000), dict: W.words.PASSWORD_DICT_LIST, local: W.words.PASSWORD_LOCAL_LIST, names: W.words.PASSWORD_NAMES_LIST })).toBe(false);
    expect(K.passwordRules.loadPasswordWords({ short: W.words.PASSWORD_SHORT_LIST, dict: W.words.PASSWORD_DICT_LIST, local: W.words.PASSWORD_LOCAL_LIST, names: W.words.PASSWORD_NAMES_LIST })).toBe(true);
    const cloudText = fs.readFileSync(ASSET, 'utf8');
    expect(cloudText).not.toContain('PASSWORD_DICT_LIST');
    expect(cloudText).not.toContain('PASSWORD_SHORT_LIST');
    // Scrambled: a common word is not there as plain text.
    const wordsText = fs.readFileSync(WORDS_ASSET, 'utf8');
    expect(wordsText).not.toMatch(/\bcongratulations\b/);
    expect(wordsText).not.toMatch(/\nfootball\b/);
    expect(wordsText).not.toMatch(/mahalkita/);
  }, 60_000);
});

describe('the version-stamp rule (LIVE_VERSION)', () => {
  it('mobile/LIVE_VERSION is one x.y.z line, not ahead of app.json', () => {
    expect(LIVE).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    expect(bundle.stampProblems({ bundleVersion: LIVE, liveVersion: LIVE, appVersion: APP })).toEqual([]);
  });

  it('fails when the bundle is stamped newer than the Play release', () => {
    expect(bundle.stampProblems({ bundleVersion: '1.49.0', liveVersion: '1.48.0', appVersion: '1.50.0' })).toEqual([expect.stringContaining('newer than the Play release')]);
    expect(bundle.stampProblems({ bundleVersion: '1.48.1', liveVersion: '1.48.0', appVersion: '1.50.0' })).toHaveLength(1);
    expect(bundle.stampProblems({ bundleVersion: '1.47.9', liveVersion: '1.48.0', appVersion: '1.50.0' })).toEqual([]);
  });

  it('fails when LIVE_VERSION is malformed or ahead of the app', () => {
    expect(bundle.stampProblems({ bundleVersion: null, liveVersion: '1.48', appVersion: '1.50.0' })).toHaveLength(1);
    expect(bundle.stampProblems({ bundleVersion: null, liveVersion: '', appVersion: '1.50.0' })).toHaveLength(1);
    expect(bundle.stampProblems({ bundleVersion: null, liveVersion: '1.51.0', appVersion: '1.50.0' })).toEqual([expect.stringContaining('ahead of')]);
  });

  it('the live store versions: recorded, equal to the engine\'s, never behind what the bundle stamps', () => {
    const base = { bundleVersion: '1.48.0', liveVersion: '1.48.0', appVersion: '1.50.0' };
    expect(bundle.stampProblems({ ...base, liveStores: { progress: 2, settings: 1 }, sourceStores: { progress: 2, settings: 1 }, bundleStores: { progress: 2, settings: 1 } })).toEqual([]);
    // The engine moved ahead of the Play release: the website must wait for the rollout.
    expect(bundle.stampProblems({ ...base, liveStores: { progress: 2, settings: 1 }, sourceStores: { progress: 3, settings: 1 } })).toEqual([expect.stringContaining('ahead of the Play release')]);
    expect(bundle.stampProblems({ ...base, liveStores: { progress: 2, settings: 1 }, sourceStores: { progress: 2, settings: 1 }, bundleStores: { progress: 3, settings: 1 } })).toEqual([expect.stringContaining('newer than the Play release')]);
    expect(bundle.stampProblems({ ...base, liveStores: { progress: 4, settings: 1 }, sourceStores: { progress: 2, settings: 1 } })).toHaveLength(1);
    expect(bundle.stampProblems({ ...base, liveStores: null, sourceStores: { progress: 2, settings: 1 } })).toHaveLength(1);
    expect(bundle.stampProblems({ ...base, liveStores: { progress: 2, settings: 1 }, sourceStores: { progress: NaN, settings: 1 } })).toHaveLength(1);
  });

  it('a bundle text says its own stamps (what --check reads)', () => {
    const text = bundle.buildBundle('cloud', { liveVersion: '1.2.3', liveStores: { progress: 7, settings: 3 } });
    expect(bundle.bundleStamp(text)).toBe('1.2.3');
    expect(bundle.bundleStoreStamp(text)).toEqual({ progress: 7, settings: 3 });
    expect(bundle.bundleStamp('no stamp here')).toBeNull();
  }, 60_000);
});
