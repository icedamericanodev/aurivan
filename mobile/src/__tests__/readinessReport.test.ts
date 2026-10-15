/**
 * Mobile 1.16 (PHASE5.md §3.1, §3.4): the readiness report's rules.
 * - mockTrend: oldest → newest, mini / full / other, untimed, the cap of 10;
 * - trendWords: up / level / down at the ±2 boundaries, null for one mock;
 * - domainBreakdown: 4-, 5- and 8-domain certs, a mock with no entry, `firm`;
 * - raiseLowerBound: the order, the cap of 3, the "answer more" row alone
 *   before there is a range;
 * - lowSeries: carry-forward over gaps, nothing before the first entry;
 * - the chart scale and the six steps.
 * And, everywhere: nothing promises a result.
 */
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import type { Certification } from '../content/types';
import { shiftDay } from '../engine/examReady';
import { STAGE_ORDER } from '../engine/journey';
import { computeReadiness, type AnswerRecord, type Readiness } from '../engine/readiness';
import {
  chartScale,
  domainBreakdown,
  domainSpoken,
  evidenceLine,
  LOW_MIN_DAYS,
  lowSeries,
  lowSpoken,
  lowSummary,
  lowWords,
  mockKind,
  mockLine,
  mockPct,
  mockTrend,
  MIXED_NOTE,
  PATH_NOTE,
  PATH_REASON,
  PATH_STEPS,
  raiseLowerBound,
  readinessLine,
  stepLabel,
  tallySpoken,
  tallyText,
  TREND_MAX,
  trendSpoken,
  trendWords,
  type MockLike,
  type TrendPoint,
} from '../engine/readinessReport';
import { readinessRange } from '../engine/readinessRange';

const cisa = getCertification('cisa')!;
const DAY = 86_400_000;
const T0 = new Date(2026, 9, 12, 9).getTime();

/** n answers in a domain, `right` of them correct. */
function answers(spec: Record<string, [number, number]>): Record<string, AnswerRecord> {
  const out: Record<string, AnswerRecord> = {};
  for (const [d, [n, right]] of Object.entries(spec)) {
    for (let i = 0; i < n; i++) out[`d${d}_${String(i).padStart(3, '0')}`] = { attempts: 1, correctCount: i < right ? 1 : 0, lastCorrect: i < right, lastAt: T0 };
  }
  return out;
}
const mock = (id: string, daysAgo: number, total: number, correct: number, extra: Partial<MockLike> = {}): MockLike => ({ id, finishedAt: T0 - daysAgo * DAY, total, correct, ...extra });
const point = (pct: number, kind: TrendPoint['kind'] = 'mini', timed = true): TrendPoint => ({ id: String(pct), at: 0, pct, kind, timed });

describe('mockTrend', () => {
  it('oldest → newest, whatever order the store keeps (newest first)', () => {
    const t = mockTrend([mock('c', 1, 50, 40), mock('a', 9, 50, 30), mock('b', 5, 150, 100)], 150);
    expect(t.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(t.map((p) => p.pct)).toEqual([60, 67, 80]);
  });

  it('tells full, mini and other lengths apart, and marks untimed', () => {
    expect(mockKind(150, 150)).toBe('full');
    expect(mockKind(50, 150)).toBe('mini');
    expect(mockKind(20, 150)).toBe('other');
    expect(mockKind(30, 90)).toBe('mini'); // a third of a 90-question exam
    const t = mockTrend([mock('u', 1, 50, 25, { timing: 'untimed' }), mock('s', 2, 50, 25, { timing: 'plus25' }), mock('o', 3, 50, 25)], 150);
    expect(t.map((p) => p.timed)).toEqual([true, true, false]);
  });

  it('shows at most the newest 10', () => {
    const many = Array.from({ length: 14 }, (_, i) => mock(`m${i}`, 30 - i, 50, 20 + i));
    const t = mockTrend(many, 150);
    expect(t).toHaveLength(TREND_MAX);
    expect(t[0].id).toBe('m4');
    expect(t[9].id).toBe('m13');
  });

  it('a broken total never gives NaN, and a correct count past the total is capped', () => {
    expect(mockPct({ total: 0, correct: 0 })).toBe(0);
    expect(mockPct({ total: 10, correct: 14 })).toBe(100);
  });
});

describe('trendWords', () => {
  it('null for 0 or 1 mock (one score, no trend)', () => {
    expect(trendWords([])).toBeNull();
    expect(trendWords([point(70)])).toBeNull();
  });

  it('two mocks speak "since your last mock"; three or more, "over your last 3"', () => {
    expect(trendWords([point(60), point(66)])).toBe('Up 6 points since your last mock.');
    expect(trendWords([point(50), point(60), point(62), point(66)])).toBe('Up 6 points over your last 3 mocks.');
  });

  it('within ±2 points reads "about level"; 3 is a move', () => {
    expect(trendWords([point(60), point(62), point(61)])).toBe('About level over your last 3 mocks.');
    expect(trendWords([point(60), point(57), point(58)])).toBe('About level over your last 3 mocks.');
    expect(trendWords([point(60), point(63)])).toBe('Up 3 points since your last mock.');
    expect(trendWords([point(60), point(57)])).toBe('Down 3 points since your last mock. One mock can swing; look at the domains below.');
  });

  it('a fall in the NEWEST mock is never smoothed over by an older, lower score (code review M1)', () => {
    // 60 → 70 → 58: the newest fell 12; comparing only with the oldest said "About level".
    expect(trendWords([point(60), point(70), point(58)])).toBe('Down 12 points since your last mock. One mock can swing; look at the domains below.');
    // 50 → 80 → 60: it once read "Up 10 points".
    expect(trendWords([point(50), point(80), point(60)])).toBe('Down 20 points since your last mock. One mock can swing; look at the domains below.');
    // 60 → 70 → 62 is an 8-point fall since the last mock: said plainly too.
    expect(trendWords([point(60), point(70), point(62)])).toBe('Down 8 points since your last mock. One mock can swing; look at the domains below.');
    // A small dip (within ±2) after a rise still reads as the 3-mock trend.
    expect(trendWords([point(60), point(70), point(68)])).toBe('Up 8 points over your last 3 mocks.');
  });

  it('mini and full mocks mixed in the comparison: says so (UX review O1); one kind: no note', () => {
    expect(trendWords([point(60, 'mini'), point(66, 'full')])).toBe(`Up 6 points since your last mock. ${MIXED_NOTE}`);
    expect(trendWords([point(70, 'mini'), point(60, 'full')])).toBe(`Down 10 points since your last mock. One mock can swing; look at the domains below. ${MIXED_NOTE}`);
    expect(trendWords([point(60, 'full'), point(61, 'mini'), point(61, 'mini')])).toBe(`About level over your last 3 mocks. ${MIXED_NOTE}`);
    // A full mock outside the window compared is not "mixed here".
    expect(trendWords([point(40, 'full'), point(60), point(61), point(66)])).toBe('Up 6 points over your last 3 mocks.');
    expect(trendWords([point(60, 'full'), point(66, 'full')])).toBe('Up 6 points since your last mock.');
    expect(MIXED_NOTE).toBe('Mini and full mocks are mixed here; a mini mock swings more.');
  });

  it('the spoken trend names each mock\'s kind and untimed (code review M3c)', () => {
    expect(trendSpoken([point(56), point(59, 'mini', false), point(62, 'full'), point(64, 'other')])).toBe(
      'Your last 4 mocks, oldest first, in percent: 56 mini, 59 mini untimed, 62 full, 64.',
    );
  });

  it('a fall is said plainly and points to the domains, never alarmed', () => {
    const w = trendWords([point(70), point(66)])!;
    expect(w).toBe('Down 4 points since your last mock. One mock can swing; look at the domains below.');
    expect(w).not.toMatch(/!|fail|worse|behind|warning/i);
  });
});

/** A cert with any number of domains, equal weights. */
function certWith(n: number): Certification {
  return {
    ...cisa,
    id: `test${n}`,
    domains: Array.from({ length: n }, (_, i) => ({ id: String(i + 1), name: `Domain ${i + 1} name`, short: `D${i + 1}`, weight: 10, tone: (i % 5) as 0 | 1 | 2 | 3 | 4 })),
  };
}

describe('domainBreakdown', () => {
  it.each([4, 5, 8])('%i domains: one row each, in order, weights adding to about 100', (n) => {
    const cert = n === 5 ? cisa : certWith(n);
    const rows = domainBreakdown(cert, computeReadiness(cert, answers({ '1': [12, 9] })), []);
    expect(rows.map((r) => r.domain.id)).toEqual(cert.domains.map((d) => d.id));
    const sum = rows.reduce((s, r) => s + r.weightPct, 0);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(n);
    // No mocks: no mock line.
    expect(rows.every((r) => r.lastMock === undefined && mockLine(r) === null)).toBe(true);
  });

  it('weights, domain readiness, evidence and firm', () => {
    const r = computeReadiness(cisa, answers({ '4': [20, 15], '3': [6, 6] }));
    const rows = domainBreakdown(cisa, r, []);
    const d4 = rows.find((x) => x.domain.id === '4')!;
    expect(d4).toMatchObject({ weightPct: 26, readinessPct: 75, answered: 20, firm: true });
    expect(evidenceLine(d4)).toBe('Based on 20 answers');
    const d3 = rows.find((x) => x.domain.id === '3')!;
    // 6 of 6 right reads as 60%: missing answers count as not yet right (MIN_SAMPLE).
    expect(d3).toMatchObject({ readinessPct: 60, firm: false });
    expect(evidenceLine(d3)).toBe('Based on 6 answers: still firming up');
    // No answers: never "0%" (UX review H2).
    const d1 = rows.find((x) => x.domain.id === '1')!;
    expect(evidenceLine(d1)).toBe('No answers here yet');
    expect(readinessLine(d1)).toBe('18% of the exam · not started yet');
    expect(readinessLine(d1)).not.toMatch(/0%\s*$|readiness 0/);
    expect(domainSpoken(d1)).toBe('Domain 1, IS Audit, 18 percent of the exam. Not started yet.');
    expect(readinessLine(d4)).toBe('26% of the exam · domain readiness 75%');
  });

  it('the last two mocks side by side; an older mock with no entry for a domain shows "–"', () => {
    const r = computeReadiness(cisa, answers({ '4': [20, 15] }));
    const mocks = [
      mock('old', 20, 50, 30, { byDomain: { '4': { total: 13, correct: 7 } } }),
      mock('prev', 10, 50, 30, { byDomain: { '4': { total: 18, correct: 11 } } }),
      mock('last', 1, 50, 30, { byDomain: { '4': { total: 20, correct: 14 }, '1': { total: 9, correct: 6 } } }),
    ];
    const rows = domainBreakdown(cisa, r, mocks);
    const d4 = rows.find((x) => x.domain.id === '4')!;
    // Tallies carry their percentage, so mocks of different sizes compare at a glance (UX review P7).
    expect(mockLine(d4)).toBe('Last mock 14 of 20 (70%) · the one before 11 of 18 (61%)');
    const d1 = rows.find((x) => x.domain.id === '1')!;
    expect(mockLine(d1)).toBe('Last mock 6 of 9 (67%) · the one before –');
    expect(tallyText({ total: 9, correct: 8 })).toBe('8 of 9 (89%)');
    expect(tallySpoken({ total: 9, correct: 8 })).toBe('8 of 9, 89 percent');
    expect(tallyText(null)).toBe('–');
    expect(tallySpoken(null)).toBe('not recorded');
    // A domain neither mock covered: no line at all.
    expect(mockLine(rows.find((x) => x.domain.id === '2')!)).toBeNull();
    // A very old save with no byDomain at all.
    const bare = domainBreakdown(cisa, r, [mock('x', 1, 50, 30)]);
    expect(bare.every((row) => row.lastMock === null && mockLine(row) === null)).toBe(true);
  });

  it('spoken: one sentence per domain, full words, never the bank size', () => {
    const r = computeReadiness(cisa, answers({ '4': [120, 82] }));
    const d4 = domainBreakdown(cisa, r, [mock('m', 1, 50, 30, { byDomain: { '4': { total: 20, correct: 14 } } })]).find((x) => x.domain.id === '4')!;
    expect(domainSpoken(d4)).toBe('Domain 4, IS Operations, 26 percent of the exam. Domain readiness 68 percent, based on 120 answers. Last mock 14 of 20, 70 percent.');
    const thin = domainBreakdown(cisa, computeReadiness(cisa, answers({ '3': [6, 4] })), []).find((x) => x.domain.id === '3')!;
    expect(domainSpoken(thin)).toBe('Domain 3, IS Acquisition, 12 percent of the exam. Domain readiness 40 percent, based on 6 answers, still firming up.');
    expect(domainSpoken(d4)).not.toMatch(/questions in this domain|of \d+ questions/);
  });
});

describe('raiseLowerBound', () => {
  const ready = (spec: Record<string, [number, number]>): Readiness => computeReadiness(cisa, answers(spec));
  const run = (r: Readiness, due: number) => raiseLowerBound(cisa, r, readinessRange(cisa, r), due);

  it('before there is a range: only the "answer more" row', () => {
    const r = ready({ '1': [12, 9] });
    expect(run(r, 30)).toEqual([{ kind: 'unlock', more: 28, text: 'Answer 28 more questions to see your range', button: 'Practice a mixed set' }]);
  });

  it('the stable order: the thinnest domain, then the most to gain, then reviews (at most 3)', () => {
    const r = ready({ '1': [30, 27], '2': [30, 26], '3': [4, 3], '4': [30, 15], '5': [30, 24] });
    const a = run(r, 55);
    expect(a.map((x) => x.kind)).toEqual(['answer', 'focus', 'review']);
    expect(a[0]).toMatchObject({ domainId: '3', more: 6, text: 'Answer 6 more in IS Acquisition to firm up your range', button: 'Practice IS Acquisition' });
    expect(a[1]).toMatchObject({ domainId: '4', text: 'IS Operations has the most to gain: 26% of the exam', button: 'Practice weak spots' });
    // One session's worth (20), not the whole queue.
    expect(a[2]).toMatchObject({ count: 20, text: 'Clear 20 reviews: revisiting steadies your range', button: 'Start review' });
  });

  it('the focus row is left out when it is the same domain as the thin one', () => {
    const r = ready({ '1': [30, 27], '2': [30, 26], '3': [30, 25], '4': [8, 2], '5': [30, 24] });
    expect(run(r, 0).map((x) => x.kind)).toEqual(['answer']);
    expect(run(r, 1)[1]).toMatchObject({ kind: 'review', text: 'Clear 1 review: revisiting steadies your range' });
  });

  it('nothing stands out: the steady habit, with no button', () => {
    const r = ready({ '1': [40, 40], '2': [40, 40], '3': [40, 40], '4': [40, 40], '5': [40, 40] });
    expect(run(r, 0)).toEqual([{ kind: 'mix', text: 'Keep a steady mix: reviews first, then your weakest domain.' }]);
  });

  it('never promises a result', () => {
    for (const due of [0, 5, 80]) {
      for (const r of [ready({ '1': [12, 9] }), ready({ '1': [30, 27], '3': [4, 3], '4': [30, 15] })]) {
        for (const a of run(r, due)) expect(a.text).not.toMatch(/\bpass\b|fail|guarantee|predict|will pass|forecast/i);
      }
    }
  });
});

describe('lowSeries: the low end over 30 days', () => {
  const today = '2026-10-12';
  const e = (k: number, last: number | null, min = last) => ({ day: shiftDay(today, k), min, last });

  it('carries the last reading forward over gaps, and starts at the first entry', () => {
    const s = lowSeries([e(5, 58), e(2, 61), e(0, 63)], today);
    expect(s.map((d) => d.day)).toEqual([5, 4, 3, 2, 1, 0].map((k) => shiftDay(today, k)));
    expect(s.map((d) => d.low)).toEqual([58, 58, 58, 61, 61, 63]);
    expect(s.map((d) => d.logged)).toEqual([true, false, false, true, false, true]);
  });

  it('uses the END of each day (a dip and recovery reads as where it ended)', () => {
    expect(lowSeries([e(0, 66, 60)], today)[0].low).toBe(66);
  });

  it('only the last 30 days; nothing logged gives nothing', () => {
    expect(lowSeries([e(45, 50), e(1, 60)], today)).toHaveLength(30);
    expect(lowSeries(undefined, today)).toEqual([]);
    expect(lowSeries([], today)).toEqual([]);
  });

  it('"not enough data" days carry no number, and the line waits for 3 days with one', () => {
    const s = lowSummary(lowSeries([e(3, null), e(2, 60), e(0, 62)], today));
    expect(s.values).toEqual([60, 60, 62]);
    expect(s.daysWithData).toBe(2);
    expect(s.enough).toBe(false);
    expect(LOW_MIN_DAYS).toBe(3);
    expect(lowWords(s)).toBeNull();
  });

  it('the words: from, to, over how many days; held when it did not move', () => {
    const up = lowSummary(lowSeries([e(29, 58), e(10, 62), e(0, 66)], today));
    expect(lowWords(up)).toBe('From 58% to 66% over 30 days.');
    expect(lowSpoken(up)).toBe('Your low end went from 58 to 66 percent over 30 days.');
    const held = lowSummary(lowSeries([e(4, 70), e(2, 70), e(0, 70)], today));
    expect(lowWords(held)).toBe('Held at 70% over 5 days.');
    const down = lowSummary(lowSeries([e(4, 70), e(2, 68), e(0, 64)], today));
    expect(lowSpoken(down)).toBe('Your low end went from 70 to 64 percent over 5 days.');
  });
});

describe('chartScale', () => {
  it('a small wobble never fills the chart (at least 20 points tall), always within 0–100', () => {
    expect(chartScale([66, 68])).toEqual({ lo: 57, hi: 77 });
    expect(chartScale([2, 3])).toEqual({ lo: 0, hi: 20 });
    expect(chartScale([99, 100])).toEqual({ lo: 80, hi: 100 });
    expect(chartScale([10, 90])).toEqual({ lo: 5, hi: 95 });
    expect(chartScale([])).toEqual({ lo: 0, hi: 100 });
    expect(chartScale([0, 100])).toEqual({ lo: 0, hi: 100 });
  });
});

describe('Your path: the six steps', () => {
  it('six steps in journey order, each with one line; after the exam has no number', () => {
    expect(PATH_STEPS.map((s) => s.stage)).toEqual(STAGE_ORDER.slice(0, 6));
    // No "Step N of 6" counter (UX review P1, decided).
    expect(stepLabel('practice')).toBe('Now: Make it stick');
    expect(stepLabel('diagnose')).toBe('Now: Find your starting point');
    expect(stepLabel('examDay')).toBe('Now: Exam week');
    expect(stepLabel('afterExam')).toBe('After the exam');
    for (const s of PATH_STEPS) expect(stepLabel(s.stage)).not.toMatch(/\d/);
    expect(PATH_REASON.practice).toBe('Until every domain is steady, practice leads.');
    expect(Object.keys(PATH_REASON)).toEqual(PATH_STEPS.map((s) => s.stage));
    expect(PATH_NOTE).toMatch(/^The plan moves between these as you go\./);
    expect(PATH_STEPS.map((s) => s.line)).toEqual([
      'Your first questions: a short look at where you are.',
      'Lessons for the domains you need.',
      'Practice and spaced review.',
      'Mocks at exam pace.',
      'Light review, one mock a week.',
      'Rest, a checklist, light review.',
    ]);
  });

  it('works for every certification the app lists', () => {
    for (const cert of CERTIFICATIONS) expect(domainBreakdown(cert, computeReadiness(cert, {}), [])).toHaveLength(cert.domains.length);
  });
});
