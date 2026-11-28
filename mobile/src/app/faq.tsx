/**
 * Common questions (product R5): a few quick answers before anyone has to
 * write to us. Each answer opens in place (a disclosure row) and ends with
 * "Still stuck? Email us", which opens Contact support with the right topic
 * already chosen. "Finished in your email app?" shows under the entry
 * that opened it, not below the whole list (UX review O3).
 * Bundled content (content/support FAQ), no network.
 *
 * `faq?open=<id>` opens that entry at once (Settings → About's "How questions are
 * made" opens `how-made`). An unknown id opens nothing, like a plain visit.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { DisclosureRow } from '../components/pathChooser';
import { useContactFlow } from '../components/support';
import { Button, PushedHeader, Screen, T } from '../components/ui';
import { FAQ } from '../content/support';
import { domainCopy } from '../engine/domainNaming';
import { moveFocus } from '../lib/a11y';
import { useActiveCert } from '../lib/useActiveCert';
import { space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export default function Faq() {
  const { c } = useTheme();
  const { cert } = useActiveCert();
  const contact = useContactFlow(cert.id);
  const params = useLocalSearchParams<{ open?: string }>();
  // Only a real entry id opens one; anything else starts with every answer closed.
  const [deepId] = useState<string | null>(() => (FAQ.some((f) => f.id === params.open) ? params.open! : null));
  const [openId, setOpenId] = useState<string | null>(deepId);
  // Release bug hunt round 1: the entry a link opened is often below the fold (the last of ten). Once
  // it is laid out, scroll it into view and move the screen reader to it, one time only.
  const scrollRef = useRef<ScrollView>(null);
  const deepRowRef = useRef<View>(null);
  const shownDeep = useRef(false);
  const onDeepLayout = (e: LayoutChangeEvent) => {
    if (shownDeep.current) return;
    shownDeep.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - space.md), animated: false });
    moveFocus(deepRowRef, 300);
  };
  return (
    <Screen edges={['top', 'bottom']} scrollRef={scrollRef}>
      <PushedHeader title="Common questions" onBack={() => (router.canGoBack() ? router.back() : router.replace('/you'))} />
      {FAQ.map((f, i) => {
        const open = openId === f.id;
        const last = i === FAQ.length - 1;
        const from = `Common questions: ${f.question}`;
        return (
          <View key={f.id} onLayout={f.id === deepId ? onDeepLayout : undefined}>
            <DisclosureRow
              ref={f.id === deepId ? deepRowRef : undefined}
              title={f.question}
              expanded={open}
              onPress={() => setOpenId(open ? null : f.id)}
              last={last}
            />
            {open && (
              <View style={{ paddingBottom: space.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}>
                {/* An answer is fixed text; domainCopy says "domain" in the course's word (CISA: unchanged). */}
                {f.answer.map((p) => (
                  <T key={p} v="body" style={{ marginTop: space.sm }}>{domainCopy(p, cert)}</T>
                ))}
                <Button
                  kind="ghost"
                  label="Still stuck? Email us"
                  accessibilityHint="Opens Contact support"
                  onPress={() => contact.openSupport(f.topic, from)}
                  style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.xs }}
                />
              </View>
            )}
            {contact.blockFor('support', from)}
          </View>
        );
      })}
      {contact.sheets}
    </Screen>
  );
}
