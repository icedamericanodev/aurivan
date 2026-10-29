/**
 * <FormReveal>: the calm moment a plant grows into a new FORM (mobile 1.50,
 * DESIGN_SYSTEM §8.10). Your plant only: never on Today's study list, a
 * question, a mock or a game. Once per form, ever (store/seen.ts plantForms).
 *
 * Plain English for the founder:
 * - It LEADS WITH THE LEARNING FACT ("You answered 10 or more questions in
 *   every domain…"), then names the form ("Kai grows into a new form: the
 *   Whip Oak."). Never "evolve", never readiness words beside the form.
 * - Full motion, about 1.2 s (engine/plantForms.ts revealTimeline): the old
 *   form at rest; a fine ink line rises from the soil to the crown, with the
 *   new form below it and the old above; the new form settles on its base
 *   (0.97 → 1); then the words fade in, with one success haptic.
 * - Reduce Motion (or the session's motion budget already spent): a 120 ms
 *   cross-fade, never a hard cut, and the words at once. The haptic stays.
 * - Transform and opacity only, on two static drawings (each built once), so
 *   no SVG path is rebuilt per frame. No sound, no particles, no confetti.
 * - The plant is ONE image stop with its spoken label from the first frame;
 *   the new form is announced once, after the motion (sayLater). Focus never
 *   moves.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { GrowthLevel, PlantSpecies } from '../../engine/plant';
import { revealMode, revealTimeline } from '../../engine/plantForms';
import { sayLater } from '../../lib/a11y';
import { haptic } from '../../lib/haptics';
import { motion, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { claimDecor, useMotion } from '../motion';
import { T } from '../ui';
import type { ArtLook } from './art';
import { Plant } from './Plant';

export interface FormRevealProps {
  species: PlantSpecies;
  /** The growth the old form is drawn at, and the plant's growth now (the new form). */
  from: GrowthLevel;
  to: GrowthLevel;
  organs?: readonly number[];
  look?: ArtLook;
  /** The old drawing's look: the same, without a Form IV choice (it had none yet). */
  fromLook?: ArtLook;
  theme: 'light' | 'dark';
  size: number;
  /** The plant's spoken label (it names the NEW form). */
  accessibilityLabel: string;
  /** What earned it, past tense (engine/plant.ts FORM_FACTS). Shown first. */
  fact: string;
  /** The form's name ("Whip Oak") and its look line. */
  name: string;
  lookLine: string;
  /** Said once after the motion: "Kai grows into a new form: the Whip Oak." */
  announce: string;
  /** The moment ended (played to the end, or shown at once). */
  onDone?: () => void;
  testID?: string;
}

export function FormReveal({ species, from, to, organs, look, fromLook, theme, size, accessibilityLabel, fact, name, lookLine, announce, onDone, testID }: FormRevealProps) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  // Decided once, on the first frame: a later Reduce Motion change can't restart it.
  const [mode] = useState(() => revealMode(reduced, () => claimDecor(motion.plant.turn)));
  const tl = revealTimeline(mode === 'reduced', motion.plant.turn, motion.plant.turnReduced);
  // The ink line's height above the stage's floor: from the soil (size) up past the crown (0).
  const lineY = useSharedValue(size);
  const lineOp = useSharedValue(mode === 'full' ? 1 : 0);
  const settle = useSharedValue(mode === 'full' ? 0.97 : 1);
  const fade = useSharedValue(mode === 'full' ? 1 : 0);
  const words = useSharedValue(mode === 'full' ? 0 : 1);
  const [done, setDone] = useState(false);
  const finished = useRef(false);
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    setDone(true);
    haptic.success();
    sayLater(announce);
    onDone?.();
  };

  useEffect(() => {
    if (mode === 'reduced') {
      // Old to new as a short cross-fade; the words are already there.
      fade.value = withTiming(1, { duration: tl.change }, (ok) => {
        if (ok) runOnJS(finish)();
      });
      return;
    }
    const ease = Easing.out(Easing.cubic);
    lineY.value = withDelay(tl.hold, withTiming(0, { duration: tl.change, easing: ease }));
    lineOp.value = withDelay(tl.hold + tl.change, withTiming(0, { duration: tl.settle }));
    settle.value = withDelay(tl.hold + tl.change, withTiming(1, { duration: tl.settle, easing: ease }));
    words.value = withDelay(tl.wordsAt, withTiming(1, { duration: tl.wordsIn }, (ok) => {
      if (ok) runOnJS(finish)();
    }));
    // Leaving mid-way counts as shown (store/seen.ts already says so); nothing to undo.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plays once, on mount
  }, []);

  // Old form: visible above the line. New form: below it (each a clipped window, transform only).
  // Reduce Motion: no windows, the two forms simply cross-fade in place.
  const full = mode === 'full';
  const oldOuter = useAnimatedStyle(() => ({ transform: [{ translateY: full ? lineY.value - size : 0 }], opacity: full ? 1 : 1 - fade.value }));
  const oldInner = useAnimatedStyle(() => ({ transform: [{ translateY: full ? size - lineY.value : 0 }] }));
  const newOuter = useAnimatedStyle(() => ({ transform: [{ translateY: full ? lineY.value : 0 }], opacity: full ? 1 : fade.value }));
  const newInner = useAnimatedStyle(() => ({ transform: [{ translateY: full ? -lineY.value : 0 }, { scale: settle.value }] }));
  const ink = useAnimatedStyle(() => ({ transform: [{ translateY: lineY.value }], opacity: lineOp.value }));
  const wordsStyle = useAnimatedStyle(() => ({ opacity: words.value }));

  return (
    <View testID={testID} style={{ alignItems: 'center' }}>
      <View
        style={[styles.stage, { width: size, height: size }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        accessibilityIgnoresInvertColors
        testID={testID ? `${testID}-${mode}` : undefined}
      >
        {!done ? (
          <Animated.View style={[StyleSheet.absoluteFill, styles.clip, oldOuter]} importantForAccessibility="no-hide-descendants">
            <Animated.View style={[StyleSheet.absoluteFill, oldInner]}>
              <Plant species={species} stage={from} organs={organs} size={size} fit={false} theme={theme} quietLook look={fromLook ?? look} />
            </Animated.View>
          </Animated.View>
        ) : null}
        <Animated.View style={[StyleSheet.absoluteFill, styles.clip, newOuter]} importantForAccessibility="no-hide-descendants">
          {/* The settle pivots on the plant's base (about 85% down the 200pt stage). */}
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: '50% 85%' }, newInner]}>
            <Plant species={species} stage={to} organs={organs} size={size} fit={false} theme={theme} quietLook look={look} />
          </Animated.View>
        </Animated.View>
        {mode === 'full' && !done ? <Animated.View pointerEvents="none" testID={testID ? `${testID}-ink` : undefined} style={[styles.ink, { backgroundColor: c.control }, ink]} /> : null}
      </View>
      {/* Full motion: the words are hidden from screen readers until they have faded in (UX review P5),
          so nobody hears text that isn't on screen yet; the one announcement (sayLater) still comes at the end. */}
      <Animated.View
        style={[{ marginTop: space.md, alignItems: 'center', gap: space.xs, paddingHorizontal: space.md }, wordsStyle]}
        testID={testID ? `${testID}-words` : undefined}
        accessibilityElementsHidden={full && !done}
        importantForAccessibility={full && !done ? 'no-hide-descendants' : 'auto'}
      >
        <T v="caption" center color={c.ink2}>A new form</T>
        <T v="body" center>{fact}</T>
        <T v="hero" center accessibilityRole="header">{`The ${name}`}</T>
        <T v="quote" center color={c.ink2}>{lookLine}</T>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { overflow: 'hidden' },
  clip: { overflow: 'hidden' },
  // A fine ink line (1.5pt), drawn just above the window's top edge. Its colour is `control` (≥3:1, UX review H1).
  ink: { position: 'absolute', left: 0, right: 0, top: -0.75, height: 1.5 },
});
