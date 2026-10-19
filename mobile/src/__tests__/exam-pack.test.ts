/**
 * The exam pack: data/exam/cisa_exam_guide.json + final_review_week.json →
 * src/content/generated/<cert>/exam.json → content/exam.
 *
 * Runs against the REAL generated pack (the build checked every link) and
 * the REAL source files through the builder again, this time with the app's
 * domain weights, plus small fakes for each way the build must fail
 * (scripts/exam-guide-pack.cjs).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import { clearExamCache, getExamGuide, getFinalWeek, hasExamGuide, hasFinalWeek } from '../content/exam';
import type { ExamPack } from '../content/exam/types';
import { findNote, getNotes } from '../content/notes';
import { findPrinciple, getPrinciples } from '../content/principles';

// CommonJS on purpose (see the file header), so Jest loads it untransformed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildExamPack, ACTION_KINDS } = require('../../scripts/exam-guide-pack.cjs') as {
  buildExamPack: (
    guide: unknown,
    week: unknown,
    certId?: string,
    opts?: { notes?: unknown; principles?: unknown; domains?: { id: string; weight?: number }[] },
  ) => { pack: ExamPack; problems: string[]; warnings: string[]; skipped: string | null };
  ACTION_KINDS: string[];
};

const REPO = join(__dirname, '..', '..', '..');
const readJson = (rel: string) => JSON.parse(readFileSync(join(REPO, rel), 'utf8'));
const realGuide = () => readJson('data/exam/cisa_exam_guide.json');
const realWeek = () => readJson('data/exam/final_review_week.json');
const cisa = getCertification('cisa')!;
const opts = () => ({ notes: getNotes('cisa'), principles: getPrinciples('cisa'), domains: cisa.domains.map((d) => ({ id: d.id, weight: d.weight })) });
const build = (guide: unknown, week: unknown) => buildExamPack(guide, week, 'cisa', opts());

beforeEach(() => clearExamCache());

describe('the real CISA exam pack', () => {
  it('builds from the shared files with no problems, checked against the notes, principles and weights', () => {
    const r = build(realGuide(), realWeek());
    expect(r.problems).toEqual([]);
    expect(r.skipped).toBeNull();
    expect(r.pack.guide?.sections.length).toBeGreaterThanOrEqual(7);
    expect(r.pack.week?.days).toHaveLength(7);
  });

  it('is bundled: the guide has the seven required sections in order, and https sources only', () => {
    expect(hasExamGuide('cisa')).toBe(true);
    const guide = getExamGuide('cisa')!;
    const ids = guide.sections.map((s) => s.id);
    const required = ['at-a-glance', 'domains', 'registering-and-fees', 'test-center-or-online', 'exam-day', 'after-the-exam', 'becoming-certified'];
    expect(required.map((id) => ids.indexOf(id))).toEqual([...required.map((id) => ids.indexOf(id))].sort((a, b) => a - b));
    expect(required.every((id) => ids.includes(id))).toBe(true);
    for (const s of guide.sections) {
      expect([s.id, s.title.length > 0, s.items.length > 0, s.sources.length > 0]).toEqual([s.id, true, true, true]);
      for (const src of s.sources) expect(src.url).toMatch(/^https:\/\//);
    }
    expect(guide.checkBeforeBooking).toMatch(/isaca\.org/);
    expect(guide.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(guide.disclaimer).toMatch(/not affiliated/i);
  });

  it('the guide’s domain weights match the app’s (certifications.ts, which mirrors DI)', () => {
    const domains = getExamGuide('cisa')!.sections.find((s) => s.id === 'domains')!.domains!;
    expect(domains.map((d) => [d.id, d.weight])).toEqual(cisa.domains.map((d) => [d.id, d.weight]));
    expect(domains.reduce((n, d) => n + d.weight, 0)).toBe(100);
  });

  it('the week counts down 7…1, and every link it makes is real', () => {
    const week = getFinalWeek('cisa')!;
    expect(hasFinalWeek('cisa')).toBe(true);
    expect(week.days.map((d) => d.daysBefore)).toEqual([7, 6, 5, 4, 3, 2, 1]);
    expect(week.days.map((d) => d.id)).toEqual(['day-7', 'day-6', 'day-5', 'day-4', 'day-3', 'day-2', 'day-1']);
    const notes = getNotes('cisa')!;
    const topics = new Set(notes.domains.flatMap((d) => d.topics.map((t) => t.id)));
    const families = new Set(getPrinciples('cisa')!.families.map((f) => f.id));
    for (const day of week.days) {
      for (const t of day.tasks) {
        if (!t.action) continue;
        expect(ACTION_KINDS).toContain(t.action.kind);
        const target = t.action.target;
        if (t.action.kind === 'note' && target) expect([target, Boolean(findNote('cisa', target) || topics.has(target))]).toEqual([target, true]);
        if (t.action.kind === 'principles' && target && target !== 'top_slip') {
          expect([target, Boolean(findPrinciple('cisa', target) || families.has(target))]).toEqual([target, true]);
        }
      }
    }
  });

  it('the cheat sheet lists every principle once, and each point’s note is in its own domain', () => {
    const sheet = getFinalWeek('cisa')!.cheatSheet;
    const all = getPrinciples('cisa')!.principles.map((p) => p.id).sort();
    expect([...sheet.principles.ids].sort()).toEqual(all);
    expect(sheet.domains.map((d) => d.id)).toEqual(['1', '2', '3', '4', '5']);
    for (const d of sheet.domains) {
      for (const p of d.points) if (p.note) expect([p.note, findNote('cisa', p.note)?.domainId]).toEqual([p.note, d.id]);
    }
    expect(sheet.priorityWords.map((w) => w.word)).toEqual(['FIRST', 'BEST', 'MOST', 'PRIMARY', 'GREATEST', 'MOST LIKELY', 'LEAST']);
    expect(sheet.routine.length).toBeGreaterThanOrEqual(4);
    expect(sheet.pace.length).toBeGreaterThanOrEqual(2);
  });

  it('no learner-facing text says "stem" (ids such as answer-from-the-stem are not shown)', () => {
    const { pack } = build(realGuide(), realWeek());
    const words = JSON.stringify({ ...pack, week: { ...pack.week, cheatSheet: { ...pack.week!.cheatSheet, principles: { intro: pack.week!.cheatSheet.principles.intro } } } });
    expect(words).not.toMatch(/\bstem\b/i);
  });

  it('only CISA has a pack today; another cert gets nothing and its rows hide', () => {
    for (const c of CERTIFICATIONS.filter((x) => x.id !== 'cisa')) {
      expect([c.id, hasExamGuide(c.id), hasFinalWeek(c.id)]).toEqual([c.id, false, false]);
    }
  });

  it('mobile CI runs when the shared exam files change', () => {
    const yml = readFileSync(join(REPO, '.github', 'workflows', 'mobile.yml'), 'utf8');
    const paths = yml.match(/paths: \[.*\]/g) ?? [];
    expect(paths.length).toBe(2);
    for (const line of paths) expect(line).toContain("'data/exam/**'");
  });
});

describe('the builder’s failure modes', () => {
  /** The real week with one change made to it. */
  const weekWith = (change: (w: ReturnType<typeof realWeek>) => void) => {
    const w = realWeek();
    change(w);
    return w;
  };

  it('a missing file gives a null half; both missing is an empty pack, never a failed build', () => {
    expect(build(null, realWeek())).toMatchObject({ problems: [], pack: { guide: null } });
    expect(build(realGuide(), null)).toMatchObject({ problems: [], pack: { week: null } });
    const none = build(null, null);
    expect(none).toMatchObject({ problems: [], skipped: 'no', pack: { certId: 'cisa', guide: null, week: null } });
  });

  it('another schema version is left out with a warning, not a failure', () => {
    const r = build({ ...realGuide(), schema_version: 2 }, { ...realWeek(), schema_version: 9 });
    expect(r.problems).toEqual([]);
    expect(r.pack).toMatchObject({ guide: null, week: null });
    expect(r.warnings.join(' ')).toMatch(/schema_version 2.*schema_version 9/);
  });

  it('fails on an unknown note id (a task target or a cheat-sheet point)', () => {
    const r = build(null, weekWith((w) => {
      w.days[3].tasks[2].action.target = '9Z9.9';
      w.cheat_sheet.domains[0].points[0].note = '1Z1.1';
    }));
    expect(r.problems).toEqual(expect.arrayContaining([expect.stringMatching(/links note "9Z9\.9"/), expect.stringMatching(/links note "1Z1\.1"/)]));
  });

  it('fails on a cheat-sheet note from another domain', () => {
    const r = build(null, weekWith((w) => {
      w.cheat_sheet.domains[0].points[0].note = '4B1.1';
    }));
    expect(r.problems).toEqual([expect.stringMatching(/Domain 1 links note "4B1\.1" from another domain/)]);
  });

  it('fails on an unknown principle id (a task target or the cheat-sheet list)', () => {
    const r = build(null, weekWith((w) => {
      w.days[1].tasks[4].action.target = 'no-such-family';
      w.cheat_sheet.principles.ids.push('no-such-principle');
    }));
    expect(r.problems).toEqual(expect.arrayContaining([expect.stringMatching(/principle "no-such-family"/), expect.stringMatching(/principle "no-such-principle"/)]));
  });

  it('fails on an unknown action kind, a bad practice target and an unknown sheet part', () => {
    const r = build(null, weekWith((w) => {
      w.days[0].tasks[0].action = { kind: 'video' };
      w.days[2].tasks[1].action.target = 'weakest';
      w.days[4].tasks[0].sheet = ['3', 'everything'];
    }));
    expect(r.problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/unknown action kind "video"/),
        expect.stringMatching(/practices "weakest"/),
        expect.stringMatching(/unknown cheat-sheet part "everything"/),
      ]),
    );
  });

  it('fails on "stem" in learner text, in either file', () => {
    const g = realGuide();
    g.sections[0].items[0] = 'Read the stem twice.';
    const r = build(g, weekWith((w) => {
      w.days[0].remember = 'Trust the stem.';
    }));
    expect(r.problems).toEqual(expect.arrayContaining([expect.stringMatching(/exam guide says "stem"/), expect.stringMatching(/final review week says "stem"/)]));
  });

  it('fails on a source that is not https, and on a weight that disagrees with the app', () => {
    const g = realGuide();
    g.sections[0].sources[0].url = 'http://www.isaca.org/';
    g.sections.find((s: { id: string }) => s.id === 'domains').domains[3].weight = 25;
    const r = build(g, null);
    expect(r.problems).toEqual(expect.arrayContaining([expect.stringMatching(/not an https link/), expect.stringMatching(/Domain 4 25%, the app says 26%/)]));
  });

  it('the build itself (ids only, no weights) still accepts the real files', () => {
    const r = buildExamPack(realGuide(), realWeek(), 'cisa', { notes: getNotes('cisa'), principles: getPrinciples('cisa'), domains: cisa.domains.map((d) => ({ id: d.id })) });
    expect(r.problems).toEqual([]);
  });
});
