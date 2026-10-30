# Pricing: growth-marketer's third opinion (29 Oct 2026)

## Q1. Price points: change them. CISA ₱999 / US$29.99; CC ₱499 / US$14.99

| 6-month access | Philippines | US and global | PH net per sale (÷1.12 VAT, −15% Play) |
|---|---|---|---|
| CISA (and CISM, CRISC, AAIA) | **₱999** (was ₱699) | **US$29.99** (keep) | ₱758, against ₱530 at ₱699 |
| ISC2 CC | **₱499** (was ₱349) | **US$14.99** (keep) | ₱379, against ₱265 at ₱349 |
| CISSP (later) | ₱1,299 | US$39.99 | ₱986 |

- **Anchors.** The CISA exam costs US$575–760 (about ₱33,000–44,000), so ₱999 is 2–3% of it. ISACA's QAE database costs US$299–399, and that buys **12 months**, not 6. Pocket Prep charges US$49.99 for 3 months (about ₱2,900). A Philippine review course costs about ₱74,000. ₱999 is the most familiar "under a thousand" price point in the Philippines.
- **No launch price.** Prepaid plans can't carry offers, and the paywall rules ban struck-through prices. Beta testers already get the launch reward. In a small community of Facebook groups and Reddit, raising a founding price later costs more trust than the discount earns. If the price is wrong, lower it; lowering is the friendly direction. Aside for compliance: Play one-time products with a "Rent" option do support discount offers and Play price experiments. That's worth a look only if the prepaid plan can't be tested any other way.
- **CC is cheaper, but not a free-heavy funnel.** CC learners are entry-level, and CISA needs 5 years of experience, so CC → CISA is a slow path. ISC2 closed its free One Million CC programme in May 2026, so CC candidates now pay for the exam and have a reason to buy prep. Keep the same 20% / at-least-100 free rule for every course, so the paywall copy and the fairness promise stay identical.
- **Southeast Asia rule.** Convert the Philippine price in US-dollar terms (about US$17 for CISA, US$8.60 for CC) and round to the nearest local charm price. India goes one step lower, because its anchors (Udemy sales, app prices) are the lowest. Check each figure against the console's converted prices before saving.

| | ID | VN | IN | MY | TH | SG, Gulf, UK, US, rest |
|---|---|---|---|---|---|---|
| CISA | Rp 279.000 | ₫449.000 | ₹999 | RM 69.90 | ฿549 | Play's auto-conversion of US$29.99 |
| CC | Rp 139.000 | ₫229.000 | ₹499 | RM 34.90 | ฿279 | auto-conversion of US$14.99 |

- **Strongest reason.** Nobody sees the paywall until they have used 100+ free questions and judged the quality. At that point the price is a small part of a ₱33,000+ exam budget. ₱999 earns 43% more per sale than ₱699, so conversion would have to fall by about 30% before it loses money. If it does fall, lowering the price is easy and kind; raising it later is neither.
- **Risk.** Self-funded career shifters compare us with Udemy CISA practice tests at ₱500–700 that never expire. Cushions: the free sample, top-ups and the free reschedule extension.
- **Revisit when** Philippine install-to-paid conversion (Play installs → RevenueCat purchases) is below 3%, the ARCHITECTURE.md gate, after the first 1,000 PH installs. Then test ₱799. Revisit too if refunds citing price, or reviews saying "mahal" ("expensive" in Tagalog), pass 5%.

## Q2. The website: Option A, switched on on Premium launch day (P0) after 30 days' notice

- **Free and indexable:** notes, glossary, lessons, the exam guide and the free sample. Today the site is one page with `#` routes, and Google doesn't index fragment URLs, so nothing on it ranks on its own, the notes included. Give each of these real URLs. That's the SEO work, under A or B.
- **Behind sign-in:** the rest of the bank and the full mocks, served by the Phase E Worker. `build_site.sh` stops publishing `data/domain*.json`.
- **Moving existing web users:**
  - a 30-day notice, as a banner on the site and an email to signed-in users;
  - everything they have already answered stays in free spaced review;
  - invite them to the beta, because website feedback qualifies for the 6-month grant (BETA_PROGRAM.md). The notice becomes a gift.
- **Web → app.** The website isn't bound by Play's anti-steering rules, so it can say "Unlock the full bank in the KaiSip Android app" and link to Play with UTM tags. One purchase unlocks both.
- **Strongest reason.** Under B, the product we sell is five public JSON files on kaisip.com plus a public repo. Anyone can take the full bank with answers and tips in a minute, including Philippine "reviewer" sellers and Telegram groups. Every study-group thread would tell app learners "the website is free". So B doesn't test the model: it guarantees a free substitute, and "until sales prove it" can never be met. A gives up little in search, because original questions have no search demand for their exact wording. That demand goes to exam-dump sites. Concept searches are answered by notes, the glossary and lessons, which stay free. So A should bring more paid conversions over 6 months.
- **Risk.** Learners with only an iPhone or a desktop can't pay until there is an iOS app or web checkout. Web checkout through a merchant of record is a new paid service, so it's an owner decision. The ex-free web crowd will also grumble.
- **Revisit when,** comparing the 8 weeks after P0 with the 8 weeks before:
  - Search Console clicks to kaisip.com fall by more than 25%, which would mean the gated content was what ranked; or
  - Play installs from the kaisip.com referrer don't grow; or
  - more than about 50 "can't buy on iPhone" emails arrive, which would justify funding web checkout.

**Sources** (checked 29 Oct 2026):
- [ISACA CISA QAE (US$299/399, 12 months)](https://www.isaca.org/store/items/xmxca1712m)
- [Pocket Prep (US$20.99/mo, 49.99/3 mo, 124.99/yr)](https://apps.apple.com/us/app/id1501744813)
- [Sprintzeal Manila (₱73,975)](https://www.sprintzeal.com/course/cisa-certified-information-system-auditor-certification-training/Manila)
- [PwC PH 12% VAT on digital services](https://www.pwc.com/ph/en/tax/tax-publications/taxwise-or-otherwise/2025/soon-taking-effect-the-12-vat-on-digital-services.html)
- [Play service fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)
- [Play one-time products: rent and offers](https://developer.android.com/google/play/billing/one-time-product-multi-purchase-options-offers)
- [Play price experiments (one-time products)](https://support.google.com/googleplay/android-developer/answer/13343030)
- [ISC2 ends One Million CC](https://www.isc2.org/insights/2026/04/one-million-certified-cyber-conclusion)
- [Google: JavaScript SEO basics (History API, not fragments)](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Udemy Philippine sale prices vary between sources (₱400–2,000), so the brief's ₱500–700 is used: [Rappler](https://coupons.rappler.com/udemy-coupons/)
