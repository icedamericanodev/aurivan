import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkSamplePack, pruneReferences, sampleSelection, SAMPLE_COURSES } from './sample-content.mjs';
import { PUBLIC_PROFILE, questionPackMode } from './build-content.mjs';
import { audit, BUNDLED_COURSES, holdsId, stemNeedles } from './audit-public-aab.mjs';

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
    assert.throws(() => sampleSelection(tmp, ['cisa']));
    for (const bad of [[], [...ids, ids[0]], [...ids, 'd1_999'], ids.slice(1),
      [...ids, ...ids.map((id) => id.replace('001', '002'))]]) {
      fs.writeFileSync(file, JSON.stringify({ cert: 'cisa', ids: bad }));
      assert.throws(() => sampleSelection(tmp, ['cisa']));
    }
    // A list that names another course is not this course's list.
    fs.writeFileSync(file, JSON.stringify({ cert: 'crisc', ids }));
    assert.throws(() => sampleSelection(tmp, ['cisa']), /Invalid or duplicate/);
    fs.writeFileSync(file, JSON.stringify({ cert: 'cisa', ids }));
    assert.equal(sampleSelection(tmp, ['cisa']).ids.size, 5);
    // Every course needs its own list and bank: CRISC has neither here, and a course with no
    // reviewed manifest at all (CISM, or a prototype key) is refused, never treated as "all free".
    assert.throws(() => sampleSelection(tmp, ['cisa', 'crisc']));
    for (const cert of ['cism', 'constructor']) assert.throws(() => sampleSelection(tmp, [cert]), /No reviewed sample manifest/);
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
    // The same guard holds for every bundled course (CRISC and AAIA as well as CISA).
    for (const certId of ['crisc', 'aaia']) {
      const course = selection.courses[certId];
      assert.ok(course, `${certId} is in the sample build`);
      const domainFile = path.join(tmp, `${certId}/d1.json`);
      const domainText = fs.readFileSync(domainFile, 'utf8');
      assert.equal(JSON.parse(domainText).length, course.domains['1'].length);
      const paidQ = course.questions.find((q) => !course.ids.has(q.id));
      const fullQ = JSON.parse(fs.readFileSync(path.join(repo, SAMPLE_COURSES[certId].source('1')), 'utf8')).questions
        .find((q) => q.id === paidQ.id);
      fs.writeFileSync(domainFile, JSON.stringify([...JSON.parse(domainText), { ...fullQ, certId, domainId: '1' }]));
      assert.throws(() => checkSamplePack(tmp, selection), /differs/, `${certId}: a paid question added to a domain`);
      fs.writeFileSync(domainFile, domainText);
      const courseNotes = path.join(tmp, `${certId}/notes.json`);
      const courseNotesText = fs.readFileSync(courseNotes, 'utf8');
      for (const leak of [{ practiceIds: [paidQ.id] }, { explanation: `See ${paidQ.question}` }]) {
        fs.writeFileSync(courseNotes, JSON.stringify(leak));
        assert.throws(() => checkSamplePack(tmp, selection), /Non-sample/, `${certId}: ${JSON.stringify(leak).slice(0, 40)}`);
      }
      fs.writeFileSync(courseNotes, courseNotesText);
      // These courses have no game decks: one appearing is an unreviewed file.
      fs.writeFileSync(path.join(tmp, `${certId}/roles.json`), '[]');
      assert.throws(() => checkSamplePack(tmp, selection), /Unexpected sample file/);
      fs.unlinkSync(path.join(tmp, `${certId}/roles.json`));
    }
    // A CISA id inside a CRISC id ("crisc_d1_005" ends with "d1_005") is not a CISA reference.
    const crisc = selection.courses.crisc;
    const cisaPaid = new Set(selection.courses.cisa.questions.filter((q) => !selection.courses.cisa.ids.has(q.id)).map((q) => q.id));
    assert.ok([...crisc.ids].some((id) => cisaPaid.has(id.replace(/^crisc_/, ''))), 'the test needs a CRISC sample id that ends like a paid CISA id');
    checkSamplePack(tmp, selection);
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

test('the public .aab audit checks every bundled course and the courses not bundled yet', () => {
  assert.deepEqual(BUNDLED_COURSES, ['cisa', 'crisc', 'aaia']);
  const selection = sampleSelection(repo);
  // A fake bundle: every sample id back to back, as Hermes stores strings, plus each sample stem.
  const free = selection.questions.filter((q) => selection.ids.has(q.id));
  const bundle = (extra = '', utf16 = '') => Buffer.concat([
    Buffer.from(free.map((q) => q.id).join('') + free.map((q) => q.question).join('\n') + extra, 'utf8'),
    Buffer.from(utf16, 'utf16le'),
  ]);
  const ok = audit(bundle());
  assert.equal(ok.pass, true, JSON.stringify({ ...ok, hosts: undefined }).slice(0, 400));
  assert.equal(ok.sampleIdsFound, ok.sampleIds);
  for (const c of BUNDLED_COURSES) {
    assert.equal(ok.courses[c].sampleIdsFound, selection.courses[c].ids.size, c);
    assert.ok(ok.courses[c].paidStemsChecked > 0, c);
  }
  // "crisc_d1_005" holds "d1_005" but is not that CISA question; on its own it is.
  assert.equal(holdsId('xxcrisc_d1_005yy', 'd1_005'), false);
  assert.equal(holdsId('aaia_d2_010d2_010', 'd2_010'), true);
  assert.equal(holdsId('crisc_d1_005', 'crisc_d1_005'), true);
  // Only "crisc_" and "aaia_" are discounted, and only for a bare CISA id.
  assert.equal(holdsId('cisa_d1_005', 'd1_005'), true);
  assert.equal(holdsId('aaia_crisc_d1_005', 'crisc_d1_005'), true);
  // Every paid stem must be checkable: short ones and ones inside a free stem fail the audit.
  assert.equal(ok.paidStemsUnchecked.length, 0);
  for (const c of BUNDLED_COURSES) assert.deepEqual(ok.courses[c].paidStemsUnchecked, [], c);
  const longStem = 'Which of the following should the risk practitioner recommend FIRST to the owner?';
  const { needles, unchecked } = stemNeedles([
    { id: 'p_short', question: 'Too short to search for.' },
    { id: 'p_inside', question: longStem },
    { id: 'p_start', question: `${longStem.slice(0, 60)} and then something only this paid stem says.` },
    { id: 'p_plain', question: 'A stem that no free question shares at all, long enough to search.' },
  ], [`A free stem. ${longStem} More free text.`]);
  assert.deepEqual(unchecked, ['p_short', 'p_inside']);
  assert.deepEqual(needles.map(([id, n]) => [id, n.length]), [
    ['p_start', `${longStem.slice(0, 60)} and then something only this paid stem says.`.length], // searched whole
    ['p_plain', 60],
  ]);
  for (const c of ['crisc', 'aaia']) {
    const course = selection.courses[c];
    const paid = course.questions.find((q) => !course.ids.has(q.id));
    const byId = audit(bundle(paid.id));
    assert.equal(byId.pass, false);
    assert.deepEqual(byId.courses[c].paidIdsFound, [paid.id]);
    const byStem = audit(bundle('', paid.question));
    assert.equal(byStem.pass, false, `${c}: a paid stem in UTF-16`);
    assert.deepEqual(byStem.courses[c].paidStemsFound, [paid.id]);
    // A bundle missing one sample question of this course fails (the public build would open a gap).
    const one = [...course.ids][0];
    const gap = audit(Buffer.from(bundle().toString('latin1').split(one).join(''), 'latin1'));
    assert.equal(gap.pass, false);
    assert.equal(gap.courses[c].sampleIdsFound, course.ids.size - 1);
  }
  // Courses not bundled yet: any of their ids fails the audit.
  for (const [dir, file] of [['data/cc/originals', 'd1.json'], ['data/csoe/originals', 'd1.json'],
    ['data/cia/cia1/originals', 'd1.json'], ['data/cia/ciac/originals', 'd1.json']]) {
    const src = path.join(repo, dir, file);
    if (!fs.existsSync(src)) continue;
    const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
    const id = (Array.isArray(raw) ? raw : raw.questions)[0].id;
    const r = audit(bundle(id));
    assert.equal(r.pass, false, id);
    assert.deepEqual(r.unreleasedIdsFound, [id]);
  }
});
