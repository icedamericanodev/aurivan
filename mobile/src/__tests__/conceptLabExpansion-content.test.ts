import { findLab, labsFor } from '../content/labs';
import { expansionLabs } from '../content/labs/expansion';
import { findLesson } from '../content/lessons';
import { findNote } from '../content/notes';
import { findPrinciple } from '../content/principles';
import { findQuestion } from '../content/loader';
import { getCertification } from '../content/certifications';

it('adds five distinct interaction families across all five CISA domains while preserving the pilot', () => {
  expect(expansionLabs).toHaveLength(5);
  expect(new Set(expansionLabs.map(l => l.interaction)).size).toBe(5);
  expect(new Set(labsFor('cisa').map(l => l.domainId))).toEqual(new Set(['1', '2', '3', '4', '5']));
  expect(new Set(labsFor('cisa').map(l => l.id)).size).toBe(6);
  expect(findLab('cisa', 'cisa-lab-rto-rpo')?.interaction).toBe('recovery-timeline');
});

it.each(expansionLabs)('$id has valid related content, complete feedback, and certification-scoped links', lab => {
  expect(findLab('cisa', lab.id)).toBe(lab);
  for (const cert of ['aaia', 'crisc', 'cism', 'cc', '', 'missing']) expect(findLab(cert, lab.id)).toBeUndefined();
  expect(getCertification(lab.certId)!.domains.some(d => d.id === lab.domainId)).toBe(true);
  expect(findLesson(lab.lessonId)?.certId).toBe(lab.certId);
  expect(findNote(lab.certId, lab.noteId)).toBeTruthy();
  for (const id of lab.questionIds ?? []) expect(findQuestion(lab.certId, id)).toBeTruthy();
  for (const id of lab.principleIds ?? []) expect(findPrinciple(lab.certId, id)).toBeTruthy();
  for (const id of lab.relatedLabIds ?? []) expect(findLab(lab.certId, id)).toBeTruthy();
  expect(lab.explore.length).toBeGreaterThan(0);
  expect(lab.challenge.length).toBeGreaterThan(30);
  expect(lab.takeaway.length).toBeGreaterThan(30);
  expect(lab.references.length).toBeGreaterThan(0);
  for (const ref of lab.references) { expect(ref.url).toMatch(/^https:\/\//); expect(ref.section.length).toBeGreaterThan(0); }
  expect(lab.apply.options.length).toBeGreaterThanOrEqual(3);
  expect(Number.isInteger(lab.apply.correctIndex)).toBe(true);
  expect(lab.apply.correctIndex).toBeGreaterThanOrEqual(0);
  expect(lab.apply.correctIndex).toBeLessThan(lab.apply.options.length);
  expect(new Set(lab.apply.options.map(o => o.text)).size).toBe(lab.apply.options.length);
  for (const option of lab.apply.options) expect(option.feedback.length).toBeGreaterThan(60);
});
