/**
 * Build-time question filtering only, not authentication or a premium-content boundary.
 *
 * Plain English: the public phone build bundles only each course's free
 * sample (data/free/<cert>_sample_ids.json, written by
 * scripts/build_free_sample.py). SAMPLE_COURSES lists every course that has
 * a reviewed sample list; a course in the app's content build without an
 * entry here stops a sample build (build-content.mjs), so a new course can
 * never ship in full by accident.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const auxiliary = ['notes', 'principles', 'exam', 'lessons', 'terms', 'mindset', 'roles', 'sequences', 'flows', 'pack'];
/** The game decks (build-content.mjs GAME_DECKS): only a course that has them may carry them. */
const GAME_DECKS = ['roles', 'sequences', 'flows'];

/**
 * Each course with a free sample: its sample list and where its questions
 * come from (the same files mobile/scripts/build-content.mjs PACKS reads).
 * CISA reads the generated data/domain<N>.json; CRISC and AAIA have no
 * generated domain files, so they read their originals.
 */
export const SAMPLE_COURSES = {
  cisa: { domains: ['1', '2', '3', '4', '5'], source: (d) => `data/domain${d}.json`, games: true },
  crisc: { domains: ['1', '2', '3', '4'], source: (d) => `data/crisc/originals/d${d}.json`, games: false },
  aaia: { domains: ['1', '2', '3'], source: (d) => `data/aaia/originals/d${d}.json`, games: false },
};

/** One course's sample: its ids, the expected ids per domain (bank order) and its whole bank. */
function courseSelection(repo, certId) {
  const course = Object.prototype.hasOwnProperty.call(SAMPLE_COURSES, certId) ? SAMPLE_COURSES[certId] : null;
  if (!course) throw new Error(`No reviewed sample manifest for ${certId}`);
  const manifest = read(path.join(repo, `data/free/${certId}_sample_ids.json`));
  if (manifest.cert !== certId || !Array.isArray(manifest.ids) || !manifest.ids.length ||
      manifest.ids.some((id) => typeof id !== 'string') || new Set(manifest.ids).size !== manifest.ids.length) {
    throw new Error(`Invalid or duplicate sample manifest ids (${certId})`);
  }
  const ids = new Set(manifest.ids);
  const questions = [];
  const domains = {};
  for (const d of course.domains) {
    const bank = read(path.join(repo, course.source(d))).questions;
    if (!Array.isArray(bank) || bank.some((q) => String(q.domain) !== String(d) || typeof q.id !== 'string')) {
      throw new Error(`Invalid source domain ${d} (${certId})`);
    }
    questions.push(...bank);
    domains[d] = bank.filter((q) => ids.has(q.id)).map((q) => q.id);
    if (!domains[d].length) throw new Error(`Sample has no questions for domain ${d} (${certId})`);
  }
  const known = new Set(questions.map((q) => q.id));
  if (known.size !== questions.length) throw new Error(`Duplicate source question ids (${certId})`);
  for (const id of ids) if (!known.has(id)) throw new Error(`Unknown sample id: ${id}`);
  if (ids.size >= known.size) throw new Error(`Sample manifest must not include the entire bank (${certId})`);
  return { ids, domains, questions, games: course.games };
}

/**
 * The samples of the given courses (default: every course in SAMPLE_COURSES).
 * `courses` holds each one; `ids` and `questions` are all of them together.
 */
export function sampleSelection(repo, certIds = Object.keys(SAMPLE_COURSES)) {
  const courses = {};
  for (const certId of certIds) courses[certId] = courseSelection(repo, certId);
  const ids = new Set(Object.values(courses).flatMap((c) => [...c.ids]));
  const questions = Object.values(courses).flatMap((c) => c.questions);
  if (new Set(questions.map((q) => q.id)).size !== questions.length) throw new Error('A question id is used by two courses');
  return { courses, ids, questions };
}

export function pruneReferences(value, ids) {
  if (Array.isArray(value)) return value.map((v) => pruneReferences(v, ids));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, v]) => [key,
    ['practiceIds', 'prepares'].includes(key) && Array.isArray(v)
      ? v.filter((id) => ids.has(id)) : pruneReferences(v, ids)]));
}

export function filterSamplePack(root, selection) {
  for (const [certId, course] of Object.entries(selection.courses)) {
    for (const d of Object.keys(course.domains)) {
      const file = path.join(root, `${certId}/d${d}.json`);
      fs.writeFileSync(file, JSON.stringify(read(file).filter((q) => course.ids.has(q.id))));
    }
    for (const name of auxiliary) {
      const file = path.join(root, `${certId}/${name}.json`);
      if (fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(pruneReferences(read(file), course.ids)));
    }
  }
}

/**
 * A question id as written in the packs: CISA "d4_217", or a course's own
 * "crisc_d2_010" / "aaia_d3_001" (read as one token, so "d2_010" inside a
 * CRISC id is never mistaken for a CISA question).
 */
const QUESTION_ID = /\b(?:[a-z]+[0-9]?_)?d\d+_\d+\b/g;

/** Strict generated-tree check. Does not inspect a signed APK/AAB or downloaded packs. */
export function checkSamplePack(root, selection) {
  const certIds = Object.keys(selection.courses);
  const allowed = new Set(['index.ts', ...certIds.flatMap((certId) => [
    ...Object.keys(selection.courses[certId].domains).map((d) => `${certId}/d${d}.json`),
    ...auxiliary.filter((name) => selection.courses[certId].games || !GAME_DECKS.includes(name)).map((name) => `${certId}/${name}.json`)])]);
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const rel = path.relative(root, file).split(path.sep).join('/');
      if (entry.isSymbolicLink()) throw new Error(`Symlink in sample output: ${rel}`);
      if (entry.isDirectory()) {
        if (!certIds.includes(rel)) throw new Error(`Unexpected sample directory: ${rel}`);
        walk(file);
      } else {
        if (!entry.isFile() || !allowed.has(rel)) throw new Error(`Unexpected sample file: ${rel}`);
        files.push(file);
      }
    }
  }
  walk(root);
  for (const rel of allowed) {
    if (!fs.existsSync(path.join(root, rel))) throw new Error(`Missing sample file: ${rel}`);
  }
  for (const [certId, course] of Object.entries(selection.courses)) {
    for (const [d, expected] of Object.entries(course.domains)) {
      const questions = read(path.join(root, `${certId}/d${d}.json`));
      if (!Array.isArray(questions) || JSON.stringify(questions.map((q) => q.id)) !== JSON.stringify(expected) ||
          questions.some((q) => q.certId !== certId || q.domainId !== d)) {
        throw new Error(`Sample domain ${d} differs from the manifest (${certId})`);
      }
    }
  }
  const paid = selection.questions.filter((q) => !selection.ids.has(q.id));
  const paidIds = new Set(paid.map((q) => q.id));
  const sampleStems = new Set(selection.questions.filter((q) => selection.ids.has(q.id)).map((q) => q.question));
  const paidStems = paid.map((q) => q.question).filter((s) => typeof s === 'string' && s.length >= 40 && !sampleStems.has(s));
  // Every paid stem by its first 40 characters: a text holds a stem only where it holds that prefix,
  // so each text is scanned once instead of once per stem (same answer, much faster for three courses).
  const byPrefix = new Map();
  for (const stem of paidStems) {
    const key = stem.slice(0, 40);
    if (!byPrefix.has(key)) byPrefix.set(key, []);
    byPrefix.get(key).push(stem);
  }
  const holdsPaidStem = (value) => {
    for (let i = 0; i + 40 <= value.length; i++) {
      const stems = byPrefix.get(value.slice(i, i + 40));
      if (stems && stems.some((stem) => value.startsWith(stem, i))) return true;
    }
    return false;
  };
  function strings(value) {
    if (typeof value === 'string') return [value];
    if (!value || typeof value !== 'object') return [];
    return Object.values(value).flatMap(strings);
  }
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const values = file.endsWith('.json') ? strings(JSON.parse(text)) : [text];
    for (const value of values) {
      if ([...value.matchAll(QUESTION_ID)].some(([id]) => paidIds.has(id)) || holdsPaidStem(value)) {
        throw new Error(`Non-sample question or reference in ${path.relative(root, file)}`);
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    checkSamplePack(path.join(repo, 'mobile/src/content/generated'), sampleSelection(repo));
    console.log('Sample generated-tree guard passed (not a signed-release or entitlement check).');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
