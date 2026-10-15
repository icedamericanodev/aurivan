#!/usr/bin/env node
/**
 * check-release-config.mjs: makes sure a store build can never listen to the
 * "preview" update channel (architecture decision, 15 Oct 2026).
 *
 *   node scripts/check-release-config.mjs                 check app.json + eas.json
 *   node scripts/check-release-config.mjs --app <file> --eas <file>   (tests)
 *
 * WHAT IT IS ABOUT (plain English):
 *   An over-the-air update is published to a CHANNEL. A phone only downloads
 *   updates from the one channel its build was made for:
 *     - "preview":    test APKs. Every merge to main is published here
 *                     automatically (.github/workflows/eas-update.yml).
 *     - "production": the store apps. Only tested updates, sent on purpose.
 *   If a store build listened to "preview", every learner would get untested
 *   code the moment it is merged. This check stops that before it can happen.
 *
 *   Where the channel comes from:
 *     - EAS Build (expo.dev) writes the build profile's `channel` from
 *       eas.json into the app. That is the ONLY place a channel is set.
 *     - app.json must NOT set one (updates.requestHeaders["expo-channel-name"]).
 *       If it did, a store profile that forgot its `channel` would silently
 *       keep the app.json value (checked in @expo/build-tools 24: it only
 *       overwrites the header when the profile has a channel).
 *     - The two backup builders that don't use EAS (the GitHub "Android test
 *       APK" workflow and scripts/build-apk.sh) set "preview" themselves, in
 *       their throwaway copy, with scripts/set-update-channel.mjs.
 *
 * THE RULES:
 *   1. app.json sets no update channel.
 *   2. Every build profile, except development builds, names a channel.
 *   3. A profile that makes a store build (distribution "store", which is
 *      EAS's default when none is given) uses the "production" channel.
 *   4. A profile named production... uses the "production" channel.
 *   Profiles may `extends` another; the rules apply to the merged result, and
 *   per platform (an `android` or `ios` block can override distribution or
 *   channel).
 *
 * CI runs this in .github/workflows/mobile.yml. A Jest test runs it on good
 * and bad examples (src/__tests__/release-config.test.ts).
 * No third-party packages: only Node's built-in modules.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOBILE = path.resolve(HERE, '..');

const PLATFORMS = ['android', 'ios'];

/** One profile with everything it `extends` merged in (the child wins). */
function resolveProfile(profiles, name, seen = []) {
  if (seen.includes(name)) throw new Error(`eas.json: build profiles extend each other in a loop (${[...seen, name].join(' → ')})`);
  const own = profiles[name];
  if (!own) throw new Error(`eas.json: build profile "${seen.at(-1)}" extends "${name}", which does not exist`);
  const parent = own.extends ? resolveProfile(profiles, own.extends, [...seen, name]) : {};
  const merged = { ...parent, ...own };
  for (const p of PLATFORMS) merged[p] = { ...(parent[p] ?? {}), ...(own[p] ?? {}) };
  return merged;
}

/**
 * Every problem with this pair of config files, as plain sentences
 * (an empty list means all is well).
 */
export function releaseConfigProblems(appJson, easJson) {
  const problems = [];

  const header = appJson?.expo?.updates?.requestHeaders?.['expo-channel-name'];
  if (header !== undefined) {
    problems.push(
      `app.json sets the update channel to "${header}" (expo.updates.requestHeaders). Remove it: the channel comes only from the build profiles in eas.json.`,
    );
  }

  const profiles = easJson?.build ?? {};
  for (const name of Object.keys(profiles)) {
    const profile = resolveProfile(profiles, name);
    if (profile.developmentClient) continue; // development builds load code from your computer
    for (const platform of PLATFORMS) {
      const channel = profile[platform].channel ?? profile.channel;
      const distribution = profile[platform].distribution ?? profile.distribution ?? 'store';
      const where = `eas.json build profile "${name}" (${platform})`;
      if (!channel) {
        problems.push(`${where} names no update channel. Add "channel": "preview" for test builds or "production" for store builds.`);
        continue;
      }
      if (distribution === 'store' && channel !== 'production') {
        problems.push(`${where} makes a store build but listens on the "${channel}" channel. Store builds must use "production".`);
      } else if (/^production/i.test(name) && channel !== 'production') {
        problems.push(`${where} is a production profile but listens on the "${channel}" channel. Use "production".`);
      }
    }
  }
  return problems;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main(argv) {
  const arg = (flag, fallback) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : fallback;
  };
  const appFile = arg('--app', path.join(MOBILE, 'app.json'));
  const easFile = arg('--eas', path.join(MOBILE, 'eas.json'));

  let problems;
  try {
    problems = releaseConfigProblems(readJson(appFile), readJson(easFile));
  } catch (err) {
    console.error(`Release channels: could not check the config: ${err.message}`);
    return 1;
  }
  if (problems.length > 0) {
    for (const p of problems) console.error(`Release channels: ${p}`);
    console.error('Release channels check FAILED: a store build could receive untested preview updates.');
    return 1;
  }
  console.log('Release channels: store builds listen on "production"; app.json sets no channel.');
  return 0;
}

// Run only when called as a script (not when imported).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
