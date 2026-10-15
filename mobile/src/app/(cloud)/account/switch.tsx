/**
 * A different account on this phone (spec §3.1 S5, security §4.6),
 * kaisip://account/switch. The phone's progress was synced with another
 * account; the learner who just signed in chooses:
 * - Start fresh with this account (the default): this phone's progress goes
 *   to the 7-day "Undo sync" slot and the phone takes this account's
 *   progress. Nothing of the other learner is added to this account.
 * - Keep this phone's progress: it is added to this account (a merge).
 * Either way the phone gets a new install id (Phase 6 review N6).
 *
 * Shown only after a sign-in, a launch or "Sync this phone" found the other
 * account's link; opened any other way it goes back to Account and calls
 * nothing. "Not now" (or closing the sheet) turns sync off on this phone and
 * changes nothing else: nothing syncs into either account until the learner
 * turns it on again and chooses here (Phase 7 review, CR B2). When an undo
 * copy is already waiting, the sheet says Start fresh replaces it.
 */
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { syncProblem } from '../../../components/sync';
import { Button, PushedHeader, RadioRow, Screen, T } from '../../../components/ui';
import { copy } from '../../../content/cloud/copy';
import { moveFocus, sayLater } from '../../../lib/a11y';
import { chooseSwitch, declineSwitch, switchOffered, switchReplacesUndo } from '../../../lib/sync';
import { useAccount } from '../../../store/account';
import { space } from '../../../theme/tokens';

export default function SwitchAccount() {
  const emailMasked = useAccount((s) => s.emailMasked);
  const [offered] = useState(() => switchOffered());
  const [replaces] = useState(() => switchReplacesUndo());
  const [choice, setChoice] = useState<'fresh' | 'keep'>('fresh');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const titleRef = useRef<View>(null);
  useEffect(() => {
    moveFocus(titleRef, 350);
  }, []);
  if (!offered) return <Redirect href="/account" />;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account'));
  // "Not now" or close: sync is off on this phone until the learner chooses here.
  const later = () => {
    declineSwitch();
    back();
  };
  const go = async () => {
    setNotice(null);
    setBusy(true);
    sayLater(copy('first.busy'));
    const r = await chooseSwitch(choice);
    setBusy(false);
    if (r.ok) back();
    else setNotice(syncProblem(r.code));
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader icon="close" onBack={later} />
      <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={copy('switch.title')} style={{ marginTop: space.sm }}>
        <T v="display">{copy('switch.title')}</T>
      </View>
      <T v="body" style={{ marginTop: space.md }}>{copy('switch.body', { email: emailMasked ?? copy('first.relay') })}</T>
      <View accessibilityRole="radiogroup" style={{ marginTop: space.lg }}>
        <RadioRow title={copy('switch.fresh')} subtitle={copy('switch.fresh.sub')} checked={choice === 'fresh'} onPress={() => setChoice('fresh')} disabled={busy} />
        <RadioRow title={copy('switch.keep')} subtitle={copy('switch.keep.sub')} checked={choice === 'keep'} onPress={() => setChoice('keep')} disabled={busy} last />
      </View>
      {replaces && choice === 'fresh' && <T v="meta" style={{ marginTop: space.md }}>{copy('switch.undo.replaces')}</T>}
      <Button label={copy('switch.go')} onPress={go} disabled={busy} style={{ marginTop: space.lg }} />
      {busy && <T v="meta" style={{ marginTop: space.sm }}>{copy('first.busy')}</T>}
      <Button kind="ghost" label={copy('first.later')} onPress={later} disabled={busy} style={{ alignSelf: 'center', marginTop: space.sm }} />
      {notice && <AccountNotice text={notice} />}
    </Screen>
  );
}
