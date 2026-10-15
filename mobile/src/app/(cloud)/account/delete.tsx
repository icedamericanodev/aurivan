/**
 * Delete account (spec §2.1 A4, Apple 5.1.1(v), Google account deletion),
 * kaisip://account/delete. Settings → Account → Delete account →
 * Continue → (confirm it's you) → Delete account: three taps from Settings'
 * Account row when the sign-in is recent.
 *
 * 1. "Delete your KaiSip account?" with "Also remove my progress from this
 *    phone" UNticked, then Continue or Cancel.
 * 2. Re-confirm. A sign-in under 10 minutes old: type DELETE (any case).
 *    Otherwise confirm it's you first with the same method (email code,
 *    Apple, Google). An account linked to Apple, on an iPhone, always
 *    confirms with Apple: its fresh code lets the server revoke Apple's
 *    token. A line above the DELETE field restates the step 1 choice. The
 *    destructive button lives only here.
 * 3. "Your account is deleted" (and, with the box ticked, that this phone's
 *    progress is gone too).
 * Offline, or a server failure: nothing is deleted, and the copy says so. A
 * sign-in that ended meanwhile: nothing is deleted, and it says sign in again.
 *
 * Email code step: a wrong code shows on the field, which takes focus. An
 * expired code, or too many tries, goes back to "Send a code to …" so a new
 * one can be sent. Sending says "Code sent to …" to a screen reader.
 *
 * Takes NO link parameters (kaisip://account/delete?confirm=DELETE only
 * opens step 1) and calls nothing until a tap. No swipe-back and no Android
 * back while it deletes; Android back on the last step goes to You (the
 * account screens behind it are for an account that no longer exists).
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, TextInput, View } from 'react-native';
import { AccountNotice, codeProblem } from '../../../components/account';
import { Button, CheckRow, PushedHeader, Screen, T, TextField } from '../../../components/ui';
import { copy, type AccountCopyKey } from '../../../content/cloud/copy';
import { cleanCode, typedDelete, validCode, type Provider } from '../../../engine/account';
import { deletePlan, reauth, type DeletePlan } from '../../../lib/account';
import { deleteAccountHere as deleteAccount } from '../../../lib/sync';
import { moveFocus, sayLater } from '../../../lib/a11y';
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
  // A code that didn't work, shown on the field.
  const [codeIssue, setCodeIssue] = useState<string | null>(null);
  const [appleCode, setAppleCode] = useState<string | undefined>(undefined);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState<'plan' | 'reauth' | 'delete' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const titleRef = useRef<View>(null);
  const typeRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account'));
  const goTo = (s: Step) => {
    setStep(s);
    moveFocus(titleRef, 350);
  };
  const problem = (c: string) =>
    setNotice(
      c === 'offline' ? copy('delete.offline') : c === 'unauthorized' || c === 'gone' ? copy('delete.signin') : copy('delete.fail', { supportEmail: config.feedbackEmail }),
    );
  /** Back to "confirm it's you" (the sign-in got old, or Apple's code was refused): a fresh confirmation. */
  const confirmAgain = () => {
    setPlan((p) => (p ? { ...p, gate: 'reauth' } : p));
    setConfirmed(false);
    setCodeSent(false);
    setCode('');
    setCodeIssue(null);
    setAppleCode(undefined);
  };

  // Android's back button: never while the account is being deleted; once it
  // is, to You (the same as Done).
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (busy === 'delete') return true;
        if (step === 'done') {
          router.replace('/you');
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [busy, step]),
  );

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
      if (r.code === 'invalid' && p === 'email' && codeSent) {
        if (r.detail === 'code_expired' || r.detail === 'code_toomany') {
          // This code can't work any more: back to "Send a code to …", and say why.
          setCodeSent(false);
          setCode('');
          setCodeIssue(null);
          setNotice(codeProblem(r.detail));
          return;
        }
        setCodeIssue(codeProblem(r.detail));
        codeRef.current?.focus();
        return;
      }
      if (r.code === 'rate_limited') return setNotice(copy('err.rate'));
      return problem(r.code);
    }
    if (p === 'email' && !codeSent) {
      setCodeSent(true);
      setCodeIssue(null);
      sayLater(copy('code.sent', { email: emailMasked ?? '' }));
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
    if (r.code === 'reauth_required' || (r.code === 'invalid' && (r.detail === 'apple_code_required' || r.detail === 'apple_code_invalid'))) {
      // The sign-in got too old while this screen was open, or Apple's code was refused: confirm it's you again.
      confirmAgain();
      return;
    }
    if (r.code === 'unauthorized') {
      // The sign-in ended (signed out on all devices elsewhere): nothing was deleted, and this phone is signed out.
      setPlan(null);
      setTyped('');
      goTo('s1');
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
          {busy === 'plan' && <T v="meta" style={{ marginTop: space.sm }}>{copy('delete.s1.busy')}</T>}
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
                  ref={codeRef}
                  label={copy('code.field')}
                  value={code}
                  onChangeText={(v) => {
                    setCode(cleanCode(v));
                    if (codeIssue) setCodeIssue(null);
                  }}
                  problem={codeIssue}
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
              {busy === 'reauth' && plan.provider === 'email' && !codeSent && <T v="meta" style={{ marginTop: space.sm }}>{copy('email.sending')}</T>}
            </View>
          ) : (
            <View>
              <T v="meta" style={{ marginTop: space.md }}>{copy(alsoLocal ? 'delete.s2.local.on' : 'delete.s2.local.off')}</T>
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
          <T v="body" style={{ marginTop: space.md }}>{copy(alsoLocal ? 'delete.done.body.local' : 'delete.done.body')}</T>
          <Button label={copy('delete.done.go')} onPress={() => router.replace('/you')} style={{ marginTop: space.xl }} />
        </View>
      )}

      {notice && <AccountNotice text={notice} />}
    </Screen>
  );
}
