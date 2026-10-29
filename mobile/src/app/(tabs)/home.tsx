/**
 * Today — "what is my one next step, and how am I growing?"
 * Spec: docs/mobile/DESIGN_SYSTEM.md §11 "Today" and "Daily clearing card".
 *
 * Mobile 1.23 (the owner's mockup A). Top to bottom, in screen-reader order:
 *   header     KaiSip lockup | streak pill + Settings gear
 *   meta line  "Thursday · 38 days to CISA", then the greeting by the hour ("Good morning, Maya" when the learner gave a name; Settings → Your name)
 *   forest     "Today’s plan · about N min", the current item's title, the rest of the plan as a
 *              checklist (done struck through, later quiet; nothing when the plan is one item),
 *              ONE hugging pill ("Start", or "Continue" once something is done or the first set is
 *              begun; Play only for a lesson)
 *   readiness  rings + the honest range + "Estimated readiness" (Day 0: nothing; before the range:
 *              "5 of 40 for your first range"); the stage line only for a few days after it changes
 *   below      your plant, "Also today" (ONLY the optional mock and anything paused: every other open item
 *              is already a checklist row), quiet cards
 *
 * Mobile 1.24 (first five minutes): the three stat tiles are gone (they said "Not yet" on Day 0 and put
 * a second percentage beside the range); the optional mock is an "Also today" row, not a checklist row;
 * the hero title is never repeated as the first checklist row; the readiness disclaimer is on the
 * report and on one calm card, "Your first readiness range", the first time the range appears; and the
 * reminder ask gets one second chance here, the day the 3rd study day is done.
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
 * Final review week (Oct 2026): when the exam has a final-week plan, that
 * same card (same place, same Hide, same saved record) shows from 8 days
 * out to the eve, names today's day ("Today: Pace check"), counts the days
 * marked done, and opens the plan (app/exam-week.tsx).
 *
 * Mobile 1.21 (one focal element): the forest panel's title names the
 * activity and never holds a count ("Spaced review"; the counts go to its
 * meta line), and the day's minutes are said once, in the caption ("Start
 * here · about 19 min"; the meta leaves them out when they are this item's).
 * The readiness row under it is one condensed row (small rings or the plant,
 * the range, the short estimate line, the labelled stage). The plant's
 * invitation is one plain row (no ghost pair beside Start; it hides on a long
 * press); "Updated after your report" is an InviteRow, not the coach's rule.
 *
 * Mobile 1.41 (pre-beta review):
 *   - "Short on time? 5 questions": one ghost button under the hero, only before the day's plan has
 *     started (engine/dayPlan.ts shortSetItem). It starts the plan's first review or practice item at
 *     five questions, so those answers count toward it. Never in exam week, never on the first-set day.
 *   - Two more quiet cards in the setup slot below the day's study, still one setup line per visit:
 *     the name ask (onboarding no longer asks; engine/firstRun.ts nameAskDue) and, only for learners
 *     who turned on "I'm a beta tester" in Help, the Tester question (engine/betaTester.ts). The
 *     reminder's second chance, Fit and the plant line go first; the name ask goes before the tester card.
 *
 * Mobile 1.44 (the owner's "Version 3"): the name card has its field inside ("Name or nickname", Save, Not
 * now); after Save the greeting says the name and "Saved on this device" stays for the visit. It never
 * shows beside another Today invitation, on a welcome-back day (3+ days away) or in exam week. Learners
 * from before 1.41 (onboarded, no name, never asked) get the one ask set up once (engine/firstRun.ts).
 *
 * Mobile 1.47: on Android, ONE suggestion to add the Today's plan widget, once ever (a cleared day from the
 * 3rd study day, never in exam week, never beside another invitation; components/widgetSettings.tsx).
 * In the same slot, one per visit: the readiness widget's one re-ask (30 days after choosing to show the
 * range) and, for beta testers only, the widget check-in cards (engine/widgetTester.ts).
 *
 * Mobile 1.51 (Field Guide, the owner's signature pick; DESIGN_SYSTEM.md §21): Today is a plate.
 *   head       the running head "Field guide · Today" with the date (said in full) and the Settings gear
 *   title      the countdown is the news: "Maya, 38 days to go" (engine/fieldGuide.ts todayTitle; with
 *              no date, the greeting), then "Exam 6 Dec" and the streak on one quiet line
 *   plate      Fig. n · <growth>: your plant beside the plan's specimen label (caption with the day's
 *              minutes, the current item, its meta, the checklist in paper inks), captioned PLATE
 *   button     the ONE forest fill on the screen: Start / Continue, 52pt with 12pt corners
 *   readiness  "Measured · readiness" over the scale bar ("a study estimate, not a prediction"), still
 *              the report's button. The clearing and "Your readiness is holding" stay forest moments.
 *
 * Signature moments (Phase 5b, components/moments.tsx):
 *   - the day before the exam / exam day: a calm card above the panel;
 *   - "Your readiness is holding" (lower bound ≥ 80% for 7 days): the forest
 *     panel, once per cert, until dismissed. Its plan item moves to "Also today".
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { ExamEveCard, ExamReadyPanel } from '../../components/moments';
import { ClearingBody, clearingLine, clearingTitle, PlanChecklist, PlanLeaves, planHero, planIcon, planText, ReadinessRow, todayMinutes } from '../../components/journey';
import { StreakPill } from '../../components/today';
import { FieldText, headDate, KeyCaption, Plate, RunningHead } from '../../components/fieldguide';
import { todayTitle } from '../../engine/fieldGuide';
import { GROWTH_NAMES } from '../../engine/plant';
import { shortDate } from '../../lib/format';
import { FirstRangePanel, SecondAskCard } from '../../components/firstSet';
import { FitCard } from '../../components/fit';
import { NameAskCard, TesterQuestionCard } from '../../components/beta';
import { ReadinessAskCard, WidgetOfferCard, WidgetTesterCard } from '../../components/widgetSettings';
import { readinessReaskDue, widgetOfferDue } from '../../engine/widgets';
import { widgetTesterCard, type WidgetTesterCard as WidgetTesterCardData } from '../../engine/widgetTester';
import { widgetsSupported } from '../../lib/widgets';
import { useWidgetStore } from '../../store/widgets';
import { testerCard, type TesterCard } from '../../engine/betaTester';
import { ExamWeekCard, type ExamWeekCardCopy } from '../../components/readinessReport';
import { getFinalWeek } from '../../content/exam';
import type { FinalWeek } from '../../content/exam/types';
import { examWeekCardDue, examWeekCount, examWeekOf, FINAL_WEEK_WINDOW, weekDaysCount, weekDaysOf } from '../../engine/examWeek';
import { dayForToday } from '../../engine/finalWeek';
import { Celebrate, useCelebration, useGrowth, useScreenFocus } from '../../components/motion';
import { ArrowRight, ICON_STROKE, Inbox, Play, Settings, Sprout, Target, Timer } from '../../components/icons';
import { PlantButton, PlantNote } from '../../components/plant/PlantUI';
import { Button, Enter, HeroPanel, ICON_SIZE, InviteRow, ListRow, Row, Screen, Section, T, useFontScale } from '../../components/ui';
import { countedDone, currentIndex, isOptional, itemMinutes, MINUTES_PER_QUESTION, planComplete, SHORT_SET_SIZE, shortSetItem } from '../../engine/dayPlan';
import { shouldAskFit } from '../../engine/fit';
import { firstRangePanelDue, nameAskDue, nameNudgeDue, secondAskDue, studyDaysAway } from '../../engine/firstRun';
import { STAGE_ORDER } from '../../engine/journey';
import { aboutMin, spokenMin } from '../../engine/pace';
import { DAY_MS } from '../../engine/srs';
import { ANNOUNCE_DELAY, moveFocus, sayLater } from '../../lib/a11y';
import { greetingWithName } from '../../engine/displayName';
import { useSettings } from '../../store/settings';
import { runPlanItem, runShortSet } from '../../lib/actions';
import { firstSetLeftOf } from '../../lib/firstSet';
import { firstSetIds, firstSetNextLine } from '../../content/firstSet';
import { refreshReminders } from '../../lib/reminderSync';
import { remindersSupported } from '../../lib/reminders';
import { haptic } from '../../lib/haptics';
import { useTodayMoments } from '../../lib/moments';
import { useJourney } from '../../lib/useJourney';
import { checkPlant, growQuietly, seeGrowth, usePlantView } from '../../lib/plant';
import { markReacted } from '../../components/plant/LivePlant';
import { grewLabel, growthBefore, plantCallName, type GrowthLevel } from '../../engine/plant';
import { baselineForms, formMoment, SEE_NEW_FORM } from '../../engine/plantForms';
import { dayKey } from '../../engine/streak';
import { useReports } from '../../lib/useReports';
import { useProgress } from '../../store/progress';
import { useSeen } from '../../store/seen';
import { useSession, type ActiveSession } from '../../store/session';
import { legacyTitle, type PlanItem } from '../../engine/planner';
import { LARGE_TEXT, plate, space } from '../../theme/tokens';
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

/** The stage line ("Stage 4 · Rehearse the exam") shows for this many days after the stage changes, then rests. */
const STAGE_NOTE_DAYS = 3;
/** A local day key ("2026-10-15") as a whole day number, for counting days between two views. */
const dayNumber = (key: string) => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);

/** The growth's haptic stays silent this soon after the clearing's (one haptic for one return to Today). */
const CLEARING_TAP_MS = 5000;

/**
 * Today's card words for the final review week: today's day by name, or
 * "Starts tomorrow" 8 days out. Exported for tests.
 */
export function finalWeekCard(week: FinalWeek, daysLeft: number | null): ExamWeekCardCopy {
  const day = dayForToday(week.days, daysLeft);
  const first = week.days[0];
  return {
    caption: week.title,
    line: day ? `Today: ${day.title}.` : `Starts tomorrow: ${first?.title ?? 'day one'}.`,
    open: 'Open the plan',
    openHint: 'Seven short days of review before your exam',
    hide: 'Hide this card. The plan stays in Learn and your readiness report.',
  };
}

/**
 * The greeting, by the phone's local time, with the learner's own name when
 * they gave one (mobile 1.23; the rule for the name is engine/displayName.ts).
 */
export function greeting(hour: number, name?: string | null): string {
  return greetingWithName(hour, name);
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
      // Read outside the updater, so the updater stays pure.
      const at = Date.now();
      const keep = !useSession.getState().active?.deadline;
      setNow((was) => (keep && dayKey(was) === dayKey(at) ? was : at));
      // The plant's exam-ready gate changes with the date: check it whenever Today comes into view.
      checkPlant(certId);
    }, [certId]),
  );
  // The Start pill's glyph says what starts (mobile 1.22, the 1.20 icon rule): Play only for a
  // lesson (leading, as on Learn); reviews, practice, mocks and games go forward with a TRAILING
  // arrow, like "Next question →".
  const startIcon = (kind: string | undefined) =>
    function StartIcon(color: string) {
      const Glyph = kind === 'lesson' ? Play : ArrowRight;
      return <Glyph size={ICON_SIZE.inline} color={color} strokeWidth={ICON_STROKE} />;
    };

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
  // QA-TURN-2: what this phone has already shown of the forms. The pointer to Your plant is said only when
  // Your plant will really play a reveal (formMoment), never from the growth alone: after Reset progress a
  // re-earned form was already revealed here, so Today must not promise one.
  const formsSeen = useSeen((x) => x.plantForms?.[cert]);
  // Set during render (React's pattern for state that follows the store).
  // Mobile 1.50: when it grew into a new form, the line says where to see it (the reveal plays on Your plant, never here).
  if (pending && plantView.plant && !quietly && grown?.growth !== pending)
    setGrown({ growth: pending, line: `${grewLabel(plantView.plant, pending)}${plantView.forms && formMoment(pending, formsSeen ?? baselineForms(growthBefore(plantView.plant, pending)))?.kind === 'reveal' ? ` ${SEE_NEW_FORM}` : ''}` });
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
  // Mobile 1.18: the id comes from usePlantView (proud: its earned occasions, saved once played).
  const reactionId = plantView.reactionId;
  useEffect(() => {
    if (grown && reactionId) markReacted(reactionId);
  }, [grown, reactionId]);
  // The same objects while nothing changes (performance, 1.15.x): the plant is
  // memoised and skips a re-render of its ~200-shape drawing and its motion hooks.
  const reactionMood = plantView.look && reactionId && focused && !grown && clearing.settled ? plantView.look.mood : null;
  const reaction = useMemo(() => (reactionMood && reactionId ? { id: reactionId, mood: reactionMood } : null), [reactionMood, reactionId]);
  // Today is study-first: the plant and its visitor, never the keepsakes (UX review, decided).
  const lookArt = plantView.look?.art;
  const todayLook = useMemo(() => (lookArt ? { ...lookArt, keepsakes: [] } : undefined), [lookArt]);
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

  // "Also today": an unfinished session first, then the optional mock (mobile 1.24: only those).
  // A paused first set is not listed here: the panel's Start already picks it up where it stopped (mobile 1.24).
  const firstNow = plan.items[cur]?.kind === 'practice' && plan.items[cur].why === 'first';
  const resume = active && !active.finishedAt && !(active.firstSet && firstNow) ? active : null;
  // Every other open item is already a checklist row on the forest panel, so it is never said twice here.
  // While the ready panel shows there is no checklist, so the open items (the current one too) are listed here.
  const rest = plan.items.map((item, i) => ({ item, i })).filter(({ i }) => !plan.done[i] && (showReady || isOptional(plan.items, i)));
  // A first set already begun (paused, or ended early with some still unanswered) says "Continue", not "Start".
  const firstBegun =
    firstNow &&
    ((active?.firstSet && !active.finishedAt && active.certId === j.cert.id) ||
      (() => {
        const left = firstSetLeftOf(j.cert.id, j.progress.answers).length;
        return left > 0 && left < firstSetIds(j.cert.id).length;
      })());
  const alsoCount = rest.length + (resume ? 1 : 0);
  // The list always shows every item, so a count adds nothing: say the time
  // instead, which is what a busy learner budgets (ui.md T4).
  // A mock is left out: its row says how long it is ("Mock · about 80 min").
  const alsoMinutes = rest.reduce((n, { item }) => n + (item.kind === 'mock' ? 0 : itemMinutes(item)), 0) + (resume ? resumeMinutes(resume, now, j.cert.exam) : 0);
  // Tomorrow = a preview of the live plan (the next two items). The live plan
  // is sized to the minutes, so this never previews more than the day has.
  const tomorrow = j.plan.slice(0, 2);
  const tomorrowMinutes = sectionMinutes(tomorrow.reduce((n, t) => n + (t.kind === 'mock' ? 0 : itemMinutes(t)), 0));
  // The day's minutes, in the caption: "Today’s plan · about 19 min" (mobile 1.23, mockup A; was "Start here ·").
  // The open items only, so it shrinks as the day goes. Only for plans sized in minutes (1.15+). A mock is left
  // out: its own line says it is optional and how long it is.
  const dayMinutes = plan.budget ? todayMinutes(plan.items, plan.done) : 0;
  const todayCaption = dayMinutes > 0 ? `Today’s plan · ${aboutMin(dayMinutes, true)}` : 'Today’s plan';
  const curItem = plan.items[cur];
  // The hero's words: the title names the activity (no count) and the meta line under it carries the detail
  // ("16 ready to revisit · oldest first", "8 questions", a mock's length). Mobile 1.24: the meta always shows,
  // because the item you are on is no longer ALSO the first checklist row (it was said twice). Its minutes are
  // said once: when this item is the day's only timed one, the caption's total is its own, so the meta leaves them out.
  const openTimed = plan.items.filter((it, i) => !plan.done[i] && it.kind !== 'mock');
  const minutesSaid = dayMinutes > 0 && openTimed.length === 1 && openTimed[0] === curItem;
  const hero = curItem ? planHero(curItem, j.dueCount, { minutesSaid }) : null;
  const heroNote = curItem && hero ? hero.meta : undefined;
  // Mobile 1.24: no stat tiles. After the range exists, one quiet line names the weakest area.
  const answeredTotal = j.readiness.domains.reduce((n, d) => n + d.answered, 0);
  const weakest = j.range.enough && j.focus ? j.focus : null;

  // The stage line rests unless it is useful: only for STAGE_NOTE_DAYS after the stage changes, and never
  // for the first stage (its words are the first set's, and the plan already says what to do).
  const stageIdx = STAGE_ORDER.indexOf(j.stage);
  const stageKey = `stage:${cert}`;
  const stageSeen = useSeen((x) => x.values?.[stageKey]);
  const stageToday = dayNumber(plan.day);
  useEffect(() => {
    // Remember when this stage was first seen (a changed stage restarts the count).
    if (!stageSeen || stageSeen[0] !== stageIdx) useSeen.getState().see(stageKey, [stageIdx, stageToday]);
  }, [stageSeen, stageIdx, stageKey, stageToday]);
  const showStage = stageIdx > 0 && (!stageSeen || stageSeen[0] !== stageIdx || stageToday - stageSeen[1] < STAGE_NOTE_DAYS);

  // "Your first readiness range": one calm card the first time the range appears (a learner who restores a
  // backup with many answers already has a settled range, so it is marked seen without showing).
  const firstRangeKey = `first-range:${cert}`;
  const firstRangeSeen = useSeen((x) => (x.moments?.[firstRangeKey] ?? 0) > 0);
  const firstRangeDue = firstRangePanelDue({ enough: j.range.enough, answered: answeredTotal, seen: firstRangeSeen });
  useEffect(() => {
    if (j.range.enough && !firstRangeSeen && !firstRangeDue) useSeen.getState().played(firstRangeKey);
  }, [j.range.enough, firstRangeSeen, firstRangeDue, firstRangeKey]);

  const firstRangeCard = (
    <FirstRangePanel cert={j.cert} readiness={j.readiness} onOpen={() => router.push('/readiness')} onDismiss={() => {
      useSeen.getState().played(firstRangeKey);
      // The panel unmounts under the focused button: say so, then move focus on (as the second ask does).
      sayLater('Note hidden.');
      moveFocus(nextHeadRef, ANNOUNCE_DELAY + 50);
    }} />
  );

  // The reminder's one second chance: the day the 3rd study day is done, if reminders are still off.
  const reminderEnabled = useSettings((x) => x.reminder.enabled);
  const askedFirst = useSeen((x) => x.reminderAsk?.first);
  const askedSecond = useSeen((x) => Boolean(x.reminderAsk?.second));
  const newLearner = useSeen((x) => Boolean(x.reminderAsk?.newLearner));
  const turnedOff = useSeen((x) => Boolean(x.reminderAsk?.turnedOff));
  const secondDue = secondAskDue({
    supported: remindersSupported,
    enabled: reminderEnabled,
    studyDays: j.progress.milestones?.days ?? 0,
    studiedToday: j.progress.milestones?.lastDay === plan.day,
    first: askedFirst,
    secondShown: askedSecond,
    newLearner,
    turnedOff,
  });
  // Latched for this visit (showing it counts it as shown, which would otherwise take it away at once).
  const [secondVisit, setSecondVisit] = useState(false);
  if (secondDue && !secondVisit) setSecondVisit(true);
  useFocusEffect(useCallback(() => () => setSecondVisit(false), []));

  // Keep the next week of reminders fresh: on every visit to Today, and when the plan is cleared (today's is skipped).
  useEffect(() => {
    if (focused) refreshReminders().catch(() => {});
  }, [focused, allDone, plan.day, reminderEnabled]);

  // Mobile 1.15: the one "Fit your plan" card for learners from before 1.15.
  // One setup line on Today at a time, and the plant's goes first: on a visit
  // that showed the plant's line, the card waits (even after "No thanks"),
  // so one setup line is never swapped for another mid-visit.
  const plantLineNow = Boolean(!grown && plantPrompt);
  const [plantVisit, setPlantVisit] = useState(plantLineNow);
  if (plantLineNow && !plantVisit) setPlantVisit(true);
  useFocusEffect(useCallback(() => () => setPlantVisit(false), []));
  const onboarded = useSettings((x) => x.onboarded);
  const displayName = useSettings((x) => x.displayName);
  const fitPrompt = useSettings((x) => x.fitPrompt);
  const familiarity = useSettings((x) => x.familiarity);
  const fitAskDays = useSettings((x) => x.fitAskDays);
  // The final review week (content/exam), when this exam has one: Today's card and the Fit card follow it.
  const finalWeek = getFinalWeek(j.cert.id);
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
    finalWeek: Boolean(finalWeek),
  });
  // Mobile 1.16: the exam-week card, 7 to 2 days out, until hidden for this exam date.
  // With a final review week: 8 days out to the eve, and it opens the plan.
  // Never beside the eve / exam-day card (UX review H1): that card links to tonight's list itself.
  const examWeekDue = !moments.moment && examWeekCardDue(j.daysLeft, j.progress.moments?.examWeek, j.examDate, finalWeek ? FINAL_WEEK_WINDOW : undefined);
  // Count the day the card showed: after 3 separate days it stays away (code review M4).
  useEffect(() => {
    if (askFit) useSettings.getState().noteFitAsked(plan.day);
  }, [askFit, plan.day]);

  // Mobile 1.41: the name ask and the Tester question share the setup slot, one line per visit.
  // Both wait for the second ask, Fit and the plant line; each is latched for the visit it first shows on.
  const otherSetup = secondVisit || askFit || plantLineNow || plantVisit;
  const nameAsk = useSeen((x) => x.nameAsk);
  // Mobile 1.44 (pm.md S3, behavior.md §7.4): a learner who onboarded before 1.24 (no name step, so never
  // asked; no `newLearner` flag) gets the one ask set up once, so it shows on a later study day under the
  // rules below. 1.24–1.40 learners skipped the name step and are not asked again. Nobody re-onboards.
  // It counts on this very render too, so another card never shows for a moment before the name card.
  const nudge = nameNudgeDue({ onboarded, hasName: Boolean(displayName), nameAsk, newLearner });
  useEffect(() => {
    if (nudge) useSeen.getState().setNameAsk('due');
  }, [nudge]);
  // Mobile 1.44: the name card never sits beside another Today invitation (a moment, the exam-ready panel,
  // the first range card, the exam-week card, the plant's growth, the report note), on top of the setup lines.
  const nameOther =
    otherSetup || Boolean(moments.moment) || showReady || firstRangeDue || examWeekDue || Boolean(grown) || (credit.items > 0 && !credit.hidden);
  const studyStreak = useProgress((x) => x.streak);
  const nameDue = nameAskDue({
    offered: nameAsk === 'due' || nudge,
    hasName: Boolean(displayName),
    studyDays: j.progress.milestones?.days ?? 0,
    lastStudyDay: j.progress.milestones?.lastDay,
    today: plan.day,
    otherSetup: nameOther,
    // Never on a welcome-back day (3+ days away) or in exam week.
    awayDays: studyDaysAway([...(studyStreak.recentDays ?? []), studyStreak.lastDay], plan.day),
    daysLeft: j.daysLeft,
  });
  const [nameVisit, setNameVisit] = useState(false);
  if (nameDue && !nameVisit) setNameVisit(true);
  useFocusEffect(useCallback(() => () => setNameVisit(false), []));
  // Asked once: showing it counts (as the reminder's second chance does).
  useEffect(() => {
    if (nameVisit) useSeen.getState().setNameAsk('shown');
  }, [nameVisit]);
  const tester = useSeen((x) => x.tester);
  const rawStreak = useProgress((x) => x.streak);
  const testerNow = tester?.since && !moments.moment ? testerCard(tester, rawStreak, now, plan.day) : null;
  const [testerVisit, setTesterVisit] = useState<TesterCard | null>(null);
  if (testerNow && !testerVisit && !otherSetup && !nameVisit) setTesterVisit(testerNow);
  useFocusEffect(useCallback(() => () => setTesterVisit(null), []));
  // The switch turned off (Help, or the card's own action) takes the card away.
  const testerShown = testerVisit && tester?.since ? testerVisit : null;

  // Mobile 1.47: the one "add a widget" suggestion (Android), on a cleared day from the 3rd study day, never in
  // exam week, never beside another invitation, once EVER (engine/widgets.ts widgetOfferDue). Latched for the visit.
  const offerShown = useWidgetStore((x) => Boolean(x.offer));
  const offerAnswered = useWidgetStore((x) => Boolean(x.offer?.answer));
  const widgetPlaced = useWidgetStore((x) => Object.values(x.stats.seen).some((k) => k && !k.gone));
  const offerDue = widgetOfferDue({
    supported: widgetsSupported,
    shown: offerShown,
    studyDays: j.progress.milestones?.days ?? 0,
    cleared: allDone,
    daysLeft: j.daysLeft,
    placed: widgetPlaced,
    otherSetup: otherSetup || nameVisit || Boolean(testerShown) || Boolean(moments.moment) || Boolean(grown) || (credit.items > 0 && !credit.hidden),
  });
  const [offerVisit, setOfferVisit] = useState(false);
  if (offerDue && !offerVisit) setOfferVisit(true);
  useFocusEffect(useCallback(() => () => setOfferVisit(false), []));
  // Shown once counts (it never comes back, whatever the answer).
  useEffect(() => {
    if (offerVisit) useWidgetStore.getState().showOffer(plan.day);
  }, [offerVisit, plan.day]);
  // Mobile 1.47 (security/behavior reviews): the readiness widget's ONE re-ask, 30 days after choosing to show
  // the range, and a beta tester's widget card. Same slot, one card per visit, never beside another invitation.
  const widgetPrefs = useWidgetStore((x) => x.prefs);
  const readinessSince = useWidgetStore((x) => x.readinessShownSince);
  const readinessAsked = useWidgetStore((x) => Boolean(x.readinessAsked));
  const readinessPlaced = useWidgetStore((x) => Boolean(x.stats.seen.readiness && !x.stats.seen.readiness.gone));
  const widgetStats = useWidgetStore((x) => x.stats);
  const widgetTester = useWidgetStore((x) => x.tester);
  const slotBusy = otherSetup || nameVisit || Boolean(testerShown) || offerVisit || Boolean(moments.moment) || Boolean(grown) || (credit.items > 0 && !credit.hidden);
  const reaskDue =
    widgetsSupported && !slotBusy && readinessReaskDue({ pref: widgetPrefs.readiness, shownSince: readinessSince, asked: readinessAsked, today: plan.day, placed: readinessPlaced });
  const [reaskVisit, setReaskVisit] = useState(false);
  if (reaskDue && !reaskVisit) setReaskVisit(true);
  useFocusEffect(useCallback(() => () => setReaskVisit(false), []));
  const wTesterNow =
    widgetsSupported && !slotBusy && !reaskVisit
      ? widgetTesterCard({ testerOn: Boolean(tester?.since), counters: widgetStats, answered: widgetTester.answered, skipped: widgetTester.skipped, today: plan.day })
      : null;
  const [wTesterVisit, setWTesterVisit] = useState<WidgetTesterCardData | null>(null);
  if (wTesterNow && !wTesterVisit) setWTesterVisit(wTesterNow);
  useFocusEffect(useCallback(() => () => setWTesterVisit(null), []));
  const wTesterShown = wTesterVisit && tester?.since && !widgetTester.answered.includes(wTesterVisit.id) && widgetTester.skipped !== plan.day ? wTesterVisit : null;

  // "Short on time? 5 questions" (mobile 1.41): only before the plan has started, never in exam week,
  // never beside a paused session (Also today already offers to resume it).
  const examWeekNow = j.daysLeft !== null && j.daysLeft >= 0 && j.daysLeft <= 7;
  // Not beside a Tester question either (review 1.41): one extra ask on Today at a time.
  const shortIdx = !showReady && !allDone && !resume && !(testerShown && !nameVisit) ? shortSetItem(plan, { examWeek: examWeekNow }) : -1;
  // "About 6 min. Counts toward today’s plan." (the app's one minutes style; spoken as "minutes").
  const shortLine = `${aboutMin(SHORT_SET_SIZE * MINUTES_PER_QUESTION)}. Counts toward today’s plan.`;

  // Mobile 1.51: the countdown is the title, "Maya, 38 days to go" (with no date, "Good morning, Maya"). Read again
  // each render, so a name changed in Settings shows at once.
  const titleText = todayTitle(j.daysLeft, displayName, new Date().getHours());
  const headDay = headDate(now);
  // The quiet line under the title: "CISA exam 6 Dec" (the countdown is the title), "No exam date set", "CISA exam today";
  // nothing after the exam (the plate asks how it went).
  const examLine =
    j.daysLeft === null
      ? 'No exam date set'
      : j.daysLeft === 0
        ? `${j.cert.name} exam today`
        : j.daysLeft > 0 && j.examDate
          ? `${j.cert.name} exam ${shortDate(new Date(`${j.examDate}T12:00:00`).getTime())}`
          : null;
  const large = useFontScale() >= LARGE_TEXT;

  return (
    // Mobile 1.44 (UX review H1): the name card has a text field, so the keyboard never covers it or Save.
    <Screen keyboard={nameVisit}>
      <View onTouchStart={live ? skipAll : undefined}>
      <Enter i={0}>
        {/* Mobile 1.51 (Field Guide): the running head says where you are and the day (said in full); the gear is Settings. */}
        <RunningHead
          section="Field guide · Today"
          aside={headDay.shown}
          asideLabel={headDay.spoken}
          action={{
            label: 'Settings',
            hint: 'Exam date, reminders and more',
            compact: true,
            onPress: () => router.push('/settings'),
            icon: (col) => <Settings size={ICON_SIZE.bar} color={col} strokeWidth={ICON_STROKE} />,
          }}
        />
        {/* One header stop that reads the whole title. A long name wraps (24 characters at most) and, at the
            largest text sizes, stops at three lines with an ellipsis instead of pushing the plan off the screen. */}
        <T v="display" accessibilityRole="header" accessibilityLabel={titleText} numberOfLines={3} style={{ marginTop: space.lg }}>
          {titleText}
        </T>
        {/* The exam's day and the streak on one quiet line (the weekday and the countdown are in the head and the title). */}
        <Row gap={space.sm} style={{ flexWrap: 'wrap', rowGap: space.xs, marginTop: space.xs }}>
          {examLine ? <T v="meta" num>{examLine}</T> : null}
          {j.streak > 0 && <StreakPill flat streak={j.streak} growth={streakGrowth} />}
        </Row>
      </Enter>

      {moments.moment && (
        <Enter i={1} style={{ marginTop: space.lg }}>
          <ExamEveCard
            moment={moments.moment}
            reminders={moments.reminders}
            pace={moments.pace}
            // The eve with a final review week: one link to tonight's list (the plan's own card waits).
            onTonight={finalWeek ? () => router.push({ pathname: '/exam-week', params: { section: 'eve' } }) : undefined}
          />
        </Enter>
      )}

      <Enter i={1} style={{ marginTop: space.lg }}>
        {showReady ? (
          <ExamReadyPanel cert={j.cert} readiness={j.readiness} onDismiss={moments.dismissReady} celebration={ready} />
        ) : plan.items.length === 0 ? (
          // Mobile 1.51: a plate with its label, and the one forest button under it.
          <View>
            <Plate fig={{ title: j.daysLeft !== null && j.daysLeft < 0 ? 'Exam done' : 'Plan' }} testID="today-plate">
              <View style={{ backgroundColor: c.raised, borderWidth: 1, borderColor: c.line, borderRadius: plate.labelRadius, padding: space.md }}>
                <FieldText v="value" maxScale={2} accessibilityRole="header">How did it go?</FieldText>
                <T v="meta" style={{ marginTop: space.xs }}>Set a new date to plan what’s next.</T>
              </View>
            </Plate>
            <Button
              shape="plate"
              label="Set exam date"
              // Settings opens with "Exam date" near the top, right under Certification.
              onPress={() => router.push({ pathname: '/settings', params: { open: 'exam-date' } })}
              icon={(col) => <Settings size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
              iconLeading
              style={{ marginTop: space.md }}
            />
          </View>
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
          // Mobile 1.51 (Field Guide): the day as a plate. Your plant (when there is one) beside the plan's
          // specimen label; the caption under it; then the ONE forest fill on the screen, the Start button.
          <View>
            <Plate
              fig={plantView.plant ? { n: plantView.plant.growth, title: GROWTH_NAMES[plantView.plant.growth] } : { title: 'Today’s study' }}
              testID="today-plate"
            >
              <View style={{ flexDirection: large || !plantView.plant ? 'column' : 'row', alignItems: large ? 'flex-start' : 'flex-end', gap: space.md }}>
                {plantView.plant ? <View style={{ alignSelf: large ? 'center' : 'flex-end' }}>{todayPlant(large ? 120 : 112, 'today-plant')}</View> : null}
                <View
                  testID="today-plan-label"
                  style={{ flex: large || !plantView.plant ? undefined : 1, alignSelf: large || !plantView.plant ? 'stretch' : undefined, minWidth: 0, backgroundColor: c.raised, borderWidth: 1, borderColor: c.line, borderRadius: plate.labelRadius, padding: space.md }}
                >
                  {/* "Today's plan, about 17 minutes, 1 of 3 done": the checklist's progress, said once for a screen reader. */}
                  <View accessible accessibilityLabel={`${spokenMin(todayCaption)}, ${countedDone(plan).filter(Boolean).length} of ${countedDone(plan).length} done`}>
                    <FieldText v="head">{todayCaption}</FieldText>
                  </View>
                  <FieldText v="value" maxScale={2} accessibilityRole="header" style={{ marginTop: space.xs }}>{hero!.title}</FieldText>
                  {heroNote ? (
                    <T v="meta" accessibilityLabel={spokenMin(heroNote)} style={{ marginTop: 2 }}>{heroNote}</T>
                  ) : null}
                  <PlanChecklist paper items={plan.items} done={plan.done} current={cur} due={j.dueCount} focused={focused} seenKey={`${cert}:${plan.day}`} />
                </View>
              </View>
            </Plate>
            {plantView.plant && (
              <KeyCaption label="PLATE">
                {plantView.look?.visiting ? `A ${plantView.look.resolved.visitor} came by. Your plant grows with your study.` : 'Your plant grows with your study.'}
              </KeyCaption>
            )}
            <Button
              shape="plate"
              label={plan.done.some(Boolean) || firstBegun ? 'Continue' : 'Start'}
              onPress={() => runPlanItem(curItem, j.cert.id)}
              icon={startIcon(curItem?.kind)}
              // Play only for a lesson (leading); everything else goes forward with an arrow after the label.
              iconLeading={curItem?.kind === 'lesson'}
              accessibilityHint={hero!.title}
              style={{ marginTop: space.md }}
            />
          </View>
        )}
      </Enter>

      {shortIdx >= 0 && (
        // The short path (mobile 1.41): a quiet ghost button under the hero, never a second Start.
        <View testID="short-set" style={{ alignSelf: 'flex-start', marginTop: space.xs, marginLeft: -space.sm }}>
          <Button
            kind="ghost"
            label={`Short on time? ${SHORT_SET_SIZE} questions`}
            accessibilityHint={spokenMin(shortLine)}
            onPress={() => runShortSet(plan.items[shortIdx], j.cert.id)}
            // Hugs its label, so the words line up with the plain line under it.
            style={{ alignSelf: 'flex-start' }}
          />
          {/* Said by the button's hint already, so hidden from screen readers here. */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ paddingHorizontal: space.sm }}>
            <T v="meta">{shortLine}</T>
          </View>
        </View>
      )}

      {!allDone && (
        <Enter i={2}>
          {/* The Exam-ready panel draws the rings itself: once per screen (spec §10). Day 0 has nothing to show yet. */}
          {answeredTotal > 0 && (
            <ReadinessRow
              cert={j.cert}
              readiness={j.readiness}
              range={j.range}
              stage={showStage ? `Stage ${stageIdx + 1} · ${j.stageLine}` : undefined}
              rings={!showReady}
              ringsGrowth={ringsGrowth}
              rangeGrowth={rangeGrowth}
              onPress={() => router.push('/readiness')}
              // Mobile 1.51 (Field Guide): the range on the scale bar, its words built in.
              scale
            />
          )}
          {/* Day 0 (mobile 1.39): the first five are still to finish, so say what comes after them. */}
          {firstNow && !plan.done[cur] && (
            <View testID="today-day0-next" style={{ marginTop: answeredTotal > 0 ? space.md : space.lg }}>
              <T v="meta">{firstSetNextLine(j.daysLeft !== null)}</T>
            </View>
          )}
          {/* "Your first readiness range": one calm card, right under the range it explains (mobile 1.24). */}
          {firstRangeDue && <View style={{ marginTop: space.lg }}>{firstRangeCard}</View>}
          {weakest && answeredTotal > 0 && !firstRangeDue && (
            // The domain's short name ("IS Operations"), not the tile abbreviation ("IS Ops", spoken "I S ops"): UX review S6.
            <T v="meta" style={{ marginTop: space.md }}>{`${answeredTotal} answered · weakest area: ${weakest.short}`}</T>
          )}
          {plantView.plant && (showReady || plan.items.length === 0) && (
            // Mobile 1.51: on a plan day the plant is the plate's figure; with no plate it sits here, as before.
            <Row gap={space.lg} style={{ alignItems: 'center', marginTop: space.xl }}>
              {todayPlant(72, 'today-plant')}
              <T v="meta" style={{ flex: 1 }}>
                {plantView.look?.visiting ? `A ${plantView.look.resolved.visitor} came by.` : 'Your plant grows with your study.'}
              </T>
            </Row>
          )}
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

      {allDone && firstRangeDue && <View style={{ marginTop: space.xl }}>{firstRangeCard}</View>}

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
              count={
                finalWeek
                  ? weekDaysCount(weekDaysOf(j.progress.moments?.examWeek, j.examDate).length, finalWeek.days.length)
                  : examWeekCount(examWeekOf(j.progress.moments?.examWeek, j.examDate).done)
              }
              copy={finalWeek ? finalWeekCard(finalWeek, j.daysLeft) : undefined}
              onOpen={() => router.push('/exam-week')}
              onHide={() => {
                useProgress.getState().hideExamWeek(j.cert.id, j.examDate!);
                sayLater(finalWeek ? 'Hidden. The plan stays in Learn and your readiness report.' : 'Hidden. The checklist stays in your readiness report.');
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
                label="Do a little more"
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
                  // Mobile 1.20: Play now means a lesson; a set resumes with the plan's practice / mock icons.
                  icon={resume.mode === 'mock' ? <Timer size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} /> : <Target size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                  // legacyTitle: a set paused in 1.23 was titled "Starting check…"; it reads "Mixed practice" now.
                  title={`Resume: ${legacyTitle(resume.title)}`}
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
        {/* Mobile 1.24: the reminder ask's one second chance (the day the 3rd study day is done). */}
        {secondVisit && (
          <View style={{ marginTop: space.xl }}>
            <SecondAskCard
              // "Not now" takes the card away (it announces "No reminder set…"): move focus to the section
              // heading above, after the announcement, as the exam-week card does (UX review B1).
              onGone={() => moveFocus(nextHeadRef, ANNOUNCE_DELAY + 50)}
            />
          </View>
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
        {/* One quiet row for a learner with no plant, below the day's study (UX review P6): never ahead
            of it. Mobile 1.21 (design spec §5): one row with a chevron, no ghost pair beside the panel's
            Start. It hides with the screen-reader action "Hide from Today", or "Not now" on the picker (which
            says so). Its own space above, so it never reads as a third "Also today" item. */}
        {!grown && plantPrompt && (
          <View style={{ marginTop: space.xl }}>
            <ListRow
              testID="plant-prompt"
              icon={<Sprout size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
              title="Your plant"
              subtitle="A companion that grows with your study"
              accessibilityLabel="Your plant. A companion that grows with your study"
              last
              accessibilityHint="Opens the plant picker"
              onPress={() => router.push({ pathname: '/plant-pick', params: { from: 'today' } })}
              onHide={{
                label: 'Hide from Today',
                run: () => {
                  setPlantSettings({ promptHidden: true });
                  sayLater('Hidden. You can plant one from You.');
                },
              }}
            />
          </View>
        )}
        {/* Mobile 1.41: the name, asked once (onboarding no longer asks), from the day after the first study day. */}
        {nameVisit && (
          <View style={{ marginTop: space.xl }}>
            <NameAskCard onGone={() => moveFocus(nextHeadRef, ANNOUNCE_DELAY + 50)} />
          </View>
        )}
        {/* Mobile 1.41: the opt-in Tester question (Help → I'm a beta tester). Never above the day's study. */}
        {testerShown && !nameVisit && (
          <View style={{ marginTop: space.xl }}>
            <TesterQuestionCard card={testerShown} today={plan.day} onGone={() => moveFocus(nextHeadRef, ANNOUNCE_DELAY + 50)} />
          </View>
        )}
        {offerVisit && !offerAnswered && !nameVisit && !testerShown && (
          <View style={{ marginTop: space.xl }}>
            <WidgetOfferCard onGone={() => moveFocus(nextHeadRef, ANNOUNCE_DELAY + 50)} />
          </View>
        )}
        {reaskVisit && !readinessAsked && (
          <View style={{ marginTop: space.xl }}>
            <ReadinessAskCard onGone={() => moveFocus(nextHeadRef, ANNOUNCE_DELAY + 50)} />
          </View>
        )}
        {wTesterShown && (
          <View style={{ marginTop: space.xl }}>
            <WidgetTesterCard card={wTesterShown} today={plan.day} onGone={() => moveFocus(nextHeadRef, ANNOUNCE_DELAY + 50)} />
          </View>
        )}
        {credit.items > 0 && !credit.hidden && (
          // A small notice, so an InviteRow (mobile 1.21: the green rule is the coach's voice only).
          // "Updated after your report", not "Your report helped": another
          // learner's report may have led to the same fix (compliance W2).
          <View style={{ marginTop: space.xl }}>
            <InviteRow
              icon={<Inbox size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
              title="Updated after your report"
              body={creditLine(credit.items)}
              actions={
                <>
                  <Button kind="ghost" label="See your reports" onPress={() => router.push('/reports')} />
                  <Button
                    kind="ghost"
                    label="Dismiss"
                    accessibilityLabel="Dismiss this note"
                    onPress={() => setCredit((x) => ({ ...x, hidden: true }))}
                  />
                </>
              }
            />
          </View>
        )}
      </Enter>
      </View>
    </Screen>
  );
}
