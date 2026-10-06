/**
 * Learn — domains and their motion lessons. Opening from the Journey route
 * (?domain=4) scrolls the learner straight to that domain.
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { Check, ICON_STROKE, Lock } from '../../components/icons';
import { Card, DomainDot, Gap, ICON_SIZE, Pill, ProgressBar, Row, Screen, T } from '../../components/ui';
import { domainColor } from '../../content/certifications';
import { lessonsFor } from '../../content/lessons';
import { useActiveCert } from '../../lib/useActiveCert';
import { radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function Learn() {
  const { c, isDark } = useTheme();
  const { cert, progress, readiness } = useActiveCert();
  const { domain } = useLocalSearchParams<{ domain?: string }>();
  // Put the requested domain first, keep the rest in blueprint order.
  const match = cert.domains.find((d) => d.id === domain);
  const domains = match ? [match, ...cert.domains.filter((d) => d !== match)] : cert.domains;
  // Learn is a tab, so the param would stick; clear it when the learner leaves.
  useFocusEffect(useCallback(() => () => router.setParams({ domain: undefined }), []));

  return (
    <Screen>
      <T v="display">Learn</T>
      <T v="meta">Three-minute lessons, one idea each.</T>
      <Gap />

      {domains.map((d) => {
        const lessons = lessonsFor(cert.id, d.id);
        const done = lessons.filter((l) => progress.lessonsDone.includes(l.id)).length;
        const mastery = readiness.domains.find((x) => x.domainId === d.id)?.mastery ?? 0;
        return (
          <Card key={d.id} emphasis={d.id === domain} style={{ marginBottom: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={space.sm}>
                <DomainDot domain={d} />
                <T v="eyebrow" num>{`Domain ${d.id} · ${d.weight}%`}</T>
              </Row>
              <T v="meta" num>{`${done}/${lessons.length} lessons`}</T>
            </Row>
            <Gap h={space.xs} />
            <T v="title">{d.name}</T>
            <Gap h={space.sm} />
            <ProgressBar value={mastery} color={domainColor(d.tone, isDark)} height={4} />
            <Gap h={space.md} />
            {lessons.map((l) => {
              const isDone = progress.lessonsDone.includes(l.id);
              return (
                <Card
                  key={l.id}
                  onPress={() => router.push(`/lesson/${l.id}`)}
                  accessibilityLabel={`${l.title}, ${l.minutes} minutes${isDone ? ', completed' : ''}`}
                  style={{ backgroundColor: c.surface2, borderColor: c.surface2, padding: space.md, marginBottom: space.sm }}
                >
                  <Row gap={space.md}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: radius.pill,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDone ? c.accent : c.surface,
                        borderWidth: isDone ? 0 : 1,
                        borderColor: c.accent,
                      }}
                    >
                      {isDone ? (
                        <Check size={ICON_SIZE.inline} color={c.ink} strokeWidth={ICON_STROKE} />
                      ) : (
                        <T v="label" color={c.accentText}>▶</T>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <T v="label">{l.title}</T>
                      <T v="meta" num>{`${l.minutes} min · ${l.scenes.length} scenes`}</T>
                    </View>
                  </Row>
                </Card>
              );
            })}
            <Row gap={space.sm} style={{ marginTop: space.xs }}>
              <Lock size={ICON_SIZE.inline} color={c.muted} strokeWidth={ICON_STROKE} />
              <T v="meta">More lessons coming.</T>
            </Row>
          </Card>
        );
      })}
      <Pill label="Original content · reviewed against public frameworks" />
    </Screen>
  );
}
