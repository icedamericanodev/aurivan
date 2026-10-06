/**
 * Quiz building blocks used by the session screen.
 * Each implements a locked decision from design-notes/MASTER_HANDOFF.md.
 */
import { useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import type { Letter } from '../content/types';
import type { Confidence } from '../engine/srs';
import { tipParts } from '../engine/tips';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Button, Card, Chip, Gap, Row, T } from './ui';

// ── Scenario block: "Sealed Brief" style, collapsible on mobile ───────
export function ScenarioBlock({ text }: { text: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const long = text.length > 220;
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: c.accent, backgroundColor: c.surface2, padding: space.md, borderRadius: radius.sm }}>
      <T v="eyebrow">Scenario</T>
      <Gap h={space.xs} />
      <T v="body" color={c.text2}>{long && !open ? `${text.slice(0, 200).trimEnd()}…` : text}</T>
      {long && (
        <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }}>
          <T v="label" color={c.accentText}>{open ? 'Show less' : 'Read full scenario'}</T>
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
  // Selected uses INK (the text colour), never green: green means "correct".
  // Dimmed options use muted text instead of opacity, so they stay legible.
  const look = {
    idle: { border: c.border, bg: c.surface, badge: c.surface2, badgeText: c.text2, text: c.text },
    selected: { border: c.text, bg: c.surface, badge: c.text, badgeText: c.surface, text: c.text },
    correct: { border: c.correct, bg: c.correctBg, badge: c.correct, badgeText: c.bg, text: c.text },
    wrong: { border: c.wrong, bg: c.wrongBg, badge: c.wrong, badgeText: c.bg, text: c.text },
    dimmed: { border: c.border, bg: c.surface, badge: c.surface2, badgeText: c.muted, text: c.muted },
  }[state];
  const suffix = state === 'correct' ? ', correct answer' : state === 'wrong' ? ', your answer, incorrect' : state === 'selected' ? ', selected' : '';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: state === 'selected', disabled }}
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
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ minWidth: 28, minHeight: 28, paddingHorizontal: space.xs, borderRadius: radius.pill, backgroundColor: look.badge, alignItems: 'center', justifyContent: 'center' }}>
        {/* ✓ / ✗ marks correct/wrong by shape, not colour alone. */}
        <T v="label" color={look.badgeText}>
          {state === 'correct' ? `${letter}✓` : state === 'wrong' ? `${letter}✗` : letter}
        </T>
      </View>
      <T v="body" color={look.text} style={{ flex: 1 }}>{text}</T>
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
  return (
    <View>
      <T v="meta">How confident are you?</T>
      <Gap h={space.xs} />
      <Row gap={space.sm}>
        {CONF.map((x) => (
          <Chip key={x.value} label={x.label} selected={value === x.value} onPress={() => onChange(x.value)} />
        ))}
      </Row>
    </View>
  );
}

// ── Tips: sequential reveal (v2: Eliminate → Final two → Exam cue) ─────
export function TipsReveal({ tips }: { tips: string[] }) {
  const { c } = useTheme();
  const [shown, setShown] = useState(1);
  const reveal = () => {
    const next = Math.min(shown + 1, tips.length);
    setShown(next);
    // Screen-reader users hear the newly revealed tip right away.
    const { label, body } = tipParts(tips[next - 1], next - 1);
    AccessibilityInfo.announceForAccessibility(`${label}: ${body}`);
  };
  return (
    <Card style={{ backgroundColor: c.surface2 }}>
      {tips.slice(0, shown).map((tip, i) => {
        const { label, body } = tipParts(tip, i);
        return (
          <View key={i} style={{ marginBottom: space.md }}>
            {/* Tip labels are eyebrows in warning colour (the one allowed exception). */}
            <T v="eyebrow" color={c.warning}>{`${i + 1}. ${label}`}</T>
            <Gap h={space.xs} />
            <T v="body">{body}</T>
          </View>
        );
      })}
      {shown < tips.length && (
        <Button kind="ghost" label={`Reveal ${tipParts(tips[shown], shown).label.toLowerCase()} →`} onPress={reveal} />
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
      <T v="title" color={correct ? c.correct : c.wrong}>
        {correct ? '✓ Correct' : '✗ Not quite'}
      </T>
    </View>
  );
}

// ── Trust card: where this question comes from + report an issue ──────
export function TrustCard({
  questionId,
  reference,
  onReport,
}: {
  questionId: string;
  reference?: string;
  onReport: () => void;
}) {
  const { c } = useTheme();
  return (
    <View
      style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: space.md, marginTop: space.md, gap: space.xs }}
    >
      <T v="eyebrow">Original question</T>
      {reference && <T v="meta">{`Grounded in: ${reference}`}</T>}
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="meta">{`Code ${questionId}`}</T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Report an issue with question ${questionId}`}
          onPress={onReport}
          hitSlop={8}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <T v="label" color={c.accentText}>Report an issue</T>
        </Pressable>
      </Row>
    </View>
  );
}
