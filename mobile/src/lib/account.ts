/**
 * Accounts: the phone-side glue (Uplift Phase 6, built OFF; spec §2.6).
 *
 * Screens call these; these call the cloud backend's AuthPort and keep the
 * account store's NON-SECRET facts up to date (signed in, the masked email,
 * the sign-in methods). Every call returns a plain result instead of
 * throwing, with a CloudError code the screen turns into copy. Nothing here
 * ever logs: no token, code, email or account id reaches the console.
 *
 * With the flag off none of this runs: `cloudReady()` is false, the entry
 * points are hidden, and the (cloud) screens redirect to Today.
 */
import Constants from 'expo-constants';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AppState, Platform } from 'react-native';
import { getBackend } from '../cloud/backend';
import { CLOUD, PROVIDERS } from '../cloud/flag';
import { errorCode, CloudError, type AccountInfo, type CloudErrorCode } from '../cloud/types';
import { accountExportFileName, deleteGate, providersFor, reauthProvider, TERMS_VERSION, type Provider } from '../engine/account';
import { SIGNED_OUT, useAccount } from '../store/account';
import { useBackup } from '../store/backup';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { sweepBackupFiles } from './backup';

export type Result<T = object> = ({ ok: true } & T) | { ok: false; code: CloudErrorCode; detail?: string; retryAfterSec?: number };

/** True when this build has a cloud backend (never with the flag off). */
export function cloudReady(): boolean {
  return CLOUD && getBackend() !== null;
}

/** The sign-in buttons this phone shows (Apple, Google, email; App Store 4.8 kept). */
export function shownProviders(): Provider[] {
  return providersFor(Platform.OS, PROVIDERS);
}

const backend = () => {
  const b = getBackend();
  if (!b) throw new CloudError('server');
  return b;
};

/** A failed call as a result: its CloudError code (anything else is 'server', never a raw message). */
function failed(e: unknown): Result<never> {
  if (e instanceof CloudError) return { ok: false, code: e.code, detail: e.detail, retryAfterSec: e.retryAfterSec };
  return { ok: false, code: errorCode(e) };
}

/** The store's facts for a signed-in account (or signed out). Never stores the id or the full email. */
function apply(a: AccountInfo | null) {
  const set = useAccount.getState().setFacts;
  if (a && a.termsVersion) set({ signedIn: true, emailMasked: a.emailMasked, providers: a.providers, expired: false });
  else if (!a) set({ signedIn: false, emailMasked: null, providers: [] });
}

// ── Launch ────────────────────────────────────────────────────────────
/**
 * Cloud builds only, once at launch (root _layout): load the saved facts,
 * compare them with the session the backend really has, follow its changes,
 * and tell it when the app is in front (the session refreshes only then).
 * Returns a function that stops listening.
 *
 * - Saved facts say signed in, but there is no session (a phone restored
 *   from a backup: the secure key store isn't in backups) → quietly signed
 *   out, and the row says "Sign in again to keep syncing". Never a crash.
 * - A session whose account never accepted the Terms (made on another
 *   device that stopped half-way) → signed out here; the sign-in sheet asks
 *   again before the account is used.
 */
export async function initAccount(): Promise<() => void> {
  if (!cloudReady()) return () => {};
  const b = backend();
  await useAccount.persist.rehydrate();
  try {
    const a = await b.auth.current();
    const was = useAccount.getState();
    if (!a) {
      if (was.signedIn) useAccount.getState().setFacts({ ...SIGNED_OUT, syncedAccountHash: was.syncedAccountHash, expired: true });
    } else if (!a.termsVersion) {
      await b.auth.signOut('local').catch(() => {});
      apply(null);
    } else {
      apply(a);
    }
  } catch {
    // Can't tell right now: keep what the phone last knew.
  }
  const off = b.auth.onChange((a) => apply(a));
  b.auth.setForeground(AppState.currentState === 'active');
  const sub = AppState.addEventListener('change', (s) => b.auth.setForeground(s === 'active'));
  return () => {
    off();
    sub.remove();
  };
}

// ── Sign in ───────────────────────────────────────────────────────────
/**
 * The sign-in sheet's "I'm 16 or older and I agree to the Terms" box, for
 * this visit only (never saved). The email screen takes no link parameters
 * (a deep link can't tick the box for the learner), so it reads this; it
 * lapses after 30 minutes and on every app start.
 */
const AGREE_TTL_MS = 30 * 60_000;
let agreedAt: number | null = null;
export function setAgreed(on: boolean, now = Date.now()) {
  agreedAt = on ? now : null;
}
export function hasAgreed(now = Date.now()): boolean {
  return agreedAt !== null && now - agreedAt >= 0 && now - agreedAt < AGREE_TTL_MS;
}

/**
 * After any sign-in: record the Terms (the learner ticked "16 or older and
 * I agree" on the sheet before any sign-in button worked). If that fails,
 * the account isn't used: signed out again on this phone.
 */
async function finishSignIn(a: AccountInfo): Promise<Result> {
  const b = backend();
  try {
    if (a.termsVersion !== TERMS_VERSION) await b.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
  } catch (e) {
    await b.auth.signOut('local').catch(() => {});
    apply(null);
    return failed(e);
  }
  apply({ ...a, termsVersion: TERMS_VERSION });
  return { ok: true };
}

/** Send a sign-in code. */
export async function sendCode(email: string): Promise<Result> {
  try {
    await backend().auth.sendEmailCode(email);
    return { ok: true };
  } catch (e) {
    return failed(e);
  }
}

/** Check a code and sign in. `agreed`: the sheet's "16 or older" box was ticked. */
export async function verifyCode(email: string, code: string, agreed: true): Promise<Result> {
  void agreed;
  try {
    return await finishSignIn(await backend().auth.verifyEmailCode(email, code));
  } catch (e) {
    return failed(e);
  }
}

/** Sign in with Apple or Google. A closed sheet comes back as `cancelled` (the screen shows nothing). */
export async function signInWith(p: 'apple' | 'google', agreed: true): Promise<Result> {
  void agreed;
  const b = backend();
  try {
    return await finishSignIn(await (p === 'apple' ? b.auth.signInWithApple() : b.auth.signInWithGoogle()));
  } catch (e) {
    return failed(e);
  }
}

// ── Sign out ──────────────────────────────────────────────────────────
/** "Sign out" (this phone) or "Sign out on all devices". Progress on the phone always stays. */
export async function signOut(scope: 'local' | 'global'): Promise<Result> {
  try {
    await backend().auth.signOut(scope);
  } catch (e) {
    return failed(e);
  }
  const keep = useAccount.getState().syncedAccountHash;
  useAccount.getState().setFacts({ ...SIGNED_OUT, syncedAccountHash: keep });
  return { ok: true };
}

// ── Delete the account ────────────────────────────────────────────────
export interface DeletePlan {
  /** 'type': the sign-in is recent, type DELETE. 'reauth': confirm it's you first. */
  gate: 'type' | 'reauth';
  /** How to confirm it's you (Apple first: its fresh code lets the server revoke Apple's token). */
  provider: Provider;
}

/** Step 1's Continue: what step 2 asks for. Never called on mount (a deep link can't start anything). */
export async function deletePlan(now = Date.now()): Promise<Result<{ plan: DeletePlan }>> {
  try {
    const a = await backend().auth.current();
    if (!a) return { ok: false, code: 'unauthorized' };
    return { ok: true, plan: { gate: deleteGate(a.authAt, now), provider: reauthProvider(a.providers, shownProviders()) } };
  } catch (e) {
    return failed(e);
  }
}

/** Confirm it's you. Email: call without a code (sends one), then with it. Apple returns its fresh authorisation code. */
export async function reauth(p: Provider, code?: string): Promise<Result<{ appleAuthorizationCode?: string }>> {
  try {
    const out = await backend().auth.reauthenticate(p, code);
    return { ok: true, ...out };
  } catch (e) {
    return failed(e);
  }
}

/**
 * Delete the account (the server deletes everything), then forget it on
 * this phone. `alsoLocal` (unticked by default) also clears study progress
 * here, through the same path as Settings → Reset.
 *
 * Checks the sign-in is recent FIRST, so an old one asks to confirm it's you
 * without calling the server. Offline or a server failure: nothing is
 * deleted, here or there. A second call for an account already gone (the
 * server says "unauthorized") counts as done.
 */
export async function deleteAccount(i: { alsoLocal: boolean; appleAuthorizationCode?: string }, now = Date.now()): Promise<Result> {
  const b = backend();
  try {
    const a = await b.auth.current();
    if (a && deleteGate(a.authAt, now) === 'reauth') return { ok: false, code: 'reauth_required' };
    await b.auth.deleteAccount({ confirm: 'DELETE', appleAuthorizationCode: i.appleAuthorizationCode });
  } catch (e) {
    if (!(e instanceof CloudError && e.code === 'unauthorized')) return failed(e);
  }
  await b.auth.signOut('local').catch(() => {});
  useAccount.getState().setFacts({ ...SIGNED_OUT });
  if (i.alsoLocal) removeLocalProgress();
  return { ok: true };
}

/** Clear study progress on this phone for every exam: Settings → Reset's path, for each one. */
export function removeLocalProgress() {
  const { byCert, resetCert } = useProgress.getState();
  for (const certId of Object.keys(byCert)) resetCert(certId);
  useSession.getState().clear();
  useBackup.getState().setUndo(null);
  sweepBackupFiles();
}

// ── Download my data ──────────────────────────────────────────────────
const ACCOUNT_FILE = /^aurivan-account-.*\.json$/;

/**
 * "Download my data": the server's file (the backup envelope plus the
 * account section) saved through the share sheet, never emailed. Native:
 * written to the app's private cache first; the share sheet makes the copy
 * the learner keeps (and `sweepAccountFiles` tidies the cache later).
 */
export async function downloadMyData(now = Date.now()): Promise<Result<{ outcome: 'shared' | 'unavailable' }>> {
  let text: string;
  try {
    text = await backend().auth.exportMyData({ appVersion: Constants.expoConfig?.version });
  } catch (e) {
    return failed(e);
  }
  const name = accountExportFileName(now);
  try {
    if (Platform.OS === 'web') {
      const doc = (globalThis as { document?: Document }).document;
      if (!doc) return { ok: true, outcome: 'unavailable' };
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = doc.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      return { ok: true, outcome: 'shared' };
    }
    if (!(await Sharing.isAvailableAsync())) return { ok: true, outcome: 'unavailable' };
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true });
    file.write(text);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your Aurivan account data' });
    return { ok: true, outcome: 'shared' };
  } catch {
    return { ok: false, code: 'server' };
  }
}

/** Delete account data files we wrote to the cache more than an hour ago (they hold the email). Native only; never throws. */
export function sweepAccountFiles(now = Date.now()) {
  if (Platform.OS === 'web') return;
  try {
    for (const item of new Directory(Paths.cache).list()) {
      if (item instanceof File && ACCOUNT_FILE.test(item.name) && (item.lastModified ?? 0) < now - 3_600_000) item.delete();
    }
  } catch {
    // A cache we can't list is not the learner's problem.
  }
}
