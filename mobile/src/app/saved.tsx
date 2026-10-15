/**
 * Saved questions — the learner's own revision set (bookmarked questions).
 * Empty: a bookmark in the soil (mobile 1.9) and how to save one. Otherwise: the saved stems as a
 * hairline list (tap a row to answer that question; the trailing bookmark
 * removes it), and one sticky action to practise them all.
 * Mobile 1.21: the stems read in `body` (reading text is never 600), and the
 * "Tap a question… Tap the bookmark…" line is gone: the rows explain
 * themselves, and the bookmark's spoken hint says what it does.
 *
 * Mobile 1.24 (accessibility):
 * - Each stem is shown WHOLE (it used to be cut at 120 characters): the ask
 *   (FIRST, BEST, MOST) is at the end of most stems.
 * - Removing a saved question can be undone: the row turns into "Removed from
 *   saved. Undo" for UNDO_MS and only then is it really removed (leaving the
 *   screen makes it final at once). It is also said aloud.
 * - The remove button is a 48pt target.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyScreen } from '../components/emptyScreen';
import { BookmarkCheck, ICON_STROKE } from '../components/icons';
import { StickyFooter } from '../components/quiz';
import { Button, ICON_SIZE, ListRow, PushedHeader, Row, T } from '../components/ui';
import { findQuestion } from '../content/loader';
import { sayLater } from '../lib/a11y';
import { guardedStart, startBookmarks, startFromIds, startPractice } from '../lib/sessions';
import { useActiveCert } from '../lib/useActiveCert';
import { useProgress } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** How long "Removed from saved. Undo" waits before the question is really removed. */
export const UNDO_MS = 5000;
export const REMOVED_LINE = 'Removed from saved.';

export default function Saved() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();
  const toggleBookmark = useProgress((s) => s.toggleBookmark);
  const [footerH, setFooterH] = useState(120);
  const open = () => router.push('/session');
  // Questions waiting out their undo window (still saved in the store until it ends).
  const [pending, setPending] = useState<string[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const certId = cert.id;
  const commit = useCallback(
    (id: string) => {
      timers.current.delete(id);
      setPending((p) => p.filter((x) => x !== id));
      toggleBookmark(certId, id);
    },
    [certId, toggleBookmark],
  );
  const remove = (id: string) => {
    setPending((p) => (p.includes(id) ? p : [...p, id]));
    timers.current.set(id, setTimeout(() => commit(id), UNDO_MS));
    sayLater(`${REMOVED_LINE} Undo is next to it.`);
  };
  const undo = (id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setPending((p) => p.filter((x) => x !== id));
  };
  /** Practising uses the saved set as it is now: finish any removal that is still waiting. */
  const commitAll = () => {
    for (const [id, t] of [...timers.current]) {
      clearTimeout(t);
      commit(id);
    }
  };
  // Leaving the screen makes every pending removal final (it was asked for).
  useEffect(() => {
    const waiting = timers.current;
    return () => {
      for (const [id, t] of waiting) {
        clearTimeout(t);
        useProgress.getState().toggleBookmark(certId, id);
      }
      waiting.clear();
    };
  }, [certId]);

  if (progress.bookmarks.length === 0) {
    return (
      <EmptyScreen
        header="Saved questions"
        art="bookmark"
        title="Nothing saved yet"
        body="Tap the bookmark on any question to build your own revision set."
        primary={{ label: 'Practice 10 questions', onPress: () => guardedStart(() => startPractice(cert.id, { count: 10, title: 'Quick 10' }), open) }}
      />
    );
  }

  const saved = progress.bookmarks.map((id) => ({ id, q: findQuestion(cert.id, id) })).filter((x) => x.q);
  const keptCount = saved.filter((x) => !pending.includes(x.id)).length;
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: footerH + space.xl }}>
        <PushedHeader title="Saved questions" onBack={() => router.back()} />
        {saved.map(({ id, q }, i) => (
          // The row and the remove button are siblings (not nested), so each
          // is its own target for touch and for screen readers.
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            {pending.includes(id) ? (
              <Row gap={space.sm} style={{ flex: 1, minHeight: 64, justifyContent: 'space-between' }}>
                <T v="body" color={c.ink2} style={{ flexShrink: 1 }}>{REMOVED_LINE}</T>
                <Button kind="ghost" label="Undo" accessibilityLabel="Undo: keep this question saved" onPress={() => undo(id)} />
              </Row>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <ListRow
                    reading
                    full
                    title={q!.stem}
                    subtitle={cert.domains.find((d) => d.id === q!.domainId)?.short}
                    accessibilityLabel={`Answer saved question: ${q!.stem}`}
                    // Opens a one-question session for just this question.
                    onPress={() => guardedStart(() => startFromIds(cert.id, [id], 'Saved question'), open)}
                    chevron={false}
                    last // the hairline is drawn below the whole row instead
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove from saved"
                  accessibilityHint="Takes this question out of your saved set. You can undo it for a few seconds."
                  onPress={() => remove(id)}
                  hitSlop={4}
                  style={({ pressed }) => ({
                    width: 48,
                    height: 48,
                    marginRight: -12, // optical alignment with the screen edge
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pressed ? c.soft : 'transparent',
                  })}
                >
                  <BookmarkCheck size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />
                </Pressable>
              </>
            )}
            {i < saved.length - 1 && (
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: c.line }} />
            )}
          </View>
        ))}
      </ScrollView>
      {keptCount > 0 && (
        <StickyFooter onHeight={setFooterH}>
          <Button
            label={`Practice ${keptCount} saved`}
            onPress={() => {
              commitAll();
              guardedStart(() => startBookmarks(cert.id), open);
            }}
          />
        </StickyFooter>
      )}
    </SafeAreaView>
  );
}
