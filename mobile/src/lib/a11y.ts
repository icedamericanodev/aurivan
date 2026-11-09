/**
 * Small screen-reader helpers.
 *
 * moveFocus: put VoiceOver / TalkBack focus on a control after the screen
 * changes under the learner's finger (Pause → Resume, a card closing), so
 * they never land on nothing. Native only. The delay lets the new control
 * mount first; the returned callback cancels a pending move on cleanup.
 *
 * sayLater: announce after a short pause (~350 ms), so the announcement
 * doesn't cut off the tap's own feedback. `queue` (iOS): wait behind other
 * speech instead of interrupting it (the backup messages use it).
 *
 * Every one of these waits on a timer that outlives the tap. All of them go
 * through `later`, so tests can cancel whatever is still waiting when a test
 * ends (jest/after-env.ts). Without that, a timer from a finished test file
 * fired while the NEXT file was running in the same Jest worker: its callback
 * read react-native's lazy exports (findNodeHandle, Platform,
 * AccessibilityInfo) after its own environment was torn down, Jest refused
 * the require, and the TypeError was blamed on the other file. That file
 * (often the long new-games suite) then showed as "failed" with every test
 * passing.
 */
import { AccessibilityInfo, Platform } from 'react-native';
import type { Component, RefObject } from 'react';

type Timer = ReturnType<typeof setTimeout>;
/** Every helper timer still waiting. */
const waiting = new Set<Timer>();
function later(fn: () => void, delay: number): Timer {
  const t = setTimeout(() => {
    waiting.delete(t);
    fn();
  }, delay);
  waiting.add(t);
  return t;
}

export function moveFocus(ref: RefObject<Component | null | unknown>, delay = 300): () => void {
  if (Platform.OS === 'web') return () => {};
  const timer = later(() => {
    // RN 0.88/Fabric needs the native host instance, not the deprecated
    // numeric-tag lookup (which can no longer find a view after remounts).
    const node = ref.current as Parameters<typeof AccessibilityInfo.sendAccessibilityEvent>[0] | null;
    if (node) AccessibilityInfo.sendAccessibilityEvent(node, 'focus');
  }, delay);
  return () => {
    clearTimeout(timer);
    waiting.delete(timer);
  };
}

export const ANNOUNCE_DELAY = 350;

interface Said {
  text: string;
  queue: boolean;
}
function say({ text, queue }: Said): void {
  if (queue && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibilityWithOptions(text, { queue: true });
  else AccessibilityInfo.announceForAccessibility(text);
}
/** Announcements waiting for their pause (so tests can say or drop them). */
const pending = new Map<Timer, Said>();
export function sayLater(text: string, delay = ANNOUNCE_DELAY, opts: { queue?: boolean } = {}): void {
  const said = { text, queue: opts.queue === true };
  const t = later(() => {
    pending.delete(t);
    say(said);
  }, delay);
  pending.set(t, said);
}
/** Tests: say every waiting announcement now, in order. */
export function flushSayLaterForTest(): void {
  for (const [t, said] of [...pending]) {
    clearTimeout(t);
    waiting.delete(t);
    pending.delete(t);
    say(said);
  }
}
/**
 * Tests: drop every waiting announcement and focus move. None may fire after
 * its test has ended (jest/after-env.ts runs this after each test and file).
 */
export function cancelA11yTimersForTest(): void {
  for (const t of waiting) clearTimeout(t);
  waiting.clear();
  pending.clear();
}
/** Tests: how many helper timers are still waiting. */
export const a11yTimersWaitingForTest = (): number => waiting.size;

// ── Is a screen reader on? (VoiceOver / TalkBack) ──────────────────────
// Phase 4b review: a celebration treats a screen reader like Reduce Motion
// (it shows its end state at once). React Native only answers that question
// asynchronously, so the answer is kept here, asked once at app start
// (watchScreenReader in app/_layout.tsx) and kept live by the phone's own
// 'screenReaderChanged' event. A screen can then read it synchronously
// (screenReaderOn) before its first paint. `null` = not known yet.
// Polish round 1: on the web build react-native-web's isScreenReaderEnabled() always answers true, so
// every celebration (the Turning) took its Reduce Motion path there. The web cannot tell, so it counts as
// off: known from the start, never asked, no listener. Phones are unchanged.
const onWeb = () => Platform.OS === 'web';
let screenReader: boolean | null = null;
let watchingScreenReader = false;

/** Start following the screen reader (once for the whole app; safe to call again). */
export function watchScreenReader(): void {
  if (watchingScreenReader || onWeb()) return;
  watchingScreenReader = true;
  AccessibilityInfo.addEventListener('screenReaderChanged', (on: boolean) => {
    screenReader = on;
  });
  AccessibilityInfo.isScreenReaderEnabled().then(
    (on) => {
      // A change event that came first is newer: keep it.
      if (screenReader === null) screenReader = on;
    },
    () => {},
  );
}

/** True when a screen reader is on, false when off, null while the first answer is on its way. */
export const screenReaderOn = (): boolean | null => (onWeb() ? false : screenReader);

/** The answer now if known, else the phone's (one async question). Never rejects (no answer counts as off). */
export function whenScreenReaderKnown(): Promise<boolean> {
  if (onWeb()) return Promise.resolve(false);
  if (screenReader !== null) return Promise.resolve(screenReader);
  return AccessibilityInfo.isScreenReaderEnabled().then(
    (on) => {
      if (screenReader === null) screenReader = on;
      return screenReader;
    },
    () => false,
  );
}

/** Tests: set the screen reader's state (null = not known yet). */
export function setScreenReaderForTest(on: boolean | null): void {
  screenReader = on;
}
