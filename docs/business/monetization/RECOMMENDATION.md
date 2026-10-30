# KaiSip paid phase (Phase E): synthesis of 3 expert reviews (29 Oct 2026)

**Experts:**
- product-manager (model, prices, build order)
- behavioral-scientist (`behavior.md`)
- app-store-compliance-reviewer (store and legal go/no-go)

## Agreed by all three
- **Product.** One payment per course for **6 months of access** that never renews.
  - On Play it is a prepaid plan, and the learner can top up another 6 months.
  - On iOS later it is a non-renewing subscription.
  - Name it "6-month access", never "Pass", because "pass" reads as a promise.
- **No store trial.** The free tier, which never expires, is the trial. No card is needed.
- **Free tier.**
  - Every feature stays free: notes, glossary, lessons, drills, progress, readiness, the plant, widgets and backup.
  - Learners also get a weighted sample of about 20% of each course's questions (at least 100), one diagnostic, and one short timed mock.
  - Spaced review of questions a learner has already answered stays free forever.
- **Paid.** The rest of the question bank and the full timed mocks.
- **Paywall.**
  - Shows only in three places: a calm card on Today once the sample runs out, locked rows in Practice, and Settings → Your plan.
  - Never shows inside a session, mock, lesson, game, notification or widget, during exam week, or during the plant's Turning.
  - The learner sees at most one paywall they didn't ask for in any 7 days.
  - Copy never mentions streaks, the plant, loss, countdowns or struck-through prices.
  - It shows the store's localised price, "one payment · 6 months · never renews", Restore, Terms, Privacy and the not-affiliated line.
- **Beta testers' 6 months free.** A RevenueCat promotional entitlement tied to the signed-in account, running from Premium launch day plus 6 months and covering every course live in that window.
  - No promo codes, no trials, and no code-entry box.
- **Fairness.**
  - A 14-day refund with no questions asked, handled through support.
  - One free extension of up to 3 months if the exam date moves (granted as a promotional entitlement).
- **Order.**
  1. Accounts and the public Play launch.
  2. Terms, privacy and Data safety (RevenueCat ends "No data collected").
  3. A content gate (a Cloudflare Worker checks the entitlement), then the repo goes private.
  4. The RevenueCat SDK (Billing Library 8 or later), one prepaid plan, the paywall and Restore.
  5. The beta grant script.
  6. Unlocking on the web for signed-in learners.
- **RevenueCat is the single source of truth.** The app user ID is the Supabase user id, a webhook mirrors purchases into `public.entitlements`, and account deletion also deletes the RevenueCat customer.

## Resolved splits
- **Lifetime option.** The behavioral scientist allowed it as an option; the product manager said no, because CISM, CISSP and other exam outlines change and need new content every time. **Decision: no lifetime at launch.** The free 3-month reschedule extension covers the fairness concern.
- **Free sample size.** Use about 20% of each course and at least 100 questions, whichever is larger.

## Owner decisions (major list: money, legal)
1. Approve the package above.
2. **Prices** for 6 months:
   - CISA (and later CISM, CRISC, AAIA): ₱699 / US$29.99
   - ISC2 CC: ₱349 / US$14.99
   - CISSP (later): ₱899 / US$39.99
   - Southeast Asian prices are set by hand.
3. **The website.**
   - Option A (product manager's recommendation): the web uses the same split, and the paid bank sits behind sign-in. Notes, glossary and lessons stay free for search.
   - Option B: the web stays fully free for CISA until the first paid sales prove the model.
   - On either option the app must never say "free on the website".
4. **Owner must-do.** Talk to a Philippine tax adviser about BIR registration and tax on store payouts. Optionally, ask ISACA and ISC2 to confirm the product-name wording.

## Must-dos found by the compliance review (build time)
- Product names lead with KaiSip or a generic course name and put the exam after "for", e.g. "KaiSip IT Audit course, 6-month access (for the CISA® exam)". No exam mark at the start of a name.
- No links, buttons or price comparisons in the app that point to web checkout or Ko-fi.
- Store listing changes: remove "free to use during the beta" and "No data collected"; set IARC "allows purchases" to Yes.
- terms.html gets a paid-terms section, and privacy.html adds RevenueCat.
- Fix ARCHITECTURE.md §5 and the phase order, so accounts come before monetisation.
