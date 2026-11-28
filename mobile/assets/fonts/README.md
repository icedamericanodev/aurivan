# KaiSip Serif

The upright reading font of the phone app and the website. It is **Fraunces
with two letters changed**: the lowercase "f" and the capital "J".

## Why

**The "f" (FB-006).** Fraunces' upright "f" has a flat, heavy hook at the top.
Learners read it as odd (`docs/beta/TESTER_FEEDBACK.md`). That shape is the
font's own design: it is the same at every optical size and with every font
setting, and Fraunces has no alternate "f". So the "f" comes from Literata, a
book typeface with a conventional "f", scaled to sit in Fraunces:

- same x-height (the crossbar lines up with the other letters),
- same stem thickness as Fraunces' own "f", per weight,
- the stem in the same place and **the same advance width**, so every line of
  text takes exactly the room it took before (no reflow, nothing clipped),
- the hook narrowed a little (to 72% of its reach) so it stays clear of the
  next letter ("fi", "fl", "f?"), because Fraunces has no real fi/fl ligatures,
- the right arm of the crossbar ends where Fraunces' crossbar ended, so "fy",
  "fv" and "fw" keep their gap,
- a small kerning pair for the few rarer followers that would still come close
  to the hook ("fb", "f)", "f]", an apostrophe after f, "fï"). The common pairs
  need none and keep Fraunces' widths.

**The "J" (FB-014).** Fraunces' capital "J" already sits on the baseline, but
its stem swells to the right on the way down and then curls into the ball, so
a name like "Jamie" or the initial in the avatar starts with a boot shape.
Fraunces has no alternate "J" either (no stylistic set covers it, and its
display cut keeps the swelling). So the "J" is **Fraunces' own outline with the
swelling taken out**:

- the top serif and the upper stem move right to stand over the lowest part of
  the stem, so the stem's right edge is one straight line,
- the hook, the ball, the serif shape and the stem thickness are Fraunces',
  untouched (no second typeface is involved),
- **the same advance width**, the same height, and the same small overshoot
  below the baseline (no reflow),
- the right arm of the top serif is a little shorter, so the letter keeps
  clear room on both sides (at least 70 units of 2000),
- the accents of Ĵ and J́ move with the stem; Ĳ, Ǉ and Ǌ use the new J.

Every other glyph, the spacing and the kerning are Fraunces, byte for byte
(`src/__tests__/kaisip-serif-font.test.ts` checks this). The italic is plain
Fraunces from `@expo-google-fonts/fraunces`: its "f" is the usual italic "f".
Its capital "J" drops below the baseline, as many italics do; names are not set
in italic, so it is left alone (options were drawn for the owner, 28 Nov 2026).

## Files

| File | From |
|---|---|
| `KaiSipSerif_400Regular.ttf` | `Fraunces_400Regular` + Literata "f" (optical size 36, weight 490) + straightened "J" |
| `KaiSipSerif_500Medium.ttf` | `Fraunces_500Medium` + Literata "f" (optical size 36, weight 587) + straightened "J" |
| `OFL-Fraunces.txt` | Fraunces' licence and copyright notice |
| `OFL-Literata.txt` | Literata's licence and copyright notice |
| `../../../assets/fonts/KaiSipSerif_400Regular.woff2` | The website's copy of the Regular: the same font, compressed |
| `../../../assets/fonts/KaiSipSerif_500Medium.woff2` | The website's copy of the Medium |

The file names are also the font names the app uses (`font.serif400`,
`font.serif500` in `src/theme/tokens.ts`), and the Android widgets find the
Medium by its file name (`app.json`, the `react-native-android-widget` fonts).

**The website.** Every page (`index.html`, `assets/home.css` for the home and
waitlist pages, `beta.html`, the legal and help pages, the Beta Desk) names the
family `'KaiSip Serif'` in its `@font-face` rules and loads the two `.woff2`
files for upright text and `Fraunces_400Regular_Italic.woff2` for italic. No
page loads plain upright Fraunces; `scripts/verify_repo.sh` and the test above
fail if one does. **Mockups and design sheets must load these files too**, not
Fraunces from Google Fonts, or they show the old "f" and "J".

## Licence

Both source fonts are under the SIL Open Font License 1.1, which allows
modified versions as long as they are renamed, keep the copyright notices and
stay under the same licence. That is why this font is called "KaiSip Serif"
and never "Fraunces" (inside the font file and in the pages' CSS), and why both
licence files sit here and in `assets/fonts/`. KaiSip Serif itself is under the
SIL Open Font License 1.1.

## Rebuild

```bash
cd mobile
pip install fonttools brotli   # dev-only tools, not app dependencies (brotli is for the .woff2 files)
# Literata[opsz,wght].ttf (version 3.103) from https://github.com/google/fonts/tree/main/ofl/literata
python3 scripts/fonts/build_kaisip_serif.py --literata "/path/to/Literata[opsz,wght].ttf"          # write
python3 scripts/fonts/build_kaisip_serif.py --literata "/path/to/Literata[opsz,wght].ttf" --check  # compare
python3 scripts/fonts/build_kaisip_serif.py --check-web   # website files = phone files? (no Literata needed)
```

One run writes the two `.ttf` files here **and** the two `.woff2` files in the
repo's `assets/fonts/`. The same inputs always give the same `.ttf` bytes. A
`.woff2` can differ in bytes between versions of the compressor, so the script
compares what is inside it and leaves a file alone when it already holds the
same font. Running it twice changes nothing.

When a glyph changes, raise `VERSION` in the script: it is written into the
font, and the test that keeps the website's files in step with the phone's
reads it.

### Choosing another "J"

The "J" is one constant at the top of the script, `J_CANDIDATE`. Change the
word (or pass `--j`) and rebuild:

| Value | What it is |
|---|---|
| `straight` | **In use.** Fraunces' own J with a straight stem |
| `literata` | Literata's J, like the f. A straight stem too, but its square-cut top serif is sharper than Fraunces' soft serifs |
| `display` | Fraunces' own J from its display cut (optical size 144). Keeps the swelling. Needs `--fraunces-var "/path/to/Fraunces[SOFT,WONK,opsz,wght].ttf"` |
| `fraunces` | Fraunces' J, unchanged |

Every choice keeps Fraunces' advance width, so switching never moves text.
To look at one without touching the app: add `--out /some/folder`.
