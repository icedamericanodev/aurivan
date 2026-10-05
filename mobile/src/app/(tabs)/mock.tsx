/**
 * Mock exam — a timed rehearsal that mirrors the real exam: same domain
 * weights, same difficulty mix, no feedback until you submit.
 */
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { Button, Card, Gap, Pill, Row, Screen, T } from '../../components/ui';
import { startMock } from '../../lib/sessions';
import { useActiveCert } from '../../lib/useActiveCert';
import { useSession } from '../../store/session';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function Mock() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();
  const active = useSession((s) => s.active);
  const mini = Math.round(cert.exam.questions / 3);
  const miniMinutes = Math.round((cert.exam.minutes / cert.exam.questions) * mini);

  const begin = (questions?: number) => {
    const launch = () => {
      if (startMock(cert.id, questions)) router.push('/session');
    };
    if (active) {
      Alert.alert('Replace current session?', `You have an unfinished "${active.title}". Starting a mock will discard it.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start mock', style: 'destructive', onPress: launch },
      ]);
    } else launch();
  };

  const last = progress.mocks[0];

  return (
    <Screen>
      <T v="title">Mock exam</T>
      <T color={c.text2}>Real exam length, real blueprint, real clock. Feedback comes at the end.</T>
      <Gap />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="heading">Full mock</T>
          <Pill label={`${cert.exam.minutes / 60} hrs`} />
        </Row>
        <T v="caption">
          {cert.exam.questions} questions · {cert.exam.minutes} minutes · weighted like the real {cert.name}
        </T>
        <Gap h={space.md} />
        <Button label="Start full mock" onPress={() => begin()} />
      </Card>
      <Gap />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="heading">Mini mock</T>
          <Pill label={`${miniMinutes} min`} />
        </Row>
        <T v="caption">{mini} questions at real exam pace. Great for a lunch break.</T>
        <Gap h={space.md} />
        <Button kind="secondary" label="Start mini mock" onPress={() => begin(mini)} />
      </Card>
      <Gap />

      <Card>
        <T v="label" color={c.text2}>Exam-day tips</T>
        <Gap h={space.sm} />
        <T v="body">• About {Math.round((cert.exam.minutes / cert.exam.questions) * 60)} seconds per question. Flag and move on when stuck.</T>
        <T v="body">• Read the LAST line of the stem first: FIRST, BEST, MOST, PRIMARY.</T>
        <T v="body">• {cert.mindset.split('.')[0]}.</T>
        <Gap h={space.sm} />
        <T v="caption">{cert.exam.passingNote}</T>
      </Card>

      {last && (
        <>
          <Gap />
          <Card>
            <T v="label" color={c.text2}>Last mock</T>
            <T v="title">{Math.round((last.correct / last.total) * 100)}%</T>
            <T v="caption">
              {last.correct}/{last.total} correct · {last.minutesUsed} min · {new Date(last.finishedAt).toLocaleDateString()}
            </T>
          </Card>
        </>
      )}
    </Screen>
  );
}
