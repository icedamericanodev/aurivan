#!/usr/bin/env bash
# Builds the public website into _site/ for Cloudflare Pages.
#
#   bash scripts/build_site.sh          (Cloudflare runs exactly this)
#
# WHAT IT DOES (plain English):
#   Everything in _site/ becomes public on the web. So instead of publishing
#   the whole repository (docs/, supabase/, mobile/, .claude/, design-notes/,
#   archive/ ... which GitHub Pages does today), this copies ONLY the files on
#   the list below. A file that is not on the list is never published.
#
#   The list:
#     - the pages: index.html, privacy.html, terms.html, support.html
#     - assets/ (icons and, once added, the self-hosted fonts). Only image,
#       font and stylesheet files: anything else in assets/ stops the build.
#       One script is listed by name: assets/kaisip-plant.js, the plant
#       companion (generated from the mobile app's plant code by
#       mobile/scripts/build-web-plant.mjs). No other .js file is allowed.
#     - the data the web app really loads (index.html fetches
#       data/domain1..5.json, data/cisa_notes.json,
#       data/mindset/principles.json and the two data/exam/ files, the exam
#       guide and the final review week; nothing else in data/)
#     - _headers (security and cache headers) and _redirects
#     - favicon.ico at the top level (browsers ask for /favicon.ico by
#       themselves)
#
#   To publish a NEW page (for example delete-account.html): add it to PAGES
#   below AND give it its own rule in _headers (each page has its own
#   Content-Security-Policy). docs/WEBSITE_DEPLOY.md has the details.
#
# No npm, no build tools: plain bash, cp and find, so it runs on Cloudflare's
# build machine and on a Mac. It does not change any file outside _site/.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="_site"

PAGES=(index.html privacy.html terms.html support.html)
DATA=(data/domain1.json data/domain2.json data/domain3.json data/domain4.json data/domain5.json data/cisa_notes.json data/mindset/principles.json data/exam/cisa_exam_guide.json data/exam/final_review_week.json)
SITE_CONFIG=(_headers _redirects)
# File types allowed inside assets/ (lower case).
ASSET_TYPES='png|ico|svg|webp|jpg|jpeg|woff2|woff|css'

fail() { echo "build_site: $*" >&2; exit 1; }

# Checks a file is valid JSON with whichever of python3 / node the machine has.
valid_json() {
  if command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$1" 2>/dev/null
  elif command -v node >/dev/null 2>&1; then
    node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$1" 2>/dev/null
  else
    echo "build_site: no python3 or node here, so $1 was not JSON-checked" >&2
  fi
}

# Start clean, so a file removed from the list disappears from the site.
rm -rf "$OUT"
mkdir -p "$OUT/data" "$OUT/assets"

for f in "${PAGES[@]}" "${SITE_CONFIG[@]}"; do
  [ -f "$f" ] || fail "missing $f"
  cp "$f" "$OUT/$f"
done

for f in "${DATA[@]}"; do
  [ -f "$f" ] || fail "missing $f"
  # Catch a broken data file here, not in a learner's browser.
  valid_json "$f" || fail "$f is not valid JSON"
  mkdir -p "$OUT/$(dirname "$f")"
  cp "$f" "$OUT/$f"
done

# assets/: copy the folder, but stop on any file type that isn't expected
# (a stray document, script or archive must not go public by accident).
[ -d assets ] || fail "missing assets/"
while IFS= read -r -d '' f; do
  name="$(basename "$f")"
  ext="$(printf '%s' "${name##*.}" | tr '[:upper:]' '[:lower:]')"
  case "$name" in .*) fail "hidden file $f is not allowed in assets/";; esac
  # Font licences must travel with the fonts (the SIL Open Font Licence asks for it).
  case "$f" in assets/fonts/OFL-*.txt) mkdir -p "$OUT/$(dirname "$f")"; cp "$f" "$OUT/$f"; continue;; esac
  # The one script on the list: the plant companion (index.html loads it).
  case "$f" in assets/kaisip-plant.js) cp "$f" "$OUT/$f"; continue;; esac
  printf '%s' "$ext" | grep -Eqx "$ASSET_TYPES" || fail "$f: .$ext files are not allowed in assets/ (allowed: ${ASSET_TYPES//|/, })"
  mkdir -p "$OUT/$(dirname "$f")"
  cp "$f" "$OUT/$f"
done < <(find assets -type f -print0)

[ -f assets/favicon.ico ] && cp assets/favicon.ico "$OUT/favicon.ico"

# The legal pages' inline theme script is allowed in _headers by its sha256
# hash. If the script is edited, the hash must change too, or browsers block it.
for page in privacy.html terms.html support.html; do
  hash="$(python3 -c 'import re,sys,hashlib,base64
s=open(sys.argv[1]).read(); m=re.search(r"<script>(.*?)</script>",s,re.S)
print("sha256-"+base64.b64encode(hashlib.sha256(m.group(1).encode()).digest()).decode() if m else "")' "$page")"
  if [ -n "$hash" ] && ! grep -qF "'$hash'" _headers; then
    fail "$page: its inline script hash $hash is not in _headers (update the legal-page CSP rules)"
  fi
done

# Final guard: nothing outside the list may be in _site/.
while IFS= read -r -d '' f; do
  rel="${f#"$OUT"/}"
  case "$rel" in
    index.html|privacy.html|terms.html|support.html|_headers|_redirects|favicon.ico) ;;
    data/domain[1-5].json|data/cisa_notes.json|data/mindset/principles.json) ;;
    data/exam/cisa_exam_guide.json|data/exam/final_review_week.json) ;;
    assets/*) ;;
    *) fail "unexpected file in the site: $rel" ;;
  esac
done < <(find "$OUT" -type f -print0)

count="$(find "$OUT" -type f | wc -l | tr -d ' ')"
size="$(du -sh "$OUT" | cut -f1)"
echo "build_site: $count files ($size) in $OUT/"
find "$OUT" -type f | sed "s|^$OUT/|  |" | sort
