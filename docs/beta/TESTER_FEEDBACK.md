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
| FB-001 | 2026-11-06 | R-D28Q | Phone · Practice answer screen | UX | High | Whole app (every answered question) | Implemented, release checks pending | 2.1 |
| FB-002 | 2026-11-09 | Owner-provided screenshots | Phone · Coach me | Bug | High | Highlighted question stems | Implemented, native acceptance pending | 2.1 |
| FB-005 | 2026-11-09 | Owner emulator review | Phone · Save backup | UX | Medium | Android backup export | Implemented; isolated native save/restore passed | 2.1 |
| FB-004 | 2026-11-09 | Owner emulator review | Phone · Reset CISA progress | Bug/UX | High | Confirmed full CISA reset | Implemented; isolated native reset/restart passed | 2.1 |
| FB-003 | 2026-11-06 | Beta reply email | Phone · Nickname setup | UX | Medium | New learners | Implemented, native keyboard/a11y checks pending | 2.1 |

## Next update plan (phone app, proposed 2.1.0)

| # | Change | From | Size |
|---|---|---|---|
| 1 | Show all four options with their wording on the answer screen, each with its ✓/✗ and its own "why" line, so the explanation and tips can be read against the actual text | FB-001 | Medium (app only, no content change) |

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

## 2.1 report-to-fix verification (9 Nov 2026)

The owner requested all three entries under the learner-facing “Fixed after learner reports” heading, without names. Verified against the original explanation email (6 Nov, report R-D28Q), the beta invitation reply (6 Nov, difficulty finding username setup), and the owner-provided Coach me screenshots (9 Nov, app screen and accompanying Samsung S25 conversation). No reporter names, addresses or screenshot chat content are copied into public notes.

- **FB-001:** Original email requests option wording alongside explanations. Implemented in practice and mock review with permutation tests.
- **FB-002:** Screenshot shows ordinary question text unreadable after Coach me, with the priority word still visible. Implemented by removing the overlapping question layer. Native high-contrast on/off, dark/light, large-text and Samsung acceptance remain pending; do not mark shipped or verified on those devices.
- **FB-003:** Original email describes an abrupt start and needing to find username setup. Implemented optional local nickname on the existing setup screen. Does not add a sign-in journey. Native keyboard and screen-reader acceptance remain pending.

All three bundled notes describe the implemented change only. Release gates remain in `docs/mobile/RELEASE_2_1.md`; none is marked shipped.

### FB-004 · Reset CISA progress does not return to setup

Owner reported during emulator review: resetting CISA progress appeared not to reset, and they expected a return to onboarding. Code inspection confirmed that the Settings handler clears progress but neither clears the onboarding-complete flag nor navigates; the onboarding guard would send an already-onboarded learner back Home.

Acceptance: cancellation makes no changes; confirmation clears CISA study records and resumes setup only after persistence succeeds; restarting still opens setup; unrelated certification progress, paused sessions and account data are preserved. Existing promised plant identity/cosmetics and report history remain. Native emulator data must not be destructively reset for testing. Isolated regression data is used instead. Release status remains pending until verification.

### FB-005 · Save backup lacks a clear device-local option

Owner reports that Save backup opens sharing destinations such as Gmail, Quick Share and Drive, without an obvious save-on-device choice. Add an explicit Android device-local destination picker alongside existing sharing. Preserve identical backup payload and restore compatibility, avoid broad storage permissions, and report picker cancellation, successful write and write failure truthfully. Tests must use temporary files/mocks, never overwrite the owner’s real backups. Native picker/provider limitations must be documented.

FB-004 implementation checkpoint: reset now commits scoped state before clearing navigation history and opening onboarding. Existing account-removal semantics remain unchanged. Eleven reset regression cases cover cancellation, state scope, persistence/restart, duplicate confirmation, concurrent edits and pre/post-commit write failures. Native destructive reset was not executed on the owner’s data.

FB-005 implementation checkpoint: explicit Android folder-picker save added alongside sharing, using the installed SDK 58 SAF API without broad permissions. A newly created file is written and read back before success. Cancellation, provider/create/write/read failures, partial-file cleanup, duplicate taps and restore compatibility have regression coverage. No real emulator files were created or overwritten. Android may restrict selecting Downloads root; choose/create a subfolder, and choose device storage rather than cloud providers when local storage is intended.

Verification checkpoint (2026-11-09): integrated check passed (355 suites, 7,250 tests, 2 skipped), Android export passed. Native Android folder picker and truthful cancellation verified; no backup file written or user progress reset. Native provider write/restore and destructive reset acceptance remain outstanding.

Isolated native follow-up: FB-004 reset and restart and FB-005 local Documents save/restore passed on a new blank emulator-5556, using synthetic nickname Acceptance and one answered question. Persisted reset state and restored answer equality were checked. Owner emulator-5554 data/files untouched. See docs/mobile/RELEASE_2_1.md for scope and screenshots; these fixes are not yet shipped.
