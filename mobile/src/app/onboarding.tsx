/**
 * Onboarding — 2 quick steps: pick your certification, then (optionally)
 * your exam date. Kept short on purpose: the FTUE decision in
 * MASTER_HANDOFF.md is "get learners to a question fast".
 *
 * Grove v2: a seedling to open (your grove starts here), certifications as
 * raised choice rows (selected = 2px ink border + filled ink badge, never
 * green), and the action in a sticky footer.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Seedling } from '../components/glyphs';
import { Check } from '../components/icons';
import { StickyFooter } from '../components/quiz';
import { Button, Chip, Enter, Gap, T } from '../components/ui';
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
  const [step, setStep] = useState<1 | 2>(1);
  const [certId, setCertId] = useState('cisa');
  const [preset, setPreset] = useState<number>(3);
  const [footerH, setFooterH] = useState(120);

  const body =
    step === 1 ? (
      <Enter key="s1">
        <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ marginLeft: -space.lg }}>
          <Seedling color={c.accent} size={110} />
        </View>
        <T v="caption" color={c.accentText} style={{ marginTop: space.sm }}>Welcome to Aurivan · Step 1 of 2</T>
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
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.lg, paddingBottom: footerH + space.xl }}>
        {body}
      </ScrollView>
      <StickyFooter onHeight={setFooterH}>
        {step === 1 ? (
          <Button label="Continue" onPress={() => setStep(2)} />
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
