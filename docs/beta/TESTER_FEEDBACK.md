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
| FB-006 | 2026-11-12 | Closed-testing message (no report code) | Phone · every screen with serif text (questions, options, headings) | UX (typography) | Low | Whole app | Merged (#247); native phone check pending | 2.1 |
| FB-007 | 2026-11-13 | R-ZJ67 | Phone · Mock review (question d5_205) | Content | Medium | One question | Implemented for 2.1: question states management's requirement; key D and option order unchanged | 2.1 |
| FB-008 | 2026-11-15 | R-QHER | Phone · bottom buttons (reported on the plant picker, 2.0.0, Pixel, Android 16, three-button navigation) | Bug/UX | Medium | Every screen with a sticky bottom button | Implemented for 2.1: the shared bottom bar now reserves the navigation-bar space; native phone check pending | 2.1 |
| FB-009 | 2026-11-19 | Owner relay of tester feedback | Phone · practice answer screen | UX | High | Every answered practice question | Implemented in a pull request for 2.2 (summary and tips first; choices behind one switch); owner screenshot review and phone check pending | 2.2 |
| FB-010 | By 19 Nov 2026 | R-ZXUQ | Phone · practice answer (question d4_134): could not find the whole question and its options after answering | UX | Medium | Every answered practice question | Implemented with FB-009: one "Show question & options" switch; phone check pending | 2.2 |
| FB-011 | 2026-11-19 | Owner review | Phone · Learn · Concept Lab (RTO/RPO): made the topic more confusing | Learning design | Medium | Learners who open the lab | Hidden in 2.2 behind one switch; redesign and uncoached learner testing before it returns | 2.2 (hide) · Later (redesign) |
| FB-012 | By 19 Nov 2026 | Tester suggestions (messages and the testers' PDF) | Phone · question list, Practice, Settings | Feature requests | Medium | All learners | Implemented in a pull request for 2.2: read-only review of answered questions; a gentle practice countdown with length and area choice; Rate and Share rows in Settings | 2.2 |
| FB-013 | 2026-11-28 | Owner relay of tester feedback (no report code) | Web and phone · CISA question wording | Content (readability) | Medium | Whole bank (also AAIA, written in the same style) | CISA: 171 hard-to-read questions rewritten in plainer, shorter sentences for web v13.1 (blind retest 170 of 171 matched; the one miss was ambiguous before the rewrite and is followed up separately). AAIA next | Web v13.1 · phone: next bundle |
| FB-014 | 2026-11-28 | Owner report (no report code) | Web and phone · every heading, name and avatar initial with a capital J; and the letter f on the website | UX (typography, cosmetic) | Low | Every learner whose name or text has a capital J; every web page for the f | Implemented: web v13.2.1; phone fonts merged for 2.4 (native phone check pending) | Web v13.2.1 · phone 2.4 |

## Feedback quoted on the website

A tester's words go on kaisip.com only with that tester's own yes to the exact
text and name, kept by the owner outside the repo (privacy.html section 3e).
Every quote card carries `data-quote-permission="recorded"` and the reward
disclosure ("CISA Premium free"); `scripts/build_site.sh` treats a home page
quote without them as a draft, which cannot be published. For a translated or
trimmed quote, the tester says yes to the English wording shown, not only to
the original.

| Quote | Shown as | Permission | Where |
|---|---|---|---|
| "The app is user friendly … wasn't tiring to answer." (translated from Filipino, excerpt; the original's comparison with ISACA's question product left out) | Ken L., KaiSip beta tester | Given directly to the owner, 13 Nov 2026, for the English wording shown (owner confirmed 18 Nov 2026; reply kept privately by the owner). The owner confirmed he was offered 6 months of CISA Premium, as the page's disclosure says. The tester also opted in to credit on the beta form, which covers only the in-app thank-you screen. | `home.html` (live from 18 Nov 2026) |

## Next update plan (phone app 2.1, closed testing, build of 18 Nov 2026)

Everything below is in the 2.1 build. Version name on Play: exactly "2.1".

| # | Change | From | Size |
|---|---|---|---|
| 1 | Show all four options with their wording on the answer screen, each with its ✓/✗ and its own "why" line, so the explanation and tips can be read against the actual text | FB-001 | Medium (app only, no content change) |
| 2 | Question d5_205: say in the question that management requires these controls after a risk assessment, so the marked answer (move the rules into a mandatory standard) no longer rests on an unstated fact. A high risk rating alone would not make a control mandatory. Key stays D | FB-007 | Small (one question, plus a web What's New entry) |
| 3 | Sticky bottom buttons own their safe area, so Android's three-button navigation bar can't cover them | FB-008 | Small (one shared component) |

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

### FB-006 · The letter "f" looks different

A closed-testing Android tester wrote: "Just an observation, does the letter 'f' look a bit different? I've seen this in many questions". The owner sees the same odd "f" on the website mockups and asked for it to be fixed across the whole phone app. No report footer came with the message (it was an observation, not an in-app report), so there is no Item, Part, App or Ref to copy.

**Reproduced (12 Nov 2026):** yes, on every screen that sets upright serif text. `npm run shots` (light and dark) shows it in question stems ("fieldwork", "finds"), lesson prose, screen titles and headings, verdicts and word-size stats. Options and body text are Figtree and were never affected; italic lines (the coach's voice, Key idea) have a conventional "f" already.

**Cause:** not a bug and not a fallback font. The brand serif, Fraunces, draws its upright lowercase "f" with a flat, heavy hook. It is the same at every optical size and with every font setting, and the font has no alternate "f" (its f glyphs are f and five ligature glyphs that are only f beside f, i or l).

**Triage:** UX (typography) · Low severity (nothing is blocked or wrong) · Reach: whole app. A typeface change is a brand decision, so it is on the owner's list.

**Options compared** (real phone-size screenshots, in the pull request):

| | Fix | Result |
|---|---|---|
| A | Keep Fraunces everywhere and replace only the upright "f" with a conventional one (from Literata, same open licence), in a renamed copy of the font, "KaiSip Serif" | The "f" looks normal in questions AND headings. Nothing else changes; no text moves. |
| B | Set question text in Figtree, keep Fraunces for headings | Headings keep the odd "f"; questions lose the serif that separates them from the options. |
| C | Set reading text in another serif (Literata), keep Fraunces for headings | Headings keep the odd "f"; adds a third typeface. |

`mobile-ui-designer`, `mobile-ux-reviewer` and `design-manager` each recommended A: it is the only one that meets the owner's wish that the f looks normal everywhere. Their one shared finding (the hook sat too close to a few following characters) was fixed before the pull request.

**Implemented (A), waiting for the owner:** `mobile/assets/fonts/` (the two font files, both licences, a README), `mobile/scripts/fonts/build_kaisip_serif.py` (how they are made), `mobile/src/theme/tokens.ts` and `mobile/src/app/_layout.tsx` (the app loads them), `mobile/app.json` (the home-screen widgets use them). The new "f" is exactly as wide as the old one: a before/after comparison of 91 screens in light and in dark shows changes only at the letter itself. Not yet checked on a real Android phone or iPhone (the screenshots come from the app's web build, which draws the same font file).

**Web (done in web v13.2.1, 28 Nov 2026, with FB-014):** the web app (`index.html`), `beta.html`, the home, legal and help pages and the Beta Desk now load KaiSip Serif too. Until then they loaded plain Fraunces, which is why the owner still saw the old f on the website.

**Reply to the tester when shipped:** "Thanks for spotting the f. It was the typeface's own design, not a glitch. From the next update the letter has a more familiar shape everywhere in the app."

### FB-007 · Password rules in a guideline: is the marked answer right?

**Tester said (13 Nov 2026):**

> The password requirement is a guideline in this instance. An auditor would
> have to understand the management's risk assessment to recommend moving it
> to policy or standard.

Report footer: Question d5_205 (Info Protection) · Part: Answer key · Reason:
the marked answer looks wrong · Pick: bank A shown as C · Shown order (screen
= bank): A=C, B=D, C=A, D=B · Mock review · Mini mock · KaiSip 2.0.0
(Android 16) · Ref R-ZJ67.

**The question today:** "An IS auditor finds password length and lockout
requirements are written in a guideline, and several teams have chosen not to
follow them. Which recommendation is BEST?" A. Add the password requirements
to the annual awareness training program · B. Discipline teams that do not
follow the guideline · C. Let each team's manager approve its own password
rules · **D. Move the requirements into a mandatory standard under the policy
(key)**.

**Review (13 Nov 2026), three reviewers, all agree:**

- Blind test-taker (no key, no complaint shown): picked D at 80% confidence.
  Its doubt was the tester's point: the question never says management wants
  these rules mandatory.
- Domain 5 standards auditor: keep D. Precision finding, not a hard error.
  The explanation leans on "requirements the organization treats as
  mandatory", but the question never states it, and our own style rule says
  the question must hold every fact the answer needs.
- Exam reviewer: keep D, minimal question fix. The tester's point shows a
  missing fact, not a wrong key: no option says "check management's risk
  assessment", and training (the tester's pick) leaves the rule just as
  optional, so it is not better than D. B (discipline) is the right runner-up.
- Earlier sign: when the bank was tagged with its exam principles, taggers
  disagreed on d5_205 and left it untagged.

**Agreed fix (Next update):**

- Question: "Management's risk assessment rates weak passwords as a high
  risk, but an IS auditor finds the length and lockout rules sit only in a
  guideline that several teams ignore. Which recommendation is BEST?"
- Options and key unchanged (D).
- Explanation, key idea and Exam cue tip say that the rules are mandatory
  because management rated the risk high, and that the auditor recommends
  while management decides.
- Optional: add ISO/IEC 27002:2022 Control 5.17 (Authentication information)
  to the source line; correct the item's out-of-date internal history note.
- Check the CRISC question written from this one (crisc_d1_074) for the same
  gap.
- Gates: regenerate domain 5, exam-style lint, repo check, a blind re-test of
  the new wording; web version bump and What's New entry, as for any content
  change.

**Correction (18 Nov 2026):** the agreed wording above derived "mandatory"
from a high risk rating. A high rating alone does not make a particular control
mandatory; management's decision does. The shipped question therefore says:
"Management requires consistent password length and lockout controls following
a risk assessment, but several teams depart from the guideline that sets them out.
Which recommendation is BEST for the IS auditor?" The explanation, key idea and
Exam cue say the same, and note that discipline does not follow automatically.
Options, order and key (D) are unchanged. Source references were kept as they
were (not re-certified). Gates run: domain 5 regenerated, exam-style lint (0
errors), repo check, mobile check.

CRISC mirror crisc_d1_074: already states that the risk exceeds appetite; key D
holds. A precision tweak (say the risk owner selected encryption) is optional
and CRISC is not switched on in the app, so it is not part of 2.1.

**Tester reply:** already sent before this fix; do not resend. When 2.1 is
live, the app shows "Updated after your report" on its own.

### FB-008 · Android navigation buttons cover the bottom buttons

**Tester said (15 Nov 2026, Ref R-QHER):** a screenshot from a Pixel on
Android 16, KaiSip 2.0.0, light theme, text 100%, with three-button
navigation. The system Back/Home/Recents bar covered Cancel and most of "Use
this plant" on the plant picker.

**Cause:** the shared sticky bottom bar is positioned absolutely at the very
bottom of the screen, so it ignored the screen's safe-area padding. On phones
with three-button navigation that padding is the navigation bar's height.

**Reach today:** the plant picker was retired in 2.1 (its links go to You), but
the same bottom bar is used by practice and mock questions, the mock question
map, mock start, onboarding, the fit check, lessons, drills, saved and
mistakes.

**Fix (2.1):** the bar's button area now reserves the bottom and side insets
itself (react-native-safe-area-context SafeAreaView, edges bottom/left/right),
inside the measured footer, so scroll padding still clears the whole bar.
Component test: `mobile/src/__tests__/sticky-footer-safe-area.test.tsx`.

**Still to check on a real phone:** three-button and gesture navigation on
practice, mock, onboarding and fit; no extra gap above the buttons with gesture
navigation; 200% text.

**Tester reply:** already sent; do not resend.

### FB-009 to FB-012 · the 19 Nov 2026 feedback round

Full scope, decisions and what is still unverified: `docs/mobile/RELEASE_2_2.md`, "Learner-feedback round (19 Nov 2026)". In short:

- **FB-009 / FB-010.** The 2.1 fix for FB-001 put every option and its reason under each answer. Testers found that overwhelming and preferred the earlier tips-first screen, and one could not find the question and choices. 2.2 keeps the options findable (FB-001's point) but behind one switch, closed by default, with reasons on request. Mock review is unchanged.
- **FB-011.** The Concept Lab stays in the code, switched off. Do not expand it (PR #244 stays deferred) until a simpler RTO/RPO pilot has been tried by learners without coaching.
- **FB-012.** The answered review cannot show which option was picked for most past answers, because the app never stored it; it says so instead of guessing. Saving the pick for new answers is a later storage change. A tester's idea of making answered review a paid feature is NOT adopted: pricing is the owner's decision.
- **Not adopted from the testers' PDFs:** an exit confirmation on every Back press (no data-loss defect shown), keyword-stuffed store text, a minimum description length, and review prompts or rewards (against Google's guidance).
- **Tester replies:** none sent for this round. Do not claim any of this is fixed until 2.2 is live.

### FB-013 · Some questions read like jumbled words

**Tester said (relayed by the owner, 28 Nov 2026):** some CISA questions
sound like jumbled words, so they are hard to understand.

**Reproduced:** the stems are grammatical but packed. The house style
(`docs/content/EXAM_STYLE_V2.md`: at most 35 words and 2 sentences) pushes
writers to stack possessives ("an IS auditor's sample of a Montenegrin
probation service's decisions"), glue facts with semicolons, and drop small
words. A rough count flags about half of the AAIA stems; the AAIA bank uses
the same style, so it is in scope too.

**Plan:** a new agent, `question-readability-reviewer`, reads each item the
way a candidate does (on a phone, often in English as a second language) and
proposes plain rewrites that keep every fact, the key and the harness limits.
Pilot on samples first, then the whole AAIA bank and the CISA bank, with a
blind retest of every changed question. CISA rewrites are a learner-visible
content change (web version bump and What's New). Changing the 35-word limit,
if the pilot shows it is needed, is the owner's decision.

**CISA rewrite (web v13.1, 28 Nov 2026):** the reviewer read all 1,279 CISA
questions and rewrote 171 stems or options. Five domain auditors compared
every old and new wording (three small corrections), and a blind tester
answered all 171 without the key: 170 matched. The one miss, d3_087, was
ambiguous before the rewrite (the rewrite only moved a phrase) and is
followed up on its own. Packed CISA stems fell from 62 to 23.

**AAIA rewrite (28 Nov 2026, course not yet switched on):** the same pass rewrote
557 of 1,000 AAIA questions. Domain experts made 33 corrections, and the blind
test matched 557 of 557, then 38 of 38 after the corrections.

**Tester reply:** none yet; reply when the phone build with the new wording
ships.

### FB-014 · The capital J looks weird (and the f is still the old one on the website)

**Owner said (28 Nov 2026):** looking at a You tab mockup that shows the name "Jamie" as the title and a "J" in the avatar: "Can you also fix letter J it looks weird". Later the same day, looking at website screenshots and mockups: "Letter f and j is weird. Improve it. I thought we have already fixed f before." No report footer (the owner's own review).

**Reproduced (28 Nov 2026):** yes, both.

- **The J.** Every upright serif "J" on the phone and the website: the You tab title and the avatar initial for a learner called Jamie, John, Joy, Jose or Juan, and words like January, June, July, Japan, Jakarta and "Just" in reading text.
- **The f.** The phone has shown the new f since 2.1 (FB-006). The website did not: the web app, the beta page and the legal and help pages still loaded plain Fraunces, and so did the mockup's bold weight. Only the home page had the fix, and only in its regular weight.

**Cause:** not a bug and not a fallback font.

- The J is Fraunces' own design. It already sits on the baseline (it does not drop below the line). What reads as odd is the stem: it swells to the right on its way down and then curls into the ball, so the letter looks like a boot. It is the same in both upright weights. Fraunces has no alternate J: no stylistic set covers it, the "wonk" setting does not touch it, and its display cut keeps the swelling.
- The f on the website was simply never switched: FB-006's "still to do" list (the web app, `beta.html`, the landing and legal pages) had not been done.
- The italic was checked too. Its capital J does drop below the baseline with a ball at the end, as many italics do, and its f is the usual italic f with a tail. Italic is used for the coach's voice, key ideas, captions and the home page's accent words, not for names, so it is left as it is. Lowercase j is a normal j in both styles.

**Triage:** UX (typography, cosmetic) · Low severity (nothing is blocked or wrong) · Reach: every learner whose name or text has a capital J (names starting with J are very common among our learners), and every web page for the f.

**Options compared for the J** (a comparison sheet for the owner: the real font files at the real sizes, light and dark, one phone wide):

| | Fix | Result |
|---|---|---|
| A | Literata's J, scaled to Fraunces (as was done for the f) | Straight stem. Its square-cut top serif is sharper than Fraunces' soft serifs, so it stands out a little in a heading. |
| B | Fraunces' own J with the swelling taken out of the stem (outline edit by script) | Straight stem, and the serif, the ball and the weight are still Fraunces'. No second typeface involved. |
| C | Fraunces' own J from its display cut (the only "alternate" the font has) | Keeps the swelling, so it does not fix it. |

**Implemented (B):** `mobile/scripts/fonts/build_kaisip_serif.py` now changes the J as well as the f (one constant, `J_CANDIDATE`, picks A, B or C), and writes the website's `.woff2` files beside the phone's `.ttf` files. The new J is exactly as wide as the old one, the same height, and sits on the baseline as before. Measured before and after on the built website (26 strings in both weights on five pages, names and sentences with J included): every string with a J is the same width, and screenshots of Today, You, the home, beta and legal pages differ only at the changed letters, so no line of text moves. One note for the f on the web app: a double f ("effect") in regular weight is 1/2000 of the text size wider than Fraunces' joined ff, about a hundredth of a pixel in reading text; the phone has had the same since 2.1. Every web page now loads KaiSip Serif for upright text (web v13.2.1); the phone gets the new files with 2.4. Checks: `mobile/src/__tests__/kaisip-serif-font.test.ts` (only f, J and the letters built from them differ from Fraunces; the stem is straight; the website's files hold the same fonts; no page loads plain Fraunces) and `scripts/verify_repo.sh`.

**The f:** kept as it is (Literata's f, FB-006). The sheet shows it beside plain Fraunces and beside a fuller-hook alternative at 18, 28 and 44px; the alternative needs about 200 extra spacing fixes to stay clear of the next letter, for little gain.

**Still open:** a look on a real Android phone when 2.4 is built (the screenshots come from the same font files drawn by a browser). The italic J is the owner's call: two options are on the sheet (lift Fraunces' italic J onto the baseline, or take the italic J and f from Literata Italic); either needs a new italic font file on the phone.

**Mockups:** design mockups must load KaiSip Serif from `assets/fonts/` (both weights), not Fraunces from Google Fonts or the old Fraunces files, or the owner sees the old letters again (`docs/mobile/DESIGN_SYSTEM.md`, section 1).
