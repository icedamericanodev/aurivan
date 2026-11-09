# Closed-testing feedback and next-update plan

This is the one place where feedback from closed testing (Android beta) is
logged, triaged and turned into a plan for the next update. The owner drops a
tester's message into a Claude session; the session adds it here, finds the
cause in the app, and slots it into the plan below.

## How each piece of feedback is handled

1. **Log it.** Add a row to the log (next free `FB-` number) and a short
   entry under "Feedback details". Copy the report footer (Item, Part, App,
   Ref) so we can find the exact question, screen and build.
2. **Reproduce it.** Open the same question or screen (for the phone app:
   `SHOT_QUESTIONS=<id> npm run shots` in `mobile/`) and confirm what the
   tester saw. Write the cause in plain words.
3. **Triage it.**
   - **Type:** Bug · Content (a question, explanation or note is wrong or
     unclear) · UX (works, but hard to use) · Feature request.
   - **Severity:** High (blocks learning or is wrong) · Medium (gets in the
     way) · Low (polish).
   - **Reach:** one question, one screen, or the whole app.
4. **Plan it.** Put it in a bucket: **Next update**, **Later**, or
   **Won't do (with the reason)**. Two or more testers saying the same thing
   moves an item up.
5. **Close the loop.** When it ships, mark it Shipped with the version, and
   reply to the tester (the `Ref` code) that their report was fixed.

## Feedback log

| ID | Date | Ref | Where | Type | Severity | Reach | Status | Plan |
|---|---|---|---|---|---|---|---|---|
| FB-002 | 2026-11-09 | Screenshot (no report code) | Phone · Coach me question text | Bug | High | Highlighted question stems on affected Android settings | Fix in review | Next update |
| FB-001 | 2026-11-06 | R-D28Q | Phone · Practice answer screen | UX | High | Whole app (every answered question) | Planned | Next update |

## Next update plan (phone app, proposed 2.1.0)

| # | Change | From | Size |
|---|---|---|---|
| 1 | Show all four options with their wording on the answer screen, each with its ✓/✗ and its own "why" line, so the explanation and tips can be read against the actual text | FB-001 | Medium (app only, no content change) |
| 2 | Keep the question readable after Coach me, including Android high-contrast text | FB-002 | Small (app only) |

## Later

_Nothing yet._

## Won't do

_Nothing yet._

## Feedback details

### FB-001 · Explanation does not show the options it talks about

**Tester said (6 Nov 2026):**

> The explanations should recap the questions so we can see and compare the
> actual wording. "From Memory" doesn't cut it here. Like this the
> explanation is effectively not usable.

Report footer: Question d1_002 (IS Audit) · Part: Explanation · Pick: bank C
shown as D · Shown order (screen = bank): A=A, B=D, C=B, D=C · Practice ·
Your first five · KaiSip 2.0.0 (Android 17) · Ref R-D28Q.

**What we found (reproduced on 2.0.0):**

- After answering, the screen keeps only **two of the four options**: "Your
  answer" and "Best answer". The other two options' wording disappears.
- The question itself is cut to two lines; "Show question" opens the
  question text but still not the missing options.
- The tips and the full explanation then talk about those missing options
  ("Eliminate: A … and D …"). The letters are correct for the shuffled order
  (the app already swaps them), but the learner has to remember what A and D
  said. That is the "from memory" problem.
- It happens on every question, right or wrong. After a right answer only
  one option is shown, so three of the four disappear.
- Not a content problem: d1_002's key and explanations are correct, and every
  question already has a "why not" line for each wrong option. The fix is in
  the answer screen only.

**Proposed fix (Next update):**

1. On the answer screen, list **all four options in the shuffled order the
   learner saw**, with their display letters:
   - the best answer marked ✓, the learner's pick marked ✗ (when wrong),
   - each wrong option with its own one-line "Why not" under it,
   - the two options named in the Eliminate tip easy to spot, so the tip can
     be read against the real wording.
2. Keep the current focus (your pick and the best answer first and most
   prominent); the other options sit underneath, so the screen does not get
   heavier for learners who only want the verdict.
3. Apply the same to the Results review and the mock exam review, which use
   the same answer layout.
4. Check: screenshots (light and dark, 200% text) with
   `SHOT_QUESTIONS=d1_002,d1_010 npm run shots`, `mobile-ux-reviewer`,
   `mobile-qa-tester`, and a letter-mapping test (shuffled order must match
   the question screen exactly).

**Reply to the tester when shipped:** "Thanks for report R-D28Q. In 2.1 the
answer screen shows all four options with their full wording next to the
explanation, so you can compare them without going back."

### FB-002 · Question becomes unreadable after Coach me

**Tester said (screenshots supplied 9 Nov 2026):**

> Kapag napindot ko ung "coach me"
> Wala lng ung font sa taas ganyan
> Not sure if sa specific question lng

The tester identified the phone as **Samsung S25**. In English: after
tapping Coach me, the question text above becomes unreadable; they are
unsure whether it affects only a particular question.

The attached screenshot shows d1_002 in dark mode: the ordinary question
text is nearly black with an outline, while MOST remains gold and the
hint and answer choices remain readable. App version, Android version and
accessibility settings were not supplied.

**Cause and scope:** Coach me paints a second full question over the first,
with transparent ordinary text and an opaque highlighted word. Android
high-contrast text can paint otherwise transparent glyphs; this matches the
screenshot, but the tester's setting has not been confirmed. The rendering
pattern is shared by highlighted question stems, not just d1_002.

**Fix in review:** Remove the duplicate text layer and animate only the
inline priority word. Preserve theme colours, emphasis, timing, long-stem
sizing, and the underlined Signpost variant. No grading or content changes.

**Acceptance:** Check d1_002 before and after Coach me in light/dark modes,
with high-contrast text on/off and large text on Samsung S25 or an Android
device. Repeat Coach me, resume a hinted question, and move to a new
question. The full stem must remain readable and spoken only once.
