#!/usr/bin/env bash
# Extract every inline <script> block from index.html into a single JS file
# and run ESLint's no-undef rule. Skips non-JS scripts (type="application/json").
set -uo pipefail

cd "$(dirname "$0")/.."

OUT="/tmp/cisa-prep-inline.js"
RC="/tmp/cisa-prep-eslintrc.json"

python3 - <<PY > "$OUT"
import re
html = open('index.html').read()
out = []
line = 1
for m in re.finditer(r'<script([^>]*)>(.*?)</script>', html, re.DOTALL):
    attrs = m.group(1)
    if re.search(r'\bsrc\s*=', attrs): continue
    if re.search(r'\btype\s*=\s*["\'](?!text/javascript|application/javascript)', attrs): continue
    pre = html[:m.start()]
    start_line = pre.count('\n') + 1
    while line < start_line:
        out.append('')
        line += 1
    body = m.group(2)
    out.append(body)
    line += body.count('\n')
print('\n'.join(out))
PY

cat > "$RC" <<'EOF'
{
  "parserOptions": {"ecmaVersion": 2020, "sourceType": "script"},
  "env": {"browser": true, "es2020": true},
  "globals": {
    "QB_LOADING": "writable",
    "QB_LOADED": "writable",
    "dataLayer": "writable"
  },
  "rules": {"no-undef": "error"}
}
EOF

npx --yes --package=eslint@8 -- eslint --no-eslintrc -c "$RC" --rule 'no-undef: error' "$OUT"
