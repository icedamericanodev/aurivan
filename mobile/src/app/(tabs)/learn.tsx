/**
 * Learn — short motion lessons (3–5 minutes each).
 * Spec: DESIGN_SYSTEM.md §11 "Learn":
 *   forest "Up next" lesson cover (domain dot + short name, the full lesson
 *   title, "3 min · 7 scenes", Start lesson, a branch drawn per domain) →
 *   "By domain": one collapsible group per domain (domain dot · short name
 *   · "2 of 7 done" · chevron), then its rows: serif order numeral · title ·
 *   state · status circle (done ✓ / available ▶).
 * Grouping keeps the list short when there are ~40 lessons: only the group
 * holding "Up next" starts open; the learner can open any other group.
 * Opening with ?domain=4 (e.g. from Today) puts that domain's next lesson
 * on the cover, and so opens that group.
 *
 * Study notes: one row under the cover opens the notes (every exam topic
 * in plain English). It hides itself while the app has no notes (the
 * notes pack stays empty until the v2 notes land).
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BookOpen, Check, ChevronDown, ICON_STROKE, Play } from '../../components/icons';
import { BigNum, DomainDot, Enter, HeroPanel, ICON_SIZE, ListRow, ProgressBar, Row, Screen, Section, T } from '../../components/ui';
import { domainColor } from '../../content/certifications';
import { lessonsFor, nextLesson } from '../../content/lessons';
import { hasNotes, noteSubtopics } from '../../content/notes';
import { readCount } from '../../engine/notesSearch';
import { useActiveCert } from '../../lib/useActiveCert';
import { radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { BotanyKind } from '../../components/glyphs';

export default function Learn() {
  const { c, isDark } = useTheme();
  const { cert, progress, readiness } = useActiveCert();
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
          />
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
                  <DomainDot domain={d} />
                  <T v="label" style={{ flex: 1 }}>{d.short}</T>
                  <T v="meta" num>{progressText}</T>
                  {/* Chevron points down when open, right when closed. */}
                  <View style={{ transform: [{ rotate: isOpen ? '0deg' : '-90deg' }] }}>
                    <ChevronDown size={ICON_SIZE.row} color={c.muted} strokeWidth={ICON_STROKE} />
                  </View>
                </Row>
                <View style={{ marginTop: space.sm, marginLeft: space.lg }}>
                  <ProgressBar value={items.length ? groupDone / items.length : 0} color={domainColor(d.tone, isDark)} height={3} />
                </View>
              </Pressable>
              {isOpen &&
                items.map((l, i) => {
                  const isDone = done(l.id);
                  const isNext = upNext?.id === l.id;
                  const state = isDone ? 'done' : isNext ? 'up next' : `${l.minutes} min`;
                  return (
                    <ListRow
                      key={l.id}
                      lead={
                        // minWidth (not width) so "10" and large text never clip (spec: lead 40).
                        <View style={{ minWidth: 40 }}>
                          <BigNum value={String(i + 1)} size={22} color={c.ink2} />
                        </View>
                      }
                      title={l.title}
                      subtitle={state}
                      chevron={false}
                      trailing={
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: radius.pill,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isDone ? c.accent : 'transparent',
                            borderWidth: isDone ? 0 : 1.5,
                            borderColor: c.control,
                          }}
                        >
                          {isDone ? <Check size={16} color={c.bg} strokeWidth={2.5} /> : play(c.ink2, 12)}
                        </View>
                      }
                      accessibilityLabel={`${d.short} lesson ${i + 1}: ${l.title}, ${state}`}
                      onPress={() => router.push(`/lesson/${l.id}`)}
                      // Keep the hairline under the last row unless it is the last group.
                      last={lastGroup && i === items.length - 1}
                    />
                  );
                })}
            </View>
          );
        })}
        <T v="meta" style={{ marginTop: space.md }}>One lesson for every topic in the CISA exam outline.</T>
        <T v="meta" color={c.muted} style={{ marginTop: space.xs }}>Original content, reviewed against public frameworks.</T>
      </Enter>
    </Screen>
  );
}
