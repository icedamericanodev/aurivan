/**
 * Quiz building blocks used by the session, results and game screens.
 * Spec: docs/mobile/DESIGN_SYSTEM.md (Grove v2) §6 "Option row", §10.2
 * "Vine reveal", §11 "Question".
 *
 * Plain-English map of the answer screen (top to bottom):
 *   Verdict  – a leaf-shaped mark with ✓/✗, "Correct" / "Not quite", and a
 *              one-line coach note.
 *   Answers  – if wrong: your option (with why it's wrong), then the best
 *              answer. If right: just the best answer.
 *   Why B    – the explanation.
 *   Vine     – the key idea and the tips as leaves on one stem, drawn in
 *              when it scrolls into view (static under Reduce Motion).
 *   Trust    – "Original · Reviewed Oct 2026 · Report issue".
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { Letter } from '../content/types';
import type { Confidence } from '../engine/srs';
import { tipParts } from '../engine/tips';
import { config } from '../lib/config';
import { haptic } from '../lib/haptics';
import { shortReference } from '../lib/format';
import { badgeLetter, optionText, radius, raisedShadow, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { LeafBig, LeafSmall, VerdictLeaf } from './glyphs';
import { Check, X } from './icons';
import { Chip, Gap, Row, T } from './ui';


// ── Scenario block: a longer case study above the stem, collapsible ───
// Not a card: a 3px green rule on the left, like the key idea.
export function ScenarioBlock({ text }: { text: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const long = text.length > 220;
  return (
    <View style={{ borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
      <T v="caption" color={c.accentText}>Scenario</T>
      <Gap h={space.xs} />
      <T v="body" color={c.ink2}>{long && !open ? `${text.slice(0, 200).trimEnd()}…` : text}</T>
      {long && (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} hitSlop={8} style={{ minHeight: 48, justifyContent: 'center' }}>
          <T v="label" color={c.accentText}>{open ? 'Show less' : 'Read full scenario'}</T>
        </Pressable>
      )}
    </View>
  );
}

// ── Option row (spec §6) ───────────────────────────────────────────────
export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dimmed';

export function OptionCard({
  letter,
  text,
  state,
  onPress,
  disabled,
  tag,
  tagTone,
  note,
}: {
  /** Colour the tag in the trap-warning tone (e.g. "Snare"), whatever the row's state. */
  tagTone?: 'tip';
  letter: Letter;
  text: string;
  state: OptionState;
  /** Leave out to show a read-only row (answer screen, results review). */
  onPress?: () => void;
  disabled?: boolean;
  /** Small label above the text, e.g. "Your answer · C" / "Best answer · B". */
  tag?: string;
  /** A note under the text, e.g. why this option is wrong. */
  note?: string;
}) {
  const { c, isDark } = useTheme();
  const { fontScale } = useWindowDimensions();
  // Selected uses INK, never green: green means "correct" (spec §3).
  // Feedback rows are tinted blocks with no border or shadow.
  const tinted = state === 'correct' || state === 'wrong';
  const look = {
    idle: { bg: c.raised, border: isDark ? c.line : 'transparent', badgeBg: 'transparent', badgeBorder: c.control, badgeText: c.ink2, text: c.ink },
    selected: { bg: c.raised, border: c.ink, badgeBg: c.ink, badgeBorder: c.ink, badgeText: c.bg, text: c.ink },
    correct: { bg: c.correctBg, border: 'transparent', badgeBg: c.correct, badgeBorder: c.correct, badgeText: c.bg, text: c.ink },
    wrong: { bg: c.wrongBg, border: 'transparent', badgeBg: c.wrong, badgeBorder: c.wrong, badgeText: c.bg, text: c.ink },
    dimmed: { bg: c.raised, border: isDark ? c.line : 'transparent', badgeBg: 'transparent', badgeBorder: c.line, badgeText: c.muted, text: c.muted },
  }[state];
  const selected = state === 'selected';
  // The badge grows with very large text so the letter still fits (spec §10.7).
  const badge = 30 * Math.min(Math.max(fontScale, 1), 1.6);
  // No ", selected" here: the radio's checked state already announces it.
  const suffix = state === 'correct' ? ', best answer' : state === 'wrong' ? ', your answer, incorrect' : '';
  const tagColor = tagTone === 'tip' ? c.tip : state === 'correct' ? c.correct : state === 'wrong' ? c.wrong : c.ink2;

  const rowStyle = {
    flexDirection: 'row' as const,
    gap: 14,
    alignItems: 'flex-start' as const,
    borderRadius: radius.md,
    // 2px ink border when selected; padding shrinks by 0.5 so nothing jumps.
    borderWidth: selected ? 2 : 1.5,
    paddingVertical: selected ? 13.5 : 14,
    paddingHorizontal: selected ? 15.5 : 16,
    borderColor: look.border,
    backgroundColor: look.bg,
    marginBottom: 10, // the gap between option rows (spec §6)
    ...(!isDark && !tinted ? raisedShadow : null),
  };
  const content = (
    <>
      <View
        style={{
          width: badge,
          height: badge,
          marginTop: -3, // centres the badge on the first line of text
          borderRadius: badge / 2,
          borderWidth: 1.5,
          borderColor: look.badgeBorder,
          backgroundColor: look.badgeBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* ✓ / ✗ mark correct/wrong by shape, not colour alone. */}
        {state === 'correct' ? (
          <Check size={16} color={look.badgeText} strokeWidth={2.5} />
        ) : state === 'wrong' ? (
          <X size={16} color={look.badgeText} strokeWidth={2.5} />
        ) : (
          <T v="caption" color={look.badgeText} style={badgeLetter}>{letter}</T>
        )}
      </View>
      <View style={{ flex: 1 }}>
        {tag && <T v="caption" color={tagColor} style={{ marginBottom: 2 }}>{tag}</T>}
        <T v="body" color={look.text} style={optionText}>{text}</T>
        {note && <T v="small" style={{ marginTop: 6 }}>{note}</T>}
      </View>
    </>
  );
  const label = `${tag ? `${tag}: ` : `Option ${letter}: `}${text}${suffix}${note ? `. ${note}` : ''}`;
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={rowStyle}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`Option ${letter}: ${text}${suffix}`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [rowStyle, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      {content}
    </Pressable>
  );
}

// ── Confidence row: shown after selecting, before checking ────────────
const CONF: { label: string; value: Confidence }[] = [
  { label: 'Sure', value: 'sure' },
  { label: 'Unsure', value: 'unsure' },
  { label: 'Guessing', value: 'guessing' },
];

export function ConfidenceRow({ value, onChange }: { value?: Confidence; onChange: (v: Confidence) => void }) {
  return (
    <View>
      <T v="meta">How confident are you?</T>
      <Gap h={space.sm} />
      <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
        {CONF.map((x) => (
          <Chip key={x.value} label={x.label} selected={value === x.value} onPress={() => onChange(x.value)} />
        ))}
      </Row>
    </View>
  );
}

// ── Verdict: leaf-mark + "Correct" / "Not quite" + coach line ─────────
export function Verdict({ correct, coach }: { correct: boolean; coach: string }) {
  const { c } = useTheme();
  const color = correct ? c.correct : c.wrong;
  // The leaf springs from 60% to full size (spec §10.2); static under Reduce Motion.
  const scale = useSharedValue(0.6);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 16, stiffness: 260, reduceMotion: ReduceMotion.System });
  }, [scale]);
  const leafStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    // No live region: the session screen already calls announceForAccessibility,
    // so a live region would make screen readers say the verdict twice.
    <View accessible accessibilityRole="header" accessibilityLabel={`${correct ? 'Correct' : 'Not quite'}. ${coach}`}>
      <Row gap={space.md} style={{ marginTop: space.md }}>
        <Animated.View style={[{ width: 38, height: 38 }, leafStyle]}>
          <VerdictLeaf color={color} />
          {/* The ✓ / ✗ sits on top of the leaf, centred. */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            {correct ? <Check size={20} color={c.bg} strokeWidth={2.5} /> : <X size={20} color={c.bg} strokeWidth={2.5} />}
          </View>
        </Animated.View>
        <T v="hero" color={color} style={{ flexShrink: 1 }}>{correct ? 'Correct' : 'Not quite'}</T>
      </Row>
      <T v="meta" style={{ marginTop: space.xs, marginLeft: 50 }}>{coach}</T>
    </View>
  );
}

/** Entrance wrapper for the answer rows and explanation (fade + 8pt rise). */
export function Rise({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));
  }, [delay, p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 8 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// ── The vine: key idea + tips as leaves on one stem (spec §10.2) ──────
type VineNode = { kind: 'key' | 'tip'; label: string; body: string };

const STEM_MS = 520; // stem draw time
const LEAF_MS = 160; // each leaf pop

export function Vine({ keyIdea, tips, visible }: { keyIdea?: string; tips: string[]; visible: boolean }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const nodes: VineNode[] = [
    ...(keyIdea ? [{ kind: 'key' as const, label: 'Key idea', body: keyIdea }] : []),
    ...tips.map((t, i) => ({ kind: 'tip' as const, ...tipParts(t, i) })),
  ];
  // 0 → 1 as the stem draws downward. Starts drawn when Reduce Motion is on.
  const grow = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!visible) return;
    // The one haptic on the vine: a light tick as the Key idea leaf appears.
    if (keyIdea) haptic.selection();
    if (reduce) return;
    grow.value = withTiming(1, { duration: STEM_MS, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [visible, reduce, keyIdea, grow]);
  const stemStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));

  return (
    <View style={{ marginTop: space.xl, paddingLeft: 34 }}>
      {/* The stem: 1.5pt accent at 55% opacity, drawn from the top down. */}
      <Animated.View
        style={[
          { position: 'absolute', left: 10, top: 12, bottom: 18, width: 1.5, borderRadius: 1, backgroundColor: c.accent, opacity: 0.55, transformOrigin: 'top' },
          stemStyle,
        ]}
      />
      {nodes.map((n, i) => (
        <VineLeafNode
          key={i}
          node={n}
          last={i === nodes.length - 1}
          visible={visible}
          reduce={reduce}
          // Each leaf pops as the stem reaches it.
          delay={(STEM_MS * i) / Math.max(nodes.length, 1)}
        />
      ))}
    </View>
  );
}

function VineLeafNode({ node, last, visible, reduce, delay }: { node: VineNode; last: boolean; visible: boolean; reduce: boolean; delay: number }) {
  const { c } = useTheme();
  const pop = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!visible || reduce) return;
    pop.value = withDelay(delay, withTiming(1, { duration: LEAF_MS, reduceMotion: ReduceMotion.System }));
  }, [visible, reduce, delay, pop]);
  const leafStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.4 + 0.6 * pop.value }], opacity: pop.value }));
  // Colour per tip type: Eliminate = trap amber, Final two = ink2, Exam cue = green.
  const tone =
    node.kind === 'key'
      ? { leaf: c.accent, label: c.accentText }
      : node.label.startsWith('Eliminate')
        ? { leaf: c.tip, label: c.tip }
        : node.label === 'Exam cue'
          ? { leaf: c.accent, label: c.accentText }
          : { leaf: c.ink2, label: c.ink2 };
  return (
    <View style={{ paddingBottom: last ? 6 : 18 }} accessible accessibilityLabel={`${node.label}: ${node.body}`}>
      {/* The leaf sits on a bg "knock-out" so the stem seems to pass behind it. */}
      <Animated.View
        style={[
          { position: 'absolute', left: -34, top: 0, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg },
          leafStyle,
        ]}
      >
        {node.kind === 'key' ? <LeafBig color={c.accent} rib={c.bg} /> : <LeafSmall color={tone.leaf} />}
      </Animated.View>
      <T v="caption" color={tone.label} style={{ marginBottom: 3 }}>{node.label}</T>
      {node.kind === 'key' ? <T v="quote">{node.body}</T> : <T v="small">{node.body}</T>}
    </View>
  );
}

// ── Trust line: provenance + report an issue ──────────────────────────
export function TrustLine({ questionId, reference, onReport }: { questionId: string; reference?: string; onReport: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: c.line, marginTop: space.xs, paddingTop: space.sm }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }} gap={space.sm}>
        <T v="meta" style={{ flexShrink: 1 }}>{`Original · Reviewed ${config.contentReviewed}`}</T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Report an issue with question ${questionId}`}
          onPress={onReport}
          hitSlop={8}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <T v="label" color={c.accentText}>Report issue</T>
        </Pressable>
      </Row>
      <T v="meta" color={c.muted}>{reference ? `Code ${questionId} · ${shortReference(reference)}` : `Code ${questionId}`}</T>
    </View>
  );
}

// ── Sticky footer with a paper fade above it (spec §6) ────────────────
// Reports its height so the scroll view can pad by footer + 24 and the
// last option never sits under the button.
export function StickyFooter({ children, onHeight }: { children: ReactNode; onHeight: (h: number) => void }) {
  const { c } = useTheme();
  const onLayout = (e: LayoutChangeEvent) => onHeight(e.nativeEvent.layout.height);
  return (
    <View onLayout={onLayout} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' }}>
      <Svg height={22} width="100%" style={{ pointerEvents: 'none' }}>
        <Defs>
          <LinearGradient id="footerFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.bg} stopOpacity={0} />
            <Stop offset="1" stopColor={c.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="22" fill="url(#footerFade)" />
      </Svg>
      <View style={{ backgroundColor: c.bg, paddingHorizontal: space.gutter, paddingBottom: space.md, gap: space.md }}>{children}</View>
    </View>
  );
}

// Exported for the session screen: delays used to stagger the answer screen.
export const FEEDBACK_DELAY = { rows: 120, why: 200 } as const;
