# Grove: decisions so far

A record of the owner-facing decisions made while building Grove on the website (branch `feature/grove-ui`). `GROVE_HANDOFF.md` stays as delivered apart from dated "Changed from the kit" notes; where a decision below differs from it, this file and `docs/mobile/DESIGN_SYSTEM.md` (§21.8) describe what was built. Each entry says what was decided, who decided it and why.

## 1. Accuracy before 30 answers (owner, 31 Oct 2026)

Today's accuracy tile keeps You's own rule: "Not started" with no answers, "Too few yet" under 30 answers, then the whole percentage of latest tries. Under 30 a small hint says when the number shows ("Shows at 30 answers"). Screen readers hear the tile as one phrase ("Accuracy, too few yet, 12 answered").

Why: a few answers never read as a score, and Today and You say the same thing.

## 2. The ring and the twig together (owner, 31 Oct 2026)

Today shows the ring (with the plant, the range and its caption) and this week's twig together, at every width and on every day. Never one or the other by the day. Exam week keeps its earlier rule (readiness in words, no ring ticks, no twig), as does Welcome back (no twig).

Why: the ring is progress over the whole study, the twig is this week; each answers a different question.

## 3. The streak is hidden from study day 14 (owner, 31 Oct 2026)

Before the 14th study day the twig's right side says "Streak starts today" while there are fewer than 2 study days in all, then "N day streak" from a streak of 2. A streak under 2 after that shows nothing (no 0, no 1, no reset line). From the 14th study day the twig shows no streak; its leaves and "N study days this week" carry the week. Streak maths are unchanged.

Why: a streak helps a new habit form, then becomes pressure; by day 14 the habit is the point, not the count.

## 4. Labels on all tabs (owner, 31 Oct 2026)

All four tabs of the phone's floating bar (Today, Learn, Practice, You) show their word under the icon and share the width equally; the current one has a pill behind its icon. The words use the tab type size. Larger text makes the bar taller instead of cutting a word off. When the words cannot fit side by side, the bar docks full width at the bottom; when even that is too narrow (200% page zoom on a small phone), the tabs wrap two to a row so You is always reachable. The bar's height is kept in one place, and the cookie bar and messages sit above it.

Why: icons alone are guessed at; a word under every icon is learned once.

## 5. The current tab in forced colours (accessibility requirement, 31 Oct 2026)

The current tab's pill carries an outline: transparent in light (where the pill alone is 7.7:1 on the bar) and the sap green in dark (where the pill alone is only 1.89:1, so the 10:1 edge marks it by shape as well as colour). Forced colours (Windows High Contrast) drop the pill's fill but paint the outline, so the current tab stays marked there in both themes. Normal light and dark look as before.

Why: WCAG 1.4.11 and the Grove rule that the current tab is never shown by colour alone. Not an owner choice; recorded here because it amends the tab bar in the kit.

## 6. The first screen on phones, and how it is measured (expert vote, 31 Oct 2026; replaced by 7 for the order)

**Replaced on 31 Oct 2026:** the owner chose ring first on phones (decision 7). The measuring method below still stands; the plan-first order and the "Start above the bar in every state" target do not.

On Today, Start sits fully above the floating tab bar on the first screen, with at least 8px to spare, for every learner state, name length, greeting and exam date, in light and dark.

It is measured in the browser's visible area with its toolbars showing: 390 by 664 and 375 by 635 are the main sizes; 390 by 844 and 375 by 812 (the full CSS viewport, which no browser shows at load) are secondary. Load, do not scroll, and compare Start's bottom edge with the bar's top edge.

To meet it, the product manager, the premium web designer, the behavioural scientist and the mobile UX reviewer all voted for "plan first on phones": below 768px the plan comes first in the page's own order, then the figure (ring, plant, range, "A study estimate, not a prediction.", the answers caption and the tiles), then the plant line, then the twig. Nothing is hidden or shrunk. From 768px the kit's order (figure first, plan beside it) is unchanged. The native app, with no browser toolbars, keeps hero-first.

The phone title keeps to two lines: a name longer than 12 characters greets with its first word there (the full name shows from 768px and on You), and one very long word steps the title down a size.

Why: on real phone browsers Start was under the bar in every state; an anxious learner should see one small, safe step first (time, Start, "Stop any time; your place is saved"), with the plant and the estimate as the reward just below.

**Owner sign-off:** this changes the kit's order on phones, a design-direction item. Before and after screenshots at 390 by 664 and 375 by 635, light and dark, go to the owner at handoff.

## 7. Ring first on phones (owner, 31 Oct 2026; replaces plan first)

Below 768px Today goes back to the kit's order (`screens/01-phone-today.png`): the hero figure first (the stage line, the readiness ring with the plant, its caption, the Accuracy and Exam date tiles), then Today's plan with Start, then the plant line, then the twig, then the rest. The order is the page's own (the markup), never CSS `order`, so keyboard focus and screen readers follow what is seen. The phone ring is 132px at 100% text (was 150px; the owner asked for a smaller ring) and the figure is tighter, so Start sits as high as it can. The ring is sized from its own text size, so with larger text it grows (about 172px at 130%, capped by the card's width) and nothing inside it is clipped; checked at text scales 1, 1.15, 1.3 and 2 at 320, 375 and 390px.

On short browser screens (390 by 664, 375 by 635) a learner may scroll a little to reach Start; that is accepted. Not accepted: clipping the plant, the range or its caption, or text smaller than the type scale. From 768px nothing changes (the figure beside or above the plan in one forest card). Start's position is still measured as in decision 6 and reported at each handoff.

Why: the owner prefers the kit's design, where the plant and the honest range greet the learner first and the plan follows.

## 8. No book labels on screen (expert decision, unanimous, 31 Oct 2026)

The website no longer shows or says "Field guide", "Field record", "Plate", "Plates" or "Fig. N". The plant drawings and the short italic serif captions stay. In detail:

- The running head over each page shows the date only ("Sat 31 Oct"); Your progress keeps "Exam in N days" beside it. A set's or a mock's results still name the set there. No empty divider is left behind.
- Today: the stage line reads "Seed" with "Stage 1 of 6" beside it (phones) or "Seed · stage 1 of 6" (from 768px, said "Seed, stage 1 of 6"); the plant line is the sentence alone; the figure is announced as "Your plant and study estimate".
- Your progress: "Five areas, one scale"; "Built from your answers in this app."; the badges sheet is headed "Badges" (was "Herbarium") and its empty mount says "Nothing here yet".
- Practice: "Picked for you", "Where you left off", "A place to start"; the domain note is the sentence alone; "Three moves for this question".
- Results and mocks: "Your domains after this set", "IS Operations, new growth", "Your five areas after this mock", "Two mocks, one pace".

The Grove kit (`reference/*.html`, `screens/01`, `04`, `05`, `06`, `GROVE_HANDOFF.md` and `START_HERE.md`) was updated the same day so a later build does not bring the labels back.

"Field Guide" stays the team's name for the look, never words on screen. Code names such as `fgPlate` stay. The phone app follows in its own round (the decision asks both apps to ship together; the version bump and What's New line wait for the end of the uplift).

Why: the labels come from old printed nature books. A nervous learner, or someone reading English as a second language, has to stop and work out what they mean, and the numbers did not add up (Fig. 1 on Today, Fig. 5 on You, nothing between).

## 9. The plant first in the ring (expert decision, unanimous, 31 Oct 2026: "ring-plant-first" option B)

The plant is drawn at the same full size at every stage, Seed to Elder, in light and dark; it no longer shrinks when the first range arrives. The range moved out of the ring to the caption under it, in the same spot in both states. Each measure has its own mark:

- **Before the first range:** 40 seed dots, one per answer that counts (an assisted first answer counts half, as the engine already does). An answered dot is solid sap; a dot not answered yet is an outline in `--leaf-line` (on the forest hero, `--hero-leaf-line` #8FAE98: 3.3:1 at the panel's lightest top, 4.8:1 around the ring). Both are the same outer size, so they differ by shape, not colour alone: 6px across in the 132px phone ring (also at 320px wide) and about 7px in the 190px web ring. The dots match the caption's count and never go backwards.
- **Once a range exists:** the 50 ticks of 2 points, lit to the low end, gold across the range, with the clay mark at the 80 study bar (only when the ticks show).
- **Caption:** before the range, "12 of 40 answers until your first readiness range", and from 30 answers a countdown ("8 more answers to your first range", "1 more answer to your first range"). After it, phones read "63 to 73 estimated range" and "A study estimate, not a prediction." word for word; from 768px the range is in the serif (32px, under the 40px greeting) with "estimated range" under it. For the first range (40 to 59 answers that count) it adds "Your first range is in. It usually narrows as you answer more." Never one number, never a dash, never "pass" or "ready". This is the only big range on Today: the Estimated readiness card now shows it as its plain first line (Figtree 15 semibold), like "Not enough data yet".
- **Screen readers:** the ring keeps `role="img"` with its label in words ("N of 40 answers toward your first readiness range.", or the range sentence with "A study estimate, not a prediction."); the caption is hidden from them, so it is said once.
- **The 40th answer (G19):** when the range arrives during a visit, the dots fade, the ticks light, then the range fades in, in 560ms, opacity only, and a status line says "Your first readiness range is in: 44 to 62. A study estimate, not a prediction." once. With Reduce Motion, and for a learner who comes back later, the final state shows straight away. No confetti, arrows or needles.
- **Not changed:** the readiness maths, the 40-answer threshold, the 50-tick scale, the 80 study bar and every storage key.
- **Not built yet:** the small ring on You (G31: 20 dots worth 2 answers each at 64px, then ticks) waits for Phase 3 You, where that ring is first drawn; the phone port waits for its Grove round (`mobile/` is mid-upgrade).

The kit images stay as delivered. `GROVE_HANDOFF.md` §6.4 carries a dated note of the change from the kit (and §6.6 the twig's `--leaf-line` outline); this entry and `docs/mobile/DESIGN_SYSTEM.md` §21.10 hold the detail.

Why: in the kit as built the plant shrank to a speck at the moment it grew, and at 39 answers the ring looked nearly full, then dropped to about two thirds at 40, so the first milestone looked like a loss.

## 10. Today's finish line (expert decision, unanimous, 31 Oct 2026: "today-finish-line" option B)

Today's plan is saved once a day in one new field of the progress record, `todayPlanV1`, beside the old fields (nothing renamed or replaced): the local day and the time it was made, the plan's mode, the ids of the questions to revisit it holds, and its set (domain, size). It is made on the first visit after local midnight from the live plan and stays fixed all day: answering, exam week or Welcome back do not change it. A missing, broken or older one is rebuilt quietly. It travels in export and backup; a file without it still imports, and older versions ignore it.

- **Done** only when every step is finished: each question to revisit answered after the plan was made, and the set's size answered today in its domain (less those questions). More answers never undo it; Start runs what is left of the saved plan.
- **If it cannot be saved** (private browsing, full storage), it lasts the visit with no message, and a rebuilt plan still waits for the due questions to revisit, so "done" never comes early.
- **The finish card**, in the plan's place: "Today's clearing", "One of one, done." (or "Two of two, done."), plain tiles for Questions, Correct ("8 of 10") and Time, a Tomorrow line ("About 12 min"), "Do a little more" as an outline button (no filled button), "Stop any time; your place is saved." and "Short on time?". "Do a little more" starts the live plan and never resets or grows the saved one. No "pass", "ready", guilt, streak warnings, confetti or total question count.
- **Not changed:** readiness maths, scoring, review timing, the due queue and the order of questions.

The version bump and What's New line wait for the end of the uplift, as agreed.

## 11. Today premium round (31 Oct 2026)

Built from the premium plan (section 1 items 1, 2, 3, 4, 6, 7, 8, 11 and G26), with no book labels anywhere:

- **One "not yet" outline:** `--leaf-line` (light #86806F, dark #6A776D), for empty marks that carry meaning only (the twig's empty leaves now; locked stages and empty badge tiles later). Never text.
- **One mint button on forest panels:** `--btn-hero` #A9D9BA with `--on-btn-hero` #17231B, the same in both themes, for Today's Start from 768px, Study notes' "Practice Domain N" and the mock's "Resume exam". Hover keeps the mint.
- **Mint means go:** the row labels ("Read next", "Mindset check", "Your weakest area") are grey, in sentence case; the weakest area keeps its clay badge; "Not now" and "No thanks" are neutral; "Short on time?" is a plain underlined text link; "Set exam date" is ink.
- **No lonely words:** headings are balanced and notes never end with one word alone; "Today's plan" uses the card title size on phones; the phone avatar sits on the title's first line.
- **The plant's story:** the hero line says "Fern grows only from real progress. Next, Bough: grows when topics stick across days." ("Fully grown. It keeps all of its growth." at Elder). On the visit after it grows: "Fern grew to Shoot." and one true fact about what earned it, with the art fading over from the old stage in under half a second (none with Reduce Motion) and one announcement. The plant row lower on the page no longer repeats it ("Its look and growth, on You").
- **Settings:** the You header shows the phone's cog, never a sun: a 44px icon button on phones, the cog and "Settings" as a quiet text button from 768px.
- **Accuracy:** a small "Latest tries" line under the hero's Accuracy number (not in exam week or on a Welcome back day, which stay as they are).

## 12. Settings is its own page; You is C2 (owner, Sky, 31 Oct 2026)

Sky chose You version "C with the improvements", asked for better accessibility and buildability, and asked that Settings be separated from You as its own page, so it is easy to find without a long scroll. Spec: `scratchpad/grove/you-c2/final/SPEC.md` (after accessibility, buildability and first-time learner reviews).

- **Settings is its own page** (web: `#settings`, a sub-page of You; the phone keeps its existing `app/settings.tsx`). Three ways in: the 44px cog in the You header (a real cog, at every width, no word beside it), the "Settings" row near the end of You, and on computers "Settings" under You in the rail. Back is the page bar's "You" link. While Settings is open, the phone tab bar marks You as the current section. Old links still work: `#settings`, `#data`, `#your-data` and `settings!data` (which opens the Your data sheet).
- **This replaces** `GROVE_HANDOFF.md` §5 rule 4 (line 89: "Settings stay on You … a settings button that scrolls to it") and §6 item 11 (line 190 onward: the Settings card on You), and the "from 768px the cog and the word Settings" note in 11 above.
- **Nothing moved out of the app:** Settings holds General (Your name, Exam date, Dark mode, Exam-day rehearsal), Your data (Back up, Restore, Other saved progress when there is any; one file input), Reset (Reset reading progress, Start fresh, each asks first) and Help and about (What's New, FAQ and help, How KaiSip works, Send feedback, Support KaiSip, About KaiSip). Start fresh asks "Start fresh?" with "Keep my progress" (focused), "Back up first" (saves a file, the sheet stays open and says "Backup saved." or "Backup failed.") and "Clear progress".
- **No tabs on You.** With Settings out, You is one scroll: the profile, one sentence for the week with "Practice {area}" and the plant chip, the numbers, the readiness ring, five areas, the plant, mock exams, badges, study tools, "In more detail", the Settings row and the footer. From 1240px two real column groups sit side by side (DOM order = reading order). If a later review finds it too long, split it into two tabs only ("Progress" and "Plant and badges"); never bring Settings back as a tab.
- **Focus next** is Today's own value (`r.focusId`: the area with the most points to gain, weighted like the exam), so You and Today never disagree.
- **The fourth number** is study days in a row (the study-day streak, as on Today, 3 above), no longer right answers in a row (that count stays in the saved data).
- **Not changed:** readiness and streak maths, scoring, plan logic, the letter mapping and every storage key.
