/**
 * app.config.js (mobile 1.40.1, the first Google Play build).
 *
 * What must always hold:
 * - the store build (EAS profile "production") has over-the-air updates OFF
 *   (owner decision, 22 Oct 2026; PLAY_LAUNCH.md c1), and every other build
 *   gets app.json back unchanged, so test builds keep their updates and
 *   their native fingerprint;
 * - a store build stops if the cloud flag is set without the owner's
 *   AURIVAN_CLOUD_GO_LIVE_ACK=yes (PLAY_LAUNCH.md c4), and that rule agrees
 *   with src/cloud/configGuard.ts wherever the guard would let a build pass.
 */
import { assertCloudConfig } from '../cloud/configGuard';

// The real file, loaded the way Expo loads it (CommonJS).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appConfig = require('../../app.config.js') as {
  (arg: { config: Record<string, unknown> }): Record<string, unknown>;
  configFor(config: Record<string, unknown>, env: Record<string, string | undefined>): Record<string, unknown>;
  cloudBuildProblem(env: Record<string, string | undefined>): string | null;
};
const appJson = require('../../app.json') as { expo: Record<string, unknown> & { updates: Record<string, unknown> } };

const base = () => structuredClone(appJson.expo);

describe('updates switch per build profile', () => {
  it('production: updates.enabled is false, and the rest of the updates block stays', () => {
    const out = appConfig.configFor(base(), { EAS_BUILD_PROFILE: 'production' });
    expect(out.updates).toEqual({ ...appJson.expo.updates, enabled: false });
    // Nothing else changes.
    expect({ ...out, updates: undefined }).toEqual({ ...base(), updates: undefined });
  });

  it('production on your own computer (eas build passes only the profile env): updates are off too', () => {
    const out = appConfig.configFor(base(), { KAISIP_STORE_BUILD: '1' });
    expect(out.updates).toEqual({ ...appJson.expo.updates, enabled: false });
  });

  it.each([['preview'], ['development'], [undefined]])('%s: app.json comes back exactly as it is', (profile) => {
    const input = base();
    expect(appConfig.configFor(input, { EAS_BUILD_PROFILE: profile })).toBe(input);
    expect(input.updates).not.toHaveProperty('enabled');
  });

  it('the exported function reads process.env like Expo does', () => {
    const saved = process.env.EAS_BUILD_PROFILE;
    try {
      process.env.EAS_BUILD_PROFILE = 'production';
      expect((appConfig({ config: base() }).updates as { enabled?: boolean }).enabled).toBe(false);
      process.env.EAS_BUILD_PROFILE = 'preview';
      expect(appConfig({ config: base() }).updates).not.toHaveProperty('enabled');
    } finally {
      if (saved === undefined) delete process.env.EAS_BUILD_PROFILE;
      else process.env.EAS_BUILD_PROFILE = saved;
    }
  });

  it('app.json itself never switches updates off (test builds rely on it)', () => {
    expect(appJson.expo.updates.enabled).toBeUndefined();
  });

  it('app.json blocks the advertising ID permission (Play: Advertising ID "No")', () => {
    const android = appJson.expo.android as { blockedPermissions: string[] };
    expect(android.blockedPermissions).toContain('com.google.android.gms.permission.AD_ID');
  });
});

describe('cloud flag guard on the store build', () => {
  const prod = { EAS_BUILD_PROFILE: 'production' };

  it('stops a production build that sets the flag without the go-live ack', () => {
    for (const flag of ['1', '0', 'true']) {
      const env = { ...prod, EXPO_PUBLIC_AURIVAN_CLOUD: flag };
      expect(appConfig.cloudBuildProblem(env)).toMatch(/EXPO_PUBLIC_AURIVAN_CLOUD is set .* without AURIVAN_CLOUD_GO_LIVE_ACK=yes/);
      expect(() => appConfig.configFor(base(), env)).toThrow(/without AURIVAN_CLOUD_GO_LIVE_ACK=yes/);
    }
    expect(() => appConfig.configFor(base(), { ...prod, EXPO_PUBLIC_AURIVAN_CLOUD: '1', AURIVAN_CLOUD_GO_LIVE_ACK: 'no' })).toThrow();
  });

  it('stops it on your own computer too, before the build is queued (only the profile env is set there)', () => {
    expect(appConfig.cloudBuildProblem({ KAISIP_STORE_BUILD: '1', EXPO_PUBLIC_AURIVAN_CLOUD: '1' })).toMatch(/without AURIVAN_CLOUD_GO_LIVE_ACK=yes/);
  });

  it('lets a production build through when the flag is unset or empty, or with the ack', () => {
    expect(appConfig.cloudBuildProblem(prod)).toBeNull();
    expect(appConfig.cloudBuildProblem({ ...prod, EXPO_PUBLIC_AURIVAN_CLOUD: '' })).toBeNull();
    expect(appConfig.cloudBuildProblem({ ...prod, EXPO_PUBLIC_AURIVAN_CLOUD: '  ' })).toBeNull();
    expect(appConfig.cloudBuildProblem({ ...prod, EXPO_PUBLIC_AURIVAN_CLOUD: '1', AURIVAN_CLOUD_GO_LIVE_ACK: 'yes' })).toBeNull();
  });

  it('never stops a test build (configGuard.ts covers those)', () => {
    for (const profile of ['preview', 'development', undefined]) {
      expect(appConfig.cloudBuildProblem({ EAS_BUILD_PROFILE: profile, EXPO_PUBLIC_AURIVAN_CLOUD: '1' })).toBeNull();
    }
  });

  it('is never looser than configGuard.ts: whenever the guard refuses the missing ack, so does app.config.js', () => {
    const flags = [undefined, '', '0', '1'];
    const acks = [undefined, '', 'no', 'yes'];
    const profiles = ['production', 'preview', 'development', undefined];
    for (const EXPO_PUBLIC_AURIVAN_CLOUD of flags) {
      for (const AURIVAN_CLOUD_GO_LIVE_ACK of acks) {
        for (const EAS_BUILD_PROFILE of profiles) {
          const env = { EXPO_PUBLIC_AURIVAN_CLOUD, AURIVAN_CLOUD_GO_LIVE_ACK, EAS_BUILD_PROFILE };
          let guardRefusesAck = false;
          try {
            assertCloudConfig(env);
          } catch (e) {
            guardRefusesAck = /GO_LIVE_ACK/.test(String(e));
          }
          if (guardRefusesAck) expect(appConfig.cloudBuildProblem(env)).not.toBeNull();
        }
      }
    }
  });
});
