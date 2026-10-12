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
        (r"when new\.reason = 'exam_content' then 'exam_report'", "when false then 'exam_report'"),
    ],
    "two reporters hide": [
        (r"when v_verified >= 3 then 'reports'", "when v_verified >= 2 then 'reports'"),
    ],
    "young reporters count": [
        (r"\n     and u\.created_at <= now\(\) - interval '7 days';", ";"),
    ],
    "report limit off": [
        (r"case when private\.account_is_new\(new\.reporter_id\) then 3 else 10 end", "100"),
    ],
    "reports of unseen posts": [
        (r"select 1 from public\.board_posts p where p\.id = new\.target_id and p\.visibility = 'visible' and p\.author_id <> new\.reporter_id\)",
         "select 1 from public.board_posts p where p.id = new.target_id)"),
    ],
    "blocked commenters allowed": [
        (r"v_post\.locked or private\.is_blocked_by\(v_post\.author_id, p_user\) then", "v_post.locked then"),
        (r"if private\.is_blocked_by\(v_post\.author_id, new\.author_id\) then", "if false then"),
    ],
    "staff can be blocked": [
        (r"if exists \(select 1 from private\.staff s where s\.user_id = new\.blocked_id\)\n     or ", "if "),
    ],
    "replies nest deeper": [
        (r" and c\.post_id = new\.post_id and c\.parent_id is null\) then", " and c.post_id = new.post_id) then"),
    ],
    "reserved handle missing": [
        (r"'team', 'support', 'official', 'staff'\] loop", "'team', 'official', 'staff'] loop"),
    ],
    "handle changes unlimited": [
        (r"if old\.handle_changed_at > now\(\) - interval '24 hours' then", "if false then"),
    ],
    "joining without the Terms": [
        (r"create policy members_insert on public\.board_members for insert to authenticated\n  with check \(user_id = \(select auth\.uid\(\)\)\n              and exists \(select 1 from public\.profiles p where p\.id = \(select auth\.uid\(\)\)\)\);",
         "create policy members_insert on public.board_members for insert to authenticated\n  with check (user_id = (select auth.uid()));"),
    ],
    "appeals after 14 days": [
        (r"and p\.visibility = 'removed' and p\.moderated_at > now\(\) - interval '14 days'\)", "and p.visibility = 'removed')"),
    ],
    "appeals of others' posts": [
        (r"where p\.id = new\.target_id and p\.author_id = new\.user_id\n", "where p.id = new.target_id\n"),
    ],
    "staff actions without staff": [
        (r"if not exists \(select 1 from private\.staff s where s\.user_id = p_actor\) then\n    raise exception 'forbidden' using errcode = '42501';\n  end if;\n  if v_reason",
         "if false then\n    raise exception 'forbidden' using errcode = '42501';\n  end if;\n  if v_reason"),
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
    "board in realtime": [
        (r"\Z", "\ncreate publication supabase_realtime for table public.board_posts;\n"),
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
