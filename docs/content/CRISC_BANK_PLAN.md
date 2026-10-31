# CRISC course plan: from the pilot to a sellable pack

**Status:** plan, 30 Oct 2026. CRISC is a **paid course** learners buy in the
app (6-month access, one payment, never renews; see
`docs/business/monetization/RECOMMENDATION.md`). Outline and sources:
`docs/content/CRISC_BLUEPRINT.md`. Item standard:
`.claude/agents/crisc-standards-auditor.md`.

CRISC is not wired into the apps yet (pack delivery is roadmap Stage 2.7 and
the paywall is Phase E), so content work needs no `APP_VERSION` bump. Never
put the bank size in learner copy.

## 1. What a CRISC pack carries

A pack (`mobile/src/content/packs/types.ts`) holds questions per domain, notes,
principles, an exam guide, lessons and game decks. CRISC needs each one before
it can be sold:

| Part | File(s) | Owner agents | Status |
|---|---|---|---|
| Blueprint | `docs/content/CRISC_BLUEPRINT.md` | cert-blueprint-researcher | Done, 30 Oct 2026 |
| Study notes | `data/crisc/notes/d{1..4}.json` | crisc-d{N}-domain-expert | All 43 outline sub-areas, 115 subtopics; audited and fixed in the kickoff PR |
| Questions | `data/crisc/originals/d{1..4}.json` | crisc-d{N}-domain-expert | Pilot, 20 per domain, fully reviewed |
| Citation library | `data/crisc/originals/_framework_library.md` | domain experts | Started with the pilot |
| Principles (mindset cards) | `data/crisc/mindset/principles.json` (schema `docs/content/PRINCIPLES_SCHEMA.md`) | isaca-mindset-coach | Not started |
| Exam guide and final-review week | `data/crisc/exam/` (schema `docs/content/EXAM_GUIDE_SCHEMA.md`) | isaca-mindset-coach | Not started |
| Decision lessons | `data/crisc/lessons/` (schema `docs/content/LESSONS_SCHEMA.md`) | crisc-d{N}-domain-expert, learning-game-designer | Not started |
| Game decks | per the games content in `mobile/src/content/games/` | learning-game-designer | Not started |
| Course description and store copy | this file, section 7 | growth-marketer, app-store-compliance-reviewer | Not started |

## 2. Targets by outline weight

From the blueprint's "Question targets" table (bank of 1,000).

| Domain | Weight | Target | Pilot | Still to write | Per sub-area |
|---|---|---|---|---|---|
| D1 Governance | 26% | 260 | 20 | 240 | 11 × ~24 |
| D2 Risk Assessment | 22% | 220 | 20 | 200 | 9 × ~24 |
| D3 Risk Response and Reporting | 32% | 320 | 20 | 300 | 13 × ~25 |
| D4 Technology and Security | 20% | 200 | 20 | 180 | 10 × 20 |
| **Total** | | **1,000** | **80** | **920** | |

Inside each domain:
- About 15% foundational, 55% application, 30% analysis (the ISACA mix in
  `mobile/src/content/certifications.ts`).
- About 10% AI and machine-learning items, spread across the blueprint's
  "AI across the domains" list.
- Every batch of 20–25: keys balanced (5/5/5/5 in 20); the key is the single
  longest option in 15–30% of items.
- Sub-areas that carry the most decisions get a little more than the even
  split: 1A2 roles, 1B4 appetite and tolerance, 2A4 scenarios, 2B5 inherent
  and residual, 3A1 response options, 3B2 control selection, 3C3 metrics.

## 3. The free sample (what sells the course)

The free tier is about 20% of each course's questions, at least 100,
weighted by domain, plus one diagnostic and one short timed mock. For CRISC
at 1,000 that is 200 items: **52 / 44 / 64 / 40**.

How the sample is chosen:
1. Weighted by domain and spread over every sub-area (at least one item per
   sub-area, so a free learner sees the whole outline).
2. Only items that passed every review stage (blind test, standards audit,
   concept review) with no open finding.
3. Mixed difficulty in the course's ratio, with more application items than
   recall, so the free taste shows how the real exam thinks.
4. Mark sample items with the pack's free-sample flag when Phase E defines it
   (no schema field exists yet; don't invent one in the originals).
5. The sample is fixed per release, so a learner's free progress stays valid.

Until the bank reaches 500 items, the sample is "at least 100" rather than 20%.

## 4. Batch size and cadence

- **Round 2:** 25 items per domain (`crisc_dN_021`–`045`), filling every notes
  subtopic the pilot didn't touch, so each subtopic has at least one reviewed
  item before the bank deepens.
- Then rounds of 25–30 per domain until the targets are met, about nine rounds.
- Run domains in pairs (D3 + D1, then D2 + D4) so reviews stay readable.
- **Cross-domain gate** (`crisc-cross-domain-reviewer`) after round 2, then
  every ~200 new items, and before the course goes on sale.
- Principles, the exam guide and lessons start once round 2 is merged, so
  they can point at real reviewed items.

## 5. The pipeline every batch goes through

Same order as CC. Don't skip a step to go faster.

1. **Author** with `crisc-d{N}-domain-expert` from a notes subtopic.
2. **Self-check:** `python3 scripts/lint_exam_style_v2.py --file data/crisc/originals/dN.json`
   with 0 errors (its "stem names no actor" warning looks for CISA actors;
   every stem must still name who acts). Every `framework_ref` part matches a
   library bullet exactly.
3. **Blind test** with `qa-question-tester` on a copy that has only id, stem
   and options. Compare picks with keys afterwards.
4. **Standards audit** with `crisc-standards-auditor`, plus the domain
   expert's accuracy pass and `isaca-concept-reviewer` for the role lens.
5. **Fix** every HARD ERROR and PRECISION finding; re-blind-test changed items.
6. **Citations:** open every new source (isaca.org and NIST are reachable;
   iso.org, coso.org, theiia.org and eur-lex.europa.eu are not) and add it to
   the library as Verified or Likely.
7. **Notes check:** `notes-application-tester` (pointed at `data/crisc/`) after
   round 2: can a learner answer the reviewed items from the notes alone?
8. **PR** per round, reviewed and merged under the CLAUDE.md PR rules.

## 6. Pilot calibration rules

From the pilot's four blind tests and four standards audits (30 Oct 2026).
Every new batch applies them before review; they are also in the shared
standard (`.claude/agents/crisc-standards-auditor.md`, "Calibration rules").

1. **Lens words are not key-only.** "owner", "assess", "appetite",
   "tolerance", "scenario", "objectives", "evidence", "register" also appear
   in a distractor that stays wrong. Before the fix, a guesser who picked the
   option with one of these words scored about half of each domain.
2. **No option carries its own reason** ("since …", "because …", "so that …").
3. **pre_read is a reading habit, never a reveal.**
4. **The stem holds the deciding fact.** If the explanation beats the
   runner-up with a fact, that fact is in the stem.
5. **Parallel options:** similar length and form; the key is never the only
   option that echoes a stem word.
6. **No key cycle in file order.** Keys balanced and in mixed order.
7. **The candidate is "the risk practitioner" or "the risk analyst".**
   "Risk manager" only as another named role.
8. **Money as `$600,000`.** Subtopic labels: code, ISACA heading in sentence
   case, a period, a short neutral label.
9. **Residual risk** is what remains after a response is IMPLEMENTED (ISACA
   Glossary). A projection for planned controls is a **target**.
10. **Don't mirror our other courses.** Check new items against the CISA and
    CC banks for the same scenario and key (the pilot's crisc_d3_006 had
    mirrored CISA d1_187).
11. **ISACA Glossary terms win** (control owner, MTO/AIW, RTO, ERM, current /
    residual / future residual risk). From the ISACA concept review, 31 Oct 2026.
12. **Read like ISACA, not a prep bank** (authenticity audit, 31 Oct 2026):
    about 25–30% short "Which of the following is MOST …" stems; FIRST keys
    not always "assess" (at most ~60%); one action per key; no absolute,
    urgency or subjective-frequency words as tells; no planted facts; numeric
    options ascending.

## 7. Course description (draft for growth-marketer)

Not written yet. Rules from the compliance review: the product name leads with
KaiSip or a generic course name and puts the exam after "for", for example
"KaiSip IT Risk course, 6-month access (for the CRISC® exam)". Never "Pass",
never a pass promise, never implied ISACA endorsement, the not-affiliated line
on the paywall.

## 8. Pilot results (30 Oct 2026)

| Stage | Result |
|---|---|
| Authoring | 80 items (20 per domain) and 115 notes subtopics covering all 43 outline sub-areas; each domain 3 foundational / 11 application / 6 analysis, 3 AI items, keys 5/5/5/5 |
| Blind test, first round | 80/80 picks matched the keys (20/20 per domain) |
| Standards audit | 3 HARD ERRORS, all fixed: crisc_d1_012 (a second defensible answer), crisc_d2_006 (a second defensible answer when patient safety is at stake), notes 2B5 and crisc_d2_018 (residual risk described as the state after planned, not implemented, controls). About 120 PRECISION fixes, mostly the cue patterns in section 6 |
| Blind re-test of all 80 after fixes | 80/80, no letter-mapping errors after re-lettering |
| Cross-domain gate | 0 HARD ERRORS; 13 PRECISION (4 near-duplicates re-angled, 8 notes contradictions fixed, 1 item stem), 15 observations |
| Citations | 130+ library bullets; every `framework_ref` part matches one; all Verified or Verified (title); no ISO, COSO, IIA or EU source keyed |

**Supporting tasks that need items in round 2** (ISACA concept review, 31 Oct
2026): task 12 (current vs desired state gaps), 13 (what a treatment plan must
contain), 17 and 18 (KPIs and KCIs with control owners), 19 (control maturity
set by risk), 20 (validate data before reporting) and 23 (contractual and SLA
obligations). Areas with only one item: 1A5, 1A6, 1B3, 1B5, 3A2, 3A3, 3A4,
3B1, 3B3, 3C1, 3C2, 3C4, 3C5, 3C6.

**Next round (round 2):** weight it toward D3, which is 6 items short of its
32% share, and keep healthcare to about 1 in 8 stems. Then principles, the exam
guide and lessons once round 2 is merged.

**Open items:**
- The `TO VERIFY` comment on the CRISC entry in `mobile/src/content/certifications.ts`
  can now be removed (weights and titles are verified in the blueprint). That file
  is bundled into `assets/kaisip-cloud.js`, so change it together with
  `npm run web-plant` in a session with the mobile packages installed.
- `scripts/lint_exam_style_v2.py` warns "stem names no actor" on CRISC stems
  that name the risk practitioner or analyst; teach it the CRISC actors.
- `notes-application-tester` and `isaca-concept-reviewer` passes on the notes
  after round 2.
