/**
 * Snare Spotter (id `trap`) — tap the snare first, then the best answer.
 * 5 questions · 2 points each (spot the snare, then get it right).
 * If the learner taps the BEST answer as the snare, the screen says so at
 * once and they carry on: the best answer is never closed in step 2.
 */
import { useState } from 'react';
import { GameFrame, PlayableGate, QuestionHead, RevealCard, RoundEnd, useRound } from '../../components/game';
import { OptionCard, type OptionState } from '../../components/quiz';
import { Button, Gap, T } from '../../components/ui';
import { getAllQuestions } from '../../content/loader';
import { LETTERS, type Letter } from '../../content/types';
import { buildTrapRound, closedInStep2, scoreTrapPick, snareStep, snareWhy, trapLetter, trapTip } from '../../engine/games/trapSpotter';
import { createRng } from '../../engine/random';
import { displayToOriginal, originalToDisplay, renderText } from '../../engine/shuffle';
import { snareMiss, type RecapMiss } from '../../engine/games/recap';
import { GAMES } from '../../engine/games/registry';
import { logGame } from '../../lib/activity';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZE = GAMES.trap.size;

/** The route: the game, or a calm "on the way" screen when this exam can't play it. */
export default function TrapSpotterScreen() {
  return (
    <PlayableGate game="trap">
      <TrapSpotter />
    </PlayableGate>
  );
}

function TrapSpotter() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const { round, restart } = useRound(cert.id, (seed) => buildTrapRound(getAllQuestions(cert.id), createRng(seed), SIZE));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [trapPick, setTrapPick] = useState<Letter | null>(null); // DISPLAY letters
  const [answerPick, setAnswerPick] = useState<Letter | null>(null);
  const [misses, setMisses] = useState<RecapMiss[]>([]);
  const progress = useProgress.getState();

  if (i >= round.length) {
    return (
      <RoundEnd
        certId={cert.id}
        game="trap"
        score={score}
        max={round.length * 2}
        misses={misses}
        onAgain={() => {
          restart();
          setI(0);
          setScore(0);
          setMisses([]);
          setTrapPick(null);
          setAnswerPick(null);
        }}
      >
        <T center color={c.ink2}>
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
      setAnswerPick(display);
      const result = scoreTrapPick(q, displayToOriginal(trapPick!, perm), displayToOriginal(display, perm));
      setScore((s) => s + result.points);
      const miss = snareMiss(q, result.spotted, result.correct, (t) => renderText(t, perm));
      if (miss) setMisses((m) => [...m, miss]);
      // Once we've said which option is best, a right answer is assisted
      // (half credit in readiness, no box promotion), like Coach me.
      progress.recordAnswer(cert.id, q.id, result.correct, undefined, step === 'key' ? { assisted: true } : undefined);
      if (!result.correct) progress.recordMistake(cert.id, q.id, displayToOriginal(display, perm));
      if (i === round.length - 1) {
        progress.recordGame(cert.id, 'trap', score + result.points);
        logGame(cert.id, 'trap');
      }
    }
  };

  // Reveal: the best answer ✓, the learner's own wrong pick ✗, and the real
  // snare TAGGED "Snare" in the tip tone (not a red ✗: it wasn't their answer).
  const stateFor = (display: Letter): OptionState => {
    const orig = displayToOriginal(display, perm);
    if (phase === 'reveal') {
      if (orig === q.correct) return 'correct';
      if (display === answerPick) return 'wrong';
      return 'dimmed';
    }
    if (phase === 'trap') return 'idle';
    return closed.includes(orig) ? 'dimmed' : 'idle';
  };

  const tagFor = (display: Letter): { tag?: string; tagTone?: 'tip' } => {
    if (phase !== 'reveal') return {};
    const orig = displayToOriginal(display, perm);
    const mine = display === answerPick && orig !== q.correct;
    if (orig === trapOriginal) return { tag: mine ? 'Snare · your answer' : 'Snare', tagTone: 'tip' };
    if (mine) return { tag: 'Your answer' };
    if (orig === q.correct) return { tag: 'Best answer' };
    return {};
  };

  const result = revealed
    ? scoreTrapPick(q, displayToOriginal(trapPick!, perm), displayToOriginal(answerPick!, perm))
    : null;

  return (
    <GameFrame
      title={GAMES.trap.name}
      index={i}
      total={round.length}
      score={score}
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
        ) : (
          <T v="label" center color={phase === 'trap' ? c.tip : c.accentText}>
            {phase === 'trap' ? 'Step 1: tap the snare' : 'Step 2: tap the BEST answer'}
          </T>
        )
      }
    >
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
          {...tagFor(d)}
          disabled={phase === 'reveal' || (phase === 'answer' && closed.includes(displayToOriginal(d, perm)))}
          onPress={() => pick(d)}
        />
      ))}
      {result && (
        <>
          <Gap h={space.sm} />
          <RevealCard
            tone={result.spotted ? 'good' : 'bad'}
            title={
              result.spotted
                ? `Snare spotted: ${originalToDisplay(trapOriginal, perm)}`
                : `The snare was ${originalToDisplay(trapOriginal, perm)}, not ${trapPick}`
            }
            // Snare-specific first: why THIS option loses, then the Final two line.
            body={renderText(snareWhy(q) === trapTip(q) ? trapTip(q) : `${snareWhy(q)}\n\n${trapTip(q)}`, perm)}
          />
          <Gap h={space.sm} />
          <RevealCard
            tone={result.correct ? 'good' : 'bad'}
            title={
              step === 'key'
                ? `Best answer: ${originalToDisplay(q.correct, perm)} (shown above)`
                : result.correct
                  ? 'Best answer: correct'
                  : `Best answer: ${originalToDisplay(q.correct, perm)}`
            }
            body={renderText(q.explanation, perm)}
          />
        </>
      )}
    </GameFrame>
  );
}
