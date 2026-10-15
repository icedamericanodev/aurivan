/**
 * Native study-note diagrams (mobile 1.22, design spec §3.8, SUPER #3).
 *
 * The notes' web diagrams are 500-wide SVGs authored for a desktop column
 * (uppercase labels, a mono face). On a phone they either shrink until the
 * labels are unreadable or need "Tap to enlarge". The figures here are drawn
 * for the phone instead, in the lessons' diagram vocabulary:
 * - lines and marks with react-native-svg, in Grove tokens (the rail in
 *   `accent` at 80%, spans in `ink2`, outer limits in `muted`);
 * - labels as real text in Figtree (`caption` 13 and up, never mono, never
 *   uppercase), so they stay sharp, wrap inside the column and grow with the
 *   phone's text size (capped where a label is tied to a mark's position);
 * - always fitted to the plate; nothing scrolls sideways.
 *
 * `nativeFigureFor(subtopicId)` is the registry: a note with an entry shows
 * its native figure in place of its FIRST web illustration (that one's caption
 * stays under it); every other note keeps the fitted SVG and the viewer. The
 * figures are still pictures for a screen reader: one stop, one sentence.
 *
 * Drawn natively so far: 4B1.2 (recovery timeline), 4A7.2 (incident steps),
 * 4A8.3 (patch cycle), 4A6.2 (capacity cycle), 4B5.4 (plan tests, least to
 * most thorough). The rest are listed in DESIGN_SYSTEM.md §11 "Study notes".
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ICON_STROKE, RotateCcw } from './icons';
import { BigNum, Card, ICON_SIZE, T } from './ui';

/** A label tied to a mark's position grows with the text size up to here, then wraps (the caption carries the rest). */
const PINNED_LABEL_SCALE = 1.3;

// ── The registry ───────────────────────────────────────────────────────

export interface NativeFigure {
  /** What a screen reader says for the whole figure. */
  label: string;
  /**
   * The note's caption, adapted where it describes the web drawing's layout
   * (4A7.2's "runs left to right" reads top to bottom here). Content stays the
   * source; when the phrase changes there, the caption shows as written.
   */
  caption?: (source: string) => string;
  /** The drawing, at the plate's inner width. */
  draw: (width: number) => ReactNode;
}

type FlowStep = { label: string; note?: string };

const flow = (label: string, steps: FlowStep[], opts: { cycle?: string; scale?: [string, string] } = {}): NativeFigure => ({
  label: `${label}: ${steps.map((s, i) => `${i + 1}, ${s.label}${s.note ? `: ${s.note}` : ''}`).join('. ')}.${opts.cycle ? ` ${opts.cycle}.` : ''}${
    ''
  }`,
  draw: () => <FlowFigure steps={steps} cycle={opts.cycle} scale={opts.scale} />,
});

const FIGURES: Record<string, NativeFigure> = {
  '4B1.2': {
    label:
      'Recovery timeline: the last good backup, then the disruption, then service restored. The data written between the last good backup and the disruption is lost, and that amount must not exceed the RPO. The downtime from the disruption until service is restored must not exceed the RTO. The MTD, measured forward from the disruption, is the outer limit: the RTO sits inside it.',
    draw: (width) => <RecoveryTimeline width={width} />,
  },
  '4A7.2': flow('Handling an operational incident, in order', [
    { label: 'Detection', note: 'Logged, classified and prioritized' },
    { label: 'Containment', note: 'Any spreading damage stopped' },
    { label: 'Restoration', note: 'Service back by fix or workaround' },
    { label: 'Closure', note: 'Confirmed with the user' },
    { label: 'Lessons learned', note: 'Reviewed without blame' },
  ]),
  '4A8.3': flow('The patch cycle', [
    { label: 'Identify', note: 'Matched to the asset inventory and ranked by risk' },
    { label: 'Test', note: 'Shortened when urgent, never removed' },
    { label: 'Approve' },
    { label: 'Deploy', note: 'With a rollback plan' },
    { label: 'Verify', note: 'Installation confirmed by scan' },
  ]),
  '4A6.2': flow(
    'The capacity cycle',
    [
      { label: 'Monitor usage', note: 'Use and spending checked against thresholds' },
      { label: 'Forecast demand', note: 'Based on peaks, not averages' },
      { label: 'Provision ahead', note: 'After demand management, ordered early enough to cover lead times' },
    ],
    { cycle: 'Then monitor again' },
  ),
  '4B5.4': flow(
    'Recovery plan tests, from least to most thorough',
    [
      { label: 'Checklist', note: 'Contents checked, nothing moved' },
      { label: 'Walkthrough' },
      { label: 'Simulation', note: 'Timed scenario, live processing untouched' },
      { label: 'Parallel', note: 'Recovery site runs real data; production continues' },
      { label: 'Full interruption', note: 'Production moved; the riskiest' },
    ],
    { scale: ['Least thorough', 'Most thorough'] },
  ),
};

// Captions adapted to the native figures (notes curator, 1.22 review); the web data stays as it is.
// 4B1.2: this timeline also shows the MTD. 4A7.2: the web drawing runs left to right, this one top to bottom.
FIGURES['4B1.2'].caption = (source) =>
  source.includes('RPO and RTO on one timeline.')
    ? `${source.replace('RPO and RTO on one timeline.', 'RPO, RTO and MTD on one timeline.')} The MTD is the outer limit, and the RTO must fit inside it.`
    : source;
FIGURES['4A7.2'].caption = (source) => source.replace('An operational incident runs left to right:', 'Read the steps top to bottom. In an operational incident,');

/** The native figure for a subtopic's first diagram, if one has been drawn. */
export function nativeFigureFor(subtopicId: string): NativeFigure | undefined {
  return FIGURES[subtopicId];
}

/** Subtopic ids with a native figure (tests, docs). */
export const NATIVE_FIGURE_IDS: readonly string[] = Object.keys(FIGURES);

/**
 * A native figure on its L1 plate, with the note's own caption under it.
 * One screen-reader stop for the drawing; the caption is normal text.
 */
export function NativeFigureView({ figure, caption, width }: { figure: NativeFigure; caption?: string; width: number }) {
  // The plate pads 16 each side: the drawing fits what is left.
  const inner = width - space.lg * 2;
  return (
    <Card variant="plate">
      <View accessible accessibilityRole="image" accessibilityLabel={figure.label}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {figure.draw(inner)}
        </View>
      </View>
      {caption ? <T v="meta" style={{ marginTop: space.lg }}>{figure.caption ? figure.caption(caption) : caption}</T> : null}
    </Card>
  );
}

// ── 4B1.2: the recovery timeline ──────────────────────────────────────

/**
 * Time runs left to right on one rail: the last good backup (a ring), the
 * disruption (a dashed line that runs down the whole figure: left of it is
 * the past, right of it the future), service restored (a filled dot), and
 * the MTD's outer limit (a short dashed tick). Under the rail, spans:
 * "Data lost ≤ RPO" looks BACK from the disruption to the last good backup;
 * "Downtime ≤ RTO" looks FORWARD to service restored; under them, "MTD: the
 * outer limit" from the disruption to the tick. Every label sits on its own
 * side of the dashed line, so none can collide, at any width.
 */
export function RecoveryTimeline({ width }: { width: number }) {
  const { c } = useTheme();
  // Exactly the plate's inner width: labels wrap inside their side of the line, however narrow.
  const W = Math.max(0, width);
  const xB = 7; // the last good backup's ring
  const xD = Math.round(W * 0.4); // the disruption
  const right = W - xD - space.sm; // the room right of the dashed line
  const xR = Math.round(xD + space.sm + right / 2); // service restored, centered over its label
  const xM = W - 30; // the MTD's outer limit (clear of the arrow)
  const RAIL_H = 28;
  const railY = RAIL_H / 2;
  const leftBox = { width: xD - space.sm };
  const rightBox = { marginLeft: xD + space.sm, width: right };
  const pinned = { maxFontSizeMultiplier: PINNED_LABEL_SCALE } as const;
  const span = (x0: number, x1: number) => `M${x0} 2 V10 H${x1} V2`;
  const stroke = { strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <View style={{ width: W }}>
      {/* Above the rail: the event that splits time. */}
      <View style={{ marginLeft: Math.max(0, xD - W * 0.3), width: Math.min(W * 0.6, 2 * Math.min(xD, W - xD)), alignItems: 'center', marginBottom: 2 }}>
        <T v="caption" color={c.ink} {...pinned} center>Disruption</T>
      </View>
      <View>
        {/* The disruption runs down the whole figure: a dashed line from the rail to the last label. */}
        <View style={{ position: 'absolute', left: xD - 1, top: 0, bottom: 0, width: 2 }}>
          <Svg width={2} height="100%">
            <Line x1={1} y1={0} x2={1} y2="100%" stroke={c.ink2} strokeWidth={1.5} strokeDasharray="3 4" />
          </Svg>
        </View>
        {/* The rail, with the arrow of time at its end. */}
        <Svg width={W} height={RAIL_H}>
          <Line x1={xB} y1={railY} x2={W - 3} y2={railY} stroke={c.accent} strokeOpacity={0.8} strokeWidth={2} strokeLinecap="round" />
          <Path d={`M${W - 9} ${railY - 5} L${W - 3} ${railY} L${W - 9} ${railY + 5}`} stroke={c.accent} strokeOpacity={0.8} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1={xM} y1={railY - 7} x2={xM} y2={railY + 7} stroke={c.muted} strokeWidth={1.5} strokeDasharray="2 3" />
          <Circle cx={xB} cy={railY} r={6} stroke={c.accent} strokeWidth={2} fill={c.raised2} />
          <Circle cx={xR} cy={railY} r={6} fill={c.accent} />
        </Svg>
        {/* Under the rail: the two events, one each side of the line. */}
        <View style={{ flexDirection: 'row', marginTop: space.xs }}>
          <View style={leftBox}>
            <T v="caption" color={c.ink2} {...pinned}>Last good backup</T>
          </View>
          <View style={{ marginLeft: space.lg, width: right, alignItems: 'center' }}>
            <T v="caption" color={c.ink2} {...pinned} center>Service restored</T>
          </View>
        </View>
        {/* RPO looks back from the disruption; RTO looks forward. */}
        <Svg width={W} height={12} style={{ marginTop: space.md }}>
          <Path d={span(xB, xD - 4)} stroke={c.ink2} {...stroke} />
          <Path d={span(xD + 4, xR)} stroke={c.ink2} {...stroke} />
        </Svg>
        <View style={{ flexDirection: 'row', marginTop: 2 }}>
          <View style={leftBox}>
            <T v="caption" color={c.ink} {...pinned}>Data lost ≤ RPO</T>
          </View>
          <View style={{ marginLeft: space.lg, width: right }}>
            <T v="caption" color={c.ink} {...pinned}>Downtime ≤ RTO</T>
          </View>
        </View>
        {/* The outer limit, measured forward from the same moment. */}
        <Svg width={W} height={12} style={{ marginTop: space.md }}>
          <Path d={span(xD + 4, xM)} stroke={c.muted} strokeDasharray="3 3" {...stroke} />
        </Svg>
        <View style={[rightBox, { marginTop: 2 }]}>
          <T v="caption" color={c.ink2} {...pinned}>MTD: the outer limit</T>
        </View>
      </View>
    </View>
  );
}

// ── Steps, cycles and scales (the lesson's steps vocabulary) ───────────

/**
 * Numbered stops on a path, top to bottom (the lesson StepsScene, still: a
 * note is a reference page, so nothing builds or draws). `cycle`: the path
 * ends in a return mark and a line ("Then monitor again"). `scale`: a quiet
 * caption above the first stop and below the last ("Least thorough" … "Most
 * thorough"), the path ending in an arrow.
 */
export function FlowFigure({ steps, cycle, scale }: { steps: FlowStep[]; cycle?: string; scale?: [string, string] }) {
  const { c } = useTheme();
  const n = steps.length;
  return (
    <View>
      {scale && (
        <T v="caption" color={c.ink2} style={{ marginBottom: space.sm }}>{scale[0]}</T>
      )}
      {steps.map((step, i) => (
        <View key={step.label} style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ alignItems: 'center', width: 28 }}>
            {/* Grows with a large numeral instead of clipping it (1.22 review P6). */}
            <View style={{ minWidth: 28, minHeight: 28, padding: 2, borderRadius: radius.pill, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
              <BigNum value={String(i + 1)} size={17} color={c.accentText} />
            </View>
            {(i < n - 1 || cycle || scale) && (
              <View style={{ width: 1.5, flex: 1, minHeight: 12, backgroundColor: c.accent, opacity: 0.8 }} />
            )}
          </View>
          <View style={{ flex: 1, paddingTop: 3, paddingBottom: i < n - 1 ? space.md : space.sm }}>
            <T v="label">{step.label}</T>
            {step.note ? <T v="meta">{step.note}</T> : null}
          </View>
        </View>
      ))}
      {cycle && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 28, alignItems: 'center' }}>
            <RotateCcw size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />
          </View>
          <T v="meta" color={c.ink2} style={{ flex: 1 }}>{cycle}</T>
        </View>
      )}
      {scale && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 28, alignItems: 'center' }}>
            <Svg width={14} height={10}>
              <Path d="M2 2 L7 8 L12 2" stroke={c.accent} strokeOpacity={0.8} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <T v="caption" color={c.ink2} style={{ flex: 1 }}>{scale[1]}</T>
        </View>
      )}
    </View>
  );
}
