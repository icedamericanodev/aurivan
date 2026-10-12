#!/usr/bin/env bash
# Static RLS guard for supabase/migrations (Uplift Phase 6, guards G6 + G7).
#
#   bash scripts/check_rls.sh              check every migration
#   bash scripts/check_rls.sh --self-test  prove the checks catch known-bad SQL
#
# Rules (each one fails the run):
#   G6a  Every `create table` (public AND private) has a matching
#        `alter table … enable row level security` in the SAME file.
#   G6b  Table names are schema-qualified (public.x / private.x), so G6a and
#        reviewers can't misread which schema a table lands in.
#   G6c  No policy is `using (true)` / `with check (true)` unless its name is
#        on TRUE_POLICY_ALLOWLIST (catalogue and public-read policies only).
#   G6d  A view in public is `security_invoker`: a plain view runs as its
#        owner and silently skips the RLS of the tables it reads.
#   G7   No `security definer` function in schema public. Elevated helpers
#        live in schema private (not exposed by the Data API).
#
# The pgTAP suite (supabase/tests/01_hardening.sql) checks the same rules on
# the APPLIED database; this script catches them before anything runs.
#
# Migrations are APPEND-ONLY from the first `supabase db push` (Phase 9,
# owner go-ahead). Until then nothing is applied anywhere, which is why
# 20261005000000_init_mobile_sync.sql could be rewritten in place in Phase 6.
# After it, change a live table with a new migration file, never by editing
# an old one.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - "$@" <<'PY'
import glob
import re
import sys

# Policies allowed to be always-true. Phase 8 adds the board's public reads.
TRUE_POLICY_ALLOWLIST = {
    "content_packs_read",  # catalogue of downloadable packs, not user data
}


def statements(sql):
    """Split SQL into statements. Comments are dropped and dollar-quoted
    bodies become $BODY$, so a `;` or keyword inside a body never counts."""
    out, cur, i, n = [], [], 0, len(sql)
    while i < n:
        c = sql[i]
        if sql.startswith("--", i):
            j = sql.find("\n", i)
            i = n if j < 0 else j
            continue
        if sql.startswith("/*", i):
            j = sql.find("*/", i + 2)
            i = n if j < 0 else j + 2
            cur.append(" ")
            continue
        if c == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'" and sql.startswith("''", j):
                    j += 2
                    continue
                if sql[j] == "'":
                    break
                j += 1
            cur.append(sql[i:j + 1])
            i = j + 1
            continue
        m = re.match(r"\$([A-Za-z_][A-Za-z0-9_]*)?\$", sql[i:])
        if m:
            tag = m.group(0)
            j = sql.find(tag, i + len(tag))
            i = n if j < 0 else j + len(tag)
            cur.append(" $BODY$ ")
            continue
        if c == ";":
            out.append(" ".join("".join(cur).split()))
            cur = []
        else:
            cur.append(c)
        i += 1
    tail = " ".join("".join(cur).split())
    if tail:
        out.append(tail)
    return [s for s in out if s]


IDENT = r'(?:"[^"]+"|[a-z_][a-z0-9_$]*)'
NAME = rf"({IDENT}(?:\.{IDENT})?)"


def check(name, sql):
    errors = []
    created, rls = {}, set()
    for st in statements(sql):
        low = st.lower()
        m = re.match(rf"create (?:unlogged |temporary |temp )?table (?:if not exists )?{NAME}", low)
        if m and " partition of " not in low:
            tbl = m.group(1).replace('"', "")
            if "." not in tbl:
                errors.append(f"G6b {name}: table '{tbl}' is not schema-qualified")
            created[tbl] = True
        m = re.match(rf"alter table (?:if exists )?(?:only )?{NAME} enable row level security", low)
        if m:
            rls.add(m.group(1).replace('"', ""))
        m = re.match(rf"create policy ({IDENT}) on ", low)
        if m:
            pol = m.group(1).replace('"', "")
            if re.search(r"\b(using|with check)\s*\(\s*true\s*\)", low) and pol not in TRUE_POLICY_ALLOWLIST:
                errors.append(f"G6c {name}: policy '{pol}' is always true and not on the allowlist")
        m = re.match(rf"create (?:or replace )?(?:materialized )?view (?:if not exists )?{NAME}", low)
        if m:
            view = m.group(1).replace('"', "")
            if (view.startswith("public.") or "." not in view) and not re.search(r"security_invoker\s*=?\s*(true|on)\b", low):
                errors.append(f"G6d {name}: view '{view}' in public is not security_invoker")
        if re.match(r"(create (or replace )?|alter )function (\"public\"|public)\.", low) and "security definer" in low:
            fn = re.match(r"\S+ (?:or replace )?function ([^(\s]+)", low).group(1)
            errors.append(f"G7 {name}: security definer function '{fn}' in schema public")
    for tbl in created:
        if tbl not in rls:
            errors.append(f"G6a {name}: table '{tbl}' has no 'enable row level security' in the same file")
    return errors


def self_test():
    cases = {
        "ok": ("create table public.a (id int); alter table public.a enable row level security;"
               "create policy content_packs_read on public.a for select to authenticated using (true);"
               "create function private.f() returns int language sql security definer set search_path = '' as $$ select 1 $$;"
               "create view public.v with (security_invoker = true) as select 1;"
               "-- create table public.commented (id int);\n"
               "create function public.g() returns int language plpgsql as $f$ begin "
               "create table public.inside_body (id int); return 1; end $f$;", []),
        "no_rls": ("create table private.b (id int);", ["G6a"]),
        "rls_elsewhere": ("create table public.c (id int); alter table public.other enable row level security;", ["G6a"]),
        "unqualified": ("create table d (id int); alter table d enable row level security;", ["G6b"]),
        "true_policy": ("create table public.e (id int); alter table public.e enable row level security;"
                        "create policy anyone on public.e for update to authenticated using (true) with check (true);", ["G6c"]),
        "true_check": ("create policy p on public.e for insert to authenticated with check ( true );", ["G6c"]),
        "definer_public": ("create or replace function public.h() returns int language sql\n security definer as $$ select 1 $$;", ["G7"]),
        "alter_definer": ("alter function public.h() security definer;", ["G7"]),
        "plain_view": ("create view public.w as select 1;", ["G6d"]),
    }
    bad = 0
    for case, (sql, want) in cases.items():
        got = sorted({e.split()[0] for e in check(case, sql)})
        if got != sorted(want):
            print(f"  ✗ self-test {case}: expected {want}, got {got}")
            bad += 1
    print(f"check_rls self-test: {len(cases) - bad}/{len(cases)} cases OK")
    return bad == 0


if "--self-test" in sys.argv[1:]:
    sys.exit(0 if self_test() else 1)

files = sorted(glob.glob("supabase/migrations/*.sql"))
if not files:
    print("check_rls: no migrations found")
    sys.exit(1)
errors = []
for path in files:
    errors += check(path, open(path, encoding="utf-8").read())
for e in errors:
    print(f"  ✗ {e}")
print(f"check_rls: {len(files)} migration file(s), {len(errors)} problem(s)")
sys.exit(1 if errors else 0)
PY
