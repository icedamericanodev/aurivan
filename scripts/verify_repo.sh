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
# The old tips_overrides/ layer and xlsm converter are retired (archive/question-bank-v8/).
python3 - <<'PY' || status=1
import json, sys
counts = {1: 220, 2: 226, 3: 156, 4: 324, 5: 353}
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

# 4a. What's New text has no em or en dashes ----------------------------------
# Every title and item in the in-app changelog (const CHANGELOG in index.html)
# is learner text: a colon, semicolon, full stop or "to" instead of a dash,
# and no question ids (d5_075). Fails on any.
printf "\nWhat's New text (no dashes, no question ids):\n"
if ! python3 - <<'PY'
import re, sys
s = open('index.html', encoding='utf-8').read()
a = s.find('const CHANGELOG = [')
b = s.find('function showChangelog()')
if a < 0 or b < a:
    print("  \u2717 could not find the CHANGELOG list in index.html"); sys.exit(1)
seg = s[a:b]
bad = []
for m in re.finditer(r"(title|text):\s*'((?:[^'\\]|\\.)*)'", seg):
    t = m.group(2)
    if re.search('[\u2013\u2014]', t) or re.search(r'\bd[1-5]_\d{3}\b', t):
        bad.append(t[:90])
if bad:
    print(f"  \u2717 {len(bad)} entries have a dash or a question id, for example:")
    for t in bad[:5]: print("    " + t)
    sys.exit(1)
print("  \u2713 clean")
PY
then
  status=1
fi

# 4b. The website's plant (assets/kaisip-plant.js) ---------------------------
# A GENERATED copy of the mobile app's plant engine and art
# (mobile/scripts/build-web-plant.mjs). Always checked here without npm: the
# file names its source modules and a hash of their text, and index.html
# loads it as ?v=<hash of the file>. With mobile/node_modules installed, the
# full rebuild-and-compare runs too.
printf "\nWebsite plant (assets/kaisip-plant.js):\n"
if python3 - <<'PY'
import hashlib, re, sys
js = open('assets/kaisip-plant.js', 'rb').read()
text = js.decode('utf8')
ids = sorted(set(re.findall(r'^  defs\["([^"]+)"\] = function', text, re.M)))
h = hashlib.sha256()
for i in ids:
    try:
        src = open('mobile/' + i, 'rb').read()
    except OSError:
        print(f"  ✗ source mobile/{i} is missing"); sys.exit(1)
    h.update(i.encode() + b"\n" + src + b"\n")
want = re.search(r'api\.sourceHash = "([0-9a-f]+)"', text)
if not ids or not want or want.group(1) != h.hexdigest()[:16]:
    print("  ✗ out of date with the mobile plant sources: cd mobile && npm run web-plant"); sys.exit(1)
ref = re.findall(r'assets/kaisip-plant\.js\?v=([0-9a-f]*)', open('index.html').read())
if not ref or any(r != hashlib.sha256(js).hexdigest()[:10] for r in ref):
    print("  ✗ index.html does not load this build (?v=): cd mobile && npm run web-plant"); sys.exit(1)
print(f"  ✓ matches its {len(ids)} source modules; index.html loads this build")
PY
then
  if [ -d mobile/node_modules/typescript ] && command -v node >/dev/null 2>&1; then
    (cd mobile && node scripts/build-web-plant.mjs --check) | sed 's/^/  /' || status=1
  fi
else
  status=1
fi

# 4c. The website's cloud client (assets/kaisip-cloud.js) ---------------------
# Accounts beta §1.1: the GENERATED sign-in and sync client, compiled from
# mobile/src/webcloud and the app's own sync engine. Checked without npm like
# the plant (its source modules and their hash), plus the version-stamp rule:
# the bundle stamps pushes with mobile/LIVE_VERSION (the app live on Google
# Play) and its store versions (mobile/LIVE_STORE_VERSIONS.json), and must
# never be newer, or every phone would pause sync. With
# mobile/node_modules installed, the rebuild-and-compare above covers it too.
printf "\nWebsite cloud client (assets/kaisip-cloud.js):\n"
if ! python3 - <<'PY'
import hashlib, json, re, sys
try:
    text = open('assets/kaisip-cloud.js', 'rb').read().decode('utf8')
except OSError:
    print("  ✗ assets/kaisip-cloud.js is missing: cd mobile && npm run web-plant"); sys.exit(1)
ids = sorted(set(re.findall(r'^  defs\["([^"]+)"\] = function', text, re.M)))
h = hashlib.sha256()
for i in ids:
    try:
        src = open('mobile/' + i, 'rb').read()
    except OSError:
        print(f"  ✗ source mobile/{i} is missing"); sys.exit(1)
    h.update(i.encode() + b"\n" + src + b"\n")
want = re.search(r'api\.sourceHash = "([0-9a-f]+)"', text)
if not ids or not want or want.group(1) != h.hexdigest()[:16]:
    print("  ✗ out of date with the mobile sync sources: cd mobile && npm run web-plant"); sys.exit(1)
semver = re.compile(r'^\d{1,3}\.\d{1,3}\.\d{1,3}$')
def key(v): return tuple(int(x) for x in v.split('.'))
live = open('mobile/LIVE_VERSION').read().strip()
app = json.load(open('mobile/app.json'))['expo']['version']
stamp = re.search(r'\n  var liveVersion = "([^"]*)";\n', text)
if not semver.match(live):
    print(f"  ✗ mobile/LIVE_VERSION must be one x.y.z line, found {live!r}"); sys.exit(1)
if semver.match(app) and key(live) > key(app):
    print(f"  ✗ mobile/LIVE_VERSION {live} is ahead of app.json's {app}"); sys.exit(1)
if not stamp or not semver.match(stamp.group(1)) or key(stamp.group(1)) > key(live):
    print(f"  ✗ the bundle's version stamp is newer than mobile/LIVE_VERSION ({live}): cd mobile && npm run web-plant"); sys.exit(1)
if stamp.group(1) != live:
    print(f"  ✗ the bundle stamps {stamp.group(1)}, mobile/LIVE_VERSION says {live}: cd mobile && npm run web-plant"); sys.exit(1)
# The store versions: stamped from mobile/LIVE_STORE_VERSIONS.json, which must equal the engine's own.
try:
    stores = json.load(open('mobile/LIVE_STORE_VERSIONS.json'))
    stores = {k: int(stores[k]) for k in ('progress', 'settings')}
except Exception:
    print("  ✗ mobile/LIVE_STORE_VERSIONS.json must be { \"progress\": n, \"settings\": n }"); sys.exit(1)
mig = open('mobile/src/engine/saveMigrations.ts').read()
for k, name in (('progress', 'PROGRESS_VERSION'), ('settings', 'SETTINGS_VERSION')):
    m = re.search(r'export const ' + name + r' = (\d+);', mig)
    if not m or int(m.group(1)) != stores[k]:
        print(f"  ✗ the engine's {name} ({m.group(1) if m else '?'}) is not the Play release's ({stores[k]}, mobile/LIVE_STORE_VERSIONS.json)"); sys.exit(1)
bs = re.search(r'\n  var liveStoreVersions = (\{[^\n]*\});\n', text)
if not bs or json.loads(bs.group(1)) != stores:
    print("  ✗ the bundle's store-version stamp is not mobile/LIVE_STORE_VERSIONS.json: cd mobile && npm run web-plant"); sys.exit(1)
print(f"  ✓ matches its {len(ids)} source modules; stamps pushes with LIVE_VERSION {live}, stores {stores['progress']}/{stores['settings']}")
PY
then
  status=1
fi

# 4d. The website's serif (KaiSip Serif, FB-006 and FB-014) -------------------
# Every public page must load KaiSip Serif (Fraunces with a conventional f and
# J, the phone app's font) for upright serif text, never plain Fraunces: the
# owner saw the old f on the website after it was fixed on the phone. Italic
# stays plain Fraunces. Always checked. With fontTools and brotli installed
# (dev-only: pip install fonttools brotli), the .woff2 files are also compared
# with the phone's .ttf files, glyph for glyph.
printf "\nWebsite serif (KaiSip Serif on every page):\n"
if ! python3 - <<'PY'
import glob, os, re, sys
pages = ['index.html', 'beta.html', 'beta-desk.html', 'privacy.html', 'terms.html', 'support.html',
         'how-questions-are-made.html', 'assets/home.css'] + sorted(glob.glob('docs/legal/cloud/*.html'))
bad = []
for p in pages:
    css = open(p, encoding='utf-8').read()
    faces = [f for f in re.findall(r'@font-face\s*{[^}]*}', css) if re.search('Fraunces|KaiSip', f)]
    if not faces:
        bad.append(f"{p}: no serif @font-face found")
    for f in faces:
        italic = re.search(r'font-style:\s*italic', f) is not None
        m = re.search(r'fonts/([A-Za-z0-9_]+)\.woff2', f)
        name = m.group(1) if m else '?'
        ok = name == 'Fraunces_400Regular_Italic' if italic else name in ('KaiSipSerif_400Regular', 'KaiSipSerif_500Medium')
        if not ok or not re.search(r"font-family:\s*['\"]KaiSip Serif['\"]", f):
            bad.append(f"{p}: {'italic' if italic else 'upright'} serif loads {name}.woff2 (want {'Fraunces_400Regular_Italic' if italic else 'KaiSipSerif_*'}, family 'KaiSip Serif')")
        if not os.path.exists(f'assets/fonts/{name}.woff2'):
            bad.append(f"{p}: assets/fonts/{name}.woff2 is missing")
for lic in ('OFL-Fraunces.txt', 'OFL-Literata.txt'):
    if not os.path.exists('assets/fonts/' + lic):
        bad.append(f"assets/fonts/{lic} is missing (the licence must travel with the font)")
if bad:
    print("  ✗ " + "\n  ✗ ".join(bad)); sys.exit(1)
print(f"  ✓ {len(pages)} pages load KaiSip Serif for upright text; licences present")
PY
then
  status=1
fi
if python3 -c 'import fontTools, brotli' >/dev/null 2>&1; then
  python3 mobile/scripts/fonts/build_kaisip_serif.py --check-web 2>/dev/null | sed 's/^/  /'
  [ "${PIPESTATUS[0]}" -eq 0 ] || status=1
else
  printf "  (glyph-for-glyph check of the .woff2 files skipped: pip install fonttools brotli)\n"
fi

# 5. Originals (rebuild content) schema validation --------------------------
# The bank lives under data/originals/ and is validated against the schema
# in docs/content/QUESTION_SCHEMA.md. Empty banks are valid (the
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

# 5z. Free sample (web v12.50) -----------------------------------------------
# kaisip.com publishes only the CISA free sample in data/free/; the public
# phone build bundles only the CISA, CRISC and AAIA samples (web launch plan,
# stream D). Each course's sample must match its bank, follow its own plan's
# rules (CISA and AAIA: every notes subtopic; CRISC: every outline area, and
# the free mini mock per domain), and never lose an id (each list only grows).
printf "\nFree samples (data/free: CISA on the website; CISA, CRISC and AAIA in the public phone build):\n"
if ! python3 scripts/build_free_sample.py --check; then
  status=1
fi

# 6a. Longest-option tell ----------------------------------------------------
# Per domain, how often "always pick the longest option" (ties shared) would
# win. Chance is 25%; the target is about 20%. Outside 15–24% fails.
printf "\n"
if ! python3 scripts/check_longest_option.py; then
  status=1
fi

# 6a1. Readability ratchet (FB-013) -------------------------------------------
# Counts packed stems (semicolons, stacked possessives) per bank; fails only if
# a count rises above scripts/readability_baseline.json.
printf "\nReadability (packed stems may only go down):\n"
if ! python3 scripts/check_readability.py; then
  status=1
fi

# 6a2. AAIA course (data/aaia/) ---------------------------------------------
# The paid AAIA pack: item style (lint_exam_style_v2 --file, exit 1 = error),
# notes against the AAIA outline and bank, and the bank checks (citations in
# the AAIA library, area coverage, length tell, notes links).
if [ -d data/aaia/originals ]; then
  printf "\n"
  python3 scripts/check_aaia_bank.py || status=1
  for f in data/aaia/originals/d[0-9].json; do
    out=$(python3 scripts/lint_exam_style_v2.py --file "$f"); rc=$?
    printf "  %s: %s\n" "$(basename "$f")" "$(printf '%s\n' "$out" | tail -1)"
    if [ "$rc" -eq 1 ]; then printf '%s\n' "$out" | grep '^ERROR' | sed 's/^/    /'; status=1; fi
  done
  for f in data/aaia/notes/d[0-9].json; do
    out=$(python3 scripts/lint_notes.py "$f" --outline docs/content/AAIA_BLUEPRINT.md --bank data/aaia/originals); rc=$?
    printf "  notes %s: %s\n" "$(basename "$f")" "$(printf '%s\n' "$out" | tail -1)"
    if [ "$rc" -ne 0 ]; then printf '%s\n' "$out" | grep '^ERROR' | sed 's/^/    /'; status=1; fi
  done
  # Principles, exam guide and final review week (each "skipped" until written),
  # then the app's own pack builders run on every AAIA file (dry run, temp folder).
  out=$(python3 scripts/lint_principles.py --cert aaia); rc=$?
  printf "  principles: %s\n" "$(printf '%s\n' "$out" | tail -1 | sed 's/^ *//; s/^Principles lint (aaia): //')"
  if [ "$rc" -ne 0 ]; then printf '%s\n' "$out" | grep '✗' | sed 's/^ */    /'; status=1; fi
  out=$(python3 scripts/lint_exam_guide.py --cert aaia); rc=$?
  printf '%s\n' "$out" | grep 'skipped' | sed 's/^ */  exam guide: /'
  if [ "$rc" -ne 0 ]; then printf '%s\n' "$out" | grep '✗' | sed 's/^ */    /'; status=1;
  elif printf '%s\n' "$out" | grep -q '✓'; then printf "  exam guide: %s\n" "$(printf '%s\n' "$out" | tail -1 | sed 's/^ *//')"; fi
  if command -v node >/dev/null 2>&1; then
    node scripts/aaia_pack_dry_run.cjs || status=1
  else
    printf "  AAIA pack dry run: skipped (node not found)\n"
  fi
fi

# 6b. Mindset principles (data/mindset/principles.json) ----------------------
# Schema, ids, practice-question and subtopic cross-references, word limits,
# family/domain coverage, legacy id mapping. Errors fail the check; warnings
# (e.g. a principle with fewer than 3 practice questions) are reported only.
printf "\n"
if ! python3 scripts/lint_principles.py; then
  status=1
fi

# 6c. Exam guide + final review week (data/exam/*.json) ---------------------
# Schema, https sources, as_of dates, word limits, domain weights against DI
# and mobile, principle ids, note codes, app action kinds, US spelling, no
# bank-size statements. Errors fail the check; warnings (e.g. stale facts)
# are reported only.
printf "\n"
if ! python3 scripts/lint_exam_guide.py; then
  status=1
fi

# 6c-crisc. CRISC course (paid pack, not wired into the apps yet) ---------
# The same gates the CRISC reviews use: questions, notes (against the CRISC
# outline and bank), principles, exam guide + final review week, and the
# notes' "Practice this concept" links. Errors fail the check.
printf "\nCRISC course (data/crisc):\n"
crisc_ok=1
for d in 1 2 3 4; do
  out=$(python3 scripts/lint_exam_style_v2.py --file "data/crisc/originals/d$d.json" | tail -1)
  printf "  D%s questions: %s\n" "$d" "$out"
  case "$out" in *" 0 error(s)"*) ;; *) crisc_ok=0 ;; esac
  out=$(python3 scripts/lint_notes.py "data/crisc/notes/d$d.json" --outline docs/content/CRISC_BLUEPRINT.md --bank data/crisc/originals | tail -1)
  printf "  D%s notes: %s\n" "$d" "$out"
  case "$out" in *" 0 error(s)"*) ;; *) crisc_ok=0 ;; esac
done
python3 scripts/lint_principles.py data/crisc/mindset/principles.json --notes data/crisc/notes --bank data/crisc/originals >/dev/null || crisc_ok=0
python3 scripts/lint_exam_guide.py --cert crisc data/crisc/exam/crisc_exam_guide.json >/dev/null || crisc_ok=0
python3 data/crisc/tools/sync_practice_ids.py --check >/dev/null || { echo "  $FAIL practice links out of date: python3 data/crisc/tools/sync_practice_ids.py"; crisc_ok=0; }
python3 - <<'PY' || crisc_ok=0
import json, sys
g = json.load(open("data/crisc/glossary.json"))
need = {"id", "term", "acronym", "def", "scopeNotes", "domain", "category"}
bad = [e.get("id") for e in g if not need <= set(e) or e["domain"] not in range(5) or not e["def"].strip()]
ids, terms = [e["id"] for e in g], [e["term"].lower() for e in g]
if bad or len(set(ids)) != len(ids) or len(set(terms)) != len(terms):
    print(f"  ✗ glossary: {len(bad)} bad entries, duplicate ids or terms")
    sys.exit(1)
PY
if command -v node >/dev/null 2>&1; then
  node scripts/crisc_pack_dry_run.cjs | sed 's/^CRISC pack dry run/  App pack dry run/' || crisc_ok=0
fi
if [ $crisc_ok -eq 1 ]; then
  echo "  $OK principles, exam guide, final review week, glossary, practice links and app pack clean"
else
  echo "  $FAIL CRISC content has errors (run the commands above)"
  status=1
fi

# 6c-cia. CIA course (four paid packs, not wired into the apps yet) --------
# The harness first (it plants one fault per rule and fails if any gets
# through), then every CIA gate on whatever content exists. The lines are
# printed by data/cia/tools/run_gates.sh, so the harness can prove them on its
# fixture: the last line says so when a gate did not really run (the
# originality gate needs The IIA's text, which is never stored in the repo;
# rounds and releases run it with --fetch --require), a failing tool's problem
# lines are shown, and dated-fact warnings are counted.
# Tools: data/cia/tools/README.md.
if [ -d data/cia/tools ]; then
  printf "\n"
  bash data/cia/tools/run_gates.sh || status=1
fi

# 6d. Web <-> mobile design-token parity (premium pass §0) -------------------
# The web dark tokens that the premium pass moved (raised, wrongBg, the
# section gap) must match mobile/src/theme/tokens.ts. A pair the web has moved
# ahead of mobile is reported as pending (see PENDING in the script).
printf "\n"
if ! python3 scripts/check_token_parity.py; then
  status=1
fi

# 6e. The answer screen's pick-aware coach line (web v12.47) ---------------
# Runs the app's own parser (tipOptionLetters, pickCoachKind and
# verdictCoachLine, taken from index.html as they ship) over every wrong pick
# in the whole bank and prints how many questions and picks get each line.
# The pick-aware lines only fire when the tips name the letters exactly, so
# a tip the parser cannot read falls back to the usual line, never a guess.
# Fails only if the parser cannot be loaded or throws.
printf "\nPick-aware coach line (every wrong pick, whole bank):\n"
if command -v node >/dev/null 2>&1; then
  node - <<'JS' || status=1
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
function grab(re, endTest) {
  const i = lines.findIndex(l => re.test(l));
  if (i < 0) throw new Error('not found in index.html: ' + re);
  let j = i;
  while (j < lines.length && !endTest(lines[j], j === i)) j++;
  return lines.slice(i, j + 1).join('\n');
}
const fn = n => grab(new RegExp('^function ' + n + '\\('), l => /^}\s*$/.test(l));
const v = n => grab(new RegExp('^var ' + n + ' = '), l => /;\s*$/.test(l.trim()));
const src = ['DISPLAY_LETTERS', 'LETTER_LABEL_WORDS', 'LETTER_VERBISH_AFTER_A', 'LETTER_CHOICE_WORDS', 'IMPLEMENTER_WORDS', 'AUDITOR_WORDS'].map(v)
  .concat(['originalToDisplay', 'isOptionLetterRef', 'tipOptionLetters', 'qTipByLabel', 'pickCoachKind', 'runnerUpLetter', 'detectMindsetIssue', 'verdictCoachLine'].map(fn))
  .join('\n');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src, ctx);
const LINES = [
  ['elim', /^Your pick, [A-D], is one of the two to rule out first\.$/, 'Your pick, X, is one of the two to rule out first.'],
  ['final', /^You reached the final two: [A-D] against [A-D]\.$/, 'You reached the final two: X against Y.'],
  ['runner', /closest wrong choice/, 'You picked the closest wrong choice. That’s the trap.'],
  ['mindset', /implementer/, 'That’s the implementer’s move. Auditors assess and report.'],
  ['usual', /^Here’s the idea to take with you\.$/, 'Here’s the idea to take with you.']
];
const picks = {}, qs = {};
LINES.forEach(l => { picks[l[0]] = 0; qs[l[0]] = 0; });
let nq = 0, np = 0, odd = 0, elimTwo = 0, finalTwo = 0;
for (const d of [1, 2, 3, 4, 5]) {
  for (const q of JSON.parse(fs.readFileSync(`data/domain${d}.json`, 'utf8')).questions) {
    nq++;
    const el = ctx.tipOptionLetters(ctx.qTipByLabel(q, 'Eliminate'));
    const fi = ctx.tipOptionLetters(ctx.qTipByLabel(q, 'Final two'));
    if (el.length === 2 && el.indexOf(q.correct) < 0) elimTwo++;
    if (fi.length === 2 && fi.indexOf(q.correct) >= 0) finalTwo++;
    const got = {};
    for (const pick of ['A', 'B', 'C', 'D']) {
      if (pick === q.correct || !(q.options || {})[pick]) continue;
      np++;
      const line = ctx.verdictCoachLine(q, false, false, pick, false, ['A', 'B', 'C', 'D']);
      const hit = LINES.find(l => l[1].test(line));
      if (!hit) { odd++; continue; }
      picks[hit[0]]++;
      got[hit[0]] = 1;
    }
    Object.keys(got).forEach(k => qs[k]++);
  }
}
console.log(`  ✓ ${nq} questions, ${np} wrong picks`);
LINES.forEach(l => console.log(`    ${String(qs[l[0]]).padStart(5)} questions · ${String(picks[l[0]]).padStart(5)} picks  ${l[2]}`));
console.log(`  Eliminate tips that name exactly two wrong options: ${elimTwo} of ${nq}`);
console.log(`  Final two tips that name exactly the best and one other: ${finalTwo} of ${nq}`);
if (odd) { console.log(`  ✗ ${odd} picks got a line the check does not know`); process.exit(1); }
JS
else
  printf "  skipped (node not available)\n"
fi

# 7. Accessibility (pa11y, WCAG AA) -----------------------------------------
# pa11y runs WCAG AA against a served URL. We skip silently if node/npx is
# absent or no local server is running on port 8000 — the maintainer can run
# it on demand: `python3 -m http.server 8000 &` then re-run verify_repo.sh.
# Strict (fail) mode triggers only if explicitly enabled via $STRICT_A11Y.
printf "\nAccessibility (pa11y WCAG AA):\n"
if command -v node >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null | grep -q "200"; then
    # Capture output, count failures by severity
    if pa11y_out=$(npx --yes pa11y@8 --reporter csv --standard WCAG2AA http://localhost:8000/ 2>&1); then
      a11y_errors=$(echo "$pa11y_out" | grep -c '^"error"' || true)
      a11y_warnings=$(echo "$pa11y_out" | grep -c '^"warning"' || true)
      if [ "$a11y_errors" -eq 0 ]; then
        printf "  ${OK} 0 errors / %s warnings (WCAG 2.1 AA)\n" "$a11y_warnings"
      else
        printf "  ${FAIL} %s errors / %s warnings — run pa11y locally for details\n" "$a11y_errors" "$a11y_warnings"
        if [ -n "${STRICT_A11Y:-}" ]; then status=1; fi
      fi
    else
      printf "  pa11y failed to run (network? install issue?) — skipped\n"
    fi
  else
    printf "  skipped (no local server on :8000 — start with: python3 -m http.server 8000 &)\n"
  fi
else
  printf "  skipped (node/npx not available)\n"
fi

# 8. Lighthouse (performance + a11y + best-practices + SEO) -----------------
# Lighthouse CI runs a headless Chrome audit. Same skip rules as pa11y.
# Outputs a one-line score summary; the JSON/HTML reports stay in /tmp.
# Disabled by default (slow ~30s) — enable with $RUN_LIGHTHOUSE=1.
if [ -n "${RUN_LIGHTHOUSE:-}" ]; then
  printf "\nLighthouse (perf + a11y + best-practices + SEO):\n"
  if command -v node >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null | grep -q "200"; then
      lh_out=$(npx --yes lighthouse@12 http://localhost:8000/ \
        --quiet --chrome-flags="--headless --no-sandbox" \
        --output=json --output-path=/tmp/_lighthouse.json 2>&1 || true)
      if [ -f /tmp/_lighthouse.json ]; then
        # Extract category scores via python (avoid jq dependency)
        python3 - <<'PY'
import json, sys
try:
    data = json.load(open('/tmp/_lighthouse.json'))
    cats = data.get('categories', {})
    for k in ('performance','accessibility','best-practices','seo'):
        c = cats.get(k, {})
        score = int((c.get('score') or 0) * 100)
        mark = "✓" if score >= 90 else "○"
        print(f"  {mark} {k:18s} {score:>3d}/100")
except Exception as e:
    print(f"  Lighthouse output parse failed: {e}")
PY
      else
        printf "  Lighthouse failed to produce JSON — check logs\n"
      fi
    else
      printf "  skipped (no local server on :8000)\n"
    fi
  else
    printf "  skipped (node/npx not available)\n"
  fi
fi

# Beta Desk sign-in regressions (no network or real accounts).
if command -v node >/dev/null 2>&1; then
  node --test scripts/beta_desk/sign_in.test.cjs || status=1
else
  printf '\nBeta Desk sign-in tests skipped (node not available)\n'
fi

# Summary --------------------------------------------------------------------
echo
if [ $status -eq 0 ]; then
  echo "Repo health: ALL CHECKS PASSED"
else
  echo "Repo health: ISSUES FOUND — review output above"
fi

exit $status

