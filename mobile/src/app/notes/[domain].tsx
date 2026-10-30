/**
 * Study notes, one domain.
 *
 * Forest hero (the screen's one brand panel): domain dot · "26% of the
 * exam", the domain name, how much the learner has read, and the overview
 * clamped to 3 lines with a "More" toggle, so the first topic shows on the
 * first screen. The real-life analogy follows as plain text under the
 * panel. Below: the topics grouped by outline Part (A/B).
 * Mobile 1.20: each topic is a collapsible group (the same Collapse + Turn
 * pattern as Learn's domain groups): a header row (code, name, "2 of 5
 * read", chevron). Only the first topic with something unread when the page
 * opens starts open (chosen once, so it never snaps shut as notes are read),
 * so the page reads as a list, not a wall. Screen readers: each header is a
 * button with its expanded state (one role per element, so not also a
 * heading, as on Learn); the Part titles stay headings to jump between. Inside a group: the overview, a
 * "You should be able to" list, a "Lesson: …" row when a lesson teaches the
 * topic, its subtopics with a read mark, then "Practice this topic" (Build
 * E): the questions of all its subtopics, interleaved (engine/studyModes.ts).
 * Mobile 1.25: each subtopic's mark has three states ("fill the circle":
 * not read yet, started, read; engine/noteReadState.ts), and a note just
 * read fills its circle once when this page is back in view.
 * The domain's key terms fold away at the end.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { EmptyScreen } from '../../components/emptyScreen';
import { ChevronDown, ICON_STROKE, Play } from '../../components/icons';
import { Collapse, Turn } from '../../components/motion';
import { Bullets, ReadMark, TermList } from '../../components/notes';
import { Button, Enter, HeroPanel, ICON_SIZE, ListRow, PushedHeader, Row, Screen, Section, T, useFontScale } from '../../components/ui';
import { findQuestion } from '../../content/loader';
import { createRng } from '../../engine/random';
import { interleaveTopic } from '../../engine/studyModes';
import { openSessionFromStack } from '../../lib/actions';
import { guardedStart, startFromIds } from '../../lib/sessions';
import { domainColor } from '../../content/certifications';
import { noteDomain, noteSubtopics } from '../../content/notes';
import type { NoteDomain, NoteTopic } from '../../content/notes/types';
import { readCount, readProgressText } from '../../engine/notesSearch';
import { noteReadState, readStateLabel, readStateWords } from '../../engine/noteReadState';
import { readMarkKey } from '../../lib/noteNews';
import { topicLessons } from '../../lib/outline';
import { useActiveCert } from '../../lib/useActiveCert';
import { LARGE_TEXT, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { BotanyKind } from '../../components/glyphs';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/notes'));

/** The domain's topics grouped by Part (A, B…), in page order. Topics no Part lists still show, last. */
function topicGroups(notes: NoteDomain): { title: string; topics: NoteTopic[] }[] {
  const listed = new Set(notes.parts.flatMap((p) => p.topicIds));
  const byId = new Map(notes.topics.map((t) => [t.id, t]));
  const groups = notes.parts
    .map((p) => ({
      title: p.name ? `Part ${p.part} · ${p.name}` : `Part ${p.part}`,
      topics: p.topicIds.map((id) => byId.get(id)).filter((t): t is NoteTopic => Boolean(t)),
    }))
    .filter((g) => g.topics.length > 0);
  const rest = notes.topics.filter((t) => !listed.has(t.id));
  if (rest.length) groups.push({ title: groups.length ? 'More topics' : 'Topics', topics: rest });
  return groups;
}

/** The first topic, in page order, with a subtopic not yet read (none when all are read). */
function firstUnreadTopic(notes: NoteDomain, read: readonly string[]): string | undefined {
  return topicGroups(notes)
    .flatMap((g) => g.topics)
    .find((t) => t.subtopics.some((st) => !read.includes(st.id)))?.id;
}

export default function NotesDomain() {
  const { c } = useTheme();
  const { domain: domainId } = useLocalSearchParams<{ domain: string }>();
  const { cert, progress } = useActiveCert();
  const [termsOpen, setTermsOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  // Topics the learner opened or closed by hand; any other topic follows the default below.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  // Large text: a topic's "2 of 5 read" drops under its name instead of squeezing it.
  const large = useFontScale() >= LARGE_TEXT;
  const info = cert.domains.find((d) => d.id === domainId);
  const notes = info ? noteDomain(cert.id, info.id) : undefined;
  // The topic open by default, chosen ONCE when the page opens: reading the last
  // unread note of the open topic must not close it under the learner on the way
  // back. Hand toggles (above) still win.
  const [defaultOpen] = useState(() => (notes ? firstUnreadTopic(notes, progress.notesRead) : undefined));

  if (!info || !notes) {
    return <EmptyScreen header="Study notes" title="Notes not found" body="This domain has no study notes yet." primary={{ label: 'All study notes', onPress: () => router.replace('/notes') }} />;
  }

  const read = progress.notesRead;
  const viewed = progress.notesViewed;
  // "Practice this topic": every subtopic's listed questions (that still
  // exist), interleaved and capped. No questions → no button.
  const topicIds = (t: NoteTopic) => t.subtopics.map((st) => (st.practiceIds ?? []).filter((q) => findQuestion(cert.id, q)));
  const practiseTopic = (t: NoteTopic) =>
    guardedStart(
      () => startFromIds(cert.id, interleaveTopic(topicIds(t), createRng(Date.now())), t.name),
      // The notes can be reached from inside a session or Results: start clean (lib/actions.ts).
      openSessionFromStack,
    );
  const ids = noteSubtopics(cert.id, info.id).map((s) => s.id);
  const done = readCount(ids, read);

  const groups = topicGroups(notes);
  // Open: what the learner chose by hand, else only the default chosen on opening.
  const isOpenTopic = (topicId: string) => toggled[topicId] ?? topicId === defaultOpen;
  const toggleTopic = (topicId: string) => setToggled((tg) => ({ ...tg, [topicId]: !isOpenTopic(topicId) }));

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="Study notes" onBack={goBack} />
      <Enter i={0} style={{ marginTop: space.sm }}>
        <HeroPanel
          // On the forest panel the brighter (dark-mode) domain tone reads best.
          captionLead={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: domainColor(info.tone, true) }} />}
          caption={`Domain ${info.id} · ${info.weight}% of the exam`}
          title={info.name}
          meta={readProgressText(done, ids.length) ?? undefined}
          art={`branch${info.tone % 5}` as BotanyKind}
          sway={false}
          wideTitle
        >
          {notes.overview ? (
            <>
              {/* Clamped to 3 lines; screen readers still hear the whole overview. */}
              <T v="small" color={c.onForest} numberOfLines={overviewOpen ? undefined : 3} style={{ marginTop: space.md }}>
                {notes.overview}
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: overviewOpen }}
                accessibilityLabel={overviewOpen ? 'Show less of the overview' : 'Show the full overview'}
                onPress={() => setOverviewOpen(!overviewOpen)}
                hitSlop={4}
                style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}
              >
                <Row gap={space.xs}>
                  <T v="label" color={c.onForest}>{overviewOpen ? 'Less' : 'More'}</T>
                  {/* The chevron turns with it (what changed); the text itself just reflows. */}
                  <Turn deg={overviewOpen ? 180 : 0}>
                    <ChevronDown size={ICON_SIZE.inline} color={c.onForest} strokeWidth={ICON_STROKE} />
                  </Turn>
                </Row>
              </Pressable>
            </>
          ) : null}
        </HeroPanel>
      </Enter>

      {notes.analogy ? (
        <Enter i={1} style={{ marginTop: space.xl }}>
          <T v="caption" color={c.accentText}>Think of it like this</T>
          <T v="body" color={c.ink2} style={{ marginTop: space.xs }}>{notes.analogy}</T>
        </Enter>
      ) : null}

      <Enter i={1}>
        {groups.map((g) => (
          <View key={g.title}>
            <Section title={g.title} />
            {g.topics.map((t) => {
              const isOpen = isOpenTopic(t.id);
              const readHere = t.subtopics.filter((st) => read.includes(st.id)).length;
              const readText = readProgressText(readHere, t.subtopics.length);
              // The lesson that teaches this outline topic, if any (Play = lessons).
              const lesson = topicLessons(cert.id, t.id)[0];
              const lessonDone = lesson ? progress.lessonsDone.includes(lesson.id) : false;
              return (
                <View key={t.id} style={{ marginTop: space.sm }}>
                  {/* Topic header: tap to show or hide this topic (same look as Learn's domain groups). */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    accessibilityLabel={readText ? `${t.id} ${t.name}, ${readText}` : `${t.id} ${t.name}`}
                    accessibilityHint={isOpen ? 'Hides this topic' : 'Shows this topic'}
                    onPress={() => toggleTopic(t.id)}
                    style={({ pressed }) => ({
                      minHeight: 56,
                      paddingVertical: space.md,
                      justifyContent: 'center',
                      backgroundColor: pressed ? c.soft : 'transparent',
                      // A hairline under a closed topic; none under an open one (its content follows).
                      borderBottomWidth: isOpen ? 0 : 1,
                      borderBottomColor: c.line,
                    })}
                  >
                    <Row gap={space.sm}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T v="caption" color={c.accentText}>{t.id}</T>
                        <T v="label">{t.name}</T>
                        {large && readText && <T v="meta" num>{readText}</T>}
                      </View>
                      {!large && readText && <T v="meta" num>{readText}</T>}
                      {/* Chevron points down when open, right when closed; it turns when tapped. */}
                      <Turn deg={isOpen ? 0 : -90}>
                        <ChevronDown size={ICON_SIZE.row} color={c.muted} strokeWidth={ICON_STROKE} />
                      </Turn>
                    </Row>
                  </Pressable>
                  <Collapse open={isOpen} style={{ marginBottom: space.md }}>
                    {t.overview ? <T v="body" color={c.ink2}>{t.overview}</T> : null}
                    {t.canDo.length > 0 && (
                      <View style={{ marginTop: space.md }}>
                        <T v="caption">You should be able to</T>
                        <Bullets items={t.canDo} color={c.ink2} />
                      </View>
                    )}
                    {lesson && (
                      <View style={{ marginTop: space.sm }}>
                        <ListRow
                          icon={<Play size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
                          // The lesson's own title on screen (no double colon); the spoken label keeps "Lesson:".
                          title={lesson.title}
                          subtitle={`Lesson · ${lesson.minutes} min · ${lessonDone ? 'Done' : 'Not done yet'}`}
                          accessibilityLabel={`Lesson: ${lesson.title}, ${lesson.minutes} minutes, ${lessonDone ? 'done' : 'not done yet'}`}
                          accessibilityHint="Opens the short lesson on this topic"
                          onPress={() => router.push(`/lesson/${lesson.id}`)}
                          last
                        />
                      </View>
                    )}
                    <View style={{ marginTop: space.sm }}>
                      {t.subtopics.map((s, i) => {
                        // Not read yet, started (open 10 s) or read.
                        const state = noteReadState(s.id, read, viewed);
                        return (
                          <ListRow
                            key={s.id}
                            title={s.name}
                            subtitle={readStateWords(state)}
                            trailing={<ReadMark state={state} play={readMarkKey(cert.id, 'note', s.id)} />}
                            accessibilityLabel={readStateLabel(s.name, state)}
                            onPress={() => router.push(`/notes/subtopic/${encodeURIComponent(s.id)}`)}
                            last={i === t.subtopics.length - 1}
                          />
                        );
                      })}
                    </View>
                    {topicIds(t).some((l) => l.length > 0) && (
                      <Button
                        kind="secondary"
                        label="Practice this topic"
                        // Several of these buttons sit on one page: name the topic (UX review P4).
                        accessibilityLabel={`Practice this topic: ${t.name}`}
                        accessibilityHint={`Starts a practice set mixing every part of ${t.name}`}
                        onPress={() => practiseTopic(t)}
                        style={{ marginTop: space.md }}
                      />
                    )}
                  </Collapse>
                </View>
              );
            })}
          </View>
        ))}

        {notes.keyTerms.length > 0 && (
          <View style={{ marginTop: space.xxl }}>
            {/* Folded by default: 15–30 terms would bury the topic list. */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: termsOpen }}
              accessibilityLabel={`Domain key terms, ${notes.keyTerms.length} terms`}
              accessibilityHint={termsOpen ? 'Hides the terms' : 'Shows the terms'}
              onPress={() => setTermsOpen(!termsOpen)}
              style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', backgroundColor: pressed ? c.soft : 'transparent' })}
            >
              <Row gap={space.sm}>
                <T v="headline" style={{ flex: 1 }}>Domain key terms</T>
                <Turn deg={termsOpen ? 0 : -90}>
                  <ChevronDown size={ICON_SIZE.row} color={c.muted} strokeWidth={ICON_STROKE} />
                </Turn>
              </Row>
            </Pressable>
            <Collapse open={termsOpen}>
              <TermList items={notes.keyTerms} />
            </Collapse>
          </View>
        )}
      </Enter>
    </Screen>
  );
}
