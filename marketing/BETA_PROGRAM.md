> **Owner decisions (22 Oct 2026).** Reward: 6 months of KaiSip Premium free once paid features exist, plus opt-in thanks and credit in the app. Platforms: Android beta via the Play closed test; iPhone users use kaisip.com and join a waitlist. Inbox: certprep.support@gmail.com owns the Google Form and Sheet. **Still open (decide before Premium):** ship accounts no later than Premium (Play promo codes cap at 90 days), and choose one way to check Premium across web and stores (`marketing/monetization-plan.md` vs `docs/mobile/ARCHITECTURE.md`).

# KaiSip beta-tester program (spec v1)

**Problem, in one sentence.** KaiSip needs at least 12 real Android testers to stay in a Google Play closed test for 14 days in a row before it can go public on Play, and the owner wants honest feedback that makes the app better for CISA candidates.

**Who it's for.** CISA candidates who follow the owner on Instagram, Reddit or Threads. Mostly Android users. iPhone users join a waitlist and use kaisip.com for now.

**Score.** Impact 4 (Google requires this before launch, and testers catch wrong answer keys, which directly hurts pass rates) × Confidence 5 (the rule is fixed and the method is proven) ÷ Effort 2 (mostly free tools and no code; one small screen later) = **10**.

**Decision: build now, in three small slices.**
- Slice A, now, no code: the sign-up form, the tester list, one new paragraph in the privacy policy, the posts.
- Slice B, before the public Play launch: the thank-you screen.
- Slice C, on the day Premium launches: grant the 6 months.

The strongest reason: there is no public Play launch without this.

---

## 1. Sign-up flow

**Tool: Google Form → Google Sheet (private) → Play Console tester email list.** All free.
- Use the Play Console email list (paste the emails in) rather than a Google Group. A group needs each tester to accept an invite, and testers missing that step is a common reason the 12-tester count quietly falls short.
- Up to about 2,000 addresses fit. One list for the whole closed test is enough.
- The Sheet is the single record. Never share it, and turn on 2-step verification on that Google account.

**Form settings.**
- Collect email by "Responder input", not "Verified". Verified forces a Google sign-in, which iPhone users may not have.
- Leave "Limit to 1 response" off.
- No file uploads.
- Use the KaiSip logo only. Never the ISACA logo.
- Never mention how many questions the app has.

**Form intro (top of the form):**
> Help test KaiSip, a free CISA exam-prep app, before it launches on Google Play. Testers get early access, a thank-you in the app if they want one, and 6 months of KaiSip Premium free once paid features launch (details below). KaiSip is independent and not affiliated with ISACA.

**Fields:**

1. **Email** (required). Helper text: "Android: use the Google account that's signed in to your Play Store. That's how Google lets you into the test."
2. **Which phone will you use?** (required): Android / iPhone / I'll use the website.
3. **Country** (required, short text). Why: to check the app is available where you are.
4. **When is your exam?** (optional): Not booked yet / Within 1 month / 1–3 months / 3–6 months / More than 6 months.
   - This asks for a time band instead of the exact date the owner asked for. It's less personal and just as useful for grouping testers.
5. **How did you find us?** (required): Instagram / Reddit / Threads / A friend / Other.
6. **Thank-you credit** (required, pick one):
   - "Show my name or handle in the app's Thank-you screen", plus a short text box: "Max 24 characters. No links, emails or rude words. We check every name before adding it."
   - "Keep me anonymous"
7. **Consent checkboxes:**
   - (required) "I'm 18 or older."
   - (required) "I've read the privacy notice below."
   - (required) "I understand the reward: my 6 free months of Premium start on the day Premium launches, not today. It's for testing and feedback, never for ratings or reviews."
   - (required) "You can email me about the beta: test invites, short surveys and updates. I can leave any time."
   - (optional, iPhone only) "Email me when the iPhone app is ready."
   - (shown as a reminder, no box) "Please never send us questions from the real exam."

**Branching (one section per phone type):**
- **Android →** "Thanks! Within 2 days you'll get an email with your test link. Tap 'Become a tester', then install KaiSip from Google Play. Please stay in the test for at least 14 days."
- **iPhone →** "The iPhone app isn't ready yet. Meanwhile, KaiSip works in your phone's browser at kaisip.com. You're on the list and will be among the first to know when the iPhone app is out." Never add these emails to the Play list.
- **Website →** the same message as iPhone, without the waitlist line.

**Privacy notice (short version, shown on the form):**
> **What we collect:** the answers on this form.
> **Why:** to add you to the Google Play test, email you about the beta, credit you if you asked, and give you the tester reward.
> **Where it's kept:** in the KaiSip maintainer's Google account (Google Forms and Sheets). Android testers' emails are also added to Google Play Console's tester list.
> **How long:** until your reward has been given and has ended, or until we confirm there won't be paid features. Then we delete it within 3 months.
> **To leave:** email certprep.support@gmail.com, or leave the test in Google Play. Leaving takes you off the list, and we can't give the reward to someone who isn't on it.
> We never sell it or use it for marketing.

**How this fits with "the app collects no data."**
- Google's Data safety form and Apple's privacy label describe what the app itself collects. The form is a separate web page that the owner runs outside the app, and the app never sends anything to it. So the app's "no data collected" answers stay true and nothing changes there.
- `/home/user/aurivan/privacy.html` does need a new paragraph. It covers the website and "related pages", and its intro says there are no accounts. Add a section 3e after 3d, with this text (it also covers the public thank-you name):

> **3e. Beta tester sign-up (optional).** If you sign up to test KaiSip before launch, you fill in a Google Form run by the maintainer, outside the app. It collects your email address, your phone type, your country, your exam timing (optional), how you found us, and the name or handle you'd like credited (or none). We use it to add you to the Google Play test, to email you about the beta, to credit you if you asked, and to give you the tester reward. It is stored in the maintainer's Google account, and Android testers' emails are also added to Google Play Console's tester list. If you ask to be credited, the name you chose is shown to everyone in the app's Thank-you screen; ask us any time and it is removed in the next app update. We keep sign-up data until your reward has been given and has ended, or until we confirm there will be no paid features, then delete it within 3 months. To leave or ask anything, email certprep.support@gmail.com.

Also add one row, "Google Forms and Sheets: beta sign-up and surveys", to the third-party services table, and update the "Last updated" date.

**Mailing rule: always BCC testers.** Never put tester addresses in To or CC. Testers must not see each other's emails.

---

## 2. Honoring "6 months free"

| Option | Works on Android | Works on iPhone (later) | Works on the website | Verdict |
|---|---|---|---|---|
| (a) Store promo / offer codes | **No.** Google subscription promo codes give at most 90 days. One-time codes are capped at 10,000 per subscription per quarter, and unused codes expire. | Yes. Apple offer codes can give 6 or 12 months free, up to 1,000,000 redemptions per app per quarter. | No | Rejected. It can't give 6 months on Android, and does nothing on the website. |
| **(b) A free grant tied to the tester's email, once accounts exist** | Yes | Yes | Yes | **Recommended** |
| (c) A redeem code typed into the app | Policy risk | Apple doesn't allow apps to unlock features by their own means, such as license keys | Yes | Rejected. A real risk of Apple rejection, and a code system to build and protect. |

**Recommendation: (b).** The database already has the slot for it: the `public.entitlements` table in `/home/user/aurivan/supabase/migrations/20261005000000_init_mobile_sync.sql`. It accepts `source = 'manual'` and an `expires_at` date, and only the server can write to it.

**How it works on the day Premium launches (day P0):**
1. For each eligible tester, the owner runs a one-off script. It adds a row with `entitlement = 'premium'`, `active = true`, `source = 'manual'`, `expires_at = P0 + 6 months`, matched to the account created with the tester's sign-up email.
   - Testers who haven't made an account yet are held as "pending". The grant applies the first time that email signs in, with the same end date.
2. The app (and the website, once it reads accounts) treats Premium as active if either a paid store purchase or a manual grant is active. That makes it one check across every platform.
   - If RevenueCat is used, a "promotional entitlement" with an end date is a fine alternative. Pick one place to keep grants, not both.
3. Nothing renews or charges at the end, because no store billing is involved. Testers never enter a card.
4. **Email mismatch** (for example, Sign in with Apple's hidden "private relay" address): the tester replies from their sign-up email, and the owner moves the grant to the account they actually use.

**Limits to plan for:**
- **Accounts must be on by P0.** The roadmap currently puts paid features (Phase 2) before accounts (Phase 3). If Premium ships first on Android without accounts, the only store tool gives at most 90 days per code, which falls short of the promise. The owner should decide now: accounts no later than Premium.
- **iPhone:** offer codes are a backup only if the compliance reviewer rules against server-side grants on iPhone.
- **Website:** the current pricing plan for the website (license keys, no accounts) conflicts with this. Settle on one way of checking Premium before building it.

**What the owner must record now** (Sheet tab "Testers", private):
- Tester ID (T001…), email, phone type, country
- Form date, date the invite was sent
- Date confirmed as testing: their first reply, survey answer or report. Play Console does not show each tester's opt-in date.
- Credit choice, approved credit text (Y/N)
- Number of feedback items
- **Qualifies (Y/N)**
- Grant date, grant end date, date they left

**Who qualifies (recommended rule, say it plainly on the form and in the welcome email):**
- joined the Android closed test before the public Play launch and stayed in it for 14 days, **or**
- sent at least one genuine piece of feedback during the beta from the app or the website. This keeps iPhone and website-only testers eligible.

Never make it depend on reviews or star ratings.

---

## 3. In-app credit: "Thank you, beta testers"

**Where:**
- Settings → Help and about → a new row "Thank you, beta testers", just below "About KaiSip".
- It opens its own screen, `mobile/src/app/credits.tsx`. Keep the About sheet in `/home/user/aurivan/mobile/src/app/settings.tsx` for the vision only.
- Hide the row while the list is empty.

**What it shows:**
- Title "Thank you, beta testers".
- One line: "These people tested KaiSip before launch and told us what to fix. The app is better because of them."
- Names in A–Z order (case-insensitive), as plain text. No links, no @-mentions you can tap, no photos, no scores, no join order.
- Last line, only if anyone chose to stay anonymous: "…and N more who preferred not to be named."
- Large text and screen readers must work. No celebration animation.

**Opt-in only:** a name appears only if the tester ticked "Show my name" and the owner approved it. Anonymous is the default when the box was left empty.

**How names get added (no backend):**
- A content file, `mobile/src/content/credits.ts`, exporting `BETA_TESTERS` (a fixed list of names) and `ANONYMOUS_TESTERS` (a number).
- It holds names only, never emails, and is never generated from the Sheet automatically.
- It is JavaScript only, but store builds have over-the-air updates turned off (`docs/mobile/SECURITY_GATES.md` Gate 1). So adding or removing a name reaches Play users only in the next Play build (a new release on the closed test or production track). Test builds outside the store may still get it over the air.
- Add a test that every name passes the same cleaning rules as the in-app first-name field (`/home/user/aurivan/mobile/src/engine/displayName.ts`): up to 24 characters, no links or emails, no hidden control characters. Have `mobile-app-engineer` check this doesn't trip the existing test that limits which files may read the learner's own name.
- Mirroring the list on kaisip.com is optional, later.

**Moderation, by the owner, before every addition:**
1. Reject: slurs, sexual or abusive words, rude words in any language you can check (paste unknown words into a translator), names of public figures, brands, ISACA or "official", anything that looks like a link, email or phone number.
2. If rejected, list them as anonymous and email them: "We couldn't use that name. Reply with another, or we'll keep you anonymous."
3. Remove on request within 7 days, in a new Play build (store builds have no over-the-air updates). If no release is due, make a small one for the removal.
4. Before each release, glance over the handles again. A handle can change hands or meaning.

---

## 4. Wording guardrails (use these sentences word for word)

- **Reward:** "As thanks for testing, every beta tester gets 6 months of KaiSip Premium free once paid features launch. Your 6 months start on the day Premium launches, not the day you sign up. We'll email you when it's ready. No card needed, and nothing renews."
- **Not for reviews:** "This reward is for testing and feedback only. It never depends on rating or reviewing KaiSip, and what you say never changes it."
  - Don't ask testers for Play reviews during the beta.
  - After launch, any review prompt goes to everyone equally and is never linked to the reward. Google's policy bans offering anything in exchange for ratings or reviews.
- **If Premium never launches:** "KaiSip is free today. If paid features never launch, there's nothing to unlock: you keep using the free app like everyone else, and you're still credited."
- **No pass guarantee:** "KaiSip helps you practise and see where you stand. It can't promise a pass." Never use "guaranteed", "you'll pass" or a pass rate.
- **Name and trademark:** call it a "CISA exam-prep app", add "Not affiliated with ISACA", and never mention the question count.
- **Free tier:** the reward adds something for testers. It never takes anything from free users.

---

## 5. Feedback loop

**How testers send feedback** (all existing, nothing new to build):
- In the app: "Report a problem" on every question, plus "Suggest an idea" and "Contact support" in Help. Each opens the tester's own email app, addressed to certprep.support@gmail.com, with the item's code and the app version filled in.
- Google Play's private tester feedback.
- A reply to the welcome email.

The welcome email asks: "Please tell us anything confusing, and especially any answer you think is wrong."

**Gmail setup:** a filter that labels mail from tester addresses as "Beta" (`from:(a@x.com OR b@y.com …)`). Update it each time you add a batch of testers.

**Weekly triage (about 45 minutes, same day each week).** Sheet tab "Beta log": date, tester ID, type (bug / wrong answer key / confusion / idea), screen or question code, severity, status, release it was fixed in.
- **S1 (fix this week):** crash, lost progress, or a wrong answer key (confirm with `qa-question-tester` first).
- **S2 (next release):** blocks a task.
- **S3 (batch them):** annoying, but the tester can carry on.
- **Idea:** park it, and re-rank monthly with `product-manager`.

Reply to every tester within 72 hours, even if it's just "Got it, thanks". This matches the 72-hour triage target in the product vision.

**What to measure.** The app has no analytics and stays that way for the beta.
- **Crash-free:**
  - Play Console's pre-launch report (free automated device tests) must show no crashes.
  - No crash reproducible from a tester report left open.
  - Android vitals, if a sample this small shows anything at all: stay well under Google's "bad behaviour" crash line. The roadmap's target is at least 99.5% crash-free.
- **Day-7 retention proxy:** a 3-question Google Form on day 7 and again on day 14:
  1. "How many of the last 7 days did you study in KaiSip?"
  2. "What's one thing that confused you?"
  3. "Will you keep using it?"
  - The proxy is the share of people answering on day 14 who studied at least one day in their second week. Target: at least 40%. Beta testers are keener than the public, so expect real-world numbers to be lower.
- **Top confusion points:** count the "confusion" entries in the log by screen, and keep a top-5 list each week.
- **Content trust:** zero confirmed wrong answer keys still open when the beta ends.

**Closing the loop:**
- Every fix goes in What's New, written as general benefits, in the app's existing tone.
- Testers who reported something already see "Things you reported were updated" in Help.
- Email the reporter "Fixed, thanks", plus a short BCC'd "Beta notes" email every two weeks.
- Every fix, JavaScript or native, needs a new build uploaded to the closed-test track: store builds have over-the-air updates turned off (`docs/mobile/SECURITY_GATES.md` Gate 1).

---

## 6. Timeline (T0 = the owner says "quality is ready")

| When | What |
|---|---|
| **Before T0** (no code, do any time) | Play developer identity verification finished; app created; Data safety answered "no data collected". `privacy.html` 3e paragraph live. Form, Sheet, Gmail label, welcome email, day-7 and day-14 surveys drafted. Post copy reviewed against section 4. |
| **T0** | Upload the signed build to Closed testing, create the tester email list, submit for review. Publish the form. Post on Instagram Story, Reddit (check each subreddit's self-promotion rules and say you're the founder) and Threads. Target 20 to 25 Android sign-ups, so the count stays above 12 if some drop out. |
| **T0 + about 2 to 7 days** | Closed test approved. Add the Android emails and send the welcome email (BCC) with the opt-in link. Keep adding sign-ups within 48 hours. |
| **C0** = the day the 12th tester is opted in | Google's 14-day clock starts. Keep the closed track running until production is approved; removing it can reset the clock. |
| **C0 + 7** | Day-7 survey. Weekly triage, every week from here. |
| **C0 + 14** | Day-14 survey. Exit check: at least 12 testers opted in for 14 days in a row; no open S1 issues; no open wrong answer keys; clean pre-launch report; retention proxy noted; owner happy. Then apply for production. Google asks about the test, so the Beta log is your answer. |
| **Production approved** | Release in stages. Thank-you screen goes live with the approved names (slice B). What's New thanks testers. Email testers: "We're live, thank you." No review request tied to the reward. |
| **Launch + 30 days** | Close the beta. Keep the Testers tab for the reward. Delete the survey answers you no longer need. |
| **iPhone app ready** (date not set) | Email the iPhone waitlist. Run a TestFlight beta with the same form, rules and reward. |
| **P0 = Premium launches** (accounts must already be on) | Run the grant (slice C). Email each tester with exact start and end dates. |
| **P0 + 6 months minus 14 days** | Reminder email: "Your free months end on [date]. Nothing will be charged." |
| **P0 + 6 months + 3 months** | Delete the tester list. Keep only anonymous counts. |

---

## 7. User stories

1. **As an Android CISA candidate who saw the post, I want to sign up in under 2 minutes and get a test link, so that I can study with KaiSip before launch.**
   - The form has 7 questions or fewer and works without a Google sign-in.
   - Android sign-ups are on the Play tester list and get the welcome email within 48 hours.
   - The confirmation states the reward rule and how to leave.
   - **Metric:** at least 12 testers opted in for 14 days in a row; at least 60% of Android sign-ups opt in.
2. **As an iPhone user, I want to know what I can do today, so that I'm not left waiting.**
   - Choosing iPhone shows the kaisip.com message.
   - The email is never added to the Play list.
   - Waitlist consent is recorded separately.
   - **Metric:** size of the iPhone waitlist (it decides when iPhone work starts).
3. **As a beta tester, I want to report a problem quickly and hear back, so that I trust my report mattered.**
   - A reply within 72 hours.
   - S1 issues fixed within 7 days.
   - The fix shows in What's New and as the "Things you reported were updated" line.
   - **Metric:** 100% of reports answered within 72 hours; zero open wrong answer keys at exit.
4. **As a tester who asked to be credited, I want to see my name in the app, so that I feel thanked.**
   - Only names that opted in and were approved appear, in A–Z order, as plain text.
   - The anonymous count is shown.
   - Removal within 7 days of asking.
   - **Metric:** zero moderation complaints; removal deadline met.
5. **As a tester when Premium launches, I want my 6 months to just appear, so that I don't pay or enter a card.**
   - A launch email gives the start and end dates.
   - Signing in with the sign-up email shows Premium on Android and the website (and iPhone once it exists).
   - Nothing is charged at the end.
   - There's a way to fix a mismatched email.
   - **Metric:** at least 70% of eligible testers claim within 60 days; zero billing complaints.

## 8. Hand to `app-store-compliance-reviewer`
- Server-side Premium grants on iPhone (Apple's in-app purchase rules) and on Google Play (payments policy).
- The reward-versus-reviews wording.
- Data safety staying "no data collected" (the form is outside the app).
- Publishing testers' names in the app.
- "Not affiliated with ISACA" on the form and posts.

---

**Files to look at:**
- `/home/user/aurivan/privacy.html` (add 3e and a services-table row)
- `/home/user/aurivan/supabase/migrations/20261005000000_init_mobile_sync.sql` (the `entitlements` table, which already accepts `source = 'manual'`)
- `/home/user/aurivan/mobile/src/app/settings.tsx` (where the new row goes)
- `/home/user/aurivan/mobile/src/engine/displayName.ts` (the name-cleaning rules to reuse)
- `/home/user/aurivan/marketing/monetization-plan.md` (conflicts with the mobile plan)
- `/home/user/aurivan/docs/mobile/ARCHITECTURE.md` (the roadmap order: paid features before accounts)

**Sources** (limits checked on 22 Oct 2026; re-check in the consoles before relying on them):
- [Google Play promo codes (Play Console Help)](https://support.google.com/googleplay/android-developer/answer/6321495)
- [Promo codes (Android developers)](https://developer.android.com/google/play/billing/promo)
- [RevenueCat: Google Play offers](https://www.revenuecat.com/docs/subscription-guidance/subscription-offers/google-play-offers)
- [Apple: set up subscription offer codes](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-subscription-offer-codes)
- [Apple: create offer codes for in-app purchases](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-offer-codes-for-in-app-purchases)
- [Apple: subscription pricing and offer durations](https://developer.apple.com/help/app-store-connect/reference/in-app-purchase-and-subscriptions-pricing-and-availability)
- [Google Play: testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
- [Android Authority: Play testing requirement](https://androidauthority.com/google-play-app-testing-requirement-3510580)
- [Android Developers Blog: incentivized ratings policy (2017)](https://android-developers.googleblog.com/2017/06/google-plays-policy-on-incentivized.html?hl=en)
- [Android Developers Blog: "In reviews we trust" (2018)](https://android-developers.googleblog.com/2018/12/in-reviews-we-trust-making-google-play.html?hl=en)
- [RevenueCat: promotionals](https://docs-origin.revenuecat.com/docs/dashboard-and-metrics/customer-history/promotionals)

I couldn't confirm that RevenueCat has a ready-made "six months" option for its free grants; its dashboard lets you set an end date instead.