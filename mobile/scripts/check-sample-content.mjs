import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkSamplePack, pruneReferences, sampleSelection } from './sample-content.mjs';
import { PUBLIC_PROFILE, questionPackMode } from './build-content.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const generated = path.join(repo, 'mobile/src/content/generated');
const build = (mode) => {
  const env = { ...process.env };
  delete env.KAISIP_QUESTION_PACK;
  delete env.KAISIP_RELEASE;
  delete env.EAS_BUILD_PROFILE;
  if (mode !== undefined) env.KAISIP_QUESTION_PACK = mode;
  execFileSync(process.execPath, ['mobile/scripts/build-content.mjs'], { cwd: repo, env, stdio: 'pipe' });
};
const snapshot = (root) => Object.fromEntries(fs.readdirSync(root, { recursive: true })
  .filter((p) => fs.statSync(path.join(root, p)).isFile()).sort()
  .map((p) => [p, fs.readFileSync(path.join(root, p), 'utf8')]));

test('the public release fails closed unless it explicitly asks for the sample', () => {
  const ok = { KAISIP_RELEASE: 'public', KAISIP_QUESTION_PACK: 'sample' };
  assert.equal(questionPackMode(ok), 'sample');
  assert.equal(questionPackMode({ ...ok, EAS_BUILD_PROFILE: PUBLIC_PROFILE }), 'sample');
  for (const env of [
    { EAS_BUILD_PROFILE: PUBLIC_PROFILE },
    { EAS_BUILD_PROFILE: PUBLIC_PROFILE, KAISIP_QUESTION_PACK: 'sample' },
    { EAS_BUILD_PROFILE: PUBLIC_PROFILE, KAISIP_RELEASE: 'public' },
    { KAISIP_RELEASE: 'public' },
    { KAISIP_RELEASE: 'public', KAISIP_QUESTION_PACK: 'full' },
    { KAISIP_RELEASE: 'public', KAISIP_QUESTION_PACK: 'Sample' },
    { KAISIP_RELEASE: 'pubic', KAISIP_QUESTION_PACK: 'sample' },
  ]) assert.throws(() => questionPackMode(env), /KAISIP_RELEASE|Public release build/, JSON.stringify(env));
  // Local builds keep the full-bank default; the testers' store build must say "full".
  assert.equal(questionPackMode({}), 'full');
  assert.equal(questionPackMode({ EAS_BUILD_PROFILE: 'production', KAISIP_QUESTION_PACK: 'full' }), 'full');
  for (const pack of [undefined, 'sample', 'Full']) {
    assert.throws(() => questionPackMode({ EAS_BUILD_PROFILE: 'production', KAISIP_QUESTION_PACK: pack }), /Closed-testing build/);
  }
});

test('a public build with a bad setting leaves no generated pack behind', () => {
  const env = { ...process.env, KAISIP_RELEASE: 'public', KAISIP_QUESTION_PACK: 'full' };
  try {
    const run = spawnSync(process.execPath, ['mobile/scripts/build-content.mjs'], { cwd: repo, env, encoding: 'utf8' });
    assert.notEqual(run.status, 0);
    assert.equal(fs.existsSync(generated), false);
  } finally {
    build();
  }
});

test('only known question-link fields are pruned, without mutating source', () => {
  const source = { practiceIds: ['free', 'paid'], nested: [{ prepares: ['paid'] }], other: ['paid'] };
  assert.deepEqual(pruneReferences(source, new Set(['free'])), {
    practiceIds: ['free'], nested: [{ prepares: [] }], other: ['paid'],
  });
  assert.equal(source.practiceIds.length, 2);
});

test('manifest rejects missing, duplicate, unknown, empty-domain and full-bank selections', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaisip-manifest-'));
  try {
    fs.mkdirSync(path.join(tmp, 'data/free'), { recursive: true });
    const ids = [];
    for (let d = 1; d <= 5; d++) {
      ids.push(`d${d}_001`);
      fs.writeFileSync(path.join(tmp, `data/domain${d}.json`), JSON.stringify({ questions:
        [1, 2].map((n) => ({ id: `d${d}_00${n}`, domain: d })) }));
    }
    const file = path.join(tmp, 'data/free/cisa_sample_ids.json');
    assert.throws(() => sampleSelection(tmp));
    for (const bad of [[], [...ids, ids[0]], [...ids, 'd1_999'], ids.slice(1),
      [...ids, ...ids.map((id) => id.replace('001', '002'))]]) {
      fs.writeFileSync(file, JSON.stringify({ cert: 'cisa', ids: bad }));
      assert.throws(() => sampleSelection(tmp));
    }
    fs.writeFileSync(file, JSON.stringify({ cert: 'cisa', ids }));
    assert.equal(sampleSelection(tmp).ids.size, 5);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('real generator keeps default full, filters sample, fails closed and removes stale output', async () => {
  const selection = sampleSelection(repo);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaisip-sample-check-'));
  try {
    build();
    const full = snapshot(generated);
    assert.throws(() => checkSamplePack(generated, selection));
    fs.writeFileSync(path.join(generated, 'old-full.json'), 'stale');
    build('sample');
    assert.equal(fs.existsSync(path.join(generated, 'old-full.json')), false);
    checkSamplePack(generated, selection);
    const good = snapshot(generated);
    build('sample');
    assert.deepEqual(snapshot(generated), good, 'sample output is deterministic');
    fs.cpSync(generated, tmp, { recursive: true });
    const file = path.join(tmp, 'cisa/d1.json');
    const original = fs.readFileSync(file, 'utf8');
    const questions = JSON.parse(original);
    questions.pop();
    fs.writeFileSync(file, JSON.stringify(questions));
    assert.throws(() => checkSamplePack(tmp, selection), /differs/);
    fs.writeFileSync(file, original);
    fs.unlinkSync(path.join(tmp, 'cisa/pack.json'));
    assert.throws(() => checkSamplePack(tmp, selection), /Missing sample file/);
    fs.copyFileSync(path.join(generated, 'cisa/pack.json'), path.join(tmp, 'cisa/pack.json'));
    const notes = path.join(tmp, 'cisa/notes.json');
    const originalNotes = fs.readFileSync(notes, 'utf8');
    const paid = selection.questions.find((q) => !selection.ids.has(q.id));
    for (const leak of [{ practiceIds: [paid.id] }, { explanation: paid.question }]) {
      fs.writeFileSync(notes, JSON.stringify(leak));
      assert.throws(() => checkSamplePack(tmp, selection), /Non-sample/);
    }
    fs.writeFileSync(notes, originalNotes);
    fs.mkdirSync(path.join(tmp, 'unreviewed-cert'));
    assert.throws(() => checkSamplePack(tmp, selection), /Unexpected sample directory/);
    fs.rmdirSync(path.join(tmp, 'unreviewed-cert'));
    fs.symlinkSync(file, path.join(tmp, 'alias.json'));
    assert.throws(() => checkSamplePack(tmp, selection), /Symlink/);
    fs.unlinkSync(path.join(tmp, 'alias.json'));
    fs.writeFileSync(path.join(tmp, 'unknown.json'), '{}');
    assert.throws(() => checkSamplePack(tmp, selection), /Unexpected sample file/);
    const bad = spawnSync(process.execPath, ['mobile/scripts/build-content.mjs'], {
      cwd: repo, env: { ...process.env, KAISIP_QUESTION_PACK: 'sampl' }, encoding: 'utf8',
    });
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /must be full or sample/);
    assert.equal(fs.existsSync(generated), false, 'invalid mode cannot leave a stale full pack');
    const failed = spawnSync(process.execPath, ['mobile/scripts/build-content.mjs'], {
      cwd: repo, env: { ...process.env, KAISIP_QUESTION_PACK: 'sample', MINDSET_SRC: path.join(tmp, 'missing.html') },
    });
    assert.notEqual(failed.status, 0);
    assert.equal(fs.existsSync(generated), false, 'failed sample build leaves no exportable generated tree');
    // Pause the actual generator just after it writes a FULL domain in staging,
    // then kill it as an interrupted build. The final import path must be absent.
    const beforeStaging = new Set(fs.readdirSync(path.dirname(generated)));
    const script = `
      import fs from 'node:fs';
      import { pathToFileURL } from 'node:url';
      const write = fs.writeFileSync;
      fs.writeFileSync = (file, ...args) => {
        const result = write(file, ...args);
        if (String(file).includes('/.generated-') && String(file).endsWith('/cisa/d1.json')) {
          process.stdout.write('paused full staged domain\\n');
          process.kill(process.pid, 'SIGSTOP');
        }
        return result;
      };
      process.argv[1] = ${JSON.stringify(path.join(repo, 'mobile/scripts/build-content.mjs'))};
      await import(pathToFileURL(process.argv[1]));
    `;
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
      cwd: repo, env: { ...process.env, KAISIP_QUESTION_PACK: 'sample' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Interrupted-build test timed out')); }, 10000);
      child.once('error', reject);
      child.stdout.once('data', () => {
        try { assert.equal(fs.existsSync(generated), false); }
        catch (error) { reject(error); }
        finally { child.kill('SIGKILL'); }
      });
      child.once('exit', (code, signal) => {
        clearTimeout(timeout);
        if (signal === 'SIGKILL') resolve(); else reject(new Error(`Unexpected generator exit ${code}/${signal}`));
      });
    });
    for (const name of fs.readdirSync(path.dirname(generated))) {
      if (name.startsWith('.generated-') && !beforeStaging.has(name)) {
        fs.rmSync(path.join(path.dirname(generated), name), { recursive: true, force: true });
      }
    }
    build();
    assert.deepEqual(snapshot(generated), full, 'switching back restores full output byte for byte');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    build(); // Do not leave a reduced test pack in a developer checkout.
  }
});
