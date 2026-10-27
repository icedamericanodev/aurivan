// Wiring only; the logic and its tests are in handler.ts.
import { appleConfigFromEnv, makeAppleRevoker } from '../_shared/apple.ts';
import { errorResponse, HttpError, makeLogger, withCors } from '../_shared/http.ts';
import { pepperFromEnv } from '../_shared/pepper.ts';
import { adminFromEnv } from '../_shared/serviceClient.ts';
import { handleDeleteAccount } from './handler.ts';

const log = makeLogger('delete-account');
const admin = adminFromEnv();
const appleConfig = appleConfigFromEnv((k) => Deno.env.get(k));
const apple = appleConfig ? makeAppleRevoker(appleConfig) : null;
// DELETION_PEPPER: an Edge Function secret (at least 32 characters). Without it
// accounts are still deleted; only the audit row is skipped, and logged.
const pepper = pepperFromEnv((k) => Deno.env.get(k));
if (!pepper) log('pepper_missing', {});

Deno.serve((req) => {
  if (!admin) {
    log('not_configured', {});
    return withCors(req, errorResponse(new HttpError(500, 'server')));
  }
  return handleDeleteAccount(req, { admin, apple, pepper, now: Date.now, log });
});
