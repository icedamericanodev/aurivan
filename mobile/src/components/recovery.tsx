/**
 * The recovery screens: what a learner sees when the app cannot open.
 *
 * Plain English for the founder - two situations share one calm layout:
 * 1. SAVED DATA WOULD NOT LOAD (a damaged value, a failed upgrade or a storage
 *    error; or loading took over 8 seconds). Before 1.24 the app sat on the
 *    splash screen forever. Now it says so, with three ways out:
 *      "Try again"    reads the saved data again (the usual fix); the screen stays
 *                     up, saying "Trying again…", until it loads or fails again
 *      "Report this"  opens the learner's email app with a short support note
 *                     (app version and phone system only; no personal data)
 *      "Start fresh"  erases ONLY the saved data that would not open (the rest
 *                     is kept). It asks first, names what it erases and says
 *                     it cannot be undone. Never silent. Not offered when
 *                     nothing failed (the load was only slow).
 * 2. A SCREEN CRASHED while drawing (ErrorBoundary below, wired up in
 *    app/_layout.tsx). Same layout; "Try again" draws the screen again.
 *
 * Built to work when nothing else has loaded: it uses only the theme, the
 * lockup and plain buttons, not the stores' data. Branded (the lockup),
 * 48pt+ buttons, one solid button, text that survives 200% font scale.
 */
import { useState, useSyncExternalStore } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sayLater } from '../lib/a11y';
import { config } from '../lib/config';
import { freshTargetsKey, reportLoadProblem, startFresh } from '../lib/recovery';
import { subscribeHydration } from '../store/hydration';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { KaisipLockup } from './brand';
import { Button, Gap, T } from './ui';

export const RECOVERY_COPY = {
  loadTitle: 'We couldn’t open your saved progress',
  loadBody: 'Your study is still on this phone. Try again first. If it keeps happening, tell us, and we will help.',
  crashTitle: 'Something went wrong on this screen',
  crashBody: 'Your saved progress is safe. Try again, and if it keeps happening, tell us.',
  freshTitle: 'Start fresh?',
  freshConfirm: 'Erase and start fresh',
  freshFailed: 'We couldn’t erase the saved data. Please tell us, and we will help.',
};

/** Each saved store in plain words, for the "Start fresh?" question (store names: store/useHydrated.ts). */
export const STORE_WORDS: Record<string, string> = {
  progress: 'your study progress (answers, reviews and plans)',
  settings: 'your settings (exam date, reminders and choices)',
  session: 'your unfinished study session',
  backup: 'the copy kept for Undo restore',
  seen: 'the record of what the app has already shown you',
};

/** "This erases your settings on this phone…": exactly what Start fresh clears, and that the rest is kept. */
export function freshBody(names: readonly string[]): string {
  const words = names.map((n) => STORE_WORDS[n] ?? n);
  const list = words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
  return `This erases ${list} on this phone and cannot be undone. Everything else stays as it is. Only do this if Try again does not work.`;
}

export function RecoveryScreen({
  kind,
  onTryAgain,
  retrying = false,
}: {
  /** 'load' = saved data would not open; 'crash' = a screen failed to draw. */
  kind: 'load' | 'crash';
  onTryAgain: () => void;
  /**
   * "Try again" is reading the saved data again (UX review S9): the screen stays up and the button
   * says "Trying again…" (disabled) instead of the app showing a blank page while it loads.
   */
  retrying?: boolean;
}) {
  const { c } = useTheme();
  const [note, setNote] = useState<string | null>(null);
  const [erasing, setErasing] = useState(false);
  const busy = erasing || retrying;
  // A note appears in place of nothing: say it as well (UX review B2; WCAG 4.1.3). When no email app
  // opens it holds the support address, the learner's only way out, so it must never be silent.
  const show = (s: string) => {
    setNote(s);
    sayLater(s);
  };
  const load = kind === 'load';
  // The stores that failed to load (empty when loading was only slow: then there is nothing to erase).
  const failedKey = useSyncExternalStore(subscribeHydration, freshTargetsKey, freshTargetsKey);
  const failedNames = failedKey ? failedKey.split(',') : [];

  const report = async () => {
    const result = await reportLoadProblem(load ? 'Saved data would not open' : 'A screen crashed');
    show(result === 'opened' ? 'Your email app is open. Send the note when you are ready.' : `We couldn’t open an email app. You can write to us at ${config.feedbackEmail}.`);
  };

  // Always asks first. The erase itself lives in lib/recovery.ts.
  const confirmFresh = () =>
    Alert.alert(RECOVERY_COPY.freshTitle, freshBody(failedNames), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: RECOVERY_COPY.freshConfirm,
        style: 'destructive',
        onPress: () => {
          setErasing(true);
          startFresh()
            .catch(() => show(RECOVERY_COPY.freshFailed))
            .finally(() => setErasing(false));
        },
      },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: space.gutter }}>
        <KaisipLockup height={32} />
        <Gap h={space.xl} />
        <T v="hero" accessibilityRole="header">{load ? RECOVERY_COPY.loadTitle : RECOVERY_COPY.crashTitle}</T>
        <T v="body" style={{ marginTop: space.sm }}>{load ? RECOVERY_COPY.loadBody : RECOVERY_COPY.crashBody}</T>
        {note && (
          <T v="small" accessibilityRole="text" style={{ marginTop: space.md }}>{note}</T>
        )}
        <Gap h={space.xl} />
        <View style={{ gap: space.sm }}>
          <Button label={retrying ? 'Trying again…' : 'Try again'} onPress={onTryAgain} disabled={busy} />
          <Button kind="secondary" label="Report this" onPress={report} disabled={busy} accessibilityHint="Opens your email app with a short note. No personal data is included." />
          {load && failedNames.length > 0 && (
            <Button kind="ghost" label="Start fresh" onPress={confirmFresh} disabled={busy} accessibilityHint="Asks first. Erases only the saved data that would not open." />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
