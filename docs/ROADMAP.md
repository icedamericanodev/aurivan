# KaiSip roadmap: from today to the beta and beyond

Owner: Sky. Written 27 Oct 2026; update it as each step lands.

## What we are building, in one line
A calm, trustworthy study companion that helps people **pass** professional security exams by teaching *how the examiner thinks*. It starts with CISA, adds ISC2 CC for the beta, then grows to CISM, CRISC, AAIA and CISSP. Our name rides on every question, so **quality before speed**.

## How we work (every step)
1. **One step at a time, end to end:** build, expert review, fix, tests, merge, then on your phone. We never leave half-finished work lying around.
2. **Experts check everything before you see it.** Content goes through a blind test, a standards audit and a learner read. Screens go through design and accessibility review. Anything touching accounts goes through security review.
3. **You decide anything big.** Product direction, design picks, money, legal and accounts. Everything else I handle and report back with screenshots.
4. **Two tracks run side by side:**
   - **App track:** features, sign-in, the store.
   - **Content track:** the CC course.

   Content is the long road, so it runs in the background while the app track moves step by step.

---

## Stage 1: CISA beta-ready (app track)

| # | Step | What learners get | Your part | Status |
|---|---|---|---|---|
| 1.1 | **Settings V6 + lessons 6–10** (mobile 1.46) | Clear grouped Settings, 5 more decision lessons | Check for updates on your phone | ✅ Done |
| 1.2 | **Home-screen widgets** (mobile 1.47) | 8 calm widgets: plan, week, plant, think first, quick question, revisit, readiness, countdown | Install one new test app, add widgets, tell me what you think | 🧪 Built (1.47); waiting for your phone test |
| 1.3 | **Content-pack groundwork, Phase A** (invisible) | Nothing visible. Fixes two backup bugs and prepares the app for downloadable exams | None | ✅ Done |
| 1.4 | **Optional sign-in, web + phone** (Google + email code) | Save progress, move it between kaisip.com and the phone | Google Cloud sign-in setup, an email-sending service, Cloudflare DNS (`docs/mobile/ACCOUNTS_BETA_PLAN.md` §9) | 🔨 Database installed 28 Oct; your setup sessions next, then the sign-in screens |
| 1.5 | **Topics named like the official outline + progress per topic** | See exactly which CISA topics are strong and weak | Pick from screenshots | ⏳ Next |
| 1.6 | **Web Progress dashboard** | A clear progress page on kaisip.com | Pick from 3 mockups | ✅ Done (web v12.41) |
| 1.7 | **Today screen, step 2** | A calmer, more personal daily start | Pick from mockups | ⏳ |
| 1.8 | **Play Store closed beta** | Testers install from Google Play; the version resets to 1.0 | Play Console steps, tester email list, store listing approval | ⏳ After 1.2 and 1.4 |

**Why this order:**
- Widgets (1.2) are nearly done.
- Sign-in (1.4) needs a new app build anyway, so it shares the beta build.
- Topics and progress (1.5–1.7) make the beta feel finished.
- The store (1.8) comes last, once everything is in.

## Stage 2: the ISC2 CC course (content track, runs in parallel)

| # | Step | Output | Quality gate |
|---|---|---|---|
| 2.1 | **Verify the official CC outline** (new since 1 Sep 2026) | Final domain and sub-topic map | Needs isc2.org opened in the cloud environment |
| 2.2 | **Study notes first, per domain** | Clear concept notes for every sub-topic, the plain-English way we do CISA | Concept expert + learner read |
| 2.3 | **Question bank, 1,000+** | Original questions, 3 tips each, every option explained, about 200–250 per domain by weight | Every batch: self-check, blind test, standards audit |
| 2.4 | **Principles, lessons, exam guide, final week, glossary** | The CC "mindset" layer and exam-day guidance | Mindset coach + language review |
| 2.5 | **CC mock exams** | Exam-like timing and domain mix (honest about the real CAT format) | QA tester |
| 2.6 | **Cross-domain final gate** | One consistent teacher across all five domains | Cross-domain reviewer |
| 2.7 | **Pack delivery** (content packs Phases B–D) | CC downloads in the app in one tap; the website gets an exam switcher | Security + QA review |
| 2.8 | **CC joins the beta** | Testers download CC from inside the app | Your approval with sample screenshots |

**Owner decision (27 Oct):** finish the CISA build (Stage 1) before any CC work starts.

**Recommendation:** start the beta with CISA as soon as Stage 1 is done, and add CC *into* the running beta when 2.6 passes. Don't hold the beta back for CC.

## Stage 3: premium UI pass, web and mobile (started early: owner decision 28 Oct, in parallel with CC)

**Owner decisions, 28 Oct 2026:**
- **Timing:** start now, in parallel with the CC content work, instead of after the CC pack.
- **Look: "A + B touches".** Keep Grove (forest green, Fraunces + Figtree, the Kasama mark, the plant, icon and widgets) and refine it. Borrow three moves from the Editorial Ivory direction:
  - hairline rules instead of shadows on anything that isn't a choice;
  - real display optical sizes for titles;
  - on wide screens, a margin column on the answer and note pages (the Exam cue sits in the margin).

**Owner update, 29 Oct 2026:**
- **Look: Grove Refined.** The theme (colours, fonts, the mark) stays. The premium step is a **signature presentation system**: one structure, consistent type, backgrounds, and a distinctive way of presenting badges, stats, cards and progress, unlike common apps ("no AI-slop look"). Three grammars were explored (Field Guide, Auditor's Workpaper, Bound Volume). **Owner pick, 29 Oct: Field Guide.** Every screen centres on one captioned plate ("Fig. n ·"). Badges are pressed specimens on herbarium sheets, the five areas are stems on one scale with a 70 line, and readiness is a scale bar. Spec and boards: the signature design notes (starter kit: RunningHead, Plate, FigCaption, SpecimenLabel, ScaleBar, StemChart/StemList, Specimen, HerbariumSheet, KeyList, EmptyPlate). The Editorial Ivory touches fold into that choice.
- **Plant forms: all 13 species**, using the "Turnings" system: 4 forms mapped from the 6 saved growths, no reset.
  - A delayed-recall gate for the later forms.
  - The learner chooses the final form at Form IV.
  - A calm reveal on Your plant.
  - Copy says "grows into a new form", never "evolve".
- **Habit features, approved:**
  - a fresh start after 3+ days away;
  - "Just 3 questions";
  - a study anchor with reminders;
  - snooze and a Quiet week;
  - a weekly look-back.

**Owner picks, 29 Oct 2026 (later):**
- **The Turning: option A.** The silhouette is gold, not white, and the half-swaps keep an even pace, so the reveal is clearly KaiSip's own and unlike any well-known game's transformation.
- **Phone menu: option A.** 4 tabs (Today, Learn, Practice, You). The brain games move inside Practice as "Drills". The web already has 4 tabs.
- **Business setup:** KaiSip will be a **DTI sole proprietorship**. The Google payments profile is set up as **Individual** with the public business name **KaiSip** (the public name, support email and statement name can change later; the account type cannot easily).
- **RevenueCat:** account, Google payments profile and the Play ↔ RevenueCat service account are set up (Parts 1–3). Products, entitlements and the paywall wait for the first Play build with billing (Phase E).

The five directions explored (A Grove Refined, B Editorial Ivory, C Midnight Focus, D Clear Modern, and the wild cards E1/E2) are recorded in the scratchpad boards and the two new agents, `premium-web-designer` and `premium-mobile-designer`.

**Built so far:**
- web v12.43 and mobile 1.49: tokens T1–T4, backlog-free counts, and the shorter answer screen with the ⋯ menu and question recap;
- mobile 1.48: the widget Study cards.

Every expert agent reviews the whole app, plus a new `ui-reference-researcher`. It gathers references from Mobbin, Figma, Dribbble, Behance, Apple HIG and Material 3, and turns them into Grove-compatible changes.

How it runs:
1. **Reference boards.** One per key screen: Today, lesson player, question and answer, results, progress, notes, settings, onboarding, widgets.
2. **Expert critique.** Design manager, super-lens critic, the UX reviewers, motion and a learner read.
3. **Mockups.** Before and after, in light and dark.
4. **Sky picks.**
5. **Build, screen by screen.** Each one is reviewed and released on its own.

Needs from Sky before it starts (all free; owner decision 27 Oct: no Mobbin paid plan):
- Done: `dribbble.com`, `m3.material.io`, `www.nngroup.com` and `www.figma.com` are allowed.
- Optional free galleries to add to Allowed domains: `apps.apple.com`, `godly.website`, `www.lapa.ninja`, `land-book.com`, `www.saasframe.io`, `collectui.com`.
- 5–10 screenshots from Sky's phone of apps that feel premium to Sky. This is the most valuable reference.
- Free sources the researcher uses: Apple HIG, Material 3, Figma Community kits (Apple iOS kit, Material 3 kit), Google Play store screenshots, Dribbble via search, NN/g.

## Stage 4: more exams
- **CISM.** Its new outline starts 3 Nov 2026; build to the new one.
- **CRISC, AAIA.**
- **CISSP.** Wait for its new outline (15 Apr 2027) so nothing is built twice.
- **Paid courses, Phase E:** in-app purchase, a free sample per course, the paid packs locked behind sign-in, and the source repo made private.
- **iPhone app** with Apple sign-in, when the $99/year Apple account makes sense.

---

## Your checklist (only you can do these)
- [x] **Cloud environment → Allowed domains** (done 27 Oct): isc2.org, www.isc2.org, csrc.nist.gov, nvlpubs.nist.gov, www.nist.gov, www.cisa.gov, owasp.org, www.first.org
- [x] **Security basics:** 2-step login (2FA) on Cloudflare, Supabase and GitHub (done 27 Oct)
- [ ] **Supabase:** turn on usage alerts
- [ ] **Sign-in setup** (step 1.4): Google Cloud, an email service and Cloudflare DNS, following the list I'll send
- [ ] **Widgets test** (step 1.2): install the new test app and try the widgets
- [ ] **Play Console** (step 1.8): closed-testing track, tester emails, listing approval
- [ ] **Later, before selling anything:** decide on making the GitHub repo private

## Decisions already made (so we don't revisit them)
- Settings: one page with clear cards (V6).
- Widgets: keep all 8, fixed per the expert reviews.
- Content: CISA built in; other exams as downloadable packs from kaisip.com (Cloudflare). Supabase only for people's data. Course content never goes in the database.
- Sign-in: optional on web and phone; Google + email code; Apple later.
- Trademarks: ISC2® and CC® carry ®; no "official" claims; never promise a pass.
- Roadmap order: CISA → CC (beta) → CISM, CRISC, AAIA → CISSP.
