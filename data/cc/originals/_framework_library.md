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
  verbatim copy of it. **Verified (title):** the title was confirmed against
  the published control list; the fit to the item is judged separately.
- **Likely:** the edition is current and the title matches, but the official
  text was not opened. Check it before release.

**One form everywhere.** `<publisher> <document> <edition> <locator> (<title or
short paraphrase>)`, with no comma anywhere before the parenthesis. Locators:
`Section 3.2.1`, `Table 1`, `Clause 6.1.3 f)`, `Control 5.31`, `Safeguard 3.7`,
a NIST control ID (`AU-10`) or a CSF ID (`GV.RM-02`). NIST enhancements use the
catalog form `CP-9(1) (System Backup | Testing for Reliability and Integrity)`.
One citation per `;`-separated part: never join two controls with "and". CSF
IDs always carry their paraphrase. Write CSF 2.0 as `NIST CSF 2.0`, never
`NIST CSWP 29, …`. CIS is `CIS Controls v8.1`. (Comma forms and "and" compounds
were removed on 29 Oct 2026, audit pilot 2, S7.)

---

## NIST

### SP 800-53 Rev. 5, Security and Privacy Controls (Sep 2020; catalog release 5.2.0, Aug 2025)
- NIST SP 800-53 Rev. 5 AC-2 (Account Management)
- NIST SP 800-53 Rev. 5 AC-3 (Access Enforcement)
- NIST SP 800-53 Rev. 5 AC-3(3) (Access Enforcement | Mandatory Access Control)
- NIST SP 800-53 Rev. 5 AC-3(4) (Access Enforcement | Discretionary Access Control)
- NIST SP 800-53 Rev. 5 AC-3(7) (Access Enforcement | Role-based Access Control)
- NIST SP 800-53 Rev. 5 AC-3(13) (Access Enforcement | Attribute-based Access Control)
- NIST SP 800-53 Rev. 5 AC-5 (Separation of Duties)
- NIST SP 800-53 Rev. 5 AC-6 (Least Privilege)
- NIST SP 800-53 Rev. 5 AC-16 (Security and Privacy Attributes)
- NIST SP 800-53 Rev. 5 IA-2 (Identification and Authentication (Organizational Users))
- NIST SP 800-53 Rev. 5 IA-5 (Authenticator Management)
- NIST SP 800-53 Rev. 5 PS-4 (Personnel Termination)
- NIST SP 800-53 Rev. 5 PS-5 (Personnel Transfer)
  - All of the above: Verified, 28 Oct 2026.
- NIST SP 800-53 Rev. 5 AC-6(2) (Least Privilege | Non-privileged Access for Nonsecurity Functions)
  - Verified, 30 Oct 2026, against the NIST OSCAL catalog (usnistgov/oscal-content, release 5.2.0) and the Rev. 5 PDF on nvlpubs.nist.gov. The enhancement requires users with privileged access to use non-privileged accounts or roles for nonsecurity functions, which fits cc_d3_014 (no email or browsing on admin accounts).
- NIST SP 800-53 Rev. 5 AU-2 (Event Logging)
- NIST SP 800-53 Rev. 5 AU-10 (Non-repudiation)
- NIST SP 800-53 Rev. 5 PE-3 (Physical Access Control)
- NIST SP 800-53 Rev. 5 PE-6 (Monitoring Physical Access)
- NIST SP 800-53 Rev. 5 RA-7 (Risk Response)
- NIST SP 800-53 Rev. 5 SA-8(33) (Security and Privacy Engineering Principles | Minimization)
- NIST SP 800-53 Rev. 5 SI-2 (Flaw Remediation)
- NIST SP 800-53 Rev. 5 SI-12(1) (Information Management and Retention | Limit Personally Identifiable Information Elements)
  - D1 pilot controls: Verified, 28 Oct 2026. Comma forms and "and" compounds replaced with one citation per part, 29 Oct 2026; enhancement titles now carry the parent control.
  - PE-3 alone carries cc_d1_016 from 30 Oct 2026: its discussion covers entry and exit points and says physical access control systems comply with applicable laws and regulations. ISO/IEC 27002:2022 Control 7.1 was dropped there because its fire-door guidance could not be checked against the 2022 text.
- NIST SP 800-53 Rev. 5 Appendix A Glossary (compensating controls)
  - Verified, 30 Oct 2026, in Appendix A Glossary of the Rev. 5 PDF (nvlpubs.nist.gov): controls employed in lieu of the baseline controls that give equivalent or comparable protection. The entry carries no source tag. Fits cc_d1_015 (compensating controls in place of a required badge reader). Used in cc_d1_015.
- NIST SP 800-53 Rev. 5 AT-2(3) (Literacy Training and Awareness | Social Engineering and Mining)
- NIST SP 800-53 Rev. 5 AT-3 (Role-based Training)
- NIST SP 800-53 Rev. 5 CA-7 (Continuous Monitoring)
- NIST SP 800-53 Rev. 5 CP-4 (Contingency Plan Testing)
- NIST SP 800-53 Rev. 5 CP-7 (Alternate Processing Site)
- NIST SP 800-53 Rev. 5 CP-9(1) (System Backup | Testing for Reliability and Integrity)
  - D2 pilot (cc_d2_003, 008–014). Verified 29 Oct 2026 against the Rev. 5 PDF on nvlpubs.nist.gov (control and enhancement titles). cc_d2_003 also uses the CM-3 entry in the D5 block below.
- NIST SP 800-53 Rev. 5 CA-8 (Penetration Testing)
- NIST SP 800-53 Rev. 5 CA-8(2) (Penetration Testing | Red Team Exercises)
- NIST SP 800-53 Rev. 5 CM-2 (Baseline Configuration)
- NIST SP 800-53 Rev. 5 CM-3 (Configuration Change Control)
- NIST SP 800-53 Rev. 5 RA-5 (Vulnerability Monitoring and Scanning)
- NIST SP 800-53 Rev. 5 SA-11(1) (Developer Testing and Evaluation | Static Code Analysis)
- NIST SP 800-53 Rev. 5 SA-11(8) (Developer Testing and Evaluation | Dynamic Code Analysis)
- NIST SP 800-53 Rev. 5 SA-22 (Unsupported System Components)
  - D5 pilot. Verified 29 Oct 2026: titles matched against the Rev. 5 PDF text. CM-3 is also used by cc_d1_013 and cc_d2_003.

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
- NIST SP 800-12 Rev. 1 Section 1.4 (Important Terminology: confidentiality, integrity, availability)
- NIST SP 800-12 Rev. 1 Section 3.4 (Information Owner/Steward)
- NIST SP 800-12 Rev. 1 Section 5.1 (Standards, Guidelines, and Procedures)
- NIST SP 800-12 Rev. 1 Section 9.1.3 (Electronic Signatures)
  - Jun 2017. Verified, 30 Oct 2026, against the PDF table of contents and text (nvlpubs.nist.gov). 1.4 defines confidentiality, integrity and availability (availability: timely and reliable access), used in cc_d1_001. 3.4: the information owner has authority over the information and sets the rules for its use and protection, used in cc_d5_004. 5.1: standards are normally compulsory and specify uniform use of technologies or parameters, used in cc_d1_009. 9.1.3 (with 9.1.3.2): a digital signature applies the signer's private key, used in cc_d1_002.
- NIST SP 800-30 Rev. 1 Section 2.3.1 (Risk Models: threats, vulnerabilities, likelihood and impact)
- NIST SP 800-30 Rev. 1 Section 2.3.2 (Assessment Approaches: quantitative assessments support cost-benefit analysis of risk responses)
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
- NIST CSF 2.0 Section 1 (CSF Overview)
- NIST CSF 2.0 GV.OC-03 (legal, regulatory and contractual requirements, including privacy obligations, are understood and managed)
- NIST CSF 2.0 GV.PO-01 (cybersecurity policy is established, communicated and enforced)
- NIST CSF 2.0 ID.RA-01 (vulnerabilities in assets are identified, validated and recorded)
- NIST CSF 2.0 ID.RA-03 (internal and external threats to the organization are identified and recorded)
- NIST CSF 2.0 ID.RA-06 (risk responses are chosen, prioritized, planned, tracked and communicated)
- NIST CSF 2.0 ID.RA-07 (changes and exceptions are managed, assessed for risk impact, recorded and tracked)
  - All Verified, 28 Oct 2026. "CSF 2.0" and "CSWP 29" are the same document; cite it as `NIST CSF 2.0`. Compounds split and paraphrases added 29 Oct 2026.
- NIST CSF 2.0 GV.RR-01 (organizational leadership is responsible and accountable for cybersecurity risk and fosters a culture that is risk-aware, ethical and continually improving)
- NIST CSF 2.0 GV.RR-02 (roles, responsibilities and authorities related to cybersecurity risk management are established, communicated, understood and enforced)
- NIST CSF 2.0 GV.RM-02 (risk appetite and risk tolerance statements are established, communicated and maintained)
- NIST CSF 2.0 GV.OV-03 (organizational cybersecurity risk management performance is evaluated and reviewed for adjustments needed)
- NIST CSF 2.0 PR.AT-02 (individuals in specialized roles are provided with awareness and training to perform relevant tasks with cybersecurity risks in mind)
- NIST CSF 2.0 PR.DS-11 (backups of data are created, protected, maintained and tested)
  - D2 pilot. Verified 29 Oct 2026 against the CSWP 29 PDF. GV.RM-02 is also used by cc_d1_006 (the bare form was removed 29 Oct 2026).
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
- ISO/IEC 27001:2022 Clause 6.1.3 f) (risk owners approve the risk treatment plan and accept residual risk)
  - Verified, 28 Oct 2026. Clause 6.1.3 f) is unchanged from the 2013 edition.

### ISO/IEC 27002:2022
- ISO/IEC 27002:2022 Control 5.3 (Segregation of duties)
- ISO/IEC 27002:2022 Control 5.15 (Access control)
- ISO/IEC 27002:2022 Control 5.16 (Identity management)
- ISO/IEC 27002:2022 Control 5.17 (Authentication information)
- ISO/IEC 27002:2022 Control 5.18 (Access rights)
- ISO/IEC 27002:2022 Control 8.2 (Privileged access rights)
- ISO/IEC 27002:2022 Control 5.1 (Policies for information security)
- ISO/IEC 27002:2022 Control 5.10 (Acceptable use of information and other associated assets)
- ISO/IEC 27002:2022 Control 5.34 (Privacy and protection of PII)
- ISO/IEC 27002:2022 Control 8.8 (Management of technical vulnerabilities)
  - Verified (title), 28 Oct 2026. iso.org could not be reached; the titles were confirmed from the published 2022 control list. 5.10 is used in cc_d1_019 and cc_d2_004.
- ISO/IEC 27002:2022 Control 5.31 (Legal, statutory, regulatory and contractual requirements)
  - Verified (title), 29 Oct 2026, on the same basis as the entries above (upgraded from Likely by audit pilot 2). Used in cc_d2_001 and 005.
- ISO/IEC 27002:2022 Control 5.12 (Classification of information)
- ISO/IEC 27002:2022 Control 5.25 (Assessment and decision on information security events)
- ISO/IEC 27002:2022 Control 5.26 (Response to information security incidents)
- ISO/IEC 27002:2022 Control 5.28 (Collection of evidence)
- ISO/IEC 27002:2022 Control 6.8 (Information security event reporting)
- ISO/IEC 27002:2022 Control 7.14 (Secure disposal or re-use of equipment)
- ISO/IEC 27002:2022 Control 8.12 (Data leakage prevention)
- ISO/IEC 27002:2022 Control 8.24 (Use of cryptography)
- ISO/IEC 27002:2022 Control 8.32 (Change management)
  - D5 pilot. Verified (title), 29 Oct 2026: titles from the published 2022 control list, the same basis as the D1/D3 entries; iso.org was not opened. 8.32 is also used by cc_d1_013.

## Center for Internet Security (CIS)

### CIS Critical Security Controls v8.1 (Jun 2024)
- CIS Controls v8.1 (Implementation Groups)
- CIS Controls v8.1 Safeguard 6.1 (Establish an Access Granting Process)
- CIS Controls v8.1 Safeguard 6.2 (Establish an Access Revoking Process)
- CIS Controls v8.1 Safeguard 6.5 (Require MFA for Administrative Access)
- CIS Controls v8.1 Safeguard 6.7 (Centralize Access Control)
- CIS Controls v8.1 Safeguard 6.8 (Define and Maintain Role-Based Access Control)
  - Verified, 28 Oct 2026. The titles are unchanged from v8. v8.1 uses "Implementation Groups" and "essential cyber hygiene", not "basic set".
- CIS Controls v8.1 Safeguard 5.4 (Restrict Administrator Privileges to Dedicated Administrator Accounts)
  - Verified (title), 30 Oct 2026, against the v8.1 safeguard list published by MITRE SAF (github.com/mitre/cis-cci-mappings, mappings/cis-cci-mapping-v8.1.json); cisecurity.org was blocked by the session proxy. The title itself fits cc_d3_014 (separate accounts for admin work). Used in cc_d3_014.
  - Safeguard 3.7 (title verified on the same list) was dropped from cc_d5_004 on 30 Oct 2026: it sets up a classification scheme but does not say who classifies. NIST SP 800-12 Rev. 1 Section 3.4 replaces it.

## OWASP

- OWASP Top 10 for LLM Applications 2025 LLM06 (Excessive Agency)
  - Verified, 28 Oct 2026.
- OWASP Non-Human Identities Top 10 (2025) NHI2 (Secret Leakage)
  - Verified, 30 Oct 2026, against the project's own page source (github.com/OWASP/www-project-non-human-identities-top-10, index.md): "NHI2:2025 - Secret Leakage", which names secrets "sent over public chat applications". Fits cc_d3_010. owasp.github.io was blocked by the session proxy.

## FIRST

- FIRST Common Vulnerability Scoring System (CVSS) v4.0 Specification Document Section 1 (Introduction)
  - Verified 29 Oct 2026 at first.org/cvss/v4.0/specification-document: the Base Score reflects a flaw's intrinsic severity; Threat metrics adjust for factors such as active exploitation; consumers enrich scores as input to their own risk assessment. Used in cc_d5_016.

## MITRE

- MITRE ATT&CK knowledge base (Enterprise matrix: tactics and techniques)
  - Verified, 30 Oct 2026, against MITRE's STIX data for Enterprise ATT&CK v20.0 (github.com/mitre-attack/attack-stix-data); attack.mitre.org was blocked by the session proxy. Each tactic is written as the adversary's goal ("The adversary is trying to get into your network" for Initial Access, TA0001), and Phishing (T1566) is a technique under it, which fits cc_d5_008. Used in cc_d5_008.

## Code of Ethics

- ISC2 Code of Ethics, Preamble and Canons
- ISC2 Code of Ethics, Canons
- ISC2 Code of Ethics, Canons (service to principals)
  - Verified at isc2.org/ethics, 28 Oct 2026. These go in `framework_ref` only, never in stems, options, explanations or tips. Open question: if the app shows `framework_ref` to learners, add the ® at first mention.
