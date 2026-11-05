/**
 * Grove Phase 4b, the drills kit (design-notes/grove/phase4b/PHASE4B.md section 6, "Twig merged with
 * Quiet Round"). The small parts every drill shares:
 *
 * - Twig: the round's progress in the header. One soil branch, one leaf per item: right = a filled
 *   accent leaf, missed = a solid `control` outline with its midrib and a small cross notch (never red),
 *   still to come = a dashed `control` outline, the item on screen = an ink outline. One screen-reader
 *   stop: "Question 2 of 5. 1 right, 0 to review." A newly right leaf fills as a stacked layer
 *   (opacity, scale 0.85 to 1, 160 ms, no overshoot); filled at once under Reduce Motion.
 * - TwigSquares: the fallback (numbered tick and cross squares, 30pt, `groveRadius.step`) at text scale
 *   1.3 and up, and the round's row of squares on the recap (forest inks there).
 * - StepSquares: a two-step game's steps, the engine's own words, the done step in ink with its result.
 * - LevelMarkers: Seedling, Sapling, Heartwood as three markers. Reached = a solid accent outline with a
 *   tick; current = a `btn` fill with an `onBtn` leaf; not reached = a dashed `control` outline. On the
 *   intro it is a radiogroup (the picked level shows the ink edge and an ink tick); on the recap (forest
 *   inks) and on Field notes it is one element read as "Level: Sapling. Heartwood not reached."
 * - FoldedBars: Call It First's options, folded until the principle is named.
 *
 * Plain English for the founder: these are drawings of things the screen also says in words. Nothing
 * here scores, saves or decides anything.
 */
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn as RFadeIn, FadeOut as RFadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';
import { GAME_TIER_NAME, GAME_TIERS, type GameTier } from '../engine/games/growth';
import { groveRadius, heroInk, mintInk } from '../theme/grove';
import { LARGE_TEXT, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { TierLeaf } from './glyphs';
import { Check, X } from './icons';
import { Pop, useMotion } from './motion';
import { T } from './ui';

// ── The twig ───────────────────────────────────────────────────────────

/** One finished item: right (the twig leaf fills) or missed (an outline with a notch). */
export type ItemResult = 'right' | 'missed';

/** Rounds longer than this show squares instead of the twig (Root or Rumor has 12, Canopy Call 10). */
export const TWIG_MAX = 8;
/** The fill of a newly right leaf (PHASE4B section 8): opacity and scale 0.85 to 1, no overshoot. */
export const TWIG_FILL_MS = 160;
/** The square's size and its gap (PHASE4B 6.3 item 3). */
export const SQUARE = 30;
const SQUARE_GAP = 6;

/** What the twig says: "Question 2 of 5. 1 right, 0 to review." */
export function twigSpoken(index: number, total: number, results: readonly ItemResult[]): string {
  const right = results.filter((r) => r === 'right').length;
  const missed = results.filter((r) => r === 'missed').length;
  return `Question ${Math.min(index + 1, total)} of ${total}. ${right} right, ${missed} to review.`;
}

/** How the header shows the round: the twig, squares under the header, or a counter (squares on the recap). */
export function twigMode(total: number, fontScale: number): 'twig' | 'squares' | 'counter' {
  if (total > TWIG_MAX) return 'counter';
  return fontScale >= LARGE_TEXT ? 'squares' : 'twig';
}

// A leaf in a 24 x 14 box: "up" grows up and right from the branch, "down" down and right.
const LEAF = {
  up: { d: 'M2 13C5 6 14 1.5 22 1.5C19 8 11 12.5 2 13Z', rib: 'M2 13L17 4.5', notch: ['M12.5 7.5L15.5 10.5', 'M15.5 7.5L12.5 10.5'] },
  down: { d: 'M2 1C5 8 14 12.5 22 12.5C19 6 11 1.5 2 1Z', rib: 'M2 1L17 9.5', notch: ['M12.5 6.5L15.5 3.5', 'M15.5 6.5L12.5 3.5'] },
} as const;

/** One twig leaf, drawn in its state. Decorative (the twig's one label says it). */
function TwigLeafArt({ dir, state, current }: { dir: 'up' | 'down'; state: ItemResult | 'todo'; current: boolean }) {
  const { c } = useTheme();
  const l = LEAF[dir];
  if (state === 'right') {
    return (
      <Svg width={24} height={14} viewBox="0 0 24 14">
        <Path d={l.d} fill={c.accent} stroke={c.accent} strokeWidth={1.2} strokeLinejoin="round" />
        <Path d={l.rib} stroke={c.bg} strokeWidth={1} strokeLinecap="round" />
      </Svg>
    );
  }
  if (state === 'missed') {
    return (
      <Svg width={24} height={14} viewBox="0 0 24 14">
        <Path d={l.d} fill="none" stroke={c.control} strokeWidth={1.4} strokeLinejoin="round" />
        <Path d={l.rib} stroke={c.control} strokeWidth={1.1} strokeLinecap="round" />
        {l.notch.map((n) => (
          <Path key={n} d={n} stroke={c.control} strokeWidth={1.3} strokeLinecap="round" />
        ))}
      </Svg>
    );
  }
  return (
    <Svg width={24} height={14} viewBox="0 0 24 14">
      <Path d={l.d} fill="none" stroke={current ? c.ink : c.control} strokeWidth={current ? 1.5 : 1.3} strokeDasharray={current ? undefined : '2.2 2'} strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * The right leaf's fill, as a layer over the outline: 160 ms of opacity and scale (0.85 to 1), no
 * overshoot. Only a leaf that turned right while on screen plays; one drawn right is simply there.
 */
function FillLayer({ play, children }: { play: boolean; children: React.ReactNode }) {
  const { reduced } = useMotion();
  const run = play && !reduced;
  const o = useSharedValue(run ? 0 : 1);
  const s = useSharedValue(run ? 0.85 : 1);
  useEffect(() => {
    if (!run) return;
    o.set(withTiming(1, { duration: TWIG_FILL_MS, reduceMotion: ReduceMotion.Never }));
    s.set(withTiming(1, { duration: TWIG_FILL_MS, reduceMotion: ReduceMotion.Never }));
  }, [run, o, s]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, anim]}>{children}</Animated.View>;
}

/**
 * The twig (PHASE4B 6.3 item 2). `results` holds one entry per finished item, in order; `index` is
 * the item on screen. Leaves alternate above and below one soil branch. One accessible element.
 */
export function Twig({ total, results, index }: { total: number; results: readonly ItemResult[]; index: number }) {
  const { g } = useTheme();
  // Only the leaf that turned right while on screen plays its fill (worked out while rendering, so the
  // frame that shows it right already has the fill layer at its start).
  const [prev, setPrev] = useState(results.length);
  const [fresh, setFresh] = useState(-1);
  if (prev !== results.length) {
    setPrev(results.length);
    setFresh(results.length > prev ? results.length - 1 : -1);
  }
  const cell = 36;
  return (
    <View
      testID="drill-twig"
      accessible
      accessibilityRole="image"
      accessibilityLabel={twigSpoken(index, total, results)}
      style={{ alignSelf: 'center', width: '100%', maxWidth: cell * total + 12, height: 32, justifyContent: 'center' }}
    >
      {/* The branch: soil, decorative (under 3:1; the leaves and the label carry the state). */}
      <Svg width="100%" height={32} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Line x1="0" y1="16" x2="100%" y2="16" stroke={g.soil} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      <View style={{ flexDirection: 'row', height: 32, paddingHorizontal: 6 }}>
        {Array.from({ length: total }, (_, i) => {
          const dir = i % 2 === 0 ? 'up' : 'down';
          const state: ItemResult | 'todo' = results[i] ?? 'todo';
          return (
            <View key={i} testID={`twig-leaf-${state}`} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ position: 'absolute', top: dir === 'up' ? 2 : 15, width: 24, height: 14 }}>
                {state === 'right' ? (
                  <>
                    {/* The outline it fills over, then the fill as a stacked layer. */}
                    <TwigLeafArt dir={dir} state="todo" current={false} />
                    <FillLayer play={i === fresh}>
                      <TwigLeafArt dir={dir} state="right" current={false} />
                    </FillLayer>
                  </>
                ) : (
                  <TwigLeafArt dir={dir} state={state} current={state !== 'missed' && i === index} />
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Numbered tick and cross squares (PHASE4B 6.3 item 3): right = a filled square with a tick, missed =
 * a solid outline with a cross, still to come = a dashed outline with its number, the item on screen
 * = an ink outline with its number. They wrap onto more rows, never sideways. `forest`: the recap's
 * inks (mint ticks, `dotEdge` cross outlines). Decorative unless `spoken` is given.
 */
export function TwigSquares({ total, results, index = -1, forest, spoken, testID = 'drill-squares' }: { total: number; results: readonly ItemResult[]; index?: number; forest?: boolean; spoken?: string; testID?: string }) {
  const { c } = useTheme();
  const tick = forest ? c.sap : c.accent;
  const onTick = forest ? mintInk : c.bg;
  const edge = forest ? heroInk.dark.dotEdge : c.control;
  const later = forest ? c.onForest2 : c.muted;
  return (
    <View
      testID={testID}
      accessible={Boolean(spoken)}
      accessibilityRole={spoken ? 'image' : undefined}
      accessibilityLabel={spoken}
      importantForAccessibility={spoken ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!spoken}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SQUARE_GAP }}
    >
      {Array.from({ length: total }, (_, i) => {
        const r = results[i];
        const box = { width: SQUARE, height: SQUARE, borderRadius: groveRadius.step, alignItems: 'center' as const, justifyContent: 'center' as const };
        if (r === 'right') {
          return (
            <View key={i} testID="square-right" style={[box, { backgroundColor: tick }]}>
              <Check size={16} color={onTick} strokeWidth={2.5} />
            </View>
          );
        }
        if (r === 'missed') {
          return (
            <View key={i} testID="square-missed" style={[box, { borderWidth: 1.5, borderColor: edge }]}>
              <X size={14} color={edge} strokeWidth={2.25} />
            </View>
          );
        }
        const current = i === index;
        return (
          <View key={i} testID="square-todo" style={[box, { borderWidth: 1.5, borderColor: current ? (forest ? c.onForest : c.ink) : edge, borderStyle: current ? 'solid' : 'dashed' }]}>
            <T v="caption" num color={current ? (forest ? c.onForest : c.ink) : later} maxFontSizeMultiplier={1.3}>
              {String(i + 1)}
            </T>
          </View>
        );
      })}
    </View>
  );
}

// ── Step squares (two-step games) ──────────────────────────────────────

export interface DrillStep {
  /** The engine's own words, word for word ("Step 1: tap the snare"). */
  label: string;
  state: 'now' | 'done' | 'later';
  /** A done step's result ("You marked D"). */
  result?: string;
}

/** What one step says: "Step 1: tap the snare. Done. You marked D." (no extra stop after a question mark). */
export function stepSpoken(s: DrillStep): string {
  const end = (t: string) => (/[.?!]$/.test(t) ? t : `${t}.`);
  return s.state === 'done' ? `${end(s.label)} Done.${s.result ? ` ${end(s.result)}` : ''}` : end(s.label);
}

/**
 * The steps of a two-step game (PHASE4B 6.3 item 5): a 30pt square per step (the step on screen a
 * `btn` fill, a done step the ink done state with a tick, a later step a dashed outline), its words
 * beside it, and a done step's result under them. Never accent green before the reveal. Each step is
 * one stop ("Step 1: tap the snare. Done. You marked D."); the step on screen is a heading.
 */
export function StepSquares({ steps }: { steps: readonly DrillStep[] }) {
  const { c } = useTheme();
  return (
    <View testID="step-squares" style={{ gap: space.sm, marginBottom: space.lg }}>
      {steps.map((s, i) => {
        const box = { width: SQUARE, height: SQUARE, borderRadius: groveRadius.step, alignItems: 'center' as const, justifyContent: 'center' as const };
        const square =
          s.state === 'done' ? (
            <View style={[box, { backgroundColor: c.ink }]}>
              <Check size={16} color={c.bg} strokeWidth={2.5} />
            </View>
          ) : s.state === 'now' ? (
            <View style={[box, { backgroundColor: c.btn }]}>
              <T v="label" num color={c.onBtn} maxFontSizeMultiplier={1.3}>{String(i + 1)}</T>
            </View>
          ) : (
            <View style={[box, { borderWidth: 1.5, borderColor: c.control, borderStyle: 'dashed' }]}>
              <T v="label" num color={c.muted} maxFontSizeMultiplier={1.3}>{String(i + 1)}</T>
            </View>
          );
        return (
          <View
            key={s.label}
            testID={`step-${s.state}`}
            accessible
            accessibilityRole={s.state === 'now' ? 'header' : undefined}
            accessibilityLabel={stepSpoken(s)}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}
          >
            {square}
            <View style={{ flex: 1, minHeight: SQUARE, justifyContent: 'center' }}>
              <T v="label" color={s.state === 'later' ? c.ink2 : c.ink}>{s.label}</T>
              {s.state === 'done' && s.result ? <T v="meta">{s.result}</T> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── The level markers ──────────────────────────────────────────────────

/** "Level: Sapling. Heartwood not reached." (one stop on the recap and on Field notes). */
export function levelSpoken(level: GameTier): string {
  const later = GAME_TIERS.slice(GAME_TIERS.indexOf(level) + 1).map((t) => GAME_TIER_NAME[t]);
  return `Level: ${GAME_TIER_NAME[level]}.${later.length ? ` ${later.join(' and ')} not reached.` : ''}`;
}

const MARK = 36;

/** One marker's drawing for a level, against the learner's own level. Decorative. */
function Marker({ tier, level, forest, small }: { tier: GameTier; level: GameTier; forest?: boolean; small?: boolean }) {
  const { c } = useTheme();
  const size = small ? 28 : MARK;
  const at = GAME_TIERS.indexOf(tier) - GAME_TIERS.indexOf(level);
  const box = { width: size, height: size, borderRadius: size / 2, alignItems: 'center' as const, justifyContent: 'center' as const };
  if (at < 0) {
    // Reached: a solid outline with a tick (accent; mint on the forest).
    const ink = forest ? c.sap : c.accent;
    return (
      <View testID={`marker-reached-${tier}`} style={[box, { borderWidth: 2, borderColor: ink }]}>
        <Check size={small ? 14 : 16} color={ink} strokeWidth={2.5} />
      </View>
    );
  }
  if (at === 0) {
    // Current: filled (btn on paper, forest in light and mint in dark; mint on the forest), with its leaf.
    const fill = forest ? c.sap : c.btn;
    const leaf = forest ? c.forest : c.onBtn;
    return (
      <View testID={`marker-current-${tier}`} style={[box, { backgroundColor: fill }]}>
        <TierLeaf tier={tier} color={leaf} rib={fill} size={small ? 15 : 18} />
      </View>
    );
  }
  // Not reached: a dashed outline (control; the hero's leaf line on the forest).
  return <View testID={`marker-later-${tier}`} style={[box, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: forest ? heroInk.dark.dotEdge : c.control }]} />;
}

/**
 * The marker for one level, which cross-fades when it changes state (the recap's level-up: only this
 * marker moves, the two drawings swap over 160 ms and the new leaf springs with `leaf`). Under Reduce
 * Motion, or when `play` is false, it simply shows its state.
 */
function MarkerSwap({ tier, level, forest, small, play }: { tier: GameTier; level: GameTier; forest?: boolean; small?: boolean; play: boolean }) {
  const { reduced } = useMotion();
  const at = Math.sign(GAME_TIERS.indexOf(tier) - GAME_TIERS.indexOf(level));
  const [first] = useState(at);
  const animate = play && !reduced && at !== first;
  const size = small ? 28 : MARK;
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        key={at}
        entering={animate ? RFadeIn.duration(TWIG_FILL_MS).reduceMotion(ReduceMotion.Never) : undefined}
        exiting={play && !reduced ? RFadeOut.duration(TWIG_FILL_MS).reduceMotion(ReduceMotion.Never) : undefined}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {animate && at === 0 ? (
          <Pop mount from={0.6} spring="leaf">
            <Marker tier={tier} level={level} forest={forest} small={small} />
          </Pop>
        ) : (
          <Marker tier={tier} level={level} forest={forest} small={small} />
        )}
      </Animated.View>
    </View>
  );
}

/**
 * The three markers (PHASE4B 6.2). `onPick` makes them the intro's radiogroup: each a 48pt+ radio
 * tile with its name in `caption`, the picked one with a 2pt ink edge and an ink tick before its name
 * (the F9 look), spoken "Sapling, your level. Decoys from nearby ideas." Without `onPick` they are one
 * element read as "Level: Sapling. Heartwood not reached." (`forest` for the recap's band, `small` for
 * a Field notes row). `play`: the recap's level-up may cross-fade the marker that changed.
 */
export function LevelMarkers({
  level,
  picked,
  onPick,
  lines,
  labels,
  yours = true,
  forest,
  small,
  play = false,
  decorative = false,
  testID = 'level-markers',
}: {
  /** Inside a row that already says the level (Field notes): drawn only, not a stop of its own. */
  decorative?: boolean;
  /** The learner's own level (current); lower levels are reached, higher ones not reached. */
  level: GameTier;
  /** The intro: the level the round will be played at. */
  picked?: GameTier;
  onPick?: (t: GameTier) => void;
  /** Each level's line (the game's own words), spoken with its radio. */
  lines?: Partial<Record<GameTier, string>>;
  /** Each radio's whole spoken label instead (Daylight: "Seedling, 120 seconds a question, suggested"). */
  labels?: Partial<Record<GameTier, string>>;
  /** False before the learner has a level for this game (Daylight's first light): no "your level". */
  yours?: boolean;
  forest?: boolean;
  small?: boolean;
  play?: boolean;
  testID?: string;
}) {
  const { c } = useTheme();
  if (onPick) {
    return (
      <View testID={testID} accessibilityRole="radiogroup" accessibilityLabel="Pick your level" style={{ flexDirection: 'row', gap: space.sm }}>
        {GAME_TIERS.map((t) => {
          const on = picked === t;
          return (
            <Pressable
              key={t}
              testID={`level-${t}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={labels?.[t] ?? `${GAME_TIER_NAME[t]}${yours && t === level ? ', your level' : ''}${lines?.[t] ? `. ${lines[t]}` : ''}`}
              onPress={() => onPick(t)}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: 0,
                minHeight: 48,
                borderRadius: groveRadius.tile,
                backgroundColor: c.raised,
                borderWidth: 1,
                borderColor: c.line,
                paddingVertical: space.md,
                paddingHorizontal: space.xs,
                alignItems: 'center',
                gap: space.sm,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              {/* The picked tile's 2pt ink edge sits inside the box (F9); focus draws outside it. */}
              {on ? <View pointerEvents="none" style={{ position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderRadius: groveRadius.tile, borderWidth: 2, borderColor: c.ink }} /> : null}
              <Marker tier={t} level={level} />
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
                {on ? <Check size={12} color={c.ink} strokeWidth={2.75} /> : null}
                <T v="caption" center color={c.ink}>{GAME_TIER_NAME[t]}</T>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }
  const name = forest ? c.onForest : c.ink;
  return (
    <View testID={testID} accessible={!decorative} accessibilityRole={decorative ? undefined : 'image'} accessibilityLabel={decorative ? undefined : levelSpoken(level)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: small ? space.md : space.lg, justifyContent: small ? 'flex-start' : 'center' }}>
      {GAME_TIERS.map((t) => (
        <View key={t} style={{ alignItems: 'center', gap: space.xs, minWidth: small ? 0 : 72 }}>
          <MarkerSwap tier={t} level={level} forest={forest} small={small} play={play} />
          {small ? null : <T v="caption" center color={name}>{GAME_TIER_NAME[t]}</T>}
        </View>
      ))}
    </View>
  );
}

// ── Call It First: the folded options ──────────────────────────────────

/**
 * Call It First, step 1 (PHASE4B 6.3 item 8): the options drawn as folded bars (`soft`, 16pt, not
 * pressable) under the principle cards, with the line that says when they open. One group for screen
 * readers: "Options hidden until you name the principle".
 */
export function FoldedBars({ count }: { count: number }) {
  const { c } = useTheme();
  return (
    <View testID="folded-options" accessible accessibilityLabel="Options hidden until you name the principle" style={{ marginTop: space.lg, gap: space.sm }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ height: 16, borderRadius: groveRadius.step, backgroundColor: c.soft }} />
      ))}
      <T v="meta" style={{ marginTop: space.xs }}>The options open once you name the principle.</T>
    </View>
  );
}

// ── Seedling hint (Snare Spotter) ──────────────────────────────────────

/** The one written hint (PHASE4B 6.3 item 6): Snare Spotter's, at Seedling, for its first two rounds. */
export const SNARE_HINT = 'A snare is a wrong option built to look right.';
/** How many rounds the hint shows for. */
export const HINT_ROUNDS = 2;

/** Show the Seedling hint this round? `played`: rounds already finished (saved history). */
export function seedlingHintDue(level: GameTier, played: number): boolean {
  return level === 'seedling' && played < HINT_ROUNDS;
}
