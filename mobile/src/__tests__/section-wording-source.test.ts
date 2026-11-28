/**
 * A fence around the app's own wording (docs/content/CIA_BANK_PLAN.md section 11): no screen may
 * write the word "domain" as fixed text, because a course with sections must read "section".
 *
 * Plain English for the founder:
 * - This test reads the app's source files (not the tests, not the generated content) and looks
 *   for the word "domain" inside text a learner could see or hear: a quoted sentence or the words
 *   between two tags.
 * - Text built with the helpers in engine/domainNaming.ts (`domainWord`, `domainTitle`,
 *   `domainCopy`) is fine: the helper picks the course's word.
 * - Two short lists below name the places where fixed "domain" text is allowed, each with its
 *   reason. ALLOWED_FILES: a few whole files that hold no screen wording (the helper itself, the
 *   release history, the plant the phone does not show). ALLOWED_CONSTANTS: in a file that also
 *   holds screen wording, only the NAMED constants (for example YARDSTICK_LINE, which is shown
 *   through `domainCopy`). A new sentence anywhere else in those files fails, like in any file;
 *   the last test plants one to prove it.
 * - If this test fails after you add a sentence, write it with `domainWord(cert, 'domain')`
 *   instead of the bare word. CISA reads the same; a course with sections reads "section".
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join(__dirname, '..');

/** Whole files where a fixed "domain" sentence is allowed, and why: none of them holds screen wording of its own. */
const ALLOWED_FILES: Record<string, string> = {
  'engine/domainNaming.ts': 'the helper itself',
  'content/types.ts': 'the type of the helper’s setting',
  'content/support/index.ts': 'What’s New is the history of past releases; the common questions are shown through domainCopy (app/faq.tsx)',
  'content/brand.ts': 'the question-checking note, shown inside a common question (through domainCopy)',
  'cloud/memory/seed.ts': 'made-up posts for the feedback board’s demo',
  'engine/plant.ts': 'the plant’s lines: the plant is not shown on the phone (the website’s bundle reads them, CISA only)',
  'engine/plantLooks.ts': 'the plant’s looks: not shown on the phone',
};

/**
 * Files that hold screen wording AND a few fixed constants written in CISA's words. Only the
 * named constants may say "domain" (each is shown through a helper, see the reason); any other
 * line of the file is checked like every other file. The name is the top-level `const` or
 * `function` the line sits in.
 */
const ALLOWED_CONSTANTS: Record<string, Record<string, string>> = {
  'engine/domainBand.ts': {
    YARDSTICK_LINE: 'shown through domainCopy (app/readiness.tsx)',
    BANDS_LINE: 'the website’s line (not shown on the phone)',
  },
  'engine/readinessReport.ts': {
    FALL_NOTE: 'said through domainCopy(FALL_NOTE, course) in this file',
    PATH_STEPS: 'each step’s line is shown through domainCopy (app/readiness.tsx)',
    PATH_REASON: 'shown through domainCopy (app/readiness.tsx)',
    PATH_NOTE: 'shown through domainCopy (app/readiness.tsx)',
  },
  'components/readinessReport.tsx': {
    HOW_LINE: 'shown through domainCopy (app/readiness.tsx)',
  },
  'engine/milestones.ts': {
    BADGES: 'CISA’s badge names and rules; badgeName and badgeRule give a course’s own',
  },
  'engine/readySigns.ts': {
    SIGN_TITLE: 'CISA’s title; domainsSignTitle gives a course’s own',
  },
};

/** Lines that are code, not wording (the word is a field name, a type or a saved key). */
const CODE_LINES: RegExp[] = [
  /\['domains'\]/, // a type lookup: Certification['domains'][number]
  /Pick<Certification, [^>]*'domains'/, // a type
  /readMarkKey\(/, // a saved key's kind
  /kind: 'note' \| 'domain'/, // the same kind, as a type
  /=== 'Domains' \?/, // the hero tile's width rule compares the key
  /\? domain : undefined;$/, // a variable named domain
  /domain\?\.short \?\? 'Question bank'/, // a variable named domain
  /\), domain\.short\),$/, // a variable named domain
  /^export type (RingTone|SetId|SignId) = /, // ids
  /'domains'[,\]]/, // the badge set's id in a list
  /'(firm-footing|whole-map)': 'domains'/, // the badge set's id
  /case 'domains':/, // the badge set's id
  /domains\.(every|length)/, // a variable named domains
  /domain: \(id: string\)/, // a function named domain
  /\| 'domains'>/, // the planter rule's id, as a type (engine/milestones.ts PLANTER_NEEDS)
  /needs !== 'domains'/, // the same id, compared
];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['__tests__', 'generated', 'node_modules'].includes(e.name)) sourceFiles(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/**
 * Take the code out of a line, so only wording is left:
 * - the helper calls (what they write is the course's word, never fixed text);
 * - a value dropped into a sentence, `${domain.name}` (a variable, not a word; one that holds its
 *   own quoted text is kept, so a sentence inside it is still read);
 * - the arrow of a function, `=>` (its `>` is not the end of a tag).
 */
const withoutCode = (line: string) =>
  line
    .replace(/domain(Word|Title|Mark|Copy)\([^()]*(\([^()]*\)[^()]*)*\)/g, 'HELPER')
    .replace(/\$\{[^{}'"`]*\}/g, 'VALUE')
    .replace(/=>/g, '= ');

/** One line where "domain" stands as fixed wording. */
interface Found {
  /** "engine/domainBand.ts:28: export const …" (what a failing test prints). */
  at: string;
  /** The top-level `const` or `function` the line sits in ('' before the first one). */
  owner: string;
}

/** A top-level declaration starts at the left edge: `export const NAME`, `function NAME`, `type NAME`… */
const DECLARATION = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/;

/**
 * The lines of one source text where "domain" stands inside quoted text or between two tags.
 * `name` is the file's path under src/, for the message. The text is passed in (not read here)
 * so a test can plant a sentence in a copy of a real file without touching the file.
 */
function fixedDomainLinesIn(text: string, name: string): Found[] {
  const found: Found[] = [];
  let inBlock = false;
  let owner = '';
  text
    .split('\n')
    .forEach((raw, i) => {
      let line = raw;
      // Which top-level constant or function this line belongs to (comments never start one:
      // inside a block comment every line starts with a space or a star).
      if (!inBlock) {
        const d = DECLARATION.exec(raw);
        if (d) owner = d[1];
      }
      // Comments are not wording.
      if (inBlock) {
        const end = line.indexOf('*/');
        if (end < 0) return;
        line = line.slice(end + 2);
        inBlock = false;
      }
      line = line.replace(/\/\*.*?\*\//g, '');
      const start = line.indexOf('/*');
      if (start >= 0) {
        inBlock = true;
        line = line.slice(0, start);
      }
      line = withoutCode(line.replace(/(^|[^:'"`])\/\/.*$/, '$1'));
      if (CODE_LINES.some((re) => re.test(line.trim()))) return;
      const word = /(^|[\s'"`>(,·])([Dd]omains?)(?=[\s'"`<.,;:!?)}’]|$)/g;
      let m: RegExpExecArray | null;
      while ((m = word.exec(line))) {
        const before = line.slice(0, m.index + m[1].length);
        const count = (ch: string) => before.split(ch).length - 1;
        const quoted = count("'") % 2 === 1 || count('"') % 2 === 1 || count('`') % 2 === 1;
        const betweenTags = /> *[^<{]*$/.test(before) && !/[=(]\s*$/.test(before);
        if (quoted || betweenTags) {
          found.push({ at: `${name}:${i + 1}: ${raw.trim().slice(0, 160)}`, owner });
          break;
        }
      }
    });
  return found;
}

/**
 * The lines of a file that break the rule: fixed "domain" wording that is not in an allowed file
 * and not inside one of that file's allowed constants. `text` defaults to the file as it is.
 */
function offendersIn(name: string, text: string = fs.readFileSync(path.join(SRC, name), 'utf8')): string[] {
  if (name in ALLOWED_FILES) return [];
  const allowed = ALLOWED_CONSTANTS[name] ?? {};
  return fixedDomainLinesIn(text, name)
    .filter((f) => !(f.owner in allowed))
    .map((f) => f.at);
}

describe('no fixed "domain" wording outside the helpers', () => {
  const files = sourceFiles(SRC);
  const rel = (f: string) => path.relative(SRC, f).split(path.sep).join('/');

  it('reads the whole app (a guard against an empty scan)', () => {
    expect(files.length).toBeGreaterThan(200);
    for (const f of [...Object.keys(ALLOWED_FILES), ...Object.keys(ALLOWED_CONSTANTS)]) expect(files.map(rel)).toContain(f);
  });

  it('every sentence that names a domain uses domainWord, domainTitle or domainCopy', () => {
    const offenders = files.flatMap((f) => offendersIn(rel(f)));
    // Write the sentence with domainWord(cert, 'domain') (engine/domainNaming.ts), or, for a fixed
    // constant, show it through domainCopy(text, cert). See the note at the top of this file.
    expect(offenders).toEqual([]);
  });

  it('the scan really sees fixed wording (it finds CISA’s own constants in the allowed files)', () => {
    const seen = (f: string) => fixedDomainLinesIn(fs.readFileSync(path.join(SRC, f), 'utf8'), f).map((x) => x.at).join('\n');
    expect(seen('components/readinessReport.tsx')).toContain('Each domain’s number');
    expect(seen('engine/readinessReport.ts')).toContain('look at the domains below');
    expect(seen('engine/domainBand.ts')).toContain('every domain at');
  });

  it('every allowed constant is real: it exists in its file and holds fixed wording (no stale allowance)', () => {
    for (const [file, names] of Object.entries(ALLOWED_CONSTANTS)) {
      const owners = fixedDomainLinesIn(fs.readFileSync(path.join(SRC, file), 'utf8'), file).map((f) => f.owner);
      for (const name of Object.keys(names)) expect([file, name, owners.includes(name)]).toEqual([file, name, true]);
    }
  });

  it('a planted sentence fails, even in a file that has allowed constants', () => {
    // A copy of each real file with one new fixed sentence at its end: the fence must name that
    // line and nothing else. (Before, these five files were skipped whole, so it got through.)
    for (const file of Object.keys(ALLOWED_CONSTANTS)) {
      const real = fs.readFileSync(path.join(SRC, file), 'utf8');
      expect(offendersIn(file, real)).toEqual([]);
      const planted = offendersIn(file, `${real}\nexport const PLANTED_LINE = 'Pick a domain to start.';\n`);
      expect(planted).toHaveLength(1);
      expect(planted[0]).toContain(`${file}:`);
      expect(planted[0]).toContain("export const PLANTED_LINE = 'Pick a domain to start.';");
    }
    // The same for wording between two tags, inside a new component.
    const screen = 'components/readinessReport.tsx';
    const withTag = `${fs.readFileSync(path.join(SRC, screen), 'utf8')}\nexport function Planted() {\n  return <T v="small">Every domain counts.</T>;\n}\n`;
    expect(offendersIn(screen, withTag)).toEqual([expect.stringContaining('<T v="small">Every domain counts.</T>')]);
    // A sentence added to a function that is NOT on the list, right after an allowed constant:
    // the allowance ends where the next top-level declaration starts.
    const band = 'engine/domainBand.ts';
    const after = fs.readFileSync(path.join(SRC, band), 'utf8').replace(/^export const YARDSTICK_LINE\b.*$/m, (line) => `${line}\nexport function plantedWords() {\n  return 'Your weakest domain comes first.';\n}`);
    expect(offendersIn(band, after)).toEqual([expect.stringContaining("return 'Your weakest domain comes first.';")]);
    // And an ordinary file (no allowance at all) is caught the same way.
    expect(offendersIn('components/pace.tsx', "export const PLANTED_LINE = 'All domains';\n")).toHaveLength(1);
    // The course's word through the helper is fine.
    expect(offendersIn('components/pace.tsx', "export const line = (cert: DomainStyled) => `All ${domainWord(cert, 'domains')}`;\n")).toEqual([]);
  });

  it('the allowed constants are shown through domainCopy on the phone', () => {
    const read = (f: string) => fs.readFileSync(path.join(SRC, f), 'utf8');
    const report = read('app/readiness.tsx');
    for (const name of ['YARDSTICK_LINE', 'HOW_LINE', 'PATH_NOTE', 'PATH_REASON[s.stage]', 's.line']) expect(report).toContain(`domainCopy(${name}, c`);
    expect(read('engine/readinessReport.ts')).toContain('domainCopy(FALL_NOTE, course)');
    expect(read('app/faq.tsx')).toContain('domainCopy(p, cert)');
  });

  it('Today passes the active course to every plan line (planText, planHero)', () => {
    // planText and planHero take the course as an optional last argument, so a call that leaves it
    // out still compiles and would say "domains" to a course with sections. Every call on Today
    // must name the course.
    const home = fs.readFileSync(path.join(SRC, 'app/(tabs)/home.tsx'), 'utf8');
    const calls = home.match(/\bplan(?:Text|Hero)\([^\n]*?\)(?=\.|;| :)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(7);
    for (const call of calls) expect(call).toMatch(/\b(course|j\.cert)\b/);
  });
});
