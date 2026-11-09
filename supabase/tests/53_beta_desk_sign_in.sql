begin;
select plan(14);
-- Accounts: an admin, a learner, and listed accounts that must NOT count.
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'owner@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000000d2', 'learner@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000000d3', 'unconfirmed@test.invalid', null);
insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000d4', null, now(), true);
insert into auth.users (id, email, email_confirmed_at, is_sso_user) values
  ('00000000-0000-0000-0000-0000000000d5', 'sso@test.invalid', now(), true);
insert into auth.users (id, email, email_confirmed_at, banned_until) values
  ('00000000-0000-0000-0000-0000000000d6', 'banned@test.invalid', now(), now() + interval '1 day');
insert into auth.users (id, email, email_confirmed_at, deleted_at) values
  ('00000000-0000-0000-0000-0000000000d7', 'deleted@test.invalid', now(), now());
insert into private.beta_desk_admins (user_id) values
  ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000d4'), ('00000000-0000-0000-0000-0000000000d5'),
  ('00000000-0000-0000-0000-0000000000d6'), ('00000000-0000-0000-0000-0000000000d7');


select ok(not has_function_privilege('anon', 'public.beta_desk_sign_in_check(text)', 'EXECUTE'), 'anon cannot enumerate via RPC');
select ok(not has_function_privilege('authenticated', 'public.beta_desk_sign_in_check(text)', 'EXECUTE'), 'learner cannot enumerate via RPC');
select ok(has_function_privilege('service_role', 'public.beta_desk_sign_in_check(text)', 'EXECUTE'), 'service can check');
set local role service_role;
select is(public.beta_desk_sign_in_check(' OWNER@test.invalid '), 'allowed', 'normalized listed confirmed admin');
select is(public.beta_desk_sign_in_check('learner@test.invalid'), 'not_admin', 'learner rejected');
select is(public.beta_desk_sign_in_check('missing@test.invalid'), 'not_admin', 'unknown rejected');
select is(public.beta_desk_sign_in_check('unconfirmed@test.invalid'), 'not_admin', 'unconfirmed rejected');
select is(public.beta_desk_sign_in_check('sso@test.invalid'), 'not_admin', 'SSO rejected');
select is(public.beta_desk_sign_in_check('banned@test.invalid'), 'not_admin', 'banned rejected');
select is(public.beta_desk_sign_in_check('deleted@test.invalid'), 'not_admin', 'deleted rejected');
reset role;
update auth.users set email = 'anonymous@test.invalid' where id = '00000000-0000-0000-0000-0000000000d4';
select is(public.beta_desk_sign_in_check('anonymous@test.invalid'), 'not_admin', 'anonymous rejected');
update private.beta_desk_sign_in_limit set attempts = 59;
select is(public.beta_desk_sign_in_check('owner@test.invalid'), 'allowed', 'last permitted attempt');
select is(public.beta_desk_sign_in_check('owner@test.invalid'), 'rate_limited', 'limit applies before eligibility');
update private.beta_desk_sign_in_limit set window_start = now() - interval '6 minutes';
select is(public.beta_desk_sign_in_check('owner@test.invalid'), 'allowed', 'window recovers');
select * from finish();
rollback;
