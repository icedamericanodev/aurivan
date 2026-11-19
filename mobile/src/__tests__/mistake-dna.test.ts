import { mistakeDNA, type DNAInput } from '../engine/mistakeDNA';
import { PATTERN_COPY, PATTERN_ORDER, patternsOf, slipCoach } from '../engine/slipCoach';
import { DAY_MS } from '../engine/srs';
const now = Date.UTC(2026, 10, 9);
const row = (id: string, extra: Partial<DNAInput> = {}): DNAInput => ({ id, certId: 'cisa', at: now, correct: 'B', picked: 'A', tips: ['Final two: {{B}} beats {{C}}.'], stem: 'What should happen?', ...extra });
const analyze = (rows: DNAInput[]) => mistakeDNA(rows, 'cisa', now);

describe('Mistake DNA evidence', () => {
  it.each(['role', 'priority', 'tech-first', 'symptom', 'misread', 'knowledge'] as const)('classifies the existing %s tag as reflection', (slip) => {
    const r = analyze([row('x', { slip })]);
    expect(r.patterns[0]).toMatchObject({ pattern: slip, selfReported: 1, observed: 0 });
  });
  it('uses exact authored final two on original letters and a wrong Sure pick', () => {
    expect(patternsOf(row('a', { picked: 'C', confidence: 'sure' }))).toEqual(['runner-up', 'overconfident']);
    for (const tips of [['Final two: {{C}} is tempting.'], ['Final two: {{B}} {{C}} {{D}}'], ['Old tip C beats B']]) {
      expect(patternsOf(row('b', { picked: 'C', tips }))).toEqual([]);
    }
    for (const picked of ['B', undefined, 'Z']) expect(patternsOf(row('c', { picked, confidence: 'sure' }))).toEqual([]);
  });
  it('separates mixed evidence without counting a question twice in its denominator', () => {
    const r = analyze([row('1', { slip: 'role', picked: 'C', confidence: 'sure' }), row('2')]);
    expect(r).toMatchObject({ total: 2, classified: 1, unclassified: 1, tagged: 1, top: null });
    expect(r.patterns.map((x) => x.percent)).toEqual([100, 100, 100]);
    expect(r.patterns[0].observed).toBe(1);
    expect(r.patterns.find((x) => x.pattern === 'role')?.selfReported).toBe(1);
  });
  it('deduplicates by latest miss before comparing windows, including corrected questions', () => {
    const r = analyze([row('a', { slip: 'role', at: now - 20 * DAY_MS }), row('a', { slip: 'knowledge' }), row('b')]);
    expect(r.total).toBe(2);
    expect(r.previous.total).toBe(0);
    expect(r.patterns[0].pattern).toBe('knowledge');
    expect(analyze(JSON.parse(JSON.stringify([row('a', { slip: 'role' })])))).toEqual(analyze([row('a', { slip: 'role' })]));
  });
  it('withholds small samples and weak leading patterns', () => {
    expect(analyze([]).top).toBeNull();
    expect(analyze(Array.from({ length: 4 }, (_, i) => row(`${i}`, { slip: 'role' }))).top).toBeNull();
    expect(analyze(['role', 'role', 'knowledge', 'knowledge', 'symptom'].map((slip, i) => row(`${i}`, { slip: slip as 'role' }))).top).toBeNull();
  });
  it('uses distinct classified misses as denominator, ranks ties stably', () => {
    const rows = Array.from({ length: 5 }, (_, i) => row(`${i}`, { slip: 'role', picked: i < 3 ? 'C' : 'A' }));
    const r = analyze([...rows, row('unclassified')]);
    expect(r.top).toMatchObject({ pattern: 'role', count: 5, percent: 100 });
    expect(r.patterns[1]).toMatchObject({ pattern: 'runner-up', count: 3, percent: 60 });
    const tied = analyze(rows.map((x) => ({ ...x, picked: 'C' })));
    expect(tied.tied).toBe(true);
    expect(tied.top?.pattern).toBe(PATTERN_ORDER[0]);
    expect(analyze([...rows].reverse())).toEqual(analyze(rows));
  });
  it('compares shares with both windows sampled; activity volume is not mastery', () => {
    const previous = Array.from({ length: 10 }, (_, i) => row(`p${i}`, { at: now - 20 * DAY_MS, slip: i < 8 ? 'role' : 'knowledge' }));
    const recent = Array.from({ length: 5 }, (_, i) => row(`r${i}`, { slip: i < 2 ? 'role' : 'knowledge' }));
    expect(analyze([...previous, ...recent]).trend).toBe('less');
    expect(analyze(previous).trend).toBe('insufficient');
    expect(analyze([...previous, ...recent.map((x) => ({ ...x, slip: 'role' as const }))]).trend).toBe('more');
  });
  it('isolates certifications, drops missing dates, future and old observations, reset is empty', () => {
    expect(analyze([row('a', { certId: 'cc', slip: 'role' }), row('b', { at: NaN }), row('c', { at: now + 1 }), row('d', { at: now - 28 * DAY_MS - 1 })]).total).toBe(0);
    expect(analyze([row('edge', { at: now - 28 * DAY_MS })]).total).toBe(1);
    expect(analyze([])).toMatchObject({ total: 0, top: null, trend: 'insufficient' });
  });
  it('keeps the legacy coach threshold and existing registered remediation ids', () => {
    expect(slipCoach(Array.from({ length: 6 }, (_, i) => row(`${i}`, { picked: 'C' }))).ready).toBe(false);
    expect(PATTERN_COPY['runner-up'].game).toBe('trap');
    expect(PATTERN_COPY.priority.game).toBe('priority');
    expect(PATTERN_COPY.overconfident.game).toBe('sprint');
    expect(PATTERN_COPY.role.game).toBe('canopy');
    expect(PATTERN_COPY.knowledge.game).toBeNull();
  });
});

it('rejects derived ids stored as tags and conflicting correct-pick evidence', () => {
  for (const slip of ['runner-up', 'overconfident', 'unknown']) {
    const r = analyze([row('bad', { slip: slip as 'role' })]);
    expect(r).toMatchObject({ classified: 0, tagged: 0 });
  }
  expect(analyze([row('conflict', { picked: 'B', slip: 'role', confidence: 'sure' })]).classified).toBe(0);
});
it.each([[7, 8], [6, 7], [8, 7], [7, 6]])('treats exact ten-point trend %s/10 to %s/10 consistently', (before, after) => {
  const rows = (n: number, prefix: string, at: number) => Array.from({ length: 10 }, (_, i) => row(`${prefix}${i}`, { at, slip: i < n ? 'role' : 'knowledge' }));
  expect(analyze([...rows(before, 'p', now - 20 * DAY_MS), ...rows(after, 'r', now)]).trend).toBe('similar');
});
