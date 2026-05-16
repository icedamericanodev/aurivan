# Aurivan Reddit posting pack

Ready-to-post content for r/CISA and r/ISACA. Questions are pulled from the
Aurivan question bank. No em dashes, so the posts read naturally.

Link to use until the custom domain is live:
`https://laladev-ai.github.io/cisa-prep` (swap for the real domain later).

---

## Before you post: 4 quick rules

1. Read each subreddit's rules first (r/CISA, r/ISACA). Some restrict
   self-promotion or need post flair.
2. QOTD posts get NO link in the body. Keep them pure value. The app is
   mentioned only in the next-day reveal, and only sometimes.
3. Post one per day, not several at once. Several at once looks like spam.
4. Order matters: post 2 or 3 QOTD posts first to build credibility, then the
   "I built a tool" launch post.

A soft, honest app mention belongs only in the reveal, and only on some posts.
For example: "These are from a free CISA app I built (no signup or ads):
[link]. Happy to keep posting them either way." Never in the question body.

---

## Running a recurring QOTD series

Do not post a standalone "are you interested?" poll. On Reddit that asks the
community to do work before you have given them anything, and a poll that
flops makes a good idea look unwanted. Instead:

1. Post QOTD #1 as the test. End it with a light line such as "If people find
   these useful I'll keep them coming, let me know." The upvotes and comments
   are your real interest check, and you have delivered value either way.
2. Message the subreddit mods first for a recurring series. A short, polite
   note ("I'd like to run a question-of-the-day, is that welcome, any format
   you'd prefer?") tells you the rules so you do not get removed, and some
   subreddits will support or even sticky a series they like.

---

## Launch post (r/CISA, post after a few QOTD posts)

Title:
I built a free CISA prep app, no signup, no ads, no catch

Body:
I've been preparing for the CISA exam and built a study app along the way.
It's now solid enough to share, and it's genuinely free. No account, no ads,
no paywall, nothing to unlock.

What's in it:
- 1,000+ practice questions across all five domains
- Explanations that focus on how ISACA thinks. Not just the right answer, but
  why each wrong option is tempting and where it falls short
- Illustrated study topics, realistic mock exams, and a spaced-repetition
  review queue
- Works on your phone; your progress saves locally

It's a supplement to your prep, not a replacement for official ISACA
materials, and I'd never claim it guarantees a pass. Sharing in case it helps
anyone here. Honest feedback very welcome.

Link: https://laladev-ai.github.io/cisa-prep

---

## QOTD #1, Domain 1

Title:
[CISA QOTD] You're the audit senior during fieldwork: what's your MOST important job?

Body:
An IS audit senior at a regional bank is leading the fieldwork phase of an
audit of the loan-origination system. Three staff auditors are executing the
planned procedures and gathering evidence in parallel. What is the audit
senior's MOST important responsibility during this fieldwork phase?

A) Ensure all planned procedures are completed by the original end date so the
engagement stays on schedule
B) Reassign work from slower staff so everyone completes the same number of
procedures
C) Begin drafting the audit report so delivery isn't delayed after fieldwork
ends
D) Provide ongoing supervision of staff work, review evidence as it's
collected, and document any adjustments to planned procedures

Drop your answer and your reasoning below. I'll post the ISACA logic tomorrow.

Reveal (post about 24h later as a comment or edit):
Answer: D. ISACA Audit Standard 1203 (Performance and Supervision) makes
ongoing supervision and real-time review of evidence the supervisor's defining
job during fieldwork. As evidence comes in, you judge whether the planned
procedures still hold and adjust them. The trap is A: "stay on schedule"
sounds responsible, but a fieldwork phase that finishes on time with
unreliable evidence is worse than one that runs a few days long with strong
evidence. Match each phase to its defining discipline: planning = scope and
program, fieldwork = supervised execution, reporting = communication.

---

## QOTD #2, Domain 2

Title:
[CISA QOTD] Briefing a new board on EGIT: what's its PRIMARY scope?

Body:
An IS auditor is briefing a new bank board on Enterprise Governance of
Information and Technology (EGIT). Which statement BEST describes the PRIMARY
scope of EGIT?

A) An operational framework for the IT department's day-to-day decisions,
separate from enterprise governance
B) An integral part of enterprise governance, ensuring IT investments and
operations align with enterprise strategy, with accountability resting at the
board level
C) A regulatory requirement that applies only to financial-services and
healthcare entities
D) A subset of the IT change-management process that controls how changes
reach production

Your pick + why?

Reveal:
Answer: B. Per COBIT 2019, EGIT is the system by which IT decisions are made
and overseen, integrated with overall enterprise governance, board-accountable,
and focused on IT-business alignment. The trap is C: "regulatory requirement,
only for X sectors" sounds plausible, but EGIT is a governance discipline for
any organization that uses IT. Shortcut: any EGIT-definition question is
answered by the option naming enterprise scope, board accountability, and
IT-business alignment.

---

## QOTD #3, Domain 3

Title:
[CISA QOTD] When does a project risk get escalated to the sponsor?

Body:
An IS auditor reviews a major program's risk register. Which criterion BEST
justifies escalating a project risk to the project sponsor?

A) The risk owner has assigned a target response date within the next two
reporting periods
B) The risk's residual exposure exceeds the project tolerance threshold, or it
affects authority outside the PM's mandate
C) The risk was re-rated higher in the most recent assessment cycle,
regardless of residual exposure
D) The mitigation plan involves a vendor with no signed master agreement yet

What would you escalate on, and why?

Reveal:
Answer: B. A risk goes to the sponsor for exactly two reasons: residual
exposure beyond the agreed tolerance threshold, or a response needing
authority beyond the PM's mandate (added scope, budget breach, cross-portfolio
impact). The trap is C: "re-rated higher" feels like it should trigger
escalation, but a risk can rise and still sit within tolerance and PM
authority. The trigger is the residual position vs tolerance and authority,
not the rating change itself.

---

## QOTD #4, Domain 4

Title:
[CISA QOTD] Problem management vs incident management: the real difference?

Body:
Which characteristic MOST distinguishes problem management from incident
management under ITIL 4?

A) They're interchangeable terms: same team, same process, same tools
B) Problem management is just a more thorough incident process used when an
incident runs past a time threshold
C) Problem management investigates root causes to prevent future incidents;
incident management restores service from current outages as fast as possible
D) Problem management is for application bugs only; incident management is for
infrastructure outages

Answer + reasoning below.

Reveal:
Answer: C. Incident management = restoration of a current outage, fast and
reactive. Problem management = root-cause investigation for prevention,
analytical and longer-running. The trap is A ("interchangeable"), a common
misconception in less-mature shops. ITIL 4 deliberately separates them because
they serve different purposes. Note B and D are also wrong: duration doesn't
define them, and both handle app and infrastructure issues. Shortcut: answer
the option naming prevention vs restoration.

---

## QOTD #5, Domain 5

Title:
[CISA QOTD] Reviewing access standards: which are the canonical access principles?

Body:
An auditor reviews access standards for a regulated firm. Which combination
BEST captures the canonical access principles to validate?

A) Strong passwords + MFA: authentication strength is the foundation of access
standards
B) Role-based access control (RBAC) implemented across all systems
C) Privileged access management (PAM) tooling deployed for privileged users
D) Least privilege + need-to-know + segregation of duties + default-deny +
periodic recertification

Your call + why?

Reveal:
Answer: D. Least privilege, need-to-know, segregation of duties, default-deny,
periodic recertification. The trap is B: RBAC is seductive because everyone
uses it, but RBAC is the implementation, not the principle. An RBAC system
with over-broad roles violates least privilege. A, B and C all confuse
mechanisms (how) with principles (what access is granted). Shortcut: if the
stem says "principles", answer the five principles; if it says
"implementation", look for the mechanism.

---

## QOTD #6, Domain 1

Title:
[CISA QOTD] You audited a system you used to build. What's the right call?

Body:
An IS auditor at a SaaS company is assigned to audit the new
identity-and-access-management (IAM) deployment. The auditor previously worked
as the lead engineer on the IAM project before transferring to the audit team
six months ago. What is the MOST appropriate action?

A) Decline the audit assignment and have a different auditor take the engagement
B) Proceed with the audit but disclose the prior involvement in the audit report
C) Limit the audit scope to areas the auditor was not directly involved in
D) Have a peer auditor independently review all audit conclusions before issuance

Answer + reasoning below.

Reveal:
Answer: A. Self-review is a textbook independence threat. You cannot objectively
assess your own prior work, no matter how much time has passed or how thorough
the disclosure. The trap is B: disclosure feels transparent, but it only
documents a conflict, it does not resolve one. Scope-limiting and peer review
treat the symptom and leave the structural conflict in place. The default
remediation for self-review is reassignment.

---

## QOTD #7, Domain 2

Title:
[CISA QOTD] The Three Lines Model: where do the boundaries actually sit?

Body:
An IS auditor at a health-insurance company is explaining the Three Lines Model
to the audit committee. Which statement BEST describes the boundaries between
the three lines?

A) First line = operational management owning risks in their areas; second line
= risk and compliance functions providing oversight (not independent); third
line = internal audit providing independent assurance
B) First line = internal audit performing operational testing; second line =
compliance functions; third line = the board accepting all final risk decisions
C) All three lines report to internal audit, which is the single point of
accountability for the entire risk-management framework
D) The Three Lines Model is interchangeable with COSO's Internal Control
Framework and the terms can be used synonymously

Your pick + why?

Reveal:
Answer: A. The IIA's Three Lines Model: first line owns the risk (operational
management), second line supports and monitors (risk and compliance, but NOT
independent of management), third line gives independent assurance (internal
audit). The trap is C: "audit owns everything" sounds rigorous, but it destroys
the very independence the third line exists to provide. The third line cannot
assure what it owns.

---

## QOTD #8, Domain 3

Title:
[CISA QOTD] What BEST detects unauthorized changes to Infrastructure-as-Code?

Body:
Which control BEST detects unauthorized configuration changes to cloud
infrastructure managed via Infrastructure-as-Code?

A) Continuous comparison between the IaC-declared state and the live cloud
state, with alerts on any unexpected divergence
B) An annual cloud-architecture review of security-group changes against
approved baselines
C) Monthly export of the cloud configuration for offsite backup, giving
rollback capability after an incident
D) Quarterly user-access reviews of cloud admin accounts to detect
inappropriate privilege grants

Answer + reasoning below.

Reveal:
Answer: A. Drift detection is a continuous comparison: the IaC-declared state
(what should exist) reconciled against the live state (what does exist), with
alerts on divergence. The trap is C: a backup sounds related, but it captures
whatever is there, drift included. It does not detect the change. Periodic
reviews are too slow, and access reviews catch permission changes, not
configuration changes.

---

## QOTD #9, Domain 4

Title:
[CISA QOTD] Who should be allowed to change a database's metadata?

Body:
Which control BEST addresses the risk associated with a database management
system's metadata (data dictionary, system catalogs)?

A) Restrict metadata modification to DBAs with logged actions, version control
of schema changes, and integrity verification of system catalogs
B) Allow any developer or analyst to modify metadata directly so they can adapt
the schema dynamically to changing business requirements
C) Disable metadata access entirely; modern applications do not need to query
system catalogs, and disabling reduces attack surface
D) Treat metadata as application data and back it up nightly with the same
procedures and retention as customer transaction records

Your call + why?

Reveal:
Answer: A. Metadata holds the canonical definition of the database structure;
uncontrolled change breaks every application that depends on it. The controls
are DBA-restricted modification, logged actions, version-controlled schema
changes, and catalog integrity verification. The trap is B: letting developers
modify metadata "for agility" sounds modern, but it breaks application
contracts at scale. Schema changes need governance regardless of methodology.

---

## QOTD #10, Domain 5

Title:
[CISA QOTD] Auditing data center physical security: what's the real scope?

Body:
An IS auditor is conducting a data center physical security audit. Which
approach BEST addresses the relevant audit scope?

A) Review CCTV coverage maps, recording retention, playback integrity, and
monitoring staffing
B) Inspect fire suppression, smoke detector placement, and fire marshal
sign-off
C) Sample 30 days of badge-access logs, provisioning and de-provisioning
records, and terminated-employee access revocation
D) A multi-element scope: perimeter, interior zones, access mechanisms, visitor
management, monitoring, environmental controls, emergency procedures,
post-incident review, vendor access, and audit-trail integrity

Answer + reasoning below.

Reveal:
Answer: D. A data center physical security audit is multi-element by nature.
The trap is C: sampling badge-access logs is a real, substantive technique, but
log-only review misses everything the badge system never captures, including
visitor management, environmental integration, and emergency procedures. A, B
and C each cover just one slice; the audit scope is the whole set.
