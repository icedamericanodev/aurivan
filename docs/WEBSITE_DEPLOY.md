# Website deploy (Cloudflare Pages) and repository settings

This page lists the exact settings the owner clicks. Claude wrote the files;
these steps need the owner's accounts. The architecture decision behind them
is in `docs/ARCHITECTURE_E2E.md` (sections 2, 4 and 5).

## Current setup (16 Oct 2026)

- **The new home page is live (owner, 18 Nov 2026).** `scripts/build_site.sh`
  defaults to `SITE_MODE=home`: kaisip.com shows `home.html` with the Kit
  waitlist, and the beta page stays at `/beta`. See "The new home page"
  below. Before that, from 4 Nov 2026, it defaulted to `SITE_MODE=landing`:
  kaisip.com shows the beta landing page (`beta.html`, also at `/beta`) and
  any other address shows it too; Privacy, Terms and Help stay public (the
  phone app and the store listings link to them). The web study app and every
  data file are not published. **To reopen the web app at launch:** change
  `landing` to `app` on the `SITE_MODE=` line in `scripts/build_site.sh` (CI
  already builds the app mode on every pull request, so it stays ready), add
  the "Open the web app" links back to `beta.html`, and check
  `https://kaisip.com/` shows the app.
- **The web study app is public at https://kaisip.com/app/ (owner, 28 Nov
  2026, web v13.1).** The home page stays at `/`; its "Study free on the web"
  button and the FAQ link to `/app/`. Free sample only, never the full bank, no
  sign-in. In home (and landing) mode `scripts/build_site.sh` builds the app
  (app mode, with all its checks) into `_site/app/` (`APP_DIR`): only
  `index.html`, `manifest.webmanifest`, the data files and `assets/`. Its links
  to the legal pages and `/beta` (`privacy.html` ...) go to the top-level pages
  through `_redirects` (`/app/privacy.html` → `/privacy` ...). `_headers` has
  `/app/` rules: the app's own policy is the site-wide `/*` one, the page and
  the manifest are always revalidated, data 5 minutes, assets a day (one
  Cache-Control per address: never add an `/app/*` catch-all). It is
  indexable (canonical `https://kaisip.com/app/`). The build stops if any of
  these rules or redirects is missing.
  - **Install (Add to Home Screen).** `manifest.webmanifest` (name and short
    name KaiSip, start and scope `./` = `/app/`, standalone, Grove paper
    `#F3F1EA`, icons `assets/icon-192.png`, `assets/icon-512.png`, also as
    maskable) plus the Apple tags in `index.html`. On iPhone and iPad Safari,
    Today shows a dismissible "Add KaiSip to your Home Screen" card with the
    three steps (hidden for good with "Hide tip", key `aurivan_install_tip`).
    No service worker yet (see the note below).
  - **The old preview address** https://kaisip.com/preview-u63raxyfxc/ is no
    longer built. `_redirects` sends it (and anything under it, keeping the
    rest of the path and any `#` route) to `/app/` with a 301. Learners'
    progress is saved per site (origin), not per folder, so whatever was saved
    in the preview is there in `/app/`. If a Cloudflare Access app was set up
    for the preview path, delete it (Zero Trust → Access → Applications).
  - **Check after the deploy:** `https://kaisip.com/app/` shows the app;
    `curl -sI https://kaisip.com/app/manifest.webmanifest` says
    `content-type: application/manifest+json` (Cloudflare picks the type from
    the `.webmanifest` name); `https://kaisip.com/preview-u63raxyfxc/` lands on
    `/app/`; `https://kaisip.com/data/domain1.json` and
    `https://kaisip.com/app/data/domain1.json` return a page, not JSON.
    On an iPhone: open `/app/` in Safari, Share → Add to Home Screen: the
    name reads KaiSip, the icon is the Kasama mark, and it opens full screen.
  - **To roll back** (take the web app offline again): revert the pull request
    that opened it, or set the build variable `SITE_NO_APP=1` in Cloudflare
    (Workers & Pages → kaisip → Settings → Build → Variables) and redeploy.
    Either way `/app/` and the preview redirect then show the not-found page;
    remove the "Study free on the web" links from `home.html` in the same step.
  - **Service worker: not yet.** Without one, the app needs a connection to
    open and has no offline mode. One is worth adding later (offline study on
    a train, faster repeat loads), but it needs a careful update strategy so a
    learner never gets stuck on an old copy of the app or the question data,
    so it is its own pull request.
  - **Accounts later:** Supabase sign-in redirect addresses will need
    `https://kaisip.com/app/` (stream B of `docs/WEB_LAUNCH_PLAN.md`).

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
| `index.html`, `privacy.html`, `terms.html`, `support.html`, `how-questions-are-made.html`, `beta.html` | The pages (`how-questions-are-made.html` is how questions are made and checked; `beta.html` is the beta-tester sign-up page at `/beta`; `/testers`, `/tester` and `/join` redirect to it) |
| `assets/` (images, icons, fonts, stylesheets, plus one named script: `assets/kaisip-plant.js`) | Icons and fonts the pages use, and the plant companion (generated from the mobile app by `mobile/scripts/build-web-plant.mjs`) |
| `data/free/cisa_d1.json` … `cisa_d5.json` (the free question sample, from `scripts/build_free_sample.py`), `data/cisa_notes.json`, `data/mindset/principles.json`, the two `data/exam/` files | The data the web app loads. The full bank `data/domain*.json` is **not** published since web v12.50; the build fails if any question outside the sample appears in `_site/` |
| `manifest.webmanifest` (with the app only) | The install manifest: "Add to Home Screen" name, icons and full screen |
| `_headers`, `_redirects` | Security headers and friendly redirects (and the `/app/` rules) |
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

**Decided 4 Nov 2026:** the website publishes only the free sample, never the
full bank (`docs/business/monetization/WEB_GATE_PLAN.md`). After each deploy
that touches data, check that `https://kaisip.com/data/domain1.json` returns
the app page and not JSON (look at the body: the single-page fallback
answers 200).

## The new home page (`home.html`, not live yet)

Added 13 Nov 2026. A marketing home page (the "Fieldwork" design from
`design-notes/landing-round-four/`) that will replace the beta page at
`kaisip.com/` when the owner approves it. Until then **nothing about the live
site changes**: Cloudflare still runs the plain build, which is landing mode.

| Thing | Where |
|---|---|
| The page | `home.html` (no inline script or style) |
| Its stylesheet, script and pictures | `assets/home.css`, `assets/home.js`, `assets/home/` |
| Its font | `assets/fonts/KaiSipSerif_400Regular.woff2` (the phone app's serif with a conventional f) |
| Its build mode | `SITE_MODE=home bash scripts/build_site.sh` |
| Its policy | `HOME_CSP` in `scripts/build_site.sh` (swapped into the `/` and `/index.html` rules) |
| Its checks | `scripts/home_page/check.cjs`, served by `scripts/home_page/serve_site.cjs` |

How the mode works: `/` becomes `home.html`; `/beta`, the legal pages, the Beta
Desk and the web app at `/app/` (the unlisted preview until 28 Nov 2026) stay
exactly as in landing mode. The home
page's files are copied only in this mode, so in landing and app mode they are
not public.

**Draft guard.** The page is a draft until its
`<meta name="kaisip-home-status">` says `approved`. It also stays a draft while
it holds sample feedback, a waitlist mockup (`data-waitlist="mockup"`), a form
that posts anywhere but Kit, a form without privacy.html section 3f, or a quote card without `data-quote-permission="recorded"`.
A draft refuses to build in `SITE_MODE=home`. `HOME_ALLOW_DRAFT=1` builds it
anyway, served `noindex`, for local review and CI. The build refuses that
switch on Cloudflare's build machines (it checks `CF_PAGES` and `WORKERS_CI`).

Merging the home page code adds only two public files to the live build: the
font `assets/fonts/KaiSipSerif_400Regular.woff2` and its licence
`assets/fonts/OFL-Literata.txt`. (The same pull request also adds one sentence
to privacy.html section 3e, about asking before quoting a tester.)

Review it locally with the real headers:

```bash
SITE_MODE=home HOME_ALLOW_DRAFT=1 SITE_OUT=/tmp/site-home bash scripts/build_site.sh
node scripts/home_page/serve_site.cjs /tmp/site-home 8787 &
node scripts/home_page/check.cjs     # needs Playwright (dev only)
```

Use a scratch `SITE_OUT` so `_site/` keeps the deployable landing build.

**Quotes.** Only real feedback, each with the person's own yes to the exact
text and name, recorded in `docs/beta/TESTER_FEEDBACK.md` ("Feedback quoted on
the website"). Every tester quote card says testers are offered free Premium.

**To go live (owner approval first):**

1. Waitlist (done in code, 18 Nov 2026): the form posts straight to Kit
   (form 10207004, fields `email_address` and `fields[phone_type]`; the
   consent box has no name and is not sent). The build refuses any other
   form address, and in home mode adds `'self' https://app.kit.com` to the
   site-wide `form-action` too, because the browser enforces every policy on
   `/`. privacy.html section 3f describes the list; the build refuses to
   publish the form without it. In Kit, the owner keeps: Confirmation email
   on, Auto-confirm off, General > redirect to `https://kaisip.com/waitlist-thanks`
   ("Check your email"), Confirmation email > after confirming redirect to
   `https://kaisip.com/waitlist-confirmed` ("You're on the list"), and
   Advanced > "Send subscriber data to thank you page" off (it would put the
   email in the address). Both pages are published only in home mode.
   Before launch, the owner signs up once from a real browser and checks the
   email arrives (Gmail, Yahoo, Outlook). It has to be on kaisip.com itself:
   a `*.pages.dev` or `workers.dev` address cannot redirect back under
   `'self'`. Also check in Kit: the custom field key is exactly `phone_type`;
   both redirect addresses start `https://kaisip.com/` (no `www.`); spam
   protection on the form is on; and whether Kit adds `ck_subscriber_id` to
   the confirm redirect (if it does, that id appears in Cloudflare's logs).
   Verified live 18 Nov 2026: the owner's real sign-up reached Kit, the
   confirm email arrived, both redirect pages worked, and the Cloudflare
   Web Analytics script is on kaisip.com.
   **Monthly in Kit (owner):** Kit deletes nobody by itself. Delete
   subscribers who have not confirmed after 30 days and anyone who
   unsubscribed more than 30 days ago (Subscribers, filter by status, select,
   delete). This is what privacy.html 3f promises.
2. Recheck the Android, web and iPhone wording and the FAQ answers (price,
   iPhone, beta).
3. Cloudflare Web Analytics is on (owner, 18 Nov 2026) and privacy.html 3d
   describes it. After launch, view the source of kaisip.com and search for
   `cloudflareinsights`. If the dashboard says it is on but the script is
   missing (automatic setup may not reach Workers static assets), choose
   "Enable with JS snippet" and add that external script before `</body>` in
   `home.html`; `HOME_CSP` already allows it.
4. Set `kaisip-home-status` to `approved` and the robots meta to
   `index, follow` in `home.html`.
5. Confirm `SITE_MODE=home bash scripts/build_site.sh` passes with no draft
   switch, and `scripts/home_page/check.cjs` passes against it.
6. (Done 18 Nov 2026.) Change the default in `scripts/build_site.sh` from `landing` to `home`, in
   its own pull request. Merging that pull request is the launch.

**To roll back:** change the default back to `landing` (or revert that one
pull request). The beta page returns to `/` on the next deploy.

## Security headers (`_headers`)

- **Every response:** HTTPS only for a year (HSTS, no "preload" yet), no
  sniffing, no framing, a strict referrer policy, and no camera, microphone,
  location or payment access.
- **Privacy, Terms, Support, Beta:** an **enforced** strict Content Security
  Policy. These pages have no scripts, so only this site's styles, images and
  fonts load. The beta page's sign-up buttons are plain links to the Google
  Form, so nothing from Google loads on it. The one script allowed is Cloudflare Web Analytics, which
  Cloudflare adds itself once it is switched on.
- **The web app (`/`, and any unknown address, which shows the app):** an
  **enforced** policy on the catch-all `/*` rule (web v12.28) that allows
  only what the app loads: this site, its inline scripts and handlers
  (`'unsafe-inline'` until they move into a `.js` file), Google Analytics
  after the visitor accepts, Cloudflare Web Analytics, and the Google Forms
  for feedback and flags. Fonts are self-hosted. Checked on 21 Oct 2026 in
  Chromium with a local server that applies `_headers`: no violations on any
  screen, light or dark.
- Cloudflare **joins** the values when two rules match the same path. For
  Content-Security-Policy that is safe: the browser enforces both policies,
  so the legal pages, `/data/*` and `/assets/*` keep their own stricter
  policy on top of the app's. Other headers are set in one rule only.
- Cloudflare shows `/privacy.html` at `/privacy`. Use the short addresses in
  the store listings and in the app: `https://<domain>/privacy`, `/terms`,
  `/support`.
- An address that doesn't exist gets `404.html` with status 404 (a site with a
  `404.html` has no single-page fallback on Cloudflare). Nothing private can
  be reached that way.

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
   - **Build watch paths → Include paths:** `index.html`, `manifest.webmanifest`, `privacy.html`,
     `terms.html`, `support.html`, `how-questions-are-made.html`, `beta.html`,
     `assets/*`, `data/free/*`,
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
(Approvals are free on a public repository; a private one needs GitHub Pro. The repo went private on 4 Nov 2026, so on the Free plan environments, their secrets and these approvals are not enforced. See `docs/mobile/ACCOUNTS_BETA_PLAN.md` go-live gate 4.)

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
  profile would use `preview`. The backup APK builder (`mobile/scripts/build-apk.sh`)
  sets `preview` in its own throwaway copy (`mobile/scripts/set-update-channel.mjs`).
  Updates are published to `preview` automatically; nothing publishes to
  `production` automatically.
- **Android code shrinking (R8)** is on for release builds
  (`expo-build-properties` in `mobile/app.json`). Smoke-test a release build
  after native library changes: `docs/mobile/RUN_ON_ANDROID_EMULATOR.md`,
  "Testing a release build".
- **Size budgets** (CI, `mobile/scripts/check-size-budget.mjs`): the Android
  JavaScript bundle stays under 20 MB (14 MB until 28 Nov 2026, when the
  testers' build began carrying the full CRISC and AAIA courses: 17.08 MB) and each
  certification's content under 6 MB (CISA 3.75 MB).
