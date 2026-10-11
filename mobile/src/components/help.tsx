/**
 * Help and feedback rows (mobile 1.7), shown on the Help screen
 * (You → Help and feedback, or Settings → Help and feedback).
 *
 * Two groups, so a learner can tell "do something" from "read something"
 * (UX review O2):
 * - Get help: Common questions, Contact support, Report a problem with the
 *   app, Suggest an idea. These open a screen or a short sheet.
 * - Updates: Your reports, What's new, What's next. These open a screen.
 * Under the rows: the support address as its OWN selectable line (so iOS
 * copies just the address, UX P6), and the not-affiliated line (Apple 1.5:
 * an easy way to contact us; compliance T1 wording).
 *
 * A problem in ONE question or note is best reported from the link under
 * it (it carries the code); the row here reports the app itself.
 * "Finished in your email app?" appears under the row that opened the sheet.
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
import { ICON_SIZE, ListRow, Section, T } from './ui';

/** The footer, in two pieces: the address is selectable on its own. */
export const HELP_FOOTER_LEAD = 'Write to us any time at';
export const NOT_AFFILIATED = 'Aurivan is independent and not affiliated with or endorsed by ISACA.';

/** "Something you reported was updated", by how many different things (useReports dueItems). */
export function creditSubtitle(items: number): string {
  return items === 1 ? 'Something you reported was updated' : 'Things you reported were updated';
}

/** "Version 1.7", or the credit line while a report's update hasn't been seen. */
export function whatsNewSubtitle(dueItems: number): string {
  return dueItems > 0 ? creditSubtitle(dueItems) : `Version ${shortVersion(WHATS_NEW[0].version)}`;
}

/** Where the rows' emails say they came from ("From: Help"). */
const WHERE = 'Help';

export function HelpRows({ certId }: { certId: string }) {
  const { c } = useTheme();
  const { counts, dueItems } = useReports();
  const contact = useContactFlow(certId);
  const report = useReportFlow(certId, { kind: 'app', id: 'help', name: WHERE, where: WHERE });
  const icon = (G: typeof Mail) => <G size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />;
  return (
    <View>
      <Section title="Get help" />
      <ListRow
        icon={icon(CircleQuestionMark)}
        title="Common questions"
        subtitle="Quick answers before you write"
        onPress={() => router.push('/faq')}
      />
      <ListRow
        icon={icon(Mail)}
        title="Contact support"
        subtitle="A question about the app or your data"
        onPress={() => contact.openSupport(undefined, WHERE)}
      />
      {contact.blockFor('support', WHERE)}
      <ListRow
        icon={icon(Flag)}
        title="Report a problem with the app"
        subtitle="Something isn’t working or looks wrong"
        accessibilityHint="For a question or note, use the Report a problem link under it."
        onPress={report.open}
      />
      {report.block}
      <ListRow
        icon={icon(Lightbulb)}
        title="Suggest an idea"
        subtitle="Or tell us what works for you"
        onPress={() => contact.openFeedback('idea', WHERE)}
        last
      />
      {contact.blockFor('feedback', WHERE)}

      <Section title="Updates" />
      <ListRow icon={icon(Inbox)} title="Your reports" subtitle={reportsSubtitle(counts)} onPress={() => router.push('/reports')} />
      <ListRow icon={icon(Sparkles)} title="What’s new" subtitle={whatsNewSubtitle(dueItems)} onPress={() => router.push('/whats-new')} />
      <ListRow
        icon={icon(MapIcon)}
        title="What’s next"
        subtitle="Planned, in progress and recently shipped"
        onPress={() => router.push('/whats-next')}
        last
      />

      <T v="small" color={c.ink2} style={{ marginTop: space.lg }}>{HELP_FOOTER_LEAD}</T>
      <T v="label" selectable color={c.accentText}>{config.feedbackEmail}</T>
      <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>{NOT_AFFILIATED}</T>
      {report.sheet}
      {contact.sheets}
    </View>
  );
}
