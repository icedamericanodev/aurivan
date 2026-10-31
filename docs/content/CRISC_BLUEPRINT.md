# ISACA® CRISC® blueprint (Certified in Risk and Information Systems Control)

Checked 30 Oct 2026 against ISACA's own pages and PDFs (sources at the end).
This is the outline KaiSip's CRISC notes and questions follow. Codes 1A1,
1A2 … are ISACA's own; use them as the `subtopic` prefix (for example
`"1B4 Risk appetite and risk tolerance. Tolerance breach"`) and as the notes
`topic_id`.

Outline headings below are ISACA's (S2). Everything else is paraphrased.

## Exam facts

| Fact | Value | Source |
|---|---|---|
| Outline in force | "Effective 2025". The updated exam has been delivered since **3 Nov 2025** | S2, S3 |
| What changed in 2025 | The four domains stayed. Weights moved: Risk Assessment 20% → 22%, Technology and Security 22% → 20%. Coverage of AI and machine-learning risk was added across the outline | S3, S4 |
| Format | 150 multiple-choice questions, one best answer each; 4 hours (240 minutes) | S2 |
| Scoring | Scaled 200–800; **450** passes. Scored items plus unscored pre-test items. Domain results are informational; the score is on total items correct | S2 |
| Delivery | Computer-based, at PSI test centers or remotely proctored; continuous registration; six-month eligibility window | S1, S2 |
| Languages | English, Spanish and Japanese (summary table, section 1.2). The Chinese Simplified, Korean and Spanish links on the outline page are translations of the CRISC terminology list, not exam languages | S1 |
| Fees | US$575 member, US$760 non-member | S1, S2 |
| Certification | Pass the exam, then apply (US$50) within five years of passing, with at least three years of CRISC work experience across at least two of the four domains, gained in the 10 years before applying and verified by a supervisor. Then follow the ISACA Code of Professional Ethics and the CPE policy (120 hours per three years, at least 20 a year). Anyone may sit the exam before having the experience | S6 |
| Next update | None announced on isaca.org as of 30 Oct 2026 (the 2026 update is CISM, effective 3 Nov 2026) | S3, S5 |

KaiSip only has four-option multiple choice, like the real exam. The mock
exam must still say its score is not ISACA's scaled score.

## Domains and sub-areas

### Domain 1: Governance (26%)
ISACA's summary: the organization's business and IT environments, strategy,
goals and objectives, and the impact of IT risk on them, including enterprise
risk management (ERM) and the risk management framework.

| Code | ISACA heading |
|---|---|
| **1A** | **Organizational Governance** |
| 1A1 | Strategy, Goals, and Objectives |
| 1A2 | Organizational Structure, Roles, and Responsibilities |
| 1A3 | Organizational Culture and Ethics |
| 1A4 | Policies and Standards |
| 1A5 | Business Processes and Resilience (e.g., DRP, BCP) |
| 1A6 | Organizational Asset Management |
| **1B** | **Risk Governance** |
| 1B1 | Enterprise Risk Management (ERM) |
| 1B2 | Lines of Defense |
| 1B3 | Risk Profile |
| 1B4 | Risk Appetite and Risk Tolerance |
| 1B5 | Risk Frameworks, Legal, Regulatory, and Contractual Requirements |

### Domain 2: Risk Assessment (22%)
Threats and vulnerabilities to people, processes and technology, and the
likelihood and impact of threats, vulnerabilities and risk scenarios.

| Code | ISACA heading |
|---|---|
| **2A** | **Risk Identification** |
| 2A1 | Risk Events |
| 2A2 | Threat Modeling and Threat Landscape |
| 2A3 | Vulnerability Management |
| 2A4 | Risk Scenario Development and Evaluation |
| **2B** | **Risk Analysis** |
| 2B1 | Risk Assessment Concepts and Standards |
| 2B2 | Business Impact Analysis (BIA) |
| 2B3 | Risk Register |
| 2B4 | Risk Analysis Methodologies |
| 2B5 | Inherent and Residual Risk |

### Domain 3: Risk Response and Reporting (32%)
Developing and managing risk treatment plans with stakeholders, evaluating
and improving controls, and reporting risk and control information.

| Code | ISACA heading |
|---|---|
| **3A** | **Risk Response** |
| 3A1 | Risk Response Options |
| 3A2 | Risk and Control Ownership |
| 3A3 | Vendor/Supply Chain Risk Management |
| 3A4 | Issues, Findings, Exceptions and Exemptions Management |
| **3B** | **Control Design and Implementation** |
| 3B1 | Control Frameworks, Types, and Standards |
| 3B2 | Control Design, Selection, Implementation, and Analysis |
| 3B3 | Control Testing Methodologies |
| **3C** | **Risk Monitoring and Reporting** |
| 3C1 | Risk Action Plans |
| 3C2 | Data Collection, Aggregation, Analysis, and Validation |
| 3C3 | Risk and Control Metrics (e.g., KRIs, KCIs, KPIs) |
| 3C4 | Risk and Control Monitoring Techniques |
| 3C5 | Risk and Control Reporting Techniques (e.g., heatmap, scorecards, dashboards) |
| 3C6 | Monitoring and Reporting of Emerging Risks |

### Domain 4: Technology and Security (20%)
Aligning business practice with risk management and information security
frameworks and standards, and building a risk-aware culture with awareness
training.

| Code | ISACA heading |
|---|---|
| **4A** | **Technology Principles** |
| 4A1 | Technology Roadmaps and Enterprise Architecture (EA) |
| 4A2 | Operations Management (e.g., change management, assets, DevOps, problems, incidents) |
| 4A3 | System Development Life Cycle (SDLC) |
| 4A4 | Data Lifecycle Management |
| 4A5 | Portfolio and Project Management (e.g. Agile) |
| 4A6 | Technology Resilience and Disaster Response/Recovery |
| 4A7 | Emerging Technologies |
| **4B** | **Information Security Principles** |
| 4B1 | Security Concepts, Frameworks, and Standards |
| 4B2 | Security/Risk Awareness and Training |
| 4B3 | Data Privacy and Data Protection Principles |

The web page (S2) heads Part 4A "Technology and Security" and lists
"Technology Principles" as its first item; the candidate guide PDF (S1, the
numbered source) heads 4A "Technology Principles" and numbers seven items.
KaiSip follows the PDF numbering.

Outline lines for the notes linter (`scripts/lint_notes.py --outline`):

- 1A1 Strategy, Goals, and Objectives
- 1A2 Organizational Structure, Roles, and Responsibilities
- 1A3 Organizational Culture and Ethics
- 1A4 Policies and Standards
- 1A5 Business Processes and Resilience
- 1A6 Organizational Asset Management
- 1B1 Enterprise Risk Management (ERM)
- 1B2 Lines of Defense
- 1B3 Risk Profile
- 1B4 Risk Appetite and Risk Tolerance
- 1B5 Risk Frameworks, Legal, Regulatory, and Contractual Requirements
- 2A1 Risk Events
- 2A2 Threat Modeling and Threat Landscape
- 2A3 Vulnerability Management
- 2A4 Risk Scenario Development and Evaluation
- 2B1 Risk Assessment Concepts and Standards
- 2B2 Business Impact Analysis (BIA)
- 2B3 Risk Register
- 2B4 Risk Analysis Methodologies
- 2B5 Inherent and Residual Risk
- 3A1 Risk Response Options
- 3A2 Risk and Control Ownership
- 3A3 Vendor/Supply Chain Risk Management
- 3A4 Issues, Findings, Exceptions and Exemptions Management
- 3B1 Control Frameworks, Types, and Standards
- 3B2 Control Design, Selection, Implementation, and Analysis
- 3B3 Control Testing Methodologies
- 3C1 Risk Action Plans
- 3C2 Data Collection, Aggregation, Analysis, and Validation
- 3C3 Risk and Control Metrics
- 3C4 Risk and Control Monitoring Techniques
- 3C5 Risk and Control Reporting Techniques
- 3C6 Monitoring and Reporting of Emerging Risks
- 4A1 Technology Roadmaps and Enterprise Architecture (EA)
- 4A2 Operations Management
- 4A3 System Development Life Cycle (SDLC)
- 4A4 Data Lifecycle Management
- 4A5 Portfolio and Project Management
- 4A6 Technology Resilience and Disaster Response/Recovery
- 4A7 Emerging Technologies
- 4B1 Security Concepts, Frameworks, and Standards
- 4B2 Security/Risk Awareness and Training
- 4B3 Data Privacy and Data Protection Principles

## The 24 supporting tasks (paraphrased)

ISACA lists 24 tasks the exam tests across the domains (S1, S2). Items should
put the candidate in one of these jobs. Short form:

1. Gather and evaluate information about the business and IS environment.
2. Identify impacts of IS risk on business objectives and operations.
3. Identify threats and vulnerabilities to people, processes and technology.
4. Build IS risk scenarios from threats, vulnerabilities and risk.
5. Assign and validate risk and control ownership (accountability).
6. Keep the IS risk register and feed it into the enterprise risk profile.
7. Help stakeholders choose risk appetite and tolerance thresholds.
8. Promote a risk-aware culture through awareness and training.
9. Analyze risk scenarios and events to produce a risk rating.
10. Find the current state of controls and judge their effectiveness.
11. Decide whether risk exceeds appetite or tolerance and recommend treatment.
12. Review risk and control analysis for gaps between current and desired state.
13. Work with risk owners on risk treatment plans.
14. Work with control owners on selecting, designing, implementing and maintaining controls.
15. Validate that responses were carried out as the action plan says.
16. Define, implement and refine key risk indicators (KRIs).
17. Work with control owners on KPIs and key control indicators (KCIs).
18. Monitor and analyze KRIs, KPIs and KCIs.
19. Review control assessment results for adequacy, effectiveness and maturity.
20. Aggregate, analyze and validate risk and control data.
21. Report risk and control information to stakeholders for risk-based decisions.
22. Evaluate emerging technologies and environment changes for threats, vulnerabilities and opportunities.
23. Evaluate how business practice aligns with risk frameworks, standards and regulations.
24. Run tabletop exercises to find gaps in risk scenarios, capabilities and responses.

## AI across the domains

AI is not a separate domain or weight. ISACA says the 2025 update covers AI
and machine-learning risk (S4), and the CRISC page names "AI risk assessment"
and "AI data governance and ethics" (S5). KaiSip puts about 10% AI items in
every domain:

- **D1:** AI in strategy and the risk profile; who owns AI risk; AI use policy; AI ethics and culture; AI systems in the asset inventory; AI regulation (as context, never keyed on a clause).
- **D2:** AI-specific threats (prompt injection, data poisoning, model theft); AI risk scenarios; bias and drift as risk events; AI systems in the BIA and risk register.
- **D3:** Responses to AI risk; third-party AI vendors and model supply chain; controls for AI (human review, input and output validation); KRIs for model drift and error; reporting emerging AI risk.
- **D4:** AI in the SDLC and change management; data lifecycle for training data; AI in enterprise architecture; privacy of personal data in AI; awareness of shadow AI.

## The CRISC lens (how the exam thinks)

The full standard is `.claude/agents/crisc-standards-auditor.md`. In short:

- The candidate is a **risk practitioner** who advises. **The business owns
  risk.** Risk owners decide and accept; control owners run controls; the
  practitioner identifies, analyzes, recommends, facilitates, monitors and reports.
- **Risk appetite and tolerance drive the response.** Compare risk to the
  thresholds before choosing a treatment.
- **Business objectives first.** Risk is the effect on objectives, not a
  technical defect in itself.
- **Analyze before acting.** A new threat or finding is assessed and its
  owner told before controls are chosen.
- Not the CISA auditor lens (independence, audit evidence, the audit report)
  and not the CISM security-manager lens (running the security program),
  though both appear as other roles in stems.

## Question targets (bank of 1,000)

| Domain | Weight | Target | Per sub-area (even split) |
|---|---|---|---|
| D1 Governance | 26% | 260 | 11 × ~24 |
| D2 Risk Assessment | 22% | 220 | 9 × ~24 |
| D3 Risk Response and Reporting | 32% | 320 | 13 × ~25 |
| D4 Technology and Security | 20% | 200 | 10 × 20 |
| Total | | 1,000 | |

The weights work out to 39/33/48/30 of 150 exam items; that reading is
KaiSip's, not ISACA's. Scale every domain by its weight if the bank grows.
Keep the bank size out of learner copy.

## Trademarks

CRISC® is a registered trademark of ISACA. KaiSip is not affiliated with or
endorsed by ISACA. The ® goes in notices; learner copy uses "CRISC" plainly
and never implies endorsement. The mobile notice already comes from
`mobile/src/content/certifications.ts` (`ISACA_TM('CRISC')`).

## Open items

- isaca.org is reachable from the cloud environment. COSO (coso.org), ISO
  (iso.org), the IIA (theiia.org) and EU law (eur-lex.europa.eu) are not, so
  COSO ERM 2017, ISO 31000:2018, ISO/IEC 27005:2022, the IIA Three Lines
  Model (2020) and the EU AI Act / GDPR cannot be opened and checked yet. Cite
  NIST or ISACA instead until one of them is allowed.

## Sources

- S1: ISACA Certification Exam Candidate Guide, Version 1.26 (2026), Appendix B "CRISC Examination Content Outline (Effective 2025)", and the CRISC page https://www.isaca.org/credentialing/crisc (fees, delivery, certification steps). PDF: https://www.isaca.org/-/media/files/isacadp/project/isaca/certification/exam-candidate-guides/2026/exam-candidate-guide.pdf
- S2: CRISC Exam Content Outline page, https://www.isaca.org/credentialing/crisc/crisc-exam-content-outline (domains, weights, sub-areas, supporting tasks); exam length, scoring and languages from S1 sections 1.2 and 5.
- S3: ISACA press release "ISACA Updates CDPSE and CRISC Exams to Reflect Latest Risk and Privacy Priorities" (2025), https://www.isaca.org/about-us/newsroom/press-releases/2025/isaca-updates-cdpse-and-crisc-exams-to-reflect-latest-risk-and-privacy-priorities
- S4: ISACA Now blog "How the Updated CRISC Can Be Beneficial to Security Professionals" (2025), https://www.isaca.org/resources/news-and-trends/isaca-now-blog/2025/how-the-updated-crisc-can-be-beneficial-to-security-professionals
- S6: Get CRISC Certified, https://www.isaca.org/credentialing/crisc/get-crisc-certified (experience, application window, CPE)
- S5: CRISC page text on AI risk assessment, AI data governance and ethics, https://www.isaca.org/credentialing/crisc; CISM 2026 update press release, https://www.isaca.org/about-us/newsroom/press-releases/2026/isaca-updates-cism-exam-content-outline-factoring-in-todays-technologies-security-responsibilities
