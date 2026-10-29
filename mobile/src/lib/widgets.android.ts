/**
 * Home-screen widgets on Android (mobile 1.47): the app writes the snapshot
 * and redraws the placed widgets.
 *
 * When: once saved data has loaded, whenever the app comes back to the
 * front, and after anything a widget shows changes (a finished session, a
 * restore or an undo, the website import, a sync, a settings change). Changes
 * are merged and written about a second later. Answers during a quiz wait
 * until it ends; a settings change never waits (1.47.1).
 * - Leaving the app (Home, another app) redraws AT ONCE, even mid-quiz:
 *   Android stops the app's timers in the background, so a waiting refresh
 *   would otherwise not run until the app opens again (1.47.1).
 * - While the app is open, a timer redraws just after local midnight, so a
 *   new day shows without waiting for Android's 3-hourly update (1.47.1).
 *
 * What: one small key, `aurivan.widget.v1` (engine/widgets.ts), written only
 * when its contents changed, then `requestWidgetUpdate` for each widget kind
 * (it does nothing for a kind the learner hasn't placed).
 *
 * Never throws: a widget problem must never break studying. Nothing here
 * uses the network, and nothing leaves the phone. (Test builds only: a
 * background widget refresh starts the app's JavaScript, and expo-updates then
 * checks for an update as it does on every start. No widget data is sent, and
 * store builds have updates off: docs/mobile/ARCHITECTURE.md §6.12.)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRunningInExpoGo } from 'expo';
import { AppState } from 'react-native';
import { getWidgetInfo, requestPinWidget, requestWidgetUpdate } from 'react-native-android-widget';
import { msToNextMidnight, readReveal, REVEAL_KEY, WIDGET_KEY, WIDGET_KINDS, WIDGET_NAMES, type WidgetKind } from '../engine/widgets';
import { dayKey } from '../engine/streak';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { useWidgetStore } from '../store/widgets';
import { renderPlaced } from '../widgets/render.android';
import { collectSnapshot } from './widgetData';

/** Expo Go can't hold the widget's native part: everything here is off there. */
export const widgetsSupported = !isRunningInExpoGo();

/** Bursts of changes are merged into one write this long after the last one. */
export const REFRESH_DELAY_MS = 1200;

/** The last snapshot written (its time left out), so an unchanged one is never written again. */
let lastWritten = '';
let timer: ReturnType<typeof setTimeout> | null = null;
/** Progress changed during a quiz: redraw when it ends or the app leaves the front. */
let pending = false;
/** The redraw just after local midnight (only while the app is open). */
let midnight: ReturnType<typeof setTimeout> | null = null;

/**
 * Write the snapshot (if it changed) and redraw every placed widget. Never
 * throws. `force`: write it even if it looks unchanged (after "Remove my
 * progress from this phone", whose write must not wait for anything).
 */
export async function refreshWidgets(opts: { force?: boolean } = {}): Promise<void> {
  if (!widgetsSupported) return;
  // This write includes any answers that were waiting for a quiz to end.
  pending = false;
  try {
    const now = Date.now();
    // Today's rule's self-checks (written by the widget) steer which rule comes next.
    const reveal = readReveal(await AsyncStorage.getItem(REVEAL_KEY), dayKey(now));
    const snap = collectSnapshot(now, reveal);
    const body = JSON.stringify({ ...snap, at: 0 });
    if (opts.force || body !== lastWritten) {
      await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify(snap));
      lastWritten = body;
    }
    await Promise.all(
      WIDGET_KINDS.map((kind) =>
        requestWidgetUpdate({
          widgetName: WIDGET_NAMES[kind],
          renderWidget: (info) => renderPlaced(kind, snap, info, now, reveal),
        }).catch(() => {}),
      ),
    );
  } catch {
    // Never break the app over a widget.
  }
}

/** Refresh soon, merging a burst of changes into one write. */
export function scheduleRefresh(ms = REFRESH_DELAY_MS): void {
  if (!widgetsSupported) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void refreshWidgets();
  }, ms);
}

/** Redraw now, instead of the waiting refresh (the app is leaving the front: its timers are about to stop). */
function flushNow(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  void refreshWidgets();
}

/** Redraw just after the next local midnight, then again each night while the app stays open. */
function armMidnight(): void {
  if (midnight) clearTimeout(midnight);
  midnight = setTimeout(() => {
    midnight = null;
    void refreshWidgets();
    armMidnight();
  }, msToNextMidnight(Date.now()));
}

function stopMidnight(): void {
  if (midnight) clearTimeout(midnight);
  midnight = null;
}

/** A quiz is open and not finished: its answers wait until it ends. */
const inSession = () => {
  const a = useSession.getState().active;
  return Boolean(a && !a.finishedAt);
};

/** The widget kinds on the home screen now, or null when the launcher couldn't be asked. */
async function findPlaced(): Promise<WidgetKind[] | null> {
  try {
    const found = await Promise.all(WIDGET_KINDS.map(async (k) => ((await getWidgetInfo(WIDGET_NAMES[k])).length > 0 ? k : null)));
    return found.filter((k): k is WidgetKind => k !== null);
  } catch {
    return null;
  }
}

/** The widget kinds on the home screen now (for the local "still placed?" counters). */
export async function placedKinds(): Promise<WidgetKind[]> {
  if (!widgetsSupported) return [];
  return (await findPlaced()) ?? [];
}

/** Record which kinds are placed today (on this phone only). A failed check records nothing. */
async function noteSeen(): Promise<void> {
  const kinds = await findPlaced();
  if (kinds) useWidgetStore.getState().noteSeen(kinds, dayKey(Date.now()));
}

/** Ask the launcher to add a widget (Android 8+ launchers that support pinning). */
export async function pinWidget(kind: WidgetKind): Promise<boolean> {
  if (!widgetsSupported) return false;
  try {
    return await requestPinWidget({ widgetName: WIDGET_NAMES[kind] });
  } catch {
    return false;
  }
}

/**
 * Keep the widgets up to date while the app runs: call once saved data has
 * loaded (app/_layout.tsx). Returns the stop function.
 */
export function startWidgetSync(): () => void {
  if (!widgetsSupported) return () => {};
  // Answers during a quiz are only noted; the redraw comes when it ends (or the app is left).
  const progressChanged = () => {
    if (inSession()) pending = true;
    else scheduleRefresh();
  };
  const offs = [
    // Settings (exam date, minutes, certification) never wait for a quiz: a paused mock can stay open for days.
    useSettings.subscribe(() => scheduleRefresh()),
    useProgress.subscribe(progressChanged),
    // Only the learner's widget choices (the day's pick and counters change during a refresh itself).
    useWidgetStore.subscribe((s, prev) => {
      if (s.prefs !== prev.prefs) scheduleRefresh(0);
    }),
    // Mobile 1.50: the Form IV final the learner chose lives on this phone (store/seen.ts
    // plantFinal), not in progress, so the plant widget redraws when it changes (QA-150-6).
    useSeen.subscribe((s, prev) => {
      if (s.plantFinal !== prev.plantFinal) scheduleRefresh();
    }),
    // A quiz ended (finished, or cleared): its answers now count.
    useSession.subscribe((s, prev) => {
      const was = prev.active && !prev.active.finishedAt;
      const now = s.active && !s.active.finishedAt;
      if (was && !now) {
        pending = false;
        scheduleRefresh();
      }
    }),
  ];
  const app = AppState.addEventListener('change', (state) => {
    // Leaving the app: anything waiting (a refresh, or answers from an open quiz) is drawn now,
    // even mid-quiz (the answers are already saved). Timers stop from here.
    if (state === 'background' || state === 'inactive') {
      stopMidnight();
      if (timer || pending) flushNow();
      return;
    }
    if (state !== 'active') return;
    scheduleRefresh(0);
    void noteSeen();
    armMidnight();
  });
  // The first write waits for this phone's widget choices to load (readiness stays off until then).
  const begin = () => {
    scheduleRefresh(0);
    void noteSeen();
    armMidnight();
  };
  if (useWidgetStore.persist.hasHydrated()) begin();
  else offs.push(useWidgetStore.persist.onFinishHydration(begin));
  return () => {
    offs.forEach((off) => off());
    app.remove();
    if (timer) clearTimeout(timer);
    timer = null;
    pending = false;
    stopMidnight();
  };
}

/** Tests: forget what was last written. */
export function resetWidgetsForTest(): void {
  lastWritten = '';
  if (timer) clearTimeout(timer);
  timer = null;
  pending = false;
  stopMidnight();
}
