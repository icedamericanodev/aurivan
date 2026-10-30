# CC Framework Citation Library

**Purpose:** the canonical `framework_ref` strings for the CC question bank
(`data/cc/originals/d{N}.json`). Started 28 Oct 2026 from the D1 and D3 pilot
batches (`cc_d1_001`–`020`, `cc_d3_001`–`020`); D2 pilot citations (`cc_d2_001`–`020`) added 29 Oct 2026. D5 pilot citations (`cc_d5_001`–`020`) added 29 Oct 2026. D4 pilot citations (`cc_d4_001`–`020`) added 30 Oct 2026, all NIST, each checked against a local text copy of the NIST PDF.

**Format** (same as `data/originals/_framework_library.md`):
- Each canonical citation is a bullet at the start of a line (`- `). Split a
  `framework_ref` on `;` and match each part exactly.
- Indented sub-bullets record the status and are ignored by the parser.
- Add a new citation here in the same change that first uses it.

**Status key:**
- **Verified:** the section or control was checked against the source, or a
  verbatim copy of it. **Verified (title):** the title was confirmed against
  the published control list; the fit to the item is judged separately.
- **Likely:** the edition is current and the title matches, but the official
  text was not opened. Check it before release.

**One form everywhere.** `<publisher> <document> <edition> <locator> (<title or
short paraphrase>)`, with no comma anywhere before the parenthesis. Locators:
`Section 3.2.1`, `Table 1`, `Clause 6.1.3 f)`, `Control 5.31`, `Safeguard 3.7`,
a NIST control ID (`AU-10`) or a CSF ID (`GV.RM-02`). NIST enhancements use the
catalog form `CP-9(1) (System Backup | Testing for Reliability and Integrity)`.
One citation per `;`-separated part: never join two controls with "and". CSF
IDs always carry their paraphrase. Write CSF 2.0 as `NIST CSF 2.0`, never
`NIST CSWP 29, …`. CIS is `CIS Controls v8.1`. (Comma forms and "and" compounds
were removed on 29 Oct 2026, audit pilot 2, S7.)

---

## NIST

### SP 800-53 Rev. 5, Security and Privacy Controls (Sep 2020; catalog release 5.2.0, Aug 2025)
- NIST SP 800-53 Rev. 5 AC-2 (Account Management)
- NIST SP 800-53 Rev. 5 AC-3 (Access Enforcement)
- NIST SP 800-53 Rev. 5 AC-3(3) (Access Enforcement | Mandatory Access Control)
- NIST SP 800-53 Rev. 5 AC-3(4) (Access Enforcement | Discretionary Access Control)
- NIST SP 800-53 Rev. 5 AC-3(7) (Access Enforcement | Role-based Access Control)
- NIST SP 800-53 Rev. 5 AC-3(13) (Access Enforcement | Attribute-based Access Control)
- NIST SP 800-53 Rev. 5 AC-5 (Separation of Duties)
- NIST SP 800-53 Rev. 5 AC-6 (Least Privilege)
- NIST SP 800-53 Rev. 5 AC-16 (Security and Privacy Attributes)
- NIST SP 800-53 Rev. 5 IA-2 (Identification and Authentication (Organizational Users))
- NIST SP 800-53 Rev. 5 IA-5 (Authenticator Management)
- NIST SP 800-53 Rev. 5 PS-4 (Personnel Termination)
- NIST SP 800-53 Rev. 5 PS-5 (Personnel Transfer)
  - All of the above: Verified, 28 Oct 2026.
- NIST SP 800-53 Rev. 5 AC-6(2) (Least Privilege | Non-privileged Access for Nonsecurity Functions)
  - Verified, 30 Oct 2026, against the NIST OSCAL catalog (usnistgov/oscal-content, release 5.2.0) and the Rev. 5 PDF on nvlpubs.nist.gov. The enhancement requires users with privileged access to use non-privileged accounts or roles for nonsecurity functions, which fits cc_d3_014 (no email or browsing on admin accounts).
- NIST SP 800-53 Rev. 5 AU-2 (Event Logging)
- NIST SP 800-53 Rev. 5 AU-10 (Non-repudiation)
- NIST SP 800-53 Rev. 5 PE-3 (Physical Access Control)
- NIST SP 800-53 Rev. 5 PE-6 (Monitoring Physical Access)
- NIST SP 800-53 Rev. 5 RA-7 (Risk Response)
- NIST SP 800-53 Rev. 5 SA-8(33) (Security and Privacy Engineering Principles | Minimization)
- NIST SP 800-53 Rev. 5 SI-2 (Flaw Remediation)
- NIST SP 800-53 Rev. 5 SI-12(1) (Information Management and Retention | Limit Personally Identifiable Information Elements)
  - D1 pilot controls: Verified, 28 Oct 2026. Comma forms and "and" compounds replaced with one citation per part, 29 Oct 2026; enhancement titles now carry the parent control.
  - PE-3 alone carries cc_d1_016 from 30 Oct 2026: its discussion covers entry and exit points and says physical access control systems comply with applicable laws and regulations. ISO/IEC 27002:2022 Control 7.1 was dropped there because its fire-door guidance could not be checked against the 2022 text.
- NIST SP 800-53 Rev. 5 Appendix A Glossary (compensating controls)
  - Verified, 30 Oct 2026, in Appendix A Glossary of the Rev. 5 PDF (nvlpubs.nist.gov): controls employed in lieu of the baseline controls that give equivalent or comparable protection. The entry carries no source tag. Fits cc_d1_015 (compensating controls in place of a required badge reader). Used in cc_d1_015.
- NIST SP 800-53 Rev. 5 AT-2(3) (Literacy Training and Awareness | Social Engineering and Mining)
- NIST SP 800-53 Rev. 5 AT-3 (Role-based Training)
- NIST SP 800-53 Rev. 5 CA-7 (Continuous Monitoring)
- NIST SP 800-53 Rev. 5 CP-4 (Contingency Plan Testing)
- NIST SP 800-53 Rev. 5 CP-7 (Alternate Processing Site)
- NIST SP 800-53 Rev. 5 CP-9(1) (System Backup | Testing for Reliability and Integrity)
  - D2 pilot (cc_d2_003, 008–014). Verified 29 Oct 2026 against the Rev. 5 PDF on nvlpubs.nist.gov (control and enhancement titles). cc_d2_003 also uses the CM-3 entry in the D5 block below.
- NIST SP 800-53 Rev. 5 CA-8 (Penetration Testing)
- NIST SP 800-53 Rev. 5 CA-8(2) (Penetration Testing | Red Team Exercises)
- NIST SP 800-53 Rev. 5 CM-2 (Baseline Configuration)
- NIST SP 800-53 Rev. 5 CM-3 (Configuration Change Control)
- NIST SP 800-53 Rev. 5 RA-5 (Vulnerability Monitoring and Scanning)
- NIST SP 800-53 Rev. 5 SA-11(1) (Developer Testing and Evaluation | Static Code Analysis)
- NIST SP 800-53 Rev. 5 SA-11(8) (Developer Testing and Evaluation | Dynamic Code Analysis)
- NIST SP 800-53 Rev. 5 SA-22 (Unsupported System Components)
  - D5 pilot. Verified 29 Oct 2026: titles matched against the Rev. 5 PDF text. CM-3 is also used by cc_d1_013 and cc_d2_003.
- NIST SP 800-53 Rev. 5 AC-4 (Information Flow Enforcement)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (NIST OSCAL catalog, release 5.2.0; title and text) and sp800-53r5.txt (nvlpubs.nist.gov): enforce approved authorizations for the flow of information within a system and between connected systems. Fits filtering what crosses between VLANs. Used in cc_d4_010.
- NIST SP 800-53 Rev. 5 AC-18(1) (Wireless Access | Authentication and Encryption)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (NIST OSCAL catalog, release 5.2.0; title and text) and sp800-53r5.txt (nvlpubs.nist.gov): protect wireless access with authentication and encryption; strong encryption reduces wireless threats. Fits choosing WPA3. Used in cc_d4_006.
- NIST SP 800-53 Rev. 5 CM-7 (Least Functionality)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (NIST OSCAL catalog, release 5.2.0; title and text) and sp800-53r5.txt (nvlpubs.nist.gov): prohibit or restrict functions, ports, protocols and services that are not needed. Fits retiring cleartext FTP. Used in cc_d4_002.
- NIST SP 800-53 Rev. 5 SA-9 (External System Services)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (NIST OSCAL catalog, release 5.2.0; title and text) and sp800-53r5.txt (nvlpubs.nist.gov): define and document oversight and user roles and responsibilities for external system services. Fits the provider and customer duty split for a managed AI service. Used in cc_d4_020.
- NIST SP 800-53 Rev. 5 SC-7 (Boundary Protection)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (NIST OSCAL catalog, release 5.2.0; title and text) and sp800-53r5.txt (nvlpubs.nist.gov): implement subnetworks for publicly accessible components separated from internal networks; the discussion calls these DMZs. Fits placing the web server in the screened subnet and the database inside. Used in cc_d4_009.
- NIST SP 800-53 Rev. 5 SC-7(5) (Boundary Protection | Deny by Default — Allow by Exception)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (NIST OSCAL catalog, release 5.2.0; title and text) and sp800-53r5.txt (nvlpubs.nist.gov): deny traffic by default and allow by exception, inbound and outbound, so only essential, approved connections pass. Fits outbound access from an AI training segment only to approved sources. Used in cc_d4_014.
- NIST SP 800-53 Rev. 5 SC-7(21) (Boundary Protection | Isolation of System Components)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (NIST OSCAL catalog, release 5.2.0; title and text) and sp800-53r5.txt (nvlpubs.nist.gov): isolate system components with boundary protection to limit unauthorized flows between them. Fits putting a smart door-lock hub on its own segment. Used in cc_d4_008.
- NIST SP 800-53 Rev. 5 SC-8(1) (Transmission Confidentiality and Integrity | Cryptographic Protection)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (NIST OSCAL catalog, release 5.2.0; title and text) and sp800-53r5.txt (nvlpubs.nist.gov): use cryptography to protect information during transmission. Fits replacing FTP with SFTP. Used in cc_d4_002.
- NIST SP 800-53 Rev. 5 SI-4(13) (System Monitoring | Analyze Traffic and Event Patterns)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (NIST OSCAL catalog, release 5.2.0; title and text) and sp800-53r5.txt (nvlpubs.nist.gov): develop profiles of common traffic and event patterns and use them to tune monitoring so anomalous traffic stands out. Fits machine-learning traffic monitoring. Used in cc_d4_005.
- NIST SP 800-53 Rev. 5 AU-9 (Protection of Audit Information)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (OSCAL 5.2.0) and sp800-53r5.txt (nvlpubs.nist.gov): the control protects audit information and logging tools from unauthorized access, modification and deletion. Fits a log the administrator can delete. Used in cc_d1_027.
- NIST SP 800-53 Rev. 5 AU-9(2) (Protection of Audit Information | Store on Separate Physical Systems or Components)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (OSCAL 5.2.0) and sp800-53r5.txt (nvlpubs.nist.gov): store audit records in a repository on a physically different system, so a compromise of the audited system does not also compromise its records. Fits copying log entries to a server the administrator cannot alter. Used in cc_d1_027.
- NIST SP 800-53 Rev. 5 PT-3 (Personally Identifiable Information Processing Purposes)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (OSCAL 5.2.0) and sp800-53r5.txt (nvlpubs.nist.gov): identify and document the purposes for processing PII, describe them in privacy notices, and restrict processing to what is compatible with those purposes. Fits reusing booking phone numbers for sales texts. Used in cc_d1_028.
- NIST SP 800-53 Rev. 5 PL-4 (Rules of Behavior)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (OSCAL 5.2.0) and sp800-53r5.txt (nvlpubs.nist.gov): provide the rules for system use, and receive a documented acknowledgment that they have been read and agreed to before authorizing access. Fits signed data-use rules before volunteers get access. Used in cc_d1_039.
- NIST SP 800-53 Rev. 5 CP-10 (System Recovery and Reconstitution)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (OSCAL 5.2.0) and sp800-53r5.txt (nvlpubs.nist.gov): provide for recovery and reconstitution of the system to a known state after a disruption, compromise or failure. Fits restoring a ransomware-locked server from backup as a recovery control. Used in cc_d1_041.
- NIST SP 800-53 Rev. 5 Appendix A Glossary (defense in depth)
  - Verified, 30 Oct 2026, in Appendix A Glossary of sp800-53r5.txt (nvlpubs.nist.gov): a strategy that integrates people, technology and operations capabilities to set variable barriers across multiple layers. Fits adding an administrative, detective layer instead of more locks. Used in cc_d1_042.
- NIST SP 800-53 Rev. 5 PL-8(1) (Security and Privacy Architectures | Defense in Depth)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (NIST OSCAL catalog, release 5.2.0; title and text): design the architecture with a defense-in-depth approach so "adversaries must overcome multiple controls to achieve their objective", with the allocated controls operating "in a coordinated and mutually reinforcing manner". Fits four controls sharing one administrator password failing as one layer. Used in cc_d4_027.
- NIST SP 800-53 Rev. 5 SC-7(15) (Boundary Protection | Networked Privileged Accesses)
  - Verified, 30 Oct 2026, against sp800-53r5-catalog.json (NIST OSCAL catalog, release 5.2.0; title and text): "Route networked, privileged accesses through a dedicated, managed interface for purposes of access control and auditing." Fits moving switch and firewall admin pages to a management VLAN only network staff can reach. Used in cc_d4_038.

### SP 800-34 Rev. 1, Contingency Planning Guide for Federal Information Systems (May 2010, updated Nov 2010)
- NIST SP 800-34 Rev. 1 Section 2.2 (Types of Plans: Business Continuity Plan and Disaster Recovery Plan)
- NIST SP 800-34 Rev. 1 Section 3.2.1 (Determine Business Processes and Recovery Criticality: MTD, RTO and RPO)
- NIST SP 800-34 Rev. 1 Section 3.4.3 (Alternate Sites)
- NIST SP 800-34 Rev. 1 Section 3.5 (Plan Testing, Training, and Exercises)
  - Verified 29 Oct 2026 against the PDF table of contents and text (nvlpubs.nist.gov). Still the current revision: no Rev. 2 is published (checked again 28 Oct 2026). 2.2.1 is the BCP and 2.2.6 the DRP; 3.2.1 defines MTD, RTO and RPO; 3.4.3 describes cold, warm and hot sites.

### SP 800-50 Rev. 1, Building a Cybersecurity and Privacy Learning Program (Sep 2024)
- NIST SP 800-50 Rev. 1 (Building a Cybersecurity and Privacy Learning Program)
  - Verified 29 Oct 2026 (local copy of the NIST PDF). Cited by title; it covers awareness, role-based training and learning culture.

### SP 800-55 Vol. 1, Measurement Guide for Information Security: Identifying and Selecting Measures (Dec 2024)
- NIST SP 800-55v1 Section 2.4 (Metrics: key risk indicators and key performance indicators)
- NIST SP 800-55v1 Section 3.3 (Types of Measures: implementation, effectiveness, efficiency and impact)
- NIST SP 800-55v1 Section 4.4 (Evaluating Methods for Supporting Continuous Improvement: leading and lagging indicators)
  - Verified 29 Oct 2026 (local copy of the NIST PDF). 2.4 names KRIs and KPIs as kinds of metric; 3.3.1–3.3.4 are the four measure types; 4.4 defines KPI, KRI, leading and lagging indicators.

### AI Risk Management Framework, NIST AI 100-1 (AI RMF 1.0, Jan 2023) and NIST AI 600-1 (Generative AI Profile, Jul 2024)
- NIST AI 100-1 (AI RMF 1.0) GOVERN 1.6 (mechanisms are in place to inventory AI systems)
- NIST AI 100-1 (AI RMF 1.0) MEASURE 2.4 (the functionality and behavior of the AI system are monitored when in production)
- NIST AI 100-1 (AI RMF 1.0) MANAGE 4.1 (post-deployment monitoring plans, including capturing user input, appeal and override)
- NIST AI 600-1 (Generative AI Profile) Section 2.8 (Information Integrity: deepfakes and content that impersonates others)
  - Verified 29 Oct 2026 (local copies of the NIST PDFs). Wording paraphrases the subcategory text; MANAGE 4.1 names "appeal and override" explicitly.
- NIST AI 100-1 (AI RMF 1.0) GOVERN 3.2 (roles and responsibilities for human-AI configurations and oversight of AI systems are defined)
  - Verified, 30 Oct 2026, against ai100-1.txt (nvlpubs.nist.gov): "Policies and procedures are in place to define and differentiate roles and responsibilities for human-AI configurations and oversight of AI systems." Fits keeping staff review of high-impact AI replies. Used in cc_d1_040.

### SP 800-63-4 Digital Identity Guidelines (final, 2025; csrc.nist.gov lists 31 Jul 2025)
- NIST SP 800-63B-4 (Authentication and Authenticator Management: multi-factor authentication)
- NIST SP 800-63B-4 (Authentication and Authenticator Management: password requirements)
- NIST SP 800-63B-4 (Authentication and Authenticator Management: phishing resistance)
- NIST SP 800-63C-4 (Federation and Assertions)
  - Verified, 28 Oct 2026. Cited by topic, not section number; the full text on pages.nist.gov was blocked during authoring. A biometric counts only when paired with a physical authenticator (the cc_d3_001 fix depends on this).

### SP 800-41 Rev. 1, Guidelines on Firewalls and Firewall Policy (Sep 2009)
- NIST SP 800-41 Rev. 1 Section 2.1.7 (Network Access Control: health checks and limited access for remediation)
  - Verified, 30 Oct 2026, against sp800-41r1.txt (nvlpubs.nist.gov): "If the user has acceptable credentials but the device does not pass the health check, the user and device may get only limited access to the internal network for remediation purposes." Fits cc_d4_013. Used in cc_d4_013.
- NIST SP 800-41 Rev. 1 Section 3.1 (Network Layouts with Firewalls: public-facing servers on the DMZ)
  - Verified, 30 Oct 2026, against sp800-41r1.txt (nvlpubs.nist.gov): "It is common to put public-facing servers, such as web and email servers, on the DMZ", with DMZ-to-internal traffic still passing the firewall. Used in cc_d4_009.
  - Current final; csrc.nist.gov shows no newer revision or withdrawal (checked 30 Oct 2026).
- NIST SP 800-41 Rev. 1 Section 2.1.2 (Stateful Inspection: tracking TCP connection state)
  - Verified, 30 Oct 2026, against sp800-41r1.txt (nvlpubs.nist.gov): stateful inspection keeps "track of each connection in a state table" with "greater awareness of the transport layer"; when two hosts "complete the three-way TCP handshake, the connection state will change to 'established'", and UDP is connectionless. Fits SYN, SYN-ACK, ACK opening a TCP connection (cc_d4_022) and stateful inspection tracking connections without recognizing applications (cc_d4_024). Used in cc_d4_022 and cc_d4_024.
- NIST SP 800-41 Rev. 1 Section 2.1.3 (Application Firewalls)
  - Verified, 30 Oct 2026, against sp800-41r1.txt (nvlpubs.nist.gov): stateful protocol analysis inspects protocols at the application layer, letting a firewall "allow or deny access based on how an application is running over the network", for example detecting "if instant messaging (IM) is being used over port 80". Fits blocking a banned app that shares port 443 with browsing. Used in cc_d4_024.
- NIST SP 800-41 Rev. 1 Section 4.1.2 (IPv6: filter IPv6 traffic as fully as IPv4)
  - Verified, 30 Oct 2026, against sp800-41r1.txt (nvlpubs.nist.gov): deny-by-default "should be done regardless of whether or not the traffic has an IPv4 or IPv6 address"; "The firewall should be able to use IPv6 addresses in all filtering rules that use IPv4 addresses", and admins may "clone IPv4 rules to IPv6 addresses". Fits writing matching IPv6 rules before enabling IPv6. Used in cc_d4_023.

### SP 800-46 Rev. 2, Guide to Enterprise Telework, Remote Access, and Bring Your Own Device (BYOD) Security (Jul 2016)
- NIST SP 800-46 Rev. 2 Section 2.1 (Vulnerabilities, Threats, and Security Controls: infected client devices)
  - Verified, 30 Oct 2026, against sp800-46r2.txt (nvlpubs.nist.gov): "If a client device is infected with malware, this malware may spread throughout the organization"; organizations should assume client devices will become infected. Fits a VPN not making the laptop safe. Used in cc_d4_003. Current final on csrc.nist.gov (checked 30 Oct 2026).

### SP 800-77 Rev. 1, Guide to IPsec VPNs (Jun 2020)
- NIST SP 800-77 Rev. 1 Section 2.1 (The Need for Network Layer Security: controls at each layer)
  - Verified, 30 Oct 2026, against sp800-77r1.txt (nvlpubs.nist.gov): compares application, transport, network and data link layer controls; "data link layer controls for WiFi networks are usually provided through WiFi chipset firmware". Fits placing WPA3 at layer 2. Used in cc_d4_001.
- NIST SP 800-77 Rev. 1 Section 2.3 (Virtual Private Networking (VPN))
  - Verified, 30 Oct 2026, against sp800-77r1.txt (nvlpubs.nist.gov): a VPN provides a secure communications mechanism for data transmitted across existing networks such as the internet. Fits a VPN protecting traffic in transit. Used in cc_d4_003.
- NIST SP 800-77 Rev. 1 Section 8.1.1 (WiFi Data Link Protection)
  - Verified, 30 Oct 2026, against sp800-77r1.txt (nvlpubs.nist.gov): WEP "is easily broken"; WPA2 uses AES-CCM; WPA3 replaces the PSK with a password-authenticated key exchange that better resists weak passwords and adds forward secrecy; Wi-Fi encryption protects only device to access point. Used in cc_d4_001 and cc_d4_006.
  - Current final on csrc.nist.gov (checked 30 Oct 2026).

### SP 800-82 Rev. 3, Guide to Operational Technology (OT) Security (Sep 2023)
- NIST SP 800-82 Rev. 3 Section 6.2.1.3 (Network Segmentation and Isolation: only explicitly authorized traffic between segments)
  - Verified, 30 Oct 2026, against sp800-82r3.txt (nvlpubs.nist.gov): segmentation is done with switches or VLANs, and firewalls or gateways enforce restrictions by "only permitting explicitly authorized communication between segments". Fits filtering traffic routed between VLANs. Used in cc_d4_010.
- NIST SP 800-82 Rev. 3 Section 6.2.11 (Flaw Remediation and Patch Management: test OT patches before applying)
  - Verified, 30 Oct 2026, against sp800-82r3.txt (nvlpubs.nist.gov): OT patches "should be adequately tested"; a patch "can also introduce a greater risk from a production or safety perspective". Fits reporting a controller flaw to its owner for a tested, scheduled fix. Used in cc_d4_007.
  - Rev. 3 is the current final. csrc.nist.gov notes (21 Sep 2026) an initial public draft of Rev. 4, comments due 30 Nov 2026; re-check these sections when Rev. 4 is final.
- NIST SP 800-82 Rev. 3 Appendix B Glossary (router)
  - Verified, 30 Oct 2026, against sp800-82r3.txt (nvlpubs.nist.gov), Appendix B Glossary: a router is "A computer that is a gateway between two networks at OSI layer 3 and that relays and directs data packets through that inter-network. The most common form of router operates on IP packets." Fits the device that carries traffic between two IP subnets. Used in cc_d4_021. (Rev. 4 initial public draft noted under this heading; the glossary entry is unaffected for now.)

### SP 800-94, Guide to Intrusion Detection and Prevention Systems (IDPS) (Feb 2007)
- NIST SP 800-94 Section 2.3.2 (Anomaly-Based Detection)
  - Verified, 30 Oct 2026, against sp800-94.txt (nvlpubs.nist.gov): profiles of normal behavior are learned over a training period; the method is "very effective at detecting previously unknown threats" but "often produce[s] many false positives". Fits what a machine-learning monitor adds over signatures. Used in cc_d4_005.
- NIST SP 800-94 Section 4.2.2 (Network Architectures and Sensor Locations: inline versus passive sensors)
  - Verified, 30 Oct 2026, against sp800-94.txt (nvlpubs.nist.gov): inline sensors exist "to enable them to stop attacks by blocking network traffic"; a passive sensor "monitors a copy of the actual network traffic". Fits IPS versus IDS. Used in cc_d4_004.
  - Still the current final: csrc.nist.gov says Draft Rev. 1 (2012) never became final and was retired (checked 30 Oct 2026).
- NIST SP 800-94 Section 7.1.3 (Agent Locations: host agents see activity inside encrypted communications)
  - Verified, 30 Oct 2026, against sp800-94.txt (nvlpubs.nist.gov): host-based agents go on "critical hosts such as publicly accessible servers and servers containing sensitive information"; "network-based IDPS sensors cannot analyze the activity within encrypted network communications, but host-based IDPS agents installed on endpoints can see the unencrypted activity" (Section 4.3.3.4 says the same). Fits a host-based IDS on a loan server whose traffic is encrypted. Used in cc_d4_034.

### SP 800-144, Guidelines on Security and Privacy in Public Cloud Computing (Dec 2011)
- NIST SP 800-144 Section 2.3 (Outsourcing and Accountability)
  - Verified, 30 Oct 2026, against sp800-144.txt (nvlpubs.nist.gov): "Ultimately, the organization is accountable for the choice of public cloud and the security and privacy of the outsourced service." Fits the school removing leavers' SaaS accounts. Used in cc_d4_017.
- NIST SP 800-144 Section 4.7 (Data Protection)
  - Verified, 30 Oct 2026, against sp800-144.txt (nvlpubs.nist.gov): organizations placing sensitive data in a public cloud "must account for the means by which access to the data is controlled and the data is kept secure". Fits the clinic deciding what patient data goes to a managed AI service. Used in cc_d4_020.
  - Current final on csrc.nist.gov, no newer revision or withdrawal shown (checked 30 Oct 2026).
- NIST SP 800-144 Section 4.6 (Software Isolation)
  - Verified, 30 Oct 2026, against sp800-144.txt (nvlpubs.nist.gov): "cloud providers have to ensure dynamic, flexible delivery of service and isolation of consumer resources"; IaaS multi-tenancy is done by running different consumers' virtual machines on one physical server, and the hypervisor "itself can potentially be compromised". Fits the provider patching a hypervisor flaw beneath IaaS virtual machines. Used in cc_d4_043.
- NIST SP 800-144 Section 5.1 (General Concerns: a provider's certification does not extend to the tenant's systems)
  - Verified, 30 Oct 2026, against sp800-144.txt (nvlpubs.nist.gov): "a third-party certification or other assurances from the cloud provider do not necessarily grant a tenant application or system that same level of certification or compliance", and provider assurances "should be verified whenever possible through independent assessment by the organization". Fits an independent report covering only the provider's controls. Used in cc_d4_030.

### SP 800-145, The NIST Definition of Cloud Computing (Sep 2011)
- NIST SP 800-145 Section 2 (The NIST Definition of Cloud Computing: essential characteristics)
  - Verified, 30 Oct 2026, against sp800-145.txt (nvlpubs.nist.gov): on-demand self-service is a consumer provisioning capabilities "without requiring human interaction with each service provider"; rapid elasticity is scaling outward and inward with demand. Used in cc_d4_015.
- NIST SP 800-145 Section 2 (The NIST Definition of Cloud Computing: service models)
  - Verified, 30 Oct 2026, against sp800-145.txt (nvlpubs.nist.gov): in PaaS the consumer does not manage the operating systems or infrastructure "but has control over the deployed applications". Fits who fixes a library bundled into a PaaS app. Used in cc_d4_016.
- NIST SP 800-145 Section 2 (The NIST Definition of Cloud Computing: deployment models)
  - Verified, 30 Oct 2026, against sp800-145.txt (nvlpubs.nist.gov): a private cloud is "provisioned for exclusive use by a single organization" and "may exist on or off premises"; a public cloud is for open use by the general public. Used in cc_d4_018.
  - Section 2 has three unnumbered parts (Essential Characteristics, Service Models, Deployment Models), so the paraphrase names the part. Current final on csrc.nist.gov (checked 30 Oct 2026).

### SP 800-207, Zero Trust Architecture (Aug 2020)
- NIST SP 800-207 Section 2.1 (Tenets of Zero Trust)
  - Verified, 30 Oct 2026, against sp800-207.txt (nvlpubs.nist.gov): "Network location alone does not imply trust"; access is "granted on a per-session basis" with least privilege, by dynamic policy that includes identity and the requesting asset's state. Used in cc_d4_012.
- NIST SP 800-207 Section 3.1.2 (ZTA Using Micro-Segmentation)
  - Verified, 30 Oct 2026, against sp800-207.txt (nvlpubs.nist.gov): individual resources or small groups sit on their own segments behind gateways or host-based agents that act as enforcement points. Fits per-server rules in a shared segment. Used in cc_d4_011.
  - Current final on csrc.nist.gov (checked 30 Oct 2026).
- NIST SP 800-207 Section 2 (Zero Trust Basics: perimeter firewalls do little against attacks from inside)
  - Verified, 30 Oct 2026, against sp800-207.txt (nvlpubs.nist.gov): perimeter firewalls "help block attackers from the internet" but "are less useful for detecting and blocking attacks from inside the network", and "unauthorized lateral movement within the environment has been one of the biggest challenges". Fits internal segments limiting how far an attacker already inside can reach. Used in cc_d4_026.
- NIST SP 800-207 Section 3 (Logical Components of Zero Trust Architecture)
  - Verified, 30 Oct 2026, against sp800-207.txt (nvlpubs.nist.gov): the policy engine "is responsible for the ultimate decision to grant access to a resource for a given subject"; the policy enforcement point "is responsible for enabling, monitoring, and eventually terminating connections". Section 2 states identity covers "person and non-person entities", and Section 5.7 discusses AI agents as non-person entities. Fits the policy engine deciding an AI assistant's request. Used in cc_d4_028.
- NIST SP 800-207 Section 7 (Migrating to a Zero Trust Architecture)
  - Verified, 30 Oct 2026, against sp800-207.txt (nvlpubs.nist.gov): "Implementing a ZTA is a journey rather than a wholesale replacement of infrastructure or processes"; organizations should "incrementally implement zero trust principles, process changes, and technology solutions" (Section 1: ZT "is not a single architecture but a set of guiding principles"). Fits rejecting a vendor's "Zero Trust in a week" product claim. Used in cc_d4_040.
- NIST SP 800-207 Section 7.3 (Steps to Introducing ZTA to a Perimeter-Based Architected Network)
  - Verified, 30 Oct 2026, against sp800-207.txt (nvlpubs.nist.gov): "Before undertaking an effort to bring ZTA to an enterprise, there should be a survey of assets, subjects, data flows, and workflows", because "An enterprise cannot determine what new processes or systems need to be in place if there is no knowledge of the current state". Fits mapping real server traffic before writing micro-segmentation rules (with SP 800-215 Section 5.1). Used in cc_d4_039.

### SP 800-213, IoT Device Cybersecurity Guidance for the Federal Government: Establishing IoT Device Cybersecurity Requirements (Nov 2021)
- NIST SP 800-213 Section 2.3 (How IoT Devices May Create Security Challenges)
  - Verified, 30 Oct 2026, against sp800-213.txt (nvlpubs.nist.gov): IoT devices "often lack cybersecurity functionality commonly present in conventional IT equipment (e.g., laptops)", and gaps may be compensated by other controls. Fits isolating a smart door-lock hub. Used in cc_d4_008. Current final on csrc.nist.gov (checked 30 Oct 2026).

### SP 800-215, Guide to a Secure Enterprise Network Landscape (Nov 2022)
- NIST SP 800-215 Section 3.1 (Cloud Access Security Broker (CASB))
  - Verified, 30 Oct 2026, against sp800-215.txt and the PDF bookmarks of sp800-215.pdf (nvlpubs.nist.gov; the text export drops heading numbers): CASBs give visibility into cloud use, "thus preventing or minimizing the chances of shadow IT", and enforce security and governance policies for cloud applications. Used in cc_d4_019.
- NIST SP 800-215 Section 5.1 (Microsegmentation)
  - Verified, 30 Oct 2026, against sp800-215.txt (nvlpubs.nist.gov): microsegmentation divides an internal network into isolated segments with granular policies that "restrict the unauthorized lateral movement" of users or applications. Used in cc_d4_011.
  - Current final on csrc.nist.gov (checked 30 Oct 2026).

### Other NIST publications
- NIST SP 800-162 (Guide to Attribute Based Access Control (ABAC) Definition and Considerations)
  - Jan 2014, with updates of Feb 2019. Verified, 28 Oct 2026.
- NIST SP 800-12 Rev. 1 Section 1.4 (Important Terminology: confidentiality, integrity, availability)
- NIST SP 800-12 Rev. 1 Section 3.4 (Information Owner/Steward)
- NIST SP 800-12 Rev. 1 Section 5.1 (Standards, Guidelines, and Procedures)
- NIST SP 800-12 Rev. 1 Section 9.1.3 (Electronic Signatures)
  - Jun 2017. Verified, 30 Oct 2026, against the PDF table of contents and text (nvlpubs.nist.gov). 1.4 defines confidentiality, integrity and availability (availability: timely and reliable access), used in cc_d1_001. 3.4: the information owner has authority over the information and sets the rules for its use and protection, used in cc_d5_004. 5.1: standards are normally compulsory and specify uniform use of technologies or parameters, used in cc_d1_009. 9.1.3 (with 9.1.3.2): a digital signature applies the signer's private key, used in cc_d1_002.
- NIST SP 800-30 Rev. 1 Section 2.3.1 (Risk Models: threats, vulnerabilities, likelihood and impact)
- NIST SP 800-30 Rev. 1 Section 2.3.2 (Assessment Approaches: quantitative assessments support cost-benefit analysis of risk responses)
  - Sep 2012. Verified, 28 Oct 2026. 800-30 does not use the terms SLE, ALE or ARO; cite it only for "quantitative supports cost-benefit".
- NIST SP 800-88 Rev. 2 Section 3.1 (Sanitization Methods: clear, purge and destroy)
  - Sep 2025. Verified 29 Oct 2026: PDF read. 3.1.1 Clear, 3.1.2 Purge, 3.1.3 Destroy; overwriting gives little protection on SSDs with spare cells; degaussing is not for flash storage; cryptographic erase is a purge technique (3.2).
- NIST SP 800-61 Rev. 3 Section 1 (Introduction: events, adverse events and incidents)
- NIST SP 800-61 Rev. 3 Table 1 (Previous incident response life cycle model's phases and corresponding CSF 2.0 Functions)
  - Apr 2025. Verified 29 Oct 2026: csrc.nist.gov date checked; Section 1 definitions and the list of tables read in the PDF.
- NIST SP 800-83 Rev. 1 (Guide to Malware Incident Prevention and Handling for Desktops and Laptops)
  - Jul 2013, still the current final on csrc.nist.gov (checked 29 Oct 2026). Cited by title, not section.
- NIST SP 800-57 Part 1 Rev. 5 (Recommendation for Key Management: Part 1 – General)
  - May 2020, current final (csrc.nist.gov checked 29 Oct 2026); Rev. 6 is a draft only. Cited by title, not section.
- NIST SP 800-40 Rev. 4 (Guide to Enterprise Patch Management Planning: Preventive Maintenance for Technology)
  - Apr 2022, current final (csrc.nist.gov checked 29 Oct 2026). Cited by title, not section.
- NIST AI 100-2 E2025 (Adversarial Machine Learning: A Taxonomy and Terminology of Attacks and Mitigations)
  - Mar 2025, current (csrc.nist.gov checked 29 Oct 2026). Cited by title.
- NIST AI 100-2 E2025 Section 3.2 (Supply Chain Attacks and Mitigations)
  - Verified, 30 Oct 2026, against ai100-2e2025.txt (nvlpubs.nist.gov): AI development adds dependencies such as third-party models; attackers can offer "maliciously designed models", and models are best treated as untrusted components. Fits limiting a training segment's downloads to approved sources. Used in cc_d4_014.
- NIST SP 800-12 Rev. 1 Section 9.1.2 (Integrity)
  - Jun 2017. Verified, 30 Oct 2026, against sp800-12r1.txt (nvlpubs.nist.gov): integrity means data has not been altered in an unauthorized manner; an attacker who modifies a message can also replace its error detection code, while cryptography can detect intentional and unintentional changes. Fits the plain-hash runner-up in cc_d1_022 and wrong-but-unnoticed figures in cc_d1_026. Used in cc_d1_022 and cc_d1_026.
- NIST SP 800-12 Rev. 1 Section 9.1.3.1 (Secret Key Electronic Signatures)
  - Jun 2017. Verified, 30 Oct 2026, against sp800-12r1.txt (nvlpubs.nist.gov): with a message authentication code (MAC) verified under a shared secret key, the receiver may assume the other key holder produced the data; a MAC gives data integrity and a form of electronic signature, assuming the parties trust each other. Fits a keyed hash between each sensor and the server. Used in cc_d1_022.
- NIST SP 800-30 Rev. 1 Appendix B Glossary (criticality and sensitivity)
  - Sep 2012. Verified, 30 Oct 2026, against sp800-30r1.txt (nvlpubs.nist.gov), Appendix B Glossary: criticality is the degree to which an organization depends on the information or system for a mission or business function; sensitivity is the importance the owner assigns to information to denote its need for protection (both sourced to SP 800-60). Fits rating a public but business-critical price list. Used in cc_d1_021.
- NIST SP 800-30 Rev. 1 Section 3.4 (Maintaining the Risk Assessment)
  - Sep 2012. Verified, 30 Oct 2026, against sp800-30r1.txt (nvlpubs.nist.gov): the fourth step keeps risk knowledge current, monitoring risk factors such as threat sources and updating the assessment to reflect changes. Fits reassessing after a new threat (cc_d1_029) and re-rating after a new control (cc_d1_030). Used in cc_d1_029 and cc_d1_030.
- NIST SP 800-39 Section 2.1 (Components of Risk Management: frame, assess, respond and monitor)
  - Mar 2011, no revision. Verified, 30 Oct 2026, against sp800-39.txt (nvlpubs.nist.gov): risk management requires organizations to frame risk, assess risk, respond to risk and monitor risk on an ongoing basis with a feedback loop. Fits the risk lifecycle looping back after a new threat. Used in cc_d1_029.
- NIST SP 800-39 Section 3.3 (Responding to Risk: accept, avoid, mitigate, share or transfer)
  - Mar 2011, no revision. Verified, 30 Oct 2026, against sp800-39.txt (nvlpubs.nist.gov): the responses are acceptance, avoidance, mitigation, sharing and transfer; avoidance eliminates the activities or technologies that are the basis for the risk. Fits dropping an AI refund plan. Used in cc_d1_032.
- NIST AI 100-2 E2025 Section 2.3.2 (Targeted Poisoning)
  - Mar 2025. Verified, 30 Oct 2026, against ai100-2e2025.txt (nvlpubs.nist.gov): targeted poisoning changes a model's predictions on a small number of targeted samples; label flipping is effective when the adversary controls labels; mitigations include access controls on training data, data sanitization and validation, and dataset provenance. Section 2.3 says targeted poisoning induces integrity violations. Fits users mass-marking phishing as "not spam". Used in cc_d1_025.
- NIST AI 100-2 E2025 Section 3.3.2 (Information Extraction: leaking sensitive training data)
  - Verified, 30 Oct 2026, against ai100-2e2025.txt (nvlpubs.nist.gov): GenAI models are exposed to "personally identifying information (PII) in the training data"; training data extraction attacks have drawn "email addresses, phone numbers, and locations" from language models, a "behavior of verbatim memorization of sensitive information". Fits treating a model tuned on customer chats as sensitive. Used in cc_d4_045.

### Cybersecurity Framework (CSF) 2.0, NIST CSWP 29 (Feb 2024)
- NIST CSF 2.0 Section 1 (CSF Overview)
- NIST CSF 2.0 GV.OC-03 (legal, regulatory and contractual requirements, including privacy obligations, are understood and managed)
- NIST CSF 2.0 GV.PO-01 (cybersecurity policy is established, communicated and enforced)
- NIST CSF 2.0 ID.RA-01 (vulnerabilities in assets are identified, validated and recorded)
- NIST CSF 2.0 ID.RA-03 (internal and external threats to the organization are identified and recorded)
- NIST CSF 2.0 ID.RA-06 (risk responses are chosen, prioritized, planned, tracked and communicated)
- NIST CSF 2.0 ID.RA-07 (changes and exceptions are managed, assessed for risk impact, recorded and tracked)
  - All Verified, 28 Oct 2026. "CSF 2.0" and "CSWP 29" are the same document; cite it as `NIST CSF 2.0`. Compounds split and paraphrases added 29 Oct 2026.
- NIST CSF 2.0 GV.RR-01 (organizational leadership is responsible and accountable for cybersecurity risk and fosters a culture that is risk-aware, ethical and continually improving)
- NIST CSF 2.0 GV.RR-02 (roles, responsibilities and authorities related to cybersecurity risk management are established, communicated, understood and enforced)
- NIST CSF 2.0 GV.RM-02 (risk appetite and risk tolerance statements are established, communicated and maintained)
- NIST CSF 2.0 GV.OV-03 (organizational cybersecurity risk management performance is evaluated and reviewed for adjustments needed)
- NIST CSF 2.0 PR.AT-02 (individuals in specialized roles are provided with awareness and training to perform relevant tasks with cybersecurity risks in mind)
- NIST CSF 2.0 PR.DS-11 (backups of data are created, protected, maintained and tested)
  - D2 pilot. Verified 29 Oct 2026 against the CSWP 29 PDF. GV.RM-02 is also used by cc_d1_006 (the bare form was removed 29 Oct 2026).
- NIST CSF 2.0 DE.AE-02 (potentially adverse events are analyzed to better understand associated activities)
- NIST CSF 2.0 DE.AE-08 (incidents are declared when adverse events meet the defined incident criteria)
- NIST CSF 2.0 ID.IM-02 (improvements are identified from security tests and exercises, including those done in coordination with suppliers and relevant third parties)
- NIST CSF 2.0 PR.PS-01 (configuration management practices are established and applied)
- NIST CSF 2.0 PR.PS-03 (hardware is maintained, replaced, and removed commensurate with risk)
- NIST CSF 2.0 RS.AN-07 (incident data and metadata are collected, and their integrity and provenance are preserved)
- NIST CSF 2.0 RS.CO-03 (information is shared with designated internal and external stakeholders)
- NIST CSF 2.0 RS.MA-04 (incidents are escalated or elevated as needed)
- NIST CSF 2.0 RS.MI-01 (incidents are contained)
- NIST CSF 2.0 RS.MI-02 (incidents are eradicated)
  - D5 pilot. Verified 29 Oct 2026 against the CSWP 29 text.
- NIST CSF 2.0 PR.IR-03 (mechanisms are implemented to achieve resilience requirements in normal and adverse situations)
  - Verified, 30 Oct 2026, against csf2.txt (CSWP 29, nvlpubs.nist.gov): PR.IR-03 reads "Mechanisms are implemented to achieve resilience requirements in normal and adverse situations." Fits a failover server removing a single point of failure. Used in cc_d1_023.

### SP 800-121 Rev. 2, Guide to Bluetooth Security (May 2017, includes updates as of 19 Jan 2022)
- NIST SP 800-121 Rev. 2 Update 1 Section 4.4 (Bluetooth Security Checklist: undiscoverable except when pairing)
  - Verified, 30 Oct 2026, against sp800-121r2u1.txt (nvlpubs.nist.gov, doi 10.6028/NIST.SP.800-121r2-upd1): Table 4-2 checklist item 18, "Bluetooth devices should be configured by default as undiscoverable and remain undiscoverable except as needed for pairing"; Table 4-1 item 25, a device "should not be in discoverable or connectable mode all the time". Fits scanners left discoverable all day. Used in cc_d4_036. Current final on csrc.nist.gov (pubs/sp/800/121/r2/upd1/final, checked 30 Oct 2026); note the checklist also advises non-identifying device names, so renaming was kept out of the distractors.

### SP 800-153, Guidelines for Securing Wireless Local Area Networks (WLANs) (Feb 2012)
- NIST SP 800-153 Section 3.1.1 (Attack Monitoring: interference from other devices can deny WLAN service)
  - Verified, 30 Oct 2026, against sp800-153.txt (nvlpubs.nist.gov): among active attacks, "Denial of service (DoS). A DoS can occur inadvertently, such as other electronic devices causing interference". SP 800-94 Section 5 likewise names microwaves as benign interference sources. Fits scanners dropping off Wi-Fi when a microwave oven runs, a physical-layer problem. Used in cc_d4_032. Current final on csrc.nist.gov (pubs/sp/800/153/final, checked 30 Oct 2026).

### SP 800-190, Application Container Security Guide (Sep 2017)
- NIST SP 800-190 Section 3.5.2 (Shared kernel: container isolation is not as strong as a hypervisor's)
  - Verified, 30 Oct 2026, against sp800-190.txt (nvlpubs.nist.gov): "the use of a shared kernel invariably results in a larger inter-object attack surface than seen with hypervisors ... the level of isolation provided by container runtimes is not as high as that provided by hypervisors" (Section 2.2 adds that containers "do not offer as clear and concrete of a security boundary as a VM"). Fits separate virtual machines over separate containers for a public portal and payroll. Used in cc_d4_029. Current final on csrc.nist.gov (pubs/sp/800/190/final, checked 30 Oct 2026).

## ISO/IEC

### ISO/IEC 27001:2022 (with Amd 1:2024)
- ISO/IEC 27001:2022 (Information security management systems: Requirements)
- ISO/IEC 27001:2022 Clause 6.1.3 f) (risk owners approve the risk treatment plan and accept residual risk)
  - Verified, 28 Oct 2026. Clause 6.1.3 f) is unchanged from the 2013 edition.

### ISO/IEC 27002:2022
- ISO/IEC 27002:2022 Control 5.3 (Segregation of duties)
- ISO/IEC 27002:2022 Control 5.15 (Access control)
- ISO/IEC 27002:2022 Control 5.16 (Identity management)
- ISO/IEC 27002:2022 Control 5.17 (Authentication information)
- ISO/IEC 27002:2022 Control 5.18 (Access rights)
- ISO/IEC 27002:2022 Control 8.2 (Privileged access rights)
- ISO/IEC 27002:2022 Control 5.1 (Policies for information security)
- ISO/IEC 27002:2022 Control 5.10 (Acceptable use of information and other associated assets)
- ISO/IEC 27002:2022 Control 5.34 (Privacy and protection of PII)
- ISO/IEC 27002:2022 Control 8.8 (Management of technical vulnerabilities)
  - Verified (title), 28 Oct 2026. iso.org could not be reached; the titles were confirmed from the published 2022 control list. 5.10 is used in cc_d1_019 and cc_d2_004.
- ISO/IEC 27002:2022 Control 5.31 (Legal, statutory, regulatory and contractual requirements)
  - Verified (title), 29 Oct 2026, on the same basis as the entries above (upgraded from Likely by audit pilot 2). Used in cc_d2_001 and 005.
- ISO/IEC 27002:2022 Control 5.12 (Classification of information)
- ISO/IEC 27002:2022 Control 5.25 (Assessment and decision on information security events)
- ISO/IEC 27002:2022 Control 5.26 (Response to information security incidents)
- ISO/IEC 27002:2022 Control 5.28 (Collection of evidence)
- ISO/IEC 27002:2022 Control 6.8 (Information security event reporting)
- ISO/IEC 27002:2022 Control 7.14 (Secure disposal or re-use of equipment)
- ISO/IEC 27002:2022 Control 8.12 (Data leakage prevention)
- ISO/IEC 27002:2022 Control 8.24 (Use of cryptography)
- ISO/IEC 27002:2022 Control 8.32 (Change management)
  - D5 pilot. Verified (title), 29 Oct 2026: titles from the published 2022 control list, the same basis as the D1/D3 entries; iso.org was not opened. 8.32 is also used by cc_d1_013.

## Center for Internet Security (CIS)

### CIS Critical Security Controls v8.1 (Jun 2024)
- CIS Controls v8.1 (Implementation Groups)
- CIS Controls v8.1 Safeguard 6.1 (Establish an Access Granting Process)
- CIS Controls v8.1 Safeguard 6.2 (Establish an Access Revoking Process)
- CIS Controls v8.1 Safeguard 6.5 (Require MFA for Administrative Access)
- CIS Controls v8.1 Safeguard 6.7 (Centralize Access Control)
- CIS Controls v8.1 Safeguard 6.8 (Define and Maintain Role-Based Access Control)
  - Verified, 28 Oct 2026. The titles are unchanged from v8. v8.1 uses "Implementation Groups" and "essential cyber hygiene", not "basic set".
- CIS Controls v8.1 Safeguard 5.4 (Restrict Administrator Privileges to Dedicated Administrator Accounts)
  - Verified (title), 30 Oct 2026, against the v8.1 safeguard list published by MITRE SAF (github.com/mitre/cis-cci-mappings, mappings/cis-cci-mapping-v8.1.json); cisecurity.org was blocked by the session proxy. The title itself fits cc_d3_014 (separate accounts for admin work). Used in cc_d3_014.
  - Safeguard 3.7 (title verified on the same list) was dropped from cc_d5_004 on 30 Oct 2026: it sets up a classification scheme but does not say who classifies. NIST SP 800-12 Rev. 1 Section 3.4 replaces it.

## OWASP

- OWASP Top 10 for LLM Applications 2025 LLM06 (Excessive Agency)
  - Verified, 28 Oct 2026.
- OWASP Non-Human Identities Top 10 (2025) NHI2 (Secret Leakage)
  - Verified, 30 Oct 2026, against the project's own page source (github.com/OWASP/www-project-non-human-identities-top-10, index.md): "NHI2:2025 - Secret Leakage", which names secrets "sent over public chat applications". Fits cc_d3_010. owasp.github.io was blocked by the session proxy.

## FIRST

- FIRST Common Vulnerability Scoring System (CVSS) v4.0 Specification Document Section 1 (Introduction)
  - Verified 29 Oct 2026 at first.org/cvss/v4.0/specification-document: the Base Score reflects a flaw's intrinsic severity; Threat metrics adjust for factors such as active exploitation; consumers enrich scores as input to their own risk assessment. Used in cc_d5_016.

## MITRE

- MITRE ATT&CK knowledge base (Enterprise matrix: tactics and techniques)
  - Verified, 30 Oct 2026, against MITRE's STIX data for Enterprise ATT&CK v20.0 (github.com/mitre-attack/attack-stix-data); attack.mitre.org was blocked by the session proxy. Each tactic is written as the adversary's goal ("The adversary is trying to get into your network" for Initial Access, TA0001), and Phishing (T1566) is a technique under it, which fits cc_d5_008. Used in cc_d5_008.

## Code of Ethics

- ISC2 Code of Ethics, Preamble and Canons
- ISC2 Code of Ethics, Canons
- ISC2 Code of Ethics, Canons (service to principals)
  - Verified at isc2.org/ethics, 28 Oct 2026. These go in `framework_ref` only, never in stems, options, explanations or tips. Open question: if the app shows `framework_ref` to learners, add the ® at first mention.
- ISC2 Ethical Complaint Procedures (standing of complainant and form of complaints)
  - Verified, 30 Oct 2026, against isc2-ethics.txt (isc2.org/ethics, opened 30 Oct 2026; the procedures sit on the same page as the Code). Complaints are accepted only from those injured; anyone may complain under canons I or II, only principals under canon III, and only certified or licensed professionals who follow an ethics code under canon IV. Complaints must be written sworn affidavits naming the canon breached; the committee is not an investigative body and closes complaints with no prima facie case. Fits a client's complaint about incompetent work. Used in cc_d1_044. Same display note as the Code bullets: framework_ref only.
