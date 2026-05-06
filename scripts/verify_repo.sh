#!/usr/bin/env bash
# Repo health check — run on SessionStart and (optionally) by humans.
# Exits 0 if everything is consistent; non-zero if drift is detected.
set -uo pipefail

cd "$(dirname "$0")/.."

OK="✓"
FAIL="✗"
status=0

# 1. JSON validity + override coverage --------------------------------------
python3 - <<'PY' || status=1
import json, sys
counts = {1: 164, 2: 164, 3: 120, 4: 263, 5: 284}
all_ok = True
print("Tip + question coverage:")
for d, expected in counts.items():
    try:
        ov = json.load(open(f'data/tips_overrides/d{d}.json'))
        ov_count = sum(1 for k in ov if not k.startswith('_'))
        dom = json.load(open(f'data/domain{d}.json'))
        q_count = len(dom['questions'])
        with_tips = sum(1 for q in dom['questions'] if q.get('tips') and len(q['tips']) >= 3)
    except Exception as e:
        print(f"  D{d}: ERROR {e}")
        all_ok = False
        continue
    ok = ov_count == expected and q_count == expected and with_tips == expected
    mark = "✓" if ok else "✗"
    print(f"  {mark} D{d}: overrides={ov_count} questions={q_count} with_tips={with_tips} (expected {expected})")
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
if command -v node >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then
  printf "\nJS lint (no-undef on inline scripts):\n"
  if bash scripts/lint_inline_js.sh >/tmp/_lint.out 2>&1; then
    grep -E "error|warn" /tmp/_lint.out | grep -v "dataLayer" | head -3
    leftover=$(grep -E "error|warn" /tmp/_lint.out | grep -v "dataLayer" | wc -l)
    if [ "$leftover" -eq 0 ]; then
      printf "  ${OK} clean (only the standard GA dataLayer stub flagged)\n"
    else
      printf "  ${FAIL} lint issues above\n"
      status=1
    fi
  else
    printf "  ${FAIL} lint script failed — see /tmp/_lint.out\n"
    status=1
  fi
else
  printf "\nJS lint: skipped (node/npx not available)\n"
fi

# 4. Version-pill <-> APP_VERSION consistency -------------------------------
js_ver=$(grep -oE "const APP_VERSION = '[^']+'" index.html | head -1 | sed -E "s/.*'([^']+)'/\1/")
html_ver=$(grep -oE 'id="versionPill">[^<]+' index.html | head -1 | sed -E 's/.*>([^<]+)/\1/')
printf "\nVersion consistency: APP_VERSION=%s  pill=%s  " "$js_ver" "$html_ver"
if [ "$js_ver" = "$html_ver" ]; then
  printf "${OK}\n"
else
  printf "${FAIL} (mismatch — JS overrides at runtime, but please sync the static text)\n"
  status=1
fi

# Summary --------------------------------------------------------------------
echo
if [ $status -eq 0 ]; then
  echo "Repo health: ALL CHECKS PASSED"
else
  echo "Repo health: ISSUES FOUND — review output above"
fi

exit $status
