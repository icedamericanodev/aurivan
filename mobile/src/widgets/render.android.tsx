'use no memo';
/**
 * One widget, drawn for one placed copy: the face for now, in light and dark
 * (Android picks one with the phone's dark mode, without our code running).
 * Shared by the background task (task.android.ts), the configuration screen
 * (config.android.tsx) and the app's own redraw (lib/widgets.android.ts), so
 * all three always draw the same thing.
 */
import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget';
import { judgedToday, thinkIdFor, widgetFace, type RevealState, type WidgetKind, type WidgetSnapshot } from '../engine/widgets';
import { WidgetLayout } from './layouts.android';

export function renderKind(
  kind: WidgetKind,
  snap: WidgetSnapshot | null,
  info: Pick<WidgetInfo, 'width' | 'height' | 'screenInfo'>,
  opts: { now: number; revealed: boolean; judged?: 'had' | 'notyet' },
): WidgetRepresentation {
  const face = widgetFace(kind, snap, { now: opts.now, revealed: opts.revealed, judged: opts.judged });
  const size = { width: info.width, height: info.height, fontScale: info.screenInfo?.fontScale ?? 1 };
  return {
    light: <WidgetLayout face={face} theme="light" {...size} />,
    dark: <WidgetLayout face={face} theme="dark" {...size} />,
  };
}

/** The same, with Today's rule's reveal mark and self-check for this placed copy. */
export function renderPlaced(kind: WidgetKind, snap: WidgetSnapshot | null, info: Pick<WidgetInfo, 'widgetId' | 'width' | 'height' | 'screenInfo'>, now: number, reveal: RevealState): WidgetRepresentation {
  const judged = kind === 'think' ? judgedToday(reveal, thinkIdFor(snap, now)) : undefined;
  return renderKind(kind, snap, info, { now, revealed: reveal.ids.includes(info.widgetId) || Boolean(judged), judged });
}
