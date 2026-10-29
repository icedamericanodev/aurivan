# KaiSip: will people install it and pay for it? A 6-week test, run before DTI/BIR registration

growth-marketer, 29 Oct 2026. Inputs: RECOMMENDATION.md, growth.md, BETA_PROGRAM.md, ROADMAP.md, STORE_LISTING.md, PRODUCT_VISION.md.

**Rule for the whole test: no money changes hands.** Under RMC 91-2024, a business "commences" at its first sale, or 30 days after DTI registration, whichever comes first. BIR registration is due by that date. So the test can measure intent and use, but it can't take payment. It also must not register DTI early, because that starts the 30-day BIR clock.

## 1. Market size (rough)

| Figure | Estimate | How sure | Basis |
|---|---|---|---|
| CISA holders worldwide | ~190,000–200,000 | Medium | 189,000+ "since 1978" (2023 SC Awards entry); 140,000+ in 2018 |
| New CISA certifications a year | ~10,000 | Medium-low | (189k − 140k) ÷ 5 years |
| People sitting CISA a year | **~20,000–27,000** | Low | Roughly 10k certifications ÷ ~50% pass rate (ISACA no longer publishes pass rates; estimates run 40–60%). An older publisher figure says 27,000 a year |
| ISACA members / chapters | 185,000+ / ~225–230 | High | ISACA press releases, 2025 |
| ISACA Manila chapter | **1,600+ members** (1,300 professionals + 200 students in 2023) | High for members | Chapter site; 2024 conference kit |
| ISACA Singapore chapter | 3,700+ members | High for members | Chapter site |
| CISA candidates in the Philippines a year | **~200–700** | Very low (could be 3× off either way) | Manila is ~0.9% of ISACA's members; 0.9% × 20–27k sittings, scaled up 1–3× for candidates who aren't members |
| ISC2 CC | 65,000+ certified and 1M+ enrolled under the free programme (Sep 2022 to May 2026), so ~18k certified a year while it was free | Medium for the past; **unknown** for paid volume after May 2026 | ISC2, Apr 2026 |
| r/CISA | ~13,000 members, about +47% in a year | Medium (third-party tracker) | GummySearch |

**What this means.** The Philippine market is small. If 50–70 sales a year come from the Philippines, that's 10–30% of all PH candidates, which is too much to count on. **A "Go" therefore needs demand from outside the Philippines at US$29.99** (India, the Gulf, the US and UK, Singapore), not just from the owner's local network.

## 2. Demand signals, strongest predictor of paying first

| # | Signal | Strength | Allowed before registration? |
|---|---|---|---|
| 1 | **Pre-sale or "founding learner" deposit** | Strongest: real money | **No.** The first payment is the first sale, which triggers BIR registration, invoices under EOPT, and Internet Transactions Act merchant duties. Inside the app, Play also requires Play Billing for digital content and forbids pointing users to outside payment (Payments policy). Ko-fi tips count as income too, so they're out. **After Go, the launch itself is the pre-sale:** email everyone who reserved on the day the prepaid plan goes live. |
| 2 | **Price-shown reservation:** "Tell me when it opens" with the price visible, plus email, exam month and "I'd buy at ₱X" | Strong. A behaviour, made at the point of use, with the price in view | **Yes.** No payment, no checkout, no "pre-order" wording, and the price is labelled "planned". Covered by the Data Privacy Act (RA 10173) consent wording; extend privacy.html §3e. Play pre-registration counts would be a stronger version, but Play disables them until production access is granted (12 testers × 14 days), so they come after the test. |
| 3 | **Fake-door click** ("Full access is coming") on the web and in the beta | Medium-strong. A click, not a commitment | **Yes**, if it is honest: "nothing to buy yet", no payment link, and it opens a **page in the phone's browser, not a WebView**, with no identifiers in the URL. Then Data safety stays "No data collected". It's a user-visible web change, so it needs an APP_VERSION bump and a What's New entry. In the app, it ships only in a new Play build (no over-the-air updates). |
| 4 | **Day-7 and day-14 retention in the beta** | Medium. It shows value, which comes before any willingness to pay | Yes. The day-7 and day-14 surveys in BETA_PROGRAM.md, plus Play Console statistics. No analytics SDK |
| 5 | **Beta and waitlist sign-ups** | Weak-medium. Interest that costs two minutes | Yes. The form already exists |
| 6 | **"Would you pay ₱X?" survey** | Weak. A stated answer | Yes. Make it stronger with a **past-purchase** question: "What have you already paid for to prepare?" Past behaviour beats a hypothetical |

**Bias to correct for:** beta testers get 6 months free and many are the owner's friends. Count **strangers** separately: add the form question "Do you know the founder personally?" Testers' fake-door answers are supporting evidence only.

## 3. Six-week plan (owner alone, about 3–5 hours a week, ₱0)

| Wk | Channel | Action | Owner | Metric it moves |
|---|---|---|---|---|
| 0 | Web + forms | Ship the build in §6. Write these thresholds into the Sheet before any data arrives | Claude (web-app-engineer) + owner (forms) | Test is ready |
| 1 | LinkedIn | Founder post: "I'm a CISA-certified IT auditor; I built the practice app I wanted." Link to kaisip.com/plans and the beta form. DM 20 candidate friends | Owner | Visits; sign-ups |
| 1 | ISACA Manila / PH Facebook groups | Ask the chapter board or group admins first. Offer the free beta to members. Use "Practice for the CISA® exam. Not affiliated with or endorsed by ISACA." Never imply endorsement | Owner | Sign-ups from strangers |
| 2 | Reddit r/CISA | Follow the sub's self-promotion rules and say you're the founder. Post something useful first (how to read FIRST/BEST/MOST), with the link only where allowed. Reply to every comment | Owner | Non-PH visits; reservations at US$ |
| 2 | Review-centre communities, study groups | Offer a free beta to review-centre cohorts and alumni groups. Never offer to buy reviews | Owner | Sign-ups; reservations |
| 3 | Beta | Day-7 survey (add the past-purchase and price questions). Second LinkedIn post: one sample question with its "Exam cue" | Owner | Day-7 active; reservations |
| 4 | Beta + all | Day-14 survey. Read the ₱999 vs ₱699 split. *Only if traffic is short of the minimums:* a ₱1,500 Facebook boost to PH IT-audit interests (spending money is fine; taking it is not) | Owner | Day-14 active; /plans views |
| 5 | Interviews | Five 15-minute calls: 3 who said "Yes", 2 who said "No" or "lower". Ask: "What would you buy instead, and why?" | Owner | Explains the numbers |
| 6 | Decision | Score the thresholds in §4 and pick the outcome in §5 | Owner + product-manager | Go / Weak / No-go |

## 4. Go/no-go thresholds (set before the data comes in)

**Minimum data before deciding:** at least 150 views of /plans and at least 20 beta testers opted in. If week 6 falls short, extend once by 2 weeks. If it still falls short, that's a distribution no-go, not a demand verdict.

| Gate | Go | Weak | No-go | Why this number |
|---|---|---|---|---|
| A. Reservations with "Yes, I'd buy at the shown price" (strangers only) | **≥30** | 10–29 | <10 | The bar is covering registration upkeep: roughly ₱25–45k a year for permits, books and an accountant (an assumption; ask the tax adviser) ÷ ₱758 net per sale ≈ 35–60 sales a year, or 3–5 a month. Warm, price-aware reservers might convert at an assumed 20–30% (cold waitlists convert at 2–5%). 30 in 6 weeks → ~20 a month → 4–6 sales a month |
| B. Share of those reservations from outside the Philippines | **≥33%** | 15–32% | <15% | §1: the Philippines alone can't carry 50–70 sales a year |
| C. /plans → "Yes" reservation rate | **≥15%** | 7–14% | <7% | Landing-page email sign-ups typically run 5–15%, and above 10% is strong. These visitors have already used the product, so the bar is higher |
| D. Studied in week 2 (day-14 survey; anyone who didn't answer counts as inactive) | **≥40%** | 25–39% | <25% | The BETA_PROGRAM exit target. Testers are keener than the public, so below 25% is a product problem whatever the price |
| E. Survey: already paid for some prep (QAE, manual, Udemy, review centre) | **≥50%** | 30–49% | <30% | Shows the audience already spends money on prep |
| F. Beta and waitlist sign-ups | **≥40, half from strangers** | 20–39 | <20 | 12 are needed for Play. 40 shows pull beyond the owner's own circle |

**Decision:** **Go** = A and D met, plus at least 2 of B, C, E, F. **No-go** = D below 25%, or A below 10% after the minimum data is in. Anything else is **Weak**.
**Price (₱999 vs ₱699):** keep ₱999 unless its "Yes" rate is more than 30% lower in relative terms than ₱699's. That's the break-even in growth.md. With these sample sizes the split only gives a direction; it doesn't settle the price.

## 5. What to do at each outcome

- **Go.** Within the same two weeks: tax-adviser call (8% option, VAT on Play payouts), then DTI national business name, barangay clearance and mayor's permit, then BIR. DTI starts the 30-day BIR clock, so don't leave a gap. Then follow the Phase E order in RECOMMENDATION.md. On launch day, email reservers (BCC) once: "It's open: ₱999 for 6 months, never renews."
- **Weak.** Re-test once (2–3 weeks) and don't register yet. Fix the gate that missed:
  - **C or E low, and over 40% picked "lower price":** test ₱699 only.
  - **B low:** lead with US$ markets (r/CISA, LinkedIn outside the Philippines, Gulf and India chapters) and rerun.
  - **D low:** fix the first session and onboarding before asking about money.
  - **F low:** this is reach, not demand. Ask ISACA Manila for a free CPE talk slot.
- **No-go.** Keep KaiSip free and keep costs at ₱0 (free tiers). Use it as a portfolio piece and for credibility: LinkedIn, ISACA talks. Possible pivots to test the same way, still without money:
  - (a) team access for audit firms and Big 4 / shared-service training leads (5 conversations);
  - (b) CC or CISM, where demand may differ.

  No tips or donations until registered.

## 6. What the test needs built (minimal)

1. **kaisip.com/plans/a and /plans/b**: real static URLs, not `#` routes. Planned Free vs 6-month access, "Planned price ₱999" (b: ₱699) "/ US$29.99 · one payment · 6 months · never renews · nothing to buy yet", and the not-affiliated line. Buttons go to /plans/yes and /plans/no (thank-you pages that open the prefilled Google Form), so Cloudflare Web Analytics counts each step with no cookies or personal data.
2. **Web card**, shown once after a learner has answered 50 or more questions. At most once in 7 days, never in a mock, dismissible. It picks variant a or b at random and stores the choice in a new localStorage key; the existing `aurivan_`/`cisa_` keys are left alone. Needs an APP_VERSION bump and a What's New entry.
3. **Beta app (optional):** the same card on Today after 100 answers, which is where the real paywall will appear. Pages open in the external browser with no IDs in the URL. Ships in the next closed-test build.
4. **One Google Form:** email, country, exam-month band, "At [price] for 6 months: Yes on day one / Only at a lower price (what price?) / No", past purchases, "Know the founder?", consent. Add the past-purchase and price questions to the day-7/14 surveys. Extend privacy.html §3e to cover it. No link in the repo.
5. **No analytics SDK** and no data sent from the app.

**Card copy (ready to paste).** Title: "Full access is coming". Body: "After launch, notes, lessons, drills and a sample of practice questions stay free. The full bank and timed mocks will be one payment: ₱999 for 6 months, never renews. Nothing to buy yet." Buttons: "Tell me when it opens" / "Not for me". Footer: "Practice for the CISA® exam. Not affiliated with or endorsed by ISACA."
*Rationale:* this is the real paywall moment. It answers the learner's fear of surprise renewals ("never renews"). *A/B variant:* the same card with ₱699.

## Sources
- [RMC 91-2024: registration on or before commencement (reproduction)](https://batasnatin.com/laws/rmc-no-91-2024-clarification-on-registration-procedures-pursuant-to-revenue-r) · [Grant Thornton on RMC 91-2024](https://www.grantthornton.com.ph/insights/articles-and-updates1/tax-notes/clarifications-on-the-registration-procedures-under-eopt-act/) · [PwC: tax compliance on internet transactions (RR 15-2024)](https://www.pwc.com/ph/en/tax/tax-publications/taxwise-or-otherwise/2024/tax-compliance-on-internet-transactions.html)
- [Business Name Law, Act 3883](https://laws.chanrobles.com/acts/7_acts.php?id=320) · [PwC: Internet Transactions Act](https://www.pwc.com/ph/en/tax/tax-publications/taxwise-or-otherwise/2024/checking-out-the-Internet-transactions-act.html)
- [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en) · [Play testing requirements; pre-registration gated](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [CISA 189,000+ (SC Awards 2023)](https://scworld.com/news/2023-sc-awards-finalists-best-professional-certification-program) · [140,000+ in 2018 (ISACA via PRWire)](https://prwire.com.au/pr/77678/isacas-cisa-certification-continues-momentum-after-40-years) · [Pass-rate estimates (Infosec)](https://www.infosecinstitute.com/resources/cisa/cisa-study-resources) · [27,000 a year (older forum citation)](https://community.infosecinstitute.com/discussion/comment/943965)
- [ISACA 185,000+ members, ~230 chapters](https://www.businesswire.com/news/home/20250710714353/en/ISACA-Introduces-the-CISA-Associate) · [ISACA Manila (1,600+)](https://engage.isaca.org/manilachapter) · [Manila 2024 conference kit](https://higherlogicdownload.s3.amazonaws.com/ISACA/cd158dd9-cfab-48f1-94fa-770f4be4a7a8/UploadedImages/2024_conference/Conference_Delegate_Marketing_KIt.pdf) · [ISACA Singapore (3,700+)](https://engage.isaca.org/singaporechapter/about/aboutchapter)
- [ISC2 One Million CC conclusion](https://www.isc2.org/insights/2026/04/one-million-certified-cyber-conclusion) · [r/CISA size (GummySearch)](https://gummysearch.com/r/CISA)
- [Landing-page benchmarks (Kromatic)](https://kromatic.com/real-startup-book/2-evaluative-market-experiments/value-proposition-test/landing-page-smoke-test/) · [Waitlist-to-paid 2–5% (echai)](https://echai.ventures/startingup/validate-idea/is-a-waitlist-with-a-lot-of-signups-actual-proof-of-demand)
