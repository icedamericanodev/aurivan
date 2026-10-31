# CC bank tools

Small scripts for the CC question-bank pipeline (`docs/content/CC_BANK_PLAN.md`
section 3). They read and write only `data/cc/`.

| Script | Use |
|---|---|
| `check_cc.py` | Structural gate for every batch: item shape, IDs, notes and library links, tip structure, key spread, the "pick the longest" rate (15–24%, ties shared), notes coverage. `--list` names the items where the key is longest or tied. |
| `blind_copy.py` | Answer-free copy of chosen items for `qa-question-tester`. |
| `merge_library.py` | Merge a staged citation file into `originals/_framework_library.md` when several authors work in parallel. |

Style rules (stem and option length, echoes, absolutes) are checked by
`python3 scripts/lint_exam_style_v2.py --file data/cc/originals/dN.json`; its
"stem names no actor" warning looks for CISA actors and is expected on CC items.
