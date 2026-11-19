# CIA course tools (the harness)

Scripts for KaiSip's CIA course: Part 1, Part 2, Part 3 and the CIA Challenge
Exam (`docs/content/CIA_BANK_PLAN.md`). "Harness" means everything around the
writing that makes a wrong answer hard to ship. Every script reads and writes
only `data/cia/`, takes `--root DIR` (another tree, used by the proof below)
and `--today YYYY-MM-DD` (to test date rules), and exits 1 on any ERROR.

Start here: `python3 data/cia/tools/prove_harness.py`. It builds a small clean
made-up course, checks that every gate passes on it, then plants one fault per
rule and fails if any fault gets through. No content is written while it is red.

| Script | What it stops |
|---|---|
| `prove_harness.py` | A gate that no longer catches its fault. One planted fault per rule (an old-syllabus term, a wrong key letter, a missing explanation, a citation outside the library, a key resting on an unopened source, a copied definition, a question on a requirement that is not testable yet, an auditor-implements-the-fix answer, a hand-edited generated file, and the rest). `--keep DIR` leaves the clean fixture on disk. |
| `check_cia.py` | Structure: the outline against the opened syllabuses' counts, the blueprint's outline lines, item shape and ids (`cia1_d1_001`), an explanation for the key and for every wrong option, three tips that agree with the key, notes and library links (the first citation must be a Verified, opened source), the Challenge tag, key balance, pick-the-longest 15 to 24%, pick-the-shortest at most 30%, the difficulty mix each topic's syllabus verb calls for, they/them, and a lens backstop. `--list`, `--coverage`. |
| `check_stale_terms.py` | 2019-syllabus, 2017-Standards and ISACA wording anywhere a learner can read. Terms and their evidence: `shared/stale_terms.json`. The most important CIA gate, because most older material is the 2019 exam. |
| `check_currency.py` | Dated facts (`shared/currency.json`) with no source, or not re-checked for 120 days (warning at 60); exam lengths and weights that disagree with the outline; a question on a Topical Requirement that is not testable yet without its `testable_from` date. `--strict` also fails on facts that were never opened. |
| `check_originality.py` | Wording that tracks The IIA's text: definitions against the Standards glossary (a 6-word run, 30% shared 3-word phrases or 0.6 similarity), titles against the syllabus (a 6-word run), everything else against the whole reference text (an 8-word run). The IIA's text is never stored in the repository: `--fetch` downloads it to `~/.cache/kaisip/cia_ref`; `--require` fails when it is absent. |
| `style_cia.py` | Runs the shared exam-style linter (`scripts/lint_exam_style_v2.py`, unchanged) on every CIA question file. CIA has no exceptions to it. |
| `build_packs.py` | Builds each pack's `glossary.json` and `mindset/principles.json` from the one shared source in `shared/`. `--check` fails on a hand-edited or out-of-date built file. |
| `build_challenge.py` | Builds the Challenge pack's questions (`ciac/originals/`) from the Part items tagged with `challenge_ref`, under ids that never move (`ciac/id_map.json`, append-only). `--check` fails on drift or a hand edit. |
| `sync_practice_ids.py` | Fills each notes sub-topic's "Practice this concept" links from the questions' `_provenance`. `--check` reports drift. |
| `blind_copy.py` | An answer-free copy (id, outline code, stem, options) for `qa-question-tester`. The blind tester never sees a key. |
| `cia_common.py` | Shared paths, formats and loaders. |

Also used, from `scripts/`:

- `scripts/lint_notes.py <file> --part N --outline docs/content/CIA_BLUEPRINT.md --bank data/cia/cia{N}/originals`
  (the shared notes linter; `--part` tells it that CIA codes are part + section + topic).
- `scripts/lint_principles.py --cert cia1` and `scripts/lint_exam_guide.py --cert cia1`
  (the shared linters, issuer-aware: The IIA's hosts and wording).
- `scripts/cia_pack_dry_run.cjs` (the phone app's own pack builders on each pack, plus mock draws).

`scripts/verify_repo.sh` runs all of these in its "CIA course" block on every session start.

## One hand-written source, everything else generated

| Hand-written | Generated from it (never edit) |
|---|---|
| `cia{1,2,3}/originals/d{N}.json`, `cia{1,2,3}/notes/d{N}.json` | `ciac/originals/d{1..5}.json`, `ciac/id_map.json`, each notes file's `practice_ids` |
| `shared/glossary.json`, `shared/principles.json` | `<pack>/glossary.json`, `<pack>/mindset/principles.json` |
| `shared/outline.json` (codes, KaiSip's own short titles, verbs, the Challenge map) | checked against the outline lines in `docs/content/CIA_BLUEPRINT.md` |
| `shared/_framework_library.md`, `shared/currency.json`, `shared/stale_terms.json` | |
| `ciac/exam/`, `ciac/notes/bridge.json` (the CISA bridge) | |

## A round, in commands

```bash
python3 data/cia/tools/prove_harness.py -q                 # the harness still catches its faults
python3 data/cia/tools/check_cia.py cia1 --coverage        # structure
python3 data/cia/tools/style_cia.py cia1                   # house style
python3 data/cia/tools/check_stale_terms.py                # no 2019 or ISACA wording
python3 data/cia/tools/check_currency.py                   # dates and Topical Requirements
python3 data/cia/tools/check_originality.py --fetch --require   # own words
python3 data/cia/tools/blind_copy.py cia1 1 --ids 21-45 --out /path/outside/the/repo/blind.json
python3 data/cia/tools/sync_practice_ids.py && python3 data/cia/tools/build_packs.py && python3 data/cia/tools/build_challenge.py
node scripts/cia_pack_dry_run.cjs
bash scripts/verify_repo.sh && (cd mobile && npm run check)
```

What the mechanical gates cannot judge (whether the keyed answer is truly the
internal auditor's best move, whether a distractor is defensible, whether a
source says what the item claims) is the job of separate agents with fresh
context: `qa-question-tester` (blind), `cia-standards-auditor`, the part
experts, `cia-currency-checker` and `cia-cross-part-reviewer`.
