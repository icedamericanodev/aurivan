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
#     - the pages: index.html, privacy.html, terms.html, support.html,
#       beta.html (the beta-tester sign-up page, kaisip.com/beta)
#     - assets/ (icons, the self-hosted fonts and og-kaisip.png, the
#       link-preview card that index.html names in og:image). Only image,
#       font and stylesheet files: anything else in assets/ stops the build.
#       Two scripts are listed by name, both generated from the mobile
#       app's TypeScript by mobile/scripts/build-web-plant.mjs:
#       assets/kaisip-plant.js (the plant companion) and
#       assets/kaisip-cloud.js (the accounts client and sync engine; loaded
#       only when an account is used). No other .js file is allowed.
#     - the data the web app really loads (index.html fetches the FREE
#       question sample data/free/cisa_d1..5.json, data/cisa_notes.json,
#       data/mindset/principles.json and the two data/exam/ files, the exam
#       guide and the final review week; nothing else in data/).
#       The full bank (data/domain1..5.json) is NOT published since web
#       v12.50 (owner, 4 Nov 2026): it stays in the repo for the phone app.
#       A guard below stops the build if any question outside the free
#       sample appears anywhere in _site/.
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

PAGES=(index.html privacy.html terms.html support.html beta.html)
DATA=(data/free/cisa_d1.json data/free/cisa_d2.json data/free/cisa_d3.json data/free/cisa_d4.json data/free/cisa_d5.json data/cisa_notes.json data/mindset/principles.json data/exam/cisa_exam_guide.json data/exam/final_review_week.json)
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
  # The two scripts on the list: the plant companion and the accounts client.
  case "$f" in assets/kaisip-plant.js|assets/kaisip-cloud.js) cp "$f" "$OUT/$f"; continue;; esac
  printf '%s' "$ext" | grep -Eqx "$ASSET_TYPES" || fail "$f: .$ext files are not allowed in assets/ (allowed: ${ASSET_TYPES//|/, })"
  mkdir -p "$OUT/$(dirname "$f")"
  cp "$f" "$OUT/$f"
done < <(find assets -type f -print0)

[ -f assets/favicon.ico ] && cp assets/favicon.ico "$OUT/favicon.ico"

# The legal pages' inline theme script is allowed in _headers by its sha256
# hash. If the script is edited, the hash must change too, or browsers block it.
for page in privacy.html terms.html support.html beta.html; do
  hash="$(python3 -c 'import re,sys,hashlib,base64
s=open(sys.argv[1]).read(); m=re.search(r"<script>(.*?)</script>",s,re.S)
print("sha256-"+base64.b64encode(hashlib.sha256(m.group(1).encode()).digest()).decode() if m else "")' "$page")"
  if [ -n "$hash" ] && ! grep -qF "'$hash'" _headers; then
    fail "$page: its inline script hash $hash is not in _headers (update the legal-page CSP rules)"
  fi
done

# The full question bank must never be published (web v12.50). For every
# question outside the free sample, its stem, explanations and tips (any text
# of 40+ characters that no free question also uses) are looked for in every
# published file, as written and with HTML entities and JSON or JS escapes
# undone, so a copy under any name or inside a page is caught too.
python3 - "$OUT" <<'PY' || fail "a question outside the free sample is in the site (see above)"
import html, json, os, re, sys
out = sys.argv[1]
free = set(json.load(open("data/free/cisa_sample_ids.json"))["ids"])

def texts(q):
    yield q.get("question", "")
    yield q.get("correct_explanation", "")
    we = q.get("wrong_explanations") or {}
    yield from (we.values() if isinstance(we, dict) else we)
    yield from (q.get("tips") or [])

free_texts, paid = set(), []
for d in range(1, 6):
    for q in json.load(open(f"data/domain{d}.json"))["questions"]:
        bucket = [t for t in texts(q) if isinstance(t, str) and len(t) >= 40]
        if q["id"] in free:
            free_texts.update(bucket)
        else:
            paid.append((q["id"], bucket))

needles = [(qid, t) for qid, bucket in paid for t in bucket if t not in free_texts]

def plain(raw):
    """One cleaned copy of a file: HTML entities and JSON or JS escapes undone."""
    t = html.unescape(raw)
    t = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), t)
    for a, b in (('\\"', '"'), ("\\'", "'"), ("\\/", "/"), ("\\n", "\n")):
        t = t.replace(a, b)
    return t

bad = []
for root, _, names in os.walk(out):
    for name in names:
        path = os.path.join(root, name)
        try:
            raw = open(path, encoding="utf-8").read()
        except (UnicodeDecodeError, OSError):
            continue
        hay = raw + "\n" + plain(raw)
        for qid, needle in needles:
            if needle in hay:
                bad.append(f"{os.path.relpath(path, out)}: {qid}")
                break
if bad:
    print("build_site: paid questions found in the site:\n  " + "\n  ".join(bad[:20]), file=sys.stderr)
    sys.exit(1)
PY

# Final guard: nothing outside the list may be in _site/.
while IFS= read -r -d '' f; do
  rel="${f#"$OUT"/}"
  case "$rel" in
    index.html|privacy.html|terms.html|support.html|beta.html|_headers|_redirects|favicon.ico) ;;
    data/free/cisa_d[1-5].json|data/cisa_notes.json|data/mindset/principles.json) ;;
    data/exam/cisa_exam_guide.json|data/exam/final_review_week.json) ;;
    assets/*) ;;
    *) fail "unexpected file in the site: $rel" ;;
  esac
done < <(find "$OUT" -type f -print0)

count="$(find "$OUT" -type f | wc -l | tr -d ' ')"
size="$(du -sh "$OUT" | cut -f1)"
echo "build_site: $count files ($size) in $OUT/"
find "$OUT" -type f | sed "s|^$OUT/|  |" | sort
