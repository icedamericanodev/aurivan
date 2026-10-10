/**
 * Field Guide (games review §3.4): terms from the notes' key terms and the
 * domains' key terms, the leak filter, the three levels, scoring and cards.
 */
import { getNotes } from '../content/notes';
import type { NotesPack } from '../content/notes/types';
import {
  acronymOf,
  BOARD_SIZE,
  buildFieldRound,
  FIELD_BOARDS,
  FIELD_MIN_POOL,
  fieldScore,
  fieldTerms,
  headWord,
  itemSpoken,
  leaks,
  RECALL_CHOICES,
  termsFromNotes,
} from '../engine/games/fieldGuide';
import { GAMES, isPlayable } from '../engine/games/registry';
import { textHash } from '../engine/games/rootOrRumor';
import { createRng } from '../engine/random';

const notes = getNotes('cisa')!;
const all = fieldTerms(notes);
const T0 = Date.UTC(2026, 9, 12);

describe('the leak filter', () => {
  it('finds the head word (no brackets) and the acronym', () => {
    expect(headWord('Recovery point objective (RPO)')).toBe('objective');
    expect(headWord('Immutable backup')).toBe('backup');
    expect(headWord('Chief audit executive (CAE)')).toBe('executive');
    expect(acronymOf('Recovery point objective (RPO)')).toBe('RPO');
    expect(acronymOf('Snapshot')).toBeNull();
  });

  it('drops a definition that repeats the head word or a form of it', () => {
    expect(leaks('Immutable backup', 'A backup copy that cannot be changed.')).toBe(true);
    expect(leaks('Continuous audit', 'Auditing that runs alongside the process.')).toBe(true);
    expect(leaks('Change controls', 'The control over every change.')).toBe(true);
    expect(leaks('Recovery point objective (RPO)', 'The RPO sets how much data may be lost.')).toBe(true);
    expect(leaks('Snapshot', 'A point-in-time image allowing fast rollback.')).toBe(false);
    expect(leaks('Annualized loss expectancy (ALE)', 'The expected yearly loss: SLE times ARO.')).toBe(false);
  });

  it('no playable term leaks, on the real notes', () => {
    expect(all.length).toBeGreaterThan(FIELD_MIN_POOL);
    for (const t of all) expect(leaks(t.term, t.definition)).toBe(false);
  });
});

describe('the term pool', () => {
  it('takes subtopic AND domain key terms, each with a stable card id', () => {
    expect(all.some((t) => t.id.startsWith('kt:D'))).toBe(true);
    const sub = all.find((t) => t.subtopicId)!;
    expect(sub.id.startsWith(`kt:${sub.subtopicId}:`)).toBe(true);
    expect(termsFromNotes(notes).map((t) => t.id)).toEqual(all.map((t) => t.id));
  });

  it('keeps a term repeated across notes once, and never two terms for one definition', () => {
    const lower = all.map((t) => t.term.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
    const defs = all.map((t) => t.definition.toLowerCase());
    expect(new Set(defs).size).toBe(defs.length);
    const pack: NotesPack = {
      ...notes,
      domains: [
        {
          ...notes.domains[0],
          topics: [
            {
              ...notes.domains[0].topics[0],
              subtopics: notes.domains[0].topics[0].subtopics.slice(0, 2).map((s) => ({ ...s, keyTerms: [{ term: 'Walkthrough', definition: 'Following one transaction end to end.' }] })),
            },
          ],
          keyTerms: [{ term: 'walkthrough', definition: 'Following one item from start to finish.' }],
        },
      ],
    };
    expect(termsFromNotes(pack).map((t) => t.term)).toEqual(['Walkthrough']);
  });

  it('a term with and without its bracketed abbreviation is one term; card ids hash the full term', () => {
    const pack: NotesPack = {
      ...notes,
      domains: [
        {
          ...notes.domains[0],
          topics: [
            {
              ...notes.domains[0].topics[0],
              subtopics: notes.domains[0].topics[0].subtopics.slice(0, 1).map((s) => ({
                ...s,
                keyTerms: [
                  { term: 'Segregation of duties (SoD)', definition: 'Splitting a task so no one person controls it end to end.' },
                  { term: 'Segregation of duties', definition: 'No single person can both make and approve a change.' },
                ],
              })),
            },
          ],
          keyTerms: [],
        },
      ],
    };
    const got = termsFromNotes(pack);
    expect(got.map((t) => t.term)).toEqual(['Segregation of duties (SoD)']);
    expect(got[0].id).toBe(`kt:${notes.domains[0].topics[0].subtopics[0].id}:${textHash('segregation of duties (sod)')}`);
  });

  it('the registry offers it from the notes pool, never without notes', () => {
    expect(GAMES.field.name).toBe('Field Guide');
    expect(GAMES.field.tagline).toBe('Match each term to what it means.');
    expect(isPlayable('field', [], notes)).toBe(true);
    expect(isPlayable('field', [], null)).toBe(false);
  });
});

describe('rounds', () => {
  it('Seedling: 3 boards of 4 terms, each from a different topic', () => {
    const r = buildFieldRound(all, undefined, 'seedling', createRng(1), T0);
    expect(r).toHaveLength(FIELD_BOARDS);
    for (const b of r) {
      expect(b.terms).toHaveLength(BOARD_SIZE);
      expect(new Set(b.terms.map((t) => t.topicId)).size).toBe(BOARD_SIZE);
      expect([...b.defOrder].sort()).toEqual([0, 1, 2, 3]);
      expect(b.choices).toBeUndefined();
    }
    const ids = r.flatMap((b) => b.terms.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Sapling: each board is one topic (near neighbours), boards from different domains', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const r = buildFieldRound(all, undefined, 'sapling', createRng(seed), T0);
      expect(r).toHaveLength(FIELD_BOARDS);
      for (const b of r) expect(new Set(b.terms.map((t) => t.topicId)).size).toBe(1);
      expect(new Set(r.map((b) => b.terms[0].domainId)).size).toBe(FIELD_BOARDS);
    }
  });

  it('Heartwood: each term is recalled from 6 choices that include it, no repeats', () => {
    const r = buildFieldRound(all, undefined, 'heartwood', createRng(3), T0);
    for (const b of r) {
      expect(b.choices).toHaveLength(BOARD_SIZE);
      b.terms.forEach((t, k) => {
        const ch = b.choices![k];
        expect(ch).toHaveLength(RECALL_CHOICES);
        expect(ch.map((x) => x.id)).toContain(t.id);
        expect(new Set(ch.map((x) => x.id)).size).toBe(RECALL_CHOICES);
      });
    }
  });

  it('a missed term that is due comes back in the next round', () => {
    const missed = all[40];
    const cards = { [missed.id]: { box: 1, dueAt: T0 - 1, lastSeen: T0 - 1, reps: 1 } };
    for (const tier of ['seedling', 'sapling', 'heartwood'] as const) {
      const r = buildFieldRound(all, cards, tier, createRng(9), T0);
      expect(r.flatMap((b) => b.terms.map((t) => t.id))).toContain(missed.id);
    }
  });

  it('scores first-try pairs only, and speaks each item with its place and state', () => {
    expect(fieldScore([true, false, true, true])).toBe(3);
    expect(itemSpoken('Term', 1, 4, 'Snapshot', {})).toBe('Term 2 of 4: Snapshot');
    expect(itemSpoken('Meaning', 0, 4, 'A copy.', { matched: true })).toBe('Meaning 1 of 4: A copy., matched');
  });
});
