/**
 * Grove Phase 4b: a drill's answer (design-notes/grove/phase4b/PHASE4B.md 6.4, "one grammar with the
 * main answer screen"). It replaces the question and its options once a question-based drill is
 * answered (Snare Spotter, Signpost, Call It First, Forecast, Daylight), in this order:
 *
 * 1. The question folded to two lines with "Show question" (the built StemRecap).
 * 2. The verdict: the leaf mark, the drill's word in `hero` in its state colour ("Snare spotted",
 *    "Correct", "Half right" in clay, "Not quite"), the coach line in `aside`.
 * 3. The two-half line (Snare Spotter, Signpost, Call It First only), one `small` line at the top of the
 *    answer card naming ONLY the half that was earned ("Snare spotted, 1 point.").
 * 4. One untinted answer card: "Your answer", "Best answer", a "Snare" row (outline letter badge,
 *    `ink2` caption, never clay) with why it tempts, then "Other options" as a muted list.
 * 5. "How to think about it": the item's own tips, word for word, in the built tips card.
 * 6. "Why A, and the key idea": a closed disclosure (48pt) with the explanation and the key idea.
 *
 * Motion (PHASE4B section 8, "Drill right answer"): only a RIGHT answer moves. The verdict leaf springs
 * from 0.6 at 120 ms while the recapped question and the word fade in over 160 ms (so no frame is empty),
 * the card arrives from
 * 200 ms with its rows 30 ms apart, one success haptic. A miss animates nothing. Reduce Motion: the end
 * state at once (a 120 ms fade at most), with the same haptic.
 *
 * Screen readers: focus moves to the verdict heading after 400 ms and it says the drill's line once
 * (`spoken`, for example "Half right. Snare spotted, 1 point."); the card is read as the learner moves on.
 * Letters are DISPLAY letters; every option is looked up by its ORIGINAL letter (engine/shuffle.ts).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { LETTERS, type Letter, type PackQuestion } from '../content/types';
import { tipPickLetter } from '../engine/pickCoach';
import { displayToOriginal, originalToDisplay, renderText, type Permutation } from '../engine/shuffle';
import { tipParts } from '../engine/tips';
import { moveFocus } from '../lib/a11y';
import type { DrillVerdictCopy } from '../lib/drillVerdict';
import { haptic } from '../lib/haptics';
import { groveRadius } from '../theme/grove';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { FieldText } from './fieldguide';
import { VerdictLeaf } from './glyphs';
import { Check, ChevronDown, ICON_STROKE, Minus, X } from './icons';
import { Collapse, FadeIn, Pop } from './motion';
import { DISC_ABOVE_FROM, PickNote, PLATE_ROW_STAGGER, StemRecap, TipsCard, TipsHeading, useVerdictIndent, VERDICT_INDENT } from './quiz';
import { groveCard, Row, T, useFontScale } from './ui';

/** When the verdict leaf springs, and when the card arrives (PHASE4B section 8). */
export const DRILL_REVEAL = { leaf: 120, card: 200 } as const;
/** When focus moves to the verdict (PHASE4B 6.4 item 7). */
export const DRILL_FOCUS_MS = 400;
const LEAF = 34;
const DISC = 30;

export interface DrillAnswerProps {
  q: PackQuestion;
  perm: Permutation;
  /** The learner's answer (DISPLAY letter). */
  pick: Letter;
  verdict: DrillVerdictCopy;
  /** The two-half line, when exactly one half was earned. */
  half?: string | null;
  /** The snare (Snare Spotter): its DISPLAY letter and why it tempts. */
  snare?: { letter: Letter; why: string } | null;
  /** One `meta` line under the verdict (Forecast's points, Daylight's seconds). */
  extra?: string | null;
  /** One `meta` line at the end (Daylight: "The light waits while you read this."). */
  note?: string | null;
  /** Content between the verdict and the card (Signpost's word, read). */
  children?: ReactNode;
  /** A right answer: the reveal plays (a miss animates nothing). */
  animate: boolean;
}

/** The verdict: leaf, word and coach line. The heading says `spoken`; the coach line is its own stop unless `spoken` already holds it. */
function DrillVerdict({ verdict, animate }: { verdict: DrillVerdictCopy; animate: boolean }) {
  const { c } = useTheme();
  const indent = useVerdictIndent();
  const ref = useRef<View>(null);
  // One half earned (release prep 2.0.0): clay, the calm-attention colour that never means an error.
  const color = verdict.good ? c.correct : verdict.partial ? c.clay : c.wrong;
  useEffect(() => {
    moveFocus(ref, DRILL_FOCUS_MS);
  }, []);
  const coachSaid = verdict.spoken.includes(verdict.coach);
  return (
    <View testID="drill-verdict">
      <View ref={ref} accessible accessibilityRole="header" accessibilityLabel={verdict.spoken}>
        <Row gap={VERDICT_INDENT - LEAF} style={{ marginTop: space.md }}>
          <Pop mount={animate} spring="pop" delay={DRILL_REVEAL.leaf} style={{ width: LEAF, height: LEAF }}>
            <VerdictLeaf size={LEAF} color={color} />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              {verdict.good ? (
                <Check size={18} color={c.bg} strokeWidth={2.5} />
              ) : verdict.partial ? (
                <Minus size={18} color={c.bg} strokeWidth={2.5} />
              ) : (
                <X size={18} color={c.bg} strokeWidth={2.5} />
              )}
            </View>
          </Pop>
          <FieldText v="verdict" color={color} style={{ flexShrink: 1 }}>{verdict.word}</FieldText>
        </Row>
      </View>
      <View accessible={!coachSaid} importantForAccessibility={coachSaid ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={coachSaid}>
        <FieldText v="sub" style={{ marginTop: space.xs, marginLeft: indent }}>{verdict.coach}</FieldText>
      </View>
    </View>
  );
}

/** A letter badge: filled in the state colour (your answer, the best one), or an outline (the snare, the others). */
function Badge({ letter, fill, edge, ink }: { letter: Letter; fill?: string; edge?: string; ink: string }) {
  const fontScale = useFontScale();
  // The badge grows with its letter (TYPE_SCALE exception E4): 30pt times text scale, capped at 1.6.
  const disc = DISC * Math.min(Math.max(fontScale, 1), 1.6);
  return (
    <View style={{ minWidth: disc, minHeight: disc, borderRadius: groveRadius.step, backgroundColor: fill, borderWidth: edge ? 1.5 : 0, borderColor: edge, alignItems: 'center', justifyContent: 'center' }}>
      <T v="badgeLetter" color={ink}>{letter}</T>
    </View>
  );
}

/** One row of the card: badge, caption, the option's words. One stop. */
function CardRow({ testID, caption, captionColor, text, spoken, badge, best }: { testID: string; caption: string; captionColor: string; text: string; spoken: string; badge: ReactNode; best?: boolean }) {
  const discAbove = useFontScale() >= DISC_ABOVE_FROM;
  return (
    <View testID={testID} accessible accessibilityLabel={spoken} style={{ flexDirection: discAbove ? 'column' : 'row', alignItems: 'flex-start', gap: discAbove ? space.sm : 14 }}>
      {badge}
      <View style={{ flex: discAbove ? undefined : 1, alignSelf: 'stretch' }}>
        <T v="caption" color={captionColor} style={{ marginBottom: 2 }}>{caption}</T>
        <FieldText v={best ? 'best' : 'option'}>{text}</FieldText>
      </View>
    </View>
  );
}

export function DrillAnswer({ q, perm, pick, verdict, half, snare, extra, note, children, animate }: DrillAnswerProps) {
  const { c } = useTheme();
  const indent = useVerdictIndent();
  const [open, setOpen] = useState(false);
  const best = originalToDisplay(q.correct, perm);
  const pickOrig = displayToOriginal(pick, perm);
  const missed = pickOrig !== q.correct;
  const text = (d: Letter) => q.options[displayToOriginal(d, perm)] ?? '';
  // One success haptic for a right answer (PHASE4B section 8, the same under Reduce Motion). A miss is calm.
  useEffect(() => {
    if (verdict.good) haptic.success();
    // Once, as the answer arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows: { key: string; node: ReactNode }[] = [];
  if (half) rows.push({ key: 'half', node: <View testID="drill-half"><T v="small">{half}</T></View> });
  const snareIsPick = Boolean(snare && missed && snare.letter === pick);
  if (missed) {
    const why = snareIsPick ? snare!.why : q.wrongExplanations[pickOrig];
    rows.push({
      key: 'pick',
      node: (
        <View>
          <CardRow
            testID="drill-row-pick"
            caption={`✗ Your answer${snareIsPick ? ' · the snare' : ''}`}
            captionColor={c.wrong}
            text={text(pick)}
            spoken={`Your answer, ${pick}${snareIsPick ? ', the snare' : ''}, not the best: ${text(pick)}`}
            badge={<Badge letter={pick} fill={c.wrong} ink={c.bg} />}
          />
          {why ? <PickNote letter={pick} text={renderText(why, perm)} /> : null}
        </View>
      ),
    });
  }
  rows.push({
    key: 'best',
    node: (
      <CardRow
        testID="drill-row-best"
        caption={missed ? '✓ Best answer' : '✓ Your answer · the best'}
        captionColor={c.correct}
        text={text(best)}
        spoken={missed ? `Best answer, ${best}: ${text(best)}` : `Your answer, ${best}, the best: ${text(best)}`}
        badge={<Badge letter={best} fill={c.correct} ink={c.bg} />}
        best
      />
    ),
  });
  if (snare && !snareIsPick && snare.letter !== best) {
    rows.push({
      key: 'snare',
      node: (
        <View>
          <CardRow
            testID="drill-row-snare"
            caption="Snare"
            captionColor={c.ink2}
            text={text(snare.letter)}
            spoken={`Snare, ${snare.letter}: ${text(snare.letter)}`}
            badge={<Badge letter={snare.letter} edge={c.control} ink={c.ink2} />}
          />
          <PickNote letter={snare.letter} text={renderText(snare.why, perm)} />
        </View>
      ),
    });
  }
  const shown = new Set<Letter>([pick, best, ...(snare ? [snare.letter] : [])]);
  const others = LETTERS.slice(0, perm.length).filter((d) => !shown.has(d));
  if (others.length) {
    rows.push({
      key: 'others',
      node: (
        <View testID="drill-others" style={{ gap: space.sm }}>
          <T v="caption" color={c.ink2}>Other options</T>
          {others.map((d) => (
            <View key={d} accessible accessibilityLabel={`Option ${d}: ${text(d)}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <Badge letter={d} edge={c.line} ink={c.muted} />
              <T v="small" color={c.muted} style={{ flex: 1 }}>{text(d)}</T>
            </View>
          ))}
        </View>
      ),
    });
  }

  const tips = q.tips.map((t, i) => ({ ...tipParts(renderText(t, perm), i), pick: tipPickLetter(t, q.correct, missed ? pickOrig : undefined, perm) }));
  const whyTitle = q.keyConcept ? `Why ${best}, and the key idea` : `Why ${best}`;
  const after = DRILL_REVEAL.card + PLATE_ROW_STAGGER * (rows.length + 1);
  return (
    <View testID="drill-answer">
      {/* The recapped question and the verdict fade in at once (160 ms); the leaf springs at 120 ms. */}
      <FadeIn play={animate} dur="quick" rise={false}>
        <StemRecap stem={q.stem} scenario={q.scenario} field />
        <DrillVerdict verdict={verdict} animate={animate} />
        {extra ? <T v="meta" num style={{ marginTop: space.xs, marginLeft: indent }}>{extra}</T> : null}
      </FadeIn>
      {children}
      <FadeIn play={animate} delay={DRILL_REVEAL.card} dur="reveal" rise={false} style={{ marginTop: space.lg }}>
        <View testID="drill-card" style={[groveCard(c), { padding: 18 }]}>
          {rows.map((r, i) => (
            <FadeIn key={r.key} play={animate} dur="reveal" rise={false} delay={DRILL_REVEAL.card + PLATE_ROW_STAGGER * (i + 1)}>
              <View style={i > 0 ? { borderTopWidth: r.key === 'pick' && rows[i - 1].key === 'half' ? 0 : 1, borderTopColor: c.line, marginTop: space.md, paddingTop: r.key === 'pick' && rows[i - 1].key === 'half' ? 0 : space.md } : undefined}>{r.node}</View>
            </FadeIn>
          ))}
        </View>
      </FadeIn>
      <FadeIn play={animate} delay={after} dur="reveal" rise={false}>
        {tips.length > 0 ? (
          <>
            <TipsHeading />
            <TipsCard rows={tips} visible testID="drill-tips" />
          </>
        ) : null}
        {/* The explanation and the key idea, folded (the built Read more pattern: no height animation). */}
        <Pressable
          testID="drill-why"
          accessibilityRole="button"
          accessibilityLabel={whyTitle}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
          style={({ pressed }) => ({ minHeight: 48, marginTop: space.lg, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
        >
          <Row gap={space.xs} style={{ flexWrap: 'wrap' }}>
            <T v="label" color={c.accentText} style={{ flexShrink: 1 }}>{whyTitle}</T>
            <View style={open ? { transform: [{ rotate: '180deg' }] } : undefined}>
              <ChevronDown size={18} color={c.accentText} strokeWidth={ICON_STROKE} />
            </View>
          </Row>
        </Pressable>
        <Collapse open={open}>
          <View testID="drill-explanation"><T v="body">{renderText(q.explanation, perm)}</T></View>
          {q.keyConcept ? (
            // The key idea, as on the answer screen: a caption over the quote, with the 3pt accent rule.
            <View testID="drill-key-idea" accessible accessibilityLabel={`Key idea: ${q.keyConcept}`} style={{ marginTop: space.lg, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
              <T v="caption" color={c.accentText}>Key idea</T>
              <T v="quote" color={c.ink} style={{ marginTop: space.xs }}>{q.keyConcept}</T>
            </View>
          ) : null}
        </Collapse>
        {note ? <T v="meta" style={{ marginTop: space.md }}>{note}</T> : null}
      </FadeIn>
    </View>
  );
}
