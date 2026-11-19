# CIA citation library

The canonical `framework_ref` strings for the CIA question banks
(`data/cia/cia{1,2,3}/originals/d{N}.json`). Format rules:
`docs/content/CIA_BANK_PLAN.md` and the conventions used by
`data/cia/tools/cia_common.py`. Evidence, file hashes and dates:
`docs/content/CIA_RESEARCH_LOG.md`.

How to read this file:

1. A heading that starts with "Verified" or "Likely" sets the status of the
   bullets under it. A bullet is the exact string a `framework_ref` part must
   equal. Split a `framework_ref` on "; " and match each part.
2. The FIRST part of every `framework_ref` must be a Verified bullet.
3. Verified means the file was downloaded from theiia.org and opened on the
   date in the heading. Likely means the title is on The IIA's exam reference
   list (V5.5.2026.10.15) but the text was not opened: a Likely bullet may
   support an item, never carry it alone.
4. Titles and numbers only. This file never quotes requirement text, and
   items must not either.
5. Apostrophes are straight (') in every bullet, also where The IIA's file
   prints a curly one (Standard 1.2).
6. The three Topical Requirements that are not testable yet have dates in
   `data/cia/shared/currency.json`. An item citing a bullet that starts with
   one of those names needs `testable_from`.

Not in this library on purpose: The IIA's Three Lines Model position paper of
2020 (opened; replaced by the 2026 Statement of Position below), the two-way
mapping and the glossary comparison (translation aids for old terms, never an
authority for a key), COSO, ISO and ISACA publications (not on the exam
reference list by name), and every prep provider.

## Verified: opened 2026-11-19 Global Internal Audit Standards (2024) (https://www.theiia.org/globalassets/site/standards/globalinternalauditstandards_2024january9.pdf)
- Global Internal Audit Standards (2024), About the International Professional Practices Framework
- Global Internal Audit Standards (2024), Fundamentals of the Global Internal Audit Standards
- Global Internal Audit Standards (2024), Glossary
- Global Internal Audit Standards (2024), Domain I Purpose of Internal Auditing
- Global Internal Audit Standards (2024), Domain II Ethics and Professionalism
- Global Internal Audit Standards (2024), Principle 1 Demonstrate Integrity
- Global Internal Audit Standards (2024), Standard 1.1 Honesty and Professional Courage
- Global Internal Audit Standards (2024), Standard 1.2 Organization's Ethical Expectations
- Global Internal Audit Standards (2024), Standard 1.3 Legal and Ethical Behavior
- Global Internal Audit Standards (2024), Principle 2 Maintain Objectivity
- Global Internal Audit Standards (2024), Standard 2.1 Individual Objectivity
- Global Internal Audit Standards (2024), Standard 2.2 Safeguarding Objectivity
- Global Internal Audit Standards (2024), Standard 2.3 Disclosing Impairments to Objectivity
- Global Internal Audit Standards (2024), Principle 3 Demonstrate Competency
- Global Internal Audit Standards (2024), Standard 3.1 Competency
- Global Internal Audit Standards (2024), Standard 3.2 Continuing Professional Development
- Global Internal Audit Standards (2024), Principle 4 Exercise Due Professional Care
- Global Internal Audit Standards (2024), Standard 4.1 Conformance with the Global Internal Audit Standards
- Global Internal Audit Standards (2024), Standard 4.2 Due Professional Care
- Global Internal Audit Standards (2024), Standard 4.3 Professional Skepticism
- Global Internal Audit Standards (2024), Principle 5 Maintain Confidentiality
- Global Internal Audit Standards (2024), Standard 5.1 Use of Information
- Global Internal Audit Standards (2024), Standard 5.2 Protection of Information
- Global Internal Audit Standards (2024), Domain III Governing the Internal Audit Function
- Global Internal Audit Standards (2024), Principle 6 Authorized by the Board
- Global Internal Audit Standards (2024), Standard 6.1 Internal Audit Mandate
- Global Internal Audit Standards (2024), Standard 6.2 Internal Audit Charter
- Global Internal Audit Standards (2024), Standard 6.3 Board and Senior Management Support
- Global Internal Audit Standards (2024), Principle 7 Positioned Independently
- Global Internal Audit Standards (2024), Standard 7.1 Organizational Independence
- Global Internal Audit Standards (2024), Standard 7.2 Chief Audit Executive Qualifications
- Global Internal Audit Standards (2024), Principle 8 Overseen by the Board
- Global Internal Audit Standards (2024), Standard 8.1 Board Interaction
- Global Internal Audit Standards (2024), Standard 8.2 Resources
- Global Internal Audit Standards (2024), Standard 8.3 Quality
- Global Internal Audit Standards (2024), Standard 8.4 External Quality Assessment
- Global Internal Audit Standards (2024), Domain IV Managing the Internal Audit Function
- Global Internal Audit Standards (2024), Principle 9 Plan Strategically
- Global Internal Audit Standards (2024), Standard 9.1 Understanding Governance, Risk Management, and Control Processes
- Global Internal Audit Standards (2024), Standard 9.2 Internal Audit Strategy
- Global Internal Audit Standards (2024), Standard 9.3 Methodologies
- Global Internal Audit Standards (2024), Standard 9.4 Internal Audit Plan
- Global Internal Audit Standards (2024), Standard 9.5 Coordination and Reliance
- Global Internal Audit Standards (2024), Principle 10 Manage Resources
- Global Internal Audit Standards (2024), Standard 10.1 Financial Resource Management
- Global Internal Audit Standards (2024), Standard 10.2 Human Resources Management
- Global Internal Audit Standards (2024), Standard 10.3 Technological Resources
- Global Internal Audit Standards (2024), Principle 11 Communicate Effectively
- Global Internal Audit Standards (2024), Standard 11.1 Building Relationships and Communicating with Stakeholders
- Global Internal Audit Standards (2024), Standard 11.2 Effective Communication
- Global Internal Audit Standards (2024), Standard 11.3 Communicating Results
- Global Internal Audit Standards (2024), Standard 11.4 Errors and Omissions
- Global Internal Audit Standards (2024), Standard 11.5 Communicating the Acceptance of Risks
- Global Internal Audit Standards (2024), Principle 12 Enhance Quality
- Global Internal Audit Standards (2024), Standard 12.1 Internal Quality Assessment
- Global Internal Audit Standards (2024), Standard 12.2 Performance Measurement
- Global Internal Audit Standards (2024), Standard 12.3 Oversee and Improve Engagement Performance
- Global Internal Audit Standards (2024), Domain V Performing Internal Audit Services
- Global Internal Audit Standards (2024), Principle 13 Plan Engagements Effectively
- Global Internal Audit Standards (2024), Standard 13.1 Engagement Communication
- Global Internal Audit Standards (2024), Standard 13.2 Engagement Risk Assessment
- Global Internal Audit Standards (2024), Standard 13.3 Engagement Objectives and Scope
- Global Internal Audit Standards (2024), Standard 13.4 Evaluation Criteria
- Global Internal Audit Standards (2024), Standard 13.5 Engagement Resources
- Global Internal Audit Standards (2024), Standard 13.6 Work Program
- Global Internal Audit Standards (2024), Principle 14 Conduct Engagement Work
- Global Internal Audit Standards (2024), Standard 14.1 Gathering Information for Analyses and Evaluation
- Global Internal Audit Standards (2024), Standard 14.2 Analyses and Potential Engagement Findings
- Global Internal Audit Standards (2024), Standard 14.3 Evaluation of Findings
- Global Internal Audit Standards (2024), Standard 14.4 Recommendations and Action Plans
- Global Internal Audit Standards (2024), Standard 14.5 Engagement Conclusions
- Global Internal Audit Standards (2024), Standard 14.6 Engagement Documentation
- Global Internal Audit Standards (2024), Principle 15 Communicate Engagement Results and Monitor Action Plans
- Global Internal Audit Standards (2024), Standard 15.1 Final Engagement Communication
- Global Internal Audit Standards (2024), Standard 15.2 Confirming the Implementation of Recommendations or Action Plans
- Global Internal Audit Standards (2024), Applying the Global Internal Audit Standards in the Public Sector

## Verified: opened 2026-11-19 Cybersecurity Topical Requirement, issued 5 February 2025, effective 5 February 2026 (https://www.theiia.org/globalassets/site/standards/topical-requirements/cybersecurity/cybersecurity_topical_requirement.pdf)
- Cybersecurity Topical Requirement
- Cybersecurity Topical Requirement, Governance
- Cybersecurity Topical Requirement, Risk Management
- Cybersecurity Topical Requirement, Controls

## Verified: opened 2026-11-19 Cybersecurity Topical Requirement User Guide (https://www.theiia.org/globalassets/site/standards/topical-requirements/cybersecurity/cybersecurity_tr_user_guide.pdf)
- Cybersecurity Topical Requirement User Guide

## Verified: opened 2026-11-19 Third-Party Topical Requirement, issued 15 September 2025, effective 15 September 2026 (https://www.theiia.org/globalassets/site/standards/topical-requirements/third-party/third_party_topical_requirement_english.pdf)
- Third-Party Topical Requirement
- Third-Party Topical Requirement, Governance
- Third-Party Topical Requirement, Risk Management
- Third-Party Topical Requirement, Controls

## Verified: opened 2026-11-19 Third-Party Topical Requirement User Guide (https://www.theiia.org/globalassets/site/standards/topical-requirements/third-party/third_party_tr_user_guide_english.pdf)
- Third-Party Topical Requirement User Guide

## Verified: opened 2026-11-19 Organizational Behavior Topical Requirement, issued 15 December 2025, effective 15 December 2026 (https://www.theiia.org/globalassets/site/standards/tr/ob/org_behav_topical_requirement_en.pdf)
- Organizational Behavior Topical Requirement
- Organizational Behavior Topical Requirement, Governance
- Organizational Behavior Topical Requirement, Risk Management
- Organizational Behavior Topical Requirement, Controls

## Verified: opened 2026-11-19 Organizational Behavior Topical Requirement User Guide (https://www.theiia.org/globalassets/site/standards/tr/ob/org_behav_topical_requirement_ug_en.pdf)
- Organizational Behavior Topical Requirement User Guide

## Verified: opened 2026-11-19 Organizational Resilience Topical Requirement, issued 30 April 2026, effective 30 April 2027 (https://www.theiia.org/globalassets/site/standards/tr/or/org_resilience_tr_en.pdf)
- Organizational Resilience Topical Requirement
- Organizational Resilience Topical Requirement, Governance
- Organizational Resilience Topical Requirement, Risk Management
- Organizational Resilience Topical Requirement, Control Processes

## Verified: opened 2026-11-19 Organizational Resilience Topical Requirement User Guide (https://www.theiia.org/globalassets/site/standards/tr/or/org_resilience_tr_ug_en.pdf)
- Organizational Resilience Topical Requirement User Guide

## Verified: opened 2026-11-19 Topical Requirements Application Guidance, issued 29 August 2025 (https://www.theiia.org/globalassets/site/standards/topical-requirements/topical_requirements_application_guidance_english.pdf)
- Topical Requirements Application Guidance

## Verified: opened 2026-11-19 Three Lines Model Statement of Position, published 8 July 2026 (https://www.theiia.org/globalassets/site/resources/statements-of-position/tlm_assurance_advice_support_effective_gov_en.pdf)
- IIA Statement of Position: Three Lines Model: Assurance and Advice in Support of Effective Governance

## Verified: opened 2026-11-19 Statement of Position on enterprise risk management, published 8 July 2026 (https://www.theiia.org/globalassets/site/resources/statements-of-position/role_of_ia_function_enterprise_risk_mgmt_en.pdf)
- IIA Statement of Position: The Role of the Internal Audit Function in Enterprise Risk Management

## Verified: opened 2026-11-19 Internal Auditing Competency Framework, Global Practice Guide issued 10 July 2025, public access (https://www.theiia.org/globalassets/site/content/guidance/recommended/supplemental/practice-guides/global-practice-guide-internal-auditing-competency-framework/gpg_internal_auditing_competency_framework_english.pdf)
- IIA Global PG: Internal Auditing Competency Framework

## Verified: opened 2026-11-19 position paper on fraud, April 2019 (https://www.theiia.org/globalassets/documents/resources/fraud-and-internal-audit-assurance-over-fraud-controls-fundamental-to-success-april-2019/fraud-and-internal-audit.pdf)
- IIA Position Paper: Fraud and Internal Audit: Assurance Over Fraud Controls Fundamental to Success

## Verified: opened 2026-11-19 position paper on governing body and executive committees, November 2019 (https://www.theiia.org/globalassets/documents/resources/internal-auditings-role-in-governing-bodyexecutive-committees-november-2019/pp-ias-role-in-governing-body-executive-committees.pdf)
- IIA Position Paper: Internal Auditing's Role in Governing Body/Executive Committees

## Verified: opened 2026-11-19 position paper on conformance, May 2018 (https://www.theiia.org/globalassets/documents/resources/why-conformance-matters-may-2018/why-conformance-matters.pdf)
- IIA Position Paper: Why Conformance Matters

## Verified: opened 2026-11-19 CIA Part 1 syllabus (2025) (https://www.theiia.org/globalassets/site/certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf)
- CIA Part 1 syllabus (2025), Expanded Test Specifications V2.09.2024 FINAL

## Verified: opened 2026-11-19 CIA Part 2 syllabus (2025) (https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf)
- CIA Part 2 syllabus (2025), Expanded Test Specifications V2.09.2024 FINAL

## Verified: opened 2026-11-19 CIA Part 3 syllabus (2025) (https://www.theiia.org/globalassets/site/certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf)
- CIA Part 3 syllabus (2025), Expanded Test Specifications V2.09.2024 FINAL

## Verified: opened 2026-11-19 CIA Challenge Exam syllabus (effective June 2026) (https://www.theiia.org/globalassets/site/certifications/challenge-exam/oct-2025-challenge-exam-syllabus-v2.pdf)
- CIA Challenge Exam syllabus (effective June 2026), V2.10.2025 FINAL

## Verified: opened 2026-11-19 Certification Candidate Handbook, March 2026 (https://www.theiia.org/globalassets/site/certifications/certification-candidate-handbook.pdf)
- IIA Certification Candidate Handbook (March 2026)

## Likely: not opened (for purchase: the textbook, primary reference 2, sold in the IIA Bookstore)
- Internal Auditing: Assurance & Advisory Services, 6th edition

## Likely: not opened (members only: primary references 3 to 6; eBooks of some are also sold in the IIA Bookstore)
- IIA Global PG: Developing a Risk-Based Internal Audit Plan, 2nd edition
- IIA Global PG: Engagement Planning: Assessing Fraud Risks
- IIA Global PG: Integrated Approaches to Internal Auditing
- IIA GTAG: IT Essentials for Internal Auditors

## Likely: not opened (members only: secondary Global Practice Guides, references 11 to 24 and 26)
- IIA Global PG: Assessing the Risk Management Process, 2nd edition
- IIA Global PG: Auditing Anti-Corruption Activities, 2nd edition
- IIA Global PG: Auditing Culture, 2nd edition
- IIA Global PG: Auditing Privacy and Data Protection Risks, 3rd edition
- IIA Global PG: Auditing Third-Party Risk Management
- IIA Global PG: Communicating Final Engagement Results
- IIA Global PG: Communicating Results of Internal Audit Services
- IIA Global PG: Coordination and Reliance: Working with Other Assurance Providers
- IIA Global PG: Data Analytics Skills for Internal Auditors
- IIA Global PG: Developing an Internal Audit Strategy
- IIA Global PG: Engagement Planning: Establishing Objectives and Scope, 2nd edition
- IIA Global PG: Evaluating the Effectiveness of Ethics Programs
- IIA Global PG: Interaction with the Board, 2nd edition
- IIA Global PG: Internal Auditing and Fraud, 3rd edition
- IIA Global PG: Understanding Data Analytics for Internal Auditors

## Likely: not opened (members only: secondary GTAGs, references 27 to 38)
- IIA GTAG: Assessing Cybersecurity Risk: The Three Lines Model
- IIA GTAG: Auditing Business Applications, 2nd edition
- IIA GTAG: Auditing Computing Infrastructure and IT Operations
- IIA GTAG: Auditing Cyber Incident Response & Recovery, 2nd edition
- IIA GTAG: Auditing Cybersecurity Operations: Prevention and Detection, 2nd edition
- IIA GTAG: Auditing Identity and Access Management, 2nd edition
- IIA GTAG: Auditing Insider Threat Programs
- IIA GTAG: Auditing IT Governance and IT Management, 3rd edition
- IIA GTAG: Auditing Mobile Computing, 2nd edition
- IIA GTAG: Auditing Network and Communications Management, 2nd edition
- IIA GTAG: IT Change Management, 4th edition
- IIA GTAG: Understanding and Auditing Big Data, 2nd edition

## Likely: not opened (members only: model charter tools, references 39 and 40)
- The IIA's Guide to Customizing the Model Internal Audit Charter (General Use version)
- The IIA's Model Internal Audit Charter Tool (General Use version)

## Likely: not opened (access not checked: no page found on theiia.org on 2026-11-19; position papers, references 42, 44 and 45)
- IIA Position Paper: Internal Auditing's Role in Corporate Governance
- IIA Position Paper: Relationships of Trust: Building Better Connections Between the Audit Committee and Internal Audit
- IIA Position Paper: Staffing Considerations for the Internal Audit Activity
