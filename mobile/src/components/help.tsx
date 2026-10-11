/**
 * Help and feedback rows (mobile 1.7): the same list in Settings (a section
 * before About) and on the Help screen (You → Help and feedback).
 *
 * Order, so the quickest help comes first: common questions, report a
 * problem with the app, suggest an idea, contact support, then Your
 * reports, What's new and What's next. Under the rows, the address as text
 * the learner can select, and the not-affiliated line (Apple 1.5: an easy
 * way to contact us; compliance.md §3.4).
 *
 * A problem in ONE question or note is best reported from the link under
 * it (it carries the code); this row reports the app itself.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { shortVersion, WHATS_NEW } from '../content/support';
import { config } from '../lib/config';
import { reportsSubtitle, useReports } from '../lib/useReports';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { CircleQuestionMark, Flag, ICON_STROKE, Inbox, Lightbulb, Mail, MapIcon, Sparkles } from './icons';
import { useContactFlow, useReportFlow } from './support';
import { ICON_SIZE, ListRow, T } from './ui';

export const HELP_FOOTER = `Write to us any time at ${config.feedbackEmail}. Aurivan is independent and not affiliated with ISACA.`;

/** "Version 1.7", or the credit line while a report's update hasn't been seen. */
export function whatsNewSubtitle(creditDue: number): string {
  if (creditDue > 0) return creditDue === 1 ? 'Something you reported was updated' : 'Things you reported were updated';
  return `Version ${shortVersion(WHATS_NEW[0].version)}`;
}

export function HelpRows({ certId, where }: { certId: string; where: 'Settings' | 'Help' }) {
  const { c } = useTheme();
  const { counts, due } = useReports();
  const contact = useContactFlow(certId);
  const report = useReportFlow(certId, { kind: 'app', id: where.toLowerCase(), name: where, where });
  const icon = (G: typeof Mail) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;
  return (
    <View>
      <ListRow
        icon={icon(CircleQuestionMark)}
        title="Common questions"
        subtitle="Quick answers before you write"
        onPress={() => router.push('/faq')}
      />
      <ListRow
        icon={icon(Flag)}
        title="Report a problem"
        subtitle="Something in the app isn’t working"
        accessibilityHint="For a question or note, use the Report a problem link under it."
        onPress={report.open}
      />
      <ListRow
        icon={icon(Lightbulb)}
        title="Suggest an idea"
        subtitle="Or tell us what works for you"
        onPress={() => contact.openFeedback('idea', where)}
      />
      <ListRow
        icon={icon(Mail)}
        title="Contact support"
        subtitle="A question about the app or your data"
        onPress={() => contact.openSupport(undefined, where)}
      />
      <ListRow icon={icon(Inbox)} title="Your reports" subtitle={reportsSubtitle(counts)} onPress={() => router.push('/reports')} />
      <ListRow icon={icon(Sparkles)} title="What’s new" subtitle={whatsNewSubtitle(due.length)} onPress={() => router.push('/whats-new')} />
      <ListRow
        icon={icon(MapIcon)}
        title="What’s next"
        subtitle="Planned, in progress and recently shipped"
        onPress={() => router.push('/whats-next')}
        last
      />
      {report.block}
      {contact.block}
      <T v="small" color={c.ink2} selectable style={{ marginTop: space.md }}>{HELP_FOOTER}</T>
      {report.sheet}
      {contact.sheets}
    </View>
  );
}
