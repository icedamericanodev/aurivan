/**
 * The readiness report's building blocks (mobile 1.16, PHASE5.md §3.1–3.2),
 * plus Today's exam-week card. The rules live in engine/readinessReport.ts
 * and engine/examWeek.ts; these only draw them.
 *
 * - ScoreChart: a quiet line chart on a scale at least 20 points tall (a
 *   2-point wobble never reads as a cliff). Static: nothing grows or draws
 *   in, with motion on or off. Decorative to screen readers: the caller says
 *   the trend in one sentence and prints the numbers.
 * - TrendLegend: what each mark means, by SHAPE (filled leaf = full mock,
 *   outline leaf = mini mock, dashed = untimed), never colour alone.
 * - DomainReportRow: one domain, one screen-reader stop.
 * - ExamWeekCard: the key-idea recipe (a 3px accent rule, no card).
 */
import { useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { domainColor, domainLabel } from '../content/certifications';
import { chartScale, domainSpoken, evidenceLine, mockLine, type DomainRow, type TrendPoint } from '../engine/readinessReport';
import { durationWords, TIMING_LABEL } from '../engine/pace';
import { shortDate } from '../lib/format';
import type { MockResult } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Button, Row, T } from './ui';

/** Shown under the framing quote, always (the honest limits of the number). */
export const FRAMING_LINE =
  'It comes from your answers in this app, weighted like the exam. It can’t see the real questions, exam-day nerves or how the exam is scored. The range narrows as you answer more.';
export const HOW_LINE =
  'Each domain’s number is how much of it you’ve got right on your latest tries, with a hint counting half. Domains count by their weight on the exam. The low end is the cautious end: we’re fairly sure you’re at or above it.';
export const PRACTICE_SCORES_NOTE = 'Practice scores are not scaled exam scores.';

/** A mock's row subtitle, the same words as You: "11 Oct · 1 h 12 min · untimed". */
export function mockSubtitle(m: MockResult): string {
  const timing = m.timing && m.timing !== 'standard' ? ` · ${TIMING_LABEL[m.timing].toLowerCase()}` : '';
  return `${shortDate(m.finishedAt)} · ${durationWords(m.minutesUsed * 60_000).text}${timing}`;
}

/** One point's mark. `none`: just the line passes through it. */
export type ChartMarkKind = 'full' | 'mini' | 'other' | 'leaf' | 'none';
export interface ChartMark {
  pct: number;
  mark: ChartMarkKind;
  /** Untimed: the mark's outline is dashed. */
  dashed?: boolean;
}

/** The chart's box and insets (a leaf stands about 7pt above and below its point). */
export const CHART = { height: 88, padX: 12, top: 12, bottom: 10, maxWidth: 420 } as const;

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** Point positions for these values in a w × h box, on chartScale's range. Exported for tests. */
export function chartPoints(values: readonly number[], w: number, h: number = CHART.height): [number, number][] {
  const { lo, hi } = chartScale(values);
  const n = values.length;
  const inner = h - CHART.top - CHART.bottom;
  return values.map((v, i) => [
    CHART.padX + (n > 1 ? (i * (w - 2 * CHART.padX)) / (n - 1) : (w - 2 * CHART.padX) / 2),
    CHART.top + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * inner,
  ]);
}

/** A leaf centred on its point (13pt tall), the app's mark for a mock. */
const leaf = (x: number, y: number) =>
  `M${f1(x)},${f1(y + 6)}C${f1(x - 5)},${f1(y + 3)} ${f1(x - 5)},${f1(y - 3)} ${f1(x)},${f1(y - 7)}C${f1(x + 5)},${f1(y - 3)} ${f1(x + 5)},${f1(y + 3)} ${f1(x)},${f1(y + 6)}Z`;

/** The width a chart gets on this phone: the screen minus the gutters, never wider than 420. */
export function useChartWidth(): number {
  const { width } = useWindowDimensions();
  return Math.max(160, Math.min(CHART.maxWidth, width - 2 * space.gutter));
}

function Mark({ x, y, kind, dashed, color, paper }: { x: number; y: number; kind: ChartMarkKind; dashed?: boolean; color: string; paper: string }) {
  const dash = dashed ? { strokeDasharray: [2, 1.6] } : {};
  switch (kind) {
    case 'none':
      return null;
    case 'full':
    case 'leaf':
      return <Path d={leaf(x, y)} fill={color} fillOpacity={dashed ? 0.35 : 1} stroke={color} strokeWidth={1.4} {...dash} />;
    case 'mini':
      return <Path d={leaf(x, y)} fill={paper} stroke={color} strokeWidth={1.5} {...dash} />;
    case 'other':
      return <Circle cx={x} cy={y} r={3.4} fill={paper} stroke={color} strokeWidth={1.5} {...dash} />;
  }
}

/** A quiet static chart: the line, one mark per point, a hairline floor. */
export function ScoreChart({ marks, width, testID }: { marks: readonly ChartMark[]; width: number; testID?: string }) {
  const { c } = useTheme();
  const pts = chartPoints(marks.map((m) => m.pct), width);
  if (pts.length === 0) return null;
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)},${f1(y)}`).join('');
  const floor = CHART.height - 1;
  return (
    <View testID={testID} accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={width} height={CHART.height} viewBox={`0 0 ${width} ${CHART.height}`} fill="none">
        <Line x1={0} y1={floor} x2={width} y2={floor} stroke={c.line} strokeWidth={1} />
        {pts.length > 1 && <Path d={d} stroke={c.accent} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />}
        {pts.map(([x, y], i) => (
          <Mark key={i} x={x} y={y} kind={marks[i].mark} dashed={marks[i].dashed} color={c.accent} paper={c.bg} />
        ))}
      </Svg>
    </View>
  );
}

/** The mock trend's marks: full = filled leaf, mini = outline leaf, other = a small ring; untimed dashed. */
export const trendMarks = (points: readonly TrendPoint[]): ChartMark[] => points.map((p) => ({ pct: p.pct, mark: p.kind, dashed: !p.timed }));

/** The low-end line's marks: the newest day a filled leaf, the rest just the line. */
export const lowMarks = (values: readonly number[]): ChartMark[] => values.map((pct, i) => ({ pct, mark: i === values.length - 1 ? 'leaf' : 'none' }));

/** What the marks mean, only for the kinds on the chart. Wraps at large text. Decorative (the rows say it). */
export function TrendLegend({ points }: { points: readonly TrendPoint[] }) {
  const { c } = useTheme();
  const items: { key: string; kind: ChartMarkKind; dashed?: boolean; label: string }[] = [];
  if (points.some((p) => p.kind === 'full')) items.push({ key: 'full', kind: 'full', label: 'Full mock' });
  if (points.some((p) => p.kind === 'mini')) items.push({ key: 'mini', kind: 'mini', label: 'Mini mock' });
  if (points.some((p) => p.kind === 'other')) items.push({ key: 'other', kind: 'other', label: 'Other length' });
  if (points.some((p) => !p.timed)) items.push({ key: 'untimed', kind: 'mini', dashed: true, label: 'Untimed' });
  if (items.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs, marginTop: space.sm }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {items.map((it) => (
        <Row key={it.key} gap={6}>
          <Svg width={14} height={16} viewBox="0 0 14 16">
            <Mark x={7} y={8.5} kind={it.kind} dashed={it.dashed} color={c.accent} paper={c.bg} />
          </Svg>
          <T v="meta">{it.label}</T>
        </Row>
      ))}
    </View>
  );
}

/**
 * One domain (PHASE5.md §3.1, item 6): "Domain 4 · IS Operations", its share
 * of the exam and domain readiness, the evidence behind it, the last two
 * mocks in it, and a 3px bar in the domain's tone. One screen-reader stop.
 * Never "of N questions in this domain" (the bank size is never shown).
 */
export function DomainReportRow({ row, last }: { row: DomainRow; last?: boolean }) {
  const { c, isDark } = useTheme();
  const tone = domainColor(row.domain.tone, isDark);
  const mocks = mockLine(row);
  return (
    <View
      accessible
      accessibilityLabel={domainSpoken(row)}
      testID={`domain-row-${row.domain.id}`}
      style={{ paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}
    >
      <T v="label">{domainLabel(row.domain)}</T>
      <T v="meta" color={c.ink}>{`${row.weightPct}% of the exam · domain readiness ${row.readinessPct}%`}</T>
      <T v="meta">{evidenceLine(row)}</T>
      {mocks && <T v="meta">{mocks}</T>}
      {/* The domain's tone fills its readiness (a static bar: nothing grows on a data screen). */}
      <View style={{ height: 3, borderRadius: 2, backgroundColor: c.track, marginTop: space.sm, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(0, Math.min(100, row.readinessPct))}%`, height: 3, backgroundColor: tone }} />
      </View>
    </View>
  );
}

/**
 * Today's exam-week card (days 7 to 2 before the exam): the key-idea recipe
 * under the hero. The words are one stop; each button is its own. Never a
 * red or "overdue" state: "2 of 5 done" is all it counts.
 */
export function ExamWeekCard({ count, onOpen, onHide }: { count: string; onOpen: () => void; onHide: () => void }) {
  const { c } = useTheme();
  const line = 'A calm week. A short checklist, then light review.';
  return (
    <View testID="exam-week-card" style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
      {/* "This week", not "Exam week": the readiness row's stage line already says Exam week (UX review P5). */}
      <View accessible accessibilityLabel={`This week. ${line} ${count}.`}>
        <T v="caption" color={c.accentText}>This week</T>
        <T v="small" style={{ marginTop: space.xs }}>{line}</T>
        <T v="meta" style={{ marginTop: 2 }}>{count}</T>
      </View>
      <Row gap={space.xs} style={{ flexWrap: 'wrap', marginLeft: -space.sm }}>
        <Button kind="ghost" label="Open checklist" accessibilityHint="A short practical list for the week before your exam" onPress={onOpen} />
        <Button kind="ghost" label="Hide" accessibilityLabel="Hide this card. The checklist stays in your readiness report." onPress={onHide} />
      </Row>
    </View>
  );
}
