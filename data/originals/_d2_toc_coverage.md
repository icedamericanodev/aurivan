# D2 Coverage vs ISACA CISA Review Manual TOC

**Source:** ISACA CISA Official Review Manual, 28th Edition — Domain 2 (Governance and Management of IT), Table of Contents.

**Purpose:** map each authored D2 question (`d2_001` … `d2_NNN`) back to the Review Manual subsection it covers, so future authoring batches can target genuine TOC gaps rather than re-derive coverage from `data/originals/d2.json` each session.

**Maintenance rule:** update this doc in the same PR that lands a new authoring batch. Counts at the bottom must match `data/originals/_concept_queue.yaml` and `data/originals/d2.json`.

**Last updated:** after D2 batch 10 (d2_151..d2_170) — seventh 20-question D2 batch (11A + 9An). Total D2 questions authored: 170 of 180 (94%). One closing batch of ~10 questions left.

## Part A — IT Governance

### 2.1 Laws, Regulations and Industry Standards

| TOC | Subsection | Covered by |
|---|---|---|
| 2.1.1 | Impact of Laws, Regulations, and Industry Standards on IS Audit | d2_050 (analysis — multi-sector overlap mapping) |
| 2.5 | Risk Appetite vs Risk Tolerance vs Risk Capacity (foundational) | d2_052 (foundational — three-tier hierarchy) |
| 2.1.2 | Governance, Risk and Compliance | d2_005 (GRC integration) |
| 2.5.1 | Developing a Risk Management Program | d2_011 (5-component program), d2_058 (program standup governance design) |
| 2.5.3 | Risk Analysis Methods (Qualitative / Semi-Quantitative / Quantitative) | d2_012 (method selection) |
| 2.6 | Data Privacy Program and Principles | d2_013 (8-element program design), d2_063 (operationalization/rollout), d2_066 (analysis — multi-jurisdiction scaling), d2_086 (analysis — Privacy by Design vs by Default) |
| 2.7.1 | Data Inventory and Classification | d2_016 (classification approach), d2_073 (foundational — classification levels), d2_076 (data inventory methodology) |
| 2.8.4 | Human Resource Management — IT-specific (mandatory vacation, succession, fraud-risk roles) | d2_018 (analysis — fraud-risk patterns) |
| 2.8.5 | Enterprise Change Management | d2_019 (analysis — failed acquisition integration) |
| 2.9.2 | Outsourcing Practices and Strategies | d2_017 (analysis — multi-factor decision) |
| 2.9.3 | Cloud Governance — Shared Responsibility Model | d2_014 (responsibility split by service model) |
| 2.10.1-3 | KPIs / KRIs / KCIs distinction | d2_015 (what each measures) |
| 2.11.1 | Quality Assurance — IT QA Program Effectiveness | d2_020 (analysis — capacity + leading indicators + reporting) |

### 2.2 Organizational Structure, IT Governance and IT Strategy

| TOC | Subsection | Covered by |
|---|---|---|
| 2.2.1 | Enterprise Governance of Information and Technology (EGIT) | d2_001 (definition + scope) |
| 2.2.2 | Good Practices for EGIT | d2_035 (COBIT 2019 governance system principles) |
| 2.2.3 | Audit's Role in EGIT — Three Lines Model | d2_002 (Three Lines), d2_009 (audit role boundaries), d2_071 (foundational — Three Lines def) |
| 2.2.4 | Information Security Governance — Effective | d2_006 (board accountability), d2_069 (analysis — EGIT/Risk/InfoSec integration) |
| 2.2.5 | Information Systems Strategy | d2_004 (IT-business alignment), d2_082 (update cadence), d2_085 (analysis — mid-cycle update synthesis) |
| 2.2.6 | Strategic Planning | d2_023 (foundational — strategic vs tactical), d2_024 (application — strategic plan components) |
| 2.2.7 | Business Intelligence | d2_044 (dashboard integrity — lineage + DQ + stewardship) |
| 2.2.8 | Organizational Structure — IT Steering Committee | d2_003 (application — composition design), d2_054 (foundational — definition) |
| 2.2.8 | Organizational Structure — Senior Mgmt and Boards | d2_059 (board EDM vs management Plan-Build-Run-Monitor split) |
| 2.2.8 | Organizational Structure — IT Org / Roles | d2_060 (RACI / singular Accountable principle) |
| 2.2.8 | Organizational Structure — Data Ownership | d2_049 (analysis — owner vs custodian in cloud transition) |
| 2.2.8 | Organizational Structure — Vendor and Outsourcer Mgmt | d2_036 (IT-VMO function structure) |
| 2.2.8 | Organizational Structure — Network Mgmt | d2_061 (architecture + change mgmt + baselines + flow review) |
| 2.2.8 | Organizational Structure — Separation of Duties Within IT | d2_008 (toxic-combination analysis) |
| 2.2.8 | Organizational Structure — Compensating Controls for SoD | d2_037 (log + independent review + mgmt oversight) |
| 2.2.9 | Auditing IT Governance Structure and Implementation | d2_010 (governance design vs implementation divergence), d2_090 (analysis — design-implementation gap synthesis) |

### 2.3 IT Policies, Standards, Procedures and Guidelines

| TOC | Subsection | Covered by |
|---|---|---|
| 2.3.1 | Policies — InfoSec Policy Review | d2_038 (annual + event-triggered + mgmt approval) |
| 2.3.2-4 | Standards / Procedures / Guidelines distinction | d2_034 (foundational — standard mandatory vs guideline recommended) |

### 2.4 Enterprise Architecture

| TOC | Subsection | Covered by |
|---|---|---|
| 2.4 | Enterprise Architecture and Considerations | d2_033 (foundational — EA definition + BIAT layers), d2_074 (foundational — COSO 5 components), d2_077 (PM governance/PMO), d2_081 (APO04 innovation governance) |

### 2.5 Enterprise Risk Management

| TOC | Subsection | Covered by |
|---|---|---|
| 2.5.1 | Developing a Risk Management Program | d2_091 (foundational — program definition), d2_094 (program maturity assessment) |
| 2.5.2 | Risk Management Life Cycle (Identify → Assess → Respond → Monitor) | d2_007 (lifecycle gap analysis), d2_021 (foundational — risk register), d2_022 (foundational — treatment options), d2_070 (analysis — multi-option treatment scenario), d2_089 (analysis — risk treatment under budget constraints) |
| 2.5.3 | Risk Analysis Methods (Qualitative / Semi / Quantitative) | d2_012 (qual vs quant), d2_062 (semi-quantitative method selection), d2_080 (FAIR quantitative application) |

### 2.6 Data Privacy Program and Principles

| TOC | Subsection | Covered by |
|---|---|---|
| 2.6.1 | Privacy Documentation | d2_039 (RoPA — GDPR Article 30), d2_084 (DPIA — GDPR Article 35) |
| 2.6.2 | Audit Process — Multi-Regulation Privacy Audit | d2_029 (analysis) |

### 2.7 Data Governance and Classification

| TOC | Subsection | Covered by |
|---|---|---|
| 2.7.1 | Data Inventory and Classification | (uncovered) |
| 2.7.2 | Legal Purpose, Consent, Legitimate Interest | d2_040 (GDPR Article 6 lawful basis for marketing) |
| 2.7.3 | Data Subject Rights — Transborder Data Flow | d2_030 (analysis — Schrems II, SCCs+TIAs, UK-GDPR) |

## Part B — IT Management

### 2.8 IT Resource Management

| TOC | Subsection | Covered by |
|---|---|---|
| 2.8.1 | Value of IT | d2_075 (outcome-based quantification) |
| 2.8.2 | IT Portfolio Management | d2_026 (run/grow/transform tier discipline), d2_068 (analysis — mid-year rebalance), d2_088 (analysis — investment under regulatory uncertainty) |
| 2.8.3 | IT Management Practices | d2_046 (analysis — silo synthesis vs integrated practices) |
| 2.8.4 | Human Resource Management (recruiting, training, performance, succession) | d2_018 (fraud-risk HR controls), d2_055 (training program design — role-based + individualized) |
| 2.8.5 | Enterprise Change Management | d2_095 (stakeholder mgmt), d2_104 (analysis — failed M&A integration synthesis) |
| 2.8.6 | Financial Management Practices | d2_043 (chargeback design — transparency + traceability + consumer-influence) |
| 2.8.7 | Information Security Management | d2_025 (8-element program structure), d2_064 (operational running — integrated cadence) |

### 2.9 IT Vendor Management

| TOC | Subsection | Covered by |
|---|---|---|
| 2.9.1 | Sourcing Practices | d2_041 (in-house retention drivers — strategic + differentiating + control-critical) |
| 2.9.2 | Outsourcing Practices and Strategies | d2_017 (multi-factor outsourcing decision), d2_056 (onshore/near-shore/offshore geography) |
| 2.9.3 | Cloud Governance | d2_014 (shared-responsibility model), d2_053 (foundational — IaaS/PaaS/SaaS), d2_057 (cloud risk mgmt continuous evidence), d2_067 (analysis — 6 Rs migration), d2_072 (foundational — Cloud Deployment Models), d2_087 (analysis — multi-cloud governance synthesis) |
| 2.9.4 | Governance in Outsourcing | d2_042 (vendor governance forum / SMO ongoing structure) |
| 2.9.5 | Capacity and Growth Planning | d2_045 (analysis — multi-factor demand + headroom + lead-time + feedback) |
| 2.9.6 | Third-Party Service Delivery Management | d2_027 (5-mechanism integrated mgmt), d2_079 (vendor SLA design), d2_083 (APO09 service agreements) |

### 2.10 IT Performance Monitoring and Reporting

| TOC | Subsection | Covered by |
|---|---|---|
| 2.10.1 | Key Performance Indicators (KPIs) | d2_031 (foundational — KPI definition vs KRI/KCI/volume) |
| 2.10.2 | Key Risk Indicators (KRIs) | d2_032 (foundational — KRI leading-indicator definition) |
| 2.10.3 | Key Control Indicators (KCIs) | d2_051 (foundational — KCI definition; closes the KPI/KRI/KCI definition trio) |
| 2.10.4 | Performance Optimization (Critical Success Factors) | d2_047 (analysis — KPI/CSF disconnect) |
| 2.10.5 | Approaches and Techniques (Six Sigma, Agile, IT Balanced Scorecard) | d2_028 (method-fit selection) |

### 2.11 Quality Assurance and Quality Management of IT

| TOC | Subsection | Covered by |
|---|---|---|
| 2.11.1 | Quality Assurance | d2_020 (analysis — QA program effectiveness), d2_078 (APO11 quality management application) |
| 2.11.2 | Quality Management | d2_048 (analysis — layered framework selection: ISO + TQM + Six Sigma) |
| 2.11.3 | Operational Excellence | d2_065 (analysis — layered framework strategy: ITIL+SAFe+ISO+Lean/Six Sigma) |

## Coverage summary after D2 batch 6

- **Numbered subsections in TOC:** ~50 leaf subsections across 2.1.1 through 2.11.3.
- **Subsections with at least one authored question:** 38 of ~50 (76%) after batch 6 — batch 6 closed 1 more uncovered subsection (2.8.1 Value of IT) plus depth on many covered subsections.
- **Most covered area:** 2.2 Organizational Structure / IT Governance / IT Strategy (~17 questions); 2.5 Risk Management (now 9 questions); 2.9 Vendor / Outsourcing / Cloud (now 11 questions); 2.6 Privacy (now 5 questions).

## Difficulty mix tracking

| Tier | Target (180) | Authored after D2 batch 10 | Gap |
|---|---|---|---|
| Foundational | 18 (10%) | **18** | **target met** |
| Application | 90 (50%) | **90** | **target met** |
| Analysis | 72 (40%) | 62 | -10 |
| **Total** | **180** | **170** | **-10** |

D2 progress: 170/180 (94%). Application tier closed at 90/90 with batch 10. Final batch 11 (10 An questions) brings D2 to 180/180 (target).

## High-priority depth targets for batch 5 and beyond

After batch 4, the highest-yield uncovered areas remaining are:

**Foundational tier candidates (need 11 more to hit 18-target):**
- KCI standalone definition (2.10.3) — d2_031/d2_032 cover KPI and KRI; KCI definition still uncovered
- IT Steering Committee — definition (foundational, distinct from d2_003 application)
- IT Risk vs Enterprise Risk — definition (foundational, supports lifecycle Qs)
- IT Policy hierarchy — Policy definition (2.3.1 standalone)
- COBIT 2019 EDM vs APO vs BAI vs DSS vs MEA domain distinctions
- Data Classification levels (foundational, distinct from d2_016 application)
- Cloud Service Models — IaaS / PaaS / SaaS / IDaaS definitions
- Risk Appetite vs Risk Tolerance vs Risk Capacity
- Three Lines Model — definition (foundational, distinct from d2_002 application)

**Application — high-priority remaining:**
1. **2.8.4 HR Management** — IT-specific HR (training, recruiting, performance) beyond fraud-risk sub-bullet covered by d2_018
2. **2.9.2 Outsourcing Practices** — alternative sourcing strategies (offshore, near-shore, BPO)
3. **2.9.3 Cloud Governance** — beyond d2_014 shared-responsibility — cloud risk management, vendor lock-in, data residency
4. **2.5.1 Developing a Risk Management Program** — beyond d2_011 — risk-program governance
5. **2.5.3 Risk Analysis Methods** — beyond d2_012 — semi-quantitative scenarios

**Analysis — high-priority remaining:**
1. **2.11.3 Operational Excellence** — selecting framework when business-process orientation matters
2. **Data Privacy Program rollout** — multi-jurisdiction privacy program scaling decisions
3. **Cloud Migration Risk synthesis** — multi-control trade-offs in lift-and-shift vs refactor decisions
4. **GRC platform selection** — when integrated GRC is right vs separate tooling
5. **IT Investment Portfolio governance** — APO05 portfolio rebalance scenarios under budget constraints

## Maintenance instructions for the next session

1. Author batch N → append questions to `data/originals/d2.json`.
2. Update this doc: add new question IDs to the TOC table; update "Last updated"; recalculate difficulty mix.
3. Update `data/originals/_concept_queue.yaml` `domain_2.covered:` list and counters.
4. Verify the three artifacts are in sync: this doc, the concept queue, and `d2.json` itself.
5. Commit all relevant files together in the same PR.
