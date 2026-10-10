/**
 * Sure Footing (id `sprint`) — say how sure you are, then answer.
 * Guess +1 / 0 · Lean +2 / −1 · Sure +3 / −5: the honest choice scores best
 * (engine/games/calibration.ts explains the maths). The rules show on the
 * first play and behind the info button. The end screen shows accuracy per
 * confidence level: are your Sure answers really sure?
 * Copy rule: no betting words ("bet", "stake") anywhere.
 */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { GameFrame, PlayableGate, QuestionHead, RevealCard, RoundEnd, useRound } from '../../components/game';
import { OptionCard, type OptionState } from '../../components/quiz';
import { Button, Gap, ProgressBar, Segmented, T, useFontScale } from '../../components/ui';
import { getAllQuestions } from '../../content/loader';
import { LETTERS, type Letter } from '../../content/types';
import {
  calibration,
  calibrationVerdict,
  FOOTING_CONFIDENCE,
  FOOTING_DESC,
  footingPayoff,
  footingSpoken,
  FOOTINGS,
  maxScore,
  PAYOFF,
  points,
  signed,
  sprintScore,
  VERDICT_COPY,
  type Footing,
  type SprintResult,
} from '../../engine/games/calibration';
import { pickMiss, type RecapMiss } from '../../engine/games/recap';
import { GAMES } from '../../engine/games/registry';
import { buildPracticeQueue } from '../../engine/queue';
import { createRng } from '../../engine/random';
import { displayToOriginal, isCorrect, originalToDisplay, renderText } from '../../engine/shuffle';
import { logGame } from '../../lib/activity';
import { useAnswerClock } from '../../lib/useAnswerClock';
import { useActiveCert } from '../../lib/useActiveCert';
import { selectCert, useProgress } from '../../store/progress';
import { useSettings } from '../../store/settings';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZE = GAMES.sprint.size;

/** The scoring rules: shown on the first play, and behind the info button. */
function SureFootingRules({ onDone, focus }: { onDone: () => void; focus?: boolean }) {
  const { c } = useTheme();
  // Opened from the info button mid-question: move screen-reader focus to the heading.
  const headRef = useRef<View>(null);
  useEffect(() => {
    if (focus && headRef.current) AccessibilityInfo.sendAccessibilityEvent(headRef.current, 'focus');
  }, [focus]);
  const large = useFontScale() >= LARGE_TEXT;
  return (
    <View accessibilityLiveRegion="polite" style={{ marginBottom: space.lg }}>
      <View ref={headRef} accessible accessibilityRole="header" accessibilityLabel="How Sure Footing scores">
        <T v="headline">How Sure Footing scores</T>
      </View>
      <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>
        Before each answer, say how sure you are. Pick the one that matches how sure you really feel: over many questions, honest
        confidence scores best.
      </T>
      {FOOTINGS.map((f, k) => (
        <View
          key={f}
          accessible
          // The points AND when to choose it, in one stop.
          accessibilityLabel={`${footingSpoken(f)}. ${FOOTING_DESC[f]}`}
          style={{ paddingVertical: 10, borderBottomWidth: k === FOOTINGS.length - 1 ? 0 : 1, borderBottomColor: c.line }}
        >
          {/* Wraps at large text: the payoff drops under the label, left-aligned. */}
          <View style={[styles.pair, large && styles.pairLarge]}>
            <T v="label" style={styles.shrink}>{PAYOFF[f].label}</T>
            <T v="label" num style={[styles.shrink, !large && styles.right]}>{`${signed(PAYOFF[f].right)} right · ${signed(PAYOFF[f].wrong)} wrong`}</T>
          </View>
          <T v="meta">{FOOTING_DESC[f]}</T>
        </View>
      ))}
      <Gap h={space.sm} />
      <Button kind="secondary" label="Got it" onPress={onDone} />
    </View>
  );
}

/** The route: the game, or a calm "on the way" screen when this exam can't play it. */
export default function SureFootingScreen() {
  return (
    <PlayableGate game="sprint">
      <SureFooting />
    </PlayableGate>
  );
}

function SureFooting() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const { round, restart } = useRound(cert.id, (seed) =>
    buildPracticeQueue(getAllQuestions(cert.id), selectCert(useProgress.getState(), cert.id).answers, SIZE, createRng(seed)),
  );
  const [i, setI] = useState(0);
  const [footing, setFooting] = useState<Footing | null>(null);
  const [pick, setPick] = useState<Letter | null>(null);
  const [results, setResults] = useState<SprintResult[]>([]);
  const [misses, setMisses] = useState<RecapMiss[]>([]);
  // Rules: open on the very first play; afterwards behind the info button.
  const seen = useSettings((s) => s.gameRulesSeen.includes('sprint'));
  const markRulesSeen = useSettings((s) => s.markRulesSeen);
  const [rulesOpen, setRulesOpen] = useState(!seen);
  // True when opened from the info button (not on first play): focus the heading.
  const [rulesFromInfo, setRulesFromInfo] = useState(false);
  const closeRules = () => {
    setRulesOpen(false);
    markRulesSeen('sprint');
  };
  const progress = useProgress.getState();
  // Quiet data (Build C): time from the question appearing to the answer.
  const readClock = useAnswerClock(round[i] ? `${i}:${round[i].q.id}` : undefined);
  const score = sprintScore(results);
  const large = useFontScale() >= LARGE_TEXT;

  if (i >= round.length) {
    const verdict = calibrationVerdict(results);
    return (
      <RoundEnd
        certId={cert.id}
        game="sprint"
        score={score}
        max={maxScore(round.length)}
        misses={misses}
        onAgain={() => {
          restart();
          setI(0);
          setMisses([]);
          setFooting(null);
          setPick(null);
          setResults([]);
        }}
      >
        <T v="headline">How sure you were</T>
        <Gap h={space.sm} />
        {calibration(results).map((b) => (
          <View key={b.footing} style={{ marginBottom: space.md }}>
            <View style={[styles.pair, large && styles.pairLarge]}>
              <T v="label" style={styles.shrink}>{PAYOFF[b.footing].label}</T>
              <T v="meta" num style={[styles.shrink, !large && styles.right]}>{b.accuracy === null ? '—' : `${Math.round(b.accuracy * 100)}% right of ${b.answered}`}</T>
            </View>
            <Gap h={space.xs} />
            <ProgressBar value={b.accuracy ?? 0} color={b.footing === 'sure' ? c.accent : c.ink2} height={6} />
          </View>
        ))}
        <T color={c.ink2}>{VERDICT_COPY[verdict]}</T>
      </RoundEnd>
    );
  }

  const { q, perm } = round[i];
  const letters = LETTERS.slice(0, perm.length);
  const answered = pick !== null;

  const choose = (display: Letter) => {
    if (!footing || answered) return;
    const ok = isCorrect(q, display, perm);
    setPick(display);
    // Answering counts as having seen the rules (they were on screen), so
    // the next play starts without them even if "Got it" was never tapped.
    markRulesSeen('sprint');
    const next = [...results, { questionId: q.id, footing, correct: ok }];
    setResults(next);
    const miss = pickMiss(q, displayToOriginal(display, perm), ok, (t) => renderText(t, perm));
    if (miss) setMisses((m) => [...m, miss]);
    // Guess / Lean / Sure are the practice confidence levels, so spaced
    // review treats a lucky Guess like a lucky guess anywhere else.
    // The footing is kept on the answer record as its confidence (lastConfidence).
    // Game answers never count toward the subtopic mastery date (mastery: false).
    progress.recordAnswer(cert.id, q.id, ok, FOOTING_CONFIDENCE[footing], { ms: readClock(), mastery: false });
    if (!ok) progress.recordMistake(cert.id, q.id, displayToOriginal(display, perm), FOOTING_CONFIDENCE[footing]);
    if (i === round.length - 1) {
      progress.recordGame(cert.id, 'sprint', sprintScore(next));
      logGame(cert.id, 'sprint');
    }
  };

  const stateFor = (d: Letter): OptionState => {
    if (!answered) return 'idle';
    if (displayToOriginal(d, perm) === q.correct) return 'correct';
    return d === pick ? 'wrong' : 'dimmed';
  };
  const ok = answered && isCorrect(q, pick!, perm);
  const gained = answered && footing ? points(footing, ok) : 0;

  return (
    <GameFrame
      title={GAMES.sprint.name}
      index={i}
      total={round.length}
      score={score}
      onInfo={() => {
        if (rulesOpen) closeRules();
        else {
          setRulesFromInfo(true);
          setRulesOpen(true);
        }
      }}
      infoOpen={rulesOpen}
      footer={
        answered ? (
          <Button
            label={i === round.length - 1 ? 'See how sure you were' : 'Next question'}
            onPress={() => {
              setI(i + 1);
              // The rules don't follow the learner to the next question.
              setRulesOpen(false);
              setFooting(null);
              setPick(null);
            }}
          />
        ) : (
          <View>
            <T v="label" center color={footing ? c.accentText : c.ink2}>
              {footing ? 'Now choose your answer' : 'First: how sure are you?'}
            </T>
            <Gap h={space.sm} />
            {/* A radio group (one choice, spoken as "radio, checked"); stacks at large text. */}
            <Segmented
              accessibilityLabel="How sure are you?"
              value={footing}
              onChange={setFooting}
              options={FOOTINGS.map((f) => ({ value: f, label: PAYOFF[f].label, spoken: footingSpoken(f) }))}
            />
            {footing && (
              // The points, once, for the chosen level (they never go on the pill).
              <T v="meta" num center style={{ marginTop: space.xs }}>{footingPayoff(footing)}</T>
            )}
          </View>
        )
      }
    >
      {rulesOpen && <SureFootingRules onDone={closeRules} focus={rulesFromInfo} />}
      <QuestionHead q={q} />
      {letters.map((d) => (
        <OptionCard
          key={d}
          letter={d}
          text={q.options[displayToOriginal(d, perm)] ?? ''}
          state={stateFor(d)}
          disabled={!footing || answered}
          onPress={() => choose(d)}
        />
      ))}
      {answered && footing && (
        <>
          <Gap h={space.sm} />
          <RevealCard
            tone={ok ? 'good' : 'bad'}
            title={
              ok
                ? `${signed(gained)} · ${PAYOFF[footing].label}, and right`
                : `${signed(gained)} · ${PAYOFF[footing].label} · best answer ${originalToDisplay(q.correct, perm)}`
            }
            body={renderText(q.explanation, perm)}
          />
        </>
      )}
    </GameFrame>
  );
}

// Label + value on one line; at large text the row wraps and the value
// sits under the label, left-aligned (spec §10.7 reflow).
const styles = StyleSheet.create({
  pair: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: space.md, rowGap: 2 },
  pairLarge: { flexDirection: 'column', alignItems: 'flex-start' },
  shrink: { flexShrink: 1 },
  right: { textAlign: 'right' },
});
