// delete-account: POST { confirm: 'DELETE', appleAuthorizationCode? }
// In-app account deletion (Apple 5.1.1(v), Google Play account deletion).
//
// 1. A verified user with a sign-in in the last 10 minutes, else 401
//    (`unauthorized` or `reauth_required`). A genuine token for an account
//    that is already gone is 410 `gone`; the Auth server unreachable is 500.
// 2. `confirm` must be exactly 'DELETE', else 400.
// 3. Sign in with Apple: revoking Apple's tokens is BEST-EFFORT. The iPhone
//    app re-authenticates with Apple and sends a fresh authorizationCode,
//    which is revoked at Apple. Without one (Android and the web can't show
//    Apple's sheet, and an account may be linked to Apple and email), the
//    account is still deleted and `apple_revoke_skipped` is logged as a
//    count. A failed revoke is logged as `apple_revoke_failed`. Neither
//    blocks deletion: in-app deletion must work on every platform.
//    (Phase 9: keep Apple's refresh token server-side at sign-in, so the
//    revoke works from any platform.)
// 4. Board counts for the audit row, storage under user/<uid>/, then
//    auth.admin.deleteUser, which cascades every account row.
// 5. The audit row (a SHA-256 of the id and counts). 200 { deleted: true }.
// Idempotent from the app's side: a second call with the same token finds no
// account and gets 410 `gone`, which the app treats as already done. A bad or
// revoked token is 401 `unauthorized`, which the app never treats as done.

import type { AdminPort } from '../_shared/admin.ts';
import { type AppleRevoker, isAppleCode } from '../_shared/apple.ts';
import { requireRecentAuth, requireUser } from '../_shared/auth.ts';
import { HttpError, json, type Logger, readJsonObject, requirePost, serveSafely } from '../_shared/http.ts';

export interface DeleteAccountDeps {
  admin: AdminPort;
  /** null until the Apple secrets are set (Phase 9). */
  apple: AppleRevoker | null;
  now: () => number;
  log: Logger;
}

export function handleDeleteAccount(req: Request, deps: DeleteAccountDeps): Promise<Response> {
  return serveSafely(deps.log, async () => {
    requirePost(req);
    const { user, claims } = await requireUser(req, deps.admin);
    requireRecentAuth(claims, deps.now());

    const body = await readJsonObject(req, { maxBytes: 4096 });
    if (body.confirm !== 'DELETE') throw new HttpError(400, 'invalid', 'confirm_required');
    const code = body.appleAuthorizationCode;
    if (code !== undefined && !isAppleCode(code)) throw new HttpError(400, 'invalid', 'apple_code_invalid');

    if (user.providers.includes('apple')) {
      const revoked = code !== undefined && deps.apple ? await deps.apple.revokeWithCode(code) : false;
      if (!revoked) deps.log(code === undefined ? 'apple_revoke_skipped' : 'apple_revoke_failed', { count: 1 });
    }

    const counts = await deps.admin.countBoardRows(user.id);
    await deps.admin.deleteUserFiles(user.id);
    await deps.admin.deleteUser(user.id);
    try {
      await deps.admin.recordDeletion(user.id, counts);
    } catch {
      // The account is already gone; a missing audit row must not tell the app otherwise.
      deps.log('audit_write_failed', { count: 1 });
    }
    deps.log('account_deleted', { board_posts: counts.posts, board_comments: counts.comments });
    return json(200, { deleted: true });
  });
}
