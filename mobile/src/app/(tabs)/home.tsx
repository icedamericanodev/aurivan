/** Today shows the study plan, readiness and study progress. Retired companion data is never read or changed by this screen. */
import { FeatureInfo } from '../../components/featureInfo';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { ExamEveCard, ExamReadyPanel } from '../../components/moments';
import { ClearingBody, clearingLine, clearingTitle, nextStepIndex, PlanLeaves, planHero, planText, ReadinessRow, reviewIdle, todayMinutes } from '../../components/journey';
import { FieldText, headDate, KeyList, Plate, RunningHead } from '../../components/fieldguide';
import {
  PlanCard,
  PlanSteps,
  type PlanStep,
} from '../../components/groveToday';
import { twigWeek } from '../../engine/groveToday';
import { firstFiveProgress } from '../../engine/todayDashboard';
import { FirstFiveProgress, TodayDomains, TodayProgress, WeeklyActivity } from '../../components/todayDashboard';
import { shortDate, spokenShortDate } from '../../lib/format';
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
import { ArrowRight, ICON_STROKE, Inbox, Play, Settings } from '../../components/icons';
import { Button, Enter, groveTile, HeroPanel, ICON_SIZE, InviteRow, Screen, Section, T } from '../../components/ui';
import { countedDone, isOptional, itemMinutes, MINUTES_PER_QUESTION, planComplete, planLeft, SHORT_SET_SIZE, shortSetItem } from '../../engine/dayPlan';
import { shouldAskFit } from '../../engine/fit';
import { firstRangePanelDue, NAME_ASK_AWAY_DAYS, nameAskDue, nameNudgeDue, secondAskDue, studyDaysAway } from '../../engine/firstRun';
import { STAGE_ORDER } from '../../engine/journey';
import { aboutMin, keepUnits, spokenMin } from '../../engine/pace';
import { DAY_MS } from '../../engine/srs';
import { ANNOUNCE_DELAY, moveFocus, sayLater } from '../../lib/a11y';
import { greetingWithName } from '../../engine/displayName';
import { useSettings } from '../../store/settings';
import { runPlanItem, runShortSet } from '../../lib/actions';
import { guardedStart, startFocusPractice } from '../../lib/sessions';
import { firstSetLeftOf } from '../../lib/firstSet';
import { firstSetIds, firstSetNextLine } from '../../content/firstSet';
import { refreshReminders } from '../../lib/reminderSync';
import { remindersSupported } from '../../lib/reminders';
import { haptic } from '../../lib/haptics';
import { useTodayMoments } from '../../lib/moments';
import { useJourney } from '../../lib/useJourney';
import { dayKey } from '../../engine/streak';
import { useReports } from '../../lib/useReports';
import { useProgress } from '../../store/progress';
import { useSeen } from '../../store/seen';
import { useSession, type ActiveSession } from '../../store/session';
import { useHeldWhen } from '../../lib/holdWhileHidden';
import { legacyTitle, type PlanItem } from '../../engine/planner';
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

/** The stage line ("Stage 4 · Rehearse the exam") shows for this many days after the stage changes, then rests. */
const STAGE_NOTE_DAYS = 3;
/** A local day key ("2026-10-15") as a whole day number, for counting days between two views. */
const dayNumber = (key: string) => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);

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
  // Mobile 1.9 motion: growth plays when Today is ON VIEW (it changes while a
  // session sits on top), shows what went up since you last looked, and
  // never replays on a later visit (components/motion.tsx useGrowth).
  const focused = useScreenFocus();
  // Release bug hunt round 3: Today reads the open session only for its Resume row and the first set's
  // Continue. Every pick, Next and Flag in a session replaces the session, and Today (hidden under it)
  // redrew about 240 components each time. While Today is out of view it keeps the session it last
  // showed; when it comes back into view it reads the live one again.
  const active = useHeldWhen(!focused, useSession, (s) => s.active, 'active');
  const markCelebrated = useProgress((s) => s.markCelebrated);
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
  // Each open step sized to what is left (round 4): answers already banked today (the short set)
  // lower its count, its minutes, the day's total and what Continue starts. The saved plan is untouched.
  const plan = useMemo(() => planLeft(j.dayPlan), [j.dayPlan]);
  const allDone = planComplete(plan);
  // The step you are on: a "Questions to revisit" step with nothing due is passed over, so Start opens the next
  // real step (the website shows no review step when none is due). Its saved state is not touched.
  const cur = nextStepIndex(plan, j.dueCount);
  const idle = (i: number) => reviewIdle(plan.items[i], plan.done[i], j.dueCount);
  const moments = useTodayMoments({ cert: j.cert, progress: j.progress, range: j.range, examDate: j.examDate, today: plan.day });
  // The one-time panel takes the forest slot while the plan is still open.
  const showReady = moments.ready && plan.items.length > 0 && !allDone;
  // The clock for a paused mock's minutes left: read when Today opens or comes back into view.
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      // Only a new clock that changes what Today shows re-renders it (performance,
      // 1.15.x): a new day, or a paused timed mock's minutes left.
      // Read outside the updater, so the updater stays pure.
      const at = Date.now();
      const keep = !useSession.getState().active?.deadline;
      setNow((was) => (keep && dayKey(was) === dayKey(at) ? was : at));
    }, []),
  );
  // The Start pill's glyph says what starts (mobile 1.22, the 1.20 icon rule): Play only for a
  // lesson (leading, as on Learn); reviews, practice, mocks and games go forward with a TRAILING
  // arrow, like "Next question →".
  const startIcon = (kind: string | undefined) =>
    function StartIcon(color: string) {
      const Glyph = kind === 'lesson' ? Play : ArrowRight;
      return <Glyph size={ICON_SIZE.inline} color={color} strokeWidth={ICON_STROKE} />;
    };

  const cert = j.cert.id;
  const ringsGrowth = useGrowth(`today:rings:${cert}`, j.readiness.domains.map((d) => Math.round(d.mastery * 100)), { active: focused, firstOfDay: true });
  const rangeGrowth = useGrowth(`today:range:${cert}`, j.range.enough ? [j.range.low, j.range.high] : [], { active: focused, firstOfDay: true });

  // The clearing (T2): once a day, when you come back to it. It plays in full
  // (≤ 1.2 s, a tap skips it) the first few times, then shortened; static
  // with Reduce Motion. Its words are the same in every mode, and spoken once.
  // Keyed by the plan's day: Today stays mounted overnight, and tomorrow's
  // clearing is a new occasion.
  const clearing = useCelebration(
    'clearing',
    allDone && focused && !plan.celebrated,
    `Today complete. ${clearingTitle(plan)} ${clearingLine(plan, j.readiness, j.range)}.`,
    `${cert}:${plan.day}`,
  );
  // The clearing's one success tap, once a day (respects the Haptics setting),
  // as it comes into view (not while Results is still on top).
  useEffect(() => {
    if (allDone && focused && !plan.celebrated) {
      haptic.success();
      markCelebrated(j.cert.id);
    }
  }, [allDone, focused, plan.celebrated, markCelebrated, j.cert.id]);
  // The exam-ready moment (T3): the rings grow and the frond breathes once,
  // once EVER per cert (saved): later launches show the panel still, unannounced.
  const ready = useCelebration('exam-ready', showReady && focused, 'A quiet milestone. Your readiness is holding.', `exam-ready:${cert}`, true);
  // Any touch on Today ends a moment at once (it never blocks the next tap).
  const live = !clearing.settled || !ready.settled;
  const skipAll = () => {
    clearing.skip();
    ready.skip();
  };

  // "Also today": an unfinished session first, then the optional mock (mobile 1.24: only those).
  // Mobile 1.54.3: on a cleared day it still shows, with the paused session only, under the clearing and above
  // "Tomorrow" (it used to sit only in the open-plan branch, so a mock paused after the plan was done had no way back).
  // A paused first set is not listed here while it is the plan's current item: the panel's Start already picks it up
  // where it stopped (mobile 1.24). On a cleared day there is no Start, so it is listed like any paused session.
  const firstNow = plan.items[cur]?.kind === 'practice' && plan.items[cur].why === 'first';
  const resume = active && !active.finishedAt && !(active.firstSet && firstNow) ? active : null;
  // Every other open item is already a checklist row on the forest panel, so it is never said twice here.
  // While the ready panel shows there is no checklist, so the open items (the current one too) are listed here.
  // On a cleared day the list holds only the paused session (mobile 1.54.3): an optional mock left for another day is
  // not listed under the clearing, as before.
  const rest = allDone ? [] : plan.items.map((item, i) => ({ item, i })).filter(({ i }) => !plan.done[i] && (showReady || isOptional(plan.items, i)));
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
  // The day's minutes, beside "Today’s plan" on its card: "About 19 min" (Grove; "Today’s plan · about 19 min" from
  // mobile 1.23). The open items only, so it shrinks as the day goes. Only for plans sized in minutes (1.15+). A mock
  // is left out: its own line says it is optional and how long it is.
  // A review step with nothing due adds no minutes (it says "All caught up").
  const dayMinutes = plan.budget ? todayMinutes(plan.items, plan.done, j.dueCount) : 0;
  const curItem = plan.items[cur];
  // What Start opens. With every open step a review with nothing due, the website's Start runs the live plan
  // instead (todayLivePlanStart): here too, its first real step (a practice set, a lesson), never "All caught
  // up". The saved plan is not changed.
  const startItem = (idle(cur) && j.plan.find((it) => it.kind !== 'mock' && !reviewIdle(it, false, j.dueCount))) || curItem;
  // The hero's words: the title names the activity (no count) and the meta line under it carries the detail
  // ("16 ready to revisit · oldest first", "8 questions", a mock's length). Mobile 1.24: the meta always shows,
  // because the item you are on is no longer ALSO the first checklist row (it was said twice). Its minutes are
  // said once: when this item is the day's only timed one, the caption's total is its own, so the meta leaves them out.
  const openTimed = plan.items.filter((it, i) => !plan.done[i] && it.kind !== 'mock' && !idle(i));
  const minutesSaid = dayMinutes > 0 && openTimed.length === 1 && openTimed[0] === curItem;
  const hero = curItem ? planHero(curItem, j.dueCount, { minutesSaid }) : null;
  // Mobile 1.24: no stat tiles. After the range exists, one quiet line names the area where you'll gain most.
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
    plantLine: false,
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
  // Both wait for the second ask, Fit; each is latched for the visit it first shows on.
  const otherSetup = secondVisit || askFit;
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
  // the first range card, the exam-week card and report note), on top of the setup lines.
  const nameOther =
    otherSetup || Boolean(moments.moment) || showReady || firstRangeDue || examWeekDue || (credit.items > 0 && !credit.hidden);
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
    otherSetup: otherSetup || nameVisit || Boolean(testerShown) || Boolean(moments.moment) || (credit.items > 0 && !credit.hidden),
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
  const slotBusy = otherSetup || nameVisit || Boolean(testerShown) || offerVisit || Boolean(moments.moment) || (credit.items > 0 && !credit.hidden);
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
  const shortFirst = !showReady && !allDone && !resume && !(testerShown && !nameVisit) ? shortSetItem(plan, { examWeek: examWeekNow }) : -1;
  // With nothing due, the short path is the plan's practice set (as Start is), never "All caught up".
  const shortIdx = shortFirst >= 0 && idle(shortFirst) ? plan.items.findIndex((it, k) => k > shortFirst && it.kind === 'practice' && !plan.done[k]) : shortFirst;
  // "About 6 min. Counts toward today’s plan." (the app's one minutes style; spoken as "minutes").
  const shortLine = `${aboutMin(SHORT_SET_SIZE * MINUTES_PER_QUESTION)}. Counts toward today’s plan.`;

  // Mobile 1.51: the countdown is the title, "Maya, 38 days to go" (with no date, "Good morning, Maya"). Read again
  // each render, so a name changed in Settings shows at once.
  const titleText = greeting(new Date().getHours(), displayName);
  // useJourney rolls over at local midnight even when Today stays open.
  const todayAt = dayKey(now) === plan.day ? now : new Date(`${plan.day}T12:00:00`).getTime();
  const headDay = headDate(todayAt);
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
  // Said in full: "CISA exam on 6 December".
  const examSpoken =
    j.daysLeft !== null && j.daysLeft > 0 && j.examDate ? `${j.cert.name} exam on ${spokenShortDate(new Date(`${j.examDate}T12:00:00`).getTime())}` : (examLine ?? undefined);
  // ── Grove Today (the kit's order, ring first): the hero, the plan, the week's twig. ──
  // Presentation only: every number below is one the app already works out (engine/groveToday.ts).
  const { width } = useWindowDimensions();
  // The greeting is `display`; it steps to `hero` when it would wrap to a third line, or on a phone
  // under 360pt (TYPE_SCALE.md rule R3). Remembered per title, so a new name is measured afresh
  // and the step never flips back and forth.
  const [longTitle, setLongTitle] = useState<string | null>(null);
  const titleStep = width < 360 || longTitle === titleText ? 'hero' : 'display';
  // The hero is Today's one forest card. The clearing (a finished day) and the exam-ready panel are
  // forest moments of their own, so on those days they take its place, as before.
  const heroShown = !allDone && !showReady;
  // The plan's numbered steps: every item but the optional weekly mock (it waits under "Also today").
  const steps: PlanStep[] = plan.items
    .map((item, i) => ({ item, i }))
    .filter(({ i }) => !isOptional(plan.items, i))
    .map(({ item, i }, k) => {
      const words = planHero(item, j.dueCount, { minutesSaid: true });
      // A mock's own words already say how long it is ("50 questions · about 80 min"): no second minutes.
      // A review with nothing due says "All caught up" and has no time either.
      const nothingDue = idle(i);
      const mins = item.kind === 'mock' || nothingDue ? null : `${Math.max(1, Math.round(itemMinutes(item)))} min`;
      // An idle review is never the step you are on (Start opens the next real one): it keeps the outline square.
      const state = plan.done[i] ? 'done' : i === cur && !nothingDue ? 'now' : 'later';
      return {
        key: String(i),
        n: k + 1,
        title: words.title,
        meta: words.meta,
        minutes: mins ? keepUnits(mins) : undefined,
        state,
        // An idle review is not "later" (there is nothing to come back to): its meta, "All caught up", is the whole state.
        spoken: spokenMin(`Step ${k + 1}, ${words.title}, ${words.meta}${mins ? `, ${mins}` : ''}${nothingDue ? '' : `, ${state === 'now' ? 'up next' : state}`}`),
      };
    });
  const doneCount = countedDone(plan).filter(Boolean).length;
  // This week's twig: the study days the streak keeps (the last 14, so the whole week), Monday first.
  // Not in exam week, and not on a welcome-back day (3 or more days away): those days keep one calm focus.
  const studyDays = [...(studyStreak.recentDays ?? []), ...(studyStreak.lastDay ? [studyStreak.lastDay] : [])];
  const week = useMemo(() => twigWeek([...(studyStreak.recentDays ?? []), ...(studyStreak.lastDay ? [studyStreak.lastDay] : [])], todayAt), [studyStreak, todayAt]);
  const openProgress = useCallback(() => router.push('/you'), []);
  const openReadiness = useCallback(() => router.push('/readiness'), []);
  const awayNow = studyDaysAway(studyDays, plan.day);
  const dashboardShown = !firstNow && (answeredTotal > 0 || j.progress.lessonsDone.length > 0);
  const activityShown = dashboardShown && !examWeekNow && awayNow < NAME_ASK_AWAY_DAYS;
  const firstProgress = firstFiveProgress(firstSetIds(cert), j.progress.answers, active?.firstSet && active.certId === cert ? active.responses : {});
  // Reuse the existing next lesson and weighted focus; do not create another recommendation engine.
  // Exam week and paused sessions keep their existing single, calm path.
  const suggestions = !dashboardShown || examWeekNow || resume ? [] : [
    ...(j.upNext && !plan.items.some((item, i) => !plan.done[i] && item.kind === 'lesson' && item.lessonId === j.upNext!.id) ? [{
      key: 'lesson', title: `Continue learning: ${j.upNext.title}`,
      kicker: 'Your next unfinished lesson',
      spoken: `Continue learning: ${j.upNext.title}. Your next unfinished lesson.`,
      onPress: () => router.push({ pathname: '/lesson/[id]', params: { id: j.upNext!.id } }),
    }] : []),
    ...(j.focus && answeredTotal > 0 && !plan.items.some((item, i) => !plan.done[i] && item.kind === 'practice' && item.domainId === j.focus!.id) ? [{
      key: 'focus', title: `Practice ${j.focus.short}`,
      kicker: 'Where you’ll gain most, based on your answers',
      spoken: `Practice ${j.focus.short}. Where you’ll gain most, based on your answers.`,
      onPress: () => guardedStart(() => startFocusPractice(cert, j.focus!), () => router.push('/session')),
    }] : []),
  ].slice(0, 2);
  // The quiet line under the title: the exam's date. Short text (Sky, 5 Nov: nothing repeated on a
  // screen): this week's study days left this line, because the twig card says them whenever it shows.
  const subLine = examLine ?? '';
  const subSpoken = `${examSpoken ?? ''}${j.daysLeft !== null && j.daysLeft > 0 ? `, ${j.daysLeft} ${j.daysLeft === 1 ? 'day' : 'days'} to go` : ''}`;
  return (
    // Mobile 1.44 (UX review H1): the name card has a text field, so the keyboard never covers it or Save.
    <Screen keyboard={nameVisit}>
      <View onTouchStart={live ? skipAll : undefined}>
      <Enter i={0}>
        {/* Date and Settings stay reachable without scrolling past the study plan. */}
        <RunningHead section={headDay.shown} sectionLabel={headDay.spoken} action={{ label: 'Settings', boxed: true, onPress: () => router.push('/settings'), icon: (color) => <Settings size={ICON_SIZE.row} color={color} strokeWidth={ICON_STROKE} /> }} />
        {/* A long name steps down to hero; text remains untruncated at large font sizes. */}
        <T
          v={titleStep}
          accessibilityRole="header"
          accessibilityLabel={titleText}
          onTextLayout={(e) => {
            if (titleStep === 'display' && e.nativeEvent.lines.length > 2) setLongTitle(titleText);
          }}
          style={{ marginTop: space.lg }}
        >
          {titleText}
        </T>
        {/* The exam's day and this week's study days on one quiet line (the streak itself is on the twig). */}
        {subLine ? (
          <T v="meta" num accessibilityLabel={subSpoken} style={{ marginTop: space.xs }}>
            {subLine}{j.daysLeft !== null && j.daysLeft > 0 ? ` · ${j.daysLeft} ${j.daysLeft === 1 ? 'day' : 'days'} to go` : ''}
          </T>
        ) : null}
        {j.daysLeft === null && <Button kind="ghost" label="Set a target" accessibilityHint="Opens Settings at your exam date" onPress={() => router.push({ pathname: '/settings', params: { open: 'exam-date' } })} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />}
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

      {(showReady || allDone) && <Enter i={1} style={{ marginTop: space.lg }}>
        {showReady ? (
          <ExamReadyPanel cert={j.cert} readiness={j.readiness} onDismiss={moments.dismissReady} celebration={ready} />
        ) : allDone ? (
          <Celebrate celebration={clearing}>
            <HeroPanel
              caption="Today complete"
              // An optional mock left for another day is not a leaf of the clearing.
              captionExtra={<PlanLeaves done={countedDone(plan)} focused={focused} seenKey={`${cert}:${plan.day}:cleared`} />}
              title={clearingTitle(plan)}
              art="clearing"
              wideTitle
            >
              <ClearingBody plan={plan} readiness={j.readiness} range={j.range} cert={j.cert} celebration={clearing} />
            </HeroPanel>
          </Celebrate>
        ) : null}
      </Enter>}

      {heroShown && (
        <Enter i={2} style={{ marginTop: space.lg }}>
          {plan.items.length === 0 ? (
            // After the exam (or with no plan): the plate asks how it went, and the button sets a new date.
            <View>
              <Plate fig={{ title: j.daysLeft !== null && j.daysLeft < 0 ? 'Exam done' : 'Plan' }} testID="today-plate">
                <View style={[groveTile(c, true), { padding: space.md }]}>
                  <FieldText v="value" accessibilityRole="header">How did it go?</FieldText>
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
          ) : (
            // Today's plan (the kit's card): its minutes, the numbered steps, the ONE Start, "Stop any time".
            <PlanCard
              testID="today-plate"
              title="Today’s plan"
              info={<FeatureInfo title="Today’s plan"><T v="body">Your plan fits your study time. Stop any time and continue where you left off. Use Short on time for a smaller set.</T></FeatureInfo>}
              minutes={dayMinutes > 0 ? keepUnits(aboutMin(dayMinutes)) : undefined}
              spoken={`Today’s plan, ${dayMinutes > 0 ? `${spokenMin(aboutMin(dayMinutes, true))}, ` : ''}${doneCount} of ${countedDone(plan).length} done`}
            >
              {firstNow && firstProgress.total > 0 ? (
                <View style={{ gap: space.md }}>
                  <T v="title">Your first five.</T>
                  <T v="meta">{`${firstProgress.left} ${firstProgress.left === 1 ? 'question' : 'questions'} remaining · No timer`}</T>
                  <FirstFiveProgress done={firstProgress.done} total={firstProgress.total} />
                </View>
              ) : <>
                <PlanSteps steps={steps} />
                <T v="meta">{`${doneCount} of ${countedDone(plan).length} steps complete`}</T>
              </>}
              <Button
                shape="plate"
                // Answers already banked on a step (the short set) mean the day has begun: Continue.
                label={plan.done.some(Boolean) || firstBegun || (plan.credit ?? []).some((n) => n > 0) ? 'Continue' : 'Start'}
                onPress={() => runPlanItem(startItem, j.cert.id)}
                icon={startIcon(startItem?.kind)}
                // Play only for a lesson (leading); everything else goes forward with an arrow after the label.
                iconLeading={startItem?.kind === 'lesson'}
                accessibilityHint={startItem === curItem ? hero!.title : planHero(startItem, j.dueCount).title}
                style={{ marginTop: space.xs }}
              />
              {shortIdx >= 0 && (
                // The short path (mobile 1.41): a quiet ghost button in the plan, never a second Start.
                <View testID="short-set" style={{ alignItems: 'center' }}>
                  <Button
                    kind="ghost"
                    label={`Short on time? ${SHORT_SET_SIZE} questions`}
                    accessibilityHint={spokenMin(shortLine)}
                    onPress={() => runShortSet(plan.items[shortIdx], j.cert.id)}
                  />
                  {/* Said by the button's hint already, so hidden from screen readers here. */}
                  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <T v="meta" center>{shortLine}</T>
                  </View>
                </View>
              )}
            </PlanCard>
          )}
        </Enter>
      )}

      {!allDone && (
        <Enter i={3}>
          {/* The Exam-ready panel draws the rings itself: once per screen (spec §10). The scale bar under it
              stays for that day only; every other day the ring above is the one range on Today. */}
          {showReady && answeredTotal > 0 && (
            <ReadinessRow
              cert={j.cert}
              readiness={j.readiness}
              range={j.range}
              stage={showStage ? `Stage ${stageIdx + 1} · ${j.stageLine}` : undefined}
              rings={false}
              ringsGrowth={ringsGrowth}
              rangeGrowth={rangeGrowth}
              onPress={() => router.push('/readiness')}
              scale
            />
          )}
          {/* The journey's coach line, for a few days after its stage changes (it was in the readiness row).
              Its number is left out here: the hero already says the plant's "Growth 1 of 6", and two numbered
              ladders never sit on one screen (PR #43). */}
          {/* Polish round 1: the stage line and the answered line are ONE quiet block, one gap above it
              (space.lg) and space.sm inside it. The stage line says what it is ("Study stage: …"), so
              "Rehearse the exam" never reads as an order with nothing to tap; still no number, since the
              hero's "Growth 1 of 6" is the screen's one numbered ladder (PR #43). The area line uses the
              focus rule's own words, "where you’ll gain most" (DECISIONS 14: it is the largest weighted
              gap, not the lowest score, so never "weakest"). */}
          {(() => {
            const stageShown = !showReady && showStage && answeredTotal > 0;
            const gainShown = !!weakest && answeredTotal > 0 && !firstRangeDue;
            if (!stageShown && !gainShown) return null;
            return (
              <View style={{ marginTop: space.lg, gap: space.sm }}>
                {stageShown && (
                  <View testID="today-stage-line">
                    <T v="meta">{`Study stage: ${j.stageLine}`}</T>
                  </View>
                )}
                {gainShown && weakest && (
                  // The domain's short name ("IS Operations"), not the tile abbreviation ("IS Ops", spoken "I S ops"): UX review S6.
                  // No-break spaces inside the area's name, so a narrow phone breaks before "Info Protection",
                  // never between its words (DECISIONS 11). Screen readers read them as normal spaces.
                  <T v="meta">{`${answeredTotal} answered · where you’ll gain most: ${weakest.short.replace(/ /g, '\u00A0')}`}</T>
                )}
              </View>
            );
          })()}
          {/* Day 0 (mobile 1.39): the first five are still to finish, so say what comes after them. */}
          {firstNow && !plan.done[cur] && (
            <View testID="today-day0-next" style={{ marginTop: space.lg }}>
              <T v="meta">{firstSetNextLine(j.daysLeft !== null)}</T>
            </View>
          )}
          {/* "Your first readiness range": one calm card, right under the range it explains (mobile 1.24). */}
          {firstRangeDue && <View style={{ marginTop: space.lg }}>{firstRangeCard}</View>}
        </Enter>
      )}

      {allDone && firstRangeDue && <View style={{ marginTop: space.xl }}>{firstRangeCard}</View>}

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
        {/* "Also today": a paused session first, then the optional mock. On a cleared day (mobile 1.54.3) only
            the paused session, under the clearing and above "Tomorrow", so it can always be resumed from Today. */}
        {alsoCount > 0 && (
          <>
            <Section variant="head" title="Also today" meta={sectionMinutes(alsoMinutes)} metaLabel={alsoMinutes > 0 ? spokenMin(aboutMin(alsoMinutes)) : undefined} headRef={nextHeadRef} />
            {/* Premium round 2 (Field Guide foundation): an index list, the old subtitle ("Lesson · 5 min")
                as each row's kicker over its title; spoken as the rows were. */}
            <KeyList
              testID="also-today"
              items={[
                ...(resume
                  ? [
                      {
                        key: 'resume',
                        // legacyTitle: a set paused in 1.23 was titled "Starting check…"; it reads "Mixed practice" now.
                        kicker: `Question ${resume.index + 1} of ${resume.questionIds.length}`,
                        title: `Resume: ${legacyTitle(resume.title)}`,
                        spoken: `Resume: ${legacyTitle(resume.title)}, Question ${resume.index + 1} of ${resume.questionIds.length}`,
                        onPress: () => router.push('/session'),
                      },
                    ]
                  : []),
                ...rest.map(({ item, i }) => ({
                  key: String(i),
                  kicker: rowShort(item, plan.items, i, j.dueCount),
                  title: planText(item, j.dueCount).title,
                  spoken: `${planText(item, j.dueCount).title}, ${spokenMin(rowShort(item, plan.items, i, j.dueCount))}`,
                  onPress: () => runPlanItem(item, j.cert.id),
                })),
              ]}
            />
          </>
        )}
        {allDone && (
          <>
            {tomorrow.length > 0 && (
              <>
                <Section variant="head" title="Tomorrow" meta={tomorrowMinutes} metaLabel={tomorrowMinutes && spokenMin(tomorrowMinutes)} headRef={alsoCount > 0 ? undefined : nextHeadRef} />
                {/* Premium round 2 (Field Guide foundation): an index list, the old subtitle as the kicker. */}
                <KeyList
                  testID="tomorrow-list"
                  items={tomorrow.map((item, k) => ({
                    key: String(k),
                    kicker: rowShort(item, tomorrow, k, undefined, 'tomorrow'),
                    title: planText(item, undefined, 'tomorrow').title,
                    spoken: `${planText(item, undefined, 'tomorrow').title}, ${spokenMin(rowShort(item, tomorrow, k, undefined, 'tomorrow'))}`,
                  }))}
                />
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
        )}
        {dashboardShown && (
          <View style={{ marginTop: space.xl, gap: space.lg }}>
            <TodayProgress lessons={j.progress.lessonsDone.length} answered={answeredTotal} onOpen={openProgress} />
            {activityShown && <WeeklyActivity week={week} />}
            {answeredTotal > 0 && !showReady && <TodayDomains cert={j.cert} readiness={j.readiness} onOpen={openReadiness} />}
            {suggestions.length > 0 && <View testID="today-suggestions">
              <Section variant="head" title="Smart suggestions" />
              <KeyList items={suggestions} />
            </View>}
          </View>
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
