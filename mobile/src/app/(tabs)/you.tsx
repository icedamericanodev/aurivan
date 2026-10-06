/**
 * You — progress, study tools and settings in one calm place.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { ActionRow } from '../../components/journey';
import { Bookmark, Gauge, ICON_STROKE, NotebookPen, Settings } from '../../components/icons';
import { Card, Gap, ICON_SIZE, ProgressBar, Row, Screen, Stat, T } from '../../components/ui';
import { domainColor } from '../../content/certifications';
import { shortDate } from '../../lib/format';
import { guardedStart, startBookmarks } from '../../lib/sessions';
import { useActiveCert } from '../../lib/useActiveCert';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function You() {
  const { c, isDark } = useTheme();
  const { cert, readiness, progress, streak } = useActiveCert();
  const answered = readiness.domains.reduce((s, d) => s + d.answered, 0);
  const mastered = readiness.domains.reduce((s, d) => s + d.mastered, 0);
  const openMistakes = Object.values(progress.mistakes).filter((m) => !m.resolved).length;
  const icon = (G: typeof Gauge) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;

  return (
    <Screen>
      <T v="display">You</T>
      <Gap />
      <Card>
        <Row>
          <Stat value={String(answered)} label="answered" />
          <Stat value={answered ? `${Math.round((mastered / answered) * 100)}%` : '—'} label="accuracy" color={c.accentText} />
          <Stat value={String(streak)} label="day streak" color={c.clayText} />
        </Row>
      </Card>
      <Gap />

      <T v="title">Study tools</T>
      <Gap h={space.sm} />
      <Card style={{ paddingVertical: space.xs }}>
        <ActionRow
          icon={icon(NotebookPen)}
          title="Mistake journal"
          subtitle="Every miss, tagged"
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

      <T v="title">By domain</T>
      <Gap h={space.sm} />
      {cert.domains.map((d) => {
        const dm = readiness.domains.find((x) => x.domainId === d.id)!;
        return (
          <View key={d.id} style={{ marginBottom: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="label" style={{ flex: 1 }}>{d.short}</T>
              <T v="meta" num>{dm.accuracy === null ? 'Not started' : `${Math.round(dm.accuracy * 100)}% · ${dm.answered} done`}</T>
            </Row>
            <Gap h={space.xs} />
            <ProgressBar value={dm.accuracy ?? 0} color={domainColor(d.tone, isDark)} height={6} />
          </View>
        );
      })}

      <Gap h={space.sm} />
      <T v="title">Mock exams</T>
      <Gap h={space.sm} />
      {progress.mocks.length === 0 ? (
        <Card>
          <T v="meta">No mocks yet. Journey will suggest one.</T>
        </Card>
      ) : (
        progress.mocks.slice(0, 10).map((m) => (
          <Card key={m.id} style={{ marginBottom: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <T v="title" num>{`${Math.round((m.correct / m.total) * 100)}%`}</T>
                <T v="meta" num>{`${shortDate(m.finishedAt)} · ${m.total} questions`}</T>
              </View>
              <T v="meta" num>{`${m.minutesUsed} min`}</T>
            </Row>
          </Card>
        ))
      )}
      <Gap />
      <T v="meta" center>{cert.trademarkNotice}</T>
    </Screen>
  );
}
