/**
 * Account pieces (Uplift Phase 6, built OFF; spec PHASE6_8.md §2.2 and
 * DESIGN_SYSTEM.md §17). Every piece here renders NOTHING unless this build
 * has a cloud backend (`cloudReady()`): with the flag off, You and Settings
 * are exactly what they were.
 *
 * - AccountRow: You → Help and feedback, the first row ("Sync across
 *   devices" signed out, "Account and sync" signed in). It is one of only two
 *   ways in; the account is never offered at launch, in onboarding, before a
 *   first question, or as a pop-up.
 * - AccountSettingsGroup: Settings → Account (the other way in).
 * - aboutLine: Settings → About's last sentence.
 * - AccountNotice: one calm message after an action (the `tip` tint, like
 *   Your data's problems: Grove keeps red for wrong answers).
 * - SignInContent: the sign-in sheet's words, the "16 or older" box and the
 *   three buttons, shared by /account (signed out) and /account/sign-in.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { copy, type AccountCopyKey } from '../content/cloud/copy';
import { CLOUD } from '../cloud/flag';
import { cloudReady, hasAgreed, setAgreed, shownProviders, signInWith } from '../lib/account';
import { moveFocus, sayLater } from '../lib/a11y';
import { config } from '../lib/config';
import { useAccount } from '../store/account';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ICON_STROKE, RefreshCw } from './icons';
import { SettingsGroup, SettingsRow } from './settings';
import { Button, CheckRow, ICON_SIZE, ListRow, T } from './ui';

/** What the row under You / Settings says about the account. */
export function accountLines(f: { signedIn: boolean; emailMasked: string | null; providers: readonly string[]; expired: boolean }) {
  if (f.signedIn) {
    return {
      title: copy('you.row.in.title'),
      sub: f.emailMasked ? copy('you.row.in.sub', { email: f.emailMasked }) : copy('you.row.in.sub.relay'),
    };
  }
  return { title: copy('you.row.out.title'), sub: f.expired ? copy('you.row.expired.sub') : copy('you.row.out.sub') };
}

// ── You → Help and feedback: the first row ────────────────────────────
export function AccountRow() {
  const { c } = useTheme();
  const signedIn = useAccount((s) => s.signedIn);
  const emailMasked = useAccount((s) => s.emailMasked);
  const providers = useAccount((s) => s.providers);
  const expired = useAccount((s) => s.expired);
  if (!cloudReady()) return null;
  const { title, sub } = accountLines({ signedIn, emailMasked, providers, expired });
  return (
    <ListRow
      icon={<RefreshCw size={ICON_SIZE.row} color={c.accentText} strokeWidth={ICON_STROKE} />}
      title={title}
      subtitle={sub}
      accessibilityHint={signedIn ? 'Opens your account' : 'Opens sign in. An account is optional.'}
      onPress={() => router.push('/account')}
    />
  );
}

// ── Settings → Account ────────────────────────────────────────────────
export function AccountSettingsGroup() {
  const signedIn = useAccount((s) => s.signedIn);
  const emailMasked = useAccount((s) => s.emailMasked);
  const expired = useAccount((s) => s.expired);
  if (!cloudReady()) return null;
  const value = signedIn ? (emailMasked ?? copy('you.row.in.sub.relay')) : copy('settings.row.out');
  return (
    <SettingsGroup title={copy('settings.group')}>
      <SettingsRow
        title={copy('settings.row')}
        value={value}
        subtitle={!signedIn && expired ? copy('you.row.expired.sub') : undefined}
        accessibilityHint={signedIn ? 'Opens your account' : 'Opens sign in. An account is optional.'}
        onPress={() => router.push('/account')}
        last
      />
    </SettingsGroup>
  );
}

/** Settings → About's last sentence: unchanged with the flag off. PR 7 passes `syncing`. */
export function aboutLine(syncing = false): string {
  if (!CLOUD) return copy('about.off');
  return copy(syncing ? 'about.on.sync' : 'about.on.out');
}

// ── A calm message after an action ────────────────────────────────────
export function AccountNotice({ text, tone = 'problem' }: { text: string; tone?: 'ok' | 'problem' }) {
  const { c } = useTheme();
  // Said once when it appears (not a live region, which would read it twice).
  useEffect(() => {
    sayLater(text);
  }, [text]);
  const ok = tone === 'ok';
  return (
    <View accessible style={{ marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: ok ? c.correctBg : c.tipBg }}>
      <T v="small" color={c.ink}>{text}</T>
    </View>
  );
}

/** The copy for a failed sign-in call (a cancelled Apple or Google sheet: nothing). */
export function signInProblem(code: string): string | null {
  if (code === 'cancelled') return null;
  const key: AccountCopyKey = code === 'offline' ? 'err.offline' : code === 'rate_limited' ? 'err.rate' : 'err.server';
  return copy(key);
}

// ── The sign-in sheet ─────────────────────────────────────────────────
/**
 * The words, the "16 or older and I agree" box and the buttons. Until the
 * box is ticked every button is disabled and the hint says why. Apple and
 * Google sign in here (a cancelled sheet just comes back); email opens the
 * email screen. Phase 9 swaps the Apple button for Apple's own system button.
 */
export function SignInContent({ onClose }: { onClose: () => void }) {
  const [agreed, setAgreedState] = useState(() => hasAgreed());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const titleRef = useRef<View>(null);
  // The sheet's title takes screen-reader focus as it opens.
  useEffect(() => {
    moveFocus(titleRef, 350);
  }, []);
  const toggle = () => {
    setAgreed(!agreed);
    setAgreedState(!agreed);
  };
  const provider = async (p: 'apple' | 'google') => {
    setProblem(null);
    setBusy(true);
    const r = await signInWith(p, true);
    setBusy(false);
    // Signed in: the Account screen takes over (it reads the store).
    if (!r.ok) setProblem(signInProblem(r.code));
  };
  const shown = shownProviders();
  const label: Record<string, AccountCopyKey> = { apple: 'signin.apple', google: 'signin.google', email: 'signin.email' };
  return (
    <View>
      <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={copy('signin.title')} style={{ marginTop: space.sm }}>
        <T v="display">{copy('signin.title')}</T>
      </View>
      <T v="body" style={{ marginTop: space.md }}>{copy('signin.body1')}</T>
      <T v="body" style={{ marginTop: space.sm }}>{copy('signin.body2')}</T>
      <T v="meta" style={{ marginTop: space.sm }}>{copy('signin.body3')}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginLeft: -space.sm }}>
        {config.privacyUrl !== '' && (
          <Button kind="ghost" label={`${copy('signin.privacy')} ›`} accessibilityLabel={copy('signin.privacy')} accessibilityHint="Opens in your browser" onPress={() => Linking.openURL(config.privacyUrl)} />
        )}
        {config.termsUrl !== '' && (
          <Button kind="ghost" label={`${copy('signin.terms')} ›`} accessibilityLabel={copy('signin.terms')} accessibilityHint="Opens in your browser" onPress={() => Linking.openURL(config.termsUrl)} />
        )}
      </View>
      <View style={{ marginTop: space.sm }}>
        <CheckRow label={copy('signin.age')} checked={agreed} onPress={toggle} last />
      </View>
      {!agreed && <T v="meta" style={{ marginTop: space.xs }}>{copy('signin.age.hint')}</T>}
      <View style={{ gap: space.sm, marginTop: space.lg }}>
        {shown.map((p) => (
          <Button
            key={p}
            kind="secondary"
            label={copy(label[p])}
            disabled={!agreed || busy}
            accessibilityHint={agreed ? undefined : copy('signin.age.hint')}
            onPress={() => (p === 'email' ? router.push('/account/email') : provider(p))}
          />
        ))}
      </View>
      {busy && <T v="meta" style={{ marginTop: space.sm }}>{copy('signin.busy')}</T>}
      {problem && <AccountNotice text={problem} />}
      <Button kind="ghost" label={copy('signin.later')} onPress={onClose} style={{ alignSelf: 'center', marginTop: space.md }} />
    </View>
  );
}
