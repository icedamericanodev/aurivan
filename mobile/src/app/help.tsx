/**
 * Help and feedback (You → Help and feedback, Settings → Help and
 * feedback): the Get help and Updates rows (components/help.tsx).
 *
 * Deep link: aurivan://help?open=support | feedback | idea | report opens
 * that sheet straight away (a support reply or the store listing can point
 * here). Any other value just shows the screen.
 * - Read in an effect on the param, so a SECOND link that arrives while
 *   Help is already open still opens its sheet (QA Journey 7).
 * - Once handled, the param is cleared (router.setParams), so going back to
 *   Help or re-rendering never opens the sheet again, and the same link
 *   tapped later works again.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { HelpRows } from '../components/help';
import { useContactFlow, useReportFlow } from '../components/support';
import { PushedHeader, Screen, T } from '../components/ui';
import { helpOpenParam } from '../lib/support';
import { useActiveCert } from '../lib/useActiveCert';
import { space } from '../theme/tokens';

export default function Help() {
  const { cert } = useActiveCert();
  const { open } = useLocalSearchParams<{ open?: string }>();
  // The deep link's sheet: its own flows, so HelpRows stays the same list everywhere.
  const contact = useContactFlow(cert.id);
  const report = useReportFlow(cert.id, { kind: 'app', id: 'help', name: 'Help', where: 'Help' });
  // A strict allowlist: arrays, other words and missing values are null.
  const want = helpOpenParam(open);
  useEffect(() => {
    if (!want) return;
    if (want === 'support') contact.openSupport(undefined, 'Link');
    else if (want === 'feedback') contact.openFeedback('other', 'Link');
    else if (want === 'idea') contact.openFeedback('idea', 'Link');
    else report.open();
    router.setParams({ open: undefined });
    // Only a NEW value should open a sheet: the flows' functions change every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want]);
  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="Help and feedback" onBack={() => (router.canGoBack() ? router.back() : router.replace('/you'))} />
      <T v="meta" style={{ marginTop: space.sm }}>Quick answers, and an easy way to reach the people who build Aurivan.</T>
      <View>
        <HelpRows certId={cert.id} />
      </View>
      {contact.block}
      {report.block}
      {contact.sheets}
      {report.sheet}
    </Screen>
  );
}
