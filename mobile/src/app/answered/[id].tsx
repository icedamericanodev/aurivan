/**
 * Look back at an answered question (mobile 2.2). READ-ONLY.
 *
 * Plain English for the founder: a learner asked "let me look back at
 * questions I already answered, with the explanations, without having to
 * answer them again". The Question bank's Answered filter opens this page
 * (app/bank/[domain].tsx). It is called "answered", never "review": in this
 * app "review" means answering a question again (the spaced review queue).
 *
 * Top to bottom (the same calm order as the answer screen; testers found a
 * full list of reasons under every option a "wall"):
 *   - the last result and its date ("Last time: correct", "6 Oct 2026"), and
 *     the learner's own count on this question;
 *   - the scenario and the whole question, never folded;
 *   - one switch, "Show why the other options are wrong", closed on every
 *     visit. It sits ABOVE the options, so the reasons appear after the control
 *     that reveals them. It reveals the WRONG options' reasons only (the best
 *     answer's is "Why B", lower down). After a miss whose pick was saved, that
 *     option's own "Why not B" is already open;
 *   - the four options in their ORIGINAL A to D order (no shuffle was saved
 *     for an old answer, so none is invented), with the best answer marked;
 *   - the Key idea and the tips;
 *   - "Why B": the best answer's explanation, whole;
 *   - a line saying the explanations are the latest version;
 *   - one separate button, "Practice this question".
 *
 * Three rules this screen must never break (engine/answeredReview.ts holds the logic):
 *   1. It changes NOTHING. It only reads the progress and session stores. No
 *      effect, timer or tap here writes to them, so attempts, readiness, the
 *      review queue, the streak, badges, mistakes and any paused session stay
 *      exactly as they were. Only "Practice this question" starts something,
 *      and only when it is tapped (it asks first if a session is paused).
 *   2. It never guesses the learner's pick. An answer record does not keep
 *      the option picked. The one honest exception is a miss whose pick the
 *      Mistake journal kept for that same attempt (savedMissPick). After any
 *      other miss it says the pick was not saved (PICK_NOT_SAVED_LINE). After a
 *      RIGHT answer it says nothing about the pick: beside "Last time: correct"
 *      that line read as an error, and no row is called "Your answer".
 *   3. It never shows an answer for a question that is in a mock exam the
 *      learner has not submitted: "Finish your mock first".
 *
 * PRODUCT RULE: no bank or domain size anywhere. The only counts are the
 * learner's own answers to this one question.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusMark } from '../../components/bank';
import { EmptyScreen } from '../../components/emptyScreen';
import { KeyIdea, OptionsWithWhy, ScenarioBlock, StickyFooter, TipsCard, TipsHeading, WhyBlock, type OptionWithWhy } from '../../components/quiz';
import { Button, Gap, PushedHeader, Row, Stem, T, Tag } from '../../components/ui';
import { CERTIFICATIONS, getCertification } from '../../content/certifications';
import { findQuestion } from '../../content/loader';
import { LETTERS } from '../../content/types';
import {
  attemptsLine,
  CURRENT_EXPLANATIONS_LINE,
  lastResultLine,
  lookBackGate,
  PICK_NOT_SAVED_LINE,
  READ_ONLY_LINE,
  savedMissPick,
} from '../../engine/answeredReview';
import { difficultyLabel } from '../../engine/bank';
import { identityPermutation, originalToDisplay, renderText } from '../../engine/shuffle';
import { tipParts } from '../../engine/tips';
import { backOr, safeDecode } from '../../lib/actions';
import { useActiveCertId } from '../../lib/activeCert';
import { longDate, spokenShortDate } from '../../lib/format';
import { guardedStart, startFromIds } from '../../lib/sessions';
import { ownOf, selectCert, useProgress } from '../../store/progress';
import { useSession } from '../../store/session';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** The words in the header bar, on the page and on its empty states. */
export const LOOK_BACK_TITLE = 'Answered question';
export const PRACTICE_THIS_LABEL = 'Practice this question';

const goBack = () => backOr('/practice');
const openSession = () => router.push('/session');

export default function AnsweredQuestion() {
  const { c } = useTheme();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  // A link can carry anything here: decode it safely and treat a non-text value as "no id".
  const id = typeof rawId === 'string' ? safeDecode(rawId) : '';
  const certId = useActiveCertId();
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];
  const [footerH, setFooterH] = useState(120);

  // READS ONLY: three plain reads of saved data. Nothing on this page writes to a store.
  const answers = useProgress((s) => selectCert(s, certId).answers);
  const miss = useProgress((s) => ownOf(selectCert(s, certId).mistakes, id));
  // The open session, read only for rule 3 (is this question in an unsubmitted mock?).
  const session = useSession((s) => s.active);

  const question = findQuestion(certId, id);
  const gate = lookBackGate({ question, certId, answers, session });

  // ── The three "can't open" states: a calm empty screen, never a crash ──
  if (gate.kind === 'unknown' || !question) {
    return (
      <EmptyScreen
        header={LOOK_BACK_TITLE}
        fallback="/practice"
        art="fieldbook"
        title="Question not found"
        body="Go back and pick a question from the Question bank."
      />
    );
  }
  if (gate.kind === 'mock') {
    return (
      <EmptyScreen
        header={LOOK_BACK_TITLE}
        fallback="/practice"
        art="fieldbook"
        title="Finish your mock first"
        body="This question is in your unfinished mock exam. You can look back at it after you submit."
      />
    );
  }
  if (gate.kind === 'unanswered') {
    return (
      <EmptyScreen
        header={LOOK_BACK_TITLE}
        fallback="/practice"
        art="seedling"
        title="Not answered yet"
        body="You can look back at a question here after you answer it."
      />
    );
  }

  const record = gate.record;
  const domain = cert.domains.find((d) => d.id === question.domainId);
  // ORIGINAL order, A to D. No shuffle was saved with an old answer, so none is made up here.
  const perm = identityPermutation(question);
  // Rule 2: the pick is shown only when the Mistake journal kept it for this same attempt.
  const pick = savedMissPick(record, miss, question);
  const date = longDate(record.lastAt);
  const spokenDate = `${spokenShortDate(record.lastAt)} ${new Date(record.lastAt).getFullYear()}`;
  const result = lastResultLine(record);
  const attempts = attemptsLine(record);
  const tagLine = `${domain ? `${domain.short} · ` : ''}${difficultyLabel(question.difficulty)}`;
  const tips = question.tips.map((tip, i) => tipParts(renderText(tip, perm), i));
  // The four option rows, A to D. `pick` is only ever true for a miss the Mistake journal kept
  // (rule 2), so after a right answer no row is called "Your answer". Compared on ORIGINAL letters.
  // A reason only for the WRONG options: the best answer's is printed whole below ("Why B").
  const options: OptionWithWhy[] = perm.map((original, i) => {
    const best = original === question.correct;
    const why = best ? undefined : question.wrongExplanations[original];
    return { letter: LETTERS[i], text: question.options[original] ?? '', pick: original === pick, best, why: why ? renderText(why, perm) : undefined };
  });
  const bestLetter = originalToDisplay(question.correct, perm);
  const explanation = renderText(question.explanation, perm);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}>
        <PushedHeader title={LOOK_BACK_TITLE} onBack={goBack} />

        {/* The last result: one screen-reader stop that says the result, the date and the count. */}
        <View
          testID="look-back-result"
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${result}, ${spokenDate}. ${attempts}.`}
          style={{ marginTop: space.sm }}
        >
          <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
            {/* ✓ / ✗ by shape as well as colour; the words beside it say the same. */}
            <View style={{ paddingTop: 2 }}>
              <StatusMark status={record.lastCorrect ? 'correct' : 'missed'} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="headline">{result}</T>
              <T v="meta" num style={{ marginTop: 2 }}>{`${date} · ${attempts}`}</T>
            </View>
          </Row>
        </View>
        <T v="meta" style={{ marginTop: space.sm }}>{READ_ONLY_LINE}</T>

        <Gap h={space.xl} />
        <Tag label={tagLine} domain={domain} />
        {question.scenario ? (
          <>
            <Gap h={space.md} />
            <ScenarioBlock text={question.scenario} />
          </>
        ) : null}
        <View style={{ marginTop: space.md }}>
          <T v="caption" color={c.ink2} accessibilityRole="header">Question</T>
          <Gap h={space.xs} />
          <Stem>{question.stem}</Stem>
        </View>

        <View style={{ marginTop: space.lg }}>
          {/* Rule 2: after a miss whose pick is not known, say so plainly, once, right ABOVE the switch
              (so nothing comes between the switch and the rows it opens). Never after a right answer
              (there it read as an error), and never a guess. */}
          {!record.lastCorrect && pick === null ? <T v="meta">{PICK_NOT_SAVED_LINE}</T> : null}
          {/* ONE switch, "Show why the other options are wrong", closed on every visit, then the four
              options in ORIGINAL order, read-only (the same rows as the answer screen's recap). A saved
              miss pick shows its own "Why not B" at once, as the answer card does; the switch adds the
              other wrong options' reasons. The best answer's reason is "Why B", further down. */}
          <OptionsWithWhy choices={options} startWhyOpenFor={pick ? [originalToDisplay(pick, perm)] : undefined} />
        </View>

        {/* `visible={false}`: the Key idea's small buzz is for a fresh answer, not for reading back. */}
        <KeyIdea text={question.keyConcept} visible={false} />
        {tips.length > 0 ? <TipsHeading /> : null}
        <TipsCard rows={tips} visible testID="look-back-tips" />
        {/* The best answer's explanation, always whole here (`fold={false}`: nothing to "Read more"). */}
        {explanation ? <WhyBlock letter={bestLetter} text={explanation} fold={false} /> : null}
        {/* Last: the explanations may have been improved since the answer was given. */}
        <T v="meta" style={{ marginTop: space.lg }}>{CURRENT_EXPLANATIONS_LINE}</T>
      </ScrollView>

      {/* The ONLY thing here that starts anything, and only when tapped. guardedStart asks before it
          replaces a paused session (lib/sessions.ts), exactly as a bank row does. This footer is a
          direct child of the screen's SafeAreaView, so it keeps StickyFooter's own safe-area inset. */}
      <StickyFooter onHeight={setFooterH}>
        <Button
          kind="secondary"
          label={PRACTICE_THIS_LABEL}
          accessibilityHint="Starts a one-question practice. That answer will count."
          onPress={() => guardedStart(() => startFromIds(certId, [question.id], domain?.short ?? 'Question bank'), openSession)}
        />
      </StickyFooter>
    </SafeAreaView>
  );
}
