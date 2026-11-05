/**
 * Release bug hunt round 1: interface text never uses the owner's banned words
 * ("pass", "official", "guarantee", "evolve", "runner-up", "you're ready").
 * Before the fix the exam-week checklist said "the official candidate guide",
 * the Results coaching line said "trust the first pass", a past exam date read
 * "Date passed", and What's new 1.28.0 said "the official sources".
 */
import { chosenLine } from '../components/calendar';
import { getCertification } from '../content/certifications';
import { FAQ, WHATS_NEW } from '../content/support';
import { ACCOUNT_COPY } from '../content/cloud/copy';
import { EXAM_WEEK_ITEMS, examWeekText } from '../engine/examWeek';
import { COACHING } from '../engine/pace';
import { coachingLine } from '../lib/coachingCopy';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

const BANNED = /\b(pass|passed|guarantee|official|evolve|runner-up)\b|you’re ready|you're ready/i;

describe('no banned words in interface text', () => {
  it('the exam-week checklist', () => {
    const exam = getCertification('cisa')!.exam;
    for (const id of EXAM_WEEK_ITEMS) expect(examWeekText(id, exam)).not.toMatch(BANNED);
  });

  it('the Results coaching lines (as the phone says them; engine/pace.ts is shared with the website)', () => {
    for (const k of Object.keys(COACHING) as (keyof typeof COACHING)[]) {
      expect(COACHING[k].tag).not.toMatch(BANNED);
      expect(coachingLine(k)).not.toMatch(BANNED);
    }
  });

  it('the chosen-date line for a date already gone', () => {
    const line = chosenLine('2026-03-01', '2026-11-05');
    expect(line).toContain('Date has gone by');
    expect(line).not.toMatch(BANNED);
  });

  it("What's new and Common questions", () => {
    for (const e of WHATS_NEW) for (const s of [...(e.new ?? []), ...(e.improved ?? []), ...(e.fixed ?? [])]) expect(s).not.toMatch(BANNED);
    for (const f of FAQ) expect(`${f.question} ${f.answer.join(' ')}`).not.toMatch(BANNED);
  });

  it('the board team label', () => {
    expect(ACCOUNT_COPY['board.team']).not.toMatch(BANNED);
  });
});
