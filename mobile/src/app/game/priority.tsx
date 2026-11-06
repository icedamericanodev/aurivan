/**
 * Signpost (id `priority`) — say what the deciding word asks for, then
 * answer. 5 questions · 2 points each (1 for reading it right, 1 for the answer).
 *
 * Step 1 offers four MEANINGS ("the step that must come first", "the
 * strongest effect"…), never the words themselves: the word is printed in
 * capitals, so picking the word was solved by spotting the capitals. Once a
 * meaning is chosen, the word is marked in the stem (engine/games/priorityLens.ts).
 *
 * Grove Phase 4b (design-notes/grove/phase4b/PHASE4B.md section 6): the twig, the two steps as step
 * squares (the screen's own step words), and after the answer the drill's answer screen with its
 * two-half line. The word, read, stays on the answer screen above the card.
 */
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { DrillAnswer } from '../../components/drillAnswer';
import { StepSquares, type ItemResult } from '../../components/drillKit';
import { GameFrame, PlayableGate, QuestionHead, RevealCard, RoundEnd, useRound } from '../../components/game';
import { OptionCard } from '../../components/quiz';
import { FieldText } from '../../components/fieldguide';
import { Button, T } from '../../components/ui';
import { missCoach, readHalf, twoHalfVerdict } from '../../lib/drillVerdict';
import { getAllQuestions } from '../../content/loader';
import { LETTERS, type Letter } from '../../content/types';
import { acceptedAsks, ASK_LABEL, askChoices, buildPriorityRound, meaningFor, priorityWord, type Ask } from '../../engine/games/priorityLens';
import { signpostMiss, type RecapMiss } from '../../engine/games/recap';
import { GAMES } from '../../engine/games/registry';
import { createRng } from '../../engine/random';
import { displayToOriginal, isCorrect } from '../../engine/shuffle';
import { finishGameRound, startingTier, type RoundNews } from '../../lib/gameRounds';
import { batchSaves } from '../../store/storage';
import { useAnswerClock } from '../../lib/useAnswerClock';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZE = GAMES.priority.size;

/** The route: the game, or a calm "on the way" screen when this exam can't play it. */
export default function SignpostScreen() {
  return (
    <PlayableGate game="priority">
      <Signpost />
    </PlayableGate>
  );
}

function Signpost() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const { round, seed, restart } = useRound(cert.id, (seed) => buildPriorityRound(getAllQuestions(cert.id), createRng(seed), SIZE));
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [pick, setPick] = useState<Letter | null>(null);
  const [misses, setMisses] = useState<RecapMiss[]>([]);
  // Build F: each deciding word read right (the skill step), and FIRST ones read right.
  const [reads, setReads] = useState<{ id: string; right: boolean; first: boolean }[]>([]);
  const [news, setNews] = useState<RoundNews | null>(null);
  // Grove 4b: each item for the twig (right only when both halves were earned).
  const [items, setItems] = useState<ItemResult[]>([]);
  const progress = useProgress.getState();
  // Quiet data (Build C): time from the question appearing to the answer.
  const readClock = useAnswerClock(round[i] ? `${i}:${round[i].q.id}` : undefined);

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
        news={news}
        results={items}
        onAgain={() => {
          restart();
          setI(0);
          setScore(0);
          setMisses([]);
          setReads([]);
          setItems([]);
          setNews(null);
          setAsk(null);
          setPick(null);
        }}
      >
        <T v="aside" color={c.ink2}>
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

  const choose = (d: Letter) => {
    if (!ask || answered) return;
    // One save per tap (store/storage.ts batchSaves): the answer, a miss and, on the last one, the round's end
    // used to save the whole progress file up to 7 times (release bug hunt round 3).
    batchSaves(() => {
      const ok = isCorrect(q, d, perm);
      setPick(d);
      const gained = (readRight ? 1 : 0) + (ok ? 1 : 0);
      setScore((s) => s + gained);
      const miss = signpostMiss(q, readRight, ok);
      if (miss) setMisses((m) => [...m, miss]);
      // Game answers never count toward the subtopic mastery date (mastery: false).
      progress.recordAnswer(cert.id, q.id, ok, undefined, { ms: readClock(), mastery: false });
      if (!ok) progress.recordMistake(cert.id, q.id, displayToOriginal(d, perm));
      setItems((it) => [...it, readRight && ok ? 'right' : 'missed']);
      const nextReads = [...reads, { id: q.id, right: readRight, first: actual === 'FIRST' }];
      setReads(nextReads);
      if (i === round.length - 1) {
        setNews(
          finishGameRound(cert.id, 'priority', {
            score: score + gained,
            rate: nextReads.filter((r) => r.right).length / round.length,
            tier: startingTier(cert.id, 'priority'),
            hits: nextReads.map((r) => r.right),
            // Signpost Reader's rolling window: every FIRST question, read right or not.
            windows: { signposts: nextReads.filter((r) => r.first).map((r) => ({ id: r.id, ok: r.right })) },
          }),
        );
      }
    });
  };

  const readTitle = readRight ? `${actual}: you read it right` : `${actual} asks for: ${ASK_LABEL[accepted[0]].toLowerCase()}`;
  const readCard = ask ? <RevealCard tone={readRight ? 'good' : 'bad'} title={readTitle} body={meaningFor(q.stem)} /> : null;

  return (
    <GameFrame
      game="priority"
      index={i}
      total={round.length}
      score={score}
      results={items}
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
        ) : undefined
      }
    >
      {answered && pick ? (
        <DrillAnswer
          q={q}
          perm={perm}
          pick={pick}
          animate={readRight && isCorrect(q, pick, perm)}
          {...twoHalfVerdict({
            skill: readRight,
            correct: isCorrect(q, pick, perm),
            skillHalf: readHalf(actual),
            skillCoach: `${actual} asks for: ${ASK_LABEL[accepted[0]].toLowerCase()}`,
            missCoach: missCoach(q, displayToOriginal(pick, perm), perm),
          })}
        >
          {/* The word, read: what it asks for (step 1's card), kept above the answer card. */}
          <View style={{ marginTop: space.lg }}>{readCard}</View>
        </DrillAnswer>
      ) : (
        <>
          {/* The two steps, the screen's own words (PHASE4B 6.3 item 5). */}
          <StepSquares
            steps={[
              { label: 'Step 1: what does this question ask for?', state: ask ? 'done' : 'now', result: ask ? ASK_LABEL[ask] : undefined },
              { label: 'Step 2: answer with that in mind', state: ask ? 'now' : 'later' },
            ]}
          />
          {/* The word is marked only once a meaning is chosen: the meaning is the skill. */}
          <QuestionHead q={q} highlight={ask ? actual : null} ink />
          {!ask && (
            <View style={{ gap: space.sm }}>
              {choices.map((a) => (
                <Button key={a} kind="secondary" label={ASK_LABEL[a]} onPress={() => setAsk(a)} />
              ))}
            </View>
          )}
          {ask && (
            // PHASE4B 6.6: Signpost step 2, the word marked and its coaching line in `aside`.
            <View testID="signpost-read" accessible accessibilityLabel={`${readTitle}. ${meaningFor(q.stem)}`} style={{ marginBottom: space.lg }}>
              <T v="caption" color={readRight ? c.correct : c.wrong}>{`${readRight ? '✓' : '✗'} ${readTitle}`}</T>
              <FieldText v="sub" style={{ marginTop: space.xs }}>{meaningFor(q.stem)}</FieldText>
            </View>
          )}
          {ask &&
            letters.map((d) => (
              <OptionCard key={d} letter={d} text={q.options[displayToOriginal(d, perm)] ?? ''} state="idle" onPress={() => choose(d)} />
            ))}
        </>
      )}
    </GameFrame>
  );
}
