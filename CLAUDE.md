# CISA Mindset — Project Memory

A static, single-page CISA exam prep app. No build step, no framework, no
backend — just `index.html` + JSON data files served as-is. This document
captures conventions and gotchas so any Claude Code session can pick up
work without rediscovering the layout.

## Layout

| Path | Purpose |
|---|---|
| `index.html` | The entire app — HTML, CSS, and inline JS in one file (~8.7k lines) |
| `data/domain{1..5}.json` | **Generated.** Per-domain question banks. Don't edit by hand. |
| `data/tips_overrides/d{1..5}.json` | **Hand-authored.** Per-question tips, keyed by question ID. Source of truth for tips. |
| `data/cisa qa test bank.xlsm` | The original ISACA-style question bank source spreadsheet |
| `data/cisa_notes.json` | Topics-tab content (summaries, analogies, key terms per domain) |
| `data/cisa_concepts.json` | Orphan file kept in sync for hygiene; not loaded by the app |
| `data/glossary.json` | Glossary tab data |
| `scripts/convert_test_bank.py` | Idempotent converter: xlsm + tips overrides → `data/domain{N}.json` |
| `.claude/settings.json` | Permission allowlist + SessionStart validation hook |

## Hard rules

1. **Never edit `data/domain{N}.json` directly.** They are generated. Edit
   `data/tips_overrides/d{N}.json` (for tips) or the source xlsm (for
   questions), then regenerate via the converter.
2. **`DI` in `index.html` is the canonical source of truth for domain
   weights, names, colors.** Everything else (cisa_notes.json, UI copy)
   either reads from it or is overridden from it at load time.
3. **Bump `APP_VERSION` in exactly one place** (`index.html`, near the top
   constants block). The header pill and What's New "LATEST" badge both
   read from it; they cannot drift apart by design.
4. **Never strip the `data-l` attribute or letter mapping from question
   options.** Mock and practice modes share `S.currentShuffle` and
   `originalToDisplay` / `displayToOriginal` to translate display letters
   ↔ original letters. Touching this breaks both grading and the
   post-exam review.

## Common workflows

### Add or edit a tip for question d4_217

1. Edit `data/tips_overrides/d4.json` — add/update the `"d4_217": [...]` entry
   following the established voice (trap-naming + mindset/principle +
   exam-shortcut pattern; 3–4 strings per question).
2. Regenerate the domain JSON:
   ```
   python3 scripts/convert_test_bank.py 4
   ```
3. Stage both files (`d4.json` + `domain4.json`) in one commit.

### Bump version

1. Edit `const APP_VERSION` in `index.html`.
2. Edit the `<span class="bank-pill" id="versionPill">` text in the header
   to match (the JS overrides this on load, but matching the static value
   keeps view-source clean).
3. Add a new entry at the top of `showChangelog()` using `APP_VERSION` for
   the LATEST badge label; demote the previous LATEST.

### Verify everything before merging

Run from repo root:

```bash
# JSON validity + override coverage
python3 -c "
import json
counts={1:164,2:164,3:120,4:263,5:284}
for d,e in counts.items():
    ov=len([k for k in json.load(open(f'data/tips_overrides/d{d}.json')) if not k.startswith('_')])
    dom=json.load(open(f'data/domain{d}.json'))
    wt=sum(1 for q in dom['questions'] if q.get('tips') and len(q['tips'])>=3)
    qc=len(dom['questions'])
    ok='OK' if ov==e and qc==e and wt==e else 'FAIL'
    print(f'D{d}: ov={ov} qc={qc} wt={wt} (expected {e}) [{ok}]')
"

# JS lint (extracts inline scripts and runs eslint no-undef)
# See scripts/lint_inline_js.sh — invoked automatically by the SessionStart hook.
```

## Conventions

- **Tip authoring voice.** 3–4 short tips per question:
  1. Trap-naming tip (calls out the seductive wrong option by letter +
     content)
  2. Mindset/principle tip (the underlying ISACA principle being tested)
  3. Exam-day shortcut tip (pattern recognition or mnemonic)
  4. Optional 4th neutral tip
  Keep each tip ~1–3 short sentences.
- **Subtopic vocabulary.** Each domain has a tightened controlled vocab
  in `convert_test_bank.py`. Add a category there before introducing it
  in tips.
- **No new dependencies.** This app loads from `file://` and over plain
  HTTP; we keep it framework-free, no npm install, no bundler.
- **Don't re-add the `352 questions` string.** The bank size is now 995
  and may grow; use `getTotalBankSize()` in JS for any user-facing count.

## Branching + GitHub

- Feature work happens on `claude/add-cisa-questions-json-1gQSN`.
- Open PR against `main` via the GitHub MCP, then merge once verified.
- Commit messages explain the WHY in the first line and any non-obvious
  reasoning in the body. Don't mention internal symbol names in user-
  facing changelog entries (those go to the git log instead).

## What's New (changelog) style

User-facing, NOT developer-facing. Group by **New / Improved / Fixed**.
One short sentence per item, no code symbols, no line numbers. The full
technical history lives in git and the PR descriptions.
