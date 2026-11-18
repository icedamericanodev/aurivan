# Archive

Retired files, kept for history. Nothing here is used by the web app, the
mobile app, CI, `scripts/verify_repo.sh` or `scripts/build_site.sh`, and
nothing here is kept up to date. Files were moved with `git mv`, so
`git log --follow <path>` shows their history.

| Item | What it was | Why retired | Date |
|---|---|---|---|
| `MASTER_HANDOFF.md` | v9 design handoff and variant selections | Superseded by `docs/mobile/DESIGN_SYSTEM.md` (Grove, v11). Kept because some agents still read its old brand section | 15 Oct 2026 |

## Removed on 18 Nov 2026

The rest of the archive was deleted to tidy the repo. Nothing in the apps,
the website build, CI, the scripts or the agents used it. Every file is still
in git history: run `git log --all --diff-filter=D --name-only -- archive/`
to list them and `git show <commit>^:<path>` to read one.

- `RELAUNCH_CHECKLIST.md` (question-bank relaunch plan)
- `handoff/NEXT_SESSION_v9.md` (v9.2 session handoff)
- `question-bank-v8/` (old tips overrides and the xlsm converter)
- `question-bank-rebuild/` (rebuild queue, coverage trackers, retros)
- `scripts/` (three rebuild-era one-off checkers)
- `design-notes/` (rejected backend proposal, v9 mobile audit snippets, unused skill notes)
- `design/grove_v2.png` (5 MB Grove v2 render)
- `github-workflows/android-apk.yml` (retired debug-key APK workflow)

Also removed the same day, outside this folder: `design-notes/landing-round-four/`
(the home page draft, now live as `home.html`), `docs/mobile/concept-lab/`
(a one-off branch review and its screenshots) and
`mobile/assets/widgets/plant.png` (unused; the plant widget preview is `plan.png`).
