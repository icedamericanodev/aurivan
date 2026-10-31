# ISC2® CC® blueprint (Certified in Cybersecurity)

Checked 28 Oct 2026 against ISC2's official pages; exam facts rechecked on
isc2.org on 31 Oct 2026 (sources at the end).
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
| Review | None. A finalized answer cannot be reviewed or changed | S3 |
| Stopping rule | After 100 items, the exam ends once ability is above or below the pass point with 95% confidence; otherwise the max-length or out-of-time rule decides | S3 |
| Time-out | Fewer than 75 scored + 25 unscored answered in time is an automatic fail | S3 |
| Passing mark | 700 out of 1000 (scaled, 0–1000) | S1, S11 |
| Result | Pass or fail only; no score is given. Unofficial (preliminary) pass or fail from the proctor at check-out; official result by ISC2 email (Pearson delivery can take up to 72 business hours; results may be delayed about 6–8 weeks). Failing candidates get domain proficiency levels; the labels below, near or above proficiency come from the scoring FAQ | S5, S12, S13 |
| Languages | English, Chinese, Japanese, German, Spanish. Chinese in set annual windows only (ISC2 pages give the April window as both 1–30 and 1–31). No Korean | S1, S11 |
| Delivery | In person only, at ISC2-authorized Pearson VUE test centers. No online proctoring | S13 |
| Price | US$199 (EUR 191.04, GBP 161.19); taxes depend on the test location | S14 |
| Scheduling and fees | Sit within 365 days of purchase; no rescheduling within 24 hours of the appointment. Pearson charges US$50 to reschedule and US$100 to cancel. One Million Pledge participants sitting CC for the first time by 31 Dec 2026 pay no reschedule fee (the cancel fee still applies). The May 2025 article (S21) said CC was exempt from the reschedule fee; the current scheduling page and FAQ narrow this to One Million first-time sitters | S14, S15, S13 |
| One Million CC program | Closed to new enrollment. Existing unexpired codes must be scheduled and sat by 31 Dec 2026; expired codes cannot be reactivated; one free attempt only; finishing the course is not required | S16, S13 |
| Retakes | Wait 30 test-free days after the 1st attempt, 60 after the 2nd, 90 after the 3rd and later; at most 4 attempts in 12 months | S12 |
| Prerequisites | No work experience required. Minimum age 16; candidates aged 16–17 must be accompanied by a parent or guardian, who shows a government photo-and-signature ID and signs the Minor-Guardian Log Sheet; the minor shows one photo ID with their name (school ID accepted) | S8, S13, S17 |
| After passing | Complete the certification application within nine months of the exam date or retake the exam. No full endorsement or endorser for CC. The application includes agreeing to the ISC2 Code of Ethics | S13, S18 |
| Background questions | Felony conviction or pending charge; involvement in computer crime; a revoked license or certification, or professional censure. A "yes" may make a candidate ineligible: contact ISC2 legal before scheduling; no refund if found ineligible | S19 |
| Annual maintenance fee | US$50 a year for CC-only holders, due on the certification anniversary; US$135 once another ISC2 certification is earned | S16, S20 |
| CPE | 45 Group A CPE credits per three-year cycle (15 a year suggested) | S10, S13 |
| Exam day | Adults: two valid original IDs (primary with photo and signature, secondary with signature); arrive 30 minutes early (within 15 minutes of the start counts as late and may forfeit the seat and fee). Palm vein scan at check-in and before and after each break. Breaks are unscheduled, count against exam time, and the candidate must leave the room. No phones or other electronic devices in the room | S17 |
| Old outline still examined? | No ISC2 statement found. Only the 2026 outline is published. TODO: verify | S1, S2 |

KaiSip only has four-option multiple choice and does not adapt to the learner.
The mock exam must say it is not a CAT simulation, and that the real exam has
no going back to change an answer.

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
| 4.2 | "Understand network security architecture" | Segmentation (firewall zones, VLANs, micro-segmentation); defense in depth; Zero Trust |
| 4.3 | "Understand cloud security" | Cloud characteristics (broad network access, rapid elasticity, measured service, on-demand self-service, resource pooling); service models; deployment models; the shared responsibility model |

The 2022 objective on network threats and attacks is gone. Attack types may
still appear as context, but threat content now sits in 5.2.

### Domain 5: Security Operations and Incident Response (17.3%)
| Code | ISC2 heading | Covers (paraphrased) |
|---|---|---|
| 5.1 | "Understand data security" | Data handling (classification, labeling, masking, sanitization); encryption (symmetric, asymmetric, hashing, quantum-resistant cryptography) |
| 5.2 | "Understand security operations" | Logging and monitoring events; event triage (use cases, prioritization, correlation); threat actors and motives; cyber threat intelligence; threat frameworks |
| 5.3 | "Understand Incident Response (IR)" | Putting the incident response plan into practice under data handling policy; IR exercises (testing, tabletop) |
| 5.4 | "Understand asset protection" | Asset lifecycle management (end-of-life software and devices); configuration and change management |
| 5.5 | "Understand security testing" | Red, blue and purple teaming; application testing (vulnerability scanning, static and dynamic analysis, threat modelling); physical penetration testing (phishing, tailgating, impersonation) |

## AI across the domains

AI is not a separate domain or weight. ISC2 puts foundational AI into all five
(S1, S7). Each domain should get some AI items:

- **D1:** AI and the CIA triad: model poisoning, privacy of training data, tracing what an AI did.
- **D2:** AI in detection and triage; AI-boosted phishing; backing up AI configurations and datasets; model drift as a continuity risk; AI risk indicators.
- **D3:** Bots and service accounts through the identity lifecycle; least privilege and separation of duties for automated systems; AI behavior analysis in authentication.
- **D4:** AI and traffic monitoring, IDS and firewalls; segmenting AI development environments; Zero Trust and defense in depth; shared responsibility for AI workloads in the cloud.
- **D5:** AI-driven correlation in the SIEM against alert fatigue; leakage of data into public AI services; testing AI-integrated defenses.

## What changed in 2026

| 2025 domain (weight) | 2026 domain (weight) |
|---|---|
| Security Principles (26%) | Security Principles (24%) |
| BC, DR & Incident Response Concepts (10%) | Security Governance (17.3%) |
| Access Controls Concepts (22%) | Identity and Access Management (IAM) Concepts (20%) |
| Network Security (24%) | Networking and Cloud Security Concepts (21.3%) |
| Security Operations (18%) | Security Operations and Incident Response (17.3%) |

- **New:** AAA; the risk lifecycle; frameworks and guidelines; **due care and due diligence** (1.5); GRC; metrics, KRIs and dashboards; the identity lifecycle; cloud models and shared responsibility; Zero Trust and micro-segmentation; event triage, threat actors, CTI and threat frameworks; asset lifecycle; security testing; masking, sanitization and quantum-resistant cryptography; AI in every domain.
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

The four canons, word for word and in ISC2's order (S6, checked 31 Oct 2026):
1. Protect society, the common good, necessary public trust and confidence, and the infrastructure.
2. Act honorably, honestly, justly, responsibly, and legally.
3. Provide diligent and competent service to principals.
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
- Which "advanced item types" CC uses, and whether CC has any scheduled break.
- Pearson VUE's ISC2 page (blocked when this was written): the full accepted-ID list and Peace of Mind Protection terms.
- Whether the first annual maintenance fee is waived for One Million program passers.

## Sources

- S1 https://www.isc2.org/certifications/cc/cc-certification-exam-outline
- S2 https://www.isc2.org/Insights/2026/08/inside-the-updated-isc2-cc-exam
- S3 https://www.isc2.org/certifications/computerized-adaptive-testing
- S4 https://www.isc2.org/Insights/2025/06/cc-exam-goes-cat-new-exam-format
- S5 https://www.isc2.org/register-for-exam/exam-scoring-faqs (general scoring FAQ; does not name CC; cited only for the 0–1000 scale and the below/near/above proficiency labels for adaptive exams)
- S6 https://www.isc2.org/ethics
- S7 https://www.isc2.org/insights/2026/09/updated-isc2-ai-guidance-published
- S8 https://www.isc2.org/certifications/cc
- S9 https://www.isc2.org/policies-procedures/copyright-information
- S10 https://www.isc2.org/Policies-Procedures/Member-Policies
- S11 https://www.isc2.org/exams/before-your-exam
- S12 https://www.isc2.org/exams/after-your-exam
- S13 https://www.isc2.org/frequently-asked-questions
- S14 https://www.isc2.org/register-for-exam/isc2-exam-pricing
- S15 https://www.isc2.org/exams/schedule-exam
- S16 https://www.isc2.org/landing/1mcc
- S17 https://www.isc2.org/exams/exam-day
- S18 https://www.isc2.org/Endorsement
- S19 https://www.isc2.org/Register-for-Exam/Background-Qualifications
- S20 https://www.isc2.org/AMFs-Overview
- S21 https://www.isc2.org/Insights/2025/05/New-ISC2-Exam-Registration-Process-for-2025
