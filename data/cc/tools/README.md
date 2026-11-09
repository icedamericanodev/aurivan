# CC bank tools

Small scripts for the CC question-bank pipeline (`docs/content/CC_BANK_PLAN.md`
section 3). They read and write only `data/cc/`.

| Script | Use |
|---|---|
| `check_cc.py` | Structural gate for every batch: item shape, IDs, notes and library links, tip structure, key spread, the "pick the longest" rate (15–24%, ties shared), notes coverage. `--list` names the items where the key is longest or tied. |
| `blind_copy.py` | Answer-free copy of chosen items for `qa-question-tester`. |
| `merge_library.py` | Merge a staged citation file into `originals/_framework_library.md` when several authors work in parallel. |
| `sync_practice_ids.py` | Fill each notes sub-topic's `practice_ids` (the "Practice this concept" links) from the questions' `_provenance`. Run after every batch; `--check` reports drift. |

Style rules (stem and option length, echoes, absolutes) are checked by
`python3 scripts/lint_exam_style_v2.py --file data/cc/originals/dN.json`; its
"stem names no actor" warning looks for CISA actors and is expected on CC items.

Notes are checked by the shared notes linter given the CC outline and bank:
`python3 scripts/lint_notes.py data/cc/notes/dN.json --outline docs/content/CC_BLUEPRINT.md --bank data/cc/originals`
(without `--outline` it compares with the CISA outline and reports a false error).

## key_sequence.py

Makes the key letters for a new batch, so authors never rotate letters by
hand (hand rotation left a periodic key order that the key-order gate in
`check_cc.py` now fails). Run it before writing a batch and give each item the
letter it prints:

    python3 data/cc/tools/key_sequence.py 4 25

Each domain stays balanced, and the stored order keeps a repeat rate of 15-35%
at lags 1-4 with no run longer than 3.
