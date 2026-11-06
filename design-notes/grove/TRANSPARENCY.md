# Transparency page and AI disclaimer: final spec

Owner request (Sky, 5 Nov 2026): tell learners how the questions are made and
checked, and add a short disclaimer like the chat AI tools have ("AI tools make
mistakes, so double-check with your own judgment").

Merged from four proposals (growth-marketer, compliance, product-manager,
learner-reader). Where they agreed, the majority wins. On a 2-2 split, the
most honest and shortest choice wins. The copy below is final. Paste it word
for word.

## Facts the copy must keep true

- Content is written with heavy AI help, directed by a CISA-certified founder.
- Every question is original wording, mapped to ISACA's current CISA exam
  content outline (`docs/content/CISA_ECO.md`, outline effective 1 Aug 2024).
- Checks: automated checks (schema and style linters, and
  `scripts/check_longest_option.py`, a script) plus AI review checks
  (`cisa-isaca-standards-auditor` and `cisa-d1..d5-standards-auditor` for
  item-writing standards, `cisa-exam-reviewer` for technical accuracy,
  `qa-question-tester` blind, `cisa-citation-provenance-checker`,
  `cisa-citation-realism-checker` and `cisa-framework-currency-checker` for
  sources and currency, `cisa-cross-domain-reviewer` for consistency,
  `cisa-grammar-checker`), then the founder reviews the results.
- There is no outside panel of human reviewers. Never write "experts",
  "reviewed by auditors", "verified" or "accurate" about the content.
- Learners report with Report a problem (phone: under a question, study note
  or lesson step; web: under an answered question). Fixes ship in updates.
- Not affiliated with or endorsed by ISACA. A study estimate is not a
  prediction.

Public copy never names the agents, never copies their descriptions (some
state the bank size), never shows the total question count, and never names
an AI vendor.

## Wording decisions

1. "Written with AI help", never "KaiSip uses AI". The app generates nothing
   at runtime and sends nothing to an AI service. "Uses AI" would suggest a
   live chatbot to learners and to Play reviewers (Data safety says no data
   collected).
2. "ISACA's own materials", not the owner's example wording, which uses a
   banned word.
3. "checks", never "review passes" (contains a banned word).
4. US spelling "judgment" (2-2 split; matches `PILLARS` in `brand.ts` and
   ISACA style).
5. "CISA-certified" without the ® when it describes the founder (3 of 4).
6. "Report a problem" on both web and phone. The web button under an answer
   already reads "Report a problem" (`index.html`, `vr-report`); "Flag" on
   the web is the mock exam's flag for review, so do not tell learners to
   "Flag" a wrong question.
7. Page URL `/how-questions-are-made`, link text "How questions are made"
   (3 of 4).
8. Dropped as unconfirmed or single-proposal claims: "A person reads every
   report" (on the page), "we reply when a question is right", naming Claude
   or ChatGPT.

## 1. Page text (word for word)

File: `how-questions-are-made.html`, served at
`kaisip.com/how-questions-are-made`. Same shell, styles, theme script and
footer as `support.html`. Indexable. No question count anywhere.

Title (h1 and `<title>`): **How KaiSip questions are made and checked**

**Who writes them**
KaiSip's questions, explanations and study notes are written with heavy AI
help. A CISA-certified founder directs the work: choosing the topics, setting
the standard and reviewing the results.

**Original, and mapped to the exam outline**
Every question is written in our own words. None is copied from ISACA or from
a real exam. Each one is mapped to a topic in ISACA's current CISA exam
content outline, the list of what the exam covers.

**How they are checked**
Before a question is added, it goes through automated checks and AI review
checks. They look at:
- whether it follows ISACA's style for exam questions
- whether the answer and explanation are technically right
- a blind test: an AI answers without seeing the key, and we compare
- whether each source it cites is real and current
- whether it agrees with questions in other domains
- grammar and clarity
- whether the longest option gives the answer away

Then the founder reviews the results.

**What we don't have yet**
These are AI checks, not a panel of outside human reviewers. We don't have
one yet. If that changes, this page will say so.

**AI can make mistakes**
AI tools make mistakes, and so do people, so some errors may remain. Check
anything important against ISACA's own materials and your own judgment. Your
readiness range is a study estimate, not a prediction of your exam result.

**Found a mistake?**
Tap Report a problem under the question, study note or lesson step, or write
to certprep.support@gmail.com. Fixes ship in app updates and are listed in
What's new.

Closing line (fine print):
KaiSip is independent and not affiliated with or endorsed by ISACA. CISA® is a
registered trademark of ISACA.

## 2. Short disclaimer (word for word)

> KaiSip's questions and notes are written with AI help and can contain mistakes. Check anything important against ISACA's own materials and your own judgment.

Phone constant: `AI_DISCLAIMER_LINE` in `mobile/src/content/brand.ts`, next to
`PROVENANCE_LINE`. Every surface uses this exact string (one-story rule).

Report sheet line (short, contextual; phone report sheet and web report
modal, same words):

> Written with AI help, so mistakes can slip through. Thanks for telling us.

## 3. Long disclaimer (word for word)

> KaiSip's questions, explanations and study notes are original. They are written with heavy AI help, directed by a CISA-certified founder, and each question is mapped to ISACA's current CISA exam content outline. Before a question is added, it goes through automated checks and AI review checks (exam question style, technical accuracy, a blind answer test, sources and how current they are, consistency across domains, grammar, and whether the longest option gives the answer away). Then the founder reviews the results. There is no outside panel of human reviewers yet. AI tools make mistakes, and so do people, so check anything important against ISACA's own materials and your own judgment. If something looks wrong, use Report a problem; fixes ship in app updates. A readiness range is a study estimate, not a prediction of your exam result. KaiSip is not affiliated with or endorsed by ISACA.

### Terms version (legal register, `terms.html`)

Section 2 "What KaiSip is": replace the sentence "Original questions and
notes, written with AI assistance and checked against ISACA's published exam
outline and standards." with:

> Questions, explanations and notes are originally worded and written with substantial AI assistance under the direction of the founder, a CISA-certified IT auditor. They are mapped to ISACA's published CISA exam content outline and checked by automated checks, AI review checks and the founder. They are not reviewed by an independent panel of human subject-matter reviewers.

Section 5 "The App is provided as is": add after the last sentence:

> Because content is written with AI assistance, it may contain errors that our checks did not catch. Verify anything you rely on against ISACA's own publications and your own professional judgment, and report suspected errors through Report a problem.

Update "Last updated" to the publish date. Mirror both edits in
`docs/legal/cloud/terms.html` (same sentence at line 135) so the two terms
do not drift. Leave the existing legal wording elsewhere in the terms as it is.

## 4. Placements

### Website (landing mode, live now)

| # | File | Change |
|---|---|---|
| W1 | `how-questions-are-made.html` (new) | The page in section 1. |
| W2 | `scripts/build_site.sh` | Add the page to `PAGES` (line 72), the inline-script hash loop (line 153) and the final allowlist `case` (line 248). Otherwise the default `SITE_MODE=landing` build fails or the link 404s. |
| W3 | `_headers` | Add `/how-questions-are-made` and `/how-questions-are-made.html` rules, copied from `/support` (same CSP and theme-script hash). No `_redirects` entry needed. |
| W4 | `beta.html` Common questions | New `<details>` right after the "Will KaiSip help me pass?" item (line 257). Summary: **How are the questions made?** Body: "Written with heavy AI help under the direction of a CISA-certified founder, then checked by automated checks, AI review checks and the founder. AI can make mistakes, so tell us anything that looks wrong." Then a link "How questions are made" to `/how-questions-are-made`. |
| W5 | `beta.html` footer | Add "How questions are made" to `.foot-links` beside Help, Privacy and Terms. Hero unchanged. |
| W6 | `support.html` section 3 | New h3 **How are the questions made and checked?** placed just before "What happens after I report a problem?", answered with the long disclaimer, then the page link. The existing report answer stays as is. |
| W7 | `terms.html` | Terms version above (sections 2 and 5, "Last updated"). |

### Web study app (`index.html`, ships when `SITE_MODE=app`)

| # | Place | Change |
|---|---|---|
| A1 | About modal (line 9227) | Keep the provenance sentence. Add the short disclaimer after it, then a "How questions are made" link. |
| A2 | FAQ "Where do the questions and notes come from?" (line 9287) | Replace the answer with the long disclaimer. |
| A3 | Report a problem modal (`showFlagModal`) | The report sheet line. |
| A4 | Under explanations, results, readiness | No change. |

### Phone (`mobile/`, branch grove-phone-p1)

| # | Place | Change |
|---|---|---|
| P1 | `src/content/brand.ts` | Add `AI_DISCLAIMER_LINE` = short disclaimer. Do not touch `PROVENANCE_LINE` (pinned by `brand.test.tsx`). |
| P2 | Settings > About sheet (`src/app/settings.tsx`) | `AI_DISCLAIMER_LINE` as meta text under `PROVENANCE_LINE`, then a row "How questions are made" that opens the Help FAQ entry from P3 (bundled, works offline). |
| P3 | `src/content/support/index.ts` FAQ | New entry **How are the questions made and checked?** right after "Is KaiSip affiliated with ISACA?", answered with the long disclaimer. This makes 10 entries, the maximum `support-content.test.ts` allows. Add a link to the web page only if the FAQ entry already supports one; do not build one. |
| P4 | Onboarding welcome (`src/app/onboarding.tsx`) | One meta line, `AI_DISCLAIMER_LINE`, directly above `EXAM_TRADEMARK_LINE`, same muted style. No new step. Must pass the onboarding-fit test and the small-phone screenshots; if it does not fit without scrolling, leave it out of this .aab and ship it in the first beta update. |
| P5 | Report a problem sheet (questions, notes, lesson steps) | The report sheet line. Sending works exactly as before. |
| P6 | Under explanations, mock results, readiness | No change. A warning on every answer becomes wallpaper; Report a problem already sits there. |

No new saved keys, no renamed keys, no version bump (Phase 6). Ship order for
the .aab: website parts first (zero .aab risk); phone parts only if
`npm run check` and the Android export are clean on the first try, otherwise
the first beta update.

### Google Play listing (with the listing copy, via app-store-compliance-reviewer)

`docs/mobile/STORE_LISTING.md`, full description, next to the not-affiliated
line:

> Questions are original, written with AI help and checked by AI review checks and a CISA-certified founder. Report anything that looks wrong from inside the app.

Data safety form unchanged. Play's AI-generated content policy targets apps
that generate content at runtime, so this disclosure is voluntary; the listing
and the app must say the same thing.

## 5. Owner decisions (not in this change)

1. **What's New history overclaims** (contradicts "no outside panel"):
   "Every practice question was re-checked by independent reviewers..."
   (`mobile/src/content/support/index.ts:335`, `index.html:27871`,
   `CHANGELOG.md:490`) and "A fresh round of expert review made a set of
   questions clearer..." (`index.html:28019`, `CHANGELOG.md:628`).
   Recommended: "Every practice question was re-checked by AI review checks
   and the founder: clearer wording, more realistic wrong answers and
   up-to-date references." and "A fresh round of review checks made a set of
   questions clearer, so each one has a single best answer and no wording
   gives it away." Strongly recommended before the page goes live.
2. **Beta FAQ title** "Will KaiSip help me pass?" uses a banned word.
   Recommended: "Will KaiSip get me certified?" with the same answer.
3. **"Original · Reviewed Oct 2026"** under each answer (phone `quiz.tsx`,
   web source row) may read as human expert review. Follow-up: make it open
   the FAQ entry (P3), or change "Reviewed" to "Checked".
4. **support.html** says "made by a small team" and tells web users to use
   the "Flag" button on a question, while the web button reads "Report a
   problem". Recommended: "made by a CISA-certified IT auditor" if no one
   else helps, and "Report a problem" in the website help.
5. Confirm the founder's CISA certification is current before publishing.
   CONFIRMED by Sky, 6 Nov 2026: certified February 2026. Keep the yearly
   CPE hours and maintenance fee current so the claim stays true.

## 6. Reviews before merge

`cisa-ux-reviewer`, then the web-page expert panel
(`.claude/workflows/web-page-expert-review.js`, `args.page =
how-questions-are-made.html`), `isaca-language-reviewer` and `learner-reader`
for the page; `mobile-ux-reviewer` with `npm run shots` (About, Help, welcome,
report sheet, light and dark); `npm run check`; `bash scripts/build_site.sh`
in landing mode.

Measure: Report a problem submissions per 100 testers per week (a modest rise
is the goal) and report-to-fix time. Guardrails: beta sign-up clicks hold, and
the exit survey item "I trust the answers and explanations" has a median of 4
or more out of 5.

## Update, 6 Nov 2026 (Sky)
"What we don't have yet" became "Limits we're open about" (AI checking AI can share
blind spots; a big bank built fast is not proof of quality; no outside human
panel yet) plus "What we're doing about it" (the founder hand-checks a random
sample per domain during the beta and the page will report the numbers;
learner reports come first). Promise to keep: publish the sample-review result
on this page when it's done.
