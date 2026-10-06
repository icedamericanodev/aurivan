/**
 * Settings — certification, appearance, study goal, reminders, data,
 * and the legal notices required for store review.
 */
import Constants from 'expo-constants';
import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, View } from 'react-native';
import { Button, Card, Chip, Gap, Row, Screen, T, Toggle } from '../components/ui';
import { CERTIFICATIONS } from '../content/certifications';
import { config } from '../lib/config';
import { cancelReminders, ensurePermission, remindersSupported, scheduleDailyReminder } from '../lib/reminders';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings, type ThemePref } from '../store/settings';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const THEMES: { label: string; value: ThemePref }[] = [
  { label: 'System', value: 'system' },
  { label: 'Dark', value: 'dark' },
  { label: 'Light', value: 'light' },
];
const GOALS = [10, 20, 40];

export default function Settings() {
  const { c } = useTheme();
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

  return (
    <Screen edges={['top', 'bottom']}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignSelf: 'flex-start' }}
      >
        <T v="label" color={c.accentText}>‹ Back</T>
      </Pressable>
      <Gap h={space.sm} />
      <T v="display">Settings</T>
      <Gap />

      <T v="title">Certification</T>
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
      <Gap />

      <T v="title">Appearance</T>
      <Gap h={space.sm} />
      <Row gap={space.sm}>
        {THEMES.map((t) => (
          <Chip key={t.value} label={t.label} selected={s.theme === t.value} onPress={() => s.setTheme(t.value)} />
        ))}
      </Row>
      <Gap />

      <T v="title">Daily goal</T>
      <Gap h={space.sm} />
      <Row gap={space.sm}>
        {GOALS.map((g) => (
          <Chip key={g} label={`${g} / day`} selected={s.dailyGoal === g} onPress={() => s.setDailyGoal(g)} />
        ))}
      </Row>
      <Gap />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T v="title">Daily reminder</T>
            <T v="meta">
              {remindersSupported
                ? `Every day at ${String(s.reminder.hour).padStart(2, '0')}:${String(s.reminder.minute).padStart(2, '0')}`
                : 'Available in the installed app, not Expo Go on Android.'}
            </T>
          </View>
          <Toggle
            accessibilityLabel="Daily study reminder"
            value={remindersSupported && s.reminder.enabled}
            disabled={busy || !remindersSupported}
            onValueChange={toggleReminder}
          />
        </Row>
        <Gap h={space.md} />
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T v="title">Shuffle answer options</T>
            <T v="meta">Stops you memorising letters.</T>
          </View>
          <Toggle accessibilityLabel="Shuffle answer options" value={s.shuffleOptions} onValueChange={s.setShuffle} />
        </Row>
      </Card>
      <Gap />

      <Button kind="danger" label={`Reset ${cert.name} progress`} onPress={confirmReset} />
      <Gap h={space.xl} />

      <T v="title">About</T>
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
        <Button kind="ghost" label="Privacy policy" onPress={() => Linking.openURL(config.privacyUrl)} />
      )}
      {config.termsUrl !== '' && (
        <Button kind="ghost" label="Terms of use" onPress={() => Linking.openURL(config.termsUrl)} />
      )}
    </Screen>
  );
}
