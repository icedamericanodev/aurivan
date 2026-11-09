begin;
select plan(5);
select ok(not has_function_privilege('anon', 'public.beta_desk_email_is_allowed(text)', 'EXECUTE'), 'anon cannot enumerate admins');
select ok(not has_function_privilege('authenticated', 'public.beta_desk_email_is_allowed(text)', 'EXECUTE'), 'signed-in users cannot enumerate admins');
select ok(has_function_privilege('service_role', 'public.beta_desk_email_is_allowed(text)', 'EXECUTE'), 'server can check eligibility');
select is(public.beta_desk_email_is_allowed(null), false, 'null rejected');
select is(public.beta_desk_email_is_allowed('absent@example.invalid'), false, 'unknown account rejected');
select * from finish();
rollback;
