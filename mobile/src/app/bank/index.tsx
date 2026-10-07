/**
 * Question bank, screen 1 — the domains.
 *
 * Why it exists: practice comes in short sessions, so learners felt they
 * "only see a few questions". This lets them browse everything.
 *
 * PRODUCT RULE: never show how many questions the bank or a domain holds.
 * Each row shows only the learner's own progress ("42 answered · 7 missed").
 * The summary text comes from engine/bank.ts, which is tested for this.
 */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DomainDot, Enter, ListRow, PushedHeader, Section, T } from '../../components/ui';
import { getAllQuestions, getDomainQuestions } from '../../content/loader';
import { learnerCounts, progressSummary, youveSummary } from '../../engine/bank';
import { useActiveCert } from '../../lib/useActiveCert';
import { space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export default function BankDomains() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();

  // Recount only when the learner's answers or bookmarks change.
  const rows = useMemo(
    () =>
      cert.domains.map((d) => ({
        domain: d,
        summary: progressSummary(learnerCounts(getDomainQuestions(cert.id, d.id), progress.answers, progress.bookmarks)),
      })),
    [cert, progress.answers, progress.bookmarks],
  );
  const overall = useMemo(
    () => youveSummary(learnerCounts(getAllQuestions(cert.id), progress.answers, progress.bookmarks)),
    [cert.id, progress.answers, progress.bookmarks],
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxxl }}>
        <PushedHeader title="Question bank" onBack={() => (router.canGoBack() ? router.back() : router.replace('/practice'))} />
        <Enter i={0}>
          <T v="body" color={c.ink2} style={{ marginTop: space.sm }}>Browse by domain and topic. Tap any question to answer it.</T>
          <T v="meta" num style={{ marginTop: space.sm }}>{overall}</T>
        </Enter>
        <Enter i={1}>
          <Section title="Domains" style={{ marginTop: space.section }} />
          {rows.map(({ domain, summary }, i) => (
            <ListRow
              key={domain.id}
              // The domain's tone dot, in a fixed-width slot so titles line up.
              lead={
                <View style={{ width: 16, alignItems: 'center' }} accessible={false}>
                  <DomainDot domain={domain} />
                </View>
              }
              title={domain.name}
              subtitle={summary}
              accessibilityLabel={`${domain.name}. ${summary}`}
              accessibilityHint="Shows this domain's topics and questions"
              onPress={() => router.push({ pathname: '/bank/[domain]', params: { domain: domain.id } })}
              last={i === rows.length - 1}
            />
          ))}
        </Enter>
      </ScrollView>
    </SafeAreaView>
  );
}
