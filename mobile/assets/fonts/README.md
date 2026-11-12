# KaiSip Serif

The app's upright reading font. It is **Fraunces with one letter changed**: the
lowercase "f".

## Why

Fraunces' upright "f" has a flat, heavy hook at the top. Learners read it as
odd (tester feedback FB-006, `docs/beta/TESTER_FEEDBACK.md`). That shape is the
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

Every other glyph, the spacing and the kerning are Fraunces, byte for byte
(`src/__tests__/kaisip-serif-font.test.ts` checks this). The italic is plain
Fraunces from `@expo-google-fonts/fraunces`: its "f" is conventional already.

## Files

| File | From |
|---|---|
| `KaiSipSerif_400Regular.ttf` | `Fraunces_400Regular` + Literata "f" (optical size 36, weight 490) |
| `KaiSipSerif_500Medium.ttf` | `Fraunces_500Medium` + Literata "f" (optical size 36, weight 587) |
| `OFL-Fraunces.txt` | Fraunces' licence and copyright notice |
| `OFL-Literata.txt` | Literata's licence and copyright notice |

The file names are also the font names the app uses (`font.serif400`,
`font.serif500` in `src/theme/tokens.ts`), and the Android widgets find the
Medium by its file name (`app.json`, the `react-native-android-widget` fonts).

## Licence

Both source fonts are under the SIL Open Font License 1.1, which allows
modified versions as long as they are renamed, keep the copyright notices and
stay under the same licence. That is why this font is called "KaiSip Serif"
and not "Fraunces", and why both licence files sit here. KaiSip Serif itself is
under the SIL Open Font License 1.1.

## Rebuild

```bash
cd mobile
# Literata[opsz,wght].ttf (version 3.103) from https://github.com/google/fonts/tree/main/ofl/literata
python3 scripts/fonts/build_kaisip_serif.py --literata "/path/to/Literata[opsz,wght].ttf"          # write
python3 scripts/fonts/build_kaisip_serif.py --literata "/path/to/Literata[opsz,wght].ttf" --check  # compare
```

Needs fontTools (`pip install fonttools`). The same inputs always give the
same bytes.
