#!/usr/bin/env node
/**
 * Builds the password lists the apps refuse (scripts/password-lists.cjs has
 * the rules and the sources):
 *   src/engine/passwordBlocklist.ts   the 3,000 most used 15+ character passwords
 *   src/engine/passwordWords.ts       the building blocks: 10,000 short passwords
 *                                     and the English words of 15+ letters
 *
 * The sources are big (8.5 MB and 4.2 MB), so they are NOT kept in the repo.
 * Download the pinned copies, then run this script (CI does the same with --check):
 *
 *   curl -sSo /tmp/xato-1m.txt  <SOURCES.xato.url>
 *   curl -sSo /tmp/words_alpha.txt <SOURCES.words.url>
 *   node scripts/build-password-blocklist.mjs --xato /tmp/xato-1m.txt --words /tmp/words_alpha.txt
 *   node scripts/build-password-blocklist.mjs --xato /tmp/xato-1m.txt --words /tmp/words_alpha.txt --check
 *   node scripts/build-password-blocklist.mjs --urls     (prints the two addresses)
 *
 * It refuses a file whose SHA-256 is not the pinned one, so the lists can't
 * change by accident. No third-party packages: only Node's built-in modules.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const L = require('./password-lists.cjs');
const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_LONG = path.join(MOBILE, 'src', 'engine', 'passwordBlocklist.ts');
const OUT_WORDS = path.join(MOBILE, 'src', 'engine', 'passwordWords.ts');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}
function readPinned(file, src) {
  if (!file) throw new Error(`missing the ${src.file} copy (download: ${src.url})`);
  const buf = fs.readFileSync(file);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (sha !== src.sha256) throw new Error(`${file} has SHA-256 ${sha}, not the pinned ${src.sha256}`);
  return buf.toString('utf8');
}

try {
  if (process.argv.includes('--urls')) {
    console.log(`${L.SOURCES.xato.url}\n${L.SOURCES.words.url}`);
    process.exit(0);
  }
  const xato = readPinned(arg('--xato'), L.SOURCES.xato);
  const words = readPinned(arg('--words'), L.SOURCES.words);
  const outputs = [
    [OUT_LONG, L.renderBlocklistModule(L.pickLong(xato))],
    [OUT_WORDS, L.renderWordsModule(L.pickShort(xato), L.pickDict(words))],
  ];
  const check = process.argv.includes('--check');
  let stale = false;
  for (const [file, text] of outputs) {
    const rel = path.relative(MOBILE, file);
    if (check) {
      const now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (now !== text) {
        console.error(`✗ ${rel} is out of date with the pinned sources: run this script without --check`);
        stale = true;
      } else console.log(`✓ ${rel} matches the pinned sources`);
    } else {
      fs.writeFileSync(file, text);
      console.log(`✓ wrote ${rel} (${Math.round(text.length / 1024)} KB)`);
    }
  }
  if (stale) process.exit(1);
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(2);
}
