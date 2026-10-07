/**
 * Learn — three-minute motion lessons.
 * Spec: DESIGN_SYSTEM.md §11 "Learn":
 *   forest "Up next" lesson cover (domain dot + short name, the full lesson
 *   title, "3 min · 7 scenes", Start lesson, a branch drawn per domain) →
 *   "By domain" list: serif order numeral · title · domain dot + state ·
 *   status circle (done ✓ / available ▶).
 * Opening with ?domain=4 (e.g. from Today) puts that domain's next lesson
 * on the cover.
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { Check, ICON_STROKE, Play } from '../../components/icons';
import { BigNum, DomainDot, Enter, HeroPanel, ICON_SIZE, ListRow, Row, Screen, Section, T } from '../../components/ui';
import { domainColor } from '../../content/certifications';
import { lessonsFor, nextLesson } from '../../content/lessons';
import { useActiveCert } from '../../lib/useActiveCert';
import { radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { BotanyKind } from '../../components/glyphs';

export default function Learn() {
  const { c } = useTheme();
  const { cert, progress, readiness } = useActiveCert();
  const { domain } = useLocalSearchParams<{ domain?: string }>();
  // Learn is a tab, so the param would stick; clear it when the learner leaves.
  useFocusEffect(useCallback(() => () => router.setParams({ domain: undefined }), []));

  const lessons = lessonsFor(cert.id);
  const done = (id: string) => progress.lessonsDone.includes(id);
  const upNext = nextLesson(cert.id, progress.lessonsDone, domain ?? readiness.focusDomainId ?? undefined);
  const upDomain = upNext ? cert.domains.find((d) => d.id === upNext.domainId) : undefined;
  const doneCount = lessons.filter((l) => done(l.id)).length;
  const play = (col: string, size: number = ICON_SIZE.inline) => <Play size={size} color={col} strokeWidth={ICON_STROKE} />;

  return (
    <Screen>
      <Enter i={0}>
        <T v="display" accessibilityRole="header" style={{ marginTop: space.xs }}>Learn</T>
        <T v="meta" style={{ marginTop: space.xs }}>Three-minute lessons, one idea each.</T>
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
          <HeroPanel caption="All caught up" title="Every lesson done" meta="More lessons are on the way." art="branch1" />
        )}
      </Enter>

      <Enter i={2}>
        <Section title="By domain" meta={`${doneCount} of ${lessons.length} done`} />
        {lessons.map((l, i) => {
          const d = cert.domains.find((x) => x.id === l.domainId)!;
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
              subtitle={
                <Row gap={6}>
                  <DomainDot domain={d} />
                  <T v="meta" style={{ flexShrink: 1 }}>{`${d.short} · ${state}`}</T>
                </Row>
              }
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
              accessibilityLabel={`Lesson ${i + 1}: ${l.title}, ${d.short}, ${state}`}
              onPress={() => router.push(`/lesson/${l.id}`)}
              last={i === lessons.length - 1}
            />
          );
        })}
        <T v="meta" style={{ marginTop: space.md }}>More lessons are on the way.</T>
        <T v="meta" color={c.muted} style={{ marginTop: space.xs }}>Original content, reviewed against public frameworks.</T>
      </Enter>
    </Screen>
  );
}
