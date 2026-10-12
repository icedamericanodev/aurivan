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
  'settings.row': 'Your account',
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
  // Said by a screen reader for the waiting line ("Send a new code in 42 seconds").
  'code.resend.wait.spoken': 'Send a new code in {time}',
  'email.sending': 'Sending your code…',

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
  'account.download.signin': 'Your sign-in has ended. Sign in again to download your data.',
  'account.section.signout': 'Where you’re signed in',
  'account.signout': 'Sign out on this phone',
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
  'delete.s1.busy': 'One moment…',
  'delete.s2.reauth': 'For your security, confirm it’s you first.',
  'delete.s2.reauth.email': 'Send a code to {email}',
  'delete.s2.reauth.confirm': 'Confirm it’s you',
  // Restates the step 1 choice right above the DELETE field.
  'delete.s2.local.on': 'Your progress on this phone will be removed too.',
  'delete.s2.local.off': 'Your progress on this phone stays here.',
  'delete.s2.type': 'Type DELETE to confirm',
  'delete.s2.go': 'Delete account',
  'delete.busy': 'Deleting your account…',
  'delete.done.title': 'Your account is deleted',
  'delete.done.body': 'It’s gone from our live systems now, and from backups within 30 days. Aurivan keeps working on this phone without an account.',
  'delete.done.body.local': 'It’s gone from our live systems now, and from backups within 30 days. Your progress on this phone was removed too. Aurivan keeps working without an account.',
  'delete.done.go': 'Done',
  'delete.offline': 'You’re offline. Connect to the internet to delete your account. Nothing was deleted.',
  'delete.fail': 'We couldn’t delete your account just now. Nothing was deleted. Try again, or email {supportEmail}.',
  'delete.signin': 'Your sign-in has ended, so nothing was deleted. Sign in again, then delete your account.',
  // A later phase, only with an active store subscription.
  'delete.sub.note': 'Deleting your account doesn’t cancel your subscription. Billing continues through the {store} until you cancel it there.',

  // Screen-reader hints (said after a row's or button's name).
  'hint.account.in': 'Opens your account',
  'hint.account.out': 'Opens sign in. An account is optional.',
  'hint.browser': 'Opens in your browser',
  'hint.download': 'Opens the share sheet to save the file',
  'hint.signout': 'Asks first. Your progress stays on this phone.',
  'hint.signoutAll': 'Asks first',

  // Settings → About: the line after the version.
  'about.off': 'Progress is stored only on this device.',
  'about.on.out': 'Progress is stored on this device.',
  'about.on.sync': 'Progress is stored on this device and syncs to your Aurivan account.',

  // ── Sync (Uplift Phase 7; spec §3.3) ───────────────────────────────
  // Settings → Your data's intro in a cloud build (the OFF build keeps its own words in yourData.tsx).
  'data.intro.on': 'Your progress is kept on this phone. A backup file keeps it safe and moves it to a new phone. You choose where the file goes.',
  'data.intro.sync': 'Your progress is kept on this phone and syncs to your Aurivan account. A backup file is a copy you keep yourself. You choose where the file goes.',

  // Account → Sync.
  'sync.section': 'Sync',
  'sync.toggle': 'Sync this phone',
  'sync.toggle.sub': 'Your progress and study settings, on every device you sign in on.',
  'sync.now': 'Sync now',
  'sync.status.just': 'Synced just now',
  'sync.status.min': 'Synced {n} min ago',
  'sync.status.today': 'Synced today at {time}',
  'sync.status.day': 'Synced {d MMM}',
  'sync.status.busy': 'Syncing…',
  'sync.status.offline': 'Will sync when you’re online',
  // Any other failure (a server problem, too many conflicts or writes): not "offline" (UX review P1).
  'sync.status.retry': 'Couldn’t sync just now. We’ll try again soon.',
  'sync.status.off': 'Sync is off',
  'sync.status.signin': 'Sign in again to keep syncing',
  'sync.paused.newer': 'Sync is paused. This account has progress from a newer version of Aurivan. Update the app to keep syncing.',
  'sync.paused.unreadable': 'Sync is paused. We couldn’t read the synced copy, so your phone’s progress is unchanged. If this keeps happening, contact us from Help.',
  'sync.paused.toobig': 'Your progress is too large to sync. It stays safe on this phone. You can save a backup file in Settings → Your data.',
  'sync.retry': 'Try again',
  'sync.offline': 'You’re offline. Connect to the internet to sync.',
  'sync.what.title': 'What syncs',
  // Everything that syncs (security review P7 S7: matches the privacy notice).
  'sync.what.body':
    'Your answers (whether right, how sure you were and how long you took), reviews, your mistake journal, saved questions, mocks, lessons and notes done, your study days and streak, badges, game levels, your readiness log and exam-week checklist, your plant, the questions you reported to us, your exam date and study settings. These stay on this phone: reminders, theme, motion, haptics, plant display choices and a quiz in progress.',
  'sync.what.limits': 'Removals don’t sync yet: a question you unsave, or progress you reset, on one device can come back from another.',
  'sync.what.kept': 'Turning sync off stops syncing. The copy in your account stays until you use Delete synced progress.',
  'sync.what.done': 'Done',
  'sync.delete.row': 'Delete synced progress',
  'sync.delete.sub': 'Removes the copy in your account. This phone keeps its progress.',

  // The first-sync preview (account/first-sync).
  'first.phone.title': 'Add this phone’s progress to your account?',
  'first.phone.body': 'You’re signed in as {email}. Your account has no progress yet.',
  'first.phone.go': 'Sync this phone',
  'first.account.title': 'Bring your progress to this phone?',
  'first.account.body': 'You’re signed in as {email}. Your account has progress from another device.',
  'first.account.go': 'Bring it here',
  'first.both.title': 'Bring your progress together?',
  'first.both.body': 'You’re signed in as {email}. This phone and your account both have progress. We’ll combine them: nothing you’ve answered is lost, and your best results are kept.',
  'first.both.go': 'Combine',
  'first.undo': 'You can undo this for 7 days in Settings → Your data.',
  'first.undo.replaces': 'This replaces the earlier “Undo restore”.',
  // Combine (UX review O1).
  'first.both.once': 'Questions answered on both count once.',
  'first.later': 'Not now',
  // {email} in the preview and switch bodies when Apple hides the address ("You’re signed in as your Apple account (email hidden).").
  'first.relay': 'your Apple account (email hidden)',
  'first.cols': 'This phone · Account · After',
  'first.col.phone': 'This phone',
  'first.col.account': 'Account',
  'first.col.after': 'After',
  'first.row.answered': 'Answered',
  'first.row.last': 'Last studied',
  'first.row.streak': 'Best streak',
  'first.row.exam': 'Exam date',
  'first.busy': 'Syncing your progress…',
  'first.fail': 'We couldn’t sync just now. Nothing was changed. Try again in a little while.',
  'first.signin': 'Your sign-in has ended. Sign in again to sync this phone.',
  // Said by a screen reader for one row of the table ("Answered: this phone 312, account 140, after 361").
  'first.row.spoken': '{label}: this phone {phone}, account {account}, after {after}',

  // A different account on this phone (account/switch).
  'switch.title': 'This phone has progress from another account',
  'switch.body': 'You’re now signed in as {email}. The progress on this phone was synced with a different account.',
  'switch.fresh': 'Start fresh with this account',
  'switch.fresh.sub': 'This phone switches to this account’s progress. What’s here now is kept for 7 days in Settings → Your data → Undo sync.',
  'switch.keep': 'Keep this phone’s progress',
  'switch.keep.sub': 'It will be added to this account, even if it’s someone else’s.',
  // Start fresh while an undo copy is already waiting on this phone (QA B3).
  'switch.undo.replaces': 'This replaces the earlier undo copy kept on this phone.',
  'switch.go': 'Continue',

  // Settings → Your data.
  'undo.row': 'Undo sync',
  'undo.row.sub': 'Put back this phone’s progress from before it first synced (until {d MMM}).',
  'undo.confirm.title': 'Undo sync?',
  'undo.confirm.body': 'This phone goes back to how it was before it first synced, and sync turns off. Your account’s copy stays as it is.',
  'undo.done.title': 'Sync undone',
  'undo.done.body': 'This phone’s progress is back to how it was before it first synced. Sync is off.',
  'hint.undo': 'Asks first. Puts back this phone’s progress from before it first synced.',
  'undo.none.title': 'Nothing to undo',
  'undo.none.body': 'A sync can only be undone for 7 days.',
  'undo.invalid.title': 'Can’t undo',
  'undo.invalid.body': 'The copy kept from before the first sync is damaged, so it can’t be used. Your progress stays as it is now.',
  'undo.failed.title': 'Undo didn’t finish',
  'undo.failed.body': 'Something went wrong while saving, so your progress was put back as it was. Please try again.',

  // Sign out (account/sign-out).
  'signout.body.sync': 'Your progress stays on this phone, and Aurivan keeps working without an account. Sync stops until you sign in again.',
  'signout.remove': 'Remove my progress from this phone (for shared devices)',
  'signout.remove.confirm': 'This removes all your study progress, your plant and your study settings from this phone. Your account’s copy isn’t affected.',
  // Some of it is only on this phone: sync is off, paused, or the last changes didn’t reach the account (UX review H1).
  'signout.remove.confirm.unsynced': 'Some of this phone’s progress isn’t in your account yet. Removing it deletes it for good. Save a backup first if you might want it.',
  'signout.remove.go': 'Remove and sign out',

  // Account → Delete synced progress.
  'delsync.title': 'Delete synced progress?',
  'delsync.body': 'This deletes the copy of your progress stored in your account. Your account and this phone’s progress stay. Sync turns off.',
  // What happens on the learner’s other devices (UX review P2, worded to match what they do).
  'delsync.others': 'Your other devices stop syncing the next time they connect. If you turn sync on again before that, their progress is added back.',
  'delsync.go': 'Delete synced progress',
  'delsync.done': 'Synced progress deleted.',
  'delsync.busy': 'Deleting synced progress…',
  'delsync.offline': 'You’re offline. Connect to the internet to delete your synced progress. Nothing was deleted.',
  'delsync.fail': 'We couldn’t delete your synced progress just now. Nothing was deleted. Try again in a little while.',

  // Settings → Reset progress and the restore preview, while this phone syncs (UX review H2: true in every case).
  'reset.sync': 'Sync is on: progress removed here can come back from another device that syncs with your account. To start fresh everywhere, first use Delete synced progress in Account.',
  // Reset also clears a waiting Undo sync copy (UX review O2).
  'reset.undo': 'This also removes the Undo sync copy kept on this phone.',

  // Screen-reader hints.
  'hint.sync.now': 'Syncs this phone with your account now',
  'hint.sync.what': 'Opens the list of what syncs',
  'hint.sync.delete': 'Asks first. This phone keeps its progress.',
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
