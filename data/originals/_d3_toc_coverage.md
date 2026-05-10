# D3 Coverage vs ISACA CISA Review Manual TOC

**Source:** ISACA CISA Official Review Manual, 28th Edition — Domain 3 (Information Systems Acquisition, Development and Implementation), Table of Contents.

**Purpose:** map each authored D3 question (`d3_001` … `d3_NNN`) back to the Review Manual subsection it covers, so future authoring batches target genuine TOC gaps.

**Maintenance rule:** update this doc in the same PR that lands a new authoring batch. Counts at the bottom must match `data/originals/_concept_queue.yaml` and `data/originals/d3.json`.

**Last updated:** after D3 batch 1 (d3_001..d3_020) — first 20 questions authored using Stage-0 scaffolder.

## Part A — Project Governance and Management

### 3.1 Project Management

| TOC | Subsection | Covered by |
|---|---|---|
| 3.1.1 | Project Charter & Sponsor Authority | d3_001 (foundational — definition) |
| 3.1.2 | Project Management Structures | _pending_ |
| 3.1.3 | Project Phases / Lifecycle | _pending_ |
| 3.1.4 | Project Risk Escalation Criteria | d3_005 (application — escalation triggers) |
| 3.1.5 | Project Stakeholder Management | _pending_ |
| 3.1.6 | Earned Value Management (EVM) | _pending_ |
| 3.1.7 | Project Closure | _pending_ |

### 3.2 Business Case and Feasibility Analysis

| TOC | Subsection | Covered by |
|---|---|---|
| 3.2.1 | Feasibility Study (technical/economic/operational) | _pending_ |
| 3.2.2 | Business Case — NPV vs Payback | d3_006 (application — metric selection) |
| 3.2.3 | IT Investment Portfolio | _pending_ |
| 3.2.4 | Function Point Analysis | _pending_ |

## Part B — Solution Design and Development

### 3.3 System Design and Development Methodologies

| TOC | Subsection | Covered by |
|---|---|---|
| 3.3.1 | SDLC Phases — Definitions | d3_002 (foundational — phase sequence) |
| 3.3.2 | SDLC Methodology Selection (Waterfall/Iterative/Agile) | d3_017 (analysis — regulated vs agile hybrid) |
| 3.3.3 | Agile — Story-Point Sizing & Velocity | d3_008 (application — velocity forecasting) |
| 3.3.4 | Scrum / Kanban Practices | _pending_ |
| 3.3.5 | DevOps — CI/CD Pipeline Quality Gates | d3_009 (application — automated gates) |
| 3.3.6 | DevSecOps Integration | _pending_ |
| 3.3.7 | AI/ML Model Lifecycle (MLOps) | _pending_ |
| 3.3.8 | Low-Code/No-Code Governance | _pending_ |

### 3.4 Control Identification and Design

| TOC | Subsection | Covered by |
|---|---|---|
| 3.4.1 | Application Control Categories (input/processing/output) | _pending_ |
| 3.4.2 | Requirements Traceability Matrix | d3_007 (application — bidirectional traceability) |
| 3.4.3 | Data Integrity Controls | _pending_ |
| 3.4.4 | Threat Modeling (STRIDE/DREAD) | _pending_ |
| 3.4.5 | Static Application Security Testing (SAST) | d3_011 (application — shift-left integration) |
| 3.4.6 | Software Bill of Materials (SBOM) | _pending_ |
| 3.4.7 | Vendor SDLC — Source Code Escrow | d3_015 (application — escrow justification) |
| 3.4.8 | Open-Source License Governance | _pending_ |
| 3.4.9 | API Versioning & Contract Testing | _pending_ |

## Part C — Testing and Release

### 3.5 Testing Methodologies

| TOC | Subsection | Covered by |
|---|---|---|
| 3.5.1 | Software Testing Levels — Definitions | d3_003 (foundational — level scopes) |
| 3.5.2 | Mutation / Boundary-Value Testing | _pending_ |
| 3.5.3 | UAT Acceptance Criteria | _pending_ |
| 3.5.4 | Test Data Management — De-identification | d3_010 (application — mask before extraction) |
| 3.5.5 | Failed UAT — Auditor Escalation | d3_018 (analysis — auditor recommendation) |
| 3.5.6 | Quality — Defect Density Metrics | d3_014 (application — interpretation) |
| 3.5.7 | DAST / IAST / RASP | _pending_ |

### 3.6 Configuration and Release Management

| TOC | Subsection | Covered by |
|---|---|---|
| 3.6.1 | Configuration Management — CI Definition | d3_004 (foundational — software CI) |
| 3.6.2 | Source Control Practices | _pending_ |
| 3.6.3 | Release Management — CAB Approval | d3_013 (application — CAB role) |
| 3.6.4 | Container Security & Image Signing | _pending_ |
| 3.6.5 | Major Release Governance Under Regulatory Deadline | d3_020 (analysis — scope decomposition) |
| 3.6.6 | Infrastructure-as-Code Drift Detection | _pending_ |
| 3.6.7 | Site Reliability Engineering (SRE) — Error Budgets | _pending_ |

## Part D — Deployment and Post-Implementation

### 3.7 System Migration, Infrastructure Deployment, and Data Conversion

| TOC | Subsection | Covered by |
|---|---|---|
| 3.7.1 | Big-Bang vs Phased Cutover Strategies | _pending_ |
| 3.7.2 | Parallel Run Reconciliation Tolerance | _pending_ |
| 3.7.3 | Data Conversion — Reconciliation Controls | d3_012 (application — record-count + control-totals) |
| 3.7.4 | Cutover Rehearsal / Mock Conversion | _pending_ |
| 3.7.5 | Data Conversion Fallback During Cutover | d3_019 (analysis — invoke fallback) |

### 3.8 Post-Implementation Review

| TOC | Subsection | Covered by |
|---|---|---|
| 3.8.1 | Post-Implementation Review — Benefits Realization | d3_016 (application — value vs business case) |
| 3.8.2 | Lessons Learned and Project Closure | _pending_ |

---

## Tier-Mix Tally

| Tier | Authored | Target |
|---|---|---|
| Foundational | 4 | 12 |
| Application | 12 | 60 |
| Analysis | 4 | 48 |
| **Total** | **20** | **120** |

**D3 status:** in_progress; batch 1 (d3_001..d3_020) authored. 100/120 questions remaining across ~5 batches.
