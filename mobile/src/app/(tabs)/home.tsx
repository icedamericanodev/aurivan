/**
 * Today — "what is my one next step, and how am I growing?"
 * Spec: docs/mobile/DESIGN_SYSTEM.md §11 "Today" and "Daily clearing card".
 *
 * Top to bottom:
 *   meta row   weekday · days to exam | sprig streak (serif numeral)
 *   "Today"
 *   forest     "Start here" + leaf marks for the plan, the current item, Start
 *   readiness  mono growth rings + the honest range ("62–70%") + italic stage
 *   Also today the rest of the plan (real, unshortened titles)
 *
 * When every plan item is done, the forest panel becomes the clearing card
 * (today's numbers + how readiness moved) and "Tomorrow" previews what's next.
 *
 * Signature moments (Phase 5b, components/moments.tsx):
 *   - the day before the exam / exam day: a calm card above the panel;
 *   - "Your readiness is holding" (lower bound ≥ 80% for 7 days): the forest
 *     panel, once per cert, until dismissed. Its plan item moves to "Also today".
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { ExamEveCard, ExamReadyPanel } from '../../components/moments';
import { ClearingBody, clearingLine, clearingTitle, PlanLeaves, planIcon, planText, ReadinessRow } from '../../components/journey';
import { Celebrate, Pop, useCelebration, useGrowth, useScreenFocus } from '../../components/motion';
import { ICON_STROKE, Play, Settings, Sprig } from '../../components/icons';
import { BigNum, Button, Enter, HeroPanel, ICON_SIZE, ListRow, Row, Screen, ScreenTitle, Section, T } from '../../components/ui';
import { currentIndex, itemMinutes, MINUTES_PER_QUESTION, planComplete } from '../../engine/dayPlan';
import { runPlanItem } from '../../lib/actions';
import { haptic } from '../../lib/haptics';
import { useTodayMoments } from '../../lib/moments';
import { useJourney } from '../../lib/useJourney';
import { useReports } from '../../lib/useReports';
import { useProgress } from '../../store/progress';
import { useSession, type ActiveSession } from '../../store/session';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** "Something you reported was updated." (by different things, not reports). */
function creditLine(items: number): string {
  return items === 1 ? 'Something you reported was updated.' : 'Things you reported were updated.';
}

/** "about 84 minutes": the same style as "About 24 minutes" on the plan items. */
function aboutMinutes(n: number): string {
  return `about ${n} ${n === 1 ? 'minute' : 'minutes'}`;
}

/**
 * What a paused session still takes: its unanswered questions at study pace,
 * but never more than a timed mock has left on its clock (the clock keeps
 * running while it is paused).
 */
function resumeMinutes(s: ActiveSession, now: number): number {
  const estimate = Math.max(1, Math.round((s.questionIds.length - Object.keys(s.responses).length) * MINUTES_PER_QUESTION));
  if (s.mode !== 'mock' || !s.deadline) return estimate;
  return Math.max(1, Math.min(estimate, Math.ceil((s.deadline - now) / 60_000)));
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  useFocusEffect(useCallback(() => setNow(Date.now()), []));
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

  // "Also today": an unfinished session first, then the plan items still to do.
  const resume = active && !active.finishedAt ? active : null;
  // While the ready panel shows, the current item is listed here too.
  const rest = plan.items.map((item, i) => ({ item, i })).filter(({ i }) => !plan.done[i] && (showReady || i !== cur));
  const alsoCount = rest.length + (resume ? 1 : 0);
  // The list always shows every item, so a count adds nothing: say the time
  // instead, which is what a busy learner budgets (ui.md T4).
  const alsoMinutes = rest.reduce((n, { item }) => n + itemMinutes(item), 0) + (resume ? resumeMinutes(resume, now) : 0);
  // Tomorrow = a preview of the live plan (the next two items).
  const tomorrow = j.plan.slice(0, 2);

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
              captionExtra={<PlanLeaves done={plan.done} focused={focused} seenKey={`${cert}:${plan.day}`} />}
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
            title={planText(plan.items[cur], j.dueCount).title}
            meta={planText(plan.items[cur], j.dueCount).meta}
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
          />
        </Enter>
      )}

      <Enter i={3}>
        {allDone ? (
          <>
            {tomorrow.length > 0 && (
              <>
                <Section title="Tomorrow" meta={aboutMinutes(tomorrow.reduce((n, t) => n + itemMinutes(t), 0))} />
                {tomorrow.map((item, k) => (
                  <ListRow
                    key={k}
                    icon={planIcon(item, c.accentText)}
                    title={planText(item).title}
                    subtitle={planText(item).short}
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
              <Section title="Also today" meta={aboutMinutes(alsoMinutes)} />
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
                  subtitle={planText(item, j.dueCount).short}
                  onPress={() => runPlanItem(item, j.cert.id)}
                  last={k === rest.length - 1}
                />
              ))}
            </>
          )
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
