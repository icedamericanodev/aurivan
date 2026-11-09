# KaiSip agent workflow

Use the existing project workflow in `CLAUDE.md` and `CONTRIBUTING.md`.
Read them before implementation; read `mobile/CLAUDE.md` for mobile changes.
The role instructions in `.claude/agents/` apply regardless of which coding
assistant runs them. Do not create a competing review process.

## Review, fix, test, release

1. Reproduce the reported issue and make a scoped change on a feature branch.
2. Before merging, run independent reviewers suited to the change using the
   role files listed in `CLAUDE.md`. For Beta Desk, use
   `beta-desk-engineer`, `smoke-tester`, `cisa-ux-reviewer`, and the Supabase
   checks in `mobile-security-auditor`. Reviewers report evidence, severity,
   a merge recommendation, and anything they could not test.
3. Fix blocking findings and clearly correct small findings. Have reviewers
   re-check fixes, run the relevant regression tests and required CI, and
   repeat until no blocking findings remain. Never report an unrun check as
   passed. Keep secrets and real accounts out of automated tests.
4. Follow the risk-tiered merge policy in `CONTRIBUTING.md`. For a change
   requiring owner approval, record explicit approval for that PR before
   an agent merges it. Do not treat approval for one PR as a permanent waiver
   of the policy, and do not bypass a tool approval rejection.
5. Once review, checks, and required approval are complete, squash-merge,
   follow `CLAUDE.md` branch hygiene, and verify the deployed result.
   For backend-dependent pages, deploy and check the backend first.
6. Give the owner a short outcome, evidence/screenshots where relevant, and
   exact testing steps. Clearly distinguish deployed changes from any manual
   acceptance test still needed. Escalate only the major decisions listed in
   `CLAUDE.md`; resolve ordinary implementation findings within scope.

Use `.claude/workflows/web-page-expert-review.js` for its existing marketing
and website-page scope; a private admin sign-in fix uses the focused roles
above. Agent runtimes may orchestrate these roles with their own tools while
preserving the same independent review and reconciliation steps.
