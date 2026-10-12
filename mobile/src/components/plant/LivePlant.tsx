/**
 * <LivePlant>: the plant with its motion (mobile 1.14, Phase 4b; motion.md
 * §5, M7 and M8). Same drawing as <Plant>, split into three layers:
 *
 *   back  (dusk, the dawn, the ground, a keepsake behind)   never moves
 *   plant (the tree: body, face, visitor)                    moves
 *   front (the pot's rim, grass, the keepsakes beside it)   never moves
 *
 * Only the plant layer's WRAPPER moves: one Animated.View, transform and
 * opacity only, pivoting on the plant's base. The SVG inside is built once
 * per species, growth, look and theme (components/plant/art.ts caches the
 * part tree; this file caches the elements), so no path is ever rebuilt
 * per frame. Kind to a low-end Android phone.
 *
 * The moves:
 * - breathe: the Breathe idle burst, one slow breath (in 2 s, out 2.4 s,
 *   swaying a little either side of upright) the first time a surface comes
 *   into view in an app session, then still. You and Your plant only. Never
 *   a loop. It waits for a reaction (and, on You, for the rings) to finish.
 * - reaction: a mood's one reaction (happy stretches up from its base,
 *   curious leans and looks, proud stands tall), once per occasion per app
 *   session, charged to the session's decorative budget
 *   (components/motion.tsx claimDecor). Never during, or on the same visit
 *   as, the growth sequence: the growth IS that day's proud moment.
 * - growth: the growth sequence (≤ 900 ms): the old growth swells a little
 *   and fades as the new one settles in. Driven by a useCelebration moment,
 *   so it keeps the one-moment-per-session rule; any tap ends it.
 * - plantIn: onboarding's planting (M8): the seed settles into the soil and
 *   its first sprout pops up.
 *
 * Anything cut short (the screen loses focus, Reduce Motion turns on) snaps
 * back to the rest pose, so the plant is never left leaning or lifted.
 * While it moves, the moving layer is drawn as one cached bitmap (Android
 * renderToHardwareTextureAndroid, iOS shouldRasterizeIOS), so a low-end
 * phone never re-draws ~200 SVG shapes per frame.
 *
 * Reduce Motion: none of it moves. The plant shows its end state at once
 * (the face still shows the mood). Focus and the spoken label never depend
 * on any of this: the plant is one image stop from its first frame.
 */
import { useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { AppState, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import type { GrowthLevel, PlantSpecies } from '../../engine/plant';
import type { PlantMood } from '../../engine/plantLooks';
import { motion } from '../../theme/tokens';
import { claimDecor, useMotion, type Celebration } from '../motion';
import { buildPlant, liftGroup, lodFor, plantLayers, type ArtLook, type BuiltPlant, type GNode, type Lod, type Mood } from './art';
import { lookKeyOf, renderNode } from './Plant';

export interface LivePlantProps {
  species: PlantSpecies;
  stage: GrowthLevel;
  organs?: readonly number[];
  quietLook?: boolean;
  size: number;
  theme: 'light' | 'dark';
  resting?: boolean;
  mood?: PlantMood;
  look?: ArtLook;
  lod?: Lod;
  fit?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /**
   * The Breathe idle burst, keyed by surface ("you", "plant"): it plays the
   * first time that surface comes into view in an app session (You and Your
   * plant only).
   */
  breathe?: string;
  /** Wait this long before breathing (You: until its rings have grown). */
  breatheDelay?: number;
  /** One reaction for this occasion (its id plays once per app session). */
  reaction?: { id: string; mood: PlantMood } | null;
  /** The growth sequence, from this growth to `stage`, run by a useCelebration moment. */
  growth?: { from: GrowthLevel; celebration: Celebration } | null;
  /** Onboarding: the seed settles and its first sprout pops (once, on mount after "Plant it"). */
  plantIn?: boolean;
}

// ── Reactions: once per occasion per app session ───────────────────────
// In memory on purpose: a relaunch the same day may react once more (accepted,
// DESIGN_SYSTEM §13; QA BUG-4 was decided "per app session").
const reacted = new Set<string>();
// Surfaces that already breathed this app session.
const breathed = new Set<string>();
/** Tests: forget which reactions and breaths played (a new app session). */
export function resetPlantReactionsForTest() {
  reacted.clear();
  breathed.clear();
}
/**
 * May this occasion's reaction play now? Records it (and spends `ms` of the
 * budget: curious' lean is longer than the others, code review M7a).
 */
export function claimReaction(id: string, ms: number = motion.plant.react): boolean {
  if (reacted.has(id)) return false;
  reacted.add(id);
  return claimDecor(ms);
}
/** This occasion's reaction is spent without playing (the growth sequence was the moment; code review M3). */
export function markReacted(id: string): void {
  reacted.add(id);
}
/** How long a mood's reaction runs. */
export const reactionMs = (mood: PlantMood) => (mood === 'curious' ? motion.plant.lean : motion.plant.react);

const breathEase = Easing.inOut(Easing.sin);
const outEase = Easing.out(Easing.cubic);
type Done = (finished?: boolean) => void;
const t = (to: number, duration: number, easing = outEase, done?: Done) => withTiming(to, { duration, easing, reduceMotion: ReduceMotion.Never }, done);

// One object per distinct look (by value), so a look built fresh each render never rebuilds the plant.
const LOOKS = new Map<string, ArtLook>();
function stableLook(look: ArtLook | undefined): ArtLook | undefined {
  if (!look) return undefined;
  const k = lookKeyOf(look);
  const hit = LOOKS.get(k);
  if (hit) return hit;
  if (LOOKS.size > 64) LOOKS.clear();
  LOOKS.set(k, look);
  return look;
}

// Built SVG element trees, cached per part tree (never rebuilt per frame or per re-render).
const ELEMENTS = new WeakMap<GNode, ReactNode>();
function elementsOf(n: GNode): ReactNode {
  let el = ELEMENTS.get(n);
  if (el === undefined) {
    el = renderNode(n, n.id ?? 'g');
    ELEMENTS.set(n, el);
  }
  return el;
}

/**
 * A transform origin in whole, non-negative pixels. React Native parses origin
 * strings with a regex that misreads decimals ("100.0px" becomes three values and
 * crashes the screen on a phone), so never pass it a decimal.
 */
export function originPx(x: number, y: number): string {
  return `${Math.max(0, Math.round(x))}px ${Math.max(0, Math.round(y))}px`;
}

/** The plant's base in view points, as a transform origin (it pivots there, like a real plant). */
export function baseOrigin(built: BuiltPlant, viewBox: string, size: number): string {
  const [x, y, w] = viewBox.split(' ').map(Number);
  const px = ((built.anchors.base.x - x) / w) * size;
  const py = ((built.anchors.base.y - y) / w) * size;
  return originPx(px, py);
}

function Layer({ node, size, viewBox, style }: { node: GNode; size: number; viewBox: string; style?: StyleProp<ViewStyle> }): ReactElement {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size} viewBox={viewBox}>
        {elementsOf(node)}
      </Svg>
    </View>
  );
}

function LivePlantInner(p: LivePlantProps) {
  const { species, stage, organs, quietLook, size, theme, resting, mood, look, lod, fit, accessibilityLabel, style, testID, breathe, breatheDelay = 0, reaction, growth, plantIn } = p;
  const { reduced } = useMotion();
  const level = lod ?? lodFor(size);
  const organKey = organs ? organs.map((v) => Math.round(v * 40) / 40).join(',') : '';
  const artMood = (mood ?? 'idle') as Mood;
  // `look` compares by value: an equal look built fresh is the same object here, so nothing rebuilds.
  const sameLook = stableLook(look);
  const opts = useMemo(
    () => ({ species, organs: organKey ? organKey.split(',').map(Number) : undefined, quietLook, lod: level, theme, resting, mood: artMood, look: sameLook }),
    [species, organKey, quietLook, level, theme, resting, artMood, sameLook],
  );
  const built = useMemo(() => buildPlant({ ...opts, stage }), [opts, stage]);
  const viewBox = (fit ?? size <= 96) ? built.frame : '0 0 200 200';
  const layers = plantLayers(built.root);
  // Onboarding: the first sprout pops on its own layer.
  // A seed's curled tip, or (an existing learner's study back-filled it) the Sprout's two leaves.
  const lifted = useMemo(() => (plantIn ? (liftGroup(layers.plant, 'sprout') ?? liftGroup(layers.plant, 'leaves')) : null), [plantIn, layers.plant]);
  const origin = baseOrigin(built, viewBox, size);

  // ── The plant layer's motion (one wrapper; transform and opacity only) ─
  const breath = useSharedValue(0); // 0 → 1 → 0: one breath
  const sway = useSharedValue(0); // 0 → 1 → −1 → 0: a little either side of upright
  const react = useSharedValue(0); // 0 → 1 → 0
  const settle = useSharedValue(plantIn && !reduced ? 0 : 1); // the onboarding seed: 0 above the soil → 1 settled
  const pop = useSharedValue(plantIn && !reduced ? 0 : 1); // the onboarding sprout
  const grow = useSharedValue(1); // 0 = the old growth showing → 1 = the new one settled
  const kind = reaction?.mood ?? 'idle';
  // The breath's depth: about 2pt at any size, never under 1.6% (UX review P6).
  const amp = Math.max(0.016, 2 / size);

  // Code review M8a: while anything moves, the moving layer is one cached
  // bitmap. Each move counts itself in and out (its last step's callback).
  const [moving, setMoving] = useState(false);
  const moves = useRef(0);
  const moveStarts = useCallback(() => {
    moves.current += 1;
    setMoving(true);
  }, []);
  const moveEnds = useCallback(() => {
    moves.current = Math.max(0, moves.current - 1);
    if (moves.current === 0) setMoving(false);
  }, []);
  const ended: Done = () => {
    'worklet';
    runOnJS(moveEnds)();
  };

  const plantStyle = useAnimatedStyle(() => {
    const b = breath.value;
    const w = sway.value;
    const r = react.value;
    const g = grow.value;
    const s = settle.value;
    // The new growth settles from 0.94 (g 0.33 → 1) and is fully there by 0.45 (UX review P4).
    const gIn = Math.min(1, Math.max(0, (g - 0.33) / 0.67));
    return {
      opacity: Math.min(1, s * 1.6) * (g < 1 ? Math.min(1, Math.max(0, (g - 0.33) / 0.12)) : 1),
      transform: [
        // Happy stretches up from its base (no hop: the plant stays rooted, UX review P5).
        { translateY: (1 - s) * -14 },
        { rotate: `${(kind === 'curious' ? -3 * r : 0) + 0.7 * w}deg` },
        { scaleX: (1 + (amp / 2) * b) * (kind === 'happy' ? 1 - 0.012 * r : 1) * (g < 1 ? 0.94 + 0.06 * gIn : 1) },
        { scaleY: (1 + amp * b) * (kind === 'proud' ? 1 + 0.04 * r : kind === 'happy' ? 1 + 0.035 * r : 1) * (g < 1 ? 0.94 + 0.06 * gIn : 1) },
      ],
    };
  });
  const oldStyle = useAnimatedStyle(() => {
    const g = grow.value;
    // The old growth swells to 1.04, then fades out (g 0.40 → 0.66), under the new one fading in.
    const sw = Math.min(1, g / 0.39);
    return { opacity: g >= 1 ? 0 : 1 - Math.min(1, Math.max(0, (g - 0.4) / 0.26)), transform: [{ scale: 1 + 0.04 * sw }] };
  });
  const sproutStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 2), transform: [{ scale: 0.3 + 0.7 * pop.value }] }));

  // A reaction: once per occasion per app session, within the budget. Never
  // with the growth sequence (code review M3, UX review H4): that occasion is
  // spent without playing. Anything that stops it puts the plant back at rest.
  const reactionId = reaction?.id;
  const growing = !!growth;
  // When the reaction now playing ends (epoch ms), so the breath can wait for it.
  const reactingUntil = useRef(0);
  useEffect(() => {
    if (!reactionId || reduced || kind === 'idle' || kind === 'resting') {
      react.set(0);
      return;
    }
    if (growing) {
      markReacted(reactionId);
      react.set(0);
      return;
    }
    const R = reactionMs(kind);
    if (!claimReaction(reactionId, R)) {
      react.set(0);
      return;
    }
    reactingUntil.current = Date.now() + R;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- rasterise while the UI-thread animation runs (M8a)
    moveStarts();
    react.set(
      kind === 'curious'
        ? withSequence(t(1, R * 0.27), withDelay(R * 0.4, t(0, R * 0.33, outEase, ended)))
        : withSequence(t(1, R * 0.3), t(0, R * 0.7, outEase, ended)),
    );
    return () => {
      cancelAnimation(react);
      react.set(0);
    };
    // `ended` and the counters are stable for the component's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reactionId, kind, reduced, react, growing]);

  // The Breathe burst: once per surface per app session, on focus, after
  // any reaction; stopped (and back at rest) when the screen goes out of
  // view or the app goes to the background.
  useFocusEffect(
    useCallback(() => {
      if (!breathe || reduced || breathed.has(breathe)) return;
      breathed.add(breathe);
      // The reaction effect runs first in the same commit, so a reaction that just started is known here.
      const wait = Math.max(breatheDelay, reactingUntil.current - Date.now(), 0);
      const { breath: B, breathOut: O, breaths: n } = motion.plant;
      moveStarts();
      const inOut = Array.from({ length: n }, (_, i) => [t(1, B, breathEase), t(0, O, breathEase, i === n - 1 ? ended : undefined)]).flat();
      const side = Array.from({ length: n }, () => [t(1, B, breathEase), t(-1, O * 0.6, breathEase), t(0, O * 0.4, breathEase)]).flat();
      breath.set(withDelay(wait, withSequence(...inOut)));
      sway.set(withDelay(wait, withSequence(...side)));
      const rest = () => {
        cancelAnimation(breath);
        cancelAnimation(sway);
        breath.set(0);
        sway.set(0);
      };
      const sub = AppState.addEventListener('change', (st) => {
        if (st !== 'active') rest();
      });
      return () => {
        sub.remove();
        rest();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [breathe, reduced, breath, sway, breatheDelay]),
  );

  // The growth sequence (full form only; short and static show the new growth, the frame cross-fades it).
  const gc = growth?.celebration;
  const full = !!growth && !!gc && gc.mode === 'full' && !gc.settled && !reduced;
  useLayoutEffect(() => {
    if (!full) {
      grow.set(1);
      return;
    }
    grow.set(0);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- rasterise while the UI-thread animation runs (M8a)
    moveStarts();
    // Linear: the styles above shape each phase (swell 0–350 ms, cross-fade 300–600, settle to 900).
    grow.set(t(1, motion.plant.grow, Easing.linear, ended));
    return () => {
      cancelAnimation(grow);
      grow.set(1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, gc?.run, grow]);

  // Onboarding: the seed settles (after the page has arrived), then the sprout pops.
  useEffect(() => {
    if (!plantIn || reduced) {
      settle.set(1);
      pop.set(1);
      return;
    }
    const P = motion.plant.plantIn;
    const D = motion.dur.screen;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- rasterise while the UI-thread animation runs (M8a)
    moveStarts();
    settle.set(withDelay(D, t(1, P * 0.5)));
    pop.set(withDelay(D + P * 0.55, t(1, P * 0.45, outEase, ended)));
    return () => {
      cancelAnimation(settle);
      cancelAnimation(pop);
      settle.set(1);
      pop.set(1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantIn, reduced, settle, pop]);

  const old = useMemo(() => (full && growth ? buildPlant({ ...opts, stage: growth.from, mood: 'idle' }) : null), [full, growth, opts]);
  const labelled = !!accessibilityLabel;
  const crown = built.anchors.crown ?? built.anchors.base;
  const [vx, vy, vw] = viewBox.split(' ').map(Number);
  const sproutOrigin = originPx(((crown.x - vx) / vw) * size, ((crown.y + 8 - vy) / vw) * size);
  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={labelled}
      accessibilityRole={labelled ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!labelled}
      importantForAccessibility={labelled ? 'yes' : 'no-hide-descendants'}
      accessibilityIgnoresInvertColors
      testID={testID}
    >
      {old ? (
        // The old growth, whole (its ground is a size smaller), swelling then fading.
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: baseOrigin(old, viewBox, size) }, oldStyle]}>
          <Svg width={size} height={size} viewBox={viewBox}>
            {elementsOf(old.root)}
          </Svg>
        </Animated.View>
      ) : null}
      <Layer node={layers.back} size={size} viewBox={viewBox} />
      <Animated.View
        pointerEvents="none"
        renderToHardwareTextureAndroid={moving}
        shouldRasterizeIOS={moving}
        style={[StyleSheet.absoluteFill, { transformOrigin: origin }, plantStyle]}
      >
        <Svg width={size} height={size} viewBox={viewBox}>
          {elementsOf(lifted ? (lifted.rest as GNode) : layers.plant)}
        </Svg>
      </Animated.View>
      <Layer node={layers.front} size={size} viewBox={viewBox} />
      {lifted ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: sproutOrigin }, sproutStyle]}>
          <Svg width={size} height={size} viewBox={viewBox}>
            {elementsOf(lifted.part)}
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** The plant with its motion. Memoised: a parent's re-render never rebuilds it. */
export const LivePlant = memo(LivePlantInner);
