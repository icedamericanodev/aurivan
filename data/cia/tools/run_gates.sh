#!/usr/bin/env bash
# Run every CIA gate and print one line per gate. This is the "CIA course" block
# of scripts/verify_repo.sh, kept here so that prove_harness.py can run the very
# same lines on its fixture.
#
#   bash data/cia/tools/run_gates.sh              # data/cia: the harness proof, then every gate
#   bash data/cia/tools/run_gates.sh --root DIR --today 2026-11-19 --no-proof
#                                                 # another tree (the harness fixture), without the proof
#
# What these lines must never do (each was a finding of the code review of
# 19 Nov 2026 and each has a planted fault in prove_harness.py):
#   - say "every CIA gate clean" when a gate did not really run. The last line
#     names what was left out: the originality gate without The IIA's text (it
#     is never stored in the repository; rounds and releases run it with
#     --fetch --require) or on an incomplete copy of it, and the id gate
#     without a git base;
#   - hide a failing tool's problem lines because they are indented or start
#     with ✗ or ! (the pack dry run and the shared linters print them that way);
#   - keep quiet about dated-fact warnings: their number is printed, with the
#     first few.
# Exit 1 when any gate fails. Tools: data/cia/tools/README.md.
set -u
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../.." && pwd)
root="$repo/data/cia"
today=""
proof=1
while [ $# -gt 0 ]; do
  case "$1" in
    --root) root=$(cd "$2" && pwd) || exit 2; shift 2 ;;
    --today) today=$2; shift 2 ;;
    --no-proof) proof=0; shift ;;
    *) echo "usage: bash data/cia/tools/run_gates.sh [--root DIR] [--today YYYY-MM-DD] [--no-proof]"; exit 2 ;;
  esac
done
opts=(--root "$root")
[ -n "$today" ] && opts+=(--today "$today")
shown=$root
[ "$root" = "$repo/data/cia" ] && shown="data/cia"

printf "CIA course (%s):\n" "$shown"
cia_ok=1
cia_out=""    # the last tool's full output
left_out=""   # gates that did not really run; the last line must say so
cia_run() {   # label, command...: print the tool's last line; on failure print its problem lines too
  label=$1; shift
  cia_out=$("$@" 2>&1); rc=$?
  printf "  %s: %s\n" "$label" "$(printf '%s\n' "$cia_out" | tail -1 | sed -e 's/^ *//' -e 's/^[a-z_]* *\(--check\)\{0,1\}: //')"
  if [ $rc -ne 0 ]; then
    printf '%s\n' "$cia_out" | sed '$d' | grep -E '^[[:space:]]*(ERROR|✗|!)' | head -15 | sed 's/^[[:space:]]*/    /'
    cia_ok=0
  fi
}
leave_out() { left_out="${left_out:+$left_out; }$1"; }

[ $proof -eq 1 ] && cia_run "harness proof" python3 "$here/prove_harness.py" -q
cia_run "structure" python3 "$here/check_cia.py" "${opts[@]}"
cia_run "glossary" python3 "$here/check_glossary.py" "${opts[@]}"
cia_run "old-syllabus wording" python3 "$here/check_stale_terms.py" "${opts[@]}"
cia_run "dated facts" python3 "$here/check_currency.py" "${opts[@]}"
warned=$(printf '%s\n' "$cia_out" | grep -c '^warn ')
if [ "$warned" -gt 0 ]; then
  printf "    ! %s dated-fact warning(s) (python3 data/cia/tools/check_currency.py lists them all):\n" "$warned"
  printf '%s\n' "$cia_out" | grep '^warn ' | head -5 | sed 's/^warn */      /'
fi
cia_run "originality" python3 "$here/check_originality.py" "${opts[@]}"
case "$(printf '%s\n' "$cia_out" | tail -1)" in
  *"; skipped") leave_out "originality not run here: no reference text" ;;
  *"reference incomplete"*) leave_out "originality run on an incomplete reference text" ;;
esac
cia_run "house style" python3 "$here/style_cia.py" "${opts[@]}"
cia_run "built glossary and principles" python3 "$here/build_packs.py" --check "${opts[@]}"
cia_run "Challenge pack" python3 "$here/build_challenge.py" --check "${opts[@]}"
cia_run "practice links" python3 "$here/sync_practice_ids.py" --check "${opts[@]}"
cia_run "ids against main" python3 "$here/check_ids.py" "${opts[@]}"
case "$cia_out" in
  *"skipped: no git base"*) leave_out "ids not compared with main: no git base" ;;
esac
for pack in cia1 cia2 cia3; do
  for f in "$root/$pack"/notes/d[0-9].json; do
    [ -f "$f" ] || continue
    cia_run "$pack notes $(basename "$f" .json)" python3 "$repo/scripts/lint_notes.py" "$f" --part "${pack#cia}" \
      --outline "$repo/docs/content/CIA_BLUEPRINT.md" --bank "$root/$pack/originals"
  done
done
for pack in cia1 cia2 cia3 ciac; do
  [ -f "$root/$pack/mindset/principles.json" ] && \
    cia_run "$pack principles" python3 "$repo/scripts/lint_principles.py" --cert "$pack" --cia-root "$root"
  # The exam-guide linter reads data/cia only, so it runs for the real course, not for a fixture.
  [ "$shown" = "data/cia" ] && [ -f "$root/$pack/exam/${pack}_exam_guide.json" ] && \
    cia_run "$pack exam guide" python3 "$repo/scripts/lint_exam_guide.py" --cert "$pack"
done
if command -v node >/dev/null 2>&1 && [ -f "$repo/scripts/cia_pack_dry_run.cjs" ]; then
  cia_run "app pack dry run" node "$repo/scripts/cia_pack_dry_run.cjs" "${opts[@]}"
fi
proved="CIA gates clean"
[ $proof -eq 1 ] && proved="harness proven and CIA gates clean"
if [ $cia_ok -eq 1 ] && [ -z "$left_out" ]; then
  [ $proof -eq 1 ] && proved="harness proven and every CIA gate clean"
  echo "  ✓ $proved"
elif [ $cia_ok -eq 1 ]; then
  echo "  ✓ $proved ($left_out)"
else
  echo "  ✗ CIA course has errors (run the commands in data/cia/tools/README.md)${left_out:+; $left_out}"
  exit 1
fi
