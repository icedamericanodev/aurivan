# Archive

Retired files, kept for history. Nothing here is used by the web app, the
mobile app, CI, `scripts/verify_repo.sh` or `scripts/build_site.sh`, and
nothing here is kept up to date. GitHub does not run workflows stored here.
Files were moved with `git mv`, so `git log --follow <path>` shows their
history.

| Item | What it was | Why retired | Date |
|---|---|---|---|
| `MASTER_HANDOFF.md` | v9 design handoff and variant selections | Superseded by `docs/mobile/DESIGN_SYSTEM.md` (Grove, v11) | 15 Oct 2026 |
| `RELAUNCH_CHECKLIST.md` | Plan for the question-bank takedown, rebuild and relaunch | The relaunch shipped; its question schema moved to `docs/content/QUESTION_SCHEMA.md` | 26 Oct 2026 |
| `handoff/NEXT_SESSION_v9.md` | v9.2-era session handoff note (was `.handoff/NEXT_SESSION.md`) | The work it describes is finished; nothing referenced it | 26 Oct 2026 |
| `question-bank-v8/tips_overrides/d1.json` … `d5.json` | Hand-authored tips for the pre-rebuild (v8) bank | Tips now live inline in `data/originals/d{N}.json`; these match none of the live questions | 26 Oct 2026 |
| `question-bank-v8/convert_test_bank.py` | Converter from the off-repo xlsm plus tips overrides to `data/domain{N}.json` | Replaced by `scripts/originals_to_domain.py`; running it would overwrite the live bank with the old one | 26 Oct 2026 |
| `question-bank-rebuild/_concept_queue.yaml` | Planning queue for the question-bank rebuild | The rebuild shipped; nothing reads it | 26 Oct 2026 |
| `question-bank-rebuild/_d1_toc_coverage.md` … `_d5_toc_coverage.md` | Per-domain coverage trackers for the rebuild | Frozen since May 2026; coverage now follows `docs/content/CISA_ECO.md` | 26 Oct 2026 |
| `question-bank-rebuild/_mid_bank_retro.md` | Mid-rebuild retrospective | History only | 26 Oct 2026 |
| `question-bank-rebuild/_post_d3_retro.md` | Retrospective after Domain 3 | History only | 26 Oct 2026 |
| `scripts/batch_summary.py` | Rebuild batch reporter | Not used by CI, `verify_repo.sh`, agents or docs | 26 Oct 2026 |
| `scripts/check_letter_references.py` | One-off checker for a Domain 1 letter-reference bug | One-off; no longer used | 26 Oct 2026 |
| `scripts/check_tip2_stem_cued.py` | Rebuild-era tip check | Only the archived coverage tracker referenced it; exam-style v2 linting replaced it | 26 Oct 2026 |
| `design-notes/BACKEND_ARCHITECTURE.md` | Proposal for a custom backend | Rejected in favour of Supabase (`docs/mobile/ARCHITECTURE.md`) | 26 Oct 2026 |
| `design-notes/audit-mobile.js` | v9 DevTools mobile-layout audit snippet | Built for the retired navy design | 26 Oct 2026 |
| `design-notes/fix-mobile.js` | v9 fixer script that hard-codes the retired navy palette | Built for the retired navy design | 26 Oct 2026 |
| `design-notes/SKILL.md` | "kaisip-design" skill notes | Not under `.claude/skills/`, so never loaded | 26 Oct 2026 |
| `design/grove_v2.png` | 5 MB render of the Grove v2 mockup (was `docs/mobile/design/`) | The live app and store screenshots supersede it; `grove_v2.html` stays in `docs/mobile/design/` | 26 Oct 2026 |
| `github-workflows/android-apk.yml` | "Android test APK" workflow (GitHub Releases APKs signed with the public debug key) | Retired by the owner (Gate 4, `docs/mobile/SECURITY_GATES.md`); test APKs now come from "Phone build (EAS Build)" with the preview profile | 26 Oct 2026 |
