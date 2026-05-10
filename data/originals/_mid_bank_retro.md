# Mid-Bank Retro — Lessons from the 11-batch D2 Arc

**Written:** 2026-05-10, after PR #60 merged (D2 COMPLETE at 180/180).
**Bank state:** D1 + D2 complete (360/1004 questions, 36% of target bank).
**Audience:** the next session that picks up D3 (and D4-D5 after).

---

## App-UI Spot-Check Results

**Live app:** Currently a 200-line maintenance/relaunch landing page (`index.html`). Originals are NOT yet wired in.

**Originals render-readiness (verified by JSON inspection):**

- ✓ All 360 questions schema-valid
- ✓ Only schema variation: `scenario_context` field on analysis-tier questions (144 of 360, exactly matching analysis count) — by design
- ✓ All option keys are A/B/C/D, no missing/extra
- ✓ All `correct` values are in the options dict
- ✓ All `wrong_explanations` keys are exactly the three non-correct letters
- ✓ All tips arrays have exactly 3 entries
- ✓ No HTML/JS injection content in any field

**Field-length stats (bank-wide, n=360):**

| Field | min | p50 | p95 | max |
|---|---|---|---|---|
| `question` (chars) | 33 | 152 | 428 | 657 |
| `scenario_context` (words, analysis only) | 65 | 101 | 139 | 152 |
| `correct_explanation` (chars) | 458 | 972 | 1493 | 1771 |
| `options.B` (chars) | 18 | 162 | 272 | 385 |
| `tips` (count) | 3 | 3 | 3 | 3 |

**No rendering risks found.** The `correct_explanation` p95 of 1493 chars (~240 words) is verbose but consistent with analysis-tier educational depth; the rebuild can handle it with normal CSS.

---

## What Worked — Patterns to Keep

### 1. Author-linter caught recurring drift consistently

Across batches 6-11, the linter found the same authoring drift pattern in nearly every batch:

| Batch | Parity errors at first author | Position skew | Citation warnings |
|---|---|---|---|
| 6 | 4 | none | 9 |
| 7 | 6 | none | 26 |
| 8 | 7 | **90% B** | 13 |
| 9 | 14 | none | 14 |
| 10 | 17 | **50% C** | 34 |
| 11 (10 q) | 10 | **5B/5C, no A/D** | 28 |

The linter is operating exactly as designed — it catches mechanical drift the author keeps producing despite having the discipline written down. Without the linter, every batch would have shipped with these issues.

### 2. Two-stage review (exam + pedagogy) found different things

`cisa-exam-reviewer` finds: framework citation drift (e.g., d2_128 SOX 404 → 802 fix in #56), missing nuance in correct_explanations (d2_147 prioritization rigidity).

`cisa-pedagogy-checker` finds: trap-letter mis-targeting (the most-seductive distractor isn't always the trap-letter the author named in tip 1), tip-3 duplication of tip-2 content, multi-trap tip pattern when multiple options are equally seductive.

Each reviewer caught issues the other missed. Both are earning their slots in the pipeline.

### 3. Two-trap tip pattern (introduced in PR #58)

When multiple distractors are equally seductive, "Trap is X or Y — X (seductive logic 1), Y (seductive logic 2)" is the right pattern. This emerged from pedagogy reviewer feedback in batch 9. Linter accepts the "Trap is X or Y" form. **Now standard for all future batches.**

### 4. Pre-author position rotation in plan but not in execution

Per-batch plans consistently target 5B + 5A + 5C + 5D (for 20) or proportional (for 10). Authoring consistently drifts to B-heavy (or C-heavy in batch 10). The linter catches it; in-batch rebalancing via swap+relabel works cleanly.

### 5. Library expansion is steady and routine

Started with 248 canonical citations (PR #41). Now at ~430+. Each batch introduces 10-30 new citations on average; library expansion is part of normal batch workflow, not exceptional.

### 6. Two-PR pattern (main + polish) handles reviewer findings cleanly

Reviewer findings consistently arrive AFTER the main batch PR is merged (since reviewers run in background). The pattern of "open main PR with batch + reviewers running, then small polish PR for findings" works well and keeps PRs focused.

---

## What Drifts — Patterns to Prevent for D3-D5

### 1. Parity drift: correct options run 50-100 words; target is 14-22

**Most consistent authoring drift.** Every analysis-tier batch produces correct options that are 2-4x distractor average length until the linter forces compression.

**Recommendation for D3-D5:** Add a pre-author template. Before writing each question, write the **principle** in 14-22 words. Then expand the explanation in `correct_explanation` (which is allowed to be long). The principle goes in the option; the elaboration goes in the explanation.

### 2. Position-letter drift: defaults to B (or whichever letter the author wrote first)

**Recurring authoring habit.** Even with explicit position-rotation plans, authoring drifts toward concentration in one letter.

**Recommendation for D3-D5:** Write the position assignment FIRST in the script (e.g., `correct: "C"` before authoring the option content). Then author the question knowing the correct must be at C. This forces authoring to write distractor at A/B/D, then correct at C.

### 3. Citation drift: subtle paraphrases of canonical names

**Recurring exam-reviewer finding.** "COBIT 2019 (Risk Management)" instead of "APO12 (Managed Risk)"; "OCC Bulletin 2017-21 (M&A)" instead of "Comptroller's Licensing Manual — Business Combinations"; "Sarbanes-Oxley Section 404" instead of "Section 802" for retention.

**Recommendation for D3-D5:** Pre-author citation pre-flight. For each question, list the citations needed BEFORE authoring; verify each against the framework library; if any are missing or paraphrased, fix at the library level FIRST. Library is now the single source of truth and grows naturally with this discipline.

### 4. Trap-letter targeting drift (less frequent, but recurring)

**Pedagogy-reviewer finding.** Tip 1 names the wrong distractor as the trap when multiple are seductive (d2_133, d2_135, d2_139, d2_147 all flagged this in batch 9).

**Recommendation for D3-D5:** Self-check during authoring: "Of the three wrong options, which would a 60th-percentile candidate actually pick? That's the trap." When more than one is seductive, use the two-trap pattern: "Trap is X or Y."

### 5. scenario_context too short (recurring, easily fixed)

**Recurring linter warning.** Analysis-tier scenario_context drifts toward 70-79 words when 80-160 is the target.

**Recommendation for D3-D5:** When authoring an analysis-tier question, write the scenario context first and target 100 words specifically (not "80-160"). 100 is comfortably in-band; 80 is right at the boundary.

---

## D3-D5 Concrete Plan Refinements

Based on the lessons above, the D3-D5 workflow should add:

### Pre-author template per question (in the script)

```python
NEW.append({
    # === PRE-AUTHOR CHECKS ===
    "_preauth_target_correct_words": "16",  # Note before writing
    "_preauth_position": "C",  # Decide first; force authoring around it
    "_preauth_citations_to_use": ["NIST SP 800-53", "ISACA Network Management"],  # Pre-flight
    "_preauth_trap_letter": "B",  # Identified before tips written
    # === AUTHORED FIELDS ===
    "id": "d3_001",
    ...
})
```

(These `_preauth_*` fields are ignored by the linter and validator; they're authoring-discipline scaffolds. After authoring, they can be deleted or kept for future analysis.)

### Citation pre-flight per batch

Before authoring batch N, write a citation list:
- Existing canonical citations the batch will use (verify in library)
- New citations the batch will introduce (add to library FIRST)

This prevents the recurring "linter caught 14 citation warnings" pattern.

### Position-letter rotation discipline

For 20-question batches: 5B + 5A + 5C + 5D, written into the script as a tracker:

```python
POSITIONS = ['B','A','C','D','B','A','C','D','B','A','C','D','B','A','C','D','B','A','C','D']
# After authoring, verify count matches assignment
```

### Tip-1 trap-letter pattern check

After authoring tips, programmatically verify tip 1 names a wrong-option letter (or two for multi-trap). The linter does this; making it part of the author-time self-check (not just lint) catches it before lint runs.

---

## Path Forward — D3 Through D5

**D3 (120 questions, ~6 batches):** Information Systems Acquisition, Development, and Implementation.
- Target mix: 12F + 60A + 48An
- Suggested cadence: batches 1-3 (60 questions, foundational tier closes by batch 3); batches 4-6 (60 questions, application + analysis depth)
- New framework families likely needed: ISTQB, CMMI, OWASP SAMM/BSIMM, ISACA Software Audit guidance, Project Management Institute (PMI) standards

**D4 (260 questions, ~13 batches):** Information Systems Operations and Business Resilience.
- Target mix: 26F + 130A + 104An
- Heavy on operational topics: BCP/DR, change/release, incident, ITSM
- New framework families: ITIL 4 service value system, ISO 22301 (already in library), DRII, BCI Good Practice Guidelines

**D5 (260 questions, ~13 batches):** Protection of Information Assets.
- Target mix: 26F + 130A + 104An
- Heavy on security: IAM, network/endpoint, cryptography, IR, forensics
- New framework families: NIST CSF v2.0 (extensive use), NIST SP 800-series broadly, MITRE ATT&CK, OWASP Top 10, FIDO2/WebAuthn for IAM

**Estimated total remaining work:** 640 questions across ~37 batches. At the current pace (~30-45 min per batch including reviews and PR), that's ~18-28 hours of focused authoring time.

**Linter discipline applies through all batches** — no more recurring drift cycles.

---

## Recommendation for Immediate Next Session

1. **Start D3-1.** Concept selection for first 20 questions (4F + 12A + 4An mix to launch foundational tier).
2. **Apply the pre-author template** in the authoring script for D3-1 to validate the discipline shift.
3. **First batch under D3 will baseline** the citation library expansion needed for SDLC/PM/testing topics.
4. **Continue the established workflow:** append → strict linter → reviewers (parallel) → fixes → main PR → polish PR if needed.

After D3 closes (in ~6 batches / ~5-7 hours of focused work), do another mid-bank retro before D4 starts. D4-D5 are the largest domains and benefit from another lessons-learned checkpoint.
