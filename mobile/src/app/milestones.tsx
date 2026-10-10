/**
 * Milestones (You → Milestones), Build F — behaviour review §4.
 *
 * Plain English for the founder:
 * - "Earned": every milestone the learner has, with the leaves or tiers
 *   (Firm Footing per domain, Rooted 10 / 30 / 60 days) and when.
 * - "Closest next": the 3 nearest milestones not yet earned, each with its
 *   exact rule and a progress line (goal clarity).
 * - "Still ahead": the rest, listed quietly WITH their rules. No locked
 *   mystery badges, no rarity, no counts of the question bank.
 * - The one-time back-fill summary ("You'd already earned 4 milestones.")
 *   shows here the first time, and is then marked as seen.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BadgeRow } from '../components/milestones';
import { ProgressBar, PushedHeader, Section, T } from '../components/ui';
import { badgeViews, nearest, type BadgeView } from '../engine/milestones';
import { shortDate } from '../lib/format';
import { backfillLine, marksFor, seeBackfill } from '../lib/milestones';
import { useActiveCert } from '../lib/useActiveCert';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** "Firm Footing · IS Audit, IS Operations" style list of a badge's earned leaves. */
function earnedLine(v: BadgeView): string {
  if (v.def.id === 'firm-footing') return v.earned.map((e) => e.label.replace('Firm Footing · ', '')).join(', ');
  if (v.def.id === 'rooted') return v.earned.map((e) => e.label.replace('Rooted · ', '')).join(', ');
  return '';
}

export default function Milestones() {
  const { c } = useTheme();
  const { cert, progress } = useActiveCert();
  const views = useMemo(() => badgeViews(marksFor(cert.id, progress), progress.milestones?.earned, 'milestone'), [cert.id, progress]);
  const earned = views.filter((v) => v.earned.length > 0);
  const next = nearest(views.filter((v) => v.earned.length === 0 || v.next));
  const nextIds = new Set(next.map((v) => v.def.id));
  const ahead = views.filter((v) => v.earned.length === 0 && !nextIds.has(v.def.id));
  // The back-fill summary shows on the first visit after it ran, then never again.
  const backfill = progress.milestones?.backfill;
  const [summary] = useState(() => (backfill && !backfill.seen ? backfillLine(backfill.count) : null));
  useEffect(() => {
    if (backfill && !backfill.seen) seeBackfill(cert.id);
  }, [backfill, cert.id]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.xxl }}>
        <PushedHeader title="Milestones" onBack={() => router.back()} />
        <T v="meta" style={{ marginTop: space.sm }}>Quiet markers of what you’ve mastered. Once earned, a milestone stays.</T>

        {summary && (
          <View accessible accessibilityLabel={`${summary} From your study before milestones arrived.`} style={{ marginTop: space.lg, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
            <T v="caption" color={c.accentText}>From your study so far</T>
            <T v="quote" style={{ marginTop: 4 }}>{summary}</T>
          </View>
        )}

        <Section title="Earned" meta={earned.length ? `${earned.length} of ${views.length}` : undefined} />
        {earned.length === 0 ? (
          <T v="small" color={c.ink2} style={{ marginTop: space.sm }}>None yet. The nearest ones are below, with what each needs.</T>
        ) : (
          earned.map((v, k) => {
            const leaves = earnedLine(v);
            const when = `Earned ${shortDate(v.earned[0].at)}`;
            return (
              <BadgeRow
                key={v.def.id}
                name={leaves ? `${v.def.name} · ${leaves}` : v.def.name}
                rule={v.def.rule}
                earned
                detail={when}
                last={k === earned.length - 1}
                spoken={`${v.def.name}${leaves ? `, ${leaves}` : ''}. Earned. ${v.def.rule} ${when}.`}
              />
            );
          })
        )}

        {next.length > 0 && (
          <>
            <Section title="Closest next" />
            {next.map((v, k) => (
              <BadgeRow
                key={v.def.id}
                name={v.next && v.next.label !== v.def.name ? v.next.label : v.def.name}
                rule={v.def.rule}
                earned={false}
                detail={v.next?.detail}
                extra={
                  v.next && v.next.progress > 0 ? (
                    <View style={{ marginTop: space.sm }}>
                      <ProgressBar value={v.next.progress} height={6} />
                    </View>
                  ) : undefined
                }
                last={k === next.length - 1}
                spoken={`${v.next?.label ?? v.def.name}. Not yet. ${v.def.rule} ${v.next?.detail ?? ''}.`}
              />
            ))}
          </>
        )}

        {ahead.length > 0 && (
          <>
            <Section title="Still ahead" />
            {ahead.map((v, k) => (
              <BadgeRow
                key={v.def.id}
                name={v.def.name}
                rule={v.def.rule}
                earned={false}
                last={k === ahead.length - 1}
                spoken={`${v.def.name}. Not yet. ${v.def.rule}`}
              />
            ))}
          </>
        )}
        <T v="meta" style={{ marginTop: space.xl }}>Answers after Coach me and game answers don’t count toward milestones. Nothing here is ever taken away.</T>
      </ScrollView>
    </SafeAreaView>
  );
}
