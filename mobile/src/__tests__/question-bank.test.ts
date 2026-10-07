/**
 * Question bank browse logic (engine/bank.ts).
 *
 * The most important test here is the PRODUCT RULE one: no summary string
 * the screens render may contain the size of the bank or of a domain.
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions, getDomainQuestions } from '../content/loader';
import type { PackQuestion } from '../content/types';
import {
  buildBankList,
  emptyCopy,
  firstLine,
  learnerCounts,
  listedIds,
  matchesFilter,
  practiseSet,
  PRACTISE_CAP,
  progressSummary,
  questionStatus,
  topicSummary,
  youveSummary,
  type BankFilter,
} from '../engine/bank';
import { createRng } from '../engine/random';
import type { AnswerRecord } from '../engine/readiness';
import { shortSubtopic } from '../lib/format';

const rec = (lastCorrect: boolean): AnswerRecord => ({ attempts: 1, correctCount: lastCorrect ? 1 : 0, lastCorrect, lastAt: 1 });

function q(id: string, subtopic: string, stem = `Stem of ${id}`): PackQuestion {
  return {
    id,
    certId: 'cisa',
    domainId: '1',
    subtopic,
    difficulty: 'analysis',
    stem,
    options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    correct: 'B',
    explanation: '',
    wrongExplanations: {},
    tips: [],
    related: [],
  };
}

describe('question status', () => {
  it('is new until answered, then follows the LAST answer', () => {
    expect(questionStatus('x', {})).toBe('new');
    expect(questionStatus('x', { x: rec(true) })).toBe('correct');
    expect(questionStatus('x', { x: rec(false) })).toBe('missed');
  });

  it('filters by chip', () => {
    expect(matchesFilter('new', false, 'all')).toBe(true);
    expect(matchesFilter('new', false, 'new')).toBe(true);
    expect(matchesFilter('correct', false, 'new')).toBe(false);
    expect(matchesFilter('missed', false, 'missed')).toBe(true);
    expect(matchesFilter('correct', true, 'saved')).toBe(true);
    expect(matchesFilter('missed', false, 'saved')).toBe(false);
  });
});

describe('bank list', () => {
  const qs = [
    q('d1_001', 'Sampling. Attribute'),
    q('d1_002', 'Audit Charter & Authority'),
    q('d1_003', 'Sampling. Variable', 'First paragraph.\nSecond paragraph.'),
  ];
  const answers = { d1_001: rec(false), d1_002: rec(true) };

  it('groups questions under A→Z topic headers with the learner’s own counts', () => {
    const items = buildBankList(qs, answers, ['d1_003'], 'all', shortSubtopic);
    expect(items.map((i) => (i.kind === 'topic' ? `#${i.title}` : i.id))).toEqual([
      '#Audit charter',
      'd1_002',
      '#Sampling',
      'd1_001',
      'd1_003',
    ]);
    const sampling = items.find((i) => i.kind === 'topic' && i.title === 'Sampling');
    expect(sampling).toMatchObject({ summary: '1 answered · 1 missed · 1 saved' });
    const third = items.find((i) => i.kind === 'question' && i.id === 'd1_003');
    expect(third).toMatchObject({ status: 'new', saved: true, firstLine: 'First paragraph.' });
  });

  it('topic counts cover the whole topic, even under a filter', () => {
    const missed = buildBankList(qs, answers, ['d1_003'], 'missed', shortSubtopic);
    expect(missed[0]).toMatchObject({ kind: 'topic', title: 'Sampling', summary: '1 answered · 1 missed · 1 saved' });
  });

  it('a one-question topic has no header summary (its row says it all)', () => {
    const items = buildBankList(qs, answers, [], 'all', shortSubtopic);
    expect(items[0]).toMatchObject({ kind: 'topic', title: 'Audit charter', summary: '' });
  });

  it('drops topics with nothing left after filtering', () => {
    const missed = buildBankList(qs, answers, [], 'missed', shortSubtopic);
    expect(listedIds(missed)).toEqual(['d1_001']);
    expect(missed.filter((i) => i.kind === 'topic')).toHaveLength(1);
    expect(buildBankList(qs, answers, [], 'saved', shortSubtopic)).toEqual([]);
    expect(listedIds(buildBankList(qs, answers, [], 'new', shortSubtopic))).toEqual(['d1_003']);
  });

  it('firstLine skips blank lines', () => {
    expect(firstLine('\n  Hello  \nworld')).toBe('Hello');
  });
});

describe('practise these', () => {
  it('caps at 20, keeps only listed ids, and shuffles', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `d1_${i}`);
    const set = practiseSet(ids, createRng(42));
    expect(set).toHaveLength(PRACTISE_CAP);
    expect(new Set(set).size).toBe(PRACTISE_CAP);
    set.forEach((id) => expect(ids).toContain(id));
    expect(set).not.toEqual(ids.slice(0, PRACTISE_CAP)); // random order, not bank order
    expect(practiseSet(['a', 'b'], createRng(1)).sort()).toEqual(['a', 'b']);
  });
});

describe('summary copy', () => {
  it('reads naturally', () => {
    expect(youveSummary({ answered: 42, missed: 7, saved: 3 })).toBe('You’ve answered 42 · 7 missed · 3 saved');
    expect(youveSummary({ answered: 0, missed: 0, saved: 2 })).toBe('You’ve saved 2');
    expect(progressSummary({ answered: 0, missed: 0, saved: 0 })).toBe('Not started yet');
    expect(topicSummary({ answered: 0, missed: 0, saved: 0 })).toBe('');
  });

  it('every filter has seedling copy', () => {
    (['all', 'new', 'missed', 'saved'] as BankFilter[]).forEach((f) => expect(emptyCopy(f).title).toBeTruthy());
    expect(emptyCopy('missed').title).toBe('No missed questions here yet');
  });
});

// PRODUCT RULE: never show the bank or a domain's total. Simulate a learner
// part-way through every domain and check every string the screens render.
describe('never reveals the bank or domain size', () => {
  const cert = getCertification('cisa')!;
  const bank = getAllQuestions('cisa');
  const domainTotals = cert.domains.map((d) => getDomainQuestions('cisa', d.id).length);
  const forbidden = [bank.length, ...domainTotals].map(String);
  // Thousands separators too ("1,058").
  forbidden.push(...[bank.length, ...domainTotals].map((n) => n.toLocaleString('en-US')));

  // Answer roughly every third question (wrong every seventh) and save every eleventh.
  const answers: Record<string, AnswerRecord> = {};
  const bookmarks: string[] = [];
  bank.forEach((x, i) => {
    if (i % 3 === 0) answers[x.id] = rec(i % 7 !== 0);
    if (i % 11 === 0) bookmarks.push(x.id);
  });

  const strings: string[] = [];
  strings.push(youveSummary(learnerCounts(bank, answers, bookmarks)));
  for (const d of cert.domains) {
    const qs = getDomainQuestions('cisa', d.id);
    const n = learnerCounts(qs, answers, bookmarks);
    strings.push(progressSummary(n), youveSummary(n));
    for (const f of ['all', 'new', 'missed', 'saved'] as BankFilter[]) {
      for (const it of buildBankList(qs, answers, bookmarks, f, shortSubtopic)) {
        if (it.kind === 'topic') strings.push(it.title, it.summary);
      }
      strings.push(emptyCopy(f).title, emptyCopy(f).body);
    }
  }

  it('the simulated learner really is part-way (so the check means something)', () => {
    expect(bank.length).toBeGreaterThan(100);
    expect(strings.length).toBeGreaterThan(50);
  });

  it('no rendered summary contains a total', () => {
    for (const s of strings) {
      const numbers = s.match(/\d[\d,]*/g) ?? [];
      for (const n of numbers) expect(forbidden).not.toContain(n);
      expect(s).not.toMatch(/\bof \d/); // no "x of N"
      expect(s).not.toMatch(/\d+ questions?\b/); // no "186 questions"
    }
  });
});
