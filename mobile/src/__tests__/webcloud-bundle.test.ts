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

/** The committed bundle, run like a browser script. `origin`: the page's location.origin (none: like Node). */
function loadCloud(origin?: string): any {
  const sandbox: Record<string, unknown> = {};
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
    expect(Object.keys(K).sort()).toEqual(['accountsAllowed', 'browser', 'config', 'create', 'liveStoreVersions', 'liveVersion', 'sourceHash']);
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
      wait: async () => {},
    });
    await c.auth.sendEmailCode('maya@example.com');
    const info = await c.auth.verifyEmailCode('maya@example.com', server.codes.get('maya@example.com')!);
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
