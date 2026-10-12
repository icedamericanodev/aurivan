/**
 * Today — "what is my one next step, and how am I growing?"
 * Spec: docs/mobile/DESIGN_SYSTEM.md §11 "Today" and "Daily clearing card".
 *
 * Top to bottom:
 *   meta row   weekday · days to exam | sprig streak (serif numeral)
 *   "Today"
 *   forest     "Start here" + leaf marks for the plan, the current item, Start
 *   readiness  your plant (mobile 1.13; the mono growth rings when there is
 *              none or it is hidden) + the honest range ("62–70%") + italic stage
 *   Also today the rest of the plan (real, unshortened titles)
 *
 * Your plant (mobile 1.13, Phase 4a): it grows only from real learning. A
 * grow-up gets ONE calm line here (the celebration budget, never Results),
 * and a learner with no plant gets one quiet "Plant a companion" line until
 * they plant or dismiss it. Settings → Show my plant off: none of this.
 *
 * Fit (mobile 1.15, PHASE5.md §2.3, §2.5): the plan is sized to the learner's
 * minutes. Under the leaf marks, "About 20 min today" (the open items; a mock
 * adds "+ mock"); "Also today" and "Tomorrow" say "About N min". A learner
 * from before 1.15 sees ONE quiet "Fit your plan" card below the day's study,
 * once (never in exam week, never beside another moment or the plant's line).
 *
 * When every plan item is done, the forest panel becomes the clearing card
 * (today's numbers + how readiness moved) and "Tomorrow" previews what's next.
 *
 * Proof (mobile 1.16, PHASE5.md §3.1–3.2): tapping the readiness words opens
 * the readiness report (the plant beside them still opens Your plant). From 7
 * to 2 days before the exam, one quiet "Exam week" card sits under the
 * readiness row, above "Also today": the checklist, or Hide.
 *
 * Signature moments (Phase 5b, components/moments.tsx):
 *   - the day before the exam / exam day: a calm card above the panel;
 *   - "Your readiness is holding" (lower bound ≥ 80% for 7 days): the forest
 *     panel, once per cert, until dismissed. Its plan item moves to "Also today".
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ExamEveCard, ExamReadyPanel } from '../../components/moments';
import { ClearingBody, clearingLine, clearingTitle, PlanLeaves, planIcon, planText, ReadinessRow, todayMinutesLine } from '../../components/journey';
import { FitCard } from '../../components/fit';
import { ExamWeekCard } from '../../components/readinessReport';
import { examWeekCardDue, examWeekCount, examWeekOf } from '../../engine/examWeek';
import { Celebrate, Pop, useCelebration, useGrowth, useScreenFocus } from '../../components/motion';
import { ICON_STROKE, Play, Settings, Sprig } from '../../components/icons';
import { PlantButton, PlantNote } from '../../components/plant/PlantUI';
import { BigNum, Button, Enter, HeroPanel, ICON_SIZE, ListRow, Row, Screen, ScreenTitle, Section, T } from '../../components/ui';
import { countedDone, currentIndex, isOptional, itemMinutes, MINUTES_PER_QUESTION, planComplete } from '../../engine/dayPlan';
import { shouldAskFit } from '../../engine/fit';
import { aboutMin, spokenMin } from '../../engine/pace';
import { ANNOUNCE_DELAY, moveFocus, sayLater } from '../../lib/a11y';
import { useSettings } from '../../store/settings';
import { runPlanItem } from '../../lib/actions';
import { haptic } from '../../lib/haptics';
import { useTodayMoments } from '../../lib/moments';
import { useJourney } from '../../lib/useJourney';
import { checkPlant, growQuietly, seeGrowth, usePlantView } from '../../lib/plant';
import { markReacted } from '../../components/plant/LivePlant';
import { grewLabel, growthBefore, plantCallName, type GrowthLevel } from '../../engine/plant';
import { dayKey } from '../../engine/streak';
import { useReports } from '../../lib/useReports';
import { useProgress } from '../../store/progress';
import { useSession, type ActiveSession } from '../../store/session';
import type { PlanItem } from '../../engine/planner';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** "Something you reported was updated." (by different things, not reports). */
function creditLine(items: number): string {
  return items === 1 ? 'Something you reported was updated.' : 'Things you reported were updated.';
}

/**
 * What a paused session still takes: its unanswered questions at study pace
 * (a mock at exam pace, mobile 1.15 C4: a 50-question mini mock is 80 min,
 * as Practice says), but never more than a timed mock has left on its clock
 * (the clock keeps running while it is paused).
 */
function resumeMinutes(s: ActiveSession, now: number, exam: { questions: number; minutes: number }): number {
  const left = s.questionIds.length - Object.keys(s.responses).length;
  const perQuestion = s.mode === 'mock' ? exam.minutes / exam.questions : MINUTES_PER_QUESTION;
  const estimate = Math.max(1, Math.round(left * perQuestion));
  if (s.mode !== 'mock' || !s.deadline) return estimate;
  return Math.max(1, Math.min(estimate, Math.ceil((s.deadline - now) / 60_000)));
}

/** A section's "About N min" (C1), or nothing when only a mock is listed (its row says its length). */
const sectionMinutes = (n: number) => (n > 0 ? aboutMin(n) : undefined);

/**
 * A plan row's short line. The weekly mini mock beside timed items is
 * optional (PR #45, decided): "Optional this week · about 80 min".
 */
function rowShort(item: PlanItem, items: readonly PlanItem[], i: number, due: number | undefined, when: 'today' | 'tomorrow' = 'today'): string {
  return isOptional(items, i) ? `Optional this week · ${aboutMin(itemMinutes(item), true)}` : planText(item, due, when).short;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The growth's haptic stays silent this soon after the clearing's (one haptic for one return to Today). */
const CLEARING_TAP_MS = 5000;

function countdown(daysLeft: number | null): string {
  if (daysLeft === null) return 'No exam date set';
  if (daysLeft < 0) return 'Exam done';
  if (daysLeft === 0) return 'Exam day';
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} to exam`;
}

export default function Today() {
  const { c } = useTheme();
  const j = useJourney();
  const active = useSession((s) => s.active);
  const markCelebrated = useProgress((s) => s.markCelebrated);
  // When the clearing's haptic last played: the plant's growth stays silent right after it (one haptic only).
  const clearingTapAt = useRef(0);
  // The heading under the exam-week card: focus lands there when the card is hidden (code review M3b).
  const nextHeadRef = useRef<View>(null);
  // Mobile 1.7: a fix shipped after something this learner reported. One quiet
  // line, shown ONCE (QA): it is marked seen as soon as Today shows it and
  // kept for this visit (the milestones back-fill pattern), with a Dismiss.
  // No streak, no growth, no badge for reporting.
  const { due: creditDue, dueItems } = useReports();
  const markCreditSeen = useProgress((s) => s.markCreditSeen);
  const [credit, setCredit] = useState<{ items: number; hidden: boolean }>({ items: 0, hidden: false });
  // Set during render (React's pattern for state that follows the store): a
  // new credit, e.g. after a restore while Today is open, shows its own line.
  if (creditDue.length > 0 && (credit.items !== dueItems || credit.hidden)) setCredit({ items: dueItems, hidden: false });
  useEffect(() => {
    if (creditDue.length) markCreditSeen(creditDue.map((r) => r.ref));
  }, [creditDue, markCreditSeen]);
  const plan = j.dayPlan;
  const allDone = planComplete(plan);
  const cur = currentIndex(plan);
  const moments = useTodayMoments({ cert: j.cert, progress: j.progress, range: j.range, examDate: j.examDate, today: plan.day });
  // The one-time panel takes the forest slot while the plan is still open.
  const showReady = moments.ready && plan.items.length > 0 && !allDone;
  // The clock for a paused mock's minutes left: read when Today opens or comes back into view.
  const [now, setNow] = useState(() => Date.now());
  const certId = j.cert.id;
  useFocusEffect(
    useCallback(() => {
      // Only a new clock that changes what Today shows re-renders it (performance,
      // 1.15.x): a new day (the plant's reaction), or a paused timed mock's minutes left.
      const at = Date.now();
      setNow((was) => (dayKey(was) === dayKey(at) && !useSession.getState().active?.deadline ? was : at));
      // The plant's exam-ready gate changes with the date: check it whenever Today comes into view.
      checkPlant(certId);
    }, [certId]),
  );
  const playIcon = (color: string) => <Play size={ICON_SIZE.inline} color={color} strokeWidth={ICON_STROKE} />;

  // Mobile 1.9 motion: growth plays when Today is ON VIEW (it changes while a
  // session sits on top), shows what went up since you last looked, and
  // never replays on a later visit (components/motion.tsx useGrowth).
  const focused = useScreenFocus();
  const cert = j.cert.id;
  const ringsGrowth = useGrowth(`today:rings:${cert}`, j.readiness.domains.map((d) => Math.round(d.mastery * 100)), { active: focused, firstOfDay: true });
  const rangeGrowth = useGrowth(`today:range:${cert}`, j.range.enough ? [j.range.low, j.range.high] : [], { active: focused, firstOfDay: true });
  // The streak rolls +1 on a new day's first study; a reset is just shown.
  const streakGrowth = useGrowth(`today:streak`, [j.streak], { active: focused });

  // The clearing (T2): once a day, when you come back to it. It plays in full
  // (≤ 1.2 s, a tap skips it) the first few times, then shortened; static
  // with Reduce Motion. Its words are the same in every mode, and spoken once.
  // Keyed by the plan's day: Today stays mounted overnight, and tomorrow's
  // clearing is a new occasion.
  const clearing = useCelebration(
    'clearing',
    allDone && focused && !plan.celebrated,
    `Today’s clearing. ${clearingTitle(plan)} ${clearingLine(plan, j.readiness, j.range)}.`,
    `${cert}:${plan.day}`,
  );
  // The clearing's one success tap, once a day (respects the Haptics setting),
  // as it comes into view (not while Results is still on top).
  useEffect(() => {
    if (allDone && focused && !plan.celebrated) {
      haptic.success();
      clearingTapAt.current = Date.now();
      markCelebrated(j.cert.id);
    }
  }, [allDone, focused, plan.celebrated, markCelebrated, j.cert.id]);
  // The exam-ready moment (T3): the rings grow and the frond breathes once,
  // once EVER per cert (saved): later launches show the panel still, unannounced.
  const ready = useCelebration('exam-ready', showReady && focused, 'A quiet milestone. Your readiness is holding.', `exam-ready:${cert}`, true);
  // Your plant (mobile 1.13). A grow-up is kept for this visit (the pending
  // mark is cleared as soon as it shows, so it plays once), then one calm
  // line through the celebration budget. Hidden plant: no line, no prompt.
  const plantView = usePlantView();
  const pending = plantView.plant?.pending;
  const [grown, setGrown] = useState<{ growth: GrowthLevel; line: string } | null>(null);
  // Code review M1: the exam-ready panel and Elder usually arrive on the same
  // visit (both come from a week held at 80%+). ONE moment: the panel keeps
  // it, and the growth is applied silently (no sequence on the hidden plant,
  // no second haptic); Your plant says it in a calm line next time.
  const quietly = !!pending && showReady;
  // Set during render (React's pattern for state that follows the store).
  if (pending && plantView.plant && !quietly && grown?.growth !== pending) setGrown({ growth: pending, line: grewLabel(plantView.plant, pending) });
  useEffect(() => {
    if (!pending || !focused) return;
    if (quietly) growQuietly(cert, pending);
    else seeGrowth(cert);
  }, [pending, focused, cert, quietly]);
  // Shown for this visit only: leaving Today puts the line away (Today stays mounted for days).
  useFocusEffect(useCallback(() => () => setGrown(null), []));
  // Mobile 1.14: the growth sequence (≤ 900 ms) plays in the plant's own
  // slot, through the celebration budget: one full moment per session. A
  // milestone keeps its Results moment; then the growth shows here in its
  // short form (a cross-fade), never competing. Static under Reduce Motion.
  const growthMoment = useCelebration('plant-growth', Boolean(grown) && focused, grown?.line, `${cert}:plant:${grown?.growth ?? 0}`);
  // One success haptic for the growth, once, unless the clearing plays its own this visit (one haptic only).
  const growRun = growthMoment.run;
  useEffect(() => {
    if (growRun > 0 && Date.now() - clearingTapAt.current > CLEARING_TAP_MS) haptic.success();
  }, [growRun]);
  const growFrom = grown && plantView.plant ? growthBefore(plantView.plant, grown.growth) : null;
  // The plant's one reaction for this occasion (its mood and the day), wherever
  // it is first seen this session. Never on a growth visit (UX review H4: the
  // growth IS that day's proud moment, so the occasion is spent), and it waits
  // while the clearing plays (one thing moves at a time).
  const reactionId = plantView.look ? `${cert}:${plantView.look.mood}:${dayKey(now)}` : null;
  useEffect(() => {
    if (grown && reactionId) markReacted(reactionId);
  }, [grown, reactionId]);
  const reaction = plantView.look && reactionId && focused && !grown && clearing.settled ? { id: reactionId, mood: plantView.look.mood } : null;
  // Today is study-first: the plant and its visitor, never the keepsakes (UX review, decided).
  const todayLook = plantView.look ? { ...plantView.look.art, keepsakes: [] } : undefined;
  const todayPlant = (size: number, testID: string) =>
    plantView.plant ? (
      <PlantButton
        testID={testID}
        species={plantView.plant.species}
        growth={plantView.plant.growth}
        scales={plantView.scales}
        quietLook={!plantView.face}
        resting={plantView.resting}
        size={size}
        // Small detail at Today's sizes: the full level's extra marks don't read there (code review M6d).
        lod="small"
        // The name under the plant says "this is yours, tap it" (UX review).
        caption={plantCallName(plantView.plant)}
        label={plantView.label}
        onPress={() => router.push('/plant')}
        look={todayLook}
        mood={plantView.look?.mood}
        reaction={reaction}
        grows={grown && growFrom ? { from: growFrom, celebration: growthMoment } : null}
      />
    ) : null;
  // One quiet line for a learner with no plant yet, until they plant or dismiss it.
  const setPlantSettings = useProgress((s) => s.setPlantSettings);
  const plantPrompt = plantView.shown && !plantView.plant && !plantView.settings.promptHidden;

  // Any touch on Today ends a moment at once (it never blocks the next tap).
  const live = !clearing.settled || !ready.settled || !growthMoment.settled;
  const skipAll = () => {
    clearing.skip();
    ready.skip();
    growthMoment.skip();
  };

  // "Also today": an unfinished session first, then the plan items still to do.
  const resume = active && !active.finishedAt ? active : null;
  // While the ready panel shows, the current item is listed here too.
  const rest = plan.items.map((item, i) => ({ item, i })).filter(({ i }) => !plan.done[i] && (showReady || i !== cur));
  const alsoCount = rest.length + (resume ? 1 : 0);
  // The list always shows every item, so a count adds nothing: say the time
  // instead, which is what a busy learner budgets (ui.md T4).
  // A mock is left out: its row says how long it is ("Mock · about 80 min").
  const alsoMinutes = rest.reduce((n, { item }) => n + (item.kind === 'mock' ? 0 : itemMinutes(item)), 0) + (resume ? resumeMinutes(resume, now, j.cert.exam) : 0);
  // Tomorrow = a preview of the live plan (the next two items). The live plan
  // is sized to the minutes, so this never previews more than the day has.
  const tomorrow = j.plan.slice(0, 2);
  const tomorrowMinutes = sectionMinutes(tomorrow.reduce((n, t) => n + (t.kind === 'mock' ? 0 : itemMinutes(t)), 0));
  // "About 20 min today" under the leaf marks: only for plans sized in minutes (1.15+).
  const todayLine = plan.budget ? todayMinutesLine(plan.items, plan.done) : null;

  // Mobile 1.15: the one "Fit your plan" card for learners from before 1.15.
  // One setup line on Today at a time, and the plant's goes first: on a visit
  // that showed the plant's line, the card waits (even after "No thanks"),
  // so one setup line is never swapped for another mid-visit.
  const plantLineNow = Boolean(!grown && plantPrompt);
  const [plantVisit, setPlantVisit] = useState(plantLineNow);
  if (plantLineNow && !plantVisit) setPlantVisit(true);
  useFocusEffect(useCallback(() => () => setPlantVisit(false), []));
  const onboarded = useSettings((x) => x.onboarded);
  const fitPrompt = useSettings((x) => x.fitPrompt);
  const familiarity = useSettings((x) => x.familiarity);
  const fitAskDays = useSettings((x) => x.fitAskDays);
  const askFit = shouldAskFit({
    onboarded,
    fitPrompt,
    familiarity,
    daysLeft: j.daysLeft,
    examMoment: Boolean(moments.moment),
    readyPanel: showReady,
    plantLine: plantLineNow || plantVisit,
    askedDays: fitAskDays,
    today: plan.day,
  });
  // Mobile 1.16: the exam-week card, 7 to 2 days out, until hidden for this exam date.
  const examWeekDue = examWeekCardDue(j.daysLeft, j.progress.moments?.examWeek, j.examDate);
  // Count the day the card showed: after 3 separate days it stays away (code review M4).
  useEffect(() => {
    if (askFit) useSettings.getState().noteFitAsked(plan.day);
  }, [askFit, plan.day]);

  return (
    <Screen>
      <View onTouchStart={live ? skipAll : undefined}>
      <Enter i={0}>
        <Row style={{ justifyContent: 'space-between', minHeight: 24 }}>
          <T v="meta" num>{`${WEEKDAYS[new Date().getDay()]} · ${countdown(j.daysLeft)}`}</T>
          {j.streak > 0 && (
            <Row gap={space.xs} style={{ minHeight: 24 }}>
              <Pop trigger={streakGrowth.play ? streakGrowth.run : undefined} spring="leaf">
                <Sprig size={ICON_SIZE.row} color={c.clay} strokeWidth={ICON_STROKE} />
              </Pop>
              <BigNum
                value={String(j.streak)}
                size={20}
                color={c.clay}
                accessibilityLabel={`${j.streak}-day streak`}
                roll={{ play: streakGrowth.play, from: String(streakGrowth.from[0] ?? ''), run: streakGrowth.run }}
              />
            </Row>
          )}
        </Row>
        <ScreenTitle title="Today" settings={() => router.push('/settings')} />
      </Enter>

      {moments.moment && (
        <Enter i={1} style={{ marginTop: space.lg }}>
          <ExamEveCard moment={moments.moment} reminders={moments.reminders} pace={moments.pace} />
        </Enter>
      )}

      <Enter i={1} style={{ marginTop: space.lg }}>
        {showReady ? (
          <ExamReadyPanel cert={j.cert} readiness={j.readiness} onDismiss={moments.dismissReady} celebration={ready} />
        ) : plan.items.length === 0 ? (
          <HeroPanel
            caption={j.daysLeft !== null && j.daysLeft < 0 ? 'Exam done' : 'Plan'}
            title="How did it go?"
            meta="Set a new date to plan what’s next."
            // Settings opens with "Exam date" near the top, right under Certification.
            action={{ label: 'Set exam date', onPress: () => router.push('/settings'), icon: (col) => <Settings size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} /> }}
          />
        ) : allDone ? (
          <Celebrate celebration={clearing}>
            <HeroPanel
              caption="Today’s clearing"
              // An optional mock left for another day is not a leaf of the clearing.
              captionExtra={<PlanLeaves done={countedDone(plan)} focused={focused} seenKey={`${cert}:${plan.day}:cleared`} />}
              title={clearingTitle(plan)}
              art="clearing"
              wideTitle
            >
              <ClearingBody plan={plan} readiness={j.readiness} range={j.range} cert={j.cert} celebration={clearing} />
            </HeroPanel>
          </Celebrate>
        ) : (
          <HeroPanel
            caption="Start here"
            captionExtra={<PlanLeaves done={plan.done} focused={focused} seenKey={`${cert}:${plan.day}`} />}
            captionMeta={todayLine ?? undefined}
            captionMetaLabel={todayLine ? spokenMin(todayLine) : undefined}
            title={planText(plan.items[cur], j.dueCount).title}
            meta={planText(plan.items[cur], j.dueCount).meta}
            metaLabel={spokenMin(planText(plan.items[cur], j.dueCount).meta)}
            action={{ label: 'Start', onPress: () => runPlanItem(plan.items[cur], j.cert.id), icon: playIcon, hint: planText(plan.items[cur], j.dueCount).title }}
          />
        )}
      </Enter>

      {!allDone && (
        <Enter i={2}>
          {/* The Exam-ready panel draws the rings itself: once per screen (spec §10). */}
          <ReadinessRow
            cert={j.cert}
            readiness={j.readiness}
            range={j.range}
            stage={j.stageLine}
            rings={!showReady}
            ringsGrowth={ringsGrowth}
            rangeGrowth={rangeGrowth}
            lead={plantView.plant && !showReady ? todayPlant(104, 'today-plant') : undefined}
            onPress={() => router.push('/readiness')}
          />
        </Enter>
      )}

      {allDone && plantView.plant && (
        // A cleared day (QA O-1): the plant, happy, with its visitor if one came,
        // at a modest size under the clearing. The clearing stays the day's moment.
        <Enter i={2} style={{ marginTop: space.lg }}>
          <Row gap={space.md} style={{ alignItems: 'center' }}>
            {todayPlant(88, 'today-plant-cleared')}
            {plantView.look?.visiting ? (
              <T v="meta" style={{ flex: 1 }}>{`A ${plantView.look.resolved.visitor} came by: you cleared today’s plan.`}</T>
            ) : null}
          </Row>
        </Enter>
      )}

      {grown && (
        <Enter i={2} style={{ marginTop: space.xl }}>
          <Celebrate celebration={growthMoment}>
            <PlantNote caption="Your plant grew" line={grown.line} testID="plant-grew">
              <Button kind="ghost" label="What grows it next" onPress={() => router.push('/plant')} />
            </PlantNote>
          </Celebrate>
        </Enter>
      )}

      <Enter i={3}>
        {/* Mobile 1.16: exam week (7 to 2 days out): one calm card, under the readiness row. */}
        {examWeekDue && j.examDate && (
          <View style={{ marginTop: space.xl }}>
            <ExamWeekCard
              count={examWeekCount(examWeekOf(j.progress.moments?.examWeek, j.examDate).done)}
              onOpen={() => router.push('/exam-week')}
              onHide={() => {
                useProgress.getState().hideExamWeek(j.cert.id, j.examDate!);
                sayLater('Hidden. The checklist stays in your readiness report.');
                // The card unmounts under the focused button: move focus to the next heading, after the announcement.
                moveFocus(nextHeadRef, ANNOUNCE_DELAY + 50);
              }}
            />
          </View>
        )}
        {allDone ? (
          <>
            {tomorrow.length > 0 && (
              <>
                <Section title="Tomorrow" meta={tomorrowMinutes} metaLabel={tomorrowMinutes && spokenMin(tomorrowMinutes)} headRef={nextHeadRef} />
                {tomorrow.map((item, k) => (
                  <ListRow
                    key={k}
                    icon={planIcon(item, c.accentText)}
                    title={planText(item, undefined, 'tomorrow').title}
                    subtitle={rowShort(item, tomorrow, k, undefined, 'tomorrow')}
                    accessibilityLabel={`${planText(item, undefined, 'tomorrow').title}, ${spokenMin(rowShort(item, tomorrow, k, undefined, 'tomorrow'))}`}
                    last={k === tomorrow.length - 1}
                  />
                ))}
              </>
            )}
            <View style={{ alignSelf: 'flex-start', marginTop: space.sm, marginLeft: -space.sm }}>
              <Button
                kind="ghost"
                label="Keep going anyway"
                onPress={() => (j.plan[0] ? runPlanItem(j.plan[0], j.cert.id) : router.push('/practice'))}
              />
            </View>
          </>
        ) : (
          alsoCount > 0 && (
            <>
              <Section title="Also today" meta={sectionMinutes(alsoMinutes)} metaLabel={alsoMinutes > 0 ? spokenMin(aboutMin(alsoMinutes)) : undefined} headRef={nextHeadRef} />
              {resume && (
                <ListRow
                  icon={<Play size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                  title={`Resume: ${resume.title}`}
                  subtitle={`Question ${resume.index + 1} of ${resume.questionIds.length}`}
                  onPress={() => router.push('/session')}
                  last={rest.length === 0}
                />
              )}
              {rest.map(({ item, i }, k) => (
                <ListRow
                  key={i}
                  icon={planIcon(item, c.accentText)}
                  title={planText(item, j.dueCount).title}
                  subtitle={rowShort(item, plan.items, i, j.dueCount)}
                  accessibilityLabel={`${planText(item, j.dueCount).title}, ${spokenMin(rowShort(item, plan.items, i, j.dueCount))}`}
                  onPress={() => runPlanItem(item, j.cert.id)}
                  last={k === rest.length - 1}
                />
              ))}
            </>
          )
        )}
        {/* Mobile 1.15: one quiet "Fit your plan" card, below the day's study (never above the hero). */}
        {askFit && (
          <View style={{ marginTop: space.xl }}>
            <FitCard
              onSetUp={() => router.push('/fit')}
              onNotNow={() => {
                useSettings.getState().dismissFitPrompt();
                sayLater('Hidden. Settings, Your study, keeps these choices.');
              }}
            />
          </View>
        )}
        {/* One quiet offer for a learner with no plant, below the day's study (UX review P6): never ahead of it. */}
        {!grown && plantPrompt && (
          <View style={{ marginTop: space.xl }}>
            <PlantNote caption="Your plant" line="Plant a companion that grows with your study." testID="plant-prompt">
              <Button kind="ghost" label="Plant yours" onPress={() => router.push('/plant-pick')} />
              <Button
                kind="ghost"
                label="No thanks"
                accessibilityLabel="No thanks, hide this note. You can plant one from You."
                onPress={() => setPlantSettings({ promptHidden: true })}
              />
            </PlantNote>
          </View>
        )}
        {credit.items > 0 && !credit.hidden && (
          // The key-idea recipe (a green rule, not a card), like You's back-fill line.
          // "Updated after your report", not "Your report helped": another
          // learner's report may have led to the same fix (compliance W2).
          <View style={{ marginTop: space.xl, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
            <View accessible accessibilityLabel={`Updated after your report. ${creditLine(credit.items)}`}>
              <T v="caption" color={c.accentText}>Updated after your report</T>
              <T v="small" style={{ marginTop: space.xs }}>{creditLine(credit.items)}</T>
            </View>
            <Row gap={space.xs} style={{ flexWrap: 'wrap', marginLeft: -space.sm }}>
              <Button kind="ghost" label="See your reports" onPress={() => router.push('/reports')} />
              <Button
                kind="ghost"
                label="Dismiss"
                accessibilityLabel="Dismiss this note"
                onPress={() => setCredit((x) => ({ ...x, hidden: true }))}
              />
            </Row>
          </View>
        )}
      </Enter>
      </View>
    </Screen>
  );
}
