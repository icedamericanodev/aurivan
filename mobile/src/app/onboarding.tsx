/**
 * Onboarding — a welcome, then 2 quick steps: pick your certification, then
 * (optionally) your exam date. Kept short on purpose: the FTUE decision in
 * MASTER_HANDOFF.md is "get learners to a question fast".
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
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { BrandLockup, PillarList } from '../components/brand';
import { Seedling } from '../components/glyphs';
import { Check } from '../components/icons';
import { StickyFooter } from '../components/quiz';
import { Button, Chip, Enter, Gap, T } from '../components/ui';
import { TAGLINE, VISION_LINE } from '../content/brand';
import { CERTIFICATIONS } from '../content/certifications';
import { dateInMonths, EXAM_DATE_PRESETS } from '../engine/examDay';
import { useSettings } from '../store/settings';
import { radius, raisedShadow, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// Exam date presets (shared with Settings) avoid a native date-picker dependency.
const PRESETS = EXAM_DATE_PRESETS;

export default function Onboarding() {
  const { c, isDark } = useTheme();
  const complete = useSettings((s) => s.completeOnboarding);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [certId, setCertId] = useState('cisa');
  const [preset, setPreset] = useState<number>(3);
  const [footerH, setFooterH] = useState(120);

  // Welcome: full-bleed forest panel (it runs up under the status bar, so it
  // pads itself by the top inset), then the pillars on the page.
  const welcome = (
    <Enter key="s0">
      <View
        style={{
          backgroundColor: c.forest,
          paddingTop: insets.top + space.xl,
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

  const body =
    step === 1 ? (
      <Enter key="s1">
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ marginLeft: -space.lg }}>
          <Seedling color={c.accent} size={110} />
        </View>
        <T v="caption" color={c.accentText} style={{ marginTop: space.sm }}>Step 1 of 2</T>
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
      </Enter>
    ) : (
      <Enter key="s2">
        <T v="caption" color={c.accentText} style={{ marginTop: space.xxl }}>Step 2 of 2</T>
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
      {step === 0 ? (
        <ScrollView contentContainerStyle={{ paddingBottom: footerH + space.xl }}>{welcome}</ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.lg, paddingBottom: footerH + space.xl }}>
          {body}
        </ScrollView>
      )}
      <StickyFooter onHeight={setFooterH}>
        {step === 0 ? (
          <Button label="Start my plan" onPress={() => setStep(1)} />
        ) : step === 1 ? (
          <>
            <Button label="Continue" onPress={() => setStep(2)} />
            <Button kind="ghost" label="Back" onPress={() => setStep(0)} />
          </>
        ) : (
          <>
            <Button
              label="Start studying"
              onPress={() => {
                const m = PRESETS[preset].months;
                complete(certId, m ? dateInMonths(m, Date.now()) : undefined);
                router.replace('/home');
              }}
            />
            <Button kind="ghost" label="Back" onPress={() => setStep(1)} />
          </>
        )}
      </StickyFooter>
    </SafeAreaView>
  );
}
