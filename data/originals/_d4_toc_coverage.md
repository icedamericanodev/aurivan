# D4 Coverage vs ISACA CISA Review Manual TOC

**Source:** ISACA CISA Official Review Manual, 28th Edition — Domain 4 (Information Systems Operations and Business Resilience), Table of Contents (verified verbatim from user).

**Purpose:** map each authored D4 question (`d4_001` … `d4_NNN`) back to the Review Manual subsection it covers, so future authoring batches target genuine TOC gaps. Coverage map verified pre-authoring (rather than post-hoc like D3) to ensure 1:1 mapping from the start.

**Maintenance rule:** update this doc in the same PR that lands a new authoring batch. Counts at the bottom must match `data/originals/_concept_queue.yaml` and `data/originals/d4.json`.

**Last updated:** after D4 batch 5 (d4_081..d4_100) — 100 of 260 questions authored (38%).

## Part A — Information Systems Operations

### 4.1 IT Components

| TOC | Subsection | Covered by |
|---|---|---|
| 4.1.1 | Networking — LAN/WAN security (802.1X NAC) | d4_005 (application) |
| 4.1.1 | Networking — TCP/IP vs OSI Reference Model | d4_001 (foundational — layer mapping) |
| 4.1.1 | Networking — Network Administration and Control | covered by d4_005, d4_021 |
| 4.1.1 | Networking — Converged Protocols | _pending_ |
| 4.1.1 | Networking — Internet Protocol Networking | covered by d4_021 (NAT) |
| 4.1.1 | Networking — Network Address Translation (NAT) | d4_021 (foundational — NAT definition) |
| 4.1.2 | Computer Hardware Components and Architectures | d4_022 (foundational — categorization) |
| 4.1.3 | Common Enterprise Devices (Proxy Servers) | d4_006 (application — proxy controls) |
| 4.1.3 | Common Enterprise Devices — Load Balancer Governance | d4_049 (application), d4_060 (analysis — EOL decision) |
| 4.1.4 | USB Mass Storage Devices — Risk + Controls | d4_007 (application — device-control policy) |
| 4.1.5 | Wireless Communication Technologies | d4_008 (application — WPA3-Enterprise) |
| 4.1.6 | Hardware Maintenance | d4_025 (application — monitoring/reviews), d4_038 (analysis — refresh decision) |
| 4.1.7 | Hardware Reviews | d4_043 (application — audit scope) |

### 4.2 IT Asset Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.2 | IT Asset Management (lifecycle, inventory, disposal) | d4_009 (application — full lifecycle program) |

### 4.3 Job Scheduling and Production Process Automation

| TOC | Subsection | Covered by |
|---|---|---|
| 4.3.1 | Job Scheduling Software | d4_002 (foundational — PRIMARY function) |
| 4.3.2 | Scheduling Reviews | d4_026 (application — review scope) |

### 4.4 System Interfaces

| TOC | Subsection | Covered by |
|---|---|---|
| 4.4 | System Interfaces — Risk and Controls (consolidated) | d4_010 (application — receiver-side reconciliation) |
| 4.4.1 | Risk Associated With System Interfaces | covered by d4_010 |
| 4.4.2 | Controls Associated With System Interfaces | covered by d4_010 |

### 4.5 End-User Computing and Shadow IT

| TOC | Subsection | Covered by |
|---|---|---|
| 4.5.1 | End-User Computing | d4_011 (application — risk-tiered EUC controls) |
| 4.5.2 | Shadow IT | d4_012 (application — tiered governance), d4_018 (analysis — discovery remediation) |

### 4.6 Systems Availability and Capacity

| TOC | Subsection | Covered by |
|---|---|---|
| 4.6.1 | IS Architecture and Software | d4_041 (application — stack layers) |
| 4.6.2 | Operating Systems — Software Control Features | d4_045 (application — hardening) |
| 4.6.2 | Operating Systems — Integrity Issues | d4_046 (application — integrity controls), d4_057 (analysis — security vs ops) |
| 4.6.2 | Operating Systems — Reviews | d4_013 (application — multi-dimensional periodic review) |
| 4.6.3 | Access Control Software | d4_027 (application — governance) |
| 4.6.4 | Data Communications Software | d4_044 (foundational — definition) |
| 4.6.5 | Utility Programs | d4_030 (application — governance) |
| 4.6.6 | Software Licensing Issues | d4_029 (application — compliance) |
| 4.6.7 | Source Code Management | d4_028 (application — production code custody) |
| 4.6.8 | Capacity Management | d4_014 (application — proactive forecast + trends) |

### 4.7 Problem and Incident Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.7.1 | Problem Management | d4_031 (application — vs incident mgmt), d4_039 (analysis — systemic investigation) |
| 4.7.2 | Process of Incident Handling | d4_015 (application — ITIL 4 incident process), d4_017 (analysis — multi-incident overlap) |
| 4.7.3 | Detection, Documentation, Control, Resolution, Reporting | d4_050 (application — DDCRR sequence) |
| 4.7.4 | Support / Help Desk | d4_016 (application — multi-dimensional effectiveness) |
| 4.7.5 | Network Management Tools | d4_032 (application — combined coverage) |
| 4.7.6 | Problem Management Reporting Reviews | d4_051 (application — cadence) |

### 4.8 IT Change, Configuration and Patch Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.8.1 | Patch Management | d4_023 (foundational — PRIMARY purpose), d4_033 (application — formal steps), d4_037 (analysis — patch deferral) |
| 4.8.2 | Release Management | d4_024 (foundational — PRIMARY purpose), d4_034 (application — vs change mgmt), d4_040 (analysis — heterogeneous coordination) |
| 4.8.3 | IS Operations — Operations Reviews | d4_052 (application — audit scope) |

### 4.9 Operational Log Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.9.1 | Types of Logs | d4_035 (application — types and coverage) |
| 4.9.2 | Log Management — Data Collection | covered by d4_035 |
| 4.9.2 | Log Management — Generating Alerts | covered by d4_036 |
| 4.9.2 | Log Management — Storing and Protecting Logs | covered by d4_035 |
| 4.9.2 | Log Management — Analyzing Log Data | covered by d4_036 |
| 4.9.2 | Log Management — Reporting Concerns | _pending_ |
| 4.9.2 | Log Management — SIEM Integration | d4_036 (application — SIEM integration) |

### 4.10 IT Service Level Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.10.1 | Service Level Agreements (SLAs) | d4_003 (foundational — definition) |
| 4.10.2 | Monitoring of Service Levels | d4_019 (analysis — SLA breach root cause) |
| 4.10.3 | Service Levels and Enterprise Architecture | d4_053 (application — alignment), d4_059 (analysis — legacy mismatch) |

### 4.11 Database Management

| TOC | Subsection | Covered by |
|---|---|---|
| 4.11.1 | DBMS Architecture (Metadata) | d4_054 (application — metadata/data dictionary) |
| 4.11.2 | Database Structure — Hierarchical | covered by d4_056 |
| 4.11.2 | Database Structure — Network | covered by d4_056 |
| 4.11.2 | Database Structure — Relational (RDBMS) | d4_042 (application — vs NoSQL) |
| 4.11.2 | Database Structure — Object-Oriented (OODBMS) | covered by d4_056 |
| 4.11.2 | Database Structure — NoSQL | d4_042 (application), d4_055 (application — when appropriate) |
| 4.11.2 | Database Structure — Legacy Models | d4_056 (application — audit considerations) |
| 4.11.3 | Database Controls | d4_047 (application — multi-element coverage), d4_058 (analysis — performance vs availability) |
| 4.11.4 | Database Reviews | d4_048 (application — audit scope) |

## Part B — Business Resilience

### 4.12 Business Impact Analysis

| TOC | Subsection | Covered by |
|---|---|---|
| 4.12 | BIA fundamentals | d4_004 (foundational — PRIMARY purpose), d4_020 (analysis — RTO/RPO conflict) |
| 4.12.1 | Classification of Operations and Criticality Analysis | d4_070 (application — criticality classification), d4_078 (analysis — 3-stakeholder conflict) |

### 4.13 System and Operational Resilience

| TOC | Subsection | Covered by |
|---|---|---|
| 4.13.1 | Application Resiliency and Disaster Recovery | d4_067 (application — design), d4_080 (analysis — DDoS active response) |
| 4.13.2 | Telecommunication Networks Resiliency and DR Methods | d4_068 (application — design), d4_077 (analysis — cross-region failover) |

### 4.14 Data Backup, Storage and Restoration

| TOC | Subsection | Covered by |
|---|---|---|
| 4.14.1 | Data Storage Resiliency and DR Methods | d4_069 (application — storage resiliency) |
| 4.14.2 | Backup and Restoration — Offsite Library Controls | d4_065 (application — controls) |
| 4.14.2 | Backup and Restoration — Cloud Backup | d4_066 (application — governance), d4_076 (analysis — cloud vs on-prem) |
| 4.14.2 | Backup and Restoration — Security of Offsite Facilities | covered by d4_065 |
| 4.14.2 | Backup and Restoration — Media/Documentation Backup | _pending_ |
| 4.14.2 | Backup and Restoration — Backup Devices/Media | _pending_ |
| 4.14.2 | Backup and Restoration — Periodic Procedures | _pending_ |
| 4.14.2 | Backup and Restoration — Frequency of Rotation | covered by d4_064 |
| 4.14.2 | Backup Test Integrity | d4_075 (analysis — test failure) |
| 4.14.3 | Backup Schemes — Full / Incremental / Differential | d4_061 (application — schemes) |
| 4.14.3 | Backup Schemes — Method of Rotation (GFS) | d4_064 (application — GFS) |
| 4.14.3 | Backup Schemes — Record Keeping for Offsite Storage | _pending_ |
| 4.14.3 | Backup Schemes — 3-2-1 Backup Strategy | d4_063 (application — 3-2-1) |

### 4.15 Business Continuity Plan

| TOC | Subsection | Covered by |
|---|---|---|
| 4.15.1 | IT Business Continuity Planning | _pending_ |
| 4.15.2 | Disasters and Disruptive Events — Pandemic Planning | d4_079 (analysis — pandemic continuity) |
| 4.15.2 | Disasters and Disruptive Events — Image/Reputation/Brand Damage | _pending_ |
| 4.15.2 | Disasters and Disruptive Events — Unanticipated/Unforeseeable | _pending_ |
| 4.15.3 | BCP Process | d4_071 (application — lifecycle) |
| 4.15.4 | BCP Policy | d4_072 (application — required components) |
| 4.15.5 | BCP Incident Management | d4_073 (application — activation) |
| 4.15.6 | Development of BCP | d4_090 (application — detailed steps), d4_100 (analysis — succession crisis) |
| 4.15.7 | Other Issues in Plan Development | _pending_ |
| 4.15.8 | Components of BCP — Key Decision-Making Personnel | d4_091 (application), d4_100 (analysis — succession) |
| 4.15.8 | Components of BCP — Backup of Required Supplies | d4_092 (application — supplies governance) |
| 4.15.8 | Components of BCP — Insurance | d4_093 (application — insurance) |
| 4.15.9 | Plan Testing — Specifications | _pending_ |
| 4.15.9 | Plan Testing — Test Execution | _pending_ |
| 4.15.9 | Plan Testing — Documentation of Results | _pending_ |
| 4.15.9 | Plan Testing — Results Analysis | _pending_ |
| 4.15.9 | Plan Testing — Plan Maintenance | d4_094 (application — maintenance lifecycle) |
| 4.15.10 | BCM Good Practices | _pending_ |
| 4.15.11 | Auditing BCP — Reviewing the Plan | d4_097 (analysis — regulator exam findings) |
| 4.15.11 | Auditing BCP — Evaluation of Offsite Storage | _pending_ |
| 4.15.11 | Auditing BCP — Interviewing Key Personnel | _pending_ |
| 4.15.11 | Auditing BCP — Reviewing Alternative Processing Contract | d4_099 (analysis — concentration risk) |
| 4.15.11 | Auditing BCP — Reviewing Insurance Coverage | d4_098 (analysis — coverage gap) |

### 4.16 Disaster Recovery Plans

| TOC | Subsection | Covered by |
|---|---|---|
| 4.16.1 | RPO, RTO, MTTR definitions | d4_062 (application — definitions), d4_083 (application — BIA alignment) |
| 4.16.2 | Recovery Strategies (hot/warm/cold sites) | d4_074 (application — sites) |
| 4.16.3 | Recovery Alternatives — Contractual Provisions | d4_084 (application — vendor contracts), d4_099 (analysis — concentration) |
| 4.16.3 | Recovery Alternatives — Procuring Alternative Hardware | d4_085 (application — procurement) |
| 4.16.3 | Recovery Alternatives — Beyond Hot/Warm/Cold | d4_082 (foundational — reciprocal/mobile/mirrored) |
| 4.16.4 | Development of DRP — IT DRP Contents | d4_086 (application — required sections) |
| 4.16.4 | Development of DRP — IT DRP Scenarios | d4_087 (application — disruption spectrum) |
| 4.16.4 | Development of DRP — Recovery Procedures | d4_088 (application — structure) |
| 4.16.4 | Development of DRP — Organization and Responsibilities | d4_089 (application — roles) |
| 4.16.5 | DR Testing Methods — Types of Tests | d4_081 (foundational — test spectrum), d4_095 (analysis — mid-test failure) |
| 4.16.5 | DR Testing — Testing | covered by d4_081 |
| 4.16.5 | DR Testing — Test Results | _pending_ |
| 4.16.6 | Invoking Disaster Recovery Plans | d4_096 (analysis — invocation under exec absence) |

---

## Tier-Mix Tally

| Tier | Authored | Target |
|---|---|---|
| Foundational | 16 | 26 |
| Application | 60 | 130 |
| Analysis | 24 | 104 |
| **Total** | **100** | **260** |

**D4 status:** in_progress; batches 1-5 (d4_001..d4_100) authored. 160/260 questions remaining across 8 batches.

## D4 batch plan (cadence)

| Batch | IDs | Mix | F running total | Notes |
|---|---|---|---|---|
| D4-1 | d4_001..d4_020 | 4F + 12A + 4An | 4 | broad TOC launch (network basics, ITAM, SLA, BIA, EUC/Shadow IT) |
| D4-2 | d4_021..d4_040 | 4F + 12A + 4An | 8 | hardware, USB, wireless, scheduling, system interfaces |
| D4-3 | d4_041..d4_060 | 4F + 12A + 4An | 12 | OS, access control, utilities, source code, capacity, DBMS |
| D4-4 | d4_061..d4_080 | 0F + 14A + 6An | 12 | backup/restoration, schemes, 3-2-1, resilience, BIA |
| D4-5 | d4_081..d4_100 | 2F + 12A + 6An | 14 | DRP depth + BCP development/components |
| D4-6 | d4_101..d4_120 | 4F + 12A + 4An | 18 | DBMS gaps, log management, ITSM, system interfaces gaps |
| D4-7 | d4_121..d4_140 | 4F + 12A + 4An | 22 | BCP testing, maintenance, BCM good practices, pandemic |
| D4-8 | d4_141..d4_160 | 4F + 12A + 4An | 26 (closes F) | converged protocols, IP networking, hardware reviews, scheduling, EUC depth |
| D4-9 | d4_161..d4_180 | 0F + 14A + 6An | 26 | BCP audit depth, plan testing specs, test results |
| D4-10 | d4_181..d4_200 | 0F + 14A + 6An | 26 | DRP recovery scenarios, alternative sites depth |
| D4-11 | d4_201..d4_220 | 0F + 14A + 6An | 26 | OS integrity, database controls depth, log reporting |
| D4-12 | d4_221..d4_240 | 0F + 14A + 6An | 26 | help desk depth, ITSM operations, backup depth |
| D4-13 | d4_241..d4_260 | 0F + 6A + 14An | 26 | closing batch — analysis synthesis |

Estimated total: ~26F + ~130A + ~104An. Closing batch (D4-13) is analysis-heavy to land the tier mix.
