/**
 * Share card headline: honest, modest, and never a pass claim or the bank size.
 */
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { computeReadiness, type AnswerRecord } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
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
