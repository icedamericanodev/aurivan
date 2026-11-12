/**
 * KaiSip Serif (mobile 2.1, FB-006): the upright reading font is Fraunces with
 * a conventional lowercase "f". These tests read the two font files directly
 * (no font library: the few table fields needed are parsed here) and pin what
 * makes the swap safe:
 *   - the files exist, are named as the app and the widgets expect, and carry their own name;
 *   - the new "f" is exactly as wide as Fraunces' "f", so no line of text reflows;
 *   - only the "f" (and the five f-ligature glyphs built from it) differs from Fraunces;
 *   - both licence texts ship beside the fonts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { font } from '../theme/tokens';

const MOBILE = path.resolve(__dirname, '..', '..');
const FONTS = path.join(MOBILE, 'assets', 'fonts');
const FRAUNCES = path.join(MOBILE, 'node_modules', '@expo-google-fonts', 'fraunces');

type Sfnt = { buf: Buffer; tables: Record<string, { offset: number; length: number }> };

function open(file: string): Sfnt {
  const buf = fs.readFileSync(file);
  const n = buf.readUInt16BE(4);
  const tables: Sfnt['tables'] = {};
  for (let i = 0; i < n; i++) {
    const at = 12 + i * 16;
    tables[buf.toString('latin1', at, at + 4)] = { offset: buf.readUInt32BE(at + 8), length: buf.readUInt32BE(at + 12) };
  }
  return { buf, tables };
}

/** Windows English name records: nameID → text. */
function names(f: Sfnt): Record<number, string> {
  const t = f.tables.name.offset;
  const count = f.buf.readUInt16BE(t + 2);
  const strings = t + f.buf.readUInt16BE(t + 4);
  const out: Record<number, string> = {};
  for (let i = 0; i < count; i++) {
    const r = t + 6 + i * 12;
    if (f.buf.readUInt16BE(r) !== 3) continue;
    const len = f.buf.readUInt16BE(r + 8);
    const off = strings + f.buf.readUInt16BE(r + 10);
    let s = '';
    for (let k = 0; k < len; k += 2) s += String.fromCharCode(f.buf.readUInt16BE(off + k));
    out[f.buf.readUInt16BE(r + 6)] = s;
  }
  return out;
}

/** Glyph index of a character (cmap format 4, the Windows BMP table). */
function glyphOf(f: Sfnt, ch: string): number {
  const t = f.tables.cmap.offset;
  const n = f.buf.readUInt16BE(t + 2);
  for (let i = 0; i < n; i++) {
    const r = t + 4 + i * 8;
    const sub = t + f.buf.readUInt32BE(r + 4);
    if (f.buf.readUInt16BE(r) !== 3 || f.buf.readUInt16BE(sub) !== 4) continue;
    const segs = f.buf.readUInt16BE(sub + 6) / 2;
    const ends = sub + 14;
    const starts = ends + segs * 2 + 2;
    const deltas = starts + segs * 2;
    const ranges = deltas + segs * 2;
    const code = ch.charCodeAt(0);
    for (let s = 0; s < segs; s++) {
      if (code > f.buf.readUInt16BE(ends + s * 2)) continue;
      const start = f.buf.readUInt16BE(starts + s * 2);
      if (code < start) return 0;
      const ro = f.buf.readUInt16BE(ranges + s * 2);
      const delta = f.buf.readUInt16BE(deltas + s * 2);
      if (ro === 0) return (code + delta) & 0xffff;
      const g = f.buf.readUInt16BE(ranges + s * 2 + ro + (code - start) * 2);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
  }
  throw new Error('no format 4 cmap');
}

const numGlyphs = (f: Sfnt) => f.buf.readUInt16BE(f.tables.maxp.offset + 4);

function advance(f: Sfnt, gid: number): number {
  const nH = f.buf.readUInt16BE(f.tables.hhea.offset + 34);
  return f.buf.readUInt16BE(f.tables.hmtx.offset + Math.min(gid, nH - 1) * 4);
}

/** The outline bytes of one glyph. */
function outline(f: Sfnt, gid: number): Buffer {
  const long = f.buf.readInt16BE(f.tables.head.offset + 50) === 1;
  const at = (i: number) => (long ? f.buf.readUInt32BE(f.tables.loca.offset + i * 4) : f.buf.readUInt16BE(f.tables.loca.offset + i * 2) * 2);
  return f.buf.subarray(f.tables.glyf.offset + at(gid), f.tables.glyf.offset + at(gid + 1));
}

const PAIRS = [
  { ours: 'KaiSipSerif_400Regular', theirs: path.join('400Regular', 'Fraunces_400Regular.ttf'), token: font.serif400, style: 'Regular' },
  { ours: 'KaiSipSerif_500Medium', theirs: path.join('500Medium', 'Fraunces_500Medium.ttf'), token: font.serif500, style: 'Medium' },
];

describe('KaiSip Serif: Fraunces with a conventional f', () => {
  it.each(PAIRS)('$ours is the font the tokens name, and carries its own name (not "Fraunces")', ({ ours, token, style }) => {
    expect(token).toBe(ours);
    const n = names(open(path.join(FONTS, `${ours}.ttf`)));
    expect(n[4]).toBe(`KaiSip Serif ${style}`);
    expect(n[6]).toBe(`KaiSipSerif-${style}`);
    expect(n[1]).not.toMatch(/Fraunces|Literata/);
    // Both copyright notices stay (SIL Open Font License 1.1).
    expect(n[0]).toMatch(/Fraunces Project Authors/);
    expect(n[0]).toMatch(/Literata Project Authors/);
    expect(n[13]).toMatch(/SIL Open Font License/);
  });

  it.each(PAIRS)('$ours: the f is new, exactly as wide as before, and no other letter changed', ({ ours, theirs }) => {
    const a = open(path.join(FONTS, `${ours}.ttf`));
    const b = open(path.join(FRAUNCES, theirs));
    expect(numGlyphs(a)).toBe(numGlyphs(b));
    const f = glyphOf(a, 'f');
    expect(f).toBe(glyphOf(b, 'f'));
    expect(outline(a, f).equals(outline(b, f))).toBe(false);
    // Same advance width: every line of text takes the room it took before (no reflow, no clipping).
    expect(advance(a, f)).toBe(advance(b, f));
    // The only other glyphs that differ are the five f-ligature glyphs (U+FB00 to U+FB04), which are built from f.
    const ligatures = new Set(['ﬀ', 'ﬁ', 'ﬂ', 'ﬃ', 'ﬄ'].map((c) => glyphOf(a, c)));
    const changed: number[] = [];
    for (let g = 0; g < numGlyphs(a); g++) {
      if (g === f || ligatures.has(g)) continue;
      if (!outline(a, g).equals(outline(b, g)) || advance(a, g) !== advance(b, g)) changed.push(g);
    }
    expect(changed).toEqual([]);
  });

  it('ships both licence texts beside the fonts', () => {
    expect(fs.readFileSync(path.join(FONTS, 'OFL-Fraunces.txt'), 'utf8')).toMatch(/Fraunces Project Authors[\s\S]*SIL OPEN FONT LICENSE Version 1\.1/);
    expect(fs.readFileSync(path.join(FONTS, 'OFL-Literata.txt'), 'utf8')).toMatch(/Literata Project Authors[\s\S]*SIL OPEN FONT LICENSE Version 1\.1/);
  });

  it('the app start-up loads the same two files the tokens name, and the italic stays Fraunces', () => {
    const layout = fs.readFileSync(path.join(MOBILE, 'src', 'app', '_layout.tsx'), 'utf8');
    for (const { ours } of PAIRS) expect(layout).toContain(`${ours}: require('../../assets/fonts/${ours}.ttf')`);
    expect(layout).not.toMatch(/fraunces\/(400Regular|500Medium)'/);
    expect(font.serif400Italic).toBe('Fraunces_400Regular_Italic');
  });
});
