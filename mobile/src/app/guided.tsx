/**
 * Guided — one step on one outline topic (Build E; engine/studyPath.ts).
 *
 * Plain English for the founder. Guided follows the Learn path, topic by
 * topic, in the order of the study notes. Each step has three parts:
 *   1. Learn it: the topic's lesson (or its study notes when it has none);
 *   2. Practice it: 5 questions on the topic, foundational first;
 *   3. Mix it: 3 questions from topics already done (from the 2nd topic on).
 * Parts 2 and 3 are one practice session ("Start this step").
 * A topic is clear when its lesson is done and 4 of the last 5 unassisted
 * answers on it are right. "Next topic" is ALWAYS available: Guided never
 * locks a topic behind a score (an uncleared topic stays a Smart weak spot).
 *
 * Route: /guided?domain=4&timed=1
 *   domain: no domain = All domains.
 *   timed:  "1" = timed, "0" = untimed (Practice's own Timed switch, and
 *           Results keeping the last step's choice). Left out = the Study
 *           default in Settings.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { PageTurn } from '../components/motion';
import { ArrowRight, BookOpen, Check, ICON_STROKE, Play } from '../components/icons';
import { ReadMark } from '../components/notes';
import { StickyFooter } from '../components/quiz';
import { Button, Enter, Gap, ICON_SIZE, ListRow, PushedHeader, Row, Section, T, Tag } from '../components/ui';
import { scopeKey, MODE_INFO } from '../engine/studyModes';
import { noteReadState, readStateLabel, readStateWords } from '../engine/noteReadState';
import { readMarkKey } from '../lib/noteNews';
import { CLEAR_OF, CLEAR_RIGHT, currentGuidedTopic, GUIDED_BLOCK, GUIDED_TAIL, nextTopic } from '../engine/studyPath';
import { guidedStatus, scopeTopics, topicLessons } from '../lib/outline';
import { moveFocus } from '../lib/a11y';
import { guardedStart, startGuidedStep } from '../lib/sessions';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/practice'));

/** The `timed` route param as the session option: "1" on, "0" off, anything else = the Study default. */
function timedParam(v: string | undefined): boolean | undefined {
  return v === '1' ? true : v === '0' ? false : undefined;
}

/**
 * A step's section title, spoken as "Step 1: Learn it" (the visible "1 · "
 * would be read as "1 dot"). The meta, when there is one, is read after it.
 */
function StepTitle({ n, title, meta }: { n: number; title: string; meta?: string }) {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={`Step ${n}: ${title}${meta ? `, ${meta}` : ''}`}>
      <Section title={`${n} · ${title}`} meta={meta} />
    </View>
  );
}

export default function GuidedStep() {
  const { c } = useTheme();
  const { domain: domainParam, timed: timedRaw } = useLocalSearchParams<{ domain?: string; timed?: string }>();
  const timed = timedParam(timedRaw);
  const [footerH, setFooterH] = useState(120);
  // "Next topic" turns the page (spec §8): the new topic arrives from the
  // right, read from the top (the scroll resets while nothing is visible),
  // and screen-reader focus moves to its title (the button that was tapped
  // belonged to the old page).
  const scrollRef = useRef<ScrollView>(null);
  const titleRef = useRef<View>(null);
  const onSwap = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    moveFocus(titleRef);
  }, []);
  // While the old topic is still leaving, "Start this step" ignores taps: it
  // would start the new topic before the learner has seen it.
  const [turning, setTurning] = useState(false);
  const onTurning = useCallback((from: string | number | null) => setTurning(from !== null), []);
  const { cert, progress } = useActiveCert();
  const scopeDomain = cert.domains.find((d) => d.id === domainParam);
  const topics = scopeTopics(cert.id, scopeDomain?.id);
  const scope = scopeKey(scopeDomain?.id);
  const topic = currentGuidedTopic(topics, progress.studyPath?.guided?.[scope], (t) => guidedStatus(cert.id, t, progress).clear);

  if (!topic) {
    return (
      <EmptyScreen
        header="Guided"
        fallback="/practice"
        title="Guided is on the way"
        body="It follows the study notes, which this exam doesn't have yet. Smart and Random are ready in the meantime."
        primary={{ label: 'Back to Practice', onPress: goBack }}
      />
    );
  }

  const domain = cert.domains.find((d) => d.id === topic.domainId);
  const status = guidedStatus(cert.id, topic, progress);
  const lessons = topicLessons(cert.id, topic.id);
  // The next topic that isn't clear yet (or simply the next one). Guided
  // lands exactly there, because the saved topic always wins.
  const next = nextTopic(topics, topic, (t) => guidedStatus(cert.id, t, progress).clear);
  const first = topics.indexOf(topic) === 0;
  const setCursor = (id: string) => useProgress.getState().setPathCursor(cert.id, 'guided', scope, id);

  const start = () =>
    guardedStart(
      () => {
        // Remember the topic, so Guided comes back to it.
        setCursor(topic.id);
        return startGuidedStep(cert.id, topic.id, scopeDomain?.id, timed);
      },
      () => router.push('/session'),
    );
  const moveOn = () => {
    if (!next || next.id === topic.id) return;
    setCursor(next.id);
  };

  const clearLine = status.clear
    ? 'Topic clear. Move on whenever you like; it comes back in Smart as a refresher.'
    : `${status.studied ? `${lessons.length ? 'Lesson' : 'Notes'} done. To clear it,` : `To clear it, ${lessons.length ? 'finish the lesson' : 'read its notes'} and`} get ${CLEAR_RIGHT} of your last ${CLEAR_OF} answers here right${
        status.answered ? ` (so far ${status.right} of ${status.answered})` : ''
      }. You can move on at any time.`;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}>
      <PushedHeader title="Guided" onBack={goBack} />
      <PageTurn id={topic.id} direction={1} onSwap={onSwap} onTurning={onTurning}>
      <Enter i={0}>
        {domain ? <Tag domain={domain} label={`${topic.id} · ${domain.short}`} /> : <T v="meta">{topic.id}</T>}
        {/* A View, so focus can be moved here after a turn (T takes no ref). */}
        <View ref={titleRef} accessible accessibilityRole="header" style={{ marginTop: space.sm }}>
          <T v="hero" accessibilityRole="header">{topic.name}</T>
        </View>
        <T v="meta" style={{ marginTop: space.xs }}>{MODE_INFO.guided.why}</T>
      </Enter>

      <Enter i={1}>
        <StepTitle n={1} title="Learn it" meta={status.studied ? 'Done' : lessons.length ? 'Lesson' : 'Study notes'} />
        {lessons.length > 0
          ? lessons.map((l, i) => {
              const done = progress.lessonsDone.includes(l.id);
              return (
                <ListRow
                  key={l.id}
                  // Mobile 1.20 icon rule: Play = a lesson, BookOpen = a study note.
                  icon={<Play size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                  title={l.title}
                  subtitle={`${l.minutes} min lesson · ${done ? 'Done' : 'Not done yet'}`}
                  // A lesson is done or not (two states): an empty ring or a full circle.
                  trailing={<ReadMark state={done ? 'read' : 'none'} />}
                  accessibilityLabel={`Lesson: ${l.title}, ${l.minutes} minutes, ${done ? 'done' : 'not done yet'}`}
                  onPress={() => router.push(`/lesson/${l.id}`)}
                  last={i === lessons.length - 1}
                />
              );
            })
          : topic.subtopics.map((s, i) => {
              // Mobile 1.25: not read yet, started (open 10 s) or read, as on the notes list.
              const state = noteReadState(s.id, progress.notesRead, progress.notesViewed);
              return (
                <ListRow
                  key={s.id}
                  icon={<BookOpen size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                  title={s.name}
                  subtitle={readStateWords(state)}
                  trailing={<ReadMark state={state} play={readMarkKey(cert.id, 'note', s.id)} />}
                  accessibilityLabel={`Study note: ${readStateLabel(s.name, state)}`}
                  onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(s.id)}`)}
                  last={i === topic.subtopics.length - 1}
                />
              );
            })}

        <StepTitle n={2} title="Practice it" />
        <T v="body" color={c.ink2} style={{ marginTop: space.xs }}>{`${GUIDED_BLOCK} questions on this topic, foundational first, then application.`}</T>
        <StepTitle n={3} title="Mix it" />
        <T v="body" color={c.ink2} style={{ marginTop: space.xs }}>
          {first
            ? `From your second topic on, ${GUIDED_TAIL} questions from topics you've done are mixed in.`
            : `${GUIDED_TAIL} questions from topics you've done, mixed. Coming back to them is what makes them stick.`}
        </T>
      </Enter>

      <Enter i={2} style={{ marginTop: space.xl }}>
        {/* Progress toward "clear": a quiet note block, never a lock. */}
        <View style={{ backgroundColor: status.clear ? c.correctBg : c.soft, borderRadius: radius.md, padding: space.lg }}>
          <Row gap={space.sm}>
            {status.clear && <Check size={ICON_SIZE.row} color={c.correct} strokeWidth={ICON_STROKE} />}
            <T v="caption" color={status.clear ? c.correct : c.accentText}>{status.clear ? 'Topic clear' : 'Not clear yet'}</T>
          </Row>
          <T v="small" style={{ marginTop: space.xs }}>{clearLine}</T>
        </View>
        {/* "Next topic" stays in the scroll; "Start this step" is the sticky primary. */}
        {next && next.id !== topic.id && (
          <>
            <Gap h={space.sm} />
            <Button kind="ghost" label={`Next topic: ${next.name}`} accessibilityHint="Moves on. Topics are never locked." onPress={moveOn} />
          </>
        )}
      </Enter>
      </PageTurn>
      </ScrollView>
      <StickyFooter onHeight={setFooterH}>
        <Button
          label="Start this step"
          accessibilityHint={first ? `${GUIDED_BLOCK} questions on ${topic.name}` : `${GUIDED_BLOCK} questions on ${topic.name}, then ${GUIDED_TAIL} from earlier topics`}
          icon={(col) => <ArrowRight size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
          onPress={() => {
            if (!turning) start();
          }}
        />
      </StickyFooter>
    </SafeAreaView>
  );
}
