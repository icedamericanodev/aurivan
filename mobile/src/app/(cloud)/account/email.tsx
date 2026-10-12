/**
 * Sign in with email (spec §2.1 A2, §2.2), aurivan://account/email.
 *
 * Step 1: the email field and "Send code". Step 2: the 6-digit code,
 * "Sign in", "Send a new code in 0:42" (60 seconds between sends) and
 * "Use a different email". A code works for 10 minutes; after 5 wrong codes
 * the learner must ask for a new one. No password and no magic link, so no
 * link ever carries a sign-in token.
 *
 * Reached only after the sign-in sheet's "16 or older" box was ticked in
 * this visit (lib/account.ts hasAgreed); a link straight here goes back to
 * the sheet. Takes no link parameters and sends nothing until a tap.
 * Signed in → back to /account, which now shows the account.
 */
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { AccountNotice, codeProblem, signInProblem } from '../../../components/account';
import { Button, PushedHeader, Screen, T, TextField } from '../../../components/ui';
import { copy } from '../../../content/cloud/copy';
import { cleanCode, clockLabel, clockSpoken, maskEmail, MAX_CODE_TRIES, normalizeEmail, resendWaitMs, validCode, validEmail } from '../../../engine/account';
import { hasAgreed, sendCode, verifyCode } from '../../../lib/account';
import { moveFocus, sayLater } from '../../../lib/a11y';
import { space } from '../../../theme/tokens';

export default function EmailSignIn() {
  const [agreed] = useState(() => hasAgreed());
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [emailProblem, setEmailProblem] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeIssue, setCodeIssue] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const codeRef = useRef<TextInput>(null);
  const titleRef = useRef<View>(null);

  // The resend countdown ticks once a second while it runs (nothing moves: only the number changes).
  const wait = resendWaitMs(sentAt, now);
  useEffect(() => {
    if (wait <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [wait > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!agreed) return <Redirect href="/account/sign-in" />;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account'));

  const send = async () => {
    setNotice(null);
    if (!validEmail(email)) {
      setEmailProblem(copy('email.bad'));
      return;
    }
    setEmailProblem(null);
    setBusy(true);
    const r = await sendCode(normalizeEmail(email));
    setBusy(false);
    if (!r.ok) {
      setNotice(signInProblem(r.code));
      return;
    }
    const t = Date.now();
    setSentAt(t);
    setNow(t);
    setTries(0);
    setCode('');
    setCodeIssue(null);
    if (step === 'email') {
      // The code step's title ("Enter the code we sent to …") takes focus and is read out.
      setStep('code');
      moveFocus(titleRef, 350);
    } else {
      // "Send a new code": nothing moves, so say that it went.
      sayLater(copy('code.sent', { email: maskEmail(email) ?? '' }));
    }
  };

  const submit = async () => {
    if (!validCode(code) || tries >= MAX_CODE_TRIES) return;
    setNotice(null);
    setBusy(true);
    const r = await verifyCode(normalizeEmail(email), code, true);
    setBusy(false);
    if (r.ok) {
      back();
      return;
    }
    if (r.code === 'invalid') {
      const next = r.detail === 'code_toomany' ? MAX_CODE_TRIES : tries + 1;
      setTries(next);
      setCodeIssue(next >= MAX_CODE_TRIES ? copy('code.toomany') : codeProblem(r.detail));
      codeRef.current?.focus();
    } else {
      setNotice(signInProblem(r.code));
    }
  };

  const masked = maskEmail(email) ?? '';
  return (
    <Screen edges={['top', 'bottom']}>
      <PushedHeader title={copy('email.title')} onBack={back} />
      {step === 'email' ? (
        <View>
          <TextField
            label={copy('email.field')}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (emailProblem) setEmailProblem(null);
            }}
            problem={emailProblem}
            help={copy('email.help')}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            autoCapitalize="none"
            returnKeyType="send"
            onSubmitEditing={send}
            maxLength={254}
          />
          <Button label={copy('email.send')} onPress={send} disabled={busy} style={{ marginTop: space.lg }} />
          {busy && <T v="meta" style={{ marginTop: space.sm }}>{copy('email.sending')}</T>}
        </View>
      ) : (
        <View>
          <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={copy('code.title', { email: masked })} style={{ marginTop: space.sm }}>
            <T v="body">{copy('code.title', { email: masked })}</T>
          </View>
          <TextField
            ref={codeRef}
            label={copy('code.field')}
            value={code}
            onChangeText={(v) => {
              setCode(cleanCode(v));
              if (codeIssue && tries < MAX_CODE_TRIES) setCodeIssue(null);
            }}
            problem={codeIssue}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="done"
            onSubmitEditing={submit}
            maxLength={12}
            tabular
          />
          <Button
            label={copy('code.submit')}
            onPress={submit}
            disabled={busy || !validCode(code) || tries >= MAX_CODE_TRIES}
            style={{ marginTop: space.lg }}
          />
          {wait > 0 ? (
            // While waiting: a quiet line, not a greyed-out button (it isn't something to tap yet).
            // The same 48pt row as the button it becomes, so nothing below jumps.
            <View style={{ minHeight: 48, justifyContent: 'center', marginTop: space.sm }}>
              <T v="meta" num accessibilityLabel={copy('code.resend.wait.spoken', { time: clockSpoken(wait) })}>
                {copy('code.resend.wait', { 'm:ss': clockLabel(wait) })}
              </T>
            </View>
          ) : (
            <Button
              kind="ghost"
              label={copy('code.resend')}
              disabled={busy}
              onPress={send}
              style={{ alignSelf: 'flex-start', marginLeft: -space.sm, marginTop: space.sm }}
            />
          )}
          <Button
            kind="ghost"
            label={copy('code.other')}
            disabled={busy}
            onPress={() => {
              setStep('email');
              setCode('');
              setCodeIssue(null);
              setNotice(null);
            }}
            style={{ alignSelf: 'flex-start', marginLeft: -space.sm }}
          />
        </View>
      )}
      {notice && <AccountNotice text={notice} />}
    </Screen>
  );
}
