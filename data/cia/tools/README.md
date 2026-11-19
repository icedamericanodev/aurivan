# CIA course tools (the harness)

Scripts for KaiSip's CIA course: Part 1, Part 2, Part 3 and the CIA Challenge
Exam (`docs/content/CIA_BANK_PLAN.md`). "Harness" means everything around the
writing that makes a wrong answer hard to ship. Every script reads and writes
only `data/cia/`, takes `--root DIR` (another tree, used by the proof below)
and `--today YYYY-MM-DD` (to test date rules), and exits 1 on any ERROR.

Start here: `python3 data/cia/tools/prove_harness.py`. It builds a small clean
made-up course, checks that every gate passes on it, then plants one fault per
rule and fails if any fault gets through. No content is written while it is red.
A rule that is added or changed gets a row in its tables in the same change.

| Script | What it stops |
|---|---|
| `prove_harness.py` | A gate that no longer catches its fault. One planted fault per rule, in three tables: CASES (the gate must fail and print a text that names the rule, so a case cannot pass for another reason), PASSES (controls: wording that must not be flagged, a fault a builder handles) and SAYS (only the text is judged, for the shared linters and the gate runner). The fixture is its own throwaway git repository, so the id gate is proved too. `--keep DIR` leaves the clean fixture on disk; it never deletes anything, so DIR must be missing or empty, and outside the repository. |
| `check_cia.py` | Structure: the outline against the opened syllabuses' counts, the blueprint's outline lines, item shape and ids (`cia1_d1_001`), an explanation for the key and for every wrong option, three tips that agree with the key (the whole Eliminate tip is read: two wrong letters, never the key; the article "A" is not a letter), notes and library links (the first citation must be a Verified, opened source), the Challenge tag, key balance, pick-the-longest 15 to 24%, pick-the-shortest at most 30%, the difficulty mix each topic's syllabus verb calls for, they/them, and a lens backstop. Retired items are checked, then left out of the counts. `--list`, `--coverage`. |
| `check_stale_terms.py` | 2019-syllabus, 2017-Standards and ISACA wording anywhere a learner can read: every string value and every dict key (a notes `key_terminologies` map shows its keys as terms). Each string is normalized first (whitespace runs and non-breaking spaces to one space, a hyphen between words to a space). Terms and their evidence: `shared/stale_terms.json`; a term with `"case_sensitive": true` matches only as written ("IS auditor", not "is auditor independence"). The most important CIA gate, because most older material is the 2019 exam. |
| `check_currency.py` | Dated facts (`shared/currency.json`) with no source, not re-checked for 120 days (warning at 60), or "checked" on a date in the future; exam lengths and weights that disagree with the outline; a Topical Requirement whose `library_prefix` starts no bullet in the citation library; a question that cites, or names anywhere a learner reads, a Topical Requirement that is not testable yet without its `testable_from` date. `--strict` also fails on facts that were never opened. |
| `check_originality.py` | Wording that tracks The IIA's text: definitions against the Standards glossary (a 6-word run, 30% shared 3-word phrases or 0.6 similarity), titles against the syllabus (a 6-word run), everything else, definitions included, against the whole reference text (an 8-word run). A few terms of art count as one word; so that a sentence made of them cannot hide a copy, each run is also counted in plain words (11 for prose and definitions, 8 for titles). A citation by number and title that is in the citation library ("Standard 11.5 <its title>") is set aside before measuring. The IIA's text is never stored in the repository: `--fetch` downloads it to `~/.cache/kaisip/cia_ref` (the syllabus addresses come from `shared/outline.json`; a text older than 30 days is downloaded again), and a reference folder inside the repository is refused. `--require` fails when the text is absent or incomplete (see below). |
| `check_ids.py` | An id that has shipped and no longer means the same question. Compares the working tree with main in git (`origin/main`, else `main`; `--base REF`): every Part question id on main still exists with a recognizably same stem, and `ciac/id_map.json` is append-only (no row removed or changed; a status only goes from active to retired). Prints "skipped: no git base" when there is nothing on main to compare with. |
| `style_cia.py` | Runs the shared exam-style linter (`scripts/lint_exam_style_v2.py`, unchanged) on every CIA question file. CIA has no exceptions to it. |
| `build_packs.py` | Builds each pack's `glossary.json` and `mindset/principles.json` from the one shared source in `shared/`. `--check` fails on a hand-edited or out-of-date built file, and on a built file that no shared source produces any more (a normal build removes it). |
| `build_challenge.py` | Builds the Challenge pack's questions (`ciac/originals/`) from the Part items tagged with `challenge_ref`, under ids that never move (`ciac/id_map.json`, append-only). `--check` fails on drift or a hand edit of a built file. It starts from the id map on disk, so a hand edit of the id map itself is `check_ids.py`'s to catch. It counts one full mock the way the app deals it (150 questions are 30 / 23 / 30 / 37 / 30). |
| `sync_practice_ids.py` | Fills each notes sub-topic's "Practice this concept" links from the questions' `_provenance`. `--check` reports drift. |
| `blind_copy.py` | An answer-free copy (id, outline code, stem, options) for `qa-question-tester`. The blind tester never sees a key. Retired items are left out. |
| `run_gates.sh` | Runs every gate and prints one line each: the "CIA course" block of `scripts/verify_repo.sh`. Its last line says so when a gate did not really run (the originality gate without reference text, the id gate without a git base), it shows a failing tool's problem lines, and it counts dated-fact warnings. |
| `cia_common.py` | Shared paths, formats and loaders. |

Also used, from `scripts/`:

- `scripts/lint_notes.py <file> --part N --outline docs/content/CIA_BLUEPRINT.md --bank data/cia/cia{N}/originals`
  (the shared notes linter; `--part` tells it that CIA codes are part + section + topic).
  With `--part`, an outline that has no code for the file's part and section is an error.
- `scripts/lint_principles.py --cert cia1` and `scripts/lint_exam_guide.py --cert cia1`
  (the shared linters, issuer-aware: The IIA's hosts and wording). A section's question
  file, or the Challenge pack's notes, that is not written yet is skipped and named in
  one line, not an error.
- `scripts/cia_pack_dry_run.cjs` (the phone app's own pack builders on each pack, plus mock
  draws; the Challenge gate and the id check across packs run whichever packs are named).

`scripts/verify_repo.sh` runs all of these in its "CIA course" block on every session start
(`bash data/cia/tools/run_gates.sh`).

## Ids never move: the `retired` field

Saved progress is keyed by question id. So a question that has shipped is never
deleted and never renumbered. To replace or drop one, add `"retired": true` as
its LAST field (after `style_version`; `true` is the only value) and give the
new wording a new id at the end of the file. A retired item:

- keeps its id and its number in its file for good, and is still read by the
  stale-terms, originality, style and structure gates;
- is left out of the Challenge build (its Challenge id becomes "retired" in
  `ciac/id_map.json` and is never given out again), the mock pools of the pack
  dry run, the practice links, the key, length and difficulty counts, and blind
  copies.

`check_ids.py` enforces this against main: a missing id, an id whose stem is
now another question, a removed or changed id-map row, or a status going back
from retired to active is an ERROR. A light wording fix keeps the id.

## A complete reference text

`check_originality.py --require` passes only on a complete reference: all five
source texts present and not empty (`standards_2024`, `p1_syllabus`,
`p2_syllabus`, `p3_syllabus`, `challenge_syllabus`, each `.txt`) and at least 56
glossary entries parsed from the Standards (the count in the opened file on
19 Nov 2026; five were once lost at page breaks). The glossary is read from
`standards_2024.txt`, never from whichever file has "standards" in its name;
the last line names the file and the count. Every other `.txt` in the folder is
still read for the run checks. `--fixture-ref` turns the rule off and is used
only by `prove_harness.py`, with its made-up reference.

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
python3 data/cia/tools/check_originality.py --fetch --require   # own words (needs the complete reference text)
python3 data/cia/tools/check_ids.py                        # no shipped id deleted, renumbered or reused
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
