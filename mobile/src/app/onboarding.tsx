/**
 * Onboarding — a welcome, then 4 quick steps: pick your certification,
 * where you're starting from (optional, mobile 1.15), your exam date and
 * how long you can study most days (mobile 1.15), then (optionally, mobile
 * 1.13) plant your companion plant. Kept short on purpose: the FTUE decision in
 * MASTER_HANDOFF.md is "get learners to a question fast". "Plant it" takes
 * about 10 seconds and can be skipped; skipping never brings a nudge back
 * (You keeps a "Plant yours" entry).
 *
 * Welcome (step 0): the brand moment. A forest panel with the True North
 * lockup, the tagline and the line, then the four pillars. One tap on
 * "Start my plan" moves on; nothing is saved until the last step.
 *
 * Mobile 1.17: step 3 keeps its quick choices and adds "Pick the exact date",
 * the same calendar sheet as Settings → Exam date (components/calendar.tsx).
 *
 * Mobile 1.15 (PHASE5.md §1): step 2 "Where are you starting from?" (no
 * preselected answer; "Skip this question" leaves it unset) shapes the first
 * week: a learner new to audit starts with a lesson, an experienced one with
 * exam practice. Step 3 adds "How long can you study most days?" (20 min by
 * default) under the date. Both "Plant it" and "Skip for now" save the
 * exam, the date and these answers in the same tap.
 *
 * Grove v2: a seedling to open (your grove starts here), certifications as
 * raised choice rows (selected = 2px ink border + filled ink badge, never
 * green), and the action in a sticky footer.
 */
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { BrandLockup, PillarList } from '../components/brand';
import { Seedling } from '../components/glyphs';
import { ChoiceRow, FamiliarityRows, FAMILIARITY_QUESTION, MinutesControl } from '../components/fit';
import { StickyFooter } from '../components/quiz';
import { Button, Chip, Enter, Gap, T } from '../components/ui';
import { DataMessage, RestorePreview } from '../components/yourData';
import { PlantNameField, SpeciesGrid } from '../components/plant/PlantUI';
import { backfillLine, plantCallName, plantHasFace, plantLabel, SPECIES_INFO, SPROUT_ANSWERS, suggestName, type PlantSpecies } from '../engine/plant';
import { LivePlant } from '../components/plant/LivePlant';
import { haptic } from '../lib/haptics';
import { moveFocus } from '../lib/a11y';
import { plantFor } from '../lib/plant';
import { selectCert, useProgress } from '../store/progress';
import { TAGLINE, VISION_LINE } from '../content/brand';
import { CERTIFICATIONS } from '../content/certifications';
import { dateInMonths, EXAM_DATE_PRESETS, presetIndexFor } from '../engine/examDay';
import { CalendarSheet, chosenLine } from '../components/calendar';
import { dayKey } from '../engine/streak';
import { useKeyboardShown } from '../lib/useKeyboardShown';
import { useRestoreFlow } from '../lib/useRestoreFlow';
import { useSettings } from '../store/settings';
import { DEFAULT_MINUTES, type DailyMinutes, type Familiarity } from '../engine/fit';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// Exam date presets (shared with Settings and the calendar). The calendar is
// pure React Native: no native date-picker dependency.
const PRESETS = EXAM_DATE_PRESETS;

export default function Onboarding() {
  const { c, isDark } = useTheme();
  const complete = useSettings((s) => s.completeOnboarding);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  // Step 2 (mobile 1.15): nothing chosen to start (no default biases the answer); skip leaves it unset.
  const [familiarity, setFamiliarity] = useState<Familiarity | undefined>(undefined);
  // Step 3 (mobile 1.15): minutes most days, 20 to start.
  const [minutes, setMinutes] = useState<DailyMinutes>(DEFAULT_MINUTES);
  // Step 4 (mobile 1.13): the plant and its name (empty to start; the field shows an idea as its placeholder).
  const [species, setSpecies] = useState<PlantSpecies>('oak');
  const [plantName, setPlantName] = useState('');
  // The keyboard and the sticky footer never cover the name field (UX review H2).
  const typing = useKeyboardShown();
  const [certId, setCertId] = useState('cisa');
  // Step 3: the exam date ("YYYY-MM-DD"), none to start ("Not sure yet").
  // A quick choice or the calendar ("Pick the exact date") sets it.
  const [now] = useState(() => Date.now());
  const [examDate, setExamDate] = useState<string | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const preset = presetIndexFor(examDate, now);
  const [footerH, setFooterH] = useState(120);
  // Restore from a backup (shared with Settings → Your data). Success
  // finishes onboarding and goes straight to Today.
  const restore = useRestoreFlow({ onboard: true, onRestored: () => router.replace('/home') });

  // After planting (step 5): on to Today.
  const finishPlanted = useCallback(() => router.replace('/home'), []);
  // "Plant it" is gone once the step changes: screen-reader focus moves to the
  // "Planted" header instead of being dropped (UX review P16, code review M10b).
  const plantedRef = useRef<View>(null);
  // Each step's header takes screen-reader focus when the step changes (UX review P7).
  // Not tied to the step's entrance: the header is there from the first frame.
  const headRef = useRef<View>(null);
  useEffect(() => {
    if (step >= 1 && step <= 4) moveFocus(headRef);
  }, [step]);

  // Android's back button steps back through onboarding; on the welcome step
  // it does the default (onboarding is the first screen, so the app closes).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      // Planted (step 5): back means "go on", never un-planting.
      if (step === 5) {
        finishPlanted();
        return true;
      }
      setStep((step - 1) as 0 | 1 | 2 | 3);
      return true;
    });
    return () => sub.remove();
  }, [step, finishPlanted]);

  // Welcome: forest panel, then the pillars on the page. A fixed forest strip
  // sits behind the status bar (outside the scroll view), so the light
  // status-bar icons stay readable when the panel scrolls away.
  const welcome = (
    <Enter key="s0">
      <View
        style={{
          backgroundColor: c.forest,
          paddingTop: space.xl,
          paddingHorizontal: space.gutter,
          paddingBottom: space.xxl,
          borderBottomLeftRadius: radius.lg,
          borderBottomRightRadius: radius.lg,
          overflow: 'hidden',
        }}
      >
        {/* Growth rings bleeding off the bottom-right corner, like the app icon. Decorative. */}
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={{ position: 'absolute', right: -90, bottom: -110, pointerEvents: 'none' }}
        >
          <Svg width={260} height={260} viewBox="0 0 260 260">
            {[60, 92, 126].map((r) => (
              <Circle key={r} cx={130} cy={130} r={r} fill="none" stroke={c.forestLine} strokeWidth={1.5} />
            ))}
          </Svg>
        </View>
        <BrandLockup tone="dark" height={34} />
        <T v="display" color={c.onForest} accessibilityRole="header" style={{ marginTop: space.xl }}>
          {TAGLINE}
        </T>
        <T v="quote" color={c.onForest2} style={{ marginTop: space.xs }}>{VISION_LINE}</T>
      </View>
      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.xl }}>
        <PillarList look="cards" />
      </View>
    </Enter>
  );

  // Finish onboarding with the chosen exam, date and fit; then plant (or not).
  const finish = (plant: boolean) => {
    complete(certId, examDate, { familiarity, dailyMinutes: minutes });
    if (plant) {
      // Mobile 1.14 (M8): plant now (onboarding is already done, so closing
      // the app here loses nothing), then a short planting moment (step 4):
      // the seed settles and its first sprout pops. One soft haptic.
      plantFor(certId, species, plantName);
      haptic.light();
      setStep(5);
      moveFocus(plantedRef);
      return;
    }
    // Skipped: no nudge on Today later; You keeps "Plant yours".
    useProgress.getState().setPlantSettings({ promptHidden: true });
    router.replace('/home');
  };
  const planted = step === 5 ? selectCert(useProgress.getState(), certId).plant : undefined;

  const body =
    step === 5 && planted ? (
      <Enter key="s5">
        <View style={{ alignItems: 'center', marginTop: space.xxl }}>
          <LivePlant
            species={planted.species}
            stage={planted.growth}
            size={168}
            theme={isDark ? 'dark' : 'light'}
            fit
            quietLook={!plantHasFace(useProgress.getState().plantSettings)}
            plantIn
            accessibilityLabel={plantLabel({ name: planted.name, species: planted.species, growth: planted.growth })}
          />
        </View>
        <View ref={plantedRef} accessible accessibilityRole="header" accessibilityLabel="Planted" style={{ marginTop: space.xl }}>
          <T v="display" center>Planted</T>
        </View>
        <T v="quote" center color={c.ink2} style={{ marginTop: space.sm }}>
          {planted.growth > 1 ? backfillLine(planted, planted.growth) : `Your first ${SPROUT_ANSWERS} answers give ${plantCallName(planted)} its first sprout.`}
        </T>
        <T v="meta" center style={{ marginTop: space.md }}>It grows only from real progress. It asks for nothing.</T>
      </Enter>
    ) : step === 4 ? (
      <Enter key="s4">
        <T v="caption" color={c.accentText} style={{ marginTop: space.xxl }}>Step 4 of 4</T>
        <StepHeader title="Plant something that grows with you" headRef={headRef} />
        <T v="meta" style={{ marginTop: space.sm }}>It grows only from real progress across the exam outline. Never from taps or time. It asks for nothing and never wilts. Optional.</T>
        <Gap h={space.xl} />
        <SpeciesGrid
          value={species}
          onChange={(s) => {
            if (SPECIES_INFO[species].suggestions.includes(plantName)) setPlantName(suggestName(s, Math.random()));
            setSpecies(s);
          }}
        />
        <T v="quote" color={c.ink2} style={{ marginTop: space.md }}>{`${SPECIES_INFO[species].name}: ${SPECIES_INFO[species].line}`}</T>
        <View style={{ marginTop: space.xl }}>
          <PlantNameField species={species} value={plantName} onChange={setPlantName} />
        </View>
      </Enter>
    ) : step === 1 ? (
      <Enter key="s1">
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ marginLeft: -space.lg }}>
          <Seedling color={c.accent} size={110} />
        </View>
        <T v="caption" color={c.accentText} style={{ marginTop: space.sm }}>Step 1 of 4</T>
        <StepHeader title="Which exam are you preparing for?" headRef={headRef} />
        <T v="meta" style={{ marginTop: space.sm }}>You can switch any time in Settings.</T>
        <Gap h={space.xl} />
        <View accessibilityRole="radiogroup" accessibilityLabel="Which exam are you preparing for?">
          {CERTIFICATIONS.map((cert) => {
            const available = cert.status === 'available';
            return (
              <ChoiceRow
                key={cert.id}
                title={cert.name}
                subtitle={available ? cert.fullName : `${cert.fullName} · coming soon`}
                accessibilityLabel={`${cert.name}, ${cert.fullName}${available ? '' : ', coming soon'}`}
                selected={certId === cert.id}
                disabled={!available}
                onPress={() => setCertId(cert.id)}
              />
            );
          })}
        </View>
        <T v="meta" color={c.muted} style={{ marginTop: space.md }}>
          Not affiliated with or endorsed by ISACA® or ISC2®. Exam names are trademarks of their owners.
        </T>
      </Enter>
    ) : step === 2 ? (
      <Enter key="s2">
        <T v="caption" color={c.accentText} style={{ marginTop: space.xxl }}>Step 2 of 4</T>
        <StepHeader title={FAMILIARITY_QUESTION} headRef={headRef} />
        <T v="meta" style={{ marginTop: space.sm }}>This shapes your first week. You can change it any time in Settings.</T>
        <Gap h={space.xl} />
        <FamiliarityRows look="raised" value={familiarity} onChange={setFamiliarity} />
      </Enter>
    ) : (
      <Enter key="s3">
        <T v="caption" color={c.accentText} style={{ marginTop: space.xxl }}>Step 3 of 4</T>
        <StepHeader title="When is your exam?" headRef={headRef} />
        <T v="meta" style={{ marginTop: space.sm }}>For your countdown. A rough date is fine.</T>
        <Gap h={space.lg} />
        {/* No label on this wrapper: a View without a role never speaks it (UX review O7). The header names the group. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {PRESETS.map((p, i) => (
            <Chip key={p.label} label={p.label} selected={preset === i} onPress={() => setExamDate(p.months ? dateInMonths(p.months, now) : undefined)} />
          ))}
        </View>
        {/* The exact day, for a learner who has booked: the same calendar as Settings. */}
        <Button
          kind="ghost"
          label="Pick the exact date"
          accessibilityHint="Opens a calendar"
          onPress={() => setCalendarOpen(true)}
          style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.xs }}
        />
        {/* A date no quick choice gives: say which one, so the choice is never invisible. */}
        {examDate && preset < 0 ? <T v="meta" color={c.ink}>{chosenLine(examDate, dayKey(now))}</T> : null}
        {/* Daily time: the plan is sized to it (mobile 1.15). A second group on the same step, never a second screen. */}
        <T v="caption" color={c.accentText} style={{ marginTop: space.xxl }}>Daily time</T>
        <T v="headline" accessibilityRole="header" style={{ marginTop: space.sm }}>How long can you study most days?</T>
        <View style={{ marginTop: space.md }}>
          <MinutesControl value={minutes} onChange={setMinutes} />
        </View>
        <T v="meta" style={{ marginTop: space.sm }}>A rough guess is fine. Short days still count, and days don’t need to be in a row.</T>
      </Enter>
    );

  return (
    // The welcome panel draws its own top inset; the steps keep the safe area.
    <SafeAreaView edges={step === 0 ? ['bottom'] : ['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Light status-bar icons over the forest panel; the app's default returns on step 1. */}
      {step === 0 && <StatusBar style="light" />}
      {step === 0 && <View style={{ height: insets.top, backgroundColor: c.forest }} />}
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
      {/* Hidden while typing (step 4's name): "Done" on the keyboard brings the buttons back. */}
      {!typing && (
        <StickyFooter onHeight={setFooterH}>
          {step === 0 ? (
            <>
              {/* A bad file's message sits right above the buttons, where the learner is looking. */}
              {restore.message && <DataMessage message={restore.message} />}
              <Button label="Start my plan" onPress={() => setStep(1)} disabled={restore.busy !== null} />
              {/* Moving phones: restore here instead of setting up again. */}
              <Button
                kind="ghost"
                label={restore.busy === 'pick' ? 'Opening…' : 'Restore from a backup'}
                accessibilityHint="Studied on another phone? Pick your Aurivan backup file to bring your progress here."
                disabled={restore.busy !== null}
                onPress={restore.pick}
              />
            </>
          ) : step === 1 ? (
            <>
              <Button label="Continue" onPress={() => setStep(2)} />
              <Button kind="ghost" label="Back" onPress={() => setStep(0)} />
            </>
          ) : step === 5 ? (
            <Button label="Start studying" onPress={finishPlanted} />
          ) : step === 2 ? (
            <>
              <Button
                label="Continue"
                onPress={() => setStep(3)}
                disabled={!familiarity}
                accessibilityHint={familiarity ? undefined : 'Choose one, or skip this question.'}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button kind="ghost" label="Back" onPress={() => setStep(1)} />
                <Button
                  kind="ghost"
                  label="Skip this question"
                  accessibilityHint="Leaves it unset. You can answer it later in Settings."
                  onPress={() => {
                    setFamiliarity(undefined);
                    setStep(3);
                  }}
                />
              </View>
            </>
          ) : step === 3 ? (
            <>
              <Button label="Continue" onPress={() => setStep(4)} />
              <Button kind="ghost" label="Back" onPress={() => setStep(2)} />
            </>
          ) : (
            <>
              <Button label="Plant it" onPress={() => finish(true)} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button kind="ghost" label="Back" onPress={() => setStep(3)} />
                <Button kind="ghost" label="Skip for now" accessibilityHint="Starts studying without a plant. You can plant one later from You." onPress={() => finish(false)} />
              </View>
            </>
          )}
        </StickyFooter>
      )}
      <CalendarSheet
        visible={calendarOpen}
        value={examDate}
        now={now}
        onClose={() => setCalendarOpen(false)}
        onSave={(d) => {
          setExamDate(d);
          setCalendarOpen(false);
        }}
      />
      <RestorePreview ready={restore.ready} busy={restore.busy === 'restore'} onConfirm={restore.confirm} onCancel={restore.cancel} />
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
