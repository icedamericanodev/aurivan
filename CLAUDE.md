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
| `data/cisa_notes.json` | Topics-tab content (summaries, analogies, key terms per domain) |
| `data/cisa_concepts.json` | Orphan file kept in sync for hygiene; not loaded by the app |
| `data/glossary.json` | Glossary tab data |
| `scripts/convert_test_bank.py` | Idempotent converter: xlsm + tips overrides → `data/domain{N}.json` |
| `scripts/verify_repo.sh` | Repo health check (run via the SessionStart hook) |
| `scripts/lint_exam_style_v2.py` | Harness for exam-style v2 questions (short stems, Eliminate / Final two / Exam cue tips). Rules: `docs/content/EXAM_STYLE_V2.md` |
| `scripts/print_alignment.py` | Prints v2 options beside their explanations and tips for the alignment read (catches option texts under the wrong letters) |
| `scripts/lint_inline_js.sh` | Extracts inline `<script>` blocks from `index.html` and runs ESLint `no-undef` |
| `.claude/settings.json` | Permission allowlist + SessionStart validation hook |
| `CONTRIBUTING.md` | Human-facing version of this file (workflows, code style, PR rules) |
| `CHANGELOG.md` | Canonical user-facing release history (mirrors the in-app What's New) |
| `SECURITY.md` | Disclosure policy + privacy summary |
| `mobile/` | **Expo (React Native) iOS + Android app.** Own `package.json`, tests and `mobile/CLAUDE.md`. Reads questions from `data/domain*.json` via `mobile/scripts/build-content.mjs` |
| `docs/mobile/ARCHITECTURE.md` | Mobile tech-stack decision, architecture, roadmap, store-launch plan |
| `supabase/migrations/` | Phase 3 database schema (accounts + sync). Written, not yet applied |

## Hard rules

1. **Never edit `data/domain{N}.json` directly.** They are generated. Edit
   `data/tips_overrides/d{N}.json` for tips, then regenerate via
   `scripts/convert_test_bank.py`. The source spreadsheet is not in this
   repo (gitignored as `*.xlsm`); contact the maintainer if you need it.
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
5. **Every PR that ships a user-visible change MUST bump `APP_VERSION` AND
   add a What's New entry in the same commit.** No exceptions.
   - "User-visible" = anything a learner could notice: new feature, UI
     change, copy edit, bug fix, content change, performance boost,
     a11y improvement.
   - Internal-only changes (scripts, agents, CI, docs, dev tooling,
     refactors with no behavior change) do NOT require a bump.
   - Versioning: `vMAJOR.MINOR.PATCH` semver-ish — three levels.
     - **MAJOR** bump (e.g. `v10.x` → `v11`) = a significant / massive
       change: a full redesign, a full question-bank rebuild, a new
       certification track, or an architecture change. Rare. Resets MINOR
       and PATCH to 0.
     - **MINOR** bump (e.g. `v11` → `v11.1`) = a new feature, a UI uplift,
       a content release, or a notable bug fix / cluster of fixes shipped
       together. This is the common bump. Resets PATCH to 0.
     - **PATCH** bump (e.g. `v11.1` → `v11.1.1`) = a single small, isolated
       correction shipped on its own — one minor bug fix, a copy/typo fix,
       or a small style / accessibility tweak — with no new feature and no
       new content. (Standard semver: PATCH = backwards-compatible fixes.)
       When unsure between MINOR and PATCH, ask: does this add or change a
       capability a learner would call "new"? Yes → MINOR; no → PATCH.
     - Omit trailing `.0`: write `v11` and `v11.1`, not `v11.0.0` /
       `v11.1.0`; PATCH releases always show all three (`v11.1.1`). Never
       skip a level.
   - The bump-checklist (see "Bump version" workflow below) MUST be
     completed before opening the PR. Reviewers will reject PRs that
     ship behavior but leave `APP_VERSION` stale.

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

## UI/UX review workflow (added v9.0)

After any commit that touches `index.html` (styles, components, copy), invoke
`cisa-ux-reviewer` BEFORE merging. It complements the content reviewers:

| Agent | Scope | When to invoke |
|---|---|---|
| `cisa-exam-reviewer` | Question content, distractors, citations, scenario realism | After authoring a batch of questions |
| `cisa-pedagogy-checker` | Wrong-answer explanations + tips teach the principle | After authoring a batch of questions |
| `cisa-ux-reviewer` | Design tokens, brand consistency, WCAG AA, mobile reflow, IA | After UI-touching commits |
| `cisa-citation-*` | Fabricated / mis-attributed framework_ref | At Stage 2.5 of authoring |

The UX reviewer reads `design-notes/MASTER_HANDOFF.md` as locked source of
truth and flags deviations from the variant selections table. Findings are
tiered HARD ERROR / PRECISION / OBSERVATION — apply HARD ERRORS inline
before merge.

## Local quality gates beyond schema/lint

`scripts/verify_repo.sh` (SessionStart hook) runs these in addition to the
schema/lint checks:

- **JS no-undef lint** — always on (skipped if node/npx missing)
- **Accessibility (pa11y, WCAG AA)** — runs only if a local server is on
  http://localhost:8000. To exercise it, run `python3 -m http.server 8000 &`
  before the hook. Default is non-blocking; set `STRICT_A11Y=1` to fail
  on a11y errors.
- **Lighthouse (perf + a11y + best-practices + SEO)** — opt-in (slow ~30s).
  Run with `RUN_LIGHTHOUSE=1 bash scripts/verify_repo.sh`. Same local-server
  requirement as pa11y.

The maintainer pattern for a full pre-merge check:
```bash
python3 -m http.server 8000 &
RUN_LIGHTHOUSE=1 STRICT_A11Y=1 bash scripts/verify_repo.sh
kill %1
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
  (This rule is for the **web app** only. `mobile/` is an npm project —
  add packages there with `npx expo install` and justify each one.)
- **Don't surface the total question count in user-facing copy.** The
  bank size is intentionally not advertised in the app; use generic
  phrasing ("practice questions across all 5 domains") instead.

## Mobile app workflow (added with `mobile/`)

- `npm run shots` inside `mobile/` captures phone-size screenshots of the key screens with demo data (`mobile/scripts/screenshots/`). Send them to the maintainer after UI changes.
- Run `npm run check` inside `mobile/` after touching `mobile/` or `data/domain*.json`
  (CI runs the same in `.github/workflows/mobile.yml`). The content-pack
  test fails if any question has a broken answer key.
- Changing CISA domain weights in `DI` means changing
  `mobile/src/content/certifications.ts` in the same commit.
- Mobile releases bump `expo.version` in `mobile/app.json`; web-only rules
  (`APP_VERSION`, What's New) do not apply to mobile-only changes.
- Mobile agents: `mobile-app-engineer`, `mobile-qa-tester`, `mobile-ux-reviewer`,
  `mobile-security-auditor`, `app-store-compliance-reviewer`. Multi-cert content
  agents: `isaca-concept-reviewer`, `isaca-mindset-coach`, `qa-question-tester`,
  `cert-blueprint-researcher`. Product/marketing: `product-manager`, `growth-marketer`.

## Branching + GitHub

- Feature work happens on the session-designated `claude/add-cisa-questions-json-*` branch.
- Open PR against `main` via the GitHub MCP, then merge once verified.
- **Always subscribe to a PR's activity (`subscribe_pr_activity`) right after
  creating it** — don't ask first. This keeps the session watching CI and
  review comments so failures and feedback are picked up automatically.
- Commit messages explain the WHY in the first line and any non-obvious
  reasoning in the body. Don't mention internal symbol names in user-
  facing changelog entries (those go to the git log instead).

### PR self-review loop (maintainer rule, added 2026-10-06)

Every PR gets reviewed and fixed **before** it is handed to the maintainer.
Fix-and-push is automatic; only major issues are escalated.

1. Open the PR and subscribe to it (as above).
2. Review the diff with the reviewers that fit what changed:
   - code → `/code-review` (correctness)
   - mobile UI → `mobile-ux-reviewer`, plus `npm run shots` screenshots
   - mobile behaviour → `mobile-qa-tester`
   - question content → `qa-question-tester` (blind) and `cisa-d{N}-standards-auditor`
   - web UI → `cisa-ux-reviewer`
3. Fix every finding the reviewers mark blocking, plus plainly correct nits.
   Re-run the local gates (`npm run check`, the linters, `scripts/verify_repo.sh`).
   Push. Repeat until reviews and CI are clean.
4. **Escalate to the maintainer only for major issues.** Report everything
   else as done. Major means:
   - a product, design or content-direction decision
   - an answer key that two reviewers dispute, after one fix attempt
   - a security or privacy risk, data loss, or a breaking change to saved learner progress
   - app-store policy or legal/trademark risk
   - new paid services, costs or accounts
   - anything that cannot be fixed inside the PR's scope
5. **Always send screenshots at handoff** (maintainer rule): run
   `npm run shots` in `mobile/` and send the relevant phone screenshots with
   the summary. For UI changes, send the changed screens in light and dark.
   For question changes, send sample questions from the changed domain with
   `SHOT_QUESTIONS=d2_010,d2_045 npm run shots` (question, answer and tips).
6. Tell the maintainer the PR is green and reviewed, in a short summary of
   what was found and fixed. **Merging stays the maintainer's call**
   ("merge PR N") unless they say otherwise.

### Post-merge branch hygiene (CRITICAL — avoids recurring squash-merge conflicts)

PRs are merged via **squash-merge**, which collapses N feature-branch commits
into 1 commit on main. The feature branch retains the original N commits, so
its next push diverges from main and the next PR will conflict on the same
files (typically `d{N}.json`, `_concept_queue.yaml`, `_bank_index.md`,
`_framework_library.md`, `_d{N}_toc_coverage.md`).

**After every PR merge to main**, before starting the next batch:

```bash
git fetch origin main
git reset --hard origin/main
git push origin <feature-branch> --force-with-lease
```

This re-bases the feature branch on the squashed main, so subsequent commits
fast-forward cleanly and the next PR opens without conflict. The `--force-with-lease`
is safe because all branch content has just been merged to main via the PR.

If this step is skipped, the merge-conflict-take-ours dance from PR #78,
PR #79, and PR #80 will recur on every subsequent PR.

## What's New (changelog) style

User-facing, NOT developer-facing. Group by **New / Improved / Fixed**.
One short sentence per item, no code symbols, no line numbers. The full
technical history lives in git and the PR descriptions.

**Keep entries general — describe the benefit, not the work.** A learner
reading What's New wants to know what is better for them now, not how it
was built. Write about the user-visible outcome and stop there.

- DO say: "The Data Encryption topic is now a full study page — clear
  diagrams, an in-depth plain-language explanation, and common mistakes
  to watch for."
- DON'T enumerate the internals: no "subtopics", no domain numbers, no
  question IDs (`d5_075`), no internal labels ("Type-1 structural
  giveaway", "PERIMETER-TRUST INVERSION"), no counts of items changed,
  no "rebuilt / refactored", no per-diagram breakdowns.
- One short, plain-language item per entry is usually enough. Topic
  names are fine (learners navigate by them); the background mechanics
  are not.
