/**
 * web-plant-bundle.cjs — the website bundle builder. It compiles pure
 * TypeScript from the mobile app into plain browser scripts, one per TARGET:
 *   - plant: ../assets/kaisip-plant.js, global `KaiSipPlant` (the plant
 *     companion: growth engine, looks, SVG art, readiness rules);
 *   - cloud: ../assets/kaisip-cloud.js, global `KaiSipCloud` (accounts beta
 *     §1.1: the website's sign-in client, synced-copy API, snapshot codec,
 *     the account ↔ website mapping and the phone's own sync engine).
 * (The file keeps its first name so CI and scripts/verify_repo.sh need no
 * change; `checkBundle` / `writeBundle` without a target mean the plant.)
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
const INDEX = path.join(REPO, 'index.html');
/** mobile/LIVE_VERSION: the app version live on Google Play (one line, updated after each Play rollout). */
const LIVE_VERSION_FILE = path.join(MOBILE, 'LIVE_VERSION');
const APP_JSON = path.join(MOBILE, 'app.json');
/** mobile/LIVE_STORE_VERSIONS.json: that Play release's PROGRESS_VERSION and SETTINGS_VERSION ({ "progress": n, "settings": n }). */
const LIVE_STORES_FILE = path.join(MOBILE, 'LIVE_STORE_VERSIONS.json');
/** Where this engine's own store versions are defined. */
const MIGRATIONS = path.join(MOBILE, 'src', 'engine', 'saveMigrations.ts');
const SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;

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

/**
 * The website's cloud client, public names (KaiSipCloud.<name>): the browser
 * port adapters and the public config. The client itself is reached only
 * through KaiSipCloud.create (security audit of 6f4469e: never a raw
 * createWebCloud), which stamps the Play versions and the page's address.
 */
const CLOUD_ENTRIES = {
  browser: 'src/webcloud/browser.ts',
  config: 'src/webcloud/config.ts',
};
/** Bundled but not exposed. */
const CLOUD_INTERNAL = { cloud: 'src/webcloud/index.ts' };

/**
 * One output per target. `ref` is how index.html loads it
 * (?v=<first 10 hex of its sha256>, so a new bundle is never served from a
 * stale cache); `refRequired` false while index.html doesn't load it yet.
 */
const TARGETS = {
  plant: {
    out: path.join(REPO, 'assets', 'kaisip-plant.js'),
    file: 'assets/kaisip-plant.js',
    global: 'KaiSipPlant',
    entries: ENTRIES,
    refRe: /assets\/kaisip-plant\.js\?v=([0-9a-f]*)/g,
    refRequired: true,
    what: 'the mobile plant sources',
    header: [
      ' * GENERATED FILE: do not edit. Built by mobile/scripts/build-web-plant.mjs',
      " * from the mobile app's own plant sources (growth engine, looks, SVG art),",
      ' * so the website and the app grow the same plant. Rebuild after changing',
      ' * any of them: cd mobile && npm run web-plant',
    ],
    stamp: false,
  },
  cloud: {
    out: path.join(REPO, 'assets', 'kaisip-cloud.js'),
    file: 'assets/kaisip-cloud.js',
    global: 'KaiSipCloud',
    entries: CLOUD_ENTRIES,
    internal: CLOUD_INTERNAL,
    refRe: /assets\/kaisip-cloud\.js\?v=([0-9a-f]*)/g,
    refRequired: false,
    what: 'the mobile sync sources',
    header: [
      ' * GENERATED FILE: do not edit. Built by mobile/scripts/build-web-plant.mjs',
      " * from the mobile app's own TypeScript (mobile/src/webcloud and the sync",
      ' * engine it uses), so the website syncs with the same rules as the app.',
      ' * Loaded only when an account is used. Rebuild: cd mobile && npm run web-plant',
    ],
    stamp: true,
  },
};
/** Older names (the plant), kept for callers and tests. */
const OUT = TARGETS.plant.out;
const REF_RE = TARGETS.plant.refRe;

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
  if (!spec.startsWith('.')) throw new Error(`${fromId} imports the package "${spec}": a website bundle takes pure modules only`);
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromId), spec));
  for (const cand of [base, `${base}.ts`, `${base}/index.ts`]) {
    if (/\.(ts|cjs)$/.test(cand) && fs.existsSync(path.join(MOBILE, cand))) return cand;
  }
  throw new Error(`${fromId}: cannot resolve "${spec}" (only .ts and .cjs modules can go in a website bundle)`);
}

function compile(ts, id) {
  const src = fs.readFileSync(path.join(MOBILE, id), 'utf8');
  if (id.endsWith('.tsx')) throw new Error(`${id} is a React file: a website bundle takes pure modules only`);
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

/** The version stamp files, read fresh (cloud target). */
function readLiveVersion() {
  return fs.existsSync(LIVE_VERSION_FILE) ? fs.readFileSync(LIVE_VERSION_FILE, 'utf8').trim() : '';
}
function readAppVersion() {
  try {
    return String(JSON.parse(fs.readFileSync(APP_JSON, 'utf8')).expo.version || '');
  } catch {
    return '';
  }
}
/** { progress, settings } from mobile/LIVE_STORE_VERSIONS.json, or null when it is missing or malformed. */
function readLiveStores() {
  try {
    const v = JSON.parse(fs.readFileSync(LIVE_STORES_FILE, 'utf8'));
    return v && Number.isInteger(v.progress) && v.progress >= 1 && Number.isInteger(v.settings) && v.settings >= 1 ? { progress: v.progress, settings: v.settings } : null;
  } catch {
    return null;
  }
}
/** This engine's PROGRESS_VERSION and SETTINGS_VERSION, read from the source. */
function readSourceStores() {
  const src = fs.readFileSync(MIGRATIONS, 'utf8');
  const num = (name) => {
    const m = new RegExp(`export const ${name} = (\\d+);`).exec(src);
    return m ? Number(m[1]) : NaN;
  };
  return { progress: num('PROGRESS_VERSION'), settings: num('SETTINGS_VERSION') };
}
function cmpVersion(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  return 0;
}

/**
 * The version-stamp rule (accounts beta §1.3, "Critical: the version
 * stamp"). Phones pause sync when a copy says a NEWER app wrote it, so the
 * website must stamp its pushes with the app version live on Google Play
 * (mobile/LIVE_VERSION) and never one ahead of it. Problems (empty when fine):
 *   - LIVE_VERSION must be x.y.z;
 *   - it can't be ahead of app.json's expo.version (no such app exists yet);
 *   - the bundle's own stamp can't be newer than LIVE_VERSION;
 *   - the store versions (security audit of 6f4469e): the website stamps
 *     store_version from mobile/LIVE_STORE_VERSIONS.json, so it must be
 *     readable, the engine's own versions can't be ahead of it (the website
 *     would push a shape the Play app can't read: phones pause), nor behind
 *     it (a typo), and the bundle can't stamp newer ones.
 * The store checks run only when `liveStores` is passed (undefined: skipped).
 */
function stampProblems({ bundleVersion, liveVersion, appVersion, liveStores, sourceStores, bundleStores }) {
  const out = [];
  if (liveStores !== undefined) {
    if (!liveStores) out.push('mobile/LIVE_STORE_VERSIONS.json must be { "progress": n, "settings": n } (the Play release\'s store versions)');
    else {
      for (const k of ['progress', 'settings']) {
        const src = sourceStores ? sourceStores[k] : NaN;
        if (!Number.isInteger(src)) out.push(`can't read the engine's ${k} store version from src/engine/saveMigrations.ts`);
        else if (src > liveStores[k]) out.push(`the engine's ${k} store version ${src} is ahead of the Play release's ${liveStores[k]} (mobile/LIVE_STORE_VERSIONS.json): wait for the Play rollout before rebuilding the website bundle`);
        else if (src < liveStores[k]) out.push(`mobile/LIVE_STORE_VERSIONS.json says ${k} ${liveStores[k]}, but the engine is only at ${src}`);
        if (bundleStores && bundleStores[k] > liveStores[k]) out.push(`assets/kaisip-cloud.js stamps ${k} store version ${bundleStores[k]}, newer than the Play release's ${liveStores[k]}`);
      }
    }
  }
  if (!SEMVER.test(liveVersion)) {
    out.push(`mobile/LIVE_VERSION must be one x.y.z line (the app version live on Google Play), found "${liveVersion}"`);
    return out;
  }
  if (SEMVER.test(appVersion) && cmpVersion(liveVersion, appVersion) > 0) out.push(`mobile/LIVE_VERSION ${liveVersion} is ahead of app.json's expo.version ${appVersion}`);
  if (bundleVersion !== null && bundleVersion !== undefined) {
    if (!SEMVER.test(bundleVersion)) out.push(`assets/kaisip-cloud.js has no valid version stamp`);
    else if (cmpVersion(bundleVersion, liveVersion) > 0) out.push(`assets/kaisip-cloud.js stamps ${bundleVersion}, newer than the Play release in mobile/LIVE_VERSION (${liveVersion}): phones would pause sync`);
  }
  return out;
}

/** The stamp a built cloud bundle carries (null when none). */
function bundleStamp(text) {
  const m = /\n {2}var liveVersion = "([^"]*)";\n/.exec(text || '');
  return m ? m[1] : null;
}

/** The store versions a built cloud bundle stamps (null when none). */
function bundleStoreStamp(text) {
  const m = /\n {2}var liveStoreVersions = (\{[^\n]*\});\n/.exec(text || '');
  try {
    return m ? JSON.parse(m[1]) : null;
  } catch {
    return null;
  }
}

/** Builds the bundle text (pure: reads the sources, writes nothing). */
function buildBundle(targetName = 'plant', opts = {}) {
  const target = TARGETS[targetName];
  if (!target) throw new Error(`unknown bundle target "${targetName}"`);
  const ts = loadTs();
  const mods = new Map();
  const queue = [...Object.values(target.entries), ...Object.values(target.internal || {})];
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
    ...target.header,
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
  const tag = targetName === 'plant' ? 'kaisip-plant' : `kaisip-${targetName}`;
  lines.push(
    '  var cache = {};',
    '  function load(id) {',
    '    if (cache[id]) return cache[id].exports;',
    '    var module = { exports: {} };',
    '    cache[id] = module;',
    '    defs[id].call(module.exports, module, module.exports, function (spec) {',
    '      var to = links[id][spec];',
    `      if (!to) throw new Error("${tag}: " + id + " cannot load " + spec);`,
    '      return load(to);',
    '    });',
    '    return module.exports;',
    '  }',
    '  var api = {};',
    ...Object.entries(target.entries).map(([name, id]) => `  api[${JSON.stringify(name)}] = load(${JSON.stringify(id)});`),
    `  api.sourceHash = ${JSON.stringify(sourceHash.digest('hex').slice(0, 16))};`,
  );
  if (target.stamp) {
    // What every push from the website is stamped with: mobile/LIVE_VERSION and LIVE_STORE_VERSIONS.json.
    const live = opts.liveVersion !== undefined ? opts.liveVersion : readLiveVersion();
    const stores = opts.liveStores !== undefined ? opts.liveStores : readLiveStores() || { progress: 0, settings: 0 };
    lines.push(
      `  var cloud = load(${JSON.stringify(target.internal.cloud)});`,
      `  var liveVersion = ${JSON.stringify(live)};`,
      `  var liveStoreVersions = ${JSON.stringify({ progress: stores.progress, settings: stores.settings })};`,
      '  api.liveVersion = liveVersion;',
      '  api.liveStoreVersions = Object.freeze({ progress: liveStoreVersions.progress, settings: liveStoreVersions.settings });',
      '  api.accountsAllowed = cloud.accountsAllowed;',
      '  // KaiSipCloud.create({ ... }): the client, with the Play versions and this page\'s address filled in',
      '  // (the caller can\'t change them). It refuses any address but https://kaisip.com; `devOrigin: true`',
      '  // adds only localhost and "no address" (Node tests), never another site.',
      '  api.create = function (o) {',
      '    var opts = {};',
      '    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) opts[k] = o[k];',
      '    opts.appVersion = liveVersion;',
      '    opts.storeVersions = { progress: liveStoreVersions.progress, settings: liveStoreVersions.settings };',
      "    opts.origin = root.location && typeof root.location.origin === 'string' ? root.location.origin : '';",
      '    return cloud.createWebCloud(opts);',
      '  };',
    );
  }
  lines.push(`  root.${target.global} = Object.freeze(api);`, "})(typeof window !== 'undefined' ? window : globalThis);", '');
  return lines.join('\n');
}

/** The cache-busting value index.html must carry for this bundle text. */
function refFor(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 10);
}

/** Problems with the committed files (empty when the bundle and index.html are current). */
function checkBundle(text, targetName = 'plant') {
  const target = TARGETS[targetName];
  if (text === undefined) text = buildBundle(targetName);
  const problems = [];
  const have = fs.existsSync(target.out) ? fs.readFileSync(target.out, 'utf8') : null;
  if (have === null) problems.push(`${target.file} is missing`);
  else if (have !== text) problems.push(`${target.file} is out of date with ${target.what}`);
  if (target.stamp) {
    problems.push(
      ...stampProblems({ bundleVersion: bundleStamp(have), liveVersion: readLiveVersion(), appVersion: readAppVersion(), liveStores: readLiveStores(), sourceStores: readSourceStores(), bundleStores: bundleStoreStamp(have) }),
    );
  }
  const html = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, 'utf8') : '';
  const refs = [...html.matchAll(target.refRe)].map((m) => m[1]);
  const want = refFor(text);
  if (!refs.length) {
    if (target.refRequired) problems.push(`index.html does not load ${target.file}?v=…`);
  } else if (refs.some((r) => r !== want)) problems.push(`index.html loads ${path.basename(target.file)}?v=${refs.join(',')}, expected ?v=${want}`);
  return problems;
}

/** Every target's problems, each named. */
function checkAll() {
  return Object.keys(TARGETS).flatMap((name) => checkBundle(undefined, name));
}

/** Writes the bundle and points index.html's script tag at it (when it has one). Returns { text, ref, changed }. */
function writeBundle(targetName = 'plant') {
  const target = TARGETS[targetName];
  if (target.stamp) {
    const problems = stampProblems({ bundleVersion: null, liveVersion: readLiveVersion(), appVersion: readAppVersion(), liveStores: readLiveStores(), sourceStores: readSourceStores() });
    if (problems.length) throw new Error(problems.join('; '));
  }
  const text = buildBundle(targetName);
  const ref = refFor(text);
  const before = fs.existsSync(target.out) ? fs.readFileSync(target.out, 'utf8') : null;
  if (before !== text) fs.writeFileSync(target.out, text);
  let htmlChanged = false;
  if (fs.existsSync(INDEX)) {
    const html = fs.readFileSync(INDEX, 'utf8');
    const next = html.replace(target.refRe, `${target.file}?v=${ref}`);
    if (next !== html) {
      fs.writeFileSync(INDEX, next);
      htmlChanged = true;
    }
  }
  return { text, ref, changed: before !== text || htmlChanged };
}

module.exports = { ENTRIES, CLOUD_ENTRIES, TARGETS, OUT, REF_RE, buildBundle, checkBundle, checkAll, writeBundle, refFor, stampProblems, bundleStamp, bundleStoreStamp };
