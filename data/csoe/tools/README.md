# CSOE bank tools

Small scripts for the CSOE question-bank pipeline
(`docs/content/CSOE_BANK_PLAN.md` section 3). They read and write only
`data/csoe/`. Adapted from the CC tools (`data/cc/tools/` on the
`claude/cc-bank-cross-review` branch, 31 Oct 2026), so both banks pass the same
gates. The number of CSOE domains is not fixed yet, so every script works on
whichever `originals/dN.json` files exist.

| Script | Use |
|---|---|
| `check_csoe.py` | Structural gate for every batch: item shape, IDs (`csoe_dN_NNN`), notes and library links, tip structure, key spread, the "pick the longest" rate (15–24%, ties shared), the "pick the shortest" rate (at most 30%), difficulty mix, notes coverage. `--list` names the items where the key is longest or tied; `--lib STAGED.md` accepts staged citations. |
| `style_csoe.py` | Runs the shared exam-style linter (`scripts/lint_exam_style_v2.py`, unchanged) on a CSOE domain, with one exception: a stem may skip the priority word when it names the specific rule it asks about (Section, Rule, Item, Release or Regulation followed by its number, such as "Section 403" or "Rule 12b-2"; a form name alone does not count). The CSOE standard says to ask pure rule questions directly. |
| `blind_copy.py` | Answer-free copy of chosen items for `qa-question-tester`. |
| `merge_library.py` | Merge a staged citation file into `originals/_framework_library.md` when several authors work in parallel. |
| `sync_practice_ids.py` | Fill each notes sub-topic's `practice_ids` (the "Practice this concept" links) from the questions' `_provenance`. Run after every batch; `--check` reports drift. |

Style rules (stem and option length, echoes, absolutes) are checked by
`python3 data/csoe/tools/style_csoe.py N` (the shared linter with the
direct-rule exception above). The shared linter's
"stem names no actor" warning looks for CISA actors, so it is expected on CSOE
items, but every stem must still name who acts.

Notes are checked by the shared notes linter given the CSOE outline and bank:
`python3 scripts/lint_notes.py data/csoe/notes/dN.json --outline docs/content/CSOE_BLUEPRINT.md --bank data/csoe/originals`
(the blueprint's outline lines are added once SOXCPA's course parts are
verified; until then the linter has no CSOE outline to check against).
