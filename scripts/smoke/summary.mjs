// Smoke summary: reads <out_dir>/{web,mobile,gates}-results.json and prints one
// PASS/FAIL table (also saved as <out_dir>/summary.txt). Exit 1 when anything failed.
//   node summary.mjs <out_dir> [seconds]
//   node summary.mjs --gates <out_dir> <npm_check_exit_code> <seconds>
//     records `npm run check` (from <out_dir>/npm-check.log) as gates-results.json.
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
if (args[0] === '--gates') {
  const [, out, code, secs] = args;
  const log = fs.existsSync(path.join(out, 'npm-check.log')) ? fs.readFileSync(path.join(out, 'npm-check.log'), 'utf8') : '';
  const pick = (re) => (log.match(re) || [])[0];
  const failed = [...new Set([...log.matchAll(/^\s*● (.+)$/gm)].map((m) => m[1].trim()))];
  const notes = [pick(/^Test Suites:.*$/m), pick(/^Tests:.*$/m), ...log.split('\n').filter((l) => /^✓ /.test(l))].filter(Boolean);
  // Which step stopped it: typecheck → lint → jest → web plant check (package.json "check").
  let stopped = '';
  if (code !== '0') {
    if (/error TS\d+/.test(log)) stopped = 'typecheck (tsc) failed';
    else if (/✖ \d+ problems?/.test(log)) stopped = 'lint failed';
    else if (failed.length || /^Tests:.*failed/m.test(log)) stopped = 'jest failed (the web plant check after it did not run)';
    else stopped = 'web plant check (build-web-plant --check) failed';
  }
  const p = { id: 'G1', name: 'Phone unit gates (npm run check)', status: code === '0' ? 'PASS' : 'FAIL', shots: [], notes,
    errors: [], steps: [], fails: code === '0' ? [] : [stopped, ...failed.map((f) => 'failing test: ' + f)], ms: Number(secs) * 1000 };
  fs.writeFileSync(path.join(out, 'gates-results.json'), JSON.stringify({ suite: 'gates', meta: { exitCode: Number(code) }, paths: [p] }, null, 2));
  console.log(`[G1] ${p.status} (${secs}s) ${notes.slice(0, 2).join(' · ')}`);
  process.exit(0);
}

const [out, secs] = args;
if (!out) { console.error('usage: node summary.mjs <out_dir> [seconds]'); process.exit(2); }
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(out, f), 'utf8')); } catch { return null; } };
const meta = read('run-meta.json') || {};
const suites = ['web', 'mobile', 'gates'].map((s) => read(`${s}-results.json`)).filter(Boolean);
const rows = suites.flatMap((s) => s.paths.map((p) => ({ ...p, suite: s.suite })));
const lines = [];
const anyFail = rows.some((r) => r.status === 'FAIL');
lines.push(`Smoke ${anyFail ? 'NO-GO' : rows.length ? 'GO' : 'NOTHING RUN'} · commit ${meta.sha || '?'}${meta.dirtyFiles ? ` (+${meta.dirtyFiles} changed files)` : ''}${secs ? ` · ${Math.round(secs / 60)} min` : ''}`);
for (const s of suites) if (s.meta && s.meta.appVersion) lines.push(`${s.suite}: version ${s.meta.appVersion}`);
lines.push('');
lines.push('| Path | Result | Time | Screenshots |');
lines.push('|---|---|---|---|');
for (const r of rows) lines.push(`| ${r.id} ${r.name} | ${r.status} | ${(r.ms / 1000).toFixed(0)} s | ${r.shots.slice(0, 4).join(', ')}${r.shots.length > 4 ? ` +${r.shots.length - 4}` : ''} |`);
for (const r of rows.filter((x) => x.status !== 'PASS' || x.errors.length)) {
  lines.push('', `${r.id} ${r.status}: ${r.name}`);
  for (const f of r.fails) lines.push(`  - ${f}`);
  for (const e of r.errors.slice(0, 10)) lines.push(`  - ${e}`);
  if (r.steps.length) lines.push(`  steps: ${r.steps.join(' → ')}`);
}
const text = lines.join('\n');
console.log('\n' + text);
fs.writeFileSync(path.join(out, 'summary.txt'), text + '\n');
process.exit(anyFail ? 1 : 0);
