/**
 * You — your growth rings, your numbers, your study tools.
 * Spec: DESIGN_SYSTEM.md §11 "You". The rings (one per domain, thicker =
 * heavier on the exam) replace the old per-domain bars; the legend lists
 * domains 1 → 5 like every other list (mobile 1.15), with one line saying
 * Domain 1 is the inner ring.
 * Mobile 1.17: no appearance switch here any more. It lives only in
 * Settings → Appearance → Theme (owner request: once Settings was tidy, the
 * copy on You was redundant). The gear beside the title opens Settings.
 * Mindset growth (Phase 5b): under the stats, only when the learner picks the
 * tempting runner-up less often than in their first weeks (engine/mindsetGrowth.ts).
 * Share progress: opens a preview of a share card (components/shareCard.tsx)
 * with one honest number (engine/shareCard.ts picks it).
 * Build F: "Milestones" and "Field notes" rows under Study tools, and ONE
 * quiet line the first time after the launch back-fill ("You'd already
 * earned 4 badges.") instead of a burst of celebrations.
 * Mobile 1.10: the row is "Badges" (the badge case), with a count only
 * (never "of N") and a small "new" dot until a newly earned badge has been
 * seen. Settings → Show badges off hides the row, the dot and the line.
 * Mobile 1.7: one "Help and feedback" row at the end (app/help.tsx).
 * Mobile 1.13: your plant in the header (opens Your plant), or a "Plant
 * yours" entry when there is none. Settings → Show my plant off hides both.
 * Mobile 1.16: "See your readiness report" under the rings; each Mock exams
 * row opens the report with that mock's domains shown, and the section has
 * a "See report" button.
 * Mobile 1.21 (decided 15 Oct 2026: an exam app leads with readiness): the
 * "Readiness" section comes first (its "See report" action, the rings, the
 * note), then the stats, THEN the plant (its row, or the "Plant yours" row).
 * Share progress is a row at the end of Study tools (it was a full-width
 * button mid-screen). The back-fill line is an InviteRow (the green rule is
 * the coach's voice only). Mock exams has no "See report" of its own any
 * more: the Readiness section's is the one, and each mock row opens it too.
 * Mobile 1.24 (honest readiness): under 30 answers in a domain its legend shows a
 * word (Building under 70, Steady 70 to 79, Strong 80 and up) instead of a number
 * that has not earned its precision; from 30 answers it is the number with "%" and
 * "latest tries" (engine/domainBand.ts). What went up since the last look is said
 * ONCE under the rings, not on every row. "Badges" and "Field notes" are one row.
 * Mobile 1.43 (board 3, owner decision "one ring"): the five domain rings and
 * their legend give way to ONE readiness ring (the range, with a notch at the
 * 80% study bar) and one row per area with a word, a bar with its 70% line and
 * the percent from 30 answers (components/youReadiness.tsx). The plant, the
 * badges and Study tools stay where they were.
 * Uplift Phase 6 (accounts, built OFF): in a cloud build only, the first row
 * of Help and feedback is "Sync across devices" (components/account.tsx).
 * With the flag off (every build today) nothing here changes.
 */
import { router } from 'expo-router';
import { memo, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { ringsChangeLine } from '../../components/journey';
import { AreaRows, ReadinessBlock } from '../../components/youReadiness';
import { FadeIn, useGrowth, useScreenFocus } from '../../components/motion';
import { creditSubtitle } from '../../components/help';
import { AccountSection } from '../../components/account';
import { BoardRow } from '../../components/board';
import { CLOUD } from '../../cloud/flag';
import { MindsetGrowthCard } from '../../components/moments';
import { BadgeIcon, Bookmark, ICON_STROKE, Leaf, LifeBuoy, NotebookPen, RotateCcw, Settings, Share2, Sprout } from '../../components/icons';
import { ShareProgressSheet } from '../../components/shareCard';
import { LivePlant } from '../../components/plant/LivePlant';
import { growthShort, plantCallName } from '../../engine/plant';
import { usePlantView } from '../../lib/plant';
import { Button, EmptyState, Enter, ICON_SIZE, InviteRow, Lead, ListRow, Row, Screen, ScreenTitle, Section, Stat, StatRow, T, Trail } from '../../components/ui';
import { pacingStats, pacingStatsLine, spokenMin } from '../../engine/pace';
import { mockSubtitle } from '../../components/readinessReport';
import { readinessRange } from '../../engine/readinessRange';
import { mockPct } from '../../engine/readinessReport';
import { BANDS_LINE, domainFigure, STUDY_BAR_LINE } from '../../engine/domainBand';
import { REVIEW_UNIT } from '../../engine/srs';
import { dayKey } from '../../engine/streak';
import { guardedStart, reviewSubtitle, startReview } from '../../lib/sessions';
import { caseEarnedCount } from '../../engine/badgeCatalog';
import { useNewBadge } from '../../lib/badges';
import { backfillLine, seeBackfill } from '../../lib/milestones';
import { useMindsetGrowth } from '../../lib/moments';
import { useReports } from '../../lib/useReports';
import { useActiveCert } from '../../lib/useActiveCert';
import { useProgress, type MockResult } from '../../store/progress';
import type { Certification } from '../../content/types';
import { useSettings } from '../../store/settings';
import { motion, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** When You's rings have finished growing (five arcs, outer first 60 ms apart, each over `grow`): the plant breathes after. */
const RINGS_SETTLED_MS = motion.dur.grow + 4 * motion.stagger.stat;

export default function You() {
  const { c } = useTheme();
  const { cert, readiness, progress, streak, dueCount } = useActiveCert();
  // One quiet line on pacing across timed mocks (engine/pace.ts; untimed mocks never count).
  const pacingLine = pacingStatsLine(pacingStats(progress.mocks));
  const range = readinessRange(cert, readiness);
  const answered = readiness.domains.reduce((s, d) => s + d.answered, 0);
  const mastered = readiness.domains.reduce((s, d) => s + d.mastered, 0);
  const openMistakes = Object.values(progress.mistakes).filter((m) => !m.resolved).length;
  // Mobile 1.24: a word below 30 answers in a domain, the number from 30 (engine/domainBand.ts).
  const figures = readiness.domains.map((d) => domainFigure(d.answered, Math.round(d.mastery * 100)));
  // Mobile 1.43: an area with some answers but under 30 is "thin" (its bar is lighter, "N answered" shows).
  const anyThin = figures.some((f) => f.banded);
  const growth = useMindsetGrowth(cert.id, progress);
  // Help and feedback (mobile 1.7): the row says so when a report's update hasn't been seen yet.
  const { dueItems: creditItems } = useReports();
  // Share card: the study days come from the saved streak (last 14 study days).
  const recentDays = useProgress((s) => s.streak.recentDays);
  // The day the sheet was opened (read in the tap handler, not during render). null = closed.
  const [shareDay, setShareDay] = useState<string | null>(null);
  // Mobile 1.10: every badge the case shows as earned (a kept key it doesn't show never counts), and the "new" dot.
  const badgeCount = caseEarnedCount(progress.milestones?.earned);
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

  // Mobile 1.9 motion, when You is on view: the rings grow from what you last
  // saw here (the first view of the day grows from 0), each domain that went
  // up gets a quiet "+4", and the numbers that went up roll. A fall is just
  // shown; coming back with nothing new shows everything still.
  const focused = useScreenFocus();
  const ringValues = readiness.domains.map((d) => (d.answered ? Math.round(d.mastery * 100) : 0));
  const rings = useGrowth(`you:rings:${cert.id}`, ringValues, { active: focused, firstOfDay: true });
  const rangeGrowth = useGrowth(`you:range:${cert.id}`, range.enough ? [range.low, range.high] : [], { active: focused, firstOfDay: true });
  const accuracy = answered ? Math.round((mastered / answered) * 100) : 0;
  const stats = useGrowth(`you:stats:${cert.id}`, [answered, accuracy, streak], { active: focused });
  // "+4" only for what went up since a real last look (not the day's count-up
  // from 0; a first rise from all zeros does count).
  const sinceLook = rings.play && rings.since === true;
  // What went up, per domain. A domain shown as a word only ("Building", under 30 answers) shows no number,
  // so it gets no "+12" either (mobile 1.24): only the domains that show a number are counted.
  const ups = ringValues.map((v, i) => (figures[i].banded ? 0 : v - rings.from[i]));
  const changeLine = sinceLook ? ringsChangeLine(cert, ups) : null;
  const statRoll = (k: number, from: string) => ({ play: stats.play, from, run: stats.run, delay: motion.dur.select + k * motion.stagger.stat });
  const plant = usePlantView();
  // The same object while the look is unchanged: the memoised plant skips re-rendering (performance, 1.15.x).
  const lookArt = plant.look?.art;
  const rowLook = useMemo(() => (lookArt ? { ...lookArt, keepsakes: [] } : undefined), [lookArt]);
  const { isDark } = useTheme();

  return (
    <Screen>
      <Enter i={0}>
        <ScreenTitle title="You" settings={() => router.push('/settings')} />
      </Enter>

      <Enter i={1}>
        {/* Readiness first (mobile 1.21): the section's action opens the report. */}
        <Section
          title="Readiness"
          style={{ marginTop: space.lg }}
          action={{
            label: 'See report',
            // WCAG 2.5.3: the spoken name starts with the visible words.
            accessibilityLabel: 'See report, your readiness report',
            hint: 'Your mock trend, each domain side by side, and what would raise your low end',
            onPress: () => router.push('/readiness'),
          }}
        />
        {/* Mobile 1.43 (owner decision, one ring): the overall range on ONE ring with a notch at the study bar,
            the range beside it, the study-bar line, then one row per area (components/youReadiness.tsx). */}
        <View style={{ marginTop: space.md }}>
          <ReadinessBlock range={range} growth={rangeGrowth} />
        </View>
        <T v="meta" style={{ marginTop: space.md }}>{STUDY_BAR_LINE}</T>
        <View style={{ marginTop: space.xl }}>
          <AreaRows cert={cert} readiness={readiness} ups={sinceLook ? ups : undefined} />
        </View>
        {/* What went up since the last look, said once under the areas (mobile 1.24); the rows' labels hold the figures. */}
        {changeLine && (
          <FadeIn rise={false} dur="select" delay={motion.dur.select + RINGS_SETTLED_MS}>
            <T v="caption" color={c.accentText} style={{ marginTop: space.md }}>{changeLine}</T>
          </FadeIn>
        )}
        {/* A number shows from 30 answers in an area: said once while any area is still thin. */}
        {anyThin && <T v="meta" style={{ marginTop: space.sm }}>{BANDS_LINE}</T>}
      </Enter>

      <Enter i={2} style={{ marginTop: space.xl }}>
        <StatRow>
          {[
            <Stat key="a" label="Answered" value={String(answered)} roll={statRoll(0, String(stats.from[0]))} />,
            answered ? (
              <Stat key="b" label="Accuracy" value={String(accuracy)} pct roll={statRoll(1, String(stats.from[1]))} />
            ) : (
              <Stat key="b" label="Accuracy" word="Not yet" spoken="not yet, answer a question first" />
            ),
            streak > 0 ? (
              <Stat
                key="c"
                label="Streak"
                value={String(streak)}
                unit={streak === 1 ? 'day' : 'days'}
                color={c.clay}
                roll={statRoll(2, String(stats.from[2]))}
              />
            ) : (
              // No streak yet (or a new start): an invitation, never a "0" that reads as a failure.
              <Stat key="c" label="Streak" word="Starts today" spoken="starts today, with your first answer" color={c.clay} />
            ),
          ]}
        </StatRow>
        {/* Two "Accuracy" stats in the app count different things (C8): say what this one counts.
            Mobile 1.39: only when the rings' "Percentages count your latest try…" line is not already
            on screen two blocks up (that one covers this percentage too); never both. */}
        {/* Mobile 1.43: the areas' caption ("Right on your latest tries") already says what the percents count. */}
        {/* Your plant, below the stats (decided 15 Oct 2026): it never leads a study screen. */}
        {(plant.plant || plant.shown) && (
          <View style={{ marginTop: space.lg }}>
            {plant.plant ? (
              // The plant opens Your plant; its growth reads in words beside it ("growth", never "stage").
              <ListRow
                lead={
                  // Mobile 1.14: one slow breath the first time You comes into view this
                  // session, once the rings have grown (one thing moves at a time), then still.
                  <LivePlant
                    species={plant.plant.species}
                    stage={plant.plant.growth}
                    organs={plant.scales}
                    quietLook={!plant.face}
                    resting={plant.resting}
                    size={64}
                    theme={isDark ? 'dark' : 'light'}
                    // At 64pt keepsakes would shrink the plant to fit them: the row shows the plant and its colours.
                    look={rowLook}
                    mood={plant.look?.mood}
                    breathe="you"
                    breatheDelay={rings.play ? RINGS_SETTLED_MS : 0}
                  />
                }
                title={plantCallName(plant.plant)}
                subtitle={growthShort(plant.plant.growth)}
                accessibilityLabel={`${plant.label} Your plant.`}
                accessibilityHint="Opens your plant"
                onPress={() => router.push('/plant')}
                last
              />
            ) : plant.shown ? (
              <ListRow
                icon={<Sprout size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                title="Plant yours"
                subtitle="Grows only with your study"
                onPress={() => router.push('/plant-pick')}
                last
              />
            ) : null}
          </View>
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
          openMistakes={openMistakes}
          saved={progress.bookmarks.length}
          badgesHidden={badgesHidden}
          newBadge={newBadge}
          badgeCount={badgeCount}
          mocks={progress.mocks}
          pacingLine={pacingLine}
          creditItems={creditItems}
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

/**
 * You's lower half: Study tools, Mock exams, Help and the trademark line.
 * Its props are primitives and the store's own arrays, so it re-renders only
 * when one of them changes (never on focus).
 */
const YouLists = memo(function YouLists({
  cert,
  summary,
  dueCount,
  openMistakes,
  saved,
  badgesHidden,
  newBadge,
  badgeCount,
  mocks,
  pacingLine,
  creditItems,
  onShare,
}: {
  /** Opens the share sheet for the day it was tapped. */
  onShare: (day: string) => void;
  cert: Certification;
  summary: string | null;
  dueCount: number;
  openMistakes: number;
  saved: number;
  badgesHidden: boolean;
  newBadge: boolean;
  badgeCount: number;
  mocks: readonly MockResult[];
  pacingLine: string | null;
  creditItems: number;
}) {
  const { c } = useTheme();
  const icon = (G: typeof Settings) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;
  // A mini mock is a third of the exam, as on Practice.
  const miniMock = Math.round(cert.exam.questions / 3);
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
        <Section title="Study tools" style={{ marginTop: space.xl }} />
        {/* The review queue: same word ("due") and same cap line as Today and Practice. */}
        <ListRow
          icon={icon(RotateCcw)}
          title="Questions to revisit"
          subtitle={reviewSubtitle(dueCount)}
          trailing={dueCount ? <Trail value={String(dueCount)} unit={REVIEW_UNIT} /> : undefined}
          accessibilityLabel={`Questions to revisit, ${dueCount ? `${dueCount} ${REVIEW_UNIT}. ${reviewSubtitle(dueCount)}` : 'all caught up'}`}
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
          trailing={saved ? <Trail value={String(saved)} unit="saved" /> : undefined}
          accessibilityLabel={`Saved questions, ${saved} saved`}
          onPress={() => router.push('/saved')}
        />
        {/* One row for both (mobile 1.24): the badge case has the Field notes shelf and its
            "See game levels" link. With badges hidden in Settings, only Field notes remains. */}
        {badgesHidden ? (
          <ListRow
            icon={icon(Leaf)}
            title="Field notes"
            subtitle="Your level in each game"
            accessibilityLabel="Field notes. Your level in each game"
            onPress={() => router.push('/field-notes')}
          />
        ) : (
          <ListRow
            icon={icon(BadgeIcon)}
            title="Badges and field notes"
            subtitle="What you’ve mastered, and your level in each game"
            trailing={
              <Row gap={space.sm}>
                {/* A badge earned since the case was last opened: a dot (shape, and spoken), never a number. */}
                {newBadge && <View testID="new-badge-dot" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} />}
                {badgeCount ? <Trail value={String(badgeCount)} unit="earned" /> : null}
              </Row>
            }
            accessibilityLabel={`Badges and field notes${newBadge ? ', new badge' : ''}, ${badgeCount ? `${badgeCount} earned` : 'none yet'}. What you've mastered, and your level in each game`}
            onPress={() => router.push('/milestones')}
          />
        )}
        {/* Share progress as a row (it was a full-width button mid-screen). */}
        <ListRow
          icon={icon(Share2)}
          title="Share progress"
          subtitle="A card with one honest number"
          accessibilityHint="Opens a preview of a progress card you can share"
          onPress={() => onShare(dayKey(Date.now()))}
          last
        />

        <Section title="Mock exams" />
        <MockHistory mocks={mocks} miniMock={miniMock} />
        {/* Pacing across timed mocks only (untimed ones are left out). */}
        {pacingLine && <T v="meta" style={{ marginTop: space.md }}>{pacingLine}</T>}

        {/* Cloud builds only: its own "Account" section, "Sync across devices" / "Account and sync" (one of the two ways in). */}
        {CLOUD && <AccountSection />}
        {/* One entry to Help and feedback (mobile 1.7); the full list is on that screen. */}
        <Section title="Help and feedback" />
        {/* Cloud builds only: the feedback board (Phase 8). */}
        {CLOUD && <BoardRow />}
        <ListRow
          icon={icon(LifeBuoy)}
          title="Get help or send feedback"
          subtitle={creditItems ? creditSubtitle(creditItems) : 'Common questions, reports and what’s new'}
          onPress={() => router.push('/help')}
          last
        />
        <T v="meta" center style={{ marginTop: space.xl }}>{cert.trademarkNotice}</T>
    </>
  );
});

/** The mock history (its own memo: an answer in a session changes the review count above it, never the mocks). */
const MockHistory = memo(function MockHistory({ mocks, miniMock }: { mocks: readonly MockResult[]; miniMock: number }) {
  return (
    <>
      {mocks.length === 0 ? (
        <>
          <EmptyState compact title="No mocks yet" body="A mini mock shows how the exam feels. Start one whenever you like." />
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
            title={`${m.total} questions`}
            // Extra time and untimed mocks are labelled in history (older results were standard).
            // The time in the same words as Results ("3 h 31 min", "Under 1 min").
            subtitle={mockSubtitle(m)}
            // mockPct: a 0-question mock (a hand-edited backup) reads 0%, never NaN.
            accessibilityLabel={`${m.total} questions, score ${mockPct(m)} percent, ${spokenMin(mockSubtitle(m))}`}
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
