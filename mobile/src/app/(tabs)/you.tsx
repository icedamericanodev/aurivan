/**
 * You — progress, study tools and settings in one calm place.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { ActionRow } from '../../components/journey';
import { Bookmark, Gauge, ICON_STROKE, NotebookPen, Settings } from '../../components/icons';
import { Card, Gap, ProgressBar, Row, Screen, Stat, T } from '../../components/ui';
import { guardedStart, startBookmarks } from '../../lib/sessions';
import { useActiveCert } from '../../lib/useActiveCert';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function You() {
  const { c } = useTheme();
  const { cert, readiness, progress, streak } = useActiveCert();
  const answered = readiness.domains.reduce((s, d) => s + d.answered, 0);
  const mastered = readiness.domains.reduce((s, d) => s + d.mastered, 0);
  const openMistakes = Object.values(progress.mistakes).filter((m) => !m.resolved).length;
  const icon = (G: typeof Gauge) => <G size={20} color={c.accentText} strokeWidth={ICON_STROKE} />;

  return (
    <Screen>
      <T v="title">You</T>
      <Gap />
      <Card>
        <Row>
          <Stat value={String(answered)} label="answered" />
          <Stat value={answered ? `${Math.round((mastered / answered) * 100)}%` : '—'} label="accuracy" color={c.accentText} />
          <Stat value={String(streak)} label="day streak" color={c.tealText} />
        </Row>
      </Card>
      <Gap />

      <T v="label" color={c.text2}>Study tools</T>
      <Card style={{ paddingVertical: space.xs }}>
        <ActionRow
          icon={icon(NotebookPen)}
          title="Mistake journal"
          subtitle="Every miss, with why — tag the thinking slip"
          right={openMistakes ? `${openMistakes} open` : undefined}
          onPress={() => router.push('/mistakes')}
        />
        <ActionRow
          icon={icon(Bookmark)}
          title="Saved questions"
          subtitle={progress.bookmarks.length ? 'Practise your own revision set' : 'Tap ☆ Save on any question'}
          right={progress.bookmarks.length ? String(progress.bookmarks.length) : undefined}
          onPress={() => guardedStart(() => startBookmarks(cert.id), () => router.push('/session'))}
        />
        <ActionRow icon={icon(Settings)} title="Settings" subtitle="Exam, reminders, theme" onPress={() => router.push('/settings')} />
      </Card>
      <Gap />

      <T v="label" color={c.text2}>By domain</T>
      <Gap h={space.sm} />
      {cert.domains.map((d) => {
        const dm = readiness.domains.find((x) => x.domainId === d.id)!;
        return (
          <View key={d.id} style={{ marginBottom: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="label" style={{ flex: 1 }}>{d.short}</T>
              <T v="caption">{dm.accuracy === null ? 'Not started' : `${Math.round(dm.accuracy * 100)}% · ${dm.answered} done`}</T>
            </Row>
            <Gap h={space.xs} />
            <ProgressBar value={dm.accuracy ?? 0} color={d.color} height={6} />
          </View>
        );
      })}

      <Gap h={space.sm} />
      <T v="label" color={c.text2}>Mock exams</T>
      <Gap h={space.sm} />
      {progress.mocks.length === 0 ? (
        <Card>
          <T v="caption">No mocks yet. Your Journey will suggest one when every domain is warming up.</T>
        </Card>
      ) : (
        progress.mocks.slice(0, 10).map((m) => (
          <Card key={m.id} style={{ marginBottom: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <T v="heading">{Math.round((m.correct / m.total) * 100)}%</T>
                <T v="caption">{`${new Date(m.finishedAt).toLocaleDateString()} · ${m.total} questions`}</T>
              </View>
              <T v="caption">{`${m.minutesUsed} min`}</T>
            </Row>
          </Card>
        ))
      )}
      <Gap />
      <T v="caption" center>{cert.trademarkNotice}</T>
    </Screen>
  );
}
