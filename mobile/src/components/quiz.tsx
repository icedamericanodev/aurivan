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
 *   Trust    – "Original · Reviewed Oct 2026 · Report a problem".
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { Letter } from '../content/types';
import type { Confidence } from '../engine/srs';
import type { ReportTarget } from '../engine/support';
import { tipParts } from '../engine/tips';
import { config } from '../lib/config';
import { haptic } from '../lib/haptics';
import { shortReference } from '../lib/format';
import { badgeLetter, LARGE_TEXT, motion, optionText, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { LeafBig, LeafSmall, VerdictLeaf } from './glyphs';
import { Check, X } from './icons';
import { AnimatedPressable, ease, FadeIn, Pop, StateLayer, tween, useMotion, usePressScale } from './motion';
import { ReportRow } from './support';
import { CARD_LIFT, Chip, Gap, Row, T, useFontScale } from './ui';


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
  spokenSuffix,
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
  /**
   * What a screen reader hears after the text instead of ", best answer" /
   * ", your answer, incorrect", for rows that aren't answer options (Call It
   * First's principle cards: ", the principle"). It replaces the spoken tag too.
   */
  spokenSuffix?: string;
}) {
  const { c, isDark } = useTheme();
  const { fontScale } = useWindowDimensions();
  // Selected uses INK, never green: green means "correct" (spec §3).
  // Feedback rows are tinted blocks with no border or shadow.
  const tinted = state === 'correct' || state === 'wrong';
  const looks = {
    idle: { bg: c.raised, border: isDark ? c.line : 'transparent', badgeBg: 'transparent', badgeBorder: c.control, badgeText: c.ink2, text: c.ink },
    selected: { bg: c.raised, border: c.ink, badgeBg: c.ink, badgeBorder: c.ink, badgeText: c.bg, text: c.ink },
    correct: { bg: c.correctBg, border: 'transparent', badgeBg: c.correct, badgeBorder: c.correct, badgeText: c.bg, text: c.ink },
    wrong: { bg: c.wrongBg, border: 'transparent', badgeBg: c.wrong, badgeBorder: c.wrong, badgeText: c.bg, text: c.ink },
    dimmed: { bg: c.raised, border: isDark ? c.line : 'transparent', badgeBg: 'transparent', badgeBorder: c.line, badgeText: c.muted, text: c.muted },
  };
  const selected = state === 'selected';
  // Selecting never changes the row's own border or padding: the 2px ink
  // ring and the ink badge are layers that cross-fade in (120 ms, spec §8),
  // so nothing reflows. The row underneath keeps the idle look.
  const look = selected ? looks.idle : looks[state];
  const choosable = Boolean(onPress);
  const press = usePressScale();
  // The badge grows with very large text so the letter still fits (spec §10.7).
  const badge = 30 * Math.min(Math.max(fontScale, 1), 1.6);
  // No ", selected" here: the radio's checked state already announces it.
  const suffix = spokenSuffix ?? (state === 'correct' ? ', best answer' : state === 'wrong' ? ', your answer, incorrect' : '');
  const tagColor = tagTone === 'tip' ? c.tip : state === 'correct' ? c.correct : state === 'wrong' ? c.wrong : c.ink2;

  const rowStyle = {
    flexDirection: 'row' as const,
    gap: 14,
    alignItems: 'flex-start' as const,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderColor: look.border,
    backgroundColor: look.bg,
    marginBottom: 10, // the gap between option rows (spec §6)
    ...(!isDark && !tinted ? CARD_LIFT : null),
  };
  const content = (
    <>
      {choosable && <StateLayer on={selected} style={[ring, { borderColor: c.ink }]} />}
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
        {choosable && (
          <>
            {/* The ink fill fades in; the paper letter flips on at half-way, so it never vanishes mid-fade. */}
            <StateLayer on={selected} style={[badgeOn, { borderRadius: badge / 2, backgroundColor: c.ink }]} />
            <StateLayer on={selected} step style={badgeOn}>
              <T v="caption" color={c.bg} style={badgeLetter}>{letter}</T>
            </StateLayer>
          </>
        )}
      </View>
      <View style={{ flex: 1 }}>
        {tag && <T v="caption" color={tagColor} style={{ marginBottom: 2 }}>{tag}</T>}
        <T v="body" color={look.text} style={optionText}>{text}</T>
        {note && <T v="small" style={{ marginTop: 6 }}>{note}</T>}
      </View>
    </>
  );
  const label = `${tag && spokenSuffix === undefined ? `${tag}: ` : `Option ${letter}: `}${text}${suffix}${note ? `. ${note}` : ''}`;
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={rowStyle}>
        {content}
      </View>
    );
  }
  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`Option ${letter}: ${text}${suffix}`}
      onPress={onPress}
      disabled={disabled}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[rowStyle, press.style]}
    >
      {content}
    </AnimatedPressable>
  );
}

/** The selected option's 2px ink ring, laid over the row's own 1.5 border. */
const ring = { top: -1.5, left: -1.5, right: -1.5, bottom: -1.5, borderRadius: radius.md, borderWidth: 2 } as const;
/** The selected badge fill, laid over the badge's own 1.5 outline. */
const badgeOn = { top: -1.5, left: -1.5, right: -1.5, bottom: -1.5, alignItems: 'center', justifyContent: 'center' } as const;

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
  // The leaf springs from 60% to full size (spec §10.2, the one signature
  // spring); under Reduce Motion it fades in instead (120 ms).
  return (
    // No live region: the session screen already calls announceForAccessibility,
    // so a live region would make screen readers say the verdict twice.
    <View accessible accessibilityRole="header" accessibilityLabel={`${correct ? 'Correct' : 'Not quite'}. ${coach}`}>
      <Row gap={space.md} style={{ marginTop: space.md }}>
        <Pop mount spring="pop" style={{ width: 38, height: 38 }}>
          <VerdictLeaf color={color} />
          {/* The ✓ / ✗ sits on top of the leaf, centred. */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            {correct ? <Check size={20} color={c.bg} strokeWidth={2.5} /> : <X size={20} color={c.bg} strokeWidth={2.5} />}
          </View>
        </Pop>
        <T v="hero" color={color} style={{ flexShrink: 1 }}>{correct ? 'Correct' : 'Not quite'}</T>
      </Row>
      <T v="meta" style={{ marginTop: space.xs, marginLeft: 50 }}>{coach}</T>
    </View>
  );
}

/**
 * Mobile 1.22 (design spec §6.4): the answer screen's outcome, kept in the
 * header once the verdict has scrolled away: an 18pt disc (`wrong` with an
 * ✗, or `correct` with a ✓) and one `meta` line, "Not quite · Best answer
 * D" ("Not quite · D" at large text). One screen-reader stop with every word.
 */
export function AnswerRecap({ correct, letter }: { correct: boolean; letter: Letter }) {
  const { c } = useTheme();
  // Large text (×1.3+): the short form fits the bar ("Not quite · D"); the spoken label keeps every word.
  const short = useFontScale() >= LARGE_TEXT;
  const words = `${correct ? 'Correct' : 'Not quite'} · ${short ? '' : 'Best answer '}${letter}`;
  return (
    <View accessible accessibilityLabel={`${correct ? 'Correct' : 'Not quite'}. Best answer ${letter}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: correct ? c.correct : c.wrong, alignItems: 'center', justifyContent: 'center' }}>
        {correct ? <Check size={12} color={c.bg} strokeWidth={2.75} /> : <X size={12} color={c.bg} strokeWidth={2.75} />}
      </View>
      <T v="meta" color={c.ink} numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ flexShrink: 1 }}>{words}</T>
    </View>
  );
}

/** Entrance wrapper for the answer rows and explanation: fade + 8pt rise over `reveal` (200 ms). */
export function Rise({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <FadeIn dur="reveal" delay={delay}>
      {children}
    </FadeIn>
  );
}

// ── The vine: key idea + tips as leaves on one stem (spec §10.2) ──────
type VineNode = { kind: 'key' | 'tip'; label: string; body: string };

const STEM_MS = motion.dur.vine; // stem draw time (520)

export function Vine({ keyIdea, tips, visible }: { keyIdea?: string; tips: string[]; visible: boolean }) {
  const { c } = useTheme();
  const { reduced: reduce } = useMotion();
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
    grow.set(tween(1, 'vine', ease.out));
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
    pop.set(withDelay(delay, tween(1, 'quick')));
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

// ── Trust line: provenance + Report a problem ────────────────────────
// Under every revealed answer: "Original · Reviewed Oct 2026" with the
// report link on the right, then the code and source. The link, its sheet
// and the note after sending live in components/support.tsx (one look and
// one spoken pattern for every report entry point).
export function TrustLine({ certId, target, reference }: { certId: string; target: ReportTarget; reference?: string }) {
  return (
    <ReportRow
      certId={certId}
      target={target}
      meta={`Original · Reviewed ${config.contentReviewed}`}
      sub={reference ? `Code ${target.id} · ${shortReference(reference)}` : `Code ${target.id}`}
    />
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

// Exported for the session screen: delays used to stagger the answer screen
// (spec §10.2): the rows start as the verdict leaf settles, "Why" just after.
export const FEEDBACK_DELAY = { rows: motion.dur.select, why: motion.dur.reveal } as const;
