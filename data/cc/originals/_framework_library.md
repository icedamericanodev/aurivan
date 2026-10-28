# CC Framework Citation Library

**Purpose:** the canonical `framework_ref` strings for the CC question bank
(`data/cc/originals/d{N}.json`). Started 28 Oct 2026 from the D1 and D3 pilot
batches (`cc_d1_001`–`020`, `cc_d3_001`–`020`).

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

### Cybersecurity Framework (CSF) 2.0, NIST CSWP 29 (Feb 2024)
- NIST CSWP 29, The NIST Cybersecurity Framework (CSF) 2.0, Section 1 (CSF Overview)
- NIST CSF 2.0 GV.OC-03 (legal, regulatory and contractual requirements, including privacy obligations, are understood and managed)
- NIST CSF 2.0 GV.PO-01 (cybersecurity policy is established, communicated and enforced) and ID.RA-07 (changes and exceptions are managed, assessed for risk impact, recorded and tracked)
- NIST CSF 2.0 GV.RM-02
- NIST CSF 2.0 ID.RA-01 and ID.RA-03
- NIST CSF 2.0 ID.RA-06
- NIST CSF 2.0 ID.RA-07
  - All Verified, 28 Oct 2026. "CSF 2.0" and "CSWP 29" are the same document.

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
- ISO/IEC 27002:2022, Control 7.1 (Physical security perimeters)
  - Title Verified; the fit is Likely (28 Oct 2026). Cited for the guidance that perimeter fire doors fail safe under local fire codes.

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

## OWASP

- OWASP Top 10 for LLM Applications 2025, LLM06 (Excessive Agency)
  - Verified, 28 Oct 2026.
- OWASP Non-Human Identities Top 10 (2025) NHI2 (Secret Leakage)
  - Likely, 28 Oct 2026. owasp.github.io was blocked during authoring.

## Code of Ethics

- ISC2 Code of Ethics, Preamble and Canons
- ISC2 Code of Ethics, Canons
- ISC2 Code of Ethics, Canons (service to principals)
  - Verified at isc2.org/ethics, 28 Oct 2026. These go in `framework_ref` only, never in stems, options, explanations or tips. Open question: if the app shows `framework_ref` to learners, add the ® at first mention.
