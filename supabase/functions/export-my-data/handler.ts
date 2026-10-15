// export-my-data: POST { appVersion? }
// "Download my data" (GDPR access and portability). Returns the learner's own
// data only, as one JSON document for the share sheet:
//   { app: 'kaisip', schema: 1, exportedAt, appVersion, stores, account, board }
// `stores` holds the learner's synced snapshots (Phase 7) as backup-file
// stores, so the download is also a backup the app can restore (empty when
// sync was never used); `appVersion` is the newest app that wrote one of
// them (else the version the app sent); `board` holds the learner's own
// feedback board rows (Phase 8: member row, posts, comments, votes, follows,
// reports they made, blocks, appeals, notices). The two daily
// support checkpoints are copies of the same progress and are not included.
//
// A verified user (401 otherwise; 410 for an account already deleted), at
// most once an hour (429 with Retry-After). No recent sign-in is required:
// everything in the file is already readable with the same token (the
// account itself, and the learner's own rows through RLS), so asking again
// would add friction and no protection. Revisit if the export ever holds data
// the token can't read (moderation notes, logs, staff fields).
//
// The hourly slot is claimed LAST, after the document is built and turned
// into text, so a failure before the reply never costs the learner their hour.

import type { AdminPort } from '../_shared/admin.ts';
import { requireUser } from '../_shared/auth.ts';
import { HttpError, json, type Logger, readJsonObject, requirePost, serveSafely } from '../_shared/http.ts';

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
  return serveSafely(deps.log, async () => {
    requirePost(req);
    const { user } = await requireUser(req, deps.admin);
    const now = deps.now();

    const body = await readJsonObject(req, { maxBytes: 1024, optional: true });
    const appVersion = typeof body.appVersion === 'string' && SEMVER.test(body.appVersion) ? body.appVersion : null;

    const [termsVersion, snaps, board] = await Promise.all([
      deps.admin.getTermsVersion(user.id),
      deps.admin.readSnapshots(user.id),
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
        termsVersion,
      },
      // Phase 8: the learner's own feedback board rows (empty before they join).
      board,
    };

    // Everything that can fail is done: only now is the hour used.
    const res = json(200, doc, { 'content-disposition': 'attachment; filename="kaisip-my-data.json"' });
    if (!(await deps.admin.claimExport(user.id))) {
      throw new HttpError(429, 'rate_limited', undefined, RETRY_AFTER_SEC);
    }
    deps.log('exported', {});
    return res;
  });
}
