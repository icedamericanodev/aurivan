"""Mutation check for the password guard SQL (28 Nov 2026; design §3.3 and
the password audit's MEDIUM-3, docs/mobile/PASSWORD_DESIGN_AUDIT.md).

Each mutant below breaks ONE promise of
supabase/migrations/20261128000000_password_guard.sql (the H1 wipe at
confirmation, the insert and email-change wipes, the 10-minute first-password
rule before the write, the commit-time rule tied to the requesting session,
the MFA staff-only rule, the trigger shapes, the privileges, and the retired
wipe-every-password trigger). For every mutant the pgTAP suite
(supabase/tests) must FAIL: a mutant that still passes means a test is missing.

    python3 scripts/password_sql_mutants.py

How the tests run is the same as scripts/sync_sql_mutants.py: PGTAP_RUN (a
shell command that applies every migration in $MIGDIR to a fresh database
and runs supabase/tests), or by default the Supabase CLI with a running
local stack. Without Docker, use the local Postgres harness:

    PGTAP_RUN='bash scripts/beta_desk/pg_local.sh supabase/tests/*.sql' \\
      python3 scripts/password_sql_mutants.py

Exit code 0 when every mutant is caught.
"""
import importlib.util
import os
import re
import shutil
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIG_DIR = os.path.join(ROOT, "supabase", "migrations")
TARGET = "20261128000000_password_guard.sql"

_spec = importlib.util.spec_from_file_location("sync_sql_mutants", os.path.join(ROOT, "scripts", "sync_sql_mutants.py"))
_sync = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_sync)
run_tests = _sync.run_tests

# The rule-4 window before the write, and the two windows of rule 4b.
BEFORE_WINDOW = r"(         and s\.created_at > now\(\) - interval )'10 minutes'(\)\n  then)"
B4_FRESH = r"(where s\.user_id = new\.id and s\.created_at > now\(\) - interval )'10 minutes'"
B4_OLD = r"(s\.created_at <= now\(\) - interval )'10 minutes'"

# name: [(regex, replacement), ...]. Each regex must match; its FIRST match is replaced.
MUTANTS = {
    # ── Design §3.3 ──
    "rule 4 window is a day (before the write)": [(BEFORE_WINDOW, r"\1'1 day'\2")],
    "rule 2 falls through (no return after the wipe)": [
        (r"(if new\.email_confirmed_at is not null and old\.email_confirmed_at is null then\n    new\.encrypted_password := '';\n)    return new;\n", r"\1"),
    ],
    "rule 3 case-sensitive": [(r"lower\(new\.email\) is distinct from", "new.email is distinct from")],
    "rule 4 never refuses (before the write)": [
        (r"    raise exception 'kaisip_password_needs_recent_sign_in'\n      using errcode = 'P0001',\n            hint = 'Confirm it is you again[^;]*;",
         "    return new;"),
    ],
    "rule 1 gone (insert keeps the password)": [
        (r"    -- Rule 1\.\n    if new\.email_confirmed_at is not null then\n      new\.encrypted_password := '';\n    end if;\n", ""),
    ],
    # ── Audit MEDIUM-3 ──
    "guard is an AFTER trigger": [(r"create trigger kaisip_password_guard\n  before insert", "create trigger kaisip_password_guard\n  after insert")],
    "email dropped from the UPDATE OF list": [
        (r"update of email_confirmed_at, encrypted_password, email on auth\.users",
         "update of email_confirmed_at, encrypted_password on auth.users"),
    ],
    "unconfirmed early return deleted": [
        (r"  -- Still unconfirmed: leave it\.\n  if new\.email_confirmed_at is null then\n    return new;\n  end if;\n", ""),
    ],
    "rule 4 polices password changes": [
        (r"  if coalesce\(old\.encrypted_password, ''\) = ''\n     and not exists \(", "  if not exists ("),
    ],
    "rule 4b not deferrable": [(r"  deferrable initially deferred\n", "  not deferrable\n")],
    "rule 4b ignores an old session left at commit": [
        (r"\n     or exists \(select 1 from auth\.sessions s\n                where s\.user_id = new\.id\n                  and \(s\.created_at is null or s\.created_at <= now\(\) - interval '10 minutes'\)\)", ""),
    ],
    # ── Further mutants (this PR) ──
    "rule 4b window is a day": [(B4_FRESH, r"\1'1 day'"), (B4_OLD, r"\1'1 day'")],
    "rule 4b: a session with no created_at counts as fresh": [
        (r"\(s\.created_at is null or s\.created_at <= now\(\)", "(s.created_at <= now()"),
    ],
    "rule 4b polices unconfirmed accounts": [
        (r"  if new\.email_confirmed_at is null\n     or coalesce\(new\.encrypted_password, ''\) = ''", "  if coalesce(new.encrypted_password, '') = ''"),
    ],
    "rule 4b polices clearing": [(r"\n     or coalesce\(new\.encrypted_password, ''\) = ''\n     or coalesce\(old", "\n     or coalesce(old")],
    "rule 4b polices password changes": [
        (r"\n     or coalesce\(old\.encrypted_password, ''\) <> '' then\n    return null;", " then\n    return null;"),
    ],
    "rule 4b never refuses": [
        (r"    raise exception 'kaisip_password_needs_recent_sign_in'\n      using errcode = 'P0001',\n            hint = 'Only a session[^;]*;",
         "    return null;"),
    ],
    "rule 4b trigger missing": [(r"create constraint trigger kaisip_first_password_session\n[^;]*;", "")],
    "MFA open to everyone": [
        (r"    raise exception 'kaisip_mfa_staff_only'\n      using errcode = 'P0001',\n[^;]*;", "    return new;"),
    ],
    "MFA refuses Beta Desk admins": [
        (r"  if not exists \(select 1 from private\.beta_desk_admins a where a\.user_id = new\.user_id\)\n     and not exists", "  if not exists"),
    ],
    "MFA refuses board staff": [
        (r"\n     and not exists \(select 1 from private\.staff s where s\.user_id = new\.user_id\) then", " then"),
    ],
    "MFA guard runs as the caller": [
        (r"(create function private\.guard_mfa_enrol\(\) returns trigger\nlanguage plpgsql) security definer", r"\1"),
    ],
    "MFA trigger missing": [(r"create trigger kaisip_mfa_staff_only\n[^;]*;", "")],
    "MFA guard executable by learners": [
        (r"revoke all on function private\.guard_mfa_enrol\(\) from public, anon, authenticated, service_role;",
         "grant execute on function private.guard_mfa_enrol() to authenticated;"),
    ],
    "commit-time guard executable by the service role": [
        (r"revoke all on function private\.guard_first_password_session\(\) from public, anon, authenticated, service_role;",
         "revoke all on function private.guard_first_password_session() from public, anon, authenticated;"
         " grant execute on function private.guard_first_password_session() to service_role;"),
    ],
    # ── Implementation review (N1, N2, N4, S3) ──
    "rule 2 removed": [
        (r"  -- Rule 2: becoming confirmed now\.\n  if new\.email_confirmed_at is not null and old\.email_confirmed_at is null then\n"
         r"    new\.encrypted_password := '';\n    return new;\n  end if;\n", ""),
    ],
    "rule 3 removed": [
        (r"  -- Rule 3: the address changed[^\n]*\n  if old\.email is not null[^\n]*\n    new\.encrypted_password := '';\n    return new;\n  end if;\n", ""),
    ],
    "rule 4 counts other accounts' sessions": [
        (r"(       select 1 from auth\.sessions s\n)       where s\.user_id = new\.id\n         and (s\.created_at > now\(\))",
         r"\1       where \2"),
    ],
    "rule 4b: 'at least one fresh session' removed": [
        (r"  if not exists \(select 1 from auth\.sessions s\n                 where s\.user_id = new\.id and s\.created_at > now\(\) - interval '10 minutes'\)\n     or exists",
         "  if exists"),
    ],
    "rule 4b: any account's fresh session counts": [
        (r"where s\.user_id = new\.id and s\.created_at > now\(\) - interval '10 minutes'\)\n     or exists",
         "where s.created_at > now() - interval '10 minutes')\n     or exists"),
    ],
    "rule 4b: any account's old session counts": [
        (r"                where s\.user_id = new\.id\n                  and \(s\.created_at is null", "                where (s.created_at is null"),
    ],
    "rule 4b: exactly one session": [
        (r"  if not exists \(select 1 from auth\.sessions s\n                 where s\.user_id = new\.id and s\.created_at > now\(\) - interval '10 minutes'\)\n",
         "  if (select count(*) from auth.sessions s where s.user_id = new.id) <> 1\n"),
    ],
    "rule 4b: a deleted account is still checked": [
        (r"  if not exists \(select 1 from auth\.users u where u\.id = new\.id\) then\n    return null;[^\n]*\n  end if;\n", ""),
    ],
    "MFA guard ignores a factor moved to a learner": [
        (r"before insert or update of user_id on auth\.mfa_factors", "before insert on auth.mfa_factors"),
    ],
    "password guard without a fixed search_path": [
        (r"(create function private\.guard_password\(\) returns trigger\nlanguage plpgsql) set search_path = ''", r"\1"),
    ],
    "the wipe-every-password trigger kept": [
        (r"drop trigger kaisip_clear_password on auth\.users;\ndrop function private\.clear_password_when_confirmed\(\);\n", ""),
    ],
}


def code_only(sql: str) -> str:
    """The SQL without its -- comment lines, so a mutant that only edits a comment is caught here."""
    return "\n".join(line for line in sql.splitlines() if not line.lstrip().startswith("--"))


def order_ok(src: str) -> bool:
    """Audit LOW-2, checked on the text (no test can see statement order): the
    old trigger is dropped only after every new trigger exists."""
    src = code_only(src)
    drop = src.find("drop trigger kaisip_clear_password on auth.users;")
    creates = [src.find(t) for t in ("create trigger kaisip_password_guard",
                                     "create constraint trigger kaisip_first_password_session",
                                     "create trigger kaisip_mfa_staff_only")]
    return drop > 0 and all(0 <= c < drop for c in creates)


def main() -> int:
    src = open(os.path.join(MIG_DIR, TARGET)).read()
    if not order_ok(src):
        print("the old trigger must be dropped AFTER every new trigger is created (audit LOW-2)")
        return 2
    print("  ok: the old trigger is dropped after the new ones are created")
    work = tempfile.mkdtemp(prefix="password-mutants-")
    try:
        clean = os.path.join(work, "clean")
        shutil.copytree(MIG_DIR, clean)
        if run_tests(clean, work) != 0:
            print("the suite fails on the real migrations: fix that first")
            return 2
        missed = 0
        for name, edits in MUTANTS.items():
            mutated, ok = src, True
            for pattern, replacement in edits:
                mutated, n = re.subn(pattern, replacement, mutated, count=1)
                if n != 1:
                    ok = False
            if not ok or code_only(mutated) == code_only(src):
                print(f"  ? {name}: pattern not found, or it only changed a comment (update this script)")
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
