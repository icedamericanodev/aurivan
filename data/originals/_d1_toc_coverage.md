# D1 Coverage vs ISACA CISA Review Manual TOC

**Source:** ISACA CISA Official Review Manual, 28th Edition — Domain 1 (Information Systems Auditing Process), Table of Contents.

**Purpose:** map each authored D1 question (`d1_001` … `d1_NNN`) back to the Review Manual subsection it covers, so future authoring batches can target genuine TOC gaps rather than re-derive coverage from `data/originals/d1.json` each session.

**Maintenance rule:** update this doc in the same PR that lands a new authoring batch. Counts at the bottom must match `data/originals/_concept_queue.yaml` and `data/originals/d1.json`.

**Last updated:** after batch 7 (d1_061..d1_070). Total D1 questions authored: 70 of 180.

## Part A — Planning

### 1.1 IS Audit Standards, Guidelines, Functions and Codes of Ethics

| TOC | Subsection | Covered by |
|---|---|---|
| 1.1.1 | ISACA IS Audit and Assurance Standards | d1_051 (foundational definition) |
| 1.1.2 | ISACA IS Audit and Assurance Guidelines | d1_045 |
| 1.1.3 | ISACA Code of Professional Ethics | d1_031 |
| 1.1.4 | ITAF | d1_021 (parent), d1_060 (Tools and Techniques layer) |
| 1.1.5 | IS Internal Audit Function — Audit Charter | d1_001 (authority scenario), d1_052 (foundational definition) |
| 1.1.5 | IS Internal Audit Function — Management of the IS Audit Function | d1_055 |
| 1.1.5 | IS Internal Audit Function — IS Audit Resource Management | d1_039 |
| 1.1.5 | IS Internal Audit Function — Personal Independence (Self-Review) | d1_002 |
| 1.1.5 | IS Internal Audit Function — Using the Services of Other Auditors and Experts | d1_032 |

### 1.2 Types of Audits, Assessments and Reviews

| TOC | Subsection | Covered by |
|---|---|---|
| 1.2.1 | Control Self-Assessment | d1_020 (limitations), d1_059 (deployment decision) |
| 1.2.2 | Integrated Auditing | d1_017 |

### 1.3 Risk-Based Audit Planning

| TOC | Subsection | Covered by |
|---|---|---|
| 1.3.1 | Individual Audit Assignments | d1_056 |
| 1.3.2 | Effect of Laws and Regulations on IS Audit Planning | d1_022 |
| 1.3.3 | Audit Risk and Materiality (scenario) | d1_007 |
| 1.3.3 | Audit Risk Model Components (foundational definition) | d1_062 |
| 1.3.4 | Risk Assessment | d1_037 |
| 1.3.5 | IS Audit Risk Assessment Techniques | d1_027 |
| 1.3.6 | Risk Analysis | d1_033 (Risk Treatment Options) |

Also: d1_003 covers the broader concept of risk-based audit planning at the function level, supporting 1.3 generally.

### 1.4 Types of Controls and Considerations

| TOC | Subsection | Covered by |
|---|---|---|
| 1.4.1 | Internal Controls (scenario) | d1_023 |
| 1.4.1 | Internal Controls — Definition (foundational, reasonable assurance) | d1_063 |
| 1.4.2 | Control Objectives and Control Measures | d1_034 (parent), d1_058 (Business Process Applications and Controls sub-area), d1_067 (IS-Specific Controls sub-area) |
| 1.4.3 | Control Classifications | d1_008, d1_012 |
| 1.4.4 | Control Relationship to Risk | d1_047 |
| 1.4.5 | Prescriptive Controls and Frameworks | d1_038 |
| 1.4.6 | Evaluation of the Control Environment | d1_028 |

## Part B — Execution

### 1.5 Audit Project Management

| TOC | Subsection | Covered by |
|---|---|---|
| 1.5.1 | Audit Objectives | d1_024 |
| 1.5.2 | Audit Phases — Planning | d1_040 |
| 1.5.2 | Audit Phases — Fieldwork/Documentation | d1_041 |
| 1.5.2 | Audit Phases — Reporting/Follow Up | d1_054 |
| 1.5.3 | Audit Programs | d1_011 |
| 1.5.4 | Audit Work Papers | d1_014 |
| 1.5.5 | Fraud — Auditor's First Action | d1_010 |
| 1.5.5 | Fraud Triangle — Indicator Identification (analysis) | d1_069 |
| 1.5.5 | Forensic Specialist Engagement Decision (analysis) | d1_070 |
| 1.5.6 | Agile Auditing | d1_029 |

### 1.6 Audit Testing and Sampling Methodology

| TOC | Subsection | Covered by |
|---|---|---|
| 1.6.1 | Compliance Versus Substantive Testing (scenario) | d1_005 |
| 1.6.1 | Compliance vs Substantive Testing — Definition (foundational) | d1_061 |
| 1.6.2 | Sampling — Approach Selection | d1_009 |
| 1.6.2 | Sampling — Sampling Risk (foundational definition) | d1_053 |
| 1.6.2 | Sampling — Sampling Risk and Conclusion (scenario) | d1_019 |
| 1.6.2 | Sampling — Attribute vs Variable Selection | d1_049 |
| 1.6.2 | Sampling — Monetary-Unit Sampling Mechanics | d1_064 |

### 1.7 Audit Evidence Collection Techniques

| TOC | Subsection | Covered by |
|---|---|---|
| 1.7 | Audit Evidence Reliability | d1_004 |
| 1.7.1 | Interviewing and Observing Personnel | d1_025 |

### 1.8 Audit Data Analytics

| TOC | Subsection | Covered by |
|---|---|---|
| 1.8.1 | Computer-Assisted Audit Techniques | d1_026 |
| 1.8.2 | Continuous Auditing and Monitoring | d1_013 |
| 1.8.3 | Continuous Auditing Techniques | d1_046 |
| 1.8.4 | Artificial Intelligence in IS Audit (parent) | d1_018 |
| 1.8.4 | AI/ML — Audit Risk and Considerations | d1_057 |
| 1.8.4 | AI/ML — Training-Data Review Techniques | d1_066 |

### 1.9 Reporting and Communication Techniques

| TOC | Subsection | Covered by |
|---|---|---|
| 1.9.1 | Communicating Audit Results — Addressee | d1_006 |
| 1.9.1 | Communicating Audit Results — Severity Calibration | d1_050 |
| 1.9.1 | Communicating Audit Results — Exit Conference Purpose (broader) | d1_068 |
| 1.9.2 | Audit Report Objectives | d1_042 |
| 1.9.3 | Audit Report Structure and Contents | d1_035 |
| 1.9.4 | Audit Documentation (Lifecycle / Retention) | d1_043 |
| 1.9.5 | Follow-Up Activities | d1_015 |
| 1.9.6 | Types of IS Audit Reports / Opinion Types | d1_036 |

### 1.10 Quality Assurance and Improvement of the Audit Process

| TOC | Subsection | Covered by |
|---|---|---|
| 1.10.1 | Audit Committee Oversight / Escalation | d1_016 |
| 1.10.2 | Audit Quality Assurance (program parent) | d1_030 |
| 1.10.2 | Audit Quality Assurance — External Assessment Cadence | d1_065 |
| 1.10.3 | Audit Team Training and Development | d1_044 |
| 1.10.4 | Monitoring (ongoing QA) | d1_048 |

## Coverage summary

- **Numbered subsections in TOC:** 46 leaf subsections across 1.1.1 through 1.10.4 (counting sub-bullets like Audit Charter, IS Audit Resource Management, Sampling Risk separately where the Review Manual lists them).
- **Subsections with at least one authored question:** 46 of 46 after batch 7 (achieved at batch 6).
- **Subsections with deeper coverage (multiple questions) after batch 7:** 1.6.2 (5 questions across approach selection + sampling risk + attribute-vs-variable + MUS mechanics), 1.1.5 (5 questions across the audit-function sub-bullets), 1.5.5 (3 questions: first-action + triangle indicators + forensic engagement), 1.5.2 (3 questions across the three phases), 1.9.1 (3 questions: addressee + severity calibration + exit conference purpose), 1.4.2 (3 questions across parent + BP applications + IS-specific controls), 1.8.4 (3 questions across parent + audit risk + training-data review), 1.10.2 (2 questions: program parent + external assessment cadence), 1.4.3 (2 questions), 1.2.1 (2 questions), 1.4.1 (2 questions: scenario + foundational definition), 1.6.1 (2 questions: scenario + foundational definition), 1.3.3 (2 questions: materiality scenario + audit-risk model definition), 1.1.4 (2 questions across parent + Tools and Techniques layer).
- **All 46 leaf subsections now have at least one question.** Future batches add depth (multiple angles per high-weight subsection) rather than fill leaf gaps.

## Difficulty mix tracking

| Tier | Target (180) | Authored after batch 7 | Gap |
|---|---|---|---|
| Foundational | 18 (10%) | 6 | -12 |
| Application | 90 (50%) | 40 | -50 |
| Analysis | 72 (40%) | 24 | -48 |
| **Total** | **180** | **70** | **-110** |

The foundational tier is closing — 6/18 (33%) after batch 7, up from 3/18 (17%) after batch 6. Continuing to include 2-3 foundational items per batch keeps us on track to close the gap by ~batch 13.

## High-priority depth targets for future batches

After batch 7, the original list has been substantially worked. Updated priorities:

1. **1.6.2 Sampling — stratified sampling mechanics** — d1_064 covered MUS; stratified is the remaining major sub-technique.
2. **1.9.1 Communicating Audit Results — follow-up communication cadence and tone for sensitive findings** — d1_006/d1_016/d1_050/d1_068 cover addressee, escalation, severity, exit-conference purpose. Room for tone calibration and follow-up cadence.
3. **1.8.4 AI/ML — algorithmic auditability and challenger-model testing** — d1_018/d1_057/d1_066 cover parent + audit risk + training-data. Algorithmic auditability is the remaining angle.
4. **1.10.2 Audit Quality Assurance — internal QA program design / peer review** — d1_030/d1_065 cover program parent + external cadence. Internal QA design + peer review remain.
5. **1.4.2 Control Objectives — IS Control Objectives sub-area / General Control Methods sub-area** — d1_034/d1_058/d1_067 cover parent + BP applications + IS-specific. The other two sub-areas remain.
6. **1.8.1 CAATs as a Continuous Online Audit Approach** — d1_026 covers CAATs broadly, d1_013 distinguishes continuous auditing vs monitoring. The continuous-online sub-bullet remains.

**Foundational tier candidates** (6/18 -> need ~12 more, distributed across batches): Audit Charter contents (vs purpose, d1_052), CSA definition, Continuous Auditing definition, ITAF Tools and Techniques definition, Audit Programs definition, Work Papers definition, Materiality definition, Risk-based audit definition, Integrated Audit definition, Audit Committee definition, Sampling — population/sample/precision definitions.

## Maintenance instructions for the next session

1. Author batch N → append questions to `data/originals/d1.json`.
2. **Update this doc:** add new question IDs to the TOC table above; update the "Last updated" line; recalculate the difficulty-mix table.
3. Update `data/originals/_concept_queue.yaml` `covered:` list, `authored_total`, and `authored_mix` to match.
4. Verify the three artifacts are in sync: this doc, the concept queue, and `d1.json` itself.
5. Commit all three files in the same PR.
