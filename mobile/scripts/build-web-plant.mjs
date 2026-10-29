#!/usr/bin/env node
/**
 * Builds the website's bundles from the mobile app's own TypeScript
 * (web-plant-bundle.cjs has the details):
 *   ../assets/kaisip-plant.js   the plant companion (window.KaiSipPlant)
 *   ../assets/kaisip-cloud.js   the accounts client and sync engine (window.KaiSipCloud)
 *
 *   node scripts/build-web-plant.mjs           write both (and index.html's ?v= where it loads them)
 *   node scripts/build-web-plant.mjs --check   fail when either is out of date, or the cloud
 *                                              bundle's version stamp breaks the Play rule
 *
 * `npm run web-plant` runs the first, `npm run check` the second.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { TARGETS, checkBundle, writeBundle } = require('./web-plant-bundle.cjs');

const check = process.argv.includes('--check');
try {
  let failed = false;
  for (const name of Object.keys(TARGETS)) {
    const file = TARGETS[name].file;
    if (check) {
      const problems = checkBundle(undefined, name);
      if (problems.length) {
        for (const p of problems) console.error(`✗ ${p}`);
        failed = true;
      } else console.log(`✓ ${file} is up to date with ${TARGETS[name].what}`);
    } else {
      const { text, ref, changed } = writeBundle(name);
      console.log(`${changed ? '✓ wrote' : '✓ unchanged:'} ${file} (${Math.round(text.length / 1024)} KB, ?v=${ref})`);
    }
  }
  if (failed) {
    console.error('  Rebuild them: cd mobile && npm run web-plant');
    process.exit(1);
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(e.code === 'NO_TS' ? 2 : 1);
}
