/**
 * Mobile 1.43, "The letters in the title" (engine/noteAcronyms.ts): the acronyms in a
 * study note's title, spelled out from the note's OWN text (no new hand-kept field).
 */
import { spells, titleAcronyms, titleAcronymTerms } from '../engine/noteAcronyms';
import { findNote, noteDomain } from '../content/notes';
import { getCertification } from '../content/certifications';

const allNotes = () => {
  const cert = getCertification('cisa')!;
  return cert.domains.flatMap((d) => noteDomain('cisa', d.id)!.topics.flatMap((t) => t.subtopics));
};

describe('the letters in the title', () => {
  it('finds the title’s acronyms (not IS or IT), each once, without a plural s', () => {
    expect(titleAcronymTerms('Recovery Objectives: RPO, RTO, MTD and MBCO')).toEqual(['RPO', 'RTO', 'MTD', 'MBCO']);
    expect(titleAcronymTerms('Shadow IT and Shadow AI')).toEqual(['AI']);
    expect(titleAcronymTerms('Secure Remote Access and VPNs')).toEqual(['VPN']);
    expect(titleAcronymTerms('Change control')).toEqual([]);
  });

  it('spells: first letters, hyphen parts, capitals, and joining words skipped (never first)', () => {
    expect(spells(['recovery', 'point', 'objective'], 'RPO')).toBe(true);
    expect(spells(['Computer-Assisted', 'Audit', 'Techniques'], 'CAAT')).toBe(true);
    expect(spells(['IT', 'Audit', 'Framework'], 'ITAF')).toBe(true);
    expect(spells(['security', 'information', 'and', 'event', 'management'], 'SIEM')).toBe(true);
    expect(spells(['The', 'Open', 'Group', 'Architecture', 'Framework'], 'TOGAF')).toBe(true);
    expect(spells(['and', 'risk', 'objective'], 'RO')).toBe(false);
    expect(spells(['configuration', 'management', 'database'], 'CMDB')).toBe(false);
  });

  it('the recovery objectives note: all four, from its own text', () => {
    expect(titleAcronyms(findNote('cisa', '4B1.2')!)).toEqual([
      { term: 'RPO', expansion: 'Recovery point objective' },
      { term: 'RTO', expansion: 'Recovery time objective' },
      { term: 'MTD', expansion: 'Maximum tolerable downtime' },
      { term: 'MBCO', expansion: 'Minimum business continuity objective' },
    ]);
  });

  it('across every note: each expansion spells its acronym, and a title with any unknown acronym gets no plate', () => {
    let plates = 0;
    for (const note of allNotes()) {
      const terms = titleAcronymTerms(note.name);
      const r = titleAcronyms(note);
      if (terms.length === 0) {
        expect(r).toBeNull();
        continue;
      }
      if (!r) continue;
      plates += 1;
      expect(r.map((x) => x.term.replace(/s$/, ''))).toEqual(terms);
      for (const x of r) expect(spells(x.expansion.split(/\s+/).map((w) => w.replace(/,$/, '')), x.term.replace(/s$/, ''))).toBe(true);
    }
    // Most titles with acronyms are spelled out in their own notes (27 of 34 on 26 Oct 2026).
    expect(plates).toBeGreaterThanOrEqual(25);
  });
});
