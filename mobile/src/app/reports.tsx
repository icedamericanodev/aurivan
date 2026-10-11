/**
 * Your reports (Settings / You → Help and feedback): every problem this
 * learner started a report about, newest first, so they don't report the
 * same thing twice and can see when it was updated.
 *
 * - Titles use names, not codes ("Question in IS Operations"); the code and
 *   the report's reference sit in the meta line.
 * - "Started": the learner began a report here (their email app opened, or
 *   the message was shown to copy or share). We can't know if it was sent.
 * - "Updated after your report": a fix in the bundled list shipped in a
 *   later app version than the report was made on (engine/support.ts
 *   fixFor; by day for entries without a version), with its one general
 *   sentence. Matched on this phone; nothing is sent.
 * - A question no longer in the app says so.
 * The list is kept on this phone and in the learner's own backup file.
 */
import { router } from 'expo-router';
import { Alert, View } from 'react-native';
import { EmptyScreen } from '../components/emptyScreen';
import { Check } from '../components/icons';
import { Button, PushedHeader, Screen, T } from '../components/ui';
import { getCertification } from '../content/certifications';
import { findLesson } from '../content/lessons';
import { findQuestion } from '../content/loader';
import { findNote } from '../content/notes';
import { FIXES } from '../content/support';
import { examDateLabel as dayLabel } from '../engine/examDay';
import { fixFor, labelOf, parseItemRef, REASONS, type ReportEntry } from '../engine/support';
import { shortDate } from '../lib/format';
import { useReports } from '../lib/useReports';
import { useProgress } from '../store/progress';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Which game a card belongs to, by its id's first part ("rumor:4B1.2:…"). */
const CARD_GAME: Record<string, string> = {
  rumor: 'Root or Rumor',
  root: 'Root or Rumor',
  kt: 'Field Guide',
  role: 'Canopy Call',
  seq: 'Stepping Stones',
  flow: 'Stepping Stones',
};

/** A report's title (names, not codes), its code, and whether the item is gone from the app. */
function describeReport(r: ReportEntry): { title: string; code: string; gone: boolean } {
  const ref = parseItemRef(r.item);
  if (!ref) return { title: 'A report', code: r.item, gone: false };
  switch (ref.kind) {
    case 'question': {
      const q = findQuestion(r.cert, ref.id);
      const domain = q ? getCertification(r.cert)?.domains.find((d) => d.id === q.domainId) : undefined;
      return { title: domain ? `Question in ${domain.short}` : 'A question', code: ref.id, gone: !q };
    }
    case 'note': {
      const n = findNote(r.cert, ref.id);
      return { title: n ? `Note: ${n.name}` : 'A study note', code: ref.id, gone: !n };
    }
    case 'lesson': {
      const l = findLesson(ref.id);
      return { title: l ? `Lesson: ${l.title}${ref.step ? `, step ${ref.step}` : ''}` : 'A lesson step', code: ref.id, gone: !l };
    }
    case 'card':
      return { title: `Game card: ${CARD_GAME[ref.id.split(':')[0]] ?? 'a game'}`, code: ref.id, gone: false };
    case 'app':
      return { title: 'The app', code: `app:${ref.id}`, gone: false };
  }
}

function ReportItem({ r, last }: { r: ReportEntry; last: boolean }) {
  const { c } = useTheme();
  const { title, code, gone } = describeReport(r);
  const kind = parseItemRef(r.item)?.kind ?? 'app';
  const reason = labelOf(REASONS[kind], r.reason);
  const fix = fixFor(r, FIXES);
  const state = fix
    ? fix.kind === 'removed'
      ? `Removed after review · ${dayLabel(fix.date)}`
      : `Updated after your report · ${dayLabel(fix.date)}`
    : gone
      ? 'No longer in the app'
      : `Started ${shortDate(r.at)}`;
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${reason}. ${state}.${fix ? ` ${fix.publicNote}` : ''} Code ${code}, reference ${r.ref}.`}
      style={{ paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}
    >
      <T v="label">{title}</T>
      <T v="small" color={c.ink2}>{reason}</T>
      {fix && (
        <View style={{ marginTop: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Check size={14} color={c.accentText} strokeWidth={2.5} />
            <T v="caption" color={c.accentText}>{state}</T>
          </View>
          <T v="small" color={c.ink2}>{fix.publicNote}</T>
        </View>
      )}
      {/* One meta line: when (unless updated, said above), the code and the email's reference. */}
      <T v="meta" color={c.muted} style={{ marginTop: 2 }}>{[fix ? null : state, `Code ${code}`, `Ref ${r.ref}`].filter(Boolean).join(' · ')}</T>
    </View>
  );
}

export default function Reports() {
  const { reports } = useReports();
  const clearReports = useProgress((s) => s.clearReports);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/you'));

  if (reports.length === 0) {
    return (
      <EmptyScreen
        header="Your reports"
        title="No reports yet"
        body="When you report a problem, it’s listed here so you don’t report it twice. The list stays on this phone and in your own backups."
        fallback="/you"
      />
    );
  }

  const confirmClear = () =>
    Alert.alert('Clear this list?', 'This removes the list from this phone. Emails you already sent are not affected.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearReports() },
    ]);

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="Your reports" onBack={back} />
      <T v="meta" style={{ marginTop: space.sm, marginBottom: space.sm }}>
        Problems you started a report about. “Started” means you began one here; your email app can’t tell us whether it was sent. This list stays on this phone and in your own backups.
      </T>
      {reports.map((r, i) => (
        <ReportItem key={`${r.ref}:${r.at}`} r={r} last={i === reports.length - 1} />
      ))}
      <Button kind="ghost" label="Clear this list" onPress={confirmClear} style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.lg }} />
    </Screen>
  );
}
