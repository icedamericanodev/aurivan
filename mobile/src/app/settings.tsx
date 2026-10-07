/**
 * Settings — certification, exam date, appearance, study goal, reminders, haptics,
 * data, and the legal notices required for store review. Groups are
 * sections with hairline rows, not cards (spec §5).
 */
import Constants from 'expo-constants';
import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Linking, View } from 'react-native';
import { BrandLockup, PillarList } from '../components/brand';
import { ThemeSwitch } from '../components/themeSwitch';
import { Button, Chip, Gap, PushedHeader, Screen, Section, Segmented, T, ToggleRow } from '../components/ui';
import { TAGLINE, VISION_LINE } from '../content/brand';
import { CERTIFICATIONS } from '../content/certifications';
import { addDays, dateInMonths, EXAM_DATE_PRESETS, examDateLabel, presetIndexFor } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { changeExamDate } from '../lib/activity';
import { config } from '../lib/config';
import { cancelReminders, ensurePermission, remindersSupported, scheduleDailyReminder } from '../lib/reminders';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const GOALS = [10, 20, 40];
/** Fine-tune the exam date: [chip label, days to move]. */
const DATE_STEPS: [string, number][] = [
  ['1 week earlier', -7],
  ['1 day earlier', -1],
  ['1 day later', 1],
  ['1 week later', 7],
];

export default function Settings() {
  const { cert } = useActiveCert();
  const { c, isDark } = useTheme();
  const s = useSettings();
  const resetCert = useProgress((p) => p.resetCert);
  const clearSession = useSession((x) => x.clear);
  const [busy, setBusy] = useState(false);
  // "Now" is read once per visit (render stays pure); presets move in months.
  const [now] = useState(() => Date.now());
  const examDate = s.examDates[cert.id];
  const presetIdx = presetIndexFor(examDate, now);
  // Step the date a day or a week at a time, never before today.
  const step = (days: number) => {
    if (!examDate) return;
    const next = addDays(examDate, days);
    changeExamDate(cert.id, next < dayKey(now) ? dayKey(now) : next);
  };

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

      {/* Exam date: the same presets as onboarding, plus day/week steps for
          the exact date (the exam-eve and exam-day plans depend on it).
          Changing it rebuilds today's plan for this cert. */}
      <Section title="Exam date" meta={examDate ? examDateLabel(examDate) : 'Not set'} />
      <Gap h={space.sm} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {EXAM_DATE_PRESETS.map((p, i) => (
          <Chip
            key={p.label}
            label={p.label}
            selected={presetIdx === i}
            onPress={() => changeExamDate(cert.id, p.months ? dateInMonths(p.months, now) : undefined)}
          />
        ))}
      </View>
      {examDate && (
        <>
          <Gap h={space.sm} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {DATE_STEPS.map(([label, days]) => (
              <Chip key={label} label={label} selected={false} onPress={() => step(days)} />
            ))}
          </View>
        </>
      )}

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
      <Gap h={space.md} />
      {/* Our vision: the same promise as the welcome screen (content/brand.ts). */}
      <BrandLockup tone={isDark ? 'dark' : 'light'} height={28} />
      <Gap h={space.lg} />
      <T v="caption" color={c.accentText}>Our vision</T>
      <T v="hero" accessibilityRole="header" style={{ marginTop: space.xs }}>{TAGLINE}</T>
      <T v="quote" color={c.ink2} style={{ marginTop: space.xs }}>{VISION_LINE}</T>
      <Gap h={space.lg} />
      <PillarList look="rows" />
      <Gap h={space.xl} />
      <T v="meta">
        Aurivan v{Constants.expoConfig?.version ?? '1.0.0'} · Original practice questions written for exam preparation. Progress is stored only on this device.
      </T>
      <Gap h={space.sm} />
      {/* Every certification named anywhere in the app (coming-soon chips too) needs its trademark notice. */}
      {CERTIFICATIONS.map((x) => (
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
