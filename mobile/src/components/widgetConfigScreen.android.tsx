'use no memo';
/**
 * The short "choose" screen Android opens when the learner adds the Readiness
 * or Exam countdown widget (mobile 1.47). Adding the widget is the opt-in:
 * - Readiness: "Rings only" (first, recommended) or "Rings and your range".
 * - Exam countdown: "Show weeks to my exam" (turns on exam timing).
 * - "Not now" cancels the add, so nothing appears on the home screen.
 * The choice is the same switch as Settings → Home-screen widgets, and stays
 * on this phone. Any other widget kind (or a missing widget) closes at once.
 *
 * Registered by widgetConfig.android.tsx (from index.ts; Android only, never
 * in Expo Go), which loads this file only when the screen opens (1.47.1):
 * the widgets' background runs never need the stores or the UI kit below.
 * The library opens it in its own small activity, so it waits for saved data
 * before writing (at most READY_TIMEOUT_MS), then draws the widget once
 * (renderWidget) and tells Android it is done.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { countdownConfigCopy, kindOfName, parseSnapshot, readinessConfigCopy, readReveal, REVEAL_KEY, WIDGET_KEY, type ConfigCopy } from '../engine/widgets';
import { dayKey } from '../engine/streak';
import { whenHydrated } from '../lib/backup';
import { refreshWidgets } from '../lib/widgets';
import { useSettings } from '../store/settings';
import { useWidgetStore } from '../store/widgets';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { renderPlaced } from '../widgets/render.android';
import { Button, T } from './ui';

/** Saved data (the widget choices and the stores the snapshot reads) has loaded. */
async function ready(): Promise<void> {
  if (!useWidgetStore.persist.hasHydrated()) {
    await new Promise<void>((resolve) => {
      const off = useWidgetStore.persist.onFinishHydration(() => {
        off();
        resolve();
      });
    });
  }
  await whenHydrated();
}

/** Saved data gets this long to load. After it the add finishes without writing, so the buttons never stay stuck. */
export const READY_TIMEOUT_MS = 5000;

/** True once saved data has loaded, false if it took longer than `ms`. */
async function readyWithin(ms: number): Promise<boolean> {
  let wait: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<boolean>((resolve) => {
    wait = setTimeout(() => resolve(false), ms);
  });
  try {
    return await Promise.race([ready().then(() => true), late]);
  } finally {
    clearTimeout(wait);
  }
}

/** Apply the choice, write the snapshot, draw this widget, and finish. Never throws. */
export async function applyWidgetChoice(props: WidgetConfigurationScreenProps, choice: string | null): Promise<void> {
  const kind = kindOfName(props.widgetInfo.widgetName);
  if (!choice || (kind !== 'readiness' && kind !== 'countdown')) {
    props.setResult('cancel');
    return;
  }
  try {
    // Saved data never loaded: finish the add without writing. The widget then shows its
    // "Choose" face, and a tap on it opens the same switch in Settings.
    if (!(await readyWithin(READY_TIMEOUT_MS))) {
      props.setResult('ok');
      return;
    }
    const today = dayKey(Date.now());
    if (kind === 'readiness') useWidgetStore.getState().setReadiness(choice === 'show' ? 'show' : 'private', today);
    else useWidgetStore.getState().setTiming(true);
    await refreshWidgets({ force: true });
    const now = Date.now();
    const [rawSnap, rawReveal] = await Promise.all([AsyncStorage.getItem(WIDGET_KEY), AsyncStorage.getItem(REVEAL_KEY)]);
    props.renderWidget(renderPlaced(kind, parseSnapshot(rawSnap), props.widgetInfo, now, readReveal(rawReveal, dayKey(now))));
  } catch {
    // The choice is saved; the widget draws itself on its next update.
  }
  props.setResult('ok');
}

export function WidgetConfigScreen(props: WidgetConfigurationScreenProps) {
  const { c } = useTheme();
  const kind = kindOfName(props.widgetInfo.widgetName);
  const prefs = useWidgetStore((s) => s.prefs);
  const examDay = useSettings((s) => s.examDates[s.activeCertId] ?? null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (kind !== 'readiness' && kind !== 'countdown') props.setResult('cancel');
  }, [kind, props]);
  if (kind !== 'readiness' && kind !== 'countdown') return <View />;
  const copy: ConfigCopy<string> = kind === 'readiness' ? readinessConfigCopy(prefs) : countdownConfigCopy(prefs, examDay);
  const choose = (v: string | null) => {
    if (busy) return;
    setBusy(true);
    void applyWidgetChoice(props, v);
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView contentContainerStyle={{ padding: space.gutter, gap: space.md }}>
          <T v="caption" color={c.accentText}>KaiSip widget</T>
          <T v="display" accessibilityRole="header">{copy.title}</T>
          <T v="body" color={c.ink2}>{copy.intro}</T>
          {copy.choices.map((ch) => (
            <View key={ch.value} style={{ gap: space.xs, marginTop: space.sm }}>
              <Button kind={ch.recommended ? 'primary' : 'secondary'} label={ch.recommended && copy.choices.length > 1 ? `${ch.label} (recommended)` : ch.label} accessibilityHint={ch.hint} disabled={busy} onPress={() => choose(ch.value)} />
              <T v="small" color={c.ink2}>{ch.hint}</T>
            </View>
          ))}
          {copy.note ? <T v="small" color={c.ink2}>{copy.note}</T> : null}
          <Button kind="ghost" label="Not now" accessibilityHint="The widget is not added." disabled={busy} onPress={() => choose(null)} />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

