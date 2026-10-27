/**
 * web-plant-bundle.cjs — compiles the plant companion's pure TypeScript (the
 * growth engine, the look catalogue and the SVG art data) into ONE plain
 * browser script for the website: ../assets/kaisip-plant.js.
 *
 * WHY (plain English):
 *   The website is one static index.html with no npm and no bundler at
 *   runtime. Copying the plant engine into it by hand would drift from the
 *   app. So this file compiles the app's own sources with the TypeScript
 *   compiler the mobile project already has (no new dependency), wraps each
 *   module in a tiny loader, and exposes one global, `window.KaiSipPlant`.
 *   The output is committed; `--check` (run by `npm run check` and
 *   scripts/verify_repo.sh) fails when it is out of date with the sources.
 *
 * WHAT IS IN IT:
 *   The entry modules below and every module they import at runtime
 *   (type-only imports are dropped by the compiler, so React, stores and
 *   content packs never come along: the entries are pure). A module that is
 *   not plain TypeScript or CommonJS, or that imports a package, stops the
 *   build.
 *
 * CommonJS (not .mjs) so Jest can load it too (the same pattern as
 * notes-pack.cjs). The CLI is build-web-plant.mjs.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MOBILE = path.resolve(__dirname, '..');
const REPO = path.resolve(MOBILE, '..');
const OUT = path.join(REPO, 'assets', 'kaisip-plant.js');
const INDEX = path.join(REPO, 'index.html');
/** index.html loads the bundle as assets/kaisip-plant.js?v=<first 10 hex of its sha256>, so a new bundle is never served from a stale cache. */
const REF_RE = /assets\/kaisip-plant\.js\?v=([0-9a-f]*)/g;

/** What the website reads, by the name it reads it under (KaiSipPlant.<name>). */
const ENTRIES = {
  plant: 'src/engine/plant.ts',
  looks: 'src/engine/plantLooks.ts',
  art: 'src/components/plant/art.ts',
  mastery: 'src/engine/mastery.ts',
  readiness: 'src/engine/readiness.ts',
  readinessRange: 'src/engine/readinessRange.ts',
  examReady: 'src/engine/examReady.ts',
  streak: 'src/engine/streak.ts',
  outline: 'src/engine/outline.ts',
  notesPack: 'scripts/notes-pack.cjs',
  // Web v12.41, the Progress page: the readiness report's rules, the domain
  // bands, pace words and the "Ready to book?" signs, so the web and the app
  // say the same thing from the same numbers.
  readinessReport: 'src/engine/readinessReport.ts',
  domainBand: 'src/engine/domainBand.ts',
  pace: 'src/engine/pace.ts',
  readySigns: 'src/engine/readySigns.ts',
};

function loadTs() {
  try {
    return require(require.resolve('typescript', { paths: [MOBILE] }));
  } catch (e) {
    const err = new Error('typescript is not installed in mobile/node_modules (run npm ci in mobile/)');
    err.code = 'NO_TS';
    throw err;
  }
}

function resolveFrom(fromId, spec) {
  if (!spec.startsWith('.')) throw new Error(`${fromId} imports the package "${spec}": the web plant bundle takes pure modules only`);
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromId), spec));
  for (const cand of [base, `${base}.ts`, `${base}/index.ts`]) {
    if (/\.(ts|cjs)$/.test(cand) && fs.existsSync(path.join(MOBILE, cand))) return cand;
  }
  throw new Error(`${fromId}: cannot resolve "${spec}" (only .ts and .cjs modules can go in the web plant bundle)`);
}

function compile(ts, id) {
  const src = fs.readFileSync(path.join(MOBILE, id), 'utf8');
  if (id.endsWith('.tsx')) throw new Error(`${id} is a React file: the web plant bundle takes pure modules only`);
  const code = id.endsWith('.cjs')
    ? src
    : ts.transpileModule(src, {
        fileName: id,
        reportDiagnostics: false,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2019,
          removeComments: true,
          isolatedModules: true,
          esModuleInterop: false,
          importHelpers: false,
          newLine: ts.NewLineKind.LineFeed,
        },
      }).outputText;
  const deps = {};
  const re = /\brequire\((["'])([^"']+)\1\)/g;
  let m;
  while ((m = re.exec(code))) deps[m[2]] = resolveFrom(id, m[2]);
  return { src, code: code.replace(/\n?\/\/# sourceMappingURL=.*$/m, '').trimEnd(), deps };
}

/** Builds the bundle text (pure: reads the sources, writes nothing). */
function buildBundle() {
  const ts = loadTs();
  const mods = new Map();
  const queue = Object.values(ENTRIES);
  while (queue.length) {
    const id = queue.shift();
    if (mods.has(id)) continue;
    const mod = compile(ts, id);
    mods.set(id, mod);
    queue.push(...Object.values(mod.deps));
  }
  const ids = [...mods.keys()].sort();
  const sourceHash = crypto.createHash('sha256');
  for (const id of ids) sourceHash.update(`${id}\n${mods.get(id).src}\n`);
  const lines = [
    '/*',
    ' * GENERATED FILE: do not edit. Built by mobile/scripts/build-web-plant.mjs',
    ' * from the mobile app\'s own plant sources (growth engine, looks, SVG art),',
    ' * so the website and the app grow the same plant. Rebuild after changing',
    ' * any of them: cd mobile && npm run web-plant',
    ` * TypeScript ${ts.version}. Modules: ${ids.length}.`,
    ' */',
    '(function (root) {',
    '  "use strict";',
    '  var defs = {};',
    '  var links = {};',
  ];
  for (const id of ids) {
    const mod = mods.get(id);
    lines.push(`  links[${JSON.stringify(id)}] = ${JSON.stringify(mod.deps)};`);
    lines.push(`  defs[${JSON.stringify(id)}] = function (module, exports, require) {`);
    lines.push(mod.code);
    lines.push('  };');
  }
  lines.push(
    '  var cache = {};',
    '  function load(id) {',
    '    if (cache[id]) return cache[id].exports;',
    '    var module = { exports: {} };',
    '    cache[id] = module;',
    '    defs[id].call(module.exports, module, module.exports, function (spec) {',
    '      var to = links[id][spec];',
    '      if (!to) throw new Error("kaisip-plant: " + id + " cannot load " + spec);',
    '      return load(to);',
    '    });',
    '    return module.exports;',
    '  }',
    '  var api = {};',
    ...Object.entries(ENTRIES).map(([name, id]) => `  api[${JSON.stringify(name)}] = load(${JSON.stringify(id)});`),
    `  api.sourceHash = ${JSON.stringify(sourceHash.digest('hex').slice(0, 16))};`,
    '  root.KaiSipPlant = Object.freeze(api);',
    "})(typeof window !== 'undefined' ? window : globalThis);",
    '',
  );
  return lines.join('\n');
}

/** The cache-busting value index.html must carry for this bundle text. */
function refFor(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 10);
}

/** Problems with the committed files (empty when the bundle and index.html are current). */
function checkBundle(text = buildBundle()) {
  const problems = [];
  const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (have === null) problems.push('assets/kaisip-plant.js is missing');
  else if (have !== text) problems.push('assets/kaisip-plant.js is out of date with the mobile plant sources');
  const html = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : '';
  const refs = [...html.matchAll(REF_RE)].map((m) => m[1]);
  const want = refFor(text);
  if (!refs.length) problems.push('index.html does not load assets/kaisip-plant.js?v=…');
  else if (refs.some((r) => r !== want)) problems.push(`index.html loads kaisip-plant.js?v=${refs.join(',')}, expected ?v=${want}`);
  return problems;
}

/** Writes the bundle and points index.html's script tag at it. Returns { text, ref, changed }. */
function writeBundle() {
  const text = buildBundle();
  const ref = refFor(text);
  const before = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (before !== text) fs.writeFileSync(OUT, text);
  let htmlChanged = false;
  if (fs.existsSync(INDEX)) {
    const html = fs.readFileSync(INDEX, 'utf8');
    const next = html.replace(REF_RE, `assets/kaisip-plant.js?v=${ref}`);
    if (next !== html) {
      fs.writeFileSync(INDEX, next);
      htmlChanged = true;
    }
  }
  return { text, ref, changed: before !== text || htmlChanged };
}

module.exports = { ENTRIES, OUT, buildBundle, checkBundle, writeBundle, refFor };
