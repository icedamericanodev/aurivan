/**
 * Session screen — where learning happens.
 *
 * PRACTICE / REVIEW: pick → (confidence) → Submit → instant feedback,
 * explanation, why your pick was wrong, then tips one at a time.
 *
 * MOCK: pick (changeable) → Next. Timer, flags, and a navigator grid.
 * No feedback until you submit the whole exam — just like the real thing.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  BackHandler,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Bookmark, BookmarkCheck, ICON_STROKE, X } from '../components/icons';
import {
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
import { haptic } from '../lib/haptics';
import { reportIssue } from '../lib/report';
import { Button, Gap, ICON_SIZE, Row, SegmentBar, Stem, T, Tag } from '../components/ui';
import { getCertification, getDomain } from '../content/certifications';
import { findQuestion } from '../content/loader';
import { LETTERS, type Letter } from '../content/types';
import { displayToOriginal, isCorrect, originalToDisplay, renderText } from '../engine/shuffle';
import type { Confidence } from '../engine/srs';
import { runnerUp } from '../engine/tips';
import { finishSession } from '../lib/finishSession';
import { shortSubtopic } from '../lib/format';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

// Stable empty array: a new [] on every render would make the store re-render forever.
const NO_BOOKMARKS: string[] = [];

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function SessionScreen() {
  const { c } = useTheme();
  const active = useSession((s) => s.active);
  const { answer, goTo, toggleFlag } = useSession.getState();
  const recordAnswer = useProgress((s) => s.recordAnswer);
  const toggleBookmark = useProgress((s) => s.toggleBookmark);
  const bookmarks = useProgress((s) => (active ? selectCert(s, active.certId).bookmarks : NO_BOOKMARKS));

  const [selected, setSelected] = useState<Letter | null>(null);
  const [confidence, setConfidence] = useState<Confidence | undefined>();
  const [navOpen, setNavOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  // Layout bookkeeping for the sticky footer and the vine reveal.
  const [footerH, setFooterH] = useState(120);
  const [vineVisible, setVineVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const vineRef = useRef<View>(null);

  const qid = active?.questionIds[active.index];
  const q = useMemo(() => (active && qid ? findQuestion(active.certId, qid) : undefined), [active, qid]);
  const perm = active && qid ? active.perms[qid] : undefined;
  const response = active && qid ? active.responses[qid] : undefined;
  const isMock = active?.mode === 'mock';

  // Reset the local picker whenever the question changes.
  useEffect(() => {
    setSelected(isMock && response ? response.display : null);
    setConfidence(undefined);
    setVineVisible(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid]);

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

  // Mock-exam clock: tick every second; auto-submit at zero.
  useEffect(() => {
    if (!isMock || !active?.deadline || active.finishedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isMock, active?.deadline, active?.finishedAt]);

  const remaining = active?.deadline ? active.deadline - now : 0;
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
  // navigates there, so it never happens twice).
  useEffect(() => {
    if (active?.finishedAt) router.replace('/results');
  }, [active?.finishedAt]);

  if (!active || !q || !perm || !qid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: space.lg, justifyContent: 'center' }}>
        <T v="hero" center>
          {active ? 'This session can’t continue. Its questions were updated.' : 'No session in progress.'}
        </T>
        <Gap />
        <Button
          label="Back to Home"
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
  const displayLetters = LETTERS.slice(0, perm.length);

  // ── actions ──────────────────────────────────────────────────────────
  const pick = (letter: Letter) => {
    if (submitted) return;
    haptic.selection();
    setSelected(letter);
    if (isMock) {
      answer(qid, { display: letter, correct: isCorrect(q, letter, perm) });
    }
  };

  const submit = () => {
    if (!selected) return;
    const ok = isCorrect(q, selected, perm);
    if (ok) haptic.success();
    else haptic.error();
    AccessibilityInfo.announceForAccessibility(ok ? 'Correct' : 'Not quite. Explanation below.');
    answer(qid, { display: selected, correct: ok, confidence });
    recordAnswer(active.certId, qid, ok, confidence);
    // File every miss in the Mistake Journal, with the ORIGINAL letter picked.
    if (!ok) useProgress.getState().recordMistake(active.certId, qid, displayToOriginal(selected, perm));
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
      Alert.alert('Pause exam?', 'Your answers are saved. The clock keeps running — resume from Home.', [
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

  leaveRef.current = leave;

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
        : 'Check the role in the stem.';
  const flagged = active.flagged.includes(qid);
  const saved = bookmarks.includes(qid);
  const lowTime = isMock && remaining < 5 * 60_000;
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
  };

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
        <SegmentBar total={total} done={Object.keys(active.responses).length} current={active.index} />
        {isMock ? (
          <T v="label" num color={lowTime ? c.wrong : c.ink} accessibilityLabel={`Time remaining ${formatClock(remaining)}`}>
            {formatClock(remaining)}
          </T>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved' : 'Save question'}
            accessibilityState={{ selected: saved }}
            onPress={() => toggleBookmark(active.certId, qid)}
            style={{ width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' }}
          >
            {saved ? (
              <BookmarkCheck size={22} color={c.accentText} strokeWidth={ICON_STROKE} />
            ) : (
              <Bookmark size={22} color={c.ink2} strokeWidth={ICON_STROKE} />
            )}
          </Pressable>
        )}
      </Row>

      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={32}
          // Pad by the sticky footer + 24, so option D / the last tip never sits under it.
          contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}
        >
          {!submitted ? (
            <>
              {/* Question */}
              <Row gap={space.sm} style={{ marginTop: space.md, alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  {domain ? <Tag label={metaLine} domain={domain} /> : <T v="meta">{metaLine}</T>}
                </View>
                {flagged && <T v="caption" color={c.tip}>Flagged</T>}
              </Row>
              {q.scenario && (
                <>
                  <Gap h={space.md} />
                  <ScenarioBlock text={q.scenario} />
                </>
              )}
              <View style={{ marginTop: 10 }}>
                <Stem>{q.stem}</Stem>
              </View>
              <View style={{ marginTop: space.gutter }}>
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
            </>
          ) : (
            response && (
              <>
                {/* Answer: verdict → your pick → best answer → why → vine → trust */}
                <Verdict correct={response.correct} coach={coach} />
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
                <TrustLine questionId={q.id} reference={q.reference} onReport={() => reportIssue(q.id, cert.name)} />
              </>
            )
          )}
        </ScrollView>

        {/* Sticky bottom action, within thumb reach */}
        <StickyFooter onHeight={setFooterH}>
          {isMock ? (
            <Row gap={space.sm}>
              <Button kind="secondary" label="‹" accessibilityLabel="Previous question" disabled={active.index === 0} onPress={() => goTo(active.index - 1)} style={{ paddingHorizontal: space.lg }} />
              <Button kind="secondary" label={flagged ? '⚑ Unflag' : '⚐ Flag'} onPress={() => toggleFlag(qid)} style={{ paddingHorizontal: space.lg }} />
              <Button kind="secondary" label="▦" accessibilityLabel="Question navigator" onPress={() => setNavOpen(true)} style={{ paddingHorizontal: space.lg }} />
              <Button label={isLast ? 'Finish' : 'Next'} onPress={next} style={{ flex: 1 }} />
            </Row>
          ) : submitted ? (
            <Button
              label={isLast ? 'See results' : 'Next question'}
              onPress={next}
              icon={(color) => <ArrowRight size={18} color={color} strokeWidth={ICON_STROKE} />}
            />
          ) : (
            <>
              {selected && <ConfidenceRow value={confidence} onChange={setConfidence} />}
              <Button label="Check answer" onPress={submit} disabled={!selected} />
            </>
          )}
        </StickyFooter>
      </View>
      {/* Mock navigator */}
      <Modal visible={navOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNavOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <ScrollView contentContainerStyle={{ padding: space.lg }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="display">Questions</T>
              <Button kind="ghost" label="Close" onPress={() => setNavOpen(false)} />
            </Row>
            <T v="meta">● answered · ○ not answered · ⚑ flagged</T>
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
                    accessibilityLabel={`Question ${i + 1}, ${done ? 'answered' : 'not answered'}${flag ? ', flagged' : ''}`}
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
