# AAIA kickoff prompt (paste into a new session)

**Status: done (31 Oct 2026, PR #158).** This prompt was run once; its outputs
are `docs/content/AAIA_BLUEPRINT.md`, `docs/content/AAIA_BANK_PLAN.md`, the
`aaia-*` agents and `data/aaia/`. Don't run it again: continue from the bank
plan (batch 2 is next). Kept for history.

Written 30 Oct 2026 from the CRISC kickoff session. Copy everything inside
the fence below into a new Claude Code session on this repository.

```text
Session F: Start KaiSip content for ISACA AAIA (Advanced in AI Audit), the same
way we built ISC2 CC and are building CRISC. AAIA will be a paid course that
learners buy in the app (see section 6), so it must be good enough to sell.
Quality before count. Work
autonomously under the CLAUDE.md PR rules; ask me only for "major" items.

## 1. Read first
- CLAUDE.md (hard rules, PR self-review loop, "experts decide first").
- How CC was built, as the model to copy:
  docs/content/CC_BLUEPRINT.md, docs/content/CC_BANK_PLAN.md,
  .claude/agents/isc2-cc-standards-auditor.md, .claude/agents/cc-d1-domain-expert.md,
  .claude/agents/cc-cross-domain-reviewer.md, data/cc/notes/d1.json,
  data/cc/originals/d1.json, data/cc/originals/_framework_library.md.
- How CRISC is being built (the ISACA version of the same pattern):
  docs/content/CRISC_BLUEPRINT.md, docs/content/CRISC_BANK_PLAN.md (if merged),
  .claude/agents/crisc-standards-auditor.md, .claude/agents/crisc-d*-domain-expert.md,
  data/crisc/.
- docs/content/QUESTION_SCHEMA.md, docs/content/EXAM_STYLE_V2.md,
  docs/content/NOTES_SCHEMA_V2.md.
- The CISA bank and notes (data/originals/, data/cisa_notes.json): AAIA is an
  AUDITOR exam, so the CISA auditor lens applies, extended to AI.
- Existing agents to reuse: isaca-concept-reviewer, isaca-mindset-coach,
  qa-question-tester, cisa-citation-provenance-checker,
  cisa-citation-realism-checker, cisa-framework-currency-checker,
  cert-blueprint-researcher.

## 2. Verify the outline from ISACA (isaca.org is reachable from the cloud environment)
Facts already found on 30 Oct 2026 (re-check, then record with sources):
- Source: AAIA Exam Candidate Guide,
  https://www.isaca.org/-/media/files/isacadp/project/isaca/certification/aaia/aaia-exam-candidate-guide.pdf
  Appendix "AAIA Examination Content Outline (June 2025)".
  Outline page: https://www.isaca.org/credentialing/aaia (find the exam content outline link there).
- 90 multiple-choice questions, 2.5 hours (150 minutes). Scaled score 200–800,
  450 passes. English, Simplified Chinese, Spanish.
- Prerequisite: an active CISA, or CIA (IIA) / CPA-type credentials from the
  guide's Qualified Prerequisite List. Copy the list exactly from the guide.
- Domain 1 AI Governance and Risk (33%):
  1A AI Models, Considerations, and Requirements; 1B AI Governance and Program
  Management; 1C AI Risk Management; 1D Privacy and Data Governance Programs;
  1E Leading Practices, Ethics, Regulations, and Standards for AI.
- Domain 2 AI Operations (46%):
  2A Data Management specific to AI; 2B AI Solution Development Methodologies
  and Lifecycle; 2C Change Management specific to AI; 2D Supervision of AI
  Solutions (e.g., outputs, impacts, and decisions); 2E Testing Techniques for
  AI Solutions; 2F Threats and Vulnerabilities specific to AI; 2G Incident
  Response Management specific to AI.
- Domain 3 AI Auditing Tools and Techniques (21%):
  3A Audit Planning and Design; 3B Audit Testing and Sampling Methodologies;
  3C Audit Evidence Collection Techniques; 3D Audit Data Quality and Data
  Analytics; 3E AI Audit Outputs and Reports.
- 23 supporting tasks in the guide (evaluate AI policies, ownership of AI risk,
  data governance and privacy for AI, change/config/incident/threat/IAM
  programs for AI, vendors, AI controls, data inputs and bias, lifecycle,
  algorithms vs business objectives, workforce impact, awareness). Paraphrase them.
- The outline has only two levels (1A … 3E, 17 areas). Notes topics = these
  17 codes; notes subtopics = 1A.1, 1A.2 … that you define.
Check whether ISACA has announced a newer AAIA outline. Update the AAIA entry
in mobile/src/content/certifications.ts (passingNote: 200–800, 450 passes) in
the same PR if anything differs.

## 3. Write docs/content/AAIA_BLUEPRINT.md
Same shape as CRISC_BLUEPRINT.md: exam facts with sources, the outline table,
an "Outline lines for the notes linter" list (- 1A AI Models, ...) so
`python3 scripts/lint_notes.py --outline docs/content/AAIA_BLUEPRINT.md` works,
supporting tasks, the AAIA lens, question targets for a bank of 1,000 scaled by
weight (D1 330 / D2 460 / D3 210), trademark notes (AAIA is a trademark of
ISACA, not registered: no ®), open items.

## 4. Create the AAIA expert agents in .claude/agents/
- aaia-standards-auditor.md: the shared item-writing standard and auditor.
  The AAIA lens: a SENIOR IT auditor applied to AI. Assess, recommend and
  report; never build, tune or own the AI system. Governance, accountability
  (a named owner for every model and AI decision), evidence, explainability and
  human oversight before tooling. Risk-based audit planning. AAIA assumes CISA
  knowledge, so stems are harder than CISA on AI and skip audit basics. Same
  item rules as CRISC/CC: 4 options, one best answer, two distractors topic
  knowledge rules out, final two decided by the AAIA lens, key-longest <= 30%,
  balanced keys, every option explained, three tips (Eliminate / Final two /
  Exam cue), original wording, real current sources only.
  Sources to prefer (check each): NIST AI RMF 1.0 (NIST AI 100-1) and the
  Generative AI Profile (NIST AI 600-1), NIST AI 100-2 (adversarial ML
  taxonomy, current edition), NIST SP 800-53 Rev. 5, NIST CSF 2.0, OWASP Top 10
  for LLM Applications (current edition), MITRE ATLAS, ISACA publications
  (ITAF 4th edition, COBIT 2019, ISACA AI audit resources that you can open).
  ISO/IEC 42001:2023, ISO/IEC 23894 and the EU AI Act can't be opened from
  this environment (iso.org and eur-lex.europa.eu are blocked): name them only
  as context, never as a keyed citation, until the owner allows those hosts.
- aaia-d1-domain-expert.md, aaia-d2-domain-expert.md, aaia-d3-domain-expert.md:
  one per domain, modelled on crisc-d1-domain-expert.md: scope by sub-area,
  the real beginner and practitioner traps per sub-area to build distractors
  from, authoring and audit steps. D3 must reuse CISA audit method (sampling,
  evidence, reporting) applied to AI, and also cover using AI tools inside the
  audit (supporting tasks 1 and 2).
- aaia-cross-domain-reviewer.md: contradictions, near-duplicates, drift,
  balance, and lens leakage (a CRISC "risk owner decides" or a CISM "security
  manager runs the program" answer keyed as the auditor's move is a HARD ERROR).
- If isaca-mindset-coach.md needs AAIA detail, extend it rather than making a
  new coach.

## 5. Content, in this order (notes before questions, like CC)
1. data/aaia/notes/d{1..3}.json in notes schema v2 (copy the shape of
   data/crisc/notes/d1.json). 2–4 subtopics per outline area. Lint each with
   `python3 scripts/lint_notes.py data/aaia/notes/dN.json --outline docs/content/AAIA_BLUEPRINT.md --bank data/aaia/originals`.
2. Pilot questions: 20 per domain, data/aaia/originals/d{1..3}.json, IDs
   aaia_d1_001 …, every outline area touched at least once across the pilot.
   Lint: `python3 scripts/lint_exam_style_v2.py --file data/aaia/originals/dN.json` (0 errors).
3. data/aaia/originals/_framework_library.md: every framework_ref part as a
   bullet, each marked Verified (opened) or Likely.
4. Review pipeline (do not skip): blind test with qa-question-tester on a copy
   with only id, stem and options; standards audit with aaia-standards-auditor
   (run as a general-purpose agent told to read that file if the new agent
   type isn't loaded yet); isaca-concept-reviewer for lens; fix every HARD ERROR
   and PRECISION; re-blind-test changed items; cross-domain review.
5. docs/content/AAIA_BANK_PLAN.md: targets, batch cadence, per-sub-area plan,
   pipeline, the road to about 1,000.

AAIA is not wired into the apps yet, so no APP_VERSION bump. Never put the
bank size in learner copy. Run `bash scripts/verify_repo.sh` and
`(cd mobile && npm run check)` before pushing.

## 6. This is a paid course: build it as a sellable content pack
AAIA is new content learners buy in the app (like CRISC and CC). Read
docs/business/monetization/RECOMMENDATION.md, docs/ROADMAP.md (stages 2.7 and
Phase E) and mobile/src/content/packs/types.ts first. What that means here:
- A pack carries questions (one file per domain), notes, principles, an exam
  guide, lessons and game decks. Plan all of them in AAIA_BANK_PLAN.md, even
  though this session ships only the blueprint, agents, notes and pilot.
- Free tier: about 20% of each course's questions (at least 100), weighted by
  domain, plus one diagnostic and one short mock. The rest is paid (6-month
  access, one payment, never renews). So the bank plan must say how the free
  sample is chosen (weighted by domain and sub-area, best-reviewed items, every
  domain represented) and that the sample must be good enough to sell the course.
- Don't build the purchase flow, paywall or RevenueCat here (Phase E,
  mobile-app-engineer). Content only.
- Naming (store compliance): product names lead with KaiSip or a generic course
  name and put the exam after "for", e.g. "KaiSip AI Audit course, 6-month
  access (for the AAIA exam)". AAIA is an unregistered ISACA trademark: no ®.
  Never say "Pass", never promise a pass, never imply ISACA endorsement.
- Because people pay for it, originality is a legal must: never copy or
  closely paraphrase ISACA's review manual, QAE database or any prep bank.
- Run growth-marketer for a one-paragraph course description and
  app-store-compliance-reviewer on that copy; put both in AAIA_BANK_PLAN.md.

## 7. Handoff
Open one PR (ready for review), subscribe to it, run the reviews, fix, and
send me a short beginner-friendly summary: what ISACA's outline says, which
experts were created, what was written, what reviewers found and fixed, two
sample questions with answers and tips, and the next step. Tell me if any
blocked host (iso.org, eur-lex.europa.eu, theiia.org, coso.org) is worth
allowing in the cloud environment's network settings.
```
