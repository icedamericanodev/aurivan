#!/usr/bin/env node
/**
 * check-size-budget.mjs: fails CI when the app's JavaScript or its study
 * content grows past a set limit (a "size budget").
 *
 *   node scripts/check-size-budget.mjs <export-dir>   bundle + content
 *   node scripts/check-size-budget.mjs                content only
 *
 * Make <export-dir> first with:
 *   EXPO_OFFLINE=1 npx expo export --platform android --output-dir <export-dir>
 *
 * WHAT IT MEASURES (plain English):
 *   1. The Android JavaScript bundle (Hermes bytecode, the .hbc file listed in
 *      <export-dir>/metadata.json). Every phone carries it, and every
 *      over-the-air update downloads and stores a full copy of it.
 *      Measured 15 Oct 2026 (mobile 1.23): 9.83 MB. Budget: 14 MB.
 *   2. The study content of EACH certification: every file of its generated
 *      pack (src/content/generated/<cert>/: questions, notes, principles,
 *      exam, lessons.json, game decks, pack.json). Since content packs
 *      Phase A (27 Oct 2026) the lessons are data in that folder too; an older
 *      layout with lessons in src/content/lessons/<cert>.ts is still counted
 *      (--lessons) when the pack has no lessons.json. The text size tracks the
 *      compiled size closely (CISA: 3.75 MB of text, 3.74 MB once compiled).
 *      Measured: CISA 4.6 MB (27 Oct 2026). Budget: 6 MB per certification.
 *   MB here means 1,000,000 bytes, as in the architecture report.
 *
 * WHY: the store's 100 MB comfort line is mostly native code, but the bundle
 * is the part that grows quietly with every release. When a budget fails,
 * look at what grew before raising the number (docs: ARCHITECTURE_E2E.md
 * section 7 says when content should move to downloadable packs).
 *
 * CI runs it in .github/workflows/mobile.yml right after the Android export.
 * A Jest test (src/__tests__/size-budget.test.ts) runs it on small fakes.
 * No third-party packages: only Node's built-in modules.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MB = 1_000_000;
export const BUNDLE_BUDGET = 14 * MB;
export const CONTENT_BUDGET_PER_CERT = 6 * MB;

const mb = (bytes) => `${(bytes / MB).toFixed(2)} MB`;

/** Total size of the files directly inside a folder (the generated packs are flat). */
function folderBytes(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .reduce((sum, e) => sum + fs.statSync(path.join(dir, e.name)).size, 0);
}

/** The Hermes bundle in an `expo export` folder (from metadata.json, else the only .hbc). */
function findAndroidBundle(exportDir) {
  const meta = path.join(exportDir, 'metadata.json');
  if (fs.existsSync(meta)) {
    const rel = JSON.parse(fs.readFileSync(meta, 'utf8'))?.fileMetadata?.android?.bundle;
    if (rel) return path.join(exportDir, rel);
  }
  const jsDir = path.join(exportDir, '_expo', 'static', 'js', 'android');
  const hbc = fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter((f) => f.endsWith('.hbc')) : [];
  if (hbc.length === 1) return path.join(jsDir, hbc[0]);
  return null;
}

function main(argv) {
  const arg = (flag, fallback) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : fallback;
  };
  const exportDir = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : null;
  const generatedDir = arg('--generated', path.join(MOBILE, 'src', 'content', 'generated'));
  const lessonsDir = arg('--lessons', path.join(MOBILE, 'src', 'content', 'lessons'));
  let failed = false;

  // 1. The bundle.
  if (exportDir) {
    const bundle = findAndroidBundle(exportDir);
    if (!bundle || !fs.existsSync(bundle)) {
      console.error(`Size budget: no Android bundle found in ${exportDir} (run expo export first).`);
      return 1;
    }
    const size = fs.statSync(bundle).size;
    const line = `Android bundle ${mb(size)} of ${mb(BUNDLE_BUDGET)} (${Math.round((size / BUNDLE_BUDGET) * 100)}%)`;
    if (size > BUNDLE_BUDGET) {
      console.error(`Size budget: OVER: ${line}. Find what grew (new library? big data file?) before raising the budget.`);
      failed = true;
    } else {
      console.log(`Size budget: ${line}.`);
    }
  }

  // 2. Content per certification.
  const certs = fs.existsSync(generatedDir)
    ? fs.readdirSync(generatedDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : [];
  if (certs.length === 0) {
    console.error(`Size budget: no generated content in ${generatedDir} (run npm run content first).`);
    return 1;
  }
  for (const cert of certs.sort()) {
    // lessons.json is inside the pack folder; the old TypeScript lessons file only counts when it isn't.
    const packDir = path.join(generatedDir, cert);
    const lessons = path.join(lessonsDir, `${cert}.ts`);
    const lessonsInPack = fs.existsSync(path.join(packDir, 'lessons.json'));
    const size = folderBytes(packDir) + (!lessonsInPack && fs.existsSync(lessons) ? fs.statSync(lessons).size : 0);
    const line = `${cert} content ${mb(size)} of ${mb(CONTENT_BUDGET_PER_CERT)} (${Math.round((size / CONTENT_BUDGET_PER_CERT) * 100)}%)`;
    if (size > CONTENT_BUDGET_PER_CERT) {
      console.error(`Size budget: OVER: ${line}. Trim author-only fields in build-content.mjs or plan a downloadable pack.`);
      failed = true;
    } else {
      console.log(`Size budget: ${line}.`);
    }
  }

  return failed ? 1 : 0;
}

// Run only when called as a script (not when imported).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
