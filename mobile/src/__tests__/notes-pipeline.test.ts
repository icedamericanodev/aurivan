/**
 * Study notes pipeline (scripts/notes-pack.cjs, used by build-content.mjs)
 * and notes search (engine/notesSearch.ts).
 *
 * - A v1 notes file (or no file) gives an EMPTY pack, so the app keeps
 *   working and the Study notes entry hides itself until v2 lands.
 * - A v2 file gives typed, camelCase data; broken optional parts
 *   (illustration, compare table) are dropped, never fatal.
 * - The generated pack on disk matches what the pipeline makes from
 *   ../data/cisa_notes.json today.
 */
import fs from 'fs';
import path from 'path';
import { generatedNotes } from '../content/generated';
import type { NotesPack, NoteSubtopic } from '../content/notes/types';
import { normalize, readCount, searchNotes, snippetAround } from '../engine/notesSearch';
import fixture from './fixtures/notes-v2.json';

// CommonJS on purpose (see the file header), so Jest loads it untransformed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const notesPack = require('../../scripts/notes-pack.cjs') as {
  buildNotesPack: (raw: unknown, certId?: string) => { pack: NotesPack; problems: string[]; warnings: string[]; skipped: string | null };
  prepareIllustration: (ill: unknown) => { ok: boolean; reason?: string; value?: NonNullable<NoteSubtopic['illustrations']>[number] };
};
const { buildNotesPack, prepareIllustration } = notesPack;

// A deep copy typed loosely, so tests can break the fixture on purpose.
const clone = (v: unknown): any => JSON.parse(JSON.stringify(v));
const built = () => buildNotesPack(clone(fixture));
const sub = (pack: NotesPack, id: string) =>
  pack.domains.flatMap((d) => d.topics.flatMap((t) => t.subtopics)).find((s) => s.id === id)!;

describe('notes pipeline: v1 gives an empty pack', () => {
  it.each([
    ['a v1 file (no schema_version)', { title: 'x', domains: [{ domain_number: 1, topics: [] }] }],
    ['schema_version 1', { schema_version: 1, domains: [] }],
    ['schema_version 3 (unknown future)', { schema_version: 3, domains: [] }],
    ['no file at all', null],
  ])('%s', (_name, raw) => {
    const r = buildNotesPack(raw);
    expect(r.pack).toEqual({ certId: 'cisa', schemaVersion: 2, domains: [], strategyTips: [], connections: [] });
    expect(r.skipped).toMatch(/^schema v/);
    expect(r.problems).toEqual([]);
  });
});

describe('notes pipeline: v2 gives typed data', () => {
  it('builds both sample subtopics with no problems or warnings', () => {
    const r = built();
    expect(r.skipped).toBeNull();
    expect(r.problems).toEqual([]);
    expect(r.warnings).toEqual([]);
    // Domains come out in number order, whatever order the file has.
    expect(r.pack.domains.map((d) => d.id)).toEqual(['1', '4']);
  });

  it('renames every field and keeps the v2 content', () => {
    const { pack } = built();
    const s = sub(pack, '4B1.2');
    expect(s.domainId).toBe('4');
    expect(s.topicId).toBe('4B1');
    expect(s.name).toBe('Recovery Objectives: RPO, RTO, MTD and MBCO');
    expect(s.definition).toMatch(/^Recovery objectives are/);
    expect(s.whyItMatters).toBeTruthy();
    expect(s.howItWorks).toHaveLength(6);
    expect(s.compare?.columns).toEqual(['RPO', 'RTO', 'MTD']);
    expect(s.compare?.rows.every((row) => row.cells.length === 3)).toBe(true);
    expect(s.examTraps).toHaveLength(2);
    expect(s.keyTerms.map((k) => k.term)).toContain('Replication');
    expect(s.memoryAid).toMatch(/RPO looks back/);
    expect(s.analogy).toBeUndefined();
    // Web-only and fact fields are dropped (weights live in certifications.ts).
    expect(JSON.stringify(pack)).not.toMatch(/legacy_ids|legacyIds|exam_weight|domain_name/);
  });

  it('builds domains, parts, topics and the glossary', () => {
    const { pack } = built();
    const d4 = pack.domains.find((d) => d.id === '4')!;
    expect(d4.overview).toBeTruthy();
    expect(d4.analogy).toBeTruthy();
    expect(d4.parts.map((p) => p.part)).toEqual(['A', 'B']);
    expect(d4.parts[1].topicIds).toEqual(['4B1']);
    expect(d4.topics[0]).toMatchObject({ id: '4B1', canDo: ['Tell RPO from RTO in a scenario', 'Explain who sets recovery targets'] });
    expect(d4.keyTerms).toEqual([
      { term: 'BIA', definition: 'A study of how a disruption harms each business process.' },
      { term: 'MTD', definition: 'The longest outage the business can bear.' },
    ]);
    expect(pack.strategyTips).toHaveLength(1);
    expect(pack.connections[0].connection).toBe('BIA and audit planning');
  });

  it('prepares the illustration: size from the viewBox, label from aria-label', () => {
    const ill = sub(built().pack, '1A1.1').illustrations![0];
    expect(ill.width).toBe(460);
    expect(ill.height).toBe(150);
    expect(ill.label).toMatch(/^ISACA pronouncements by authority/);
    expect(ill.caption).toMatch(/three ITAF layers/);
    // The wrapper View speaks the label, so the SVG no longer carries it.
    expect(ill.svg).not.toMatch(/aria-label|role=/);
    expect(ill.svg.startsWith('<svg')).toBe(true);
  });

  it('skips a subtopic that misses a required field, and reports it', () => {
    const raw = clone(fixture);
    delete (raw.domains[0].topics[0].subtopics[0] as Record<string, unknown>).definition;
    const r = buildNotesPack(raw);
    expect(r.problems).toEqual(['4B1.2: missing definition']);
    expect(r.pack.domains.map((d) => d.id)).toEqual(['1']); // domain 4 had nothing left
  });

  it('merges a domain delivered in two halves (Part A + Part B) into one', () => {
    const raw = clone(fixture);
    const d4 = raw.domains[0];
    const partB = { domain_number: 4, partial: 'B', topics: d4.topics };
    const partA = { ...d4, partial: 'A', topics: [{ ...d4.topics[0], topic_id: '4A1', subtopics: [{ ...d4.topics[0].subtopics[0], id: '4A1.1' }] }] };
    raw.domains = [partB, raw.domains[1], partA]; // any order in the file
    const r = buildNotesPack(raw);
    expect(r.problems).toEqual([]);
    expect(r.pack.domains.map((d) => d.id)).toEqual(['1', '4']);
    const merged = r.pack.domains[1];
    expect(merged.topics.map((t) => t.id)).toEqual(['4A1', '4B1']);
    expect(merged.analogy).toBe(d4.analogy);
    expect(merged.parts).toHaveLength(2);
  });

  it('reports duplicate subtopic ids (they key the read ticks)', () => {
    const raw = clone(fixture);
    raw.domains[1].topics[0].subtopics[0].id = '4B1.2';
    expect(buildNotesPack(raw).problems).toContain('4B1.2: duplicate subtopic id');
  });

  it('drops a compare table whose rows do not match the columns, keeping the rest', () => {
    const raw = clone(fixture);
    raw.domains[0].topics[0].subtopics[0].compare.rows[0].cells.pop();
    const r = buildNotesPack(raw);
    expect(r.problems).toEqual([]);
    expect(r.warnings[0]).toMatch(/^4B1\.2: compare table dropped/);
    expect(sub(r.pack, '4B1.2').compare).toBeUndefined();
    expect(sub(r.pack, '4B1.2').example).toBeTruthy();
  });
});

describe('notes pipeline: bad illustrations are dropped, not fatal', () => {
  const good = "<svg viewBox='0 0 100 50' xmlns='http://www.w3.org/2000/svg'><rect x='1' y='1' width='10' height='10' fill='var(--surface)'/><text x='5' y='5'>Hi</text></svg>";
  it('accepts a simple diagram', () => {
    expect(prepareIllustration({ svg: good, caption: 'C' })).toMatchObject({ ok: true, value: { width: 100, height: 50, label: 'C' } });
  });
  it.each([
    ['not an svg', { svg: '<div>hi</div>' }],
    ['no svg string', { caption: 'x' }],
    ['no viewBox', { svg: "<svg xmlns='http://www.w3.org/2000/svg'><rect/></svg>" }],
    ['zero-width viewBox', { svg: "<svg viewBox='0 0 0 50'><rect/></svg>" }],
    ['unclosed tag', { svg: "<svg viewBox='0 0 10 10'><g><rect/></svg>" }],
    ['a script', { svg: "<svg viewBox='0 0 10 10'><script>alert(1)</script></svg>" }],
    ['an event handler', { svg: "<svg viewBox='0 0 10 10'><rect onclick='x()'/></svg>" }],
    ['a network image', { svg: "<svg viewBox='0 0 10 10'><image href='https://x.y/z.png'/></svg>" }],
    ['a stray <', { svg: "<svg viewBox='0 0 10 10'><text>a < b</text></svg>" }],
  ])('drops %s', (_name, ill) => {
    expect(prepareIllustration(ill).ok).toBe(false);
  });
  it('a dropped illustration leaves the subtopic in place with a warning', () => {
    const raw = clone(fixture);
    raw.domains[1].topics[0].subtopics[0].illustration.svg = '<svg><broken';
    const r = buildNotesPack(raw);
    expect(r.problems).toEqual([]);
    expect(r.warnings[0]).toMatch(/^1A1\.1: illustration dropped/);
    expect(sub(r.pack, '1A1.1').illustrations).toBeUndefined();
  });
  it('a list of drawings keeps the good ones and drops only the bad one', () => {
    const raw = clone(fixture);
    const one = raw.domains[1].topics[0].subtopics[0].illustration;
    (raw.domains[1].topics[0].subtopics[0] as Record<string, unknown>).illustration = [one, { svg: '<svg/>' }, one];
    const r = buildNotesPack(raw);
    expect(r.warnings).toEqual([expect.stringMatching(/^1A1\.1: illustration 2 dropped/)]);
    expect(sub(r.pack, '1A1.1').illustrations).toHaveLength(2);
  });
});

describe('the generated notes pack matches the source file', () => {
  it('src/content/generated/cisa/notes.json is what the pipeline makes from ../data/cisa_notes.json', () => {
    const src = path.join(__dirname, '..', '..', '..', 'data', 'cisa_notes.json');
    const raw = fs.existsSync(src) ? JSON.parse(fs.readFileSync(src, 'utf8')) : null;
    const expected = buildNotesPack(raw).pack;
    expect(generatedNotes.cisa()).toEqual(expected);
    // While the source is v1 the pack is empty; once v2 lands it must build cleanly.
    if (raw?.schema_version === 2) expect(buildNotesPack(raw).problems).toEqual([]);
    else expect(expected.domains).toEqual([]);
  });
});

describe('notes search', () => {
  const { pack } = built();
  it('ignores queries under 2 characters and an empty pack', () => {
    expect(searchNotes(pack, 'r')).toEqual([]);
    expect(searchNotes(null, 'rpo')).toEqual([]);
  });
  it('finds a title match first', () => {
    const hits = searchNotes(pack, 'recovery objectives');
    expect(hits[0].subtopic.id).toBe('4B1.2');
    expect(hits[0].field).toBe('name');
  });
  it('finds key terms and body text, case and punctuation blind', () => {
    expect(searchNotes(pack, 'REPLICATION')[0]).toMatchObject({ field: 'term', subtopic: { id: '4B1.2' } });
    const term = searchNotes(pack, 'due professional care');
    expect(term[0].subtopic.id).toBe('1A1.1');
    expect(term[0].field).toBe('term');
    expect(term[0].snippet).toMatch(/^Due professional care: /);
    const body = searchNotes(pack, "payroll audit");
    expect(body.map((h) => h.subtopic.id)).toEqual(['1A1.1']);
    expect(body[0].field).toBe('body');
    expect(body[0].snippet.toLowerCase()).toContain('payroll audit');
  });
  it('needs every word to match', () => {
    expect(searchNotes(pack, 'hot site payroll')).toEqual([]);
  });
  it('matches the start of words only, and ranks the exact phrase first', () => {
    // "ecovery" is inside "recovery" but starts no word.
    expect(searchNotes(pack, 'ecovery')).toEqual([]);
    expect(searchNotes(pack, 'recov')[0].subtopic.id).toBe('4B1.2');
    const hot = searchNotes(pack, 'hot site');
    expect(hot[0].subtopic.id).toBe('4B1.2');
    expect(hot[0].snippet.toLowerCase()).toContain('hot site');
  });
  it('helpers: normalize, snippet, read count', () => {
    expect(normalize("RTO's  Café!")).toBe('rto s cafe');
    expect(snippetAround('short text', 'text')).toBe('short text');
    const long = `${'a '.repeat(80)}needle ${'b '.repeat(80)}`;
    const snip = snippetAround(long, 'needle');
    expect(snip).toMatch(/^…a .*needle.* b…$/); // cut between words, never inside one
    expect(snippetAround(`${'word '.repeat(40)}target end`, 'target')).toMatch(/target end$/);
    expect(readCount(['1', '2', '3'], ['2', '3', 'x'])).toBe(2);
  });
});
