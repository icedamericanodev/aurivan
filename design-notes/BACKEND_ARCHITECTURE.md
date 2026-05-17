# Backend Architecture — Plain-Language Design Doc

**Status:** Proposal / for review · **Author:** Claude Code session ·
**Branch:** `claude/custom-backend-architecture-sgpU2` · **Date:** 2026-05-17

> **Who this is for.** This document is written so a *non-developer* can
> read it top to bottom and understand what we are building, why, what it
> costs, what the risks are, and what decisions still need to be made.
> Technical terms are explained the first time they appear, and there is a
> full glossary at the end. You do **not** need to read any code to
> understand this.

---

## 1. The one-paragraph summary

Today the CISA Mindset app is a single web page that runs entirely on the
learner's own device. It has no memory of who the learner is and nothing is
saved anywhere except in that one browser. We want to add a **backend** — a
second piece of software that runs on a computer *we* control — so that
learners can **create an account**, have their **study progress follow them
across devices**, let us **manage the question bank centrally**, and
**pay for a premium tier**. This document proposes building that backend
**ourselves** instead of renting a pre-made one (Supabase, Insforge,
Firebase). We own the code and the data; we take on a modest amount of
ongoing maintenance in exchange.

---

## 2. Background: what we have today

### 2.1 The current app in plain terms

The app right now is what's called a **static site**. Think of it like a
PDF or a printed book: when a learner opens it, their browser downloads the
whole thing once, and from then on everything happens on *their* device.

- `index.html` — one big file containing the whole app (the screens, the
  styling, the logic).
- `data/domain{1..5}.json` — the question banks, shipped as plain data
  files alongside the app.
- The learner's progress (which questions they answered, their scores) is
  saved in something called **localStorage** — a small private notepad
  that lives *inside that one browser on that one device*.

### 2.2 Why that is great

- **Nothing to run.** There is no server to keep alive, patch, or pay for.
- **Nothing to break.** No database to corrupt, no login system to be
  hacked.
- **Private by default.** We never see the learner's data because it never
  leaves their device.
- **Cheap.** Hosting a static site costs near zero.

### 2.3 Why that is now limiting

- **Progress is trapped.** If a learner studies on their laptop and then
  opens the app on their phone, the phone knows nothing — progress does not
  follow them. Clearing browser data wipes everything permanently.
- **No accounts.** We cannot say "welcome back" because we have no idea who
  anyone is.
- **No central control of content.** Every fix to a question means
  re-publishing the whole app to everyone.
- **No way to charge money.** There is no notion of "this learner paid and
  that one didn't."

The four things you asked for — **accounts, progress sync, central
question management, and payments** — are all things a static site
*structurally cannot do*. Every one of them needs a computer that we
control and that all learners talk to. That computer is the **backend**.

---

## 3. The core idea: frontend and backend

A useful mental model is a **restaurant**.

```
   ┌─────────────────────┐         ┌──────────────────────────┐
   │   THE DINING ROOM    │         │       THE KITCHEN        │
   │   (the "frontend")   │  <───>  │      (the "backend")     │
   │                      │         │                          │
   │ What the learner     │ orders  │ Where the real work and  │
   │ sees and touches:    │ ──────> │ the storage happen:      │
   │ screens, buttons,    │         │ checks who you are,      │
   │ the question UI.     │ <────── │ saves progress, holds    │
   │ Runs on THEIR device.│ food    │ the master question bank,│
   │                      │         │ talks to the payment co. │
   └─────────────────────┘         └──────────────────────────┘
        index.html                   NEW — this whole document
     (mostly already built)            is about building this
```

- **Frontend** = the **dining room**. It is what the learner sees and
  touches. We already have this — it is `index.html`. It runs on the
  learner's phone or laptop.
- **Backend** = the **kitchen**. The learner never sees it directly. It
  runs on a computer we control, in a data centre. It does the work that
  must be trusted and shared: confirming identity, storing data safely,
  holding the one true copy of the question bank, and handling money.

The two talk to each other by sending small messages over the internet.
The dining room "places an order" ("here is the answer this learner just
gave") and the kitchen "sends back a dish" ("saved — here is their updated
score"). Those messages are the **API** (Application Programming
Interface — just a fancy term for the fixed menu of requests the kitchen
agrees to accept).

---

## 4. The pieces of the backend, one at a time

The backend is not a single thing; it is a small set of cooperating parts.
Here is each one in plain language.

### 4.1 The API server — the "front desk"

This is the program that is always running, listening for messages from
learners' devices. It is the **front desk of the kitchen**: every request
goes through it, it checks each request is allowed, it does the work or
passes it along, and it sends an answer back.

- It does **not** have a screen. It is just a program that waits for
  messages and replies to them.
- Every feature in this document is, underneath, the front desk receiving
  a request like "log this person in" or "save this score" and answering.

**Proposed technology:** a small, modern toolkit called **Hono**, running
on **Node.js**. You do not need to know what those are; the relevant point
is that they are *lightweight and not tied to any one vendor*, so we can
move the backend to a different host later without rewriting it.

### 4.2 The database — the "filing cabinet"

The database is **organised, permanent storage**. It is the kitchen's
filing cabinet, and it is the single most important new asset we are
creating, because it holds everything that matters: who every learner is,
what they have studied, who has paid.

- Unlike browser localStorage (one notepad, one device, easily lost), the
  database is **central, backed up, and durable**.
- It is organised into **tables**, which are exactly like spreadsheets:
  one table for accounts, one for progress, one for payments, and so on.
  Section 6 lays these out.

**Proposed technology:** **PostgreSQL** (usually shortened to "Postgres").
It is a decades-proven, free, open database. We choose it over simpler
options because money and accounts demand storage that *never quietly
loses or corrupts a record*, and Postgres is the industry standard for
exactly that.

### 4.3 The authentication system — the "membership desk"

**Authentication** (often shortened to "auth") is the part that answers
two questions: *"Who are you?"* and *"Are you allowed to do this?"*

In restaurant terms it is the **membership desk**: it issues membership
cards, checks them at the door, and can tell a member from a non-member.

How it will work for a learner:

1. **Sign up.** The learner gives an email and chooses a password.
2. **Password is never stored as-is.** This is critical. We run the
   password through a one-way scrambler (a process called **hashing**) and
   store only the scrambled result. Hashing is like a paper shredder: you
   can shred a document, but you cannot un-shred the strips back into the
   document. When the learner logs in again, we shred what they typed and
   check the strips match. This means **even we cannot see anyone's
   password**, and if our database were ever stolen, the thieves still
   would not have usable passwords.
3. **Logging in issues a "session."** When the password checks out, the
   backend hands the browser a **session cookie** — think of it as a
   wristband at an event. For the rest of the visit the browser just shows
   the wristband instead of giving the password again and again.
4. **The wristband is tamper-proof and expires.** It is stored in a way
   the learner's browser cannot read or fake (a so-called *httpOnly*
   cookie), and it stops working after a set time, so a stolen one is not
   useful forever.

This is the single biggest piece of work that a rented backend (Supabase
etc.) would have given us for free. Building it ourselves is very much a
solved, well-understood problem — but it is real work and it is the part
we must get *exactly* right, so it gets careful attention and review.

### 4.4 The payment integration — the "card machine," handled by Stripe

We will **not** build payment processing ourselves. Handling credit-card
numbers directly drags in serious legal and security obligations (a
standard called **PCI DSS**) that no small team should take on.

Instead we use **Stripe**, the industry-standard payment company. The
model is exactly like a shop using a card terminal from its bank:

- When a learner upgrades, our app **hands them over to Stripe's own
  secure checkout page** to type their card details. The card number goes
  to Stripe — **never to our backend**. We never see it, never store it.
- When the payment succeeds, Stripe sends our backend a small confirmation
  message — this is called a **webhook** ("the bank phoning the shop to
  say the payment cleared"). Our backend hears that and flips a switch in
  the database: *this account is now premium*.
- Stripe also tells us about renewals, failed renewals, refunds, and
  cancellations through the same channel, so the learner's access stays
  correct over time without us doing anything manually.

So "building payments" really means **integrating Stripe and reacting to
its messages** — a well-trodden path — not building a card processor.

### 4.5 The admin path — the "manager's office"

So that the question bank can be managed centrally, a small number of
accounts will be marked as **admin**. An admin can do things ordinary
learners cannot — for example correct a question or publish a new batch —
through screens that ordinary learners never see. Underneath, the front
desk simply checks "is this person an admin?" before allowing those
actions, exactly the way it checks "is this person logged in?" for normal
ones.

---

## 5. How each feature works, start to finish

Below, each feature you asked for is traced as a story so you can see all
the pieces cooperating. "→" means "sends a message to."

### 5.1 Creating an account and logging in

```
Learner types email + password
        │
        ▼
Frontend  →  Backend front desk: "please create this account"
        │
        ▼
Backend shreds (hashes) the password, writes a new row in the
ACCOUNTS table, and hands back a session wristband (cookie).
        │
        ▼
Frontend: learner is now logged in. The wristband rides along
silently on every later request, so they stay logged in.
```

Logging in later is the same story with "check this account" instead of
"create this account."

### 5.2 Study progress that follows the learner

Today, answering a question writes to the device-only notepad. After this
change:

```
Learner answers a question
        │
        ▼
Frontend updates the screen instantly (no waiting), AND
Frontend  →  Backend: "account #123 answered question d4_217
                       correctly at 14:02"
        │
        ▼
Backend writes that into the PROGRESS table in the database.
```

Then, on any other device:

```
Learner logs in on their phone
        │
        ▼
Frontend  →  Backend: "send me account #123's progress"
        │
        ▼
Backend reads the PROGRESS table  →  sends it back
        │
        ▼
Phone now shows the exact same scores and history as the laptop.
```

**Important design choice — the app still works offline.** The browser
notepad (localStorage) is *kept*, acting as a local cache. If the learner
is on a train with no signal, the app keeps working against the notepad
and **syncs to the backend later** when signal returns. The backend is the
*master copy*; the device copy is a working copy. The learner never sees a
spinner just to answer a question.

### 5.3 Managing the question bank centrally

Today the questions ship inside the app, so fixing one means re-publishing
the whole app to everyone. After this change the **master question bank
lives in the database**, and the app asks the backend for it.

- **For learners:** no visible change, except fixes appear without an app
  re-release.
- **For an admin:** a private screen to edit a question or publish a new
  batch. They save; the database updates; every learner gets the new
  version the next time their app loads questions.
- **Migration is gentle.** The current JSON files become the *initial
  load* of the database — we are not throwing away existing content,
  just moving where the master copy lives. The authoring tools and
  reviewer agents described in `CLAUDE.md` continue to be how questions
  are created and checked; only the final resting place changes.

### 5.4 Payments and the premium tier

```
Learner clicks "Upgrade"
        │
        ▼
Frontend  →  Backend: "start a checkout for account #123"
        │
        ▼
Backend  →  Stripe: "create a checkout"  →  gets a secure link
        │
        ▼
Learner is sent to STRIPE'S OWN page, types card details THERE.
(Our backend never sees the card.)
        │
        ▼
Payment succeeds  →  Stripe  →  Backend webhook: "account #123 paid"
        │
        ▼
Backend flips ACCOUNTS row #123 to "premium" in the database.
        │
        ▼
Next time the learner's app loads, the front desk reports
"premium," and premium content/features unlock.
```

Renewals, cancellations and failed payments arrive the same way (Stripe →
webhook → database), so access stays correct automatically.

---

## 6. The data model — what the filing cabinet holds

The database is a set of tables (spreadsheets). Here are the main ones in
plain terms. Exact columns will be finalised in Phase 1; this is the shape.

### Table: `accounts` — one row per learner

| Column | Plain meaning |
|---|---|
| `id` | A unique number for this learner (e.g. 123) |
| `email` | Their email address |
| `password_hash` | The *shredded* password — never the real one |
| `tier` | `free` or `premium` |
| `role` | `learner` or `admin` |
| `created_at` | When they signed up |

### Table: `sessions` — one row per active "wristband"

| Column | Plain meaning |
|---|---|
| `id` | The wristband's secret code |
| `account_id` | Which learner it belongs to |
| `expires_at` | When the wristband stops working |

### Table: `progress` — the learner's study history

| Column | Plain meaning |
|---|---|
| `account_id` | Which learner |
| `question_id` | Which question (e.g. `d4_217`) |
| `result` | Right or wrong |
| `answered_at` | When |

### Table: `questions` — the master question bank

| Column | Plain meaning |
|---|---|
| `id` | e.g. `d4_217` |
| `domain` | 1–5 |
| `content` | The question text, options, explanations, tips |
| `status` | `draft` or `published` |

### Table: `payments` — billing records (mirrors what Stripe tells us)

| Column | Plain meaning |
|---|---|
| `account_id` | Which learner |
| `stripe_id` | Stripe's reference for the subscription |
| `status` | `active`, `cancelled`, `past_due`, etc. |
| `updated_at` | When this last changed |

A non-developer takeaway: **everything the product knows about a learner
lives in these few spreadsheets.** That is both the power (it is all in one
controllable place) and the responsibility (it must be protected and
backed up — see Section 9).

---

## 7. Where it runs, and what it costs

The backend is a program plus a database, and they have to live on a
computer somewhere. There are three broad options.

| Option | What it is | Good | Less good |
|---|---|---|---|
| **Self-hosted VPS** | We rent a bare computer (e.g. Hetzner, DigitalOcean) and run everything on it ourselves | Cheapest at scale; total control | *We* patch the operating system, set up backups, renew security certificates — real ongoing chores |
| **Managed platform (PaaS)** ⭐ | We rent a service (Fly.io, Railway, Render) that runs our code and our database *for* us | Almost no chores; backups, security certificates, scaling handled; we still own 100% of the code and data | Slightly more expensive than bare metal; mild platform-specific setup |
| **Serverless / edge** | Code runs in tiny bursts only when needed (Cloudflare Workers + their D1 database) | Extremely cheap when traffic is low; scales effortlessly | The payment webhooks and login sessions are fiddlier in this model; a less familiar way of building |

### Recommendation: a managed platform (PaaS)

You currently enjoy a **zero-chores** static site. A managed platform keeps
the spirit of that: it does the boring, risky maintenance (security
patches, database backups, certificate renewal) while **we keep ownership
of all the code and all the data** — there is no lock-in like a rented
backend would impose. A bare VPS would hand you a part-time sysadmin job;
serverless would make the payment plumbing harder than it needs to be on
day one. The managed platform is the choice that matches how you already
like to run this project.

### Rough monthly cost

These are ballpark figures for a small but real user base; exact numbers
depend on the host chosen.

| Item | Rough monthly cost |
|---|---|
| Managed platform running the backend | ~$5–20 |
| Managed Postgres database | ~$5–20 |
| Stripe | No monthly fee — they take a small % per transaction (~2.9% + 30¢ in the US) |
| Sending emails (sign-up confirmation, password reset) | Free tier usually enough at first; ~$0–15 later |
| **Total** | **roughly $10–55 / month** to start, growing gradually with usage |

For comparison, the static site today costs essentially nothing. This is
the price of the four new capabilities. It is modest and predictable.

---

## 8. Build plan — four phases

This is deliberately broken into four phases that each finish something
real. We do not disappear for a month; you see and approve progress in
stages, and we can stop or re-prioritise between any of them.

| Phase | What gets built | What you can see at the end |
|---|---|---|
| **1. Foundation** | The front desk, the database, and the membership desk (sign up, log in, log out, sessions) | A learner can create an account and log in. Nothing else changes yet. |
| **2. Progress sync** | Progress is saved to the backend; a logged-in learner's history follows them across devices; offline still works | Study on a laptop, log in on a phone, see the same progress. |
| **3. Question bank + admin** | The master question bank moves into the database; a private admin screen to edit/publish | Questions can be corrected centrally without re-releasing the app. |
| **4. Payments** | Stripe checkout, the renewal/cancellation webhook, free-vs-premium gating | A learner can upgrade and unlock the premium tier. |

Each phase is shipped as its **own pull request**, reviewed before the next
begins. Phase 1 is the natural first deliverable.

---

## 9. Risks, downsides, and how we address them

Being honest about the trade-off, since this is a real change of direction.

| Risk / downside | Why it matters | How we address it |
|---|---|---|
| **We now hold personal data** | Emails and study history are personal. Holding them brings legal duties (privacy law) and the duty to protect them | Store only what we need; hash passwords; encrypt connections; write a clear privacy policy (the app already has `privacy.html` to update) |
| **The backend can have downtime** | If the backend is down, login and sync are unavailable | The frontend keeps working **offline** against the local cache; sync resumes when the backend returns. The app degrades gracefully, it does not die |
| **Ongoing maintenance & cost** | A backend is never truly "finished" — security updates, monitoring, the monthly bill | A managed platform absorbs most chores; cost is modest and predictable (Section 7) |
| **Security is now in scope** | A static site can barely be "hacked"; a backend with accounts and payments is a real target | Follow well-known practices (hashing, tamper-proof sessions, Stripe handles cards); the repo already has a `security-review` process to run before each phase ships |
| **It breaks a core project rule** | `CLAUDE.md` states the app has "no build step, no framework, no backend" | This is a deliberate, approved architecture change — it triggers a **MAJOR version bump to v11**, a What's New entry, and an update to `CLAUDE.md` itself |
| **Data loss would be catastrophic** | Losing the database means losing every account and payment record | Managed Postgres includes automated backups; we verify backups are on before Phase 1 ships |

The honest summary: a rented backend (Supabase, Insforge) would hand us
auth, hosting, and backups pre-built. Building our own means we **own
everything and are locked into no vendor**, at the cost of **writing that
auth code once and accepting modest ongoing maintenance**. For a project
you intend to control long-term and charge money for, owning it is a
reasonable, common choice — but it is a choice, and the cost is real.

---

## 10. Decisions still needed from you

None of these block writing Phase 1, but they shape it. We can decide them
together before or during Phase 1.

1. **One repo or two?** The backend can live in a new `server/` folder in
   *this* repository, or in a separate repository. Two repos is cleaner
   long-term (frontend and backend release on different schedules); one
   repo is simpler to start. *Leaning: start in a `server/` folder here,
   split later if it gets heavy.*
2. **How do learners log in — password, or "magic link"?** Classic email +
   password is familiar. A "magic link" (we email a one-time login link,
   no password at all) is simpler and arguably safer. *Leaning:
   email + password first; it pairs naturally with payments.*
3. **What exactly is "premium"?** Payments need a defined line between the
   free tier and the paid tier — e.g. free learners get a subset of
   questions, premium gets all of them plus mock exams. This is a product
   decision, not a technical one, and it is worth settling before Phase 4.
4. **Which managed platform?** Fly.io and Railway are both strong. This can
   be decided at the start of Phase 1; it does not affect the design.
5. **Existing learners' local progress.** People already using the app have
   progress in their browser notepad. When they first make an account, we
   can offer a one-time "import my existing progress" step so they do not
   start from zero. *Leaning: yes, include this in Phase 2.*

---

## 11. Glossary

| Term | Plain meaning |
|---|---|
| **Frontend** | The part the learner sees and touches; runs on their device. We already have it (`index.html`). |
| **Backend** | The part that runs on a computer we control; does trusted, shared work. This document is the plan for it. |
| **Static site** | A website that is just downloaded and run on the visitor's device, with no backend. What the app is today. |
| **Server** | A computer (or program) that runs continuously and answers requests from many users. |
| **API** | The fixed "menu" of requests the backend agrees to accept from the frontend. |
| **Database** | Organised, permanent, backed-up storage. Our "filing cabinet." |
| **Table** | One spreadsheet inside the database (e.g. one for accounts). |
| **Postgres / PostgreSQL** | The specific, industry-standard database software we propose using. |
| **Authentication ("auth")** | Confirming *who* a user is and *what* they may do. |
| **Hashing** | A one-way scramble. Used so we store a shredded password, never the real one. |
| **Session / session cookie** | A temporary "wristband" the browser shows so the learner does not retype their password constantly. |
| **httpOnly cookie** | A cookie stored so the page's own code cannot read or fake it — a safety measure for the wristband. |
| **localStorage** | The small private notepad inside one browser on one device. How progress is stored today. |
| **Stripe** | The outside company that securely handles credit-card payments for us. |
| **Webhook** | An automatic message *from* an outside service (e.g. Stripe phoning us to say "payment cleared"). |
| **PCI DSS** | The strict legal/security standard for handling card numbers — which is why we let Stripe, not us, touch cards. |
| **PaaS (managed platform)** | A host that runs our code and database for us, doing the maintenance chores, while we keep ownership. |
| **VPS** | A bare rented computer we would have to maintain entirely ourselves. |
| **Serverless / edge** | A style where code runs only in short bursts when needed; very cheap but a different way of building. |
| **Migration** | Moving data from one place to another — here, the question JSON files into the database. |
| **Pull request (PR)** | A reviewable bundle of changes; how each phase will be delivered. |

---

## 12. Next step

If this direction looks right, the next concrete step is **Phase 1: the
Foundation** — scaffold the backend, set up the database, and build working
sign-up / log-in. It would be delivered as its own pull request for you to
review before Phase 2 begins.

If anything here should change — scope, hosting, the free/premium line —
this document is the place to settle it first. It is meant to be argued
with before any code is written.
