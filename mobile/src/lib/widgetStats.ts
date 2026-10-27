/**
 * The beta's widget counters (mobile 1.47), on this phone only.
 *
 * - A widget tap ARMS a start (lib/widgetOpen.ts). The session factory
 *   (lib/sessions.ts newSession) claims it only when a session really starts,
 *   so "started" never counts a tap that ended on "Keep it", "Caught up" or
 *   a missing question. The session remembers its widget.
 * - When that session finishes with at least 3 answers (or every question,
 *   if it had fewer), it counts as completed (lib/finishSession.ts).
 * - The day's study and a cleared plan are noted from lib/activity.ts.
 * Platform-neutral and harmless where widgets don't exist: nothing is armed there.
 */
import type { WidgetKind } from '../engine/widgets';
import { dayKey } from '../engine/streak';
import { useWidgetStore } from '../store/widgets';

/** A tap's start must happen within this long (a replace-session prompt can take a moment). */
export const ARM_MS = 60_000;
let armed: { kind: WidgetKind; at: number } | null = null;

export function armWidgetStart(kind: WidgetKind | null): void {
  armed = kind ? { kind, at: Date.now() } : null;
}

/** The widget that asked for the session starting now, if any (it is counted as started). */
export function claimWidgetStart(now = Date.now()): WidgetKind | undefined {
  const a = armed;
  armed = null;
  if (!a || now - a.at > ARM_MS) return undefined;
  const day = dayKey(now);
  const ws = useWidgetStore.getState();
  ws.noteStarted(a.kind, day, !ws.stats.studyDays.includes(day));
  return a.kind;
}

/** A session ended: completed when it had at least 3 answers (or all of its questions). */
export function noteWidgetSessionEnd(widget: WidgetKind | undefined, answered: number, total: number): void {
  if (!widget) return;
  if (answered >= Math.min(3, Math.max(1, total))) useWidgetStore.getState().noteCompleted(widget);
}

/** A study activity today (the 60-day history), and whether it cleared today's plan. */
export function noteWidgetStudy(cleared: boolean, now = Date.now()): void {
  const day = dayKey(now);
  const ws = useWidgetStore.getState();
  ws.noteStudyDay(day);
  if (cleared) ws.noteCleared(day);
}

/** Tests: forget an armed start. */
export function resetWidgetStatsForTest(): void {
  armed = null;
}
