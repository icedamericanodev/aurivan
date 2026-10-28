/**
 * Mobile 1.47, home-screen widgets: the words that come from content.
 *
 * - Today's rule: every principle has a prompt in an exam question's voice
 *   (one situation, one question; prompt ≤110 characters, short form ≤50),
 *   with no acronyms and no answer given away.
 * - Topic names are short and plain (no "IS"), and a plan item's name never
 *   uses an unexplained abbreviation.
 * - Recall card (1.48): only questions whose stem, correct answer and Exam
 *   cue fit a home screen, and whose answer stands on its own.
 * - Key term (1.48): the notes' glossary as a small bundled file, each term
 *   with a one-line meaning and a study note that exists.
 */
import { getAllQuestions } from '../content/loader';
import { getPrinciples } from '../content/principles';
import { RULE_PROMPTS } from '../content/principles/widgetPrompts';
import { LINK_ID, NOTE_ID, sharedWord } from '../engine/widgets';
import { findNote, noteDomain } from '../content/notes';
import { getTerms } from '../content/terms';
import { examCue, itemName, RECALL_FIT, recallFit, spellOutIs, topicName, WIDGET_TOPICS } from '../lib/widgetData';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildTermsPack, splitTerm, MEANING_MAX } = require('../../scripts/terms-pack.cjs') as {
  buildTermsPack: (n: unknown, c: string) => { domains: Record<string, { id: string; term: string; short?: string; meaning: string; note: string }[]> };
  splitTerm: (t: string) => { term: string; short: string };
  MEANING_MAX: number;
};

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

describe('Today’s rule prompts', () => {
  const pack = getPrinciples('cisa')!;
  it('every principle has one, and there are no strays', () => {
    expect(pack.principles.length).toBeGreaterThan(0);
    for (const p of pack.principles) expect(RULE_PROMPTS[p.id]).toBeDefined();
    for (const id of Object.keys(RULE_PROMPTS)) expect(pack.principles.some((p) => p.id === id)).toBe(true);
  });

  it('one question each, in plain words, sized for a widget', () => {
    for (const [id, r] of Object.entries(RULE_PROMPTS)) {
      expect({ id, len: r.ask.length <= 110 }).toEqual({ id, len: true });
      expect({ id, len: r.short.length <= 50 }).toEqual({ id, len: true });
      expect(r.ask.trim().endsWith('?')).toBe(true);
      expect(r.short.trim().endsWith('?')).toBe(true);
      expect((r.ask.match(/\?/g) ?? []).length).toBe(1);
      // No acronyms a glance can't decode (priority words in capitals are fine).
      const caps = (r.ask.match(/\b[A-Z]{2,}\b/g) ?? []).filter((w) => !/^(BEST|FIRST|MOST|LEAST|PRIMARY|GREATEST|MAIN|NOT)$/.test(w));
      expect({ id, caps }).toEqual({ id, caps: [] });
      // The prompt never gives away the rule's own title.
      const title = pack.principles.find((p) => p.id === id)!.title.toLowerCase();
      expect(r.ask.toLowerCase()).not.toContain(title);
      expect(r.ask).not.toMatch(/say it in your head|think first/i);
      // The short form names the same situation (a shared word keeps the face's key on every size).
      expect({ id, shared: sharedWord(r.ask, r.short).length > 0 }).toEqual({ id, shared: true });
    }
  });
});

describe('plain topic names', () => {
  it('about 12 characters, no "IS" abbreviation', () => {
    for (const name of Object.values(WIDGET_TOPICS.cisa)) {
      expect(name.length).toBeLessThanOrEqual(13);
      expect(name).not.toMatch(/\bIS\b|\bBIA\b/);
    }
    expect(topicName('cisa', '4')).toBe('Operations');
    expect(topicName('cisa', undefined)).toBe('');
  });

  it('plan items in plain words ("Questions to revisit", not "Reviews")', () => {
    expect(itemName('cisa', { kind: 'review', count: 6 } as never)).toEqual({ title: 'Questions to revisit', short: 'Revisit' });
    expect(itemName('cisa', { kind: 'practice', domainId: '5', count: 10 } as never).title).toBe('Security');
    // A lesson's short name is never cut mid-word ("New systems less").
    for (const id of ['1', '2', '3', '4', '5']) {
      const short = topicName('cisa', id);
      const lessonShort = `${short} lesson`.length <= 16 ? `${short} lesson` : short;
      expect(lessonShort).not.toMatch(/ les$| less$/);
    }
  });
});

describe('the rule texts', () => {
  it('spells out "IS" once', () => {
    expect(spellOutIs('An IS auditor finds that IS staff…')).toBe('An information systems (IS) auditor finds that IS staff…');
  });
});

describe('Recall card questions', () => {
  const q = (over: Record<string, unknown> = {}) => ({ stem: 'Which basis is BEST for recovery tiers?', options: { A: 'Cost', B: 'The business impact analysis' }, correct: 'B', tips: ['Eliminate: x', 'Final two: y', 'Exam cue: impact first.'], ...over });

  it('the Exam cue tip, without its label', () => {
    expect(examCue(['Eliminate: a', 'Exam cue: pick the reason.'])).toBe('pick the reason.');
    expect(examCue(['Eliminate: a'])).toBe('');
  });

  it('only a stem, answer and cue that fit, and an answer that stands on its own', () => {
    expect(recallFit(q())).toBe(true);
    expect(recallFit(q({ scenario: 'A long case' }))).toBe(false);
    expect(recallFit(q({ retired: true }))).toBe(false);
    expect(recallFit(q({ tips: ['Eliminate: x'] }))).toBe(false);
    expect(recallFit(q({ stem: 'x'.repeat(RECALL_FIT.stem + 1) }))).toBe(false);
    expect(recallFit(q({ options: { A: 'Cost', B: 'All of the above' } }))).toBe(false);
    expect(recallFit(q({ options: { A: 'Cost', B: 'Both A and C' } }))).toBe(false);
    expect(recallFit(q({ tips: ['Exam cue: option B wins.'] }))).toBe(false);
    expect(recallFit(q({ options: { A: 'Cost', B: 'Pick {{A}}' } }))).toBe(false);
  });

  it('the bank has plenty that fit (a learner meets many of them)', () => {
    const all = getAllQuestions('cisa');
    const fit = all.filter(recallFit);
    expect(fit.length).toBeGreaterThan(300);
    for (const x of fit) {
      expect(x.options[x.correct]?.length).toBeLessThanOrEqual(RECALL_FIT.answer);
      expect(examCue(x.tips).length).toBeLessThanOrEqual(RECALL_FIT.cue);
    }
  });
});

describe('Key terms (the notes’ glossary, bundled small)', () => {
  it('splits a term from its abbreviation either way round', () => {
    expect(splitTerm('Recovery point objective (RPO)')).toEqual({ term: 'Recovery point objective', short: 'RPO' });
    expect(splitTerm('ITAF (IT Audit Framework)')).toEqual({ term: 'IT Audit Framework', short: 'ITAF' });
    expect(splitTerm('Screened subnet (demilitarized zone, DMZ)')).toEqual({ term: 'Screened subnet (demilitarized zone, DMZ)', short: '' });
    expect(splitTerm('Redundancy')).toEqual({ term: 'Redundancy', short: '' });
  });

  it('every domain has terms; each a plain id, a one-line meaning, and a note that exists', () => {
    const pack = getTerms('cisa')!;
    for (const d of ['1', '2', '3', '4', '5']) {
      const list = pack.domains[d];
      expect(list.length).toBeGreaterThan(15);
      for (const t of list) {
        expect(t.id).toMatch(LINK_ID);
        expect(t.note).toMatch(NOTE_ID);
        expect(t.meaning.length).toBeLessThanOrEqual(MEANING_MAX);
        expect(Boolean(findNote('cisa', t.note)) || Boolean(noteDomain('cisa', t.note))).toBe(true);
      }
    }
  });

  it('is small: a few kilobytes, so the widget data never parses the whole notes pack', () => {
    expect(JSON.stringify(getTerms('cisa')).length).toBeLessThan(40_000);
  });

  it('builds safely from an empty or odd notes pack', () => {
    expect(buildTermsPack(null, 'x')).toEqual({ certId: 'x', domains: {} });
    expect(buildTermsPack({ domains: [{ id: '1', topics: [], keyTerms: [{ term: 'X', definition: 'y'.repeat(MEANING_MAX + 1) }] }] }, 'x').domains).toEqual({});
  });
});
