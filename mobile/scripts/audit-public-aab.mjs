#!/usr/bin/env node
/**
 * audit-public-aab.mjs: proves a built public Android bundle (.aab) carries
 * only the free question sample, by reading the JavaScript bundle inside it.
 *
 *   node mobile/scripts/audit-public-aab.mjs <file.aab | index.android.bundle | export dir>
 *
 * WHAT IT CHECKS (plain English):
 *   1. Every question id in data/free/cisa_sample_ids.json is in the bundle.
 *   2. No other CISA question id is in it (the paid part of the bank), except
 *      the few ids app code names on purpose (CODE_REFERENCES, listed with
 *      their reason; the bundle never carries their questions).
 *   3. No question stem from the paid part is in it, as UTF-8 or UTF-16
 *      (Hermes keeps text with curly quotes and other non-ASCII letters as
 *      UTF-16, so a plain search would miss them).
 *   4. No question id from an unreleased course (AAIA, CRISC, CC, CIA, CSOE)
 *      is in it.
 *   5. No sync, analytics or crash-report server address is in it, and it lists
 *      every web address, for the "No data collected" Data safety answer.
 *   It prints counts and exits 1 on any failure. It reads only local files and
 *   sends nothing anywhere. Run it on the exact .aab the owner will upload.
 *
 * WHAT IT DOESN'T PROVE: that notes or lessons never teach the same facts as a
 * paid question. It is a check on the question bank, not DRM.
 * No third-party packages: only Node's built-in modules plus `unzip`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** The JavaScript bundle bytes from an .aab, an exported directory, or a bundle file. */
export function bundleBytes(input) {
  const stat = fs.statSync(input);
  if (stat.isDirectory()) {
    const found = fs.readdirSync(input, { recursive: true })
      .map((p) => path.join(input, p))
      .filter((p) => /\.(hbc|bundle|js)$/.test(p) && fs.statSync(p).isFile() && /index|entry/.test(path.basename(p)));
    if (found.length !== 1) throw new Error(`Expected one JS bundle in ${input}, found ${found.length}`);
    return fs.readFileSync(found[0]);
  }
  if (input.endsWith('.aab') || input.endsWith('.apk')) {
    const inner = input.endsWith('.aab') ? 'base/assets/index.android.bundle' : 'assets/index.android.bundle';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaisip-aab-'));
    try {
      execFileSync('unzip', ['-q', '-o', input, inner, '-d', dir]);
      return fs.readFileSync(path.join(dir, inner));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  return fs.readFileSync(input);
}

const has = (buf, text) => buf.includes(Buffer.from(text, 'utf8')) || buf.includes(Buffer.from(text, 'utf16le'));

/** All question ids written in a course's originals (unreleased courses). */
function unreleasedIds() {
  const ids = [];
  const roots = ['data/aaia/originals', 'data/crisc/originals', 'data/cc/originals', 'data/csoe/originals',
    'data/cia/cia1/originals', 'data/cia/cia2/originals', 'data/cia/cia3/originals'];
  for (const rel of roots) {
    const dir = path.join(REPO, rel);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((n) => /^d\d+\.json$/.test(n))) {
      const d = read(path.join(dir, f));
      for (const q of Array.isArray(d) ? d : d.questions ?? []) if (typeof q.id === 'string') ids.push(q.id);
    }
  }
  return ids;
}

/**
 * Paid question ids that app code names on purpose, with no question text:
 * the bundle may contain these ids, never the questions themselves.
 */
export const CODE_REFERENCES = {
  d3_087: 'src/content/rewrittenQuestions.ts: "this question was rewritten" notice, keyed by id',
  d3_106: 'src/content/rewrittenQuestions.ts: "this question was rewritten" notice, keyed by id',
  d4_074: 'src/content/labs/index.ts: Concept Lab practice ids (the lab is hidden in store builds)',
  d4_082: 'src/content/labs/index.ts: Concept Lab practice ids (the lab is hidden in store builds)',
  d4_217: 'example text in a help line ("like q:d4_217")',
  d5_205: 'src/content/support/fixes.json: a fixed-question notice, keyed by id',
};

export function audit(buf) {
  const sample = new Set(read(path.join(REPO, 'data/free/cisa_sample_ids.json')).ids);
  const bank = [];
  for (let d = 1; d <= 5; d++) bank.push(...read(path.join(REPO, `data/domain${d}.json`)).questions);
  const sampleStems = new Set(bank.filter((q) => sample.has(q.id)).map((q) => q.question));
  const paid = bank.filter((q) => !sample.has(q.id));
  const ascii = buf.toString('latin1');
  // Hermes stores its strings back to back ("d1_001d1_002…", "d4_2202026…"), so look
  // for each known id as plain text rather than a word-bounded pattern.
  const idsInBundle = { has: (id) => ascii.includes(id) };
  const result = {
    sampleIds: sample.size,
    sampleIdsFound: [...sample].filter((id) => idsInBundle.has(id)).length,
    paidIdsFound: paid.filter((q) => idsInBundle.has(q.id) && !(q.id in CODE_REFERENCES)).map((q) => q.id),
    codeReferencesFound: paid.filter((q) => idsInBundle.has(q.id) && q.id in CODE_REFERENCES).map((q) => q.id),
    paidStemsChecked: 0,
    paidStemsFound: [],
    unreleasedIdsChecked: 0,
    unreleasedIdsFound: [],
  };
  for (const q of paid) {
    if (typeof q.question !== 'string' || q.question.length < 40 || sampleStems.has(q.question)) continue;
    result.paidStemsChecked += 1;
    if (has(buf, q.question.slice(0, 60))) result.paidStemsFound.push(q.id);
  }
  for (const id of unreleasedIds()) {
    result.unreleasedIdsChecked += 1;
    if (ascii.includes(id)) result.unreleasedIdsFound.push(id);
  }
  // Every web address in the bundle, for the Data safety check (a store build
  // must not contain a server it sends data to; links the learner taps are fine).
  result.hosts = [...new Set(ascii.match(/https:\/\/[a-zA-Z0-9.-]+/g) ?? [])].sort();
  result.serverHosts = result.hosts.filter((h) => /supabase|workers\.dev|functions|revenuecat|sentry|posthog|amplitude|firebase/i.test(h));
  result.pass = !result.serverHosts.length && result.sampleIdsFound === result.sampleIds && !result.paidIdsFound.length &&
    !result.paidStemsFound.length && !result.unreleasedIdsFound.length;
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node mobile/scripts/audit-public-aab.mjs <file.aab | bundle | export dir>');
    process.exit(2);
  }
  const r = audit(bundleBytes(input));
  const short = (list) => (list.length ? `${list.length} (e.g. ${list.slice(0, 5).join(', ')})` : '0');
  console.log(`Sample questions found: ${r.sampleIdsFound} of ${r.sampleIds}`);
  console.log(`Paid CISA question ids found: ${short(r.paidIdsFound)}`);
  console.log(`Known id-only references in app code (no question text): ${short(r.codeReferencesFound)}`);
  console.log(`Paid CISA stems found: ${short(r.paidStemsFound)} of ${r.paidStemsChecked} checked`);
  console.log(`Unreleased course ids found: ${short(r.unreleasedIdsFound)} of ${r.unreleasedIdsChecked} checked`);
  console.log(`Web addresses in the bundle: ${r.hosts.join(', ')}`);
  console.log(`Server addresses (sync, analytics, crash reports): ${r.serverHosts.length ? r.serverHosts.join(', ') : 'none'}`);
  console.log(r.pass ? 'PASS: only the free sample is bundled.' : 'FAIL: this is not a sample-only bundle.');
  process.exitCode = r.pass ? 0 : 1;
}
