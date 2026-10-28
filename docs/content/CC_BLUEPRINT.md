# ISC2® CC® blueprint (Certified in Cybersecurity)

Checked 28 Oct 2026 against ISC2's official pages (sources at the end).
This is the outline KaiSip's CC notes and questions follow. Codes 1.1, 1.2 …
match ISC2's own numbering; use them as the `subtopic` prefix
(for example `"1.5 Professional and ethical conduct"`).

Objectives are paraphrased. Short headings in quotes are ISC2's.

## Exam facts

| Fact | Value | Source |
|---|---|---|
| Outline in force | Effective 1 Sep 2026 (first major update since the Aug 2022 launch) | S1, S2 |
| Format | Computerized Adaptive Testing (CAT) for all CC exams, worldwide, since 1 Oct 2025 | S1, S3, S4 |
| Item types | Multiple choice and "advanced item types" | S1 |
| Length | 100–125 items; 2 hours maximum | S1, S3 |
| Scored / unscored | 25 unscored pretest items in every exam; at least 75 scored items are needed for a result | S3 |
| Review | None. A finalised answer cannot be reviewed or changed | S3 |
| Stopping rule | After 100 items, the exam ends once ability is above or below the pass point with 95% confidence; otherwise the max-length or out-of-time rule decides | S3 |
| Time-out | Fewer than 75 scored + 25 unscored answered in time is an automatic fail | S3 |
| Passing mark | 700 out of 1000 (scaled, 0–1000) | S1, S5 |
| Result | Pass or fail only. Failing candidates get their domains ranked (below / near / above proficiency) | S5 |
| Languages | English, Chinese, Japanese, German, Spanish. Chinese in set annual windows only. No Korean | S1 |
| Prerequisites | No work experience required | S8 |
| Old outline still examined? | No ISC2 statement found. Only the 2026 outline is published. TODO: verify | S1, S2 |

KaiSip only has four-option multiple choice and does not adapt to the learner.
The mock exam must say it is not a CAT simulation.

## Domains and sub-topics

### Domain 1: Security Principles (24%)
| Code | ISC2 heading | Covers (paraphrased) |
|---|---|---|
| 1.1 | "Understand cybersecurity concepts" | Confidentiality, integrity, availability; authentication, authorization and accounting (AAA); non-repudiation; privacy |
| 1.2 | "Understand risk management concepts" | The risk management lifecycle and its processes |
| 1.3 | "Understand governance concepts" | Laws and regulations; frameworks and guidelines; policies, standards (ISO, CIS as examples) and procedures |
| 1.4 | "Understand cybersecurity controls" | Technical, administrative and physical controls |
| 1.5 | "Maintain professional and ethical conduct" | A professional code of conduct; due care and due diligence; the ISC2 Code of Ethics |

### Domain 2: Security Governance (17.3%)
| Code | ISC2 heading | Covers (paraphrased) |
|---|---|---|
| 2.1 | "Plan Governance, Risk, and Compliance (GRC)" | Why GRC exists and matters; GRC frameworks and tools |
| 2.2 | "Understand redundancy" | Business continuity (BC) and disaster recovery (DR) |
| 2.3 | "Understand security awareness" | Security culture and leadership; social engineering, password protection, phishing |
| 2.4 | "Measure cybersecurity effectiveness" | Key metrics and key risk indicators (KRIs); dashboards, scorecards and reports |

### Domain 3: Identity and Access Management (IAM) Concepts (20%)
| Code | ISC2 heading | Covers (paraphrased) |
|---|---|---|
| 3.1 | "Understand identity life cycle management" | Defining roles; provisioning; access review; deprovisioning; IAM frameworks and tools |
| 3.2 | "Understand logical access controls" | Least privilege; separation of duties; access control models |

Physical access is not a D3 objective in 2026. Teach it under 1.4 (physical
controls) and 5.5 (physical penetration testing).

### Domain 4: Networking and Cloud Security Concepts (21.3%)
| Code | ISC2 heading | Covers (paraphrased) |
|---|---|---|
| 4.1 | "Understand network security" | OSI and TCP/IP models, IPv4 and IPv6, VPN; firewalls (ports, applications); wireless (Wi-Fi, Bluetooth); embedded systems such as ICS, and IoT |
| 4.2 | "Understand network security architecture" | Segmentation (firewall zones, VLANs, micro-segmentation); defence in depth; Zero Trust |
| 4.3 | "Understand cloud security" | Cloud characteristics (broad network access, rapid elasticity, measured service, on-demand self-service, resource pooling); service models; deployment models; the shared responsibility model |

The 2022 objective on network threats and attacks is gone. Attack types may
still appear as context, but threat content now sits in 5.2.

### Domain 5: Security Operations and Incident Response (17.3%)
| Code | ISC2 heading | Covers (paraphrased) |
|---|---|---|
| 5.1 | "Understand data security" | Data handling (classification, labelling, masking, sanitisation); encryption (symmetric, asymmetric, hashing, quantum-resistant cryptography) |
| 5.2 | "Understand security operations" | Logging and monitoring events; event triage (use cases, prioritisation, correlation); threat actors and motives; cyber threat intelligence; threat frameworks |
| 5.3 | "Understand Incident Response (IR)" | Putting the incident response plan into practice under data handling policy; IR exercises (testing, tabletop) |
| 5.4 | "Understand asset protection" | Asset lifecycle management (end-of-life software and devices); configuration and change management |
| 5.5 | "Understand security testing" | Red, blue and purple teaming; application testing (vulnerability scanning, static and dynamic analysis, threat modelling); physical penetration testing (phishing, tailgating, impersonation) |

## AI across the domains

AI is not a separate domain or weight. ISC2 puts foundational AI into all five
(S1, S7). Each domain should get some AI items:

- **D1:** AI and the CIA triad: model poisoning, privacy of training data, tracing what an AI did.
- **D2:** AI in detection and triage; AI-boosted phishing; backing up AI configurations and datasets; model drift as a continuity risk; AI risk indicators.
- **D3:** Bots and service accounts through the identity lifecycle; least privilege and separation of duties for automated systems; AI behaviour analysis in authentication.
- **D4:** AI and traffic monitoring, IDS and firewalls; segmenting AI development environments; Zero Trust and defence in depth; shared responsibility for AI workloads in the cloud.
- **D5:** AI-driven correlation in the SIEM against alert fatigue; leakage of data into public AI services; testing AI-integrated defences.

## What changed in 2026

| 2025 domain (weight) | 2026 domain (weight) |
|---|---|
| Security Principles (26%) | Security Principles (24%) |
| BC, DR & Incident Response Concepts (10%) | Security Governance (17.3%) |
| Access Controls Concepts (22%) | Identity and Access Management (IAM) Concepts (20%) |
| Network Security (24%) | Networking and Cloud Security Concepts (21.3%) |
| Security Operations (18%) | Security Operations and Incident Response (17.3%) |

- **New:** AAA; the risk lifecycle; frameworks and guidelines; **due care and due diligence** (1.5); GRC; metrics, KRIs and dashboards; the identity lifecycle; cloud models and shared responsibility; Zero Trust and micro-segmentation; event triage, threat actors, CTI and threat frameworks; asset lifecycle; security testing; masking, sanitisation and quantum-resistant cryptography; AI in every domain.
- **Moved:** BC and DR go under "redundancy" (2.2). Incident response goes to 5.3.
- **Unchanged:** the format (CAT since 1 Oct 2025), 100–125 items, 2 hours, 700/1000.

## Question targets (bank of 1,000)

| Domain | Weight | Target | Even split per sub-topic |
|---|---|---|---|
| D1 | 24% | 240 | 5 × 48 |
| D2 | 17.3% | 173 | 4 × ~43 |
| D3 | 20% | 200 | 2 × 100 |
| D4 | 21.3% | 214 | 3 × ~71 |
| D5 | 17.3% | 173 | 5 × ~35 |
| Total | | 1,000 | |

The weights work out to 18/13/15/16/13 out of 75 scored items; that reading
is KaiSip's, not ISC2's. For bigger banks, scale each domain by its weight.
Keep the bank size out of learner copy.

## Code of Ethics

The four canons, in ISC2's order (S6):
1. Protect society, the common good, public trust and the infrastructure.
2. Act honourably, honestly, justly, responsibly and legally.
3. Serve principals diligently and competently.
4. Advance and protect the profession.

The page gives no rule for ranking the canons when they conflict. Never key an
item on canon order alone. Compliance is a condition of certification.

## Trademarks

- ISC2® and CC® are registered marks of ISC2, Inc. (S8). Write them with ® wherever size allows, in capitals, never translated (S10).
- Notice: "Not affiliated with or endorsed by ISC2®. CC® is a registered trademark of ISC2, Inc."
- Never call KaiSip content "official", "approved" or "endorsed", and never promise a pass.
- Don't copy ISC2 text: paraphrase objectives, and quote only short headings.

## Open items

- Word-for-word check against the PDF outline (hosted on edge.sitecorecloud.io, blocked when this was written).
- Whether candidates can still sit the pre-2026 outline (no ISC2 statement found).

## Sources

- S1 https://www.isc2.org/certifications/cc/cc-certification-exam-outline
- S2 https://www.isc2.org/Insights/2026/08/inside-the-updated-isc2-cc-exam
- S3 https://www.isc2.org/certifications/computerized-adaptive-testing
- S4 https://www.isc2.org/Insights/2025/06/cc-exam-goes-cat-new-exam-format
- S5 https://www.isc2.org/register-for-exam/exam-scoring-faqs
- S6 https://www.isc2.org/ethics
- S7 https://www.isc2.org/insights/2026/09/updated-isc2-ai-guidance-published
- S8 https://www.isc2.org/certifications/cc
- S9 https://www.isc2.org/policies-procedures/copyright-information
- S10 https://www.isc2.org/Policies-Procedures/Member-Policies
