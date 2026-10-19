# Website deploy (Cloudflare Pages) and repository settings

This page lists the exact settings the owner clicks. Claude wrote the files;
these steps need the owner's accounts. The architecture decision behind them
is in `docs/ARCHITECTURE_E2E.md` (sections 2, 4 and 5).

## Current setup (16 Oct 2026)

- **Live addresses:** https://kaisip.com and https://www.kaisip.com (custom
  domains on the Cloudflare Worker `kaisip`), plus the test address
  https://kaisip.certprep-support.workers.dev.
- Connected through Cloudflare's **Workers** screen (see "If Cloudflare only
  shows the Workers screen" below), so `wrangler.jsonc` decides what is
  published. Preview builds and preview URLs are **off**.
- Domain `kaisip.com` is registered at Cloudflare Registrar, with auto-renew on.
- Checked on the workers.dev address: all pages return 200, the redirects
  work, every header arrives once, and repo paths (`/docs/`, `/mobile/`,
  `/.git/`, `/CLAUDE.md` …) return the app page, not the files.
- **Launch is on hold** (owner, 16 Oct 2026) while content and features are
  improved. Before launch: point the app and store listings at
  `https://kaisip.com/privacy`, `/terms` and `/support`; switch analytics to
  Cloudflare Web Analytics; consider turning the workers.dev address off so
  only kaisip.com serves the site; then retire GitHub Pages.

## What gets published

`scripts/build_site.sh` copies **only** these files into `_site/`, and
Cloudflare publishes `_site/`:

| File | Why |
|---|---|
| `index.html`, `privacy.html`, `terms.html`, `support.html` | The pages |
| `assets/` (images, icons, fonts, stylesheets only) | Icons and fonts the pages use |
| `data/domain1.json` … `data/domain5.json`, `data/cisa_notes.json`, `data/mindset/principles.json` | The data the web app loads |
| `_headers`, `_redirects` | Security headers and friendly redirects |
| `favicon.ico` | Browsers ask for it at the top level |

Nothing else goes public: not `docs/`, `supabase/`, `mobile/`, `.claude/`,
`design-notes/`, `archive/` or the rest of `data/`. The build stops if a page
or data file is missing, if a data file is broken, or if `assets/` holds an
unexpected kind of file. GitHub runs the same build on every pull request
(the **Verify** workflow), so a problem shows up before it can deploy.

To try it on your computer: `bash scripts/build_site.sh`, then
`python3 -m http.server 8000 -d _site` and open http://localhost:8000.
(This simple server ignores `_headers`; Cloudflare applies them.)

**Adding a page** (for example `delete-account.html`): add it to `PAGES` in
`scripts/build_site.sh`, add it to the final check in the same file, and give
it its own two rules in `_headers` (`/delete-account` and
`/delete-account.html`), copied from the privacy page's rules.

**Owner decision still open:** everything published is public, including the
full question bank in `data/domain*.json`. If the bank should stay private,
the web practice needs a sample pack instead (see the A2 report).

## Security headers (`_headers`)

- **Every response:** HTTPS only for a year (HSTS, no "preload" yet), no
  sniffing, no framing, a strict referrer policy, and no camera, microphone,
  location or payment access.
- **Privacy, Terms, Support:** an **enforced** strict Content Security
  Policy. These pages have no scripts, so only this site's styles, images and
  fonts load. The one script allowed is Cloudflare Web Analytics, which
  Cloudflare adds itself once it is switched on.
- **The web app (`/`):** a small enforced policy (no framing, no plugins) plus
  a **Report-Only** policy that lists everything the app loads today. It
  blocks nothing and only reports in the browser console. Checked on
  15 Oct 2026 in Chromium: no reports. Make it enforced once it has stayed
  clean for a while.
- Cloudflare **joins** the values when two rules match the same path. That is
  why each page has its own rule and the catch-all rule has no policy.
- Cloudflare shows `/privacy.html` at `/privacy`. Use the short addresses in
  the store listings and in the app: `https://<domain>/privacy`, `/terms`,
  `/support`.
- An address that doesn't exist shows the web app (Cloudflare's default for a
  site with no `404.html`). Nothing private can be reached that way.

## Owner: connect Cloudflare Pages (about 10 minutes, free)

1. Create a Cloudflare account at https://dash.cloudflare.com/sign-up and turn
   on two-step sign-in: **My Profile → Authentication → Two-factor
   authentication**.
2. **Workers & Pages → Create → Pages → Connect to Git.** (If the page only
   offers Workers, look for the **Pages** tab or the "Looking to deploy
   Pages?" link.)
3. Sign in to GitHub when asked. In **Repository access**, pick **Only select
   repositories → this repository** (not all repositories). Click **Install &
   Authorize**.
4. Pick the repository, then **Begin setup**, and fill in exactly:

   | Setting | Value |
   |---|---|
   | Project name | `kaisip` (becomes `kaisip.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `bash scripts/build_site.sh` |
   | Build output directory | `_site` |
   | Root directory (advanced) | leave empty |
   | Environment variables | none |

5. **Save and Deploy.** The first build takes about a minute. Open
   `https://kaisip.pages.dev/privacy` to check.
6. Fewer, safer builds: open the project → **Settings → Builds**:
   - **Branch control → Preview branches:** *None* (or *Custom branches*,
     include `claude/*`, if you want a preview link for each pull request).
   - **Build watch paths → Include paths:** `index.html`, `privacy.html`,
     `terms.html`, `support.html`, `assets/*`, `data/domain*.json`,
     `data/cisa_notes.json`, `data/mindset/principles.json`, `_headers`,
     `_redirects`, `scripts/build_site.sh`.
     Changes to the mobile app or the docs then don't start a website build.
7. Later, with the domain: **Custom domains → Set up a custom domain**, add
   the bare domain and `www`. **Web Analytics → Enable** (no cookies).

### If Cloudflare only shows the Workers screen

Cloudflare's newer screen ("Set up your application… Configure your Worker
project") also works. The repository has a `wrangler.jsonc` that tells it to
publish only `_site/`, with the same headers and redirects. Fill in:

| Setting | Value |
|---|---|
| Project name | `kaisip` (must match `name` in `wrangler.jsonc`) |
| Build command | `bash scripts/build_site.sh` |
| Deploy command | `npx wrangler deploy` (the default) |
| Enable preview builds / non-production branch builds | **off** |
| Protect with Cloudflare Access | off |
| Advanced: Path | `/` |
| Advanced: API token | let it create a new one |
| Advanced: Variables | none |

The address is then `kaisip.<your-account>.workers.dev`. Never clear the
build command: without it there is no `_site/` to publish.

Then tell Claude the `pages.dev` (or `workers.dev`) address. Claude checks every page returns
200, the headers arrive once each, and the browser console shows no policy
reports, and runs the accessibility checks against it.

GitHub Pages keeps running next to it until the stores point at the new
address (A2 report, section 9). Turn GitHub Pages off about a week after that.

## Owner: GitHub settings (about 20 minutes, free)

These protect the update key and `main`. Anything merged to `main` can reach
every test phone as an over-the-air update, so this matters.

### 1. The `ota` environment (holds the phone-update key)

Phone updates are **automatic** (owner decision, 18 Oct 2026). After each
merge that changes the app, the **Phone update (EAS Update)** workflow
re-runs all the app's checks (the same ones as the Mobile workflow) and, if
they all pass, sends the update to test
phones with no click from you. The `ota` environment keeps the update key so
only `main` can use it.

1. Repository → **Settings → Environments → `ota`** (or **New environment**,
   name `ota`, **Configure environment**).
2. Leave **Required reviewers** unticked. This is what makes updates
   automatic. (Done, 18 Oct 2026.)
3. **Deployment branches and tags → Selected branches and tags → Add
   deployment branch or tag rule:** `main`.
4. **Environment secrets → Add environment secret:** name `EXPO_TOKEN`, value
   the token from expo.dev. Best: a token for an Expo **robot user** with the
   Developer role (expo.dev → your account → **Settings → Robot users**), so
   it is not your personal login.
5. **Settings → Secrets and variables → Actions → Repository secrets:**
   delete the old `EXPO_TOKEN` there, so only the environment holds it.

To check an update went out: **Actions → Phone update** shows a green run
for the merge. A red run means a check failed and nothing was sent.

To go back to approving each update by hand: tick **Required reviewers**,
add yourself, leave **Prevent self-review** off, and save. Each run then
waits for **Review deployments → tick `ota` → Approve and deploy.**
(Approvals are free on a public repository; a private one needs GitHub Pro.)

### 2. iPhone updates (later, once an iOS build exists)

**Settings → Secrets and variables → Actions → Variables → New repository
variable:** name `EAS_UPDATE_PLATFORM`, value `all`. Until then updates go to
Android only. The first time, compare the runtime the workflow prints with the
one on the iOS build's page on expo.dev; they must match.

### 3. Security features

**Settings → Code security (Advanced Security):** turn on **Dependency graph**,
**Dependabot alerts**, **Dependabot security updates**, **Secret scanning**
and **Push protection**. The weekly Dependabot pull requests are configured
in `.github/dependabot.yml`.

### 4. Protect `main`

**Settings → Rules → Rulesets → New ruleset → New branch ruleset:**

| Setting | Value |
|---|---|
| Ruleset name | `main` |
| Enforcement status | Active |
| Bypass list | empty |
| Target branches | **Add target → Include default branch** |
| Restrict deletions | on |
| Require a pull request before merging | on; required approvals `0`; allowed merge methods: Squash |
| Require status checks to pass | on; add `Repo health (verify_repo.sh)` |
| Block force pushes | on |

Only `Repo health (verify_repo.sh)` is listed because it runs on every pull
request. The Mobile and Supabase checks run only when their files change, and
a required check that never starts would block the merge forever. They still
run and show red on the pull requests that touch them.

### 5. Two-step sign-in everywhere

Turn on two-factor authentication for GitHub, Expo, Supabase, Google and
Apple.

## Mobile release settings (for reference)

- **Update channels.** Test builds listen on `preview`; store builds on
  `production`. The channel comes only from the build profiles in
  `mobile/eas.json`. `mobile/app.json` sets none, and CI
  (`mobile/scripts/check-release-config.mjs`) fails if it does, or if a store
  profile would use `preview`. The two backup APK builders set `preview` in
  their own throwaway copy (`mobile/scripts/set-update-channel.mjs`).
  Updates are published to `preview` automatically; nothing publishes to
  `production` automatically.
- **Android code shrinking (R8)** is on for release builds
  (`expo-build-properties` in `mobile/app.json`). Smoke-test a release build
  after native library changes: `docs/mobile/RUN_ON_ANDROID_EMULATOR.md`,
  "Testing a release build".
- **Size budgets** (CI, `mobile/scripts/check-size-budget.mjs`): the Android
  JavaScript bundle stays under 14 MB (9.83 MB on 15 Oct 2026) and each
  certification's content under 6 MB (CISA 3.75 MB).
