/**
 * Release channels (architecture decision, 15 Oct 2026): a store build must
 * never listen to the "preview" update channel, where every merge to main is
 * published automatically.
 *
 * These tests run scripts/check-release-config.mjs as CI does, on the real
 * app.json + eas.json and on small made-up configs that must fail, and check
 * scripts/set-update-channel.mjs (used by the backup APK builders) only
 * accepts "preview".
 */
import { spawnSync } from 'child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const MOBILE = join(__dirname, '..', '..');
const CHECK = join(MOBILE, 'scripts', 'check-release-config.mjs');
const SET_CHANNEL = join(MOBILE, 'scripts', 'set-update-channel.mjs');
const APP_CONFIG = join(MOBILE, 'app.config.js');

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'release-config-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Runs the check on these configs; returns its exit code and output.
 * `configFile` is the app.config.js to use (default: the real one; a path
 * that doesn't exist means "no app.config.js", so app.json is used as is).
 */
function check(app: object, eas: object, configFile = APP_CONFIG) {
  const appFile = join(dir, 'app.json');
  const easFile = join(dir, 'eas.json');
  writeFileSync(appFile, JSON.stringify(app));
  writeFileSync(easFile, JSON.stringify(eas));
  const r = spawnSync(process.execPath, [CHECK, '--app', appFile, '--eas', easFile, '--config', configFile], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const APP = { expo: { updates: { url: 'https://u.expo.dev/x' } } };
const GOOD_EAS = {
  build: {
    development: { developmentClient: true, distribution: 'internal', channel: 'development' },
    preview: { distribution: 'internal', channel: 'preview', android: { buildType: 'apk' } },
    production: { channel: 'production', autoIncrement: true },
  },
};

describe('check-release-config', () => {
  it('passes on the real app.json and eas.json', () => {
    const r = spawnSync(process.execPath, [CHECK], { encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('passes on a good config', () => {
    expect(check(APP, GOOD_EAS).code).toBe(0);
  });

  it('fails when app.json hardcodes a channel', () => {
    const app = { expo: { updates: { requestHeaders: { 'expo-channel-name': 'preview' } } } };
    const r = check(app, GOOD_EAS);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/app\.json sets the update channel to "preview"/);
  });

  it('fails when the production profile uses preview', () => {
    const eas = { build: { ...GOOD_EAS.build, production: { channel: 'preview' } } };
    const r = check(APP, eas);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/"production" \(android\) makes a store build but listens on the "preview" channel/);
  });

  it('fails when a store profile names no channel', () => {
    const eas = { build: { ...GOOD_EAS.build, production: { autoIncrement: true } } };
    const r = check(APP, eas);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/"production" \(ios\) names no update channel/);
  });

  it('follows extends and per-platform overrides', () => {
    // A store profile that inherits the preview channel from its parent.
    const inherits = { build: { ...GOOD_EAS.build, store: { extends: 'preview', distribution: 'store' } } };
    expect(check(APP, inherits).out).toMatch(/"store" \(android\) makes a store build but listens on the "preview" channel/);
    // An internal profile whose iOS half is a store build.
    const iosStore = { build: { ...GOOD_EAS.build, preview: { ...GOOD_EAS.build.preview, ios: { distribution: 'store' } } } };
    const r = check(APP, iosStore);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/"preview" \(ios\) makes a store build/);
    expect(r.out).not.toMatch(/"preview" \(android\)/);
  });

  it('fails when a profile named production* is internal but not on production', () => {
    const eas = { build: { ...GOOD_EAS.build, 'production-apk': { distribution: 'internal', channel: 'preview' } } };
    expect(check(APP, eas).out).toMatch(/"production-apk" \(android\) is a production profile/);
  });

  it('skips development builds', () => {
    const eas = { build: { ...GOOD_EAS.build, development: { developmentClient: true } } };
    expect(check(APP, eas).code).toBe(0);
  });

  // Rule 5 (owner decision, 22 Oct 2026): store builds ship with over-the-air
  // updates OFF until they are signed (SECURITY_GATES.md Gate 1).
  it('fails when a store build would keep updates on (no app.config.js)', () => {
    const r = check(APP, GOOD_EAS, join(dir, 'no-app.config.js'));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/"production" makes a store build with over-the-air updates ON/);
    // Test builds are not affected: preview keeps its updates.
    expect(r.out).not.toMatch(/"preview" makes a store build/);
  });

  it('fails when an app.config.js turns updates on for the store build', () => {
    const on = join(dir, 'on.config.js');
    writeFileSync(on, 'module.exports = ({ config }) => ({ ...config, updates: { ...config.updates, enabled: true } });');
    expect(check(APP, GOOD_EAS, on).out).toMatch(/"production" makes a store build with over-the-air updates ON/);
  });

  it('fails for a new store profile that app.config.js does not switch off', () => {
    const eas = { build: { ...GOOD_EAS.build, 'store-beta': { channel: 'production' } } };
    const r = check(APP, eas);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/"store-beta" makes a store build with over-the-air updates ON/);
    expect(r.out).not.toMatch(/"production" makes a store build with/);
  });

  it('steps aside once updates are signed (a code-signing certificate in app.json)', () => {
    const signed = { expo: { updates: { url: 'https://u.expo.dev/x', codeSigningCertificate: './certs/certificate.pem' } } };
    expect(check(signed, GOOD_EAS, join(dir, 'no-app.config.js')).code).toBe(0);
  });

  it('runs app.config.js with only EAS_BUILD_PROFILE set, so a local variable cannot change the answer', () => {
    const spy = join(dir, 'spy.config.js');
    writeFileSync(
      spy,
      [
        'module.exports = ({ config }) => {',
        '  const onlyProfile = Object.keys(process.env).join() === "EAS_BUILD_PROFILE";',
        '  return { ...config, updates: { ...config.updates, enabled: !(onlyProfile && process.env.EAS_BUILD_PROFILE === "production") } };',
        '};',
      ].join('\n'),
    );
    expect(check(APP, GOOD_EAS, spy).code).toBe(0);
  });

  it('fails closed on a broken extends', () => {
    const eas = { build: { ...GOOD_EAS.build, broken: { extends: 'missing' } } };
    const r = check(APP, eas);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/could not check the config/);
  });
});

describe('set-update-channel', () => {
  /** A throwaway copy of mobile/ holding only app.json and the script. */
  function copy() {
    mkdirSync(join(dir, 'scripts'));
    copyFileSync(SET_CHANNEL, join(dir, 'scripts', 'set-update-channel.mjs'));
    writeFileSync(join(dir, 'app.json'), JSON.stringify({ expo: { name: 'X', updates: { url: 'u' } } }));
    return join(dir, 'scripts', 'set-update-channel.mjs');
  }

  it('writes preview into the copy app.json', () => {
    const script = copy();
    const r = spawnSync(process.execPath, [script, 'preview'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    const app = JSON.parse(readFileSync(join(dir, 'app.json'), 'utf8'));
    expect(app.expo.updates).toEqual({ url: 'u', requestHeaders: { 'expo-channel-name': 'preview' } });
  });

  it('refuses production (store builds come from EAS)', () => {
    const script = copy();
    const r = spawnSync(process.execPath, [script, 'production'], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(JSON.parse(readFileSync(join(dir, 'app.json'), 'utf8')).expo.updates.requestHeaders).toBeUndefined();
  });
});
