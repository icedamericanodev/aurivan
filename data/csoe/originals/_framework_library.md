# CSOE Framework Citation Library

**Purpose:** the canonical `framework_ref` strings for the CSOE question bank
(`data/csoe/originals/d{N}.json`). Started 31 Oct 2026. The pilot's citations
(csoe_d1–d5_001–020) were merged from the five domain experts' staged files
on 31 Oct 2026, one bullet per citation; every one was opened at its primary
source that day. Where two domains wrote the same citation with different
titles, the official section heading was kept (18 U.S.C. 1519; Rule
13a-14(a)).

**Format** (same as the CC and CRISC libraries):
- Each canonical citation is a bullet at the start of a line (`- `). Split a
  `framework_ref` on `;` and match each part exactly
  (`data/csoe/tools/check_csoe.py` does this).
- Indented sub-bullets record the status and are ignored by the parser.
- Add a new citation here in the same change that first uses it.

**Status key:**
- **Verified (opened, DATE):** the section, rule or paragraph was read at the
  primary source on that date. Say what was checked and give the URL.
- There is no "Likely" status for CSOE: thresholds, penalties and deadlines
  change, so an unopened source is not a citation.

**One form everywhere.** `<source> <locator> (<title or short paraphrase>)`,
with no comma before the parenthesis and one citation per `;` part. Forms:
- `Sarbanes-Oxley Act of 2002 Section 404(b) (Internal control evaluation and reporting)`
- `17 CFR 240.13a-15(f) (Definition of internal control over financial reporting)`
- `17 CFR 229.308(a) (Management's annual report on internal control over financial reporting)`
- `SEC Release No. 33-8810 Section II.B.1 (Evaluation of control deficiencies)`
- `PCAOB AS 2201.A7 (Definition of material weakness)`
- `Dodd-Frank Act Section 989G(a) (Exemption for smaller issuers)`
- `COSO Internal Control—Integrated Framework (2013) Principle 10 (Selects and develops control activities)`

(The examples above are in backticks, so the checker never matches them.
Each becomes a citation only when its source is opened and it is listed,
without backticks, under a source heading with a Verified status line.)

## Sources to open first

These are the sources the pilot will need. None is a citation yet.

| Source | Where | What to check |
|---|---|---|
| Sarbanes-Oxley Act of 2002, Pub. L. 107-204 | govinfo.gov (PLAW-107publ204), congress.gov | Section text for 101–109, 201–209, 301–308, 401–409, 802, 806, 807, 906, 1102, 1107 |
| 18 U.S.C. 1350 | govinfo.gov, law.cornell.edu | 906 certification and both penalty tiers |
| 17 CFR 240.12b-2 | ecfr.gov | Accelerated and large accelerated filer, smaller reporting company and emerging growth company definitions, current thresholds |
| 17 CFR 240.13a-14 and 13a-15 (and 15d-14, 15d-15) | ecfr.gov | Certifications; disclosure controls and ICFR evaluation; ICFR definition |
| 17 CFR 229.308 (Reg S-K Item 308) | ecfr.gov | Management's report, auditor's attestation report, quarterly changes |
| 17 CFR 240.10A-3 | ecfr.gov | Audit committee independence and duties; FPI accommodations |
| 17 CFR 240.3b-4 | ecfr.gov | Foreign private issuer definition |
| SEC Release No. 33-8238 (June 2003) | sec.gov | Management's report on ICFR and certification rules |
| SEC Release No. 33-8810 (June 2007) | sec.gov | Interpretive guidance for management's evaluation of ICFR |
| SEC Release No. 34-88365 (March 2020) | sec.gov | Accelerated filer definition amendments |
| Dodd-Frank Act, Pub. L. 111-203 | govinfo.gov | Sections 989G, 954, 922 and the PCAOB broker-dealer provisions |
| JOBS Act, Pub. L. 112-106 | govinfo.gov | Section 103 (EGCs and 404(b)); current EGC revenue cap on sec.gov |
| PCAOB AS 2201, AS 1305 | pcaobus.org | Integrated audit of ICFR; deficiency definitions; communications; current amendments |
| COSO Internal Control—Integrated Framework (2013), executive summary | coso.org | Five components and 17 principle names only |

The release numbers above come from memory and must be confirmed when
sec.gov opens; do not cite them until then.


## Sarbanes-Oxley Act of 2002
- Sarbanes-Oxley Act of 2002 Long title (Purpose of the Act)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked the long title ("To protect investors by improving the accuracy and reliability of corporate disclosures made pursuant to the securities laws") and the enactment date, July 30, 2002.
- Sarbanes-Oxley Act of 2002 Section 2(a)(7) (Definition of issuer)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked the three routes: securities registered under Exchange Act Section 12, a Section 15(d) reporting duty, or a filed Securities Act registration statement not yet effective and not withdrawn.
- Sarbanes-Oxley Act of 2002 Section 3(b) (Commission rules and enforcement)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked 3(b)(1): a violation of the Act, SEC rules under it or PCAOB rules is treated as a violation of the Securities Exchange Act of 1934, with the same penalties.
- Sarbanes-Oxley Act of 2002 Section 405 (Exemption)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked that Sections 401, 402 and 404 and the SEC rules under them do not apply to investment companies registered under Section 8 of the Investment Company Act of 1940.
- Sarbanes-Oxley Act of 2002 Section 101(b) (Status of the Board)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked Section 101(a)-(b): a nonprofit corporation, not an agency or establishment of the U.S. government; members and staff not federal officers or employees
- Sarbanes-Oxley Act of 2002 Section 101(e) (Board membership)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked five members; two and only two are or have been CPAs (CPA chair out of practice 5 years); full-time, no other professional or business activity; no profit share or payments from a public accounting firm except fixed continuing payments under standard retirement arrangements (101(e)(3)); SEC appoints after consulting the Fed chair and Treasury Secretary; 5-year terms, 2-term limit; unchanged in 15 U.S.C. 7211(e) except Dodd-Frank's broker-dealer wording. Caveat: the for-cause removal limit in 101(e)(6) (and 107(d)(3)) was held unconstitutional and severed in Free Enterprise Fund v. PCAOB, 561 U.S. 477 (2010), so the SEC may remove Board members at will; items do not key on removal
- Sarbanes-Oxley Act of 2002 Section 102(a) (Mandatory registration)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked unlawful for an unregistered firm to prepare, issue or participate in an issuer's audit report; current text (https://www.law.cornell.edu/uscode/text/15/7212) drops the 180-day start-up phrase and adds brokers and dealers
- Sarbanes-Oxley Act of 2002 Section 102(c) (Action on applications)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked the Board acts on a completed application within 45 days; a disapproval is treated as a disciplinary sanction
- Sarbanes-Oxley Act of 2002 Section 102(f) (Registration and annual fees)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked registration and annual fees from each registered firm, sufficient to recover processing and review costs
- Sarbanes-Oxley Act of 2002 Section 103(a)(2)(A) (Required content of auditing standards)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (i) work papers kept not less than 7 years; (ii) concurring or second-partner review and approval by a qualified person other than the person in charge, or an independent reviewer; (iii) description of internal control testing; same in https://www.law.cornell.edu/uscode/text/15/7213
- Sarbanes-Oxley Act of 2002 Section 104(b) (Inspection frequency)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked annually for firms that regularly audit more than 100 issuers, at least every 3 years for 100 or fewer; special inspections at SEC request or on the Board's motion; unchanged in https://www.law.cornell.edu/uscode/text/15/7214
- Sarbanes-Oxley Act of 2002 Section 105(c) (Disciplinary procedures)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (c)(4) list of sanctions and (c)(5): revocation or suspension, bars, activity limits and the higher penalty tier only for intentional or knowing conduct (including reckless) or repeated negligence; (c)(4)-(5) unchanged in https://www.law.cornell.edu/uscode/text/15/7215
- Sarbanes-Oxley Act of 2002 Section 105(e) (Stay of sanctions)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked an application to the SEC for review operates as a stay unless and until the SEC orders otherwise
- Sarbanes-Oxley Act of 2002 Section 106(a) (Applicability to certain foreign firms)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked foreign firms that prepare or furnish audit reports for issuers are subject to the Act and Board and SEC rules in the same manner as U.S. firms; current text adds brokers and dealers
- Sarbanes-Oxley Act of 2002 Section 107(b) (Rules of the Board)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (b)(2) no Board rule effective without prior SEC approval; (b)(3) approval criteria; (b)(4) Exchange Act Section 19(b) procedures; (b)(5) SEC may abrogate, delete or add to Board rules
- Sarbanes-Oxley Act of 2002 Section 107(c) (Commission review of disciplinary action taken by the Board)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked the Board files notice of final sanctions; the SEC reviews them and may enhance, modify, cancel, reduce or require remission
- Sarbanes-Oxley Act of 2002 Section 108 (Accounting standards)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked SEC may recognize as generally accepted the principles of a private standard setter meeting the criteria (adds Securities Act Section 19(b)); 108(c) keeps the SEC's own authority
- Sarbanes-Oxley Act of 2002 Section 109(c) (Sources and uses of funds)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked the budget is recovered from annual accounting support fees, which are not public monies of the United States; penalties fund merit scholarships
- Sarbanes-Oxley Act of 2002 Section 109(g) (Allocation of accounting support fees among issuers)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked each issuer's share is its average monthly equity market capitalization for the prior 12 months over the total for all issuers; unchanged in https://www.law.cornell.edu/uscode/text/15/7219 (Dodd-Frank added 7219(h) for brokers and dealers)
- Sarbanes-Oxley Act of 2002 Section 201 (Services outside the scope of practice of auditors)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked new Exchange Act Section 10A(g) list of nine prohibited non-audit services; 10A(h) other non-audit services, including tax services, need audit committee preapproval; 201(b) Board case-by-case exemptions; current text https://www.law.cornell.edu/uscode/text/15/78j-1
- Sarbanes-Oxley Act of 2002 Section 202 (Preapproval requirements)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked 10A(i): audit committee preapproves all audit and non-audit services; de minimis (5% of revenues paid to the auditor in the fiscal year, not recognized at engagement, approved before audit completion); delegation to independent director members, presented at each meeting; disclosure in periodic reports
- Sarbanes-Oxley Act of 2002 Section 203 (Audit partner rotation)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked 10A(j): unlawful if the lead (or coordinating) partner or the reviewing partner performed audit services for the issuer in each of the 5 previous fiscal years
- Sarbanes-Oxley Act of 2002 Section 204 (Auditor reports to audit committees)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked 10A(k): critical accounting policies; alternative GAAP treatments discussed with management, their ramifications and the firm's preferred treatment; other material written communications
- Sarbanes-Oxley Act of 2002 Section 206 (Conflicts of interest)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked 10A(l): CEO, controller, CFO, chief accounting officer or equivalent employed by the firm who participated in any capacity in the audit during the 1-year period before the audit began
- Sarbanes-Oxley Act of 2002 Section 207 (Study of mandatory rotation of registered public accounting firms)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked the Comptroller General studies the potential effects of mandatory firm rotation and reports within 1 year; definition of mandatory rotation
- Sarbanes-Oxley Act of 2002 Section 301 (Public company audit committees)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked new Exchange Act Section 10A(m)(1)-(6): listing prohibition, audit committee directly responsible for appointment, compensation and oversight of the audit firm including resolving management-auditor disagreements, the firm reports directly to the committee, independence (no consulting, advisory or other compensatory fee; not an affiliated person), complaint procedures including confidential, anonymous employee submissions, advisers and funding
- Sarbanes-Oxley Act of 2002 Section 302(a) (Corporate responsibility for financial reports)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm and https://www.law.cornell.edu/uscode/text/15/7241; checked the principal executive and financial officers certify each annual or quarterly report; items (1)-(6), including (5)(A) significant deficiencies and material weaknesses and (5)(B) any fraud, whether or not material, involving management or employees with a significant role in internal controls, disclosed to the auditors and audit committee; (4)(C) evaluation within 90 days before the report (the statute's text; SEC Rule 13a-15(b) now sets the officers' evaluation of disclosure controls as of the end of each fiscal quarter, checked at https://www.law.cornell.edu/cfr/text/17/240.13a-15)
- Sarbanes-Oxley Act of 2002 Section 303 (Improper influence on conduct of audits)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (a) unlawful for any officer or director, or any other person acting under their direction, to fraudulently influence, coerce, manipulate or mislead the auditor to render the financial statements materially misleading; (b) SEC exclusive civil enforcement authority; (c) no preemption
- Sarbanes-Oxley Act of 2002 Section 304 (Forfeiture of certain bonuses and profits)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7243; checked restatement due to material noncompliance as a result of misconduct; CEO and CFO reimburse bonuses and incentive-based or equity-based pay received, and stock-sale profits realized, in the 12 months after first public issuance or filing; (b) SEC exemption authority
- Sarbanes-Oxley Act of 2002 Section 306(a) (Insider trades during pension fund blackout periods)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (a)(1) directors and executive officers may not trade equity acquired in connection with their service during a blackout; (a)(2) profit recoverable by the issuer irrespective of intention, shareholder suit if the issuer does not act within 60 days of a request, 2-year limit; (a)(4) blackout means more than 3 consecutive business days with at least 50 percent of participants suspended, with exclusions; (a)(6) notice to directors, executive officers and the SEC
- Sarbanes-Oxley Act of 2002 Section 307 (Rules of professional responsibility for attorneys)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked SEC rules for attorneys appearing and practicing before the SEC for issuers: report evidence of a material violation to the chief legal counsel or CEO, then to the audit committee, another independent committee or the board if there is no appropriate response
- Sarbanes-Oxley Act of 2002 Section 308(a) (Civil penalties to be used for the relief of victims)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7246 (current text) and https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm (as enacted); checked 308(a) as amended by Dodd-Frank Section 929B: any civil penalty the SEC obtains in a judicial or administrative action, or by settlement, may on the SEC's motion or direction be added to a disgorgement fund or other fund for the victims, with no disgorgement order required; 308(b) gifts for a disgorgement fund or other fund; (d) conforming amendments to the Treasury provisions
- Sarbanes-Oxley Act of 2002 Section 402(a) (Prohibition on personal loans to executives)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked new Exchange Act Section 13(k): unlawful to extend, maintain, arrange or renew credit as a personal loan to a director or executive officer, directly or through a subsidiary; loans existing at enactment kept only without material modification or renewal; consumer credit, open-end credit and charge card exception in the ordinary course, generally available to the public, on market terms; insured depository institution carve-out
- Sarbanes-Oxley Act of 2002 Section 403(a) (Disclosures of transactions involving management and principal stockholders)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked new Exchange Act Section 16(a): filers are directors, officers and more-than-10-percent owners; initial statement within 10 days; change in ownership before the end of the second business day after the transaction unless the SEC sets another time; electronic filing and next-business-day posting by the SEC and on the issuer's website
- Sarbanes-Oxley Act of 2002 Section 404(a) (Management assessment of internal controls)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7262; checked each annual report under Section 13(a) or 15(d) contains an internal control report stating management's responsibility and assessing effectiveness as of the end of the most recent fiscal year
- Sarbanes-Oxley Act of 2002 Section 404(c) (Exemption for smaller issuers)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7262; checked 404(c), added by Dodd-Frank Section 989G(a): 404(b) does not apply to an issuer that is neither a large accelerated filer nor an accelerated filer under Rule 12b-2; also 404(b) as amended by JOBS Act Section 103 (emerging growth companies excluded)
- Sarbanes-Oxley Act of 2002 Section 406 (Code of ethics for senior financial officers)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (a) disclose whether, and if not why not, the issuer has adopted a code of ethics for senior financial officers; (b) immediate disclosure of any change in or waiver of the code on Form 8-K or by Internet or other electronic means; (c) definition
- Sarbanes-Oxley Act of 2002 Section 407 (Disclosure of audit committee financial expert)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (a) disclose whether, and if not the reasons, the audit committee has at least 1 member who is a financial expert as the SEC defines it; (b) considerations
- Sarbanes-Oxley Act of 2002 Section 408 (Enhanced review of periodic disclosures by issuers)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (a) regular and systematic SEC review including financial statements; (b) scheduling factors; (c) no issuer reviewed less frequently than once every 3 years
- Sarbanes-Oxley Act of 2002 Section 803 (Debts nondischargeable if incurred in violation of securities fraud laws)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked the amendment adding 11 U.S.C. 523(a)(19), including debts from any settlement agreement entered into by the debtor
- Sarbanes-Oxley Act of 2002 Section 902 (Attempts and conspiracies to commit criminal fraud offenses)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked new 18 U.S.C. 1349: attempt or conspiracy carries the same penalties as the object offense
- Sarbanes-Oxley Act of 2002 Section 903 (Criminal penalties for mail and wire fraud)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked "striking five and inserting 20" in 18 U.S.C. 1341 and 1343
- Sarbanes-Oxley Act of 2002 Section 1(b) (Table of contents)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked the eleven titles and their sections: Title III Corporate Responsibility (301-308), Title IV Enhanced Financial Disclosures (401-409, including 404 Management assessment of internal controls), Title I Public Company Accounting Oversight Board, Title IX White-Collar Crime Penalty Enhancements.
- Sarbanes-Oxley Act of 2002 Section 101(a) (Establishment of Board)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked "There is established the Public Company Accounting Oversight Board, to oversee the audit of public companies that are subject to the securities laws", a body corporate operating as a nonprofit corporation.
- Sarbanes-Oxley Act of 2002 Section 704 (Study of enforcement actions)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked the SEC study of enforcement actions on reporting violations and restatements over the 5 years before enactment (revenue recognition, off-balance-sheet special purpose entities), report within 180 days; it names no company.
- Sarbanes-Oxley Act of 2002 Section 705 (Study of investment banks)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked the Comptroller General (GAO) study of whether investment banks and financial advisers helped public companies manipulate earnings and obscure their financial condition, naming the collapse of Enron and the failure of Global Crossing; the only place the Act names Enron (full-text search).
- Sarbanes-Oxley Act of 2002 Section 104(g) (Report)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (g)(1) the report goes to the SEC and state regulators with the firm's response; (g)(2) public in appropriate detail, except that quality control criticisms or defects stay non-public if the firm addresses them to the Board's satisfaction within 12 months of the report date; unchanged in https://www.law.cornell.edu/uscode/text/15/7214
- Sarbanes-Oxley Act of 2002 Section 104(h) (Interim Commission review)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (h)(1) a firm that responded to a draft report under (f) and disagrees with the final report, or disputes a 12-month remediation finding, may seek SEC review; (h)(2) the SEC's decision is not reviewable under Exchange Act Section 25 or final agency action; (h)(3) review sought within the 30-day period after the event; also read (f): the firm's redacted response is attached to the report; unchanged in https://www.law.cornell.edu/uscode/text/15/7214
- Sarbanes-Oxley Act of 2002 Section 105(b)(3) (Noncooperation with investigations)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked a firm or associated person that refuses to testify, produce documents or otherwise cooperate may be suspended or barred from association, the firm's registration suspended or revoked, or lesser sanctions imposed, subject to Section 107(c); also read (b)(2)(D) SEC subpoenas and (b)(4)(B)(iv) referral to the Attorney General at the SEC's direction; unchanged in https://www.law.cornell.edu/uscode/text/15/7215
- Sarbanes-Oxley Act of 2002 Section 205(a) (Definitions)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked Section 205(a) adds Exchange Act Section 3(a)(58): the audit committee is a board committee (or equivalent body) overseeing accounting, financial reporting and audits, and if no such committee exists, the entire board; and 3(a)(59) registered public accounting firm
- Sarbanes-Oxley Act of 2002 Section 208(b) (Auditor independence)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked unlawful for a registered firm (or associated person) to prepare or issue any audit report for an issuer if it engages in any activity with respect to that issuer prohibited by Exchange Act Section 10A(g) to (l) or SEC or Board rules under them; same text at https://www.law.cornell.edu/uscode/text/15/7233
- Sarbanes-Oxley Act of 2002 Section 209 (Considerations by appropriate State regulatory authorities)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked state regulators supervising nonregistered firms should make an independent determination of the proper standards, considering the size and nature of the firms' and their clients' business; Board standards should not be presumed to apply to small and medium-sized nonregistered firms; same text at https://www.law.cornell.edu/uscode/text/15/7234
- Sarbanes-Oxley Act of 2002 Section 305(a) (Unfitness standard)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked that 305(a)(1) and (a)(2) strike "substantial unfitness" and insert "unfitness" in Exchange Act Section 21(d)(2) and Securities Act Section 20(e); 305(b) adds Exchange Act 21(d)(5), any equitable relief for the benefit of investors
- Sarbanes-Oxley Act of 2002 Section 401(a) (Disclosures required)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked new Exchange Act Section 13(i) (financial reports reflect all material correcting adjustments identified by a registered public accounting firm) and 13(j) (SEC rules requiring each annual and quarterly financial report to disclose all material off-balance-sheet transactions, arrangements and obligations, including contingent obligations, with unconsolidated entities)
- Sarbanes-Oxley Act of 2002 Section 401(b) (Commission rules on pro forma figures)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked SEC rules so that pro forma financial information in any filed report, public disclosure or press or other release is not misleading and is reconciled with GAAP financial condition and results
- Sarbanes-Oxley Act of 2002 Section 409 (Real time issuer disclosures)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm and https://www.law.cornell.edu/uscode/text/15/78m; checked new Exchange Act Section 13(l): each issuer reporting under 13(a) or 15(d) discloses material changes in financial condition or operations on a rapid and current basis, in plain English, as the SEC determines by rule
- Sarbanes-Oxley Act of 2002 Section 805 (Review of Federal Sentencing Guidelines for obstruction of justice and extensive criminal fraud)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (a) the United States Sentencing Commission shall review and amend, as appropriate, the guidelines for obstruction of justice and extensive fraud, including offenses under 18 U.S.C. 1519 and 1520; (b) 180-day deadline
- Sarbanes-Oxley Act of 2002 Section 904 (Criminal penalties for violations of the Employee Retirement Income Security Act of 1974)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked the amendments to ERISA Section 501 (29 U.S.C. 1131): $5,000 to $100,000, one year to 10 years, and $100,000 to $500,000
- Sarbanes-Oxley Act of 2002 Section 905 (Amendment to sentencing guidelines relating to certain white-collar offenses)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-107publ204/html/PLAW-107publ204.htm; checked (a) directive to the United States Sentencing Commission to review and, as appropriate, amend the guidelines to implement the Act; (b) the guidelines to reflect the Act's increased penalties

## Dodd-Frank Act
- Dodd-Frank Act Section 989G(a) (Exemption for smaller issuers)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm; checked that 989G(a) added Section 404(c): 404(b) does not apply to an issuer that is neither a large accelerated filer nor an accelerated filer under Rule 12b-2.
- Dodd-Frank Act Section 929A (Protection for employees of subsidiaries and affiliates)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm; checked that 929A inserted "including any subsidiary or affiliate whose financial information is included in the consolidated financial statements of such company" into 18 U.S.C. 1514A.
- Dodd-Frank Act Section 929B (Fair Fund amendments)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm and https://www.law.cornell.edu/uscode/text/15/7246; checked Section 929B rewrites Sarbanes-Oxley Section 308(a) so any civil penalty obtained by order or settlement can be added to a disgorgement fund or other fund for victims, amends 308(b) to match and strikes 308(e)
- Dodd-Frank Act Section 112(a) (Purposes and duties of the Financial Stability Oversight Council)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm; checked purposes (identify risks to U.S. financial stability, promote market discipline, respond to emerging threats) and duties; Section 111(b) membership with the Secretary of the Treasury as Chairperson and the Federal Insurance Office Director as a nonvoting member
- Dodd-Frank Act Section 502 (Federal Insurance Office)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm; checked new 31 U.S.C. 313: the Office within the Department of the Treasury, its monitoring and advisory functions, the Director's advisory seat on the Council, and 313(k) (no general supervisory or regulatory authority over the business of insurance)
- Dodd-Frank Act Section 204(a) (Purpose of orderly liquidation authority)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm; checked liquidation of failing financial companies posing significant risk to financial stability, creditors and shareholders bear losses, responsible management not retained; 204(b) the FDIC as receiver
- Dodd-Frank Act Section 214 (Prohibition on taxpayer funding)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm; checked (a) all companies in receivership liquidated and no taxpayer funds used to prevent liquidation, (b) recovery from assets or financial sector assessments, (c) no losses to taxpayers
- Dodd-Frank Act Section 922(c) (Amendments to the Sarbanes-Oxley whistleblower provision)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm; checked 1514A(b)(2)(D) changed from 90 to 180 days plus awareness, new (b)(2)(E) jury trial, new (e) no waiver and no predispute arbitration
- Dodd-Frank Act Section 954 (Recovery of erroneously awarded compensation)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm; checked new Exchange Act Section 10D: SEC rules directing exchanges to bar listing of issuers without a recovery policy covering current or former executive officers and the 3-year period before a required restatement
- Dodd-Frank Act Section 982 (Oversight of brokers and dealers)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm; checked "issuers, brokers, and dealers" in SOX Sections 101, 102, 103 and 106, the inspection program by rule with prior SEC approval in 104(a)(2), the registration exemption in 104(a)(2)(D), and fees allocated by net capital in 109(h)
- Dodd-Frank Act Section 989G(b) (Study for issuers between $75 million and $250 million)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm; checked the SEC study of reducing the 404(b) burden for issuers with market capitalization between $75,000,000 and $250,000,000, report to Congress within 9 months
- Dodd-Frank Act Section 111(b) (Membership of the Financial Stability Oversight Council)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm and https://www.law.cornell.edu/uscode/text/12/5321; checked (b)(1) voting members, with (A) the Secretary of the Treasury serving as Chairperson, among ten voting members, including the Federal Reserve Chairman, the Comptroller of the Currency, the SEC Chairman, the FDIC and CFTC Chairpersons and an independent insurance member; (b)(2) nonvoting members including the Director of the Federal Insurance Office
- Dodd-Frank Act Section 619 (Prohibitions on proprietary trading and certain relationships with hedge funds and private equity funds)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm and https://www.law.cornell.edu/uscode/text/12/1851; checked new Bank Holding Company Act Section 13 (12 U.S.C. 1851): (a)(1) a banking entity shall not engage in proprietary trading or acquire or retain an ownership interest in or sponsor a hedge fund or private equity fund, unless otherwise provided
- Dodd-Frank Act Section 981 (Authority to share certain information with foreign authorities)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/PLAW-111publ203/html/PLAW-111publ203.htm; checked (a) the definition of foreign auditor oversight authority added as SOX Section 2(a)(17); (b) new SOX Section 105(b)(5)(C): sharing at the Board's discretion if necessary for the Act's purposes or to protect investors, with the foreign body's confidentiality assurances and descriptions of its systems and laws, and a Board determination that sharing is appropriate

## U.S. Code
- 15 U.S.C. 78d(a) (Establishment of the Securities and Exchange Commission)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78d; checked that Exchange Act Section 4 established the Commission (five commissioners; first terms dated from June 6, 1934).
- 15 U.S.C. 78l(g) (Registration of securities by issuer)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78l; checked the 12(g)(1)(A) trigger: total assets over $10,000,000 and a class of equity held of record by 2,000 persons or 500 non-accredited investors; also read 12(a) and 12(b) on exchange registration.
- 15 U.S.C. 78o(d) (Supplementary and periodic information)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78o; checked 15(d)(1): an issuer whose Securities Act registration statement became effective files Section 13 periodic reports; the duty is suspended while a class is registered under Section 12 and for a year beginning with fewer than 300 holders of record.
- 15 U.S.C. 7241(a) (Corporate responsibility for financial reports)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7241; checked that the Section 302 certifications are required in each annual or quarterly report filed or submitted under Exchange Act Section 13(a) or 15(d), signed by the principal executive and financial officers.
- 15 U.S.C. 7262(a) (Management's internal control report)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7262; checked 404(a): each annual report under Section 13(a) or 15(d) contains management's internal control report and its assessment as of fiscal year-end.
- 15 U.S.C. 7262(b) (Internal control evaluation and reporting)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7262; checked the current text, including the JOBS Act Section 103 amendment excluding emerging growth companies from the auditor's attestation; the firm that prepares or issues the audit report attests to and reports on management's assessment under the Board's attestation standards, and the attestation shall not be the subject of a separate engagement.
- 18 U.S.C. 1350 (Failure of corporate officers to certify financial reports)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1350; checked 1350(a): the written statement by the chief executive officer and chief financial officer accompanying each periodic report containing financial statements filed under Section 13(a) or 15(d).
- 18 U.S.C. 1514A(a) (Whistleblower protection for employees of publicly traded companies)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1514A; checked the covered companies (including subsidiaries and affiliates whose financial information is consolidated), the protected channels (federal agency, Congress, a person with supervisory authority) and the 180-day complaint period in (b)(2)(D).
- 18 U.S.C. 1520 (Destruction of corporate audit records)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1520; checked (a)(1): any accountant who audits an issuer to which Exchange Act Section 10A(a) applies keeps audit or review workpapers for 5 years from the end of the fiscal period audited; (b) knowing and willful violations, up to 10 years.
- 18 U.S.C. 1519 (Destruction, alteration, or falsification of records in Federal investigations and bankruptcy)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1519; checked that it applies to whoever knowingly alters, destroys or falsifies records with intent to impede a federal investigation or matter, up to 20 years.
- 15 U.S.C. 7216(b) (Production of documents by foreign public accounting firms)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7216; checked (b)(1) foreign firm produces work papers on SEC or Board request; (b)(2) a registered firm relying on a foreign firm produces those papers and secures its agreement as a condition of reliance (Dodd-Frank Section 929J)
- 18 U.S.C. 1350(a) (Certification of periodic financial reports)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1350; checked each periodic report containing financial statements filed under Section 13(a) or 15(d) is accompanied by a written statement of the CEO and CFO; (b) content: full compliance and fair presentation
- 18 U.S.C. 1350(c) (Criminal penalties)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1350; checked (c)(1) knowing certification: fine up to $1,000,000, prison up to 10 years, or both; (c)(2) willful certification: fine up to $5,000,000, prison up to 20 years, or both
- 5 U.S.C. 553 (Rule making)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/5/553; checked (b) notice of proposed rulemaking in the Federal Register and its exceptions (interpretive rules, policy statements, procedural rules, stated good cause), (c) comment and statement of basis and purpose, (d) 30 days before the effective date, (e) right to petition
- 11 U.S.C. 523(a)(19) (Securities fraud debts excepted from discharge)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/11/523; checked paragraph (a)(19): securities law violation or securities fraud debts from a judgment, order, settlement agreement or administrative order are not discharged
- 15 U.S.C. 77e (Prohibitions relating to interstate commerce and the mails)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/77e; checked Securities Act Section 5(a) and (c): no sale or offer through the mails or interstate commerce unless a registration statement is in effect or filed
- 15 U.S.C. 78u-6(b) (Whistleblower awards: amount and payment from the Fund)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78u-6; checked (a)(1) covered action over $1,000,000, (b)(1) awards of 10 to 30 percent of what is collected, (b)(2) paid from the Investor Protection Fund (text current through Pub. L. 119-21, 4 Jul 2025)
- 15 U.S.C. 78u-6(c)(2)(C) (Denial of award for information gained through a required audit)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78u-6; checked (c)(2): no award to regulators' or law enforcement staff, convicted whistleblowers, auditors whose submission from a required audit is contrary to Section 10A (15 U.S.C. 78j-1), or those who do not submit in the required form
- 18 U.S.C. 1341 (Frauds and swindles)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1341; checked the 20-year maximum and the 30-year tier for a financial institution or a declared disaster; amendment note for Pub. L. 107-204 Section 903
- 18 U.S.C. 1349 (Attempt and conspiracy)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1349; checked same penalties as the offense that was the object of the attempt or conspiracy
- 18 U.S.C. 1514A(b)(2)(D) (Statute of limitations for retaliation complaints)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1514A; checked 180 days after the violation or after the employee became aware of it, complaint to the Secretary of Labor under (b)(1)(A); amendment note: Pub. L. 111-203 Section 922(c) substituted 180 for 90
- 18 U.S.C. 1514A(e) (Nonenforceability of waivers and predispute arbitration agreements)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1514A; checked (e)(1) rights not waivable by any agreement, policy form or condition of employment and (e)(2) no predispute arbitration agreement valid or enforceable for a dispute under the section
- 18 U.S.C. 1520(a)(1) (Auditors keep audit or review workpapers)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1520; checked (a)(1) five years from the end of the fiscal period in which the audit or review was concluded, (a)(2) SEC retention rules, (b) up to 10 years for knowing and willful violations
- 15 U.S.C. 7214(i)(2) (Disclosure to Commission)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7214 and https://www.govinfo.gov/content/pkg/USCODE-2024-title15/html/USCODE-2024-title15-chap98-subchapI-sec7214.htm (official U.S. Code, 2024 edition, same text); checked the SEC identifies each covered issuer whose audit report comes from a registered firm's foreign office the Board determines it cannot inspect or investigate completely because of a foreign authority's position, and requires the issuer to submit documentation that a governmental entity in that jurisdiction does not own or control it (added by Pub. L. 116-222, Dec. 18, 2020; (i)(2)(A)(ii) amended by Pub. L. 117-328, Dec. 29, 2022, to read "a foreign jurisdiction")
- 15 U.S.C. 7214(i)(3) (Trading prohibition after 2 years of non-inspections)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7214 and https://www.govinfo.gov/content/pkg/USCODE-2024-title15/html/USCODE-2024-title15-chap98-subchapI-sec7214.htm (official U.S. Code, 2024 edition, same text); checked after 2 consecutive non-inspection years the SEC shall prohibit trading on a national securities exchange and through any other SEC-regulated method, including over the counter; the trigger was 3 years until Pub. L. 117-328, Div. AA, Section 301 (Dec. 29, 2022) substituted 2; the initial ban ends when the issuer certifies it has retained a firm the Board has inspected to the SEC's satisfaction; non-inspection years begin after Dec. 18, 2020
- 15 U.S.C. 7215(c)(7)(B) (Association with an issuer, broker, or dealer)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7215 and https://www.govinfo.gov/content/pkg/USCODE-2024-title15/html/USCODE-2024-title15-chap98-subchapI-sec7215.htm (official U.S. Code, 2024 edition, same text); checked unlawful for a person suspended or barred from association with a registered firm willfully to become or remain associated with any issuer, broker or dealer in an accountancy or financial management capacity, and for an issuer that knew or should have known of the bar to permit it, without Board or SEC consent; wording as amended by Dodd-Frank Section 982(f) (the 2002 text read "barred from being associated with an issuer")
- 15 U.S.C. 7216(d) (Service of requests or process)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7216 and https://www.govinfo.gov/content/pkg/USCODE-2024-title15/html/USCODE-2024-title15-chap98-subchapI-sec7216.htm (official U.S. Code, 2024 edition, same text); checked (d)(1) a foreign firm working for a domestic registered firm gives it an irrevocable consent naming it agent for SEC or Board requests and process; (d)(2) a foreign firm that performs material services a registered firm relies on, issues an audit report or performs audit work designates to the SEC or the Board an agent in the United States; (f) staff may allow production through foreign counterparts; added by Dodd-Frank Section 929J
- 15 U.S.C. 7213(a)(3)(C) (Transition period for emerging growth companies)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7213 and https://www.govinfo.gov/content/pkg/USCODE-2024-title15/html/USCODE-2024-title15-chap98-subchapI-sec7213.htm (official U.S. Code, 2024 edition, same text); checked Board rules requiring mandatory audit firm rotation or an auditor discussion and analysis supplement do not apply to an emerging growth company's audit; any other Board rule adopted after April 5, 2012 does not apply to an EGC audit unless the SEC determines it necessary or appropriate, considering investor protection and efficiency, competition and capital formation; added by JOBS Act Section 104 (https://www.govinfo.gov/content/pkg/PLAW-112publ106/html/PLAW-112publ106.htm, opened 31 Oct 2026)
- 15 U.S.C. 7231 (Exemption authority)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7231 and https://www.govinfo.gov/content/pkg/USCODE-2024-title15/html/USCODE-2024-title15-chap98-subchapII-sec7231.htm (official U.S. Code, 2024 edition, same text); checked (Sarbanes-Oxley Section 201(b)) the Board may, case by case, exempt any person, issuer, public accounting firm or transaction from the Section 10A(g) prohibitions, if necessary or appropriate in the public interest and consistent with investor protection, subject to SEC review as for Board rules
- 15 U.S.C. 78c(a)(58) (Definition of audit committee)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78c and https://www.govinfo.gov/content/pkg/USCODE-2024-title15/html/USCODE-2024-title15-chap2B-sec78c.htm (official U.S. Code, 2024 edition, same text); checked (58)(A) a committee or equivalent body established by and amongst the board to oversee accounting and financial reporting processes and audits; (58)(B) if no such committee exists, the entire board of directors
- 15 U.S.C. 78j-1(i)(2) (Disclosure to investors)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78j-1 and https://www.govinfo.gov/content/pkg/USCODE-2024-title15/html/USCODE-2024-title15-chap2B-sec78j-1.htm (official U.S. Code, 2024 edition, same text); checked audit committee approval of a non-audit service to be performed by the issuer's auditor is disclosed to investors in periodic reports required by Section 13(a); also read (h) tax services need preapproval and (g)(7) broker or dealer, investment adviser or investment banking services are prohibited
- 15 U.S.C. 78s(c) (Amendment by Commission of rules of self-regulatory organizations)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78s and https://www.govinfo.gov/content/pkg/USCODE-2024-title15/html/USCODE-2024-title15-chap2B-sec78s.htm (official U.S. Code, 2024 edition, same text); checked the SEC by rule may abrogate, add to and delete from an organization's rules after Federal Register notice with the text and reasons, an opportunity for written and oral comment, and a statement of basis and purpose; Sarbanes-Oxley Section 107(b)(5) applies it to Board rules (https://www.law.cornell.edu/uscode/text/15/7217)
- 15 U.S.C. 78m(i) (Accuracy of financial reports)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78m; checked the current text: each financial report containing financial statements filed with the SEC reflects all material correcting adjustments identified by a registered public accounting firm under GAAP and SEC rules
- 15 U.S.C. 78m(j) (Off-balance sheet transactions)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78m; checked the current text: each annual and quarterly financial report discloses all material off-balance-sheet transactions, arrangements, obligations (including contingent obligations) and other relationships with unconsolidated entities that may have a material current or future effect
- 15 U.S.C. 78u(d)(2) (Authority of court to prohibit persons from serving as officers and directors)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78u; checked that in an SEC injunction action the court may bar, conditionally or unconditionally, permanently or for a period, a person who violated Section 10(b) from acting as an officer or director of a Section 12 or 15(d) issuer if the person's conduct demonstrates unfitness; the Securities Act counterpart, 15 U.S.C. 77t(e) (https://www.law.cornell.edu/uscode/text/15/77t, opened 31 Oct 2026), uses the same unfitness test for violations of Section 17(a)(1)
- 18 U.S.C. 1350(b) (Content of the certification)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1350; checked that the statement certifies the periodic report fully complies with Exchange Act Section 13(a) or 15(d) and that its information fairly presents, in all material respects, the financial condition and results of operations
- 29 U.S.C. 1021(i) (Notice of blackout periods to participants and beneficiaries)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/29/1021; checked (i)(2)(B) notice to affected participants and beneficiaries at least 30 days before an individual account plan blackout, the (i)(2)(C) exceptions, and (i)(2)(E) timely notice by the plan administrator to the issuer of employer securities
- 28 U.S.C. 1658(b) (Time limits for private securities fraud actions)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/28/1658; checked (b): a private right of action involving fraud, deceit, manipulation or contrivance under the securities laws may be brought not later than the earlier of 2 years after discovery of the facts or 5 years after the violation; added by Pub. L. 107-204 Section 804(a); (a) the general 4-year limit
- 18 U.S.C. 1348 (Securities and commodities fraud)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1348; checked knowingly executing or attempting a scheme to defraud in connection with securities of an issuer registered under Exchange Act Section 12 or reporting under 15(d): fine, up to 25 years, or both; added by Pub. L. 107-204 Section 807(a)
- 15 U.S.C. 78u-6(h)(1)(C) (Relief for retaliation)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/78u-6; checked (h)(1)(A) protected acts, (h)(1)(B)(i) action in federal district court, (h)(1)(C) relief: reinstatement with the same seniority, 2 times back pay with interest, and litigation costs, expert witness fees and reasonable attorneys' fees
- 18 U.S.C. 1513(e) (Retaliating against a witness, victim, or an informant)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/18/1513; checked (e): knowingly, with intent to retaliate, taking any harmful action, including interference with lawful employment or livelihood, against a person for giving a law enforcement officer truthful information about a federal offense: fine, up to 10 years, or both
- 29 U.S.C. 1131(a) (Criminal penalties for willful reporting violations)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/29/1131; checked (a): willful violation of part 1 (reporting and disclosure): fine up to $100,000, prison up to 10 years, or both; a violator that is not an individual, fine up to $500,000
- 31 U.S.C. 313 (Federal Insurance Office)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/31/313; checked (a) the Office within the Department of the Treasury; (c)(1)(A) monitoring, (c)(1)(C) recommending to the FSOC that it designate an insurer for Federal Reserve supervision, (c)(2) advising the Secretary, (c)(3) advisory seat on the Council; (k) no general supervisory or regulatory authority over the business of insurance
- 12 U.S.C. 1851(d)(1) (Permitted activities)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/12/1851; checked (d)(1)(A) U.S. government obligations, (B) underwriting and market-making-related activities designed not to exceed the reasonably expected near-term demands of clients, customers or counterparties, (C) risk-mitigating hedging, (D) trading on behalf of customers
- 15 U.S.C. 77w (Unlawful representations)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/77w; checked Securities Act Section 23: a filed or effective registration statement is not a finding that it is true and accurate or that the Commission has passed on the merits of or approved the security, and any contrary representation to a prospective purchaser is unlawful
- 15 U.S.C. 7215(b)(5)(C) (Availability to foreign oversight authorities)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/uscode/text/15/7215; checked the current text: confidential Board information may, at the Board's discretion, be made available to a foreign auditor oversight authority without losing its confidential and privileged status, if the three conditions in (i) to (iii) are met

## 17 CFR (Securities and Exchange Commission)
- 17 CFR 240.12b-2 (Definition of accelerated filer and large accelerated filer)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.12b-2; checked the entry thresholds ($75 million to under $700 million; $700 million or more), the 12-month and one-annual-report conditions, the smaller reporting company revenue-test exclusion, and the exit thresholds ($60 million; $560 million).
- 17 CFR 240.12b-2 (Definition of emerging growth company)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.12b-2; checked the revenue cap of $1,235,000,000 and the four end events (revenue, fifth anniversary of the first registered equity sale, more than $1 billion of non-convertible debt in three years, large accelerated filer status). The SEC's EGC page (https://www.sec.gov/resources-small-businesses/going-public/emerging-growth-companies, opened 31 Oct 2026) gives the same $1.235 billion figure.
- 17 CFR 240.3b-4(c) (Definition of foreign private issuer)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.3b-4; checked (c)(1) more than 50% of voting securities held of record by U.S. residents and (c)(2) any one of the three contact tests, measured as of the last business day of the second fiscal quarter; (d) new registrants; (e) changes in status.
- 17 CFR 240.13a-14(a) (Certification of disclosure in annual and quarterly reports)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.13a-14; checked that certifications are required in each report filed on Form 10-Q, 10-K, 20-F or 40-F under Section 13(a); Form 6-K is not listed.
- 17 CFR 240.13a-16 (Reports of foreign private issuers on Form 6-K)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.13a-16; checked that FPIs subject to Rule 13a-1 report on Form 6-K, transmitted promptly after information is made public at home, and that 6-K reports are not deemed filed for Section 18 (paragraph (c)).
- 17 CFR 240.10A-3(c)(3) (Exemption for foreign private issuers with a board of auditors)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.10A-3; checked conditions (c)(3)(i)–(vi), including independence from management, responsibility for appointing and overseeing the auditor, and (vi) applying (b)(3)–(b)(5) to the board of auditors.
- 17 CFR 249.220f (Form 20-F)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/249.220f; checked that any foreign private issuer may use Form 20-F for Section 12 registration and Section 13(a) or 15(d) annual reports. Do not cite this section for the deadline: the codified paragraph (b) still shows the pre-2011 period and was never conformed; the current deadline is in Form 20-F General Instruction A.(b).
- 17 CFR 239.36(c) (Form F-6 eligibility)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/239.36; checked that Form F-6 registers depositary shares evidenced by ADRs, issued by a depositary, and is available only if the issuer of the deposited securities reports under Section 13(a) or 15(d) or the deposited securities are exempt under Rule 12g3-2(b), unless the issuer files a registration statement on another form at the same time. Same text as Form F-6 General Instruction I.A(3) (https://www.sec.gov/files/formf-6.pdf, opened 31 Oct 2026).
- 17 CFR 240.12g3-2(b) (Exemption for foreign private issuers)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.12g3-2; checked (b)(1): a foreign private issuer is exempt from Section 12(g) registration if it does not report under Section 13(a) or 15(d), keeps a foreign listing that is its primary trading market, and publishes the required information in English.
- 17 CFR 249.310(b) (Form 10-K filing deadlines)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/249.310; checked 60 days for large accelerated filers, 75 days for accelerated filers and 90 days for all other registrants. Also read 17 CFR 249.308a (Form 10-Q: 40 and 45 days).
- 17 CFR 232.101 (Mandated electronic submissions and exceptions)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/232.101; checked (a)(1)(i) registration statements and (a)(1)(iii) reports under Exchange Act Sections 13 and 15(d) must be submitted electronically. The SEC's About EDGAR page (https://www.sec.gov/submit-filings/about-edgar, opened 31 Oct 2026) describes EDGAR as the primary filing system, with free public access.
- 17 CFR 210.2-01(c)(2) (Employment relationships)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/210.2-01; checked (c)(2)(iii)(B): former firm member in a financial reporting oversight role at an issuer; one-year look-back to when audit procedures commenced (the day after the prior annual report is filed); 10-hour, business combination and emergency exclusions
- 17 CFR 210.2-01(c)(4) (Non-audit services)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/210.2-01; checked (c)(4)(i)-(x), including (v) internal audit outsourcing relating to internal accounting controls, financial systems or financial statements
- 17 CFR 210.2-01(c)(6) (Partner rotation)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/210.2-01; checked lead partner and Engagement Quality Reviewer 5 consecutive years then 5-year time-out; other audit partners 7 years then 2; small-firm exemption (fewer than five issuer clients and fewer than ten partners, Board review every 3 years)
- 17 CFR 210.2-01(c)(7) (Audit committee administration of the engagement)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/210.2-01; checked preapproval directly or under detailed policies that do not delegate the audit committee's responsibilities to management; de minimis waiver conditions
- 17 CFR 210.2-06 (Retention of audit and review records)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/210.2-06; checked (a): records relevant to an issuer audit or review kept for seven years after the accountant concludes the audit or review
- 17 CFR 210.2-07 (Communication with audit committees)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/210.2-07; checked report to the audit committee before the audit report is filed: critical accounting policies, alternative GAAP treatments with ramifications and the firm's preference, other material written communications
- 17 CFR 240.10A-3(b)(1) (Audit committee member independence)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.10A-3; checked (b)(1)(i) members are board members and independent; (b)(1)(ii) no consulting, advisory or other compensatory fee, directly or indirectly, from the issuer or any subsidiary, and not an affiliated person; (b)(1)(iv) exemptions including the new-listing phase-in; (e)(8) indirect acceptance
- 17 CFR 240.10A-3(b)(2) (Audit committee responsibility for the registered public accounting firm)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.10A-3; checked the audit committee is directly responsible for appointment, compensation, retention and oversight of the audit firm, including resolution of management-auditor disagreements on financial reporting; the firm reports directly to the committee
- 17 CFR 240.10A-3(b)(3) (Audit committee complaint procedures)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.10A-3; checked procedures for receipt, retention and treatment of accounting, internal accounting control and auditing complaints, and for confidential, anonymous submission by employees of concerns about questionable accounting or auditing
- 17 CFR 240.12b-2 (Definition of material weakness)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.12b-2; checked material weakness: a deficiency or combination such that there is a reasonable possibility that a material misstatement of annual or interim financial statements will not be prevented or detected on a timely basis; significant deficiency definition read alongside
- 17 CFR 229.308(a) (Management's annual report on internal control over financial reporting)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/229.308; checked (a)(1)-(4): responsibility statement, framework, assessment as of the end of the most recent fiscal year with any material weakness disclosed, management may not conclude ICFR is effective with one or more material weaknesses; Instruction 1 transition for newly public companies
- 17 CFR 229.308(b) (Attestation report of the registered public accounting firm)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/229.308; checked the attestation report is required for accelerated and large accelerated filers other than emerging growth companies
- 17 CFR 229.406 (Code of ethics)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/229.406; checked (a) disclose whether a code applies to the principal executive, financial and accounting officers or explain why not; (b) definition; (c) ways to make the code available; (d) website disclosure of amendments and waivers under Form 8-K Item 5.05
- 17 CFR 229.407(d)(5) (Audit committee financial expert)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/229.407; checked (d)(5)(i) disclose that the board has determined the company has at least one audit committee financial expert (name and independence) or has none (explain why); (ii) five attributes; (iii) how acquired; (iv) safe harbor
- 17 CFR 205.3(b) (Duty to report evidence of a material violation)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/205.3; checked (b)(1) report to the chief legal officer, or to both the chief legal officer and the CEO; (b)(3) then to the audit committee, another independent committee or the board absent an appropriate response; (b)(4) futility; (c) qualified legal compliance committee alternative
- 17 CFR 202.5(a) (Preliminary and formal investigations)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/202.5; checked no process issued or testimony compelled in a preliminary investigation; formal investigations and process at the Commission's discretion; non-public unless ordered. The last amendment, SEC Release No. 33-11417 (91 FR 29896, effective 21 May 2026), repealed only paragraph (e), the 1972 no-deny settlement policy; (a) to (d) and (f) are unchanged
- 17 CFR 202.5(c) (Wells submissions)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/202.5; checked written statements by persons involved in investigations and staff advice on the general nature of the investigation and indicated violations before a recommendation to the Commission
- 17 CFR 202.5(f) (Settlements do not extend to criminal charges)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/202.5; checked that dispositions may not extend to criminal charges and that criminal authority rests with the Attorney General and the Department of Justice
- 17 CFR 210.2-06(a) (Retention of audit and review records)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/210.2-06; checked seven years after the accountant concludes an audit or review of an issuer's financial statements, records covered under (a) to (c), workpapers defined in (b)
- 17 CFR 240.10D-1(b)(1) (Recovery of erroneously awarded compensation)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.10D-1; checked written recovery policy, restatement trigger, executive officers, three completed fiscal years, excess over restated amounts computed without regard to taxes, impracticability exceptions, no indemnification, and the executive officer definition in (d)
- 17 CFR 240.13a-15(c) (Management's annual evaluation of ICFR using a suitable framework)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.13a-15; checked paragraph (c): management evaluates ICFR effectiveness as of fiscal year-end, with the CEO and CFO participating, against a suitable, recognized control framework set by a body that followed due process including broad public comment; applies once the issuer filed or was required to file an annual report for the prior fiscal year.
- 17 CFR 240.13a-15(f) (Definition of internal control over financial reporting)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.13a-15; checked paragraph (f): a process designed by or under the CEO and CFO and effected by the board, management and other personnel to give reasonable assurance on the reliability of financial reporting, with the three listed policy and procedure elements.
- 17 CFR 240.12b-2 (Definition of smaller reporting company)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.12b-2; checked (1) public float under $250 million, or (2) annual revenues under $100 million with no float or a float under $700 million; read with the accelerated filer definition's condition (iv), which makes an issuer that fails the revenue test an accelerated filer if its float is $75 million to under $700 million. The SEC's fact sheet for proposed Release No. 33-11419 (https://www.sec.gov/files/33-11419-fact-sheet.pdf, opened 31 Oct 2026; a proposal, not adopted) confirms the attestation applies today to smaller reporting companies that are also accelerated filers and not emerging growth companies.
- 17 CFR 240.3b-4(e) (Changes in foreign private issuer status)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.3b-4; checked that a determination that an issuer fails to qualify governs its eligibility for the foreign private issuer forms and rules beginning on the first day of the fiscal year following the determination date.
- 17 CFR 240.13a-15(b) (Evaluation of disclosure controls and procedures)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.13a-15; checked management's evaluation, with the principal executive and financial officers, as of the end of each fiscal quarter, except (b)(1) a foreign private issuer as of the end of each fiscal year; registered investment companies within 90 days before filing each certified report
- 17 CFR 240.13a-13 (Quarterly reports on Form 10-Q)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.13a-13; checked that a quarterly report on Form 10-Q is filed within the period in General Instruction A.1 to the form for each of the first three fiscal quarters.
- 17 CFR 240.15d-6 (Suspension of duty to file reports)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.15d-6; checked that an issuer whose Section 15(d) duty is suspended files a notice on Form 15 within 30 days after the beginning of the fiscal year.
- 17 CFR 232.10(b) (Form ID before filing on EDGAR)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/232.10; checked that each electronic filer must, before filing on EDGAR, file Form ID, the application for EDGAR access, with a notarized document confirming it; (d) account administrator rules. With the SEC's EDGAR Next page (https://www.sec.gov/submit-filings/improving-edgar/edgar-next-improving-filer-access-account-management, opened 31 Oct 2026): individuals sign in with Login.gov credentials, and filers without access submit a Form ID.
- 17 CFR 232.201 (Temporary hardship exemption)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/232.201; checked (a) unanticipated technical difficulties allow a paper filing under cover of Form TH no later than one business day after the due date, deemed filed on time for Section 13(a) and 15(d) reports; Note 2: do not use Form 12b-25 for electronic difficulties; (b) electronic confirming copy within six business days.
- 17 CFR 205.2(a) (Appearing and practicing before the Commission)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/205.2; checked (a)(1)(iv) advising an issuer whether information must be filed with the Commission; (a)(2)(ii) non-appearing foreign attorneys excluded; (g) representation of an issuer regardless of whether the attorney is employed or retained by the issuer.
- 17 CFR 205.2(g) (In the representation of an issuer)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/205.2; checked (g): "in the representation of an issuer" means providing legal services as an attorney for an issuer, regardless of whether the attorney is employed or retained by the issuer.
- 17 CFR 240.10A-3(b)(4) (Authority to engage advisers)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.10A-3; checked that each audit committee must have authority to engage independent counsel and other advisers as it determines necessary
- 17 CFR 240.10A-3(b)(5) (Funding)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.10A-3; checked that each listed issuer must provide appropriate funding, as determined by the audit committee, for the registered public accounting firm, the committee's advisers and its ordinary administrative expenses
- 17 CFR 240.13a-14(c) (No signature under a power of attorney)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.13a-14; checked that a person required to give a certification under (a), (b) or (d) may not have it signed on their behalf under a power of attorney or other confirming authority; (a) also read: each principal executive and principal financial officer, or person performing similar functions, at the time of filing signs
- 17 CFR 240.13a-15(d) (Evaluation of changes in internal control over financial reporting)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.13a-15; checked that management, with the principal executive and financial officers, evaluates any change in ICFR during each fiscal quarter (fiscal year for a foreign private issuer) that has materially affected, or is reasonably likely to materially affect, ICFR
- 17 CFR 240.12b-2 (Definition of significant deficiency)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.12b-2; checked: a deficiency, or a combination of deficiencies, in ICFR that is less severe than a material weakness, yet important enough to merit attention by those responsible for oversight of the registrant's financial reporting
- 17 CFR 229.307 (Disclosure controls and procedures)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/229.307; checked disclosure of the principal executive and financial officers' conclusions on the effectiveness of disclosure controls and procedures as of the end of the period, based on the Rule 13a-15(b) evaluation
- 17 CFR 229.308(c) (Changes in internal control over financial reporting)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/229.308; checked disclosure of any change in ICFR identified in the Rule 13a-15(d) evaluation that occurred during the last fiscal quarter (the fourth quarter in an annual report) and has materially affected, or is reasonably likely to materially affect, ICFR
- 17 CFR 229.308 Instruction 1 (Transition period for newly public companies)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/229.308; checked that a registrant need not comply with Item 308(a) and (b) until it has filed, or been required to file, an annual report for the prior fiscal year, and that the first annual report includes a statement that it omits management's assessment and the attestation report because of the transition period for newly public companies
- 17 CFR 229.308 Instruction 2 (Evidential matter supporting management's assessment)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/229.308; checked that the registrant must maintain evidential matter, including documentation, to provide reasonable support for management's assessment of ICFR effectiveness
- 17 CFR 205.3(c) (Reporting to a qualified legal compliance committee)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/205.3; checked (c)(1): an attorney may report evidence of a material violation to a previously formed qualified legal compliance committee instead of following paragraph (b), has then satisfied the reporting obligation and is not required to assess the issuer's response; (c)(2) the chief legal officer may refer a report to that committee
- 17 CFR 244.100(a) (Non-GAAP measures: comparable GAAP measure and reconciliation)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/244.100; checked that whenever a registrant publicly discloses material information including a non-GAAP financial measure, it presents the most directly comparable GAAP measure and a reconciliation (quantitative for historical measures); also read (b) no misleading presentation, (c) the foreign private issuer exception, 17 CFR 244.101 definitions (https://www.law.cornell.edu/cfr/text/17/244.101) and the Part 244 authority citation, which includes 15 U.S.C. 7261 (Section 401) (https://www.law.cornell.edu/cfr/text/17/part-244)
- 17 CFR 245.104(b)(2) (Timely notice of a blackout period to directors and executive officers)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/245.104; checked that notice to directors and executive officers is timely if given no later than five business days after the issuer receives the plan administrator's ERISA section 101(i)(2)(E) notice or, if no such notice is received, at least 15 calendar days before the blackout begins; (b)(3) notice to the SEC on Form 8-K
- 17 CFR 229.103(a) (Legal proceedings)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/229.103; checked (a): describe briefly any material pending legal proceedings, other than ordinary routine litigation incidental to the business, and similar information on any such proceedings known to be contemplated by governmental authorities
- 17 CFR 202.5(d) (Termination of investigations)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/202.5; checked (d): staff may advise a party that its formal investigation has been terminated; that advice must in no way be construed as exoneration or as indicating that no action may ultimately result. Paragraph (e) was repealed by Release No. 33-11417 (effective 21 May 2026); (d) is unchanged
- 17 CFR 240.21F-2(d)(1) (Retaliation protections)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.21F-2; checked (a)(1) whistleblower status starts when a person gives the Commission information in writing; (d)(1)(i) to qualify for Section 21F(h)(1) retaliation protection the person must qualify as a whistleblower before the retaliation (85 FR 75942, Nov. 5, 2020)
- 17 CFR 240.21F-8(c) (Ineligibility for whistleblower awards)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/cfr/text/17/240.21F-8; checked (c)(1) staff of the Commission, the Justice Department, appropriate regulatory agencies, SROs, the PCAOB and law enforcement; (c)(2) members, officers or employees of a foreign government or a foreign financial regulatory authority (Exchange Act Section 3(a)(52)), now or when the information was acquired; (c)(4) audit-derived information contrary to Section 10A; current through 87 FR 54151, Sept. 2, 2022

## SEC releases
- SEC Release No. 33-8221 (Policy statement reaffirming FASB as a designated private-sector standard setter)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/rules/policy/33-8221.htm; checked summary: the SEC determined FASB and the FAF meet the Section 108 criteria, so FASB standards are recognized as generally accepted for the federal securities laws (signed April 25, 2003)
- SEC Release No. 33-8810 Section II.A (The evaluation process)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/interp/2007/33-8810.pdf; checked top-down, risk-based evaluation; footnote 20: material weaknesses remediated by fiscal year-end allow an effective conclusion, with disclosure of remediated weaknesses considered; footnote 21 entity-level controls
- SEC Release No. 33-8810 Section II.B.1 (Evaluation of control deficiencies)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/interp/2007/33-8810.pdf; checked severity does not depend on whether a misstatement actually occurred; likelihood and magnitude factors; compensating controls; indicators of a material weakness; significant deficiencies reported to the audit committee and auditor under Rule 13a-14
- SEC Release No. 33-8810 Section II.B.2 (Expression of assessment of effectiveness of ICFR by management)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/interp/2007/33-8810.pdf; checked management should not qualify its assessment (no "effective except" wording) and may not state ICFR is effective if a material weakness exists
- SEC Release No. 33-11126 (Listing standards for recovery of erroneously awarded compensation)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/final/2022/33-11126.pdf; checked final rule implementing Dodd-Frank Section 954 and the statement that recovery applies regardless of any fault of the executive officer (Section I, Background)
- SEC Enforcement Manual Section 2.2.3 (Formal orders of investigation)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/divisions/enforce/enforcementmanual.pdf (edition of 24 Feb 2026); checked that the Commission issues a formal order designating staff as officers who may administer oaths, subpoena witnesses and require documents, and that it is not a determination that violations occurred
- SEC Enforcement Manual Section 2.3 (The Wells process)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/divisions/enforce/enforcementmanual.pdf (edition of 24 Feb 2026); checked the Wells notice content (preliminary determination to recommend, proposed violations, right to make a submission), four-week period, 40-page and 12-minute limits, and when staff may skip the notice
- SEC Enforcement Manual Section 5.2 (Cooperation with criminal authorities)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/divisions/enforce/enforcementmanual.pdf (edition of 24 Feb 2026); checked "The SEC has authority to bring civil, but not criminal, actions" and parallel proceedings
- SEC Release No. 33-8238 Section II.A (Definition of internal control)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/final/33-8238.htm; checked Section II.A: COSO's 1992 framework defined internal control as a process giving reasonable assurance in three categories (effectiveness and efficiency of operations, reliability of financial reporting, compliance with laws and regulations) with five components; the SEC's ICFR definition covers the financial reporting subset.
- SEC Release No. 33-8238 Section II.B.3.a (Evaluation of internal control over financial reporting)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/final/33-8238.htm; checked Section II.B.3.a: management must use a suitable framework; the COSO framework satisfies the SEC's criteria and may be used, but the rules do not mandate a particular framework; the report must identify the framework used.
- SEC Release No. 33-8810 Section II.A.1.d (Role of information technology general controls)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/rules/interp/2007/33-8810.pdf; checked Section II.A.1.d and footnotes 34 to 37: management considers automated or IT-dependent application controls and the relevant IT general controls; IT general controls alone ordinarily do not address financial reporting risks; management evaluates only the general controls needed for other controls to operate properly and consistently; example areas program development, program changes, computer operations, access to programs and data; general controls that pertain only to operational efficiency need not be evaluated; footnote 35 (consistent application of a formula).
- SEC Release No. 33-8810 Section II.B.5 (Inability to assess certain aspects of ICFR)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/rules/interp/2007/33-8810.pdf; checked Section II.B.5 and footnotes 54 and 55: when a service organization will not provide a Type 2 SAS 70 report or access and no compensating controls exist, management cannot issue an ICFR report with a scope limitation and must decide whether the inability to assess is significant enough to conclude ICFR is not effective; Type 2 report described.
- SEC Release No. 33-8124 Section II.B.3 (Content of certification)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/final/33-8124.htm (release page https://www.sec.gov/rules/final/33-8124.htm: issued Aug. 29, 2002; 67 FR 57275); checked that the SEC required no particular procedures for the officers' review and evaluation but recommended that an issuer create a committee to consider the materiality of information and determine disclosure obligations on a timely basis, reporting to senior management including the principal executive and financial officers; footnote 60 lists possible members (principal accounting officer or controller, general counsel or senior disclosure lawyer, principal risk officer, chief investor relations officer, business-unit staff)
- SEC Release No. 33-8810 Section II.A.1 (Identifying financial reporting risks and controls)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/interp/2007/33-8810.pdf; checked that the evaluation begins with identifying and assessing financial reporting risks (risks that could result in a material misstatement), then whether controls placed in operation adequately address them, ordinarily considering entity-level controls; it is not necessary to identify all controls that may exist (II.A.1.b), and the guidance does not require management to identify every control in a process (Executive Summary)
- SEC Release No. 33-8810 Section II.A.1.e (Evidential matter to support the assessment)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/interp/2007/33-8810.pdf; checked that management must maintain reasonable support for its assessment, that documentation of the design of controls addressing financial reporting risks is an integral part of it, that its form and extent vary with the company's size, nature and complexity, and that it need not include all controls within a process
- SEC Release No. 33-8810 Section II.B.3 (Disclosures about material weaknesses)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/interp/2007/33-8810.pdf; checked footnote 52: significant deficiencies are not required to be disclosed in management's annual report under Item 308(a); and the suggested material weakness disclosures (nature, impact, remediation plans)
- SEC Enforcement Manual Section 3.2.2 (Document preservation letters)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/divisions/enforce/enforcementmanual.pdf (edition of 24 Feb 2026); checked the duty to preserve arises when litigation is reasonably anticipated or foreseeable, or pending; standard letters cover all forms of potentially relevant documents and communications, expressly including messaging platforms and apps and personal devices such as smartphones; staff may decide not to send one where assets may be dissipated
- SEC Release No. 33-8238 Section II.A.3 (Safeguarding of assets in the definition of ICFR)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/final/33-8238.htm; checked Section II.A.3 (Final Rules): clause (3) of the ICFR definition makes safeguarding of assets an element of ICFR, following COSO's 1994 addendum, since COSO 1992 placed safeguarding mainly under operations; the definition leaves out COSO's operations objectives and its compliance objectives except compliance with laws directly related to preparing the financial statements; footnote 57: physical security over inventory is normally an operations control but falls within financial reporting when management relies solely on perpetual records, as for interim reporting.
- SEC Release No. 33-8810 Section II.A.1.b (Identifying controls that adequately address financial reporting risks)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/rules/interp/2007/33-8810.pdf; checked Section II.A.1.b: when more than one control adequately addresses a financial reporting risk, management may select the control whose operating effectiveness can be evaluated more efficiently; when IT general controls are effective, automated controls may be more efficient to evaluate than manual ones. Also checked Section II.A.1.d: identifying risks and controls within IT should not be a separate evaluation but an integral part of the top-down, risk-based approach; footnote 36 (a person investigating items on a computer-generated exception report as a combined manual and automated control).

## SEC forms
- Form 20-F General Instruction A.(b) (Annual report due date)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/form20-f.pdf (OMB approval expiring December 31, 2026); checked that a foreign private issuer must file its annual report on Form 20-F within four months after the end of the fiscal year. SEC Release No. 33-8959 (https://www.sec.gov/rules/final/2008/33-8959.pdf, opened 31 Oct 2026) shortened the period from six months to four for fiscal years ending on or after December 15, 2011.
- Form 10-Q General Instruction A.1 (Quarterly report due dates)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/form10-q.pdf; checked 40 days after quarter-end for large accelerated and accelerated filers, 45 days for all other registrants, and no report for the fourth quarter.
- Form 40-F General Instruction A.(2) (Eligibility to use Form 40-F)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/form40-f.pdf; checked (i) incorporated or organized in Canada, (ii) a foreign private issuer or crown corporation, (iii) at least 12 calendar months of Canadian periodic reporting, (iv) public float of $75 million or more, or a Form F-9 filed on or before 30 Dec 2012. The codified text at 17 CFR 249.240f(b) lists the same first three conditions and the $75 million float but omits the Form F-9 alternative; key on the form's instruction.
- Form 8-K General Instruction B.1 (Events to be reported and time for filing of reports)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/form8-k.pdf (OMB approval expiring November 30, 2027); checked that, unless an item specifies otherwise, a report is filed or furnished within four business days after the event, with a weekend or holiday start rolling to the next business day; Item 1.01 (Entry into a Material Definitive Agreement) sets no different deadline

## SEC staff guidance
- SEC Staff FAQ on Management's Report on ICFR (revised Sept. 24, 2007) Question 3 (Excluding a recently acquired business)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/info/accountants/controlfaq.htm; checked Question 3: when an assessment of a business acquired during the year is not possible, the staff does not object to management excluding it, with the business identified and its significance disclosed; the exclusion may not extend beyond one year from the acquisition date or more than one annual report.
- SEC Staff FAQ on Management's Report on ICFR (revised Sept. 24, 2007) Question 8 (Reliance on a service provider's Type 2 report)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/info/accountants/controlfaq.htm; checked Question 8 and footnote 3: management keeps the responsibility to assess controls over outsourced operations; may rely on a Type 2 SAS 70 report, including one as of a different year-end or by the same audit firm, but not one management engaged its own audit firm to prepare; remains responsible for controls over information flowing to and from the service organization; footnote 3 defines a Type 2 report (controls placed in operation as of a date and tested for operating effectiveness during a period).

## SEC staff publications
- SEC Investor Bulletin: American Depositary Receipts, August 2012 (ADR program levels)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/files/adr-bulletin.pdf; checked Level 1 (over the counter, Form F-6 only, no capital raising, the only level that may be unsponsored), Level 2 (exchange listing, Form 20-F, no capital raising), Level 3 (capital raising on Form F-1, F-3 or F-4, plus Form 20-F), and that Form F-6 covers only the deposit terms. The bulletin says it is not a legal interpretation; it is cited for how the market categorizes programs.
- SEC How Investigations Work Page (Common violations that may lead to SEC investigations)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/enforce/how-investigations-work (last updated 14 May 2024); checked the six common violations (misrepresentation or omission of important information about securities, market manipulation, stealing customers' funds or securities, broker-dealers' duty to treat customers fairly, insider trading, selling unregistered securities); civil actions in U.S. District Court; administrative proceedings before an administrative law judge independent of the Commission, with appeal of the initial decision to the Commission; many cases settle
- SEC Statutes and Regulations Page (Securities Exchange Act of 1934: insider trading)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/about/about-securities-laws; checked the Exchange Act section: insider trading is illegal when a person trades a security while in possession of material nonpublic information in violation of a duty to withhold the information or refrain from trading
- SEC Statutes and Regulations Page (Securities Act of 1933: disclosure, not a guarantee of accuracy)
  - Verified (opened 31 Oct 2026): https://www.sec.gov/about/about-securities-laws; checked the Securities Act section: the "truth in securities" law with two objectives; registration disclosure lets investors, not the government, make informed judgments; the SEC requires the information to be accurate but does not guarantee it; investors have recovery rights for incomplete or inaccurate disclosure

## Court decisions
- Free Enterprise Fund v. PCAOB 561 U.S. 477 (2010) (Removal of Board members)
  - Verified (opened 31 Oct 2026): https://www.govinfo.gov/content/pkg/USREPORTS-561/pdf/USREPORTS-561-477.pdf; checked syllabus: the dual for-cause removal limits in 15 U.S.C. 7211(e)(6) and 7217(d)(3) are unconstitutional and severable; the Board continues, and its members are removable by the SEC at will
- SEC v. Jarkesy No. 22-859 (2024) (Jury trial when the SEC seeks civil penalties for securities fraud)
  - Verified (opened 31 Oct 2026): https://www.law.cornell.edu/supremecourt/text/22-859; checked the syllabus holding (decided 27 Jun 2024): when the SEC seeks civil penalties against a defendant for securities fraud, the Seventh Amendment entitles the defendant to a jury trial; the public rights exception does not apply

## COSO
- COSO Internal Control—Integrated Framework (2013) Executive Summary (Limitations)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_1df7d5dd38074006bce8fdf621a942cf.pdf; checked the definition of internal control (reasonable, not absolute, assurance) and the Limitations section (faulty judgment, human error, management override, collusion, external events). Named and paraphrased only; no COSO text reproduced.
- COSO Internal Control—Integrated Framework (2013) Executive Summary (Effective internal control)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_1df7d5dd38074006bce8fdf621a942cf.pdf; checked the Effective Internal Control section: each component and relevant principle present and functioning, and the five components operating together; meaning of present and functioning; a major deficiency prevents concluding effectiveness.
- COSO Internal Control—Integrated Framework (2013) Executive Summary (Foreword: relationship to the ERM framework)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_1df7d5dd38074006bce8fdf621a942cf.pdf; checked the foreword: the ERM framework and the internal control framework are complementary and neither supersedes the other; ERM encompasses internal control and remains suitable for enterprise risk management.
- COSO Internal Control—Integrated Framework (2013) Principle 5 (Holds individuals accountable)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_77d5d0f3d569439990b170bd3b909d7e.pdf; checked the principles poster: principle 5 under control environment (accountability for internal control responsibilities). Named only.
- COSO Internal Control—Integrated Framework (2013) Principle 8 (Considers the potential for fraud)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_77d5d0f3d569439990b170bd3b909d7e.pdf; checked the principles poster: principle 8 under risk assessment. Named only.
- COSO Internal Control—Integrated Framework (2013) Principle 11 (Selects and develops general controls over technology)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_77d5d0f3d569439990b170bd3b909d7e.pdf; checked the principles poster: principle 11 under control activities. Named only.
- COSO Internal Control—Integrated Framework FAQ (May 2013) Question 1 (What the update kept and changed)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_8fdac5b8011e4cd08d566bf40b1ac2a8.pdf; checked Question 1: the update keeps the core definition and the five components, formalizes principles, adds points of focus and broadens operations and reporting objectives.
- COSO Internal Control—Integrated Framework FAQ (May 2013) Question 3 (Requirements for effective internal control)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_8fdac5b8011e4cd08d566bf40b1ac2a8.pdf; checked Question 3: all 17 principles presumed relevant, exceptions rare; a relevant principle not present and functioning means its component is not; entities under regulators' criteria (the SEC example) classify severity only with those criteria (material weakness, significant deficiency, control deficiency).
- COSO Internal Control—Integrated Framework FAQ (May 2013) Question 6 (Transition and supersession of the 1992 framework)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_8fdac5b8011e4cd08d566bf40b1ac2a8.pdf; checked Question 6: the 1992 framework available through a transition period to 15 December 2014, then considered superseded; external reporting should disclose whether the original or 2013 version was used. Supersession also stated on https://www.coso.org/guidance-on-ic (opened 31 Oct 2026).
- COSO Internal Control—Integrated Framework FAQ (May 2013) Question 8 (Relationship to enterprise risk management)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_8fdac5b8011e4cd08d566bf40b1ac2a8.pdf; checked Question 8: ERM is broader in scope than internal control, internal control is an integral part of ERM, entities may not be required to apply ERM, regulators may require reporting on effective internal control.
- COSO Enterprise Risk Management—Integrating with Strategy and Performance (2017) Executive Summary (Five components and 20 principles)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_61ea5985b03c4293960642fdce408eaa.pdf; checked the five components (governance and culture; strategy and objective-setting; performance; review and revision; information, communication and reporting), the 20 principles listed by number, and the misconceptions box (not a function, not only a risk list, addresses more than internal control, not a checklist).
- COSO Enterprise Risk Management—Integrating with Strategy and Performance (2017) Executive Summary (The role of risk in strategy selection)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_61ea5985b03c4293960642fdce408eaa.pdf; checked "The Role of Risk in Strategy Selection": risk to the chosen strategy is one aspect; the possibility of strategy not aligning with mission, vision and core values and the implications from the strategy chosen are the two additional aspects; board review of strategy and risk appetite.
- COSO Thought Paper Embracing Enterprise Risk Management (2011) Appendix A (Eight components of the 2004 ERM framework)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_b2d69c6e844642ae87ffa8fdbf80ced9.pdf; checked Appendix A (COSO's 2004 Enterprise Risk Management—Integrated Framework consists of eight interrelated components: internal environment, objective setting, event identification, risk assessment, risk response, control activities, information and communication, monitoring) and the cube figure.
- COSO Thought Paper Understanding and Communicating Risk Appetite (2012) Risk Appetite and Risk Tolerance (Four categories of ERM objectives)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_b0013c9344764b0b8c30a7eb7e5c27c9.pdf; checked page 11: the four categories of ERM objectives are strategic, operations, reporting and compliance.
- COSO Internal Control—Integrated Framework (2013) Executive Summary (Defining internal control)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_1df7d5dd38074006bce8fdf621a942cf.pdf; checked "Defining Internal Control": a process effected by an entity's board of directors, management and other personnel, giving reasonable assurance on operations, reporting and compliance objectives; effected by people at every level, not merely manuals, systems and forms. Paraphrased only.
- COSO Internal Control—Integrated Framework (2013) Executive Summary (Objectives)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_1df7d5dd38074006bce8fdf621a942cf.pdf; checked "Objectives": three categories; reporting objectives cover internal and external, financial and non-financial reporting; operations objectives include safeguarding assets against loss; and the foreword's statement that the financial reporting category was expanded to non-financial and internal reporting. Paraphrased only.
- COSO Internal Control—Integrated Framework (2013) Executive Summary (Components of internal control)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_1df7d5dd38074006bce8fdf621a942cf.pdf; checked "Components of Internal Control", Risk Assessment: the establishment of objectives is a precondition to risk assessment, and management specifies objectives clearly enough to identify and analyze risks; the five components only. Paraphrased only.
- COSO Internal Control—Integrated Framework (2013) Principle 6 (Specifies suitable objectives)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_77d5d0f3d569439990b170bd3b909d7e.pdf; checked the principles poster: principle 6 under risk assessment (objectives specified with enough clarity to identify and assess related risks). Named only.
- COSO Internal Control—Integrated Framework (2013) Principle 9 (Identifies and analyzes significant change)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_77d5d0f3d569439990b170bd3b909d7e.pdf; checked the principles poster: principle 9 under risk assessment; its wording (changes that could significantly affect the system of internal control) also checked in COSO in the Cyber Age (2015), https://www.coso.org/_files/ugd/3059fc_9af90248e5a34ae3addd148d256107c0.pdf. Named only.
- COSO Internal Control—Integrated Framework FAQ (May 2013) Question 4 (Points of focus and controls to effect principles)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_8fdac5b8011e4cd08d566bf40b1ac2a8.pdf; checked Question 4: points of focus are typically important characteristics of principles that may help assess whether principles are present and functioning; the framework neither prescribes an assessment process nor requires management to assess separately whether points of focus are in place; some may not be suitable or relevant; no specific controls are prescribed.
- COSO Thought Paper COSO in the Cyber Age (2015) A COSO-focused Cyber Risk Assessment (Starting from the most valuable information systems)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_9af90248e5a34ae3addd148d256107c0.pdf; checked (January 2015, copyright COSO): the paper applies the 2013 framework's components and 17 principles to cyber risk; a cyber risk assessment should begin by understanding which information systems are valuable to the organization, measured against their impact on objectives; principles 7 and 8 then take the assessment deeper into attackers and methods; trying to protect everything overprotects some systems and underprotects others; control environment and monitoring are foundational. Paraphrased only.
- COSO Thought Paper Understanding and Communicating Risk Appetite (2012) Overview (Risk appetite as defined in the 2004 ERM framework)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_b0013c9344764b0b8c30a7eb7e5c27c9.pdf; checked the Overview: COSO's 2004 ERM framework defines risk appetite as the amount of risk, on a broad level, an entity is willing to accept in pursuit of value.
- COSO Thought Paper Understanding and Communicating Risk Appetite (2012) Risk Appetite and Risk Tolerance (Risk tolerance as acceptable variation around an objective)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_b0013c9344764b0b8c30a7eb7e5c27c9.pdf; checked page 11: risk tolerance applies risk appetite to specific objectives and is the acceptable level of variation relative to a specific objective, best measured in the objective's own units; appetite is broad, tolerance tactical and operational.
- COSO Thought Paper Risk Assessment in Practice (2012) The Risk Assessment Process (Risk responses: accept, reduce, share or avoid)
  - Verified (opened 31 Oct 2026): https://www.coso.org/_files/ugd/3059fc_cdb2016e5bf64213a5ca726b7846856d.pdf; checked "The Risk Assessment Process" (October 2012, copyright COSO): within the COSO ERM framework (2004), risk assessment follows event identification and precedes risk response; response options are examined (accept, reduce, share or avoid), cost-benefit analyses performed and a response strategy formulated.

## AICPA
- AICPA SOC 1 Topic Page (SOC 1 examinations of controls relevant to user entities' ICFR)
  - Verified (opened 31 Oct 2026): https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-1; checked: SOC 1 is an examination of controls at a service organization likely to be relevant to user entities' ICFR, meant for user entities and their auditors; SOC 2 listed separately as trust services criteria. Related: https://www.aicpa-cima.com/resources/toolkit/ebp-soc-1-reports-and-service-organizations (opened 31 Oct 2026: SOC reports formerly known as SAS 70 reports; SSAE No. 18 for service auditors; AU-C section 402 for user auditors).
- AICPA SOC Suite of Services Page (SOC 2 reports on trust services criteria)
  - Verified (opened 31 Oct 2026): https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services; checked: the SOC 2 guide covers controls relevant to security, availability, processing integrity, confidentiality or privacy (trust services criteria), not user entities' ICFR.
- AICPA SSAE No. 18 Page (Attestation standards recodified, superseding SSAE Nos. 10 to 17 except No. 15)
  - Verified (opened 31 Oct 2026): https://www.aicpa-cima.com/resources/download/aicpa-statement-on-standards-for-attestation-engagements-no-18; checked: the ASB completed its attestation clarity project with SSAE No. 18, which recodifies and supersedes SSAE Nos. 10 to 17 except SSAE No. 15 and its related interpretation. Also opened https://www.aicpa-cima.com/resources/download/aicpa-ssaes-currently-effective (SSAE No. 18 as amended, codified AT-C sections, current as of August 2026).
- AICPA SOC 1 Guide Page (SOC 1 examinations performed under AT-C section 320)
  - Verified (opened 31 Oct 2026): https://www.aicpa-cima.com/cpe-learning/publication/reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-user-entities-internal-control-over-financial-reporting-soc-1-guide; checked: the AICPA's 2025 SOC 1 guide helps service auditors perform a SOC 1 examination under AT-C section 320, and covers how a user auditor uses a type 1 or type 2 report.
