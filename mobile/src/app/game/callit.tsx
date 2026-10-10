/**
 * Call It First (id `callit`) — "Name the principle before you see the
 * options." Engine and rules: engine/games/callItFirst.ts.
 *
 * 1. Pick a level: Seedling (decoys from other topics), Sapling (near-topic
 *    decoys), Heartwood (no cards: a 10-second think, options hidden).
 * 2. Five questions. Step 1: the stem only, and 3 principle cards (Heartwood:
 *    the think pause). Step 2: the options appear; answer as usual.
 *    "Show a hint" (the question's pre-read line) is optional, and makes the
 *    answer count as assisted (half credit in readiness, like Coach me).
 * 3. The shared recap. Wrong answers go to review; a wrong principle pick
 *    adds no mistake tag. Game answers never count toward mastery dates.
 * Grading compares ORIGINAL letters (engine/shuffle.ts).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { GameFrame, GameIntro, PlayableGate, QuestionHead, RevealCard, RoundEnd } from '../../components/game';
import { EyeOff, ICON_STROKE, Lightbulb } from '../../components/icons';
import { OptionCard, type OptionState } from '../../components/quiz';
import { Button, Gap, ICON_SIZE, Row, T } from '../../components/ui';
import { findQuestion, getAllQuestions } from '../../content/loader';
import { LETTERS, type Letter } from '../../content/types';
import {
  answerOptions,
  buildCallRound,
  CALL_TIER_LINE,
  CALL_TIER_NAME,
  CALL_TIERS,
  callMax,
  callPoints,
  THINK_MS,
  type CallItem,
  type CallTier,
} from '../../engine/games/callItFirst';
import { clip, firstSentence, type RecapMiss } from '../../engine/games/recap';
import { GAMES } from '../../engine/games/registry';
import { createRng } from '../../engine/random';
import { displayToOriginal, isCorrect, makePermutation, originalToDisplay, renderText, type Permutation } from '../../engine/shuffle';
import { moveFocus } from '../../lib/a11y';
import { finishGameRound, startingTier, type RoundNews } from '../../lib/gameRounds';
import { certOutline } from '../../lib/outline';
import { useAnswerClock } from '../../lib/useAnswerClock';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function CallItFirstScreen() {
  return (
    <PlayableGate game="callit">
      <CallItFirst />
    </PlayableGate>
  );
}

type Phase = 'principle' | 'think' | 'answer' | 'reveal';

function CallItFirst() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const bank = useMemo(() => getAllQuestions(cert.id), [cert.id]);
  // Build F: the picker starts on the learner's own level for this game.
  const [tier, setTier] = useState<CallTier>(() => startingTier(cert.id, 'callit'));
  const [news, setNews] = useState<RoundNews | null>(null);
  // The skill step per question: the principle named (Heartwood: the answer itself).
  const [steps, setSteps] = useState<boolean[]>([]);
  // The round keeps the level it is played at, so a level change at its end never changes it mid-screen (code review).
  const [round, setRound] = useState<{ items: CallItem[]; perms: Record<string, Permutation>; seed: number; tier: CallTier } | null>(null);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('principle');
  const [cardPick, setCardPick] = useState<number | null>(null);
  const [answer, setAnswer] = useState<Letter | null>(null); // DISPLAY letter
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState<RecapMiss[]>([]);
  const [thinkLeft, setThinkLeft] = useState(0);
  const thinkRef = useRef<View>(null);
  // Where the options start in the scroll (step 2 scrolls them into view).
  const [optionsY, setOptionsY] = useState<number | null>(null);

  const item = round?.items[i];
  const q = item ? findQuestion(cert.id, item.id) : undefined;
  const perm = item && round ? round.perms[item.id] : undefined;
  // Time to answer (Build C quiet data). Held during step 1 and the think
  // pause: only the time with the options on screen counts (code review).
  const readClock = useAnswerClock(round && item ? `${round.seed}:${i}:${item.id}` : undefined, phase === 'principle' || phase === 'think');

  // Heartwood: a 10-second think with the options hidden, counted down in whole seconds.
  useEffect(() => {
    if (phase !== 'think') return;
    // The options are hidden: put screen-reader focus on the pause card, so
    // the learner hears why nothing can be picked yet (UX review O4).
    moveFocus(thinkRef);
    const until = Date.now() + THINK_MS;
    const t = setInterval(() => {
      const left = until - Date.now();
      if (left <= 0) {
        clearInterval(t);
        setPhase('answer');
        AccessibilityInfo.announceForAccessibility('The options are ready.');
      } else setThinkLeft(Math.ceil(left / 1000));
    }, 250);
    return () => clearInterval(t);
  }, [phase, i]);

  // The seed comes from the tap (an event), so render stays pure.
  const start = (seed: number) => {
    const rng = createRng(seed);
    const ctx = { all: bank.filter((x) => x.keyConcept), topicOf: certOutline(cert.id).topicOf };
    const items = buildCallRound(bank, ctx, tier, rng);
    const perms: Record<string, Permutation> = {};
    for (const it of items) {
      const qq = findQuestion(cert.id, it.id);
      if (qq) perms[it.id] = makePermutation(qq, rng);
    }
    setRound({ items, perms, seed, tier });
    setI(0);
    setScore(0);
    setMisses([]);
    setNews(null);
    setSteps([]);
    resetItem(tier);
  };
  const resetItem = (t: CallTier) => {
    setPhase(t === 'heartwood' ? 'think' : 'principle');
    setThinkLeft(Math.ceil(THINK_MS / 1000));
    setCardPick(null);
    setAnswer(null);
    setHint(false);
    setOptionsY(null);
  };

  if (!round) {
    return (
      <GameIntro
        game="callit"
        icon={(col) => <EyeOff size={48} color={col} strokeWidth={1.5} />}
        rules="Five questions with the options hidden. First name the principle the question tests, then the options appear and you answer. Forming your own answer first is the best defence against tempting distractors."
        tiers={CALL_TIERS}
        tier={tier}
        onTier={setTier}
        tierName={CALL_TIER_NAME}
        tierLine={CALL_TIER_LINE}
        level={startingTier(cert.id, 'callit')}
        onStart={() => start(Date.now())}
      />
    );
  }

  if (i >= round.items.length || !item || !q || !perm) {
    return (
      <RoundEnd certId={cert.id} game="callit" score={score} max={callMax(round.tier, round.items.length)} misses={misses} onAgain={() => start(Date.now())} news={news}>
        <T color={c.ink2}>
          On exam day, read the stem, name the principle in your head, then look for the option that matches it. The options are written to pull you off course.
        </T>
        <Gap h={space.md} />
      </RoundEnd>
    );
  }

  const letters = LETTERS.slice(0, perm.length);
  const principleRight = cardPick !== null && cardPick === item.correct;

  const pickCard = (k: number) => {
    if (phase !== 'principle') return;
    setCardPick(k);
    setPhase('answer');
    AccessibilityInfo.announceForAccessibility(k === item.correct ? 'Principle named. The options are shown.' : 'Not that one. The principle is marked; the options are shown.');
  };

  const pickAnswer = (display: Letter) => {
    if (phase !== 'answer') return;
    const ok = isCorrect(q, display, perm);
    setAnswer(display);
    setPhase('reveal');
    const pts = callPoints(round.tier, principleRight, ok);
    setScore((s) => s + pts);
    const p = useProgress.getState();
    // A hint (the pre-read line) makes the answer assisted; never a mastery date.
    p.recordAnswer(cert.id, q.id, ok, undefined, answerOptions(hint, readClock()));
    if (!ok) p.recordMistake(cert.id, q.id, displayToOriginal(display, perm));
    const principleMissed = round.tier !== 'heartwood' && !principleRight;
    if (!ok || principleMissed) {
      setMisses((m) => [
        ...m,
        {
          questionId: q.id,
          stem: clip(q.stem),
          tag: `Principle: ${clip(q.keyConcept ?? '', 70)}`,
          why: firstSentence(renderText(q.explanation, perm)),
          answerWrong: !ok,
        },
      ]);
    }
    const nextSteps = [...steps, round.tier === 'heartwood' ? ok : principleRight];
    setSteps(nextSteps);
    if (i === round.items.length - 1) {
      const news = finishGameRound(cert.id, 'callit', {
        score: score + pts,
        rate: nextSteps.filter(Boolean).length / round.items.length,
        tier: round.tier,
        hits: nextSteps,
      });
      setNews(news);
      // The level moved: "Play again" starts on the new level, not the old one.
      if (news.change) setTier(news.tier);
    }
  };

  const cardState = (k: number): OptionState => {
    if (cardPick === null) return 'idle';
    if (k === item.correct) return 'correct';
    return k === cardPick ? 'wrong' : 'dimmed';
  };
  const answerState = (display: Letter): OptionState => {
    if (phase !== 'reveal') return 'idle';
    if (displayToOriginal(display, perm) === q.correct) return 'correct';
    return display === answer ? 'wrong' : 'dimmed';
  };
  const answerRight = answer !== null && isCorrect(q, answer, perm);

  return (
    <GameFrame
      title={GAMES.callit.name}
      index={i}
      total={round.items.length}
      score={score}
      // Step 2: the options appear below the cards; bring them into view.
      scrollToY={phase === 'answer' ? optionsY : null}
      footer={
        phase === 'reveal' ? (
          <Button
            label={i === round.items.length - 1 ? 'See results' : 'Next question'}
            onPress={() => {
              setI(i + 1);
              resetItem(round.tier);
            }}
          />
        ) : (
          <T v="label" center color={c.accentText}>
            {phase === 'principle' ? 'Step 1: which principle does it test?' : phase === 'think' ? 'Think: what principle decides this?' : 'Step 2: pick the BEST answer'}
          </T>
        )
      }
    >
      <QuestionHead q={q} />

      {/* The optional hint: the question's pre-read line. Using it counts the answer as assisted. */}
      {q.preRead && phase !== 'reveal' && (
        hint ? (
          <View style={{ borderLeftWidth: 3, borderLeftColor: c.tip, paddingLeft: space.md, marginBottom: space.lg }}>
            <T v="small">{renderText(q.preRead, perm)}</T>
            <T v="meta" style={{ marginTop: space.xs }}>Assisted. Counts half toward readiness.</T>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show a hint"
            accessibilityHint="Shows a reading hint. Your answer then counts half toward readiness."
            onPress={() => setHint(true)}
            style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.7 : 1, marginBottom: space.sm })}
          >
            <Row gap={space.xs} style={{ flexWrap: 'wrap' }}>
              <Lightbulb size={ICON_SIZE.inline} color={c.accentText} strokeWidth={ICON_STROKE} />
              <T v="label" color={c.accentText}>Show a hint</T>
              <T v="meta">A hint counts half.</T>
            </Row>
          </Pressable>
        )
      )}

      {phase === 'think' && (
        <View
          ref={thinkRef}
          accessible
          accessibilityLabel={`Options hidden. Think about the principle. ${thinkLeft} seconds.`}
          style={{ backgroundColor: c.soft, borderRadius: radius.md, padding: space.lg, alignItems: 'center' }}
        >
          <EyeOff size={ICON_SIZE.bar} color={c.accentText} strokeWidth={ICON_STROKE} />
          <T v="headline" center style={{ marginTop: space.sm }}>Options hidden</T>
          <T v="small" center color={c.ink2} style={{ marginTop: space.xs }}>Name the principle in your own words first.</T>
          <T v="meta" num center style={{ marginTop: space.sm }}>{`Options in ${thinkLeft} s`}</T>
        </View>
      )}

      {/* Step 1: the three principle cards (they stay, marked, once picked). */}
      {round.tier !== 'heartwood' && (
        <View accessibilityRole="radiogroup" accessibilityLabel="Which principle does it test?">
          {/* Not "The principle": the card's own tag already says it (UX review P6). */}
          {phase !== 'principle' && <T v="caption" style={{ marginBottom: space.xs }}>Step 1 · your call</T>}
          {item.cards.map((text, k) =>
            phase === 'principle' ? (
              <OptionCard key={k} letter={LETTERS[k]} text={text} state="idle" onPress={() => pickCard(k)} />
            ) : k === item.correct || k === cardPick ? (
              <OptionCard
                key={k}
                letter={LETTERS[k]}
                text={text}
                state={cardState(k)}
                tag={k === item.correct ? 'The principle' : 'Your pick'}
                // A principle card is not the answer: never "best answer" (UX review P5).
                spokenSuffix={k === item.correct ? (k === cardPick ? ', your pick, the principle' : ', the principle') : ', your pick, not the principle'}
              />
            ) : null,
          )}
        </View>
      )}

      {/* Step 2: the options appear. */}
      {(phase === 'answer' || phase === 'reveal') && (
        <View style={{ marginTop: space.lg }} onLayout={(e) => setOptionsY(e.nativeEvent.layout.y)}>
          {round.tier !== 'heartwood' && (
            <T v="caption" color={principleRight ? c.correct : c.accentText} style={{ marginBottom: space.sm }}>
              {principleRight ? 'Principle named. Now find the option that matches it.' : 'The principle is marked above. Now find the option that matches it.'}
            </T>
          )}
          <View accessibilityRole="radiogroup" accessibilityLabel="Answer options">
            {letters.map((d) => (
              <OptionCard
                key={d}
                letter={d}
                text={q.options[displayToOriginal(d, perm)] ?? ''}
                state={answerState(d)}
                disabled={phase === 'reveal'}
                onPress={() => pickAnswer(d)}
              />
            ))}
          </View>
        </View>
      )}

      {phase === 'reveal' && (
        <>
          <Gap h={space.sm} />
          <RevealCard
            tone={answerRight ? 'good' : 'bad'}
            title={answerRight ? `Best answer: correct${hint ? ' (assisted)' : ''}` : `Best answer: ${originalToDisplay(q.correct, perm)}`}
            body={renderText(q.explanation, perm)}
          />
        </>
      )}
    </GameFrame>
  );
}
