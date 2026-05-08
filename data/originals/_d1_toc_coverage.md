# D1 Coverage vs ISACA CISA Review Manual TOC

**Source:** ISACA CISA Official Review Manual, 28th Edition — Domain 1 (Information Systems Auditing Process), Table of Contents.

**Purpose:** map each authored D1 question (`d1_001` … `d1_NNN`) back to the Review Manual subsection it covers, so future authoring batches can target genuine TOC gaps rather than re-derive coverage from `data/originals/d1.json` each session.

**Maintenance rule:** update this doc in the same PR that lands a new authoring batch. Counts at the bottom must match `data/originals/_concept_queue.yaml` and `data/originals/d1.json`.

**Last updated:** after batch 11 (d1_131..d1_150). Total D1 questions authored: 150 of 180 (83%). **Foundational tier at 18/18 — target met.**

## Part A — Planning

### 1.1 IS Audit Standards, Guidelines, Functions and Codes of Ethics

| TOC | Subsection | Covered by |
|---|---|---|
| 1.1.1 | ISACA IS Audit and Assurance Standards | d1_051 (foundational definition) |
| 1.1.4 | ITAF | d1_021 (parent), d1_060 (Tools and Techniques layer scenario), d1_091 (Tools and Techniques foundational definition), d1_121 (specific Standard purposes) |
| 1.1.2 | ISACA IS Audit and Assurance Guidelines | d1_045 |
| 1.1.3 | ISACA Code of Professional Ethics | d1_031 |
| 1.1.5 | IS Internal Audit Function — Audit Charter | d1_001 (authority scenario), d1_052 (purpose foundational), d1_113 (contents foundational) |
| 1.1.5 | IS Internal Audit Function — Management of the IS Audit Function | d1_055 |
| 1.1.5 | IS Internal Audit Function — IS Audit Resource Management | d1_039 |
| 1.1.5 | IS Internal Audit Function — Personal Independence (Self-Review) | d1_002 |
| 1.1.5 | IS Internal Audit Function — Independence (Threat-and-Safeguard Analysis) | d1_087 (analysis) |
| 1.1.5 | IS Internal Audit Function — Independence (Self-Interest Threat Severity Differentiation Mid-Engagement) | d1_105 (analysis) |
| 1.1.5 | IS Internal Audit Function — Independence (Long-Tenure Familiarity Threat) | d1_125 (analysis) |
| 1.1.5 | IS Internal Audit Function — External Auditor Coordination (AS 2605 reliance) | d1_149 (analysis) |
| 1.1.5 | IS Internal Audit Function — Using the Services of Other Auditors and Experts (pre-reliance) | d1_032 |
| 1.1.5 | IS Internal Audit Function — External Expert Inadequate Work (post-delivery) | d1_090 (analysis) |

### 1.2 Types of Audits, Assessments and Reviews

| TOC | Subsection | Covered by |
|---|---|---|
| 1.2.1 | Control Self-Assessment | d1_020 (limitations), d1_059 (deployment decision), d1_073 (foundational definition + objectives), d1_131 (workshop facilitation), d1_132 (results integration) |
| 1.2.2 | Integrated Auditing | d1_017 (application), d1_088 (analysis — scope decision), d1_111 (foundational definition), d1_117 (audit-team composition) |

### 1.3 Risk-Based Audit Planning

| TOC | Subsection | Covered by |
|---|---|---|
| 1.3.1 | Individual Audit Assignments | d1_056 (scoping application), d1_074 (foundational risk-based-planning definition), d1_100 (audit universe definition + maintenance), d1_127 (analysis — resource-constraint plan adjustment), d1_142 (analysis — multi-entity universe) |
| 1.3.2 | Effect of Laws and Regulations on IS Audit Planning | d1_022 (parent), d1_138 (sector-overlap HIPAA + GLBA) |
| 1.3.3 | Audit Risk and Materiality (scenario) | d1_007 |
| 1.3.3 | Audit Risk Model Components (foundational definition) | d1_062 |
| 1.3.3 | Materiality (foundational definition) | d1_094 |
| 1.3.3 | Audit Risk Model Applied — Setting Detection Risk (analysis) | d1_126 |
| 1.3.4 | Risk Assessment | d1_037, d1_106 (mid-cycle update), d1_147 (method choice heat-map vs FAIR vs ISO 31000) |
| 1.3.5 | IS Audit Risk Assessment Techniques | d1_027, d1_097 (quantitative vs qualitative trade-offs) |
| 1.3.6 | Risk Analysis | d1_033 (Risk Treatment Options), d1_124 (Treatment Selection multi-control trade-offs) |

Also: d1_003 covers the broader concept of risk-based audit planning at the function level, supporting 1.3 generally.

### 1.4 Types of Controls and Considerations

| TOC | Subsection | Covered by |
|---|---|---|
| 1.4.1 | Internal Controls (scenario) | d1_023 |
| 1.4.1 | Internal Controls — Definition (foundational, reasonable assurance) | d1_063 |
| 1.4.2 | Control Objectives and Control Measures | d1_034 (parent), d1_058 (Business Process Applications), d1_067 (IS-Specific Controls), d1_081 (General Control Methods), d1_082 (IS Control Objectives sub-area), d1_104 (ITGC — Change Management), d1_123 (ITGC — Logical Access) |
| 1.4.3 | Control Classifications | d1_008, d1_012 |
| 1.4.4 | Control Relationship to Risk | d1_047 |
| 1.4.5 | Prescriptive Controls and Frameworks | d1_038 (DFARS+NIS2), d1_135 (NIST CSF + ISO 27001 cross-walk), d1_136 (SOX + COBIT cross-walk) |
| 1.4.6 | Evaluation of the Control Environment | d1_028 (parent), d1_098 (independent vs management monitoring), d1_118 (management monitoring sub-area depth) |

## Part B — Execution

### 1.5 Audit Project Management

| TOC | Subsection | Covered by |
|---|---|---|
| 1.5.1 | Audit Objectives | d1_024 |
| 1.5.2 | Audit Phases — Planning | d1_040 |
| 1.5.2 | Audit Phases — Fieldwork/Documentation | d1_041 |
| 1.5.2 | Audit Phases — Reporting/Follow Up | d1_054 (phase discipline), d1_120 (reporting-phase communication tactics) |
| 1.5.2 | Audit Phases — End-to-End Engagement Design Synthesis | d1_150 (analysis) |
| 1.5.3 | Audit Programs | d1_011 (scenario), d1_071 (foundational definition) |
| 1.5.4 | Audit Work Papers | d1_014 (scenario), d1_072 (foundational definition) |
| 1.5.5 | Fraud — Auditor's First Action | d1_010 |
| 1.5.5 | Fraud Triangle — Indicator Identification (analysis) | d1_069 |
| 1.5.5 | Forensic Specialist Engagement Decision (analysis) | d1_070 |
| 1.5.5 | Fraud — Evidence Handling and Chain of Custody | d1_084 |
| 1.5.5 | Fraud — Interview Techniques in Suspected Fraud | d1_096 |
| 1.5.5 | Fraud — Reporting Suspected Fraud (Channels and Timing) | d1_115 |
| 1.5.5 | Fraud — Investigation Lifecycle Integration (handoff to forensic) | d1_141 (analysis) |
| 1.5.5 | Whistleblower Allegation — Integration into Audit Conclusions | d1_146 (analysis) |
| 1.5.6 | Agile Auditing | d1_029 (parent), d1_140 (sprint design + retrospectives) |

### 1.6 Audit Testing and Sampling Methodology

| TOC | Subsection | Covered by |
|---|---|---|
| 1.6.1 | Compliance Versus Substantive Testing (scenario) | d1_005 |
| 1.6.1 | Compliance vs Substantive Testing — Definition (foundational) | d1_061 |
| 1.6.1 | Substantive Testing — Analytical Procedures | d1_103 |
| 1.6.1 | Substantive Testing — Foundational Definition | d1_112 |
| 1.6.2 | Sampling — Approach Selection | d1_009 |
| 1.6.2 | Sampling — Sampling Risk (foundational definition) | d1_053 |
| 1.6.2 | Sampling — Sampling Risk and Conclusion (scenario) | d1_019 |
| 1.6.2 | Sampling — Attribute vs Variable Selection | d1_049 |
| 1.6.2 | Sampling — Monetary-Unit Sampling Mechanics | d1_064 |
| 1.6.2 | Sampling — Stratified Sampling Mechanics | d1_075 |
| 1.6.2 | Sampling — Multi-objective Sampling Design (analysis) | d1_086 |
| 1.6.2 | Sampling — Misstatement Projection (analysis) | d1_107 |
| 1.6.2 | Sampling — Population Definition (foundational) | d1_114 |
| 1.6.2 | Sampling — Precision Setting (Acceptable Risk + Tolerable Error) | d1_116 |
| 1.6.2 | Sampling — Sample Re-Design when Initial Insufficient (analysis) | d1_128 |
| 1.6.2 | Sampling — Selection Between Equally-Defensible Techniques (analysis) | d1_143 |

### 1.7 Audit Evidence Collection Techniques

| TOC | Subsection | Covered by |
|---|---|---|
| 1.7 | Audit Evidence — Reliability principle | d1_004 |
| 1.7 | Audit Evidence — Types and Reliability Ranking | d1_095 |
| 1.7 | Audit Evidence — Sufficiency vs Appropriateness | d1_102 |
| 1.7 | Audit Evidence — Electronic Evidence Integrity | d1_133 |
| 1.7 | Audit Evidence — Third-Party Confirmation (positive vs negative) | d1_134 |
| 1.7.1 | Interviewing and Observing Personnel | d1_025 |

### 1.8 Audit Data Analytics

| TOC | Subsection | Covered by |
|---|---|---|
| 1.8.1 | Computer-Assisted Audit Techniques | d1_026 (parent) |
| 1.8.1 | CAATs as Continuous Online Audit Approach | d1_083 |
| 1.8.2 | Continuous Auditing and Monitoring | d1_013 |
| 1.8.2 | Continuous Auditing — Foundational Definition | d1_092 |
| 1.8.2 | Continuous Auditing — Implementation Roadmap (migration from periodic) | d1_145 (analysis) |
| 1.8.2 | SOX Context — Continuous Monitoring vs Continuous Auditing Applied | d1_148 (analysis) |
| 1.8.3 | Continuous Auditing Techniques | d1_046 |
| 1.8.3 | Continuous Auditing — Architecture Trade-offs (analysis) | d1_110 |
| 1.8.3 | Continuous Auditing — Decision to Suspend Production on Detected Anomaly (analysis) | d1_130 |
| 1.8.4 | Artificial Intelligence in IS Audit (parent) | d1_018 |
| 1.8.4 | AI/ML — Audit Risk and Considerations | d1_057 |
| 1.8.4 | AI/ML — Training-Data Review Techniques | d1_066 |
| 1.8.4 | AI/ML — Algorithmic Auditability | d1_080 |
| 1.8.4 | AI/ML — Challenger-Model Testing (analysis) | d1_085 |
| 1.8.4 | AI/ML — Drift Detection (analysis) | d1_108 |
| 1.8.4 | AI/ML — Adversarial Robustness / Prompt Injection (LLM-based) | d1_119 |
| 1.8.4 | AI/ML — Full Lifecycle Audit (analysis) | d1_144 |

### 1.9 Reporting and Communication Techniques

| TOC | Subsection | Covered by |
|---|---|---|
| 1.9.1 | Communicating Audit Results — Addressee | d1_006 |
| 1.9.1 | Communicating Audit Results — Severity Calibration | d1_050 |
| 1.9.1 | Communicating Audit Results — Exit Conference Purpose (broader) | d1_068 |
| 1.9.1 | Communicating Audit Results — Tone Calibration for Sensitive Findings | d1_079 |
| 1.9.1 | Communicating Audit Results — Auditor-Management Disagreement (analysis) | d1_129 |
| 1.9.2 | Audit Report Objectives | d1_042 |
| 1.9.3 | Audit Report Structure and Contents | d1_035 |
| 1.9.4 | Audit Documentation (Lifecycle / Retention) | d1_043 |
| 1.9.4 | Audit Documentation — Originals vs Summary Retention | d1_101 |
| 1.9.4 | Audit Documentation — Cross-References (Work Papers ↔ Findings ↔ Evidence) | d1_122 |
| 1.9.5 | Follow-Up Activities | d1_015 (scenario) |
| 1.9.5 | Follow-Up Communication Cadence (risk-tiered) | d1_078 |
| 1.9.6 | Types of IS Audit Reports / Opinion Types | d1_036 |
| 1.9.6 | Modified Opinion Decision (analysis) | d1_109 |

### 1.10 Quality Assurance and Improvement of the Audit Process

| TOC | Subsection | Covered by |
|---|---|---|
| 1.10.1 | Audit Committee Oversight / Escalation | d1_016 (application) |
| 1.10.1 | Audit Committee — Escalation Timing Decision (analysis) | d1_089 |
| 1.10.1 | Audit Committee — Foundational Definition (board-level, independent directors) | d1_093 |
| 1.10.1 | Audit Committee — Financial-Expert Composition (SOX 407 / SEC) | d1_139 |
| 1.1.1 | ISACA IS Audit and Assurance Standards — Specific Standard Purposes | d1_121 |
| 1.10.2 | Audit Quality Assurance (program parent) | d1_030 |
| 1.10.2 | Audit Quality Assurance — External Assessment Cadence | d1_065 |
| 1.10.2 | Audit Quality Assurance — Internal Program Design | d1_076 |
| 1.10.2 | Audit Quality Assurance — Peer Review (Engagement vs Program) | d1_077 |
| 1.10.3 | Audit Team Training and Development | d1_044 (function-level), d1_137 (engagement-specific competency-gap diagnosis) |
| 1.10.4 | Monitoring (ongoing QA — failure analysis) | d1_048 |
| 1.10.4 | Monitoring — Design Depth (cadence/scope/coverage) | d1_099 |

## Coverage summary

- **Numbered subsections in TOC:** 46 leaf subsections across 1.1.1 through 1.10.4 (counting sub-bullets like Audit Charter, IS Audit Resource Management, Sampling Risk separately where the Review Manual lists them).
- **Subsections with at least one authored question:** 46 of 46 after batch 7 (achieved at batch 6).
- **Subsections with deeper coverage (multiple questions) after batch 7:** 1.6.2 (5 questions across approach selection + sampling risk + attribute-vs-variable + MUS mechanics), 1.1.5 (5 questions across the audit-function sub-bullets), 1.5.5 (3 questions: first-action + triangle indicators + forensic engagement), 1.5.2 (3 questions across the three phases), 1.9.1 (3 questions: addressee + severity calibration + exit conference purpose), 1.4.2 (3 questions across parent + BP applications + IS-specific controls), 1.8.4 (3 questions across parent + audit risk + training-data review), 1.10.2 (2 questions: program parent + external assessment cadence), 1.4.3 (2 questions), 1.2.1 (2 questions), 1.4.1 (2 questions: scenario + foundational definition), 1.6.1 (2 questions: scenario + foundational definition), 1.3.3 (2 questions: materiality scenario + audit-risk model definition), 1.1.4 (2 questions across parent + Tools and Techniques layer).
- **All 46 leaf subsections now have at least one question.** Future batches add depth (multiple angles per high-weight subsection) rather than fill leaf gaps.

## Difficulty mix tracking

| Tier | Target (180) | Authored after batch 11 | Gap |
|---|---|---|---|
| Foundational | 18 (10%) | 18 | **0 — TARGET MET** |
| Application | 90 (50%) | 80 | -10 |
| Analysis | 72 (40%) | 52 | -20 |
| **Total** | **180** | **150** | **-30** |

D1 is at **83%**. Foundational tier remains closed at 18/18. Remaining gap is 30 questions across application (-10) and analysis (-20). At ~20 questions per batch, D1 reaches 180 at batch 12 + a smaller batch 13 (or batch 12 = 170, batch 13 = 10 to close).

## High-priority depth targets for batches 12-13 (closing 30 questions: -10A, -20An)

After batch 11, most exam-heavy subsections have substantial depth. Foundational tier closed; remaining gap is 30 questions. Future batches shift to **0 foundational + ~5 application + ~10-15 analysis** to close the analysis-heavy gap.

Remaining priorities:

1. **Analysis-tier synthesis questions** — analysis tier has the largest remaining gap (-20). Future analysis questions can synthesize across multiple TOC areas (e.g., end-to-end audit-engagement analysis, compound regulatory + technical scenarios).
2. **1.4.6 Control Environment — COSO Component 5 monitoring-activity specifics** — d1_028/098/118 cover parent + independent-vs-management + management sub-area. COSO Component 5 specifics (separate evaluations vs ongoing evaluations) remain.
3. **1.10.4 Ongoing QA Monitoring — Specific monitoring techniques** — d1_048/099 cover failure-analysis + design-depth. Automated work-paper review, supervision-sampling techniques remain.
4. **1.8.1 CAATs — Additional sub-areas** — d1_026/083 cover parent + continuous-online-CAATs. Generalized audit software (GAS) sub-area, CAATs vs ITF (integrated test facility) sub-area remain.
5. **1.4.4 Control Relationship to Risk — Multi-control mapping** — d1_047 covers single-control. Multi-control mapping to a single risk (defense-in-depth) and single-control mapping to multiple risks remain.
6. **1.4.3 Control Classifications — Sub-area depth** — d1_008/012 cover classification basics. Specific classifications (preventive vs detective vs corrective; manual vs automated; key vs non-key) at depth remain.

Other depth opportunities for batches 11-13:
- 1.5.6 Agile Auditing sub-area depth (d1_029 parent only)
- 1.3.2 Effect of Laws and Regulations — sector-specific cases (d1_022 parent)
- 1.10.1 Audit Committee — composition specifics, financial-expert requirements (d1_016/089/093 cover other angles)

## Maintenance instructions for the next session

1. Author batch N → append questions to `data/originals/d1.json`.
2. **Update this doc:** add new question IDs to the TOC table above; update the "Last updated" line; recalculate the difficulty-mix table.
3. Update `data/originals/_concept_queue.yaml` `covered:` list, `authored_total`, and `authored_mix` to match.
4. Verify the three artifacts are in sync: this doc, the concept queue, and `d1.json` itself.
5. Commit all three files in the same PR.
