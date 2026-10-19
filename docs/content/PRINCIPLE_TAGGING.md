# Principle tagging (`principle_id`)

**Status:** decision D3, approved by the maintainer. Every CISA practice
question gets a `principle_id`: the single principle in
`data/mindset/principles.json` that the question MOST tests. Domain 1 is the
pilot (this document, section "D1 pilot"). Field rules:
`docs/content/EXAM_STYLE_V2.md` (item table) and
`docs/content/PRINCIPLES_SCHEMA.md` ("Question tags").

## The rule
Tag the reasoning that makes the key beat the runner-up, not the topic.

Read, in this order:
1. the `correct_explanation`, especially its "why the runner-up loses" half;
2. tip 2 (`Final two: K beats R because …`);
3. the `key_concept`.

Ask: *which principle's `rule` would a learner need to pick K over R?* Tag that
one. The subtopic, the framework cited and the words in the stem do not decide
the tag. A question on fraud is not automatically `people-contain-preserve`; if
its Final two turns on "the IS auditor escalates, does not investigate alone",
it is `escalate-to-decision-owner`.

## Steps
1. If the question is in a principle's `practice_ids`, use that principle. The
   linter makes the two agree. If you disagree with the seed, keep it and note
   it here for the maintainer (moving a practice id changes a learner-visible
   "Practice this principle" set).
2. Otherwise read the three fields above and list every principle whose rule is
   *used* in the key-vs-runner-up argument. Usually one or two.
3. One candidate: tag it. Two: apply the tie-breaks below.
4. Rate your confidence (below). **Low means leave the field out** and list the
   question in this document with a short reason. Never guess.

## Tie-breaks
- **Content families before the reading family.** Almost every stem has a
  priority word, so `reading` principles are tagged only when the explanation's
  decisive step is the reading itself: the priority word flips which true
  option wins (MOST LIKELY vs worst case, LEAST), a fact such as "already" or a
  stated constraint eliminates the runner-up (`answer-from-the-stem`), or one
  option is a prerequisite or subset of the other (`final-two`). If a content
  principle explains the win, use it.
- **Role vs priorities.** If the runner-up loses because the wrong *person*
  acts or decides, use the `role` family. If it loses because the wrong *thing*
  is weighed (cost over risk, tool over policy), use `priorities`.
- **Inside `role`.** IS auditor building, configuring or running the control →
  `recommend-dont-implement`. A threat to objectivity or a reporting line →
  `independence-throughout`. The issue must reach someone with authority
  (committee, counsel, fraud channel) → `escalate-to-decision-owner`. Who
  accepts residual risk or owns the controls → `management-owns-risk`.
- **Inside `assurance`.** What to do before testing (universe, population,
  scope, objectives, tailoring a program) → `plan-before-testing`. Which kind
  of engagement, test, sampling method, technique or report answers the
  objective → `fit-method-to-objective`. Whether the evidence in hand is
  trustworthy and enough → `evidence-quality`. Size, aggregation or
  pervasiveness → `materiality-judgment`. How findings are reported, rated,
  disputed or followed up → `report-agree-follow-up`. (Design or configuration
  versus operation over the period → `proven-not-configured`, which sits in the
  `remedies` family in `principles.json`.)
- **Boundary line: plan, method, evidence.** `plan-before-testing` settles
  **what** must be answered and over **which population**;
  `fit-method-to-objective` picks **which kind of procedure** answers it;
  `evidence-quality` judges whether **the evidence in hand** is trustworthy and
  enough. Test: if a perfectly run runner-up would still answer a different
  question → `fit-method-to-objective`. If a better-sourced or more complete
  version of the runner-up would win → `evidence-quality`. If the runner-up acts
  before objective, scope or population is settled → `plan-before-testing`.
- **Precedence notes.**
  - Design vs operation (SOC Type 1 vs Type 2, configured vs worked all
    period) stays `proven-not-configured`, the more specific principle.
  - A report already in hand that does not cover the objective (a SOC
    carve-out, a SOC 2 without the needed scope) is `evidence-quality`
    (relevance or sufficiency). Choosing which report to request is
    `fit-method-to-objective`.
  - A stated constraint that eliminates the runner-up (zero production impact,
    a two-person team) is `answer-from-the-stem`.
  - How much testing, as opposed to which kind, follows assessed risk. That is
    not `fit-method-to-objective`; sampling mechanics (sample-size drivers,
    projection, when to extend a sample, which audit-risk component a test
    reduces) stay untagged as knowledge unless the runner-up is the wrong kind
    of test.
- **Tightened `evidence-quality`.** Tag it only when the runner-up loses
  because of a property of the evidence itself: its source or independence,
  how it was obtained, its completeness and accuracy, its integrity, its
  relevance to the objective, or its sufficiency. If the runner-up loses
  because of **which kind of procedure** it is → `fit-method-to-objective`;
  **when** or **over what scope** → `plan-before-testing`; **who** performs or
  controls the work → `role` family; the **purpose** of a document or process →
  usually a reading principle or untagged. The words "evidence" or "work
  papers" in the stem are not enough.
- **`evidence-quality` vs `proven-not-configured`.** Choosing between sources
  (auditee report vs system log vs third party) → `evidence-quality`. Choosing
  between "it is set up" and "it worked all period" → `proven-not-configured`.
- **Inside `remedies`.** A recommendation that removes the cause →
  `root-cause-over-symptom`. Preventive vs detective, including keeping a
  detective backstop → `prevent-before-detect`. A substitute control, its fit
  and when to retire it → `compensating-controls-fallback`. Incompatible duties
  or excess access → `least-privilege-and-sod`.
- **Inside `response`.** Preserving evidence that may reach a court
  (chain of custody, litigation hold, forensic handling) →
  `people-contain-preserve`, even outside a live incident. Recovery order and
  testing → `recover-by-business-priority`.
- **Still tied:** pick the principle named, or most nearly named, in the Final
  two tip.

## Confidence
| Level | Meaning | Action |
|---|---|---|
| High | The explanation or Final two states the principle's logic almost word for word | Tag |
| Medium | The principle decides the key, but topic knowledge carries much of the weight, or a second principle is close | Tag; listed below for review |
| Low | No principle's rule is the decisive step; the key turns on knowing a definition, technique or rule | Leave untagged; listed below |

## D1 pilot (October 2026)
All Domain 1 questions were read against this rubric. Results:
137 tagged (75 high, 62 medium), 81 left untagged as low confidence.

### Distribution
| Principle | Family | D1 tags | Note |
|---|---|---|---|
| `evidence-quality` | assurance | 26 | Highest. Absorbs work papers, documentation and reliance on experts or tools. Watch for over-use |
| `plan-before-testing` | assurance | 16 | Broad by design (universe, population, scope, tailoring) |
| `report-agree-follow-up` | assurance | 13 | |
| `proven-not-configured` | remedies | 12 | |
| `independence-throughout` | role | 11 | Includes quality-assurance reviewer independence |
| `escalate-to-decision-owner` | role | 10 | |
| `risk-sets-priority` | priorities | 10 | |
| `materiality-judgment` | assurance | 8 | Includes opinion type (contained vs pervasive) |
| `root-cause-over-symptom` | remedies | 6 | |
| `people-contain-preserve` | response | 5 | Evidence preservation, not live incidents |
| `compensating-controls-fallback` | remedies | 4 | |
| `recommend-dont-implement` | role | 3 | Low for the audit-process domain |
| `management-owns-risk` | role | 3 | Domains list excludes D1 |
| `answer-from-the-stem` | reading | 3 | |
| `prevent-before-detect` | remedies | 2 | |
| `priority-word-decides` | reading | 2 | Both are seeds (see below) |
| `final-two` | reading | 2 | Both are seeds (see below) |
| `least-privilege-and-sod` | remedies | 1 | Domains list excludes D1 |
| `governance-before-technology` | priorities | 0 | D2-D5 principle |
| `recover-by-business-priority` | response | 0 | D2-D5 principle |

The assurance family holds 63 of the 137 D1 tags. That suits the audit-process
domain, but `evidence-quality` is close to a catch-all; reviewers should check
its medium-confidence tags first. The low counts for remedies and response
principles are expected in D1 and should fill from D4-D5.

### Tagged outside the principle's `domains` (lint warning)
`d1_073`, `d1_193`, `d1_194` (`management-owns-risk`) and `d1_104`
(`least-privilege-and-sod`). Either add 1 to those principles' `domains` (this
changes the "Appears in" line on the Principles page, so it needs a web
version bump) or retag. Maintainer decision.

### Seeds kept against the rubric
These are `practice_ids` of reading-family principles, so they keep that tag,
but the explanation teaches a content principle:
- `d1_001` (`priority-word-decides`): charter approval by governance, an independence point.
- `d1_018` (`priority-word-decides`): evidence from an unexplainable tool, an `evidence-quality` point.
- `d1_090` (`final-two`): evaluating an expert's deliverable, an `evidence-quality` point.
- `d1_102` (`final-two`): sufficiency vs appropriateness, an `evidence-quality` point.

### Medium confidence (tagged, review first)
d1_001 d1_006 d1_011 d1_017 d1_018 d1_020 d1_024 d1_030 d1_031 d1_032 d1_041
d1_042 d1_048 d1_059 d1_065 d1_066 d1_070 d1_073 d1_076 d1_080 d1_083 d1_090
d1_091 d1_092 d1_096 d1_097 d1_101 d1_102 d1_103 d1_104 d1_106 d1_109 d1_110
d1_122 d1_132 d1_133 d1_136 d1_139 d1_141 d1_142 d1_144 d1_149 d1_150 d1_154
d1_162 d1_163 d1_164 d1_168 d1_171 d1_174 d1_175 d1_176 d1_177 d1_180 d1_184
d1_203 d1_209 d1_211 d1_213 d1_215 d1_217 d1_218

### Low confidence (untagged)
The key turns on knowing a technique, definition or rule; no principle's rule is
the decisive step.

| Cluster | Questions |
|---|---|
| Sampling: method, size, evaluation, projection | d1_009 d1_019 d1_049 d1_053 d1_064 d1_075 d1_086 d1_107 d1_116 d1_128 d1_143 d1_160 d1_178 d1_186 |
| Control definitions and classification | d1_012 d1_034 d1_047 d1_067 d1_081 d1_112 d1_118 d1_151 d1_155 |
| CAATs and online audit techniques | d1_026 d1_046 d1_152 d1_153 d1_207 d1_208 |
| ITAF and professional standards | d1_021 d1_045 d1_051 d1_060 d1_121 d1_181 |
| Audit risk model | d1_062 d1_111 d1_126 d1_198 d1_199 |
| Engagement types | d1_123 d1_158 d1_212 d1_216 |
| Resourcing and proficiency | d1_039 d1_044 d1_137 d1_167 |
| Agile auditing | d1_029 d1_140 |
| Other single items | d1_022 (legal owns interpretation) d1_025 (interviews) d1_027 (risk technique) d1_035 (report structure) d1_038 (framework mapping) d1_043 (retention) d1_052 d1_113 (charter) d1_055 (small function) d1_057 d1_108 d1_119 (AI risk) d1_058 (application controls) d1_069 (fraud triangle) d1_077 d1_099 (quality program design) d1_082 (control objectives) d1_088 d1_117 (integrated audit) d1_131 (CSA facilitation) d1_138 (multiple laws) d1_145 (rollout order) d1_146 (whistleblower) d1_147 (risk methods) d1_156 (defense in depth) d1_170 (conflicting standards) d1_185 d1_187 (SOC reports) d1_196 d1_197 (finding elements, criteria) d1_210 (Code confidentiality) |

About 45 of these share one reasoning pattern the library does not name:
**fit the method to the objective** (attribute sampling for a rate, variable
sampling for an amount, a snapshot for a trail, a SOC 1 for financial
reporting, a compliance audit for conformity). A 21st principle in the
`assurance` family would let most of them be tagged honestly. Maintainer
decision; until then they stay untagged.

## Rollout plan
1. **D1 review.** A second reader checks the medium list; the maintainer
   settles the domain mismatches, the seeds and the possible 21st principle.
2. **D2-D5.** One domain per PR, same rubric, same record in this file
   (distribution, medium list, low list). Run the gates below.
3. **Tighten.** When every domain is tagged, make a missing `principle_id` an
   error for new questions (authoring templates and `lint_exam_style_v2.py`).
4. **UI (separate PRs, web version bump).** The principle pages count and run
   "Practice this principle" from the curated `practice_ids`, not from tags:
   - web: `index.html`, `principlePracticeIds()` and `principlePracticeBlock()`
     (count built at line 15307, shown at line 15313);
   - mobile: `src/app/principles/[id].tsx` lines 72-73 (count shown at line 113).
   Switching them to tagged questions (or practice ids plus tags) is the
   follow-up. A literal `qCount` exists only in the archived design spec
   (`archive/MASTER_HANDOFF.md`).

## Gates
```bash
python3 scripts/validate_originals.py      # unknown id = error, missing = warning
python3 scripts/originals_to_domain.py     # copies principle_id to data/domain{N}.json
python3 scripts/lint_originals.py
python3 scripts/lint_principles.py         # counts per principle, < 10 warning, seed agreement
bash scripts/verify_repo.sh
(cd mobile && npm run content && npx jest src/__tests__/content-pack.test.ts)
```
