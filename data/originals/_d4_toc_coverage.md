# D4 Coverage vs ISACA CISA Review Manual TOC

**Source:** ISACA CISA Official Review Manual, 28th Edition — Domain 4 (Information Systems Operations and Business Resilience), Table of Contents (verified verbatim from user).

**Purpose:** map each authored D4 question (`d4_001` … `d4_NNN`) back to the Review Manual subsection it covers, so future authoring batches target genuine TOC gaps. Coverage map verified pre-authoring (rather than post-hoc like D3) to ensure 1:1 mapping from the start.

**Maintenance rule:** update this doc in the same PR that lands a new authoring batch. Counts at the bottom must match `data/originals/_concept_queue.yaml` and `data/originals/d4.json`.

**Last updated:** after D4 batch 1 (d4_001..d4_020) — 20 of 260 questions authored (8%).

## Part A — Information Systems Operations

### 4.1 IT Components

| TOC | Subsection | Covered by |
|---|---|---|
| 4.1.1 | Networking — LAN/WAN security (802.1X NAC) | d4_005 (application) |
| 4.1.1 | Networking — TCP/IP vs OSI Reference Model | d4_001 (foundational — layer mapping) |
| 4.1.1 | Networking — Network Administration and Control | _pending_ |
| 4.1.1 | Networking — Converged Protocols | _pending_ |
| 4.1.1 | Networking — Internet Protocol Networking | _pending_ |
| 4.1.1 | Networking — Network Address Translation (NAT) | _pending_ |
| 4.1.2 | Computer Hardware Components and Architectures | _pending_ |
| 4.1.3 | Common Enterprise Devices (Proxy Servers) | d4_006 (application — proxy controls) |
| 4.1.4 | USB Mass Storage Devices — Risk + Controls | d4_007 (application — device-control policy) |
| 4.1.5 | Wireless Communication Technologies | d4_008 (application — WPA3-Enterprise) |
| 4.1.6 | Hardware Maintenance | _pending_ |
| 4.1.7 | Hardware Reviews | _pending_ |

### 4.2 IT Asset Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.2 | IT Asset Management (lifecycle, inventory, disposal) | d4_009 (application — full lifecycle program) |

### 4.3 Job Scheduling and Production Process Automation

| TOC | Subsection | Covered by |
|---|---|---|
| 4.3.1 | Job Scheduling Software | d4_002 (foundational — PRIMARY function) |
| 4.3.2 | Scheduling Reviews | _pending_ |

### 4.4 System Interfaces

| TOC | Subsection | Covered by |
|---|---|---|
| 4.4 | System Interfaces — Risk and Controls (consolidated) | d4_010 (application — receiver-side reconciliation) |
| 4.4.1 | Risk Associated With System Interfaces | _pending_ |
| 4.4.2 | Controls Associated With System Interfaces | covered by d4_010 |

### 4.5 End-User Computing and Shadow IT

| TOC | Subsection | Covered by |
|---|---|---|
| 4.5.1 | End-User Computing | d4_011 (application — risk-tiered EUC controls) |
| 4.5.2 | Shadow IT | d4_012 (application — tiered governance), d4_018 (analysis — discovery remediation) |

### 4.6 Systems Availability and Capacity

| TOC | Subsection | Covered by |
|---|---|---|
| 4.6.1 | IS Architecture and Software | _pending_ |
| 4.6.2 | Operating Systems — Software Control Features | _pending_ |
| 4.6.2 | Operating Systems — Integrity Issues | _pending_ |
| 4.6.2 | Operating Systems — Reviews | d4_013 (application — multi-dimensional periodic review) |
| 4.6.3 | Access Control Software | _pending_ |
| 4.6.4 | Data Communications Software | _pending_ |
| 4.6.5 | Utility Programs | _pending_ |
| 4.6.6 | Software Licensing Issues | _pending_ |
| 4.6.7 | Source Code Management | _pending_ |
| 4.6.8 | Capacity Management | d4_014 (application — proactive forecast + trends) |

### 4.7 Problem and Incident Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.7.1 | Problem Management | _pending_ (covered tangentially in d4_015) |
| 4.7.2 | Process of Incident Handling | d4_015 (application — ITIL 4 incident process), d4_017 (analysis — multi-incident overlap) |
| 4.7.3 | Detection, Documentation, Control, Resolution, Reporting | _pending_ |
| 4.7.4 | Support / Help Desk | d4_016 (application — multi-dimensional effectiveness) |
| 4.7.5 | Network Management Tools | _pending_ |
| 4.7.6 | Problem Management Reporting Reviews | _pending_ |

### 4.8 IT Change, Configuration and Patch Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.8.1 | Patch Management | _pending_ |
| 4.8.2 | Release Management | _pending_ |
| 4.8.3 | IS Operations — Operations Reviews | _pending_ |

### 4.9 Operational Log Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.9.1 | Types of Logs | _pending_ |
| 4.9.2 | Log Management — Data Collection | _pending_ |
| 4.9.2 | Log Management — Generating Alerts | _pending_ |
| 4.9.2 | Log Management — Storing and Protecting Logs | _pending_ |
| 4.9.2 | Log Management — Analyzing Log Data | _pending_ |
| 4.9.2 | Log Management — Reporting Concerns | _pending_ |
| 4.9.2 | Log Management — SIEM Integration | _pending_ |

### 4.10 IT Service Level Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.10.1 | Service Level Agreements (SLAs) | d4_003 (foundational — definition) |
| 4.10.2 | Monitoring of Service Levels | d4_019 (analysis — SLA breach root cause) |
| 4.10.3 | Service Levels and Enterprise Architecture | _pending_ |

### 4.11 Database Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.11.1 | DBMS Architecture (Metadata) | _pending_ |
| 4.11.2 | Database Structure — Hierarchical | _pending_ |
| 4.11.2 | Database Structure — Network | _pending_ |
| 4.11.2 | Database Structure — Relational (RDBMS) | _pending_ |
| 4.11.2 | Database Structure — Object-Oriented (OODBMS) | _pending_ |
| 4.11.2 | Database Structure — NoSQL | _pending_ |
| 4.11.3 | Database Controls | _pending_ |
| 4.11.4 | Database Reviews | _pending_ |

## Part B — Business Resilience

### 4.12 Business Impact Analysis

| TOC | Subsection | Covered by |
|---|---|---|
| 4.12 | BIA fundamentals | d4_004 (foundational — PRIMARY purpose), d4_020 (analysis — RTO/RPO conflict) |
| 4.12.1 | Classification of Operations and Criticality Analysis | _pending_ |

### 4.13 System and Operational Resilience

| TOC | Subsection | Covered by |
|---|---|---|
| 4.13.1 | Application Resiliency and Disaster Recovery | _pending_ |
| 4.13.2 | Telecommunication Networks Resiliency and DR Methods | _pending_ |

### 4.14 Data Backup, Storage and Restoration

| TOC | Subsection | Covered by |
|---|---|---|
| 4.14.1 | Data Storage Resiliency and DR Methods | _pending_ |
| 4.14.2 | Backup and Restoration — Offsite Library Controls | _pending_ |
| 4.14.2 | Backup and Restoration — Cloud Backup | _pending_ |
| 4.14.2 | Backup and Restoration — Security of Offsite Facilities | _pending_ |
| 4.14.2 | Backup and Restoration — Media/Documentation Backup | _pending_ |
| 4.14.2 | Backup and Restoration — Backup Devices/Media | _pending_ |
| 4.14.2 | Backup and Restoration — Periodic Procedures | _pending_ |
| 4.14.2 | Backup and Restoration — Frequency of Rotation | _pending_ |
| 4.14.3 | Backup Schemes — Full Backup | _pending_ |
| 4.14.3 | Backup Schemes — Incremental Backup | _pending_ |
| 4.14.3 | Backup Schemes — Differential Backup | _pending_ |
| 4.14.3 | Backup Schemes — Method of Rotation | _pending_ |
| 4.14.3 | Backup Schemes — Record Keeping for Offsite Storage | _pending_ |
| 4.14.3 | Backup Schemes — 3-2-1 Backup Strategy | _pending_ |

### 4.15 Business Continuity Plan

| TOC | Subsection | Covered by |
|---|---|---|
| 4.15.1 | IT Business Continuity Planning | _pending_ |
| 4.15.2 | Disasters and Disruptive Events — Pandemic Planning | _pending_ |
| 4.15.2 | Disasters and Disruptive Events — Image/Reputation/Brand Damage | _pending_ |
| 4.15.2 | Disasters and Disruptive Events — Unanticipated/Unforeseeable | _pending_ |
| 4.15.3 | BCP Process | _pending_ |
| 4.15.4 | BCP Policy | _pending_ |
| 4.15.5 | BCP Incident Management | _pending_ |
| 4.15.6 | Development of BCP | _pending_ |
| 4.15.7 | Other Issues in Plan Development | _pending_ |
| 4.15.8 | Components of BCP — Key Decision-Making Personnel | _pending_ |
| 4.15.8 | Components of BCP — Backup of Required Supplies | _pending_ |
| 4.15.8 | Components of BCP — Insurance | _pending_ |
| 4.15.9 | Plan Testing — Specifications | _pending_ |
| 4.15.9 | Plan Testing — Test Execution | _pending_ |
| 4.15.9 | Plan Testing — Documentation of Results | _pending_ |
| 4.15.9 | Plan Testing — Results Analysis | _pending_ |
| 4.15.9 | Plan Testing — Plan Maintenance | _pending_ |
| 4.15.10 | BCM Good Practices | _pending_ |
| 4.15.11 | Auditing BCP — Reviewing the Plan | _pending_ |
| 4.15.11 | Auditing BCP — Evaluation of Offsite Storage | _pending_ |
| 4.15.11 | Auditing BCP — Interviewing Key Personnel | _pending_ |
| 4.15.11 | Auditing BCP — Reviewing Alternative Processing Contract | _pending_ |
| 4.15.11 | Auditing BCP — Reviewing Insurance Coverage | _pending_ |

### 4.16 Disaster Recovery Plans

| TOC | Subsection | Covered by |
|---|---|---|
| 4.16.1 | RPO, RTO, MTTR definitions | _pending_ |
| 4.16.2 | Recovery Strategies | _pending_ |
| 4.16.3 | Recovery Alternatives — Contractual Provisions | _pending_ |
| 4.16.3 | Recovery Alternatives — Procuring Alternative Hardware | _pending_ |
| 4.16.4 | Development of DRP — IT DRP Contents | _pending_ |
| 4.16.4 | Development of DRP — IT DRP Scenarios | _pending_ |
| 4.16.4 | Development of DRP — Recovery Procedures | _pending_ |
| 4.16.4 | Development of DRP — Organization and Responsibilities | _pending_ |
| 4.16.5 | DR Testing Methods — Types of Tests | _pending_ |
| 4.16.5 | DR Testing — Testing | _pending_ |
| 4.16.5 | DR Testing — Test Results | _pending_ |
| 4.16.6 | Invoking Disaster Recovery Plans | _pending_ |

---

## Tier-Mix Tally

| Tier | Authored | Target |
|---|---|---|
| Foundational | 4 | 26 |
| Application | 12 | 130 |
| Analysis | 4 | 104 |
| **Total** | **20** | **260** |

**D4 status:** in_progress; batch 1 (d4_001..d4_020) authored. 240/260 questions remaining across 12 batches.

## D4 batch plan (cadence)

| Batch | IDs | Mix | F running total | Notes |
|---|---|---|---|---|
| D4-1 | d4_001..d4_020 | 4F + 12A + 4An | 4 | broad TOC launch (network basics, ITAM, SLA, BIA, EUC/Shadow IT) |
| D4-2 | d4_021..d4_040 | 4F + 12A + 4An | 8 | hardware, USB, wireless, scheduling, system interfaces |
| D4-3 | d4_041..d4_060 | 4F + 12A + 4An | 12 | OS, access control, utilities, source code, capacity |
| D4-4 | d4_061..d4_080 | 2F + 12A + 6An | 14 | problem + incident mgmt, change/patch, log mgmt |
| D4-5 | d4_081..d4_100 | 2F + 12A + 6An | 16 | SLM, DBMS deeper, ITSM |
| D4-6 | d4_101..d4_120 | 2F + 12A + 6An | 18 | BIA, system resilience, network resilience |
| D4-7 | d4_121..d4_140 | 4F + 12A + 4An | 22 | backup/restoration, schemes, 3-2-1 |
| D4-8 | d4_141..d4_160 | 4F + 12A + 4An | 26 (closes F) | BCP planning, policy, components |
| D4-9 | d4_161..d4_180 | 0F + 14A + 6An | 26 | BCP testing, maintenance, audit |
| D4-10 | d4_181..d4_200 | 0F + 14A + 6An | 26 | DRP — RTO/RPO/MTTR, strategies, alternatives |
| D4-11 | d4_201..d4_220 | 0F + 14A + 6An | 26 | DRP — development, scenarios, procedures |
| D4-12 | d4_221..d4_240 | 0F + 14A + 6An | 26 | DRP — testing, invoking |
| D4-13 | d4_241..d4_260 | 0F + 6A + 14An | 26 | closing batch — synthesis / analysis depth |

Estimated total: ~26F + ~130A + ~104An. Closing batch (D4-13) is analysis-heavy to land the tier mix.
