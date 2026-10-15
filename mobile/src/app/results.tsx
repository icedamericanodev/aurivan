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
 *   "Strong work." or "Every miss is a lesson." on a handful of questions; the ring's
 *   centre shows "3 of 4", not a percent.
 * - The per-question "Hint used / Quick pick / Missed" tags are one quiet line.
 * - When enough answers were rated: "Sure: 7 of 9 right. Unsure: 2 of 4 right."
 * - "Practice the N you missed" is a secondary button; Done is the one solid button (a miss
 *   re-answered minutes later is a retest and earns no spacing credit).
 * - A mock that ended on the clock says "Time’s up" (seen and spoken).
 * - Android Back leaves Results instead of silently abandoning the review (a mock asks first).
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, View } from 'react-native';
import { OptionCard, TrustLine } from '../components/quiz';
import { useReportFlow } from '../components/support';
import { DomainRings } from '../components/journey';
import { PacingPanel } from '../components/pace';
import { FirstSetDone } from '../components/firstSet';
import { MilestoneMomentView } from '../components/milestones';
import { Turn, useOncePerDay } from '../components/motion';
import { BookOpen, ChevronDown, ICON_STROKE } from '../components/icons';
import { BigNum, Button, Enter, Gap, ICON_SIZE, ListRow, Row, Screen, Section, Stat, StatRow, T } from '../components/ui';
import { getCertification } from '../content/certifications';
import { findQuestion } from '../content/loader';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { missedSubtopics } from '../engine/outline';
import { legacyTitle } from '../engine/planner';
import { calibrationLine, resultsHeadline, SMALL_SAMPLE, smallSampleFact, TIMES_UP_DETAIL, TIMES_UP_LINE } from '../engine/resultsCopy';
import { sayLater } from '../lib/a11y';
import { displayToOriginal, originalToDisplay, renderText } from '../engine/shuffle';
import { aboutMin, COACHING, coachingTag, practicePaceLine, spokenMin, timeStat, TIMING_LABEL } from '../engine/pace';
import { msUsed, scoreSession, sessionPacing } from '../lib/finishSession';
import { trapTip } from '../engine/games/trapSpotter';
import { badgeNextLine } from '../lib/badges';
import { momentFor } from '../lib/milestones';
import { startFromIds } from '../lib/sessions';
import { questionTarget, sessionWhere } from '../lib/support';
import { useSession } from '../store/session';
import { motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export default function Results() {
  const { c } = useTheme();
  const active = useSession((s) => s.active);
  const clear = useSession((s) => s.clear);
  const [openId, setOpenId] = useState<string | null>(null);
  // Mobile 1.20: "Read the notes for what you missed" shows its rows once tapped.
  const [notesOpen, setNotesOpen] = useState(false);
  const score = useMemo(() => (active ? scoreSession(active) : null), [active]);
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
  // Up to three study notes behind the misses, most-missed first. Only notes that
  // exist count, so the limit of three applies AFTER an unknown id is dropped.
  const missedNotes = missedSubtopics(missed, (id) => {
    const sub = subtopicOfQuestion(cert.id, id);
    return sub && findNote(cert.id, sub) ? sub : undefined;
  }).map((m) => {
    const note = findNote(cert.id, m.id)!;
    return { ...m, name: note.name, minutes: note.minutes ?? 2 };
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
  const headline = resultsHeadline(score.correct, active.mode === 'mock' ? score.total : score.answered, pct);
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
  // "Sure: 7 of 9 right. Unsure: 2 of 4 right." (practice and review: a mock records no ratings).
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

  const practiseMissed = () => {
    const ids = [...missed];
    clear();
    if (startFromIds(cert.id, ids, 'Missed questions')) router.replace('/session');
    else router.replace('/home');
  };

  const values = cert.domains.map((d) => {
    const b = score.byDomain[d.id];
    return b ? b.correct / b.total : null;
  });
  // Only the domains this session asked about get a ring (ui.md R1).
  const inSession = cert.domains.map((d, i) => (score.byDomain[d.id] ? i : -1)).filter((i) => i >= 0);
  const oneDomain = inSession.length === 1 ? cert.domains[inSession[0]] : undefined;
  // One pace line for every practice / review session (Build C answer times).
  const paceText = practicePaceLine(active.questionIds.map((id) => active.responses[id]?.ms), cert.exam);
  // The same time the mock history, pacing panel and Today use (a timed mock's
  // clock; otherwise answer time), as a stat that reads plainly ("Under 1 min", "24 min").
  const time = timeStat(msUsed(active, active.finishedAt ?? active.startedAt));
  const grow = growing;
  // Starts as the screen's dissolve ends (it is already mostly in by then).
  const at = motion.dur.select;

  return (
    <Screen edges={['top', 'bottom']} onScroll={moment && !momentSeen ? watch : undefined} onScrollBeginDrag={moment ? () => skipMoment.current?.() : undefined}>
      <Enter i={0}>
        {/* Extra time and untimed mocks say so (standard time is the norm, so it isn't named). */}
        <T v="meta">{active.mode === 'mock' && active.timing && active.timing !== 'standard' ? `${active.title} · ${TIMING_LABEL[active.timing].toLowerCase()}` : legacyTitle(active.title)}</T>
        {/* A timed mock that ended on the clock says so first (seen here, spoken by the effect above). */}
        {timedOut && (
          <View accessible accessibilityLabel={`${TIMES_UP_LINE} ${TIMES_UP_DETAIL}`} style={{ marginTop: space.sm }}>
            <T v="label" color={c.clay}>{TIMES_UP_LINE}</T>
            <T v="meta">{TIMES_UP_DETAIL}</T>
          </View>
        )}
        <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>{headline}</T>
        {fact && <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>{fact}</T>}
      </Enter>

      {/* Score rings in domain tones (spec §10.1, Results 200): arc = this session's score per domain. */}
      <Enter i={1} style={{ marginTop: space.xl }}>
        <DomainRings
          cert={cert}
          values={values}
          only={inSession}
          // One domain: the ring alone, centred, with its one line under it (no stranded legend row).
          legend={!oneDomain}
          grow={{ play: grow, run: 1, delay: at }}
          legendValue={(i) => {
            const b = score.byDomain[cert.domains[i].id];
            return b ? `${b.correct}/${b.total}` : '–';
          }}
          accessibilityLabel={`${tiny ? `${score.correct} of ${score.answered} right` : `Score ${pct} percent`}. ${cert.domains
            .map((d) => (score.byDomain[d.id] ? `${d.short} ${score.byDomain[d.id].correct} of ${score.byDomain[d.id].total}` : null))
            .filter(Boolean)
            .join(', ')}.`}
          center={
            tiny ? (
              // A handful of questions: the count, not a percent (a percent of 4 says little).
              <View style={{ alignItems: 'center' }}>
                <BigNum value={String(score.correct)} size={30} />
                <T v="caption" color={c.ink2}>{`of ${score.answered}`}</T>
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <BigNum value={String(pct)} pct size={30} roll={{ play: grow, from: null, run: 1, delay: at }} />
                <T v="caption" color={c.ink2}>score</T>
              </View>
            )
          }
        />
        {oneDomain ? (
          // Mobile 1.22 (design spec §8.2): one centred line, "All IS Audit · 2 of 3".
          <T v="meta" center style={{ marginTop: 14 }}>
            {`All ${oneDomain.short} · ${score.byDomain[oneDomain.id].correct} of ${score.byDomain[oneDomain.id].total}`}
          </T>
        ) : (
          <T v="meta" style={{ marginTop: 14 }}>Each ring is a domain in this session. Thicker rings weigh more on the exam.</T>
        )}
      </Enter>

      <View style={{ marginTop: space.xl }} onLayout={(e) => setStatsY(e.nativeEvent.layout.y)}>
      <Enter i={2}>
        <StatRow>
          {[
            <Stat
              key="a"
              label="Correct"
              value={String(score.correct)}
              unit={`of ${denominator}`}
              // The number right rolls up from 0; "of 20" stays put.
              roll={{ play: grow, from: '0', run: 1, delay: at + motion.stagger.stat }}
            />,
            // Answered wrong (and, on a mock, left blank): what "Practice the ones you missed" opens.
            missed.length ? (
              <Stat key="b" label="Missed" value={String(missed.length)} spoken={blank ? `${missed.length}, ${blank} of them left blank` : undefined} />
            ) : (
              <Stat key="b" label="Missed" word="None" />
            ),
            time.word ? <Stat key="c" label="Time" word={time.word} spoken={time.spoken} /> : <Stat key="c" label="Time" value={time.value} unit={time.unit} spoken={time.spoken} />,
          ]}
        </StatRow>
        {blank > 0 && (
          <T v="meta" style={{ marginTop: space.md }}>
            {`Missed includes ${blank} left blank: a blank counts as not correct.`}
          </T>
        )}
        {active.mode === 'mock' && (
          <T v="meta" style={{ marginTop: blank > 0 ? space.sm : space.md }}>
            Practice scores are not scaled exam scores. {cert.exam.passingNote}
          </T>
        )}
        {active.mode !== 'mock' && paceText && (
          <T v="meta" style={{ marginTop: space.md }}>{paceText}</T>
        )}
        {/* How well "how sure I felt" matched the result (only when enough answers were rated). */}
        {calibration && <T v="meta" style={{ marginTop: space.sm }}>{calibration}</T>}
        {active.mode === 'mock' && !active.deadline && (
          <T v="meta" style={{ marginTop: space.sm }}>Untimed mock: your answers count toward readiness, and pacing stats leave it out.</T>
        )}
        {pacing && (
          <View style={{ marginTop: space.md }}>
            <PacingPanel pacing={pacing} cert={cert} />
          </View>
        )}
        <Gap h={space.xl} />
        {/* Mobile 1.24: "Practice the N you missed" is a secondary button now. A miss re-answered
            minutes later is a retest (it earns no spacing credit, engine/srs.ts), so the one solid
            button is Done (or the Guided step); the missed ones come back in review. */}
        {guidedScope ? (
          <>
            <Button label="Back to your Guided step" onPress={backToGuided} />
            <Gap h={space.sm} />
          </>
        ) : (
          <>
            <Button label="Done" onPress={done} />
            <Gap h={space.sm} />
          </>
        )}
        {missed.length > 0 && (
          <Button kind="secondary" label={missed.length === 1 ? 'Practice the one you missed' : `Practice the ${missed.length} you missed`} onPress={practiseMissed} />
        )}
        {guidedScope && (
          <Button kind="ghost" label="Done" onPress={done} style={{ alignSelf: 'center', minWidth: 120, marginTop: space.sm }} />
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

      {missedNotes.length > 0 && (
        <View style={{ marginTop: space.sm }}>
          {/* Mobile 1.20: the notes behind the misses, folded until asked for (BookOpen = notes).
              Mobile 1.22 (design spec §8.4): its own place just above the review, after the actions. */}
          <Button
            kind="ghost"
            label="Notes for what you missed"
            expanded={notesOpen}
            accessibilityHint={notesOpen ? 'Hides the study notes' : 'Shows the study notes for the ideas you missed'}
            // Points down when open, right when closed, and turns when tapped (as on Learn).
            icon={(col) => (
              <Turn deg={notesOpen ? 0 : -90}>
                <ChevronDown size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />
              </Turn>
            )}
            onPress={() => setNotesOpen(!notesOpen)}
            style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
          />
          {notesOpen && (
            <View style={{ marginBottom: space.sm }}>
              {missedNotes.map((n, i) => (
                <ListRow
                  key={n.id}
                  icon={<BookOpen size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                  title={n.name}
                  subtitle={`${n.missed === 1 ? '1 miss' : `${n.missed} misses`} · ${aboutMin(n.minutes, true)}`}
                  accessibilityLabel={`Read the note: ${n.name}. ${n.missed === 1 ? '1 question' : `${n.missed} questions`} you missed, ${spokenMin(aboutMin(n.minutes, true))}`}
                  accessibilityHint="Opens the study note. Go back to return to your results."
                  onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(n.id)}`)}
                  last={i === missedNotes.length - 1}
                />
              ))}
            </View>
          )}
        </View>
      )}
      <Section title="Review answers" />
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
        const quiet = [assisted ? 'You used a hint.' : null, coaching ? COACHING[coaching].line : null].filter(Boolean).join(' ');
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
              {quiet ? <T v="meta" style={{ marginTop: space.xs }}>{quiet}</T> : null}
              <T v="body" style={{ marginTop: space.xs }}>{open ? q.stem : `${q.stem.slice(0, 110)}${q.stem.length > 110 ? '…' : ''}`}</T>
            </Pressable>
            {open && (
              <View style={{ paddingBottom: space.lg }}>
                {r && !r.correct && picked && (
                  <OptionCard
                    letter={r.display}
                    text={q.options[picked] ?? ''}
                    state="wrong"
                    tag={`Your answer · ${r.display}`}
                    note={q.wrongExplanations[picked] ? renderText(q.wrongExplanations[picked]!, perm) : undefined}
                  />
                )}
                <OptionCard letter={correctDisplay} text={q.options[q.correct] ?? ''} state="correct" tag={`Best answer · ${correctDisplay}`} />
                <T v="headline">{`Why ${correctDisplay}`}</T>
                <T v="body" style={{ marginBottom: space.sm }}>{renderText(q.explanation, perm)}</T>
                {trapTip(q) !== '' && (
                  <T v="small" color={c.ink2}>
                    {trapTip(q).startsWith('Final two:') ? '' : 'Trap: '}
                    {renderText(trapTip(q), perm)}
                  </T>
                )}
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
