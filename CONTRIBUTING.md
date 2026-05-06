# Contributing to CISA Mindset

Thanks for caring enough to help. This document covers the practical bits — how to set up locally, the conventions to follow, and the most common workflows. For an AI-assistant-oriented version of the same information, see [CLAUDE.md](CLAUDE.md).

## Quick start

```bash
git clone https://github.com/laladev-ai/cisa-prep.git
cd cisa-prep
python3 -m http.server 8000
# open http://localhost:8000/
```

There's no `npm install`. The app is a single `index.html` plus static JSON.

To run the repo health check (verifies tip coverage, domain weights, JS lint, version consistency):

```bash
bash scripts/verify_repo.sh
```

If you have Claude Code on the web set up for this repo, this runs automatically on every session start via the `SessionStart` hook in `.claude/settings.json`.

## Hard rules

1. **Never edit `data/domain{1..5}.json` directly.** They are regenerated. Edit:
   - `data/tips_overrides/d{1..5}.json` for tips, then re-run the converter
   - The source xlsm for new questions
2. **`DI` in `index.html` is the canonical source of truth for domain weights, names, and colors.** Never hardcode weight strings — read `DI[d].weight`. The Topics renderer overrides `cisa_notes.json` weights with `DI` values at load time so drift is impossible.
3. **Single source of truth for the version: `APP_VERSION` in `index.html`.** The header pill text, the LATEST badge in What's New, and the static pill HTML all read from this constant. `verify_repo.sh` enforces consistency.
4. **No new runtime dependencies.** This app loads from `file://` and over plain HTTP. We keep it framework-free, no bundler, no transpile. Dev-only tools (ESLint via `npx`) are fine.
5. **No user-facing changelog jargon.** What's New entries should not mention code symbols, line numbers, or internals. See the style note below.

## Common workflows

### Add or edit a tip

1. Edit `data/tips_overrides/d{N}.json`. Each entry is keyed by question ID and is an array of 3–4 short tips:

   ```json
   "d4_217": [
     "Trap is B 'X' — Y.",
     "Trap is C 'X' — Y.",
     "<mindset/principle tip>",
     "<exam-day shortcut tip>"
   ]
   ```

2. Regenerate the domain bank:

   ```bash
   python3 scripts/convert_test_bank.py 4
   ```

3. Stage **both** the override file and the regenerated `data/domain4.json` in the same commit.

### Bump the version

1. Edit `const APP_VERSION` in `index.html` (one place).
2. Edit the static `<span class="bank-pill" id="versionPill">` text in the header to match (the JS overrides this on load, but matching the static markup keeps view-source clean).
3. Add a new entry at the top of the `CHANGELOG` array in `index.html` using the New / Improved / Fixed categories. The first entry automatically gets the `LATEST` badge.
4. Mirror the same entry in [CHANGELOG.md](CHANGELOG.md) so the GitHub repo history stays in sync.

### Verify before pushing

```bash
bash scripts/verify_repo.sh
```

You should see `Repo health: ALL CHECKS PASSED`. If not, fix what it tells you to fix before opening a PR.

## Code style

- **One file, vanilla JS.** No frameworks, no transpile. ES2020 syntax is fine.
- **`var` over `let`/`const` for new code in legacy regions.** The existing inline JS is `var`-heavy; match it for consistency unless you're starting a new top-level constant.
- **No semicolons-optional shenanigans.** Always semicolons.
- **Comments explain WHY, not WHAT.** If a comment just restates the code, delete it.
- **Keep the inline JS lint-clean** (`bash scripts/lint_inline_js.sh`). The only allowed `no-undef` global is the standard GA `dataLayer` stub.

## What's New (changelog) style

User-facing — written for CISA candidates, not developers.

**Do:**
- One short sentence per item
- Group with category chips: `cat: 'new' | 'improved' | 'fixed'`
- Lead with what the user can now do or notice
- Stay product-flavored ("Mock exam timer stays continuous between questions")

**Don't:**
- Mention internal symbol names (`selectMockAnswer`, `originalToDisplay`, etc.)
- Include line numbers, commit SHAs, file names
- Describe the implementation
- Use words like "refactor," "ESLint," "lint," "DOM," "regex"

The full technical history lives in git and PR descriptions; What's New is for learners.

## Branching and PRs

- Feature work happens on `claude/add-cisa-questions-json-1gQSN` (this is the long-lived working branch).
- Open a PR against `main`.
- After review and a green `verify_repo.sh`, merge with the standard merge commit.
- Commit messages explain the WHY in the first line and any non-obvious reasoning in the body. Do not paste user-facing changelog copy into the commit message — keep that separation.

## Security issues

If you spot a security vulnerability, do **not** open a public issue. See [SECURITY.md](SECURITY.md) for the disclosure flow.
