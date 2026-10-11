/**
 * Onboarding — a welcome, then 3 quick steps: pick your certification,
 * (optionally) your exam date, then (optionally, mobile 1.13) plant your
 * companion plant. Kept short on purpose: the FTUE decision in
 * MASTER_HANDOFF.md is "get learners to a question fast". "Plant it" takes
 * about 10 seconds and can be skipped; skipping never brings a nudge back
 * (You keeps a "Plant yours" entry).
 *
 * Welcome (step 0): the brand moment. A forest panel with the True North
 * lockup, the tagline and the line, then the four pillars. One tap on
 * "Start my plan" moves on; nothing is saved until the last step.
 *
 * Grove v2: a seedling to open (your grove starts here), certifications as
 * raised choice rows (selected = 2px ink border + filled ink badge, never
 * green), and the action in a sticky footer.
 */
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { BrandLockup, PillarList } from '../components/brand';
import { Seedling } from '../components/glyphs';
import { Check } from '../components/icons';
import { StickyFooter } from '../components/quiz';
import { Button, Chip, Enter, Gap, T } from '../components/ui';
import { DataMessage, RestorePreview } from '../components/yourData';
import { PlantNameField, SpeciesGrid } from '../components/plant/PlantUI';
import { backfillLine, plantCallName, plantHasFace, plantLabel, SPECIES_INFO, SPROUT_ANSWERS, suggestName, type PlantSpecies } from '../engine/plant';
import { LivePlant } from '../components/plant/LivePlant';
import { haptic } from '../lib/haptics';
import { plantFor } from '../lib/plant';
import { selectCert, useProgress } from '../store/progress';
import { TAGLINE, VISION_LINE } from '../content/brand';
import { CERTIFICATIONS } from '../content/certifications';
import { dateInMonths, EXAM_DATE_PRESETS } from '../engine/examDay';
import { useKeyboardShown } from '../lib/useKeyboardShown';
import { useRestoreFlow } from '../lib/useRestoreFlow';
import { useSettings } from '../store/settings';
import { radius, raisedShadow, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// Exam date presets (shared with Settings) avoid a native date-picker dependency.
const PRESETS = EXAM_DATE_PRESETS;

export default function Onboarding() {
  const { c, isDark } = useTheme();
  const complete = useSettings((s) => s.completeOnboarding);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  // Step 3 (mobile 1.13): the plant and its name (empty to start; the field shows an idea as its placeholder).
  const [species, setSpecies] = useState<PlantSpecies>('oak');
  const [plantName, setPlantName] = useState('');
  // The keyboard and the sticky footer never cover the name field (UX review H2).
  const typing = useKeyboardShown();
  const [certId, setCertId] = useState('cisa');
  const [preset, setPreset] = useState<number>(3);
  const [footerH, setFooterH] = useState(120);
  // Restore from a backup (shared with Settings → Your data). Success
  // finishes onboarding and goes straight to Today.
  const restore = useRestoreFlow({ onboard: true, onRestored: () => router.replace('/home') });

  // After planting (step 4): on to Today.
  const finishPlanted = useCallback(() => router.replace('/home'), []);

  // Android's back button steps back through onboarding; on the welcome step
  // it does the default (onboarding is the first screen, so the app closes).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      // Planted (step 4): back means "go on", never un-planting.
      if (step === 4) {
        finishPlanted();
        return true;
      }
      setStep(step === 3 ? 2 : step === 2 ? 1 : 0);
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

  // Finish onboarding with the chosen exam and date; then plant (or not).
  const finish = (plant: boolean) => {
    const m = PRESETS[preset].months;
    complete(certId, m ? dateInMonths(m, Date.now()) : undefined);
    if (plant) {
      // Mobile 1.14 (M8): plant now (onboarding is already done, so closing
      // the app here loses nothing), then a short planting moment (step 4):
      // the seed settles and its first sprout pops. One soft haptic.
      plantFor(certId, species, plantName);
      haptic.light();
      setStep(4);
      return;
    }
    // Skipped: no nudge on Today later; You keeps "Plant yours".
    useProgress.getState().setPlantSettings({ promptHidden: true });
    router.replace('/home');
  };
  const planted = step === 4 ? selectCert(useProgress.getState(), certId).plant : undefined;

  const body =
    step === 4 && planted ? (
      <Enter key="s4">
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
        <T v="display" center accessibilityRole="header" style={{ marginTop: space.xl }}>Planted</T>
        <T v="quote" center color={c.ink2} style={{ marginTop: space.sm }}>
          {planted.growth > 1 ? backfillLine(planted, planted.growth) : `Your first ${SPROUT_ANSWERS} answers give ${plantCallName(planted)} its first sprout.`}
        </T>
        <T v="meta" center style={{ marginTop: space.md }}>It grows only from real progress. It asks for nothing.</T>
      </Enter>
    ) : step === 3 ? (
      <Enter key="s3">
        <T v="caption" color={c.accentText} style={{ marginTop: space.xxl }}>Step 3 of 3</T>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.sm }}>Plant something that grows with you</T>
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
        <T v="caption" color={c.accentText} style={{ marginTop: space.sm }}>Step 1 of 3</T>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.sm }}>Which exam are you preparing for?</T>
        <T v="meta" style={{ marginTop: space.sm }}>You can switch any time in Settings.</T>
        <Gap h={space.xl} />
        {CERTIFICATIONS.map((cert) => {
          const available = cert.status === 'available';
          const selected = certId === cert.id;
          return (
            <Pressable
              key={cert.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: !available }}
              accessibilityLabel={`${cert.name}, ${cert.fullName}${available ? '' : ', coming soon'}`}
              disabled={!available}
              onPress={() => setCertId(cert.id)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  minHeight: 64,
                  borderRadius: radius.md,
                  backgroundColor: c.raised,
                  // Selected = 2px ink border; padding shrinks 0.5 so nothing jumps.
                  borderWidth: selected ? 2 : 1.5,
                  borderColor: selected ? c.ink : isDark ? c.line : 'transparent',
                  paddingVertical: selected ? 13.5 : 14,
                  paddingHorizontal: selected ? 15.5 : 16,
                  marginBottom: 10,
                },
                !isDark && raisedShadow,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  borderWidth: 1.5,
                  borderColor: selected ? c.ink : available ? c.control : c.line,
                  backgroundColor: selected ? c.ink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected && <Check size={16} color={c.bg} strokeWidth={2.5} />}
              </View>
              <View style={{ flex: 1 }}>
                <T v="label" color={available ? c.ink : c.muted}>{cert.name}</T>
                <T v="meta" color={available ? c.ink2 : c.muted}>{available ? cert.fullName : `${cert.fullName} · coming soon`}</T>
              </View>
            </Pressable>
          );
        })}
        <T v="meta" color={c.muted} style={{ marginTop: space.md }}>
          Not affiliated with or endorsed by ISACA® or ISC2®. Exam names are trademarks of their owners.
        </T>
      </Enter>
    ) : (
      <Enter key="s2">
        <T v="caption" color={c.accentText} style={{ marginTop: space.xxl }}>Step 2 of 3</T>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.sm }}>When is your exam?</T>
        <T v="meta" style={{ marginTop: space.sm }}>For your countdown. A rough date is fine.</T>
        <Gap h={space.xl} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {PRESETS.map((p, i) => (
            <Chip key={p.label} label={p.label} selected={preset === i} onPress={() => setPreset(i)} />
          ))}
        </View>
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
      {/* Hidden while typing (step 3's name): "Done" on the keyboard brings the buttons back. */}
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
          ) : step === 4 ? (
            <Button label="Start studying" onPress={finishPlanted} />
          ) : step === 2 ? (
            <>
              <Button label="Continue" onPress={() => setStep(3)} />
              <Button kind="ghost" label="Back" onPress={() => setStep(1)} />
            </>
          ) : (
            <>
              <Button label="Plant it" onPress={() => finish(true)} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button kind="ghost" label="Back" onPress={() => setStep(2)} />
                <Button kind="ghost" label="Skip for now" accessibilityHint="Starts studying without a plant. You can plant one later from You." onPress={() => finish(false)} />
              </View>
            </>
          )}
        </StickyFooter>
      )}
      <RestorePreview ready={restore.ready} busy={restore.busy === 'restore'} onConfirm={restore.confirm} onCancel={restore.cancel} />
    </SafeAreaView>
  );
}
