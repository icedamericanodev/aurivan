# KaiSip Grove UI uplift (Direction D)

Read this whole file before you change anything. It is the single source of truth for this uplift.

> **No book labels on screen (31 Oct 2026).** Never show or say "Field guide", "Field record", "Plate", "Plates", "Herbarium" or "Fig. N". Captions are plain words. See `DECISIONS.md` 8 and `docs/mobile/DESIGN_SYSTEM.md` §21.9. The kit below follows this.

## 1. What this is

A visual uplift of the KaiSip app (kaisip.com and the Android app, which share one codebase). The look is called **Grove**: the existing plant theme, with cleaner rounded cards, a floating tab bar, and every progress number drawn as a plant.

This is a **presentation-layer change only**.

## 2. Ground rules

1. Work on a new branch: `feature/grove-ui`. Never commit to `main`. Open a pull request at the end. Do not merge it; the owner merges.
2. Do **not** change the quiz engine, scoring, readiness maths, spaced review logic, question data, or storage keys. Read existing values and draw them differently. If a value you need does not exist yet, stop and ask.
3. **Keep every piece of existing content.** This uplift changes the look, not what is there. Every page, nav item, link, card, setting, empty state, note and disclaimer that exists today must still exist and still work afterwards (for example Glossary, Final review week, Mindset check, Save a backup, Help and about). Section 10 lists them. If the mockups seem to drop something, the content list wins: keep it and style it with the same components.
4. Keep the existing CSS variable names. Change values or add new tokens. Do not rename anything that other code reads.
5. Both themes must work: dark (the main design) and light. Check every phase in both.
6. Follow the repo's own `CLAUDE.md` (version bump and What's New rules, linting, hooks).
7. Copy style: short, plain sentences. **No em dashes or en dashes anywhere** in UI text, code comments you add, commit messages or the PR.
8. Commit after each phase with a clear message, for example `feat(grove): phase 1 tokens, shapes and nav`.
9. After each phase, list what changed and what you could not do, then continue.

## 3. What is in this kit

| Path | What it is |
|---|---|
| `screens/01-phone-today.png` | Phone Today, 390 px wide, shown at 2x |
| `screens/02-phone-learn.png` | Phone Learn |
| `screens/03-phone-practice.png` | Phone Practice |
| `screens/04-phone-you.png` | Phone You |
| `screens/05-web-today.png` | Web Today, 1280 px wide |
| `screens/06-data-kit.png` | Every plant chart, with later states drawn using **example** numbers |
| `reference/*.html` | The same six designs as static HTML. Open them in a browser and copy exact sizes, colours and SVG paths from them. |

The screenshots show one learner's numbers (Lala, 11 answered, 36%). Those are sample values. Bind every number to real app data.

The reference HTML uses inline styles because it is a mockup. In the app, use the token variables and the existing component structure instead.

## 4. Tokens

The dark values below are kaisip.com's current dark theme, so most already exist. Add the new ones in **both** themes.

### Existing tokens to use (dark value shown)

| Token | Dark | Used for |
|---|---|---|
| `--bg` | `#111613` | Page |
| `--surface` | `#1D2621` | Cards |
| `--surface2` | `#202A23` | Quiet tiles, inactive step squares |
| `--border` | `#29322B` | Card edge (drawn as `box-shadow: 0 0 0 1px`) |
| `--border2` | `#39443C` | Empty leaves, dashed outlines |
| `--text` | `#ECEFE8` | Main text |
| `--text2` | `#B4BFB6` | Supporting text |
| `--muted` | `#97A39A` | Captions, inactive tabs |
| `--btn` / `--on-btn` | `#A9D9BA` / `#0F1F16` | The one main button per screen |
| `--accent` | `#7FC39C` | Filled leaves, stems |
| `--forest` | `#21432F` | Avatar tile, icon badges |
| `--forest-track` | `#2E5440` | Active tab, unlit ring ticks, step 1 square |
| `--on-forest2` | `#BCD2C2` | Text on the forest hero card |
| `--clay` | `#E9A07A` | Streak, "below 70" buds, 80 study bar marker. Nothing else. |
| `--tip` | `#E9C46A` | Readiness range ticks, "Example" tags |
| `--dom1` to `--dom5` | existing | Domain dots on Learn |

### New tokens to add

| Token | Dark | Light (suggested, check contrast) | Used for |
|---|---|---|---|
| `--r-card` | `24px` | same | Cards |
| `--r-tile` | `16px` | same | Inner tiles, buttons, search field |
| `--r-badge` | `11px` | same | 36 px icon badges |
| `--r-step` | `9px` | same | 30 px numbered step squares |
| `--hero-panel` | `linear-gradient(165deg,#24452F 0%,#1A3324 70%)` | existing `--forest-panel` | Hero cards (Today oak, Learn up next, Practice your path) |
| `--hero-inset` | `rgba(17,22,19,.35)` | `rgba(255,255,255,.12)` | Small tiles inside a hero card |
| `--nav-float` | `#1A231D` | `#FFFFFF` | Floating tab bar |
| `--seed` | `#8A6A48` | `#8A6A48` | Seeds |
| `--seed-edge` | `#E9D9C4` | `#5B4B3C` | Seed outline |
| `--soil` | `#6B5844` | `#A89B83` | Ground lines, twig branch, chart baseline |
| `--leaf-empty` | `#39443C` | `#CDC9BC` | Empty leaf outlines, locked stages |

Type: keep **Fraunces** (headings, big numbers, italic captions) and **Figtree** (everything else). Big numbers use `font-variant-numeric: tabular-nums`.

## 5. Shared rules for phone and web

1. Same four places everywhere: **Today, Learn, Practice, You**. Phone: floating tab bar. Web (768 px and up): left sidebar.
2. Same components with the same names on both. Where phone and web show different items today, keep both. The web only adds width and a right column.
3. One main button per screen, in `--btn`.
4. Remove the floating gear button on every screen. Settings stay on You (as a Settings card) and the You header gets a 44 px rounded-square settings button that scrolls to it.
   *Changed 31 Oct 2026:* the settings button shows the phone's cog, never a sun: a 44 px icon button on phones, and the cog with the word "Settings" as a quiet text button from 768 px. See `DECISIONS.md` 11.
5. Every tap target is at least 44 by 44 px.
6. Charts are SVG with `role="img"` and an `aria-label` that states the numbers in words.
7. Respect `prefers-reduced-motion`. If you animate a stem growing or ticks lighting, keep it under 600 ms and skip it when reduced motion is on.

## 6. Components

### 6.1 Floating tab bar (phone)
- Fixed, 16 px from the left, right and bottom edges plus safe-area insets. Height 64, radius 22, background `--nav-float`, edge `0 0 0 1px` plus a soft shadow.
- Four items. The active item is a pill with `--forest-track` background, icon plus label. Inactive items are icon only with an `aria-label`.
- Add bottom padding to page content so nothing hides behind the bar.

### 6.2 Sidebar (web)
- Logo, then Today; Learn (Study notes, Glossary, Principles, About the CISA exam, Final review week); Practice (Practice, Drills, Mock exam, Saved); You. Keep every sub-link that exists today.
- Active item: radius 14, `--forest-track` background.
- The "Synced with your phone" chip at the bottom is for the future sync feature. **Build it hidden.** Show it only once sync exists.

### 6.3 Cards
- Card: `--surface`, radius `--r-card`, edge `box-shadow: 0 0 0 1px var(--border)`, padding 18 phone, 22 web.
- Hero card: `--hero-panel`, plus `inset 0 1px 0 rgba(255,255,255,.07)`. Only one hero per screen.
- Lists inside a card use 1 px dividers inset 16 px, not separate cards per row.

### 6.4 Readiness ring (Today hero, web Today)
See `01-phone-today.png` and the right card in `06-data-kit.png`.
- SVG 200 by 200 view box. Ticks on a circle of radius 86, stroke width 14. Inside: a disc of radius 70 with the current oak stage drawing.
- **Before the first estimate:** 40 ticks, one per answer. Lit ticks = answers so far (max 40), colour `--btn`. Unlit ticks `--forest-track`. Start at 12 o'clock and go clockwise. Text under the ring: "10 of 40 answers until your first readiness range".
- **After the first estimate:** 50 ticks, each worth 2 points. Ticks up to the low end of the range are `--btn`. Ticks inside the range are `--tip`. A clay marker sits at the 80 study bar (288 degrees). Centre text: "58 to 66", then "estimated range". Never show a single number.
- Use the readiness values the app already calculates. Simplest build: draw each tick as a `<line>` rotated `i * 360 / N` degrees in a loop.

> **Changed from the kit (31 Oct 2026).** The web build differs from the two bullets above, by unanimous expert decision ("ring-plant-first" option B):
> - **The plant is full size at every stage,** Seed to Elder, in light and dark. It no longer shrinks when the first range arrives.
> - **The range is the caption under the ring,** not centre text, in the same spot before and after the first range ("63 to 73 estimated range" and "A study estimate, not a prediction."). Never one number.
> - **Before the first range: 40 seed dots, not ticks,** one per answer that counts. An answered dot is solid sap; one not answered yet is an outline in `--leaf-line` (`--hero-leaf-line` on the forest hero). Both have the same outer size, so they differ by shape, not colour alone: 6px across in the phone ring (also at 320px wide) and about 7px in the web ring. The caption counts the same answers and the dots never go backwards.
> - **After the first range:** the 50 ticks above, unchanged, with the clay mark at the 80 study bar.
>
> The readiness maths, the 40-answer threshold and the 50-tick scale are unchanged. The kit images are left as delivered. See `DECISIONS.md` 9 to 11 and `docs/mobile/DESIGN_SYSTEM.md` §21.10.

### 6.5 Domain stems chart, "Five areas, one scale" (You)
This replaces the current chart and keeps its idea. See `04-phone-you.png` (seed state) and `06-data-kit.png` (grown state).
- Y axis labels 0, 50, 70, 100. Dashed 70 line labelled "70 line" in italic Fraunces. Baseline in `--soil`.
- **Seed state** (fewer than 30 answers in that domain): a seed at the baseline inside a germination ring (radius 13, stroke 2.5). The ring fills `answered / 30` in `--btn`. At 6 or more answers, draw a tiny shoot. Under the label: "6 of 30".
- **Stem state** (30 or more answers): a gently curved stem whose top sits at the domain score on the 0 to 100 scale. Two leaves, plus a third at 80 or more. Bud at the top: `--btn` if 70 or above, `--clay` if below 70. Score above the bud in Fraunces.
- Labels: Audit, Governance, Acquisition, Operations, Protection, at 10 px on phone so they do not touch.
- Key text: "Each area is a seed until 30 answers, then it grows a stem on the same scale. Dashed: the 70 line. A clay tip means below it."
- Use the same per-domain score and answer counts the current chart already reads.

### 6.6 Week twig (Today, web Today)
- One curved branch in `--soil` with 7 leaves, Monday to Sunday, alternating above and below.
- A leaf is filled `--accent` when the learner studied that day on any device, and is an empty outline in `--leaf-empty` otherwise. Today's letter is bold.
- Title "This week's twig". The right side shows the streak in `--clay` ("Streak starts today", or "4 day streak").
- Use the existing streak and activity data.

> **Changed from the kit (31 Oct 2026).** Empty leaves are an outline in `--leaf-line` (light #86806F, dark #6A776D), not `--leaf-empty`. `--leaf-line` is the one "not yet" outline for empty marks that carry meaning (the twig now; locked stages and empty badge tiles later), never for text. See `DECISIONS.md` 11.

### 6.7 Oak stages strip (data kit, optional on You)
- Six square tiles: Seed, Sprout, Sapling, Young oak, Oak, Old oak. The current stage tile is `--forest-track` with a `--btn` edge. Locked stages are quiet outlines, never hidden.
- If the app already has its own stage names, keep those.

### 6.8 Badge tiles (You)
- Four square tiles in a row. Earned badge: a light paper tile with the pressed leaf and a tape strip at the top. Not earned: a dashed `--leaf-empty` outline with a faint silhouette.
- Under the tiles: "1 pressed · Fresh Start, 26 Oct" from real badge data.

### 6.9 Not in scope
- The tree rings card in the data kit is only an idea. Do not build it.

## 7. Screens

The screenshots show the layout for each screen. Section 10 lists every item that must be on it.

### Today (`01`, web `05`)
1. Date label, "Good afternoon, {name}", avatar tile, and "1 study day this week".
2. Hero card: the stage name ("Seed"), "Stage 1 of 6", readiness ring, ring caption, then two inset tiles: Accuracy and Exam date ("Set a date" when none is saved).
3. Today's plan card: numbered step squares, title and detail, minutes, full-width Start, "Short on time? 5 questions, 6 min", and "Stop any time; your place is saved." When there is an unanswered question, this card switches to the existing "Where you left off · Your open question · Continue" state, in the same card style.
4. This week's twig card.
5. "If you have more time" card: Read next, and Your weakest area.
6. Mindset check card (expands to one auditor question, as today).
7. Save a backup card with "Download backup" and "Not now" (only when the app shows it today).
8. Footer line: "KaiSip is independent and not affiliated with ISACA."
9. Web only: the right column holds the Estimated readiness card (status, where you'll gain most, the five domains, "How this is worked out", "See your progress"), the twig and Today's principle.

### Learn (`02`)
1. Title and one line of intro.
2. Up next hero card: domain dot and name, lesson title, dandelion tile, time line, Start lesson.
3. Search field.
4. Tiles: Study notes, Glossary, Principles, The CISA exam, then Final review week as a full-width tile.
5. Lessons card: one row per domain with its `--domN` dot and "0 of 13". The recommended domain gets a small "Next" chip. "Prefer a guided path?" button at the bottom.
6. Footer note about short lessons and original content.
7. Inside pages (Study notes, Glossary, Principles, About the exam, Final week, each domain's notes, key terms, exam strategy) keep all their content. Restyle them with the same cards, tiles and rows.

### Practice (`03`)
1. Title and one line of intro.
2. Section tabs: **Questions, Drills, Mock exams.** They jump to that section on the same page. Do not hide sections.
3. Mindset tip strip (the existing rotating tip).
4. "Picked for you" hero card: title, count and time, three inset tiles (Domains, Count, Timed) that open the existing pickers, the timer note and seconds-per-question note, then Start.
5. Focus next card: Questions to revisit (count chip), Weak spot.
6. By domain card: five rows with exam weight, questions seen, and "Too few yet" or the score.
7. Review and saved card: All missed questions, Weak spots drill, All saved questions, Question bank, Build a set.
8. Drills card: intro line, three drills with numbered rows and dotted leaders, "More drills open after 50 practice questions."
9. Mock exams card: Mini mock (50) and Full mock (150) tiles, and the ISACA scaled score note.

### You (`04`)
1. The date label and the settings button (the cog, never a sun; with the word "Settings" from 768 px, see §5 rule 4).
2. Profile row: name, studying since, daily minutes, starting level.
3. Your plant card: plant name, stage, growth. Keep the existing pick-a-plant and naming flow when nothing is planted yet.
4. Progress tiles, 2 by 2: Answered, Correct, Accuracy, Streak (with study days this week). Note under them: "Each question counts once, at your latest try."
5. Estimated readiness summary row with a small ring and a Report link.
6. Domain stems chart card.
7. Badges card.
8. Study tools card: Questions to revisit, Mistake journal, Saved questions, Share progress.
9. Your progress card: Your progress, Weak spots, Session summary.
10. Mock exams card, including the "No mocks yet" empty state.
11. Settings card: Your name, Exam date, Dark mode, Exam-day rehearsal, Your data.
12. Help and about card: What's New, FAQ and help, How KaiSip works, The welcome screen again, Send feedback, Support KaiSip, About KaiSip.
13. ISACA trademark footer.

### Web (`05`)
Sidebar plus a main column and a right column, as in the screenshot. Below 768 px, use the phone layout and the floating tab bar.

## 8. Phases

Do these in order. Commit after each one.

1. **Tokens, shapes and navigation.** Add the new tokens in both themes. Apply card and tile radii. Build the floating tab bar and restyle the sidebar. Remove the floating gear and add the settings button to You.
2. **Today.** Hero card with the readiness ring (both states), plan card, week twig.
3. **You.** Stat tiles, domain stems chart (seed and stem states), badge tiles, study tools card.
4. **Practice and Learn.** Section tabs, Picked for you hero, Focus next, By domain, Review and saved, Drills, Mock exams. Learn up next hero, tiles (with Glossary), lessons card, then restyle the inside pages.
5. **Web layout.** Two-column Today, same components, responsive breakpoints.
6. **QA.** Check at 375, 390, 768 and 1280 px, in dark and light. Contrast at least 4.5:1 for text. 44 px targets. No horizontal scroll. Quiz, scoring and progress still behave exactly as before. Then do the version bump and What's New entry the repo's `CLAUDE.md` requires, push the branch and open the PR.

## 9. Pull request checklist

- [ ] Each screen matches its screenshot in layout, shape and colour (real data, not the sample numbers)
- [ ] Dark and light themes both work
- [ ] Readiness ring shows the answer count before the first estimate and a range after
- [ ] Domain chart shows seeds below 30 answers and stems at 30 or more; buds below 70 are clay
- [ ] Week twig fills from real activity
- [ ] No floating gear; settings are in You
- [ ] Every item in section 10 is still there and still works
- [ ] Engine, scoring, data and storage keys untouched
- [ ] No em or en dashes in any new text
- [ ] Tested at 375 px and 1280 px
- [ ] Version bumped and What's New entry added, per `CLAUDE.md`

## 10. Content that must stay

This list comes from kaisip.com and the current phone app on 30 Oct 2026. Treat it as the minimum. If you find something in the code that is not listed here, keep it too.

**Navigation:** Today; Learn (Study notes, Glossary, Principles, About the CISA exam, Final review week); Practice (Practice, Drills, Mock exam, Saved); You.

**Today:** greeting with name; set exam date; study days this week; the plant figure and stage; today's plan with steps and Start; short on time option; "Stop any time; your place is saved."; the "Where you left off · Your open question · Continue" state; the caption "Your progress grows from what you practise here."; If you have more time (Read next, Your weakest area); Mindset check; Save a backup (Download backup, Not now); estimated readiness with the five domains, "How this is worked out" and "See your progress"; today's principle; the ISACA independence line.

**Learn:** up next lesson; search the notes; Study notes (domain tabs D1 to D5, domain overview, "Think of it this way", topics by part, read progress, filters All / To review / Read, Expand all, key terms, exam strategy); Glossary; Principles; About the CISA exam; Final review week; lessons by domain with counts; guided path; the footer note.

**Practice:** rotating Mindset tip; picked for you set with Change and Timed; timer and seconds per question notes; Questions to revisit; Weak spots; By domain with exam weight, seen counts and status; All missed questions; Weak spots drill; All saved questions; Question bank; Build a set; Drills (Snare Spotter, Signpost, Call It First, unlock note); Mock exams (Mini, Full, scaled score note).

**You:** profile (name, since, minutes, starting level, Add your name); Your plant (pick, name, stages, never wilts); Answered, Correct, Accuracy, Study days this week, Streak; estimated readiness and full report; domain chart and key; badges; Questions to revisit; Mistake journal; Saved questions; Share progress; Your progress; Weak spots; Session summary; Mock exams and its empty state; Settings (Your name, Exam date, Dark mode, Exam-day rehearsal); Your data (back up, restore, start fresh); Help and about (What's New, FAQ and help, How KaiSip works, The welcome screen again, Send feedback, Support KaiSip, About KaiSip); ISACA trademark footer.
