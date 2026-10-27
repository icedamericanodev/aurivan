/**
 * Content packs, Phase A: the pack registry (content/packs/).
 *
 * - Every loader reads through the registry; the bundled pack is the default.
 * - A second source (Phase C: downloaded packs; here a fake) wins only with a
 *   NEWER rev (the bundle is the floor) and a schemaVersion this app reads.
 * - clearContentCaches() empties every content cache, lib/ indexes included.
 * - Retired items: left out of every pool and queue, still found by id.
 * - The build: games copied byte for byte, the bundle's rev and schema
 *   recorded, and lessons-pack.cjs checks and tidies the lessons.
 */
import fs from 'fs';
import path from 'path';
import { getRoleDeck, getStepSequences } from '../content/games';
import { generatedInfo, generatedLessons } from '../content/generated';
import { findLesson, lessonsFor, lessonsIncludingRetired, nextLesson } from '../content/lessons';
import type { Lesson } from '../content/lessons/types';
import { findQuestion, getAllQuestions, getAllQuestionsIncludingRetired, getDomainQuestions, hasContent } from '../content/loader';
import { getNotes } from '../content/notes';
import {
  BundledSource,
  clearContentCaches,
  installedCertIds,
  PACK_SCHEMA_VERSION,
  packInfo,
  packInstalled,
  registerPackSource,
  sourceFor,
  type PackSource,
} from '../content/packs';
import type { PackQuestion } from '../content/types';
import { knownIds } from '../lib/backup';
import { questionExists } from '../lib/outline';

// lib/backup (known ids) and lib/outline load the stores, which need storage.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/* eslint-disable @typescript-eslint/no-require-imports */
const { buildLessonsPack, SCENE_TYPES } = require('../../scripts/lessons-pack.cjs');
/* eslint-enable @typescript-eslint/no-require-imports */

const MOBILE = path.join(__dirname, '..', '..');
const REPO = path.join(MOBILE, '..');

const q = (id: string, extra: Partial<PackQuestion> = {}): PackQuestion => ({
  id,
  certId: 'zz9',
  domainId: '1',
  subtopic: 'General',
  difficulty: 'application',
  stem: `Question ${id}?`,
  options: { A: 'a', B: 'b', C: 'c', D: 'd' },
  correct: 'B',
  explanation: '',
  wrongExplanations: {},
  tips: ['x', 'y', 'z'],
  related: [],
  ...extra,
});
const lesson = (id: string, order: number, extra: Partial<Lesson> = {}): Lesson => ({
  id,
  certId: 'zz9',
  domainId: '1',
  order,
  title: `Lesson ${id}`,
  minutes: 3,
  provenance: 'Original KaiSip content.',
  references: ['A public framework'],
  outlineVersion: 'test',
  lastReviewed: '2026-10-27',
  scenes: [
    { type: 'title', kicker: 'k', title: 't', subtitle: 's' },
    { type: 'flow', heading: 'The steps', steps: [{ label: 'One', note: '' }, { label: 'Two', note: '' }, { label: 'Three', note: '' }, { label: 'Four', note: '' }] },
    { type: 'check', question: 'q?', options: ['a', 'b'], correctIndex: 0, explanation: 'e' },
  ],
  ...extra,
});

/** A fake source with one cert, as a downloaded pack would be (Phase C). */
function fakeSource(certId: string, rev: number, opts: { schemaVersion?: number; questions?: PackQuestion[]; lessons?: Lesson[]; decks?: Record<string, unknown> } = {}): PackSource {
  const questions = opts.questions ?? [q(`${certId}_001`, { certId })];
  return {
    name: `fake-${certId}-${rev}`,
    certIds: () => [certId],
    info: (id) => (id === certId ? { certId, rev, schemaVersion: opts.schemaVersion ?? 1 } : null),
    domainIds: (id) => (id === certId ? [...new Set(questions.map((x) => x.domainId))] : []),
    questions: (id, d) => (id === certId ? questions.filter((x) => x.domainId === d) : null),
    notes: () => null,
    principles: () => null,
    exam: () => null,
    lessons: (id) => (id === certId ? (opts.lessons ?? []) : null),
    gameDeck: (id, kind) => (id === certId ? (opts.decks?.[kind] ?? null) : null),
  };
}

let undo: (() => void) | undefined;
afterEach(() => {
  undo?.();
  undo = undefined;
  clearContentCaches();
});

describe('the bundled source', () => {
  it('is what every cert reads by default, and only CISA has a pack today', () => {
    expect(sourceFor('cisa')).toBe(BundledSource);
    expect(sourceFor('cism')).toBe(BundledSource); // no pack anywhere: still the bundle, which says "nothing"
    expect(installedCertIds()).toEqual(['cisa']);
    expect(packInstalled('cisa')).toBe(true);
    expect(packInstalled('cism')).toBe(false);
    expect(hasContent('cism')).toBe(false);
    expect(getAllQuestions('cism')).toEqual([]);
    expect(lessonsFor('cism')).toEqual([]);
  });

  it('records CISA’s rev and schemaVersion (the floor a download must beat)', () => {
    const info = packInfo('cisa')!;
    expect(info.certId).toBe('cisa');
    expect(info.schemaVersion).toBe(PACK_SCHEMA_VERSION);
    expect(Number.isInteger(info.rev)).toBe(true);
    expect(info.rev).toBeGreaterThanOrEqual(0);
    // The same facts sit beside the pack's files (for Phase B, the pack builder).
    const onDisk = JSON.parse(fs.readFileSync(path.join(MOBILE, 'src/content/generated/cisa/pack.json'), 'utf8'));
    expect(onDisk).toEqual(generatedInfo.cisa);
    expect(onDisk).toEqual(info);
  });
});

describe('a second source', () => {
  it('wins with a newer rev, and every loader follows it', () => {
    const rev = packInfo('cisa')!.rev + 1;
    const mine = [q('cisa_x1', { certId: 'cisa' }), q('cisa_x2', { certId: 'cisa', domainId: '2' })];
    const fake = fakeSource('cisa', rev, { questions: mine, lessons: [lesson('cisa-l-fake', 1, { certId: 'cisa' })] });
    // Warm every cache first: registering must clear them.
    expect(getAllQuestions('cisa').length).toBeGreaterThan(1000);
    expect(findLesson('cisa-l-d1-charter')).toBeDefined();
    undo = registerPackSource(fake);
    expect(sourceFor('cisa')).toBe(fake);
    expect(getAllQuestions('cisa').map((x) => x.id)).toEqual(['cisa_x1', 'cisa_x2']);
    expect(getDomainQuestions('cisa', '2').map((x) => x.id)).toEqual(['cisa_x2']);
    expect(findQuestion('cisa', 'cisa_x2')?.domainId).toBe('2');
    expect(findQuestion('cisa', 'd1_001')).toBeUndefined();
    expect(lessonsFor('cisa').map((l) => l.id)).toEqual(['cisa-l-fake']);
    expect(findLesson('cisa-l-d1-charter')).toBeUndefined();
    expect(getNotes('cisa')).toBeNull(); // the fake has no notes
    // Removing it brings the bundle back.
    undo();
    undo = undefined;
    expect(sourceFor('cisa')).toBe(BundledSource);
    expect(findQuestion('cisa', 'd1_001')).toBeDefined();
    expect(findLesson('cisa-l-d1-charter')).toBeDefined();
  });

  it('never wins with the same or an older rev: the bundle is the floor', () => {
    const rev = packInfo('cisa')!.rev;
    undo = registerPackSource(fakeSource('cisa', rev));
    expect(sourceFor('cisa')).toBe(BundledSource);
    undo();
    undo = registerPackSource(fakeSource('cisa', rev - 1));
    expect(sourceFor('cisa')).toBe(BundledSource);
  });

  it('is ignored when written in a newer pack format than this app reads', () => {
    undo = registerPackSource(fakeSource('cisa', packInfo('cisa')!.rev + 100, { schemaVersion: PACK_SCHEMA_VERSION + 1 }));
    expect(sourceFor('cisa')).toBe(BundledSource);
    undo();
    undo = registerPackSource(fakeSource('zz9', 5, { schemaVersion: PACK_SCHEMA_VERSION + 1 }));
    expect(packInstalled('zz9')).toBe(false);
    expect(installedCertIds()).toEqual(['cisa']);
  });

  it('can bring an exam the app has no descriptor for, and its lessons resolve by id', () => {
    undo = registerPackSource(fakeSource('zz9', 5, { lessons: [lesson('zz9-l-1', 1)] }));
    expect(installedCertIds()).toEqual(['cisa', 'zz9']);
    expect(hasContent('zz9')).toBe(true);
    expect(getAllQuestions('zz9').map((x) => x.id)).toEqual(['zz9_001']);
    expect(findLesson('zz9-l-1')?.certId).toBe('zz9');
    expect(findLesson('cisa-l-d1-charter')?.certId).toBe('cisa');
  });
});

describe('clearContentCaches', () => {
  it('empties the derived indexes in lib/ too (a backup’s known ids)', () => {
    expect(knownIds('zz9').questions.size).toBe(0);
    undo = registerPackSource(fakeSource('zz9', 5));
    expect([...knownIds('zz9').questions]).toEqual(['zz9_001']);
  });
});

describe('retired items (content packs)', () => {
  const questions = [q('zz9_001'), q('zz9_002', { retired: true }), q('zz9_003')];
  const lessons = [lesson('zz9-l-1', 1, { retired: true }), lesson('zz9-l-2', 2)];
  const decks = {
    roles: {
      version: 1,
      roles: [{ id: 'owner', label: 'Owner' }],
      cards: [
        { id: 'r1', decision: 'Live card', role: 'owner', why: 'w', subtopicId: '1A1.1', tier: 'seedling' },
        { id: 'r2', decision: 'Retired card', role: 'owner', why: 'w', subtopicId: '1A1.1', tier: 'seedling', retired: true },
      ],
    },
    sequences: {
      version: 1,
      sequences: [
        { id: 's1', title: 'Live', steps: [{ label: 'a', note: '' }], caption: '', subtopicId: '1A1.1', tier: 'seedling' },
        { id: 's2', title: 'Retired', steps: [{ label: 'a', note: '' }], caption: '', subtopicId: '1A1.1', tier: 'seedling', retired: true },
      ],
    },
    flows: {
      version: 1,
      flows: [
        { lessonId: 'zz9-l-1', flowTitle: 'f', heading: 'The steps', ordered: true, orderedAsShipped: true },
        { lessonId: 'zz9-l-2', flowTitle: 'f', heading: 'The steps', ordered: true, orderedAsShipped: true },
      ],
    },
  };
  beforeEach(() => {
    undo = registerPackSource(fakeSource('zz9', 5, { questions, lessons, decks }));
  });

  it('a retired question is never dealt (practice, mock, Smart, games, the bank list)…', () => {
    expect(getAllQuestions('zz9').map((x) => x.id)).toEqual(['zz9_001', 'zz9_003']);
    expect(getDomainQuestions('zz9', '1').map((x) => x.id)).toEqual(['zz9_001', 'zz9_003']);
  });

  it('…but still resolves for reviews, the mistake journal and bookmarks, and its progress is kept', () => {
    expect(findQuestion('zz9', 'zz9_002')?.stem).toBe('Question zz9_002?');
    expect(questionExists('zz9')('zz9_002')).toBe(true); // a due review still counts and opens
    expect(getAllQuestionsIncludingRetired('zz9').map((x) => x.id)).toEqual(['zz9_001', 'zz9_002', 'zz9_003']);
    expect(knownIds('zz9').questions.has('zz9_002')).toBe(true); // a restore keeps its answers
  });

  it('a retired lesson is never offered, but a done list and old links still resolve', () => {
    expect(lessonsFor('zz9').map((l) => l.id)).toEqual(['zz9-l-2']);
    expect(nextLesson('zz9', [])?.id).toBe('zz9-l-2');
    expect(findLesson('zz9-l-1')?.retired).toBe(true);
    expect(lessonsIncludingRetired('zz9').map((l) => l.id)).toEqual(['zz9-l-1', 'zz9-l-2']);
    expect(knownIds('zz9').lessons.has('zz9-l-1')).toBe(true);
  });

  it('games never deal a retired card, sequence, or a retired lesson’s flow', () => {
    expect(getRoleDeck('zz9')!.cards.map((c) => c.id)).toEqual(['r1']);
    expect(getStepSequences('zz9').map((s) => s.id)).toEqual(['s1', 'zz9-l-2']);
  });

  it('nothing in the shipped CISA pack is retired yet', () => {
    undo?.();
    undo = undefined;
    expect(getAllQuestions('cisa')).toHaveLength(getAllQuestionsIncludingRetired('cisa').length);
    expect(lessonsFor('cisa')).toHaveLength(lessonsIncludingRetired('cisa').length);
  });
});

describe('the build', () => {
  it('copies each game deck into the CISA pack byte for byte', () => {
    for (const deck of ['roles', 'sequences', 'flows']) {
      const reviewed = fs.readFileSync(path.join(MOBILE, 'src/content/games/cisa', `${deck}.json`));
      const copied = fs.readFileSync(path.join(MOBILE, 'src/content/generated/cisa', `${deck}.json`));
      expect(copied.equals(reviewed)).toBe(true);
    }
    expect(getRoleDeck('cisa')!.cards.length).toBeGreaterThan(10);
  });

  it('the lessons pack is the data file without its author notes', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(REPO, 'data/lessons/cisa.json'), 'utf8'));
    const { pack, problems } = buildLessonsPack(raw, 'cisa', { domains: ['1', '2', '3', '4', '5'], questions: getAllQuestions('cisa') });
    expect(problems).toEqual([]);
    expect(pack).toEqual(generatedLessons.cisa());
    expect(JSON.stringify(raw)).toContain('"_comment"'); // the history is kept in the source…
    expect(JSON.stringify(pack)).not.toContain('"_comment"'); // …and never shipped
  });
});

describe('lessons-pack.cjs', () => {
  const file = (lessons: unknown[]) => ({ schema_version: 1, certification: 'zz9', lessons });
  const build = (lessons: unknown[], opts = {}) => buildLessonsPack(file(lessons), 'zz9', { domains: ['1', '2'], ...opts });

  it('a missing file or another schema version gives an empty pack, not a failed build', () => {
    expect(buildLessonsPack(null, 'zz9')).toMatchObject({ pack: [], problems: [], skipped: 'no' });
    expect(buildLessonsPack({ schema_version: 2, lessons: [lesson('a', 1)] }, 'zz9')).toMatchObject({ pack: [], problems: [] });
  });

  it('keeps ids, scene order and fields; drops "_" author notes at any depth', () => {
    const l = { _comment: 'why', ...lesson('zz9-l-1', 1), scenes: [{ _comment: 'scene why', ...lesson('x', 1).scenes[0] }, ...lesson('x', 1).scenes.slice(1)] };
    const { pack, problems } = build([l]);
    expect(problems).toEqual([]);
    expect(pack).toEqual([lesson('zz9-l-1', 1)]);
  });

  it('refuses what would break a lesson', () => {
    const problems = (lessons: unknown[], opts = {}) => build(lessons, opts).problems.join(' | ');
    expect(problems([lesson('zz9-l-1', 1), lesson('zz9-l-1', 2)])).toMatch(/appears twice/);
    expect(problems([lesson('Bad Id', 1)])).toMatch(/lower-case/);
    expect(problems([lesson('zz9-l-1', 1), lesson('zz9-l-2', 3)])).toMatch(/run 1, 2, 3/);
    expect(problems([lesson('zz9-l-1', 1, { domainId: '9' })])).toMatch(/unknown domainId/);
    expect(problems([lesson('zz9-l-1', 1, { certId: 'other' })])).toMatch(/certId/);
    expect(problems([{ ...lesson('zz9-l-1', 1), scenes: [{ type: 'video', url: 'x' }] }])).toMatch(/unknown type "video"/);
    expect(problems([{ ...lesson('zz9-l-1', 1), scenes: [{ type: 'check', question: 'q', options: ['a', 'b'], correctIndex: 2, explanation: 'e' }] }])).toMatch(/missing a field/);
    expect(problems([lesson('zz9-l-1', 1, { prepares: ['nope_1'] })], { questions: [{ id: 'zz9_001' }] })).toMatch(/not a question/);
    expect(problems([lesson('zz9-l-1', 1, { notes: ['9Z9.9'] })], { noteIds: new Set(['1A1.1']) })).toMatch(/not in the zz9 notes/);
    expect(problems([{ ...lesson('zz9-l-1', 1), retired: 'yes' }])).toMatch(/retired flag/);
  });

  it('knows every scene type the app draws (and only those)', () => {
    expect([...SCENE_TYPES].sort()).toEqual(['analogy', 'check', 'compare', 'flow', 'idea', 'stack', 'tip', 'title', 'trap']);
  });
});
