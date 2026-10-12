#!/usr/bin/env node
/**
 * build-leakprint.mjs: writes the leak guard's fingerprint for the
 * board-submit Edge Function (Uplift Phase 8; spec PHASE6_8.md §4.7).
 *
 *   cd mobile && npm run content && cd ..     (the bundled question pack)
 *   node scripts/build-leakprint.mjs          → supabase/functions/board-submit/leakprint.json
 *
 * Run it at DEPLOY time, right before `supabase functions deploy
 * board-submit` (Phase 9). The output is gitignored: the public repo never
 * holds the bank's fingerprint, and the file holds numbers only (sorted
 * 32-bit hashes and item positions as base64), never question text or a
 * count shown anywhere.
 *
 * It uses the SAME code as the app and the function
 * (supabase/functions/_shared/leakGuard.ts, a copy of
 * mobile/src/engine/leakGuard.ts checked by guard G8), loaded with Node's
 * built-in TypeScript type stripping (Node 22.18 or newer), and the same
 * question pack the app bundles (mobile/src/content/generated/<cert>/d*.json).
 * board-submit refuses every post until this file exists.
 *
 * REBUILD IT ON EVERY CONTENT RELEASE (security review P8, N9): a new or
 * edited question isn't guarded until board-submit is redeployed with a
 * fresh file. The Phase 9 release checklist (ARCHITECTURE §10) has the step.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKS = path.join(ROOT, 'mobile', 'src', 'content', 'generated');
const OUT = path.join(ROOT, 'supabase', 'functions', 'board-submit', 'leakprint.json');

const shared = (f) => pathToFileURL(path.join(ROOT, 'supabase', 'functions', '_shared', f)).href;
const { buildFingerprint, leakItem } = await import(shared('leakGuard.ts'));
const { encodeLeakprint } = await import(shared('leakprint.ts'));

const certs = fs.existsSync(PACKS) ? fs.readdirSync(PACKS).filter((d) => fs.statSync(path.join(PACKS, d)).isDirectory()) : [];
const questions = [];
for (const cert of certs.sort()) {
  const files = fs.readdirSync(path.join(PACKS, cert)).filter((f) => /^d\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  for (const f of files) questions.push(...JSON.parse(fs.readFileSync(path.join(PACKS, cert, f), 'utf8')));
}
if (questions.length === 0) {
  console.error('build-leakprint: no question pack found. Run `npm run content` in mobile/ first.');
  process.exit(1);
}
// The server's fingerprint: with the squashed-letters check (fix round P8, SEC S5).
fs.writeFileSync(OUT, `${JSON.stringify(encodeLeakprint(buildFingerprint(questions.map(leakItem), { squash: true })))}\n`);
// Deliberately no count in the output: the bank's size is never advertised.
console.log(`✓ wrote ${path.relative(ROOT, OUT)} (numbers only; gitignored)`);
