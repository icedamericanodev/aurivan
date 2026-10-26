/**
 * The first day's closing pieces (mobile 1.24, "first five minutes").
 *
 * Plain English for the founder:
 * - `FirstSetDone` is the screen a new learner sees right after their first
 *   five questions. It replaces the normal Results page for that one set
 *   (results.tsx hands over to it). Short and kind, one bounded finish:
 *     1. "3 of 5 right" with no percentage ring, plus one fact (the topic most
 *        missed, or "All five right.") and how close the first readiness
 *        range is;
 *     2. a closing plate: tomorrow in one line, "The 2 you missed come back then.",
 *        and (mobile 1.41) an OFFER of a plant: "Plant a seed" plants an oak
 *        (drawn as a seed, "Choose a different plant" opens the picker), "Not
 *        now" is remembered and points to You. Before 1.41 a seed was planted
 *        for every new learner; plants planted that way stay exactly as they
 *        are. Then, under the plate (mobile 1.39), the reminder ask;
 *     3. "Done for today" (the one solid button) and a quiet "Do 5 more".
 *   A set ended early (X → End after 2 answers) is not "done": the headline
 *   is the honest count ("2 answered"), one line says how many are left, the
 *   button says "Back to Today" (Today's Continue asks only those left) and
 *   "Do 5 more" is not offered.
 *   It never says "check" or "diagnose", never offers "Practice the ones you
 *   missed" (a miss is meant to come back tomorrow, not a minute later), and
 *   never shows a badge moment.
 * - `ReminderAsk` is the one reminder question, used on that screen and (once
 *   more, by `SecondAskCard`) on Today the day the learner finishes their 3rd
 *   study day. Mobile 1.39: one row, "Remind me tomorrow at [7:00 PM]": the
 *   button is the only one with emphasis, the time chip opens the hour and
 *   minute steppers. The phone's own permission box appears only when the
 *   button is tapped; "Not now" is respected and never asked again after the
 *   second chance.
 * - `FirstRangePanel` is the calm card on Today, right under the readiness
 *   range, the first time that range appears: what it is (an estimate), the
 *   strongest and the weakest domain. Still, no confetti.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { BackHandler, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCertification } from '../content/certifications';
import type { Certification } from '../content/types';
import { findQuestion } from '../content/loader';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { FIRST_SET_SIZE } from '../content/firstSet';
import { comeBackLine, defaultReminderTime, firstRange, firstSetFact, REMINDER_ASK_LEAD, reminderAskLine, tomorrowPreview } from '../engine/firstRun';
import { missedSubtopics } from '../engine/outline';
import { plantCallName, plantShown } from '../engine/plant';
import type { Readiness } from '../engine/readiness';
import { RANGE_MIN_ANSWERS } from '../engine/readinessRange';
import { localHour, localTime, MINUTE_STEP, stepTime } from '../engine/reminders';
import { ANNOUNCE_DELAY, moveFocus, sayLater } from '../lib/a11y';
import { firstSetLeftOf } from '../lib/firstSet';
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
import { LARGE_TEXT, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Seedling } from './glyphs';
import { ChevronDown, ICON_STROKE } from './icons';
import { AnimatedPressable, usePressScale } from './motion';
import { StickyFooter } from './quiz';
import { Sheet } from './settings';
import { Button, Card, Enter, Gap, ICON_SIZE, Row, Stepper, T, useFontScale } from './ui';

// ── The reminder ask ─────────────────────────────────────────────────────
type Phase = 'idle' | 'working' | 'on' | 'blocked' | 'later';

/**
 * The one reminder question. `which` is 'first' (the Day-1 closing screen) or
 * 'second' (the one second chance on Today). It draws nothing where reminders
 * cannot work (Expo Go on Android) or are already on.
 *
 * Mobile 1.39: one row that reads as a sentence, "Remind me tomorrow at
 * [9:00 PM]". The button turns the reminder on; the time chip beside it opens
 * the same hour and minute steppers Settings uses. "Not now" sits under it.
 * (Before, three ghost links, "Earlier", "Later" and "Not now", crowded the ask.)
 */
export function ReminderAsk({
  which,
  onNotNow,
  style,
}: {
  which: 'first' | 'second';
  onNotNow?: () => void;
  /** Spacing from the caller, on whatever is drawn (nothing is drawn when there is nothing to ask). */
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const enabled = useSettings((s) => s.reminder.enabled);
  const asked = useSeen((s) => s.reminderAsk?.first);
  // The default time is the hour the learner is studying now; the sheet moves it by hours and 15 minutes.
  const [time, setTime] = useState(() => defaultReminderTime(Date.now()));
  const [phase, setPhase] = useState<Phase>('idle');
  // The time sheet (Settings' steppers) and which way the time last moved, so both steppers roll that way.
  const [picking, setPicking] = useState(false);
  const [timeDir, setTimeDir] = useState<1 | -1>(1);
  const chipRef = useRef<View>(null);
  const fontScale = useFontScale();

  const moveTime = (deltaMinutes: number) => {
    setTimeDir(deltaMinutes < 0 ? -1 : 1);
    setTime((t) => stepTime(t.hour, t.minute, deltaMinutes));
  };
  // Closing the sheet puts focus back on the chip that opened it. The chip says the new time itself
  // ("Reminder time, 8:15 PM"), so nothing else is announced (one announcement, not two).
  const closePicker = () => {
    setPicking(false);
    moveFocus(chipRef, ANNOUNCE_DELAY);
  };
  // "Not now" takes the ask away: say so, then the caller moves focus somewhere that still exists
  // (UX review B1; focus must never be left on a removed button).
  const notNow = () => {
    useSeen.getState().noteReminderAsk('first', 'later');
    setPhase('later');
    sayLater('No reminder set. You can choose one in Settings.');
    onNotNow?.();
  };
  const accept = async () => {
    setPhase('working');
    try {
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
    } catch {
      // A native error (the permission check failed): never leave the button stuck on "working".
      // The calm way out is the same as "Not now" (which says "No reminder set…"); Settings can still set a reminder.
      notNow();
    }
  };

  if (!remindersSupported) return null;
  if (phase === 'later') return null;
  if (phase === 'on') {
    return (
      <View style={style}>
        <T v="small" color={c.ink2}>{`Done. I’ll remind you at ${localTime(time.hour, time.minute)}. You can change this in Settings.`}</T>
      </View>
    );
  }
  if (phase === 'blocked') {
    return (
      <View style={style}>
        <T v="small" color={c.ink2}>Notifications are off for KaiSip on this phone. You can turn them on in the phone’s Settings, then choose a time here in Settings.</T>
      </View>
    );
  }
  // Already on (set up in Settings, or restored), or answered before and this is the first-run screen: nothing to ask.
  if (enabled || (which === 'first' && asked !== undefined)) return null;

  const shown = localTime(time.hour, time.minute);
  const busy = phase === 'working';
  // Large text: the chip drops under the button. Otherwise the row stays one line and, on a narrow
  // screen, the button's words wrap inside their pill instead (the chip never shrinks).
  const large = fontScale >= LARGE_TEXT;
  return (
    <View style={[{ gap: space.xs }, style]}>
      {/* One row, read as one sentence. */}
      <Row gap={space.sm} style={{ flexWrap: large ? 'wrap' : 'nowrap' }}>
        <Button
          kind="secondary"
          // A no-break space joins "tomorrow at": on a narrow screen the words wrap as "Remind me /
          // tomorrow at", never with "at" alone. The button alone ends in "at", so the spoken name
          // carries the whole sentence (ordinary spaces).
          label={REMINDER_ASK_LEAD.replace(/ at$/, '\u00A0at')}
          accessibilityLabel={reminderAskLine(time.hour, time.minute)}
          accessibilityHint="Turns on a study reminder. Your phone may ask to allow notifications."
          disabled={busy}
          onPress={accept}
          // 16 a side (the pill's usual 32 is for a lone button), so with the chip beside it the row fits 393pt.
          style={{ flexShrink: 1, paddingHorizontal: space.lg }}
        />
        <TimeChip ref={chipRef} time={shown} disabled={busy} onPress={() => setPicking(true)} />
      </Row>
      {/* A ghost after content sits at the gutter (spec §5): -8 cancels its own 8pt padding, so "Not now"
          lines up with the left edge of the button above it. */}
      <Button
        kind="ghost"
        label="Not now"
        accessibilityHint="No reminder. You can set one in Settings."
        onPress={notNow}
        style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
      />
      {/* The same hour and minute steppers as Settings → Time and days. Nothing is saved until the button is tapped. */}
      <Sheet visible={picking} onClose={closePicker} title="Study time" closeLabel="Done" intro="When should the reminder come?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xl, marginTop: space.sm }}>
          <Stepper
            label="Hour"
            spokenLabel="Reminder hour"
            dir={timeDir}
            value={localHour(time.hour)}
            spoken={shown}
            onDec={() => moveTime(-60)}
            onInc={() => moveTime(60)}
          />
          <Stepper
            label="Minutes"
            spokenLabel="Reminder minutes"
            dir={timeDir}
            value={String(time.minute).padStart(2, '0')}
            spoken={shown}
            onDec={() => moveTime(-MINUTE_STEP)}
            onInc={() => moveTime(MINUTE_STEP)}
          />
        </View>
        <T v="meta" style={{ marginTop: space.md }}>At most one reminder a day. You can change it in Settings.</T>
      </Sheet>
    </View>
  );
}

/**
 * The reminder ask's time chip: an outlined pill with the time and a down chevron (it opens the
 * time sheet). 56pt tall, the same height as the button beside it (and well over the 48pt touch target).
 */
function TimeChip({ time, onPress, disabled, ref }: { time: string; onPress: () => void; disabled?: boolean; ref?: Ref<View> }) {
  const { c } = useTheme();
  const press = usePressScale({ tint: c.soft, tintRadius: radius.pill });
  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={`Reminder time, ${time}`}
      accessibilityHint="Opens the time picker."
      accessibilityState={disabled ? { disabled } : undefined}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        {
          minHeight: 56,
          maxWidth: '100%',
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: c.control,
          paddingHorizontal: space.md,
          flexShrink: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
        },
        press.style,
      ]}
    >
      {press.layer}
      <T v="label" style={{ fontVariant: ['tabular-nums'], flexShrink: 1 }}>{time}</T>
      <ChevronDown size={ICON_SIZE.inline} color={c.ink2} strokeWidth={ICON_STROKE} />
    </AnimatedPressable>
  );
}

/** Today's one second chance at the ask (the day the 3rd study day is done). It counts as shown the moment it appears. */
export function SecondAskCard({ onGone }: { /** "Not now" took the card away: move screen-reader focus to something still on screen. */ onGone?: () => void }) {
  const { c } = useTheme();
  // "Not now" takes the whole card away (the answer is remembered; it never comes back).
  const [gone, setGone] = useState(false);
  useEffect(() => {
    useSeen.getState().noteReminderAsk('second');
  }, []);
  if (gone) return null;
  return (
    // An L1 plate, not a raised card: it is an invitation, not something to choose between (spec §5 rule 3).
    <Card variant="plate" style={{ gap: space.sm }}>
      <T v="label">A study time can help</T>
      <T v="small" color={c.ink2}>Studying at about the same time each day makes it easier to keep going.</T>
      <ReminderAsk
        which="second"
        onNotNow={() => {
          setGone(true);
          onGone?.();
        }}
      />
    </Card>
  );
}

// ── The Day-1 closing screen ─────────────────────────────────────────────
export function FirstSetDone({ session }: { session: ActiveSession }) {
  const { c } = useTheme();
  const j = useJourney();
  const certId = session.certId;
  const cert = getCertification(certId);
  const score = useMemo(() => scoreSession(session), [session]);
  const missed = useMemo(() => session.questionIds.filter((id) => session.responses[id] && !session.responses[id].correct), [session]);
  const headRef = useRef<View>(null);
  // "Not now" on the reminder ask removes it: screen-reader focus goes to the footer's main button (UX review B1).
  const doneRef = useRef<View>(null);
  const [footerH, setFooterH] = useState(120);
  // Ended early: some of the five have never been answered (this set or, after a resume, an earlier one).
  const answers = useProgress((s) => selectCert(s, certId).answers);
  const left = useMemo(() => firstSetLeftOf(certId, answers).length, [certId, answers]);
  const endedEarly = left > 0;

  // The topic most missed: the study note behind the misses, else the domain of the first miss.
  const topic = useMemo(() => {
    const notes = missedSubtopics(missed, (id) => {
      const sub = subtopicOfQuestion(certId, id);
      return sub && findNote(certId, sub) ? sub : undefined;
    });
    if (notes[0]) return findNote(certId, notes[0].id)?.name;
    return undefined;
  }, [missed, certId]);

  // Mobile 1.41 (owner decision A): the plant is OFFERED here, never planted for the learner. A learner
  // who turned plants off, or already has one, is not asked; "Not now" is remembered (store/seen.ts).
  const plantOn = useProgress((s) => plantShown(s.plantSettings));
  const plant = useProgress((s) => selectCert(s, certId).plant);
  const plantLater = useSeen((s) => s.plantOffer === 'later');
  // Kept for this visit, so "Not now" can say where planting lives instead of vanishing.
  const [offerAnswer, setOfferAnswer] = useState<'later' | null>(null);
  const offerRef = useRef<View>(null);
  // One decision at a time (review 1.41): the plant is offered only once the reminder ask is answered,
  // or when there is none to show (reminders already on, or not possible on this phone).
  const reminderOn = useSettings((s) => s.reminder.enabled);
  const reminderAnswered = useSeen((s) => s.reminderAsk?.first !== undefined);
  const askSettled = !remindersSupported || reminderOn || reminderAnswered;
  const offerPlant = plantOn && !plant && askSettled && (!plantLater || offerAnswer === 'later');
  // At large text the seedling sits above the words, so the words keep the full width.
  const large = useFontScale() >= LARGE_TEXT;

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
  // useFocusEffect, not useEffect: with "Choose a different plant" open on top, Back there must close the
  // picker, so this handler is only active while the closing screen itself is in front.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        done();
        return true;
      });
      return () => sub.remove();
    }, [done]),
  );

  const tomorrow = tomorrowPreview(j.plan.filter((i) => i.kind !== 'review'));
  const comeBack = comeBackLine(missed.length);
  const fact = firstSetFact(score.correct, score.answered, topic ?? (missed[0] ? domainOf(cert, certId, missed[0]) : undefined));
  const toward = j.range.enough ? RANGE_MIN_ANSWERS : RANGE_MIN_ANSWERS - j.range.needed;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.xl, paddingBottom: footerH + space.xl }}>
        <Enter i={0}>
          <T v="caption" color={c.accentText}>Your first five</T>
          {/* Ended early: the honest count ("2 answered"), never "2 of 2" as if the set were complete. */}
          <View
            ref={headRef}
            accessible
            accessibilityRole="header"
            accessibilityLabel={endedEarly ? `${score.answered} answered` : `${score.correct} of ${score.answered} right`}
            style={{ marginTop: space.sm }}
          >
            {/* "3 of 5 right": the words a screen reader says, and the same headline Results uses. */}
            <T v="display">{endedEarly ? `${score.answered} answered` : `${score.correct} of ${score.answered} right`}</T>
          </View>
          {/* The fact in Results' small style: the italic `quote` voice is kept for Key idea and the plant (UX review S2). */}
          <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>{fact}</T>
          {endedEarly && <T v="body" style={{ marginTop: space.sm }}>{`${left} left. Continue them from Today when you are ready.`}</T>}
          <T v="meta" style={{ marginTop: space.md }}>
            {j.range.enough ? 'Your readiness range is on Today.' : `${toward} of ${RANGE_MIN_ANSWERS} for your first range`}
          </T>
        </Enter>

        <Enter i={1} style={{ marginTop: space.xl }}>
          {/* An L1 plate, not a raised card: a closing summary is not something to choose between (spec §5 rule 3). */}
          <Card variant="plate" style={{ gap: space.md }}>
            <T v="caption" color={c.accentText}>Tomorrow</T>
            {tomorrow ? <T v="body">{tomorrow}</T> : <T v="body">Your next plan is ready when you open the app.</T>}
            {comeBack && <T v="body">{comeBack}</T>}
            {plantOn && plant && (
              <Row gap={space.md} style={large ? { flexDirection: 'column', alignItems: 'flex-start' } : { alignItems: 'center' }}>
                {/* A seed, not the plant drawing: Results stays light and the plant keeps its own screens.
                    Decorative: hidden from TalkBack (importantForAccessibility) and VoiceOver (accessibilityElementsHidden). */}
                <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ marginLeft: -space.sm }}>
                  <Seedling color={c.accent} size={64} />
                </View>
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
          </Card>
        </Enter>
        {/* Mobile 1.39: the reminder ask is its own block under the plate (one job per block), with the
            full width it needs to read as one row, "Remind me tomorrow at [time]". */}
        <Enter i={2}>
          {/* The margin is the ask's own, so a closing screen with nothing to ask has no empty gap. */}
          <ReminderAsk which="first" style={{ marginTop: space.xl }} onNotNow={() => moveFocus(doneRef, ANNOUNCE_DELAY + 50)} />
        </Enter>
        {/* Then the plant, in its own block under the ask (one decision at a time). */}
        {offerPlant && (
          <Card variant="plate" style={{ marginTop: space.xl }}>
            <PlantOffer
              answered={offerAnswer === 'later'}
              large={large}
              lineRef={offerRef}
              onPlant={() => {
                plantFor(certId, 'oak', '');
                sayLater('Seed planted. It grows as you learn.');
              }}
              onNotNow={() => {
                useSeen.getState().setPlantOffer('later');
                setOfferAnswer('later');
                // The buttons go: focus moves to the line that says where planting lives.
                moveFocus(offerRef, ANNOUNCE_DELAY);
              }}
            />
          </Card>
        )}
      </ScrollView>
      <StickyFooter onHeight={setFooterH}>
        <Button ref={doneRef} label={endedEarly ? 'Back to Today' : 'Done for today'} onPress={done} />
        {!endedEarly && (
          <Button
            kind="ghost"
            label="Do 5 more"
            accessibilityHint="Starts five more questions"
            onPress={fiveMore}
            style={{ alignSelf: 'center' }}
          />
        )}
      </StickyFooter>
    </SafeAreaView>
  );
}

/**
 * Mobile 1.41: the plant, offered (never planted for the learner). Two quiet ghost buttons: the
 * closing screen's one solid button stays "Done for today". "Maybe later" (not "Not now": that is the
 * reminder's) swaps the buttons for one line saying where planting lives, so the choice is respected
 * and still easy to undo. At large text the seedling sits above the words.
 */
function PlantOffer({
  answered,
  large,
  lineRef,
  onPlant,
  onNotNow,
}: {
  answered: boolean;
  large: boolean;
  lineRef: Ref<View>;
  onPlant: () => void;
  onNotNow: () => void;
}) {
  const { c } = useTheme();
  return (
    <Row gap={space.md} style={large ? { flexDirection: 'column', alignItems: 'flex-start' } : { alignItems: 'center' }}>
      <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ marginLeft: -space.sm }}>
        <Seedling color={c.accent} size={64} />
      </View>
      <View style={large ? { alignSelf: 'stretch' } : { flex: 1 }} testID="plant-offer">
        {answered ? (
          <View ref={lineRef} accessible accessibilityLabel="No plant for now. You can plant one any time from You.">
            <T v="small">No plant for now. You can plant one any time from You.</T>
          </View>
        ) : (
          <>
            <T v="small">Want a plant that grows as you learn? It’s optional.</T>
            <Row gap={0} style={{ flexWrap: 'wrap', marginLeft: -space.sm }}>
              <Button kind="ghost" label="Plant a seed" accessibilityHint="Plants an oak. You can choose a different plant after." onPress={onPlant} />
              <Button kind="ghost" label="Maybe later" accessibilityLabel="Maybe later, no plant for now" onPress={onNotNow} />
            </Row>
          </>
        )}
      </View>
    </Row>
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
 * sits right under the range it explains (Today's readiness row), once, then
 * goes. Static: no motion, no confetti, no single percentage, and the plain
 * reminder that it is an estimate. It adds the two facts a first range makes
 * possible: the strongest and the weakest domain.
 */
export function FirstRangePanel({
  cert,
  readiness,
  onOpen,
  onDismiss,
}: {
  cert: Certification;
  readiness: Readiness;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const { c } = useTheme();
  const { strongest, weakest } = firstRange(readiness.domains.map((d) => ({ domainId: d.domainId, mastery: d.mastery, answered: d.answered })));
  // The short name ("IS Audit"), as the rings and Today's lines call each domain.
  const nameOf = (id: string | null) => cert.domains.find((d) => d.id === id)?.short;
  const strong = nameOf(strongest);
  const weak = nameOf(weakest);
  return (
    // An L1 plate: a notice, not a choice (spec §5 rule 3).
    <Card variant="plate" style={{ gap: space.sm }}>
      <T v="caption" color={c.accentText} accessibilityRole="header">Your first readiness range</T>
      <T v="small" color={c.ink2}>It is an estimate of where you stand today, not a prediction of your exam result. It narrows as you answer more.</T>
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
