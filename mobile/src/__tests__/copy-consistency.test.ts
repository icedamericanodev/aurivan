/**
 * Mobile 1.15 (PHASE5.md §2.6–2.7): a source scan that keeps the old
 * jargon and the four ways of writing minutes from coming back. It reads
 * every screen, component, lib and engine file (not tests, not generated
 * content) and checks what a learner could read or hear: string literals,
 * template literals (nested ones too) and JSX text.
 *
 * Code review M3 (PR #45): the words come from the TypeScript syntax tree,
 * not from regular expressions over the source. Comments never reach the
 * tree, so a string like the '*' + '/*' file-type glob can't swallow code
 * as a "comment", and a template inside a template is scanned like any
 * other. No line is skipped.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import * as ts from 'typescript';

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

/** One run of words: `spoken` when it is only ever heard (a screen-reader label, an announcement). */
interface Words {
  text: string;
  spoken: boolean;
}

/** Props and keys whose words are heard, not read. */
const SPOKEN_NAMES = new Set(['accessibilityLabel', 'accessibilityHint', 'metaLabel', 'captionMetaLabel', 'titleLabel', 'spoken', 'spokenLabel']);
/** Calls whose argument is heard, not read. */
const SPOKEN_CALLS = new Set(['sayLater', 'announce', 'spokenMin']);

/** Is this node inside a spoken prop, key or call (before reaching a statement)? */
function isSpoken(node: ts.Node): boolean {
  for (let n: ts.Node | undefined = node.parent; n && !ts.isStatement(n); n = n.parent) {
    if (ts.isJsxAttribute(n) && SPOKEN_NAMES.has(n.name.getText())) return true;
    if (ts.isPropertyAssignment(n) && SPOKEN_NAMES.has(n.name.getText())) return true;
    if (ts.isCallExpression(n) && SPOKEN_CALLS.has(n.expression.getText())) return true;
  }
  return false;
}

/** Every literal a learner can read or hear, from the syntax tree. A template joins its parts with "…". */
export function userWords(file: string, src: string): Words[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: Words[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push({ text: n.text, spoken: isSpoken(n) });
    else if (ts.isTemplateExpression(n)) out.push({ text: [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join('…'), spoken: isSpoken(n) });
    else if (ts.isJsxText(n) && /[A-Za-z]/.test(n.text)) out.push({ text: n.text.trim(), spoken: false });
    // Imports are module paths, not words.
    if (!ts.isImportDeclaration(n) && !ts.isExportDeclaration(n)) ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** Every string value in a JSON value (keys are field names, not words). */
const jsonWords = (v: unknown): Words[] =>
  typeof v === 'string' ? [{ text: v, spoken: false }] : Array.isArray(v) ? v.flatMap(jsonWords) : v && typeof v === 'object' ? Object.values(v).flatMap(jsonWords) : [];

// Content packs, Phase A: the lessons are data now (../data/lessons/cisa.json, built into
// generated/cisa/lessons.json), so their words are scanned from the built pack, under the
// name they had as a source file, exactly as when they were TypeScript.
const LESSON_WORDS = { file: join('content', 'lessons', 'cisa.json'), words: jsonWords(JSON.parse(readFileSync(join(SRC, 'content', 'generated', 'cisa', 'lessons.json'), 'utf8'))) };

const SOURCES = [...files(SRC).map((p) => ({ file: relative(SRC, p), words: userWords(p, readFileSync(p, 'utf8')) })), LESSON_WORDS];

const hits = (re: RegExp, opts: { shownOnly?: boolean; in?: (file: string) => boolean } = {}) =>
  SOURCES.filter(({ file }) => !opts.in || opts.in(file)).flatMap(({ file, words }) =>
    words.filter((w) => (!opts.shownOnly || !w.spoken) && re.test(w.text)).map((w) => `${file}: ${w.text.slice(0, 80)}`),
  );

describe('the scanner itself (code review M3 probes)', () => {
  it('scans a real tree', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
    // The lessons' words are scanned too (data since content packs, Phase A).
    expect(LESSON_WORDS.words.some((w) => w.text === 'Who should approve the IS audit charter?')).toBe(true);
    expect(SOURCES.some((s) => s.file === join('app', 'settings.tsx'))).toBe(true);
  });

  it('a "*/*" file-type glob never hides the code after it', () => {
    const src = "const t = ['text/plain', '*/*'];\nconst x = 'Re-read the stem.';\n/** doc */\n";
    expect(userWords('x.ts', src).map((w) => w.text)).toContain('Re-read the stem.');
  });

  it('the words inside a nested template are scanned', () => {
    const src = "const meta = `${aboutMin(mins)} · ${more ? `${item.count} today, re-read the stem first` : 'questions to revisit'}`;";
    expect(userWords('x.ts', src).some((w) => /\bstem\b/.test(w.text))).toBe(true);
  });

  it('comments are never words; spoken props and announcements are marked spoken', () => {
    const src = [
      '// About ${n} minutes in a comment',
      '/* the stem */',
      'const a = <T accessibilityLabel={`About ${n} minutes`}>{`About ${n} min`}</T>;',
      'sayLater(`About ${n} minutes left`);',
      'const b = { spoken: `About ${n} minutes` };',
    ].join('\n');
    const words = userWords('x.tsx', src);
    expect(words.filter((w) => !w.spoken).map((w) => w.text)).toEqual(['About … min']);
    expect(words.filter((w) => w.spoken)).toHaveLength(3);
  });

  it('the "Stage N" rule sees a template split over lines', () => {
    const src = 'const s = `Stage ${\n  n\n} · ${label}`;';
    expect(userWords('x.ts', src).some((w) => /^Stage …/.test(w.text))).toBe(true);
  });
});

describe('copy consistency: the old words stay gone', () => {
  it('no "weighted by the blueprint", "Stage N", "Follow my stage" or "Counts half toward readiness"', () => {
    expect(hits(/weighted by the (exam )?blueprint/i)).toEqual([]);
    // Mobile 1.23 (owner's mockup A, decided): ONLY Today's readiness row says "Stage 4 · Rehearse the exam".
    // The plant no longer sits beside it (its row is under the tiles and shows no number), so the two
    // numbered ladders of PR #43 are never side by side. Everywhere else the old rule holds.
    expect(hits(/^Stage …|\bStage \d/, { in: (f) => f !== join('app', '(tabs)', 'home.tsx') })).toEqual([]);
    expect(hits(/^Stage …|\bStage \d/, { in: (f) => f === join('app', '(tabs)', 'home.tsx') })).toEqual(['app/(tabs)/home.tsx: Stage … · …']);
    expect(hits(/Follow my stage/i)).toEqual([]);
    expect(hits(/counts? half toward readiness/i)).toEqual([]);
  });

  it('one name for the review queue on both surfaces: "Questions to revisit", never "Spaced review" (mobile 1.42.1)', () => {
    // The website calls it "Questions to revisit". What's New keeps its history: an old entry may name the old word.
    const history = (f: string) => f === join('content', 'support', 'index.ts');
    expect(hits(/spaced review/i, { in: (f) => !history(f) })).toEqual([]);
  });

  it('no bare "s" for seconds in a pace ("96 s a question")', () => {
    expect(hits(/(\d|…) s a question| s a question/)).toEqual([]);
  });

  it('no "stem" in anything a learner reads (the question, not the stem)', () => {
    // The type style named "stem" is code, not words. The lessons teach the
    // term on purpose ("a short scenario, called the stem"), and a plant has a stem.
    const taught = (t: string) => t.startsWith(join('content', 'lessons')) || t.startsWith(join('engine', 'plant'));
    // A kebab-case id (a principle id such as answer-from-the-stem) is data, never shown.
    expect(hits(/\bstems?\b/i).filter((t) => !/: stem$/.test(t) && !/: [a-z]+(-[a-z]+)+$/.test(t) && !taught(t))).toEqual([]);
  });

  it('one minutes style on screen: never "About … minutes" (spoken labels may say "minutes")', () => {
    // Every file, not only screens: an engine line ends up on screen too.
    expect(hits(/\b[Aa]bout (…|\d+) minutes?\b/, { shownOnly: true })).toEqual([]);
  });

  it('the old mistake tags and slip titles are gone', () => {
    expect(hits(/^(Wrong role|Missed FIRST\/BEST|Tech before governance)$/)).toEqual([]);
    expect(hits(/FIRST\/BEST|tech before governance|from the wrong role|misread the stem/i)).toEqual([]);
  });

  it('the old plan labels are gone ("Diagnostic: 20", "up to 10", "Ready check", "Find your gaps")', () => {
    expect(hits(/Diagnostic: |Light review · up to|Ready check|Find your gaps/)).toEqual([]);
  });
});
