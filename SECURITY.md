# Security Policy

## Scope

CISA Mindset is a **fully client-side, single-file HTML application**. It has:

- No backend server
- No database
- No user accounts or authentication
- No personally identifiable information collected or stored
- No cookies set by the app itself; a Google Analytics cookie is set **only if you accept** it on the in-app cookie banner

All progress (scores, bookmarks, profiles) lives in your browser's `localStorage` and never leaves your device — except in two cases:

1. **Feedback you choose to send** through the in-app Feedback button, which posts to a Google Form bound to `certprep.support@gmail.com`.
2. **Anonymous Google Analytics page-view metrics**, but only if you accept analytics on the cookie consent banner. Until then, analytics storage is denied by default (Google Consent Mode) and no analytics cookie is set.

## Supported version

Only the latest version of the app (whatever is on `main` at any given time) is maintained. Because the entire app ships as a single file, "supported versions" doesn't really apply — there's no patch back-port story. If you find a security issue, we fix it on `main` and ship.

## Threat model

In scope for security reports:

- **HTML/JS injection** via question bank, tips, glossary, or any other JSON content rendered into the DOM
- **XSS** through user-supplied input (profile names, feedback, bookmark notes, etc.)
- **Supply-chain risk** from any new third-party dependency (today: ESLint via npx for local linting, Google Forms / Analytics for runtime services)
- **Data exfiltration** — anything that would leak `localStorage` contents to a third party
- **Privacy regressions** — anything that starts collecting more than the analytics described above

Out of scope:

- Browser-level vulnerabilities (file these with the browser vendor)
- Findings against the Google Forms / Google Analytics / Google Sheets services themselves (file these with Google)
- Issues that require an attacker to already have full control of the user's device or network

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security findings. Instead:

1. Open a [private security advisory](https://github.com/laladev-ai/cisa-prep/security/advisories/new) on this repository, **or**
2. Email **`certprep.support@gmail.com`** with the subject line `Security report — CISA Mindset`.

Include:

- A clear description of the issue
- Steps to reproduce
- Affected page/feature and (if possible) the commit SHA you tested against
- Your assessment of impact and severity

You'll get an acknowledgment within **48 hours** and, for confirmed issues, a fix on `main` within **7 days** (often much faster for a single-file app). You'll be credited in the [CHANGELOG](CHANGELOG.md) if you'd like.

## Reporting non-security bugs

For non-security bugs and feature requests, the easiest path is:

- Click **Feedback** in the app header → category **Bug** or **Feature**
- Or open a regular [GitHub issue](https://github.com/laladev-ai/cisa-prep/issues/new)

## Privacy summary

| Data | Where it goes | When |
|---|---|---|
| Progress, bookmarks, profiles | Your browser's localStorage | Always (never leaves device) |
| Feedback messages | `certprep.support@gmail.com` (via Google Form) | Only when you click Send |
| Anonymous page-view metrics | Google Analytics | Only after you accept the cookie banner |
| Question content | Loaded from the same origin as the page | On page load |

No question response data, scores, or personally identifiable information is transmitted off-device.

The full user-facing **[Privacy Policy](privacy.html)** and **[Terms of Use](terms.html)** are published alongside the app.

Thank you for helping keep this tool safe for exam candidates.
