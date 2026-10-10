/**
 * Stepping Stones (id `stones`) — "Put each process in the right order."
 * Engine and rules: engine/games/steppingStones.ts (games review §3.5).
 *
 * 1. Pick a level (it starts on the learner's own).
 * 2. Three processes. Seedling / Sapling: the shuffled stones sit under
 *    "Stones"; tap one to place it as the next step of "Your path", tap a
 *    placed stone to take it back (no drag). "Check the order" marks each
 *    stone ✓ / ✗ (shape and colour) and a misplaced one says where it goes
 *    ("goes 3rd"); then the step notes and the caption explain the order.
 *    Heartwood: the path with one gap; pick the missing step from 3.
 * 3. The shared round end with the processes not placed perfectly, the
 *    level line and at most one badge. Each process is a review card.
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { GameFrame, GameIntro, MatchTile, PlayableGate, RevealCard, RoundEnd, type TileState } from '../../components/game';
import { Footprints } from '../../components/icons';
import { Button, Gap, Section, T } from '../../components/ui';
import { getStepSequences } from '../../content/games';
import type { RecapMiss } from '../../engine/games/recap';
import { GAMES } from '../../engine/games/registry';
import {
  buildStonesRound,
  checkPath,
  ordinal,
  pathPoints,
  STONES_TIER_LINE,
  STONES_TIER_NAME,
  STONES_TIERS,
  stonesCardId,
  stonesMax,
  type StonesItem,
  type StonesTier,
} from '../../engine/games/steppingStones';
import { createRng } from '../../engine/random';
import { finishGameRound, startingTier, type RoundNews } from '../../lib/gameRounds';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function SteppingStonesScreen() {
  return (
    <PlayableGate game="stones">
      <SteppingStones />
    </PlayableGate>
  );
}

const MISS_LINE = 'Processes you didn’t place perfectly come back in a later round.';

function SteppingStones() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const all = useMemo(() => getStepSequences(cert.id), [cert.id]);
  const [tier, setTier] = useState<StonesTier>(() => startingTier(cert.id, 'stones'));
  const [round, setRound] = useState<{ items: StonesItem[]; tier: StonesTier } | null>(null);
  const [i, setI] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [checked, setChecked] = useState<ReturnType<typeof checkPath> | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState<boolean[]>([]);
  const [misses, setMisses] = useState<RecapMiss[]>([]);
  const [news, setNews] = useState<RoundNews | null>(null);

  const start = () => {
    const seed = Date.now();
    setRound({ items: buildStonesRound(all, useProgress.getState().byCert[cert.id]?.cards, tier, createRng(seed), seed), tier });
    setI(0);
    setPlaced([]);
    setChecked(null);
    setPick(null);
    setScore(0);
    setHits([]);
    setMisses([]);
    setNews(null);
  };

  if (!round) {
    return (
      <GameIntro
        game="stones"
        icon={(col) => <Footprints size={48} color={col} strokeWidth={1.5} />}
        rules="Three processes, their steps shuffled. Tap the steps in order to build the path; tap a placed step to take it back. Each step rests on the one before it, and FIRST questions test exactly that."
        tiers={STONES_TIERS}
        tier={tier}
        onTier={setTier}
        tierName={STONES_TIER_NAME}
        tierLine={STONES_TIER_LINE}
        level={startingTier(cert.id, 'stones')}
        onStart={start}
      />
    );
  }

  const max = stonesMax(round.items);
  if (i >= round.items.length) {
    return (
      <RoundEnd certId={cert.id} game="stones" score={score} max={max} misses={misses} reviewNote={MISS_LINE} onAgain={start} news={news}>
        <T v="small" color={c.ink2}>On the exam, FIRST questions are order questions: picture the path and find the step everything else rests on.</T>
        <Gap h={space.md} />
      </RoundEnd>
    );
  }

  const item = round.items[i];
  const { seq } = item;
  const n = seq.steps.length;
  const last = i === round.items.length - 1;
  const done = item.missing ? pick !== null : checked !== null;

  /** One process settled: its card, its score, its hits, a miss line, and the round's end. */
  const settle = (points: number, stoneHits: boolean[], perfect: boolean, tag: string) => {
    useProgress.getState().recordCard(cert.id, stonesCardId(seq), perfect);
    const nextScore = score + points;
    const nextHits = [...hits, ...stoneHits];
    setScore(nextScore);
    setHits(nextHits);
    if (!perfect) setMisses((m) => [...m, { questionId: seq.id, stem: seq.title, tag, why: seq.caption, answerWrong: true }]);
    if (last) {
      setNews(
        finishGameRound(cert.id, 'stones', {
          score: nextScore,
          rate: nextHits.filter(Boolean).length / Math.max(1, nextHits.length),
          tier: round.tier,
          hits: nextHits,
        }),
      );
    }
  };

  const place = (step: number) => {
    if (checked || placed.includes(step)) return;
    const next = [...placed, step];
    setPlaced(next);
    AccessibilityInfo.announceForAccessibility(`Placed ${ordinal(item.given + next.length)}: ${seq.steps[step].label}.`);
  };
  const unplace = (step: number) => {
    if (checked) return;
    setPlaced(placed.filter((s) => s !== step));
    AccessibilityInfo.announceForAccessibility(`Taken back: ${seq.steps[step].label}.`);
  };
  const check = () => {
    const r = checkPath(item, placed);
    setChecked(r);
    settle(pathPoints(r.right, r.perfect), r.marks.map((m) => m.right), r.perfect, `${r.right} of ${n - item.given} steps in place`);
    AccessibilityInfo.announceForAccessibility(r.perfect ? 'Perfect path.' : `${r.right} of ${n - item.given} steps in place.`);
  };
  const choose = (k: number) => {
    if (!item.missing || pick !== null) return;
    setPick(k);
    const ok = k === item.missing.correct;
    settle(ok ? 1 : 0, [ok], ok, `Missing step: ${seq.steps[item.missing.index].label}`);
  };
  const next = () => {
    setI(i + 1);
    setPlaced([]);
    setChecked(null);
    setPick(null);
  };

  // The right order with each step's note, and the caption: the teaching payload.
  const explain = `${seq.steps.map((s, k) => `${k + 1}. ${s.label}: ${s.note}`).join('\n')}${seq.caption ? `\n\n${seq.caption}` : ''}`;
  const source = seq.lessonId ? (
    <Button kind="ghost" label="Open the lesson" onPress={() => router.push(`/lesson/${encodeURIComponent(seq.lessonId!)}`)} style={{ marginTop: space.sm }} />
  ) : seq.subtopicId ? (
    <Button kind="ghost" label="Read the note" onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(seq.subtopicId!)}`)} style={{ marginTop: space.sm }} />
  ) : null;

  const header = (
    <>
      <T v="caption" color={c.accentText}>{`Process ${i + 1} of ${round.items.length}`}</T>
      <T v="headline" accessibilityRole="header" style={{ marginTop: space.xs }}>{seq.title}</T>
    </>
  );

  // ── Heartwood: which step is missing? ──────────────────────────────────
  if (item.missing) {
    const m = item.missing;
    const state = (k: number): TileState => (pick === null ? 'idle' : k === m.correct ? 'correct' : k === pick ? 'wrong' : 'dimmed');
    return (
      <GameFrame
        title={GAMES.stones.name}
        index={i}
        total={round.items.length}
        score={score}
        footer={done ? <Button label={last ? 'See results' : 'Next process'} onPress={next} /> : <T v="label" center color={c.accentText}>Which step is missing?</T>}
      >
        {header}
        <Section title="The path" />
        {seq.steps.map((s, k) =>
          k === m.index ? (
            // The gap: a dashed slot, spoken as missing.
            <View
              key={k}
              accessible
              accessibilityLabel={`Step ${k + 1} is missing`}
              style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.control, padding: 12, marginBottom: space.sm, justifyContent: 'center' }}
            >
              <T v="label" color={c.ink2}>{`${k + 1}  · missing`}</T>
            </View>
          ) : (
            <MatchTile key={k} lead={String(k + 1)} text={s.label} state="idle" spoken={`Step ${k + 1}: ${s.label}`} />
          ),
        )}
        <Section title="Which step is missing?" />
        <View accessibilityRole="radiogroup" accessibilityLabel="Which step is missing?">
          {m.choices.map((label, k) => (
            <MatchTile
              key={label}
              text={label}
              state={state(k)}
              onPress={pick === null ? () => choose(k) : undefined}
              radio
              spoken={`Choice ${k + 1} of ${m.choices.length}: ${label}${pick !== null && k === m.correct ? ', the missing step' : pick === k ? ', your pick' : ''}`}
            />
          ))}
        </View>
        {pick !== null && (
          <View style={{ marginTop: space.sm }}>
            <RevealCard tone={pick === m.correct ? 'good' : 'bad'} title={pick === m.correct ? 'Found the missing step' : `The missing step: ${seq.steps[m.index].label}`} body={explain} />
            {pick !== m.correct && source}
          </View>
        )}
      </GameFrame>
    );
  }

  // ── Seedling / Sapling: build the path ─────────────────────────────────
  const unplacedStones = item.shown.filter((s) => !placed.includes(s));
  const pathFull = placed.length === n - item.given;
  const markFor = (k: number) => checked?.marks[k];
  return (
    <GameFrame
      title={GAMES.stones.name}
      index={i}
      total={round.items.length}
      score={score}
      footer={
        done ? (
          <Button label={last ? 'See results' : 'Next process'} onPress={next} />
        ) : pathFull ? (
          <Button label="Check the order" onPress={check} />
        ) : (
          <T v="label" center color={c.accentText}>{`Tap the ${ordinal(item.given + placed.length + 1)} step`}</T>
        )
      }
    >
      {header}
      <T v="meta" style={{ marginTop: space.xs }}>Tap the steps in order. Tap a placed step to take it back.</T>
      <Section title="Your path" />
      {Array.from({ length: item.given }, (_, k) => (
        <MatchTile key={`g${k}`} lead={String(k + 1)} text={seq.steps[k].label} state="idle" spoken={`Step ${k + 1}, given: ${seq.steps[k].label}`} />
      ))}
      {placed.map((step, k) => {
        const mark = markFor(k);
        const pos = item.given + k + 1;
        return (
          <MatchTile
            key={step}
            lead={String(pos)}
            text={mark && !mark.right ? `${seq.steps[step].label} · goes ${ordinal(mark.goes)}` : seq.steps[step].label}
            state={mark ? (mark.right ? 'correct' : 'wrong') : 'idle'}
            onPress={checked ? undefined : () => unplace(step)}
            spoken={
              mark
                ? `Step ${pos}: ${seq.steps[step].label}, ${mark.right ? 'right place' : `wrong place, it goes ${ordinal(mark.goes)}`}`
                : `Step ${pos}: ${seq.steps[step].label}. Tap to take it back.`
            }
          />
        );
      })}
      {Array.from({ length: n - item.given - placed.length }, (_, k) => (
        <View
          key={`e${k}`}
          accessible
          accessibilityLabel={`Step ${item.given + placed.length + k + 1}, empty`}
          style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.control, padding: 12, marginBottom: space.sm, justifyContent: 'center' }}
        >
          <T v="label" num color={c.ink2}>{String(item.given + placed.length + k + 1)}</T>
        </View>
      ))}
      {unplacedStones.length > 0 && (
        <>
          <Section title="Stones" />
          {unplacedStones.map((step) => (
            <MatchTile key={step} text={seq.steps[step].label} state="idle" onPress={() => place(step)} spoken={`Place next: ${seq.steps[step].label}`} />
          ))}
        </>
      )}
      {checked && (
        <View style={{ marginTop: space.sm }}>
          <RevealCard
            tone={checked.perfect ? 'good' : 'bad'}
            title={checked.perfect ? 'Perfect path' : `${checked.right} of ${n - item.given} steps in place`}
            body={explain}
          />
          {!checked.perfect && source}
        </View>
      )}
    </GameFrame>
  );
}
