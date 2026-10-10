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
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GameFrame, PlayableGate, QuestionHead, RevealCard, RoundEnd, useRound } from '../../components/game';
import { ICON_STROKE, Pause, Play, Sunrise } from '../../components/icons';
import { PaceStrip } from '../../components/pace';
import { OptionCard, type OptionState } from '../../components/quiz';
import { Button, Gap, ICON_SIZE, PushedHeader, Row, Section, Segmented, T, useFontScale } from '../../components/ui';
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
  canFlag,
  currentItem,
  DAYLIGHT_TIERS,
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
import { GAMES } from '../../engine/games/registry';
import { durationSpoken, durationText, formatClock, spokenClock, spokenClockCoarse } from '../../engine/pace';
import { moveFocus, sayLater } from '../../lib/a11y';
import { createRng } from '../../engine/random';
import { displayToOriginal, isCorrect, originalToDisplay, renderText } from '../../engine/shuffle';
import { logGame } from '../../lib/activity';
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

function Daylight() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();
  const large = useFontScale() >= LARGE_TEXT;
  const { round: items, seed, restart } = useRound(cert.id, (s) => buildDaylightRound(getAllQuestions(cert.id), createRng(s)));
  // The app's suggestion, from the learner's recent answer times (Build C `ms`).
  const suggested = useMemo(() => suggestTier(Object.values(progress.answers), cert.exam), [progress.answers, cert.exam]);
  const [tier, setTier] = useState<DaylightTier | null>(null);
  const chosen = tier ?? suggested;
  const [state, setState] = useState<DaylightRound | null>(null);
  // Each visit to a question gets its own clock key (a parked one comes back fresh, keeping its time).
  const [visit, setVisit] = useState(0);
  // After an answer: the question just answered and the letter tapped (the light waits meanwhile).
  const [reveal, setReveal] = useState<{ id: string; display: Letter } | null>(null);
  const [paused, setPaused] = useState(false);
  // Focus targets: Resume after Pause, the strip after Resume (P9).
  const resumeRef = useRef<View>(null);
  const stripRef = useRef<View>(null);
  const [used, setUsed] = useState(0);
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

  // Once a second while the light is up: move the strip, set the light at
  // the end of the budget, and say the pace at half time and 10% left.
  useEffect(() => {
    if (held || !state) return;
    const t = setInterval(() => {
      const now = readRound();
      setUsed(now);
      if (budgetGone(state, now)) {
        setState(setLight(state));
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
  }, [held, state, readRound]);

  // The round is over: feed progress ONCE. Answers were recorded as they
  // came; questions the light set on go to review WITHOUT counting as answered.
  useEffect(() => {
    if (!state?.over || fed.current) return;
    fed.current = true;
    const p = useProgress.getState();
    if (state.timedOut.length) p.queueForReview(cert.id, state.timedOut);
    p.recordGame(cert.id, 'daylight', daylightScore(state));
    logGame(cert.id, 'daylight');
  }, [state, cert.id]);

  const begin = () => {
    said.current = [];
    fed.current = false;
    setMisses([]);
    setReveal(null);
    setPaused(false);
    setUsed(0);
    setVisit(0);
    // The tier is locked into the round here (C2): a new suggestion can't change it mid-round.
    setState(newDaylightRound(items.map((x) => x.q.id), chosen, tierSeconds(chosen, cert.exam)));
  };

  // ── 1. Pick a light ────────────────────────────────────────────────────
  if (!state) {
    const sec = tierSeconds(chosen, cert.exam);
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ paddingHorizontal: space.gutter }}>
          <PushedHeader icon="close" onBack={() => router.back()} title={GAMES.daylight.name} />
        </View>
        <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: space.xxl }}>
          <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ alignItems: 'center' }}>
            <Sunrise size={48} color={c.accent} strokeWidth={1.5} />
          </View>
          <T v="caption" center color={c.accentText} style={{ marginTop: space.sm }}>{GAMES.daylight.skill}</T>
          <T v="hero" center accessibilityRole="header" style={{ marginTop: space.xs }}>{GAMES.daylight.tagline}</T>
          <T v="body" color={c.ink2} style={{ marginTop: space.md }}>
            {`${items.length} questions share one light. There is no countdown on each question: keep an eye on the pace line, and flag one that's stuck to come back to it. When the light sets, anything unanswered is shown, not marked wrong.`}
          </T>
          <Section title="Pick your light" />
          <Gap h={space.sm} />
          <Segmented
            accessibilityLabel="Pick your light"
            value={chosen}
            onChange={setTier}
            options={DAYLIGHT_TIERS.map((t) => ({
              value: t,
              label: TIER_NAME[t],
              spoken: `${TIER_NAME[t]}, ${tierSeconds(t, cert.exam)} seconds a question${t === suggested ? ', suggested' : ''}`,
            }))}
          />
          <T v="meta" num center style={{ marginTop: space.sm }}>
            {`${sec} s a question · ${durationText(Math.round((items.length * sec) / 60))} of light${tierCanExtend(chosen) ? ' · you can add time' : ''}`}
          </T>
          <T v="meta" center style={{ marginTop: space.xs }}>{`Suggested: ${TIER_NAME[suggested]}, from your recent answer times.`}</T>
          <Gap h={space.xl} />
          <Button label="Start" onPress={begin} icon={(col) => <Play size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 3. The light has set, or every question is answered ────────────────
  if (state.over && reveal === null) {
    const avg = averageSeconds(state);
    const slow = slowestItem(state);
    const slowQ = slow ? items.find((x) => x.q.id === slow.id)?.q : undefined;
    const inBudget = finishedInBudget(state);
    const lightUsed = Math.min(used, state.budgetMs);
    return (
      <RoundEnd
        certId={cert.id}
        game="daylight"
        score={daylightScore(state)}
        max={daylightMax(state.ids.length)}
        misses={misses}
        onAgain={() => {
          restart();
          setState(null);
        }}
      >
        <T v="headline" accessibilityRole="header">This is where time went</T>
        <View style={{ marginTop: space.sm, gap: space.xs }}>
          <T
            v="small"
            num
            accessibilityLabel={`Light used: ${durationSpoken(Math.round(lightUsed / 60_000))} of ${durationSpoken(Math.round(state.budgetMs / 60_000))}${inBudget ? '. Finished in time, plus 1' : ''}`}
          >
            {`Light used: ${formatClock(lightUsed)} of ${formatClock(state.budgetMs)}${inBudget ? ' · finished in time, +1' : ''}`}
          </T>
          {avg !== null && <T v="small" num>{`Average ${avg} s a question · your light gave ${state.perItemSec} s`}</T>}
          {slow && slowQ && <T v="small">{`Slowest: ${slow.seconds} s on “${clipStem(slowQ.stem)}”`}</T>}
        </View>
        {state.timedOut.length > 0 && (
          <View style={{ marginTop: space.lg }}>
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
        <Gap h={space.md} />
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
  const remaining = Math.max(0, state.budgetMs - used);
  const status = daylightPace(state, used);
  // The light's last 10%: a visible line too, not only an announcement (P12).
  const low = lowLight(state, used);
  const right = Object.values(state.answers).filter((a) => a.correct).length;

  const pick = (display: Letter) => {
    if (!item || reveal !== null || paused) return;
    const original = displayToOriginal(display, perm);
    const correct = isCorrect(q, display, perm);
    const next = answerCurrent(state, correct, readVisit());
    const ms = next.answers[q.id].ms;
    const p = useProgress.getState();
    // Feeds review like any practice answer; games never count toward mastery dates.
    p.recordAnswer(cert.id, q.id, correct, undefined, { ms, mastery: false });
    if (!correct) {
      p.recordMistake(cert.id, q.id, original);
      const miss = pickMiss(q, original, false, (t) => renderText(t, perm));
      if (miss) setMisses((m) => [...m, miss]);
    }
    setUsed(readRound());
    setState(next);
    setReveal({ id: q.id, display });
  };

  const flag = () => {
    setState(flagCurrent(state, readVisit()));
    setVisit((v) => v + 1);
    say('Flagged. It comes back at the end if there is light left.');
  };

  const stateFor = (display: Letter): OptionState => {
    if (reveal === null) return 'idle';
    if (displayToOriginal(display, perm) === q.correct) return 'correct';
    return display === reveal.display ? 'wrong' : 'dimmed';
  };

  const lastAnswer = state.answers[q.id];
  const strip = (
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
      bar={{ done: answered / state.ids.length, used: used / state.budgetMs }}
      onRequest={() => say(`Light left ${spokenClock(remaining)}. ${paused ? 'Paused.' : low ? lowLightLine(state) : daylightLine(status, canFlag(state))}`)}
    />
  );

  return (
    <GameFrame
      title={GAMES.daylight.name}
      index={answered - (reveal !== null ? 1 : 0)}
      total={state.ids.length}
      score={right}
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
                setUsed(readRound());
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
          <View accessible={false} importantForAccessibility="no-hide-descendants">
            <Sunrise size={48} color={c.accent} strokeWidth={1.5} />
          </View>
          <T v="hero" center style={{ marginTop: space.md }}>Paused</T>
          <T v="body" center color={c.ink2} style={{ marginTop: space.xs }}>The light holds until you resume.</T>
        </View>
      ) : (
        <>
          {state.flagged.includes(q.id) && reveal === null && <T v="caption" color={c.tip}>Flagged earlier</T>}
          <QuestionHead q={q} />
          {letters.map((d) => (
            <OptionCard
              key={d}
              letter={d}
              text={q.options[displayToOriginal(d, perm)] ?? ''}
              state={stateFor(d)}
              disabled={reveal !== null}
              onPress={() => pick(d)}
            />
          ))}
          {reveal !== null && lastAnswer && (
            <>
              <Gap h={space.sm} />
              <RevealCard
                tone={lastAnswer.correct ? 'good' : 'bad'}
                title={lastAnswer.correct ? `Correct · ${Math.round(lastAnswer.ms / 1000)} s` : `Best answer: ${originalToDisplay(q.correct, perm)} · ${Math.round(lastAnswer.ms / 1000)} s`}
                body={renderText(q.explanation, perm)}
              />
              <T v="meta" style={{ marginTop: space.sm }}>The light waits while you read this.</T>
            </>
          )}
        </>
      )}
    </GameFrame>
  );
}
