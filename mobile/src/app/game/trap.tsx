/**
 * Trap Spotter — tap the trap first, then the best answer.
 * 5 questions · 2 points each (spot the trap, then get it right).
 */
import { useState } from 'react';
import { GameFrame, QuestionHead, RevealCard, RoundEnd, useRound } from '../../components/game';
import { OptionCard, type OptionState } from '../../components/quiz';
import { Button, Gap, T } from '../../components/ui';
import { getAllQuestions } from '../../content/loader';
import { LETTERS, type Letter } from '../../content/types';
import { buildTrapRound, scoreTrapPick, trapLetter, trapTip } from '../../engine/games/trapSpotter';
import { createRng } from '../../engine/random';
import { displayToOriginal, originalToDisplay, renderText } from '../../engine/shuffle';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZE = 5;

export default function TrapSpotter() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const { round, restart } = useRound(cert.id, (seed) => buildTrapRound(getAllQuestions(cert.id), createRng(seed), SIZE));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [trapPick, setTrapPick] = useState<Letter | null>(null); // DISPLAY letters
  const [answerPick, setAnswerPick] = useState<Letter | null>(null);
  const progress = useProgress.getState();

  if (i >= round.length) {
    return (
      <RoundEnd
        certId={cert.id}
        game="trap"
        score={score}
        max={round.length * 2}
        onAgain={() => {
          restart();
          setI(0);
          setScore(0);
          setTrapPick(null);
          setAnswerPick(null);
        }}
      >
        <T center color={c.text2}>
          Most wrong answers on the real exam are true statements that are not the BEST response. Naming the trap is half the work.
        </T>
      </RoundEnd>
    );
  }

  const { q, perm } = round[i];
  const letters = LETTERS.slice(0, perm.length);
  const trapOriginal = trapLetter(q)!;
  const revealed = answerPick !== null;
  const phase = trapPick === null ? 'trap' : !revealed ? 'answer' : 'reveal';

  const pick = (display: Letter) => {
    if (phase === 'trap') {
      setTrapPick(display);
      return;
    }
    if (phase === 'answer') {
      setAnswerPick(display);
      const result = scoreTrapPick(q, displayToOriginal(trapPick!, perm), displayToOriginal(display, perm));
      setScore((s) => s + result.points);
      progress.recordAnswer(cert.id, q.id, result.correct);
      if (!result.correct) progress.recordMistake(cert.id, q.id, displayToOriginal(display, perm));
      if (i === round.length - 1) progress.recordGame(cert.id, 'trap', score + result.points);
    }
  };

  const stateFor = (display: Letter): OptionState => {
    const orig = displayToOriginal(display, perm);
    if (phase === 'reveal') {
      if (orig === q.correct) return 'correct';
      if (orig === trapOriginal) return 'wrong';
      return 'dimmed';
    }
    if (phase === 'trap') return 'idle';
    return display === trapPick ? 'dimmed' : 'idle';
  };

  const result = revealed
    ? scoreTrapPick(q, displayToOriginal(trapPick!, perm), displayToOriginal(answerPick!, perm))
    : null;

  return (
    <GameFrame
      title="Trap Spotter"
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
          <T v="label" center color={phase === 'trap' ? c.warning : c.accentText}>
            {phase === 'trap' ? 'Step 1: tap the trap' : 'Step 2: tap the BEST answer'}
          </T>
        )
      }
    >
      <QuestionHead q={q} />
      {letters.map((d) => (
        <OptionCard
          key={d}
          letter={d}
          text={q.options[displayToOriginal(d, perm)] ?? ''}
          state={stateFor(d)}
          disabled={phase === 'reveal' || (phase === 'answer' && d === trapPick)}
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
                ? `Trap spotted: ${originalToDisplay(trapOriginal, perm)}`
                : `The trap was ${originalToDisplay(trapOriginal, perm)}, not ${trapPick}`
            }
            body={renderText(trapTip(q), perm)}
          />
          <Gap h={space.sm} />
          <RevealCard
            tone={result.correct ? 'good' : 'bad'}
            title={result.correct ? 'Best answer: correct' : `Best answer: ${originalToDisplay(q.correct, perm)}`}
            body={renderText(q.explanation, perm)}
          />
        </>
      )}
    </GameFrame>
  );
}
