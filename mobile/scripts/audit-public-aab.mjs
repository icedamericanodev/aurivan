#!/usr/bin/env node
/**
 * audit-public-aab.mjs: proves a built public Android bundle (.aab) carries
 * only the free question sample, by reading the JavaScript bundle inside it.
 *
 *   node mobile/scripts/audit-public-aab.mjs <file.aab | index.android.bundle | export dir>
 *
 * WHAT IT CHECKS (plain English):
 *   For EVERY course the app bundles (CISA, CRISC and AAIA: BUNDLED_COURSES,
 *   the same list as SAMPLE_COURSES in sample-content.mjs):
 *   1. Every question in data/free/<cert>_sample_ids.json is in the bundle
 *      (its id and its stem).
 *   2. No other question id of that course is in it (the paid part of the
 *      bank), except the few CISA ids app code names on purpose
 *      (CODE_REFERENCES, listed with their reason; the bundle never carries
 *      their questions).
 *   3. No question stem from the paid part is in it, as UTF-8 or UTF-16
 *      (Hermes keeps text with curly quotes and other non-ASCII letters as
 *      UTF-16, so a plain search would miss them). Each stem is looked for by
 *      its first 60 characters, or whole when those also occur inside a free
 *      stem. Every paid stem must be checkable: one under 40 characters, or
 *      one inside a free stem, fails the audit (stemNeedles).
 *   And for the whole bundle:
 *   4. No question id from a course the app does not bundle yet (CC, CSOE,
 *      the CIA parts and the CIA Challenge pack) is in it.
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
import { SAMPLE_COURSES } from './sample-content.mjs';

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

/** The courses the app bundles (its sample in the public build): the sample guard's own list. */
export const BUNDLED_COURSES = Object.keys(SAMPLE_COURSES);

/** The courses the app does not bundle at all yet: none of their ids may be in any build. */
export const UNRELEASED_ROOTS = ['data/cc/originals', 'data/csoe/originals',
  'data/cia/cia1/originals', 'data/cia/cia2/originals', 'data/cia/cia3/originals', 'data/cia/ciac/originals'];

/** One bundled course's questions (the files sample-content.mjs reads). */
function courseBank(certId) {
  const course = SAMPLE_COURSES[certId];
  return course.domains.flatMap((d) => read(path.join(REPO, course.source(d))).questions);
}

/** The id prefixes of the other bundled courses ("crisc_", "aaia_"): a bare CISA id can end one of their ids. */
const OTHER_PREFIXES = BUNDLED_COURSES.filter((c) => c !== 'cisa').map((c) => `${c}_`);
/** A bare CISA id ("d4_217"), with no course prefix. */
const BARE_ID = /^d\d+_\d+$/;

/**
 * Whether the bundle holds this id outside another course's id, for the
 * PAID-id check. Hermes stores its strings back to back ("d1_001d1_002…",
 * "d4_2202026…"), so the text after an id is not checked. A bare CISA id is
 * also the end of a CRISC or AAIA id ("crisc_d1_005" ends with "d1_005"), so
 * for a bare id an occurrence right after "crisc_" or "aaia_" is not counted.
 * Nothing else is discounted (not "cisa_", and never for a prefixed id).
 * Limit: Hermes may also store a string INSIDE a longer one, so a paid CISA
 * id kept only inside a CRISC id is not seen here (the audit counts these as
 * "can't be checked by id"); its question text still is (the paid-stem check,
 * which must check every paid stem). The SAMPLE check therefore uses the
 * plain id and the question's stem instead (sampleInBundle).
 */
export function holdsId(ascii, id) {
  const discount = BARE_ID.test(id) ? OTHER_PREFIXES : [];
  for (let at = ascii.indexOf(id); at !== -1; at = ascii.indexOf(id, at + 1)) {
    if (!discount.some((p) => at >= p.length && ascii.startsWith(p, at - p.length))) return true;
  }
  return false;
}

/**
 * What to search for each paid stem: its first 60 characters, or the whole
 * stem when those 60 also occur inside a free stem (of any course: "Which of
 * the following should the risk practitioner…"). A stem under 40 characters,
 * or one that is itself inside a free stem, can't be told apart from free
 * text: it is returned in `unchecked`, and the audit FAILS on any (a paid
 * question the audit can't see is not proof of a sample-only bundle).
 */
export function stemNeedles(paid, freeStems) {
  const needles = [];
  const unchecked = [];
  for (const q of paid) {
    const stem = q.question;
    if (typeof stem !== 'string' || stem.length < 40) {
      unchecked.push(q.id);
      continue;
    }
    const start = stem.slice(0, 60);
    if (!freeStems.some((s) => s.includes(start))) needles.push([q.id, start]);
    else if (!freeStems.some((s) => s.includes(stem))) needles.push([q.id, stem]);
    else unchecked.push(q.id);
  }
  return { needles, unchecked };
}

/** All question ids written in a course's originals (courses not bundled yet). */
function unreleasedIds() {
  const ids = [];
  const roots = UNRELEASED_ROOTS;
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

export function audit(buf, courses = BUNDLED_COURSES) {
  const ascii = buf.toString('latin1');
  // Hermes stores its strings back to back, so each known id is looked for as plain text (holdsId).
  const idsInBundle = { has: (id) => holdsId(ascii, id) };
  const banks = Object.fromEntries(courses.map((c) => [c, courseBank(c)]));
  const samples = Object.fromEntries(courses.map((c) => [c, new Set(read(path.join(REPO, `data/free/${c}_sample_ids.json`)).ids)]));
  // Each paid stem is searched for (stemNeedles says how); one that can't be checked fails the audit.
  const freeStems = courses.flatMap((c) => banks[c].filter((q) => samples[c].has(q.id) && typeof q.question === 'string')
    .map((q) => q.question));
  // A free question is in the bundle when its id is (anywhere: Hermes may store "d1_002" inside
  // "crisc_d1_002") AND its stem is, as UTF-8 or UTF-16.
  const sampleInBundle = (q) => ascii.includes(q.id) && (typeof q.question !== 'string' || has(buf, q.question.slice(0, 60)));
  const result = {
    sampleIds: 0,
    sampleIdsFound: 0,
    paidIdsFound: [],
    codeReferencesFound: [],
    paidStemsChecked: 0,
    paidStemsFound: [],
    paidStemsUnchecked: [],
    idOnlyUncheckable: 0,
    unreleasedIdsChecked: 0,
    unreleasedIdsFound: [],
    courses: {},
  };
  for (const c of courses) {
    const sample = samples[c];
    const paid = banks[c].filter((q) => !sample.has(q.id));
    const r = {
      sampleIds: sample.size,
      sampleIdsFound: banks[c].filter((q) => sample.has(q.id) && sampleInBundle(q)).length,
      paidIdsFound: paid.filter((q) => idsInBundle.has(q.id) && !(q.id in CODE_REFERENCES)).map((q) => q.id),
      codeReferencesFound: paid.filter((q) => idsInBundle.has(q.id) && q.id in CODE_REFERENCES).map((q) => q.id),
      paidStemsChecked: 0,
      paidStemsFound: [],
      // Paid ids that sit only inside another course's id ("d1_005" in "crisc_d1_005"): Hermes may
      // store the bare id there, so they can't be checked by id. Their stems are checked.
      idOnlyUncheckable: paid.filter((q) => BARE_ID.test(q.id) && !idsInBundle.has(q.id) && ascii.includes(q.id)).length,
    };
    const { needles, unchecked } = stemNeedles(paid, freeStems);
    r.paidStemsUnchecked = unchecked;
    for (const [id, needle] of needles) {
      r.paidStemsChecked += 1;
      if (has(buf, needle)) r.paidStemsFound.push(id);
    }
    result.courses[c] = r;
    result.sampleIds += r.sampleIds;
    result.sampleIdsFound += r.sampleIdsFound;
    result.paidIdsFound.push(...r.paidIdsFound);
    result.codeReferencesFound.push(...r.codeReferencesFound);
    result.paidStemsChecked += r.paidStemsChecked;
    result.paidStemsFound.push(...r.paidStemsFound);
    result.paidStemsUnchecked.push(...r.paidStemsUnchecked);
    result.idOnlyUncheckable += r.idOnlyUncheckable;
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
    !result.paidStemsFound.length && !result.paidStemsUnchecked.length && !result.unreleasedIdsFound.length;
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
  for (const [c, x] of Object.entries(r.courses)) {
    const name = c.toUpperCase();
    console.log(`${name}: sample questions found: ${x.sampleIdsFound} of ${x.sampleIds}`);
    console.log(`${name}: paid question ids found: ${short(x.paidIdsFound)}`);
    if (x.codeReferencesFound.length) console.log(`${name}: known id-only references in app code (no question text): ${short(x.codeReferencesFound)}`);
    console.log(`${name}: paid stems found: ${short(x.paidStemsFound)} of ${x.paidStemsChecked} checked`);
    if (x.paidStemsUnchecked.length) console.log(`${name}: paid stems that can't be checked (FAIL): ${short(x.paidStemsUnchecked)}`);
    if (x.idOnlyUncheckable) console.log(`${name}: paid ids that can't be checked by id (inside a CRISC or AAIA id; their stems are checked): ${x.idOnlyUncheckable}`);
  }
  console.log(`Courses not bundled yet (CC, CSOE, CIA) ids found: ${short(r.unreleasedIdsFound)} of ${r.unreleasedIdsChecked} checked`);
  console.log(`Web addresses in the bundle: ${r.hosts.join(', ')}`);
  console.log(`Server addresses (sync, analytics, crash reports): ${r.serverHosts.length ? r.serverHosts.join(', ') : 'none'}`);
  console.log(r.pass ? 'PASS: only the free sample is bundled.' : 'FAIL: this is not a sample-only bundle.');
  process.exitCode = r.pass ? 0 : 1;
}
