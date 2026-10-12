# Aurivan — Store listing, first release (CISA)

Ready-to-paste copy for App Store Connect and Google Play Console.
Voice: Grove, warm, calm and credible, like a senior colleague who already passed.
Brand source: `mobile/src/content/brand.ts`. Compliance source: `docs/mobile/ARCHITECTURE.md` §6.

**Guardrails for every field (check them before you paste):**
- Never state or hint at the number of questions. Say "practice questions across all 5 CISA domains".
- Never promise a pass. Readiness is always "an estimate".
- Keep "CISA" and "ISACA" out of the app name, icon and developer name. Use them only to describe the exam, with the trademark notice.
- Only CISA is available. Do not mention future certifications.
- No hype words ("ultimate", "guaranteed", "best", "#1").

Character counts below are exact for the short fields (® counts as 1). Long fields are approximate. Check them in the console's counter before you submit.

---

## 1. Apple App Store

### App name (30): 27/30

```
Aurivan: IT Audit Exam Prep
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

- There are no spaces and no repeats. The field leaves out the words already in the name and subtitle (aurivan, it, audit, exam, prep, practice, cisa), because Apple already indexes those.
- "isaca" is left out on purpose. Guideline 2.3.7 warns against packing keywords with third-party trademarks. CISA already appears descriptively in the subtitle.
- If you need room, drop `infosec` and use `itgc` (97/100).

### Description (4000): about 2,300/4000

```
Master Modern Risk.

Aurivan helps IT auditors, security and risk professionals prepare for the CISA® exam in short, calm sessions that fit around work. Every answer teaches the principle behind it, so you grow the judgment the exam rewards, one ring at a time.

PRACTICE THAT TEACHES
• Original practice questions across all 5 CISA domains
• A clear explanation for every answer, including why the other choices fall short
• Exam-style tips on each question: Eliminate, Final two and Exam cue
• Coach me hints when you want a nudge before you commit

SEE THE PATH
• Today: a short daily plan that shows what to study next, and why it matters
• An estimated readiness range, so you can see where your points are
• An exam-date countdown, with a calm exam-eve check-in and an exam-day moment

GROW DEEP ROOTS
• Spaced review brings missed questions back before they fade
• A mistakes log keeps every miss in one place, so patterns become clear
• Short lessons on the ideas that matter most
• A question bank you can browse by domain and topic

GAMES THAT BUILD EXAM SKILL
• Snare Spotter: find the answer built to fool you, then the best one
• Signpost: read the word that decides which true answer wins
• Forecast: rate how sure you are, and learn when to trust it

STAND TALL ON EXAM DAY
• Full mock exams weighted like the real exam, plus shorter mini mocks
• Share cards to mark milestones with your study group

MADE FOR REAL LIFE
• Works offline, on the commute or between meetings
• No account and no sign-up. No data collected. Your progress stays on your phone, and a backup file you save yourself moves it to a new one.
• Report any question from where you see it. Fixes are listed in What's new.
• Light and dark Grove themes, designed for easy reading

A NOTE ON READINESS
Your readiness range is a study estimate, not a prediction of your exam result. Aurivan cannot promise a pass. It helps you practise with purpose and walk in prepared.


CISA® is a registered trademark of ISACA. Aurivan is not affiliated with or endorsed by ISACA. All practice questions are original and are not ISACA exam questions.
```

### What's New

App Store Connect does not show this field on a version 1.0 submission. Use this text on the first update, or wherever the field appears.

```
Welcome to Aurivan. This first release brings calm, focused practice for the CISA® exam: a daily plan, teaching tips on every question, spaced review, games, full mock exams and an estimated readiness range. It works offline, with no account needed.
```

About 250 characters.

### Support URL

`https://<the website>/support.html` (the same site as `privacy.html` and `terms.html`). The page is titled "Help and contact". It shows the support address, what to include, quick answers and the not-affiliated line. Google Play: use certprep.support@gmail.com as the public developer contact email.

> **TODO (owner, after the website deploys):** replace `<the website>` here and in the App Review note below with the live https address, open it on a phone to check it loads, then paste the same URL into App Store Connect → Support URL. Apple 2.1(a) needs a working URL.

### Categories

- Primary: **Education**
- Secondary: **Productivity**

---

## 2. Google Play

### Title (30): 27/30

```
Aurivan: IT Audit Exam Prep
```

### Short description (80): 73/80

```
Practice for the CISA® exam: teaching tips, daily plan and spaced review.
```

### Full description (4000): about 2,300/4000

Use the App Store description above unchanged. Play indexes the full description for search, so these phrases already appear naturally: "CISA® exam", "IT auditors", "practice questions", "mock exams", "offline". Do not add keyword lists. Play's metadata policy rejects them.

### Category

- **Education** (Play allows one category). Tags: Exam prep, Professional skills (or the closest available).

---

## 3. Screenshot captions (2–5 words each)

| # | Screen | Caption | Words |
|---|---|---|---|
| 1 | Welcome / vision | Master Modern Risk. | 3 |
| 2 | Today (daily plan) | Know what to study next | 5 |
| 3 | Question with tips revealed | Learn the why behind answers | 5 |
| 4 | Readiness range | An honest readiness estimate | 4 |
| 5 | Mistakes / spaced review | Every miss becomes a lesson | 5 |
| 6 | Games (Play tab) | Sharpen your exam judgment | 4 |

Screenshots must not show a question count. Use demo data (`npm run shots`) and check that no screen shows the bank size.

---

## 4. App Review note (App Store Connect → App Review Information → Notes)

```
Thank you for reviewing Aurivan.

- No login or account is needed. There is nothing to sign in to, so no demo account is required.
- All study data (progress, settings, exam date) is stored only on the device. The app collects no data and has no analytics or ads. Settings → Your data lets the user save a backup file through the system share sheet and restore it with the system file picker; the app never uploads it.
- The app works fully offline.
- Support: Settings → Help and feedback (also You → Get help or send feedback) opens the Help screen with Common questions, Contact support, Report a problem with the app and Suggest an idea, and shows certprep.support@gmail.com. "Report a problem" opens the user's own email app with a draft they can read and edit; the app itself sends nothing. If no email app opens, the message is shown to copy or share.
- Help and feedback also has: Common questions (bundled text), What's new (release notes for changes already in the app), and Your reports (a list kept only on the phone of reports the user started; it is included in the user's own backup file). Nothing in these screens uses the network.
- Report a problem appears under every answered question (practice and the mock review; not during a timed mock), every study note and lesson step, and each missed card in a game's round recap.
- Support URL: https://<the website>/support.html

To reach a mock exam:
1. On first launch, tap "Start my plan", then "Continue", then "Start studying".
2. Open the Practice tab.
3. Scroll to "Mock exams" and tap "Mini mock" (short) or "Full mock".

CISA® is a registered trademark of ISACA and appears only to describe the exam. Aurivan is not affiliated with or endorsed by ISACA, and all practice questions are original.
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
| Play short description | Practice for the CISA® exam: teaching tips, daily plan and spaced review. (73) | CISA® exam practice that teaches the why. Daily plan, spaced review, offline. (77) | Leading with "teaches the why" and "offline" lifts install conversion in markets with patchy data |
| iOS subtitle (change with a version update) | Practice for the CISA® exam (27) | CISA® exam practice, offline (28) | Same as above, measured as conversion before and after |
| Name (later, only if data supports it) | Aurivan: IT Audit Exam Prep (27) | Aurivan: IT Audit & Risk Prep (29) | Widens reach to risk professionals ahead of more certifications |
| Screenshot 1 caption | Master Modern Risk. | Know what to study next | A concrete benefit first beats the brand line for cold traffic |

Success metric: store listing conversion rate (visitors to installs), read at 90% confidence and at least 7 days per test.

## 7. Cloud release (DRAFT, not in effect until Phase 9)

Accounts (Phase 6), sync (Phase 7) and the feedback board (Phase 8) are
built and switched OFF. Nothing above changes until the owner's go-live
(Phase 9, proposed mobile 2.0.0).
Then swap these in, in the same release as the published privacy, terms and
delete-account pages. Section 5's "No account, no data collected" line and
the "Data Not Collected" label stay true for the OFF build only.

**Apple privacy label (App Privacy).**
- Contact Info › Email Address: linked to the user, App Functionality, not tracking.
- Identifiers › User ID: linked, App Functionality, not tracking.
- Identifiers › Device ID (the random install id sent with each sync): linked, App Functionality, not tracking.
- Usage Data › Product Interaction (synced study progress: answers and how long each took, study days, game levels): linked, App Functionality, not tracking.
- User Content › Other User Content ("Your reports": which questions the learner reported, why and when, synced with progress; and the feedback board: posts, comments, the board name, reports and appeals): linked, App Functionality, not tracking.
- Usage Data › Product Interaction also covers the board's votes and follows: linked, App Functionality, not tracking.
- Data is encrypted in transit; users can request deletion (in the app, and at the delete-account URL). Settings → Account → Delete synced progress deletes the synced copy without deleting the account.

**Google Play Data safety.**
- Personal info › Email address; App activity › App interactions (answer timings, study days and streak, game levels) and Other actions (synced progress; the board's votes and follows); App activity › Other user-generated content ("Your reports"; the board's posts, comments, board name, reports and appeals); Device or other IDs (the install id). All collected, not shared, App functionality, optional (only with an account), encrypted in transit, deletable in the app and at the delete-account URL. The synced copy can also be deleted on its own (Delete synced progress) without deleting the account.
- Re-read both forms against the shipped build before submitting (security review P7 S8): the shared-device "remove from this phone" path and the install id renewal changed in the Phase 7 review.

**App Review note, added paragraph.**
"Accounts are optional: every study feature works signed out. Sync is
optional too and off until the learner turns it on in Settings → Account →
Sync this phone, after a preview of what will change. Settings → Account →
Delete synced progress removes the synced copy without deleting the account;
Settings → Account → Delete account deletes the account in the app. No push
notifications. Demo access:
[owner decision, PHASE6_8 §9 #8]."

**App Review note, feedback board paragraph (Apple 1.2, 2.3.1(a)).**
"You → Help and feedback → Feedback board (also Settings → Feedback board)
is a board where learners post ideas, app problems, content concerns and
questions about the app, vote and comment. Before the first post, comment
or vote, a learner must sign in and agree to the community guidelines
(version-stamped, zero tolerance for abuse and for real exam questions:
[community guidelines URL]). Filters: word lists, a check against the app's
own practice questions, and new members' posts wait for a person. Every
post and comment has a ⋯ menu with Report post or comment, Report {name}
(the member) and Block {name}; blocked learners' content disappears at once
and they can't comment on the blocker's posts. We review reports within 24
hours; contact: certprep.support@gmail.com (shown at the foot of the
board). Staff moderate in the app (Moderation, staff accounts only:
[demo staff access, or "staff-only, not part of review"]). Demo learner
account with board access: [owner decision]."

**Age rating (Phase 9, with the read-scope decision).**
- The board is user-generated content with reporting, blocking and
  moderation. If the read scope is `signed_in` or `everyone` (other learners
  read posts), it is a feed shared with many users: Apple's questionnaire
  answers "Social Media" yes, which rates the app **13+ (16+ in
  Australia)**. With `author_staff` (only the author and the team read a
  post) it is closer to private feedback: re-ask
  `app-store-compliance-reviewer` before answering.
- Google Play: file a **new IARC questionnaire** when the board ships
  (features changed): "users can interact or exchange content: yes",
  "shares user-generated content: yes", with the moderation answers above.
- Check the Australian under-16 social media rules with counsel before
  enabling the board there (compliance review P8, go-live checklist).
