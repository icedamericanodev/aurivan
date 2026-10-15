/**
 * Grove v2 design system: palettes, contrast, type scale, domain tones and
 * the small formatters.
 * Domains store a tone index (0–4), never a hex value; domainColor() turns
 * it into a colour for the current light/dark mode.
 */
import { CERTIFICATIONS, domainColor, getCertification } from '../content/certifications';
import type { DomainTone } from '../content/types';
import { shortDate, shortReference, shortSubtopic } from '../lib/format';
import { badgeEnamel, badgeMetal, badgeStruck, dark, domainPalette, font, grainOp, light, maxScale, type, type Palette } from '../theme/tokens';

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

  it('pins the Grove v2 anchor colours from the spec', () => {
    expect(light.bg).toBe('#F3F1EA');
    expect(dark.bg).toBe('#111613');
    expect(light.forest).toBe('#1E4A34');
    expect(dark.forest).toBe('#21432F'); // lifted in v2 so it separates from bg
    expect(light.sap).toBe('#A9D9BA');
    expect(dark.btn).toBe('#A9D9BA'); // dark primary button is light mint
  });

  it('keeps the paper grain faint (3.5% light since mobile 1.21, 4.5% dark since 1.9)', () => {
    expect(grainOp.light).toBeLessThanOrEqual(0.035);
    expect(grainOp.dark).toBeLessThanOrEqual(0.045);
  });

  it('depth: sheets sit one tier above the screen, and the forest panel is lit from the top in both themes (light since 1.21)', () => {
    // bg < raised2 (sheets, plates) and the panel's top edge is lighter than its body.
    expect(luminance(dark.raised2)).toBeGreaterThan(luminance(dark.bg));
    expect(luminance(dark.forestTop)).toBeGreaterThan(luminance(dark.forest));
    expect(luminance(light.raised2)).toBeGreaterThan(luminance(light.bg));
    expect(luminance(light.forestTop)).toBeGreaterThan(luminance(light.forest));
  });

  it('muted on soft is pinned at 4.53 light (disabled labels only: a disabled button\'s label on its `soft` fill)', () => {
    // Mobile 1.21: the warm #E9E6DC took it from 4.68 to 4.53, still AA. Never use this pair for live text.
    expect(Math.round(contrast(light.muted, light.soft) * 100) / 100).toBeGreaterThanOrEqual(4.53);
    expect(contrast(dark.muted, dark.soft)).toBeGreaterThanOrEqual(4.5);
  });

  it('green surfaces mean feedback only (mobile 1.21): `soft` is a neutral paper-grey, not a near-copy of correctBg', () => {
    const hue = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return { warm: r >= g, greenish: g > r && g > b };
    };
    expect(hue(light.soft).greenish).toBe(false);
    expect(hue(light.soft).warm).toBe(true);
    expect(hue(light.correctBg).greenish).toBe(true);
  });
});

// WCAG 2.x contrast ratio, the same maths as docs/mobile/design/contrast_v2.py.
function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text pairs ported from contrast_v2.py: [text colour, background].
const TEXT_PAIRS: [keyof Palette, keyof Palette][] = [
  ['ink', 'bg'], ['ink2', 'bg'], ['muted', 'bg'], ['ink', 'raised'], ['ink2', 'raised'],
  ['accentText', 'bg'], ['accentText', 'soft'], ['ink2', 'soft'], ['ink', 'soft'],
  ['onForest', 'forest'], ['onForest2', 'forest'], ['sap', 'forest'], ['onPill', 'pill'], ['onBtn', 'btn'],
  ['clay', 'bg'], ['tip', 'bg'], ['correct', 'correctBg'], ['ink', 'correctBg'], ['wrong', 'wrongBg'],
  ['ink', 'wrongBg'], ['bg', 'correct'], ['bg', 'wrong'], ['bg', 'ink'], ['bg', 'accent'],
  ['correct', 'bg'], ['wrong', 'bg'], ['tip', 'tipBg'],
  // Also used by the app: muted on raised (dimmed options), meta on tinted rows.
  ['muted', 'raised'], ['ink2', 'correctBg'], ['ink2', 'wrongBg'],
  // Mobile 1.9 dark depth: everything a page sheet shows on raised2, and the
  // forest panel's text on its lit top edge (forestTop).
  ['ink', 'raised2'], ['ink2', 'raised2'], ['muted', 'raised2'], ['accentText', 'raised2'],
  ['wrong', 'raised2'], ['tip', 'raised2'], ['clay', 'raised2'],
  ['onForest', 'forestTop'], ['onForest2', 'forestTop'], ['sap', 'forestTop'],
];
// Non-text pairs (controls, rings, the ✓/✗ badge): WCAG 1.4.11 needs 3:1.
const NON_TEXT_PAIRS: [keyof Palette, keyof Palette][] = [
  ['control', 'bg'], ['accent', 'track'], ['accent', 'bg'], ['sap', 'forestTrack'], ['ink', 'raised'],
  ['control', 'raised2'],
];

describe.each([
  ['light', light, domainPalette.light],
  ['dark', dark, domainPalette.dark],
] as const)('contrast in %s mode', (_mode, p, domains) => {
  it.each(TEXT_PAIRS)('text %s on %s passes AA (4.5:1)', (fg, bg) => {
    expect(contrast(p[fg], p[bg])).toBeGreaterThanOrEqual(4.5);
  });
  it.each(NON_TEXT_PAIRS)('non-text %s on %s passes 3:1', (fg, bg) => {
    expect(contrast(p[fg], p[bg])).toBeGreaterThanOrEqual(3);
  });
  it('every domain tone reads against the paper (3:1)', () => {
    for (const d of domains) expect(contrast(d, p.bg)).toBeGreaterThanOrEqual(3);
  });
  it('muted on bg survives the grain worst case (≥ 4.7:1)', () => {
    expect(contrast(p.muted, p.bg)).toBeGreaterThanOrEqual(4.7);
  });
});

describe('dark grain worst case (a full white speck under a glyph)', () => {
  const speck = (hex: string) => {
    const mix = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - grainOp.dark) + 255 * grainOp.dark));
    return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  };
  it.each([
    ['muted', 'bg'],
    ['ink2', 'bg'],
    ['onForest2', 'forest'],
    ['onForest2', 'forestTop'],
    ['sap', 'forestTop'],
  ] as [keyof Palette, keyof Palette][])('%s on %s still passes AA', (fg, bg) => {
    expect(contrast(dark[fg], speck(dark[bg]))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('type scale', () => {
  it('has exactly the spec styles', () => {
    expect(Object.keys(type).sort()).toEqual(
      ['body', 'caption', 'display', 'headline', 'hero', 'label', 'meta', 'number', 'quote', 'small', 'stage', 'stat', 'stem', 'tab'].sort(),
    );
  });
  it('uses Fraunces for reading moments and numbers, Figtree for UI', () => {
    for (const v of ['number', 'stat', 'display', 'hero', 'stem'] as const) expect(String(type[v].fontFamily)).toMatch(/^Fraunces_/);
    for (const v of ['quote', 'stage'] as const) expect(type[v].fontFamily).toBe(font.serif400Italic);
    for (const v of ['headline', 'label', 'body', 'small', 'meta', 'caption', 'tab'] as const) expect(String(type[v].fontFamily)).toMatch(/^Figtree_/);
  });
  it('never sets fontWeight (Android ignores it for custom fonts) or uppercase', () => {
    for (const s of Object.values(type)) {
      expect(s.fontWeight).toBeUndefined();
      expect(s.textTransform).toBeUndefined();
    }
  });
  it('keeps Fraunces at 18px or more', () => {
    for (const s of Object.values(type)) if (String(s.fontFamily).startsWith('Fraunces')) expect(s.fontSize).toBeGreaterThanOrEqual(18);
  });
  it('pins key sizes from the spec', () => {
    expect([type.number.fontSize, type.number.lineHeight]).toEqual([52, 52]);
    expect([type.display.fontSize, type.display.lineHeight]).toEqual([36, 42]);
    expect([type.stem.fontSize, type.stem.lineHeight]).toEqual([21, 30]);
    expect([type.body.fontSize, type.body.lineHeight]).toEqual([16, 24]);
    expect([type.tab.fontSize, type.tab.lineHeight]).toEqual([11, 14]);
  });
  it('lets reading text scale to 200% and caps titles and tab labels', () => {
    for (const v of ['stem', 'quote', 'body', 'small', 'meta', 'label', 'caption'] as const) expect(maxScale[v]).toBe(2);
    for (const v of ['display', 'hero', 'number', 'stat'] as const) expect(maxScale[v]).toBe(1.3);
    expect(maxScale.tab).toBe(1.2);
    for (const m of Object.values(maxScale)) expect(m).toBeGreaterThan(1);
  });
});

describe('shortReference', () => {
  it('keeps only the first citation, without its long name', () => {
    expect(shortReference('COBIT 2019 DSS01 (Managed Operations); ITIL 4 Change Enablement practice')).toBe('COBIT 2019 DSS01');
    expect(shortReference('ISACA IT Audit Standard 1207 (Irregularities and Illegal Acts)')).toBe('ISACA IT Audit Standard 1207');
  });
});

describe('shortSubtopic', () => {
  it('keeps the first phrase, at most 3 words, in sentence case', () => {
    expect(shortSubtopic('Year-End Close. Job Scheduling Control Bypass')).toBe('Year-end close');
    expect(shortSubtopic('Fraud Indicators. Auditor\'s First Action')).toBe('Fraud indicators');
  });
  it('keeps acronyms and drops a dangling "and"', () => {
    expect(shortSubtopic('BCM Exercise Types and Progression')).toBe('BCM exercise types');
    expect(shortSubtopic('Risk and Controls Mapping')).toBe('Risk and controls');
    // Question bank topic headers: no dangling preposition.
    expect(shortSubtopic('Brand Crisis During Ransomware Outage')).toBe('Brand crisis');
    expect(shortSubtopic('Database Encryption at Rest')).toBe('Database encryption');
  });
});

describe('shortDate', () => {
  it('formats dates as "6 Oct"', () => {
    expect(shortDate(new Date(2026, 9, 6, 12).getTime())).toBe('6 Oct');
    expect(shortDate(new Date(2027, 0, 31, 9).getTime())).toBe('31 Jan');
  });
});

// Mobile 1.10 badge art (art spec §6): the medallion is a graphic, so 3:1.
describe('badge art contrast (WCAG 1.4.11, 3:1)', () => {
  it.each(Object.entries(badgeEnamel))('every emblem role reads on the %s enamel', (_id, e) => {
    for (const role of ['E1', 'E2', 'E3'] as const) expect(contrast(e[role], e.field)).toBeGreaterThanOrEqual(3.5);
  });
  it.each(Object.values(badgeMetal).map((m) => [m.name, m] as const))('the %s rim stands out on both papers, and its pips on the rim', (_name, m) => {
    expect(contrast(m.edge, light.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(m.mid, dark.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(m.edge, m.mid)).toBeGreaterThanOrEqual(3);
  });
  it.each([
    ['light', light],
    ['dark', dark],
  ] as const)('a not-yet badge reads in %s: emblem on its field, stitched outline and progress trace on the paper', (_mode, p) => {
    expect(contrast(p.muted, p.soft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.control, p.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(p.accent, p.bg)).toBeGreaterThanOrEqual(3);
  });
  it.each([
    ['light', light],
    ['dark', dark],
  ] as const)('a not-yet badge on the forest panel reads in %s: on-forest outline and emblem, sap trace', (_mode, p) => {
    // "Next for your exam" draws it with surface="forest" (UX review H1: control on forest was 2.2–2.8:1).
    expect(contrast(p.onForest2, p.forest)).toBeGreaterThanOrEqual(3);
    expect(contrast(p.onForest2, p.forestTrack)).toBeGreaterThanOrEqual(3);
    expect(contrast(p.sap, p.forestTrack)).toBeGreaterThanOrEqual(3);
    expect(contrast(p.sap, p.forest)).toBeGreaterThanOrEqual(3);
  });
  it.each([
    ['light', light],
    ['dark', dark],
  ] as const)('the stitched outline against the not-yet field stays where it is in %s (it is judged on the page, 3:1+ above)', (_mode, p) => {
    // The outline sits ON the field's edge, so its 3:1 is against the page
    // (tested above). Against the field itself it is 2.92 light / 2.98 dark:
    // pinned here so a token change can never quietly make it worse. (Mobile
    // 1.21: light `soft` became the warm #E9E6DC, decided 15 Oct 2026; it was
    // 3.01 against the old mint-grey.)
    expect(contrast(p.control, p.soft)).toBeGreaterThanOrEqual(2.9);
  });
  it('a one-mark badge is struck in the calm sage: unnamed, not a tier metal, and it reads like one', () => {
    expect(badgeStruck.name).toBe('');
    for (const m of Object.values(badgeMetal)) expect(m.mid).not.toBe(badgeStruck.mid);
    expect(contrast(badgeStruck.edge, light.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(badgeStruck.mid, dark.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(badgeStruck.edge, badgeStruck.mid)).toBeGreaterThanOrEqual(3);
    for (const [k, v] of Object.entries(badgeStruck)) if (k !== 'name') expect(v).toMatch(HEX);
  });
  it('earned art is struck in hex colours (an object, the same in light and dark)', () => {
    for (const e of Object.values(badgeEnamel)) for (const v of Object.values(e)) expect(v).toMatch(HEX);
    for (const m of Object.values(badgeMetal)) for (const [k, v] of Object.entries(m)) if (k !== 'name') expect(v).toMatch(HEX);
  });
});
