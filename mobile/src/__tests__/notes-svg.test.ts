/**
 * Illustrations: CSS variables → theme colours (engine/notesSvg.ts).
 *
 * react-native-svg cannot resolve `var(--text)`, so every variable must be
 * swapped for a real colour of the current theme before drawing. These
 * tests check the swap for light and dark, and that every diagram in the
 * real notes file survives prepare → theme → react-native-svg's parser.
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'react-native-svg';
import { SVG_VAR_TOKENS, svgSize, themeSvg } from '../engine/notesSvg';
import { dark, light } from '../theme/tokens';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prepareIllustration } = require('../../scripts/notes-pack.cjs') as {
  prepareIllustration: (ill: unknown) => { ok: boolean; reason?: string; value?: { svg: string } };
};

const FONTS = { sans: 'Figtree_600SemiBold', mono: 'monospace' };
const SAMPLE =
  "<svg viewBox='0 0 460 150' xmlns='http://www.w3.org/2000/svg'>" +
  "<rect x='20' y='18' width='420' height='34' rx='4' fill='var(--accent-fill)'/>" +
  "<text x='230' y='39' font-family='Plus Jakarta Sans, Segoe UI, sans-serif' font-size='11' font-weight='700' fill='#ffffff'>Standards</text>" +
  "<rect x='20' y='60' width='420' height='34' fill='var(--surface)' stroke='var(--border2)' stroke-width='1'/>" +
  "<text x='230' y='81' font-family='JetBrains Mono, monospace' fill='var(--text)'>Guidelines</text>" +
  "<line x1='0' y1='0' x2='9' y2='9' stroke='var(--text2)'/><line stroke='var(--border)'/></svg>";

describe('themeSvg', () => {
  it.each([
    ['light', light],
    ['dark', dark],
  ] as const)('swaps every variable for the %s palette', (_name, palette) => {
    const out = themeSvg(SAMPLE, palette, FONTS);
    expect(out).not.toMatch(/var\(/);
    expect(out).toContain(`fill='${palette.forest}'`); // accent-fill (behind white text)
    expect(out).toContain(`fill='${palette.onForest}'`); // the white text itself
    // surface: light `raised` is white, and must NOT be turned into onForest.
    expect(out).toContain(`fill='${palette.raised}' stroke`);
    expect(out).toContain(`stroke='${palette.control}'`); // border2
    expect(out).toContain(`fill='${palette.ink}'`); // text
    expect(out).toContain(`stroke='${palette.ink2}'`); // text2
    expect(out).toContain(`stroke='${palette.line}'`); // border
    // The white label on the accent fill is now the on-forest colour.
    expect(out).toContain(`fill='${palette.onForest}'>Standards`);
  });

  it('gives light and dark different colours', () => {
    expect(themeSvg(SAMPLE, light, FONTS)).not.toEqual(themeSvg(SAMPLE, dark, FONTS));
  });

  it('points text at the app fonts and drops font-weight', () => {
    const out = themeSvg(SAMPLE, light, FONTS);
    expect(out).toContain("font-family='Figtree_600SemiBold'");
    expect(out).toContain("font-family='monospace'");
    expect(out).not.toMatch(/font-weight|Plus Jakarta|JetBrains/);
  });

  it('uses the CSS fallback for an unknown variable, else secondary text', () => {
    const out = themeSvg("<svg><rect fill='var(--nope, #123456)'/><rect fill='var(--also-nope)'/></svg>", light, FONTS);
    expect(out).toContain("fill='#123456'");
    expect(out).toContain(`fill='${light.ink2}'`);
  });

  it('maps only to real palette tokens', () => {
    for (const token of Object.values(SVG_VAR_TOKENS)) {
      expect(typeof light[token]).toBe('string');
      expect(typeof dark[token]).toBe('string');
    }
  });
});

describe('svgSize', () => {
  it('fits the column and keeps proportions', () => {
    expect(svgSize({ width: 460, height: 150 }, 350)).toEqual({ width: 350, height: 114 });
  });
  it('grows with large text, at most twice the column', () => {
    expect(svgSize({ width: 100, height: 50 }, 300, 1.5)).toEqual({ width: 450, height: 225 });
    expect(svgSize({ width: 100, height: 50 }, 300, 3)).toEqual({ width: 600, height: 300 });
  });
});

describe('every illustration in data/cisa_notes.json parses after theming', () => {
  // Collect every { svg } in the file, v1 or v2: the drawings carry over unchanged.
  const src = path.join(__dirname, '..', '..', '..', 'data', 'cisa_notes.json');
  const all: unknown[] = [];
  const walk = (o: unknown) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) {
        if (k === 'illustration') all.push(...(Array.isArray(v) ? v : [v]));
        else walk(v);
      }
    }
  };
  if (fs.existsSync(src)) walk(JSON.parse(fs.readFileSync(src, 'utf8')));

  it('finds the diagrams', () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it('each one is accepted by the pipeline and parsed by react-native-svg in both themes', () => {
    const rejected: string[] = [];
    for (const ill of all) {
      const r = prepareIllustration(ill);
      if (!r.ok) {
        rejected.push(r.reason ?? '?');
        continue;
      }
      for (const palette of [light, dark]) {
        const xml = themeSvg(r.value!.svg, palette, FONTS);
        expect(xml).not.toMatch(/var\(/);
        expect(() => parse(xml)).not.toThrow();
        expect(parse(xml)).not.toBeNull();
      }
    }
    // Today's diagrams are all simple and valid; a rejection means a broken drawing landed.
    expect(rejected).toEqual([]);
  });
});
