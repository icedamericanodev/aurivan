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
  - Verified, 30 Oct 2026, against the SP 800-34 Rev. 1 PDF (CSRC page https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final). 2.2.1: the BCP sustains mission/business processes; 2.2.6: the DRP is information system-focused. 3.5: test, training and exercise events periodically and after changes; tests as close to the operating environment as possible. The Section 2.2 string (same as the CC library) is in the not-yet-used list below.

### NIST AI 100-1 (AI RMF 1.0, January 2023)
- NIST AI 100-1 (AI RMF 1.0) GOVERN 1.6 (mechanisms are in place to inventory AI systems)
- NIST AI 100-1 (AI RMF 1.0) GOVERN 2.1 (roles, responsibilities and lines of communication for AI risks are documented and clear)
  - All Verified, 30 Oct 2026, against https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf, Table 1 (GOVERN subcategories), pages 22 to 23. GOVERN 1.6 uses the same string as the CC library.

### Named in notes as context only (not keyed, hosts blocked)
ISO 31000:2018, COSO ERM (2017), the IIA Three Lines Model (2020) and the EU AI Act (Regulation (EU) 2024/1689) are named in the notes as context only. Not added as bullets.

### Opened and checked, not yet used by an item (add as bullets when a later D1 batch cites them)
  - `ISACA Glossary (risk capacity)`
  - `ISACA Glossary (risk aggregation)`
  - `ISACA Glossary (current risk)`, `ISACA Glossary (residual risk)`, `ISACA Glossary (risk response)`, `ISACA Glossary (maximum tolerable outage)`, `ISACA Glossary (acceptable interruption window)`, `ISACA Glossary (recovery time objective)`: opened 31 Oct 2026 for the D1 notes (current risk counts actions already taken, not proposed ones; residual risk remains after a response is implemented; the risk response entry calls the planned level "future residual risk"; MTO is the longest a critical business function or IT system can be disrupted before significant harm; AIW is the longest a system can be unavailable before business objectives are compromised; RTO is the time allowed to recover a business function or resource). The Glossary has no MTD entry.
  - `ISACA Glossary (guideline)`
  - `ISACA Glossary (business continuity plan)`
  - `ISACA Glossary (asset inventory)`
  - `ISACA Glossary (enterprise risk management)`
  - `NIST CSF 2.0 GV.RM-03 (cybersecurity risk management activities and outcomes are included in enterprise risk management processes)`
  - `NIST CSF 2.0 GV.RR-01 (organizational leadership is responsible and accountable for cybersecurity risk and fosters a culture that is risk-aware, ethical and continually improving)`
  - `NIST CSF 2.0 ID.AM-02 (inventories of software, services and systems managed by the organization are maintained)`
  - `NIST CSF 2.0 ID.AM-05 (assets are prioritized based on classification, criticality, resources and impact on the mission)`
  - `NIST IR 8286 Rev. 1 Section 2.2 (The Gap Between CSRM Output and ERM Input)`
  - `NIST SP 800-34 Rev. 1 Section 2.2 (Types of Plans: Business Continuity Plan and Disaster Recovery Plan)`
  - `NIST AI 100-1 (AI RMF 1.0) GOVERN 1.1 (legal and regulatory requirements involving AI are understood, managed and documented)`
  - `NIST AI 100-1 (AI RMF 1.0) GOVERN 2.3 (executive leadership takes responsibility for decisions about risks of AI system development and deployment)`

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
  - Verified, 31 Oct 2026, same page: "The maximum period of time that a system can be unavailable before compromising the achievement of the enterprise's business objectives". Defined in notes 2B2.2; not keyed.
- ISACA Glossary (control owner)
  - Verified, 31 Oct 2026, same page: the person assigned "the authority and accountability for making control-related decisions" and "responsible for ensuring that the control is implemented and is operating effectively and efficiently". Defined in notes 2B3.1 (since repair round 1, 31 Oct 2026, the key term carries the Glossary wording alone; KaiSip's "often the manager whose team runs the control" sits in how_it_works, unattributed); used in the explanations of crisc_d2_002, crisc_d2_019 and crisc_d2_020; not keyed in Domain 2.
- ISACA Glossary (impact analysis)
  - Verified, 31 Oct 2026, same page opened again: "A study to prioritize the criticality of information resources for the enterprise based on the costs (or consequences) of adverse events. In an impact analysis, threats to assets are identified and potential business losses are determined for different time periods." Not keyed. Because of this entry, crisc_d2_011 (repair round 1) no longer says a BIA never looks at threats; its key rests on likelihood, which neither this entry nor the BIA entry says is estimated.
- ISACA Glossary (key control indicator)
  - Verified, 31 Oct 2026, same page: "A measure of the effectiveness of controls to indicate a failure or weakness which may result in the increased likelihood or impact of risk events". Defined in notes 2B5.2 (repair round 1, replacing KPI-style "how well a control is performing" wording); not keyed in Domain 2.

### COBIT 2019
- COBIT 2019 APO12.01 (Collect Data)
  - Verified (title), 30 Oct 2026: ISACA Industry News article "Evaluating Business Service Continuity and Availability Using COBIT 2019" (2020) lists APO12 Managed risk with practices APO12.01 Collect data, APO12.02 Analyze risk, APO12.03 Maintain a risk profile, APO12.04 Articulate risk, APO12.05 Define a risk management action portfolio, APO12.06 Respond to risk. Practice title only; fit to loss-event and AI event data judged by the author. Used in crisc_d2_001, crisc_d2_002.
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
- NIST SP 800-30 Rev. 1 Section 2.3.2 (Assessment Approaches: quantitative assessments support cost-benefit analysis of risk responses)
  - Same form as the CC library. Verified again 30 Oct 2026. 800-30 does not use SLE, ARO or ALE. Used in crisc_d2_016.
- NIST SP 800-30 Rev. 1 Section 2.3.2 (Assessment Approaches: subjective inputs or high uncertainty lessen quantitative rigor)
  - New. Verified, 30 Oct 2026, nvlpubs PDF: "the rigor of quantification is significantly lessened when subjective determinations are buried within the quantitative assessments, or when significant uncertainty surrounds the determination of values". Used in crisc_d2_017.
- NIST SP 800-30 Rev. 1 Section 2.3.3 (Analysis Approaches: threat-oriented, asset/impact-oriented and vulnerability-oriented)
  - New. Verified, 30 Oct 2026: differences in the starting point can bias results so some risks are not identified; adding a second orientation improves rigor. Fits an exercise that exposes a missed business dependency. Used in crisc_d2_008.
- NIST SP 800-30 Rev. 1 Section 3.1 (Preparing for the Risk Assessment: purpose, scope, assumptions, information sources and risk model)
  - New. Verified, 30 Oct 2026: Step 1 tasks 1-1 to 1-5 (purpose; scope; assumptions and constraints; sources of threat, vulnerability and impact information; risk model and analytic approach). Used in crisc_d2_009.
- NIST SP 800-30 Rev. 1 Section 3.3 (Communicating and Sharing Risk Assessment Information)
  - New. Verified, 30 Oct 2026: Task 3-1 communicates results to organizational decision makers to support risk responses; Task 3-2 shares risk-related information. Used in crisc_d2_010.
- NIST SP 800-30 Rev. 1 Section 3.4 (Maintaining the Risk Assessment)
  - Same form as the CC library. Verified again 30 Oct 2026: keep risk knowledge current by monitoring risk factors and updating the assessment. Used in crisc_d2_001, crisc_d2_010.
- NIST SP 800-30 Rev. 1 Appendix D Table D-2 (Taxonomy of Threat Sources: adversarial, accidental, structural and environmental)
  - New. Verified, 30 Oct 2026: adversarial (outsider, insider, trusted insider, privileged insider, groups, organizations incl. supplier and partner, nation-state); accidental ("erroneous actions taken by individuals in the course of executing their everyday responsibilities", incl. privileged user/administrator); structural (IT equipment, environmental controls, software); environmental (natural or man-made disaster, infrastructure outage). Used in crisc_d2_003.

### SP 800-34 Rev. 1, Contingency Planning Guide for Federal Information Systems (May 2010, updated Nov 2010)
- NIST SP 800-34 Rev. 1 Section 3.2.1 (Determine Business Processes and Recovery Criticality: MTD, RTO and RPO)
  - Same form as the CC library. Verified again 30 Oct 2026, nvlpubs PDF: process owners, leadership and business managers determine acceptable downtime; MTD is what the system owner or authorizing official is willing to accept; the RTO must normally be shorter than the MTD; RPO reflects how much data loss the process can tolerate. Used in crisc_d2_012. NIST's MTD is the ISACA Glossary's maximum tolerable outage (MTO); since 31 Oct 2026 the D2 notes and crisc_d2_012's explanation use MTO, keeping MTD only in this NIST citation.

### IR 8286 Rev. 1, Integrating Cybersecurity and Enterprise Risk Management (ERM) (Dec 2025)
- NIST IR 8286 Rev. 1 Section 3 Table 1 (Descriptions of notional cybersecurity risk register template elements)
  - New. Verified, 30 Oct 2026, nvlpubs.nist.gov/nistpubs/ir/2025/NIST.IR.8286r1.pdf (published 18 Dec 2025; supersedes IR 8286, Oct 2020): elements include risk description (threats, assets, methods and impacts in every scenario), current assessment likelihood, impact and exposure rating, risk response type and description, risk owner ("responsible and accountable"), status. The text before Table 1 explains current risk versus inherent risk. Note on terms: Table 1's "Current Assessment" columns mean the estimate before any (further) risk response, which later cycles call inherent; this differs from the ISACA Glossary's "current risk" (risk as it stands, counting actions already taken). crisc_d2_013 pairs the two because the text after Table 1 keeps the current assessment separate from anticipated changes from a planned response, which is the item's point. Used in crisc_d2_013.
- NIST IR 8286 Rev. 1 Section 3.5.2 (Responding to Residual Risk)
  - New. Verified, 30 Oct 2026: residual risk remains after a response; if beyond the acceptable level the risk owner evaluates further action; enterprise risk officers analyze residual risk against appetite and tolerance set by senior leadership, and senior management makes final decisions. Used in crisc_d2_018, crisc_d2_020.
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
  - New. Verified, 30 Oct 2026: quotes IEC 31010:2019 that the main criteria for choosing qualitative or quantitative techniques are the output most useful to stakeholders and the availability and reliability of data; quantitative techniques generally need high-quality data. Used in crisc_d2_017.
- NIST IR 8286A Rev. 1 Section 2.2.2 (Determination of Potential Threats)
  - New. Verified, 30 Oct 2026: threat enumeration combines data-driven threat awareness with business judgment; lists ISACs, technical threat models and MITRE ATT&CK as inputs. Supports notes 2A2.2; not keyed in the pilot.

### CSF 2.0 (NIST CSWP 29, Feb 2024)
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
- NIST AI 100-2 E2025 Section 2.4.4 (Model Extraction)
  - New. Verified, 30 Oct 2026: an attacker queries a model to extract its architecture and parameters; a functionally equivalent model can be rebuilt. Supports notes 2A2.3; not keyed in the pilot. (Model inversion is covered in Section 2.4.1 Data Reconstruction.)

### FIRST
- FIRST Common Vulnerability Scoring System (CVSS) v4.0 Specification Document Section 1 (Introduction)
  - Same form as the CC library. Verified again 30 Oct 2026, first.org/cvss/v4-0/specification-document (Document Version 1.2): CVSS communicates characteristics and severity; consumers enrich Base with Threat and Environmental metrics for "a more comprehensive input to risk assessment"; vulnerability management also weighs factors outside CVSS (regulation, customers affected, monetary loss, safety, reputation). Used in crisc_d2_005.

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
  - All Verified, 30 Oct 2026, against NIST.IR.8286B-upd1.pdf (nvlpubs.nist.gov; csrc.nist.gov lists Feb 2025, superseding the Feb 2022 original). 2.3.1: acceptance is first considered when exposure is already acceptable under risk tolerance, and the risk "must be reported, monitored, and managed" (crisc_d3_002). 2.3.2: if exposure exceeds tolerance, the risk owner may decide not to conduct the activity; the text notes it is rare that no mix of transfer and mitigation would work (crisc_d3_003). 2.3.4: mitigation applies controls listed as preventative, deterrent, detective, corrective and compensating, with a definition and example for each (crisc_d3_003, crisc_d3_008, crisc_d3_009). 2.4.3: the risk owner column names who ensures the response is implemented; escalation happens when a threshold or time frame is reached, and elevation moves the decision to a more senior stakeholder (cited by crisc_d3_005 and crisc_d3_016 until 31 Oct 2026; both items were re-angled in the cross-domain fix, so this bullet is currently unused by D3).

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
  - All Verified, 30 Oct 2026, against NIST.CSWP.29.pdf (nvlpubs.nist.gov), subcategory text read. GV.RR-02, ID.RA-06 and ID.RA-07 use the same strings as the CC library. GV.SC-07 (crisc_d3_006; string aligned on 31 Oct 2026 with the D4 block's CSWP 29 wording, "The risks posed by a supplier, their products and services, and other third parties are understood, recorded, prioritized, assessed, responded to, and monitored over the course of the relationship"), GV.RM-02 (crisc_d3_016 and crisc_d3_019; same string as the D1 block and the CC library, text read in the CSWP 29 PDF on 30 Oct 2026: "Risk appetite and risk tolerance statements are established, communicated, and maintained"; it replaced GV.OV-01, a loose fit for board-report content, after the audit), GV.RR-02 (crisc_d3_005 and crisc_d3_011), ID.RA-06 (crisc_d3_013), ID.RA-07 (crisc_d3_007).

### NIST AI 100-1, AI Risk Management Framework (AI RMF 1.0, Jan 2023)
- NIST AI 100-1 (AI RMF 1.0) GOVERN 1.1 (legal and regulatory requirements involving AI are understood, managed and documented)
- NIST AI 100-1 (AI RMF 1.0) GOVERN 3.2 (roles and responsibilities for human-AI configurations and oversight of AI systems are defined)
- NIST AI 100-1 (AI RMF 1.0) MANAGE 1.3 (responses to high-priority AI risks are developed, planned and documented, including mitigating, transferring, avoiding or accepting)
- NIST AI 100-1 (AI RMF 1.0) MEASURE 2.4 (the functionality and behavior of the AI system are monitored when in production)
- NIST AI 100-1 (AI RMF 1.0) MANAGE 4.1 (post-deployment monitoring plans, including capturing user input, appeal and override)
  - All Verified, 30 Oct 2026, against NIST.AI.100-1.pdf (nvlpubs.nist.gov), Tables 1, 3 and 4. GOVERN 3.2, MEASURE 2.4 and MANAGE 4.1 use the same strings as the CC library. MANAGE 1.3 says risk response options "can include mitigating, transferring, avoiding, or accepting" (crisc_d3_004). GOVERN 1.1 (crisc_d3_020), GOVERN 3.2 (crisc_d3_004), MEASURE 2.4 and MANAGE 4.1 (crisc_d3_017).

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

### Opened for the notes only (not used as framework_ref)
  - NIST SP 800-218 (SSDF Version 1.1, Feb 2022): practice groups PO, PS, PW, RV and practice titles PO.1, PW.1, PW.8, RV.3 read; Section 1 says secure practices are integrated into any SDLC model, including Agile and DevOps. Checked again 31 Oct 2026: v1.1 is still the final edition; SP 800-218 Rev. 1 (SSDF Version 1.2) is an initial public draft published 17 Dec 2025 (comments closed 30 Jan 2026), so the notes cite v1.1 and name the draft.
  - NIST SP 800-218A (Secure Software Development Practices for Generative AI and Dual-Use Foundation Models: An SSDF Community Profile, Jul 2024): title page read.
  - NIST SP 800-207 (Zero Trust Architecture, Aug 2020): Section 2.1 Tenets heading and implicit-trust text read.
  - NIST SP 800-37 Rev. 2 (Dec 2018): agile and iterative development references read.
  - NIST FIPS 203 (Module-Lattice-Based Key-Encapsulation Mechanism Standard): csrc.nist.gov page shows Date Published 13 Aug 2024.
  - NIST SP 800-53 Rev. 5 PM-7 (Enterprise Architecture) and CP-7(1) (Alternate Processing Site | Separation from Primary Site): text read; candidates for later D4 batches. SI-12 moved to the keyed SP 800-53 block on 31 Oct 2026 (crisc_d4_008).

### Not opened (context only)
  - ISO/IEC 27001:2022: named in notes 4B1.3 as context (crisc_d4_016 no longer names it after the 30 Oct 2026 re-angle); iso.org is blocked, so no ISO bullet is proposed.
  - COBIT 2019 BAI06, DSS02, DSS03, APO03, APO05, BAI11, DSS04, APO14: not cited. The isaca.org COBIT page I opened lists no objective titles; a third-party search result showed "DSS03 Managed Problems", "BAI06 Managed IT Changes" and "APO03 Managed Enterprise Architecture", which would be Likely only. The D1 bullets cite an ISACA white paper Figure 2 that may confirm these titles for a later batch.
