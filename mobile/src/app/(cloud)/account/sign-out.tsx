/**
 * Sign out on this phone (spec §3.1 S5, §3.3), aurivan://account/sign-out.
 * "Sign out?" with "Remove my progress from this phone (for shared
 * devices)", UNticked. Progress stays unless the box is ticked. Ticked, the
 * button turns into the red "Remove and sign out", and a tap (Phase 7
 * review, UX H1):
 * 1. while this phone syncs, first sends what it has to the account
 *    ("Syncing your progress…");
 * 2. asks once more. If everything here is in the account: "This removes
 *    all your study progress, your plant and your study settings from this
 *    phone. Your account's copy isn't affected." If not (sync off, paused,
 *    or the last changes didn't get there): "Some of this phone's progress
 *    isn't in your account yet. Removing it deletes it for good. Save a
 *    backup first if you might want it."
 * 3. removes it: the phone is back to a fresh install's study state (theme,
 *    motion and reminders stay), with its link to the account.
 * When this phone syncs, the body says sync stops until the learner signs
 * in again.
 *
 * Takes no link parameters and calls nothing until a tap.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { Button, CheckRow, PushedHeader, Screen, T } from '../../../components/ui';
import { copy } from '../../../content/cloud/copy';
import { moveFocus, sayLater } from '../../../lib/a11y';
import { prepareRemove, signOutHere } from '../../../lib/sync';
import { useSyncMeta } from '../../../store/sync';
import { space } from '../../../theme/tokens';

export default function SignOut() {
  const syncing = useSyncMeta((s) => s.enabled);
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState<'sync' | 'out' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const titleRef = useRef<View>(null);
  useEffect(() => {
    moveFocus(titleRef, 350);
  }, []);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/account'));

  const run = async () => {
    setNotice(null);
    setBusy('out');
    const r = await signOutHere({ removeLocal: remove });
    setBusy(null);
    if (r.ok) router.replace('/you');
    else setNotice(copy('err.server'));
  };
  const go = async () => {
    if (!remove) return void run();
    setNotice(null);
    // Send this phone's latest to the account first (while it syncs), then say plainly what removing means.
    if (syncing) {
      setBusy('sync');
      sayLater(copy('first.busy'));
    }
    const { unsynced } = await prepareRemove();
    setBusy(null);
    Alert.alert(copy('signout.title'), copy(unsynced ? 'signout.remove.confirm.unsynced' : 'signout.remove.confirm'), [
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
      {/* Removing is destructive: the red button (UX H1). */}
      <Button kind={remove ? 'danger' : 'primary'} label={copy(remove ? 'signout.remove.go' : 'account.signout')} onPress={() => void go()} disabled={busy !== null} style={{ marginTop: space.lg }} />
      {busy === 'sync' && <T v="meta" style={{ marginTop: space.sm }}>{copy('first.busy')}</T>}
      <Button kind="ghost" label={copy('cancel')} onPress={back} disabled={busy !== null} style={{ alignSelf: 'center', marginTop: space.sm }} />
      {notice && <AccountNotice text={notice} />}
    </Screen>
  );
}
