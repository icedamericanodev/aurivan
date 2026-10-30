# Start here

Paste this into Claude Code from the root of the KaiSip repo, after copying this folder to `design-notes/grove/`.

---

We are giving KaiSip a visual uplift called Grove. kaisip.com and the Android app share this codebase, so one change updates both.

1. Read `design-notes/grove/GROVE_HANDOFF.md` from top to bottom. It is the source of truth.
2. Look at every image in `design-notes/grove/screens/`. Open the matching file in `design-notes/grove/reference/` when you need exact sizes, colours or SVG paths.
3. Read the repo's `CLAUDE.md` and follow it.
4. Create the branch `feature/grove-ui`. Never commit to `main`.
5. Before you change any code, reply with:
   - where the theme tokens, navigation, Today, Learn, Practice and You screens live in the code
   - anything in the handoff that does not match the code, and how you plan to handle it
   Then wait for my OK.
6. After my OK, do Phase 1 only. Commit, tell me what changed, and wait for my OK before the next phase.

Hard rules: keep every piece of existing content (section 10 of the handoff), do not touch the quiz engine, scoring, readiness maths, data or storage keys, keep both light and dark themes working, and use no em dashes or en dashes anywhere.
