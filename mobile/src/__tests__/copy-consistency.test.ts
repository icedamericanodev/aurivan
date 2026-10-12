/**
 * Mobile 1.15 (PHASE5.md §2.6–2.7): a source scan that keeps the old
 * jargon and the four ways of writing minutes from coming back. It reads
 * every screen, component, lib and engine file (not tests, not generated
 * content), drops comments, and checks what a learner could read or hear:
 * string literals and JSX text.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = join(__dirname, '..');
const SKIP = ['__tests__', join('content', 'generated')];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (SKIP.some((s) => relative(SRC, p).startsWith(s))) return [];
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

/** Source without comments: block comments, JSX comments and line comments (not "://" in URLs). */
function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

/** What a learner can read or hear: string literals and JSX text runs (with `${…}` code taken out). */
function userText(src: string): string[] {
  const code = stripComments(src);
  const out: string[] = [];
  for (const m of code.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) out.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, '…'));
  for (const m of code.matchAll(/>([^<>{}=]*[A-Za-z][^<>{}=]*)</g)) out.push(m[1]);
  return out;
}

const SOURCES = files(SRC).map((p) => ({ file: relative(SRC, p), text: userText(readFileSync(p, 'utf8')), code: stripComments(readFileSync(p, 'utf8')) }));

const hits = (re: RegExp, where: 'text' | 'code' = 'text') =>
  SOURCES.flatMap(({ file, text, code }) => (where === 'text' ? text : [code]).filter((t) => re.test(t)).map((t) => `${file}: ${t.slice(0, 80)}`));

describe('copy consistency: the old words stay gone', () => {
  it('scans a real tree (sanity)', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
    expect(SOURCES.some((s) => s.file === join('app', 'settings.tsx'))).toBe(true);
  });

  it('no "weighted by the blueprint", "Stage N", "Follow my stage" or "Counts half toward readiness"', () => {
    expect(hits(/weighted by the (exam )?blueprint/i)).toEqual([]);
    expect(hits(/Stage \$\{/, 'code')).toEqual([]);
    expect(hits(/\bStage \d/)).toEqual([]);
    expect(hits(/Follow my stage/i)).toEqual([]);
    expect(hits(/counts? half toward readiness/i)).toEqual([]);
  });

  it('no bare "s" for seconds in a pace ("96 s a question")', () => {
    expect(hits(/\d s a question|\} s a question| s a question/)).toEqual([]);
  });

  it('no "stem" in anything a learner reads (the question, not the stem)', () => {
    // The type style named "stem" is code, not words. The lessons teach the
    // term on purpose ("a short scenario, called the stem"), and a plant has a stem.
    const taught = (t: string) => t.startsWith(join('content', 'lessons')) || t.startsWith(join('engine', 'plant'));
    expect(hits(/\bstems?\b/i).filter((t) => !/: stem$/.test(t) && !taught(t))).toEqual([]);
  });

  it('one minutes style on screen: never "About ${n} minutes" (spoken labels may say "minutes")', () => {
    const screens = SOURCES.filter(({ file }) => file.startsWith('app') || file.startsWith('components'));
    const shown = screens.flatMap(({ file, code }) =>
      code
        .split('\n')
        .filter((l) => /[Aa]bout \$\{[^}]+\} minutes/.test(l) && !/accessibilityLabel|spoken|Spoken|announce|sayLater/.test(l))
        .map((l) => `${file}: ${l.trim().slice(0, 80)}`),
    );
    expect(shown).toEqual([]);
  });

  it('the old mistake tags and slip titles are gone', () => {
    expect(hits(/^(Wrong role|Missed FIRST\/BEST|Tech before governance)$/)).toEqual([]);
    expect(hits(/FIRST\/BEST|tech before governance|from the wrong role|misread the stem/i)).toEqual([]);
  });

  it('the old plan labels are gone ("Diagnostic: 20", "up to 10", "Ready check", "Find your gaps")', () => {
    expect(hits(/Diagnostic: |Light review · up to|Ready check|Find your gaps/)).toEqual([]);
  });
});
