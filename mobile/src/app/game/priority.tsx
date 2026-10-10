/**
 * Signpost (id `priority`) — say what the deciding word asks for, then
 * answer. 5 questions · 2 points each (1 for reading it right, 1 for the answer).
 *
 * Step 1 offers four MEANINGS ("the step that must come first", "the
 * strongest effect"…), never the words themselves: the word is printed in
 * capitals, so picking the word was solved by spotting the capitals. Once a
 * meaning is chosen, the word is marked in the stem (engine/games/priorityLens.ts).
 */
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { GameFrame, QuestionHead, RevealCard, RoundEnd, useRound } from '../../components/game';
import { OptionCard, type OptionState } from '../../components/quiz';
import { Button, Gap, T } from '../../components/ui';
import { getAllQuestions } from '../../content/loader';
import { LETTERS, type Letter } from '../../content/types';
import { acceptedAsks, ASK_LABEL, askChoices, buildPriorityRound, meaningFor, priorityWord, type Ask } from '../../engine/games/priorityLens';
import { signpostMiss, type RecapMiss } from '../../engine/games/recap';
import { GAMES } from '../../engine/games/registry';
import { createRng } from '../../engine/random';
import { displayToOriginal, isCorrect, originalToDisplay, renderText } from '../../engine/shuffle';
import { logGame } from '../../lib/activity';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZE = GAMES.priority.size;

export default function Signpost() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const { round, seed, restart } = useRound(cert.id, (seed) => buildPriorityRound(getAllQuestions(cert.id), createRng(seed), SIZE));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [pick, setPick] = useState<Letter | null>(null);
  const [misses, setMisses] = useState<RecapMiss[]>([]);
  const progress = useProgress.getState();

  const item = round[i];
  const actual = item ? priorityWord(item.q.stem)! : null;
  // Seeded from this round's own seed, so the right meaning moves around.
  const choices = useMemo(() => askChoices(createRng(seed * 31 + i)), [i, seed]);

  if (!item || !actual) {
    return (
      <RoundEnd
        certId={cert.id}
        game="priority"
        score={score}
        max={round.length * 2}
        misses={misses}
        onAgain={() => {
          restart();
          setI(0);
          setScore(0);
          setMisses([]);
          setAsk(null);
          setPick(null);
        }}
      >
        <T center color={c.ink2}>
          Before reading the options, find the priority word and what it asks for. It tells you which of several true answers the examiner wants.
        </T>
      </RoundEnd>
    );
  }

  const { q, perm } = item;
  const letters = LETTERS.slice(0, perm.length);
  const answered = pick !== null;
  // "MOST appropriate" accepts best fit (and degree): engine acceptedAsks.
  const accepted = acceptedAsks(q.stem);
  const readRight = ask !== null && accepted.includes(ask);
  const cue = q.tips.find((t) => t.startsWith('Exam cue:'));

  const choose = (d: Letter) => {
    if (!ask || answered) return;
    const ok = isCorrect(q, d, perm);
    setPick(d);
    const gained = (readRight ? 1 : 0) + (ok ? 1 : 0);
    setScore((s) => s + gained);
    const miss = signpostMiss(q, readRight, ok);
    if (miss) setMisses((m) => [...m, miss]);
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
      title={GAMES.priority.name}
      index={i}
      total={round.length}
      score={score}
      footer={
        answered ? (
          <Button
            label={i === round.length - 1 ? 'See results' : 'Next question'}
            onPress={() => {
              setI(i + 1);
              setAsk(null);
              setPick(null);
            }}
          />
        ) : (
          <T v="label" center color={ask ? c.accentText : c.ink2}>
            {ask ? 'Step 2: answer with that in mind' : 'Step 1: what does this question ask for?'}
          </T>
        )
      }
    >
      {/* The word is marked only once a meaning is chosen: the meaning is the skill. */}
      <QuestionHead q={q} highlight={ask ? actual : null} />
      {!ask && (
        <View style={{ gap: space.sm }}>
          {choices.map((a) => (
            <Button key={a} kind="secondary" label={ASK_LABEL[a]} onPress={() => setAsk(a)} />
          ))}
        </View>
      )}
      {ask && (
        <>
          <RevealCard
            tone={readRight ? 'good' : 'bad'}
            title={readRight ? `${actual}: you read it right` : `${actual} asks for: ${ASK_LABEL[accepted[0]].toLowerCase()}`}
            body={meaningFor(q.stem)}
          />
          <Gap h={space.md} />
        </>
      )}
      {ask &&
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
            // The item's own "Exam cue" is the pattern to carry to the next question.
            body={renderText(cue ? `${q.explanation}\n\n${cue}` : q.explanation, perm)}
          />
        </>
      )}
    </GameFrame>
  );
}
