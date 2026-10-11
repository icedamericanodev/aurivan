/**
 * Motion primitives (DESIGN_SYSTEM.md §8 "Motion", mobile 1.8).
 *
 * The idea: everyday UI moves like paper (quick, soft, never bouncy); only
 * the verdict leaf springs. Each animation explains one thing: where
 * something came from or went, what changed, or that the app heard a tap.
 *
 * Rules every primitive here follows:
 * - Transform and opacity only, driven by Reanimated on the UI thread. No
 *   layout animation, no JS timers per frame.
 * - Reduce Motion comes from useMotion(): the phone's setting (LIVE, it reacts
 *   when the learner changes it mid-session) or Settings → Motion → Reduced.
 *   Reduced never means a hard cut for a meaningful change: movement becomes
 *   a short cross-fade (motion.dur.reduced) with the same information.
 * - Our tweens pass ReduceMotion.Never, because they already chose their own
 *   reduced path; Reanimated's global switch would skip the cross-fade too.
 * - Nothing here changes what a screen reader hears or the focus order:
 *   content is mounted (and readable) from the first frame.
 * - Nothing blocks input: every animation can be interrupted by the next tap.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn as FadeInAnimation,
  ReducedMotionConfig,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSettings } from '../store/settings';
import { motion } from '../theme/tokens';

export type MotionDur = keyof typeof motion.dur;

// ── Reduce Motion: live, and with the in-app choice ────────────────────
// Reanimated's useReducedMotion() is read once, when the app starts. We keep
// that as the starting value and then follow the phone's own event, plus a
// re-check whenever the app comes back to the foreground (the setting may
// have changed while it was in the background).
let systemLive: boolean | null = null;
const subscribers = new Set<() => void>();
let listening = false;

function setSystem(value: boolean) {
  if (value === systemLive) return;
  systemLive = value;
  subscribers.forEach((notify) => notify());
}

function startListening() {
  if (listening) return;
  listening = true;
  // One listener each for the whole app, never one per component.
  AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
  AppState.addEventListener('change', (state) => {
    if (state === 'active') AccessibilityInfo.isReduceMotionEnabled().then(setSystem, () => {});
  });
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  startListening();
  return () => {
    subscribers.delete(notify);
  };
}

/** Tests: how many components are listening right now. */
export const motionSubscriberCount = () => subscribers.size;
/** Tests: simulate the phone's Reduce Motion switch (null = back to the startup value). */
export function setSystemReducedMotionForTest(value: boolean | null) {
  systemLive = value;
  subscribers.forEach((notify) => notify());
}

/** The phone's Reduce Motion setting, live (Android: "Remove animations" counts too). */
export function useSystemReducedMotion(): boolean {
  const startup = useReducedMotion();
  return useSyncExternalStore(subscribe, () => systemLive ?? startup, () => startup);
}

/**
 * The one source of truth for motion. `reduced` = the phone asks for less
 * motion, or the learner chose Settings → Motion → Reduced.
 */
export function useMotion(): { reduced: boolean } {
  const system = useSystemReducedMotion();
  const pref = useSettings((s) => s.motion);
  return { reduced: pref === 'reduced' || system };
}

/**
 * Mounted once at the root: mirrors useMotion() into Reanimated, so any
 * animation that still says ReduceMotion.System (the growth rings, layout
 * entrances) follows the in-app choice and a live change too. It renders
 * nothing when Reanimated's own startup value already agrees.
 */
export function MotionRoot() {
  const { reduced } = useMotion();
  const startup = useReducedMotion();
  if (reduced === startup) return null;
  return <ReducedMotionConfig mode={reduced ? ReduceMotion.Always : ReduceMotion.Never} />;
}

// ── Easing and tweens ──────────────────────────────────────────────────
const bezier = (p: readonly number[]) => Easing.bezier(p[0], p[1], p[2], p[3]);
export const ease = {
  /** The default: decelerates, so feedback reads as immediate. */
  out: Easing.out(Easing.cubic),
  /** Arriving (M3 emphasized decelerate). */
  enter: bezier(motion.curve.enter),
  /** Leaving (M3 emphasized accelerate). */
  exit: bezier(motion.curve.exit),
  /** Moving on screen (M3 standard). */
  standard: bezier(motion.curve.standard),
};
type Ease = (typeof ease)[keyof typeof ease];

/** A token-timed tween. Never skipped by Reanimated: our components choose their reduced path. */
export function tween(to: number, dur: MotionDur, easing: Ease = ease.out) {
  return withTiming(to, { duration: motion.dur[dur], easing, reduceMotion: ReduceMotion.Never });
}

/** Jump to a value at once (the first step of a sequence). */
const snap = (to: number) => withTiming(to, { duration: 0, reduceMotion: ReduceMotion.Never });

// ── useOncePerDay ──────────────────────────────────────────────────────
// Signature growth plays on the first view of the day only; after that a
// screen shows its end state. Kept in memory: a new app launch on the same
// day may play it once more, which is fine.
const seenOn: Record<string, string> = {};
const todayKey = () => new Date().toDateString();

/** True the first time `key` mounts today (stable for the component's life). */
export function useOncePerDay(key: string): boolean {
  const [first] = useState(() => seenOn[key] !== todayKey());
  useEffect(() => {
    seenOn[key] = todayKey();
  }, [key]);
  return first;
}
/** Tests: forget what was seen. */
export function resetOncePerDayForTest() {
  for (const k of Object.keys(seenOn)) delete seenOn[k];
}

// ── Page arrivals (PageTurn → FadeIn) ──────────────────────────────────
/**
 * The page a PageTurn has just brought in, or null for a screen's first page.
 * FadeIn reads it: groups that mount WITH an arriving page show at once (the
 * page's own arrival is their entrance, so nothing staggers twice), while
 * anything mounting later on that page (the answer reveal) still plays.
 */
const ArrivalContext = createContext<object | null>(null);
const settledArrivals = new WeakSet<object>();

// ── FadeIn: content arrives (fade + 8pt rise) ──────────────────────────
/**
 * The entrance for a content group: opacity 0 → 1 and an 8pt rise, ease-out.
 * `i` staggers groups 40 ms apart (the 5th group on starts with the 4th);
 * `delay` adds an explicit wait (the answer reveal). `when` holds it until
 * true (e.g. scrolled into view). Plays once per mount. Inside a page that a
 * PageTurn is bringing in, it shows at once: the page's arrival is the entrance.
 * Reduced: an opacity-only cross-fade (120 ms), no rise, no stagger.
 */
export function FadeIn({
  i = 0,
  delay = 0,
  dur = 'enter',
  when = true,
  rise = true,
  style,
  children,
}: {
  i?: number;
  delay?: number;
  dur?: MotionDur;
  when?: boolean;
  /** false = fade only. */
  rise?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { reduced } = useMotion();
  // Mounted together with a page that a PageTurn is bringing in: that arrival
  // is the entrance, so this group starts in place (nothing moves twice).
  const arrival = useContext(ArrivalContext);
  const [withPage] = useState(() => arrival !== null && !settledArrivals.has(arrival));
  const p = useSharedValue(withPage ? 1 : 0);
  const y = useSharedValue(reduced || !rise || withPage ? 0 : motion.rise);
  const played = useRef(withPage);
  useEffect(() => {
    if (!when || played.current) return;
    played.current = true;
    if (reduced) {
      y.set(0);
      p.set(tween(1, 'reduced'));
      return;
    }
    const wait = Math.min(i, motion.stagger.maxGroups - 1) * motion.stagger.group + delay;
    p.set(withDelay(wait, tween(1, dur)));
    y.set(withDelay(wait, tween(0, dur)));
  }, [when, reduced, i, delay, dur, p, y]);
  const anim = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: y.value }] }));
  return <Animated.View style={[anim, style]}>{children}</Animated.View>;
}

// ── usePressScale: the app heard the tap ──────────────────────────────
/** A Pressable that takes Reanimated styles (press feedback on the UI thread). */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressScaleOptions {
  /** Press-in scale (default .98). 1 = no squeeze (rows use a tint instead). */
  scale?: number;
  /** Also dim to .92 while pressed (buttons). */
  dim?: boolean;
  /** A pressed tint that fades in under the content (list rows: `soft`). */
  tint?: string;
  tintRadius?: number;
  /** The tint grows from this scale to 1 as it fades in (icon buttons: .9). */
  tintFrom?: number;
  /** Mirror the press into a parent's value (the hero panel's lift). */
  follow?: SharedValue<number>;
  onPressIn?: PressableProps['onPressIn'];
  onPressOut?: PressableProps['onPressOut'];
}

/**
 * Press feedback for an AnimatedPressable, run on the UI thread: press-in
 * eases to .98 in 120 ms, release springs back with no overshoot, and the
 * screen never re-renders for a press. Spread `onPressIn` / `onPressOut`
 * and add `style` last; render `layer` as the first child (the tint).
 * A hook, not a wrapper, so the Pressable keeps its own props and is the
 * only element that carries the role and the press handler.
 * Reduced: no squeeze, a short dim instead (tints stay: they don't move).
 * Never scale anything wider than a row, and never text alone.
 */
export function usePressScale({
  scale = motion.pressScale,
  dim = false,
  tint,
  tintRadius = 0,
  tintFrom = 1,
  follow,
  onPressIn,
  onPressOut,
}: PressScaleOptions = {}) {
  const { reduced } = useMotion();
  const p = useSharedValue(0);
  const pressIn = (e: GestureResponderEvent) => {
    p.set(tween(1, 'press'));
    if (follow) follow.set(tween(1, 'press'));
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    p.set(withSpring(0, { ...motion.spring.press, reduceMotion: ReduceMotion.Never }));
    if (follow) follow.set(withSpring(0, { ...motion.spring.press, reduceMotion: ReduceMotion.Never }));
    onPressOut?.(e);
  };
  const squeeze = 1 - scale;
  const fade = 1 - motion.pressOpacity;
  const dims = dim || (reduced && scale < 1);
  const style = useAnimatedStyle(() => ({
    opacity: dims ? 1 - fade * p.value : 1,
    transform: [{ scale: reduced ? 1 : 1 - squeeze * p.value }],
  }));
  const grow = 1 - tintFrom;
  const tintStyle = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: reduced ? 1 : 1 - grow + grow * p.value }] }));
  const layer = tint ? (
    <Animated.View
      accessible={false}
      importantForAccessibility="no"
      style={[StyleSheet.absoluteFill, styles.noTouch, { backgroundColor: tint, borderRadius: tintRadius }, tintStyle]}
    />
  ) : null;
  return { onPressIn: pressIn, onPressOut: pressOut, style, layer };
}

// ── StateLayer: what changed (a state cross-fades in place) ────────────
/**
 * An always-mounted layer over (or under) a control whose opacity follows
 * `on`: the option's 2px ink ring, a chip's ink fill, a segment's marker.
 * Because it never mounts or resizes, nothing reflows when the state
 * changes. Colour and opacity never bounce. Same under Reduce Motion: a
 * cross-fade is already the calm form.
 */
export function StateLayer({
  on,
  style,
  dur = 'select',
  step = false,
  children,
}: {
  on: boolean;
  style?: StyleProp<ViewStyle>;
  dur?: MotionDur;
  /**
   * Flip at the half-way point instead of fading. For a letter whose colours
   * invert (paper on ink vs ink on paper): a linear cross-fade passes through
   * zero contrast, so the letter would vanish for a moment mid-fade.
   */
  step?: boolean;
  /** Drawn inside the layer (a badge's letter in its "on" colour), so it cross-fades too. */
  children?: ReactNode;
}) {
  const o = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    o.set(tween(on ? 1 : 0, dur));
  }, [on, dur, o]);
  const anim = useAnimatedStyle(() => ({ opacity: step ? (o.value >= 0.5 ? 1 : 0) : o.value }));
  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, styles.noTouch, style, anim]}
    >
      {children}
    </Animated.View>
  );
}

// ── ProgressFill: a bar that grows (translateX inside a clipping track) ─
/**
 * The fill of a progress track: a full-width bar slid left by (1 − value)
 * of the track and clipped by it, so its rounded end stays round at every
 * value (scaleX would squash it). Place it inside a track View with
 * `overflow: 'hidden'`. A change eases over 300 ms; the first render shows
 * the value at once (nothing grows on mount: rings and numbers own that).
 * Reduced: the new value at once, with a 120 ms brighten of the fill.
 */
export function ProgressFill({ value, color, radius = 0 }: { value: number; color: string; radius?: number }) {
  const { reduced } = useMotion();
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const [width, setWidth] = useState(0);
  const p = useSharedValue(v);
  const o = useSharedValue(1);
  const shown = useRef(v);
  useEffect(() => {
    if (shown.current === v) return;
    shown.current = v;
    if (reduced) {
      p.set(v);
      o.set(withSequence(snap(0.55), tween(1, 'reduced')));
    } else {
      p.set(tween(v, 'fill'));
    }
  }, [v, reduced, p, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: (p.value - 1) * width }] }));
  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[StyleSheet.absoluteFill, styles.noTouch]}
    >
      {width === 0 ? (
        // Before the first layout: the same picture, drawn by width.
        <Animated.View style={{ width: `${v * 100}%`, height: '100%', backgroundColor: color, borderRadius: radius }} />
      ) : (
        <Animated.View style={[{ width: '100%', height: '100%', backgroundColor: color, borderRadius: radius }, anim]} />
      )}
    </Animated.View>
  );
}

// ── Pop: a small mark arrives (verdict leaf, bookmark) ─────────────────
/**
 * Springs its child from `from` (default .6) to full size when `trigger`
 * changes to a truthy value, or on mount with `mount`. Only marks pop,
 * never controls or text blocks. Reduced: a 120 ms fade-in, no scale.
 */
export function Pop({
  trigger,
  mount = false,
  from = 0.6,
  spring = 'leaf',
  style,
  children,
}: {
  trigger?: unknown;
  mount?: boolean;
  from?: number;
  spring?: 'pop' | 'leaf';
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { reduced } = useMotion();
  const s = useSharedValue(mount && !reduced ? from : 1);
  const o = useSharedValue(mount && reduced ? 0 : 1);
  const first = useRef(true);
  const last = useRef(trigger);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (!mount) return;
    } else {
      // Only a NEW truthy trigger pops (not a re-run for another reason).
      if (trigger === last.current) return;
      last.current = trigger;
      if (!trigger) return;
    }
    if (reduced) {
      s.set(1);
      o.set(withSequence(snap(0), tween(1, 'reduced')));
      return;
    }
    s.set(withSequence(snap(from), withSpring(1, { ...motion.spring[spring], reduceMotion: ReduceMotion.Never })));
  }, [trigger, mount, reduced, from, spring, s, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

// ── Shake: "not that one" (game tiles only) ────────────────────────────
/**
 * One small horizontal shake (±6 → 0 over 160 ms) each time `trigger`
 * changes to a new non-zero number. Reduced: nothing moves; the screen
 * shows the wrong state in words and colour, so nothing is lost.
 */
export function Shake({ trigger, style, children }: { trigger: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { reduced } = useMotion();
  const x = useSharedValue(0);
  const last = useRef(trigger);
  useEffect(() => {
    if (trigger === last.current) return;
    last.current = trigger;
    if (!trigger || reduced) return;
    const step = (to: number) => withTiming(to, { duration: motion.dur.quick / 4, reduceMotion: ReduceMotion.Never });
    x.set(withSequence(step(-6), step(6), step(-3), step(0)));
  }, [trigger, reduced, x]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Which way a page turns: the explicit direction, else back when a numeric id goes down. */
export function turnDirection(from: string | number, to: string | number, explicit?: 1 | -1): 1 | -1 {
  if (explicit) return explicit;
  return typeof from === 'number' && typeof to === 'number' && to < from ? -1 : 1;
}

// ── PageTurn: one step sideways inside a task ──────────────────────────
/** The calm arrival (Reduce Motion, or a mock): a short fade, applied by Reanimated before the first frame. */
const QUIET_ARRIVAL = FadeInAnimation.duration(motion.dur.reduced).easing(ease.out).reduceMotion(ReduceMotion.Never);

type Page = { id: string | number; dir: 1 | -1; arrival: object | null; quiet: boolean };

/**
 * Shared-axis page turn (question → next question, Guided topic → next):
 * the page on screen fades out drifting 16pt the way you're going (120 ms,
 * accelerating), then the new page arrives from 16pt on the other side
 * (280 ms, decelerating). `onSwap` runs at the swap, before the new page is
 * painted, so the scroll can go back to the top unseen.
 * `direction`: 1 = forward (default), -1 = back; numeric ids infer it.
 * Each page is a fresh subtree (re-keyed on id), so no state from the old
 * page (a selection ring, a pressed tint) can show on the new one.
 * The leaving page can't be tapped, but stays readable: hiding it would push
 * screen-reader focus off the control that was just used. `onTurning` tells
 * the parent which page is still on screen while it leaves, so the parent's
 * own controls (footer, flag, bookmark) follow the page, not the tap.
 * `calm` (mocks: a timed exam should feel like the real test) and Reduce
 * Motion: no drift and no waiting: the new page fades in (120 ms).
 */
export function PageTurn({
  id,
  direction,
  calm = false,
  onSwap,
  onTurning,
  style,
  children,
}: {
  id: string | number;
  direction?: 1 | -1;
  calm?: boolean;
  onSwap?: () => void;
  /** The leaving page's id when a turn starts; null once the new page is in. */
  onTurning?: (leavingId: string | number | null) => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { reduced } = useMotion();
  const quiet = reduced || calm;
  const [page, setPage] = useState<Page>({ id, dir: 1, arrival: null, quiet });
  const [leaving, setLeaving] = useState<1 | -1 | null>(null);
  // The page on screen, kept so it can fade out after the parent has
  // already moved on (written after each settled commit, read only while leaving).
  const onScreen = useRef<ReactNode>(children);
  const latest = useRef(id);
  const swapRef = useRef(onSwap);
  const turningRef = useRef(onTurning);
  const o = useSharedValue(1);
  const x = useSharedValue(0);
  // Declared before the other effects, so they see this commit's callbacks.
  useLayoutEffect(() => {
    latest.current = id;
    swapRef.current = onSwap;
    turningRef.current = onTurning;
    if (id === page.id && leaving === null) onScreen.current = children;
  });

  // A new id: decide during render (React's "adjust state when a prop changes").
  if (id !== page.id && leaving === null) {
    const dir = turnDirection(page.id, id, direction);
    if (quiet) setPage({ id, dir, arrival: {}, quiet: true });
    else setLeaving(dir);
  }

  // Tell the parent before paint, so its controls never run ahead of the page.
  const wasLeaving = useRef(false);
  useLayoutEffect(() => {
    const now = leaving !== null;
    if (now === wasLeaving.current) return;
    wasLeaving.current = now;
    turningRef.current?.(now ? page.id : null);
    // Only the start and the end of a turn report (page.id is the leaving page then).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);
  // Unmounted mid-turn: the parent's controls must not stay inert.
  useLayoutEffect(
    () => () => {
      if (wasLeaving.current) turningRef.current?.(null);
    },
    [],
  );

  // Leaving: fade and drift out, then swap to the newest id.
  useEffect(() => {
    if (leaving === null) return;
    o.set(tween(0, 'select', ease.exit));
    x.set(tween(-motion.shift * leaving, 'select', ease.exit));
    const t = setTimeout(() => {
      setLeaving(null);
      setPage({ id: latest.current, dir: leaving, arrival: {}, quiet: false });
    }, motion.dur.select);
    return () => clearTimeout(t);
  }, [leaving, o, x]);

  // Arriving: before paint, reset the scroll and place the page off to the side.
  useLayoutEffect(() => {
    if (!page.arrival) return;
    swapRef.current?.();
    if (page.quiet) {
      // The keyed page below fades itself in; the frame stays put.
      x.set(0);
      o.set(1);
      return;
    }
    x.set(withSequence(snap(motion.shift * page.dir), tween(0, 'screen', ease.enter)));
    o.set(withSequence(snap(0), tween(1, 'screen', ease.enter)));
  }, [page, o, x]);
  // After the arrival's own commit, anything new on the page animates again.
  useEffect(() => {
    if (page.arrival) settledArrivals.add(page.arrival);
  }, [page]);

  const anim = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }] }));
  const isLeaving = leaving !== null;
  return (
    <Animated.View style={[style, anim, isLeaving && styles.noTouch]}>
      <Animated.View key={String(page.id)} entering={page.arrival && page.quiet ? QUIET_ARRIVAL : undefined}>
        <ArrivalContext.Provider value={page.arrival}>
          {/* While leaving, the old page (from the last settled commit) fades out. */}
          {/* eslint-disable-next-line react-hooks/refs */}
          {isLeaving ? onScreen.current : children}
        </ArrivalContext.Provider>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
});
