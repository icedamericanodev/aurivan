/**
 * Learn — domains and their motion lessons. Opening from the Journey route
 * (?domain=4) scrolls the learner straight to that domain.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Check, ICON_STROKE, Lock } from '../../components/icons';
import { Card, Gap, Pill, ProgressBar, Row, Screen, T } from '../../components/ui';
import { lessonsFor } from '../../content/lessons';
import { useActiveCert } from '../../lib/useActiveCert';
import { radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function Learn() {
  const { c } = useTheme();
  const { cert, progress, readiness } = useActiveCert();
  const { domain } = useLocalSearchParams<{ domain?: string }>();
  const domains = domain ? [...cert.domains].sort((a) => (a.id === domain ? -1 : 0)) : cert.domains;

  return (
    <Screen>
      <T v="title">Learn</T>
      <T color={c.text2}>Short animated lessons that build the concept, name the trap, then check it.</T>
      <Gap />

      {domains.map((d) => {
        const lessons = lessonsFor(cert.id, d.id);
        const done = lessons.filter((l) => progress.lessonsDone.includes(l.id)).length;
        const mastery = readiness.domains.find((x) => x.domainId === d.id)?.mastery ?? 0;
        return (
          <Card key={d.id} style={{ marginBottom: space.md, borderColor: d.id === domain ? c.accent : c.border }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={6}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
                <T v="mono" color={c.text2}>{`DOMAIN ${d.id} · ${d.weight}%`}</T>
              </Row>
              <T v="caption">{`${done}/${lessons.length} lessons`}</T>
            </Row>
            <Gap h={space.xs} />
            <T v="heading">{d.name}</T>
            <Gap h={space.sm} />
            <ProgressBar value={mastery} color={d.color} height={4} />
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
                        backgroundColor: isDone ? c.teal : c.accentFill,
                      }}
                    >
                      {isDone ? (
                        <Check size={16} color={c.bg} strokeWidth={2.5} />
                      ) : (
                        <T v="label" color={c.onAccent}>▶</T>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <T v="label" style={{ fontSize: 15 }}>{l.title}</T>
                      <T v="caption">{`${l.minutes} min · ${l.scenes.length} scenes`}</T>
                    </View>
                  </Row>
                </Card>
              );
            })}
            <Row gap={space.sm} style={{ marginTop: space.xs }}>
              <Lock size={14} color={c.muted} strokeWidth={ICON_STROKE} />
              <T v="caption">More lessons for this domain are in production.</T>
            </Row>
          </Card>
        );
      })}
      <Pill label="Original content · reviewed against public frameworks" />
    </Screen>
  );
}
