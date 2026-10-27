-- KaiSip: accounts beta, the feedback board stays OFF (27 Oct 2026).
-- NOT APPLIED ANYWHERE. Applied fourth, after
-- 20261014000000_feedback_board.sql, which must be applied even with the board
-- off: delete-account and export-my-data call its svc_board_counts and
-- svc_board_export. Append-only once applied.
--
-- Its own migration on purpose (security audit, 27 Oct 2026): the
-- no-password trigger on auth.users is a separate file, so if the hosted
-- project ever refused that trigger, rolling it back could not undo the
-- board pause too.
--
-- Plain English:
--  1. Posting is paused (posting_open = false); only an admin can reopen it.
--     Reading board_settings stays open to anon on purpose: the keep-awake
--     job and the apps read it before sign-in.
--  2. Defence in depth while the board's Edge Functions are not deployed:
--     even the service role (the key every Edge Function holds) cannot call
--     the board's WRITE entry points. svc_board_counts and svc_board_export
--     stay executable: account deletion and "Download my data" need them.
--     The migration that opens the board MUST grant these four back:
--       grant execute on function public.svc_board_join(uuid, text, text, text),
--         public.svc_board_attempt(uuid),
--         public.svc_board_write(uuid, text, uuid, text, text, text, text, uuid, text, text, uuid, boolean),
--         public.svc_staff_act(uuid, text, text, uuid, text, jsonb) to service_role;

update public.board_settings set posting_open = false, updated_at = now();

revoke execute on function
  public.svc_board_join(uuid, text, text, text),
  public.svc_board_attempt(uuid),
  public.svc_board_write(uuid, text, uuid, text, text, text, text, uuid, text, text, uuid, boolean),
  public.svc_staff_act(uuid, text, text, uuid, text, jsonb)
  from service_role;
