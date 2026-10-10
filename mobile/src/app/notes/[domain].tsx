/**
 * Study notes, one domain.
 *
 * Forest hero (the screen's one brand panel): domain dot · "26% of the
 * exam", the domain name, how much the learner has read, and the overview
 * clamped to 3 lines with a "More" toggle, so the first topic shows on the
 * first screen. The real-life analogy follows as plain text under the
 * panel. Below: the topics grouped by outline Part (A/B).
 * Each topic shows its overview, a "You should be able to" list, and its
 * subtopics with a read mark, then "Practice this topic" (Build E): the
 * questions of all its subtopics, interleaved (engine/studyModes.ts). The
 * domain's key terms fold away at the end.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { EmptyScreen } from '../../components/emptyScreen';
import { ChevronDown, ICON_STROKE } from '../../components/icons';
import { Bullets, ReadMark, TermList } from '../../components/notes';
import { Button, Enter, HeroPanel, ICON_SIZE, ListRow, PushedHeader, Row, Screen, Section, T } from '../../components/ui';
import { findQuestion } from '../../content/loader';
import { createRng } from '../../engine/random';
import { interleaveTopic } from '../../engine/studyModes';
import { guardedStart, startFromIds } from '../../lib/sessions';
import { domainColor } from '../../content/certifications';
import { noteDomain, noteSubtopics } from '../../content/notes';
import type { NoteTopic } from '../../content/notes/types';
import { readCount } from '../../engine/notesSearch';
import { useActiveCert } from '../../lib/useActiveCert';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { BotanyKind } from '../../components/glyphs';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/notes'));

export default function NotesDomain() {
  const { c } = useTheme();
  const { domain: domainId } = useLocalSearchParams<{ domain: string }>();
  const { cert, progress } = useActiveCert();
  const [termsOpen, setTermsOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const info = cert.domains.find((d) => d.id === domainId);
  const notes = info ? noteDomain(cert.id, info.id) : undefined;

  if (!info || !notes) {
    return <EmptyScreen header="Study notes" title="Notes not found" body="This domain has no study notes yet." primary={{ label: 'All study notes', onPress: () => router.replace('/notes') }} />;
  }

  const read = progress.notesRead;
  // "Practice this topic": every subtopic's listed questions (that still
  // exist), interleaved and capped. No questions → no button.
  const topicIds = (t: NoteTopic) => t.subtopics.map((st) => (st.practiceIds ?? []).filter((q) => findQuestion(cert.id, q)));
  const practiseTopic = (t: NoteTopic) =>
    guardedStart(
      () => startFromIds(cert.id, interleaveTopic(topicIds(t), createRng(Date.now())), t.name),
      () => router.push('/session'),
    );
  const ids = noteSubtopics(cert.id, info.id).map((s) => s.id);
  const done = readCount(ids, read);

  // Topics grouped by Part (A, B…). Topics no Part lists still show, last.
  const listed = new Set(notes.parts.flatMap((p) => p.topicIds));
  const byId = new Map(notes.topics.map((t) => [t.id, t]));
  const groups: { title: string; topics: NoteTopic[] }[] = notes.parts
    .map((p) => ({
      title: p.name ? `Part ${p.part} · ${p.name}` : `Part ${p.part}`,
      topics: p.topicIds.map((id) => byId.get(id)).filter((t): t is NoteTopic => Boolean(t)),
    }))
    .filter((g) => g.topics.length > 0);
  const rest = notes.topics.filter((t) => !listed.has(t.id));
  if (rest.length) groups.push({ title: groups.length ? 'More topics' : 'Topics', topics: rest });

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="Study notes" onBack={goBack} />
      <Enter i={0} style={{ marginTop: space.sm }}>
        <HeroPanel
          // On the forest panel the brighter (dark-mode) domain tone reads best.
          captionLead={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: domainColor(info.tone, true) }} />}
          caption={`Domain ${info.id} · ${info.weight}% of the exam`}
          title={info.name}
          meta={done === ids.length ? 'All read' : `${done} of ${ids.length} read`}
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
                <T v="label" color={c.onForest}>{overviewOpen ? 'Less' : 'More'}</T>
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
            {g.topics.map((t) => (
              <View key={t.id} style={{ marginTop: space.lg }}>
                <T v="caption" color={c.accentText}>{t.id}</T>
                <T v="headline" accessibilityRole="header">{t.name}</T>
                {t.overview ? <T v="body" color={c.ink2} style={{ marginTop: space.xs }}>{t.overview}</T> : null}
                {t.canDo.length > 0 && (
                  <View style={{ marginTop: space.md }}>
                    <T v="caption">You should be able to</T>
                    <Bullets items={t.canDo} color={c.ink2} />
                  </View>
                )}
                <View style={{ marginTop: space.sm }}>
                  {t.subtopics.map((s, i) => {
                    const isRead = read.includes(s.id);
                    return (
                      <ListRow
                        key={s.id}
                        title={s.name}
                        subtitle={isRead ? 'Read' : 'Not read yet'}
                        trailing={<ReadMark read={isRead} />}
                        accessibilityLabel={`${s.name}, ${isRead ? 'read' : 'not read yet'}`}
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
                    accessibilityHint={`Starts a practice set mixing every part of ${t.name}`}
                    onPress={() => practiseTopic(t)}
                    style={{ marginTop: space.md }}
                  />
                )}
              </View>
            ))}
          </View>
        ))}

        {notes.keyTerms.length > 0 && (
          <View style={{ marginTop: space.section }}>
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
                <View style={{ transform: [{ rotate: termsOpen ? '0deg' : '-90deg' }] }}>
                  <ChevronDown size={ICON_SIZE.row} color={c.muted} strokeWidth={ICON_STROKE} />
                </View>
              </Row>
            </Pressable>
            {termsOpen && <TermList items={notes.keyTerms} />}
          </View>
        )}
      </Enter>
    </Screen>
  );
}
