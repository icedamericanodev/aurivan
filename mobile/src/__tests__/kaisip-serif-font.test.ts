/**
 * KaiSip Serif: the upright reading font is Fraunces with a conventional
 * lowercase "f" (mobile 2.1, FB-006) and a capital "J" with a straight stem
 * (mobile 2.4 and web v13.2.1, FB-014). These tests read the font files directly
 * (no font library: the few table fields needed are parsed here) and pin what
 * makes the swap safe:
 *   - the files exist, are named as the app and the widgets expect, and carry their own name;
 *   - the new "f" and "J" are exactly as wide as Fraunces' own, so no line of text reflows;
 *   - only the "f", the "J" and the glyphs built from them differ from Fraunces;
 *   - the J sits on the baseline and its stem no longer swells to the right;
 *   - both licence texts ship beside the fonts;
 *   - the website's .woff2 files hold the same fonts as the phone's .ttf files,
 *     and every public page loads them (never plain Fraunces) for upright text.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { font } from '../theme/tokens';

const MOBILE = path.resolve(__dirname, '..', '..');
const FONTS = path.join(MOBILE, 'assets', 'fonts');
/** The website's fonts (the repo's assets/fonts, published by scripts/build_site.sh). */
const WEB_FONTS = path.resolve(MOBILE, '..', 'assets', 'fonts');
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

/** The glyph ids a composite glyph is built from (none for a plain outline). */
function components(f: Sfnt, gid: number): number[] {
  const g = outline(f, gid);
  if (g.length < 10 || g.readInt16BE(0) >= 0) return [];
  const out: number[] = [];
  let at = 10;
  for (;;) {
    const flags = g.readUInt16BE(at);
    out.push(g.readUInt16BE(at + 2));
    at += 4 + (flags & 0x0001 ? 4 : 2) + (flags & 0x0008 ? 2 : flags & 0x0040 ? 4 : flags & 0x0080 ? 8 : 0);
    if (!(flags & 0x0020)) break;
  }
  return out;
}

/** Every glyph built from `gid`, directly or through another composite (Ĵ, Ĳ, Ǉ, Ǌ for J). */
function builtFrom(f: Sfnt, gid: number): Set<number> {
  const found = new Set<number>([gid]);
  for (let grew = true; grew; ) {
    grew = false;
    for (let g = 0; g < numGlyphs(f); g++) {
      if (!found.has(g) && components(f, g).some((c) => found.has(c))) {
        found.add(g);
        grew = true;
      }
    }
  }
  found.delete(gid);
  return found;
}

/** The box of a glyph's outline, in font units. */
function box(f: Sfnt, gid: number) {
  const g = outline(f, gid);
  return { xMin: g.readInt16BE(2), yMin: g.readInt16BE(4), xMax: g.readInt16BE(6), yMax: g.readInt16BE(8) };
}

/** The outline points of a plain (not composite) glyph. */
function points(f: Sfnt, gid: number): { x: number; y: number }[] {
  const g = outline(f, gid);
  const contours = g.readInt16BE(0);
  let at = 10;
  let count = 0;
  for (let i = 0; i < contours; i++, at += 2) count = g.readUInt16BE(at) + 1;
  at += 2 + g.readUInt16BE(at); // hinting instructions (none in this font)
  const flags: number[] = [];
  while (flags.length < count) {
    const fl = g[at++];
    flags.push(fl);
    if (fl & 8) for (let r = g[at++]; r > 0; r--) flags.push(fl);
  }
  const read = (short: number, same: number) => {
    const out: number[] = [];
    let v = 0;
    for (const fl of flags) {
      if (fl & short) v += fl & same ? g[at++] : -g[at++];
      else if (!(fl & same)) {
        v += g.readInt16BE(at);
        at += 2;
      }
      out.push(v);
    }
    return out;
  };
  const xs = read(2, 16);
  const ys = read(4, 32);
  return xs.map((x, i) => ({ x, y: ys[i] }));
}

/**
 * The tables inside a .woff2 file (the website's font format), by name. The
 * outline tables (glyf, loca) are stored in a rearranged form, so they are
 * left out; every other table is stored as it is in a .ttf.
 */
function woff2Tables(file: string): Record<string, Buffer> {
  // prettier-ignore
  const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];
  const buf = fs.readFileSync(file);
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error(`${file} is not a woff2 file`);
  const n = buf.readUInt16BE(12);
  const compressed = buf.readUInt32BE(20);
  let at = 48;
  const base128 = () => {
    let v = 0;
    for (;;) {
      const b = buf[at++];
      v = v * 128 + (b & 0x7f);
      if (!(b & 0x80)) return v;
    }
  };
  const dir: { tag: string; length: number; plain: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const flags = buf[at++];
    let tag = KNOWN[flags & 0x3f];
    if ((flags & 0x3f) === 0x3f) {
      tag = buf.toString('latin1', at, at + 4);
      at += 4;
    }
    const version = flags >> 6;
    const original = base128();
    const rearranged = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
    dir.push({ tag, length: rearranged ? base128() : original, plain: !rearranged });
  }
  const data = zlib.brotliDecompressSync(buf.subarray(at, at + compressed));
  const out: Record<string, Buffer> = {};
  let off = 0;
  for (const t of dir) {
    if (t.plain) out[t.tag] = data.subarray(off, off + t.length);
    off += t.length;
  }
  return out;
}

const PAIRS = [
  { ours: 'KaiSipSerif_400Regular', theirs: path.join('400Regular', 'Fraunces_400Regular.ttf'), token: font.serif400, style: 'Regular' },
  { ours: 'KaiSipSerif_500Medium', theirs: path.join('500Medium', 'Fraunces_500Medium.ttf'), token: font.serif500, style: 'Medium' },
];

describe('KaiSip Serif: Fraunces with a conventional f and a straight J', () => {
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

  it.each(PAIRS)('$ours: the f and the J are new, exactly as wide as before, and no other letter changed', ({ ours, theirs }) => {
    const a = open(path.join(FONTS, `${ours}.ttf`));
    const b = open(path.join(FRAUNCES, theirs));
    expect(numGlyphs(a)).toBe(numGlyphs(b));
    const f = glyphOf(a, 'f');
    const J = glyphOf(a, 'J');
    expect(f).toBe(glyphOf(b, 'f'));
    expect(J).toBe(glyphOf(b, 'J'));
    expect(outline(a, f).equals(outline(b, f))).toBe(false);
    expect(outline(a, J).equals(outline(b, J))).toBe(false);
    // Same advance width: every line of text takes the room it took before (no reflow, no clipping).
    expect(advance(a, f)).toBe(advance(b, f));
    expect(advance(a, J)).toBe(advance(b, J));
    // The only other glyphs that differ are the ones built from them: the five f-ligature glyphs
    // (U+FB00 to U+FB04) and the letters that contain a J (Ĵ, Ĳ, Ǉ, Ǌ and their accented forms).
    const ligatures = new Set(['ﬀ', 'ﬁ', 'ﬂ', 'ﬃ', 'ﬄ'].map((c) => glyphOf(a, c)));
    const withJ = builtFrom(b, J);
    expect([...withJ]).toEqual(expect.arrayContaining(['Ĵ', 'Ĳ', 'Ǉ', 'Ǌ'].map((c) => glyphOf(b, c))));
    const changed: number[] = [];
    for (let g = 0; g < numGlyphs(a); g++) {
      const mayDiffer = g === f || g === J || ligatures.has(g) || withJ.has(g);
      // The f ligatures are rebuilt as plain side-by-side letters, so only they may change width.
      if (!ligatures.has(g) && advance(a, g) !== advance(b, g)) changed.push(g);
      else if (!mayDiffer && !outline(a, g).equals(outline(b, g))) changed.push(g);
    }
    expect(changed).toEqual([]);
    // The letters built from J are still built from the same parts.
    for (const g of withJ) expect(components(a, g)).toEqual(components(b, g));
  });

  it.each(PAIRS)('$ours: the J sits on the baseline, keeps its height, and its stem is straight', ({ ours, theirs }) => {
    const a = open(path.join(FONTS, `${ours}.ttf`));
    const b = open(path.join(FRAUNCES, theirs));
    const J = glyphOf(a, 'J');
    const cap = box(b, glyphOf(b, 'H')).yMax;
    const j = box(a, J);
    expect(j.yMax).toBe(cap);
    // On the baseline: only the usual small overshoot of a round bottom, as in Fraunces.
    expect(j.yMin).toBe(box(b, J).yMin);
    expect(j.yMin).toBeGreaterThanOrEqual(-40);
    // Inside its own box, with room on both sides (it never touches its neighbours).
    expect(j.xMin).toBeGreaterThanOrEqual(60);
    expect(advance(a, J) - j.xMax).toBeGreaterThanOrEqual(60);
    // The stem: its right edge low down is not further right than under the top serif.
    // In Fraunces it swells to the right on the way down (the shape FB-014 is about).
    const rightmost = (f: Sfnt, lo: number, hi: number) => Math.max(...points(f, J).filter((p) => p.y > lo * cap && p.y < hi * cap).map((p) => p.x));
    expect(rightmost(b, 0.14, 0.5)).toBeGreaterThan(rightmost(b, 0.5, 0.9) + 50); // Fraunces: swollen
    expect(rightmost(a, 0.14, 0.5)).toBeLessThanOrEqual(rightmost(a, 0.5, 0.9)); // KaiSip Serif: straight
  });

  it('ships both licence texts beside the fonts', () => {
    expect(fs.readFileSync(path.join(FONTS, 'OFL-Fraunces.txt'), 'utf8')).toMatch(/Fraunces Project Authors[\s\S]*SIL OPEN FONT LICENSE Version 1\.1/);
    expect(fs.readFileSync(path.join(FONTS, 'OFL-Literata.txt'), 'utf8')).toMatch(/Literata Project Authors[\s\S]*SIL OPEN FONT LICENSE Version 1\.1/);
  });

  it.each(PAIRS)('the website serves the same $ours (assets/fonts/*.woff2 is made from the phone file)', ({ ours }) => {
    const ttf = open(path.join(FONTS, `${ours}.ttf`));
    const web = woff2Tables(path.join(WEB_FONTS, `${ours}.woff2`));
    const table = (tag: string) => ttf.buf.subarray(ttf.tables[tag].offset, ttf.tables[tag].offset + ttf.tables[tag].length);
    // "head" holds a checksum of the whole file, which differs between the two formats.
    const compared = Object.keys(web).filter((tag) => tag !== 'head');
    // The name table carries the font's version, which changes whenever a glyph does.
    expect(compared).toEqual(expect.arrayContaining(['name', 'hmtx', 'cmap', 'GPOS', 'GSUB', 'OS/2']));
    for (const tag of compared) expect({ tag, same: web[tag].equals(table(tag)) }).toEqual({ tag, same: true });
    expect(fs.existsSync(path.join(WEB_FONTS, 'OFL-Fraunces.txt'))).toBe(true);
    expect(fs.existsSync(path.join(WEB_FONTS, 'OFL-Literata.txt'))).toBe(true);
  });

  it('every public web page loads KaiSip Serif for upright serif text, never plain Fraunces', () => {
    const root = path.resolve(MOBILE, '..');
    const legal = fs.readdirSync(path.join(root, 'docs', 'legal', 'cloud')).filter((n) => n.endsWith('.html')).map((n) => `docs/legal/cloud/${n}`);
    const pages = ['index.html', 'beta.html', 'beta-desk.html', 'privacy.html', 'terms.html', 'support.html', 'how-questions-are-made.html', 'assets/home.css', ...legal];
    for (const page of pages) {
      const css = fs.readFileSync(path.join(root, page), 'utf8');
      const serif = (css.match(/@font-face\s*{[^}]*}/g) ?? []).filter((x) => /Fraunces|KaiSip/.test(x));
      expect({ page, hasSerif: serif.length > 0 }).toEqual({ page, hasSerif: true });
      for (const x of serif) {
        const italic = /font-style:\s*italic/.test(x);
        const file = /fonts\/([A-Za-z0-9_]+)\.woff2/.exec(x)?.[1] ?? '';
        expect({ page, family: /font-family:\s*['"]KaiSip Serif['"]/.test(x) }).toEqual({ page, family: true });
        expect({ page, italic, ok: (italic ? /^Fraunces_400Regular_Italic$/ : /^KaiSipSerif_(400Regular|500Medium)$/).test(file) }).toEqual({ page, italic, ok: true });
      }
      // The page's serif stack names the family the faces define.
      expect({ page, stack: /--(f-serif|serif):\s*['"]KaiSip Serif['"]/.test(css) }).toEqual({ page, stack: true });
    }
  });

  it('the app start-up loads the same two files the tokens name, and the italic stays Fraunces', () => {
    const layout = fs.readFileSync(path.join(MOBILE, 'src', 'app', '_layout.tsx'), 'utf8');
    for (const { ours } of PAIRS) expect(layout).toContain(`${ours}: require('../../assets/fonts/${ours}.ttf')`);
    expect(layout).not.toMatch(/fraunces\/(400Regular|500Medium)'/);
    expect(font.serif400Italic).toBe('Fraunces_400Regular_Italic');
  });
});
