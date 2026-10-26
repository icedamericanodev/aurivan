# Post-D3 Retro — Lessons from the 6-batch D3 Arc

**Written:** 2026-05-11, after PR #70 merged (D3 COMPLETE at 120/120 with all reviewer findings applied).
**Bank state:** D1 + D2 + D3 complete (480/1,004 questions, 48% of target bank).
**Audience:** the next session that picks up D4 (and D5 after).

---

## Headline result

**D3 closed with the strongest first-pass quality in the bank's history.** Across 6 batches (d3_001..d3_120), every batch shipped with **0 lint errors and 0 warnings on first attempt** after pre-flighting citations. The Stage-0 scaffolder (introduced PR #62) eliminated the recurring lint-drift cycle that defined D2.

Per-batch reviewer trajectory:

| Batch | Pedagogy NI | Exam HARD | Exam precision flags |
|---|---|---|---|
| D3-1 | 4 | 0 | 5 |
| D3-2 | 5 | 0 | 3 |
| D3-3 | 4 | 0 | 5 |
| D3-4 | 3 | 0 | 5 |
| D3-5 | 5 | 0 | 2 |
| D3-6 | 4 | **1** | 5 |

**0 hard errors in batches 1-5; 1 hard error in batch 6 (d3_117 scenario-vs-correct-answer contradiction).** All findings applied via inline polish or follow-up polish PR. Final bank quality: 0 outstanding findings.

---

## What Worked — Patterns to Carry Into D4-D5

### 1. Stage-0 scaffolder eliminated lint-drift cycles

Every D3 batch shipped clean on first lint attempt (modulo missing-citation warnings, which were add-to-library not author-defect). Compare to D2's pattern where every batch produced 4-17 parity errors and 9-34 citation warnings on first pass. The scaffolder's structural enforcement (position rotation, target word counts, citation pre-flight reminder) transferred discipline from author memory to authoring artifact.

**Carry to D4-D5:** Use `scripts/scaffold_batch.py` as Stage 0 for every batch. Library pre-flight against `_framework_library.md` before authoring.

### 2. Inline polish pattern (D3-2 onward) collapsed two-PR cycle into one

D3-1 used the two-PR pattern (main batch + separate polish PR). D3-2 through D3-5 adopted the inline pattern: push polish commits to the SAME branch while the PR is open, so it lands with batch + polish together. This:
- Reduced PR count by half
- Eliminated rebase-after-squash-merge friction
- Kept reviewer findings in the same commit context as the questions

D3-6 reverted to two-PR (PR #69 batch + PR #70 polish) only because the exam-reviewer report arrived AFTER PR #69 was already merged.

**Carry to D4-D5:** Default to inline polish; allow two-PR only when reviewers complete after merge.

### 3. Two-trap pattern evolved into three-trap for analysis-tier

D3-1/-2 pedagogy reviewer flagged single-trap tip 1 when multiple distractors were equally seductive — introduced two-trap pattern ("Trap is A or B") in D3-3 polish. D3-6 reviewer flagged that when THREE distractors are equally seductive (typical of analysis-tier multi-bias scenarios), even two-trap leaves one unnamed. **Three-trap pattern** ("Trap is A, B, or C — different mechanisms / opposing biases") emerged as a natural extension.

**Carry to D4-D5:** For analysis tier, default to counting how many distractors are equally seductive in tip 1 — name them all.

### 4. "Opposing biases" framing produces strongest pedagogy

The gold-standard pattern that emerged in D3-6: when two distractors represent symmetric biases (CEO position vs CFO position; modernize-everything vs preserve-everything; speed vs control), tip 1 names both AND wrong_explanations diagnose what each stakeholder was thinking. Examples:
- d3_100 "Trap is A or B — opposing biases that both feel decisive"
- d3_104 "Accept-the-increase yields leverage; full-migration overspends"
- d3_105 sunk-cost fallacy AND reverse sunk-cost fallacy named as paired
- d3_113 "release artifact CAN be rebuilt" (the unlock insight)

**Carry to D4-D5:** Use this template for analysis-tier questions. Identify the symmetric biases explicitly in wrong_explanations.

### 5. Transferable mental models named explicitly become sticky

The strongest D3 questions named transferable mental models the candidate can carry to future questions:
- "Aggregate metrics mislead" (d3_109)
- "Cloud-tax" (d3_111)
- "Regulator cooperation is a quantified fine factor" (d3_116)
- "Symptom/cause/detection-gap three-layer" (d3_120)
- "Fiduciary obligation overrides executive authority" (d3_059)

**Carry to D4-D5:** Aim for at least one transferable mental model per analysis question. These convert wrong-answer events into durable knowledge.

### 6. Cross-references to earlier questions build coherent learning graph

D3 questions consistently referenced topically-aligned earlier questions in correct_explanations. BUT the exam-reviewer flagged that "(covered in d3_XXX)" markers in learner-facing text expose internal item-bank structure. Polish PR #70 stripped these and replaced with substantive concept language.

**Carry to D4-D5:** Reference concepts substantively in correct_explanation; put specific question IDs in `related_concepts` if useful internally.

---

## What Still Drifts — Patterns to Prevent for D4-D5

### 1. Two-trap → three-trap inconsistency

Even after D3-3 polish established two-trap, several D3-6 questions still defaulted to single-trap or two-trap when three would have been better. **Recurring failure mode:** author identifies the "obvious" trap and names it; misses that a second or third distractor would actually be picked more often by 60th-percentile candidates.

**Recommendation for D4-D5:** Before writing tip 1, ask "would a 60th-percentile candidate pick X, Y, AND Z roughly equally often?" If yes, three-trap. If two, two-trap. If one, single-trap.

### 2. Cross-reference markers in learner-facing text

5 D3-6 questions had "(covered in d3_XXX)" in correct_explanation. Polish PR #70 cleaned these but the pattern recurred.

**Recommendation for D4-D5:** When wanting to reference an earlier question, use substantive language ("the same data-stewardship pattern applies"). Put the specific ID in `related_concepts` field, not in learner text.

### 3. Internally-inconsistent options (the d3_117 pattern)

d3_117 had option B's hedge "(if exists)" conflict with the scenario stipulation "no alternate processor active." This is a rare but serious failure mode — the option's text contradicts the scenario, making the question internally indefensible.

**Recommendation for D4-D5:** During authoring, read each option AGAINST the scenario. If the option contains a conditional ("if X exists"), confirm the scenario establishes X.

### 4. Outdated framework references (post-Schrems II, etc.)

d3_114 cited "post-Schrems II adequacy uncertainty" when the EU-US Data Privacy Framework (July 2023) restored adequacy. The pedagogy didn't depend on the outdated framing but the citation was dated.

**Recommendation for D4-D5:** When citing regulatory frameworks with recent updates (privacy, AI, supply-chain), check 2023+ developments. Library is now 636 canonical citations; treat the library as the up-to-date reference.

---

## Tooling and Workflow at End-of-D3

**Stage-0 scaffolder:** `scripts/scaffold_batch.py` — generates structural scaffolds per batch (position, word counts, citation pre-flight reminder). 6 batches validated.

**Strict linter:** `scripts/lint_originals.py --batch --strict` — catches 7 dimensions of drift. 0 errors / 0 warnings achievable on first pass with scaffolder.

**Schema validator:** `scripts/validate_originals.py` — guards against the rare schema-level break (e.g., bloom_level enum drift caught at d3_001-004).

**Subagent pipeline:**
1. Stage 0: cisa-author-scaffolder
2. Stage 1: author (human or AI)
3. Stage 2: cisa-author-linter (mechanical)
4. Stage 3: cisa-exam-reviewer (judgment — technical accuracy, distractor quality, citation correctness)
5. Stage 4: cisa-pedagogy-checker (single-dimension — does the wrong-answer pathway teach?)

**Two-stage human-style review (stages 3+4) caught complementary issues:**
- Exam reviewer caught d3_117 hard error (scenario vs option logical contradiction)
- Pedagogy reviewer caught two-trap → three-trap pattern progression
- Both ran in parallel; combined output drove polish PR

**Library expansion:** 504 → 636 canonical citations across D3 (132 new entries). Major additions: HashiCorp Vault, NIST SP 800-207 (Zero Trust), NIST SP 800-57 (Key Management), OpenTelemetry, Sigstore, OWASP DSOMM, OpenFeature, Continuous Delivery (Humble & Farley), DORA Four Key Metrics, ITIL 4 Service Configuration, Trunk-Based Development, GDPR Article 33, EU-US Data Privacy Framework references.

---

## D4 Plan — Information Systems Operations and Business Resilience

**Target:** 260 questions across ~13 batches.

**Tier mix target:** 26 foundational + 130 application + 104 analysis.

**Suggested cadence:**
- Batches D4-1 through D4-3 (60 questions, 4F + 12A + 4An each): foundational tier closes by batch 3 at 12/26 — extended into batches 4-7 with 2F per batch
- Batches D4-4 through D4-7 (80 questions, 2F + 12A + 6An each): foundational tier closes at batch 7 at 20/26
- Batches D4-8 through D4-9 (40 questions, 0F + 14A + 6An each): foundational closes at batch 8 or 9 at 26/26
- Batches D4-10 through D4-12 (60 questions, 0F + 12A + 8An each): application tier closes by batch 12 at 130/130
- Batch D4-13 (20 questions, 0F + 0A + 20An): analysis tier closes at 104/104

Alternative simpler cadence: 13 batches of ~20 questions each, 2F + 10A + 8An per batch (rounded), with tier closure timing handled in the final 2-3 batches.

**D4 TOC focus areas (per ISACA CISA Review Manual):**
- 4.1 Common Technology Components
- 4.2 IT Asset Management
- 4.3 Job Scheduling and Production Process Automation
- 4.4 System Interfaces
- 4.5 End-User Computing
- 4.6 Data Governance (operational dimensions)
- 4.7 Systems Performance Management
- 4.8 Problem and Incident Management
- 4.9 Change, Configuration, Release and Patch Management
- 4.10 IT Service Level Management
- 4.11 Database Management
- 4.12 Business Impact Analysis
- 4.13 System Resiliency
- 4.14 Data Backup, Storage and Restoration
- 4.15 Business Continuity Plan
- 4.16 Disaster Recovery Plans

**Frameworks likely needed (NEW additions to library):**
- ITIL 4 Service Value Chain practices (Problem Mgmt, Incident Mgmt, Service Desk, Service Level Mgmt, etc.) — partial coverage already
- ISO 22301:2019 (Business Continuity Management) — already in library
- DRII Professional Practices (Business Continuity)
- BCI Good Practice Guidelines
- NIST SP 800-34 (Contingency Planning) — already in library
- ISACA BCM Audit guidance, ISACA Asset Management guidance, ISACA SLM guidance, ISACA Problem Management guidance, etc.
- FFIEC IT Examination Handbook (Operations chapter)
- ITAF Standards on Operations / Resilience

**Estimated batch count:** ~13 batches at the established cadence; ~6-9 hours of focused authoring time including reviewer cycles.

**Mid-D4 retro recommendation:** After D4-7 (foundational tier closes), do a brief checkpoint before continuing application + analysis depth.

---

## Long-Arc Remaining Work

**After D3:** 480/1,004 questions complete (48%).

| Domain | Remaining | Batches estimated |
|---|---|---|
| D4 | 260 | ~13 |
| D5 | 260 | ~13 |
| **Total** | **520** | **~26** |

At the established pace (~30-45 min per batch including reviewers and polish), that's ~13-20 hours of focused work to complete the bank.

---

## Recommendation for Immediate Next Session

1. **Begin D4-1.** Concept selection for first 20 questions (4F + 12A + 4An mix, position rotation 5B + 5A + 5C + 5D).
2. **Library pre-flight:** ITIL 4 Service Value Chain practices, ISO 22301, NIST SP 800-34, DRII, BCI — add what's missing before authoring.
3. **Apply D3 lessons:** three-trap default for analysis-tier, opposing-bias framing, transferable mental models, no cross-ref markers in learner text.
4. **Workflow:** scaffolder → author → linter → reviewers (parallel) → inline polish if findings arrive pre-merge.

After D4 closes (~13 batches / ~6-9 hours), do another retro before D5 starts. D5 (Protection of Information Assets — IAM, cryptography, network security, IR, forensics) is the largest single security-focused domain and benefits from a refreshed lessons-learned checkpoint.
