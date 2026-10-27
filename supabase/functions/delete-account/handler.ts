// delete-account: POST { confirm: 'DELETE', appleAuthorizationCode? }
// In-app and on-the-web account deletion (Apple 5.1.1(v), Google Play account
// deletion). The app and the website (https://kaisip.com only: serveWeb in
// _shared/http.ts) call it.
//
// 1. A verified user with a sign-in in the last 10 minutes, else 401
//    (`unauthorized` or `reauth_required`). A genuine token for an account
//    that is already gone is 410 `gone`; the Auth server unreachable is 500.
// 2. `confirm` must be exactly 'DELETE', else 400. A malformed Apple code is
//    400 too. Nothing has changed yet at this point.
// 3. The board counts for the audit row (best-effort: a failure counts 0 and
//    is logged), read now because the deletion cascades them away.
// 4. auth.admin.deleteUser FIRST: it revokes every session and cascades every
//    account row. If it fails, nothing else has happened (500, retry).
// 5. Then, each best-effort and logged, never undoing step 4:
//    - the audit row: HMAC-SHA-256(DELETION_PEPPER, id) and the counts. With
//      no pepper configured the row is skipped (`audit_skipped_no_pepper`),
//      never written with a plain hash that could be joined with the phone's;
//    - storage under user/<uid>/ (no bucket exists yet), retried once;
//    - Sign in with Apple: the iPhone app re-authenticates with Apple and
//      sends a fresh authorizationCode, which is revoked at Apple. Without one
//      (Android and the web can't show Apple's sheet) `apple_revoke_skipped`
//      is logged as a count; a failed revoke logs `apple_revoke_failed`.
//      (Phase 9 follow-up: keep Apple's refresh token server-side at sign-in,
//      so the revoke works from any platform.)
// 6. 200 { deleted: true }.
// Idempotent from the client's side: a second call with the same token finds
// no account and gets 410 `gone`, which the app treats as already done. A bad
// or revoked token is 401 `unauthorized`, which the app never treats as done.

import type { AdminPort, BoardCounts } from '../_shared/admin.ts';
import { type AppleRevoker, isAppleCode } from '../_shared/apple.ts';
import { requireRecentAuth, requireUser } from '../_shared/auth.ts';
import { HttpError, json, type Logger, readJsonObject, requirePost, serveWeb } from '../_shared/http.ts';
import { deletionHash } from '../_shared/pepper.ts';

export interface DeleteAccountDeps {
  admin: AdminPort;
  /** null until the Apple secrets are set (Phase 9). */
  apple: AppleRevoker | null;
  /** DELETION_PEPPER (pepperFromEnv); null when unset, and the audit row is skipped. */
  pepper: string | null;
  now: () => number;
  log: Logger;
}

const FILE_TRIES = 2;

export function handleDeleteAccount(req: Request, deps: DeleteAccountDeps): Promise<Response> {
  return serveWeb(req, deps.log, async () => {
    requirePost(req);
    const { user, claims } = await requireUser(req, deps.admin);
    requireRecentAuth(claims, deps.now());

    const body = await readJsonObject(req, { maxBytes: 4096 });
    if (body.confirm !== 'DELETE') throw new HttpError(400, 'invalid', 'confirm_required');
    const code = body.appleAuthorizationCode;
    if (code !== undefined && !isAppleCode(code)) throw new HttpError(400, 'invalid', 'apple_code_invalid');

    let counts: BoardCounts = { posts: 0, comments: 0 };
    try {
      counts = await deps.admin.countBoardRows(user.id);
    } catch {
      deps.log('board_count_failed', { count: 1 });
    }

    // The deletion itself. Everything after it is clean-up that must not undo it.
    await deps.admin.deleteUser(user.id);

    if (deps.pepper) {
      try {
        await deps.admin.recordDeletion(await deletionHash(deps.pepper, user.id), counts);
      } catch {
        // The account is already gone; a missing audit row must not tell the client otherwise.
        deps.log('audit_write_failed', { count: 1 });
      }
    } else {
      deps.log('audit_skipped_no_pepper', { count: 1 });
    }

    for (let attempt = 1;; attempt++) {
      try {
        await deps.admin.deleteUserFiles(user.id);
        break;
      } catch {
        if (attempt >= FILE_TRIES) {
          deps.log('files_delete_failed', { count: 1 });
          break;
        }
      }
    }

    if (user.providers.includes('apple')) {
      let revoked = false;
      if (code !== undefined && deps.apple) {
        try {
          revoked = await deps.apple.revokeWithCode(code);
        } catch {
          revoked = false;
        }
      }
      if (!revoked) deps.log(code === undefined ? 'apple_revoke_skipped' : 'apple_revoke_failed', { count: 1 });
    }

    deps.log('account_deleted', { board_posts: counts.posts, board_comments: counts.comments });
    return json(200, { deleted: true });
  });
}
