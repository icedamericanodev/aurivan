# CRISC course plan: from the pilot to a sellable pack

**Status:** plan, 30 Oct 2026; round 27 done 13 Nov 2026 (bank 925, on the outline weights). CRISC is a **paid course** learners buy in the
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
| Questions | `data/crisc/originals/d{1..4}.json` | crisc-d{N}-domain-expert | 925 reviewed (241 / 203 / 296 / 185) after round 27, each domain on its weight: a full 150-item mock and a short 50-item mock without repeats |
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

**Cue pass 2 done (5 Nov 2026).** 53 distractors in 49 older items were
reworded, keys unchanged. "Update" key openings went from 7/8 to 7/18 and
"Propose" from 10/16 to about 10/26. An owner was added to an easy distractor
in 15 items that keyed an owner beside a single owner decoy (bank excess over
chance from +12 to about +9 points). Outside-data wording was taken off 16
never-keyed wrong options. Two blind re-tests (49 items) matched every key; ten
small wording fixes followed. Still lopsided: permissive openers ("Let", "Allow",
"Leave") are never keyed (0 of 13); key one where ISACA supports it.

**Next round (round 11, +25 to 525):** D1 +7, D2 +5, D3 +8, D4 +5 (137/115/168/105).
- Owner balance per batch as above; key at least one "wait/defer" option and one "Have/Ask" option; no new "Update" or "Propose" keys; key adjusted outside data sometimes.
- Stem form: at least 3 D3 and 2 D2 items as genuinely short "Which of the following … MOST/BEST" stems (under 20 words, noun-phrase options).
- Settings: at most 2 leisure or culture settings and no health settings (veterinary included). Unused so far: packaging, chemical distribution, textiles, seed or agritech, accounting firm, tax authority, court service, housing association (each once).
- Keep apart in practice sets: d1_126/CISA d2_092/d1_074, d1_127/d3_077, d1_128/d3_101/d3_113, d1_129/d3_047, d1_130/d1_079/CISA d5_338, d2_105/cc_d5_114, d2_107/d2_021, d2_108/d2_014/d3_105, d2_110/d3_155/d2_019, d3_154/d3_006/d3_026, d3_157/d3_069/d3_129, d3_158/d3_105.

### Round 11 (5 Nov 2026): 25 items, bank 525

Round 11 added 7 D1 (`crisc_d1_131`–`137`), 5 D2 (`crisc_d2_111`–`115`),
8 D3 (`crisc_d3_161`–`168`) and 5 D4 (`crisc_d4_101`–`105`) items from a shared
brief (scratchpad `r11_brief.md`). Highlights: a genuine "wait" key (d3_161:
the system is restored and the root-cause review is three days away, so do not
approve a $400,000 replacement on a guess), recurring tolerance breaches
analyzed before the fix or the limit changes (d1_132), correlated risk from
shared unpatched software (d3_166), the bank's first blockchain-and-personal-data
item (d4_105), and "Have"/"Ask" keys (d1_131, d1_133, d2_115, d3_167).

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys |
| Standards audit and concept review | 0 HARD ERRORS; about 25 fixes. Applying rules 18–19 mechanically had made "two owner options are both wrong" and "three owner options include the key" hold every time; seven items were re-shaped (calibration rule 20: mix all four owner shapes). d3_166's explanation now agrees with SP 800-30 on aggregation; d1_136 no longer claims boards never approve the framework |
| Re-blind of changed items | 17/17 |
| Cross-domain gate | 0 HARD ERRORS, 5 PRECISION: d4_103 re-angled off d4_058 (retention follows purpose); analysis-verb openers ("Find" 4/4, "Analyze" 3/3) and "Bring" (4/4) balanced with distractor-only edits; notes 2B3.3 aligned with the bank on aggregation; D4 key-only lens words cut from 5 to 2; the standard's lens line now says the board, with senior management, sets appetite and senior management approves the framework under board oversight |
| Gates | All lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; no run of three identical keys |

**Next round (round 12, +25 to 550):** D1 +6, D2 +6, D3 +8, D4 +5 (143/121/176/110).
- Owner shapes: key 2–3 lone owner options (an owner action as the single best answer beside three ownerless distractors); write at least 3 three-owner items where the key is the one option without an owner. A cue pass on older items should take the owner word off about 8 of the 17 easy lone-owner distractors (d1_070, d1_078, d1_123, d2_019, d2_047, d2_074, d3_053, d3_070, d3_074, d3_085, d3_095, d3_124, d3_132, d3_134, d3_136, d4_040, d4_074).
- Openers: no opener used 4+ times may be keyed above 60%; key none of Find, Analyze, Identify, Check, Bring, Link unless a wrong option in the same item opens with the same verb; put investigative verbs on at least 4 runners-up.
- Stock tells: key one evidence-based threshold change (the old KRI threshold fires on normal activity after a documented volume change; re-set with its owner and the tolerance approver) and one item where the yearly review really is right; write no new "raise the threshold", "accept as it stands" or "wait for the yearly review" distractors.
- Let 2–3 keys per domain be naturally the longest option (D1, D3, D4 sit at 16–17%). One AI item in D4. Settings not yet used: port authority, water bottler, shipyard, cooperative bank (non-retail), seed or agritech (second use), housing association (second use); no reuse of court service, accounting firm, newspaper, toy maker, call-center outsourcer or bus operator.
- Near-duplicate scan: compare the option skeleton of same-code items, not only stems (it caught d4_103/d4_058 and d3_162/d3_153).
- Keep apart in practice sets: d4_091/d3_024, d3_161/d3_115/d3_146, d3_162/d3_153/d1_070, d3_164/CISA d5_204/d1_092, d3_166/d3_144/d1_068, d3_168/d1_007/CISA d1_129, d4_103/d4_058, d4_104/CISA d3_046, d1_132/d1_018, d1_136/d1_013, d2_113/d2_106, d2_115/d2_017.

### Round 12 (5 Nov 2026): 25 items, bank 550

Round 12 added 6 D1 (`crisc_d1_138`–`143`), 6 D2 (`crisc_d2_116`–`121`),
8 D3 (`crisc_d3_169`–`176`) and 5 D4 (`crisc_d4_106`–`110`) items. Highlights:
counter-examples to "never" patterns (d1_139 waits for the yearly exercise
after a minor responder change; d3_175 re-sets a KRI threshold on documented
evidence with the risk owner and tolerance approver), keyed lone-owner options
(d1_141, d3_176), a finding closed on the risk owner's recorded acceptance
(d3_171), a trained AI model as a recovery asset (d4_107) and SLE beside ALE for
a rare severe event (d2_120).

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys |
| Standards audit and concept review | 0 HARD ERRORS; about 30 fixes. Internal audit, not the risk owner, closes a finding (d3_171); the analyst prepares the cost-benefit (d3_174); doubled volume is more total exposure even at an unchanged rate (d3_175); encryption at rest mainly serves confidentiality (d4_108, notes 4B1.1). Four option edits broke the batch's over-used "three owners, key the one without" shape |
| Re-blind of changed items | 17/17, all sure |
| Cross-domain gate | 0 HARD ERRORS, 5 PRECISION. Older tips that the new keys would contradict were scoped (d3_107, d3_136, notes 3A4.1); d3_174 C re-angled off d3_103/d3_069; 14 distractor-only edits in older items brought the three-owner shape to chance (75%) and keyed lone owners to the rule 21 target (25%); eight opener swaps took Bring, Agree, Tell, Ratings, Identify and Link back under 60% |
| Gates | All lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; no run of three identical keys |

New calibration rule 21: a keyed lone owner option is counted apart from rule
1's cap on lens words that appear only in the key.

**Next round (round 13, +25 to 575):** D1 +7, D2 +5, D3 +8, D4 +5 (150/126/184/115).
- Owner shapes per batch: key 1–2 lone owner options and leave no unkeyed lone owner option; 2 three-owner items with the key among the owners and 2 with the key as the lone non-owner; keep two-owner key-in at or below half.
- Stock tells: key one legitimate threshold raise (the board raises a tolerance after an approved strategy change and the practitioner proposes matching KRI thresholds for the owner); write no new "raise the threshold", "accept as it stands", "wait for the yearly review", "sign the acceptance" or "IT accepts" distractors. Write one item where a "Current risk …" option is wrong (the question asks for target risk).
- Lesson saturation: 3C1 already keys "take the changed facts to the risk owner" four times; key a different move there. The near-duplicate scan compares the keyed action and the decoy family across same-code items.
- At least one AI item per domain (D2 had none in round 12). Settings to avoid: payroll provider, freight forwarder, port authority, insurance broker, housing association. Unused: title insurer, mortgage servicer, fund administrator, debt collector, credit bureau.
- Let 2 keys per domain be naturally the longest (D1 and D4 sit near 16%). Decide "KRI owner" against "risk owner" (d3_074, d3_137, d3_160).
- Keep apart in practice sets: d1_143/d3_160, d1_142/d1_134, the four 3C1 "take it to the risk owner" items (d3_069, d3_103, d3_123, d3_174), d3_040/d3_175, d1_139/d1_028/d1_123/d3_146, d1_141/d1_121/d2_060, d3_171/d3_136.

### Round 13 (12 Nov 2026): 25 items, bank 575

Round 13 added 7 D1 (`crisc_d1_144`–`150`), 5 D2 (`crisc_d2_122`–`126`),
8 D3 (`crisc_d3_177`–`184`) and 5 D4 (`crisc_d4_111`–`115`) items, one AI item
per domain. Highlights: the legitimate upward threshold change (d1_145: the
board raised a tolerance after an approved strategy change, so the practitioner
drafts matching KRI thresholds for the risk owner), a "Current risk" option
that is wrong because the question is about a plan's target (d4_114), separation
of duties for an AI coding agent (d4_112), sanitization by data class and next
use under SP 800-88 Rev. 2 (d4_113), and intelligence reports versus indicators
of compromise (d2_122).

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys |
| Standards audit and concept review | 0 HARD ERRORS; about 20 fixes (RTO is the recovery time allowed, not MTO/AIW, in d2_124; senior management names the accountable owner in d3_177; "action owners" named consistently; pre-reads that gave keys away rewritten) |
| Cue check | The batch's owner shapes predicted about half the keys (a shape guesser scored 49%); seven option edits brought it to 30%. New calibration rule 22 sets owner-shape targets for new batches |
| Re-blind of changed items | 14/14, all sure; d4_112's stem then states that the agent deploys its own fixes |
| Cross-domain gate | 0 HARD ERRORS, 5 PRECISION: d2_126 re-angled off d2_062 (a target rating credits a planned sample check only for what it covers); d3_177 keys "Propose" rather than "Name" an owner; d4_114's "Residual" label tell removed; four older wrong options now name "senior management" (it was keyed 13 of 17); incidental fixed periods taken off three options |
| Gates | All lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; no run of three identical keys |

**Next round (round 14, +25 to 600):** D1 +6, D2 +6, D3 +8, D4 +5 (156/132/192/120).
- Fixed periods: striking yearly/monthly/quarterly/weekly/daily options scores 35%. Key 4–5 options whose period is part of the right answer (a monthly KRI trend, a review cycle set by regulation or criticality, a yearly re-approval the policy requires), and in a cue pass remove the incidental period from about 15 wrong options whose explanations never mention time (first candidates: d1_017 D, d1_033 A, d1_056 D, d1_064 C, d1_112 A, d2_047 A, d2_075 D, d3_015 B, d3_022 C, d3_025 C, d3_032 D, d3_070 B, d4_042 D, d4_067 B, d4_068 B, d4_108 D). Target: strike score 28% or less.
- Stock phrases: put "senior management" in at least 4 wrong options where it overreaches; the next "Estimate" and "Help" openers go on wrong options; key 3–4 "Ask"/"Have" options.
- Pause these lesson families (4+ items each): the current/target/inherent rating trio; "practitioner proposes thresholds, owner agrees"; "senior management assigns the owner"; "link X to its register entry". Spend D4 slots on 4A3, 4A6, 4B1, 4B2 and 4B3.
- Settings: no setting more than twice in a batch, no sector over 30%; prefer public sector, health, education, manufacturing, NGO and transport (finance carried 18 of 25 in round 13).
- Owner shapes (rule 22): key one two-owner item where the runner-up is the other owner option, and add 2 lone-owner runners-up.
- Keep apart in practice sets: d1_145/d1_067/d3_175/d3_125, d1_144/d1_005/d3_052/d3_023, d3_177/d3_023/d3_109, d2_126/d2_062/d2_018, d4_114/d3_069, d3_184/d1_135/d3_094, d1_145/d4_112 (both credit-bureau change stories).

### Round 14 (12 Nov 2026): 25 items, bank 600

Round 14 added 6 D1 (`crisc_d1_151`–`156`), 6 D2 (`crisc_d2_127`–`132`),
8 D3 (`crisc_d3_185`–`192`) and 5 D4 (`crisc_d4_116`–`120`) items, one AI item
per domain. Highlights: benefit/value enablement risk in a project's risk log
(d1_151), a practitioner who lacks the expertise for a rating closes the gap
rather than guessing or handing the work back (d1_156), prompt injection where
untrusted text reaches a model (d2_127), a yearly probability limit tested on
its own terms against simulated yearly loss (d2_129), a control's benefit summed
across every risk it reduces (d3_185), a regulator's required frequency as a
floor (d3_188), AI-suggested packages vetted before use (d4_116), backups that
miss the business's RPO (d4_117) and fail-open against fail-secure decided by the
risk owner (d4_118).

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys (21 sure); two mild giveaways fixed (d4_118's lone verb option, d3_185's lookalike pair) |
| Standards audit and concept review | 0 HARD ERRORS. d3_188 re-angled off d1_050; d4_118's options made parallel; d2_128's two-owner shape varied; key-only lens word and Obtain/Merge opener tells removed from d2_130 and d2_132; five pre-reads that pointed at the key rewritten. d1_151 names benefit/value enablement risk and calls capacity a service delivery risk; d1_156 drops an auditor-style "independent rating" reason; four notes bullets no longer overstate a rule (acceptance within appetite, RPO targets, failure settings, personal data of the dead) |
| Cross-domain gate | 0 HARD ERRORS, 3 PRECISION: d4_117's key no longer the only period option (and moved to a fish auction, breaking up a humanitarian cluster); d4_120's key concept follows notes 4B3.1 (and moved from a library to a national archive); d1_156's explanation rests only on stem facts. d3_186 drops a count that pointed at a different lesson; d3_185's stem names the cost the benefit is weighed against; three provenances gained missed neighbours |
| Re-blind of changed items | 4/4, all sure (d3_185, d3_186, d4_117, d4_120); one explanation reworded for clarity (d4_120 A) |
| Gates | All lints 0 errors; originality 0 too close; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; no run of three identical keys; balance exactly 26/22/32/20 |

**Next round (round 15, +25 to 625):** D1 +7, D2 +5, D3 +8, D4 +5 (163/137/200/125).
- Lone owners (rule 22): in at least half of the items with one owner option, put a wrong lone owner on an easy distractor (an owner acting too early, or the wrong owner deciding); key the lone owner in about a third. Bank target: a lone owner in the final two at most 65% (now 73%).
- Fixed periods (carried from round 13): the strike-period guesser still scores 34%. In a cue pass, take the incidental period off about 15 wrong options whose explanations never mention time (d1_033 A, d1_056 D, d1_064 C, d1_112 A, d2_047 A, d2_075 D, d3_015 B, d3_022 C, d3_025 C, d3_032 D, d3_048 B, d3_070 B, d4_042 D, d4_067 B, d4_068 B, d4_108 D), then key 2–3 options whose period is the answer with a period word on a wrong option too. Target 28% or less.
- Pause these lesson families (no new key or runner-up): a legal or regulatory minimum as a floor; many exceptions point to a cause; who approves exceptions; new evidence on an emerging-risk entry; Monte Carlo output against a yearly board limit. Round 14's paused families stay paused.
- Settings ledger: no two items in a round share sector and activity; charity, NGO or refugee settings at most 2 per round; no library, museum, theater, cinema or sports settings; health at most 4. Each author gets a sector list that does not overlap the others'.
- Openers: the next Estimate, Help, Obtain, Examine and State options go on wrong answers, and the next "Keep …" option is a wrong "no change" move. Ask/Have keys at 4–7 per round are fine.
- Keep apart in practice sets: d1_154/d3_119/d1_026, d3_186/d1_025/d3_028/d4_077, d3_192/d3_084/d3_143/d3_176, d2_129/d2_041, d3_188/d1_105/d1_050.

### Round 15 (12 Nov 2026): 25 items, bank 625

Round 15 added 7 D1 (`crisc_d1_157`–`163`), 5 D2 (`crisc_d2_133`–`137`),
8 D3 (`crisc_d3_193`–`200`) and 5 D4 (`crisc_d4_121`–`125`) items, one AI item
per domain on a fresh angle. Highlights: a risk owner may set a stricter limit
than the board's tolerance within their own authority and budget (d1_159), two
plans one event can trigger must not share responders (d1_160), second-line
challenge of AI ratings needs AI skills from outside the model teams (d1_161),
the data that cannot be recreated sets the RPO (d2_133), a detective control's
clean record proves little until a test shows it would catch an event (d2_135),
membership inference on a shared model copy (d2_137), no one owns a check on
their own work (d3_193), an exit plan for a vendor in financial trouble (d3_196),
fixing a missing control that both raises likelihood and voids insurance
(d3_198), and access rules that do not carry into a fine-tuned model (d4_123).

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys (23 sure); one Exam cue that half-argued for the runner-up rewritten (d1_162) |
| Standards audit and concept review | 0 HARD ERRORS. All four keyed lone owners were also the longest option; three of those links broken. Deciding facts and stem echoes taken off keys (d2_133, d2_135, d4_124); a pre-read that gave d1_159 away rewritten. Overstated rules fixed in items and notes: a stricter limit is within the owner's authority and budget, not an "only looser limits go up" rule; RPO is set by vital data that cannot be recreated; action order allows for dependencies and resources; emergency changes keep proportionate testing and a back-out plan; counsel confirms a rule's reach only when it is unclear |
| Fixed-period cue pass | 120 wrong options in 105 older items lost incidental period words (68 matching explanation and tip edits); the strike-period guesser fell from 34% to 25% where it applies. No key changed |
| Re-blind of changed items | 23/23 sure (11 new items and 12 cue-pass items), then 6/6 after the cross-domain gate; three stale wordings fixed and d4_081 D now states its audit is after launch |
| Cross-domain gate | 0 HARD ERRORS, 5 PRECISION: d3_198 re-angled off d1_103; d1_157 moved off d3_138's decoy; d3_193 follows notes 3A2.2; the last "KRI owner" options now say risk owner (d3_137, d3_160); two stale period words from the cue pass removed |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; no run of three identical keys; balance exactly 26/22/32/20 |

**Next round (round 16, +25 to 650):** D1 +6, D2 +6, D3 +8, D4 +5 (169/143/208/130, exactly on weight).
- Keys: D1 A1 B1 C2 D2, D2 A1 B2 C2 D1, D3 two of each, D4 A1 B1 C1 D2. Difficulty (F/A/An): D1 1/3/2, D2 1/5/0, D3 2/6/0, D4 2/1/2. One AI item per domain on a fresh angle.
- Defer family: about 26 wrong "wait for the next or scheduled review" options against 2 keys. Key 2 options where waiting for the scheduled point is right (no trigger: a change inside every threshold, an exception in date and within authority), at least one with "next"; put one defer option on a runner-up; write no new wrong "wait for the review" option. Watch "written" (0/12 keyed).
- Pause these families (no key or runner-up): a control owner wants to weaken a control and the risk owner decides; a sudden drop after a data-path change is a data failure; automated validation of AI output; insurance credit re-rated when cover fails; "ask legal counsel to confirm" FIRST; vendor exit planning; the board cannot see part of the profile. Round 15's paused list stays paused.
- Neighbour checks: compare each new item's keyed action against the bank's key_concept and correct_explanation (three round 15 near-copies were found that way), and search CISA and AAIA for after-the-fix versions of any incident scenario.
- Owner shapes: lone owners on easy distractors in at least half of lone-owner items, keyed in about a third (bank lone owner in the final two now 66%, target 65% or less). Openers: key one "Move", one "Rely", one "Number of …" and one "Keep" option where justified.
- Settings: no hotel group, transport at most 2, health at most 4, no charity, NGO, refugee or leisure settings; non-overlapping sector lists per author.
- Keep apart in practice sets: d1_157/d3_138/d1_050/d3_188, d3_195/d3_040, d3_194/d3_098, d3_198/d1_103, d3_200/d1_116, d1_163/d4_045, d3_196/d4_037, d1_159/d1_042/d3_125, d2_137/d2_025.

### Round 16 (12 Nov 2026): 25 items, bank 650

Round 16 added 6 D1 (`crisc_d1_164`–`169`), 6 D2 (`crisc_d2_138`–`143`),
8 D3 (`crisc_d3_201`–`208`) and 5 D4 (`crisc_d4_126`–`130`) items, one AI item
per domain on a fresh angle. Highlights: an AI offer engine that meets its sales
measure while working against a retention objective (d1_164), apparent
retaliation against a reporter referred to whoever protects reporters before the
reported risk is rated (d1_166), a detector judged by its miss rate on the rare
item it exists to catch (d2_138), the BIA at project approval, before hosting and
recovery design (d2_141), COBIT 2019 design factors (d3_203), an AI agent's
containment rate as a KPI rather than a KRI (d3_206), testing the hand-back to
the main site (d4_127), per-call Zero Trust checks for an AI agent (d4_128) and
tracking code kept off pages with taxpayer data (d4_130). Two items key waiting
for the next scheduled review because the stem says no trigger is met (d1_169,
d3_207), so "wait" is no longer an always-wrong answer.

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys (21 sure); d1_165's key echoed the stem, d3_204's requester was ambiguous |
| Standards audit and concept review | 0 HARD ERRORS. d1_165's options evened and its stem lists all three inventory fields; d2_141's stem moved to project approval so the BIA-timing key holds; d3_207 lost a stock acceptance distractor; d3_203 cites the COBIT 2019 Design Guide; the SP 800-207 Section 5.7 bullet now says agents are assumed to authenticate. d2_138's key became a miss rate, not a raw count; d3_204's requester is the control owner, with internal audit as the wrong decider. Overstated rules fixed on retaliation referral, own failure history, Zero Trust checks and tracking code. Three keys lost a length lead; two D1 notes subtopics trimmed back |
| Re-blind of changed items | 16/16 matched (14 sure, 2 unsure on fair runners-up), then 2/2 after the last edits |
| Cross-domain gate | 0 HARD ERRORS, 4 PRECISION: d3_204's D explanation sends a weakening change to the risk owner (it had said the control owner); d3_206's cue no longer calls a lagging signal leading; d3_205 re-angled off d2_132; d1_165 rests on business impact (criticality and sensitivity), not criticality alone. Defer family: 6 keyed waits against 50 wrong defer options; striking every defer option now scores 29.9% |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; no run of three identical keys; balance exactly 26/22/32/20; longest-option rates 19–20% |

**Next round (round 17, +25 to 675):** D1 +7, D2 +5, D3 +8, D4 +5 (176/148/216/135), which also levels every key spread.
- Keys: D1 A2 B2 C2 D1, D2 A1 B1 C1 D2, D3 two of each, D4 A1 B2 C2 D0. Difficulty (F/A/An): D1 1/4/2, D2 0/4/1, D3 1/5/2, D4 0/4/1. Round 18 to 700 is then +6/+6/+8/+5.
- AI angles the bank lacks: D1 AI systems missing from the asset inventory (1A6); D2 a downloaded model as a supply-chain threat, or synthetic data passed off as real; D3 an AI decision the business cannot explain to those affected; D4 synthetic or masked data for AI testing (4A4).
- Defer family: one genuine keyed wait in D2 and one in D4 (no-trigger fact in the stem, "next" or "scheduled" in the key); no keyed wait in D1 or D3; no new wrong defer option. Target strike-defer 28% or less.
- Owner shapes: at least 3 two-owner items split the pair; 2 three-owner items, at most one keying the non-owner; lone owners on easy distractors in at least half of one-owner items, keyed in about a third and never as the longest option.
- Openers: key Have/Ask in 6–8 items (striking them now wins 30%); put Evaluate, Estimate, Require, Match, Train and Define on wrong options; keep each/every/all off keys unless a distractor has one too. No D4 key longest by characters or words; pad a distractor in d4_116, d4_128 and d4_062 to bring D4's by-words rate down from 26%.
- Settings (each once, non-overlapping): D1 law firm, mining company, wind-farm operator, dairy cooperative, translation agency, waste-management firm, elevator maintenance company; D2 geological survey, irrigation district, contract research lab, recruitment firm, patent office; D3 desalination plant, airport ground handler, engineering consultancy, cold-storage warehouse, print works, tea exporter, flower grower, parking operator; D4 smart-meter installer, customs broker, solar installer, election commission, public transit authority.
- Pause (on top of round 16's list): an AI tool meets its own metric while harming an objective; combining overlapping records so each event counts once; procedure vs standard approver; own history vs changed conditions; a KPI offered as a KRI; Zero Trust per-request checks; BIA timing for a new system.
- Re-check any explanation a fix rewrites against the notes' who-decides rules (d3_204's D was a late blind-test fix that contradicted them).
- Keep apart in practice sets: d3_205/d2_132/d3_041, d3_204/d1_157/d3_138, d1_165/d2_097, d1_164/d1_125/d2_085, the six keyed waits d1_169/d3_207/d1_123/d1_139/d3_146/d3_161 and their twins, d2_140/d2_096/d2_103, d1_167/d1_050.

### Round 17 (12 Nov 2026): 25 items, bank 675

Round 17 added 7 D1 (`crisc_d1_170`–`176`), 5 D2 (`crisc_d2_144`–`148`),
8 D3 (`crisc_d3_209`–`216`) and 5 D4 (`crisc_d4_131`–`135`) items, one AI item
per domain on an assigned angle: AI systems missing from the AI-use register
(d1_172), a backdoor in a downloaded open-weight model that survives
fine-tuning (d2_145), an AI decision no one can explain to the people it
affects (d3_209), and synthetic rather than masked test data (d4_131). Other
highlights: the executive over two owners decides a trade-off between their
objectives inside appetite (d1_170), risk capacity rests on capital, credit and
permits rather than insurance limits (d1_175), progress reported as risk reduced
rather than actions closed (d3_214) and a product owner choosing within the risk
owner's limits (d4_134). Two more keyed waits (d2_147, a change that meets none
of the BIA's revision triggers; d4_132, a standard change on its routine path)
bring the keyed-wait family to eight. Every key spread is now level.

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys (22 sure); keys were never the longest option but strictly the shortest in 8 of 25 |
| Standards audit and concept review | 0 HARD ERRORS. d2_146 no longer cites SP 800-84 Section 5.3 (written for functional exercises) for a tabletop; an Encrypt decoy removed; d3_209's stem names the vendor its options rely on; d3_210's key no longer echoes the stem. Sweeping "owns no risk" wording softened bank-wide; d4_131's masking explanation corrected; d3_211's stem states the exemption rested on a risk assessment; d4_135 no longer borrows the ISO risk definition. D4's by-words longest tell fell from 26% to 23% (d4_116, d4_128, d4_062) and several keys lost a shortest-option tell |
| Re-blinds | 17/17 matched, then 7/7 after the last edits |
| Cross-domain gate | 0 HARD ERRORS, 6 PRECISION: d1_094's cue narrowed to rating disputes (it picked d1_173's wrong option); d3_215 re-angled off d1_142; owners accept within appetite rather than make appetite decisions (d1_175); d3_216 keeps emerging risks in the register; the second line is objective, not independent (d3_213); notes 4A5.2 let a product owner order deferred controls within the risk owner's limits |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; keys level (D4 34/34/34/33); balance exactly 26/22/32/20; strike-defer 28.9%, Have/Ask reverse cue 29.3% |

**Next round (round 18, +25 to 700):** D1 +6, D2 +6, D3 +8, D4 +5 (182/154/224/140, exactly on weight).
- Keys: D1 A2 B1 C1 D2, D2 A1 B1 C2 D2, D3 two of each, D4 A1 B1 C1 D2. Difficulty (F/A/An): D1 1/3/2, D2 1/4/1, D3 2/4/2, D4 1/2/2.
- AI angles: D1 1A5 the manual fallback when an AI service a process depends on fails; D2 2A4 a bias scenario for an AI scoring model; D3 3C5 reporting AI risk to the board in business terms; D4 4A1 an AI service added outside the target architecture.
- Defer: one genuine keyed wait each in D2 and D4, no new wrong defer option (target strike-defer about 28%).
- Owner shapes: two three-owner items (key the non-owner in exactly one); at least 3 split pairs; lone owners on easy distractors in at least half, keyed in about a third, never alone longest or shortest.
- Openers and words: key Have/Ask in 7–8 items with none on wrong options; put each/every/all/any on wrong options in about 6 items; key one IT option where IT acts in its own role and one internal-audit option in its assurance role; no new Update, Propose, Written or Encrypt decoys.
- Length: no key strictly shortest by words in D1, D2 or D4; D4 keys neither strictly longest nor shortest. "Which of the following" stems: 2 each in D1 and D4, at most 1 each in D2 and D3.
- Settings (each once): D1 harbor tug operator, honey cooperative, quarry operator, office cleaning contractor, funeral services company, brick maker; D2 weather service, animal feed producer, pest-control firm, bottled-gas distributor, notary office, tax-preparation firm; D3 salt producer, inland barge operator, hearing-aid clinic chain, sugar refinery, security guarding company, industrial bakery, medical laundry, pallet maker; D4 fire and rescue service, power trading firm, smart-lock maker, vehicle inspection center, data-center cooling contractor.
- Pause (on top of round 17's list): restating ratings after a scale change; second-line access disputes and first/second-line escalation; boards approving acceptances within appetite; owners' conflicting objectives decided by the executive over both; the basis for risk capacity; joint failure or a shared host as one scenario; human review of AI decisions; objectives first for a new technology; standard changes keeping their routine path; BIA revision triggers; emerging means uncertain, not distant; action-plan progress in risk terms; exemption scope for new assets; internal records over complaints for event frequency; a manual control tested at each site; delegation within the risk owner's limits; tabletop scenario choice; test data that protects people and still proves something. The next control-type item keys a type other than detective.
- Neighbour checks: read each new item's wrong options against older items' Exam cues as well (d1_094's cue keyed d1_173's wrong option); both of this round's near-copies crossed domains.

### Round 18 (12 Nov 2026): 25 items, bank 700

Round 18 added 6 D1 (`crisc_d1_177`–`182`), 6 D2 (`crisc_d2_149`–`154`),
8 D3 (`crisc_d3_217`–`224`) and 5 D4 (`crisc_d4_136`–`140`) items, taking the
bank to 700 of the planned 1,000. One AI item per domain on an assigned angle:
the process owner decides the manual fallback when an AI service fails
(d1_180), a complete bias scenario for an AI scoring model (d2_150), AI risk
reported to the board against appetite rather than as model scores (d3_224),
and an AI service added outside the target architecture (d4_136). Other
highlights: a strategy that conflicts with appetite goes to the board (d1_177),
updating only the risk factors that changed (d2_151), backups cut impact, not
likelihood (d2_154), aggregating rare per-asset events across a fleet (d3_221)
and an exception cannot be backdated over a deviation already run (d3_218). Two
more keyed waits (d2_152, a re-rating request with nothing new; d4_138, an
outside outage that shares no cause) bring the family to ten.

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys (20 sure); a length cue (d1_181), an under-specified keyed wait (d2_152) and one overstated explanation (d3_222) |
| Standards audit and concept review | 0 HARD ERRORS. d2_152's stem now says IT cites nothing new; d4_138 teaches whether an outside outage shares a cause; absolutes ("only the board", "set" for "shape", "fines") softened; d3_221 states its 70% assumes independent faults; notes no longer imply only internal audit gives independent assurance. d3_218 was an acceptance-condition item (a paused family) and was re-angled to backdated exceptions |
| Re-blinds | 8/8 matched, then 7/7 after the gate edits |
| Cross-domain gate | 0 HARD ERRORS, 6 PRECISION: d2_020's cue no longer keys d1_177's wrong option; d3_220 no longer ties second-line objectivity to its design advice; d3_224 re-angled off d3_191; d3_217 and d1_037 cues now agree (the true rating and the risk owner come before any control fix); d3_217's key drops a Tell-family opener; d1_181's "business" echo moved to a distractor |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; keys level; balance exactly 26/22/32/20; strike-defer about 28% |

**Next round (round 19, +25 to 725):** D1 +6, D2 +6, D3 +8, D4 +5 (188/160/232/145).
- Keys: D1 A1 B2 C2 D1, D2 A2 B2 C1 D1, D3 two of each, D4 A2 B1 C1 D1. Difficulty (F/A/An): D1 1/4/1, D2 1/3/2, D3 1/4/3, D4 1/3/1.
- AI angles in codes with none yet: D1 1B1 one enterprise method for AI risk ratings; D2 2B1 a vendor's generic model rating against the firm's own context of use; D3 3A2 who owns drift monitoring for a vendor model; D4 4A5 a stage gate before an AI pilot goes to production.
- Defer: one genuine keyed wait in D1 only, on a lesson the ten keyed waits do not teach; no new wrong defer option.
- Owner shapes: two three-owner items (key the non-owner in exactly one); at least 3 split pairs, at most 2 final-two pairs and 1 eliminated pair; lone owners on easy distractors in at least half, keyed in about a third, never alone longest or shortest.
- Openers: key 6 Have/Ask options and put 2 on eliminated distractors (the bank now runs below chance); no Tell-family keys (Inform, Notify, Alert); "Take" and "Share of" on wrong options; restrictive "only"/"just" on wrong options only; one IT key in its own role and one internal-audit key on a new assurance angle.
- Length: D1 needs exactly one key naturally longest by characters (otherwise D1 falls below the 15% floor), D3 one; no key strictly shortest by words in D1, D2 or D4. "Which of the following" stems: 2 in D1, 0 in D2, 2 in D3, 1 in D4.
- Settings (each once): D1 glass recycler, egg producer, school bus operator, uniform supplier, spice importer, dry-cleaning chain; D2 fish farm, flour mill, wastewater treatment plant, battery recycler, land surveying firm, exam board; D3 poultry processor, toll road operator, home care agency, dental laboratory, iron foundry, florist wholesaler, data broker, coworking operator; D4 EV charging network, hospital instrument sterilization service, confectioner, landscaping firm, HVAC installer.
- Pause (on top of rounds 17–18): strategy vs appetite to the board; sanctions after well-judged failures; standards realigned after an appetite change; who decides an AI fallback; IT risk recast as business scenarios; other lines do not replace first-line controls; people weakness weighed by access; Zero Trust (five 4B1 items); the rest listed in `r18_cross_domain.json`.
- Keep apart in practice sets: the ten keyed waits and their twins; d3_224/d3_191; d3_217/d1_037; d1_177/d2_020; d3_220/d1_015/d1_078; d3_222/d4_035; d1_180/d3_056; d1_181/d3_201.

### Round 19 (12 Nov 2026): 25 items, bank 725

Round 19 added 6 D1 (`crisc_d1_183`–`188`), 6 D2 (`crisc_d2_155`–`160`),
8 D3 (`crisc_d3_225`–`232`) and 5 D4 (`crisc_d4_141`–`145`) items. One AI item
per domain, each in a code with no AI stem yet: one enterprise method for AI
risk ratings (d1_183), a vendor's AI rating weighed against the firm's own use
(d2_155), drift checks on a vendor model owned inside the enterprise (d3_226)
and the portfolio board, not the building team, deciding an AI pilot's go-live
(d4_141). Other highlights: a system takes the class of its most sensitive data
(d1_185), a worst case beyond capacity escalated (d1_187), chained
vulnerabilities rated together (d2_158), an RTO short enough for restore plus
catch-up inside the MTO (d2_159), a 100% effectiveness input replaced with a
range (d2_160) and a recurring capture flaw fixed at source (d3_231). One more
keyed wait: a mostly reworded new version of a voluntary framework waits for the
planned review (d1_188), making eleven.

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys (20 sure) |
| Standards audit and concept review | 0 HARD ERRORS in the audit; the concept review raised one: d1_188's wait was challengeable until the stem said the new version is mostly reworded and no threat or business change requires it. Also: d1_188's key no longer copies d2_152's; a shortest-key tell and a second eliminated owner pair removed; within-appetite risks "normally" accepted and monitored (d3_225); residual risk is never zero only with controls (d2_160); late scans misstate time either way (d3_231); stem echoes and "every" tells removed from eight options |
| Re-blinds | 11/11, then 8/8, all sure |
| Cross-domain gate | 0 HARD ERRORS, 6 PRECISION: d3_131 and d1_188 now agree on revised frameworks (re-map when content materially changes; a reworded voluntary version waits); older cues in d1_016/d1_162, d2_035 and d2_064 no longer key round 19 wrong options or contradict keyed avoidance; d3_226 re-angled off d3_005; d4_141's cue keeps the risk owner's acceptance |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; keys level; balance on weight; longest-key floors D1 15.4%, D2 16.2%, D3 15.5%, D4 15.9% |

**Next round (round 20, +25 to 750):** D1 +7, D2 +5, D3 +8, D4 +5 (195/165/240/150, exactly 26/22/32/20).
- Keys: D1 A2 B2 C1 D2, D2 A1 B1 C1 D2, D3 two of each, D4 B2 C1 D2. Difficulty (F/A/An): D1 1/3/3, D2 1/3/1, D3 1/5/2, D4 1/2/2.
- AI angles: D1 1A2 an AI system's RACI makes the builders accountable for outcomes; D2 2A4 slow model drift as a scenario with its time element; D3 3A4 repeated AI-output issues tracked as one finding with its cause; D4 4A2 harmful AI outputs count as incidents even while the service is up.
- Defer: one genuine keyed wait in D3 or D2 on a lesson the eleven keyed waits do not teach; no new wrong defer option, including "until … complete" delays.
- Owner shapes: two three-owner items keying an owner; split pairs on the runner-up (2) and the key (1–2); lone owners keyed in at most 1 in 5; final-two owner key and runner-up even.
- Openers: key 6 Have/Ask and put 2 on eliminated options; one IT key in its own role and one internal-audit key on a new assurance angle; "portfolio board" on a wrong option next time; Take, "Share of", only/just and each/every/all/any on wrong options.
- Length: D1 and D3 each need exactly one key naturally longest by characters (floors); no key strictly shortest by words in D1 or D2. "Which of the following" stems: D1 2, D2 1, D3 2, D4 1.
- Settings (each once): D1 paper mill, building society, pest control firm, agricultural cooperative, jewelry retailer, reinsurer, plumbing contractor; D2 sawmill, dialysis provider, ready-mix concrete supplier, remittance firm, domain registrar; D3 pet food maker, bicycle maker, microfinance lender, garden center chain, bottling plant, nursing home operator, market research firm, car-sharing service; D4 web hosting firm, circuit board maker, vocational college, blood bank, student housing provider.
- Pause (on top of rounds 17–19): common rating methods and scales; risk duties in role descriptions; class from the most sensitive data; profile-update triggers; a worst case beyond capacity; framework version changes; a supplier's AI rating for another use; late losses added to the event; threat models through suppliers; chained vulnerabilities; RTO plus catch-up; 100% effectiveness inputs; the rest in `r19_cross_domain.json`.
- Keep apart in practice sets: the eleven keyed waits and their twins; d3_131/d1_188; d3_226/d3_005; d2_159/d2_035/d1_029; d2_160/d2_064/d3_087; d1_186/d1_016/d1_162; d4_141/d4_072.

### Round 20 (12 Nov 2026): 25 items, bank 750

Round 20 added 7 D1 (`crisc_d1_189`–`195`), 5 D2 (`crisc_d2_161`–`165`),
8 D3 (`crisc_d3_233`–`240`) and 5 D4 (`crisc_d4_146`–`150`) items, taking the
bank to 750, three quarters of the planned 1,000. One AI item per domain, so
every outline code now has an AI stem: the business owner, not the builders, is
accountable for an AI system's outcomes (d1_189); slow model drift built as a
scenario with its time element (d2_161); repeated AI-output issues tracked as
one finding with its cause (d3_233); harmful AI outputs can be incidents while
the service is up (d4_146). Other highlights: internal audit's follow-up
confirms a reported fix to its own finding (d1_195, the first internal-audit key
in its assurance role for several rounds), an RPO judged at peak (d4_147), a
blockchain that shows changes but cannot prove entries true (d4_148) and purpose
set before collection (d4_150). One more keyed wait: a new control's operating
test waits for enough runs to sample (d3_238), making twelve.

| Stage | Result |
|---|---|
| Blind test | 25/25 picks matched the keys (22 sure); length and stem-echo cues in five items |
| Standards audit and concept review | 0 HARD ERRORS. d3_239 left a paused family; d3_236's figures stopped twinning d2_163; d1_193's stem states why payroll comes first; d1_195 asks internal audit rather than directing it and its stem says the finding is audit's; "each" off three keys; overstated rules fixed (every wrong AI answer an incident; a ledger keeps entries unchanged; a KRI always replaced; "cost-justified" without its basis); notes restore "independent" assurance and "often" for walkthroughs |
| Re-blind | 10/10, all sure |
| Cross-domain gate | 0 HARD ERRORS, 7 PRECISION: notes 3A4.1 no longer key d1_195's runner-up; d3_136's independence point scoped; d4_013 and notes 4A7.1 call a ledger tamper-evident; d1_189 and d2_165 re-angled off near-copies; d1_193's Final two separates the BIA target from the seasonal order |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; keys level; balance exactly 26/22/32/20; longest-key floors 15.3–15.8% |

**Next round (round 21, +25 to 775):** D1 +6, D2 +6, D3 +8, D4 +5 (201/171/248/155). Code placement, key letters, difficulty and settings are in `r20_cross_domain.json`.
- Length floors: D1, D3 and D4 each need exactly one key naturally longest by characters, or each falls to about 14.9% and fails the lint; D2 at most one. No key strictly shortest by words in D1 or D2.
- AI angles (codes with one AI stem): D1 1B5 vendor AI terms that conflict with customer confidentiality commitments; D2 2B4 loss frequency for an AI model from its validated error rate and volume; D3 3C4 trends in a model's human-override rate; D4 4A1.
- Defer: one genuine keyed wait in D2 on a new lesson (for example a medium flaw on an isolated system goes in the scheduled patch cycle); no new wrong defer option.
- Owner shapes: two three-owner items (the non-owner keyed in at most one); two eliminated owner pairs; lone owners keyed at most once.
- Openers and words: key 4 Have/Ask (at least 2 "Ask", no "Have" key in D1) and put 3 "Have" on eliminated options; Tell-family, Take, "Share of" and only/just on wrong options; key one "Number of" where a count is right; in D1 key 2 options that naturally carry each/every/all.
- Pause (on top of rounds 17–19): RACI accountability with the business owner; IT goals cascade; speak-up routes; vague standards made measurable; seasonal or peak impact; asset value from enabled revenue; who closes an audit finding; AI drift scenarios; review frequency by risk; cost-benefit time basis and full cost; and the rest in `r20_cross_domain.json`.
- Neighbour checks: read each new item's runner-up and Final two beside its top same-code neighbour; read every notes line in the item's code and in the code of the rule it relies on; when a review narrows a rule, grep the bank, notes, principles and glossary for the absolute form.

### Round 21 (12 Nov 2026): 25 items, bank 775

Round 21 added 6 D1 (`crisc_d1_196`–`201`), 6 D2 (`crisc_d2_166`–`171`),
8 D3 (`crisc_d3_241`–`248`) and 5 D4 (`crisc_d4_151`–`155`) items, taking the
bank to 775. One AI item per domain: a vendor's AI terms that clash with
customer confidentiality commitments go to the contracts' owner first (d1_198);
an AI model's loss frequency estimated as a range from its validated error rate
and volume (d2_170); a rising human-override rate investigated with the model's
owner (d3_246); and generative AI services the architecture standards omit, which the
architecture review board covers with approved patterns (d4_151). Other highlights: the risk profile
against the full register (d1_196), unit limits that must together fit inside
the enterprise appetite (d1_197, d1_201), a deputy named in the continuity plan
(d1_200), control pass-through arithmetic (d2_171) and a KRI counted where the
base grows (d3_245). One more keyed wait: an unreachable, unexploited medium flaw
goes in the routine patch cycle (d2_167), making thirteen.

| Stage | Result |
|---|---|
| Blind test | 24/25; d1_198 disputed because the stem did not say who owned the customer contracts |
| Standards audit | 1 HARD ERROR: d1_196's option A also described a risk profile under its own citation (NIST IR 8286 Rev. 1 Table 7), now the full register; d1_198's runner-up split from the key on more than who rates it; stem echoes removed from six keys or runners-up; d3_246's option A moved off a CC near-copy |
| Concept review | 0 HARD ERRORS, 8 PRECISION: the d1_198 stem names the sales director's contracts and notes 1B5.3 sends clashes to the commitments' owner; outage limits agreed with the business owners (d1_201); emergency patching for severe or actively exploited flaws only (d2_167); d3_245's KRI defined in the stem; assurance through the vendor's relationship owner (d3_242); notes 4A1.1 names the architecture review board |
| Re-blind | 17/17 (12 sure) |
| Cross-domain gate | 0 HARD ERRORS, 5 PRECISION: four Exam cues narrowed to their stem's trigger so they no longer read against older keys (d4_031, d4_154 vs d3_029, d3_241 vs d4_129, d3_245 vs d3_222); d3_242's wrong explanation says a bridge letter covers a gap in time, not a new site |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; keys level; balance exactly 26/22/32/20; longest-key floors 15.2–15.5% |

**Next round (round 22, +25 to 800):** D1 +7, D2 +5, D3 +8, D4 +5 (208/176/256/160). Code placement, key letters, difficulty and settings are in `r21_cross_domain.json`.
- Length floors: every domain needs exactly one key naturally longest by characters (without one, D1, D2 and D3 fall below 15% and D4 sits at the edge). Never apply a review fix that shortens a floor key without re-running the lint. No key strictly shortest by words in D1 or D2.
- AI angles: D1 1A5 (an AI tool's manual workaround that newer staff have never run), D2 2B1 (an AI assessment's scope covers its data pipeline and the people who act on its outputs), D3 3B1 (keyed corrective), D4 4B1.
- Defer: one genuine keyed wait in D1 on a new lesson; no new wrong defer option.
- Owner shapes: owner keyed in about half of owner items; lone owners keyed at most twice, and a keyed lone owner is never the longest or shortest option.
- Openers and words: key 3 "Ask" outside D1 and no Have/Ask in D1; "Have" on 3 wrong options; Tell-family, Take, "Share of" and restrictive only/just on wrong options (only/just missed in rounds 20 and 21); key one "Number of" in D1 or D4.
- Pause (on top of rounds 17–20): profile against register; unit limits within appetite; supplier terms against customer commitments; audit-timed risk work; plan invocation deputies; loss event against near miss; patch speed by exploitation; and the rest in `r21_cross_domain.json`.
- Neighbour checks: when a new Exam cue sets an order ("before", "not") or a measure preference (count, share, rate), grep every older cue and notes line for the same nouns and phrase the cue on the stem's trigger fact.

### Round 22 (12 Nov 2026): 25 items, bank 800

Round 22 added 7 D1 (`crisc_d1_202`–`208`), 5 D2 (`crisc_d2_172`–`176`),
8 D3 (`crisc_d3_249`–`256`) and 5 D4 (`crisc_d4_156`–`160`) items, taking the
bank to 800, four fifths of the planned 1,000. One AI item per domain: a manual
workaround for an AI scheduler that most staff have never run is exercised with
the process owner at full volume (d1_205); an AI assessment's scope covers its
data loop and the people acting on its outputs (d2_174); automatic rollback to
the last approved model version classed as a corrective control (d3_252); and
answer screening layered behind a retrieval assistant's prompt filter (d4_158).
Other highlights: internal audit's test exceptions as a source of unreported risk
events (d2_172, the first internal-audit key in D2 for several rounds); acceptance
changes an entry's status, not its rating (d1_207); a per-record liability term
measured by the number of records held (d1_208, the first keyed "Number of" in
D1); credit for a control's effect, not the count of controls (d2_176); and
consent records under the retailer's own policy (d4_160). One more keyed wait:
an assessment's scope waits for the board's approved strategy when it is not
needed before then (d1_202), making fourteen.

| Stage | Result |
|---|---|
| Blind test | 25/25 (23 sure) |
| Standards audit | 0 HARD ERRORS, 8 PRECISION: d1_207 and d2_173 no longer have one side settle a disputed rating; d3_256's runner-up moved off d3_205's shape; d4_159's options made parallel; two Exam cues narrowed (d4_157, d2_174); two pre_reads that revealed the key; a stray "wine club" setting |
| Concept review | 1 HARD ERROR: d1_203 carried a Bloom level outside the schema, now Foundational. PRECISION: overstated rules softened (d2_175 inherent risk and closure, d4_158 output screening, d3_250 spend in tiering); d1_208's key made parallel; notes 1A1.1 allows scoping on a draft when the work cannot wait, and 2A1.2 restores control-test exceptions |
| Re-blind | 9/9 (8 sure) |
| Cross-domain gate | 0 HARD ERRORS, 4 PRECISION: owners agree ratings on evidence rather than deciding them (d2_173, notes 2B1.1); the CRO keeps the register template with the approved categories (d1_203); d3_256's tips rest only on the stem's facts and keep the fix-or-state condition |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; keys level; balance exactly 26/22/32/20; longest-key floors 15.2–15.6% |

**Next round (round 23, +25 to 825):** D1 +7, D2 +5, D3 +8, D4 +5 (215/181/264/165). Code placement, key letters, difficulty and settings are in `r22_cross_domain.json`.
- Length floors: every domain needs exactly one key naturally longest by characters (D1–D3 fall below 15% without one). No key strictly shortest by words in D1 or D2.
- AI angles: D1 1B1 (an AI capability adopted too slowly as a benefit or value-enablement risk), D2 2B3 (an AI feature switched on by vendor update gets its own linked register entry), D3 3B3 (an ML fraud detector tested on confirmed cases after its training cut-off), D4 4A5.
- Defer: one genuine keyed wait in D2 or D3 on a new lesson; no new wrong defer option.
- Owner shapes: owner keyed in about half of owner items (round 22 keyed 4 of 11).
- Openers and words: key IT in its own role in D1 or D2 (missed in round 22); "Take" on 2 wrong options (1 in round 22); 2 "Ask" keys outside D1; "Tell" on 2 wrong options; restrictive only/just on 2 eliminated options; key one "Number of" in D4 or D2.
- Pause (on top of rounds 17–21): scoping on approved objectives; register templates and categories; standards following a change above them; people exercising a fallback at real load; owners' ratings changed without evidence and acceptance taken as a re-rating; per-unit liability sized by count; control-test exceptions as event sources; and the rest in `r22_cross_domain.json`.
- Neighbour checks: when an explanation, key concept or cue names who decides, sets, agrees or approves, grep the bank's keys, cues and notes for the same object and use the bank's verb (owners agree ratings on evidence; senior management approves taxonomy and scales; the CRO keeps and publishes); read each Final two against the stem's facts.

### Round 23 (12 Nov 2026): 25 items, bank 825

Round 23 added 7 D1 (`crisc_d1_209`–`215`), 5 D2 (`crisc_d2_177`–`181`),
8 D3 (`crisc_d3_257`–`264`) and 5 D4 (`crisc_d4_161`–`165`) items, taking the
bank to 825. One AI item per domain: slow AI adoption rated as a benefit or
value-enablement risk with its business owner (d1_213); an AI feature switched on
by vendor update that adds a new data use gets its own linked register entry
(d2_180); an ML fraud detector tested on fraud confirmed after its training period,
including cases it did not flag (d3_260); and AI projects ranked on benefit and
rated risk with a business owner (d4_165). Other highlights: IT keyed in its own
role, checking the SaaS settings the firm controls (d2_178, carried from round 22);
an analyst discloses a design role before rating the process (d1_210); an owner
needs authority to fund and accept (d3_258); experts' calibration counted against
outcomes (d2_181); retention counted from the end of employment (d4_164). One more
keyed wait: an event inside the frequency and size a rating assumed fits the rating
and is logged for the scheduled review (d3_262), making fifteen; older cues and
notes that said to reassess after any event were narrowed to agree.

| Stage | Result |
|---|---|
| Blind test | 25/25 (20 sure) |
| Standards audit | 0 HARD ERRORS, 15 PRECISION: older "reassess after any event" cues and notes (d2_001, d2_072, notes 2A1.1) narrowed for the keyed wait; Final two and explanations rest only on stem facts (d1_211, d2_178, d3_260); paused-family and same-code skeletons moved (d1_209, d3_257); a stock acceptance decoy replaced (d2_180); "approves" for data owners (d4_164); a construction setting swapped so no sector passes 30% |
| Concept review | 0 HARD ERRORS, 10 PRECISION: overstated rules softened ("fits" not "confirms" for d3_262; likely and harmful for problem priority, d4_162; a peer review is a safeguard, d1_210); d3_260 includes fraud found without a flag; d3_261's distractor made a source, not a metric |
| Re-blind | 9/9 (7 sure); d3_260's Final two corrected (held-back cases come from the training period); three stem-to-key echoes removed |
| Cross-domain gate | 0 HARD ERRORS, 7 PRECISION: older cues on fixes before analysis allow a fix a standard already requires (d2_006, d2_116); d3_075 and notes 2B3.2 name serious incidents as triggers; d3_259 pairs a fixed expiry with a plan to comply (d3_093); notes 2B3.3 "apply the approved" taxonomy; notes 4A2.2 problem priority by likelihood and harm |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; keys level; balance 26/22/32/20; longest-key floors 15.2–15.8% |

**Next round (round 24, +25 to 850):** D1 +6, D2 +6, D3 +8, D4 +5 (221/187/272/170, exactly on the weights). Code placement, key letters, difficulty and settings are in `r23_cross_domain.json`.
- Length floors: one key naturally longest by characters in D1, D2 and D4, and TWO in D3 (one alone leaves D3 at 15.07%).
- AI angles: D1 1B5 (AI obligations across jurisdictions mapped by use and whom it affects, in the obligations register), D2 2A3 (model files and ML libraries from a public hub in vulnerability identification), D3 3B1 (AI RMF outcomes mapped into the existing control library), D4 4B3 (an erasure request reaching a fine-tuned model).
- Defer: no keyed wait and no new wrong defer option; the "no trigger met, so the scheduled review" shape is paused (seven items teach it).
- Owner shapes: at most 5 owner pairs (round 23 had 11); key 2 lone owners.
- Openers and words: "Take" on 2 wrong options, "Review" and "Evaluate" openers on wrong options, "Share of" on 2 D3 wrong options (all short in round 23).
- Sector rule: food and drink counts as its own sector, not manufacturing.
- Pause (on top of rounds 17–22): the keyed-wait shape; slow AI adoption as risk; owner authority to fund and accept; inventory scope for vendor devices; portfolio ranking with rated risk; and the rest in `r23_cross_domain.json`.
- Neighbour checks: when a new keyed action is "fix it now" or "wait", grep older cues for the opposite order ("before anyone picks the fix", "reassess after") and narrow them in the same round.

### Round 24 (12 Nov 2026): 25 items, bank 850

Round 24 added 6 D1 (`crisc_d1_216`–`221`), 6 D2 (`crisc_d2_182`–`187`),
8 D3 (`crisc_d3_265`–`272`) and 5 D4 (`crisc_d4_166`–`170`) items, taking the
bank to 850, exactly on the outline weights. One AI item per domain: an AI
chatbot's duties recorded by country of use under its business owner (d1_221);
model files and ML libraries from a public hub put into vulnerability
identification (d2_183); AI RMF outcomes mapped into the existing control library
rather than a parallel AI catalogue (d3_267); and an erasure request reaching a
fine-tuned model, where the data owner approves the recorded method and the model
owner decides each request within it (d4_170, consistent with AAIA aaia_d1_044).
Other highlights: IT operations makes an agreed firewall change in its own role
(d1_216); exposed client codes reported through the incident process (d1_217);
a near miss stopped by chance shows a weakness (d2_182); loss history under
today's controls already carries their effect (d2_187); the customer's own
internal audit uses contract audit rights where a vendor's SOC 2 stops (d3_266);
senior management approves ransom-payment authority in advance (d4_166). No keyed
wait this round.

| Stage | Result |
|---|---|
| Blind test | 25/25 (23 sure); d4_170's runner-up reasoning re-pointed |
| Standards audit | 0 HARD ERRORS, 8 PRECISION: erasure decided at two levels with "approves" for the data owner (d4_170); "each" off two keys (d3_265, d3_268); d3_266's explanation off the paused assurance reasoning; stem-only facts (d2_183, d3_269); an older cue narrowed so it no longer keys d1_218's wrong option (d1_185) |
| Concept review | 0 HARD ERRORS, 11 PRECISION: overstated rules softened (codes already seen stay valid, d1_217; AI rules "can" apply by use, d1_221; tamper-evident is not tamper-proof, d4_167; outsourcing keeps accountability, d3_265; periodic summaries are slow escalation, d1_220) |
| Re-blind | 7/7 (6 sure); d4_170's Eliminate tip names retraining's real weakness |
| Cross-domain gate | 0 HARD ERRORS, 3 PRECISION: d3_266's cue limited to a vendor's internal auditors; d3_101 names the enterprise's own internal audit; "model owner" used consistently in d4_170 |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; keys level; balance exactly 26/22/32/20; longest-key floors 15.4–15.9% |

**Next round (round 25, +25 to 875):** D1 +7, D2 +5, D3 +8, D4 +5 (228/192/280/175). Code placement, key letters, difficulty and settings are in `r24_cross_domain.json`.
- Length floors: every domain needs exactly one key naturally longest by characters (D1 falls to 14.9% without one).
- AI angles: D1 1B2 (a model-validation team under the head of data science is first-line self-testing), D2 2B1 (an AI assessment covers foreseeable misuse), D3 3A1 (an AI vendor's indemnity is a partial transfer), D4 per the JSON.
- Pause new internal-audit keys (three now) and keyed waits; "Number of" on wrong options only; no new "Screen" or "Map" keys.
- Openers and words: "Review" on 2 wrong options, only/just on 2 eliminated options, "Compare" on 1 wrong option; at most 1 owner pair split key plus eliminated; consider a justified training key in D1.
- Pause (on top of rounds 17–23): the round 24 lessons listed in `r24_cross_domain.json`.

### Round 25 (12 Nov 2026): 25 items, bank 875

Round 25 added 7 D1 (`crisc_d1_222`–`228`), 5 D2 (`crisc_d2_188`–`192`),
8 D3 (`crisc_d3_273`–`280`) and 5 D4 (`crisc_d4_171`–`175`) items, taking the
bank to 875. One AI item per domain: validators inside the data science unit are
first-line testers the risk team still challenges (d1_227); an AI risk assessment
covers foreseeable misuse with the process owner (d2_190); an AI vendor's
indemnity recorded as a partial transfer, the rest kept by its risk owner
(d3_273); and a tested rollback, owned by the pipeline team, for a model that
redeploys nightly (d4_172). Other highlights: a committee member sits out the vote
on their own request (d1_223); a policy stays in force while its overdue review is
finished (d1_224); event trees run forward and fault trees run back (d2_192); a
compensating control limits network access to an unpatched flaw (d3_275); a legal
hold pauses deletion once a lawsuit is filed or expected (d4_174). No keyed wait,
no internal-audit key, and "Number of" on wrong options only.

| Stage | Result |
|---|---|
| Blind test | 25/25 (20 sure); a "just" tell found on wrong options |
| Standards audit | 0 HARD ERRORS, 11 PRECISION: stem-only facts (d3_274 five-year contract, d4_172 tests passed); restricted openers (Help, Lower) moved; d4_008's older cue narrowed for d4_174; notes 4A1.1 says "review board" |
| Concept review | 0 HARD ERRORS, 8 PRECISION: "limit" not "block" access (d3_275); policy expiry hedged (d1_224); intent shaped by what the firm holds or does (d2_188); retest after material change (notes 3B3) |
| Re-blind | 11/11 (10 sure); d4_172 rests on the three-day restore, not the passed tests |
| Cross-domain gate | 0 HARD ERRORS, 2 PRECISION: d4_173's cue keeps its above-appetite condition; d3_097's change-review cue narrowed so it no longer keys d3_276's runner-up. Restrictive-word rule set (below) |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; keys level; balance 26/22/32/20; longest-key floors 15.4–16.0% |

**Restrictive words (rule for rounds 26–30):** the exam-style lint warns on "only", "all" and "never" in wrong options but not in keys, so those words built up on keys (only 4/4, all 5/5) and "just" built up on wrong options (6 of 7). From round 26: no new "only", "all", "never", "limited to" or "alone" in any option; key exactly one "just" across rounds 26–30 (in D3) and add no wrong "just". A lint change to count these words on keys too is a later tooling task.

**Next round (round 26, +25 to 900):** D1 +6, D2 +6, D3 +8, D4 +5 (234/198/288/180). Code placement, key letters, difficulty, AI angles and settings are in `r25_cross_domain.json`.
- Length floors: every domain needs exactly one key naturally longest by characters (D1 and D3 fail at 900 without one).
- Opener tells to avoid on keys: Limit, Restrict, Isolation, Advise, Propos-.
- Pause (on top of rounds 17–24): the round 25 lessons listed in `r25_cross_domain.json`.

### Round 26 (12 Nov 2026): 25 items, bank 900

Round 26 added 6 D1 (`crisc_d1_229`–`234`), 6 D2 (`crisc_d2_193`–`198`),
8 D3 (`crisc_d3_281`–`288`) and 5 D4 (`crisc_d4_176`–`180`) items, taking the
bank to 900, exactly on the outline weights. One AI item per domain: staff misusing
an AI writing tool under sales pressure is conduct risk for the code of conduct's
owner (d1_229); AI-written code stays in vulnerability scope, and a vendor's claim
is not evidence (d2_195); an AI guardrail tested with attacks built from the
firm's own support chats (d3_283); and an AI agent given its own identity with
rights for its tasks (d4_177). Other highlights: a system owner is not the owner of
the data on it (d1_230); a breach logged as an event while its risk stays open
(d2_193); a BIA rates harm before insurance (d2_196); the first deterrent-control
key in the bank (d3_282); a pass rate reported with the number of controls tested
(d3_287); phishing lures of comparable difficulty (d4_179). The restrictive-word
rule held: no option uses only, all, never, just, alone or limited to.

| Stage | Result |
|---|---|
| Blind test | 25/25 (24 sure); review run twice after a container restart |
| Standards audit | 0 HARD ERRORS, 6 PRECISION: no Ask on runners-up (d2_194, d2_196); same-opener pairs broken (d2_196, d3_281); "Share of" off a D3 key and a keyed "Number of" in its place (d3_287); a cue kept to stem facts (d3_284); a test input reworded as evidence (d3_283) |
| Concept review | 0 HARD ERRORS, 7 PRECISION: duties "written into" supplier contracts (d1_234); loss-database and appetite notes narrowed (1B1, 1B4); the risk team validates an automated check (d3_286); agent logs show actions as the person's (4A7) |
| Re-blind | 8/8, all sure; d3_287's stem now has the analyst find the coverage gap |
| Cross-domain gate | 0 HARD ERRORS, 3 PRECISION: d1_090's profile cue kept to its trigger; one name for the conduct owner; d3_286's cue matches its explanation. Found the cause of a same-opener tell (below) |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; keys level; balance exactly 26/22/32/20; longest-key floors 15.3–16.1% |

**Same-opener tell:** when two options open with the same verb, one of them is the key in 57.7% of items (D2 70.8%). The cause is the old rule "key a restricted opener only if a wrong option opens the same way": those pairs hold the key 16 of 16 times; all other pairs sit at 51.4%. From round 27 that exemption ends, and new same-opener pairs go on the runner-up plus an eliminated option, or on two eliminated options.

**Next round (round 27, +25 to 925):** D1 +7, D2 +5, D3 +8, D4 +5 (241/203/296/185). Code placement, key letters, difficulty, AI angles and settings are in `r26_cross_domain.json`.
- Length floors: D1, D2 and D3 each need one key naturally longest by characters; D4 needs none.
- Owner shapes: one Eliminate pair, no split pairs (round 26 had six splits).
- Words to watch: "beside" or "alongside" and "like … other" on wrong options only.

### Round 27 (13 Nov 2026): 25 items, bank 925

Round 27 added 7 D1 (`crisc_d1_235`–`241`), 5 D2 (`crisc_d2_199`–`203`),
8 D3 (`crisc_d3_289`–`296`) and 5 D4 (`crisc_d4_181`–`185`) items, taking the
bank to 925. One AI item per domain: a process redesigned around an AI tool means
the process owner revises the continuity plan (d1_237); coordinated false reports
that poison a self-learning model are built into the scenario as threat source and
event (d2_200); red-team findings on an unreleased AI tool go into the issue log,
rated and owned, while the builders' backlog schedules fixes (d3_292); and AI added
to personal data mid-project means the risk assessment is revised before the story
ships (d4_185). Other highlights: a near miss as impact evidence (d2_199); coupled
risks rank higher among equal scores, per SP 800-30 Appendix J (d2_201); a
beta-weighted three-point estimate (d2_203); start the RMF with the Prepare tasks
(d1_241); confirm deletion, backups included, before closing an action (d3_294);
legal counsel releases a hold when its matter ends (d4_184).

| Stage | Result |
|---|---|
| Blind test | 25/25 (17 sure); three stem-to-key echoes found |
| Standards audit | 0 HARD ERRORS, 10 PRECISION and the round's Eliminate owner pair (reshaped into d3_295); d2_048's near-miss cue narrowed for d2_199; diaries replaced by official agendas as evidence (d3_293); a vendor's word replaced by its evidence (d3_291) |
| Concept review | 0 HARD ERRORS, 7 PRECISION: Categorize is the first step after Prepare (d1_241); the AI tool is unreleased (d3_292); "separately rated" coupled risks (d2_201); overstated "unseen" removed (d4_182) |
| Re-blind | 9/9 (8 sure); d3_295's runner-up moved to the other impact measure |
| Cross-domain gate | 0 HARD ERRORS, 5 PRECISION: key concepts aligned with their reviewed explanations (d3_291, d3_293); d2_001 and d1_110 narrowed to their triggers; threat source and event separated in d2_200 |
| Gates | All lints 0 errors; practice links in sync; app pack dry run 0 problems; `verify_repo.sh` passes; keys level; balance 26/22/32/20; longest-key floors 15.2–15.8%; same-opener key-holding down from 57.7% to 55.9% |

**Next round (round 28, +25 to 950):** D1 +6, D2 +6, D3 +8, D4 +5 (247/209/304/190, exactly on the weights). Code placement, key letters, difficulty, AI angles and settings are in `r27_cross_domain.json`.
- Length floors: every domain needs one key naturally longest by characters (D1 and D3 fall below 15% at 950 without one).
- Owner shapes: two or three owner pairs, at least one Eliminate pair written in from the start, no split pairs.
- Openers: an "Access to …" key in D3 or D4 (unmet for two rounds); same-opener pairs off the key.
- Pause: "MOST appropriate owner of a risk" stems, 4A1 "fix the standard" keys, and the round 27 lessons in `r27_cross_domain.json`.

**Open items:**
- The `TO VERIFY` comment on the CRISC entry in `mobile/src/content/certifications.ts`
  can now be removed (weights and titles are verified in the blueprint). That file
  is bundled into `assets/kaisip-cloud.js`, so change it together with
  `npm run web-plant` in a session with the mobile packages installed.
- `notes-application-tester` and `isaca-concept-reviewer` passes on the notes
  after round 2.
