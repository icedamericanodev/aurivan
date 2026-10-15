/**
 * Lesson player — one scene at a time, segmented progress at the top, and
 * thumb-reach Back / Next at the bottom. Ends on a quick check; finishing
 * marks the lesson done, ticks it off today's plan and feeds the journey,
 * then shows Lesson complete.
 *
 * Mobile 1.12 (motion.md M4, ui.md LP1–LP6):
 * - Scene → scene is a page turn (shared axis X): Next drifts left, Back
 *   drifts right; each scene's parts then build in reading order. Each
 *   scene is a fresh subtree, so a check's pick never shows on another scene.
 * - The footer and the "1/7" follow the PAGE on screen, not the tap: until
 *   the new page is placed (PageTurn's swap, before it is painted) they still
 *   describe the old one, and the buttons ignore taps, so a tap can't act on
 *   a scene not yet seen. Finishing keeps the same "Finish lesson" button
 *   (and screen-reader focus on it) until Lesson complete is placed.
 * - After a turn screen readers hear "Scene 3 of 7" (said once, after a
 *   short pause), and Back onto the first scene (where Back is hidden)
 *   hands focus to Next.
 * - Lesson complete (LP6): the domain's lessons as leaves on its branch,
 *   the new one filling in: ONE calm moment (useCelebration: skippable, the
 *   session budget, shortened on repeats, static under Reduce Motion),
 *   never on a lesson already done before. Then "Practice this topic",
 *   "Read the note: …" (mobile 1.20: the study note that goes deeper) and
 *   "Next lesson". Its one light haptic goes with that moment (Learn then
 *   draws the ✓ without a second buzz).
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LessonBranch, type BotanyKind } from '../../components/glyphs';
import { ArrowRight, BookOpen, ICON_STROKE } from '../../components/icons';
import { SceneView } from '../../components/lesson';
import { Celebrate, FadeIn, PageTurn, useCelebration } from '../../components/motion';
import { useReportFlow } from '../../components/support';
import { Button, Gap, ICON_SIZE, PushedHeader, Row, SegmentBar, T, useFontScale } from '../../components/ui';
import { domainColor, getCertification } from '../../content/certifications';
import { findQuestion } from '../../content/loader';
import { findLesson, lessonsFor, nextLesson } from '../../content/lessons';
import type { Lesson } from '../../content/lessons/types';
import { noteDomain } from '../../content/notes';
import { createRng } from '../../engine/random';
import { displayToOriginal, lettersFor, makeCheckPermutation, type Permutation } from '../../engine/shuffle';
import { interleaveTopic } from '../../engine/studyModes';
import type { DomainInfo, Letter } from '../../content/types';
import { moveFocus, sayLater } from '../../lib/a11y';
import { logLesson } from '../../lib/activity';
import { haptic } from '../../lib/haptics';
import { noteLessonFinished } from '../../lib/lessonNews';
import { lessonNotes } from '../../lib/outline';
import { openSessionFromStack, openTab } from '../../lib/actions';
import { guardedStart, startFromIds, startPractice } from '../../lib/sessions';
import { useProgress } from '../../store/progress';
import { useSettings } from '../../store/settings';
import { motion, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** The page after the last scene. */
const DONE = 'done';
/** One empty list for every render (a fresh `[]` per store snapshot would re-render forever). */
const NONE: readonly string[] = [];
/** At this text size Lesson complete's actions scroll with the page instead of a pinned footer (as session.tsx). */
const HUGE_TEXT = 1.6;

/**
 * "Practice this topic" after a lesson: the questions the study notes list
 * for the lesson's outline topics, interleaved and capped (like a notes
 * topic), plus the bank items the lesson prepares for. Empty = none (the
 * button then practises the domain). Exported for tests.
 */
export function lessonPracticeIds(lesson: Lesson, seed = Date.now()): string[] {
  const exists = (id: string) => Boolean(findQuestion(lesson.certId, id));
  const topics = noteDomain(lesson.certId, lesson.domainId)?.topics.filter((t) => lesson.topics?.includes(t.id)) ?? [];
  const lists = topics.flatMap((t) => t.subtopics.map((st) => (st.practiceIds ?? []).filter(exists)));
  const prepared = (lesson.prepares ?? []).filter(exists);
  const mixed = interleaveTopic([...lists, prepared], createRng(seed));
  return [...new Set(mixed)];
}

export default function LessonPlayer() {
  const { c } = useTheme();
  // Very large text (mobile 1.20): three stacked actions would crowd a pinned footer.
  const huge = useFontScale() >= HUGE_TEXT;
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = findLesson(String(id));
  const completeLesson = useProgress((s) => s.completeLesson);
  const [index, setIndex] = useState(0);
  // Lesson complete: shown after "Finish lesson". `fresh` = finished for the first time (only then is there a moment).
  const [finished, setFinished] = useState<{ fresh: boolean } | null>(null);
  const [checked, setChecked] = useState(false);
  const nextRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  // The page on screen: it changes at PageTurn's swap (before paint), so the footer follows the page, not the tap.
  const [onPage, setOnPage] = useState<string | number>(0);
  // The DISPLAY letter picked on this scene's check (for Report a problem), reset with `checked`.
  const [picked, setPicked] = useState<Letter | null>(null);
  const shuffleOn = useSettings((s) => s.shuffleOptions);
  // One option order per check, made ONCE when the lesson opens (useState's
  // initialiser runs only on the first render). Going Back and Next re-mounts
  // a check, but it keeps this same order for the whole viewing.
  const [perms] = useState<(Permutation | undefined)[]>(() => {
    const rng = shuffleOn ? createRng(Date.now()) : null;
    return (lesson?.scenes ?? []).map((s) => (s.type === 'check' ? makeCheckPermutation(s.options.length, rng) : undefined));
  });
  // Moving between scenes re-mounts the check unanswered, so reset the gate
  // too. Done in the same event as the move (not in an effect) so there is
  // no extra render with a stale gate.
  const goTo = (to: number) => {
    if (to === index) return;
    setIndex(to);
    setChecked(false);
    setPicked(null);
  };
  const total = lesson?.scenes.length ?? 0;
  const pageId: string | number = finished ? DONE : index;
  // At the swap (before the new page is painted): back to the top, and the controls follow the page.
  const onSwap = useCallback((to: string | number) => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setOnPage(to);
  }, []);
  // After a turn, say where we are (once, after a short pause so the turn doesn't cut it off).
  // Lesson complete says its own line.
  const firstPage = useRef(true);
  useEffect(() => {
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    if (pageId !== DONE) sayLater(`Scene ${Number(pageId) + 1} of ${total}`);
  }, [pageId, total]);

  // Report a problem (mobile 1.7). Since mobile 1.20 it shows only on a
  // check scene (once answered: it names that step, with its options in the
  // order shown; the email names the ORIGINAL letters) and on Lesson
  // complete (the whole lesson, no step), not on every scene.
  const cur = lesson?.scenes[index];
  const curPerm = cur?.type === 'check' ? (perms[index] ?? lettersFor(cur.options.length)) : undefined;
  const report = useReportFlow(lesson?.certId ?? 'cisa', {
    kind: 'lesson',
    id: lesson?.id ?? String(id),
    name: lesson?.title,
    ...(finished ? {} : { step: index + 1 }),
    steps: lesson?.scenes.length,
    where: 'Lesson',
    ...(!finished && cur?.type === 'check' && curPerm
      ? {
          part: 'check',
          perm: curPerm,
          pickedDisplay: picked ?? undefined,
          options: lettersFor(cur.options.length).map((d) => ({ display: d, text: cur.options['ABCD'.indexOf(displayToOriginal(d, curPerm))] ?? '' })),
        }
      : {}),
  });

  if (!lesson) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: space.gutter, justifyContent: 'center' }}>
        <T v="headline" center>This lesson isn’t available.</T>
        <Gap />
        <Button label="Back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const cert = getCertification(lesson.certId);
  const domain = cert?.domains.find((d) => d.id === lesson.domainId);
  const toneIndex = domain?.tone ?? 0;
  // Until the new page is placed, the controls describe the page still on screen.
  const turning = onPage !== pageId;
  const showingDone = onPage === DONE;
  const shownIndex = typeof onPage === 'number' ? onPage : index;
  const scene = lesson.scenes[shownIndex];
  const isLast = shownIndex === total - 1;
  const canFinish = scene.type !== 'check' || checked || turning;

  const next = () => {
    if (turning) return;
    if (!isLast) {
      goTo(index + 1);
      return;
    }
    // Finishing: a lesson done before is not news (no moment for a repeat).
    const before = useProgress.getState().byCert[lesson.certId]?.lessonsDone ?? NONE;
    const fresh = !before.includes(lesson.id);
    // Learn draws the ✓ only for a lesson finished here, this app session (never one restored or synced).
    // Noted first: the store change below re-renders Learn.
    if (fresh) noteLessonFinished(lesson.id);
    completeLesson(lesson.certId, lesson.id);
    logLesson(lesson.certId, lesson.id);
    setFinished({ fresh });
  };
  const back = () => {
    if (turning) return;
    // Back to the first scene removes this button: keep screen-reader focus on Next.
    if (index === 1) moveFocus(nextRef);
    goTo(index - 1);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: space.gutter }}>
        <PushedHeader
          icon="close"
          onBack={() => router.back()}
          center={<SegmentBar total={total} done={showingDone ? total : shownIndex} current={showingDone ? total : shownIndex} />}
          right={
            showingDone ? undefined : (
              // Capped at ×1.3: at 200% "10/11" would not fit beside the progress bar (the slot grows from 44pt).
              <T v="meta" num maxFontSizeMultiplier={1.3} accessibilityLabel={`Scene ${shownIndex + 1} of ${total}`}>
                {`${shownIndex + 1}/${total}`}
              </T>
            )
          }
        />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: space.gutter, paddingTop: space.xl, paddingBottom: space.xl }}>
        <PageTurn
          id={pageId}
          direction={pageId === DONE ? 1 : undefined}
          onSwap={onSwap}
          style={{ flexGrow: 1 }}
          pageStyle={{ flexGrow: 1 }}
        >
          {pageId === DONE && finished ? (
            <View style={{ flexGrow: 1 }}>
              <LessonComplete lesson={lesson} domain={domain} fresh={finished.fresh} />
              {/* Very large text: the actions scroll with the page, so none is pushed off-screen. */}
              {huge && (
                <View style={{ marginTop: space.xl }}>
                  <CompleteActions lesson={lesson} domain={domain} />
                </View>
              )}
              {/* Report a problem with the lesson as a whole (mobile 1.20: here and on checks only). */}
              <View style={{ marginTop: space.lg, alignItems: 'flex-start' }}>
                {report.link}
                <View style={{ alignSelf: 'stretch' }}>{report.block}</View>
              </View>
            </View>
          ) : (
            <View style={{ flexGrow: 1 }}>
              <SceneView
                scene={lesson.scenes[index]}
                lesson={lesson}
                onCheck={(_ok, letter) => {
                  setChecked(true);
                  setPicked(letter);
                }}
                perm={perms[index]}
                art={`branch${toneIndex % 5}` as BotanyKind}
                tone={domainColor(toneIndex, true)}
              />
              {/* A quiet "Report a problem", on check scenes only (mobile 1.20: the other
                  scenes stay clear; Lesson complete has it too). It waits until the check
                  is answered, so it never hints at the answer, then arrives at once. */}
              {lesson.scenes[index].type === 'check' && checked && (
                <FadeIn build rise={false} delay={0}>
                  <View style={{ marginTop: space.xl, alignItems: 'flex-start' }}>
                    {report.link}
                    <View style={{ alignSelf: 'stretch' }}>{report.block}</View>
                  </View>
                </FadeIn>
              )}
              {index === total - 1 && (
                <>
                  <Gap h={space.xl} />
                  <T v="meta" color={c.muted}>
                    {`${lesson.provenance} Last reviewed ${lesson.lastReviewed}. Sources: ${lesson.references.join('; ')}.`}
                  </T>
                </>
              )}
            </View>
          )}
        </PageTurn>
      </ScrollView>

      {!(showingDone && huge) && (
        <View style={{ paddingHorizontal: space.gutter, paddingVertical: space.md, backgroundColor: c.bg }}>
          {showingDone ? (
            <CompleteActions lesson={lesson} domain={domain} />
          ) : (
            <Row gap={space.sm}>
              {/* No Back on the first scene (a disabled slab looked broken); Next takes the full width. */}
              {shownIndex > 0 && <Button kind="secondary" label="Back" onPress={back} style={{ flex: 1 }} />}
              {/* ONE keyed button whose label changes, so screen-reader focus stays on it. */}
              <Button key="next" ref={nextRef} label={isLast ? 'Finish lesson' : 'Next'} disabled={!canFinish} onPress={next} style={{ flex: 2 }} />
            </Row>
          )}
        </View>
      )}
      {report.sheet}
    </SafeAreaView>
  );
}

/**
 * Lesson complete (ui.md LP6): the domain's lessons as leaves on one
 * branch; the lesson just finished fills in. One celebration, calm and
 * short (T1), in words too: "A new leaf on your IS Audit branch: 3 of 7
 * lessons." A lesson finished before shows the branch still, with no moment.
 */
function LessonComplete({ lesson, domain, fresh }: { lesson: Lesson; domain: DomainInfo | undefined; fresh: boolean }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const done = useProgress((s) => s.byCert[lesson.certId]?.lessonsDone ?? NONE);
  const inDomain = lessonsFor(lesson.certId, lesson.domainId);
  const doneFlags = inDomain.map((l) => done.includes(l.id));
  const count = doneFlags.filter(Boolean).length;
  const at = inDomain.findIndex((l) => l.id === lesson.id);
  const name = domain?.short ?? 'this domain';
  const words =
    count >= inDomain.length
      ? `Every ${name} lesson is done.`
      : fresh
        ? `A new leaf on your ${name} branch: ${count} of ${inDomain.length} lessons.`
        : `${name}: ${count} of ${inDomain.length} lessons done.`;
  // Screen readers: the Finish button is gone at the swap, so focus moves to
  // this block, which says the whole moment in one stop (no separate
  // announcement, which would talk over it).
  const spoken = `Lesson complete: ${lesson.title}. ${words}`;
  const headRef = useRef<View>(null);
  useEffect(() => {
    moveFocus(headRef);
  }, []);
  // A first finish is the moment (once per lesson, within the session's budget); a repeat is just shown.
  const celebration = useCelebration('lesson-done', fresh, undefined, lesson.id);
  // One light haptic with the moment (T1), after it commits (never during a render React may replay); kept under Reduce Motion.
  useEffect(() => {
    if (celebration.run > 0) haptic.light();
  }, [celebration.run]);
  const branchW = Math.min(width - space.gutter * 2, 340);
  return (
    <Celebrate celebration={celebration} style={{ flexGrow: 1 }}>
      <View style={{ flexGrow: 1 }}>
        <View style={{ flex: 1, minHeight: space.sm, maxHeight: 120 }} />
        <View ref={headRef} accessible accessibilityRole="header" accessibilityLabel={spoken}>
          <T v="caption" color={c.accentText}>Lesson complete</T>
          <T v="hero" style={{ marginTop: space.xs }}>{lesson.title}</T>
          <View style={{ marginTop: space.xl, alignItems: 'center' }}>
            <LessonBranch
              total={inDomain.length}
              done={doneFlags}
              fresh={fresh && at >= 0 ? at : null}
              play={celebration.mode === 'full'}
              delay={motion.dur.screen}
              // Brand green, not the domain tone (tones are for dots and bars only).
              color={c.accent}
              width={branchW}
            />
          </View>
          <T v="body" color={c.ink2} style={{ marginTop: space.lg }}>
            {words}
          </T>
        </View>
        <View style={{ flex: 2 }} />
      </View>
    </Celebrate>
  );
}

/**
 * Lesson complete's footer: practise what was just learnt (primary), read the
 * note that goes deeper (mobile 1.20: the lesson's first note, else its first
 * topic's first note; BookOpen = notes), or go on to the next lesson.
 */
function CompleteActions({ lesson, domain }: { lesson: Lesson; domain: DomainInfo | undefined }) {
  const done = useProgress((s) => s.byCert[lesson.certId]?.lessonsDone ?? NONE);
  const after = nextLesson(lesson.certId, done, lesson.domainId);
  // Drawn once per screen (the order is shuffled), not on every render.
  const ids = useMemo(() => lessonPracticeIds(lesson), [lesson]);
  const note = lessonNotes(lesson.certId, lesson)[0];
  const practise = () =>
    guardedStart(
      () =>
        ids.length
          ? startFromIds(lesson.certId, ids, lesson.title)
          : startPractice(lesson.certId, { count: 10, domainId: lesson.domainId, title: `${domain?.short ?? 'Domain'} practice` }),
      // A lesson can be opened from a session ("Review the lesson"): start clean (lib/actions.ts).
      openSessionFromStack,
    );
  return (
    <View style={{ gap: space.sm }}>
      <Button
        label={ids.length ? 'Practice this topic' : `Practice ${domain?.short ?? 'this domain'}`}
        accessibilityHint={ids.length ? `Questions on ${lesson.title}` : undefined}
        onPress={practise}
      />
      {note && (
        <Button
          kind="ghost"
          // Short on screen (a long note name pushed Next lesson off at 200 % text); named when spoken.
          label="Read the note"
          accessibilityLabel={`Read the note: ${note.name}`}
          accessibilityHint="Opens the study note that goes deeper on this lesson"
          icon={(col) => <BookOpen size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
          iconLeading
          // Pushed, so Back returns to Lesson complete.
          onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(note.id)}`)}
        />
      )}
      {after ? (
        <Button
          kind="ghost"
          label="Next lesson"
          accessibilityHint={after.title}
          icon={(col) => <ArrowRight size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
          onPress={() => router.replace(`/lesson/${after.id}`)}
        />
      ) : (
        // To the Learn tab itself: Back would return to a session or note this lesson was opened from.
        <Button kind="ghost" label="Back to Learn" onPress={() => openTab('/learn')} />
      )}
    </View>
  );
}
