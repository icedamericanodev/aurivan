/**
 * Root or Rumor (id `rumor`) — "Tell a sound principle from an exam myth."
 * Engine and rules: engine/games/rootOrRumor.ts.
 *
 * 1. Pick a level (Seedling: one domain; Sapling: mixed; Heartwood: mixed
 *    plus "Why?" on each myth).
 * 2. 12 statements, one at a time. Two big text buttons, Root and Rumor
 *    (label AND colour-free shape, 48pt+; no swipe needed). The reveal:
 *    a Rumor shows why it's a myth; a Root shows its subtopic and
 *    "Read the note". Each answer updates that statement's review card.
 * 3. The shared recap, plus the longest run, Heartwood's "Why?" count, and
 *    "Read again" for any subtopic with 2+ missed statements.
 * Game answers never count toward mastery or readiness.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { GameFrame, GameIntro, PlayableGate, RevealCard, RoundEnd } from '../../components/game';
import { BookOpen, ICON_STROKE, SproutIcon } from '../../components/icons';
import { OptionCard, type OptionState } from '../../components/quiz';
import { Button, Gap, ICON_SIZE, ListRow, Row, Stem, T, useFontScale } from '../../components/ui';
import { getNotes } from '../../content/notes';
import { LETTERS } from '../../content/types';
import { clip, firstSentence, type RecapMiss } from '../../engine/games/recap';
import { GAMES } from '../../engine/games/registry';
import {
  buildRumorRound,
  isRightTap,
  longestRun,
  readAgain,
  RUMOR_TIER_LINE,
  RUMOR_TIER_NAME,
  RUMOR_TIERS,
  rumorScore,
  rumorStatements,
  tapTitle,
  whyChoices,
  type RumorTier,
  type Statement,
  type StatementKind,
} from '../../engine/games/rootOrRumor';
import { createRng } from '../../engine/random';
import { logGame } from '../../lib/activity';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function RootOrRumorScreen() {
  return (
    <PlayableGate game="rumor">
      <RootOrRumor />
    </PlayableGate>
  );
}

const MISS_LINE = 'Missed statements come back in a later round.';

function RootOrRumor() {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const { cert, progress } = useActiveCert();
  const all = useMemo(() => rumorStatements(getNotes(cert.id)), [cert.id]);
  const [tier, setTier] = useState<RumorTier>('seedling');
  const [round, setRound] = useState<Statement[] | null>(null);
  const [i, setI] = useState(0);
  const [taps, setTaps] = useState<boolean[]>([]);
  const [tap, setTap] = useState<StatementKind | null>(null);
  // Heartwood "Why?": the choices for this Rumor and the pick.
  const [why, setWhy] = useState<{ choices: string[]; correct: number } | null>(null);
  const [whyPick, setWhyPick] = useState<number | null>(null);
  const [whysRight, setWhysRight] = useState(0);
  const [whysAsked, setWhysAsked] = useState(0);
  const [misses, setMisses] = useState<RecapMiss[]>([]);

  const start = () => {
    const seed = Date.now();
    setRound(buildRumorRound(all, useProgress.getState().byCert[cert.id]?.cards, tier, createRng(seed), seed));
    setI(0);
    setTaps([]);
    setTap(null);
    setWhy(null);
    setWhyPick(null);
    setWhysRight(0);
    setWhysAsked(0);
    setMisses([]);
  };

  if (!round) {
    return (
      <GameIntro
        game="rumor"
        icon={(col) => <SproutIcon size={48} color={col} strokeWidth={1.5} />}
        rules="Twelve statements from the study notes, one at a time. Tap Root if it is a sound principle, Rumor if it is an exam myth. Myths are the beliefs that make wrong options feel right."
        tiers={RUMOR_TIERS}
        tier={tier}
        onTier={setTier}
        tierName={RUMOR_TIER_NAME}
        tierLine={RUMOR_TIER_LINE}
        onStart={start}
      />
    );
  }

  const score = rumorScore(taps);
  if (i >= round.length) {
    const touched = new Set(round.map((s) => s.subtopicId));
    const again = readAgain(progress.cards).filter((sub) => touched.has(sub));
    const nameOf = (sub: string) => round.find((s) => s.subtopicId === sub)?.subtopicName ?? sub;
    return (
      <RoundEnd certId={cert.id} game="rumor" score={score} max={round.length} misses={misses} reviewNote={MISS_LINE} onAgain={start}>
        <T v="small" num>{`Longest run of right calls: ${longestRun(taps)}`}</T>
        {whysAsked > 0 && <T v="small" num style={{ marginTop: space.xs }}>{`“Why?” right: ${whysRight} of ${whysAsked}`}</T>}
        {again.length > 0 && (
          <View style={{ marginTop: space.lg }}>
            <T v="headline" accessibilityRole="header">Read again</T>
            <T v="meta" style={{ marginTop: space.xs }}>Two or more statements here caught you. A short read sorts the root from the rumor.</T>
            {again.map((sub, k) => (
              <ListRow
                key={sub}
                icon={<BookOpen size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                title={nameOf(sub)}
                subtitle="Open the study note"
                accessibilityLabel={`Read again: ${nameOf(sub)}`}
                onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(sub)}`)}
                last={k === again.length - 1}
              />
            ))}
          </View>
        )}
        <Gap h={space.md} />
      </RoundEnd>
    );
  }

  const s = round[i];
  const right = tap !== null ? isRightTap(s, tap) : null;
  const asking = tap !== null && why !== null && whyPick === null;
  const revealed = tap !== null && !asking;

  const choose = (kind: StatementKind) => {
    if (tap !== null) return;
    const ok = isRightTap(s, kind);
    setTap(kind);
    setTaps((t) => [...t, ok]);
    // The statement's own review card (never a question, never readiness).
    useProgress.getState().recordCard(cert.id, s.id, ok);
    if (!ok) {
      setMisses((m) => [
        ...m,
        {
          questionId: s.id,
          stem: clip(s.text),
          tag: s.kind === 'rumor' ? 'Rumor (an exam myth)' : 'Root (a sound principle)',
          why: s.kind === 'rumor' && s.why ? firstSentence(s.why) : `A sound principle from ${s.subtopicName}.`,
          answerWrong: true,
        },
      ]);
    }
    if (tier === 'heartwood' && s.kind === 'rumor' && s.why) {
      setWhy(whyChoices(s, all, createRng(Date.now())));
      setWhysAsked((n) => n + 1);
    }
    if (i === round.length - 1) {
      useProgress.getState().recordGame(cert.id, 'rumor', score + (ok ? 1 : 0));
      logGame(cert.id, 'rumor');
    }
  };

  const pickWhy = (k: number) => {
    if (!why || whyPick !== null) return;
    setWhyPick(k);
    if (k === why.correct) setWhysRight((n) => n + 1);
  };

  const next = () => {
    setI(i + 1);
    setTap(null);
    setWhy(null);
    setWhyPick(null);
  };

  const whyState = (k: number): OptionState => {
    if (whyPick === null || !why) return 'idle';
    if (k === why.correct) return 'correct';
    return k === whyPick ? 'wrong' : 'dimmed';
  };

  return (
    <GameFrame
      title={GAMES.rumor.name}
      index={i}
      total={round.length}
      score={score}
      footer={
        revealed ? (
          <Button label={i === round.length - 1 ? 'See results' : 'Next statement'} onPress={next} />
        ) : asking ? (
          <T v="label" center color={c.accentText}>Why is it a myth? Pick the reason.</T>
        ) : (
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            <Button
              kind="secondary"
              label="Root"
              accessibilityLabel="Root, a sound principle"
              onPress={() => choose('root')}
              style={large ? { flexBasis: '100%' } : { flex: 1 }}
            />
            <Button
              kind="secondary"
              label="Rumor"
              accessibilityLabel="Rumor, an exam myth"
              onPress={() => choose('rumor')}
              style={large ? { flexBasis: '100%' } : { flex: 1 }}
            />
          </Row>
        )
      }
    >
      <T v="caption" color={c.accentText}>Sound principle, or exam myth?</T>
      {/* The note it comes from, as context. Each subtopic in a round has
          both a Root and a Rumor, so the heading gives nothing away. */}
      <T v="meta" style={{ marginTop: space.xs }}>{`From the note: ${s.subtopicName}`}</T>
      <Gap h={space.sm} />
      <Stem>{s.text}</Stem>
      <Gap h={space.lg} />
      {tap === null && <T v="meta">Root: a sound principle. Rumor: an exam myth.</T>}
      {tap !== null && (
        <T v="caption" color={right ? c.correct : c.wrong}>{`You said ${tap === 'root' ? 'Root' : 'Rumor'} · ${right ? 'right' : 'not quite'}`}</T>
      )}
      {asking && why && (
        <View style={{ marginTop: space.md }}>
          {why.choices.map((text, k) => (
            <OptionCard key={k} letter={LETTERS[k]} text={text} state="idle" onPress={() => pickWhy(k)} />
          ))}
        </View>
      )}
      {revealed && (
        <View style={{ marginTop: space.md }}>
          {why && whyPick !== null && (
            <>
              {why.choices.map((text, k) => (
                <OptionCard key={k} letter={LETTERS[k]} text={text} state={whyState(k)} />
              ))}
              <Gap h={space.sm} />
            </>
          )}
          <RevealCard
            tone={right ? 'good' : 'bad'}
            title={tapTitle(s, Boolean(right))}
            body={s.kind === 'rumor' ? (s.why ?? '') : 'A true principle you can lean on in the exam.'}
          />
          {s.kind === 'root' && (
            <Button
              kind="ghost"
              label="Read the note"
              accessibilityHint={`Opens the study note on ${s.subtopicName}`}
              onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(s.subtopicId)}`)}
              style={{ marginTop: space.sm }}
            />
          )}
        </View>
      )}
    </GameFrame>
  );
}
