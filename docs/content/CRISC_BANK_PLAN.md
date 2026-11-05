# CRISC course plan: from the pilot to a sellable pack

**Status:** plan, 30 Oct 2026; round 10 done 5 Nov 2026 (bank 500, on the outline weights). CRISC is a **paid course** learners buy in the
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
| Questions | `data/crisc/originals/d{1..4}.json` | crisc-d{N}-domain-expert | 500 reviewed (130 / 110 / 160 / 100) after round 10, each domain on its weight: a full 150-item mock and a short 50-item mock without repeats |
| Citation library | `data/crisc/originals/_framework_library.md` | domain experts | Started with the pilot |
| Principles (mindset cards) | `data/crisc/mindset/principles.json` (schema `docs/content/PRINCIPLES_SCHEMA.md`) | isaca-mindset-coach | 19 principles; every item tagged |
| Exam guide and final-review week | `data/crisc/exam/` (schema `docs/content/EXAM_GUIDE_SCHEMA.md`) | isaca-mindset-coach | Both done and reviewed |
| Glossary | `data/crisc/glossary.json` (same shape as the CISA glossary) | isaca-mindset-coach, isaca-concept-reviewer | 265 terms; meaning checked against the ISACA Glossary; wording gated by `data/crisc/tools/check_originality.py` |
| Decision lessons | `data/crisc/lessons/` (schema `docs/content/LESSONS_SCHEMA.md`) | crisc-d{N}-domain-expert, learning-game-designer | Not started |
| Game decks | per the games content in `mobile/src/content/games/` | learning-game-designer | Not started |
| Course description and store copy | this file, section 7 | growth-marketer, app-store-compliance-reviewer | Approved with fixes, 5 Nov 2026 (five build items block the sale) |

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

**Owner decision (5 Nov 2026):** the free sample is **10% of the bank, never
fewer than 100 items**, weighted by domain, plus one diagnostic and one short
timed mock of **50 items** drawn only from the sample. This settles the earlier
20% figure here against the 10% in `docs/business/monetization/WEB_GATE_PLAN.md`.
At the 1,000-item launch the sample is 100 (10%).
`scripts/build_free_sample.py` needs the 100-item floor when CRISC is added to it.

**Owner decision (5 Nov 2026): CRISC goes on sale only when the full bank of
1,000 reviewed items is done.** The product-manager recommended 600 (the AAIA
rule); the owner chose the full target instead. At 1,000, two 150-item full
mocks share only about 22 items (15%), and the bank holds six non-overlapping
mocks. The paywall (Phase E) is not built yet, so the bank keeps growing in
rounds of about 25 until 1,000. Learner copy never states the bank size.

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

## 7. Course description (growth-marketer draft, store-compliance approved)

Approved with fixes on 5 Nov 2026 (`app-store-compliance-reviewer`, against
Apple 2.3, 3.1.1, 3.1.2(c) and 5.2.1 and Google Play's Metadata, Payments and
IP rules). Same shape as the approved AAIA copy: free and paid parts separated,
no price, no future features, no bank size, the notice part of the description.

**Product names**
- Google Play product name (53 of 55): KaiSip IT Risk course, 6 months (for the CRISC® exam)
- iOS in-app purchase display name (24 of 30): KaiSip IT Risk, 6 months
- iOS in-app purchase description (42 of 45): 6 months of CRISC® exam prep. Never renews

**Description (variant A, ships first)**

> Coming from IT audit or IT risk? This course teaches the risk practitioner's
> lens: the business owns risk, appetite drives the response, and you analyze
> before acting. It follows the CRISC exam content outline from ISACA®
> (effective 2025): Governance, Risk Assessment, Risk Response and Reporting,
> and Technology and Security.
>
> Free: study notes for all 43 outline areas, a glossary, mindset principles,
> an "About the exam" guide and a final review week, plus a sample of practice
> questions, a diagnostic and a short timed mock.
>
> 6-month access unlocks the full bank of original practice questions and
> full-length timed mocks, drawn fresh each time, at the exam's length and
> time: 150 questions in 4 hours. Every question explains each option and adds
> three coaching tips. One payment, 6 months, never renews.
>
> KaiSip is not affiliated with or endorsed by ISACA®. CRISC® is a registered trademark of ISACA.

- In-app subtitle or Play short description (60 of 80): "Practice for the CRISC® exam: think like a risk practitioner"
- App Store subtitle (28 of 30): "Practice for the CRISC® exam". The App Store
  subtitle belongs to the whole app (today "Practice for the CISA® exam"), so
  use this line only if the app's subtitle changes, or as a course line in the
  app. On Play it can go on a CRISC custom store listing.
- ® rule: the first CRISC in each store field carries ® (each field is shown
  alone); in-app study text and the description body use plain CRISC, with
  the closing notice carrying the ®.
- Variant B (lens first, names the three tips) is the later challenger: a Play
  store-listing experiment or a RevenueCat paywall test only (Apple cannot
  test descriptions). Draft: `crisc_store_copy.md` in the 5 Nov session notes.

**Before submission (these block the sale)**
1. Final review week: day 7 before the exam asks for a full mock, which is
   paid. Free learners get the mini mock that day (and review its misses on
   day 6), with one plain line that the full-length mock is in the full
   course. If the build cannot, change the free list to "a final review week
   plan" and label the step "Full course".
2. Free sample: the short mock and diagnostic draw only from the free sample
   (today `startMock` draws from the whole bank). Settle 10% (WEB_GATE_PLAN)
   versus 20% with at least 100 (section 3) in one place; at 10% of 425 the
   sample (about 43) is smaller than the 50-item mini mock.
3. Paywall: local store price; "one payment · 6 months · never renews"; what
   is free and what is paid; Restore, Terms, Privacy; "practice scores are not
   scaled exam scores"; the trademark notice.
4. Product types: iOS non-renewing subscription, Play prepaid plan. KaiSip
   computes the 6-month end date and makes the purchase available on all the
   learner's devices through the signed-in account and RevenueCat (sign-in
   offered, never forced). Standard iOS restore does not restore non-renewing
   subscriptions, so test restore on a second device.
5. Free extras stay unlocked (notes, glossary, principles, exam guide, final
   review week). A "Practice this concept" link to a paid question shows a
   labelled lock or falls back to a free question.

Also check: the full-mock timer runs 240 minutes on a device; all 43 areas show
in the notes; the paid view shows every explanation and all three tips;
re-check "effective 2025" and the domain names on isaca.org and clear the
`TO VERIFY` comment in `mobile/src/content/certifications.ts`; re-read Play's
policies and Apple's 2.3, 3.1 and 5.2 on the day of submission.

**Sale threshold (owner decision, 5 Nov 2026):** the full 1,000 reviewed items; see
section 3. The free-sample size is settled there too (10%, never fewer than 100;
50-item mini mock), which resolves build item 2's size clash.

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

### Round 6 (4 Nov 2026): 25 items, bank 400

Round 6 added 8 D1 (`crisc_d1_096`–`103`), 13 D3 (`crisc_d3_116`–`128`) and
4 D4 (`crisc_d4_076`–`079`) items. Its theme was keying owner acceptance
within appetite (d1_096, d1_099, d3_116, d3_118, d4_076, d4_077), which had
been keyed in only 5 of 61 cases.

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys |
| Standards audit and concept review | 1 HARD ERROR, fixed: crisc_d3_121 (insurance was a second answer for a rare, high-impact outage; the stem now says the loss above appetite is customers lost for good). Re-angled: d3_125 (mirrored CC cc_d2_044 and crisc_d1_067; now KRI amber levels) and d3_127 (near-duplicate of crisc_d1_018). d4_077 now says "recorded deviation" for a lasting need; d4_076 states "within appetite" |
| Re-blind of changed items | 13/13 |
| Cross-domain gate | 0 HARD ERRORS, 6 PRECISION. The new acceptance keys created a cue: "within appetite" plus an accept option keyed accept in 7 of 8 stems. d1_103, d1_068 and d4_010 are now counter-examples (a rating resting on cover that may not pay; a breach of the board's total that no single owner can accept; a project team without authority). d3_116 and d3_109 now agree with d3_121 (insurance for financial losses) and d3_125 (red marks the tolerance) |
| Balance | D1 103, D2 90, D3 128, D4 79: each within 0.5 points of 26/22/32/20 |
| Gates | All lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes |

**Next round (round 7, +25 to 425):** D1 +7, D2 +4, D3 +8, D4 +6.
- No new "within appetite, so accept" keys; add 2–3 acceptance counter-examples (reserve edit for d2_019 in the round 6 gate file).
- D1: analysis keys on A, C or D; one foundational item keyed B. D2: analysis keys on C. D3: analysis keys on D, at least 2 AI items, at most 2 "Which …" stems, fill 3A2, 3B1, 3C1, 3C2, 3C6. D4: fill 4B3 first; one foundational keyed C.
- Keep apart in practice sets: d1_096/d3_002, d1_099/d4_076, d1_103/d1_037, d3_116/d3_002/d3_118, d3_121/d3_086, d3_122/d3_012, d3_125/d1_067/d3_016/d3_107, d3_127/d1_018, d4_076/d3_087, d4_077/d3_002, d4_078/d4_068, d4_079/d4_070.

### Round 7 (4 Nov 2026): 25 items, bank 425

Round 7 added 7 D1 (`crisc_d1_104`–`110`), 4 D2 (`crisc_d2_091`–`094`),
8 D3 (`crisc_d3_129`–`136`) and 6 D4 (`crisc_d4_080`–`085`) items. Its theme
was acceptance counter-examples, each with a new reason why a within-appetite
rating does not justify acceptance: a legal requirement (d1_105), threat
shifting to a path the rating left out (d2_092), credit for a response not yet
in place (d3_130), and a rating that predates a cloud move (d4_080).

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys |
| Standards audit and concept review | 0 HARD ERRORS; about 20 PRECISION fixes (stems stating the deciding fact, target vs residual risk in d4_081, "excess" not "breach" for category appetite in d1_108, "threat" used in the Glossary sense in d4_083) |
| Re-blind of changed items | 14/14 (d3_118's premise then stated in the stem) |
| Cross-domain gate | 0 HARD ERRORS, 2 PRECISION. Within appetite, acceptance is now keyed in 6 stems and not keyed in 9, so that cue is balanced, but FIRST stems never keyed acceptance. d3_118 is now a FIRST stem keyed on acceptance (nothing changed since the assessment). d2_085's runner-up moved so it no longer shares d1_107's final two |
| Gates | All lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes |

**Next round (round 8, +25 to 450):** D1 +7, D2 +5, D3 +8, D4 +5 (117/99/144/90).
- Acceptance: add one more FIRST-stem acceptance key (D1 or D4) and one BEST counter-example; key "reassess beside accept" only when the stem reports a change after the rating.
- D1: analysis keys on A, C or D; one foundational keyed B. D2: fill 2A3, 2B1–2B4; analysis keys on C; at least one AI item. D3: fill 3A2, 3B1, 3C1, 3C2, 3C4–3C6; analysis keys on D; at most one "Which …" stem. D4: fill 4A3, 4A6, 4B1–4B3; one foundational keyed C, application keys on D.
- Keep apart in practice sets: d1_105/d3_062, d1_107/d1_063/d1_075/d2_085, d1_108/d1_068, d1_110/d4_022, d2_091/d2_087, d2_092/d2_085, d2_094/d2_007, d3_130/d2_018/d2_013, d3_133/d3_014, d3_134/d3_102, d3_135/d2_010, d4_080/d3_058/d4_072, d4_084/d4_010/d3_021, d4_085/d4_075/d3_118.

### Round 8 (5 Nov 2026): 25 items, bank 450

Round 8 added 7 D1 (`crisc_d1_111`–`117`), 5 D2 (`crisc_d2_095`–`099`),
8 D3 (`crisc_d3_137`–`144`) and 5 D4 (`crisc_d4_086`–`090`) items: FIRST-stem
acceptance keys (d1_114, d4_086), a BEST counter-example where the rating left
out a data source (d3_139), silence is not acceptance (d1_117), peer policies
go back to the level that approved both (d1_115), and FAIR secondary loss (d2_099).

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys |
| Standards audit and concept review | 0 HARD ERRORS; about 25 PRECISION fixes. Re-angles: d3_138 (hospital pharmacy, off d1_050) and d3_144. d4_086 moved to a car-rental launch, off the "nothing has changed" phrase, key moved from D to B. Stems now hold the deciding fact (d2_096, d3_140, d1_115 "neither says which prevails") |
| Re-blind of changed items | 15/15, all sure |
| Cross-domain gate | 0 HARD ERRORS, 4 PRECISION. d3_144 re-angled again (it mirrored CISA d2_217): now the concept of concentration risk, lock-in as runner-up. d3_142 runner-up changed (it shared d3_027's final two). Option cues removed ("Agree", "Let", "on record"). Five runs of three identical keys from earlier rounds broken by option swaps |
| Gates | All lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; no run of three identical keys in any domain |

**Next round (round 9, +25 to 475):** D1 +7, D2 +5, D3 +8, D4 +5 (124/104/152/95).
- Outside data: key it at least twice (a D2 likelihood item rated from regional records with the site's own thin records as runner-up; a D3 item where a peer's incident triggers recording an emerging risk). Across the bank, options that take a value from peers, benchmarks or vendors are never keyed (0 of 27).
- Routing verbs: write items where escalate, refer or agree is the wrong answer, and key two where waiting for the scheduled review is right. Put "or", "impact" and "harm" into distractors that stay wrong; key one option that names inherent risk.
- Acceptance: no new "current, within appetite, accept" FIRST items. Write the counter-example (nothing has changed, but the residual rating is above the owner's authority, so the key is to refer the acceptance; D2 or D4, key on A or C) and one BEST stem within appetite that does not key acceptance.
- Vary "set it from the organization's own risk" (keyed in d3_016, d3_033, d3_035, d3_060, d1_019, d3_140, d3_141, d4_090): no new item keys it.
- Keys and settings: D1 needs D keys, D4 needs B keys; plan file order so no three keys repeat. Bank or retailer settings at most twice.
- Near-duplicate scan against CISA `data/originals` as well as AAIA and CC; list every neighbour checked in `_provenance`.
- Keep apart in practice sets: d1_114/d3_118/d4_086, d3_138/d1_050, d3_144/d2_014/aaia_d1_067, d3_142/d3_027/d4_014, d3_137/cc_d2_020, d1_116/d2_013/d3_130, d2_096/d2_056, d2_098/d2_044/d2_065, d3_141/d3_047, d4_089/aaia_d1_012, d1_113/d2_002/d1_105.

### Round 9 (5 Nov 2026): 25 items, bank 475

Round 9 added 7 D1 (`crisc_d1_118`–`124`), 5 D2 (`crisc_d2_100`–`104`),
8 D3 (`crisc_d3_145`–`152`) and 5 D4 (`crisc_d4_091`–`095`) items. Its theme
was breaking answer patterns: two deferral keys where waiting for the scheduled
review is right (d1_123, d3_146), four outside-data keys (d1_124, d2_101,
d2_103, d3_152), a referral of acceptance above the owner's money authority
(d4_091), an inherent-risk key (d2_104) and escalate/refer/agree distractors
that stay wrong.

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys |
| Standards audit and concept review | 0 HARD ERRORS; about 15 PRECISION fixes (d4_091 moved to money limits with tolerance stated; the ambulance fallback drill is a simulation; d3_148 framed as a risk report; subtopic labels that hinted at keys; notes 2A1.1 and 2B5.1 trimmed under 380 words) |
| Re-blind of changed items | 11/11 (d2_103 then states the ten-year area records) |
| Cross-domain gate | 0 HARD ERRORS, 6 PRECISION: d1_118 re-angled onto the reporting route, new runners-up for d1_122 and d1_124, d3_152's copied option pattern replaced, d3_148 reframed as the board's question, d2_018's tip no longer says inherent risk "only" shows reliance |
| Gates | All lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; no run of three identical keys |

**Bank-wide answer cues (found by the round 9 blind test).** When two or more
options mention an owner, the key is among them in 70 of 72 items (97%, chance
53%); a lone owner option is the key in 2 of 59. Options opening "Refer" are
keyed 6 of 10, "Assess" 14 of 28, and an imperative "Accept" 0 of 19. Root
cause: calibration rule 1 is almost always met with exactly one owner decoy.
**Next step before round 10: a cue-rebalancing pass** (about 48 distractor-only
edits, keys untouched; plan in the round 9 cross-domain findings), then a
blind re-test of a sample. Rule 1 is amended so new items also put an owner into
a second distractor when the key names none.

**Cue pass done (5 Nov 2026).** 48 distractors in 47 items were reworded and
every key letter and key text kept. When two or more options mention an
owner, the key is now among them in 70 of 103 items (68%, chance 53%; was 97%).
Options opening "Refer" are now keyed 6 of 15, "Assess" 14 of 33 and "Take" 6 of 12.
Two blind re-tests (47 items) matched every key. They found five reworded
distractors that were half-right or unclear (d1_123 C, d2_019 B, d2_032 B,
d1_105 C, d2_097 D); these were fixed and tested again. Still lopsided, for a later pass if needed:
openings "Update" 7/8, "Propose" 10/14, "Rely" 0/14, "Lower" 0/11,
"Move" 0/13, "Close" 1/21.

**Next round (round 10, +25 to 500):** D1 +6, D2 +6, D3 +8, D4 +5 (130/110/160/100).
- Owner cue: at least 8 items where two distractors name an owner and the key does not (keys that validate data, compare with history, record or analyze).
- Settings: no health, airline or airport, energy or utility, dairy or cooperative. Bank and retailer at most 2. Use charity, school district, rail, mining, research lab, government agency, insurer, publisher, sports club, museum or water transport (each at most once). No third "faulty vendor update".
- No new acceptance-condition items (7 now) and no new "record the emerging risk now" keys. D4 slots go to 4A3, 4A6, 4B1–4B3 and give D4 its missing A key. One outside-figure counter-example in D2 or D3, where a peer or industry figure is the wrong basis because the firm's exposure differs.
- Near-duplicate scan: compare options as well as stems (same outline code), and the option-type skeleton of same-code FIRST items.
- Keep apart in practice sets: d1_118/d1_029/d1_099, d1_124/d1_044/cc_d1_093, d1_122/d1_006, d3_152/d3_020/d3_084, d3_148/aaia_d3_029, d3_149/CISA d4_307, d4_091/d3_024/d1_114/d3_118/d4_086, d1_123/d3_127/d3_045/d1_069, d3_146/d3_058/d1_025, d2_103/d3_152/d2_096, d2_101/d2_049/d2_090, d2_104/d2_018/d2_098/d2_071, d1_121/d1_065, d4_092/d1_063.

### Round 10 (5 Nov 2026): 25 items, bank 500

Round 10 added 6 D1 (`crisc_d1_125`–`130`), 6 D2 (`crisc_d2_105`–`110`),
8 D3 (`crisc_d3_153`–`160`) and 5 D4 (`crisc_d4_096`–`100`) items, the first
written under the owner-balance rule. Highlights: the risk of standing still
(d1_125), an outside-figure counter-example (d2_107: scale an industry rate to
the studio's own exposure), keys that open "Close", "Lower" and "Rely" on
genuine facts (d1_126, d2_110, d3_154, d3_157), deepfakes defeating a credited
control (d2_109) and separate consent for AI training (d4_100).

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys |
| Standards audit and concept review | 0 HARD ERRORS; about 30 PRECISION fixes (Zero Trust stops lateral movement but not entitled access; audit reliance needs the testers' competence and objectivity; stems state the deciding facts in d4_099, d2_110, d3_157) |
| Re-blind of changed items | 17/17 |
| Cross-domain gate | 0 HARD ERRORS, 11 PRECISION. The batch over-applied rule 18 (owner options were mostly the easy eliminations: the key was among them in 3 of 18, and "pick the non-owner of the final two" won 10 to 3); options-only edits on 8 items brought it to 4 of 12 and 3 to 4. d1_126 re-angled off CISA d2_092. Merging duplicate register entries now keeps a link to both sources (matches d3_105). Five stems converted to short "Which" form (D3 25%) |
| Gates | All lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; no run of three identical keys |

**Owner balance is a batch property, not only an item rule.** Rule 18 is now
read with the round 10 lesson: of the items in a batch where two or more
options name an owner, about half should key one of them, and the final-two
count (only the key names an owner vs only the runner-up does) should be even.
Never leave a lone owner option unless it is the key. Check a batch on its own
with the cue counter before review.

**Next step before round 11: a second cue pass** on older items (distractor-only
edits, keys untouched, blind re-test): add an owner to an easy distractor in
about 14 of the 60 older items that key an owner with only one owner
distractor; reduce the "Update" (7/8) and "Propose" (10/14) key openings and the
"Have"/"Ask" (38/256) and outside-data (7/108) never-keyed patterns.

**Next round (round 11, +25 to 525):** D1 +7, D2 +5, D3 +8, D4 +5 (137/115/168/105).
- Owner balance per batch as above; key at least one "wait/defer" option and one "Have/Ask" option; no new "Update" or "Propose" keys; key adjusted outside data sometimes.
- Stem form: at least 3 D3 and 2 D2 items as genuinely short "Which of the following … MOST/BEST" stems (under 20 words, noun-phrase options).
- Settings: at most 2 leisure or culture settings and no health settings (veterinary included). Unused so far: packaging, chemical distribution, textiles, seed or agritech, accounting firm, tax authority, court service, housing association (each once).
- Keep apart in practice sets: d1_126/CISA d2_092/d1_074, d1_127/d3_077, d1_128/d3_101/d3_113, d1_129/d3_047, d1_130/d1_079/CISA d5_338, d2_105/cc_d5_114, d2_107/d2_021, d2_108/d2_014/d3_105, d2_110/d3_155/d2_019, d3_154/d3_006/d3_026, d3_157/d3_069/d3_129, d3_158/d3_105.

**Open items:**
- The `TO VERIFY` comment on the CRISC entry in `mobile/src/content/certifications.ts`
  can now be removed (weights and titles are verified in the blueprint). That file
  is bundled into `assets/kaisip-cloud.js`, so change it together with
  `npm run web-plant` in a session with the mobile packages installed.
- `notes-application-tester` and `isaca-concept-reviewer` passes on the notes
  after round 2.
