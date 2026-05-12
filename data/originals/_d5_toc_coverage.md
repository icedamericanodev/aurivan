# Domain 5 — Protection of Information Assets — TOC Coverage

CISA Review Manual 28th Edition, Domain 5 (26% exam weight, 260 questions target).

**Last updated:** D5-8 (d5_141..d5_160).

## Tier targets

| Tier          | Target | Authored | Remaining |
|---------------|-------:|---------:|----------:|
| Foundational  |     26 |       25 |         1 |
| Application   |    130 |       91 |        39 |
| Analysis      |    104 |       44 |        60 |
| **Total**     |    260 |      160 |       100 |

## TOC coverage (D5-1 through D5-8)

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
| 5.14   | Security Testing Tools and Techniques                    |       17 | ✓ opened (extended D5-8) |
| 5.15   | Security Monitoring Tools and Techniques                 |       23 | ✓ opened (extended D5-8) |
| 5.16   | Incident Response Management                             |        0 | pending |
| 5.17   | Evidence Collection and Forensics                        |        0 | pending |

## Remaining coverage plan (D5-9 through D5-13)

100 questions across 5 batches. Mix targets: 1F + 39A + 60An remaining.

| Batch | Mix | TOC focus |
|---|---|---|
| **D5-9** | 1F+9A+10An | §5.16 Incident Response (open) — **F TIER CLOSES at 26** |
| **D5-10** | 0F+10A+10An | §5.16 (extend) + §5.17 Forensics (open) |
| **D5-11** | 0F+10A+10An | §5.16 (close) + §5.17 (extend) |
| **D5-12** | 0F+10A+10An | §5.17 (close) — **A TIER CLOSES at 130** |
| **D5-13 FINAL** | 0F+0A+20An | Capstone analysis spanning all D5 — **An TIER CLOSES at 104** |

After D5-13: all 17 D5 TOC sections covered + all three tier targets met.

## Batch log

### D5-1 through D5-7 (d5_001..d5_140)
§5.1 through §5.15 opened across batches 1-7. See git history.

### D5-8 (d5_141..d5_160) — 1F + 9A + 10An
§5.14 Testing extension (7): Red/blue/purple team taxonomy + SCA (NIST SSDF +
SBOM) + CSPM audit scope + API security testing + Red team engagement
coordination + Pentest scope dispute (analysis) + Compliance scanning SOC 2 +
ISO 27001 (analysis)
§5.15 Monitoring extension (13): Cloud config drift detection + SIEM tuning
at scale + Network traffic analysis (NDR) + Detection engineering practice +
Security data lake architecture + Cloud audit logging strategy (analysis) +
Cloud config drift on production (analysis, single-focus TRUSTED-BASELINE-
RESTORE) + Multi-cloud SOC consolidation (analysis) + Insider threat detection
program design (analysis) + SIEM cost optimization (analysis) + Detection
engineering technical debt (analysis) + Cloud workload exploitation (analysis)
+ Cloud workload runtime detection gap (analysis)

**Position rotation D5-8:** 5A + 5B + 5C + 5D.
**Plus-list pattern:** 10 multi-track analysis + 1 single-focus (d5_154
TRUSTED-BASELINE-RESTORE for production config drift with measurable exposure).
**NEW single-focus principle (8th in D5):** TRUSTED-BASELINE-RESTORE — when
production security control has drifted from declared IaC baseline WITH
MEASURABLE EXPOSURE, FIRST action is IaC-pipeline rollback to last-known-good.
Distinct from contain-first (adversary confirmed), restore-first (control
misbehaving), exposure-window-close (vulnerability pre-exploitation no patch).
**Citation reuse:** library at ~1530 entries (+~80 D5-8 citations: NIST SSDF,
CISA SBOM, AWS IMDSv2 docs, OCSF + ECS, Drata/Vanta/Secureframe, Falco/Sysdig,
SLSA, AICPA SOC 2 TSC, Snowflake/Databricks).
