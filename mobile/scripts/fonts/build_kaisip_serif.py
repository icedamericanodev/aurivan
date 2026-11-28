#!/usr/bin/env python3
"""
Builds "KaiSip Serif": the upright reading font of the phone app and the
website, with a conventional lowercase "f" (FB-006, mobile 2.1) and a
capital "J" with a straight stem (FB-014, mobile 2.4 and web v13.2).

PLAIN ENGLISH
  The brand serif is Fraunces. Two of its upright letters read as "odd":
    - the lowercase "f" has a flat, heavy hook at the top;
    - the capital "J" has a stem that swells to the right near the baseline
      and then curls into a large ball, so a name like "Jamie" starts with a
      boot shape.
  Both shapes are the font's own design and Fraunces has no alternate for
  either. So this script makes a copy of each upright Fraunces weight the app
  ships and changes those TWO glyphs, at Fraunces' own advance widths (so no
  text reflows):
    - the "f" comes from Literata (same licence, a conventional book "f"),
      scaled so its x-height, stem thickness and stem position match Fraunces;
    - the "J" is Fraunces' own outline with the swelling taken out of the stem.
  Every other letter, the spacing and the kerning are Fraunces, untouched.
  The italic is not changed.

  Which "J" the font gets is ONE constant below, J_CANDIDATE (the other
  choices were drawn for the owner's comparison sheet and stay buildable).
  Running the script twice changes nothing.

  Both fonts are under the SIL Open Font License 1.1. A modified copy must
  carry a different name and keep both copyright notices and the licence:
  the result is named "KaiSip Serif" (never "Fraunces"), and the licences are
  in assets/fonts/OFL-Fraunces.txt and assets/fonts/OFL-Literata.txt.

USAGE (from mobile/, after npm ci)
  python3 scripts/fonts/build_kaisip_serif.py --literata "<path>/Literata[opsz,wght].ttf"
  python3 scripts/fonts/build_kaisip_serif.py --literata "<path>/..." --check   # compare with the committed files
  python3 scripts/fonts/build_kaisip_serif.py --check-web                       # web files = phone files? (no Literata needed)

  Literata's variable font: https://github.com/google/fonts/tree/main/ofl/literata
  (file "Literata[opsz,wght].ttf", version 3.103). Needs fontTools and brotli
  (pip install fonttools brotli); brotli is only for the website's .woff2 files.

OUTPUT
  assets/fonts/KaiSipSerif_400Regular.ttf        (phone, from Fraunces_400Regular)
  assets/fonts/KaiSipSerif_500Medium.ttf         (phone, from Fraunces_500Medium)
  ../assets/fonts/KaiSipSerif_400Regular.woff2   (website: the same font, compressed)
  ../assets/fonts/KaiSipSerif_500Medium.woff2
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
# The website serves the same two fonts as .woff2 (index.html, home.css, the
# beta and legal pages). scripts/build_site.sh publishes this folder.
WEB_OUT = os.path.normpath(os.path.join(MOBILE, '..', 'assets', 'fonts'))

FAMILY = 'KaiSip Serif'
PS_FAMILY = 'KaiSipSerif'
# Bump this whenever a glyph changes: it is written into the font, and the
# test that keeps the website's files in step with the phone's reads it.
VERSION = '1.100'

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

# ── The capital "J" (FB-014) ────────────────────────────────────────────────
# Which J the font gets. Change this one word (or pass --j) and rebuild:
#   'literata'  Literata's J: a straight stem and an open hook. Scaled to
#               Fraunces' cap height, with the stem as thick as Fraunces' J.
#   'straight'  Fraunces' own J with the swelling taken out of its stem by
#               moving outline points (no second typeface involved).
#   'display'   Fraunces' own J from its display cut (optical size 144). The
#               only "alternate" Fraunces has; it keeps the swelling. Needs
#               --fraunces-var "<path>/Fraunces[SOFT,WONK,opsz,wght].ttf".
#   'fraunces'  leave Fraunces' J as it is.
# Every choice keeps Fraunces' advance width for J, so no text reflows.
J_CANDIDATE = 'straight'
J_CHOICES = ('literata', 'straight', 'display', 'fraunces')

# The least room (font units, 2000 per em) between the edge of the letter's
# box and its ink: left of the hook's ball, right of the top serif.
# Fraunces' J has 87 and 106; Literata's own J, at this size, about 79 and 69.
J_SIDE = (70, 70)

# Literata's J is a wide letter and Fraunces' J is a narrow one. To keep
# Fraunces' advance width, the part left of the stem (the hook and the left
# arm of the top serif) is narrowed to this share of its width, and the right
# arm of the top serif is shortened to whatever room is left. The stem itself
# and every height are untouched.
J_HOOK_NARROW = 0.80

# Donor weights for the J, per output weight: the Literata weight whose J
# stem, scaled to Fraunces' cap height, is as thick as the stem of Fraunces'
# own J (the script prints both thicknesses so a drift is visible).
J_DONOR_WGHT = {'400Regular': 490, '500Medium': 587}
# The same idea for the 'display' choice: the Fraunces weight at optical size 144.
J_DISPLAY_WGHT = {'400Regular': 476, '500Medium': 577}


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
    add_pair_lookup(font, {('f', g): v for g, v in pairs.items()})


def add_pair_lookup(font, pairs):
    """Append one pair-kerning lookup to the font's `kern` feature. `pairs` is {(first, second): extra space}."""
    gpos = font['GPOS'].table
    glyph_map = font.getReverseGlyphMap()
    sub = buildPairPosGlyphs({pair: (buildValue({'XAdvance': v}), None) for pair, v in pairs.items()}, glyph_map)
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


class XMapPen(FilterPen):
    """Moves every outline point sideways: x becomes fn(x, y). Heights never change."""

    def __init__(self, out, fn):
        super().__init__(out)
        self.fn = fn

    def _pt(self, pt):
        return (self.fn(pt[0], pt[1]), pt[1])

    def moveTo(self, pt):
        self._outPen.moveTo(self._pt(pt))

    def lineTo(self, pt):
        self._outPen.lineTo(self._pt(pt))

    def qCurveTo(self, *points):
        self._outPen.qCurveTo(*[p if p is None else self._pt(p) for p in points])

    def curveTo(self, *points):
        self._outPen.curveTo(*[self._pt(p) for p in points])


def ink_bounds(glyph_set, name):
    """(xMin, yMin, xMax, yMax) of a glyph's outline."""
    pen = BoundsPen(glyph_set)
    glyph_set[name].draw(pen)
    return pen.bounds


def j_from_literata(untouched, key, literata_path):
    """
    Literata's J, fitted into the room of Fraunces' J.
      - height: Literata's cap height becomes Fraunces' cap height (one scale for
        both directions, so the stem keeps the thickness the donor weight gives it);
      - the hook side is narrowed to J_HOOK_NARROW and starts J_SIDE[0] from the
        left edge; the stem follows; the right serif arm takes the room left.
    """
    cap = untouched['OS/2'].sCapHeight
    adv = untouched['hmtx']['J'][0]
    inst = instantiateVariableFont(TTFont(literata_path), {'opsz': OPSZ, 'wght': J_DONOR_WGHT[key]})
    gs = inst.getGlyphSet()
    x0, _y0, x1, y1 = ink_bounds(gs, 'J')
    scale = cap / y1
    d_left, d_right = stem_span(inst, 'J', y1 * 0.6)
    stem_left = round(J_SIDE[0] + (d_left - x0) * scale * J_HOOK_NARROW)
    stem_right = stem_left + (d_right - d_left) * scale
    k_arm = min(1.0, (adv - J_SIDE[1] - stem_right) / ((x1 - d_right) * scale))

    def fn(x, _y):  # donor units
        if x < d_left:
            return d_left - (d_left - x) * J_HOOK_NARROW
        if x > d_right:
            return d_right + (x - d_right) * k_arm
        return x

    pen = TTGlyphPen(None)
    gs['J'].draw(XMapPen(TransformPen(pen, (scale, 0, 0, scale, stem_left - d_left * scale, 0)), fn))
    return pen.glyph(), dict(j_donor_wght=J_DONOR_WGHT[key], j_scale=round(scale, 4), j_arm_narrow=round(k_arm, 3))


def j_straightened(untouched):
    """
    Fraunces' own J with a straight stem. In Fraunces the stem starts at one
    place under the top serif and swells to the right on its way down. Here the
    top serif and the upper stem move right to stand over the lowest part of
    the stem, so the right edge is one straight line; the hook and its ball
    keep their shape. The whole letter then moves left until the ball is
    J_SIDE[0] from the edge, and the right serif arm is shortened to keep
    J_SIDE[1] (a straight J needs its stem further right than Fraunces put it).
    """
    cap = untouched['OS/2'].sCapHeight
    adv = untouched['hmtx']['J'][0]
    gs = untouched.getGlyphSet()
    left, right = stem_span(untouched, 'J', cap * 0.6)  # the stem under the serif
    _l, r_profile = edge_profile(gs, 'J')
    belly = round(max(x for b, x in r_profile.items() if 0.1 * cap <= b * BIN <= 0.5 * cap))  # the stem's right edge at its widest
    pts = []
    rec = DecomposingRecordingPen(gs)
    gs['J'].draw(rec)
    for _op, args in rec.value:
        pts.extend(p for p in args if p is not None)
    floor = 0.14 * cap  # below this height the outline is the hook, not the stem
    # The inside (left) edge of the stem at its lowest, just above the hook's curve.
    inner = max(x for x, y in pts if left <= x < right - 1 and floor < y < 0.5 * cap)
    shift = belly - right
    x_max = max(x for x, _y in pts)
    nudge = max(0, round(min(x for x, _y in pts)) - J_SIDE[0])  # how far the whole letter moves left
    k_arm = min(1.0, (adv - J_SIDE[1] - (belly - nudge)) / (x_max - right))

    def fn(x, y):
        if y > 0.8 * cap:  # the top serif and the top of the stem
            return belly + (x - right) * k_arm if x > right else x + shift
        if y > floor and x >= right:  # the right edge of the stem: one straight line
            return belly
        if y > floor and left <= x < right:  # the left edge: tapers into the hook as before
            return inner - (inner - x) * (inner - (left + shift)) / (inner - left)
        return x

    pen = TTGlyphPen(None)
    gs['J'].draw(XMapPen(TransformPen(pen, (1, 0, 0, 1, -nudge, 0)), fn))
    return pen.glyph(), dict(j_stem_top_moved=shift - nudge, j_hook_moved=-nudge, j_arm_narrow=round(k_arm, 3))


def j_from_display_cut(untouched, key, fraunces_var_path):
    """Fraunces' own J at optical size 144 (its display cut), centred where the old J's ink was."""
    if not fraunces_var_path:
        sys.exit('The "display" J needs --fraunces-var "<path>/Fraunces[SOFT,WONK,opsz,wght].ttf" (github.com/google/fonts, ofl/fraunces).')
    inst = instantiateVariableFont(TTFont(fraunces_var_path), {'opsz': 144, 'SOFT': 0, 'WONK': 0, 'wght': J_DISPLAY_WGHT[key]})
    gs = inst.getGlyphSet()
    o0, _a, o1, _b = ink_bounds(untouched.getGlyphSet(), 'J')
    x0, _c, x1, _d = ink_bounds(gs, 'J')
    pen = TTGlyphPen(None)
    gs['J'].draw(TransformPen(pen, (1, 0, 0, 1, round((o0 + o1) / 2 - (x0 + x1) / 2), 0)))
    return pen.glyph(), dict(j_display_wght=J_DISPLAY_WGHT[key])


def j_family(font):
    """
    Every glyph built from J (Ĵ, Ĳ, Ǉ, Ǌ ...), each after the glyphs it is built from.
    Call it on the read-only copy: it opens every glyph, and an opened glyph is written again on save.
    """
    glyf = font['glyf']
    found = ['J']
    grew = True
    while grew:
        grew = False
        for name in font.getGlyphOrder():
            g = glyf[name]
            if name not in found and g.isComposite() and any(c.glyphName in found for c in g.components):
                found.append(name)
                grew = True
    return found[1:]


def j_gaps(font, untouched, family):
    """
    The smallest gap (font units) between the new J and any letter before it,
    and any letter after it, with Fraunces' own kerning counted. Returns
    (kerning pairs needed to keep MIN_GAP, smallest gap before, smallest gap after).
    """
    gs_new, gs_old = font.getGlyphSet(), untouched.getGlyphSet()
    j_left, j_right = edge_profile(gs_new, 'J')
    adv = font['hmtx']['J'][0]
    real = {g for cp, g in font.getBestCmap().items() if unicodedata.category(chr(cp)) not in ('Mn', 'Mc', 'Me', 'Sk', 'Lm', 'Zs', 'Cc', 'Cf')}
    pairs, least_before, least_after = {}, None, None
    for name in font.getGlyphOrder():
        if name in ('.notdef', 'J') or name in family or name not in real or font['hmtx'][name][0] == 0:
            continue
        left, right = edge_profile(gs_old, name)
        if not left:
            continue
        before = after = None
        for b in j_left:
            for near in range(b - 3, b + 4):  # 30 units of slack up and down
                if near in right:
                    g = font['hmtx'][name][0] - right[near] + j_left[b]
                    before = g if before is None else min(before, g)
                if near in left:
                    g = adv - j_right[b] + left[near]
                    after = g if after is None else min(after, g)
        if before is not None:
            before += existing_kern(font, name, 'J')
            least_before = before if least_before is None else min(least_before, before)
            if MIN_GAP - before >= 1:
                pairs[(name, 'J')] = min(MAX_KERN, int(round(MIN_GAP - before)))
        if after is not None:
            after += existing_kern(font, 'J', name)
            least_after = after if least_after is None else min(least_after, after)
            if MIN_GAP - after >= 1:
                pairs[('J', name)] = min(MAX_KERN, int(round(MIN_GAP - after)))
    return pairs, least_before, least_after


def replace_j(font, untouched, key, choice, literata_path, fraunces_var_path):
    """Puts the chosen J into `font` (see J_CANDIDATE). Returns a dict of facts to print."""
    if choice == 'fraunces':
        return dict(j='fraunces (unchanged)')
    glyf, hmtx = font['glyf'], font['hmtx']
    cap = untouched['OS/2'].sCapHeight
    adv, _lsb = hmtx['J']
    old_left, old_right = stem_span(untouched, 'J', cap * 0.6)
    if choice == 'literata':
        new_j, facts = j_from_literata(untouched, key, literata_path)
    elif choice == 'straight':
        new_j, facts = j_straightened(untouched)
    else:
        new_j, facts = j_from_display_cut(untouched, key, fraunces_var_path)
    new_j.program = None  # unhinted, like the rest of the static Fraunces
    if hasattr(new_j, 'removeHinting'):
        new_j.removeHinting()
    family = j_family(untouched)
    glyf['J'] = new_j
    new_j.recalcBounds(glyf)
    hmtx['J'] = (adv, new_j.xMin)  # Fraunces' own advance: text takes exactly the room it took before
    new_left, new_right = stem_span(font, 'J', cap * 0.6)

    # Letters built from J. An accent sits over the middle of the stem, so it
    # moves with the stem; Ĳ, Ǉ and Ǌ only need their outer box measured again.
    # The boxes are measured on the read-only copy: measuring opens the glyphs a
    # letter is built from (I, L, N, the accents), and an opened glyph would be
    # written again on save. Only J and the letters built from it may change.
    moved = round((new_left + new_right) / 2 - (old_left + old_right) / 2)
    probe = untouched['glyf']
    probe['J'] = new_j
    for name in family:
        for g in (glyf[name], probe[name]):
            if g.components[0].glyphName == 'J':
                for c in g.components[1:]:
                    c.x += moved
        probe[name].recalcBounds(probe)
        g = glyf[name]
        g.xMin, g.yMin, g.xMax, g.yMax = (getattr(probe[name], k) for k in ('xMin', 'yMin', 'xMax', 'yMax'))
        hmtx[name] = (hmtx[name][0], g.xMin)

    pairs, least_before, least_after = j_gaps(font, untouched, family)
    if pairs:
        add_pair_lookup(font, pairs)
    facts.update(j=choice, j_advance=adv, j_fraunces_stem=old_right - old_left, j_new_stem=new_right - new_left,
                 j_stem_at=f'{new_left}..{new_right}', j_ink=f'{new_j.xMin}..{new_j.xMax}', j_bottom=new_j.yMin, j_top=new_j.yMax,
                 j_accent_moved=moved, j_family=' '.join(family), j_least_gap_before=round(least_before), j_least_gap_after=round(least_after),
                 j_kerned=' '.join(f'{a}+{b}:{v}' for (a, b), v in sorted(pairs.items())) or 'none')
    return facts


def build_one(src_stem, out_stem, style, weight_class, wght, literata_path, j_choice=J_CANDIDATE, fraunces_var_path=None):
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

    # The capital J (after the f, so the f and its kerning come out exactly as before).
    j_facts = replace_j(font, untouched, src_stem, j_choice, literata_path, fraunces_var_path)
    j_is_literata = j_choice == 'literata'

    # Names: a new family name (OFL: a modified version is renamed) and both notices.
    name = font['name']
    full = f'{FAMILY} {style}'
    ps = f'{PS_FAMILY}-{style}'
    copyright_ = (
        'Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces). '
        f'Lowercase f{" and capital J" if j_is_literata else ""}: '
        'Copyright 2017 The Literata Project Authors (https://github.com/googlefonts/literata).'
    )
    description = (
        'KaiSip Serif is Fraunces with two glyphs changed: the upright lowercase f and capital J are taken from Literata '
        f'(optical size {OPSZ}), scaled to Fraunces. A modified version under the SIL Open Font License 1.1.'
    ) if j_is_literata else (
        'KaiSip Serif is Fraunces with the upright lowercase f taken from Literata '
        f'(optical size {OPSZ}), scaled to Fraunces' + ('' if j_choice == 'fraunces' else ', and the capital J redrawn') +
        '. A modified version under the SIL Open Font License 1.1.'
    )
    for rec in list(name.names):
        if rec.nameID in (16, 17, 7, 25):
            name.removeNames(nameID=rec.nameID)
    for nid, value in ((0, copyright_), (1, FAMILY if style == 'Regular' else full), (2, 'Regular'),
                       (3, f'{VERSION};KAISIP;{ps}'), (4, full), (5, f'Version {VERSION}; Fraunces 1.000 + Literata 3.103 f{", J" if j_is_literata else ""}'),
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
    return buf.getvalue(), info, j_facts


def to_woff2(ttf_bytes):
    """The same font as a .woff2 (what a web page downloads: about 40% of the size)."""
    try:
        import brotli  # noqa: F401  (fontTools needs it to write woff2)
    except ImportError:
        sys.exit('The website files (.woff2) need the brotli module: pip install brotli. Or pass --no-web.')
    font = TTFont(io.BytesIO(ttf_bytes), recalcBBoxes=False, recalcTimestamp=False)
    font.flavor = 'woff2'
    buf = io.BytesIO()
    font.save(buf)
    return buf.getvalue()


def same_font(a_bytes, b_bytes):
    """
    True when two font files hold the same tables. Compares what the files
    decode to, not their bytes: a .woff2 made with another version of the
    compressor is a different file with the same font inside.
    """
    a, b = TTFont(io.BytesIO(a_bytes)), TTFont(io.BytesIO(b_bytes))
    tags = sorted(t for t in a.keys() if t != 'GlyphOrder')
    return tags == sorted(t for t in b.keys() if t != 'GlyphOrder') and all(a.getTableData(t) == b.getTableData(t) for t in tags)


def check_web(out, web_out):
    """Is each website .woff2 the same font as the phone's .ttf? Needs no Literata."""
    bad = False
    for _src, out_stem, _style, _wc, _wght in WEIGHTS:
        ttf, woff = os.path.join(out, out_stem + '.ttf'), os.path.join(web_out, out_stem + '.woff2')
        same = os.path.exists(ttf) and os.path.exists(woff) and same_font(open(woff, 'rb').read(), to_woff2(open(ttf, 'rb').read()))
        print(('✓ ' if same else '✗ ') + f'{out_stem}.woff2 (website) {"is" if same else "is NOT"} the same font as {out_stem}.ttf (phone)')
        bad = bad or not same
    return bad


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--literata', help='path to Literata[opsz,wght].ttf')
    ap.add_argument('--check', action='store_true', help='fail if the committed files differ from a fresh build')
    ap.add_argument('--check-web', action='store_true', help='only check that the website .woff2 files hold the same fonts as the phone .ttf files')
    ap.add_argument('--out', default=OUT, help='folder for the phone .ttf files')
    ap.add_argument('--web-out', default=None, help='folder for the website .woff2 files (default: ../assets/fonts, or --out when --out is given)')
    ap.add_argument('--no-web', action='store_true', help='skip the website .woff2 files')
    ap.add_argument('--j', choices=J_CHOICES, default=J_CANDIDATE, help='which capital J to build (default: J_CANDIDATE)')
    ap.add_argument('--fraunces-var', help='path to Fraunces[SOFT,WONK,opsz,wght].ttf (only for --j display)')
    args = ap.parse_args()
    web_out = args.web_out or (WEB_OUT if args.out == OUT else args.out)
    if args.check_web:
        sys.exit(1 if check_web(args.out, web_out) else 0)
    if not args.literata:
        ap.error('--literata is required (the path to Literata[opsz,wght].ttf)')
    os.makedirs(args.out, exist_ok=True)
    bad = False
    for src_stem, out_stem, style, wc, wght in WEIGHTS:
        data, info, j_facts = build_one(src_stem, out_stem, style, wc, wght, args.literata, args.j, args.fraunces_var)
        path = os.path.join(args.out, out_stem + '.ttf')
        web_path = os.path.join(web_out, out_stem + '.woff2')
        digest = hashlib.sha256(data).hexdigest()[:16]
        if args.check:
            same = os.path.exists(path) and open(path, 'rb').read() == data
            print(('✓ ' if same else '✗ ') + f'{out_stem}.ttf {"matches" if same else "differs from"} a fresh build ({digest})')
            bad = bad or not same
            if not args.no_web:
                same = os.path.exists(web_path) and same_font(open(web_path, 'rb').read(), to_woff2(data))
                print(('✓ ' if same else '✗ ') + f'{out_stem}.woff2 (website) {"holds" if same else "does NOT hold"} the same font as a fresh build')
                bad = bad or not same
        else:
            with open(path, 'wb') as fh:
                fh.write(data)
            print(f'✓ wrote {path} ({len(data)} bytes, sha256 {digest})')
            if not args.no_web:
                web = to_woff2(data)
                # Leave a file that already holds this font alone (another compressor version would only change its bytes).
                if os.path.exists(web_path) and same_font(open(web_path, 'rb').read(), web):
                    print(f'✓ {web_path} already holds this font (left as it is)')
                else:
                    os.makedirs(web_out, exist_ok=True)
                    with open(web_path, 'wb') as fh:
                        fh.write(web)
                    print(f'✓ wrote {web_path} ({len(web)} bytes)')
        print('  f: ' + ', '.join(f'{k}={v}' for k, v in info.items()))
        print('  J: ' + ', '.join(f'{k}={v}' for k, v in j_facts.items()))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
