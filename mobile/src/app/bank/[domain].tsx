/**
 * Question bank, screen 2 — one domain.
 *
 * Header: the domain, the learner's own progress, and filter chips
 * (All · Not yet answered · Answered · Missed · Saved). Below: every question that
 * passes the filter, grouped under short topic names (a header only when a
 * topic shows 2 rows or more; a lone row names its topic itself, mobile 1.9). Tap a question to
 * answer it on its own; "Practice these" starts a session from the list
 * (up to 20, random order). Both use the normal session machinery, so
 * grading on ORIGINAL letters and the answer/tips screens are unchanged.
 *
 * Mobile 2.2, the Answered filter: only questions the learner has answered.
 * There, a tap does NOT ask the question again: it opens the read-only
 * look-back page (app/answered/[id].tsx), which changes nothing. Every other
 * filter keeps the tap described above.
 *
 * Domains hold hundreds of questions, so the list is a FlatList: only the
 * rows near the screen are rendered. No getItemLayout on purpose — rows
 * grow with the phone's text size, so their height isn't fixed.
 *
 * PRODUCT RULE: no totals anywhere (see engine/bank.ts).
 */
import { HoldContext } from '../../lib/holdWhileHidden';
import { useScreenFocus } from '../../components/motion';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BankQuestionRow, TopicHeader } from '../../components/bank';
import { EmptyScreen } from '../../components/emptyScreen';
import type { EmptyArtKind } from '../../components/glyphs';
import { StickyFooter } from '../../components/quiz';
import { Button, Chip, ChipRow, DomainDot, EmptyState, Gap, PushedHeader, Row, T } from '../../components/ui';
import { domainLabel } from '../../content/certifications';
import { getDomainQuestions } from '../../content/loader';
import {
  buildBankList,
  emptyCopy,
  learnerCounts,
  listedIds,
  practiseSet,
  youveSummary,
  type BankFilter,
  type BankItem,
} from '../../engine/bank';
import { createRng } from '../../engine/random';
import { shortSubtopic } from '../../lib/format';
import { guardedStart, startFromIds } from '../../lib/sessions';
import { useActiveCert } from '../../lib/useActiveCert';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const FILTERS: { value: BankFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'Not yet answered' },
  { value: 'answered', label: 'Answered' },
  { value: 'missed', label: 'Missed' },
  { value: 'saved', label: 'Saved' },
];

/** Each filter's empty drawing (mobile 1.9): what would be here, drawn. */
const EMPTY_ART: Record<BankFilter, EmptyArtKind> = { all: 'seedling', new: 'fieldbook', answered: 'seedling', missed: 'pressed', saved: 'bookmark' };

/** The Answered filter's one line of help, and what its rows say to a screen reader. */
export const ANSWERED_HELP = 'Tap a question to look back at it. You won’t answer it again.';
const ANSWERED_ROW_HINT = 'Opens this question to look back at it, without answering it again';

const openSession = () => router.push('/session');
/** The read-only look-back page. The id goes in as a route param, never pasted into the path. */
const openLookBack = (id: string) => router.push({ pathname: '/answered/[id]', params: { id } });
const goBack = () => (router.canGoBack() ? router.back() : router.replace('/bank'));

/**
 * Release bug hunt round 4: this screen stays mounted under a pushed session (or the Look screen).
 * While it is covered its reads are held (lib/holdWhileHidden.ts), so an answer no longer redraws
 * it; back in view, it reads the live progress once. The same pattern as the badge case.
 */
export default function BankDomain() {
  const focused = useScreenFocus();
  return (
    <HoldContext.Provider value={!focused}>
      <BankDomainScreen />
    </HoldContext.Provider>
  );
}

function BankDomainScreen() {
  const { c } = useTheme();
  const { domain: domainId } = useLocalSearchParams<{ domain: string }>();
  const { cert, progress } = useActiveCert();
  const [filter, setFilter] = useState<BankFilter>('all');
  const [footerH, setFooterH] = useState(120);

  const domain = cert.domains.find((d) => d.id === domainId);
  const questions = useMemo(() => (domain ? getDomainQuestions(cert.id, domain.id) : []), [cert.id, domain]);

  // The list (topic headers + questions) for the chosen filter.
  const items = useMemo(
    () => buildBankList(questions, progress.answers, progress.bookmarks, filter, shortSubtopic),
    [questions, progress.answers, progress.bookmarks, filter],
  );
  const summary = useMemo(
    () => youveSummary(learnerCounts(questions, progress.answers, progress.bookmarks)),
    [questions, progress.answers, progress.bookmarks],
  );

  // One question on its own: a one-question practice session.
  const openQuestion = useCallback(
    (id: string) => guardedStart(() => startFromIds(cert.id, [id], domain?.short ?? 'Question bank'), openSession),
    [cert.id, domain?.short],
  );

  // Mobile 2.2: in the Answered filter a row opens the look-back page instead of a session.
  const lookBack = filter === 'answered';

  const renderItem = useCallback<ListRenderItem<BankItem>>(
    ({ item }) =>
      item.kind === 'topic' ? (
        <TopicHeader title={item.title} summary={item.summary} />
      ) : (
        <BankQuestionRow
          text={item.firstLine}
          status={item.status}
          saved={item.saved}
          difficulty={item.difficulty}
          topic={item.ownTopic ? item.topic : undefined}
          afterGroup={item.afterGroup}
          // Answered: look back (read-only). Every other filter: answer it, as before.
          hint={lookBack ? ANSWERED_ROW_HINT : undefined}
          onPress={() => (lookBack ? openLookBack(item.id) : openQuestion(item.id))}
        />
      ),
    [openQuestion, lookBack],
  );

  if (!domain) {
    return <EmptyScreen header="Question bank" fallback="/practice" title="Domain not found" body="Go back and pick a domain from the list." />;
  }

  const empty = emptyCopy(filter);
  const hasItems = items.length > 0;

  const header = (
    <View>
      <PushedHeader title={domainLabel(domain)} onBack={goBack} />
      <Row gap={space.sm} style={{ marginTop: space.sm }}>
        <DomainDot domain={domain} />
        <T v="headline" accessibilityRole="header" style={{ flexShrink: 1 }}>{domain.name}</T>
      </Row>
      <T v="meta" num style={{ marginTop: space.xs }}>{summary}</T>
      <Gap h={space.lg} />
      <ChipRow>
        {FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />
        ))}
      </ChipRow>
      {/* Only when there are rows to tap: the empty state has its own words. */}
      {lookBack && hasItems ? <T v="meta" style={{ marginTop: space.md }}>{ANSWERED_HELP}</T> : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.key}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState art={EMPTY_ART[filter]} title={empty.title} body={empty.body} />}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: (hasItems ? footerH : 0) + space.xl }}
        initialNumToRender={14}
        windowSize={7}
        removeClippedSubviews
      />
      {hasItems && (
        <StickyFooter onHeight={setFooterH}>
          <Button
            // Answered: looking back is the main thing here, so answering again is the quieter choice.
            kind={lookBack ? 'secondary' : undefined}
            label={lookBack ? 'Practice these again' : 'Practice these'}
            accessibilityHint="Up to 20 questions from this list, in a random order"
            onPress={() =>
              guardedStart(
                () => startFromIds(cert.id, practiseSet(listedIds(items), createRng(Date.now())), domain.short),
                openSession,
              )
            }
          />
        </StickyFooter>
      )}
    </SafeAreaView>
  );
}
