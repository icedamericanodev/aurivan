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

### Optional but recommended — install the pre-commit hook

```bash
bash scripts/install_hooks.sh
```

After install, every `git commit` runs `verify_repo.sh` first and aborts the commit if it fails. This is faster feedback than the GitHub Actions CI — issues surface locally before the commit lands. Emergency bypass: `git commit --no-verify` (but expect CI to fail downstream).

### The concept queue

`data/originals/_concept_queue.yaml` is the living planning doc for the question-bank rebuild. It tracks:

- **Covered concepts** — already authored, with question IDs and TOC references
- **Queued concepts** — planned for upcoming batches, in priority order
- **Remaining unplanned** — areas that still need attention but aren't yet in a specific batch plan

Update it as part of every batch PR:

1. Move authored concepts from `queued_next` → `covered` (with the new question IDs)
2. Add new candidate concepts to `queued_next` based on remaining TOC gaps
3. Bump the `authored_total` and `authored_mix` counters in the relevant domain

This file is read by humans for cross-session continuity and by future contributors (human or AI) to know what's next without re-deriving from the JSON.

## Hard rules

1. **Never edit `data/domain{1..5}.json` directly.** They are regenerated. Edit:
   - `data/tips_overrides/d{1..5}.json` for tips, then re-run the converter
   - The source spreadsheet (kept off-repo) for new questions
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

   Note: the build-time source spreadsheet for the question bank is not
   redistributed in this repo (gitignored as `*.xlsm`). The converter
   needs it locally for new questions or wording changes; tip-only edits
   work without it once `data/domain{N}.json` already exists.

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

### AI-assisted question authoring workflow (during the rebuild phase)

When authoring batches of questions for `data/originals/d{N}.json`, follow a two-stage review:

1. **AI pre-review.** After authoring a batch and committing the draft, invoke the `cisa-exam-reviewer` subagent (defined in `.claude/agents/cisa-exam-reviewer.md`). It acts as an ISACA CISA exam developer expert and verifies:
   - Correct-answer integrity (especially that the marked answer is best, not just defensible)
   - Framework-citation precision (ISACA Standard numbers, COBIT objectives, NIST publications)
   - Distractor quality and scenario realism
   - Pedagogical fields (`key_concept`, `pre_read`, `tips`)
   - Schema compliance (via `validate_originals.py`)
2. **Apply FIX REQUIRED items** from the reviewer's report.
3. **Human spot-check** by the maintainer — final-quality review on top of the cleaned batch.
4. On approval, open the batch PR.

The pre-review agent catches the kinds of errors the maintainer was historically catching during spot-check (notably framework citation errors), letting human review focus on judgment calls rather than mechanical errors.

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
- The `Verify` GitHub Actions workflow runs `scripts/verify_repo.sh` on every PR. The PR cannot merge until it passes.
- Commit messages explain the WHY in the first line and any non-obvious reasoning in the body. Do not paste user-facing changelog copy into the commit message — keep that separation.

## Segregation of duties (SoD) policy

This is a small project where the maintainer and an AI assistant both contribute. The SoD principle the app teaches in D4 ("don't let the same actor prepare AND approve production changes") applies here too. We compensate for the missing human-only review with two layered controls:

### Control 1 — Independent CI check
`scripts/verify_repo.sh` runs on every PR via `.github/workflows/verify.yml` in an environment no contributor controls. It enforces:

- Tip + question coverage (every question has 3+ tips across all 5 domains)
- Domain weights aligned to the ISACA blueprint (D1 18%, D2 18%, D3 12%, D4 26%, D5 26%)
- ESLint `no-undef` clean on inline JS
- `APP_VERSION` matches the static header pill text

`main` is protected to require this check green before merge. This catches mechanical regressions; it does not replace human judgment.

### Control 2 — Risk-tiered merge approval

Different change classes require different approvers:

| Change class | Self-merge by AI assistant | Notes |
|---|---|---|
| Markdown / docs (README, CONTRIBUTING, CHANGELOG, SECURITY) | ✓ | Pure prose; CI still runs |
| Tip-override edits (`data/tips_overrides/d{N}.json`) and the regenerated `data/domain{N}.json` they produce | ✓ | Content authoring; CI verifies coverage |
| Comment-only or whitespace-only changes | ✓ | No behavior change |
| Version bump (`APP_VERSION`) + matching changelog entry | ✓ | Coordinated single-source-of-truth update |
| Any change to core question/answer flow (`selectAnswer`, `selectMockAnswer`, `showMockQuestion`, the shuffle helpers, the timer, grading) | **Human merge only** | Highest blast radius — every prior bug here shipped to all users |
| Data schema or storage format changes (`S` shape, `localStorage` keys, JSON structures) | **Human merge only** | Risk of corrupting saved progress |
| Security-sensitive code paths (`escapeHtml`, anything reading `localStorage`, anything posting outbound) | **Human merge only** | Privacy/XSS surface |
| New external runtime dependency, new outbound endpoint, or analytics change | **Human merge only** | Supply-chain and privacy implications |
| `.github/workflows/*` and `.claude/settings.json` | **Human merge only** | Changing the SoD controls themselves |
| Mixed PR (touches both sides) | **Human merge only** | Conservative default |

The honor system applies — the AI assistant must self-classify each PR and explicitly note in the PR description which class it belongs to and whether it can self-merge. For uncertain cases, default to human merge.

### Why these specific gates
The combination directly mirrors ISACA's compensating-controls pattern for small enterprises that can't fully separate development from operations: **independent automated check + documented review of the highest-risk classes**. CI alone misses judgment regressions; pure human-merge for everything makes a one-person project unworkable. This split matches the actual risk distribution.

## Security issues

If you spot a security vulnerability, do **not** open a public issue. See [SECURITY.md](SECURITY.md) for the disclosure flow.
