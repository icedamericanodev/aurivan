/**
 * You — your growth rings, your numbers, your study tools.
 * Spec: DESIGN_SYSTEM.md §11 "You". The rings (one per domain, thicker =
 * heavier on the exam) replace the old per-domain bars; the legend lists
 * domains outside-in so it matches what you see.
 * The appearance switch sits at the top (owner request) and shares its
 * setting with Settings → Appearance.
 * Mindset growth (Phase 5b): under the stats, only when the learner picks the
 * tempting runner-up less often than in their first weeks (engine/mindsetGrowth.ts).
 * Share progress: opens a preview of a share card (components/shareCard.tsx)
 * with one honest number (engine/shareCard.ts picks it).
 * Build F: "Milestones" and "Field notes" rows under Study tools, and ONE
 * quiet line the first time after the launch back-fill ("You'd already
 * earned 4 milestones.") instead of a burst of celebrations.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DomainRings, ringsSpoken } from '../../components/journey';
import { MindsetGrowthCard } from '../../components/moments';
import { Bookmark, ICON_STROKE, Leaf, MilestoneIcon, NotebookPen, RotateCcw, Settings, Share2 } from '../../components/icons';
import { ShareProgressSheet } from '../../components/shareCard';
import { ThemeSwitch } from '../../components/themeSwitch';
import { BigNum, Button, EmptyState, Enter, ICON_SIZE, Lead, ListRow, Screen, ScreenTitle, Section, Stat, StatRow, T, Trail } from '../../components/ui';
import { pacingStats, pacingStatsLine, TIMING_LABEL } from '../../engine/pace';
import { rangeLabel, rangeSpoken, readinessRange } from '../../engine/readinessRange';
import { REVIEW_UNIT } from '../../engine/srs';
import { dayKey } from '../../engine/streak';
import { guardedStart, reviewSubtitle, startReview } from '../../lib/sessions';
import { shortDate } from '../../lib/format';
import { MILESTONES } from '../../engine/milestones';
import { backfillLine } from '../../lib/milestones';
import { useMindsetGrowth } from '../../lib/moments';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress } from '../../store/progress';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const MILESTONE_IDS = new Set<string>(MILESTONES.map((b) => b.id));

export default function You() {
  const { c } = useTheme();
  const { cert, readiness, progress, streak, dueCount } = useActiveCert();
  // One quiet line on pacing across timed mocks (engine/pace.ts; untimed mocks never count).
  const pacingLine = pacingStatsLine(pacingStats(progress.mocks));
  const range = readinessRange(cert, readiness);
  const answered = readiness.domains.reduce((s, d) => s + d.answered, 0);
  const mastered = readiness.domains.reduce((s, d) => s + d.mastered, 0);
  const openMistakes = Object.values(progress.mistakes).filter((m) => !m.resolved).length;
  const values = readiness.domains.map((d) => (d.answered ? d.mastery : null));
  const growth = useMindsetGrowth(cert.id, progress);
  // Share card: the study days come from the saved streak (last 14 study days).
  const recentDays = useProgress((s) => s.streak.recentDays);
  // The day the sheet was opened (read in the tap handler, not during render). null = closed.
  const [shareDay, setShareDay] = useState<string | null>(null);
  const icon = (G: typeof Settings) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;
  // Build F: milestones earned (badges, not leaves) and the one-time back-fill line.
  const earnedMarks = Object.keys(progress.milestones?.earned ?? {});
  const milestoneCount = new Set(earnedMarks.map((k) => k.split(':')[0]).filter((b) => MILESTONE_IDS.has(b))).size;
  const backfill = progress.milestones?.backfill;
  const summary = backfill && !backfill.seen ? backfillLine(backfill.count) : null;

  return (
    <Screen>
      <Enter i={0}>
        <ScreenTitle title="You" settings={() => router.push('/settings')} />
        <View style={{ marginTop: space.md }}>
          <ThemeSwitch />
        </View>
      </Enter>

      <Enter i={1} style={{ marginTop: space.xl }}>
        <DomainRings
          cert={cert}
          values={values}
          accessibilityLabel={`Estimated readiness ${rangeSpoken(range)}. ${ringsSpoken(cert, values)}.`}
          center={
            range.enough ? (
              <View style={{ alignItems: 'center' }}>
                <BigNum value={rangeLabel(range)} pct size={20} />
                {/* "estimate", not "ready": the range is a study estimate, not a prediction. */}
                <T v="caption" color={c.ink2}>estimate</T>
              </View>
            ) : (
              <T v="caption" color={c.ink2} center style={{ maxWidth: 72 }}>Not enough data yet</T>
            )
          }
        />
        <T v="meta" style={{ marginTop: 14 }}>Rings read from the outside in. Thicker rings weigh more on the exam.</T>
      </Enter>

      <Enter i={2} style={{ marginTop: 26 }}>
        <StatRow>
          {[
            <Stat key="a" value={String(answered)} label="answered" />,
            <Stat key="b" value={answered ? String(Math.round((mastered / answered) * 100)) : '–'} pct={answered > 0} label="accuracy" />,
            <Stat key="c" value={String(streak)} label="day streak" color={c.clay} />,
          ]}
        </StatRow>
        <Button
          kind="secondary"
          label="Share progress"
          onPress={() => setShareDay(dayKey(Date.now()))}
          accessibilityHint="Opens a preview of a progress card you can share"
          icon={(col) => <Share2 size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
          iconLeading
          style={{ marginTop: space.xl }}
        />
        {growth.show && (
          <View style={{ marginTop: space.xl }}>
            <MindsetGrowthCard earlyIn10={growth.earlyIn10} lateIn10={growth.lateIn10} line={growth.line} spoken={growth.spoken} />
          </View>
        )}
      </Enter>

      <Enter i={3}>
        {summary && (
          // Once, after the launch back-fill: one calm line, not a burst of moments.
          <View accessible accessibilityLabel={`${summary} From your study so far.`} style={{ marginTop: space.xl, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
            <T v="caption" color={c.accentText}>From your study so far</T>
            <T v="quote" style={{ marginTop: 4 }}>{summary}</T>
            <Button kind="ghost" label="See your milestones" onPress={() => router.push('/milestones')} style={{ alignSelf: 'flex-start' }} />
          </View>
        )}
        <Section title="Study tools" style={{ marginTop: space.xl }} />
        {/* The review queue: same word ("due") and same cap line as Today and Practice. */}
        <ListRow
          icon={icon(RotateCcw)}
          title="Spaced review"
          subtitle={reviewSubtitle(dueCount)}
          trailing={dueCount ? <Trail value={String(dueCount)} unit={REVIEW_UNIT} /> : undefined}
          accessibilityLabel={`Spaced review, ${dueCount ? `${dueCount} ${REVIEW_UNIT}. ${reviewSubtitle(dueCount)}` : 'all caught up'}`}
          onPress={() => guardedStart(() => startReview(cert.id), () => router.push('/session'), () => router.push('/caught-up'))}
        />
        <ListRow
          icon={icon(NotebookPen)}
          title="Mistake journal"
          // "open" = logged misses not yet fixed: a different list from the review queue.
          subtitle="Misses not yet fixed, tagged"
          trailing={openMistakes ? <Trail value={String(openMistakes)} unit="open" /> : undefined}
          accessibilityLabel={`Mistake journal, ${openMistakes} open`}
          onPress={() => router.push('/mistakes')}
        />
        <ListRow
          icon={icon(Bookmark)}
          title="Saved questions"
          subtitle="Your own revision set"
          trailing={progress.bookmarks.length ? <Trail value={String(progress.bookmarks.length)} unit="saved" /> : undefined}
          accessibilityLabel={`Saved questions, ${progress.bookmarks.length} saved`}
          onPress={() => router.push('/saved')}
        />
        <ListRow
          icon={icon(MilestoneIcon)}
          title="Milestones"
          subtitle="What you’ve mastered, and what’s next"
          trailing={milestoneCount ? <Trail value={String(milestoneCount)} unit="earned" /> : undefined}
          accessibilityLabel={`Milestones, ${milestoneCount} earned. What you've mastered, and what's next`}
          onPress={() => router.push('/milestones')}
        />
        <ListRow
          icon={icon(Leaf)}
          title="Field notes"
          subtitle="Game levels and skill leaves"
          accessibilityLabel="Field notes. Game levels and skill leaves"
          onPress={() => router.push('/field-notes')}
          last
        />

        <Section title="Mock exams" />
        {progress.mocks.length === 0 ? (
          <EmptyState compact title="No mocks yet" body="Today suggests one when your rings are ready for it." />
        ) : (
          progress.mocks.slice(0, 10).map((m, i, all) => (
            <ListRow
              key={m.id}
              lead={<Lead value={`${Math.round((m.correct / m.total) * 100)}%`} unit="score" />}
              title={`${m.total} questions`}
              // Extra time and untimed mocks are labelled in history (older results were standard).
              subtitle={`${shortDate(m.finishedAt)} · ${m.minutesUsed} min${m.timing && m.timing !== 'standard' ? ` · ${TIMING_LABEL[m.timing].toLowerCase()}` : ''}`}
              last={i === all.length - 1}
            />
          ))
        )}
        {/* Pacing across timed mocks only (untimed ones are left out). */}
        {pacingLine && <T v="meta" style={{ marginTop: space.md }}>{pacingLine}</T>}
        <T v="meta" center style={{ marginTop: space.xl }}>{cert.trademarkNotice}</T>
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
            issuer: cert.issuer,
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
