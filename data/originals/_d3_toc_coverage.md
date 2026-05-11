# D3 Coverage vs ISACA CISA Review Manual TOC

**Source:** ISACA CISA Official Review Manual, 28th Edition — Domain 3 (Information Systems Acquisition, Development and Implementation), Table of Contents.

**Purpose:** map each authored D3 question (`d3_001` … `d3_NNN`) back to the Review Manual subsection it covers, so future authoring batches target genuine TOC gaps.

**Maintenance rule:** update this doc in the same PR that lands a new authoring batch. Counts at the bottom must match `data/originals/_concept_queue.yaml` and `data/originals/d3.json`.

**Last updated:** after D3 batch 4 (d3_061..d3_080) — 80 of 120 questions authored (67%). Foundational tier CLOSED at 12/12; Application tier at 48/60 (80%); Analysis tier at 20/48 (42%).

## Part A — Project Governance and Management

### 3.1 Project Management

| TOC | Subsection | Covered by |
|---|---|---|
| 3.1.1 | Project Charter & Sponsor Authority | d3_001 (foundational — definition) |
| 3.1.2 | Project Management Structures | d3_021 (foundational — projectized vs functional vs matrix) |
| 3.1.3 | Project Phases / Lifecycle | d3_041 (foundational — PMBOK process groups) |
| 3.1.4 | Project Risk Escalation Criteria | d3_005 (application — escalation triggers) |
| 3.1.5 | Project Stakeholder Management | d3_045 (application — power-interest mapping) |
| 3.1.6 | Earned Value Management (EVM) | d3_037 (analysis — variance interpretation) |
| 3.1.7 | Project Closure | d3_043 (foundational — closure activities) |

### 3.2 Business Case and Feasibility Analysis

| TOC | Subsection | Covered by |
|---|---|---|
| 3.2.1 | Feasibility Study (technical/economic/operational/legal/schedule) | d3_025 (application — TELOS multi-dimensional) |
| 3.2.2 | Business Case — NPV vs Payback | d3_006 (application — metric selection) |
| 3.2.3 | IT Investment Portfolio | d3_046 (application — portfolio governance) |
| 3.2.4 | Function Point Analysis | d3_026 (application — FPA vs LOC) |
| 3.2.5 | Build vs Buy vs SaaS — Decision Framework | d3_057 (analysis — multi-factor framework) |

## Part B — Solution Design and Development

### 3.3 System Design and Development Methodologies

| TOC | Subsection | Covered by |
|---|---|---|
| 3.3.1 | SDLC Phases — Definitions | d3_002 (foundational — phase sequence) |
| 3.3.2 | SDLC Methodology Selection (Waterfall/Iterative/Agile) | d3_017 (analysis — regulated vs agile hybrid) |
| 3.3.3 | Agile — Story-Point Sizing & Velocity | d3_008 (application — velocity forecasting) |
| 3.3.4 | Scrum / Kanban Practices | d3_027 (application — method selection) |
| 3.3.5 | DevOps — CI/CD Pipeline Quality Gates | d3_009 (application — automated gates) |
| 3.3.6 | DevSecOps Integration | d3_028 (application — pipeline-wide automation) |
| 3.3.7 | AI/ML Model Lifecycle (MLOps) | d3_038 (analysis — production degradation) |
| 3.3.8 | Low-Code/No-Code Governance | d3_047 (application — center of excellence) |
| 3.3.9 | Microservices Architecture — Governance | d3_055 (application — service contracts + observability) |

### 3.4 Control Identification and Design

| TOC | Subsection | Covered by |
|---|---|---|
| 3.4.1 | Application Control Categories (input/processing/output) | d3_022 (foundational — input controls) |
| 3.4.2 | Requirements Traceability Matrix | d3_007 (application — bidirectional traceability) |
| 3.4.3 | Data Integrity Controls | d3_042 (foundational — definition) |
| 3.4.4 | Threat Modeling (STRIDE/DREAD) | d3_024 (foundational — STRIDE) |
| 3.4.5 | Static Application Security Testing (SAST) | d3_011 (application — shift-left integration) |
| 3.4.6 | Software Bill of Materials (SBOM) | d3_023 (foundational — definition) |
| 3.4.7 | Vendor SDLC — Source Code Escrow | d3_015 (application — escrow justification) |
| 3.4.8 | Open-Source License Governance | d3_039 (analysis — GPL in SaaS) |
| 3.4.9 | API Versioning & Contract Testing | d3_048 (application — semantic versioning + Pact) |
| 3.4.10 | Software Composition Analysis (SCA) | d3_052 (application — build-time CVE matching) |
| 3.4.11 | Application Authentication — Beyond Username/Password | d3_056 (application — phishing-resistant MFA) |
| 3.4.12 | SaaS Vendor SDLC Assurance | d3_058 (analysis — limited transparency) |

## Part C — Testing and Release

### 3.5 Testing Methodologies

| TOC | Subsection | Covered by |
|---|---|---|
| 3.5.1 | Software Testing Levels — Definitions | d3_003 (foundational — level scopes) |
| 3.5.2 | Mutation / Boundary-Value Testing | d3_030 (application — mutation effectiveness) |
| 3.5.3 | UAT Acceptance Criteria | d3_029 (application — well-formed criteria) |
| 3.5.4 | Test Data Management — De-identification | d3_010 (application — mask before extraction) |
| 3.5.5 | Failed UAT — Auditor Escalation | d3_018 (analysis — auditor recommendation) |
| 3.5.6 | Quality — Defect Density Metrics | d3_014 (application — interpretation) |
| 3.5.7 | DAST / IAST / RASP | d3_031 (application — differentiation) |
| 3.5.8 | Risk-Based Testing Strategy | d3_050 (application — effort prioritization) |
| 3.5.9 | Performance Testing Types — Load/Stress/Soak | d3_051 (application — type differentiation) |

### 3.6 Configuration and Release Management

| TOC | Subsection | Covered by |
|---|---|---|
| 3.6.1 | Configuration Management — CI Definition | d3_004 (foundational — software CI) |
| 3.6.2 | Source Control Practices | d3_032 (application — trunk-based development) |
| 3.6.3 | Release Management — CAB Approval | d3_013 (application — CAB role) |
| 3.6.4 | Container Security & Image Signing | d3_033 (application — signing + verification) |
| 3.6.5 | Major Release Governance Under Regulatory Deadline | d3_020 (analysis — scope decomposition) |
| 3.6.6 | Infrastructure-as-Code Drift Detection | d3_034 (application — continuous reconciliation) |
| 3.6.7 | Site Reliability Engineering (SRE) — Error Budgets | d3_035 (application — budget exhaustion response) |
| 3.6.8 | Database Change Management | d3_053 (application — versioned migration scripts) |
| 3.6.9 | Application Rollback Strategy | d3_054 (application — tested + documented procedure) |
| 3.6.10 | Failed Deployment with Bad Rollback — Incident Governance | d3_059 (analysis — preserve data + hotfix) |

## Part D — Deployment and Post-Implementation

### 3.7 System Migration, Infrastructure Deployment, and Data Conversion

| TOC | Subsection | Covered by |
|---|---|---|
| 3.7.1 | Big-Bang vs Phased Cutover Strategies | d3_036 (application — strategy selection) |
| 3.7.2 | Parallel Run Reconciliation Tolerance | d3_049 (application — risk-based per category) |
| 3.7.3 | Data Conversion — Reconciliation Controls | d3_012 (application — record-count + control-totals) |
| 3.7.4 | Cutover Rehearsal / Mock Conversion | d3_040 (analysis — multi-cycle rehearsal scope) |
| 3.7.5 | Data Conversion Fallback During Cutover | d3_019 (analysis — invoke fallback) |
| 3.7.6 | M&A IT Integration Governance | d3_060 (analysis — integration office + sequencing) |

### 3.8 Post-Implementation Review

| TOC | Subsection | Covered by |
|---|---|---|
| 3.8.1 | Post-Implementation Review — Benefits Realization | d3_016 (application — value vs business case) |
| 3.8.2 | Lessons Learned and Project Closure | d3_044 (foundational — definition + accessibility) |

---

## Tier-Mix Tally

| Tier | Authored | Target |
|---|---|---|
| Foundational | **12** | **12** ✓ CLOSED |
| Application | 48 | 60 |
| Analysis | 20 | 48 |
| **Total** | **80** | **120** |

**D3 status:** in_progress; batches 1-4 (d3_001..d3_080) authored. **Foundational tier closed.** 40/120 questions remaining across 2 batches (D3-5 mix 0F+12A+8An; D3-6 closing batch 0F+6A+14An).

## Batch 4 additions (d3_061..d3_080) — TOC entries beyond the original outline

D3 batch 4 covered depth topics that map to new TOC subdivisions (numbered 3.x.10+):
- 3.3.10 GitOps deployment model (d3_063)
- 3.3.11 AI-Augmented code generation (d3_074, analysis)
- 3.3.12 Privacy-by-design in agile (d3_078, analysis)
- 3.4.13 Encryption key management — app data (d3_067)
- 3.4.14 Application logging — security & audit (d3_068)
- 3.4.15 Data classification — non-prod envs (d3_069)
- 3.4.16 Third-party component vulnerability mgmt (d3_070)
- 3.4.17 SaaS-to-SaaS integration governance (d3_073, analysis)
- 3.4.18 Vendor abandonment (d3_077, analysis)
- 3.5.10 Code review effectiveness (d3_064)
- 3.5.11 Test pyramid (d3_065)
- 3.5.12 Database query performance audit (d3_066)
- 3.5.13 Production-like test environment fidelity (d3_079, analysis)
- 3.6.4 Container Runtime — Admission controllers (d3_062, complements d3_033 image signing)
- 3.6.11 CI/CD secret management (d3_061)
- 3.6.12 Privileged access — SDLC tools (d3_071)
- 3.6.13 Multi-region deployment failure (d3_075, analysis)
- 3.2.6 Legacy mainframe modernization (d3_076, analysis)
- 3.8.3 DORA Four Key Metrics (d3_072)
- 3.8.4 Continuous compliance evidence — high-deploy DevOps (d3_080, analysis)
