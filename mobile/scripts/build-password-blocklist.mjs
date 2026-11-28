#!/usr/bin/env node
/**
 * Builds src/engine/passwordBlocklist.ts, the common-password list the apps
 * check new passwords against (src/engine/passwordRules.ts; owner decision
 * 28 Nov 2026, docs/WEB_LAUNCH_PLAN.md: "Client-side blocklist required").
 *
 * Plain English for the founder:
 * - The source is a public, ranked list of the passwords people use most
 *   (most used first). We keep only the ones our own rule allows in the
 *   first place (15 characters or more, at most 72 bytes): a shorter one is
 *   already refused for being too short, so storing it would only make the
 *   app bigger. OWASP ASVS 5.0 requirement 6.2.4 asks for "at least the top
 *   3000 passwords which match the application's password policy"; this keeps
 *   exactly the top 3000 of those.
 * - Each kept password is stored in lower case (the check ignores case), in
 *   Unicode NFC form (the same form the apps send), sorted, once each.
 * - The source file is big (8.5 MB), so it is NOT kept in the repo. Download
 *   it, check its fingerprint, then run this script:
 *
 *     curl -o /tmp/xato-1m.txt "$SOURCE_URL"    (the address below)
 *     node scripts/build-password-blocklist.mjs /tmp/xato-1m.txt
 *     node scripts/build-password-blocklist.mjs /tmp/xato-1m.txt --check
 *
 *   The script refuses a file whose SHA-256 is not the one recorded below,
 *   so the list can't change by accident.
 *
 * Source and licence:
 * - SecLists by Daniel Miessler and contributors, MIT licence
 *   (https://github.com/danielmiessler/SecLists/blob/master/LICENSE),
 *   file Passwords/Common-Credentials/xato-net-10-million-passwords-1000000.txt,
 *   pinned to commit c34ab251571b9c5e7c93d2e258d0c5b1a678a01c (28 Nov 2026).
 * - The data is Mark Burnett's "10 million passwords" set (xato.net, 2015),
 *   which he released publicly for research; SecLists ranks it by how often
 *   each password appears.
 *
 * No third-party packages: only Node's built-in modules.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(MOBILE, 'src', 'engine', 'passwordBlocklist.ts');

export const SOURCE_COMMIT = 'c34ab251571b9c5e7c93d2e258d0c5b1a678a01c';
export const SOURCE_FILE = 'Passwords/Common-Credentials/xato-net-10-million-passwords-1000000.txt';
export const SOURCE_URL = `https://raw.githubusercontent.com/danielmiessler/SecLists/${SOURCE_COMMIT}/${SOURCE_FILE}`;
export const SOURCE_SHA256 = '424a3e03a17df0a2bc2b3ca749d81b04e79d59cb7aeec8876a5a3f308d0caf51';
/** The same rule as passwordRules.ts: PASSWORD_MIN_CHARS and PASSWORD_MAX_BYTES. */
const MIN_CHARS = 15;
const MAX_BYTES = 72;
/** OWASP ASVS 5.0, 6.2.4: at least the top 3000 that match the password policy. */
const KEEP = 3000;

/** The ranked source → the kept list (lower case, NFC, policy-length, first KEEP distinct). */
export function pickBlocklist(sourceText) {
  const kept = [];
  const seen = new Set();
  for (const raw of sourceText.split(/\r?\n/)) {
    const p = raw.normalize('NFC').toLowerCase();
    if ([...p].length < MIN_CHARS || Buffer.byteLength(p, 'utf8') > MAX_BYTES) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    kept.push(p);
    if (kept.length === KEEP) break;
  }
  if (kept.length !== KEEP) throw new Error(`the source has only ${kept.length} passwords of ${MIN_CHARS}+ characters (need ${KEEP})`);
  // Sorted: the order no longer matters for the check, and sorted text compresses better.
  return kept.sort();
}

export function renderModule(list) {
  const text = list.join('\n');
  const sha = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  return [
    '/**',
    ' * GENERATED FILE: do not edit. Built by mobile/scripts/build-password-blocklist.mjs',
    ' * (it explains how to rebuild it).',
    ' *',
    ` * The ${list.length} most common passwords that are ${MIN_CHARS}+ characters long (OWASP ASVS 5.0`,
    ' * 6.2.4: "at least the top 3000 passwords which match the application\'s password',
    ' * policy"), in lower case and Unicode NFC, sorted, one per line.',
    ' *',
    ' * Source: SecLists (Daniel Miessler and contributors, MIT licence),',
    ` * ${SOURCE_FILE}`,
    ` * at commit ${SOURCE_COMMIT}`,
    ` * (SHA-256 ${SOURCE_SHA256}).`,
    " * The data is Mark Burnett's 10 million passwords set (xato.net, 2015), ranked by use.",
    ' *',
    ' * Pure data: no React, no storage, no network.',
    ' */',
    '',
    `/** SHA-256 of PASSWORD_BLOCKLIST_TEXT (a test checks the text still matches). */`,
    `export const PASSWORD_BLOCKLIST_SHA256 = '${sha}';`,
    `export const PASSWORD_BLOCKLIST_SIZE = ${list.length};`,
    `export const PASSWORD_BLOCKLIST_SOURCE = 'SecLists ${SOURCE_FILE.split('/').pop()} @ ${SOURCE_COMMIT.slice(0, 12)} (MIT)';`,
    '',
    `export const PASSWORD_BLOCKLIST_TEXT = ${JSON.stringify(text)};`,
    '',
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error(`Usage: node scripts/build-password-blocklist.mjs <source file> [--check]\n  Download the source first:\n  curl -o /tmp/xato-1m.txt ${SOURCE_URL}`);
    process.exit(2);
  }
  const buf = fs.readFileSync(file);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (sha !== SOURCE_SHA256) {
    console.error(`✗ ${file} has SHA-256 ${sha}, not the pinned ${SOURCE_SHA256}`);
    process.exit(1);
  }
  const text = renderModule(pickBlocklist(buf.toString('utf8')));
  if (check) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (now !== text) {
      console.error('✗ src/engine/passwordBlocklist.ts is out of date: run this script without --check');
      process.exit(1);
    }
    console.log('✓ src/engine/passwordBlocklist.ts matches the pinned source');
    return;
  }
  fs.writeFileSync(OUT, text);
  console.log(`✓ wrote src/engine/passwordBlocklist.ts (${Math.round(text.length / 1024)} KB)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
