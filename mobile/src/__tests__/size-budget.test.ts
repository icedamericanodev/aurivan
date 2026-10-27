/**
 * Size budgets (architecture decision, 15 Oct 2026): CI fails when the
 * Android JavaScript bundle passes 14 MB or one certification's study
 * content passes 6 MB.
 *
 * These tests run scripts/check-size-budget.mjs as CI does, on the real
 * generated content and on small fake folders. The fake bundle is a "sparse"
 * file: it reports its full size without using that much disk.
 */
import { spawnSync } from 'child_process';
import { closeSync, ftruncateSync, mkdirSync, mkdtempSync, openSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const MOBILE = join(__dirname, '..', '..');
const SCRIPT = join(MOBILE, 'scripts', 'check-size-budget.mjs');
const MB = 1_000_000;

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'size-budget-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** A file that reports `bytes` in size (sparse, so it costs no disk). */
function fakeFile(file: string, bytes: number) {
  const fd = openSync(file, 'w');
  ftruncateSync(fd, bytes);
  closeSync(fd);
}

/** A fake `expo export` folder with a bundle of this size. */
function fakeExport(bundleBytes: number) {
  const out = join(dir, 'export');
  mkdirSync(join(out, '_expo', 'static', 'js', 'android'), { recursive: true });
  const rel = '_expo/static/js/android/entry-abc.hbc';
  fakeFile(join(out, rel), bundleBytes);
  writeFileSync(join(out, 'metadata.json'), JSON.stringify({ fileMetadata: { android: { bundle: rel } } }));
  return out;
}

/** A fake generated/ pack with one certification of this size: questions plus lessons.json (content packs). */
function fakeContent(cert: string, jsonBytes: number, lessonBytes: number) {
  const generated = join(dir, 'generated');
  mkdirSync(join(generated, cert), { recursive: true });
  fakeFile(join(generated, cert, 'd1.json'), jsonBytes);
  fakeFile(join(generated, cert, 'lessons.json'), lessonBytes);
  return ['--generated', generated, '--lessons', join(dir, 'lessons')];
}

function run(args: string[]) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

describe('check-size-budget', () => {
  it('passes on the real generated content', () => {
    const r = run([]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/cisa content .* of 6\.00 MB/);
  });

  it('passes a bundle under 14 MB and fails one over it', () => {
    const content = fakeContent('cisa', 3 * MB, 0);
    expect(run([fakeExport(9.83 * MB), ...content]).code).toBe(0);
    const over = run([fakeExport(14 * MB + 1), ...content]);
    expect(over.code).toBe(1);
    expect(over.out).toMatch(/OVER: Android bundle 14\.00 MB of 14\.00 MB/);
  });

  it('the real CISA pack carries its lessons as data (lessons.json is counted)', () => {
    const r = run([]);
    const withLessons = Number(/cisa content ([\d.]+) MB/.exec(r.out)![1]);
    expect(withLessons).toBeGreaterThan(4); // questions + notes ≈ 4.2 MB, plus about 0.4 MB of lessons
  });

  it('an older layout (lessons in a .ts file, no lessons.json) still counts them, never twice', () => {
    const generated = join(dir, 'generated');
    const lessons = join(dir, 'lessons');
    mkdirSync(join(generated, 'cisa'), { recursive: true });
    mkdirSync(lessons, { recursive: true });
    fakeFile(join(generated, 'cisa', 'd1.json'), 5 * MB);
    fakeFile(join(lessons, 'cisa.ts'), 1 * MB + 1);
    expect(run(['--generated', generated, '--lessons', lessons]).code).toBe(1);
    fakeFile(join(generated, 'cisa', 'lessons.json'), 0); // the pack has its own lessons now: the .ts is not added
    expect(run(['--generated', generated, '--lessons', lessons]).code).toBe(0);
  });

  it('counts lessons with the generated files and fails over 6 MB', () => {
    expect(run(fakeContent('cisa', 5 * MB, 1 * MB)).code).toBe(0);
    rmSync(join(dir, 'generated'), { recursive: true });
    const over = run(fakeContent('cisa', 5 * MB, 1 * MB + 1));
    expect(over.code).toBe(1);
    expect(over.out).toMatch(/OVER: cisa content/);
  });

  it('fails closed when the export or the content is missing', () => {
    const content = fakeContent('cisa', 1 * MB, 0);
    expect(run([join(dir, 'nowhere'), ...content]).out).toMatch(/no Android bundle found/);
    expect(run(['--generated', join(dir, 'empty')]).code).toBe(1);
  });
});
