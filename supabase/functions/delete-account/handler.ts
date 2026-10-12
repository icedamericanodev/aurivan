// delete-account: POST { confirm: 'DELETE', appleAuthorizationCode? }
// In-app account deletion (Apple 5.1.1(v), Google Play account deletion).
//
// 1. A verified user with a sign-in in the last 10 minutes, else 401
//    (`unauthorized` or `reauth_required`).
// 2. `confirm` must be exactly 'DELETE', else 400.
// 3. An account linked to Apple must send a fresh authorizationCode (400
//    `apple_code_required` otherwise); its tokens are revoked at Apple. A
//    failed revoke is logged as a count and does not block deletion.
// 4. Board counts for the audit row, storage under user/<uid>/, then
//    auth.admin.deleteUser, which cascades every account row.
// 5. The audit row (a SHA-256 of the id and counts). 200 { deleted: true }.
// Idempotent from the app's side: a second call finds no user and gets 401,
// which the app treats as already done.

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
      if (code === undefined) throw new HttpError(400, 'invalid', 'apple_code_required');
      const revoked = deps.apple ? await deps.apple.revokeWithCode(code) : false;
      if (!revoked) deps.log('apple_revoke_failed', { count: 1 });
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
