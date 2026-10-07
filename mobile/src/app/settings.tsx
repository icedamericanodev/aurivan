/**
 * Settings — certification, appearance, study goal, reminders, haptics,
 * data, and the legal notices required for store review. Groups are
 * sections with hairline rows, not cards (spec §5).
 */
import Constants from 'expo-constants';
import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Linking, View } from 'react-native';
import { ThemeSwitch } from '../components/themeSwitch';
import { Button, Chip, Gap, PushedHeader, Screen, Section, Segmented, T, ToggleRow } from '../components/ui';
import { CERTIFICATIONS } from '../content/certifications';
import { config } from '../lib/config';
import { cancelReminders, ensurePermission, remindersSupported, scheduleDailyReminder } from '../lib/reminders';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { space } from '../theme/tokens';

const GOALS = [10, 20, 40];

export default function Settings() {
  const { cert } = useActiveCert();
  const s = useSettings();
  const resetCert = useProgress((p) => p.resetCert);
  const clearSession = useSession((x) => x.clear);
  const [busy, setBusy] = useState(false);

  const toggleReminder = async (enabled: boolean) => {
    setBusy(true);
    try {
      if (enabled) {
        if (!(await ensurePermission())) {
          Alert.alert('Notifications are off', 'Allow notifications for Aurivan in your phone settings to get reminders.');
          return;
        }
        await scheduleDailyReminder(s.reminder.hour, s.reminder.minute, cert.name);
      } else {
        await cancelReminders();
      }
      s.setReminder({ ...s.reminder, enabled });
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = () =>
    Alert.alert(`Reset ${cert.name} progress?`, 'This deletes your answers, reviews, saved questions and mock history for this exam. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetCert(cert.id);
          clearSession();
        },
      },
    ]);

  const reminderText = remindersSupported
    ? `Every day at ${String(s.reminder.hour).padStart(2, '0')}:${String(s.reminder.minute).padStart(2, '0')}`
    : 'Available in the installed app, not Expo Go on Android.';

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Same pushed header as Saved and Mistakes: the title lives in the bar. */}
      <PushedHeader title="Settings" onBack={() => router.back()} />

      <Section title="Certification" />
      <Gap h={space.sm} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {CERTIFICATIONS.map((x) => (
          <Chip
            key={x.id}
            label={x.status === 'available' ? x.name : `${x.name} · soon`}
            selected={s.activeCertId === x.id}
            onPress={() =>
              x.status === 'available'
                ? s.setActiveCert(x.id)
                : Alert.alert(`${x.name} is coming soon`, 'We are writing original questions for it now.')
            }
          />
        ))}
      </View>

      {/* Same setting as the switch at the top of You: they always agree. */}
      <Section title="Appearance" />
      <Gap h={space.sm} />
      <ThemeSwitch />

      <Section title="Daily goal" />
      <Gap h={space.sm} />
      <Segmented
        accessibilityLabel="Daily goal"
        value={s.dailyGoal}
        onChange={s.setDailyGoal}
        options={GOALS.map((g) => ({ value: g, numeral: String(g), label: 'a day', spoken: `${g} questions a day` }))}
      />

      <Section title="Study" />
      <ToggleRow
        title="Daily reminder"
        subtitle={reminderText}
        value={remindersSupported && s.reminder.enabled}
        disabled={busy || !remindersSupported}
        onValueChange={toggleReminder}
      />
      <ToggleRow title="Shuffle answer options" subtitle="Stops you memorising letters." value={s.shuffleOptions} onValueChange={s.setShuffle} />
      <ToggleRow title="Haptics" subtitle="Gentle taps when you answer." value={s.haptics} onValueChange={s.setHaptics} last />

      <Gap h={space.xl} />
      <Button kind="danger" label={`Reset ${cert.name} progress`} onPress={confirmReset} />

      <Section title="About" />
      <Gap h={space.sm} />
      <T v="meta">
        Aurivan v{Constants.expoConfig?.version ?? '1.0.0'} · Original practice questions written for exam preparation. Progress is stored only on this device.
      </T>
      <Gap h={space.sm} />
      {CERTIFICATIONS.filter((x) => x.status === 'available').map((x) => (
        <T key={x.id} v="meta">{x.trademarkNotice}</T>
      ))}
      <Gap h={space.sm} />
      {config.privacyUrl !== '' && (
        <Button kind="ghost" label="Privacy policy" onPress={() => Linking.openURL(config.privacyUrl)} style={{ alignSelf: 'flex-start' }} />
      )}
      {config.termsUrl !== '' && (
        <Button kind="ghost" label="Terms of use" onPress={() => Linking.openURL(config.termsUrl)} style={{ alignSelf: 'flex-start' }} />
      )}
    </Screen>
  );
}
