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
| `prove_harness.py` | A gate that no longer catches its fault. One planted fault per rule, in three tables: CASES (the gate must fail and print a text that names the rule, so a case cannot pass for another reason), PASSES (controls: wording that must not be flagged, a fault a builder handles) and SAYS (only the text is judged, for the shared linters and the gate runner). The fixture is its own throwaway git repository, so the id gate is proved too. Its stems and principle triggers follow The IIA's format (lowercase qualifiers, a period on every option), so it passes `style_cia.py` with the stage 1 switch on; a scripted check proves `--require-lowercase-qualifiers` still forces the rule for one run. `--keep DIR` leaves the clean fixture on disk; it never deletes anything, so DIR must be missing or empty, and outside the repository. |
| `check_cia.py` | Structure: the outline against the opened syllabuses' counts, the blueprint's outline lines, item shape and ids (`cia1_d1_001`), an explanation for the key and for every wrong option, three tips that agree with the key (the whole Eliminate tip is read: two wrong letters, never the key; the article "A" is not a letter), notes and library links (the first citation must be a Verified, opened source, or a public Knowledge source in a topic its library heading names), the Challenge tag, key balance, pick-the-longest 15 to 24%, pick-the-shortest at most 30%, the difficulty mix each topic's syllabus verb calls for, they/them, and a lens backstop. Retired items are checked, then left out of the counts. `--list`, `--coverage`. |
| `check_glossary.py` | A fault in the one shared glossary (`shared/glossary.json`), with the term named ("id 5 (Advisory services): ..."): a missing or unknown field, an id or a term used twice (terms in any letter case), an empty term, definition or category, a term in no pack, a pack that does not exist, a section number the pack does not have, a `notes` code that is in no notes file of the term's Part pack, a `related` id that does not exist or is the term's own, an older name (`formerly`) that is empty or is the term's own name, and a definition that differs from the notes' definition of the same term without the `def_differs_from_notes` mark (or with the mark where it does not differ). Rules and decisions: "The shared glossary" below. |
| `check_stale_terms.py` | 2019-syllabus, 2017-Standards and ISACA wording anywhere a learner can read: every string value and every dict key (a notes `key_terminologies` map shows its keys as terms). Each string is normalized first (whitespace runs and non-breaking spaces to one space, a hyphen between words to a space). Terms and their evidence: `shared/stale_terms.json`; a term with `"case_sensitive": true` matches only as written ("IS auditor", not "is auditor independence"). A glossary term's `formerly` list (older names, built into the packs) is a skipped key in every file, shared and built; an old term in its `def` or `scopeNotes` is still caught in both. The most important CIA gate, because most older material is the 2019 exam. |
| `check_currency.py` | Dated facts (`shared/currency.json`) with no source, not re-checked for 120 days (warning at 60), or "checked" on a date in the future; exam lengths and weights that disagree with the outline; a Topical Requirement whose `library_prefix` starts no bullet in the citation library; a question that cites, or names anywhere a learner reads, a Topical Requirement that is not testable yet without its `testable_from` date. `--strict` also fails on facts that were never opened. |
| `check_originality.py` | Wording that tracks The IIA's text: definitions against the Standards glossary (a 6-word run, 30% shared 3-word phrases or 0.6 similarity), titles against the syllabus (a 6-word run), everything else, definitions included, against the whole reference text (an 8-word run). A few terms of art count as one word; so that a sentence made of them cannot hide a copy, each run is also counted in plain words (11 for prose and definitions, 8 for titles). A citation by number and title that is in the citation library ("Standard 11.5 <its title>") is set aside before measuring. The IIA's text is never stored in the repository: `--fetch` downloads it to `~/.cache/kaisip/cia_ref` (the syllabus addresses come from `shared/outline.json`; a text older than 30 days is downloaded again), and a reference folder inside the repository is refused. `--require` fails when the text is absent or incomplete (see below). |
| `check_ids.py` | An id that has shipped and no longer means the same question. Compares the working tree with main in git (`origin/main`, else `main`; `--base REF`): every Part question id on main still exists with a recognizably same stem, and `ciac/id_map.json` is append-only (no row removed or changed; a status only goes from active to retired). Prints "skipped: no git base" when there is nothing on main to compare with. |
| `style_cia.py` | Runs the shared exam-style linter (`scripts/lint_exam_style_v2.py`, unchanged) on every CIA question file, then applies the CIA format exceptions for The IIA's question format (owner decision, 28 Nov 2026; listed in its docstring and in the plan, section 6d). Let through: a lowercase qualifier in the question (none at all is still an error), options up to 18 words (shared 12), and the scenario variant (36 to 50 words, or 3 sentences) for at most 10% of a section file. Errors: an option over 18 words, a stem over 50 words or 3 sentences, more than 10% of a file in the scenario variant, an EXCEPT or NOT ask. Warnings, never failing: more than 25% of a file's stems naming a person or a place (a heuristic), options without a terminal period, capitalised qualifiers still in the file (only while the switch is off), "IIA guidance" in a stem, an "I and II" option. **The stage 1 switch is on** (28 Nov 2026, with the stage 1 restyle: every CIA stem lowercased, MAIN made "primary", a period on every option): `REQUIRE_LOWERCASE_QUALIFIERS = True`, so a capitalised qualifier in a CIA stem is an error. `--require-lowercase-qualifiers` still forces it for one run. Below 40 items in a file, the longest-option lines are a note, not a failure (`check_cia.py` still holds the 8-character rule on every item). Every other shared rule is unchanged. The CISA, CRISC and AAIA banks keep the shared v2 standard. |
| `build_packs.py` | Builds each pack's `glossary.json` and `mindset/principles.json` from the one shared source in `shared/`. A built glossary entry is the seven fields `id, term, acronym, def, scopeNotes, domain, category`, plus `formerly` when the term has older names; `notes`, `related` and `def_differs_from_notes` stay in `shared/`. `--check` fails on a hand-edited or out-of-date built file, and on a built file that no shared source produces any more (a normal build removes it). A shared glossary entry with a field missing is a problem line that names the term, and no glossary is built until it is fixed. |
| `build_challenge.py` | Builds the Challenge pack's questions (`ciac/originals/`) from the Part items tagged with `challenge_ref`, under ids that never move (`ciac/id_map.json`, append-only). `--check` fails on drift or a hand edit of a built file. It starts from the id map on disk, so a hand edit of the id map itself is `check_ids.py`'s to catch. It counts one full mock the way the app deals it (150 questions are 30 / 23 / 30 / 37 / 30). |
| `build_held_back.py` | A held-back full form that breaks a rule, or that changes under learners. Builds `<pack>/exam/held_back.json` for a Part pack (`cia1`, `cia2`, `cia3`; the Challenge pack is out of scope) and freezes it: a build never changes an existing file unless `--refreeze` is passed. `--check` fails when a frozen id is now retired, dated, missing or breaks any rule, and names the id and the rule; with no file it passes. A pack that cannot meet the rules gets no file, and the build prints what is short per section. Rules and sources: "The held-back form" below. |
| `sync_practice_ids.py` | Fills each notes sub-topic's "Practice this concept" links from the questions' `_provenance`. `--check` reports drift. |
| `score_blind.py` | Not a gate: scores a blind tester's answers, or a cue tester's options-only guesses, against the keys, for the round scorecard. The tester never runs it. |
| `blind_copy.py` | An answer-free copy (id, outline code, stem, options) for `qa-question-tester`. The blind tester never sees a key. Retired items are left out. `--options-only` writes the cue test: only id and options, no stem, to measure how much the options give the answer away (chance is 25%; baselines in the plan, section 6b). |
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

## The held-back form

One full exam per Part, the same for every learner, kept out of practice until
the learner has taken it (plan section 3, decision 4, and section 11, the expert
decisions of 27 Nov 2026). `build_held_back.py` writes
`<pack>/exam/held_back.json` as `{"_meta": {"comment", "frozen", "exam"}, "ids": [...]}`.
The rules, each checked again by `--check`:

- exactly the exam's count and section split, as the app deals it (`allocate()`:
  Part 1 125 as 44/25/37/19, Part 2 100 as 50/40/10, Part 3 100 as 25/15/15/45);
- every outline topic sampled;
- no retired item, no dated item (`testable_from` set, whatever the date) and no
  free-sample id. The free-sample list is `data/free/<pack>_sample_ids.json`
  (`{"ids": [...]}`, as CISA's), read when it exists; none exists for CIA yet, and
  the free-sample builder must leave the held-back ids out;
- every bullet keeps at least one live, undated item in practice, so a one-item
  bullet gives none. Bullets come from the coverage maps
  (`docs/content/CIA_P{1,2,3}_COVERAGE.md`, section 3, each item's one primary
  bullet; "also touched by" does not count; a topic-line row counts as a bullet),
  not from `_provenance`, which names the notes sub-topic and not always the
  bullet. An item the map does not place is never held back;
- no two items of one sibling group (`shared/siblings.json`, cut to the pack's
  live items, groups that share an id joined, as the app joins them). A held-back
  sibling of a practised item is allowed: the pair is the transfer check;
- a difficulty mix close to the pack's: drawn to each section's own mix, and
  `--check` fails at more than 10 points off the pack's share of any level;
- what is left still holds the short mock (a third of the exam at section
  weights) in unseen, testable items, one per sibling group, so the short mock
  never needs a held-back item.

The draw is deterministic (items ordered by a SHA-256 of a fixed seed and the
id), so a build into an empty folder gives the same form for the same bank. Once
the file exists it is frozen: retiring a held-back item makes `--check` fail, and
the fix is an owner decision (`--refreeze` changes what every learner gets). On
another tree (`--root`, the harness fixture) the maps and free-sample lists are
read from `<root>/_coverage/` and `<root>/_free/` (`--maps DIR`, `--free DIR`).

## A complete reference text

`check_originality.py --require` passes only on a complete reference: all seven
source texts present and not empty (`standards_2024`, `p1_syllabus`,
`p2_syllabus`, `p3_syllabus`, `challenge_syllabus`, and the two 2026 Statements
of Position `sop_three_lines_2026` and `sop_erm_2026`, each `.txt`; `--fetch`
downloads them all) and at least 57
glossary entries parsed from the Standards (the count in the opened file on
20 Nov 2026; five were once lost at page breaks, and one more, printed with no
space after its dash, was not read until that day). The glossary is read from
`standards_2024.txt`, never from whichever file has "standards" in its name;
the last line names the file and the count. Every other `.txt` in the folder is
still read for the run checks. `--fixture-ref` turns the rule off and is used
only by `prove_harness.py`, with its made-up reference.

## The shared glossary

`shared/glossary.json` is a list of terms. Every term has `id` (a whole number,
never reused), `term`, `acronym`, `def`, `scopeNotes`, `category` and `packs`.
`check_glossary.py` checks it; `build_packs.py` builds each pack's
`glossary.json` from it.

- **`packs`** is `{pack: section number}`, for example `{"cia1": 2, "ciac": 1}`.
  The number is a section of that pack in `shared/outline.json`. **0 means "a
  term of the whole exam" and is allowed in `ciac` only** (15 terms use it): a
  Challenge term can belong to no single Challenge section, but a Part term
  always sits in the section whose notes teach it. The app pack dry run accepts
  0 in any pack; this gate is the stricter one on purpose.
- **`notes`** (optional, not built) lists the notes sub-topics that teach the
  term (`"1A7.2"`). Each must exist in a notes file of one of the term's own
  Part packs.
- **`related`** (optional, not built) lists other terms' ids. Each must exist
  and may not be the term's own.
- **`formerly`** (optional, **built into the packs**) lists older names, so a
  search can find a term by the name an older book uses. Decision of 20 Nov
  2026: it is safe to carry, because nothing reads a field it does not know:
  the phone app has no builder for `<pack>/glossary.json` yet (its Glossary
  screen is built from the notes' `key_terminologies`), and the pack dry run
  only checks that the seven fields are present. A term without older names
  keeps exactly the seven fields. The app's search has to read `formerly` when
  its glossary builder is written; until then the field is carried and unused.
  Each older name is a non-empty string and not the term's own name. Older
  names are old terms by design, so `formerly` is one of the `skip_keys` of
  `shared/stale_terms.json`, which holds for every file, the built ones
  included; nothing else of the entry is skipped.
- **One meaning per term.** The notes define terms too: in a section file's
  `key_terminologies` map (what the phone Glossary shows) and in a sub-topic's
  `key_terms` list. Where a glossary term has the same name (any letter case)
  as one of those, in any Part pack's notes, its `def` must be one of the
  notes' definitions of it, compared with runs of whitespace made one space.
  A definition that differs on purpose carries
  `"def_differs_from_notes": "<the reason>"` (not built). The gate fails on a
  difference without the mark, and on the mark where the texts are equal, where
  the notes do not define the term, or where the reason is empty. To change a
  definition, change the notes and the glossary together.

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
python3 data/cia/tools/check_glossary.py                   # the shared glossary: links, packs, one meaning per term
python3 data/cia/tools/style_cia.py cia1                   # house style: The IIA's question format (plan section 6d)
python3 data/cia/tools/check_stale_terms.py                # no 2019 or ISACA wording
python3 data/cia/tools/check_currency.py                   # dates and Topical Requirements
python3 data/cia/tools/check_originality.py --fetch --require   # own words (needs the complete reference text)
python3 data/cia/tools/check_ids.py                        # no shipped id deleted, renumbered or reused
python3 data/cia/tools/blind_copy.py cia1 1 --ids 21-45 --out /path/outside/the/repo/blind.json
python3 data/cia/tools/sync_practice_ids.py && python3 data/cia/tools/build_packs.py && python3 data/cia/tools/build_challenge.py
python3 data/cia/tools/build_held_back.py --check             # the frozen held-back forms still hold every rule
node scripts/cia_pack_dry_run.cjs
bash scripts/verify_repo.sh && (cd mobile && npm run check)
```

What the mechanical gates cannot judge (whether the keyed answer is truly the
internal auditor's best move, whether a distractor is defensible, whether a
source says what the item claims) is the job of separate agents with fresh
context: `qa-question-tester` (blind), `cia-standards-auditor`, the part
experts, `cia-currency-checker` and `cia-cross-part-reviewer`.
