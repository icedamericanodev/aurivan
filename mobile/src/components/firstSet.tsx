/**
 * The first day's closing pieces (mobile 1.24, "first five minutes").
 *
 * Plain English for the founder:
 * - `FirstSetDone` is the screen a new learner sees right after their first
 *   five questions. It replaces the normal Results page for that one set
 *   (results.tsx hands over to it). Short and kind, one bounded finish:
 *     1. "3 of 5" with no percentage ring, plus one fact (the topic most
 *        missed, or "All five right.") and how close the first readiness
 *        range is;
 *     2. a closing card: tomorrow in one line, "2 will come back tomorrow",
 *        a seed planted for you (oak; "Choose a different plant" opens the
 *        picker), and the reminder ask;
 *     3. "Done for today" (the one solid button) and a quiet "Do 5 more".
 *   It never says "check" or "diagnose", never offers "Practice the ones you
 *   missed" (a miss is meant to come back tomorrow, not a minute later), and
 *   never shows a badge moment.
 * - `ReminderAsk` is the one reminder question, used on that screen and (once
 *   more, by `SecondAskCard`) on Today the day the learner finishes their 3rd
 *   study day. "Tomorrow I'll study at 7:00 PM" is the only button with
 *   emphasis; the phone's own permission box appears only when it is tapped;
 *   "Not now" is respected and never asked again after the second chance.
 * - `FirstRangePanel` is the calm card on Today the first time the readiness
 *   range appears: the range, the strongest and the weakest domain. Still,
 *   no confetti.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCertification } from '../content/certifications';
import type { Certification } from '../content/types';
import { findQuestion } from '../content/loader';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { FIRST_SET_SIZE } from '../content/firstSet';
import { comeBackLine, defaultReminderTime, firstRange, firstSetFact, reminderAskLine, tomorrowPreview } from '../engine/firstRun';
import { missedSubtopics } from '../engine/outline';
import { plantCallName, plantLabel, plantShown } from '../engine/plant';
import type { Readiness } from '../engine/readiness';
import { RANGE_MIN_ANSWERS, type ReadinessRange } from '../engine/readinessRange';
import { localTime, stepTime } from '../engine/reminders';
import { moveFocus, sayLater } from '../lib/a11y';
import { deferMissesToTomorrow } from '../lib/firstSet';
import { scoreSession } from '../lib/finishSession';
import { plantFor } from '../lib/plant';
import { refreshReminders } from '../lib/reminderSync';
import { ensurePermission, remindersSupported } from '../lib/reminders';
import { startPractice, guardedStart } from '../lib/sessions';
import { useJourney } from '../lib/useJourney';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession, type ActiveSession } from '../store/session';
import { useSettings } from '../store/settings';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ReadinessFigure } from './journey';
import { StickyFooter } from './quiz';
import { Button, Card, Enter, Gap, Row, T } from './ui';
import { LivePlant } from './plant/LivePlant';

// ── The reminder ask ─────────────────────────────────────────────────────
type Phase = 'idle' | 'working' | 'on' | 'blocked' | 'later';

/**
 * The one reminder question. `which` is 'first' (the Day-1 closing screen) or
 * 'second' (the one second chance on Today). It draws nothing where reminders
 * cannot work (Expo Go on Android) or are already on.
 */
export function ReminderAsk({ which }: { which: 'first' | 'second' }) {
  const { c } = useTheme();
  const enabled = useSettings((s) => s.reminder.enabled);
  const asked = useSeen((s) => s.reminderAsk?.first);
  // The default time is the hour the learner is studying now; the stepper moves it by whole hours.
  const [time, setTime] = useState(() => defaultReminderTime(Date.now()));
  const [phase, setPhase] = useState<Phase>('idle');

  const accept = async () => {
    setPhase('working');
    const allowed = await ensurePermission();
    if (!allowed) {
      // The phone said no: remember it, say how to change it, and never ask again.
      useSeen.getState().noteReminderAsk('first', 'blocked');
      setPhase('blocked');
      sayLater('Notifications are off for KaiSip on this phone.');
      return;
    }
    const current = useSettings.getState().reminder;
    useSettings.getState().setReminder({ ...current, enabled: true, hour: time.hour, minute: time.minute });
    await refreshReminders();
    useSeen.getState().noteReminderAsk('first', 'on');
    setPhase('on');
    sayLater(`Reminder set for ${localTime(time.hour, time.minute)}.`);
  };
  const notNow = () => {
    useSeen.getState().noteReminderAsk('first', 'later');
    setPhase('later');
  };

  if (!remindersSupported) return null;
  if (phase === 'later') return null;
  if (phase === 'on') {
    return <T v="small" color={c.ink2}>{`Done. I’ll remind you at ${localTime(time.hour, time.minute)}. You can change this in Settings.`}</T>;
  }
  if (phase === 'blocked') {
    return <T v="small" color={c.ink2}>Notifications are off for KaiSip on this phone. You can turn them on in the phone’s Settings, then choose a time here in Settings.</T>;
  }
  // Already on (set up in Settings, or restored), or answered before and this is the first-run screen: nothing to ask.
  if (enabled || (which === 'first' && asked !== undefined)) return null;

  const spoken = `Tomorrow I’ll study at ${localTime(time.hour, time.minute)}`;
  return (
    <View style={{ gap: space.sm }}>
      <Button
        kind="secondary"
        label={reminderAskLine(time.hour, time.minute)}
        accessibilityLabel={spoken}
        accessibilityHint="Turns on a study reminder. Your phone may ask to allow notifications."
        disabled={phase === 'working'}
        onPress={accept}
      />
      <Row style={{ flexWrap: 'wrap' }}>
        <Button
          kind="ghost"
          label="Earlier"
          accessibilityLabel="One hour earlier"
          onPress={() => setTime((t) => stepTime(t.hour, t.minute, -60))}
        />
        <Button
          kind="ghost"
          label="Later"
          accessibilityLabel="One hour later"
          onPress={() => setTime((t) => stepTime(t.hour, t.minute, 60))}
        />
        <Button kind="ghost" label="Not now" accessibilityHint="No reminder. You can set one in Settings." onPress={notNow} />
      </Row>
    </View>
  );
}

/** Today's one second chance at the ask (the day the 3rd study day is done). It counts as shown the moment it appears. */
export function SecondAskCard() {
  const { c } = useTheme();
  useEffect(() => {
    useSeen.getState().noteReminderAsk('second');
  }, []);
  return (
    <Card style={{ gap: space.sm }}>
      <T v="label">A study time can help</T>
      <T v="small" color={c.ink2}>Studying at about the same time each day makes it easier to keep going.</T>
      <ReminderAsk which="second" />
    </Card>
  );
}

// ── The Day-1 closing screen ─────────────────────────────────────────────
export function FirstSetDone({ session }: { session: ActiveSession }) {
  const { c, isDark } = useTheme();
  const j = useJourney();
  const certId = session.certId;
  const cert = getCertification(certId);
  const score = useMemo(() => scoreSession(session), [session]);
  const missed = useMemo(() => session.questionIds.filter((id) => session.responses[id] && !session.responses[id].correct), [session]);
  const headRef = useRef<View>(null);
  const [footerH, setFooterH] = useState(120);

  // The topic most missed: the study note behind the misses, else the domain of the first miss.
  const topic = useMemo(() => {
    const notes = missedSubtopics(missed, (id) => {
      const sub = subtopicOfQuestion(certId, id);
      return sub && findNote(certId, sub) ? sub : undefined;
    });
    if (notes[0]) return findNote(certId, notes[0].id)?.name;
    return undefined;
  }, [missed, certId]);

  // A miss comes back tomorrow, not in a minute (once per set).
  const deferred = useRef<string | null>(null);
  useEffect(() => {
    if (deferred.current === session.id) return;
    deferred.current = session.id;
    deferMissesToTomorrow(certId, missed);
  }, [session.id, certId, missed]);

  // The seed: planted for the learner, passively (oak). A learner who turned plants off gets none.
  const plantOn = useProgress((s) => plantShown(s.plantSettings));
  const plant = useProgress((s) => selectCert(s, certId).plant);
  useEffect(() => {
    if (plantOn && !plant) plantFor(certId, 'oak', '');
  }, [plantOn, plant, certId]);

  useEffect(() => {
    moveFocus(headRef, 500);
  }, []);

  const done = useCallback(() => {
    useSession.getState().clear();
    router.replace('/home');
  }, []);
  // "Do 5 more": the learner's choice, an ordinary short set (confidence chips and all).
  const fiveMore = () => {
    guardedStart(
      () => {
        useSession.getState().clear();
        return startPractice(certId, { count: FIRST_SET_SIZE, title: 'Five more' });
      },
      () => router.replace('/session'),
      () => router.replace('/home'),
    );
  };
  // Android Back means "Done for today" here, never a way back into the finished set.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      done();
      return true;
    });
    return () => sub.remove();
  }, [done]);

  const tomorrow = tomorrowPreview(j.plan.filter((i) => i.kind !== 'review'));
  const comeBack = comeBackLine(missed.length);
  const fact = firstSetFact(score.correct, score.answered, topic ?? (missed[0] ? domainOf(cert, certId, missed[0]) : undefined));
  const toward = j.range.enough ? RANGE_MIN_ANSWERS : RANGE_MIN_ANSWERS - j.range.needed;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.xl, paddingBottom: footerH + space.xl }}>
        <Enter i={0}>
          <T v="caption" color={c.accentText}>Your first five</T>
          <View ref={headRef} accessible accessibilityRole="header" accessibilityLabel={`${score.correct} of ${score.answered} right`} style={{ marginTop: space.sm }}>
            <T v="display">{`${score.correct} of ${score.answered}`}</T>
          </View>
          <T v="quote" color={c.ink2} style={{ marginTop: space.sm }}>{fact}</T>
          <T v="meta" style={{ marginTop: space.md }}>
            {j.range.enough ? 'Your readiness range is on Today.' : `${toward} of ${RANGE_MIN_ANSWERS} for your first range`}
          </T>
        </Enter>

        <Enter i={1} style={{ marginTop: space.xl }}>
          <Card style={{ gap: space.md }}>
            <T v="caption" color={c.accentText}>Tomorrow</T>
            {tomorrow ? <T v="body">{tomorrow}</T> : <T v="body">Your next plan is ready when you open the app.</T>}
            {comeBack && <T v="body">{comeBack}</T>}
            {plantOn && plant && (
              <Row gap={space.md} style={{ alignItems: 'center' }}>
                <LivePlant
                  species={plant.species}
                  stage={plant.growth}
                  size={72}
                  theme={isDark ? 'dark' : 'light'}
                  fit
                  quietLook
                  plantIn
                  accessibilityLabel={plantLabel({ name: plant.name, species: plant.species, growth: plant.growth })}
                />
                <View style={{ flex: 1 }}>
                  <T v="small">{`${plantCallName(plant)} is planted. It grows as you learn.`}</T>
                  <Button
                    kind="ghost"
                    label="Choose a different plant"
                    onPress={() => router.push({ pathname: '/plant-pick', params: { mode: 'species' } })}
                    style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
                  />
                </View>
              </Row>
            )}
            <ReminderAsk which="first" />
          </Card>
        </Enter>
      </ScrollView>
      <StickyFooter onHeight={setFooterH}>
        <Button label="Done for today" onPress={done} />
        <Button
          kind="ghost"
          label="Do 5 more"
          accessibilityHint="Starts five more questions"
          onPress={fiveMore}
          style={{ alignSelf: 'center' }}
        />
      </StickyFooter>
    </SafeAreaView>
  );
}

/** The short name of the domain a question belongs to (the fallback when no study note lists it). */
function domainOf(cert: Certification | undefined, certId: string, questionId: string): string | undefined {
  const domainId = findQuestion(certId, questionId)?.domainId;
  return cert?.domains.find((d) => d.id === domainId)?.short;
}

// ── Today: "Your first readiness range" ──────────────────────────────────
/**
 * The calm card that names the moment the readiness range first appears. It
 * takes the place of Today's readiness row once, then goes. Static: no
 * motion, no confetti, no single percentage, and the plain reminder that it
 * is an estimate.
 */
export function FirstRangePanel({
  cert,
  readiness,
  range,
  onOpen,
  onDismiss,
}: {
  cert: Certification;
  readiness: Readiness;
  range: ReadinessRange;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const { c } = useTheme();
  const { strongest, weakest } = firstRange(readiness.domains.map((d) => ({ domainId: d.domainId, mastery: d.mastery, answered: d.answered })));
  const nameOf = (id: string | null) => cert.domains.find((d) => d.id === id)?.name;
  const strong = nameOf(strongest);
  const weak = nameOf(weakest);
  return (
    <Card style={{ gap: space.sm }}>
      <T v="caption" color={c.accentText} accessibilityRole="header">Your first readiness range</T>
      <ReadinessFigure range={range} size={38} />
      <T v="small" color={c.ink2}>An estimate of where you stand today, not a prediction of your exam result. It narrows as you answer more.</T>
      {strong && <T v="body">{`Strongest so far: ${strong}`}</T>}
      {weak && <T v="body">{`Needs the most work: ${weak}`}</T>}
      <Gap h={space.xs} />
      <Row style={{ flexWrap: 'wrap' }}>
        <Button kind="ghost" label="See the report" accessibilityHint="Opens your readiness report" onPress={onOpen} style={{ marginLeft: -space.sm }} />
        <Button kind="ghost" label="Got it" accessibilityLabel="Got it, hide this note" onPress={onDismiss} />
      </Row>
    </Card>
  );
}
