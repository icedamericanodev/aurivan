# CSOE question bank plan

**Status:** plan, 31 Oct 2026. The issuer's pages and the primary law were
opened on the second pass; the outline in `docs/content/CSOE_BLUEPRINT.md` is
built from SOXCPA's own course synopsis. The pilot (20 per domain) follows
this plan.

CSOE is not wired into the apps, so bank work needs no `APP_VERSION` bump.
Never put the bank size in learner copy.

## 1. Targets

Decided 31 Oct 2026 by `product-manager` and `behavioral-scientist`, asked
separately; both reached about 300.

| | Value |
|---|---|
| Full bank | about **300** (250–350) |
| Pilot | 20 per domain, IDs `csoe_dN_001`–`020`, every course part touched at least once |
| Held-out mock items | about 70 (two 35-item forms), never served in practice |
| Mix per domain | about 30% foundational (recall), 55% application, 15% analysis |
| Angles per rule | two or three (actor, timing, consequence, the look-alike rule); never more rewordings of one fact |

Per-domain targets (blueprint "Question targets"): D1 42 · D2 48 · D3 48 ·
D4 81 · D5 81, from each domain's share of the topic lines in SOXCPA's course
synopsis (KaiSip's reading, not SOXCPA's). If the bank grows, scale every
domain by its weight.

Why not 1,000 like CISA, CC, CRISC and AAIA: the exam is 35 items, open book,
and tests about 120–160 distinct rules. A 1,000-item fact bank would be the
same facts reworded, which trains learners to recognise wording, and a
learner would see most items once instead of three or four times.

## 2. Batch size and cadence

- Notes first: one domain's notes, linted, before its first question.
- Pilot: 20 per domain (about 100 in all, depending on the final domain
  count), in one round, run by domain pairs so reviews stay readable.
- After the pilot, batches of 20–25 per domain until the targets are met:
  about three more rounds.
- Cross-domain gate (`csoe-cross-domain-reviewer`) after the pilot, after
  every ~100 new items, and as the final gate before a release.

## 3. The pipeline every batch goes through

Copied from the CC pipeline (`docs/content/CC_BANK_PLAN.md` section 3), with a
rules-currency step added because CSOE keys on numbers that change. Don't skip
a step.

1. **Author** with `csoe-d{N}-domain-expert` (created once the domains are
   fixed), under `csoe-standards-auditor.md` and the calibration rules
   (section 6).
2. **Self-check**, 0 errors each:
   - `python3 data/csoe/tools/check_csoe.py N` (shape, IDs, notes and library
     links, tips, key spread, pick-the-longest 15–24%, mix). Tools:
     `data/csoe/tools/README.md`.
   - `python3 data/csoe/tools/style_csoe.py N`: the shared style linter with
     one CSOE exception (a stem that names the rule it asks about may skip the
     priority word). Its "stem names no actor" warning looks for CISA actors;
     every stem must still name who acts.
   - The "pick the shortest" rate must stay at or under 30% (checked by
     `check_csoe.py`; added after the pilot blind tests).
   - Notes: `python3 scripts/lint_notes.py data/csoe/notes/dN.json --outline
     docs/content/CSOE_BLUEPRINT.md --bank data/csoe/originals`, then
     `python3 data/csoe/tools/sync_practice_ids.py`.
3. **Blind test** with `qa-question-tester` on an answer-free copy
   (`data/csoe/tools/blind_copy.py`: id, outline code, stem, options only).
   Compare its picks with the keys afterwards.
4. **Standards audit** with `csoe-standards-auditor`, plus the domain expert's
   accuracy pass.
5. **Rules currency** with `csoe-rules-currency-checker` on every keyed fact
   (section, actor, threshold, deadline, penalty, form, standard number),
   each opened at its primary source and dated. Also run
   `cisa-citation-realism-checker` (it already knows SOX traps: 906 penalty
   tiers, Rule 17a-4 versus SOX retention, 302 versus 906).
6. **Fix** every HARD ERROR and PRECISION finding. Re-blind-test every changed
   item.
7. **Citations:** every `framework_ref` part matches a library bullet marked
   Verified (opened, date). No "Likely" status for CSOE.
8. **Cross-domain review** (`csoe-cross-domain-reviewer`) at the gates in
   section 2.
9. **PR** per round, reviewed and merged under the CLAUDE.md PR rules.

## 4. Mocks

- The real exam moves forward only: no pause, no skip, no going back
  (SOXCPA's exam steps PDF, opened 31 Oct 2026). KaiSip's CSOE mocks copy that: an answer is final once
  given. The mock engine needs a forward-only mode before CSOE ships
  (`mobile-app-engineer`, outside this session's scope).
- Two fixed 35-item mock forms from the held-out items; more forms only when
  the bank passes about 300.
- Practice is closed-book by default (open-book practice leads to less study
  and more overconfidence). A separate "find it" drill trains looking up a
  rule fast in the notes; lookups count as half the evidence in readiness,
  like the existing Coach me rule.
- Readiness never maps to "pass". On a 35-item exam one sitting swings by
  about 7 points, so advise aiming for 80–85% on held-out mocks.

## 5. Pack: paid, lowest price tier

Decided 31 Oct 2026 by `product-manager`:
- Paid pack, at or below the CC price tier, never at the CRISC/AAIA tier. One
  payment, 6-month access, never renews (the shared pack model in
  `docs/business/monetization/RECOMMENDATION.md`).
- Contents, as for every pack: questions (one file per domain), notes,
  principles, an exam guide, lessons and game decks. This plan covers
  questions and notes; the rest is planned once the outline exists. Add a
  one-page "where to look" sheet (section, who, what, deadline, consequence)
  for the open-book exam.
- **Free sample:** the shared rule is about 20% of the questions, at least
  100. On a 300-item bank, "at least 100" gives away a third.
  `product-manager` proposes about 25% (about 75 items) plus the diagnostic
  and one full 35-item mock. Chosen by domain and course part, best-reviewed
  items only, every domain represented, and good enough to sell the course.
  Changing the shared rule is an owner decision (section 8).
- Don't build the purchase flow here (Phase E, `mobile-app-engineer`).

## 6. Calibration rules (binding for every batch)

The CC pilot rules (`docs/content/CC_BANK_PLAN.md` section 6) apply in full:
the stem holds the deciding fact; no cues on the key alone; length doesn't
predict the key; two plus two; the tips name the right letters; no leaks in
`pre_read` or `subtopic`; original scenarios; one citation form; no form cues;
name the runner-up testers weigh. CSOE adds:

1. **The rule decides, not judgment.** If two options are both good practice,
   the stem must ask for what a specific section or rule requires, and only
   one option matches it.
2. **Name the filer status and date when the answer depends on them.** A
   404(b) item names the filer category; an item on a threshold that changed
   says "under the current rule".
3. **One number per item.** Key on one threshold, deadline or penalty at a
   time, never a chain of numbers.
4. **Look-alike pairs.** Most distractors come from the confusion pairs:
   302/906/404; 404(a)/404(b); management/auditor; SEC/PCAOB; significant
   deficiency/material weakness; accelerated/non-accelerated; disclosure
   controls/ICFR; Section 304/Rule 10D-1 clawbacks; Section 802/Rule 17a-4.
5. **Both stem forms.** About a quarter of each new batch uses SOXCPA's
   incomplete-statement form (ends in a colon; each option completes the
   sentence). The pilot used questions only; batch 2 adds the second form.
6. **No issuer wording.** Nothing from SOXCPA's presentations or uploads of
   them; build from the public law in our own words.

## 7. Course description (store copy)

Drafted by `growth-marketer` and fixed after `app-store-compliance-reviewer`
(31 Oct 2026: five fixes applied, now GO on wording).

- In-app purchase name (Apple, 30 max): "KaiSip SOX Compliance course"
- Long name (Play, 55 max): "KaiSip SOX Compliance, 6 months (for the CSOE exam)"
- Apple in-app purchase description field: "SOX notes and practice questions, 6 months"
- Store and paywall description: "Prepare for the CSOE exam in short sessions
  on your phone. Plain-language notes cover Sections 302, 404 and 906, the
  roles of the SEC and PCAOB, internal control over financial reporting and
  COSO, which companies are in scope, and the Dodd-Frank changes. Original
  practice questions explain every option and give three tips each, so you
  build recall instead of looking up every answer. Timed mocks train your
  pacing, and a "where to look" sheet points you to the right source. One
  payment, 6 months of access, never renews."
- Paywall headline: "Know SOX section by section, before exam day." (A/B:
  "Stop searching. Start knowing SOX.") Subhead: "Plain-language notes,
  explained practice questions and timed mocks for the CSOE exam. Start free
  with sample questions, a diagnostic and a short timed mock. One payment, 6
  months, never renews."
- Notice (store listing and in the app; Google Play wants government
  information sourced and a "does not represent" line): "KaiSip is an
  independent study aid. Not affiliated with or endorsed by the Sarbanes Oxley
  Compliance Professionals Association (SOXCPA), the SEC, the PCAOB or COSO,
  and does not represent any government agency. Sources: the Sarbanes-Oxley
  Act (congress.gov) and SEC rules (sec.gov). COSO is a trademark of the
  Committee of Sponsoring Organizations of the Treadway Commission."

Conditions before submission: the notes, timed mocks and "where to look"
sheet named in the copy must exist; say "forward-only" only once the mock
engine has that mode (today the mock screen has a Previous button); the
paywall shows the local price, Restore, Terms, Privacy and the notice; no
SEC, PCAOB or COSO logos or seals, and no COSO framework text. Re-check the
Google Play rules once support.google.com is reachable (they came from search
results), and escalate if SOXCPA objects or the USPTO shows a registration.

## 8. Owner decisions (open)

Raised after the experts weighed in; each needs the owner.

1. **Enrol in the SOXCPA course?** The exam tests only what the official
   presentations (1,022 slides) answer. The synopsis is now opened, so scope
   is mapped by topic, but not by detail. Enrolling costs US$147 (refundable
   within 60 days) and creates an account with the issuer (CLAUDE.md "major":
   new paid services or accounts). We would still never copy from them.
2. **COSO edition.** The course teaches both 1992 and 2013 (and ERM 2004 and
   2017). KaiSip teaches 2013 and 2017 as current and the older editions as
   history, keying only where the editions agree or the item names the
   edition. Owner call only if that is not acceptable.
3. **Free sample for small banks.** Keep "at least 100" or cap at 25% of the
   bank (product-manager's proposal). product-manager also proposed a free
   full 35-item mock; the shared rule allows one short timed mock, and
   app-store-compliance-reviewer kept the copy to that until the owner
   decides.
4. **Roadmap placement.** product-manager scores CSOE 2.0 (niche market,
   unverified scope, small bank) and suggests building it after Phase E
   payments run for CRISC and AAIA. It is not in `docs/ROADMAP.md` yet.

## Progress

| Round | D1 | D2 | D3 | D4 | D5 | Total |
|---|---|---|---|---|---|---|
| Groundwork (31 Oct 2026) | — | — | — | — | — | 0 |
| Pilot, notes plus 20 items per domain (31 Oct 2026) | 20 | 20 | 20 | 20 | 20 | 100 |

Pilot reviews (31 Oct 2026):
- **Blind test:** 100/100 picks matched the keys (testers saw no keys,
  explanations or tips). Every changed item was re-tested by a fresh
  tester: D1 17/17, D2 16/16, D3 12/12, D4 12/12, D5 7/7.
- **Standards audits:** FIX THEN SHIP in every domain. Hard errors found and
  fixed: D1 3 (the Form 20-F deadline in two items, a defensible distractor
  on filer thresholds), D3 1 (Section 308 taught as written in 2002, before
  Dodd-Frank 929B), D5 1 (a key resting on COSO's preference, not on Item
  308(a)(2)). D2 and D4 had none.
- **Rules currency:** 217 keyed or noted facts checked at the primary
  source (D1 48, D2 50, D3 42, D4 47, D5 30); 7 superseded or wrong facts
  fixed (the Form 20-F deadline; EDGAR access now through Login.gov; the
  12(g) holder count excluding employee-plan holders; Section 308 fair
  funds; Section 302's 90-day window versus Rule 13a-15(b); Release 33-8221's
  date; 18 U.S.C. 1520's start date). 4 facts stayed unverified because
  pcaobus.org is blocked; nothing is keyed on them. New law found and
  taught: Section 16(a) now covers foreign private issuers' directors and
  officers (Pub. L. 119-60).
- **Cross-domain review:** FIX THEN SHIP, no wrong keys, every number
  stated twice matches. Fixed: 1 hard error in a note (newly public
  companies omit both ICFR reports in their first annual report), 2
  near-duplicate pairs re-angled (D3-015, D4-007), a misleading exam cue,
  and one name for the auditor ("independent auditor"). The 16 changed
  items re-tested blind 16/16; four length or wording cues the tester saw
  were then fixed.
- **New gates added:** "pick the shortest" at most 30% (D2 was 50%), and a
  CSOE style wrapper that lets a stem naming its rule ask directly and
  accepts SOXCPA's incomplete-statement stems.

Lessons for batch 2:
- Open the SEC's own form instructions for any form deadline; a CFR copy
  can be stale (Form 20-F).
- Teach the Act as amended: Dodd-Frank rewrote Sections 308 and 806, and
  later laws (the JOBS Act, Pub. L. 119-60) changed who is covered.
- Check every new item against the other four domains as well as its own
  (D4-002 repeated D1-002's rule and was reworked).
- Balance option lengths both ways: the key must not be the shortest
  option too often either.
- Write about a quarter of new items as incomplete statements.
- Never put the owner's email or any personal data in a request.
