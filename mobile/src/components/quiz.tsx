/**
 * Quiz building blocks used by the session, results and game screens.
 * Spec: docs/mobile/DESIGN_SYSTEM.md (Grove v2) §6 "Option row", §10.2
 * "Vine reveal", §11 "Question".
 *
 * Plain-English map of the answer screen (top to bottom). Premium round 2
 * made the practice/review answer a Field Guide page (DESIGN_SYSTEM §21):
 *   Head     – (premium round 2) the running head "Practice · IS Audit" and
 *              "Question 4 of 10" (fieldguide/RunningHead, set by the screen).
 *   Recap    – (mobile 1.49) "Question" and the stem in two lines, with
 *              "Show question" to read it whole (StemRecap; `field`: the
 *              guide's tracked head and a Fraunces stem).
 *   Verdict  – a leaf-shaped mark with ✓/✗, "Correct" / "Not quite", and a
 *              one-line coach note (`field`: the word in ink, the note in
 *              italics; the leaf keeps its colour).
 *   Fig. 4   – (premium round 2) AnswerPlate: one captioned plate. If wrong:
 *              "Your pick" (with "Why not C: …") over "Best answer". If
 *              right: "Your answer", one ✓ row. Each disc holds its DISPLAY
 *              letter (mobile 1.43).
 *   Key idea – after a miss (premium round 2): KeyIdeaCue, "KEY IDEA" over the
 *              quotation and the Exam cue as a label. It arrives on the vine's
 *              timing (VINE_ARRIVES).
 *   Why B    – the explanation.
 *   Vine     – the tips as leaves on one stem (after a right answer, the key
 *              idea too), drawn in when it scrolls into view (static under
 *              Reduce Motion). After a miss, Eliminate two and Final two sit
 *              inside Why's "Read more" fold (mobile 1.43).
 *   Trust    – "Original · Checked Oct 2026 · Report a problem" (Results' review; "Reviewed" until 2.0.0).
 *   Source   – the practice answer's source line, no link (mobile 1.49: the
 *              report lives in the header's ⋯ "More on this question" sheet,
 *              AnswerMore).
 */
import { useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';
import { Platform, Pressable, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { LETTERS, type Letter, type PackQuestion } from '../content/types';
import { renderText, type Permutation } from '../engine/shuffle';
import type { Confidence } from '../engine/srs';
import type { ReportTarget } from '../engine/support';
import { lineBudget, shortenAtWord } from '../engine/textClip';
import { tipParts } from '../engine/tips';
import { config } from '../lib/config';
import { moveFocus } from '../lib/a11y';
import { afterSheet } from '../lib/sheetWait';
import { haptic } from '../lib/haptics';
import { shortReference } from '../lib/format';
import { LARGE_TEXT, maxScale, motion, radius, space, type } from '../theme/tokens';
import { fieldRole, groveRadius } from '../theme/grove';
import { useTheme } from '../theme/useTheme';
import { LeafBig, LeafSmall, VerdictLeaf } from './glyphs';
import { FieldText } from './fieldguide';
import { Check, ChevronDown, Ellipsis, ICON_STROKE, X } from './icons';
import { AnimatedPressable, Collapse, ease, FadeIn, Pop, StateLayer, tween, useMotion, usePressScale } from './motion';
import { ReportRow } from './support';
import { Sheet } from './settings';
import { cardLift, Chip, Gap, groveCard, IconButton, ListRow, Row, T, useFontScale } from './ui';

/** The Field Guide verdict leaf: 34pt (with a 16 gap, the lines under it still start at VERDICT_INDENT). */
const FIELD_LEAF = 34;

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
  mark,
  spoken,
}: {
  /**
   * Mobile 1.43 (answer screen and the Results review): `letter` keeps the DISPLAY letter in the
   * feedback badge, filled in the row's own colour, instead of a ✓ / ✗. The tag's words ("Your
   * answer", "Best answer") carry the meaning, so the verdict leaf is the screen's only ✗.
   */
  mark?: 'letter';
  /** The whole spoken label, when the default would lose the letter (a tag without "· B"). */
  spoken?: string;
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
    ...(!tinted ? cardLift(isDark) : null),
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
        {/* ✓ / ✗ mark correct/wrong by shape, not colour alone; with mark="letter" the row's tag words do. */}
        {mark === 'letter' && tinted ? (
          <T v="badgeLetter" color={look.badgeText}>{letter}</T>
        ) : state === 'correct' ? (
          <Check size={16} color={look.badgeText} strokeWidth={2.5} />
        ) : state === 'wrong' ? (
          <X size={16} color={look.badgeText} strokeWidth={2.5} />
        ) : (
          <T v="badgeLetter" color={look.badgeText}>{letter}</T>
        )}
        {choosable && (
          <>
            {/* The ink fill fades in; the paper letter flips on at half-way, so it never vanishes mid-fade. */}
            <StateLayer on={selected} style={[badgeOn, { borderRadius: badge / 2, backgroundColor: c.ink }]} />
            <StateLayer on={selected} step style={badgeOn}>
              <T v="badgeLetter" color={c.bg}>{letter}</T>
            </StateLayer>
          </>
        )}
      </View>
      <View style={{ flex: 1 }}>
        {tag && <T v="caption" color={tagColor} style={{ marginBottom: 2 }}>{tag}</T>}
        <T v="body" color={look.text}>{text}</T>
        {note && <T v="small" style={{ marginTop: 6 }}>{note}</T>}
      </View>
    </>
  );
  const label = spoken ?? `${tag && spokenSuffix === undefined ? `${tag}: ` : `Option ${letter}: `}${text}${suffix}${note ? `. ${note}` : ''}`;
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
export function Verdict({
  correct,
  coach,
  best,
  ref,
  field,
}: {
  correct: boolean;
  coach: string;
  /** The best answer's DISPLAY letter after a miss: spoken in the label ("Not quite. Best answer D."). */
  best?: string;
  /** For moving screen-reader focus here after "Check answer" (lib/a11y.ts moveFocus). */
  ref?: Ref<View>;
  /**
   * Premium round 2 (Field Guide answer screen, practice and review): the word is set in `ink`
   * (Fraunces 500 30/34) and the coach line in the guide's italic `sub`. The leaf keeps its colour
   * and its ✓ / ✗ (colour is never the only signal) and its pop. Left out (a lesson's quick
   * check), the 1.43 look: the word in the verdict colour.
   */
  field?: boolean;
}) {
  const { c } = useTheme();
  const color = correct ? c.correct : c.wrong;
  // Mobile 1.43: at ×1.3 text and up the coach line wraps under the verdict from the gutter
  // (lined up under "Not quite" it became a narrow column).
  const indent = useVerdictIndent();
  // What a screen reader says when focus lands here. Mobile 1.24 (UX review B3): the session screen no
  // longer makes a separate announcement (the focus move cut it off on iOS and doubled it on Android),
  // so the verdict says everything once, the best answer's letter included.
  const head = correct ? 'Correct' : best ? `Not quite. Best answer ${best}` : 'Not quite';
  // The Field Guide leaf is 34 with a 16 gap, so the lines under it still start at VERDICT_INDENT (50).
  const leaf = field ? FIELD_LEAF : 38;
  // The leaf springs from 60% to full size (spec §10.2, the one signature
  // spring); under Reduce Motion it fades in instead (120 ms).
  return (
    // No live region: focus moves here after "Check answer", which reads this label once.
    <View ref={ref} accessible accessibilityRole="header" accessibilityLabel={`${head}. ${coach}`}>
      <Row gap={field ? VERDICT_INDENT - FIELD_LEAF : space.md} style={{ marginTop: space.md }}>
        <Pop mount spring="pop" style={{ width: leaf, height: leaf }}>
          <VerdictLeaf size={leaf} color={color} />
          {/* The ✓ / ✗ sits on top of the leaf, centred. */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            {correct ? <Check size={field ? 18 : 20} color={c.bg} strokeWidth={2.5} /> : <X size={field ? 18 : 20} color={c.bg} strokeWidth={2.5} />}
          </View>
        </Pop>
        {field ? (
          <FieldText v="verdict" color={color} style={{ flexShrink: 1 }}>{correct ? 'Correct' : 'Not quite'}</FieldText>
        ) : (
          <T v="hero" color={color} style={{ flexShrink: 1 }}>{correct ? 'Correct' : 'Not quite'}</T>
        )}
      </Row>
      {/* The coach's line is `aside` (Fraunces italic 16/22) in practice, mocks and lessons alike. */}
      <FieldText v="sub" style={{ marginTop: space.xs, marginLeft: indent }}>{coach}</FieldText>
    </View>
  );
}

/** The coach line's indent under "Correct" / "Not quite" (the leaf's 38 + the 12 gap). */
export const VERDICT_INDENT = 50;

/** Lines under the verdict (the coach line, the hint and retest notes) start under the word; at ×1.3 text, at the gutter. */
export function useVerdictIndent(): number {
  return useFontScale() >= LARGE_TEXT ? 0 : VERDICT_INDENT;
}

// ── AnswerPlate: your answer against the best one (Grove Phase 4) ──
/** One row of the card: the DISPLAY letter, the option's words, and (your answer after a miss) why it isn't best. */
export interface PlateRow {
  letter: Letter;
  text: string;
  /** "Why not B": the picked option's own explanation, already through renderText. */
  why?: string;
}

/** From this text size the letter badge sits above its words instead of beside them (200% text). */
export const DISC_ABOVE_FROM = 1.6;
/** The letter badge: 30pt at every text size (the letter caps at ×1.3 inside it). */
const DISC = 30;
/** The gap between the badge and its words when they sit side by side. */
const DISC_GAP = 14;
/** The rows fade in this far apart after the card (Grove Phase 4 motion: opacity only, 30 ms apart). */
export const PLATE_ROW_STAGGER = 30;

/**
 * Grove Phase 4 (design-notes/grove/PHASE4.md 4.2 step 2): the answer card. ONE Grove card (`raised`,
 * 24 corners, a 1pt edge, 18 inside), rows split by 1pt dividers, and NO tinted fills: the state
 * colour is on the letter badge and the caption words only.
 *
 * - After a miss: "Your answer" (a filled miss-tone badge, the caption in `wrong`, the option in
 *   Figtree 500), then "Why not B" as a caption over its note (one stop, never a heading), a divider,
 *   and "Best answer" (a filled correct-tone badge, the caption in `correct`, the option in Figtree 600).
 * - After a right answer: one row, "Your answer · the best".
 *
 * Colour is never alone: every row has its ✗ / ✓ and its words. Each row is one screen-reader stop
 * ("Your answer, B, not the best: …"; "Why not B: …"; "Best answer, D: …"). DISPLAY letters only.
 * The other options stay one tap away in More ("Show all options", AllOptionsSheet below) and in review.
 */
export function AnswerPlate({ pick, best, delay = 0 }: { pick?: PlateRow; best: PlateRow; delay?: number }) {
  const { c } = useTheme();
  const missed = Boolean(pick);
  const parts: { key: string; node: ReactNode }[] = [];
  if (pick) {
    parts.push({ key: 'pick', node: <AnswerPlateRow kind="pick" row={pick} missed /> });
    if (pick.why) parts.push({ key: 'why', node: <PickNote letter={pick.letter} text={pick.why} /> });
  }
  parts.push({ key: 'best', node: <AnswerPlateRow kind="best" row={best} missed={missed} /> });
  return (
    <FadeIn dur="reveal" rise={false} delay={delay} style={{ marginTop: space.lg }}>
      <View testID="answer-plate" style={[groveCard(c), { padding: 18 }]}>
        {parts.map((p, i) => (
          <FadeIn key={p.key} dur="reveal" rise={false} delay={delay + PLATE_ROW_STAGGER * (i + 1)}>
            {/* "Why not B" belongs to the row above it: no divider between them, one before Best answer. */}
            <View style={i > 0 && p.key !== 'why' ? { borderTopWidth: 1, borderTopColor: c.line, marginTop: space.md, paddingTop: space.md } : undefined}>
              {p.node}
            </View>
          </FadeIn>
        ))}
      </View>
    </FadeIn>
  );
}

/**
 * "Why not B" in a `caption` (ink2) over that option's note in `small` (ink): one screen-reader stop,
 * never a heading (the screen has ONE Why heading, "Why D"). Lined up with the row's words.
 */
export function PickNote({ letter, text }: { letter: Letter; text: string }) {
  const { c } = useTheme();
  const discAbove = useFontScale() >= DISC_ABOVE_FROM;
  return (
    <View testID="answer-why-not" accessible accessibilityLabel={`Why not ${letter}: ${text}`} style={{ marginTop: space.sm, marginLeft: discAbove ? 0 : DISC + DISC_GAP }}>
      <T v="caption" color={c.ink2}>{`Why not ${letter}`}</T>
      <T v="small" color={c.ink} style={{ marginTop: 2 }}>{text}</T>
    </View>
  );
}

function AnswerPlateRow({ kind, row, missed }: { kind: 'pick' | 'best'; row: PlateRow; missed: boolean }) {
  const { c } = useTheme();
  const fontScale = useFontScale();
  const discAbove = fontScale >= DISC_ABOVE_FROM;
  // The badge grows with its letter, as the option row's badge does (TYPE_SCALE.md exception E4).
  const disc = DISC * Math.min(Math.max(fontScale, 1), 1.6);
  const isPick = kind === 'pick';
  const tone = isPick ? c.wrong : c.correct;
  const key = isPick ? 'Your answer' : missed ? 'Best answer' : 'Your answer · the best';
  // One stop per row, the display letter in every label.
  const spoken = isPick ? `Your answer, ${row.letter}, not the best: ${row.text}` : missed ? `Best answer, ${row.letter}: ${row.text}` : `Your answer, ${row.letter}, the best: ${row.text}`;
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      testID={isPick ? 'answer-row-pick' : 'answer-row-best'}
      style={{ flexDirection: discAbove ? 'column' : 'row', alignItems: 'flex-start', gap: discAbove ? space.sm : DISC_GAP }}
    >
      {/* A filled badge in the state colour, the display letter in paper; its ✗ / ✓ is in the caption. */}
      <View style={{ minWidth: disc, minHeight: disc, borderRadius: groveRadius.step, backgroundColor: tone, alignItems: 'center', justifyContent: 'center' }}>
        <T v="badgeLetter" color={c.bg}>{row.letter}</T>
      </View>
      <View style={{ flex: discAbove ? undefined : 1, alignSelf: 'stretch' }}>
        <T v="caption" color={tone} style={{ marginBottom: 2 }}>{`${isPick ? '✗' : '✓'} ${key}`}</T>
        <FieldText v={isPick ? 'option' : 'best'}>{row.text}</FieldText>
      </View>
    </View>
  );
}

// ── Key idea (Grove Phase 4, 4.2 step 3) ─────────────────────────────
/**
 * A `caption` "Key idea" in the accent text colour over the key concept in `quote` (Fraunces italic
 * 18/26), with the 3px accent rule on its left: the coach is speaking. Not a card. One stop.
 * `visible` keeps the 1.52 timing: the one light tick plays as it arrives on screen.
 */
export function KeyIdea({ text, visible }: { text?: string; visible: boolean }) {
  const { c } = useTheme();
  useEffect(() => {
    if (visible && text) haptic.selection();
  }, [visible, text]);
  if (!text) return null;
  return (
    <View testID="answer-key-idea" accessible accessibilityLabel={`Key idea: ${text}`} style={{ marginTop: space.xl, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
      <T v="caption" color={c.accentText}>Key idea</T>
      <T v="quote" color={c.ink} style={{ marginTop: space.xs }}>{text}</T>
    </View>
  );
}

// ── How to think about it: the tips in one card (Grove Phase 4, 4.2 step 4) ──
/** The heading over the tips card ("Three moves" breaks when a question has four tips). */
export const TIPS_HEADING = 'How to think about it';

/** The `headline` heading over the tips (Figtree 600 17/24, never Fraunces). */
export function TipsHeading() {
  return (
    <T v="headline" accessibilityRole="header" style={{ marginTop: space.xl }}>
      {TIPS_HEADING}
    </T>
  );
}

/**
 * One card, one row per tip: its label word (tipParts) as a `caption` in `accentText` over the tip in
 * `small` ink, 1pt dividers between. A small accent leaf marks each row and ONE stem runs down the
 * card's left edge, drawn once in reading order (drawn at once under Reduce Motion). Colour never tells
 * the tips apart: the label words do. Each row is one stop that starts with its label ("Final two: …").
 */
export function TipsCard({
  rows,
  visible,
  testID = 'answer-tips',
}: {
  /** `pick`: the learner's DISPLAY letter when this row names their pick (engine/pickCoach.ts tipPickLetter). */
  rows: { label: string; body: string; pick?: string | null }[];
  visible: boolean;
  testID?: string;
}) {
  const { c } = useTheme();
  const { reduced } = useMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      grow.set(1);
      return;
    }
    grow.set(tween(1, 'vine', ease.out));
  }, [visible, reduced, grow]);
  const stemStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));
  if (rows.length === 0) return null;
  return (
    <View testID={testID} style={[groveCard(c), { marginTop: space.sm, paddingVertical: space.sm, paddingRight: 18, paddingLeft: 40 }]}>
      {/* The stem: 1.5pt accent down the left edge, behind the leaves, drawn from the top. Decorative. */}
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[{ position: 'absolute', left: 19, top: 22, bottom: 22, width: 1.5, borderRadius: 1, backgroundColor: c.accent, opacity: 0.55, transformOrigin: 'top' }, stemStyle]}
      />
      {rows.map((r, i) => (
        <View
          key={`${r.label}-${i}`}
          testID="answer-tip-row"
          accessible
          // Read as "Final two, your pick B: ..." when the row names the learner's pick (PHASE4 4.3).
          accessibilityLabel={`${r.label}${r.pick ? `, your pick ${r.pick}` : ''}: ${r.body}`}
          style={[{ paddingVertical: space.md }, i > 0 && { borderTopWidth: 1, borderTopColor: c.line }]}
        >
          {/* The leaf sits on a paper knock-out so the stem seems to pass behind it. */}
          <View style={{ position: 'absolute', left: -30, top: space.md, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.raised }}>
            <LeafSmall color={c.accent} />
          </View>
          {/* The label, then the pick chip when this row names the learner's pick (PHASE4 4.2 step 4):
              a caption in ink inside a 1pt control outline, like the web's chip. At large text it
              wraps under the label instead of squeezing it. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.sm, rowGap: space.xs, marginBottom: 3 }}>
            <T v="caption" color={c.accentText}>{r.label}</T>
            {r.pick ? (
              <View testID="tip-pick-chip" style={{ borderWidth: 1, borderColor: c.control, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 1 }}>
                <T v="caption" color={c.ink}>{`Your pick, ${r.pick}`}</T>
              </View>
            ) : null}
          </View>
          <T v="small" color={c.ink}>{r.body}</T>
        </View>
      ))}
    </View>
  );
}

/**
 * The room the recap's words get in the answer screen's header (session.tsx): the window less the
 * 20pt gutters, the 12pt gaps, the close (36), bookmark (48) and ⋯ (36) buttons, and the 18pt disc
 * with its 8pt gap. 222pt in all.
 */
export const recapRoom = (windowWidth: number) => windowWidth - 222;
/** "Not quite · Best answer D" at 1.0 text, in the meta face (Figtree 14): about 161pt. */
export const RECAP_LONG_W = 161;

/**
 * Mobile 1.22 (design spec §6.4): the answer screen's outcome, kept in the
 * header once the verdict has scrolled away: an 18pt disc (`wrong` with an
 * ✗, or `correct` with a ✓) and one `meta` line, "Not quite · Best answer
 * D" ("Not quite · D" at large text). One screen-reader stop with every word.
 */
export function AnswerRecap({ correct, letter }: { correct: boolean; letter: Letter }) {
  const { c } = useTheme();
  const scale = useFontScale();
  const { width } = useWindowDimensions();
  // Large text (×1.3+): the short form fits the bar ("Not quite · D"); the spoken label keeps every word.
  // Release bug hunt round 1: also when the bar is too narrow for the long form, so the letter always
  // shows (360dp, 320dp, or a 390dp phone at ×1.15 cut it to "Not quite · Best ans…").
  const short = scale >= LARGE_TEXT || recapRoom(width) < RECAP_LONG_W * Math.min(scale, 1.3);
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

/**
 * Entrance wrapper for the answer rows and explanation: a fade over `reveal` (200 ms), with an 8pt rise
 * unless `rise` is false. The answer screen's blocks pass `rise={false}` (PHASE4.md 4.4: opacity only).
 */
export function Rise({ children, delay = 0, rise = true }: { children: ReactNode; delay?: number; rise?: boolean }) {
  return (
    <FadeIn dur="reveal" delay={delay} rise={rise}>
      {children}
    </FadeIn>
  );
}

// ── The vine: key idea + tips as leaves on one stem (spec §10.2) ──────
type VineNode = { kind: 'key' | 'tip'; label: string; body: string };

const STEM_MS = motion.dur.vine; // stem draw time (520)

export function Vine({ keyIdea, tips, tipIndex, visible }: { keyIdea?: string; tips: string[]; /** Each tip's place in the question's full tip list (its legacy label depends on it), when `tips` is only part of it. */ tipIndex?: number[]; visible: boolean }) {
  const { c } = useTheme();
  const { reduced: reduce } = useMotion();
  const nodes: VineNode[] = [
    ...(keyIdea ? [{ kind: 'key' as const, label: 'Key idea', body: keyIdea }] : []),
    ...tips.map((t, i) => ({ kind: 'tip' as const, ...tipParts(t, tipIndex?.[i] ?? i) })),
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

  // A part with nothing to show (no key idea and no tips here) draws nothing, not an empty stem.
  if (nodes.length === 0) return null;
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

// ── Why: the long explanation, folded after a miss (mobile 1.24, 1.43) ──
/** An explanation this short is shown whole: nothing to fold. */
export const WHY_FOLD_CHARS = 150;

/** "Eliminate two and Final two": what the fold holds, as one spoken list. */
function spokenList(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * "Why D" and its explanation. After a miss the Key idea and every tip come
 * first, so a long paragraph shows its first two lines and a "Read more"
 * (PHASE4.md 4.2 step 5). Owner answer O1 (5 Nov 2026): the fold holds this
 * paragraph and nothing else, so its spoken name is "Read more of the
 * explanation". The `children` and `more` props are kept for the 1.43 fold
 * (tips under the fold), which the answer screen no longer uses: when `more`
 * names anything, the label still lists it. "Read more" opens in place (no
 * height animation); "Show less" closes it. The toggle keeps its place in the
 * tree, so screen-reader focus stays on it. A short explanation with nothing
 * else to hide, or any explanation when `fold` is false, is whole.
 */
export function WhyBlock({
  letter,
  text,
  fold,
  children,
  more = [],
  onOpen,
}: {
  letter: Letter;
  text: string;
  fold: boolean;
  /** What else the fold holds (after a miss: the second vine, Eliminate two and Final two). */
  children?: ReactNode;
  /** The names of what `children` holds, said in the toggle's label ("Eliminate two", "Final two"). */
  more?: string[];
  /** The fold opened (the vine inside draws now). */
  onOpen?: () => void;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const long = text.length > WHY_FOLD_CHARS;
  const canFold = fold && (long || more.length > 0);
  const folded = canFold && !open;
  const what = spokenList([...(long ? ['the full explanation'] : []), ...more]);
  return (
    <View>
      <T v="headline" accessibilityRole="header" style={{ marginTop: space.lg }}>{`Why ${letter}`}</T>
      <T v="body" numberOfLines={folded && long ? 2 : undefined} accessibilityLabel={text} style={{ marginTop: space.xs }}>{text}</T>
      {/* The toggle comes right after the paragraph it opens (and before anything else a fold holds), so a
          screen reader moves from "Read more" straight on to what it revealed. */}
      {canFold && (
        <Pressable
          accessibilityRole="button"
          // Only the paragraph folds (O1): the spec's name. A fold that also holds tips lists them.
          accessibilityLabel={more.length === 0 ? (open ? 'Show less of the explanation' : 'Read more of the explanation') : open ? `Show less: hides ${what}` : `Read more: ${what}`}
          accessibilityState={{ expanded: open }}
          onPress={() => {
            if (!open) onOpen?.();
            setOpen(!open);
          }}
          hitSlop={8}
          style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}
        >
          <T v="label" color={c.accentText}>{open ? 'Show less' : 'Read more'}</T>
        </Pressable>
      )}
      {/* Folded away until opened (Collapse: no height animation; what opens fades in). No fold: just shown. */}
      {canFold ? <Collapse open={open}>{children}</Collapse> : children}
    </View>
  );
}

// ── StemRecap: the question, recapped at the top of the answer (1.49) ─
/** A stem longer than this (or one with a scenario) is clamped to 2 lines with "Show question". */
export const STEM_RECAP_CHARS = 90;
/**
 * Premium pass §2.1: once the answer shows, the question would be gone. This
 * keeps it at the top: a `caption` ("Question"; a lesson check says "The
 * question"), then the stem in `small` ink2 clamped to two lines, then a ghost
 * "Show question" (48pt, chevron) that opens it in place: the scenario, if
 * any, and the whole stem. No height animation (Collapse fades what opens).
 *
 * Screen readers: the caption and text are one stop that always says the
 * WHOLE question ("Question: …"), clamped or not; the toggle is its own stop
 * with its expanded state, for sighted learners who want it on screen.
 */
export function StemRecap({
  stem,
  scenario,
  caption = 'Question',
  field,
}: {
  stem: string;
  scenario?: string;
  caption?: string;
  /**
   * Premium round 2 (the Field Guide answer screen): the caption is a sentence-case caption
   * ("Question") and the stem is set in Fraunces 17/24 `ink2`, still cut to two lines. Left out
   * (a lesson's quick check), the 1.49 look.
   */
  field?: boolean;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const canOpen = Boolean(scenario) || stem.length > STEM_RECAP_CHARS;
  const whole = scenario ? `${scenario} ${stem}` : stem;
  // Folded, the stem is shortened HERE, at a whole word with one "…" (engine/textClip.ts), to what two lines
  // of this box hold at this text size. The platform's own cut-off would end "peer …" on one screen and
  // "processe…" on another. numberOfLines stays as a safety stop only. First guess: the screen less its gutters.
  const { width: screen } = useWindowDimensions();
  const [boxW, setBoxW] = useState(() => Math.max(0, screen - 2 * space.lg));
  const textScale = useFontScale();
  const size = field ? (fieldRole.recap?.style.fontSize ?? 18) : (type.small.fontSize ?? 15);
  const cap = field ? (fieldRole.recap?.max ?? 2) : maxScale.small;
  const folded = shortenAtWord(stem, lineBudget(boxW, size * Math.min(Math.max(1, textScale), cap), 2));
  const words = (text: string, lines?: number) =>
    field ? (
      <FieldText v="recap" numberOfLines={lines} style={{ marginTop: space.xs }}>{text}</FieldText>
    ) : (
      <T v="small" color={c.ink2} numberOfLines={lines} style={{ marginTop: space.xs }}>{text}</T>
    );
  return (
    <View style={{ marginTop: space.md }}>
      <View accessible accessibilityLabel={`${caption}: ${whole}`} onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}>
        {/* One caption for both looks, so the same "Question" label never changes role. */}
        <T v="caption" color={c.ink2}>{caption}</T>
        {scenario ? <Collapse open={open}>{words(scenario)}</Collapse> : null}
        {canOpen && !open ? words(folded, 2) : words(stem)}
      </View>
      {canOpen && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Hide question' : 'Show question'}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          hitSlop={4}
          style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', opacity: pressed ? 0.7 : 1 })}
        >
          <Row gap={space.xs}>
            <T v="label" color={c.accentText}>{open ? 'Hide question' : 'Show question'}</T>
            {/* The chevron turns over when open: shape, not just the words, says which way it goes. */}
            <View style={open ? { transform: [{ rotate: '180deg' }] } : undefined}>
              <ChevronDown size={18} color={c.accentText} strokeWidth={ICON_STROKE} />
            </View>
          </Row>
        </Pressable>
      )}
    </View>
  );
}

// ── Trust line: provenance + Report a problem ────────────────────────
// Under every revealed answer: "Original · Checked Oct 2026" (was "Reviewed" until 2.0.0, transparency) with the
// report link on the right, then the code and source. The link, its sheet
// and the note after sending live in components/support.tsx (one look and
// one spoken pattern for every report entry point).
export function TrustLine({ certId, target, reference }: { certId: string; target: ReportTarget; reference?: string }) {
  return (
    <ReportRow
      certId={certId}
      target={target}
      meta={`Original · Checked ${config.contentReviewed}`}
      // The question's code (d1_010) lives in the Report sheet, not here (mobile 1.24): the learner
      // sees the source, and the code travels with a report as before.
      sub={reference ? shortReference(reference) : undefined}
    />
  );
}

// ── Source line: provenance only (mobile 1.49) ───────────────────────
// The practice answer's last line: a hairline, "Original · Checked Oct 2026",
// then the source. "Report a problem" moved into the ⋯ sheet (premium pass
// §2.4), so the line is text only. `children`: the note after a report's email
// app opened (useReportFlow's `block`), kept under the source as before.
export function SourceLine({ reference, children, onReport }: { reference?: string; children?: ReactNode; /** Grove Phase 4: the "Report a problem" link at the row's right (it stays in More too). */ onReport?: () => void }) {
  const { c } = useTheme();
  return (
    <View testID="answer-source" style={{ borderTopWidth: 1, borderTopColor: c.line, marginTop: space.lg, paddingTop: space.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', columnGap: space.md }}>
        <View accessible accessibilityLabel={`Original, checked ${config.contentReviewed}${reference ? `, ${shortReference(reference)}` : ''}`} style={{ flexShrink: 1, paddingVertical: onReport ? 14 : 0 }}>
          <T v="meta" color={c.ink2}>{`Original · Checked ${config.contentReviewed}`}</T>
          {reference ? <T v="meta" color={c.ink2}>{shortReference(reference)}</T> : null}
        </View>
        {onReport && (
          <Pressable
            testID="answer-report-link"
            accessibilityRole="button"
            accessibilityLabel="Report a problem with this question"
            accessibilityHint="Opens a short form, then your email app"
            onPress={onReport}
            style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
          >
            <T v="meta" color={c.accentText}>Report a problem</T>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

// ── AnswerMore: the ⋯ "More on this question" sheet (mobile 1.49) ─────
/**
 * One row of the ⋯ sheet: what it does (`kicker`, a verb), the name (`title`),
 * and what runs once the sheet has gone (`run`).
 */
export interface MoreRow {
  key: string;
  icon: (color: string) => ReactNode;
  kicker?: string;
  title: string;
  subtitle?: string;
  /** The whole row's spoken label (starts with the words on screen, WCAG 2.5.3). */
  label: string;
  hint?: string;
  /** Opens another screen or sheet (a chevron). "Add a note" opens in place: none. */
  chevron?: boolean;
  run: () => void;
}

/**
 * How long a closing sheet needs before the next screen or sheet opens. iOS
 * cannot present a Modal (or push under one) while another is still fading
 * away; Android can at once. The same wait as the badge sheet's "Study for this".
 */
export const SHEET_GONE_MS = Platform.OS === 'ios' ? 700 : 60;
/** Screen-reader focus goes back to ⋯ once the sheet has gone. */
export const MORE_FOCUS_BACK_MS = Platform.OS === 'ios' ? 750 : 400;

/**
 * Premium pass §2.3: a 48pt ⋯ IconButton (spoken "More on this question")
 * that opens a Sheet of the extra ways on from an answer: read the note, read
 * the principle, add a note, report a problem. The page body keeps only one
 * "Go deeper" row, so the answer ends in about a screen and a half.
 *
 * - A row closes the sheet first, then runs once it has gone (SHEET_GONE_MS).
 * - Closing it any other way (Close, the dim, Back, the escape gesture) puts
 *   screen-reader focus back on ⋯ (`buttonRef`).
 * - The sheet fades in with an 8pt rise (Sheet's FadeIn); Reduce Motion fades only.
 * - Never in a mock: the session screen does not render it there.
 */
export function AnswerMore({ rows: given, buttonRef }: { rows: (MoreRow | null)[]; buttonRef: RefObject<View | null> }) {
  const { c } = useTheme();
  // The screen passes null for a row that doesn't apply (no note, no principle…).
  const rows = given.filter((row): row is MoreRow => row !== null);
  const [open, setOpen] = useState(false);
  // A row's action waits for the sheet to go (lib/sheetWait.ts); leaving the screen first cancels it.
  const cancelWait = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelWait.current?.(), []);
  const close = () => {
    setOpen(false);
    moveFocus(buttonRef, MORE_FOCUS_BACK_MS);
  };
  const choose = (row: MoreRow) => {
    setOpen(false);
    cancelWait.current?.();
    cancelWait.current = afterSheet(() => {
      cancelWait.current = null;
      row.run();
    }, SHEET_GONE_MS);
  };
  return (
    <>
      <IconButton
        ref={buttonRef}
        label="More on this question"
        hint={rows.length > 1 ? 'Opens all the options, the note, the principle, your note and Report a problem' : 'Opens Report a problem'}
        expanded={open}
        icon={(col) => <Ellipsis size={24} color={col} strokeWidth={ICON_STROKE} />}
        onPress={() => setOpen(true)}
      />
      <Sheet visible={open} onClose={close} title="More on this question">
        {rows.map((row, i) => (
          <ListRow
            key={row.key}
            icon={row.icon(c.accentText)}
            kicker={row.kicker}
            title={row.title}
            subtitle={row.subtitle}
            chevron={row.chevron !== false}
            accessibilityLabel={row.label}
            accessibilityHint={row.hint}
            onPress={() => choose(row)}
            last={i === rows.length - 1}
          />
        ))}
      </Sheet>
    </>
  );
}

// ── Show all options: the four options, read-only, after the answer ──
/** One option in the "Show all options" sheet: its DISPLAY letter, its text, and whether it is the pick or the best. */
export interface AllOptionsRow {
  letter: Letter;
  text: string;
  pick: boolean;
  best: boolean;
}

/**
 * Grove Phase 4 (PHASE4.md 4.2 step 2 and 4.5): the answer card shows only the pick and the best
 * answer, so the other options stay one tap away in More as "Show all options". This sheet lists all
 * of them in DISPLAY order, read-only (nothing here can be tapped or graded). The pick and the best
 * answer carry their badge colour AND their words ("Your answer", "Best answer"), so colour is never
 * alone. The caller looks each option up by its ORIGINAL letter through the session's shuffle; this
 * part only draws what it is given. Each row is one screen-reader stop.
 */
export function AllOptionsSheet({ visible, onClose, rows }: { visible: boolean; onClose: () => void; rows: AllOptionsRow[] }) {
  const { c } = useTheme();
  const fontScale = useFontScale();
  const discAbove = fontScale >= DISC_ABOVE_FROM;
  // The badge grows with its letter, as on the answer card (TYPE_SCALE.md exception E4).
  const disc = DISC * Math.min(Math.max(fontScale, 1), 1.6);
  return (
    <Sheet visible={visible} onClose={onClose} title="All options">
      <View testID="all-options">
        {rows.map((r, i) => {
          // The caption words: the pick, the best, or both at once after a right answer.
          const caption = r.pick && r.best ? '✓ Your answer · the best' : r.best ? '✓ Best answer' : r.pick ? '✗ Your answer' : null;
          const tone = r.best ? c.correct : r.pick ? c.wrong : null;
          const spoken = r.pick && r.best
            ? `${r.letter}, your answer, the best: ${r.text}`
            : r.best
              ? `${r.letter}, best answer: ${r.text}`
              : r.pick
                ? `${r.letter}, your answer, not the best: ${r.text}`
                : `${r.letter}: ${r.text}`;
          return (
            <View
              key={r.letter}
              accessible
              accessibilityLabel={spoken}
              testID={`all-options-${r.letter}`}
              style={[
                { flexDirection: discAbove ? 'column' : 'row', alignItems: 'flex-start', gap: discAbove ? space.sm : DISC_GAP, paddingVertical: space.md },
                i > 0 && { borderTopWidth: 1, borderTopColor: c.line },
              ]}
            >
              {/* The pick and the best: a filled badge in their state colour. The others: an outlined badge. */}
              <View
                style={{
                  minWidth: disc,
                  minHeight: disc,
                  borderRadius: groveRadius.step,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tone ?? 'transparent',
                  borderWidth: tone ? 0 : 1.5,
                  borderColor: c.control,
                }}
              >
                <T v="badgeLetter" color={tone ? c.bg : c.ink}>{r.letter}</T>
              </View>
              <View style={{ flex: discAbove ? undefined : 1, alignSelf: 'stretch' }}>
                {caption && tone && <T v="caption" color={tone} style={{ marginBottom: 2 }}>{caption}</T>}
                <FieldText v={r.best ? 'best' : 'option'}>{r.text}</FieldText>
              </View>
            </View>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Full answer context, only mounted after checking an answer or finishing a mock.
 * Keep the saved permutation: a new shuffle here would change the meaning of every tip.
 * The compact verdict stays above this section; comparison never needs a sheet or memory.
 */
export function AnswerContext({ question, perm, picked }: { question: PackQuestion; perm: Permutation; picked?: Letter }) {
  const { c } = useTheme();
  return (
    <View testID="answer-context" style={{ marginTop: space.xl }}>
      <T v="headline" accessibilityRole="header">Compare all options</T>
      {perm.map((original, i) => {
        const letter = LETTERS[i];
        const best = original === question.correct;
        const chosen = letter === picked;
        const caption = best ? (chosen ? 'Your answer · the best' : 'Best answer') : chosen ? 'Your answer · not the best' : 'Not the best';
        const why = renderText(best ? question.explanation : question.wrongExplanations[original], perm);
        const wording = question.options[original] ?? '';
        return (
          <View key={letter} testID={`answer-context-${letter}`} style={{ borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: space.md }}>
            <View accessible accessibilityLabel={`${letter}, ${caption}: ${wording}`}>
              <T v="caption" color={best ? c.correct : chosen ? c.wrong : c.ink2}>{`${letter} · ${best ? '✓' : '✗'} ${caption}`}</T>
              <FieldText v={best ? 'best' : 'option'}>{wording}</FieldText>
            </View>
            {why ? (
              <View accessible accessibilityLabel={`${best ? 'Why' : 'Why not'} ${letter}: ${why}`} style={{ marginTop: space.sm }}>
                <T v={best ? "headline" : "caption"} accessibilityRole={best ? "header" : undefined} color={c.ink2}>{`${best ? 'Why' : 'Why not'} ${letter}`}</T>
                <T v="small">{why}</T>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ── Sticky footer with a paper fade above it (spec §6) ────────────────
// Reports its height so the scroll view can pad by footer + 24 and the
// last option never sits under the button.
//
// `rule` (premium round 2, the Field Guide footer in practice and review, question and answer): a 1pt `line` hairline across the top
// instead of the paper fade, and the button sits a little below it, as on a guide's page foot.
export function StickyFooter({ children, onHeight, rule }: { children: ReactNode; onHeight: (h: number) => void; rule?: boolean }) {
  const { c } = useTheme();
  const onLayout = (e: LayoutChangeEvent) => onHeight(e.nativeEvent.layout.height);
  return (
    <View onLayout={onLayout} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' }}>
      {rule ? null : (
        <Svg height={22} width="100%" style={{ pointerEvents: 'none' }}>
          <Defs>
            <LinearGradient id="footerFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.bg} stopOpacity={0} />
              <Stop offset="1" stopColor={c.bg} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="22" fill="url(#footerFade)" />
        </Svg>
      )}
      <View
        testID={rule ? 'footer-rule' : undefined}
        style={[
          { backgroundColor: c.bg, paddingHorizontal: space.gutter, paddingBottom: space.md, gap: space.md },
          rule ? { borderTopWidth: 1, borderTopColor: c.line, paddingTop: space.md } : null,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// Exported for the session screen: delays used to stagger the answer screen
// (spec §10.2): the rows start as the verdict leaf settles, "Why" just after.
export const FEEDBACK_DELAY = { rows: motion.dur.select, why: motion.dur.reveal } as const;
/**
 * When the vine's entrance has landed (premium round 2, UX H1): the vine's group (Key idea and the tips)
 * fades in at `why` over `reveal`. Since the owner's O1 answer every tip is in that one group. The
 * vine may draw (stem, leaf pops, its one haptic) only from here, never while its group is still invisible. Under Reduce Motion everything is in after `reduced`.
 */
export const VINE_ARRIVES = FEEDBACK_DELAY.why + motion.dur.reveal;
