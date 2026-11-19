import { expansionLabs } from '../content/labs/expansion';
import { evaluateRoles, evaluateRisk, evaluateAuthority, evaluateWorkflow, evaluateDependencies } from '../engine/conceptLabExpansion';
test('segregation and independent detective review address different risks', () => {
    const l = expansionLabs.find(l => l.interaction === 'role-permissions')!;
    if (l.interaction !== 'role-permissions')
        throw Error();
    const c = l.config;
    expect(evaluateRoles(c.initialAssignments, false, c).findings).toHaveLength(2);
    expect(evaluateRoles(c.initialAssignments, true, c).findings).toHaveLength(2);
    expect(evaluateRoles([0, 1, 0, 1, 2], true, c)).toMatchObject({ findings: [], reviewEffective: true });
    expect(evaluateRoles([0, 1, 0, 1, 0], true, c).reviewEffective).toBe(false);
    expect(() => evaluateRoles([0], false, c)).toThrow(RangeError);
    expect(() => evaluateRoles([0, 1, 0, 1, 3], false, c)).toThrow(RangeError);
    expect(c.initialAssignments).toEqual([0, 0, 1, 1, 2]);
});
test('audit priorities respond to assumptions while preserving constraints', () => {
    const l = expansionLabs.find(l => l.interaction === 'risk-allocation')!;
    if (l.interaction !== 'risk-allocation')
        throw Error();
    const a = l.config.areas;
    expect(evaluateRisk(a, [true, true, false], 80)).toMatchObject({ scores: [16, 50, 8], hours: 80, findings: [] });
    expect(evaluateRisk(a, [false, true, false], 80).findings.join(' ')).toContain('mandatory');
    expect(evaluateRisk(a, [true, true, true], 80).findings.join(' ')).toContain('20 hours');
    for (const field of ['impact', 'likelihood', 'incidents'] as const) {
        const changed = a.map(x => ({ ...x }));
        changed[0][field]++;
        expect(evaluateRisk(changed, [true, false, false], 80).scores[0]).toBeGreaterThan(16);
    }
    const strong = a.map(x => ({ ...x }));
    strong[0].control++;
    expect(evaluateRisk(strong, [true, false, false], 80).scores[0]).toBeLessThan(16);
    expect(() => evaluateRisk(a, [], 80)).toThrow(RangeError);
    expect(() => evaluateRisk([{ ...a[0], impact: NaN }], [true], 80)).toThrow(RangeError);
    expect(evaluateRisk(a, [false, false, false], 0).hours).toBe(0);
});
test('authority assignments follow the charter and preserve independence', () => {
    const l = expansionLabs.find(l => l.interaction === 'authority-mapping')!;
    if (l.interaction !== 'authority-mapping')
        throw Error();
    const c = l.config;
    expect(evaluateAuthority(c.initialAssignments, c).findings).toHaveLength(6);
    expect(evaluateAuthority(c.decisions.map(d => d.expectedRole), c).findings).toEqual([]);
    expect(() => evaluateAuthority([99], c)).toThrow(RangeError);
});
test('emergency deferred testing must precede subsequent review', () => {
    const l = expansionLabs.find(l => l.interaction === 'control-workflow')!;
    if (l.interaction !== 'control-workflow')
        throw Error();
    const c = l.config;
    expect(evaluateWorkflow(c.initialOrder, false, c).findings).toEqual([]);
    expect(evaluateWorkflow([0, 1, 2, 4, 5, 3, 6], true, c).findings).toEqual([]);
    expect(evaluateWorkflow([0, 1, 2, 4, 5, 3, 6], false, c).findings.length).toBeGreaterThan(0);
    expect(evaluateWorkflow([0, 1, 2, 4, 5, 6, 3], true, c).findings.join(' ')).toContain('before closing');
    expect(evaluateWorkflow([0, 1, 2, 4, 5, 6], true, c).findings.join(' ')).toContain('Testing omitted');
    expect(evaluateWorkflow([0, 1, 4, 5, 6], true, c).findings.join(' ')).toContain('authorization');
    expect(evaluateWorkflow([], false, c).findings).toHaveLength(7);
    expect(() => evaluateWorkflow([0, 0], false, c)).toThrow(RangeError);
});
test('business processes require all dependencies and impact changes priority', () => {
    const l = expansionLabs.find(l => l.interaction === 'dependency-simulation')!;
    if (l.interaction !== 'dependency-simulation')
        throw Error();
    const c = l.config;
    expect(evaluateDependencies(c.processes, [true, true, true, false], 5, 4, c)).toMatchObject({ available: [true, true, false], impacts: [0, 0, 800], cost: 5, priorityOrder: [1, 0, 2] });
    expect(evaluateDependencies(c.processes, [false, true, true, false], 5, 4, c).available).toEqual([false, false, false]);
    expect(evaluateDependencies(c.processes, [true, true, true, true], 5, 4, c).findings[0]).toContain('7 resource units');
    expect(evaluateDependencies(c.processes, [false, false, false, false], 0, 0, c).impacts).toEqual([0, 0, 0]);
    const changed = c.processes.map(p => ({ ...p }));
    changed[2].criticality = 5;
    changed[2].hourlyLoss = 6000;
    expect(evaluateDependencies(changed, [false, false, false, false], 5, 4, c).priorityOrder[0]).toBe(2);
    expect(() => evaluateDependencies([{ ...c.processes[0], dependencies: [99] }], [true, false, false, false], 5, 4, c)).toThrow(RangeError);
    expect(() => evaluateDependencies(c.processes, [false], 5, 4, c)).toThrow(RangeError);
    expect(() => evaluateDependencies(c.processes, [true, false, false, false], 5, -1, c)).toThrow(RangeError);
});
