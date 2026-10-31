# Grove: decisions so far

A record of the owner-facing decisions made while building Grove on the website (branch `feature/grove-ui`). `GROVE_HANDOFF.md` stays as delivered; where a decision below differs from it, this file and `docs/mobile/DESIGN_SYSTEM.md` (§21.8) describe what was built. Each entry says what was decided, who decided it and why.

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

## 6. The first screen on phones, and how it is measured (expert vote, 31 Oct 2026; for the owner's sign-off)

On Today, Start sits fully above the floating tab bar on the first screen, with at least 8px to spare, for every learner state, name length, greeting and exam date, in light and dark.

It is measured in the browser's visible area with its toolbars showing: 390 by 664 and 375 by 635 are the main sizes; 390 by 844 and 375 by 812 (the full CSS viewport, which no browser shows at load) are secondary. Load, do not scroll, and compare Start's bottom edge with the bar's top edge.

To meet it, the product manager, the premium web designer, the behavioural scientist and the mobile UX reviewer all voted for "plan first on phones": below 768px the plan comes first in the page's own order, then Fig. 1 (ring, plant, range, "A study estimate, not a prediction.", the answers caption and the tiles), then its PLATE caption, then the twig. Nothing is hidden or shrunk. From 768px the kit's order (figure first, plan beside it) is unchanged. The native app, with no browser toolbars, keeps hero-first.

The phone title keeps to two lines: a name longer than 12 characters greets with its first word there (the full name shows from 768px and on You), and one very long word steps the title down a size.

Why: on real phone browsers Start was under the bar in every state; an anxious learner should see one small, safe step first (time, Start, "Stop any time; your place is saved"), with the plant and the estimate as the reward just below.

**Owner sign-off:** this changes the kit's order on phones, a design-direction item. Before and after screenshots at 390 by 664 and 375 by 635, light and dark, go to the owner at handoff.
