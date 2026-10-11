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
 * - breathe: the Breathe idle burst, two slow breaths (≤ 5 s) when the
 *   screen comes into view, then still. You and Your plant only. Never a loop.
 * - reaction: a mood's one reaction (happy hops, curious leans, proud
 *   stretches), once per occasion per app session, charged to the
 *   session's decorative budget (components/motion.tsx claimDecor).
 * - growth: the growth sequence (≤ 900 ms): the old growth swells a little
 *   and fades as the new one settles in. Driven by a useCelebration moment,
 *   so it keeps the one-moment-per-session rule; any tap ends it.
 * - plantIn: onboarding's planting (M8): the seed settles into the soil and
 *   its first sprout pops up.
 *
 * Reduce Motion: none of it moves. The plant shows its end state at once
 * (the face still shows the mood). Focus and the spoken label never depend
 * on any of this: the plant is one image stop from its first frame.
 */
import { useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, type ReactElement, type ReactNode } from 'react';
import { AppState, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
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
  /** The Breathe idle burst when the screen comes into view (You and Your plant only). */
  breathe?: boolean;
  /** One reaction for this occasion (its id plays once per app session). */
  reaction?: { id: string; mood: PlantMood } | null;
  /** The growth sequence, from this growth to `stage`, run by a useCelebration moment. */
  growth?: { from: GrowthLevel; celebration: Celebration } | null;
  /** Onboarding: the seed settles and its first sprout pops (once, on mount after "Plant it"). */
  plantIn?: boolean;
}

// ── Reactions: once per occasion per app session ───────────────────────
const reacted = new Set<string>();
/** Tests: forget which reactions played (a new app session). */
export function resetPlantReactionsForTest() {
  reacted.clear();
}
/** May this occasion's reaction play now? Records it (and spends the budget) when it may. */
export function claimReaction(id: string): boolean {
  if (reacted.has(id)) return false;
  reacted.add(id);
  return claimDecor(motion.plant.react);
}

const breathEase = Easing.inOut(Easing.sin);
const outEase = Easing.out(Easing.cubic);
const t = (to: number, duration: number, easing = outEase) => withTiming(to, { duration, easing, reduceMotion: ReduceMotion.Never });

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

/** The plant's base in view points, as a transform origin (it pivots there, like a real plant). */
function baseOrigin(built: BuiltPlant, viewBox: string, size: number): string {
  const [x, y, w] = viewBox.split(' ').map(Number);
  const px = ((built.anchors.base.x - x) / w) * size;
  const py = ((built.anchors.base.y - y) / w) * size;
  return `${px.toFixed(1)}px ${py.toFixed(1)}px`;
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
  const { species, stage, organs, quietLook, size, theme, resting, mood, look, lod, fit, accessibilityLabel, style, testID, breathe, reaction, growth, plantIn } = p;
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
  const lifted = useMemo(() => (plantIn ? liftGroup(layers.plant, 'sprout') : null), [plantIn, layers.plant]);
  const origin = baseOrigin(built, viewBox, size);

  // ── The plant layer's motion (one wrapper; transform and opacity only) ─
  const breath = useSharedValue(0); // 0 → 1 → 0, twice
  const react = useSharedValue(0); // 0 → 1 → 0
  const settle = useSharedValue(plantIn && !reduced ? 0 : 1); // the onboarding seed: 0 above the soil → 1 settled
  const pop = useSharedValue(plantIn && !reduced ? 0 : 1); // the onboarding sprout
  const grow = useSharedValue(1); // 0 = the old growth showing → 1 = the new one settled
  const kind = reaction?.mood ?? 'idle';

  const plantStyle = useAnimatedStyle(() => {
    const b = breath.value;
    const r = react.value;
    const g = grow.value;
    const s = settle.value;
    // The new growth settles from 0.94 as the old fades (g 0.33 → 1).
    const gIn = Math.min(1, Math.max(0, (g - 0.33) / 0.67));
    return {
      opacity: Math.min(1, s * 1.6) * (g < 1 ? Math.min(1, Math.max(0, (g - 0.33) / 0.33)) : 1),
      transform: [
        { translateY: (1 - s) * -14 + (kind === 'happy' ? -6 * r : 0) },
        { rotate: `${(kind === 'curious' ? -3 * r : 0) + 0.7 * b}deg` },
        { scaleX: (1 + 0.008 * b) * (kind === 'happy' ? 1 + 0.015 * r : 1) * (g < 1 ? 0.94 + 0.06 * gIn : 1) },
        { scaleY: (1 + 0.016 * b) * (kind === 'proud' ? 1 + 0.04 * r : kind === 'happy' ? 1 + 0.015 * r : 1) * (g < 1 ? 0.94 + 0.06 * gIn : 1) },
      ],
    };
  });
  const oldStyle = useAnimatedStyle(() => {
    const g = grow.value;
    // The old growth swells to 1.04, then fades (g 0.33 → 0.66).
    const sw = Math.min(1, g / 0.39);
    return { opacity: g >= 1 ? 0 : 1 - Math.min(1, Math.max(0, (g - 0.33) / 0.33)), transform: [{ scale: 1 + 0.04 * sw }] };
  });
  const sproutStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 2), transform: [{ scale: 0.3 + 0.7 * pop.value }] }));

  // The Breathe burst: on focus, two breaths, then still; stopped when the
  // screen goes out of view or the app goes to the background.
  useFocusEffect(
    useCallback(() => {
      if (!breathe || reduced) return;
      const B = motion.plant.breath;
      const steps = Array.from({ length: motion.plant.breaths }, () => [t(1, B, breathEase), t(0, B, breathEase)]).flat();
      breath.set(withSequence(...steps));
      const sub = AppState.addEventListener('change', (st) => {
        if (st !== 'active') {
          cancelAnimation(breath);
          breath.set(0);
        }
      });
      return () => {
        sub.remove();
        cancelAnimation(breath);
        breath.set(0);
      };
    }, [breathe, reduced, breath]),
  );

  // A reaction: once per occasion per app session, within the budget.
  const reactionId = reaction?.id;
  useEffect(() => {
    if (!reactionId || reduced || kind === 'idle' || kind === 'resting') return;
    if (!claimReaction(reactionId)) return;
    const R = motion.plant.react;
    react.set(kind === 'curious' ? withSequence(t(1, R * 0.4), withDelay(R * 0.6, t(0, R * 0.5))) : withSequence(t(1, R * 0.3), t(0, R * 0.7)));
    return () => cancelAnimation(react);
  }, [reactionId, kind, reduced, react]);

  // The growth sequence (full form only; short and static show the new growth, the frame cross-fades it).
  const gc = growth?.celebration;
  const full = !!growth && !!gc && gc.mode === 'full' && !gc.settled && !reduced;
  useLayoutEffect(() => {
    if (!full) {
      grow.set(1);
      return;
    }
    grow.set(0);
    grow.set(t(1, motion.plant.grow));
    return () => cancelAnimation(grow);
  }, [full, gc?.run, grow]);

  // Onboarding: the seed settles, then the sprout pops.
  useEffect(() => {
    if (!plantIn || reduced) {
      settle.set(1);
      pop.set(1);
      return;
    }
    const P = motion.plant.plantIn;
    settle.set(t(1, P * 0.5));
    pop.set(withDelay(P * 0.55, t(1, P * 0.45)));
    return () => {
      cancelAnimation(settle);
      cancelAnimation(pop);
    };
  }, [plantIn, reduced, settle, pop]);

  const old = useMemo(() => (full && growth ? buildPlant({ ...opts, stage: growth.from, mood: 'idle' }) : null), [full, growth, opts]);
  const labelled = !!accessibilityLabel;
  const crown = built.anchors.crown ?? built.anchors.base;
  const [vx, vy, vw] = viewBox.split(' ').map(Number);
  const sproutOrigin = `${(((crown.x - vx) / vw) * size).toFixed(1)}px ${(((crown.y + 8 - vy) / vw) * size).toFixed(1)}px`;
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
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: origin }, plantStyle]}>
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
