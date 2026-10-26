/**
 * You → Readiness (mobile 1.43, board 3; owner decision "one ring"):
 *
 * - ONE readiness ring (`ReadinessRing`): a single wobbly growth ring in
 *   `accent`. The solid arc runs to the low end of the range, a lighter band
 *   covers the range itself (low to high), and a notch marks the app's 80%
 *   study bar. It replaces the five domain rings and the separate 0–100 line,
 *   so the same figure is drawn once. Spoken as one image: "Estimated
 *   readiness 68 to 78 percent. The notch is the 80 percent study bar."
 * - Beside it (stacked at ×1.3 text): the range as a serif 38 numeral,
 *   "Estimated readiness" and "A study estimate, not a prediction."
 * - One row per area (`AreaRows`): a word for every area, a short bar in the
 *   domain's tone with the area's 70% line, and the percent from 30 answers
 *   (below that "N answered", and the bar drawn lighter: thin data looks
 *   thin). An area below its line shows its word in `clay` (calm attention,
 *   never the answer-feedback red) and in `label` weight, so it stands out by
 *   weight and word, not by colour alone.
 *
 * Motion: the ring's solid arc grows from what was last seen (the day's first
 * view grows from 0), like the rings it replaces; the band, the notch and the
 * bars are still. Static under Reduce Motion.
 */
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { domainColor } from '../content/certifications';
import type { Certification } from '../content/types';
import { AREA_LINE_LABEL, AREAS_CAPTION, areaFigure, STEADY_FROM } from '../engine/domainBand';
import { READY_LOW } from '../engine/examReady';
import type { Readiness } from '../engine/readiness';
import { rangeLabel, RANGE_MIN_ANSWERS, type ReadinessRange } from '../engine/readinessRange';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ringArc, RingArc } from './glyphs';
import { boundsLabel, ESTIMATE_LINE, ESTIMATE_SHORT } from './journey';
import { type Growth, useMotion } from './motion';
import { BigNum, DomainDot, T, useFontScale } from './ui';

/** The ring's box, its mid radius and its stroke. */
const SIZE = 112;
const C = SIZE / 2;
const RM = 42;
const W = 12;
/** 12 o'clock, clockwise, as the growth rings. */
const at = (share: number) => -Math.PI / 2 + Math.PI * 2 * share;

/** "Estimated readiness 68 to 78 percent" (the brief's words), or the countdown to the first range. */
export function readinessSpoken(range: ReadinessRange): string {
  return range.enough
    ? `Estimated readiness ${range.low} to ${range.high} percent. The notch is the ${READY_LOW} percent study bar.`
    : `Not enough data yet. ${RANGE_MIN_ANSWERS - range.needed} of ${RANGE_MIN_ANSWERS} for your first range.`;
}

/** The ring alone: decorative inside ReadinessBlock (whose one stop says it all); pass `label` to make it its own image. */
export function ReadinessRing({ range, growth, label }: { range: ReadinessRange; growth?: Growth; label?: boolean }) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const low = range.enough ? range.low / 100 : 0;
  const high = range.enough ? range.high / 100 : 0;
  const track = useMemo(() => ringArc(C, RM, 0, Math.PI * 2).d, []);
  const solid = useMemo(() => ringArc(C, RM, at(0), at(Math.max(0.001, low))), [low]);
  const band = useMemo(() => (high > low ? ringArc(C, RM, at(low), at(high)).d : null), [low, high]);
  // The notch: a radial tick across the ring at the study bar, overhanging it 4pt each side, on a paper halo.
  const t = at(READY_LOW / 100);
  const r0 = RM - W / 2 - 4;
  const r1 = RM + W / 2 + 4;
  const notch = { x1: C + r0 * Math.cos(t), y1: C + r0 * Math.sin(t), x2: C + r1 * Math.cos(t), y2: C + r1 * Math.sin(t) };
  const from = growth && range.enough && range.low > 0 ? Math.max(0, Math.min(1, (growth.from[0] ?? 0) / range.low)) : 0;
  return (
    <View
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label ? readinessSpoken(range) : undefined}
      style={{ width: SIZE, height: SIZE }}
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Path d={`${track}Z`} fill="none" stroke={c.track} strokeWidth={W} />
        {band && <Path d={band} fill="none" stroke={c.accent} strokeOpacity={0.35} strokeWidth={W} />}
        {range.enough && low > 0 && (
          <RingArc
            d={solid.d}
            length={solid.length}
            width={W}
            color={c.accent}
            animate={!reduced && Boolean(growth?.play)}
            start={from}
            run={growth?.run ?? 0}
            delay={0}
          />
        )}
        <Line {...notch} stroke={c.bg} strokeWidth={5} strokeLinecap="round" />
        <Line {...notch} stroke={c.ink} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** The ring with the range beside it (stacked at ×1.3 text, spec §10.7). */
export function ReadinessBlock({ range, growth }: { range: ReadinessRange; growth?: Growth }) {
  const { c } = useTheme();
  const stacked = useFontScale() >= LARGE_TEXT;
  const roll = growth ? { play: growth.play, from: boundsLabel(growth.from), run: growth.run } : undefined;
  return (
    // ONE screen-reader stop for the ring and its words (the rolling numeral's columns are hidden; the label says the final value).
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={readinessSpoken(range)}
      style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'flex-start' : 'center', gap: stacked ? space.md : space.lg }}
    >
      <ReadinessRing range={range} growth={growth} />
      <View style={{ flex: stacked ? undefined : 1, minWidth: 0 }}>
        {range.enough ? (
          <BigNum value={rangeLabel(range)} pct size={38} roll={roll} />
        ) : (
          <T v="headline">Not enough data yet</T>
        )}
        <T v="label" style={{ marginTop: space.xs }}>{range.enough ? ESTIMATE_LINE : `${RANGE_MIN_ANSWERS - range.needed} of ${RANGE_MIN_ANSWERS} for your first range`}</T>
        {range.enough && <T v="small" color={c.ink2} style={{ marginTop: 2 }}>{ESTIMATE_SHORT}</T>}
      </View>
    </View>
  );
}

/**
 * The one-line row (×1 text) uses fixed columns, so every area's 70% tick sits at the same x: the bar
 * (80pt, so "IT Governance" keeps one line at 393 dp), the word (80pt, a thin area's "N answered"
 * under it) and the figure (48pt). At ×1.3 text the row stacks: the name, the bar on its own
 * full-width line, then the word and the figure, which wrap rather than overflow.
 */
const BAR_W = 80;
const WORD_W = 80;
const FIGURE_W = 48;

/** One row per area: name, a short bar with the 70% line, the word, and the percent (from 30 answers). */
export function AreaRows({ cert, readiness, ups }: { cert: Certification; readiness: Readiness; /** Points up since the last real look, blueprint order (said in each row's label). */ ups?: readonly number[] }) {
  const { c, isDark } = useTheme();
  const stacked = useFontScale() >= LARGE_TEXT;
  return (
    <View>
      {/* The two captions: what the figures count, and which line the ticks are (80 is the ring's notch). */}
      <View style={{ flexDirection: stacked ? 'column' : 'row', justifyContent: 'space-between', gap: space.xs }}>
        <T v="caption" color={c.ink2}>{AREAS_CAPTION}</T>
        {/* Not at large text: the stacked rows' bars span the width, so there is no tick column to label. */}
        {!stacked && <T v="caption" color={c.ink2}>{AREA_LINE_LABEL}</T>}
      </View>
      {cert.domains.map((d, i) => {
        const dm = readiness.domains.find((x) => x.domainId === d.id);
        const answered = dm?.answered ?? 0;
        const pct = Math.round((dm?.mastery ?? 0) * 100);
        const f = areaFigure(answered, pct);
        const tone = domainColor(d.tone, isDark);
        const bar = (
          <View style={{ width: stacked ? '100%' : BAR_W, height: 6, borderRadius: 3, backgroundColor: c.track, marginVertical: stacked ? 4 : 0 }}>
            {answered > 0 && <View style={{ width: `${Math.max(2, pct)}%`, height: 6, borderRadius: 3, backgroundColor: tone, opacity: f.thin ? 0.45 : 1 }} />}
            {/* The area's 70% line: 2pt in ink2 on a 1pt paper gap each side, 4pt above and below the bar. */}
            <View style={{ position: 'absolute', left: `${STEADY_FROM}%`, top: -4, width: 4, height: 14, marginLeft: -2, backgroundColor: c.bg, alignItems: 'center' }}>
              <View style={{ width: 2, height: 14, backgroundColor: c.ink2 }} />
            </View>
          </View>
        );
        const count = f.pct === null && answered > 0 ? `${answered} answered` : null;
        const word = (
          <T v={f.below ? 'label' : 'small'} color={f.below ? c.clay : c.ink2} style={{ textAlign: 'right' }}>
            {f.word}
          </T>
        );
        const number = f.pct !== null ? <BigNum value={String(f.pct)} pct size={17} /> : null;
        const name = (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: stacked ? undefined : 1, minWidth: 0 }}>
            <DomainDot domain={d} />
            <T v="small" color={c.ink} style={{ flex: 1, minWidth: 0 }}>{d.short}</T>
          </View>
        );
        return (
          <View
            key={d.id}
            accessible
            accessibilityLabel={`${d.short}: ${f.spoken}${ups && (ups[i] ?? 0) > 0 ? `. Up ${Math.round(ups[i])} since you last looked` : ''}`}
            style={{
              minHeight: 48,
              justifyContent: 'center',
              paddingVertical: space.sm,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: c.line,
              marginTop: i === 0 ? space.xs : 0,
            }}
          >
            {stacked ? (
              <View style={{ gap: space.sm }}>
                {name}
                {bar}
                {/* The word, then the figure (or "N answered"): one line that wraps at very large text. */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: space.md, rowGap: space.xs }}>
                  <View style={{ flexShrink: 1 }}>{word}</View>
                  {number ?? <T v="meta" color={c.ink2} style={{ flexShrink: 1 }}>{count ?? '–'}</T>}
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                {name}
                {bar}
                {/* Fixed columns, so the 70 ticks line up from row to row; a thin area's count sits under its word. */}
                <View style={{ width: WORD_W, alignItems: 'flex-end' }}>
                  {word}
                  {count && <T v="meta" color={c.ink2} style={{ textAlign: 'right' }}>{count}</T>}
                </View>
                <View style={{ width: FIGURE_W, alignItems: 'flex-end' }}>
                  {number ?? (count ? null : <T v="meta" color={c.ink2}>–</T>)}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
