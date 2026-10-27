/**
 * The widgets' background task (mobile 1.47): Android starts it when a widget
 * is added, resized, refreshed (about every 3 hours) or tapped.
 *
 * It reads ONLY the small snapshot (`aurivan.widget.v1`) and Today's rule's
 * marks (`aurivan.widget.reveal.v1`): never the progress or settings stores
 * (they are big, and a background save could clash with the app's own). The
 * import guard test (src/__tests__/widgets-guard.test.ts) keeps it that way.
 *
 * A tap that opens the app is handled by Android itself (OPEN_URI). The only
 * clicks this task handles are Today's rule's: "Show the rule" marks the
 * widget revealed for today; "Had it" / "Not yet" note the learner's own
 * check for that rule (it changes when the rule comes back, never a score).
 * Nothing here writes study progress, so a widget tap earns nothing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { kindOfName, parseSnapshot, readReveal, REVEAL_KEY, thinkIdFor, WIDGET_KEY, withoutWidget, withReveal, withSelfCheck } from '../engine/widgets';
import { dayKey } from '../engine/streak';
import { HAD_ACTION, NOTYET_ACTION, REVEAL_ACTION } from './layouts.android';
import { renderKind, renderPlaced } from './render.android';

export async function widgetTask(props: WidgetTaskHandlerProps): Promise<void> {
  const kind = kindOfName(props.widgetInfo.widgetName);
  if (!kind) return;
  const id = props.widgetInfo.widgetId;
  const now = Date.now();
  try {
    const [rawSnap, rawReveal] = await Promise.all([AsyncStorage.getItem(WIDGET_KEY), AsyncStorage.getItem(REVEAL_KEY)]);
    let reveal = readReveal(rawReveal, dayKey(now));
    if (props.widgetAction === 'WIDGET_DELETED') {
      const next = withoutWidget(reveal, id);
      if (next !== reveal) await AsyncStorage.setItem(REVEAL_KEY, JSON.stringify(next));
      return;
    }
    const snap = parseSnapshot(rawSnap);
    if (props.widgetAction === 'WIDGET_CLICK' && kind === 'think') {
      const rule = thinkIdFor(snap, now);
      const next =
        props.clickAction === REVEAL_ACTION
          ? withReveal(reveal, id, rule)
          : props.clickAction === HAD_ACTION
            ? withSelfCheck(reveal, rule, 'had')
            : props.clickAction === NOTYET_ACTION
              ? withSelfCheck(reveal, rule, 'notyet')
              : reveal;
      if (next !== reveal) await AsyncStorage.setItem(REVEAL_KEY, JSON.stringify(next));
      reveal = next;
    }
    props.renderWidget(renderPlaced(kind, snap, props.widgetInfo, now, reveal));
  } catch {
    // A widget must never crash the app's background runtime: draw the calm setup face instead.
    if (props.widgetAction !== 'WIDGET_DELETED') props.renderWidget(renderKind(kind, null, props.widgetInfo, { now, revealed: false }));
  }
}
