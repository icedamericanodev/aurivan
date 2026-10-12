/**
 * What's new (You → Help and feedback, Settings → Help and feedback).
 * It backs the promise "fixes show up in What's new".
 *
 * Top to bottom:
 * - "Updated after your report" (once): when a fix shipped after something
 *   THIS learner reported. Matched on the phone (content/support FIXES
 *   against Your reports); then marked seen, so it never shows twice
 *   (Today may have shown it first). Not "Your report helped": another
 *   learner's report may have led to the same fix (compliance W2). No
 *   streak, no growth, no badge: reporting is never rewarded with points.
 * - "Fixed after learner reports": the general notes of fixes that came
 *   from reports (never a code or a count), or a line saying how it works.
 *   It sits ABOVE the versions, so a fix never reads as part of the latest
 *   release (UX review P8).
 * - The latest version: New / Improved / Fixed, in plain words.
 * - Earlier versions.
 * - One fixed closing line (WHATS_NEW_FOOTER). Plain text, not a link: an
 *   inline word link can't be a 48pt touch target, and Help is one Back
 *   away. There is no "What's next" list (removed in 1.17.1): plans stay
 *   internal, and a change shows up here once it ships.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Bullets } from '../components/notes';
import { Button, PushedHeader, Screen, Section, T } from '../components/ui';
import { FIXES, shortVersion, WHATS_NEW, WHATS_NEW_FOOTER, type WhatsNewEntry } from '../content/support';
import { examDateLabel as dayLabel } from '../engine/examDay';
import { useReports } from '../lib/useReports';
import { useProgress } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** How many recent report-led fixes to list. */
const FIXES_SHOWN = 8;

/** "Something you reported has been updated since. Thank you for telling us." (n = different things) */
function creditLine(n: number): string {
  return `${n === 1 ? 'Something you reported has' : 'Things you reported have'} been updated since. Thank you for telling us.`;
}

function Release({ entry, latest }: { entry: WhatsNewEntry; latest: boolean }) {
  const groups: [string, string[] | undefined][] = [
    ['New', entry.new],
    ['Improved', entry.improved],
    ['Fixed', entry.fixed],
  ];
  return (
    <View>
      <Section title={`Version ${shortVersion(entry.version)}`} meta={latest ? `Latest · ${dayLabel(entry.date)}` : dayLabel(entry.date)} />
      {groups.map(([label, items]) =>
        items?.length ? (
          <View key={label} style={{ marginTop: space.md }}>
            <T v="caption" accessibilityRole="header">{label}</T>
            <Bullets items={items} />
          </View>
        ) : null,
      )}
    </View>
  );
}

export default function WhatsNew() {
  const { c } = useTheme();
  const { due, dueItems } = useReports();
  const markCreditSeen = useProgress((s) => s.markCreditSeen);
  // Keep the credit for this visit (it's marked seen right away, like the milestones back-fill line).
  const [credit] = useState(() => dueItems);
  useEffect(() => {
    if (due.length) markCreditSeen(due.map((r) => r.ref));
  }, [due, markCreditSeen]);
  const fixes = [...FIXES].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, FIXES_SHOWN);
  const [latest, ...earlier] = WHATS_NEW;

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="What’s new" onBack={() => (router.canGoBack() ? router.back() : router.replace('/you'))} />

      {credit > 0 && (
        // The key-idea recipe, not a card: a green rule on the left (spec §5).
        <View style={{ marginTop: space.md, borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md }}>
          <View accessible accessibilityLabel={`Updated after your report. ${creditLine(credit)}`}>
            <T v="caption" color={c.accentText}>Updated after your report</T>
            <T v="small" style={{ marginTop: space.xs }}>{creditLine(credit)}</T>
          </View>
          <Button kind="ghost" label="See your reports" onPress={() => router.push('/reports')} style={{ alignSelf: 'flex-start', marginLeft: -space.sm }} />
        </View>
      )}

      <Section title="Fixed after learner reports" />
      {fixes.length === 0 ? (
        <T v="meta" style={{ marginTop: space.sm }}>
          Nothing yet. When a learner’s report leads to a fix, it’s listed here. Report a problem from the link under any answered question, study note or lesson step, or from a game’s round recap.
        </T>
      ) : (
        fixes.map((f, i) => (
          <View
            key={`${f.ref}:${f.date}`}
            accessible
            style={{ paddingVertical: space.md, borderBottomWidth: i === fixes.length - 1 ? 0 : 1, borderBottomColor: c.line }}
          >
            <T v="body">{f.publicNote}</T>
            <T v="meta">{dayLabel(f.date)}</T>
          </View>
        ))
      )}
      {fixes.length > 0 && <T v="meta" style={{ marginTop: space.sm }}>Thanks to the learners who reported these.</T>}

      <Release entry={latest} latest />

      {earlier.map((e) => (
        <Release key={e.version} entry={e} latest={false} />
      ))}

      <T v="meta" style={{ marginTop: space.xl }}>{WHATS_NEW_FOOTER}</T>
    </Screen>
  );
}
