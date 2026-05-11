# Framework Citation Library

**Purpose:** single source of truth for `framework_ref` citations across the
original CISA question bank. Authored 2026-05-10 from the existing 250-question
bank (D1: 180, D2: 70).

**How it's used:**
- `scripts/lint_originals.py` parses bullet entries in this file as canonical
  citation strings.
- New citations introduced in a batch must either match a canonical entry here
  (exactly) or be added to this file in the same PR.
- This prevents the recurring drift pattern (e.g., "ISO/IEC 31000:2018 Risk
  Management" vs "ISO 31000:2018 (Risk Management)" — three variants of the
  same standard appeared in the bank before this library was created).

**Maintenance:** when a new framework citation is needed, add it to the
appropriate section below in the SAME PR that uses it. Linter blocks unknown
citations.

**Format:** each canonical citation is a bullet line beginning with `- `.
Sub-bullets and free-text content are ignored by the linter.

---

## ISACA IT Audit and Assurance Standards (mandatory ITAF)

- ISACA IT Audit Standard 1001 (Audit Charter)
- ISACA IT Audit Standard 1002 (Organizational Independence)
- ISACA IT Audit Standard 1003 (Auditor's Professional Independence)
- ISACA IT Audit Standard 1004 (Reasonable Expectation)
- ISACA IT Audit Standard 1005 (Due Professional Care)
- ISACA IT Audit Standard 1006 (Proficiency)
- ISACA IT Audit Standard 1007 (Assertions)
- ISACA IT Audit Standard 1008 (Criteria)
- ISACA IT Audit Standard 1201 (Engagement Planning)
- ISACA IT Audit Standard 1202 (Risk Assessment in Planning)
- ISACA IT Audit Standard 1203 (Performance and Supervision)
- ISACA IT Audit Standard 1204 (Materiality)
- ISACA IT Audit Standard 1205 (Evidence)
- ISACA IT Audit Standard 1206 (Using the Work of Other Experts)
- ISACA IT Audit Standard 1207 (Irregularities and Illegal Acts)
- ISACA IT Audit Standard 1208 (Audit Documentation)
- ISACA IT Audit Standard 1401 (Reporting)
- ISACA IT Audit Standard 1402 (Follow-up Activities)
- ISACA IT Audit Standards on Internal Controls
- ISACA IT Audit Standards on Separation of Duties Within IT
- ISACA IT Audit Standards on IT Governance Audits
- ISACA IT Audit Standards on Risk Management
- ISACA IT Audit Standards on Outsourcing
- ISACA IT Audit Standards on Information Security
- ISACA IT Audit Standards on Cloud Computing
- Standard 1203 (Performance and Supervision)
- Standard 1401 (Reporting)
- ITAF Standard 1202 (Risk Assessment in Planning)

## ITAF — Performance Standards (colloquial topical references)

These are widely-used colloquial references to ITAF Performance Standards
grouped by topic. When a specific mandatory standard (1201–1208) covers the
same topic, prefer the specific standard; ITAF Performance Standards on X is
acceptable when the reference is to the broader topical body of guidance.

- ITAF Performance Standards
- ITAF Performance Standards on Audit Planning
- ITAF Performance Standards on Engagement Planning
- ITAF Performance Standards on Risk Assessment
- ITAF Performance Standards on Engagement Conduct
- ITAF Performance Standards on Performance and Supervision
- ITAF Performance Standards on Materiality
- ITAF Performance Standards on Evidence
- ITAF Performance Standards on Documentation
- ITAF Performance Standards on Communication of Results
- ITAF Performance Standards on Reporting
- ITAF Performance Standards on Follow-up Activities
- ITAF Performance Standards on Fraud Risk
- ITAF Performance Standards on Application Audits
- ITAF Performance Standards on Control Evaluation
- ITAF Performance Standards on Audit Techniques
- ITAF Performance Standards on Continuous Auditing
- ITAF Performance Standards on Sampling
- ITAF Performance Standards on Independence
- ITAF Performance Standards on IT Governance
- ITAF Performance Standards on Governance, Risk, and Compliance
- ITAF Performance Standards on Audit of IT Governance
- ITAF Performance Standards on Performance Monitoring
- ITAF Performance Standards on IT Vendor Management
- ITAF Performance Standards on IT HR Controls
- ITAF Performance Standards on Change Management
- ITAF Performance Standards on Quality Assurance
- ITAF Performance Standards on IT Strategy
- ITAF Performance Standards on SoD
- ITAF Performance Standards on Outsourcing
- ITAF Performance Standards on Cloud
- ITAF Performance Standards on Data Privacy
- ITAF Performance Standards on Project Management
- ITAF Performance Standards on Operations Management
- ITAF Performance Standards on Capacity Management
- ITAF Performance Standards on Network Management
- ITAF Performance Standards on Quality Management
- ITAF Performance Standards on Operational Excellence
- ITAF Performance Standards on Information Security
- ITAF Performance Standards on Information Security Management
- ITAF Performance Standards on IT Investment
- ITAF Performance Standards on Third-Party Service Delivery
- ITAF Performance Standards on Performance Optimization
- ITAF Performance Standards on Privacy Audits
- ITAF Performance Standards on Multi-Jurisdiction
- ITAF Performance Standards on Transborder Data
- ITAF Performance Standards on Cloud Audits
- ITAF Performance Standards on Capacity Planning
- ITAF Performance Standards on Sourcing
- ITAF Performance Standards on Data Governance
- ITAF Performance Standards on InfoSec Operations
- ITAF Performance Standards on InfoSec Operations and Reporting
- ITAF Performance Standards on Network Audit
- ITAF Performance Standards on EGIT
- ITAF Performance Standards on EGIT Good Practices
- ITAF Performance Standards on Senior Management Roles
- ITAF Performance Standards on IT Org Roles

## ITAF — General Standards

- ITAF General Standards on Independence
- ITAF General Standards on Quality
- ITAF General Standards on Professional Ethics
- ITAF General Standards on Proficiency
- ITAF General Standards on Audit Charter
- ITAF General Standards on IT Governance
- ITAF General Standards on Governance
- ITAF General Standards on Risk Management

## ITAF — Tools and Techniques

- ITAF Tools and Techniques on Sampling
- ITAF Tools and Techniques on Continuous Auditing
- ITAF Tools and Techniques on CAATs
- ITAF Tools and Techniques on Audit Techniques

## ITAF — Reporting Standards

- ITAF Reporting Standards
- ITAF Reporting Standards on Modified Opinions

## ITAF — Topical Guidance (non-standards)

- ITAF guidance on AI in IS Audit
- ITAF guidance on Continuous Auditing
- ITAF guidance on Cloud Computing

## ISACA Other Frameworks and Codes

- ISACA Code of Professional Ethics
- ISACA Code of Professional Ethics (Independence)
- ISACA Risk IT Framework
- ISACA EGIT Framework
- ISACA "Auditing Artificial Intelligence" (IT Audit and Assurance Program)
- ISACA QAIP guidance
- ISACA QAIP guidance on External Assessments
- ISACA QAIP guidance on Internal Assessments
- ISACA Data Governance guidance
- ISACA Information Security Governance guidance
- ISACA Information Security Policy guidance
- ISACA Information Security Management guidance
- ISACA IT Performance Monitoring guidance
- ISACA IT Workforce Management guidance
- ISACA IT Vendor Management guidance
- ISACA IT Sourcing guidance
- ISACA IT Outsourcing Strategy guidance
- ISACA Outsourcing Governance guidance
- ISACA IT Financial Management guidance
- ISACA IT Portfolio Management guidance
- ISACA IT Management Practices guidance
- ISACA IT Organization guidance
- ISACA Network Management guidance
- ISACA Capacity Management guidance
- ISACA Cloud Risk Management guidance
- ISACA Cloud Computing guidance
- ISACA Risk Analysis guidance
- ISACA Privacy Program guidance
- ISACA Quality Management guidance
- ISACA Operational Excellence guidance
- ISACA Audit Universe guidance
- ISACA Audit Team Training guidance
- ISACA SoD guidance
- ISACA Outsourcing Risk Assessment guidance
- ISACA Outsourcing Practices guidance
- ISACA Privacy guidance
- ISACA Cloud guidance
- ISACA Portfolio Management guidance
- ISACA Vendor Management guidance
- ISACA Fraud Risk Management guidance
- ISACA Enterprise Change Management guidance
- ISACA Fraud Investigation guidance
- ISACA HR Controls guidance
- ISACA AI Audit guidance
- ISACA Change Management guidance
- ISACA Performance Management guidance
- ISACA Sourcing Strategy guidance
- ISACA Project Management guidance
- ISACA IT Strategy guidance
- ISACA IT Strategic Planning guidance
- ISACA Strategic Planning guidance
- ISACA Business Intelligence guidance
- ISACA IT Investment guidance
- ISACA Network Governance guidance
- ISACA Compensating Controls guidance
- ISACA Cloud Audit guidance
- ISACA EGIT (Strategic Alignment)
- ISACA EGIT Definition

## COBIT 2019

- COBIT 2019
- COBIT 2019 (Governance Framework)
- COBIT 2019 (Governance and Management Roles)
- COBIT 2019 (Governance vs Management)
- COBIT 2019 (Governance System Principles)
- COBIT 2019 (Performance Management)
- COBIT 2019 (Risk Management)
- COBIT 2019 (Goals Cascade and Performance Management)
- COBIT 2019 Performance Management
- COBIT 2019 (Governance and Management Framework)
- COBIT 2019 EDM Domain (Evaluate, Direct, Monitor)
- COBIT 2019 EDM01 (Ensured Governance Framework Setting and Maintenance)
- COBIT 2019 EDM02 (Ensured Benefits Delivery)
- COBIT 2019 EDM03 (Ensured Risk Optimization)
- COBIT 2019 EDM04 (Ensured Resource Optimization)
- COBIT 2019 EDM05 (Ensured Stakeholder Engagement)
- COBIT 2019 APO Domain (Align, Plan, Organize)
- COBIT 2019 APO01 (Managed I&T Management Framework)
- COBIT 2019 APO02 (Managed Strategy)
- COBIT 2019 APO03 (Managed Enterprise Architecture)
- COBIT 2019 APO04 (Managed Innovation)
- COBIT 2019 APO05 (Managed Portfolio)
- COBIT 2019 APO06 (Managed Budget and Costs)
- COBIT 2019 APO07 (Managed Human Resources)
- COBIT 2019 APO08 (Managed Relationships)
- COBIT 2019 APO09 (Managed Service Agreements)
- COBIT 2019 APO10 (Managed Vendors)
- COBIT 2019 APO11 (Managed Quality)
- COBIT 2019 APO12 (Managed Risk)
- COBIT 2019 APO13 (Managed Security)
- COBIT 2019 APO14 (Managed Data)
- COBIT 2019 BAI Domain (Build, Acquire, Implement)
- COBIT 2019 BAI03 (Managed Solutions Identification and Build)
- COBIT 2019 BAI04 (Managed Availability and Capacity)
- COBIT 2019 BAI05 (Managed Organizational Change)
- COBIT 2019 BAI06 (Managed IT Changes)
- COBIT 2019 BAI10 (Managed Configuration)
- COBIT 2019 BAI11 (Managed Projects)
- COBIT 2019 DSS Domain (Deliver, Service, Support)
- COBIT 2019 DSS05 (Managed Security Services)
- COBIT 2019 DSS06 (Managed Business Process Controls)
- COBIT 2019 MEA Domain (Monitor, Evaluate, Assess)
- COBIT 2019 MEA01 (Managed Performance and Conformance Monitoring)
- COBIT 2019 MEA02 (Managed System of Internal Control)
- COBIT 2019 MEA03 (Managed Compliance with External Requirements)

## ISO / IEC

- ISO/IEC 27001
- ISO/IEC 27001:2022
- ISO/IEC 27001:2022 (Information Security Management Systems)
- ISO/IEC 27001:2022 Control A.5.1 (Policies for Information Security)
- ISO/IEC 27002
- ISO/IEC 27002:2022
- ISO/IEC 27014 (Governance of Information Security)
- ISO/IEC 31000:2018 (Risk Management)
- ISO/IEC 31000:2018 Risk Management
- ISO 31000:2018 (Risk Management)
- ISO 31000:2018 Risk Management
- ISO/IEC 31000 Risk Management
- ISO 31010:2019 (Risk Assessment Techniques)
- ISO 9001:2015
- ISO/IEC 90003:2018 (Software engineering — Guidelines for the application of ISO 9001:2015 to computer software)
- ISO/IEC/IEEE 42010 (Architecture Description)

## NIST

- NIST Cybersecurity Framework
- NIST Cybersecurity Framework v2.0 (2024)
- NIST AI Risk Management Framework (AI RMF 1.0)
- NIST SP 800-53 (Security and Privacy Controls)
- NIST SP 800-145 (The NIST Definition of Cloud Computing)
- NIST SP 800-171 (Protecting Controlled Unclassified Information)
- NIST SP 800-12 (Introduction to Information Security)
- NIST SP 800-60 (Mapping Types of Information and Systems to Security Categories)
- NIST SP 800-145 (Cloud Service Models)
- NIST SP 800-145
- NIST SP 800-60
- NIST SP 800-60 (Data Categorization)
- NIST SP 800-171
- NIST SP 800-53
- NIST Cybersecurity Framework v2.0
- NIST Cybersecurity Framework (Protect/Detect/Respond functions)
- NIST Cybersecurity Framework v2.0 (Govern Function)

## AICPA / AT-C / SSAE

- AICPA AU-C 505 (External Confirmations)
- AICPA AU-C 520 (Analytical Procedures)
- AICPA AU-C 530 (Audit Sampling)
- AICPA AU-C 540 (Auditing Accounting Estimates)
- AICPA Peer Review Standards
- AICPA reporting standards
- SSAE 18 AT-C 105 (Concepts Common to All Attestation Engagements)
- SSAE 18 AT-C 205 (Examination Engagements)

## IIA

- IIA International Standard 1110 (Organizational Independence)
- IIA International Standard 1130 (Impairment to Independence or Objectivity)
- IIA International Standard 1300 (Quality Assurance and Improvement)
- IIA International Standard 1311 (Internal Assessments)
- IIA International Standard 1312 (External Assessments)
- IIA International Standard 2010 (Planning)
- IIA International Standard 2050 (Coordination and Reliance)
- IIA International Standard 2060 (Reporting to Senior Management and the Board)
- IIA International Standard 2120 (Risk Management)
- IIA International Standard 2330 (Documenting Information)
- IIA International Standard 2440 (Disseminating Results)
- IIA International Standard 2500 (Monitoring Progress)
- IIA Three Lines Model (2020)
- IIA Practice Guide on Control Self-Assessment
- IIA Practice Guide on Integrated Auditing
- IIA Practice Guide on Agile Auditing
- IIA Practice Guide on Audit Planning
- IIA Practice Guide on External Assessments
- IIA Practice Guide on Internal Audit's Role in Major Decisions
- IIA Practice Guide on Risk Management
- IIA Risk Management Standards
- IIA International Standard 1130 (Impairment to Independence)
- IIA International Standards 1311 (Internal Assessments)
- IIA International Standards 1312 (External Assessments)
- IIA International Standards 2010 (Planning)
- IIA International Standards 2050 (Coordination and Reliance)
- IIA International Standards 2120 (Risk Management)
- IIA International Standards 2330 (Documenting Information)
- IIA International Standards 2440 (Disseminating Results)
- IIA International Standards 2500 (Monitoring Progress)

## ACFE / Fraud-Specific

- ACFE Fraud Examiners Manual
- ACFE Fraud Examiners Manual on Evidence Handling
- ACFE Fraud Examiners Manual on Investigative Interviewing
- ACFE Fraud Examiners Manual on Reporting
- ACFE Fraud Examiners Manual on Investigation Coordination
- ACFE Report to the Nations

## COSO

- COSO Internal Control – Integrated Framework (2013)
- COSO Internal Control – Integrated Framework (2013) Component 5 (Monitoring Activities)
- COSO Internal Control – Integrated Framework (Control Environment component)
- COSO ERM (2017)

## Other Frameworks

- TOGAF 9.2
- ITIL 4 Capacity and Performance Management
- ITIL 4
- ITIL 4 (Change Enablement)
- SAFe
- AICPA SSAE 18 AT-C 105 (Concepts Common to All Attestation Engagements)
- AICPA SSAE 18 AT-C 205 (Examination Engagements)
- AICPA Trust Services Criteria
- ISACA Cyber Insurance guidance
- ISACA Audit Committee guidance
- ISACA IT Outsourcing guidance
- ISO 9004
- Crosby Quality is Free
- Juran Quality Handbook
- Prosci ADKAR Model
- Kotter 8 Steps
- ISO 22301 (Business Continuity Management)
- NIST SP 800-34 (Contingency Planning Guide)
- NIST SP 800-50 (Building an Information Technology Security Awareness Program)
- NIST SP 800-61 (Computer Security Incident Handling Guide)
- ISACA Business Continuity guidance
- ISACA Incident Response guidance
- ISACA Information Security Awareness guidance
- ISACA IT Service Management guidance
- ISACA Cloud Cost Governance guidance
- ISACA Cloud Governance guidance
- ISACA Cloud Architecture guidance
- ISACA Compliance Management guidance
- ISACA M&A IT Due Diligence guidance
- ITIL 4 Incident Management
- OCC Bulletin 2017-21 (Mergers and Acquisitions)
- OCC Comptroller's Licensing Manual — Business Combinations
- GDPR Article 3 (Territorial Scope)
- GDPR Article 12 (Information and Modalities for Exercise of Rights)
- GDPR Article 15 (Right of Access)
- GDPR Article 5 (Principles)
- ISACA Outsourcing Risk Assessment guidance
- FinOps Foundation Framework
- PMI Standard for Program Management
- EFQM Model (2020)
- FAIR (Factor Analysis of Information Risk)
- The Open Group O-RT/O-RA standards
- CSA Cloud Controls Matrix
- CSA Security Guidance v4.0
- OWASP LLM Top 10
- OWASP LLM Top 10 (LLM01: Prompt Injection)
- DAMA-DMBOK 2nd Edition (Data Governance + Data Quality)
- IAPP CIPP/CIPM bodies of knowledge
- ISACA IT Balanced Scorecard guidance
- DAMA-DMBOK 2nd Edition
- IIA Practice Guide on Multi-Jurisdictional Audits
- Gartner Cloud Migration Framework
- AWS/Azure 6 Rs Migration Playbooks
- AWS/Azure 6 Rs
- IAPP CIPP/CIPM body of knowledge
- OCEG GRC Capability Model
- Cloud Security Alliance Cloud Controls Matrix (CCM)
- CSA Security, Trust, Assurance, and Risk (STAR) Registry

## Legal / Regulatory — US

- Sarbanes-Oxley Act Section 301 (Audit Committee Requirements)
- Sarbanes-Oxley Act Section 404 (Management Assessment of Internal Controls)
- Sarbanes-Oxley Act Section 407 (Financial Expert Disclosure)
- Sarbanes-Oxley Act Section 802 (Records Retention)
- Sarbanes-Oxley Act Section 802 (Criminal Penalties for Altering Documents)
- 17 CFR 210.2-06 (Retention of Audit and Review Records)
- SEC Rule 17 CFR 210.2-06
- HIPAA
- HIPAA Privacy Rule
- HIPAA Security Rule
- HIPAA Breach Notification Rule
- HIPAA 45 CFR § 164.530
- FFIEC Outsourcing Technology Services booklet
- FFIEC Incident Response examination procedures
- OCC Bulletin 2013-29 (Third-Party Relationships)
- NYSE Listed Company Manual Section 303A.07
- SEC Item 407(d)(5)
- EDPB Guidelines on Article 6
- GLBA Safeguards Rule
- GLBA (Gramm-Leach-Bliley Act)
- FFIEC IT Examination Handbook
- FFIEC Cloud Computing booklet
- FCRA
- GINA
- NERC CIP-003-8
- PCI DSS v4.0
- PCI DSS
- PCAOB AS 2605 (Consideration of the Internal Audit Function)
- SEC rules
- FRCP Rule 37 (Spoliation)
- FinCEN 31 CFR 1010.320 (Suspicious Activity Reports)

## Legal / Regulatory — US State Privacy

- CCPA/CPRA
- Virginia CDPA
- Colorado CPA
- Texas TDPSA

## Legal / Regulatory — International

- GDPR
- GDPR (EU 2016/679)
- GDPR Article 6 (Lawfulness of Processing)
- GDPR Article 24 (Controller Responsibility)
- GDPR Article 24 (controller responsibility)
- GDPR Articles 5 and 24 (EU Regulation 2016/679)
- GDPR Article 7 (Consent)
- GDPR Article 13 (Information to be provided)
- GDPR Article 25 (Data Protection by Design and by Default)
- GDPR Article 25 (Privacy by Design and Default)
- EDPB Guidelines 4/2019 (Article 25 Data Protection by Design and by Default)
- EDPB Guidelines 248/2017 (DPIA)
- GDPR Article 5(1)(e) (Storage Limitation)
- GDPR Article 17 (Right to Erasure)
- GDPR Article 17(3) (Erasure Exemptions)
- GDPR Article 30 (Records of Processing Activities)
- GDPR Article 35 (Data Protection Impact Assessment)
- GDPR Articles 5 and 24 (EU Regulation 2016/679)
- GDPR Articles 44-50 (Transfers)
- UK-GDPR
- EDPB Guidelines on RoPA
- EDPB Guidelines 2/2019 (on processing in the context of contracts)
- EDPB Guidelines 8/2020 (on targeting of social media users)
- EDPB Recommendations on Supplementary Measures (06/2020)
- LGPD
- PIPEDA
- PIPL (China)
- PIPL
- DPDPA (India)
- PDPA (Singapore)
- Privacy Act (Australia)
- APPI (Japan)
- PIPA (South Korea)
- POPIA (South Africa)
- Schrems II
- Schrems II ruling (CJEU 2020)
- EU-US Data Privacy Framework (2023, contested)
- EU-US Data Privacy Framework
- EDPB Guidelines 8/2020
- Standard Contractual Clauses (SCCs)
- Transfer Impact Assessments (TIAs)
- DoD CMMC
- HITRUST CSF

## Compound / Multi-Citation Allowance

The linter accepts compound citations of the form "<Citation A> + <Citation B>"
or "<Citation A> and <Citation B>" where each component matches a canonical
entry above. Example: "ISACA IT Audit Standard 1205 (Evidence) and ISACA IT
Audit Standard 1208 (Audit Documentation)" parses as two entries.

The library is intentionally permissive on parenthetical sub-references like
"(...) and (...)" — the linter validates the leading framework name + the
top-level objective code, and accepts trailing detail (e.g., COBIT 2019 APO12
sub-references like "(Managed Risk) and APO12.03").

## Batch 10 additions
- ISACA Security Operations guidance
- NITTF Insider Threat Program guidance
- NIST SP 800-150 (Guide to Cyber Threat Information Sharing)
- NIST SP 800-218 (Secure Software Development Framework)
- Executive Order 14028 (Improving the Nation's Cybersecurity)
- ISACA Open Source Software guidance
- IEC 62443 (Industrial Automation and Control Systems Security)
- NIST SP 800-82 (Guide to OT Security)
- ISACA Industrial Cybersecurity guidance
- NIST SP 800-207 (Zero Trust Architecture)
- CISA Zero Trust Maturity Model
- ISACA Threat Intelligence guidance
- ISO/IEC 27035 (Information security incident management)
- OWASP API Security Top 10
- CSA API Security Guidelines
- ISACA API Governance guidance
- NIST SP 800-63 (Digital Identity Guidelines)
- ISACA Identity and Access Management guidance
- ISACA Privileged Access guidance
- CIS Critical Security Controls
- ISACA Insider Threat guidance
- NIST SP 800-53 AT-2(2)
- NIST SP 800-53 AC-6 (Least Privilege)
- ISACA Crisis Communication guidance
- CISA Ransomware Guidance
- FBI Ransomware Advisories
- ISO/IEC 30300 (Records Management)
- ISACA Information Governance guidance
- ARMA Generally Accepted Recordkeeping Principles (GARP)
- CSA Zero Trust Framework

## D2 batch 11 additions
- GHG Protocol Corporate Standard
- ISSB IFRS S2 (Climate-related Disclosures)
- CSRD (Corporate Sustainability Reporting Directive)
- SEC Climate Disclosure Rules
- ISACA ESG Governance guidance
- Federal Reserve SR 20-15 (Operational Resilience)
- ISACA Cyber Resilience guidance
- ISACA Privacy Investigation guidance
- ISACA Customer Trust Recovery guidance
- ISACA Audit Function Management guidance
- IIA International Standards 1300-1330 (Quality Assurance and Improvement Program)
- GDPR Article 31 (Cooperation with the Supervisory Authority)
- GDPR Article 83 (General Conditions for Imposing Administrative Fines)
- EDPB Guidelines 06/2022
- NIST PQC Standards (FIPS 203/204/205)
- NIST SP 800-208 (Stateful Hash-Based Signature Schemes)
- CISA Post-Quantum Cryptography Initiative
- Edelman Trust Barometer methodology
- Harvard Negotiation Project (Getting to Yes)
- CISA Software Bill of Materials guidance

## D3 batch 1 additions
- PMBOK Guide 7th Edition
- PRINCE2 (Projects in Controlled Environments)
- PMI Standard for Project Risk Management
- ISO/IEC 12207 (Software Life Cycle Processes)
- NIST SP 800-160 Vol 1 (Systems Security Engineering)
- ISTQB Foundation Level Syllabus
- ISO/IEC 29119 (Software Testing)
- IEEE 828 (Configuration Management in Systems and Software Engineering)
- IEEE 830 (Recommended Practice for Software Requirements Specifications)
- IEEE 1061 (Software Quality Metrics Methodology)
- ISO/IEC 25010 (Software Product Quality Model)
- ISO/IEC 29100 (Privacy Framework)
- Scrum Guide 2020
- DORA / Accelerate (DevOps Research and Assessment)
- ITIL 4 Service Configuration Management
- ISACA Val IT Framework
- ISACA IT Investment guidance
- ISACA Software Audit guidance
- ISACA Application Controls guidance
- ISACA Data Migration guidance
- ISACA Project Audit guidance
- ISACA Configuration Management guidance
- ISACA UAT Audit guidance
- ISACA Code Escrow guidance
- OWASP SAMM (Software Assurance Maturity Model)
- BSIMM (Building Security In Maturity Model)
- NIST SP 800-218 (SSDF v1.1)
- COBIT 2019 BAI02 (Managed Requirements Definition)
- COBIT 2019 BAI07 (Managed IT Change Acceptance and Transitioning)
- COBIT 2019 BAI08 (Managed Knowledge)
- COBIT 2019 BAI09 (Managed Assets)

## D3 batch 2 additions
- NTIA SBOM Minimum Elements
- CycloneDX SBOM Specification
- SPDX License List
- Linux Foundation OpenChain (ISO/IEC 5230)
- Microsoft Threat Modeling (STRIDE)
- OWASP Threat Modeling Cheat Sheet
- ISO/IEC 14143 (Functional Size Measurement)
- IFPUG Function Point Counting Practices Manual
- Kanban Method (David Anderson)
- OWASP DevSecOps Maturity Model (DSOMM)
- IEEE 829 (Standard for Software Test Documentation)
- ISTQB Advanced Level Test Analyst Syllabus
- Trunk-Based Development (Paul Hammant)
- Git Flow (Vincent Driessen)
- Sigstore / Cosign
- Notary v2 / OCI Image Signing
- HashiCorp Terraform Cloud Drift Detection
- Open Policy Agent (OPA)
- Google SRE Book (Site Reliability Engineering)
- Google SRE Workbook (Service Level Objectives)
- PMI Practice Standard for Earned Value Management
- ISO/IEC 42001 (AI Management System)
- COBIT 2019 BAI03 (Managed Solutions Identification and Build) — Source Control
- ISACA DevSecOps Audit guidance
- ISACA Container Security guidance
- ISACA Open Source Software Governance guidance
- OWASP Testing Guide
- OWASP Application Security Verification Standard (ASVS)
- SLSA (Supply-chain Levels for Software Artifacts) framework

## D3 batch 3 additions
- AICPA SOC 2 Trust Services Criteria
- AICPA SOC 1 Type II Report
- ISACA Stakeholder Management guidance
- ISACA Project Closure guidance
- ISACA Lessons Learned guidance
- ISACA Data Integrity Controls guidance
- ISACA Low-Code/No-Code Governance guidance
- ISACA Database Audit guidance
- ISACA Microservices Audit guidance
- ISACA SaaS Vendor Assurance guidance
- ISACA Build vs Buy Decision guidance
- ISACA Performance Testing guidance
- ISACA M&A IT Integration guidance
- OWASP API Security Top 10 (2023)
- Twelve-Factor App methodology
- Reactive Manifesto
- Pact (Consumer-Driven Contract Testing)
- COBIT 2019 BAI01 (Managed Programs)
- COBIT 2019 BAI04 (Managed Availability and Capacity) — Performance Testing
- COBIT 2019 EDM01 (Ensured Governance Framework Setting and Maintenance)
- FIDO2/WebAuthn specifications

## D3 batch 4 additions
- HashiCorp Vault
- CyberArk Conjur
- ISACA Secrets Management guidance
- GitOps Working Group (CNCF)
- Argo CD
- Flux CD
- Kubernetes Admission Controllers
- OPA Gatekeeper
- Falco (CNCF runtime security)
- DORA Four Key Metrics (Deployment Frequency, Lead Time for Changes, Change Failure Rate, MTTR)
- ISACA AI-Augmented Development guidance
- GitHub Copilot Trust Center documentation
- ISACA GitOps Audit guidance
- ISACA Code Review Effectiveness guidance
- ISACA Test Pyramid guidance
- ISACA Database Performance Audit guidance
- NIST SP 800-57 (Recommendation for Key Management)
- ISACA Encryption Key Management guidance
- NIST SP 800-92 (Guide to Computer Security Log Management)
- ISACA Continuous Compliance guidance
- ISACA Legacy Modernization guidance
- ISACA Production-Like Environment guidance
- ISACA Vendor Abandonment guidance
- FIPS 140-3 (Security Requirements for Cryptographic Modules)
