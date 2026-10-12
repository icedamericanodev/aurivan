/**
 * "What syncs" (spec §3.3), aurivan://account/what-syncs: a short sheet
 * saying what travels with the account and what stays on this phone, and
 * the one v1 limit (removals don't sync yet). Reads nothing, calls nothing.
 */
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Button, PushedHeader, Screen, T } from '../../../components/ui';
import { copy } from '../../../content/cloud/copy';
import { moveFocus } from '../../../lib/a11y';
import { space } from '../../../theme/tokens';

export default function WhatSyncs() {
  const titleRef = useRef<View>(null);
  useEffect(() => {
    moveFocus(titleRef, 350);
  }, []);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/account'));
  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader icon="close" onBack={back} />
      <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={copy('sync.what.title')} style={{ marginTop: space.sm }}>
        <T v="display">{copy('sync.what.title')}</T>
      </View>
      <T v="body" style={{ marginTop: space.md }}>{copy('sync.what.body')}</T>
      <T v="meta" style={{ marginTop: space.md }}>{copy('sync.what.limits')}</T>
      <Button kind="secondary" label={copy('sync.what.done')} onPress={back} style={{ marginTop: space.xl }} />
    </Screen>
  );
}
