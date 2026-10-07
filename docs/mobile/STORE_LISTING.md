# Aurivan — Store listing, first release (CISA)

Ready-to-paste copy for App Store Connect and Google Play Console.
Voice: Grove, warm, calm and credible, like a senior colleague who already passed.
Brand source: `mobile/src/content/brand.ts`. Compliance source: `docs/mobile/ARCHITECTURE.md` §6.

**Guardrails for every field (check them before you paste):**
- Never state or hint at the number of questions. Say "practice questions across all 5 CISA domains".
- Never promise a pass. Readiness is always "an estimate".
- Keep "CISA" and "ISACA" out of the app name, icon and developer name. Use them only to describe the exam, with the trademark notice.
- Only CISA is available. At most say "More certifications are planned."
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

Aurivan helps IT auditors, security and risk professionals prepare for the CISA® exam in short, calm sessions that fit around work. Every answer teaches the principle behind it, so you grow the judgement the exam rewards, one ring at a time.

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
• Trap Spotter: find the answer built to fool you
• Priority Lens: read FIRST, BEST and MOST like an examiner
• Calibrated Sprint: stake your confidence and learn to trust it

STAND TALL ON EXAM DAY
• Full mock exams weighted like the real exam, plus shorter mini mocks
• Share cards to mark milestones with your study group

MADE FOR REAL LIFE
• Works offline, on the commute or between meetings
• No account and no sign-up. No data collected. Your progress stays on your phone.
• Light and dark Grove themes, designed for easy reading

A NOTE ON READINESS
Your readiness range is a study estimate, not a prediction of your exam result. Aurivan cannot promise a pass. It helps you practise with purpose and walk in prepared.

More certifications are planned.

CISA® is a registered trademark of ISACA. Aurivan is not affiliated with or endorsed by ISACA. All practice questions are original and are not ISACA exam questions.
```

### What's New

App Store Connect does not show this field on a version 1.0 submission. Use this text on the first update, or wherever the field appears.

```
Welcome to Aurivan. This first release brings calm, focused practice for the CISA® exam: a daily plan, teaching tips on every question, spaced review, games, full mock exams and an estimated readiness range. It works offline, with no account needed.
```

About 250 characters.

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
| 6 | Games (Play tab) | Sharpen your exam judgement | 4 |

Screenshots must not show a question count. Use demo data (`npm run shots`) and check that no screen shows the bank size.

---

## 4. App Review note (App Store Connect → App Review Information → Notes)

```
Thank you for reviewing Aurivan.

- No login or account is needed. There is nothing to sign in to, so no demo account is required.
- All study data (progress, settings, exam date) is stored only on the device. The app collects no data and has no analytics or ads.
- The app works fully offline.

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
