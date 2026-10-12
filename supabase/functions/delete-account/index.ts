// Wiring only; the logic and its tests are in handler.ts.
import { appleConfigFromEnv, makeAppleRevoker } from '../_shared/apple.ts';
import { errorResponse, HttpError, makeLogger } from '../_shared/http.ts';
import { adminFromEnv } from '../_shared/serviceClient.ts';
import { handleDeleteAccount } from './handler.ts';

const log = makeLogger('delete-account');
const admin = adminFromEnv();
const appleConfig = appleConfigFromEnv((k) => Deno.env.get(k));
const apple = appleConfig ? makeAppleRevoker(appleConfig) : null;

Deno.serve((req) => {
  if (!admin) {
    log('not_configured', {});
    return errorResponse(new HttpError(500, 'server'));
  }
  return handleDeleteAccount(req, { admin, apple, now: Date.now, log });
});
