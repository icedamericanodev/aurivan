/**
 * Settings (mobile 1.17, "a tidy Settings"; mobile 1.46, "one page, clear groups"). Each category is
 * its own flat card with its mark and title inside (components/settings.tsx), in the order learners
 * change them; each row shows its CURRENT value with a chevron and opens a bottom sheet with the
 * choices; simple on/off settings stay switches in place. Your data and Help and about, visited
 * rarely and many-rowed, are doors to their own screens (settings-section?category=…), each door
 * showing a live summary. Nothing a learner set before is lost; only where it lives on screen changed.
 *
 *   Appearance            Theme (a one-tap System / Light / Dark control) · Motion · Haptics
 *   Exam                  Certification · Exam date (a calendar, components/calendar.tsx)
 *   Your study            Daily time · Starting point · Exam-focused plan · Reset reading progress (1.25)
 *   Reminders             Study reminder · Time and days
 *   Practice              Default mode · Timed practice · Shuffle answer options
 *   Badges and your plant Show badges · Show my plant · Change its look
 *   You                   Your name (mobile 1.23: what Today calls you; optional, only on this phone)
 *   (doors)               Your data: Save a backup · Restore · (Undo restore), then Reset, set apart
 *                         Help and about: Get help or send feedback · About KaiSip · Privacy · Terms ·
 *                         Check for updates, and the app's version
 *
 * Mobile 1.46 (the owner, after 1.43: "I can't distinguish clearly the categories to its sub
 * categories"): four layouts, then two finalists, were built and reviewed; she chose this one.
 *
 * Mobile 1.19: "Check for updates" (lib/updates.ts) sits last in Help and
 * about, only where over-the-air updates work (an installed APK or store
 * build; hidden in Expo Go, dev builds and on the web). One tap checks,
 * downloads, and offers "Restart to update". Under the version line, the
 * "Update … · …" stamp says which update this phone runs, for support.
 *
 * Deep links: `?open=exam-date` opens the calendar (Today's and exam week's
 * "Set exam date"); on iOS once the push transition has ended, and its
 * Save or Cancel goes back to where the learner came from. `?open=name`
 * (mobile 1.44, You's study profile) opens Your name the same way: one name
 * editor in the app, never a second one. `?section=plant`
 * opens at Badges and your plant (the plant screens' "Open Settings").
 * `settings-section?category=data|help` (and account|board in a cloud build) is a door's screen: the
 * same screen showing only that category, its name in the bar.
 *
 * Theme lives only here since 1.17 (the owner found the switch on You
 * redundant once Settings was tidy).
 *
 * Uplift Phase 6 (accounts, built OFF): in a cloud build only, Account and
 * Feedback board are doors above Your data, and About's last sentence follows the account
 * (components/account.tsx). With the flag off nothing here changes.
 */
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import * as ExpoRouter from 'expo-router';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Platform, View, type ScrollView } from 'react-native';
import { aboutLine, AccountSettingsGroup } from '../components/account';
import { BoardSettingsGroup } from '../components/board';
import { useSyncing } from '../lib/sync';
import { cloudReady } from '../lib/account';
import { KaisipLockup, PillarList } from '../components/brand';
import { CLOUD } from '../cloud/flag';
import { copy as cloudCopy } from '../content/cloud/copy';
import { undoAvailable, undoExpiresAt } from '../engine/backup';
import { CalendarSheet } from '../components/calendar';
import { DisplayNameField } from '../components/displayName';
import { cleanDisplayName } from '../engine/displayName';
import { EXAM_FOCUSED_SHORT, EXAM_FOCUSED_SPOKEN, EXAM_FOCUSED_TITLE, FAMILIARITY_QUESTION } from '../components/fit';
import { creditSubtitle } from '../components/help';
import { useMotion, useSystemReducedMotion } from '../components/motion';
import {
  ChoiceSheet,
  DOOR_CATS,
  isSettingsCat,
  SettingsCard,
  SettingsCategoryRow,
  SettingsGroup,
  SettingsRow,
  SettingsSubScreen,
  Sheet,
  type SettingsCat,
} from '../components/settings';
import { WidgetSettingsGroup } from '../components/widgetSettings';
import { widgetsSupported } from '../lib/widgets';
import { YourData } from '../components/yourData';
import { Button, Chip, Gap, PushedHeader, Screen, Segmented, Stepper, T, ToggleRow } from '../components/ui';
import { spokenDate, untilLabel } from '../engine/calendar';
import { dayKey } from '../engine/streak';
import { shortDate } from '../lib/format';
import { DAILY_MINUTES, examFocusedOf, FAMILIARITIES, FAMILIARITY_INFO, KEEP_TODAY_LINE, minutesLabel, minutesSpoken, type DailyMinutes, type Familiarity } from '../engine/fit';
import { MODE_INFO, STUDY_MODES, type StudyMode } from '../engine/studyModes';
import { CERT_SCOPE_LINE, PROVENANCE_LINE, WELCOME_HEADLINE, WELCOME_LINE } from '../content/brand';
import { CERTIFICATIONS, combinedTrademarkNotice, selectableCertifications } from '../content/certifications';
import { hasContent } from '../content/loader';
import { hasNotes } from '../content/notes';
import { examDateLabel } from '../engine/examDay';
import { changeExamDate, changeFit } from '../lib/activity';
import { moveFocus, sayLater } from '../lib/a11y';
import { hideBadges, showBadgesAgain, shownAgainLine } from '../lib/badges';
import { clearJustRead } from '../lib/noteNews';
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
import { dailyMinutesOf, examDateOf, type MotionPref, type ThemePref, useSettings } from '../store/settings';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** The phone's own name for the setting (Android has no "Reduce Motion"). */
const phoneSetting = () => (Platform.OS === 'android' ? 'Remove animations' : 'Reduce Motion');

/** Which sheet is open (one at a time). */
type SheetId = 'name' | 'exam' | 'date' | 'minutes' | 'start' | 'mode' | 'remind' | 'motion' | 'about';

/** "Starting point" values short enough to sit beside the title; the sheet and screen readers use the full titles. */
const START_SHORT: Record<Familiarity, string> = { new: 'New to audit', some: 'Some experience', experienced: 'Experienced' };
const MOTION_NAME: Record<MotionPref, string> = { system: 'Match my phone', reduced: 'Reduced' };
const AUTO_MODE = 'auto';
/** The Theme control's line, shown under its title and said as part of the group's name. */
const THEME_LINE = 'System follows your phone’s light or dark setting.';

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
/** Runs each time this screen comes back into focus (absent where a test's expo-router stand-in has none). */
const useScreenFocus: (effect: () => void) => void = (ExpoRouter as { useFocusEffect?: (effect: () => void) => void }).useFocusEffect ?? (() => {});

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
  // Mobile 1.25: Reset reading progress (notes only), and whether there is any to reset.
  const resetNotesReading = useProgress((p) => p.resetNotesReading);
  const readingTouched = useProgress((p) => {
    const cp = selectCert(p, cert.id);
    return cp.notesRead.length > 0 || (cp.notesViewed ?? []).length > 0;
  });
  const showReading = hasNotes(cert.id);
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
  const params = useLocalSearchParams<{ open?: string; section?: string; category?: string }>();
  // A door's own screen (settings-section?category=data|help, and account|board in a cloud build); any
  // other value shows the whole page.
  const sub: SettingsCat | null = isSettingsCat(params.category) && DOOR_CATS.includes(params.category) && (cloudReady() || (params.category !== 'account' && params.category !== 'board')) ? params.category : null;
  const navigation = useOwnNavigation();
  // "Now" for the calendar: read again each time it opens, so a Settings
  // screen left open past midnight never offers yesterday (render stays pure:
  // it is only read in handlers and effects).
  const [now, setNow] = useState(() => Date.now());
  // ?open=exam-date opens the calendar; ?open=name (mobile 1.44, You's study profile) opens Your name.
  const linkSheet: SheetId | null = params.open === 'exam-date' ? 'date' : params.open === 'name' ? 'name' : null;
  // On Android (and web) the sheet is up from the first frame, as before.
  const linkNow = linkSheet !== null && Platform.OS !== 'ios';
  const [sheet, setSheet] = useState<SheetId | null>(() => (linkNow ? linkSheet : null));
  // True while the sheet the link opened is up: its Save or Cancel goes back to where the learner came from.
  const fromLink = useRef(linkNow);
  // "Your name": the text being edited in its sheet (starts from the saved name each time it opens).
  // Opened by ?open=name from the first frame (Android, web): it starts from the saved name too.
  const [nameDraft, setNameDraft] = useState(() => (linkNow && linkSheet === 'name' ? (useSettings.getState().displayName ?? '') : ''));
  // iOS presents a sheet from the screen itself; one presented during the
  // push transition can be dropped (and then can't open until the learner
  // leaves). So wait for the transition to end, with a short fallback.
  useEffect(() => {
    if (!linkSheet || Platform.OS !== 'ios') return;
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      fromLink.current = true;
      setNow(Date.now());
      if (linkSheet === 'name') setNameDraft(useSettings.getState().displayName ?? '');
      setSheet(linkSheet);
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
  // Mobile 1.47: a widget's "Tap to choose" opens its exact choice here (?open=widget-readiness / widget-timing),
  // then goes back to where the learner came from; ?section=widgets starts at the widgets card.
  const widgetLink = params.open === 'widget-readiness' ? 'readiness' : params.open === 'widget-timing' ? 'timing' : undefined;
  const widgetsHeadRef = useRef<View>(null);
  const plantHeadRef = useRef<View>(null);
  // Each row that opens a sheet gets screen-reader focus back when its sheet closes.
  const nameRow = useRef<View>(null);
  const examRow = useRef<View>(null);
  const dateRow = useRef<View>(null);
  const minutesRow = useRef<View>(null);
  const startRow = useRef<View>(null);
  const modeRow = useRef<View>(null);
  const remindRow = useRef<View>(null);
  const motionRow = useRef<View>(null);
  const aboutRow = useRef<View>(null);
  // Category screens (variants 2, 5, 6): the rows that open them, and the one last opened, so Back hands
  // screen-reader focus to it (UX review P1); a category screen's title takes focus as it opens (HARD 1).
  const catRefs = useRef<Partial<Record<SettingsCat, View | null>>>({});
  const lastCat = useRef<SettingsCat | null>(null);
  const subHeadRef = useRef<View>(null);
  useEffect(() => {
    if (sub) moveFocus(subHeadRef, 350);
  }, [sub]);
  useScreenFocus(
    useCallback(() => {
      const k = lastCat.current;
      if (!k || sub) return;
      lastCat.current = null;
      moveFocus({ current: catRefs.current[k] ?? null }, 450);
    }, [sub]),
  );
  // Live states for the summaries: an Undo restore waiting, and the last backup.
  const backupUndo = useBackup((b) => b.undo);
  const lastBackupAt = useBackup((b) => b.lastBackupAt);
  const restoredSavedAt = useBackup((b) => b.restoredSavedAt ?? null);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
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
  /** True when closing the sheet should leave Settings: the link opened it and there is a screen to go back to. */
  const leavesWithLink = () => sheet !== null && sheet === linkSheet && fromLink.current && router.canGoBack();
  const close = () => {
    const id = sheet;
    const leave = leavesWithLink();
    setSheet(null);
    if (!id) return;
    if (id === linkSheet) fromLink.current = false;
    // Opened from "Set exam date" (Today, exam week) or You's study profile: back to where the learner was.
    if (leave) {
      router.back();
      return;
    }
    // Looked up here, in the handler (never during render).
    const back: Record<SheetId, RefObject<View | null>> = { name: nameRow, exam: examRow, date: dateRow, minutes: minutesRow, start: startRow, mode: modeRow, remind: remindRow, motion: motionRow, about: aboutRow };
    // On a category list the row itself isn't drawn (a deep-linked sheet over the list): its category's row instead (UX P5).
    const home: Record<SheetId, SettingsCat> = { name: 'you', exam: 'exam', date: 'exam', minutes: 'study', start: 'study', mode: 'practice', remind: 'reminders', motion: 'appearance', about: 'help' };
    moveFocus(back[id].current ? back[id] : { current: catRefs.current[home[id]] ?? null }, 450);
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
  const examDate = examDateOf(s.examDates, cert.id);
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
  // Mobile 1.25: only the notes' read and started marks, for this exam. Answers, scores,
  // lessons and badges stay. It asks first; the row is greyed out when nothing is read.
  const confirmResetReading = () =>
    Alert.alert(
      'Reset reading progress?',
      // Cloud builds only: while this phone syncs, the same warning as the full reset (with the flag off, nothing).
      `Every ${cert.name} note goes back to not read. Your answers and scores stay.${syncing ? ` ${cloudCopy('reset.sync')}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset reading',
          style: 'destructive',
          onPress: () => {
            resetNotesReading(cert.id);
            // No circle waits to fill for a note that is no longer read.
            clearJustRead();
            sayLater('Reading progress reset. Every note is not read yet.');
          },
        },
      ],
    );
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

  // Mobile 1.43 (owner feedback): the theme in one tap, a System / Light / Dark radio group.
  // The title and its line are said ONCE, as the radio group's name; the visible words are hidden
  // from screen readers so they are not read a second time before the group.
  const themeControl = (
    <View style={{ paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <T v="label">Theme</T>
        <T v="meta" style={{ marginBottom: space.sm }}>{THEME_LINE}</T>
      </View>
      <Segmented<ThemePref>
        accessibilityLabel={`Theme. ${THEME_LINE}`}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={s.theme}
        onChange={s.setTheme}
      />
    </View>
  );

  // ── The categories' rows ──
  const keptLine = keptToday ? (
    // Android announces it when it appears (iOS: sayLater above; UX review P6).
    <View accessibilityLiveRegion="polite">
      <T v="meta" color={c.accentText} style={{ marginTop: space.xs }}>{KEEP_TODAY_LINE}</T>
    </View>
  ) : null;

  const youRows = (
    <SettingsRow
      ref={nameRow}
      title="Your name"
      value={s.displayName ? s.displayName : 'Not set'}
      spokenValue={s.displayName ? s.displayName : 'not set'}
      accessibilityHint="Opens a box to change or clear the name Today uses"
      onPress={open('name')}
      last
    />
  );

  const appearanceRows = (
    <>
      {/* Mobile 1.43 (owner feedback: "if I want to change the theme I cannot see it easily"): one tap, near the
          top. A radio group of three; choosing one switches at once (the theme dissolve, §8). */}
      {themeControl}
      {/* Motion (mobile 1.8, WCAG 2.3.3): the phone's own setting, or Reduced for this app only. */}
      <SettingsRow
        ref={motionRow}
        title="Motion"
        value={MOTION_NAME[s.motion === 'reduced' ? 'reduced' : 'system']}
        onPress={open('motion')}
      />
      <ToggleRow title="Haptics" subtitle="Gentle taps when you answer." value={s.haptics} onValueChange={s.setHaptics} last />
    </>
  );

  // Exam: which certification, and the exam date (the countdown, the exam-eve and exam-day plans and exam week all follow it).
  const examRows = (
    <>
      <SettingsRow ref={examRow} title="Certification" value={cert.name} accessibilityHint="Opens the exams you can choose" onPress={open('exam')} />
      <SettingsRow
        ref={dateRow}
        title="Exam date"
        value={examDate ? examDateLabel(examDate) : 'Not set'}
        spokenValue={examDate ? spokenDate(examDate) : 'not set'}
        // Mobile 1.43: how far away it is ("In 36 days"; "Date passed" once it has gone), from the screen's "now".
        subtitle={examDate ? (untilLabel(examDate, dayKey(now)) ?? 'Date passed') : undefined}
        accessibilityHint="Opens a calendar"
        onPress={open('date')}
        last
      />
    </>
  );

  // Mobile 1.15 (PHASE5.md §2.8): Your study sizes and shapes Today's plan.
  const studyRows = (
    <>
      <SettingsRow ref={minutesRow} title="Daily time" value={minutesLabel(minutes)} spokenValue={minutesSpoken(minutes)} onPress={open('minutes')} />
      <SettingsRow
        ref={startRow}
        title="Starting point"
        // Mobile 1.43: a one-line hint (a tester: "Starting point: Not set. I don't know what that is").
        subtitle="How much audit you know; it shapes your first weeks"
        value={s.familiarity ? START_SHORT[s.familiarity] : 'Not set'}
        spokenValue={s.familiarity ? FAMILIARITY_INFO[s.familiarity].title : 'not set'}
        onPress={open('start')}
      />
      <ToggleRow
        title={EXAM_FOCUSED_TITLE}
        subtitle={EXAM_FOCUSED_SHORT}
        subtitleLabel={EXAM_FOCUSED_SPOKEN}
        value={examFocused}
        onValueChange={(on) => fit({ examFocused: on })}
        last={!(showReading && readingTouched)}
      />
      {/* Mobile 1.43: shown only when there is reading progress to reset (the real read state, not a flag);
          a greyed row read like a heading. */}
      {showReading && readingTouched && (
        // An action row (no chevron): it asks first, then clears only the notes' read marks.
        <SettingsRow
          title="Reset reading progress"
          subtitle="Every study note goes back to not read"
          onPress={confirmResetReading}
          accessibilityHint="Asks first. Your answers and scores stay."
          chevron={false}
          last
        />
      )}
      {keptLine}
    </>
  );

  // Practice: what a practice session starts with (Build D timer, Build E mode).
  const practiceRows = (
    <>
      <SettingsRow
        ref={modeRow}
        title="Default mode"
        // Mobile 1.43: a one-line hint (a tester: "Let the app choose: choose what?").
        subtitle="How Practice picks your questions"
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
    </>
  );

  const reminderRows = (
    <>
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
    </>
  );

  // Mobile 1.10: badges are optional. Mobile 1.13: so is the plant.
  const plantRows = (
    <>
      <ToggleRow
        title="Show badges"
        subtitle="A short moment when you earn one, and your Badges on You. Off: you still earn them, quietly."
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
      {/* Mobile 1.40: the Quiet look switch moved into the Look screen's Style choice (botanical,
          storybook, or storybook with a face). Old saves keep their quietLook; it still decides
          how a plant planted before 1.40 looks until a style is picked there. */}
      {plantOn && <SettingsRow title="Change its look" subtitle="Its style, colours and keepsakes" onPress={() => router.push('/plant-look')} last />}
    </>
  );

  // Help and feedback (mobile 1.7): ONE row to the Help screen (UX review O2).
  const helpRows = (
    <>
      <SettingsRow
        // The same words as You's row, so the way to Help reads the same everywhere.
        title="Get help or send feedback"
        subtitle={dueItems ? creditSubtitle(dueItems) : 'Common questions, reports and what’s new'}
        onPress={() => router.push('/help')}
      />
      <SettingsRow
        ref={aboutRow}
        title="About KaiSip"
        subtitle="The KaiSip way and what the app stands for"
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
    </>
  );

  /** One category: its title, and how it draws; a door also has what it holds now, in plain words. */
  type Category = { cat: SettingsCat; title: string; summary?: string; draw: () => ReactNode };
  const group = (cat: SettingsCat, title: string, rows: ReactNode) =>
    function drawGroup() {
      return (
        <SettingsGroup key={cat} title={title} cat={cat}>
          {rows}
        </SettingsGroup>
      );
    };
  // The doors' summaries keep the live state the rows inside would show: an Undo restore waiting or the
  // last backup; a reply to a report, or an update ready to restart; else the version.
  const undoWaiting = undoAvailable(backupUndo, now);
  // The same status as Your data's first row (components/yourData.tsx): a restore newer than the last file made counts.
  const restoredLast = restoredSavedAt !== null && (!lastBackupAt || restoredSavedAt > lastBackupAt);
  const backupStatus = undoWaiting
    ? `Undo restore until ${shortDate(undoExpiresAt(backupUndo))}`
    : restoredLast
      ? `Restored a backup from ${shortDate(restoredSavedAt)}`
      : lastBackupAt
        ? `Last backup ${shortDate(lastBackupAt)}`
        : 'No backup yet';
  const dataSummary = `${backupStatus} · back up or move to a new phone`;
  const helpSummary = dueItems
    ? creditSubtitle(dueItems)
    : updates.available && updates.canRestart
      ? 'Update ready: restart to install it'
      : 'Get help, report a problem, privacy and terms';
  const about = (
    <>
      <Gap h={space.xl} />
      <T v="meta">
        {/* The last sentence is "Progress is stored only on this device." with the flag off (content/cloud/copy.ts about.off). */}
        {/* Mobile 1.39: how the content is made, in the one provenance line used everywhere (content/brand.ts). */}
        KaiSip v{appVersion} · {PROVENANCE_LINE} {aboutLine(syncing)}
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
      {/* Every certification named anywhere in the app needs its trademark notice. Mobile 1.39: the
          app names only the certifications it teaches (no "coming soon" list), so only those. */}
      <T v="meta">{combinedTrademarkNotice(CERTIFICATIONS.filter((x) => x.status === 'available'))}</T>
    </>
  );
  const categories: Category[] = [
    // Appearance first (mobile 1.43, owner feedback: the theme in one tap, at the top). Motion and Haptics stay with it.
    { cat: 'appearance', title: 'Appearance', draw: group('appearance', 'Appearance', appearanceRows) },
    { cat: 'exam', title: 'Exam', draw: group('exam', 'Exam', examRows) },
    { cat: 'study', title: 'Your study', draw: group('study', 'Your study', studyRows) },
    { cat: 'reminders', title: 'Reminders', draw: group('reminders', 'Reminders', reminderRows) },
    { cat: 'practice', title: 'Practice', draw: group('practice', 'Practice', practiceRows) },
    {
      cat: 'plant',
      title: 'Badges and your plant',
      draw: () => (
        <View
          key="plant"
          onLayout={(e) => {
            if (params.section !== 'plant' || scrolled.current) return;
            scrolled.current = true;
            scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - space.md), animated: !reduced });
            // Screen-reader focus follows the scroll (mobile 1.47, UX review P6).
            moveFocus(plantHeadRef, 400);
          }}
        >
          <SettingsGroup title="Badges and your plant" cat="plant" headRef={plantHeadRef}>
            {plantRows}
          </SettingsGroup>
        </View>
      ),
    },
    // Mobile 1.47: Home-screen widgets, its own card (Android builds only; WidgetSettingsGroup draws nothing elsewhere).
    ...(widgetsSupported
      ? [
          {
            cat: 'widgets' as const,
            title: 'Home-screen widgets',
            draw: () => (
              <View
                key="widgets"
                onLayout={(e) => {
                  const linked = params.section === 'widgets' || widgetLink !== undefined;
                  if (!linked || scrolled.current) return;
                  scrolled.current = true;
                  scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - space.md), animated: !reduced });
                  moveFocus(widgetsHeadRef, 400);
                }}
              >
                <WidgetSettingsGroup headRef={widgetsHeadRef} openOnMount={widgetLink} onLinkDone={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
              </View>
            ),
          },
        ]
      : []),
    // You (mobile 1.23): what Today calls the learner. Optional, and only on this phone.
    { cat: 'you', title: 'You', draw: group('you', 'You', youRows) },
    // Cloud builds only: Settings → Account (one of the two ways in), and → Feedback board (Your activity, Blocked learners; Phase 8).
    ...(cloudReady()
      ? [
          { cat: 'account' as const, title: cloudCopy('settings.group'), summary: 'Sign in and sync', draw: () => <AccountSettingsGroup key="account" /> },
          { cat: 'board' as const, title: cloudCopy('board.settings.group'), summary: 'Your activity and blocked learners', draw: () => <BoardSettingsGroup key="board" /> },
        ]
      : []),
    {
      cat: 'data',
      title: 'Your data',
      summary: dataSummary,
      draw: () => (
        <View key="data">
          {/* Backup and restore (Build C): save a file, restore one, undo for 7 days. Offline, no account. */}
          <YourData />
          {/* Destructive, so set apart from the rows above, with its own line saying what goes and what stays. */}
          <Gap h={space.xxl} />
          <Button kind="danger" label={`Reset ${cert.name} progress`} accessibilityHint="Asks first" onPress={confirmReset} />
          <T v="meta" center style={{ marginTop: space.sm }}>{`Erases your ${cert.name} answers, scores, saved questions, mock history and badges on this phone. Your settings stay.`}</T>
        </View>
      ),
    },
    {
      cat: 'help',
      title: 'Help and about',
      summary: helpSummary,
      draw: () => (
        <View key="help">
          {group('help', 'Help and about', helpRows)()}
          {updates.available && updates.canRestart && (
            // The update is on the phone: restarting applies it now (progress is saved as you go, so nothing is lost).
            <Button label="Restart to update" onPress={updates.restart} accessibilityHint="Closes and reopens the app with the update." style={{ marginTop: space.md }} />
          )}
          {/* The version, where learners look for it (the learner review), and on the page's foot too. */}
          {about}
        </View>
      ),
    },
  ];
  const subCategory = sub ? categories.find((x) => x.cat === sub) : undefined;
  const doorCats = categories.filter((x) => DOOR_CATS.includes(x.cat));

  /** A door to a category's own screen; Back hands screen-reader focus back to it. */
  const door = (x: Category, last: boolean) => (
    <SettingsCategoryRow
      key={x.cat}
      ref={(v) => {
        catRefs.current[x.cat] = v;
      }}
      cat={x.cat}
      title={x.title}
      summary={x.summary ?? ''}
      onPress={() => {
        lastCat.current = x.cat;
        router.push({ pathname: '/settings-section', params: { category: x.cat } });
      }}
      last={last}
    />
  );

  return (
    <Screen edges={['top', 'bottom']} scrollRef={scrollRef}>
      <SettingsSubScreen.Provider value={subCategory !== undefined}>
        {/* Same pushed header as Saved and Mistakes: the title lives in the bar. A door's screen: its name
            is the bar's title, and screen-reader focus starts there. */}
        <PushedHeader title={subCategory ? subCategory.title : 'Settings'} titleRef={subCategory ? subHeadRef : undefined} onBack={() => router.back()} />

        {subCategory ? (
          subCategory.draw()
        ) : (
          <>
            {categories.filter((x) => !DOOR_CATS.includes(x.cat)).map((x) => x.draw())}
            {/* The doors (Your data, Help and about; Account and Feedback board in a cloud build), in one last card. */}
            <SettingsCard title="Data and help">{doorCats.map((x, i) => door(x, i === doorCats.length - 1))}</SettingsCard>

            {about}
          </>
        )}
      </SettingsSubScreen.Provider>

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
        // Mobile 1.39 (owner decision): only the certifications the app teaches; no "coming soon" list.
        // The catalogue itself (content/certifications.ts) is unchanged. Content packs: an exam must also
        // have its content on this phone (today every available exam is bundled, so nothing changes).
        options={selectableCertifications(hasContent).map((x) => ({
          value: x.id,
          title: x.name,
          subtitle: x.fullName,
        }))}
        value={s.activeCertId}
        onChange={(id) => s.setActiveCert(id)}
        after={<T v="meta" style={{ marginTop: space.md }}>{CERT_SCOPE_LINE}</T>}
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
        {/* The KaiSip way (the web's About says the same): the same promise as the welcome screen (content/brand.ts). */}
        <View style={{ marginTop: space.sm }}>
          <KaisipLockup height={28} />
        </View>
        {/* Mobile 1.39: the same lead as the welcome screen, one CISA story (no platform tagline). */}
        <T v="caption" color={c.accentText} accessibilityRole="header" style={{ marginTop: space.lg }}>The KaiSip way</T>
        <T v="hero" style={{ marginTop: space.xs }}>{WELCOME_HEADLINE}</T>
        <T v="quote" color={c.ink2} style={{ marginTop: space.xs }}>{WELCOME_LINE}</T>
        <Gap h={space.lg} />
        <PillarList look="rows" />
        <Gap h={space.lg} />
        <T v="meta">{CERT_SCOPE_LINE}</T>
        <T v="meta" style={{ marginTop: space.xs }}>{PROVENANCE_LINE}</T>
      </Sheet>
    </Screen>
  );
}
