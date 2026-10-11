/**
 * Common questions (product R5): a few quick answers before anyone has to
 * write to us. Each answer opens in place (a disclosure row) and ends with
 * "Still stuck? Email us", which opens Contact support with the right topic
 * already chosen. Bundled content (content/support FAQ), no network.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DisclosureRow } from '../components/pathChooser';
import { useContactFlow } from '../components/support';
import { Button, PushedHeader, Screen, T } from '../components/ui';
import { FAQ } from '../content/support';
import { useActiveCert } from '../lib/useActiveCert';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export default function Faq() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const contact = useContactFlow(cert.id);
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title="Common questions" onBack={() => (router.canGoBack() ? router.back() : router.replace('/you'))} />
      <T v="meta" style={{ marginTop: space.sm, marginBottom: space.md }}>Tap a question to read the answer.</T>
      {FAQ.map((f, i) => {
        const open = openId === f.id;
        const last = i === FAQ.length - 1;
        return (
          <View key={f.id}>
            <DisclosureRow title={f.question} expanded={open} onPress={() => setOpenId(open ? null : f.id)} last={last} />
            {open && (
              <View style={{ paddingBottom: space.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}>
                {f.answer.map((p) => (
                  <T key={p} v="body" style={{ marginTop: space.sm }}>{p}</T>
                ))}
                <Button
                  kind="ghost"
                  label="Still stuck? Email us"
                  accessibilityHint="Opens Contact support"
                  onPress={() => contact.openSupport(f.topic, `Common questions: ${f.question}`)}
                  style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.xs }}
                />
              </View>
            )}
          </View>
        );
      })}
      {contact.block}
      {contact.sheets}
    </Screen>
  );
}
