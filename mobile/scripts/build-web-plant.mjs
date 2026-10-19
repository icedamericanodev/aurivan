#!/usr/bin/env node
/**
 * Builds ../assets/kaisip-plant.js, the website's copy of the plant
 * companion, from the mobile app's own TypeScript (web-plant-bundle.cjs has
 * the details).
 *
 *   node scripts/build-web-plant.mjs           write the bundle (and index.html's ?v=)
 *   node scripts/build-web-plant.mjs --check   fail when either is out of date
 *
 * `npm run web-plant` runs the first, `npm run check` the second.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { checkBundle, writeBundle } = require('./web-plant-bundle.cjs');

const check = process.argv.includes('--check');
try {
  if (check) {
    const problems = checkBundle();
    if (problems.length) {
      for (const p of problems) console.error(`✗ ${p}`);
      console.error('  Rebuild it: cd mobile && npm run web-plant');
      process.exit(1);
    }
    console.log('✓ assets/kaisip-plant.js is up to date with the mobile plant sources');
  } else {
    const { text, ref, changed } = writeBundle();
    console.log(`${changed ? '✓ wrote' : '✓ unchanged:'} assets/kaisip-plant.js (${Math.round(text.length / 1024)} KB, ?v=${ref})`);
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(e.code === 'NO_TS' ? 2 : 1);
}
