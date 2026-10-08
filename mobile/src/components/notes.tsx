/**
 * Study notes building blocks: every section of a subtopic page, in the
 * fixed schema-v2 order (docs/content/NOTES_SCHEMA_V2.md), drawn with the
 * Grove v2 primitives (docs/mobile/DESIGN_SYSTEM.md).
 *
 * Surface rules used here: text sits on the paper; lists use hairlines;
 * "How ISACA thinks" is the key-idea recipe (3px accent rule + italic
 * quote, never a card); exam traps are the one tinted block (tipBg).
 */
import { Component, useMemo, type ReactNode } from 'react';
import { Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { parse, SvgAst, type JsxAST } from 'react-native-svg';
import type { NoteCompare, NoteIllustration, NoteSubtopic, NoteTerm } from '../content/notes/types';
import { svgSize, themeSvg } from '../engine/notesSvg';
import { font, LARGE_TEXT, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Check } from './icons';
import { Gap, Section, T, useFontScale } from './ui';

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

/** Read status circle (the lessons list's recipe): ✓ on accent when read, empty outline otherwise. */
export function ReadMark({ read }: { read: boolean }) {
  const { c } = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 28,
        height: 28,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: read ? c.accent : 'transparent',
        borderWidth: read ? 0 : 1.5,
        borderColor: c.control,
      }}
    >
      {read && <Check size={16} color={c.bg} strokeWidth={2.5} />}
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
/**
 * Side-by-side table that scrolls sideways. At large text sizes it stacks
 * instead: one block per row, each column's cell under its name, so text
 * never squeezes into narrow cells.
 * Screen readers get one stop per row: "Status. Standards: Mandatory. …".
 */
export function CompareTable({ compare }: { compare: NoteCompare }) {
  const { c } = useTheme();
  const column = useColumnWidth();
  const stacked = useFontScale() >= LARGE_TEXT;
  const rowLabel = (r: NoteCompare['rows'][number]) =>
    `${r.label}. ${r.cells.map((cell, i) => `${compare.columns[i]}: ${cell}`).join('. ')}`;

  if (stacked) {
    return (
      <View>
        {compare.rows.map((r, i) => (
          <View
            key={r.label}
            accessible
            accessibilityLabel={rowLabel(r)}
            style={{ paddingVertical: space.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.line }}
          >
            <T v="label">{r.label}</T>
            {r.cells.map((cell, j) => (
              <View key={j} style={{ marginTop: space.sm }}>
                <T v="caption" color={c.accentText}>{compare.columns[j]}</T>
                <T v="small">{cell}</T>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  // Widths: a label column, then equal columns at least 130 wide.
  const labelW = 112;
  const colW = Math.max(130, Math.floor((column - labelW) / compare.columns.length));
  const tableW = labelW + colW * compare.columns.length;
  const scrolls = tableW > column;
  const cell = { paddingVertical: space.sm, paddingRight: space.md };
  return (
    <View>
      {scrolls && <T v="meta" style={{ marginBottom: space.xs }}>Scroll sideways to see every column.</T>}
      <View style={{ marginRight: -space.gutter }}>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingRight: space.gutter }}>
          <View style={{ width: tableW }}>
            {/* Header row: each row's spoken label already names the columns. */}
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={{ flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: c.control }}
            >
              <View style={[cell, { width: labelW }]} />
              {compare.columns.map((col) => (
                <View key={col} style={[cell, { width: colW }]}>
                  <T v="label">{col}</T>
                </View>
              ))}
            </View>
            {compare.rows.map((r, i) => (
              <View
                key={r.label}
                accessible
                accessibilityLabel={rowLabel(r)}
                style={{
                  flexDirection: 'row',
                  borderBottomWidth: i === compare.rows.length - 1 ? 0 : 1,
                  borderBottomColor: c.line,
                }}
              >
                <View style={[cell, { width: labelW }]}>
                  <T v="caption">{r.label}</T>
                </View>
                {r.cells.map((text, j) => (
                  <View key={j} style={[cell, { width: colW }]}>
                    <T v="small">{text}</T>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
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

/** Monospace that exists on each platform (SVG text cannot use a fallback list). */
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

/**
 * Parse the themed SVG once per theme. Returns null when it can't be parsed,
 * so the caller drops the whole Illustration section. Exported for tests.
 */
export function parseIllustration(svg: string, palette: Parameters<typeof themeSvg>[1]): JsxAST | null {
  try {
    return parse(themeSvg(svg, palette, { sans: font.sans600, mono: MONO }));
  } catch {
    return null;
  }
}

/**
 * A diagram, scaled to the content width with its proportions kept.
 * With large text it is drawn larger and scrolls sideways. A screen reader
 * hears its description once (the SVG's aria-label); the caption below is
 * normal text that grows with the phone's text size.
 */
export function IllustrationView({ illustration, onSection }: { illustration: NoteIllustration; onSection?: ReactNode }) {
  const { c } = useTheme();
  const column = useColumnWidth();
  const fontScale = useFontScale();
  const ast = useMemo(() => parseIllustration(illustration.svg, c), [illustration.svg, c]);
  if (!ast) return null;
  const zoom = fontScale >= LARGE_TEXT ? fontScale : 1;
  const size = svgSize(illustration, column, zoom);
  const drawing = (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={illustration.label}
      style={{ width: size.width, height: size.height }}
    >
      <SvgAst ast={ast} override={{ width: size.width, height: size.height }} />
    </View>
  );
  return (
    <DrawingBoundary>
      {onSection}
      {size.width > column ? (
        <View style={{ marginRight: -space.gutter }}>
          <ScrollView horizontal contentContainerStyle={{ paddingRight: space.gutter }}>{drawing}</ScrollView>
        </View>
      ) : (
        drawing
      )}
      {illustration.caption && <T v="meta" style={{ marginTop: space.sm }}>{illustration.caption}</T>}
    </DrawingBoundary>
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
 * Every section of a subtopic, in the fixed v2 order. Optional sections
 * (compare, types, illustration, analogy, memory aid) are simply skipped.
 */
export function NoteBody({ note }: { note: NoteSubtopic }) {
  const { c } = useTheme();
  return (
    <View>
      {/* 1. In one line: the question-stem serif, the page's lead sentence. */}
      <T v="caption" color={c.accentText}>In one line</T>
      <T v="stem" style={{ marginTop: space.xs }}>{note.definition}</T>

      <Section title="Why it matters" />
      <T v="body" style={{ marginTop: space.xs }}>{note.whyItMatters}</T>

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
                <Section title="Illustration" />
                <Gap h={space.sm} />
              </>
            ) : (
              <Gap h={space.lg} />
            )
          }
        />
      ))}

      <Section title="Example" />
      <T v="body" style={{ marginTop: space.xs }}>{note.example}</T>

      <Section title="How ISACA thinks" />
      <IsacaRule text={note.isacaRule} />

      {note.examTraps.length > 0 && (
        <>
          <Section title="Exam traps" />
          <ExamTraps traps={note.examTraps} />
        </>
      )}

      {note.keyTerms.length > 0 && (
        <>
          <Section title="Key terms" />
          <TermList items={note.keyTerms} />
        </>
      )}

      {(note.analogy || note.memoryAid) && (
        <>
          <Section title={note.analogy && note.memoryAid ? 'Analogy and memory aid' : note.analogy ? 'Analogy' : 'Memory aid'} />
          {note.analogy && <T v="body" style={{ marginTop: space.xs }}>{note.analogy}</T>}
          {note.memoryAid && (
            <View style={{ marginTop: space.md }}>
              <T v="caption" color={c.accentText}>Remember it</T>
              <T v="label" style={{ marginTop: 2 }}>{note.memoryAid}</T>
            </View>
          )}
        </>
      )}
    </View>
  );
}
