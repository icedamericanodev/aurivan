/**
 * Daylight (id `daylight`) — "Answer at exam pace." (engine/games/daylight.ts)
 *
 * 1. Pick a light: Seedling / Sapling / Heartwood (the app suggests one
 *    from the learner's recent answer times).
 * 2. Five questions share ONE time budget, shown by the shared PaceStrip
 *    (components/pace.tsx): time left, a calm pace line and a pace bar.
 *    No per-question countdown. "Flag & move on" parks a question for later.
 * 3. When the budget runs out the light "sets": unanswered questions are
 *    shown with their answers, not marked wrong, and go to review without
 *    counting as answered.
 *
 * Accessibility (WCAG 2.2.1): the time limit IS the skill being trained, so
 * it falls under 2.2.1's "essential" exception; even so, Pause stops the
 * light (the question is hidden while paused), Seedling can add a minute
 * (up to 10 times), and with 10% of the light left a visible line says so
 * ("About a minute of light left. You can add a minute."). The pace is
 * announced at half time and with 10% left, and on request (tap the strip).
 * Focus moves to Resume after Pause, and back to the strip after Resume.
 * No red, no pulsing; Reduce Motion steps the pace bar.
 *
 * Both clocks reuse the answer clock (lib/useAnswerClock.ts): one for the
 * round's budget, one per question visit. Background time never counts.
 */
import { memo, useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { View } from 'react-native';
import { DrillAnswer } from '../../components/drillAnswer';
import type { ItemResult } from '../../components/drillKit';
import { GameFrame, GameIntro, LevelNote, PlayableGate, QuestionHead, RoundEnd, useRound } from '../../components/game';
import { GameGlyph } from '../../components/glyphs';
import { ICON_STROKE, Pause, Play } from '../../components/icons';
import { PaceStrip } from '../../components/pace';
import { OptionCard } from '../../components/quiz';
import { Button, groveCard, ICON_SIZE, Row, T, useFontScale } from '../../components/ui';
import { missCoach, oneStepVerdict } from '../../lib/drillVerdict';
import { getAllQuestions } from '../../content/loader';
import { LETTERS, type Letter } from '../../content/types';
import {
  answerCurrent,
  averageSeconds,
  budgetGone,
  buildDaylightRound,
  canExtend,
  daylightLine,
  lowLight,
  lowLightLine,
  tierCanExtend,
  atSurePace,
  canFlag,
  currentItem,
  DAYLIGHT_TIERS,
  daylightHits,
  daylightMax,
  daylightPace,
  daylightScore,
  extendBudget,
  finishedInBudget,
  flagCurrent,
  newDaylightRound,
  paceMarksDue,
  setLight,
  slowestItem,
  suggestTier,
  TIER_NAME,
  tierSeconds,
  type DaylightRound,
  type DaylightTier,
  type PaceMark,
} from '../../engine/games/daylight';
import { clip, pickMiss, type RecapMiss } from '../../engine/games/recap';
import { durationSpoken, durationText, formatClock, spokenClock, spokenClockCoarse } from '../../engine/pace';
import { secondsWords } from '../../engine/resultsCopy';
import { moveFocus, sayLater } from '../../lib/a11y';
import { createRng } from '../../engine/random';
import { displayToOriginal, isCorrect, originalToDisplay, renderText } from '../../engine/shuffle';
import { finishGameRound, type RoundNews } from '../../lib/gameRounds';
import { batchSaves } from '../../store/storage';
import { useAnswerClock } from '../../lib/useAnswerClock';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** The route: the game, or a calm "on the way" screen when this exam can't play it. */
export default function DaylightScreen() {
  return (
    <PlayableGate game="daylight">
      <Daylight />
    </PlayableGate>
  );
}

/** Announce after ~350 ms, so it doesn't cut off the tap's own feedback (P8). */
const say = (text: string) => sayLater(text);
/** A stem cut for one line, without a full stop before the "…" (O4). */
const clipStem = (stem: string, max = 70) => clip(stem, max).replace(/[.,;:?!]…$/, '…');

/**
 * Daylight's light strip (release bug hunt round 2). It holds the once-a-second tick itself, so only
 * the strip redraws each second: before, the whole round screen (the question and all four options)
 * redrew every second for the whole round.
 *
 * Each tick it does what the screen did: move the strip, set the light at the end of the budget, and
 * say the pace at half time and 10% left (`said` is the screen's, so a pace line is said once a round).
 * While the light waits (an answer showing, Pause, the round over) it reads the round clock once, so
 * the strip shows the time used up to that moment.
 */
const DaylightStrip = memo(function DaylightStrip({
  state,
  held,
  paused,
  readRound,
  setRound,
  said,
  stripRef,
}: {
  state: DaylightRound;
  held: boolean;
  paused: boolean;
  readRound: () => number;
  setRound: Dispatch<SetStateAction<DaylightRound | null>>;
  said: RefObject<PaceMark[]>;
  stripRef: RefObject<View | null>;
}) {
  // Lazy initialiser: read the round clock once on mount, not on every render.
  const [used, setUsed] = useState(() => readRound());
  // The light starts to wait (an answer, Pause, the round over): show the time used up to that moment
  // (it stands still meanwhile). React's "adjust state when a prop changes" pattern, not an effect.
  const [heldBefore, setHeldBefore] = useState(held);
  if (heldBefore !== held) {
    setHeldBefore(held);
    if (held) setUsed(readRound());
  }
  // Once a second while the light is up: move the strip, set the light at
  // the end of the budget, and say the pace at half time and 10% left.
  useEffect(() => {
    if (held) return;
    const t = setInterval(() => {
      const now = readRound();
      setUsed(now);
      if (budgetGone(state, now)) {
        setRound(setLight(state));
        say('The light has set. Unanswered questions are shown, not marked wrong.');
        return;
      }
      const due = paceMarksDue(state, now, said.current);
      if (due.length) {
        said.current = [...said.current, ...due];
        const line = daylightLine(daylightPace(state, now), canFlag(state));
        say(due.includes('tenthLeft') ? `${spokenClock(state.budgetMs - now)} of light left. ${lowLightLine(state)}` : `Half the light is gone. ${line}`);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [held, state, readRound, setRound, said]);

  const answered = Object.keys(state.answers).length;
  const remaining = Math.max(0, state.budgetMs - used);
  const status = daylightPace(state, used);
  // The light's last 10%: a visible line too, not only an announcement (P12).
  const low = lowLight(state, used);
  return (
    <PaceStrip
      ref={stripRef}
      // Spoken in whole minutes (U-H2); the precise time is for tap-to-hear only.
      clock={{ text: formatClock(remaining), spoken: `Light left ${spokenClockCoarse(remaining)}` }}
      clockUnit="left"
      line={
        paused
          ? { text: 'Paused. The light holds.', tone: 'note' }
          : low
            ? { text: lowLightLine(state), tone: 'soon' }
            : { text: daylightLine(status, canFlag(state)), tone: status }
      }
      lineShort={!paused && !low && status === 'behind' ? 'Behind pace' : undefined}
      // The pace bar steps once a second, no tween (PHASE4B 6.3 item 9).
      bar={{ done: answered / state.ids.length, used: used / state.budgetMs, step: true }}
      onRequest={() => say(`Light left ${spokenClock(remaining)}. ${paused ? 'Paused.' : low ? lowLightLine(state) : daylightLine(status, canFlag(state))}`)}
    />
  );
});

function Daylight() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();
  const large = useFontScale() >= LARGE_TEXT;
  const { round: items, seed, restart } = useRound(cert.id, (s) => buildDaylightRound(getAllQuestions(cert.id), createRng(s)));
  // The app's suggestion, from the learner's recent answer times (Build C `ms`).
  const suggested = useMemo(() => suggestTier(Object.values(progress.answers), cert.exam), [progress.answers, cert.exam]);
  const [tier, setTier] = useState<DaylightTier | null>(null);
  // Build F: once the learner has played, their own level is the starting
  // light; before that, the suggestion from their answer times.
  const level = progress.gameGrowth?.daylight?.tier;
  const chosen = tier ?? level ?? suggested;
  const [news, setNews] = useState<RoundNews | null>(null);
  const [state, setState] = useState<DaylightRound | null>(null);
  // Each visit to a question gets its own clock key (a parked one comes back fresh, keeping its time).
  const [visit, setVisit] = useState(0);
  // After an answer: the question just answered and the letter tapped (the light waits meanwhile).
  const [reveal, setReveal] = useState<{ id: string; display: Letter } | null>(null);
  const [paused, setPaused] = useState(false);
  // Focus targets: Resume after Pause, the strip after Resume (P9).
  const resumeRef = useRef<View>(null);
  const stripRef = useRef<View>(null);
  const [misses, setMisses] = useState<RecapMiss[]>([]);
  const said = useRef<PaceMark[]>([]);
  const fed = useRef(false);

  const playing = Boolean(state && !state.over);
  const held = !playing || paused || reveal !== null;
  const currentId = state ? currentItem(state) : null;
  const item = items.find((x) => x.q.id === currentId);
  // The round's light (budget) and this visit's time: both answer clocks.
  const readRound = useAnswerClock(state ? `daylight:${seed}` : undefined, held);
  const readVisit = useAnswerClock(state && currentId ? `daylight:${seed}:${visit}` : undefined, held);

  // The once-a-second tick (strip, light setting, pace lines) lives in DaylightStrip (above).

  // The round is over: feed progress ONCE. Answers were recorded as they
  // came; questions the light set on go to review WITHOUT counting as answered.
  useEffect(() => {
    if (!state?.over || fed.current) return;
    fed.current = true;
    // One save for the round's end: the review queue and the round's results together (release bug hunt round 3).
    batchSaves(() => {
      const p = useProgress.getState();
      if (state.timedOut.length) p.queueForReview(cert.id, state.timedOut);
      // The skill step is exam pace: each question answered before the light
      // set AND right (engine daylightHits), so speed alone never grows the level.
      const hits = daylightHits(state);
      const n = finishGameRound(cert.id, 'daylight', {
        score: daylightScore(state),
        rate: hits.filter(Boolean).length / Math.max(1, state.ids.length),
        tier: state.tier,
        hits,
        // Sure-Footed Pace: inside the light at Sapling pace or faster, with 4 of 5 right.
        counts: { paceRounds: atSurePace(state) ? 1 : 0 },
      });
      setNews(n);
    });
  }, [state, cert.id]);

  const begin = () => {
    said.current = [];
    fed.current = false;
    setNews(null);
    setMisses([]);
    setReveal(null);
    setPaused(false);
    setVisit(0);
    // The tier is locked into the round here (C2): a new suggestion can't change it mid-round.
    setState(newDaylightRound(items.map((x) => x.q.id), chosen, tierSeconds(chosen, cert.exam)));
  };

  // ── 1. Pick a light ────────────────────────────────────────────────────
  // Grove 4b (PHASE4B 6.6): the drills' intro with the three level markers as "Pick your light", the
  // picked light's seconds and the suggested line ("Suggested: ... from your recent answer times.").
  if (!state) {
    const sec = tierSeconds(chosen, cert.exam);
    // Each light's radio, spoken with its seconds (and "your level" once the learner has one).
    const spoken = Object.fromEntries(
      DAYLIGHT_TIERS.map((t) => [t, `${TIER_NAME[t]}${level === t ? ', your level' : ''}, ${tierSeconds(t, cert.exam)} seconds a question${t === suggested ? ', suggested' : ''}`]),
    ) as Record<DaylightTier, string>;
    return (
      <GameIntro
        game="daylight"
        rules={`${items.length} questions share one light. There is no countdown on each question: keep an eye on the pace line, and flag one that's stuck to come back to it. When the light sets, anything unanswered is shown, not marked wrong.`}
        tiers={DAYLIGHT_TIERS}
        tier={chosen}
        onTier={setTier}
        tierName={TIER_NAME}
        tierLine={spoken}
        spokenTier={spoken}
        level={level}
        pickTitle="Pick your light"
        onStart={begin}
        below={
          <>
            <T v="meta" num center style={{ marginTop: space.sm }}>
              {`${sec} seconds a question · ${durationText(Math.round((items.length * sec) / 60))} of light`}
            </T>
            {/* Release prep 2.0.0: its own line. On the line above it wrapped at 390pt with "time" alone. */}
            {tierCanExtend(chosen) ? <T v="meta" center>You can add time.</T> : null}
            {level ? (
              <LevelNote level={level} />
            ) : (
              <T v="meta" center style={{ marginTop: space.xs }}>{`Suggested: ${TIER_NAME[suggested]}, from your recent answer times.`}</T>
            )}
          </>
        }
      />
    );
  }

  // Grove 4b: each answered question, in the order answered, for the twig and the recap's squares.
  const roundItems: ItemResult[] = Object.values(state.answers).map((a) => (a.correct ? 'right' : 'missed'));

  // ── 3. The light has set, or every question is answered ────────────────
  if (state.over && reveal === null) {
    const avg = averageSeconds(state);
    const slow = slowestItem(state);
    const slowQ = slow ? items.find((x) => x.q.id === slow.id)?.q : undefined;
    const inBudget = finishedInBudget(state);
    // The round clock stands still once the round is over, so this reads the light used.
    const lightUsed = Math.min(readRound(), state.budgetMs);
    return (
      <RoundEnd
        certId={cert.id}
        game="daylight"
        score={daylightScore(state)}
        max={daylightMax(state.ids.length)}
        misses={misses}
        news={news}
        results={roundItems}
        onAgain={() => {
          restart();
          setState(null);
        }}
      >
        {/* PHASE4B 6.6: "This is where time went" as a headline in a card, as the Last 5 rounds card. */}
        <View testID="daylight-time" style={[groveCard(c), { padding: 16 }]}>
        <T v="headline" accessibilityRole="header">This is where time went</T>
        <View style={{ marginTop: space.sm, gap: space.xs }}>
          <T
            v="small"
            num
            accessibilityLabel={`Light used: ${spokenClock(lightUsed)} of ${durationSpoken(Math.round(state.budgetMs / 60_000))}${inBudget ? '. Finished in time, plus 1' : ''}`}
          >
            {`Light used: ${formatClock(lightUsed)} of ${formatClock(state.budgetMs)}${inBudget ? ' · finished in time, +1' : ''}`}
          </T>
          {avg !== null && <T v="small" num>{`Average ${secondsWords(avg)} a question · your light gave ${state.perItemSec} seconds`}</T>}
          {slow && slowQ && <T v="small">{`Slowest: ${secondsWords(slow.seconds)} on “${clipStem(slowQ.stem)}”`}</T>}
        </View>
        </View>
        {state.timedOut.length > 0 && (
          <View style={[groveCard(c), { marginTop: space.md, padding: 16 }]}>
            <T v="headline" accessibilityRole="header">The light set before these</T>
            <T v="meta" style={{ marginTop: space.xs }}>Shown, not marked wrong. They are in your review.</T>
            {state.timedOut.map((id, k) => {
              const it = items.find((x) => x.q.id === id);
              if (!it) return null;
              const best = originalToDisplay(it.q.correct, it.perm);
              return (
                <View
                  key={id}
                  accessible
                  accessibilityLabel={`${it.q.stem} Best answer ${best}: ${it.q.options[it.q.correct] ?? ''}`}
                  style={{ paddingVertical: 12, borderBottomWidth: k === state.timedOut.length - 1 ? 0 : 1, borderBottomColor: c.line }}
                >
                  <T v="meta">{clipStem(it.q.stem, 90)}</T>
                  <T v="small" style={{ marginTop: space.xs }}>{`Best answer ${best}: ${it.q.options[it.q.correct] ?? ''}`}</T>
                </View>
              );
            })}
          </View>
        )}
      </RoundEnd>
    );
  }

  // ── 2. Playing ─────────────────────────────────────────────────────────
  const shownId = reveal !== null ? reveal.id : currentId;
  const shown = items.find((x) => x.q.id === shownId);
  if (!shown) return null;
  const { q, perm } = shown;
  const letters = LETTERS.slice(0, perm.length);
  const answered = Object.keys(state.answers).length;
  const right = Object.values(state.answers).filter((a) => a.correct).length;

  const pick = (display: Letter) => {
    if (!item || reveal !== null || paused) return;
    const original = displayToOriginal(display, perm);
    const correct = isCorrect(q, display, perm);
    const next = answerCurrent(state, correct, readVisit());
    const ms = next.answers[q.id].ms;
    const p = useProgress.getState();
    // Feeds review like any practice answer; games never count toward mastery dates.
    // One save for the answer and its miss (release bug hunt round 3).
    batchSaves(() => {
      p.recordAnswer(cert.id, q.id, correct, undefined, { ms, mastery: false });
      if (!correct) p.recordMistake(cert.id, q.id, original);
    });
    if (!correct) {
      const miss = pickMiss(q, original, false, (t) => renderText(t, perm));
      if (miss) setMisses((m) => [...m, miss]);
    }
    setState(next);
    setReveal({ id: q.id, display });
  };

  const flag = () => {
    setState(flagCurrent(state, readVisit()));
    setVisit((v) => v + 1);
    say('Flagged. It comes back at the end if there is light left.');
  };

  const lastAnswer = state.answers[q.id];
  // Only the strip ticks (DaylightStrip); the question and its options stay as they are.
  const strip = <DaylightStrip state={state} held={held} paused={paused} readRound={readRound} setRound={setState} said={said} stripRef={stripRef} />;

  return (
    <GameFrame
      game="daylight"
      index={answered - (reveal !== null ? 1 : 0)}
      total={state.ids.length}
      score={right}
      results={roundItems}
      strip={strip}
      footer={
        reveal !== null ? (
          <Button
            label={state.over ? 'See results' : 'Next question'}
            onPress={() => {
              setReveal(null);
              setVisit((v) => v + 1);
            }}
          />
        ) : paused ? (
          <Button
            ref={resumeRef}
            label="Resume"
            onPress={() => {
              setPaused(false);
              say('Resumed.');
              moveFocus(stripRef);
            }}
            icon={(col) => <Play size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
          />
        ) : (
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            <Button
              kind="secondary"
              label="Pause"
              onPress={() => {
                setPaused(true);
                say('Paused. The light holds.');
                moveFocus(resumeRef);
              }}
              icon={(col) => <Pause size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
              style={large ? { flexBasis: '100%' } : { flex: 1 }}
            />
            {canFlag(state) && <Button kind="secondary" label="Flag & move on" onPress={flag} style={large ? { flexBasis: '100%' } : { flex: 1 }} />}
            {canExtend(state) && (
              <Button
                kind="ghost"
                label="Add a minute"
                accessibilityHint="Seedling only: adds a minute of light."
                onPress={() => {
                  setState(extendBudget(state));
                  say('A minute of light added.');
                }}
                style={{ flexBasis: '100%' }}
              />
            )}
          </Row>
        )
      }
    >
      {paused ? (
        // The question is hidden while paused: the light stops, so the reading does too.
        <View style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          <GameGlyph game="daylight" size={48} color={c.accent} />
          <T v="hero" center style={{ marginTop: space.md }}>Paused</T>
          <T v="body" center color={c.ink2} style={{ marginTop: space.xs }}>The light holds until you resume.</T>
        </View>
      ) : (
        <>
          {reveal !== null && lastAnswer ? (
            <DrillAnswer
              q={q}
              perm={perm}
              pick={reveal.display}
              animate={lastAnswer.correct}
              extra={`${Math.round(lastAnswer.ms / 1000)} s`}
              note="The light waits while you read this."
              verdict={oneStepVerdict({
                correct: lastAnswer.correct,
                best: originalToDisplay(q.correct, perm),
                missCoach: missCoach(q, displayToOriginal(reveal.display, perm), perm),
                extra: `${Math.round(lastAnswer.ms / 1000)} seconds`,
              })}
            />
          ) : (
            <>
              {state.flagged.includes(q.id) && <T v="caption" color={c.tip}>Flagged earlier</T>}
              <QuestionHead q={q} />
              {letters.map((d) => (
                <OptionCard key={d} letter={d} text={q.options[displayToOriginal(d, perm)] ?? ''} state="idle" onPress={() => pick(d)} />
              ))}
            </>
          )}
        </>
      )}
    </GameFrame>
  );
}
