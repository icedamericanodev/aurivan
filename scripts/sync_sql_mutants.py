"""Mutation check for the sync SQL (Uplift Phase 7 review, SEC_P7 S6).

Each mutant below breaks ONE promise of
supabase/migrations/20261013000000_sync_snapshots.sql (own rows only, the
server owns rev and the keys, revs never reused, 60 writes an hour that a
delete can't reset, deletes always allowed, the size caps, the checkpoints).
For every mutant the pgTAP suite (supabase/tests) must FAIL: a mutant that
still passes means a test is missing.

    python3 scripts/sync_sql_mutants.py

How the tests run is up to PGTAP_RUN, a shell command that applies every
migration in $MIGDIR to a FRESH database and runs supabase/tests, exiting
non-zero when any test fails. Without it, the default needs the Supabase CLI
and a running local stack (`supabase start`, as in CI): it copies supabase/
to a temporary folder, swaps in the mutant, and runs `supabase db reset`
and `supabase test db` there. A plain Postgres with the Supabase shim (no
Docker) works too: point PGTAP_RUN at a script that loads the shim, the
$MIGDIR migrations and runs pg_prove.

Exit code 0 when every mutant is caught.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIG_DIR = os.path.join(ROOT, "supabase", "migrations")
TARGET = "20261013000000_sync_snapshots.sql"

# name: (regex, replacement). Each pattern must match exactly once.
MUTANTS = {
    "no profile check on insert": (
        r"create policy snap_insert on public\.sync_snapshots for insert to authenticated\n  with check \(user_id = \(select auth\.uid\(\)\)\n\s+and exists \(select 1 from public\.profiles p where p\.id = \(select auth\.uid\(\)\)\)\);",
        "create policy snap_insert on public.sync_snapshots for insert to authenticated\n  with check (user_id = (select auth.uid()));",
    ),
    "rev not raised on update": (r"new\.rev := private\.sync_next_rev\(old\.user_id, old\.store, old\.rev, true\);", ""),
    "keys not reverted": (r"new\.user_id := old\.user_id; new\.store := old\.store;", ""),
    "no rate limit": (r"if p_refuse and v_n > 60 then", "if p_refuse and v_n > 6000 then"),
    "deletes not counted": (r"perform private\.sync_next_rev\(old\.user_id, old\.store, old\.rev, false\);", "null;"),
    "deletes refused over the limit": (r"if p_refuse and v_n > 60 then", "if v_n > 60 then"),
    "rev reused after delete": (
        r"v_rev bigint := greatest\(\(extract\(epoch from clock_timestamp\(\)\) \* 1000\)::bigint, coalesce\(p_old_rev, 0\) \+ 1\);",
        "v_rev bigint := coalesce(p_old_rev, 0) + 1;",
    ),
    "bigger progress cap": (r"<= 2000000\)", "<= 3000000)"),
    "no settings cap": (r"octet_length\(state::text\) <= 98304\)", "octet_length(state::text) <= 2000000)"),
    "history unbounded": (r"limit 2\)", "limit 20)"),
    "history not cleared": (r"create trigger sync_history_clear after delete", "create trigger sync_history_clear after update"),
    "select all rows": (
        r"using \(user_id = \(select auth\.uid\(\)\)\);\ncreate policy snap_insert",
        "using (user_id is not null);\ncreate policy snap_insert",
    ),
    "update other rows": (
        r"create policy snap_update on public\.sync_snapshots for update to authenticated\n  using \(user_id = \(select auth\.uid\(\)\)\)",
        "create policy snap_update on public.sync_snapshots for update to authenticated\n  using (true)",
    ),
    "client may set rev": (
        r"grant update \(store_version, app_version, device_id, state\)",
        "grant update (store_version, app_version, device_id, state, rev)",
    ),
    "anon may read": (
        r"grant select on public\.sync_snapshots to service_role;",
        "grant select on public.sync_snapshots to service_role; grant select on public.sync_snapshots to anon;",
    ),
}


def run_tests(mig_dir: str, work: str) -> int:
    """Run the suite against `mig_dir`; returns the exit code (non-zero = some test failed)."""
    cmd = os.environ.get("PGTAP_RUN")
    if cmd:
        return subprocess.run(cmd, shell=True, env={**os.environ, "MIGDIR": mig_dir}, capture_output=True, text=True).returncode
    # Default: the Supabase CLI on a temporary copy of supabase/ (the local stack must be running).
    proj = os.path.join(work, "proj")
    shutil.rmtree(proj, ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, "supabase"), os.path.join(proj, "supabase"))
    shutil.rmtree(os.path.join(proj, "supabase", "migrations"))
    shutil.copytree(mig_dir, os.path.join(proj, "supabase", "migrations"))
    for step in (["supabase", "db", "reset", "--workdir", proj], ["supabase", "test", "db", "--workdir", proj]):
        r = subprocess.run(step, capture_output=True, text=True)
        if r.returncode != 0:
            return r.returncode
    return 0


def main() -> int:
    src = open(os.path.join(MIG_DIR, TARGET)).read()
    work = tempfile.mkdtemp(prefix="sync-mutants-")
    try:
        # The unmutated SQL must pass first, or every "caught" below means nothing.
        clean = os.path.join(work, "clean")
        shutil.copytree(MIG_DIR, clean)
        if run_tests(clean, work) != 0:
            print("the suite fails on the real migrations: fix that first")
            return 2
        missed = 0
        for name, (pattern, replacement) in MUTANTS.items():
            mutated, n = re.subn(pattern, lambda _m, r=replacement: r, src, count=1)
            if n != 1:
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
