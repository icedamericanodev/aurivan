# AAIA Framework Citation Library

**Purpose:** the canonical `framework_ref` strings for the AAIA question bank
(`data/aaia/originals/d{N}.json`). Started 30 Oct 2026 with the pilot
(`aaia_d1_001`–`020`, `aaia_d2_001`–`020`, `aaia_d3_001`–`020`).

**Format** (same as the CISA and CC libraries):
- Each canonical citation is a bullet at the start of a line (`- `). Split a
  `framework_ref` on `;` and match each part exactly.
- Indented sub-bullets record the status and are ignored by the parser.
- Add a new citation here in the same change that first uses it, with its status.

**Status key:**
- **Verified:** the section, subcategory, control or technique was checked against
  the opened source on the date given. Paraphrased titles in brackets are ours;
  NIST 800-53 control titles and ATLAS technique names are the source's own.
- **Likely:** the edition is current and the title is believed right, but the
  official text was not opened from this environment. Check before release.
- **Context only:** may be named in notes and explanations, never in `framework_ref`.

**One form everywhere.** `<publisher> <document> <locator> (<title or short
paraphrase>)`, no comma before the parenthesis, one citation per `;` part.

---

## NIST AI 100-1, Artificial Intelligence Risk Management Framework (AI RMF 1.0), Jan 2023

All entries: **Verified** 30 Oct 2026 against the PDF at
https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf (Part 2, Tables 1–4).
The bracket is a short paraphrase of the subcategory statement.

### GOVERN
- NIST AI 100-1 GOVERN 1.1 (Legal and regulatory requirements involving AI are understood and managed)
- NIST AI 100-1 GOVERN 1.2 (Trustworthy AI characteristics built into policies and processes)
- NIST AI 100-1 GOVERN 1.3 (Level of risk management activity set by risk tolerance)
- NIST AI 100-1 GOVERN 1.4 (Risk management process established through transparent policies and controls)
- NIST AI 100-1 GOVERN 1.5 (Ongoing monitoring and periodic review of the risk management process)
- NIST AI 100-1 GOVERN 1.6 (Mechanisms to inventory AI systems)
- NIST AI 100-1 GOVERN 1.7 (Decommissioning AI systems safely)
- NIST AI 100-1 GOVERN 2.1 (Roles, responsibilities and lines of communication documented)
- NIST AI 100-1 GOVERN 2.2 (AI risk management training for personnel and partners)
- NIST AI 100-1 GOVERN 2.3 (Executive leadership takes responsibility for AI risk decisions)
- NIST AI 100-1 GOVERN 3.1 (Decisions informed by a diverse team)
- NIST AI 100-1 GOVERN 3.2 (Roles defined for human-AI configurations and oversight)
- NIST AI 100-1 GOVERN 4.1 (Critical thinking and safety-first mindset)
- NIST AI 100-1 GOVERN 4.2 (Teams document and communicate AI risks and impacts)
- NIST AI 100-1 GOVERN 4.3 (Practices enable AI testing, incident identification and information sharing)
- NIST AI 100-1 GOVERN 5.1 (Feedback collected from those external to the team)
- NIST AI 100-1 GOVERN 5.2 (Adjudicated feedback incorporated into design)
- NIST AI 100-1 GOVERN 6.1 (Policies address third-party AI risks including intellectual property)
- NIST AI 100-1 GOVERN 6.2 (Contingency processes for failures in high-risk third-party data or AI)

### MAP
- NIST AI 100-1 MAP 1.1 (Intended purposes, context and laws documented)
- NIST AI 100-1 MAP 1.2 (Interdisciplinary AI actors establish context)
- NIST AI 100-1 MAP 1.3 (Mission and goals for the AI technology documented)
- NIST AI 100-1 MAP 1.4 (Business value or context of use defined or re-evaluated)
- NIST AI 100-1 MAP 1.5 (Organizational risk tolerances determined and documented)
- NIST AI 100-1 MAP 1.6 (System requirements elicited from relevant AI actors)
- NIST AI 100-1 MAP 2.1 (Tasks and methods the AI system supports are defined)
- NIST AI 100-1 MAP 2.2 (Knowledge limits and human oversight of outputs documented)
- NIST AI 100-1 MAP 2.3 (Scientific integrity and TEVV considerations, including data representativeness)
- NIST AI 100-1 MAP 3.1 (Potential benefits examined and documented)
- NIST AI 100-1 MAP 3.2 (Potential costs of AI errors examined against risk tolerance)
- NIST AI 100-1 MAP 3.3 (Targeted application scope specified)
- NIST AI 100-1 MAP 3.4 (Operator and practitioner proficiency defined and assessed)
- NIST AI 100-1 MAP 3.5 (Processes for human oversight defined and assessed)
- NIST AI 100-1 MAP 4.1 (Legal and technology risks of components including third-party data mapped)
- NIST AI 100-1 MAP 4.2 (Internal risk controls for components identified)
- NIST AI 100-1 MAP 5.1 (Likelihood and magnitude of impacts characterized)
- NIST AI 100-1 MAP 5.2 (Regular engagement with relevant AI actors on impacts)

### MEASURE
- NIST AI 100-1 MEASURE 1.1 (Methods and metrics selected starting with the most significant risks)
- NIST AI 100-1 MEASURE 1.2 (Metrics and control effectiveness regularly assessed)
- NIST AI 100-1 MEASURE 1.3 (Independent assessors not on the front-line development team)
- NIST AI 100-1 MEASURE 2.1 (Test sets, metrics and TEVV tools documented)
- NIST AI 100-1 MEASURE 2.2 (Evaluations involving human subjects meet requirements)
- NIST AI 100-1 MEASURE 2.3 (Performance measured in conditions similar to deployment)
- NIST AI 100-1 MEASURE 2.4 (Functionality and behavior monitored in production)
- NIST AI 100-1 MEASURE 2.5 (System shown to be valid and reliable; limits documented)
- NIST AI 100-1 MEASURE 2.6 (Evaluated regularly for safety risks; fails safely)
- NIST AI 100-1 MEASURE 2.7 (Security and resilience evaluated and documented)
- NIST AI 100-1 MEASURE 2.8 (Transparency and accountability risks examined)
- NIST AI 100-1 MEASURE 2.9 (Model explained, validated and documented; output interpreted in context)
- NIST AI 100-1 MEASURE 2.10 (Privacy risk examined and documented)
- NIST AI 100-1 MEASURE 2.11 (Fairness and bias evaluated and documented)
- NIST AI 100-1 MEASURE 2.12 (Environmental impact assessed)
- NIST AI 100-1 MEASURE 2.13 (Effectiveness of TEVV metrics and processes evaluated)
- NIST AI 100-1 MEASURE 3.1 (Existing, unanticipated and emergent risks tracked)
- NIST AI 100-1 MEASURE 3.2 (Risk tracking where measurement is difficult)
- NIST AI 100-1 MEASURE 3.3 (Feedback and appeal processes for end users and affected communities)
- NIST AI 100-1 MEASURE 4.1 (Measurement connected to deployment context with domain experts)
- NIST AI 100-1 MEASURE 4.2 (Trustworthiness results validated with domain experts)
- NIST AI 100-1 MEASURE 4.3 (Performance improvements or declines identified and documented)

### MANAGE
- NIST AI 100-1 MANAGE 1.1 (Decide whether the system meets its purpose and should proceed)
- NIST AI 100-1 MANAGE 1.2 (Treatment prioritized by impact, likelihood and resources)
- NIST AI 100-1 MANAGE 1.3 (Responses to high-priority risks planned: mitigate, transfer, avoid, accept)
- NIST AI 100-1 MANAGE 1.4 (Negative residual risks documented)
- NIST AI 100-1 MANAGE 2.1 (Resources and non-AI alternatives considered)
- NIST AI 100-1 MANAGE 2.2 (Mechanisms sustain the value of deployed AI)
- NIST AI 100-1 MANAGE 2.3 (Procedures to respond to and recover from previously unknown risks)
- NIST AI 100-1 MANAGE 2.4 (Mechanisms and responsibilities to supersede, disengage or deactivate AI)
- NIST AI 100-1 MANAGE 3.1 (Third-party AI risks monitored and controls applied)
- NIST AI 100-1 MANAGE 3.2 (Pre-trained models monitored as part of regular maintenance)
- NIST AI 100-1 MANAGE 4.1 (Post-deployment monitoring including appeal, override, incident response and change management)
- NIST AI 100-1 MANAGE 4.2 (Continual improvement integrated into AI system updates)
- NIST AI 100-1 MANAGE 4.3 (Incidents and errors communicated and tracked)

### Other parts of AI RMF 1.0
- NIST AI 100-1 Section 3 (AI Risks and Trustworthiness)
  - Verified 30 Oct 2026: the seven characteristics (valid and reliable; safe; secure and resilient; accountable and transparent; explainable and interpretable; privacy-enhanced; fair with harmful bias managed).
- NIST AI 100-1 Section 3.4 (Accountable and Transparent)
- NIST AI 100-1 Section 3.5 (Explainable and Interpretable)
- NIST AI 100-1 Section 3.7 (Fair with Harmful Bias Managed)
  - Section numbers 3.4, 3.5 and 3.7 Verified 30 Oct 2026 against the table of contents.

## NIST AI 600-1, AI RMF Generative Artificial Intelligence Profile, Jul 2024

All entries: **Verified** 30 Oct 2026 against
https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf (Section 2, the twelve risks).
- NIST AI 600-1 Section 2.2 (Confabulation)
- NIST AI 600-1 Section 2.4 (Data Privacy)
- NIST AI 600-1 Section 2.6 (Harmful Bias and Homogenization)
- NIST AI 600-1 Section 2.7 (Human-AI Configuration)
- NIST AI 600-1 Section 2.8 (Information Integrity)
- NIST AI 600-1 Section 2.9 (Information Security)
- NIST AI 600-1 Section 2.10 (Intellectual Property)
- NIST AI 600-1 Section 2.12 (Value Chain and Component Integration)

## NIST AI 100-2e2025, Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations, Mar 2025

All entries: **Verified** 30 Oct 2026 against
https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf (table of contents and section text).
- NIST AI 100-2e2025 Section 2.2 (Evasion Attacks and Mitigations)
- NIST AI 100-2e2025 Section 2.3 (Poisoning Attacks and Mitigations)
- NIST AI 100-2e2025 Section 2.4 (Privacy Attacks and Mitigations)
- NIST AI 100-2e2025 Section 3.2 (Supply Chain Attacks and Mitigations)
- NIST AI 100-2e2025 Section 3.3 (Direct Prompting Attacks and Mitigations)
- NIST AI 100-2e2025 Section 3.4 (Indirect Prompt Injection Attacks and Mitigations)
- NIST AI 100-2e2025 Section 3.5 (Security of Agents)

## MITRE ATLAS

All entries: **Verified** 30 Oct 2026 against the ATLAS data file version 5.6.0,
https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/ATLAS.yaml
(technique names are ATLAS's own; atlas.mitre.org itself is blocked here).
- MITRE ATLAS AML.T0010 (AI Supply Chain Compromise)
- MITRE ATLAS AML.T0015 (Evade AI Model)
- MITRE ATLAS AML.T0018 (Manipulate AI Model)
- MITRE ATLAS AML.T0020 (Poison Training Data)
- MITRE ATLAS AML.T0024 (Exfiltration via AI Inference API)
- MITRE ATLAS AML.T0029 (Denial of AI Service)
- MITRE ATLAS AML.T0043 (Craft Adversarial Data)
- MITRE ATLAS AML.T0051 (LLM Prompt Injection)
- MITRE ATLAS AML.T0053 (AI Agent Tool Invocation)
- MITRE ATLAS AML.T0054 (LLM Jailbreak)
- MITRE ATLAS AML.T0056 (Extract LLM System Prompt)
- MITRE ATLAS AML.T0057 (LLM Data Leakage)
- MITRE ATLAS AML.T0070 (RAG Poisoning)

## NIST SP 800-53 Rev. 5, Security and Privacy Controls (Sep 2020, updated Dec 2020)

All entries: **Verified** 30 Oct 2026 (control titles) against
https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf.
The fit to each item is judged in review.
- NIST SP 800-53 Rev. 5 AC-2 (Account Management)
- NIST SP 800-53 Rev. 5 AC-3 (Access Enforcement)
- NIST SP 800-53 Rev. 5 AC-6 (Least Privilege)
- NIST SP 800-53 Rev. 5 AT-2 (Literacy Training and Awareness)
- NIST SP 800-53 Rev. 5 AU-2 (Event Logging)
- NIST SP 800-53 Rev. 5 AU-6 (Audit Record Review, Analysis, and Reporting)
- NIST SP 800-53 Rev. 5 AU-11 (Audit Record Retention)
- NIST SP 800-53 Rev. 5 CA-2 (Control Assessments)
- NIST SP 800-53 Rev. 5 CA-5 (Plan of Action and Milestones)
- NIST SP 800-53 Rev. 5 CA-7 (Continuous Monitoring)
- NIST SP 800-53 Rev. 5 CM-2 (Baseline Configuration)
- NIST SP 800-53 Rev. 5 CM-3 (Configuration Change Control)
- NIST SP 800-53 Rev. 5 CM-4 (Impact Analyses)
- NIST SP 800-53 Rev. 5 CM-6 (Configuration Settings)
- NIST SP 800-53 Rev. 5 CM-8 (System Component Inventory)
- NIST SP 800-53 Rev. 5 IR-4 (Incident Handling)
- NIST SP 800-53 Rev. 5 IR-6 (Incident Reporting)
- NIST SP 800-53 Rev. 5 IR-8 (Incident Response Plan)
- NIST SP 800-53 Rev. 5 PM-9 (Risk Management Strategy)
- NIST SP 800-53 Rev. 5 PM-28 (Risk Framing)
- NIST SP 800-53 Rev. 5 PT-2 (Authority to Process Personally Identifiable Information)
- NIST SP 800-53 Rev. 5 PT-3 (Personally Identifiable Information Processing Purposes)
- NIST SP 800-53 Rev. 5 RA-3 (Risk Assessment)
- NIST SP 800-53 Rev. 5 RA-8 (Privacy Impact Assessments)
- NIST SP 800-53 Rev. 5 SA-4 (Acquisition Process)
- NIST SP 800-53 Rev. 5 SA-9 (External System Services)
- NIST SP 800-53 Rev. 5 SA-11 (Developer Testing and Evaluation)
- NIST SP 800-53 Rev. 5 SC-7 (Boundary Protection)
- NIST SP 800-53 Rev. 5 SI-4 (System Monitoring)
- NIST SP 800-53 Rev. 5 SI-7 (Software, Firmware, and Information Integrity)
- NIST SP 800-53 Rev. 5 SI-10 (Information Input Validation)
- NIST SP 800-53 Rev. 5 SI-12 (Information Management and Retention)
- NIST SP 800-53 Rev. 5 SR-3 (Supply Chain Controls and Processes)
- NIST SP 800-53 Rev. 5 SR-4 (Provenance)
- NIST SP 800-53 Rev. 5 SR-6 (Supplier Assessments and Reviews)

## NIST CSF 2.0 (CSWP 29), Feb 2024

All entries: **Verified** 30 Oct 2026 against
https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf (Appendix A, the Core).
- NIST CSF 2.0 GV.OC-03 (Legal, regulatory and contractual requirements understood and managed)
- NIST CSF 2.0 GV.RM-02 (Risk appetite and risk tolerance statements established)
- NIST CSF 2.0 GV.RR-01 (Leadership responsible and accountable for risk)
- NIST CSF 2.0 GV.RR-02 (Roles, responsibilities and authorities established)
- NIST CSF 2.0 GV.PO-01 (Policy for managing risk established and enforced)
- NIST CSF 2.0 GV.SC-06 (Due diligence before entering supplier relationships)
- NIST CSF 2.0 GV.SC-07 (Supplier risks assessed and monitored over the relationship)
- NIST CSF 2.0 ID.AM-07 (Inventories of data and metadata maintained)
- NIST CSF 2.0 PR.AT-01 (Personnel given awareness and training)
- NIST CSF 2.0 DE.CM-09 (Hardware, software, runtime environments and data monitored)
- NIST CSF 2.0 RS.AN-03 (Root cause of the incident established)
- NIST CSF 2.0 ID.IM-01 (Improvements identified from evaluations)

## ISACA IT Audit and Assurance Standards (ITAF 4th edition, 2020)

Status: **Verified** (number and title) per `docs/content/ITAF_4TH_EDITION.md`
(KaiSip's checked ITAF record; the repo keeps 4th-edition numbering until a job
practice adopts ITAF 5). Standard text is not quoted.
- ISACA IT Audit Standard 1002 (Organizational Independence)
- ISACA IT Audit Standard 1003 (Auditor Objectivity)
- ISACA IT Audit Standard 1005 (Due Professional Care)
- ISACA IT Audit Standard 1006 (Proficiency)
- ISACA IT Audit Standard 1008 (Criteria)
- ISACA IT Audit Standard 1201 (Risk Assessment in Planning)
- ISACA IT Audit Standard 1203 (Engagement Planning)
- ISACA IT Audit Standard 1204 (Performance and Supervision)
- ISACA IT Audit Standard 1205 (Evidence)
- ISACA IT Audit Standard 1206 (Using the Work of Other Experts)
- ISACA IT Audit Standard 1401 (Reporting)
- ISACA IT Audit Standard 1402 (Follow-up Activities)
- ISACA ITAF Guideline 2208 (Information Technology Audit Sampling)
  - Verified (title) per `docs/content/ITAF_4TH_EDITION.md`.

## COBIT 2019

Status: **Likely** (objective names as used in KaiSip's CISA library; the
COBIT text itself was not opened from this environment).
- COBIT 2019 EDM03 (Ensured Risk Optimization)
- COBIT 2019 APO12 (Managed Risk)
- COBIT 2019 APO14 (Managed Data)
- COBIT 2019 BAI06 (Managed IT Changes)

## OWASP Top 10 for LLM Applications 2025

Status: **Likely.** owasp.org's project page (opened 30 Oct 2026) confirms a
2025 version and links to genai.owasp.org, which is blocked here; entry titles
are not yet checked against the list itself.
- OWASP Top 10 for LLM Applications 2025 LLM01 (Prompt Injection)
- OWASP Top 10 for LLM Applications 2025 LLM02 (Sensitive Information Disclosure)
- OWASP Top 10 for LLM Applications 2025 LLM03 (Supply Chain)
- OWASP Top 10 for LLM Applications 2025 LLM04 (Data and Model Poisoning)
- OWASP Top 10 for LLM Applications 2025 LLM06 (Excessive Agency)

## Context only (never in framework_ref)

These hosts are blocked from the cloud environment, so the text cannot be
checked. Notes and explanations may name them; questions never key on them.
- ISO/IEC 42001:2023 (AI management system) — iso.org blocked.
- ISO/IEC 23894:2023 (AI risk management guidance) — iso.org blocked.
- Regulation (EU) 2024/1689, the EU AI Act — eur-lex.europa.eu blocked.
- IIA Global Internal Audit Standards and COSO material — theiia.org and coso.org blocked.
