import { findLab, labForNote, labsFor } from '../content/labs';
import { findLesson } from '../content/lessons';
import { findNote } from '../content/notes';
import { findQuestion } from '../content/loader';
import { getCertification } from '../content/certifications';
import { DEFAULT_RECOVERY_CONFIG, evaluateRecovery, formatClock, initialRecoveryState, validateRecoveryConfig } from '../engine/conceptLab';

// The lab is hidden from learners since mobile 2.2 (content/labs/enabled.ts). Its code is kept, so
// these tests turn the switch ON to keep proving the lab still works for the day it comes back.
jest.mock('../content/labs/enabled', () => ({ CONCEPT_LAB_ENABLED: true }));

describe('recovery objectives, independent of progress and storage', () => {
  test('the retailer starts at 80 minutes downtime and 30 minutes potential data loss', () => {
    expect(evaluateRecovery(80, 30)).toMatchObject({
      downtime: 80, dataGap: 30, rtoMet: true, rpoMet: false,
      restorationTime: '3:20 PM', recoveryPointTime: '1:30 PM',
    });
    expect(evaluateRecovery(80, 30).summary).toContain('not a count of verified lost transactions');
  });
  test.each([
    [80, 10, true, true], [80, 30, true, false],
    [150, 10, false, true], [150, 30, false, false],
    [120, 15, true, true], [121, 16, false, false],
    [0, 0, true, true], [180, 60, false, false],
  ])('%i minutes downtime and %i minutes gap: RTO met=%s, RPO met=%s', (recovery, gap, rtoMet, rpoMet) => {
    expect(evaluateRecovery(recovery, gap)).toMatchObject({ downtime: recovery, dataGap: gap, rtoMet, rpoMet });
  });
  test('reset restores both independent values and returns fresh state', () => {
    const edited = initialRecoveryState();
    edited.recovery = 180;
    edited.gap = 0;
    expect(initialRecoveryState()).toEqual({ recovery: 80, gap: 30 });
    expect(DEFAULT_RECOVERY_CONFIG.initialRecovery).toBe(80);
    expect(initialRecoveryState({ ...DEFAULT_RECOVERY_CONFIG, initialRecovery: 120, initialGap: 15 })).toEqual({ recovery: 120, gap: 15 });
  });
  test.each([-1, 181, 2.5, NaN, Infinity])('rejects invalid downtime %s', (value) => {
    expect(() => evaluateRecovery(value, 0)).toThrow(RangeError);
  });
  test.each([-1, 61, 2.5, NaN, Infinity])('rejects invalid recoverable gap %s', (value) => {
    expect(() => evaluateRecovery(0, value)).toThrow(RangeError);
  });
  test('rejects inconsistent content before using it', () => {
    expect(() => validateRecoveryConfig({ ...DEFAULT_RECOVERY_CONFIG, rto: 181 })).toThrow(RangeError);
    expect(() => initialRecoveryState({ ...DEFAULT_RECOVERY_CONFIG, initialGap: 61 })).toThrow(RangeError);
    expect(() => evaluateRecovery(0, 0, { ...DEFAULT_RECOVERY_CONFIG, outageMinutes: 1440 })).toThrow(RangeError);
  });
  test.each([
    [840, '2:00 PM'], [960, '4:00 PM'], [825, '1:45 PM'],
    [780, '1:00 PM'], [1020, '5:00 PM'], [0, '12:00 AM'],
    [720, '12:00 PM'], [1440, '12:00 AM'], [-15, '11:45 PM'],
  ])('formats scenario clock %i as %s', (minutes, expected) => {
    expect(formatClock(minutes)).toBe(expected);
  });
  test('rejects invalid clocks instead of rendering NaN', () => {
    expect(() => formatClock(NaN)).toThrow(RangeError);
  });
});

describe('certification-scoped concept lab content', () => {
  test('only CISA has a pilot; unknown and other certifications stay unaffected', () => {
    expect(labsFor('cisa')).toHaveLength(1);
    for (const cert of ['aaia', 'crisc', 'cc', 'csoe', '', 'missing']) {
      expect(labsFor(cert)).toEqual([]);
      expect(findLab(cert, 'cisa-lab-rto-rpo')).toBeUndefined();
      expect(labForNote(cert, '4B1.2')).toBeUndefined();
    }
  });
  test.each([undefined, '', '%', 'missing', 'CISA-LAB-RTO-RPO'])('invalid or missing ID %s has no match', (id) => {
    expect(findLab('cisa', id)).toBeUndefined();
  });
  test('stable links resolve to the original lesson, note, questions, and current domain', () => {
    const lab = findLab('cisa', 'cisa-lab-rto-rpo')!;
    expect(labForNote('cisa', '4B1.2')).toBe(lab);
    expect(getCertification(lab.certId)!.domains.some((domain) => domain.id === lab.domainId)).toBe(true);
    expect(findLesson(lab.lessonId)?.certId).toBe(lab.certId);
    expect(findNote(lab.certId, lab.noteId)?.domainId).toBe(lab.domainId);
    for (const id of lab.questionIds ?? []) expect(findQuestion(lab.certId, id)).toBeTruthy();
    expect(lab.references[0].url).toBe('https://doi.org/10.6028/NIST.SP.800-34r1');
    validateRecoveryConfig(lab.config);
  });
});


describe('authored lab stages', () => {
  test.each(labsFor('cisa'))('$id supplies usable explanations and complete audit reasoning', (lab) => {
    expect(lab.explore.rto).toContain('Recovery Time Objective');
    expect(lab.explore.rpo).toContain('Recovery Point Objective');
    expect(lab.explore.rpo).toContain('risk losing');
    expect(lab.explore.rpo).toContain('actually missing');
    expect(lab.apply.scenario.trim().length).toBeGreaterThan(80);
    expect(lab.apply.options.length).toBeGreaterThanOrEqual(3);
    expect(Number.isInteger(lab.apply.correctIndex)).toBe(true);
    expect(lab.apply.correctIndex).toBeGreaterThanOrEqual(0);
    expect(lab.apply.correctIndex).toBeLessThan(lab.apply.options.length);
    for (const option of lab.apply.options) {
      expect(option.text.trim().length).toBeGreaterThan(20);
      expect(option.feedback.trim().length).toBeGreaterThan(60);
    }
    expect(lab.apply.options[lab.apply.correctIndex].feedback).toContain('Management owns the risk');
  });
  test.each(labsFor('cisa'))('$id prediction key agrees with the pure recovery model', (lab) => {
    const result = evaluateRecovery(lab.challenge.recovery, lab.challenge.gap, lab.config);
    const index = result.rtoMet ? (result.rpoMet ? 0 : 1) : (result.rpoMet ? 2 : 3);
    expect(lab.challenge.options).toHaveLength(4);
    expect(lab.challenge.correctIndex).toBe(index);
    expect(new Set(lab.challenge.options).size).toBe(4);
  });
});

 test('rejects zero-width timeline ranges', () => {
  expect(() => evaluateRecovery(0, 0, { ...DEFAULT_RECOVERY_CONFIG, maxRecovery: 0, rto: 0, initialRecovery: 0 })).toThrow(RangeError);
  expect(() => evaluateRecovery(0, 0, { ...DEFAULT_RECOVERY_CONFIG, maxGap: 0, rpo: 0, initialGap: 0 })).toThrow(RangeError);
});
