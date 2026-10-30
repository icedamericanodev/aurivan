# KaiSip paid model: a behaviour and learning-science view

Evidence types: **[F]** field study or meta-analysis, **[L]** lab study, **[T]** theory or observational, **[R]** regulation or ethics, **[C]** KaiSip code or docs.

## Recommendation: (d) a hybrid led by a non-renewing "Exam pass"
- **Headline: an Exam pass per course.** One payment covers 6 months, or until the exam date plus 30 days if that is later. It does not renew.
- **Second option: a Lifetime licence per course.** It covers the current exam outline. A pass holder can upgrade by paying only the difference.
- **No auto-renewing plan for a single course.** An annual All-Access subscription comes only once there are 3 or more courses, under the rules in "Renewal and refunds" below.
- **Founder decision needed.** This replaces the subscription prices in ARCHITECTURE.md section 5 and matches the "until you pass" promise in PRODUCT_VISION.md [C].

| Model | Learning | Motivation | Fairness | Dark-pattern risk |
|---|---|---|---|---|
| (a) Subscription | Neutral. Monthly billing can push cramming, which defeats spacing [F: Cepeda 2006] | Recurring payments keep the purchase in mind and use up [F/L: Gourville & Soman 1998] | Low. Learners overestimate how much they will use flat-rate plans and keep paying [F: DellaVigna & Malmendier 2006]. "Punishes slow learners" [C] | High: forgotten renewals, auto-converting trials [F: Johnson & Goldstein 2003, defaults] |
| (b) Exam pass | Good. The window matches a 6–12 week plan | Good. The exam date gives a goal gradient [F: Kivetz 2006]. Expiry pressure is the risk | High. The price is known up front | Low, if expiry is handled kindly |
| (c) Lifetime | Neutral | No deadline at all. Exam date and plan must supply the pacing | Highest | Lowest |
| (d) Hybrid (b)+(c) | Good | Good | High | Low, with at most 2 options and no decoy tier |

## Free tier: enough to judge the value honestly
- **Every feature, limited content.** Spaced review, readiness, the plant, streak, Mistake Journal, games, notes and lessons are all free. Content is a weighted sample: about 20 questions per domain, at least 100 in total.
  - This is enough to reach readiness's 40-answer range and the 10-per-domain mastery threshold [C].
  - Learners need to see an honest readiness range before they pay.
- **One free diagnostic mini-mock.** Also one short timed mock (about 50 questions), so the learner can feel the 1.6 minutes per question pace [F: retrieval under exam-like conditions].
- **Never lock a learner's own reviews or data.**
  - Spaced review of every question already answered stays free, forever. Cutting off retrieval of items already learned harms retention [F: Roediger & Karpicke 2006].
  - Progress, export, backup and accessibility are never paid.

## Paywall placement
- **Only at natural boundaries.**
  - A calm card on Today once the free pool is used up.
  - Labelled locked rows in Practice.
  - Settings, then "Your plan".
- **Never** in these places:
  - inside a session, a mock, a lesson or a game;
  - on an answer screen, and above all not after a wrong answer;
  - as a modal when the app opens;
  - in a notification or a widget;
  - on the Exam-ready moment or the plant's Turning;
  - during exam week (T−7).
  - Why: interruptions add resumption cost [L: Altmann & Trafton]. Timed mocks only build stress tolerance if conditions stay exam-like [F: Saunders 1996].
- **Frequency:** at most 1 prompt the learner did not ask for per 7 days. A dismissal holds for 7 days.

## Trial
- **No auto-converting trial, and no card on file.** The free tier never expires, and that is the trial.
  - Spacing benefits show up over days to weeks, so a 7-day trial is too short to judge them [F: Cepeda 2006].
  - The evidence that longer trials convert better comes from industry data only [T, weak].

## Loss aversion and streaks
- **Paywall copy never mentions streak, plant, readiness or badges.** No "don't lose", no countdowns, no struck-through "was" prices.
  - Loss framing does raise conversion, and aggressive versions provoke backlash [F: Luguri & Strahilevitz 2021].
  - Pressuring, controlling messages undermine autonomy [F/L: Ryan & Deci 2000].
- **Free study counts in full.** Free reviews grow the plant and keep the streak, and the weekly rest day stays [C]. The plant never wilts when a pass ends. Looks are never sold [C].
- **Expiry notices:** in-app only, 14 days and 3 days before the pass ends. Never a push notification.

## Renewal and refunds
- **Refunds:** 14 days, no questions asked, through the store, whatever the usage.
- **Exam reschedule:** one free extension, up to 3 months.
- **Retake extension:** a learner who reports not passing gets 3 free months. Never call it a "pass guarantee" (ROADMAP rule) [C].
  - This ties revenue to the north star, "learners pass" [R: fairness norms, Kahneman, Knetsch & Thaler 1986].
- **All-Access subscription (later):** an in-app reminder 7 days before renewal, a one-tap link to cancel, and a pause option [R: auto-renewal laws, Play policy].
- **One purchase works on web and phone through the account.**

## Measures that show the model is not harming learning
These are recorded on the device, and nothing is tracked. Totals across learners come only from beta testers who choose to share a summary.

1. **Paywall views during a session or mock: 0.**
   - A hard invariant, enforced by a unit test and an on-device counter.
2. **Reviews done on time** (due reviews done within 1 day of their due date): no drop after the free pool runs out, after purchase, or in the 3 weeks before expiry.
3. **Cramming index:** questions per day in the 14 days before expiry, compared with the learner's own median.
   - A ratio above 2 means the deadline is causing massed practice. Lengthen the window or change the expiry copy.
4. **Free learners reaching a readiness range** (40 or more answers): at least 60% of those who hit the free limit.
   - Shows the free tier allows an honest judgement of value.
5. **Free learners still reviewing 7 days after hitting the limit:** this should stay high, because their reviews are not locked.
6. **Unprompted paywall views per learner per week:** 1 or fewer.
7. **Copy lint in CI:** fails if any purchase string contains streak, plant, lose, last chance or an expiry countdown.
8. **Public signals:** refund rate under 5%, and store reviews that mention "paywall", "scam" or "renewal" trending to zero.
