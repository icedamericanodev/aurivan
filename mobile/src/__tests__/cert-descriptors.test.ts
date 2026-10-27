/**
 * Certification descriptors (content packs, Phase A).
 *
 * - Every descriptor names its issuer as { id, name } (a downloaded pack's
 *   manifest will carry the same shape).
 * - The exam picker offers only `available` exams whose content is on this
 *   phone: a `coming_soon` exam never shows, so none of its facts (its
 *   question count included) can reach a screen.
 * - The CISM and CRISC entries follow the current outlines (still marked
 *   TO VERIFY before either launches).
 */
import { CERTIFICATIONS, getCertification, selectableCertifications } from '../content/certifications';
import { hasContent } from '../content/loader';
import { clearContentCaches, registerPackSource, type PackSource } from '../content/packs';

describe('descriptors', () => {
  it('each names its issuer as { id, name }, lower-case id, no ® in the name', () => {
    for (const c of CERTIFICATIONS) {
      expect(c.issuer.id).toMatch(/^[a-z0-9-]+$/);
      expect(c.issuer.name).not.toMatch(/®/);
    }
    expect(getCertification('cisa')!.issuer).toEqual({ id: 'isaca', name: 'ISACA' });
    expect(getCertification('cissp')!.issuer).toEqual({ id: 'isc2', name: 'ISC2' });
  });

  it('every id has the shape a backup accepts for an exam (content packs, fix 2)', () => {
    for (const c of CERTIFICATIONS) expect(c.id).toMatch(/^[a-z0-9-]{2,20}$/);
  });

  it('CISM follows the outline from 3 Nov 2026: 18/20/33/29', () => {
    expect(getCertification('cism')!.domains.map((d) => d.weight)).toEqual([18, 20, 33, 29]);
  });

  it('CRISC follows the outline in force since 3 Nov 2025: 26/22/32/20, renamed Domains 2 and 4', () => {
    const crisc = getCertification('crisc')!;
    expect(crisc.domains.map((d) => d.weight)).toEqual([26, 22, 32, 20]);
    expect(crisc.domains[1].name).toBe('Risk Assessment');
    expect(crisc.domains[3].name).toBe('Technology and Security');
  });

  it('every exam’s weights add up to about 100', () => {
    for (const c of CERTIFICATIONS) expect(Math.abs(c.domains.reduce((n, d) => n + d.weight, 0) - 100)).toBeLessThanOrEqual(0.5);
  });
});

describe('the exam picker', () => {
  it('offers only available exams with content on this phone, never a coming-soon one', () => {
    const offered = selectableCertifications(hasContent);
    expect(offered.map((c) => c.id)).toEqual(['cisa']);
    // Even if a coming-soon exam's content were on the phone, it stays off the picker.
    expect(selectableCertifications(() => true).some((c) => c.status === 'coming_soon')).toBe(false);
    // An available exam with no content here is not offered either.
    expect(selectableCertifications(() => false)).toEqual([]);
    expect(CERTIFICATIONS.filter((c) => c.status === 'coming_soon').length).toBeGreaterThan(0);
  });

  it('a downloaded pack for an exam with no descriptor never reaches the picker', () => {
    const fake: PackSource = {
      name: 'fake',
      certIds: () => ['zz9'],
      info: (id) => (id === 'zz9' ? { certId: 'zz9', rev: 5, schemaVersion: 1 } : null),
      domainIds: () => [],
      questions: () => null,
      notes: () => null,
      principles: () => null,
      exam: () => null,
      lessons: () => null,
      gameDeck: () => null,
    };
    const undo = registerPackSource(fake);
    try {
      expect(hasContent('zz9')).toBe(true);
      expect(selectableCertifications(hasContent).map((c) => c.id)).toEqual(['cisa']);
    } finally {
      undo();
      clearContentCaches();
    }
  });
});
