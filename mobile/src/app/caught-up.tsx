/**
 * Spaced review, all caught up: shown when nothing is due for review.
 */
import { router } from 'expo-router';
import { EmptyScreen } from '../components/emptyScreen';
import { guardedStart, startPractice } from '../lib/sessions';
import { useActiveCert } from '../lib/useActiveCert';

export default function CaughtUp() {
  const { cert } = useActiveCert();
  return (
    <EmptyScreen
      header="Spaced review"
      title="All caught up"
      body="Questions you miss come back here just before you would forget them."
      primary={{
        label: 'Practice 10 questions',
        onPress: () => guardedStart(() => startPractice(cert.id, { count: 10, title: 'Quick 10' }), () => router.replace('/session')),
      }}
    />
  );
}
