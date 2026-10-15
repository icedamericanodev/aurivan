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
 */
import * as Router from 'expo-router';
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
import { ArrowRight, BookOpen, Bookmark, BookmarkCheck, ICON_STROKE, Lightbulb, Play, X } from '../components/icons';
import {
  AnswerRecap,
  ConfidenceRow,
  FEEDBACK_DELAY,
  OptionCard,
  Rise,
  ScenarioBlock,
  StickyFooter,
  TrustLine,
  Verdict,
  Vine,
  type OptionState,
} from '../components/quiz';
import { addMs } from '../engine/answerClock';
import { aboutMin, dueCheckpoints, formatClock, mockPace, paceMessage, paceShort, practiceElapsedMs, SOFT_CUE_LINE, softCue, spokenClockCoarse, spokenMin, statusOf } from '../engine/pace';
import { PaceStrip, type PaceStripProps } from '../components/pace';
import { sayLater } from '../lib/a11y';
import { haptic } from '../lib/haptics';
import { questionTarget, sessionWhere } from '../lib/support';
import { Button, Gap, ICON_SIZE, ListRow, Row, SegmentBar, Stem, T, Tag } from '../components/ui';
import { getCertification, getDomain } from '../content/certifications';
import { lessonPreparing, lessonsForSubtopic } from '../content/lessons';
import { findQuestion } from '../content/loader';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { REASON_LABEL } from '../engine/studyModes';
import { LETTERS, type Letter } from '../content/types';
import { displayToOriginal, isCorrect, originalToDisplay, renderText } from '../engine/shuffle';
import type { Confidence } from '../engine/srs';
import { priorityWord } from '../engine/games/priorityLens';
import { eliminateTip, runnerUp, tipParts } from '../engine/tips';
import { finishSession } from '../lib/finishSession';
import { advancePath } from '../lib/sessions';
import { shortSubtopic } from '../lib/format';
import { HINT_AFTER_LINE, HINT_BEFORE_LINE } from '../engine/readiness';
import { useAnswerClock } from '../lib/useAnswerClock';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { LARGE_TEXT, radius, space } from '../theme/tokens';
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
  const [vineVisible, setVineVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  // The answer screen's verdict: where it ends in the scroll, and whether it has scrolled under the header.
  const verdictBottom = useRef(0);
  const [pastVerdict, setPastVerdict] = useState(false);
  const vineRef = useRef<View>(null);
  // Coach me: the first line of the hint, and a flag saying "the learner just
  // tapped Coach me, so move the screen reader there once the hint appears".
  const hintRef = useRef<View>(null);
  const focusHint = useRef(false);

  const qid = active?.questionIds[active.index];
  const q = useMemo(() => (active && qid ? findQuestion(active.certId, qid) : undefined), [active, qid]);
  const perm = active && qid ? active.perms[qid] : undefined;
  const response = active && qid ? active.responses[qid] : undefined;
  const isMock = active?.mode === 'mock';
  // Mobile 1.20, after a miss: the note first, the lesson when there is one.
  // Practice, review and Guided only (a mock never shows an answer screen, and
  // this says so out loud). Nothing after a right answer. Looked up once per
  // question, not on every render (the mock clock re-renders each second).
  const missed = !isMock && Boolean(response && !response.correct);
  const missCert = active?.certId;
  const missLinks = useMemo(() => {
    if (!missed || !missCert || !qid) return null;
    const noteId = subtopicOfQuestion(missCert, qid);
    const note = noteId ? findNote(missCert, noteId) : undefined;
    // The lesson candidates, in order: the one that prepares for this question, then (mobile 1.22,
    // design spec §6.3) the lessons that teach its note, as the note page offers them
    // (d4_062 → 4B1.2 → RPO and RTO). The first one not done yet is offered (below).
    const prepares = lessonPreparing(missCert, qid);
    const teaching = noteId ? lessonsForSubtopic(missCert, noteId) : [];
    const lessons = [...(prepares ? [prepares] : []), ...teaching.filter((l) => l.id !== prepares?.id)];
    return { noteId, noteName: note?.name, noteMinutes: note?.minutes ?? 2, lessons };
  }, [missed, missCert, qid]);
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

  // After an answer, if the vine is already on screen (short questions),
  // draw it without waiting for a scroll.
  const answeredHere = Boolean(qid && active?.responses[qid]) && active?.mode !== 'mock';
  useEffect(() => {
    if (!answeredHere) return;
    const t = setTimeout(() => {
      vineRef.current?.measureInWindow((_x, y) => {
        if (y < Dimensions.get('window').height - 40) setVineVisible(true);
      });
    }, 450);
    return () => clearTimeout(t);
  }, [answeredHere, qid]);

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
      finishSession(); // the finishedAt effect below navigates to /results
    }
  }, [isMock, remaining, active?.deadline, active?.finishedAt]);

  // Android hardware back button runs the same "End/Pause?" confirmation
  // as the on-screen button, instead of silently leaving the quiz.
  const leaveRef = useRef<() => void>(() => router.replace('/home'));
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
            router.replace('/home');
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
    if (ok) haptic.success();
    else haptic.error();
    AccessibilityInfo.announceForAccessibility(ok ? 'Correct' : 'Not quite. Explanation below.');
    // Time from the question appearing to "Check answer" (background excluded).
    const ms = readClock();
    // Answers after Coach me are "assisted": half weight toward readiness.
    answer(qid, { display: selected, correct: ok, confidence, ms, ...(coached ? { assisted: true } : {}) });
    recordAnswer(active.certId, qid, ok, confidence, { assisted: coached, ms });
    // In order (Build E): remember the place (never from the mixed tail).
    advancePath(active, qid);
    // File every miss in the Mistake Journal, with the ORIGINAL letter picked
    // (and how sure they felt, for the slip coach's "over-confident" pattern).
    if (!ok) useProgress.getState().recordMistake(active.certId, qid, displayToOriginal(selected, perm), confidence);
    // Start the answer screen at the top, so the verdict is the first thing seen.
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const next = () => {
    if (!isLast) goTo(active.index + 1);
    else if (isMock) confirmSubmitExam();
    else finishSession(); // the finishedAt effect navigates to /results
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
    if (isMock) {
      // An untimed mock has no clock to keep running.
      const body = active.deadline ? 'Your answers are saved. The clock keeps running — resume from Today.' : 'Your answers are saved. Resume from Today.';
      Alert.alert('Pause exam?', body, [
        { text: 'Stay', style: 'cancel' },
        { text: 'Pause', onPress: () => router.replace('/home') },
      ]);
    } else {
      const answered = Object.keys(active.responses).length;
      Alert.alert('End session?', answered ? 'See your results for the questions you answered.' : 'You have not answered any questions yet.', [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'End',
          onPress: () => {
            if (answered) {
              finishSession();
            } else {
              useSession.getState().clear();
              router.replace('/home');
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
  const coach = !response
    ? ''
    : response.correct
      ? 'Clean read.'
      : pickedOriginal && pickedOriginal === runnerUp(q.tips, q.correct)
        ? 'You picked the runner-up. That’s the trap.'
        : 'Check who you are in the question.';
  const flagged = active.flagged.includes(qid);
  const shownFlagged = active.flagged.includes(shownQid);
  // Build E: why this question is here ("Weak spot", "Mixed review"…).
  const reason = active.reasons?.[qid];
  // After a miss (missLinks, above), at most two rows:
  //  1. "Read the note" whenever a study note lists this question;
  //  2. "Take the lesson": the first lesson not done yet among the one that prepares for it and
  //     (mobile 1.22) the ones that teach its note (a done lesson is one tap away in Learn; the note is the
  //     quicker re-read). Each row says what it does in a kicker above the name.
  const missNote = missLinks?.noteId;
  const missNoteName = missLinks?.noteName;
  const missNoteMin = missLinks?.noteMinutes ?? 2;
  const reviewLesson = missLinks?.lessons.find((l) => !lessonsDone.includes(l.id));
  const saved = bookmarks.includes(shownQid);
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
  const metaLine = [domain?.short, shortSubtopic(q.subtopic), `${active.index + 1} of ${total}`].filter(Boolean).join(' · ');

  // The vine draws itself the first time it scrolls into view: on each
  // scroll we ask where it sits on screen (measureInWindow works on phones
  // and on the web build alike).
  const checkVine = () => {
    if (vineVisible || !vineRef.current) return;
    vineRef.current.measureInWindow((_x, y) => {
      if (y < Dimensions.get('window').height - 40) setVineVisible(true);
    });
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
          style={{ width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' }}
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
          <View style={{ width: 44, marginRight: -10 }} />
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
            style={{ width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' }}
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
                    <T v="meta">A right answer after a hint counts as half.</T>
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
                {/* Answer: verdict → your pick → best answer → why → vine → trust */}
                <View onLayout={(e) => (verdictBottom.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
                  <Verdict correct={response.correct} coach={coach} />
                </View>
                {/* Lined up with the coach line above it (left 50, under "Correct"). */}
                {/* Only after a RIGHT hinted answer (UX H1): a wrong one counts nothing, so "half" would be untrue. */}
                {response.assisted && response.correct && <T v="meta" style={{ marginTop: space.xs, marginLeft: 50 }}>{HINT_AFTER_LINE}</T>}
                <Rise delay={FEEDBACK_DELAY.rows}>
                  <View style={{ marginTop: space.lg }}>
                    {!response.correct && pickedOriginal && (
                      <OptionCard
                        letter={response.display}
                        text={q.options[pickedOriginal] ?? ''}
                        state="wrong"
                        tag={`Your answer · ${response.display}`}
                        note={whyWrong ? renderText(whyWrong, perm) : undefined}
                      />
                    )}
                    <OptionCard
                      letter={correctDisplay}
                      text={q.options[q.correct] ?? ''}
                      state="correct"
                      tag={`Best answer · ${correctDisplay}`}
                    />
                  </View>
                </Rise>
                <Rise delay={FEEDBACK_DELAY.why}>
                  <T v="headline" accessibilityRole="header" style={{ marginTop: 12 }}>{`Why ${correctDisplay}`}</T>
                  <T v="body" style={{ marginTop: space.xs }}>{renderText(q.explanation, perm)}</T>
                </Rise>
                <View ref={vineRef} collapsable={false} onLayout={checkVine}>
                  <Vine key={qid} keyIdea={q.keyConcept} tips={q.tips.map((t) => renderText(t, perm))} visible={vineVisible} />
                </View>
                {/* After a miss (mobile 1.20): the note first (BookOpen = notes), then the
                    lesson when one is still to do (Play = lessons). Both PUSH, so Back lands
                    here again, on this same answer with its explanation. */}
                {/* A hairline sets the next steps apart from the vine (design spec §6). */}
                {Boolean((missNote && missNoteName) || reviewLesson) && <View style={{ height: 1, backgroundColor: c.line, marginTop: space.md }} />}
                {missNote && missNoteName && (
                  // Title = the note's own name; the verb is the kicker above it (mobile 1.22:
                  // "Read the note" on screen, not only in the spoken label).
                  <ListRow
                    icon={<BookOpen size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                    kicker="Read the note"
                    title={missNoteName}
                    subtitle={`${aboutMin(missNoteMin)} · the idea this question tests`}
                    accessibilityLabel={`Read the note: ${missNoteName}, ${spokenMin(aboutMin(missNoteMin, true))}, the idea this question tests`}
                    accessibilityHint="Opens the study note. Go back to return to this answer."
                    onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(missNote)}`)}
                    // TrustLine below draws its own top rule, so the last row skips its hairline.
                    last={!reviewLesson}
                  />
                )}
                {reviewLesson && (
                  // Only a lesson not done yet is offered, so the row says so (never "Review").
                  <ListRow
                    icon={<Play size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                    // Only a lesson not done yet is offered, so it is "Take", never "Replay" (1.22 review).
                    kicker="Take the lesson"
                    title={reviewLesson.title}
                    subtitle={`${reviewLesson.minutes} min · Not done yet`}
                    accessibilityLabel={`Take the lesson: ${reviewLesson.title}, ${reviewLesson.minutes} minutes, not done yet`}
                    accessibilityHint="Opens the lesson. Go back to return to this answer."
                    onPress={() => router.push(`/lesson/${reviewLesson.id}`)}
                    last
                  />
                )}
                {/* Report a problem (mobile 1.7): the sheet gets the options in the order shown,
                    and the email names letters as the bank's ORIGINAL ones. */}
                <TrustLine
                  certId={active.certId}
                  reference={q.reference}
                  target={questionTarget(active.certId, q, sessionWhere(active.mode === 'review' ? 'Spaced review' : 'Practice', active.title), {
                    perm,
                    pickedDisplay: response.display,
                  })}
                />
              </>
            )
          )}
          </PageTurn>
        </ScrollView>

        {/* Sticky bottom action, within thumb reach */}
        <StickyFooter onHeight={setFooterH}>
          {isMock ? (
            // Wraps at large text; Next then takes a full row of its own.
            <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
              <Button kind="secondary" label="‹" accessibilityLabel="Previous question" disabled={active.index === 0} onPress={settled(() => goTo(active.index - 1))} style={{ paddingHorizontal: space.lg }} />
              <Button
                kind="secondary"
                label={shownFlagged ? '⚑ Unflag' : '⚐ Flag'}
                accessibilityLabel={shownFlagged ? 'Unflag question' : 'Flag question'}
                selected={shownFlagged}
                onPress={settled(() => toggleFlag(qid))}
                style={{ paddingHorizontal: space.lg }}
              />
              <Button kind="secondary" label="▦" accessibilityLabel="Question navigator" onPress={settled(() => setNavOpen(true))} style={{ paddingHorizontal: space.lg }} />
              <Button label={isLast ? 'Finish' : 'Next'} onPress={settled(next)} style={largeText ? { flexBasis: '100%' } : { flex: 1 }} />
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
                label={turning ? 'Next question' : submitted ? (isLast ? 'See results' : 'Next question') : 'Check answer'}
                onPress={() => {
                  if (turning) return;
                  if (submitted) next();
                  else submit();
                }}
                disabled={!turning && !submitted && !selected}
                icon={turning || submitted ? (color) => <ArrowRight size={18} color={color} strokeWidth={ICON_STROKE} /> : undefined}
              />
            </>
          )}
        </StickyFooter>
      </View>
      {/* Mock navigator */}
      <Modal visible={navOpen} animationType={reduceMotion ? 'fade' : 'slide'} presentationStyle="pageSheet" onRequestClose={() => setNavOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.raised2 }}>
          <ScrollView contentContainerStyle={{ padding: space.lg }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="display">Questions</T>
              <Button kind="ghost" label="Close" onPress={() => setNavOpen(false)} />
            </Row>
            <T v="meta">● answered · ○ not answered · ⚑ flagged</T>
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
            <Gap h={space.xl} />
            <Button label="Submit exam" onPress={() => { setNavOpen(false); confirmSubmitExam(); }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
