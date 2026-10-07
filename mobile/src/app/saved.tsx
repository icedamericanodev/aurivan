/**
 * Saved questions — the learner's own revision set (bookmarked questions).
 * Empty: a seedling and how to save one. Otherwise: the saved stems as a
 * hairline list, and one sticky action to practise them.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { BookmarkCheck, ICON_STROKE } from '../components/icons';
import { StickyFooter } from '../components/quiz';
import { Button, ICON_SIZE, ListRow, PushedHeader, T } from '../components/ui';
import { findQuestion } from '../content/loader';
import { guardedStart, startBookmarks, startPractice } from '../lib/sessions';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export default function Saved() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();
  const toggleBookmark = useProgress((s) => s.toggleBookmark);
  const [footerH, setFooterH] = useState(120);
  const open = () => router.push('/session');

  if (progress.bookmarks.length === 0) {
    return (
      <EmptyScreen
        header="Saved questions"
        title="Nothing saved yet"
        body="Tap the bookmark on any question to build your own revision set."
        primary={{ label: 'Practise 10 questions', onPress: () => guardedStart(() => startPractice(cert.id, { count: 10, title: 'Quick 10' }), open) }}
      />
    );
  }

  const saved = progress.bookmarks.map((id) => ({ id, q: findQuestion(cert.id, id) })).filter((x) => x.q);
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}>
        <PushedHeader title="Saved questions" onBack={() => router.back()} />
        <T v="meta" style={{ marginTop: space.sm }}>Tap the bookmark to remove one.</T>
        {saved.map(({ id, q }, i) => (
          <ListRow
            key={id}
            title={q!.stem.length > 120 ? `${q!.stem.slice(0, 120).trimEnd()}…` : q!.stem}
            subtitle={cert.domains.find((d) => d.id === q!.domainId)?.short}
            trailing={<BookmarkCheck size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
            accessibilityLabel={`Remove saved question: ${q!.stem.slice(0, 80)}`}
            onPress={() => toggleBookmark(cert.id, id)}
            chevron={false}
            last={i === saved.length - 1}
          />
        ))}
      </ScrollView>
      <StickyFooter onHeight={setFooterH}>
        <Button label={`Practise ${saved.length} saved`} onPress={() => guardedStart(() => startBookmarks(cert.id), open)} />
      </StickyFooter>
    </SafeAreaView>
  );
}
