/**
 * Question bank, screen 2 — one domain.
 *
 * Header: the domain, the learner's own progress, and filter chips
 * (All · Not yet answered · Missed · Saved). Below: every question that
 * passes the filter, grouped under short topic names. Tap a question to
 * answer it on its own; "Practice these" starts a session from the list
 * (up to 20, random order). Both use the normal session machinery, so
 * grading on ORIGINAL letters and the answer/tips screens are unchanged.
 *
 * Domains hold hundreds of questions, so the list is a FlatList: only the
 * rows near the screen are rendered. No getItemLayout on purpose — rows
 * grow with the phone's text size, so their height isn't fixed.
 *
 * PRODUCT RULE: no totals anywhere (see engine/bank.ts).
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BankQuestionRow, TopicHeader } from '../../components/bank';
import { EmptyScreen } from '../../components/emptyScreen';
import { StickyFooter } from '../../components/quiz';
import { Button, Chip, ChipRow, DomainDot, EmptyState, Gap, PushedHeader, Row, T } from '../../components/ui';
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
  { value: 'missed', label: 'Missed' },
  { value: 'saved', label: 'Saved' },
];

const openSession = () => router.push('/session');
const goBack = () => (router.canGoBack() ? router.back() : router.replace('/bank'));

export default function BankDomain() {
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
          onPress={() => openQuestion(item.id)}
        />
      ),
    [openQuestion],
  );

  if (!domain) {
    return <EmptyScreen header="Question bank" title="Domain not found" body="Go back and pick a domain from the list." />;
  }

  const empty = emptyCopy(filter);
  const hasItems = items.length > 0;

  const header = (
    <View>
      <PushedHeader title={domain.short} onBack={goBack} />
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
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.key}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState title={empty.title} body={empty.body} />}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: (hasItems ? footerH : 0) + space.xl }}
        initialNumToRender={14}
        windowSize={7}
        removeClippedSubviews
      />
      {hasItems && (
        <StickyFooter onHeight={setFooterH}>
          <Button
            label="Practice these"
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
