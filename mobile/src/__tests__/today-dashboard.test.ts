import { getCertification } from '../content/certifications';
import { areaStems } from '../engine/fieldGuide';
import { twigWeek } from '../engine/groveToday';
import { computeReadiness, type AnswerRecord } from '../engine/readiness';
import { firstFiveProgress, todayDomains } from '../engine/todayDashboard';

const cert = getCertification('cisa')!;

it('counts each fixed first-five question once across saved answers and the active session', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  expect(firstFiveProgress(ids, {}, {})).toEqual({ total: 5, done: 0, left: 5 });
  expect(firstFiveProgress(ids, { a: {}, unrelated: {} }, { a: {}, b: {} })).toEqual({ total: 5, done: 2, left: 3 });
  expect(firstFiveProgress(ids, Object.fromEntries(ids.map((id) => [id, {}])))).toEqual({ total: 5, done: 5, left: 0 });
  expect(firstFiveProgress([], {})).toEqual({ total: 0, done: 0, left: 0 });
});

it('uses all five real domain names in blueprint order and the existing weighted, sample-gated measure', () => {
  const answers: Record<string, AnswerRecord> = {};
  for (let i = 0; i < 30; i++) answers[`d1_${i}`] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 1, lastAssisted: true };
  for (let i = 0; i < 29; i++) answers[`d2_${i}`] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 1 };
  const r = computeReadiness(cert, answers);
  const rows = todayDomains(cert, r);
  expect(rows.map((d) => d.domain.name)).toEqual(cert.domains.map((d) => d.name));
  expect(rows).toHaveLength(5);
  expect(rows[0].figure).toMatchObject({ pct: 50, word: 'Building' }); // not unweighted 100% accuracy
  expect(rows[1].figure).toMatchObject({ pct: null, word: 'Too few yet' });
  expect(rows[2].figure).toMatchObject({ pct: null, word: 'Not started' });
  expect(rows.map((d) => [d.figure.pct, d.figure.word])).toEqual(areaStems(cert.domains, r.domains).map((d) => [d.pct, d.word]));
});

it('weekly activity is binary saved study dates, never inferred from answer timestamps or future dates', () => {
  const monday = new Date(2026, 10, 9, 23, 59).getTime();
  const tuesday = new Date(2026, 10, 10, 0, 1).getTime();
  const dates = ['2026-11-09', '2026-11-09', '2026-11-10'];
  expect(twigWeek(dates, monday).map((d) => d.on)).toEqual([true, false, false, false, false, false, false]);
  expect(twigWeek(dates, tuesday).map((d) => d.on)).toEqual([true, true, false, false, false, false, false]);
  expect(twigWeek(dates, tuesday).find((d) => d.today)?.i).toBe(1);
});
