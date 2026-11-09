/** Build-time question filtering only, not authentication or a premium-content boundary. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const auxiliary = ['notes', 'principles', 'exam', 'lessons', 'terms', 'mindset', 'roles', 'sequences', 'flows', 'pack'];

export function sampleSelection(repo) {
  const manifest = read(path.join(repo, 'data/free/cisa_sample_ids.json'));
  if (manifest.cert !== 'cisa' || !Array.isArray(manifest.ids) || !manifest.ids.length ||
      manifest.ids.some((id) => typeof id !== 'string') || new Set(manifest.ids).size !== manifest.ids.length) {
    throw new Error('Invalid or duplicate sample manifest ids');
  }
  const ids = new Set(manifest.ids);
  const questions = [];
  const domains = {};
  for (let d = 1; d <= 5; d++) {
    const bank = read(path.join(repo, `data/domain${d}.json`)).questions;
    if (!Array.isArray(bank) || bank.some((q) => String(q.domain) !== String(d) || typeof q.id !== 'string')) {
      throw new Error(`Invalid source domain ${d}`);
    }
    questions.push(...bank);
    domains[d] = bank.filter((q) => ids.has(q.id)).map((q) => q.id);
    if (!domains[d].length) throw new Error(`Sample has no questions for domain ${d}`);
  }
  const known = new Set(questions.map((q) => q.id));
  if (known.size !== questions.length) throw new Error('Duplicate source question ids');
  for (const id of ids) if (!known.has(id)) throw new Error(`Unknown sample id: ${id}`);
  if (ids.size >= known.size) throw new Error('Sample manifest must not include the entire bank');
  return { ids, domains, questions };
}

export function pruneReferences(value, ids) {
  if (Array.isArray(value)) return value.map((v) => pruneReferences(v, ids));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, v]) => [key,
    ['practiceIds', 'prepares'].includes(key) && Array.isArray(v)
      ? v.filter((id) => ids.has(id)) : pruneReferences(v, ids)]));
}

export function filterSamplePack(root, selection) {
  for (let d = 1; d <= 5; d++) {
    const file = path.join(root, `cisa/d${d}.json`);
    fs.writeFileSync(file, JSON.stringify(read(file).filter((q) => selection.ids.has(q.id))));
  }
  for (const name of auxiliary) {
    const file = path.join(root, `cisa/${name}.json`);
    if (fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(pruneReferences(read(file), selection.ids)));
  }
}

/** Strict generated-tree check. Does not inspect a signed APK/AAB or downloaded packs. */
export function checkSamplePack(root, selection) {
  const allowed = new Set(['index.ts', ...Object.keys(selection.domains).map((d) => `cisa/d${d}.json`),
    ...auxiliary.map((name) => `cisa/${name}.json`)]);
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      const rel = path.relative(root, file).split(path.sep).join('/');
      if (entry.isSymbolicLink()) throw new Error(`Symlink in sample output: ${rel}`);
      if (entry.isDirectory()) {
        if (rel !== 'cisa') throw new Error(`Unexpected sample directory: ${rel}`);
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
  for (const [d, expected] of Object.entries(selection.domains)) {
    const questions = read(path.join(root, `cisa/d${d}.json`));
    if (!Array.isArray(questions) || JSON.stringify(questions.map((q) => q.id)) !== JSON.stringify(expected) ||
        questions.some((q) => q.certId !== 'cisa' || q.domainId !== d)) {
      throw new Error(`Sample domain ${d} differs from the manifest`);
    }
  }
  const paid = selection.questions.filter((q) => !selection.ids.has(q.id));
  const paidIds = new Set(paid.map((q) => q.id));
  const sampleStems = new Set(selection.questions.filter((q) => selection.ids.has(q.id)).map((q) => q.question));
  const paidStems = paid.map((q) => q.question).filter((s) => typeof s === 'string' && s.length >= 40 && !sampleStems.has(s));
  function strings(value) {
    if (typeof value === 'string') return [value];
    if (!value || typeof value !== 'object') return [];
    return Object.values(value).flatMap(strings);
  }
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const values = file.endsWith('.json') ? strings(JSON.parse(text)) : [text];
    for (const value of values) {
      if ([...value.matchAll(/\bd[1-5]_\d+\b/g)].some(([id]) => paidIds.has(id)) ||
          paidStems.some((stem) => value.includes(stem))) {
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
