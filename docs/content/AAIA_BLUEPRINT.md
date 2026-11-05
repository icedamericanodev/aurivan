# ISACA AAIA blueprint (Advanced in AI Audit)

Checked 30 Oct 2026 against ISACA's own pages and the AAIA Exam Candidate Guide
(sources at the end). This is the outline KaiSip's AAIA notes and questions
follow. Codes 1A … 3E match ISACA's outline; use them as the `subtopic` prefix
(for example `"1C AI risk management. Risk ownership"`). Notes subtopics are
KaiSip's own numbering below each code (1A.1, 1A.2 …).

Tasks are paraphrased. Short headings in quotes are ISACA's.

## Exam facts

| Fact | Value | Source |
|---|---|---|
| Outline in force | "AAIA Examination Content Outline (June 2025)", the guide's appendix. The live outline page lists the same three domains, 17 areas and 23 tasks | S1, S2 |
| Newer outline? | None announced as of 30 Oct 2026. (The November 2026 ISACA change people mention is CISM's.) | S2, S6 |
| Length | 90 multiple-choice questions, 2.5 hours (150 minutes) | S1 |
| Scored / unscored | ISACA exams mix scored items with unscored pre-test items; the guide gives no count for AAIA | S1 |
| Scoring | Scaled 200–800; 450 or higher passes. Domain results are informational only; the score counts total correct items regardless of domain | S1 |
| Languages | English, Simplified Chinese, Spanish | S1 |
| Delivery | Computer-based, at PSI test centers or by live remote proctoring. Residents of India, Mainland China and Hong Kong: test centers only (checked on S3, 31 Oct 2026) | S1, S3 |
| Fees | US$459 ISACA members, US$599 non-members; non-refundable | S1 |
| Retakes | Four attempts in a rolling 12 months: wait 30 days before attempt 2, then 90 days before attempts 3 and 4 | S1 |
| Prerequisite | An active credential from the Qualified Prerequisite List (below) | S1 |
| Certification steps | Prerequisite credential, pass the exam, US$50 application fee, application, then the ISACA Code of Professional Ethics, the CPE policy and the IS Auditing Standards | S1 |

KaiSip's mock exam is a practice form of 90 four-option items in 150 minutes.
It must say practice scores are not scaled exam scores.

### Qualified Prerequisite List (copied from the guide, S1)

All holders qualify:
- CISA (Certified Information Systems Auditor from ISACA)

If you do not have a CISA but hold one of the following credentials, you are
qualified as long as you have an IT audit or IT advisory role:
- CIA (Certified Internal Auditor from the Institute of Internal Auditors, IIA)
- US CPA (Certified Public Accountant from one of the US state boards of accountancy)
- ACCA Chartered Certified Accountant (ACCA) issued by the Association of Chartered Certified Accountants (ACCA)
- ACCA Fellow of the ACCA (FCCA) issued by ACCA
- Australian Certified Practicing Accountant (CPA) issued by CPA Australia
- Australian Fellow Certified Practicing Accountant (FCPA) issued by CPA Australia
- Japanese Certified Public Accountant (CPA) issued by the Japan Financial Services Agency
- Canadian Chartered Professional Accountant (CPA) issued by the Canadian Provincial Accounting Bodies
- ICAEW Associate Chartered Accountant (ACA) issued by Institute of Chartered Accountants in England and Wales (ICAEW)
- ICAEW Fellow Chartered Accountant (FCA)
- Certified National Accountant (CNA) issued by the Association of National Accountants of Nigeria (ANAN)
- Chartered Accountant (CA) issued by the Chartered Accountants Australia and New Zealand (CA ANZ)
- Fellow Chartered Accountant (FCA) issued by the Chartered Accountants Australia and New Zealand (CA ANZ)
- Hong Kong Certified Public Accountant (CPA) issued by the Hong Kong Institute of Certified Public Accountants (HKICPA)
- Hong Kong Fellow Certified Public Accountant (FCPA) issued by the Hong Kong Institute of Certified Public Accountants (HKICPA)

What it means for content: every candidate already audits for a living. AAIA
items skip audit basics and test the audit lens applied to AI.

## Domains and areas

The outline has two levels only: three domains and 17 areas. ISACA's
one-line domain summaries on the outline page are paraphrased here.

### Domain 1: AI Governance and Risk (33%)
Advising stakeholders on AI that meets strategic goals, ethical and responsible
AI policy and governance, and managing implementation risk, including data
governance, privacy and security.

| Code | ISACA heading | Covers (KaiSip's reading) |
|---|---|---|
| 1A | "AI Models, Considerations, and Requirements" | Kinds of AI (predictive, generative, agentic); how models learn; what a model needs (data, compute, oversight); business and system requirements; fit with enterprise architecture |
| 1B | "AI Governance and Program Management" | AI strategy, policy and inventory; roles, a named owner for every model and AI decision; committees; AI program metrics; awareness and workforce impact |
| 1C | "AI Risk Management" | AI risk identification and assessment; appetite and tolerance; ownership of AI risk; AI KRIs; third-party and supply-chain AI risk |
| 1D | "Privacy and Data Governance Programs" | Data governance for AI (ownership, quality, lineage, rights to use); privacy by design; personal data in training and prompts; impact assessments; retention and deletion |
| 1E | "Leading Practices, Ethics, Regulations, and Standards for AI" | Trustworthy-AI characteristics; fairness, transparency, explainability, accountability; risk-based regulation; frameworks (NIST AI RMF, ISO/IEC 42001 as context); mapping obligations to controls |

### Domain 2: AI Operations (46%)
Assessing the organization's AI risk profile, the rewards and consequences of
AI implementations, and whether operations are ready to adopt AI.

| Code | ISACA heading | Covers (KaiSip's reading) |
|---|---|---|
| 2A | "Data Management specific to AI" | Data sourcing, labeling and provenance; representativeness and bias in inputs; data quality; training, validation and test splits; feature and data pipelines; data for retrieval (RAG) |
| 2B | "AI Solution Development Methodologies and Lifecycle" | The AI lifecycle from design to decommissioning; MLOps; model documentation; build, buy or tune; stage gates; decommissioning |
| 2C | "Change Management specific to AI" | Retraining and model updates as changes; prompt and configuration changes; versioning; vendor model updates; configuration management |
| 2D | "Supervision of AI Solutions (e.g., outputs, impacts, and decisions)" | Human oversight and override; monitoring outputs, drift and impacts; performance metrics; appeal routes for affected people; AI decision logs |
| 2E | "Testing Techniques for AI Solutions" | Validation and TEVV (test, evaluation, verification and validation); performance and fairness testing; robustness and red teaming; independent validation; testing generative output |
| 2F | "Threats and Vulnerabilities specific to AI" | Poisoning, evasion, model extraction and inversion; prompt injection and jailbreaks; supply chain; excessive agency; access to models and data (IAM for AI) |
| 2G | "Incident Response Management specific to AI" | What counts as an AI incident; detection and triage; disengaging a model; containment and recovery; problem management and lessons learned; reporting |

### Domain 3: AI Auditing Tools and Techniques (21%)
Audit techniques tailored to AI systems, and using AI-enabled tools to make
the audit itself more efficient and insightful.

| Code | ISACA heading | Covers (KaiSip's reading) |
|---|---|---|
| 3A | "Audit Planning and Design" | Risk-based AI audit universe and plan; scoping an AI system; criteria; skills and specialists; independence; planning the use of AI in the audit |
| 3B | "Audit Testing and Sampling Methodologies" | Testing design and operating effectiveness of AI controls; sampling model decisions and outputs; reperformance; testing with AI tools across full populations |
| 3C | "Audit Evidence Collection Techniques" | Evidence for AI (model cards, logs, lineage, validation reports, vendor attestations); sufficiency and reliability; evidence produced by AI tools |
| 3D | "Audit Data Quality and Data Analytics" | Completeness and accuracy of audit data; analytics and AI-assisted analytics; validating the tool before relying on it; data privacy in the audit |
| 3E | "AI Audit Outputs and Reports" | Findings on AI (condition, criteria, cause, effect); rating and reporting; explaining AI findings to the board; follow-up; disclosing use of AI in the audit |

## Outline lines for the notes linter

`python3 scripts/lint_notes.py data/aaia/notes/dN.json --outline docs/content/AAIA_BLUEPRINT.md --bank data/aaia/originals`
reads these lines (one topic per line, `- <code> <title>`).

- 1A AI Models, Considerations, and Requirements
- 1B AI Governance and Program Management
- 1C AI Risk Management
- 1D Privacy and Data Governance Programs
- 1E Leading Practices, Ethics, Regulations, and Standards for AI
- 2A Data Management Specific to AI
- 2B AI Solution Development Methodologies and Lifecycle
- 2C Change Management Specific to AI
- 2D Supervision of AI Solutions
- 2E Testing Techniques for AI Solutions
- 2F Threats and Vulnerabilities Specific to AI
- 2G Incident Response Management Specific to AI
- 3A Audit Planning and Design
- 3B Audit Testing and Sampling Methodologies
- 3C Audit Evidence Collection Techniques
- 3D Audit Data Quality and Data Analytics
- 3E AI Audit Outputs and Reports

## Supporting tasks

The guide lists 23 tasks that cut across the areas (ISACA does not map them to
areas). Paraphrased, with the areas KaiSip teaches them in:

| # | Task (paraphrased) | Main areas |
|---|---|---|
| 1 | Weigh the impacts, opportunities and risks of bringing AI into the audit process | 3A, 3D |
| 2 | Use AI to improve audit planning, fieldwork and reporting | 3A–3E |
| 3 | Assess AI solutions to advise the organization on impact, opportunity and risk | 1A, 1C |
| 4 | Assess how AI affects connected systems, the environment and people | 1A, 2D |
| 5 | Assess the role and effects of AI decision-making systems on the organization and stakeholders | 1B, 2D |
| 6 | Assess AI policies and procedures, including legal and regulatory compliance | 1B, 1E |
| 7 | Assess how AI metrics (KPIs and KRIs) are monitored and reported | 1C, 2D |
| 8 | Check that ownership of AI risk, controls, procedures, decisions and standards is defined | 1B, 1C |
| 9 | Assess the data governance program for AI | 1D, 2A |
| 10 | Assess the privacy program for AI | 1D |
| 11 | Assess problem and incident management for AI | 2G |
| 12 | Assess change management for AI | 2C |
| 13 | Assess configuration management for AI | 2C |
| 14 | Assess threat and vulnerability management for AI | 2F |
| 15 | Assess identity and access management for AI | 2F |
| 16 | Assess vendor and supply-chain management for AI | 1C, 2B |
| 17 | Assess the design and effectiveness of AI controls | 2E, 3B |
| 18 | Assess data input requirements for models (fitness, bias, privacy) | 2A, 1D |
| 19 | Assess system and business requirements for AI against enterprise architecture | 1A, 2B |
| 20 | Assess the AI lifecycle and its inputs and outputs for compliance and risk | 2B |
| 21 | Assess whether algorithms and models serve business objectives, policies and procedures | 1A, 2E |
| 22 | Analyze AI's effect on the workforce to advise on training and education | 1B |
| 23 | Check that awareness programs match the AI policies and procedures | 1B |

## The AAIA lens (how the exam thinks)

- **Who the candidate is:** a senior IT auditor (CISA or equivalent) auditing
  AI, and using AI in the audit. Not the data scientist, the model owner, the
  CISO or the risk owner.
- **The auditor assesses, recommends and reports.** The auditor never builds,
  tunes, approves, deploys or owns an AI system, and never accepts AI risk.
  Management, the model owner and the board decide.
- **Accountability first.** Every model and every AI-made decision has a named
  human owner. "The AI decided" is never an acceptable answer.
- **Governance before tooling.** Inventory, policy, ownership and risk
  assessment come before a new tool or a technical fix.
- **Evidence and explainability.** An AI output the auditor can't explain,
  reproduce or trace to its data is not reliable evidence. Vendor claims and
  accuracy scores are inputs, not assurance.
- **Human oversight.** High-impact AI decisions need a human who can understand,
  override and stop them, and an appeal route for the people affected.
- **Risk-based.** Audit effort follows the likelihood and impact of harm to
  people and the business (as in CISA's `risk-sets-priority`), not novelty or
  technical complexity.
- **Lifecycle view.** Data, design, validation, deployment, monitoring and
  decommissioning are all in scope; a one-time validation is not ongoing
  assurance.
- **Harder than CISA on AI.** AAIA assumes CISA knowledge (evidence, sampling,
  independence, reporting) and does not re-test it on its own. Stems use AI
  facts that a CISA-only candidate would weigh wrongly.

Lens leakage is a hard error in review: a CRISC "the risk owner decides the
response" or a CISM "the security manager runs the program" keyed as the
auditor's move, or the auditor fixing, tuning or approving the model.

### What AAIA reuses from CISA

KaiSip's CISA notes already teach "Using AI in the Audit" and "Auditing AI
Systems" (`data/cisa_notes.json`), and the CISA bank has about 25 AI items
(for example `d1_018`, `d1_057`, `d1_080`, `d1_119`, `d1_162`, `d1_174`,
`d1_218`, `d2_117`, `d2_163`, `d2_220`, `d2_225`, `d3_074`, `d4_107`,
`d4_209`, `d4_247`, `d5_248`). AAIA items go deeper than these and must not
reuse their scenarios. AAIA principles extend CISA's (for example
`recommend-dont-implement`, `management-owns-risk`, `evidence-quality`,
`governance-before-technology`) rather than contradicting them.

## Question targets (bank of 1,000)

Scaled by weight: 330 / 460 / 210. Inside each domain, areas get a near-even
split, nudged toward the areas with the most supporting tasks.

| Domain | Weight | Target | Per area |
|---|---|---|---|
| D1 AI Governance and Risk | 33% | 330 | 1A 64 · 1B 70 · 1C 70 · 1D 64 · 1E 62 |
| D2 AI Operations | 46% | 460 | 2A 70 · 2B 66 · 2C 62 · 2D 70 · 2E 66 · 2F 70 · 2G 56 |
| D3 AI Auditing Tools and Techniques | 21% | 210 | 3A 44 · 3B 44 · 3C 42 · 3D 42 · 3E 38 |
| Total | | 1,000 | |

On a 90-item exam the weights work out to about 30 / 41 / 19 items; that
reading is KaiSip's, not ISACA's. Mix inside each domain: about 25% recall,
50% application, 25% analysis (AAIA is an advanced exam). Keep the bank size
out of learner copy.

## Sources KaiSip can cite

Opened from the cloud environment on 30 Oct 2026 (Verified in
`data/aaia/originals/_framework_library.md`):
- NIST AI 100-1, AI Risk Management Framework (AI RMF 1.0), Jan 2023.
- NIST AI 600-1, AI RMF Generative AI Profile, Jul 2024.
- NIST AI 100-2e2025, Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations, Mar 2025.
- NIST CSF 2.0 (CSWP 29), Feb 2024.
- MITRE ATLAS technique IDs, from the ATLAS data file version 5.6.0 (raw.githubusercontent.com).
- NIST SP 800-53 Rev. 5 control titles (already verified in the CISA library).

Name only as context, never as a keyed citation, until the host is allowed:
- ISO/IEC 42001:2023 and ISO/IEC 23894:2023 (iso.org blocked).
- The EU AI Act, Regulation (EU) 2024/1689 (eur-lex.europa.eu blocked).
- OWASP Top 10 for LLM Applications 2025 (genai.owasp.org blocked; owasp.org's
  project page opens and points to it). Its entry titles are "Likely" until opened.
- IIA and COSO material (theiia.org and coso.org blocked).

ISACA publications (ITAF 4th edition standard numbers per
`docs/content/ITAF_4TH_EDITION.md`; COBIT 2019; the AI Audit Toolkit, a paid
ISACA product) may be cited by name and number, never quoted.

## Trademarks

- ISACA® and CISA® are registered marks of ISACA. AAIA is a trademark of ISACA
  and is not registered: never write AAIA®. (ISACA's own pages write
  "AAIA™"; KaiSip's notice does not need the ™.)
- Notice, as in `mobile/src/content/certifications.ts`: "Not affiliated with or
  endorsed by ISACA®. AAIA is a trademark of ISACA."
- Product names lead with KaiSip or a generic course name and put the exam after
  "for": "KaiSip AI Audit course, 6 months (for the AAIA exam)" (52 characters;
  Google Play allows 55). iOS display name (30 max): "KaiSip AI Audit, 6 months".
- ISACA's own pages write "ISACA Advanced in AI Audit™ (AAIA™)", and a US
  trademark application for the composite mark "AAIA ISACA ADVANCED IN AI AUDIT"
  (USPTO 99164468, filed 30 Apr 2025) was still pending on 30 Oct 2026. The app
  shows "Advanced in AI Audit" as the course's full name, but the notice names
  only AAIA. Before AAIA goes live, the maintainer decides between dropping that
  subtitle and extending the notice to "AAIA and Advanced in AI Audit are
  trademarks of ISACA." (legal item, escalated).
- Never call KaiSip content official, approved or endorsed; never say "Pass" as
  a product name; never promise a pass.
- ISACA sells its own AAIA review manual, QAE database and online course. Never
  copy or closely paraphrase them, or any other prep bank. Quote only short
  headings from the outline.

## Open items

- ISACA does not say how many of the 90 items are unscored pre-test items for
  AAIA.
- NIST AI RMF 1.0 (Jan 2023) is still current, but NIST's AI RMF page says it is
  being revised under the White House AI Action Plan (no draft as of 30 Oct
  2026). Re-check before each release; trustworthy-AI and fairness items lean on it.
- Whether ISACA plans an AAIA outline refresh (none announced). Re-check the
  outline page every six months and before each bank release.
- Store copy that names the June 2025 outline must be re-checked with the
  outline (every six months and before each release).
- The trademark decision on the full name "Advanced in AI Audit" (see Trademarks).
- Allowing iso.org, eur-lex.europa.eu and genai.owasp.org would let ISO/IEC
  42001, the EU AI Act and the OWASP 2025 list become Verified citations.

## Sources

- S1 AAIA Exam Candidate Guide (PDF created 31 Mar 2026, modified 24 Apr 2026), https://www.isaca.org/-/media/files/isacadp/project/isaca/certification/aaia/aaia-exam-candidate-guide.pdf (Program summary; Scoring; Retake policy; Certification; Appendix "AAIA Examination Content Outline (June 2025)" and Supporting Tasks)
- S2 AAIA exam content outline page, https://www.isaca.org/credentialing/aaia/aaia-exam-content-outline
- S3 AAIA credential page, https://www.isaca.org/credentialing/aaia
- S4 NIST AI 100-1, https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf
- S5 NIST AI 600-1, https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
- S6 Web search, 30 Oct 2026: no ISACA announcement of an AAIA outline change; the 3 Nov 2026 change is to CISM
- S7 NIST AI 100-2e2025, https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf
- S8 MITRE ATLAS data v5.6.0, https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/ATLAS.yaml
