# CRISC course plan: from the pilot to a sellable pack

**Status:** plan, 30 Oct 2026; round 5 done 4 Nov 2026 (bank 375). CRISC is a **paid course** learners buy in the
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
| Study notes | `data/crisc/notes/d{1..4}.json` + `_course.json` (strategy tips, cross-domain connections) | crisc-d{N}-domain-expert | All 43 outline sub-areas, 115 subtopics, Practice this concept links (`data/crisc/tools/sync_practice_ids.py`) |
| Questions | `data/crisc/originals/d{1..4}.json` | crisc-d{N}-domain-expert | 375 reviewed (95 / 90 / 115 / 75) after round 5: a full 150-item mock and a short 50-item mock without repeats |
| Citation library | `data/crisc/originals/_framework_library.md` | domain experts | Started with the pilot |
| Principles (mindset cards) | `data/crisc/mindset/principles.json` (schema `docs/content/PRINCIPLES_SCHEMA.md`) | isaca-mindset-coach | 19 principles; every item tagged |
| Exam guide and final-review week | `data/crisc/exam/` (schema `docs/content/EXAM_GUIDE_SCHEMA.md`) | isaca-mindset-coach | Both done and reviewed |
| Glossary | `data/crisc/glossary.json` (same shape as the CISA glossary) | isaca-mindset-coach, isaca-concept-reviewer | 265 terms; meaning checked against the ISACA Glossary; wording gated by `data/crisc/tools/check_originality.py` |
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
   with 0 errors (its "stem names no actor" check knows the risk
   practitioner and risk analyst; every stem must name who acts). Every `framework_ref` part matches a
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

## 5b. Originality gate for definitions

`data/crisc/tools/check_originality.py --ref <isaca.json>` compares every
glossary definition and notes key term with the ISACA Glossary entry for the
same term and fails on a 6-word run in the same order, a 30% share of shared
3-word phrases, or 0.6 sequence similarity. The reference file is fetched from
https://www.isaca.org/resources/glossary into the scratchpad and is never
committed (ISACA's text stays out of the repo). Run it on every glossary or
notes change; reviewers then check meaning only, so originality reviews can't
loop on sentence shape.

## 5c. App-ready, not switched on

`node scripts/crisc_pack_dry_run.cjs` (run by `verify_repo.sh`) feeds every
CRISC file through the phone app's own pack builders, writing only to a temp
folder: questions, notes (the four domain files plus `_course.json`),
principles, principle tags, the exam guide and final review week, then draws
a full 150-item mock and a 50-item short mock without repeats. CRISC stays off
in the apps until the paid phase: switching it on means a `PACKS` entry in
`mobile/scripts/build-content.mjs` (with the same notes merge) and the web and
paywall wiring.

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

### ISACA quality pass (31 Oct 2026)

| Stage | Result |
|---|---|
| Mindset content | 19 risk-practitioner principles (`data/crisc/mindset/principles.json`) and a 13-section exam guide (`data/crisc/exam/crisc_exam_guide.json`), every exam fact checked against the candidate guide v1.26; all 80 items tagged |
| ISACA authenticity audit | 71/80 passed an item-committee bar before fixes (average 3.40 of 4); 9 rewritten; no originality issues against ISACA's public CRISC quiz |
| ISACA concept review | 2 HARD ERRORS fixed (d2_018 second answer under the Glossary's "future residual risk"; a withdrawn NIST IR 8286C citation); glossary drift fixed (control owner, MTO/AIW, RTO, ERM) |
| Fix pass, per domain | Blind tests 20/20 in every domain; standards re-audit and concept check, then up to two repair rounds |
| Mindset review | 1 HARD ERROR fixed (a principle let the practitioner approve exceptions) and 18 wording fixes |
| Cross-domain gates 2 and 3 | 1 HARD ERROR and 17 PRECISION fixes, mostly role consistency across notes, principles and items; changed items re-blind-tested 8/8 and 7/7 |
| Form now | 22 of 80 items (28%) are ISACA-style "Which of the following" stems; FIRST keys that are assess/record at 33–50% per domain; keys 5/5/5/5; key longest in 2–3 of 20 |

**Supporting tasks that need items in round 2** (ISACA concept review, 31 Oct
2026): task 12 (current vs desired state gaps), 13 (what a treatment plan must
contain), 17 and 18 (KPIs and KCIs with control owners), 19 (control maturity
set by risk), 20 (validate data before reporting) and 23 (contractual and SLA
obligations). Areas with only one item: 1A5, 1A6, 1B3, 1B5, 3A2, 3A3, 3A4,
3B1, 3B3, 3C1, 3C2, 3C4, 3C5, 3C6.

**Next round (round 2):** weight it toward D3, which is 6 items short of its
32% share, and keep healthcare to about 1 in 8 stems. Then principles, the exam
guide and lessons once round 2 is merged.

### Round 3 (4 Nov 2026): 100 items, bank 285

Round 3 added 25 / 20 / 35 / 20 items (`crisc_d1_046`–`070`, `crisc_d2_046`–`065`,
`crisc_d3_051`–`085`, `crisc_d4_046`–`065`). Every sub-area now has at least 6
items, and every notes subtopic has at least one.

| Stage | Result |
|---|---|
| Blind test | 100/100 picks matched the keys |
| Standards audit and concept review | 4 HARD ERRORS, all second defensible answers, fixed: crisc_d1_057 (a legally required ID check), crisc_d3_053 (naming the successor vs handing over), crisc_d4_048 (upside vs controls), crisc_d4_051 (each manager's own assessment). Near-duplicates and mirrors re-angled: d1_047, d1_061, d1_063, d2_049, d2_051 (CISA d5_353), d2_052, d3_072 (CISA d1_206), d3_074 (CISA d2_153), d4_056 (CC cc_d2_010), d4_064. About 90 PRECISION fixes, mostly stem words echoed only in the key, pre_read giveaways and options carrying their own reasons |
| ISACA task 5 | The outline says the practitioner "assigns and validates" ownership; absolute "the practitioner does not assign owners" lines were softened. The bank's convention stays: the practitioner proposes, senior management or the risk owner confirms |
| Re-blind of changed items | D1 12/12, D2 13/13, D3 17/17, D4 13/13 |
| Cross-domain gate | 0 HARD ERRORS, 13 PRECISION: 7 near-duplicates across domains re-angled (d1_058, d1_063, d2_047, d3_066, d3_069, d4_047, d4_048); two apparent contradictions explained in the items (retention: a new business use goes to the data owner, unneeded data is deleted on schedule; tone at the top: words answer praise, actions answer an exemption); the D3 "scale it by risk" key cue and internal-audit filler distractors reduced; notes 3C6.1 ownership wording |
| Gates | All exam-style and notes lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes |

**Next round (round 4):**
- Weight toward D3 (about 6 under its 32% share) and D1 (about 4 under); D4 is 8 over.
- D4 a little light on analysis items (26%).
- Key internal audit's proper role (independent assurance) in 2–3 items, so it stops being an always-wrong option.
- Vary the "scale it by risk" and "owner decides" key forms.
- Tag more items with `escalate-to-the-limit-setter` (7, target 10).
- Add a few short "Which of the following" stems in D3.
- Keep d3_075 and d3_076 apart in practice sets (they test opposite errors on one rule).

### Round 4 (4 Nov 2026): 55 items, bank 340

Round 4 added 25 D1 items (`crisc_d1_071`–`095`) and 30 D3 items
(`crisc_d3_086`–`115`), with 2–3 per sub-area.

| Stage | Result |
|---|---|
| Blind test | 55/55 picks matched the keys |
| Standards audit and concept review | 2 HARD ERRORS, both fixed: crisc_d1_073 (checking the model's other ratings was a second answer) and crisc_d3_091 (the test-data pilot did not meet a go-live-next-week need). Mirrors re-angled: d1_074 (CISA d5_205), d3_103 (CISA d3_046), d3_106 (AAIA aaia_d3_011), d3_109 (CISA d4_200). Terms: d1_081 now uses the Glossary's residual risk, not "retained risk"; d3_104 no longer calls push approvals phishing-resistant |
| Re-blind of changed items | D1 14/14, D3 23/23 |
| Cross-domain gate | 0 HARD ERRORS, 10 PRECISION: d3_107 had a director setting tolerance; d3_099 had the practitioner designing controls; d1_072, d1_095, d3_103 and d3_105 shared lessons or distractors with older items; d1_093 and d1_079 needed the fact that reconciles them with d3_022 and d3_041; seven pre_reads pointed at the key |
| Round 4 priorities | Internal audit is now keyed in its assurance role in d1_078, d3_101 and d3_113; "scale it by risk" and "owner decides" are no longer key cues; `escalate-to-the-limit-setter` has 10 items |
| Gates | All lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes |

**Next round (round 5):**
- Domain 2 only, plus a few Domain 4: against the 26/22/32/20 weights, D1 is +7, D2 −10, D3 +6, D4 −3. Add about 25 D2 and 10 D4 items, and none to D1 or D3 until the others catch up.
- Key internal audit's assurance role in one D4 item (D2 and D4 have none).
- D4 is a little light on analysis (26%).
- Keep apart in practice sets: d3_100/d3_064, d3_112/d3_047/d3_080, d3_114/d3_084, d3_103/d3_104, d3_109/d3_018, d1_091/d1_041, d1_081/d1_070, d1_090/d3_079, d1_088/d3_014, d1_089/d1_036, d3_087/d3_003, d3_093/d3_028, d1_075/d1_063, d1_076/d4_008/d4_058.

### Round 5 (4 Nov 2026): 35 items, bank 375

Round 5 added 25 D2 items (`crisc_d2_066`–`090`) and 10 D4 items
(`crisc_d4_066`–`075`).

| Stage | Result |
|---|---|
| Blind test | 35/35 picks matched the keys |
| Standards audit and concept review | 1 HARD ERROR, fixed: crisc_d2_087 called lost sales and staff time "secondary losses" (they are primary losses in FAIR; NIST IR 8286 Rev. 1 Section 3.3.2's secondary-loss examples are lost customers and penalties). D4 had no hard error and no second defensible answer. Mirrors re-angled: d2_073 (CISA d4_253), d2_089 (crisc_d2_029), d2_090 (crisc_d2_038), d4_069 (crisc_d4_007 setting), d4_074 (CISA d5_199), d4_075 (crisc_d3_004). d2_077 lost a distractor that came close to a second answer |
| Re-blind of changed items | D2 13/13, D4 5/5 (then 074's runner-up moved from the course proof to the liability clause) |
| Cross-domain gate | 0 HARD ERRORS, 5 PRECISION: notes 4A5.2 trap contradicted d4_070 (project log vs register); d2_088 and d1_081 used "not the risk" for the bank's "not the accountability"; d4_075's cue reconciled with d3_004; d4_074 C and d4_072 role wording |
| Firsts | Internal audit keyed in its assurance role in D4 (d4_067); D4 analysis share up to 28% |
| Gates | All lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes |

**Next round (round 6):**
- Against the 26/22/32/20 weights at 375: D1 −2.5, D2 +7.5, D3 −5, D4 0. Add no D2 items. A 25-item round: D1 +8, D3 +13, D4 +4.
- Key owner acceptance within appetite in about 2 D1, 2 D3 and 2 D4 items (acceptance options are keyed in only 5 of 61 cases, so "never accept" is becoming a cue).
- Keep "Which of the following" stems at 25–30% (round 5 slices were 40%).
- D2 analysis keys skew to D (A7/B7/C3/D10): vary them when D2 resumes.
- Keep apart in practice sets: d4_067/d1_078/d3_101, d4_067/d3_012/d3_066, d4_069/d1_031/d4_007/d4_058, d4_070/d4_032/d4_010, d4_072/d4_036, d4_075/d3_004, d4_073/d4_053, d2_086/d1_037, d2_088/d1_070, d2_089/d2_029, d2_083/d2_017, d2_090/d3_083, d2_066/d2_003.

**Open items:**
- The `TO VERIFY` comment on the CRISC entry in `mobile/src/content/certifications.ts`
  can now be removed (weights and titles are verified in the blueprint). That file
  is bundled into `assets/kaisip-cloud.js`, so change it together with
  `npm run web-plant` in a session with the mobile packages installed.
- `notes-application-tester` and `isaca-concept-reviewer` passes on the notes
  after round 2.
