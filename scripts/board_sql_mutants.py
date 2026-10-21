"""Mutation check for the feedback board SQL (Uplift Phase 8; the S1-style
check from the Phase 7 security review, SEC_P7 S6).

Each mutant below breaks ONE promise of
supabase/migrations/20261014000000_feedback_board.sql (who reads what, the
withdraw-only rule, votes and their limits, report thresholds, blocks,
handles, appeals, staff-only actions, pre-moderation, pause, the rate
limits, private helpers, column grants, the cascade). For every mutant the
pgTAP suite (supabase/tests) must FAIL: a mutant that still passes means a
test is missing.

    python3 scripts/board_sql_mutants.py

How the tests run is the same as scripts/sync_sql_mutants.py: PGTAP_RUN (a
shell command that applies every migration in $MIGDIR to a fresh database
and runs supabase/tests), or by default the Supabase CLI with a running
local stack. Exit code 0 when every mutant is caught.
"""
import importlib.util
import os
import re
import shutil
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIG_DIR = os.path.join(ROOT, "supabase", "migrations")
TARGET = "20261014000000_feedback_board.sql"

_spec = importlib.util.spec_from_file_location("sync_sql_mutants", os.path.join(ROOT, "scripts", "sync_sql_mutants.py"))
_sync = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_sync)
run_tests = _sync.run_tests

# name: [(regex, replacement), ...]. Each regex must match; its FIRST match is replaced.
MUTANTS = {
    "signed-in learners read pending posts": [
        (r"for select to authenticated\n  using \(\(visibility = 'visible'\n          and exists \(select 1 from public\.board_settings s where s\.read_scope in \('everyone', 'signed_in'\)\)\)\n         or author_id",
         "for select to authenticated\n  using ((visibility <> 'removed'\n          and exists (select 1 from public.board_settings s where s.read_scope in ('everyone', 'signed_in')))\n         or author_id"),
    ],
    "anon reads in the signed_in scope": [
        (r"(create policy posts_read_anon on public\.board_posts for select to anon\n  using \(visibility = 'visible'\n         and exists \(select 1 from public\.board_settings s where s\.read_scope )= 'everyone'",
         r"\1in ('everyone', 'signed_in')"),
    ],
    "author_staff scope ignored": [
        (r"s\.read_scope in \('everyone', 'signed_in'\)\)\)\n         or author_id = \(select auth\.uid\(\)\)\n         or \(select private\.is_staff\(\)\)\);\ncreate policy posts_withdraw",
         "true))\n         or author_id = (select auth.uid())\n         or (select private.is_staff()));\ncreate policy posts_withdraw"),
    ],
    "posts withdraw guard off": [
        (r"if private\.app_role\(\) in \('anon', 'authenticated'\) and pg_trigger_depth\(\) = 1 then\n    if new\.visibility <> 'withdrawn'",
         "if false then\n    if new.visibility <> 'withdrawn'"),
    ],
    "learners may insert posts": [
        (r"grant update \(visibility\) on public\.board_posts to authenticated;",
         "grant update (visibility) on public.board_posts to authenticated; grant insert on public.board_posts to authenticated;"
         " create policy posts_insert on public.board_posts for insert to authenticated with check (author_id = (select auth.uid()));"),
    ],
    "severity readable": [
        (r"comment_count, search, created_at, status_changed_at, edited_at\)\n  on public\.board_posts to anon, authenticated;",
         "comment_count, search, created_at, status_changed_at, edited_at, severity)\n  on public.board_posts to anon, authenticated;"),
    ],
    "votes on hidden or locked posts": [
        (r"and p\.visibility = 'visible' and not p\.locked\)\);", "));"),
    ],
    "vote limit off": [
        (r"perform private\.board_take\(new\.user_id, 'vote', null, 100, true\);", "perform private.board_take(new.user_id, 'vote', null, 1000, true);"),
    ],
    "vote take-backs not counted": [
        (r"perform private\.board_take\(old\.user_id, 'vote', null, null, false\);", "null;"),
    ],
    "vote count not kept": [
        (r"update public\.board_posts set vote_count = vote_count \+ 1 where id = new\.post_id;", "null;"),
    ],
    "exam-content report doesn't hide": [
        (r"when new\.reason = 'exam_content' and v_reviewed is null and private\.trusted_reporter\(new\.reporter_id\) then 'exam_report'",
         "when false then 'exam_report'"),
    ],
    "two reporters hide": [
        (r"when v_verified >= 3 then 'reports'", "when v_verified >= 2 then 'reports'"),
    ],
    "young reporters count": [
        (r"\n     and u\.created_at <= now\(\) - interval '7 days'\n     and private\.trusted_reporter", "\n     and private.trusted_reporter"),
    ],
    "report limit off": [
        (r"case when private\.account_is_new\(new\.reporter_id\) then 3 else 10 end", "100"),
    ],
    "reports of unseen posts": [
        (r"\n     where p\.id = new\.target_id and p\.visibility = 'visible' and p\.author_id <> new\.reporter_id;",
         "\n     where p.id = new.target_id;"),
    ],
    "blocked commenters allowed": [
        (r"v_post\.locked or private\.is_blocked_by\(v_post\.author_id, p_user\)\n", "v_post.locked\n"),
        (r"if private\.is_blocked_by\(v_post\.author_id, new\.author_id\) then", "if false then"),
    ],
    "staff can be blocked": [
        (r"\n     or exists \(select 1 from private\.staff s where s\.user_id = v_blocked\)", ""),
    ],
    "replies nest deeper": [
        (r" and c\.post_id = new\.post_id and c\.parent_id is null\) then", " and c.post_id = new.post_id) then"),
    ],
    "reserved handle missing": [
        (r"'team', 'support', 'official', 'staff'\] loop", "'team', 'official', 'staff'] loop"),
    ],
    "handle changes unlimited": [
        (r"and m\.handle is distinct from p_handle and m\.handle_changed_at > now\(\) - interval '24 hours'\) then", "and false) then"),
    ],
    "joining without the Terms": [
        (r"if not exists \(select 1 from public\.profiles p where p\.id = p_user\) then\n    raise exception 'forbidden' using errcode = '42501';\n  end if;\n  if p_version",
         "if false then\n    raise exception 'forbidden' using errcode = '42501';\n  end if;\n  if p_version"),
    ],
    "appeals after 14 days": [
        (r"and p\.visibility = 'removed' and p\.moderated_at > now\(\) - interval '14 days'\)", "and p.visibility = 'removed')"),
    ],
    "appeals of others' posts": [
        (r"where p\.id = new\.target_id and p\.author_id = new\.user_id\n", "where p.id = new.target_id\n"),
    ],
    "staff actions without staff": [
        (r"if not exists \(select 1 from private\.staff s where s\.user_id = p_actor\) then\n    raise exception 'forbidden' using errcode = '42501';\n  end if;\n  -- Admin-only",
         "if false then\n    raise exception 'forbidden' using errcode = '42501';\n  end if;\n  -- Admin-only"),
    ],
    "staff_act for learners": [
        (r"grant execute on function private\.is_staff\(\), private\.is_active_member\(\) to authenticated;",
         "grant execute on function private.is_staff(), private.is_active_member(), private.staff_act(uuid, text, text, uuid, text, jsonb) to authenticated;"),
    ],
    "is_blocked_by left to public": [
        (r"private\.is_active_member\(\), private\.is_blocked_by\(uuid, uuid\),\n", "private.is_active_member(),\n"),
    ],
    "new members not held": [
        (r"if v_hold is null and v_member\.approved_posts = 0 then", "if false then"),
    ],
    "pause ignored": [
        (r"if not v_settings\.posting_open then", "if false then"),
    ],
    "post limit off": [
        (r"perform private\.board_take\(p_user, 'post', 3, case when v_new then 1 else 5 end, true\);",
         "perform private.board_take(p_user, 'post', 30, 50, true);"),
    ],
    "banned members post": [
        (r"if v_member\.standing = 'banned' then", "if false then"),
    ],
    "exam content kept": [
        (r"body = case when p_action = 'delete_exam_content' then '' else body end", "body = body"),
    ],
    "others mark my notices read": [
        (r"create policy notif_select on public\.board_notifications for select to authenticated using \(user_id = \(select auth\.uid\(\)\)\);",
         "create policy notif_select on public.board_notifications for select to authenticated using (user_id is not null);"),
        (r"create policy notif_update on public\.board_notifications for update to authenticated\n  using \(user_id = \(select auth\.uid\(\)\)\) with check \(user_id = \(select auth\.uid\(\)\)\);",
         "create policy notif_update on public.board_notifications for update to authenticated\n  using (user_id is not null) with check (user_id is not null);"),
    ],
    "votes kept after account deletion": [
        (r"(create table public\.board_votes \(\n  post_id uuid not null references public\.board_posts \(id\) on delete cascade,\n  user_id uuid not null default auth\.uid\(\) references auth\.users \(id\)) on delete cascade",
         r"\1"),
    ],
    # ── Fix round P8 (CR_P8, SEC_P8, QA_P8): every new promise has its mutant. ──
    "name checks on every update (CR B4)": [
        (r"if tg_op = 'INSERT' or new\.handle is distinct from old\.handle then", "if true then"),
    ],
    "learners change names over REST (CR N3)": [
        (r"grant select \(public_id, handle, is_team\) on public\.board_members to anon, authenticated;",
         "grant select (public_id, handle, is_team) on public.board_members to anon, authenticated;"
         " grant update (handle) on public.board_members to authenticated;"
         " create policy members_update on public.board_members for update to authenticated using (user_id = (select auth.uid()));"),
    ],
    "look-alike names not folded (SEC B1 d)": [
        (r"select replace\(replace\(translate\(lower\(p\), '013457l', 'oieasti'\), 'rn', 'm'\), 'vv', 'w'\)", "select translate(lower(p), '013457', 'oieast')"),
    ],
    "ISACA marks not reserved (COMP 8)": [
        (r"'cdpse', 'ccoa', 'aaia', 'aaism',\n                                   'cobit', 'csx', ", ""),
    ],
    "no staff rename (SEC B1 c)": [
        (r"set handle = 'Learner ' \|\| substr\(replace\(gen_random_uuid\(\)::text, '-', ''\), 1, 6\), handle_kind = 'pseudonym'", "set handle_kind = 'pseudonym'"),
    ],
    "account ids readable (SEC S4)": [
        (r"grant select \(public_id, handle, is_team\) on public\.board_members to anon, authenticated;",
         "grant select (public_id, handle, is_team, user_id, created_at) on public.board_members to anon, authenticated;"),
    ],
    "author account ids readable (SEC S4)": [
        (r"grant select \(id, author_member, cert_id,", "grant select (id, author_id, author_member, cert_id,"),
    ],
    "self-block allowed": [
        (r"if v_blocked is null or v_blocked = new\.blocker_id\n", "if v_blocked is null\n"),
    ],
    "untrusted reporters hide (SEC S1)": [
        (r"and v_reviewed is null and private\.trusted_reporter\(new\.reporter_id\) then", "and v_reviewed is null then"),
    ],
    "reviewed posts hide on one report (SEC S1)": [
        (r"when new\.reason = 'exam_content' and v_reviewed is null and", "when new.reason = 'exam_content' and"),
    ],
    "replies to a blocker allowed (SEC S2)": [
        (r"if new\.parent_id is not null and private\.is_blocked_by\(", "if false and private.is_blocked_by("),
        (r"\n       or \(p_parent is not null and private\.is_blocked_by\(\n             \(select c\.author_id from public\.board_comments c where c\.id = p_parent\), p_user\)\) then",
         " then"),
    ],
    "notices reach a blocker (SEC S2)": [
        (r"\n     and \(p_except is null or not private\.is_blocked_by\(u, p_except\)\);", ";"),
    ],
    "reports keep no copy (SEC S3)": [
        (r"select left\(p\.title \|\| E'\\n' \|\| p\.body, 2200\) into new\.snapshot", "select null::text into new.snapshot"),
    ],
    "reports outlive a deleted post (CR N5)": [
        (r"create trigger posts_reports_gone after delete on public\.board_posts\n  for each row execute function private\.reports_target_gone\(\);", ""),
    ],
    "team names hidden in author_staff (CR N1)": [
        (r"\n         or is_team\n", "\n"),
    ],
    "own withdrawn comments come back (CR N2)": [
        (r"where c\.post_id = p_id and c\.visibility in \('visible', 'pending'\)", "where c.post_id = p_id and c.visibility <> 'hidden'"),
    ],
    "dismiss by report id (CR N4)": [
        (r"where target_kind = p_extra ->> 'kind' and target_id = p_target and status = 'open';", "where id = p_target and status = 'open';"),
    ],
    "withdrawn posts restorable (SEC N3)": [
        (r"if not found or \(v_prev = 'withdrawn' and p_action in \('approve', 'restore', 'hide'\)\) then", "if not found then"),
    ],
    "same draft counted twice (QA BUG-1)": [
        (r"    if p_client is not null then\n      select \* into v_post", "    if false then\n      select * into v_post"),
    ],
    "write attempts free (SEC S6)": [
        (r"select private\.board_take\(p_user, 'attempt', 30, 200, true\)", "select private.board_take(p_user, 'attempt', 3000, 20000, true)"),
    ],
    "practice-question posts not folded (CR N12)": [
        (r"or \(p_kind = 'content' and coalesce\(p_item_ref, ''\) like 'q:%'\)", "or false"),
    ],
    "merge keeps two official responses (CR nit 6)": [
        (r"set post_id = v_into, is_official = false where post_id = p_target;", "set post_id = v_into where post_id = p_target;"),
    ],
    # Re-review RR_P8 (supabase/tests/32_board_rr8.sql).
    "admin and staff only as whole words (RR_P8 R2)": [
        (r"case when v_term in \('admin', 'staff'\) then v_uncarried else v_squashed end", "case when v_term in ('admin', 'staff') then '' else v_squashed end"),
    ],
    "everyday words not taken out of names (RR_P8 R2)": [
        (r"v_uncarried := replace\(v_uncarried, v_term, ''\);", "null;"),
    ],
    "queue shows the first report's words, not the live ones (RR_P8 R1)": [
        (r"'title', t\.title, 'body', t\.body,", "'title', null::text, 'body', g.first_snapshot,"),
    ],
    "latest report's words lost (RR_P8 R1)": [
        (r"order by r\.created_at desc, r\.id desc", "order by r.created_at, r.id"),
    ],
    "edited after the report never said (RR_P8 R1)": [
        (r"'editedSinceReport', coalesce\(t\.edited_at > g\.first_at, false\)", "'editedSinceReport', false"),
    ],
    "dismiss ignores edits (RR_P8 R1)": [
        (r"if v_edited is not null and \(p_extra ->> 'editedAt' is null", "if false and (p_extra ->> 'editedAt' is null"),
    ],
    "board in realtime": [
        (r"\Z", "\ncreate publication supabase_realtime for table public.board_posts;\n"),
    ],
    # Security audit, 21 Oct 2026 (tests: supabase/tests/33_board_security.sql).
    "moderators get the admin-only actions (audit M2)": [
        (r"if not v_admin and \(", "if false and ("),
    ],
    "moderators can lift a ban (audit M2)": [
        (r"or \(p_kind = 'member' and p_action = 'unban' and exists \(", "or (false and exists ("),
        (r"or \(p_kind = 'appeal' and p_action = 'restore_appeal' and exists \(", "or (false and exists ("),
    ],
    "moderators can act on other staff (audit M2)": [
        (r"or \(p_kind = 'member' and exists \(\n          select 1 from public\.board_members m\n            join private\.staff s",
         "or (false and exists (\n          select 1 from public.board_members m\n            join private.staff s"),
    ],
    "edit_comment on a locked or hidden post (audit L5)": [
        (r"\n                    and p\.visibility = 'visible' and not p\.locked\) then", ") then"),
    ],
    "board_feed takes any cert id (audit L2)": [
        (r"if p_cert is null or p_cert !~ '\^\[a-z0-9-\]\{2,20\}\$' then", "if false then"),
    ],
    "board_feed searches uncut text (audit L2)": [
        (r"p_q := nullif\(left\(btrim\(p_q\), 100\), ''\);", "p_q := p_q;"),
    ],
}


def main() -> int:
    src = open(os.path.join(MIG_DIR, TARGET)).read()
    work = tempfile.mkdtemp(prefix="board-mutants-")
    try:
        clean = os.path.join(work, "clean")
        shutil.copytree(MIG_DIR, clean)
        if run_tests(clean, work) != 0:
            print("the suite fails on the real migrations: fix that first")
            return 2
        missed = 0
        for name, edits in MUTANTS.items():
            mutated = src
            ok = True
            for pattern, replacement in edits:
                mutated, n = re.subn(pattern, replacement, mutated, count=1)
                if n != 1:
                    ok = False
            if not ok:
                print(f"  ? {name}: pattern not found (update this script with the migration)")
                missed += 1
                continue
            d = os.path.join(work, "mut")
            shutil.rmtree(d, ignore_errors=True)
            shutil.copytree(MIG_DIR, d)
            with open(os.path.join(d, TARGET), "w") as f:
                f.write(mutated)
            caught = run_tests(d, work) != 0
            print(f"  {'caught' if caught else 'MISSED'}: {name}")
            missed += 0 if caught else 1
        print(f"mutants: {len(MUTANTS) - missed}/{len(MUTANTS)} caught")
        return 1 if missed else 0
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
