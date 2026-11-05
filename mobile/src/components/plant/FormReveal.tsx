/**
 * <FormReveal>: "The Turning", the moment a plant grows into a new FORM
 * (mobile 1.50, DESIGN_SYSTEM §8.10). Your plant only: never on Today's
 * study list, a question, a mock or a game. Once per form, ever
 * (store/seen.ts plantForms).
 *
 * Plain English for the founder:
 * - It LEADS WITH THE LEARNING FACT ("You answered 10 or more questions in
 *   every domain…"), on screen from the first frame. Never "evolve", never
 *   readiness words beside the form.
 * - Full motion (engine/turnTimeline.ts; 2.4 s, 3.0 s or 3.6 s by how far
 *   the plant came): the plant gathers warm light and inhales on its base;
 *   its old and new shapes take turns in it, in gold, at an even pace; the
 *   light lifts off and the new form settles; the species' own seeds or
 *   petals rise past it; at Form IV its ring draws itself once. Then the
 *   form's name ("The Whip Oak") settles in under the fact. One success
 *   haptic, when the new form appears (silent when haptics are off).
 * - A once-ever celebration (§8.9): it claims the session's one full
 *   moment. When that moment was already spent this session, the old form
 *   rests with the fact and one calm button, "See Kai's new form", that plays
 *   it in full when tapped (never wasted on a short fade).
 * - Any tap on it, a scroll drag (the screen calls `controlRef.skip`),
 *   leaving the app, or the screen reader's "activate" dissolves it to the
 *   end in 120 ms: never a hard cut, never a fast replay. Input is never
 *   blocked: it is not a modal.
 * - Reduce Motion, or a screen reader on (VoiceOver, TalkBack): a 120 ms
 *   cross-fade and every word at once, with no light and no motes, no waiting
 *   button, and the session's moment is never claimed. The haptic stays.
 * - Safe for people sensitive to flashing: at most 2.5 changes a second (the
 *   limit is 3), warm gold on paper, never white on dark.
 * - The plant is ONE image stop with the new form's label from the first
 *   frame; the words are hidden from screen readers until it ends; the new
 *   form is announced exactly once, at the end or on a skip (sayLater).
 *   Focus never moves (the waiting button hands focus to the plant when it goes).
 *
 * Grove Phase 4b (design-notes/grove/phase4b/PHASE4B.md 4.4), on paper:
 * - the fact is on screen from the first frame, ABOVE the art (small, secondary ink);
 * - the art stands centred on a soil line that runs the full width of the page;
 * - under it the label: a 1px rule drawn out from the plant side (nameAt to nameAt + 240 ms),
 *   "New form" and the form's name in `title` (nameAt + 100 to nameAt + 500 ms);
 * - `onName` fires at nameAt (or at the end, under Reduce Motion or a skip), so the screen fills
 *   the matching stem leaf then and never during the swaps;
 * - waiting: the solid button "See Kai's new form" with "It plays when you tap." under it;
 * - at Elder (`drift`), at most 8 leaves drift once down the art's own column after it ends
 *   (only when it played to its end; never after a skip).
 *
 * Performance: every layer is a static drawing built once (useMemo); React
 * never re-renders while it plays. One shared clock drives every style on
 * the UI thread; only transform and opacity change (plus the Form IV ring's
 * one strokeDashoffset). The plant layers are cached bitmaps while it plays
 * (renderToHardwareTextureAndroid / shouldRasterizeIOS).
 */
import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, runOnJS, useAnimatedProps, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { GrowthLevel, PlantSpecies } from '../../engine/plant';
import { revealMode, type RevealMode } from '../../engine/plantForms';
import {
  artGlowOp,
  clamp01,
  glowAt,
  haloDraw,
  newScale,
  newSilOp,
  newTreeOp,
  oldScale,
  oldSilOp,
  oldTreeOp,
  phases,
  propsMix,
  tierOf,
} from '../../engine/turnTimeline';
import { moveFocus, sayLater, screenReaderOn, watchScreenReader, whenScreenReaderKnown } from '../../lib/a11y';
import { haptic } from '../../lib/haptics';
import { motion, space, turnLook, turnTone } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { claimMoment, LeafFall, useMotion } from '../motion';
import { FieldText } from '../fieldguide';
import { Button, T } from '../ui';
import { buildPlant, lodFor, type ArtLook, type GNode, type PNode } from './art';
import { originPx } from './LivePlant';
import { renderNode } from './Plant';
import { TurnMotes } from './TurnMotes';
import { lightOf, sameLayer, silhouette, turnLayers } from './turnLayers';

export interface FormRevealHandle {
  /** Dissolve to the end now (a scroll drag on the screen around it). Nothing while it waits or has ended. */
  skip: () => void;
}

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
  /** The form's name ("Whip Oak"). */
  name: string;
  /** Said once at the end: "Kai grows into a new form: the Whip Oak." */
  announce: string;
  /** The waiting button's words (engine/plantForms.ts seeNewFormLabel): "See Kai's new form". */
  playLabel?: string;
  /** The moment ended (played to the end, skipped, or shown at once). */
  onDone?: () => void;
  /** Phase 4b: the form's name lands (nameAt in full motion; the end under Reduce Motion or a skip). */
  onName?: () => void;
  /** Phase 4b: draw the soil line under the art, across this many points either side of the stage (the page's gutter). */
  soilBleed?: number;
  /** Phase 4b (4.5): at Elder, a few leaves drift once down the art's column after it ends (never under Reduce Motion). */
  drift?: boolean;
  /** For the screen: `skip()` on a scroll drag. */
  controlRef?: RefObject<FormRevealHandle | null>;
  testID?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const linear = Easing.linear;
// Plain numbers for the worklets (never the whole token object on the UI thread).
const RISE = motion.rise;
const R = motion.plant.turnReduced;
const out = Easing.out(Easing.cubic);
/** Phase 4b label timings (PHASE4B 4.4): the rule 240 ms from nameAt; the name 400 ms from nameAt + 100. */
export const LABEL_RULE = 240;
export const LABEL_NAME_AFTER = 100;
export const LABEL_NAME = 400;
/** The label rule's length (pt). */
const RULE_W = 24;

/** The value now, mixed toward its end state by the skip (0 → 1 over 120 ms). */
function mix(v: number, end: number, s: number): number {
  'worklet';
  return v + (end - v) * s;
}

/** One static drawing on the 200-unit stage, built once. */
function Layer({ el, size, style, raster }: { el: ReactNode; size: number; style?: object; raster?: boolean }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]} renderToHardwareTextureAndroid={raster} shouldRasterizeIOS={raster}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {el}
      </Svg>
    </Animated.View>
  );
}
const elOf = (n: PNode | null, key: string) => (n ? renderNode(n, key) : null);

export function FormReveal({
  species,
  from,
  to,
  organs,
  look,
  fromLook,
  theme,
  size,
  accessibilityLabel,
  fact,
  name,
  announce,
  playLabel = 'See the new form',
  onDone,
  onName,
  soilBleed,
  drift = false,
  controlRef,
  testID,
}: FormRevealProps) {
  const { c, g } = useTheme();
  const { reduced } = useMotion();
  // Decided once, before the first paint, in a layout effect (review P3): a render React throws
  // away (a suspended or interrupted one) never spends the session's moment. Reduce Motion is
  // known at once (it spends nothing). A later Reduce Motion change can't restart it.
  // Phase 4b review: a screen reader counts like Reduce Motion (PHASE4B 4.4): the end state at once,
  // no waiting button, and the session's moment is never claimed. Its answer is read synchronously
  // (lib/a11y.ts keeps it from app start); only if it isn't known yet does the reveal wait for it.
  const [mode, setMode] = useState<RevealMode | 'deciding'>(() => (reduced || screenReaderOn() === true ? 'reduced' : 'deciding'));
  const decided = useRef(false);
  const unmounted = useRef(false);
  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
    };
  }, []);
  useLayoutEffect(() => {
    // Once per reveal: StrictMode's second effect run keeps the first decision.
    if (decided.current) return;
    decided.current = true;
    if (mode !== 'deciding') return;
    if (screenReaderOn() !== null) {
      // Known and off (on was caught above): decided before paint, so the first frame is never the wrong mode.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- decided before paint
      setMode(revealMode(false, claimMoment));
      return;
    }
    // Not known yet (the app's first question is still out): stay 'deciding' until the answer comes.
    watchScreenReader();
    whenScreenReaderKnown().then((on) => {
      if (unmounted.current) return;
      setMode(revealMode(on, claimMoment));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- decided once
  }, []);
  const [done, setDone] = useState(false);
  const P = useMemo(() => phases(tierOf(to)), [to]);
  const isReduced = mode === 'reduced';
  const playing = mode === 'full' && !done;

  // ── The static layers, built once ─────────────────────────────────────
  const glowId = `turnGlow${useId().replace(/[^A-Za-z0-9]/g, '')}`;
  const organKey = organs ? organs.map((v) => Math.round(v * 40) / 40).join(',') : '';
  const oldLook = fromLook ?? look;
  const layers = useMemo(() => {
    const lod = lodFor(size);
    const org = organKey ? organKey.split(',').map(Number) : undefined;
    const build = (stage: GrowthLevel, lk: ArtLook | undefined) => buildPlant({ species, stage, organs: org, quietLook: true, lod, theme, look: lk, px: size, fit: false });
    const oldB = build(from, oldLook);
    const newB = build(to, look);
    const o = turnLayers(oldB.root);
    const n = turnLayers(newB.root);
    const tone = turnTone[theme];
    const light = lightOf(o.treeBox, n.treeBox, P.glowR);
    const glowNode: GNode = {
      t: 'g',
      id: 'turn-light',
      children: [1, 0.74, 0.48].map((k, i) => ({ t: 'circle' as const, cx: light.cx, cy: light.cy, r: light.r * k, fill: tone.glow, opacity: tone.glowOps[i] })),
    };
    // Dark: one soft radial wash instead of three stacked circles (they read as steps there, review O5).
    const gather = tone.glowStops ? (
      <>
        <Defs>
          <RadialGradient id={glowId} cx={light.cx} cy={light.cy} r={light.r} gradientUnits="userSpaceOnUse">
            {tone.glowStops.map(([o, op]) => (
              <Stop key={o} offset={o} stopColor={tone.glow} stopOpacity={op} />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx={light.cx} cy={light.cy} r={light.r} fill={`url(#${glowId})`} />
      </>
    ) : (
      elOf(glowNode, 'gl')
    );
    // The owner's pick (theme/tokens.ts turnLook, E1 option A): the forms take turns in gold.
    const sil = turnLook.sil === 'gold' ? tone.silGold : tone.sil;
    const sameBack = sameLayer(o.back, n.back);
    const sameFront = sameLayer(o.front, n.front);
    return {
      light,
      ring: n.ring,
      base: newB.anchors.base.y,
      tipY: n.treeBox.minY,
      backOld: sameBack ? null : elOf(o.back, 'bo'),
      backNew: elOf(n.back, 'bn'),
      artGlow: elOf(n.glow, 'ag'),
      gather,
      treeOld: elOf(o.tree, 'to'),
      treeNew: elOf(n.tree, 'tn'),
      silOld: elOf(silhouette(o.tree, sil), 'so'),
      silNew: elOf(silhouette(n.tree, sil), 'sn'),
      frontOld: sameFront ? null : elOf(o.front, 'fo'),
      frontNew: elOf(n.front, 'fn'),
    };
  }, [species, from, to, organKey, oldLook, look, theme, size, P.glowR, glowId]);
  const u = size / 200;
  const baseOrigin = originPx(100 * u, layers.base * u);
  const lightOrigin = originPx(layers.light.cx * u, layers.light.cy * u);

  // ── The one clock, the skip, and the moment's ending (once) ───────────
  const clock = useSharedValue(0);
  const skipV = useSharedValue(0);
  const finished = useRef(false);
  const skipping = useRef(false);
  const buzzed = useRef(false);
  const alive = useRef(true);
  const stageRef = useRef<View>(null);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  // The name lands once: the screen fills the stem leaf then (PHASE4B 4.4 and 4.6).
  const nameFired = useRef(false);
  const named = useCallback(() => {
    if (nameFired.current || !alive.current) return;
    nameFired.current = true;
    onName?.();
  }, [onName]);
  const bloom = useCallback(() => {
    if (buzzed.current) return;
    buzzed.current = true;
    haptic.success();
  }, []);
  const finish = useCallback(() => {
    if (finished.current || !alive.current) return;
    finished.current = true;
    named();
    setDone(true);
    bloom(); // the one haptic, if the bloom hadn't fired it yet (Reduce Motion, a skip)
    sayLater(announce);
    onDone?.();
  }, [announce, bloom, named, onDone]);
  // The tap that started a waiting reveal (or its quick second tap) is never a skip (review P2a).
  const playedAt = useRef(0);
  // Phase 4b review: cut short (a tap, a scroll drag, leaving the app). A Turning that was cut short
  // never drifts its Elder leaves, and a tap or drag during the drift ends it (PHASE4B 8: any tap or
  // scroll skips a celebration to its end).
  const [cut, setCut] = useState(false);
  const skip = useCallback(() => {
    if (mode !== 'full') return;
    setCut(true);
    if (finished.current || skipping.current) return;
    skipping.current = true;
    cancelAnimation(clock);
    skipV.set(
      withTiming(1, { duration: motion.turn.skip, easing: out, reduceMotion: ReduceMotion.Never }, (ok) => {
        if (ok) runOnJS(finish)();
      }),
    );
  }, [mode, clock, skipV, finish]);
  useImperativeHandle(controlRef, () => ({ skip }), [skip]);
  const touchSkip = useCallback(() => {
    if (Date.now() - playedAt.current < motion.turn.playGuard) return;
    skip();
  }, [skip]);

  useEffect(() => {
    if (mode === 'wait' || mode === 'deciding') return;
    const total = mode === 'reduced' ? R : P.total;
    const start = () =>
      clock.set(
        withTiming(total, { duration: total, easing: linear, reduceMotion: ReduceMotion.Never }, (ok) => {
          if (ok) runOnJS(finish)();
        }),
      );
    if (mode === 'reduced') {
      start();
      return;
    }
    // Full motion starts on the frame after the layers mount (review O6): the first, heavy frame
    // never eats the opening of the clock (the fact's fade and the gather).
    const f = requestAnimationFrame(start);
    return () => cancelAnimationFrame(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- plays once per mode (on mount, or when the waiting button is tapped)
  }, [mode]);
  // The bloom's haptic, from the UI thread when the clock crosses it (full motion only).
  const b0 = P.b0;
  const full = mode === 'full';
  useAnimatedReaction(
    () => full && clock.value >= b0,
    (now, prev) => {
      if (now && !prev) runOnJS(bloom)();
    },
    [full, b0],
  );
  // The name's moment, from the UI thread when the clock crosses nameAt (full motion only).
  const nameAt = P.nameAt;
  useAnimatedReaction(
    () => full && clock.value >= nameAt,
    (now, prev) => {
      if (now && !prev) runOnJS(named)();
    },
    [full, nameAt],
  );
  // At Elder, a few leaves drift once after a Turning that played to its end (never after a skip).
  const drifting = drift && done && mode === 'full' && !cut;
  // Leaving the app mid-way skips to the end (it is never left half-turned), and drops the drift.
  const listening = playing || drifting;
  useEffect(() => {
    if (!listening) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') skip();
    });
    return () => sub.remove();
  }, [listening, skip]);

  const play = () => {
    playedAt.current = Date.now();
    // Reduce Motion (or a screen reader) turned on while it waited: the cross-fade, never the full motion (review P2b).
    setMode(reduced || screenReaderOn() === true ? 'reduced' : 'full');
    // The button goes: hand screen-reader focus to the plant (never lost on the page).
    moveFocus(stageRef);
  };

  // ── Styles: every value a pure function of the clock (engine/turnTimeline.ts) ─
  const backOld = useAnimatedStyle(() => {
    const t = clock.value;
    const pm = isReduced ? clamp01(t / R) : propsMix(t, P);
    return { opacity: 1 - mix(pm, 1, skipV.value) };
  });
  const backNew = useAnimatedStyle(() => {
    const t = clock.value;
    const pm = isReduced ? clamp01(t / R) : propsMix(t, P);
    return { opacity: mix(pm, 1, skipV.value) };
  });
  const artGlow = useAnimatedStyle(() => {
    const t = clock.value;
    const v = isReduced ? clamp01(t / R) : propsMix(t, P) * artGlowOp(t, P);
    return { opacity: mix(v, 1, skipV.value) };
  });
  const gather = useAnimatedStyle(() => {
    const [op, sc] = glowAt(clock.value, P);
    return { opacity: isReduced ? 0 : mix(op, 0, skipV.value), transform: [{ scale: sc }] };
  });
  const treeOld = useAnimatedStyle(() => {
    const t = clock.value;
    const op = isReduced ? 1 - clamp01(t / R) : oldTreeOp(t, P);
    return { opacity: mix(op, 0, skipV.value), transform: [{ scale: isReduced ? 1 : oldScale(t, P) }] };
  });
  const treeNew = useAnimatedStyle(() => {
    const t = clock.value;
    const op = isReduced ? clamp01(t / R) : newTreeOp(t, P);
    return { opacity: mix(op, 1, skipV.value), transform: [{ scale: isReduced ? 1 : mix(newScale(t, P), 1, skipV.value) }] };
  });
  const silOld = useAnimatedStyle(() => {
    const t = clock.value;
    return { opacity: isReduced ? 0 : mix(oldSilOp(t, P), 0, skipV.value), transform: [{ scale: isReduced ? 1 : oldScale(t, P) }] };
  });
  const silNew = useAnimatedStyle(() => ({ opacity: isReduced ? 0 : mix(newSilOp(clock.value, P), 0, skipV.value) }));
  const ring = layers.ring;
  const circ = ring ? 2 * Math.PI * ring.r : 0;
  const haloProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - (isReduced ? 1 : mix(haloDraw(clock.value, P), 1, skipV.value))),
  }));
  // Each updater reads the clock and the skip ITSELF: a shared value read only inside a nested
  // helper is not seen as an input, and the words would never move until a re-render.
  // Phase 4b: the label rule draws out from the plant side (nameAt to +240 ms), then the name fades in
  // (nameAt + 100 to + 500 ms). Opacity and transform only.
  const ruleStyle = useAnimatedStyle(() => {
    const p = isReduced ? 1 : mix(clamp01((clock.value - nameAt) / LABEL_RULE), 1, skipV.value);
    return { opacity: p > 0 ? 1 : 0, transform: [{ scaleX: p }] };
  });
  const nameStyle = useAnimatedStyle(() => {
    const p = isReduced ? 1 : mix(clamp01((clock.value - nameAt - LABEL_NAME_AFTER) / LABEL_NAME), 1, skipV.value);
    return { opacity: p, transform: [{ translateY: RISE * (1 - p) }] };
  });

  const moving = playing;
  const hideWords = playing;
  // Full motion: the words are hidden from screen readers until it ends (UX review P5), so nobody
  // hears text that isn't on screen yet; the one announcement (sayLater) still comes at the end.
  const wordsA11y = { accessibilityElementsHidden: hideWords, importantForAccessibility: hideWords ? ('no-hide-descendants' as const) : ('auto' as const) };
  return (
    <View testID={testID} style={{ alignSelf: 'stretch' }} onTouchStart={playing || drifting ? touchSkip : undefined}>
      {/* Phase 4b: the fact that earned the form, on screen from the first frame, above the art. */}
      <View testID={testID ? `${testID}-fact` : undefined} style={{ paddingHorizontal: space.md, marginBottom: space.md }} {...wordsA11y}>
        <T v="small" center color={c.ink2}>
          {fact}
        </T>
      </View>
      <View style={{ alignItems: 'center' }}>
        {/* The soil line the art stands on, the full width of the page. Decorative (words carry the moment). */}
        {soilBleed !== undefined ? (
          <View
            testID={testID ? `${testID}-soil` : undefined}
            pointerEvents="none"
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={{ position: 'absolute', left: -soilBleed, right: -soilBleed, top: layers.base * u - 1, height: 2, borderRadius: 1, backgroundColor: g.soil }}
          />
        ) : null}
        <View
          ref={stageRef}
          style={[styles.stage, { width: size, height: size }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel}
          accessibilityIgnoresInvertColors
          accessibilityHint={playing ? 'Double-tap to show the new form now.' : undefined}
          accessibilityActions={playing ? [{ name: 'activate', label: 'Show the new form now' }] : undefined}
          onAccessibilityAction={playing ? skip : undefined}
          testID={testID ? `${testID}-${mode}` : undefined}
        >
          <View style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {layers.backOld && !done ? <Layer el={layers.backOld} size={size} style={backOld} /> : null}
            <Layer el={layers.backNew} size={size} style={layers.backOld ? backNew : undefined} />
            {layers.artGlow ? <Layer el={layers.artGlow} size={size} style={artGlow} /> : null}
            {!isReduced && !done ? <Layer el={layers.gather} size={size} style={[gather, { transformOrigin: lightOrigin }]} raster={moving} /> : null}
            {ring ? (
              <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={testID ? `${testID}-halo` : undefined}>
                <Svg width={size} height={size} viewBox="0 0 200 200">
                  <AnimatedCircle
                    cx={ring.cx}
                    cy={ring.cy}
                    r={ring.r}
                    fill="none"
                    stroke={ring.stroke}
                    strokeWidth={ring.sw}
                    opacity={ring.opacity}
                    strokeLinecap="round"
                    strokeDasharray={`${circ} ${circ}`}
                    transform={`rotate(-90 ${ring.cx} ${ring.cy})`}
                    animatedProps={haloProps}
                  />
                </Svg>
              </View>
            ) : null}
            {!done ? <Layer el={layers.treeOld} size={size} style={[treeOld, { transformOrigin: baseOrigin }]} raster={moving} /> : null}
            <Layer el={layers.treeNew} size={size} style={[treeNew, { transformOrigin: baseOrigin }]} raster={moving} />
            {!isReduced && !done ? (
              <>
                <Layer el={layers.silOld} size={size} style={[silOld, { transformOrigin: baseOrigin }]} raster={moving} />
                <Layer el={layers.silNew} size={size} style={silNew} raster={moving} />
              </>
            ) : null}
            {layers.frontOld && !done ? <Layer el={layers.frontOld} size={size} style={backOld} /> : null}
            <Layer el={layers.frontNew} size={size} style={layers.frontOld ? backNew : undefined} />
            {mode === 'full' && !done ? (
              <TurnMotes species={species} theme={theme} P={P} clock={clock} skip={skipV} u={u} light={layers.light} base={layers.base} tipY={layers.tipY} />
            ) : null}
            {/* Phase 4b (4.5): at Elder, at most 8 leaves drift once down the art's own column (never
                over words; LeafFall draws nothing under Reduce Motion). Only after a Turning that
                played to its end: never after a skip, and a tap or drag during it ends it. */}
            {drifting ? <LeafFall run colors={[c.accent, c.sap]} width={size} height={size} /> : null}
          </View>
        </View>
      </View>
      <View style={{ marginTop: space.md, alignItems: 'center', paddingHorizontal: space.md }} testID={testID ? `${testID}-words` : undefined} {...wordsA11y}>
        {mode === 'wait' ? (
          // Phase 4b: the session's moment is spent, so it waits for a tap (the solid main button).
          <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: space.xs }} testID={testID ? `${testID}-play` : undefined}>
            <Button label={playLabel} onPress={play} style={{ alignSelf: 'stretch' }} />
            <T v="meta" center>
              It plays when you tap.
            </T>
          </View>
        ) : (
          // The label: a 1px rule drawn out from the plant side, "New form" and the form's name.
          <View testID={testID ? `${testID}-label` : undefined} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, maxWidth: '100%' }}>
            <Animated.View testID={testID ? `${testID}-rule` : undefined} style={[{ width: RULE_W, height: 1, marginBottom: 12, backgroundColor: c.ink2, transformOrigin: 'left' }, ruleStyle]} />
            <Animated.View testID={testID ? `${testID}-name` : undefined} style={[{ flexShrink: 1 }, nameStyle]}>
              <FieldText v="head">New form</FieldText>
              <T v="title">{`The ${name}`}</T>
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { overflow: 'hidden' },
});
