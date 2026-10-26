# KaiSip

An independent, free CISA exam prep app built to train the **auditor mindset** — ISACA-style judgment and scenario-based reasoning, not memorization. Hand-authored tips on every question explain the trap, the principle, and the exam-day shortcut.

> Not affiliated with or endorsed by ISACA®. CISA® is a registered trademark of ISACA.

## What's inside

- **Practice questions across all 5 CISA domains**, weighted to the current ISACA blueprint
- **Hand-authored tips** on every question — trap-naming, mindset/principle, and exam-day shortcut
- **Practice mode** with confidence rating and sub-topic drill-down
- **Mock exam** with the full 4-hour clock and ISACA-style blueprint mix
- **Topics tab** with study summaries, real-life analogies, and key terminology per domain
- **Weak spots** by domain (Building, Steady or Strong until a domain has 30 answers)
- **Bookmarks**, **export/import progress** (under Your data), and **light and dark mode** that follows your system
- **In-app feedback** that goes straight to the maintainer

## Domain coverage

| # | Domain | Weight |
|---|---|---|
| 1 | Information Systems Auditing Process | 18% |
| 2 | Governance & Management of IT | 18% |
| 3 | Information Systems Acquisition, Development & Implementation | 12% |
| 4 | Information Systems Operations & Business Resilience | 26% |
| 5 | Protection of Information Assets | 26% |

## The auditor mindset

Every question is framed around the core ISACA principle:

> *The auditor assesses, recommends, and reports — never fixes.*

Questions test judgment in realistic scenarios, not keyword recall. The hand-authored tips make the implicit explicit: which option is the seductive trap, which principle is being tested, and what shortcut works on exam day.

## Run it

No install, no build, no backend. Just open `index.html` in a modern browser.

For a proper local preview that won't choke on `file://` security restrictions:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

For development workflows, see **[CONTRIBUTING.md](CONTRIBUTING.md)** and the AI-assistant project memory in **[CLAUDE.md](CLAUDE.md)**.

## Project structure

```
kaisip/
├── index.html                       # The entire app (HTML + CSS + JS)
├── privacy.html, terms.html, support.html  # Public pages
├── assets/                          # Favicons and app icon (KaiSip)
├── _headers                         # Host-neutral security headers and cache rules
├── data/
│   ├── originals/d{1..5}.json       # Hand-authored questions and tips (source of truth)
│   ├── domain{1..5}.json            # Question banks loaded by the app (generated)
│   ├── cisa_notes.json              # Topics-tab content
│   └── glossary.json                # Glossary content
├── scripts/
│   ├── originals_to_domain.py       # Builds data/domain{N}.json from data/originals/
│   ├── verify_repo.sh               # Repo health check (run via SessionStart hook)
│   └── lint_inline_js.sh            # Lints the inline JS in index.html
├── CLAUDE.md                        # Project memory for AI assistants
├── CONTRIBUTING.md                  # How to contribute
├── CHANGELOG.md                     # Canonical release history
├── SECURITY.md                      # Security disclosure policy
├── archive/                         # Retired files kept for history
└── README.md
```

## Tech stack

- Vanilla HTML, CSS, and inline JavaScript — single file, no framework, no bundler, no `npm install`
- Question banks are static JSON loaded asynchronously per domain
- localStorage for progress; no backend, no accounts, no PII
- Optional Google Analytics
- Fraunces and Figtree fonts served from `assets/fonts` (no font service is contacted)
- Needs an internet connection; there is no offline or install mode

## Feedback

Click **Feedback** in the header to send a message — it lands directly in the maintainer's inbox, no mail-app required. Categories: General / Feature / Bug. You can include anonymous diagnostic info to speed up bug fixes.

You can also email **certprep.support@gmail.com** directly.

## License & disclaimer

For personal study use. All exam content is independently authored for educational purposes. CISA® and ISACA® are registered trademarks of their owners; this project is not affiliated with or endorsed by ISACA.
