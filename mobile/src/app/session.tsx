/**
 * Session screen — where learning happens.
 *
 * PRACTICE / REVIEW: pick → (confidence) → Submit → instant feedback,
 * explanation, why your pick was wrong, then tips one at a time.
 *
 * MOCK: pick (changeable) → Next. Timer, flags, and a navigator grid.
 * No feedback until you submit the whole exam — just like the real thing.
 */
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, BackHandler, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfidenceRow, OptionCard, ResultBanner, ScenarioBlock, TipsReveal, type OptionState } from '../components/quiz';
import { Button, Card, Gap, Pill, Row, T } from '../components/ui';
import { getCertification, getDomain } from '../content/certifications';
import { findQuestion } from '../content/loader';
import { LETTERS, type Letter } from '../content/types';
import { displayToOriginal, isCorrect, originalToDisplay, renderText } from '../engine/shuffle';
import type { Confidence } from '../engine/srs';
import { finishSession } from '../lib/finishSession';
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

  const qid = active?.questionIds[active.index];
  const q = useMemo(() => (active && qid ? findQuestion(active.certId, qid) : undefined), [active, qid]);
  const perm = active && qid ? active.perms[qid] : undefined;
  const response = active && qid ? active.responses[qid] : undefined;
  const isMock = active?.mode === 'mock';

  // Reset the local picker whenever the question changes.
  useEffect(() => {
    setSelected(isMock && response ? response.display : null);
    setConfidence(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid]);

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
        <T v="heading" center>
          {active ? 'This session can’t continue — its questions were updated.' : 'No session in progress.'}
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
    Haptics.selectionAsync().catch(() => {});
    setSelected(letter);
    if (isMock) {
      answer(qid, { display: letter, correct: isCorrect(q, letter, perm) });
    }
  };

  const submit = () => {
    if (!selected) return;
    const ok = isCorrect(q, selected, perm);
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    AccessibilityInfo.announceForAccessibility(ok ? 'Correct' : 'Not quite. Explanation below.');
    answer(qid, { display: selected, correct: ok, confidence });
    recordAnswer(active.certId, qid, ok, confidence);
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

  const optionState = (display: Letter): OptionState => {
    if (!submitted) return selected === display ? 'selected' : 'idle';
    const original = displayToOriginal(display, perm);
    if (original === q.correct) return 'correct';
    if (response?.display === display) return 'wrong';
    return 'dimmed';
  };

  const pickedOriginal = response ? displayToOriginal(response.display, perm) : undefined;
  const whyWrong = pickedOriginal && pickedOriginal !== q.correct ? q.wrongExplanations[pickedOriginal] : undefined;
  const flagged = active.flagged.includes(qid);
  const saved = bookmarks.includes(qid);
  const lowTime = isMock && remaining < 5 * 60_000;

  // ── render ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: space.lg, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={isMock ? 'Pause exam' : 'End session'} onPress={leave} hitSlop={12}>
            <T v="label" color={c.accentText}>{isMock ? 'Pause' : 'End'}</T>
          </Pressable>
          <T v="label">
            {active.index + 1} / {total}
          </T>
          {isMock ? (
            <T v="label" color={lowTime ? c.wrong : c.text} accessibilityLabel={`Time remaining ${formatClock(remaining)}`}>
              ⏱ {formatClock(remaining)}
            </T>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Remove from saved' : 'Save question'} onPress={() => toggleBookmark(active.certId, qid)} hitSlop={12}>
              <T v="label" color={c.accentText}>{saved ? '★ Saved' : '☆ Save'}</T>
            </Pressable>
          )}
        </Row>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {domain && <Pill label={domain.short} dot={domain.color} />}
          <Pill label={q.difficulty} />
          {flagged && <Pill label="⚑ Flagged" color={c.warning} />}
        </Row>
        <Gap h={space.md} />
        {q.scenario && (
          <>
            <ScenarioBlock text={q.scenario} />
            <Gap h={space.md} />
          </>
        )}
        <T v="heading" style={{ lineHeight: 26 }}>{q.stem}</T>
        <Gap />

        {displayLetters.map((d) => (
          <OptionCard
            key={d}
            letter={d}
            text={q.options[displayToOriginal(d, perm)] ?? ''}
            state={optionState(d)}
            onPress={() => pick(d)}
            disabled={submitted}
          />
        ))}

        {/* Feedback (practice/review only) */}
        {submitted && response && (
          <>
            <Gap h={space.sm} />
            <ResultBanner correct={response.correct} />
            <Gap h={space.md} />
            {whyWrong && (
              <>
                <Card style={{ borderColor: c.wrong }}>
                  <T v="label" color={c.wrong}>Why {response.display} is tempting but wrong</T>
                  <Gap h={space.xs} />
                  <T>{renderText(whyWrong, perm)}</T>
                </Card>
                <Gap h={space.md} />
              </>
            )}
            <Card>
              <T v="label" color={c.correct}>Why {originalToDisplay(q.correct, perm)} is the best answer</T>
              <Gap h={space.xs} />
              <T>{renderText(q.explanation, perm)}</T>
              {q.keyConcept && (
                <>
                  <Gap h={space.md} />
                  <T v="label" color={c.text2}>Key concept</T>
                  <T v="body" color={c.text2}>{q.keyConcept}</T>
                </>
              )}
              {q.reference && (
                <>
                  <Gap h={space.sm} />
                  <T v="caption">Reference: {q.reference}</T>
                </>
              )}
            </Card>
            <Gap h={space.md} />
            <TipsReveal key={qid} tips={q.tips.map((t) => renderText(t, perm))} />
          </>
        )}
      </ScrollView>

      {/* Bottom action bar — within thumb reach */}
      <View style={{ padding: space.lg, paddingBottom: space.md, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, gap: space.md }}>
        {isMock ? (
          <Row gap={space.sm}>
            <Button kind="secondary" label="‹" accessibilityLabel="Previous question" disabled={active.index === 0} onPress={() => goTo(active.index - 1)} style={{ paddingHorizontal: space.lg }} />
            <Button kind="secondary" label={flagged ? '⚑ Unflag' : '⚐ Flag'} onPress={() => toggleFlag(qid)} />
            <Button kind="secondary" label="▦" accessibilityLabel="Question navigator" onPress={() => setNavOpen(true)} style={{ paddingHorizontal: space.lg }} />
            <Button label={isLast ? 'Finish' : 'Next ›'} onPress={next} style={{ flex: 1 }} />
          </Row>
        ) : submitted ? (
          <Button label={isLast ? 'See results' : 'Next question'} onPress={next} />
        ) : (
          <>
            {selected && <ConfidenceRow value={confidence} onChange={setConfidence} />}
            <Button label="Submit answer" onPress={submit} disabled={!selected} />
          </>
        )}
      </View>

      {/* Mock navigator */}
      <Modal visible={navOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNavOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <ScrollView contentContainerStyle={{ padding: space.lg }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="title">Questions</T>
              <Button kind="ghost" label="Close" onPress={() => setNavOpen(false)} />
            </Row>
            <T v="caption">● answered · ○ not answered · ⚑ flagged</T>
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
                      borderColor: current ? c.accent : flag ? c.warning : c.border,
                      backgroundColor: done ? c.accentFill : c.surface,
                    }}
                  >
                    <T v="label" color={done ? c.onAccent : c.text}>{`${flag ? '⚑' : ''}${done ? '●' : '○'}${i + 1}`}</T>
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
