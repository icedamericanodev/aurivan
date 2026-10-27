/**
 * Learn — the course (short lessons) and the reference (study notes).
 * Spec: DESIGN_SYSTEM.md §11 "Learn".
 *
 * Mobile 1.21 (course + reference, decided 15 Oct 2026): lessons are the
 * course you follow, study notes the reference you look things up in, and
 * the screen says so in one line. Top to bottom: the Up next lesson on the
 * forest panel (one meta line: its length and why this one), "Look it up"
 * (a notes search with inline results, then the Study notes row, BookOpen),
 * "Lessons" (one progress meter, "1 of 41 done", and its role line), the
 * domain groups, a Guided pointer and the footer. Lessons use the Play glyph
 * and notes BookOpen. The notes row has no "x of N" meter: a reference has no
 * finish line, so it counts notes read instead. Status marks are quiet: a
 * `track` ring for not started, a tone arc, a filled ✓ (never the `control`
 * outline, which reads as a radio button). The Up next lesson row has
 * only a filled play disc (mobile 1.24: no second card or caption, the cover
 * above already says "Up next"); other rows have no trailing mark.
 *
 * Earlier (mobile 1.12–1.20), still true:
 *   forest "Up next" lesson cover (domain dot + short name, the full lesson
 *   title, "3 min · 7 scenes", WHY this one, Start lesson, a branch drawn per
 *   domain) → "By domain": one collapsible group per domain (status ring ·
 *   short name · "2 of 7 done" · chevron), then its lessons as a trail.
 * Grouping keeps the list short when there are ~40 lessons: only the group
 * holding "Up next" starts open; the learner can open any other group.
 * Opening with ?domain=4 (e.g. from Today) puts that domain's next lesson
 * on the cover, and so opens that group.
 *
 * Mobile 1.12 (ui.md L1–L3, motion.md M4):
 * - L1: each domain shows a status ring before its name (none done = an
 *   outline ring, some = an arc, all = a filled disc with ✓), and draws a
 *   progress track only once a lesson there is done (five empty grey bars
 *   read as five failures).
 * - L2: three lesson states: done (an accent ✓ circle, the title in ink2),
 *   up next (a soft highlight and the caption "Up next") and the others (an
 *   outline circle). A thin path joins the numerals, so a domain reads as a
 *   trail; the part already walked is green.
 * - L3: one line under the cover says why this lesson.
 * - Motion: a group opens with its rows arriving 30 ms apart and the
 *   chevron turning (no height animation); a lesson finished in the player
 *   since Learn was last on view draws its ✓ as you come back. Until then
 *   its ✓ waits empty (never drawn, emptied, then drawn again). No haptic
 *   here: Lesson complete already gave the moment's one. A lesson that
 *   arrived any other way (a restore, a certification switch) is just done.
 *
 * Study notes: "Look it up" (the search and the Study notes row) hides
 * itself while the app has no notes.
 *
 * Principles (exam mindset): a second reference row in "Look it up", under
 * Study notes (Compass glyph), that opens the principles by family
 * (app/principles). Hidden while the cert has no principles; "Look it up"
 * shows while there are notes OR principles (the search only with notes).
 *
 * Exam guide and final review week (data/exam/): two more rows under
 * Principles, "About the CISA exam" (Info) and "Final review week"
 * (CalendarCheck), each hidden while the cert has no such file. "Look it up"
 * shows while any of its rows has something to open.
 */
import * as Router from 'expo-router';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { DomainRing, type BotanyKind } from '../../components/glyphs';
import { BookOpen, CalendarCheck, ChevronDown, Compass, ICON_STROKE, Info, Play } from '../../components/icons';
import { AnimatedPressable, CheckDraw, Collapse, Turn, usePressScale, useScreenFocus } from '../../components/motion';
import { BigNum, EmptyState, Enter, HeroPanel, ICON_SIZE, ListRow, ProgressBar, Row, Screen, SearchField, Section, T } from '../../components/ui';
import { CERTIFICATIONS, domainColor, domainLabel, getCertification } from '../../content/certifications';
import { lessonsFor, nextLesson } from '../../content/lessons';
import type { Lesson } from '../../content/lessons/types';
import { getNotes, hasNotes, noteSubtopics } from '../../content/notes';
import { hasExamGuide, hasFinalWeek } from '../../content/exam';
import { hasPrinciples } from '../../content/principles';
import type { Certification, DomainInfo } from '../../content/types';
import { readCount, searchNotes } from '../../engine/notesSearch';
import { clearFinishedLessons, wasJustFinished } from '../../lib/lessonNews';
import { readinessFor } from '../../engine/readiness';
import { selectCert, useProgress } from '../../store/progress';
import { motion, radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { useActiveCertId } from '../../lib/activeCert';

/**
 * Why the cover offers this lesson (ui.md L3), as a code. Exported for tests.
 * - 'focus': the readiness focus (the domain with the most to gain, weighted
 *   by the exam), once there are answers to judge by, and not asked for by
 *   ?domain=: the cover says "picked where you can gain the most";
 * - 'next': the next one in order (or the domain asked for): the cover says
 *   its place on the trail, "lesson 2 of 7".
 */
export type UpNextReason = 'focus' | 'next';
export function upNextReason(lesson: Lesson, opts: { askedDomain?: string; focusDomainId: string | null; hasAnswers: boolean }): UpNextReason {
  return opts.askedDomain !== lesson.domainId && opts.hasAnswers && opts.focusDomainId === lesson.domainId ? 'focus' : 'next';
}

/**
 * The cover's one meta line and its spoken form ("5 min · picked where you
 * can gain the most" / "5 minutes, …"; "1 minute" for one). Exported for tests.
 */
export function upNextMeta(minutes: number, reason: UpNextReason, place: string): { meta: string; spoken: string } {
  const why = reason === 'focus' ? 'picked where you can gain the most' : place;
  return { meta: `${minutes} min · ${why}`, spoken: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, ${why}` };
}

/** This screen's own navigation (absent where a test's expo-router stand-in has none). */
const useOwnNavigation: () => { setParams?: (p: { domain?: string }) => void } | undefined =
  (Router as { useNavigation?: () => { setParams?: (p: { domain?: string }) => void } }).useNavigation ?? (() => undefined);

export default function Learn() {
  const { isDark } = useTheme();
  // Only what Learn shows (performance, 1.15.x): lessons done, notes read,
  // and from readiness only the focus domain and whether there are answers.
  // Learn stays mounted (hidden) during study; an answer that doesn't move
  // its focus domain no longer re-renders it.
  const certId = useActiveCertId();
  const cert = getCertification(certId) ?? CERTIFICATIONS[0];
  // Progress by the active id itself, as useActiveCert reads it, so every tab shows the same exam's progress.
  const lessonsDone = useProgress((s) => selectCert(s, certId).lessonsDone);
  const notesReadIds = useProgress((s) => selectCert(s, certId).notesRead);
  const focusKey = useProgress((s) => {
    const r = readinessFor(cert, selectCert(s, certId).answers);
    return `${r.domains.some((d) => d.answered > 0) ? 1 : 0}${r.focusDomainId ?? ''}`;
  });
  const hasAnswers = focusKey[0] === '1';
  const focusDomainId = focusKey.slice(1) || null;
  // Lessons finished in the player since Learn was last on view: their ✓ draws as the learner comes back.
  // Decided while rendering, so the first frame back already starts the draw (no flash of the end state).
  const focused = useScreenFocus();
  const [look, setLook] = useState<{ focused: boolean; seen: readonly string[]; fresh: readonly string[] }>(() => ({ focused, seen: lessonsDone, fresh: [] }));
  const news = lessonsDone.filter((id) => !look.seen.includes(id) && wasJustFinished(id));
  if (look.focused !== focused) {
    setLook(focused ? { focused, seen: lessonsDone, fresh: news } : { ...look, focused, fresh: [] });
  }
  // Out of view, those rows wait with an empty ✓ (the back transition shows them before focus returns).
  const waiting = focused ? [] : news;
  // Once Learn has looked (on mount, and each time it is back in view), that news is shown.
  useEffect(() => {
    if (focused) clearFinishedLessons();
  }, [focused]);
  const { domain } = useLocalSearchParams<{ domain?: string }>();
  // Learn is a tab, so the param would stick; clear it when the learner leaves.
  // Through Learn's OWN navigation, and only when there is one to clear
  // (performance, 1.15.x): `router.setParams` acts on the screen in focus,
  // which on leaving is already the NEXT tab, so every switch away from Learn
  // re-rendered that tab and restarted its fade, and Learn's param stayed.
  const navigation = useOwnNavigation();
  const domainNow = useRef(domain);
  useEffect(() => {
    domainNow.current = domain;
  }, [domain]);
  useFocusEffect(
    useCallback(
      () => () => {
        if (domainNow.current === undefined) return;
        if (navigation?.setParams) navigation.setParams({ domain: undefined });
        else router.setParams({ domain: undefined });
      },
      [navigation],
    ),
  );

  const lessons = lessonsFor(cert.id);
  const done = (id: string) => lessonsDone.includes(id);
  // Only trust ?domain= if it names a real domain of this exam with a lesson
  // still to do; anything else (a typo, an old link, another cert's id, a
  // finished domain) falls back to the focus domain, so the reason line is true.
  const knownDomain =
    cert.domains.some((d) => d.id === domain) && lessons.some((l) => l.domainId === domain && !done(l.id)) ? domain : undefined;
  const upNext = nextLesson(cert.id, lessonsDone, knownDomain ?? focusDomainId ?? undefined);
  const upDomain = upNext ? cert.domains.find((d) => d.id === upNext.domainId) : undefined;
  const play = (col: string, size: number = ICON_SIZE.inline) => <Play size={size} color={col} strokeWidth={ICON_STROKE} />;
  // Study notes: a reference has no finish line, so no "x of N" meter here
  // (one progress meter per screen: the lessons'). Once any are read, it
  // counts them. Hidden when there are no notes.
  const showNotes = hasNotes(cert.id);
  // The exam-mindset principles: their own row, hidden when the cert has none.
  const showPrinciples = hasPrinciples(cert.id);
  // The exam guide and the final review week: one row each, hidden when the cert has none.
  const showGuide = hasExamGuide(cert.id);
  const showWeek = hasFinalWeek(cert.id);
  const showLookUp = showNotes || showPrinciples || showGuide || showWeek;
  const noteIds = showNotes ? noteSubtopics(cert.id).map((s) => s.id) : [];
  const notesRead = readCount(noteIds, notesReadIds);
  // One line each (design spec §2): the subtitle above already says "reference".
  const notesState = notesRead === 0
    ? 'Every topic, with traps and key terms'
    : `${notesRead} ${notesRead === 1 ? 'note' : 'notes'} read · every topic, with traps`;
  // The cover's one meta line: its length, then why this one. The caption
  // already names the domain, so "next in IS Audit" becomes its place on the trail.
  const upItems = upNext ? lessons.filter((l) => l.domainId === upNext.domainId) : [];
  const upPlace = upNext ? `lesson ${upItems.findIndex((l) => l.id === upNext.id) + 1} of ${upItems.length}` : '';
  const hero = upNext ? upNextMeta(upNext.minutes, upNextReason(upNext, { askedDomain: knownDomain, focusDomainId, hasAnswers }), upPlace) : null;

  return (
    <Screen>
      <Enter i={0}>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>Learn</T>
        <T v="meta" style={{ marginTop: space.xs }}>
          {showNotes ? 'Lessons start each topic. Study notes go deeper.' : 'Short lessons, in exam order.'}
        </T>
      </Enter>

      <Enter i={1} style={{ marginTop: space.xl }}>
        {upNext && upDomain ? (
          <HeroPanel
            // Mobile 1.43 (tab header C): a white card with the Learn seal; the dot takes the page's own tone.
            seal="seedhead"
            captionLead={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: domainColor(upDomain.tone, isDark) }} />}
            caption={`Up next · ${upDomain.short}`}
            title={upNext.title}
            // Why this one (ui.md L3), on the same line as its length.
            meta={hero?.meta}
            metaLabel={hero?.spoken}
            // One line under the title, over the faint low branch art (design spec §2).
            wideMeta
            art={`branch${upDomain.tone % 5}` as BotanyKind}
            action={{ label: 'Start lesson', icon: (col) => play(col), hint: upNext.title, onPress: () => router.push(`/lesson/${upNext.id}`) }}
          />
        ) : (
          // Mobile 1.45 (PM story 3): lessons start each topic, so the next step is practice, with the
          // notes for what it turns up; the hero says so and its one action goes to Practice.
          <HeroPanel
            seal="seedhead"
            caption="All caught up"
            title="Every lesson done"
            meta={showNotes ? 'Keep practicing, and open the study notes for any topic that trips you up.' : 'Keep practicing to make it stick.'}
            art="branch1"
            action={{ label: 'Go to Practice', hint: 'Opens the Practice tab', onPress: () => router.push('/practice') }}
          />
        )}
      </Enter>

      {showLookUp && (
        <Enter i={2}>
          {/* Memoised, with its own query state: typing re-renders only this block, never the hero or the lessons. */}
          <LookItUp cert={cert} notesState={notesState} showNotes={showNotes} showPrinciples={showPrinciples} showGuide={showGuide} showWeek={showWeek} />
        </Enter>
      )}

      <Enter i={showLookUp ? 3 : 2}>
        {/* Memoised (performance, 1.15.x): a focus change or a store write that
            leaves the lessons as they were never re-renders the whole list. */}
        <LessonGroups
          cert={cert}
          lessonsDone={lessonsDone}
          upNextId={upNext?.id}
          upNextDomainId={upNext?.domainId}
          fresh={look.fresh.join(',')}
          waiting={waiting.join(',')}
        />
      </Enter>
    </Screen>
  );
}

/** Search results shown on Learn itself; more opens Study notes with the same search. */
const SEARCH_INLINE = 5;

/**
 * "Look it up": the notes search with its inline results, then the Study
 * notes row. Its own memoised block with its own query, so a keystroke never
 * re-renders the rest of Learn; the search itself runs on a deferred copy of
 * the query (React keeps the field responsive while results catch up), over
 * the pack's cached index (engine/notesSearch.ts notesIndex).
 */
const LookItUp = memo(function LookItUp({
  cert,
  notesState,
  showNotes,
  showPrinciples,
  showGuide,
  showWeek,
}: {
  cert: Certification;
  notesState: string;
  showNotes: boolean;
  showPrinciples: boolean;
  showGuide: boolean;
  showWeek: boolean;
}) {
  const { c } = useTheme();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const searching = showNotes && deferred.trim().length >= 2;
  const hits = useMemo(() => (searching ? searchNotes(getNotes(cert.id), deferred) : []), [searching, cert.id, deferred]);
  const found = hits.length === 0 ? 'No matching notes' : `${hits.length}${hits.length === 30 ? ' or more' : ''} ${hits.length === 1 ? 'note' : 'notes'} found`;
  // Screen readers hear how many once typing pauses (not on every keystroke).
  useEffect(() => {
    if (!searching) return;
    const t = setTimeout(() => AccessibilityInfo.announceForAccessibility(found), 700);
    return () => clearTimeout(t);
  }, [searching, found, deferred]);
  const shown = hits.slice(0, SEARCH_INLINE);
  return (
    <>
      <Section title="Look it up" />
      {showNotes && (
        <View style={{ marginTop: space.sm }}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Search the notes, like RTO or SoD"
            accessibilityLabel="Search the study notes"
            accessibilityHint="Matching notes show below as you type"
          />
        </View>
      )}
      {searching && (
        <View testID="learn-search-results" style={{ marginTop: space.xs }}>
          {hits.length === 0 ? (
            <EmptyState compact art="fieldbook" title="No matching notes" body="Try a shorter word, or an acronym like RTO or SoD." />
          ) : (
            shown.map((h) => {
              const d = cert.domains.find((x) => x.id === h.subtopic.domainId);
              return (
                <ListRow
                  key={h.subtopic.id}
                  reading
                  title={h.subtopic.name}
                  subtitle={
                    <View>
                      <T v="meta" numberOfLines={2}>{h.snippet}</T>
                      {d && <T v="caption" style={{ marginTop: 2 }}>{d.short}</T>}
                    </View>
                  }
                  accessibilityLabel={`${h.subtopic.name}. ${d?.short ?? ''}. ${h.snippet}`}
                  accessibilityHint="Opens this note"
                  onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(h.subtopic.id)}`)}
                />
              );
            })
          )}
          {hits.length > SEARCH_INLINE && (
            <ListRow
              title="See all results"
              subtitle={found}
              accessibilityHint="Opens Study notes with this search"
              onPress={() => router.push({ pathname: '/notes', params: { q: deferred.trim() } })}
            />
          )}
        </View>
      )}
      {showNotes && (
        <ListRow
          icon={<BookOpen size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
          title="Study notes"
          subtitle={notesState}
          accessibilityLabel={`Study notes, ${notesState}`}
          accessibilityHint="Opens the notes, by domain"
          onPress={() => router.push('/notes')}
          last={!showPrinciples && !showGuide && !showWeek}
        />
      )}
      {/* The exam-mindset principles: the second reference row (Compass = how to think). */}
      {showPrinciples && (
        <ListRow
          icon={<Compass size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
          title="Principles"
          subtitle="The thinking the exam rewards"
          accessibilityLabel="Principles, the thinking the exam rewards"
          accessibilityHint="Opens the exam-mindset principles, by family"
          onPress={() => router.push('/principles')}
          last={!showGuide && !showWeek}
        />
      )}
      {/* About the exam: the format, booking, the day and after (Info = facts, not study). */}
      {showGuide && (
        <ListRow
          icon={<Info size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
          title={`About the ${cert.name} exam`}
          subtitle="Format, booking, exam day and after"
          accessibilityHint="Opens the exam guide"
          onPress={() => router.push('/exam-guide')}
          last={!showWeek}
        />
      )}
      {/* The last seven days before the exam, day by day (the same screen Today opens in exam week). */}
      {showWeek && (
        <ListRow
          icon={<CalendarCheck size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
          title="Final review week"
          subtitle="Your last seven days, day by day"
          accessibilityHint="Opens the final review week"
          onPress={() => router.push('/exam-week')}
          last
        />
      )}
    </>
  );
});

/**
 * The lessons, grouped by domain (a group opens and closes). Its props are
 * primitives or the store's own arrays, so it re-renders only when a lesson,
 * Up next or a ✓ to draw changes. `fresh` and `waiting` are lesson ids joined
 * with commas (strings compare by value).
 */
const LessonGroups = memo(function LessonGroups({
  cert,
  lessonsDone,
  upNextId,
  upNextDomainId,
  fresh,
  waiting,
}: {
  cert: Certification;
  lessonsDone: readonly string[];
  upNextId?: string;
  upNextDomainId?: string;
  fresh: string;
  waiting: string;
}) {
  const { c, isDark } = useTheme();
  const lessons = lessonsFor(cert.id);
  const done = (id: string) => lessonsDone.includes(id);
  const freshIds = fresh ? fresh.split(',') : [];
  const waitingIds = waiting ? waiting.split(',') : [];
  const doneCount = lessons.filter((l) => done(l.id)).length;
  // One group per domain that has lessons, in domain order (lessonsFor is sorted).
  const groups = cert.domains
    .map((d) => ({ domain: d, items: lessons.filter((l) => l.domainId === d.id) }))
    .filter((grp) => grp.items.length > 0);
  // Groups the learner has opened or closed by hand. Any group they have not
  // touched is open only if it holds "Up next", so the list stays short.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpenGroup = (domainId: string) => toggled[domainId] ?? domainId === upNextDomainId;
  const toggleGroup = (domainId: string) => setToggled((t) => ({ ...t, [domainId]: !isOpenGroup(domainId) }));
  return (
    <>
        {/* The one progress meter on Learn (the notes row counts, it never meters). */}
        <Section title="Lessons" meta={`${doneCount} of ${lessons.length} done`} />
        {/* The course's role, in one line; never "a lesson for every topic" (one outline topic has none).
            J25: the short names keep "IS"; say once what it stands for. */}
        <T v="meta">In exam order. Each ends with a quick check.</T>
        {groups.map(({ domain: d, items }, g) => {
          const groupDone = items.filter((l) => done(l.id)).length;
          const isOpen = isOpenGroup(d.id);
          const lastGroup = g === groups.length - 1;
          // "of 7" without "done": the section meta says "done" once, not five times.
          const progressText = groupDone === items.length ? 'All done' : `${groupDone} of ${items.length}`;
          const spokenProgress = groupDone === items.length ? 'all done' : `${groupDone} of ${items.length} done`;
          return (
            <View key={d.id}>
              {/* Group header: tap to show or hide this domain's lessons. */}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`${d.name}, ${items.length} ${items.length === 1 ? 'lesson' : 'lessons'}, ${spokenProgress}`}
                accessibilityHint={isOpen ? 'Hides these lessons' : 'Shows these lessons'}
                onPress={() => toggleGroup(d.id)}
                style={({ pressed }) => ({
                  minHeight: 56,
                  paddingVertical: space.md,
                  justifyContent: 'center',
                  backgroundColor: pressed ? c.soft : 'transparent',
                  // A hairline between groups; none under an open header (its rows follow).
                  borderBottomWidth: isOpen || lastGroup ? 0 : 1,
                  borderBottomColor: c.line,
                })}
              >
                <Row gap={space.sm}>
                  {/* L1: the domain's status by SHAPE (quiet ring · arc · filled ✓), in its tone. A status, so `track`, never `control`. */}
                  <DomainRing done={groupDone} total={items.length} tone={domainColor(d.tone, isDark)} track={c.track} outline={c.track} paper={c.bg} />
                  {/* C9: a list of domains says "Domain 1 · IS Audit". */}
                  <T v="label" style={{ flex: 1 }}>{domainLabel(d)}</T>
                  <T v="meta" num>{progressText}</T>
                  {/* Chevron points down when open, right when closed; it turns when tapped. */}
                  <Turn deg={isOpen ? 0 : -90}>
                    <ChevronDown size={ICON_SIZE.row} color={c.muted} strokeWidth={ICON_STROKE} />
                  </Turn>
                </Row>
                {/* A track only once a lesson here is done: five empty bars read as five failures (L1). */}
                {groupDone > 0 && (
                  <View style={{ marginTop: space.sm, marginLeft: 28 }}>
                    <ProgressBar value={items.length ? groupDone / items.length : 0} color={domainColor(d.tone, isDark)} height={3} />
                  </View>
                )}
              </Pressable>
              <Collapse open={isOpen} rows style={{ marginBottom: lastGroup ? 0 : space.sm }}>
                {items.map((l, i) => (
                  <LessonRow
                    key={l.id}
                    domain={d}
                    lesson={l}
                    n={i + 1}
                    done={done(l.id)}
                    next={upNextId === l.id}
                    fresh={freshIds.includes(l.id)}
                    hold={waitingIds.includes(l.id)}
                    // The trail: the step into this lesson is walked when the one before is done.
                    walkedIn={i > 0 && done(items[i - 1].id)}
                    walkedOut={done(l.id) && i < items.length - 1}
                    first={i === 0}
                    last={i === items.length - 1}
                  />
                ))}
              </Collapse>
            </View>
          );
        })}
        {/* Guided: the step-by-step path (Practice → Change → Guided), pointed at from the course. */}
        <View style={{ marginTop: space.xl }}>
          <ListRow
            title="Prefer a step-by-step path?"
            subtitle="Guided pairs each lesson with practice"
            accessibilityHint="Opens Guided"
            onPress={() => router.push('/guided')}
            last
          />
        </View>
        {/* J25: the short names keep "IS"; say once what it stands for (in the footer since 1.21, so the role line stays one line). */}
        <T v="meta" style={{ marginTop: space.xl }}>
          {`Short lessons across every domain of the exam outline.${cert.domains.some((d) => /\bIS\b/.test(d.short)) ? ' IS means information systems.' : ''}`}
        </T>
        <T v="meta" color={c.muted} style={{ marginTop: space.xs }}>Original content, reviewed against public frameworks.</T>
    </>
  );
});

/**
 * One lesson on its domain's trail (ui.md L2). The numeral column carries a
 * thin path that joins this lesson to the ones before and after (accent
 * where walked, `track` ahead), so the domain reads as a trail, not a list.
 * Done: an accent ✓ circle and the title in ink2 (its ✓ draws once when it
 * was finished in the player since Learn was last on view). Up next: a filled
 * accent play disc. Mobile 1.24 (review): it is no longer a raised card with its
 * own "Up next" caption. The forest panel at the top already says "Up next" and
 * names the same lesson, so saying it twice read as two lessons, and the card
 * pushed past the page gutter. Others: nothing trailing (the whole row is the
 * button). One button, spoken "IS Audit lesson 2: …, done | up next | 5 min".
 */
const LessonRow = memo(function LessonRow({
  domain,
  lesson,
  n,
  done,
  next,
  fresh,
  hold,
  walkedIn,
  walkedOut,
  first,
  last,
}: {
  domain: DomainInfo;
  lesson: Lesson;
  n: number;
  done: boolean;
  next: boolean;
  fresh: boolean;
  /** Finished out of view: the ✓ waits empty until Learn is back (then `fresh` draws it). */
  hold: boolean;
  walkedIn: boolean;
  walkedOut: boolean;
  first: boolean;
  last: boolean;
}) {
  const { c } = useTheme();
  // The pressed tint: `soft`, as on every row.
  const press = usePressScale({ scale: 1, tint: c.soft, tintRadius: radius.md });
  const state = done ? 'done' : next ? 'up next' : `${lesson.minutes} min`;
  const segment = (on: boolean, hidden: boolean) => (
    <View style={{ flex: 1, width: 1.5, backgroundColor: hidden ? 'transparent' : on ? c.accent : c.track, opacity: on ? 0.7 : 1 }} />
  );
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${domain.short} lesson ${n}: ${lesson.title}, ${state}`}
      onPress={() => router.push(`/lesson/${lesson.id}`)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        { flexDirection: 'row', alignItems: 'stretch', gap: space.md, minHeight: 64, borderRadius: radius.md },
        press.style,
      ]}
    >
      {press.layer}
      {/* The numeral on its trail: a path above and below it (none above the first, none below the last). */}
      <View style={{ width: 40, alignItems: 'center' }} accessible={false} importantForAccessibility="no-hide-descendants">
        {segment(walkedIn, first)}
        <View style={{ paddingVertical: 4 }}>
          <BigNum value={String(n)} size={22} color={done ? c.accentText : c.ink2} />
        </View>
        {segment(walkedOut, last)}
      </View>
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', paddingVertical: space.md }}>
        <T v="label" color={done ? c.ink2 : c.ink}>{lesson.title}</T>
        <T v="meta">{done ? 'Done' : `${lesson.minutes} min`}</T>
      </View>
      {/* Two meaningful marks only (R10): the filled ✓ on done rows, the filled play disc on Up next. */}
      {(done || next) && (
        <View style={{ justifyContent: 'center' }} accessible={false} importantForAccessibility="no-hide-descendants">
          <View style={{ width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent }}>
            {done ? (
              <CheckDraw play={fresh} hold={hold} color={c.bg} size={16} delay={fresh ? motion.dur.select : 0} />
            ) : (
              <Play size={12} color={c.bg} fill={c.bg} strokeWidth={ICON_STROKE} />
            )}
          </View>
        </View>
      )}
    </AnimatedPressable>
  );
});
