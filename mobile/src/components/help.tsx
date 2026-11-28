/**
 * Help and feedback rows (mobile 1.7), shown on the Help screen
 * (You → Help and feedback, or Settings → Help and feedback).
 *
 * Two groups, so a learner can tell "do something" from "read something"
 * (UX review O2):
 * - Get help: Common questions, Contact support, Report a problem with the
 *   app, Something confused me (mobile 1.41), Suggest an idea. These open a
 *   screen or a short sheet.
 *   Since the exam guide (data/exam/): "About the CISA exam" right after
 *   Common questions (hidden when the cert has no guide), for "how do I book,
 *   what do I bring" questions that aren't about the app.
 * - Updates: Your reports, What's new. These open a screen. (What's next
 *   was removed in 1.17.1: the plan is kept internal, outside this repo.)
 * Under the rows: the support address as its OWN selectable line (so iOS
 * copies just the address, UX P6), and the not-affiliated line (Apple 1.5:
 * an easy way to contact us; compliance T1 wording), naming the active
 * course's issuer (ISACA for CISA).
 *
 * A problem in ONE question or note is best reported from the link under
 * it (it carries the code); the row here reports the app itself.
 * "Finished in your email app?" appears under the row that opened the sheet.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { getCertification, notAffiliatedLine } from '../content/certifications';
import { hasExamGuide } from '../content/exam';
import { shortVersion, WHATS_NEW } from '../content/support';
import { config } from '../lib/config';
import { reportsSubtitle, useReports } from '../lib/useReports';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { CircleQuestionMark, ICON_STROKE, Inbox, Info, Mail, Sparkles } from './icons';
import { useUnifiedSupportFlow } from './support';
import { ICON_SIZE, ListRow, Section, T, ToggleRow } from './ui';
import { switchTester } from '../engine/betaTester';
import { widgetsSupported } from '../lib/widgets';
import { WidgetNumbersRow } from './widgetSettings';
import { dayKey } from '../engine/streak';
import { sayLater } from '../lib/a11y';
import { useSeen } from '../store/seen';

/**
 * Mobile 1.41: the beta tester switch (behavioural review change 3). Off by
 * default. The public build is this same build, so a switch, not a build flag,
 * keeps the Tester question card away from everyone who doesn't turn it on.
 */
export const TESTER_SWITCH = 'I’m a beta tester';
export const TESTER_SWITCH_HINT = 'A short question on Today on some days during the test. Turn it off any time.';

/** The footer, in two pieces: the address is selectable on its own. */
export const HELP_FOOTER_LEAD = 'Write to us any time at';
/** CISA's (ISACA's) footer line. The screen shows the active course's own (notAffiliatedLine). */
export const NOT_AFFILIATED = notAffiliatedLine();

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
  const support = useUnifiedSupportFlow(certId, WHERE);
  const testerOn = useSeen((s) => Boolean(s.tester?.since));
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
      {hasExamGuide(certId) && (
        <ListRow
          icon={icon(Info)}
          title={`About the ${getCertification(certId)?.name ?? ''} exam`.replace('  ', ' ')}
          subtitle="Booking, exam day, results and after"
          accessibilityHint="Opens the exam guide"
          onPress={() => router.push('/exam-guide')}
        />
      )}
      <ListRow
        icon={icon(Mail)}
        title="Support and feedback"
        subtitle="Report a problem, ask for help or suggest an idea"
        onPress={support.open}
        last
      />
      {support.block}

      <Section title="Updates" />
      <ListRow icon={icon(Inbox)} title="Your reports" subtitle={reportsSubtitle(counts)} onPress={() => router.push('/reports')} />
      <ListRow icon={icon(Sparkles)} title="What’s new" subtitle={whatsNewSubtitle(dueItems)} onPress={() => router.push('/whats-new')} />
      <ToggleRow
        title={TESTER_SWITCH}
        subtitle={TESTER_SWITCH_HINT}
        value={testerOn}
        onValueChange={(on) => {
          // On starts the test today (day 1); off forgets the test days and answers.
          useSeen.getState().setTester(switchTester(on, dayKey(Date.now())));
          sayLater(on ? 'Tester questions on. One may show on Today.' : 'Tester questions off.');
        }}
        last={!testerOn || !widgetsSupported}
      />
      {/* Mobile 1.47: beta testers only. Read-only widget counts kept on this phone, never sent. */}
      {testerOn && widgetsSupported ? <WidgetNumbersRow /> : null}

      <T v="small" color={c.ink2} style={{ marginTop: space.lg }}>{HELP_FOOTER_LEAD}</T>
      <T v="label" selectable color={c.accentText}>{config.feedbackEmail}</T>
      {/* The active course's issuer: "ISACA" for CISA (unchanged), the course's own issuer otherwise. */}
      <T v="small" color={c.ink2} style={{ marginTop: space.xs }}>{notAffiliatedLine(getCertification(certId)?.issuer)}</T>
      {support.sheet}
    </View>
  );
}
