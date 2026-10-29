/**
 * engine/fieldGuide.ts (mobile 1.51, DESIGN_SYSTEM.md §21): the facts the
 * Field Guide plates draw. Honest by construction:
 *  - a stem's number only from 30 answers; below the line said in words;
 *  - growth only where both ends of a set have a number;
 *  - the herbarium's newest specimens from the saved keys the case shows;
 *  - Today's countdown title.
 */
import { areaSnapshot, areaStems, emptyPlateLine, growthFigure, lastPressed, setStems, todayTitle } from '../engine/fieldGuide';

const DOMAINS = [
  { id: '1', short: 'IS Audit', emblem: 'domain-audit' },
  { id: '2', short: 'IT Governance', emblem: 'domain-governance' },
  { id: '3', short: 'IS Acquisition', emblem: 'domain-build' },
  { id: '4', short: 'IS Operations', emblem: 'domain-operations' },
  { id: '5', short: 'Info Protection', emblem: 'domain-protection' },
];

describe('areaStems', () => {
  it('a number from 30 answers; too few yet and not started are words; ups only on numbers', () => {
    const stems = areaStems(
      DOMAINS,
      [
        { domainId: '1', answered: 60, mastery: 0.84 },
        { domainId: '2', answered: 12, mastery: 0.9 },
        { domainId: '4', answered: 40, mastery: 0.61 },
      ],
      [0, 12, 0, 3, 0],
    );
    expect(stems.map((s) => [s.name, s.pct, s.thin, s.below, s.up ?? 0])).toEqual([
      ['IS Audit', 84, false, false, 0],
      ['IT Governance', null, true, false, 0],
      ['IS Acquisition', null, false, false, 0],
      ['IS Operations', 61, false, true, 3],
      ['Info Protection', null, false, false, 0],
    ]);
    expect(stems[3].spoken).toBe('IS Operations: Building, 61 percent on latest tries, below the 70 line. Up 3 since you last looked');
    expect(stems[2].spoken).toBe('IS Acquisition: not started');
  });
});

describe('setStems and the growth plate', () => {
  const now = [
    { domainId: '4', answered: 70, mastery: 0.61 },
    { domainId: '3', answered: 18, mastery: 0.5 },
  ];
  it('only the areas this set asked about; growth only where both ends have a number', () => {
    const before = areaSnapshot([
      { domainId: '4', answered: 60, mastery: 0.58 },
      { domainId: '3', answered: 8, mastery: 0.4 },
    ]);
    const stems = setStems(DOMAINS, now, { '4': { correct: 7, total: 10 }, '3': { correct: 3, total: 4 } }, before);
    expect(stems.map((s) => [s.name, s.pct, s.up ?? 0, s.note])).toEqual([
      ['IS Acquisition', null, 0, '3 of 4 this set'],
      ['IS Operations', 61, 3, '7 of 10 this set'],
    ]);
    expect(growthFigure(stems[1])).toEqual({ shown: '58 → 61%', line: 'IS Operations grew 3 points in this set', spoken: 'IS Operations, from 58 to 61 percent on latest tries' });
    expect(growthFigure(stems[0])).toBeNull();
  });

  it('an area that crossed 30 answers in this set shows its number, never a growth from a word', () => {
    const before = areaSnapshot([{ domainId: '4', answered: 25, mastery: 0.4 }]);
    const [s] = setStems(DOMAINS, now, { '4': { correct: 7, total: 10 } }, before);
    expect(s.pct).toBe(61);
    expect(s.up).toBeUndefined();
  });

  it('no snapshot (a set started before 1.51): the stems now, no growth', () => {
    const [s] = setStems(DOMAINS, now, { '4': { correct: 7, total: 10 } });
    expect(s.up).toBeUndefined();
  });

  it('the empty plate says which areas need answers, and only when none has a number', () => {
    const thin = setStems(DOMAINS, now, { '3': { correct: 3, total: 4 } });
    expect(emptyPlateLine(thin)).toBe('IS Acquisition needs a few more answers before it is measured.');
    expect(emptyPlateLine(setStems(DOMAINS, [], { '1': { correct: 1, total: 1 }, '2': { correct: 0, total: 1 } }))).toBe('IS Audit and IT Governance need a few more answers before they are measured.');
    expect(emptyPlateLine(setStems(DOMAINS, now, { '4': { correct: 7, total: 10 } }))).toBeNull();
  });
});

describe('lastPressed', () => {
  it('newest first, named as the case names them, with the domain emblem for Firm Footing', () => {
    const got = lastPressed({ 'first-foothold': 1, 'rooted:10': 5, 'firm-footing:4': 9, 'know-what-you-know': 7, 'not-a-badge': 99 }, DOMAINS);
    expect(got.map((g) => g.name)).toEqual(['Firm Footing · IS Operations', 'Know What You Know', 'Rooted · 10 days']);
    expect(got[0].emblem).toBe('domain-operations');
    expect(got[2].tier).toBe(1);
    expect(lastPressed(undefined, DOMAINS)).toEqual([]);
  });
});

describe('todayTitle', () => {
  it('the countdown is the title; the name leads when there is one', () => {
    expect(todayTitle(38, 'Maya', 9)).toBe('Maya, 38 days to go');
    expect(todayTitle(38, '', 9)).toBe('38 days to go');
    expect(todayTitle(1, null, 9)).toBe('1 day to go');
    expect(todayTitle(0, 'Maya', 9)).toBe('Maya, it’s exam day');
    expect(todayTitle(-2, undefined, 9)).toBe('Exam done');
    expect(todayTitle(null, 'Maya', 9)).toBe('Good morning, Maya');
  });
});
