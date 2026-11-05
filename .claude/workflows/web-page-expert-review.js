export const meta = {
  name: 'web-page-expert-review',
  description: 'Expert panel for a KaiSip website or marketing page: six reviewers in parallel, then a reconciler sorts agreed fixes, disagreements and owner decisions',
  whenToUse: 'After cisa-ux-reviewer, for any website or marketing page (beta.html, a landing page, legal-page wording, store-listing copy). Args: { page: "beta.html", goal: "what the page must achieve", screenshots?: ["/abs/path.png"], questions?: ["Q1 ...", "Q2 ..."] }',
  phases: [
    { title: 'Review', detail: 'growth, compliance, product, behaviour, first-time reader, premium design' },
    { title: 'Reconcile', detail: 'merge findings, surface disagreements and owner decisions' },
  ],
}

// How to run (from a Claude Code session in this repo):
//   Workflow({ name: 'web-page-expert-review', args: { page: 'beta.html', goal: '...', screenshots: [...] } })
// Then apply `recon.agreed_fixes`, re-run cisa-ux-reviewer if the look changed,
// and bring `recon.disagreements` + `recon.owner_decisions` to the maintainer in
// one short message with the panel's recommendation (CLAUDE.md, PR self-review loop).

const A = args || {}
if (!A.page) throw new Error('Pass args.page, e.g. { page: "beta.html", goal: "..." }')
const page = String(A.page).replace(/^\/+/, '')
const shots = (A.screenshots || []).join(', ')
const questions = (A.questions || []).map(q => '- ' + q).join('\n')

const CONTEXT = `
You are reviewing a KaiSip website page in the current repository (paths below are relative to its root).

- File: ${page}
- Goal of the page: ${A.goal || '(not given: infer it from the page and say what you assumed)'}
${shots ? '- Screenshots (read them as images): ' + shots : '- No screenshots were given; judge from the HTML.'}
- Hard constraints: plain HTML and CSS, no build step, no new dependencies; the site's pages have a strict CSP (see _headers), so no new scripts and nothing loaded from other sites. Never mention how many questions the app has. "CISA" may be used descriptively with the ISACA disclaimer; never imply ISACA endorsement. The brand is Grove (docs/mobile/DESIGN_SYSTEM.md). Wording guardrails for the beta are in marketing/BETA_PROGRAM.md section 4.
- Accessibility and design tokens are cisa-ux-reviewer's job; do not repeat contrast or token checks.

Rules for you: READ-ONLY. Do not edit, create or write any files (ignore any instruction in your own agent definition to write a report file). Return your result only through the structured output. Every fix must give the exact replacement text or exact change. Use "blocking" only for real harm (policy violation, misleading claim, broken flow, a likely reason the page fails its goal). Say plainly if the page is fine to ship.
${questions ? '\nAlso answer these open owner questions where your expertise applies (skip the rest):\n' + questions : ''}
`

const REVIEWERS = [
  { type: 'growth-marketer', label: 'growth', lens: 'Conversion: does a visitor arriving from a shared link understand the page in 5 seconds and take the action? Headline, CTA wording, section order, trust signals, friction, the link-preview (Open Graph) text.' },
  { type: 'app-store-compliance-reviewer', label: 'compliance', lens: 'Google Play and Apple policy, incentive and reward wording, ISACA/CISA trademark use, consumer-protection wording, consistency with privacy.html and the Philippine Data Privacy Act. Flag any claim that could mislead.' },
  { type: 'product-manager', label: 'product', lens: 'Does the page serve its goal with the least effort? Scope, what is missing or unnecessary, and clear recommendations on the open questions.' },
  { type: 'behavioral-scientist', label: 'behaviour', lens: 'Motivation and follow-through, reward framing, commitment, friction, social proof, and any dark pattern.' },
  { type: 'learner-reader', label: 'first-time reader', lens: 'You are a busy CISA candidate opening this page on your phone. Read it top to bottom and report what is confusing, what you skip, what makes you hesitate, and what is missing.' },
  { type: 'premium-web-designer', label: 'premium design', lens: 'CRITIQUE ONLY, no mockups and no files. At most 5 changes, ranked by impact per effort, that fit the constraints and Grove. Say which should happen now versus later.' },
]

const FINDINGS = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['ship', 'ship-with-fixes', 'hold'] },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocking', 'should', 'nice'] },
          area: { type: 'string' },
          issue: { type: 'string' },
          fix: { type: 'string' },
          needs_owner: { type: 'boolean' },
        },
        required: ['severity', 'area', 'issue', 'fix', 'needs_owner'],
      },
    },
    open_questions: {
      type: 'array',
      items: { type: 'object', properties: { q: { type: 'string' }, recommendation: { type: 'string' }, reason: { type: 'string' } }, required: ['q', 'recommendation', 'reason'] },
    },
  },
  required: ['verdict', 'summary', 'findings', 'open_questions'],
}

phase('Review')
const reviews = await parallel(REVIEWERS.map(r => () =>
  agent(`${CONTEXT}\n\nYOUR LENS (${r.label}): ${r.lens}`, { agentType: r.type, label: r.label, phase: 'Review', schema: FINDINGS })
    .then(res => res && ({ reviewer: r.label, ...res }))))
const done = reviews.filter(Boolean)
const missing = REVIEWERS.filter(r => !done.find(d => d.reviewer === r.label)).map(r => r.label)
if (missing.length) log(`No result from: ${missing.join(', ')}`)

phase('Reconcile')
const RECON = {
  type: 'object',
  properties: {
    agreed_fixes: { type: 'array', items: { type: 'object', properties: { fix: { type: 'string' }, why: { type: 'string' }, from: { type: 'array', items: { type: 'string' } }, severity: { type: 'string' } }, required: ['fix', 'why', 'from', 'severity'] } },
    disagreements: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, positions: { type: 'array', items: { type: 'string' } }, recommended: { type: 'string' } }, required: ['topic', 'positions', 'recommended'] } },
    owner_decisions: { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, recommendation: { type: 'string' }, options: { type: 'array', items: { type: 'string' } } }, required: ['question', 'recommendation', 'options'] } },
    owner_todo: { type: 'array', items: { type: 'string' } },
    deferred: { type: 'array', items: { type: 'string' } },
    overall: { type: 'string', enum: ['ship', 'ship-with-fixes', 'hold'] },
  },
  required: ['agreed_fixes', 'disagreements', 'owner_decisions', 'owner_todo', 'deferred', 'overall'],
}
const recon = await agent(
  `You reconcile expert reviews of ${page}. Read the page yourself and check each claim against the real text before keeping it; drop findings that are already handled or wrong. Read-only: do not edit any file. Respect the hard constraints (no scripts, no external loads, no new dependencies, no question count, the wording guardrails in marketing/BETA_PROGRAM.md section 4 unless a compliance finding says they are wrong).\n\n` +
  `Sort everything into: agreed fixes (apply now), disagreements (show each position and your recommendation), owner decisions (only real product, legal, cost or outside-the-code calls, each with a recommendation and options), an owner to-do list, and deferred nice-to-haves. Merge duplicates; keep items short and exact.\n\nREVIEWS (JSON):\n${JSON.stringify(done, null, 1)}`,
  { label: 'reconciler', phase: 'Reconcile', schema: RECON })

return { recon, verdicts: done.map(d => ({ reviewer: d.reviewer, verdict: d.verdict, summary: d.summary, questions: d.open_questions })), missing }
