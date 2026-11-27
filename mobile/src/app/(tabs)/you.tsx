/** Study summary, progress, badges and personal tools. Plant links are retired; saved study and legacy companion data remain intact. */
import { FeatureInfo } from '../../components/featureInfo';
import { findQuestion, isHeldBackOut } from '../../content/loader';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { lowEndLine, ReadinessBlock } from '../../components/youReadiness';
import { FieldText, headDate, RunningHead } from '../../components/fieldguide';
import { BadgeShelf, HERBARIUM, SHELF_SLOTS } from '../../components/herbarium';
import { lastPressed } from '../../engine/fieldGuide';
import { useGrowth, useScreenFocus, type Growth } from '../../components/motion';
import { creditSubtitle } from '../../components/help';
import { AccountSection } from '../../components/account';
import { BoardRow } from '../../components/board';
import { CLOUD } from '../../cloud/flag';
import { MindsetGrowthCard } from '../../components/moments';
import { BadgeIcon, Bookmark, ChevronRight, Crosshair, Gauge, ICON_STROKE, LifeBuoy, NotebookPen, RotateCcw, Settings, Share2 } from '../../components/icons';
import { CardHead, HubCard } from '../../components/groveHub';
import { MiniReadyRing, StatGrid, StatTile } from '../../components/groveYou';
import { ShareProgressSheet } from '../../components/shareCard';
import { youStreakRow, youSummary } from '../../engine/groveYou';
import { accuracyTile, twigWeek } from '../../engine/groveToday';
import { SETTINGS_ROW_NOTE, YouSummaryLine } from '../../components/youTop';
import { Button, EmptyState, Enter, ICON_SIZE, InviteRow, Lead, ListRow, Screen, T, useFontScale } from '../../components/ui';
import { pacingStats, pacingStatsLine, spokenMin } from '../../engine/pace';
import { readinessRead } from '../../lib/readinessRead';
import { useToday } from '../../lib/useJourney';
import { mockRowTitle, mockSubtitle } from '../../components/readinessReport';
import { RANGE_MIN_ANSWERS, readinessRange, type ReadinessRange } from '../../engine/readinessRange';
import { mockPct } from '../../engine/readinessReport';
import { dayKey } from '../../engine/streak';
import { FOCUS_SET_SIZE, guardedStart, reviewSubtitle, startFocusPractice, startReview } from '../../lib/sessions';
import { caseEarnedCount } from '../../engine/badgeCatalog';
import { useNewBadge } from '../../lib/badges';
import { backfillLine, seeBackfill } from '../../lib/milestones';
import { useMindsetGrowth } from '../../lib/moments';
import { useReports } from '../../lib/useReports';
import { useActiveCert } from '../../lib/useActiveCert';
import { moveFocus } from '../../lib/a11y';
import { useProgress, type MockResult } from '../../store/progress';
import type { Certification } from '../../content/types';
import { dailyMinutesOf, examDateOf, useSettings } from '../../store/settings';
import { StudyProfile } from '../../components/studyProfile';
import { firstStudyDay, nameInitial, profileLines } from '../../engine/studyProfile';
import { FAMILIARITY_INFO } from '../../engine/fit';
import { LARGE_TEXT, motion, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/**
 * The study profile opens the one name editor: Settings → Your name, which goes back to You on Save or
 * Cancel. `backFromName` remembers the trip, so focus returns to the profile row (UX review O6).
 */
let backFromName = false;
const openNameEditor = () => {
  backFromName = true;
  router.push({ pathname: '/settings', params: { open: 'name' } });
};

/** The badges screen (the route keeps its old name, so links and Results still work). */
const openHerbarium = () => router.push('/milestones');

/** A day key ("2026-10-31") at local noon, for its date words in the head (the key follows the day). */
const dayStart = (key: string) => new Date(`${key}T12:00:00`).getTime();

export default function You() {
  const { c } = useTheme();
  const { cert, readiness, progress, streak, dueCount, daysLeft } = useActiveCert();
  // One quiet line on pacing across timed mocks (engine/pace.ts; untimed mocks never count).
  const pacingLine = pacingStatsLine(pacingStats(progress.mocks));
  // The top range states readiness: an opted-in course's follows first tries (lib/readinessRead.ts).
  // CISA reads every answer, exactly as before. Answered and mastered below keep counting every answer.
  const todayKey = useToday().key;
  const range = readinessRange(cert, readinessRead(cert, progress, todayKey));
  const answered = readiness.domains.reduce((s, d) => s + d.answered, 0);
  const mastered = readiness.domains.reduce((s, d) => s + d.mastered, 0);
  const growth = useMindsetGrowth(cert.id, progress);
  // Help and feedback (mobile 1.7): the row says so when a report's update hasn't been seen yet.
  const { dueItems: creditItems } = useReports();
  // Share card: the study days come from the saved streak (last 14 study days).
  const recentDays = useProgress((s) => s.streak.recentDays);
  // C2: the last study day too, so this week's count matches Today's twig (it reads both).
  const lastDay = useProgress((s) => s.streak.lastDay);
  // The day the sheet was opened (read in the tap handler, not during render). null = closed.
  const [shareDay, setShareDay] = useState<string | null>(null);
  // Mobile 1.10: every badge the case shows as earned (a kept key it doesn't show never counts), and the "new" dot.
  const badgeCount = caseEarnedCount(progress.milestones?.earned);
  // Mobile 1.51: the herbarium row's newest specimens, from the saved keys alone (worked out again only when they change).
  const earnedKeys = progress.milestones?.earned;
  const pressed = useMemo(() => lastPressed(earnedKeys, cert.domains, SHELF_SLOTS), [earnedKeys, cert.domains]);
  const newBadge = useNewBadge();
  const badgesHidden = useSettings((s) => s.badgesHidden);
  // The back-fill line shows ONCE (code review): kept in state for this
  // visit, and marked seen right away, like the Milestones screen does.
  const backfill = progress.milestones?.backfill;
  // Keyed by when the back-fill ran, so a later one (a restore from an older
  // backup while this tab is open) shows its own line. Set during render:
  // React's pattern for state that follows a change in the store.
  const [kept, setKept] = useState<{ at: number; line: string | null } | null>(null);
  if (backfill && !backfill.seen && kept?.at !== backfill.at) setKept({ at: backfill.at, line: backfillLine(backfill.count) });
  const summary = kept?.line ?? null;
  useEffect(() => {
    if (backfill && !backfill.seen) seeBackfill(cert.id);
  }, [backfill, cert.id]);

  const focused = useScreenFocus();
  const rangeGrowth = useGrowth(`you:range:${cert.id}`, range.enough ? [range.low, range.high] : [], { active: focused, firstOfDay: true });
  const accuracy = answered ? Math.round((mastered / answered) * 100) : 0;
  const stats = useGrowth(`you:stats:${cert.id}`, [answered, accuracy, streak], { active: focused });
  const statRoll = (k: number, from: string) => ({ play: stats.play, from, run: stats.run, delay: motion.dur.select + k * motion.stagger.stat });
  // Mobile 1.44: "Your study profile", from the learner's own choices and study only.
  // Today's day, read again whenever You comes into view (render stays pure), so "Exam 14 Feb" drops off after the day.
  const [today, setToday] = useState(() => dayKey(Date.now()));
  const profileRef = useRef<View>(null);
  useFocusEffect(
    useCallback(() => {
      setToday(dayKey(Date.now()));
      // Back from Settings → Your name: screen-reader focus lands on the profile row again, not the top.
      if (backFromName) {
        backFromName = false;
        moveFocus(profileRef, 450);
      }
    }, []),
  );
  const displayName = useSettings((s) => s.displayName);
  const examDate = useSettings((s) => examDateOf(s.examDates, cert.id));
  const minutes = useSettings((s) => dailyMinutesOf(s));
  const familiarity = useSettings((s) => s.familiarity);
  // The first study day: worked out again only when this exam's records change.
  const since = useMemo(
    () =>
      firstStudyDay({
        answers: progress.answers,
        mistakes: progress.mistakes,
        mocks: progress.mocks,
        mastery: progress.mastery,
        earned: progress.milestones?.earned,
        readinessDays: progress.moments?.readiness?.map((r) => r.day),
      }),
    [progress.answers, progress.mistakes, progress.mocks, progress.mastery, progress.milestones?.earned, progress.moments?.readiness],
  );
  // The same object while the words are unchanged, so the memoised block skips re-rendering on an answer (perf-tabs budget).
  const certName = cert.name;
  const profile = useMemo(
    () =>
      profileLines({
        name: displayName,
        certName,
        since,
        examDate,
        minutes,
        startedWith: familiarity ? FAMILIARITY_INFO[familiarity].title : undefined,
        today,
      }),
    [displayName, certName, since, examDate, minutes, familiarity, today],
  );

  // ── Grove You C2: the summary sentence, its Practice button and the stats' words ──
  // Presentation only: every number is one the app already works out (engine/groveYou.ts).
  // This week's study days, Monday first: the same count as Today's twig (the streak keeps the last 14 days).
  const studiedThisWeek = useMemo(
    () => twigWeek([...(recentDays ?? []), ...(lastDay ? [lastDay] : [])], dayStart(today)).filter((d) => d.on).length,
    [recentDays, lastDay, today],
  );
  // "Focus next": the same area Today and Practice pick, so the three never disagree.
  const focus = cert.domains.find((d) => d.id === readiness.focusDomainId) ?? null;
  const topLine = youSummary({ studyDaysThisWeek: studiedThisWeek, range, focusShort: focus?.short ?? null, answered, daysLeft });
  // The streak row follows Today's twig (DECISIONS 3); accuracy says "Too few yet" under 30 answers (DECISIONS 1).
  const streakRow = youStreakRow(progress.milestones?.days ?? 0, streak, studiedThisWeek);
  const accuracyWords = accuracyTile(answered, mastered);
  // The board's line under the streak: this week's study days (the streak tile's second line).
  const weekLine = `${studiedThisWeek} ${studiedThisWeek === 1 ? 'study day' : 'study days'} this week`;

  // The Estimated readiness card's words (PHASE4.md 7.14 item 5): before the first range, how many of
  // the 40 answers are in; the ring shows the same count as dots.
  const towardRange = RANGE_MIN_ANSWERS - (range.enough ? 0 : range.needed);
  return (
    <Screen>
      <Enter i={0}>
        {/* Grove Phase 1: the date (said in full) and the kit's 44pt Settings button, the head's one action. */}
        <RunningHead
          section={headDate(dayStart(today)).shown}
          sectionLabel={headDate(dayStart(today)).spoken}
          action={{
            label: 'Settings',
            hint: 'Exam date, reminders and more',
            boxed: true,
            // Opens the Settings screen (Settings is its own screen; the row near the end of You opens it too).
            onPress: () => router.push('/settings'),
            icon: (col) => <Settings size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />,
          }}
        />
        {/* Mobile 1.44: the first block, on the paper. It opens the one name editor. */}
        <View style={{ marginTop: space.sm }}>
          <StudyProfile ref={profileRef} lines={profile} initial={nameInitial(displayName)} onPress={openNameEditor} />
        </View>
        {/* Grove You C2 (kept in Phase 4): the week in one sentence and the next step. */}
        <YouSummaryLine summary={topLine} />
        {focus && (
          <Button
            label={`Practice ${focus.short}`}
            accessibilityHint={`Starts ${FOCUS_SET_SIZE} questions in ${focus.name}`}
            icon={(col) => <ChevronRight size={18} color={col} strokeWidth={ICON_STROKE} />}
            // The same set as Practice's focus row (lib/sessions.ts startFocusPractice).
            onPress={() => guardedStart(() => startFocusPractice(cert.id, focus), () => router.push('/session'))}
            style={{ alignSelf: 'flex-start', maxWidth: '100%', marginTop: space.md, paddingHorizontal: space.lg }}
          />
        )}
      </Enter>

      <Enter i={1}>
        {/* The stats as the board's four tiles, two by two (one column at large text). */}
        <StatGrid testID="you-stats">
          <StatTile key="answered" label="Answered" value={String(answered)} spoken={String(answered)} roll={statRoll(0, String(stats.from[0]))} />
          <StatTile key="correct" label="Correct" value={String(mastered)} spoken={String(mastered)} />
          {accuracyWords.num ? (
            <StatTile key="accuracy" label="Accuracy" value={String(accuracy)} pct spoken={`${accuracy} percent`} roll={statRoll(1, String(stats.from[1]))} />
          ) : (
            // Under 30 answers a percentage has not earned its precision (DECISIONS 1): words, and when it shows.
            <StatTile key="accuracy" label="Accuracy" word={accuracyWords.shown} note={accuracyWords.hint ?? undefined} spoken={accuracyWords.spoken.replace(/^Accuracy, /, '')} />
          )}
          {streakRow.count ? (
            <StatTile
              key="streak"
              label={streakRow.label}
              value={streakRow.value}
              unit={streakRow.unit}
              note={weekLine}
              spoken={`${streakRow.spoken}. ${weekLine}`}
              color={c.clay}
              roll={statRoll(2, String(stats.from[2]))}
            />
          ) : streakRow.word ? (
            // No streak yet: an invitation, never a "0" that reads as a failure.
            <StatTile key="streak" label={streakRow.label} word={streakRow.word} spoken={streakRow.spoken} color={c.clay} />
          ) : (
            // From study day 14 (or a streak under 2 after the first days): this week's study days, as on Today.
            <StatTile key="streak" label={streakRow.label} value={streakRow.value} unit={streakRow.unit} spoken={streakRow.spoken} />
          )}
        </StatGrid>
        <View style={{ alignItems: 'flex-end' }}><FeatureInfo title="Study progress"><T v="body">Each question counts once, at your latest try. Accuracy appears after 30 answers.</T></FeatureInfo></View>
      </Enter>

      <Enter i={2}>
        <ReadinessCard range={range} towardRange={towardRange} growth={rangeGrowth} />
        {/* The badges, as one card (Settings → Show badges off hides it). */}
        {!badgesHidden && (
          <HubCard testID="you-badges" style={{ marginTop: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: space.md }}>
              <View accessible accessibilityRole="header" accessibilityLabel={HERBARIUM}>
                <T v="title">{HERBARIUM}</T>
              </View>
              <Button kind="ghost" label="All badges" accessibilityHint="Opens your badges" onPress={openHerbarium} style={{ marginRight: -space.sm }} />
            </View>
            {/* The kit's badge shelf (PHASE4 7.14 item 7): the newest pressed first, then empty slots, and one line. */}
            <BadgeShelf pressed={pressed} count={badgeCount} newBadge={newBadge} onPress={openHerbarium} />
          </HubCard>
        )}
        {growth.show && (
          <View style={{ marginTop: space.xl }}>
            <MindsetGrowthCard earlyIn10={growth.earlyIn10} lateIn10={growth.lateIn10} line={growth.line} spoken={growth.spoken} />
          </View>
        )}
      </Enter>

      <Enter i={3}>
        {/* Memoised (performance, 1.15.x): coming into view, or a store
            write that changes none of these, never re-renders the lists. */}
        <YouLists
          cert={cert}
          summary={badgesHidden ? null : summary}
          dueCount={dueCount}
          // The Saved list's own rule: in this build, and not a held-back form's question until taken (never for CISA).
          saved={progress.bookmarks.filter((id) => findQuestion(cert.id, id) && !isHeldBackOut(cert.id, id)).length}
          badgesHidden={badgesHidden}
          mocks={progress.mocks}
          pacingLine={pacingLine}
          creditItems={creditItems}
          focus={focus}
          hasAnswers={answered > 0}
          // The state setter is stable, so the memoised lists never re-render for it.
          onShare={setShareDay}
        />
      </Enter>

      {/* Mounted only while open, so the card's numbers are always fresh. */}
      {shareDay && (
        <ShareProgressSheet
          visible
          onClose={() => setShareDay(null)}
          cert={cert}
          readiness={readiness}
          input={{
            certName: cert.name,
            issuer: cert.issuer.name,
            streak,
            recentDays: recentDays ?? [],
            today: shareDay,
            answered,
            range,
          }}
        />
      )}
    </Screen>
  );
}

/**
 * You's lower half, as the board's cards: Study tools, Your progress, Mock exams, then Help and feedback,
 * Settings and the trademark line. Its props are primitives and the store's own arrays, so it re-renders
 * only when one of them changes (never on focus).
 */
const YouLists = memo(function YouLists({
  cert,
  summary,
  dueCount,
  saved,
  badgesHidden,
  mocks,
  pacingLine,
  creditItems,
  focus,
  hasAnswers,
  onShare,
}: {
  /** Any answers yet (the focus row says why only then). */
  hasAnswers: boolean;
  /** Opens the share sheet for the day it was tapped. */
  onShare: (day: string) => void;
  cert: Certification;
  summary: string | null;
  dueCount: number;
  saved: number;
  badgesHidden: boolean;
  mocks: readonly MockResult[];
  pacingLine: string | null;
  creditItems: number;
  /** The focus area (readiness.focusDomainId), or null before there is one. */
  focus: Certification['domains'][number] | null;
}) {
  const { c } = useTheme();
  const icon = (G: typeof Settings) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;
  // A mini mock is a third of the exam, as on Practice.
  const miniMock = Math.round(cert.exam.questions / 3);
  const helpLine = creditItems ? creditSubtitle(creditItems) : 'Questions, reports, what’s new';
  return (
    <>
      {summary && (
        // Once, after the launch back-fill: one calm line, not a burst of moments.
        // An InviteRow (mobile 1.21): an award is not the coach's voice, so no green rule or italic.
        // Only the words are grouped for screen readers; the button stays its own stop (UX review H1).
        <View style={{ marginTop: space.xl }}>
          <InviteRow
            icon={icon(BadgeIcon)}
            title="From your study so far"
            body={summary}
            actions={<Button kind="ghost" label="See your badges" onPress={() => router.push('/milestones')} />}
          />
        </View>
      )}
      {/* Study tools (the board's card): each row says what a tap opens; counts sit at the end. */}
      <HubCard testID="study-tools" style={{ marginTop: space.lg }}>
        <CardHead title="Study tools" />
        <ListRow
          icon={icon(RotateCcw)}
          title="Questions to revisit"
          // The review set: the same line as Practice ("16 ready today · oldest first"); never a queue total.
          subtitle={reviewSubtitle(dueCount)}
          accessibilityLabel={`Questions to revisit, ${dueCount ? reviewSubtitle(dueCount).replace(' · ', ', ') : 'all caught up'}`}
          onPress={() => guardedStart(() => startReview(cert.id), () => router.push('/session'), () => router.push('/caught-up'))}
        />
        <ListRow
          icon={icon(NotebookPen)}
          title="Mistake journal"
          // Premium pass 4.6: what the journal shows, not a count of open misses (a total that only grows).
          subtitle="Your pattern first, then each miss"
          accessibilityLabel="Mistake journal, your pattern first, then each miss"
          onPress={() => router.push('/mistakes')}
        />
        <ListRow
          icon={icon(Bookmark)}
          title="Saved questions"
          subtitle={saved ? `${saved} saved · your own revision set` : 'Your own revision set'}
          accessibilityLabel={`Saved questions, ${saved} saved`}
          onPress={() => router.push('/saved')}
        />
        {/* Mobile 1.51: with badges hidden in Settings, Field notes has its own row here (the badges card holds it otherwise). */}
        {badgesHidden && (
          <ListRow icon={icon(Gauge)} title="Drill progress" subtitle="Your level in each drill" accessibilityLabel="Drill progress. Your level in each drill" onPress={() => router.push('/field-notes')} />
        )}
        <ListRow
          icon={icon(Share2)}
          title="Share progress"
          subtitle="A card with one honest number"
          accessibilityLabel="Share progress, A card with one honest number"
          accessibilityHint="Opens a preview of a progress card you can share"
          onPress={() => onShare(dayKey(Date.now()))}
          last
        />
      </HubCard>

      <ProgressCard cert={cert} focus={focus} hasAnswers={hasAnswers} />
      <MocksCard mocks={mocks} miniMock={miniMock} pacingLine={pacingLine} />
      <HelpCards helpLine={helpLine} />
      <T v="meta" center style={{ marginTop: space.xl }}>{cert.trademarkNotice}</T>
    </>
  );
});


/** The Estimated readiness card (PHASE4.md 7.14 item 5). Its own memo: it redraws only when the range does. */
const ReadinessCard = memo(function ReadinessCard({ range, towardRange, growth }: { range: ReadinessRange; towardRange: number; growth?: Growth }) {
  const { c } = useTheme();
  const rangeGrowth = growth;
  // From text scale 1.3 the header stacks (PHASE4 section 11): the ring, then the kicker and its words
  // at full width, and "See report" moves to its own line under the range. Side by side, the kicker
  // was squeezed to a few letters a line at 200%.
  const large = useFontScale() >= LARGE_TEXT;
  const seeReport = (
    <Button
      kind="ghost"
      label="See report"
      // WCAG 2.5.3: the spoken name starts with the visible words.
      accessibilityLabel="See report, your readiness report"
      accessibilityHint="Your mock trend, each domain side by side, and what would raise your low end"
      onPress={() => router.push('/readiness')}
      style={large ? { alignSelf: 'flex-start', marginLeft: -space.sm } : { marginRight: -space.sm }}
    />
  );
  // Estimated readiness, as one card: the small ring, the kicker, the range (on its scale bar) or
  // "Not enough data yet" with the count toward the first range, and the report link.
  return (
    <HubCard testID="you-readiness" style={{ marginTop: space.lg, paddingBottom: space.md }}>
      <View style={large ? { alignItems: 'flex-start', gap: space.sm } : { flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <MiniReadyRing answered={towardRange} range={range.enough ? { low: range.low, high: range.high } : null} />
        <View style={large ? { alignSelf: 'stretch' } : { flex: 1, minWidth: 0 }}>
          {/* One kicker word on You and Today (UX review O9). */}
          <FieldText v="head" accessibilityRole="header">Estimated readiness</FieldText>
          {!range.enough && (
            // Short text (Sky, 5 Nov): one line. No scale bar is drawn before a range, so the study-bar
            // words wait until there is one (they were said twice here).
            <View accessible accessibilityLabel={`Not enough data yet. ${towardRange} of ${RANGE_MIN_ANSWERS} answers for your first range.`}>
              <T v="title" style={{ marginTop: 2 }}>Not enough data yet</T>
              <T v="meta">{`${towardRange} of ${RANGE_MIN_ANSWERS} answers for your first range.`}</T>
            </View>
          )}
        </View>
        {!large && seeReport}
      </View>
      {/* Mobile 1.51: the range on a scale bar with a tick at the study bar and its words built in. */}
      {range.enough && <ReadinessBlock range={range} growth={rangeGrowth} />}
      {/* Large text: "See report" on its own line, under the range (or under "Not enough data yet"). */}
      {large && seeReport}
      {/* Grove panel Q1: once there is a range, the low end is defined once, before the study-bar line. */}
      {/* Short text (Sky, 5 Nov): the area line ("Each area has its own 70% line") went; the areas
          card's key says it, one card below. */}
      {range.enough && <T v="meta" color={c.ink} style={{ marginTop: space.md }}>{lowEndLine(range.low)}</T>}
    </HubCard>
  );
});

/** Your progress (the board's card), mapped to routes the phone has. */
const ProgressCard = memo(function ProgressCard({ cert, focus, hasAnswers }: { cert: Certification; focus: Certification['domains'][number] | null; hasAnswers: boolean }) {
  const { c } = useTheme();
  const icon = (G: typeof Settings) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;
  // Your progress (the board's card), mapped to routes the phone has: the report, and the focus area's set.
  return (
      <HubCard testID="you-progress" style={{ marginTop: space.lg }}>
        <ListRow
          icon={icon(Gauge)}
          title="Your progress"
          subtitle="Your range, charts and mock trend"
          accessibilityHint="Opens your readiness report"
          onPress={() => router.push('/readiness')}
          last={!focus}
        />
        {focus && (
          <ListRow
            icon={<Crosshair size={ICON_SIZE.row} color={c.clay} strokeWidth={ICON_STROKE} />}
            title={focus.short}
            // Why this area, once there are answers to judge by (engine/groveYou.ts GAIN_MOST); before that, "Focus next".
            subtitle={hasAnswers ? 'Where you’ll gain most' : 'Focus next'}
            accessibilityHint={`Starts ${FOCUS_SET_SIZE} questions in ${focus.name}`}
            onPress={() => guardedStart(() => startFocusPractice(cert.id, focus), () => router.push('/session'))}
            last
          />
        )}
      </HubCard>
  );
});

/** Mock exams: the history (or "No mocks yet" and its start), then the pacing line. */
const MocksCard = memo(function MocksCard({ mocks, miniMock, pacingLine }: { mocks: readonly MockResult[]; miniMock: number; pacingLine: string | null }) {
  return (
      <HubCard testID="you-mocks" style={{ marginTop: space.lg, paddingBottom: space.md }}>
        <CardHead title="Mock exams" />
        <MockHistory mocks={mocks} miniMock={miniMock} />
        {/* Pacing across timed mocks only (untimed ones are left out). */}
        {pacingLine && <T v="meta" style={{ marginTop: space.md }}>{pacingLine}</T>}
      </HubCard>
  );
});

/** Account (cloud builds), Help and feedback, and the Settings row, each in its own card. */
const HelpCards = memo(function HelpCards({ helpLine }: { helpLine: string }) {
  const { c } = useTheme();
  const icon = (G: typeof Settings) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;
  return (
    <>
      {/* Cloud builds only: its own "Account" section, "Sync across devices" / "Account and sync" (one of the two ways in). */}
      {CLOUD && <AccountSection />}
      {/* One entry to Help and feedback (mobile 1.7), in its own card; the full list is on that screen. */}
      <HubCard testID="you-help" style={{ marginTop: space.lg }}>
        <CardHead title="Help and feedback" />
        {/* Cloud builds only: the feedback board (Phase 8). */}
        {CLOUD && <BoardRow />}
        <ListRow
          icon={icon(LifeBuoy)}
          title="Get help or send feedback"
          subtitle={helpLine}
          accessibilityLabel={`Get help or send feedback, ${helpLine}`}
          onPress={() => router.push('/help')}
          last
        />
      </HubCard>
      {/* Grove You C2 (owner: Settings clearly separate from You): one row near the end that opens the
          same Settings screen as the cog in the head. Its line says what lives there. */}
      <HubCard style={{ marginTop: space.lg }}>
        <ListRow
          testID="you-settings-row"
          icon={icon(Settings)}
          title="Settings"
          subtitle={SETTINGS_ROW_NOTE}
          accessibilityLabel={`Settings, ${SETTINGS_ROW_NOTE}`}
          accessibilityHint="Opens Settings"
          onPress={() => router.push('/settings')}
          last
        />
      </HubCard>
    </>
  );
});

/** The mock history (its own memo: an answer in a session changes the review count above it, never the mocks). */
const MockHistory = memo(function MockHistory({ mocks, miniMock }: { mocks: readonly MockResult[]; miniMock: number }) {
  return (
    <>
      {mocks.length === 0 ? (
        <>
          <EmptyState compact title="No mocks yet" body="A mini mock shows how the exam feels." />
          {/* An experienced learner shouldn't have to wait for Today (ui.md Y4): the same start sheet as Practice. */}
          <Button
            kind="ghost"
            label="Start a mini mock"
            accessibilityHint={`${miniMock} questions. Opens the timing choices first.`}
            onPress={() => router.push({ pathname: '/mock-start', params: { questions: String(miniMock) } })}
            style={{ alignSelf: 'center', marginTop: space.xs }}
          />
        </>
      ) : (
        mocks.slice(0, 10).map((m, i, all) => (
          <ListRow
            key={m.id}
            lead={<Lead value={`${mockPct(m)}%`} unit="score" />}
            title={mockRowTitle(m)}
            // Extra time and untimed mocks are labelled in history (older results were standard).
            // The time in the same words as Results ("3 h 31 min", "Under 1 min").
            subtitle={mockSubtitle(m)}
            // mockPct: a 0-question mock (a hand-edited backup) reads 0%, never NaN.
            accessibilityLabel={`${mockRowTitle(m)}, score ${mockPct(m)} percent, ${spokenMin(mockSubtitle(m))}`}
            // Mobile 1.16 (Elena's gap): a past mock opens the report with its domains shown.
            accessibilityHint="Opens your readiness report with this mock’s domains"
            onPress={() => router.push({ pathname: '/readiness', params: { mock: m.id } })}
            last={i === all.length - 1}
          />
        ))
      )}
    </>
  );
});
