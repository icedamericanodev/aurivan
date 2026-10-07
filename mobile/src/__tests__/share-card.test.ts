/**
 * Share card headline: honest, modest, and never a pass claim or the bank size.
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { computeReadiness, type AnswerRecord } from '../engine/readiness';
import { RANGE_MIN_ANSWERS, readinessRange } from '../engine/readinessRange';
import {
  daysStudied,
  isHonestShareText,
  notAffiliated,
  pickShareHeadline,
  shareMessage,
  shareOptions,
  type ShareHeadline,
  type ShareInput,
} from '../engine/shareCard';

const cisa = getCertification('cisa')!;
const TODAY = '2026-10-07';

/** `perDomain` answers in every CISA domain, 70% right. */
function answers(perDomain: number): Record<string, AnswerRecord> {
  const out: Record<string, AnswerRecord> = {};
  for (const d of cisa.domains) {
    for (let i = 0; i < perDomain; i++) {
      const ok = i < Math.round(perDomain * 0.7);
      out[`d${d.id}_${i}`] = { attempts: 1, correctCount: ok ? 1 : 0, lastCorrect: ok, lastAt: 0 };
    }
  }
  return out;
}

function input(perDomain: number, extra: Partial<ShareInput> = {}): ShareInput {
  const readiness = computeReadiness(cisa, answers(perDomain));
  return {
    certName: cisa.name,
    issuer: cisa.issuer,
    streak: 0,
    recentDays: [],
    today: TODAY,
    answered: readiness.domains.reduce((s, d) => s + d.answered, 0),
    range: readinessRange(cisa, readiness),
    ...extra,
  };
}

/** Every string a headline can put on the card or into the share text. */
const texts = (h: ShareHeadline) => [h.value ?? '', h.label, h.note ?? '', h.spoken, shareMessage(h, cisa.issuer)];

describe('share card headline', () => {
  it('with no data at all, falls back to a "starting" line with no number', () => {
    const h = pickShareHeadline(input(0));
    expect(h.kind).toBe('start');
    expect(h.value).toBeNull();
    expect(h.label).toBe('Starting my CISA prep');
  });

  it('with no range yet, uses the streak first, then days studied', () => {
    const withStreak = pickShareHeadline(input(2, { streak: 5, recentDays: ['2026-10-03', '2026-10-07'] }));
    expect(withStreak.kind).toBe('streak');
    expect(withStreak.value).toBe('5');

    const noStreak = pickShareHeadline(input(2, { streak: 1, recentDays: ['2026-09-01', '2026-10-01', '2026-10-07'] }));
    expect(noStreak.kind).toBe('days');
    // 2026-09-01 is outside the 2-week window.
    expect(noStreak.value).toBe('2');
  });

  it('shows the readiness range only once the range exists', () => {
    const below = input(7, { streak: 3 }); // 35 answers: below the threshold
    expect(below.range.enough).toBe(false);
    expect(shareOptions(below).some((h) => h.kind === 'range')).toBe(false);

    const above = input(40, { streak: 3 }); // 200 answers
    expect(above.range.enough).toBe(true);
    const h = pickShareHeadline(above);
    expect(h.kind).toBe('range');
    expect(h.value).toMatch(/^\d+–\d+%$/);
    expect(h.label).toBe('Estimated readiness');
  });

  it('never contains a pass claim or the bank total, in any option', () => {
    const bankTotal = String(getAllQuestions('cisa').length);
    for (const i of [input(0), input(2, { streak: 4, recentDays: [TODAY] }), input(40, { streak: 30, recentDays: [TODAY] })]) {
      for (const h of shareOptions(i)) {
        for (const t of texts(h)) {
          expect(isHonestShareText(t)).toBe(true);
          expect(t).not.toMatch(/ready to pass|will pass|guarantee/i);
          expect(t.split(/[^\d]+/)).not.toContain(bankTotal);
        }
      }
    }
  });

  it('the honesty guard catches pass claims', () => {
    expect(isHonestShareText('Ready to pass CISA!')).toBe(false);
    expect(isHonestShareText('I will pass')).toBe(false);
    expect(isHonestShareText('Estimated readiness 68–76%')).toBe(true);
  });

  it('counts distinct days inside the 2-week window only', () => {
    expect(daysStudied(['2026-09-23', '2026-09-24', '2026-10-07', '2026-10-07'], TODAY)).toBe(2);
    expect(daysStudied(['2026-10-08'], TODAY)).toBe(0); // a future day never counts
  });

  it('carries the trademark-safe line', () => {
    expect(notAffiliated('ISACA')).toBe('Not affiliated with ISACA.');
    expect(shareMessage(pickShareHeadline(input(0)), 'ISACA')).toContain('Not affiliated with ISACA.');
  });
});

describe('share card headline: edge cases (QA)', () => {
  /** `n` first answers spread over domain 1, `assisted` of them with Coach me. */
  function flat(n: number, assisted = 0): ShareInput {
    const recs: Record<string, AnswerRecord> = {};
    for (let i = 0; i < n; i++) {
      recs[`d${cisa.domains[i % cisa.domains.length].id}_${i}`] = {
        attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 0, lastAssisted: i < assisted,
      };
    }
    const readiness = computeReadiness(cisa, recs);
    return { certName: cisa.name, issuer: cisa.issuer, streak: 0, recentDays: [], today: TODAY, answered: n, range: readinessRange(cisa, readiness) };
  }

  it('shows the range at exactly the threshold, not one below', () => {
    expect(shareOptions(flat(RANGE_MIN_ANSWERS - 1)).some((h) => h.kind === 'range')).toBe(false);
    expect(pickShareHeadline(flat(RANGE_MIN_ANSWERS)).kind).toBe('range');
  });

  it('assisted first answers count half toward unlocking the range', () => {
    // 40 answers, 2 with Coach me = 39 effective: still no range.
    const i = flat(RANGE_MIN_ANSWERS, 2);
    expect(i.range.enough).toBe(false);
    expect(pickShareHeadline(i).kind).toBe('answered');
  });

  it('an expired (0) or 1-day streak is never the headline', () => {
    for (const streak of [0, 1]) {
      expect(shareOptions({ ...flat(3), streak }).map((h) => h.kind)).not.toContain('streak');
    }
    expect(pickShareHeadline({ ...flat(3), streak: 2 }).kind).toBe('streak');
  });

  it('days studied ignores days older than the window but keeps day 13', () => {
    expect(daysStudied(['2026-09-23'], TODAY)).toBe(0); // 14 days ago
    expect(daysStudied(['2026-09-24'], TODAY)).toBe(1); // 13 days ago
  });

  it('always offers at least one option, "start" last, and no duplicate kinds', () => {
    const opts = shareOptions({ ...flat(RANGE_MIN_ANSWERS), streak: 9, recentDays: [TODAY] });
    expect(opts.map((h) => h.kind)).toEqual(['range', 'streak', 'days', 'answered', 'start']);
    expect(shareOptions(flat(0)).map((h) => h.kind)).toEqual(['start']);
  });

  it('uses singular wording for 1 answer and 1 day', () => {
    const opts = shareOptions({ ...flat(1), recentDays: [TODAY] });
    expect(opts.find((h) => h.kind === 'answered')!.label).toBe('practice question answered');
    expect(opts.find((h) => h.kind === 'days')!.label).toBe('day studied in the last 2 weeks');
  });

  it('"start" is always present and last, even if the cert name trips the honesty guard', () => {
    // A (hypothetical) cert name containing "pass" would fail the guard: the
    // start option must survive anyway, without the name, so options[0] is defined.
    const opts = shareOptions({ ...flat(3), streak: 4, certName: 'Pass Ready' });
    expect(opts.length).toBeGreaterThan(0);
    const last = opts[opts.length - 1];
    expect(last.kind).toBe('start');
    expect(last.label).toBe('Starting my exam prep');
    expect(opts.every((h) => [h.label, h.spoken].every(isHonestShareText))).toBe(true);
    expect(pickShareHeadline({ ...flat(0), certName: 'Pass Ready' }).kind).toBe('start');
  });

  it('the streak is global, so its words never name the cert', () => {
    const h = shareOptions({ ...flat(3), streak: 6 }).find((o) => o.kind === 'streak')!;
    expect(h.label).toBe('day study streak');
    expect(h.spoken).toBe('A 6-day study streak.');
  });

  it('the readiness note says it is not an exam prediction', () => {
    const h = pickShareHeadline(flat(RANGE_MIN_ANSWERS));
    expect(h.note).toMatch(/not an exam prediction/);
  });
});
