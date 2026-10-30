# Store screenshots and feature graphic (with the Turning)

Store name: **KaiSip: Cyber & IT Audit Prep**. Voice: calm, credible, like a senior colleague who already passed.
Rules: captions are 2–5 words, no "CISA" in captions, no question count on any image, readiness is "an estimate".
The current six captions live in `docs/mobile/STORE_LISTING.md` section 3. This file proposes the next set.

---

## 1. How captions get onto the images

Neither store has a caption field. A caption only shows if it is drawn on the image. Today's six files are plain app screens with no caption on them.

Recommended: **frame every screenshot the same way.** A 1080×1920 image on Grove paper (#F3F1EA), the caption at the top (about 320 px band, dark ink #17231B), the optional sub-line under it in a smaller size, and the app screen below, scaled to fit (never stretched).

- This also solves a size problem. The forms harness shots are 786×1704 (a 393×852 phone at 2×). That is taller than Play allows (the long side may be at most twice the short side). On a framed 1080×1920 canvas they fit.
- Building the framed images (a small render script like `design-notes/brand-kaisip/store/render.mjs`) is a follow-up for `brand-logo-designer` or `mobile-app-engineer`. Not part of this pack.
- If you'd rather keep plain screens, the Turning stills must be re-shot at store size: add a `store-07-turning` and `store-08-final-choice` shot to the store harness (a maintainer change, later).

---

## 2. The recommended set (8 screenshots, listing order)

Play allows up to 8 phone screenshots; the App Store up to 10. The first three matter most: they show in search results.

| # | Capture file | Screen | Caption | Words | Optional sub-line | Status |
|---|---|---|---|---|---|---|
| 1 | `store-01-today.png` | Today, the daily plan | Know what to study next | 5 | A short plan that fits around work | Keep |
| 2 | `store-02-question.png` | A practice question | Think like an IS auditor. | 5 | Original IT audit practice questions across all 5 domains | Keep caption, new sub-line |
| 3 | `store-03-answer.png` | The answer, with the tips | Learn the why behind answers | 5 | Eliminate, Final two and Exam cue on every question | Keep |
| 4 | `store-04-lesson.png` | A lesson | Short lessons, big ideas | 4 | Cybersecurity and audit ideas, in plain words | Keep caption, new sub-line |
| 5 | `store-05-readiness.png` | Readiness report after mocks | An honest readiness estimate | 4 | A range, not a promise | Keep |
| 6 | `store-06-plant.png` (re-shoot) | Your plant | Grows only when you study | 5 | It never wilts while you're away | **Changed** |
| 7 | `footage/turning-oak-formIV-light-end.png` (see below) | Your plant, the learning fact and the new form's name | Real learning, a new form | 5 | The screen shows what you learned first | **New** |
| 8 | `forms-look-final-choice-light.png` | Look: the final-form choice | Choose its final form | 4 | 13 plants, each with its own final shape | **New** |

Word counts: 1 Know/what/to/study/next. 2 Think/like/an/IS/auditor. 3 Learn/the/why/behind/answers. 4 Short/lessons/big/ideas. 5 An/honest/readiness/estimate. 6 Grows/only/when/you/study. 7 Real/learning/a/new/form. 8 Choose/its/final/form.

### Which screenshot carries the Turning

**Screenshot 7.**
- **Available today:** `footage/turning-oak-formIV-light-end.png`, the last frame of the real Form III → IV Turning (made by `tools/capture.sh`). It shows "A new form", the learning fact, "The Broadcrown Oak" and its description. Crop it above "What grows it next", so the domain percentages under the divider stay out of the store image.
- **Later (for the iPhone set):** the same end frame grabbed from the phone recording (`TURNING_VIDEO_PLAN.md` section 2).
- **Don't use `forms-reveal-after-light.png`.** It is the settled Whip Oak screen, without the learning fact, and its step list shows "Your study estimate … reaches 55%" right under the plant.
- The Form IV app line includes "Every domain reached 65%". That's fine as app footage, but the caption and sub-line must never echo it or call it a pass signal.

### What changes and why

- **1–5 stay.** They already sell the study loop in the Grove voice. Only two sub-lines change, so "IT audit" (screenshot 2) and "cybersecurity" (screenshot 4) back up the store title once each, in plain sentences, not as a keyword list.
- **6 changes** from "Watch your progress grow" to "Grows only when you study". The new line says the honest rule (growth comes only from study) and sets up screenshot 7. Also **re-shoot store-06**: the current file predates plant forms (it doesn't show the form name) and its step list shows readiness percentages next to the plant. After the re-shoot, check the visible part leads with the plant and its form name.
- **7 is new:** the Turning, the owner's request. The caption pairs the learning with the form, so the plant reads as earned.
- **8 is new:** the Form IV choice shows there's something personal at the end, without any collecting.
- **Tip for the demo data:** if the harness can show a Protection of Information Assets question on screenshot 2 or a security lesson on screenshot 4, the "Cyber" in the title is backed up by the picture itself. Ask `mobile-app-engineer` (later).

### App Store (iPhone, later)

- The current 1080×1920 shots are not iPhone-shaped. When the iPhone app exists, shoot iPhone-shaped screens. Required sizes are for the 6.9" or 6.5" display (for example 1290×2796 or 1242×2688). **Verify the exact sizes in App Store Connect.**
- Same captions, same order. No "beta" and no "Google Play" on any App Store image.

---

## 3. A/B test for screenshot 1

| | Control (A): benefit first | Variant (B): Turning first |
|---|---|---|
| Screenshot 1 | `store-01-today.png`, "Know what to study next" | The Turning still, "Real learning, a new form" |
| Then | the order above | Today moves to #2, the rest shift down one, the final-form choice stays last |
| Hypothesis | People searching "IT audit exam prep" want to see the study plan first. | A striking, unusual image stops the scroll and lifts installs from people browsing. |

- Run on Play's Store listing experiments (graphics) first, and on Apple Product Page Optimization once the iPhone app is live.
- Metric: store listing conversion (visitors to installs), at least 7 days, 90% confidence.
- Run one test at a time. `STORE_LISTING.md` section 6 also lists a screenshot-1 caption test; finish one before starting the other.

---

## 4. Feature graphic brief (Google Play)

| Item | Spec |
|---|---|
| Size and file | 1024×500, 24-bit PNG, **no alpha** (or JPEG). |
| Source | `design-notes/brand-kaisip/store/feature-graphic.html`, rendered by `node design-notes/brand-kaisip/store/render.mjs` from the repo root (it also flattens the PNG). The update to the HTML is a follow-up for `brand-logo-designer`. |
| Background | Grove forest green, lit from the top: #245A40 to #1E4A34 (as now). |
| Left block (x about 80–460) | The Kasama lockup (light on dark, `design-notes/brand-kaisip/png/lockup_dark.png`), with the line under it in Fraunces italic. |
| Right block (x about 620–940) | A **Form IV plant still**, the plant only (no app text): the Broadcrown Oak, cut out from `forms13-oak-formIV-dark.png` or `forms-oak-formIV-growth6-dark.png`, or better, rendered on a transparent background. Alternate: the Gold-rain Narra (`forms13-narra-formIV-dark.png`), a warm nod to learners in the Philippines. |
| Safe zones | Keep all words and the plant at least 60 px from every edge (Play can crop or lay controls over edges). Keep the **center** (about x 460–620) clear of words: when a promo video is set, Play puts a play button in the middle. |
| Not allowed | No "CISA", no "ISACA", no question count, no pass words, no "beta" (the graphic outlives the beta), no device frame (not needed). |

**One line of copy (pick one):**
1. **"Study for real. Watch it grow."** (6 words). Recommended: it pairs with the plant and says growth is earned.
2. "Grows only when you study." (5 words). Clear, but it repeats screenshot 6.
3. "Think like an IS auditor." (5 words). The current line; keep it if you want the graphic to stay about the study, not the plant.

### Feature graphic A/B
Control: the current graphic (lockup and "Think like an IS auditor."). Variant: lockup, "Study for real. Watch it grow." and the Broadcrown Oak. Test with Play's Store listing experiments, at least 7 days.

---

## Rationale

- **Target keyword:** "IT audit" and "cybersecurity" support the title in two sub-lines; "IS auditor" stays as the brand line. No keyword lists (Play's metadata policy rejects them).
- **Learner pain:** busy professionals who fear memorizing without understanding, and doubt progress meters. The set moves from "what to study" to "why the answer is right" to "an honest estimate", then shows the plant as proof of real learning, not a reward you can buy.
