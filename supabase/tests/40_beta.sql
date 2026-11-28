-- Accounts beta migration 20261027000000_beta_board_paused.sql.
-- The board is paused and its write entry points are closed even to the
-- service role (the export and deletion reads stay open).
-- The password rules of 20261027000100_beta_no_passwords.sql were tested
-- here until 28 Nov 2026; that trigger is replaced by
-- 20261128000000_password_guard.sql, and its tests (H1 included) moved to
-- 41_passwords.sql.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(4);

-- ── 1. The board stays paused, its writes closed ────────────────────
select is((select posting_open from public.board_settings), false,
  'posting on the feedback board is paused after the migrations');
select is((select read_scope from public.board_settings), 'signed_in',
  'the read scope is unchanged (no post exists to read)');
select ok(not has_function_privilege('service_role', 'public.svc_board_join(uuid, text, text, text)', 'execute')
          and not has_function_privilege('service_role', 'public.svc_board_attempt(uuid)', 'execute')
          and not has_function_privilege('service_role',
                'public.svc_board_write(uuid, text, uuid, text, text, text, text, uuid, text, text, uuid, boolean)', 'execute')
          and not has_function_privilege('service_role', 'public.svc_staff_act(uuid, text, text, uuid, text, jsonb)', 'execute'),
  'the service role cannot call the board''s write entry points while the board is off');
select ok(has_function_privilege('service_role', 'public.svc_board_counts(uuid)', 'execute')
          and has_function_privilege('service_role', 'public.svc_board_export(uuid)', 'execute'),
  'it can still read the board counts and export (account deletion, Download my data)');

select * from finish();
rollback;
