/**
 * Small screen-reader helpers.
 *
 * moveFocus: put VoiceOver / TalkBack focus on a control after the screen
 * changes under the learner's finger (Pause → Resume, a card closing), so
 * they never land on nothing. Native only: findNodeHandle doesn't exist on
 * the web build. The delay lets the new control mount first.
 *
 * sayLater: announce after a short pause (~350 ms), so the announcement
 * doesn't cut off the tap's own feedback.
 */
import { AccessibilityInfo, findNodeHandle, Platform } from 'react-native';
import type { Component, RefObject } from 'react';

export function moveFocus(ref: RefObject<Component | null | unknown>, delay = 300): void {
  if (Platform.OS === 'web') return;
  setTimeout(() => {
    const node = ref.current as Component | null;
    const tag = node ? findNodeHandle(node) : null;
    if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
  }, delay);
}

export const ANNOUNCE_DELAY = 350;
/** Announcements waiting for their pause (so tests can say or drop them). */
const pending = new Map<ReturnType<typeof setTimeout>, string>();
export function sayLater(text: string, delay = ANNOUNCE_DELAY): void {
  const t = setTimeout(() => {
    pending.delete(t);
    AccessibilityInfo.announceForAccessibility(text);
  }, delay);
  pending.set(t, text);
}
/** Tests: say every waiting announcement now, in order. */
export function flushSayLaterForTest(): void {
  for (const [t, text] of [...pending]) {
    clearTimeout(t);
    pending.delete(t);
    AccessibilityInfo.announceForAccessibility(text);
  }
}
/** Tests: drop every waiting announcement (none may fire after a test has ended). */
export function cancelSayLaterForTest(): void {
  for (const t of pending.keys()) clearTimeout(t);
  pending.clear();
}
