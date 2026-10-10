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
 * Route: /guided?domain=4 (no domain = All domains).
 */
import { router, useLocalSearchParams } from 'expo-router';
import { AccessibilityInfo, View } from 'react-native';
import { EmptyScreen } from '../components/emptyScreen';
import { Check, ICON_STROKE, Play } from '../components/icons';
import { ReadMark } from '../components/notes';
import { Button, Enter, Gap, ICON_SIZE, ListRow, PushedHeader, Row, Screen, Section, T, Tag } from '../components/ui';
import { scopeKey, MODE_INFO } from '../engine/studyModes';
import { CLEAR_OF, CLEAR_RIGHT, currentGuidedTopic, GUIDED_BLOCK, GUIDED_TAIL, nextTopic } from '../engine/studyPath';
import { guidedStatus, scopeTopics, topicLessons } from '../lib/outline';
import { guardedStart, startGuidedStep } from '../lib/sessions';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/practice'));

export default function GuidedStep() {
  const { c } = useTheme();
  const { domain: domainParam } = useLocalSearchParams<{ domain?: string }>();
  const { cert, progress } = useActiveCert();
  const scopeDomain = cert.domains.find((d) => d.id === domainParam);
  const topics = scopeTopics(cert.id, scopeDomain?.id);
  const scope = scopeKey(scopeDomain?.id);
  const topic = currentGuidedTopic(topics, progress.studyPath?.guided?.[scope], (t) => guidedStatus(cert.id, t, progress).clear);

  if (!topic) {
    return (
      <EmptyScreen
        header="Guided"
        title="Guided is on the way"
        body="It follows the study notes, which this exam doesn't have yet. Smart and Random are ready in the meantime."
        primary={{ label: 'Back to Practice', onPress: goBack }}
      />
    );
  }

  const domain = cert.domains.find((d) => d.id === topic.domainId);
  const status = guidedStatus(cert.id, topic, progress);
  const lessons = topicLessons(cert.id, topic.id);
  const next = nextTopic(topics, topic);
  const first = topics.indexOf(topic) === 0;
  const setCursor = (id: string) => useProgress.getState().setPathCursor(cert.id, 'guided', scope, id);

  const start = () =>
    guardedStart(
      () => {
        // Remember the topic, so Guided comes back to it.
        setCursor(topic.id);
        return startGuidedStep(cert.id, topic.id, scopeDomain?.id);
      },
      () => router.push('/session'),
    );
  const moveOn = () => {
    if (!next || next.id === topic.id) return;
    setCursor(next.id);
    AccessibilityInfo.announceForAccessibility(`Next topic: ${next.name}`);
  };

  const clearLine = status.clear
    ? 'Topic clear. Move on whenever you like; it comes back in Smart as a refresher.'
    : `${status.studied ? `${lessons.length ? 'Lesson' : 'Notes'} done. To clear it,` : `To clear it, ${lessons.length ? 'finish the lesson' : 'read its notes'} and`} get ${CLEAR_RIGHT} of your last ${CLEAR_OF} answers here right${
        status.answered ? ` (so far ${status.right} of ${status.answered})` : ''
      }. You can move on at any time.`;

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="Guided" onBack={goBack} />
      <Enter i={0}>
        {domain ? <Tag domain={domain} label={`${topic.id} · ${domain.short}`} /> : <T v="meta">{topic.id}</T>}
        <T v="hero" accessibilityRole="header" style={{ marginTop: space.sm }}>{topic.name}</T>
        <T v="meta" style={{ marginTop: space.xs }}>{MODE_INFO.guided.why}</T>
      </Enter>

      <Enter i={1}>
        <Section title="1 · Learn it" meta={status.studied ? 'Done' : lessons.length ? 'Lesson' : 'Study notes'} />
        {lessons.length > 0
          ? lessons.map((l, i) => {
              const done = progress.lessonsDone.includes(l.id);
              return (
                <ListRow
                  key={l.id}
                  title={l.title}
                  subtitle={`${l.minutes} min lesson · ${done ? 'Done' : 'Not done yet'}`}
                  trailing={<ReadMark read={done} />}
                  accessibilityLabel={`Lesson: ${l.title}, ${l.minutes} minutes, ${done ? 'done' : 'not done yet'}`}
                  onPress={() => router.push(`/lesson/${l.id}`)}
                  last={i === lessons.length - 1}
                />
              );
            })
          : topic.subtopics.map((s, i) => {
              const read = progress.notesRead.includes(s.id);
              return (
                <ListRow
                  key={s.id}
                  title={s.name}
                  subtitle={read ? 'Read' : 'Not read yet'}
                  trailing={<ReadMark read={read} />}
                  accessibilityLabel={`Study note: ${s.name}, ${read ? 'read' : 'not read yet'}`}
                  onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(s.id)}`)}
                  last={i === topic.subtopics.length - 1}
                />
              );
            })}

        <Section title="2 · Practice it" />
        <T v="body" color={c.ink2} style={{ marginTop: space.xs }}>{`${GUIDED_BLOCK} questions on this topic, foundational first, then application.`}</T>
        <Section title="3 · Mix it" />
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
        <Gap h={space.lg} />
        <Button
          label="Start this step"
          accessibilityHint={first ? `${GUIDED_BLOCK} questions on ${topic.name}` : `${GUIDED_BLOCK} questions on ${topic.name}, then ${GUIDED_TAIL} from earlier topics`}
          icon={(col) => <Play size={ICON_SIZE.inline} color={col} strokeWidth={ICON_STROKE} />}
          onPress={start}
        />
        {next && next.id !== topic.id && (
          <>
            <Gap h={space.sm} />
            <Button kind="ghost" label={`Next topic: ${next.name}`} accessibilityHint="Moves on. Topics are never locked." onPress={moveOn} />
          </>
        )}
      </Enter>
    </Screen>
  );
}
