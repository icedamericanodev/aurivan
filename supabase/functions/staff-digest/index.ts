// Wiring only; the logic and its tests are in handler.ts.
// The mailer stays null until the email provider is chosen (Phase 9, owner
// decision): the digest is then a no-op that logs counts.
import { errorResponse, HttpError, makeLogger } from '../_shared/http.ts';
import { boardFromEnv } from '../_shared/serviceClient.ts';
import { handleStaffDigest } from './handler.ts';

const log = makeLogger('staff-digest');
const wired = boardFromEnv();

Deno.serve((req) => {
  if (!wired) {
    log('not_configured', {});
    return errorResponse(new HttpError(500, 'server'));
  }
  return handleStaffDigest(req, {
    board: wired.board,
    mailer: null,
    secret: Deno.env.get('STAFF_DIGEST_SECRET') ?? null,
    to: Deno.env.get('SUPPORT_EMAIL') ?? 'certprep.support@gmail.com',
    queueUrl: 'aurivan://board/moderation',
    log,
  });
});
