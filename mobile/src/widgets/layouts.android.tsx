'use no memo';
/**
 * The Android widget layouts (mobile 1.47): one face (engine/widgets.ts), drawn
 * with react-native-android-widget's primitives at the widget's real size.
 *
 * Android-only file: the widget library loads only from `.android.ts(x)`.
 * Everything here is a plain function called inline (no hooks, no React
 * Compiler: the library walks the tree itself, and a component that returns
 * null would break that walk; hence 'use no memo' above).
 *
 * Plain-English rules the layouts follow (docs/mobile/DESIGN_SYSTEM.md §20):
 * - Grove colours, light and dark (Android picks with the phone's dark mode).
 * - Fraunces for the reading moment (a title, a figure, a rule in italic),
 *   Figtree for everything you scan or tap. Nothing smaller than 10 sp, and
 *   captions at 11 sp or more.
 * - One main tap target on small widgets, two at most on bigger ones; every
 *   target is at least 48 dp tall.
 * - The words carry the meaning: at large text the art and the second lines go
 *   first, never the main words. A 2×2 title grows at most 1.3×, so a single
 *   word never splits; a 4×1 drops its picture before its words.
 * - TalkBack hears minutes in full ("12 minutes", engine/pace.ts spokenMin).
 * - No red, no animation, nothing that changes with the hour.
 */
import type { JSX } from 'react';
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { spokenMin } from '../engine/pace';
import { BIG_TEXT, LEAF_LETTERS, sizeClass, type FaceAction, type SizeClass, type WidgetFace } from '../engine/widgets';
import { frondSvg, leafSvg, markSvg, plantSvg, ringsSvg, widgetColors, WIDGET_FONTS as F, type WidgetColors, type WidgetTheme } from './art';

/** The custom clicks a Today's rule widget sends to its own task (it redraws, no app opens). */
export const REVEAL_ACTION = 'REVEAL';
export const HAD_ACTION = 'HAD';
export const NOTYET_ACTION = 'NOTYET';
export const WIDGET_ACTIONS = [REVEAL_ACTION, HAD_ACTION, NOTYET_ACTION] as const;
/** The smallest height of any tap target, in dp (Android's widget quality guideline). */
export const TAP_MIN = 48;
/** At this font scale a small widget drops its caption too. */
export const HUGE_TEXT = 1.6;
/** A 2×2 title grows at most this much with the phone's font size (Android 14's non-linear scaling does the same). */
export const SMALL_TITLE_CAP = 1.3;
/** Widget spacing (dp): named once so DESIGN_SYSTEM §20.2 can list them. */
export const W = { pad: 16, padStrip: 12, padTiny: 6, radius: 22, pill: 34, pillRadius: 18 } as const;

export interface LayoutProps {
  face: WidgetFace;
  theme: WidgetTheme;
  /** The widget's size in dp, as the launcher reports it. */
  width: number;
  height: number;
  /** The phone's font size setting (1 = default). */
  fontScale: number;
}

type El = JSX.Element | null;

/** The click props: OPEN_URI into the app, or an on-widget action (Today's rule). Labels speak minutes in full. */
function clickFor(link: string, widgetAction: FaceAction['widgetAction'] | undefined, label: string) {
  const a11y = spokenMin(label);
  if (widgetAction) return { clickAction: widgetAction, accessibilityLabel: a11y };
  if (!link) return { accessibilityLabel: a11y };
  return { clickAction: 'OPEN_URI', clickActionData: { uri: link }, accessibilityLabel: a11y };
}

const mark = (c: WidgetColors, w: number) => <SvgWidget svg={markSvg(c)} style={{ width: w, height: Math.round(w * 1.37) }} />;

function caption(text: string, c: WidgetColors, size: SizeClass): El {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
      {mark(c, 11)}
      <TextWidget text={text} maxLines={1} truncate="END" style={{ fontFamily: F.sansMedium, fontSize: size === 'small' ? 11 : 12, color: c.ink2, marginLeft: 6 }} />
    </FlexWidget>
  );
}

/** A pill inside a 48 dp tall tap area. At the largest text a small pill drops its minutes ("Start"); TalkBack still hears them. */
function pill(action: FaceAction, c: WidgetColors, compact: boolean, quietStyle = false, scale = 1): El {
  const text = compact && scale >= HUGE_TEXT ? action.label.split(' · ')[0] : action.label;
  const fontPx = Math.round(13 * Math.min(scale, SMALL_TITLE_CAP));
  return (
    <FlexWidget {...clickFor(action.link, action.widgetAction, action.label)} style={{ height: TAP_MIN, justifyContent: 'center', alignItems: 'center' }}>
      <FlexWidget
        style={{
          backgroundColor: quietStyle ? c.soft : c.btn,
          borderRadius: W.pillRadius,
          paddingHorizontal: compact ? 12 : 16,
          height: W.pill,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text={text} maxLines={1} allowFontScaling={false} style={{ fontFamily: F.sansBold, fontSize: fontPx, color: quietStyle ? c.ink : c.onBtn }} />
      </FlexWidget>
    </FlexWidget>
  );
}

/** The quiet second action ("Short on time? 5 questions"), text only, 48 dp tall. */
function quiet(action: FaceAction, c: WidgetColors): El {
  return (
    <FlexWidget {...clickFor(action.link, action.widgetAction, action.label)} style={{ height: TAP_MIN, justifyContent: 'center', marginLeft: 14 }}>
      <TextWidget text={`${action.label} ›`} maxLines={1} truncate="END" style={{ fontFamily: F.sansMedium, fontSize: 12, color: c.ink }} />
    </FlexWidget>
  );
}

/** About how wide a character is, as a share of the font size (Figtree and Fraunces, a little generous). */
const CHAR_W = 0.56;
/** Would `text` fit in `lines` lines of `width` dp at `fontPx`? (An estimate, kept on the safe side.) */
export function fitsLines(text: string, fontPx: number, width: number, lines: number): boolean {
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
  return used <= lines;
}
/** A large title (20 sp and up) grows at most this much in a 4x2 (Android 14's non-linear font scaling does much the same). */
export const MEDIUM_TITLE_CAP = 1.5;

/**
 * The title. A figure keeps its size; its unit takes the room left. Words get
 * as many lines as the room allows (`room`: dp of height, `width`: dp), and
 * switch to the short form rather than be cut off.
 */
function title(face: WidgetFace, c: WidgetColors, size: SizeClass, scale: number, room: number, width: number): El {
  const small = size === 'small';
  const big = scale >= BIG_TEXT;
  if (face.titleStyle === 'number') {
    if (!face.title) return null;
    const pct = face.unit === '%';
    const stack = big && !pct;
    return (
      <FlexWidget style={{ flexDirection: stack ? 'column' : 'row', alignItems: stack ? 'flex-start' : 'flex-end', marginTop: 2, width: 'match_parent' }}>
        {/* The figure is already large: it keeps its size, so it is never clipped or pushed out. */}
        <TextWidget text={face.title} maxLines={1} allowFontScaling={false} style={{ fontFamily: F.serif, fontSize: small ? 30 : 36, color: c.ink }} />
        {face.unit ? (
          <FlexWidget style={stack || pct ? {} : { flex: 1 }}>
            <TextWidget
              text={face.unit}
              maxLines={2}
              style={{ fontFamily: pct ? F.serif : F.sansMedium, fontSize: pct ? 16 : 13, color: c.ink, marginLeft: stack ? 0 : pct ? 1 : 6, marginBottom: stack ? 0 : pct ? 16 : 7 }}
            />
          </FlexWidget>
        ) : null}
      </FlexWidget>
    );
  }
  const sans = face.titleStyle === 'sans';
  const font = face.titleStyle === 'italic' ? F.serifItalic : sans ? F.sansMedium : F.serif;
  const base = sans ? (size === 'large' ? 17 : small ? 15 : 14) : small ? 19 : size === 'large' ? 26 : 23;
  // A title grows less than body text (1.3x on a 2x2, 1.5x bigger), so a word never splits and the words still fit.
  const cap = Math.min(scale, small ? SMALL_TITLE_CAP : MEDIUM_TITLE_CAP);
  const fontPx = base * cap;
  const design = sans ? (size === 'large' ? 6 : 4) : small ? 3 : 2;
  const lines = Math.max(1, Math.min(design, Math.floor(room / (fontPx * 1.25))));
  const full = small && face.short ? face.short : face.title;
  const text = fitsLines(full, fontPx, width, lines) || !face.short ? full : face.short;
  return (
    <TextWidget
      text={text}
      maxLines={lines}
      truncate="END"
      allowFontScaling={false}
      style={{ fontFamily: font, fontSize: Math.round(fontPx), color: c.ink, marginTop: 4 }}
    />
  );
}

function lines(face: WidgetFace, c: WidgetColors, size: SizeClass, big: boolean): El {
  const small = size === 'small';
  const line = small ? (face.shortLine ?? face.line) : face.line;
  const second = face.line2 && !big && !small ? face.line2 : null;
  if (!line && !second && !face.badge) return null;
  return (
    <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
      {line ? <TextWidget text={line} maxLines={big ? 1 : small ? 2 : 3} truncate="END" style={{ fontFamily: F.sans, fontSize: 12, color: c.ink2, marginTop: 4 }} /> : null}
      {second ? <TextWidget text={second} maxLines={1} truncate="END" style={{ fontFamily: F.sansMedium, fontSize: 11, color: c.ink2, marginTop: 4 }} /> : null}
      {face.badge ? (
        <FlexWidget style={{ backgroundColor: c.soft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 }}>
          <TextWidget text={face.badge} maxLines={1} style={{ fontFamily: F.sansMedium, fontSize: 11, color: c.accentText }} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

/** The week's seven leaves (about 16×22 dp) with their day letters (10 sp; today's in ink). */
function leaves(filled: boolean[], today: number, c: WidgetColors, compact: boolean): El {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
      {filled.map((f, i) => (
        <FlexWidget key={i} style={{ flexDirection: 'column', alignItems: 'center', marginRight: i < 6 ? (compact ? 4 : 8) : 0 }}>
          <SvgWidget svg={leafSvg(f, i === today, c)} style={{ width: compact ? 13 : 16, height: compact ? 18 : 22 }} />
          <TextWidget text={LEAF_LETTERS[i]} style={{ fontFamily: i === today ? F.sansBold : F.sans, fontSize: 10, color: i === today ? c.ink : c.ink2, marginTop: 2 }} />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

/** The face's picture in a square `box` (the plant, the rings, the leaves or the mark). */
function art(face: WidgetFace, c: WidgetColors, theme: WidgetTheme, box: number): El {
  const a = face.art;
  if (!a) return null;
  switch (a.type) {
    case 'mark':
      return mark(c, Math.round(box * 0.6));
    case 'leaves':
      return leaves(a.filled, a.today, c, box < 60);
    case 'rings':
      return <SvgWidget svg={ringsSvg(a.rings, a.weights, c, a.faint)} style={{ width: box, height: box }} />;
    case 'plant': {
      const svg = plantSvg(a.plant, theme);
      return svg ? <SvgWidget svg={svg} style={{ width: box, height: box }} /> : mark(c, Math.round(box * 0.6));
    }
  }
}

function actions(face: WidgetFace, c: WidgetColors, size: SizeClass, scale: number): El {
  const big = scale >= BIG_TEXT;
  if (!face.action) return null;
  const small = size === 'small';
  // Today's rule's self-check is a pair of pills ("Had it" / "Not yet"), at every size.
  const pair = face.action2?.widgetAction ? face.action2 : null;
  const second = !pair && face.action2 && !big && (size === 'medium' || size === 'large') ? face.action2 : null;
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
      {pill(face.action, c, small || Boolean(pair), false, scale)}
      {pair ? <FlexWidget style={{ marginLeft: 8 }}>{pill(pair, c, true, true, scale)}</FlexWidget> : null}
      {second ? quiet(second, c) : null}
    </FlexWidget>
  );
}

/** Fills the space between the words and the actions, so the actions sit at the bottom. */
const spacer = () => <FlexWidget style={{ flex: 1 }} />;

/** Under this many dp a 1×1 shows one thing only (some launchers make a cell this small). */
export const MICRO = 70;

/** 1×1: the picture and one short word (This week's dot: a leaf and the count). */
function tiny(face: WidgetFace, c: WidgetColors, theme: WidgetTheme, huge: boolean, micro: boolean): El {
  const isWeek = face.art?.type === 'leaves' && face.titleStyle === 'number';
  const word = face.short ?? face.title.split(' ').slice(0, 3).join(' ');
  if (micro) {
    // A very small cell: This week's count, or the mark. The spoken label still says it all.
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: 'center' }}>
        {isWeek && face.title ? <TextWidget text={face.title} maxLines={1} allowFontScaling={false} style={{ fontFamily: F.serif, fontSize: 18, color: c.ink }} /> : mark(c, 16)}
      </FlexWidget>
    );
  }
  // At the largest text the words stay and the picture goes.
  const pic = huge ? null : isWeek ? (
    <SvgWidget svg={leafSvg(true, false, c)} style={{ width: 14, height: 19 }} />
  ) : face.art?.type === 'plant' || face.art?.type === 'rings' ? (
    art(face, c, theme, 44)
  ) : (
    mark(c, 18)
  );
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {pic}
      {isWeek && face.title ? <TextWidget text={face.title} maxLines={1} allowFontScaling={false} style={{ fontFamily: F.serif, fontSize: 22, color: c.ink }} /> : null}
      {isWeek && face.title ? <TextWidget text="this week" maxLines={1} style={{ fontFamily: F.sans, fontSize: 10, color: c.ink2 }} /> : null}
      {!isWeek && word ? <TextWidget text={word} maxLines={2} style={{ fontFamily: F.sansMedium, fontSize: 11, color: c.ink, marginTop: 4, textAlign: 'center' }} /> : null}
    </FlexWidget>
  );
}

/** Under this many dp tall a strip has room for one line only. */
export const LOW_STRIP = 60;

/** N×1: one row. The picture on the left (dropped first at large text), the words, the pill(s) on the right. */
function strip(face: WidgetFace, c: WidgetColors, theme: WidgetTheme, big: boolean, width: number, height: number): El {
  const number = face.titleStyle === 'number' && face.title;
  const low = height < LOW_STRIP;
  const a = face.art;
  const pic = big || low ? null : a?.type === 'leaves' ? leaves(a.filled, a.today, c, false) : a && a.type !== 'mark' ? art(face, c, theme, 44) : mark(c, 16);
  const pair = face.action2?.widgetAction ? face.action2 : null;
  const font = face.titleStyle === 'italic' ? F.serifItalic : face.titleStyle === 'sans' ? F.sansMedium : F.serif;
  const fontSize = face.titleStyle === 'sans' ? 13 : 16;
  const room = width - 2 * W.padStrip - (pic ? (a?.type === 'leaves' ? 150 : 60) : 0) - (face.action ? 110 : 0) - (pair ? 80 : 0);
  const full = number ? `${face.title} ${face.unit ?? ''}`.trim() : face.title;
  const lines = low ? 1 : 2;
  // The words that fit: the title, its short form, or (in a very low strip) the widget's name.
  const candidates = [big && face.short ? face.short : full, face.short, low ? face.caption : undefined].filter((x): x is string => Boolean(x));
  const words = candidates.find((t) => fitsLines(t, fontSize * (big ? BIG_TEXT : 1), room, lines)) ?? candidates[candidates.length - 1];
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
      {pic ? <FlexWidget style={{ marginRight: 12 }}>{pic}</FlexWidget> : null}
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        {words ? <TextWidget text={words} maxLines={lines} truncate="END" style={{ fontFamily: font, fontSize, color: c.ink }} /> : null}
        {!big && !low && (face.shortLine ?? face.line) ? <TextWidget text={(face.shortLine ?? face.line) as string} maxLines={1} truncate="END" style={{ fontFamily: F.sans, fontSize: 11, color: c.ink2, marginTop: 2 }} /> : null}
      </FlexWidget>
      {face.action ? pill(face.action, c, true) : null}
      {pair ? <FlexWidget style={{ marginLeft: 6 }}>{pill(pair, c, true, true)}</FlexWidget> : null}
    </FlexWidget>
  );
}

/** 2×2: a column. Caption, the picture (if any), the words, the pill at the bottom. */
function small(face: WidgetFace, c: WidgetColors, theme: WidgetTheme, scale: number, width: number, height: number): El {
  const big = scale >= BIG_TEXT;
  const huge = scale >= HUGE_TEXT;
  const inner = width - 2 * W.pad;
  const kind = face.art?.type;
  if (kind === 'plant') {
    // The plant is the hero: about 104–112 dp, the stage word under it. A growth day's chip takes the caption's place.
    const box = huge ? 84 : big ? 96 : face.badge ? 104 : 112;
    return (
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column', alignItems: 'center' }}>
        {caption(face.badge ?? face.caption, c, 'small')}
        <FlexWidget style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{art(face, c, theme, box)}</FlexWidget>
        {title({ ...face, short: undefined }, c, 'small', scale, 40, inner)}
      </FlexWidget>
    );
  }
  const picture = kind && kind !== 'mark' && !big;
  const box = 60;
  const showLine = !face.action && Boolean(face.shortLine ?? face.line);
  // The room left for the title once the caption, the picture, a detail line and the pill have theirs.
  const room =
    height - 2 * W.pad - (huge ? 0 : 16) - (picture ? (face.art?.type === 'leaves' ? 44 : box + 8) : 0) - (face.action ? TAP_MIN : 0) - (showLine ? Math.round(12 * scale * 1.25) + 6 : 0);
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column' }}>
      {huge ? null : caption(face.caption, c, 'small')}
      {picture ? (
        <FlexWidget style={{ width: 'match_parent', alignItems: 'flex-start', marginTop: 8 }}>
          {face.art?.type === 'leaves' ? leaves(face.art.filled, face.art.today, c, true) : art(face, c, theme, box)}
        </FlexWidget>
      ) : null}
      {spacer()}
      {title(face, c, 'small', scale, room, inner)}
      {face.action ? null : lines({ ...face, line2: undefined, badge: undefined }, c, 'small', big)}
      {actions(face, c, 'small', scale)}
    </FlexWidget>
  );
}

/** 4×2 and 4×3: the words, with the plant or the rings on the left. */
function medium(face: WidgetFace, c: WidgetColors, theme: WidgetTheme, scale: number, size: SizeClass, width: number, height: number): El {
  const big = scale >= BIG_TEXT;
  const a = face.art;
  const side = a && (a.type === 'plant' || a.type === 'rings') && !(big && a.type === 'rings');
  const plantLeaves = a?.type === 'plant' && a.leaves && !big ? a.leaves : null;
  const box = a?.type === 'plant' ? (size === 'large' ? 170 : big ? 120 : 150) : size === 'large' ? 150 : 118;
  const inner = width - 2 * W.pad - (side ? box + 14 : 0);
  const lineCount = (face.line ? 1 : 0) + (face.line2 && !big ? 1 : 0) + (face.badge ? 1 : 0);
  const room =
    height -
    2 * W.pad -
    Math.round(12 * scale * 1.25) -
    (a?.type === 'leaves' ? 50 : 0) -
    (plantLeaves ? 40 : 0) -
    (face.action ? TAP_MIN : 0) -
    lineCount * (Math.round(12 * scale * 1.25) + 4);
  const words = (
    <FlexWidget style={{ flex: 1, flexDirection: 'column', height: 'match_parent' }}>
      {caption(face.caption, c, size)}
      {a?.type === 'leaves' ? <FlexWidget style={{ marginTop: 10 }}>{art(face, c, theme, 80)}</FlexWidget> : null}
      {title(face, c, size, scale, room, inner)}
      {lines(face, c, size, big)}
      {plantLeaves ? <FlexWidget style={{ marginTop: 8 }}>{leaves(plantLeaves.filled, plantLeaves.today, c, true)}</FlexWidget> : null}
      {spacer()}
      {actions(face, c, size, scale)}
    </FlexWidget>
  );
  if (!side) return words;
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', alignItems: a?.type === 'plant' ? 'flex-end' : 'center' }}>
      <FlexWidget style={{ marginRight: 14, alignItems: 'center', justifyContent: 'center' }}>{art(face, c, theme, box)}</FlexWidget>
      {words}
    </FlexWidget>
  );
}

/**
 * The face for large text: the extras go first (the third line and a quiet
 * second action, then the detail line beside a pill), never the main words, a
 * key word or the main tap. The self-check pair always stays.
 */
export function forLargeText(face: WidgetFace, size: SizeClass, fontScale: number): WidgetFace {
  if (fontScale < BIG_TEXT) return face;
  const keepPair = face.action2?.widgetAction ? face.action2 : undefined;
  let f: WidgetFace = { ...face, line2: undefined, action2: keepPair };
  if (f.action && size !== 'large' && f.kind !== 'readiness') f = { ...f, line: undefined, shortLine: undefined };
  // The largest sizes: no detail line except a readiness figure's "a study estimate".
  if (fontScale >= HUGE_TEXT) {
    const estimate = f.kind === 'readiness' && f.titleStyle === 'number';
    f = { ...f, line: estimate ? (f.shortLine ?? f.line) : size === 'large' && !f.action ? f.line : undefined, shortLine: estimate ? f.shortLine : undefined };
  }
  return f;
}

/** The whole widget, for one face at one size in one theme. */
/**
 * A narrow strip (a 2×2 squeezed to one row by a tight launcher grid): no room
 * for a pill beside the words, so the whole widget does the main action
 * (Today's rule's self-check pair stays in the app: the tap opens the card).
 */
export function forNarrowStrip(face: WidgetFace): WidgetFace {
  if (!face.action) return face;
  if (face.action2?.widgetAction) return { ...face, action: undefined, action2: undefined };
  const a = face.action;
  return { ...face, link: a.link || face.link, widgetAction: a.widgetAction ?? (a.link ? undefined : face.widgetAction), action: undefined, action2: undefined, label: `${face.label} Tap: ${a.label}.` };
}

export function WidgetLayout({ face: given, theme, width, height, fontScale }: LayoutProps): JSX.Element {
  const size = sizeClass(width, height);
  const narrow = size === 'strip' && width < 250;
  const face = forLargeText(narrow ? forNarrowStrip(given) : given, size, fontScale);
  const c = widgetColors(face.tone, theme);
  const big = fontScale >= BIG_TEXT;
  const padding = size === 'tiny' ? (width < MICRO || height < MICRO ? 2 : W.padTiny) : size === 'strip' ? W.padStrip : W.pad;
  const body =
    size === 'tiny'
      ? tiny(face, c, theme, fontScale >= HUGE_TEXT, width < MICRO || height < MICRO)
      : size === 'strip'
        ? strip(face, c, theme, big || narrow, width, height)
        : size === 'small'
          ? small(face, c, theme, fontScale, width, height)
          : medium(face, c, theme, fontScale, size, width, height);
  const click = clickFor(face.link, face.widgetAction, face.label);
  const forest = face.tone === 'forest' && c.bgTop;
  const background = forest ? { backgroundGradient: { from: c.bgTop as `#${string}`, to: c.bg, orientation: 'TOP_BOTTOM' as const } } : { backgroundColor: c.bg };
  const frond = forest && c.frond && (size === 'medium' || size === 'large');
  const content = (
    <FlexWidget {...click} style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'column', padding, ...(frond ? {} : { borderRadius: W.radius, ...background }) }}>
      {body}
    </FlexWidget>
  );
  if (!frond || !c.frond) return content;
  // The forest panel's frond sits BEHIND the words at the right edge (decorative, the Today hero's motif).
  return (
    <OverlapWidget style={{ width: 'match_parent', height: 'match_parent', borderRadius: W.radius, ...background }}>
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', paddingRight: 6 }}>
        <SvgWidget svg={frondSvg(c.frond)} style={{ width: 92, height: 108 }} />
      </FlexWidget>
      {content}
    </OverlapWidget>
  );
}
