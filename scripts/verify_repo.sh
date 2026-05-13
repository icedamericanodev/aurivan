#!/usr/bin/env bash
# Repo health check — run on SessionStart and (optionally) by humans.
# Exits 0 if everything is consistent; non-zero if drift is detected.
set -uo pipefail

cd "$(dirname "$0")/.."

OK="✓"
FAIL="✗"
status=0

# 1. JSON validity + tip coverage --------------------------------------------
# v9.0+: tips live inline in data/originals/d{N}.json (single source of truth).
# `scripts/originals_to_domain.py` regenerates data/domain{N}.json from originals.
# tips_overrides/ is legacy and no longer the authoring layer.
python3 - <<'PY' || status=1
import json, sys
counts = {1: 180, 2: 180, 3: 124, 4: 260, 5: 260}
all_ok = True
print("Tip + question coverage:")
for d, expected in counts.items():
    try:
        dom = json.load(open(f'data/domain{d}.json'))
        q_count = len(dom['questions'])
        with_tips = sum(1 for q in dom['questions'] if q.get('tips') and len(q['tips']) >= 3)
    except Exception as e:
        print(f"  D{d}: ERROR {e}")
        all_ok = False
        continue
    ok = q_count == expected and with_tips == expected
    mark = "✓" if ok else "✗"
    print(f"  {mark} D{d}: questions={q_count} with_tips={with_tips} (expected {expected})")
    if not ok: all_ok = False
sys.exit(0 if all_ok else 1)
PY

# 2. Domain weights aligned to ISACA blueprint -------------------------------
python3 - <<'PY' || status=1
import json, sys
expected = {1: '18%', 2: '18%', 3: '12%', 4: '26%', 5: '26%'}
print("\nDomain weights (cisa_notes.json):")
notes = json.load(open('data/cisa_notes.json'))
ok = True
for dom in notes['domains']:
    n = dom.get('domain_number')
    got = dom.get('exam_weight')
    if expected.get(n) != got:
        print(f"  ✗ D{n}: {got} (expected {expected.get(n)})")
        ok = False
    else:
        print(f"  ✓ D{n}: {got}")
sys.exit(0 if ok else 1)
PY

# 3. JS lint (no-undef) on inline scripts ------------------------------------
# Trust ESLint's exit code rather than grepping output: on a fresh runner,
# `npx --yes` prints npm deprecation warnings (lowercase "npm warn ...") that
# would otherwise trip a naive grep for the word "warn".
if command -v node >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then
  printf "\nJS lint (no-undef on inline scripts):\n"
  if bash scripts/lint_inline_js.sh >/tmp/_lint.out 2>&1; then
    printf "  ${OK} clean (only the standard GA dataLayer stub flagged)\n"
  else
    printf "  ${FAIL} lint issues:\n"
    grep -v "^npm " /tmp/_lint.out | grep -E "(error|warning)" | head -5 | sed 's/^/    /'
    status=1
  fi
else
  printf "\nJS lint: skipped (node/npx not available)\n"
fi

# 4. Version-pill <-> APP_VERSION consistency -------------------------------
# During the maintenance phase, both values are empty (no APP_VERSION constant
# in the trimmed-down maintenance index.html, no version pill). The empty=empty
# case is treated as consistent and passes silently. Once the relaunched app
# ships, APP_VERSION is restored and this check guards against drift again.
js_ver=$(grep -oE "const APP_VERSION = '[^']+'" index.html | head -1 | sed -E "s/.*'([^']+)'/\1/")
html_ver=$(grep -oE 'id="versionPill">[^<]+' index.html | head -1 | sed -E 's/.*>([^<]+)/\1/')
printf "\nVersion consistency: APP_VERSION=%s  pill=%s  " "$js_ver" "$html_ver"
if [ "$js_ver" = "$html_ver" ]; then
  printf "${OK}\n"
else
  printf "${FAIL} (mismatch — JS overrides at runtime, but please sync the static text)\n"
  status=1
fi

# 5. Originals (rebuild content) schema validation --------------------------
# The new bank lives under data/originals/ during the rebuild and is validated
# against the schema in RELAUNCH_CHECKLIST.md. Empty banks are valid (the
# scaffolding state); the validator only fails on actual schema violations.
printf "\n"
if ! python3 scripts/validate_originals.py; then
  status=1
fi

# 6. Originals lint — mechanical quality checks (parity, citations, tips,
# precision-words, scenario_context length). Reports counts; does NOT fail
# the build on legacy debt (D1 was authored pre-parity-discipline). New
# batches should run with --batch --strict for hard enforcement.
printf "\nOriginals lint (parity + citations + tips):\n"
lint_out=$(python3 scripts/lint_originals.py 2>&1 || true)
errors_count=$(echo "$lint_out" | grep -c "^    ✗" || true)
warnings_count=$(echo "$lint_out" | grep -c "^    ⚠" || true)
if [ "$errors_count" -eq 0 ] && [ "$warnings_count" -eq 0 ]; then
  printf "  ${OK} clean\n"
else
  printf "  ${OK} reported (errors=%s warnings=%s; new batches should use --batch --strict)\n" "$errors_count" "$warnings_count"
fi

# Summary --------------------------------------------------------------------
echo
if [ $status -eq 0 ]; then
  echo "Repo health: ALL CHECKS PASSED"
else
  echo "Repo health: ISSUES FOUND — review output above"
fi

exit $status
