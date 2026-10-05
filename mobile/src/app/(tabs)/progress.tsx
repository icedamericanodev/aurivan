/**
 * Progress — the honest picture: accuracy by domain, weak spots, and
 * mock-exam history.
 */
import { View } from 'react-native';
import { Card, Gap, ProgressBar, Row, Screen, Stat, T } from '../../components/ui';
import { useActiveCert } from '../../lib/useActiveCert';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function Progress() {
  const { c } = useTheme();
  const { cert, readiness, progress, streak } = useActiveCert();
  const answered = readiness.domains.reduce((s, d) => s + d.answered, 0);
  const mastered = readiness.domains.reduce((s, d) => s + d.mastered, 0);

  // Weak spots: domains with data, lowest accuracy first.
  const weak = readiness.domains
    .filter((d) => d.accuracy !== null && d.answered >= 5)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
    .slice(0, 2);

  return (
    <Screen>
      <T v="title">Progress</T>
      <Gap />
      <Card>
        <Row>
          <Stat value={String(answered)} label="answered" />
          <Stat value={answered ? `${Math.round((mastered / answered) * 100)}%` : '—'} label="accuracy" color={c.accentText} />
          <Stat value={String(streak)} label="day streak" color={c.tealText} />
        </Row>
      </Card>
      <Gap />

      <T v="label" color={c.text2}>By domain</T>
      <Gap h={space.sm} />
      {cert.domains.map((d) => {
        const dm = readiness.domains.find((x) => x.domainId === d.id)!;
        return (
          <Card key={d.id} style={{ marginBottom: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="heading" style={{ flex: 1 }}>{d.short}</T>
              <T v="label" color={c.text2}>
                {dm.accuracy === null ? 'Not started' : `${Math.round(dm.accuracy * 100)}% · ${dm.answered} done`}
              </T>
            </Row>
            <Gap h={space.sm} />
            <ProgressBar value={dm.accuracy ?? 0} color={d.color} />
          </Card>
        );
      })}

      {weak.length > 0 && (
        <>
          <Gap />
          <Card style={{ backgroundColor: c.warningBg, borderColor: c.warningBg }}>
            <T v="label" color={c.warning}>Weak spots</T>
            {weak.map((w) => (
              <T key={w.domainId}>
                • {cert.domains.find((d) => d.id === w.domainId)?.name} — {Math.round((w.accuracy ?? 0) * 100)}%
              </T>
            ))}
          </Card>
        </>
      )}

      <Gap />
      <T v="label" color={c.text2}>Mock exams</T>
      <Gap h={space.sm} />
      {progress.mocks.length === 0 ? (
        <Card>
          <T v="caption">No mocks yet. Try a mini mock when you have answered 50+ practice questions.</T>
        </Card>
      ) : (
        progress.mocks.slice(0, 10).map((m) => (
          <Card key={m.id} style={{ marginBottom: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <T v="heading">{Math.round((m.correct / m.total) * 100)}%</T>
                <T v="caption">{new Date(m.finishedAt).toLocaleDateString()} · {m.total} questions</T>
              </View>
              <T v="caption">{m.minutesUsed} min</T>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
