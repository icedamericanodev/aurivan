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
- NIST AI 100-1 MEASURE 2.5 (System shown to be valid and reliable, limits documented)
- NIST AI 100-1 MEASURE 2.6 (Evaluated regularly for safety risks, fails safely)
- NIST AI 100-1 MEASURE 2.7 (Security and resilience evaluated and documented)
- NIST AI 100-1 MEASURE 2.8 (Transparency and accountability risks examined)
- NIST AI 100-1 MEASURE 2.9 (Model explained, validated and documented, output interpreted in context)
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
- NIST AI 100-1 Executive Summary (Framework intended to be voluntary and use-case agnostic)
  - Verified 30 Oct 2026: page 2 says the Framework "is intended to be voluntary, rights-preserving, non-sector-specific, and use-case agnostic".
- NIST AI 100-1 Section 1.2.2 (Risk Tolerance)
  - Verified 19 Nov 2026: "1.2.2 Risk Tolerance" in the table of contents (page 7) and as the section heading; it says "While the AI RMF can be used to prioritize risk, it does not prescribe risk tolerance", that risk tolerance is "highly contextual and application and use-case specific", that organizations "should follow existing regulations and guidelines for risk criteria, tolerance, and response", and "Where established guidelines do not exist, organizations should define reasonable risk tolerance."
- NIST AI 100-1 Section 1.2.3 (Risk Prioritization)
  - Verified 20 Nov 2026: "1.2.3 Risk Prioritization" in the table of contents (page 7) and as the section heading (pages 7-8); it says "Policies and resources should be prioritized based on the assessed risk level and potential impact of an AI system", that where risks are unacceptable "development and deployment should cease in a safe manner until risks can be sufficiently managed", and that residual risk "directly impacts end users or affected individuals and communities. Documenting residual risks will call for the system provider to fully consider the risks of deploying the AI product and will inform end users about potential negative impacts of interacting with the system."
- NIST AI 100-1 Section 3 (AI Risks and Trustworthiness)
  - Verified 30 Oct 2026: the seven characteristics (valid and reliable; safe; secure and resilient; accountable and transparent; explainable and interpretable; privacy-enhanced; fair with harmful bias managed).
- NIST AI 100-1 Section 3.1 (Valid and Reliable)
  - Verified 12 Nov 2026: "3.1 Valid and Reliable" in the table of contents (page 13) and as the section heading; it defines validation as "confirmation, through the provision of objective evidence, that the requirements for a specific intended use or application have been fulfilled" and reliability as the "ability of an item to perform as required, without failure, for a given time interval, under given conditions". The Fig. 4 caption (in Section 3) says Valid & Reliable "is a necessary condition of trustworthiness and is shown as the base for other trustworthiness characteristics".
- NIST AI 100-1 Section 3.2 (Safe)
  - Verified 18 Nov 2026: "3.2 Safe" in the table of contents (page 14) and as the section heading; it says AI systems should not "lead to a state in which human life, health, property, or the environment is endangered", and (page 15) that practical approaches to AI safety include "rigorous simulation and in-domain testing, real-time monitoring, and the ability to shut down, modify, or have human intervention into systems that deviate from intended or expected functionality".
- NIST AI 100-1 Section 3.3 (Secure and Resilient)
  - Verified 12 Nov 2026: "3.3 Secure and Resilient" in the table of contents (page 15) and as the section heading; it says "Common security concerns relate to adversarial examples, data poisoning, and the exfiltration of models, training data, or other intellectual property through AI system endpoints", and that security encompasses "protocols to avoid, protect against, respond to, or recover from attacks".
- NIST AI 100-1 Section 3.4 (Accountable and Transparent)
- NIST AI 100-1 Section 3.5 (Explainable and Interpretable)
- NIST AI 100-1 Section 3.6 (Privacy-Enhanced)
  - Verified 5 Nov 2026: "3.6 Privacy-Enhanced" in the table of contents and as the section heading (page 17); it says privacy-related risks "come with tradeoffs with these other characteristics" and that, under conditions such as data sparsity, privacy-enhancing techniques "can result in a loss in accuracy, affecting decisions about fairness".
- NIST AI 100-1 Section 3.7 (Fair with Harmful Bias Managed)
  - Section numbers 3.4, 3.5 and 3.7 Verified 30 Oct 2026 against the table of contents.
- NIST AI 100-1 Section 5.1 (Govern is a cross-cutting function infused throughout the others)
  - Verified 5 Nov 2026: Section 5.1 is "Govern" in the table of contents; its text says "GOVERN is a cross-cutting function that is infused throughout AI risk management and enables the other functions" and that attention to governance "is a continual and intrinsic requirement" over an AI system's lifespan. Section 5 adds that most users start with MAP after instituting the outcomes in GOVERN.
- NIST AI 100-1 Section 5.2 (Map outcomes are the basis for Measure and Manage)
  - Verified 31 Oct 2026: Section 5.2 is "Map" in the table of contents; its text says "Outcomes in the MAP function are the basis for the MEASURE and MANAGE functions", and Section 5 says most users start with MAP and continue to MEASURE or MANAGE.
- NIST AI 100-1 Section 6 (AI RMF Profiles)
  - Verified 5 Nov 2026: "6 AI RMF Profiles" in the table of contents (page 33); the text says a Current Profile "indicates how AI is currently being managed", a Target Profile "indicates the outcomes needed", "Comparing Current and Target Profiles likely reveals gaps to be addressed", and "Prioritization of gap mitigation is driven by the user's needs and risk management processes".
- NIST AI 100-1 Appendix B (How AI Risks Differ from Traditional Software Risks)
  - Verified 18 Nov 2026: "Appendix B: How AI Risks Differ from Traditional Software Risks" in the table of contents (page 38) and as the heading; it names the NIST Cybersecurity Framework, the NIST Privacy Framework, the NIST Risk Management Framework and the Secure Software Development Framework as guidance that may inform security and privacy considerations, then says existing frameworks and guidance "are unable to: adequately manage the problem of harmful bias in AI systems", confront generative AI risks, or comprehensively address machine learning attacks (page 39).

## NIST AI 600-1, AI RMF Generative Artificial Intelligence Profile, Jul 2024

All entries: **Verified** 30 Oct 2026 against
https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf (Section 2, the twelve risks).
- NIST AI 600-1 Section 2 (Overview of Risks Unique to or Exacerbated by GAI)
  - Verified 12 Nov 2026: "2. Overview of Risks Unique to or Exacerbated by GAI" in the table of contents and as the section heading; its Scope bullet names ecosystem-level risks such as "algorithmic monocultures" from "repeated use of the same model", and footnote 3 defines them as repeated use of the same model or algorithm "in consequential decision-making settings like employment and lending" causing "increased susceptibility by systems to correlated failures ... due to multiple actors relying on the same algorithm".
- NIST AI 600-1 Section 2.1 (CBRN Information or Capabilities)
  - Verified 12 Nov 2026: "2.1. CBRN Information or Capabilities" as the section heading and risk 1 in the Section 2 list: "Eased access to or synthesis of materially nefarious information or design capabilities related to chemical, biological, radiological, or nuclear (CBRN) weapons or other dangerous materials or agents."
- NIST AI 600-1 Section 2.2 (Confabulation)
- NIST AI 600-1 Section 2.3 (Dangerous, Violent, or Hateful Content)
  - Verified 12 Nov 2026: "2.3. Dangerous, Violent, or Hateful Content" as the section heading and risk 3 in the Section 2 list; the text says some models "have generated actionable instructions for dangerous or unethical behavior", that output restrictions may still fail on "less-explicit, novel prompts", and that crafting such prompts deliberately is jailbreaking.
- NIST AI 600-1 Section 2.4 (Data Privacy)
- NIST AI 600-1 Section 2.6 (Harmful Bias and Homogenization)
- NIST AI 600-1 Section 2.7 (Human-AI Configuration)
- NIST AI 600-1 Section 2.8 (Information Integrity)
- NIST AI 600-1 Section 2.9 (Information Security)
- NIST AI 600-1 Section 2.10 (Intellectual Property)
- NIST AI 600-1 Section 2.12 (Value Chain and Component Integration)
- NIST AI 600-1 Section 3 (Suggested Actions to Manage GAI Risks)
  - Verified 19 Nov 2026: "3. Suggested Actions to Manage GAI Risks" in the table of contents (page 12) and as the section heading; it says "Not every suggested action applies to every AI Actor or is relevant to every AI Actor Task. For example, suggested actions relevant to GAI developers may not be relevant to GAI deployers", and that applicability "should be determined based on organizational considerations and their unique uses of GAI systems".
- NIST AI 600-1 MS-2.10-003 (Verify deduplication of GAI training data samples)
  - Verified 19 Nov 2026: suggested action MS-2.10-003 in the MEASURE 2.10 table (privacy risk examined and documented, Section 3, page 35) says "Verify deduplication of GAI training data samples, particularly regarding synthetic data." Section 2.4 (Data Privacy) describes training data memorization.
- NIST AI 600-1 MS-2.11-001 (Document benchmark assumptions and limitations including possible training/test data cross contamination)
  - Verified 31 Oct 2026: suggested action MS-2.11-001 in the MEASURE 2.11 table (Section 3) says "Document assumptions and limitations of benchmarks, including any actual or possible training/test data cross contamination, relative to in-context deployment environment."

## NIST AI 100-2e2025, Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations, Mar 2025

All entries: **Verified** 30 Oct 2026 against
https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf (table of contents and section text).
- NIST AI 100-2e2025 Section 2.2 (Evasion Attacks and Mitigations)
- NIST AI 100-2e2025 Section 2.3 (Poisoning Attacks and Mitigations)
- NIST AI 100-2e2025 Section 2.3.2 (Targeted Poisoning)
  - Verified 4 Nov 2026: "2.3.2. Targeted Poisoning" in the table of contents and as the section heading [NISTAML.024]; targeted attacks "induce a change in the ML model's prediction on a small number of targeted samples", and its mitigations name access controls, data sanitization and validation, and dataset provenance and integrity attestation.
- NIST AI 100-2e2025 Section 2.3.3 (Backdoor Poisoning)
  - Verified 4 Nov 2026: "2.3.3. Backdoor Poisoning" in the table of contents and as the section heading [NISTAML.021, NISTAML.023]; these attacks "cause the targeted model to misclassify samples containing a particular backdoor pattern or trigger".
- NIST AI 100-2e2025 Section 2.3.4 (Model Poisoning)
  - Verified 20 Nov 2026: "2.3.4. Model Poisoning" in the table of contents (page 26) and as the section heading [NISTAML.011, NISTAML.026]; "Most model poisoning attacks have been designed in the federated learning setting in which clients send local model updates to a server that aggregates them into a global model. Compromised clients can send malicious updates to poison the global model." Its mitigations are Byzantine-resilient aggregation rules, most of which "attempt to identify and exclude the malicious updates when performing the aggregation at the server".
- NIST AI 100-2e2025 Section 2.4 (Privacy Attacks and Mitigations)
- NIST AI 100-2e2025 Section 2.4.1 (Data Reconstruction)
  - Verified 5 Nov 2026: "2.4.1. Data Reconstruction" in the table of contents (page 28) and as the section heading [NISTAML.032]; it covers recovering an individual's data from released aggregate information, model inversion of classifiers, and reconstructing training samples from a model, linked to memorization. It does not discuss embeddings, so do not use it alone for embedding inversion.
- NIST AI 100-2e2025 Section 2.4.2 (Membership Inference)
  - Verified 31 Oct 2026: "2.4.2. Membership Inference" in the table of contents and as the section heading [NISTAML.033]; the attacker's goal is to determine whether a particular record was part of the training dataset.
- NIST AI 100-2e2025 Section 2.4.4 (Model Extraction)
- NIST AI 100-2e2025 Section 2.4.5 (Mitigations)
  - Verified 18 Nov 2026: "2.4.5. Mitigations" in the table of contents (page 32) under 2.4 Privacy Attacks and Mitigations, and as the section heading; it covers differential privacy and model-extraction defenses, and describes machine unlearning as "either exact (i.e., retraining the model from scratch or from a certain checkpoint) or approximate (i.e., updating the model parameters to remove the influence of the unlearned records)", "with exact unlearning methods offering stronger privacy, at additional computational cost".
- NIST AI 100-2e2025 Section 3.2 (Supply Chain Attacks and Mitigations)
- NIST AI 100-2e2025 Section 3.2.1 (Data Poisoning Attacks)
  - Verified 20 Nov 2026: "3.2.1. Data Poisoning Attacks" in the table of contents (page 42) under 3.2 Supply Chain Attacks and Mitigations, and as the section heading; "dataset publishers may provide a list of URLs to constitute a training dataset, and attackers may be able to purchase some of the domains that serve those URLs and replace the site content with their own malicious content". The mitigation is in 3.2.3 (Mitigations): verify web downloads so "domain hijacking has not injected new sources of data", where "the provider publishes cryptographic hashes, and the downloader verifies the training data". Section 3 is the GenAI part; Section 2.3 says the same attack can control "a fraction of the public datasets used for model training" generally.
- NIST AI 100-2e2025 Section 3.3 (Direct Prompting Attacks and Mitigations)
- NIST AI 100-2e2025 Section 3.3.2 (Information Extraction)
  - Verified 31 Oct 2026: "3.3.2. Information Extraction" in the table of contents and as the section heading [NISTAML.038]; it names training-data PII and the system prompt as extraction targets, covers training data extraction and memorization, and says fine-tuning interfaces amplify the risk of data extraction.
- NIST AI 100-2e2025 Section 3.4 (Indirect Prompt Injection Attacks and Mitigations)
- NIST AI 100-2e2025 Section 3.5 (Security of Agents)

## MITRE ATLAS

All entries: **Verified** 30 Oct 2026 against the ATLAS data file version 5.6.0
(the file now carries a note that this copy is deprecated and no longer updated;
the IDs are still valid — re-check against atlas.mitre.org when it can be opened),
https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/ATLAS.yaml
(technique names are ATLAS's own; atlas.mitre.org itself is blocked here).
- MITRE ATLAS Matrix (Adversarial Threat Landscape for AI Systems)
  - Verified 20 Nov 2026 in ATLAS data v5.6.0 (lines 4-9: id ATLAS, name "Adversarial Threat Landscape for AI Systems", version 5.6.0, matrix "ATLAS Matrix"): the matrix lists 16 adversary tactics (the first, AML.TA0002 Reconnaissance: "The adversary is trying to gather information about the AI system they can use to plan future operations"), 170 technique entries (101 techniques and 69 sub-techniques) and 35 mitigations, and the file adds 57 case studies typed "incident" or "exercise". It holds no requirements or conformity criteria. Use this bullet for what ATLAS is (a catalog of attacks on AI with linked mitigations, used for threat modeling, not a standard to certify against); the file header says this copy is no longer updated and newer data lives in the mitre-atlas/atlas-data repository, so the catalog keeps growing.
- MITRE ATLAS AML.T0010 (AI Supply Chain Compromise)
- MITRE ATLAS AML.T0011.000 (Unsafe AI Artifacts)
  - Sub-technique of AML.T0011 (User Execution); Verified 12 Nov 2026 in ATLAS data v5.6.0: unsafe AI artifacts "when executed have a deleterious effect", may be introduced via AML.T0010, and model serialization "without proper checking presents an opportunity for code execution".
- MITRE ATLAS AML.T0011.002 (Poisoned AI Agent Tool)
  - Sub-technique of AML.T0011 (User Execution); Verified 12 Nov 2026 in ATLAS data v5.6.0: a poisoned tool invoked by an AI agent "may execute an LLM Prompt Injection or perform AI Agent Tool Invocation", and may arrive via AI Software or because "the user may configure their agent to connect to remote tools".
- MITRE ATLAS AML.T0015 (Evade AI Model)
- MITRE ATLAS AML.T0018 (Manipulate AI Model)
- MITRE ATLAS AML.T0018.000 (Poison AI Model)
  - Sub-technique of AML.T0018; Verified 4 Nov 2026 in ATLAS data v5.6.0: poisoning a model by manipulating its weights, training it on poisoned data or further fine-tuning it.
- MITRE ATLAS AML.T0018.002 (Embed Malware)
  - Sub-technique of AML.T0018; Verified 12 Nov 2026 in ATLAS data v5.6.0: adversaries embed malicious code into AI model files; "Some formats such as pickle files are unsafe to deserialize because they can contain unsafe calls such as exec", and such models "may still operate as expected".
- MITRE ATLAS AML.T0020 (Poison Training Data)
- MITRE ATLAS AML.T0024 (Exfiltration via AI Inference API)
- MITRE ATLAS AML.T0024.002 (Extract AI Model)
  - Sub-technique of AML.T0024; Verified 30 Oct 2026 in ATLAS data v5.6.0.
- MITRE ATLAS AML.T0029 (Denial of AI Service)
- MITRE ATLAS AML.T0043 (Craft Adversarial Data)
- MITRE ATLAS AML.T0051 (LLM Prompt Injection)
- MITRE ATLAS AML.T0051.001 (LLM Prompt Injection: Indirect)
  - Sub-technique "Indirect" of AML.T0051; Verified 30 Oct 2026 in ATLAS data v5.6.0.
- MITRE ATLAS AML.T0053 (AI Agent Tool Invocation)
- MITRE ATLAS AML.T0054 (LLM Jailbreak)
- MITRE ATLAS AML.T0056 (Extract LLM System Prompt)
- MITRE ATLAS AML.T0057 (LLM Data Leakage)
- MITRE ATLAS AML.T0070 (RAG Poisoning)
- MITRE ATLAS AML.T0077 (LLM Response Rendering)
  - Verified 5 Nov 2026 in ATLAS data v5.6.0 (id AML.T0077, name "LLM Response Rendering", Exfiltration tactic AML.TA0010): the LLM is made to respond with private information hidden from the user, which is exfiltrated when the client renders the response, for example an image whose URL carries the data to an adversary-controlled server.
- MITRE ATLAS AML.T0088 (Generate Deepfakes)
  - Verified 5 Nov 2026 in ATLAS data v5.6.0 (id AML.T0088, name "Generate Deepfakes", AI Attack Staging tactic AML.TA0001): adversaries use GenAI to create synthetic imagery, video, audio or text that appears authentic, for impersonation in phishing or to evade AI applications such as biometric identity verification (cross-referenced to AML.T0015 Evade AI Model, whose text also names deepfakes evading AI-based biometric authentication).

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
- NIST SP 800-53 Rev. 5 CM-11 (User-Installed Software)
  - Verified 4 Nov 2026: "CM-11 USER-INSTALLED SOFTWARE" in the control text: establish policies governing software installation by users, enforce them and monitor compliance; enhancement (2) allows user installation only with explicit privileged status.
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
- NIST SP 800-53 Rev. 5 SI-15 (Information Output Filtering)
  - Verified 12 Nov 2026: "SI-15 INFORMATION OUTPUT FILTERING" in the control text: "Validate information output from ... software programs and/or applications to ensure that the information is consistent with the expected content"; the discussion covers detecting extraneous content and "preventing such extraneous content from being displayed".
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
- NIST CSF 2.0 Section 3.2 (CSF Tiers)
  - Verified 18 Nov 2026: "3.2. CSF Tiers" as the section heading (page 7) under Section 3, "Introduction to CSF Profiles and Tiers" (the table of contents lists only Section 3); it says Tiers "characterize the rigor of an organization's cybersecurity risk governance and management practices" as "Partial (Tier 1), Risk Informed (Tier 2), Repeatable (Tier 3), and Adaptive (Tier 4)". Appendix B gives a notional illustration. There is no Section 3.3 in CSF 2.0.

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
