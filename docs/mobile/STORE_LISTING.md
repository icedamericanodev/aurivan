# KaiSip — Store listing, first release (CISA)

> **Owner request (29 Oct 2026):** the revised marketing video and materials must feature the plant's form change, "The Turning". See `docs/MARKETING_PLAN.md`.

Ready-to-paste copy for App Store Connect and Google Play Console.

**Release version: 2.0.0, "The KaiSip launch"** (6 Nov 2026; the Google Play closed-test build). It is 2.0.0, not 1.0.0, because backups and sync refuse data stamped by a newer version and testers already hold 1.5x saves.

**Revised 5 Nov 2026 against mobile 1.54.3** (claim-by-claim check of the app code): the app's own names are used (Drills, Questions to revisit, Mistake journal, Eliminate two); widgets, reminders, study notes, principles, the exam guide, final review week, plant forms and badges are now listed; the brand line is **"Know why the best answer wins."** (owner decision after a trademark clearance check, 5 Nov 2026; see `TRADEMARK_CLEARANCE.md`). It replaces "Grow the judgment the exam rewards." (same day) and "Think like an IS auditor.", and it stays true when other certifications ship, because every one is a "choose the best answer" exam. The "GROW DEEP ROOTS" heading is now "REMEMBER WHAT YOU LEARN": "Grow Deep Roots" is a live US education trademark. The screenshots predate mobile 1.50 to 1.53 and are re-shot in the closed-test build session.
Voice: Grove, warm, calm and credible, like a senior colleague who already passed.
Brand source: `mobile/src/content/brand.ts`. Compliance source: `docs/mobile/ARCHITECTURE.md` §6.

**Guardrails for every field (check them before you paste):**
- Never state or hint at the number of questions. Say "practice questions across all 5 CISA domains".
- Never promise a pass. Readiness is always "an estimate".
- Keep "CISA" and "ISACA" out of the app name, icon and developer name. Use them only to describe the exam, with the trademark notice.
- Only CISA is available. Never name other certifications or imply they are available now. If a field needs to say more are planned, use only the owner's line: "Starting with CISA. More certifications later." (as in the app's About).
- No hype words ("ultimate", "guaranteed", "best", "#1").
- Use the app's own names for features (Drills, Questions to revisit, Mistake journal, Eliminate two). Recheck the copy against the app before each release; features are renamed.
- Keep the brand line certification-neutral ("Know why the best answer wins."). A role line such as "Think like an IS auditor." fits CISA only. "Best" here is the exam's own instruction, not a claim about the app.
- Never use "Small sessions. Deep roots." or "Grow deep roots" in any copy or metadata ("deep roots" is crowded in education trademarks; `TRADEMARK_CLEARANCE.md`). The backup line is "Every answer teaches the why."

Character counts below are exact for the short fields (® counts as 1). Long fields are approximate. Check them in the console's counter before you submit.

---

## 1. Apple App Store

### App name (30): 29/30

```
KaiSip: Cyber & IT Audit Prep
```

### Subtitle (30): 27/30

```
Practice for the CISA® exam
```

### Promotional text (170): 164/170

You can edit this field at any time without a new build.

```
Calm, focused CISA® practice for busy professionals. Learn the principle behind every answer, study in short sessions, and see an honest, estimated readiness range.
```

### Keywords (100): 100/100

```
auditor,cybersecurity,governance,risk,controls,compliance,quiz,certification,study,mock,test,infosec
```

- There are no spaces and no repeats. The field leaves out the words already in the name and subtitle (kaisip, it, audit, exam, prep, practice, cisa), because Apple already indexes those.
- "isaca" is left out on purpose. Guideline 2.3.7 warns against packing keywords with third-party trademarks. CISA already appears descriptively in the subtitle.
- If you need room, drop `infosec` and use `itgc` (97/100).

### Description (4000): about 2,825/4000

```
Know why the best answer wins.

KaiSip helps IT auditors, security and risk professionals prepare for the CISA® exam in short, calm sessions that fit around work. Every answer teaches the principle behind it, so you learn to choose the best answer, not just one that sounds right. Starting with CISA. More certifications later.

PRACTICE THAT TEACHES
• Original practice questions across all 5 CISA domains
• A clear explanation for every answer, including why the tempting choices fall short
• Exam-style tips on every question: Eliminate two, Final two and Exam cue
• Coach me hints when you want a nudge before you commit
• Exam-mindset principles that show how an auditor thinks, each with its own practice set

SEE THE PATH
• Today: a short daily plan that shows what to study next, and why it matters
• A guided path, topic by topic: learn it, practise it, then mix it
• An estimated readiness range, so you can see where your points are
• An exam-date countdown, a final review week and a calm exam-day moment

REMEMBER WHAT YOU LEARN
• Questions to revisit come back before they fade
• A mistake journal where you tag the slip behind each miss, then get the drill for your most common one
• Study notes for every topic, short lessons and key terms
• Save questions and add your own notes
• A question bank you can browse by domain and topic

DRILLS THAT BUILD EXAM SKILL
• Snare Spotter: find the answer built to fool you, then the best one
• Signpost: read the word that decides which true answer wins
• Call It First: name the principle before you see the options
• More drills open as you practise

STAND TALL ON EXAM DAY
• Full mock exams weighted like the real exam, plus shorter mini mocks
• A guide to sitting the exam: booking, exam day and results
• A share card to mark your progress with your study group

A PLANT THAT GROWS WITH YOU
• Grow a plant as you study, drawn like a page from a field guide
• It changes form as your knowledge takes root
• Badges for real milestones, with no leaderboards

MADE FOR REAL LIFE
• Works offline, on the commute or between meetings
• Gentle study reminders you set yourself
• No account and no sign-up. No data collected. Your progress stays on your phone, and a backup file you save yourself moves it to a new one.
• Report any question from where you see it. Fixes are listed in What's new.
• Light and dark themes, and calmer motion when your phone asks for it

A NOTE ON READINESS
Your readiness range is a study estimate, not a prediction of your exam result. KaiSip cannot promise a pass. It helps you practise with purpose and walk in prepared.

All practice questions are original and are not ISACA exam questions.
CISA® and ISACA® are registered trademarks of ISACA. KaiSip is not affiliated with or endorsed by ISACA.
```

### What's New

App Store Connect does not show this field on a version 1.0 submission. Use this text on the first update, or wherever the field appears. Google Play: paste it as the release notes of the 2.0.0 closed-test release ("The KaiSip launch"; it matches the app's own What's new).

```
The KaiSip launch. A new look across Today, Practice, Learn and You. Your plant grows as you study, with badges along the way. Drills each train one exam skill, and a glossary in Learn lets you search any term. A clearer study plan shows what to do next. A new page, How questions are made, explains how questions are drafted with AI tools and checked. AI can make mistakes, so please report anything that looks wrong. Many fixes for a smoother study session.
```

459 characters (limit 500).

The first-release text before the launch build, kept for an App Store 1.0 note if needed:

```
Welcome to KaiSip. This first release brings calm, focused practice for the CISA® exam: a daily plan, teaching tips on every question, questions to revisit, drills, full mock exams and an estimated readiness range. It works offline, with no account needed.
```

### Support URL

`https://<the website>/support.html` (the same site as `privacy.html` and `terms.html`). The page is titled "Help and contact". It shows the support address, what to include, quick answers and the not-affiliated line. Google Play: use certprep.support@gmail.com as the public developer contact email.

> **TODO (owner, after the website deploys):** replace `<the website>` here and in the App Review note below with the live https address, open it on a phone to check it loads, then paste the same URL into App Store Connect → Support URL. Apple 2.1(a) needs a working URL.

### Categories

- Primary: **Education**
- Secondary: **Productivity**

---

## 2. Google Play

### Title (30): 29/30

```
KaiSip: Cyber & IT Audit Prep
```

Chosen 29 Oct 2026 (owner: "IT Audit" alone is too narrow as KaiSip adds certifications; growth-marketer and app-store-compliance-reviewer agree). "Cyber" is accurate for a CISA-only app because Protection of Information Assets is cybersecurity content; "IT audit" is an exact search phrase KaiSip can win. Conditions: keep CISA® in the short description and the owner's line near the top of the full description until a second certification is live; never add "Certified" or "Cybersecurity Cert" to the title (too close to ISC2's "Certified in Cybersecurity"); check the length of any translated title (29/30 leaves no room); use the same name on the App Store.

### Short description (80): 78/80

```
Know why the best answer wins. CISA® exam prep for IT audit and cybersecurity.
```

It opens with the brand line (5 Nov 2026), then carries "CISA® exam" (the high-intent search, used only to name the exam, and never first), "IT audit" and "cybersecurity" (Play does not reliably match "cyber" to it) and the exam the title leaves out. "Works offline" moved to the full description. Previous text (29 Oct to 5 Nov): "Calm IT audit and cybersecurity practice for the CISA® exam. Works offline." Before that (22 Oct): "Practice for the CISA® exam: teaching tips, daily plan and spaced review." When ISC2 CC ships in the Play build, switch to "Calm cybersecurity and IT audit practice for the CISA® and ISC2® CC® exams." (75) and update the guardrail, the trademark notice and "all 5 CISA domains" in the same change; have app-store-compliance-reviewer confirm the first listing that names ISC2.

### Full description (4000): 2,832/4000

Its own text for Play (22 Oct 2026, revised 5 Nov 2026). It differs from the App Store text in three places: the beta line "free to use during the beta" (the same words as the beta invitation; never "free app", "completely free" or "free forever", because paid plans may come), home-screen widgets (Android only; the iPhone app has none), and the question-bank line (App Store only). Both descriptions carry the owner's line "Starting with CISA. More certifications later." and the same three drills (Snare Spotter, Signpost, Call It First; the rest open after 50 answers, `todaysDrill.ts`). Play indexes the full description for search, so these phrases already appear naturally: "CISA® exam", "IT auditors", "practice questions", "mock exams", "offline". Do not add keyword lists. Play's metadata policy rejects them.

"No data collected" in MADE FOR REAL LIFE is true only because the Play build ships with over-the-air updates off (owner decision, 22 Oct 2026; PLAY_LAUNCH.md B1 Option A). If store builds ever turn updates back on, change that line to "No account, no ads, no analytics. Your progress stays on your phone." and redo the Data safety form below.

When the beta ends, change the beta line (the owner decides the wording then).

```
Know why the best answer wins.

KaiSip helps IT auditors, security and risk professionals prepare for the CISA® exam in short, calm sessions that fit around work. Every answer teaches the principle behind it, so you learn to choose the best answer, not just one that sounds right. Starting with CISA. More certifications later.

KaiSip is free to use during the beta. No account, no ads.

PRACTICE THAT TEACHES
• Original practice questions across all 5 CISA domains
• A clear explanation for every answer, including why the tempting choices fall short
• Exam-style tips on every question: Eliminate two, Final two and Exam cue
• Coach me hints when you want a nudge before you commit
• Exam-mindset principles that show how an auditor thinks, each with its own practice set

SEE THE PATH
• Today: a short daily plan that shows what to study next, and why it matters
• A guided path, topic by topic: learn it, practise it, then mix it
• An estimated readiness range, so you can see where your points are
• An exam-date countdown, a final review week and a calm exam-day moment

REMEMBER WHAT YOU LEARN
• Questions to revisit come back before they fade
• A mistake journal where you tag the slip behind each miss, then get the drill for your most common one
• Study notes for every topic, short lessons and key terms
• Save questions and add your own notes

DRILLS THAT BUILD EXAM SKILL
• Snare Spotter: find the answer built to fool you, then the best one
• Signpost: read the word that decides which true answer wins
• Call It First: name the principle before you see the options
• More drills open as you practise

STAND TALL ON EXAM DAY
• Full mock exams weighted like the real exam, plus shorter mini mocks
• A guide to sitting the exam: booking, exam day and results
• A share card to mark your progress with your study group

A PLANT THAT GROWS WITH YOU
• Grow a plant as you study, drawn like a page from a field guide
• It changes form as your knowledge takes root
• Badges for real milestones, with no leaderboards

MADE FOR REAL LIFE
• Works offline, on the commute or between meetings
• Home-screen widgets and gentle study reminders you set yourself
• No account and no sign-up. No data collected. Your progress stays on your phone, and a backup file you save yourself moves it to a new one.
• Report any question from where you see it. Fixes are listed in What's new.
• Light and dark themes, and calmer motion when your phone asks for it

A NOTE ON READINESS
Your readiness range is a study estimate, not a prediction of your exam result. KaiSip cannot promise a pass. It helps you practise with purpose and walk in prepared.

All practice questions are original and are not ISACA exam questions.
CISA® and ISACA® are registered trademarks of ISACA. KaiSip is not affiliated with or endorsed by ISACA.
```

### Graphics

Made from `design-notes/brand-kaisip/store/` (re-render with `node design-notes/brand-kaisip/store/render.mjs`):
- **App icon:** `play-icon-512.png`, 512×512, 32-bit PNG with alpha, under 1 MB.
- **Feature graphic:** `feature-graphic-1024x500.png`, 1024×500, 24-bit PNG with no alpha. The lockup and "Know why the best answer wins." on the Grove forest green (5 Nov 2026; earlier "Grow the judgment the exam rewards." and "Think like an IS auditor."). No CISA or ISACA text.
- **Phone screenshots:** the six in `screenshots/` (section 3), 1080×1920, 24-bit PNG. **Stale:** taken before mobile 1.50 to 1.53 (4 tabs, Drills inside Practice, the new answer plate). Re-shoot before the closed test.

### Category

- **Education** (Play allows one category). Tags: Exam prep, Professional skills (or the closest available).

### App content answers (Play Console → Policy and programs → App content)

From `docs/mobile/PLAY_LAUNCH.md` section (d). These assume the owner's decision of 22 Oct 2026: the Play build ships with over-the-air updates OFF (Option A), so the app makes no network call of its own.

**Data safety (Option A).**
- "Does your app collect or share any of the required user data types?" → **No**. The remaining questions are skipped, and the listing shows "No data collected" and "No data shared".
- Why this is accurate:
  - With updates off, the Play build makes no network call.
  - Report a problem and Contact support open the learner's own email app with a draft: a user-initiated action.
  - The backup file and share cards go through the system share sheet, also user-initiated.
  - Reminders are local notifications; no push token is ever requested.
  - Android Auto Backup is the system's backup, not collection by the app.
  - The learner's first name stays on the phone.
- If store builds ever turn updates back on, this answer changes (PLAY_LAUNCH.md section (d), Option B: "Device or other IDs" collected).

**Other declarations.**

| Declaration | Answer |
|---|---|
| Privacy policy | https://kaisip.com/privacy |
| App access | "All functionality in my app is available without any access restrictions" |
| Ads | "No, my app does not contain ads" |
| Advertising ID | "No" (the AD_ID permission is blocked in `mobile/app.json` since mobile 1.40.1) |
| Government apps | No |
| Financial features | "My app doesn't provide any financial features" |
| Health apps | "My app does not have any health features" |
| News app | No |
| Target audience | **18 and over** only. "Could your store listing unintentionally appeal to children?" → No (if asked). Restrict Minor Access: leave off |

**Content rating (IARC questionnaire).**
- Email: certprep.support@gmail.com.
- Category: **Reference, News, or Educational**. The mini-games are exam drills, not the app's main purpose. If the reviewer reclassifies it as a game, the answers below don't change.
- Answer **No** to every question: violence, blood or gore; fear or horror; sexual content or nudity; profanity or crude humour; drugs, alcohol or tobacco; real or simulated gambling; hate or discrimination.
- Miscellaneous, all **No**: users can interact or exchange content; shares the user's location with other users; allows purchases of digital goods; unrestricted internet access (web browser or search engine); NFTs or digital assets (if asked).
- Expected result: ESRB Everyone, PEGI 3, USK 0, ClassInd L, Play "Everyone".
- Redo the questionnaire when the feedback board (user-generated content) ships (section 7.5). The accounts beta alone does not change it (section 7.3).

---

## 3. Screenshot captions (2–5 words each)

The Play set, in listing order. Files: `design-notes/brand-kaisip/store/screenshots/` (1080×1920, 24-bit PNG, light theme, demo data). Re-shoot with `SHOTS=store npm run shots -- <out_dir>` in `mobile/`, then copy the six files there.

| # | File | Screen | Caption | Words |
|---|---|---|---|---|
| 1 | `store-01-today.png` | Today (daily plan) | Know what to study next | 5 |
| 2 | `store-02-question.png` | A practice question | Choose the best answer | 4 |
| 3 | `store-03-answer.png` | The answer (since 1.43, Eliminate two and Final two sit behind Read more: open it before the shot) | Learn the why behind answers | 5 |
| 4 | `store-04-lesson.png` | A lesson | Short lessons, big ideas | 4 |
| 5 | `store-05-readiness.png` | Readiness report after mocks | An honest readiness estimate | 4 |
| 6 | `store-06-plant.png` | Your plant (botanical; a form change if the owner wants The Turning shown) | Watch your progress grow | 4 |

Screenshots must not show the bank size. The store shoot checks each screen's visible text for "<number> questions" and stops if it finds one. Today shows the learner's own numbers ("16 of 53 due", "200 answered"), which say nothing about the bank's size. Keep "CISA" out of the captions.

---

## 4. App Review note (App Store Connect → App Review Information → Notes)

```
Thank you for reviewing KaiSip.

- No login or account is needed. There is nothing to sign in to, so no demo account is required.
- All study data (progress, settings, exam date) is stored only on the device. The app collects no data and has no analytics or ads. Settings → Your data lets the user save a backup file through the system share sheet and restore it with the system file picker; the app never uploads it.
- The app works fully offline.
- Support: Settings → Help and feedback (also You → Get help or send feedback) opens the Help screen with Common questions, Contact support, Report a problem with the app and Suggest an idea, and shows certprep.support@gmail.com. "Report a problem" opens the user's own email app with a draft they can read and edit; the app itself sends nothing. If no email app opens, the message is shown to copy or share.
- Help and feedback also has: Common questions (bundled text), What's new (release notes for changes already in the app), and Your reports (a list kept only on the phone of reports the user started; it is included in the user's own backup file). Nothing in these screens uses the network.
- Report a problem appears under every answered question (practice and the mock review; not during a timed mock), every study note and lesson step, and each missed card in a game's round recap.
- Support URL: https://<the website>/support.html

To reach a mock exam:
1. On first launch, tap "Get started", then "Continue", then "Start my first questions".
2. Open the Practice tab.
3. Scroll to "Mock exams" and tap "Mini mock" (short) or "Full mock".

CISA® is a registered trademark of ISACA and appears only to describe the exam. KaiSip is not affiliated with or endorsed by ISACA, and all practice questions are original.
```

---

## 5. Rationale

- **Target keywords.** "IT audit exam prep" goes in the name. It is generic and safe to own, and it ranks for searches that mention no brand. "CISA exam" goes in the subtitle and short description. That is the high-intent search, and here it is used only to describe the exam.
- **Learner pain.** These are working professionals who study on their phone in 10-minute gaps, often on a commute with patchy data (Philippines, India, Middle East). They fear memorising answers without understanding them. The copy leads with "short, calm sessions", "teaches the principle" and "works offline", and it treats readiness as an honest estimate. That builds trust with a sceptical, audit-minded audience.
- **Privacy as a feature.** "No account, no data collected" is uncommon in exam-prep apps and matches the Apple privacy label ("Data Not Collected"). Keep the two in sync if any SDK is added in Phase 2.

## 6. A/B variants

Apple Product Page Optimization can test screenshots, icon and preview video, but not the name or subtitle. Test caption sets there. Test text in Play's Store listing experiments.

| Field | Control (A) | Variant (B) | Hypothesis |
|---|---|---|---|
| iOS subtitle (change with a version update) | Practice for the CISA® exam (27) | CISA® exam practice, offline (28) | Same as above, measured as conversion before and after |
| Name (later, only if data supports it) | KaiSip: Cyber & IT Audit Prep (29) | (none planned) | Title chosen 29 Oct 2026 for the multi-certification roadmap; revisit only if store data shows a problem |
| Screenshot 1 caption | Know what to study next | Know why the best answer wins. | A concrete benefit first beats the brand line for cold traffic |
| Feature graphic line | Know why the best answer wins. (30) | Every answer teaches the why. (29) | A plain feature promise may convert cold traffic better than a positioning line |

Success metric: store listing conversion rate (visitors to installs), read at 90% confidence and at least 7 days per test.

**Retired (22 Oct 2026): Play short description variant B** ("CISA® exam practice that teaches the why. Daily plan, spaced review, offline."). It starts with "CISA®", which reads like a product name (trademark review, PLAY_LAUNCH.md section 6 (ii)). Keep variant A. Do not test a short description that starts with CISA or ISACA.

## 7. Accounts beta on Google Play (DRAFT, not in effect until the accounts build)

Owner decision (27 Oct 2026): optional sign-in with Google or an 8-digit
email code, progress synced between the app and kaisip.com, the feedback
board OFF. These answers replace the "No data collected" answers in
section 2 **in the same release as** the first build with accounts on, and
the published privacy, terms and delete-account pages (web v13). Until
then section 2 stays true. Plan: `ACCOUNTS_BETA_PLAN.md` §5. Re-read every
answer against the shipped build before submitting.

### 7.1 Data safety (Play Console → App content → Data safety)

**Data collection and security**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS only) |
| Which methods of account creation does your app support? | **OAuth** (Google) and **Username and other authentication** (email and a one-time code). Not "Username and password": there are no passwords |
| Delete account URL | `https://kaisip.com/delete-account` |
| Do you provide a way for users to request that some or all of their data is deleted, without deleting their account? | **Yes**: Settings → Account → Delete synced progress (also on the delete-account page) |
| Independent security review | No |

**Data types.** Every row: **collected**, **not shared**, **not processed
ephemerally**, **optional** ("Users can choose whether this data is
collected": only with an account, which is optional).

| Category › Data type | Purposes | What it is in KaiSip |
|---|---|---|
| Personal info › Email address | App functionality, Account management | The sign-in address |
| Personal info › User IDs | App functionality, Account management | The account id |
| Personal info › Name | Account management | Google sign-in passes the learner's Google name (and a profile-picture link) to our sign-in system, which stores it with the account. KaiSip doesn't show or use it. Declared to be safe; ask `app-store-compliance-reviewer` if you'd rather not *(verify)* |
| App activity › App interactions | App functionality | Synced progress: answers (right or wrong, how sure, how long), reviews, mocks, study days and streak, game levels |
| App activity › Other user-generated content | App functionality | The notes a learner writes on questions, and "Your reports" (which questions they reported, why and when), synced with progress |
| App activity › Other actions | App functionality | Saved questions, notes read, lessons done, badges, the plant, the exam date |
| Device or other IDs | App functionality | The random install id sent with each sync (not a hardware or advertising id; a new one is made before a different account syncs from the device, when the learner removes their progress from it, and when they delete their account) |

**Not collected** (answer No): location, financial info, health and
fitness, messages, photos and videos, audio, files and docs, calendar,
contacts, web browsing, app info and performance (no crash reporting, no
analytics). The IP address seen in ordinary request logs is not declared
as a data type *(verify against Play's current guidance)*. The email-code
human check (Cloudflare Turnstile) runs on kaisip.com in the browser, not
in the app.

**Why "not shared":** Supabase (database and sign-in), Resend (sends the
codes) and Cloudflare (website, backups) process data for us as service
providers, which Play does not count as sharing. Google is the sign-in
provider the learner chose.

### 7.2 App access (Play Console → App content → App access)

Choose **"All or some functionality in my app is restricted"** and add one
instruction set:

- **Name:** Optional account (sync)
- **Instructions** (paste):

> Every study feature works without an account: tap "Continue without an
> account" on the first screen, or skip the sign-in step. Signing in is
> optional and only adds syncing progress between the app and the KaiSip
> website. To review it: open You → Settings → Account and tap "Continue
> with Google", then sign in with any Google account (or the test account
> below). The app returns to Settings showing the account and "Sync this
> phone". To delete the account afterwards: Settings → Account → Delete
> account (you will be asked to sign in again first). The email option
> sends an 8-digit code to an inbox you can read, so please use Google.

- **Username / Password:** recommended: leave the "any Google account"
  instruction alone *(verify that Play accepts it)*. If Play asks for
  credentials, Sky makes a dedicated Google account for reviewers (not a
  personal one), adds its address and password here, and deletes its
  KaiSip account after each review.

Check the menu path against the shipped build before pasting: the account
screens and the onboarding step are built in the mobile ticket.

### 7.3 Other App content answers that change

| Declaration | Answer for the accounts build |
|---|---|
| Privacy policy | `https://kaisip.com/privacy` (the v13 page with the account section) |
| Data deletion | In the app (Settings → Account → Delete account) and `https://kaisip.com/delete-account` |
| Target audience | Unchanged: **18 and over**. Accounts are for 16 and over (privacy policy and terms) |
| Content rating (IARC) | Unchanged while the board is off: learners can't see each other's content. Redo it when the board ships (7.5) |
| Ads, Advertising ID, financial, health, news, government | Unchanged (section 2) |

### 7.4 What stays true from section 2

- Section 5's "No account, no data collected" line becomes "An account is
  optional; without one, nothing leaves your phone."
- The store description doesn't need to mention accounts. If it does, say
  "optional", and never "pass guaranteed".

### 7.5 Later (not for the beta): Apple, and the feedback board

Kept from the Phase 6–8 drafts for when they ship.

**Apple privacy label (App Privacy), when the iPhone app has accounts
(with Sign in with Apple, guideline 4.8).**
- Contact Info › Email Address: linked to the user, App Functionality, not tracking.
- Contact Info › Name: only if a sign-in provider's name is stored *(verify)*.
- Identifiers › User ID: linked, App Functionality, not tracking.
- Identifiers › Device ID (the random install id sent with each sync): linked, App Functionality, not tracking.
- Usage Data › Product Interaction (synced study progress: answers and how long each took, study days, game levels): linked, App Functionality, not tracking.
- User Content › Other User Content ("Your reports" and the notes on questions, synced with progress; and the feedback board when it ships: posts, comments, the board name, reports and appeals): linked, App Functionality, not tracking.
- Data is encrypted in transit; users can request deletion (in the app, and at the delete-account URL). Settings → Account → Delete synced progress deletes the synced copy without deleting the account.

**App Review note, accounts paragraph (Apple).**
"Accounts are optional: every study feature works signed out. Sync is
optional too and off until the learner turns it on in Settings → Account →
Sync this phone, after a preview of what will change. Settings → Account →
Delete synced progress removes the synced copy without deleting the account;
Settings → Account → Delete account deletes the account in the app. No push
notifications. Demo access: [owner decision]."

**The feedback board** (adds to both stores' answers when it ships):
- Data safety / privacy label: the board's posts, comments, board name,
  reports and appeals (Other user-generated content), votes and follows
  (Other actions / Product Interaction).
- App Review note (Apple 1.2, 2.3.1(a)): "You → Help and feedback →
  Feedback board (also Settings → Feedback board) is a board where learners
  post ideas, app problems, content concerns and questions about the app,
  vote and comment. Before the first post, comment or vote, a learner must
  sign in and agree to the community guidelines (version-stamped, zero
  tolerance for abuse and for real exam questions: [community guidelines
  URL]). Filters: word lists, a check against the app's own practice
  questions, and new members' posts wait for a person. Every post and
  comment has a ⋯ menu with Report post or comment, Report {name} (the
  member) and Block {name}; blocked learners' content disappears at once and
  they can't comment on the blocker's posts. We review reports within 24
  hours; contact: certprep.support@gmail.com (shown at the foot of the
  board). Staff moderate in the app (Moderation, staff accounts only: [demo
  staff access, or "staff-only, not part of review"]). Demo learner account
  with board access: [owner decision]."
- Age rating: if other learners can read posts (read scope `signed_in` or
  `everyone`), Apple's questionnaire answers "Social Media" yes, which rates
  the app **13+ (16+ in Australia)**; with `author_staff` re-ask
  `app-store-compliance-reviewer`. Google Play: a **new IARC questionnaire**
  ("users can interact or exchange content: yes", "shares user-generated
  content: yes", with the moderation answers above). Check the Australian
  under-16 social media rules with counsel before enabling the board there.
