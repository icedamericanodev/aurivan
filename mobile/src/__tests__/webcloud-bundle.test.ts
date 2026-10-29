/**
 * Accounts beta §1.1 and §1.3 "Critical: the version stamp": the website's
 * cloud bundle (../assets/kaisip-cloud.js, built by
 * scripts/build-web-plant.mjs from src/webcloud).
 * - The committed file is up to date with its sources and mobile/LIVE_VERSION.
 * - Loaded like a browser script, it exposes window.KaiSipCloud, stamps
 *   pushes with LIVE_VERSION (whatever the page asks for), and signs in and
 *   syncs against the fake Supabase.
 * - The version-stamp rule: LIVE_VERSION is one x.y.z line, never ahead of
 *   app.json, and a bundle stamped newer than it fails `--check`.
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

function loadCloud(): any {
  const sandbox: Record<string, unknown> = {};
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(ASSET, 'utf8'), sandbox, { filename: 'kaisip-cloud.js' });
  return sandbox.KaiSipCloud;
}

describe('the cloud bundle', () => {
  it('is up to date with its sources and LIVE_VERSION (the --check)', () => {
    expect(bundle.checkBundle(undefined, 'cloud')).toEqual([]);
  }, 60_000);

  it('exposes the client, stamped with mobile/LIVE_VERSION', () => {
    const K = loadCloud();
    expect(K.liveVersion).toBe(LIVE);
    expect(typeof K.create).toBe('function');
    expect(typeof K.cloud.createWebCloud).toBe('function');
    expect(typeof K.browser.browserLocks).toBe('function');
    expect(K.config.SUPABASE_URL).toBe(SUPABASE_URL);
    expect(typeof K.toWeb.toWeb).toBe('function');
    expect(Object.isFrozen(K)).toBe(true);
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

  it('a bundle text says its own stamp (what --check reads)', () => {
    const text = bundle.buildBundle('cloud', { liveVersion: '1.2.3' });
    expect(bundle.bundleStamp(text)).toBe('1.2.3');
    expect(bundle.bundleStamp('no stamp here')).toBeNull();
  }, 60_000);
});
