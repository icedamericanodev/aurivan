// export-my-data: POST { appVersion? }
// "Download my data" (GDPR access and portability; the Philippine Data Privacy
// Act's right of access). The app and the website (https://kaisip.com only:
// serveWeb in _shared/http.ts) call it. Returns the learner's own data only,
// as one JSON document for the share sheet or a download:
//   { app: 'kaisip', schema: 1, exportedAt, appVersion, stores, account,
//     sync, supportCopy, board, unreadableStores? }
// `stores` holds the learner's synced snapshots (Phase 7) as backup-file
// stores, so the download is also a backup the app can restore (empty when
// sync was never used); `appVersion` is the newest app that wrote one of
// them (else the version the app sent); `board` holds the learner's own
// feedback board rows (Phase 8: member row, posts, comments, votes, follows,
// reports they made, blocks, appeals, notices). Since the beta's security
// audit (M4) it holds everything else we keep about the learner too:
// `account` adds the last sign-in, the 16+ confirmation and when the profile
// was made, and the name and picture link a sign-in provider (Google)
// shared; `sync` gives each synced row's rev, device code, time and
// versions; `supportCopy` is the daily support checkpoint, unzipped through
// the same capped reader (or its unreadable reason).
//
// Snapshots are stored gzipped and the server can't vouch for what is inside
// one, so each is unzipped through the capped codec (_shared/gz.ts: at most
// 2,000,000 bytes, the size must match raw_bytes, a JSON object). A store
// that fails (a gzip bomb, damage, an unknown encoding) is left out of
// `stores` and named in `unreadableStores` with a short reason; the rest of
// the export still downloads, and the failure is logged as a count. The
// learner can clear a bad copy with "Delete synced progress".
//
// A verified user (401 otherwise; 410 for an account already deleted), at
// most once an hour (429 with Retry-After). No recent sign-in is required:
// everything in the file is already readable with the same token (the
// account itself, and the learner's own rows through RLS), so asking again
// would add friction and no protection. Revisit if the export ever holds data
// the token can't read (moderation notes, logs, staff fields).
//
// A read-only "is an export due?" check comes first (security audit L2), so a
// learner over the limit gets 429 before the document is built. The hourly
// slot is still claimed atomically LAST, after the document is built and
// turned into text, so a failure before the reply never costs the learner
// their hour.

import type { AdminPort } from '../_shared/admin.ts';
import { requireUser } from '../_shared/auth.ts';
import { HttpError, json, type Logger, readJsonObject, requirePost, serveWeb } from '../_shared/http.ts';

export interface ExportDeps {
  admin: AdminPort;
  now: () => number;
  log: Logger;
}

export const EXPORT_APP = 'kaisip';
export const EXPORT_SCHEMA = 1;
const RETRY_AFTER_SEC = 60 * 60;
const SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export function handleExportMyData(req: Request, deps: ExportDeps): Promise<Response> {
  return serveWeb(req, deps.log, async () => {
    requirePost(req);
    const { user } = await requireUser(req, deps.admin);
    const now = deps.now();

    const body = await readJsonObject(req, { maxBytes: 1024, optional: true });
    const appVersion = typeof body.appVersion === 'string' && SEMVER.test(body.appVersion) ? body.appVersion : null;

    if (!(await deps.admin.exportDue(user.id))) {
      throw new HttpError(429, 'rate_limited', undefined, RETRY_AFTER_SEC);
    }

    const [profile, snaps, checkpoint, board] = await Promise.all([
      deps.admin.getProfile(user.id),
      deps.admin.readSnapshots(user.id),
      deps.admin.readCheckpoint(user.id),
      deps.admin.readBoard(user.id),
    ]);
    const doc = {
      app: EXPORT_APP,
      schema: EXPORT_SCHEMA,
      exportedAt: new Date(now).toISOString(),
      // The newest app that wrote a synced store (so a restore says "update the app" when it
      // should); with no snapshot, the version of the app asking (code review P7 N11).
      appVersion: snaps.appVersion ?? appVersion,
      stores: snaps.stores,
      account: {
        email: user.email,
        providers: user.providers,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        termsVersion: profile?.termsVersion ?? null,
        ageConfirmed: profile?.ageConfirmed ?? null,
        profileCreatedAt: profile?.createdAt ?? null,
        // Stored by the sign-in system when a provider shares them; KaiSip doesn't use them.
        nameFromSignIn: user.nameFromSignIn,
        pictureFromSignIn: user.pictureFromSignIn,
      },
      // Each synced row's own columns (rev, device code, time, versions), by store.
      sync: snaps.rows,
      // The daily support checkpoint (an earlier copy of the progress), or null.
      supportCopy: checkpoint,
      // Phase 8: the learner's own feedback board rows (empty before they join).
      board,
      // Only when a synced store couldn't be read safely (see the header).
      ...(snaps.unreadable.length > 0 ? { unreadableStores: snaps.unreadable } : {}),
    };
    const unreadable = snaps.unreadable.length + (checkpoint && 'unreadable' in checkpoint ? 1 : 0);
    if (unreadable > 0) deps.log('snapshot_unreadable', { count: unreadable });

    // Everything that can fail is done: only now is the hour used.
    const res = json(200, doc, { 'content-disposition': 'attachment; filename="kaisip-my-data.json"' });
    if (!(await deps.admin.claimExport(user.id))) {
      throw new HttpError(429, 'rate_limited', undefined, RETRY_AFTER_SEC);
    }
    deps.log('exported', {});
    return res;
  });
}
