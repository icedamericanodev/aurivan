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
#       beta.html (kaisip.com/beta: the Android beta has finished, 28 Nov 2026; it thanks testers and keeps their terms), and
#       beta-desk.html (the private Beta Desk, kaisip.com/beta-desk: the page
#       holds no tester data; rows load only after an admin's two-step
#       sign-in, and the database checks it). The desk is published only at
#       the top of the site, never inside the web app folder (/app/).
#     - 404.html: the not-found page. With it, Cloudflare answers a missing
#       address with a real 404 instead of its single-page fallback (which
#       showed the home page, broken by the strict /data/* and /assets/*
#       policies). No script, image or font, and root links only.
#     - assets/ (icons, the self-hosted fonts and og-kaisip.png, the
#       link-preview card that index.html names in og:image). Only image,
#       font and stylesheet files: anything else in assets/ stops the build.
#       Three scripts are listed by name, all generated from the mobile
#       app's TypeScript by mobile/scripts/build-web-plant.mjs:
#       assets/kaisip-plant.js (the plant companion),
#       assets/kaisip-cloud.js (the accounts client and sync engine; loaded
#       only when an account is used) and assets/kaisip-password-words.js
#       (the password rules' word lists; loaded only when a password form
#       opens). Another, assets/beta-desk.js, is
#       hand-written: the Beta Desk page's code (top level only). No other .js
#       file is allowed.
#     - the data the web app really loads (index.html fetches the FREE
#       question sample data/free/cisa_d1..5.json, data/cisa_notes.json,
#       data/mindset/principles.json and the two data/exam/ files, the exam
#       guide and the final review week; nothing else in data/).
#       The full bank (data/domain1..5.json) is NOT published since web
#       v12.50 (owner, 4 Nov 2026): it stays in the repo for the phone app.
#       A guard below stops the build if any question outside the free
#       sample appears anywhere in _site/. The website is CISA-only: the
#       CRISC and AAIA samples in data/free/ are for the phone app, and a
#       second guard stops the build if any other course's question id or
#       data/free/ file is in _site/.
#     - delete-account.html and human-check.html, the two account pages, ONLY
#       when accounts are on for everyone (ACCOUNTS_ON = true in index.html)
#       or the build is asked for them (SITE_ACCOUNTS_PREVIEW=1). Otherwise
#       they are not in the site at all, so nothing tells a visitor that
#       accounts exist before they can make one. delete-account.html is the
#       web deletion address Google Play asks for; human-check.html is the
#       Android app's human check (Cloudflare Turnstile). SITE_ACCOUNTS_PREVIEW
#       is for the owner's preview and for the Play listing of the Android
#       release with accounts, which needs the deletion address before the
#       website's own switch is flipped. Until ACCOUNTS_ON is true both pages
#       are served "noindex" (human-check always is). Their rules in
#       _site/_headers are written by this script, with each page's one
#       inline script allowed by its hash.
#     - manifest.webmanifest (web app mode only): the install manifest, so
#       "Add to Home Screen" (iPhone) and "Install" (computers) give the app
#       its name and icon and open it full screen. It names assets/icon-192.png
#       and assets/icon-512.png. No service worker.
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
#   home (the default since 18 Nov 2026, what Cloudflare publishes): kaisip.com
#     shows the marketing home page (home.html) with the Kit waitlist; the
#     beta page stays at /beta. To roll back, set the default to landing.
#   landing (the default 4 to 18 Nov 2026): kaisip.com shows the beta
#     landing page (beta.html, also at /beta) plus Privacy, Terms, Help and
#     How questions are made. The
#     web study app and every data file are not published; any other address
#     gets the not-found page (404.html, status 404).
#   app: the web study app at the top of the site (index.html + the free
#     sample). CI and the smoke tester build this too, so it stays deployable.
SITE_MODE="${SITE_MODE:-home}"
# The web study app, public since 28 Nov 2026 (owner): in home and landing
# mode it is built (app mode, with all its own checks) into this folder, so it
# lives at https://kaisip.com/app/ under the home page. Free sample only, never
# the full bank. Its rules in _headers (/app/...) give it the app's policy and
# sane caching; it is indexable. Only index.html, the manifest, the data and
# assets/ go in it: its links to the legal pages and /beta go to the top-level
# pages through _redirects (/app/privacy.html -> /privacy ...).
# SITE_NO_APP=1 leaves the folder out (CI's quick home check; the old name
# SITE_NO_PREVIEW still works). To take the web app offline again: build with
# SITE_NO_APP=1 (a Cloudflare build variable) or revert the launch pull request.
APP_DIR="app"
# The unlisted preview folder the app lived in from 4 to 28 Nov 2026. It is no
# longer built; _redirects sends /preview-u63raxyfxc/... to /app/... (same
# origin, so progress saved in the preview stays). The build checks that line.
OLD_PREVIEW_DIR="preview-u63raxyfxc"
#   home (the default since 18 Nov 2026): the marketing home page
#     (home.html, with assets/home.css, assets/home.js and assets/home/) is
#     the home page; /beta, the legal pages and the web app at /app/ stay
#     exactly as in landing mode. Its files are left out of the other two
#     modes.
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
# The waitlist form posts straight to Kit (the owner's email service). This is
# the only address it may send to; Kit then redirects back to
# /waitlist-thanks, so 'self' is allowed for that redirect. Only this one
# Kit form is allowed, not every Kit account's forms.
KIT_FORM_ACTION="https://app.kit.com/forms/10207004/subscriptions"
HOME_FORM_ACTION="form-action 'self' $KIT_FORM_ACTION"
# The two waitlist pages Kit redirects to: no script of their own, no form.
THANKS_CSP="default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; script-src https://static.cloudflareinsights.com; connect-src https://cloudflareinsights.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
HOME_CSP="default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; base-uri 'none'; $HOME_FORM_ACTION; frame-ancestors 'none'"
# The home page keeps its stricter policy: no leaked-password host there (the web app has it).
case "$HOME_CSP $THANKS_CSP" in *pwnedpasswords*) echo "build_site: the home and thanks policies must not allow api.pwnedpasswords.com" >&2; exit 1;; esac
# Nor the sign-in service or the human check: accounts belong to the web app's pages only.
case "$HOME_CSP $THANKS_CSP" in *supabase.co*|*challenges.cloudflare.com*) echo "build_site: the home and thanks policies must not allow the sign-in service or the human check" >&2; exit 1;; esac
HOME_DRAFT=""
PAGES=(index.html 404.html privacy.html terms.html support.html how-questions-are-made.html beta.html)
DATA=(data/free/cisa_d1.json data/free/cisa_d2.json data/free/cisa_d3.json data/free/cisa_d4.json data/free/cisa_d5.json data/cisa_notes.json data/mindset/principles.json data/exam/cisa_exam_guide.json data/exam/final_review_week.json)
SITE_CONFIG=(_headers _redirects)
# Inside /app/ (the outer build sets SITE_APP_FOLDER=1): the app page only.
# The legal pages, /beta and the not-found page stay at the top of the site.
if [ -n "${SITE_APP_FOLDER:-}" ]; then
  [ "$SITE_MODE" = "app" ] || { echo "build_site: SITE_APP_FOLDER needs SITE_MODE=app" >&2; exit 1; }
  PAGES=(index.html)
fi
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

# The web app's install manifest (app mode only). Relative start_url and
# scope ("./"), so it opens the folder it is served from: /app/ on kaisip.com,
# the top of the site in plain app mode. Its icons must be published files.
if [ "$SITE_MODE" = "app" ]; then
  [ -f manifest.webmanifest ] || fail "missing manifest.webmanifest"
  python3 - <<'PYMAN' || fail "manifest.webmanifest is not valid (see above)"
import json, os, sys
m = json.load(open("manifest.webmanifest"))
bad = []
if m.get("name") != "KaiSip" or m.get("short_name") != "KaiSip": bad.append("name and short_name must be KaiSip")
if m.get("start_url") != "./" or m.get("scope") != "./": bad.append('start_url and scope must be "./"')
if m.get("display") != "standalone": bad.append("display must be standalone")
icons = m.get("icons") or []
for i in icons:
    src = i.get("src", "")
    if not src.startswith("assets/") or not os.path.isfile(src): bad.append("icon not in assets/: " + src)
sizes = {i.get("sizes") for i in icons}
if not {"192x192", "512x512"} <= sizes: bad.append("needs 192x192 and 512x512 icons")
if bad:
    print("build_site: manifest.webmanifest: " + "; ".join(bad), file=sys.stderr); sys.exit(1)
PYMAN
  cp manifest.webmanifest "$OUT/manifest.webmanifest"
fi

# The Beta Desk: top level only (the web app build sets SITE_OUT), so its own
# strict rules in _headers (no-store, noindex, CSP) always apply to it.
DESK=""
if [ -z "${SITE_OUT:-}" ]; then
  DESK=1
  cp beta-desk.html "$OUT/beta-desk.html"
fi

# The account pages (see the list at the top). The switch is read from the
# page itself, so the site and the pages can never disagree.
grep -qE '^  var ACCOUNTS_ON = (true|false);$' index.html || fail "index.html: the ACCOUNTS_ON switch (var ACCOUNTS_ON = true|false;) was not found"
ACCOUNTS_ON=""
if grep -qE '^  var ACCOUNTS_ON = true;$' index.html; then ACCOUNTS_ON=1; fi
case "${SITE_ACCOUNTS_PREVIEW:-}" in ""|0|1) ;; *) fail "SITE_ACCOUNTS_PREVIEW must be 1 or unset (got: $SITE_ACCOUNTS_PREVIEW)";; esac
ACCT_PAGES=""
if [ -z "${SITE_APP_FOLDER:-}" ] && { [ -n "$ACCOUNTS_ON" ] || [ "${SITE_ACCOUNTS_PREVIEW:-}" = "1" ]; }; then
  ACCT_PAGES=1
  for f in delete-account.html human-check.html; do
    [ -f "$f" ] || fail "missing $f"
    cp "$f" "$OUT/$f"
  done
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
  draft="$(KIT_FORM_ACTION="$KIT_FORM_ACTION" python3 - <<'PYHOME'
import os, re, sys
page = open("home.html").read()
bad, draft = [], []
I = re.I | re.S
if re.search(r"<script\b(?![^>]*\ssrc\s*=)[^>]*>", page, I): bad.append("an inline <script>")
if re.search(r"<style[\s>]", page, I): bad.append("a <style> block")
if re.search(r"\sstyle\s*=", page, I): bad.append("a style attribute")
if re.search(r"\son[a-z]+\s*=", page, I): bad.append("an inline event handler")
srcs = re.findall(r"<script\b[^>]*\ssrc\s*=\s*[\"']([^\"']+)[\"']", page, I)
if srcs != ["assets/home.js"]: bad.append("scripts other than assets/home.js: %r" % srcs)
# The stylesheet's address carries a stamp of its own content, so a visitor
# whose browser kept an older copy fetches the new one with the new page
# (28 Nov 2026: new HTML met yesterday's stylesheet and the Google Play badge
# showed at its raw size). A changed stylesheet without a new stamp stops the build.
import hashlib
css_v = hashlib.sha256(open("assets/home.css", "rb").read()).hexdigest()[:10]
sheets = re.findall(r"<link\b[^>]*\brel\s*=\s*[\"']stylesheet[\"'][^>]*\bhref\s*=\s*[\"']([^\"']+)[\"']", page, I)
if sheets != ["assets/home.css?v=" + css_v]:
    bad.append("the stylesheet link must be assets/home.css?v=%s (the stamp of today's assets/home.css), found %r" % (css_v, sheets))
urls = [a or b or c for a, b, c in re.findall(r"\s(?:src|href|action|poster|formaction|data|imagesrcset|xlink:href)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))", page, I)]
for v in re.findall(r"\ssrcset\s*=\s*[\"']([^\"']*)[\"']", page, I):
    urls += [part.strip().split()[0] for part in v.split(",") if part.strip()]
if re.search(r"http-equiv\s*=\s*[\"']?refresh", page, I): bad.append("a meta refresh")
# The one form must post to Kit's form address, and nowhere else.
kit = os.environ["KIT_FORM_ACTION"]
forms = re.findall(r"<form\b[^>]*>", page, I)
for f in forms:
    act = re.search(r"\saction\s*=\s*[\"']([^\"']*)[\"']", f, I)
    methods = re.findall(r"\smethod\s*=\s*[\"']?([a-z]+)", f, I)
    if not act or act.group(1) != kit or [m.lower() for m in methods] != ["post"]:
        bad.append("a form that does not post to " + kit)
# A button may not change where or how the form is sent.
if re.search(r"\sform(?:action|method|enctype|target|novalidate)\b", page, I):
    bad.append("a button that overrides the form")
urls = [u for u in urls if u != kit]
for url in urls:
    url = url.replace("\\", "/")
    if (re.match(r"//", url) or re.match(r"[a-z][a-z0-9+.-]*:", url, re.I)) and not re.match(r"(?:https://kaisip\.com/|mailto:|https://play\.google\.com/store/apps/details\?id=com\.kaisip\.app(?:&|$))", url):
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
if any("offered free Premium access" not in b for b in blocks):
    draft.append("a quote without the reward disclosure")
# The waitlist needs its own section in the privacy policy before it goes live.
if forms and 'id="s3f"' not in open("privacy.html").read():
    draft.append("privacy.html has no waitlist section (3f)")
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
  # Kit sends new sign-ups here ("Redirect to an external page" on the form).
  cp waitlist-thanks.html "$OUT/waitlist-thanks.html"
  cp waitlist-confirmed.html "$OUT/waitlist-confirmed.html"
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
  # The scripts on the list: the plant companion, the accounts client and its
  # password word lists (fetched only when a password form opens).
  case "$f" in assets/kaisip-plant.js|assets/kaisip-cloud.js|assets/kaisip-password-words.js) cp "$f" "$OUT/$f"; continue;; esac
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

# Home mode: every file the home page and the beta page name in assets/ (the
# Google Play badge among them) must be in the site, so a picture never breaks.
if [ "$SITE_MODE" = "home" ]; then
  python3 - "$OUT" <<'PYASSETS' || fail "home.html or beta.html names an assets/ file that is not published (see above)"
import os, re, sys
out = sys.argv[1]
missing = []
for page in ("home.html", "beta.html"):
    for ref in re.findall(r"""(?:src|href)\s*=\s*["'](assets/[^"'?#]+)""", open(page).read()):
        if not os.path.isfile(os.path.join(out, ref)):
            missing.append(page + ": " + ref)
if missing:
    print("build_site: " + "; ".join(missing), file=sys.stderr); sys.exit(1)
PYASSETS
fi

# Home and landing mode: build the web app (app mode, with all its own checks)
# into /app/. Its _headers/_redirects are dropped: Cloudflare reads only the
# ones at the top of the site, which carry the /app/ rules (checked here).
APP_BUILT=""
if { [ "$SITE_MODE" = "landing" ] || [ "$SITE_MODE" = "home" ]; } && [ -z "${SITE_NO_APP:-}${SITE_NO_PREVIEW:-}" ]; then
  python3 - "$APP_DIR" "$OLD_PREVIEW_DIR" <<'PYAPP' || fail "_headers or _redirects do not fit the web app at /$APP_DIR/ (see above)"
import sys
app, old = sys.argv[1:3]
rules, cur = {}, None
for ln in open("_headers"):
    if not ln.strip() or ln.strip().startswith("#"):
        continue
    if not ln[0].isspace():
        cur = ln.strip(); rules.setdefault(cur, [])
    elif cur:
        rules[cur].append(ln.strip())
bad = []
def has(rule, text):
    return any(text in h for h in rules.get(rule, []))
for r in ("/%s/" % app, "/%s/index.html" % app, "/%s/manifest.webmanifest" % app):
    if not has(r, "Cache-Control: public, max-age=0, must-revalidate"): bad.append(r + " needs Cache-Control: public, max-age=0, must-revalidate")
for r in ("/%s/data/*" % app, "/%s/assets/*" % app):
    if not has(r, "Content-Security-Policy: default-src 'none'"): bad.append(r + " needs the strict default-src 'none' policy (as /data/* and /assets/*)")
    if not has(r, "Cache-Control: public, max-age="): bad.append(r + " needs a Cache-Control")
# One Cache-Control per address: Cloudflare joins values from rules that match
# the same path, so no catch-all rule over the whole folder may set one.
if any(r.startswith("/%s/" % app) and r.endswith("*") and r not in ("/%s/data/*" % app, "/%s/assets/*" % app) for r in rules):
    bad.append("no other wildcard rule under /%s/ (its Cache-Control would be joined with the folder rules)" % app)
if any("noindex" in h for r, hs in rules.items() if r.startswith("/%s/" % app) for h in hs):
    bad.append("the web app is public: no noindex under /%s/" % app)
if any(r.startswith("/%s/" % old) for r in rules):
    bad.append("the old preview folder's rule should be gone (it redirects now)")
# The leaked-password check (the web app's password forms) may connect to its
# one lookup host, and to it only through the app's catch-all policy.
LEAK_HOST = "https://api.pwnedpasswords.com"
app_csp = [h for h in rules.get("/*", []) if h.startswith("Content-Security-Policy:")]
connect = [d for h in app_csp for d in h.split(";") if d.strip().startswith("connect-src")]
if not connect or LEAK_HOST not in connect[0].split():
    bad.append("the /* policy's connect-src needs " + LEAK_HOST + " (the leaked-password check)")
if any(LEAK_HOST in h for r, hs in rules.items() if r != "/*" for h in hs):
    bad.append(LEAK_HOST + " belongs only in the /* policy (pages with their own policy keep it out)")
# The web app's accounts: the sign-in service by its exact address (never a
# wildcard), and Cloudflare's human check as a script and a frame.
SIGN_IN = "https://ziadnvepttlgcowvqvom.supabase.co"
HUMAN = "https://challenges.cloudflare.com"
def directive(name):
    got = [d.split() for h in app_csp for d in h.split(";") if d.strip().startswith(name + " ")]
    return got[0] if got else []
if SIGN_IN not in directive("connect-src"):
    bad.append("the /* policy's connect-src needs " + SIGN_IN + " (the web app's sign-in and sync)")
if any("*.supabase.co" in h or "supabase.co/" in h for h in app_csp):
    bad.append("the /* policy must name the sign-in service by its exact address, with no wildcard")
if HUMAN not in directive("script-src") or HUMAN not in directive("frame-src"):
    bad.append("the /* policy's script-src and frame-src need " + HUMAN + " (the human check on the sign-in forms)")
if 'var KA_HUMAN_SRC = \'' + HUMAN + '/turnstile/v0/api.js?render=explicit\';' not in open("index.html", encoding="utf-8").read():
    bad.append("index.html must load the human check only from " + HUMAN + "/turnstile/v0/api.js")
redirects = [ln.split() for ln in open("_redirects") if ln.strip() and not ln.lstrip().startswith("#")]
need = [["/%s" % old, "/%s/" % app, "301"], ["/%s/*" % old, "/%s/:splat" % app, "301"]]
for page in ("privacy", "terms", "support", "how-questions-are-made", "beta"):
    need.append(["/%s/%s.html" % (app, page), "/" + page, "301"])
for n in need:
    if n not in redirects: bad.append("_redirects needs: " + " ".join(n))
if bad:
    print("build_site: " + "; ".join(bad), file=sys.stderr); sys.exit(1)
PYAPP
  SITE_MODE=app SITE_APP_FOLDER=1 SITE_OUT="$OUT/$APP_DIR" bash "$0" > /dev/null || fail "the web app build (app mode, into /$APP_DIR/) failed"
  rm -f "$OUT/$APP_DIR/_headers" "$OUT/$APP_DIR/_redirects"
  APP_BUILT=1
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
python3 - "$OUT/_headers" "$SITE_MODE" "$HOME_CSP" "$HOME_DRAFT" "$HOME_FORM_ACTION" "$THANKS_CSP" <<'PY' || fail "_headers: the home page policy does not fit SITE_MODE=$SITE_MODE (see above)"
import re, sys, hashlib, base64
path, mode, home_csp, home_draft, home_form, thanks_csp = sys.argv[1:7]
THANKS = ["/waitlist-thanks", "/waitlist-thanks.html", "/waitlist-confirmed", "/waitlist-confirmed.html"]
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
    elif mode == "home" and cur == "/*" and s.lower().startswith("content-security-policy:"):
        # Browsers enforce every matching policy, so the site-wide one must
        # also let the home page's form reach Kit (and Kit redirect back).
        fa = re.search(r"form-action [^;]*", ln)
        if not fa:
            print("build_site: the /* policy has no form-action", file=sys.stderr); sys.exit(1)
        extra = [t for t in home_form.split()[1:] if t not in fa.group(0).split()]
        out.append(ln.replace(fa.group(0), fa.group(0) + "".join(" " + t for t in extra)))
        continue
    out.append(ln)
if mode == "home":
    # The waitlist pages exist only in home mode, so their rules do too (in
    # landing mode these addresses show 404.html, whose inline styles a joined
    # strict policy would block).
    for r in THANKS:
        out += ["", r, "  Cache-Control: public, max-age=0, must-revalidate",
                "  X-Robots-Tag: noindex, nofollow", "  Content-Security-Policy: " + thanks_csp]
if mode in ("app", "home"):
    open(path, "w").write("\n".join(out))
def strict_home(v):
    v = v.strip()
    return (v == home_csp and "default-src 'none'" in v and home_form + ";" in v
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
if mode == "home":
    site = [x for x in rules.get("/*", []) if x.lower().startswith("content-security-policy:")]
    if not site or not all(t in re.search(r"form-action [^;]*", site[0]).group(0).split() for t in home_form.split()[1:]):
        bad.append("/*: its form-action must also allow the home page's form (" + home_form + ")")
    for r in THANKS:
        got = [x.split(":", 1)[1].strip() for x in rules.get(r, []) if x.lower().startswith("content-security-policy:")]
        if got != [thanks_csp] or "unsafe" in thanks_csp or "X-Robots-Tag: noindex, nofollow" not in rules.get(r, []):
            bad.append(r + ": needs the strict waitlist page policy and noindex")
elif any(r in rules for r in THANKS):
    bad.append("the waitlist pages' rules belong to SITE_MODE=home only")
if bad:
    print("build_site: " + "; ".join(bad), file=sys.stderr)
    sys.exit(1)
PY

# The account pages: checked on every build (so they stay ready), and given
# their rules in _site/_headers only when they are published. Each page keeps
# exactly one inline script, allowed by its hash; delete-account.html holds no
# placeholder or draft wording; human-check.html loads only Cloudflare's
# widget and returns only to the app's own address.
python3 - "$OUT/_headers" "$ACCT_PAGES" "$ACCOUNTS_ON" <<'PYACCT' || fail "the account pages are not ready to publish (see above)"
import re, sys, hashlib, base64
path, publish, on = sys.argv[1:4]
bad = []
def inline(page):
    src = open(page, encoding="utf-8").read()
    scripts = re.findall(r"<script>(.*?)</script>", src, re.S)
    if len(scripts) != 1:
        bad.append("%s: expected 1 inline <script>, found %d" % (page, len(scripts)))
        return src, "'none'"
    return src, "'sha256-" + base64.b64encode(hashlib.sha256(scripts[0].encode()).digest()).decode() + "'"
d, dh = inline("delete-account.html")
h, hh = inline("human-check.html")
text = re.sub(r"<!--.*?-->|<style>.*?</style>|<script>.*?</script>|<svg.*?</svg>", "", d, flags=re.S)
if re.search(r"\[[^\]]*\]", text) or re.search(r"\bdraft\b|not in effect", text, re.I):
    bad.append("delete-account.html still holds a placeholder or draft wording")
if re.search(r"<script[^>]*\ssrc=", d, re.I) or re.search(r"\son[a-z]+\s*=", d, re.I):
    bad.append("delete-account.html may not load a script file or use an inline handler")
for need in ("mailto:certprep.support@gmail.com", 'href="app/#delete-account"', "What we delete", "What we keep"):
    if need not in d: bad.append("delete-account.html lost: " + need)
if re.search(r'<meta\s+name="robots"', d, re.I):
    bad.append("delete-account.html: no robots meta (the build's header decides, by the ACCOUNTS_ON switch)")
srcs = re.findall(r'<script[^>]*\ssrc="([^"]+)"', h)
if srcs != ["https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&amp;onload=ksHumanReady"]:
    bad.append("human-check.html may load only Cloudflare's Turnstile script: %r" % srcs)
if not re.search(r'<meta name="robots" content="noindex, nofollow">', h):
    bad.append("human-check.html lost its noindex meta tag")
if re.findall(r"kaisip://[a-z-]*", h) != ["kaisip://human-check"] * len(re.findall(r"kaisip://[a-z-]*", h)) or "kaisip://human-check" not in h:
    bad.append("human-check.html may return only to kaisip://human-check")
if "var BACK = 'kaisip://human-check';" not in h or len(re.findall(r"\bBACK\s*=[^=]", h)) != 1:
    bad.append("human-check.html: the return address must be a fixed string")
if "0x4AAAAAAFptlSqMhAvLUI8w" not in h or "0x4AAAAAAFptlSqMhAvLUI8w" not in open("index.html", encoding="utf-8").read():
    bad.append("the Turnstile site key differs between human-check.html and index.html")
if re.search(r"\son[a-z]+\s*=", h, re.I):
    bad.append("human-check.html may not use an inline handler")
if bad:
    print("build_site: " + "; ".join(bad), file=sys.stderr); sys.exit(1)
if publish:
    noindex = [] if on else ["  X-Robots-Tag: noindex, nofollow"]
    dcsp = "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; script-src " + dh + " https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    hcsp = "default-src 'none'; script-src " + hh + " https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'unsafe-inline'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    out = ["", "# The account pages (written by scripts/build_site.sh: only in a build that publishes them)."]
    for r in ("/delete-account", "/delete-account.html"):
        out += [r, "  Cache-Control: public, max-age=0, must-revalidate"] + noindex + ["  Content-Security-Policy: " + dcsp]
    for r in ("/human-check", "/human-check.html"):
        out += [r, "  Cache-Control: no-store", "  X-Robots-Tag: noindex, nofollow", "  Content-Security-Policy: " + hcsp]
    with open(path, "a", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
else:
    cur = open(path, encoding="utf-8").read()
    if re.search(r"^/(delete-account|human-check)", cur, re.M):
        print("build_site: _headers has a rule for an account page that this build does not publish", file=sys.stderr); sys.exit(1)
PYACCT

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

# The website is CISA-only (docs/WEB_LAUNCH_PLAN.md stream D): the other
# courses' free samples (data/free/crisc_*, data/free/aaia_*) are for the
# phone app and must never be published, and neither may any question of a
# course that is not on the website. Their ids are looked for in every file
# (the files themselves are also refused by the final list below).
python3 - "$OUT" <<'PY' || fail "another course's questions are in the site (the website is CISA-only)"
import os, re, sys
out = sys.argv[1]
other = re.compile(r"\b(?:crisc|aaia|cc|csoe|cism|cissp|cia[0-9]|ciac)_d[0-9]+_[0-9]+")
bad = []
for root, _, names in os.walk(out):
    for name in names:
        path = os.path.join(root, name)
        rel = os.path.relpath(path, out)
        if re.search(r"(^|/)data/free/(?!cisa_)", rel):
            bad.append(rel + ": not a CISA free-sample file")
            continue
        try:
            raw = open(path, encoding="utf-8").read()
        except (UnicodeDecodeError, OSError):
            continue
        hit = other.search(raw)
        if hit:
            bad.append(f"{rel}: {hit.group(0)}")
if bad:
    print("build_site: other courses' questions found in the site:\n  " + "\n  ".join(bad[:20]), file=sys.stderr)
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
    beta-desk.html) [ -n "$DESK" ] || fail "the Beta Desk must not be in the web app folder" ;;
    manifest.webmanifest) [ "$SITE_MODE" = "app" ] || fail "the install manifest belongs to the web app (SITE_MODE=app): $rel" ;;
    waitlist-thanks.html|waitlist-confirmed.html) [ "$SITE_MODE" = "home" ] || fail "$rel belongs to SITE_MODE=home only" ;;
    delete-account.html|human-check.html) [ -n "$ACCT_PAGES" ] || fail "$rel is published only with accounts on (ACCOUNTS_ON) or SITE_ACCOUNTS_PREVIEW=1" ;;
    data/free/cisa_d[1-5].json|data/cisa_notes.json|data/mindset/principles.json) ;;
    data/exam/cisa_exam_guide.json|data/exam/final_review_week.json) ;;
    assets/home.css|assets/home.js|assets/home/*) [ "$SITE_MODE" = "home" ] || fail "the home page's files must not be published in SITE_MODE=$SITE_MODE: $rel" ;;
    assets/*) ;;
    "$APP_DIR"/*)
      [ -n "$APP_BUILT" ] || fail "unexpected file in the site: $rel"
      # The web app folder holds the app page, its manifest, its data and assets only.
      case "${rel#"$APP_DIR"/}" in
        index.html|manifest.webmanifest|favicon.ico) ;;
        data/free/cisa_d[1-5].json|data/cisa_notes.json|data/mindset/principles.json) ;;
        data/exam/cisa_exam_guide.json|data/exam/final_review_week.json) ;;
        assets/home.css|assets/home.js|assets/home/*|assets/beta-desk.js) fail "not part of the web app: $rel" ;;
        assets/*) ;;
        *) fail "unexpected file in the web app folder: $rel" ;;
      esac ;;
    *) fail "unexpected file in the site: $rel" ;;
  esac
done < <(find "$OUT" -type f -print0)

count="$(find "$OUT" -type f | wc -l | tr -d ' ')"
size="$(du -sh "$OUT" | cut -f1)"
echo "build_site: $count files ($size) in $OUT/ (SITE_MODE=$SITE_MODE${ACCT_PAGES:+, account pages published${ACCOUNTS_ON:+ and indexable}})"
find "$OUT" -type f | sed "s|^$OUT/|  |" | sort
