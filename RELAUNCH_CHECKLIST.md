# Relaunch Checklist

This is a **transitional planning document**. It captures the agreed-upon plan for taking the app offline, rebuilding the question bank from clean sources, and relaunching with stronger legal posture and richer pedagogy. Once the relaunch ships, this file is deleted (or archived); CONTRIBUTING.md / CHANGELOG.md / README.md become the durable docs again.

## Status

**Phase:** Pre-takedown — finalizing plan before the live app goes offline.

**Last updated:** v8.8 (post-xlsm cleanup). The current `data/domain*.json` banks are still derivative content from the original ISACA-sourced spreadsheet and should not continue to be served publicly.

**Decision principle:** every action below either reduces ongoing legal exposure or builds the foundation for a defensible relaunch. We don't add features to the existing app; we plan the next one.

## Pre-relaunch tasks, in order

Each task is a separate PR for clean SoD logging. PR letter labels match.

### Stage 1 — Take down

**PR A — Maintenance page** *(human merge)*
- Replace `index.html` with a single-page maintenance notice (no JS, no fetches, no PWA service-worker registration so installed PWAs eventually invalidate)
- Move current `index.html` to `archive/index-v8.8.html` for historical reference
- Maintenance copy: forward-looking, quality-focused, no admissions; suggested wording in `Decision log` below
- After merge: confirm GitHub Pages still serves; PWA users will see the maintenance page on next online launch

### Stage 2 — Build the new bank in parallel

**PR C — Authoring scaffolding** *(self-merge)*
- New `data/originals/d{1..5}.json` files (start empty, append per batch)
- Update `scripts/convert_test_bank.py` (or write a new converter) to validate against the expanded schema — see "Question schema" below
- Update `scripts/verify_repo.sh` to also assert per-domain question counts in `data/originals/` once non-zero
- Branch `originals/v1` off `main` for the rebuild (keeps `main` frozen at the maintenance page until relaunch)

**PR D₁..D_n — Authoring batches** *(self-merge after explicit in-conversation approval)*
- One PR per batch (typically 10-25 questions)
- Each PR appends to `data/originals/d{N}.json` only; no other changes
- PR description self-classifies the batch and confirms the in-conversation approval

### Stage 3 — Legal hardening

**PR B — Terms & Conditions** *(human merge)*
- New `TERMS.md` at repo root + `terms.html` linked from the relaunched app
- Sections: about / no ISACA affiliation / IP / acceptable use / disclaimer of warranty / limitation of liability / user-submitted feedback license / privacy / modifications / governing law / contact / effective date
- **Reviewed by IP attorney before merge** — same consult that reviews authoring methodology

### Stage 4 — Relaunch

**PR R — The big swap** *(human merge)*
- Delete `data/domain{1..5}.json` and `data/tips_overrides/d{1..5}.json` (the derivative content)
- Rename `data/originals/*` → `data/domain{1..5}.json` (or update the runtime to read from the new path)
- Replace the maintenance page with the new `index.html` (the rebuilt app, see "UI work needed at relaunch" below)
- Effective-date the T&C
- Update changelog with the relaunch entry
- Bump major version (e.g., v9.0)
- Optionally do a `git filter-repo` to scrub the xlsm and old derivative JSONs from history — separate PR, requires force-push and breaks existing clones

## Authoring workflow

### Per batch

You provide a structured concept list:

```
Domain: 1
Subtopic: <category>
Difficulty mix: e.g., 6 application + 4 analysis
Concept #1: <one-sentence concept description in your own words>
Concept #2: ...
... (10-25 concepts)

Optional per concept:
  - Difficulty: foundational | application | analysis
  - Stem pattern: FIRST | BEST | MOST | GREATEST | PRIMARY | concern
  - Avoid: anything specific to leave out
```

Concept descriptions can come from public sources: `data/cisa_notes.json` summaries, the publicly-published CISA exam content outline, ISACA Standards documents, your own auditor experience. The descriptions must be in your own words, not pasted from any question bank.

### Per question, I produce JSON matching the schema below.

### After authoring (two-stage review)

1. **AI pre-review** — invoke the `cisa-exam-reviewer` subagent (defined in `.claude/agents/cisa-exam-reviewer.md`) on the freshly authored batch. The reviewer agent acts as an ISACA CISA exam developer expert, checking correct-answer integrity, framework-citation precision, distractor quality, scenario realism, pedagogical fields, and schema compliance. The author applies any FIX REQUIRED items before showing the batch to the human.
2. **Human spot-check** — you do final-quality review: anything the reviewer agent missed, judgment calls on which of two defensible answers is best, real-world-experience checks the AI can't make. This is shorter than before because mechanical errors have already been filtered.
3. You approve, edit, or reject.
4. On approval, batch is committed to `data/originals/d{N}.json` and merged via PR D_n.

## Question schema

Drop-in compatible with existing converter for the legacy fields; new fields are additive.

```json
{
  "id": "d1_001",
  "domain": 1,
  "subtopic": "Compensating Controls & Effectiveness",
  "difficulty": "analysis",
  "bloom_level": "Analysis",

  "scenario_context": "<multi-fact setup, optional, ~80-160 words for analysis-tier>",
  "question": "<the actual question being asked>",
  "options": {
    "A": "<distractor>",
    "B": "<correct>",
    "C": "<distractor>",
    "D": "<distractor>"
  },
  "correct": "B",

  "key_concept": "<one sentence stating THE general principle being tested>",
  "pre_read": "<what to look for in the stem before reading options; trains a reading habit, not a question-specific reveal>",

  "correct_explanation": "<60+ words for analysis-tier; principle-grounded; references public framework where applicable>",
  "wrong_explanations": {
    "A": "<why A is the seductive trap and what specific mistake choosing it represents>",
    "C": "<why C is real but secondary>",
    "D": "<why D is real but secondary>"
  },

  "tips": [
    "<trap-naming tip — calls out the seductive wrong option>",
    "<mindset/principle tip — the underlying ISACA principle>",
    "<exam-day shortcut tip — pattern recognition or mnemonic>"
  ],

  "framework_ref": "<ISACA IT Audit Standard / COBIT process / NIST publication / ISO standard>",
  "related_concepts": ["<linked concept 1>", "<linked concept 2>"],

  "_provenance": "Authored from concept: '<your concept summary>'. Public source: <which standard/outline>. All scenario specifics (industry, sizes, names, control labels, time windows) invented for this question. No reference to the legacy data/domain*.json banks during authoring."
}
```

The `_provenance` field is stripped by the runtime before the JSON is loaded into the app — it's our paper trail, not user-facing content.

## Difficulty mix (tilted toward expert)

| Tier | Share | What it tests |
|---|---|---|
| Foundational | 10% | Definitions, basic recall — minimum needed for warmup |
| Application | 50% | Standard scenario judgment — the bread and butter |
| Analysis | 40% | Multi-factor scenarios, expert judgment, edge cases |

Target distribution across 1000 questions:

| Domain | Total | Foundational | Application | Analysis |
|---|---|---|---|---|
| D1 | 180 | 18 | 90 | 72 |
| D2 | 180 | 18 | 90 | 72 |
| D3 | 120 | 12 | 60 | 48 |
| D4 | 260 | 26 | 130 | 104 |
| D5 | 260 | 26 | 130 | 104 |
| **Total** | **1000** | **100** | **500** | **400** |

400 analysis-tier questions = a genuinely differentiated product.

## Authoring guardrails (self-imposed)

The AI assistant must, during every authoring session:

- **Not open or reference `data/domain*.json` or `data/tips_overrides/d*.json`** — those contain derivative content that would taint output
- **Start every question from the concept summary**, written in the user's own words, not from any source question
- **Vary scenarios across industries** — financial services, healthcare, manufacturing, SaaS, government, retail, telecom, education — no two questions in identical context
- **Cite a public framework reference** for every correct answer (ISACA Standards, COBIT, NIST, ISO/IEC, public CSF)
- **Author distractors as real-world wrong answers** — the implementer trap, the premature-step trap, the scope-creep choice — not nonsense
- **Vary stem patterns** across a batch — not all FIRST, not all BEST, not all GREATEST risk
- **Match difficulty distribution** within each batch (~10/50/40 foundational/application/analysis)

## Quality bar

A question ships when:
- A working IS auditor would recognize the scenario as realistic
- The correct answer is defensibly correct, not just plausibly correct
- All four options are tempting (real distractors, not filler)
- The explanation teaches the principle, not just states the answer
- `key_concept` is a general rule, not a disguised reveal of the answer
- `pre_read` describes a generalizable reading habit, not question-specific cues
- The trap-naming tip identifies a specific failure mode

A question is rejected (not shipped) when:
- The scenario fits only one obvious right answer
- The explanation is "B is correct because B is correct"
- All four options are obviously different — no real distractors
- The wording leans on a pattern from the legacy bank
- Any of the rich fields is fluff, not teaching

## Repo handling during rebuild

```
data/
├── domain{1..5}.json              # OLD (derivative) — frozen, not edited
├── tips_overrides/d{1..5}.json    # OLD — frozen
└── originals/
    ├── d1.json                    # NEW — appended to per batch
    ├── d2.json
    ├── d3.json
    ├── d4.json
    └── d5.json
```

The maintenance page (live during rebuild) doesn't load any data files. The new bank exists in parallel until the swap PR (Stage 4).

## UI work needed at relaunch

These are app changes to ship alongside the new bank, supporting the richer schema:

- **"💡 Need a hint?" button** before answering — surfaces `key_concept` + `pre_read`. Closeable. Optional toggle: "Study mode" (button visible) vs. "Exam mode" (hidden, mirrors actual exam discipline).
- **Tabbed post-answer view** instead of a single explanation block: Why right / Why wrong / Tips / Related concepts / Framework reference. Default tab = Why right.
- **`related_concepts`** rendered as clickable links that filter practice mode to that concept.
- **Difficulty filter** on practice mode — let users drill specifically on analysis-tier questions.
- **Provenance is stripped from runtime JSON** by the converter before the JSON is loaded by the app. The build step removes `_provenance` keys.
- **Donation button** — see next section.

## Donation feature

**Recommended platform:** Ko-fi (0% platform fee on tips, supports international payers, room to grow into memberships/products later).

**Setup before relaunch:**
1. Create Ko-fi account at the maintainer's email
2. Verify country/payout works (Stripe Express OR PayPal)
3. Get the username for linking

**Placement (in priority order):**
1. **Post-mock-results screen** — peak-gratitude moment after a mock. Small "If this app helped, you can buy me a coffee" link. Highest expected conversion.
2. **Settings / About modal** — discrete, always available.
3. NOT a persistent header button (feels needy during study).
4. NOT on the maintenance page.

**Copy:** "☕ Support this app" or "If this helped you pass, buy me a coffee."

**Implementation:** two lines of HTML (anchor tag with `target="_blank"`). No backend, no API key, no integration code.

## T&C and legal review

**T&C draft included in PR B.** Sections covered:

1. About this site (free educational tool, no ISACA affiliation)
2. Original content (all questions/explanations/tips authored by maintainer; ISACA® and CISA® are registered trademarks used nominatively only)
3. Acceptable use (personal study only; no redistribution; no scraping for competing question banks)
4. Disclaimer of warranty (provided as-is; no guarantee of passing)
5. Limitation of liability
6. User-submitted feedback (license to maintainer to use for product improvement)
7. Privacy (reference SECURITY.md)
8. Modifications to terms
9. Governing law and contact (jurisdiction TBD)
10. Effective date (set at relaunch)

**Reviewed by IP attorney before going live.** Specifically:
- Section 2 (IP claims) — does the language hold up if challenged?
- Section 3 (acceptable use) — enforceable scope?
- Section 5 (limitation of liability) — adequate for jurisdiction?

**Attorney consult also covers:**
- Authoring methodology used for the rebuild
- Sample new questions (5-10 from batch 1) for substantial-similarity assessment
- Maintenance page wording

## Effort estimate / pacing

**Total authoring work:** 200-330 hours for 1000 questions at the agreed-upon depth and difficulty mix. Realistic calendar windows:

- Aggressive (full-time, 30+ hrs/week): 7-12 weeks
- Moderate (15-20 hrs/week): 3-5 months
- Sustainable (5-10 hrs/week): 6-12 months

**Recommended pacing:** finish 200 questions before publicly committing to a relaunch date. After 200, scale based on actual throughput.

## Decision log

Decisions made in conversation that this checklist depends on:

| Decision | Date | Outcome |
|---|---|---|
| Take the app down before authoring (vs. keep live during rebuild) | Pre-rebuild | Take down. Reason: stop ongoing redistribution of derivative content. |
| Maintenance page copy | Pre-rebuild | Forward-looking, no admissions; "rebuilding from the ground up; expected back in a few weeks to a few months." |
| Difficulty mix | Pre-rebuild | 10% foundational / 50% application / 40% analysis. |
| `key_concept` + `pre_read` as new fields | Pre-rebuild | Approved; UI work scheduled for relaunch. |
| `related_concepts` per question | Pre-rebuild | Approved. |
| `_provenance` field, stripped at build | Pre-rebuild | Approved; defensive paper trail. |
| Donation platform | Pre-rebuild | Ko-fi recommended; final pick = maintainer's call after country/payout check. |
| Schema additive vs. breaking | Pre-rebuild | Additive only. Existing converter still works on old fields. |

## Maintenance page proposed copy

```
# CISA Mindset is on a brief pause

We're rebuilding our question bank from the ground up to make every
question, scenario, and explanation original to us. The app will return
better.

Expected back: a few weeks to a few months from now. We'd rather take
the time and ship something we're proud of than rush a half-rebuild.

Want to know when we're live? Email certprep.support@gmail.com with
the subject line "Notify me" and we'll let you know the moment the new
bank is ready.

Until then, thanks for studying with us. Good luck with your CISA prep —
the auditor mindset travels with you.
```

This text is the proposed body of the maintenance `index.html`. Final wording is set at PR A.
