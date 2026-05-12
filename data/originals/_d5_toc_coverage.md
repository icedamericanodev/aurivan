# Domain 5 — Protection of Information Assets — TOC Coverage

CISA Review Manual 28th Edition, Domain 5 (26% exam weight, 260 questions target).

**Last updated:** D5-13 FINAL (d5_241..d5_260). **D5 COMPLETE 260/260. BANK COMPLETE 1004/1004.**

## Tier targets

| Tier          | Target | Authored | Remaining |
|---------------|-------:|---------:|----------:|
| Foundational  |     26 |       26 |         0 ✓ CLOSED |
| Application   |    130 |      130 |         0 ✓ CLOSED |
| Analysis      |    104 |      104 |         0 ✓ CLOSED |
| **Total**     |    260 |      260 |         0 ✓ **COMPLETE** |

## TOC coverage (D5-1 through D5-10)

| TOC §  | Title                                                    | Authored | Status |
|--------|----------------------------------------------------------|---------:|:-------|
| 5.1    | Information Asset Security Frameworks, Standards, Guidelines | 8    | ✓ opened |
| 5.2    | Privacy Principles                                       |       10 | ✓ extended (D5-12) |
| 5.3    | Physical Access and Environmental Controls               |       12 | ✓ opened |
| 5.4    | Identity and Access Management                           |       14 | ✓ extended (D5-12) |
| 5.5    | Network and End-Point Security                           |       12 | ✓ opened |
| 5.6    | Data Loss Prevention                                     |        9 | ✓ extended (D5-12) |
| 5.7    | Data Encryption                                          |       18 | ✓ extended (D5-12) |
| 5.8    | Public Key Infrastructure (PKI)                          |        9 | ✓ extended (D5-12) |
| 5.9    | Web-Based Communication Techniques                       |        7 | ✓ extended (D5-12) |
| 5.10   | Virtualized Environments                                 |        7 | ✓ extended (D5-12) |
| 5.11   | Mobile, Wireless, IoT Devices                            |        9 | ✓ opened |
| 5.12   | Security Awareness Training and Programs                 |        9 | ✓ extended (D5-12) |
| 5.13   | Information System Attack Methods and Techniques         |       15 | ✓ extended (D5-12) |
| 5.14   | Security Testing Tools and Techniques                    |       17 | ✓ opened |
| 5.15   | Security Monitoring Tools and Techniques                 |       23 | ✓ opened |
| 5.16   | Incident Response Management                             |       25 | ✓ opened |
| 5.17   | Evidence Collection and Forensics                        |       36 | ✓ extended (D5-12) |

**All 17 TOC sections covered.** Remaining batches extend §5.16, §5.17 and synthesize.

## D5 COMPLETION — BANK COMPLETE AT 1004

D5 = 260/260. Bank = 1004/1004 across 5 domains (D1: 180 + D2: 180 + D3: 124 + D4: 260 + D5: 260).

## Batch log — D5-13 FINAL (d5_241..d5_260) — BANK CAPSTONE

**All 20 capstone analysis questions** spanning the four cluster types:

**Real-world tonal echoes (5):**
- d5_241 Marriott/Starwood 2018-2020 (long-dwell APT post-M&A)
- d5_242 Snowflake 2024 (customer-credential mass-tenant exfil)
- d5_243 Microsoft Midnight Blizzard 2024 (OAuth token-abuse executive email APT)
- d5_244 SolarWinds-tonal SaaS supply-chain (malicious-update cascade)
- d5_245 AT&T 2024 (third-party SaaS exposing carrier CDR)

**Multi-section synthesis (5):**
- d5_246 Cross-border forensic discovery + GDPR Art. 49 + MLAT
- d5_247 Zero-trust failure via service-mesh implicit trust
- d5_248 AI/ML model exfiltration + training-data leakage (NEW vector)
- d5_249 Quantum-resistant cryptography migration governance
- d5_250 SOC analyst burnout + alert fatigue capability rebuild

**Single-focus principle reinforcement + 1 NEW principle (5):**
- d5_251 REVOCATION-FIRST extension to code-signing certificates
- d5_252 CONTAIN-FIRST extension to OT/ICS safety-critical
- d5_253 **NEW BACKUP-IMMUTABILITY-FIRST principle (15th D5 principle)**
- d5_254 CONTAIN-FIRST vs FORENSIC-IMAGING-BEFORE-WIPE (cross-principle)
- d5_255 IRREVERSIBLE-LOSS-CLOCK vs NOTIFY-FIRST (cross-principle)

**Bank-capstone governance synthesis (5):**
- d5_256 Board-tier escalation criteria (SEC + Caremark)
- d5_257 Cyber-insurance war-exclusion claim defense
- d5_258 Nation-state attribution bounds (auditor vs IC)
- d5_259 Privacy-by-design retrofit failure multi-jurisdiction
- d5_260 **BANK FINAL** — 5-year technology-bet retrospective

**15 single-focus principles now canonical in D5:** contain-first, restore-first, lateral-movement-contain, irreversible-loss-clock, financial-loss-clock, credential-validity-clock, exposure-window-close, trusted-baseline-restore, notify-first-for-customer-protection, defer-major-decisions-during-crisis, chain-of-custody-first, forensic-imaging-before-wipe, methodology-rigor-first, revocation-first, **backup-immutability-first**.

**BACKUP-IMMUTABILITY-FIRST (d5_253):** when ransomware encryption is confirmed, VERIFY immutable + recent + complete + offline-isolated backups BEFORE any ransom decision, restoration attempt, or insurance engagement. Distinct from RESTORE-FIRST (which assumes verified backups exist) and TRUSTED-BASELINE-RESTORE (which applies to supply-chain compromise contexts). Specifically addresses ransomware-specific recovery where network-attached backups may also be compromised.

## Batch log — D5-12 (d5_221..d5_240) — A TIER CLOSED

**Application (10) — thin-section fortification:**
- §5.8 PKI (2): Certificate revocation under CA compromise + PKI hierarchy with offline root
- §5.9 Web Comm (2): TLS 1.0/1.1 deprecation + Secure API gateway (FAPI 2.0)
- §5.10 Virtualization (1): Hypervisor escape and VM isolation
- §5.12 Awareness (2): Phishing simulation metrics + Training effectiveness (Kirkpatrick)
- §5.6 DLP (1): DLP false-positive tuning
- §5.2 Privacy (1): Consent management lifecycle (GDPR Article 7)
- §5.7 Encryption (1): Cryptographic key rotation governance

**Analysis (10) — 5 real-world tonal echoes + 1 NEW principle + 4 synthesis:**
- d5_231 MOVEit/Cl0p 2023 echo (managed-file-transfer SQLi)
- d5_232 Microsoft Storm-0558 2023 echo (signing-key compromise) — **NEW REVOCATION-FIRST PRINCIPLE**
- d5_233 Okta Oct 2023 echo (HAR-file session cookie theft)
- d5_234 MGM/Scattered Spider 2023 echo (service-desk vishing → MFA bypass)
- d5_235 LastPass 2022 echo (encrypted vault + plaintext metadata)
- d5_236 Internal CA key on stolen laptop (reinforces REVOCATION-FIRST)
- d5_237 DLP-detected executive M&A draft dispute (governance synthesis)
- d5_238 Cloud KMS misconfiguration cross-OU (synthesis)
- d5_239 Stagnant phishing-click rate (methodology-rigor-first applied to audit)
- d5_240 PII in dev test store (GDPR Art. 4(12) breach synthesis)

**14 single-focus principles now in D5:** contain-first, restore-first, lateral-movement-contain, irreversible-loss-clock, financial-loss-clock, credential-validity-clock, exposure-window-close, trusted-baseline-restore, notify-first-for-customer-protection, defer-major-decisions-during-crisis, chain-of-custody-first, forensic-imaging-before-wipe, methodology-rigor-first, **revocation-first**.

**REVOCATION-FIRST principle (d5_232, d5_236):** When a cryptographic signing key or CA private key is confirmed compromised, REVOKE the compromised key FIRST via vendor's revocation mechanism — forged tokens / forged certificates remain valid until revocation. Distinct from CHAIN-OF-CUSTODY-FIRST (evidence-integrity disputes in litigation) and FORENSIC-IMAGING-BEFORE-WIPE (mobile state-actor evidence preservation): REVOCATION-FIRST addresses active-forgery scenarios where the forgery vector continues until revocation.

## Batch log — D5-11 (d5_201..d5_220)

**§5.17 Forensics extend (10 application):** Timeline reconstruction, malware analysis methodology, anti-forensics awareness, forensics + e-discovery integration, expert witness preparation, forensic readiness program, legal hold + litigation preservation, mobile cloud-sync forensics, IoT/embedded forensics, lab accreditation (ISO 17025 + ASCLD).

**Analysis (10) — 5 real-world tonal echoes + 1 new single-focus principle:**
- NotPetya 2017 echo (destructive malware, supply-chain vector, attribution)
- Twitter 2020 echo (internal-tools breach, social engineering, cryptocurrency tracing)
- Capital One 2019 echo (cloud misconfiguration, SSRF, IMDSv1→v2, multi-regulator notification)
- Colonial Pipeline 2021 echo (critical-infrastructure ransomware, IT/OT, OFAC review)
- Change Healthcare 2024 echo (healthcare sector mass-impact ransomware, HIPAA, double-extortion)
- **Daubert Challenge (METHODOLOGY-RIGOR-FIRST — NEW)** — single-focus principle (d5_217): when expert forensic testimony is challenged via Daubert motion, FIRST action is documenting methodology rigor against the four Daubert factors (peer-review, error rate, general acceptance, scientific testability) BEFORE legal response strategy.
- Anti-forensics encountered (enhanced preservation + countermeasures-as-attribution)
- Forensic budget defense at board (risk-based framework)
- Legal hold scope dispute (Sedona Cooperation + meet-and-confer + proportionality)
- Forensic capability building post-major-incident (targeted hire + accreditation + tabletop cadence)

**13 single-focus principles now in D5:** contain-first, restore-first, lateral-movement-contain, irreversible-loss-clock, financial-loss-clock, credential-validity-clock, exposure-window-close, trusted-baseline-restore, notify-first-for-customer-protection, defer-major-decisions-during-crisis, chain-of-custody-first, forensic-imaging-before-wipe, **methodology-rigor-first**.

## Process improvements applied this batch

1. **cisa-author-scaffolder pre-flight** continued (per D5-10).
2. **Real-world incident grounding** continued — 5/10 analysis questions used tonal echoes (no CVE numbers, no company names in stems).
3. **tip[2] stem-cued pre-check** — caught 3 cases (d5_202/207/215) at Stage-2.5 reviewer-pre-check, rewritten inline to single-stem-cue principle form (no batch-summary residual).

## Batch log — D5-10 (d5_181..d5_200)

**§5.16 IR Management extend (5):** Major-incident testing ladder, Crisis decision-making (OODA), IR-OT/ICS integration, Cloud IR cross-stack, M&A IR consolidation.

**§5.17 Evidence Collection and Forensics open (15):**
- Foundational application (5): Forensics canonical framework + Memory forensics + Disk forensics imaging + Network forensics + Cloud forensics specifics
- Analysis (10):
  * Credit-bureau-scale breach (Equifax 2017 echo)
  * Software-supply-chain compromise (SolarWinds 2020 echo)
  * **Forensic evidence integrity dispute** (single-focus CHAIN-OF-CUSTODY-FIRST — NEW)
  * Cross-jurisdiction forensics with data residency
  * Mass-exploitation vulnerability (MOVEit 2023 echo)
  * Covert insider threat
  * **Mobile state-actor forensics** (single-focus FORENSIC-IMAGING-BEFORE-WIPE — NEW; Pegasus 2021 echo)
  * Vendor-incident forensic tool dispute (CrowdStrike Falcon 2024 echo)
  * Forensic team capability building
  * Post-incident forensic lessons learned

**TWO NEW single-focus principles (12 total D5 principles now):**
- **CHAIN-OF-CUSTODY-FIRST** (d5_193): when evidence integrity contested in litigation, FIRST action is independent neutral third-party chain-of-custody hash verification BEFORE technical analysis or legal motion.
- **FORENSIC-IMAGING-BEFORE-WIPE** (d5_197): when mobile device shows state-actor surveillance indicators, IMAGE the device BEFORE any wipe; evidence preservation is irreversible-loss-risk if wipe happens first.

## Process improvements applied this batch

1. **cisa-author-scaffolder pre-flight** — produced per-question word targets + position assignments + structural concerns BEFORE authoring. Result: 9/20 PASS on first parity check vs 1/20 baseline of prior batches. Significant improvement but still required a smaller fix pass (11 questions vs 13-19 in prior batches).
2. **Real-world incident grounding** — 5 of 10 analysis scenarios use tonal echoes of public incidents (Equifax, SolarWinds, MOVEit, Pegasus, CrowdStrike Falcon) for realism + memorability. No literal references (no CVE numbers, no company names in stems); industry analogs used.
3. **tip[2] stem-cued pre-check script** (`scripts/check_tip2_stem_cued.py`) — built to catch recurring pedagogy-reviewer finding of tip[2] answer-summary drift. Caught 1 case in initial D5-10 authoring (d5_199), fixed inline. Final state: 0/20 flagged.

## Pedagogy trajectory (D5-10 pending review)

| Batch | STRONG | NI | WEAK | Hard errors |
|---|---:|---:|---:|---:|
| D5-1 | 12 | 6 | 2 | 1 |
| D5-2 | 15 | 4 | 1 | 1 |
| D5-3 through D5-5 | 15 | 4 | 1 | 0 |
| D5-6 | 15 | 4 | 0 | 0 |
| D5-7 | 15 | 5 | 0 | 0 |
| D5-8 | 17 | 3 | 0 | 0 (BEST) |
| D5-9 | (under review) | | | (0 hard) |
| **D5-10** | _pending_ | | | |

## D5-9 polish folded in
- d5_171 framework_ref + CE: GDPR Article 56 (one-stop-shop / lead supervisory authority) framing added per D5-9 exam-reviewer precision flag.

## Citation library
At ~1750 entries (+~120 D5-10 citations: NIST SP 800-82 Rev 3, NIST SP 800-86, NIST SP 800-101, ISO/IEC 27037, Volatility Foundation, FTK Imager/EnCase methodology, SANS DFIR FOR500/508/572, Federal Rules of Evidence Rule 901, ACFE Fraud Examiners Manual, ICS-CERT guidance, CSA Cloud Forensics, MLAT/Hague Convention, Citizen Lab + Amnesty Tech research, Cellebrite/GrayKey/Magnet AXIOM mobile forensics, GIAC GCFE/GCFA/GREM, EnCE, FTC Safeguards Rule, CFPB guidance, ABA Model Rules, Boyd's OODA Loop, two new principle entries).
