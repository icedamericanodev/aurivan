import { strict as assert } from 'node:assert';
import { serviceKeyFromEnv } from './serviceKey.ts';

const env = (vars: Record<string, string>) => (k: string) => vars[k];

Deno.test('the default secret key is preferred over the legacy service role key', () => {
  assert.equal(
    serviceKeyFromEnv(
      env({ SUPABASE_SECRET_KEYS: '{"default":"new-secret-key"}', SUPABASE_SERVICE_ROLE_KEY: 'legacy' }),
    ),
    'new-secret-key',
  );
});

Deno.test('the legacy key is used when the secret keys are missing, unreadable or have no default', () => {
  assert.equal(serviceKeyFromEnv(env({ SUPABASE_SERVICE_ROLE_KEY: 'legacy' })), 'legacy');
  assert.equal(
    serviceKeyFromEnv(env({ SUPABASE_SECRET_KEYS: 'not json', SUPABASE_SERVICE_ROLE_KEY: 'legacy' })),
    'legacy',
  );
  assert.equal(
    serviceKeyFromEnv(env({ SUPABASE_SECRET_KEYS: '{"other":"x"}', SUPABASE_SERVICE_ROLE_KEY: 'legacy' })),
    'legacy',
  );
  assert.equal(
    serviceKeyFromEnv(env({ SUPABASE_SECRET_KEYS: '{"default":""}', SUPABASE_SERVICE_ROLE_KEY: 'legacy' })),
    'legacy',
  );
  assert.equal(serviceKeyFromEnv(env({ SUPABASE_SECRET_KEYS: 'null', SUPABASE_SERVICE_ROLE_KEY: 'legacy' })), 'legacy');
});

Deno.test('no usable key at all is null', () => {
  assert.equal(serviceKeyFromEnv(env({})), null);
  assert.equal(serviceKeyFromEnv(env({ SUPABASE_SECRET_KEYS: '{}', SUPABASE_SERVICE_ROLE_KEY: '' })), null);
});
