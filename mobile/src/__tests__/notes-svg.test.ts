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
import { MIN_LABEL_PT, SVG_VAR_TOKENS, svgMinFontSize, svgSize, themeSvg } from '../engine/notesSvg';
import { dark, light, type Palette } from '../theme/tokens';

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

describe('accent-fill by role', () => {
  const svg =
    "<svg viewBox='0 0 100 50'><rect fill='var(--accent-fill)' stroke='var(--accent-fill)'/>" +
    "<text fill='var(--accent-fill)'>A</text><g fill='var(--accent-fill)'><circle r='2'/></g>" +
    "<line stroke='var(--accent-fill)'/></svg>";
  it.each([
    ['light', light],
    ['dark', dark],
  ] as const)('%s: text → accentText, box fill → forest, marks → accent', (_n, p) => {
    const out = themeSvg(svg, p, FONTS);
    expect(out).toContain(`<text fill='${p.accentText}'>`);
    expect(out).toContain(`<rect fill='${p.forest}' stroke='${p.accent}'/>`);
    expect(out).toContain(`<g fill='${p.accent}'>`);
    expect(out).toContain(`<line stroke='${p.accent}'/>`);
  });
});

describe('svgSize: smallest label at least 13pt', () => {
  it('reads the smallest text size (default 16)', () => {
    expect(svgMinFontSize("<svg><text font-size='11'>a</text><text font-size='7.5'>b</text></svg>")).toBe(7.5);
    expect(svgMinFontSize('<svg><text>a</text></svg>')).toBe(16);
  });
  it('fits the column when labels are already big enough', () => {
    expect(svgSize({ width: 300, height: 100 }, 350, { minFont: 16 })).toEqual({ width: 350, height: 117, labelPt: 18.7 });
  });
  it('zooms small labels to 13pt, wider than the column (it scrolls)', () => {
    const s1 = svgSize({ width: 460, height: 150 }, 353, { minFont: 7.5 });
    expect(s1.labelPt).toBeGreaterThanOrEqual(MIN_LABEL_PT);
    expect(s1.width).toBe(797);
    expect(s1.height).toBe(260);
  });
  it('grows with large text (to ×1.5) and never past 4 columns', () => {
    expect(svgSize({ width: 600, height: 50 }, 300, { minFont: 10, fontScale: 2 }).labelPt).toBe(19.5);
    expect(svgSize({ width: 600, height: 50 }, 300, { minFont: 1 }).width).toBe(1200);
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

  it('every label reaches 13pt once zoomed (except the width cap)', () => {
    for (const ill of all) {
      const r = prepareIllustration(ill);
      if (!r.ok) continue;
      const v = r.value as unknown as { svg: string; width: number; height: number };
      const size = svgSize(v, 353, { minFont: svgMinFontSize(v.svg) });
      if (size.width < 353 * 4) expect(size.labelPt).toBeGreaterThanOrEqual(MIN_LABEL_PT);
    }
  });

  it.each([
    ['light', light],
    ['dark', dark],
  ] as const)('%s: every text label has 4.5:1 contrast with what it sits on', (_n, palette) => {
    const failures: string[] = [];
    let checked = 0;
    for (const ill of all) {
      const r = prepareIllustration(ill);
      if (!r.ok) continue;
      for (const f of textContrast(themeSvg(r.value!.svg, palette, FONTS), palette)) {
        checked += 1;
        if (f.ratio < 4.5) failures.push(`"${f.text}" ${f.fg} on ${f.bg}: ${f.ratio.toFixed(2)}`);
      }
    }
    expect(checked).toBeGreaterThan(all.length); // every diagram has labels
    expect(failures).toEqual([]);
  });

  it('the checker catches the old bug: forest text on the dark background', () => {
    const [f] = textContrast(`<svg><text x='5' y='9' font-size='11' fill='${dark.forest}'>A</text></svg>`, dark);
    expect(f.bg).toBe(dark.bg);
    expect(f.ratio).toBeLessThan(2);
    // …and white text on its forest box passes.
    const [g] = textContrast(
      `<svg><rect x='0' y='0' width='50' height='20' fill='${dark.forest}'/><text x='5' y='14' font-size='11' fill='${dark.onForest}'>B</text></svg>`,
      dark,
    );
    expect(g.bg).toBe(dark.forest);
    expect(g.ratio).toBeGreaterThan(4.5);
  });
});

// ── Contrast helpers (WCAG 2.x relative luminance) ──────────────────────
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * For each <text>, find what is drawn under it: the LAST filled rect or
 * circle before it (document order) that contains the middle of the text's
 * baseline-anchored glyphs; else the page background (`bg`). Groups pass
 * their fill down to children. Our diagrams have no transforms or opacity.
 */
function textContrast(svg: string, palette: Palette): { text: string; fg: string; bg: string; ratio: number }[] {
  const num = (attrs: string, name: string) => Number((new RegExp(`\\b${name}=['"]([-\\d.]+)`).exec(attrs) || [])[1] ?? 0);
  const attr = (attrs: string, name: string) => (new RegExp(`\\b${name}=['"]([^'"]+)`).exec(attrs) || [])[1];
  const shapes: { hit: (x: number, y: number) => boolean; fill: string }[] = [];
  const groupFill: (string | undefined)[] = [];
  const out: { text: string; fg: string; bg: string; ratio: number }[] = [];
  const TAG = /<(\/?)([a-zA-Z]+)\b([^>]*?)(\/?)>([^<]*)/g;
  let m: RegExpExecArray | null;
  while ((m = TAG.exec(svg))) {
    const [, closing, tag, attrs, self, inner] = m;
    const inherited = groupFill.filter(Boolean).slice(-1)[0];
    if (tag === 'g') {
      if (closing) groupFill.pop();
      else if (!self) groupFill.push(attr(attrs, 'fill'));
      continue;
    }
    if (closing) continue;
    const fill = attr(attrs, 'fill') ?? inherited;
    if (tag === 'rect' && fill && fill !== 'none') {
      const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((n) => num(attrs, n));
      shapes.push({ fill, hit: (px, py) => px >= x && px <= x + w && py >= y && py <= y + h });
    } else if (tag === 'circle' && fill && fill !== 'none') {
      const [cx, cy, rr] = ['cx', 'cy', 'r'].map((n) => num(attrs, n));
      shapes.push({ fill, hit: (px, py) => (px - cx) ** 2 + (py - cy) ** 2 <= rr * rr });
    } else if (tag === 'text') {
      const size = num(attrs, 'font-size') || 16;
      const px = num(attrs, 'x');
      const py = num(attrs, 'y') - size * 0.35; // middle of a capital letter
      const under = [...shapes].reverse().find((sh) => sh.hit(px, py));
      const fg = fill ?? palette.ink;
      const bg = under?.fill ?? palette.bg;
      out.push({ text: inner.trim(), fg, bg, ratio: contrast(fg, bg) });
    }
  }
  return out;
}
