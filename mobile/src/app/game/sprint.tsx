/**
 * Calibrated Sprint — 8 questions, stake 1–3 chips before answering.
 * The end screen shows accuracy per stake: are your sure answers really sure?
 */
import { useState } from 'react';
import { View } from 'react-native';
import { GameFrame, QuestionHead, RevealCard, RoundEnd, useRound } from '../../components/game';
import { OptionCard, type OptionState } from '../../components/quiz';
import { Chip, Gap, ProgressBar, Row, T, Button } from '../../components/ui';
import { getAllQuestions } from '../../content/loader';
import { LETTERS, type Letter } from '../../content/types';
import {
  calibration,
  calibrationVerdict,
  sprintScore,
  VERDICT_COPY,
  type SprintResult,
  type Stake,
} from '../../engine/games/calibration';
import { buildPracticeQueue } from '../../engine/queue';
import { createRng } from '../../engine/random';
import { displayToOriginal, isCorrect, originalToDisplay, renderText } from '../../engine/shuffle';
import type { Confidence } from '../../engine/srs';
import { useActiveCert } from '../../lib/useActiveCert';
import { selectCert, useProgress } from '../../store/progress';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const SIZE = 8;
const STAKE_CONFIDENCE: Record<Stake, Confidence> = { 1: 'guessing', 2: 'unsure', 3: 'sure' };

export default function CalibratedSprint() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const { round, restart } = useRound(cert.id, (seed) =>
    buildPracticeQueue(getAllQuestions(cert.id), selectCert(useProgress.getState(), cert.id).answers, SIZE, createRng(seed)),
  );
  const [i, setI] = useState(0);
  const [stake, setStake] = useState<Stake | null>(null);
  const [pick, setPick] = useState<Letter | null>(null);
  const [results, setResults] = useState<SprintResult[]>([]);
  const progress = useProgress.getState();
  const score = sprintScore(results);

  if (i >= round.length) {
    const verdict = calibrationVerdict(results);
    return (
      <RoundEnd
        certId={cert.id}
        game="sprint"
        score={score}
        max={round.length * 3}
        onAgain={() => {
          restart();
          setI(0);
          setStake(null);
          setPick(null);
          setResults([]);
        }}
      >
        <T v="label" color={c.text2}>Your calibration</T>
        <Gap h={space.sm} />
        {calibration(results).map((b) => (
          <View key={b.stake} style={{ marginBottom: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="label">{`${b.stake} chip${b.stake > 1 ? 's' : ''} (${STAKE_CONFIDENCE[b.stake]})`}</T>
              <T v="mono">{b.accuracy === null ? '—' : `${Math.round(b.accuracy * 100)}% of ${b.answered}`}</T>
            </Row>
            <Gap h={space.xs} />
            <ProgressBar value={b.accuracy ?? 0} color={b.stake === 3 ? c.accent : c.teal} height={6} />
          </View>
        ))}
        <T color={c.text2} style={{ lineHeight: 24 }}>{VERDICT_COPY[verdict]}</T>
      </RoundEnd>
    );
  }

  const { q, perm } = round[i];
  const letters = LETTERS.slice(0, perm.length);
  const answered = pick !== null;

  const choose = (display: Letter) => {
    if (!stake || answered) return;
    const ok = isCorrect(q, display, perm);
    setPick(display);
    const next = [...results, { questionId: q.id, stake, correct: ok }];
    setResults(next);
    progress.recordAnswer(cert.id, q.id, ok, STAKE_CONFIDENCE[stake]);
    if (!ok) progress.recordMistake(cert.id, q.id, displayToOriginal(display, perm));
    if (i === round.length - 1) progress.recordGame(cert.id, 'sprint', sprintScore(next));
  };

  const stateFor = (d: Letter): OptionState => {
    if (!answered) return 'idle';
    if (displayToOriginal(d, perm) === q.correct) return 'correct';
    return d === pick ? 'wrong' : 'dimmed';
  };
  const ok = answered && isCorrect(q, pick!, perm);

  return (
    <GameFrame
      title="Calibrated Sprint"
      index={i}
      total={round.length}
      score={score}
      footer={
        answered ? (
          <Button
            label={i === round.length - 1 ? 'See calibration' : 'Next question'}
            onPress={() => {
              setI(i + 1);
              setStake(null);
              setPick(null);
            }}
          />
        ) : (
          <View>
            <T v="label" center color={stake ? c.accentText : c.text2}>
              {stake ? 'Now choose your answer' : 'Stake first: how sure will you be?'}
            </T>
            <Gap h={space.sm} />
            <Row gap={space.sm} style={{ justifyContent: 'center' }}>
              {([1, 2, 3] as Stake[]).map((s) => (
                <Chip key={s} label={`${s} chip${s > 1 ? 's' : ''}`} selected={stake === s} onPress={() => setStake(s)} />
              ))}
            </Row>
          </View>
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
          disabled={!stake || answered}
          onPress={() => choose(d)}
        />
      ))}
      {answered && (
        <>
          <Gap h={space.sm} />
          <RevealCard
            tone={ok ? 'good' : 'bad'}
            title={ok ? `+${stake} chips` : `−${stake} chips · best answer ${originalToDisplay(q.correct, perm)}`}
            body={renderText(q.explanation, perm)}
          />
        </>
      )}
    </GameFrame>
  );
}
