# Principle tagging (`principle_id`)

**Status:** decision D3, approved by the maintainer. Every CISA practice
question gets a `principle_id`: the single principle in
`data/mindset/principles.json` that the question MOST tests. Domain 1 was the
pilot; an expert panel reviewed it, and all five domains are now tagged
(section "Results"). Field rules:
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
- **`governance-before-technology` boundary.** Tag it only when the trap is
  to choose, buy, deploy or switch on a technology, tool or framework before
  direction, requirements, ownership or the inventory it depends on are
  settled. If the runner-up is not a technology move (a cost ranking, a KPI,
  a report format), it is not this principle. Board-versus-management role
  items go to the `role` family or stay untagged.
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
- **`plan-before-testing` is the IS auditor's own planning only**: audit
  universe, engagement scope, objectives, population and program. When
  management should inventory or assess something FIRST, tag
  `governance-before-technology` if the step it precedes is a technology
  choice or deployment, `risk-sets-priority` if it is a risk assessment that
  orders the work, or leave it untagged.
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
- **Remedies tie-break: the Final two decides.** When tip 2 contrasts a
  preventive key with a detective runner-up but the `key_concept` names SoD,
  least privilege or root cause, tag `prevent-before-detect`: the Final two is
  what separates the key from the runner-up. Seeds keep their tag.
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

## D1 pilot: panel decisions
The pilot went to an expert panel (curriculum architect and ISACA language
review). Applied:
- **21st principle** `fit-method-to-objective` (assurance family, order 2),
  for items where a well-run runner-up answers a different question. Seeds:
  d1_009 d1_086 d1_152 d1_158 d1_185 d1_186 d1_207 d1_216, plus d3_003,
  d3_051 and d5_294 (confirmed in the D3 and D5 passes). Sampling mechanics,
  audit-risk components and definitions stay untagged as knowledge items.
- **`management-owns-risk` lists D1** (subtopic 1A4.7, seed d1_193).
- **d1_104** retagged `prevent-before-detect` (the runner-up, logging, only
  records), so `least-privilege-and-sod` does not list D1.
- **Seeds moved off the reading family:** d1_001 to `independence-throughout`,
  d1_018 and d1_102 to `evidence-quality`; replacement reading seeds d1_122
  and d1_047 (`priority-word-decides`) and d1_137 (`final-two`). d1_090 stays
  in `final-two`. Moved items are tagged only, not added to content seeds.
- **Tightened `evidence-quality`** (tie-breaks above): d1_122 and d1_168
  retagged, d1_041 untagged after re-reading, d1_187 tagged.
- **Domains widened by the D2-D5 passes**, because tagged questions sit there:
  `escalate-to-decision-owner` adds D5, `plan-before-testing` and
  `proven-not-configured` add D4, and `fit-method-to-objective` keeps D2 (four
  D2 tags, no D2 seed). Single strays were retagged or untagged instead
  (d4_128 to `evidence-quality`, d2_173 untagged), following the d1_104
  precedent.

## Independent audit and fixes
An independent auditor blind-tagged 80 tagged and 20 untagged questions.
Strict agreement was 63/80; with defensible boundary calls, 74/80. Applied:
- **Six errors fixed:** d1_048 to `materiality-judgment`; d2_059 and d2_075
  untagged (d3_085 stays untagged, consistent with d2_059); d4_026 to
  `fit-method-to-objective`; d4_149 and d5_079 to
  `governance-before-technology`.
- **`plan-before-testing` limited to the IS auditor's own planning** (rubric
  line above). Management inventory-first items moved to
  `governance-before-technology` or `risk-sets-priority`, or were untagged.
- **`governance-before-technology` limited to technology moves** (rubric line
  above). D2 role and metric items were untagged; d2_011 moved to
  `management-owns-risk` and d3_002 to `root-cause-over-symptom`.
- **D4 "which test" items** checked against the fit-method boundary: d4_026,
  d4_271 and d4_309 moved to `fit-method-to-objective`, so the principle now
  lists D4. d4_012 and d4_019 stay `evidence-quality` (the runner-up is a
  weaker source for the same question).
- **Remedies tie-break** (rubric line above): eleven least-privilege,
  root-cause and compensating tags whose Final two is preventive vs detective
  moved to `prevent-before-detect`.
- **Newly tagged:** d4_176 (`evidence-quality`) and d5_166
  (`recover-by-business-priority`).

### Follow-ups
- **d1_185 stem.** The language review suggested rewording it as a choice of
  which report to request. Wording changes go through the question reviewers;
  the tag (`fit-method-to-objective`) stands meanwhile.
- **Seeds moved (maintainer decision: the rubric wins).** d2_069 (management
  documents the current-state architecture first) and d3_112 (dependencies
  mapped before migration waves) now seed `governance-before-technology`.
  `plan-before-testing` gets d2_050 (the IS auditor maps regulations to
  shared and unit-specific controls before planning testing) as its
  replacement seed.
- **Old "20 rules" lines** in past release notes (web What's New and mobile
  1.26.0 notes) stay as history.

## Results (October 2026)
All five domains were read against this rubric. Medium-confidence tags are
listed for review; low-confidence questions are untagged and listed with a
short reason.

| Domain | Questions | Tagged | High | Medium | Untagged (low) |
|---|---|---|---|---|---|
| D1 | 218 | 165 | 90 | 75 | 53 |
| D2 | 224 | 104 | 45 | 59 | 120 |
| D3 | 154 | 70 | 37 | 33 | 84 |
| D4 | 318 | 170 | 64 | 106 | 148 |
| D5 | 335 | 196 | 79 | 117 | 139 |
| All | 1249 | 705 | 315 | 390 | 544 |

### Distribution by principle
| Principle | Family | D1 | D2 | D3 | D4 | D5 | Total |
|---|---|---|---|---|---|---|---|
| `recommend-dont-implement` | role | 3 | 1 | 2 | 2 | 0 | 8 |
| `independence-throughout` | role | 12 | 6 | 1 | 0 | 0 | 19 |
| `escalate-to-decision-owner` | role | 10 | 5 | 3 | 1 | 3 | 22 |
| `management-owns-risk` | role | 3 | 18 | 5 | 9 | 18 | 53 |
| `governance-before-technology` | priorities | 0 | 13 | 6 | 9 | 10 | 38 |
| `risk-sets-priority` | priorities | 10 | 7 | 6 | 11 | 17 | 51 |
| `plan-before-testing` | assurance | 15 | 3 | 0 | 1 | 1 | 20 |
| `fit-method-to-objective` | assurance | 27 | 4 | 7 | 3 | 5 | 46 |
| `evidence-quality` | assurance | 25 | 12 | 6 | 18 | 18 | 79 |
| `materiality-judgment` | assurance | 10 | 0 | 1 | 0 | 1 | 12 |
| `report-agree-follow-up` | assurance | 13 | 0 | 2 | 2 | 1 | 18 |
| `root-cause-over-symptom` | remedies | 6 | 12 | 8 | 14 | 11 | 51 |
| `prevent-before-detect` | remedies | 3 | 7 | 10 | 20 | 29 | 69 |
| `compensating-controls-fallback` | remedies | 4 | 1 | 1 | 6 | 4 | 16 |
| `least-privilege-and-sod` | remedies | 0 | 2 | 1 | 11 | 17 | 31 |
| `proven-not-configured` | remedies | 12 | 7 | 3 | 6 | 12 | 40 |
| `people-contain-preserve` | response | 5 | 0 | 2 | 13 | 42 | 62 |
| `recover-by-business-priority` | response | 0 | 2 | 2 | 34 | 2 | 40 |
| `priority-word-decides` | reading | 2 | 1 | 1 | 1 | 1 | 6 |
| `final-two` | reading | 2 | 1 | 1 | 1 | 1 | 6 |
| `answer-from-the-stem` | reading | 3 | 2 | 2 | 8 | 3 | 18 |

Under 10 tagged questions: `recommend-dont-implement`, `priority-word-decides`
and `final-two`. The reading family is small by design (content principles
come first), and the bank has few items where the IS auditor is asked to
build or run a control. None is over 120; `evidence-quality` is the largest
after the tightened rule. Domain spread follows the content: response and
remedies principles fill from D4 and D5, assurance principles from D1.

### Medium confidence (tagged, review first)
- **D1** (75): d1_001 d1_006 d1_011 d1_017 d1_018 d1_020 d1_024 d1_025 d1_027 d1_029 d1_030 d1_031 d1_032 d1_042 d1_047 d1_048 d1_059 d1_062 d1_065 d1_066 d1_070 d1_073 d1_075 d1_076 d1_080 d1_083 d1_090 d1_091 d1_092 d1_096 d1_097 d1_101 d1_102 d1_103 d1_104 d1_106 d1_109 d1_110 d1_111 d1_116 d1_122 d1_123 d1_132 d1_133 d1_136 d1_137 d1_139 d1_141 d1_142 d1_143 d1_144 d1_147 d1_149 d1_150 d1_154 d1_162 d1_163 d1_164 d1_168 d1_171 d1_174 d1_175 d1_176 d1_177 d1_180 d1_184 d1_187 d1_203 d1_208 d1_209 d1_211 d1_213 d1_215 d1_217 d1_218
- **D2** (59): d2_002 d2_004 d2_006 d2_011 d2_012 d2_029 d2_030 d2_042 d2_044 d2_045 d2_057 d2_062 d2_063 d2_068 d2_071 d2_078 d2_084 d2_085 d2_087 d2_090 d2_091 d2_094 d2_099 d2_101 d2_102 d2_103 d2_104 d2_112 d2_117 d2_121 d2_125 d2_128 d2_131 d2_135 d2_140 d2_144 d2_146 d2_147 d2_148 d2_152 d2_154 d2_156 d2_160 d2_161 d2_163 d2_168 d2_171 d2_174 d2_181 d2_191 d2_193 d2_198 d2_200 d2_206 d2_214 d2_215 d2_220 d2_221 d2_222
- **D3** (33): d3_002 d3_004 d3_007 d3_012 d3_014 d3_019 d3_029 d3_030 d3_044 d3_046 d3_053 d3_059 d3_060 d3_063 d3_067 d3_068 d3_069 d3_074 d3_076 d3_079 d3_080 d3_081 d3_102 d3_107 d3_108 d3_113 d3_129 d3_136 d3_137 d3_140 d3_142 d3_145 d3_151
- **D4** (106): d4_004 d4_007 d4_014 d4_019 d4_020 d4_022 d4_025 d4_026 d4_029 d4_030 d4_033 d4_038 d4_041 d4_042 d4_049 d4_051 d4_052 d4_053 d4_054 d4_057 d4_058 d4_063 d4_064 d4_065 d4_076 d4_081 d4_082 d4_085 d4_087 d4_108 d4_109 d4_110 d4_111 d4_115 d4_118 d4_119 d4_123 d4_128 d4_136 d4_139 d4_144 d4_148 d4_149 d4_150 d4_151 d4_153 d4_155 d4_160 d4_166 d4_172 d4_174 d4_176 d4_181 d4_185 d4_193 d4_197 d4_198 d4_201 d4_203 d4_204 d4_207 d4_213 d4_218 d4_219 d4_223 d4_224 d4_225 d4_226 d4_230 d4_231 d4_234 d4_236 d4_243 d4_244 d4_247 d4_248 d4_249 d4_250 d4_251 d4_252 d4_253 d4_258 d4_259 d4_260 d4_263 d4_264 d4_265 d4_269 d4_271 d4_272 d4_276 d4_279 d4_281 d4_285 d4_288 d4_289 d4_290 d4_293 d4_300 d4_302 d4_305 d4_309 d4_313 d4_314 d4_315 d4_316
- **D5** (117): d5_001 d5_009 d5_010 d5_012 d5_014 d5_015 d5_017 d5_018 d5_020 d5_025 d5_026 d5_031 d5_032 d5_033 d5_044 d5_045 d5_049 d5_055 d5_059 d5_064 d5_070 d5_072 d5_074 d5_078 d5_079 d5_081 d5_083 d5_086 d5_088 d5_090 d5_091 d5_092 d5_094 d5_095 d5_096 d5_100 d5_101 d5_102 d5_103 d5_106 d5_108 d5_109 d5_110 d5_113 d5_116 d5_117 d5_121 d5_126 d5_134 d5_136 d5_137 d5_144 d5_147 d5_149 d5_152 d5_154 d5_155 d5_156 d5_158 d5_164 d5_165 d5_166 d5_171 d5_172 d5_176 d5_178 d5_180 d5_186 d5_187 d5_190 d5_193 d5_195 d5_203 d5_208 d5_209 d5_210 d5_216 d5_217 d5_218 d5_220 d5_222 d5_223 d5_224 d5_227 d5_231 d5_233 d5_236 d5_239 d5_240 d5_241 d5_243 d5_245 d5_246 d5_247 d5_250 d5_255 d5_256 d5_258 d5_259 d5_260 d5_261 d5_262 d5_264 d5_266 d5_267 d5_275 d5_276 d5_280 d5_290 d5_293 d5_295 d5_296 d5_299 d5_310 d5_312 d5_321 d5_327

### Low confidence (untagged)
The key turns on knowing a definition, technique, standard or rule, and no
principle's rule is the decisive step. D1-D3 carry a short reason per item;
D4 and D5 untagged items are technology, method or definition knowledge
items (network devices, cryptography, backup schemes, database models,
forensic techniques and similar).
- **D1** (53): d1_012 d1_155 (control classification by timing); d1_019 d1_128 (sampling evaluation); d1_021 (ITAF structure); d1_022 (legal owns interpretation; no principle covers relying on the competent function); d1_034 (objective vs measure definition); d1_035 (report structure); d1_038 (framework mapping knowledge); d1_039 d1_044 d1_167 (resourcing and proficiency); d1_041 (tightened evidence-quality: runner-up (schedule) does not lose on an evidence property); d1_043 (documentation retention); d1_045 d1_051 d1_060 (ITAF layers); d1_052 (charter authority); d1_053 (sampling risk definition); d1_055 (scaling audit management to size); d1_057 (AI-specific risk knowledge); d1_058 (application control adequacy); d1_067 (IS-specific control definition); d1_069 (fraud triangle); d1_077 (peer review scope); d1_081 (general control definition); d1_082 (control objectives flow from risk); d1_088 (integrated report format); d1_099 (QA monitoring design); d1_107 (sampling projection); d1_108 (AI drift indicators); d1_113 (charter contents); d1_117 (integrated audit staffing); d1_118 d1_151 (monitoring classification); d1_119 (AI control design); d1_121 d1_181 (ITAF standard knowledge); d1_126 d1_198 d1_199 (audit risk model); d1_131 (CSA facilitation); d1_138 (multi-regulation scope); d1_140 (agile audit method); d1_145 (rollout sequencing); d1_146 (whistleblower handling); d1_156 (defense in depth evaluation); d1_160 d1_178 (sampling size drivers); d1_170 (conflicting standards); d1_196 (finding elements); d1_197 (audit criteria); d1_210 (Code of Ethics confidentiality)
- **D2** (120): d2_001 (EGIT definition: board vs management roles); d2_003 (steering committee composition); d2_005 (GRC integration design); d2_007 (risk lifecycle knowledge); d2_014 (capability fit vs cost); d2_015 (KPI/KRI/KCI definitions); d2_016 (classification scheme design); d2_018 (fraud red flag); d2_019 (status misreporting (no principle names it)); d2_020 (QA metrics vs outcomes); d2_022 d2_070 (risk treatment options); d2_023 (strategic vs tactical plan); d2_024 (strategic plan contents); d2_025 (policy hierarchy); d2_026 (portfolio funding mix); d2_028 (improvement method (not an audit method)); d2_031 (KPI design); d2_032 (KRI definition); d2_033 (EA purpose: alignment vs cost); d2_034 (standard vs policy); d2_035 (COBIT design principles); d2_036 (vendor office structure); d2_038 (policy review triggers); d2_039 (GDPR Article 30); d2_040 (GDPR lawful basis); d2_041 (sourcing strategy vs cost); d2_043 (chargeback design); d2_047 (KPIs from critical success factors); d2_048 (quality framework fit); d2_051 (KCI definition); d2_052 (appetite vs tolerance); d2_053 (architecture waivers); d2_054 (top-down policy development); d2_055 (training design); d2_056 (sourcing model); d2_059 (board vs management roles (COBIT knowledge); no tool in play); d2_060 (RACI design); d2_064 (security program cadence); d2_065 (framework integration); d2_066 (privacy baseline design); d2_067 (cloud migration strategy); d2_073 (classification basis); d2_074 (COSO components); d2_075 (outcome-measurement knowledge); d2_076 (data inventory upkeep); d2_077 (PMO structure); d2_079 (SLA enforceability); d2_080 (FAIR); d2_081 (innovation governance); d2_083 (COBIT APO09); d2_086 (privacy by default); d2_088 (scenario ROI); d2_095 (stakeholder engagement); d2_096 (inventory drift detection); d2_098 (retention design); d2_100 (FinOps accountability); d2_105 (balanced scorecard); d2_106 (vendor exit); d2_107 (GDPR erasure exemption); d2_108 (emerging risk handling); d2_111 (business case content); d2_113 (compliance control library); d2_114 (committee structure); d2_115 (exit terms); d2_119 (CCoE role); d2_120 (governance reporting scope); d2_122 (GDPR/CCPA overlap); d2_124 (policy vs standard); d2_126 (classification first); d2_133 (insurance sizing); d2_134 (board portfolio reporting); d2_136 (alignment metric); d2_137 (executive security KPIs); d2_138 (committee cadence); d2_139 (cost of quality); d2_141 (IT vs enterprise change management); d2_142 (proportionate residency response); d2_145 (HIPAA/GDPR merger); d2_149 (global quality program); d2_153 (board reporting design); d2_155 (open-source monitoring); d2_157 (metric definitions); d2_159 (contract quality criteria); d2_162 (architecture fragmentation); d2_164 (residency architecture); d2_166 (vendor re-tiering); d2_169 (architecture roadmap); d2_172 (target setting); d2_173 (regulator inquiry response); d2_175 (policy consultation); d2_176 (performance baseline before targets (management metric design)); d2_177 (carve-out TSA); d2_178 (vendor renegotiation); d2_179 (ESG data governance); d2_180 (integrated governance design); d2_182 (local policy addendum); d2_183 (staged capacity funding); d2_186 (ISO/IEC 38500); d2_187 (strategy vs steering committee); d2_188 (ITIL 4 dimensions); d2_192 (document version control); d2_194 (QA criteria); d2_196 (quality criteria from user requirements); d2_199 (TOGAF implementation governance); d2_201 (background screening); d2_203 d2_204 (board vs management roles); d2_207 (mandatory leave); d2_208 (identify key roles before remedies (people risk knowledge)); d2_209 (backup retention); d2_210 (anonymization); d2_211 (ALE arithmetic); d2_212 (ordinal scales); d2_213 (contractual obligations); d2_216 (escrow vs SaaS); d2_217 (fourth-party risk); d2_218 (change-of-control clause); d2_223 (assess processing before documenting it); d2_224 (pseudonymization)
- **D3** (84): d3_001 (project charter); d3_006 (NPV vs payback (financial method)); d3_008 (agile velocity); d3_010 (test data masking); d3_013 (CAB role); d3_015 (escrow); d3_017 (hybrid agile); d3_018 (UAT exit criteria); d3_020 (scope split under deadline); d3_021 (projectized authority); d3_022 (input controls); d3_023 (SBOM); d3_024 (STRIDE); d3_025 (feasibility dimensions); d3_026 (function points); d3_027 (Scrum vs Kanban); d3_028 (DevSecOps ownership); d3_031 (DAST/IAST/RASP); d3_032 (branching); d3_033 (image signing); d3_034 (baseline before data); d3_035 (error budgets); d3_036 (phased cutover); d3_037 (earned value); d3_039 (license risk); d3_040 (cutover rehearsal); d3_041 (PMI process groups); d3_042 (data integrity); d3_043 (project closure); d3_045 (stakeholder analysis); d3_047 (agile documentation); d3_052 (dependency scanning); d3_055 (microservice governance); d3_058 (business case alternatives); d3_064 (code review); d3_065 (test pyramid); d3_066 d3_154 (PIR timing); d3_072 (DORA metrics); d3_073 (sensitivity analysis); d3_082 (boundary values); d3_083 (BDD); d3_085 (steering committee authority); d3_086 (feature flags); d3_087 (canary releases); d3_090 (parameter tables); d3_091 (retention before migration); d3_093 (production readiness); d3_094 (spiral model); d3_095 (mandatory projects); d3_099 (cutover decision gate); d3_100 (sunk cost); d3_101 (independent rebaseline); d3_104 (data cleansing); d3_105 (cancellation impact); d3_106 (distributed teams); d3_109 (architecture reversal); d3_110 (database selection); d3_111 (migration paths); d3_114 (decommissioning); d3_116 (conversion traceability); d3_118 (parallel run); d3_121 (PMO role); d3_122 (prototyping); d3_123 (generated code); d3_125 (waterfall sequence); d3_126 (Scrum events); d3_127 (continuous delivery vs deployment); d3_128 (UAT timing); d3_131 (PERT); d3_132 (critical path float); d3_133 (critical path progress); d3_134 (check digit); d3_135 (run-to-run totals); d3_138 (decision traceability); d3_139 (reverse engineering); d3_141 (audit trail content); d3_143 (testing in production); d3_144 (synthetic data); d3_146 (performance test targets (management test design)); d3_147 (regression scope); d3_148 (NPV vs IRR); d3_149 (payback screen); d3_150 (weighted vendor criteria)
- **D4** (148): d4_001 d4_002 d4_003 d4_006 d4_008 d4_009 d4_010 d4_013 d4_016 d4_017 d4_021 d4_023 d4_024 d4_027 d4_028 d4_031 d4_032 d4_034 d4_035 d4_036 d4_040 d4_044 d4_045 d4_046 d4_055 d4_056 d4_061 d4_062 d4_066 d4_067 d4_068 d4_072 d4_073 d4_077 d4_079 d4_084 d4_086 d4_088 d4_089 d4_091 d4_092 d4_094 d4_095 d4_097 d4_099 d4_100 d4_101 d4_102 d4_103 d4_104 d4_105 d4_106 d4_107 d4_113 d4_114 d4_121 d4_122 d4_125 d4_129 d4_130 d4_131 d4_132 d4_134 d4_135 d4_137 d4_140 d4_141 d4_142 d4_143 d4_146 d4_152 d4_154 d4_157 d4_158 d4_161 d4_162 d4_163 d4_165 d4_168 d4_169 d4_173 d4_175 d4_180 d4_182 d4_184 d4_187 d4_188 d4_189 d4_190 d4_192 d4_194 d4_195 d4_200 d4_202 d4_205 d4_206 d4_208 d4_210 d4_214 d4_215 d4_216 d4_217 d4_221 d4_227 d4_228 d4_232 d4_233 d4_237 d4_238 d4_239 d4_240 d4_242 d4_245 d4_246 d4_254 d4_256 d4_257 d4_261 d4_262 d4_266 d4_267 d4_268 d4_270 d4_274 d4_275 d4_277 d4_278 d4_282 d4_283 d4_284 d4_286 d4_287 d4_292 d4_294 d4_295 d4_296 d4_297 d4_298 d4_299 d4_301 d4_303 d4_304 d4_308 d4_310 d4_311 d4_312 d4_317 d4_318
- **D5** (139): d5_002 d5_003 d5_004 d5_005 d5_011 d5_013 d5_019 d5_021 d5_022 d5_023 d5_024 d5_028 d5_029 d5_035 d5_036 d5_040 d5_041 d5_042 d5_043 d5_046 d5_047 d5_050 d5_051 d5_053 d5_054 d5_056 d5_061 d5_062 d5_063 d5_065 d5_066 d5_067 d5_068 d5_069 d5_075 d5_076 d5_082 d5_084 d5_087 d5_093 d5_097 d5_104 d5_114 d5_120 d5_122 d5_125 d5_128 d5_129 d5_130 d5_132 d5_133 d5_138 d5_139 d5_141 d5_142 d5_145 d5_146 d5_148 d5_150 d5_151 d5_153 d5_157 d5_161 d5_162 d5_163 d5_167 d5_168 d5_169 d5_173 d5_174 d5_181 d5_188 d5_189 d5_191 d5_192 d5_194 d5_199 d5_202 d5_204 d5_205 d5_206 d5_214 d5_221 d5_225 d5_226 d5_228 d5_229 d5_230 d5_234 d5_235 d5_237 d5_242 d5_244 d5_249 d5_251 d5_257 d5_263 d5_265 d5_268 d5_269 d5_271 d5_278 d5_281 d5_282 d5_283 d5_284 d5_285 d5_286 d5_287 d5_288 d5_291 d5_292 d5_298 d5_300 d5_301 d5_302 d5_304 d5_305 d5_306 d5_307 d5_308 d5_309 d5_311 d5_313 d5_314 d5_315 d5_316 d5_317 d5_318 d5_319 d5_320 d5_322 d5_323 d5_325 d5_328 d5_329 d5_330 d5_334 d5_335

## Rollout plan
1. **D1 pilot and panel review.** Done (above).
2. **D2-D5 tagging.** Done (above). Next: a second reader checks each
   domain's medium list.
3. **Tighten.** When every domain is tagged, make a missing `principle_id` an
   error for new questions (authoring templates and `lint_exam_style_v2.py`).
4. **Ship the learner-visible parts with a version bump.** The 21st principle
   and the widened "Appears in" domains reach learners through the shared
   principles file, so the release that carries them needs a web MINOR bump
   with a What's New line (and a mobile version bump if the pack ships).
5. **UI (separate PRs, web version bump).** The principle pages count and run
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
