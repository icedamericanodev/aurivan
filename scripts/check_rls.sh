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
#        on TRUE_POLICY_ALLOWLIST (public-read settings only).
#        `create policy` and `alter policy` alike.
#   G6d  A view in public is `security_invoker`: a plain view runs as its
#        owner and silently skips the RLS of the tables it reads.
#   G6e  Nothing turns row level security off (`disable row level security`).
#   G7   No `security definer` function or procedure outside schema private.
#        An unqualified name lands in public (the search_path), so it counts
#        as public; `public . f()` with spaces too. Elevated helpers live in
#        schema private (not exposed by the Data API).
#   G8   Nothing is granted to `anon` or `public` (every role) unless the
#        object is on ANON_GRANT_ALLOWLIST (Phase 8's public board reads).
#        A grant naming several objects is checked object by object, and a
#        function is named without its argument list.
#
# The pgTAP suite (supabase/tests/01_hardening.sql) checks the same rules on
# the APPLIED database; this script catches them before anything runs.
#
# Migrations are APPEND-ONLY from the first apply to the hosted project
# (accounts beta, through the Supabase MCP). Until then nothing is applied
# anywhere, which is why the first two migrations could be edited in place
# (Phase 6, and the accounts beta fixes of 27 Oct 2026). After it, change a
# live table with a new migration file, never by editing an old one.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - "$@" <<'PY'
import glob
import re
import sys

# Policies allowed to be always-true.
TRUE_POLICY_ALLOWLIST = {
    "board_settings_read",  # Phase 8: pause valve, guidelines version, read scope (needed before sign-in)
}

# Objects anon or public may be granted something on (as written after `on`,
# e.g. "public.board_posts"; functions without their arguments). Phase 8: the
# board's public reads. Their anon RLS policies return rows only when
# board_settings.read_scope is 'everyone' (an owner decision, Phase 9).
ANON_GRANT_ALLOWLIST = {
    "public.board_settings",
    "public.board_members",
    "public.board_posts",
    "public.board_comments",
    "public.board_status_events",
    "public.board_feed",
    "public.board_post",
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
NAME = rf"({IDENT}(?:\s*\.\s*{IDENT})?)"


def clean(name):
    """A name as one token: no quotes, no spaces around the dot."""
    return re.sub(r"\s*\.\s*", ".", name.replace('"', ""))


def granted_objects(text):
    """The objects of a grant, one by one: commas inside an argument list
    don't split, and a function loses its argument list."""
    text = re.sub(r"^(table|function|procedure|routine|sequence|schema|all tables in schema|all functions in schema|all sequences in schema) ", "", text.strip())
    out, depth, cur = [], 0, ""
    for ch in text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return [clean(re.sub(r"\(.*\)$", "", o.strip()).strip()) for o in out if o.strip()]


def check(name, sql):
    errors = []
    created, rls = {}, set()
    for st in statements(sql):
        low = st.lower()
        m = re.match(rf"create (?:unlogged |temporary |temp )?table (?:if not exists )?{NAME}", low)
        if m and " partition of " not in low:
            tbl = clean(m.group(1))
            if "." not in tbl:
                errors.append(f"G6b {name}: table '{tbl}' is not schema-qualified")
            created[tbl] = True
        m = re.match(rf"alter table (?:if exists )?(?:only )?{NAME} enable row level security", low)
        if m:
            rls.add(clean(m.group(1)))
        m = re.match(rf"alter table (?:if exists )?(?:only )?{NAME} disable row level security", low)
        if m:
            errors.append(f"G6e {name}: row level security turned off on '{clean(m.group(1))}'")
        m = re.match(rf"(?:create|alter) policy ({IDENT}) on ", low)
        if m:
            pol = m.group(1).replace('"', "")
            if re.search(r"\b(using|with check)\s*\(\s*true\s*\)", low) and pol not in TRUE_POLICY_ALLOWLIST:
                errors.append(f"G6c {name}: policy '{pol}' is always true and not on the allowlist")
        m = re.match(rf"create (?:or replace )?(?:materialized )?view (?:if not exists )?{NAME}", low)
        if m:
            view = clean(m.group(1))
            if (view.startswith("public.") or "." not in view) and not re.search(r"security_invoker\s*=?\s*(true|on)\b", low):
                errors.append(f"G6d {name}: view '{view}' in public is not security_invoker")
        m = re.match(rf"(?:create (?:or replace )?|alter )(?:function|procedure) {NAME}\s*\(", low)
        if m and re.search(r"\bsecurity definer\b", low):
            fn = clean(m.group(1))
            if not fn.startswith("private."):
                where = "public (unqualified names land there)" if "." not in fn else fn.split(".")[0]
                errors.append(f"G7 {name}: security definer function '{fn}' in schema {where}")
        grant = re.match(r"(?:alter default privileges .*?)?grant (.+) to (.+?)(?: with grant option)?(?: granted by .+)?$", low)
        if grant and not low.startswith("revoke"):
            grantees = {g.strip().replace('"', "") for g in grant.group(2).split(",")}
            on = re.search(r" on (.+)$", grant.group(1))
            objs = granted_objects(on.group(1)) if on else [grant.group(1)]
            for role in sorted(grantees & {"anon", "public"}):
                for obj in objs:
                    if obj not in ANON_GRANT_ALLOWLIST:
                        errors.append(f"G8 {name}: '{obj}' granted to {role} (not on the allowlist)")
    for tbl in created:
        if tbl not in rls:
            errors.append(f"G6a {name}: table '{tbl}' has no 'enable row level security' in the same file")
    return errors


def self_test():
    cases = {
        "ok": ("create table public.a (id int); alter table public.a enable row level security;"
               "create policy board_settings_read on public.a for select to authenticated using (true);"
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
        "retired_catalogue_policy": ("create policy content_packs_read on public.a for select to authenticated using (true);", ["G6c"]),
        "definer_public": ("create or replace function public.h() returns int language sql\n security definer as $$ select 1 $$;", ["G7"]),
        "alter_definer": ("alter function public.h() security definer;", ["G7"]),
        "definer_unqualified": ("create function f() returns int language sql security definer as $$ select 1 $$;", ["G7"]),
        "definer_spaced": ("create function public . h() returns int language sql security definer as $$ select 1 $$;", ["G7"]),
        "definer_quoted": ('create function "public"."h"() returns int language sql security definer as $$ select 1 $$;', ["G7"]),
        "definer_procedure": ("create procedure p() language sql security definer as $$ select 1 $$;", ["G7"]),
        "invoker_unqualified_ok": ("create function f() returns int language sql security invoker as $$ select 1 $$;", []),
        "plain_view": ("create view public.w as select 1;", ["G6d"]),
        "rls_off": ("create table public.x (id int); alter table public.x enable row level security;"
                    "alter table public.x disable row level security;", ["G6e"]),
        "alter_policy_true": ("alter policy p on public.e using (true);", ["G6c"]),
        "alter_policy_check_true": ("alter policy p on public.e with check (true);", ["G6c"]),
        "grant_anon": ("grant select on public.profiles to anon;", ["G8"]),
        "grant_public": ("grant execute on function private.f() to public;", ["G8"]),
        "grant_anon_listed": ("grant select, insert on table public.e to authenticated, anon;", ["G8"]),
        "grant_default_anon": ("alter default privileges in schema public grant select on tables to anon;", ["G8"]),
        "grant_board_reads_ok": ("grant select (id, title) on public.board_posts to anon, authenticated;"
                                 "grant execute on function public.board_feed(text, int), public.board_post(uuid) to anon;", []),
        "grant_list_one_bad": ("grant execute on function public.board_post(uuid), private.is_staff() to anon;", ["G8"]),
        "grant_table_list_bad": ("grant select on public.board_posts, public.profiles to anon;", ["G8"]),
        "board_true_policy_ok": ("create policy board_settings_read on public.s for select to anon using (true);", []),
        "grant_ok": ("grant select on public.profiles to authenticated; grant usage on schema public to service_role;"
                     "revoke all on public.profiles from anon, public;", []),
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
