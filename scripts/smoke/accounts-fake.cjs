// Loads the Jest fake Supabase (mobile/jest/webcloud-fakes.ts) in plain Node,
// so the browser tests of the website's account screens (accounts.mjs) talk to
// the SAME fake server the shared sign-in client is unit-tested against
// (GoTrue's password rules, the database's password guard, sync rows, the two
// account functions). It compiles that file and the few it imports with the
// TypeScript already in mobile/node_modules. Nothing is written to disk.
const fs = require('fs');
const path = require('path');

module.exports = function loadFakes(repo) {
  const ts = require(path.join(repo, 'mobile', 'node_modules', 'typescript'));
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
      fileName: file,
    }).outputText;
    const req = (spec) => {
      if (!spec.startsWith('.')) return require(spec);
      const base = path.resolve(path.dirname(file), spec);
      for (const c of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) if (fs.existsSync(c)) return load(c);
      throw new Error('accounts-fake: cannot find ' + spec + ' from ' + file);
    };
    new Function('module', 'exports', 'require', out)(mod, mod.exports, req);
    return mod.exports;
  }
  return load(path.join(repo, 'mobile', 'jest', 'webcloud-fakes.ts'));
};
