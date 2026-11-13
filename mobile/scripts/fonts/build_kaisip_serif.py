#!/usr/bin/env python3
"""
Builds "KaiSip Serif": the app's upright reading font with a conventional
lowercase "f" (FB-006, mobile 2.1).

PLAIN ENGLISH
  The brand serif is Fraunces. Its upright lowercase "f" has a flat, heavy
  hook at the top that learners read as "odd". That shape is the font's own
  design and Fraunces has no alternate "f". So this script makes a copy of
  each upright Fraunces weight the app ships and swaps in ONE glyph: the "f"
  of Literata (same licence, a conventional book "f"), scaled so its x-height,
  stem thickness and stem position match Fraunces. Every other letter, the
  spacing and the kerning are Fraunces, untouched. The italic is not changed
  (its "f" is conventional already).

  Both fonts are under the SIL Open Font License 1.1. A modified copy must
  carry a different name and keep both copyright notices and the licence:
  the result is named "KaiSip Serif", and the licences are in
  assets/fonts/OFL-Fraunces.txt and assets/fonts/OFL-Literata.txt.

USAGE (from mobile/, after npm ci)
  python3 scripts/fonts/build_kaisip_serif.py --literata "<path>/Literata[opsz,wght].ttf"
  python3 scripts/fonts/build_kaisip_serif.py --literata "<path>/..." --check   # compare with the committed files

  Literata's variable font: https://github.com/google/fonts/tree/main/ofl/literata
  (file "Literata[opsz,wght].ttf", version 3.103). Needs fontTools (pip install fonttools).

OUTPUT
  assets/fonts/KaiSipSerif_400Regular.ttf   (from Fraunces_400Regular)
  assets/fonts/KaiSipSerif_500Medium.ttf    (from Fraunces_500Medium)
"""
import argparse
import hashlib
import io
import os
import sys
import unicodedata

from fontTools.pens.boundsPen import BoundsPen
from fontTools.otlLib.builder import buildPairPosGlyphs, buildValue
from fontTools.pens.pointInsidePen import PointInsidePen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib.tables import otTables
from fontTools.pens.filterPen import FilterPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import GlyphComponent, Glyph
from fontTools.varLib.instancer import instantiateVariableFont

MOBILE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FRAUNCES = os.path.join(MOBILE, 'node_modules', '@expo-google-fonts', 'fraunces')
OUT = os.path.join(MOBILE, 'assets', 'fonts')

FAMILY = 'KaiSip Serif'
PS_FAMILY = 'KaiSipSerif'
VERSION = '1.000'

# Literata's optical size for the donor "f". 36 is its calm display cut: a
# lighter crossbar and hook than the 12pt cut, close to Fraunces' contrast.
OPSZ = 36

# (source folder/file stem, output file stem, style name, usWeightClass, donor weight)
# The donor weight is the Literata weight whose "f" stem, once scaled to
# Fraunces' x-height, is as thick as the stem of Fraunces' own "f" (found by
# trying weights; the script prints both thicknesses so a drift is visible).
WEIGHTS = [
    ('400Regular', 'KaiSipSerif_400Regular', 'Regular', 400, 490),
    ('500Medium', 'KaiSipSerif_500Medium', 'Medium', 500, 587),
]

# The donor's hook reaches further to the right than Fraunces leaves room for:
# Literata relies on fi/fl ligatures to keep the hook off the next letter, and
# Fraunces has no real ligatures. So the part of the hook to the right of the
# stem is narrowed to this share of its width (heights and thicknesses of the
# stem and crossbar are untouched). With that, the new "f" keeps Fraunces' own
# advance width, so no line of text in the app gets longer or shorter, and
# "fi", "fl", "ff", "f?" and "f)" stay clear.
HOOK_NARROW = 0.72

# After narrowing, a few rarer followers still come too close to the hook
# ("fb", "f)", "f]", an apostrophe or closing quote, "fï"). For every glyph that
# would sit nearer than this to the new "f" (font units, 2000 per em), a kerning
# pair opens the gap to exactly this. The common pairs (fi, fl, fh, fk, ft, ff
# and every f + round letter) are already clear, so they get no kerning and
# keep Fraunces' widths.
MIN_GAP = 40
MAX_KERN = 140

LIGATURES = {  # glyph name -> parts (Fraunces builds these as plain side-by-side letters)
    'f_f': ['f', 'f'],
    'fi': ['f', 'i'],
    'fl': ['f', 'l'],
    'f_f_i': ['f', 'f', 'i'],
    'f_f_l': ['f', 'f', 'l'],
}


def stem_span(font, glyph, y):
    """Left edge, right edge of the ink of `glyph` on the horizontal line y (font units)."""
    gs = font.getGlyphSet()
    width = int(gs[glyph].width)
    inside = []
    for x in range(0, width):
        pen = PointInsidePen(gs, (x + 0.5, y))
        gs[glyph].draw(pen)
        if pen.getResult():
            inside.append(x)
    # the first unbroken run from the left is the stem (the crossbar sits higher than y)
    run = [inside[0]]
    for x in inside[1:]:
        if x != run[-1] + 1:
            break
        run.append(x)
    return run[0], run[-1] + 1


BIN = 10  # height of one horizontal band of the outline, in font units


def edge_profile(glyph_set, name):
    """For each 10-unit band of height: the leftmost and rightmost x of the glyph's outline in it."""
    pen = DecomposingRecordingPen(glyph_set)
    glyph_set[name].draw(pen)
    pts = []

    def line(a, b):
        n = max(1, int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) // 4))
        for i in range(n + 1):
            t = i / n
            pts.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))

    def quad(a, c, b):
        n = max(2, int((abs(c[0] - a[0]) + abs(c[1] - a[1]) + abs(b[0] - c[0]) + abs(b[1] - c[1])) // 4))
        for i in range(n + 1):
            t = i / n
            pts.append(((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
                        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]))

    cur = start = None
    for op, args in pen.value:
        if op == 'moveTo':
            cur = start = args[0]
        elif op == 'lineTo':
            line(cur, args[0])
            cur = args[0]
        elif op == 'qCurveTo':
            pts_ = list(args)
            if pts_[-1] is None:  # a closed curve with no on-curve point: start between the last two controls
                pts_ = pts_[:-1]
                cur = start = ((pts_[-1][0] + pts_[0][0]) / 2, (pts_[-1][1] + pts_[0][1]) / 2)
                pts_.append(cur)
            for i, c in enumerate(pts_[:-1]):
                nxt = pts_[i + 1]
                end = nxt if i == len(pts_) - 2 else ((c[0] + nxt[0]) / 2, (c[1] + nxt[1]) / 2)
                quad(cur, c, end)
                cur = end
        elif op in ('closePath', 'endPath'):
            if cur is not None and start is not None and cur != start:
                line(cur, start)
            cur = start
    left, right = {}, {}
    for x, y in pts:
        b = int(y // BIN)
        left[b] = min(left.get(b, x), x)
        right[b] = max(right.get(b, x), x)
    return left, right


def existing_kern(font, first, second):
    """Fraunces' own kerning for the pair (its one class-based kern lookup)."""
    total = 0
    for lookup in font['GPOS'].table.LookupList.Lookup:
        for st in lookup.SubTable:
            t = getattr(st, 'ExtSubTable', st)
            if type(t).__name__ != 'PairPos' or first not in t.Coverage.glyphs:
                continue
            if t.Format == 1:
                for rec in t.PairSet[t.Coverage.glyphs.index(first)].PairValueRecord:
                    if rec.SecondGlyph == second and rec.Value1:
                        total += rec.Value1.XAdvance or 0
            else:
                c1 = t.ClassDef1.classDefs.get(first, 0)
                c2 = t.ClassDef2.classDefs.get(second, 0)
                v = t.Class1Record[c1].Class2Record[c2].Value1
                total += (v.XAdvance or 0) if v else 0
            break  # the first subtable that covers `first` decides, as in a shaping engine
    return total


def hook_kerning(font, untouched):
    """
    {follower glyph: extra space} so nothing sits closer than MIN_GAP to the new f's hook.
    The followers are measured on `untouched` (a second, read-only copy of Fraunces), so
    that reading their outlines cannot make fontTools re-encode them in the font being saved.
    """
    gs = untouched.getGlyphSet()
    adv = font['hmtx']['f'][0]
    _, f_right = edge_profile(font.getGlyphSet(), 'f')
    pairs = {}
    # Only real characters that can follow an f in text: not accents on their own or combining marks.
    followers = {g for cp, g in font.getBestCmap().items() if unicodedata.category(chr(cp)) not in ('Mn', 'Mc', 'Me', 'Sk', 'Lm', 'Zs', 'Cc', 'Cf')}
    for name in font.getGlyphOrder():
        if name in ('f', '.notdef') or name in LIGATURES or name not in followers or font['hmtx'][name][0] == 0:
            continue
        left, _ = edge_profile(gs, name)
        if not left:
            continue
        gap = None
        for b, fx in f_right.items():
            for near in (b - 3, b - 2, b - 1, b, b + 1, b + 2, b + 3):  # 30 units of slack up and down
                if near in left:
                    g = adv + left[near] - fx
                    gap = g if gap is None else min(gap, g)
        if gap is None:
            continue
        need = MIN_GAP - (gap + existing_kern(font, 'f', name))
        if need >= 1:
            pairs[name] = min(MAX_KERN, int(round(need)))
    return pairs


def add_kern_lookup(font, pairs):
    """Append one more pair-kerning lookup (f + follower) to the font's `kern` feature."""
    gpos = font['GPOS'].table
    glyph_map = font.getReverseGlyphMap()
    sub = buildPairPosGlyphs({('f', g): (buildValue({'XAdvance': v}), None) for g, v in pairs.items()}, glyph_map)
    lookup = otTables.Lookup()
    lookup.LookupType, lookup.LookupFlag = 2, 0
    lookup.SubTable = sub
    lookup.SubTableCount = len(sub)
    gpos.LookupList.Lookup.append(lookup)
    gpos.LookupList.LookupCount = len(gpos.LookupList.Lookup)
    index = gpos.LookupList.LookupCount - 1
    for rec in gpos.FeatureList.FeatureRecord:
        if rec.FeatureTag == 'kern':
            rec.Feature.LookupListIndex.append(index)
            rec.Feature.LookupCount = len(rec.Feature.LookupListIndex)


class NarrowHookPen(FilterPen):
    """
    Pulls every point right of `x_stem` towards the stem: by `k_hook` above
    `y_cut` (the hook), by `k_bar` below it (the right arm of the crossbar).
    """

    def __init__(self, out, x_stem, y_cut, k_hook, k_bar):
        super().__init__(out)
        self.x_stem, self.y_cut, self.k_hook, self.k_bar = x_stem, y_cut, k_hook, k_bar

    def _pt(self, pt):
        x, y = pt
        if x > self.x_stem:
            x = self.x_stem + (x - self.x_stem) * (self.k_hook if y > self.y_cut else self.k_bar)
        return (x, y)

    def moveTo(self, pt):
        self._outPen.moveTo(self._pt(pt))

    def lineTo(self, pt):
        self._outPen.lineTo(self._pt(pt))

    def qCurveTo(self, *points):
        self._outPen.qCurveTo(*[p if p is None else self._pt(p) for p in points])

    def curveTo(self, *points):
        self._outPen.curveTo(*[self._pt(p) for p in points])


def donor_for(literata_path, wght, scale_from_xheight):
    """Literata at the donor weight, and the scale that makes its x-height Fraunces' x-height."""
    inst = instantiateVariableFont(TTFont(literata_path), {'opsz': OPSZ, 'wght': wght})
    return inst, scale_from_xheight(inst)


def build_one(src_stem, out_stem, style, weight_class, wght, literata_path):
    src = os.path.join(FRAUNCES, src_stem, f'Fraunces_{src_stem}.ttf')
    # recalcBBoxes off: saving must not touch any glyph but the ones changed below.
    font = TTFont(src, recalcBBoxes=False)
    untouched = TTFont(src)  # read-only copy, for measuring
    upm = font['head'].unitsPerEm
    xh = font['OS/2'].sxHeight
    glyf, hmtx = font['glyf'], font['hmtx']

    old_adv, _old_lsb = hmtx['f']
    f_left, f_right = stem_span(untouched, 'f', xh * 0.45)

    inst, scale = donor_for(literata_path, wght, lambda i: xh / i['OS/2'].sxHeight)
    d_left, d_right = stem_span(inst, 'f', inst['OS/2'].sxHeight * 0.45)
    dx = round(f_left - d_left * scale)  # the new stem starts where the old stem started

    donor_gs = inst.getGlyphSet()
    pen = TTGlyphPen(None)
    d_xh = inst['OS/2'].sxHeight
    # The crossbar's right arm ends where Fraunces' crossbar ended, so "fy", "fv" and "fw" keep their gap.
    bar = lambda profile, xheight: max(x for b, x in profile.items() if 0.8 * xheight <= b * BIN <= 1.06 * xheight)
    old_bar = bar(edge_profile(untouched.getGlyphSet(), 'f')[1], xh)
    d_bar = bar(edge_profile(donor_gs, 'f')[1], d_xh)
    k_bar = min(1.0, ((old_bar - dx) / scale - d_right) / (d_bar - d_right))
    narrow = NarrowHookPen(TransformPen(pen, (scale, 0, 0, scale, dx, 0)), d_right, d_xh * 1.08, HOOK_NARROW, k_bar)
    donor_gs['f'].draw(narrow)
    new_f = pen.glyph()
    new_f.program = None  # unhinted, like the rest of the static Fraunces
    if hasattr(new_f, 'removeHinting'):
        new_f.removeHinting()
    glyf['f'] = new_f
    new_f.recalcBounds(glyf)

    # Advance: Fraunces' own, so text takes exactly the room it took before.
    new_adv = old_adv
    hmtx['f'] = (new_adv, new_f.xMin)

    # Kerning for the few followers that would still touch the hook.
    kern = hook_kerning(font, untouched)
    add_kern_lookup(font, kern)

    # Ligature glyphs (U+FB00..FB04): plain side-by-side letters again, on the new widths.
    for name, parts in LIGATURES.items():
        g = Glyph()
        g.numberOfContours = -1
        g.components = []
        x = 0
        for part in parts:
            c = GlyphComponent()
            c.glyphName = part
            c.x, c.y = x, 0
            c.flags = 0x0004 | 0x0002  # round to grid, args are x/y values
            g.components.append(c)
            x += hmtx[part][0]
        glyf[name] = g
        g.recalcBounds(glyf)
        hmtx[name] = (x, g.xMin)

    # The "liga" rules f+i -> fi and friends only swapped in those same side-by-side
    # letters. Without them the phone spaces f and i like any two letters (letter
    # spacing included), so drop the rules that start with f.
    for lookup in font['GSUB'].table.LookupList.Lookup:
        for st in lookup.SubTable:
            t = getattr(st, 'ExtSubTable', st)
            if hasattr(t, 'ligatures') and 'f' in t.ligatures:
                del t.ligatures['f']

    # Names: a new family name (OFL: a modified version is renamed) and both notices.
    name = font['name']
    full = f'{FAMILY} {style}'
    ps = f'{PS_FAMILY}-{style}'
    copyright_ = (
        'Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces). '
        'Lowercase f: Copyright 2017 The Literata Project Authors (https://github.com/googlefonts/literata).'
    )
    description = (
        'KaiSip Serif is Fraunces with one glyph changed: the upright lowercase f is taken from Literata '
        f'(optical size {OPSZ}), scaled to Fraunces. A modified version under the SIL Open Font License 1.1.'
    )
    for rec in list(name.names):
        if rec.nameID in (16, 17, 7, 25):
            name.removeNames(nameID=rec.nameID)
    for nid, value in ((0, copyright_), (1, FAMILY if style == 'Regular' else full), (2, 'Regular'),
                       (3, f'{VERSION};KAISIP;{ps}'), (4, full), (5, f'Version {VERSION}; Fraunces 1.000 + Literata 3.103 f'),
                       (6, ps), (10, description)):
        name.setName(value, nid, 3, 1, 0x409)
    if style != 'Regular':
        name.setName(FAMILY, 16, 3, 1, 0x409)
        name.setName(style, 17, 3, 1, 0x409)
    font['OS/2'].usWeightClass = weight_class
    # A fixed time stamp, so the same inputs always give the same bytes (--check).
    font['head'].created = font['head'].modified = 3846441600  # 2025-11-20, arbitrary and fixed
    font.recalcTimestamp = False

    buf = io.BytesIO()
    font.save(buf)
    info = dict(file=out_stem + '.ttf', donor_wght=wght, scale=round(scale, 4), dx=dx,
                fraunces_stem=f_right - f_left, new_stem=round((d_right - d_left) * scale),
                old_advance=old_adv, new_advance=new_adv, f_top=new_f.yMax, hook_right=new_f.xMax,
                overhang=new_f.xMax - new_adv, crossbar_narrow=round(k_bar, 3),
                kerned_pairs=len(kern), kerned=' '.join(f'{g}+{v}' for g, v in sorted(kern.items())))
    return buf.getvalue(), info


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--literata', required=True, help='path to Literata[opsz,wght].ttf')
    ap.add_argument('--check', action='store_true', help='fail if the committed files differ from a fresh build')
    ap.add_argument('--out', default=OUT)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    bad = False
    for src_stem, out_stem, style, wc, wght in WEIGHTS:
        data, info = build_one(src_stem, out_stem, style, wc, wght, args.literata)
        path = os.path.join(args.out, out_stem + '.ttf')
        digest = hashlib.sha256(data).hexdigest()[:16]
        if args.check:
            same = os.path.exists(path) and open(path, 'rb').read() == data
            print(('✓ ' if same else '✗ ') + f'{out_stem}.ttf {"matches" if same else "differs from"} a fresh build ({digest})')
            bad = bad or not same
        else:
            with open(path, 'wb') as fh:
                fh.write(data)
            print(f'✓ wrote {path} ({len(data)} bytes, sha256 {digest})')
        print('  ' + ', '.join(f'{k}={v}' for k, v in info.items()))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
