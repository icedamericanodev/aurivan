/**
 * Sign out on this phone (spec §3.1 S5, §3.3), aurivan://account/sign-out.
 * "Sign out?" with "Remove my progress from this phone (for shared
 * devices)", UNticked. Progress stays unless the box is ticked; ticking it
 * asks once more ("This removes all study progress from this phone. Your
 * account's copy isn't affected."). When this phone syncs, the body says
 * sync stops until the learner signs in again.
 *
 * Takes no link parameters and calls nothing until a tap.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { Button, CheckRow, PushedHeader, Screen, T } from '../../../components/ui';
import { copy } from '../../../content/cloud/copy';
import { moveFocus } from '../../../lib/a11y';
import { signOutHere } from '../../../lib/sync';
import { useSyncMeta } from '../../../store/sync';
import { space } from '../../../theme/tokens';

export default function SignOut() {
  const syncing = useSyncMeta((s) => s.enabled);
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const titleRef = useRef<View>(null);
  useEffect(() => {
    moveFocus(titleRef, 350);
  }, []);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/account'));

  const run = async () => {
    setNotice(null);
    setBusy(true);
    const r = await signOutHere({ removeLocal: remove });
    setBusy(false);
    if (r.ok) router.replace('/you');
    else setNotice(copy('err.server'));
  };
  const go = () => {
    if (!remove) return void run();
    Alert.alert(copy('signout.title'), copy('signout.remove.confirm'), [
      { text: copy('cancel'), style: 'cancel' },
      { text: copy('signout.remove.go'), style: 'destructive', onPress: () => void run() },
    ]);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader icon="close" onBack={back} />
      <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={copy('signout.title')} style={{ marginTop: space.sm }}>
        <T v="display">{copy('signout.title')}</T>
      </View>
      <T v="body" style={{ marginTop: space.md }}>{copy(syncing ? 'signout.body.sync' : 'signout.body')}</T>
      <View style={{ marginTop: space.md }}>
        <CheckRow label={copy('signout.remove')} checked={remove} onPress={() => setRemove((v) => !v)} last />
      </View>
      <Button label={copy(remove ? 'signout.remove.go' : 'account.signout')} onPress={go} disabled={busy} style={{ marginTop: space.lg }} />
      <Button kind="ghost" label={copy('cancel')} onPress={back} disabled={busy} style={{ alignSelf: 'center', marginTop: space.sm }} />
      {notice && <AccountNotice text={notice} />}
    </Screen>
  );
}
