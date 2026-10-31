/**
 * Session screen — where learning happens.
 *
 * PRACTICE / REVIEW: pick → (confidence) → Submit → instant feedback,
 * explanation, why your pick was wrong, then tips one at a time.
 *
 * COACH ME (practice / review only): before answering, a quiet control
 * shows the question's "Eliminate" tip and marks the stem's priority word
 * (FIRST, BEST…). An answer given after that is "assisted" and counts at
 * half weight toward readiness (engine/readiness.ts).
 *
 * MOCK: pick (changeable) → Next. Timer, flags, and a navigator grid.
 * No feedback until you submit the whole exam — just like the real thing.
 * TIMED PRACTICE (Build D, opt-in): the same strip counts UP from the
 * answer clocks: it stops while the explanation shows, never counts down,
 * never submits; past 2:00 on one question a soft cue appears.
 *
 * Build D: the clock lives in the shared PaceStrip under the header (or
 * "Clock hidden" / "Untimed", chosen on the start sheet), with a pace line
 * that changes only at the 25 / 50 / 75% checks (engine/pace.ts).
 *
 * Mobile 1.24 (honest readiness + answer screen):
 * - After a MISS the order is: verdict, your answer with its reason, the best
 *   answer, then the Key idea and Exam cue, THEN the long "Why" (folded to two
 *   lines + "Read more"), then Eliminate two / Final two. The short, memorable
 *   lines come first. A right answer keeps the old order.
 * - The coach line under "Not quite" is specific only when the learner tagged
 *   why they slipped (engine/slipCoach.ts missCoachLine); otherwise neutral.
 *   (Premium round 2 adds the pick-aware line first; a tagged slip still wins unless the pick
 *   reached the final two. See below.)
 * - A right answer given less than 4 hours after a MISS on the same question
 *   is a retest: it counts half and says "Back in your review tomorrow."
 * - A wrong answer gets the neutral tap, not the "error" buzz.
 * - Screen-reader focus moves to the verdict after "Check answer".
 * - "Code d1_xxx" is gone from this view (it is in the Report sheet).
 * - A one-question practice session (opened from the Question bank or Saved) ends where
 *   it started: the button says "Done", there is no Results page, and it goes back.
 * - The mock footer has icons AND words; the navigator says how many are
 *   answered / flagged / left and keeps Submit in a sticky footer.
 *
 * Mobile 1.49 (premium pass §2.2–2.4), the practice answer screen ends sooner:
 * - ONE "Go deeper" row after a miss: the lesson when it is not done yet,
 *   otherwise the note. Never more than one.
 * - Everything else moved to a ⋯ "More on this question" sheet in the header,
 *   beside the bookmark: read the note, read the principle, add a note, report
 *   a problem. Focus goes back to ⋯ when it closes. Never in a mock.
 * - The source line stays, as text only.
 * - The answer opens with the question recapped in two lines ("Show question"
 *   opens it whole); a screen reader hears the whole question there.
 *
 * Premium round 2 (REPORT spec 2; Fig. 4 = the answer in the figure register the web shares), practice and review only:
 * - A running head ("Practice · IS Audit" / "Question 4 of 10") over the recap.
 * - The verdict word in ink; the leaf keeps its colour and its ✗ / ✓.
 * - One plate, "Fig. 4 · Your pick, and the best answer" (a right answer: "Fig. 4 · Your answer",
 *   one ✓ row). "Your pick" replaces "Your answer" on this screen.
 * - "KEY IDEA" over the quotation and the Exam cue as a label (no vine rule), on the vine's timing,
 *   after a miss and after a right answer (where it follows Why; Eliminate / Final two stay on the vine).
 * - The coach line names the learner's own pick when the tips do ("Your pick, B, is one of the two
 *   to rule out first." / "You reached the final two: B against D."; engine/pickCoach.ts). A slip
 *   the learner tagged themselves still wins over "rule out first" (their own words come first);
 *   only reaching the final two outranks it.
 * - "Next question" is the plate button over a hairline. A mock is unchanged.
 */
import * as Router from 'expo-router';
import { openTab } from '../lib/actions';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  BackHandler,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  findNodeHandle,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { CrossFade, PageTurn, Pop, useMotion } from '../components/motion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafSmall } from '../components/glyphs';
import { ArrowRight, BookOpen, Bookmark, BookmarkCheck, ChevronLeft, Compass, Flag, ICON_STROKE, LayoutGrid, Lightbulb, PencilLine, Play, X } from '../components/icons';
import {
  AnswerMore,
  AnswerPlate,
  AnswerRecap,
  KeyIdeaCue,
  MORE_FOCUS_BACK_MS,
  ConfidenceRow,
  FEEDBACK_DELAY,
  OptionCard,
  VINE_ARRIVES,
  Rise,
  ScenarioBlock,
  SourceLine,
  StemRecap,
  StickyFooter,
  useVerdictIndent,
  Verdict,
  Vine,
  WhyBlock,
  type MoreRow,
  type OptionState,
} from '../components/quiz';
import { addMs } from '../engine/answerClock';
import { aboutMin, dueCheckpoints, formatClock, mockPace, paceMessage, paceShort, practiceElapsedMs, SOFT_CUE_LINE, softCue, spokenClockCoarse, spokenMin, statusOf } from '../engine/pace';
import { PaceStrip, type PaceStripProps } from '../components/pace';
import { QuestionNote, useHasQuestionNote, type QuestionNoteHandle } from '../components/questionNote';
import { useReportFlow } from '../components/support';
import { moveFocus, sayLater } from '../lib/a11y';
import { haptic } from '../lib/haptics';
import { questionTarget, sessionWhere } from '../lib/support';
import { Button, Gap, ICON_SIZE, ListRow, Row, SegmentBar, Stem, T, Tag } from '../components/ui';
import { getCertification, getDomain } from '../content/certifications';
import { missLessons } from '../content/lessons';
import { findQuestion } from '../content/loader';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { findPrinciple } from '../content/principles';
import { REASON_LABEL } from '../engine/studyModes';
import { LETTERS, type Letter } from '../content/types';
import { displayToOriginal, isCorrect, originalToDisplay, renderText } from '../engine/shuffle';
import { RETEST_LINE, type Confidence } from '../engine/srs';
import { shortDate } from '../lib/format';
import { priorityWord } from '../engine/games/priorityLens';
import { missCoachLine } from '../engine/slipCoach';
import { pickCoachKind, pickCoachLine } from '../engine/pickCoach';
import { RunningHead } from '../components/fieldguide';
import { eliminateTip, runnerUp, splitMissTips, tipParts } from '../engine/tips';
import { finishSession } from '../lib/finishSession';
import { advancePath } from '../lib/sessions';
import { HINT_AFTER_LINE, HINT_BEFORE_LINE } from '../engine/readiness';
import { useAnswerClock } from '../lib/useAnswerClock';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { LARGE_TEXT, motion, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// Stable empty array: a new [] on every render would make the store re-render forever.
const NO_BOOKMARKS: string[] = [];
const NO_LESSONS: string[] = [];
/**
 * Is this screen the one in view? The navigator's own useIsFocused; test
 * stand-ins of expo-router without it count as in view (as before 1.20).
 */
const useInView: () => boolean = (Router as { useIsFocused?: () => boolean }).useIsFocused ?? (() => true);
/** At this text size the confidence chips move out of the sticky footer (spec §10.7). */
const HUGE_TEXT = 1.6;

/** The header recap's hysteresis (pt): it hides only once the verdict is 8pt back below the header. */
const RECAP_HYSTERESIS = 8;

/** The mock clock's last stretch: shown in clay (never the error colour). */
const LOW_TIME_MS = 5 * 60_000;

export default function SessionScreen() {
  const { c } = useTheme();
  const active = useSession((s) => s.active);
  const { answer, goTo, toggleFlag } = useSession.getState();
  const recordAnswer = useProgress((s) => s.recordAnswer);
  const toggleBookmark = useProgress((s) => s.toggleBookmark);
  const bookmarks = useProgress((s) => (active ? selectCert(s, active.certId).bookmarks : NO_BOOKMARKS));
  // Lessons already done: a done lesson is not offered again after a miss (mobile 1.20).
  const lessonsDone = useProgress((s) => (active ? selectCert(s, active.certId).lessonsDone : NO_LESSONS));
  const { fontScale } = useWindowDimensions();
  // Lines under the verdict start under its word; at ×1.3 text, at the gutter (mobile 1.43).
  const verdictIndent = useVerdictIndent();
  // Reduce Motion: the navigator sheet fades in instead of sliding.
  const { reduced: reduceMotion } = useMotion();

  const [selected, setSelected] = useState<Letter | null>(null);
  const [confidence, setConfidence] = useState<Confidence | undefined>();
  const [navOpen, setNavOpen] = useState(false);
  // Counts taps that SAVE a question, so the bookmark pops only for that tap
  // (never when moving to a question that was already saved).
  const [savedTaps, setSavedTaps] = useState(0);
  // Lazy initialiser: read the clock once on mount, not on every render.
  const [now, setNow] = useState(() => Date.now());
  // Layout bookkeeping for the sticky footer and the vine reveal.
  const [footerH, setFooterH] = useState(120);
  // The navigator sheet's own sticky footer ("Submit exam").
  const [navFooterH, setNavFooterH] = useState(96);
  const [vineVisible, setVineVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  // The answer screen's verdict: where it ends in the scroll, and whether it has scrolled under the header.
  const verdictBottom = useRef(0);
  const [pastVerdict, setPastVerdict] = useState(false);
  const vineRef = useRef<View>(null);
  // The question whose vine may draw: armed once its entrance has landed (VINE_ARRIVES), never at the
  // tap while it is still invisible (UX H1). Keyed by question, so a new question starts unarmed.
  const vineArmedFor = useRef<string | null>(null);
  // Mobile 1.24: after a miss the tips come in two parts (Key idea + Exam cue, then
  // Eliminate / Final two after the folded "Why"); the second part draws on its own.
  const [vine2Visible, setVine2Visible] = useState(false);
  // Screen-reader focus lands on the verdict after "Check answer".
  const verdictRef = useRef<View>(null);
  // Coach me: the first line of the hint, and a flag saying "the learner just
  // tapped Coach me, so move the screen reader there once the hint appears".
  const hintRef = useRef<View>(null);
  const focusHint = useRef(false);

  const qid = active?.questionIds[active.index];
  const q = useMemo(() => (active && qid ? findQuestion(active.certId, qid) : undefined), [active, qid]);
  const perm = active && qid ? active.perms[qid] : undefined;
  const response = active && qid ? active.responses[qid] : undefined;
  const isMock = active?.mode === 'mock';
  // Why the learner said they slipped on this question, when they tagged it (Mistake journal).
  const taggedSlip = useProgress((s) => (active && qid ? selectCert(s, active.certId).mistakes[qid]?.slip : undefined));
  // Mobile 1.20, after a miss: the note first, the lesson when there is one.
  // Practice, review and Guided only (a mock never shows an answer screen, and
  // this says so out loud). Looked up once per question, not on every render
  // (the mock clock re-renders each second). Mobile 1.49: the note is looked up
  // after a right answer too, for the ⋯ sheet's "Read the note"; the lessons
  // (the "Go deeper" row) only matter after a miss.
  const checked = !isMock && Boolean(response);
  const missed = checked && Boolean(response && !response.correct);
  const missCert = active?.certId;
  const missLinks = useMemo(() => {
    if (!checked || !missCert || !qid) return null;
    const noteId = subtopicOfQuestion(missCert, qid);
    const note = noteId ? findNote(missCert, noteId) : undefined;
    // The lesson candidates, in order: the ones that prepare for this question, then (mobile 1.22,
    // design spec §6.3) the ones that list its note in `notes` (d4_062 → 4B1.2 → RPO and RTO).
    // Mobile 1.45: no outline-topic fallback here, so the row never offers a lesson that only shares
    // the topic. The first one not done yet is offered (below).
    const lessons = missed ? missLessons(missCert, qid, noteId) : [];
    return { noteId, noteName: note?.name, noteMinutes: note?.minutes ?? 2, lessons };
  }, [checked, missed, missCert, qid]);
  // Mobile 1.31: the principle this question tests (its `principleId`), for a
  // "Read the principle" row after ANY checked answer. Same rule as the note
  // and lesson rows: never in a mock (a mock shows no answer screen until it
  // is submitted, and Results' review has no per-question links). Not in the
  // first set either (one less thing in the first minute), and not inside a
  // set started from that same principle. Untagged → none.
  const principleCert = isMock || active?.firstSet ? undefined : active?.certId;
  const principleTag = q?.principleId;
  const taggedPrinciple = useMemo(
    () => (principleCert && principleTag ? findPrinciple(principleCert, principleTag) : undefined),
    [principleCert, principleTag],
  );
  const answerPrinciple = taggedPrinciple && active?.title !== taggedPrinciple.title ? taggedPrinciple : undefined;
  // Coach me was opened for this question (never in mock exams).
  const coached = !isMock && Boolean(qid && active?.coached?.includes(qid));
  // Quiet data (Build C): time on this question, background time excluded.
  // Keyed on the question, so it restarts each time a question is shown.
  const readClock = useAnswerClock(qid);
  // Mock exams: the time already spent on this question in earlier visits
  // (the last answer's time plus visits that ended without an answer), so
  // going back and answering adds to it instead of replacing it.
  const [visitBase, setVisitBase] = useState<number | undefined>(undefined);
  // Timed practice: the running time on the current question, refreshed
  // once a second from the same answer clock (no second timing system).
  const timedPractice = !isMock && Boolean(active?.timed);
  const answering = !response; // false once submitted: the explanation is showing
  const [curMs, setCurMs] = useState(0);
  useEffect(() => {
    if (!timedPractice || !answering) return;
    const t = setInterval(() => setCurMs(readClock()), 1000);
    return () => clearInterval(t);
  }, [timedPractice, answering, qid, readClock]);
  // The soft cue is announced once per question.
  const cueSaidFor = useRef<string | undefined>(undefined);
  const cueNow = timedPractice && answering && softCue(curMs);
  useEffect(() => {
    if (!cueNow || cueSaidFor.current === qid) return;
    cueSaidFor.current = qid;
    AccessibilityInfo.announceForAccessibility(SOFT_CUE_LINE);
  }, [cueNow, qid]);
  // Mock exams: did this visit end with a tap on an option? If not, its time
  // is kept in the session store when the learner moves on (effect below).
  const pickedThisVisit = useRef(false);
  useEffect(() => {
    if (!isMock || !qid) return;
    pickedThisVisit.current = false;
    return () => {
      // Runs before the clock restarts for the next question, so this reads this visit's time.
      if (!pickedThisVisit.current) useSession.getState().addVisitTime(qid, readClock());
    };
  }, [isMock, qid, readClock]);

  // Reset the local picker whenever the question changes (and on first
  // render, so a resumed mock shows its saved pick). This is React's
  // "adjust state when a prop changes" pattern: compare with the question we
  // last reset for and update during render, instead of in an effect.
  // `null` is a "never reset yet" marker (qid itself is a string or undefined).
  const [resetFor, setResetFor] = useState<string | undefined | null>(null);
  if (resetFor !== qid) {
    setResetFor(qid);
    setSelected(isMock && response ? response.display : null);
    setVisitBase(isMock ? (response?.ms ?? 0) + (active?.visitMs?.[qid ?? ''] ?? 0) : undefined);
    setCurMs(0);
    setConfidence(undefined);
    setVineVisible(false);
    setVine2Visible(false);
  }
  // At the swap (PageTurn calls this before the new page is painted): back to
  // the top, so the jump is never seen, and tell screen readers where they are
  // (focus stays on the footer button, whose label has just changed).
  const onSwap = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setPastVerdict(false);
    verdictBottom.current = 0;
    const s = useSession.getState().active;
    if (s) sayLater(`Question ${s.index + 1} of ${s.questionIds.length}`);
  }, []);
  // While the old page is still leaving (full motion, 120 ms), the header and
  // footer stay on it: they show its state and ignore taps, so a tap can never
  // act on the next question before the learner sees it. Mocks turn calmly
  // (no leaving phase), so this only ever covers practice.
  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);
  const onTurning = useCallback((from: string | number | null) => setLeavingIndex(typeof from === 'number' ? from : null), []);

  // After an answer, once the vine's entrance has landed, arm it; and if it is already on screen
  // (short questions), draw it without waiting for a scroll.
  const answeredHere = Boolean(qid && active?.responses[qid]) && active?.mode !== 'mock';
  useEffect(() => {
    vineArmedFor.current = null;
    if (!answeredHere) return;
    const t = setTimeout(
      () => {
        vineArmedFor.current = qid ?? null;
        vineRef.current?.measureInWindow((_x, y) => {
          if (y < Dimensions.get('window').height - 40) setVineVisible(true);
        });
      },
      reduceMotion ? motion.dur.reduced : VINE_ARRIVES,
    );
    return () => clearTimeout(t);
  }, [answeredHere, qid, reduceMotion]);

  // After Coach me is tapped, the hint mounts (and fades in for 200ms).
  // Then move screen-reader focus onto it, so VoiceOver / TalkBack read the
  // hint straight away instead of staying on a button that has vanished.
  useEffect(() => {
    // Native only: findNodeHandle does not exist on web (the screenshot build).
    if (!coached || !focusHint.current || Platform.OS === 'web') return;
    focusHint.current = false;
    const t = setTimeout(() => {
      const tag = hintRef.current ? findNodeHandle(hintRef.current) : null;
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    }, 250);
    return () => clearTimeout(t);
  }, [coached, qid]);

  // Mock-exam clock: tick every second; auto-submit at zero.
  useEffect(() => {
    if (!isMock || !active?.deadline || active.finishedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isMock, active?.deadline, active?.finishedAt]);

  const remaining = active?.deadline ? active.deadline - now : 0;

  // Pace checks at 25 / 50 / 75% of the time (engine/pace.ts). Each is
  // recorded ONCE in the session (so a reload keeps the line) and announced
  // once to screen readers. "Done" = answered or flagged (parked).
  useEffect(() => {
    if (!isMock || !active?.deadline || active.finishedAt) return;
    const cert0 = getCertification(active.certId);
    if (!cert0) return;
    const done = active.questionIds.filter((id) => active.responses[id] || active.flagged.includes(id)).length;
    const { targetSec } = mockPace(cert0.exam, active.questionIds.length, active.timing ?? 'standard');
    const before = active.checkpoints ?? [];
    const next = dueCheckpoints(before, active.deadline - active.startedAt, now - active.startedAt, done, targetSec);
    if (next.length > before.length) {
      useSession.getState().setCheckpoints(next);
      const last = next[next.length - 1];
      AccessibilityInfo.announceForAccessibility(`Pace check. ${paceMessage({ status: statusOf(last.deviation), minutes: last.minutes })}`);
    }
  }, [isMock, now, active]);

  // Say once when the last 5 minutes start, clock shown or hidden (P4).
  const lowAnnounced = useRef(false);
  const lowNow = isMock && Boolean(active?.deadline) && !active?.finishedAt && remaining > 0 && remaining < LOW_TIME_MS;
  useEffect(() => {
    if (!lowNow || lowAnnounced.current) return;
    lowAnnounced.current = true;
    AccessibilityInfo.announceForAccessibility('Less than 5 minutes left.');
  }, [lowNow]);
  useEffect(() => {
    if (isMock && active?.deadline && !active.finishedAt && remaining <= 0) {
      // Results says "Time’s up" in words and out loud (mobile 1.24, engine/resultsCopy.ts).
      finishSession(); // the finishedAt effect below navigates to /results
    }
  }, [isMock, remaining, active?.deadline, active?.finishedAt]);

  // Android hardware back button runs the same "End/Pause?" confirmation
  // as the on-screen button, instead of silently leaving the quiz.
  const leaveRef = useRef<() => void>(() => openTab('/home'));
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        leaveRef.current();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  // Finished sessions belong on the results screen (the ONLY place that
  // navigates there, so it never happens twice). Backstop (mobile 1.20): only
  // the session screen in view does it, so a second session screen left in
  // the stack can never open Results as well. One finished while out of view
  // goes there when it comes back into view.
  const inView = useInView();
  useEffect(() => {
    if (active?.finishedAt && inView) router.replace('/results');
  }, [active?.finishedAt, inView]);

  // Mobile 1.49: the ⋯ button (screen-reader focus comes back to it) and the note sheet it opens.
  const moreRef = useRef<View>(null);
  const noteRef = useRef<QuestionNoteHandle>(null);
  const openNote = useCallback(() => noteRef.current?.open(), []);
  // The report flow for the question on screen (the ⋯ sheet's last row). Called before the early
  // return below, so hooks keep their order; null until there is a question. The sheet gets the
  // options in the order shown, and the email names letters as the bank's ORIGINAL ones.
  const reportCert = active?.certId ?? '';
  const reportPlace = active ? sessionWhere(active.mode === 'review' ? 'Questions to revisit' : 'Practice', active.title) : '';
  const pickedShown = response?.display;
  const reportTarget = useMemo(
    () => (reportCert && q && perm ? questionTarget(reportCert, q, reportPlace, { perm, pickedDisplay: pickedShown }) : null),
    [reportCert, q, perm, reportPlace, pickedShown],
  );
  const report = useReportFlow(reportCert, reportTarget, { onClosed: () => moveFocus(moreRef, MORE_FOCUS_BACK_MS) });
  // Has the learner a note on this question? The ⋯ row then says "Edit your note".
  const hasQNote = useHasQuestionNote(reportCert, qid);

  if (!active || !q || !perm || !qid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: space.lg, justifyContent: 'center' }}>
        <T v="hero" center>
          {active ? 'This session can’t continue. Its questions were updated.' : 'No session in progress.'}
        </T>
        <Gap />
        <Button
          label="Back to Today"
          onPress={() => {
            useSession.getState().clear();
            openTab('/home');
          }}
        />
      </SafeAreaView>
    );
  }

  const cert = getCertification(active.certId)!;
  const domain = getDomain(cert, q.domainId);
  const total = active.questionIds.length;
  const isLast = active.index === total - 1;
  const submitted = !isMock && Boolean(response);
  const turning = leavingIndex !== null;
  // The question whose page is on screen (the leaving one, mid-turn).
  const shownQid = (turning ? active.questionIds[leavingIndex] : undefined) ?? qid;
  /** A footer or header action: inert while the old page is still leaving. */
  const settled = (fn: () => void) => () => {
    if (!turning) fn();
  };
  const displayLetters = LETTERS.slice(0, perm.length);

  // ── actions ──────────────────────────────────────────────────────────
  const pick = (letter: Letter) => {
    if (submitted) return;
    haptic.selection();
    setSelected(letter);
    if (isMock) {
      pickedThisVisit.current = true;
      answer(qid, { display: letter, correct: isCorrect(q, letter, perm), ms: addMs(visitBase, readClock()) });
    }
  };

  const submit = () => {
    if (!selected) return;
    const ok = isCorrect(q, selected, perm);
    // A miss gets the same neutral tap as any choice, not an "error" buzz: it should not feel like a
    // penalty at the moment the learner is meant to learn (mobile 1.24).
    if (ok) haptic.success();
    else haptic.selection();
    // No separate announcement (UX review B3): the focus move below lands on the verdict, whose label says
    // "Not quite. Best answer D." itself. An announcement as well was cut off on iOS and doubled on Android.
    // Time from the question appearing to "Check answer" (background excluded).
    const ms = readClock();
    // Progress first: the store decides whether this was a RETEST (a right answer under 4 hours after
    // a miss on this question, engine/srs.ts): it counts half and is not promoted.
    recordAnswer(active.certId, qid, ok, confidence, { assisted: coached, ms });
    const retest = ok && selectCert(useProgress.getState(), active.certId).answers[qid]?.lastRetest === true;
    // Answers after Coach me are "assisted": half weight toward readiness.
    answer(qid, { display: selected, correct: ok, confidence, ms, ...(coached ? { assisted: true } : {}), ...(retest ? { retest: true } : {}) });
    // In order (Build E): remember the place (never from the mixed tail).
    advancePath(active, qid);
    // File every miss in the Mistake Journal, with the ORIGINAL letter picked
    // (and how sure they felt, for the slip coach's "over-confident" pattern).
    if (!ok) useProgress.getState().recordMistake(active.certId, qid, displayToOriginal(selected, perm), confidence);
    // Start the answer screen at the top, so the verdict is the first thing seen,
    // and move the screen reader there (the footer button it was on sits below the explanation).
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    moveFocus(verdictRef, 400);
  };

  // One question on its own: nothing to review as a set, so it ends back where it started instead
  // of on a Results page (mobile 1.24). That is ANY one-question practice or review set: the Question
  // bank, Saved, a single open mistake, and also a 1-due review from Today, a one-question Guided step
  // or "Practice the one you missed" (all of them go back to the screen they came from).
  // Today's plan and the streak still count it (finishSession logs the activity); a badge moment
  // is left for a later full session (celebrate: false).
  const singleQuestion = !isMock && total === 1;
  const exitSingle = () => {
    if (Object.keys(active.responses).length > 0) finishSession({ celebrate: false });
    useSession.getState().clear();
    if (router.canGoBack()) router.back();
    else openTab('/home');
  };
  const next = () => {
    if (!isLast) goTo(active.index + 1);
    else if (isMock) confirmSubmitExam();
    else if (singleQuestion) exitSingle();
    // The first set ends on its own closing screen, which shows no badge moment: a badge it earns waits for the next Results.
    else finishSession({ celebrate: !active.firstSet }); // the finishedAt effect navigates to /results
  };

  const confirmSubmitExam = () => {
    const unanswered = total - Object.keys(active.responses).length;
    Alert.alert(
      'Submit exam?',
      unanswered > 0 ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. They will count as incorrect.` : 'You have answered every question.',
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: () => finishSession(),
        },
      ],
    );
  };

  const leave = () => {
    if (singleQuestion) {
      // Nothing is lost by leaving one question: no "End session?" to answer first.
      exitSingle();
      return;
    }
    if (isMock) {
      // An untimed mock has no clock to keep running.
      const body = active.deadline ? 'Your answers are saved. The clock keeps running — resume from Today.' : 'Your answers are saved. Resume from Today.';
      Alert.alert('Pause exam?', body, [
        { text: 'Stay', style: 'cancel' },
        { text: 'Pause', onPress: () => openTab('/home') },
      ]);
    } else {
      const answered = Object.keys(active.responses).length;
      Alert.alert('End session?', answered ? 'See your results for the questions you answered.' : 'You have not answered any questions yet.', [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'End',
          onPress: () => {
            if (answered) {
              finishSession({ celebrate: !active.firstSet });
            } else {
              useSession.getState().clear();
              openTab('/home');
            }
          },
        },
      ]);
    }
  };

  // "Latest callback" ref: the hardware back handler (registered once above)
  // always calls the newest `leave`. It must be set here, after the early
  // return, because `leave` needs the loaded session; it is only read in the
  // back-button event, never during render, so the rule's concern does not apply.
  // eslint-disable-next-line react-hooks/refs
  leaveRef.current = leave;

  const openCoach = () => {
    haptic.selection();
    // Focus moves to the hint once it mounts (effect above); it ends with the
    // "counts as half" line, so no separate announcement is needed.
    focusHint.current = true;
    useSession.getState().markCoached(qid);
  };

  const optionState = (display: Letter): OptionState => (selected === display ? 'selected' : 'idle');

  // ── answer-screen facts (all compared on ORIGINAL letters) ───────────
  const pickedOriginal = response ? displayToOriginal(response.display, perm) : undefined;
  const whyWrong = pickedOriginal && pickedOriginal !== q.correct ? q.wrongExplanations[pickedOriginal] : undefined;
  const correctDisplay = originalToDisplay(q.correct, perm);
  // Premium round 2 (web v12.47 parity): after a miss, a line about the learner's OWN pick, read
  // from the tips on ORIGINAL letters and said in DISPLAY letters ("Your pick, B, is one of the two to
  // rule out first." / "You reached the final two: B against D."). Only when the tips name the pick
  // exactly; otherwise the usual line (the closest wrong choice, a tagged slip, or the neutral line).
  // UX review P1: a slip the learner TAGGED themselves ("I misread it") is their own words, so it still
  // wins, except when the pick reached the final two (that line is the more useful news).
  const coach = !response
    ? ''
    : response.correct
      ? 'Clean read.'
      : taggedSlip && pickCoachKind(q.tips, q.correct, pickedOriginal) !== 'final-two'
        ? missCoachLine(false, taggedSlip)
        : (pickCoachLine(q.tips, q.correct, pickedOriginal, perm) ??
          missCoachLine(Boolean(pickedOriginal && pickedOriginal === runnerUp(q.tips, q.correct)), taggedSlip));
  const flagged = active.flagged.includes(qid);
  const shownFlagged = active.flagged.includes(shownQid);
  // Build E: why this question is here ("Weak spot", "Mixed review"…).
  const reason = active.reasons?.[qid];
  // After a miss (missLinks, above), at most two rows:
  //  1. "Read the note" whenever a study note lists this question;
  //  2. "Take the lesson": the first lesson not done yet among the ones that prepare for it and
  //     (mobile 1.22) the ones that list its note (mobile 1.45: never one that only shares the outline topic;
  //     a done lesson is one tap away in Learn; the note is the quicker re-read). Each row says what it
  //     does in a kicker above the name.
  const missNote = missLinks?.noteId;
  const missNoteName = missLinks?.noteName;
  const missNoteMin = missLinks?.noteMinutes ?? 2;
  const reviewLesson = missLinks?.lessons.find((l) => !lessonsDone.includes(l.id));
  const saved = bookmarks.includes(shownQid);
  // Mobile 1.49 (premium pass §2.3): the ⋯ "More on this question" rows. Before the answer is
  // checked, only the report: the note and the principle would give the answer away, and a note
  // is written after the answer. Each row PUSHES or opens a sheet, so Back lands on this answer.
  const noteRow: MoreRow | null =
    submitted && missNote && missNoteName
      ? {
          key: 'note',
          icon: (col) => <BookOpen size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />,
          kicker: 'Read the note',
          title: missNoteName,
          subtitle: `${aboutMin(missNoteMin)} · the idea this question tests`,
          label: `Read the note: ${missNoteName}, ${spokenMin(aboutMin(missNoteMin, true))}, the idea this question tests`,
          hint: 'Opens the study note. Go back to return to this answer.',
          run: () => router.push(`/notes/subtopic/${encodeURIComponent(missNote)}`),
        }
      : null;
  // Compass = how to think, as in Learn (mobile 1.31).
  const principleRow: MoreRow | null =
    submitted && answerPrinciple
      ? {
          key: 'principle',
          icon: (col) => <Compass size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />,
          kicker: 'Read the principle',
          title: answerPrinciple.title,
          subtitle: 'How to think it through',
          label: `Read the principle: ${answerPrinciple.title}, how to think it through`,
          hint: 'Opens the principle. Go back to return to this answer.',
          run: () => router.push(`/principles/${encodeURIComponent(answerPrinciple.id)}`),
        }
      : null;
  // "Your note": not on the very first set (one less thing in the first minute, as before).
  const yourNoteRow: MoreRow | null =
    submitted && !active.firstSet
      ? {
          key: 'yourNote',
          icon: (col) => <PencilLine size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />,
          title: hasQNote ? 'Edit your note' : 'Add a note',
          label: hasQNote ? 'Edit your note' : 'Add a note',
          hint: hasQNote ? 'Opens your note on this question.' : 'Write a note to yourself on this question.',
          chevron: false,
          run: openNote,
        }
      : null;
  const reportRow: MoreRow = {
    key: 'report',
    icon: (col) => <Flag size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />,
    title: 'Report a problem with this question',
    subtitle: report.reportedAt ? `Report started ${shortDate(report.reportedAt)}` : 'Opens a short form, then your email app',
    label: report.reportedAt ? `Report a problem with this question. Report started ${shortDate(report.reportedAt)}` : 'Report a problem with this question',
    hint: 'Opens a short form, then your email app',
    run: report.open,
  };
  // AnswerMore drops the nulls (the rows that don't apply here), in this order.
  const moreRows = [noteRow, principleRow, yourNoteRow, reportRow];
  const lowTime = isMock && remaining < LOW_TIME_MS;
  // The shared pace strip (components/pace.tsx): mock clock and pace line.
  const lastCheck = active.checkpoints?.[active.checkpoints.length - 1];
  // Timed practice: answered questions' times plus the one on screen (none
  // while the explanation shows, so the clock stands still there).
  const practiceMs = timedPractice
    ? practiceElapsedMs(Object.values(active.responses).map((r) => r.ms), submitted ? null : curMs)
    : 0;
  const strip: PaceStripProps | null = !isMock
    ? timedPractice
      ? {
          // Spoken in whole minutes (U-H2), so the label doesn't change every second.
          clock: { text: formatClock(practiceMs), spoken: `Session time ${spokenClockCoarse(practiceMs)}${submitted ? ', paused' : ' so far'}` },
          clockUnit: submitted ? 'paused' : 'so far',
          // Practice has no Flag button: the cue talks about the exam, clock icon in clay (U-H1).
          line: cueNow ? { text: SOFT_CUE_LINE, tone: 'soon' } : null,
        }
      : null
    : !active.deadline
      ? { clock: 'untimed' }
      : {
          clock: active.hideClock ? 'hidden' : { text: formatClock(remaining), spoken: `Time left ${spokenClockCoarse(remaining)}`, low: lowTime },
          clockUnit: 'left',
          line:
            active.hideClock && lowTime
              ? { text: 'Less than 5 minutes left.', tone: 'soon' }
              : lastCheck
                ? {
                    text: paceMessage({ status: statusOf(lastCheck.deviation), minutes: lastCheck.minutes }),
                    tone: statusOf(lastCheck.deviation),
                  }
                : { text: 'Pace checks at 25, 50 and 75% of the time.', tone: 'note' },
          // The strip shows this at very large text instead of the full advice (P6).
          lineShort: lastCheck && !(active.hideClock && lowTime) ? paceShort({ status: statusOf(lastCheck.deviation), minutes: lastCheck.minutes }) : undefined,
        };
  const largeText = fontScale >= LARGE_TEXT;
  const confidenceInScroll = fontScale >= HUGE_TEXT;
  // Coach me content: the Eliminate tip (letters mapped to what's on screen)
  // and the stem's capitalised priority word.
  const hintTip = eliminateTip(q.tips);
  const hintWord = priorityWord(q.stem);
  const canCoach = !isMock && Boolean(hintTip || hintWord);
  // After a miss: which tips lead (Exam cue) and which follow the folded "Why" (Eliminate, Final two).
  const missTips = splitMissTips(q.tips);
  // The navigator's summary: how many answered, flagged and left (the exam's own length, not the bank's).
  const answeredCount = Object.keys(active.responses).length;
  const navSummary = `${answeredCount} answered · ${active.flagged.length} flagged · ${total - answeredCount} left`;
  // Mobile 1.39: above the stem, only the domain and the count ("IS Audit · 1 of 5"). The
  // subtopic named the idea being tested, which gave the answer away, and the real exam
  // never labels topics. It appears only after the reveal, in the "Read the note" row, and
  // never in a mock (a mock has no answer screen).
  const metaLine = [domain?.short, `${active.index + 1} of ${total}`].filter(Boolean).join(' · ');

  // The vine draws itself the first time it scrolls into view: on each
  // scroll we ask where it sits on screen (measureInWindow works on phones
  // and on the web build alike).
  const checkVine = () => {
    // Not before its entrance has landed (a layout at the tap must not draw it unseen).
    if (vineArmedFor.current !== qid) return;
    if (!vineVisible && vineRef.current) {
      vineRef.current.measureInWindow((_x, y) => {
        if (y < Dimensions.get('window').height - 40) setVineVisible(true);
      });
    }
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    checkVine();
    // The verdict is under the header once the scroll has passed its bottom edge; it comes back
    // only 8pt above it (hysteresis, so a scroll resting on the line never flickers the header).
    const edge = verdictBottom.current;
    const past = edge > 0 && (pastVerdict ? scrollY.current > edge - RECAP_HYSTERESIS : scrollY.current > edge);
    if (past !== pastVerdict) setPastVerdict(past);
  };
  // The header recap shows on a practice answer screen only, and never mid-turn. Its words belong
  // to the page ON SCREEN (`shownQid`, keyed to it): at a turn they FADE out with the old page
  // instead of vanishing because the next question has no answer yet.
  const shownResponse = isMock ? undefined : active.responses[shownQid];
  const shownQ = shownResponse ? findQuestion(active.certId, shownQid) : undefined;
  const recap = shownResponse && shownQ ? { qid: shownQid, correct: shownResponse.correct, letter: originalToDisplay(shownQ.correct, active.perms[shownQid]) } : null;
  const showRecap = pastVerdict && submitted && Boolean(response) && !turning;

  // ── render ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header: 52pt bar — close · progress segments · save (or the mock clock) */}
      <Row gap={space.md} style={{ minHeight: 52, paddingHorizontal: space.gutter }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isMock ? 'Pause exam' : 'End session'}
          onPress={leave}
          hitSlop={4}
          style={{ width: 48, height: 48, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={ICON_SIZE.bar} color={c.ink} strokeWidth={ICON_STROKE} />
        </Pressable>
        {/* Mobile 1.22 (design spec §6.4): once the verdict has scrolled under the bar, the
            segments cross-fade to a one-line recap ("Not quite · Best answer D"); scrolling
            back up brings them back. 120 ms, at once under Reduce Motion. */}
        <CrossFade
          showSecond={showRecap}
          style={{ flex: 1, minHeight: 44 }}
          first={
            <View style={{ flexDirection: 'row' }}>
              <SegmentBar total={total} done={Object.keys(active.responses).length} current={active.index} />
            </View>
          }
          second={recap ? <AnswerRecap key={recap.qid} correct={recap.correct} letter={recap.letter} /> : null}
        />
        {isMock ? (
          // The clock moved to the pace strip below; this keeps the bar centred.
          <View style={{ width: 48, marginRight: -12 }} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved' : 'Save question'}
            accessibilityState={{ selected: saved }}
            onPress={settled(() => {
              if (!saved) {
                haptic.light();
                setSavedTaps((n) => n + 1);
              }
              toggleBookmark(active.certId, qid);
            })}
            hitSlop={4}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            {/* Saving pops the filled mark in (a small leaf spring); un-saving just swaps it. */}
            <Pop trigger={savedTaps}>
              {saved ? (
                <BookmarkCheck size={22} color={c.accentText} strokeWidth={ICON_STROKE} />
              ) : (
                <Bookmark size={22} color={c.ink2} strokeWidth={ICON_STROKE} />
              )}
            </Pop>
          </Pressable>
        )}
        {/* Mobile 1.49: ⋯ "More on this question" beside the bookmark. Never in a mock. */}
        {!isMock && (
          <View style={{ marginRight: -12 }}>
            <AnswerMore rows={moreRows} buttonRef={moreRef} />
          </View>
        )}
      </Row>
      {strip && <PaceStrip {...strip} />}

      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={32}
          // Pad by the sticky footer + 24, so option D / the last tip never sits under it.
          contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}
        >
          {/* Question to question is a page turn (spec §8): the old one drifts out
              the way you're going, the new one arrives from the other side. A
              mock turns calmly (a short fade): a timed exam should feel like the
              real test. The header and footer stay still and follow the page. */}
          <PageTurn id={active.index} calm={isMock} onSwap={onSwap} onTurning={onTurning}>
          {!submitted ? (
            <>
              {/* Question */}
              {/* Large text: the row wraps, the domain tag takes the full width and
                  "Flagged" / the reason tag drop under it (UX review P3). */}
              <Row gap={space.sm} style={{ marginTop: space.md, alignItems: 'flex-start', flexWrap: largeText ? 'wrap' : 'nowrap' }}>
                <View style={largeText ? { flexBasis: '100%' } : { flex: 1 }}>
                  {domain ? <Tag label={metaLine} domain={domain} /> : <T v="meta">{metaLine}</T>}
                </View>
                {flagged && <T v="caption" color={c.tip}>Flagged</T>}
                {reason && (
                  <T v="caption" color={c.accentText} accessibilityLabel={`Why this question: ${REASON_LABEL[reason]}`}>
                    {REASON_LABEL[reason]}
                  </T>
                )}
              </Row>
              {q.scenario && (
                <>
                  <Gap h={space.md} />
                  <ScenarioBlock text={q.scenario} />
                </>
              )}
              <View style={{ marginTop: 10 }}>
                <Stem highlight={coached ? hintWord : null}>{q.stem}</Stem>
              </View>
              {/* Coach me: a quiet text control; once opened, the hint stays for this question. */}
              {canCoach && !coached && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Coach me"
                  accessibilityHint="Shows a hint. A right answer after a hint counts as half."
                  onPress={openCoach}
                  hitSlop={4}
                  style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.7 : 1, marginTop: space.xs })}
                >
                  <Row gap={space.xs} style={{ flexWrap: 'wrap' }}>
                    <Lightbulb size={ICON_SIZE.inline} color={c.accentText} strokeWidth={ICON_STROKE} />
                    <T v="label" color={c.accentText}>Coach me</T>
                    {/* Said up front, so nobody taps it by accident and is surprised. */}
                    {/* Not on the very first question set: one less thing to read in the first minute. */}
                    {!active.firstSet && <T v="meta">A right answer after a hint counts as half.</T>}
                  </Row>
                </Pressable>
              )}
              {coached && (
                <Rise>
                  <View style={{ marginTop: space.md, borderLeftWidth: 3, borderLeftColor: c.tip, paddingLeft: space.md }}>
                    {/* hintRef = the first hint line; screen-reader focus lands here. */}
                    {hintWord && (
                      <View ref={hintRef} accessible>
                        <T v="small" color={c.ink}>{`Priority word: ${hintWord}. Let it decide.`}</T>
                      </View>
                    )}
                    {hintTip && (
                      <View ref={hintWord ? undefined : hintRef} accessible style={{ marginTop: hintWord ? space.sm : 0 }}>
                        {/* Same 16pt outline leaf as the vine's Eliminate node (spec §10.2). */}
                        <Row gap={space.xs} style={{ marginBottom: 3 }}>
                          <LeafSmall color={c.tip} />
                          <T v="caption" color={c.tip}>{tipParts(hintTip, 0).label}</T>
                        </Row>
                        <T v="small" color={c.ink}>{renderText(tipParts(hintTip, 0).body, perm)}</T>
                      </View>
                    )}
                    {/* Before the answer: what the hint will do (UX H1). */}
                    <T v="meta" style={{ marginTop: space.xs }}>{HINT_BEFORE_LINE}</T>
                  </View>
                </Rise>
              )}
              {/* One radio group, so screen readers say "1 of 4" and the checked state. */}
              <View accessibilityRole="radiogroup" accessibilityLabel="Answer options" style={{ marginTop: space.gutter }}>
                {displayLetters.map((d) => (
                  <OptionCard
                    key={d}
                    letter={d}
                    text={q.options[displayToOriginal(d, perm)] ?? ''}
                    state={optionState(d)}
                    onPress={() => pick(d)}
                  />
                ))}
              </View>
              {/* Very large text: the confidence chips live here, under option D,
                  so the sticky footer stays small enough to leave room for the question. */}
              {!isMock && !active.firstSet && selected && confidenceInScroll && (
                <View style={{ marginTop: space.md }}>
                  <ConfidenceRow value={confidence} onChange={setConfidence} />
                </View>
              )}
            </>
          ) : (
            response && (
              <>
                {/* Answer (premium round 2, the Field Guide answer): running head → recap → verdict →
                    Fig. 4 (your pick against the best answer) → (after a miss: Key idea + Exam cue → Why, folded →
                    Eliminate / Final two; after a right answer: Why → Key idea + Exam cue → Eliminate / Final two
                    on the vine) → source */}
                {/* Where you are: "Practice · IS Audit" and "Question 4 of 10" (the set's own length, never the bank's). */}
                <RunningHead
                  section={[active.mode === 'review' ? 'Review' : 'Practice', domain?.short].filter(Boolean).join(' · ')}
                  aside={`Question ${active.index + 1} of ${total}`}
                  style={{ marginTop: space.sm }}
                />
                {/* Mobile 1.49 (premium pass §2.1): the question in two lines, with "Show question". */}
                <StemRecap key={qid} stem={q.stem} scenario={q.scenario} field />
                <View onLayout={(e) => (verdictBottom.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
                  <Verdict ref={verdictRef} correct={response.correct} coach={coach} best={response.correct ? undefined : correctDisplay} field />
                </View>
                {/* Lined up with the coach line above it (left 50, under "Correct"). */}
                {/* Only after a RIGHT hinted answer (UX H1): a wrong one counts nothing, so "half" would be untrue. */}
                {response.assisted && response.correct && <T v="meta" style={{ marginTop: space.xs, marginLeft: verdictIndent }}>{HINT_AFTER_LINE}</T>}
                {/* A right retest (under 4 hours after a miss) is not promoted: say when it is back. */}
                {response.retest && response.correct && <T v="meta" style={{ marginTop: space.xs, marginLeft: verdictIndent }}>{RETEST_LINE}</T>}
                {/* Premium round 2: Fig. 4, one plate. After a miss: your pick (with "Why not B") and the best answer,
                    a hairline between; after a right answer: "Your answer", one ✓ row. DISPLAY letters on screen and
                    in every spoken label; the options are looked up by their ORIGINAL letters. The plate rises in,
                    then its rows 40 ms apart, from where the rows always started (FEEDBACK_DELAY.rows). */}
                <AnswerPlate
                  key={`${qid}:plate`}
                  delay={FEEDBACK_DELAY.rows}
                  pick={
                    !response.correct && pickedOriginal
                      ? { letter: response.display, text: q.options[pickedOriginal] ?? '', why: whyWrong ? renderText(whyWrong, perm) : undefined }
                      : undefined
                  }
                  best={{ letter: correctDisplay, text: q.options[q.correct] ?? '' }}
                />
                {response.correct ? (
                  <>
                    <Rise delay={FEEDBACK_DELAY.why}>
                      <WhyBlock letter={correctDisplay} text={renderText(q.explanation, perm)} fold={false} />
                    </Rise>
                    {/* In reading order: these arrive after the Why above them (motion round 2, 3a).
                        Premium round 2 (UX review P2): a right answer gets the same "KEY IDEA" quotation and Exam cue
                        label as a miss, then Eliminate two / Final two stay on the vine below. All of it sits in the
                        one feedback-vine view, so VINE_ARRIVES and the single tick hold: KeyIdeaCue ticks as the key
                        idea appears, and this Vine has no Key idea leaf, so it never ticks a second time. */}
                    <Rise delay={FEEDBACK_DELAY.why + motion.stagger.group}>
                      <View ref={vineRef} collapsable={false} onLayout={checkVine} testID="feedback-vine">
                        <KeyIdeaCue
                          key={`${qid}:a`}
                          keyIdea={q.keyConcept}
                          cues={missTips.first.map((i) => tipParts(renderText(q.tips[i], perm), i))}
                          visible={vineVisible}
                        />
                        <Vine
                          key={qid}
                          tips={missTips.rest.map((i) => renderText(q.tips[i], perm))}
                          tipIndex={missTips.rest}
                          visible={vineVisible}
                        />
                      </View>
                    </Rise>
                  </>
                ) : (
                  <>
                    {/* The short, memorable lines first: the Key idea and the Exam cue. They arrive in reading order,
                        after the rows above them (motion round 2, 3a: they used to show at the tap, before the rows).
                        Premium round 2: "KEY IDEA" over the quotation (no vine rule) and the Exam cue as a label.
                        Its arrival is still the vine's (VINE_ARRIVES): `visible` and its one tick wait for it. */}
                    <Rise delay={FEEDBACK_DELAY.why}>
                      <View ref={vineRef} collapsable={false} onLayout={checkVine} testID="feedback-vine">
                        <KeyIdeaCue
                          key={`${qid}:a`}
                          keyIdea={q.keyConcept}
                          cues={missTips.first.map((i) => tipParts(renderText(q.tips[i], perm), i))}
                          visible={vineVisible}
                        />
                      </View>
                    </Rise>
                    {/* Then the long "Why", folded to two lines, with Eliminate two / Final two inside the fold
                        (mobile 1.43, owner decision): "Read more" opens all three, "Show less" closes them. */}
                    <Rise delay={FEEDBACK_DELAY.why + motion.stagger.group}>
                      <WhyBlock
                        key={qid}
                        letter={correctDisplay}
                        text={renderText(q.explanation, perm)}
                        fold
                        more={missTips.rest.map((i) => tipParts(q.tips[i], i).label)}
                        // The vine inside draws as the fold opens (it is on screen right under the toggle).
                        onOpen={() => setVine2Visible(true)}
                      >
                        <Vine
                          key={`${qid}:b`}
                          tips={missTips.rest.map((i) => renderText(q.tips[i], perm))}
                          tipIndex={missTips.rest}
                          visible={vine2Visible}
                        />
                      </WhyBlock>
                    </Rise>
                  </>
                )}
                {/* Mobile 1.49 (premium pass §2.2): ONE "Go deeper" row after a miss, after a hairline.
                    The lesson when it is not done yet (Play = lessons), otherwise the note (BookOpen =
                    notes). Never more than one: the principle, the note and the rest are in ⋯. Both PUSH,
                    so Back lands here again, on this same answer with its explanation. */}
                {missed && (reviewLesson || (missNote && missNoteName)) && (
                  <>
                    <View style={{ height: 1, backgroundColor: c.line, marginTop: space.md }} />
                    {reviewLesson ? (
                      // Only a lesson not done yet is offered, so it is "take", never "Replay" (1.22 review).
                      <ListRow
                        testID="go-deeper-row"
                        icon={<Play size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                        kicker="Go deeper · take the lesson"
                        title={reviewLesson.title}
                        subtitle={`${reviewLesson.minutes} min · Not done yet`}
                        accessibilityLabel={`Go deeper, take the lesson: ${reviewLesson.title}, ${reviewLesson.minutes} minutes, not done yet`}
                        accessibilityHint="Opens the lesson. Go back to return to this answer."
                        onPress={() => router.push(`/lesson/${reviewLesson.id}`)}
                        // The source line below draws its own top rule.
                        last
                      />
                    ) : (
                      missNote &&
                      missNoteName && (
                        <ListRow
                          testID="go-deeper-row"
                          icon={<BookOpen size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                          kicker="Go deeper · read the note"
                          title={missNoteName}
                          subtitle={`${aboutMin(missNoteMin)} · the idea this question tests`}
                          accessibilityLabel={`Go deeper, read the note: ${missNoteName}, ${spokenMin(aboutMin(missNoteMin, true))}, the idea this question tests`}
                          accessibilityHint="Opens the study note. Go back to return to this answer."
                          onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(missNote)}`)}
                          last
                        />
                      )
                    )}
                  </>
                )}
                {/* "Your note" (components/questionNote.tsx): only on a CHECKED practice or review
                    answer (this branch never renders in a mock), never on the very first set. Mobile
                    1.49: a saved note still shows here; "Add a note" moved into ⋯, which opens it. */}
                {!active.firstSet && <QuestionNote ref={noteRef} certId={active.certId} questionId={qid} quietAdd returnFocus={moreRef} />}
                {/* The source line, text only (premium pass §2.4); "Report a problem" is in ⋯. The note after a
                    report's email app opened sits under it, as before. */}
                <SourceLine reference={q.reference}>{report.block}</SourceLine>
              </>
            )
          )}
          </PageTurn>
        </ScrollView>

        {/* Sticky bottom action, within thumb reach */}
        {/* Practice and review (premium round 2): the plate button over a hairline. A mock keeps its footer. */}
        <StickyFooter onHeight={setFooterH} rule={!isMock}>
          {isMock ? (
            // Icon AND word on every button (mobile 1.24), each at least 56 tall (Button) and 56 wide.
            // Wraps at large text; Next then takes a full row of its own.
            <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
              <Button
                kind="secondary"
                label="Previous"
                accessibilityLabel="Previous question"
                disabled={active.index === 0}
                onPress={settled(() => goTo(active.index - 1))}
                icon={(col) => <ChevronLeft size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
                iconLeading
                style={{ paddingHorizontal: space.md, minWidth: 56 }}
              />
              <Button
                kind="secondary"
                label={shownFlagged ? 'Unflag' : 'Flag'}
                accessibilityLabel={shownFlagged ? 'Unflag question' : 'Flag question'}
                selected={shownFlagged}
                onPress={settled(() => toggleFlag(qid))}
                icon={(col) => <Flag size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} fill={shownFlagged ? col : 'none'} />}
                iconLeading
                style={{ paddingHorizontal: space.md, minWidth: 56 }}
              />
              <Button
                kind="secondary"
                label="Questions"
                // Starts with the visible word (WCAG 2.5.3 label in name).
                accessibilityLabel="Questions, question navigator"
                onPress={settled(() => setNavOpen(true))}
                icon={(col) => <LayoutGrid size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
                iconLeading
                style={{ paddingHorizontal: space.md, minWidth: 56 }}
              />
              <Button label={isLast ? 'Finish' : 'Next'} onPress={settled(next)} style={largeText ? { flexBasis: '100%' } : { flex: 1, minWidth: 96 }} />
            </Row>
          ) : (
            <>
              {/* The first set (mobile 1.24) has no confidence chips: they come in with the next set. */}
              {!turning && !submitted && selected && !confidenceInScroll && !active.firstSet && <ConfidenceRow value={confidence} onChange={setConfidence} />}
              {/* ONE primary button for every state, so screen-reader focus stays on
                  it as it changes. Mid-turn it still belongs to the leaving page
                  (the answer screen): "Next question", and inert. */}
              <Button
                key="primary"
                // The Field Guide's plate button (52 tall, 12pt corners), set here so it holds whatever Button's default is.
                shape="plate"
                label={turning ? 'Next question' : submitted ? (isLast ? (singleQuestion ? 'Done' : 'See results') : 'Next question') : 'Check answer'}
                onPress={() => {
                  if (turning) return;
                  if (submitted) next();
                  else submit();
                }}
                disabled={!turning && !submitted && !selected}
                icon={turning || (submitted && !(isLast && singleQuestion)) ? (color) => <ArrowRight size={18} color={color} strokeWidth={ICON_STROKE} /> : undefined}
              />
            </>
          )}
        </StickyFooter>
      </View>
      {/* The report sheet the ⋯ sheet opens (a Modal: anywhere in the screen works). */}
      {report.sheet}
      {/* Mock navigator. Mobile 1.24: one summary line (answered · flagged · left), and "Submit exam"
          in a footer that stays put (it used to sit under the grid, up to 25 rows down). */}
      <Modal visible={navOpen} animationType={reduceMotion ? 'fade' : 'slide'} presentationStyle="pageSheet" onRequestClose={() => setNavOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.raised2 }}>
          <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: navFooterH + space.xl }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="display" accessibilityRole="header">Questions</T>
              <Button kind="ghost" label="Close" onPress={() => setNavOpen(false)} />
            </Row>
            <T v="small" num color={c.ink}>{navSummary}</T>
            <T v="meta" style={{ marginTop: space.xs }}>● answered · ○ not answered · ⚑ flagged</T>
            {/* No report button during a live mock (it stays exam-like); the review has one. */}
            <T v="meta" style={{ marginTop: space.xs }}>To report a question, open it in the review after you submit.</T>
            <Gap />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {active.questionIds.map((id, i) => {
                const done = Boolean(active.responses[id]);
                const flag = active.flagged.includes(id);
                const current = i === active.index;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={`Question ${i + 1}, ${done ? 'answered' : 'not answered'}${flag ? ', flagged' : ''}${current ? ', current' : ''}`}
                    accessibilityState={{ selected: current }}
                    onPress={() => {
                      goTo(i);
                      setNavOpen(false);
                    }}
                    style={{
                      minWidth: 52,
                      minHeight: 52,
                      paddingHorizontal: space.xs,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: current ? 2 : 1,
                      borderColor: current ? c.accent : flag ? c.tip : c.line,
                      // Answered = ink fill (never green: green means "correct").
                      backgroundColor: done ? c.ink : c.raised,
                    }}
                  >
                    <T v="label" num color={done ? c.raised : c.ink}>{`${flag ? '⚑' : ''}${done ? '●' : '○'}${i + 1}`}</T>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <StickyFooter onHeight={setNavFooterH}>
            <Button label="Submit exam" onPress={() => { setNavOpen(false); confirmSubmitExam(); }} />
          </StickyFooter>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
