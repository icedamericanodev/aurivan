/**
 * Build D: a timed mock shows a Pacing panel (components/pace.tsx) under
 * the stats; an untimed one is labelled and says pacing stats skip it.
 * Practice and review always show one pace line ("Median 74 s per
 * question · exam pace 96 s"), and a question that went wrong fast or ran
 * long but right gets a coaching tag. Coaching, never a penalty.
 *
 * Results — score rings per domain (Grove v2 growth rings in domain tones,
 * replacing the old ring and bars), the stat row, and a question-by-question
 * review (your answer vs the best answer). "Practice what I missed"
 * turns mistakes straight into a new session.
 *
 * Build F: when this session earned a milestone, ONE quiet moment sits under
 * the stats (components/milestones.tsx): no confetti, one success haptic,
 * static with Reduce Motion. Any others earned wait for later sessions.
 * Mobile 1.10: the badge moment comes AFTER the score and the review actions
 * ("Practice the ones you missed", "Done"), before the answer list, so the
 * learning comes first; its motion waits until it is scrolled into view. One
 * "Next:" line under it names the best next badge for the exam.
 *
 * Mobile 1.20: under "Practice the N you missed", a ghost "Notes for what
 * you missed" (with a turning chevron) opens up to three study-note rows (most-missed
 * first). It is the only notes path for a mock's misses (a mock shows no
 * answer screen), so it works for every session kind.
 *
 * Mobile 1.22 (design spec §8): a one-domain session shows the ring alone,
 * centred, with one line under it ("All IS Audit · 2 of 3"); "Done" is a
 * centred ghost under the one primary; the notes expander ("Notes for what
 * you missed", the 1.20 label) sits just above "Review answers".
 *
 * Mobile 1.24 (honest results):
 * - The headline is by sample size (engine/resultsCopy.ts): under 8 answers it
 *   is the plain count ("3 of 4 right", with the topic most missed beneath), never
 *   "Strong work." or "Every miss is a lesson." on a handful of questions. The count is said
 *   once, in the headline: the ring's centre names the domain (one domain) or stays empty, and
 *   the stat row leaves out "Correct" (UX review S7).
 * - The per-question "Hint used / Quick pick / Missed" tags are one quiet line.
 * - When enough answers were rated: "How sure you felt: Sure 7 of 9 right · Unsure 2 of 4 right".
 * - "Practice the N you missed" is a secondary button; Done is the one solid button (a miss
 *   re-answered minutes later is a retest and earns no spacing credit).
 * - A mock that ended on the clock says "Time’s up" (seen and spoken).
 * - Android Back leaves Results instead of silently abandoning the review (a mock asks first).
 *
 * Mobile 1.43 (board 2, owner decisions; design spec §11 "Results, mobile 1.43"):
 * - The headline is always the count ("8 of 10 right"), never a verdict first.
 * - A leaf strip shows which questions went right (practice and review up to 20;
 *   one line instead on a mock or a longer set). No "Correct" / "Missed" cells:
 *   Time, and Per question beside the exam pace.
 * - "The 2 you missed come back tomorrow" on the paper (true: engine/srs.ts now
 *   schedules a miss for the next local day), never on a mock; a clean set gets
 *   its own line. "What you missed" shows the note rows open, grouped by note
 *   with their question numbers, and "See answers" jumps to Review answers.
 * - "Practice the N you missed" is a quiet ghost link under Done.
 *
 * Mobile 1.51 (Field Guide, the owner's signature pick; DESIGN_SYSTEM.md §21): Results is a plate.
 * - A running head names the set ("Practice · IS Operations"); the headline stays the count.
 * - The rings give way to Fig. 6, the GROWTH plate: the areas this set asked about on one scale,
 *   now, with the set's change where both ends have a number (a set remembers where each area
 *   stood when it began, `ActiveSession.before`): "↑3" in clay, a drop "↓2" in calm ink, "3 of 4
 *   this set" under each. One area that moved also gets "58 → 61%" and a line in words. Areas with
 *   too few answers yet draw the empty mount ("Plate not yet drawn"). A NOTE under it: readiness as
 *   a study estimate. The honest-count rules are unchanged (no percent of a handful).
 * - Time and pace are ruled label rows; "What you missed" is a key list (✗, the note, its questions);
 *   Done is the plate button.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, View } from 'react-native';
import { LeafStrip } from '../components/leafStrip';
import { OptionCard, PickNote, TrustLine } from '../components/quiz';
import { QuestionNote } from '../components/questionNote';
import { useReportFlow } from '../components/support';
import { todayMinutes } from '../components/journey';
import { EmptyPlate, FieldText, KeyCaption, KeyList, Plate, RunningHead, SpecimenLabel, SpecimenRow, StemChart } from '../components/fieldguide';
import { emptyPlateLine, growthFigure, setStems } from '../engine/fieldGuide';
import { STEADY_FROM } from '../engine/domainBand';
import { readinessFor } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { PacingPanel } from '../components/pace';
import { FirstSetDone } from '../components/firstSet';
import { MilestoneMomentView } from '../components/milestones';
import { useOncePerDay } from '../components/motion';
import { ICON_STROKE, Sprout } from '../components/icons';
import { BigNum, Button, Enter, Gap, ICON_SIZE, InviteRow, Row, Screen, Section, T, useScreenScroll } from '../components/ui';
import { getCertification } from '../content/certifications';
import { findQuestion } from '../content/loader';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { missedNoteGroups } from '../engine/outline';
import { legacyTitle } from '../engine/planner';
import {
  calibrationLine,
  CLEAN_SET_NOTICE,
  missedLine,
  missedNotice,
  moreMissedLine,
  noteKicker,
  resultsHeadline,
  SMALL_SAMPLE,
  smallSampleFact,
  STRIP_MAX,
  TIMES_UP_DETAIL,
  TIMES_UP_LINE,
  type LeafState,
} from '../engine/resultsCopy';
import { moveFocus, sayLater } from '../lib/a11y';
import { displayToOriginal, originalToDisplay, renderText } from '../engine/shuffle';
import { aboutMin, COACHING, coachingTag, practicePace, spokenMin, timeStat, TIMING_LABEL } from '../engine/pace';
import { msUsed, scoreSession, sessionPacing } from '../lib/finishSession';
import { trapTip } from '../engine/games/trapSpotter';
import { badgeNextLine } from '../lib/badges';
import { momentFor } from '../lib/milestones';
import { startFromIds } from '../lib/sessions';
import { runPlanItem } from '../lib/actions';
import { currentIndex, planComplete } from '../engine/dayPlan';
import { dayKey } from '../engine/streak';
import { selectCert, useProgress } from '../store/progress';
import { questionTarget, sessionWhere } from '../lib/support';
import { useSession } from '../store/session';
import { motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export default function Results() {
  const { c } = useTheme();
  const active = useSession((s) => s.active);
  const clear = useSession((s) => s.clear);
  const [openId, setOpenId] = useState<string | null>(null);
  // Mobile 1.43: "What you missed" → "See answers" jumps to the Review answers heading.
  const reviewHead = useRef<View>(null);
  const score = useMemo(() => (active ? scoreSession(active) : null), [active]);
  // Mobile 1.51: the areas now, for the growth plate (read from the saved answers, which this set already updated).
  const answersNow = useProgress((s) => (active ? selectCert(s, active.certId).answers : undefined));
  // Mock pacing: time used, median, checks, unanswered, last 10%, slowest domain.
  const pacing = useMemo(() => (active?.mode === 'mock' && active.deadline ? sessionPacing(active) : null), [active]);
  // The one milestone this session celebrates (lib/finishSession.ts picked it).
  const certId = active?.certId;
  const milestoneKey = active?.milestone;
  const moment = useMemo(() => (certId && milestoneKey ? momentFor(certId, milestoneKey, badgeNextLine(certId)) : null), [certId, milestoneKey]);
  // "Something not working? Report a bug" at the end of the review (mobile 1.7).
  const bug = useReportFlow(certId ?? 'cisa', {
    kind: 'app',
    id: 'session-results',
    name: 'Results',
    where: `Results · ${active?.mode === 'mock' ? 'mock' : active?.mode === 'review' ? 'review' : 'practice'}, ${active?.questionIds.length ?? 0} questions`,
  });

  // Mobile 1.9: the session's outcome grows in ONCE (this session's Results,
  // after the screen has dissolved in): the rings from 0 to the score, the
  // score in their centre and "correct" roll up, 60 ms apart (≤ 3 growths).
  // Never on a session that went badly: below 60% it is simply shown.
  // Keyed only by a FINISHED session (mobile 1.20): a Results left under a new,
  // unfinished set must never use up that set's one growth.
  const firstLook = useOncePerDay(active?.finishedAt ? `results:${active.id}` : 'results:unfinished');
  // The milestone moment plays when it is scrolled into view, not off-screen.
  const [statsY, setStatsY] = useState<number | null>(null);
  const [momentY, setMomentY] = useState<number | null>(null);
  const [momentSeen, setMomentSeen] = useState(false);
  // The scroll position lives in a ref: a scroll event never re-renders the
  // screen (a mock's review list is long); only the moment being seen does.
  const view = useRef({ y: 0, h: 0 });
  // Latched: once its top is 96pt into the screen, it has been seen.
  const check = useCallback(() => {
    const { y, h } = view.current;
    if (statsY !== null && momentY !== null && h > 0 && statsY + momentY < y + h - 96) setMomentSeen(true);
  }, [statsY, momentY]);
  const watch = (y: number, h: number) => {
    view.current = { y, h };
    check();
  };
  // Laid out after the last scroll event (or with no scroll at all): check again.
  useEffect(check, [check]);
  // A new drag skips a playing moment to its end (motion.md §2.7: any tap or scroll).
  const skipMoment = useRef<(() => void) | null>(null);
  // One signature at a time: the moment also waits for the rings to settle.
  const growing = Boolean(firstLook && score && active && Math.round((score.correct / (active.mode === 'mock' ? score.total : Math.max(score.answered, 1))) * 100) >= 60);
  const [ringsDone, setRingsDone] = useState(!growing);
  useEffect(() => {
    if (ringsDone) return;
    // A one-shot timer for a phase change: the screen's dissolve, the growth, the outer-to-inner stagger.
    const t = setTimeout(() => setRingsDone(true), motion.dur.select + motion.dur.grow + 4 * motion.stagger.stat);
    return () => clearTimeout(t);
  }, [ringsDone]);

  // Android Back: leave Results like "Done" does (a mock asks first, since its answer review is
  // not reachable again). Set below, once the session is known (a ref, so the one handler
  // registered here always calls the newest version).
  const backRef = useRef<() => void>(() => router.replace('/home'));
  // Mobile 1.24: a finished first set shows the Day-1 closing screen, which has its own Back
  // ("Done for today", components/firstSet.tsx). Results registers none then: Android calls the
  // newest handler first, so a second one here would run instead and leave the set uncleared.
  const closingScreen = Boolean(active?.firstSet && active.finishedAt && score);
  useFocusEffect(
    useCallback(() => {
      if (closingScreen) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        backRef.current();
        return true;
      });
      return () => sub.remove();
    }, [closingScreen]),
  );
  // A timed mock that ended on the clock says so, once, out loud (the line is on screen too).
  const timedOut = Boolean(pacing?.timedOut);
  useEffect(() => {
    if (timedOut) sayLater(`${TIMES_UP_LINE} ${TIMES_UP_DETAIL}`);
  }, [timedOut]);

  // Results only ever describes a finished session. An unfinished one (a new set
  // started while this screen was still in the stack) shows the empty state, never
  // a half-scored set (mobile 1.20).
  if (!active || !score || !active.finishedAt) {
    return (
      <Screen>
        <T v="hero">No results to show.</T>
        <Gap />
        <Button label="Back to Today" onPress={() => router.replace('/home')} />
      </Screen>
    );
  }

  // Mobile 1.24: the first set (the same five questions for everyone) ends on its own
  // closing screen, not on this page (components/firstSet.tsx).
  if (active.firstSet) return <FirstSetDone session={active} />;

  const cert = getCertification(active.certId)!;
  const denominator = active.mode === 'mock' ? score.total : Math.max(score.answered, 1);
  const pct = Math.round((score.correct / denominator) * 100);
  // Missed: answered wrong. On a mock, a question left blank is missed too (it
  // counts as not correct in "Correct n of total"), so Correct + Missed = total.
  const missed = active.questionIds.filter((id) => (active.responses[id] ? !active.responses[id].correct : active.mode === 'mock'));
  const blank = active.mode === 'mock' ? active.questionIds.filter((id) => !active.responses[id]).length : 0;
  // Mobile 1.43: up to three study notes behind the misses, most-missed first, each with the
  // question numbers it explains ("questions 3 and 7"). Only notes that exist count, so the limit
  // of three applies AFTER an unknown id is dropped; `rest` = misses no row covers.
  const missedSet = new Set(missed);
  const noteGroups = missedNoteGroups(active.questionIds, (id) => missedSet.has(id), (id) => {
    const sub = subtopicOfQuestion(cert.id, id);
    return sub && findNote(cert.id, sub) ? sub : undefined;
  });
  const missedNotes = noteGroups.groups.map((g) => {
    const note = findNote(cert.id, g.id)!;
    return { ...g, name: note.name, minutes: note.minutes ?? 2 };
  });
  const done = () => {
    clear();
    router.replace('/home');
  };
  // Android Back (see backRef above): "Done" for practice; a mock asks first.
  // It is set during render and only read in the back-button event, never during render.
  // eslint-disable-next-line react-hooks/refs
  backRef.current =
    active.mode === 'mock'
      ? () =>
          Alert.alert('Leave your results?', 'Your score is saved. Leaving closes this page, so you cannot open the answer review again.', [
            { text: 'Stay', style: 'cancel' },
            { text: 'Leave', onPress: done },
          ])
      : done;
  // Mobile 1.24: small samples get the count, not a verdict (engine/resultsCopy.ts).
  const tiny = active.mode !== 'mock' && score.answered < SMALL_SAMPLE;
  const headline = resultsHeadline(score.correct, active.mode === 'mock' ? score.total : score.answered);
  // The one fact beneath a small-sample headline: the note, else the domain, most missed.
  const missedDomain = (() => {
    const tally: Record<string, number> = {};
    for (const id of missed) {
      const d = findQuestion(cert.id, id)?.domainId;
      if (d) tally[d] = (tally[d] ?? 0) + 1;
    }
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
    return cert.domains.find((d) => d.id === top)?.short;
  })();
  const fact = tiny ? smallSampleFact(missedNotes[0]?.name ?? missedDomain, missed.length) : null;
  // "How sure you felt: Sure 7 of 9 right · Unsure 2 of 4 right" (practice and review: a mock records no ratings).
  const calibration = active.mode === 'mock' ? null : calibrationLine(active.questionIds.map((id) => ({ confidence: active.responses[id]?.confidence, correct: Boolean(active.responses[id]?.correct) })));

  // Build E: a Guided step goes back to its step screen (topic clear, or next topic).
  const guidedScope = active.path?.mode === 'guided' ? active.path.scope : null;
  const backToGuided = () => {
    // The next step keeps this step's Timed choice ("1" / "0", see app/guided.tsx).
    const params = { ...(guidedScope && guidedScope !== 'all' ? { domain: guidedScope } : {}), timed: active.timed ? '1' : '0' };
    clear();
    // Go back to the Guided screen already in the stack (it opened this
    // session), instead of stacking a second one on top (code review).
    if (router.canDismiss()) router.dismissTo({ pathname: '/guided', params });
    else router.replace({ pathname: '/guided', params });
  };

  // Mobile 1.47: a Quick question (from the widget or the app; since 1.48 also the Recall card's
  // question) hands back to today's plan, if it has time left: "Today's plan · about N min left",
  // Continue or Done for now. Read once (not a live value).
  const oneQuestion = active.title === 'Quick question' || active.title === 'Recall card';
  const todayPlan = oneQuestion && active.mode !== 'mock' && !guidedScope ? useProgress.getState().days[active.certId] : undefined;
  const planLeft = todayPlan && todayPlan.day === dayKey(active.finishedAt ?? active.startedAt) && !planComplete(todayPlan) ? todayMinutes(todayPlan.items, todayPlan.done) : 0;
  const continuePlan = () => {
    const plan = todayPlan;
    clear();
    router.replace('/home');
    if (plan) runPlanItem(plan.items[currentIndex(plan)], cert.id);
  };

  const practiseMissed = () => {
    const ids = [...missed];
    clear();
    if (startFromIds(cert.id, ids, 'Missed questions')) router.replace('/session');
    else router.replace('/home');
  };

  // The areas this session asked about (the growth plate draws only these, ui.md R1).
  const inSession = cert.domains.map((d, i) => (score.byDomain[d.id] ? i : -1)).filter((i) => i >= 0);
  const oneDomain = inSession.length === 1 ? cert.domains[inSession[0]] : undefined;
  // Mobile 1.43: "Per question" beside the exam's own pace (Build C answer times). A timed mock's
  // Pacing panel already gives its typical time per question, so it is not said twice there.
  const pace = pacing ? null : practicePace(active.questionIds.map((id) => active.responses[id]?.ms), cert.exam);
  // Mobile 1.43: one leaf per question (practice and review sets up to 20); a mock or a longer set
  // gets one line instead. Misses scheduled for tomorrow (engine/srs.ts) are said once, on the paper.
  const isMock = active.mode === 'mock';
  const strip = !isMock && active.questionIds.length <= STRIP_MAX;
  const leafStates: LeafState[] = active.questionIds.map((id) => (active.responses[id] ? (active.responses[id].correct ? 'right' : 'missed') : 'blank'));
  const notice = isMock || score.answered === 0 ? null : missed.length ? missedNotice(missed.length) : CLEAN_SET_NOTICE;
  const moreLine = moreMissedLine(noteGroups.rest, isMock);
  // The same time the mock history, pacing panel and Today use (a timed mock's
  // clock; otherwise answer time), as a stat that reads plainly ("Under 1 min", "24 min").
  const time = timeStat(msUsed(active, active.finishedAt ?? active.startedAt));
  const grow = growing;
  // Mobile 1.51: the growth plate's facts (engine/fieldGuide.ts), and readiness now for its NOTE.
  const readinessNow = readinessFor(cert, answersNow ?? {});
  const range = readinessRange(cert, readinessNow);
  const stems = setStems(cert.domains, readinessNow.domains, score.byDomain, active.before);
  const plateLine = emptyPlateLine(stems);
  const figure = stems.length === 1 ? growthFigure(stems[0]) : null;
  const plateTitle = stems.length === 1 ? `${stems[0].name}${figure && !figure.down ? ', new growth' : ''}` : 'This set’s areas';

  return (
    <Screen edges={['top', 'bottom']} onScroll={moment && !momentSeen ? watch : undefined} onScrollBeginDrag={moment ? () => skipMoment.current?.() : undefined}>
      <Enter i={0}>
        {/* Mobile 1.51: the running head names the set. Extra time and untimed mocks say so (standard time is the norm). */}
        <RunningHead section={active.mode === 'mock' && active.timing && active.timing !== 'standard' ? `${active.title} · ${TIMING_LABEL[active.timing].toLowerCase()}` : legacyTitle(active.title)} />
        {/* A timed mock that ended on the clock says so first (seen here, spoken by the effect above). */}
        {timedOut && (
          <View accessible accessibilityLabel={`${TIMES_UP_LINE} ${TIMES_UP_DETAIL}`} style={{ marginTop: space.sm }}>
            <T v="label" color={c.clay}>{TIMES_UP_LINE}</T>
            <T v="meta">{TIMES_UP_DETAIL}</T>
          </View>
        )}
        <T v="display" accessibilityRole="header" style={{ marginTop: space.lg }}>{headline}</T>
        {fact && <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>{fact}</T>}
        {/* A one-domain set (no ring) names its domain once (mobile 1.43: no percent, the headline is the count). */}
        {!fact && !tiny && oneDomain && !isMock && <T v="meta" style={{ marginTop: space.sm }}>{`All ${oneDomain.short}`}</T>}
      </Enter>

      {/* Mobile 1.51 (Field Guide): Fig. 6, the growth plate. The areas this set asked about, now, on one scale,
          with this set's change where both ends have a number; "Plate not yet drawn" while none has one. */}
      <Enter i={1} style={{ marginTop: space.xl }}>
        {plateLine ? (
          <EmptyPlate fig={{ n: 6, title: plateTitle }} body={plateLine} />
        ) : (
          <Plate tight fig={{ n: 6, title: plateTitle }} testID="results-plate">
            {figure && (
              <View accessible accessibilityLabel={`${figure.spoken}. ${figure.line}.`} style={{ marginHorizontal: space.sm, marginBottom: space.sm }}>
                <BigNum value={figure.shown.replace('%', '')} pct size={30} color={c.ink} />
                <FieldText v="fig">{figure.line}</FieldText>
              </View>
            )}
            {/* Premium round 2 (#2): with where the set began, only what grew moves; an older session traces in. */}
            <StemChart stems={stems} line={STEADY_FROM} play={grow ? (active.before ? 'growth' : 'trace') : false} delay={motion.dur.enter + motion.stagger.group} />
          </Plate>
        )}
        {range.enough && (
          <KeyCaption label="NOTE">{`Readiness is ${range.low}–${range.high}%: a study estimate, not a prediction.`}</KeyCaption>
        )}
      </Enter>

      {/* Mobile 1.43: which ones, at a glance (up to 20 practice questions), or one line (a mock, a longer set). */}
      <Enter i={2} style={{ marginTop: space.xl }}>
        {strip ? <LeafStrip states={leafStates} /> : <T v="meta">{missedLine(missed.length, blank)}</T>}
      </Enter>

      <View style={{ marginTop: space.xl }} onLayout={(e) => setStatsY(e.nativeEvent.layout.y)}>
      <Enter i={3}>
        {/* Mobile 1.43: the count is said once, in the headline, so there is no "Correct" or "Missed" cell:
            the time, and the time per question beside the exam's own pace. */}
        {/* Mobile 1.51: ruled label rows, never tiles. */}
        <SpecimenLabel testID="results-stats">
          {/* The set's score where the rings showed one (a mixed set or a mock, with enough answers for a percent to
              mean something; a one-area set says its count in the headline only, mobile 1.43). It rolls up once, as
              the rings' centre did, and is spoken with each area's count. */}
          {!tiny && (isMock || !oneDomain) ? (
            <SpecimenRow
              label="Score"
              value={String(pct)}
              pct
              roll={{ play: grow, from: null, run: 1, delay: motion.dur.select }}
              spoken={`${pct} percent. ${cert.domains
                .map((d) => (score.byDomain[d.id] ? `${d.short} ${score.byDomain[d.id].correct} of ${score.byDomain[d.id].total}` : null))
                .filter(Boolean)
                .join(', ')}.`}
            />
          ) : null}
          {time.word ? <SpecimenRow label="Time" word={time.word} spoken={time.spoken} /> : <SpecimenRow label="Time" value={time.value} unit={time.unit} spoken={time.spoken} />}
          {pace ? (
            <SpecimenRow
              label="Per question"
              value={String(pace.own)}
              unit="s"
              note={`Exam pace: about ${pace.exam} s`}
              spoken={`${pace.own} seconds. Exam pace about ${pace.exam} seconds`}
            />
          ) : null}
        </SpecimenLabel>
        {isMock && (
          <T v="meta" style={{ marginTop: space.md }}>
            Practice scores are not scaled exam scores. {cert.exam.passingNote}
          </T>
        )}
        {/* How well "how sure I felt" matched the result (only when enough answers were rated). */}
        {calibration && <T v="meta" style={{ marginTop: space.md }}>{calibration}</T>}
        {isMock && !active.deadline && (
          <T v="meta" style={{ marginTop: space.sm }}>Untimed mock: your answers count toward readiness, and pacing stats leave it out.</T>
        )}
        {pacing && (
          <View style={{ marginTop: space.md }}>
            <PacingPanel pacing={pacing} cert={cert} />
          </View>
        )}
        {/* Mobile 1.43: what happens next, on the paper (an InviteRow, not a plate): the misses come back
            tomorrow (true since engine/srs.ts schedules a miss for the next local day), or a clean set. */}
        {notice && (
          <View style={{ marginTop: space.xl }}>
            <InviteRow icon={<Sprout size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />} title={notice.title} body={notice.body} testID="results-notice" />
          </View>
        )}
        {/* What you missed: the notes behind the misses, open (no expander), grouped by note, at most three.
            "See answers" jumps to Review answers, where each missed question and its answer are. */}
        {missed.length > 0 && (
          <View>
            <JumpSection title="What you missed" target={reviewHead} />
            {/* Mobile 1.51: a key list, as under a plate: what the row does, the note's name and its minutes (words, no ✗: mobile 1.24). */}
            <KeyList
              testID="results-missed"
              items={missedNotes.map((n) => ({
                key: n.id,
                title: n.name,
                kicker: noteKicker(n.numbers),
                right: aboutMin(n.minutes),
                spoken: `${noteKicker(n.numbers)}: ${n.name}, ${spokenMin(aboutMin(n.minutes, true))}`,
                hint: 'Opens the study note. Go back to return to your results.',
                onPress: () => router.push(`/notes/subtopic/${encodeURIComponent(n.id)}`),
              }))}
            />
            {moreLine && <T v="meta" style={{ marginTop: space.sm }}>{moreLine}</T>}
          </View>
        )}
        <Gap h={space.xl} />
        {/* One solid button: Done (or the Guided step). "Practice the N you missed" is a quiet link under it:
            a miss re-answered minutes later is a retest and earns no spacing credit (engine/srs.ts), and the
            misses come back tomorrow anyway. */}
        {planLeft > 0 && (
          <T v="meta" accessibilityLabel={`Today’s plan, ${spokenMin(aboutMin(planLeft, true))} left`} style={{ marginBottom: space.sm }}>
            {`Today’s plan · ${aboutMin(planLeft, true)} left`}
          </T>
        )}
        {guidedScope ? (
          <Button shape="plate" label="Back to your Guided step" onPress={backToGuided} />
        ) : planLeft > 0 ? (
          <Button shape="plate" label="Continue" accessibilityHint="Goes on with today’s plan." onPress={continuePlan} />
        ) : (
          <Button shape="plate" label="Done" onPress={done} />
        )}
        {planLeft > 0 && <Button kind="ghost" label="Done for now" onPress={done} style={{ alignSelf: 'center', marginTop: space.sm }} />}
        {missed.length > 0 && planLeft === 0 && (
          <Button
            kind="ghost"
            label={missed.length === 1 ? 'Practice the one you missed' : `Practice the ${missed.length} you missed`}
            onPress={practiseMissed}
            style={{ alignSelf: 'center', marginTop: space.sm }}
          />
        )}
        {guidedScope && (
          <Button kind="ghost" label="Done" onPress={done} style={{ alignSelf: 'center', minWidth: 120, marginTop: missed.length > 0 ? 0 : space.sm }} />
        )}
        {moment && (
          <View
            style={{ marginTop: space.xl }}
            // Its place in the stats block (whose own top is statsY in the scroll).
            onLayout={(e) => setMomentY(e.nativeEvent.layout.y)}
          >
            <MilestoneMomentView
              moment={moment}
              once={active.id}
              inView={momentSeen && ringsDone}
              skipRef={skipMoment}
              onSee={() => router.push({ pathname: '/milestones', params: { open: moment.key } })}
            />
          </View>
        )}
      </Enter>
      </View>

      <Section title="Review answers" headRef={reviewHead} />
      {active.questionIds.map((id, i) => {
        const q = findQuestion(active.certId, id);
        const perm = active.perms[id];
        if (!q || !perm) return null;
        const r = active.responses[id];
        // Plain words (mobile 1.24): the glyphs ("✓", "✗", "○") were read aloud as "check mark", "ballot x".
        const status = !r ? 'Skipped' : r.correct ? 'Correct' : 'Missed';
        // Answered after Coach me: a right answer after a hint counts as half.
        const assisted = Boolean(r?.assisted);
        // Coaching (engine/pace.ts): only on a fast miss or a long, right answer.
        const coaching = r ? coachingTag(r.correct, r.ms) : null;
        // ONE quiet line instead of a row of tags (mobile 1.24): the hint and the pace note, together.
        // Each on its own line, so "You used a hint." never reads as the cause of the pace advice (UX review nit).
        const quietLines = [assisted ? 'You used a hint.' : null, coaching ? COACHING[coaching].line : null].filter((x): x is string => Boolean(x));
        const quiet = quietLines.join(' ');
        const color = !r ? c.muted : r.correct ? c.correct : c.wrong;
        const open = openId === id;
        const picked = r ? displayToOriginal(r.display, perm) : undefined;
        const correctDisplay = originalToDisplay(q.correct, perm);
        return (
          // A list row with a hairline below, not a card (spec §5).
          <View key={id} style={{ borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              // One sentence each; the coaching line ends with its own full stop (O2).
              accessibilityLabel={`Question ${i + 1}, ${status}.${quiet ? ` ${quiet}` : ''} Tap to ${open ? 'collapse' : 'expand'}`}
              onPress={() => setOpenId(open ? null : id)}
              style={({ pressed }) => ({ paddingVertical: 13, minHeight: 64, opacity: pressed ? 0.7 : 1 })}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="label" num>{`Question ${i + 1}`}</T>
                <T v="label" color={color}>{status}</T>
              </Row>
              {quietLines.map((line) => (
                <T key={line} v="meta" style={{ marginTop: space.xs }}>{line}</T>
              ))}
              <T v="body" style={{ marginTop: space.xs }}>{open ? q.stem : `${q.stem.slice(0, 110)}${q.stem.length > 110 ? '…' : ''}`}</T>
            </Pressable>
            {open && (
              <View style={{ paddingBottom: space.lg }}>
                {/* The same rows as the answer screen (mobile 1.43): the DISPLAY letter in each badge and spoken
                    label, and the pick's own note under its red row. */}
                {r && !r.correct && picked && (
                  <>
                    <OptionCard
                      letter={r.display}
                      text={q.options[picked] ?? ''}
                      state="wrong"
                      mark="letter"
                      tag="Your answer"
                      spoken={`Your answer, ${r.display}, not correct: ${q.options[picked] ?? ''}`}
                    />
                    {q.wrongExplanations[picked] ? <PickNote letter={r.display} text={renderText(q.wrongExplanations[picked]!, perm)} /> : null}
                  </>
                )}
                <OptionCard
                  letter={correctDisplay}
                  text={q.options[q.correct] ?? ''}
                  state="correct"
                  mark="letter"
                  tag="Best answer"
                  spoken={`Best answer, ${correctDisplay}: ${q.options[q.correct] ?? ''}`}
                />
                <T v="headline">{`Why ${correctDisplay}`}</T>
                <T v="body" style={{ marginBottom: space.sm }}>{renderText(q.explanation, perm)}</T>
                {trapTip(q) !== '' && (
                  <T v="small" color={c.ink2}>
                    {trapTip(q).startsWith('Final two:') ? '' : 'Trap: '}
                    {renderText(trapTip(q), perm)}
                  </T>
                )}
                {/* "Your note": the review is the best moment to reflect, and the only place a mock offers it. */}
                <QuestionNote certId={active.certId} questionId={id} />
                {/* Report a problem: mock questions are reported here, after the exam (never during it). */}
                <TrustLine
                  certId={active.certId}
                  reference={q.reference}
                  target={questionTarget(active.certId, q, sessionWhere(active.mode === 'mock' ? 'Mock review' : 'Practice review', active.title), {
                    perm,
                    pickedDisplay: r?.display,
                  })}
                />
              </View>
            )}
          </View>
        );
      })}
      {/* The app's own problems (a score, the timer, a freeze): one quiet ghost button at the end. */}
      <View style={{ marginTop: space.xl, alignItems: 'flex-start' }}>
        <Button
          kind="ghost"
          label="Something not working? Report a bug"
          accessibilityHint="Opens a short form, then your email app"
          onPress={bug.open}
          style={{ marginLeft: -space.sm }}
        />
        <View style={{ alignSelf: 'stretch' }}>{bug.block}</View>
      </View>
      {bug.sheet}
    </Screen>
  );
}

/**
 * "What you missed" with a "See answers" action (mobile 1.43): the learner wants to reopen the
 * questions they got wrong, not only the notes. The action scrolls to Review answers (instant under
 * Reduce Motion) and moves screen-reader focus to its heading. A child of Screen, so it can scroll it.
 */
function JumpSection({ title, target }: { title: string; target: { current: View | null } }) {
  const scroll = useScreenScroll();
  return (
    <Section
      title={title}
      action={{
        label: 'See answers',
        accessibilityLabel: 'See answers, each question with your answer',
        hint: 'Goes to Review answers below',
        onPress: () => {
          scroll?.scrollToView(target.current);
          moveFocus(target, 400);
        },
      }}
    />
  );
}
