# CRISC Framework Citation Library

**Purpose:** the canonical `framework_ref` strings for the CRISC question bank
(`data/crisc/originals/d{N}.json`). Started 30 Oct 2026 with the pilot batches
(`crisc_d1_001`–`020` … `crisc_d4_001`–`020`).

**Format** (same as `data/cc/originals/_framework_library.md`):
- Each canonical citation is a bullet at the start of a line (`- `). Split a
  `framework_ref` on `;` and match each part exactly.
- Indented sub-bullets record the status and are ignored by the parser.
- Add a new citation here in the same change that first uses it.

**Status key:**
- **Verified:** the section, control or definition was checked against the
  source (opened on isaca.org, csrc.nist.gov or nvlpubs.nist.gov).
  **Verified (title):** the publication or objective title was confirmed on
  the publisher's site; the fit to the item is judged separately (used for
  paid ISACA publications whose full text can't be opened).
- **Likely:** the edition is current and the title matches, but the source was
  not opened. Check it before release.

**One form everywhere.** `<publisher> <document> <edition> <locator> (<title or
short paraphrase>)`, with no comma anywhere before the parenthesis. One
citation per `;`-separated part. COBIT objectives are written
`COBIT 2019 APO12 (Managed Risk)`. NIST forms follow the CC library.

**Not citable yet** (hosts blocked in the cloud environment, so not opened):
ISO 31000:2018, ISO/IEC 27005:2022, ISO/IEC 27001:2022, COSO ERM (2017), the
IIA Three Lines Model (2020), EU GDPR and the EU AI Act. Name them in notes
as context only.

---

## Domain 1 Governance (pilot crisc_d1_001 to 020, 30 Oct 2026)


Each bullet was opened on 30 Oct 2026 unless marked Likely.

### ISACA Glossary (https://www.isaca.org/resources/glossary)
- ISACA Glossary (risk appetite)
- ISACA Glossary (risk tolerance)
- ISACA Glossary (risk owner)
- ISACA Glossary (risk culture)
- ISACA Glossary (IT risk profile)
- ISACA Glossary (policy)
- ISACA Glossary (control owner)
  - Verified, 31 Oct 2026 (control owner, used by crisc_d1_003 from the D1 quality pass): glossary page re-opened with curl. The entry defines the control owner as the person assigned the authority and accountability for control-related decisions, responsible for ensuring the control is implemented and operating effectively and efficiently. KaiSip teaches that the control owner answers for the control working (often the manager whose team runs it), not "whoever runs it".
  - All Verified, 30 Oct 2026: glossary page opened with curl and each entry read. Wording used in items is our own paraphrase. Note the glossary has no plain "risk profile" entry; the entry is "IT risk profile" (a description of the overall identified IT risk to which the enterprise is exposed). Fit note for crisc_d1_008: the Glossary's "policy" entry defines a policy as a document that communicates required and prohibited activities and behaviors; it does not itself mention management intent or senior management approval, so that part of the item rests on NIST CSF 2.0 GV.PO-01, which is cited alongside it.

### ISACA Code of Professional Ethics (https://www.isaca.org/code-of-professional-ethics)
- ISACA Code of Professional Ethics (objectivity, due diligence and professional care)
- ISACA Code of Professional Ethics (inform appropriate parties of all significant facts)
  - Verified, 30 Oct 2026: page opened; the seven standards read. The first bullet maps to standard 2 ("objectivity, due diligence and professional care"), the second to standard 6 (disclose all significant facts that, if not disclosed, may distort reporting).

### COBIT 2019 objectives
- COBIT 2019 EDM01 (Ensured Governance Framework Setting and Maintenance)
- COBIT 2019 EDM03 (Ensured Risk Optimization)
- COBIT 2019 APO02 (Managed Strategy)
- COBIT 2019 APO12 (Managed Risk)
- COBIT 2019 BAI09 (Managed Assets)
- COBIT 2019 DSS04 (Managed Continuity)
- COBIT 2019 MEA03 (Managed Compliance With External Requirements)
  - Verified (title), 30 Oct 2026: objective codes and titles read from Figure 2 (COBIT Core Model) of ISACA's white paper "Leveraging COBIT for Effective AI System Governance" (2025), https://www.isaca.org/-/media/files/isacadp/project/isaca/resources/white-papers/leveraging_cobit_for_effective_ai_system_governance_and_management__0125.pdf, and cross-checked for EDM03, APO12 and DSS04 in the ISACA Industry News article "Evaluating Business Service Continuity and Availability Using COBIT 2019" (2020). The full COBIT 2019 Governance and Management Objectives text was not opened, so fit to each item is judged from the objective's title and the white paper's summary (EDM01: governance framework that clarifies roles and accountability; EDM03: identify, assess and manage risk; BAI09: assets).

### ISACA Risk IT
- ISACA Risk IT Framework 2nd Edition (2020)
  - Verified (title), 30 Oct 2026: ISACA press release "ISACA's Risk IT Framework Offers a Structured Methodology" (2020), https://www.isaca.org/about-us/newsroom/press-releases/2020/isacas-risk-it-framework-offers-a-structured-methodology, names Risk IT Framework, 2nd Edition and Risk IT Practitioner Guide, 2nd Edition. Paid publication; the full text was not opened. Cited only at the title level, for the general principle that IT risk is business risk managed inside ERM.

### ISACA Journal
- ISACA Journal 2018 Volume 4 (Roles of Three Lines of Defense for Information Security and Governance)
  - Verified, 30 Oct 2026: article opened at https://www.isaca.org/resources/isaca-journal/issues/2018/volume-4/roles-of-three-lines-of-defense-for-information-security-and-governance. It says the first line owns and manages risk, the second line (for example IT risk, IT compliance) oversees risk, monitors and can challenge first-line controls, and the third line is internal audit, which gives independent assurance. Used for 1B2 because the IIA Three Lines Model (2020) itself cannot be opened (theiia.org blocked).

### NIST CSF 2.0 (NIST CSWP 29, 26 Feb 2024)
- NIST CSF 2.0 GV.OC-01 (the organizational mission is understood and informs cybersecurity risk management)
- NIST CSF 2.0 GV.OC-03 (legal, regulatory and contractual requirements, including privacy obligations, are understood and managed)
- NIST CSF 2.0 GV.RM-02 (risk appetite and risk tolerance statements are established, communicated and maintained)
- NIST CSF 2.0 GV.RM-06 (a standardized method for calculating, documenting, categorizing and prioritizing cybersecurity risks is established and communicated)
- NIST CSF 2.0 GV.RR-02 (roles, responsibilities and authorities related to cybersecurity risk management are established, communicated, understood and enforced)
- NIST CSF 2.0 GV.PO-01 (policy for managing cybersecurity risks is established based on organizational context, cybersecurity strategy and priorities and is communicated and enforced)
- NIST CSF 2.0 GV.PO-02 (policy for managing cybersecurity risks is reviewed, updated, communicated and enforced to reflect changes)
  - All Verified, 30 Oct 2026, against the CSWP 29 PDF (https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf), pages 16 to 18. GV.OC-03, GV.RM-02 and GV.RR-02 use the same strings as the CC library. GV.PO-02 paraphrase is shortened ("to reflect changes in requirements, threats, technology and organizational mission").

### NIST IR 8286 Rev. 1 (December 2025)
- NIST IR 8286 Rev. 1 Section 2.1 (Overview of ERM: risk appetite and risk tolerance)
- NIST IR 8286 Rev. 1 Section 3.8 (Creating and Maintaining an Enterprise-Level Cybersecurity Risk Register)
- NIST IR 8286 Rev. 1 Section 4.1 (Applying the Enterprise Risk Register and Developing the Enterprise Risk Profile)
  - All Verified, 30 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286r1.pdf (landing page https://csrc.nist.gov/pubs/ir/8286/r1/final). IMPORTANT for every CRISC author: NIST IR 8286 (Oct 2020) was WITHDRAWN on 18 Dec 2025 and superseded in its entirety by IR 8286r1; the old PDF carries a withdrawal notice. Cite it as `NIST IR 8286 Rev. 1` (the form NIST uses on its CSRC page and the D2 library uses), never the withdrawn `NIST IR 8286`. Section 2.1 says risk appetite is established by the most senior leadership and that tolerance is narrower (its email example); Section 3.8 lists aggregate, normalize, analyze, prioritize and optimize for registers rolled up to the enterprise; Section 4.1 says the enterprise risk profile is a prioritized subset of the enterprise risk register.

### NIST SP 800-39 (March 2011)
- NIST SP 800-39 Section 2.7 (Organizational Culture)
  - Verified, 30 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-39.pdf. Section 2.7 says culture informs the risk management strategy and a strategy inconsistent with culture is hard to implement. Still the current edition on CSRC (no withdrawal notice).

### NIST SP 800-34 Rev. 1
- NIST SP 800-34 Rev. 1 Section 3.5 (Plan Testing, Training, and Exercises)
  - Verified, 30 Oct 2026, against the SP 800-34 Rev. 1 PDF (CSRC page https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final). 2.2.1: the BCP sustains mission/business processes; 2.2.6: the DRP is information system-focused. 3.5: test, training and exercise events periodically and after changes; tests as close to the operating environment as possible. The Section 2.2 string (same as the CC library) is a bullet in the Round 2 additions below.

### NIST AI 100-1 (AI RMF 1.0, January 2023)
- NIST AI 100-1 (AI RMF 1.0) GOVERN 1.6 (mechanisms are in place to inventory AI systems)
- NIST AI 100-1 (AI RMF 1.0) GOVERN 2.1 (roles, responsibilities and lines of communication for AI risks are documented and clear)
  - All Verified, 30 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf, Table 1 (GOVERN subcategories), pages 22 to 23. GOVERN 1.6 uses the same string as the CC library.

### Round 2 additions (crisc_d1_021 to 045, 31 Oct 2026)
- ISACA Glossary (risk capacity)
- ISACA Glossary (enterprise risk management)
- ISACA Glossary (business continuity plan)
- ISACA Glossary (asset value)
  - All Verified, 31 Oct 2026: https://www.isaca.org/resources/glossary re-opened with curl and each entry read. Risk capacity: the objective magnitude or amount of loss an enterprise can tolerate without risking its continued existence (crisc_d1_041). Enterprise risk management: assesses, controls, exploits, finances and monitors risk from all sources to increase short- and long-term value to stakeholders (crisc_d1_039, upside of unused appetite). Business continuity plan: a plan to respond to the disruption of critical business processes, depending on the contingency plan for restoring critical systems (crisc_d1_027, crisc_d1_029). Asset value: the value of an asset to both the business and to competitors (crisc_d1_030, value by business impact rather than cost).
- NIST CSF 2.0 ID.AM-05 (assets are prioritized based on classification, criticality, resources and impact on the mission)
- NIST CSF 2.0 GV.SC-05 (requirements to address cybersecurity risks in supply chains are established, prioritized and integrated into contracts and other types of agreements with suppliers and other relevant third parties)
  - Both Verified, 31 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf (re-downloaded; GV.SC-05 and ID.AM-05 read in Appendix A). GV.SC-05 supports crisc_d1_043 (supplier SLA terms must meet the business recovery need) and, since the round 2 gate (31 Oct 2026), crisc_d4_037 (exit terms and data return with a young vendor); ID.AM-05 supports crisc_d1_030 and crisc_d1_031 (classification and impact drive asset priority).
- NIST SP 800-34 Rev. 1 Section 2.2 (Types of Plans: Business Continuity Plan and Disaster Recovery Plan)
  - Verified, 31 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-34r1.pdf. 2.2.1: the BCP sustains mission/business processes and its expectations are matched with information system capabilities; 2.2.6: the DRP is information system-focused and may support a BCP. Used by crisc_d1_027 and, since the round 2 gate (31 Oct 2026), crisc_d1_028 (the continuity plan updated after warehousing was outsourced; with COBIT 2019 DSS04).
- NIST AI 100-1 (AI RMF 1.0) GOVERN 2.3 (executive leadership takes responsibility for decisions about risks of AI system development and deployment)
  - Verified, 31 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf, Table 1 (GOVERN subcategories). Used by crisc_d1_038 (senior management sees AI exposure in the risk profile to decide on it).
  - Note: other round 2 parts reuse bullets already in this library: ISACA Glossary (recovery time objective), (current risk) and (risk owner); NIST CSF 2.0 GV.RM-03, GV.RR-01, ID.RA-07 and Section 3.1; NIST AI 100-1 GOVERN 1.1 and MANAGE 3.1; NIST IR 8286B-upd1 Section 2.4.3 (CSRC page re-opened 31 Oct 2026: published February 2025, no withdrawal notice).

### Round 3 additions (crisc_d1_046 to 070, 4 Nov 2026)
- ISACA Glossary (procedure)
  - Verified, 4 Nov 2026: https://www.isaca.org/resources/glossary opened with curl and the entry read. A procedure is a document describing the steps to perform specific operations in conformance with applicable standards. Used by crisc_d1_050 (a team's procedure cannot relax the standard it carries out). Note the Glossary's "standard" entry means an external standards body's specification, so it is not cited for an internal standard.
- NIST AI 100-1 (AI RMF 1.0) GOVERN 1.3 (processes, procedures and practices are in place to determine the needed level of risk management activities based on the organization's risk tolerance)
- NIST AI 100-1 (AI RMF 1.0) MAP 1.3 (the organization's mission and relevant goals for AI technology are understood and documented)
  - Both Verified, 4 Nov 2026, against https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf (re-downloaded): GOVERN 1.3 in Table 1 (GOVERN subcategories), MAP 1.3 in Table 2 (MAP subcategories), wording paraphrased. GOVERN 1.3 supports crisc_d1_054 (appetite turned into tiers of AI use that set how much review each use needs); MAP 1.3 supports crisc_d1_066 (an AI pilot is judged first by the goal it serves).
- NIST CSF 2.0 GV.OV-02 (the cybersecurity risk management strategy is reviewed and adjusted to ensure coverage of organizational requirements and risks)
  - Verified, 4 Nov 2026, against https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf (re-downloaded; GV.OV-02 read in the Oversight category). Used by crisc_d1_061 (framework reviewed after cloud adoption and two acquisitions).
- ISACA Code of Professional Ethics (privacy and confidentiality of information obtained in the course of their activities)
  - Verified, 4 Nov 2026: https://www.isaca.org/code-of-professional-ethics opened with curl; standard 4 says members maintain the privacy and confidentiality of information obtained in the course of their activities unless disclosure is required by legal authority, and do not release it to inappropriate parties. Used by crisc_d1_062 (peer benchmark request for a bank's loss figures).
  - Note: other round 3 parts reuse bullets already in this library: ISACA Glossary (data owner), (risk aggregation), (risk culture), (IT risk profile), (policy), (risk owner) and (risk appetite); NIST CSF 2.0 ID.AM-02, ID.AM-07, GV.RR-01 and GV.RR-02; NIST IR 8286C Rev. 1 Section 5.1; NIST SP 800-30 Rev. 1 Section 3.2 Task 2-6.
  - Review fixes 4 Nov 2026 (standards audit and concept review): crisc_d1_061 now cites COBIT 2019 EDM03 (Ensured Risk Optimization) in place of EDM01, which covers the governance system rather than the risk management framework; crisc_d1_063 now cites ISACA Glossary (current risk) (current risk counts actions already taken, so an approved fix not yet in place does not lower it) in place of NIST CSF 2.0 ID.IM-02, which no D1 item now cites. crisc_d1_070 keeps ISACA Glossary (risk transfer); the entry says risk can be assigned to another enterprise by insurance or outsourcing, also known as risk sharing, so the item says outsourcing can transfer or share part of the risk but not the accountability. All existing bullets; no new citation added.
  - Cross-domain fixes 4 Nov 2026: crisc_d1_058 was re-angled from 'IT named as owner' to over-classification (owners put 38 of 40 shares at the top level) and now cites NIST CSF 2.0 ID.AM-05 (Round 2 block above: assets are prioritized based on classification) with ISACA Glossary (data owner), no longer COBIT 2019 BAI09, which crisc_d1_031 still cites. crisc_d1_063 was re-angled from rating the gap to a tested interim workaround in the continuity plan and now cites NIST SP 800-34 Rev. 1 Section 3.5 with Section 2.2 (Round 2 block above: the BCP sustains mission and business processes), no longer ISACA Glossary (current risk). Existing bullets; no new citation added.

### Round 4 additions (crisc_d1_071 to 095, 4 Nov 2026)
- ISACA Glossary (guideline)
- ISACA Glossary (data custodian)
  - Both Verified, 4 Nov 2026: https://www.isaca.org/resources/glossary opened with curl and each entry read. A guideline describes a particular way of doing something and is less prescriptive than a procedure (crisc_d1_074: a control the risk needs is moved from an advisory guideline into a mandatory standard). A data custodian is the individual or department responsible for storing and safeguarding computerized data (crisc_d1_076: IT, as custodian, decides how to meet the owner's requirements, such as backup timing, but not the class, retention or sharing).
- COBIT 2019 APO05 (Managed Portfolio)
- COBIT 2019 MEA04 (Managed Assurance)
  - Both Verified (title), 4 Nov 2026: objective codes and titles read from Figure 2 (COBIT Core Model) of the ISACA white paper "Leveraging COBIT for Effective AI System Governance" (2025), re-downloaded from the URL given in the COBIT 2019 objectives block above. Full COBIT 2019 text not opened; fit judged from the titles. APO05 supports crisc_d1_077 (risk input built into investment approvals); MEA04 supports crisc_d1_078 (internal audit gives the board independent assurance over the risk management process).
- NIST CSF 2.0 Section 1 (CSF Overview: the CSF is used in conjunction with other resources such as frameworks, standards and guidelines to manage cybersecurity risks)
  - Verified, 4 Nov 2026, against https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf (re-downloaded). Section 1 says the CSF should be used in conjunction with other resources (frameworks, standards, guidelines, leading practices) to manage cybersecurity risks and inform enterprise-level ICT risk management; Section 4 describes Informative References that map the Core to other standards. Used by crisc_d1_092 (COBIT 2019 and CSF 2.0 combined, not chosen between).
  - Note: other round 4 parts reuse bullets already in this library: ISACA Glossary (risk appetite), (risk capacity), (risk aggregation), (risk owner), (risk culture), (risk transfer), (data owner), (business continuity plan) and (service delivery objective); ISACA Code of Professional Ethics (both D1 bullets); COBIT 2019 APO02, APO12.03 and MEA03; ISACA Journal 2018 Volume 4; NIST CSF 2.0 GV.OC-01, GV.OC-03, GV.PO-01, GV.PO-02, GV.RM-02, GV.RM-03, GV.RR-01, GV.RR-02, GV.SC-05, GV.SC-07 and ID.AM-07; NIST IR 8286 Rev. 1 Sections 3.8 and 4.1; NIST IR 8286B-upd1 Section 2.4.3; NIST IR 8286C Rev. 1 Section 2.2; NIST SP 800-30 Rev. 1 Section 3.4; NIST SP 800-34 Rev. 1 Section 2.2; NIST AI 100-1 GOVERN 2.1 and GOVERN 2.3.
  - Review fixes 4 Nov 2026 (standards audit and concept review): crisc_d1_081 now also cites ISACA Glossary (residual risk), an existing bullet in the Domain 2 section (Verified: the risk that remains after management has implemented a risk response). The ISACA Glossary has no "retained risk" entry, so the item now records the loss a supplier's liability cap leaves as residual risk for its owner. Existing bullet; no new citation added.

### Named in notes as context only (not keyed, hosts blocked)
ISO 31000:2018, COSO ERM (2017), the IIA Three Lines Model (2020) and the EU AI Act (Regulation (EU) 2024/1689) are named in the notes as context only. Not added as bullets.

### Opened and checked, not yet used by an item (add as bullets when a later D1 batch cites them)
  - `ISACA Glossary (risk response)`, `ISACA Glossary (maximum tolerable outage)`, `ISACA Glossary (acceptable interruption window)`: opened 31 Oct 2026 for the D1 notes (the risk response entry calls the planned level "future residual risk"; MTO is the longest a critical business function or IT system can be disrupted before significant harm; AIW is the longest a system can be unavailable before business objectives are compromised). The Glossary has no MTD entry.
  - `ISACA Glossary (asset inventory)`
  - `NIST IR 8286 Rev. 1 Section 2.2 (The Gap Between CSRM Output and ERM Input)`
  - Pruned 4 Nov 2026 (round 4 review fixes): entries now cited by D1 items were removed from this list. ISACA Glossary (risk capacity), (risk aggregation), (current risk), (residual risk), (recovery time objective), (guideline), (business continuity plan) and (enterprise risk management); NIST CSF 2.0 GV.RM-03, GV.RR-01, ID.AM-02 and ID.AM-05; NIST SP 800-34 Rev. 1 Section 2.2; and NIST AI 100-1 GOVERN 1.1 and GOVERN 2.3 are each cited by at least one D1 item, under a bullet elsewhere in this library.

## Domain 2 Risk Assessment (pilot crisc_d2_001 to 020, 30 Oct 2026)


Prepared 30 Oct 2026 for the D2 pilot (`crisc_d2_001`–`020`). Every bullet was
checked against a local text copy of the source, fetched this session with
`curl -sS -L` from isaca.org, nvlpubs.nist.gov, csrc.nist.gov or first.org.
Merge under the matching publisher headings. Hosts tried and blocked:
genai.owasp.org (OWASP Top 10 for LLM Applications), doi.org. iso.org and
coso.org were not used (blocked per the blueprint), so ISO 31000 and
ISO/IEC 27005 appear in the notes as context only. Notes 2B1.1 gives ISO 31000's
"effect of uncertainty on objectives" wording, labeled in the note as context only;
it is not a keyed citation.

Note for the library owner: NIST IR 8286 (Oct 2020) and IR 8286A (Nov 2021)
are withdrawn and superseded by IR 8286 Rev. 1 and IR 8286A Rev. 1 (both
published 18 Dec 2025). Cite the Rev. 1 forms below in every CRISC domain.

---

### ISACA

### ISACA Glossary (interactive glossary, https://www.isaca.org/resources/glossary)
- ISACA Glossary (risk)
  - Verified, 30 Oct 2026, isaca.org/resources/glossary: "The combination of the likelihood of an event and its impact". Used in crisc_d2_011.
- ISACA Glossary (risk scenario)
  - Verified, 30 Oct 2026: "A tangible and assessable representation of risk"; scope note ties it to COBIT 2019 APO12. Used in crisc_d2_007.
- ISACA Glossary (vulnerability)
  - Verified, 30 Oct 2026: a weakness in the design, implementation, operation or internal control of a process that could expose the system to adverse threats from threat events. Used in crisc_d2_006.
- ISACA Glossary (business impact analysis)
  - Verified, 30 Oct 2026: evaluating the criticality and sensitivity of information assets by determining the impact of losing the support of any resource; establishes the escalation of loss over time and prioritizes recovery. Used in crisc_d2_011, crisc_d2_012.
- ISACA Glossary (risk owner)
  - Verified, 30 Oct 2026: the person invested with the authority and accountability for making risk-based decisions, who owns the loss of a realized risk scenario. Defined in notes 2B3.1; no longer keyed after the 30 Oct 2026 review (crisc_d2_014 was re-aimed to aggregation).
- ISACA Glossary (inherent risk)
  - Verified, 30 Oct 2026: the level of risk or exposure that does not account for the actions management has taken or might take (for example, implementing controls). Used in crisc_d2_018.
- ISACA Glossary (residual risk)
  - Verified, 30 Oct 2026: "The remaining risk after management has implemented a risk response". Used in crisc_d2_018, crisc_d2_019, crisc_d2_020.
- ISACA Glossary (current risk)
  - Verified, 30 Oct 2026: the risk state that exists now, taking into account actions already taken but not actions anticipated or proposed. Used in crisc_d2_013, crisc_d2_018.
- ISACA Glossary (prompt injection)
  - Verified, 30 Oct 2026: in large language models, a technique where an attacker manipulates the input to produce unintended or harmful outputs. Used in crisc_d2_004.
- ISACA Glossary (loss event)
  - Verified, 30 Oct 2026: "Any event during which a threat event results in loss" (scope note credits the FAIR taxonomy). Quoted in notes 2A1.1; not keyed in the pilot.
- ISACA Glossary (risk register)
  - Verified, 30 Oct 2026: "A list of risk scenarios that have been identified, analyzed and prioritized". Used in notes 2B3.1; not keyed in the pilot.
- ISACA Glossary (risk response)
  - Verified, 31 Oct 2026, isaca.org/resources/glossary opened and the entry read: "Any combination of risk avoidance, risk acceptance, risk sharing or transfer, or risk mitigation that leads to a situation in which as much future residual risk (i.e., current risk with the risk response defined and implemented) as possible (usually depending on budgets available) falls within risk appetite limits". Used in crisc_d2_018 (quality pass 31 Oct 2026: a projection for planned controls is future residual risk, which judges the plan; current risk is compared with appetite today) and notes 2B5.1.
- ISACA Glossary (maximum tolerable outage)
  - Verified, 31 Oct 2026, same page: "The maximum amount of time that an organization can tolerate the disruption of a critical business function or IT system before it causes significant harm to the business". The Glossary has no MTD entry. Defined in notes 2B2.2 (MTO, with MTD as other sources' term); not keyed.
- ISACA Glossary (acceptable interruption window)
  - Verified, 31 Oct 2026, same page: "The maximum period of time that a system can be unavailable before compromising the achievement of the enterprise's business objectives". Defined in notes 2B2.2; not keyed (a distractor in crisc_d2_037).
- ISACA Glossary (service delivery objective)
  - New, repair round 1. Verified, 31 Oct 2026, isaca.org/resources/glossary fetched with `curl -sS -L` and the entry read: "The level of services directly related to the business needs that must be reached during the alternate process mode until the normal situation is restored". Used in crisc_d2_037; defined in notes 2B2.2.
- ISACA Glossary (recovery point objective)
  - New, repair round 1. Verified, 31 Oct 2026, same page: "The earliest point in time that is acceptable to recover data, determined based on the acceptable data loss in case of a disruption in operations. The RPO effectively quantifies the permissible amount of data loss in case of interruption." Used in crisc_d2_034.
- ISACA Glossary (risk acceptance)
  - Re-listed from the Domain 3 round 2 block (Verified 31 Oct 2026: a decision to accept a risk, made according to the risk appetite and risk tolerance set by senior management). Used in crisc_d2_045.
- ISACA Glossary (control owner)
  - Verified, 31 Oct 2026, same page: the person assigned "the authority and accountability for making control-related decisions" and "responsible for ensuring that the control is implemented and is operating effectively and efficiently". Defined in notes 2B3.1 (since repair round 1, 31 Oct 2026, the key term carries the Glossary wording alone; KaiSip's "often the manager whose team runs the control" sits in how_it_works, unattributed); used in the explanations of crisc_d2_002, crisc_d2_019 and crisc_d2_020; not keyed in Domain 2.
- ISACA Glossary (impact analysis)
  - Verified, 31 Oct 2026, same page opened again: "A study to prioritize the criticality of information resources for the enterprise based on the costs (or consequences) of adverse events. In an impact analysis, threats to assets are identified and potential business losses are determined for different time periods." Not keyed. Because of this entry, crisc_d2_011 (repair round 1) no longer says a BIA never looks at threats; its key rests on likelihood, which neither this entry nor the BIA entry says is estimated.
- ISACA Glossary (key control indicator)
  - Verified, 31 Oct 2026, same page: "A measure of the effectiveness of controls to indicate a failure or weakness which may result in the increased likelihood or impact of risk events". Defined in notes 2B5.2 (repair round 1, replacing KPI-style "how well a control is performing" wording); not keyed in Domain 2.
- ISACA Glossary (walk-through)
  - New, round 3. Verified, 4 Nov 2026, isaca.org/resources/glossary fetched with `curl -sS -L` and the entry read: "A thorough demonstration or explanation that details each step of a process". Used in crisc_d2_052.
- ISACA Glossary (risk evaluation)
  - New, round 3. Verified, 4 Nov 2026, same page: "The process of comparing estimated risk against given risk criteria to determine the significance of the risk" (credited there to ISO/IEC Guide 73:2002). Used in crisc_d2_058; taught in notes 2B1.2.
- ISACA Glossary (design effectiveness)
  - New, round 3. Verified, 4 Nov 2026, same page: "In audit, refers to whether the control objectives is met by effectively preventing or detecting errors". Used in crisc_d2_063; taught in notes 2B5.2.
- ISACA Glossary (threat event)
  - New, round 3 review fixes. Verified, 4 Nov 2026, isaca.org/resources/glossary fetched with `curl -sS -L` and the entry read: "Any event during which a threat element/actor acts against an asset in a manner that has the potential to directly result in harm". Paired with ISACA Glossary (loss event) in crisc_d2_046 and crisc_d2_048: a near miss is a threat event that did not become a loss event.

### COBIT 2019
- COBIT 2019 APO12.01 (Collect Data)
  - Verified (title), 30 Oct 2026: ISACA Industry News article "Evaluating Business Service Continuity and Availability Using COBIT 2019" (2020) lists APO12 Managed risk with practices APO12.01 Collect data, APO12.02 Analyze risk, APO12.03 Maintain a risk profile, APO12.04 Articulate risk, APO12.05 Define a risk management action portfolio, APO12.06 Respond to risk. Practice title only; fit to loss-event and AI event data judged by the author. Used in crisc_d2_001, crisc_d2_002 and, since the cross-domain gate (4 Nov 2026), crisc_d2_047 alone (event records that name cause, impact and scenario); crisc_d2_047 no longer cites NIST CSF 2.0 GV.RM-06 (Domain 1 block), which stays with crisc_d1_051.
- COBIT 2019 APO12.02 (Analyze Risk)
  - Verified (title), 30 Oct 2026, same ISACA article. Fit to rating a scenario on evidence of control effectiveness judged by the author. Used in crisc_d2_019.
- COBIT 2019 APO12.03 (Maintain a Risk Profile)
  - Verified (title), 30 Oct 2026, same ISACA article. Used in crisc_d2_014.

### Risk IT Framework, 2nd Edition (ISACA, 2020)
- ISACA Risk IT Framework 2nd Edition (2020)
  - Verified (title), 30 Oct 2026: ISACA press release "ISACA's Risk IT Framework Offers a Structured Methodology for Enterprises to Manage Information and Technology Risk", dated 25 June 2020, names "Risk IT Framework, 2nd Edition and Risk IT Practitioner Guide, 2nd Edition". Paid publication; text not opened. Listed in the notes references only; not keyed in the pilot.

### NIST

### SP 800-30 Rev. 1, Guide for Conducting Risk Assessments (Sep 2012)
- NIST SP 800-30 Rev. 1 Section 2.3.1 (Risk Models: threats, vulnerabilities, likelihood and impact)
  - Same form as the CC library. Verified again 30 Oct 2026, nvlpubs PDF: risk is a function of adverse impact and likelihood; threat scenarios show how a threat source's events exploit vulnerabilities. Used in crisc_d2_005.
- NIST SP 800-30 Rev. 1 Section 2.3.1 (Risk Models: likelihood is assessed with respect to a specific time frame)
  - New, round 2. Verified, 31 Oct 2026, nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-30r1.pdf re-opened: under Likelihood, "the likelihood that a threat event will be initiated or will occur is assessed with respect to a specific time frame (e.g., the next six months, the next year, or the period until a specified milestone is reached)". Used in crisc_d2_032.
- NIST SP 800-30 Rev. 1 Section 2.3.1 (Risk Models: adversarial likelihood is based on intent, capability and targeting)
  - New, round 3. Verified, 4 Nov 2026, nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-30r1.pdf fetched and read: under Likelihood, "For adversarial threats, an assessment of likelihood of occurrence is typically based on: (i) adversary intent; (ii) adversary capability; and (iii) adversary targeting. For other than adversarial threat events, the likelihood of occurrence is estimated using historical evidence, empirical data, or other factors." Used in crisc_d2_056.
- NIST SP 800-30 Rev. 1 Section 2.3.1 (Risk Models: predisposing conditions such as a flood-prone location affect likelihood)
  - New, round 2. Verified, 31 Oct 2026, same PDF: a predisposing condition "affects (i.e., increases or decreases) the likelihood that threat events, once initiated, result in adverse impacts"; examples include "the location of a facility in a hurricane- or flood-prone region". Used in crisc_d2_028.
- NIST SP 800-30 Rev. 1 Section 2.3.2 (Assessment Approaches: quantitative assessments support cost-benefit analysis of risk responses)
  - Same form as the CC library. Verified again 30 Oct 2026. 800-30 does not use SLE, ARO or ALE. Used in crisc_d2_016.
- NIST SP 800-30 Rev. 1 Section 2.3.2 (Assessment Approaches: subjective inputs or high uncertainty lessen quantitative rigor)
  - New. Verified, 30 Oct 2026, nvlpubs PDF: "the rigor of quantification is significantly lessened when subjective determinations are buried within the quantitative assessments, or when significant uncertainty surrounds the determination of values". Used in crisc_d2_017.
- NIST SP 800-30 Rev. 1 Section 2.3.2 (Assessment Approaches: semi-quantitative bins and scales have meaning only within the assessment)
  - New, round 2. Verified, 31 Oct 2026, same PDF re-opened: semi-quantitative assessments use "bins, scales, or representative numbers whose values and meanings are not maintained in other contexts"; each bin or range "needs to be clearly defined and/or characterized by meaningful examples". Used in crisc_d2_042.
- NIST SP 800-30 Rev. 1 Section 2.3.3 (Analysis Approaches: threat-oriented, asset/impact-oriented and vulnerability-oriented)
  - New. Verified, 30 Oct 2026: differences in the starting point can bias results so some risks are not identified; adding a second orientation improves rigor. Fits an exercise that exposes a missed business dependency. Used in crisc_d2_008.
- NIST SP 800-30 Rev. 1 Section 3.1 (Preparing for the Risk Assessment: purpose, scope, assumptions, information sources and risk model)
  - New. Verified, 30 Oct 2026: Step 1 tasks 1-1 to 1-5 (purpose; scope; assumptions and constraints; sources of threat, vulnerability and impact information; risk model and analytic approach). Used in crisc_d2_009.
- NIST SP 800-30 Rev. 1 Section 3.1 Task 1-3 (Identify Assumptions and Constraints: uncertainty in assumptions and information is considered)
  - New, round 3. Verified, 4 Nov 2026, same PDF: Task 1-3 makes assumptions and constraints explicit; "organizations consider the uncertainty with regard to assumptions made or other information used in the risk assessment", and "assumptions based on a lack of specific or credible information may reduce an organization's risk tolerance". Used in crisc_d2_057.
- NIST SP 800-30 Rev. 1 Section 3.3 (Communicating and Sharing Risk Assessment Information)
  - New. Verified, 30 Oct 2026: Task 3-1 communicates results to organizational decision makers to support risk responses; Task 3-2 shares risk-related information. Used in crisc_d2_010.
- NIST SP 800-30 Rev. 1 Section 3.4 (Maintaining the Risk Assessment)
  - Same form as the CC library. Verified again 30 Oct 2026: keep risk knowledge current by monitoring risk factors and updating the assessment. Used in crisc_d2_001, crisc_d2_010.
- NIST SP 800-30 Rev. 1 Appendix D Table D-2 (Taxonomy of Threat Sources: adversarial, accidental, structural and environmental)
  - New. Verified, 30 Oct 2026: adversarial (outsider, insider, trusted insider, privileged insider, groups, organizations incl. supplier and partner, nation-state); accidental ("erroneous actions taken by individuals in the course of executing their everyday responsibilities", incl. privileged user/administrator); structural (IT equipment, environmental controls, software); environmental (natural or man-made disaster, infrastructure outage). Used in crisc_d2_003.

### SP 800-34 Rev. 1, Contingency Planning Guide for Federal Information Systems (May 2010, updated Nov 2010)
- NIST SP 800-34 Rev. 1 Section 3.2.1 (Determine Business Processes and Recovery Criticality: MTD, RTO and RPO)
  - Same form as the CC library. Verified again 30 Oct 2026, nvlpubs PDF: process owners, leadership and business managers determine acceptable downtime; MTD is what the system owner or authorizing official is willing to accept; the RTO must normally be shorter than the MTD; RPO reflects how much data loss the process can tolerate. Used in crisc_d2_012. NIST's MTD is the ISACA Glossary's maximum tolerable outage (MTO); since 31 Oct 2026 the D2 notes and crisc_d2_012's explanation use MTO, keeping MTD only in this NIST citation.
- NIST SP 800-34 Rev. 1 Section 3.5.3 (Exercises: tabletop exercises are discussion-based and examine roles, responsibilities, coordination and decision making)
  - New, round 2. Verified, 31 Oct 2026, nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-34r1.pdf re-opened: tabletop exercises are "discussion-based exercises"; a facilitator presents a scenario and asks questions "which initiates a discussion among the participants of roles, responsibilities, coordination, and decision making"; they do not deploy equipment or other resources. Used in crisc_d2_029, crisc_d2_030.

### IR 8286 Rev. 1, Integrating Cybersecurity and Enterprise Risk Management (ERM) (Dec 2025)
- NIST IR 8286 Rev. 1 Section 3 Table 1 (Descriptions of notional cybersecurity risk register template elements)
  - New. Verified, 30 Oct 2026, nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286r1.pdf (published 18 Dec 2025; supersedes IR 8286, Oct 2020): elements include risk description (threats, assets, methods and impacts in every scenario), current assessment likelihood, impact and exposure rating, risk response type and description, risk owner ("responsible and accountable"), status. The text before Table 1 explains current risk versus inherent risk. Note on terms: Table 1's "Current Assessment" columns mean the estimate before any (further) risk response, which later cycles call inherent; this differs from the ISACA Glossary's "current risk" (risk as it stands, counting actions already taken). crisc_d2_013 pairs the two because the text after Table 1 keeps the current assessment separate from anticipated changes from a planned response, which is the item's point. Used in crisc_d2_013.
- NIST IR 8286 Rev. 1 Section 3.5.2 (Responding to Residual Risk)
  - New. Verified, 30 Oct 2026: residual risk remains after a response; if beyond the acceptable level the risk owner evaluates further action; enterprise risk officers analyze residual risk against appetite and tolerance set by senior leadership, and senior management makes final decisions. Used in crisc_d2_018, crisc_d2_020, crisc_d2_045.
- NIST IR 8286 Rev. 1 Section 2.1 (Overview of ERM: risk appetite and risk tolerance)
  - Re-listed from the Domain 1 block (Verified 30 Oct 2026: risk appetite is set by the most senior leadership, and tolerance is narrower and more specific). Used in crisc_d2_041.
- NIST IR 8286 Rev. 1 Section 3.8 (Creating and Maintaining an Enterprise-Level Cybersecurity Risk Register)
  - New. Verified, 30 Oct 2026: registers with agreed criteria and categories are normalized and aggregated into the enterprise risk register and risk profile. Supports notes 2B3.3. Used in crisc_d2_014 (re-aimed to aggregation, 30 Oct 2026 review).

### IR 8286A Rev. 1, Identifying and Estimating Cybersecurity Risk for Enterprise Risk Management (Dec 2025)
- NIST IR 8286A Rev. 1 Section 2.2.3 (Vulnerability Identification)
  - New. Verified, 30 Oct 2026, nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286Ar1.pdf (supersedes IR 8286A, Nov 2021): threats and vulnerabilities "are not limited to the routine vulnerability management of software flaws, patching and network ports" but cover the broader range SP 800-53 controls address. Used in crisc_d2_006.
- NIST IR 8286A Rev. 1 Section 2.2.4 (Determining Potential Impact: single loss expectancy and annualized loss expectancy)
  - New. Verified, 30 Oct 2026: senior leaders may want impact as the loss per occurrence (SLE) or the total over an annual period (ALE); frequency matters. ARO is not named in the text; the items derive it from the stem. Used in crisc_d2_015, crisc_d2_016.
- NIST IR 8286A Rev. 1 Section 2.2.5 (Recording Identified Risks: risk scenarios in cause-and-effect form)
  - New. Verified, 30 Oct 2026: detailed scenarios in cause-and-effect form; balance top-down (objectives) and bottom-up (threats and vulnerabilities) considerations; keep a practical, manageable set of risks. Used in crisc_d2_007.
- NIST IR 8286A Rev. 1 Section 2.3.1 (Selecting Risk Analysis Methodologies)
  - New. Verified, 30 Oct 2026: quotes IEC 31010:2019 that the main criteria for choosing qualitative or quantitative techniques are the output most useful to stakeholders and the availability and reliability of data; quantitative techniques generally need high-quality data. Used in crisc_d2_017, crisc_d2_040, crisc_d2_041.
- NIST IR 8286A Rev. 1 Section 2.2.2 (Determination of Potential Threats)
  - New. Verified, 30 Oct 2026: threat enumeration combines data-driven threat awareness with business judgment; lists ISACs, technical threat models and MITRE ATT&CK as inputs. Supports notes 2A2.2; not keyed in the pilot. Used in crisc_d2_049 (attack tree result, reworked in the round 3 review fixes, 4 Nov 2026).

### CSF 2.0 (NIST CSWP 29, Feb 2024)
- NIST CSF 2.0 ID.RA-01 (vulnerabilities in assets are identified, validated and recorded)
  - New, round 3. Verified, 4 Nov 2026, nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf fetched and read: "ID.RA-01: Vulnerabilities in assets are identified, validated, and recorded". Used in crisc_d2_051 (with ID.AM-02 from the Domain 4 block).
- NIST CSF 2.0 ID.RA-02 (cyber threat intelligence is received from information sharing forums and sources)
  - New. Verified, 30 Oct 2026, nvlpubs NIST.CSWP.29.pdf. Used in crisc_d2_004.
- NIST CSF 2.0 ID.RA-05 (threats, vulnerabilities, likelihoods and impacts are used to understand inherent risk and inform risk response prioritization)
  - New. Verified, 30 Oct 2026. Dropped from crisc_d2_018 in the 30 Oct 2026 review (it concerns inherent risk, while 018 keys residual risk against appetite; replaced there by IR 8286 Rev. 1 Section 3.5.2). Keyed again from 31 Oct 2026 by crisc_d4_016, where inherent risk inputs fit (see the Domain 4 CSF note).
- NIST CSF 2.0 ID.IM-02 (improvements are identified from security tests and exercises, including those done in coordination with suppliers and relevant third parties)
  - Same form as the CC library. Verified again 30 Oct 2026. Used in crisc_d2_008.

### AI 100-1 (AI RMF 1.0, Jan 2023) and AI 100-2 E2025 (Mar 2025)
- NIST AI 100-1 (AI RMF 1.0) MEASURE 2.4 (the functionality and behavior of the AI system are monitored when in production)
  - Same form as the CC library. Verified again 30 Oct 2026, nvlpubs NIST.AI.100-1.pdf. Used in crisc_d2_002.
- NIST AI 100-2 E2025 Section 3.4 (Indirect Prompt Injection Attacks and Mitigations)
  - New. Verified, 30 Oct 2026, nvlpubs NIST.AI.100-2e2025.pdf: attackers manipulate resources the model interacts with (agents, retrieval-augmented generation) to inject prompts without interacting with the application; mounted by a third party rather than the primary user. Used in crisc_d2_004.
- NIST AI 100-2 E2025 Section 2.3 (Poisoning Attacks and Mitigations: targeted and backdoor poisoning affect a small set of target samples)
  - New, round 3. Verified, 4 Nov 2026, nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf fetched and read: poisoning attacks occur "during the training stage"; "availability poisoning attacks typically cause indiscriminate degradation of the ML model on all samples, while targeted and backdoor poisoning attacks induce integrity violations on a small set of target samples"; poisoning can be orchestrated at scale so that an adversary with limited resources could control a fraction of the public datasets used for training. Used in crisc_d2_050.
- NIST AI 100-2 E2025 Section 2.4.4 (Model Extraction)
  - New. Verified, 30 Oct 2026: an attacker queries a model to extract its architecture and parameters; a functionally equivalent model can be rebuilt. Supports notes 2A2.3; not keyed in the pilot. (Model inversion is covered in Section 2.4.1 Data Reconstruction.)

### FIRST
- FIRST Common Vulnerability Scoring System (CVSS) v4.0 Specification Document Section 1 (Introduction)
  - Same form as the CC library. Verified again 30 Oct 2026, first.org/cvss/v4-0/specification-document (Document Version 1.2): CVSS communicates characteristics and severity; consumers enrich Base with Threat and Environmental metrics for "a more comprehensive input to risk assessment"; vulnerability management also weighs factors outside CVSS (regulation, customers affected, monetary loss, safety, reputation). Used in crisc_d2_005.

### Round 5 additions (crisc_d2_066 to 090, 4 Nov 2026)
Each source was fetched again on 4 Nov 2026 with `curl -sS -L` from nvlpubs.nist.gov or first.org and read in a text copy (`pdftotext -layout` for the PDFs).
- NIST IR 8286A Rev. 1 Section 2.2.2.2 (Reducing Unwanted Bias in Threat Considerations: consider a broad array of threat sources and avoid dismissing threats prematurely)
  - Verified, 4 Nov 2026, nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286Ar1.pdf: "it is important that all risk practitioners consider a broad array of threat sources and events"; "risk managers should avoid dismissing threats prematurely"; an intentional approach "helps to avoid complacency before an incident". Used in crisc_d2_066 (a threat list naming only outside attackers) and crisc_d2_074 (scenarios drawn only from past incidents).
- NIST IR 8286A Rev. 1 Section 2.2.2.2 Table 4 (Example bias issues to avoid in risk management: individual input and the Delphi technique counter group think)
  - Verified, 4 Nov 2026, same PDF: Table 4 lists Group Think ("a group member may not want to be the only one to express concern") with the countermeasure "use of individual input and subject matter expert judgement (e.g., Delphi Technique)". Used in crisc_d2_067.
- NIST SP 800-30 Rev. 1 Section 2.3.1 (Risk Models: overall likelihood combines the likelihood of initiation or occurrence and the likelihood of resulting in adverse impact)
  - Verified, 4 Nov 2026, nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-30r1.pdf: under Likelihood, organizations assess the likelihood that threat events will be initiated or will occur, then the likelihood that, once initiated or occurring, they "will result in adverse impacts or harm", and "assess the overall likelihood as a combination" of the two. Used in crisc_d2_069.
- FIRST Common Vulnerability Scoring System (CVSS) v4.0 Specification Document Section 3 (Threat Metrics: Exploit Maturity reflects exploit code availability and active exploitation)
  - Verified, 4 Nov 2026, first.org/cvss/v4-0/specification-document (Document Version 1.2; sections in order Introduction, Base, Threat, Environmental, Supplemental): "The Threat metrics measure the current state of exploit techniques or code availability for a vulnerability"; Exploit Maturity is populated by the consumer from threat intelligence; Base metrics are "constant over time and across user environments"; "Supplemental metrics do not modify the final score". Used in crisc_d2_070.
- NIST SP 800-30 Rev. 1 Appendix H Table H-2 (Examples of Adverse Impacts: harm to operations, assets, individuals, other organizations and the Nation)
  - Verified, 4 Nov 2026, same SP 800-30 PDF: Table H-2 lists harm to individuals ("injury or loss of life", "physical or psychological mistreatment") beside harm to operations and assets, including direct financial costs. Used in crisc_d2_078.
- NIST SP 800-30 Rev. 1 Section 3.2 Task 2-5 (Determine Impact: assess the maximum impact associated with the affected assets)
  - Verified, 4 Nov 2026, same PDF: the Task 2-5 key activities include "Assess the maximum impact associated with the affected assets". Used in crisc_d2_078 (the most severe harm sets the impact level).
- NIST SP 800-30 Rev. 1 Section 3.1 Task 1-4 (Identify Information Sources: impact information can come from business impact analyses)
  - Verified, 4 Nov 2026, same PDF: under Task 1-4, "sources of impact information can include, for example, mission/business impact analyses". Used in crisc_d2_081.
- NIST IR 8286A Rev. 1 Section 2.3.2.4 (Monte Carlo Simulation: randomly sampled values from estimated ranges identify a range of possible results)
  - Verified, 4 Nov 2026, IR 8286A Rev. 1 PDF: simulation supplements expert judgment; parameters are modeled repeatedly and "randomly sampled probabilities can help identify a range of possible values", for example between a low and a high loss estimate. Used in crisc_d2_083.
- NIST IR 8286A Rev. 1 Section 2.3.2.2 (Three-Point Estimation: optimistic, most likely and pessimistic estimates from subject matter experts)
  - Verified, 4 Nov 2026, same PDF: the estimator polls an SME for the most optimistic, the most likely and the pessimistic estimate; a footnote adds that, "to eliminate bias", the estimator should poll several SMEs and average their individual estimates. Used in crisc_d2_083.
- NIST SP 800-30 Rev. 1 Section 2.3 (Key Risk Concepts: a rationale for the assessed values of risk factors increases reproducibility and repeatability)
  - Verified, 4 Nov 2026, same SP 800-30 PDF: "By making explicit the risk model, the assessment approach, and the analysis approach employed, and requiring as part of the assessment process, a rationale for the assessed values of risk factors, organizations can increase the reproducibility and repeatability of risk assessments." Used in crisc_d2_084.
- NIST IR 8286 Rev. 1 Section 3.5 (Plan and Execute Risk Response Strategies: risk responses themselves may introduce new risks)
  - Verified, 4 Nov 2026, nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286r1.pdf: "Risk responses themselves may introduce new risks", with the example of multifactor authentication introducing a risk of decreased productivity. Used in crisc_d2_085.
- NIST IR 8286 Rev. 1 Section 3.3.2 (Techniques for Estimating Likelihood and Impact of Consequences: secondary losses are captured with primary losses to show total impact)
  - Verified, 4 Nov 2026, same PDF: "Secondary loss events should be captured with primary loss events to represent the total impact and cost of a risk scenario. The omission of secondary losses ... would underestimate the total impact, thereby misinforming risk response selection and prioritization." Used in crisc_d2_087.
- NIST SP 800-30 Rev. 1 Section 3.2 Task 2-2 (Identify Threat Events: general threat event descriptions are tailored to show how each could harm the organization)
  - Verified, 4 Nov 2026, same SP 800-30 PDF: under Task 2-2, "organizations tailor the general descriptions of threat events in Tables E-2 and E-3 to identify how each event could potentially harm organizational operations". Used in crisc_d2_068 (a generic scenario library tailored before use).
- NIST AI 100-2 E2025 Section 3.3 (Direct Prompting Attacks and Mitigations)
  - Verified, 4 Nov 2026, nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf: direct prompting attacks arise "when the attacker is the primary user of the system"; goals include enabling misuse (jailbreaks) and invading privacy by revealing "private information that was provided to the model in context". Used in crisc_d2_076 (a customer chatbot that answers from account data).

## Domain 3 Risk Response and Reporting (pilot crisc_d3_001 to 020, 30 Oct 2026)


### ISACA Interactive Glossary (https://www.isaca.org/resources/glossary)
- ISACA Glossary (risk transfer)
- ISACA Glossary (risk owner)
- ISACA Glossary (risk response)
- ISACA Glossary (risk aggregation)
- ISACA Glossary (compensating control)
- ISACA Glossary (detective control)
- ISACA Glossary (key risk indicator)
- ISACA Glossary (control owner)
  - All Verified, 30 Oct 2026: the glossary page on isaca.org was opened and each entry read. Risk transfer: assigning risk to another enterprise, usually by insurance or outsourcing, also known as risk sharing (001). Risk owner: the person given authority and accountability for risk-based decisions who owns the loss of a realized scenario (005). Risk response: any combination of avoidance, acceptance, sharing or transfer, or mitigation so that as much future residual risk as possible, usually depending on budgets, falls within appetite (010). Risk aggregation: integrating risk assessments at a corporate level for a complete view of overall enterprise risk (014). Compensating control: an internal control that reduces the risk of an existing or potential control weakness (007). Detective control: controls designed to detect and report when errors, omissions and unauthorized uses or entries occur (008). Key risk indicator (KRI): a subset of risk indicators that are highly relevant and have a high probability of predicting or indicating important risk (015). Control owner (added 31 Oct 2026, entry read on the same glossary page): the person given authority and accountability for control-related decisions, responsible for ensuring the control is implemented and operating effectively and efficiently (crisc_d3_005, re-angled to control ownership). Risk owner is now cited by crisc_d3_005 alongside it.

### NIST SP 800-39, Managing Information Security Risk (Mar 2011, no revision)
- NIST SP 800-39 Section 3.3 (Responding to Risk: accept, avoid, mitigate, share or transfer)
  - Verified, 30 Oct 2026, against nistspecialpublication800-39.pdf (nvlpubs.nist.gov), Section 3.3 Task 3-1: responses are acceptance, avoidance, mitigation, sharing, transfer or a combination; risk transfer "reduces neither the likelihood of harmful events occurring nor the consequences"; avoidance eliminates the activities or technologies that are the basis for the risk. Same string as the CC library. Used in crisc_d3_001. crisc_d3_003 moved to NIST IR 8286B-upd1 Sections 2.3.2 and 2.3.4 on 30 Oct 2026 (audit), because Section 3.3 read alone says avoidance may be appropriate when risk exceeds tolerance, which backs that item's runner-up.
- NIST SP 800-39 Section 3.3 Task 3-2 (Evaluation of Alternatives: effectiveness, feasibility and cost)
  - Verified, 30 Oct 2026, same PDF: Task 3-2 evaluates each course of action on expected effectiveness and feasibility, including mission or business impact and costs over the period the course of action is followed, as a risk versus risk-response trade-off. Used in crisc_d3_009 (root-cause control chosen for effectiveness) and crisc_d3_010 (control that meets appetite at lower cost).
- NIST SP 800-39 Section 3.4 (Monitoring Risk: compliance, response effectiveness and risk-impacting changes)
  - Verified, 30 Oct 2026, same PDF: risk monitoring verifies compliance, determines the ongoing effectiveness of risk responses and identifies risk-impacting changes; Tier 1 and 2 monitoring includes changes in the threat space and analyses of new technologies. Used in crisc_d3_020 (new AI rules under consultation as a risk-impacting change).

### NIST IR 8286B-upd1, Prioritizing Cybersecurity Risk for Enterprise Risk Management (Feb 2025)
- NIST IR 8286B-upd1 Section 2.3.1 (Risk Acceptance: exposure within risk tolerance is still reported, monitored and managed)
- NIST IR 8286B-upd1 Section 2.3.2 (Risk Avoidance: not conducting the activity when exposure exceeds tolerance)
- NIST IR 8286B-upd1 Section 2.3.4 (Risk Mitigation: preventive, deterrent, detective, corrective and compensating controls)
- NIST IR 8286B-upd1 Section 2.4.3 (Risk Owner: risk escalation and elevation)
  - All Verified, 30 Oct 2026, against NIST.IR.8286B-upd1.pdf (nvlpubs.nist.gov; csrc.nist.gov lists Feb 2025, superseding the Feb 2022 original). 2.3.1: acceptance is first considered when exposure is already acceptable under risk tolerance, and the risk "must be reported, monitored, and managed" (crisc_d3_002). 2.3.2: if exposure exceeds tolerance, the risk owner may decide not to conduct the activity; the text notes it is rare that no mix of transfer and mitigation would work (crisc_d3_003). 2.3.4: mitigation applies controls listed as preventative, deterrent, detective, corrective and compensating, with a definition and example for each (crisc_d3_003, crisc_d3_008, crisc_d3_009). 2.4.3: the risk owner column names who ensures the response is implemented; escalation happens when a threshold or time frame is reached, and elevation moves the decision to a more senior stakeholder (cited by crisc_d3_005 and crisc_d3_016 until 31 Oct 2026; both items were re-angled in the cross-domain fix). Used in crisc_d3_024, crisc_d3_029 and crisc_d1_042.

### NIST IR 8286C Rev. 1, Staging Cybersecurity Risks for Enterprise Risk Management and Governance Oversight (Dec 2025; supersedes IR 8286C-upd1, withdrawn 18 Dec 2025)
- NIST IR 8286C Rev. 1 Section 2.2 (Normalization of Cybersecurity Risk Registers: the same rating criteria enable comparison and tracking)
  - Verified, 31 Oct 2026, against NIST.IR.8286Cr1.pdf (nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286Cr1.pdf; the CSRC page https://csrc.nist.gov/pubs/ir/8286/c/r1/final lists it final on 18 Dec 2025, superseding IR 8286C-upd1 of Sep 2022, updated 6 Mar 2024). Section 2.2, now titled "Normalization of Cybersecurity Risk Registers", says normalization at the higher level "should use the same rating criteria (ordinal, categorical, etc.) to enable comparison and tracking", and its value-mapping example maps a high, medium and low scale onto 1, 2 and 3; Section 2.1 requires a source ID so each aggregated risk can be traced back to its original register. Used in crisc_d3_014. Replaces the withdrawn IR 8286C-upd1 Section 2.2 bullet (concept review D3-1, quality pass 31 Oct 2026).

### NIST SP 800-53 Rev. 5, Security and Privacy Controls (Sep 2020; minor release 5.2.0, Aug 2025)
- NIST SP 800-53 Rev. 5 RA-7 (Risk Response)
  - Verified, 30 Oct 2026, against NIST.SP.800-53r5.pdf (nvlpubs.nist.gov): respond to findings in accordance with organizational risk tolerance; options include mitigating, accepting with justification, sharing or transferring, or avoiding. Same string as the CC library. Used in crisc_d3_002.
- NIST SP 800-53 Rev. 5 CA-2 (Control Assessments)
  - Verified, 30 Oct 2026, same PDF: assess controls to determine the extent to which they are implemented correctly, operating as intended and producing the desired outcome. Used in crisc_d3_011 (risk counts as reduced only after the new review is shown to operate).
- NIST SP 800-53 Rev. 5 CA-5 (Plan of Action and Milestones)
  - Verified, 30 Oct 2026, same PDF: document planned remediation actions for weaknesses and update the plan based on control assessments, audits and continuous monitoring. Used in crisc_d3_013.
- NIST SP 800-53 Rev. 5 CA-7 (Continuous Monitoring)
  - Verified, 30 Oct 2026, same PDF: the control includes response actions to address the results of analysis of monitoring information and reporting status to defined roles. Same string as the CC library. Used in crisc_d3_018.
- NIST SP 800-53 Rev. 5 CA-7(4) (Continuous Monitoring | Risk Monitoring)
  - Verified, 30 Oct 2026, same PDF: risk monitoring is part of the continuous monitoring strategy (effectiveness, compliance and change monitoring) and "is informed by the established organizational risk tolerance". Used in crisc_d3_016 (re-angled 31 Oct 2026 to deriving a KRI threshold from the organization's own tolerance).
- NIST SP 800-53 Rev. 5 SR-6 (Supplier Assessments and Reviews)
  - Verified, 30 Oct 2026, same PDF: assess and review supply chain risks of suppliers at a defined frequency; the discussion includes the supplier's ability to assess its second-tier and third-tier suppliers and contractors. Used in crisc_d3_006 (subcontractor excluded from an assurance report).

### NIST SP 800-53A Rev. 5, Assessing Security and Privacy Controls (Jan 2022; minor release 5.2.0, Aug 2025)
- NIST SP 800-53A Rev. 5 Section 2.4.2 (Assessment Methods: examine, interview and test, with depth and coverage)
  - Verified, 30 Oct 2026, against NIST.SP.800-53Ar5.pdf (nvlpubs.nist.gov): the methods are examine (reviewing, inspecting, observing), interview and test; depth and coverage attributes rise with the assurance needed. Used in crisc_d3_012.

### NIST SP 800-137, Information Security Continuous Monitoring (Sep 2011)
- NIST SP 800-137 Section 3.4 (Analyze Data and Report Findings: recipients, content, format and frequency of reports)
- NIST SP 800-137 Section 3.5 (Respond to Findings)
  - Verified, 30 Oct 2026, against nistspecialpublication800-137.pdf (nvlpubs.nist.gov), still the current final on csrc.nist.gov. 3.4: procedures set the staff and roles who receive reports and the content, format and frequency of reports, and results are analyzed in the context of stated risk tolerances (crisc_d3_019). 3.5: monitoring information "is analyzed and met with appropriate responses", which may be mitigation, acceptance, avoidance or sharing in line with risk tolerance (crisc_d3_018).

### NIST SP 800-55 Vol. 1, Measurement Guide for Information Security: Identifying and Selecting Measures (Dec 2024)
- NIST SP 800-55v1 Section 4.4 (Evaluating Methods for Supporting Continuous Improvement: leading and lagging indicators)
  - Verified, 30 Oct 2026, against NIST.SP.800-55v1.pdf (nvlpubs.nist.gov): 4.4 defines KRIs (a metric used to measure risk), KPIs, leading indicators (predictive, tracking events or behaviors that precede incidents) and lagging indicators (tracking outcomes). Same string as the CC library. Used in crisc_d3_015.

### NIST CSF 2.0 (CSWP 29, Feb 2024)
- NIST CSF 2.0 GV.SC-07 (the risks posed by a supplier, their products and services and other third parties are understood, recorded, prioritized, assessed, responded to and monitored)
- NIST CSF 2.0 GV.RM-02 (risk appetite and risk tolerance statements are established, communicated and maintained)
- NIST CSF 2.0 GV.RR-02 (roles, responsibilities and authorities related to cybersecurity risk management are established, communicated, understood and enforced)
- NIST CSF 2.0 ID.RA-06 (risk responses are chosen, prioritized, planned, tracked and communicated)
- NIST CSF 2.0 ID.RA-07 (changes and exceptions are managed, assessed for risk impact, recorded and tracked)
  - All Verified, 30 Oct 2026, against NIST.CSWP.29.pdf (nvlpubs.nist.gov), subcategory text read. GV.RR-02, ID.RA-06 and ID.RA-07 use the same strings as the CC library. GV.SC-07 (crisc_d3_006, and crisc_d4_037 since the round 2 gate, 31 Oct 2026; string aligned on 31 Oct 2026 with the D4 block's CSWP 29 wording, "The risks posed by a supplier, their products and services, and other third parties are understood, recorded, prioritized, assessed, responded to, and monitored over the course of the relationship"), GV.RM-02 (crisc_d3_016 and crisc_d3_019; same string as the D1 block and the CC library, text read in the CSWP 29 PDF on 30 Oct 2026: "Risk appetite and risk tolerance statements are established, communicated, and maintained"; it replaced GV.OV-01, a loose fit for board-report content, after the audit), GV.RR-02 (crisc_d3_005 and crisc_d3_011), ID.RA-06 (crisc_d3_013), ID.RA-07 (crisc_d3_007).

### NIST AI 100-1, AI Risk Management Framework (AI RMF 1.0, Jan 2023)
- NIST AI 100-1 (AI RMF 1.0) GOVERN 1.1 (legal and regulatory requirements involving AI are understood, managed and documented)
- NIST AI 100-1 (AI RMF 1.0) GOVERN 3.2 (roles and responsibilities for human-AI configurations and oversight of AI systems are defined)
- NIST AI 100-1 (AI RMF 1.0) MANAGE 1.3 (responses to high-priority AI risks are developed, planned and documented, including mitigating, transferring, avoiding or accepting)
- NIST AI 100-1 (AI RMF 1.0) MEASURE 2.4 (the functionality and behavior of the AI system are monitored when in production)
- NIST AI 100-1 (AI RMF 1.0) MANAGE 4.1 (post-deployment monitoring plans, including capturing user input, appeal and override)
  - All Verified, 30 Oct 2026, against NIST.AI.100-1.pdf (nvlpubs.nist.gov), Tables 1, 3 and 4. GOVERN 3.2, MEASURE 2.4 and MANAGE 4.1 use the same strings as the CC library. MANAGE 1.3 says risk response options "can include mitigating, transferring, avoiding, or accepting" (crisc_d3_004). GOVERN 1.1 (crisc_d3_020), GOVERN 3.2 (crisc_d3_004), MEASURE 2.4 and MANAGE 4.1 (crisc_d3_017).

### Round 2 additions (crisc_d3_021 to 050, 31 Oct 2026)
- ISACA Glossary (risk acceptance)
- ISACA Glossary (preventive control)
- ISACA Glossary (key control indicator)
  - All Verified, 31 Oct 2026: https://www.isaca.org/resources/glossary downloaded and each entry read. Risk acceptance: a decision to accept a risk, made according to the risk appetite and risk tolerance set by senior management (crisc_d3_021, crisc_d3_024). Preventive control: an internal control used to avoid undesirable events, errors and other occurrences (crisc_d3_032). Key control indicator: a measure of the effectiveness of controls that indicates a failure or weakness which may increase the likelihood or impact of risk events (crisc_d3_042, crisc_d3_045).
- NIST CSF 2.0 Section 3.1 (Organizational Profiles step 4: analyze the gaps between the Current and Target Profiles and develop a prioritized action plan)
- NIST CSF 2.0 Section 3.2 (CSF Tiers: progression to higher Tiers is encouraged when risks or mandates are greater or when cost-benefit analysis supports it)
  - Both Verified, 31 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf (re-downloaded). Section 3.1 step 4: "Conduct a gap analysis to identify and analyze the differences between the Current and Target Profiles, and develop a prioritized action plan" (crisc_d3_034). Section 3.2: Tiers characterize the rigor of risk governance and management practices; "Progression to higher Tiers is encouraged when risks or mandates are greater or when a cost-benefit analysis indicates a feasible and cost-effective reduction of negative cybersecurity risks" (crisc_d3_035, by analogy: Tiers are organization-level rigor, applied here to risk-based targets). The existing D4 bullet for Section 3.1 (Current and Target Profiles) is reused by crisc_d3_033.
- NIST SP 800-137 Section 3.2.2 (Establish Monitoring and Assessment Frequencies: control volatility, impact level, known weaknesses, risk tolerance and threat information)
  - Verified, 31 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-137.pdf (re-downloaded): organizations set each control's assessment frequency and each metric's monitoring frequency from security control volatility, system impact level, critical functions, identified weaknesses, organizational risk tolerance, threat and vulnerability information (crisc_d3_046).
- NIST SP 800-55v1 Section 3.1.4 (Data Quality: a validation process checks the integrity, accuracy and structure of data before any analysis is done)
  - Verified, 31 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-55v1.pdf (re-downloaded): data validity is suspect when the source holds information from only a few organizational elements; "Having a validation process in place to check the integrity, accuracy, and structure of the data provides a way to address potential errors before any analysis is done" (crisc_d3_040, crisc_d3_041).
- NIST IR 8286B-upd1 Section 2.2.4 (Considerations of Positive Risks as an Input to ERM)
- NIST IR 8286B-upd1 Section 2.2.5 (Visualizing Risk Priority: heat maps are a quick-reference guide with limited ability to convey risk information)
  - Both Verified, 31 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286B-upd1.pdf (re-downloaded). 2.2.4: risks of all types, positive and negative, are included in communications and prioritization so senior managers see uncertainties that might bring benefit or harm (crisc_d3_050). 2.2.5: heat maps "should be used with caution"; colors and positions are "a guide for quick reference", and a matrix based on likelihood and impact "is equally limited" (crisc_d3_047).
- NIST IR 8286C Rev. 1 Section 5.1 (Key CSRM Mechanisms: risk tolerance is translated into security controls, KPIs and KRIs)
- NIST IR 8286C Rev. 1 Section 5.2 (Monitoring Risks: KRIs are observed for trends such as rising likelihood or failing controls)
  - Both Verified, 31 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286Cr1.pdf (re-downloaded). 5.1: tolerance statements are translated into the triad of security controls, KPIs (measures that show program success) and KRIs (measures valuable for predicting risk) (crisc_d3_043). 5.2: "KRIs can be observed to monitor trends", and a practitioner who sees a KRI change checks whether likelihood or severity is rising, a new risk has entered, or controls are failing (crisc_d3_045, crisc_d3_047).
- NIST SP 800-30 Rev. 1 Section 2.3.1 (Risk Models: uncertainty can be communicated by giving ranges of values rather than single values)
- NIST SP 800-30 Rev. 1 Section 3.2 Task 2-6 (Determine Risk: several moderate-level risks can aggregate to a higher level of risk)
  - Both Verified, 31 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-30r1.pdf (re-downloaded). 2.3.1, Uncertainty: the degree of uncertainty "can be communicated ... by providing ranges of values rather than single values for identified risks" (crisc_d3_049). Task 2-6: "when multiple risks materialize, even if each risk is at the moderate level, the set of those moderate-level risks could aggregate to a higher level of risk" (crisc_d3_030).

### Round 3 additions (crisc_d3_051 to 085, 4 Nov 2026)
- ISACA Glossary (control risk self-assessment)
- ISACA Glossary (risk map)
- ISACA Glossary (Capability Maturity Model)
- ISACA Glossary (maturity)
  - All Verified, 4 Nov 2026: https://www.isaca.org/resources/glossary fetched with `curl -sS -L` and each entry read. Control risk self-assessment: a method by which management and staff collectively identify and evaluate risk and controls within their business areas, possibly under the guidance of a facilitator such as a risk manager (crisc_d3_077: managers rate their own controls, the risk function facilitates). Risk map: a graphic tool for ranking and displaying risk by defined ranges for frequency and magnitude (crisc_d3_079: a ranking tool, so its scores are not averaged). Capability Maturity Model (CMM): describes an evolutionary improvement path from ad hoc, immature processes to disciplined, mature processes (crisc_d3_067). Maturity: the degree of reliability a business can place on a process to achieve its goals (crisc_d3_067).
- NIST CSF 2.0 GV.SC-10 (cybersecurity supply chain risk management plans include provisions for activities that occur after the conclusion of a partnership or service agreement)
  - Verified, 4 Nov 2026, against https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf (re-downloaded), GV.SC-10 subcategory text read. Used in crisc_d3_055 (vendor access removal as a required step when a contract ends).
- NIST AI 100-1 (AI RMF 1.0) GOVERN 6.2 (contingency processes are in place to handle failures or incidents in third-party data or AI systems deemed to be high-risk)
- NIST AI 100-1 (AI RMF 1.0) Appendix C (AI Risk Management and Human-AI Interaction: some AI systems may not require human oversight while others specifically require it)
  - Both Verified, 4 Nov 2026, against https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf (re-downloaded). GOVERN 6.2 (Table 1, under GOVERN 6 on third-party software, data and supply chain risks): "Contingency processes are in place to handle failures or incidents in third-party data or AI systems deemed to be high-risk" (crisc_d3_056). Appendix C, item 1: human-AI configurations span fully autonomous to fully manual; "Some AI systems may not require human oversight ... Other systems may specifically require human oversight" (crisc_d3_062, review scaled to the impact of a wrong output, cited with GOVERN 3.2).
- NIST SP 800-53B Section 2.4 (Tailoring Control Baselines: align the baseline with organizational risk and record a risk-based justification for each decision)
  - Verified, 4 Nov 2026, against https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53B.pdf (Sep 2020, updates as of 10 Dec 2020; still the current final on csrc.nist.gov). Section 2.4: after selecting a baseline, organizations tailor it to align controls with their requirements, as part of risk management; tailoring includes scoping, compensating controls, parameter values and "Supplementing baselines with additional controls and control enhancements"; controls are not removed arbitrarily, and tailoring decisions with their risk-based justification are documented. The "Supplementing Control Baselines" subsection says additional controls may be required to address specific threats to organizations and mission and business processes. Used in crisc_d3_060 (tailor rather than apply the high baseline unchanged everywhere, cited with Section 2.2) and crisc_d3_061 (add controls for a scenario the baseline misses).
- NIST SP 800-53B Section 2.2 (Selecting Control Baselines: each system's baseline is selected from its impact level, low, moderate or high)
  - Verified, 4 Nov 2026, against the same PDF (re-downloaded). Section 2.2: "Once the impact level of the system is determined, organizations select the appropriate security control baseline"; the organization selects one of three baselines "corresponding to the low-impact, moderate-impact, or high-impact categorization of the system". Used in crisc_d3_060 (each system's baseline selected by impact, then tailored).
- NIST SP 800-137 Section 3.1 (Define ISCM Strategy: the strategy is developed in line with organizational risk tolerance and reviewed on trigger criteria as well as a preestablished frequency)
  - Verified, 4 Nov 2026, against https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-137.pdf (re-downloaded; summary corrected on review the same day). Section 3.1: as changes occur, the ISCM strategy is reviewed for relevance and accuracy in reflecting organizational risk tolerances, and it includes "criteria describing the conditions that trigger a review or update of the strategy, in addition to the preestablished frequency audit"; 3.1.1: the strategy "is developed and implemented to support risk management in accordance with organizational risk tolerance". These triggers are for reviewing the strategy itself, not for reassessing risk. Used in crisc_d3_078 (a risk-based monitoring strategy before switching on 600 checks).
- NIST SP 800-137 Section 3.2.2 (Establish Monitoring and Assessment Frequencies: event-driven assessments on incidents, new threat information and significant changes, alongside the set frequencies)
  - Verified, 4 Nov 2026, against the same PDF (re-downloaded). The "Event-Driven Assessments" subsection of 3.2.2: events "may occur that trigger the immediate need to assess security controls or verify security status outside of requirements expressed in the ISCM strategy"; criteria for event-driven assessments consider "incidents, new threat information, significant changes to systems and operating environments, new or additional mission responsibilities, and results of a security impact analysis (SIA) or assessment of risk"; the rest of 3.2.2 sets the planned frequencies. Used in crisc_d3_076 (scheduled reviews kept alongside event triggers). The round 2 bullet for 3.2.2 (frequency factors) stays for crisc_d3_046 and crisc_d3_078.
- NIST SP 800-55v1 Section 3.1.1 (Measures Documentation: a standard record of what is measured, the data source, the formula and who handles the data keeps measures traceable)
- NIST SP 800-55v1 Section 3.1.2 (Measurement Reporting: context such as the risk indicated, fit with risk appetite and the decision needed)
  - Both Verified, 4 Nov 2026, against https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-55v1.pdf (Dec 2024, re-downloaded). 3.1.1: measures are documented in a standard format; "By keeping a consistent record of what is being measured, where the data comes from, what formulas and calculations are being used, and who interacts with the data, it becomes easier to trace data"; fields include formula, data source and responsible parties (crisc_d3_071 one definition for a KRI across units; crisc_d3_072 system data with recorded lineage). 3.1.2: a measure reported without context can cause indecision, so a report can include the risk indicated, whether findings fit the risk appetite and "What prioritization, action, or decision might need to be taken" (crisc_d3_080, crisc_d3_082).
  - Note: other round 3 parts reuse bullets already in this library: ISACA Glossary (control owner), (risk owner), (policy), (risk aggregation) and (key risk indicator); NIST CSF 2.0 GV.RR-02, GV.SC-05, GV.PO-01, GV.OC-01, ID.RA-02, ID.RA-06, ID.RA-07 and Section 3.1 (step 4); NIST SP 800-53 Rev. 5 CA-2, CA-5, RA-7 and SA-9; NIST SP 800-53A Rev. 5 Section 2.4.2; NIST SP 800-39 Sections 3.3 Task 3-2 and 3.4; NIST SP 800-30 Rev. 1 Sections 2.3.1, 2.3.2, 3.3 and 3.4; NIST SP 800-137 Sections 3.2.2 and 3.4; NIST SP 800-55v1 Sections 3.1.4 and 4.4; NIST IR 8286 Rev. 1 Section 3.5.2; NIST IR 8286B-upd1 Section 2.2.5; NIST IR 8286C Rev. 1 Sections 2.2 and 5.2; NIST AI 100-1 GOVERN 2.1, GOVERN 3.2 and MANAGE 3.1.

### Round 4 additions (crisc_d3_086 to 115, 4 Nov 2026)
- NIST IR 8286 Rev. 1 Section 3.1.1 (Notional Risk Management Roles: the auditor provides independent and formal verification of the achievement of enterprise objectives and the application of ERM processes)
  - Verified, 4 Nov 2026, against https://nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286r1.pdf (Dec 2025, downloaded with `curl -sS -L` and read as text). Section 3.1.1, "Notional Risk Management Roles", lists roles related to the Risk Executive Function, the first being "Auditor — Provides independent and formal verification regarding the achievement of enterprise objectives and the application of ERM processes"; the same section says risk governance should support "cross-communication among other groups that support risk management, such as human resources, legal, auditing, and compliance management". Used in crisc_d3_101 (internal audit's recent test results on a control as independent evidence the risk analyst starts from) and crisc_d3_113 (the risk profile shared with internal audit for its own plan); crisc_d3_113 also cites the ISACA Journal 2018 Volume 4 bullet in the Domain 1 section.
  - Note: the other round 4 parts reuse bullets already in this library: ISACA Glossary (risk response), (risk owner), (control owner), (key control indicator), (key risk indicator) and (risk aggregation); ISACA Journal 2018 Volume 4; NIST CSF 2.0 GV.RR-02, GV.SC-07, ID.RA-02, ID.RA-06, ID.RA-07, ID.RA-10, PR.DS-11 and Section 3.1 (step 4); NIST SP 800-53 Rev. 5 CA-2, CA-5, CA-7, CM-3 and CM-4; NIST SP 800-53A Rev. 5 Section 2.4.2; NIST SP 800-39 Sections 3.3, 3.3 Task 3-2 and 3.4; NIST SP 800-30 Rev. 1 Section 2.3.1 (uncertainty as ranges); NIST SP 800-137 Section 3.5; NIST SP 800-55v1 Sections 3.1.1, 3.1.2, 3.1.4 and 4.4; NIST IR 8286 Rev. 1 Section 3.8; NIST IR 8286B-upd1 Sections 2.3.1, 2.3.2, 2.3.4 and 2.4.3; NIST IR 8286C Rev. 1 Sections 2.2 and 5.1; NIST AI 100-1 MEASURE 2.4 and MANAGE 1.3.

### Named in the D3 notes as context only (not keyed)
These use `*` instead of `- ` so the parser does not read them as citable strings. Promote one to a `- ` bullet only after checking its fit to an item.
* ISACA COBIT 2019 Framework: Governance and Management Objectives
  - Verified (title), 30 Oct 2026: title listed on https://www.isaca.org/resources/cobit. The notes name objectives "managed risk" and "managed vendors" and the 0 to 5 capability levels in plain words; the objective codes and capability text were not opened (paid publication), so no D3 item cites COBIT.
* ISACA Risk IT Framework 2nd Edition
  - Verified (title), 30 Oct 2026: title listed on https://www.isaca.org/resources/it-risk. Full text not opened; not cited by any D3 item.
* NIST SP 800-161 Rev. 1 Section 3.1 (C-SCRM in Acquisition)
  - Verified, 30 Oct 2026, against NIST.SP.800-161r1-upd1.pdf (csrc.nist.gov lists May 2022 with updates as of 1 Nov 2024): after award, ensure the supplier meets the contract terms, and monitor for changes that affect supply chain risk throughout the life cycle. Supports notes 3A3.1 and 3A3.2; not cited by a pilot item.
* NIST SP 800-53B (Control Baselines for Information Systems and Organizations)
  - Verified (title), 30 Oct 2026: csrc.nist.gov lists Sep 2020 with updates as of 10 Dec 2020. Named in notes 3B1.3 only.

## Domain 4 Technology and Security (pilot crisc_d4_001 to 020, 30 Oct 2026)


Bullets in the library format. Paste under the CRISC library's `---` line. Every
bullet below was opened on 30 Oct 2026: the NIST PDF was downloaded from
nvlpubs.nist.gov with `curl -sS -L`, converted with pdftotext and the control,
subcategory or section read. Paraphrases inside the parentheses are our own short
summaries of the official text. Bullets also present in the CC library
(`data/cc/originals/_framework_library.md`) are marked "re-listed".

### ISACA Glossary (https://www.isaca.org/resources/glossary), added 31 Oct 2026
- ISACA Glossary (shadow IT)
- ISACA Glossary (problem)
- ISACA Glossary (user acceptance testing)
- ISACA Glossary (data owner)
- ISACA Glossary (recovery time objective)
- ISACA Glossary (segregation/separation of duties)
- ISACA Glossary (purpose limitation)
- ISACA Glossary (current risk)
  - All Verified, 31 Oct 2026: the glossary page was fetched from isaca.org with `curl -sS -L` and each entry read. Shadow IT: systems, services, hardware or software used on the enterprise network or infrastructure "without proper vetting and approval from the IT or cybersecurity department" (crisc_d4_001). Problem: "In IT, the unknown underlying cause of one or more incidents" (crisc_d4_004). User acceptance testing: functional testing where software "is tested by the intended audience or business representative" (crisc_d4_005). Data owner: "Individual(s) responsible for the integrity, accuracy, and use of data within an organization" (crisc_d4_007; crisc_d4_008). Recovery time objective: "The amount of time allowed for the recovery of a business function or resource after a disaster occurs" (crisc_d4_011; notes 4A6.1). Segregation/separation of duties: a basic internal control that assigns initiating and recording transactions and custody of assets to separate individuals (crisc_d4_015). Purpose limitation: data collected for specified, explicit and legitimate purposes and not further processed in an incompatible way (crisc_d4_019). Current risk: the risk state now, counting actions already taken but not those anticipated or proposed (crisc_d4_016; re-listed from the D2 block). The same page also defines maximum tolerable outage (MTO), acceptable interruption window (AIW), need-to-know and the shared responsibility model, used in the D4 notes.

### NIST SP 800-53 Rev. 5, Security and Privacy Controls (Sep 2020; catalog release 5.2.0, Aug 2025)
- NIST SP 800-53 Rev. 5 AC-5 (Separation of Duties)
  - Verified, 30 Oct 2026 (re-listed from CC): control text read; separation of duties "addresses the potential for abuse of authorized privileges" by dividing functions among individuals. Used in crisc_d4_005 (developers running acceptance tests) and crisc_d4_015 (one person runs the payment cycle).
- NIST SP 800-53 Rev. 5 CM-3 (Configuration Change Control)
  - Verified, 30 Oct 2026 (re-listed from CC): review and approve or disapprove configuration-controlled changes with explicit consideration of security and privacy impact analyses; retain records; monitor change activity. Used in crisc_d4_003.
- NIST SP 800-53 Rev. 5 CM-4 (Impact Analyses)
  - Verified, 30 Oct 2026: "Analyze changes to the system to determine potential security and privacy impacts prior to change implementation"; the discussion includes risk assessments to decide whether more controls are needed. Used in crisc_d4_006 (a vendor's AI model swap treated as a change).
- NIST SP 800-53 Rev. 5 CP-8(2) (Telecommunications Services | Single Points of Failure)
  - Verified, 30 Oct 2026: "Obtain alternate telecommunications services to reduce the likelihood of sharing a single point of failure with primary telecommunications services." Used in crisc_d4_011 (recovery site on the same carrier).
- NIST SP 800-53 Rev. 5 MP-6 (Media Sanitization)
  - Verified, 30 Oct 2026: control title and text read (sanitize media before disposal, release or reuse). No item cites it since the 31 Oct 2026 re-audit; kept for later batches.
- NIST SP 800-53 Rev. 5 PT-3 (Personally Identifiable Information Processing Purposes)
  - Verified, 30 Oct 2026 (re-listed from CC): identify and document the purposes for processing PII and restrict processing to what is compatible with them. Used in crisc_d4_019 (health inferences for ads).
- NIST SP 800-53 Rev. 5 RA-8 (Privacy Impact Assessments)
  - Verified, 30 Oct 2026: conduct PIAs before developing or procuring IT that processes PII; the discussion calls a PIA "a living document that organizations update whenever changes to the information technology, changes to the organization's practices, or other factors alter the privacy risks". Used in crisc_d4_020.
- NIST SP 800-53 Rev. 5 SA-3 (System Development Life Cycle)
  - Verified, 30 Oct 2026: use an SDLC that incorporates security and privacy, define roles and responsibilities throughout it, and integrate the risk management process into SDLC activities. Used in crisc_d4_005.
- NIST SP 800-53 Rev. 5 SA-22 (Unsupported System Components)
  - Verified, 30 Oct 2026 (re-listed from CC): replace components when support ends or provide alternative support; the discussion notes missing patches give adversaries an opportunity. Used in crisc_d4_002.
- NIST SP 800-53 Rev. 5 SI-12 (Information Management and Retention)
  - Verified, 31 Oct 2026 (re-listed from CC; text first read 30 Oct 2026 for the D4 notes and re-read in the SP 800-53 Rev. 5 PDF): "Manage and retain information within the system and information output from the system in accordance with applicable laws, executive orders, directives, regulations, policies, standards, guidelines and operational requirements"; the discussion says retention requirements cover the full information life cycle. Used in crisc_d4_008 (call recordings kept past the approved retention period because deletion was never set up).

### NIST CSWP 29, The NIST Cybersecurity Framework (CSF) 2.0 (Feb 2024)
- NIST CSF 2.0 Section 3.1 (CSF Profiles: a Current Profile describes outcomes being achieved and a Target Profile the outcomes selected for risk management objectives)
- NIST CSF 2.0 GV.RM-03 (cybersecurity risk management activities and outcomes are included in enterprise risk management processes)
- NIST CSF 2.0 GV.RM-07 (strategic opportunities or positive risks are characterized and are included in organizational cybersecurity risk discussions)
- NIST CSF 2.0 GV.RR-01 (organizational leadership is responsible and accountable for cybersecurity risk and fosters a culture that is risk-aware, ethical and continually improving)
- NIST CSF 2.0 GV.RR-02 (roles, responsibilities and authorities related to cybersecurity risk management are established, communicated, understood and enforced)
- NIST CSF 2.0 ID.AM-02 (inventories of software, services and systems managed by the organization are maintained)
- NIST CSF 2.0 ID.IM-03 (improvements are identified from execution of operational processes, procedures and activities)
- NIST CSF 2.0 ID.RA-07 (changes and exceptions are managed, assessed for risk impact, recorded and tracked)
- NIST CSF 2.0 ID.RA-10 (critical suppliers are assessed prior to acquisition)
- NIST CSF 2.0 PR.AT-01 (personnel are provided with awareness and training so that they possess the knowledge and skills to perform general tasks with cybersecurity risks in mind)
- NIST CSF 2.0 PR.PS-02 (software is maintained, replaced and removed commensurate with risk)
- NIST CSF 2.0 RC.RP-03 (the integrity of backups and other restoration assets is verified before using them for restoration)
- NIST CSF 2.0 RS.AN-03 (analysis is performed to establish what has taken place during an incident and the root cause of the incident)
- NIST CSF 2.0 RS.MI-01 (incidents are contained)
  - All Verified, 30 Oct 2026, against the CSWP 29 PDF (nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf): each subcategory read in Appendix A. GV.RR-01, GV.RR-02, ID.RA-07 and RS.MI-01 are re-listed from the CC library in the same form. GV.RM-07 reads "Strategic opportunities (i.e., positive risks) are characterized and are included in organizational cybersecurity risk discussions" (used for the opportunity side of emerging technology, crisc_d4_013). Uses: ID.AM-02 and ID.RA-07 in crisc_d4_001; PR.PS-02 in 002; RS.AN-03 and ID.IM-03 in 004; GV.RM-03 in 009 and 010; GV.RR-02 in 010; RS.MI-01 and RC.RP-03 in 012; GV.RM-07 and ID.RA-10 in 013; Section 3.1 and ID.RA-05 in 016; PR.AT-01 and GV.RR-01 in 017; PR.AT-01 in 018. Cross-domain fix 30 Oct 2026: crisc_d4_016 was re-angled to framework alignment and now cites Section 3.1 (Verified 31 Oct 2026 against the CSWP 29 PDF: a Current Profile "specifies the Core outcomes that an organization is currently achieving" and a Target Profile "the desired outcomes that an organization has selected and prioritized for achieving its cybersecurity risk management objectives") with ID.RA-05 from the D2 block; the D4 GV.SC-07 bullet was removed so the library carries one GV.SC-07 string (the D3 one). crisc_d4_017 now uses PR.AT-01 and GV.RR-01 (role-based onboarding training).

### NIST AI 100-1, AI Risk Management Framework (AI RMF 1.0, Jan 2023)
- NIST AI 100-1 (AI RMF 1.0) MANAGE 1.1 (a determination is made as to whether the AI system achieves its intended purposes and whether its development or deployment should proceed)
- NIST AI 100-1 (AI RMF 1.0) MANAGE 3.1 (AI risks and benefits from third-party resources are regularly monitored and risk controls are applied and documented)
- NIST AI 100-1 (AI RMF 1.0) MEASURE 2.11 (fairness and bias as identified in the MAP function are evaluated and results are documented)
- NIST AI 100-1 (AI RMF 1.0) MEASURE 2.3 (AI system performance or assurance criteria are measured and demonstrated for conditions similar to deployment settings)
  - All Verified, 30 Oct 2026, against the AI 100-1 PDF (nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf), Tables 3 and 4. MANAGE 1.1 in full: "A determination is made as to whether the AI system achieves its intended purposes and stated objectives and whether its development or deployment should proceed." Section 1.1 also says AI impacts "can be positive, negative, or both and can result in opportunities or threats" (used in notes 4A7). MEASURE 2.3 in full: "AI system performance or assurance criteria are measured qualitatively or quantitatively and demonstrated for conditions similar to deployment setting(s). Measures are documented." (Table 3; Verified 30 Oct 2026). Uses: MANAGE 3.1 in crisc_d4_006 (vendor model swap); MEASURE 2.11 and MEASURE 2.3 in crisc_d4_014 (housing-assistance ranking tool tested on past council applications). MANAGE 1.1 was used by crisc_d4_014 until the 30 Oct 2026 review fixes and is kept for later batches.

### Other NIST publications
- NIST SP 800-12 Rev. 1 Section 3.4 (Information Owner/Steward)
  - Verified, 30 Oct 2026 (re-listed from CC): PDF read; the owner is the official with authority for specified information who establishes "the rules for the appropriate use and protection of the subject information". Used in crisc_d4_007.
- NIST SP 800-34 Rev. 1 Section 3.2.1 (Determine Business Processes and Recovery Criticality: MTD, RTO and RPO)
  - Verified, 30 Oct 2026 (re-listed from CC): PDF read; still the current revision on csrc.nist.gov. Section 3.4.3 (not cited here) describes cold, warm, hot and mirrored sites, used in notes 4A6.1. Used in crisc_d4_011. MTD is NIST's term; the ISACA Glossary calls it maximum tolerable outage (MTO), and the D4 notes use MTO with MTD named only as "other sources say" (31 Oct 2026).
- NIST SP 800-50 Rev. 1 Section 5.2.3 (Evaluating CPLP Effectiveness)
  - Verified, 30 Oct 2026: Sep 2024 PDF read; Section 5.2.3 says program managers periodically evaluate the learning program's effectiveness with documented metrics and measurements (see its Sec. 2.4) and report results to leadership. Used in crisc_d4_018 (behavior measure over completion). The CC library cites this publication by title only; this bullet adds the section. Section 5.2.3.3 Table 3 (Kirkpatrick Model) separates Level 2 Learning (whether participants absorbed the knowledge) from Level 3 Behavior (whether they apply it at work), which is the line between quiz scores and the upload trend in crisc_d4_018 (Verified 30 Oct 2026).
- NIST SP 800-88 Rev. 2 Section 3.1 (Sanitization Methods: clear, purge and destroy)
  - Verified, 30 Oct 2026 (re-listed from CC): Sep 2025 PDF read. 3.1.2 says purge makes recovery infeasible with state-of-the-art laboratory techniques while keeping the media potentially reusable, and lists cryptographic erase among purge techniques; the section also warns that overwrite habits from magnetic media expose data on flash media. Used in notes 4A4.2; no item cites it since the 31 Oct 2026 re-audit.
- NIST SP 800-128 Section 3.3.2 (Implement the Configuration Change Control Process: unscheduled changes are reviewed by the CCB as soon as practical)
  - Verified, 30 Oct 2026: PDF (Aug 2011, includes updates as of 10 Oct 2019; csrc.nist.gov confirms this is the current final) read. Under "Unscheduled or Unauthorized Changes": unscheduled (emergency) changes "are still managed and controlled" and "are reviewed/resolved by the CCB as soon as is practical after unscheduled changes are made". CCB is the configuration control board. Used in crisc_d4_003.
- NIST Privacy Framework Version 1.0 Section 1.2.1 (Cybersecurity and Privacy Risk Management: privacy risk can arise from data processing unrelated to cybersecurity incidents)
  - Verified, 30 Oct 2026: PDF (NIST.CSWP.01162020, Jan 2020) read. Section 1.2.1 says managing cybersecurity risk "is not sufficient, as privacy risks can also arise by means unrelated to cybersecurity incidents" (Figure 2). The NIST Privacy Framework page lists Version 1.1 only as an initial public draft on 30 Oct 2026, so 1.0 is the citable final. Used in crisc_d4_019.

### Round 2 additions (crisc_d4_021 to 045, 31 Oct 2026)
Every source below was opened on 31 Oct 2026 in this session: the ISACA Glossary page was fetched from isaca.org and each NIST PDF downloaded from nvlpubs.nist.gov with `curl -sS -L`, converted with pdftotext and the entry, control or section read. CSRC pages confirm SP 800-188 (Sep 2023), SP 800-207 (Aug 2020), SP 800-218 (Feb 2022) and SP 800-50 Rev. 1 (Sep 2024) as current finals with no withdrawal.
- ISACA Glossary (enterprise architecture)
  - Verified, 31 Oct 2026: "A description of the fundamental underlying design of the business system components ... the relationships among them and the manner in which they support the enterprise's objectives." Used in crisc_d4_021.
- ISACA Glossary (shared responsibility model)
  - Verified, 31 Oct 2026: "A cloud security framework that dictates the security obligations of a cloud service provider and its users to ensure accountability." Used in crisc_d4_033.
- ISACA Glossary (privacy by design)
  - Verified, 31 Oct 2026: "The integration of privacy into the entire engineering process." Used in crisc_d4_043.
- NIST SP 800-53 Rev. 5 PM-7 (Enterprise Architecture)
  - Verified, 31 Oct 2026: develop and maintain an enterprise architecture "with consideration for information security, privacy, and the resulting risk"; the discussion ties integrated requirements to mission and business processes. Used in crisc_d4_021 and crisc_d4_046.
- NIST SP 800-53 Rev. 5 CM-8 (System Component Inventory)
  - Verified, 31 Oct 2026: the inventory "accurately reflects the system", includes all components and has no duplicate accounting; it is reviewed and updated. Used in crisc_d4_025 (servers the endpoint detection console sees but the CMDB omits sit outside operations processes, since the round 2 gate; reconciling counts before a report until then; laptop encryption until repair round 1, 31 Oct 2026).
- NIST SP 800-53 Rev. 5 CP-4 (Contingency Plan Testing)
  - Verified, 31 Oct 2026: test the plan to determine its effectiveness and readiness, review results and initiate corrective actions; the discussion lists checklists, walk-through and tabletop exercises, simulations (parallel or full interrupt) and comprehensive exercises. Used in crisc_d4_034 and crisc_d4_056 (who accepts the disruption of a full interruption test, review fixes 4 Nov 2026).
- NIST SP 800-53 Rev. 5 SA-4 (Acquisition Process)
  - Verified, 31 Oct 2026: include security and privacy functional, strength, assurance and documentation requirements and acceptance criteria in the acquisition contract. Used in crisc_d4_027.
- NIST SP 800-53 Rev. 5 SA-9 (External System Services)
  - Verified, 31 Oct 2026: define and document organizational oversight and user roles and responsibilities for external system services; the discussion says "The responsibility for managing risks from the use of external system services remains with authorizing officials." Used in crisc_d4_033.
- NIST SP 800-53 Rev. 5 SA-9(5) (External System Services | Processing, Storage, and Service Location)
  - Verified, 31 Oct 2026: restrict the location of processing, data storage or services to organization-defined locations based on organization-defined requirements; the discussion notes provider criteria for location may differ from the organization's. Used in crisc_d4_045.
- NIST SP 800-53 Rev. 5 SA-8(33) (Security and Privacy Engineering Principles | Minimization)
  - Verified, 31 Oct 2026: process only personally identifiable information "directly relevant and necessary to accomplish an authorized purpose" and keep it only as long as necessary. Used in crisc_d4_043 and, since the cross-domain gate, crisc_d4_047 (re-opened 4 Nov 2026: NIST.SP.800-53r5.pdf re-downloaded from nvlpubs.nist.gov with `curl -sS -L` and SA-8(33) read; the discussion says organizations "should only process personally identifiable information that is directly relevant and necessary to accomplish an authorized purpose"; Verified). In crisc_d4_047 the partner's purpose is agreed and the extracts still carry names and street addresses.
- NIST SP 800-53 Rev. 5 AC-6 (Least Privilege)
  - Verified, 31 Oct 2026: allow only authorized accesses "necessary to accomplish assigned organizational tasks". Used in crisc_d4_039 (30-day administrator grants sized to the task; standing rights until repair round 1, 31 Oct 2026).
- NIST CSF 2.0 ID.AM-01 (inventories of hardware managed by the organization are maintained)
- NIST CSF 2.0 ID.AM-07 (inventories of data and corresponding metadata for designated data types are maintained)
- NIST CSF 2.0 PR.DS-11 (backups of data are created, protected, maintained and tested)
- NIST CSF 2.0 Section 3.2 (CSF Tiers: progression to higher Tiers is encouraged when risks or mandates are greater or when cost-benefit supports it)
  - All four Verified, 31 Oct 2026, against the CSWP 29 PDF. Section 3.2 reads: "Progression to higher Tiers is encouraged when risks or mandates are greater or when a cost-benefit analysis indicates a feasible and cost-effective reduction of negative cybersecurity risks", and names the Tiers Partial, Risk Informed, Repeatable and Adaptive. Uses: ID.AM-01 in crisc_d4_025; ID.AM-07 in 030; PR.DS-11 in 035. Section 3.2 was cited by crisc_d4_038 until repair round 1 (31 Oct 2026), when that item was replaced by a framework-mapping item citing Section 3.1; kept for later batches.
- NIST SP 800-218 Version 1.1 PO.4.1 (define criteria for software security checks, such as adding them to the Definition of Done in agile methodologies)
  - Verified, 31 Oct 2026: PO.4.1 "Define criteria for software security checks and track throughout the SDLC"; Example 3 "Add software security criteria to existing checks (e.g., the Definition of Done in agile SDLC methodologies)". v1.1 is the current final (the v1.2 draft is noted above). Used in crisc_d4_031.
- NIST SP 800-207 Section 7 (Migrating to a Zero Trust Architecture: an incremental journey rather than a wholesale replacement)
  - Verified, 31 Oct 2026: "Implementing a ZTA is a journey rather than a wholesale replacement of infrastructure or processes"; organizations "incrementally implement" zero trust to protect their highest value data assets, and 7.3.3 notes a first transition may start with a low-risk business process. Used in crisc_d4_040; the notes 4B1.2 adoption bullet was corrected to this wording.
- NIST SP 800-188 Section 2.2 (Terminology: de-identified data can be re-identified by joining it with other datasets, and pseudonyms can raise that risk)
  - Verified, 31 Oct 2026 (Sep 2023 PDF): de-identified data "can be re-identified if the dataset is joined with a second dataset" of rooms, times and names, and "the existence of the pseudonym identifiers frequently increases the risk of re-identification through other means". Used in crisc_d4_044.
- NIST AI 100-1 (AI RMF 1.0) Section 3.4 (Accountable and Transparent: maintaining the provenance of training data supports transparency and accountability)
  - Verified, 31 Oct 2026: "Maintaining the provenance of training data and supporting attribution of the AI system's decisions to subsets of training data can assist with both transparency and accountability." Used in crisc_d4_029.
- ISACA Glossary (opportunity)
  - Verified, 31 Oct 2026 (isaca.org glossary page fetched with `curl -sS -L`, entry read): "An uncertain event that may positively impact meeting objectives." Used in crisc_d4_037 (an evaluation of new technology that lists only threats) until the round 2 gate, 31 Oct 2026, when that item moved to exit terms and vendor lock-in (GV.SC-05 and GV.SC-07). Used in crisc_d4_048 (Round 3, 4 Nov 2026: an AI maintenance assessment that lists only what could go wrong) until the cross-domain gate, 4 Nov 2026, when that item moved to limits on an autonomous AI agent (it duplicated crisc_d3_050 and crisc_d4_013). No item cites it now; kept for later batches.
- ISACA Glossary (anonymization)
  - Verified, 31 Oct 2026 (same fetch): "Irreversible severance of a data set from the identity of the data contributor to prevent any future reidentification, even by the organization collecting the data under any condition." Used in crisc_d4_044 (trip records with a stable code per card are pseudonymized, not anonymized).

### Round 3 additions (crisc_d4_046 to 065, 4 Nov 2026)
Each source below was opened on 4 Nov 2026: the NIST PDFs were downloaded from nvlpubs.nist.gov with `curl -sS -L`, converted with pdftotext and the control or section read; the csrc.nist.gov pages for SP 800-218 (Feb 2022) and SP 800-63B-4 (July 2025, supersedes SP 800-63B) were checked for status. Round 3 also reused the ISACA Glossary (opportunity) bullet above (crisc_d4_048, until the cross-domain gate). Review fixes 4 Nov 2026: crisc_d4_056 was re-angled and now cites NIST SP 800-53 Rev. 5 CP-4 (Round 2 block above) with ISACA Glossary (risk owner) (Domain 1 block), no longer NIST SP 800-34 Rev. 1 Section 3.5.3; crisc_d4_064 was re-angled and now cites NIST IR 8286A Rev. 1 Section 2.2.4 (Domain 2 block: senior leaders may want impact as single or annualized loss expectancy) with NIST CSF 2.0 PR.PS-02, so Domain 4 no longer cites NIST IR 8286B-upd1 Section 2.4.3 (that bullet sits in the Domain 3 block, where crisc_d3_024 and crisc_d1_042 cite it).
  - Cross-domain fixes 4 Nov 2026: crisc_d4_048 was re-angled to limits on what an autonomous AI maintenance agent may do without approval and now cites NIST AI 100-1 (AI RMF 1.0) GOVERN 3.2 (Domain 3 block) and Appendix C (Domain 3 round 3 block), both re-opened 4 Nov 2026 against https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf (re-downloaded) and Verified: GOVERN 3.2 "Policies and procedures are in place to define and differentiate roles and responsibilities for human-AI configurations and oversight of AI systems"; Appendix C item 1, human-AI configurations "can span from fully autonomous to fully manual", some systems may not require human oversight and "Other systems may specifically require human oversight". It no longer cites ISACA Glossary (opportunity) or NIST CSF 2.0 GV.RM-07 (GV.RM-07 stays with crisc_d4_013). crisc_d4_047 was re-angled to minimization at the sharing stage and now cites NIST SP 800-53 Rev. 5 SA-8(33) (Round 2 block above, re-opened and Verified the same day) with CA-3, no longer ISACA Glossary (data owner). No new bullet added; each string already sits in this library.
- NIST SP 800-218 Version 1.1 RV.3 (Analyze Vulnerabilities to Identify Their Root Causes: analyze root causes over time and update the SDLC process so they do not recur)
  - Verified, 4 Nov 2026: RV.3 "Help reduce the frequency of vulnerabilities in the future"; RV.3.2 "Analyze the root causes over time to identify patterns, such as a particular secure coding practice not being followed consistently"; RV.3.4 "Review the SDLC process, and update it if appropriate to prevent (or reduce the likelihood of) the root cause recurring". Used in crisc_d4_052.
- NIST SP 800-53 Rev. 5 CA-3 (Information Exchange)
  - Verified, 4 Nov 2026: approve and manage information exchange using agreements (information exchange security agreements, memoranda of understanding, user agreements, nondisclosure agreements and others) that document security and privacy requirements, controls and responsibilities; the discussion names exchanges of files by email. Used in crisc_d4_047 (since the cross-domain gate, 4 Nov 2026, with SA-8(33): the agreement is in place and the item turns on what each extract carries).
- NIST SP 800-53 Rev. 5 PL-8(1) (Security and Privacy Architectures | Defense in Depth)
  - Verified, 4 Nov 2026: design the architecture "using a defense-in-depth approach"; the discussion says adversaries "must overcome multiple controls to achieve their objective", which raises their work factor and "the likelihood of detection". Used in crisc_d4_053.
- NIST SP 800-53 Rev. 5 PM-5(1) (System Inventory | Inventory of Personally Identifiable Information)
  - Verified, 4 Nov 2026: establish, maintain and update an inventory of all systems, applications and projects that process PII; the discussion says it supports mapping data actions and limiting processing to authorized purposes. Used in crisc_d4_060.
- NIST SP 800-63B-4 Section 3.2.3 (Use of Biometrics: biometric characteristics are not secrets, ways to revoke them are limited, and central storage raises privacy concerns)
  - Verified, 4 Nov 2026 (July 2025 PDF): template protection schemes offer a way to revoke biometric characteristics but "the availability of such solutions is limited"; biometric characteristics "do not constitute secrets"; their use, "especially when stored for central verification, introduces new privacy concerns"; biometric data "SHALL be treated and secured as sensitive personal information". Used in crisc_d4_063.
- NIST CSF 2.0 PR.AT-02 (individuals in specialized roles are provided with awareness and training so that they possess the knowledge and skills to perform relevant tasks with cybersecurity risks in mind)
  - Verified, 4 Nov 2026, against the CSWP 29 PDF (nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf, re-downloaded): Appendix A, Awareness and Training (PR.AT), read beside PR.AT-01. Used in crisc_d4_065 (role-based training for a board's oversight duty).

### Round 5 additions (crisc_d4_066 to 075, 4 Nov 2026)
Each source below was opened on 4 Nov 2026: NIST.SP.800-53r5.pdf, NIST.SP.800-37r2.pdf and nistspecialpublication800-122.pdf were downloaded from nvlpubs.nist.gov with `curl -sS -L`, converted with pdftotext and the control, task or section read; the csrc.nist.gov pages for SP 800-37 Rev. 2 (Dec 2018, supersedes Rev. 1) and SP 800-122 (Apr 2010) show both as current finals with no withdrawal.
- NIST SP 800-53 Rev. 5 AU-2 (Event Logging)
  - Verified, 4 Nov 2026: identify the event types the system can log, "Coordinate the event logging function with other organizational entities requiring audit-related information", and give a rationale for why the selected event types are adequate "to support after-the-fact investigations of incidents". Used in crisc_d4_066 (30 product teams each designing their own logging, with PM-7).
- NIST SP 800-53 Rev. 5 CM-5 (Access Restrictions for Change)
  - Verified, 4 Nov 2026: "Define, document, approve, and enforce physical and logical access restrictions associated with changes to the system"; the discussion says organizations "permit only qualified and authorized individuals to access systems for purposes of initiating changes", including through workflow automation. Used in crisc_d4_067 (pipeline administrators who can switch off the peer-review gate).
- NIST SP 800-37 Rev. 2 Task M-7 (System Disposal: implement a disposal strategy and execute required actions when a system is removed from operation)
  - Verified, 4 Nov 2026: Task M-7 reads "Implement a system disposal strategy and execute required actions when a system is removed from operation"; SDLC phase "Existing – Disposal"; the discussion lists media sanitization, configuration management and record retention, and says inventory systems are updated "to indicate the system that is being removed from service". Used in crisc_d4_068 (a replaced system's database left running).
- NIST SP 800-122 Section 3.2.3 (Data Field Sensitivity: combinations of data fields can be more sensitive than each field alone)
  - Verified, 4 Nov 2026: "Organizations should evaluate the sensitivity of each individual PII data field, as well as the sensitivity of the PII data fields together"; organizations "may also consider certain combinations of PII data fields to be more sensitive ... than each data field would be considered without the existence of the others". Used in crisc_d4_069 (loyalty records joined with store Wi-Fi logs).
- NIST SP 800-53 Rev. 5 SC-29 (Heterogeneity)
- NIST SP 800-53 Rev. 5 PL-8(2) (Security and Privacy Architectures | Supplier Diversity)
  - Both Verified, 4 Nov 2026. SC-29: "Employ a diverse set of information technologies" for organization-defined components; the discussion says diversity "protects against common mode failures" and reduces the likelihood that the means used to compromise one component work against others. PL-8(2): require that controls allocated to locations and architectural layers "are obtained from different suppliers", because products have different strengths and weaknesses. Used in crisc_d4_073 (two same-vendor firewalls in series with a copied rule set).
- NIST SP 800-53 Rev. 5 AT-2 (Literacy Training and Awareness)
  - Verified, 4 Nov 2026: "Provide security and privacy literacy training to system users (including managers, senior executives, and contractors)"; the discussion says content is based on "specific organizational requirements, the systems to which personnel have authorized access, and work environments" and covers how to respond to suspected incidents. Used in crisc_d4_074 (staffing-firm contractors outside an employee-only awareness program).
  - Note: the other round 5 parts reuse bullets already in this library: NIST SP 800-53 Rev. 5 PM-7, CM-4, SA-9 and PT-3; NIST IR 8286 Rev. 1 Sections 3.1.1 (Domain 3 round 4 block: internal audit's independent verification, crisc_d4_067) and 3.8; NIST SP 800-53A Rev. 5 Section 2.4.2; NIST CSF 2.0 GV.RM-03, ID.RA-07, PR.AT-01, PR.DS-11, PR.PS-02 and RC.RP-03; ISACA Glossary (data owner); NIST AI 100-1 (AI RMF 1.0) MANAGE 3.1.

### Opened for the notes only (not used as framework_ref)
  - NIST SP 800-218 (SSDF Version 1.1, Feb 2022): practice groups PO, PS, PW, RV and practice titles PO.1, PW.1, PW.8, RV.3 read; Section 1 says secure practices are integrated into any SDLC model, including Agile and DevOps. Checked again 31 Oct 2026: v1.1 is still the final edition; SP 800-218 Rev. 1 (SSDF Version 1.2) is an initial public draft published 17 Dec 2025 (comments closed 30 Jan 2026), so the notes cite v1.1 and name the draft.
  - NIST SP 800-218A (Secure Software Development Practices for Generative AI and Dual-Use Foundation Models: An SSDF Community Profile, Jul 2024): title page read.
  - NIST SP 800-207 (Zero Trust Architecture, Aug 2020): Section 2.1 Tenets heading and implicit-trust text read.
  - NIST SP 800-37 Rev. 2 (Dec 2018): agile and iterative development references read.
  - NIST FIPS 203 (Module-Lattice-Based Key-Encapsulation Mechanism Standard): csrc.nist.gov page shows Date Published 13 Aug 2024.
  - NIST SP 800-53 Rev. 5 CP-7(1) (Alternate Processing Site | Separation from Primary Site): text read; a candidate for later D4 batches. PM-7 (Enterprise Architecture) moved to the keyed Round 2 block on 31 Oct 2026 (crisc_d4_021; also crisc_d4_046). SI-12 moved to the keyed SP 800-53 block on 31 Oct 2026 (crisc_d4_008).

### Not opened (context only)
  - ISO/IEC 27001:2022: named in notes 4B1.3 as context (crisc_d4_016 no longer names it after the 30 Oct 2026 re-angle); iso.org is blocked, so no ISO bullet is proposed.
  - COBIT 2019 BAI06, DSS02, DSS03, APO03, APO05, BAI11, DSS04, APO14: not cited. The isaca.org COBIT page I opened lists no objective titles; a third-party search result showed "DSS03 Managed Problems", "BAI06 Managed IT Changes" and "APO03 Managed Enterprise Architecture", which would be Likely only. The D1 bullets cite an ISACA white paper Figure 2 that may confirm these titles for a later batch.
