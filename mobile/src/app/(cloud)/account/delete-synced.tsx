/**
 * Delete synced progress (spec §3.1 S6, compliance 4.7),
 * kaisip://account/delete-synced: "Delete synced progress?" with what it
 * does (the copy in the account goes; the account and this phone's progress
 * stay; sync turns off; the learner's other devices stop syncing when they
 * next connect), the destructive button, and Cancel. A sheet rather
 * than a system alert, like Sign out, so it reads the same on every
 * platform. Offline or a server problem: nothing is deleted, and it says so.
 *
 * Takes no link parameters and calls nothing until a tap.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { Button, PushedHeader, Screen, T } from '../../../components/ui';
import { copy } from '../../../content/cloud/copy';
import { moveFocus } from '../../../lib/a11y';
import { deleteSyncedProgress } from '../../../lib/sync';
import { space } from '../../../theme/tokens';

export default function DeleteSynced() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'problem' } | null>(null);
  const titleRef = useRef<View>(null);
  useEffect(() => {
    moveFocus(titleRef, 350);
  }, []);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/account'));

  const go = async () => {
    setNotice(null);
    setBusy(true);
    const r = await deleteSyncedProgress();
    setBusy(false);
    if (r.ok) {
      setDone(true);
      setNotice({ tone: 'ok', text: copy('delsync.done') });
    } else {
      setNotice({ tone: 'problem', text: copy(r.code === 'offline' ? 'delsync.offline' : 'delsync.fail') });
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader icon="close" onBack={back} />
      <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={copy('delsync.title')} style={{ marginTop: space.sm }}>
        <T v="display">{copy('delsync.title')}</T>
      </View>
      <T v="body" style={{ marginTop: space.md }}>{copy('delsync.body')}</T>
      <T v="meta" style={{ marginTop: space.sm }}>{copy('delsync.others')}</T>
      {done ? (
        <Button label={copy('sync.what.done')} onPress={back} style={{ marginTop: space.lg }} />
      ) : (
        <>
          <Button kind="danger" label={copy('delsync.go')} onPress={go} disabled={busy} style={{ marginTop: space.lg }} />
          {busy && <T v="meta" style={{ marginTop: space.sm }}>{copy('delsync.busy')}</T>}
          <Button kind="ghost" label={copy('cancel')} onPress={back} disabled={busy} style={{ alignSelf: 'center', marginTop: space.sm }} />
        </>
      )}
      {notice && <AccountNotice text={notice.text} tone={notice.tone} />}
    </Screen>
  );
}
