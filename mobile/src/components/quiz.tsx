/**
 * Quiz building blocks used by the session screen.
 * Each implements a locked decision from design-notes/MASTER_HANDOFF.md.
 */
import { useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import type { Letter } from '../content/types';
import type { Confidence } from '../engine/srs';
import { font, radius, size, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Button, Card, Chip, Gap, Row, T } from './ui';

// ── Scenario block: "Sealed Brief" style, collapsible on mobile ───────
export function ScenarioBlock({ text }: { text: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const long = text.length > 220;
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: c.accent, backgroundColor: c.surface2, padding: space.md, borderRadius: radius.sm }}>
      <T v="mono" color={c.accent}>SCENARIO</T>
      <Gap h={space.xs} />
      <T v="body" color={c.text2}>{long && !open ? `${text.slice(0, 200).trimEnd()}…` : text}</T>
      {long && (
        <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={{ paddingVertical: space.sm }}>
          <T v="label" color={c.accent}>{open ? 'Show less' : 'Read full scenario'}</T>
        </Pressable>
      )}
    </View>
  );
}

// ── Option card: full-width, ≥56px, thumb-friendly ────────────────────
export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

export function OptionCard({
  letter,
  text,
  state,
  onPress,
  disabled,
}: {
  letter: Letter;
  text: string;
  state: OptionState;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const look = {
    idle: { border: c.border, bg: c.surface, badge: c.surface2, badgeText: c.text2 },
    selected: { border: c.accent, bg: c.surface, badge: c.accentFill, badgeText: c.onAccent },
    correct: { border: c.correct, bg: c.correctBg, badge: c.correct, badgeText: c.bg },
    wrong: { border: c.wrong, bg: c.wrongBg, badge: c.wrong, badgeText: c.bg },
    dimmed: { border: c.border, bg: c.surface, badge: c.surface2, badgeText: c.muted },
  }[state];
  const suffix = state === 'correct' ? ', correct answer' : state === 'wrong' ? ', your answer, incorrect' : state === 'selected' ? ', selected' : '';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: state === 'selected', disabled }}
      accessibilityLabel={`Option ${letter}: ${text}${suffix}`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: space.md,
        alignItems: 'flex-start',
        minHeight: 56,
        padding: space.md,
        marginBottom: space.sm,
        borderRadius: radius.md,
        borderWidth: state === 'idle' || state === 'dimmed' ? 1 : 2,
        borderColor: look.border,
        backgroundColor: look.bg,
        opacity: state === 'dimmed' ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: look.badge, alignItems: 'center', justifyContent: 'center' }}>
        <T v="label" color={look.badgeText} style={{ fontFamily: font.bold }}>{letter}</T>
      </View>
      <T v="body" style={{ flex: 1 }}>{text}</T>
    </Pressable>
  );
}

// ── Confidence row: shown after selecting, before submitting ──────────
const CONF: { label: string; value: Confidence }[] = [
  { label: 'Sure', value: 'sure' },
  { label: 'Unsure', value: 'unsure' },
  { label: 'Guessing', value: 'guessing' },
];

export function ConfidenceRow({ value, onChange }: { value?: Confidence; onChange: (v: Confidence) => void }) {
  const { c } = useTheme();
  return (
    <View>
      <T v="caption" color={c.text2}>How confident are you?</T>
      <Gap h={space.xs} />
      <Row gap={space.sm}>
        {CONF.map((x) => (
          <Chip key={x.value} label={x.label} selected={value === x.value} onPress={() => onChange(x.value)} />
        ))}
      </Row>
    </View>
  );
}

// ── Tips: sequential reveal Trap → Mindset → Exam-day (→ bonus) ───────
const TIP_LABELS = ['The trap', 'The mindset', 'Exam-day shortcut', 'One more thing'];

export function TipsReveal({ tips }: { tips: string[] }) {
  const { c } = useTheme();
  const [shown, setShown] = useState(1);
  const reveal = () => {
    const next = Math.min(shown + 1, tips.length);
    setShown(next);
    // Screen-reader users hear the newly revealed tip right away.
    AccessibilityInfo.announceForAccessibility(`${TIP_LABELS[next - 1]}: ${tips[next - 1]}`);
  };
  return (
    <Card style={{ backgroundColor: c.surface2 }}>
      {tips.slice(0, shown).map((tip, i) => (
        <View key={i} style={{ marginBottom: space.md }}>
          <T v="mono" color={i === 0 ? c.warning : i === 1 ? c.accent : c.tealText}>
            {`${i + 1}. ${TIP_LABELS[i] ?? 'Tip'}`.toUpperCase()}
          </T>
          <Gap h={space.xs} />
          <T v="body">{tip}</T>
        </View>
      ))}
      {shown < tips.length && (
        <Button kind="ghost" label={`Reveal ${TIP_LABELS[shown]?.toLowerCase() ?? 'next tip'} →`} onPress={reveal} />
      )}
    </Card>
  );
}

// ── Feedback banner ───────────────────────────────────────────────────
export function ResultBanner({ correct }: { correct: boolean }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ padding: space.md, borderRadius: radius.md, backgroundColor: correct ? c.correctBg : c.wrongBg }}
    >
      <T v="heading" color={correct ? c.correct : c.wrong} style={{ fontSize: size.lg }}>
        {correct ? '✓ Correct' : '✗ Not quite'}
      </T>
    </View>
  );
}
