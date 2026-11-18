/**
 * Learn: the course (short lessons) and the reference (study notes and the rest).
 *
 * Grove Phase 4 (design-notes/grove/PHASE4.md 7.1; the kit's screens/02-phone-learn.png and
 * reference/02-phone-learn.html, which the owner asked for "exactly"). Top to bottom:
 *   1. "Learn" and its line "Lessons start each topic. Notes go deeper."
 *   2. The forest Up next card: a kicker with the area dot ("Up next · IS Operations"), the lesson
 *      title, "5 min · picked where you can gain the most", the mint Start lesson button, and the
 *      dandelion glyph tile at the top right (not drawn from text scale 1.3). The card itself is
 *      not a button; Start lesson is its one control. All caught up keeps its own words and
 *      "Go to Practice". A course with no lessons offers its next study note instead.
 *   3. The notes search (inline results, "See all results", the empty state, the spoken count).
 *   4. The tiles in the kit's order: Study notes, Glossary (O2, Sky's yes on 5 Nov 2026), Principles
 *      and The CISA exam (two columns, so the kit's 2 by 2 grid, or one column of rows from text
 *      scale 1.3 or on a narrow phone; an odd last tile spans the width). Each tile shows only when
 *      the course has its content: never a tile that opens nothing.
 *   5. Interactive Concept Lab (supported exams only), then Final review week, full-width rows.
 *   6. The Lessons card: "Lessons" with "0 of 66 · in exam order · each ends with a check", one
 *      row per area (its ring, number, short name, a mint "Next" on the Up next area, the count
 *      and a chevron) that opens the area's lesson trail in place, then "Prefer a guided path?".
 *   7. The footnote.
 * Every row, tile, count and link from the earlier Learn is still here; only the look changed.
 *
 * Kept from earlier releases (still true): ?domain=4 (from Today) puts that area's next lesson on
 * the card and opens its group; a lesson finished in the player draws its tick as the learner comes
 * back; the trail joins the numerals and the walked part is green; the Up next row has a filled play
 * disc; status marks are shapes (ring, arc, filled tick), never colour alone.
 */
import { FeatureInfo } from '../../components/featureInfo';
import * as Router from 'expo-router';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { Dandelion, DomainRing } from '../../components/glyphs';
import { AreaDot, CardDivider, CardHead, GlyphTile, HeroKicker, HubCard, HubTile, MintPill } from '../../components/groveHub';
import { HeroCard } from '../../components/groveToday';
import { BookOpen, BookText, CalendarCheck, ChevronDown, Compass, ICON_STROKE, Info, Play } from '../../components/icons';
import { AnimatedPressable, CheckDraw, Collapse, Turn, usePressScale, useScreenFocus } from '../../components/motion';
import { BigNum, Button, EmptyState, Enter, ICON_SIZE, ListRow, ProgressBar, Screen, SearchField, T, useFontScale } from '../../components/ui';
import { CERTIFICATIONS, domainColor, getCertification } from '../../content/certifications';
import { labsFor } from '../../content/labs';
import { lessonsFor, nextLesson } from '../../content/lessons';
import type { Lesson } from '../../content/lessons/types';
import { getNotes, hasNotes, noteSubtopics } from '../../content/notes';
import { hasExamGuide, hasFinalWeek } from '../../content/exam';
import { hasPrinciples } from '../../content/principles';
import { hasTerms } from '../../content/terms';
import type { Certification, DomainInfo } from '../../content/types';
import { readCount, searchNotes } from '../../engine/notesSearch';
import { clearFinishedLessons, wasJustFinished } from '../../lib/lessonNews';
import { readinessFor } from '../../engine/readiness';
import { selectCert, useProgress } from '../../store/progress';
import { heroInk } from '../../theme/grove';
import { LARGE_TEXT, motion, radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { useActiveCertId } from '../../lib/activeCert';
import { useContentWidth } from '../../components/layout';

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
 * The cover's one meta line and its spoken form ("5 min · where you'll gain
 * most" / "5 minutes, …"; "1 minute" for one). Exported for tests. The words
 * match Practice's "Where you'll gain most" row (short text, Sky, 5 Nov).
 */
export function upNextMeta(minutes: number, reason: UpNextReason, place: string): { meta: string; spoken: string } {
  const why = reason === 'focus' ? 'where you’ll gain most' : place;
  return { meta: `${minutes} min · ${why}`, spoken: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, ${why}` };
}

/** This screen's own navigation (absent where a test's expo-router stand-in has none). */
const useOwnNavigation: () => { setParams?: (p: { domain?: string }) => void } | undefined =
  (Router as { useNavigation?: () => { setParams?: (p: { domain?: string }) => void } }).useNavigation ?? (() => undefined);

export default function Learn() {
  const { c } = useTheme();
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
  // Study notes: a reference has no finish line, so no "x of N" meter here
  // (one progress meter per screen: the lessons'). Once any are read, it
  // counts them. Hidden when there are no notes.
  const showNotes = hasNotes(cert.id);
  // The exam-mindset principles: their own row, hidden when the cert has none.
  const showPrinciples = hasPrinciples(cert.id);
  // The Glossary (O2): its tile, only when the course has key terms.
  const showGlossary = hasTerms(cert.id);
  // The exam guide and the final review week: one row each, hidden when the cert has none.
  const showGuide = hasExamGuide(cert.id);
  const showWeek = hasFinalWeek(cert.id);
  const showLookUp = showNotes || showGlossary || showPrinciples || showGuide || showWeek;
  const noteIds = showNotes ? noteSubtopics(cert.id).map((s) => s.id) : [];
  const notesRead = readCount(noteIds, notesReadIds);
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
          {showNotes ? 'Lessons start each topic. Notes go deeper.' : 'Short lessons, in exam order.'}
        </T>
      </Enter>

      <Enter i={1} style={{ marginTop: space.xl }}>
        <UpNextCard
          cert={cert}
          upNext={upNext}
          upDomain={upDomain}
          meta={hero}
          hasLessons={lessons.length > 0}
          showNotes={showNotes}
          notesReadIds={notesReadIds}
          focusDomainId={focusDomainId}
        />
      </Enter>

      {showLookUp && (
        <Enter i={2}>
          {/* Memoised, with its own query state: typing re-renders only this block, never the hero or the lessons. */}
          <LookItUp cert={cert} notesRead={notesRead} showNotes={showNotes} showGlossary={showGlossary} showPrinciples={showPrinciples} showGuide={showGuide} showWeek={showWeek} />
        </Enter>
      )}

      {lessons.length > 0 && (
        <Enter i={showLookUp ? 3 : 2} style={{ marginTop: space.lg }}>
          {/* Memoised (performance, 1.15.x): a focus change or a store write that
              leaves the lessons as they were never re-renders the whole list. */}
          <LessonGroups
            cert={cert}
            lessonsDone={lessonsDone}
            upNextId={upNext?.id}
            upNextDomainId={upNext?.domainId}
            askedDomainId={knownDomain}
            fresh={look.fresh.join(',')}
            waiting={waiting.join(',')}
          />
        </Enter>
      )}
      {/* The footnote (PHASE4.md 7.1 item 7): ink2, one paragraph. J25: the short names keep "IS", so say once what it stands for. */}
      <T v="meta" color={c.ink2} style={{ marginTop: space.xl }}>
        {/* Short text (Sky, 5 Nov): the lessons sentence went (the Lessons card shows them); the
            IS line and the honesty line stay. */}
        {`${cert.domains.some((d) => /\bIS\b/.test(d.short)) ? 'IS means information systems. ' : ''}Original content, reviewed against public frameworks.`}
      </T>
    </Screen>
  );
}

/**
 * The forest Up next card (PHASE4.md 7.1 item 2). Not a button itself: Start lesson is its one control.
 * Three states: the next lesson; All caught up (every lesson done: its line and Go to Practice); and,
 * for a course that never had lessons, the next study note to read (never "All caught up" there).
 */
function UpNextCard({
  cert,
  upNext,
  upDomain,
  meta,
  hasLessons,
  showNotes,
  notesReadIds,
  focusDomainId,
}: {
  cert: Certification;
  upNext: Lesson | undefined;
  upDomain: DomainInfo | undefined;
  meta: { meta: string; spoken: string } | null;
  hasLessons: boolean;
  showNotes: boolean;
  notesReadIds: readonly string[];
  focusDomainId: string | null;
}) {
  const { c, isDark } = useTheme();
  // The kicker and the title on the left, the dandelion tile on the right (the title wraps first).
  const top = (kicker: ReactNode, title: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
      <View style={{ flex: 1, minWidth: 0, gap: space.sm }}>
        {kicker}
        <T v="hero" color={c.onForest}>{title}</T>
      </View>
      <GlyphTile>
        <Dandelion size={44} color={c.sap} centre={heroInk[isDark ? 'dark' : 'light'].mark} />
      </GlyphTile>
    </View>
  );
  // The hero's area dot: the dark-theme area colour, because the card is forest in both themes.
  const dot = (d: DomainInfo) => domainColor(d.tone, true);
  const action = { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: space.xl } as const;
  if (upNext && upDomain) {
    return (
      <HeroCard testID="learn-plate">
        {top(<HeroKicker label={`Up next · ${upDomain.short}`} dot={dot(upDomain)} />, upNext.title)}
        {/* Why this one (ui.md L3), on the same line as its length. */}
        {meta && <T v="meta" color={c.onForest2} accessibilityLabel={meta.spoken}>{meta.meta}</T>}
        <Button
          kind="hero"
          label="Start lesson"
          icon={(col) => <Play size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
          iconLeading
          accessibilityHint={upNext.title}
          onPress={() => router.push(`/lesson/${upNext.id}`)}
          style={action}
        />
      </HeroCard>
    );
  }
  if (hasLessons || !showNotes) {
    // Mobile 1.45 (PM story 3): lessons start each topic, so the next step is practice, with the
    // notes for what it turns up; the card says so and its one action goes to Practice.
    return (
      <HeroCard testID="learn-plate">
        {top(<HeroKicker label="All caught up" />, 'Every lesson done')}
        <T v="meta" color={c.onForest2}>
          {showNotes ? 'Keep practicing. Notes help when a topic trips you.' : 'Keep practicing to make it stick.'}
        </T>
        <Button kind="hero" label="Go to Practice" accessibilityHint="Opens the Practice tab" onPress={() => router.push('/practice')} style={action} />
      </HeroCard>
    );
  }
  // A course with notes but no lessons: the next note to read (the focus area first, then any), or,
  // with every note read, a way back into the notes.
  const note = nextNoteToRead(cert.id, notesReadIds, focusDomainId);
  const area = note ? cert.domains.find((d) => d.id === note.domainId) : undefined;
  return (
    <HeroCard testID="learn-plate">
      {top(
        <HeroKicker label={note ? `Study notes${area ? ` · ${area.short}` : ''}` : 'Every note read'} dot={area ? dot(area) : undefined} />,
        note ? note.name : 'Revisit a note',
      )}
      {note?.minutes ? (
        <T v="meta" color={c.onForest2} accessibilityLabel={`${note.minutes} minute read`}>{`${note.minutes} min read`}</T>
      ) : null}
      <Button
        kind="hero"
        label={note ? 'Read note' : 'Open study notes'}
        icon={(col) => <BookOpen size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
        iconLeading
        accessibilityHint={note ? note.name : 'Opens the notes, by domain'}
        onPress={() => router.push(note ? `/notes/subtopic/${encodeURIComponent(note.id)}` : '/notes')}
        style={action}
      />
    </HeroCard>
  );
}

/** The next unread note: the focus area first, then any area, in reading order. Exported for tests. */
export function nextNoteToRead(certId: string, readIds: readonly string[], focusDomainId: string | null) {
  const unread = noteSubtopics(certId).filter((n) => !readIds.includes(n.id));
  return unread.find((n) => n.domainId === focusDomainId) ?? unread[0];
}

/** One tile of Learn's grid, as data (the screen draws it). Exported for tests. */
export interface LookUpItem {
  key: 'notes' | 'glossary' | 'principles' | 'guide' | 'week';
  title: string;
  line: string;
  spoken: string;
  hint: string;
  onPress: () => void;
}

/**
 * Learn's reference tiles in the kit's fixed order (PHASE4.md 7.1 item 4): Study notes, Glossary,
 * Principles, The {course} exam, then Final review week (drawn as its own full-width row). Each only
 * when this exam has it. Exported for tests.
 */
export function lookUpItems(
  cert: Certification,
  notesRead: number,
  show: { showNotes: boolean; showGlossary?: boolean; showPrinciples: boolean; showGuide: boolean; showWeek: boolean },
): LookUpItem[] {
  const items: LookUpItem[] = [];
  if (show.showNotes) {
    // A reference has no finish line: no "x of N", only how many are read once any are.
    const line = notesRead === 0 ? 'Every topic, with traps' : `${notesRead} ${notesRead === 1 ? 'note' : 'notes'} read · with traps`;
    items.push({ key: 'notes', title: 'Study notes', line, spoken: `Study notes, ${line.replace(' · ', ', ')}`, hint: 'Opens the notes, by domain', onPress: () => router.push('/notes') });
  }
  // The key terms in plain words (O2): read-only, with search and area chips.
  if (show.showGlossary)
    items.push({
      key: 'glossary',
      title: 'Glossary',
      line: 'Key terms, plain words',
      spoken: 'Glossary, key terms in plain words',
      hint: 'Opens the glossary',
      onPress: () => router.push('/glossary'),
    });
  // The exam-mindset principles: how to think.
  if (show.showPrinciples)
    items.push({
      key: 'principles',
      title: 'Principles',
      line: 'How the exam thinks',
      spoken: 'Principles, how the exam thinks',
      hint: 'Opens the exam-mindset principles, by family',
      onPress: () => router.push('/principles'),
    });
  // About the exam: the format, booking, the day and after (facts, not study).
  if (show.showGuide)
    items.push({
      key: 'guide',
      title: `The ${cert.name} exam`,
      line: 'Booking to results',
      spoken: `About the ${cert.name} exam, booking to results`,
      hint: 'Opens the exam guide',
      onPress: () => router.push('/exam-guide'),
    });
  // The last seven days before the exam, day by day (the same screen Today opens in exam week).
  if (show.showWeek)
    items.push({
      key: 'week',
      title: 'Final review week',
      line: 'Your last seven days',
      spoken: 'Final review week, your last seven days',
      hint: 'Opens the final review week',
      onPress: () => router.push('/exam-week'),
    });
  return items;
}

/** Each tile's glyph, Lucide at row size (the kit: an open book, a book of words, a compass, an info mark, a calendar). */
const TILE_ICON: Record<LookUpItem['key'], (color: string) => ReactNode> = {
  notes: (col) => <BookOpen size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />,
  glossary: (col) => <BookText size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />,
  principles: (col) => <Compass size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />,
  guide: (col) => <Info size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />,
  week: (col) => <CalendarCheck size={ICON_SIZE.row} color={col} strokeWidth={ICON_STROKE} />,
};

/** Search results shown on Learn itself; more opens Study notes with the same search. */
const SEARCH_INLINE = 5;
/** A grid tile is never narrower than this: below it the tiles become full-width rows (PHASE4.md 7.1 item 4). */
const TILE_MIN_WIDTH = 160;

/** Learn's tiles in rows: pairs while two fit, one per row otherwise. An odd last tile is alone in its row. Exported for tests. */
export function tileRows<X>(tiles: readonly X[], twoUp: boolean): X[][] {
  const rows: X[][] = [];
  if (twoUp) for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));
  else for (const t of tiles) rows.push([t]);
  return rows;
}

/**
 * The notes search with its inline results, then the tiles and Final review week. Its own memoised
 * block with its own query, so a keystroke never re-renders the rest of Learn; the search runs on a
 * deferred copy of the query over the pack's cached index (engine/notesSearch.ts notesIndex).
 */
const LookItUp = memo(function LookItUp({
  cert,
  notesRead,
  showNotes,
  showGlossary,
  showPrinciples,
  showGuide,
  showWeek,
}: {
  cert: Certification;
  notesRead: number;
  showNotes: boolean;
  showGlossary: boolean;
  showPrinciples: boolean;
  showGuide: boolean;
  showWeek: boolean;
}) {
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
  const all = lookUpItems(cert, notesRead, { showNotes, showGlossary, showPrinciples, showGuide, showWeek });
  const week = all.find((i) => i.key === 'week');
  // Two columns while the text is under 1.3 and each tile keeps 160pt; otherwise one column of rows.
  const width = useContentWidth();
  const large = useFontScale() >= LARGE_TEXT;
  const twoUp = !large && (width - space.gutter * 2 - space.sm) / 2 >= TILE_MIN_WIDTH;
  const rows = tileRows(
    all.filter((i) => i.key !== 'week'),
    twoUp,
  );
  return (
    <View style={{ marginTop: space.lg, gap: space.sm }}>
      {showNotes && (
        // The kit's search: no head over it, a quiet field; its spoken label names it.
        <SearchField
          value={query}
          onChangeText={setQuery}
          edge="line"
          placeholder="Search notes, like RTO or SoD"
          accessibilityLabel="Search the study notes"
          accessibilityHint="Matching notes show below as you type"
        />
      )}
      {searching && (
        <View testID="learn-search-results">
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
      <View testID="learn-lookup" style={{ gap: space.sm }}>
        {rows.map((pair) => (
          <View key={pair.map((t) => t.key).join('-')} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'stretch' }}>
            {pair.map((t) => (
              <HubTile
                key={t.key}
                testID={`learn-tile-${t.key}`}
                icon={TILE_ICON[t.key]}
                title={t.title}
                line={t.line}
                spoken={t.spoken}
                hint={t.hint}
                onPress={t.onPress}
                row={pair.length === 1}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        ))}
        {labsFor(cert.id).length > 0 && <HubTile
          testID="learn-concept-lab"
          icon={(color) => <Compass size={24} color={color} strokeWidth={ICON_STROKE} />}
          title="Interactive Concept Lab"
          line="Change the variables. See what happens. · Featured: RTO vs. RPO"
          spoken="Interactive Concept Lab. Change the variables. See what happens. Featured: Understand RTO versus RPO."
          hint="Opens the concept lab catalog" onPress={() => router.push('/labs')} row
        />}
        {week && <HubTile testID="learn-tile-week" icon={TILE_ICON.week} title={week.title} line={week.line} spoken={week.spoken} hint={week.hint} onPress={week.onPress} row />}
      </View>
    </View>
  );
});

/**
 * The Lessons card (PHASE4.md 7.1 item 6): one disclosure row per area, each opening that area's
 * trail inside the card. Its props are primitives or the store's own arrays, so it re-renders only
 * when a lesson, Up next or a tick to draw changes. `fresh` and `waiting` are lesson ids joined
 * with commas (strings compare by value).
 */
const LessonGroups = memo(function LessonGroups({
  cert,
  lessonsDone,
  upNextId,
  upNextDomainId,
  askedDomainId,
  fresh,
  waiting,
}: {
  cert: Certification;
  lessonsDone: readonly string[];
  upNextId?: string;
  upNextDomainId?: string;
  /** The area a ?domain=N link asked for: the one group that starts open. */
  askedDomainId?: string;
  fresh: string;
  waiting: string;
}) {
  const { c, g, isDark } = useTheme();
  const scale = useFontScale();
  const width = useContentWidth();
  const lessons = lessonsFor(cert.id);
  const done = (id: string) => lessonsDone.includes(id);
  const freshIds = fresh ? fresh.split(',') : [];
  const waitingIds = waiting ? waiting.split(',') : [];
  const doneCount = lessons.filter((l) => done(l.id)).length;
  // One group per domain that has lessons, in domain order (lessonsFor is sorted).
  const groups = cert.domains
    .map((d) => ({ domain: d, items: lessons.filter((l) => l.domainId === d.id) }))
    .filter((grp) => grp.items.length > 0);
  // Every group starts closed (the kit; the hero already names the next lesson), except the area a
  // ?domain=N link asks for, and the area of a lesson just finished in the player (so its tick still
  // draws as the learner comes back, a feature kept from 1.12). Opened and closed by hand for this
  // visit only (no saved key).
  const freshAreas = lessons.filter((l) => freshIds.includes(l.id)).map((l) => l.domainId);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpenGroup = (domainId: string) => toggled[domainId] ?? (domainId === askedDomainId || freshAreas.includes(domainId));
  const toggleGroup = (domainId: string) => setToggled((t) => ({ ...t, [domainId]: !isOpenGroup(domainId) }));
  // From text scale 1.5 the name gets the card's full width under the ring (so the longest short
  // name, "Governance", stays whole at 200% on a 320pt phone), with the count and pill under it.
  const stack = scale >= 1.5;
  // PHASE4 7.1 item 6: the count and the Next pill also go on a second line "when it does not fit".
  // A width rule, not a measure: the room left for the name is the window, less the screen and card
  // padding and the ring, dot, number and chevron (about 160pt), less the Next pill (about 66pt) when
  // it shows. A whole short name needs about 150pt at text scale 1, more as the text grows.
  const twoLinesFor = (withPill: boolean) => stack || width - 160 - (withPill ? 66 : 0) < 150 * scale;
  return (
    <HubCard testID="learn-lessons">
      {/* The one progress meter on Learn (the notes tile counts, it never meters). */}
      {/* Short text (Sky, 5 Nov): "each ends with a check" went; the lesson itself says so. */}
      <CardHead serif title="Lessons" meta={`${doneCount} of ${lessons.length} · in exam order`} />
      {groups.map(({ domain: d, items }, gi) => {
        const groupDone = items.filter((l) => done(l.id)).length;
        const isOpen = isOpenGroup(d.id);
        const isNext = d.id === upNextDomainId;
        const allDone = groupDone === items.length;
        const tone = domainColor(d.tone, isDark);
        const ends = (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            {isNext && <MintPill label="Next" />}
            <T v="meta" num>{allDone ? 'All done' : `${groupDone} of ${items.length}`}</T>
          </View>
        );
        const twoLines = twoLinesFor(isNext);
        // A track only once a lesson here is done: five empty bars read as five failures (L1).
        // It sits in the name's column, so it starts under the name at any text size.
        const track = groupDone > 0 ? <ProgressBar value={items.length ? groupDone / items.length : 0} color={tone} height={3} /> : null;
        // Polish round 1: in the one-line row the track hangs UNDER the name, out of the flow, so the row
        // centres on the name and the ring, dot, number, count and chevron sit level with it (with the
        // track in the flow the name rose about 4pt above them). The row's 12pt padding has room for it.
        const bar = track ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: space.xs }}>
            {track}
          </View>
        ) : null;
        // Large text (stacked): the track stays in the flow, under the count.
        const barStacked = track ? <View style={{ marginTop: space.sm }}>{track}</View> : null;
        return (
          <View key={d.id}>
            {gi > 0 && <CardDivider />}
            <GroupHeader
              label={`Domain ${d.id}, ${d.short}, ${allDone ? 'all lessons done' : `${groupDone} of ${items.length} lessons done`}${isNext ? ', next lesson here' : ''}`}
              open={isOpen}
              onPress={() => toggleGroup(d.id)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                {/* L1: the area's status by SHAPE (ring, arc, filled tick) in its colour; the empty ring in leafLine (3:1). */}
                <DomainRing done={groupDone} total={items.length} tone={tone} track={c.track} outline={g.leafLine} paper={c.raised} size={16} />
                {/* The kit's 8pt area dot, as on Practice's By domain rows, so each area shows its colour
                    from the start (the ring alone is grey until a lesson is done). Decorative. */}
                <AreaDot color={tone} />
                <T v="meta" num style={{ minWidth: 12 }}>{d.id}</T>
                {stack ? (
                  <View style={{ flex: 1 }} />
                ) : (
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T v="label">{d.short}</T>
                    {twoLines && <View style={{ marginTop: 2, alignSelf: 'flex-start' }}>{ends}</View>}
                    {bar}
                  </View>
                )}
                {!twoLines && ends}
                {/* The chevron points right when closed and down when open; it turns when tapped. */}
                <Turn deg={isOpen ? 0 : -90}>
                  <ChevronDown size={ICON_SIZE.row} color={c.muted} strokeWidth={ICON_STROKE} />
                </Turn>
              </View>
              {/* Large text: the name at full width under the ring, then the count and pill, then the track. */}
              {stack && (
                <View style={{ marginTop: space.xs }}>
                  <T v="label">{d.short}</T>
                  <View style={{ marginTop: 2, alignSelf: 'flex-start' }}>{ends}</View>
                  {barStacked}
                </View>
              )}
            </GroupHeader>
            <Collapse open={isOpen} rows style={{ marginBottom: space.sm }}>
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
      {/* Guided: the step-by-step path (Practice, Change, Guided), pointed at from the course. The
          outline edge is `control`, 3:1 or more in both themes. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md }}>
        <Button
          kind="secondary"
          label="Guided"
          accessibilityHint="Guided pairs each lesson with practice. Opens Guided."
          onPress={() => router.push('/guided')}
          style={{ flex: 1 }}
        />
        <FeatureInfo title="Guided"><T v="body">Guided pairs a lesson with practice on the same topic.</T></FeatureInfo>
      </View>
    </HubCard>
  );
});

/** An area's row in the Lessons card: one button (at least 56pt) that shows or hides its lessons. */
function GroupHeader({ label, open, onPress, children }: { label: string; open: boolean; onPress: () => void; children: ReactNode }) {
  const { c } = useTheme();
  const press = usePressScale({ scale: 1, tint: c.soft, tintRadius: radius.md });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={label}
      accessibilityHint={open ? 'Hides these lessons' : 'Shows these lessons'}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[{ minHeight: 56, paddingVertical: space.md, justifyContent: 'center' }, press.style]}
    >
      {press.layer}
      {children}
    </AnimatedPressable>
  );
}

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
