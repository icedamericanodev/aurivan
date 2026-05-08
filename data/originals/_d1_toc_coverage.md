# D1 Coverage vs ISACA CISA Review Manual TOC

**Source:** ISACA CISA Official Review Manual, 28th Edition — Domain 1 (Information Systems Auditing Process), Table of Contents.

**Purpose:** map each authored D1 question (`d1_001` … `d1_NNN`) back to the Review Manual subsection it covers, so future authoring batches can target genuine TOC gaps rather than re-derive coverage from `data/originals/d1.json` each session.

**Maintenance rule:** update this doc in the same PR that lands a new authoring batch. Counts at the bottom must match `data/originals/_concept_queue.yaml` and `data/originals/d1.json`.

**Last updated:** after batch 6 (d1_051..d1_060). Total D1 questions authored: 60 of 180.

## Part A — Planning

### 1.1 IS Audit Standards, Guidelines, Functions and Codes of Ethics

| TOC | Subsection | Covered by |
|---|---|---|
| 1.1.1 | ISACA IS Audit and Assurance Standards | d1_051 (foundational) |
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
| 1.3.3 | Audit Risk and Materiality | d1_007 |
| 1.3.4 | Risk Assessment | d1_037 |
| 1.3.5 | IS Audit Risk Assessment Techniques | d1_027 |
| 1.3.6 | Risk Analysis | d1_033 (Risk Treatment Options) |

Also: d1_003 covers the broader concept of risk-based audit planning at the function level, supporting 1.3 generally.

### 1.4 Types of Controls and Considerations

| TOC | Subsection | Covered by |
|---|---|---|
| 1.4.1 | Internal Controls | d1_023 |
| 1.4.2 | Control Objectives and Control Measures | d1_034 (parent), d1_058 (Business Process Applications and Controls sub-area) |
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
| 1.5.5 | Fraud, Irregularities and Illegal Acts | d1_010 |
| 1.5.6 | Agile Auditing | d1_029 |

### 1.6 Audit Testing and Sampling Methodology

| TOC | Subsection | Covered by |
|---|---|---|
| 1.6.1 | Compliance Versus Substantive Testing | d1_005 |
| 1.6.2 | Sampling — Approach Selection | d1_009 |
| 1.6.2 | Sampling — Sampling Risk (foundational definition) | d1_053 |
| 1.6.2 | Sampling — Sampling Risk and Conclusion (scenario) | d1_019 |
| 1.6.2 | Sampling — Attribute vs Variable Selection | d1_049 |

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

### 1.9 Reporting and Communication Techniques

| TOC | Subsection | Covered by |
|---|---|---|
| 1.9.1 | Communicating Audit Results — Addressee | d1_006 |
| 1.9.1 | Communicating Audit Results — Severity Calibration / Exit Conference | d1_050 |
| 1.9.2 | Audit Report Objectives | d1_042 |
| 1.9.3 | Audit Report Structure and Contents | d1_035 |
| 1.9.4 | Audit Documentation (Lifecycle / Retention) | d1_043 |
| 1.9.5 | Follow-Up Activities | d1_015 |
| 1.9.6 | Types of IS Audit Reports / Opinion Types | d1_036 |

### 1.10 Quality Assurance and Improvement of the Audit Process

| TOC | Subsection | Covered by |
|---|---|---|
| 1.10.1 | Audit Committee Oversight / Escalation | d1_016 |
| 1.10.2 | Audit Quality Assurance | d1_030 |
| 1.10.3 | Audit Team Training and Development | d1_044 |
| 1.10.4 | Monitoring (ongoing QA) | d1_048 |

## Coverage summary

- **Numbered subsections in TOC:** 46 leaf subsections across 1.1.1 through 1.10.4 (counting sub-bullets like Audit Charter, IS Audit Resource Management, Sampling Risk separately where the Review Manual lists them).
- **Subsections with at least one authored question:** 46 of 46 after batch 6.
- **Subsections with deeper coverage (multiple questions):** 1.1.5 (5 questions across the audit-function sub-bullets), 1.6.2 (4 questions across sampling sub-areas), 1.5.2 (3 questions across the three phases), 1.9.1 (2 questions), 1.4.3 (2 questions), 1.2.1 (2 questions), 1.4.2 (2 questions across parent + BP sub-area), 1.8.4 (2 questions across parent + risk sub-area), 1.1.4 (2 questions across parent + Tools and Techniques layer).
- **All 46 leaf subsections now have at least one question.** Future batches add depth (multiple angles per high-weight subsection) rather than fill leaf gaps.

## Difficulty mix tracking

| Tier | Target (180) | Authored after batch 6 | Gap |
|---|---|---|---|
| Foundational | 18 (10%) | 3 | -15 |
| Application | 90 (50%) | 35 | -55 |
| Analysis | 72 (40%) | 22 | -50 |
| **Total** | **180** | **60** | **-120** |

The foundational tier remains the largest under-shoot proportionally. Future batches should keep including 2-3 foundational items per 10 until the gap closes.

## High-priority depth targets for future batches

These are subsections where exam weight + analytical depth justify a second or third question:

1. **1.6.2 Sampling** — already 4 questions; one more on stratified or monetary-unit-sampling mechanics would round out the category.
2. **1.9.1 Communicating Audit Results** — exit-conference dynamics beyond severity, follow-up communication cadence, tone calibration for sensitive findings.
3. **1.5.5 Fraud, Irregularities and Illegal Acts** — fraud-triangle indicators, when to engage forensic specialists, evidence-handling under fraud conditions (currently only d1_010 first-action).
4. **1.8.4 AI/ML in IS Audit** — algorithmic auditability, training-data review techniques, challenger-model testing.
5. **1.10.2 Audit Quality Assurance** — external assessment cadence, peer review, internal QA program design (currently only d1_030 parent).
6. **1.4.2 Control Objectives and Measures** — sub-areas (IS Control Objectives definition, General Control Methods, IS-Specific Controls) beyond d1_034 parent and d1_058 BP-applications sub-area.

## Maintenance instructions for the next session

1. Author batch N → append questions to `data/originals/d1.json`.
2. **Update this doc:** add new question IDs to the TOC table above; update the "Last updated" line; recalculate the difficulty-mix table.
3. Update `data/originals/_concept_queue.yaml` `covered:` list, `authored_total`, and `authored_mix` to match.
4. Verify the three artifacts are in sync: this doc, the concept queue, and `d1.json` itself.
5. Commit all three files in the same PR.
