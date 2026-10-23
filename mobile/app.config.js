/**
 * app.config.js: the few build settings that depend on WHICH build is made.
 * Everything else lives in app.json; Expo reads app.json first and passes it
 * in here as `config`, and this file returns it with at most one change.
 *
 * WHAT IT DOES (plain English):
 *
 *   1. Google Play builds have over-the-air updates switched OFF
 *      (owner decision, 22 Oct 2026; docs/mobile/PLAY_LAUNCH.md B1 Option A,
 *      docs/mobile/SECURITY_GATES.md Gate 1).
 *      Our phone updates are not signed yet (code signing needs a paid Expo
 *      plan). An unsigned update channel is a door: anyone holding the Expo
 *      publish rights could send code to every store install. So the store
 *      build (EAS profile "production") is built with `updates.enabled:
 *      false`: it only ever runs the code inside the Play release, and it
 *      never contacts Expo. Store users get changes through Play releases.
 *      Test builds (preview, development) are left exactly as app.json says,
 *      so they keep getting updates.
 *
 *   2. A store build can't switch the cloud on by accident
 *      (PLAY_LAUNCH.md c4; the same rule as src/cloud/configGuard.ts).
 *      Accounts, sync and the feedback board are built OFF until Phase 9. If
 *      EXPO_PUBLIC_AURIVAN_CLOUD is set in the EAS "production" environment
 *      without the owner's AURIVAN_CLOUD_GO_LIVE_ACK=yes, the build stops
 *      with a plain message instead of shipping.
 *
 * WHEN IT RUNS: every time Expo reads the config (expo start, expo export,
 * eas build and eas update). EAS Build sets EAS_BUILD_PROFILE on the build
 * machine, where the native project is made from this config; everywhere
 * else it is unset, and this file changes nothing.
 *
 * Why plain JavaScript and not a call into configGuard.ts: Node can't load a
 * TypeScript file (and the TypeScript files it imports) from here on every
 * build machine. The full guard joins at Phase 9, when this file grows into
 * app.config.ts with the sign-in plugins. Until then this rule is the one
 * that matters, and a Jest test checks it agrees with configGuard.ts
 * (src/__tests__/app-config.test.ts).
 *
 * scripts/check-release-config.mjs loads this file to prove the production
 * profile resolves to updates OFF (CI fails otherwise).
 */

/** The EAS build profile that makes the Google Play build (eas.json). */
const STORE_PROFILE = 'production';

/**
 * Why a build must stop, as a plain sentence, or null when all is well.
 * Only the store profile is checked: test builds may try the cloud (with the
 * other checks in src/cloud/configGuard.ts).
 */
function cloudBuildProblem(env) {
  if (env.EAS_BUILD_PROFILE !== STORE_PROFILE) return null;
  const flag = (env.EXPO_PUBLIC_AURIVAN_CLOUD ?? '').trim();
  if (flag === '' || env.AURIVAN_CLOUD_GO_LIVE_ACK === 'yes') return null;
  return (
    `KaiSip cloud config: EXPO_PUBLIC_AURIVAN_CLOUD is set ("${flag}") in the production build without AURIVAN_CLOUD_GO_LIVE_ACK=yes. ` +
    'Accounts and sync stay off until the Phase 9 go-live: remove the variable from the EAS production environment ' +
    '(npx eas-cli env:list --environment production).'
  );
}

/** The config for this build: app.json, with updates off on the store profile. */
function configFor(config, env) {
  const problem = cloudBuildProblem(env);
  if (problem) throw new Error(problem);
  if (env.EAS_BUILD_PROFILE !== STORE_PROFILE) return config; // test builds: unchanged
  return { ...config, updates: { ...config.updates, enabled: false } };
}

module.exports = ({ config }) => configFor(config, process.env);
// For scripts/check-release-config.mjs and the Jest tests.
module.exports.configFor = configFor;
module.exports.cloudBuildProblem = cloudBuildProblem;
module.exports.STORE_PROFILE = STORE_PROFILE;
