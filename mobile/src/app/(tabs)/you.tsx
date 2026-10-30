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
 * Mobile 1.44 (the owner's "Version 3"): "Your study profile" comes first,
 * above Readiness (components/studyProfile.tsx): the leaf initial, the name
 * (or "Your study profile" with "Add your name"), "Studying for CISA since …",
 * the exam date and daily time, and the starting point. Built only from the
 * learner's own choices and study; one button that opens Settings → Your name.
 * The name is used here and in Today's greeting only (display-name.test.ts).
 * Uplift Phase 6 (accounts, built OFF): in a cloud build only, the first row
 * of Help and feedback is "Sync across devices" (components/account.tsx).
 * With the flag off (every build today) nothing here changes.
 * Mobile 1.51 (Field Guide, the owner's signature pick; DESIGN_SYSTEM.md §21): a running head
 * ("Field record · You", Settings on its right) over the study profile; readiness as a scale bar
 * with the words "a study estimate" built in; the areas as one line of growth each on ONE scale in
 * a plate (Fig. 5, with its key); then the Herbarium row (the badges' way in, with the newest
 * pressed specimens); the stats are ruled label rows (Answered, Accuracy, Streak), not tiles.
 */
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { ringsChangeLine } from '../../components/journey';
import { AreaRows, ReadinessBlock } from '../../components/youReadiness';
import { FieldText, KeyList, RunningHead, SpecimenLabel, SpecimenRow } from '../../components/fieldguide';
import { HerbariumEntry } from '../../components/herbarium';
import { lastPressed } from '../../engine/fieldGuide';
import { FadeIn, useGrowth, useScreenFocus } from '../../components/motion';
import { creditSubtitle } from '../../components/help';
import { AccountSection } from '../../components/account';
import { BoardRow } from '../../components/board';
import { CLOUD } from '../../cloud/flag';
import { MindsetGrowthCard } from '../../components/moments';
import { BadgeIcon, ICON_STROKE, Settings, Sprout } from '../../components/icons';
import { ShareProgressSheet } from '../../components/shareCard';
import { LivePlant } from '../../components/plant/LivePlant';
import { growthShort, plantCallName } from '../../engine/plant';
import { usePlantView } from '../../lib/plant';
import { Button, EmptyState, Enter, ICON_SIZE, InviteRow, Lead, ListRow, Screen, Section, T } from '../../components/ui';
import { pacingStats, pacingStatsLine, spokenMin } from '../../engine/pace';
import { mockSubtitle } from '../../components/readinessReport';
import { readinessRange } from '../../engine/readinessRange';
import { mockPct } from '../../engine/readinessReport';
import { BAND_MIN_ANSWERS, BANDS_LINE, domainFigure, STUDY_BAR_LINE } from '../../engine/domainBand';
import { dayKey } from '../../engine/streak';
import { guardedStart, reviewSubtitle, startReview } from '../../lib/sessions';
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
import { motion, space } from '../../theme/tokens';
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

/** The herbarium (the route keeps its old name, so links and Results still work). */
const openHerbarium = () => router.push('/milestones');

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
  // Mobile 1.24: a word below 30 answers in a domain, the number from 30 (engine/domainBand.ts).
  const figures = readiness.domains.map((d) => domainFigure(d.answered, Math.round(d.mastery * 100)));
  // Mobile 1.43: an area with some answers but under 30 is "thin" (its bar is lighter, "N answered" shows).
  // UX review P3: any area under 30 answers (a brand-new learner's five too) shows the bands line.
  const anyThin = readiness.domains.some((d) => d.answered < BAND_MIN_ANSWERS);
  const growth = useMindsetGrowth(cert.id, progress);
  // Help and feedback (mobile 1.7): the row says so when a report's update hasn't been seen yet.
  const { dueItems: creditItems } = useReports();
  // Share card: the study days come from the saved streak (last 14 study days).
  const recentDays = useProgress((s) => s.streak.recentDays);
  // The day the sheet was opened (read in the tap handler, not during render). null = closed.
  const [shareDay, setShareDay] = useState<string | null>(null);
  // Mobile 1.10: every badge the case shows as earned (a kept key it doesn't show never counts), and the "new" dot.
  const badgeCount = caseEarnedCount(progress.milestones?.earned);
  // Mobile 1.51: the herbarium row's newest specimens, from the saved keys alone (worked out again only when they change).
  const earnedKeys = progress.milestones?.earned;
  const pressed = useMemo(() => lastPressed(earnedKeys, cert.domains), [earnedKeys, cert.domains]);
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

  return (
    <Screen>
      <Enter i={0}>
        {/* Mobile 1.51 (Field Guide): the running head says where you are; Settings is its one action. */}
        <RunningHead
          section="Field record · You"
          action={{
            label: 'Settings',
            hint: 'Exam date, reminders and more',
            onPress: () => router.push('/settings'),
            icon: (col) => <Settings size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />,
          }}
        />
        {/* Mobile 1.44: the first block, on the paper. It opens the one name editor. */}
        <View style={{ marginTop: space.sm }}>
          <StudyProfile ref={profileRef} lines={profile} initial={nameInitial(displayName)} onPress={openNameEditor} />
        </View>
      </Enter>

      <Enter i={1}>
        {/* Readiness first (mobile 1.21): a tracked kicker, and its action opens the report. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: space.lg }}>
          {/* One kicker word on You and Today (UX review O9). */}
          <FieldText v="head" accessibilityRole="header">Estimated readiness</FieldText>
          <Button
            kind="ghost"
            label="See report"
            // WCAG 2.5.3: the spoken name starts with the visible words.
            accessibilityLabel="See report, your readiness report"
            accessibilityHint="Your mock trend, each domain side by side, and what would raise your low end"
            onPress={() => router.push('/readiness')}
            style={{ marginRight: -space.sm }}
          />
        </View>
        {/* Mobile 1.51 (Field Guide): the range on a scale bar with a tick at the study bar and its words
            built in, the study-bar line, then the areas on one scale in a plate (components/youReadiness.tsx). */}
        <ReadinessBlock range={range} growth={rangeGrowth} />
        <T v="meta" style={{ marginTop: space.md }}>{STUDY_BAR_LINE}</T>
        <View style={{ marginTop: space.xl }}>
          <AreaRows cert={cert} readiness={readiness} ups={sinceLook ? ups : undefined} play={sinceLook ? 'growth' : rings.play} run={rings.run} />
        </View>
        {/* What went up since the last look, said once under the areas (mobile 1.24); the rows' labels hold the figures. */}
        {changeLine && (
          <FadeIn rise={false} dur="select" delay={motion.dur.select + RINGS_SETTLED_MS}>
            <T v="caption" color={c.accentText} style={{ marginTop: space.md }}>{changeLine}</T>
          </FadeIn>
        )}
        {/* A number shows from 30 answers in an area: said once while any area is still thin. */}
        {anyThin && <T v="meta" style={{ marginTop: space.sm }}>{BANDS_LINE}</T>}
        {/* Mobile 1.51: the badges' way in, right under the plate (the herbarium; Settings → Show badges off hides it). */}
        {!badgesHidden && (
          <View style={{ marginTop: space.lg }}>
            <HerbariumEntry pressed={pressed} count={badgeCount} newBadge={newBadge} onPress={openHerbarium} />
          </View>
        )}
      </Enter>

      <Enter i={2} style={{ marginTop: space.xl }}>
        {/* Mobile 1.51 (Field Guide): ruled label rows, a tracked key and a serif value, never tiles. */}
        <SpecimenLabel testID="you-stats">
          <SpecimenRow label="Answered" value={String(answered)} roll={statRoll(0, String(stats.from[0]))} />
          {answered ? (
            <SpecimenRow label="Accuracy" value={String(accuracy)} pct roll={statRoll(1, String(stats.from[1]))} />
          ) : (
            <SpecimenRow label="Accuracy" word="Not yet" spoken="not yet, answer a question first" />
          )}
          {streak > 0 ? (
            <SpecimenRow label="Streak" value={String(streak)} unit={streak === 1 ? 'day' : 'days'} color={c.clay} roll={statRoll(2, String(stats.from[2]))} />
          ) : (
            // No streak yet (or a new start): an invitation, never a "0" that reads as a failure.
            <SpecimenRow label="Streak" word="Starts today" spoken="starts today, with your first answer" color={c.clay} />
          )}
        </SpecimenLabel>
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
          saved={progress.bookmarks.length}
          badgesHidden={badgesHidden}
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
 * You's lower half: Study tools, Mock exams, Help and the trademark line.
 * Its props are primitives and the store's own arrays, so it re-renders only
 * when one of them changes (never on focus).
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
  onShare,
}: {
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
        <Section variant="head" title="Study tools" style={{ marginTop: space.xl }} />
        {/* Premium round 2 (Field Guide foundation): an index list, the old subtitle as each row's
            kicker and the saved count at the end of its leader; spoken as the rows were. */}
        <KeyList
          testID="study-tools"
          items={[
            {
              key: 'review',
              // The review set: the same line as Practice ("16 ready today · oldest first"). Premium pass 4.6:
              // the kicker names the set a tap starts; no trailing queue total.
              kicker: reviewSubtitle(dueCount),
              title: 'Questions to revisit',
              spoken: `Questions to revisit, ${dueCount ? reviewSubtitle(dueCount).replace(' · ', ', ') : 'all caught up'}`,
              onPress: () => guardedStart(() => startReview(cert.id), () => router.push('/session'), () => router.push('/caught-up')),
            },
            {
              key: 'mistakes',
              // Premium pass 4.6: what the journal shows, not a count of open misses (a total that only grows).
              kicker: 'Your pattern first, then each miss',
              title: 'Mistake journal',
              spoken: 'Mistake journal, your pattern first, then each miss',
              onPress: () => router.push('/mistakes'),
            },
            {
              key: 'saved',
              kicker: 'Your own revision set',
              title: 'Saved questions',
              right: saved ? `${saved} saved` : undefined,
              spoken: `Saved questions, ${saved} saved`,
              onPress: () => router.push('/saved'),
            },
            // Mobile 1.51: the badges' way in is the Herbarium row under the areas (it holds the Field notes
            // sheet and its "See game levels" link). With badges hidden in Settings, Field notes has its own row here.
            ...(badgesHidden
              ? [{ key: 'field-notes', kicker: 'Your level in each game', title: 'Field notes', spoken: 'Field notes. Your level in each game', onPress: () => router.push('/field-notes') }]
              : []),
            // Share progress as a row (it was a full-width button mid-screen).
            {
              key: 'share',
              kicker: 'A card with one honest number',
              title: 'Share progress',
              spoken: 'Share progress, A card with one honest number',
              hint: 'Opens a preview of a progress card you can share',
              onPress: () => onShare(dayKey(Date.now())),
            },
          ]}
        />

        <Section variant="head" title="Mock exams" />
        <MockHistory mocks={mocks} miniMock={miniMock} />
        {/* Pacing across timed mocks only (untimed ones are left out). */}
        {pacingLine && <T v="meta" style={{ marginTop: space.md }}>{pacingLine}</T>}

        {/* Cloud builds only: its own "Account" section, "Sync across devices" / "Account and sync" (one of the two ways in). */}
        {CLOUD && <AccountSection />}
        {/* One entry to Help and feedback (mobile 1.7); the full list is on that screen. */}
        <Section variant="head" title="Help and feedback" />
        {/* Cloud builds only: the feedback board (Phase 8). */}
        {CLOUD && <BoardRow />}
        {/* Premium round 2 (Field Guide foundation): one index row, its line as the kicker (no icon circle). */}
        <KeyList
          numbered={false}
          testID="you-help"
          items={[
            {
              key: 'help',
              kicker: creditItems ? creditSubtitle(creditItems) : 'Common questions, reports and what’s new',
              title: 'Get help or send feedback',
              spoken: `Get help or send feedback, ${creditItems ? creditSubtitle(creditItems) : 'Common questions, reports and what’s new'}`,
              onPress: () => router.push('/help'),
            },
          ]}
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
