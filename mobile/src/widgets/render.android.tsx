'use no memo';
/**
 * One widget, drawn for one placed copy: the face for now, in light and dark
 * (Android picks one with the phone's dark mode, without our code running).
 * Shared by the background task (task.android.ts), the configuration screen
 * (config.android.tsx) and the app's own redraw (lib/widgets.android.ts), so
 * all three always draw the same thing.
 */
import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget';
import { cardRevealed, judgedToday, recallIdFor, revealCardFor, REVEAL_KINDS, thinkIdFor, widgetFace, type RevealState, type WidgetKind, type WidgetSnapshot } from '../engine/widgets';
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

/** Today's self-check for a reveal card (Today's rule by rule, the Recall card by question); none for the Key term. */
export function judgedFor(kind: WidgetKind, snap: WidgetSnapshot | null, now: number, reveal: RevealState): 'had' | 'notyet' | undefined {
  if (kind === 'think') return judgedToday(reveal, thinkIdFor(snap, now));
  if (kind === 'question') return judgedToday(reveal, recallIdFor(snap, now), 'recall');
  return undefined;
}

/** The same, with the reveal cards' marks and self-check for this placed copy. */
export function renderPlaced(kind: WidgetKind, snap: WidgetSnapshot | null, info: Pick<WidgetInfo, 'widgetId' | 'width' | 'height' | 'screenInfo'>, now: number, reveal: RevealState): WidgetRepresentation {
  const judged = judgedFor(kind, snap, now, reveal);
  // Revealed only if THIS card was revealed (1.48 QA): a widget whose card changed starts hidden again.
  const revealed = REVEAL_KINDS.includes(kind) && (cardRevealed(reveal, info.widgetId, revealCardFor(kind, snap, now)) || Boolean(judged));
  return renderKind(kind, snap, info, { now, revealed, judged });
}
