/**
 * Grove Today (Phase 2 on the phone): the hero with the readiness ring, Today's plan card and
 * this week's twig. design-notes/grove/GROVE_HANDOFF.md 6.3, 6.4 and 6.6; the kit's
 * screens/01-phone-today.png; the owner's decisions in design-notes/grove/DECISIONS.md.
 *
 * Plain English:
 * - GroveHero: the one forest card on Today. The plant's stage in words at the top ("Seed",
 *   "Stage 1 of 6"), the readiness ring with the learner's plant drawn full size inside it, the
 *   caption under the ring, and two small tiles: Accuracy and Exam date.
 * - PlanCard: "Today's plan" with its numbered steps, the Start button and "Stop any time".
 * - WeekTwig: seven leaves for this week, filled on the days studied.
 *
 * Every number comes from values the app already works out (engine/groveToday.ts says how).
 * The ring and the twig are drawings: what they show is always said in words too.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import { RANGE_MIN_ANSWERS } from '../engine/readinessRange';
import { RING_STUDY_BAR, rangeTicks, TWIG_LETTERS, type AccuracyTile, type RingCaption, type RingMode, type TickState, type TwigDay } from '../engine/groveToday';
import { groveRadius, heroHighlight, heroInk, heroInset, heroPanel } from '../theme/grove';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { FieldText } from './fieldguide';
import { Check } from './icons';
import { FadeIn, useMotion, type Growth } from './motion';
import { ForestLight, groveCard, T, useFontScale } from './ui';

// ── The hero card ──────────────────────────────────────────────────────

/** The forest card itself: the kit's hero gradient, 24 corners, the 1px top light. */
export function HeroCard({ children, testID }: { children: ReactNode; testID?: string }) {
  const { c, isDark } = useTheme();
  const theme = isDark ? 'dark' : 'light';
  return (
    <View testID={testID} style={{ borderRadius: groveRadius.card, backgroundColor: c.forest, boxShadow: `inset 0 1px 0 ${heroHighlight[theme]}` }}>
      {/* The gradient sits in its own clipped layer, so the text above it never shares a clip. */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: groveRadius.card, overflow: 'hidden' }} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
        <ForestLight g={heroPanel[theme]} />
      </View>
      <View style={{ padding: space.lg, gap: space.md }}>{children}</View>
    </View>
  );
}

/** The ring's size on this phone: the kit's 200 view box drawn at 160 to 184pt (smaller on a narrow phone). */
export const ringSize = (width: number) => Math.round(Math.max(148, Math.min(184, width * 0.46)));
/** The plant inside the disc, full size at every stage (the disc is 70 of the ring's 100 radius). */
export const plantInRing = (ring: number) => Math.round(ring * 0.56);

/** The kit's seed with its first shoot, for a learner with no plant (01-phone-today.html). Decorative. */
export function RingSeed({ width }: { width: number }) {
  const { c, g } = useTheme();
  const ink = heroInk.dark;
  return (
    <Svg width={width} height={(width * 84) / 96} viewBox="52 60 96 84" accessible={false} importantForAccessibility="no-hide-descendants">
      <Path d="M58 132Q100 120 142 132" fill="none" stroke={ink.soil} strokeWidth={1.5} />
      <Path d="M66 137Q100 128 134 137" fill="none" stroke={ink.soil} strokeWidth={1} opacity={0.7} />
      <Ellipse cx={100} cy={122} rx={15} ry={11} fill={g.seed} stroke={ink.seedEdge} strokeWidth={1.2} />
      <Path d="M94 116Q100 112 106 116" fill="none" stroke={ink.seedLine} strokeWidth={1.2} />
      <Path d="M100 111L100 86" fill="none" stroke={c.sap} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M100 94Q86 90 82 76Q96 77 100 92Z" fill={c.forestTrack} stroke={c.sap} strokeWidth={1.4} />
      <Path d="M100 90Q113 84 118 70Q104 72 100 88Z" fill={c.forestTrack} stroke={c.sap} strokeWidth={1.4} />
    </Svg>
  );
}

/** One mark at angle `deg` from 12 o'clock, clockwise, on the 200 grid. */
const at = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: 100 + r * Math.sin(a), y: 100 - r * Math.cos(a) };
};

/**
 * The readiness ring (kit 6.4, ring decision B). `dots`: 40 seed dots, `on` of them solid, the rest
 * outlines (shape, not colour alone). `ticks`: 50 ticks lit to the range's low end, gold inside the
 * range, a clay mark at the 80 study bar. `bare`: the plant only (exam week). The plant (or seed)
 * is drawn full size inside the disc by the caller.
 *
 * Motion: on the day's first view, or when the range rose since the learner last looked (`growth`,
 * the same record the old readiness row used), the lit marks fade in once over 600 ms; never on a
 * fall, a revisit or a remount, and never under Reduce Motion (the marks just show).
 */
export function ReadinessRing({ mode, on, low, high, size, growth, children }: { mode: RingMode; on: number; low: number; high: number; size: number; growth?: Growth; children: ReactNode }) {
  const { isDark } = useTheme();
  const { reduced } = useMotion();
  const ink = heroInk[isDark ? 'dark' : 'light'];
  const ticks = mode === 'ticks' ? rangeTicks(low, high) : [];
  const tick = (t: TickState, i: number) => (
    <Line
      key={i}
      x1={100}
      y1={7}
      x2={100}
      y2={21}
      stroke={t === 'on' ? ink.tickOn : t === 'range' ? ink.tickRange : ink.tickOff}
      strokeWidth={2.6}
      strokeLinecap="round"
      transform={`rotate(${((i * 360) / ticks.length).toFixed(2)} 100 100)`}
    />
  );
  const layer = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
  const grows = Boolean(growth?.play) && !reduced;
  return (
    <View testID="today-ring" style={{ width: size, height: size, alignSelf: 'center' }}>
      {/* The base: unlit ticks (or every seed dot) and the disc. */}
      <Svg width={size} height={size} viewBox="0 0 200 200" accessible={false} importantForAccessibility="no-hide-descendants">
        {mode === 'dots' && (
          <G testID="ring-dots">
            {Array.from({ length: RANGE_MIN_ANSWERS }, (_, i) => {
              const p = at((i * 360) / RANGE_MIN_ANSWERS, 88);
              return i < on ? (
                <Circle key={i} cx={p.x} cy={p.y} r={4.6} fill={ink.tickOn} />
              ) : (
                <Circle key={i} cx={p.x} cy={p.y} r={3.9} fill="none" stroke={ink.dotEdge} strokeWidth={1.5} />
              );
            })}
          </G>
        )}
        {mode === 'ticks' && <G>{ticks.map((t, i) => (t === 'off' ? tick(t, i) : null))}</G>}
        <Circle cx={100} cy={100} r={70} fill={ink.disc} stroke={ink.tickOff} strokeWidth={1} />
      </Svg>
      {/* The lit ticks, the range and the clay mark: their own layer, so they can light up once. */}
      {mode === 'ticks' && (
        <FadeIn key={growth?.run ?? 0} rise={false} dur="grow" play={grows} style={layer}>
          <Svg width={size} height={size} viewBox="0 0 200 200" accessible={false} importantForAccessibility="no-hide-descendants">
            <G testID="ring-ticks">{ticks.map((t, i) => (t === 'off' ? null : tick(t, i)))}</G>
            <Line testID="ring-study-bar" x1={100} y1={3} x2={100} y2={27} stroke={ink.mark} strokeWidth={3.4} strokeLinecap="round" transform={`rotate(${RING_STUDY_BAR * 3.6} 100 100)`} />
          </Svg>
        </FadeIn>
      )}
      {/* The plant, centred in the disc. */}
      <View pointerEvents="none" style={[layer, { alignItems: 'center', justifyContent: 'center' }]}>
        {children}
      </View>
    </View>
  );
}

/**
 * The ring and its caption as ONE button to the readiness report, said in words. A light ring shows
 * around it while it has keyboard focus (WCAG 2.4.7), in `onForest` because it sits on the hero.
 */
export function RingTap({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <Pressable
      testID="readiness-tap"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens your readiness report"
      onPress={onPress}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={({ pressed }) => ({ gap: space.md, padding: 6, margin: -6, borderRadius: groveRadius.tile, opacity: pressed ? 0.9 : 1 })}
    >
      {children}
      {focus && <View testID="readiness-focus-ring" pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: groveRadius.tile, borderWidth: 2, borderColor: c.onForest }} />}
    </Pressable>
  );
}

/** The caption under the ring: "10 of 40 answers / until your first readiness range", or "63 to 73 estimated range / A study estimate, not a prediction." */
export function RingCaptionText({ caption }: { caption: RingCaption }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'center', columnGap: 6 }}>
        {caption.big ? (
          <FieldText v="value" color={c.onForest} center>
            {caption.big}
          </FieldText>
        ) : null}
        <T v="body" color={c.onForest2} center>
          {caption.rest}
        </T>
      </View>
      {caption.line2 ? (
        <T v="body" color={c.onForest2} center>
          {caption.line2}
        </T>
      ) : null}
    </View>
  );
}

/** A small tile inside the hero (the kit's inset tile): a tracked key over its value. */
export function HeroTile({ k, children, spoken, testID }: { k: string; children: ReactNode; spoken?: string; testID?: string }) {
  const { c, isDark } = useTheme();
  return (
    <View
      testID={testID}
      accessible={Boolean(spoken)}
      accessibilityLabel={spoken}
      style={{ flex: 1, minWidth: 0, minHeight: 72, borderRadius: groveRadius.tile, backgroundColor: heroInset[isDark ? 'dark' : 'light'], paddingHorizontal: space.md, paddingVertical: 10, gap: 2 }}
    >
      <FieldText v="head" color={c.onForest2}>
        {k}
      </FieldText>
      {children}
    </View>
  );
}

/** The Accuracy tile: "Too few yet" (with when it shows) until 30 answers, then the percentage. One stop. */
export function AccuracyHeroTile({ tile }: { tile: AccuracyTile }) {
  const { c } = useTheme();
  return (
    <HeroTile k="Accuracy" spoken={tile.spoken} testID="today-accuracy">
      {tile.num ? (
        <FieldText v="value" color={c.onForest}>
          {tile.shown}
        </FieldText>
      ) : (
        <T v="label" color={c.onForest}>
          {tile.shown}
        </T>
      )}
      {tile.hint ? <FieldText v="small" color={c.onForest2}>{tile.hint}</FieldText> : null}
    </HeroTile>
  );
}

/** The Exam date tile: the date, or "Set a date" (a button to Settings' exam date). */
export function ExamDateHeroTile({ shown, spoken, onSet }: { shown: string | null; spoken?: string; onSet: () => void }) {
  const { c, isDark } = useTheme();
  if (shown) {
    return (
      <HeroTile k="Exam date" spoken={`Exam date, ${spoken ?? shown}`} testID="today-exam-date">
        <FieldText v="value" color={c.onForest}>
          {shown}
        </FieldText>
      </HeroTile>
    );
  }
  return (
    <Pressable
      testID="today-exam-date"
      accessibilityRole="button"
      accessibilityLabel="Exam date, set a date"
      accessibilityHint="Opens Settings at your exam date"
      onPress={onSet}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 72, borderRadius: groveRadius.tile, backgroundColor: heroInset[isDark ? 'dark' : 'light'], paddingHorizontal: space.md, paddingVertical: 10, gap: 2, opacity: pressed ? 0.85 : 1 })}
    >
      <FieldText v="head" color={c.onForest2}>
        Exam date
      </FieldText>
      <T v="label" color={c.sap}>
        Set a date
      </T>
    </Pressable>
  );
}

/** The two tiles side by side; at large text, one above the other. */
export function HeroTiles({ children }: { children: ReactNode }) {
  const large = useFontScale() >= LARGE_TEXT;
  return <View style={{ flexDirection: large ? 'column' : 'row', gap: space.sm }}>{children}</View>;
}

// ── Today's plan card ─────────────────────────────────────────────────

/** One numbered step: a 30pt square (filled for the step you are on, a check when done), its words and minutes. */
export interface PlanStep {
  key: string;
  n: number;
  title: string;
  meta?: string;
  minutes?: string;
  spoken: string;
  state: 'now' | 'done' | 'later';
}
export const STEP = 30;

export function PlanSteps({ steps }: { steps: readonly PlanStep[] }) {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  return (
    <View testID="plan-steps" style={{ gap: space.md }}>
      {steps.map((s) => (
        <View key={s.key} accessible accessibilityLabel={s.spoken} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <View
            style={{
              width: STEP,
              height: STEP,
              borderRadius: groveRadius.step,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: s.state === 'now' ? c.forestTrack : s.state === 'done' ? c.accent : 'transparent',
              borderWidth: s.state === 'later' ? 1 : 0,
              borderColor: c.control,
              marginTop: 1,
            }}
          >
            {s.state === 'done' ? (
              <Check size={16} color={c.bg} strokeWidth={3} />
            ) : (
              <FieldText v="keyNo" color={s.state === 'now' ? c.sap : c.ink2} maxScale={1.3}>
                {s.n}
              </FieldText>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="label" color={s.state === 'done' ? c.ink2 : c.ink} style={s.state === 'done' ? { textDecorationLine: 'line-through' } : undefined}>
              {s.title}
            </T>
            {s.meta ? <T v="meta">{s.meta}</T> : null}
            {large && s.minutes ? <T v="meta">{s.minutes}</T> : null}
          </View>
          {!large && s.minutes ? (
            <T v="meta" style={{ marginTop: 2 }}>
              {s.minutes}
            </T>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** The plan card's frame: the Grove card with "Today's plan" and its minutes on one line. */
export function PlanCard({ title, minutes, spoken, children, testID }: { title: string; minutes?: string; spoken: string; children: ReactNode; testID?: string }) {
  const { c } = useTheme();
  return (
    <View testID={testID} style={[groveCard(c), { padding: space.lg, gap: space.md }]}>
      {/* "Today's plan, about 17 minutes, 1 of 3 done": one header stop. */}
      <View accessible accessibilityRole="header" accessibilityLabel={spoken} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: space.md }}>
        <FieldText v="value">{title}</FieldText>
        {minutes ? <T v="meta">{minutes}</T> : null}
      </View>
      {children}
    </View>
  );
}

// ── This week's twig ──────────────────────────────────────────────────

/** The web's seven leaves on the 330 by 60 twig (index.html TODAY_TWIG_LEAVES), Monday first. */
const TWIG_LEAVES = [
  'M23.6 36.7C27 28 37 23 44 25C41 32 32 36 23.6 36.7Z',
  'M70.7 34.6C74 43 84 48 91 46C88 39 79 35 70.7 34.6Z',
  'M117.9 33.4C121 25 131 20 138 22C135 29 126 33 117.9 33.4Z',
  'M165 33C168 41 178 46 185 44C182 37 173 33 165 33Z',
  'M212 33.4C215 25 225 20 232 22C229 29 220 33 212 33.4Z',
  'M259 34.6C262 43 272 48 279 46C276 39 267 35 259 34.6Z',
  'M306 36.7C309 28 319 23 326 25C323 32 314 36 306 36.7Z',
];

/**
 * "This week's twig": a branch in soil with seven leaves, Monday to Sunday, alternating above and
 * below; filled on a day studied, an empty outline otherwise (missed and later days look the same).
 * The right side is the streak in clay (engine/groveToday.ts twigStreak). The leaves are one image
 * with its words; the days studied are also said in "N study days this week".
 */
export function WeekTwig({ week, streak, spoken, studied }: { week: readonly TwigDay[]; streak: string; spoken: string; studied: string | null }) {
  const { c, g } = useTheme();
  return (
    <View testID="week-twig" style={[groveCard(c), { padding: space.lg, gap: space.sm }]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: space.md }}>
        <FieldText v="value" accessibilityRole="header">
          This week’s twig
        </FieldText>
        {streak ? (
          <T v="caption" color={c.clay}>
            {streak}
          </T>
        ) : null}
      </View>
      <View accessible accessibilityRole="image" accessibilityLabel={spoken} style={{ width: '100%', aspectRatio: 330 / 60 }}>
        <Svg width="100%" height="100%" viewBox="0 0 330 60">
          <Path d="M0 38Q165 28 330 38" fill="none" stroke={g.soil} strokeWidth={2} strokeLinecap="round" />
          {week.map((d) => (
            <Path key={d.i} d={TWIG_LEAVES[d.i]} fill={d.on ? c.accent : 'none'} stroke={d.on ? c.btn : g.leafEmpty} strokeWidth={1.3} />
          ))}
        </Svg>
      </View>
      <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {week.map((d) => (
          <View key={d.i} style={{ flex: 1, alignItems: 'center' }}>
            {d.today ? (
              <T v="tab" color={c.ink}>
                {TWIG_LETTERS[d.i]}
              </T>
            ) : (
              <FieldText v="tiny" color={c.muted}>
                {TWIG_LETTERS[d.i]}
              </FieldText>
            )}
          </View>
        ))}
      </View>
      {studied ? <T v="meta">{studied}</T> : null}
    </View>
  );
}
