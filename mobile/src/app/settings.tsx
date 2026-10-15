/**
 * Settings (mobile 1.17, "a tidy Settings"): one calm list in titled groups.
 * Each row shows its CURRENT value with a chevron and opens a bottom sheet
 * with the choices (components/settings.tsx); simple on/off settings stay
 * switches in place. Nothing a learner set before is lost; only where it
 * lives on screen changed.
 *
 *   You                   Your name (mobile 1.23: what Today calls you; optional, only on this phone)
 *   Exam                  Certification · Exam date (a calendar, components/calendar.tsx)
 *   Your study            Daily time · Starting point · Exam-focused plan
 *   Practice              Default mode · Timed practice · Shuffle answer options
 *   Reminders             Study reminder · Time and days
 *   Appearance            Theme · Motion · Haptics
 *   Badges and your plant Show badges · Show my plant · Quiet look
 *   Your data             Save a backup · Restore · (Undo restore), then Reset, set apart
 *   Help and about        Get help or send feedback · About KaiSip · Privacy · Terms · Check for updates
 *
 * Mobile 1.19: "Check for updates" (lib/updates.ts) sits last in Help and
 * about, only where over-the-air updates work (an installed APK or store
 * build; hidden in Expo Go, dev builds and on the web). One tap checks,
 * downloads, and offers "Restart to update". Under the version line, the
 * "Update … · …" stamp says which update this phone runs, for support.
 *
 * Deep links: `?open=exam-date` opens the calendar (Today's and exam week's
 * "Set exam date"); on iOS once the push transition has ended, and its
 * Save or Cancel goes back to where the learner came from. `?section=plant`
 * opens at Badges and your plant (the plant screens' "Open Settings").
 *
 * Theme lives only here since 1.17 (the owner found the switch on You
 * redundant once Settings was tidy).
 *
 * Uplift Phase 6 (accounts, built OFF): in a cloud build only, an Account
 * group sits above Your data, and About's last sentence follows the account
 * (components/account.tsx). With the flag off nothing here changes.
 */
import Constants from 'expo-constants';
import { useEffect, useRef, useState, type RefObject } from 'react';
import * as ExpoRouter from 'expo-router';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Platform, View, type ScrollView } from 'react-native';
import { aboutLine, AccountSettingsGroup } from '../components/account';
import { BoardSettingsGroup } from '../components/board';
import { useSyncing } from '../lib/sync';
import { KaisipLockup, PillarList } from '../components/brand';
import { CLOUD } from '../cloud/flag';
import { copy as cloudCopy } from '../content/cloud/copy';
import { undoAvailable } from '../engine/backup';
import { CalendarSheet } from '../components/calendar';
import { DisplayNameField } from '../components/displayName';
import { cleanDisplayName } from '../engine/displayName';
import { EXAM_FOCUSED_SUBTITLE, EXAM_FOCUSED_TITLE, FAMILIARITY_QUESTION } from '../components/fit';
import { creditSubtitle } from '../components/help';
import { useMotion, useSystemReducedMotion } from '../components/motion';
import { ChoiceSheet, SettingsGroup, SettingsRow, Sheet } from '../components/settings';
import { YourData } from '../components/yourData';
import { Button, Chip, Gap, PushedHeader, Screen, Stepper, T, ToggleRow } from '../components/ui';
import { spokenDate } from '../engine/calendar';
import { DAILY_MINUTES, examFocusedOf, FAMILIARITIES, FAMILIARITY_INFO, KEEP_TODAY_LINE, minutesLabel, minutesSpoken, type DailyMinutes, type Familiarity } from '../engine/fit';
import { MODE_INFO, STUDY_MODES, type StudyMode } from '../engine/studyModes';
import { TAGLINE, VISION_LINE } from '../content/brand';
import { CERTIFICATIONS, combinedTrademarkNotice } from '../content/certifications';
import { examDateLabel } from '../engine/examDay';
import { changeExamDate, changeFit } from '../lib/activity';
import { moveFocus, sayLater } from '../lib/a11y';
import { hideBadges, showBadgesAgain, shownAgainLine } from '../lib/badges';
import { config } from '../lib/config';
import { DAY_CHIPS, localHour, localTime, MINUTE_STEP, reminderDays, reminderSummary, stepTime, toggleDay, type ReminderPrefs } from '../engine/reminders';
import { cancelReminders, ensurePermission, remindersSupported } from '../lib/reminders';
import { refreshReminders } from '../lib/reminderSync';
import { runningUpdateLine, useUpdateCheck } from '../lib/updates';
import { UPDATE_WORDS } from '../engine/updates';
import { useActiveCert } from '../lib/useActiveCert';
import { useReports } from '../lib/useReports';
import { sweepBackupFiles } from '../lib/backup';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { dailyMinutesOf, useSettings, type MotionPref, type ThemePref } from '../store/settings';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** The phone's own name for the setting (Android has no "Reduce Motion"). */
const phoneSetting = () => (Platform.OS === 'android' ? 'Remove animations' : 'Reduce Motion');

/** Which sheet is open (one at a time). */
type SheetId = 'name' | 'exam' | 'date' | 'minutes' | 'start' | 'mode' | 'remind' | 'theme' | 'motion' | 'about';

/** "Starting point" values short enough to sit beside the title; the sheet and screen readers use the full titles. */
const START_SHORT: Record<Familiarity, string> = { new: 'New to audit', some: 'Some experience', experienced: 'Experienced' };
const THEME_NAME: Record<ThemePref, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const MOTION_NAME: Record<MotionPref, string> = { system: 'Match my phone', reduced: 'Reduced' };
const AUTO_MODE = 'auto';

/**
 * iOS: how long to wait for the push transition's end before opening the
 * deep-linked calendar anyway (a push takes about 350 ms; this covers a slow
 * one, and a screen that had no transition at all).
 */
export const LINK_OPEN_FALLBACK_MS = 700;

/** The part of this screen's navigation used here: the stack's "transition ended" event. */
type TransitionEvents = { addListener?: (type: 'transitionEnd', cb: (e: { data?: { closing?: boolean } }) => void) => () => void };
/** This screen's own navigation (absent where a test's expo-router stand-in has none). */
const useOwnNavigation: () => TransitionEvents | undefined =
  (ExpoRouter as { useNavigation?: () => TransitionEvents }).useNavigation ?? (() => undefined);

export default function Settings() {
  // Cloud builds only: true while this phone syncs (About says so). Always false with the flag off.
  const syncing = useSyncing();
  const { cert } = useActiveCert();
  const { c } = useTheme();
  const s = useSettings();
  const { reduced } = useMotion();
  // The phone's own Reduce Motion, live: the Motion sheet says when it already applies.
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
  // Mobile 1.19: "Check for updates" (one tap = one check; nothing runs on its own).
  const updates = useUpdateCheck();
  const updateWords = UPDATE_WORDS[updates.phase];
  // The last row of Help and about has no hairline: Check for updates when shown, else Terms, Privacy or About.
  const lastHelpRow = updates.available ? 'updates' : config.termsUrl !== '' ? 'terms' : config.privacyUrl !== '' ? 'privacy' : 'about';
  // "Badges are on again…": shown for this visit, right under the switch.
  const [badgesLine, setBadgesLine] = useState<string | null>(null);

  // Deep links: open the calendar, or start at the plant's group.
  const params = useLocalSearchParams<{ open?: string; section?: string }>();
  const navigation = useOwnNavigation();
  // "Now" for the calendar: read again each time it opens, so a Settings
  // screen left open past midnight never offers yesterday (render stays pure:
  // it is only read in handlers and effects).
  const [now, setNow] = useState(() => Date.now());
  // ?open=exam-date: on Android (and web) the calendar is up from the first frame, as before.
  const linkNow = params.open === 'exam-date' && Platform.OS !== 'ios';
  const [sheet, setSheet] = useState<SheetId | null>(() => (linkNow ? 'date' : null));
  // True while the calendar the link opened is up: its Save or Cancel goes back to where the learner came from.
  const fromLink = useRef(linkNow);
  // iOS presents a sheet from the screen itself; one presented during the
  // push transition can be dropped (and then can't open until the learner
  // leaves). So wait for the transition to end, with a short fallback.
  useEffect(() => {
    if (params.open !== 'exam-date' || Platform.OS !== 'ios') return;
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      fromLink.current = true;
      setNow(Date.now());
      setSheet('date');
    };
    const off = navigation?.addListener?.('transitionEnd', (e) => {
      if (!e.data?.closing) show();
    });
    const fallback = setTimeout(show, LINK_OPEN_FALLBACK_MS);
    return () => {
      done = true;
      off?.();
      clearTimeout(fallback);
    };
    // Read once, when Settings opens (each push is a fresh screen).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const scrollRef = useRef<ScrollView>(null);
  const scrolled = useRef(false);
  // Each row that opens a sheet gets screen-reader focus back when its sheet closes.
  const nameRow = useRef<View>(null);
  const examRow = useRef<View>(null);
  const dateRow = useRef<View>(null);
  const minutesRow = useRef<View>(null);
  const startRow = useRef<View>(null);
  const modeRow = useRef<View>(null);
  const remindRow = useRef<View>(null);
  const themeRow = useRef<View>(null);
  const motionRow = useRef<View>(null);
  const aboutRow = useRef<View>(null);
  // "Your name": the text being edited in its sheet (starts from the saved name each time it opens).
  const [nameDraft, setNameDraft] = useState('');
  // Save keeps the sheet open (and the old name) when the text is a link or an email; the field explains why.
  const saveName = () => {
    const clean = cleanDisplayName(nameDraft);
    if (clean === '' && nameDraft.trim() !== '') return;
    s.setDisplayName(clean);
    close();
  };
  const open = (id: SheetId) => () => {
    if (id === 'date') setNow(Date.now());
    if (id === 'name') setNameDraft(useSettings.getState().displayName ?? '');
    setSheet(id);
  };
  /** True when closing the calendar should leave Settings: the link opened it and there is a screen to go back to. */
  const leavesWithLink = () => sheet === 'date' && fromLink.current && router.canGoBack();
  const close = () => {
    const id = sheet;
    const leave = leavesWithLink();
    setSheet(null);
    if (!id) return;
    if (id === 'date') fromLink.current = false;
    // Opened from "Set exam date": back to where the learner was (Today, exam week).
    if (leave) {
      router.back();
      return;
    }
    // Looked up here, in the handler (never during render).
    const back: Record<SheetId, RefObject<View | null>> = { name: nameRow, exam: examRow, date: dateRow, minutes: minutesRow, start: startRow, mode: modeRow, remind: remindRow, theme: themeRow, motion: motionRow, about: aboutRow };
    moveFocus(back[id], 450);
  };

  // Mobile 1.15: a change to Your study rebuilds today's plan only if nothing
  // in it is ticked yet; otherwise this visit says so in one line.
  const [keptToday, setKeptToday] = useState(false);
  const fit = (p: Parameters<typeof changeFit>[1]) => {
    const kept = changeFit(cert.id, p).keptToday;
    // Said once, when the line first appears (code review M7b, UX review P6).
    if (kept && !keptToday) sayLater(KEEP_TODAY_LINE);
    setKeptToday(kept);
  };
  const examDate = s.examDates[cert.id];
  const minutes = dailyMinutesOf(s);
  const examFocused = examFocusedOf(s);

  // Permission is asked ONLY here, when the learner turns reminders on.
  const toggleReminder = async (enabled: boolean) => {
    setBusy(true);
    try {
      if (enabled) {
        if (!(await ensurePermission())) {
          Alert.alert('Notifications are off', 'Allow notifications for KaiSip in your phone settings to get reminders.');
          return;
        }
        // Read the CURRENT choice after the permission prompt, not the one
        // captured when the switch was tapped (the learner may have changed it).
        useSettings.getState().setReminder({ ...useSettings.getState().reminder, enabled: true });
        // The one way to schedule (lib/reminderSync.ts): it skips today once today's plan is cleared and
        // titles the reminder with the learner's minutes ("Your 20-minute plan is ready").
        await refreshReminders();
      } else {
        await cancelReminders();
        useSettings.getState().setReminder({ ...useSettings.getState().reminder, enabled: false });
        // Their own choice: the reminder ask's second chance never comes to them (engine/firstRun.ts).
        useSeen.getState().noteReminderFlag('turnedOff');
      }
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
    // refreshReminders reads the saved choice just set (it never throws; the catch is a second line of defence).
    if (next.enabled) refreshReminders().catch(() => {});
  };
  // Which way the time last moved: both steppers roll that way (the hour also
  // moves when the minutes wrap past :00).
  const [timeDir, setTimeDir] = useState<1 | -1>(1);
  const moveTime = (deltaMinutes: number) => {
    setTimeDir(deltaMinutes < 0 ? -1 : 1);
    updateReminder((r) => stepTime(r.hour, r.minute, deltaMinutes));
  };
  const days = reminderDays(s.reminder.days);

  // Cloud builds only (Phase 7 review, UX H2 / O2): what a reset means while this phone syncs, and that
  // it also drops a waiting Undo sync copy. With the flag off both are '' and the alert is as it always was.
  const resetCloudNote = () => {
    const undo = useBackup.getState().undo;
    const syncUndo = CLOUD && undo?.kind === 'sync' && undoAvailable(undo, Date.now());
    return `${syncing ? ` ${cloudCopy('reset.sync')}` : ''}${syncUndo ? ` ${cloudCopy('reset.undo')}` : ''}`;
  };
  const confirmReset = () =>
    Alert.alert(
      `Reset ${cert.name} progress?`,
      `This deletes your answers, reviews, saved questions, mock history, badges and game levels for this exam. It cannot be undone. Save a backup first if you might want it back.${hasPlant && plantOn ? ' Your plant goes back to a seed. It keeps its name and look.' : ''}${resetCloudNote()}`,
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

  return (
    <Screen edges={['top', 'bottom']} scrollRef={scrollRef}>
      {/* Same pushed header as Saved and Mistakes: the title lives in the bar. */}
      <PushedHeader title="Settings" onBack={() => router.back()} />

      {/* You (mobile 1.23): what Today calls the learner. Optional, and only on this phone. */}
      <SettingsGroup title="You">
        <SettingsRow
          ref={nameRow}
          title="Your name"
          value={s.displayName ? s.displayName : 'Not set'}
          spokenValue={s.displayName ? s.displayName : 'not set'}
          accessibilityHint="Opens a box to change or clear the name Today uses"
          onPress={open('name')}
          last
        />
      </SettingsGroup>

      {/* Exam: which certification, and the exam date (the countdown, the
          exam-eve and exam-day plans and exam week all follow it). */}
      <SettingsGroup title="Exam">
        <SettingsRow ref={examRow} title="Certification" value={cert.name} accessibilityHint="Opens the exams you can choose" onPress={open('exam')} />
        <SettingsRow
          ref={dateRow}
          title="Exam date"
          value={examDate ? examDateLabel(examDate) : 'Not set'}
          spokenValue={examDate ? spokenDate(examDate) : 'not set'}
          accessibilityHint="Opens a calendar"
          onPress={open('date')}
          last
        />
      </SettingsGroup>

      {/* Mobile 1.15 (PHASE5.md §2.8): Your study sizes and shapes Today's plan. */}
      <SettingsGroup title="Your study">
        <SettingsRow ref={minutesRow} title="Daily time" value={minutesLabel(minutes)} spokenValue={minutesSpoken(minutes)} onPress={open('minutes')} />
        <SettingsRow
          ref={startRow}
          title="Starting point"
          value={s.familiarity ? START_SHORT[s.familiarity] : 'Not set'}
          spokenValue={s.familiarity ? FAMILIARITY_INFO[s.familiarity].title : 'not set'}
          onPress={open('start')}
        />
        <ToggleRow title={EXAM_FOCUSED_TITLE} subtitle={EXAM_FOCUSED_SUBTITLE} value={examFocused} onValueChange={(on) => fit({ examFocused: on })} last />
        {keptToday ? (
          // Android announces it when it appears (iOS: sayLater above; UX review P6).
          <View accessibilityLiveRegion="polite">
            <T v="meta" color={c.accentText} style={{ marginTop: space.xs }}>{KEEP_TODAY_LINE}</T>
          </View>
        ) : null}
      </SettingsGroup>

      {/* Practice: what a practice session starts with (Build D timer, Build E mode). */}
      <SettingsGroup title="Practice">
        <SettingsRow
          ref={modeRow}
          title="Default mode"
          value={s.studyMode ? MODE_INFO[s.studyMode].name : 'Let the app choose'}
          onPress={open('mode')}
        />
        <ToggleRow
          title="Timed practice"
          subtitle="A timer that counts up while you answer, never a countdown. Practice’s own switch can change it for one set."
          value={s.practiceTimer}
          onValueChange={s.setPracticeTimer}
        />
        <ToggleRow title="Shuffle answer options" subtitle="Stops you memorizing letters." value={s.shuffleOptions} onValueChange={s.setShuffle} last />
      </SettingsGroup>

      <SettingsGroup title="Reminders">
        <ToggleRow
          title="Study reminder"
          subtitle={remindersSupported ? 'At most one a day. Turn it off any time.' : 'Available in the installed app, not Expo Go on Android.'}
          value={remindersSupported && s.reminder.enabled}
          disabled={busy || !remindersSupported}
          onValueChange={toggleReminder}
          last={!remindersSupported}
        />
        {remindersSupported && (
          // You can set these before turning reminders on; nothing is asked until then.
          <SettingsRow ref={remindRow} title="Time and days" subtitle={reminderSummary(s.reminder)} onPress={open('remind')} last />
        )}
      </SettingsGroup>

      <SettingsGroup title="Appearance">
        <SettingsRow ref={themeRow} title="Theme" value={THEME_NAME[s.theme]} onPress={open('theme')} />
        {/* Motion (mobile 1.8, WCAG 2.3.3): the phone's own setting, or Reduced for this app only. */}
        <SettingsRow
          ref={motionRow}
          title="Motion"
          value={MOTION_NAME[s.motion === 'reduced' ? 'reduced' : 'system']}
          onPress={open('motion')}
        />
        <ToggleRow title="Haptics" subtitle="Gentle taps when you answer." value={s.haptics} onValueChange={s.setHaptics} last />
      </SettingsGroup>

      {/* Mobile 1.10: badges are optional. Mobile 1.13: so is the plant (Quiet look = no face). */}
      <View
        onLayout={(e) => {
          if (params.section !== 'plant' || scrolled.current) return;
          scrolled.current = true;
          scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - space.md), animated: !reduced });
        }}
      >
        <SettingsGroup title="Badges and your plant">
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
          />
          {badgesLine && (
            <T v="meta" color={c.accentText} style={{ marginTop: space.xs, marginBottom: space.sm }}>
              {badgesLine}
            </T>
          )}
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
        </SettingsGroup>
      </View>

      {/* Cloud builds only: Settings → Account (one of the two ways in). */}
      {CLOUD && <AccountSettingsGroup />}
      {/* Cloud builds only: Settings → Feedback board (Your activity, Blocked learners; Phase 8). */}
      {CLOUD && <BoardSettingsGroup />}

      {/* Backup and restore (Build C): save a file, restore one, undo for 7 days. Free, offline, no account. */}
      <YourData />

      {/* Destructive, so set apart from the rows above, with its own line. */}
      <Gap h={space.xxl} />
      <Button kind="danger" label={`Reset ${cert.name} progress`} onPress={confirmReset} />
      <T v="meta" center style={{ marginTop: space.sm }}>{`Deletes this exam’s progress on this phone. It asks first.`}</T>

      {/* Help and feedback (mobile 1.7): ONE row to the Help screen (UX review O2). */}
      <SettingsGroup title="Help and about">
        <SettingsRow
          // The same words as You's row, so the way to Help reads the same everywhere.
          title="Get help or send feedback"
          subtitle={dueItems ? creditSubtitle(dueItems) : 'Common questions, reports and what’s new'}
          onPress={() => router.push('/help')}
        />
        <SettingsRow
          ref={aboutRow}
          title="About KaiSip"
          subtitle="Our vision and what the app stands for"
          onPress={open('about')}
          last={lastHelpRow === 'about'}
        />
        {config.privacyUrl !== '' && (
          <SettingsRow title="Privacy policy" onPress={() => Linking.openURL(config.privacyUrl)} accessibilityHint="Opens in your browser" last={lastHelpRow === 'privacy'} />
        )}
        {config.termsUrl !== '' && (
          <SettingsRow title="Terms of use" onPress={() => Linking.openURL(config.termsUrl)} accessibilityHint="Opens in your browser" last={lastHelpRow === 'terms'} />
        )}
        {updates.available && (
          // Mobile 1.19: an action row (no chevron: it acts at once). The state is the row's value
          // ("Checking…", "Up to date") so it is read with the row even with hints off; the note
          // under the title says why or what to do. Disabled while busy, and once an update is
          // downloaded (then only "Restart to update" helps). Each new state is announced once (lib/updates.ts).
          <SettingsRow
            title="Check for updates"
            value={updateWords.state}
            subtitle={updateWords.note}
            // No hint while the row is disabled: a hint says what a tap does, and then a tap does nothing.
            accessibilityHint={updates.rowDisabled ? undefined : 'Looks for a newer version of the app and downloads it if there is one.'}
            disabled={updates.rowDisabled}
            onPress={updates.check}
            chevron={false}
            last
          />
        )}
      </SettingsGroup>
      {updates.available && updates.canRestart && (
        // The update is on the phone: restarting applies it now (progress is saved as you go, so nothing is lost).
        <Button label="Restart to update" onPress={updates.restart} accessibilityHint="Closes and reopens the app with the update." style={{ marginTop: space.md }} />
      )}

      <Gap h={space.xl} />
      <T v="meta">
        {/* The last sentence is "Progress is stored only on this device." with the flag off (content/cloud/copy.ts about.off). */}
        KaiSip v{Constants.expoConfig?.version ?? '1.0.0'} · Original practice questions written for exam preparation. {aboutLine(syncing)}
      </T>
      {updates.available && (
        // Mobile 1.19: which update this phone runs ("Update 1a2b3c4d · 5e26d4b", or "built-in"), so support
        // can tell whether an update arrived. The ids are the same on every phone with that update: no personal data.
        // Selectable so it can be pasted into a support message; spoken as "…, runtime …" instead of a middle dot.
        <T v="meta" selectable accessibilityLabel={runningUpdateLine().replace(' · ', ', runtime ')} style={{ marginTop: space.xs }}>
          {runningUpdateLine()}
        </T>
      )}
      <Gap h={space.sm} />
      {/* Every certification named anywhere in the app (coming-soon ones too) needs its trademark notice;
          one combined line instead of five near-identical ones. */}
      <T v="meta">{combinedTrademarkNotice(CERTIFICATIONS)}</T>

      {/* ── The sheets ─────────────────────────────────────────────── */}
      {/* Your name: edit, save or clear. Saving tidies the text (engine/displayName.ts), so what the row shows is what Today uses. */}
      <Sheet
        visible={sheet === 'name'}
        onClose={close}
        title="Your name"
        closeLabel="Cancel"
        intro="What should we call you? Today will say hello with it."
        footer={
          <>
            <Button
              label="Save"
              onPress={saveName}
            />
            {s.displayName ? (
              <Button
                kind="ghost"
                label="Clear my name"
                accessibilityHint="Today says hello without a name"
                onPress={() => {
                  s.setDisplayName(undefined);
                  close();
                }}
              />
            ) : null}
          </>
        }
      >
        <DisplayNameField
          value={nameDraft}
          onChange={setNameDraft}
          onSubmit={saveName}
        />
      </Sheet>

      <ChoiceSheet
        visible={sheet === 'exam'}
        onClose={close}
        title="Certification"
        groupLabel="Which exam are you preparing for?"
        options={CERTIFICATIONS.map((x) => ({
          value: x.id,
          title: x.name,
          subtitle: x.fullName,
          // Shown, so the plan is visible, but not choosable yet.
          badge: x.status === 'available' ? undefined : 'Coming soon',
          disabled: x.status !== 'available',
        }))}
        value={s.activeCertId}
        onChange={(id) => s.setActiveCert(id)}
        after={<T v="meta" style={{ marginTop: space.md }}>Only CISA is available today.</T>}
      />

      <CalendarSheet
        visible={sheet === 'date'}
        value={examDate}
        now={now}
        onClose={close}
        onSave={(date) => {
          // Changing it rebuilds today's plan for this exam (exam week and the eve card follow it).
          if (date !== examDate) changeExamDate(cert.id, date);
          // Staying in Settings, focus returns to the Exam date row, which reads the new
          // date; an announcement as well would say it twice. Leaving (the link), say it.
          if (leavesWithLink()) sayLater(date ? `Exam date saved: ${spokenDate(date)}` : 'Exam date cleared');
          close();
        }}
      />

      <ChoiceSheet<DailyMinutes>
        visible={sheet === 'minutes'}
        onClose={close}
        title="Daily time"
        intro="Most days. Your daily plan fits this."
        options={DAILY_MINUTES.map((m) => ({ value: m, title: minutesSpoken(m) }))}
        value={minutes}
        onChange={(dailyMinutes) => fit({ dailyMinutes })}
      />

      <ChoiceSheet<Familiarity>
        visible={sheet === 'start'}
        onClose={close}
        title="Starting point"
        intro={`${FAMILIARITY_QUESTION} This shapes your plan.`}
        groupLabel={FAMILIARITY_QUESTION}
        options={FAMILIARITIES.map((f) => ({ value: f, title: FAMILIARITY_INFO[f].title, subtitle: FAMILIARITY_INFO[f].subtitle }))}
        value={s.familiarity ?? null}
        onChange={(familiarity) => fit({ familiarity })}
      />

      <ChoiceSheet<StudyMode | typeof AUTO_MODE>
        visible={sheet === 'mode'}
        onClose={close}
        title="Default mode"
        intro="What practice starts with. Practice can change it for one set."
        groupLabel="Default study mode"
        options={[
          { value: AUTO_MODE, title: 'Let the app choose', subtitle: 'It changes as you go and fits where you’re starting from, ending with a smart mix of what you need.' },
          ...STUDY_MODES.map((m) => ({ value: m, title: MODE_INFO[m].name, subtitle: MODE_INFO[m].why })),
        ]}
        value={s.studyMode ?? AUTO_MODE}
        onChange={(m) => s.setStudyMode(m === AUTO_MODE ? undefined : m)}
      />

      {remindersSupported && (
        <Sheet visible={sheet === 'remind'} onClose={close} title="Time and days" closeLabel="Done">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xl, marginTop: space.sm }}>
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
          <T v="caption" style={{ marginTop: space.lg }}>Days</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
            {DAY_CHIPS.map((d) => {
              const on = days.includes(d.day);
              // The last day left can't be turned off: say why, and point to the switch.
              const lastDay = on && days.length === 1;
              return (
                <Chip
                  key={d.day}
                  checkbox
                  label={d.short}
                  accessibilityLabel={`Remind on ${d.long}`}
                  accessibilityHint={lastDay ? 'At least one day stays on. Use the switch to stop reminders.' : undefined}
                  selected={on}
                  disabled={busy}
                  onPress={() => updateReminder((r) => ({ days: toggleDay(r.days, d.day) }))}
                />
              );
            })}
          </View>
          {/* While off, say these choices wait for the switch (nothing is scheduled yet). */}
          <T v="meta" style={{ marginTop: space.md }}>
            {s.reminder.enabled ? 'At most one reminder a day. Turn it off any time.' : 'Applies when reminders are on. At most one a day.'}
          </T>
        </Sheet>
      )}

      <ChoiceSheet<ThemePref>
        visible={sheet === 'theme'}
        onClose={close}
        title="Theme"
        options={[
          { value: 'system', title: 'System', subtitle: 'Follows your phone’s light or dark setting.' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ]}
        value={s.theme}
        onChange={s.setTheme}
      />

      <ChoiceSheet<MotionPref>
        visible={sheet === 'motion'}
        onClose={close}
        title="Motion"
        options={[
          {
            value: 'system',
            title: 'Match my phone',
            subtitle: phoneReduced
              ? `Your phone’s ${phoneSetting()} is on, so movement is already reduced.`
              : `Calm movement that shows what changed. Follows your phone’s ${phoneSetting()} setting.`,
          },
          { value: 'reduced', title: 'Reduced', subtitle: 'Short fades instead of slides; growth shows its end state.' },
        ]}
        value={s.motion === 'reduced' ? 'reduced' : 'system'}
        onChange={s.setMotion}
      />

      <Sheet visible={sheet === 'about'} onClose={close} title="About KaiSip">
        {/* Our vision: the same promise as the welcome screen (content/brand.ts). */}
        <View style={{ marginTop: space.sm }}>
          <KaisipLockup height={28} />
        </View>
        <T v="caption" color={c.accentText} accessibilityRole="header" style={{ marginTop: space.lg }}>Our vision</T>
        <T v="hero" style={{ marginTop: space.xs }}>{TAGLINE}</T>
        <T v="quote" color={c.ink2} style={{ marginTop: space.xs }}>{VISION_LINE}</T>
        <Gap h={space.lg} />
        <PillarList look="rows" />
      </Sheet>
    </Screen>
  );
}
