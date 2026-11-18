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
#       how-questions-are-made.html (how questions are made and checked),
#       beta.html (the beta-tester sign-up page, kaisip.com/beta), and
#       beta-desk.html (the private Beta Desk, kaisip.com/beta-desk: the page
#       holds no tester data; rows load only after an admin's two-step
#       sign-in, and the database checks it). The desk is published only at
#       the top of the site, never inside the preview folder.
#     - 404.html: the not-found page. With it, Cloudflare answers a missing
#       address with a real 404 instead of its single-page fallback (which
#       showed the home page, broken by the strict /data/* and /assets/*
#       policies). No script, image or font, and root links only.
#     - assets/ (icons, the self-hosted fonts and og-kaisip.png, the
#       link-preview card that index.html names in og:image). Only image,
#       font and stylesheet files: anything else in assets/ stops the build.
#       Two scripts are listed by name, both generated from the mobile
#       app's TypeScript by mobile/scripts/build-web-plant.mjs:
#       assets/kaisip-plant.js (the plant companion) and
#       assets/kaisip-cloud.js (the accounts client and sync engine; loaded
#       only when an account is used). A third, assets/beta-desk.js, is
#       hand-written: the Beta Desk page's code (top level only). No other .js
#       file is allowed.
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
OUT="${SITE_OUT:-_site}"

# SITE_MODE (owner, 4 Nov 2026): the website is CLOSED to a landing page
# until the phone app is in the stores.
#   landing (the default, what Cloudflare publishes): kaisip.com shows the beta
#     landing page (beta.html, also at /beta) plus Privacy, Terms, Help and
#     How questions are made. The
#     web study app and every data file are not published; any other address
#     gets the not-found page (404.html, status 404).
#   app: the full web study app as before (index.html + the free sample).
#     CI and the smoke tester build this too, so the app stays deployable.
# To reopen the web app at launch: change "landing" to "app" on the next line.
SITE_MODE="${SITE_MODE:-landing}"
# While the site is closed, the web study app is still built into this
# unlisted folder, so the owner can preview it at https://kaisip.com/<folder>/
# (free sample only, never the full bank; marked noindex in _headers). Keep the
# name in step with its rule in _headers. Remove the preview at launch.
PREVIEW_DIR="preview-u63raxyfxc"
#   home (not live yet, owner approval needed): the new marketing home page
#     (home.html, with assets/home.css, assets/home.js and assets/home/) is
#     the home page; /beta, the legal pages and the unlisted app preview stay
#     exactly as in landing mode. Its files are left out of the other two
#     modes, so merging them publishes nothing.
#     The page is a DRAFT unless its <meta name="kaisip-home-status"> says
#     "approved", and also while it holds draft wording (sample feedback, the
#     waitlist mockup) or a quote without recorded permission. A draft refuses
#     to build unless HOME_ALLOW_DRAFT=1 is set, and then it is served noindex.
#     That switch is for local review and CI only: the build refuses it on
#     Cloudflare's build machines.
case "$SITE_MODE" in
  landing|app|home) ;;
  *) echo "build_site: SITE_MODE must be landing, app or home (got: $SITE_MODE)" >&2; exit 1 ;;
esac
# The home page's own Content-Security-Policy (SITE_MODE=home). Stricter than
# /beta: no inline script or style at all. Its one script is assets/home.js.
HOME_CSP="default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
HOME_DRAFT=""
PAGES=(index.html 404.html privacy.html terms.html support.html how-questions-are-made.html beta.html)
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

# The Beta Desk: top level only (the preview build sets SITE_OUT), so its own
# strict rules in _headers (no-store, noindex, CSP) always apply to it.
DESK=""
if [ -z "${SITE_OUT:-}" ]; then
  DESK=1
  cp beta-desk.html "$OUT/beta-desk.html"
fi

if [ "$SITE_MODE" = "landing" ]; then
  # The landing page is the home page; the web app and its data stay unpublished.
  cp beta.html "$OUT/index.html"
  DATA=()
  rmdir "$OUT/data"
fi

if [ "$SITE_MODE" = "home" ]; then
  [ -f home.html ] || fail "missing home.html"
  # The page must work under style-src 'self' and script-src 'self': no inline
  # script, no style attribute or <style>, and only its own script file. The
  # same step decides whether the page is a draft (it prints the reasons).
  draft="$(python3 - <<'PYHOME'
import re, sys
page = open("home.html").read()
bad, draft = [], []
I = re.I | re.S
if re.search(r"<script\b(?![^>]*\ssrc\s*=)[^>]*>", page, I): bad.append("an inline <script>")
if re.search(r"<style[\s>]", page, I): bad.append("a <style> block")
if re.search(r"\sstyle\s*=", page, I): bad.append("a style attribute")
if re.search(r"\son[a-z]+\s*=", page, I): bad.append("an inline event handler")
srcs = re.findall(r"<script\b[^>]*\ssrc\s*=\s*[\"']([^\"']+)[\"']", page, I)
if srcs != ["assets/home.js"]: bad.append("scripts other than assets/home.js: %r" % srcs)
urls = [a or b or c for a, b, c in re.findall(r"\s(?:src|href|action|poster|formaction|data|imagesrcset|xlink:href)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))", page, I)]
for v in re.findall(r"\ssrcset\s*=\s*[\"']([^\"']*)[\"']", page, I):
    urls += [part.strip().split()[0] for part in v.split(",") if part.strip()]
if re.search(r"http-equiv\s*=\s*[\"']?refresh", page, I): bad.append("a meta refresh")
for url in urls:
    url = url.replace("\\", "/")
    if (re.match(r"//", url) or re.match(r"[a-z][a-z0-9+.-]*:", url, re.I)) and not re.match(r"(?:https://kaisip\.com/|mailto:)", url):
        bad.append("an address on another site: " + url)
    if url.startswith(("design-notes/", "marketing/", "mobile/", "docs/", "../")):
        bad.append("a file that is not published: " + url)
if bad:
    print("build_site: home.html has " + "; ".join(bad), file=sys.stderr)
    sys.exit(1)
# Draft or not. Approval is explicit; the wording checks are a second layer.
# Comments are ignored, so an example in a comment cannot approve the page.
page = re.sub(r"<!--.*?-->", "", page, flags=re.S)
ms = re.findall(r'<meta\s+name="kaisip-home-status"\s+content="([a-z]+)"', page)
status = ms[0] if len(ms) == 1 else ("missing" if not ms else "duplicated")
if status != "approved":
    draft.append("its status is " + status + ", not approved")
if re.search(r"fictional|sample learner|sample-badge|sample-disclosure|sample text|placeholder quote", page, re.I):
    draft.append("sample feedback")
if re.search(r'data-waitlist\s*=\s*["\']?mockup|design preview|does not send or save|mockup', page, re.I):
    draft.append("the waitlist mockup")
# Every quote must sit in a quote card with recorded permission and the
# tester reward disclosure (docs/beta/TESTER_FEEDBACK.md).
blocks = [b for _, b in re.findall(r'<(\w+)\b([^>]*\bclass\s*=\s*["\']?[^"\'>]*\bquote-card\b[^>]*>.*?)</\1>', page, re.I | re.S)]
n_quotes = len(re.findall(r"<blockquote\b", page, re.I))
if n_quotes != len(blocks) or any(not re.search(r'data-quote-permission\s*=\s*["\']?recorded\b', b, re.I) for b in blocks):
    draft.append("a quote without recorded permission")
if any("CISA Premium free" not in b for b in blocks):
    draft.append("a quote without the reward disclosure")
robots = re.search(r'<meta\s+name="robots"\s+content="([^"]*)"', page, re.I)
robots = robots.group(1) if robots else ""
if draft and "noindex" not in robots:
    print("build_site: home.html is still a draft (" + ", ".join(draft) + "), so it must carry <meta name=\"robots\" content=\"noindex, nofollow\">", file=sys.stderr)
    sys.exit(1)
if not draft and "noindex" in robots:
    print("build_site: home.html is approved but still says noindex in its robots meta", file=sys.stderr)
    sys.exit(1)
print(", ".join(draft))
PYHOME
)" || fail "home.html is not ready to build (see above)"
  if [ -n "$draft" ]; then
    # Never on Cloudflare's build machines (Pages sets CF_PAGES, Workers
    # Builds sets WORKERS_CI), so a dashboard setting cannot publish a draft.
    if [ -n "${CF_PAGES:-}${WORKERS_CI:-}" ]; then
      fail "home.html is a draft ($draft). HOME_ALLOW_DRAFT is never allowed on Cloudflare."
    fi
    [ "${HOME_ALLOW_DRAFT:-}" = "1" ] || fail "home.html is a draft ($draft), so it cannot be published. (Local review and CI only: HOME_ALLOW_DRAFT=1 builds it marked noindex. Launch steps: docs/WEBSITE_DEPLOY.md.)"
    HOME_DRAFT=1
    echo "build_site: DRAFT home page ($draft). Built noindex for review. Do not deploy this build." >&2
  fi
  cp home.html "$OUT/index.html"
  DATA=()
  rmdir "$OUT/data"
fi

for f in ${DATA[@]+"${DATA[@]}"}; do
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
  case "$f" in assets/beta-desk.js) [ -n "$DESK" ] && cp "$f" "$OUT/$f"; continue;; esac
  # The home page's own files travel only with the home page (SITE_MODE=home):
  # its stylesheet, its one script and its pictures.
  case "$f" in assets/home.css|assets/home.js|assets/home/*)
    if [ "$SITE_MODE" = "home" ]; then
      case "$f" in assets/home.js) cp "$f" "$OUT/$f"; continue;; esac
    else
      continue
    fi;;
  esac
  printf '%s' "$ext" | grep -Eqx "$ASSET_TYPES" || fail "$f: .$ext files are not allowed in assets/ (allowed: ${ASSET_TYPES//|/, })"
  mkdir -p "$OUT/$(dirname "$f")"
  cp "$f" "$OUT/$f"
done < <(find assets -type f -print0)

[ -f assets/favicon.ico ] && cp assets/favicon.ico "$OUT/favicon.ico"

# Landing mode: build the web app (app mode, with all its own checks) into the
# unlisted preview folder. Its _headers/_redirects are dropped: Cloudflare
# reads only the ones at the top of the site.
if { [ "$SITE_MODE" = "landing" ] || [ "$SITE_MODE" = "home" ]; } && [ -z "${SITE_NO_PREVIEW:-}" ]; then
  grep -qxF "/$PREVIEW_DIR/*" _headers || fail "_headers has no rule for /$PREVIEW_DIR/* (noindex)"
  SITE_MODE=app SITE_OUT="$OUT/$PREVIEW_DIR" bash "$0" > /dev/null || fail "the preview build (web app mode) failed"
  rm -f "$OUT/$PREVIEW_DIR/_headers" "$OUT/$PREVIEW_DIR/_redirects"
fi

# The legal pages' inline theme script is allowed in _headers by its sha256
# hash. If the script is edited, the hash must change too, or browsers block it.
for page in privacy.html terms.html support.html how-questions-are-made.html beta.html beta-desk.html; do
  hash="$(python3 -c 'import re,sys,hashlib,base64
s=open(sys.argv[1]).read(); m=re.search(r"<script>(.*?)</script>",s,re.S)
print("sha256-"+base64.b64encode(hashlib.sha256(m.group(1).encode()).digest()).decode() if m else "")' "$page")"
  if [ -n "$hash" ] && ! grep -qF "'$hash'" _headers; then
    fail "$page: its inline script hash $hash is not in _headers (update the legal-page CSP rules)"
  fi
done

# The home page's policy follows the mode. Landing: "/" and "/index.html"
# serve beta.html, so they must carry its strict policy (default-src 'none',
# its theme script by hash, form-action 'none'). App: that policy would block
# the web app's inline scripts, so it is dropped from _site/_headers here and
# the build checks it is gone.
python3 - "$OUT/_headers" "$SITE_MODE" "$HOME_CSP" "$HOME_DRAFT" <<'PY' || fail "_headers: the home page policy does not fit SITE_MODE=$SITE_MODE (see above)"
import re, sys, hashlib, base64
path, mode, home_csp, home_draft = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
lines = open(path).read().split("\n")
m = re.search(r"<script>(.*?)</script>", open("beta.html").read(), re.S)
h = "'sha256-" + base64.b64encode(hashlib.sha256(m.group(1).encode()).digest()).decode() + "'" if m else None
HOME = ("/", "/index.html")
def strict(v):
    return "default-src 'none'" in v and "form-action 'none'" in v and (h is None or h in v) and "'unsafe-inline' https://www.googletagmanager.com" not in v
out, cur = [], None
for ln in lines:
    s = ln.strip()
    if s and not s.startswith("#") and not ln[0].isspace():
        cur = s
    elif mode == "app" and cur in HOME and s.lower().startswith("content-security-policy:"):
        continue
    elif mode == "home" and cur in HOME and s.lower().startswith("content-security-policy:"):
        # The home page swaps the beta page's policy for its own.
        out.append("  Content-Security-Policy: " + home_csp)
        if home_draft:
            out.append("  X-Robots-Tag: noindex, nofollow")
        continue
    out.append(ln)
if mode in ("app", "home"):
    open(path, "w").write("\n".join(out))
def strict_home(v):
    v = v.strip()
    return (v == home_csp and "default-src 'none'" in v and "form-action 'none'" in v
            and "style-src 'self';" in v and "script-src 'self' " in v and "unsafe" not in v)
rules, cur = {}, None
for ln in out:
    s = ln.strip()
    if not s or s.startswith("#"):
        continue
    if not ln[0].isspace():
        cur = s; rules.setdefault(cur, [])
    elif cur:
        rules[cur].append(s)
bad = []
for r in HOME:
    csp = [x.split(":", 1)[1] for x in rules.get(r, []) if x.lower().startswith("content-security-policy:")]
    if mode == "landing" and not any(strict(v) for v in csp):
        bad.append(r + ": needs the strict landing-page policy (as /beta)")
    if mode == "app" and csp:
        bad.append(r + ": must not carry its own policy in app mode")
    if mode == "home" and not (len(csp) == 1 and strict_home(csp[0])):
        bad.append(r + ": needs the home page policy (HOME_CSP in scripts/build_site.sh)")
    if mode == "home" and home_draft and "X-Robots-Tag: noindex, nofollow" not in rules.get(r, []):
        bad.append(r + ": a draft home page must be noindex")
if bad:
    print("build_site: " + "; ".join(bad), file=sys.stderr)
    sys.exit(1)
PY

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

# The Beta Desk keeps exactly one inline script (the theme one, hashed above)
# and its noindex tag; its rule in _headers must keep noindex, no-store and
# that hash, and the page may load only assets/beta-desk.js.
n_inline="$(grep -c '<script>' beta-desk.html || true)"
[ "$n_inline" = "1" ] || fail "beta-desk.html: expected 1 inline <script>, found $n_inline (put code in assets/beta-desk.js)"
grep -q '<meta name="robots" content="noindex' beta-desk.html || fail "beta-desk.html lost its noindex meta tag"
python3 - <<'PYCHK' || fail "beta-desk: _headers /beta-desk rules need noindex, no-store and the inline script hash; the page may load only assets/beta-desk.js"
import re, hashlib, base64
rules = {}
cur = None
for line in open('_headers'):
    if line.strip().startswith('#') or not line.strip():
        continue
    if not line[0].isspace():
        cur = line.strip(); rules[cur] = []
    elif cur:
        rules[cur].append(line.strip())
page = open('beta-desk.html').read()
inline = re.findall(r'<script>(.*?)</script>', page, re.S)
srcs = re.findall(r'<script[^>]*\ssrc="([^"]+)"', page)
assert srcs == ['assets/beta-desk.js'], srcs
hashes = ["'sha256-" + base64.b64encode(hashlib.sha256(x.encode()).digest()).decode() + "'" for x in inline]
for path in ('/beta-desk', '/beta-desk.html'):
    h = ' '.join(rules.get(path, []))
    assert 'X-Robots-Tag: noindex' in h and 'Cache-Control: no-store' in h, path
    assert all(x in h for x in hashes), path + ': inline script hash missing from its own rule'
PYCHK

# Final guard: nothing outside the list may be in _site/.
while IFS= read -r -d '' f; do
  rel="${f#"$OUT"/}"
  case "$rel" in
    index.html|404.html|privacy.html|terms.html|support.html|how-questions-are-made.html|beta.html|_headers|_redirects|favicon.ico) ;;
    beta-desk.html) [ -n "$DESK" ] || fail "the Beta Desk must not be in the preview folder" ;;
    data/free/cisa_d[1-5].json|data/cisa_notes.json|data/mindset/principles.json) ;;
    data/exam/cisa_exam_guide.json|data/exam/final_review_week.json) ;;
    assets/home.css|assets/home.js|assets/home/*) [ "$SITE_MODE" = "home" ] || fail "the home page's files must not be published in SITE_MODE=$SITE_MODE: $rel" ;;
    assets/*) ;;
    "$PREVIEW_DIR"/*) [ "$SITE_MODE" != "app" ] || fail "unexpected file in the site: $rel" ;;
    *) fail "unexpected file in the site: $rel" ;;
  esac
done < <(find "$OUT" -type f -print0)

count="$(find "$OUT" -type f | wc -l | tr -d ' ')"
size="$(du -sh "$OUT" | cut -f1)"
echo "build_site: $count files ($size) in $OUT/ (SITE_MODE=$SITE_MODE)"
find "$OUT" -type f | sed "s|^$OUT/|  |" | sort
