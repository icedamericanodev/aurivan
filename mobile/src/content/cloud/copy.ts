/**
 * Every account string (Uplift Phase 6, built OFF; spec PHASE6_8.md §2.3),
 * in one place so __tests__/cloud-copy.test.ts can hold them to the copy
 * rules (§1.5):
 * - never the question-bank size, never "of N questions";
 * - no "ISACA" (the not-affiliated line always comes from
 *   `cert.trademarkNotice`, never retyped here);
 * - no "official", "certified", "endorsed" or "forum" next to an exam name;
 * - no reply-time promise (the board's "We review reports within 24 hours"
 *   is the one exception, in board strings only, PR 8);
 * - no guilt, no urgency, no exclamation marks; curly apostrophes.
 *
 * PR 7 (sync) and PR 8 (the board) add their strings here too.
 * `{email}` is always the MASKED email (engine/account.ts maskEmail).
 */
export const ACCOUNT_COPY = {
  // You → Help and feedback (the first row), and Settings → Account.
  'you.row.out.title': 'Sync across devices',
  'you.row.out.sub': 'Optional. Keep your progress on your other phone or tablet.',
  'you.row.in.title': 'Account and sync',
  'you.row.in.sub': 'Signed in as {email}',
  'you.row.in.sub.relay': 'Signed in with Apple',
  'you.row.expired.sub': 'Sign in again to keep syncing',
  'settings.group': 'Account',
  'settings.row': 'Account',
  'settings.row.out': 'Not signed in',

  // The sign-in sheet.
  'signin.title': 'Keep your progress on every device',
  'signin.body1': 'An account is optional. Everything in Aurivan works without one.',
  'signin.body2': 'With an account, your progress can sync between your devices, and you can join the feedback board.',
  'signin.body3': 'We store your email to sign you in and your progress to sync it. No ads, no tracking.',
  'signin.privacy': 'Privacy policy',
  'signin.terms': 'Terms of Use',
  'signin.age': 'I’m 16 or older and I agree to the Terms of Use.',
  'signin.age.hint': 'Tick the box above to continue.',
  'signin.apple': 'Continue with Apple',
  'signin.google': 'Continue with Google',
  'signin.email': 'Continue with email',
  'signin.later': 'Not now',
  'signin.busy': 'Signing you in…',

  // Email and code.
  'email.title': 'Sign in with email',
  'email.field': 'Email address',
  'email.help': 'We’ll send you a 6-digit code. No password needed.',
  'email.send': 'Send code',
  'email.bad': 'Enter an email address like name@example.com.',
  'code.title': 'Enter the code we sent to {email}',
  'code.field': '6-digit code',
  'code.submit': 'Sign in',
  'code.resend.wait': 'Send a new code in {m:ss}',
  'code.resend': 'Send a new code',
  'code.other': 'Use a different email',
  'code.wrong': 'That code didn’t work. Check it, or send a new one.',
  'code.expired': 'That code has expired. Send a new one.',
  'code.toomany': 'Too many tries. Send a new code to try again.',
  'code.sent': 'Code sent to {email}',

  // Errors (a cancelled Apple or Google sheet shows nothing: it just returns to the sheet).
  'err.offline': 'You’re offline. Connect to the internet to sign in.',
  'err.rate': 'Too many codes asked for. Wait a few minutes, then try again.',
  'err.server': 'Something went wrong on our side. Try again in a little while.',

  // The Account screen.
  'account.title': 'Account',
  'account.signedin': 'Signed in as {email}',
  'account.signedin.relay': 'Signed in with Apple (your email is hidden)',
  'account.data': 'Your account data',
  'account.download': 'Download my data',
  'account.download.sub': 'A copy of everything your account holds, as a file.',
  'account.download.busy': 'Preparing your data…',
  'account.download.rate': 'You can download your data once an hour. Try again later.',
  'account.download.fail': 'We couldn’t prepare your data just now. Try again in a while.',
  'account.download.done': 'Your data file is ready. If you saved it, you’re set.',
  'account.section.signout': 'Sign out',
  'account.signout': 'Sign out',
  'account.signoutAll': 'Sign out on all devices',
  'account.foot': 'Progress on this phone works with or without an account.',
  'signout.title': 'Sign out?',
  'signout.body': 'Your progress stays on this phone, and Aurivan keeps working without an account.',
  'signoutAll.title': 'Sign out on all devices?',
  'signoutAll.body': 'You’ll need to sign in again on every phone and tablet that uses this account.',
  'signout.offline': 'You’re offline. Connect to the internet to sign out on all devices.',
  'cancel': 'Cancel',

  // Delete account.
  'delete.row': 'Delete account',
  'delete.row.sub': 'Permanently delete your account and everything it holds.',
  'delete.s1.title': 'Delete your Aurivan account?',
  'delete.s1.body':
    'This permanently deletes your account, your synced progress, and your posts, comments and votes on the feedback board. Progress saved on this phone stays here unless you tick the box below. This can’t be undone.',
  'delete.s1.local': 'Also remove my progress from this phone',
  'delete.s1.go': 'Continue',
  'delete.s1.cancel': 'Cancel',
  'delete.s2.reauth': 'For your security, confirm it’s you first.',
  'delete.s2.reauth.email': 'Send a code to {email}',
  'delete.s2.reauth.confirm': 'Confirm it’s you',
  'delete.s2.type': 'Type DELETE to confirm',
  'delete.s2.go': 'Delete account',
  'delete.busy': 'Deleting your account…',
  'delete.done.title': 'Your account is deleted',
  'delete.done.body': 'It’s gone from our live systems now, and from backups within 30 days. Aurivan keeps working on this phone without an account.',
  'delete.done.go': 'Done',
  'delete.offline': 'You’re offline. Connect to the internet to delete your account. Nothing was deleted.',
  'delete.fail': 'We couldn’t delete your account just now. Nothing was deleted. Try again, or email {supportEmail}.',
  // A later phase, only with an active store subscription.
  'delete.sub.note': 'Deleting your account doesn’t cancel your subscription. Billing continues through the {store} until you cancel it there.',

  // Settings → About: the line after the version.
  'about.off': 'Progress is stored only on this device.',
  'about.on.out': 'Progress is stored on this device.',
  'about.on.sync': 'Progress is stored on this device and syncs to your Aurivan account.',
} as const;

export type AccountCopyKey = keyof typeof ACCOUNT_COPY;

/**
 * A string with its {placeholders} filled in ("Signed in as {email}").
 * A placeholder without a value stays as it is, so a missing one is visible
 * in a test rather than silently blank.
 */
export function copy(key: AccountCopyKey, vars: Record<string, string> = {}): string {
  return ACCOUNT_COPY[key].replace(/\{([^{}]+)\}/g, (whole, name: string) => vars[name] ?? whole);
}
