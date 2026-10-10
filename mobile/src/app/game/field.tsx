/**
 * Field Guide (id `field`) — "Match each term to what it means."
 * Engine and rules: engine/games/fieldGuide.ts (games review §3.4).
 *
 * 1. Pick a level (it starts on the learner's own): Seedling (4 topics a
 *    board), Sapling (one topic: near neighbours), Heartwood (recall).
 * 2. Three boards. Seedling / Sapling: tap a term, then its meaning (or the
 *    other way round): no dragging. A right pair turns green with a ✓ and
 *    stays; a wrong pair shakes once (static with Reduce Motion) and both
 *    stay open to try again. A pair right on the first try scores a point
 *    and is marked "first try". Heartwood: one meaning at a time; pick its
 *    term from six.
 *    At large text the two lists stack (terms, then meanings).
 * 3. The shared round end: missed terms with their meaning, "Missed terms
 *    come back in a later round.", the level line and at most one badge.
 * Each term is a review card (never readiness, never mastery).
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { GameFrame, GameIntro, MatchTile, PlayableGate, RevealCard, RoundEnd, type TileState } from '../../components/game';
import { BookA } from '../../components/icons';
import { Button, Gap, Row, Stem, T, useFontScale } from '../../components/ui';
import { getNotes } from '../../content/notes';
import {
  buildFieldRound,
  FIELD_TIER_LINE,
  FIELD_TIER_NAME,
  FIELD_TIERS,
  fieldScore,
  fieldTerms,
  itemSpoken,
  type FieldBoard,
  type FieldTier,
} from '../../engine/games/fieldGuide';
import type { RecapMiss } from '../../engine/games/recap';
import { GAMES } from '../../engine/games/registry';
import { createRng } from '../../engine/random';
import { finishGameRound, startingTier, type RoundNews } from '../../lib/gameRounds';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function FieldGuideScreen() {
  return (
    <PlayableGate game="field">
      <FieldGuide />
    </PlayableGate>
  );
}

const MISS_LINE = 'Missed terms come back in a later round.';

function FieldGuide() {
  const { c } = useTheme();
  const large = useFontScale() >= LARGE_TEXT;
  const { cert } = useActiveCert();
  const all = useMemo(() => fieldTerms(getNotes(cert.id)), [cert.id]);
  const [tier, setTier] = useState<FieldTier>(() => startingTier(cert.id, 'field'));
  const [round, setRound] = useState<{ boards: FieldBoard[]; tier: FieldTier } | null>(null);
  const [b, setB] = useState(0);
  // Seedling / Sapling board state.
  const [selTerm, setSelTerm] = useState<number | null>(null);
  const [selDef, setSelDef] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  // Terms tried wrongly at least once on this board (no "first try" point).
  const [slipped, setSlipped] = useState<number[]>([]);
  const [shake, setShake] = useState<{ term: number; def: number; n: number } | null>(null);
  // Heartwood: which meaning of the board, and the pick.
  const [k, setK] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  // The whole round: first-try results in order, the misses and the round news.
  const [firsts, setFirsts] = useState<boolean[]>([]);
  const [misses, setMisses] = useState<RecapMiss[]>([]);
  const [news, setNews] = useState<RoundNews | null>(null);

  const resetBoard = () => {
    setSelTerm(null);
    setSelDef(null);
    setMatched([]);
    setSlipped([]);
    setShake(null);
    setK(0);
    setPick(null);
  };
  const start = () => {
    const seed = Date.now();
    setRound({ boards: buildFieldRound(all, useProgress.getState().byCert[cert.id]?.cards, tier, createRng(seed), seed), tier });
    setB(0);
    setFirsts([]);
    setMisses([]);
    setNews(null);
    resetBoard();
  };

  if (!round) {
    return (
      <GameIntro
        game="field"
        icon={(col) => <BookA size={48} color={col} strokeWidth={1.5} />}
        rules="Three boards of four terms from the study notes. Tap a term, then tap what it means. A pair you match on the first try scores a point. Near neighbours like owner and custodian are where exam points hide."
        tiers={FIELD_TIERS}
        tier={tier}
        onTier={setTier}
        tierName={FIELD_TIER_NAME}
        tierLine={FIELD_TIER_LINE}
        level={startingTier(cert.id, 'field')}
        onStart={start}
      />
    );
  }

  const total = round.boards.length * (round.boards[0]?.terms.length ?? 4);
  const score = fieldScore(firsts);

  if (b >= round.boards.length) {
    return (
      <RoundEnd certId={cert.id} game="field" score={score} max={total} misses={misses} reviewNote={MISS_LINE} onAgain={start} news={news}>
        <T v="small" num>{`First-try matches: ${score} of ${total}`}</T>
        <Gap h={space.md} />
      </RoundEnd>
    );
  }

  const board = round.boards[b];
  const n = board.terms.length;
  const lastBoard = b === round.boards.length - 1;

  /** One term settled: its card, its first-try point, a miss line if not first try. */
  const settle = (termIdx: number, first: boolean) => {
    const t = board.terms[termIdx];
    useProgress.getState().recordCard(cert.id, t.id, first);
    const nextFirsts = [...firsts, first];
    setFirsts(nextFirsts);
    if (!first) setMisses((m) => [...m, { questionId: t.id, stem: t.term, tag: 'Meaning', why: t.definition, answerWrong: true }]);
    return nextFirsts;
  };
  const finishIfLast = (nextFirsts: boolean[]) => {
    if (nextFirsts.length < total) return;
    setNews(
      finishGameRound(cert.id, 'field', {
        score: fieldScore(nextFirsts),
        rate: fieldScore(nextFirsts) / total,
        tier: round.tier,
        hits: nextFirsts,
      }),
    );
  };

  // ── Seedling / Sapling: match the pairs ─────────────────────────────────
  const tryPair = (term: number, def: number) => {
    if (term === def) {
      const first = !slipped.includes(term);
      setMatched((m) => [...m, term]);
      setSelTerm(null);
      setSelDef(null);
      AccessibilityInfo.announceForAccessibility(`Matched: ${board.terms[term].term}${first ? ', first try' : ''}.`);
      finishIfLast(settle(term, first));
    } else {
      setSlipped((s) => (s.includes(term) ? s : [...s, term]));
      setShake((x) => ({ term, def, n: (x?.n ?? 0) + 1 }));
      setSelTerm(null);
      setSelDef(null);
      AccessibilityInfo.announceForAccessibility('Not a match. Both stay open: try again.');
    }
  };
  const tapTerm = (i: number) => {
    if (matched.includes(i)) return;
    if (selDef !== null) return tryPair(i, selDef);
    setSelTerm(selTerm === i ? null : i);
  };
  const tapDef = (i: number) => {
    if (matched.includes(i)) return;
    if (selTerm !== null) return tryPair(selTerm, i);
    setSelDef(selDef === i ? null : i);
  };
  const termState = (i: number): TileState => (matched.includes(i) ? 'matched' : selTerm === i ? 'selected' : 'idle');
  const defState = (i: number): TileState => (matched.includes(i) ? 'matched' : selDef === i ? 'selected' : 'idle');
  const boardDone = round.tier === 'heartwood' ? k >= n : matched.length === n;

  const next = () => {
    setB(b + 1);
    resetBoard();
  };

  if (round.tier !== 'heartwood') {
    const topicName = round.tier === 'sapling' ? board.terms[0]?.topicName : undefined;
    const termsCol = (
      <View accessibilityRole="list" style={{ flex: 1 }}>
        <T v="caption" color={c.ink2} style={{ marginBottom: space.xs }}>Terms</T>
        {board.terms.map((t, i) => (
          <MatchTile
            key={t.id}
            text={t.term}
            state={termState(i)}
            onPress={() => tapTerm(i)}
            shake={shake?.term === i ? shake.n : 0}
            spoken={itemSpoken('Term', i, n, t.term, { selected: selTerm === i, matched: matched.includes(i) })}
            hint={matched.includes(i) ? undefined : 'Then tap its meaning.'}
          />
        ))}
      </View>
    );
    const defsCol = (
      <View accessibilityRole="list" style={{ flex: 1 }}>
        <T v="caption" color={c.ink2} style={{ marginBottom: space.xs }}>Meanings</T>
        {board.defOrder.map((ti, j) => (
          <MatchTile
            key={board.terms[ti].id}
            text={board.terms[ti].definition}
            state={defState(ti)}
            onPress={() => tapDef(ti)}
            shake={shake?.def === ti ? shake.n : 0}
            spoken={itemSpoken('Meaning', j, n, board.terms[ti].definition, { selected: selDef === ti, matched: matched.includes(ti) })}
          />
        ))}
      </View>
    );
    return (
      <GameFrame
        title={GAMES.field.name}
        index={b}
        total={round.boards.length}
        score={score}
        footer={
          boardDone ? (
            <Button label={lastBoard ? 'See results' : 'Next board'} onPress={next} />
          ) : (
            <T v="label" center color={c.accentText}>Tap a term, then what it means.</T>
          )
        }
      >
        <T v="caption" color={c.accentText}>{`Board ${b + 1} of ${round.boards.length}`}</T>
        {topicName ? <T v="meta" style={{ marginTop: space.xs }}>{`One topic: ${topicName}`}</T> : null}
        <Gap h={space.md} />
        {/* Side by side when it fits; stacked (terms first) at large text. */}
        {large ? (
          <View>
            {termsCol}
            <Gap h={space.md} />
            {defsCol}
          </View>
        ) : (
          <Row gap={space.sm} style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 2 }}>{termsCol}</View>
            <View style={{ flex: 3 }}>{defsCol}</View>
          </Row>
        )}
        {matched.length > 0 && (
          <T v="meta" num style={{ marginTop: space.sm }}>{`${matched.length} of ${n} matched · ${matched.filter((i) => !slipped.includes(i)).length} on the first try`}</T>
        )}
      </GameFrame>
    );
  }

  // ── Heartwood: recall the term for one meaning at a time ────────────────
  const term = board.terms[Math.min(k, n - 1)];
  const choices = board.choices?.[Math.min(k, n - 1)] ?? [];
  const right = pick !== null && pick === term.id;
  const choose = (id: string) => {
    if (pick !== null) return;
    setPick(id);
    finishIfLast(settle(k, id === term.id));
  };
  const choiceState = (id: string): TileState => {
    if (pick === null) return 'idle';
    if (id === term.id) return 'correct';
    return id === pick ? 'wrong' : 'dimmed';
  };
  const nextMeaning = () => {
    if (k + 1 >= n) next();
    else {
      setK(k + 1);
      setPick(null);
    }
  };
  return (
    <GameFrame
      title={GAMES.field.name}
      index={b}
      total={round.boards.length}
      score={score}
      footer={
        pick !== null ? (
          <Button label={k + 1 >= n ? (lastBoard ? 'See results' : 'Next board') : 'Next meaning'} onPress={nextMeaning} />
        ) : (
          <T v="label" center color={c.accentText}>Which term means this?</T>
        )
      }
    >
      <T v="caption" color={c.accentText}>{`Board ${b + 1} of ${round.boards.length} · meaning ${k + 1} of ${n}`}</T>
      <Gap h={space.sm} />
      <Stem>{term.definition}</Stem>
      <Gap h={space.lg} />
      <View accessibilityRole="radiogroup" accessibilityLabel="Which term means this?">
        {choices.map((ch, j) => (
          <MatchTile
            key={ch.id}
            text={ch.term}
            state={choiceState(ch.id)}
            onPress={pick === null ? () => choose(ch.id) : undefined}
            spoken={`Choice ${j + 1} of ${choices.length}: ${ch.term}${pick !== null && ch.id === term.id ? ', the term' : pick === ch.id ? ', your pick' : ''}`}
          />
        ))}
      </View>
      {pick !== null && (
        <View style={{ marginTop: space.sm }}>
          <RevealCard tone={right ? 'good' : 'bad'} title={right ? `${term.term}: first try` : `It’s ${term.term}`} body={term.definition} />
          {term.subtopicId && !right && (
            <Button
              kind="ghost"
              label="Read the note"
              accessibilityHint={`Opens the study note on ${term.subtopicName ?? 'this term'}`}
              onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(term.subtopicId!)}`)}
              style={{ marginTop: space.sm }}
            />
          )}
        </View>
      )}
    </GameFrame>
  );
}
