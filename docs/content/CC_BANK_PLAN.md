# CC question bank plan: from the pilot to about 1,000

**Status:** plan, 30 Oct 2026. Roadmap Stage 2.3. Owner decision (30 Oct):
CC content runs in parallel with the CISA build.

**Where we are:** the pilot is complete in all five domains, 20 reviewed
questions each (`data/cc/originals/d{1..5}.json`). Every pilot item was
blind-tested and standards-audited, and every citation was checked against an
opened source and recorded in `data/cc/originals/_framework_library.md`.

CC is not wired into the apps yet (that is Stage 2.7), so bank work needs no
`APP_VERSION` bump. Never put the bank size in learner copy.

## 1. Targets by outline weight

From the "Question targets" table in `docs/content/CC_BLUEPRINT.md` (bank of
1,000, scaled by the 2026 outline weights). Section targets split each domain
evenly across its outline sections, as the blueprint does, then across the
notes sub-topics in `data/cc/notes/d{N}.json`.

| Domain | Weight | Target | Pilot | Still to write | Section targets |
|---|---|---|---|---|---|
| D1 Security Principles | 24% | 240 | 20 | 220 | 1.1–1.5: 48 each |
| D2 Security Governance | 17.3% | 173 | 20 | 153 | 2.1 43 · 2.2 44 · 2.3 43 · 2.4 43 |
| D3 IAM Concepts | 20% | 200 | 20 | 180 | 3.1 108 · 3.2 92 (by notes depth: 16 and 13 sub-topics) |
| D4 Networking and Cloud | 21.3% | 214 | 20 | 194 | see section 4 |
| D5 Security Operations and IR | 17.3% | 173 | 20 | 153 | 5.1–5.5: 35 each (5.1 and 5.2: 34) |
| **Total** | | **1,000** | **100** | **900** | |

Notes:
- The five `cc-d{N}-domain-expert` agent files still say "at least 252 / 200 /
  210 / 224 / 200" (1,086). Treat those as a stretch ceiling; the blueprint
  table above is the plan. If the bank later grows past 1,000, scale every
  domain by its weight, as the blueprint says.
- Inside each domain, keep the pilot mix: about 35% foundational (recall),
  50% application, 15% analysis.
- **Foundational AI:** about 10% of each domain, spread across its AI
  sub-topics (the blueprint's "AI across the domains" list).
- **Key balance:** every batch of 25 has keys at 6/6/6/7 or better across
  A–D; the key is the single wordiest option in 15–30% of items and the
  single longest by characters in 15–30%.

## 2. Batch size and cadence

- **Batch 2 is 25 items per domain** (125 in all), IDs `cc_dN_021`–`cc_dN_045`.
  It covers every notes sub-topic the pilot did not touch, so each domain has
  at least one reviewed item per sub-topic before the bank deepens.
- After batch 2, batches of 25–30 per domain until the targets are met: about
  seven more rounds.
- Run domains in pairs (for example D1 + D4, then D2 + D3 + D5) so each round's
  reviews stay small enough to read closely.
- **Cross-domain gate** (`cc-cross-domain-reviewer`) after batch 2, then every
  ~200 new items, and as the final gate before CC joins the beta (Stage 2.6).

## 3. The pipeline every batch goes through

The pilot set this order. Don't skip a step to go faster.

1. **Author** with `cc-d{N}-domain-expert`, under `isc2-cc-standards-auditor.md`
   and the pilot calibration rules (section 6).
2. **Self-check:**
   - `python3 scripts/lint_exam_style_v2.py --file data/cc/originals/dN.json`
     must show 0 errors. Its "stem names no actor" warning looks for CISA
     actors, so it is expected on CC items, but every stem must still name
     who acts.
   - Every `framework_ref` part must match a library bullet exactly.
3. **Blind test** with `qa-question-tester`, on a copy that has only the id,
   stem and options (no key, explanations or tips). Compare its picks with
   the keys afterwards.
4. **Standards audit** with `isc2-cc-standards-auditor`, plus the domain
   expert's accuracy pass.
5. **Fix** every HARD ERROR and PRECISION finding. Re-blind-test every changed
   item.
6. **Citations:** open the source for every new citation (NIST is reachable
   from the cloud environment; isc2.org, iso.org and cisecurity.org are not),
   and add it to the library as Verified, with what was checked. Don't add a new
   ISO/IEC or CIS citation that can't be opened; use a NIST source instead.
7. **PR** per round, reviewed and merged under the CLAUDE.md PR rules.

## 4. Domain 4 coverage plan

_(Filled in from the Domain 4 pilot.)_

## 5. Batch 2 by domain

Each line is a notes sub-topic and the number of items it gets. Sub-topics
marked **new** had no pilot item.

### D1 Security Principles (25: `cc_d1_021`–`045`)
- 1.1 (8): 1.1.2 Confidentiality **new** 1 · 1.1.3 Integrity and Authenticity
  **new** 1 · 1.1.4 Availability **new** 1 · 1.1.5 Authentication **new** 1 ·
  1.1.9 AI and the Core Security Concepts **new** 1 · 1.1.1 CIA Triad 1 ·
  1.1.6 Authorization and Accounting 1 · 1.1.8 Privacy 1
- 1.2 (5): 1.2.2 Risk Management Lifecycle **new** 1 · 1.2.3 Likelihood and
  Impact **new** 1 · 1.2.7 Risk Register and Ownership **new** 1 · 1.2.5
  Treatment Options 1 · 1.2.6 Appetite and Tolerance 1
- 1.3 (4): 1.3.1 Governance Roles **new** 1 · 1.3.2 Laws and Regulations
  **new** 1 · 1.3.4 Policies 1 · 1.3.5 Standards, Procedures and Guidelines 1
- 1.4 (5): 1.4.1 What a Control Is **new** 1 · 1.4.3 Administrative Controls
  **new** 1 · 1.4.7 Controls for AI Tools **new** 1 · 1.4.5 Control Functions 1 ·
  1.4.6 Layering and Compensating 1
- 1.5 (3): 1.5.3 Code of Ethics **new** 1 · 1.5.5 Complaints and Enforcement
  **new** 1 · 1.5.2 Due Care and Due Diligence 1
- Watch: 1.1.5 must stay at concept level (factors and AAA), so it does not
  duplicate D3's MFA items. Never key an ethics item on canon order alone.

### D2 Security Governance (25: `cc_d2_021`–`045`)
- 2.1 (6): 2.1.2 Planning a GRC Program **new** 1 · 2.1.5 Choosing and Mapping
  Frameworks **new** 1 · 2.1.7 Tolerances and the Risk Register **new** 1 ·
  2.1.3 RACI 1 · 2.1.4 Compliance Evidence 1 · 2.1.8 Governing AI Use 1
- 2.2 (8): 2.2.1 Redundancy and HA **new** 1 · 2.2.3 BIA **new** 1 · 2.2.8
  Backing Up AI and Model Drift **new** 1 · 2.2.9 AI-Assisted Resilience **new** 1 ·
  2.2.2 BC vs DR 1 · 2.2.4 MTD, RTO, RPO 1 · 2.2.5 Backups 1 · 2.2.6 Sites 1
- 2.3 (6): 2.3.1 Culture and Leadership **new** 1 · 2.3.4 Phishing Variants
  **new** 1 · 2.3.3 Social Engineering 1 · 2.3.5 AI Phishing and Deepfakes 1 ·
  2.3.6 Passwords 1 · 2.3.7 Reporting and Simulations 1
- 2.4 (5): 2.4.1 Measures and Metrics **new** 1 · 2.4.6 Using Measurement to
  Improve **new** 1 · 2.4.3 KPI and KRI 1 · 2.4.4 Thresholds 1 · 2.4.7 AI Risk
  Indicators 1

### D3 IAM Concepts (25: `cc_d3_021`–`045`)
- 3.1 (13): 3.1.1 Identities and Life Cycle **new** 1 · 3.1.2 Roles and
  Entitlements **new** 1 · 3.1.8 Adaptive Authentication and AI **new** 1 ·
  3.1.13 IAM Frameworks and Tools **new** 1 · 3.1.15 Third-Party and Guest
  Access **new** 1 · 3.1.16 Sessions and Timeouts **new** 1 · then one each in
  3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7, 3.1.9, 3.1.11
- 3.2 (12): 3.2.7 RBAC **new** 1 · 3.2.9 Rule-Based **new** 1 · 3.2.10
  Choosing a Model **new** 1 · then one each in 3.2.1, 3.2.2, 3.2.3, 3.2.4,
  3.2.5, 3.2.6, 3.2.8, 3.2.11, 3.2.12
- Watch: rule-based vs role-based ("RBAC" means both) is a classic trap; spell
  out the model in every option.

### D4 Networking and Cloud (25: `cc_d4_021`–`045`)
_(From the Domain 4 coverage plan in section 4.)_

### D5 Security Operations and IR (25: `cc_d5_021`–`045`)
- 5.1 (6): 5.1.2 Handling Across the Lifecycle **new** 1 · 5.1.3 Masking and
  Tokenization **new** 1 · 5.1.6 Hashing, Signatures, Certificates **new** 1 ·
  5.1.7 Quantum-Resistant Cryptography **new** 1 · 5.1.5 Encryption 1 · 5.1.8
  Leakage into Public AI 1
- 5.2 (6): 5.2.2 Logging and Monitoring **new** 1 · 5.2.5 Threat Actors **new** 1 ·
  5.2.6 CTI **new** 1 · 5.2.8 Malware Basics **new** 1 · 5.2.1 Events vs
  Incidents 1 · 5.2.3 Triage 1
- 5.3 (5): 5.3.1 IR Plan and Team **new** 1 · 5.3.6 Lessons Learned **new** 1 ·
  5.3.7 Exercises and Tabletops **new** 1 · 5.3.2 Lifecycle 1 · 5.3.3
  Containment 1
- 5.4 (4): 5.4.1 Asset Inventory **new** 1 · 5.4.2 Asset Lifecycle **new** 1 ·
  5.4.4 Baselines 1 · 5.4.6 Change Management 1
- 5.5 (4): 5.5.4 Threat Modeling **new** 1 · 5.5.5 Physical and Social
  Engineering Tests **new** 1 · 5.5.2 Scanning vs Pen Testing 1 · 5.5.6 Testing
  AI Defenses 1
- Watch: network attack types (DoS, on-path, spoofing) left Domain 4 in 2026
  and now sit under 5.2. Check the 5.2 notes cover them before later D5
  batches test them.

## 6. Pilot calibration rules (binding for every batch)

Learned from two blind tests and two standards audits of the pilot.

1. **The stem holds the deciding fact.** It names the owner or who decides, or
   says what the procedure assigns. A blind reader must reach the key from the
   stem plus CC knowledge alone.
2. **In-role over escalation.** When the stem says the procedure gives the
   task to the practitioner, the in-role action wins. Escalation wins only
   when the action is outside their authority. "Escalate" is never a free win.
3. **No cues on the key alone.** Options are plain, parallel actions or
   statements without reason clauses. Reason clauses and owner wording never
   appear only on the key.
4. **Length doesn't predict the key.** Keys are balanced across A–D. The key is
   the single wordiest option in 15–30% of items and the single longest by
   characters in 15–30% (never 0%, which is a reverse tell).
5. **Two plus two.** Two distractors fall to topic knowledge (real beginner
   misconceptions). The runner-up is genuinely plausible and loses by the CC
   lens or a precise technical point. No subset keys.
6. **The tips name the right letters.** `Eliminate:` names exactly the two
   eliminated options and the knowledge that removes each. `Final two:` names
   the key and the runner-up that candidates actually weigh. `Exam cue:` gives
   a reusable pattern. Never claim ISC2 says something.
7. **No leaks outside the options.** `pre_read` doesn't give away the deciding
   principle, and `subtopic` labels are neutral.
8. **Original scenarios.** Don't reuse a worked example from the notes, and
   don't repeat a scenario or lesson from another CC item.
9. **One citation form.** Every `framework_ref` part matches a library bullet
   exactly, with no comma before the parenthesis and one citation per `;` part.

## 7. Follow-ups outside this plan's scope

- A CC mode for `scripts/lint_exam_style_v2.py` (CC actors in place of the CISA
  actor check, and a library-match check for `data/cc/`). This touches
  `scripts/`, so it waits for a session that owns shared tooling.
- Align the five domain-expert agent files' "at least" counts with the
  blueprint table.
