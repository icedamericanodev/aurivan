import { CERTIFICATIONS, combinedTrademarkNotice } from '../content/certifications';

describe('combined trademark notice', () => {
  const notice = combinedTrademarkNotice(CERTIFICATIONS);

  it('says "not affiliated" once, naming every issuer', () => {
    expect(notice.match(/not affiliated/g)).toHaveLength(1);
    expect(notice).toContain('ISACA®');
    expect(notice).toContain('ISC2');
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
      'Aurivan is not affiliated with or endorsed by ISACA® or ISC2. CISA®, CISM® and CRISC® are registered trademarks of ISACA. AAIA is a trademark of ISACA. CISSP® is a registered trademark of ISC2, Inc.',
    );
  });
});
