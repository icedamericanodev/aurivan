/**
 * Snare Spotter (id `trap`) — tap the snare first, then the best answer.
 * 5 questions · 2 points each (spot the snare, then get it right).
 * If the learner taps the BEST answer as the snare, the screen says so at
 * once and they carry on: the best answer is never closed in step 2.
 *
 * Grove Phase 4b (design-notes/grove/phase4b/PHASE4B.md section 6): the twig in the header, the two
 * steps as step squares (the engine's words), the Seedling hint for the first two rounds, and after the
 * answer the drill's answer screen (components/drillAnswer.tsx) with its two-half line. The twig leaf
 * fills only when both halves are earned, so the twig, the verdict and "What caught you" agree.
 */
import { useState } from 'react';
import { DrillAnswer } from '../../components/drillAnswer';
import { seedlingHintDue, SNARE_HINT, StepSquares, type ItemResult } from '../../components/drillKit';
import { GameFrame, PlayableGate, QuestionHead, RevealCard, RoundEnd, useRound } from '../../components/game';
import { OptionCard, type OptionState } from '../../components/quiz';
import { Button, Gap, T } from '../../components/ui';
import { getAllQuestions, siblingGroupOf } from '../../content/loader';
import { relaxedMark } from '../../engine/siblings';
import { LETTERS, type Letter } from '../../content/types';
import { buildTrapRound, closedInStep2, scoreTrapPick, snareStep, snareWhy, trapLetter } from '../../engine/games/trapSpotter';
import { createRng } from '../../engine/random';
import { displayToOriginal, originalToDisplay, renderText } from '../../engine/shuffle';
import { snareMiss, type RecapMiss } from '../../engine/games/recap';
import { GAMES } from '../../engine/games/registry';
import { missCoach, snareVerdict } from '../../lib/drillVerdict';
import { finishGameRound, startingTier, type RoundNews } from '../../lib/gameRounds';
import { batchSaves } from '../../store/storage';
import { useAnswerClock } from '../../lib/useAnswerClock';
import { useActiveCert } from '../../lib/useActiveCert';
import { selectCert, useProgress } from '../../store/progress';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZE = GAMES.trap.size;
/** The engine's step words, word for word (PHASE4B 3.4). */
const STEP_1 = 'Step 1: tap the snare';
const STEP_2 = 'Step 2: tap the BEST answer';

/** The route: the game, or a calm "on the way" screen when this exam can't play it. */
export default function TrapSpotterScreen() {
  return (
    <PlayableGate game="trap">
      <TrapSpotter />
    </PlayableGate>
  );
}

/** Rounds of Snare Spotter already finished (its saved recent scores), for the Seedling hint. */
const roundsPlayed = (certId: string) => selectCert(useProgress.getState(), certId).gameRecent?.trap?.length ?? 0;

function TrapSpotter() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const { round, restart } = useRound(cert.id, (seed) => buildTrapRound(getAllQuestions(cert.id), createRng(seed), SIZE, siblingGroupOf(cert.id)));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [trapPick, setTrapPick] = useState<Letter | null>(null); // DISPLAY letters
  const [answerPick, setAnswerPick] = useState<Letter | null>(null);
  const [misses, setMisses] = useState<RecapMiss[]>([]);
  // Build F: each snare spotted (the skill step), and what the round end shows.
  const [hits, setHits] = useState<boolean[]>([]);
  // Grove 4b: each item for the twig (right only when both halves were earned).
  const [items, setItems] = useState<ItemResult[]>([]);
  const [news, setNews] = useState<RoundNews | null>(null);
  // The Seedling hint (PHASE4B 6.3 item 6): the first two rounds at Seedling, decided as the round starts.
  const [hint, setHint] = useState(() => seedlingHintDue(startingTier(cert.id, 'trap'), roundsPlayed(cert.id)));
  const progress = useProgress.getState();
  // Quiet data (Build C): time from the question appearing to the final answer.
  const readClock = useAnswerClock(round[i] ? `${i}:${round[i].q.id}` : undefined);

  if (i >= round.length) {
    const spotted = hits.filter(Boolean).length;
    return (
      <RoundEnd
        certId={cert.id}
        game="trap"
        score={score}
        max={round.length * 2}
        misses={misses}
        news={news}
        results={items}
        roundLine={`This round: ${spotted} of ${round.length} snares spotted`}
        onAgain={() => {
          restart();
          setI(0);
          setScore(0);
          setMisses([]);
          setHits([]);
          setItems([]);
          setNews(null);
          setTrapPick(null);
          setAnswerPick(null);
          setHint(seedlingHintDue(startingTier(cert.id, 'trap'), roundsPlayed(cert.id)));
        }}
      >
        <T v="aside" color={c.ink2}>
          Most wrong answers on the real exam are true statements that are not the BEST response. Naming the snare is half the work.
        </T>
      </RoundEnd>
    );
  }

  const { q, perm } = round[i];
  const letters = LETTERS.slice(0, perm.length);
  const trapOriginal = trapLetter(q)!;
  const revealed = answerPick !== null;
  const phase = trapPick === null ? 'trap' : !revealed ? 'answer' : 'reveal';
  // What the step-1 tap was. 'key' = the learner tapped the BEST answer as the
  // snare: say so at once and carry on (it used to be disabled in step 2,
  // which made the question impossible and scored 0 with no explanation).
  const step = trapPick ? snareStep(q, displayToOriginal(trapPick, perm)) : null;
  const closed = trapPick ? closedInStep2(q, displayToOriginal(trapPick, perm)) : [];

  const pick = (display: Letter) => {
    if (phase === 'trap') {
      setTrapPick(display);
      return;
    }
    if (phase === 'answer') {
      // One save per tap (store/storage.ts batchSaves): the answer, a miss and, on the last one, the round's end
      // used to save the whole progress file up to 7 times (release bug hunt round 3).
      batchSaves(() => {
        setAnswerPick(display);
        const result = scoreTrapPick(q, displayToOriginal(trapPick!, perm), displayToOriginal(display, perm));
        setScore((s) => s + result.points);
        const miss = snareMiss(q, result.spotted, result.correct, (t) => renderText(t, perm));
        if (miss) setMisses((m) => [...m, miss]);
        // Once we've said which option is best, a right answer is assisted
        // (half credit in readiness, no box promotion), like Coach me.
        // Game answers never count toward the subtopic mastery date (mastery: false).
        // Sibling groups: a sibling back in the round after its partner is marked (engine/siblings.ts).
        const sibling = relaxedMark(round.map((x) => x.q.id), q.id, siblingGroupOf(cert.id));
        progress.recordAnswer(cert.id, q.id, result.correct, undefined, { assisted: step === 'key', ms: readClock(), mastery: false, ...sibling });
        if (!result.correct) progress.recordMistake(cert.id, q.id, displayToOriginal(display, perm));
        const nextHits = [...hits, result.spotted];
        setHits(nextHits);
        // Both halves (2 points) fill the twig's leaf; anything less is a missed leaf (never red).
        setItems((it) => [...it, result.points === 2 ? 'right' : 'missed']);
        if (i === round.length - 1) {
          // Snare Spotter has no level picker: the round counts at the learner's level.
          setNews(
            finishGameRound(cert.id, 'trap', {
              score: score + result.points,
              rate: nextHits.filter(Boolean).length / round.length,
              tier: startingTier(cert.id, 'trap'),
              hits: nextHits,
            }),
          );
        }
      });
    }
  };

  // Step 2: the snare the learner named is closed (dimmed); the best answer never is.
  const stateFor = (display: Letter): OptionState => {
    if (phase === 'trap') return 'idle';
    return closed.includes(displayToOriginal(display, perm)) ? 'dimmed' : 'idle';
  };

  const result = revealed ? scoreTrapPick(q, displayToOriginal(trapPick!, perm), displayToOriginal(answerPick!, perm)) : null;
  const snare = originalToDisplay(trapOriginal, perm);
  const best = originalToDisplay(q.correct, perm);

  return (
    <GameFrame
      game="trap"
      index={i}
      total={round.length}
      score={score}
      results={items}
      footer={
        phase === 'reveal' ? (
          <Button
            label={i === round.length - 1 ? 'See results' : 'Next question'}
            onPress={() => {
              setI(i + 1);
              setTrapPick(null);
              setAnswerPick(null);
            }}
          />
        ) : undefined
      }
    >
      {result && answerPick && trapPick ? (
        <DrillAnswer
          q={q}
          perm={perm}
          pick={answerPick}
          animate={result.points === 2}
          snare={{ letter: snare, why: snareWhy(q) }}
          {...snareVerdict({
            spotted: result.spotted,
            correct: result.correct,
            revealed: step === 'key',
            snare,
            best,
            tapped: trapPick,
            missCoach: missCoach(q, displayToOriginal(answerPick, perm), perm),
          })}
        />
      ) : (
        <>
          {/* The two steps, the engine's words (PHASE4B 6.3 item 5). A done step carries its result. */}
          <StepSquares
            steps={[
              { label: STEP_1, state: phase === 'trap' ? 'now' : 'done', result: trapPick ? `You marked ${trapPick}` : undefined },
              { label: STEP_2, state: phase === 'answer' ? 'now' : 'later' },
            ]}
          />
          {hint && phase === 'trap' && <T v="meta" style={{ marginBottom: space.md }}>{SNARE_HINT}</T>}
          <QuestionHead q={q} />
          {phase === 'answer' && step === 'key' && (
            <>
              <RevealCard
                tone="info"
                title="That’s the best answer, not the snare"
                body={`You picked ${trapPick}, the best one. A snare is a wrong option built to look right, the one that almost beats the best answer. Tap ${trapPick} as your answer to carry on.`}
              />
              <Gap h={space.md} />
            </>
          )}
          {letters.map((d) => (
            <OptionCard
              key={d}
              letter={d}
              text={q.options[displayToOriginal(d, perm)] ?? ''}
              state={stateFor(d)}
              disabled={phase === 'answer' && closed.includes(displayToOriginal(d, perm))}
              onPress={() => pick(d)}
            />
          ))}
        </>
      )}
    </GameFrame>
  );
}
