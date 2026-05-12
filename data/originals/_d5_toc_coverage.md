# Domain 5 — Protection of Information Assets — TOC Coverage

CISA Review Manual 28th Edition, Domain 5 (26% exam weight, 260 questions target).

**Last updated:** D5-7 (d5_121..d5_140).

## Tier targets

| Tier          | Target | Authored | Remaining |
|---------------|-------:|---------:|----------:|
| Foundational  |     26 |       24 |         2 |
| Application   |    130 |       82 |        48 |
| Analysis      |    104 |       34 |        70 |
| **Total**     |    260 |      140 |       120 |

## TOC coverage (D5-1 through D5-7)

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
| 5.14   | Security Testing Tools and Techniques                    |       10 | ✓ opened (D5-7) |
| 5.15   | Security Monitoring Tools and Techniques                 |       10 | ✓ opened (D5-7) |
| 5.16   | Incident Response Management                             |        0 | pending |
| 5.17   | Evidence Collection and Forensics                        |        0 | pending |

## Remaining coverage plan (D5-8 through D5-13)

120 questions across 6 batches. Mix targets: 2F + 48A + 70An remaining.

| Batch | Mix | TOC focus |
|---|---|---|
| **D5-8** | 1F+9A+10An | §5.14 (extend) + §5.15 (extend) — **F TIER CLOSES at 25-26** |
| **D5-9** | 1F+8A+11An | §5.16 IR (open) |
| **D5-10** | 0F+8A+12An | §5.16 IR (extend) |
| **D5-11** | 0F+8A+12An | §5.16 (close) + §5.17 Forensics (open) |
| **D5-12** | 0F+8A+12An | §5.17 (close) — **A TIER CLOSES at 130** |
| **D5-13 FINAL** | 0F+7A+13An | Capstone analysis spanning all D5 — **An TIER CLOSES at 104** |

After D5-13: all 17 TOC sections covered + all three tier targets met.

## Batch log

### D5-1 through D5-6 (d5_001..d5_120)
§5.1 through §5.13 opened across batches 1-6. See git history for batch details.

### D5-7 (d5_121..d5_140) — 2F + 12A + 6An
§5.14 Security Testing Tools (10): Testing taxonomy (9 techniques) + SAST audit + DAST audit + Penetration Testing Program + Vulnerability Scanning Program + Threat Modeling (STRIDE) + Bug Bounty Program + Pentest Finding Remediation (analysis) + Zero-Day Mitigation (single-focus EXPOSURE-WINDOW-CLOSE analysis) + SAST False-Positive Flood (analysis)
§5.15 Security Monitoring Tools (10): SIEM/SOC taxonomy + SIEM Use-Case Framework + SOC Operating Model + Log Management Strategy + Threat Hunting + UEBA + SOAR Automation + SOC Alert Fatigue (analysis) + SIEM Log Gap Discovery (analysis) + MSSP Transition (analysis)

**Position rotation D5-7:** 5A + 5B + 5C + 5D.
**Plus-list pattern:** 5/6 analysis questions (83%, above 70% threshold but pedagogy-justified). Single-focus d5_137 introduces new EXPOSURE-WINDOW-CLOSE principle (zero-day with public PoC + no patch — deploy compensating controls before patch available).
**Single-focus principles to date (7)**: contain-first (077/098), restore-first (097), lateral-movement-contain (098), irreversible-loss-clock (080), financial-loss-clock (112 BEC), credential-validity-clock (119), **exposure-window-close (137 zero-day)**.
**Citation reuse:** library at ~1450 entries (+~60 D5-7 citations: PTES, OWASP SAMM, MITRE D3FEND, OWASP Threat Dragon, Microsoft Threat Modeling Tool, SANS Threat Hunting, MaGMA Use Case Framework, CISA KEV Catalog, CISA BOD 22-01, ISO/IEC 30111).
