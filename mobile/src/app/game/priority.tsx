/**
 * Priority Lens — name the word that decides the question, learn what the
 * examiner wants from it, then answer. 5 questions · 2 points each.
 */
import { useMemo, useState } from 'react';
import { GameFrame, QuestionHead, RevealCard, RoundEnd, useRound } from '../../components/game';
import { OptionCard, type OptionState } from '../../components/quiz';
import { Button, Chip, Gap, Row, T } from '../../components/ui';
import { getAllQuestions } from '../../content/loader';
import { LETTERS, type Letter } from '../../content/types';
import {
  buildPriorityRound,
  PRIORITY_MEANING,
  priorityWord,
  wordChoices,
  type PriorityWord,
} from '../../engine/games/priorityLens';
import { createRng } from '../../engine/random';
import { displayToOriginal, isCorrect, originalToDisplay, renderText } from '../../engine/shuffle';
import { logGame } from '../../lib/activity';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZE = 5;

export default function PriorityLens() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const { round, seed, restart } = useRound(cert.id, (seed) => buildPriorityRound(getAllQuestions(cert.id), createRng(seed), SIZE));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [word, setWord] = useState<PriorityWord | null>(null);
  const [pick, setPick] = useState<Letter | null>(null);
  const progress = useProgress.getState();

  const item = round[i];
  const actual = item ? priorityWord(item.q.stem)! : null;
  // Seeded from this round's own seed, so the right word lands in a different chip each time.
  const choices = useMemo(() => (actual ? wordChoices(actual, createRng(seed * 31 + i)) : []), [actual, i, seed]);

  if (!item || !actual) {
    return (
      <RoundEnd
        certId={cert.id}
        game="priority"
        score={score}
        max={round.length * 2}
        onAgain={() => {
          restart();
          setI(0);
          setScore(0);
          setWord(null);
          setPick(null);
        }}
      >
        <T center color={c.ink2}>
          Before reading the options, find the priority word. It tells you which of several true answers the examiner wants.
        </T>
      </RoundEnd>
    );
  }

  const { q, perm } = item;
  const letters = LETTERS.slice(0, perm.length);
  const answered = pick !== null;
  const wordRight = word === actual;

  const choose = (d: Letter) => {
    if (!word || answered) return;
    const ok = isCorrect(q, d, perm);
    setPick(d);
    const gained = (wordRight ? 1 : 0) + (ok ? 1 : 0);
    setScore((s) => s + gained);
    progress.recordAnswer(cert.id, q.id, ok);
    if (!ok) progress.recordMistake(cert.id, q.id, displayToOriginal(d, perm));
    if (i === round.length - 1) {
      progress.recordGame(cert.id, 'priority', score + gained);
      logGame(cert.id, 'priority');
    }
  };

  const stateFor = (d: Letter): OptionState => {
    if (!answered) return 'idle';
    if (displayToOriginal(d, perm) === q.correct) return 'correct';
    return d === pick ? 'wrong' : 'dimmed';
  };

  return (
    <GameFrame
      title="Priority Lens"
      index={i}
      total={round.length}
      score={score}
      footer={
        answered ? (
          <Button
            label={i === round.length - 1 ? 'See results' : 'Next question'}
            onPress={() => {
              setI(i + 1);
              setWord(null);
              setPick(null);
            }}
          />
        ) : !word ? (
          <>
            <T v="label" center color={c.ink2}>Step 1: which word decides this?</T>
            <Row gap={space.sm} style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              {choices.map((w) => (
                <Chip key={w} label={w} selected={false} onPress={() => setWord(w)} />
              ))}
            </Row>
          </>
        ) : (
          <T v="label" center color={c.accentText}>Step 2: answer with that lens</T>
        )
      }
    >
      <QuestionHead q={q} />
      {word && (
        <>
          <RevealCard
            tone={wordRight ? 'good' : 'bad'}
            title={wordRight ? `${actual}: that’s the lens` : `It’s ${actual}, not ${word}`}
            body={PRIORITY_MEANING[actual]}
          />
          <Gap h={space.md} />
        </>
      )}
      {word &&
        letters.map((d) => (
          <OptionCard
            key={d}
            letter={d}
            text={q.options[displayToOriginal(d, perm)] ?? ''}
            state={stateFor(d)}
            disabled={answered}
            onPress={() => choose(d)}
          />
        ))}
      {answered && (
        <>
          <Gap h={space.sm} />
          <RevealCard
            tone={isCorrect(q, pick!, perm) ? 'good' : 'bad'}
            title={isCorrect(q, pick!, perm) ? 'Correct' : `Best answer: ${originalToDisplay(q.correct, perm)}`}
            body={renderText(q.explanation, perm)}
          />
        </>
      )}
    </GameFrame>
  );
}
