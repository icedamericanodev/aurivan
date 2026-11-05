#!/usr/bin/env bash
# Starts a throwaway local Postgres, loads the Supabase stand-in (shim.sql) and
# every migration in supabase/migrations, then runs the pgTAP files you name.
# LOCAL TESTS ONLY: it never touches the hosted project.
#
#   bash scripts/beta_desk/pg_local.sh                       start + migrate
#   bash scripts/beta_desk/pg_local.sh supabase/tests/50_beta_desk.sql
#   bash scripts/beta_desk/pg_local.sh stop
#
# Needs the Postgres server binaries (PG_BIN, default /usr/lib/postgresql/16/bin)
# and, for tests, the pgtap extension (apt: postgresql-16-pgtap). Runs Postgres
# as the `postgres` user when started as root. Database: "t" on port 55432,
# socket in /var/tmp/kpg (PGDIR).
set -euo pipefail
cd "$(dirname "$0")/../.."
PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
PGDIR="${PGDIR:-/var/tmp/kpg}"
PORT="${PGPORT_LOCAL:-55432}"
as_pg() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
if [ "${1:-}" = stop ]; then as_pg "$PG_BIN/pg_ctl -D $PGDIR/data stop -m fast" || true; exit 0; fi
if [ ! -f "$PGDIR/data/PG_VERSION" ]; then
  mkdir -p "$PGDIR"; [ "$(id -u)" = 0 ] && chown postgres "$PGDIR"
  as_pg "$PG_BIN/initdb -D $PGDIR/data -A trust >/dev/null"
fi
as_pg "$PG_BIN/pg_ctl -D $PGDIR/data status >/dev/null" || as_pg "$PG_BIN/pg_ctl -D $PGDIR/data -o '-p $PORT -k $PGDIR' -l $PGDIR/log start >/dev/null"
P="psql -h $PGDIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
psql -h "$PGDIR" -p "$PORT" -U postgres -q -c 'drop database if exists t' -c 'create database t' >/dev/null
$P -d t -f scripts/beta_desk/shim.sql >/dev/null 2>&1
for m in supabase/migrations/*.sql; do $P -d t -f "$m" >/dev/null; done
echo "pg_local: migrations applied (database t, socket $PGDIR, port $PORT)"
fail=0
for t in "$@"; do
  out="$($P -d t -At -f "$t" 2>&1)" || fail=1
  printf '%s\n' "$out" | grep -E '^(not ok|# )' || true
  printf '%s: %s ok, %s not ok\n' "$t" "$(printf '%s\n' "$out" | grep -c '^ok')" "$(printf '%s\n' "$out" | grep -c '^not ok')"
  printf '%s\n' "$out" | grep -q '^not ok' && fail=1
done
exit $fail
