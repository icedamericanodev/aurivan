/**
 * Account (spec §2.2), aurivan://account. Reached from You → "Sync across
 * devices" / "Account and sync" and Settings → Account, nowhere else.
 *
 * - Signed out: the sign-in sheet (components/account.tsx SignInContent).
 *   Signing in with Apple or Google, or coming back from the email screen
 *   signed in, turns this into the account screen in place.
 * - Signed in: "Signed in as j•••@gmail.com", Your account data (Download
 *   my data), Sign out and Sign out on all devices (each asks first), then
 *   Delete account, set apart, and the line that progress works either way.
 *   No red here: Grove keeps red for wrong answers; the destructive button
 *   is on the delete screen's last step.
 *
 * Reads only the account store on open: no backend call until a tap, so a
 * deep link can never start anything (spec §2.6).
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { AccountNotice, SignInContent } from '../../../components/account';
import { SettingsRow } from '../../../components/settings';
import { Gap, PushedHeader, Screen, Section, T } from '../../../components/ui';
import { copy } from '../../../content/cloud/copy';
import { downloadMyData, signOut, sweepAccountFiles } from '../../../lib/account';
import { useAccount } from '../../../store/account';
import { space } from '../../../theme/tokens';

type Busy = 'download' | 'signout' | null;

export default function Account() {
  const signedIn = useAccount((s) => s.signedIn);
  const emailMasked = useAccount((s) => s.emailMasked);
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'problem' } | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/you'));

  // Account data files we wrote more than an hour ago leave the app's cache (they hold the email).
  useEffect(() => {
    sweepAccountFiles();
  }, []);

  if (!signedIn) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PushedHeader icon="close" onBack={back} />
        {/* A sign-in that ended during an action here ("Sign in again to download your data"). */}
        {notice && <AccountNotice text={notice.text} tone={notice.tone} />}
        <SignInContent onClose={back} />
      </Screen>
    );
  }

  const download = async () => {
    setNotice(null);
    setBusy('download');
    const r = await downloadMyData();
    setBusy(null);
    if (r.ok) {
      if (r.outcome === 'shared') setNotice({ tone: 'ok', text: copy('account.download.done') });
      else setNotice({ tone: 'problem', text: copy('account.download.fail') });
    } else {
      // A sign-in that ended (or would need confirming) is never "try again later": it says sign in again.
      const signIn = r.code === 'unauthorized' || r.code === 'gone' || r.code === 'reauth_required';
      setNotice({
        tone: 'problem',
        text: copy(r.code === 'rate_limited' ? 'account.download.rate' : r.code === 'offline' ? 'err.offline' : signIn ? 'account.download.signin' : 'account.download.fail'),
      });
    }
  };

  const confirmSignOut = (scope: 'local' | 'global') => {
    const local = scope === 'local';
    Alert.alert(copy(local ? 'signout.title' : 'signoutAll.title'), copy(local ? 'signout.body' : 'signoutAll.body'), [
      { text: copy('cancel'), style: 'cancel' },
      {
        text: copy(local ? 'account.signout' : 'account.signoutAll'),
        onPress: async () => {
          setNotice(null);
          setBusy('signout');
          const r = await signOut(scope);
          setBusy(null);
          if (r.ok) back();
          else setNotice({ tone: 'problem', text: copy(r.code === 'offline' ? 'signout.offline' : 'err.server') });
        },
      },
    ]);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title={copy('account.title')} onBack={back} />
      <T v="body" style={{ marginTop: space.sm }}>
        {emailMasked ? copy('account.signedin', { email: emailMasked }) : copy('account.signedin.relay')}
      </T>

      {/* PR 7 adds the Sync section here. */}

      <Section title={copy('account.data')} />
      <SettingsRow
        title={copy('account.download')}
        subtitle={busy === 'download' ? copy('account.download.busy') : copy('account.download.sub')}
        accessibilityHint={copy('hint.download')}
        disabled={busy !== null}
        onPress={download}
        chevron={false}
        last
      />
      {notice && <AccountNotice text={notice.text} tone={notice.tone} />}

      <Section title={copy('account.section.signout')} />
      <SettingsRow title={copy('account.signout')} disabled={busy !== null} onPress={() => confirmSignOut('local')} chevron={false} accessibilityHint={copy('hint.signout')} />
      <SettingsRow title={copy('account.signoutAll')} disabled={busy !== null} onPress={() => confirmSignOut('global')} chevron={false} accessibilityHint={copy('hint.signoutAll')} last />

      {/* Set apart, like Reset in Settings. */}
      <Gap h={space.xxl} />
      <SettingsRow title={copy('delete.row')} subtitle={copy('delete.row.sub')} disabled={busy !== null} onPress={() => router.push('/account/delete')} last />
      <T v="meta" style={{ marginTop: space.sm }}>{copy('account.foot')}</T>
    </Screen>
  );
}
