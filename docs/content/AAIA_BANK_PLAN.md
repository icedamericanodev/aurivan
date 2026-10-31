# AAIA course plan: from the pilot to a sellable pack of about 1,000 questions

**Status:** plan, 30 Oct 2026. AAIA (ISACA Advanced in AI Audit) is a **paid**
KaiSip course, so every part of it must be good enough to sell. Outline, lens,
sources and trademarks: `docs/content/AAIA_BLUEPRINT.md`. Item standard:
`.claude/agents/aaia-standards-auditor.md`.

**Where we are:** the blueprint, expert agents, citation library, notes for all
17 outline areas (52 subtopics) and a 60-question pilot (20 per domain) are
written and reviewed. AAIA is not wired into the apps yet (Stage 2.7 pack
delivery, then Phase E for the paywall), so content work needs no `APP_VERSION`
bump. Never put the bank size in learner copy.

## 1. Targets by outline weight

From the blueprint (bank of 1,000, scaled by the June 2025 weights 33 / 46 / 21).
Each area's target is split evenly across its notes subtopics.

| Area | Target | Notes subtopics and targets |
|---|---|---|
| 1A | 64 | 1A.1 Kinds of AI Systems 22 · 1A.2 How Models Learn and Where They Fail 21 · 1A.3 Business Requirements and Architecture Fit 21 |
| 1B | 70 | 1B.1 AI Strategy, Policy and Inventory 24 · 1B.2 Ownership, Roles and the AI Governance Committee 23 · 1B.3 Program Metrics, Awareness and Workforce Impact 23 |
| 1C | 70 | 1C.1 Identifying and Assessing AI Risk 24 · 1C.2 Risk Appetite, Tolerance and AI Key Risk Indicators 23 · 1C.3 Third-Party and Supply-Chain AI Risk 23 |
| 1D | 64 | 1D.1 Data Governance for AI 22 · 1D.2 Personal Data in Training, Prompts and Outputs 21 · 1D.3 Retention, Deletion and Model Memorization 21 |
| 1E | 62 | 1E.1 Trustworthy-AI Characteristics as Testable Criteria 21 · 1E.2 Risk-Based AI Regulation and Mapping Obligations 21 · 1E.3 Frameworks and Standards for AI 20 |
| 2A | 70 | 2A.1 Data Provenance, Lineage and Rights to Use 24 · 2A.2 Data Quality, Labeling and Representativeness 23 · 2A.3 Training, Validation and Test Separation 23 |
| 2B | 66 | 2B.1 The AI Lifecycle and Stage Gates 22 · 2B.2 Model Documentation and Build, Buy or Tune 22 · 2B.3 Decommissioning AI Systems 22 |
| 2C | 62 | 2C.1 What Counts as an AI Change 21 · 2C.2 Model Versioning, Configuration Baselines and Rollback 21 · 2C.3 Vendor Model Updates 20 |
| 2D | 70 | 2D.1 Human Oversight and Automation Bias 24 · 2D.2 Monitoring Drift, Performance and Impacts 23 · 2D.3 Decision Logs, Appeals and Feedback 23 |
| 2E | 66 | 2E.1 TEVV and Acceptance Criteria 22 · 2E.2 Fairness Testing Across Groups 22 · 2E.3 Independent Validation, Robustness and Red Teaming 22 |
| 2F | 70 | 2F.1 Attacks on Data and Models 24 · 2F.2 Prompt Injection and Jailbreaks 23 · 2F.3 Excessive Agency and Access Management for AI 23 |
| 2G | 56 | 2G.1 Recognizing and Triaging AI Incidents 19 · 2G.2 Containment: Disengage, Roll Back and Preserve Evidence 19 · 2G.3 Root Cause, Problem Management and Reporting 18 |
| 3A | 44 | 3A.1 AI Audit Universe and Risk-Based Plan 11 · 3A.2 Scoping an AI Audit Engagement 11 · 3A.3 Specialists, Skills and Independence 11 · 3A.4 Planning the Audit's Own Use of AI 11 |
| 3B | 44 | 3B.1 Testing AI Controls and Human Oversight 15 · 3B.2 Sampling AI Decisions 15 · 3B.3 Reperformance and Full-Population Testing 14 |
| 3C | 42 | 3C.1 Sources of AI Evidence 14 · 3C.2 Sufficiency, Reliability and Preservation of AI Evidence 14 · 3C.3 Evidence Produced by AI Tools 14 |
| 3D | 42 | 3D.1 Completeness and Accuracy of Audit Data 14 · 3D.2 AI-Assisted Audit Analytics and Tool Validation 14 · 3D.3 Reproducibility and Confidentiality in AI-Assisted Audits 14 |
| 3E | 38 | 3E.1 Writing AI Audit Findings 13 · 3E.2 Rating, Reporting and Follow-Up of AI Findings 13 · 3E.3 Disclosing AI Use and Owning Conclusions 12 |

Domain totals: D1 330 · D2 460 · D3 210 = 1,000. Each domain-expert agent holds
the traps to build distractors from, per area.

Mix inside every domain and batch:
- Difficulty about 25% foundational, 50% application, 25% analysis.
- Keys balanced across A–D (no letter above 35% in a batch).
- Length tell, per domain: always picking the longest option (by characters,
  ties shared) must win 15–24% of the time, about 20% (the rule
  `scripts/check_longest_option.py` applies to CISA since v12.49.2; run its
  `pick_longest_rate` on `data/aaia/originals/dN.json` until it has an AAIA
  mode). Pilot after the fix: D1 22.5% · D2 22.5% · D3 20.0%.
- **Domain 3 has two halves:** at least a third of its items are on using AI
  inside the audit (supporting tasks 1 and 2), the rest on auditing AI.
- Vary the affected group and setting across batches (age, language,
  disability, region; health, finance, public sector, logistics, education),
  in many countries.

## 2. Batch size and cadence

- **Batch 2: 30 items per domain** (90 in all), IDs `aaia_dN_021`–`050`. It gives
  every notes subtopic at least one reviewed item (2G.1 has none yet) before the
  bank deepens.
- Then batches of 30–40 per domain until the targets are met: about eight
  more rounds. D2 gets the most rounds (it is 46% of the exam).
- Run one or two domains per round, so each review stays small enough to read
  closely.
- **Cross-domain gate** (`aaia-cross-domain-reviewer`) after batch 2, then every
  ~200 new items, and as the final gate before AAIA ships.

## 3. The pipeline every batch goes through

The pilot set this order. Don't skip a step to go faster.

1. **Author** with `aaia-dN-domain-expert`, under `aaia-standards-auditor.md` and
   the calibration rules in section 4. Notes first when a subtopic is new.
2. **Self-check** (all must show 0 errors):
   ```bash
   python3 scripts/lint_exam_style_v2.py --file data/aaia/originals/dN.json
   python3 scripts/lint_notes.py data/aaia/notes/dN.json --outline docs/content/AAIA_BLUEPRINT.md --bank data/aaia/originals
   python3 scripts/print_alignment.py --file data/aaia/originals/dN.json   # read it
   ```
   Every `framework_ref` part must match a library bullet exactly (a mode for
   `scripts/lint_originals.py` is a follow-up; until then the session checks it).
3. **Blind test** with `qa-question-tester`, on a copy holding only the id, stem
   and options. Compare its picks with the keys afterwards.
4. **Standards audit** with `aaia-standards-auditor`, plus the domain expert's
   accuracy pass.
5. **Concept and lens review** with `isaca-concept-reviewer` (AAIA lens, AI
   facts, agreement with KaiSip's CISA content).
6. **Fix** every HARD ERROR and PRECISION finding; re-blind-test every changed
   item.
7. **Citations:** open the source for every new citation and add it to the
   library as Verified, with what was checked. Never key ISO/IEC 42001, ISO/IEC
   23894 or the EU AI Act while those hosts are blocked.
8. **PR** per round, reviewed and merged under the CLAUDE.md PR rules.

## 4. Pilot calibration rules (binding for every batch)

Learned from the pilot's three blind tests, three standards audits and three
concept reviews. They extend the CC rules in `docs/content/CC_BANK_PLAN.md`
section 6, which also apply.

1. **The deciding fact is AI-specific.** Blind testers could answer about a
   third of the D3 pilot with CISA knowledge alone (complete population,
   evidence hierarchy, parts of a finding). Every stem must hold a fact a
   CISA-only candidate would weigh wrongly: drift, retraining as a change, a
   model version, lineage, automation bias, memorization, an agent's tool
   access, a vendor's silent update.
2. **Don't claim what the stem doesn't say.** A key or explanation may not
   assert facts (complaints, churn, "tested", "internal") that the stem never
   gives. If the lesson needs the fact, put it in the stem.
3. **Who decides is consistent with CISA.** The board approves AI risk
   appetite; senior management sets tolerances within it; model owners set
   use-level criteria inside those tolerances; the auditor assesses all three.
   Owners turn principles (fairness, explainability) into measurable criteria.
   The auditor selects the *audit* criteria for suitability (ITAF 1008) and tells
   management which were chosen; management's agreement is never a condition, or
   the auditee would hold a veto over the audit.
4. **Rank by likelihood and impact**, counting harm to people as well as to the
   business (CISA `risk-sets-priority`), never by impact alone.
5. **No list keys.** A key that is the only option listing four things, or the
   only one naming the stem's affected group ("caseworkers", "tenants",
   "appeals"), is a cue. Give a distractor the same shape or the same noun.
6. **Hosted AI is not perfectly reproducible.** Teach that recording version,
   settings, prompts and data makes a rerun *possible* or a difference
   *explainable*, not guaranteed.
7. **Notes and items never share a scenario.** The pilot caught notes examples
   that mirrored stems (D1 014 vs notes 1D.3; D3 004, 016, 019 vs their notes).
   Check both ways before review.
8. **Check arithmetic and parsing.** Every number in an option is recomputed in
   review; ages read "aged over 50", never "over 50 fewer".

## 5. The course pack (what learners buy)

A pack carries six kinds of content (`mobile/src/content/packs/types.ts`). This
PR ships the first two; the rest are planned here so the course launches
complete.

| Part | Source file (planned path) | Schema | Owner agents | Status |
|---|---|---|---|---|
| Questions, one file per domain | `data/aaia/originals/d{1..3}.json` (served copies generated at Stage 2.7) | `QUESTION_SCHEMA.md`, `EXAM_STYLE_V2.md` | `aaia-dN-domain-expert`, `aaia-standards-auditor` | Pilot 60, reviewed |
| Notes | `data/aaia/notes/d{1..3}.json` | `NOTES_SCHEMA_V2.md` | domain experts, `cisa-notes-curator` (structure), `learner-reader` | 52 subtopics, reviewed |
| Principles | `data/aaia/principles.json` | `PRINCIPLES_SCHEMA.md` | `isaca-mindset-coach` (AAIA section) | Plan: 12–15 principles that extend CISA's families (role, priorities, assurance, remedies, response, reading) with AI cases: named owner, retrain is a change, accuracy is not assurance, real oversight, AI in the audit stays the auditor's call. Tag items with `principle_id` once it exists |
| Exam guide and final-review week | `data/aaia/exam_guide.json`, `data/aaia/final_review_week.json` | `EXAM_GUIDE_SCHEMA.md` | `isaca-mindset-coach`, `cert-blueprint-researcher` | Plan: 90 items in 150 minutes (100 seconds each), the prerequisite list, scaled 200–800 with 450 to pass, the June 2025 outline; practice scores are not scaled scores |
| Lessons | `data/aaia/lessons.json` | `LESSONS_SCHEMA.md` | `learning-game-designer`, domain experts | Plan: one decision lesson per area (17), starting with the five lens lessons: owner, change, evidence, oversight, AI in the audit |
| Game decks | `mobile/src/content/games/aaia/{roles,sequences,flows}.json` | as the CISA decks | `learning-game-designer` | Plan: roles (who decides: board, owner, committee, validator, auditor), sequences (AI lifecycle, incident steps), flows (finding writing) |

Mock exams draw 90 items weighted 30 / 41 / 19 by domain (KaiSip's reading of
the weights).

## 6. Free sample: how it is chosen

The paid model (`docs/business/monetization/RECOMMENDATION.md`): about 20% of
the course's questions, at least 100, plus one diagnostic and one short mock,
free forever; the rest and the full timed mocks are paid (6-month access, one
payment, never renews). Notes, lessons, principles and games stay free.

- **Size:** 20% of the bank, never fewer than 100. At 1,000 items that is 200:
  **D1 66 · D2 92 · D3 42**.
- **Weighted to the end:** each area gives about 20% of its target, and each
  notes subtopic at least one item, so every area and subtopic is represented.
- **Best-reviewed first:** only items that passed the blind test with high
  confidence and needed no HARD ERROR fix. Prefer items whose explanations and
  tips teach the lens best, because the sample is what sells the course.
- **Mix:** the same 25 / 50 / 25 difficulty mix and balanced keys as the bank;
  both halves of Domain 3.
- **Diagnostic:** 30 items from the sample, 10 per domain weighted 10 / 14 / 6
  inside it… rounded to 10 / 13 / 7, one per area at least.
- **Short mock:** 30 items, 45 minutes (the exam's 100 seconds per item), drawn
  from the sample, never from the paid bank.
- The sample is fixed per release (a `free: true` flag on each item at Stage
  2.7), and changes only with a new reviewed release.
- **Before launch:** while the bank is still small, the sample is at least 100
  items; the course is not sold until the bank reaches about 600 reviewed items
  (two thirds of the target), so paid learners get a real bank.

## 7. Naming, trademark and originality

- Product names (store-compliance review, 30 Oct 2026):
  - Google Play (52 of 55 characters): **KaiSip AI Audit course, 6 months (for the AAIA exam)**
  - iOS display name (25 of 30): **KaiSip AI Audit, 6 months**
  - iOS in-app purchase description (44 of 45): **6 months of AAIA exam practice. Never renews**
- AAIA is an unregistered ISACA trademark: never AAIA®. ISACA® keeps its ®.
  Never "Pass", never a pass promise or rate, never implied ISACA endorsement.
- **Maintainer decision before launch:** the app shows the full name "Advanced
  in AI Audit", which ISACA writes as "ISACA Advanced in AI Audit™" (a US
  application for the composite mark is pending). Either drop that subtitle or
  extend the notice to "AAIA and Advanced in AI Audit are trademarks of ISACA."
- **Originality is a legal must** for a paid course: never copy or closely
  paraphrase ISACA's AAIA review manual, QAE database, online course or practice
  quiz, or any prep bank. Every item carries a `_provenance` note; reviewers
  reject near-copies as a HARD ERROR.

## 8. Course description (growth-marketer draft, store-compliance approved)

Approved with fixes on 30 Oct 2026 (`app-store-compliance-reviewer`): future
features are not named next to a price, free and paid parts are separated, and
the notice is part of the description.

> You already know audit, so this course skips audit basics and teaches the
> auditor's lens applied to AI. It follows the AAIA exam content outline from
> ISACA® (June 2025): AI Governance and Risk, AI Operations, and AI Auditing
> Tools and Techniques.
>
> Free: study notes for all 17 outline areas, each with an "Auditing it"
> checklist, plus a sample of practice questions, a diagnostic and a short
> timed mock.
>
> 6-month access unlocks the full bank of original practice questions and a
> full-length timed mock to practice your pacing. Every question explains each
> option and adds three coaching tips. It is one payment for 6 months that
> never renews.
>
> KaiSip is not affiliated with or endorsed by ISACA®. AAIA is a trademark of ISACA.

- In-app subtitle or Play short description (61 of 80): "Practice for the AAIA exam: the auditor's lens, applied to AI"
- App Store subtitle (26 of 30): "Practice for the AAIA exam"
- Before submission: confirm each claim matches the build (mock singular or
  plural, the "Auditing it" checklist rendered), keep the paywall's "practice
  scores are not scaled exam scores" line, and re-check the outline date with
  the blueprint's six-monthly outline check.

## 9. Progress

| Round | D1 | D2 | D3 | Total |
|---|---|---|---|---|
| Pilot (30 Oct 2026) | 20 | 20 | 20 | 60 |

Pilot review, 30 Oct 2026:
- **Blind tests:** 60/60 picks matched the keys on the first pass. After the
  fixes, every revised item was re-tested blind: 43/43, then 8/8 after the
  cross-domain fixes.
- **Standards audits and concept reviews** (one each per domain): all keys
  correct, no lens leakage. Four HARD ERRORs, all fixed without changing a
  key: a second defensible answer (D1 008); an incident-closure rule that
  contradicted CISA (D2 notes and 020); an arithmetic slip (D3 017). About 40
  PRECISION fixes: stem words echoed only in keys, subtopic labels that hinted
  at keys, items a CISA holder could answer without AI knowledge, notes
  examples that mirrored items, and who-decides wording aligned with CISA.
- **Cross-domain gate:** no HARD ERRORs; 9 PRECISION fixes (one duplicate
  lesson across domains, three items too close to CISA or AAIA items,
  appetite/tolerance and audit-criteria wording made consistent).
- **Carried to batch 2:** 2G.1 has no item yet; vary settings (travel and
  pension settings are used); a few items stay answerable from general audit
  sense (D2 007, 014, 017; D3 004, 011, 019) and are the first to re-angle.

## 10. Follow-ups outside this plan's scope

- An AAIA mode for `scripts/lint_originals.py` (library match for `data/aaia/`)
  and a coverage check, so the session-only checker becomes a repo script.
- Stage 2.7: add an `aaia` pack to `mobile/scripts/build-content.mjs` and the
  `free` flag.
- Re-check NIST AI RMF (a revision is under way) and the AAIA outline every six
  months and before each release.
- Ask the owner to allow `iso.org`, `eur-lex.europa.eu` and `genai.owasp.org`
  so ISO/IEC 42001, the EU AI Act and the OWASP 2025 list can become Verified.
