/**
 * Study notes building blocks: every section of a subtopic page, in the
 * fixed schema-v2 order (docs/content/NOTES_SCHEMA_V2.md), drawn with the
 * Grove v2 primitives (docs/mobile/DESIGN_SYSTEM.md).
 *
 * Surface rules used here: text sits on the paper; lists use hairlines;
 * "How ISACA thinks" is the key-idea recipe (3px accent rule + italic
 * quote, never a card); exam traps are the one tinted block (tipBg).
 *
 * Mobile 1.21 (DESIGN_SYSTEM.md §11 "Study notes"): the page reads in three
 * movements, each opened by a caption kicker over a hairline with 48 above
 * it: Understand (why, how, compare, diagram, example), Think like the
 * auditor (How ISACA thinks, exam traps), Keep it (key terms, analogy and
 * memory aid). An "On this page" row at the top names them (1, 2, 3) and
 * jumps to each; each kicker carries the same serif numeral. Figures and the
 * compare grid sit on an L1 plate (`raised2`, no border, no shadow). A
 * diagram is always FITTED to its plate (never scrolled sideways, never a
 * clipped label); when that makes its smallest label under 13pt, "Tap to
 * enlarge" opens it full screen at a readable size (design spec §3).
 */
import { Component, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parse, SvgAst, type JsxAST } from 'react-native-svg';
import type { NoteCompare, NoteIllustration, NoteSubtopic, NoteTerm } from '../content/notes/types';
import { svgMinFontSize, svgSize, themeSvg } from '../engine/notesSvg';
import { moveFocus } from '../lib/a11y';
import { font, LARGE_TEXT, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Check, ICON_STROKE, Maximize2, X } from './icons';
import { useMotion } from './motion';
import { BigNum, Card, Gap, IconButton, ICON_SIZE, Section, T, useFontScale, useScreenScroll } from './ui';

/** Content column: screen minus the 20pt gutters, never wider than 560 (spec §2). */
export function useColumnWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width - space.gutter * 2, 560);
}

// ── Small pieces ───────────────────────────────────────────────────────

/** A bulleted list: a small accent dot, then body text (wraps under itself). */
export function Bullets({ items, color }: { items: string[]; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm, marginTop: space.sm }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
          {/* The dot is decoration; the sentence is what a screen reader reads. */}
          <View
            accessible={false}
            importantForAccessibility="no"
            style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent, marginTop: 10 }}
          />
          <T v="body" color={color} style={{ flex: 1 }}>{item}</T>
        </View>
      ))}
    </View>
  );
}

/**
 * Read status (the lessons list's recipe): a filled accent ✓ when read; not
 * read yet is a quiet 2pt ring in `track` (mobile 1.21: a status, not a
 * control, so never the `control` outline that reads as a checkbox to tap).
 * The row's words say the state too.
 */
export function ReadMark({ read }: { read: boolean }) {
  const { c } = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 24,
        height: 24,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: read ? c.accent : 'transparent',
        borderWidth: read ? 0 : 2,
        borderColor: c.track,
      }}
    >
      {read && <Check size={14} color={c.bg} strokeWidth={2.5} />}
    </View>
  );
}

/** A term and its one-line meaning, hairline below (key terms, types, glossary). */
export function TermList({ items }: { items: NoteTerm[] }) {
  const { c } = useTheme();
  return (
    <View>
      {items.map((t, i) => (
        <View
          key={t.term}
          accessible
          accessibilityLabel={`${t.term}: ${t.definition}`}
          style={{ paddingVertical: space.md, borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: c.line }}
        >
          <T v="label">{t.term}</T>
          <T v="small" style={{ marginTop: 2 }}>{t.definition}</T>
        </View>
      ))}
    </View>
  );
}

// ── Compare table ──────────────────────────────────────────────────────
/** A real grid holds at most this many items side by side; more stack. */
const GRID_MAX_COLUMNS = 3;
/**
 * Narrowest a grid column may be (mobile 1.21 review): 3 columns fit a 390pt
 * phone (98pt each inside the plate) but not a 360dp one (88pt), which stacks.
 */
const GRID_MIN_COL_W = 96;

/**
 * Mobile 1.21: the compare section is ONE L1 plate (never 1px-outlined boxes).
 * - Up to 3 items, below large text: a real grid. A header row of the item
 *   names (caption, accentText), then one block per dimension: its name in
 *   `meta` on its own line, then the 2–3 cells side by side in `small`, with
 *   hairlines between dimensions.
 * - 4+ items, or large text: stacked on the same plate, each dimension's name
 *   then each item's name and cell, hairlines between dimensions.
 * Screen readers get one stop per dimension: "Status. Standards: Mandatory. …";
 * the grid's header row is hidden from them (each row names its columns).
 */
export function CompareTable({ compare }: { compare: NoteCompare }) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const column = useColumnWidth();
  const n = compare.columns.length;
  // The plate pads 16 each side; 12 between columns.
  const colW = (column - space.lg * 2 - space.md * (n - 1)) / n;
  const grid = !large && n <= GRID_MAX_COLUMNS && colW >= GRID_MIN_COL_W;
  const rowLabel = (r: NoteCompare['rows'][number]) =>
    `${r.label}. ${r.cells.map((cell, i) => `${compare.columns[i]}: ${cell}`).join('. ')}`;
  const divider = (i: number) => (i === 0 ? null : { borderTopWidth: 1, borderTopColor: c.line });

  if (!grid) {
    return (
      <Card variant="plate" style={{ paddingVertical: space.xs }}>
        {compare.rows.map((r, i) => (
          <View key={r.label} accessible accessibilityLabel={rowLabel(r)} style={[{ paddingVertical: space.md }, divider(i)]}>
            <T v="label">{r.label}</T>
            {r.cells.map((cell, j) => (
              <View key={j} style={{ marginTop: space.sm }}>
                <T v="caption" color={c.accentText}>{compare.columns[j]}</T>
                <T v="small">{cell}</T>
              </View>
            ))}
          </View>
        ))}
      </Card>
    );
  }

  return (
    <Card variant="plate">
      {/* Header row: each row's spoken label already names the columns. */}
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', gap: space.md, paddingBottom: space.sm }}
      >
        {compare.columns.map((col) => (
          <View key={col} style={{ flex: 1, minWidth: 0 }}>
            <T v="caption" color={c.accentText}>{col}</T>
          </View>
        ))}
      </View>
      {/* A hairline above every dimension (the first one separates it from the names). */}
      {compare.rows.map((r) => (
        <View
          key={r.label}
          accessible
          accessibilityLabel={rowLabel(r)}
          style={{ paddingVertical: space.md, borderTopWidth: 1, borderTopColor: c.line }}
        >
          <T v="meta" color={c.ink2}>{r.label}</T>
          <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xs }}>
            {r.cells.map((text, j) => (
              <View key={j} style={{ flex: 1, minWidth: 0 }}>
                <T v="small">{text}</T>
              </View>
            ))}
          </View>
        </View>
      ))}
    </Card>
  );
}

// ── Illustration ───────────────────────────────────────────────────────

/** If drawing a diagram throws, show nothing instead of crashing the screen. */
class DrawingBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}


/**
 * Parse the themed SVG once per theme. Returns null when it can't be parsed,
 * so the caller drops the whole Diagram section. Exported for tests.
 */
export function parseIllustration(svg: string, palette: Parameters<typeof themeSvg>[1]): JsxAST | null {
  try {
    // Mobile 1.21 (design spec §3): no third typeface in a diagram; the web's mono labels draw in Figtree too.
    return parse(themeSvg(svg, palette, { sans: font.sans600, mono: font.sans600 }));
  } catch {
    return null;
  }
}

/**
 * A diagram on its L1 plate (mobile 1.21, design spec §3). Always FITTED to
 * the plate's width, so the whole figure shows and no label is ever cut off.
 * When fitting puts its smallest label under 13pt (MIN_LABEL_PT, ×1.5 at
 * most with large text; engine/notesSvg.ts → svgSize), the figure is a
 * button, "Tap to enlarge", that opens it full screen at the size where that
 * label reaches 13pt. The page colour inside the drawing is the plate's
 * (`raised2`), so a drawn background never shows as a box. A screen reader
 * hears its description once (the SVG's aria-label); the caption below is
 * normal text that grows with the phone's text size.
 */
export function IllustrationView({ illustration, onSection }: { illustration: NoteIllustration; onSection?: ReactNode }) {
  const { c } = useTheme();
  const column = useColumnWidth();
  const fontScale = useFontScale();
  const [open, setOpen] = useState(false);
  const opener = useRef<View>(null);
  const onPlate = useMemo(() => ({ ...c, bg: c.raised2 }), [c]);
  const ast = useMemo(() => parseIllustration(illustration.svg, onPlate), [illustration.svg, onPlate]);
  const minFont = useMemo(() => svgMinFontSize(illustration.svg), [illustration.svg]);
  // The plate pads 16 each side: the drawing fits what is left.
  const inner = column - space.lg * 2;
  const readable = svgSize(illustration, inner, { minFont, fontScale });
  const small = readable.width > inner;
  // The figure fits again (a rotation, a smaller text size): the viewer has nothing to add.
  if (!small && open) setOpen(false);
  if (!ast) return null;
  const fitted = { width: inner, height: Math.round((inner * illustration.height) / illustration.width) };
  const drawing = (
    <View accessible={!small} accessibilityRole="image" accessibilityLabel={illustration.label} style={fitted}>
      <SvgAst ast={ast} override={fitted} />
    </View>
  );
  // Focus goes back to the figure once the viewer has gone: on iOS when the
  // Modal reports it is dismissed, elsewhere after its fade (≥ 500 ms).
  const refocus = () => moveFocus(opener, Platform.OS === 'ios' ? 50 : 550);
  return (
    <DrawingBoundary>
      {onSection}
      <Card variant="plate">
        {small ? (
          <Pressable
            ref={opener}
            accessibilityRole="button"
            // WCAG 2.5.3: the spoken name starts with what the button says it does.
            accessibilityLabel={`Enlarge diagram. ${illustration.label}`}
            accessibilityHint="Opens the diagram full screen, larger"
            onPress={() => setOpen(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            {drawing}
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: space.xs, minHeight: 32, marginTop: space.xs }}>
              <Maximize2 size={ICON_SIZE.inline} color={c.accentText} strokeWidth={ICON_STROKE} />
              <T v="meta" color={c.accentText}>Tap to enlarge</T>
            </View>
          </Pressable>
        ) : (
          drawing
        )}
        {illustration.caption && <T v="meta" style={{ marginTop: space.md }}>{illustration.caption}</T>}
      </Card>
      {small && (
        <DiagramViewer
          visible={open}
          ast={ast}
          size={{ width: readable.width, height: readable.height }}
          label={illustration.label}
          caption={illustration.caption}
          onClose={() => {
            setOpen(false);
            if (Platform.OS !== 'ios') refocus();
          }}
          onDismiss={refocus}
        />
      )}
    </DrawingBoundary>
  );
}

/**
 * The full-screen diagram (mobile 1.21): the drawing at its readable size on
 * the plate colour, scrolling both ways when it is larger than the screen.
 * On iOS it can pinch from the whole figure (fitted) up to 3×; elsewhere it
 * opens scrolled to the figure's centre. Close: ✕, Android Back, or
 * VoiceOver's escape (the viewer is a modal for screen readers). Kept mounted
 * while its figure is small, so the Modal can report its dismissal. Fades in;
 * appears at once under Reduce Motion.
 */
function DiagramViewer({
  visible,
  ast,
  size,
  label,
  caption,
  onClose,
  onDismiss,
}: {
  visible: boolean;
  ast: JsxAST;
  size: { width: number; height: number };
  label: string;
  caption?: string;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const { width } = useWindowDimensions();
  const available = width - space.gutter * 2;
  // Wider than the screen at its readable size: say how to see all of it (the viewer is the one place a figure may pan).
  const pans = size.width > available;
  const sideways = useRef<ScrollView>(null);
  return (
    <Modal visible={visible} animationType={reduced ? 'none' : 'fade'} onRequestClose={onClose} onDismiss={onDismiss}>
      <SafeAreaView
        edges={['top', 'bottom']}
        style={{ flex: 1, backgroundColor: c.raised2 }}
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, minHeight: 52 }}>
          <IconButton label="Close diagram" onPress={onClose} icon={(col) => <X size={ICON_SIZE.bar} color={col} strokeWidth={ICON_STROKE} />} />
          <T v="label" accessibilityRole="header" style={{ flex: 1, textAlign: 'center', marginRight: 48 }}>Diagram</T>
        </View>
        <ScrollView
          // iOS: pinch out to the whole figure, in to 3×.
          maximumZoomScale={3}
          minimumZoomScale={pans ? Math.min(1, available / size.width) : 1}
          contentContainerStyle={{ padding: space.gutter }}
        >
          <ScrollView
            ref={sideways}
            horizontal
            contentContainerStyle={{ minWidth: '100%', justifyContent: 'center' }}
            // Elsewhere: open on the figure's centre, not its left edge.
            onContentSizeChange={(w) => {
              if (Platform.OS !== 'ios' && w > available) sideways.current?.scrollTo({ x: (w - available) / 2, animated: false });
            }}
          >
            <View accessible accessibilityRole="image" accessibilityLabel={label} style={size}>
              <SvgAst ast={ast} override={size} />
            </View>
          </ScrollView>
          {pans ? (
            <T v="meta" style={{ marginTop: space.md }}>
              {Platform.OS === 'ios' ? 'Drag to see all of it, or pinch to zoom.' : 'Drag sideways to see all of it.'}
            </T>
          ) : null}
          {caption ? <T v="small" color={c.ink2} style={{ marginTop: space.lg }}>{caption}</T> : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}


// ── The whole page ─────────────────────────────────────────────────────

/** The coach's voice: 3px accent rule + Fraunces italic (spec §5 "Key idea"). */
export function IsacaRule({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.lg, marginTop: space.sm }}>
      <T v="quote">{text}</T>
    </View>
  );
}

/** Exam traps: the one tinted block on the page, in the tip colours. */
export function ExamTraps({ traps }: { traps: NoteSubtopic['examTraps'] }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.md, marginTop: space.sm }}>
      {traps.map((t, i) => (
        <View
          key={i}
          accessible
          accessibilityLabel={`Trap: ${t.trap} Why it's wrong: ${t.why}`}
          style={{ backgroundColor: c.tipBg, borderRadius: radius.md, padding: space.lg }}
        >
          <T v="caption" color={c.tip}>Trap</T>
          <T v="label" style={{ marginTop: 2 }}>{t.trap}</T>
          <Gap h={space.sm} />
          <T v="caption" color={c.tip}>Why it’s wrong</T>
          <T v="small" style={{ marginTop: 2 }}>{t.why}</T>
        </View>
      ))}
    </View>
  );
}

/**
 * One of the page's three movements: the serif numeral (17, accentText), a
 * caption kicker in ink2, then a hairline to the edge, with 48 above it (the
 * rhythm rule's "between page movements"). One screen-reader heading, so a
 * screen-reader user can jump between them, and the "On this page" row can
 * move focus here.
 */
export function Movement({ n, title, ref }: { n: number; title: string; ref?: Ref<View> }) {
  const { c } = useTheme();
  return (
    <View
      ref={ref}
      accessible
      accessibilityRole="header"
      accessibilityLabel={title}
      style={{ marginTop: space.xxxl, flexDirection: 'row', alignItems: 'center', gap: space.sm }}
    >
      <BigNum value={String(n)} size={17} color={c.accentText} />
      <T v="caption" color={c.ink2}>{title}</T>
      <View style={{ flex: 1, height: 1, backgroundColor: c.line, marginLeft: space.xs }} />
    </View>
  );
}

/**
 * "On this page" (mobile 1.21, design spec §3.4): the page's movements in one
 * 48pt row, "1 Understand · 2 Think like the auditor · 3 Keep it", each a
 * button that scrolls to its movement (smooth, instant under Reduce Motion)
 * and moves screen-reader focus there. A reference page is re-read the night
 * before; this shows its shape up front. At large text the items stack as
 * 48pt rows. Only inside a scrolling Screen (it needs somewhere to scroll).
 */
export function OnThisPage({ items }: { items: { title: string; ref: { current: View | null } }[] }) {
  const { c } = useTheme();
  const scroll = useScreenScroll();
  const scale = useFontScale();
  const column = useColumnWidth();
  // Stacks at large text, AND whenever one line would not fit (between ×1.1 and ×1.3 it overflowed).
  const stacked = scale >= LARGE_TEXT || !onThisPageFits(items.map((x) => x.title), column, scale);
  if (!scroll || items.length < 2) return null;
  return (
    <View
      style={{
        flexDirection: stacked ? 'column' : 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: c.line,
        marginBottom: space.xl,
      }}
    >
      {items.map((it, i) => (
        <Pressable
          key={it.title}
          accessibilityRole="button"
          accessibilityLabel={`On this page: ${i + 1} of ${items.length}, ${it.title}`}
          onPress={() => {
            scroll.scrollToView(it.ref.current);
            moveFocus(it.ref, 400);
          }}
          style={({ pressed }) => [
            { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 },
            stacked && i > 0 && { borderTopWidth: 1, borderTopColor: c.line },
          ]}
        >
          <BigNum value={String(i + 1)} size={17} color={c.accentText} />
          <T v="meta" color={c.ink} style={{ flexShrink: 1 }}>{it.title}</T>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Whether "On this page" fits on one line (mobile 1.21 review H1). An
 * estimate on the safe side, from Figtree `meta` 14 (about 6.4pt a character
 * at ×1, measured), each item's serif numeral (capped at ×1.3) and its 6pt
 * gap, and at least 12pt between items, plus 5% slack. Exported for tests.
 */
export function onThisPageFits(titles: string[], column: number, scale: number): boolean {
  const s = Math.max(1, scale);
  const text = titles.reduce((n, t) => n + t.length, 0) * 6.4 * s;
  const marks = titles.length * (9 * Math.min(s, 1.3) + 6);
  const gaps = 12 * Math.max(0, titles.length - 1);
  return (text + marks + gaps) * 1.05 <= column;
}

/** The first heading in a movement sits 16 under the kicker, not a section's 32. */
const FIRST = { marginTop: space.lg };

/**
 * Every section of a subtopic, in the fixed v2 order, grouped in three
 * movements. Optional sections (compare, types, illustration, analogy,
 * memory aid) are simply skipped; a movement with nothing in it is too.
 */
export function NoteBody({ note }: { note: NoteSubtopic }) {
  const { c } = useTheme();
  const keepIt = note.keyTerms.length > 0 || Boolean(note.analogy || note.memoryAid);
  const understand = useRef<View>(null);
  const auditor = useRef<View>(null);
  const keep = useRef<View>(null);
  const movements = [
    { title: 'Understand', ref: understand },
    { title: 'Think like the auditor', ref: auditor },
    ...(keepIt ? [{ title: 'Keep it', ref: keep }] : []),
  ];
  return (
    <View>
      <OnThisPage items={movements} />
      {/* In one line: the question-stem serif, the page's lead sentence. */}
      <T v="caption" color={c.accentText}>In one line</T>
      <T v="stem" style={{ marginTop: space.xs }}>{note.definition}</T>

      {/* 1. Understand */}
      <Movement n={1} title="Understand" ref={understand} />
      <Section title="Why it matters" style={FIRST} />
      <T v="body">{note.whyItMatters}</T>

      <Section title="How it works" />
      <Bullets items={note.howItWorks} />

      {note.compare && (
        <>
          <Section title="Compare" />
          <View style={{ marginTop: space.sm }}>
            <CompareTable compare={note.compare} />
          </View>
        </>
      )}

      {note.types && note.types.length > 0 && (
        <>
          <Section title="Types" />
          <TermList items={note.types.map((t) => ({ term: t.term, definition: t.meaning }))} />
        </>
      )}

      {/* The heading travels with the FIRST drawing, so if that drawing
          can't be parsed the heading goes too (later drawings still show). */}
      {note.illustrations?.map((ill, i) => (
        <IllustrationView
          key={i}
          illustration={ill}
          onSection={
            i === 0 ? (
              <>
                <Section title="Diagram" />
                <View style={{ height: space.sm }} />
              </>
            ) : (
              <View style={{ height: space.xl }} />
            )
          }
        />
      ))}

      <Section title="Example" />
      <T v="body">{note.example}</T>

      {/* 2. Think like the auditor */}
      <Movement n={2} title="Think like the auditor" ref={auditor} />
      <Section title="How ISACA thinks" style={FIRST} />
      <IsacaRule text={note.isacaRule} />

      {note.examTraps.length > 0 && (
        <>
          <Section title="Exam traps" />
          <ExamTraps traps={note.examTraps} />
        </>
      )}

      {/* 3. Keep it */}
      {keepIt && <Movement n={3} title="Keep it" ref={keep} />}
      {note.keyTerms.length > 0 && (
        <>
          <Section title="Key terms" style={FIRST} />
          <TermList items={note.keyTerms} />
        </>
      )}

      {(note.analogy || note.memoryAid) && (
        <>
          <Section
            title={note.analogy && note.memoryAid ? 'Analogy and memory aid' : note.analogy ? 'Analogy' : 'Memory aid'}
            style={note.keyTerms.length > 0 ? undefined : FIRST}
          />
          {note.analogy && <T v="body">{note.analogy}</T>}
          {note.memoryAid && (
            <View style={{ marginTop: space.md }}>
              <T v="caption" color={c.accentText}>Remember it</T>
              {/* Body, not label 600: a sentence to remember is read, not shouted. */}
              <T v="body" style={{ marginTop: space.xs }}>{note.memoryAid}</T>
            </View>
          )}
        </>
      )}
    </View>
  );
}
