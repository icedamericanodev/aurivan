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

# 6a. Longest-option tell ----------------------------------------------------
# Per domain, how often "always pick the longest option" (ties shared) would
# win. Chance is 25%; the target is about 20%. Outside 15–24% fails.
printf "\n"
if ! python3 scripts/check_longest_option.py; then
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

# Summary --------------------------------------------------------------------
echo
if [ $status -eq 0 ]; then
  echo "Repo health: ALL CHECKS PASSED"
else
  echo "Repo health: ISSUES FOUND — review output above"
fi

exit $status
