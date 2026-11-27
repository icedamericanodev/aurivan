/**
 * Course features from the expert decisions of 27 Nov 2026 (the course plan, section 11),
 * items 2 to 4, with NO real course added: a made-up course "QAZ" asks for sections
 * ("Section A"), and CISA must read and behave exactly as before.
 * (Item 1, the shared trademark mark, is in trademark-notice.test.ts.)
 */
import { CERTIFICATIONS, domainLabel, getCertification } from '../content/certifications';
import { getRoleDeck, getStepSequences, type RoleCard, type RoleDeck } from '../content/games';
import { getNotes } from '../content/notes';
import type { Certification } from '../content/types';
import { domainMark, domainOfCode, domainTitle, domainWord, DEFAULT_DOMAIN_STYLE } from '../engine/domainNaming';
import { buildCanopyRound } from '../engine/games/canopyCall';
import { fieldTerms, termsFromNotes } from '../engine/games/fieldGuide';
import { allMarks, type MilestoneFacts } from '../engine/milestones';
import { organLabel, supportSpread } from '../engine/plant';
import { EXAM_MINUTES_PER_QUESTION, examPace, todaysPlan } from '../engine/planner';
import { domainSpoken, type DomainRow } from '../engine/readinessReport';
import { readySigns, SIGN_TITLE } from '../engine/readySigns';
import { createRng } from '../engine/random';

const cisa = getCertification('cisa')!;
const SECTIONS = { noun: 'Section', numbering: 'letter' } as const;
/** A made-up course with lettered sections and its own exam pace (100 questions in 120 minutes). */
const qaz: Certification = {
  ...cisa,
  id: 'qaz1',
  name: 'QAZ Part 1',
  status: 'coming_soon',
  domainStyle: SECTIONS,
  exam: { ...cisa.exam, questions: 100, minutes: 120 },
  domains: [
    { id: '1', name: 'Foundations of the Craft', short: 'Foundations', weight: 35, tone: 0 },
    { id: '2', name: 'Ethics and Conduct', short: 'Ethics', weight: 20, tone: 1 },
    { id: '3', name: 'Oversight', short: 'Oversight', weight: 30, tone: 2 },
    { id: '4', name: 'Misconduct Risks', short: 'Misconduct', weight: 15, tone: 3 },
  ],
};

describe('the domain words helper', () => {
  it('every course today has no style, so it says "Domain 1"', () => {
    expect(CERTIFICATIONS.every((c) => c.domainStyle === undefined)).toBe(true);
    expect(domainTitle('4', cisa)).toBe('Domain 4');
    expect(domainTitle('4')).toBe('Domain 4');
    expect(domainMark('4', cisa)).toBe('4');
    expect(['Domain', 'Domains', 'domain', 'domains'].map((f) => domainWord(cisa, f as 'Domain'))).toEqual(['Domain', 'Domains', 'domain', 'domains']);
    expect(DEFAULT_DOMAIN_STYLE).toEqual({ noun: 'Domain', numbering: 'number' });
  });

  it('a course with sections says "Section A" for domain id "1"; ids never change', () => {
    expect(domainTitle('1', qaz)).toBe('Section A');
    expect(domainTitle('4', qaz)).toBe('Section D');
    expect(domainMark('2', qaz)).toBe('B');
    expect(['Domain', 'Domains', 'domain', 'domains'].map((f) => domainWord(qaz, f as 'Domain'))).toEqual(['Section', 'Sections', 'section', 'sections']);
    // Not a number from 1 to 26: written as it is.
    expect(domainMark('x', qaz)).toBe('x');
  });

  it('list labels: CISA unchanged, a sectioned course reads "Section A · Foundations"', () => {
    expect(domainLabel(cisa.domains[3])).toBe('Domain 4 · IS Operations');
    expect(domainLabel(cisa.domains[3], cisa)).toBe('Domain 4 · IS Operations');
    expect(domainLabel(qaz.domains[0], qaz)).toBe('Section A · Foundations');
  });
});

describe('the sub-topic code names the domain the course’s way (decision 2)', () => {
  it('CISA: the first character, exactly as before, for every note in the pack', () => {
    const ids = (getNotes('cisa')?.domains ?? []).flatMap((d) => d.topics.flatMap((t) => t.subtopics.map((s) => ({ id: s.id, domain: d.id }))));
    expect(ids.length).toBeGreaterThan(50);
    for (const { id, domain } of ids) {
      expect(domainOfCode(id, cisa)).toBe(id.charAt(0));
      expect(domainOfCode(id, cisa)).toBe(domain);
    }
  });

  it('a lettered course: part digit, section letter, topic ("1B1.1" is section B, id "2")', () => {
    expect(domainOfCode('1A1', qaz)).toBe('1');
    expect(domainOfCode('1B1.1', qaz)).toBe('2');
    expect(domainOfCode('3D4.2', qaz)).toBe('4');
    expect(domainOfCode('2C3', qaz)).toBe('3');
    // The same code in CISA is Domain 1 (Part B).
    expect(domainOfCode('1B1.1', cisa)).toBe('1');
  });

  it('CISA game decks keep their domains (Canopy Call cards and Stepping Stones)', () => {
    const deck = getRoleDeck('cisa');
    expect(deck?.cards.length).toBeGreaterThan(0);
    for (const card of deck!.cards) expect(card.domainId).toBe(card.subtopicId.charAt(0));
    const authored = getStepSequences('cisa').filter((s) => s.subtopicId);
    expect(authored.length).toBeGreaterThan(0);
    for (const s of authored) expect(s.domainId).toBe(s.subtopicId!.charAt(0));
  });

  it('Canopy Call caps a round at 3 cards per domain, reading the card’s own domain', () => {
    // Twelve cards, all "part 1" codes: by the first character they are one domain,
    // but by their letters they are four sections (three cards each).
    const cards: RoleCard[] = ['A', 'B', 'C', 'D'].flatMap((L, k) =>
      [1, 2, 3].map((n) => ({ id: `r${L}${n}`, decision: `Decide ${L}${n}`, role: 'owner', why: 'Because.', subtopicId: `1${L}${n}.1`, domainId: String(k + 1), tier: 'seedling' as const, excludeChips: [] })),
    );
    const deck: RoleDeck = { roles: [{ id: 'owner', label: 'Owner', short: 'Owner' }], cards };
    // By the first character all twelve are one domain, so the cap would let any mix through;
    // by section, ten cards from four sections of three means 3, 3, 3 and 1, never 4 of one.
    for (const seed of [1, 7, 42, 99]) {
      const round = buildCanopyRound(deck, undefined, 'seedling', createRng(seed), 0, 10);
      expect(round).toHaveLength(10);
      const per = new Map<string, number>();
      for (const { card } of round) per.set(card.domainId!, (per.get(card.domainId!) ?? 0) + 1);
      expect(per.size).toBe(4);
      expect(Math.max(...per.values())).toBeLessThanOrEqual(3);
    }
  });

  it('the plant’s restore check reads a renamed note’s section from its letter', () => {
    const w = qaz.domains.map((d) => ({ id: d.id, weight: d.weight }));
    const outline = [['1A1.1'], ['1B1.1'], ['1C1.1'], ['1D1.1']];
    // A mastered note the outline no longer lists, in section B.
    const m = { firstDay: '2026-11-01', masteredAt: '2026-11-03' };
    const mastery = { '1A1.1': m, '1B9.9': m, '1C1.1': m, '1D1.1': m };
    expect(supportSpread(w, outline, mastery, qaz)).toBeCloseTo(1);
    // CISA's reading (no course) counts "1B9.9" in domain 1 instead, so section B stays unknown.
    expect(supportSpread(w, outline, mastery)).toBeCloseTo(0.8);
  });
});

describe('the planner’s pace comes from the exam (decision 3)', () => {
  it('CISA: 240 minutes for 150 questions is 1.6 a question, today’s number', () => {
    expect(examPace(cisa.exam)).toBe(EXAM_MINUTES_PER_QUESTION);
    expect(EXAM_MINUTES_PER_QUESTION).toBe(1.6);
  });

  it('another course uses its own minutes and questions; missing either keeps 1.6', () => {
    expect(examPace(qaz.exam)).toBeCloseTo(1.2);
    expect(examPace({ questions: 100 })).toBe(1.6);
    expect(examPace({ minutes: 120, questions: 0 })).toBe(1.6);
    expect(examPace(null)).toBe(1.6);
  });

  it('the weekly mini mock is sized at the course’s pace', () => {
    const plan = (exam: { questions: number; minutes?: number }) =>
      todaysPlan({ stage: 'mock', dueReviews: 0, dailyMinutes: 20, daysLeft: 30, examQuestions: exam.questions, examMinutes: exam.minutes });
    expect(plan(cisa.exam)).toEqual([{ kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 }]);
    expect(plan(qaz.exam)).toEqual([{ kind: 'mock', questions: 33, label: 'Mini mock · 33 questions', minutes: 40 }]);
    // No minutes known: 1.6 a question, as before.
    expect(plan({ questions: 150 })).toEqual([{ kind: 'mock', questions: 50, label: 'Mini mock · 50 questions', minutes: 80 }]);
  });
});

describe('the course’s domain words in the engines (decision 4)', () => {
  const row = (domain: Certification['domains'][number]): DomainRow => ({ domain, weightPct: domain.weight, readinessPct: 62, answered: 40, firm: true });

  it('the readiness report’s spoken row', () => {
    expect(domainSpoken(row(cisa.domains[3]))).toBe('Domain 4, IS Operations, 26 percent of the exam. Domain readiness 62 percent, based on 40 answers.');
    expect(domainSpoken(row(cisa.domains[3]), cisa)).toBe(domainSpoken(row(cisa.domains[3])));
    expect(domainSpoken(row(qaz.domains[0]), qaz)).toBe('Section A, Foundations, 35 percent of the exam. Section readiness 62 percent, based on 40 answers.');
  });

  it('the plant’s organ label', () => {
    expect(organLabel(3, 'IS Operations', 0.3, 2, true, cisa)).toBe(organLabel(3, 'IS Operations', 0.3, 2, true));
    expect(organLabel(3, 'IS Operations', 0.3, 2, true)).toMatch(/^Domain 4, IS Operations, 30 percent/);
    expect(organLabel(1, 'Ethics', 0.3, 2, false, qaz)).toMatch(/^Section B, Ethics, 30 percent/);
  });

  it('the readiness sign: "Every domain…" today, "Every section at 70%…" for sections', () => {
    const input = { readinessLog: [], today: '2026-11-27', domains: [], mocks: [], examQuestions: 150 };
    expect(readySigns(input).signs[1].title).toBe(SIGN_TITLE.domains);
    expect(SIGN_TITLE.domains).toBe('Every domain at 70% or more, from 30+ answers each');
    expect(readySigns({ ...input, domainStyle: SECTIONS }).signs[1].title).toBe('Every section at 70% or more, from 30+ answers each');
  });

  const facts = (over: Partial<MilestoneFacts> = {}): MilestoneFacts => ({
    cleanAnswered: 0,
    topicsClear: 0,
    domains: [
      { id: '1', short: 'Foundations', answered: 10, mastery: 0.5 },
      { id: '2', short: 'Ethics', answered: 10, mastery: 0.5 },
    ],
    loopFixed: 0,
    slipsTagged: 0,
    longRecall: 0,
    graduated: 0,
    sure: [],
    mocks: [],
    fullMockSize: 100,
    mindsetShift: false,
    studyDays: 0,
    freshStart: false,
    gamesPlayed: 0,
    gamesTotal: 9,
    snareHits: [],
    keelRun: 0,
    signposts: [],
    myths: [],
    paceRounds: 0,
    gameFixes: 0,
    ...over,
  });

  it('badges: "Domain Mastery" and "All Domains" today; a sectioned course’s words, same keys', () => {
    const today = allMarks(facts());
    const label = (marks: ReturnType<typeof allMarks>, key: string) => marks.find((m) => m.key === key)?.label;
    expect(label(today, 'firm-footing:2')).toBe('Domain Mastery · Ethics');
    expect(label(today, 'firm-footing:2:80')).toBe('Domain Mastery · Ethics · 80%');
    expect(label(today, 'whole-map')).toBe('All Domains');
    expect(today.find((m) => m.key === 'whole-map')?.detail).toBe('0 of 2 domains at 65%');

    const sections = allMarks(facts({ domainStyle: SECTIONS }));
    expect(label(sections, 'firm-footing:2')).toBe('Section Mastery · Ethics');
    expect(label(sections, 'firm-footing:2:80')).toBe('Section Mastery · Ethics · 80%');
    expect(label(sections, 'whole-map')).toBe('All Sections');
    expect(sections.find((m) => m.key === 'whole-map')?.detail).toBe('0 of 2 sections at 65%');
    // Saved badge ids never change.
    expect(sections.map((m) => m.key)).toEqual(today.map((m) => m.key));
  });

  it('Term Match: a domain’s own terms are "Domain 1 key terms" today, "Section A key terms" for sections', () => {
    const pack = getNotes('cisa');
    const names = (terms: ReturnType<typeof termsFromNotes>) => [...new Set(terms.filter((t) => t.topicId.startsWith('D')).map((t) => t.topicName))];
    const plain = names(termsFromNotes(pack));
    expect(plain.length).toBeGreaterThan(0);
    expect(plain.every((n) => /^Domain \d key terms$/.test(n))).toBe(true);
    expect(names(termsFromNotes(pack, cisa))).toEqual(plain);
    expect(names(termsFromNotes(pack, qaz)).every((n) => /^Section [A-E] key terms$/.test(n))).toBe(true);
    // The cache keeps each wording apart: a count-only call (no course) never changes the course's words.
    expect(fieldTerms(pack).length).toBe(fieldTerms(pack, qaz).length);
    expect(names(fieldTerms(pack, qaz)).every((n) => n.startsWith('Section '))).toBe(true);
    expect(names(fieldTerms(pack))).toEqual(plain);
  });
});
