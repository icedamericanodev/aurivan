/**
 * Small screen-reader helpers.
 *
 * moveFocus: put VoiceOver / TalkBack focus on a control after the screen
 * changes under the learner's finger (Pause → Resume, a card closing), so
 * they never land on nothing. Native only: findNodeHandle doesn't exist on
 * the web build. The delay lets the new control mount first.
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
import { AccessibilityInfo, findNodeHandle, Platform } from 'react-native';
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

export function moveFocus(ref: RefObject<Component | null | unknown>, delay = 300): void {
  if (Platform.OS === 'web') return;
  later(() => {
    const node = ref.current as Component | null;
    const tag = node ? findNodeHandle(node) : null;
    if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
  }, delay);
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
