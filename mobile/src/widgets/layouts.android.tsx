'use no memo';
/**
 * The Android widget layouts (mobile 1.48, "Study card"): one face
 * (engine/widgets.ts), drawn with react-native-android-widget's primitives at
 * the widget's real size.
 *
 * Android-only file: the widget library loads only from `.android.ts(x)`.
 * Everything here is a plain function called inline (no hooks, no React
 * Compiler: the library walks the tree itself, and a component that returns
 * null would break that walk; hence 'use no memo' above).
 *
 * The look (docs/mobile/DESIGN_SYSTEM.md §20.2): an editorial set built on
 * Fraunces. Each widget is ONE card with ONE hero: a big serif figure or line,
 * small spaced Figtree labels, hairlines.
 * - Today's plan: the forest card (the only one), "12 questions", the day's
 *   step pips and the one Start button on the home screen.
 * - This week: paper, a big "3" and the week's leaves (the only leaves).
 * - Your plant: the botanical plate, "Growth 3 · Shoot" (no book label since Grove).
 * - Today's rule and the Recall card: ruled index cards with a clay margin.
 * - Key term and Readiness: paper. Road to exam: the ink card.
 *
 * Rules every layout follows:
 * - The hero never goes: at large text the labels, detail lines and day
 *   letters go first; the question, the rings and the leaves shrink to fit,
 *   never swap for a generic line. Sizes come from the real room (dp), so a
 *   360 dp phone fits.
 * - Text sizes are worked out here from the phone's font scale, with caps
 *   (a figure grows at most 1.1×, a title 1.3×, a detail line 1.5×), so a
 *   pill grows too and nothing is cut off. Nothing under 10 sp.
 * - The reveal cards put "Show …" and the "Had it / Not yet" pair in
 *   different places (the reveal button in the top row; the pair at the
 *   bottom), so a quick second tap never lands on an answer.
 * - Every tap target is at least 48 dp tall; at most three per widget.
 * - TalkBack hears one sentence per widget (the face's label, with its state).
 * - No red, no animation, nothing that changes with the hour.
 */
import type { JSX } from 'react';
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { spokenMin } from '../engine/pace';
import { BIG_TEXT, LEAF_LETTERS, sizeClass, type FaceAction, type SizeClass, type WidgetFace } from '../engine/widgets';
import { leafSvg, markSvg, plantSvg, playSvg, ruledSvg, ringsSvg, widgetColors, WIDGET_FONTS as F, type WidgetColors, type WidgetTheme } from './art';

/** The custom clicks a reveal card sends to its own task (it redraws, no app opens). */
export const REVEAL_ACTION = 'REVEAL';
export const HAD_ACTION = 'HAD';
export const NOTYET_ACTION = 'NOTYET';
export const WIDGET_ACTIONS = [REVEAL_ACTION, HAD_ACTION, NOTYET_ACTION] as const;
/** The smallest height of any tap target, in dp (Android's widget quality guideline). */
export const TAP_MIN = 48;
/** At this font scale labels and day letters go. */
export const HUGE_TEXT = 1.6;
/** A small widget's words grow at most this much with the phone's font size (Android 14's non-linear scaling does the same). */
export const SMALL_TITLE_CAP = 1.3;
/** A bigger widget's words grow at most this much. */
export const MEDIUM_TITLE_CAP = 1.5;
/** Widget spacing (dp): named once so DESIGN_SYSTEM §20.2 can list them. */
export const W = { pad: 16, padStrip: 12, padTiny: 6, padPill: 6, radius: 22, pill: 36, pillRadius: 18 } as const;
/** Under this many dp a 1×1 shows one thing only (some launchers make a cell this small). */
export const MICRO = 70;
/** Under this many dp tall a strip has room for one line only. */
export const LOW_STRIP = 60;
/** A strip under 250 dp wide has no room for a pill: the whole widget is the main tap (forNarrowStrip). */
export const NARROW_STRIP = 250;
/** Fraunces on a widget is never smaller than this (serif detail gets soft on low-density screens). */
export const SERIF_MIN = 13;

export interface LayoutProps {
  face: WidgetFace;
  theme: WidgetTheme;
  /**
   * The widget's size in dp. Since react-native-android-widget 0.26 (Expo SDK 58) this is the
   * launcher's size for the current orientation (Android 12+: its exact size list), corrected
   * to the real on-screen size after the first tap (the library then redraws, WIDGET_RESIZED).
   */
  width: number;
  height: number;
  /** The phone's font size setting (1 = default). */
  fontScale: number;
}

type El = JSX.Element | null;
type Font = (typeof F)[keyof typeof F];

/** Everything a layout needs to know about where it draws. */
interface X {
  face: WidgetFace;
  c: WidgetColors;
  theme: WidgetTheme;
  size: SizeClass;
  /** Inner width and height (dp), inside the padding. */
  iw: number;
  ih: number;
  scale: number;
  big: boolean;
  huge: boolean;
}

/** The same narrow-strip rule WidgetLayout uses, from inside a layout. */
const isNarrow = (x: X) => x.size === 'strip' && x.iw + 2 * W.padStrip < NARROW_STRIP;

// ── Measuring text (estimates, kept on the safe side) ─────────────────────
/** About how wide a character is, as a share of the font size (Figtree and Fraunces, a little generous). */
const CHAR_W = 0.56;
/** Line height as a share of the font size (Fraunces and Figtree as Android draws them, generous). */
const LH = 1.3;

/** How many lines `text` takes at `fontPx` in `width` dp (word wrap, long words broken). */
export function linesFor(text: string, fontPx: number, width: number): number {
  const perLine = Math.max(1, Math.floor(width / (fontPx * CHAR_W)));
  let used = 1;
  let col = 0;
  for (const word of text.split(' ')) {
    const w = word.length;
    if (col === 0) col = w;
    else if (col + 1 + w <= perLine) col += 1 + w;
    else {
      used += 1;
      col = w;
    }
    while (col > perLine) {
      used += 1;
      col -= perLine;
    }
  }
  return used;
}
/** Would `text` fit in `lines` lines of `width` dp at `fontPx`? */
export function fitsLines(text: string, fontPx: number, width: number, lines: number): boolean {
  return linesFor(text, fontPx, width) <= lines;
}
/** Height (dp) of `lines` lines at `px`. */
const tall = (px: number, lines = 1) => Math.ceil(px * LH * lines);
/** A size from a base (sp) and the phone's scale, grown at most `cap` times. */
const sz = (base: number, scale: number, cap: number) => Math.round(base * Math.min(scale, cap) * 2) / 2;

/**
 * The biggest size (from `max` down to `min`, half-sp steps) at which `text`
 * fits `width` × `room` dp, and the lines it may take. Null if it never fits.
 */
export function fitText(text: string, max: number, min: number, width: number, room: number): { px: number; lines: number } | null {
  for (let px = max; px >= min; px -= 0.5) {
    const lines = Math.floor(room / (px * LH));
    if (lines >= 1 && fitsLines(text, px, width, lines)) return { px, lines };
  }
  return null;
}

/** One line of text, or more (`lines`), never scaled again by Android (sizes are worked out here). */
function txt(text: string, font: Font, px: number, color: string, o: { lines?: number; align?: 'left' | 'center' | 'right'; ls?: number; mt?: number; ml?: number; flex?: boolean } = {}): JSX.Element {
  return (
    <TextWidget
      text={text}
      maxLines={o.lines ?? 1}
      truncate="END"
      allowFontScaling={false}
      style={{
        fontFamily: font,
        fontSize: Math.max(10, px),
        color: color as `#${string}`,
        ...(o.align ? { textAlign: o.align } : {}),
        ...(o.ls ? { letterSpacing: o.ls } : {}),
        ...(o.mt ? { marginTop: o.mt } : {}),
        ...(o.ml ? { marginLeft: o.ml } : {}),
      }}
    />
  );
}

/** A hero line of words: the full text at the biggest size that fits, then its short form, never a generic line. */
function heroText(full: string, short: string | undefined, font: Font, max: number, min: number, width: number, room: number, color: string, align?: 'left' | 'center'): JSX.Element {
  const fitFull = fitText(full, max, min, width, room);
  if (fitFull) return txt(full, font, fitFull.px, color, { lines: fitFull.lines, align });
  const fitShort = short ? fitText(short, max, min, width, room) : null;
  if (short && fitShort) return txt(short, font, fitShort.px, color, { lines: fitShort.lines, align });
  // Nothing fits even at the smallest size: the words at that size, as many lines as the room has.
  // Ended cleanly at a whole word ("…"), never mid-word; the card's tap opens the rest.
  const text = short && short.length < full.length ? short : full;
  const lines = Math.max(1, Math.floor(room / (min * LH)));
  return txt(clipWords(text, min, width, lines), font, min, color, { lines, align });
}

/** Revealed words (a rule, an Exam cue, a term's meaning) are never drawn smaller than this. */
export const BODY_MIN = 12;

/**
 * `text` ended cleanly at a whole word with "…", to fit `lines` lines of
 * `width` dp at `px` (only when it truly can't fit whole; the card's tap opens the rest).
 */
export function clipWords(text: string, px: number, width: number, lines: number): string {
  if (fitsLines(text, px, width, lines)) return text;
  const words = text.split(' ');
  while (words.length > 1) {
    words.pop();
    const t = `${words.join(' ').replace(/[,;:.\u2013\u2014-]+$/, '')}…`;
    if (fitsLines(t, px, width, lines)) return t;
  }
  return `${words[0]}…`;
}

/**
 * Revealed words: the biggest size (from `max` down to BODY_MIN) at which they
 * fit `room` dp WHOLE, so they never shrink below their normal size because the
 * phone's text is bigger. If they can't fit whole even at `min` (BODY_MIN or
 * more), they end cleanly at a word ("…") at that size. `whole` says which.
 */
export function fitBody(text: string, max: number, width: number, room: number, maxLines = 12, min = BODY_MIN): { text: string; px: number; lines: number; whole: boolean } {
  const floor = Math.max(BODY_MIN, min);
  for (let px = Math.max(max, floor); px >= floor; px -= 0.5) {
    const lines = linesFor(text, px, width);
    if (lines <= maxLines && tall(px, lines) <= room) return { text, px, lines, whole: true };
  }
  const lines = Math.max(1, Math.min(maxLines, Math.floor(room / (floor * LH))));
  const cut = clipWords(text, floor, width, lines);
  return { text: cut, px: floor, lines: Math.min(lines, linesFor(cut, floor, width)), whole: cut === text };
}

// ── Taps ──────────────────────────────────────────────────────────────────
/** The click props: OPEN_URI into the app, or an on-widget action (the reveal cards). Labels speak minutes in full. */
function clickFor(link: string, widgetAction: FaceAction['widgetAction'] | undefined, label: string) {
  // Minutes in full, and a comma for " · " (some TalkBack voices read "middle dot").
  const a11y = spokenMin(label).replace(/ · /g, ', ');
  if (widgetAction) return { clickAction: widgetAction, accessibilityLabel: a11y };
  if (!link) return { accessibilityLabel: a11y };
  return { clickAction: 'OPEN_URI', clickActionData: { uri: link }, accessibilityLabel: a11y };
}

/**
 * A pill inside a 48 dp tall tap area. `full`: as wide as the card; `fill`:
 * share a row equally (the 2×2 pair); `outline`: the quieter "Not yet".
 */
function pill(action: FaceAction, c: WidgetColors, scale: number, o: { full?: boolean; fill?: boolean; outline?: boolean; label?: string; cap?: number } = {}): JSX.Element {
  const px = sz(13.5, scale, o.cap ?? SMALL_TITLE_CAP);
  return (
    <FlexWidget {...clickFor(action.link, action.widgetAction, action.label)} style={{ height: TAP_MIN, justifyContent: 'center', alignItems: 'center', ...(o.full ? { width: 'match_parent' } : o.fill ? { flex: 1 } : {}) }}>
      <FlexWidget
        style={{
          height: W.pill,
          borderRadius: W.pillRadius,
          paddingHorizontal: o.fill ? 4 : 14,
          justifyContent: 'center',
          alignItems: 'center',
          ...(o.full || o.fill ? { width: 'match_parent' } : {}),
          ...(o.outline ? { borderWidth: 1.5, borderColor: c.ink2 } : { backgroundColor: c.btn }),
        }}
      >
        {txt(o.label ?? action.label, F.sansBold, px, o.outline ? c.ink : c.onBtn)}
      </FlexWidget>
    </FlexWidget>
  );
}

/** The quiet second action ("Short on time? 5 questions ›"), text only, 48 dp tall. */
function quiet(action: FaceAction, c: WidgetColors, scale: number): El {
  return (
    <FlexWidget {...clickFor(action.link, action.widgetAction, action.label)} style={{ height: TAP_MIN, justifyContent: 'center', marginLeft: 14 }}>
      {txt(`${action.label} ›`, F.sansMedium, sz(12, scale, 1.3), c.ink)}
    </FlexWidget>
  );
}

// ── Shared pieces ─────────────────────────────────────────────────────────
const CAPTION = 11;
/** Would a caption fit `width` dp? (Letter-spaced capitals run wider than body text.) */
const captionFits = (t: string, px: number, width: number) => t.length * px * 0.8 <= width;
/**
 * A shorter whole label per kind, for when the full one won't fit ("KEY TERM" → "TERM").
 * Today's rule has none: its clay "Rule" already names the card.
 */
export const CAPTION_SHORT: Partial<Record<WidgetFace['kind'], string>> = { revisit: 'Term', question: 'Recall', think: '' };
/**
 * The small spaced label (in capitals). Rather than end in "…" it drops a
 * leading "Today · ", then uses the kind's short label, then drops itself.
 * Never a fragment cut to one word ("KEY", "TODAY'S").
 */
export function captionFit(text: string, scale: number, width: number, short?: string): string {
  const up = text.toUpperCase();
  const px = sz(CAPTION, scale, SMALL_TITLE_CAP);
  if (captionFits(up, px, width)) return up;
  const parts = up.split(' · ');
  if (parts.length > 1 && captionFits(parts[parts.length - 1], px, width)) return parts[parts.length - 1];
  if (parts.length > 1 && captionFits(parts[0], px, width)) return parts[0];
  // Words from the end ("New growth today" → "New growth"), but never down to one word,
  // and never ending on a joining word ("Road to"): a fragment says nothing.
  const words = parts[parts.length - 1].split(' ');
  while (words.length > 2) {
    words.pop();
    const t = words.join(' ');
    if (!JOINING.has(words[words.length - 1]) && captionFits(t, px, width)) return t;
  }
  const s = (short ?? '').toUpperCase();
  return s && captionFits(s, px, width) ? s : '';
}
const JOINING = new Set(['TO', 'OF', 'A', 'AN', 'THE', 'AND', 'FOR', 'IN', 'ON', 'AT', 'YOUR', 'MY']);
function caption(text: string, x: X, width: number, color = x.c.ink2): El {
  const t = captionFit(text, x.scale, width, CAPTION_SHORT[x.face.kind]);
  return t ? txt(t, F.sansBold, sz(CAPTION, x.scale, SMALL_TITLE_CAP), color, { ls: 1.1 }) : null;
}
/** The first of `options` that fits one line of `width` dp at `px` (or none). */
const firstFit = (options: (string | undefined)[], px: number, width: number) => options.find((o): o is string => Boolean(o) && fitsLines(o as string, px, width, 1));
const capH = (x: X) => tall(sz(CAPTION, x.scale, SMALL_TITLE_CAP));
const HAIR = 15;
const hair = (c: WidgetColors) => <FlexWidget style={{ height: 1, width: 'match_parent', backgroundColor: c.line, marginTop: 7, marginBottom: 7 }} />;
const mark = (c: WidgetColors, w: number) => <SvgWidget svg={markSvg(c)} style={{ width: w, height: Math.round(w * 1.37) }} />;

/** A row: the caption on the left, something quiet on the right. */
function topRow(x: X, text: string, right: El, rightW: number): JSX.Element {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
      <FlexWidget style={{ flex: 1 }}>{caption(text, x, x.iw - rightW)}</FlexWidget>
      {right}
    </FlexWidget>
  );
}

/** An italic note for the right of the top row ("step 2 of 3"). */
const asideEl = (x: X, text: string, color = x.c.ink2) => txt(text, F.serifItalic, sz(12.5, x.scale, 1.3), color, { ml: 8 });
const asideW = (x: X, text: string) => Math.ceil(text.length * sz(12.5, x.scale, 1.3) * 0.5) + 10;

/** A big serif figure and its italic unit beside it ("12 questions", "3 study days"). */
function figure(x: X, value: string, unit: string | undefined, px: number, unitPx: number, unitColor: string, unitLines = 2, width = x.iw): JSX.Element {
  // The unit beside the figure shrinks (to 12 sp) before a word would break; if it still can't fit, it goes under the figure.
  const room = width - Math.ceil(value.length * px * 0.62) - 6;
  const longest = Math.max(0, ...(unit ?? '').split(' ').map((w) => w.length));
  let upx = unitPx;
  while (unit && upx > 12 && longest * upx * 0.55 > room) upx -= 0.5;
  const stack = Boolean(unit) && longest * upx * 0.55 > room;
  return (
    <FlexWidget style={{ flexDirection: stack ? 'column' : 'row', alignItems: stack ? 'flex-start' : 'flex-end', width: 'match_parent' }}>
      {txt(value, F.serif, px, x.c.ink)}
      {unit ? (
        <FlexWidget style={stack ? {} : { flex: 1, marginLeft: 6, marginBottom: Math.round(px * 0.14) }}>{txt(unit, F.serifItalic, upx, unitColor, { lines: stack ? 1 : unitLines })}</FlexWidget>
      ) : null}
    </FlexWidget>
  );
}
/** The biggest figure that fits `room` dp tall (never more than `base` grown 1.1×). */
const figPx = (base: number, x: X, room: number, min = 24) => Math.max(min, Math.min(Math.round(base * Math.min(x.scale, 1.1)), Math.floor(room / LH)));

/**
 * Today's plan's step pips. Not by colour alone (WCAG 1.4.1): done ones are
 * filled sap, the current one is filled and longer, the ones to do are outlines.
 */
function pips(total: number, done: number, c: WidgetColors, w: number): JSX.Element {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: Math.min(total, 6) }, (_, i) => (
        <FlexWidget
          key={i}
          style={{
            width: i === done ? Math.round(w * 1.6) : w,
            height: 6,
            borderRadius: 3,
            marginLeft: 3,
            ...(i < done ? { backgroundColor: c.accent } : i === done ? { backgroundColor: c.ink } : { borderWidth: 1, borderColor: c.ink2 }),
          }}
        />
      ))}
    </FlexWidget>
  );
}
const pipsW = (total: number, w: number) => Math.min(total, 6) * (w + 3) + Math.round(w * 0.6);

/** The week's seven leaves (height `d` dp) with their day letters (dropped at large text, never the leaves). */
function leaves(filled: boolean[], today: number, c: WidgetColors, d: number, letters: boolean, scale: number): JSX.Element {
  const lw = Math.round(d * 0.75);
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      {filled.map((f, i) => (
        <FlexWidget key={i} style={{ flexDirection: 'column', alignItems: 'center', marginRight: i < 6 ? Math.max(3, Math.round(d * 0.32)) : 0 }}>
          <SvgWidget svg={leafSvg(f, i === today, c)} style={{ width: lw, height: d }} />
          {letters ? txt(LEAF_LETTERS[i], i === today ? F.sansBold : F.sans, sz(11, scale, 1.15), i === today ? c.ink : c.ink2, { mt: 2 }) : null}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
const leavesW = (d: number) => 7 * Math.round(d * 0.75) + 6 * Math.max(3, Math.round(d * 0.32));
const lettersH = (scale: number) => tall(sz(11, scale, 1.15)) + 2;

/**
 * Road to exam's weeks: behind in sap, this week in paper, ahead as outlines
 * (the exam's week is the last). This week is also TALLER than the others, so
 * it stands out by shape, not by colour alone (WCAG 1.4.1).
 */
const NOW_TALLER = 6;
function roadRow(behind: number, ahead: number, c: WidgetColors, h: number, max: number): JSX.Element {
  const a = Math.min(ahead, max - 1);
  const b = Math.min(behind, Math.max(0, max - 1 - a));
  const segs = [...Array.from({ length: b }, () => 'behind'), 'now', ...Array.from({ length: a }, () => 'ahead')];
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: h + NOW_TALLER }}>
      {segs.map((s, i) => (
        <FlexWidget
          key={i}
          style={{
            flex: 1,
            height: s === 'now' ? h + NOW_TALLER : h,
            borderRadius: 3,
            marginRight: i < segs.length - 1 ? 3 : 0,
            ...(s === 'behind' ? { backgroundColor: c.accent } : s === 'now' ? { backgroundColor: c.ink } : { borderWidth: 1, borderColor: c.ink2 }),
          }}
        />
      ))}
    </FlexWidget>
  );
}

// ── The kinds ─────────────────────────────────────────────────────────────
/** 1×1: the picture and one short word (This week's dot: a leaf and the count). */
function tiny(x: X, micro: boolean): El {
  const { face, c, theme } = x;
  const isWeek = face.art?.type === 'leaves' && face.titleStyle === 'number';
  const word = face.short ?? face.title.split(' ').slice(0, 3).join(' ');
  if (micro) {
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: 'center' }}>
        {isWeek && face.title ? txt(face.title, F.serif, 18, c.ink) : mark(c, 16)}
      </FlexWidget>
    );
  }
  const pic = x.huge ? null : isWeek ? (
    <SvgWidget svg={leafSvg(true, false, c)} style={{ width: 14, height: 19 }} />
  ) : face.art?.type === 'plant' ? (
    (() => {
      const svg = plantSvg(face.art.plant, theme);
      return svg ? <SvgWidget svg={svg} style={{ width: 44, height: 44 }} /> : mark(c, 18);
    })()
  ) : face.art?.type === 'rings' ? (
    <SvgWidget svg={ringsSvg(face.art.rings, face.art.weights, c, face.art.faint)} style={{ width: 44, height: 44 }} />
  ) : (
    mark(c, 18)
  );
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {pic}
      {isWeek && face.title ? txt(face.title, F.serif, 22, c.ink) : null}
      {isWeek && face.title ? txt('this week', F.sans, 10, c.ink2) : null}
      {!isWeek && word ? txt(word, F.sansMedium, 11, c.ink, { lines: 2, mt: 4, align: 'center' }) : null}
    </FlexWidget>
  );
}

/**
 * A face with words only (setup, "choose", calm exam words, empty states):
 * the mark and the label, the words as the hero, a detail line, a pill if any.
 */
function plain(x: X): El {
  const { face, c, size, iw, ih, scale } = x;
  const font = face.titleStyle === 'italic' ? F.serifItalic : F.serif;
  const showMark = face.art?.type === 'mark';
  if (size === 'strip') {
    const low = ih < LOW_STRIP - 2 * W.padStrip;
    const words = iw - (showMark && !x.big ? 26 : 0) - (face.action ? 120 : 0);
    // The detail line shows only whole, on one line (never cut short).
    const stripLine = !x.big && !low ? firstFit([face.line, face.shortLine], 11.5, words) : undefined;
    const lineOk = Boolean(stripLine);
    const titleRoom = ih - (lineOk ? tall(11.5) + 2 : 0);
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        {showMark && !x.big ? <FlexWidget style={{ marginRight: 10 }}>{mark(c, 16)}</FlexWidget> : null}
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          {heroText(face.title, face.short, font, sz(17, scale, SMALL_TITLE_CAP), SERIF_MIN, words, titleRoom, c.ink)}
          {stripLine ? txt(stripLine, F.sans, 11.5, c.ink2, { mt: 2 }) : null}
        </FlexWidget>
        {face.action ? pill(face.action, c, scale) : null}
      </FlexWidget>
    );
  }
  const small = size === 'small';
  const linePx = sz(12.5, scale, MEDIUM_TITLE_CAP);
  const line = small ? (face.shortLine ?? face.line) : face.line;
  const head = x.huge ? 0 : capH(x) + HAIR;
  const act = face.action ? TAP_MIN : 0;
  const lineH = line ? tall(linePx, small ? 2 : 3) + 4 : 0;
  // The words get the room first; the detail line only what is left.
  const room = Math.max(tall(SERIF_MIN), ih - head - act - (x.big ? 0 : lineH));
  const max = sz(small ? 21 : 26, scale, SMALL_TITLE_CAP);
  const fitted = fitText(face.title, max, SERIF_MIN, iw, room);
  const used = fitted ? tall(fitted.px, linesFor(face.title, fitted.px, iw)) : room;
  const lineRoom = ih - head - act - used - 4;
  const lineLines = line ? Math.min(small ? 2 : 3, Math.floor(lineRoom / tall(linePx))) : 0;
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column' }}>
      {x.huge ? null : (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
          {showMark ? <FlexWidget style={{ marginRight: 6 }}>{mark(c, 10)}</FlexWidget> : null}
          <FlexWidget style={{ flex: 1 }}>{caption(face.caption, x, iw - (showMark ? 16 : 0))}</FlexWidget>
        </FlexWidget>
      )}
      {x.huge ? null : hair(c)}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', width: 'match_parent' }}>
        {heroText(face.title, face.short, font, max, SERIF_MIN, iw, room, c.ink)}
        {line && lineLines > 0 ? txt(line, F.sans, linePx, c.ink2, { lines: lineLines, mt: 4 }) : null}
      </FlexWidget>
      {face.action ? pill(face.action, c, scale, { full: small }) : null}
    </FlexWidget>
  );
}

// 1. Today's plan (forest) ──────────────────────────────────────────────────
function plan(x: X): El {
  const { face, c, size, iw, ih, scale } = x;
  const number = face.titleStyle === 'number';
  if (!number && !face.steps) return plain(x);
  const task = number ? `${face.title} ${face.unit ?? ''}`.trim() : face.title;
  const steps = face.steps;
  if (size === 'strip') {
    // 2×1 (the whole widget starts the plan) and 4×1: the task in words, and the Start.
    const narrow = isNarrow(x);
    const right = narrow ? (face.action || face.link.includes('go=start') ? 52 : 0) : face.action ? 128 : 0;
    const both = [face.shortLine, face.aside].filter(Boolean).join(' · ');
    const sub = !x.big && ih >= LOW_STRIP - 2 * W.padStrip ? (firstFit([both, face.aside, face.shortLine], 11.5, iw - right) ?? '') : '';
    const room = ih - (sub ? tall(11.5) + 2 : 0) - (!narrow && !x.huge ? capH(x) : 0);
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          {!narrow && !x.huge ? caption(face.caption, x, iw - right) : null}
          {heroText(task, face.short, F.serif, sz(narrow ? 20 : 24, scale, SMALL_TITLE_CAP), SERIF_MIN, iw - right, room, c.ink)}
          {sub ? txt(sub, F.sans, 11.5, c.ink2, { mt: 2 }) : null}
        </FlexWidget>
        {narrow && face.link.includes('go=') && !face.link.includes('go=today') ? (
          <FlexWidget style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.btn, justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}>
            <SvgWidget svg={playSvg(c.onBtn)} style={{ width: 14, height: 14 }} />
          </FlexWidget>
        ) : null}
        {!narrow && face.action ? pill(face.action, c, scale) : null}
      </FlexWidget>
    );
  }
  const small = size === 'small';
  const pipW = small ? 12 : 20;
  const pipsEl = steps ? pips(steps.total, steps.done, c, pipW) : null;
  // A 2×2 keeps its pips under the figure, so the top row has room for the topic.
  const pipsTop = !small && !x.huge;
  const rightW = (steps && pipsTop ? pipsW(steps.total, pipW) + 6 : 0) + (!small && face.aside && !x.big ? asideW(x, face.aside) + 8 : 0);
  const head = x.huge ? 0 : capH(x) + HAIR;
  const act = (face.action ? TAP_MIN : 0) + (steps && !pipsTop ? 8 : 0);
  const linePx = sz(12.5, scale, MEDIUM_TITLE_CAP);
  const line = small ? undefined : face.line;
  let lineH = line && !x.big ? tall(linePx) + 4 : 0;
  let room = ih - head - act - lineH;
  // The figure comes first: the detail line goes before the figure would get small.
  if (lineH && room < 50) {
    room += lineH;
    lineH = 0;
  }
  const hero = number ? (
    figure(x, face.title, face.unit, figPx(small ? (iw < 140 ? 46 : 52) : 52, x, room), sz(small ? 14 : 22, scale, SMALL_TITLE_CAP), c.accentText)
  ) : (
    heroText(face.title, face.short, face.titleStyle === 'italic' ? F.serifItalic : F.serif, sz(small ? 24 : 30, scale, SMALL_TITLE_CAP), SERIF_MIN, iw, room, c.ink)
  );
  const actions = face.action ? (
    small ? (
      pill(face.action, c, scale, { full: true })
    ) : (
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        {pill(face.action, c, scale)}
        {face.action2 && !x.big ? quiet(face.action2, c, scale) : null}
      </FlexWidget>
    )
  ) : null;
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column' }}>
      {x.huge ? null : (
        topRow(
          x,
          face.caption,
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!small && face.aside && !x.big ? asideEl(x, face.aside, c.accentText) : null}
            {pipsEl && pipsTop ? <FlexWidget style={{ marginLeft: 6 }}>{pipsEl}</FlexWidget> : null}
          </FlexWidget>,
          rightW + 8,
        )
      )}
      {x.huge ? null : hair(c)}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', width: 'match_parent' }}>
        {hero}
        {lineH && line ? txt(line, F.sans, linePx, c.ink2, { mt: 4 }) : null}
        {!face.action && face.line && small ? txt(face.line, F.sans, linePx, c.ink2, { lines: 2, mt: 4 }) : null}
        {pipsEl && !pipsTop ? <FlexWidget style={{ width: 'match_parent', alignItems: 'flex-end', marginTop: 4 }}>{pipsEl}</FlexWidget> : null}
      </FlexWidget>
      {actions}
    </FlexWidget>
  );
}

// 2. This week (paper; the only leaves) ─────────────────────────────────────
function week(x: X): El {
  const { face, c, size, iw, ih, scale } = x;
  if (face.art?.type !== 'leaves') return plain(x);
  const { filled, today } = face.art;
  const number = face.titleStyle === 'number';
  const count = face.title;
  const one = count === '1';
  const letters = !x.big;
  if (size === 'strip') {
    const narrow = isNarrow(x);
    // A 2×1 (Option C): "3 days" and the seven leaves, small; the day letters go before the unit does.
    const d = narrow ? 12 : Math.max(11, Math.min(iw < 320 ? 22 : 26, ih - (letters ? lettersH(scale) : 0)));
    const room = iw - leavesW(d) - 10;
    const unit = number ? (one ? 'day' : 'days') : undefined;
    // On a 2×1 the figure steps down (not under 22) until its unit fits beside it at 12 sp or more.
    let fpx = figPx(narrow ? 34 : 44, x, ih, 20);
    while (narrow && unit && fpx > 22 && room - Math.ceil(count.length * fpx * 0.62) - 6 < unit.length * 12 * 0.55) fpx -= 1;
    const left = number ? figure(x, count, unit, fpx, sz(narrow ? 13 : 15, scale, SMALL_TITLE_CAP), c.ink2, 1, room) : heroText(face.title, face.short, F.serif, sz(17, scale, 1.3), SERIF_MIN, room, ih, c.ink);
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{ flex: 1 }}>{left}</FlexWidget>
        {leaves(filled, today, c, d, letters && !narrow, scale)}
      </FlexWidget>
    );
  }
  const small = size === 'small';
  const d = small ? (iw < 140 ? 16 : 19) : iw < 320 ? 24 : 28;
  const fit = Math.min(d, Math.floor((iw - 6 * 4) / 7 / 0.75));
  const leafH = fit + (letters ? lettersH(scale) : 0);
  const head = x.huge ? 0 : capH(x) + HAIR;
  const linePx = sz(12, scale, 1.3);
  const weekLines = small && !x.big && face.line ? (fitsLines(face.line, linePx, iw, 1) ? 1 : 2) : 0;
  const lineShown = weekLines ? tall(linePx, weekLines) + 6 : 0;
  const room = ih - head - leafH - lineShown - 4;
  const unit = number ? (small ? face.unit : `${face.unit} this week`) : undefined;
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column' }}>
      {x.huge ? null : topRow(x, face.caption, !small && face.aside && !x.big ? asideEl(x, face.aside) : null, !small && face.aside && !x.big ? asideW(x, face.aside) : 0)}
      {x.huge ? null : hair(c)}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', width: 'match_parent' }}>
        {number
          ? figure(x, count, unit, figPx(small ? 56 : 60, x, room, 22), sz(small ? 15 : 18, scale, SMALL_TITLE_CAP), c.ink2)
          : heroText(face.title, face.short, F.serif, sz(small ? 21 : 26, scale, 1.3), SERIF_MIN, iw, room, c.ink)}
      </FlexWidget>
      {leaves(filled, today, c, fit, letters, scale)}
      {lineShown ? txt(face.line as string, F.serifItalic, linePx, c.ink2, { mt: 6, lines: weekLines }) : null}
    </FlexWidget>
  );
}

// 3. Your plant (the botanical plate) ───────────────────────────────────────
function plant(x: X): El {
  const { face, c, theme, size, iw, ih, scale } = x;
  if (face.art?.type !== 'plant') return plain(x);
  const svg = plantSvg(face.art.plant, theme);
  const pic = (d: number) => (svg ? <SvgWidget svg={svg} style={{ width: d, height: d }} /> : mark(c, Math.round(d * 0.5)));
  const figLine = `${face.sub ?? ''} · ${face.title}`;
  if (size === 'strip') {
    const narrow = isNarrow(x);
    const d = Math.min(ih + 8, 64);
    const sub = x.big || ih < LOW_STRIP - 2 * W.padStrip ? '' : narrow ? (face.sub ?? '') : `${face.caption} · ${face.badge ?? face.line ?? ''}`.replace(/\.$/, '');
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        {pic(d)}
        <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: 8 }}>
          {heroText(narrow ? face.title : figLine, face.title, F.serifItalic, sz(17, scale, SMALL_TITLE_CAP), SERIF_MIN, iw - d - 8, ih - (sub ? tall(11.5) : 0), c.ink)}
          {sub ? txt(sub, F.sans, 11.5, c.ink2, { mt: 2 }) : null}
        </FlexWidget>
      </FlexWidget>
    );
  }
  if (size === 'small') {
    const top = x.huge ? 0 : capH(x) + 6;
    const titlePx = sz(15, scale, SMALL_TITLE_CAP);
    const titleLines = fitsLines(figLine, titlePx, iw, 1) ? 1 : 2;
    const d = Math.max(56, Math.min(iw, ih - top - tall(titlePx, titleLines) - 2));
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column', alignItems: 'center' }}>
        {x.huge ? null : topRow(x, face.badge ?? face.caption, null, 0)}
        <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{pic(d)}</FlexWidget>
        {txt(figLine, F.serifItalic, titlePx, c.ink, { lines: titleLines, align: 'center' })}
      </FlexWidget>
    );
  }
  // 4×2 and up: the plate's figure on the left, the stage as the words.
  const d = Math.min(ih + 6, Math.round(iw * 0.42));
  const head = x.huge ? 0 : capH(x) + HAIR;
  const linePx = sz(13, scale, 1.4);
  const lineText = `${face.sub ?? ''}. ${face.line ?? ''}`.trim();
  const room = ih - head - tall(linePx, 2) - (face.badge && !x.big ? 26 : 0);
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', alignItems: 'flex-end' }}>
      {pic(d)}
      <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', marginLeft: 12 }}>
        {x.huge ? null : topRow(x, face.caption, null, 0)}
        {x.huge ? null : hair(c)}
        <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
          {txt(face.title, F.serif, figPx(42, x, Math.max(30, room), 22), c.ink)}
          {txt(lineText, F.serifItalic, linePx, c.ink2, { lines: 2, mt: 4 })}
          {face.badge && !x.big ? (
            <FlexWidget style={{ backgroundColor: c.bg === c.soft ? c.track : c.soft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 }}>
              {txt(face.badge, F.sansMedium, 11, c.accentText)}
            </FlexWidget>
          ) : null}
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

// 4–6. The reveal cards: Today's rule, the Recall card (ruled) and the Key term ──
/** The card's label: a clay "Rule" or "Q." on an index card, then the caption. */
function cardLabel(x: X, width: number): JSX.Element {
  const { face, c } = x;
  const glyph = face.tone === 'card' ? (face.kind === 'think' ? 'Rule' : 'Q.') : '';
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
      {glyph ? txt(glyph, face.kind === 'think' ? F.serifItalic : F.serif, sz(14, x.scale, 1.2), c.margin) : null}
      <FlexWidget style={{ flex: 1, marginLeft: glyph ? 6 : 0 }}>{caption(face.caption, x, width - (glyph ? 34 : 0))}</FlexWidget>
    </FlexWidget>
  );
}

/** How tall a reveal card's top row is (the reveal button lives there, so it is a full tap target). */
export function cardTop(face: WidgetFace, size: SizeClass, scale: number): number {
  const showButton = face.reveal === 'hidden' && face.action?.widgetAction === 'REVEAL';
  if (showButton) return TAP_MIN;
  // A shown rule or answer on a 4×2 carries its label beside its buttons instead (more room for the words).
  if (face.reveal === 'shown' && face.kind !== 'revisit' && face.action && (size === 'medium' || size === 'large')) return 0;
  return scale >= HUGE_TEXT ? 0 : tall(sz(CAPTION, scale, SMALL_TITLE_CAP)) + 6;
}

/**
 * A shown key term's layout at `x.scale`, with its meaning never under `minPx`
 * (the size it has at 100% text, so bigger text never makes it smaller). Tries,
 * in order, until the meaning fits whole: label + term + meaning; no label;
 * the term at its 100% size; then "RPO: meaning" as one block (ended cleanly if
 * it still can't fit).
 */
function shownTermLayout(x: X, minPx: number, iw: number, ih: number, bottom: number) {
  const { face, size, scale } = x;
  const small = size === 'small';
  const narrowW = Math.floor(iw * 0.96);
  const bodyMax = Math.max(minPx, sz(small ? 13 : 13.5, scale, 1.3));
  const meaning = face.line ?? '';
  const both = face.sub ? `${face.sub} · ${face.title}` : face.title;
  const top = cardTop(face, size, scale);
  const stage = (label: boolean, termPx: number) => {
    // "RPO · Recovery point objective", or the abbreviation alone when that won't fit one line (or at large text).
    const termText = !face.sub ? both : x.big || !fitsLines(both, termPx, iw, 1) ? face.sub : both;
    const termLines = fitsLines(termText, termPx, iw, 1) ? 1 : 2;
    const room = ih - (label ? top : 0) - bottom - (label && !small ? HAIR : 0) - 4 - tall(termPx, termLines) - 4;
    const m = fitBody(meaning, bodyMax, narrowW, room, 12, minPx);
    return { label, termPx, termText, termLines, m, block: false, left: room - tall(m.px, m.lines) };
  };
  const px = sz(small ? 15 : 17, scale, 1.1);
  const px1 = small ? 15 : 17;
  const tries = [...(top > 0 ? [stage(true, px)] : []), stage(false, px), ...(px1 < px ? [stage(false, px1)] : [])];
  const whole = tries.find((t) => t.m.whole);
  if (whole) return whole;
  const room = ih - bottom - 4;
  const m = fitBody(`${face.sub ?? face.title}: ${meaning}`, bodyMax, narrowW, room, 12, minPx);
  return { ...tries[tries.length - 1], label: false, m, block: true, left: room - tall(m.px, m.lines) };
}

function card(x: X): El {
  const { face, c, size, iw, ih, scale } = x;
  const hidden = face.reveal === 'hidden' && face.action?.widgetAction === 'REVEAL';
  const pair = face.reveal === 'shown' && face.action?.widgetAction === 'HAD' && face.action2?.widgetAction === 'NOTYET' ? face.action2 : null;
  const term = face.kind === 'revisit';
  const shownTerm = term && face.reveal === 'shown';
  const font = face.titleStyle === 'italic' ? F.serifItalic : F.serif;
  if (!face.reveal) return plain(x);
  if (size === 'strip') {
    const narrow = isNarrow(x);
    const pairW = pair && !narrow ? 150 : 0;
    const showW = hidden && !narrow ? 76 : 0;
    const actW = !pair && !hidden && face.action && !narrow ? 110 : 0;
    const words = iw - pairW - showW - actW;
    const head = !x.big && !narrow && !shownTerm ? capH(x) : 0;
    const subOk = !x.big && Boolean(face.sub) && !shownTerm;
    const room = ih - head - (subOk ? tall(12) : 0);
    // A 2×1 shows the short prompt; a shown key term its meaning under the term.
    // One block, so the meaning gets the strip's whole height: "RPO: The most data, …" (never under BODY_MIN; ended cleanly if it must be).
    const termBody = shownTerm ? fitBody(`${face.sub ?? face.title}: ${face.line ?? ''}`, sz(12.5, scale, 1.3), Math.floor(words * 0.92), ih) : null;
    const main = termBody ? (
      txt(termBody.text, F.sans, termBody.px, c.ink, { lines: termBody.lines })
    ) : (
      // Fraunces never under SERIF_MIN: the short form takes over first.
      heroText(narrow && face.short ? face.short : face.title, face.short, font, sz(narrow ? 14 : 16, scale, SMALL_TITLE_CAP), SERIF_MIN, words, room, c.ink)
    );
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        {showW ? <FlexWidget style={{ marginRight: 10 }}>{pill(face.action as FaceAction, c, scale, { label: 'Show', cap: 1.15 })}</FlexWidget> : null}
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          {head ? caption(face.caption, x, words) : null}
          {main}
          {subOk ? txt(face.sub as string, F.serifItalic, 12, c.ink2) : null}
        </FlexWidget>
        {pairW ? (
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
            {pill(face.action as FaceAction, c, scale, { cap: 1.15 })}
            <FlexWidget style={{ marginLeft: 6 }}>{pill(pair as FaceAction, c, scale, { outline: true, cap: 1.15 })}</FlexWidget>
          </FlexWidget>
        ) : null}
        {actW ? <FlexWidget style={{ marginLeft: 8 }}>{pill(face.action as FaceAction, c, scale)}</FlexWidget> : null}
      </FlexWidget>
    );
  }
  const small = size === 'small';
  const top = cardTop(face, size, scale);
  // A shown rule or answer on a 4×2 moves its label down beside its buttons, so the rule or cue gets the room.
  const labelBelow = top === 0 && !x.huge && face.reveal === 'shown';
  const bottom = pair || (face.action && !hidden) ? TAP_MIN : 0;
  const showLabel = top > 0;
  const right = hidden ? pill(face.action as FaceAction, c, scale, { label: small ? 'Show' : face.action?.label, cap: 1.15 }) : !small && face.aside && !x.big ? asideEl(x, face.aside) : null;
  const rightW = hidden ? (small ? 70 : Math.ceil((face.action?.label.length ?? 4) * sz(13.5, scale, 1.15) * 0.58) + 34) : !small && face.aside && !x.big ? asideW(x, face.aside) : 0;
  // The revealed words' measure: a little inside the card's width (text estimates stay on the safe side).
  const narrowW = Math.floor(iw * 0.96);
  const bodyMax = sz(small ? 13 : 13.5, scale, 1.3);
  let labelShown = showLabel;
  let middle: JSX.Element;
  if (shownTerm) {
    // A shown key term: the term, then the meaning, sized FIRST (it is the content). At a bigger
    // text size the meaning never gets smaller than it is at 100%: the label goes first, then the
    // term stops growing, then the term and meaning become one block ("RPO: The most data, …").
    const t = shownTermLayout(x, Math.max(BODY_MIN, shownTermLayout({ ...x, scale: 1, big: false }, BODY_MIN, iw, ih, bottom).m.px), iw, ih, bottom);
    const { m, block, termPx, termText, termLines } = t;
    labelShown = t.label;
    // "A new term each morning." only under a meaning shown whole, with room to spare.
    const line2Ok = face.line2 && !x.big && m.whole && t.left >= tall(12) + 4;
    middle = (
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', width: 'match_parent' }}>
        {block ? null : txt(termText, F.serif, termPx, c.ink, { lines: termLines })}
        {txt(m.text, F.sans, m.px, c.ink, { lines: m.lines, mt: block ? 0 : 4 })}
        {line2Ok ? txt(face.line2 as string, F.serifItalic, sz(12, scale, 1.3), c.ink2, { mt: 4 }) : null}
      </FlexWidget>
    );
  } else {
    const room = ih - top - bottom - 4;
    // The hero: the question (its short form on a 2×2 rule), the answer, the term.
    const heroFull = small && face.kind === 'think' && hidden && face.short ? face.short : face.title;
    // On a 2×2, a shown rule or answer stands alone (Option C): its explanation opens in the app.
    const cardLine = small && face.reveal === 'shown' ? undefined : face.line;
    // A hidden term is the big hero ("RPO"; a plain term like "Single point of failure" big too);
    // a shown rule or answer leaves the room to the words under it.
    const heroMax = term && hidden ? sz(face.sub ? (small ? 40 : 52) : small ? 22 : 28, scale, 1.15) : face.reveal === 'shown' && cardLine ? sz(small ? 17 : 17.5, scale, 1.15) : sz(small ? 18 : 17.5, scale, SMALL_TITLE_CAP);
    const subPx = sz(small ? 12.5 : 13.5, scale, 1.3);
    const subH = face.sub && hidden ? tall(subPx, 2) : 0;
    // The revealed words (the rule, the Exam cue) are sized first; the hero gets what is left (never under SERIF_MIN).
    let body: ReturnType<typeof fitBody> | null = null;
    let fit: { px: number; lines: number } | null = null;
    if (cardLine && face.reveal === 'shown') {
      for (let px = bodyMax; px >= BODY_MIN && !fit; px -= 0.5) {
        const lines = linesFor(cardLine, px, narrowW);
        const heroRoom = room - tall(px, lines) - 4;
        const f = heroRoom >= tall(SERIF_MIN) ? fitText(heroFull, heroMax, SERIF_MIN, iw, heroRoom) : null;
        if (f) {
          fit = f;
          body = { text: cardLine, px, lines, whole: true };
        }
      }
      if (!fit) {
        // Even at the smallest sizes both can't fit whole: the hero at SERIF_MIN, the words ended cleanly under it.
        const heroLines = Math.max(1, Math.min(linesFor(heroFull, SERIF_MIN, iw), Math.floor((room - tall(BODY_MIN) - 4) / (SERIF_MIN * LH))));
        fit = { px: SERIF_MIN, lines: heroLines };
        body = fitBody(cardLine, BODY_MIN, narrowW, room - tall(SERIF_MIN, heroLines) - 4);
      }
    } else {
      // A hidden card's question is its content: the whole question at SERIF_MIN or more, else (a long stem on a
      // 360 dp phone) a little smaller rather than cut, as in 1.48.
      fit = fitText(heroFull, heroMax, SERIF_MIN, iw, Math.max(tall(SERIF_MIN), room - subH)) ?? fitText(heroFull, heroMax, 11, iw, room - subH);
    }
    const heroUsed = fit ? tall(fit.px, Math.min(fit.lines, linesFor(heroFull, fit.px, iw))) : room;
    const bodyUsed = body ? tall(body.px, body.lines) + 4 : 0;
    const line2Ok = face.line2 && !x.big && room - heroUsed - subH - bodyUsed >= tall(12) + 4;
    middle = (
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', width: 'match_parent' }}>
        {fit ? txt(heroFull, font, fit.px, c.ink, { lines: fit.lines }) : heroText(heroFull, face.short, font, heroMax, SERIF_MIN, iw, room - subH, c.ink)}
        {face.sub && hidden ? txt(face.sub, F.serifItalic, subPx, c.ink2, { lines: 2 }) : null}
        {body ? txt(body.text, F.sans, body.px, c.ink2, { lines: body.lines, mt: 4 }) : null}
        {line2Ok ? txt(face.line2 as string, F.serifItalic, sz(12, scale, 1.3), c.ink2, { mt: 4 }) : null}
      </FlexWidget>
    );
  }
  const termHair = term && labelShown && !hidden && !small;
  // Beside the buttons, on a 4×2: the card's label, quietly (only if it fits whole).
  const usedByButtons = pair ? 2 * 92 + 8 : face.action && !hidden ? 120 : 0;
  const below = labelBelow ? captionFit(face.caption, scale, iw - usedByButtons - 12) : '';
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column' }}>
      {labelShown ? (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: top }}>
          {cardLabel(x, iw - rightW)}
          {right}
        </FlexWidget>
      ) : null}
      {termHair ? hair(c) : null}
      {middle}
      {pair ? (
        // The pair sits at the bottom, away from the reveal button (which was in the top row).
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
          {pill(face.action as FaceAction, c, scale, small ? { fill: true, cap: 1.15 } : { cap: 1.3 })}
          <FlexWidget style={{ marginLeft: 8, ...(small ? { flex: 1 } : {}) }}>{pill(pair, c, scale, small ? { fill: true, outline: true, cap: 1.15 } : { outline: true, cap: 1.3 })}</FlexWidget>
          {below ? <FlexWidget style={{ flex: 1, alignItems: 'flex-end' }}>{txt(below, F.sansBold, sz(CAPTION, scale, SMALL_TITLE_CAP), c.ink2, { ls: 1.1 })}</FlexWidget> : null}
        </FlexWidget>
      ) : face.action && !hidden ? (
        small ? (
          pill(face.action, c, scale, { full: true })
        ) : (
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
            {pill(face.action, c, scale)}
            {below ? <FlexWidget style={{ flex: 1, alignItems: 'flex-end' }}>{txt(below, F.sansBold, sz(CAPTION, scale, SMALL_TITLE_CAP), c.ink2, { ls: 1.1 })}</FlexWidget> : null}
          </FlexWidget>
        )
      ) : null}
    </FlexWidget>
  );
  // (An index card's ruling is drawn behind this by WidgetLayout: it must sit behind the padding.)
}

// 7. Readiness (paper; the rings are the hero) ──────────────────────────────
function readiness(x: X): El {
  const { face, c, size, iw, ih, scale } = x;
  if (face.art?.type !== 'rings') return plain(x);
  const a = face.art;
  const rings = (d: number) => <SvgWidget svg={ringsSvg(a.rings, a.weights, c, a.faint)} style={{ width: d, height: d }} />;
  const range = face.titleStyle === 'number';
  const head = range ? `${face.title}${face.unit ?? ''}` : face.title;
  // A range ALWAYS says what it is, at every size and text scale (DESIGN_SYSTEM §20.3):
  // "A study estimate, not a prediction." or, short, "A study estimate". What grew gets only the room left.
  const qualifier = range ? (face.shortLine ?? 'A study estimate') : '';
  const note = (range ? (face.line ?? qualifier) : face.line) ?? '';
  // A small card says the shorter detail ("14 more answers to a first estimate").
  const smallNote = (range ? qualifier : (face.shortLine ?? face.line)) ?? '';
  const extra = range ? face.line2 : undefined;
  if (size === 'strip') {
    // The rings give way (down to 36 dp) so a range's "A study estimate" fits one line beside them.
    const d = Math.min(ih, 60, range ? Math.max(36, iw - 12 - Math.ceil(qualifier.length * 11.5 * CHAR_W) - 2) : 60);
    const words = iw - d - 12;
    const headPx = sz(iw < 230 ? 15 : 18, scale, 1.2);
    const headFit = fitText(head, headPx, SERIF_MIN, words, ih) ? head : (face.short ?? head);
    const headLines = linesFor(headFit, headPx, words) > 1 && ih >= tall(headPx, 2) ? 2 : 1;
    const noteRoom = ih - tall(headPx, headLines);
    const noteText = range ? (firstFit([note, smallNote], 11.5, words) ?? smallNote) : !x.big && noteRoom >= tall(11) ? firstFit([note, smallNote], 11.5, words) : undefined;
    const noteLines = noteText && !fitsLines(noteText, 11.5, words, 1) ? 2 : 1;
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        {rings(d)}
        <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: 12 }}>
          {heroText(headFit, face.short, F.serif, headPx, SERIF_MIN, words, ih - (noteText ? tall(11.5, noteLines) : 0), c.ink)}
          {noteText ? txt(noteText, F.serifItalic, 11.5, c.ink2, { lines: noteLines }) : null}
        </FlexWidget>
      </FlexWidget>
    );
  }
  if (size === 'small') {
    const top = x.huge ? 0 : capH(x) + HAIR;
    const headPx = sz(range ? 20 : 15, scale, 1.2);
    const headText = fitsLines(head, headPx, iw, 1) ? head : (face.short ?? head);
    const notePx = sz(12.5, scale, 1.3);
    // The qualifier stays at every scale for a range; other notes go at large text.
    const noteLines = !smallNote || (x.big && !range) ? 0 : fitsLines(smallNote, notePx, iw, 1) ? 1 : 2;
    const ringsRoom = ih - top - tall(headPx) - tall(notePx, noteLines) - 6;
    // What grew, only if the rings keep a good size with it.
    const extraOk = Boolean(extra) && !x.big && fitsLines(extra as string, notePx, iw, 1) && ringsRoom - tall(notePx) >= 72;
    const d = Math.max(48, Math.min(96, iw, ringsRoom - (extraOk ? tall(notePx) : 0)));
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column', alignItems: 'center' }}>
        {x.huge ? null : topRow(x, face.caption, null, 0)}
        {x.huge ? null : hair(c)}
        <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{rings(d)}</FlexWidget>
        {heroText(headText, face.short, F.serif, headPx, SERIF_MIN, iw, tall(headPx), c.ink, 'center')}
        {noteLines ? txt(smallNote, F.serifItalic, notePx, c.ink2, { lines: noteLines, align: 'center' }) : null}
        {extraOk ? txt(extra as string, F.serifItalic, notePx, c.accentText, { align: 'center' }) : null}
      </FlexWidget>
    );
  }
  // 4×2 and up: the rings at the card's full height on the left (a little narrower for a range, so its words fit).
  const d = Math.min(ih, Math.round(iw * (range ? 0.36 : 0.42)));
  const words = iw - d - 14;
  const top = x.huge ? 0 : capH(x) + HAIR;
  const notePx = sz(13.5, scale, 1.4);
  const noteW = Math.floor(words * 0.92);
  // A range: the qualifier (whole, or its short form) under the figure; then what grew, if there is room.
  const qPx = sz(12.5, scale, 1.5);
  const qText = range ? (fitsLines(note, qPx, noteW, 2) ? note : qualifier) : '';
  const qLines = range ? (fitsLines(qText, qPx, noteW, 1) ? 1 : 2) : 0;
  const qH = range ? tall(qPx, qLines) + 2 : 0;
  const extraH = tall(qPx) + 6;
  const extraOk = range && Boolean(extra) && !x.big && fitsLines(extra as string, qPx, noteW, 1) && ih - top - qH - extraH >= 50;
  const room = range ? ih - top - qH - (extraOk ? extraH : 0) : ih - top - tall(notePx, 2);
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
      {rings(d)}
      <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', marginLeft: 14 }}>
        {x.huge ? null : topRow(x, face.caption, null, 0)}
        {x.huge ? null : hair(c)}
        <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
          {range ? figure(x, face.title, face.unit, figPx(44, x, Math.max(28, room), 22), sz(20, scale, 1.15), c.ink2, 1, words) : heroText(face.title, face.short, F.serif, sz(26, scale, 1.2), SERIF_MIN, words, room, c.ink)}
          {range ? txt(qText, F.sans, qPx, c.ink2, { lines: qLines, mt: 2 }) : null}
          {extraOk ? txt(extra as string, F.serifItalic, qPx, c.accentText, { mt: 6 }) : null}
          {!range && note ? txt(fitsLines(note, notePx, noteW, 2) ? note : smallNote, F.serifItalic, notePx, c.accentText, { lines: 2, mt: 6 }) : null}
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

// 8. Road to exam (the ink card) ────────────────────────────────────────────
function road(x: X): El {
  const { face, c, size, iw, ih, scale } = x;
  const r = face.road;
  if (!r) return plain(x);
  const weeks = String(r.ahead);
  const one = r.ahead === 1;
  if (size === 'strip') {
    const narrow = isNarrow(x);
    const figW = narrow ? 76 : 150;
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{ width: figW }}>{figure(x, weeks, narrow ? (one ? 'week' : 'weeks') : one ? 'week to go' : 'weeks to go', figPx(narrow ? 34 : 40, x, ih, 20), sz(narrow ? 13 : 15, scale, 1.2), c.ink2, 1, figW)}</FlexWidget>
        <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: 8 }}>
          {!narrow && !x.big ? txt(face.title, F.serifItalic, sz(13, scale, 1.2), c.ink2, { lines: 1 }) : null}
          <FlexWidget style={{ marginTop: !narrow && !x.big ? 6 : 0, width: 'match_parent' }}>{roadRow(r.behind, r.ahead, c, narrow ? 12 : 14, narrow ? 8 : 12)}</FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  }
  const small = size === 'small';
  const top = x.huge ? 0 : capH(x) + HAIR;
  const segH = small ? 14 : 20;
  const notePx = sz(13, scale, 1.3);
  const togoH = small ? tall(notePx) + 2 : 0;
  const lineH = !small && face.line && !x.big ? tall(notePx) + 4 : 0;
  const room = ih - top - segH - NOW_TALLER - 8 - togoH - lineH;
  const title = small ? face.title : `This week: ${face.title.charAt(0).toLowerCase()}${face.title.slice(1)}`;
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column' }}>
      {x.huge ? null : topRow(x, face.caption, !small && face.aside ? asideEl(x, face.aside, c.accentText) : null, !small && face.aside ? asideW(x, face.aside) : 0)}
      {x.huge ? null : hair(c)}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', width: 'match_parent' }}>
        {heroText(title, face.title, F.serif, sz(small ? 22 : 28, scale, SMALL_TITLE_CAP), SERIF_MIN, iw, room, c.ink)}
        {small && face.aside ? txt(face.aside, F.serifItalic, notePx, c.accentText, { mt: 2 }) : null}
        {lineH ? txt(face.line as string, F.serifItalic, notePx, c.ink2, { mt: 4 }) : null}
        {x.huge && !small && face.aside ? txt(face.aside, F.serifItalic, notePx, c.accentText, { mt: 2 }) : null}
      </FlexWidget>
      <FlexWidget style={{ marginTop: 8, width: 'match_parent' }}>{roadRow(r.behind, r.ahead, c, segH, small ? 10 : 16)}</FlexWidget>
    </FlexWidget>
  );
}

// ── Large text and narrow strips ──────────────────────────────────────────
/**
 * The face for large text: the extras go first (the third line and a quiet
 * second action, then a plan's detail line), never the main words, a key
 * word, a reveal card's answer or the main tap. The self-check pair always stays.
 */
export function forLargeText(face: WidgetFace, size: SizeClass, fontScale: number): WidgetFace {
  if (fontScale < BIG_TEXT) return face;
  const keepPair = face.action2?.widgetAction ? face.action2 : undefined;
  let f: WidgetFace = { ...face, line2: undefined, action2: keepPair };
  // A revealed card's words ARE its content (the rule, the cue, the meaning): the layout fits them.
  if (f.action && size !== 'large' && f.kind !== 'readiness' && f.reveal !== 'shown') f = { ...f, line: undefined, shortLine: undefined };
  if (fontScale >= HUGE_TEXT && f.reveal !== 'shown') {
    const estimate = f.kind === 'readiness' && f.titleStyle === 'number';
    f = { ...f, line: estimate ? (f.shortLine ?? f.line) : f.kind === 'readiness' || (size === 'large' && !f.action) ? f.line : undefined, shortLine: estimate ? f.shortLine : undefined };
  }
  return f;
}

/**
 * A narrow strip (a 2×1, or a 2×2 squeezed to one row): no room for a pill
 * beside the words, so the whole widget does the main action. A reveal card
 * reveals on a tap; once shown, its tap opens it in the app (the pair stays
 * on bigger sizes).
 */
export function forNarrowStrip(face: WidgetFace): WidgetFace {
  if (!face.action) return face;
  // The pair is gone: don't ask "Did you have it?" where it can't be answered. The card opens it in the app.
  if (face.action2?.widgetAction) return { ...face, action: undefined, action2: undefined, label: face.label.replace(/ Did you have it\?$/, ' Double-tap to open it in KaiSip.') };
  const a = face.action;
  const widgetAction = a.widgetAction ?? (a.link ? undefined : face.widgetAction);
  // TalkBack hears what a double-tap really does here, once: the full-size hints
  // ("Show the answer is the next button. Double-tap the card to open it…") don't apply to a strip.
  const base = face.label
    .replace(/ [^.]* is the next button\./, '')
    .replace(/ Double-tap[^.]*\./g, '')
    .trim();
  const hint = widgetAction === 'REVEAL' ? `Double-tap to ${a.label.charAt(0).toLowerCase()}${a.label.slice(1)}.` : `Double-tap: ${a.label}.`;
  return { ...face, link: a.link || face.link, widgetAction, action: undefined, action2: undefined, label: `${base} ${hint}` };
}

/** The whole widget, for one face at one size in one theme. */
export function WidgetLayout({ face: given, theme, width, height, fontScale }: LayoutProps): JSX.Element {
  const size = sizeClass(width, height);
  const narrow = size === 'strip' && width < NARROW_STRIP;
  const face = forLargeText(narrow ? forNarrowStrip(given) : given, size, fontScale);
  const c = widgetColors(face.tone, theme);
  const padding = size === 'tiny' ? (width < MICRO || height < MICRO ? 2 : W.padTiny) : size === 'strip' ? W.padStrip : W.pad;
  // A revealed card's buttons sit in their own 48 dp tap row, which already has white space under the pill:
  // the bottom padding steps down to W.padPill, so the revealed words get that room (1.48 QA).
  const pillRow = Boolean(face.reveal) && face.reveal === 'shown' && Boolean(face.action) && size !== 'tiny' && size !== 'strip';
  const padBottom = pillRow ? W.padPill : padding;
  const x: X = { face, c, theme, size, iw: width - 2 * padding, ih: height - padding - padBottom, scale: fontScale, big: fontScale >= BIG_TEXT, huge: fontScale >= HUGE_TEXT };
  const body =
    size === 'tiny'
      ? tiny(x, width < MICRO || height < MICRO)
      : face.kind === 'plan'
        ? plan(x)
        : face.kind === 'week'
          ? week(x)
          : face.kind === 'plant'
            ? plant(x)
            : face.kind === 'readiness'
              ? readiness(x)
              : face.kind === 'countdown'
                ? road(x)
                : card(x);
  const click = clickFor(face.link, face.widgetAction, face.label);
  const forest = face.tone === 'forest' && c.bgTop;
  const background = forest ? { backgroundGradient: { from: c.bgTop as `#${string}`, to: c.bg, orientation: 'TOP_BOTTOM' as const } } : { backgroundColor: c.bg };
  const border = c.border ? { borderWidth: 1, borderColor: c.border } : {};
  // The index card's ruling sits behind the words (decorative), from just under the top row.
  const ruled = face.tone === 'card' && Boolean(face.reveal) && size !== 'tiny' && size !== 'strip';
  const content = (
    <FlexWidget {...click} style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column', padding, paddingBottom: padBottom, ...(ruled ? {} : { borderRadius: W.radius, ...background, ...border }) }}>
      {body}
    </FlexWidget>
  );
  if (!ruled) return content;
  const cardTopH = cardTop(face, size, fontScale);
  const top = cardTopH > 0 ? padding + cardTopH + 2 : padding - 5;
  return (
    <OverlapWidget style={{ width: 'match_parent', height: 'match_parent', borderRadius: W.radius, ...background, ...border }}>
      <SvgWidget svg={ruledSvg(width, height, top, c)} style={{ width, height }} />
      {content}
    </OverlapWidget>
  );
}
