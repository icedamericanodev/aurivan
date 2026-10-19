# audit_focus roll-out plan (Wave 3a)

Internal plan. `audit_focus` is the optional subtopic field that gives the IS
auditor's process view. It sits after the example, beside the IS auditor's lens:

- `review`: 2–3 audit steps, the step that must come first at the top
- `evidence`: 2–3 records or test results, strongest first (aim for 3)
- `recommend`: one imperative sentence that names who acts ("Have the … ")
- `decides`: who decides or accepts the risk, shown on its own line

At most 95 words, counted apart from the 380-word core. The full rules are in
`NOTES_SCHEMA_V2.md`. `scripts/lint_notes.py --audit-focus` lists every subtopic
still without the field.

## Scope
These are the 60 notes from the October 2026 curriculum coverage review whose
`how_it_works` has no audit step, so the process lens rests on the example and
the rule alone. Fifteen are done (pilot and N4); 45 remain.

## Priority order
1. **Exam importance:** subtopics rated high-yield in the curriculum checklist come first.
2. **Bank weight:** within a tier, more questions homed in the note (`practice_ids`) come first.
3. **Domain weight:** ties go to D4 and D5 (26%), then D1 and D2 (18%), then D3 (12%).

Batches of about nine fit one `cisa-notes-curator` pass. Check each note's
`practice_ids` stems and keys before writing, so the field never contradicts a key.
Trim any note already over 380 core words in the same pass (marked *). When
`decides` is added, drop any "management decides" ending from the example, so the
line appears once on the card.

| # | Code | Subtopic | Yield | Bank | Batch |
|---|---|---|---|---|---|
| 1 | 4B1.1 | BIA Purpose, Scope and Ownership | high | 9 | Pilot (done) |
| 2 | 5A7.2 | Certificate Life Cycle and Revocation | high | 9 | N4 (done) |
| 3 | 5A8.2 | Shared Responsibility in the Cloud | high | 8 | N4 (done) |
| 4 | 5A3.1 | Authentication, Authorization and Accountability | high | 7 | N4 (done) |
| 5 | 5A6.5 | Cryptographic Key Management | high | 7 | Pilot (done) |
| 6 | 4A7.1 | Incident Management and the Service Desk | high | 6 | N4 (done) |
| 7 | 4A7.3 | Problem Management and Root Cause Analysis | high | 6 | N4 (done) |
| 8 | 3B1.2 | Test Types and Techniques | high | 6 | N4 (done) |
| 9 | 4A11.4 | Database Recovery | high | 5 | N4 (done; trimmed) |
| 10 | 4B3.1 | Backup Schemes, Rotation and the 3-2-1 Rule | high | 5 | Pilot (done; trimmed) |
| 11 | 5A4.4 | Intrusion Detection, Prevention and Network Access Control | high | 5 | N4 (done; trimmed) |
| 12 | 5A6.2 | Asymmetric Encryption and the Digital Envelope | high | 5 | N4 (done) |
| 13 | 5B2.2* | Social Engineering and Business Email Compromise | high | 5 | N5 |
| 14 | 1A3.2 | Risk Assessment Methods | high | 5 | Pilot (done) |
| 15 | 4A4.2 | Interface Controls | high | 4 | N5 |
| 16 | 5A6.1 | Symmetric Encryption | high | 4 | N5 |
| 17 | 5A6.3 | Hashing, Salting and Tokenization | high | 4 | N5 |
| 18 | 5A6.4 | Digital Signatures | high | 4 | N5 |
| 19 | 5A9.2 | Wireless Network Security | high | 4 | N5 |
| 20 | 5B3.3 | Penetration Test Types and Knowledge Levels | high | 4 | N5 |
| 21 | 5B2.3 | Web Application Attacks | high | 3 | N5 |
| 22 | 3A4.2 | Application Controls: Input, Processing, Output | high | 2 | Pilot (done) |
| 23 | 5A1.5 | Privacy Principles and Acceptable Use | medium | 12 | N5 |
| 24 | 5B5.3 | Breach Notification, Legal Duties and Third Parties | medium | 11 | N6 |
| 25 | 4B5.3 | Invocation and Recovery Procedures | medium | 10 | N6 |
| 26 | 5B2.5* | Credential and Endpoint Attacks | medium | 9 | N6 |
| 27 | 1B4.6 | Auditing AI Systems | medium | 9 | N6 |
| 28 | 5B2.6 | Advanced Persistent Threats and Zero-Day Exploits | medium | 8 | N6 |
| 29 | 4B3.3 | Offsite Storage and Custody | medium | 7 | N6 |
| 30 | 4A9.1 | Log Coverage and Retention | medium | 6 | N6 |
| 31 | 5B1.2 | Phishing Simulations and Awareness Metrics | medium | 6 | N6 |
| 32 | 2B2.1 | Sourcing Decisions | medium | 6 | Pilot (done) |
| 33 | 5A3.2 | Single Sign-On and Federation | medium | 5 | N6 |
| 34 | 3B2.3 | Deployment Strategies and Rollback | medium | 5 | N7 |
| 35 | 4A11.3 | Data Integrity and Simultaneous Updates | medium | 4 | N7 |
| 36 | 4A6.1 | Availability and Its Measures | medium | 4 | N7 |
| 37 | 4B2.1 | Resilient Technology Design | medium | 4 | N7 |
| 38 | 4B2.2 | Redundancy Techniques: RAID, Clustering and Network Diversity | medium | 4 | N7 |
| 39 | 4B3.2 | Electronic Vaulting, Remote Journaling and Replication | medium | 4 | N7 |
| 40 | 5A4.7 | Endpoint Protection and Hardening | medium | 4 | N7 |
| 41 | 5A8.3 | Virtualization and the Hypervisor | medium | 4 | N7 |
| 42 | 5B2.1 | Malware and Denial-of-Service Attacks | medium | 4 | N7 |
| 43 | 1A2.4 | Integrated Audits | medium | 4 | N8 |
| 44 | 2B1.4 | Capacity and Resource Planning | medium | 4 | N8 |
| 45 | 2B1.5 | Enterprise Change Management | medium | 4 | N8 |
| 46 | 4A1.2 | OSI and TCP/IP Reference Models | medium | 3 | N8 |
| 47 | 4A11.1 | Database Models | medium | 3 | N8 |
| 48 | 5A2.2 | Fire Suppression Systems | medium | 3 | N8 |
| 49 | 5A3.6 | Zero Trust Architecture | medium | 3 | N8 |
| 50 | 5A4.3 | Secure Remote Access and VPNs | medium | 3 | N8 |
| 51 | 5A4.5 | Intrusion Detection Methods | medium | 3 | N8 |
| 52 | 5B1.1 | Role-Based Security Awareness Programs | medium | 3 | N9 |
| 53 | 5B2.4 | Network Attacks: Spoofing, Interception and Tunneling | medium | 3 | N9 |
| 54 | 2A4.2 | Enterprise Architecture Frameworks: Zachman and TOGAF | medium | 3 | N9 |
| 55 | 2A5.3 | Risk Analysis Methods | medium | 3 | N9 |
| 56 | 3A2.3 | Financial Measures and Investment Decisions | medium | 3 | N9 |
| 57 | 5A8.5 | Software-Defined Networking | medium | 2 | N9 |
| 58 | 2A6.2 | Privacy Documentation and Impact Assessments | medium | 2 | N9 |
| 59 | 1A1.2* | ISACA Code of Professional Ethics | medium | 1 | N9 |
| 60 | 3A1.3 | Scheduling and the Critical Path | medium | 0 | N9 |

"Bank" is the number of questions homed in the note today; it is internal and is
never shown to learners.

## Notes for writers
- **Attack subtopics (5B2.x):** audit the controls that stop or detect the attack,
  not the attack itself, and not the live incident response.
- **Reference subtopics** (4A1.2 OSI, 4A11.1 database models, 2A4.2 Zachman and
  TOGAF, 3A1.3 critical path, 5A8.5 SDN): keep the field short and practical, such
  as how the auditor uses the model to scope or read evidence. If no honest audit
  step exists, leave the field out and say why in the PR.
- **Audit-method subtopics (1A1.2 ethics, 1A2.4, 1B4.6):** say plainly that the
  audit function is under review (independence declarations, quality assurance
  files). Audit management acts; the audit committee usually decides.
- **After the 60:** subtopics that already carry an audit bullet in `how_it_works`
  can move that bullet into `audit_focus` later. That frees core words; it is
  optional and lower priority.
