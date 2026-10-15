/**
 * The recovery screens: what a learner sees when the app cannot open.
 *
 * Plain English for the founder - two situations share one calm layout:
 * 1. SAVED DATA WOULD NOT LOAD (a damaged value, a failed upgrade or a storage
 *    error; or loading took over 8 seconds). Before 1.24 the app sat on the
 *    splash screen forever. Now it says so, with three ways out:
 *      "Try again"    reads the saved data again (the usual fix)
 *      "Report this"  opens the learner's email app with a short support note
 *                     (app version and phone system only; no personal data)
 *      "Start fresh"  erases the saved data on the phone and starts new. It
 *                     asks first and says it cannot be undone. Never silent.
 * 2. A SCREEN CRASHED while drawing (ErrorBoundary below, wired up in
 *    app/_layout.tsx). Same layout; "Try again" draws the screen again.
 *
 * Built to work when nothing else has loaded: it uses only the theme, the
 * lockup and plain buttons, not the stores' data. Branded (the lockup),
 * 48pt+ buttons, one solid button, text that survives 200% font scale.
 */
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config } from '../lib/config';
import { reportLoadProblem, startFresh } from '../lib/recovery';
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
  freshBody: 'This erases all saved progress on this phone and cannot be undone. Only do this if Try again does not work.',
  freshConfirm: 'Erase and start fresh',
  freshFailed: 'We couldn’t erase the saved data. Please tell us, and we will help.',
};

export function RecoveryScreen({
  kind,
  onTryAgain,
}: {
  /** 'load' = saved data would not open; 'crash' = a screen failed to draw. */
  kind: 'load' | 'crash';
  onTryAgain: () => void;
}) {
  const { c } = useTheme();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = kind === 'load';

  const report = async () => {
    const result = await reportLoadProblem(load ? 'Saved data would not open' : 'A screen crashed');
    setNote(result === 'opened' ? 'Your email app is open. Send the note when you are ready.' : `We couldn’t open an email app. You can write to us at ${config.feedbackEmail}.`);
  };

  // Always asks first. The erase itself lives in lib/recovery.ts.
  const confirmFresh = () =>
    Alert.alert(RECOVERY_COPY.freshTitle, RECOVERY_COPY.freshBody, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: RECOVERY_COPY.freshConfirm,
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          startFresh()
            .catch(() => setNote(RECOVERY_COPY.freshFailed))
            .finally(() => setBusy(false));
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
          <Button label="Try again" onPress={onTryAgain} disabled={busy} />
          <Button kind="secondary" label="Report this" onPress={report} disabled={busy} accessibilityHint="Opens your email app with a short note. No personal data is included." />
          {load && (
            <Button kind="ghost" label="Start fresh" onPress={confirmFresh} disabled={busy} accessibilityHint="Asks first. Erases saved progress on this phone." />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
