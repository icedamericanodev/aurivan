/** Lesson integrity — every lesson must be well-formed and trustworthy. */
import { CERTIFICATIONS } from '../content/certifications';
import { lessonsFor, nextLesson } from '../content/lessons';

const all = CERTIFICATIONS.flatMap((c) => lessonsFor(c.id));

describe('lessons', () => {
  it('have unique ids', () => {
    expect(new Set(all.map((l) => l.id)).size).toBe(all.length);
  });
  it.each(all.map((l) => [l.id, l] as const))('%s is well-formed', (_id, l) => {
    const cert = CERTIFICATIONS.find((c) => c.id === l.certId)!;
    expect(cert.domains.some((d) => d.id === l.domainId)).toBe(true);
    expect(l.scenes[0].type).toBe('title');
    expect(l.scenes.at(-1)!.type).toBe('check'); // every lesson ends with retrieval
    expect(l.references.length).toBeGreaterThan(0);
    expect(l.provenance).toMatch(/Original/);
    expect(l.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const s of l.scenes) {
      if (s.type === 'check') {
        expect(s.correctIndex).toBeGreaterThanOrEqual(0);
        expect(s.correctIndex).toBeLessThan(s.options.length);
      }
    }
  });
  it('next lesson prefers the weakest domain', () => {
    expect(nextLesson('cisa', [], '4')?.domainId).toBe('4');
    expect(nextLesson('cisa', lessonsFor('cisa').map((l) => l.id))).toBeUndefined();
  });
});
