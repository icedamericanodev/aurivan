# Store screenshots and feature graphic (with the Turning)

Store name: **KaiSip: Cyber & IT Audit Prep**. Voice: calm, credible, like a senior colleague who already passed.
Rules: captions are 2–5 words, no "CISA" in captions, never show the question-bank size, and describe readiness as an estimate. The documented timed-mock screenshot may show its 150-question session length (`STORE_LISTING.md` section 3).
**Status, 9 Nov 2026:** this is the historical 30 Oct Turning-led proposal, not the current upload set. The later eight-shot set and order in `docs/mobile/STORE_LISTING.md` section 3 (6 Nov, PR #229) supersede it: answer, Today, Snare Spotter, timed mock, readiness, Mistake journal, lesson, plant. Keep that set unless a new experiment is explicitly approved. The video can still feature the Turning without displacing those study screens.

---

## 1. How captions get onto the images

Neither store has a caption field. A caption only shows if it is drawn on the image. The older six files in `screenshots/` and the legacy `SHOTS=store` harness are uncaptioned. The current eight-shot set is captioned; its reviewed deliverables and status are recorded in `docs/mobile/STORE_LISTING.md`.

Historical proposal: **frame every screenshot the same way**, exported as 24-bit PNG with no alpha, or JPEG (Play; verify). A 1080×1920 image on Grove paper (#F3F1EA), the caption at the top (about 320 px band, dark ink #17231B), the optional sub-line under it in a smaller size, and the app screen below, scaled to fit (never stretched).

- This also solves a size problem. The forms harness shots are 786×1704 (a 393×852 phone at 2×). That is taller than Play allows (the long side may be at most twice the short side). On a framed 1080×1920 canvas they fit.
- The captioned eight-shot set has since been prepared. Do not treat rebuilding the older six as the current release task; re-shoot the documented set when the app changes.
- Historical implementation idea only: extra Turning and final-choice shots are not part of the current eight-shot release set.

---

## 2. Historical alternative (not the current listing order)

Play allows up to 8 phone screenshots; the App Store up to 10. The first three matter most: they show in search results.

| # | Capture file | Screen | Caption | Words | Optional sub-line | Status |
|---|---|---|---|---|---|---|
| 1 | `store-01-today.png` | Today, the daily plan | Know what to study next | 5 | A short plan that fits around work | Keep |
| 2 | `store-02-question.png` | A practice question | Think like an IS auditor. | 5 | Original IT audit practice questions across all 5 domains | Keep caption, new sub-line |
| 3 | `store-03-answer.png` | The answer, with the tips | Learn the why behind answers | 5 | Eliminate, Final two and Exam cue on every question | Keep |
| 4 | `store-04-lesson.png` | A lesson | Short lessons, big ideas | 4 | Cybersecurity and audit ideas, in plain words | Keep caption, new sub-line |
| 5 | `store-05-readiness.png` | Readiness report after mocks | An honest readiness estimate | 4 | A range, not a promise | Keep |
| 6 | `store-06-plant.png` (re-shoot) | Your plant | Grows only when you study | 5 | It never wilts while you're away | **Changed** |
| 7 | `footage/turning-oak-formIII-light-end.png` (see below) | Your plant, the learning fact and the new form's name | Real learning, a new form | 5 | The screen shows what you learned first | **New** |
| 8 | `forms-look-final-choice-light.png` | Look: the final-form choice | Choose its final form | 4 | 13 plants, each with its own final shape | **New** |

Word counts: 1 Know/what/to/study/next. 2 Think/like/an/IS/auditor. 3 Learn/the/why/behind/answers. 4 Short/lessons/big/ideas. 5 An/honest/readiness/estimate. 6 Grows/only/when/you/study. 7 Real/learning/a/new/form. 8 Choose/its/final/form.

### Which screenshot carries the Turning

**Screenshot 7.**
- **Use:** `footage/turning-oak-formIII-light-end.png`, the last frame of the real Form II → III Turning (made by `tools/record_turning.mjs` with growth 4). It shows "A new form", the recall fact ("You got 15 questions right a week or more after you last saw them, and you know 25% of the outline."), "The Standard Oak", its description and "Grows into the Broadcrown Oak at Elder." Crop it above the divider, so the steps below stay out of the store image.
- **Why Form III and not Form IV:** a store screenshot is permanent and seen by everyone. The Form IV fact line starts "Every domain reached 65%", which reads like a score even without a caption. The Form III line has no score in it. The grand Form IV Turning stays in the video, where it plays as app footage.
- **Later (for the iPhone set):** the same end frame grabbed from the phone recording (`TURNING_VIDEO_PLAN.md` section 2).
- **Don't use `forms-reveal-after-light.png`.** It is the settled Whip Oak screen, without the learning fact, and its step list shows "Your study estimate … reaches 55%" right under the plant.
- Whatever frame you use, the caption and sub-line never echo a percentage or call the fact a pass signal.

### Original rationale relative to the old six-shot set

- **1–5 stay.** They already sell the study loop in the Grove voice. Only two sub-lines change, so "IT audit" (screenshot 2) and "cybersecurity" (screenshot 4) back up the store title once each, in plain sentences, not as a keyword list.
- **6 changes** from "Watch your progress grow" to "Grows only when you study". The new line says the honest rule (growth comes only from study) and sets up screenshot 7. Also **re-shoot store-06**: the current file predates plant forms (it doesn't show the form name) and its step list shows readiness percentages next to the plant. After the re-shoot, check the visible part leads with the plant and its form name.
- **7 is new:** the Turning, the owner's request. The caption pairs the learning with the form, so the plant reads as earned.
- **8 is new:** the Form IV choice shows there's something personal at the end, without any collecting.
- **Tip for the demo data:** if the harness can show a Protection of Information Assets question on screenshot 2 or a security lesson on screenshot 4, the "Cyber" in the title is backed up by the picture itself. Ask `mobile-app-engineer` (later).

### App Store (iPhone, later)

- The current 1080×1920 shots are not iPhone-shaped. When the iPhone app exists, shoot iPhone-shaped screens. Required sizes are for the 6.9" or 6.5" display (for example 1290×2796 or 1242×2688). **Verify the exact sizes in App Store Connect.**
- Same captions, same order. No "beta" and no "Google Play" on any App Store image.

---

## 3. Historical Turning-first experiment (not scheduled)

| | Control (A): benefit first | Variant (B): Turning first |
|---|---|---|
| Screenshot 1 | `store-01-today.png`, "Know what to study next" | The Turning still, "Real learning, a new form" |
| Then | the order above | Today moves to #2, the rest shift down one, the final-form choice stays last |
| Hypothesis | People searching "IT audit exam prep" want to see the study plan first. | A striking, unusual image stops the scroll and lifts installs from people browsing. |

- Keep this as an unscheduled alternative. The current documented first comparison is Today first versus answer first in `STORE_LISTING.md`; do not launch an additional experiment from this plan.
- Metric: store listing conversion (visitors to installs), at least 7 days, 90% confidence.
- Run one test at a time. `STORE_LISTING.md` section 6 also lists a screenshot-1 caption test; finish one before starting the other.

---

## 4. Historical feature graphic alternative (Google Play)

| Item | Spec |
|---|---|
| Size and file | 1024×500, 24-bit PNG, **no alpha** (or JPEG). |
| Source | `design-notes/brand-kaisip/store/feature-graphic.html`, rendered by `node design-notes/brand-kaisip/store/render.mjs` from the repo root (it also flattens the PNG). A change to this HTML was part of the historical proposal and is not scheduled. |
| Background | Grove forest green, lit from the top: #245A40 to #1E4A34 (as now). |
| Left block (x about 80–460) | The Kasama lockup (light on dark, `design-notes/brand-kaisip/png/lockup_dark.png`), with the line under it in Fraunces italic. |
| Right block (x about 620–940) | A **Form IV plant still**, the plant only (no app text): the Broadcrown Oak, cut out from `forms13-oak-formIV-dark.png` or `forms-oak-formIV-growth6-dark.png`, or better, rendered on a transparent background. Alternate: the Gold-rain Narra (`forms13-narra-formIV-dark.png`), a warm nod to learners in the Philippines. |
| Safe zones | Keep all words and the plant at least 60 px from every edge (Play can crop or lay controls over edges). Keep the **center** (about x 460–620) clear of words: when a promo video is set, Play puts a play button in the middle. |
| Not allowed | No "CISA", no "ISACA", no question count, no pass words, no "beta" (the graphic outlives the beta), no device frame (not needed). |

**Current brand line:** “Know why the best answer wins.” Keep the current feature graphic and line. The options below are historical alternatives, not approved replacements:

1. **"Study for real. Watch it grow."** (6 words). Originally proposed because it pairs with the plant and says growth is earned.
2. "Grows only when you study." (5 words). Clear, but it repeats screenshot 6.
3. "Think like an IS auditor." (5 words). An older line, superseded on 5 Nov 2026; do not restore it as the brand line.

### Feature graphic A/B
Historical control: the old graphic (lockup and "Think like an IS auditor."). Historical variant: lockup, "Study for real. Watch it grow." and the Broadcrown Oak. This historical experiment is not scheduled; retain the current graphic unless a later review approves a change.

---

## Rationale

- **Target keyword:** "IT audit" and "cybersecurity" support the title in two sub-lines; the current brand line remains “Know why the best answer wins.” No keyword lists (Play's metadata policy rejects them).
- **Learner pain:** busy professionals who fear memorizing without understanding, and doubt progress meters. The set moves from "what to study" to "why the answer is right" to "an honest estimate", then shows the plant as proof of real learning, not a reward you can buy.
