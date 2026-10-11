/**
 * Help and feedback (You → Help and feedback): the same rows as Settings'
 * "Help and feedback" section, on their own screen.
 *
 * Deep link: aurivan://help?open=support | feedback | idea | report opens
 * that sheet straight away (a support reply or the store listing can point
 * here). Any other value just shows the screen.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
  // Open the asked-for sheet once, on the first render (React's "adjust state while rendering" pattern).
  const [handled, setHandled] = useState(false);
  if (!handled) {
    setHandled(true);
    const want = helpOpenParam(open);
    if (want === 'support') contact.openSupport(undefined, 'Link');
    else if (want === 'feedback') contact.openFeedback('other', 'Link');
    else if (want === 'idea') contact.openFeedback('idea', 'Link');
    else if (want === 'report') report.open();
  }
  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="Help and feedback" onBack={() => (router.canGoBack() ? router.back() : router.replace('/you'))} />
      <T v="meta" style={{ marginTop: space.sm }}>Quick answers, and an easy way to reach the people who build Aurivan.</T>
      <View style={{ marginTop: space.md }}>
        <HelpRows certId={cert.id} where="Help" />
      </View>
      {contact.block}
      {report.block}
      {contact.sheets}
      {report.sheet}
    </Screen>
  );
}
