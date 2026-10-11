/**
 * Badges (You → Badges; the route keeps its old name, so links and Results
 * still work). Mobile 1.10, badges_game.md §4: the badge collection.
 *
 * Plain English for the founder:
 * - "Next for your exam": the badge that helps the exam most right now (a
 *   heavy domain's gap, then the mocks, then long-term memory), and the two
 *   nearest, each with "Study for this". Never after the exam date.
 * - Shelves, one per set, in journey order, each with its OWN "2 of 3" (no
 *   grand total: that would pull study to whichever badge is cheapest).
 *   Then Moments (not counted) and Field notes (the game skills, counted on
 *   their own).
 * - Each badge is a medallion: earned ones are struck in enamel and metal;
 *   the rest show their art as a stitched outline, how close you are, and
 *   their exact rule one tap away. Nothing is hidden, nothing is taken away.
 * - All / Earned / Not yet, and a Sort (by set, recently earned, closest,
 *   effort), kept on this phone.
 * - Badges earned since the last visit press in (the first three, 80 ms
 *   apart); "Next" bars grow from where you last saw them. Nothing idles.
 * - In the last three weeks before the exam it opens at Exam Day.
 * - Large text: two columns at ×1.3, a list at ×1.6.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BadgeCell, BadgeListRow, BadgeSheet, NextPanel, ShelfHeader } from '../components/badges';
import { useGrowth } from '../components/motion';
import { Button, Chip, ChipRow, PushedHeader, RadioRow, T, useFontScale } from '../components/ui';
import {
  CASE_SORTS,
  nextForExam,
  passesFilter,
  setCountLine,
  sortMarks,
  type CaseFilter,
  type CaseMark,
  type CaseSort,
  type SetId,
  type SetView,
  type StudyTarget,
} from '../engine/badgeCatalog';
import { caseStage, seeCase, studyFor, weakestDomain } from '../lib/badges';
import { backfillLine, badgeCase, seeBackfill } from '../lib/milestones';
import { useActiveCert } from '../lib/useActiveCert';
import { useSeen } from '../store/seen';
import { LARGE_TEXT, motion, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const SORT_LABEL: Record<CaseSort, string> = { set: 'By set', recent: 'Recently earned', closest: 'Closest', effort: 'Effort' };
const SORT_WHY: Record<CaseSort, string> = {
  set: 'Shelves in the order of your journey.',
  recent: 'Newest first.',
  closest: 'Not yet earned, nearest first.',
  effort: 'Fewest days needed first.',
};
const FILTERS: { id: CaseFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'earned', label: 'Earned' },
  { id: 'open', label: 'Not yet' },
];
/** The final three weeks: the case opens at Exam Day. */
const OPEN_AT_EXAM_DAY = 21;

export default function Badges() {
  const { c } = useTheme();
  const { cert, progress, readiness, daysLeft, dueCount } = useActiveCert();
  const fontScale = useFontScale();
  const { width: screenW } = useWindowDimensions();
  const { marks, sets, mastery } = useMemo(() => badgeCase(cert.id, progress), [cert.id, progress]);
  const stage = caseStage(cert.id, progress, readiness, daysLeft);
  const after = stage === 'afterExam';
  const next = useMemo(
    // Slot 1 reads the same mastery as Firm Footing (answers without Coach me, outside games).
    () => nextForExam({ marks, stage, daysLeft, mastery }),
    [marks, stage, daysLeft, mastery],
  );
  const weakest = weakestDomain(mastery);

  // Badges earned since the case was last opened press in, then it counts as seen.
  const [seenAt] = useState(() => useSeen.getState().caseSeen[cert.id]);
  useEffect(() => seeCase(cert.id), [cert.id, progress.milestones?.earned]);
  const fresh = useMemo(
    () =>
      seenAt === undefined
        ? []
        : marks
            .filter((m) => m.earnedAt !== undefined && m.earnedAt > seenAt)
            .sort((a, b) => a.earnedAt! - b.earnedAt!)
            .slice(0, motion.stagger.maxLeaves)
            .map((m) => m.key),
    [marks, seenAt],
  );
  const pressAt = (key: string) => {
    const k = fresh.indexOf(key);
    return k < 0 ? undefined : motion.dur.screen + k * motion.stagger.leaf;
  };
  // "Next" bars grow from where they were last seen (per badge, so a slot that changes never borrows another's).
  const shown = [...(next.best ? [next.best] : []), ...next.nearest];
  const bars = useGrowth(`badges:next:${cert.id}:${shown.map((m) => m.key).join('|')}`, shown.map((m) => Math.round(m.progress * 100)));
  const barFrom = (key: string) => {
    const i = shown.findIndex((m) => m.key === key);
    return bars.play && i >= 0 ? bars.from[i] / 100 : undefined;
  };

  // The back-fill summary shows on the first visit after it ran, then never again.
  const backfill = progress.milestones?.backfill;
  const [summary] = useState(() => (backfill && !backfill.seen ? backfillLine(backfill.count) : null));
  useEffect(() => {
    if (backfill && !backfill.seen) seeBackfill(cert.id);
  }, [backfill, cert.id]);

  // Filter (this visit) and Sort (kept on this phone).
  const [filter, setFilter] = useState<CaseFilter>('all');
  const savedSort = useSeen((s) => s.badgeSort);
  const sort: CaseSort = CASE_SORTS.includes(savedSort as CaseSort) ? (savedSort as CaseSort) : 'set';
  const [sortOpen, setSortOpen] = useState(false);
  const sortButton = useRef<View>(null);

  // The sheet: one badge's details.
  const [open, setOpen] = useState<string | null>(null);
  const openMark = open ? marks.find((m) => m.key === open) : undefined;
  const setOf = (m: CaseMark) => sets.find((s) => s.info.id === m.set)!;
  const setName = (m: CaseMark) => setOf(m).info.name;
  const study = (t: StudyTarget) => {
    setOpen(null);
    studyFor(t, cert.id, dueCount);
  };

  // Grid: three columns (88pt medallions), two at ×1.3 text, a list at ×1.6.
  const list = fontScale >= 1.6;
  const cols = fontScale >= LARGE_TEXT ? 2 : 3;
  const inner = Math.min(screenW, 560) - space.gutter * 2;
  const cellW = Math.floor((inner - (cols - 1) * space.sm) / cols);
  const size = cols === 3 ? Math.min(88, cellW - 16) : Math.min(104, cellW - 24);

  // In the last three weeks, open at Exam Day (by set only, once).
  const scroll = useRef<ScrollView>(null);
  const [examDayY, setExamDayY] = useState<number | null>(null);
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || examDayY === null || sort !== 'set' || daysLeft === null || daysLeft < 0 || daysLeft > OPEN_AT_EXAM_DAY) return;
    jumped.current = true;
    scroll.current?.scrollTo({ y: Math.max(0, examDayY - space.lg), animated: false });
  }, [examDayY, sort, daysLeft]);

  const renderMarks = (items: CaseMark[], flat: boolean) =>
    list ? (
      <View>
        {items.map((m, k) => (
          <BadgeListRow
            key={m.key}
            mark={m}
            setName={setName(m)}
            domains={cert.domains}
            onPress={() => setOpen(m.key)}
            press={pressAt(m.key)}
            last={k === items.length - 1}
            showSet={flat}
            showProgress={!after}
          />
        ))}
      </View>
    ) : (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.sm, marginTop: space.sm }}>
        {items.map((m) => (
          <BadgeCell
            key={m.key}
            mark={m}
            setName={setName(m)}
            width={cellW}
            size={size}
            domains={cert.domains}
            onPress={() => setOpen(m.key)}
            press={pressAt(m.key)}
            showSet={flat}
            showProgress={!after}
          />
        ))}
      </View>
    );

  const shelf = (s: SetView) => {
    const items = s.marks.filter((m) => passesFilter(m, filter));
    const id: SetId = s.info.id;
    return (
      <View key={id}>
        {id === 'fieldNotes' && <View style={{ height: 1, backgroundColor: c.line, marginTop: space.section }} />}
        <ShelfHeader set={s} line={setCountLine(s)} onLayout={id === 'examDay' ? setExamDayY : undefined} />
        {id === 'fieldNotes' && (
          <Button kind="ghost" label="See game levels ›" onPress={() => router.push('/field-notes')} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
        )}
        {items.length > 0 ? (
          renderMarks(items, false)
        ) : (
          <T v="meta" color={c.ink2} style={{ marginTop: space.sm }}>
            {filter === 'earned' ? 'Nothing earned here yet.' : 'All earned.'}
          </T>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxl }}>
        <PushedHeader title="Badges" onBack={() => router.back()} />
        <T v="meta" style={{ marginTop: space.sm }}>Earned by what you’ve mastered. Once earned, a badge stays.</T>

        {summary && (
          <View accessible accessibilityLabel={`${summary} From your study before badges arrived.`} style={{ marginTop: space.lg, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
            <T v="caption" color={c.accentText}>From your study so far</T>
            <T v="quote" style={{ marginTop: 4 }}>{summary}</T>
          </View>
        )}

        {/* After the exam the case is a keepsake album: no goals, no bars. */}
        {!after && (
          <NextPanel
            best={next.best}
            nearest={next.nearest}
            setName={setName}
            domains={cert.domains}
            dueCount={dueCount}
            weakest={weakest}
            onOpen={(m) => setOpen(m.key)}
            onStudy={study}
            barFrom={barFrom}
          />
        )}

        <View style={{ marginTop: space.xl }}>
          <ChipRow>
            {FILTERS.map((f) => (
              <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} accessibilityLabel={`Show ${f.label.toLowerCase()} badges`} />
            ))}
          </ChipRow>
          <View ref={sortButton} style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.xs }}>
            <Button
              kind="ghost"
              label={`Sort: ${SORT_LABEL[sort]} ${sortOpen ? '▴' : '▾'}`}
              accessibilityLabel={`Sort badges, ${SORT_LABEL[sort]}`}
              accessibilityHint={sortOpen ? 'Hides the sort choices' : 'Shows the sort choices'}
              onPress={() => setSortOpen((o) => !o)}
            />
          </View>
          {sortOpen && (
            <View accessibilityRole="radiogroup" accessibilityLabel="Sort badges" style={{ borderBottomWidth: 1, borderBottomColor: c.line, marginBottom: space.sm }}>
              {CASE_SORTS.map((s, i) => (
                <RadioRow
                  key={s}
                  title={SORT_LABEL[s]}
                  subtitle={SORT_WHY[s]}
                  checked={sort === s}
                  onPress={() => {
                    useSeen.getState().setBadgeSort(s);
                    setSortOpen(false);
                  }}
                  last={i === CASE_SORTS.length - 1}
                />
              ))}
            </View>
          )}
        </View>

        {sort === 'set' ? (
          sets.filter((s) => s.marks.length > 0).map(shelf)
        ) : (
          <View style={{ marginTop: space.md }}>
            {(() => {
              const items = sortMarks(marks.filter((m) => passesFilter(m, filter)), sort);
              return items.length ? renderMarks(items, true) : <T v="meta" color={c.ink2}>{filter === 'earned' ? 'Nothing earned yet. Next for your exam shows where to start.' : 'All earned.'}</T>;
            })()}
          </View>
        )}

        <T v="meta" style={{ marginTop: space.xl }}>Answers after Coach me and game answers don’t count toward study badges. Nothing here is ever taken away.</T>
      </ScrollView>

      {openMark && (
        <BadgeSheet
          mark={openMark}
          set={setOf(openMark)}
          ladder={openMark.tier ? marks.filter((m) => m.badge === openMark.badge && m.tier) : undefined}
          domains={cert.domains}
          stage={stage}
          daysLeft={daysLeft}
          dueCount={dueCount}
          weakest={weakest}
          showProgress={!after}
          onClose={() => setOpen(null)}
          onStudy={study}
        />
      )}
    </SafeAreaView>
  );
}
