/**
 * Learn — short motion lessons (3–5 minutes each).
 * Spec: DESIGN_SYSTEM.md §11 "Learn":
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
 *   chevron turning (no height animation); a lesson finished since Learn
 *   was last on view draws its ✓ as you come back, with one light haptic.
 *
 * Study notes: one row under the cover opens the notes (every exam topic
 * in plain English). It hides itself while the app has no notes.
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { DomainRing, type BotanyKind } from '../../components/glyphs';
import { BookOpen, ChevronDown, ICON_STROKE, Play } from '../../components/icons';
import { AnimatedPressable, CheckDraw, Collapse, Turn, usePressScale, useScreenFocus } from '../../components/motion';
import { BigNum, Enter, HeroPanel, ICON_SIZE, ListRow, ProgressBar, Row, Screen, Section, T } from '../../components/ui';
import { domainColor } from '../../content/certifications';
import { lessonsFor, nextLesson } from '../../content/lessons';
import type { Lesson } from '../../content/lessons/types';
import { hasNotes, noteSubtopics } from '../../content/notes';
import type { DomainInfo } from '../../content/types';
import { readCount } from '../../engine/notesSearch';
import { haptic } from '../../lib/haptics';
import { useActiveCert } from '../../lib/useActiveCert';
import { motion, radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/**
 * Why the cover offers this lesson (ui.md L3), in one plain line. Exported for tests.
 * - asked for a domain (?domain=, e.g. from Today): "Next in IS Audit";
 * - the readiness focus (the domain with the most to gain, weighted by the
 *   exam), once there are answers to judge by: "Picked where you can gain the most";
 * - otherwise the next one in order: "Next in IS Audit".
 */
export function upNextReason(lesson: Lesson, domain: DomainInfo, opts: { askedDomain?: string; focusDomainId: string | null; hasAnswers: boolean }): string {
  if (opts.askedDomain !== lesson.domainId && opts.hasAnswers && opts.focusDomainId === lesson.domainId) return 'Picked where you can gain the most';
  return `Next in ${domain.short}`;
}

export default function Learn() {
  const { c, isDark } = useTheme();
  const { cert, progress, readiness } = useActiveCert();
  // Lessons finished since Learn was last on view: their ✓ draws as the learner comes back.
  // Decided while rendering, so the first frame back already starts the draw (no flash of the end state).
  const focused = useScreenFocus();
  const [look, setLook] = useState<{ focused: boolean; seen: string[]; fresh: string[] }>(() => ({ focused, seen: progress.lessonsDone, fresh: [] }));
  if (look.focused !== focused) {
    setLook(
      focused
        ? { focused, seen: progress.lessonsDone, fresh: progress.lessonsDone.filter((id) => !look.seen.includes(id)) }
        : { ...look, focused, fresh: [] },
    );
  }
  const freshKey = look.fresh.join(',');
  useEffect(() => {
    // One light haptic for the lesson-done moment (T1), never a celebration of its own.
    if (freshKey) haptic.light();
  }, [freshKey]);
  const { domain } = useLocalSearchParams<{ domain?: string }>();
  // Learn is a tab, so the param would stick; clear it when the learner leaves.
  useFocusEffect(useCallback(() => () => router.setParams({ domain: undefined }), []));

  const lessons = lessonsFor(cert.id);
  const done = (id: string) => progress.lessonsDone.includes(id);
  // Only trust ?domain= if it names a real domain of this exam; anything else
  // (a typo, an old link, another cert's id) falls back to the focus domain.
  const knownDomain = cert.domains.some((d) => d.id === domain) ? domain : undefined;
  const upNext = nextLesson(cert.id, progress.lessonsDone, knownDomain ?? readiness.focusDomainId ?? undefined);
  const upDomain = upNext ? cert.domains.find((d) => d.id === upNext.domainId) : undefined;
  const doneCount = lessons.filter((l) => done(l.id)).length;
  // One group per domain that has lessons, in domain order (lessonsFor is sorted).
  const groups = cert.domains
    .map((d) => ({ domain: d, items: lessons.filter((l) => l.domainId === d.id) }))
    .filter((grp) => grp.items.length > 0);
  // Groups the learner has opened or closed by hand. Any group they have not
  // touched is open only if it holds "Up next", so the list stays short.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpenGroup = (domainId: string) => toggled[domainId] ?? domainId === upNext?.domainId;
  const toggleGroup = (domainId: string) => setToggled((t) => ({ ...t, [domainId]: !isOpenGroup(domainId) }));
  const play = (col: string, size: number = ICON_SIZE.inline) => <Play size={size} color={col} strokeWidth={ICON_STROKE} />;
  // Study notes progress: "3 of 120 read" (hidden when there are no notes).
  const showNotes = hasNotes(cert.id);
  const noteIds = showNotes ? noteSubtopics(cert.id).map((s) => s.id) : [];
  const notesRead = readCount(noteIds, progress.notesRead);
  const notesState = notesRead === 0 ? 'Every exam topic in plain English' : `${notesRead} of ${noteIds.length} read`;
  const reason =
    upNext && upDomain
      ? upNextReason(upNext, upDomain, { askedDomain: knownDomain, focusDomainId: readiness.focusDomainId, hasAnswers: readiness.domains.some((d) => d.answered > 0) })
      : null;

  return (
    <Screen>
      <Enter i={0}>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>Learn</T>
        <T v="meta" style={{ marginTop: space.xs }}>Lessons and study notes</T>
      </Enter>

      <Enter i={1} style={{ marginTop: 18 }}>
        {upNext && upDomain ? (
          <HeroPanel
            // On the dark forest panel the brighter (dark-mode) domain tone reads best.
            captionLead={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: domainColor(upDomain.tone, true) }} />}
            caption={`Up next · ${upDomain.short}`}
            title={upNext.title}
            meta={`${upNext.minutes} min · ${upNext.scenes.length} scenes`}
            art={`branch${upDomain.tone % 5}` as BotanyKind}
            action={{ label: 'Start lesson', icon: (col) => play(col), hint: upNext.title, onPress: () => router.push(`/lesson/${upNext.id}`) }}
          >
            {/* Why this one (ui.md L3): a beginner sees the reason for the jump. */}
            {reason && (
              <T v="meta" color={c.onForest2} style={{ marginTop: 2 }}>
                {reason}
              </T>
            )}
          </HeroPanel>
        ) : (
          <HeroPanel caption="All caught up" title="Every lesson done" meta="Every exam topic covered. Revisit any lesson anytime." art="branch1" />
        )}
      </Enter>

      {showNotes && (
        <Enter i={2} style={{ marginTop: space.md }}>
          <ListRow
            icon={<BookOpen size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
            title="Study notes"
            subtitle={notesState}
            accessibilityLabel={`Study notes, ${notesState}`}
            accessibilityHint="Opens the notes for every exam topic"
            onPress={() => router.push('/notes')}
            last
          />
        </Enter>
      )}

      <Enter i={showNotes ? 3 : 2}>
        <Section title="Lessons by domain" meta={`${doneCount} of ${lessons.length} done`} />
        {groups.map(({ domain: d, items }, g) => {
          const groupDone = items.filter((l) => done(l.id)).length;
          const isOpen = isOpenGroup(d.id);
          const lastGroup = g === groups.length - 1;
          const progressText = groupDone === items.length ? 'All done' : `${groupDone} of ${items.length} done`;
          return (
            <View key={d.id}>
              {/* Group header: tap to show or hide this domain's lessons. */}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`${d.name}, ${items.length} ${items.length === 1 ? 'lesson' : 'lessons'}, ${progressText}`}
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
                  {/* L1: the domain's status by SHAPE (outline · arc · filled ✓), in its tone. */}
                  <DomainRing done={groupDone} total={items.length} tone={domainColor(d.tone, isDark)} track={c.track} outline={c.control} paper={c.bg} />
                  <T v="label" style={{ flex: 1 }}>{d.short}</T>
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
                    next={upNext?.id === l.id}
                    fresh={look.fresh.includes(l.id)}
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
        <T v="meta" style={{ marginTop: space.md }}>One lesson for every topic in the CISA exam outline.</T>
        <T v="meta" color={c.muted} style={{ marginTop: space.xs }}>Original content, reviewed against public frameworks.</T>
      </Enter>
    </Screen>
  );
}

/**
 * One lesson on its domain's trail (ui.md L2). The numeral column carries a
 * thin path that joins this lesson to the ones before and after (accent
 * where walked, `track` ahead), so the domain reads as a trail, not a list.
 * Done: an accent ✓ circle and the title in ink2 (its ✓ draws once when it
 * was finished since Learn was last on view). Up next: a soft highlight and
 * the caption "Up next". Others: an outline circle with ▶. One button,
 * spoken "IS Audit lesson 2: …, done | up next | 5 min" (unchanged).
 */
function LessonRow({
  domain,
  lesson,
  n,
  done,
  next,
  fresh,
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
  walkedIn: boolean;
  walkedOut: boolean;
  first: boolean;
  last: boolean;
}) {
  const { c } = useTheme();
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
        { flexDirection: 'row', alignItems: 'stretch', gap: 14, minHeight: 64, borderRadius: radius.md },
        next && { backgroundColor: c.soft, marginHorizontal: -space.sm, paddingHorizontal: space.sm },
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
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', paddingVertical: 13 }}>
        <T v="label" color={done ? c.ink2 : c.ink}>{lesson.title}</T>
        {next ? (
          <T v="caption" color={c.accentText} style={{ marginTop: 2 }}>Up next</T>
        ) : (
          <T v="meta">{done ? 'Done' : `${lesson.minutes} min`}</T>
        )}
      </View>
      <View style={{ justifyContent: 'center' }} accessible={false} importantForAccessibility="no-hide-descendants">
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: done ? c.accent : next ? c.bg : 'transparent',
            borderWidth: done ? 0 : 1.5,
            borderColor: c.control,
          }}
        >
          {done ? <CheckDraw play={fresh} color={c.bg} size={16} delay={fresh ? motion.dur.select : 0} /> : <Play size={12} color={c.ink2} strokeWidth={ICON_STROKE} />}
        </View>
      </View>
    </AnimatedPressable>
  );
}
