/**
 * Mobile 1.47, home-screen widgets: the words that come from content.
 *
 * - Today's rule: every principle has a prompt in an exam question's voice
 *   (one situation, one question; prompt ≤110 characters, short form ≤50),
 *   with no acronyms and no answer given away.
 * - Topic names are short and plain (no "IS"), and a plan item's name never
 *   uses an unexplained abbreviation.
 * - Quick question: only stems that fit a home screen, keep their priority
 *   word, and spell out "IS" once.
 */
import { getAllQuestions } from '../content/loader';
import { getPrinciples } from '../content/principles';
import { RULE_PROMPTS } from '../content/principles/widgetPrompts';
import { sharedWord } from '../engine/widgets';
import { itemName, QUIZ_STEM_MAX, quizFit, spellOutIs, topicName, WIDGET_TOPICS } from '../lib/widgetData';

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
  });
});

describe('Quick question stems', () => {
  it('spells out "IS" once', () => {
    expect(spellOutIs('An IS auditor finds that IS staff…')).toBe('An information systems (IS) auditor finds that IS staff…');
  });

  it('only short stems with a priority word and no undecoded acronym', () => {
    expect(quizFit({ stem: 'Which is the BEST basis for recovery tiers?' })).toBe(true);
    expect(quizFit({ stem: 'Which is the basis for recovery tiers?' })).toBe(false);
    expect(quizFit({ stem: 'Which is the BEST basis for BIA tiers?' })).toBe(false);
    expect(quizFit({ stem: 'Which is BEST?', scenario: 'A long case' })).toBe(false);
    expect(quizFit({ stem: `Which is BEST ${'x'.repeat(QUIZ_STEM_MAX)}?` })).toBe(false);
  });

  it('the bank has plenty that fit', () => {
    expect(getAllQuestions('cisa').filter(quizFit).length).toBeGreaterThan(30);
  });
});
