/**
 * Onboarding — a plain welcome, then 2 quick steps, then straight into the
 * first five questions (mobile 1.24, "first five minutes"; 1.41, one screen fewer).
 *
 *   0  Welcome      "Think like an IS auditor." It names the exam (CISA) and
 *                   says in four literal lines what you will do and what the
 *                   app does with your data, starting with the best feature:
 *                   every option is explained, the trap included. No metaphors.
 *   1  Step 1 of 2  Where are you starting from? (optional; "Skip this
 *                   question" leaves it unset)
 *   2  Step 2 of 2  Your exam date and how long you can study most days, with
 *                   a plain line saying what the two add up to.
 *
 * What changed in 1.41, and why (pre-beta review: testers decide in the first minute):
 * - The name step is gone from here. Today asks once, quietly, from the day
 *   after the first study day (engine/firstRun.ts nameAskDue), and Settings →
 *   Your name keeps it. Learners who already gave a name keep it.
 * - No seed is planted for you any more: the first set's closing screen offers
 *   one, with "Not now" (You and Your plant keep "Plant yours").
 *
 * What changed in 1.24, and why (the panel's first-ten-minutes review):
 * - The exam step is gone. CISA is the only exam, so it is chosen for you
 *   (no greyed-out "coming soon" tiles; since 1.39 Settings lists only CISA too,
 *   with "Starting with CISA. More certifications later.").
 * - The plant step and the "Planted" screen are gone. A seed is planted for you
 *   after the first five questions, and You keeps "Plant yours".
 * - The line about moving from the old app is gone from the welcome. "Restore
 *   from a backup" stays: it is also how you move to a new phone.
 * - The last button saves everything in one tap and starts the first set (the
 *   same five questions for everyone, lib/firstSet.ts). Nothing is saved
 *   before that tap, so leaving halfway loses nothing.
 *
 * Earlier notes still true:
 * - Step 3 keeps "Pick the exact date" (the same calendar as Settings → Exam date).
 * - Step 2 has no preselected answer; it shapes the first week.
 * - Grove: choices are raised rows (selected = ink border, never green) and the
 *   action sits in a sticky footer.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KaisipLockup } from '../components/brand';
import { FamiliarityRows, FAMILIARITY_QUESTION, MinutesControl } from '../components/fit';
import { FieldText, Plate, SeedSketch } from '../components/fieldguide';
import { StickyFooter } from '../components/quiz';
import { Button, Chip, Enter, Gap, T } from '../components/ui';
import { DataMessage, RestorePreview } from '../components/yourData';
import { WebImportPreview } from '../components/webImport';
import { EXAM_TRADEMARK_LINE, WELCOME_FACTS, WELCOME_HEADLINE, WELCOME_LINE } from '../content/brand';
import { DEFAULT_CERT_ID } from '../content/certifications';
import { dateInMonths, daysToExam, EXAM_DATE_PRESETS, presetIndexFor } from '../engine/examDay';
import { planConsequence } from '../engine/firstRun';
import { moveFocus } from '../lib/a11y';
import { buildTodayPlan } from '../lib/activity';
import { startFirstSet } from '../lib/firstSet';
import { useKeyboardShown } from '../lib/useKeyboardShown';
import { useRestoreFlow } from '../lib/useRestoreFlow';
import { CalendarSheet, chosenLine } from '../components/calendar';
import { DEFAULT_MINUTES, type DailyMinutes, type Familiarity } from '../engine/fit';
import { dayKey } from '../engine/streak';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { examDateOf, useSettings } from '../store/settings';
import { grovePlate } from '../theme/grove';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// Exam date presets (shared with Settings and the calendar). The calendar is
// pure React Native: no native date-picker dependency.
const PRESETS = EXAM_DATE_PRESETS;

/** The steps in order: welcome, where you start, date and minutes. */
type Step = 0 | 1 | 2;

export default function Onboarding() {
  const { c } = useTheme();
  const complete = useSettings((s) => s.completeOnboarding);
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<Step>(0);
  // Step 1 of 2: nothing chosen to start (no default biases the answer); skip leaves it unset.
  const [familiarity, setFamiliarity] = useState<Familiarity | undefined>(undefined);
  // Step 2 of 2: minutes most days, 20 to start.
  const [minutes, setMinutes] = useState<DailyMinutes>(DEFAULT_MINUTES);
  // The keyboard and the sticky footer never cover a field (UX review H2). No step types today; kept for safety.
  const typing = useKeyboardShown();
  // CISA is the only exam today, so it is chosen for the learner (no exam step).
  const certId = DEFAULT_CERT_ID;
  // The exam date ("YYYY-MM-DD"), none to start ("Not sure yet").
  // A quick choice or the calendar ("Pick the exact date") sets it.
  // "Now" is read again on each quick choice and each calendar open, so a step
  // left open past midnight never offers yesterday (render stays pure).
  const [now, setNow] = useState(() => Date.now());
  const [examDate, setExamDate] = useState<string | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Screen-reader focus comes back to "Pick the exact date" when the calendar closes.
  const pickRef = useRef<View>(null);
  const closeCalendar = () => {
    setCalendarOpen(false);
    moveFocus(pickRef, 450);
  };
  const preset = presetIndexFor(examDate, now);
  const [footerH, setFooterH] = useState(120);
  // Restore from a backup (shared with Settings → Your data). Success
  // finishes onboarding and goes straight to Today.
  // Website progress (mobile 1.42 review): ADDED, then onboarding goes on to its next step, so the
  // learner still chooses a starting point, exam date and daily time. Mobile 1.42.1: a newer website
  // file may have set the exam date (only when none was set); the date step starts on it, so finishing
  // keeps it (the learner can still change it).
  const restore = useRestoreFlow({
    onboard: true,
    onRestored: () => router.replace('/home'),
    onWebAdded: () => {
      const added = examDateOf(useSettings.getState().examDates, certId);
      if (added) setExamDate(added);
      setStep(1);
    },
  });

  // Each step's header takes screen-reader focus when the step changes (UX review P7).
  // Not tied to the step's entrance: the header is there from the first frame.
  const headRef = useRef<View>(null);
  useEffect(() => {
    if (step >= 1) moveFocus(headRef);
  }, [step]);

  // Android's back button steps back through onboarding; on the welcome step
  // it does the default (onboarding is the first screen, so the app closes).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep((step - 1) as Step);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  // Welcome (premium round 2, expert ruling C): a title page on the paper, like the first page of a
  // field guide. The Kasama mark and "kaisip", the headline, the sub ("A field guide to your CISA® exam
  // study."), an unnumbered seed plate ("Seed, before Day 1": Fig. 1 belongs to Day 1), then the four
  // plain lines and the not-affiliated line. Screen readers hear "Welcome to KaiSip. Think like an IS
  // auditor." as one header; the lockup and the plate are hidden (the words carry them).
  const welcome = (
    <Enter key="s0">
      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.xl }}>
        <KaisipLockup height={34} decorative />
        <T v="display" accessibilityRole="header" accessibilityLabel={`Welcome to KaiSip. ${WELCOME_HEADLINE}`} style={{ marginTop: space.xl }}>
          {WELCOME_HEADLINE}
        </T>
        <FieldText v="sub" style={{ marginTop: space.xs }}>{WELCOME_LINE}</FieldText>
        <View testID="welcome-plate" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ marginTop: space.xl }}>
          <Plate fig={{ title: 'Seed, before Day 1' }}>
            <View style={{ alignItems: 'center' }}>
              <SeedSketch width={Math.min(240, width - 2 * space.gutter - 2 * (grovePlate.edge + grovePlate.pad))} />
            </View>
          </Plate>
        </View>
      </View>
      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.lg }}>
        {/* Ruled lines on the paper (no icon circles): one stop each. */}
        {WELCOME_FACTS.map((line, i) => (
          <View
            key={line}
            accessible
            accessibilityRole="text"
            accessibilityLabel={line}
            style={{ paddingVertical: space.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.line }}
          >
            <T v="body">{line}</T>
          </View>
        ))}
        <T v="meta" color={c.muted} style={{ marginTop: space.md }}>{EXAM_TRADEMARK_LINE}</T>
      </View>
    </Enter>
  );

  // One tap saves everything and starts the first five questions. CISA is chosen for the learner.
  const finish = () => {
    // No name here since 1.41: a name already saved (a restore) is kept, and Today asks later if there is none.
    complete(certId, examDate, { familiarity, dailyMinutes: minutes });
    if (!useSettings.getState().displayName) useSeen.getState().setNameAsk('due');
    // No plant question in onboarding: the first set's closing screen offers one, and You keeps "Plant yours".
    // Today's own plant line stays hidden, so the first days have one setup line at a time.
    useProgress.getState().setPlantSettings({ promptHidden: true });
    // A 1.24+ learner: the only kind that may get the reminder ask's second chance (engine/firstRun.ts).
    useSeen.getState().noteReminderFlag('newLearner');
    // Day 1's plan (the first set) is made now, BEFORE any answer, so the five answers tick it off.
    buildTodayPlan(certId, false);
    // Website progress was added on the welcome screen: this learner has studied already, so Today, not the first set.
    if (Object.keys(selectCert(useProgress.getState(), certId).answers).length > 0) router.replace('/home');
    else if (startFirstSet(certId)) router.replace('/session');
    else router.replace('/home');
  };

  const daysLeft = daysToExam(examDate, dayKey(now));

  const body =
    step === 1 ? (
      <Enter key="s1">
        {/* After website progress was added on the welcome screen: the result, then the usual steps. */}
        {restore.message?.tone === 'ok' && (
          <View style={{ marginTop: space.lg }}>
            <DataMessage message={restore.message} />
          </View>
        )}
        <T v="caption" color={c.accentText} style={{ marginTop: space.xxl }}>Step 1 of 2</T>
        <StepHeader title={FAMILIARITY_QUESTION} headRef={headRef} />
        <T v="meta" style={{ marginTop: space.sm }}>This shapes your first week. You can change it any time in Settings.</T>
        <Gap h={space.xl} />
        <FamiliarityRows look="raised" value={familiarity} onChange={setFamiliarity} />
      </Enter>
    ) : (
      <Enter key="s2">
        <T v="caption" color={c.accentText} style={{ marginTop: space.xxl }}>Step 2 of 2</T>
        <StepHeader title="When is your exam?" headRef={headRef} />
        <T v="meta" style={{ marginTop: space.sm }}>For your countdown. A rough date is fine.</T>
        <Gap h={space.lg} />
        {/* No label on this wrapper: a View without a role never speaks it (UX review O7). The header names the group. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {PRESETS.map((p, i) => (
            <Chip
              key={p.label}
              label={p.label}
              selected={preset === i}
              onPress={() => {
                // The same fresh "now" for the date and for which chip is lit.
                const t = Date.now();
                setNow(t);
                setExamDate(p.months ? dateInMonths(p.months, t) : undefined);
              }}
            />
          ))}
        </View>
        {/* The exact day, for a learner who has booked: the same calendar as Settings. */}
        <Button
          ref={pickRef}
          kind="ghost"
          label="Pick the exact date"
          accessibilityHint="Opens a calendar"
          onPress={() => {
            setNow(Date.now());
            setCalendarOpen(true);
          }}
          style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.xs }}
        />
        {/* A date no quick choice gives: say which one, so the choice is never invisible. */}
        {examDate && preset < 0 ? <T v="meta" color={c.ink}>{chosenLine(examDate, dayKey(now))}</T> : null}
        {/* Daily time: the plan is sized to it (mobile 1.15). A second group on the same step, never a second screen. */}
        {/* space.xl, not xxl: after the ghost "Pick the exact date" a bigger gap read as a page break (UX review nit). */}
        <T v="caption" color={c.accentText} style={{ marginTop: space.xl }}>Daily time</T>
        <T v="headline" accessibilityRole="header" style={{ marginTop: space.sm }}>How long can you study most days?</T>
        <View style={{ marginTop: space.md }}>
          <MinutesControl value={minutes} onChange={setMinutes} />
        </View>
        <T v="meta" style={{ marginTop: space.sm }}>A rough guess is fine. Short days still count, and days don’t need to be in a row.</T>
        {/* What the two choices add up to (mobile 1.24), so they feel like they matter. */}
        <T v="body" style={{ marginTop: space.lg }}>{planConsequence(daysLeft, minutes)}</T>
      </Enter>
    );

  return (
    // Premium round 2: the welcome is a title page on the paper, so every step keeps the safe area
    // and the app's own status bar (no forest strip behind it any more).
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      {step === 0 ? (
        <ScrollView contentContainerStyle={{ paddingBottom: footerH + space.xl }}>{welcome}</ScrollView>
      ) : (
        // iOS moves the scroll insets itself; Android shrinks the view (the support sheet's pattern).
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? undefined : 'height'}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.lg, paddingBottom: (typing ? 0 : footerH) + space.xl }}
          >
            {body}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      {/* Hidden while the keyboard is up, so it never covers a field. */}
      {!typing && (
        <StickyFooter onHeight={setFooterH}>
          {step === 0 ? (
            <>
              {/* A bad file's message sits right above the buttons, where the learner is looking. */}
              {restore.message && <DataMessage message={restore.message} />}
              <Button label="Get started" onPress={() => setStep(1)} disabled={restore.busy !== null} />
              {/* A new phone: restore here instead of setting up again. */}
              <Button
                kind="ghost"
                label={restore.busy === 'pick' ? 'Opening…' : 'Restore from a backup'}
                accessibilityHint="Studied on another phone or on the KaiSip website? Pick your backup or progress file to bring your progress here."
                disabled={restore.busy !== null}
                onPress={restore.pick}
              />
            </>
          ) : step === 1 ? (
            <>
              <Button
                label="Continue"
                onPress={() => setStep(2)}
                disabled={!familiarity}
                accessibilityHint={familiarity ? undefined : 'Choose one, or skip this question.'}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button kind="ghost" label="Back" onPress={() => setStep(0)} />
                <Button
                  kind="ghost"
                  label="Skip this question"
                  accessibilityHint="Leaves it unset. You can answer it later in Settings."
                  onPress={() => {
                    setFamiliarity(undefined);
                    setStep(2);
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <Button label="Start my first questions" accessibilityHint="Saves your choices and starts five questions, with no timer." onPress={finish} />
              <Button kind="ghost" label="Back" onPress={() => setStep(1)} style={{ alignSelf: 'center' }} />
            </>
          )}
        </StickyFooter>
      )}
      <CalendarSheet
        visible={calendarOpen}
        value={examDate}
        now={now}
        onClose={closeCalendar}
        onSave={(d) => {
          setExamDate(d);
          closeCalendar();
        }}
      />
      <RestorePreview ready={restore.ready} busy={restore.busy === 'restore'} onConfirm={restore.confirm} onCancel={restore.cancel} />
      {/* Mobile 1.42: progress exported from the KaiSip website can start the app too. */}
      <WebImportPreview web={restore.web} busy={restore.busy === 'web'} onConfirm={restore.confirmWeb} onCancel={restore.cancelWeb} onboarding />
    </SafeAreaView>
  );
}

/** A step's big question: one header stop that screen-reader focus can move to (UX review P7). */
function StepHeader({ title, headRef }: { title: string; headRef: RefObject<View | null> }) {
  return (
    <View ref={headRef} accessible accessibilityRole="header" accessibilityLabel={title} style={{ marginTop: space.sm }}>
      <T v="display">{title}</T>
    </View>
  );
}
