# KaiSip trademark clearance results (5 Nov 2026)

Read this whole file before you change anything. It records a trademark clearance check for the app name and slogan, and the brand decisions that follow from it.

This was a read-only clearance check, not legal advice. Nothing was filed or registered.

## 1. Context

- App name: **KaiSip** (mobile and web study app for IT audit and security exams: CISA, CRISC, CC, AAIA).
- Nice classes that matter: **Class 9** (downloadable apps) and **Class 41** (education, exam prep).
- Markets in priority order: Philippines, then international (Madrid), then US.
- Databases searched: WIPO Global Brand Database, IPOPHL (WIPO Publish), TMview. The US (USPTO) was checked earlier.

## 2. Decisions

| Item | Decision |
|---|---|
| App name | **KaiSip**. Keep it. Looks clear. |
| Main slogan | **"Know why the best answer wins."** |
| Backup slogan | **"Every answer teaches the why."** |
| Dropped | **"Small sessions. Deep roots."** Do not use it in any UI, store listing, marketing copy or metadata. |

## 3. Results summary

| Search term | Database | Matches | Live match in Class 9 or 41? |
|---|---|---|---|
| KAISIP (exact) | WIPO, all countries | 0 | No |
| KAISIP (similar spelling), PH only | WIPO | 38, none close in 9/41 | No. Only dead PH marks: KAISI (30/32), KAISIN (12), C.A. CAISIP (30) |
| KAISIP (similar spelling), Class 9/41 | WIPO and TMview | 22 | Nothing identical. Nearest live: Kaisig (Germany, 9 and 41), WaiSIP (Korea, 9), KAISIN. (Switzerland and Madrid, 9), KAISI (US, 9) |
| KAI SIP, KAISEP, KAYSIP | WIPO, IPOPHL, TMview | 0, except 1 in TMview | Only KAISEPOCH (US, 9), a different word |
| KNOW WHY THE BEST ANSWER WINS | WIPO, IPOPHL, TMview (incl. PH) | 0 | No |
| BEST ANSWER WINS | WIPO, IPOPHL | 0 | No |
| BEST ANSWER WINS | TMview | 1 | No. @BESTANSWERWINS (US, Class 35, dead) |
| BEST ANSWER | IPOPHL, TMview PH | 0 | No |
| BEST ANSWER, Class 9/41 | TMview | 4 | Yes: BEST ANSWERS logo (UK, Best Answers Education Ltd, Class 41, registered Nov 2024). DIMTON GIVE YOU BEST ANSWER! (China, 9) |
| EVERY ANSWER TEACHES THE WHY | WIPO, IPOPHL, TMview (incl. PH) | 0 | No |
| SMALL SESSIONS DEEP ROOTS | WIPO, IPOPHL, TMview | 0 | No |
| DEEP ROOTS | IPOPHL, TMview PH | 0 | No |
| DEEP ROOTS, Class 9/41 | TMview and WIPO | 34+ | Yes, many: GROW DEEP ROOTS (US, 41), DEEP ROOTS. BIG IDEAS. BRIGHT FUTURES. (US, 9 and 41), DEEPROOTS (US and China), DEEP ROOTS (India, 41), DEEP COM ROOTS (EU, 9 and 41), DEEP ROOTS (Canada, official mark, all classes) |

## 4. Verdicts

- **KaiSip: Looks clear.** No identical or sound-alike marks anywhere searched.
- **"Know why the best answer wins": Looks clear.** "Best answer" is a common exam-prep phrase, so protection over those two words alone is weak. A UK education company owns a BEST ANSWERS logo. Low risk for the full sentence.
- **"Every answer teaches the why": Looks clear.** Zero hits anywhere.
- **"Small sessions. Deep roots.": Possible conflict.** "Deep roots" is crowded in Class 41 education overseas.

## 5. Task for Claude Code

Apply the slogan decision in the codebase. Copy changes only.

1. Follow the repo's own `CLAUDE.md` (branching, version bump, What's New, linting, hooks).
2. Work on a new branch: `chore/slogan-update`. Never commit to `main`. Open a pull request at the end. Do not merge it.
3. Search the whole repo (HTML, JS, JSON, Markdown, store listing files, manifest, meta tags, Open Graph tags, Android strings) for:
   - "Small sessions" and "Deep roots" (any case). Remove or replace with the main slogan.
   - Any existing tagline or slogan. List each place it appears before changing it.
4. Set the main tagline to exactly: `Know why the best answer wins.`
5. Do not touch the quiz engine, scoring, readiness maths, question data or storage keys.
6. Copy rules: short, plain sentences. No em dashes or en dashes anywhere, including commit messages and the PR.
7. In the PR description, list every file and line where a slogan was changed or removed.
8. If you find the backup slogan "Every answer teaches the why." used anywhere, leave it and mention it in the PR.

## 6. Not yet checked (do by hand)

- Logos and design marks (only words were searched).
- Unregistered use: Google Play and App Store names, DTI business names, SEC company names.
- Filings from the last few weeks may not be in the databases yet.
- A Philippine IP lawyer or agent should confirm before any filing.
