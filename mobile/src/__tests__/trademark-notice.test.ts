import { CERTIFICATIONS, combinedTrademarkNotice } from '../content/certifications';

describe('combined trademark notice', () => {
  const notice = combinedTrademarkNotice(CERTIFICATIONS);

  it('says "not affiliated" once, naming every issuer', () => {
    expect(notice.match(/not affiliated/g)).toHaveLength(1);
    expect(notice).toContain('ISACA®');
    // Owner decision (27 Oct 2026): ISC2's own rule, ® on its marks including its name.
    expect(notice).toContain('ISC2®');
  });

  it('keeps every certification mark with the same registered status as its own notice', () => {
    for (const c of CERTIFICATIONS) {
      const mark = c.trademarkRegistered === false ? `${c.name} ` : `${c.name}®`;
      expect(notice).toContain(mark);
      // The per-cert notice and the combined one must agree on ® vs plain trademark.
      expect(c.trademarkNotice.includes(`${c.name}®`)).toBe(c.trademarkRegistered !== false);
    }
  });

  it('reads as plain sentences', () => {
    expect(notice).toBe(
      'KaiSip is not affiliated with or endorsed by ISACA® or ISC2®. CISA®, CISM® and CRISC® are registered trademarks of ISACA. AAIA is a trademark of ISACA. CISSP® is a registered trademark of ISC2, Inc.',
    );
  });
});

describe('ISC2 marks (owner decision, 27 Oct 2026)', () => {
  it('the CISSP notice writes ISC2® and CISSP®', () => {
    const cissp = CERTIFICATIONS.find((c) => c.id === 'cissp')!;
    expect(cissp.issuer).toEqual({ id: 'isc2', name: 'ISC2', site: 'isc2.org' });
    expect(cissp.trademarkNotice).toBe('Not affiliated with or endorsed by ISC2®. CISSP® is a registered trademark of ISC2, Inc.');
  });

  it('an issuer the app has no mark for is named plainly (a downloaded pack may bring one)', () => {
    const cisa = CERTIFICATIONS.find((c) => c.id === 'cisa')!;
    const other = { ...cisa, id: 'xyz', name: 'XYZ', issuer: { id: 'acme', name: 'Acme Org' }, trademarkRegistered: false };
    expect(combinedTrademarkNotice([other])).toBe('KaiSip is not affiliated with or endorsed by Acme Org. XYZ is a trademark of Acme Org.');
  });
});

// Course decisions of 27 Nov 2026, item 1: an exam may carry the mark it is sold under.
// A made-up course: three parts and a combined exam, all sold under one mark "QAZ".
describe('a shared mark is printed once', () => {
  const cisa = CERTIFICATIONS.find((c) => c.id === 'cisa')!;
  const acme = { id: 'acme', name: 'Acme Org' };
  const part = (id: string, name: string) => ({ ...cisa, id, name, issuer: acme, mark: 'QAZ' });

  it('several exams with one mark name it once, not once per exam', () => {
    const notice = combinedTrademarkNotice([part('qaz1', 'QAZ Part 1'), part('qaz2', 'QAZ Part 2'), part('qaz3', 'QAZ Part 3'), part('qazc', 'QAZ Bridge')]);
    expect(notice).toBe('KaiSip is not affiliated with or endorsed by Acme Org. QAZ® is a registered trademark of Acme Org.');
    expect(notice).not.toContain('Part');
  });

  it('a shared mark sits beside an exam that uses its own name', () => {
    const solo = { ...cisa, id: 'wsx', name: 'WSX', issuer: acme };
    expect(combinedTrademarkNotice([part('qaz1', 'QAZ Part 1'), solo, part('qaz2', 'QAZ Part 2')])).toBe(
      'KaiSip is not affiliated with or endorsed by Acme Org. QAZ® and WSX® are registered trademarks of Acme Org.',
    );
  });

  it('an unregistered shared mark is also named once, without ®', () => {
    const notice = combinedTrademarkNotice([
      { ...part('qaz1', 'QAZ Part 1'), trademarkRegistered: false },
      { ...part('qaz2', 'QAZ Part 2'), trademarkRegistered: false },
    ]);
    expect(notice).toBe('KaiSip is not affiliated with or endorsed by Acme Org. QAZ is a trademark of Acme Org.');
  });

  it('no course today sets a mark, so every live string is unchanged', () => {
    expect(CERTIFICATIONS.every((c) => c.mark === undefined)).toBe(true);
  });
});
