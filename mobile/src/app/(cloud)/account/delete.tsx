/**
 * Delete account (spec §2.1 A4, Apple 5.1.1(v), Google account deletion),
 * aurivan://account/delete. Settings → Account → Delete account →
 * Continue → (confirm it's you) → Delete account: three taps from Settings'
 * Account row when the sign-in is recent.
 *
 * 1. "Delete your Aurivan account?" with "Also remove my progress from this
 *    phone" UNticked, then Continue or Cancel.
 * 2. Re-confirm. A sign-in under 10 minutes old: type DELETE. Otherwise
 *    confirm it's you first with the same method (email code, Apple,
 *    Google); Apple's fresh code lets the server revoke Apple's token.
 *    The destructive button lives only here.
 * 3. "Your account is deleted".
 * Offline, or a server failure: nothing is deleted, and the copy says so.
 *
 * Takes NO link parameters (aurivan://account/delete?confirm=DELETE only
 * opens step 1) and calls nothing until a tap. No swipe-back while it runs.
 */
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { AccountNotice } from '../../../components/account';
import { Button, CheckRow, PushedHeader, Screen, T, TextField } from '../../../components/ui';
import { copy, type AccountCopyKey } from '../../../content/cloud/copy';
import { cleanCode, typedDelete, validCode, type Provider } from '../../../engine/account';
import { deleteAccount, deletePlan, reauth, type DeletePlan } from '../../../lib/account';
import { moveFocus } from '../../../lib/a11y';
import { config } from '../../../lib/config';
import { useAccount } from '../../../store/account';
import { space } from '../../../theme/tokens';

type Step = 's1' | 's2' | 'done';

const PROVIDER_BUTTON: Record<Provider, AccountCopyKey> = { apple: 'signin.apple', google: 'signin.google', email: 'signin.email' };

export default function DeleteAccount() {
  const emailMasked = useAccount((s) => s.emailMasked);
  const [step, setStep] = useState<Step>('s1');
  const [alsoLocal, setAlsoLocal] = useState(false);
  const [plan, setPlan] = useState<DeletePlan | null>(null);
  // Confirmed it's you in this visit (or the sign-in was recent).
  const [confirmed, setConfirmed] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [appleCode, setAppleCode] = useState<string | undefined>(undefined);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState<'plan' | 'reauth' | 'delete' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const titleRef = useRef<View>(null);
  const typeRef = useRef<TextInput>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account'));
  const goTo = (s: Step) => {
    setStep(s);
    moveFocus(titleRef, 350);
  };
  const problem = (code: string) => setNotice(code === 'offline' ? copy('delete.offline') : copy('delete.fail', { supportEmail: config.feedbackEmail }));

  const cont = async () => {
    setNotice(null);
    setBusy('plan');
    const r = await deletePlan();
    setBusy(null);
    if (!r.ok) return problem(r.code);
    setPlan(r.plan);
    setConfirmed(r.plan.gate === 'type');
    goTo('s2');
  };

  const confirmIt = async () => {
    if (!plan) return;
    setNotice(null);
    setBusy('reauth');
    const p = plan.provider;
    // Email: the first tap sends a code; the second checks it.
    const r = p === 'email' ? await reauth('email', codeSent ? code : undefined) : await reauth(p);
    setBusy(null);
    if (!r.ok) {
      if (r.code === 'cancelled') return;
      if (r.code === 'invalid' && p === 'email') return setNotice(r.detail === 'code_expired' ? copy('code.expired') : r.detail === 'code_toomany' ? copy('code.toomany') : copy('code.wrong'));
      if (r.code === 'rate_limited') return setNotice(copy('err.rate'));
      return problem(r.code);
    }
    if (p === 'email' && !codeSent) {
      setCodeSent(true);
      return;
    }
    setAppleCode(r.appleAuthorizationCode);
    setConfirmed(true);
    setTimeout(() => typeRef.current?.focus(), 300);
  };

  const remove = async () => {
    if (!typedDelete(typed)) return;
    setNotice(null);
    setBusy('delete');
    const r = await deleteAccount({ alsoLocal, appleAuthorizationCode: appleCode });
    setBusy(null);
    if (r.ok) return goTo('done');
    if (r.code === 'reauth_required') {
      // The sign-in got too old while this screen was open: confirm it's you again.
      setPlan((p) => (p ? { ...p, gate: 'reauth' } : p));
      setConfirmed(false);
      setCodeSent(false);
      setCode('');
      return;
    }
    problem(r.code);
  };

  const header = (title: AccountCopyKey) => (
    <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={copy(title)} style={{ marginTop: space.sm }}>
      <T v="hero">{copy(title)}</T>
    </View>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      {step !== 'done' && <PushedHeader title={copy('delete.row')} onBack={back} />}

      {step === 's1' && (
        <View>
          {header('delete.s1.title')}
          <T v="body" style={{ marginTop: space.md }}>{copy('delete.s1.body')}</T>
          <View style={{ marginTop: space.md }}>
            <CheckRow label={copy('delete.s1.local')} checked={alsoLocal} onPress={() => setAlsoLocal((v) => !v)} last />
          </View>
          <Button label={copy('delete.s1.go')} onPress={cont} disabled={busy !== null} style={{ marginTop: space.lg }} />
          <Button kind="ghost" label={copy('delete.s1.cancel')} onPress={back} style={{ alignSelf: 'center', marginTop: space.sm }} />
        </View>
      )}

      {step === 's2' && plan && (
        <View>
          {header('delete.s1.title')}
          {!confirmed ? (
            <View>
              <T v="body" style={{ marginTop: space.md }}>{copy('delete.s2.reauth')}</T>
              {plan.provider === 'email' && codeSent && (
                <TextField
                  label={copy('code.field')}
                  value={code}
                  onChangeText={(v) => setCode(cleanCode(v))}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={12}
                  tabular
                />
              )}
              <Button
                kind="secondary"
                label={
                  plan.provider === 'email'
                    ? codeSent
                      ? copy('delete.s2.reauth.confirm')
                      : copy('delete.s2.reauth.email', { email: emailMasked ?? '' })
                    : copy(PROVIDER_BUTTON[plan.provider])
                }
                disabled={busy !== null || (plan.provider === 'email' && codeSent && !validCode(code))}
                onPress={confirmIt}
                style={{ marginTop: space.lg }}
              />
            </View>
          ) : (
            <View>
              <TextField
                ref={typeRef}
                label={copy('delete.s2.type')}
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="characters"
                returnKeyType="done"
                maxLength={12}
              />
              <Button kind="danger" label={copy('delete.s2.go')} onPress={remove} disabled={busy !== null || !typedDelete(typed)} style={{ marginTop: space.lg }} />
              {busy === 'delete' && <T v="meta" style={{ marginTop: space.sm }}>{copy('delete.busy')}</T>}
            </View>
          )}
          <Button kind="ghost" label={copy('delete.s1.cancel')} onPress={back} disabled={busy === 'delete'} style={{ alignSelf: 'center', marginTop: space.sm }} />
        </View>
      )}

      {step === 'done' && (
        <View style={{ marginTop: space.xxl }}>
          {header('delete.done.title')}
          <T v="body" style={{ marginTop: space.md }}>{copy('delete.done.body')}</T>
          <Button label={copy('delete.done.go')} onPress={() => router.replace('/you')} style={{ marginTop: space.xl }} />
        </View>
      )}

      {notice && <AccountNotice text={notice} />}
    </Screen>
  );
}
