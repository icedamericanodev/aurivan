/**
 * What's next (read-only, product W1): what we're working on, what's
 * planned and what shipped recently, in plain words. Bundled with the app
 * (no network). No dates and no promises: plans change as we learn.
 * "Suggest an idea" opens Send feedback with "An idea" chosen.
 * A shipped item opens What's new.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { useContactFlow } from '../components/support';
import { Button, ListRow, PushedHeader, Screen, Section, T } from '../components/ui';
import { shortVersion, WHATS_NEXT, type NextStatus } from '../content/support';
import { useActiveCert } from '../lib/useActiveCert';
import { space } from '../theme/tokens';

const GROUPS: { status: NextStatus; title: string }[] = [
  { status: 'progress', title: 'In progress' },
  { status: 'planned', title: 'Planned' },
  { status: 'shipped', title: 'Recently shipped' },
];

export default function WhatsNext() {
  const { cert } = useActiveCert();
  const contact = useContactFlow(cert.id);
  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="What’s next" onBack={() => (router.canGoBack() ? router.back() : router.replace('/you'))} />
      <T v="meta" style={{ marginTop: space.sm }}>
        What we’re working on. There are no dates: plans change as we learn what helps you most.
      </T>
      {GROUPS.map(({ status, title }) => {
        const items = WHATS_NEXT.filter((i) => i.status === status);
        if (!items.length) return null;
        return (
          <View key={status}>
            <Section title={title} />
            {items.map((item, k) =>
              item.shippedIn ? (
                <ListRow
                  key={item.title}
                  title={item.title}
                  subtitle={`${item.body} Version ${shortVersion(item.shippedIn)}.`}
                  accessibilityHint="Opens What’s new"
                  onPress={() => router.push('/whats-new')}
                  last={k === items.length - 1}
                />
              ) : (
                // Not tappable: one screen-reader stop that says its status (UX review P9).
                <ListRow
                  key={item.title}
                  title={item.title}
                  subtitle={item.body}
                  accessibilityLabel={`${title}: ${item.title}. ${item.body}`}
                  last={k === items.length - 1}
                />
              ),
            )}
          </View>
        );
      })}
      <Section title="Have an idea?" />
      {/* One promise only ("We read every report"), so no second one here (UX review O12). */}
      <T v="small" style={{ marginTop: space.xs }}>Tell us what would help your study.</T>
      <Button
        kind="secondary"
        label="Suggest an idea"
        accessibilityHint="Opens a short form, then your email app"
        onPress={() => contact.openFeedback('idea', 'What’s next')}
        style={{ marginTop: space.lg }}
      />
      {contact.block}
      {contact.sheets}
    </Screen>
  );
}
