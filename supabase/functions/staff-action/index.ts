// Wiring only; the logic and its tests are in handler.ts.
import { errorResponse, HttpError, makeLogger } from '../_shared/http.ts';
import { boardFromEnv } from '../_shared/serviceClient.ts';
import { handleStaffAction } from './handler.ts';

const log = makeLogger('staff-action');
const wired = boardFromEnv();

Deno.serve((req) => {
  if (!wired) {
    log('not_configured', {});
    return errorResponse(new HttpError(500, 'server'));
  }
  return handleStaffAction(req, { admin: wired.admin, board: wired.board, log });
});
