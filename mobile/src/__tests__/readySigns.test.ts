/**
 * Web v12.41 (the Progress page): the "Ready to book?" signs.
 * - sign 1 holds only after 7 days at 80% or more (a dip resets it);
 * - sign 2 needs 30 answers AND 70% in every domain;
 * - sign 3 needs 2 mocks with one full-length timed mock, and can be switched off;
 * - the copy never promises a result;
 * - the website reads the same engine (its bundle) and the readiness report's
 *   yardstick line word for word.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { YARDSTICK_LINE } from '../engine/domainBand';
import { shiftDay, type ReadinessDay } from '../engine/examReady';
import { allMetLine, domainsMet, mocksMet, readySigns, SIGN_TITLE, type ReadySignsInput } from '../engine/readySigns';

const TODAY = '2026-10-27';
const held = (days: number, low = 82): ReadinessDay[] =>
  Array.from({ length: days }, (_, k) => ({ day: shiftDay(TODAY, days - 1 - k), min: low, last: low }));
const strongDomains = ['1', '2', '3', '4', '5'].map((id) => ({ id, answered: 40, pct: 74 }));
const base = (over: Partial<ReadySignsInput> = {}): ReadySignsInput => ({
  readinessLog: held(7),
  today: TODAY,
  domains: strongDomains,
  mocks: [{ total: 50 }, { total: 150, timing: 'standard' }],
  examQuestions: 150,
  ...over,
});

describe('readySigns', () => {
  it('all three in place: the study-bar line and the ISACA check', () => {
    const r = readySigns(base());
    expect(r.signs.map((s) => [s.id, s.met])).toEqual([['low', true], ['domains', true], ['mocks', true]]);
    expect(r.allMet).toBe(true);
    expect(r.line).toBe(allMetLine(3));
    expect(r.line).toMatch(/^All three signs are in place\. This is this app’s own study bar, not a prediction of your result\.$/);
    expect(r.isacaLine).toBe('Check isaca.org before you book.');
  });

  it('sign 1: six days is not a week, and a dip inside the week resets it', () => {
    expect(readySigns(base({ readinessLog: held(6) })).signs[0].met).toBe(false);
    const dip = held(7).map((e, i) => (i === 3 ? { ...e, min: 79 } : e));
    expect(readySigns(base({ readinessLog: dip })).signs[0].met).toBe(false);
    expect(readySigns(base({ readinessLog: undefined })).signs[0].met).toBe(false);
  });

  it('sign 2: a domain under 30 answers or under 70% is not in place', () => {
    expect(domainsMet(strongDomains)).toBe(true);
    expect(domainsMet(strongDomains.map((d, i) => (i === 2 ? { ...d, answered: 29 } : d)))).toBe(false);
    expect(domainsMet(strongDomains.map((d, i) => (i === 4 ? { ...d, pct: 69 } : d)))).toBe(false);
    expect(domainsMet([])).toBe(false);
  });

  it('sign 3: two mocks, one full and timed', () => {
    expect(mocksMet([{ total: 150 }], 150)).toBe(false);
    expect(mocksMet([{ total: 50 }, { total: 50 }], 150)).toBe(false);
    expect(mocksMet([{ total: 50 }, { total: 150, timing: 'untimed' }], 150)).toBe(false);
    expect(mocksMet([{ total: 50 }, { total: 150, timing: 'plus25' }], 150)).toBe(true);
    expect(mocksMet([{ total: 150 }, { total: 50 }], 150)).toBe(true);
  });

  it('sign 3 can be switched off: two signs, and "Both signs" when they hold', () => {
    const r = readySigns(base({ mocks: [], mockSign: false }));
    expect(r.signs.map((s) => s.id)).toEqual(['low', 'domains']);
    expect(r.allMet).toBe(true);
    expect(r.line.startsWith('Both signs are in place.')).toBe(true);
  });

  it('not yet: the plain study-bar line, no ISACA line', () => {
    const r = readySigns(base({ mocks: [] }));
    expect(r.allMet).toBe(false);
    expect(r.line).toBe('This app’s own study bar, not a prediction of your result.');
    expect(r.isacaLine).toBeNull();
  });

  it('never promises a result', () => {
    const texts = [...Object.values(SIGN_TITLE), allMetLine(2), allMetLine(3), readySigns(base({ mocks: [] })).line];
    for (const t of texts) expect(t).not.toMatch(/\bpass|fail|guarantee|you.re ready|behind/i);
  });
});

describe('the website reads the same engine and words', () => {
  const ROOT = path.join(__dirname, '..', '..', '..');
  const sandbox: Record<string, unknown> = {};
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets', 'kaisip-plant.js'), 'utf8'), sandbox);
  const K = sandbox.KaiSipPlant as any;

  it('the bundle carries readySigns, the report rules, the bands and pace', () => {
    for (const k of ['readySigns', 'readinessReport', 'domainBand', 'pace']) expect(K[k]).toBeTruthy();
    const plain = (x: unknown) => JSON.parse(JSON.stringify(x));
    for (const over of [{}, { mocks: [] }, { readinessLog: held(3) }, { mockSign: false }])
      expect(plain(K.readySigns.readySigns(base(over)))).toEqual(plain(readySigns(base(over))));
    expect(K.domainBand.YARDSTICK_LINE).toBe(YARDSTICK_LINE);
  });

});
