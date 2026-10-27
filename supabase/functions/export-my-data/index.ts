// Wiring only; the logic and its tests are in handler.ts.
import { errorResponse, HttpError, makeLogger, withCors } from '../_shared/http.ts';
import { adminFromEnv } from '../_shared/serviceClient.ts';
import { handleExportMyData } from './handler.ts';

const log = makeLogger('export-my-data');
const admin = adminFromEnv();

Deno.serve((req) => {
  if (!admin) {
    log('not_configured', {});
    return withCors(req, errorResponse(new HttpError(500, 'server')));
  }
  return handleExportMyData(req, { admin, now: Date.now, log });
});
