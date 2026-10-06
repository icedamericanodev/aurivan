/**
 * Forest design system: domain tones and the date format.
 * Domains store a tone index (0–4), never a hex value; domainColor() turns
 * it into a colour for the current light/dark mode.
 */
import { CERTIFICATIONS, domainColor, getCertification } from '../content/certifications';
import type { DomainTone } from '../content/types';
import { shortDate } from '../lib/format';
import { dark, light } from '../theme/tokens';

const HEX = /^#[0-9A-F]{6}$/i;
const TONES: DomainTone[] = [0, 1, 2, 3, 4];

describe('domainColor', () => {
  it('returns a hex colour for every tone in both modes', () => {
    for (const tone of TONES) {
      expect(domainColor(tone, false)).toMatch(HEX);
      expect(domainColor(tone, true)).toMatch(HEX);
    }
  });

  it('gives each tone its own colour, different in light and dark', () => {
    const lightSet = new Set(TONES.map((t) => domainColor(t, false)));
    const darkSet = new Set(TONES.map((t) => domainColor(t, true)));
    expect(lightSet.size).toBe(5);
    expect(darkSet.size).toBe(5);
    for (const t of TONES) expect(domainColor(t, true)).not.toBe(domainColor(t, false));
  });
});

describe('domain tones in the certification registry', () => {
  it('every CISA domain has a tone, and the five tones are all used', () => {
    const cisa = getCertification('cisa')!;
    const tones = cisa.domains.map((d) => d.tone);
    for (const tone of tones) expect(TONES).toContain(tone);
    expect(new Set(tones).size).toBe(cisa.domains.length);
  });

  it('no certification stores a hex colour on a domain', () => {
    for (const cert of CERTIFICATIONS) {
      for (const d of cert.domains) {
        expect(TONES).toContain(d.tone);
        expect(d).not.toHaveProperty('color');
      }
    }
  });
});

describe('palettes', () => {
  it('light and dark define the same tokens, all as hex colours', () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
    for (const v of [...Object.values(light), ...Object.values(dark)]) expect(v).toMatch(HEX);
  });
});

describe('shortDate', () => {
  it('formats dates as "6 Oct"', () => {
    expect(shortDate(new Date(2026, 9, 6, 12).getTime())).toBe('6 Oct');
    expect(shortDate(new Date(2027, 0, 31, 9).getTime())).toBe('31 Jan');
  });
});
