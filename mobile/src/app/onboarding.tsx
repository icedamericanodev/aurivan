/**
 * Onboarding — 2 quick steps: pick your certification, then (optionally)
 * your exam date. Kept short on purpose: the FTUE decision in
 * MASTER_HANDOFF.md is "get learners to a question fast".
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, Gap, Pill, Row, Screen, T } from '../components/ui';
import { CERTIFICATIONS } from '../content/certifications';
import { dayKey } from '../engine/streak';
import { useSettings } from '../store/settings';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// Exam date presets avoid a native date-picker dependency for v1.
const PRESETS: { label: string; months?: number }[] = [
  { label: 'In 1 month', months: 1 },
  { label: 'In 2 months', months: 2 },
  { label: 'In 3 months', months: 3 },
  { label: 'Not sure yet' },
];

function dateInMonths(m: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + m);
  return dayKey(d.getTime()); // local calendar date, not UTC
}

export default function Onboarding() {
  const { c } = useTheme();
  const complete = useSettings((s) => s.completeOnboarding);
  const [step, setStep] = useState<1 | 2>(1);
  const [certId, setCertId] = useState('cisa');
  const [preset, setPreset] = useState<number>(3);

  if (step === 1) {
    return (
      <Screen>
        <T v="caption">Aurivan · Master modern risk</T>
        <Gap h={space.sm} />
        <T v="display">Which exam are you preparing for?</T>
        <Gap h={space.sm} />
        <T v="meta">You can switch any time in Settings.</T>
        <Gap />
        {CERTIFICATIONS.map((cert) => {
          const available = cert.status === 'available';
          const selected = certId === cert.id;
          return (
            <Card
              key={cert.id}
              onPress={available ? () => setCertId(cert.id) : undefined}
              accessibilityLabel={`${cert.name}, ${cert.fullName}${available ? '' : ', coming soon'}`}
              style={{
                marginBottom: space.md,
                // Selected = 2px ink border (green never means "selected").
                borderColor: selected ? c.ink : c.line,
                borderWidth: selected ? 2 : 1,
              }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="headline" color={available ? c.ink : c.muted}>{selected ? `✓ ${cert.name}` : cert.name}</T>
                {!available && <Pill label="Coming soon" />}
              </Row>
              <T v="meta" color={available ? c.ink2 : c.muted}>{cert.fullName}</T>
            </Card>
          );
        })}
        <Gap h={space.sm} />
        <Button label="Continue" onPress={() => setStep(2)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <T v="display">When is your exam?</T>
      <Gap h={space.sm} />
      <T v="meta">For your countdown. A rough date is fine.</T>
      <Gap />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {PRESETS.map((p, i) => (
          <Chip key={p.label} label={p.label} selected={preset === i} onPress={() => setPreset(i)} />
        ))}
      </View>
      <Gap h={space.xxl} />
      <Button
        label="Start studying"
        onPress={() => {
          const m = PRESETS[preset].months;
          complete(certId, m ? dateInMonths(m) : undefined);
          router.replace('/home');
        }}
      />
      <Gap h={space.sm} />
      <Button kind="ghost" label="Back" onPress={() => setStep(1)} />
    </Screen>
  );
}
