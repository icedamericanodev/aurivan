# CC study suite: what exists and how the apps should use it

Written 31 Oct 2026. CC is not wired into the web or phone app yet. This file
lists the CC content behind each learning surface CISA already has, so the
session that wires CC in (Stage 2.7 in `CC_BANK_PLAN.md`) can do it without
rediscovering anything. Content lives only in `data/cc/`; nothing here changes
`index.html` or `mobile/`.

## 1. Surface by surface

| Surface (as CISA has it) | CISA source | CC source | Status |
|---|---|---|---|
| Study notes | `data/cisa_notes.json` | `data/cc/notes/d{1..5}.json` (notes schema v2) | Ready. Lint: `scripts/lint_notes.py <file> --outline docs/content/CC_BLUEPRINT.md --bank data/cc/originals` |
| Glossary | `data/glossary.json` | `key_terminologies` in each `data/cc/notes/dN.json`, plus the `key_terms` of each sub-topic | Ready as data. The app needs a CC glossary view, or a filter, that merges the five files (the final review week's glossary task points there) |
| Principles (how to think) | `data/mindset/principles.json` | `data/cc/mindset/principles.json` (principles schema v2, CC practitioner lens) | Ready. Lint: `python3 data/cc/tools/lint_cc_principles.py` |
| About the exam | `data/exam/cisa_exam_guide.json` | `data/cc/exam/cc_exam_guide.json` | Ready; facts checked on isc2.org on 31 Oct 2026. Lint: `python3 data/cc/tools/lint_cc_exam.py` |
| Final review week | `data/exam/final_review_week.json` | `data/cc/exam/final_review_week.json` | Ready. Same linter |
| Practice | `data/domain{N}.json` | `data/cc/originals/d{1..5}.json` | Growing toward about 1,000 (plan in `CC_BANK_PLAN.md`). Checks: `data/cc/tools/check_cc.py`. The apps need a converter or a CC pack in `mobile/scripts/build-content.mjs` |
| Mock exam | the app's mock engine | the CC bank plus the settings in section 2 | Needs the CC block in `mobile/src/content/certifications.ts` and a CC entry in the web app's DI (section 3) |
| Decision lessons | `data/lessons/cisa.json` | none yet | Follow-up: CC lessons would follow `LESSONS_SCHEMA` |

Why the two CC linters exist: the shared linters (`scripts/lint_exam_guide.py`,
`scripts/lint_principles.py`) are written for ISACA courses. They expect
ISACA's disclaimer and sources, note codes like `1B3.2`, whole-number weights
and an app block for the course. The CC wrappers in `data/cc/tools/` load the
shared code unchanged and swap only the ISC2 parts. When the shared linters
learn issuers and CC gets an app block, switch to
`python3 scripts/lint_exam_guide.py --cert cc` and retire the wrapper.

## 2. Mock exam settings (checked on isc2.org, 31 Oct 2026)

The real CC exam is computerized adaptive testing (CAT). It has 100 to 125
questions in 2 hours, pass or fail on a scaled 700 out of 1000, and you cannot
review or change an answer once you finalize it. It is delivered only at
Pearson VUE test centers.

| Setting | Full mock | Mini mock |
|---|---|---|
| Questions | 125 (the exam's maximum) | 42 (a third of the exam, as `miniMockSize()` in `mobile/src/engine/finalWeek.ts`) |
| Minutes | 120 | 40 (same pace, `mockPace()`: round(120 / 125 × 42)) |
| D1 Security Principles (24%) | 30 | 10 |
| D2 Security Governance (17.3%) | 22 | 7 |
| D3 Identity and Access Management (IAM) Concepts (20%) | 25 | 9 |
| D4 Networking and Cloud Security Concepts (21.3%) | 27 | 9 |
| D5 Security Operations and Incident Response (17.3%) | 21 | 7 |

- Allocation uses the same largest-remainder rule as `allocate()` in
  `mobile/src/engine/blueprint.ts`. ISC2's published weights sum to 99.9 (its
  table shows Total 100%); `allocate()` handles it.
- Difficulty mix: about 35% foundational, 50% application, 15% analysis
  (the CC item rule in `.claude/agents/isc2-cc-standards-auditor.md`).
- Learner disclaimer on the mock screen: "This practice exam has a fixed length
  and four-option questions. The real CC exam adapts to your answers, can end
  anywhere from 100 to 125 questions, and may include other question types. On
  the real exam you cannot go back and change an answer."
- Do not call the mock a CAT simulation and do not show a scaled score; ISC2
  reports pass or fail only.
- Product question for later (product-manager): offer a "no going back" mode
  for the full mock, since the real exam has no review.

## 3. Ready-to-paste app block (for the app session)

For `mobile/src/content/certifications.ts`, next to the `cissp` entry (uses
the existing `ISC2` issuer and `ISC2_TM` helper):

```ts
  {
    id: 'cc',
    name: 'CC',
    fullName: 'Certified in Cybersecurity',
    issuer: ISC2,
    mindset:
      'Think like an entry-level security practitioner: protect people first, follow policy and procedure, ' +
      'do the task your role assigns, escalate to the owner when it is outside your authority, ' +
      'leave risk acceptance to the risk owner within tolerance and to senior management beyond it, and pick the basic control that fits.',
    trademarkNotice: ISC2_TM('CC'),
    status: 'coming_soon',
    exam: {
      // CAT exam: 100–125 items in 2 hours (isc2.org, checked 31 Oct 2026); the mock uses the maximum.
      questions: 125,
      minutes: 120,
      difficultyMix: { analysis: 0.15, application: 0.5, foundational: 0.35 },
      passingNote: 'ISC2 reports pass or fail only; the passing mark is a scaled 700 out of 1000.',
    },
    domains: [
      // Outline effective 1 Sep 2026. ISC2's published weights sum to 99.9 (its table shows Total 100%); allocate() handles it.
      { id: '1', name: 'Security Principles', short: 'Principles', weight: 24, tone: 0 },
      { id: '2', name: 'Security Governance', short: 'Governance', weight: 17.3, tone: 1 },
      { id: '3', name: 'Identity and Access Management (IAM) Concepts', short: 'IAM', weight: 20, tone: 2 },
      { id: '4', name: 'Networking and Cloud Security Concepts', short: 'Network & Cloud', tile: 'Network', weight: 21.3, tone: 3 },
      { id: '5', name: 'Security Operations and Incident Response', short: 'Ops & IR', weight: 17.3, tone: 4 },
    ],
  },
```

Check before pasting: the `Certification` type must accept decimal weights and
a `tile` field (copy whatever the other entries use), and the web app's DI
must get the same weights in the same commit (CLAUDE.md hard rule 2 and the
mobile rule on weights).

## 4. Open items for the app session

- The phone Mistakes screen's examples for the tags "Acted as the wrong person"
  and "Tool before policy" read as auditor advice. Suggested CC wording: "You
  fixed it yourself, when your job was to report it to the owner." and "You
  picked a tool or a quick fix before following the policy or procedure." The
  tag labels must stay as they are, because the CC final review week quotes
  them exactly. Day 6 glosses them for CC instead: "Acted as the wrong person"
  also covers passing up your own task, "Tool before policy" means a skipped
  step, "Missed FIRST or BEST" covers any priority word, and a learner who
  picked the close second tags the reason it lost (the app has no such tag).
  The screen also serves CISA, so the examples may need to differ by
  certification. Whether CC gets its own tag set is a product decision.
- The glossary task in the final review week needs a CC glossary view.
- CC reschedule fee: US$50 (cancel US$100), charged by Pearson; One Million
  Pledge first-time CC sitters by 31 Dec 2026 pay no reschedule fee (cancel fee
  not waived). Source: https://www.isc2.org/exams/schedule-exam and
  https://www.isc2.org/frequently-asked-questions (checked 31 Oct 2026). The
  guide now states these amounts.
- `mobile/src/engine/pace.ts` keeps a 15-minute reserve to revisit flagged
  questions, so CC's target pace would show as about 50 seconds with "time to
  revisit flagged ones". The real CC exam has no review, and the CC files plan
  about 55 seconds a question with question 65 at the 1-hour mark. Give the
  pace engine a per-exam no-review case (no reserve, no "flagged" wording)
  before CC ships.
- The slip coach's role line (`PATTERN_COPY.role.coach` in
  `mobile/src/engine/slipCoach.ts`) says "auditor, manager or board?".
  Suggested CC wording: "Ask who you are in the question, and whether the
  decision is yours or the owner's."
- Re-check the exam guide's facts every 180 days (the linter warns when they
  are older).
