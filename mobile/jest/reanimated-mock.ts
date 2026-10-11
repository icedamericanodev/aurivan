/**
 * The ONE Reanimated mock for every jest test (registered in jest/setup.ts).
 *
 * Before mobile 1.8, about 27 test files each carried their own copy of this
 * mock, so every new Reanimated export meant editing all of them. Now a test
 * gets this one automatically and never mocks Reanimated itself.
 *
 * How it behaves:
 * - Reduce Motion is ON by default (`useReducedMotion()` → true), so screens
 *   render their calm, reduced paths. A test that needs motion ON (the swaying
 *   frond on Play) calls `setMockReducedMotion(false)` before it renders.
 * - Animations finish at once: `withTiming(to)` / `withSpring(to)` return `to`,
 *   `withDelay` and `withRepeat` return the inner value, `withSequence` the last.
 * - Shared values persist across re-renders (like the real hook), and
 *   `useAnimatedStyle` / `useAnimatedProps` really run their updater. So after
 *   effects have run, a re-render shows the animation's END state: the motion
 *   primitives' tests assert that final static state.
 * - `Animated.View` and friends are the plain React Native components, and
 *   layout-animation builders (FadeIn, FadeInDown, …) accept any chain.
 */
import { useState } from 'react';
import { FlatList, Image, ScrollView, Text, View } from 'react-native';

let reduced = true;
/** Turn the mocked system Reduce Motion setting on or off (default: on). */
export function setMockReducedMotion(value: boolean) {
  reduced = value;
}
/** The mocked setting (jest/setup.ts gives React Native's AccessibilityInfo the same answer). */
export const isMockReducedMotion = () => reduced;

export interface MockSharedValue<T> {
  value: T;
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  modify(fn: (prev: T) => T): void;
  addListener(): void;
  removeListener(): void;
}

function makeShared<T>(initial: T): MockSharedValue<T> {
  return {
    value: initial,
    get() {
      return this.value;
    },
    set(next) {
      this.value = typeof next === 'function' ? (next as (p: T) => T)(this.value) : next;
    },
    modify(fn) {
      this.value = fn(this.value);
    },
    addListener() {},
    removeListener() {},
  };
}

// ── Hooks ────────────────────────────────────────────────────────────────
export function useSharedValue<T>(initial: T): MockSharedValue<T> {
  // A lazy useState keeps the same object for the component's whole life.
  return useState(() => makeShared(initial))[0];
}
export const useAnimatedStyle = (updater: () => object) => updater();
export const useAnimatedProps = (updater: () => object) => updater();
export const useDerivedValue = <T,>(updater: () => T) => makeShared(updater());
export const useAnimatedReaction = () => {};
export const useAnimatedRef = () => ({ current: null });
export const useAnimatedScrollHandler = () => () => {};
export const useFrameCallback = () => ({ setActive: () => {}, isActive: false });
export const useReducedMotion = () => reduced;

// ── Animations: they land on their end value at once ────────────────────
type Done = ((finished?: boolean) => void) | undefined;
export const withTiming = <T,>(to: T, _config?: unknown, done?: Done) => {
  done?.(true);
  return to;
};
export const withSpring = withTiming;
export const withDelay = <T,>(_ms: number, animation: T) => animation;
export const withRepeat = <T,>(animation: T) => animation;
export const withSequence = <T,>(...animations: T[]) => animations[animations.length - 1];
export const withDecay = () => 0;
export const cancelAnimation = () => {};
export const runOnJS = <F,>(fn: F) => fn;
export const runOnUI = <F,>(fn: F) => fn;
export const measure = () => null;
export const scrollTo = () => {};

export const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' } as const;
/** Linear, piecewise interpolation; clamps when asked to (enough for end states). */
export function interpolate(x: number, input: number[], output: number[], extrapolate?: string | { extrapolateLeft?: string; extrapolateRight?: string }) {
  const clamp = extrapolate === 'clamp' || (typeof extrapolate === 'object' && extrapolate !== null);
  let i = 1;
  while (i < input.length - 1 && x > input[i]) i++;
  const [a, b] = [input[i - 1], input[i]];
  const [ya, yb] = [output[i - 1], output[i]];
  let t = b === a ? 0 : (x - a) / (b - a);
  if (clamp) t = Math.max(0, Math.min(1, t));
  return ya + (yb - ya) * t;
}
/** The colour at the nearest input point (colours never tween in tests). */
export function interpolateColor(x: number, input: number[], output: string[]) {
  let best = 0;
  input.forEach((v, i) => {
    if (Math.abs(v - x) < Math.abs(input[best] - x)) best = i;
  });
  return output[best];
}

// Every easing is a function, and every factory returns one.
const ease = (t: number) => t;
export const Easing: Record<string, (...a: unknown[]) => unknown> = new Proxy({}, { get: () => () => ease });

export const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' } as const;
export const ReducedMotionConfig = () => null;

// ── Layout animations: any builder chain is accepted ─────────────────────
const builder: object = new Proxy({}, { get: () => () => builder });
export const FadeIn = builder;
export const FadeInDown = builder;
export const FadeInUp = builder;
export const FadeInLeft = builder;
export const FadeInRight = builder;
export const FadeOut = builder;
export const FadeOutDown = builder;
export const FadeOutUp = builder;
export const FadeOutLeft = builder;
export const FadeOutRight = builder;
export const LinearTransition = builder;
export const Layout = builder;
export const ZoomIn = builder;
export const ZoomOut = builder;

// ── Components ───────────────────────────────────────────────────────────
export const createAnimatedComponent = <C,>(component: C) => component;
const Animated = { View, Text, ScrollView, Image, FlatList, createAnimatedComponent };
export default Animated;
