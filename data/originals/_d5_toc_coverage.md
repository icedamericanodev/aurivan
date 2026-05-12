# Domain 5 — Protection of Information Assets — TOC Coverage

CISA Review Manual 28th Edition, Domain 5 (26% exam weight, 260 questions target).

**Last updated:** D5-6 (d5_101..d5_120).

## Tier targets

| Tier          | Target | Authored | Remaining |
|---------------|-------:|---------:|----------:|
| Foundational  |     26 |       22 |         4 |
| Application   |    130 |       70 |        60 |
| Analysis      |    104 |       28 |        76 |
| **Total**     |    260 |      120 |       140 |

## TOC coverage (D5-1 through D5-6)

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
| 5.12   | Security Awareness Training and Programs                 |        6 | ✓ opened (D5-6) |
| 5.13   | Information System Attack Methods and Techniques         |       14 | ✓ opened (D5-6) |
| 5.14   | Security Testing Tools and Techniques                    |        0 | pending |
| 5.15   | Security Monitoring Tools and Techniques                 |        0 | pending |
| 5.16   | Incident Response Management                             |        0 | pending |
| 5.17   | Evidence Collection and Forensics                        |        0 | pending |

## Remaining coverage plan (D5-7 through D5-13)

140 questions across 7 batches. Mix targets: 4F + 60A + 76An remaining.

| Batch | Mix | TOC focus |
|---|---|---|
| **D5-7** | 2F+10A+8An | §5.14 Testing Tools (open) + §5.15 Monitoring (open) |
| **D5-8** | 2F+10A+8An | §5.14 (close) + §5.15 (extend) — **F TIER CLOSED at 26** |
| **D5-9** | 0F+10A+10An | §5.15 (close) + §5.16 IR (open) |
| **D5-10** | 0F+10A+10An | §5.16 IR (extend) |
| **D5-11** | 0F+10A+10An | §5.16 (close) + §5.17 Forensics (open) |
| **D5-12** | 0F+10A+10An | §5.17 (close) — **A TIER CLOSED at 130** |
| **D5-13 FINAL** | 0F+0A+20An | Capstone analysis spanning all D5 — **An TIER CLOSED at 104** |

After D5-13: all 17 TOC sections covered + all three tier targets met.

## Batch log

### D5-1 (d5_001..d5_020) — 4F + 12A + 4An
§5.1 (8) + §5.3 (12).

### D5-2 (d5_021..d5_040) — 4F + 12A + 4An
§5.2 (9) + §5.4 (11).

### D5-3 (d5_041..d5_060) — 4F + 12A + 4An
§5.5 (12) + §5.4 closing (2) + §5.6 (6).

### D5-4 (d5_061..d5_080) — 4F + 12A + 4An
§5.7 (15) + §5.8 (5).

### D5-5 (d5_081..d5_100) — 4F + 12A + 4An
§5.9 (5) + §5.10 (6) + §5.11 (9).

### D5-6 (d5_101..d5_120) — 2F + 10A + 8An
§5.12 Security Awareness (6): program framework + phishing simulation +
role-based training + insider-threat awareness + awareness metrics + program
effectiveness analysis (analysis tier)
§5.13 Attack Methods (14): MITRE ATT&CK taxonomy + phishing patterns +
social engineering + web/network/endpoint attack catalogs + privilege
escalation/lateral movement + BEC wire-fraud (single-focus halt-and-verify
analysis) + data exfiltration (analysis) + supply chain compromise (analysis)
+ ransomware multi-site (analysis) + APT investigation (analysis) +
phishing initial access (single-focus revoke-access analysis) +
watering-hole attack (analysis)

**Position rotation D5-6:** 5A + 5B + 5C + 5D.
**Plus-list pattern:** 6/8 analysis questions (75%, above 70% threshold);
6 multi-track + 2 single-focus (d5_112 BEC + d5_119 phishing IA).
**Single-focus principles introduced**: FINANCIAL-LOSS-CLOCK (d5_112,
halt wire + verify out-of-band) and CREDENTIAL-VALIDITY-CLOCK (d5_119,
full access revocation not just password reset). Distinct from prior
principles: contain-first (d5_077/098), restore-first (d5_097),
lateral-movement-contain (d5_098), irreversible-loss-clock (d5_080).
**Citation reuse:** library at ~1390 entries (+~54 D5-6 citations).
