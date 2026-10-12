/**
 * Settings — certification, exam date, your study (mobile 1.15: daily time, where you're
 * starting from, the Exam-focused plan), appearance, reminders, haptics, show badges,
 * your plant (mobile 1.13: Show my plant, Quiet look), study defaults (the practice timer),
 * your data (backup, restore, reset), one row to
 * Help and feedback (mobile 1.7), and the legal notices required for store review. Groups are
 * sections with hairline rows, not cards (spec §5).
 */
import Constants from 'expo-constants';
import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Linking, Platform, View } from 'react-native';
import { BrandLockup, PillarList } from '../components/brand';
import { creditSubtitle } from '../components/help';
import { ICON_STROKE, LifeBuoy } from '../components/icons';
import { ThemeSwitch } from '../components/themeSwitch';
import { useSystemReducedMotion } from '../components/motion';
import { YourData } from '../components/yourData';
import { YourStudy } from '../components/fit';
import { examFocusedOf, KEEP_TODAY_LINE } from '../engine/fit';
import { Button, Chip, Gap, ICON_SIZE, ListRow, PushedHeader, RadioRow, Screen, Section, Stepper, T, ToggleRow } from '../components/ui';
import { MODE_INFO, STUDY_MODES } from '../engine/studyModes';
import { TAGLINE, VISION_LINE } from '../content/brand';
import { CERTIFICATIONS, combinedTrademarkNotice } from '../content/certifications';
import { addDays, dateInMonths, EXAM_DATE_PRESETS, examDateLabel, presetIndexFor } from '../engine/examDay';
import { dayKey } from '../engine/streak';
import { changeExamDate, changeFit } from '../lib/activity';
import { sayLater } from '../lib/a11y';
import { hideBadges, showBadgesAgain, shownAgainLine } from '../lib/badges';
import { config } from '../lib/config';
import {
  DAY_CHIPS,
  localHour,
  localTime,
  MINUTE_STEP,
  reminderDays,
  reminderSummary,
  stepTime,
  toggleDay,
  type ReminderPrefs,
} from '../engine/reminders';
import { cancelReminders, ensurePermission, remindersSupported, scheduleReminders } from '../lib/reminders';
import { useActiveCert } from '../lib/useActiveCert';
import { useReports } from '../lib/useReports';
import { sweepBackupFiles } from '../lib/backup';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { dailyMinutesOf, useSettings } from '../store/settings';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** The phone's own name for the setting (Android has no "Reduce Motion"). */
const phoneSetting = () => (Platform.OS === 'android' ? 'Remove animations' : 'Reduce Motion');
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
  // The phone's own Reduce Motion, live: Settings says when it already applies.
  const phoneReduced = useSystemReducedMotion();
  // Help and feedback (mobile 1.7): the row says so when a report's update hasn't been seen yet.
  const { dueItems } = useReports();
  const resetCert = useProgress((p) => p.resetCert);
  // Mobile 1.13: the plant switches (for every exam), and whether this exam has a plant (the Reset line).
  const plantSettings = useProgress((p) => p.plantSettings);
  const setPlantSettings = useProgress((p) => p.setPlantSettings);
  const hasPlant = useProgress((p) => Boolean(selectCert(p, cert.id).plant));
  const plantOn = plantSettings?.showPlant !== false;
  const clearSession = useSession((x) => x.clear);
  const [busy, setBusy] = useState(false);
  // "Badges are on again…": shown for this visit, right under the switch.
  const [badgesLine, setBadgesLine] = useState<string | null>(null);
  // Mobile 1.15: a change to Your study rebuilds today's plan only if nothing
  // in it is ticked yet; otherwise this visit says so in one line.
  const [keptToday, setKeptToday] = useState(false);
  const fit = (p: Parameters<typeof changeFit>[1]) => setKeptToday(changeFit(cert.id, p).keptToday);
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

  // Permission is asked ONLY here, when the learner turns reminders on.
  const toggleReminder = async (enabled: boolean) => {
    setBusy(true);
    try {
      if (enabled) {
        if (!(await ensurePermission())) {
          Alert.alert('Notifications are off', 'Allow notifications for Aurivan in your phone settings to get reminders.');
          return;
        }
        // Read the CURRENT choice after the permission prompt, not the one
        // captured when the switch was tapped (the learner may have changed it).
        await scheduleReminders({ ...useSettings.getState().reminder, enabled: true }, cert.name);
      } else {
        await cancelReminders();
      }
      useSettings.getState().setReminder({ ...useSettings.getState().reminder, enabled });
    } finally {
      setBusy(false);
    }
  };
  // Time or days changed: save, and if reminders are on, replace ours (no new
  // prompt). Changes always start from the saved state, so quick taps stack;
  // lib/reminders.ts runs the re-schedules one at a time, last one wins.
  const updateReminder = (change: (r: ReminderPrefs) => Partial<ReminderPrefs>) => {
    const cur = useSettings.getState().reminder;
    const next = { ...cur, ...change(cur) };
    useSettings.getState().setReminder(next);
    if (next.enabled) scheduleReminders(next, cert.name).catch(() => {});
  };
  // Which way the time last moved: both steppers roll that way (the hour also
  // moves when the minutes wrap past :00).
  const [timeDir, setTimeDir] = useState<1 | -1>(1);
  const moveTime = (deltaMinutes: number) => {
    setTimeDir(deltaMinutes < 0 ? -1 : 1);
    updateReminder((r) => stepTime(r.hour, r.minute, deltaMinutes));
  };
  const days = reminderDays(s.reminder.days);

  const confirmReset = () =>
    Alert.alert(
      `Reset ${cert.name} progress?`,
      `This deletes your answers, reviews, saved questions, mock history, badges and game levels for this exam. It cannot be undone. Save a backup first if you might want it back.${hasPlant && plantOn ? ' Your plant goes back to a seed. It keeps its name and look.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetCert(cert.id);
            clearSession();
            // A reset is a fresh start: an old "Undo restore" no longer applies,
            // and old backup files in the app's cache are tidied away.
            useBackup.getState().setUndo(null);
            sweepBackupFiles();
          },
        },
      ],
    );

  const reminderText = remindersSupported ? reminderSummary(s.reminder) : 'Available in the installed app, not Expo Go on Android.';

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

      {/* Mobile 1.15 (PHASE5.md §2.8): Your study replaces "Daily goal" (questions a day). */}
      <Section title="Your study" />
      <YourStudy
        minutes={dailyMinutesOf(s)}
        familiarity={s.familiarity}
        examFocused={examFocusedOf(s)}
        onMinutes={(dailyMinutes) => fit({ dailyMinutes })}
        onFamiliarity={(familiarity) => fit({ familiarity })}
        onExamFocused={(examFocused) => fit({ examFocused })}
        keptLine={keptToday ? KEEP_TODAY_LINE : null}
      />

      <Section title="Appearance" />
      <Gap h={space.sm} />
      <ThemeSwitch />

      {/* Motion (mobile 1.8, WCAG 2.3.3): the phone's own setting, or Reduced
          for this app only. Reduced swaps slides and springs for short fades,
          and growth shows its end state: the same information, less movement. */}
      <Section title="Motion" />
      <View accessibilityRole="radiogroup" accessibilityLabel="Motion">
        <RadioRow
          title="Match my phone"
          subtitle={
            phoneReduced
              ? `Your phone’s ${phoneSetting()} is on, so movement is already reduced.`
              : `Calm movement that shows what changed. Follows your phone’s ${phoneSetting()} setting.`
          }
          checked={s.motion !== 'reduced'}
          onPress={() => s.setMotion('system')}
        />
        <RadioRow
          title="Reduced"
          subtitle="Short fades instead of slides; growth shows its end state."
          checked={s.motion === 'reduced'}
          onPress={() => s.setMotion('reduced')}
          last
        />
      </View>

      <Section title="Study" />
      <ToggleRow
        title="Study reminder"
        subtitle={reminderText}
        value={remindersSupported && s.reminder.enabled}
        disabled={busy || !remindersSupported}
        onValueChange={toggleReminder}
      />
      {remindersSupported && (
        // Time and days. You can set them before turning reminders on; nothing is asked until then.
        <View style={{ paddingVertical: space.md, gap: space.md }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xl }}>
            {/* Shown and spoken in the phone's time format ("7 PM" / "19", "7:00 PM"). */}
            <Stepper
              label="Hour"
              spokenLabel="Reminder hour"
              dir={timeDir}
              value={localHour(s.reminder.hour)}
              spoken={localTime(s.reminder.hour, s.reminder.minute)}
              disabled={busy}
              onDec={() => moveTime(-60)}
              onInc={() => moveTime(60)}
            />
            <Stepper
              label="Minutes"
              spokenLabel="Reminder minutes"
              dir={timeDir}
              value={String(s.reminder.minute).padStart(2, '0')}
              spoken={localTime(s.reminder.hour, s.reminder.minute)}
              disabled={busy}
              onDec={() => moveTime(-MINUTE_STEP)}
              onInc={() => moveTime(MINUTE_STEP)}
            />
          </View>
          <T v="caption">Days</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: -space.sm }}>
            {DAY_CHIPS.map((d) => {
              const on = days.includes(d.day);
              // The last day left can't be turned off: say why, and point to the switch.
              const last = on && days.length === 1;
              return (
                <Chip
                  key={d.day}
                  checkbox
                  label={d.short}
                  accessibilityLabel={`Remind on ${d.long}`}
                  accessibilityHint={last ? 'At least one day stays on. Use the switch to stop reminders.' : undefined}
                  selected={on}
                  disabled={busy}
                  onPress={() => updateReminder((r) => ({ days: toggleDay(r.days, d.day) }))}
                />
              );
            })}
          </View>
          {/* While off, say these choices wait for the switch (nothing is scheduled yet). */}
          <T v="meta">{s.reminder.enabled ? 'At most one reminder a day. Turn it off any time.' : 'Applies when reminders are on. At most one a day.'}</T>
        </View>
      )}
      <ToggleRow title="Shuffle answer options" subtitle="Stops you memorizing letters." value={s.shuffleOptions} onValueChange={s.setShuffle} />
      <ToggleRow title="Haptics" subtitle="Gentle taps when you answer." value={s.haptics} onValueChange={s.setHaptics} />
      {/* Mobile 1.10: badges are optional. Off = no badge moments, no Badges row
          on You, no "new" dot; they are still earned quietly, and switching back
          on says how many arrived, in one line (never a burst of moments). */}
      <ToggleRow
        title="Show badges"
        subtitle="A short moment when you earn one, and Badges on You. Off: you still earn them, quietly."
        value={!s.badgesHidden}
        onValueChange={(on) => {
          if (on) {
            const line = shownAgainLine(showBadgesAgain());
            setBadgesLine(line);
            sayLater(line);
          } else {
            setBadgesLine(null);
            hideBadges();
          }
        }}
        last
      />
      {badgesLine && (
        <T v="meta" color={c.accentText} style={{ marginTop: space.xs }}>
          {badgesLine}
        </T>
      )}

      {/* Mobile 1.13: the plant is optional. Off = no plant anywhere and no
          prompts (its growth is still kept, so turning it back on shows the
          truth). Quiet look = the same plant without a face. */}
      <Section title="Your plant" />
      <ToggleRow
        title="Show my plant"
        subtitle="A plant on Today and You that grows only from real progress. Off: no plant and no prompts. Its growth is kept."
        value={plantOn}
        onValueChange={(on) => setPlantSettings({ showPlant: on })}
        last={!plantOn}
      />
      {plantOn && (
        <ToggleRow
          title="Quiet look"
          subtitle="Your plant without a face."
          value={plantSettings?.quietLook === true}
          onValueChange={(on) => setPlantSettings({ quietLook: on })}
          last
        />
      )}

      {/* Study defaults: what practice starts with. Build D: the timer.
          Build E: the default study mode (the same choice Practice remembers). */}
      <Section title="Study defaults" />
      <ToggleRow
        title="Timed practice"
        subtitle="Every practice session starts with a timer that counts up while you answer. Never a countdown. Practice's own switch can change it for one set."
        value={s.practiceTimer}
        onValueChange={s.setPracticeTimer}
      />
      <T v="caption" style={{ marginTop: space.lg }}>Default mode</T>
      <View accessibilityRole="radiogroup" accessibilityLabel="Default study mode">
        <RadioRow
          title="Let the app choose"
          subtitle="It changes as you go: a mixed start, then topic by topic, then a smart mix of what you need."
          checked={!s.studyMode}
          onPress={() => s.setStudyMode(undefined)}
        />
        {STUDY_MODES.map((m, i) => (
          <RadioRow
            key={m}
            title={MODE_INFO[m].name}
            subtitle={MODE_INFO[m].why}
            checked={s.studyMode === m}
            onPress={() => s.setStudyMode(m)}
            last={i === STUDY_MODES.length - 1}
          />
        ))}
      </View>

      {/* Backup and restore (Build C): save a file, restore one, undo for 7 days. Free, offline, no account. */}
      <YourData />

      <Gap h={space.xl} />
      <Button kind="danger" label={`Reset ${cert.name} progress`} onPress={confirmReset} />

      {/* Help and feedback (mobile 1.7): ONE row to the Help screen (UX review O2),
          where Common questions, Contact support, Report a problem, ideas, Your
          reports, What's new and What's next live (Apple 1.5: easy contact). */}
      <Section title="Help and feedback" />
      <ListRow
        icon={<LifeBuoy size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
        // The same row as You's, so the way to Help reads the same everywhere.
        title="Get help or send feedback"
        subtitle={dueItems ? creditSubtitle(dueItems) : 'Common questions, reports and what’s new'}
        onPress={() => router.push('/help')}
        last
      />

      <Section title="About" />
      <Gap h={space.md} />
      {/* Our vision: the same promise as the welcome screen (content/brand.ts). */}
      <BrandLockup tone={isDark ? 'dark' : 'light'} height={28} />
      <Gap h={space.lg} />
      <T v="caption" color={c.accentText} accessibilityRole="header">Our vision</T>
      <T v="hero" style={{ marginTop: space.xs }}>{TAGLINE}</T>
      <T v="quote" color={c.ink2} style={{ marginTop: space.xs }}>{VISION_LINE}</T>
      <Gap h={space.lg} />
      <PillarList look="rows" />
      <Gap h={space.xl} />
      <T v="meta">
        Aurivan v{Constants.expoConfig?.version ?? '1.0.0'} · Original practice questions written for exam preparation. Progress is stored only on this device.
      </T>
      <Gap h={space.sm} />
      {/* Every certification named anywhere in the app (coming-soon chips too) needs its trademark notice;
          one combined line instead of five near-identical ones. */}
      <T v="meta">{combinedTrademarkNotice(CERTIFICATIONS)}</T>
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
