# Domain 5 — Protection of Information Assets — TOC Coverage

CISA Review Manual 28th Edition, Domain 5 (26% exam weight, 260 questions target).

**Last updated:** D5-11 (d5_201..d5_220). All 17 D5 TOC sections covered; §5.17 Forensics deepest.

## Tier targets

| Tier          | Target | Authored | Remaining |
|---------------|-------:|---------:|----------:|
| Foundational  |     26 |       26 |         0 ✓ CLOSED |
| Application   |    130 |      120 |        10 |
| Analysis      |    104 |       74 |        30 |
| **Total**     |    260 |      220 |        40 |

## TOC coverage (D5-1 through D5-10)

| TOC §  | Title                                                    | Authored | Status |
|--------|----------------------------------------------------------|---------:|:-------|
| 5.1    | Information Asset Security Frameworks, Standards, Guidelines | 8    | ✓ opened |
| 5.2    | Privacy Principles                                       |        9 | ✓ opened |
| 5.3    | Physical Access and Environmental Controls               |       12 | ✓ opened |
| 5.4    | Identity and Access Management                           |       13 | ✓ opened |
| 5.5    | Network and End-Point Security                           |       12 | ✓ opened |
| 5.6    | Data Loss Prevention                                     |        6 | ✓ opened |
| 5.7    | Data Encryption                                          |       15 | ✓ opened |
| 5.8    | Public Key Infrastructure (PKI)                          |        5 | ✓ opened |
| 5.9    | Web-Based Communication Techniques                       |        5 | ✓ opened |
| 5.10   | Virtualized Environments                                 |        6 | ✓ opened |
| 5.11   | Mobile, Wireless, IoT Devices                            |        9 | ✓ opened |
| 5.12   | Security Awareness Training and Programs                 |        6 | ✓ opened |
| 5.13   | Information System Attack Methods and Techniques         |       14 | ✓ opened |
| 5.14   | Security Testing Tools and Techniques                    |       17 | ✓ opened |
| 5.15   | Security Monitoring Tools and Techniques                 |       23 | ✓ opened |
| 5.16   | Incident Response Management                             |       25 | ✓ opened |
| 5.17   | Evidence Collection and Forensics                        |       35 | ✓ extended (D5-11) |

**All 17 TOC sections covered.** Remaining batches extend §5.16, §5.17 and synthesize.

## Remaining coverage plan (D5-12 through D5-13)

40 questions across 2 batches. Mix targets: 0F + 10A + 30An remaining.

| Batch | Mix | Focus |
|---|---|---|
| **D5-12** | 0F+10A+10An | §5.17 Forensics close + cross-cutting application — **A TIER CLOSES at 130** |
| **D5-13 FINAL** | 0F+0A+20An | Capstone analysis spanning all D5 — **An TIER CLOSES at 104** |

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
