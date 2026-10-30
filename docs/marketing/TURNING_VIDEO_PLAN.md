# The Turning: video plan (30 s and 60 s)

Owner request (29 Oct 2026, `docs/MARKETING_PLAN.md` section 1): feature the plant's form change, "The Turning", in the store preview, the website hero and social clips.

This file has:
1. What the Turning is, in one paragraph
2. How to record it (the recipe)
3. The 30 s cut (store preview, social)
4. The 60 s cut (YouTube and Play promo, social)
5. Versions: silent autoplay, crops, music
6. The website hero loop
7. Claims checklist (check every cut against it)

Voice: calm and credible, like a senior colleague who already passed. US spelling on screen.

---

## 1. The Turning, in one paragraph

The plant grows only from real study. When it reaches a new form, the Your plant screen plays the Turning once. **It leads with the learning fact, on screen from the first frame.** Then warm light gathers, the old and new shapes take turns in gold, the light lifts, the species' seeds or petals rise, and at Form IV a ring draws itself once. Then the form's name settles in ("The Broadcrown Oak"). Lengths: 2.4 s (Form I to II), 3.0 s (II to III), 3.6 s (III to IV, the grand one). With Reduce Motion on, it is a 120 ms cross-fade.

The app's fact lines (on screen in the footage):
- Form II: "You answered 10 or more questions in every domain, without a hint or a game, and you know 5% of the outline."
- Form III: "You got 15 questions right a week or more after you last saw them, and you know 25% of the outline."
- Form IV: "Every domain reached 65%, you know 60% of the outline, you got 30 questions right a week later, and you sat a full, timed mock."

**Hero line for supers and voiceover: "30 questions right, a week later."** The Form IV app line also says "Every domain reached 65%". That reads like a score, so never put it in a super or the voiceover, never zoom in on it, and never frame it as a sign of passing. The app footage may show it as it is.

### Why we never speed up the Turning (safety)

The Turning changes at most 2.5 times a second. The safety limit for people who are sensitive to flashing is 3 a second. If you speed it up, cut it into a strobe, or loop it back to back, you can push it over that limit. So in every edit:
- play it at real speed (1.0x), start to finish;
- no speed ramps, no fast cuts inside it, no flash or white-out transitions;
- do not punch in tight on the gold light (a bigger flashing area is riskier);
- never play two Turnings back to back without a calm hold (at least 1 s) between them.

---

## 2. Recording recipe (real app footage only)

There are two sources of real footage:

| Source | What it is | Use it for |
|---|---|---|
| **Web-build capture (ready now)** | `tools/capture.sh` runs the app's own web build at phone size, plays the real Turning and rebuilds it at exactly real speed, at full sharpness. Starter clips are in `footage/`. | Social posts, the website hero, and the edit's animatic (cut the whole video against it before the phone shoot). |
| **Phone recording (sections 2a, 2b)** | A screen recording of the store build on a real phone. | The App Store preview and the Play promo video. Apple wants previews captured from the app on the device, so don't use the web-build clips there. |

The harness stills and frame strips (see `README.md`) are for storyboards, screenshots and the species glimpse.

### 2a. Android (do this first: the beta is on Android)

**Phone.** An Android phone with a 1080-pixel-wide screen (a recent Pixel is ideal). Install the same closed-test build testers get from Google Play.

**Before you record.**
1. Do Not Disturb on. Airplane mode on (KaiSip works offline, and no messages can pop in).
2. Battery above 50%. Phone not charging (no charging icon).
3. Settings → Display: default font size and display size. Turn off "Show taps".
4. Clean status bar (optional, most phones). Connect by USB with debugging on, then run:
   ```bash
   adb shell settings put global sysui_demo_allowed 1
   adb shell am broadcast -a com.android.systemui.demo -e command enter
   adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
   adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
   adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
   ```
   Turn it off afterwards with `adb shell am broadcast -a com.android.systemui.demo -e command exit`. If your phone ignores these, crop the status bar out in the edit.
5. In KaiSip: plant name **"Kai"**, species **oak**, botanical look. Light theme first. Dark theme as the alternate take.

**Seeded demo progress (how to make the Turning happen on camera).**
- The Turning plays only when the plant crosses into a new form on that phone. A plant restored from a backup never replays its Turning (it gets a quiet note instead). So the plant must cross the line on camera.
- Ask `mobile-app-engineer` for two demo backup files (not part of this pack, verify they exist before the shoot):
  - `kai-demo-crown`: Kai at Crown (Form III), with every Form IV step done except the last one or two questions;
  - `kai-demo-sprout`: Kai at Sprout (Form I), one step short of Form II (for the 60 s cut's small Turning, optional).
  - Demo data only. It must not show the number of questions in the bank.
- On the phone: Settings → Your data → restore the demo file. Answer the last question(s) so Kai reaches the new form.
- Today then shows "It grows into a new form: see it in Your plant." Open Your plant.
  - If the Turning plays straight away, good.
  - If you see the calm button "See Kai's new form", tap it. It plays the full Turning. (This is normal: the app allows one big moment per session.)

**Record.**
- Built-in Screen recorder (no audio), or by USB:
  ```bash
  adb shell screenrecord --bit-rate 20000000 --time-limit 60 /sdcard/kai-turning-light.mp4
  adb pull /sdcard/kai-turning-light.mp4
  ```
- Record the whole study loop in one session too: Today, a question, the answer and its tips, Today's review, a lesson, a readiness range, Your plant, the Look screen's final-form choice.
- Hold still for 2 s before and after each action. Scroll slowly. You can always trim; you can't add calm.

**Retakes.** The Turning plays once per form per phone. To shoot it again: Android Settings → Apps → KaiSip → Storage → Clear storage, then restore the demo file again. Take 3 good takes in light, 2 in dark.

**Master format.** 1080×1920 portrait (9:16), 30 fps, H.264. Many phones record 1080×2400. Crop the status bar and the navigation bar off, then fit to 1080×1920. Never stretch.

### 2b. iPhone (later, when the iPhone app exists)

- A real iPhone for the final App Store preview (Apple wants footage captured on the device). The simulator is fine for drafts. Same name, species and demo files.
- Simulator status bar: `xcrun simctl status_bar booted override --time "9:41" --batteryState charged --batteryLevel 100`
- Simulator recording: `xcrun simctl io booted recordVideo --codec h264 kai-turning-ios.mp4`
- App preview size for the large iPhones: **886×1920 portrait**. Export the App Store cut natively at 886×1920, with supers laid out for that width; never crop it from the 1080×1920 master.
- Apple limits: **15 to 30 seconds**, 30 fps, up to 3 previews per language. Include a stereo AAC track (256 kbps, 44.1 or 48 kHz), silent if needed. Poster frame (chosen at upload, shown before anyone presses play): the 0:00–0:03 shot (Kai at rest, "It grows only when you study."), never a frame with the Form IV fact.

### 2c. Which cut goes where

| Cut | Use |
|---|---|
| 30 s | App Store preview (iPhone footage, App Store end card). Also Threads, Instagram, LinkedIn. |
| 60 s | Social, website, YouTube. For the Play promo, upload a second copy with the Play listing end card (public or unlisted, ads off, not age-restricted, embeddable; verify). |
| 6–10 s loop | Website hero, silent (section 6). |

---

## 3. The 30 s cut

Hook: curiosity about the plant. Total 29 s, so it fits Apple's 30 s limit with room to spare.

| Time | Picture (source) | Super (on screen) | Voiceover (optional) | Sound | Honest-claim check |
|---|---|---|---|---|---|
| 0:00–0:03 | Recording: Your plant, Kai as the Standard Oak at rest. Storyboard still: `forms-oak-formIII-growth5-light.png` | It grows only when you study. | "This plant grows only when you really learn." | Music fades in, soft piano | True: growth comes only from study. No pass link. |
| 0:03–0:07 | Recording: Today, the daily plan. Still: `store-01-today.png` | A short plan for today | "KaiSip gives you a short plan each day." | Music | No bank size on screen (demo numbers are the learner's own). |
| 0:07–0:13 | Recording: open a practice question, pause, tap an option, open the answer. Still: `store-02-question.png` | Think like an IS auditor. | "Every answer explains why." | Music | Questions are original. No "real exam questions" claim. |
| 0:13–0:17 | Recording: scroll slowly to the three tips. Still: `store-03-answer.png` | Eliminate. Final two. Exam cue. | (none) | Music | Tip names match the app. |
| 0:17–0:19.5 | Recording: Today's review row, then a missed question back for review | Misses come back the next day. | "And what you miss comes back." | Music | Spaced review is real. No memory-science promise. |
| 0:19.5–0:21.5 | Recording: Your plant opens. The Form IV learning fact is already on screen. Hold. | 30 questions right, a week later. | "Thirty questions right, a week later." | Music drops to a single held note | Hero line only. The "65%" in the app line is not echoed, not zoomed. |
| 0:21.5–0:25.1 | Recording: the full Form III → IV Turning at **1.0x**, untouched. Storyboard: `forms-reveal-grand-light.png` (8 frames) | (keep the super from the row above, or none) | (silence) | Music swells gently, no sound effect hits | Real speed. No cuts inside it. Under 2.5 changes a second. |
| 0:25.1–0:26 | Recording: "The Broadcrown Oak" settles in. Hold. | (none: the app's own words) | "Kai grows into a new form." | Music resolves | Says "grows into a new form". |
| 0:26–0:29 | End card (see below) | See end card | "KaiSip. Practice for the CISA exam." | Music out | Trademark line on screen. |

### End cards

**Social, website and YouTube-only uploads (not the Play listing video):**
```
[KaiSip lockup]
Practice for the CISA® exam
Free to use during the beta
Android beta on Google Play · kaisip.com

(small) Not affiliated with or endorsed by ISACA®. Readiness is an estimate.
```

**Play listing video only** (the YouTube video linked in Play Console; it outlives the beta, and Play's preview guidance discourages price or "free" claims, store names and time-sensitive text (verify)). Upload it as its own unlisted YouTube video; its last voiceover line is "KaiSip. Practice for the CISA exam.":
```
[KaiSip lockup]
Practice for the CISA® exam

(small) Not affiliated with or endorsed by ISACA®. Readiness is an estimate.
```

**App Store preview only** (Apple doesn't allow other store names or beta wording in App Store media):
```
[KaiSip lockup]
Practice for the CISA® exam

(small) Not affiliated with or endorsed by ISACA®.
```

### 30 s voiceover script (paste into your voice tool)

This plant grows only when you really learn.
KaiSip gives you a short plan each day.
Every answer explains why.
And what you miss comes back.
Thirty questions right, a week later.
Kai grows into a new form.
KaiSip. Practice for the CISA exam.

(The voice says "CISA" without the ®. The ® is on the end card.)

---

## 4. The 60 s cut

Hook: the pain of memorizing without understanding. Adds the species glimpse and the Form IV choice. Total 60 s.

| Time | Picture (source) | Super (on screen) | Voiceover (optional) | Sound | Honest-claim check |
|---|---|---|---|---|---|
| 0:00–0:04 | Recording: a practice question, still on screen, no tap yet | Memorizing isn't knowing. | "Memorizing answers only gets you so far. The exam asks for judgment." | Music in, low | Speaks to the pain. No promise. |
| 0:04–0:09 | Recording: Today, the daily plan. Still: `store-01-today.png` | A short plan for today | "KaiSip gives you a short plan each day, sized for the gaps between meetings." | Music | Demo numbers only, no bank size. |
| 0:09–0:16 | Recording: tap an option, open the answer. Still: `store-02-question.png` | Think like an IS auditor. | "Every question is original, and every answer explains why." | Music | True: original questions, every answer explained. |
| 0:16–0:23 | Recording: slow scroll through Eliminate, Final two, Exam cue. Still: `store-03-answer.png` | Eliminate. Final two. Exam cue. | "Three tips on every question show you how to rule options out, and how to choose between the last two." | Music | Tip names match the app. |
| 0:23–0:28 | Recording: Today's review row, then a short lesson. Still: `store-04-lesson.png` | Misses come back the next day. | "What you miss comes back the next day, then again after longer gaps." | Music | True: a miss returns at the start of the next day (Leitner boxes). No memory claim. |
| 0:28–0:32 | Recording: the readiness report after mocks. Still: `store-05-readiness.png` | An estimate, not a promise | "Mocks and practice build a readiness range. It's an estimate, never a promise." | Music | Readiness = "an estimate". No pass rate. |
| 0:32–0:36 | Recording: Your plant, Kai as the Standard Oak at rest | It grows only when you study. | "And then there's Kai. It grows only from real study, and it never wilts while you're away." | Music lifts a little | True: no decay, no plant alerts. |
| 0:36–0:41 | Species glimpse, curated 4 (stills, light theme). Each: Form III still, 0.4 s dissolve, Form IV still. About 1.2 s per species, no hard cuts. Files: `forms13-narra-formIII/IV-light.png`, `forms13-bamboo-…`, `forms13-cherry-blossom-…`, `forms13-lotus-…` | Small name under each: Gold-rain Narra · Moon-gate Bamboo · Cascade Cherry · Open Lotus | (none) | Music | Stills from the app's own renderer. The dissolve is an edit, so never caption it as the in-app animation. (Web-build stills: fine for YouTube and social; acceptable in the Play promo, verify.) |
| 0:41–0:44 | Recording: Your plant opens on the Form IV learning fact. Hold so it can be read. | 30 questions right, a week later. | "When the learning is real, the screen says so first." | Music thins to one held note | Hero line only. "65%" not echoed or zoomed. |
| 0:44–0:47.6 | Recording: the full Form III → IV Turning, oak, **1.0x**, untouched | (none) | (silence) | Gentle swell, no sound-effect hits | Real speed. No cuts. Under 2.5 changes a second. At least 1 s from the glimpse before it. |
| 0:47.6–0:51 | Recording: "The Broadcrown Oak" settles. Hold. | (none) | "Then Kai grows into a new form." | Music resolves | "Grows into a new form". |
| 0:51–0:55 | Recording: Look screen, slow scroll past the five finals, choose Moot; Your plant shows the Moot Oak. Stills: `forms-look-final-choice-light.png`, `forms-oak-formIV-moot-light.png` | Choose its final form. | "At the last form, you choose its shape." | Music | The learner chooses; scores never decide the shape. |
| 0:55–1:00 | End card (Play/YouTube/social version above) | See end card | "KaiSip. Practice for the CISA exam. Free to use during the beta." | Music out | Beta wording exact. Trademark line on screen. |

**Full 13-species version (social only).** For a separate 15–18 s clip, show all 13 species, Form III to Form IV, about 1 s each with soft dissolves, then 2 s of the Broadcrown Oak. Order (light, then repeat in dark if you like): oak, maple, narra, cherry-blossom, pine, coconut-palm, mango, bonsai, sunflower, lotus, sampaguita, cactus, bamboo. Files: `forms13-<species>-formIII-<theme>.png` and `forms13-<species>-formIV-<theme>.png`. Super at the start: "13 plants. Each grows from real study." Keep each still on screen at least 1 s. Never make it feel like a set to complete.

### 60 s voiceover script (paste into your voice tool)

Memorizing answers only gets you so far. The exam asks for judgment.
KaiSip gives you a short plan each day, sized for the gaps between meetings.
Every question is original, and every answer explains why.
Three tips on every question show you how to rule options out, and how to choose between the last two.
What you miss comes back the next day, then again after longer gaps.
Mocks and practice build a readiness range. It's an estimate, never a promise.
And then there's Kai. It grows only from real study, and it never wilts while you're away.
When the learning is real, the screen says so first.
Then Kai grows into a new form.
At the last form, you choose its shape.
KaiSip. Practice for the CISA exam. Free to use during the beta.

Voice: one calm, warm voice, mid pace. No hype, no "you've got this!" energy.

---

## 5. Versions

### Silent autoplay (most people watch muted)
- Burn the supers in. They must tell the whole story without the voice.
- For the voiced versions, also burn in captions of the voiceover (open captions), and upload an `.srt` file to YouTube and LinkedIn.
- Caption style: the app's sans, white on a 70% Grove forest-green band (#1E4A34), at least 48 px tall on a 1080-wide frame, two lines at most.

### Crops
- **9:16 vertical (master, 1080×1920):** Threads, Instagram, YouTube Shorts. (The App Store needs its own 886×1920 render, section 2b.) Keep supers out of the top 220 px and bottom 380 px (the apps put buttons there).
- **1:1 square (1080×1080):** LinkedIn feed. Put the phone screen centered at about 60% height on Grove paper (#F3F1EA light, #111613 dark). Supers above it.
- **16:9 (1920×1080):** YouTube and the Play promo link. Phone screen centered on Grove paper; supers in the left third. Check Play Console's current note on video orientation (verify).
- In every crop, scale the whole screen. Never zoom in tight on the Turning.

### Music
- Calm, license-free: soft piano or warm strings, 70–85 BPM, no lyrics.
- Free sources to check: YouTube Audio Library, Pixabay Music. Read each track's license (attribution? use outside YouTube?) and save a copy of it with the project.
- No trending audio from TikTok, Instagram or Reels libraries. You can't license it for a store video.
- The app itself is silent during the Turning (it gives one haptic). Don't add a "magic" sound effect that suggests the app makes it.
- Voice sits clearly above music. Aim for about -14 LUFS overall for YouTube and social.

---

## 6. Website hero loop (kaisip.com)

| Item | Spec |
|---|---|
| Length | 8 s loop (6–10 s is fine) |
| Content | 0–1.5 s: Your plant with the Form IV fact on screen (Standard Oak). 1.5–5.1 s: the Form III → IV Turning at 1.0x. 5.1–7.5 s: hold on "The Broadcrown Oak". 7.5–8 s: 0.5 s cross-fade back to the start. |
| Sound | None. Muted, `autoplay muted loop playsinline`. |
| Size | 9:16 or 4:5 crop, about 720 px wide. MP4 (H.264) plus WebM. Aim under 1.5 MB. |
| Poster | The settled Broadcrown Oak still (`forms-oak-formIV-growth6-light.png`, cropped to the plant and its name). |
| Reduce Motion | When the visitor's device asks for reduced motion (`prefers-reduced-motion: reduce`), don't autoplay: show the poster still only. |
| Pause | A visible, keyboard-focusable pause button labelled "Pause animation", at least 24×24 px, that stays paused for the visit. Listen for changes to `prefers-reduced-motion`. Give the video `aria-label="KaiSip's plant grows into a new form"`. |
| Safety | The loop seam is a slow cross-fade, never a cut from Form IV to Form III. One Turning per 8 s, never faster. |
| Dark site theme | Use the dark-theme take and `forms-oak-formIV-growth6-dark.png` as its poster. |
| Words beside it | "It grows only when you study." No readiness or pass words next to the plant. |

Source clips: `footage/turning-oak-formIV-light-4x5.mp4` and `footage/turning-oak-formIV-dark-4x5.mp4` (web-build capture, cropped above the domain list). Poster: as in the table (the settled Broadcrown Oak cropped to the plant and its name), never a frame with the Form IV fact line.

The website already has the plant and its forms, so the loop shows something a visitor can really find there. Before any website copy says the Turning plays on kaisip.com, check it in the browser (the phone app is where it was built first).

Building it into the site is a `web-app-engineer` task (not part of this pack).

---

## 7. Claims checklist (tick every line for every cut)

- [ ] No pass promise or hint. No "pass guaranteed", "ace", "crush the exam", no pass rate.
- [ ] Readiness is always "an estimate".
- [ ] Never the word "official".
- [ ] No total question count anywhere: not in supers, not in voice, not on any app screen in the footage. Say "practice questions across all 5 CISA domains" if needed.
- [ ] CISA® and ISACA® only to describe the exam, ® on first use on screen, the not-affiliated line on the end card.
- [ ] No other certification named. If future certs come up: "Starting with CISA. More certifications later."
- [ ] "Grows into a new form" / "The Turning" only. None of the banned words: "evolve", "evolution", "evolving". No Pokémon references, no "gotta catch", no collecting or "level up" language.
- [ ] No hype words: ultimate, guaranteed, best, #1, revolutionary.
- [ ] Beta wording exactly "free to use during the beta". App Store version: no beta wording, no Google Play.
- [ ] The Form IV "65%" line is only ever shown as app footage, never in a super or voice, never zoomed.
- [ ] The Turning plays at 1.0x, uncut, no strobe, no punch-in, at least 1 s calm before and after.
- [ ] All footage is the real app (Apple and Play rules). Stills in the glimpse come from the app's own renderer, and the dissolve between them is never called the in-app animation.
- [ ] Music license saved. No unlicensed trending audio.
- [ ] Captions burned in for the silent version.
- [ ] The final 30 s, 60 s and hero renders (the dark take especially) pass a flash checker (for example PEAT) before publishing.
- [ ] The Play-listing upload uses the Play listing end card (no beta, no "free", no store names).

---

## Rationale

- **Target keyword:** "CISA exam practice" (end card and voice, used only descriptively), with "IT auditor" and "judgment" for the audit-minded viewer.
- **Learner pain:** memorizing answers without understanding them, and not knowing whether progress is real. The Turning answers both: the screen shows the learning first, so the plant feels earned.

## A/B variant

Test the **hook** in the 30 s cut. Control (A): the plant hook ("It grows only when you study."). Variant (B): the pain hook from the 60 s cut ("Memorizing isn't knowing."), with the plant moved to 0:03. Measure: 3-second view rate on social, and store conversion when used as the preview (Apple Product Page Optimization). Run for at least 7 days.
