/**
 * Home-screen widgets: the app's side (mobile 1.47).
 *
 * Widgets are Android-only for now. This file is what iOS, the web and Jest
 * get: every call does nothing, and `widgetsSupported` is false, so Settings
 * hides the widget rows and Today never suggests one. The real version is
 * widgets.android.ts (Metro picks it on Android).
 */
import type { WidgetKind } from '../engine/widgets';

/** True when this build can place and draw home-screen widgets. */
export const widgetsSupported = false;

/** Start keeping the widgets up to date (after saved data has loaded). Returns the stop function. */
export function startWidgetSync(): () => void {
  return () => {};
}

/** Write the snapshot and redraw every placed widget now. Never throws. */
export async function refreshWidgets(_opts: { force?: boolean } = {}): Promise<void> {}

/** Refresh soon, merging a burst of changes into one write. */
export function scheduleRefresh(_ms?: number): void {}

/** Ask the launcher to add one widget kind to the home screen. False where that isn't possible. */
export async function pinWidget(_kind: WidgetKind): Promise<boolean> {
  return false;
}

/** The widget kinds placed on the home screen right now. */
export async function placedKinds(): Promise<WidgetKind[]> {
  return [];
}
