# CC Framework Citation Library

**Purpose:** the canonical `framework_ref` strings for the CC question bank
(`data/cc/originals/d{N}.json`). Started 28 Oct 2026 from the D1 and D3 pilot
batches (`cc_d1_001`–`020`, `cc_d3_001`–`020`); D2 pilot citations (`cc_d2_001`–`020`) added 29 Oct 2026. D5 pilot citations (`cc_d5_001`–`020`) added 29 Oct 2026.

**Format** (same as `data/originals/_framework_library.md`):
- Each canonical citation is a bullet at the start of a line (`- `). Split a
  `framework_ref` on `;` and match each part exactly.
- Indented sub-bullets record the status and are ignored by the parser.
- Add a new citation here in the same change that first uses it.

**Status key:**
- **Verified:** the section or control was checked against the source, or a
  verbatim copy of it.
- **Likely:** the edition is current and the title matches, but the official
  text was not opened. Check it before release.

**Format drift to fix later:** D1 writes `NIST SP 800-53 Rev. 5, AU-10` and
`ISO/IEC 27002:2022, Control 5.1`, with a comma. D3 writes them without one.
Both forms are listed so the parser matches them. New items use the D3 form
(no comma).

---

## NIST

### SP 800-53 Rev. 5, Security and Privacy Controls (Sep 2020; catalog release 5.2.0, Aug 2025)
- NIST SP 800-53 Rev. 5 AC-2 (Account Management)
- NIST SP 800-53 Rev. 5 AC-3 (Access Enforcement)
- NIST SP 800-53 Rev. 5 AC-3(3) (Mandatory Access Control)
- NIST SP 800-53 Rev. 5 AC-3(4) (Discretionary Access Control)
- NIST SP 800-53 Rev. 5 AC-3(7) (Role-based Access Control)
- NIST SP 800-53 Rev. 5 AC-3(13) (Attribute-based Access Control)
- NIST SP 800-53 Rev. 5 AC-5 (Separation of Duties)
- NIST SP 800-53 Rev. 5 AC-6 (Least Privilege)
- NIST SP 800-53 Rev. 5 AC-16 (Security and Privacy Attributes)
- NIST SP 800-53 Rev. 5 IA-2 (Identification and Authentication (Organizational Users))
- NIST SP 800-53 Rev. 5 IA-5 (Authenticator Management)
- NIST SP 800-53 Rev. 5 PS-4 (Personnel Termination)
- NIST SP 800-53 Rev. 5 PS-5 (Personnel Transfer)
  - All of the above: Verified, 28 Oct 2026.
- NIST SP 800-53 Rev. 5 AC-6(2) (Non-privileged Access for Nonsecurity Functions)
  - Likely, 28 Oct 2026. Title and intent confirmed through secondary copies of the catalog; the NIST catalog itself was not opened. Used in cc_d3_014.
- NIST SP 800-53 Rev. 5, AU-10 (Non-repudiation)
- NIST SP 800-53 Rev. 5, CM-3 (Configuration Change Control)
- NIST SP 800-53 Rev. 5, IA-2 (Identification and Authentication (Organizational Users)) and AU-2 (Event Logging)
- NIST SP 800-53 Rev. 5, PE-3 (Physical Access Control)
- NIST SP 800-53 Rev. 5, PE-3 (Physical Access Control) and PE-6 (Monitoring Physical Access)
- NIST SP 800-53 Rev. 5, RA-7 (Risk Response)
- NIST SP 800-53 Rev. 5, SA-8(33) (Minimization) and SI-12(1) (Limit Personally Identifiable Information Elements)
- NIST SP 800-53 Rev. 5, SI-2 (Flaw Remediation)
  - The comma-form controls above: Verified, 28 Oct 2026.
- NIST SP 800-53 Rev. 5, Appendix A Glossary (compensating controls) and PE-3 (Physical Access Control)
  - PE-3 Verified. The glossary entry is Likely (28 Oct 2026): the term comes from OMB Circular A-130 and is carried in the Rev. 5 glossary.
- NIST SP 800-53 Rev. 5 AT-2(3) (Literacy Training and Awareness: Social Engineering and Mining)
- NIST SP 800-53 Rev. 5 AT-3 (Role-based Training)
- NIST SP 800-53 Rev. 5 CA-7 (Continuous Monitoring)
- NIST SP 800-53 Rev. 5 CP-4 (Contingency Plan Testing)
- NIST SP 800-53 Rev. 5 CP-7 (Alternate Processing Site)
- NIST SP 800-53 Rev. 5 CP-9(1) (System Backup: Testing for Reliability and Integrity)
  - D2 pilot (cc_d2_003, 008–014). Verified 29 Oct 2026 against the Rev. 5 PDF on nvlpubs.nist.gov (control and enhancement titles). cc_d2_003 also uses the no-comma CM-3 entry in the D5 block below.
- NIST SP 800-53 Rev. 5 CA-8 (Penetration Testing)
- NIST SP 800-53 Rev. 5 CA-8(2) (Penetration Testing | Red Team Exercises)
- NIST SP 800-53 Rev. 5 CM-2 (Baseline Configuration)
- NIST SP 800-53 Rev. 5 CM-3 (Configuration Change Control)
- NIST SP 800-53 Rev. 5 RA-5 (Vulnerability Monitoring and Scanning)
- NIST SP 800-53 Rev. 5 SA-11(1) (Developer Testing and Evaluation | Static Code Analysis)
- NIST SP 800-53 Rev. 5 SA-11(8) (Developer Testing and Evaluation | Dynamic Code Analysis)
- NIST SP 800-53 Rev. 5 SA-22 (Unsupported System Components)
  - D5 pilot. Verified 29 Oct 2026: titles matched against the Rev. 5 PDF text. CM-3 also appears above in the comma form.

### SP 800-34 Rev. 1, Contingency Planning Guide for Federal Information Systems (May 2010, updated Nov 2010)
- NIST SP 800-34 Rev. 1 Section 2.2 (Types of Plans: Business Continuity Plan and Disaster Recovery Plan)
- NIST SP 800-34 Rev. 1 Section 3.2.1 (Determine Business Processes and Recovery Criticality: MTD, RTO and RPO)
- NIST SP 800-34 Rev. 1 Section 3.4.3 (Alternate Sites)
- NIST SP 800-34 Rev. 1 Section 3.5 (Plan Testing, Training, and Exercises)
  - Verified 29 Oct 2026 against the PDF table of contents and text (nvlpubs.nist.gov). Still the current revision: no Rev. 2 is published (checked again 28 Oct 2026). 2.2.1 is the BCP and 2.2.6 the DRP; 3.2.1 defines MTD, RTO and RPO; 3.4.3 describes cold, warm and hot sites.

### SP 800-50 Rev. 1, Building a Cybersecurity and Privacy Learning Program (Sep 2024)
- NIST SP 800-50 Rev. 1 (Building a Cybersecurity and Privacy Learning Program)
  - Verified 29 Oct 2026 (local copy of the NIST PDF). Cited by title; it covers awareness, role-based training and learning culture.

### SP 800-55 Vol. 1, Measurement Guide for Information Security: Identifying and Selecting Measures (Dec 2024)
- NIST SP 800-55v1 Section 2.4 (Metrics: key risk indicators and key performance indicators)
- NIST SP 800-55v1 Section 3.3 (Types of Measures: implementation, effectiveness, efficiency and impact)
- NIST SP 800-55v1 Section 4.4 (Evaluating Methods for Supporting Continuous Improvement: leading and lagging indicators)
  - Verified 29 Oct 2026 (local copy of the NIST PDF). 2.4 names KRIs and KPIs as kinds of metric; 3.3.1–3.3.4 are the four measure types; 4.4 defines KPI, KRI, leading and lagging indicators.

### AI Risk Management Framework, NIST AI 100-1 (AI RMF 1.0, Jan 2023) and NIST AI 600-1 (Generative AI Profile, Jul 2024)
- NIST AI 100-1 (AI RMF 1.0) GOVERN 1.6 (mechanisms are in place to inventory AI systems)
- NIST AI 100-1 (AI RMF 1.0) MEASURE 2.4 (the functionality and behavior of the AI system are monitored when in production)
- NIST AI 100-1 (AI RMF 1.0) MANAGE 4.1 (post-deployment monitoring plans, including capturing user input, appeal and override)
- NIST AI 600-1 (Generative AI Profile) Section 2.8 (Information Integrity: deepfakes and content that impersonates others)
  - Verified 29 Oct 2026 (local copies of the NIST PDFs). Wording paraphrases the subcategory text; MANAGE 4.1 names "appeal and override" explicitly.

### SP 800-63-4 Digital Identity Guidelines (final, 2025; csrc.nist.gov lists 31 Jul 2025)
- NIST SP 800-63B-4 (Authentication and Authenticator Management: multi-factor authentication)
- NIST SP 800-63B-4 (Authentication and Authenticator Management: password requirements)
- NIST SP 800-63B-4 (Authentication and Authenticator Management: phishing resistance)
- NIST SP 800-63C-4 (Federation and Assertions)
  - Verified, 28 Oct 2026. Cited by topic, not section number; the full text on pages.nist.gov was blocked during authoring. A biometric counts only when paired with a physical authenticator (the cc_d3_001 fix depends on this).

### Other NIST publications
- NIST SP 800-162 (Guide to Attribute Based Access Control (ABAC) Definition and Considerations)
  - Jan 2014, with updates of Feb 2019. Verified, 28 Oct 2026.
- NIST SP 800-12 Rev. 1, Section 1.4 (Important Terminology: confidentiality, integrity, availability)
- NIST SP 800-12 Rev. 1, Section 5.1 (Standards, Guidelines, and Procedures)
  - Jun 2017. Likely, 28 Oct 2026 (the author read them; the audit could not confirm them independently).
- NIST SP 800-12 Rev. 1, Section 9.1.3 (Electronic Signatures)
  - Likely, lower confidence, 28 Oct 2026. Confirm the section number against the PDF table of contents.
- NIST SP 800-30 Rev. 1, Section 2.3.1 (Risk Models: threats, vulnerabilities, likelihood and impact)
- NIST SP 800-30 Rev. 1, Section 2.3.2 (Assessment Approaches: quantitative assessments support cost-benefit analysis of risk responses)
  - Sep 2012. Verified, 28 Oct 2026. 800-30 does not use the terms SLE, ALE or ARO; cite it only for "quantitative supports cost-benefit".
- NIST SP 800-88 Rev. 2 Section 3.1 (Sanitization Methods: clear, purge and destroy)
  - Sep 2025. Verified 29 Oct 2026: PDF read. 3.1.1 Clear, 3.1.2 Purge, 3.1.3 Destroy; overwriting gives little protection on SSDs with spare cells; degaussing is not for flash storage; cryptographic erase is a purge technique (3.2).
- NIST SP 800-61 Rev. 3 Section 1 (Introduction: events, adverse events and incidents)
- NIST SP 800-61 Rev. 3 Table 1 (Previous incident response life cycle model's phases and corresponding CSF 2.0 Functions)
  - Apr 2025. Verified 29 Oct 2026: csrc.nist.gov date checked; Section 1 definitions and the list of tables read in the PDF.
- NIST SP 800-83 Rev. 1 (Guide to Malware Incident Prevention and Handling for Desktops and Laptops)
  - Jul 2013, still the current final on csrc.nist.gov (checked 29 Oct 2026). Cited by title, not section.
- NIST SP 800-57 Part 1 Rev. 5 (Recommendation for Key Management: Part 1 – General)
  - May 2020, current final (csrc.nist.gov checked 29 Oct 2026); Rev. 6 is a draft only. Cited by title, not section.
- NIST SP 800-40 Rev. 4 (Guide to Enterprise Patch Management Planning: Preventive Maintenance for Technology)
  - Apr 2022, current final (csrc.nist.gov checked 29 Oct 2026). Cited by title, not section.
- NIST AI 100-2 E2025 (Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations)
  - Mar 2025, current (csrc.nist.gov checked 29 Oct 2026). Cited by title.

### Cybersecurity Framework (CSF) 2.0, NIST CSWP 29 (Feb 2024)
- NIST CSWP 29, The NIST Cybersecurity Framework (CSF) 2.0, Section 1 (CSF Overview)
- NIST CSF 2.0 GV.OC-03 (legal, regulatory and contractual requirements, including privacy obligations, are understood and managed)
- NIST CSF 2.0 GV.PO-01 (cybersecurity policy is established, communicated and enforced) and ID.RA-07 (changes and exceptions are managed, assessed for risk impact, recorded and tracked)
- NIST CSF 2.0 GV.RM-02
- NIST CSF 2.0 ID.RA-01 and ID.RA-03
- NIST CSF 2.0 ID.RA-06
- NIST CSF 2.0 ID.RA-07
  - All Verified, 28 Oct 2026. "CSF 2.0" and "CSWP 29" are the same document.
- NIST CSF 2.0 GV.RR-01 (organizational leadership is responsible and accountable for cybersecurity risk and fosters a culture that is risk-aware, ethical and continually improving)
- NIST CSF 2.0 GV.RR-02 (roles, responsibilities and authorities related to cybersecurity risk management are established, communicated, understood and enforced)
- NIST CSF 2.0 GV.RM-02 (risk appetite and risk tolerance statements are established, communicated and maintained)
- NIST CSF 2.0 GV.OV-03 (organizational cybersecurity risk management performance is evaluated and reviewed for adjustments needed)
- NIST CSF 2.0 PR.AT-02 (individuals in specialized roles are provided with awareness and training to perform relevant tasks with cybersecurity risks in mind)
- NIST CSF 2.0 PR.DS-11 (backups of data are created, protected, maintained and tested)
  - D2 pilot. Verified 29 Oct 2026 against the CSWP 29 PDF. GV.RM-02 with its description is the long form of the bare D1 entry above.
- NIST CSF 2.0 DE.AE-02 (potentially adverse events are analyzed to better understand associated activities)
- NIST CSF 2.0 DE.AE-08 (incidents are declared when adverse events meet the defined incident criteria)
- NIST CSF 2.0 ID.IM-02 (improvements are identified from security tests and exercises, including those done in coordination with suppliers and relevant third parties)
- NIST CSF 2.0 PR.PS-01 (configuration management practices are established and applied)
- NIST CSF 2.0 PR.PS-03 (hardware is maintained, replaced, and removed commensurate with risk)
- NIST CSF 2.0 RS.AN-07 (incident data and metadata are collected, and their integrity and provenance are preserved)
- NIST CSF 2.0 RS.CO-03 (information is shared with designated internal and external stakeholders)
- NIST CSF 2.0 RS.MA-04 (incidents are escalated or elevated as needed)
- NIST CSF 2.0 RS.MI-01 (incidents are contained)
- NIST CSF 2.0 RS.MI-02 (incidents are eradicated)
  - D5 pilot. Verified 29 Oct 2026 against the CSWP 29 text.

## ISO/IEC

### ISO/IEC 27001:2022 (with Amd 1:2024)
- ISO/IEC 27001:2022 (Information security management systems: Requirements)
- ISO/IEC 27001:2022, Clause 6.1.3 f) (risk owners approve the risk treatment plan and accept residual risk)
  - Verified, 28 Oct 2026. Clause 6.1.3 f) is unchanged from the 2013 edition.

### ISO/IEC 27002:2022
- ISO/IEC 27002:2022 Control 5.3 (Segregation of duties)
- ISO/IEC 27002:2022 Control 5.15 (Access control)
- ISO/IEC 27002:2022 Control 5.16 (Identity management)
- ISO/IEC 27002:2022 Control 5.17 (Authentication information)
- ISO/IEC 27002:2022 Control 5.18 (Access rights)
- ISO/IEC 27002:2022 Control 8.2 (Privileged access rights)
- ISO/IEC 27002:2022, Control 5.1 (Policies for information security)
- ISO/IEC 27002:2022, Control 5.10 (Acceptable use of information and other associated assets)
- ISO/IEC 27002:2022, Control 5.34 (Privacy and protection of PII)
- ISO/IEC 27002:2022, Control 8.8 (Management of technical vulnerabilities)
- ISO/IEC 27002:2022, Control 8.32 (Change management)
  - Control titles Verified, 28 Oct 2026. iso.org could not be reached; the titles were confirmed from the 2022 control list.
- ISO/IEC 27002:2022 Control 5.10 (Acceptable use of information and other associated assets)
  - No-comma form of the 5.10 entry above (title Verified, 28 Oct 2026). Used in cc_d2_004.
- ISO/IEC 27002:2022 Control 5.31 (Legal, statutory, regulatory and contractual requirements)
  - Likely, 29 Oct 2026. Title confirmed through secondary control lists only; iso.org was not opened. Used in cc_d2_001 and 005.
- ISO/IEC 27002:2022, Control 7.1 (Physical security perimeters)
  - Title Verified; the fit is Likely (28 Oct 2026). Cited for the guidance that perimeter fire doors fail safe under local fire codes.
- ISO/IEC 27002:2022 Control 5.12 (Classification of information)
- ISO/IEC 27002:2022 Control 5.25 (Assessment and decision on information security events)
- ISO/IEC 27002:2022 Control 5.26 (Response to information security incidents)
- ISO/IEC 27002:2022 Control 5.28 (Collection of evidence)
- ISO/IEC 27002:2022 Control 6.8 (Information security event reporting)
- ISO/IEC 27002:2022 Control 7.14 (Secure disposal or re-use of equipment)
- ISO/IEC 27002:2022 Control 8.12 (Data leakage prevention)
- ISO/IEC 27002:2022 Control 8.24 (Use of cryptography)
- ISO/IEC 27002:2022 Control 8.32 (Change management)
  - D5 pilot. Likely, 29 Oct 2026: titles from the 2022 control list; iso.org was not opened. 8.32 also appears above in the comma form.

## Center for Internet Security (CIS)

### CIS Critical Security Controls v8.1 (Jun 2024)
- CIS Critical Security Controls v8.1 (Implementation Groups)
- CIS Controls v8.1 Safeguard 6.1 (Establish an Access Granting Process)
- CIS Controls v8.1 Safeguard 6.2 (Establish an Access Revoking Process)
- CIS Controls v8.1 Safeguard 6.5 (Require MFA for Administrative Access)
- CIS Controls v8.1 Safeguard 6.7 (Centralize Access Control)
- CIS Controls v8.1 Safeguard 6.8 (Define and Maintain Role-Based Access Control)
  - Verified, 28 Oct 2026. The titles are unchanged from v8. v8.1 uses "Implementation Groups" and "essential cyber hygiene", not "basic set".
- CIS Controls v8.1 Safeguard 5.4 (Restrict Administrator Privileges to Dedicated Administrator Accounts)
  - Likely, 28 Oct 2026. Title and IG1 status confirmed through secondary copies; cisecurity.org was not opened. Used in cc_d3_014.
- CIS Controls v8.1 Safeguard 3.7 (Establish and Maintain a Data Classification Scheme)
  - Likely, 29 Oct 2026. cisecurity.org was blocked by the session proxy; title from prior knowledge of v8/v8.1. Used in cc_d5_004.

## OWASP

- OWASP Top 10 for LLM Applications 2025, LLM06 (Excessive Agency)
  - Verified, 28 Oct 2026.
- OWASP Non-Human Identities Top 10 (2025) NHI2 (Secret Leakage)
  - Likely, 28 Oct 2026. owasp.github.io was blocked during authoring.

## FIRST

- FIRST Common Vulnerability Scoring System (CVSS) v4.0 Specification Document, Section 1 (Introduction)
  - Verified 29 Oct 2026 at first.org/cvss/v4.0/specification-document: the Base Score reflects a flaw's intrinsic severity; Threat metrics adjust for factors such as active exploitation; consumers enrich scores as input to their own risk assessment. Used in cc_d5_016.

## MITRE

- MITRE ATT&CK knowledge base (Enterprise matrix: tactics and techniques)
  - Likely, 29 Oct 2026. attack.mitre.org was blocked by the session proxy. Tactic = the adversary's goal, technique = how it is reached (prior knowledge). Used in cc_d5_008.

## Code of Ethics

- ISC2 Code of Ethics, Preamble and Canons
- ISC2 Code of Ethics, Canons
- ISC2 Code of Ethics, Canons (service to principals)
  - Verified at isc2.org/ethics, 28 Oct 2026. These go in `framework_ref` only, never in stems, options, explanations or tips. Open question: if the app shows `framework_ref` to learners, add the ® at first mention.
