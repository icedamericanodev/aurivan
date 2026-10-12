/**
 * The first-sync preview (spec §3.1 S2, §3.2), aurivan://account/first-sync.
 * Before this phone first syncs, the learner sees what will happen:
 * - only the phone has progress → "Add this phone's progress to your account?"
 * - only the account has progress → "Bring your progress to this phone?"
 * - both → "Bring your progress together?" (Combine)
 * Three columns, This phone · Account · After: the After column is the real
 * merge result, not a guess. It always names the masked account (a learner
 * tricked into someone else's account would see it here). When the phone
 * has progress, it is kept for 7 days as "Undo sync" (it replaces an older
 * "Undo restore", and says so).
 *
 * The preview is worked out BEFORE this screen opens (lib/sync.ts
 * startFirstSync, after a tap or a sign-in). Opened any other way (a deep
 * link, or a stale preview) it goes back to the Account screen and calls
 * nothing.
 */
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { PreviewRows, syncProblem } from '../../../components/sync';
import { Button, PushedHeader, Screen, T } from '../../../components/ui';
import { copy, type AccountCopyKey } from '../../../content/cloud/copy';
import { moveFocus } from '../../../lib/a11y';
import { confirmPreview, dismissFirstSync, pendingPreview } from '../../../lib/sync';
import { useAccount } from '../../../store/account';
import { space } from '../../../theme/tokens';

const WORDS: Record<'phone' | 'account' | 'both', { title: AccountCopyKey; body: AccountCopyKey; go: AccountCopyKey }> = {
  phone: { title: 'first.phone.title', body: 'first.phone.body', go: 'first.phone.go' },
  account: { title: 'first.account.title', body: 'first.account.body', go: 'first.account.go' },
  both: { title: 'first.both.title', body: 'first.both.body', go: 'first.both.go' },
};

export default function FirstSync() {
  const emailMasked = useAccount((s) => s.emailMasked);
  // Read once: the preview doesn't change under the learner's eyes.
  const [preview] = useState(() => pendingPreview());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const titleRef = useRef<View>(null);
  useEffect(() => {
    moveFocus(titleRef, 350);
  }, []);
  if (!preview) return <Redirect href="/account" />;

  const words = WORDS[preview.case === 'none' ? 'phone' : preview.case];
  const email = emailMasked ?? copy('you.row.in.sub.relay');
  const back = () => (router.canGoBack() ? router.back() : router.replace('/account'));
  const later = () => {
    dismissFirstSync();
    back();
  };
  const go = async () => {
    setNotice(null);
    setBusy(true);
    const r = await confirmPreview();
    setBusy(false);
    if (r.ok) back();
    else setNotice(syncProblem(r.code));
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader icon="close" onBack={later} />
      <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={copy(words.title)} style={{ marginTop: space.sm }}>
        <T v="display">{copy(words.title)}</T>
      </View>
      <T v="body" style={{ marginTop: space.md }}>{copy(words.body, { email })}</T>
      <PreviewRows rows={preview.rows} />
      {preview.undo && <T v="meta" style={{ marginTop: space.md }}>{copy('first.undo')}</T>}
      {preview.replacesUndo && <T v="meta" style={{ marginTop: space.xs }}>{copy('first.undo.replaces')}</T>}
      <Button label={copy(words.go)} onPress={go} disabled={busy} style={{ marginTop: space.lg }} />
      {busy && <T v="meta" style={{ marginTop: space.sm }}>{copy('first.busy')}</T>}
      <Button kind="ghost" label={copy('first.later')} onPress={later} disabled={busy} style={{ alignSelf: 'center', marginTop: space.sm }} />
      {notice && <AccountNotice text={notice} />}
    </Screen>
  );
}
