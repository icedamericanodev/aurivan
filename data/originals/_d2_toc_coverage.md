# D2 Coverage vs ISACA CISA Review Manual TOC

**Source:** ISACA CISA Official Review Manual, 28th Edition — Domain 2 (Governance and Management of IT), Table of Contents.

**Purpose:** map each authored D2 question (`d2_001` … `d2_NNN`) back to the Review Manual subsection it covers, so future authoring batches can target genuine TOC gaps rather than re-derive coverage from `data/originals/d2.json` each session.

**Maintenance rule:** update this doc in the same PR that lands a new authoring batch. Counts at the bottom must match `data/originals/_concept_queue.yaml` and `data/originals/d2.json`.

**Last updated:** after D2 batch 1 (d2_001..d2_010). Total D2 questions authored: 10 of 180.

## Part A — IT Governance

### 2.1 Laws, Regulations and Industry Standards

| TOC | Subsection | Covered by |
|---|---|---|
| 2.1.1 | Impact of Laws, Regulations, and Industry Standards on IS Audit | (uncovered) |
| 2.1.2 | Governance, Risk and Compliance | d2_005 (GRC integration) |

### 2.2 Organizational Structure, IT Governance and IT Strategy

| TOC | Subsection | Covered by |
|---|---|---|
| 2.2.1 | Enterprise Governance of Information and Technology (EGIT) | d2_001 (definition + scope) |
| 2.2.2 | Good Practices for EGIT | (uncovered) |
| 2.2.3 | Audit's Role in EGIT — Three Lines Model | d2_002 (Three Lines), d2_009 (audit role boundaries) |
| 2.2.4 | Information Security Governance — Effective | d2_006 (board accountability) |
| 2.2.5 | Information Systems Strategy | d2_004 (IT-business alignment) |
| 2.2.6 | Strategic Planning | (uncovered) |
| 2.2.7 | Business Intelligence | (uncovered) |
| 2.2.8 | Organizational Structure — IT Steering Committee | d2_003 |
| 2.2.8 | Organizational Structure — Senior Mgmt and Boards | (uncovered) |
| 2.2.8 | Organizational Structure — IT Org / Roles | (uncovered) |
| 2.2.8 | Organizational Structure — Data Ownership | (uncovered) |
| 2.2.8 | Organizational Structure — Vendor and Outsourcer Mgmt | (uncovered) |
| 2.2.8 | Organizational Structure — Network Mgmt | (uncovered) |
| 2.2.8 | Organizational Structure — Separation of Duties Within IT | d2_008 (toxic-combination analysis) |
| 2.2.8 | Organizational Structure — Compensating Controls for SoD | (uncovered) |
| 2.2.9 | Auditing IT Governance Structure and Implementation | d2_010 (governance design vs implementation divergence) |

### 2.3 IT Policies, Standards, Procedures and Guidelines

| TOC | Subsection | Covered by |
|---|---|---|
| 2.3.1 | Policies — InfoSec Policy Review | (uncovered) |
| 2.3.2 | Standards | (uncovered) |
| 2.3.3 | Procedures | (uncovered) |
| 2.3.4 | Guidelines | (uncovered) |

### 2.4 Enterprise Architecture

| TOC | Subsection | Covered by |
|---|---|---|
| 2.4 | Enterprise Architecture and Considerations | (uncovered) |

### 2.5 Enterprise Risk Management

| TOC | Subsection | Covered by |
|---|---|---|
| 2.5.1 | Developing a Risk Management Program | (uncovered) |
| 2.5.2 | Risk Management Life Cycle (Identify → Assess → Respond → Monitor) | d2_007 (lifecycle gap analysis) |
| 2.5.3 | Risk Analysis Methods (Qualitative / Semi / Quantitative) | (uncovered) |

### 2.6 Data Privacy Program and Principles

| TOC | Subsection | Covered by |
|---|---|---|
| 2.6.1 | Privacy Documentation | (uncovered) |
| 2.6.2 | Audit Process | (uncovered) |

### 2.7 Data Governance and Classification

| TOC | Subsection | Covered by |
|---|---|---|
| 2.7.1 | Data Inventory and Classification | (uncovered) |
| 2.7.2 | Legal Purpose, Consent, Legitimate Interest | (uncovered) |
| 2.7.3 | Data Subject Rights — Transborder Data Flow | (uncovered) |

## Part B — IT Management

### 2.8 IT Resource Management

| TOC | Subsection | Covered by |
|---|---|---|
| 2.8.1 | Value of IT | (uncovered) |
| 2.8.2 | IT Portfolio Management | (uncovered) |
| 2.8.3 | IT Management Practices | (uncovered) |
| 2.8.4 | Human Resource Management (recruiting, training, performance, succession) | (uncovered) |
| 2.8.5 | Enterprise Change Management | (uncovered) |
| 2.8.6 | Financial Management Practices | (uncovered) |
| 2.8.7 | Information Security Management | (uncovered) |

### 2.9 IT Vendor Management

| TOC | Subsection | Covered by |
|---|---|---|
| 2.9.1 | Sourcing Practices | (uncovered) |
| 2.9.2 | Outsourcing Practices and Strategies | (uncovered) |
| 2.9.3 | Cloud Governance | (uncovered) |
| 2.9.4 | Governance in Outsourcing | (uncovered) |
| 2.9.5 | Capacity and Growth Planning | (uncovered) |
| 2.9.6 | Third-Party Service Delivery Management | (uncovered) |

### 2.10 IT Performance Monitoring and Reporting

| TOC | Subsection | Covered by |
|---|---|---|
| 2.10.1 | Key Performance Indicators (KPIs) | (uncovered) |
| 2.10.2 | Key Risk Indicators (KRIs) | (uncovered) |
| 2.10.3 | Key Control Indicators (KCIs) | (uncovered) |
| 2.10.4 | Performance Optimization (Critical Success Factors) | (uncovered) |
| 2.10.5 | Approaches and Techniques (Six Sigma, Agile, IT Balanced Scorecard) | (uncovered) |

### 2.11 Quality Assurance and Quality Management of IT

| TOC | Subsection | Covered by |
|---|---|---|
| 2.11.1 | Quality Assurance | (uncovered) |
| 2.11.2 | Quality Management | (uncovered) |
| 2.11.3 | Operational Excellence | (uncovered) |

## Coverage summary after D2 batch 1

- **Numbered subsections in TOC:** ~50 leaf subsections across 2.1.1 through 2.11.3.
- **Subsections with at least one authored question:** 9 of ~50 (18%) after batch 1.
- **Most covered area so far:** 2.2 Organizational Structure / IT Governance / IT Strategy (5 questions covering EGIT definition, Three Lines Model, IT Steering Committee, IT Strategy alignment, audit's role, SoD, governance audit).

## Difficulty mix tracking

| Tier | Target (180) | Authored after D2 batch 1 | Gap |
|---|---|---|---|
| Foundational | 18 (10%) | 0 | -18 |
| Application | 90 (50%) | 6 | -84 |
| Analysis | 72 (40%) | 4 | -68 |
| **Total** | **180** | **10** | **-170** |

Mirrors D1 batch 1 cadence. Foundational tier launches in later batches (D1 pattern: foundational starts at batch 6 of 13).

## High-priority depth targets for batch 2 and beyond

After batch 1, most TOC areas remain uncovered. Priority candidates for batch 2:

**Foundational tier candidates (none in batch 1; start in batch ~3-4):**
- IT Steering Committee — definition (foundational, distinct from d2_003 application)
- Risk Register — definition (foundational, supports d2_007)
- KPI / KRI / KCI — definitions (foundational, supports later application questions)

**Application — high priority for batch 2:**
1. **2.5.1 Developing a Risk Management Program** — what's required to stand up an IT risk-management program
2. **2.5.3 Risk Analysis Methods** — qualitative vs semi-quantitative vs quantitative selection
3. **2.6 Data Privacy Program** — privacy program design (the high-frequency exam topic)
4. **2.7 Data Governance and Classification** — classification approach
5. **2.8.4 HR Management** — IT-specific HR sub-bullets (mandatory vacation, succession)
6. **2.9.3 Cloud Governance** — high-frequency exam topic given current trends
7. **2.10 KPIs / KRIs / KCIs** — distinguishing the three indicator types
8. **2.11 Quality Assurance** — IT QA program design

**Analysis — high priority for batch 2:**
1. **2.7.3 Data Subject Rights — Transborder Data Flow** — multi-jurisdiction analysis
2. **2.9.2 Outsourcing Strategies** — sourcing decision with cost/risk/control trade-offs
3. **2.10.5 Six Sigma / Agile / Balanced Scorecard** — method-selection synthesis

## Maintenance instructions for the next session

1. Author batch N → append questions to `data/originals/d2.json`.
2. Update this doc: add new question IDs to the TOC table; update "Last updated"; recalculate difficulty mix.
3. Update `data/originals/_concept_queue.yaml` `domain_2.covered:` list and counters.
4. Verify the three artifacts are in sync: this doc, the concept queue, and `d2.json` itself.
5. Commit all relevant files together in the same PR.
