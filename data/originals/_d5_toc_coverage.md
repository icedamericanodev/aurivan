# Domain 5 — Protection of Information Assets — TOC Coverage

CISA Review Manual 28th Edition, Domain 5 (26% exam weight, 260 questions target).

**Last updated:** D5-5 (d5_081..d5_100).

## Tier targets

| Tier          | Target | Authored | Remaining |
|---------------|-------:|---------:|----------:|
| Foundational  |     26 |       20 |         6 |
| Application   |    130 |       60 |        70 |
| Analysis      |    104 |       20 |        84 |
| **Total**     |    260 |      100 |       160 |

## TOC coverage (D5-1 through D5-5)

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
| 5.9    | Web-Based Communication Techniques                       |        5 | ✓ opened (D5-5) |
| 5.10   | Virtualized Environments                                 |        6 | ✓ opened (D5-5) |
| 5.11   | Mobile, Wireless, IoT Devices                            |        9 | ✓ opened (D5-5) |
| 5.12   | Security Awareness Training and Programs                 |        0 | pending |
| 5.13   | Information System Attack Methods and Techniques         |        0 | pending |
| 5.14   | Security Testing Tools and Techniques                    |        0 | pending |
| 5.15   | Security Monitoring Tools and Techniques                 |        0 | pending |
| 5.16   | Incident Response Management                             |        0 | pending |
| 5.17   | Evidence Collection and Forensics                        |        0 | pending |

## Coverage plan for remaining batches (D5-6 through D5-13)

160 questions across 8 batches. Mix targets: 6F + 70A + 84An remaining.

| Batch | Range | Mix | §5.12 SecAware | §5.13 Attacks | §5.14 Testing | §5.15 Monitoring | §5.16 IR | §5.17 Forensics |
|-------|------:|----:|---:|---:|---:|---:|---:|---:|
| **D5-6** | d5_101..d5_120 | 2F+10A+8An | 6 (open + close) | 4 | — | — | — | — |
| **D5-7** | d5_121..d5_140 | 2F+10A+8An | — | 6 (close) | 5 (open) | 5 (open) | — | — |
| **D5-8** | d5_141..d5_160 | 2F+10A+8An (F TIER CLOSED at 26) | — | — | 6 (close) | 8 | — | — |
| **D5-9** | d5_161..d5_180 | 0F+10A+10An | — | — | — | 7 (close) | 10 (open) | — |
| **D5-10** | d5_181..d5_200 | 0F+10A+10An | — | — | — | — | 10 | — |
| **D5-11** | d5_201..d5_220 | 0F+10A+10An | — | — | — | — | 5 (close) | 12 (open) |
| **D5-12** | d5_221..d5_240 | 0F+10A+10An (A TIER CLOSED at 130) | — | — | — | — | — | 8 (close) |
| **D5-13** | d5_241..d5_260 | 0F+0A+20An (FINAL, An TIER CLOSED) | — | — | — | — | — | — (capstone scenarios spanning all D5) |

After D5-13: ALL 17 TOC sections covered + all three tier targets met (26F + 130A + 104An = 260).

## Batch log

### D5-1 (d5_001..d5_020) — 4F + 12A + 4An
§5.1 Security Frameworks/Standards/Baselines (8) + §5.3 Physical & Environmental (12).

### D5-2 (d5_021..d5_040) — 4F + 12A + 4An
§5.2 Privacy Principles (9) + §5.4 Identity and Access Management (11).

### D5-3 (d5_041..d5_060) — 4F + 12A + 4An
§5.5 Network/Endpoint Security (12) + §5.4 IAM closing (2: ABAC, IGA) + §5.6 DLP (6).

### D5-4 (d5_061..d5_080) — 4F + 12A + 4An
§5.7 Data Encryption (15) + §5.8 PKI (5).

### D5-5 (d5_081..d5_100) — 4F + 12A + 4An
§5.9 Web Communications (5): OWASP Top 10 + WAF audit + API security + security headers + WAF false-positive flood
§5.10 Virtualized Environments (6): virt taxonomy + hypervisor hardening + container security + VM escape + cloud workload identity + container escape detection
§5.11 Mobile/Wireless/IoT (9): mobile threats + WiFi protocols + MDM audit + BYOD policy + IoT framework + WIDS + mobile app sec (MASVS) + BYOD compromise + IoT botnet

**Position rotation D5-5:** 5A + 5B + 5C + 5D (perfect).
**Plus-list pattern:** 2/4 analysis (d5_097 WAF monitor-mode + d5_098 container isolate single-focus, distinct principles: business-continuity-restore vs lateral-movement-contain).
**Citation reuse:** library at 1336 entries (+52 D5-5 citations covering OWASP Top 10 / API Top 10 / MASVS, NIST SP 800-125/153/190/124, CIS Kubernetes/ESXi Benchmarks, IEEE 802.11i, Wi-Fi Alliance WPA3, FDA 21 CFR Part 11, Citizen Lab/Amnesty Tech Pegasus research).
