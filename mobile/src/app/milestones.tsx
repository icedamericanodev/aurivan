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
 * - In the last three weeks before the exam it opens at Exam Day; opened
 *   from Field notes (`?shelf=fieldNotes`) it opens at that shelf, and from
 *   a badge moment (`?open=<key>`) with that badge's sheet up.
 * - Moments shows only once something on it happened (a Fresh Start is a
 *   moment, never a goal). After the exam: no Next panel, no progress, and
 *   no Closest sort (it is a keepsake album).
 * - Large text: two columns at ×1.3, a list at ×1.6.
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BadgeCellMemo as BadgeCell, BadgeListRowMemo as BadgeListRow, BadgeSheet, NextPanel, ShelfHeader } from '../components/badges';
import { useGrowth } from '../components/motion';
import { Button, Chip, ChipRow, PushedHeader, RadioRow, T, useFontScale } from '../components/ui';
import {
  CASE_SORTS,
  hasWholeMap,
  nextForExam,
  onCase,
  passesFilter,
  SET_ORDER,
  setCountLine,
  sortMarks,
  type CaseFilter,
  type CaseMark,
  type CaseSort,
  type SetId,
  type SetView,
  type StudyTarget,
} from '../engine/badgeCatalog';
import { moveFocus } from '../lib/a11y';
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
const FILTERS: { id: CaseFilter; label: string; spoken: string }[] = [
  { id: 'all', label: 'All', spoken: 'All badges' },
  { id: 'earned', label: 'Earned', spoken: 'Earned badges' },
  { id: 'open', label: 'Not yet', spoken: 'Badges not yet earned' },
];
/** The final three weeks: the case opens at Exam Day. */
const OPEN_AT_EXAM_DAY = 21;
/** "Study for this" from the sheet waits for it to slide away (iOS says when; elsewhere, and as a fallback, this long). */
const SHEET_GONE_MS = Platform.OS === 'ios' ? 700 : 60;

export default function Badges() {
  const { c } = useTheme();
  const { cert, progress, readiness, daysLeft, dueCount } = useActiveCert();
  const params = useLocalSearchParams<{ shelf?: string; open?: string }>();
  const fontScale = useFontScale();
  const { width: screenW } = useWindowDimensions();
  const full = useMemo(() => badgeCase(cert.id, progress), [cert.id, progress]);
  // Moments only once something on it happened: an unearned Fresh Start is never shown as a goal.
  const marks = useMemo(() => full.marks.filter(onCase), [full.marks]);
  const sets = useMemo(() => full.sets.map((s) => ({ ...s, marks: s.marks.filter(onCase) })), [full.sets]);
  const { mastery } = full;
  const stage = caseStage(cert.id, progress, readiness, daysLeft);
  const after = stage === 'afterExam';
  const next = useMemo(
    // Slot 1 reads the same mastery as Firm Footing (answers without Coach me, outside games).
    () => nextForExam({ marks, stage, daysLeft, mastery }),
    [marks, stage, daysLeft, mastery],
  );
  const weakest = weakestDomain(mastery);
  const wholeMap = hasWholeMap(marks);
  // Badges the back-fill saved quietly carry its time: they read "By 11 Oct".
  const quietAt = progress.milestones?.backfill?.at;

  // Badges earned since the case was last opened press in, then it counts as
  // seen. Seen only while the case is on screen: a badge earned in a session
  // started from here (the case covered) keeps its "new" dot until it is viewed.
  const [seenAt] = useState(() => useSeen.getState().caseSeen[cert.id]);
  // Re-runs when a badge arrives while the case is on screen, so it counts as seen too.
  const lastEarned = Math.max(0, ...Object.values(progress.milestones?.earned ?? {}));
  useFocusEffect(
    useCallback(() => {
      seeCase(cert.id, Math.max(Date.now(), lastEarned));
    }, [cert.id, lastEarned]),
  );
  const fresh = useMemo(
    () =>
      seenAt === undefined
        ? []
        : marks
            .filter((m) => m.earnedAt !== undefined && m.earnedAt > seenAt && m.earnedAt !== quietAt)
            .sort((a, b) => a.earnedAt! - b.earnedAt!)
            .slice(0, motion.stagger.maxLeaves)
            .map((m) => m.key),
    [marks, seenAt, quietAt],
  );
  // Each new badge presses in ONCE: switching the sort or a filter remounts
  // its cell, which must not replay it (code review minor 7).
  const [pressDone, setPressDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPressDone(true), 0);
    return () => clearTimeout(t);
  }, []);
  const pressAt = (key: string) => {
    const k = pressDone ? -1 : fresh.indexOf(key);
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

  // Filter (this visit) and Sort (kept on this phone). After the exam there is
  // nothing to be close to, so Closest is not offered (By set instead).
  const [filter, setFilter] = useState<CaseFilter>('all');
  const sorts = after ? CASE_SORTS.filter((x) => x !== 'closest') : CASE_SORTS;
  const savedSort = useSeen((s) => s.badgeSort);
  // Opened at a shelf (Field notes): shelves for this visit, until a sort is picked.
  const [atShelf, setAtShelf] = useState(Boolean(params.shelf));
  const sort: CaseSort = !atShelf && sorts.includes(savedSort as CaseSort) ? (savedSort as CaseSort) : 'set';
  const [sortOpen, setSortOpen] = useState(false);
  const sortButton = useRef<View>(null);
  const pickSort = (x: CaseSort) => {
    useSeen.getState().setBadgeSort(x);
    setAtShelf(false);
    setSortOpen(false);
    // The menu unmounts under the finger: focus goes back to the Sort button (UX H2).
    moveFocus(sortButton, 150);
  };

  // The sheet: one badge's details. A "Study for this" in it waits until the
  // sheet has slid away before it opens anything (a push under a closing
  // sheet can land beneath it or stall on iOS).
  const [open, setOpen] = useState<string | null>(() => (params.open && marks.some((m) => m.key === params.open) ? params.open : null));
  const [leaving, setLeaving] = useState<string | null>(null);
  const [opens, setOpens] = useState(0);
  const pending = useRef<StudyTarget | null>(null);
  const sheetKey = open ?? leaving;
  const sheetMark = sheetKey ? marks.find((m) => m.key === sheetKey) : undefined;
  const openSheet = useCallback((key: string) => {
    setOpen(key);
    setOpens((n) => n + 1);
  }, []);
  const setOf = (m: CaseMark) => sets.find((s) => s.info.id === m.set)!;
  const setName = (m: CaseMark) => setOf(m).info.name;
  const certId = cert.id;
  const gone = useCallback(() => {
    const t = pending.current;
    pending.current = null;
    setLeaving(null);
    if (t) studyFor(t, certId, dueCount);
  }, [certId, dueCount]);
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(gone, SHEET_GONE_MS);
    return () => clearTimeout(t);
  }, [leaving, gone]);
  const study = (t: StudyTarget) => {
    if (!open) return studyFor(t, cert.id, dueCount); // the Next panel: no sheet in the way
    pending.current = t;
    setLeaving(open);
    setOpen(null);
  };

  // Grid: three columns (88pt medallions), two at ×1.3 text, a list at ×1.6.
  const list = fontScale >= 1.6;
  const cols = fontScale >= LARGE_TEXT ? 2 : 3;
  const inner = Math.min(screenW, 560) - space.gutter * 2;
  const cellW = Math.floor((inner - (cols - 1) * space.sm) / cols);
  const size = cols === 3 ? Math.min(88, cellW - 16) : Math.min(104, cellW - 24);

  // Opens at a shelf, once, by set: the one asked for (Field notes), else
  // Exam Day in the final three weeks. Measured on the shelf's outer view,
  // a direct child of the scroll content (code review B1).
  const scroll = useRef<ScrollView>(null);
  const late = daysLeft !== null && daysLeft >= 0 && daysLeft <= OPEN_AT_EXAM_DAY;
  const asked = SET_ORDER.includes(params.shelf as SetId) ? (params.shelf as SetId) : undefined;
  const jumpTo: SetId | undefined = asked ?? (late ? 'examDay' : undefined);
  const [jumpY, setJumpY] = useState<number | null>(null);
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || jumpY === null || sort !== 'set' || !jumpTo) return;
    jumped.current = true;
    scroll.current?.scrollTo({ y: Math.max(0, jumpY - space.lg), animated: false });
  }, [jumpY, sort, jumpTo]);

  const renderMarks = (items: CaseMark[], flat: boolean) =>
    list ? (
      <View>
        {items.map((m, k) => (
          <BadgeListRow
            key={m.key}
            mark={m}
            setName={setName(m)}
            domains={cert.domains}
            onOpen={openSheet}
            press={pressAt(m.key)}
            last={k === items.length - 1}
            showSet={flat}
            showProgress={!after}
            quietAt={quietAt}
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
            onOpen={openSheet}
            press={pressAt(m.key)}
            showSet={flat}
            showProgress={!after}
            quietAt={quietAt}
          />
        ))}
      </View>
    );

  const shelf = (s: SetView) => {
    const items = s.marks.filter((m) => passesFilter(m, filter));
    const id: SetId = s.info.id;
    return (
      <View key={id} testID={`shelf-${id}`} onLayout={id === jumpTo ? (e) => setJumpY(e.nativeEvent.layout.y) : undefined}>
        {id === 'fieldNotes' && <View style={{ height: 1, backgroundColor: c.line, marginTop: space.section }} />}
        <ShelfHeader set={s} line={setCountLine(s)} quietAt={quietAt} />
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
            onOpen={openSheet}
            onStudy={study}
            barFrom={barFrom}
          />
        )}

        <View style={{ marginTop: space.xl }}>
          <ChipRow>
            {FILTERS.map((f) => (
              <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} accessibilityLabel={f.spoken} />
            ))}
          </ChipRow>
          <View style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.xs }}>
            <Button
              ref={sortButton}
              kind="ghost"
              label={`Sort: ${SORT_LABEL[sort]} ${sortOpen ? '▴' : '▾'}`}
              accessibilityLabel={`Sort badges, ${SORT_LABEL[sort]}`}
              accessibilityHint={sortOpen ? 'Hides the sort choices' : 'Shows the sort choices'}
              expanded={sortOpen}
              onPress={() => setSortOpen((o) => !o)}
            />
          </View>
          {sortOpen && (
            <View accessibilityRole="radiogroup" accessibilityLabel="Sort badges" style={{ borderBottomWidth: 1, borderBottomColor: c.line, marginBottom: space.sm }}>
              {sorts.map((x, i) => (
                <RadioRow key={x} title={SORT_LABEL[x]} subtitle={SORT_WHY[x]} checked={sort === x} onPress={() => pickSort(x)} last={i === sorts.length - 1} />
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

      {sheetMark && (
        <BadgeSheet
          key={`${sheetMark.key}:${opens}`}
          mark={sheetMark}
          set={setOf(sheetMark)}
          ladder={sheetMark.tier ? marks.filter((m) => m.badge === sheetMark.badge && m.tier) : undefined}
          domains={cert.domains}
          stage={stage}
          daysLeft={daysLeft}
          dueCount={dueCount}
          weakest={weakest}
          wholeMap={wholeMap}
          showProgress={!after}
          quietAt={quietAt}
          visible={open !== null}
          onClose={() => setOpen(null)}
          onDismissed={leaving ? gone : undefined}
          onStudy={study}
        />
      )}
    </SafeAreaView>
  );
}
