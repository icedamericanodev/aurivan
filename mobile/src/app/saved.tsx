/**
 * Saved questions — the learner's own revision set (bookmarked questions).
 * Empty: a seedling and how to save one. Otherwise: the saved stems as a
 * hairline list (tap a row to answer that question; the trailing bookmark
 * removes it), and one sticky action to practise them all.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { BookmarkCheck, ICON_STROKE } from '../components/icons';
import { StickyFooter } from '../components/quiz';
import { Button, ICON_SIZE, ListRow, PushedHeader, T } from '../components/ui';
import { findQuestion } from '../content/loader';
import { guardedStart, startBookmarks, startFromIds, startPractice } from '../lib/sessions';
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
        primary={{ label: 'Practice 10 questions', onPress: () => guardedStart(() => startPractice(cert.id, { count: 10, title: 'Quick 10' }), open) }}
      />
    );
  }

  const saved = progress.bookmarks.map((id) => ({ id, q: findQuestion(cert.id, id) })).filter((x) => x.q);
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}>
        <PushedHeader title="Saved questions" onBack={() => router.back()} />
        <T v="meta" style={{ marginTop: space.sm }}>Tap a question to answer it. Tap the bookmark to remove it.</T>
        {saved.map(({ id, q }, i) => (
          // The row and the remove button are siblings (not nested), so each
          // is its own target for touch and for screen readers.
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <View style={{ flex: 1 }}>
              <ListRow
                title={q!.stem.length > 120 ? `${q!.stem.slice(0, 120).trimEnd()}…` : q!.stem}
                subtitle={cert.domains.find((d) => d.id === q!.domainId)?.short}
                accessibilityLabel={`Answer saved question: ${q!.stem.slice(0, 80)}`}
                // Opens a one-question session for just this question.
                onPress={() => guardedStart(() => startFromIds(cert.id, [id], 'Saved question'), open)}
                chevron={false}
                last // the hairline is drawn below the whole row instead
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove from saved"
              onPress={() => toggleBookmark(cert.id, id)}
              hitSlop={2}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                marginRight: -10, // optical alignment with the screen edge
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? c.soft : 'transparent',
              })}
            >
              <BookmarkCheck size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />
            </Pressable>
            {i < saved.length - 1 && (
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: c.line }} />
            )}
          </View>
        ))}
      </ScrollView>
      <StickyFooter onHeight={setFooterH}>
        <Button label={`Practice ${saved.length} saved`} onPress={() => guardedStart(() => startBookmarks(cert.id), open)} />
      </StickyFooter>
    </SafeAreaView>
  );
}
