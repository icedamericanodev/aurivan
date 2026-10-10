/**
 * Canopy Call (id `canopy`) — "Choose who has the authority to decide."
 * Engine and rules: engine/games/canopyCall.ts (games review §3.7).
 *
 * 1. Pick a level (it starts on the learner's own). Levels play the deck's
 *    own card tiers.
 * 2. Ten one-line decisions. Tap the role that decides: 4 role rows (5 at
 *    Heartwood) in a radio group; a card's excluded roles are never shown.
 *    The reveal: ✓ on the right role, ✗ on a wrong pick, one line on why
 *    and "The auditor's move" where the deck has one, plus "Read the note"
 *    after a miss. Each decision is a review card (never readiness).
 * 3. The shared round end: missed decisions, "Where your calls went"
 *    (confusion pairs: "You gave 2 Data owner decisions to Custodian."),
 *    the level line and at most one badge.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { GameFrame, GameIntro, MatchTile, PlayableGate, RevealCard, RoundEnd, type TileState } from '../../components/game';
import { TreeDeciduous } from '../../components/icons';
import { Button, Gap, Stem, T } from '../../components/ui';
import { getRoleDeck } from '../../content/games';
import { findNote } from '../../content/notes';
import {
  buildCanopyRound,
  CANOPY_TIER_LINE,
  CANOPY_TIER_NAME,
  CANOPY_TIERS,
  canopyCardId,
  canopyScore,
  confusionPairs,
  isRightRole,
  type CanopyAnswer,
  type CanopyItem,
  type CanopyTier,
} from '../../engine/games/canopyCall';
import type { RecapMiss } from '../../engine/games/recap';
import { GAMES } from '../../engine/games/registry';
import { createRng } from '../../engine/random';
import { finishGameRound, startingTier, type RoundNews } from '../../lib/gameRounds';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function CanopyCallScreen() {
  return (
    <PlayableGate game="canopy">
      <CanopyCall />
    </PlayableGate>
  );
}

const MISS_LINE = 'Missed decisions come back in a later round.';

function CanopyCall() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const deck = useMemo(() => getRoleDeck(cert.id)!, [cert.id]);
  const [tier, setTier] = useState<CanopyTier>(() => startingTier(cert.id, 'canopy'));
  const [round, setRound] = useState<{ items: CanopyItem[]; tier: CanopyTier } | null>(null);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [answers, setAnswers] = useState<CanopyAnswer[]>([]);
  const [news, setNews] = useState<RoundNews | null>(null);

  const label = (id: string) => deck.roles.find((r) => r.id === id)?.label ?? id;
  const short = (id: string) => deck.roles.find((r) => r.id === id)?.short ?? id;

  const start = () => {
    const seed = Date.now();
    setRound({ items: buildCanopyRound(deck, useProgress.getState().byCert[cert.id]?.cards, tier, createRng(seed), seed), tier });
    setI(0);
    setPick(null);
    setAnswers([]);
    setNews(null);
  };

  if (!round) {
    return (
      <GameIntro
        game="canopy"
        icon={(col) => <TreeDeciduous size={48} color={col} strokeWidth={1.5} />}
        rules="Ten decisions, one at a time. Tap who has the authority to make each one: the board, a committee, management, an owner, a custodian, security, or the IS auditor, who assesses and recommends but never owns the decision."
        tiers={CANOPY_TIERS}
        tier={tier}
        onTier={setTier}
        tierName={CANOPY_TIER_NAME}
        tierLine={CANOPY_TIER_LINE}
        level={startingTier(cert.id, 'canopy')}
        onStart={start}
      />
    );
  }

  const score = canopyScore(answers);
  if (i >= round.items.length) {
    const misses: RecapMiss[] = answers
      .filter((a) => !isRightRole(a))
      .map((a) => ({ questionId: a.card.id, stem: a.card.decision, tag: `Decides: ${short(a.card.role)}`, why: a.card.why, answerWrong: true }));
    const pairs = confusionPairs(answers, deck);
    return (
      <RoundEnd certId={cert.id} game="canopy" score={score} max={round.items.length} misses={misses} reviewNote={MISS_LINE} onAgain={start} news={news}>
        {pairs.length > 0 && (
          <View style={{ marginBottom: space.md }}>
            <T v="headline" accessibilityRole="header">Where your calls went</T>
            {pairs.map((p) => (
              <T key={`${p.role}>${p.picked}`} v="small" style={{ marginTop: space.xs }}>
                {p.line}
              </T>
            ))}
          </View>
        )}
        <T v="small" color={c.ink2}>The auditor reports the gap; the owner decides. Authority sits with whoever is accountable for the outcome.</T>
        <Gap h={space.md} />
      </RoundEnd>
    );
  }

  const item = round.items[i];
  const card = item.card;
  const answered = pick !== null;
  const right = answered && pick === card.role;
  const note = findNote(cert.id, card.subtopicId);

  const choose = (role: string) => {
    if (answered) return;
    setPick(role);
    const ok = role === card.role;
    useProgress.getState().recordCard(cert.id, canopyCardId(card), ok);
    const next = [...answers, { card, picked: role }];
    setAnswers(next);
    if (i === round.items.length - 1) {
      const hits = next.map(isRightRole);
      setNews(finishGameRound(cert.id, 'canopy', { score: canopyScore(next), rate: canopyScore(next) / next.length, tier: round.tier, hits }));
    }
  };
  const stateFor = (role: string): TileState => {
    if (!answered) return 'idle';
    if (role === card.role) return 'correct';
    return role === pick ? 'wrong' : 'dimmed';
  };

  return (
    <GameFrame
      title={GAMES.canopy.name}
      index={i}
      total={round.items.length}
      score={score}
      footer={
        answered ? (
          <Button
            label={i === round.items.length - 1 ? 'See results' : 'Next decision'}
            onPress={() => {
              setI(i + 1);
              setPick(null);
            }}
          />
        ) : (
          <T v="label" center color={c.accentText}>Who decides?</T>
        )
      }
    >
      <T v="caption" color={c.accentText}>{card.tier === 'heartwood' ? 'Who acts first?' : 'Who has the authority to decide?'}</T>
      <Gap h={space.sm} />
      <Stem>{card.decision}</Stem>
      <Gap h={space.lg} />
      <View accessibilityRole="radiogroup" accessibilityLabel="Who decides?">
        {item.chips.map((role, k) => (
          <MatchTile
            key={role}
            text={label(role)}
            state={stateFor(role)}
            onPress={answered ? undefined : () => choose(role)}
            spoken={`Role ${k + 1} of ${item.chips.length}: ${label(role)}${answered && role === card.role ? ', decides' : answered && role === pick ? ', your pick' : ''}`}
          />
        ))}
      </View>
      {answered && (
        <View style={{ marginTop: space.sm }}>
          <RevealCard
            tone={right ? 'good' : 'bad'}
            title={right ? `Right: ${short(card.role)} decides` : `This is ${short(card.role)}’s call`}
            body={card.auditorMove ? `${card.why}\n\nThe auditor’s move: ${card.auditorMove}` : card.why}
          />
          {!right && note && (
            <Button
              kind="ghost"
              label="Read the note"
              accessibilityHint={`Opens the study note on ${note.name}`}
              onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(card.subtopicId)}`)}
              style={{ marginTop: space.sm }}
            />
          )}
        </View>
      )}
    </GameFrame>
  );
}
